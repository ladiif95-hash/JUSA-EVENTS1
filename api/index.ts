import { app } from '../backend/src/app';
import { connectDatabase } from '../backend/src/config/database';

export default async function handler(request: Parameters<typeof app>[0], response: Parameters<typeof app>[1]) {
  try {
    await connectDatabase();
    app(request, response);
  } catch (error) {
    console.error('Database connection failed', error);
    response.status(503).json({ message: 'The service is temporarily unavailable.' });
  }
}
