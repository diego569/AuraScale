# Order Engine, Order History, and Payment Proof Upload

**Status:** Implemented
**Decision date:** 2026-08-17
**Scope:** Checkout becomes mutating (creates a real, immutable-snapshot `Order`), order history and detail pages, and payment-proof upload with private local-disk storage.

**Explicitly out of scope**, matching the original roadmap's own sequencing: the **moderator accept/reject workflow**. Submitted proofs sit in `SUBMITTED`/`UNDER_REVIEW` with nothing to approve them yet — no ledger entry is ever posted by anything built in this iteration. That's the next gated iteration (moderation dashboard).

## 1. Storage decision

Payment-proof files (screenshots/PDFs) must be private, per the original blueprint. Offered four options — Vercel Blob, Cloudflare R2, AWS S3, or local disk (dev-only) — the user chose **local disk**. Implementation: [storage.ts](../src/lib/storage.ts), a tiny `putObject`/`getObject` pair writing under `.local-storage/` (gitignored, outside `public/`). Path-traversal is blocked by resolving the object path and verifying it stays within the storage root before any read/write.

**This is explicitly not production-viable** — no signed URLs, and most hosts wipe local disk on redeploy. "Private" is instead enforced entirely at the application layer: files are only ever served through the authenticated route below, never from a static path. Swapping the backend later means reimplementing `storage.ts`'s two functions against a real object store; nothing else in the codebase needs to change, since `PaymentProof.objectKey` is just an opaque string the schema already expected to be a provider-specific key.

## 2. Order creation

[order.service.ts](../src/services/orders/order.service.ts) `createOrder({ userId, sku, quantity })`:

- Re-validates the offer and quantity server-side (never trusts the checkout page's own clamped display value) — same "no client-provided price is trusted" principle as everywhere else.
- Snapshots service/offer name, SKU, unit price, and fulfillment strategy onto `OrderItem` so later catalog edits can't retroactively change a placed order.
- Resolves the user's preferred display-currency FX rate the same way the storefront does. **No fabricated fallback**: if no valid rate exists, the order's `displayCurrencyCode` degrades to `USD` for that order (matching `totalUsdCents` exactly) rather than storing a fabricated non-USD number — the schema's `displayTotalMinor` is non-nullable, so silently omitting it wasn't an option, and inventing a number was worse than admitting there's no reference rate.
- Order number format `AS-YYYYMMDD-XXXXX` (5 base36 chars), generated with a retry loop against the unique-constraint (P2002) in the rare event of a collision.
- `expiresAt` = 24 hours from creation (a reasonable default, not confirmed with the user — flagging it here as adjustable rather than treating it as a locked decision).
- Everything — `Order`, `OrderItem`, `AuditLog` — is one transaction.

The checkout page's "Continue securely" link is now a real `<form action={createOrderAction}>` (server action, no client JS needed) that redirects to `/account/orders/[orderNumber]` on success.

## 3. Payment proof submission

[payment-submission.service.ts](../src/services/payments/payment-submission.service.ts) `submitPaymentProof(...)`:

- Only accepted while the order's `paymentStatus` is `UNPAID` or `REJECTED` — a second submission while one is already `SUBMITTED`/`UNDER_REVIEW` is rejected (`ORDER_NOT_ELIGIBLE`), avoiding two simultaneous pending proofs for the same order. Resubmission after rejection is allowed (the existing `PaymentSubmission` rows are never deleted — history is preserved, matching the blueprint's "retain rejected attempts" requirement).
- File constraints ([validation/payment-proof.ts](../src/validation/payment-proof.ts)): JPEG/PNG/WEBP/PDF, 8MB max.
- The file is written to storage before the DB transaction commits. On the rare failure in between, this leaves an orphaned file with no `PaymentProof` row rather than a dangling DB reference to a missing file — the DB row is the source of truth for what "exists."
- On success: creates `PaymentSubmission` (status `SUBMITTED`) + `PaymentProof`, flips `Order.paymentStatus` to `PROOF_SUBMITTED`, writes an audit event. No ledger entry — that's the moderator-approval iteration's job.

## 4. Reading proofs back

`GET /api/account/payment-proofs/[proofId]` ([route.ts](../src/app/api/account/payment-proofs/[proofId]/route.ts)) is the only way a proof file is ever served. It requires an authenticated session (401 otherwise) and checks `submittedByUserId === session user` **or** role is `MODERATOR`/`ADMIN` (403 otherwise) — the moderator branch is unused today but built now so the moderation-dashboard iteration doesn't need to touch this route at all, mirroring how `FulfillmentStrategy`/`ActivationMethod` were built data-driven ahead of their V2 use.

## 5. UI

- `/account/orders` — order history, most recent first, ownership-scoped at the repository query itself (not filtered after the fact).
- `/account/orders/[orderNumber]` — status-aware: `UNPAID`/`REJECTED` shows the WhatsApp CTA + upload form; `PROOF_SUBMITTED`/`UNDER_REVIEW` shows an under-review banner; `VERIFIED` shows a verified banner + fulfillment status; full submission history with links to each proof file.
- Header gained "My orders" alongside the existing "My wallet"/"Sign out".
- [whatsapp.ts](../src/lib/whatsapp.ts) is new and consolidates what used to be a duplicated inline `whatsappActivationUrl()` in two pages, plus the new per-order payment message builder — the folder path the original blueprint had already reserved for this.

## 6. A real bug caught by live browser testing (not just build/typecheck)

`/login`, `/register`, and the root layout's header state all originally checked `getSessionPrincipal()` — which only decodes the JWT cookie, the same low-level primitive the guards use internally. That's fine *inside* a guard (which always re-verifies against the database afterward), but these three call sites used it **directly**, skipping the DB check. Result: a session cookie valid against a different/reset database (e.g. this dev container being swapped) made `/login` believe the user was signed in — redirecting to `/account/wallet` — while `/account/wallet` correctly found no such user and redirected back to `/login`. Infinite loop, only visible by actually clicking through the app, not from any static check.

Fixed by using `requireAuthenticatedUser()` (DB-verified, same as every other guard) in all three places instead, treating any rejection as "not authenticated." Documented so the same mistake isn't repeated: **never gate a page on `getSessionPrincipal()` directly** — it belongs inside `authorization.ts`'s guards only.

A second, smaller issue surfaced the same way: after registration or login, `router.push(url); router.refresh()` occasionally raced ahead of the just-set session cookie, briefly bouncing back to `/login` before a manual reload fixed it. Replaced with a full `window.location.href` navigation in both [login-form.tsx](../src/components/auth/login-form.tsx) and [register-form.tsx](../src/components/auth/register-form.tsx), which guarantees the fresh cookie is present on the very next request.

## 7. Verification

- Full clean-slate migration replay + idempotent double-seed.
- 52 tests passing (44 prior + 8 new): [order.integration.test.ts](../tests/integration/order.integration.test.ts) covers snapshot correctness, order-number format, quantity clamping, unknown-SKU rejection, and ownership-scoped history/detail lookups; [payment-proof.integration.test.ts](../tests/integration/payment-proof.integration.test.ts) covers successful submission (including a SHA-256 round-trip through actual storage), the one-pending-submission rule, resubmission-after-rejection, and file-size/mime-type rejection.
- `tsc --noEmit`, `next build`, `prisma validate`, and `prisma migrate diff` (no drift — this iteration added no schema) all pass.
- All 4 SQL invariant suites still pass unchanged.
- **Live end-to-end walkthrough in a real browser** (not just automated tests): registered a client, manually activated it in the database (standing in for the not-yet-built moderator panel), placed a real order from the catalog, confirmed the persisted snapshot in Postgres, uploaded a payment proof with an actual `File`/`DataTransfer`, watched the order flip to `PROOF_SUBMITTED`, downloaded the proof back as its owner, and confirmed a signed-out request gets 401 while a different authenticated user gets 403.

## 8. Carried scope

- Moderator accept/reject workflow — next iteration.
- Real object storage (Vercel Blob/R2/S3) — required before any real payment proof is uploaded in production.
- Order `expiresAt` (24h) has no expiry sweep/cron yet; nothing currently transitions a stale `PLACED`/`UNPAID` order to `EXPIRED`.
- Endpoint/IP rate limiting (carried since Iteration 3) now also applies to order creation and proof upload, both new mutating endpoints — still pending Iteration 7.
