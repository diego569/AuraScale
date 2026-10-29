# Moderation Dashboard

**Status:** Implemented
**Decision date:** 2026-08-17
**Scope:** Payment review queue (accept/reject), the ledger posting that Accept triggers, the fulfillment queue, and the client-visible delivery result. This is the piece every prior iteration has been building toward — submitted proofs finally have something to act on them.

**Explicitly out of scope**, flagged rather than silently dropped:

- **Service/price management and user status controls** (suspend, role changes) — the original blueprint bundled these into "Iteration 6" alongside payment review, but they're a separate concern (catalog/user administration, not the payment-review transactional core) and weren't part of what was asked. The first moderator account still has to be created by hand (see §5) — there is no self-service promotion UI.
- **Order-expiry sweep** — still nothing transitions a stale `PLACED`/`UNPAID` order to `EXPIRED` (carried from the order-engine iteration).
- **Encrypted fulfillment delivery data** — `Fulfillment.deliveryDataCiphertext`/`encryptionKeyVersion` exist in the schema for secrets (license keys, credentials) but aren't used yet; "mark delivered" only captures a plain `clientVisibleMessage`. Real secret delivery needs a key-management decision before it's built.

## 1. The ledger posting (the part that had to be right)

This is the system's most important transactional boundary, and the interpretation needed to be decided since the schema supports more than one reading. [payment-review.service.ts](../src/services/moderation/payment-review.service.ts) `acceptPaymentSubmission`:

**What gets posted, and why:** two entries — DEBIT `PAYMENT_CLEARING` (asset), CREDIT `PLATFORM_REVENUE` (revenue) — both for the order's authoritative `totalUsdCents`. **Nothing touches `CLIENT_AVAILABLE`/`CLIENT_PENDING`.** Reasoning: those two accounts track the client's own spendable wallet balance. An order-linked payment is a direct purchase paid externally (via WhatsApp-coordinated transfer) for one specific order — the client isn't depositing money into a balance they'll spend later, so routing it through their wallet accounts first (deposit, then immediately debit as a purchase) would be a fiction that nets to zero but pollutes their ledger history with two invented entries. This was verified live: after a full accept + fulfillment cycle, the client's wallet still correctly shows $0.00 available and pending, with no phantom activity.

**What gets verified:** the order's own `totalUsdCents`, not an FX-converted version of the client's self-reported `reportedAmountMinor`/`reportedCurrencyCode`. Accept means "the moderator confirms this order's total was paid" — building live FX-conversion-at-verification-time was more complexity than this MVP needed, and the self-reported figure remains visible to the moderator (and preserved on the submission row) for their own judgment call before clicking Accept.

**Idempotency, two layers deep:**
1. Accept/Reject both open with a *conditional* `updateMany` — `WHERE status IN ('SUBMITTED','UNDER_REVIEW')` — and check the affected row count. A double-click or retry that arrives after the first one already landed matches zero rows and raises `SUBMISSION_ALREADY_REVIEWED` instead of re-processing.
2. `LedgerTransaction.paymentSubmissionId` is `@unique` in the schema (not new — already there from Iteration 1). Even if the conditional update somehow raced past the first guard, a second `LedgerTransaction` for the same submission would hit that constraint. Verified directly: accepting the same submission twice throws on the second call and the transaction count stays at exactly 1.

Order transitions: `status` → `PROCESSING`, `paymentStatus` → `VERIFIED`, `fulfillmentStatus` → `QUEUED`. One `Fulfillment` row is created per `OrderItem` (`QUEUED`), carrying forward the strategy/provider snapshotted at order-creation time.

Reject requires a non-blank reason (enforced in the service *and* already enforced at the database via `ck_payment_submission_rejected_review`), sets `Order.paymentStatus` back to `REJECTED` — which the existing client-side order page already treats as eligible for resubmission, so nothing needed to change there.

## 2. Fulfillment completion

[fulfillment.service.ts](../src/services/moderation/fulfillment.service.ts) `markFulfillmentProvisioned` — same conditional-update idempotency pattern. Also writes a `FulfillmentAttempt` row (`trigger: MANUAL`, `status: SUCCEEDED`, actor recorded), matching the audit-trail rigor already established for `AccountActivationAttempt` — capturing *who did what* as data, not just the final state.

Once every `Fulfillment` for an order reaches `PROVISIONED`, the order itself flips to `fulfillmentStatus: PROVISIONED`, `status: COMPLETED`, `completedAt` set. Verified with the (current, single-item) checkout flow; the check iterates all sibling fulfillments so multi-item orders will complete correctly once the checkout flow supports them.

## 3. Access control

`requireModerator()` (new, in [server-authorization.ts](../src/policies/server-authorization.ts)) is just `requireActiveUser({ roles: ["MODERATOR", "ADMIN"] })` — no new guard logic, reusing the same database-re-verified authorization already built in Iteration 3. Every `/mod/*` page and every moderation Server Action calls it independently (page-level and action-level, not just one or the other).

Verified live: a `CLIENT`-role user hitting `/mod` never renders any queue content — `RoleForbiddenError` bounces them through `/login`, which (since they're still authenticated) redirects them onward to their own wallet page. That chained redirect is functional but not polished — a dedicated "not authorized" page would read better than silently landing on an unrelated page; noted as a small UX gap, not a security one.

## 4. UI

- `/mod` — payment review queue: client info, order total vs. self-reported amount/currency, reference/note, links to each proof (reusing the existing owner-or-moderator-gated proof route from the order-engine iteration — no changes needed there, it already had the `MODERATOR`/`ADMIN` branch built in ahead of time), Accept and Reject (reason required) as two independent plain forms.
- `/mod/fulfillments` — queued/in-progress fulfillments with a delivery-message field and "Mark delivered."
- Order detail page (client-facing) now shows the fulfillment's `clientVisibleMessage` once `PROVISIONED` — the "client-visible delivery result" from the original blueprint.
- `(moderation)/mod/layout.tsx` adds a small dark nav bar for the two mod pages. It's still wrapped by the root layout's storefront header/footer (client-facing "Explore tiers" / "Create account" links included) since fully separating the mod shell from the storefront chrome would mean restructuring the root layout — left as a cosmetic gap, not attempted here.

## 5. Provisioning the first moderator account

There is still no admin UI for role/status management (explicitly out of scope above). For this iteration's live verification, a moderator account was created the same way test-user activation has been handled since the order-engine iteration: register a normal account through `/register`, then hand-promote it —

```sql
UPDATE "User" SET role = 'MODERATOR' WHERE email = '...';
```

This is an operational step, not a feature gap unique to this iteration — the same manual-activation precedent already applies to every test user in this session.

## 6. Verification

- 57 tests passing (52 prior + 5 new, in [moderation.integration.test.ts](../tests/integration/moderation.integration.test.ts)): balanced-ledger accept, double-accept idempotency (transaction count stays 1), reject with mandatory reason + already-reviewed rejection, fulfillment provisioning with order auto-completion + double-provision idempotency, and repository queue-membership transitions.
- `tsc --noEmit`, `next build`, `prisma validate`, `prisma migrate diff` (no drift — no schema changes this iteration), and all 4 SQL invariant suites pass.
- **Full live walkthrough**, two real accounts (a promoted moderator and a separate client), through the entire loop: register → activate → place a real order → upload a real proof → moderator reviews the actual queue (correctly mixed with leftover integration-test fixtures from earlier in the session, confirming the query is genuinely reading live data) → Accept → confirmed the exact ledger entries in Postgres directly → Fulfillment queue → Mark delivered → back to the client's own order page, which showed the *exact* delivery message the moderator typed → confirmed the client's wallet still reads $0.00/no activity → confirmed the client is denied access to `/mod`.
