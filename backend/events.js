const { pool } = require('./db');

function logEvent(telegramId, eventType) {
  pool
    .query('INSERT INTO events (telegram_id, event_type, created_at) VALUES ($1, $2, $3)', [
      telegramId,
      eventType,
      Date.now(),
    ])
    .catch((err) => console.error('Failed to log event', eventType, err.message));
}

module.exports = { logEvent };
