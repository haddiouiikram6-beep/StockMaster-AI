import express from 'express';
import * as supplierController from '../controllers/supplier.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplier.validator.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, supplierController.getAllSuppliers);
router.get('/:id', authenticate, supplierController.getSupplierById);
router.post('/', authenticate, authorize('admin', 'manager'), validate(createSupplierSchema), supplierController.createSupplier);
router.put('/:id', authenticate, authorize('admin', 'manager'), validate(updateSupplierSchema), supplierController.updateSupplier);
router.delete('/:id', authenticate, authorize('admin'), supplierController.deleteSupplier);

export default router;
