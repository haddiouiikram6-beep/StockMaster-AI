const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const validate = require('../middlewares/validate.middleware');
const { createProductSchema, updateProductSchema, queryProductSchema } = require('../validators/product.validator');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, validate(queryProductSchema, 'query'), productController.getAllProducts);
router.get('/:id', authenticate, productController.getProductById);
router.post('/', authenticate, authorize('admin', 'manager'), validate(createProductSchema), productController.createProduct);
router.put('/:id', authenticate, authorize('admin', 'manager'), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteProduct);

module.exports = router;
