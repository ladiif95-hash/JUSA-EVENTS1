import pg from 'pg';
import { schemaSql } from './schema';

export type Row = Record<string, any>;
export type Db = Pick<pg.PoolClient, 'query'>;

let pool: pg.Pool | null = null;
let ready = false;
let connecting: Promise<void> | null = null;

const camel = (key: string) => key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

// Rows come back snake_case; the API speaks camelCase and the frontend still reads Mongo-style `_id`.
export function toApi(value: unknown): any {
  if (Array.isArray(value)) return value.map(toApi);
  if (!value || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
  const output: Row = {};
  for (const [key, item] of Object.entries(value)) output[camel(key)] = toApi(item);
  if (output.id !== undefined && output._id === undefined) output._id = output.id;
  return output;
}

export const isUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isUniqueViolation = (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
export const isDatabaseReady = () => ready;

function getPool() {
  if (!pool) throw new Error('DATABASE_URL is not set');
  return pool;
}

export async function query<T = Row>(text: string, params: unknown[] = [], db: Db = getPool()): Promise<T[]> {
  const result = await db.query(text, params);
  return toApi(result.rows) as T[];
}

export async function one<T = Row>(text: string, params: unknown[] = [], db: Db = getPool()): Promise<T | null> {
  return (await query<T>(text, params, db))[0] ?? null;
}

export async function count(text: string, params: unknown[] = [], db: Db = getPool()) {
  const result = await db.query(text, params);
  return Number(Object.values(result.rows[0] ?? { count: 0 })[0] ?? 0);
}

export async function transaction<T>(work: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

// Builds "col = $n" assignments from a camelCase patch, skipping undefined values.
export function updateSet(patch: Row, startIndex = 1) {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key], index) => `${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)} = $${index + startIndex}`);
  return { sql: [...columns, 'updated_at = now()'].join(', '), values: entries.map(([, value]) => value) };
}

// Local development convenience: create the database named in DATABASE_URL when it does not exist yet.
async function ensureDatabaseExists(connectionString: string) {
  const url = new URL(connectionString);
  const name = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!name || !/^[a-zA-Z0-9_]+$/.test(name) || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname)) return;
  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!exists.rowCount) {
      await admin.query(`CREATE DATABASE "${name}"`);
      console.info(`Created PostgreSQL database "${name}"`);
    }
  } finally {
    await admin.end();
  }
}

export async function connectDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Without a database every request would fail, so refuse to start in production.
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) throw new Error('DATABASE_URL is not set');
    console.warn('DATABASE_URL is not set: API is running without a database connection.');
    return;
  }
  if (ready) return;
  // Serverless functions reuse warm instances; share one pool and one setup run.
  connecting ??= (async () => {
    await ensureDatabaseExists(connectionString);
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
    pool = new pg.Pool({ connectionString, max: process.env.VERCEL ? 3 : 10, ssl: local || /sslmode=disable/.test(connectionString) ? undefined : { rejectUnauthorized: false } });
    await pool.query(schemaSql);
    ready = true;
    console.info('Connected to PostgreSQL');
  })().catch(async (error) => {
    connecting = null;
    await pool?.end().catch(() => undefined);
    pool = null;
    throw error;
  });
  await connecting;
}

export async function disconnectDatabase() {
  await pool?.end();
  pool = null;
  ready = false;
  connecting = null;
}
