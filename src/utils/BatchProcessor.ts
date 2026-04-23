import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export class BatchProcessor {
  /**
   * General purpose stream processor for massive MongoDB collections.
   * @param cursor The Mongoose Cursor
   * @param transformFn Function to convert Mongo doc into Prisma structure
   * @param loadFn Function to execute the bulk Prisma insert
   * @param batchSize Number of records per chunk
   */
  static async processStream<MongoDoc, PrismaShape>(
    cursor: AsyncIterable<MongoDoc>,
    transformFn: (doc: MongoDoc) => PrismaShape | Promise<PrismaShape>,
    loadFn: (batch: PrismaShape[]) => Promise<any>,
    batchSize: number = 2000
  ): Promise<number> {
    let batch: PrismaShape[] = [];
    let count = 0;
    
    // Ensure log directory exists
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    const logFile = path.join(logDir, 'failed_records.jsonl');

    for await (const doc of cursor) {
      const transformed = await transformFn(doc);
      batch.push(transformed);
      count++;

      if (batch.length >= batchSize) {
        await this.executeBatch(batch, loadFn, logFile);
        batch = []; // Free memory
        process.stdout.write(`\rProcessed: ${count} records`);
      }
    }

    // Flush any remaining records
    if (batch.length > 0) {
      await this.executeBatch(batch, loadFn, logFile);
      process.stdout.write(`\rProcessed: ${count} records`);
    }

    logger.info(`\n✅ Finished batch, total processed: ${count}`);
    return count;
  }

  /**
   * Safely attempts to insert a batch. If it fails (due to a structural constraint), 
   * falls back to attempting 1-by-1 insertions to salvage valid records and dumps 
   * exactly which record caused the outage.
   */
  private static async executeBatch<PrismaShape>(
    batch: PrismaShape[],
    loadFn: (batch: PrismaShape[]) => Promise<any>,
    logFile: string
  ) {
    try {
      await loadFn(batch);
    } catch (error: any) {
      logger.warn(`\n⚠️ Batch insert failed (possibly a Foreign Key issue). Falling back to 1-by-1 Salvage mode for ${batch.length} records...`);
      
      // Fallback Loop: Iterate over the batch and try individually
      for (const record of batch) {
        try {
          // By calling loadFn with an array of 1, we preserve logic like `skipDuplicates: true`
          await loadFn([record]);
        } catch (individualError: any) {
          // This specific record is broken (orphaned constraint, string too long, etc). Log it out!
          const errorLog = JSON.stringify({
            timestamp: new Date().toISOString(),
            errorMsg: individualError.message,
            badRecordData: record
          });
          fs.appendFileSync(logFile, errorLog + '\n');
        }
      }
    }
  }
}
