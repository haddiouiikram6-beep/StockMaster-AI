/**
 * Standard API Response Helpers
 * Ensures consistent, predictable, and clean JSON responses across the entire application.
 */

/**
 * Send a success response
 * @param {import('express').Response} res 
 * @param {any} data 
 * @param {string|null} message 
 * @param {number} statusCode 
 */
export const successResponse = (res, data = null, message = null, statusCode = 200) => {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== null && data !== undefined) payload.data = data;
  return res.status(statusCode).json(payload);
};

/**
 * Send a paginated response
 * @param {import('express').Response} res 
 * @param {Array<any>} data 
 * @param {{ page: number, limit: number, total: number }} pagination 
 * @param {number} statusCode 
 */
export const paginatedResponse = (res, data = [], pagination = {}, statusCode = 200) => {
  const page = parseInt(pagination.page || '1', 10);
  const limit = parseInt(pagination.limit || '20', 10);
  const total = parseInt(pagination.total || '0', 10);
  const totalPages = Math.ceil(total / limit) || 1;

  return res.status(statusCode).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  });
};

/**
 * Send an error response
 * @param {import('express').Response} res 
 * @param {string} message 
 * @param {number} statusCode 
 * @param {Array<any>|null} errors 
 */
export const errorResponse = (res, message = 'An unexpected error occurred', statusCode = 500, errors = null) => {
  const payload = {
    success: false,
    message
  };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

export default {
  successResponse,
  paginatedResponse,
  errorResponse
};
