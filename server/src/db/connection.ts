import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../logging/logger.js';

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

dbPool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

export interface DbHealthStatus {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

export async function checkDbHealth(): Promise<DbHealthStatus> {
  const start = Date.now();
  try {
    const client = await dbPool.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - start;
      return { connected: true, latencyMs };
    } finally {
      client.release();
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown database error';
    return {
      connected: false,
      error: errMessage,
    };
  }
}

export async function closeDbPool(): Promise<void> {
  await dbPool.end();
}
