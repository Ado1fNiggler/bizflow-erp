// backend/app.js
// Express application configuration

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Import configurations
import corsConfig from './config/cors.js';
import { logger } from './utils/logger.js';

// Import middleware
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { validateRequest } from './middleware/validation.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import mydataRoutes from './routes/mydataRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import testRoutes from './routes/testRoutes.js';

// Import services
import auditService from './services/auditService.js';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// ============================================
// Trust Proxy (for deployment behind reverse proxy)
// ============================================
app.set('trust proxy', 1);

// ============================================
// Security Middleware
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors(corsConfig));

// ============================================
// Rate Limiting
// ============================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

app.use('/api/', generalLimiter);
app.use('/api/v1/auth/', authLimiter);

// ============================================
// Body Parsing & Compression
// ============================================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============================================
// Logging
// ============================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Custom request logger
app.use(requestLogger);

// ============================================
// Static Files
// ============================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve frontend files
const frontendPath = path.join(__dirname, 'frontend');
app.use('/app', express.static(frontendPath));

// Serve index.html for /app route
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ============================================
// API Routes
// ============================================
const API_PREFIX = '/api/v1';

// Public routes (no authentication required)
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/system`, systemRoutes);
app.use(`${API_PREFIX}/test`, testRoutes); // Test routes for development

// Protected routes (authentication required)
app.use(`${API_PREFIX}/companies`, authenticate, companyRoutes);
app.use(`${API_PREFIX}/documents`, authenticate, documentRoutes);
app.use(`${API_PREFIX}/members`, authenticate, memberRoutes);
app.use(`${API_PREFIX}/invoices`, authenticate, invoiceRoutes);
app.use(`${API_PREFIX}/mydata`, authenticate, mydataRoutes);
app.use(`${API_PREFIX}/reports`, authenticate, reportRoutes);
app.use(`${API_PREFIX}/admin`, authenticate, adminRoutes);

// ============================================
// API Documentation (Swagger)
// ============================================
if (process.env.NODE_ENV === 'development') {
  const swaggerUi = await import('swagger-ui-express');
  const swaggerConfig = await import('./config/swagger.js');
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerConfig.default));
}

// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '2.0.0'
  });
});

// ============================================
// Root Endpoint
// ============================================
app.get('/', (req, res) => {
  // Redirect to the main app
  res.redirect('/app');
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res, next) => {
  // Log 404 attempts for security monitoring
  auditService.logSecurityEvent('404_NOT_FOUND', 'low', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    statusCode: 404
  });
});

// ============================================
// Error Handler (must be last)
// ============================================
app.use(errorHandler);

// ============================================
// Graceful Shutdown Handler
// ============================================
const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  
  // Close any open connections
  // Add cleanup logic here if needed
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;