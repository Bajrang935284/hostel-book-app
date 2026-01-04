import { PrismaClient } from '@prisma/client';

// 1. Use a global variable to store the instance
const globalForPrisma = global;

// 2. Reuse the existing instance if it exists, otherwise create a new one
const prisma = globalForPrisma.prisma || new PrismaClient({
  // Optional: Add logging to see queries in your console
  // log: ['query', 'info', 'warn', 'error'],
});

// 3. Save the instance to the global object in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

console.log('Prisma client keys:', Object.keys(prisma));

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✓ Database connected successfully');
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    // Don't kill the process immediately in dev, it might recover on reload
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  await prisma.$disconnect();
};

export { prisma, connectDB, disconnectDB };