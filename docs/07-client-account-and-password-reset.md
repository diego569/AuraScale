# Client Account: Wallet, Ledger History, and Password Reset

**Status:** Implemented
**Decision date:** 2026-08-17
**Scope:** Iteration 5 — real wallet/ledger read model, password reset with email delivery, session invalidation on password change, and minimal session-aware navigation.

## 1. Scope

Iteration 5 turns the previously stubbed `getWalletBalance`/`getLedgerHistory` capability methods into real, tested read paths, and adds a full password-reset flow. It intentionally excludes order history and payment-proof upload — those remain scoped to the deposit/order-engine iteration, since no ledger transactions can be created by the application yet and a wallet/ledger history page is correctly empty for every account until that exists.

## 2. Wallet and ledger read model

- `walletRepository.findSummaryByUserId` reads the cached `Wallet.availableBalanceCents`/`pendingBalanceCents` projections directly (fast path), consistent with `02-database-schema.md`'s documented invariant that these projections must always be reproducible from the ledger.
- `ledgerRepository.listHistoryForUser` is a cursor-paginated (20/page) read of `LedgerEntry` joined to its `LedgerAccount` (for `purpose`) and `LedgerTransaction` (for `originType`, `description`, `postedAt`), scoped to the caller's own wallet via `LedgerAccount.walletId`.
- Both are wired into `ClientCapabilityService.getWalletBalance()` / `.getLedgerHistory(cursor?)`, which still call `requireActiveClient()` first — capability gating is unchanged, only the previously-stubbed payload is now real. The stubbed response shape (`{ userId }`) is preserved as a subset of the new response so the Iteration 3 capability matrix test required no changes.
- Route: `/account/wallet` — protected by the same `requireActiveUser`/`ActivationRequiredError`/`AccountUnavailableError` handling already established in the checkout route.

## 3. Password reset

### 3.1 Delivery channel

Two decisions were explicitly deferred to the user rather than assumed, since building the wrong one wastes real work: **(a)** WhatsApp-assisted vs. email vs. defer-delivery, and **(b)** which email provider. The user chose **email now, via Resend**. `src/lib/email.ts` wraps the Resend SDK behind a minimal `sendEmail({ to, subject, html })`; `RESEND_API_KEY` and `EMAIL_FROM` are new required/optional env vars (`.env.example` updated). Resend's shared sending domain (`onboarding@resend.dev`) works without DNS setup for the MVP; a verified custom sending domain is a production-readiness item, not implemented here.

### 3.2 Token model

`PasswordResetToken` (new table): `userId`, `tokenHash` (SHA-256 of a 256-bit random token — the raw token is never persisted, only ever appears in the emailed link), `expiresAt` (30 minutes), `consumedAt` (null until used). Enforced in the database, not just application code:

- `ck_password_reset_token_expiry_after_creation`, `ck_password_reset_token_consumed_after_creation` — named CHECK constraints.
- `ux_password_reset_token_one_pending_per_user` — a partial unique index on `(userId) WHERE consumedAt IS NULL`, mirroring the `AccountActivation` "one open workflow per user" pattern from `04-account-activation.md`. Requesting a new reset deletes any prior unconsumed token for that user first, so the old link stops working the moment a new one is issued.
- `requestPasswordReset` always returns `{ ok: true }` regardless of whether the email is registered, and only calls `sendEmail` when it is — this prevents the endpoint from being used to enumerate registered accounts.
- `resetPassword` is atomic: marks the token consumed, rotates `PasswordCredential.passwordHash`, clears `failedAttempts`/`lockedUntil`, and sets `PasswordCredential.passwordChangedAt`, all in one transaction.

### 3.3 Session invalidation without database sessions

Iteration 3 chose JWT sessions for the Credentials provider (a documented Auth.js constraint) while still re-verifying every capability against fresh database state per request. A JWT can't be revoked server-side, so "sign out other sessions after a reset" needed a mechanism consistent with that same "never trust the token, always recheck the database" principle rather than a session-strategy change:

- The Auth.js `session` callback now also exposes the JWT's standard `iat` (issued-at) claim as `session.issuedAtSeconds`.
- `createAuthorizationGuards` compares that timestamp against the freshly-loaded `PasswordCredential.passwordChangedAt` on every `requireAuthenticatedUser`/`requireActiveUser` call. A token issued before the last password change is rejected with a new `SessionInvalidatedError` (401, same handling as `AuthenticationRequiredError` — the UI simply redirects to sign-in).
- This still authorizes off current database state, not the token's claims — the token only supplies a timestamp to compare, exactly as `findCurrentUser` already supplies current role/status on every call.

### 3.4 UI

- `/forgot-password` — public, requests a reset link by email.
- `/reset-password/[token]` — public, sets a new password; the raw token lives only in the URL path, matching standard practice for single-use bearer reset links.
- `StorefrontHeader` is now session-aware (root layout resolves the session server-side and passes `authenticated`): signed-out users see "Forgot password?" next to "Sign in"; signed-in users see "My wallet" and "Sign out" instead.

## 4. Known pre-existing gaps (not introduced by this iteration, flagged for visibility)

- ~~There is still no custom login or registration page...~~ **Closed** — see [08-login-and-registration-ui.md](./08-login-and-registration-ui.md).
- `npm audit --omit=dev` reports a high-severity advisory in `deepmerge-ts`, pulled in transitively via `@prisma/config` (a dependency of `@prisma/client`). It predates this iteration's changes (not introduced by the `resend` addition) and fixing it requires a breaking downgrade of the `prisma` toolchain; tracked for the Iteration 7 hardening pass rather than fixed here.

## 5. Verification

- Migration `20260817165449_password_reset_and_wallet_read_model` replayed cleanly from an empty database, twice, alongside all three prior migrations.
- `prisma/seed.sql` re-ran idempotently after the new migration.
- New SQL suite `tests/database/password-reset.sql`: both CHECK constraints and the partial unique index rejected invalid data; a second token was correctly accepted once the first was consumed.
- All three prior SQL suites (`invariants.sql`, `account-activation.sql`, `authentication.sql`) still pass unchanged.
- Test suite: 44 passing (34 pre-existing + 10 added: 3 guard-invalidation unit tests, 5 catalog/FX integration tests carried from the prior review round, 2 password-reset integration tests covering request/no-enumeration and reset/reuse-rejection).
- `tsc --noEmit`, `next build`, `prisma validate`, and `prisma migrate diff` (no drift) all pass.
- Root layout now reads the session on every request, which makes `/_not-found` dynamic instead of statically prerendered (previously the only static route). This is an accepted, minor tradeoff for session-aware navigation in an already largely-dynamic app.
