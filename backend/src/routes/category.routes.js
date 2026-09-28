const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const validate = require('../middlewares/validate.middleware');
const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, categoryController.getAllCategories);
router.get('/:id', authenticate, categoryController.getCategoryById);
router.post('/', authenticate, authorize('admin', 'manager'), validate(createCategorySchema), categoryController.createCategory);
router.put('/:id', authenticate, authorize('admin', 'manager'), validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('admin'), categoryController.deleteCategory);

module.exports = router;
