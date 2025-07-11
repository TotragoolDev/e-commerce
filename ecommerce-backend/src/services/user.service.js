const { PrimaClient, PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UserService {

    //=========== ADDRESS MANAGEMENT =============

    
  /**
   * Get all addresses for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} User addresses
   */
  
  async getUserAddresses(userId) {
    try {
      const addresses = await prisma.userAddress.findMany({
        where: { userId },
        orderby: [
          { isDefault: 'desc' },
          { createdAt: 'desc'}
        ]
      });

      return addresses;
    }catch(error) {
      console.error('Get user addresses error:',error);
      throw error;
    }
  }

  /**
   * Create new address for user
   * @param {number} userId - User ID
   * @param {Object} addressData - Address data
   * @returns {Promise<Object>} Created address
   */
  async createAddress(userId, addressData) {
    try {
      const { isDefault, ...otherData } = addressData;

      // If this is set as default, unset all other defaults
      if (isDefault) {
        await prisma.userAddress.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }
      
      // If this is the first address, make it default
      const addressCount = await prisma.userAddress.count({
        where: { userId }
      });

      const address = await prisma.userAddres.create({
        data: {
          userId,
          ...otherData,
          isDefault: isDefault || addressCount === 0
        }
      });
      return address;
    } catch (error) {
      console.error('Create address error:', error);
      throw error;
    }
  }

  /**
   * Update user address
   * @param {number} userId - User ID
   * @param {number} addressId - Address ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated address
   */

  async updateAddress(userId, addressId, updated){
    try {
      // Check if address exists and belongs to user
      const existingAddress = await prisma.userAddress.findFirst({
        where: { id: addressId, userId}
      });

      
      if (!existingAddress) {
        throw new Error('Address not found');
      }
      
      // If setting as default, unset all other defaults
      const { isDefualt, ...otherData} = updateData;
      if (isDefault) {
        await prisma.userAddress.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }

      const updatedAddress = await prisma.userAddress.update({
        where: { id: addressId },
        data: {
          ...otherData,
          ...(isDefault !== undefined && { isDefault })
        }
      });

      return updatedAddress;
    } catch (error) {
      console.error('Update address error:', error);
      throw error;
    }
  }

  /**
   * Delete user address
   * @param {number} userId - User ID
   * @param {number} addressId - Address ID
   */

  async deleteAddress(userId, addressId) {
    try {
      // Check if address exists and belongs to user
      const existingAddress = await prisma.userAddress.findFirst({
        where: { id: addressId, userId }
      });

      if (!existingAddress) {
        throw new Error('Address not found');
      }

      // Don't allow deleting the default address if there are other addresses
      if (existingAddress.isDefault) {
        const addressCount = await prisma.userAddress.count({
          where: { userId }
        });
        
        if (addressCount > 1) {
          throw new Error('Cannot delete default address');
        }
      }

      await prisma.userAddress.delete({
        where: { id: addressId }
      });

      // If we deleted the default address and there are other addresses,
      // set the first one as default
      if (existingAddress.isDefault) {
        const firstAddress = await prisma.userAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' }
        });

        if (firstAddress) {
          await prisma.userAddress.update({
            where: { id: firstAddress.id },
            data: { isDefault: true }
          });
        }
      }
    } catch (error) {
      console.error('Delete address error:', error);
      throw error;
    }
  }

  /**
   * Set address as default
   * @param {number} userId - User ID
   * @param {number} addressId - Address ID
   * @returns {Promise<Object>} Updated address
   */
  async setDefaultAddress(userId, addressId) {
    try {
      // Check if address exists and belongs to user
      const existingAddress = await prisma.userAddress.findFirst({
        where: { id: addressId, userId }
      });

      if (!existingAddress) {
        throw new Error('Address not found');
      }

      // Unset all other defaults
      await prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });

      // Set this address as default
      const updatedAddress = await prisma.userAddress.update({
        where: { id: addressId },
        data: { isDefault: true }
      });

      return updatedAddress;
    } catch (error) {
      console.error('Set default address error:', error);
      throw error;
    }
  }

  // ============ ACCOUNT SETTINGS ============

  /**
   * Get account settings for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Account settings
   */
  async getAccountSettings(userId) {
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

      // Add computed fields
      const settings = {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
        memberSince: user.createdAt,
        lastUpdated: user.updatedAt
      };

      return settings;
    } catch (error) {
      console.error('Get account settings error:', error);
      throw error;
    }
  }

  /**
   * Update account settings
   * @param {number} userId - User ID
   * @param {Object} settingsData - Settings data
   * @returns {Promise<Object>} Updated settings
   */
  async updateAccountSettings(userId, settingData) {
    try {
      const {email, firstName, lastname, phone} = settingsData;

      // Check if email is being changed and if it's already in use
      if (email){
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            NOT: { id: userId }
          }
        });
        if (existingUser) {
          throw new Error('Email already in use');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(email && { email }),
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone })
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

      return updatedUser;
    } catch (error) {
      console.error('Update account settings error:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   * @param {number} userId - User ID
   */
  async deactivateAccount(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });
    } catch (error) {
      console.error('Deactivate account error:', error);
      throw error;
    }
  }
}