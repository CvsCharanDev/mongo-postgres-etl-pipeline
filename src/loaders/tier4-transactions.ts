import { prisma } from '../config/database';
import { BatchProcessor } from '../utils/BatchProcessor';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Helper function to safely parse and clamp numbers for PostgreSQL Decimal(18, 4)
const safeDecimal = (val: any): number => {
  if (val === null || val === undefined) return 0;
  
  let num = 0;
  // Handle MongoDB Long or Decimal128 objects
  if (typeof val === 'object') {
    if (val.toString) {
       const strVal = val.toString();
       if (strVal === '[object Object]') return 0;
       num = parseFloat(strVal);
    } else {
       return 0;
    }
  } else {
    num = parseFloat(val);
  }

  if (isNaN(num)) return 0;

  // Max value for Decimal(18,4) is 14 digits before the decimal: 99,999,999,999,999
  const MAX_DECIMAL = 99999999999999;
  const MIN_DECIMAL = -99999999999999;

  if (num > MAX_DECIMAL) return MAX_DECIMAL;
  if (num < MIN_DECIMAL) return MIN_DECIMAL;

  return num;
};

export const loadTransactionsAndBets = async () => {
  logger.info('\n⏳ Starting Tier 4: Transactional Data & Bets...');

  // 1. Load Bank Accounts
  logger.info('Migrating Bank Accounts...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('bankaccounts').find(),
    (doc: any) => ({
      id: doc._id.toString(),
      userId: doc.userId?.toString(),
      accountNumber: doc.accountNumber ? BigInt(doc.accountNumber) : null,
      accountName: doc.accountName || null,
      bankName: doc.bankName || null,
      ifscCode: doc.ifscCode || null,
      accountType: doc.accountType || 'saving',
      amount: safeDecimal(doc.amount),
      status: doc.status || 'pending',
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => {
        // filter out valid userIds
        const validBatch = batch.filter(b => b.userId);
        await prisma.bankAccount.createMany({ data: validBatch, skipDuplicates: true })
    }
  );

  // 2. Load General Ledger Result Transactions
  logger.info('Migrating Result Transactions...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('resulttransactions').find(),
    (doc: any) => ({
      id: doc._id.toString(),
      userId: doc.userId?.toString() || null,
      description: doc.description || null,
      pl: safeDecimal(doc.pl),
      prevBalance: safeDecimal(doc.prevBalance),
      betFairPl: safeDecimal(doc.betFairPl),
      type: (() => {
        const val = doc.type || 'exchange';
        const allowed = ['exchange', 'bookmaker', 'fancy', 'casino', 'LINE', 'Casino_alt', 'g_Casino'];
        if (allowed.includes(val)) return val;
        if (val.toLowerCase().includes('casino')) return 'casino';
        return 'exchange'; // default fallback
      })(),
      commission: safeDecimal(doc.commission),
      commissionStatus: doc.commissionStatus || "1",
      sportsId: doc.sportsId?.toString() || null,
      marketId: doc.marketId?.toString() || null,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => await prisma.resultTransaction.createMany({ data: batch, skipDuplicates: true })
  );

  // 3. Load High Volume Sport Bets
  logger.info('Migrating High-Volume Sports Bets...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('sportbets').find(),
    (doc: any) => ({
      id: doc._id.toString(),
      userId: doc.userId?.toString() || null,
      sportId: doc.sportId?.toString() || null,
      leagueId: doc.leagueId?.toString() || null,
      eventId: doc.eventId?.toString() || null,
      marketId: doc.marketId?.toString() || null,
      marketType: doc.marketType || null,
      bettingType: doc.bettingType || null,
      selection: doc.selection || null,
      betFairId: doc.betFairId || null,
      odds: doc.odds !== null && doc.odds !== undefined ? safeDecimal(doc.odds) : null,
      stake: doc.stake !== null && doc.stake !== undefined ? safeDecimal(doc.stake) : null,
      liability: doc.liability !== null && doc.liability !== undefined ? safeDecimal(doc.liability) : null,
      pl: doc.pl !== null && doc.pl !== undefined ? safeDecimal(doc.pl) : null,
      commission: doc.commission !== null && doc.commission !== undefined ? safeDecimal(doc.commission) : null,
      status: doc.status || "1",
      currency: doc.currency || {},
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => await prisma.sportBet.createMany({ data: batch, skipDuplicates: true }),
    5000 // Force larger chunk for dense tables
  );

  console.log('✅ Tier 4 Completed!');
};
