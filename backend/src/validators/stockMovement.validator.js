const { z } = require('zod');

const createStockMovementSchema = z.object({
  productId: z.coerce.number().int().positive('Product ID must be a positive integer'),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT'], {
    errorMap: () => ({ message: "Type must be one of: 'IN', 'OUT', 'ADJUSTMENT'" })
  }),
  quantity: z.coerce.number().int().positive('Quantity must be an integer >= 1'),
  reason: z.string().trim().max(255).optional().nullable(),
  date: z.string().datetime({ offset: true }).optional().or(z.string().date().optional())
});

const queryStockMovementSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  productId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']).optional(),
  sortBy: z.enum(['date', 'createdAt', 'quantity']).default('date'),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).default('desc').transform(val => val.toUpperCase())
});

module.exports = {
  createStockMovementSchema,
  queryStockMovementSchema
};
