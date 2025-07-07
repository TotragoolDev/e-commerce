const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn'] : ['error'],
});

// Test connection function
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database test query successful');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Health check function
async function getDatabaseStats() {
  try {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const orderCount = await prisma.order.count();
    
    return {
      users: userCount,
      products: productCount,
      orders: orderCount,
      status: 'connected'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('📴 Database disconnected');
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('📴 Database disconnected');
  process.exit(0);
});

module.exports = { 
  prisma, 
  connectDatabase, 
  getDatabaseStats 
};