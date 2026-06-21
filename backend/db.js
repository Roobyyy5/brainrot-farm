const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in .env');
}

// node-postgres returns BIGINT (oid 20) as strings to avoid silent precision
// loss above 2^53. Our bigint columns (coins, timestamps) never get that
// large, so parse them back to JS numbers for arithmetic/JSON convenience.
types.setTypeParser(20, (val) => parseInt(val, 10));

// Supabase's pooler terminates TLS with a cert chain rooted at Supabase's own
// CA, which isn't in Node's default trust store, so plain rejectUnauthorized
// would either fail or require disabling validation entirely. Pinning to
// Supabase's actual intermediate+root CA (fetched once via openssl s_client
// and committed below — these are public certs, not secrets) gets us full
// chain validation without that tradeoff: only certs Supabase itself issued
// are trusted, which is narrower than trusting the whole public CA list.
// PGSSL=false is only for a local Postgres with no TLS at all.
const caCertPath = path.join(__dirname, 'certs', 'supabase-ca.pem');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.PGSSL === 'false'
      ? false
      : { rejectUnauthorized: true, ca: fs.readFileSync(caCertPath, 'utf8') },
});

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, init, withTransaction };
