import categoryService from '../services/category.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Category Controller
 * Handles HTTP requests and delegates business logic to CategoryService
 */

export const getAllCategories = asyncHandler(async (req, res) => {
  const { rows, pagination } = await categoryService.getAll(req.query);
  return paginatedResponse(res, rows, pagination);
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getById(req.params.id);
  return successResponse(res, category);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.create(req.body);
  return successResponse(res, category, null, 201);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.update(req.params.id, req.body);
  return successResponse(res, category);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.delete(req.params.id);
  return successResponse(res, null, 'Category deleted successfully.');
});

export default {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
