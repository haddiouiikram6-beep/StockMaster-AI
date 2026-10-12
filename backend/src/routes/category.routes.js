import express from 'express';
import * as categoryController from '../controllers/category.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, categoryController.getAllCategories);
router.get('/:id', authenticate, categoryController.getCategoryById);
router.post('/', authenticate, authorize('admin', 'manager'), validate(createCategorySchema), categoryController.createCategory);
router.put('/:id', authenticate, authorize('admin', 'manager'), validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('admin'), categoryController.deleteCategory);

export default router;
