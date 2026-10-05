const { z } = require('zod');

/**
 * Tool definitions conforming to OpenAI Function Calling standard,
 * annotated with Zod validation schemas and allowed roles.
 */
const tools = [
  {
    type: 'function',
    function: {
      name: 'getInventorySummary',
      description: 'Get a general summary of the entire inventory, including total value, total items, and overall status.',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    schema: z.object({}),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'getCategories',
      description: 'List all product categories.',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    schema: z.object({}),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'getSuppliers',
      description: 'List all suppliers.',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    schema: z.object({}),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'getProductStock',
      description: 'Get current stock quantity, status, and minimum stock threshold for a product by ID or reference code.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'integer',
            description: 'The numeric database ID of the product.'
          },
          reference: {
            type: 'string',
            description: 'The unique SKU / reference code of the product (e.g. PROD-KB-001).'
          }
        }
      }
    },
    schema: z.object({
      productId: z.number().int().positive().optional(),
      reference: z.string().trim().optional()
    }).refine(data => data.productId || data.reference, {
      message: 'Either productId or reference must be provided'
    }),
    allowedRoles: ['admin', 'manager', 'employee']
  },

  {
    type: 'function',
    function: {
      name: 'getProductInfo',
      description: 'Get detailed product information including name, SKU reference, price, quantity, category, and supplier.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'integer',
            description: 'The numeric database ID of the product.'
          },
          reference: {
            type: 'string',
            description: 'The unique reference code of the product.'
          },
          name: {
            type: 'string',
            description: 'Product name or partial search term.'
          }
        }
      }
    },
    schema: z.object({
      productId: z.number().int().positive().optional(),
      reference: z.string().trim().optional(),
      name: z.string().trim().optional()
    }),
    allowedRoles: ['admin', 'manager', 'employee']
  },

  {
    type: 'function',
    function: {
      name: 'getLowStockProducts',
      description: 'Retrieve products where current stock quantity is less than or equal to their configured minimum stock threshold (for simple low-stock detection/alerts only). CRITICAL: Do NOT use this tool if the user is asking what to order, reorder recommendations, replenishment amounts, or procurement planning; use recommendReorder instead.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: 'Maximum number of items to return (default is 20).'
          }
        }
      }
    },
    schema: z.object({
      limit: z.number().int().positive().max(100).optional().default(20)
    }),
    allowedRoles: ['admin', 'manager', 'employee']
  },

  {
    type: 'function',
    function: {
      name: 'recommendReorder',
      description: 'Generate comprehensive, actionable reorder recommendations and replenishment plans for low or depleted inventory. Calculates suggested restock quantities, target stock buffers, priority rankings (CRITICAL, HIGH, MEDIUM), estimated purchase costs, and supplier contact details. ALWAYS choose this tool when the user seeks reorder recommendations, purchase suggestions, restocking quantities, or procurement plans.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'integer',
            description: 'Optional numeric database ID of a specific product to evaluate for reorder.'
          },
          categoryId: {
            type: 'integer',
            description: 'Optional category ID to filter reorder recommendations.'
          },
          supplierId: {
            type: 'integer',
            description: 'Optional supplier ID to filter reorder recommendations by vendor.'
          },
          targetMultiplier: {
            type: 'number',
            description: 'Target multiplier of minStock to buffer inventory (e.g. 2.0 targets 2x minStock). Default is 2.'
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of reorder recommendations to return (default is 20).'
          }
        }
      }
    },
    schema: z.object({
      productId: z.number().int().positive().optional(),
      categoryId: z.number().int().positive().optional(),
      supplierId: z.number().int().positive().optional(),
      targetMultiplier: z.number().positive().max(10).optional().default(2),
      limit: z.number().int().positive().max(100).optional().default(20)
    }),
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
          productId: {
            type: 'integer',
            description: 'Optional filter for a specific product ID.'
          },
          type: {
            type: 'string',
            enum: ['IN', 'OUT', 'ADJUSTMENT'],
            description: 'Filter by movement type: IN, OUT, or ADJUSTMENT.'
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of movements to return (default is 10).'
          }
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
          supplierId: {
            type: 'integer',
            description: 'The numeric database ID of the supplier.'
          },
          name: {
            type: 'string',
            description: 'The name or partial name of the supplier.'
          }
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
          categoryId: {
            type: 'integer',
            description: 'The numeric database ID of the category.'
          },
          categoryName: {
            type: 'string',
            description: 'The exact or partial name of the category (e.g. Electronics).'
          },
          limit: {
            type: 'integer',
            description: 'Maximum products to return (default is 20).'
          }
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
      name: 'searchProducts',
      description: 'Search for products across name, reference SKU, and description by search keywords.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search keyword term to match against products.'
          },
          limit: {
            type: 'integer',
            description: 'Maximum search results to return (default is 10).'
          }
        },
        required: ['query']
      }
    },
    schema: z.object({
      query: z.string().trim().min(1, 'Search query cannot be empty'),
      limit: z.number().int().positive().max(50).optional().default(10)
    }),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'analyzeStock',
      description: 'Analyze inventory to find critical issues, potential stockouts, and overall stock health.',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    schema: z.object({}),
    allowedRoles: ['admin', 'manager', 'employee']
  }
];

// OpenAi Function formats
const openAiTools = tools.map(({ type, function: fn }) => ({ type, function: fn }));

module.exports = {
  tools,
  openAiTools
};
