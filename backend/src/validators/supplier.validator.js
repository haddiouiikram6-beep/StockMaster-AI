import { z } from 'zod';

const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(150),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email('Invalid email address format').optional().nullable().or(z.literal(''))
});

const updateSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name cannot be empty').max(150).optional(),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email('Invalid email address format').optional().nullable().or(z.literal(''))
});

export {
  createSupplierSchema,
  updateSupplierSchema
};

export default {
  createSupplierSchema,
  updateSupplierSchema
};
