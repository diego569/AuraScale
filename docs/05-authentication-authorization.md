# AuraScale Authentication and Authorization

**Status:** Iteration 3 implemented  
**Authentication:** Auth.js Credentials  
**Authorization source:** Current PostgreSQL user record

## 1. Authentication is not activation

Authentication proves identity. Activation grants client capabilities. The two checks are intentionally separate:

```text
valid credentials + PENDING_ACTIVATION = login succeeds
valid session + PENDING_ACTIVATION     = protected capability denied
valid session + ACTIVE                 = capability evaluated by role
```

Pending users may access activation status, approved profile correction, support/contact, and logout. Suspended and disabled users cannot authenticate or use an existing session after the database-state recheck.

## 2. Session decision

Auth.js Credentials requires JWT sessions. AuraScale therefore uses Auth.js encrypted, HTTP-only session cookies for the MVP credential provider. The JWT stores only the stable user ID needed to locate the subject.

Authorization never trusts role or status cached in the token. `requireAuthenticatedUser` and `requireActiveUser` load the current user from PostgreSQL for every protected request. Activation, suspension, disabling, and role changes therefore take effect immediately without waiting for token expiry.

The existing Auth.js `Session`, `Account`, and `VerificationToken` tables remain available for future OAuth or passwordless providers that support database sessions.

## 3. Central policy guards

`createAuthorizationGuards` defines two distinct policies:

- `requireAuthenticatedUser` — requires a valid session and permits `PENDING_ACTIVATION`.
- `requireActiveUser` — additionally requires `ACTIVE` and optionally an allowed role set.

The production `server-authorization` adapter supplies Auth.js session lookup and the PostgreSQL user repository. Protected service methods use one injected `requireActiveUser({ roles: ['CLIENT'] })` function. Server actions and route handlers delegate to those services rather than implementing status checks independently.

Errors are typed and map to stable HTTP behavior:

| Error code | HTTP | Meaning |
| --- | ---: | --- |
| `AUTHENTICATION_REQUIRED` | 401 | No valid session/current user |
| `SESSION_INVALIDATED` | 401 | Session issued before the account's most recent password change (Iteration 5) |
| `ACTIVATION_REQUIRED` | 403 | Authenticated but pending |
| `ACCOUNT_UNAVAILABLE` | 403 | Suspended or disabled |
| `ROLE_FORBIDDEN` | 403 | Active but wrong role |

## 4. Activation-gated capability matrix

Every listed capability is individually exercised by the unit suite:

| Capability | Pending | Active client |
| --- | --- | --- |
| Wallet balance read | Denied | Allowed |
| Ledger history read | Denied | Allowed |
| Payment/deposit submission | Denied | Allowed |
| Authenticated catalog pricing | Denied | Allowed |
| Checkout creation | Denied | Allowed |
| Order creation | Denied | Allowed |
| Purchase execution | Denied | Allowed |
| Refund request | Denied | Allowed |
| Balance command | Denied | Allowed |
| Fulfillment-data read | Denied | Allowed |

Public anonymous catalog reads are outside this client capability service and remain public.

## 5. Credential security

- Passwords are hashed with Argon2id.
- The registration policy requires 12–128 characters with lowercase, uppercase, and numeric characters.
- Email identifiers are trimmed and normalized to lowercase.
- Unknown emails use a valid sentinel hash verification path to reduce timing disclosure.
- Failed passwords are counted.
- Five consecutive failures create a 15-minute credential lock.
- Successful authentication clears prior failures.
- Suspended and disabled accounts are rejected even when the password matches.

## 6. Registration transaction

Registration atomically creates:

1. A `CLIENT` user in `PENDING_ACTIVATION`.
2. An Argon2id `PasswordCredential`.
3. A zero-balance USD wallet.
4. Client available and pending liability ledger accounts.
5. A `WHATSAPP_MANUAL` activation workflow using `INTERNAL_WHATSAPP`.
6. An audit event.

If any step fails, the entire transaction rolls back.

## 7. Server entry points

- `POST/GET /api/auth/[...nextauth]` — Auth.js protocol routes.
- `GET /api/account/activation-status` — authenticated and pending-safe.
- `GET /api/account/wallet` — active-client gated.
- `client-capability.actions.ts` — active-client-gated Server Actions for all protected capability categories.
- `registration.actions.ts` — validated registration action.

## 8. Verification

Iteration 3 verification includes:

- Unit tests for authentication, activation, account availability, and roles.
- Parameterized pending/active tests for all ten protected capabilities.
- Tests proving pending activation status/profile/support access remains available.
- Credential tests proving pending and active login success are independent from authorization.
- A real PostgreSQL integration test for atomic registration and pending credential login.
- SQL checks for password persistence and default pending status.
- Clean three-migration deployment.
- Production Next.js build.
- Full activation and financial invariant regression suites.

## 9. Explicitly deferred security scope

Endpoint/IP rate limiting is not part of Iteration 3. The credential lock is account-scoped and is not a substitute for endpoint controls. Login, registration, proof upload, and order creation rate limits are mandatory Iteration 7 production-hardening gates and must be enabled before public production traffic.

Auth and protected account Route Handlers explicitly export the Node.js runtime. Authenticated client route segments also pin Node.js so database-backed authorization and future financial Server Actions cannot be deployed to Edge accidentally.

Password reset was implemented in Iteration 5: random single-use reset tokens, token hashes only, enforced expiration, and existing-session invalidation via a `passwordChangedAt`-vs-JWT-`iat` comparison (JWT sessions cannot be revoked server-side, so this is the mechanism, not a database-session switch). See [07-client-account-and-password-reset.md](./07-client-account-and-password-reset.md) for the full design.
