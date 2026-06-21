// Express 4 does not catch rejected promises thrown by async route handlers —
// an uncaught rejection becomes an unhandledRejection, which crashes the
// whole Node process by default (Node >=15). Wrapping every handler here
// routes errors to next(err) -> the global error middleware in server.js
// instead, so one bad request can't take down the entire service.
function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = { asyncHandler };
