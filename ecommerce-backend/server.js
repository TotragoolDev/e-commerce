require ('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// เพิ่มหลัง require statements
const { prisma, connectDatabase, getDatabaseStats } = require('./src/config/database');

const app = express();

// 1. Security Headers (Helmet)

// ✅ ถูกต้อง
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS Comfiguration
const corsOptions = {
  origin: function (origin, callback) {
    const currentEnv = process.env.NODE_ENV || 'development';
    console.log(`CORS Check - Origin: ${origin}, Environment: ${currentEnv}`);
    
    // Handle requests with no origin (Postman, mobile apps, server-to-server)
    if (!origin) {
      if (currentEnv === 'development') {
        console.log(`${currentEnv}: Allowing request without origin (for API testing)`);
        return callback(null, true);
      } else if (currentEnv === 'production') {
        console.log('Production: Blocking request without origin (security)');
        return callback(new Error('Origin header required in production'), false);
      } else {
        console.log(`Unknown environment (${currentEnv}): Blocking request without origin`);
        return callback(new Error('Origin header required'), false);
      }
    }
    
    // Define allowed origins based on environment
    let allowedOrigins = [];
    
    if (currentEnv === 'development') {
      allowedOrigins = [
        'http://localhost:5173',  // Vite dev server
        'http://127.0.0.1:5173',  // Vite alternative
        'http://localhost:4173',  // Vite preview mode (npm run preview)
      ];
    } else if (currentEnv === 'production') {
      allowedOrigins = [
        process.env.FRONTEND_URL || 'https://mystore.com',
        'https://www.mystore.com',
        // Add your production domains here
      ];
    }
    
    console.log(`Allowed origins for ${currentEnv}:`, allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      console.log(`Origin allowed: ${origin}`);
      callback(null, true);
    } else {
      console.log(`Origin blocked: ${origin} (not in ${currentEnv} whitelist)`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// 3. Rate Limiting (Configurable via environment)
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // Default 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // Default 100 requests per window
  message: {
    error: 'Too many requests from this IP',
    retryAfter: `${process.env.RATE_LIMIT_WINDOW || 15} minutes`
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false
});

// Apply rate limiting to all requests
app.use(limiter);

// Stricter rate limiting for auth endpoints (configurable)
const authLimiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // Default 15 minutes
  max: process.env.RATE_LIMIT_AUTH_MAX || 5, // Default 5 auth requests per window
  message: {
    error: 'Too many authentication attempts',
    retryAfter: `${process.env.RATE_LIMIT_WINDOW || 15} minutes`
  }
});

// 4. Request Logging (Morgan)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Colored, concise output for development
} else {
  app.use(morgan('combined')); // Standard Apache combined log format for production
}

// 5. Body Parsing (Standard limits)
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '10mb',
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || '10mb' 
}));

// =============================================================================
// ROUTES
// =============================================================================

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'E-commerce Backend API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      api: '/api',
      test: '/api/test'
    }
  });
});

// API Info Endpoint
app.get('/api', (req, res) => {
  res.json({
    message: `E-commerce API ${process.env.API_VERSION || 'v1'}`,
    backend_port: process.env.PORT || 3000,
    frontend_url: process.env.FRONTEND_URL || 'http://localhost:5173',
    environment: process.env.NODE_ENV || 'development',
    available_endpoints: [
      'GET /health - Health check',
      'GET /api - API information', 
      'GET /api/test - Test endpoint',
      'POST /api/test - Test POST endpoint',
      'GET /api/test-rate-limit - Rate limiting test'
    ],
    cors_origins: [
      'http://localhost:5173', // Vite default
      'http://localhost:4173'  // Vite preview
    ]
  });
});

// Test GET Endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Test GET endpoint works!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    headers: req.headers,
    query: req.query
  });
});

// Test POST Endpoint
app.post('/api/test', (req, res) => {
  res.json({
    message: 'Test POST endpoint works!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    body: req.body,
    headers: req.headers
  });
});

// Test Rate Limiting (with stricter limits)
app.get('/api/test-rate-limit', authLimiter, (req, res) => {
  res.json({
    message: 'Rate limiting test - you can only call this 5 times per 15 minutes',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed by CORS policy'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Database Test Endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    
    res.json({
      message: 'Database connection test',
      database: stats,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Log error
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // CORS Error
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed by CORS policy'
    });
  }

  // Validation Error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  // Default Server Error
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

// แทนที่ app.listen เดิม
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // เชื่อมต่อฐานข้อมูลก่อน
    await connectDatabase();
    
    // เริ่ม HTTP server
    app.listen(PORT, () => {
      console.log('\n🚀 =================================');
      console.log(`🚀 Backend Server: http://localhost:${PORT}`);
      console.log(`🗄️ Database: PostgreSQL (Connected)`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`💊 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Info: http://localhost:${PORT}/api`);
      console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
      console.log(`🗄️ DB Test: http://localhost:${PORT}/api/db-test`);
      console.log('🚀 =================================\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// เริ่ม server
startServer();

module.exports = app;