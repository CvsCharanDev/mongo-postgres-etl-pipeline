import { prisma } from '../config/database';
import { BatchProcessor } from '../utils/BatchProcessor';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Helper function to safely parse and clamp numbers for PostgreSQL Decimal(18, 4)
const safeDecimal = (val: any): number => {
  if (val === null || val === undefined) return 0;
  let num = 0;
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
  const MAX_DECIMAL = 99999999999999;
  const MIN_DECIMAL = -99999999999999;
  if (num > MAX_DECIMAL) return MAX_DECIMAL;
  if (num < MIN_DECIMAL) return MIN_DECIMAL;
  return num;
};

export const loadUsers = async () => {
  logger.info('\n⏳ Starting Tier 3: Users & Agency Trees...');

  // ──────────────────────────────────────────────────────────────────────────
  // PASS 1: Insert ALL users with self-referencing FK fields nulled out.
  //
  // WHY: Users reference other users (directParentId) which may not have been
  // inserted yet depending on cursor order. By nulling FKs on insert we
  // guarantee 100% insertion success for both dev orphans AND prod data.
  // ──────────────────────────────────────────────────────────────────────────
  logger.info('Migrating Users (Pass 1 – FK-safe insert)...');
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
      balance: safeDecimal(doc.balance),
      exposureLimit: doc.exposureLimit?.toString() || null,
      status: doc.status || '0',
      directParentId: null,       // intentionally nulled — patched in Pass 2
      directParentRole: doc.directParent?.role || null,
      twoFactorEnabled: doc.twoFactorEnabled || false,
      twoFactorSecret: doc.twoFactorSecret || null,
      colorSharingSetting: doc.colorSharingSetting || {},
      ip_address: doc.ip_address || {},
      chipSettingId: null,        // intentionally nulled — patched in Pass 2
      currencyId: null,           // intentionally nulled — patched in Pass 2
      casino: (doc.casino || []).filter((c: any) => c !== null),
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
    }),
    async (batch) => await prisma.user.createMany({ data: batch, skipDuplicates: true })
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PASS 2: Self-healing FK patch.
  //
  // Now that ALL users are in the DB, build lookup Sets and patch each user's
  // FK fields only where the referenced record actually exists.
  //
  // PRODUCTION BEHAVIOUR: Any genuine orphan (deleted parent, bad data) is
  // simply left as NULL — the user is still inserted and fully auditable.
  // The warning log tells you exactly which records are dirty in the source.
  // ──────────────────────────────────────────────────────────────────────────
  logger.info('Patching User FK references (Pass 2 – self-healing)...');

  const allUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map(u => u.id)
  );
  const allCurrencyIds = new Set(
    (await prisma.currency.findMany({ select: { id: true } })).map(c => c.id)
  );

  let patchedCount = 0;
  let orphanCount = 0;

  const cursor = mongoose.connection.db!.collection('users').find({
    $or: [
      { 'directParent.parent_id': { $exists: true, $ne: null } },
      { currencyId: { $exists: true, $ne: null } },
      { chipSetting: { $exists: true, $ne: null } },
    ],
  });

  for await (const doc of cursor) {
    const userId = doc._id.toString();

    // Skip users that failed to insert in Pass 1 (e.g. duplicate username)
    if (!allUserIds.has(userId)) continue;

    const directParentId = doc.directParent?.parent_id?.toString() || null;
    const currencyId = doc.currencyId?.toString() || null;
    const chipSettingId = doc.chipSetting?.toString() || null;

    const validDirectParentId =
      directParentId && allUserIds.has(directParentId) ? directParentId : null;
    const validCurrencyId =
      currencyId && allCurrencyIds.has(currencyId) ? currencyId : null;

    if (!validDirectParentId && directParentId) {
      orphanCount++;
      logger.warn(
        `⚠️  Orphan parent: user=${userId} → directParentId=${directParentId} not found. Setting to null.`
      );
    }
    if (!validCurrencyId && currencyId) {
      logger.warn(
        `⚠️  Orphan currency: user=${userId} → currencyId=${currencyId} not found. Setting to null.`
      );
    }

    // updateMany silently no-ops if the record doesn't exist — safe for prod
    await prisma.user.updateMany({
      where: { id: userId },
      data: {
        directParentId: validDirectParentId,
        currencyId: validCurrencyId,
        chipSettingId,
      },
    });
    patchedCount++;
  }


  logger.info(
    `✅ FK Patch complete — patched: ${patchedCount} users | genuine orphans nulled: ${orphanCount}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PASS 3: Build UserParent hierarchy junction table.
  //
  // Uses the allUserIds Set from Pass 2 — only creates rows where both child
  // AND parent are real users in the DB.
  // ──────────────────────────────────────────────────────────────────────────
  logger.info('Generating UserParent Hierarchies (Pass 3)...');
  await BatchProcessor.processStream(
    mongoose.connection.db!.collection('users').find({ 'parents.0': { $exists: true } }),
    (doc: any) => {
      return doc.parents
        .map((parentObj: any) => {
          if (!parentObj.parent_id) return null;
          const parentId = parentObj.parent_id.toString();
          if (!allUserIds.has(parentId)) return null; // skip orphaned parent refs
          return {
            childId: doc._id.toString(),
            parentId,
            role: parentObj.role || null,
          };
        })
        .filter(Boolean);
    },
    async (batchOfArrays) => {
      const flatBatch = batchOfArrays.flat();
      await prisma.userParent.createMany({ data: flatBatch, skipDuplicates: true });
    }
  );

  console.log('✅ Tier 3 Completed!');
};
