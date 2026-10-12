import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/index.js';
import env from '../config/env.js';

/**
 * Authentication middleware to verify JWT Bearer token.
 * In development, also supports quick developer tokens ('dev-admin', 'dev-manager', 'dev-employee')
 * for effortless API exploration via Swagger UI, cURL, or frontend testing.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1]?.trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Token string is empty.'
      });
    }

    // Developer convenience shortcut tokens (available outside production)
    if (env.NODE_ENV !== 'production') {
      if (token === 'dev-admin') {
        const adminUser = await User.findOne({ where: { role: 'admin' } });
        if (adminUser) {
          req.user = adminUser;
          return next();
        }
      } else if (token === 'dev-manager') {
        const managerUser = await User.findOne({ where: { role: 'manager' } });
        if (managerUser) {
          req.user = managerUser;
          return next();
        }
      } else if (token === 'dev-employee') {
        const employeeUser = await User.findOne({ where: { role: 'employee' } });
        if (employeeUser) {
          req.user = employeeUser;
          return next();
        }
      }
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid access token'
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles Allowed roles (e.g. 'admin', 'manager', 'employee')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${roles.join(', ')}] role`
      });
    }

    next();
  };
};

export default {
  authenticate,
  authorize
};
