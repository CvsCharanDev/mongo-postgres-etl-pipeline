import { connectMongo, disconnectAll, prisma } from './config/database';
import { logger } from './utils/logger';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const displayStats = async () => {
  logger.info('🚀 Connecting to Databases for Live Dashboard Stats...');
  
  try {
    await connectMongo();
    await prisma.$connect();
    
    // Get Mongo Counts natively
    const db = mongoose.connection.db!;
    const mongoData = {
      Currencies: await db.collection('currencies').countDocuments().catch(() => 0),
      Users: await db.collection('users').countDocuments().catch(() => 0),
      Sports: await db.collection('sports').countDocuments().catch(() => 0),
      Leagues: await db.collection('leagues').countDocuments().catch(() => 0),
      Events: await db.collection('events').countDocuments().catch(() => 0),
      SportBets: await db.collection('sportbets').countDocuments().catch(() => 0)
    };
    
    // Get Postgres Counts natively
    const pgData = {
      Currencies: await prisma.currency.count(),
      Users: await prisma.user.count(),
      Sports: await prisma.sport.count(),
      Leagues: await prisma.league.count(),
      Events: await prisma.event.count(),
      SportBets: await prisma.sportBet.count()
    };
    
    console.log('\n======================================================');
    console.log('✅ LIVE DATABASE ROW COUNTS');
    console.log('======================================================');
    console.table({
      'Currencies': { 'MongoDB': mongoData.Currencies, 'PostgreSQL': pgData.Currencies },
      'Users': { 'MongoDB': mongoData.Users, 'PostgreSQL': pgData.Users },
      'Sports': { 'MongoDB': mongoData.Sports, 'PostgreSQL': pgData.Sports },
      'Leagues': { 'MongoDB': mongoData.Leagues, 'PostgreSQL': pgData.Leagues },
      'Events': { 'MongoDB': mongoData.Events, 'PostgreSQL': pgData.Events },
      'Sport Bets': { 'MongoDB': mongoData.SportBets, 'PostgreSQL': pgData.SportBets },
    });
    console.log('======================================================\n');
    console.log("Run 'npm run etl:start' to execute array migration pipeline.\n")
    
  } catch (err) {
    logger.error('❌ Failed to fetch database demographics', err);
  } finally {
    await disconnectAll();
  }
};

displayStats();
