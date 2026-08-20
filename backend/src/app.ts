import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { router } from './routes';
import { errorHandler } from './middleware/error.middleware';

export const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '8mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', router);
app.use(errorHandler);

// Vercel can use this module directly as a serverless function entrypoint.
export default app;
