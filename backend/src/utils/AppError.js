/**
 * Custom Application Error class for domain and HTTP exceptions
 */
export class AppError extends Error {
  /**
   * @param {string} message Error message
   * @param {number} statusCode HTTP status code (e.g. 400, 401, 403, 404, 409)
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
