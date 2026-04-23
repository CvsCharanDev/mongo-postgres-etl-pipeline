import { prisma } from '../config/database';
import { BatchProcessor } from '../utils/BatchProcessor';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { StatusEnum3, StatusEnum4 } from '@prisma/client';

const mapStatus3 = (val: string | number | undefined | null): StatusEnum3 => {
  const strVal = String(val);
  if (strVal === "1") return StatusEnum3.status_1;
  if (strVal === "2") return StatusEnum3.status_2;
  return StatusEnum3.status_0;
};

const mapStatus4 = (val: string | number | undefined | null): StatusEnum4 => {
  const strVal = String(val);
  if (strVal === "1") return StatusEnum4.status_1;
  if (strVal === "2") return StatusEnum4.status_2;
  if (strVal === "3") return StatusEnum4.status_3;
  return StatusEnum4.status_0;
};

export const loadHierarchy = async () => {
  logger.info('\n⏳ Starting Tier 2: Betting Hierarchy...');

  // 1. Load Sports
  logger.info('Migrating Sports...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('sports').find(),
    (doc: any) => ({
      id: doc._id.toString(),
      name: doc.name || null,
      slugName: doc.slugName || null,
      eventsCount: doc.eventsCount || 0,
      sportsCode: doc.sportsCode || null,
      status: mapStatus3(doc.status),
      homeView: doc.homeView || {},
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => await prisma.sport.createMany({ data: batch, skipDuplicates: true })
  );

  // 2. Load Leagues
  logger.info('Migrating Leagues...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('leagues').find(),
    (doc: any) => ({
      id: doc._id.toString(),
      sportId: doc.sportId?.toString() || null,
      name: doc.name || null,
      slugName: doc.slugName || null,
      leagueCode: doc.leagueCode || null,
      status: mapStatus3(doc.status),
      homeView: doc.homeView || {},
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => await prisma.league.createMany({ data: batch, skipDuplicates: true })
  );

  // 3. Load Events
  logger.info('Migrating Events...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('events').find(),
    (doc: any) => ({
      id: doc._id.toString(),
      sportId: doc.sportId?.toString() || null,
      leagueId: doc.leagueId?.toString() || null,
      venueId: doc.venueId?.toString() || null,
      name: doc.name || null,
      eventId: doc.id || doc._id.toString(), // eventId in Mongo is 'id'
      date: doc.date || null,
      channelCode: doc.channelCode || null,
      raderId: doc.raderId || null,
      status: mapStatus4(doc.status),
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => await prisma.event.createMany({ data: batch, skipDuplicates: true })
  );

  // 4. Load Markets
  logger.info('Migrating Markets...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('markets').find(),
    (doc: any) => ({
      id: doc._id.toString(),
      eventId: doc.eventId?.toString() || null,
      marketName: doc.marketName || null,
      slugName: doc.slugName || null,
      marketId: doc.marketId || null,
      bettingType: doc.bettingType || null,
      priority: doc.priority || false,
      selectionId: doc.selectionId || null,
      type: doc.type || null,
      status: mapStatus3(doc.status),
      marketStartTime: doc.marketStartTime || null,
      oddLimit: doc.oddLimit || null,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => await prisma.market.createMany({ data: batch, skipDuplicates: true })
  );

  // 5. Load Runners
  logger.info('Migrating Runners...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('runners').find(),
    (doc: any) => ({
      id: doc._id.toString(),
      marketId: doc.marketId?.toString() || null,
      runnerName: doc.runnerName || null,
      selectionId: doc.selectionId || null,
      status: mapStatus3(doc.status),
      sortPriority: doc.sortPriority || null,
      metadataId: doc.metadata?.toString() || null,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => await prisma.runner.createMany({ data: batch, skipDuplicates: true })
  );

  console.log('✅ Tier 2 Completed!');
};
