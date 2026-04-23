import { connectMongo, disconnectAll, prisma } from './config/database';
import { loadCurrencies } from './loaders/tier1-configs';
import { loadHierarchy } from './loaders/tier2-hierarchy';
import { loadUsers } from './loaders/tier3-users';
import { loadTransactionsAndBets } from './loaders/tier4-transactions';
import { logger } from './utils/logger';
import dotenv from 'dotenv';
dotenv.config();

// ==========================================
// GRACEFUL SHUTDOWN HANDLERS
// ==========================================
const shutdown = async (signal: string) => {
  logger.warn(`🛑 Received ${signal}. Initiating graceful shutdown...`);
  try {
    await disconnectAll();
    logger.info('✅ Successfully severed database connections.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT')); // Capture Ctrl+C
process.on('SIGTERM', () => shutdown('SIGTERM')); // Capture Docker/Kubernetes container down signals

// ==========================================
// PIPELINE EXECUTION
// ==========================================
const runETL = async () => {
  try {
    logger.info('🚀 Starting ETL Pipeline Execution...');
    
    await connectMongo();
    await prisma.$connect();
    logger.info('✅ Connected rigidly to both MongoDB and Target PostgreSQL');

    // Execute Tiers in Topological Order
    await loadCurrencies();
    await loadHierarchy();
    await loadUsers();
    await loadTransactionsAndBets();

    console.log('\n🎉 ETL Pipeline execution completed successfully!');

  } catch (error) {
    console.error('❌ ETL Pipeline failed:', error);
    process.exit(1);
  } finally {
    await disconnectAll();
  }
};

runETL();
