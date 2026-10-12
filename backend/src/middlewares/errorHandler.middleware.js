import { logger } from '../utils/logger.js';

/**
 * Global centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled Application Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Handle Zod Validation Error if not caught by validate middleware
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }

  // Handle Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = Object.keys(err.fields || {});
    return res.status(409).json({
      success: false,
      message: `A record with this ${fields.length ? fields.join(', ') : 'value'} already exists.`
    });
  }

  // Handle Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Database validation failed',
      errors: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  // Handle Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Referenced foreign record does not exist or cannot be modified.'
    });
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authorization token has expired.'
    });
  }

  // Handle Custom App Status Error
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || 'Something went wrong');

  res.status(statusCode).json({
    success: false,
    message
  });
};

export { errorHandler };
export default errorHandler;
