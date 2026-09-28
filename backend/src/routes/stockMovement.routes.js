const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovement.controller');
const validate = require('../middlewares/validate.middleware');
const { createStockMovementSchema, queryStockMovementSchema } = require('../validators/stockMovement.validator');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/', authenticate, validate(queryStockMovementSchema, 'query'), stockMovementController.getAllStockMovements);
router.get('/:id', authenticate, stockMovementController.getStockMovementById);
router.post('/', authenticate, validate(createStockMovementSchema), stockMovementController.createStockMovement);

module.exports = router;
