import { z } from 'zod';

export const productTools = [
  {
    type: 'function',
    function: {
      name: 'getProductStock',
      description: 'Get current stock quantity, status, and minimum stock threshold for a product by ID or reference code.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'integer', description: 'Numeric database ID of product.' },
          reference: { type: 'string', description: 'Unique SKU / reference code of product.' }
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
          productId: { type: 'integer', description: 'Numeric database ID.' },
          reference: { type: 'string', description: 'Unique reference code.' },
          name: { type: 'string', description: 'Product name or search term.' }
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
      description: 'Retrieve products where current stock quantity is <= minStock threshold (simple low stock detection/alerts only). Do NOT use when user seeks reorder recommendations or replenishment quantities.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Maximum items to return (default 20).' }
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
      description: 'Generate comprehensive, actionable reorder recommendations and replenishment plans for depleted inventory. Calculates restock quantities, target buffers, priorities, purchase costs, and supplier details. ALWAYS choose this tool when user seeks reorder recommendations, purchase suggestions, or procurement plans.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'integer', description: 'Optional product ID to evaluate.' },
          categoryId: { type: 'integer', description: 'Optional category ID to filter.' },
          supplierId: { type: 'integer', description: 'Optional supplier ID to filter.' },
          targetMultiplier: { type: 'number', description: 'Target multiplier of minStock (default 2).' },
          limit: { type: 'integer', description: 'Maximum recommendations (default 20).' }
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
      name: 'searchProducts',
      description: 'Search for products across name, reference SKU, and description by search keywords.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keyword term to match against products.' },
          limit: { type: 'integer', description: 'Maximum search results (default 10).' }
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
      name: 'createProduct',
      description: 'Create a new product in the inventory catalog and automatically index it into the Pinecone vector database.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the product.' },
          reference: { type: 'string', description: 'Unique SKU code (auto-generated if omitted).' },
          price: { type: 'number', description: 'Selling price in DH.' },
          quantity: { type: 'integer', description: 'Initial stock quantity (default 0).' },
          minStock: { type: 'integer', description: 'Minimum stock alert threshold (default 5).' },
          categoryId: { type: 'integer', description: 'Category ID.' },
          categoryName: { type: 'string', description: 'Category name (used if categoryId omitted).' },
          description: { type: 'string', description: 'Description of product.' }
        },
        required: ['name', 'price']
      }
    },
    schema: z.object({
      name: z.string().trim().min(1, 'Product name is required'),
      reference: z.string().trim().optional(),
      price: z.number().nonnegative('Price must be >= 0'),
      quantity: z.number().int().nonnegative().optional().default(0),
      minStock: z.number().int().nonnegative().optional().default(5),
      categoryId: z.number().int().positive().optional(),
      categoryName: z.string().trim().optional(),
      description: z.string().trim().optional()
    }),
    allowedRoles: ['admin', 'manager', 'employee']
  },
  {
    type: 'function',
    function: {
      name: 'vectorSearchProducts',
      description: 'Perform semantic vector similarity search in Pinecone vector database for products matching natural language queries or use-cases.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language search query.' },
          limit: { type: 'integer', description: 'Maximum number of results (default 10).' }
        },
        required: ['query']
      }
    },
    schema: z.object({
      query: z.string().trim().min(1, 'Search query cannot be empty'),
      limit: z.number().int().positive().max(50).optional().default(10)
    }),
    allowedRoles: ['admin', 'manager', 'employee']
  }
];
