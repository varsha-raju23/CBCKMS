require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  }
});

// CORS
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://localhost:5173'
    ].filter(Boolean);

    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.azurewebsites.net')
    ) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Frontend Static Files - Azure safe
const possibleFrontendPaths = [
  path.join(__dirname, 'frontend'),
  path.join(process.cwd(), 'frontend'),
  path.join(process.cwd(), 'tkms', 'backend', 'frontend')
];

const frontendPath = possibleFrontendPaths.find(p =>
  fs.existsSync(path.join(p, 'index.html'))
) || path.join(__dirname, 'frontend');

console.log('Frontend path:', frontendPath);

app.use(express.static(frontendPath));
app.use('/pages', express.static(path.join(frontendPath, 'pages')));
app.use('/css', express.static(path.join(frontendPath, 'css')));
app.use('/js', express.static(path.join(frontendPath, 'js')));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));

// Also support old wrong URL
app.use('/tkms/frontend', express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/pages/login.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages', 'login.html'));
});

app.get('/tkms/frontend/pages/login.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages', 'login.html'));
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TunnelKMS API is running successfully'
  });
});

// Azure Migration Routes
app.use('/api/approval', require('./routes/approval.routes'));
app.use('/api/account', require('./routes/accountRequest.routes'));
app.use('/api/azure-auth', authLimiter, require('./routes/azureAuth.routes'));
app.use('/api/auth', require('./routes/azureAuth.routes'));

app.use('/api/azure-documents', require('./routes/azureDocument.routes'));
app.use('/api/documents', require('./routes/azureDocument.routes'));

app.get(
  '/api/users/my-documents',
  require('./middleware/azureAuth.middleware').protectAzure,
  require('./controllers/azureDocument.controller').getAzureDocuments
);

app.get('/api/notifications', (req, res) => {
  res.json({
    success: true,
    notifications: []
  });
});

app.use('/api/azure-projects', require('./routes/azureProject.routes'));
app.use('/api/azure-progress', require('./routes/azureProgress.routes'));
app.use('/api/azure-monitoring', require('./routes/azureMonitoring.routes'));
app.use('/api/azure-analytics', require('./routes/azureAnalytics.routes'));
app.use('/api/azure-admin', require('./routes/azureAdmin.routes'));
app.use('/api/admin', require('./routes/azureAdmin.routes'));


app.get('/api/sql-health', async (req, res) => {
  try {
    const { connectAzureSQL } = require('./config/azureSql');
    const pool = await connectAzureSQL();
    const result = await pool.request().query('SELECT DB_NAME() AS databaseName, SYSTEM_USER AS loginUser');
    res.json({
      success: true,
      message: 'Azure SQL connected',
      database: result.recordset[0].databaseName,
      user: result.recordset[0].loginUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.use('/api/ai', require('./routes/ai'));
app.use('/api/assistant', require('./routes/ai'));
app.use('/api/ai-assistant', require('./routes/ai'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TunnelKMS API is running',
    timestamp: new Date()
  });
});
app.get('/api/admin/stats', require('./middleware/azureAuth.middleware').protectAzure, async (req, res) => {
  res.json({
    success: true,
    stats: {
      totalUsers: 1,
      totalDocuments: 0,
      pendingApprovals: 0,
      activeProjects: 1,
      recentUsers: [],
      recentDocs: [],
      monthlyUploads: []
    }
  });
});
// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`TunnelKMS Server running on port ${PORT}`);
});




