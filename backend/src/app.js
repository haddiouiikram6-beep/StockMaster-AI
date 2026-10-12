import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import env from './config/env.js';
import { logger } from './utils/logger.js';
import errorHandler from './middlewares/errorHandler.middleware.js';
import { apiLimiter } from './middlewares/rateLimit.middleware.js';

// Application Routes
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import productRoutes from './routes/product.routes.js';
import stockMovementRoutes from './routes/stockMovement.routes.js';
import aiRoutes from './routes/ai.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) for mobile, web, and tooling
app.use(cors({
  origin: env.CORS_ORIGIN === '*' ? true : (env.CORS_ORIGIN || true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Security Headers (Configured for compatibility with Swagger UI)
app.use(helmet({
  contentSecurityPolicy: false
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Request Logger
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Swagger UI Documentation
try {
  const swaggerDocument = YAML.load(path.resolve(__dirname, '../docs/swagger.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (swErr) {
  logger.warn('Swagger specification could not be loaded at /api/docs:', swErr.message);
}

// Welcome / API Discovery endpoints
const apiDiscoveryHandler = (req, res) => {
  res.status(200).json({
    name: 'StockMaster AI Backend API',
    version: '1.0.0',
    description: 'Inventory Management System with AI Agent Integration',
    status: 'ONLINE',
    environment: env.NODE_ENV,
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      suppliers: '/api/suppliers',
      stockMovements: '/api/stock-movements',
      ai: '/api/ai'
    }
  });
};

app.get('/', apiDiscoveryHandler);
app.get('/api', apiDiscoveryHandler);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Apply API Rate Limiter
app.use('/api/', apiLimiter);

// Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/ai', aiRoutes);

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});

// Centralized Global Error Handler
app.use(errorHandler);

export { app };
export default app;
