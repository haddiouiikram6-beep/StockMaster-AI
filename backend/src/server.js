import app from './app.js';
import env from './config/env.js';
import { sequelize } from './config/database.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT || 3000;

const startServer = async () => {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    logger.info(`Database connected successfully (${sequelize.getDialect()})`);

    // Synchronize PostgreSQL primary key sequences with MAX(id) if running on PostgreSQL
    if (sequelize.getDialect() === 'postgres') {
      const tables = ['users', 'categories', 'suppliers', 'products', 'stock_movements', 'conversations', 'messages', 'refresh_tokens'];
      for (const table of tables) {
        try {
          await sequelize.query(`
            SELECT setval(
              pg_get_serial_sequence('${table}', 'id'),
              COALESCE((SELECT MAX(id) FROM "${table}"), 1),
              (SELECT MAX(id) IS NOT NULL FROM "${table}")
            );
          `);
        } catch (_) {}
      }
    }

    const server = app.listen(PORT, () => {
      logger.info(`StockMaster AI Backend listening on port ${PORT} [${env.NODE_ENV}]`);
      logger.info(`API Documentation available at: http://localhost:${PORT}/api/docs`);
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await sequelize.close();
          logger.info('Database connection closed.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { startServer };
export default startServer;
