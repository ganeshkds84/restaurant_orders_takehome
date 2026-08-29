import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './logging/logger.js';
import { closeDbPool } from './db/connection.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Restaurant Orders API server running on port ${env.PORT}`, {
    port: env.PORT,
    environment: env.NODE_ENV,
  });
});

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await closeDbPool();
    logger.info('Database pool closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
