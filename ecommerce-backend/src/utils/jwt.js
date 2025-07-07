const jwt = require('jsonwebtoken');

// Generate JWT Token
function generateToken(payload) {
  try {
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRE || '7d',
        issuer: 'ecommerce-api'
      }
    );
    return token;
  } catch (error) {
    throw new Error('Token generation failed');
  }
}

// Verify JWT Token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

// Extract token from Authorization header
function extractToken(authHeader) {
  if (!authHeader) {
    throw new Error('Authorization header missing');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization format. Use: Bearer <token>');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (!token) {
    throw new Error('Token missing');
  }

  return token;
}

// Generate refresh token (longer expiry)
function generateRefreshToken(payload) {
  try {
    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      process.env.JWT_SECRET,
      { 
        expiresIn: '30d',
        issuer: 'ecommerce-api'
      }
    );
    return refreshToken;
  } catch (error) {
    throw new Error('Refresh token generation failed');
  }
}

module.exports = {
  generateToken,
  verifyToken,
  extractToken,
  generateRefreshToken
};