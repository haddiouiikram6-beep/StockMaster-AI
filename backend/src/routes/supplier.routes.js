const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const validate = require('../middlewares/validate.middleware');
const { createSupplierSchema, updateSupplierSchema } = require('../validators/supplier.validator');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, supplierController.getAllSuppliers);
router.get('/:id', authenticate, supplierController.getSupplierById);
router.post('/', authenticate, authorize('admin', 'manager'), validate(createSupplierSchema), supplierController.createSupplier);
router.put('/:id', authenticate, authorize('admin', 'manager'), validate(updateSupplierSchema), supplierController.updateSupplier);
router.delete('/:id', authenticate, authorize('admin'), supplierController.deleteSupplier);

module.exports = router;
