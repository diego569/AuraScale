# Login and Registration UI

**Status:** Implemented
**Decision date:** 2026-08-17
**Scope:** Closes the pre-existing gap flagged at the end of Iteration 5 — there was no custom sign-in or sign-up page, so no one could actually create an account through the interface. This is UI wiring only: no changes to the authentication/authorization backend built in Iteration 3, and no new schema.

## 1. What existed before

- `registerClientAction` ([registration.actions.ts](../src/actions/registration.actions.ts)) had no UI caller.
- "Sign in" links pointed at Auth.js's default, unstyled `/api/auth/signin` page, which only supports sign-in (Credentials provider has no built-in registration form).

## 2. What was added

- **`/login`** ([page.tsx](../src/app/(authentication)/login/page.tsx), [LoginForm](../src/components/auth/login-form.tsx)) — calls `signIn("credentials", { email, password, redirect: false, callbackUrl })` from `next-auth/react` client-side (this does not require a `SessionProvider`; `signIn`/`signOut` are standalone fetch-based helpers, only `useSession()` needs the provider). Invalid credentials render inline as "Invalid email or password." — the same generic message regardless of whether the email exists, wrong password, or a locked/suspended account, consistent with the existing credential-authenticator's uniform-failure design (`05-authentication-authorization.md §5`).
- **`/register`** ([page.tsx](../src/app/(authentication)/register/page.tsx), [RegisterForm](../src/components/auth/register-form.tsx)) — collects name, email, WhatsApp phone, and password (country/currency are omitted from the form; `registerClientAction` already defaults them to `PE`/`PEN` when absent, matching the current single-market MVP). On success it immediately calls `signIn("credentials", ...)` so the new user lands authenticated rather than being asked to log in again, then redirects to `/account/wallet` — which correctly shows the existing "Activation required" / WhatsApp handoff screen for a freshly-registered `PENDING_ACTIVATION` user.
- **`auth-options.ts`** now sets `pages: { signIn: "/login" }` so any Auth.js-internal redirect (not just our own) lands on the branded page.
- **`callbackUrl` handling**: `/login` validates it's a same-origin relative path (`startsWith("/")`, rejecting `//host` protocol-relative redirects) before using it, defaulting to `/account/wallet` otherwise — this closes an open-redirect risk since the param is attacker-controllable.
- **Already-authenticated guard**: both `/login` and `/register` check the session server-side and redirect away (to the callback URL / wallet) rather than showing the form again.
- **`checkout/[sku]`** and **`account/wallet`** now redirect unauthenticated visitors to `/login?callbackUrl=...` instead of `/api/auth/signin?callbackUrl=...`. The checkout page's error handling also picked up the `SessionInvalidatedError` case it was missing (it had `AuthenticationRequiredError` only; `account/wallet`, built after the password-reset session-invalidation work, already had both — this brings checkout in line).
- **`StorefrontHeader`**: signed-out state now shows "Sign in" (`/login`) + "Create account" (`/register`) instead of "Sign in" + a header-level "Forgot password?" link — the forgot-password link moved to live inside the login form itself (next to the password field), which is the more conventional place for it. Signed-in state is unchanged ("My wallet" / "Sign out").
- Sign-out still uses Auth.js's default confirmation page (`/api/auth/signout`) — building a custom one wasn't part of "login/register pages" and the default is a single low-risk confirm-and-clear-cookie flow.

## 3. Verification

Run against a live dev server (`next dev`) backed by a disposable Postgres container with the standard migrate+seed, driven through a real browser end to end (not just typecheck/build):

- Registration with a new email → session established → landed on `/account/wallet` showing the activation-required screen.
- Header correctly flips from "Sign in / Create account" to "My wallet / Sign out" after authentication, and back after sign-out.
- Sign-out clears the session (`/api/auth/session` empty afterward).
- Login with the wrong password → `POST /api/auth/callback/credentials` → 401 → "Invalid email or password." shown inline, no session created.
- Login with the correct password → 200 → session established → redirected to the wallet page.
- Visiting `/checkout/[sku]` while signed out → redirected to `/login?callbackUrl=%2Fcheckout%2F...`; signing in from there lands back on that exact checkout page (not a generic landing page).
- Visiting `/login` or `/register` while already authenticated → redirected away, form not shown.
- `tsc --noEmit`, `next build`, and the full 44-test suite all pass unchanged.

## 4. Still not built (unchanged from before)

Email verification (the `verify` route from the original folder-structure sketch) and any password-strength meter/live validation beyond the existing 12-character/upper/lower/number Zod rule remain out of scope — not requested, and `User.emailVerified` isn't read anywhere yet.
