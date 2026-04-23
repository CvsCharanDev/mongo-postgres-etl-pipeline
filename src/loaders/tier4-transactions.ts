import { prisma } from '../config/database';
import { BatchProcessor } from '../utils/BatchProcessor';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

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
      amount: doc.amount || 0,
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
      pl: doc.pl || 0,
      prevBalance: doc.prevBalance || 0,
      betFairPl: doc.betFairPl || 0,
      type: doc.type || null,
      commission: doc.commission || 0,
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
      odds: doc.odds || null,
      stake: doc.stake || null,
      liability: doc.liability || null,
      pl: doc.pl || null,
      commission: doc.commission || null,
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
