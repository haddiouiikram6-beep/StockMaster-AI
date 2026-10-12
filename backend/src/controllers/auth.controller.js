import { User, RefreshToken } from '../models/index.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      role: 'employee'
    });

    logger.info(`User registered successfully: ${user.email} (ID: ${user.id}, Role: ${user.role})`);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user and issue Access and Refresh tokens
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Calculate expiration date (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt,
      revoked: false
    });

    logger.info(`User logged in: ${user.email} (ID: ${user.id})`);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using a valid refresh token
 * POST /api/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.'
      });
    }

    const storedToken = await RefreshToken.findOne({
      where: {
        token: refreshToken,
        userId: decoded.id,
        revoked: false
      }
    });

    if (!storedToken || storedToken.isExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired or been revoked.'
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.'
      });
    }

    // Revoke old token (Token Rotation)
    storedToken.revoked = true;
    await storedToken.save();

    // Issue new pair
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      token: newRefreshToken,
      userId: user.id,
      expiresAt,
      revoked: false
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user and revoke refresh token
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.update(
        { revoked: true },
        { where: { token: refreshToken } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};

export {
  register,
  login,
  refresh,
  logout,
  getMe
};

export default {
  register,
  login,
  refresh,
  logout,
  getMe
};
