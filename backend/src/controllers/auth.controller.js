import authService from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Authentication Controller
 * Handles HTTP requests and delegates auth flows to AuthService
 */

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return successResponse(res, user, null, 201);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return successResponse(res, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  return successResponse(res, result);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body?.refreshToken);
  return successResponse(res, null, 'Logged out successfully.');
});

export const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, req.user);
});

export default {
  register,
  login,
  refresh,
  logout,
  getMe
};
