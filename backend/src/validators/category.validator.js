const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100, 'Name must not exceed 100 characters'),
  description: z.string().trim().optional().nullable()
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name cannot be empty').max(100).optional(),
  description: z.string().trim().optional().nullable()
});

module.exports = {
  createCategorySchema,
  updateCategorySchema
};
