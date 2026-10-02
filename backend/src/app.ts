import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { isDatabaseReady } from './db';
import { router } from './routes';
import { errorHandler } from './middleware/error.middleware';

export const app = express();
// Vercel sits in front of the app; trust its X-Forwarded-For so rate limiting sees real client IPs.
app.set('trust proxy', 1);
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '8mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests. Please wait a moment and try again.' } }));
// Answer immediately with a clear reason instead of failing every query when the database is missing.
app.use('/api', (request, response, next) => {
  if (request.path === '/health' || isDatabaseReady()) return next();
  return response.status(503).json({ message: 'The database is not connected. Set DATABASE_URL in backend/.env and restart the server.' });
});
app.use('/api', router);
app.use(errorHandler);

// Vercel can use this module directly as a serverless function entrypoint.
export default app;
