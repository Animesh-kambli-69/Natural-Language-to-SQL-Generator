import dotenv from 'dotenv';

dotenv.config();

const BLOCKED_SECRET_VALUES = new Set([
  'changeme',
  'change-me',
  'replace-me',
  'replace-with-a-long-random-secret',
  'replace-with-shared-service-token',
  'your-secret',
  'default',
  'secret',
  'password',
  'example',
  'test'
]);

const COMMON_WEAK_SECRET_PATTERN = /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|qwerty|asdf|zxcv)/i;

function countCharacterClasses(value) {
  const checks = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/];
  return checks.reduce((count, regex) => count + Number(regex.test(value)), 0);
}

function hasLowEntropyShape(value) {
  const uniqueChars = new Set(value).size;
  const minUniqueChars = Math.max(4, Math.floor(value.length / 3));

  return (
    uniqueChars < minUniqueChars ||
    /^(.)\1+$/.test(value) ||
    COMMON_WEAK_SECRET_PATTERN.test(value)
  );
}

function validateSecret(name, value, minLength, minCharacterClasses) {
  if (!value || value.length < minLength) {
    throw new Error(`${name} must be set and at least ${minLength} characters long`);
  }

  const normalized = value.trim().toLowerCase();
  const looksLikePlaceholder =
    BLOCKED_SECRET_VALUES.has(normalized) ||
    normalized.startsWith('replace-with') ||
    normalized.startsWith('your-');

  if (looksLikePlaceholder) {
    throw new Error(`${name} cannot use a placeholder/default value`);
  }

  if (countCharacterClasses(value) < minCharacterClasses || hasLowEntropyShape(value)) {
    throw new Error(
      `${name} must include mixed character types and avoid predictable low-entropy patterns`
    );
  }
}

const jwtSecret = process.env.JWT_SECRET;
validateSecret('JWT_SECRET', jwtSecret, 16, 3);

const aiServiceToken = process.env.AI_SERVICE_TOKEN;
validateSecret('AI_SERVICE_TOKEN', aiServiceToken, 12, 2);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.BACKEND_PORT || 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nl2sql',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  aiServiceToken,
  aiTimeoutMs: Number(process.env.LLM_MAX_RESPONSE_MS || 850),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'nl2sql_auth'
};
