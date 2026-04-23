# 🏆 MongoDB → PostgreSQL ETL Pipeline

A production-grade, **loss-proof** ETL pipeline that migrates a live Betting Platform from MongoDB (legacy NoSQL) to PostgreSQL (relational) using Prisma ORM. Built with TypeScript, Docker, and Winston for enterprise reliability.

---

## ✨ Features

- **Tiered Execution** — Migrates data in strict dependency order to satisfy all Foreign Key constraints
- **Zero Data Loss** — Bulk insert → 1-by-1 Salvage → JSONL error log. Three layers of protection
- **Idempotent Runs** — Safe to re-run at any time. Already migrated records are skipped automatically
- **Live Dashboard** — `npm start` shows a side-by-side row count comparison for both databases
- **Strict Type Safety** — Full Enum mapping from Mongo string codes to PostgreSQL typed Enums via Prisma Client
- **One-Command Reset** — `npm run db:truncate` wipes both databases and clears error logs in one shot

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| ORM | Prisma v5 |
| Source DB | MongoDB via Mongoose |
| Target DB | PostgreSQL |
| Containerization | Docker Compose |
| Logging | Winston |
| Mock Data | @faker-js/faker |

---

## 🚀 Quick Start

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js v18+

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd mongo-postgres-etl-pipeline
npm install
```

### 3. Configure Environment

Create a `.env` file in the root:

```env
MONGO_URI=mongodb://localhost:27017/betting_db
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/betting_db
```

### 4. Start Databases

```bash
docker compose up -d
```

> **Note:** If Docker is installed on an external drive, inject the path first:
> ```bash
> export PATH="/Volumes/<YourDrive>/Applications/Docker.app/Contents/Resources/bin:$PATH"
> ```

### 5. Initialize PostgreSQL Schema

```bash
npx prisma generate
npx prisma db push
```

---

## 📦 npm Scripts

| Script | Description |
|---|---|
| `npm start` | Connect to both DBs and show live row count dashboard |
| `npm run etl:start` | Execute the full ETL migration pipeline |
| `npm run seed:mongo` | Seed MongoDB with 2500 Users + 5000 SportBets of mock data |
| `npm run db:truncate` | Wipe both databases and clear error logs for a clean test |
| `npm run generate` | Regenerate Prisma Client after schema changes |
| `npm run build` | Compile TypeScript to JavaScript |

---

## 🔄 End-to-End Test Cycle

Run these commands in order to fully validate the pipeline:

```bash
npm run db:truncate     # 1. Clean slate — wipes both DBs, clears error logs
npm run seed:mongo      # 2. Fill MongoDB with realistic mock data
npm start               # 3. Dashboard: MongoDB full, Postgres empty ✅
npm run etl:start       # 4. Run the migration pipeline
npm start               # 5. Dashboard: both databases perfectly aligned ✅
```

**Expected final dashboard output:**

```
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
```

---

## 🏗 Architecture

```
MongoDB (Source)
    │
    ▼ Raw documents
ETL Pipeline (src/etl.ts)
    │
    ├── Tier 1: Currencies
    ├── Tier 2: Sports → Leagues → Events → Markets → Runners
    ├── Tier 3: Users → UserParent Hierarchies
    └── Tier 4: BankAccounts → ResultTransactions → SportBets
         │
         │ Each tier via BatchProcessor:
         │  [1] Bulk createMany (fast path)
         │  [2] Fail → 1-by-1 Salvage
         │  [3] Salvage fail → logs/failed_records.jsonl
         │
    ▼ Prisma ORM writes
PostgreSQL (Target)
```

---

## 📁 Project Structure

```
├── docs/                     # Technical documentation
│   └── PROJECT.md            # Full reference guide (architecture, gotchas, checklist)
├── prisma/
│   └── schema.prisma         # Full PostgreSQL schema with Enums
├── src/
│   ├── config/database.ts    # Connection helpers for MongoDB + Prisma
│   ├── loaders/              # Tier 1–4 ETL execution files
│   ├── scripts/truncate.ts   # Full database + log wipe utility
│   ├── seed/seed-mongo.ts    # Mock data generator
│   ├── utils/
│   │   ├── BatchProcessor.ts # Core batch engine with salvage fallback
│   │   └── logger.ts         # Winston file + console logger
│   ├── index.ts              # Live database dashboard
│   └── etl.ts                # ETL pipeline entry point
├── logs/
│   ├── etl-pipeline.log      # Full runtime log
│   └── failed_records.jsonl  # Rejected records with error context
├── docker-compose.yml
└── .env                      # Connection strings (not committed)
```

---

## 🛡 Error Handling

When a record fails migration, it is written to `logs/failed_records.jsonl`:

```json
{
  "timestamp": "2026-04-24T04:29:37.000Z",
  "errorMsg": "Foreign key constraint violated: `SportBet_userId_fkey`",
  "badRecordData": { "id": "...", "userId": "...", "stake": 150 }
}
```

To inspect failures after a run:

```bash
# Quick summary
cat logs/failed_records.jsonl | wc -l

# Error breakdown
cat logs/failed_records.jsonl | python3 -c "
import sys, json
lines = sys.stdin.readlines()
print(f'Total failed: {len(lines)}')
for line in lines[:5]:
    r = json.loads(line)
    print(r['errorMsg'].split(chr(10))[-1].strip())
"
```

---

## 📋 Pre-Production Checklist

Before running against a live database:

- [ ] Point `MONGO_URI` to a **read-only replica** of production MongoDB
- [ ] Point `DATABASE_URL` to the target PostgreSQL instance
- [ ] Run `npx prisma db push` to initialize the schema
- [ ] ⚠️ **Do NOT run `db:truncate` or `seed:mongo`** in production
- [ ] Run `npm run etl:start`
- [ ] Monitor logs: `tail -f logs/etl-pipeline.log`
- [ ] Verify dashboard: `npm start`
- [ ] Audit failures: `cat logs/failed_records.jsonl`

---

## 📖 Full Documentation

See [`docs/PROJECT.md`](./docs/PROJECT.md) for the complete technical reference including:
- Detailed BatchProcessor API
- Enum mapping decisions
- Known gotchas
- Schema design rationale
