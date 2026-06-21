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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
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
