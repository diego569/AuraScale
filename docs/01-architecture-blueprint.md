# AuraScale Architecture Blueprint

**Status:** Approved  
**Decision date:** 2026-08-12  
**Scope:** MVP architecture and domain boundaries

## 1. Product language and scope

AuraScale is a wholesale access and digital service license resale platform. Clients use pre-paid USD balances exclusively to purchase access tiers and service licenses.

Approved domain terms:

- Wholesale Access Tier
- Digital Service License
- Pre-paid Balance
- Deposit
- Earning
- Promotional Credit
- Refund
- Purchase

## 2. Architectural style

AuraScale uses a modular monolith built with Next.js App Router and TypeScript. The public storefront, authenticated client portal, and moderation dashboard live in one deployable application while remaining separated by route groups, layouts, policies, components, and domain services.

The application is divided into these bounded contexts:

1. **Identity and Access** — authentication, sessions, roles, and user status.
2. **Account Activation** — method/provider registry, activation workflows, actors, and attempt history.
3. **Reference Data** — countries, currencies, payment methods, and FX rates.
4. **Catalog** — service categories, digital services, offers, and wholesale tiers.
5. **Ordering** — server-authoritative pricing, snapshots, and order lifecycle.
6. **Payments** — manual proof submission and moderator review, with future provider support.
7. **Ledger** — USD wallets, immutable double-entry postings, and balance projections.
8. **Fulfillment** — manual provisioning in V1 and API provisioning in V2.
9. **Governance** — immutable audit events and privileged-action traceability.

## 3. Technology decisions

| Concern | Decision |
| --- | --- |
| Framework | Next.js App Router with strict TypeScript |
| Database | PostgreSQL |
| ORM | Prisma ORM with versioned SQL migrations |
| Authentication | Auth.js with database sessions |
| Authorization | Server-enforced RBAC: `CLIENT`, `MODERATOR`, `ADMIN` |
| Validation | Zod at every trust boundary |
| Styling | Tailwind CSS and CSS design tokens |
| Components | shadcn/ui with Radix primitives |
| Animation | Motion for React, respecting reduced-motion preferences |
| Forms | React Hook Form with shared Zod schemas |
| Proof storage | Private S3-compatible object storage with signed reads |
| Transactional email | Resend, for password-reset delivery (Iteration 5) |
| Testing | Vitest, React Testing Library, and Playwright |

## 4. Financial architecture

### 4.1 Authoritative currency

- USD is the only authoritative wallet and ledger currency.
- Prices, balances, and ledger entries use integer USD cents.
- Floating-point values are prohibited for monetary calculations.
- No fractional-cent accrual is required.
- Local currencies are display and payment-reporting references only.

### 4.2 FX conversion

FX rates are stored as fixed-precision decimal records. V1 rates are entered manually; the source fields also support future API ingestion. When an order is placed, the rate and converted display amount are copied onto the order as immutable commercial snapshots.

Historical orders must never be recalculated when a newer rate is added.

### 4.3 Wallets and ledger

Each client owns one USD wallet. The wallet exposes cached available and pending balances, but those values are projections rather than the financial source of truth.

The source of truth is an immutable double-entry ledger:

- Every posting contains at least two entries.
- Total debits equal total credits.
- Every amount is a positive integer number of USD cents.
- Posted entries are never edited or deleted.
- Corrections use explicit reversal postings.
- Idempotency keys prevent duplicate deposits, purchases, refunds, or adjustments.
- Ledger origins support `DEPOSIT`, `EARNING`, `PROMO_CREDIT`, `REFUND`, `PURCHASE`, `MANUAL_ADJUSTMENT`, and `REVERSAL`.

### 4.4 Payment approval boundary

The moderator's payment acceptance is one atomic database operation:

1. Verify the order and submission are still reviewable.
2. Apply an optimistic version check or database lock.
3. Mark the payment submission as verified.
4. Post the balanced deposit transaction.
5. Update the wallet projection.
6. update the order payment state.
7. Create or queue fulfillment records.
8. Append an audit event.
9. Commit all changes together.

A retry with the same acceptance idempotency key must return the original result without creating another financial posting.

## 5. Payment architecture

Payment methods are records, not hardcoded provider branches. The initial seed is `WHATSAPP_MANUAL`, enabled for Peru (`PE`). Future records can include Stripe, bank transfer, digital wallet, and crypto providers. Provider secrets are never stored in the method's public configuration.

Method availability is associated with ISO 3166-1 alpha-2 country records. Provider-specific behavior belongs behind payment application services and adapters, not in order entities or UI components.

Payment proofs fund a client wallet and may optionally be associated with an order. This supports both the V1 order-linked approval journey and future standalone pre-paid top-ups. Proofs are stored privately. Database rows retain object keys and file metadata, while short-lived signed URLs provide controlled moderator access.

## 6. Fulfillment architecture

Every service offer declares a fulfillment strategy:

- `MANUAL` — V1 moderator-driven provisioning.
- `API_AUTOMATIC` — V2 provider-driven provisioning.

The selected strategy and provider code are snapshotted on the order item. A fulfillment record has its own idempotency key, provider reference, encrypted delivery payload, and attempt history. Attempts support manual actions, outbound API calls, retries, and inbound webhooks.

## 7. Authorization and security

- `CLIENT` can access only their own wallet, orders, submissions, and fulfillments.
- `MODERATOR` can review submissions and perform fulfillment operations.
- `ADMIN` can additionally manage users, roles, catalog, reference data, and manual financial adjustments.
- Route guards improve navigation but are not security boundaries.
- Every server action, route handler, and application service enforces authorization.
- Client-supplied prices, roles, balances, order totals, and FX rates are never trusted.
- Sensitive fulfillment data is encrypted before persistence and excluded from logs.
- Payment proof uploads validate authorization, file size, declared type, file signature, and checksum.
- All privileged state changes produce audit events with correlation IDs.

## 8. Target project structure

```text
AuraScale/
├─ docs/
│  ├─ 01-architecture-blueprint.md
│  ├─ 02-database-schema.md
│  ├─ 03-migrations-and-seeding.md
│  ├─ 04-account-activation.md
│  ├─ 05-authentication-authorization.md
│  └─ 06-client-storefront.md
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.sql
├─ prisma.config.ts
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ (storefront)/
│  │  ├─ (authentication)/
│  │  ├─ (client)/account/
│  │  ├─ (moderation)/mod/
│  │  └─ api/
│  ├─ actions/
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ storefront/
│  │  ├─ client/
│  │  └─ moderation/
│  ├─ domain/
│  │  ├─ identity/
│  │  ├─ account-activation/
│  │  ├─ reference-data/
│  │  ├─ catalog/
│  │  ├─ ordering/
│  │  ├─ payments/
│  │  ├─ ledger/
│  │  └─ fulfillment/
│  ├─ services/
│  ├─ repositories/
│  ├─ policies/
│  ├─ validation/
│  ├─ lib/
│  └─ styles/
└─ tests/
   ├─ unit/
   ├─ integration/
   ├─ database/
   └─ e2e/
```

Iteration 1 intentionally creates only the architecture documents, Prisma schema, and Prisma configuration. Application, UI, seed, and migration implementation will be added in their approved iterations.

## 9. Delivery sequence

1. Foundation and database schema
2. Authentication and authorization
3. Core order, payment, FX, and ledger engine
4. Client storefront
5. Client account and payment proof workflow
6. Moderation dashboard
7. Production hardening
8. Post-MVP provider automation and growth systems
