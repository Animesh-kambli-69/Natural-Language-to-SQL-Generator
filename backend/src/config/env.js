import dotenv from 'dotenv';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 16) {
  throw new Error('JWT_SECRET must be set and at least 16 characters long');
}

const aiServiceToken = process.env.AI_SERVICE_TOKEN;
if (!aiServiceToken || aiServiceToken.length < 12) {
  throw new Error('AI_SERVICE_TOKEN must be set and at least 12 characters long');
}

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
