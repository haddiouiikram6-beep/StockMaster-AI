import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for sanitizing sensitive fields
const sanitizeSensitiveInfo = winston.format((info) => {
  const sensitiveKeys = ['password', 'token', 'accessToken', 'refreshToken', 'authorization', 'apiKey', 'secret'];
  
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const cloned = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(cloned)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        cloned[key] = '***REDACTED***';
      } else if (typeof cloned[key] === 'object' && cloned[key] !== null) {
        cloned[key] = sanitize(cloned[key]);
      }
    }
    return cloned;
  };

  return sanitize(info);
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    sanitizeSensitiveInfo(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'stockmaster-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Dedicated AI Audit Logger
const aiAuditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    sanitizeSensitiveInfo(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-audit' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'ai-audit.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

if (process.env.NODE_ENV !== 'test') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1 ? JSON.stringify(meta) : '';
          return `[${timestamp}] ${level}: ${message} ${metaStr}`;
        })
      )
    })
  );
  aiAuditLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] AI_AUDIT: ${message} ${JSON.stringify(meta)}`;
        })
      )
    })
  );
}

// Morgan stream
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

export {
  logger,
  aiAuditLogger
};

export default logger;
