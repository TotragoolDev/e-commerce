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

  
}