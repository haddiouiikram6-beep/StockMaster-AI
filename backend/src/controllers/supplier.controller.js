import supplierService from '../services/supplier.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Supplier Controller
 * Handles HTTP requests and delegates business logic to SupplierService
 */

export const getAllSuppliers = asyncHandler(async (req, res) => {
  const { rows, pagination } = await supplierService.getAll(req.query);
  return paginatedResponse(res, rows, pagination);
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getById(req.params.id);
  return successResponse(res, supplier);
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.create(req.body);
  return successResponse(res, supplier, null, 201);
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.update(req.params.id, req.body);
  return successResponse(res, supplier);
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  await supplierService.delete(req.params.id);
  return successResponse(res, null, 'Supplier deleted successfully.');
});

export default {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
