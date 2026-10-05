/**
 * asyncHandler
 * Wraps asynchronous route handlers and forwards caught errors to Express next().
 */
const asyncHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

module.exports = asyncHandler;
