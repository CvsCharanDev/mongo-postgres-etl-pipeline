import { prisma } from '../config/database';
import { BatchProcessor } from '../utils/BatchProcessor';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const loadUsers = async () => {
  logger.info('\n⏳ Starting Tier 3: Users & Agency Trees...');

  // First Pass: Insert strict user bases
  logger.info('Migrating Users...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('users').find(),
    (doc: any) => ({
      id: doc._id.toString(),
      name: doc.name || 'Unknown',
      username: doc.username || doc._id.toString(),
      email: doc.email || null,
      password: doc.password || '',
      role: doc.role || 1,
      mobileNo: doc.mobileNo ? BigInt(doc.mobileNo) : null,
      balance: doc.balance || 0,
      exposureLimit: doc.exposureLimit?.toString() || null,
      status: doc.status || "0",
      directParentId: doc.directParent?.parent_id?.toString() || null,
      directParentRole: doc.directParent?.role || null,
      twoFactorEnabled: doc.twoFactorEnabled || false,
      twoFactorSecret: doc.twoFactorSecret || null,
      colorSharingSetting: doc.colorSharingSetting || {},
      ip_address: doc.ip_address || {},
      chipSettingId: doc.chipSetting?.toString() || null,
      currencyId: doc.currencyId?.toString() || null,
      casino: doc.casino || [],
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => await prisma.user.createMany({ data: batch, skipDuplicates: true })
  );

  // Second Pass: Extrapolate Parents array into UserParent map
  logger.info('Generating UserParent Hierarchies...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('users').find({ "parents.0": { $exists: true } }),
    (doc: any) => {
      return doc.parents.map((parentObj: any) => {
        if (!parentObj.parent_id) return null;
        return {
          childId: doc._id.toString(),
          parentId: parentObj.parent_id.toString(),
          role: parentObj.role || null,
        };
      }).filter(Boolean);
    },
    async (batchOfArrays) => {
      // Flatten the batch of arrays
      const flatBatch = batchOfArrays.flat();
      await prisma.userParent.createMany({ data: flatBatch, skipDuplicates: true });
    }
  );

  console.log('✅ Tier 3 Completed!');
};
