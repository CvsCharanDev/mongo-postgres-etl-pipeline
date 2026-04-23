# MongoDB to PostgreSQL Migration: Schema Mapping & Justification

This document serves as the official mapping guide between the legacy MongoDB schema (defined via Mongoose) and the new strictly-typed PostgreSQL database (managed via Prisma). 

Below we define exactly what changed, what stayed the same, and the technical justification behind these data modeling decisions to ensure a robust, production-ready system.

---

## 1. Core Architectural Decisions

Before diving into table-by-table mappings, several global decisions were required to bridge the gap between a document-oriented NoSQL database and a structured SQL database:

### A. Primary Keys (`ObjectId` Strings)
- **MongoDB:** `_id` is an `ObjectId` (a 24-character hex string).
- **PostgreSQL:** Primary keys are mapped as `String @id`. 
- **Justification:** Instead of migrating to auto-incrementing integers or rewriting primary keys, we will import the exact Mongo `ObjectId`s directly into PostgreSQL as Strings. This guarantees **zero relational breakage**. A row in `Event` referencing a specific `ObjectId` in Mongo will still reference that exact string in PostgreSQL.

### B. Monetary Precision (`Decimal(18, 4)`)
- **MongoDB:** Monetary data (`balance`, `stake`, `exposure`, `pl`) was stored as standard JavaScript `Number`s.
- **PostgreSQL:** Mapped to `Decimal(18, 4)`. 
- **Justification:** JavaScript floating-point arithmetic is notoriously error-prone when handling large volumes of transactions (e.g., `0.1 + 0.2 = 0.30000000000000004`). Converting these strictly to `Decimal(18, 4)` ensures perfect financial precision tracking for betting stakes, liabilities, and casino rolls.

### C. Unstructured Object Arrays (`JsonB`)
- **MongoDB:** Collections routinely utilized unstructured nested arrays (e.g., `stakeSize: [{ type: Object }]`, `loginDetails: [{ type: Object }]`).
- **PostgreSQL:** Mapped to dynamic `Json?` columns.
- **Justification:** Creating rigidly typed relational tables for dynamic runtime configuration objects (like dynamic stake sizing or color themes) creates severe query bloat and over-engineering. PostgreSQL natively supports and indexes `JSON/JSONB` fields, giving us the flexibility of NoSQL directly within an SQL row.

---

## 2. Model-by-Model Mapping

### I. User & Authentication

#### **`User` (Mongoose)  ->  `User` + `UserParent` (Prisma)**
- **What changed:** 
  - Standard fields (`name`, `email`, `mobileNo`) map 1:1. 
  - The `parents: [{ parent_id, role }]` array object has been extrapolated into a definitive **Join Table** named `UserParent`.
  - Nested config scopes (e.g., `colorSharingSetting`, `ip_address`) map to `JSON`.
- **Justification:** You cannot natively store an array of foreign keys directly in a standard PostgreSQL column. Extracting the parental hierarchy into a `UserParent` join table enables efficient hierarchical SQL queries using Recursive CTEs (Common Table Expressions) to accurately track agency commission trees.

#### **`UserLoginHistory` (Mongoose) ->  `UserLoginHistory` (Prisma)**
- **What changed:** Mapped 1:1, but the `loginDetails: [{ type: Object }]` array is explicitly cast to `Json`.

#### **`GoogleAuthenticator` (Mongoose) -> `GoogleAuthenticator` (Prisma)**
- **What changed:** 1:1 mapping.

---

### II. Financial & Payments

#### **`BankAccount` (Mongoose) -> `BankAccount` (Prisma)**
- **What changed:** Transferred 1:1. Added an explicit rigid relational link back to the `User` table to guarantee orphaned bank accounts can never exist. Types like `accountType` map securely to Prisma strictly enforced Enums.

#### **`Deposit` / `Withdrawal` (Mongoose) -> `Deposit` / `Withdrawal` (Prisma)**
- **What changed:** Same general structure, but the dense properties inside the embedded `cryptoPayment` object log are collapsed securely into a `JSONB` column on the parent record.
- **Justification:** Since Crypto payment variables span multiple divergent providers (differing metadata/networks), a JSON column limits table column inflation while preserving all historic audit data securely.

#### **`Transaction` / `ResultTransaction` (Mongoose) -> Same (Prisma)**
- **What changed:** Mapped 1:1. Financial tracking properties (`fromAmount`, `toAmount`, `prevBalance`, `betFairPl`) upgraded immediately to `Decimal(18, 4)`.

---

### III. Sports Betting Hierarchy

This forms the most complex relational graph on the platform. All entity relations have been explicitly mapped to guarantee cascading referential integrity.

#### **Hierarchy Mapping**
1. **`Sport`** maps 1:1.
2. **`League` / `Country` / `Venue`** map 1:1, mandating a foreign key constraint to `Sport`.
3. **`Event`** (Matches) maps 1:1, forcing constraints linking it reliably back to its `League`, `Venue`, and `Sport`.
4. **`Market`** / **`MarketSettled`** maps 1:1 to parent `Event`.
5. **`Runner`** / **`RunnerMetaData`** maps 1:1 to parent `Market`.

**Justification:** In Mongo, an orphaned `Market` belonging to a deleted `Event` could exist silently. By enforcing `REFERENCES` across this entire chain in PostgreSQL, any attempted deletion or corruption of higher-level entities safely cascades or errors out, preventing ghost-data in the betting engine.

---

### IV. Bets & Exposure

#### **`SportBets` / `SportSettleBets` (Mongoose) -> `SportBet` / `SportSettleBet` (Prisma)**
- **What changed:** The structure maintains 1:1 parity with explicit index constraints.
- **Justification:** MongoDB heavily relied on indexing these collections (`{ eventId: 1, marketId: 1 }`). We have securely porting these via Prisma `@@index` blocks because these tables constitute the highest volume of I/O read/write activity in the system.

#### **`Exposure` (Mongoose) -> `Exposure` (Prisma)**
- **What changed:** Retained exactly as is. `exposure` boundaries enforce precise `Decimal` limits to protect player liability values.

---

### V. Casino Domain

#### **`GapCasinoSchema` -> `GapCasinoGame`**
#### **`GapCasinoTransaction` -> `GapCasinoTransaction`**
#### **`CasinoBets` -> `CasinoBet`**

- **What changed:** Virtually 1:1 mapping. We mapped dynamic metadata strings and JSON provider tokens seamlessly. 

---

### VI. Analytics & Settings Configurations

*(Includes `Setting`, `GeneralSetting`, `LeagueSetting`, `VenueSetting`, `MatchSetting`, `CommissionSetting`, `FancyStake`)*

- **What changed:** 1:1 entity scale, but massive reduction in database complexity. All properties holding loosely typed `{ type: Object }` blocks in Mongoose arrays (like `stakeSize`, `commission`, `betDelay`, and the granular rule groups inside `FancyStake`) are serialized into optimized `JSONB` blobs.
- **Justification:** Config files rarely need complex inner joins in SQL. By casting config groupings directly as JSON columns, we sidestep the need to construct 35 tiny sub-tables just to hold stake arrays, achieving high speed lookups while preserving code legibility.

---

## Conclusion
This mapping strategy isolates high-volume relational activity (Betting hierarchy, Money movement) into performant SQL operations with index targeting, while capturing complex settings or third-party objects securely within PostgreSQL’s powerful `JSONB` tooling.
