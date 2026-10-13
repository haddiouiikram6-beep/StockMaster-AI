import express from 'express';
import * as productController from '../controllers/product.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createProductSchema, updateProductSchema, queryProductSchema } from '../validators/product.validator.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/stats', authenticate, productController.getProductStats);
router.get('/', authenticate, validate(queryProductSchema, 'query'), productController.getAllProducts);
router.get('/:id', authenticate, productController.getProductById);
router.post('/', authenticate, authorize('admin', 'manager'), validate(createProductSchema), productController.createProduct);
router.put('/:id', authenticate, authorize('admin', 'manager'), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteProduct);

export default router;
