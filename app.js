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
import simpleAuthRoutes from './routes/simpleAuth.js';
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
// Security Middleware - conditionally disable CSP
if (process.env.DISABLE_HELMET_CSP === 'true') {
  // Disable all security headers for development
  console.log('🔓 Security headers disabled for development');
} else {
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP completely
    crossOriginEmbedderPolicy: false,
  }));
}

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
console.log('Frontend path:', frontendPath);

// Serve the frontend app
app.get('/app', (req, res) => {
  console.log('Serving /app');
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/app.js', (req, res) => {
  console.log('Serving /app.js');
  res.sendFile(path.join(__dirname, 'frontend', 'app.js'));
});

// Simple test page
app.get('/test', (req, res) => {
  console.log('Serving /test');
  res.sendFile(path.join(__dirname, 'frontend', 'test.html'));
});

// Serve static assets
app.use(express.static(frontendPath));

// ============================================
// API Routes
// ============================================
const API_PREFIX = '/api/v1';

// Public routes (no authentication required)
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/simple`, simpleAuthRoutes); // Simple backup auth
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
// Health Check Endpoints
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

// Also add health check at common API paths
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'API is running'
  });
});

app.get('/api/system/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'System API is running'
  });
});

// Simple favicon handler
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// ============================================
// Root Endpoint
// ============================================
app.get('/', (req, res) => {
  // Embed the HTML directly to avoid file path issues
  res.send(`
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BizFlow ERP - Σύστημα Διαχείρισης Επιχειρήσεων</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .login-container { max-width: 400px; margin: 10vh auto; }
        .card { border: none; border-radius: 15px; box-shadow: 0 20px 30px rgba(0,0,0,0.2); }
        .card-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px 15px 0 0 !important; text-align: center; padding: 2rem; }
        .logo { width: 80px; height: 80px; background: white; border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #667eea; }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 10px; padding: 12px; font-weight: 600; }
        .form-control { border-radius: 10px; border: 2px solid #e9ecef; padding: 12px; }
        .form-control:focus { border-color: #667eea; box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25); }
        .dashboard-container { display: none; margin: 2rem; }
        .stats-card { border-radius: 15px; border: none; box-shadow: 0 5px 15px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
        .stats-card .card-body { padding: 2rem; }
        .stats-number { font-size: 2.5rem; font-weight: bold; color: #667eea; }
        .navbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; }
        .sidebar { background: white; min-height: 100vh; box-shadow: 2px 0 5px rgba(0,0,0,0.1); }
        .nav-link { color: #6c757d; padding: 15px 20px; border-radius: 10px; margin: 5px 10px; transition: all 0.3s; }
        .nav-link:hover, .nav-link.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .content-area { background: #f8f9fa; min-height: 100vh; padding: 2rem; }
    </style>
</head>
<body>
    <div id="loginContainer" class="login-container">
        <div class="card">
            <div class="card-header">
                <div class="logo"><i class="bi bi-building"></i></div>
                <h3>BizFlow ERP</h3>
                <p class="mb-0">Σύστημα Διαχείρισης Επιχειρήσεων</p>
            </div>
            <div class="card-body p-4">
                <form id="loginForm">
                    <div class="mb-3">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" class="form-control" id="email" required>
                    </div>
                    <div class="mb-3">
                        <label for="password" class="form-label">Κωδικός</label>
                        <input type="password" class="form-control" id="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-100 mb-3">
                        <i class="bi bi-box-arrow-in-right me-2"></i>Είσοδος
                    </button>
                </form>
                <hr>
                <div class="text-center">
                    <small class="text-muted">Δεν έχεις λογαριασμό;</small><br>
                    <button class="btn btn-link" onclick="showRegister()">Εγγραφή</button>
                </div>
            </div>
        </div>
    </div>

    <div id="dashboardContainer" class="dashboard-container">
        <nav class="navbar navbar-expand-lg navbar-dark">
            <div class="container-fluid">
                <a class="navbar-brand" href="#"><i class="bi bi-building me-2"></i>BizFlow ERP</a>
                <div class="navbar-nav ms-auto">
                    <a class="nav-link" href="#" onclick="logout()"><i class="bi bi-box-arrow-right me-1"></i>Έξοδος</a>
                </div>
            </div>
        </nav>
        <div class="row g-0">
            <div class="col-md-2 sidebar">
                <nav class="nav flex-column p-3">
                    <a class="nav-link active" href="#" onclick="showSection('dashboard')"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a>
                    <a class="nav-link" href="#" onclick="showSection('companies')"><i class="bi bi-building me-2"></i>Εταιρείες</a>
                </nav>
            </div>
            <div class="col-md-10 content-area">
                <div id="dashboardSection">
                    <h2><i class="bi bi-speedometer2 me-2"></i>Dashboard</h2>
                    <div class="row">
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <i class="bi bi-building text-primary fs-1"></i>
                                    <div class="stats-number" id="companiesCount">0</div>
                                    <div class="text-muted">Εταιρείες</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="companiesSection" style="display: none;">
                    <h2><i class="bi bi-building me-2"></i>Εταιρείες</h2>
                    <div class="alert alert-success">✅ Σύστημα λειτουργεί με απλό authentication!</div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="registerModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Εγγραφή Νέου Χρήστη</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="registerForm">
                        <div class="mb-3">
                            <label for="regName" class="form-label">Όνομα</label>
                            <input type="text" class="form-control" id="regName" required>
                        </div>
                        <div class="mb-3">
                            <label for="regEmail" class="form-label">Email</label>
                            <input type="email" class="form-control" id="regEmail" required>
                        </div>
                        <div class="mb-3">
                            <label for="regPassword" class="form-label">Κωδικός</label>
                            <input type="password" class="form-control" id="regPassword" required>
                        </div>
                        <div class="mb-3">
                            <label for="regConfirmPassword" class="form-label">Επιβεβαίωση Κωδικού</label>
                            <input type="password" class="form-control" id="regConfirmPassword" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Άκυρο</button>
                    <button type="button" class="btn btn-primary" onclick="register()">Εγγραφή</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const API_BASE = window.location.origin + '/api/v1';
        let currentUser = null;
        let currentToken = null;

        async function login(event) {
            if (event) event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch(API_BASE + '/simple/simple-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    currentUser = data.user;
                    currentToken = 'simple-token';
                    localStorage.setItem('token', 'simple-token');
                    localStorage.setItem('user', JSON.stringify(data.user));
                    showDashboard();
                    loadDashboardData();
                } else {
                    alert('Σφάλμα σύνδεσης: ' + (data.error || 'Άγνωστο σφάλμα'));
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Σφάλμα σύνδεσης με τον server');
            }
        }

        async function register() {
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            if (password !== confirmPassword) {
                alert('Οι κωδικοί δεν ταιριάζουν');
                return;
            }
            try {
                const response = await fetch(API_BASE + '/simple/simple-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, confirmPassword })
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    alert('Εγγραφή επιτυχής!');
                    bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
                    document.getElementById('registerForm').reset();
                } else {
                    alert('Σφάλμα εγγραφής: ' + (data.error || 'Άγνωστο σφάλμα'));
                }
            } catch (error) {
                console.error('Register error:', error);
                alert('Σφάλμα σύνδεσης με τον server');
            }
        }

        function logout() {
            currentUser = null;
            currentToken = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showLogin();
        }

        function showLogin() {
            document.getElementById('loginContainer').style.display = 'block';
            document.getElementById('dashboardContainer').style.display = 'none';
        }

        function showDashboard() {
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('dashboardContainer').style.display = 'block';
            showSection('dashboard');
        }

        function showRegister() {
            const modal = new bootstrap.Modal(document.getElementById('registerModal'));
            modal.show();
        }

        function showSection(sectionName) {
            const sections = ['dashboard', 'companies'];
            sections.forEach(section => {
                document.getElementById(section + 'Section').style.display = 'none';
            });
            document.getElementById(sectionName + 'Section').style.display = 'block';
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            event?.target.classList.add('active');
        }

        async function loadDashboardData() {
            try {
                const response = await fetch(API_BASE + '/simple/companies');
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('companiesCount').textContent = data.companies?.length || 0;
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            if (savedToken && savedUser) {
                currentToken = savedToken;
                currentUser = JSON.parse(savedUser);
                showDashboard();
                loadDashboardData();
            } else {
                showLogin();
            }
            document.getElementById('loginForm').addEventListener('submit', login);
        });
    </script>
</body>
</html>
  `);
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