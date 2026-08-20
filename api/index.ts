import type { Request, Response } from 'express';
import app from '../backend/src/app';
import { connectDatabase } from '../backend/src/config/database';

export default async function handler(request: Request, response: Response) {
  try {
    await connectDatabase();
    return app(request, response);
  } catch (error) {
    console.error('Database connection failed', error);
    return response.status(503).json({ message: 'The service is temporarily unavailable.' });
  }
}
