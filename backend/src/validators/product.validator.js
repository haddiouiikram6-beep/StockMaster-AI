import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200),
  reference: z.string().trim().min(1, 'Reference is required').max(100),
  description: z.string().trim().optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0'),
  quantity: z.coerce.number().int().min(0, 'Quantity must be an integer >= 0').default(0),
  minStock: z.coerce.number().int().min(0, 'Minimum stock must be an integer >= 0').default(5),
  categoryId: z.coerce.number().int().positive('Category ID must be a positive integer'),
  supplierId: z.coerce.number().int().positive('Supplier ID must be a positive integer').optional().nullable(),
  imageUrl: z.string().url('Must be a valid URL').optional().nullable()
});

const updateProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name cannot be empty').max(200).optional(),
  reference: z.string().trim().min(1, 'Reference cannot be empty').max(100).optional(),
  description: z.string().trim().optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0').optional(),
  quantity: z.coerce.number().int().min(0, 'Quantity must be an integer >= 0').optional(),
  minStock: z.coerce.number().int().min(0, 'Minimum stock must be an integer >= 0').optional(),
  categoryId: z.coerce.number().int().positive('Category ID must be a positive integer').optional(),
  supplierId: z.coerce.number().int().positive('Supplier ID must be a positive integer').optional().nullable(),
  imageUrl: z.string().url('Must be a valid URL').optional().nullable()
});

const queryProductSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  categoryId: z.coerce.number().int().positive().optional(),
  supplierId: z.coerce.number().int().positive().optional(),
  minStock: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['name', 'price', 'quantity', 'reference', 'createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).default('desc').transform(val => val.toUpperCase())
});

export {
  createProductSchema,
  updateProductSchema,
  queryProductSchema
};

export default {
  createProductSchema,
  updateProductSchema,
  queryProductSchema
};
