# Proposal: MongoDB to PostgreSQL Migration

## 1. Summary

As the betting platform scales, the current MongoDB (NoSQL) architecture is encountering limitations around transaction safety, deep relational querying, and strict data integrity. To support the next tier of scale, we propose migrating the core database to **PostgreSQL**, utilizing **Prisma** as the modern ORM layer. 

This migration will enforce strict ACID compliance for financial transactions, establish unbreakable relationship constraints across the hierarchical sports betting graph, and drastically improve complex read-query performance—all while leveraging PostgreSQL’s `JSONB` capabilities to preserve the flexibility of our dynamic system configurations.

---

## 2. Technical Architecture & Structural Shift

The migration strategy is designed to balance the strictness of a relational SQL database with the dynamic nature of our existing unstructured NoSQL data. 

### A. Seamless Primary Key Continuity
- **Challenge:** Re-writing all `ObjectId`s across billions of historical betting rows would mandate a massive mapping lookup table, bottlenecking the ETL process and risking data inconsistency.
- **Solution:** We will map MongoDB's existing 24-character hexadecimal `ObjectId`s directly into PostgreSQL as `String` Primary Keys. 
- **Impact:** Complete backward compatibility. An `Event` or `User` referenced in MongoDB will maintain the exact same universally unique identifier string in PostgreSQL.

### B. Enforcing Financial Precision
- **Challenge:** JavaScript `Number` types used by Mongoose introduce floating-point inaccuracies over time, which is unacceptable for a financial betting ledger. 
- **Solution:** All monetary fields (`balance`, `stake`, `exposure`, `pl`) will be strictly cast to `Decimal(18, 4)` in PostgreSQL.
- **Impact:** Immutable accuracy on all user balances and commission roll-ups.

### C. Normalizing the Betting Graph
- **Challenge:** In MongoDB, an orphaned `Market` can silent exist even if the parent `Event` is deleted, leading to ghost data.
- **Solution:** We have architected a **rigid hierarchy model** (`Sport` → `League` → `Event` → `Market` → `Runner`). 
- **Impact:** By enforcing strict PostgreSQL Foreign Key constraints (`@relation`), any invalid deletion is blocked at the database level, guaranteeing absolute data integrity.

### D. Hybrid NoSQL capabilities via `JSONB`
- **Challenge:** Our platform relies on dynamic, deeply nested configuration arrays (e.g., `stakeSize: [{...}]`, `chipSetting`). Forcing these into rigid SQL tables would result in dozens of unnecessary join tables.
- **Solution:** PostgreSQL’s native `JSONB` data type allows us to store and index unstructured JSON blobs exactly like MongoDB.
- **Impact:** We keep the schema clean and maintain the same NoSQL flexibility for non-relational configurations (like dynamic stake sizing or crypto payment metadata) without sacrificing SQL query speeds.

---

## 3. The ETL Pipeline Strategy

To migrate the data seamlessly, we are building a bespoke NodeJS Extract, Transform, and Load (ETL) script leveraging both Mongoose and Prisma clients.

1. **Extraction (Read):** We will utilize MongoDB streams/cursors (`.find().lean().cursor()`) to stream records in memory-safe batches (e.g., 5,000 records per tick) to prevent out-of-memory crashes on millions of rows.
2. **Transformation (Map):** 
   - Dates will be strictly cast to `DateTime`.
   - Complex nested arrays (like the User's hierarchical `parents` array) will be flattened and written into optimized SQL Join Tables (`UserParent`).
3. **Load (Write):** We will use Prisma’s `createMany` bulk-insertion API, temporarily disabling foreign-key checks during the import to achieve maximum write throughput, and re-enabling them post-migration to validate the imported integrity.

---

## 4. Migration Execution & Risk Mitigation 

### Phase 1: Shadow Database & ETL Validation (Current Phase)
We will spin up the PostgreSQL instance and execute the ETL pipeline multiple times in a staging environment. We will build an internal script to diff the sum of all user balances in Mongo vs Postgres to ensure 100% financial parity. 

### Phase 2: Staging Cutover
The application will be configured to "Double Write". It will read from PostgreSQL but write identical transactions to both Mongo and Postgres simultaneously. This acts as a fallback fail-safe.

### Phase 3: Production Go-Live
Following a declared maintenance window, the final delta (changes that happened in the last hour) will be streamed into Postgres, and the application will completely sever ties with MongoDB.

---

## 5. Conclusion

This architecture bridges the gap between MongoDB's document flexibility and PostgreSQL's unmatched relational reliability. Given the strict mapping capabilities of the Prisma ORM and the performance of Postgres `JSONB`, we are highly confident in executing this migration flawlessly without data loss or prolonged system downtime.
