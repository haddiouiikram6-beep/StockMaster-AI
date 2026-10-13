import { User, RefreshToken } from '../models/index.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

class AuthService {
  /**
   * Register a new employee user
   */
  async register({ fullName, email, password }) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('A user with this email address already exists.', 409);
    }

    const user = await User.create({
      fullName,
      email,
      password,
      role: 'employee'
    });

    logger.info(`User registered successfully: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
    return user;
  }

  /**
   * Authenticate user credentials and issue token pair
   */
  async login({ email, password }) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      logger.warn(`Failed login attempt for email: ${email}`);
      throw new AppError('Invalid email or password.', 401);
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt,
      revoked: false
    });

    logger.info(`User logged in: ${user.email} (ID: ${user.id})`);

    return {
      accessToken,
      refreshToken,
      user
    };
  }

  /**
   * Rotate access and refresh token pair
   */
  async refresh(refreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (_) {
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    const storedToken = await RefreshToken.findOne({
      where: {
        token: refreshToken,
        userId: decoded.id,
        revoked: false
      }
    });

    if (!storedToken || storedToken.isExpired()) {
      throw new AppError('Refresh token has expired or been revoked.', 401);
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new AppError('User no longer exists.', 401);
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

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: user.toJSON()
    };
  }

  /**
   * Revoke refresh token on logout
   */
  async logout(refreshToken) {
    if (refreshToken) {
      await RefreshToken.update(
        { revoked: true },
        { where: { token: refreshToken } }
      );
    }
    return true;
  }
}

export const authService = new AuthService();
export default authService;
