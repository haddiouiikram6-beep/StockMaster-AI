import stockMovementService from '../services/stockMovement.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Stock Movement Controller
 * Handles HTTP requests and delegates transaction logic to StockMovementService
 */

export const getAllStockMovements = asyncHandler(async (req, res) => {
  const { rows, pagination } = await stockMovementService.getAll(req.query);
  return paginatedResponse(res, rows, pagination);
});

export const getStockMovementById = asyncHandler(async (req, res) => {
  const movement = await stockMovementService.getById(req.params.id);
  return successResponse(res, movement);
});

export const createStockMovement = asyncHandler(async (req, res) => {
  const { productId, type, quantity, reason, date } = req.body;
  const result = await stockMovementService.createMovement({
    productId,
    userId: req.user.id,
    type,
    quantity,
    reason,
    date
  });
  return successResponse(res, result, null, 201);
});

export default {
  getAllStockMovements,
  getStockMovementById,
  createStockMovement
};
