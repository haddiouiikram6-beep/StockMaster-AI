/**
 * AI Guardrails and Prompt Injection Protection
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|prompts)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|rules)/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|initial\s+instructions)/i,
  /what\s+is\s+your\s+system\s+prompt/i,
  /show\s+me\s+(the\s+)?(system\s+prompt|raw\s+prompt)/i,
  /give\s+me\s+(database\s+)?(credentials|passwords|secrets)/i,
  /database\s+password|db_password|jwt_secret|api_key/i,
  /show\s+me\s+environment\s+variables|\.env/i,
  /execute\s+arbitrary\s+sql|drop\s+table|delete\s+from\s+users/i,
  /union\s+select|select\s+.*\s+from\s+users/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /dan\s+mode|jailbreak/i,
  /bypass\s+(safety|content\s+filters|security)/i
];

/**
 * Checks if the prompt contains suspicious injection or leak attempts
 * @param {string} text 
 * @returns {{ isSafe: boolean, reason?: string, matchedPattern?: string }}
 */
const checkPromptInjection = (text) => {
  if (!text || typeof text !== 'string') {
    return { isSafe: true };
  }

  const cleanText = text.trim();

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        isSafe: false,
        reason: 'Potential prompt injection or security policy violation detected.',
        matchedPattern: pattern.toString()
      };
    }
  }

  // Reject excessively long or repetitive token stuffing
  if (cleanText.length > 4000) {
    return {
      isSafe: false,
      reason: 'Message length exceeds maximum allowable limit (4000 characters).'
    };
  }

  return { isSafe: true };
};

/**
 * Sanitizes model or tool output to avoid accidentally leaking internal secrets
 * @param {string} text 
 * @returns {string}
 */
const sanitizeOutput = (text) => {
  if (!text || typeof text !== 'string') return text;

  let sanitized = text;

  // Mask database credentials or secrets if somehow leaked
  sanitized = sanitized.replace(/(password|jwt_secret|token|api_key)=['"]?[^'"\s]+['"]?/gi, '$1=***REDACTED***');
  sanitized = sanitized.replace(/postgres:\/\/[^:]+:[^@]+@/gi, 'postgres://***:***@');
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer ***REDACTED***');

  return sanitized;
};

module.exports = {
  checkPromptInjection,
  sanitizeOutput
};
