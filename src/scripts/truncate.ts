import { connectMongo, disconnectAll, prisma } from '../config/database';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const runTruncate = async () => {
  logger.warn('⚠️ Commencing FULL Database Truncation across MongoDB and PostgreSQL...');
  try {
    await connectMongo();
    await prisma.$connect();

    // 1. Truncate MongoDB dynamically safely (avoids dropDatabase locking)
    const db = mongoose.connection.db!;
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
    logger.info('✅ Wiped all documents from MongoDB staging database.');

    // 2. Truncate Postgres dynamically utilizing pg_tables and CASCADE
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    const tablesToWipe = tablenames
      .filter(({ tablename }) => tablename !== '_prisma_migrations')
      .map(({ tablename }) => `"${tablename}"`)
      .join(', ');

    if (tablesToWipe.length > 0) {
      // Intentionally unsafe string injection because we mapped trusted schema names natively
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tablesToWipe} CASCADE;`);
      logger.info('✅ Wiped all tables natively in PostgreSQL utilizing complete Cascade.');
    } else {
      logger.info('ℹ️ Postgres is already completely wiped/empty.');
    }

    // 3. Clean up error logs
    const errorLogPath = path.resolve(process.cwd(), 'logs', 'failed_records.jsonl');
    if (fs.existsSync(errorLogPath)) {
      fs.rmSync(errorLogPath, { force: true });
      logger.info('✅ Cleared previous failed_records.jsonl dump');
    }

    logger.info('🎉 Data Truncation completed successfully!');
  } catch (error) {
    logger.error('❌ Truncation failed execution:', error);
    process.exit(1);
  } finally {
    await disconnectAll();
  }
};

runTruncate();
