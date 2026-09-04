import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbPool } from './connection.js';
import { logger } from '../logging/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  let client;
  try {
    client = await dbPool.connect();
  } catch (connErr) {
    logger.warn('PostgreSQL database unavailable, skipping migration run (fallback mode active)', {
      error: connErr instanceof Error ? connErr.message : String(connErr),
    });
    return;
  }

  try {
    logger.info('Starting database migrations...');

    // Create schema_migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    let migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      const srcMigrationsDir = path.join(__dirname, '../../src/db/migrations');
      if (fs.existsSync(srcMigrationsDir)) {
        migrationsDir = srcMigrationsDir;
      } else {
        logger.warn(`Migrations directory not found: ${migrationsDir}`);
        return;
      }
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (rows.length === 0) {
        logger.info(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          logger.info(`Migration applied successfully: ${file}`);
        } catch (migrationErr) {
          await client.query('ROLLBACK');
          logger.error(`Migration failed for ${file}`, { error: migrationErr });
          throw migrationErr;
        }
      } else {
        logger.debug(`Migration already applied: ${file}`);
      }
    }

    logger.info('All database migrations completed successfully.');
  } catch (error) {
    logger.error('Database migration run failed', { error });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Allow direct execution via tsx/node
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runMigrations()
    .then(() => {
      logger.info('Migration script finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration script error', { error: err });
      process.exit(1);
    });
}
