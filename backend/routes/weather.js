const express = require('express');
const { asyncHandler } = require('../asyncHandler');
const { getDailyWeather, WEATHER_DURATION_MS } = require('../gameConfig');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const weather = getDailyWeather();
  const now = Date.now();
  const endsAt = (Math.floor(now / WEATHER_DURATION_MS) + 1) * WEATHER_DURATION_MS;
  res.json({ ...weather, endsAt, timeLeftMs: endsAt - now });
}));

module.exports = router;
