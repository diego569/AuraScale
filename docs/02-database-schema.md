# AuraScale Database Schema

**Status:** Iteration 2 migration implemented  
**Canonical model:** `prisma/schema.prisma`  
**Database:** PostgreSQL

Prisma 7 reads `DATABASE_URL` from the process environment through the root `prisma.config.ts`; the schema therefore contains only the PostgreSQL provider declaration. Local `.env` loading will be configured with the package foundation rather than introducing an undeclared Iteration 1 dependency.

## 1. Modeling conventions

- Entity identifiers use PostgreSQL UUIDs.
- External lookup codes use stable business keys, such as `USD`, `PE`, and `WHATSAPP_MANUAL`.
- Timestamps use `timestamptz(3)` and are interpreted as UTC.
- USD money uses `BIGINT` integer cents.
- Amounts reported in other currencies use integer minor units according to `Currency.minorUnits`.
- FX rates use `DECIMAL(20,8)`.
- Mutable aggregate roots include an integer `version` where concurrent commands can cause financial conflicts.
- Historical commercial values are copied to order and order-item snapshots.
- JSON is reserved for variable input, sanitized provider metadata, and audit snapshots; it is not used for core relational state.

## 2. Bounded contexts and aggregates

### Identity and Access

`User` is the identity aggregate root. Auth.js-compatible `Account`, `Session`, and `VerificationToken` records support authentication. User status and role remain AuraScale domain concerns.

### Account Activation

`ActivationProvider` and `ActivationMethod` form a data-driven registry. `AccountActivation` represents one onboarding workflow, while `AccountActivationAttempt` records manual, API, webhook, bot, and retry executions. Rejection is terminal for one workflow; remediation creates a new workflow for the same pending user. The complete transition matrix is documented in `docs/04-account-activation.md`.

### Reference Data

- `Currency` controls minor-unit precision and display metadata.
- `Country` uses ISO 3166-1 alpha-2 codes.
- `PaymentMethod` is a data-driven registry.
- `PaymentMethodCountry` enables methods per market.
- `FxRate` stores append-only manual or API-sourced rate observations.

Initial reference records planned for the seed iteration:

| Entity | Key | Meaning |
| --- | --- | --- |
| Currency | `USD` | Authoritative platform currency |
| Currency | `PEN` | Initial reference/payment currency |
| Country | `PE` | Initial market |
| Payment method | `WHATSAPP_MANUAL` | Manual proof-based checkout |
| Fulfillment provider | `INTERNAL_MANUAL` | Moderator provisioning |

### Catalog

`Service` is the descriptive catalog aggregate. `ServiceOffer` is the sellable unit and supports price, quantity limits, required customer input, wholesale tiering, fulfillment strategy, and provider association.

Catalog updates do not change existing orders because `OrderItem` records name, SKU, price, strategy, and provider snapshots.

### Ordering

`Order` owns one or more `OrderItem` records and tracks three orthogonal state dimensions:

- Commercial: `DRAFT`, `PLACED`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `EXPIRED`
- Payment: `UNPAID`, `PROOF_SUBMITTED`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`, `REFUNDED`
- Fulfillment: `NOT_STARTED`, `QUEUED`, `IN_PROGRESS`, `PROVISIONED`, `FAILED`, `CANCELLED`

The application layer owns the legal transition matrix. Direct arbitrary status updates are prohibited.

### Payments

A wallet can receive multiple `PaymentSubmission` attempts. A submission can optionally identify the order that initiated the funding request, preserving the V1 proof-to-provision workflow without making all future top-ups order-dependent. The application must enforce that the submitter owns the target wallet and, when present, the linked order. Rejected evidence is preserved. Each submission can contain multiple private `PaymentProof` files.

A verified payment submission can link to at most one deposit `LedgerTransaction`. This unique relationship is the database-level component of deposit idempotency. Spending that balance for an associated order is a separate `PURCHASE` posting, so funding and commerce remain distinct ledger events.

### Wallet and Ledger

`Wallet` is the client-facing pre-paid balance aggregate. Its available and pending balances are transactionally maintained read projections.

`LedgerAccount`, `LedgerTransaction`, and `LedgerEntry` implement the accounting source of truth. Accounts use standard categories—asset, liability, revenue, expense, and equity—plus platform-specific purposes.

Example approved manual deposit posting:

| Account | Direction | Amount |
| --- | --- | --- |
| Payment clearing asset | Debit | Approved USD cents |
| Client available-balance liability | Credit | Approved USD cents |

Example purchase posting:

| Account | Direction | Amount |
| --- | --- | --- |
| Client available-balance liability | Debit | Order total USD cents |
| Platform revenue | Credit | Order total USD cents |

The exact revenue-recognition policy can later add deferred-revenue accounts without changing wallet semantics.

### Fulfillment

`Fulfillment` is one-to-one with an order item. It records the snapshotted strategy, provider, idempotency key, assignment, lifecycle, and encrypted delivery result. `FulfillmentAttempt` preserves every manual attempt, API call, retry, or webhook continuation.

### Governance

`AuditLog` records privileged actions and entity state snapshots. Audit rows are append-only and must not contain raw credentials, tokens, proof files, or decrypted fulfillment data.

## 3. Required database invariants

Prisma expresses relations and uniqueness, but several cross-row financial rules require explicit SQL in the first migration. These constraints and triggers are implemented in `prisma/migrations/20260812120000_initial_foundation/migration.sql`:

1. `Currency.code`, wallet currency, ledger currency, and order base currency are uppercase ISO-style codes.
2. Every wallet and ledger account used by the MVP has currency `USD`.
3. `FxRate.baseCurrencyCode` is `USD`, its rate is positive, and base differs from quote.
4. All price, total, balance, proof size, and ledger amount fields are non-negative; ledger entry amounts are strictly positive.
5. Order quantity is positive, offer minimum quantity is positive, and maximum is not below minimum.
6. `subtotalUsdCents - discountUsdCents = totalUsdCents`.
7. `OrderItem.unitPriceUsdCents * quantity = lineTotalUsdCents`.
8. A posted ledger transaction has at least two entries.
9. A posted ledger transaction has equal debit and credit totals.
10. Every entry in one ledger transaction uses accounts with the same currency.
11. Posted ledger transactions and entries are immutable.
12. Audit logs and FX observations are append-only.
13. A reversal references a different posted transaction and can occur only once.
14. A verified payment submission has reviewer and review timestamp data.
15. A rejected payment submission has a non-empty rejection reason.
16. A provisioned fulfillment has a provisioned timestamp.

Cross-row ledger balancing is implemented as a deferred PostgreSQL constraint trigger so all entries can be inserted within one database transaction before validation occurs at commit time. Positive and negative coverage is implemented in `tests/database/invariants.sql`.

## 4. Application transaction boundaries

The following commands must use database transactions:

- User creation in `PENDING_ACTIVATION` plus wallet, client ledger-account, and initial activation-workflow provisioning
- Successful activation plus attempt completion, `User.status = ACTIVE`, and audit logging
- Order placement plus immutable item/FX snapshots
- Payment proof submission plus order payment-status update
- Payment acceptance plus ledger posting, wallet projection, order update, fulfillment creation, and audit log
- Purchase posting plus wallet projection update
- Refund or reversal plus order state and audit log
- Fulfillment completion plus order roll-up state and audit log

Financial write transactions should be short. External API calls and file operations must occur outside the database transaction and be coordinated through idempotent states.

## 5. Deletion policy

- Financial, order, payment, fulfillment, and audit records are retained and use restrictive foreign keys.
- Catalog and user records are deactivated instead of deleted after use.
- Authentication sessions may be deleted during logout or revocation.
- Unused OAuth account links and expired verification tokens may be removed under a retention policy.
- Proof object deletion requires a documented retention policy; its database metadata should remain auditable when legally appropriate.

## 6. Indexing strategy

The schema includes indexes for:

- Client order history
- Moderator payment-review queues
- Fulfillment work queues and assignments
- Ledger account history
- Ledger reference and origin lookup
- Latest FX-rate lookup
- Catalog publication ordering
- Audit entity history and correlation tracing

Query plans must be reviewed with production-like data before adding redundant indexes.

## 7. Migration and validation sequence

1. Validate and format the Prisma schema.
2. Generate the initial Prisma migration.
3. Add named SQL check constraints.
4. Add deferred ledger-balance and immutability triggers.
5. Apply the migration to a disposable PostgreSQL database.
6. Seed reference data and system ledger accounts.
7. Run positive and negative invariant tests.
8. Apply to the development database only after review.

Migration generation and seed implementation are intentionally deferred until a PostgreSQL connection and the package toolchain are established in the next foundation prompt.
