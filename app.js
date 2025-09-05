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
                    <a class="nav-link" href="#" onclick="showSection('invoices')"><i class="bi bi-receipt me-2"></i>Τιμολόγια</a>
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
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <i class="bi bi-receipt text-success fs-1"></i>
                                    <div class="stats-number" id="invoicesCount">0</div>
                                    <div class="text-muted">Τιμολόγια</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <i class="bi bi-currency-euro text-warning fs-1"></i>
                                    <div class="stats-number" id="totalRevenue">€0</div>
                                    <div class="text-muted">Συνολικά Έσοδα</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <i class="bi bi-clock text-info fs-1"></i>
                                    <div class="stats-number" id="pendingInvoices">0</div>
                                    <div class="text-muted">Εκκρεμείς</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="companiesSection" style="display: none;">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="bi bi-building me-2"></i>Καταστήματα Εμπορίου</h2>
                        <button class="btn btn-primary" onclick="showAddCompanyModal()">
                            <i class="bi bi-plus me-2"></i>Νέο Κατάστημα
                        </button>
                    </div>
                    
                    <!-- Search and Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control" id="companySearch" 
                                               placeholder="Αναζήτηση καταστήματος (όνομα, ΑΦΜ, email)">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="businessTypeFilter">
                                        <option value="">Όλοι οι τύποι</option>
                                        <option value="ΕΠΕ">ΕΠΕ</option>
                                        <option value="ΑΕ">ΑΕ</option>
                                        <option value="ΙΚΕ">ΙΚΕ</option>
                                        <option value="ΟΕ">ΟΕ</option>
                                        <option value="Ατομική">Ατομική</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <button class="btn btn-outline-primary" onclick="refreshCompanies()">
                                        <i class="bi bi-arrow-clockwise me-2"></i>Ανανέωση
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Companies Table -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Λίστα Καταστημάτων</h5>
                            <small class="text-muted" id="companiesCount">0 καταστήματα</small>
                        </div>
                        <div class="card-body">
                            <div id="companiesLoading" style="display: none;" class="text-center p-4">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Φόρτωση...</span>
                                </div>
                            </div>
                            
                            <div class="table-responsive">
                                <table class="table table-hover" id="companiesTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Όνομα Καταστήματος</th>
                                            <th>ΑΦΜ</th>
                                            <th>Τύπος</th>
                                            <th>Email</th>
                                            <th>Τηλέφωνο</th>
                                            <th>Πόλη</th>
                                            <th>Κατάσταση</th>
                                            <th>Ενέργειες</th>
                                        </tr>
                                    </thead>
                                    <tbody id="companiesTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center text-muted p-4">
                                                Δεν βρέθηκαν καταστήματα
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Invoices Section -->
                <div id="invoicesSection" style="display: none;">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="bi bi-receipt me-2"></i>Τιμολόγια</h2>
                        <button class="btn btn-primary" onclick="showAddInvoiceModal()">
                            <i class="bi bi-plus me-2"></i>Νέο Τιμολόγιο
                        </button>
                    </div>
                    
                    <!-- Search and Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control" id="invoiceSearch" 
                                               placeholder="Αναζήτηση τιμολογίου">
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="invoiceStatusFilter">
                                        <option value="">Όλες οι καταστάσεις</option>
                                        <option value="draft">Πρόχειρο</option>
                                        <option value="sent">Απεσταλμένο</option>
                                        <option value="paid">Πληρωμένο</option>
                                        <option value="overdue">Ληξιπρόθεσμο</option>
                                        <option value="cancelled">Ακυρωμένο</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="invoiceCompanyFilter">
                                        <option value="">Όλες οι εταιρείες</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <button class="btn btn-outline-primary" onclick="refreshInvoices()">
                                        <i class="bi bi-arrow-clockwise me-2"></i>Ανανέωση
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Invoices Table -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Λίστα Τιμολογίων</h5>
                            <small class="text-muted" id="invoicesCountText">0 τιμολόγια</small>
                        </div>
                        <div class="card-body">
                            <div id="invoicesLoading" style="display: none;" class="text-center p-4">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Φόρτωση...</span>
                                </div>
                            </div>
                            
                            <div class="table-responsive">
                                <table class="table table-hover" id="invoicesTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Αριθμός</th>
                                            <th>Εταιρεία</th>
                                            <th>Ημερομηνία</th>
                                            <th>Λήξη</th>
                                            <th>Σύνολο</th>
                                            <th>ΦΠΑ</th>
                                            <th>Κατάσταση</th>
                                            <th>Ενέργειες</th>
                                        </tr>
                                    </thead>
                                    <tbody id="invoicesTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center text-muted p-4">
                                                Δεν βρέθηκαν τιμολόγια
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
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

    <!-- Company Modal -->
    <div class="modal fade" id="companyModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="companyModalTitle">Νέο Κατάστημα</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="companyForm">
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="border-bottom pb-2 mb-3">Βασικά Στοιχεία</h6>
                                <div class="mb-3">
                                    <label for="companyName" class="form-label">Όνομα Καταστήματος *</label>
                                    <input type="text" class="form-control" id="companyName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="companyLegalName" class="form-label">Επίσημη Επωνυμία</label>
                                    <input type="text" class="form-control" id="companyLegalName">
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="companyAFM" class="form-label">ΑΦΜ *</label>
                                            <input type="text" class="form-control" id="companyAFM" required maxlength="9" pattern="\\d{9}">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="companyDOY" class="form-label">ΔΟΥ</label>
                                            <input type="text" class="form-control" id="companyDOY">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="companyBusinessType" class="form-label">Τύπος</label>
                                            <select class="form-select" id="companyBusinessType">
                                                <option value="Ατομική">Ατομική</option>
                                                <option value="ΕΠΕ">ΕΠΕ</option>
                                                <option value="ΑΕ">ΑΕ</option>
                                                <option value="ΙΚΕ">ΙΚΕ</option>
                                                <option value="ΟΕ">ΟΕ</option>
                                                <option value="ΕΕ">ΕΕ</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="companyIndustry" class="form-label">Κλάδος</label>
                                            <input type="text" class="form-control" id="companyIndustry" value="Εμπόριο">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h6 class="border-bottom pb-2 mb-3">Στοιχεία Επικοινωνίας</h6>
                                <div class="mb-3">
                                    <label for="companyEmail" class="form-label">Email *</label>
                                    <input type="email" class="form-control" id="companyEmail" required>
                                </div>
                                <div class="mb-3">
                                    <label for="companyPhone" class="form-label">Τηλέφωνο</label>
                                    <input type="tel" class="form-control" id="companyPhone">
                                </div>
                                <h6 class="border-bottom pb-2 mb-3 mt-4">Διεύθυνση</h6>
                                <div class="row">
                                    <div class="col-md-8">
                                        <div class="mb-3">
                                            <label for="companyStreet" class="form-label">Οδός</label>
                                            <input type="text" class="form-control" id="companyStreet">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label for="companyStreetNumber" class="form-label">Αριθμός</label>
                                            <input type="text" class="form-control" id="companyStreetNumber">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="companyCity" class="form-label">Πόλη</label>
                                            <input type="text" class="form-control" id="companyCity">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="companyPostalCode" class="form-label">Τ.Κ.</label>
                                            <input type="text" class="form-control" id="companyPostalCode" maxlength="5">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Άκυρο</button>
                    <button type="button" class="btn btn-primary" onclick="saveCompany()" id="saveCompanyBtn">
                        <i class="bi bi-check me-2"></i>Αποθήκευση
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Invoice Modal -->
    <div class="modal fade" id="invoiceModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="invoiceModalTitle">Νέο Τιμολόγιο</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="invoiceForm">
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="border-bottom pb-2 mb-3">Βασικά Στοιχεία</h6>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="invoiceCompany" class="form-label">Εταιρεία *</label>
                                            <select class="form-select" id="invoiceCompany" required>
                                                <option value="">Επιλέξτε εταιρεία</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="invoiceType" class="form-label">Τύπος</label>
                                            <select class="form-select" id="invoiceType">
                                                <option value="invoice">Τιμολόγιο</option>
                                                <option value="credit_note">Πιστωτικό</option>
                                                <option value="debit_note">Χρεωστικό</option>
                                                <option value="receipt">Απόδειξη</option>
                                                <option value="proforma">Προφορμά</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="invoiceIssueDate" class="form-label">Ημερομηνία Έκδοσης *</label>
                                            <input type="date" class="form-control" id="invoiceIssueDate" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="invoiceDueDate" class="form-label">Ημερομηνία Λήξης</label>
                                            <input type="date" class="form-control" id="invoiceDueDate">
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="invoicePaymentMethod" class="form-label">Τρόπος Πληρωμής</label>
                                    <select class="form-select" id="invoicePaymentMethod">
                                        <option value="">Επιλέξτε τρόπο</option>
                                        <option value="cash">Μετρητά</option>
                                        <option value="card">Κάρτα</option>
                                        <option value="bank_transfer">Τραπεζική Μεταφορά</option>
                                        <option value="check">Επιταγή</option>
                                        <option value="other">Άλλο</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="invoiceNotes" class="form-label">Σημειώσεις</label>
                                    <textarea class="form-control" id="invoiceNotes" rows="3"></textarea>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <h6 class="border-bottom pb-2 mb-3">Προϊόντα/Υπηρεσίες</h6>
                                <div id="invoiceItems">
                                    <div class="item-row border p-3 mb-3 rounded">
                                        <div class="row">
                                            <div class="col-md-12">
                                                <div class="mb-2">
                                                    <label class="form-label">Περιγραφή *</label>
                                                    <input type="text" class="form-control item-description" required>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-3">
                                                <div class="mb-2">
                                                    <label class="form-label">Ποσότητα *</label>
                                                    <input type="number" class="form-control item-quantity" min="0.01" step="0.01" value="1" required>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="mb-2">
                                                    <label class="form-label">Τιμή *</label>
                                                    <input type="number" class="form-control item-price" min="0" step="0.01" required>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="mb-2">
                                                    <label class="form-label">ΦΠΑ</label>
                                                    <select class="form-select item-vat">
                                                        <option value="normal">24%</option>
                                                        <option value="reduced">13%</option>
                                                        <option value="super_reduced">6%</option>
                                                        <option value="exempt">0%</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="mb-2">
                                                    <label class="form-label">Σύνολο</label>
                                                    <input type="text" class="form-control item-total" readonly>
                                                </div>
                                            </div>
                                        </div>
                                        <button type="button" class="btn btn-sm btn-outline-danger remove-item">
                                            <i class="bi bi-trash"></i> Αφαίρεση
                                        </button>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-outline-primary btn-sm mb-3" onclick="addInvoiceItem()">
                                    <i class="bi bi-plus"></i> Προσθήκη Προϊόντος
                                </button>
                                
                                <!-- Totals -->
                                <div class="border-top pt-3">
                                    <div class="row">
                                        <div class="col-6"><strong>Υποσύνολο:</strong></div>
                                        <div class="col-6 text-end" id="invoiceSubtotal">€0.00</div>
                                    </div>
                                    <div class="row">
                                        <div class="col-6"><strong>ΦΠΑ:</strong></div>
                                        <div class="col-6 text-end" id="invoiceVat">€0.00</div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-6"><strong>ΣΥΝΟΛΟ:</strong></div>
                                        <div class="col-6 text-end"><strong id="invoiceTotal">€0.00</strong></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Άκυρο</button>
                    <button type="button" class="btn btn-primary" onclick="saveInvoice()" id="saveInvoiceBtn">
                        <i class="bi bi-check me-2"></i>Αποθήκευση
                    </button>
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
            const sections = ['dashboard', 'companies', 'invoices'];
            sections.forEach(section => {
                document.getElementById(section + 'Section').style.display = 'none';
            });
            document.getElementById(sectionName + 'Section').style.display = 'block';
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            event?.target.classList.add('active');
            
            // Load section specific data
            if (sectionName === 'companies') {
                loadCompanies();
            } else if (sectionName === 'invoices') {
                loadInvoices();
            }
        }

        async function loadDashboardData() {
            try {
                // Load companies count
                const companiesResponse = await fetch(API_BASE + '/simple/companies');
                if (companiesResponse.ok) {
                    const companiesData = await companiesResponse.json();
                    document.getElementById('companiesCount').textContent = companiesData.data?.length || 0;
                }

                // Load invoices count  
                const invoicesResponse = await fetch('/api/invoices', {
                    headers: {
                        'Authorization': 'Bearer ' + currentToken
                    }
                });
                if (invoicesResponse.ok) {
                    const invoicesData = await invoicesResponse.json();
                    document.getElementById('invoicesCount').textContent = invoicesData.length || 0;
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }

        // Company Management Functions
        let currentEditingCompanyId = null;

        async function loadCompanies() {
            showCompaniesLoading(true);
            try {
                const response = await fetch(API_BASE + '/simple/companies');
                if (response.ok) {
                    const data = await response.json();
                    displayCompanies(data.data || []);
                    updateCompaniesCount(data.data?.length || 0);
                } else {
                    console.error('Failed to load companies');
                    showError('Αποτυχία φόρτωσης καταστημάτων');
                }
            } catch (error) {
                console.error('Error loading companies:', error);
                showError('Σφάλμα δικτύου: ' + error.message);
            }
            showCompaniesLoading(false);
        }

        function displayCompanies(companies) {
            const tbody = document.getElementById('companiesTableBody');
            
            if (!companies || companies.length === 0) {
                tbody.innerHTML = 
                    '<tr>' +
                        '<td colspan="8" class="text-center text-muted p-4">' +
                            '<i class="bi bi-building fs-1 d-block mb-2"></i>' +
                            'Δεν υπάρχουν καταστήματα' +
                        '</td>' +
                    '</tr>';
                return;
            }

            tbody.innerHTML = companies.map(company => 
                '<tr>' +
                    '<td>' +
                        '<strong>' + escapeHtml(company.name) + '</strong>' +
                        (company.legalName && company.legalName !== company.name ? 
                            '<br><small class="text-muted">' + escapeHtml(company.legalName) + '</small>' : '') +
                    '</td>' +
                    '<td><code>' + (company.afm || '-') + '</code></td>' +
                    '<td><span class="badge bg-light text-dark">' + (company.businessType || 'Ατομική') + '</span></td>' +
                    '<td>' +
                        (company.email ? '<a href="mailto:' + company.email + '">' + escapeHtml(company.email) + '</a>' : '-') +
                    '</td>' +
                    '<td>' +
                        (company.phone ? '<a href="tel:' + company.phone + '">' + escapeHtml(company.phone) + '</a>' : '-') +
                    '</td>' +
                    '<td>' + (escapeHtml(company.city) || '-') + '</td>' +
                    '<td>' +
                        '<span class="badge ' + (company.isActive ? 'bg-success' : 'bg-secondary') + '">' +
                            (company.isActive ? 'Ενεργό' : 'Ανενεργό') +
                        '</span>' +
                    '</td>' +
                    '<td>' +
                        '<div class="btn-group btn-group-sm">' +
                            '<button class="btn btn-outline-primary" onclick="editCompany(\'' + company.id + '\')" ' +
                                    'title="Επεξεργασία">' +
                                '<i class="bi bi-pencil"></i>' +
                            '</button>' +
                            '<button class="btn btn-outline-info" onclick="viewCompany(\'' + company.id + '\')" ' +
                                    'title="Προβολή">' +
                                '<i class="bi bi-eye"></i>' +
                            '</button>' +
                            '<button class="btn btn-outline-danger" onclick="deleteCompany(\'' + company.id + '\', \'' + escapeHtml(company.name) + '\')" ' +
                                    'title="Διαγραφή">' +
                                '<i class="bi bi-trash"></i>' +
                            '</button>' +
                        '</div>' +
                    '</td>' +
                '</tr>'
            ).join('');
        }

        function showAddCompanyModal() {
            currentEditingCompanyId = null;
            document.getElementById('companyModalTitle').textContent = 'Νέο Κατάστημα';
            document.getElementById('companyForm').reset();
            document.getElementById('companyIndustry').value = 'Εμπόριο';
            
            const modal = new bootstrap.Modal(document.getElementById('companyModal'));
            modal.show();
        }

        async function editCompany(companyId) {
            try {
                // For simplicity, we'll reload all companies and find the one to edit
                const response = await fetch(API_BASE + '/simple/companies');
                if (response.ok) {
                    const data = await response.json();
                    const company = data.data?.find(c => c.id === companyId);
                    
                    if (company) {
                        currentEditingCompanyId = companyId;
                        document.getElementById('companyModalTitle').textContent = 'Επεξεργασία Καταστήματος';
                        
                        // Fill form
                        document.getElementById('companyName').value = company.name || '';
                        document.getElementById('companyLegalName').value = company.legalName || '';
                        document.getElementById('companyAFM').value = company.afm || '';
                        document.getElementById('companyDOY').value = company.doy || '';
                        document.getElementById('companyEmail').value = company.email || '';
                        document.getElementById('companyPhone').value = company.phone || '';
                        document.getElementById('companyStreet').value = company.street || '';
                        document.getElementById('companyStreetNumber').value = company.streetNumber || '';
                        document.getElementById('companyCity').value = company.city || '';
                        document.getElementById('companyPostalCode').value = company.postalCode || '';
                        document.getElementById('companyBusinessType').value = company.businessType || 'Ατομική';
                        document.getElementById('companyIndustry').value = company.industry || 'Εμπόριο';
                        
                        const modal = new bootstrap.Modal(document.getElementById('companyModal'));
                        modal.show();
                    }
                }
            } catch (error) {
                console.error('Error loading company for edit:', error);
                showError('Σφάλμα φόρτωσης καταστήματος');
            }
        }

        async function saveCompany() {
            const btn = document.getElementById('saveCompanyBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Αποθήκευση...';
            btn.disabled = true;

            try {
                const formData = {
                    name: document.getElementById('companyName').value.trim(),
                    legalName: document.getElementById('companyLegalName').value.trim(),
                    afm: document.getElementById('companyAFM').value.trim(),
                    doy: document.getElementById('companyDOY').value.trim(),
                    email: document.getElementById('companyEmail').value.trim(),
                    phone: document.getElementById('companyPhone').value.trim(),
                    street: document.getElementById('companyStreet').value.trim(),
                    streetNumber: document.getElementById('companyStreetNumber').value.trim(),
                    city: document.getElementById('companyCity').value.trim(),
                    postalCode: document.getElementById('companyPostalCode').value.trim(),
                    businessType: document.getElementById('companyBusinessType').value,
                    industry: document.getElementById('companyIndustry').value.trim()
                };

                const url = currentEditingCompanyId ? 
                    API_BASE + '/simple/companies/' + currentEditingCompanyId :
                    API_BASE + '/simple/companies';
                const method = currentEditingCompanyId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                
                if (response.ok && data.success) {
                    showSuccess(currentEditingCompanyId ? 'Το κατάστημα ενημερώθηκε επιτυχώς!' : 'Το κατάστημα δημιουργήθηκε επιτυχώς!');
                    
                    // Close modal and refresh list
                    bootstrap.Modal.getInstance(document.getElementById('companyModal')).hide();
                    await loadCompanies();
                    await loadDashboardData(); // Update dashboard stats
                } else {
                    showError(data.error || 'Σφάλμα αποθήκευσης');
                }
            } catch (error) {
                console.error('Error saving company:', error);
                showError('Σφάλμα δικτύου: ' + error.message);
            }

            btn.innerHTML = originalText;
            btn.disabled = false;
        }

        async function deleteCompany(companyId, companyName) {
            if (!confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε το κατάστημα "' + companyName + '";\\n\\nΑυτή η ενέργεια δεν μπορεί να αναιρεθεί.')) {
                return;
            }

            try {
                const response = await fetch(API_BASE + '/simple/companies/' + companyId, {
                    method: 'DELETE'
                });

                const data = await response.json();
                
                if (response.ok && data.success) {
                    showSuccess('Το κατάστημα διαγράφηκε επιτυχώς!');
                    await loadCompanies();
                    await loadDashboardData();
                } else {
                    showError(data.error || 'Σφάλμα διαγραφής');
                }
            } catch (error) {
                console.error('Error deleting company:', error);
                showError('Σφάλμα δικτύου: ' + error.message);
            }
        }

        function viewCompany(companyId) {
            alert('Λειτουργία προβολής λεπτομερειών σε ανάπτυξη για κατάστημα: ' + companyId);
        }

        function refreshCompanies() {
            loadCompanies();
        }

        function showCompaniesLoading(show) {
            document.getElementById('companiesLoading').style.display = show ? 'block' : 'none';
        }

        function updateCompaniesCount(count) {
            document.getElementById('companiesCount').textContent = count + ' καταστήματα';
        }

        // ======================
        // Invoice Management Functions
        // ======================
        
        async function loadInvoices() {
            try {
                showInvoicesLoading(true);
                
                const response = await fetch('/api/invoices', {
                    headers: {
                        'Authorization': 'Bearer ' + currentToken
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Αποτυχία φόρτωσης τιμολογίων');
                }
                
                const invoices = await response.json();
                displayInvoices(invoices);
                updateInvoicesCount(invoices.length);
                
            } catch (error) {
                console.error('Error loading invoices:', error);
                showError('Σφάλμα δικτύου: ' + error.message);
            } finally {
                showInvoicesLoading(false);
            }
        }

        function displayInvoices(invoices) {
            const tbody = document.getElementById('invoicesTableBody');
            
            if (!invoices || invoices.length === 0) {
                tbody.innerHTML = 
                    '<tr>' +
                        '<td colspan="8" class="text-center text-muted p-4">' +
                            'Δεν βρέθηκαν τιμολόγια' +
                        '</td>' +
                    '</tr>';
                return;
            }

            tbody.innerHTML = invoices.map(invoice => 
                '<tr>' +
                    '<td><strong>' + escapeHtml(invoice.invoiceNumber) + '</strong></td>' +
                    '<td>' + escapeHtml(invoice.companyName || '-') + '</td>' +
                    '<td>' + formatDate(invoice.issueDate) + '</td>' +
                    '<td>' + (formatDate(invoice.dueDate) || '-') + '</td>' +
                    '<td>€' + formatCurrency(invoice.total) + '</td>' +
                    '<td>€' + formatCurrency(invoice.vatAmount) + '</td>' +
                    '<td>' +
                        '<span class="badge bg-' + getStatusColor(invoice.status) + '">' +
                            getStatusText(invoice.status) +
                        '</span>' +
                    '</td>' +
                    '<td>' +
                        '<div class="btn-group btn-group-sm">' +
                            '<button class="btn btn-outline-primary" onclick="viewInvoice(\'' + invoice.id + '\')" title="Προβολή">' +
                                '<i class="bi bi-eye"></i>' +
                            '</button>' +
                            '<button class="btn btn-outline-info" onclick="editInvoice(\'' + invoice.id + '\')" title="Επεξεργασία">' +
                                '<i class="bi bi-pencil"></i>' +
                            '</button>' +
                            '<button class="btn btn-outline-danger" onclick="deleteInvoice(\'' + invoice.id + '\', \'' + escapeHtml(invoice.invoiceNumber) + '\')" title="Διαγραφή">' +
                                '<i class="bi bi-trash"></i>' +
                            '</button>' +
                        '</div>' +
                    '</td>' +
                '</tr>'
            ).join('');
        }

        async function showAddInvoiceModal() {
            // Load companies first
            await loadCompaniesForSelect();
            
            document.getElementById('invoiceModalTitle').textContent = 'Νέο Τιμολόγιο';
            document.getElementById('invoiceForm').reset();
            document.getElementById('invoiceIssueDate').value = new Date().toISOString().split('T')[0];
            
            // Reset items
            resetInvoiceItems();
            
            const modal = new bootstrap.Modal(document.getElementById('invoiceModal'));
            modal.show();
        }

        async function loadCompaniesForSelect() {
            try {
                const response = await fetch('/api/companies', {
                    headers: {
                        'Authorization': 'Bearer ' + currentToken
                    }
                });
                
                if (!response.ok) throw new Error('Αποτυχία φόρτωσης εταιρειών');
                
                const companies = await response.json();
                const companySelects = [
                    document.getElementById('invoiceCompany'),
                    document.getElementById('invoiceCompanyFilter')
                ];
                
                companySelects.forEach(select => {
                    if (select) {
                        const currentValue = select.value;
                        select.innerHTML = '<option value="">Επιλέξτε εταιρεία</option>';
                        companies.forEach(company => {
                            select.innerHTML += '<option value="' + company.id + '">' + escapeHtml(company.name) + '</option>';
                        });
                        if (currentValue) select.value = currentValue;
                    }
                });
                
            } catch (error) {
                console.error('Error loading companies for select:', error);
            }
        }

        function addInvoiceItem() {
            const itemsContainer = document.getElementById('invoiceItems');
            const itemIndex = itemsContainer.children.length;
            
            const itemHTML = 
                '<div class="item-row border p-3 mb-3 rounded">' +
                    '<div class="row">' +
                        '<div class="col-md-12">' +
                            '<div class="row">' +
                                '<div class="col-md-6">' +
                                    '<label class="form-label">Περιγραφή *</label>' +
                                    '<input type="text" class="form-control item-description" required ' +
                                           'placeholder="π.χ. Προϊόν A" onchange="calculateInvoiceTotals()">' +
                                '</div>' +
                                '<div class="col-md-2">' +
                                    '<label class="form-label">Ποσότητα *</label>' +
                                    '<input type="number" class="form-control item-quantity" value="1" min="0" step="0.01" ' +
                                           'required onchange="calculateInvoiceTotals()">' +
                                '</div>' +
                                '<div class="col-md-2">' +
                                    '<label class="form-label">Τιμή *</label>' +
                                    '<input type="number" class="form-control item-price" value="0" min="0" step="0.01" ' +
                                           'required onchange="calculateInvoiceTotals()">' +
                                '</div>' +
                                '<div class="col-md-2">' +
                                    '<label class="form-label">ΦΠΑ %</label>' +
                                    '<select class="form-select item-vat" onchange="calculateInvoiceTotals()">' +
                                        '<option value="24">24%</option>' +
                                        '<option value="13">13%</option>' +
                                        '<option value="6">6%</option>' +
                                        '<option value="0">0%</option>' +
                                    '</select>' +
                                '</div>' +
                            '</div>' +
                            '<div class="row mt-2">' +
                                '<div class="col-md-10">' +
                                    '<small class="text-muted">Σύνολο γραμμής: €<span class="item-total">0.00</span></small>' +
                                '</div>' +
                                '<div class="col-md-2 text-end">' +
                                    '<button type="button" class="btn btn-sm btn-outline-danger" onclick="removeInvoiceItem(this)">' +
                                        '<i class="bi bi-trash"></i>' +
                                    '</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            
            itemsContainer.insertAdjacentHTML('beforeend', itemHTML);
            calculateInvoiceTotals();
        }

        function removeInvoiceItem(button) {
            const itemRow = button.closest('.item-row');
            itemRow.remove();
            calculateInvoiceTotals();
        }

        function resetInvoiceItems() {
            const itemsContainer = document.getElementById('invoiceItems');
            itemsContainer.innerHTML = '';
            addInvoiceItem(); // Add first item
        }

        function calculateInvoiceTotals() {
            const items = document.querySelectorAll('.item-row');
            let subtotal = 0;
            let totalVat = 0;
            
            items.forEach(item => {
                const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
                const price = parseFloat(item.querySelector('.item-price').value) || 0;
                const vatRate = parseFloat(item.querySelector('.item-vat').value) || 0;
                
                const itemSubtotal = quantity * price;
                const itemVat = itemSubtotal * (vatRate / 100);
                const itemTotal = itemSubtotal + itemVat;
                
                subtotal += itemSubtotal;
                totalVat += itemVat;
                
                item.querySelector('.item-total').textContent = formatCurrency(itemTotal);
            });
            
            const total = subtotal + totalVat;
            
            document.getElementById('invoiceSubtotal').textContent = '€' + formatCurrency(subtotal);
            document.getElementById('invoiceVat').textContent = '€' + formatCurrency(totalVat);
            document.getElementById('invoiceTotal').textContent = '€' + formatCurrency(total);
        }

        async function saveInvoice() {
            try {
                const form = document.getElementById('invoiceForm');
                const formData = new FormData(form);
                
                // Collect items data
                const items = [];
                document.querySelectorAll('.item-row').forEach(itemRow => {
                    const description = itemRow.querySelector('.item-description').value;
                    const quantity = parseFloat(itemRow.querySelector('.item-quantity').value);
                    const price = parseFloat(itemRow.querySelector('.item-price').value);
                    const vatRate = parseFloat(itemRow.querySelector('.item-vat').value);
                    
                    if (description && quantity > 0 && price >= 0) {
                        items.push({
                            description,
                            quantity,
                            price,
                            vatRate,
                            subtotal: quantity * price,
                            vatAmount: (quantity * price) * (vatRate / 100),
                            total: (quantity * price) * (1 + vatRate / 100)
                        });
                    }
                });
                
                if (items.length === 0) {
                    showError('Προσθέστε τουλάχιστον ένα προϊόν στο τιμολόγιο');
                    return;
                }
                
                // Calculate totals
                const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
                const vatAmount = items.reduce((sum, item) => sum + item.vatAmount, 0);
                const total = subtotal + vatAmount;
                
                const invoiceData = {
                    companyId: document.getElementById('invoiceCompany').value,
                    type: document.getElementById('invoiceType').value,
                    issueDate: document.getElementById('invoiceIssueDate').value,
                    dueDate: document.getElementById('invoiceDueDate').value,
                    paymentMethod: document.getElementById('invoicePaymentMethod').value,
                    notes: document.getElementById('invoiceNotes').value,
                    items: items,
                    subtotal: subtotal,
                    vatAmount: vatAmount,
                    total: total,
                    status: 'draft'
                };
                
                const response = await fetch('/api/invoices', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + currentToken
                    },
                    body: JSON.stringify(invoiceData)
                });
                
                if (!response.ok) {
                    throw new Error('Αποτυχία αποθήκευσης τιμολογίου');
                }
                
                const savedInvoice = await response.json();
                showSuccess('Το τιμολόγιο αποθηκεύτηκε επιτυχώς!');
                
                // Close modal and refresh
                const modal = bootstrap.Modal.getInstance(document.getElementById('invoiceModal'));
                modal.hide();
                loadInvoices();
                
            } catch (error) {
                console.error('Error saving invoice:', error);
                showError('Σφάλμα αποθήκευσης: ' + error.message);
            }
        }

        async function deleteInvoice(invoiceId, invoiceNumber) {
            if (!confirm('Θέλετε να διαγράψετε το τιμολόγιο "' + invoiceNumber + '";')) {
                return;
            }
            
            try {
                const response = await fetch('/api/invoices/' + invoiceId, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': 'Bearer ' + currentToken
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Αποτυχία διαγραφής τιμολογίου');
                }
                
                showSuccess('Το τιμολόγιο διαγράφηκε επιτυχώς!');
                loadInvoices();
                
            } catch (error) {
                console.error('Error deleting invoice:', error);
                showError('Σφάλμα δικτύου: ' + error.message);
            }
        }

        function editInvoice(invoiceId) {
            alert('Λειτουργία επεξεργασίας τιμολογίου σε ανάπτυξη για ID: ' + invoiceId);
        }

        function viewInvoice(invoiceId) {
            alert('Λειτουργία προβολής τιμολογίου σε ανάπτυξη για ID: ' + invoiceId);
        }

        function showInvoicesLoading(show) {
            document.getElementById('invoicesLoading').style.display = show ? 'block' : 'none';
        }

        function updateInvoicesCount(count) {
            document.getElementById('invoicesCountText').textContent = count + ' τιμολόγια';
            document.getElementById('invoicesCount').textContent = count;
        }

        // Utility Functions
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('el-GR');
        }

        function formatCurrency(amount) {
            if (!amount) return '0.00';
            return parseFloat(amount).toFixed(2);
        }

        function getStatusColor(status) {
            switch (status) {
                case 'draft': return 'secondary';
                case 'sent': return 'primary';
                case 'paid': return 'success';
                case 'overdue': return 'danger';
                case 'cancelled': return 'dark';
                default: return 'light';
            }
        }

        function getStatusText(status) {
            switch (status) {
                case 'draft': return 'Πρόχειρο';
                case 'sent': return 'Απεσταλμένο';
                case 'paid': return 'Πληρωμένο';
                case 'overdue': return 'Ληξιπρόθεσμο';
                case 'cancelled': return 'Ακυρωμένο';
                default: return status;
            }
        }

        function showSuccess(message) {
            // Simple alert for now - could be replaced with toast notifications
            alert('✅ ' + message);
        }

        function showError(message) {
            alert('❌ ' + message);
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
    message: 'Cannot ' + req.method + ' ' + req.path,
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