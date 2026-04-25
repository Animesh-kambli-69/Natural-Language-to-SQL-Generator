import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import { connectToDatabase } from './config/db.js';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import historyRoutes from './routes/history.routes.js';
import queryRoutes from './routes/query.routes.js';
import schemaRoutes from './routes/schema.routes.js';

const app = express();
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please retry later.'
  }
});
const queryRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 45,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many query generation requests. Please retry shortly.'
  }
});

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'express-api' });
});

app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/schemas', requireAuth, schemaRoutes);
app.use('/api/history', requireAuth, historyRoutes);
app.use('/api/query', requireAuth, queryRateLimiter, queryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectToDatabase();

  app.listen(env.port, () => {
    console.log(`Backend listening on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
