import { prisma } from '../config/database';
import { BatchProcessor } from '../utils/BatchProcessor';
import { logger } from '../utils/logger';
// Assuming the models file is copied or compiled:
// const { Currency } = require('../../docs/main-betting-server-db-models.js');

// Since we can't cleanly import the js file in TS without full config, we mock the mongoose model setup here for the example:
import mongoose from 'mongoose';
const Currency = mongoose.models.Currency || mongoose.model('Currency', new mongoose.Schema({}, { strict: false }));

export const loadCurrencies = async () => {
  logger.info('\n⏳ Starting Tier 1: Currencies...');
  const cursor = Currency.find().lean().cursor();

  await BatchProcessor.processStream(
    cursor,
    (doc: any) => ({
      id: doc._id.toString(),
      name: doc.name || null,
      code: doc.code || null,
      value: doc.value?.toString() || null,
      betFair: doc.betFair || false,
      selected: doc.selected || false,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => {
      // Load into Postgres
      await prisma.currency.createMany({
        data: batch,
        skipDuplicates: true, // Crucial to allow re-running the script
      });
    }
  );
};
