import './config/env';
import { app } from './app';
import { connectDatabase } from './config/database';

const port = Number(process.env.PORT ?? 5000);

// Keep the API up even when the database is unreachable: requests then get a clear 503 instead of a dead server.
connectDatabase()
  .catch((error) => {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Database connection failed: ${reason}`);
    if (/password authentication failed/i.test(reason)) console.error('Check the PostgreSQL password in DATABASE_URL (backend/.env).');
  })
  .finally(() => app.listen(port, () => console.log(`JUTSA API listening on port ${port}`)));
