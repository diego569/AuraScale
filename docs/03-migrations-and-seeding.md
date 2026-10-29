# AuraScale Migrations and Seeding

**Status:** Iteration 2 complete  
**Migration:** `prisma/migrations/20260812120000_initial_foundation/migration.sql`  
**Seed:** `prisma/seed.sql`  
**Database tests:** `tests/database/invariants.sql`

## 1. Initial migration

The initial migration contains:

- Prisma-generated PostgreSQL tables, enums, indexes, unique constraints, and foreign keys.
- Named `CHECK` constraints for every row-local rule from the sixteen invariant groups.
- A deferred ledger constraint trigger for cross-row posting integrity.
- Immutability triggers for ledger transactions, ledger entries, FX observations, and audit records.
- A unique self-reference plus a reversal-shape check for one-time ledger reversals.

### Deferred ledger enforcement

PostgreSQL `CHECK` constraints cannot query other rows. The following rules therefore use a `DEFERRABLE INITIALLY DEFERRED` constraint trigger:

1. Every ledger transaction contains at least two entries.
2. The total debit amount equals the total credit amount.
3. All accounts used by a ledger transaction have one currency.

Because the trigger is deferred, an application command can insert the transaction header and entries in any order inside one database transaction. Integrity is checked before commit. The trigger raises SQLSTATE `23514` with a stable constraint name for each failure.

### Check-constraint coverage

Named checks enforce:

- Uppercase currency, country, method, provider, and display codes.
- USD-only wallets, ledger accounts, and order base currency.
- Positive FX rates and distinct base/quote currencies.
- Nonnegative wallet balances, prices, totals, and normalized amounts.
- Strictly positive reported payment, proof-size, and ledger-entry amounts.
- Legal offer min/max and order-item quantities.
- Exact order and order-item total equations.
- Correct reversal shape.
- Required moderator review data for verified/rejected submissions.
- Nonblank rejection reasons.
- Required provisioning timestamps.

## 2. Seed data

The SQL seed is deterministic and safe to rerun. It uses stable business keys and `ON CONFLICT ... DO UPDATE`.

Seeded reference data:

| Entity | Business key |
| --- | --- |
| Currency | `USD` |
| Currency | `PEN` |
| Country | `PE` |
| Payment method | `WHATSAPP_MANUAL` |
| Market availability | `WHATSAPP_MANUAL` + `PE` |
| Activation provider | `INTERNAL_WHATSAPP` |
| Activation method | `WHATSAPP_MANUAL` |
| Fulfillment provider | `INTERNAL_MANUAL` |
| Initial FX observation | `USD` + `PEN` + source + effective timestamp |
| Catalog categories | Stable slugs |
| Catalog services | Stable slugs |
| Service offers | Stable SKUs |

Seeded platform ledger accounts:

- `SYSTEM:PAYMENT_CLEARING:USD`
- `SYSTEM:PLATFORM_REVENUE:USD`
- `SYSTEM:PROMOTION_EXPENSE:USD`
- `SYSTEM:REFUND_CLEARING:USD`
- `SYSTEM:ADJUSTMENT:USD`

No user, moderator, activation workflow, order, wallet balance, or financial posting is seeded outside the rollback-only test fixtures. The public catalog seed contains three categories, six active services, and twelve active offers.

## 3. Verification strategy

`tests/database/invariants.sql` runs inside a transaction and rolls back all fixtures. It first proves that a valid domain graph and balanced ledger posting are accepted. It then attempts invalid writes for all sixteen invariant groups and fails the test run if any invalid write is accepted or rejected by an unexpected named constraint.

The mixed-currency test temporarily removes the redundant USD ledger-account check inside a rollback subtransaction. This independently proves the deferred trigger's single-currency branch instead of claiming coverage from the stricter USD check alone.

Iteration 2 was verified against PostgreSQL 16 using:

1. A clean Prisma `migrate deploy` into an empty database.
2. Two consecutive seed executions.
3. The positive fixture/posting test.
4. All sixteen negative invariant groups.

## 4. Operational commands

With `DATABASE_URL` exported and project dependencies installed:

```powershell
npx prisma migrate deploy
Get-Content -Raw prisma/seed.sql | psql $env:DATABASE_URL -v ON_ERROR_STOP=1
Get-Content -Raw tests/database/invariants.sql | psql $env:DATABASE_URL -v ON_ERROR_STOP=1
```

The invariant suite is destructive only to its own temporary fixtures and ends with `ROLLBACK`. It should still be run against disposable databases, never a production database.
