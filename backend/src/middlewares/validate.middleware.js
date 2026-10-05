/**
 * Generic request validation middleware using Zod schemas
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} source 
 */
const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        console.error('VALIDATION FAILED ON ENDPOINT:', req.originalUrl, 'PAYLOAD:', req[source], 'ERRORS:', formattedErrors);

        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        error: error.message
      });
    }
  };
};

module.exports = validate;
