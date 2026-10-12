import { checkPromptInjection } from '../ai/guardrails.js';
import { aiAuditLogger, logger } from '../utils/logger.js';

/**
 * Middleware that guards AI endpoints from prompt injection and policy violations
 */
const aiGuard = (req, res, next) => {
  const { message } = req.body;

  if (message) {
    const check = checkPromptInjection(message);
    if (!check.isSafe) {
      aiAuditLogger.warn('Prompt injection attempt blocked', {
        userId: req.user ? req.user.id : null,
        userEmail: req.user ? req.user.email : null,
        ip: req.ip,
        message,
        reason: check.reason,
        matchedPattern: check.matchedPattern,
        timestamp: new Date().toISOString()
      });

      logger.warn(`AI Guard blocked input from user ${req.user ? req.user.id : 'unknown'}: ${check.reason}`);

      return res.status(400).json({
        success: false,
        message: 'Your message could not be processed because it violates safety and security policies.'
      });
    }
  }

  next();
};

export { aiGuard };
export default aiGuard;
