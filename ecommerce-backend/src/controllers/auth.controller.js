const authService = require('../services/auth.service');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      let statusCode = 400;
      let message = error.message;

      if (error.message.includes('already exists')) {
        statusCode = 409; // Conflict
      }

      res.status(statusCode).json({
        success: false,
        error: 'Registration Failed',
        message
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      
      let statusCode = 401;
      let message = error.message;

      if (error.message.includes('deactivated')) {
        statusCode = 403; // Forbidden
      }

      res.status(statusCode).json({
        success: false,
        error: 'Login Failed',
        message
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      
      res.status(404).json({
        success: false,
        error: 'Profile Not Found',
        message: error.message
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      let statusCode = 400;
      if (error.message === 'User not found') {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        error: 'Profile Update Failed',
        message: error.message
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Change password error:', error);
      
      let statusCode = 400;
      if (error.message === 'User not found') {
        statusCode = 404;
      } else if (error.message === 'Current password is incorrect') {
        statusCode = 401;
      } else if (error.message === 'Account is deactivated') {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        error: 'Password Change Failed',
        message: error.message
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Refresh token is required'
        });
      }

      const result = await authService.refreshToken(refreshToken);
      
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      
      let statusCode = 401;
      let message = error.message;

      if (error.message.includes('expired')) {
        message = 'Refresh token expired. Please login again';
      } else if (error.message.includes('invalid')) {
        message = 'Invalid refresh token';
      }

      res.status(statusCode).json({
        success: false,
        error: 'Token Refresh Failed',
        message
      });
    }
  }

  // Logout (client-side token removal)
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // But we can log the logout action for security purposes
      console.log(`User ${req.user.id} logged out at ${new Date().toISOString()}`);
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Logout Failed',
        message: 'An error occurred during logout'
      });
    }
  }

  // Get authentication status
  async getAuthStatus(req, res) {
    try {
      res.status(200).json({
        success: true,
        message: 'User is authenticated',
        data: {
          isAuthenticated: true,
          user: {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            role: req.user.role,
            isEmailVerified: req.user.isEmailVerified
          }
        }
      });
    } catch (error) {
      console.error('Auth status error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Status Check Failed',
        message: 'Unable to verify authentication status'
      });
    }
  }

  // Get user statistics (admin only)
  async getUserStats(req, res) {
    try {
      const stats = await authService.getUserStats();
      
      res.status(200).json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Stats Retrieval Failed',
        message: 'Unable to retrieve user statistics'
      });
    }
  }

  // Test endpoint for authentication
  async testAuth(req, res) {
    try {
      res.status(200).json({
        success: true,
        message: 'Authentication test successful',
        data: {
          timestamp: new Date().toISOString(),
          user: req.user,
          token: req.token ? 'Valid' : 'Missing'
        }
      });
    } catch (error) {
      console.error('Auth test error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Auth Test Failed',
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();