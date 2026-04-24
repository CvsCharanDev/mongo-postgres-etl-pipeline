import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const runPostgresTruncate = async () => {
    logger.warn('⚠️ Commencing FULL PostgreSQL Database Truncation...');

    try {
        await prisma.$connect();

        // Fetch all tables from public schema
        const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

        const tablesToWipe = tablenames
            .filter(({ tablename }) => tablename !== '_prisma_migrations')
            .map(({ tablename }) => `"${tablename}"`)
            .join(', ');

        if (tablesToWipe.length > 0) {
            // Using CASCADE to handle FK constraints
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tablesToWipe} CASCADE;`);
            logger.info('✅ Successfully wiped all PostgreSQL tables.');
        } else {
            logger.info('ℹ️ No tables found or already empty.');
        }

        logger.info('🎉 PostgreSQL truncation completed successfully!');

        // 3. Clean up error logs
        const errorLogPath = path.resolve(process.cwd(), 'logs', 'failed_records.jsonl');
        if (fs.existsSync(errorLogPath)) {
            fs.rmSync(errorLogPath, { force: true });
            logger.info('✅ Cleared previous failed_records.jsonl dump');
        }

        logger.info('🎉 Data Truncation completed successfully!');
    } catch (error) {
        logger.error('❌ PostgreSQL truncation failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

runPostgresTruncate();