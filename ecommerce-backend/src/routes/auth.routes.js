const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/auth.controller');

// Import middleware
const { 
  authenticateToken, 
  requireRole, 
  authRateLimit 
} = require('../middleware/auth');

const {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate
} = require('../middleware/validation');

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

// User Registration
router.post('/register', 
  authRateLimit,
  validateRegistration,
  authController.register
);

// User Login
router.post('/login',
  authRateLimit,
  validateLogin,
  authController.login
);

// Refresh Access Token
router.post('/refresh',
  authController.refreshToken
);

// =============================================================================
// PROTECTED ROUTES (Authentication required)
// =============================================================================

// Get current user profile
router.get('/profile',
  authenticateToken,
  authController.getProfile
);

// Update user profile
router.put('/profile',
  authenticateToken,
  validateProfileUpdate,
  authController.updateProfile
);

// Change password
router.put('/change-password',
  authenticateToken,
  validatePasswordChange,
  authController.changePassword
);

// Logout
router.post('/logout',
  authenticateToken,
  authController.logout
);

// Check authentication status
router.get('/status',
  authenticateToken,
  authController.getAuthStatus
);

// Test authentication
router.get('/test',
  authenticateToken,
  authController.testAuth
);

// =============================================================================
// ADMIN ROUTES (Admin role required)
// =============================================================================

// Get user statistics
router.get('/admin/stats',
  authenticateToken,
  requireRole('ADMIN'),
  authController.getUserStats
);

// =============================================================================
// ROUTE DOCUMENTATION
// =============================================================================

// API Documentation endpoint
router.get('/', (res) => {
  res.json({
    message: 'Authentication API',
    version: '1.0.0',
    endpoints: {
      public: {
        'POST /auth/register': 'Register new user',
        'POST /auth/login': 'User login',
        'POST /auth/refresh': 'Refresh access token'
      },
      protected: {
        'GET /auth/profile': 'Get user profile',
        'PUT /auth/profile': 'Update user profile', 
        'PUT /auth/change-password': 'Change password',
        'POST /auth/logout': 'User logout',
        'GET /auth/status': 'Check auth status',
        'GET /auth/test': 'Test authentication'
      },
      admin: {
        'GET /auth/admin/stats': 'Get user statistics (Admin only)'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      expiry: process.env.JWT_EXPIRE || '7d'
    },
    rateLimit: {
      window: `${process.env.RATE_LIMIT_WINDOW || 15} minutes`,
      maxRequests: process.env.RATE_LIMIT_AUTH_MAX || 5,
      appliesTo: ['register', 'login']
    }
  });
});

module.exports = router;