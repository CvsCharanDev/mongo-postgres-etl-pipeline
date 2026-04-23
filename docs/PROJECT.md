# ETL Pipeline — Project Technical Documentation

> **Project:** `mongo-postgres-etl-pipeline`  
> **Purpose:** Production-grade, zero-downtime ETL pipeline to migrate a live Betting Platform from MongoDB (legacy) to PostgreSQL (target) using Prisma ORM.  
> **Stack:** Node.js · TypeScript · Prisma ORM · MongoDB (Mongoose) · PostgreSQL · Docker · Winston Logger

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Project File Structure](#3-project-file-structure)
4. [Environment Setup](#4-environment-setup)
5. [npm Scripts Reference](#5-npm-scripts-reference)
6. [ETL Pipeline Design](#6-etl-pipeline-design)
7. [Tier Execution Order](#7-tier-execution-order)
8. [BatchProcessor — Core Engine](#8-batchprocessor--core-engine)
9. [Error Handling & Failover](#9-error-handling--failover)
10. [Schema & Enum Mapping](#10-schema--enum-mapping)
11. [Database Dashboard](#11-database-dashboard)
12. [Truncation & Reset](#12-truncation--reset)
13. [Seeding Mock Data](#13-seeding-mock-data)
14. [Known Gotchas & Decisions](#14-known-gotchas--decisions)
15. [Production Deployment Checklist](#15-production-deployment-checklist)

---

## 1. Overview

This project replicates the complete MongoDB document schema of a betting platform into a strictly relational PostgreSQL schema enforced by Prisma. It is designed for:

- **Idempotent runs** — safe to re-execute. Duplicate records are skipped via `skipDuplicates: true`.
- **Loss-proof architecture** — every rejected record is caught, individually retried, and if still failing, persisted to `logs/failed_records.jsonl` for manual review.
- **Topological ordering** — migrations execute in dependency order (Tier 1 → Tier 4) to satisfy Foreign Key constraints at every step.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────┐
│           Source: MongoDB            │
│  (betting_db @localhost:27017)       │
│  Mongoose ODM connection             │
└─────────────────┬────────────────────┘
                  │  Raw documents
                  ▼
┌──────────────────────────────────────┐
│         ETL Pipeline (src/etl.ts)    │
│                                      │
│  Tier 1 → Currencies                 │
│  Tier 2 → Sports / Leagues /         │
│           Events / Markets / Runners │
│  Tier 3 → Users / UserParent Trees   │
│  Tier 4 → SportBets / BankAccounts   │
│           ResultTransactions         │
│                                      │
│  Each Tier uses BatchProcessor:      │
│   1. Bulk createMany (fast)          │
│   2. On fail → 1-by-1 Salvage mode   │
│   3. On salvage fail → JSONL log     │
└─────────────────┬────────────────────┘
                  │  Prisma ORM writes
                  ▼
┌──────────────────────────────────────┐
│         Target: PostgreSQL           │
│  (betting_db @localhost:5432)        │
│  Strict typed schema via Prisma      │
└──────────────────────────────────────┘
```

---

## 3. Project File Structure

```
mongo-postgres-etl-pipeline/
├── docs/                          # Documentation
│   ├── PROJECT.md                 # ← This file
│   ├── database_migration_mapping.md
│   └── main-betting-server-db-models.js  # Original Mongo schema reference
│
├── prisma/
│   └── schema.prisma              # Full PostgreSQL schema with Enums
│
├── src/
│   ├── config/
│   │   └── database.ts            # MongoDB + Prisma connection helpers
│   │
│   ├── loaders/                   # ETL tier execution files
│   │   ├── tier1-configs.ts       # Currencies
│   │   ├── tier2-hierarchy.ts     # Sports → Leagues → Events → Markets → Runners
│   │   ├── tier3-users.ts         # Users + UserParent hierarchy trees
│   │   └── tier4-transactions.ts  # SportBets, BankAccounts, ResultTransactions
│   │
│   ├── models/                    # Mongoose ODM models (MongoDB schemas)
│   │
│   ├── scripts/
│   │   └── truncate.ts            # Wipes both MongoDB + PostgreSQL + error logs
│   │
│   ├── seed/
│   │   └── seed-mongo.ts          # Generates high-volume mock data into MongoDB
│   │
│   ├── utils/
│   │   ├── BatchProcessor.ts      # Core batch engine with 1-by-1 salvage fallback
│   │   └── logger.ts              # Winston logger (console + file transport)
│   │
│   ├── index.ts                   # Dashboard: shows live row counts for both DBs
│   └── etl.ts                     # ETL runner: executes full migration pipeline
│
├── logs/
│   ├── etl-pipeline.log           # Full runtime log (info + warnings + errors)
│   └── failed_records.jsonl       # JSONL dump of every rejected record with reason
│
├── docker-compose.yml             # Spins up betting-mongo + betting-postgres
├── prisma.config.ts               # Prisma 7 config (database adapter)
├── package.json
└── tsconfig.json
```

---

## 4. Environment Setup

### Prerequisites
- Docker Desktop (installed and running)
- Node.js v18+
- npm

### `.env` Variables

```env
# Source — MongoDB (staging only, never production!)
MONGO_URI=mongodb://localhost:27017/betting_db

# Target — PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/betting_db
```

### First-Time Setup

```bash
# 1. Add Docker to PATH (only needed if Docker is on an external drive)
export PATH="/Volumes/<YourDrive>/Applications/Docker.app/Contents/Resources/bin:$PATH"

# 2. Spin up containers
docker compose up -d

# 3. Generate Prisma Client and push schema
npx prisma generate
npx prisma db push
```

---

## 5. npm Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `ts-node src/index.ts` | Connects to both DBs and shows live row count dashboard |
| `npm run etl:start` | `ts-node src/etl.ts` | Executes the full ETL migration pipeline |
| `npm run seed:mongo` | `ts-node src/seed/seed-mongo.ts` | Seeds MongoDB with 2500 Users + 5000 SportBets |
| `npm run db:truncate` | `ts-node src/scripts/truncate.ts` | Wipes MongoDB collections, Postgres tables (CASCADE), and clears error logs |
| `npm run generate` | `prisma generate` | Regenerates Prisma Client after schema changes |
| `npm run build` | `tsc` | Compiles TypeScript to JavaScript |

### End-to-End Test Cycle

```bash
npm run db:truncate     # Clean slate
npm run seed:mongo      # Fill MongoDB with mock data
npm start               # Verify: MongoDB full, Postgres empty
npm run etl:start       # Run the migration
npm start               # Verify: both databases perfectly aligned
```

---

## 6. ETL Pipeline Design

The pipeline is structured as **4 sequential tiers**, each representing a dependency layer in the relational schema. This ensures that when a foreign key reference is inserted, the parent record already exists in PostgreSQL.

Each tier uses the `BatchProcessor` utility which handles:
1. **Transform phase** — maps each raw Mongo document into a typed Prisma-compatible object.
2. **Bulk insert phase** — attempts `prisma.model.createMany()` with `skipDuplicates: true`.
3. **Salvage fallback** — if bulk insert fails, retries each record individually.
4. **Error logging** — persists any individual failures to `logs/failed_records.jsonl`.

---

## 7. Tier Execution Order

```
Tier 1: Currency
    ↓ (no FK dependencies)

Tier 2: Sport → League → Event → Market → Runner
    ↓ (Sport must exist before League; League before Event, etc.)

Tier 3: User → UserParent (join table for agent hierarchy tree)
    ↓ (User must exist before UserParent childId/parentId references)

Tier 4: BankAccount → ResultTransaction → SportBet
         (all FK to User + Event)
```

---

## 8. BatchProcessor — Core Engine

**File:** `src/utils/BatchProcessor.ts`

```typescript
// Signature
new BatchProcessor(
  sourceFn: () => Promise<any[]>,   // Fetches all documents from MongoDB
  transformFn: (doc) => T,          // Maps raw Mongo doc → Prisma input shape
  loadFn: (batch: T[]) => Promise<any>, // Executes Prisma createMany
  batchSize: number                 // Default: 500
)
```

### How It Works

1. **Fetches** all source records from MongoDB via `sourceFn`.
2. **Transforms** each document using `transformFn` into a Prisma-typed shape.
3. **Chunks** the results into batches of `batchSize` records.
4. For each chunk:
   - Attempts **bulk `createMany`** for maximum throughput.
   - If that fails (Foreign Key violation, type mismatch, etc.), triggers **1-by-1 Salvage Mode** — logs the warning and tries each record individually.
   - Any record that still fails is written to `logs/failed_records.jsonl` as a JSONL entry containing both the error message and the failing record's data.

---

## 9. Error Handling & Failover

### 3-Layer Defense

| Layer | Mechanism | Outcome |
|---|---|---|
| **Layer 1** | `skipDuplicates: true` on `createMany` | Idempotent re-runs — already migrated records are silently skipped |
| **Layer 2** | try/catch on bulk batch → salvage 1-by-1 | Zero pipeline crash. Bad batch is individually retried |
| **Layer 3** | JSONL error log per bad record | Full audit trail. Records are never silently lost |

### Inspecting Failed Records

```bash
# View error summary
cat logs/failed_records.jsonl | python3 -c "
import sys, json
lines = sys.stdin.readlines()
print(f'Total failed: {len(lines)}')
for line in lines[:5]:
    r = json.loads(line)
    print(r['errorMsg'].split(chr(10))[-1].strip())
"
```

### Common Errors and Causes

| Error | Cause | Fix |
|---|---|---|
| `Foreign key constraint violated: UserParent_childId_fkey` | A `User` was rejected upstream (e.g., duplicate username), but their `UserParent` record still references that missing user | Fix the source User data and re-run after truncation |
| `Foreign key constraint violated: SportBet_userId_fkey` | A `SportBet` references a `userId` that was rejected in Tier 3 | Same as above — fix User data first |
| `Invalid value for argument: Expected StatusEnum3` | Mongo `status` field is stored as raw `"1"` string, but Postgres expects a typed Enum | Handled by `mapStatus3()` / `mapStatus4()` helpers in `tier2-hierarchy.ts` |

---

## 10. Schema & Enum Mapping

MongoDB stores `status` fields as loose strings (`"0"`, `"1"`, `"2"`). PostgreSQL enforces typed Enums.

### Prisma Enum Definitions

```prisma
enum StatusEnum3 {
  status_0 @map("0")
  status_1 @map("1")
  status_2 @map("2")
}

enum StatusEnum4 {
  status_0 @map("0")
  status_1 @map("1")
  status_2 @map("2")
  status_3 @map("3")
}
```

### Mapping Helpers (`tier2-hierarchy.ts`)

```typescript
import { StatusEnum3, StatusEnum4 } from '@prisma/client';

const mapStatus3 = (val): StatusEnum3 => {
  if (String(val) === "1") return StatusEnum3.status_1;
  if (String(val) === "2") return StatusEnum3.status_2;
  return StatusEnum3.status_0; // safe default
};
```

Applied to: `Sport.status`, `League.status`, `Market.status`, `Runner.status`, `Country.status`, `Venue.status`, `Event.status` (uses `mapStatus4`).

---

## 11. Database Dashboard

Running `npm start` connects to both databases and prints a live comparison table:

```
======================================================
✅ LIVE DATABASE ROW COUNTS
======================================================
┌────────────┬─────────┬────────────┐
│ (index)    │ MongoDB │ PostgreSQL │
├────────────┼─────────┼────────────┤
│ Currencies │ 3       │ 3          │
│ Users      │ 2500    │ 2500       │
│ Sports     │ 1       │ 1          │
│ Leagues    │ 1       │ 1          │
│ Events     │ 5       │ 5          │
│ Sport Bets │ 5000    │ 5000       │
└────────────┴─────────┴────────────┘
======================================================
```

A **perfect match** means the migration is lossless. Any discrepancy should be investigated in `logs/failed_records.jsonl`.

---

## 12. Truncation & Reset

**File:** `src/scripts/truncate.ts`  
**Command:** `npm run db:truncate`

This script performs 3 operations:

1. **MongoDB:** Iterates all collections and calls `deleteMany({})` on each (avoids `dropDatabase` lock issues).
2. **PostgreSQL:** Dynamically queries `pg_tables` to find all public tables, then executes `TRUNCATE TABLE ... CASCADE` in a single statement (respects FK ordering automatically).
3. **Logs:** Deletes `logs/failed_records.jsonl` so the next run's failures are isolated.

> ⚠️ **SAFETY:** The script validates your `MONGO_URI` contains `localhost` before proceeding, preventing accidental production wipes.

---

## 13. Seeding Mock Data

**File:** `src/seed/seed-mongo.ts`  
**Command:** `npm run seed:mongo`

Generates realistic, relationally-linked mock data:

| Collection | Count | Notes |
|---|---|---|
| `currencies` | 3 | Random finance data via Faker |
| `users` | 2500 | Unique usernames guaranteed via `_${i}` suffix |
| `sports` | 1 | Soccer |
| `leagues` | 1 | Premier League |
| `events` | 5 | Random city matchups |
| `sportbets` | 5000 | Linked to real user + event IDs |

**Key Design:** Usernames and emails are suffixed with the array index (`_${i}`) to guarantee uniqueness and prevent downstream FK cascade failures.

---

## 14. Known Gotchas & Decisions

### Docker on External Drive
If Docker Desktop is installed on an external drive (not `/Applications`), the terminal PATH won't find `docker-credential-desktop`, causing credential errors. Fix by injecting the drive path once per terminal session:

```bash
export PATH="/Volumes/<YourDrive>/Applications/Docker.app/Contents/Resources/bin:$PATH"
```

### Prisma Version Warning in IDE
The IDE Prisma extension may show a warning: *"The datasource property url is no longer supported"*. This is a **version mismatch between the IDE extension (Prisma v7) and the CLI (Prisma v5.22)**. The `url` property in `schema.prisma` is **required** for `prisma db push` to work. Safely ignore this IDE warning.

### `skipDuplicates` Idempotency
All `createMany` calls use `skipDuplicates: true`. This means re-running `etl:start` on a database with existing data will only insert new records — it will never overwrite or error on existing ones.

### `UserParent` is a 2-record-per-user join table
Every player user has 2 parent entries (`masterAgent` + `subAgent`). With 2498 valid players, this creates 4996 `UserParent` rows (seeded as 2 agents × 2498 = 4996).

---

## 15. Production Deployment Checklist

Before pointing this pipeline at a live production MongoDB:

- [ ] Update `MONGO_URI` in `.env` to point to production MongoDB (read-only replica preferred)
- [ ] Update `DATABASE_URL` in `.env` to point to target PostgreSQL
- [ ] Run `npx prisma db push` against the target Postgres to create tables
- [ ] **Do NOT run `npm run db:truncate`** — that wipes data
- [ ] **Do NOT run `npm run seed:mongo`** — that wipes Mongo and inserts fake data
- [ ] Run `npm run etl:start`
- [ ] Monitor `logs/etl-pipeline.log` in real time: `tail -f logs/etl-pipeline.log`
- [ ] After completion, run `npm start`  and verify the dashboard counts match
- [ ] Review `logs/failed_records.jsonl` for any records that need manual intervention
