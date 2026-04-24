# Proposal: MongoDB to PostgreSQL Migration Strategy V2 (Standard Practices)

## 1. Summary
As the betting platform scales, migrating from AWS DocumentDB (MongoDB-compatible) to PostgreSQL is critical for transaction safety. This V2 proposal specifically addresses the constraints of **DocumentDB Change Streams** and outlines two enterprise-grade standard practices for executing the migration, depending on business requirements around downtime.

---

## 2. The Core ETL Architecture (Unchanged)
The fundamental data mapping remains the same:
- Seamless Primary Key Continuity (String ObjectIds).
- Enforcing Financial Precision (Decimal(18,4)).
- Normalizing the Betting Graph via strict Foreign Keys.
- Hybrid NoSQL capabilities using `JSONB` for configurations.

---

## 3. The "Hard Delete" Challenge
Before selecting an execution path, we must acknowledge a critical limitation:
If we build a custom polling mechanism using `updatedAt` timestamps instead of Change Streams, **the script cannot detect physical deletions**. If a record is hard-deleted in DocumentDB, it will remain in PostgreSQL forever. 
Therefore, the migration path heavily depends on whether the platform requires zero-downtime continuous sync or if a scheduled maintenance window is acceptable.

---

## 4. Execution Path 1: The "Downtime Cutover" (Batch-wise Checkpoints)
**Recommended if:** The business can afford a 3.5-hour scheduled maintenance window.

### Strategy:
We enhance the existing NodeJS ETL pipeline to be resilient by implementing **Batch-wise Checkpoints**.
1.  **Checkpoints**: Add a `MigrationCheckpoint` table to Postgres. Every 5,000 records, save the last processed `_id`.
2.  **Resilience**: If the migration script crashes or the server reboots at hour 2, it instantly resumes from the last checkpoint instead of starting over, guaranteeing completion within the 3.5-hour window.
3.  **Execution**:
    *   Stop the live application (Downtime begins).
    *   Run the Checkpoint ETL script.
    *   Once 100% synced, switch the application to PostgreSQL.
    *   Bring the application live.

---

## 5. Execution Path 2: The "Zero-Downtime" Migration (AWS DMS)
**Recommended if:** The application must remain live 24/7, and 3.5 hours of downtime is unacceptable.

### Strategy:
We leverage the existing script for speed, and **AWS Database Migration Service (DMS)** for continuous sync.
1.  **Initial Bulk Load**: Run the custom NodeJS ETL script to quickly migrate the historical 10M+ records. (Custom scripts utilizing Prisma `createMany` are significantly faster than DMS for the initial load).
2.  **Continuous Data Capture (CDC)**: 
    *   Provision an AWS DMS Replication Instance.
    *   Set the mode to **CDC Only**.
    *   DMS reads the raw DocumentDB transaction logs (oplog). It captures inserts, updates, and **hard deletes** natively, completely bypassing the "Change Streams aren't working" limitation.
3.  **Execution**:
    *   App stays live on DocumentDB.
    *   DMS continuously streams real-time changes to Postgres.
    *   When the lag is 0 seconds, perform a seamless DNS switch to point the application to Postgres.

---

## 6. Recommendation
We recommend **Path 1 (Batch-wise Checkpoints)** if a maintenance window is possible, as it keeps all logic within our TypeScript codebase and is easier to debug. 
If zero-downtime is a strict requirement, we must adopt **Path 2 (AWS DMS)** as the standard practice for reliable CDC and physical delete handling.
