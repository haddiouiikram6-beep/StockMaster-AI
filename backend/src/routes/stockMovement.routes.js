import express from 'express';
import * as stockMovementController from '../controllers/stockMovement.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { createStockMovementSchema, queryStockMovementSchema } from '../validators/stockMovement.validator.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, validate(queryStockMovementSchema, 'query'), stockMovementController.getAllStockMovements);
router.get('/:id', authenticate, stockMovementController.getStockMovementById);
router.post('/', authenticate, validate(createStockMovementSchema), stockMovementController.createStockMovement);

export default router;
