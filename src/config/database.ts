import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Initialize target Prisma Client
export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

// Initialize source Mongoose Connection
export const connectMongo = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing from environment variables');
  }
  
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to Source MongoDB');
};

export const disconnectAll = async () => {
  await mongoose.disconnect();
  await prisma.$disconnect();
  console.log('🔌 Disconnected from databases');
};
