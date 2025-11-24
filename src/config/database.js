
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


console.log('Prisma client keys:', Object.keys(prisma));
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✓ Database connected successfully');
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await prisma.$disconnect();
};

export { prisma, connectDB, disconnectDB };