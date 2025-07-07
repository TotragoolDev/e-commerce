const { prisma } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken, generateRefreshToken } = require('../utils/jwt');

class AuthService {
  // Register new user
  async register(userData) {
    const { email, password, firstName, lastName, phoneNumber } = userData;

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user - Only required fields
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone: phoneNumber || null,
          role: 'CUSTOMER',
          isActive: true,
          emailVerified: false
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true
        }
      });

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      return {
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRE || '7d'
        }
      };

    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true
        }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support');
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRE || '7d'
        }
      };

    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  async getProfile(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    const { firstName, lastName, phoneNumber } = updateData;

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phoneNumber && { phone: phoneNumber })
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('User not found');
      }
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true,
          isActive: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { 
          password: hashedNewPassword
        }
      });

      return { message: 'Password changed successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      const { verifyToken } = require('../utils/jwt');
      
      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const newAccessToken = generateToken(tokenPayload);

      return {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRE || '7d'
      };

    } catch (error) {
      throw error;
    }
  }

  // Get user statistics (for admin)
  async getUserStats() {
    try {
      const stats = await prisma.user.aggregate({
        _count: {
          id: true
        }
      });

      const roleStats = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      });

      const statusStats = await prisma.user.groupBy({
        by: ['isActive'],
        _count: {
          id: true
        }
      });

      const verificationStats = await prisma.user.groupBy({
        by: ['emailVerified'],
        _count: {
          id: true
        }
      });

      return {
        total: stats._count.id,
        byRole: roleStats.map(stat => ({
          role: stat.role,
          count: stat._count.id
        })),
        byStatus: statusStats.map(stat => ({
          status: stat.isActive ? 'active' : 'inactive',
          count: stat._count.id
        })),
        byVerification: verificationStats.map(stat => ({
          verified: stat.emailVerified,
          count: stat._count.id
        }))
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();