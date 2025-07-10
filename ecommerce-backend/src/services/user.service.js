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

}