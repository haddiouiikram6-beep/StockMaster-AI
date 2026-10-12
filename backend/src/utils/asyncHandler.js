/**
 * Asynchronous route handler wrapper
 * Automatically catches unhandled promise rejections and forwards them to Express error middleware.
 * Eliminates repetitive try-catch blocks in controller methods.
 * 
 * @param {Function} fn Async controller function (req, res, next)
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
