const { z } = require('zod');

/**
 * Higher-order middleware for Zod validation on body, query, and params.
 * @param {object} schemas - { body?: z.ZodSchema, query?: z.ZodSchema, params?: z.ZodSchema }
 */
const validate = (schemas) => async (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = await schemas.body.parseAsync(req.body);
    }
    if (schemas.query) {
      req.query = await schemas.query.parseAsync(req.query);
    }
    if (schemas.params) {
      req.params = await schemas.params.parseAsync(req.params);
    }
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({
        error: formattedErrors[0]?.message || 'Validation failed',
        details: formattedErrors,
      });
    }
    return res.status(400).json({ error: error.message || 'Validation error' });
  }
};

module.exports = validate;
