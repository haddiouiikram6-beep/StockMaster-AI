export { productService } from './product.service.js';
export { categoryService } from './category.service.js';
export { supplierService } from './supplier.service.js';
export { stockMovementService } from './stockMovement.service.js';
export { authService } from './auth.service.js';
export { aiService } from './ai.service.js';

import productService from './product.service.js';
import categoryService from './category.service.js';
import supplierService from './supplier.service.js';
import stockMovementService from './stockMovement.service.js';
import authService from './auth.service.js';
import aiService from './ai.service.js';

export default {
  product: productService,
  category: categoryService,
  supplier: supplierService,
  stockMovement: stockMovementService,
  auth: authService,
  ai: aiService
};
