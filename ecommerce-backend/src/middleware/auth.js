const { verifyToken, extractToken } = require('../utils/jwt');
const { prisma } = require('../config/database');

// Verify JWT Token Middleware
async function authenticateToken(req, res, next) {
  try {
    console.log('🔍 Auth Middleware Called');
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Authorization Header:', req.headers.authorization);
    
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);
    
    console.log('🔍 Extracted Token:', token ? token.substring(0, 50) + '...' : 'No token');
    
    // Verify token
    const decoded = verifyToken(token);
    console.log('🔍 Decoded Token:', decoded);
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true  // ✅ Fixed: isEmailVerified -> emailVerified
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Account is deactivated'
      });
    }

    // Add user info to request object
    req.user = user;
    req.token = token;
    
    console.log('✅ Auth Success - User:', user.email);
    next();
  } catch (error) {
    console.error('🔍 Auth Error:', error.message);
    
    let statusCode = 401;
    let message = 'Unauthorized';

    if (error.message === 'Authorization header missing') {
      message = 'Authorization header required';
    } else if (error.message === 'Invalid authorization format. Use: Bearer <token>') {
      message = error.message;
    } else if (error.message === 'Token missing') {
      message = 'Access token required';
    } else if (error.message === 'Token expired') {
      message = 'Token expired. Please login again';
    } else if (error.message === 'Invalid token') {
      message = 'Invalid access token';
    }

    return res.status(statusCode).json({
      error: 'Unauthorized',
      message
    });
  }
}

// Optional Authentication (for endpoints that work with/without auth)
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = extractToken(authHeader);
    const decoded = verifyToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true  // ✅ Fixed: isEmailVerified -> emailVerified
      }
    });

    req.user = user && user.isActive ? user : null;
    req.token = token;
    
    next();
  } catch (error) {
    // On auth error, continue without user (don't block request)
    req.user = null;
    next();
  }
}

// Role-based authorization
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
}

// Email verification required
function requireEmailVerification(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {  // ✅ Fixed: isEmailVerified -> emailVerified
    return res.status(403).json({
      error: 'Email Verification Required',
      message: 'Please verify your email address to access this resource'
    });
  }

  next();
}

// Rate limiting for auth endpoints (stricter)
const rateLimit = require('express-rate-limit');

const authRateLimit = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_AUTH_MAX || 5,
  message: {
    error: 'Too many authentication attempts',
    message: `Please try again after ${process.env.RATE_LIMIT_WINDOW || 15} minutes`
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true
});

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireEmailVerification,
  authRateLimit
};