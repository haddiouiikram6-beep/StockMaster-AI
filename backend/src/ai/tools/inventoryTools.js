import { z } from 'zod';

export const inventoryTools = [
  {
    type: 'function',
    function: {
      name: 'getInventorySummary',
      description: 'Get a general summary of the entire inventory, including total value, total items, and overall status.',
      parameters: { type: 'object', properties: {} }
    },
    schema: z.object({}),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'getCategories',
      description: 'List all product categories.',
      parameters: { type: 'object', properties: {} }
    },
    schema: z.object({}),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'getSuppliers',
      description: 'List all suppliers.',
      parameters: { type: 'object', properties: {} }
    },
    schema: z.object({}),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'getStockMovements',
      description: 'Get recent inventory stock movements (IN, OUT, ADJUSTMENT) with product details and user who performed the movement.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'integer', description: 'Optional filter for a specific product ID.' },
          type: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT'], description: 'Filter by movement type.' },
          limit: { type: 'integer', description: 'Maximum number of movements (default 10).' }
        }
      }
    },
    schema: z.object({
      productId: z.number().int().positive().optional(),
      type: z.enum(['IN', 'OUT', 'ADJUSTMENT']).optional(),
      limit: z.number().int().positive().max(50).optional().default(10)
    }),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'getSupplierInfo',
      description: 'Retrieve supplier details including contact info and the list of products they provide.',
      parameters: {
        type: 'object',
        properties: {
          supplierId: { type: 'integer', description: 'Numeric database ID of the supplier.' },
          name: { type: 'string', description: 'Name or partial name of the supplier.' }
        }
      }
    },
    schema: z.object({
      supplierId: z.number().int().positive().optional(),
      name: z.string().trim().optional()
    }).refine(data => data.supplierId || data.name, {
      message: 'Either supplierId or supplier name must be provided'
    }),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'getProductsByCategory',
      description: 'List all products assigned to a specific category by category ID or category name.',
      parameters: {
        type: 'object',
        properties: {
          categoryId: { type: 'integer', description: 'Numeric database ID of the category.' },
          categoryName: { type: 'string', description: 'Name of the category.' },
          limit: { type: 'integer', description: 'Maximum products to return (default 20).' }
        }
      }
    },
    schema: z.object({
      categoryId: z.number().int().positive().optional(),
      categoryName: z.string().trim().optional(),
      limit: z.number().int().positive().max(50).optional().default(20)
    }).refine(data => data.categoryId || data.categoryName, {
      message: 'Either categoryId or categoryName must be provided'
    }),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'analyzeStock',
      description: 'Analyze inventory to find critical issues, potential stockouts, and overall stock health.',
      parameters: { type: 'object', properties: {} }
    },
    schema: z.object({}),
    allowedRoles: ['admin', 'manager', 'employee']
  }
];
