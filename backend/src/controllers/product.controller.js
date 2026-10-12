import productService from '../services/product.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Product Controller
 * Handles HTTP requests and delegates business logic to ProductService
 */

export const getAllProducts = asyncHandler(async (req, res) => {
  const { rows, pagination } = await productService.getAll(req.query);
  return paginatedResponse(res, rows, pagination);
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getById(req.params.id);
  return successResponse(res, product);
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body);
  return successResponse(res, product, null, 201);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.update(req.params.id, req.body);
  return successResponse(res, product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.delete(req.params.id);
  return successResponse(res, null, 'Product deleted successfully.');
});

export default {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
