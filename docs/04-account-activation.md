# AuraScale Account Activation

**Status:** Implemented in the persistence model  
**Migration:** `prisma/migrations/20260813110000_account_activation/migration.sql`  
**Database tests:** `tests/database/account-activation.sql`

## 1. Aggregate design

Account activation is a workflow aggregate separate from `User`. `User.status` is the fast authorization projection; `AccountActivation` and `AccountActivationAttempt` explain how, when, and by whom activation occurred.

The aggregate consists of:

- `ActivationProvider` — data-driven provider/adapter registry.
- `ActivationMethod` — data-driven method with a stable execution mode and provider.
- `AccountActivation` — one activation workflow/cycle.
- `AccountActivationAttempt` — execution history for manual actions, APIs, webhooks, bots, and retries.

The MVP seed uses:

| Record | Value |
| --- | --- |
| Method | `WHATSAPP_MANUAL` |
| Provider | `INTERNAL_WHATSAPP` |
| Execution mode | `MANUAL` |

V2 automation adds method/provider rows and an application adapter. It does not require restructuring the activation aggregate.

## 2. Transition matrix

The legal `AccountActivation.status` transitions are:

| Current | Allowed next states |
| --- | --- |
| `PENDING` | `IN_PROGRESS`, `REJECTED`, `EXPIRED`, `CANCELLED` |
| `IN_PROGRESS` | `ACTIVATED`, `REJECTED`, `EXPIRED`, `CANCELLED` |
| `ACTIVATED` | None |
| `REJECTED` | None |
| `EXPIRED` | None |
| `CANCELLED` | None |

`REJECTED` is intentionally terminal for that workflow record. Rejection does not require a user to re-register. After remediation or an admin decision, the application creates a new `PENDING` workflow for the same user while retaining the rejected workflow as immutable history.

Retries caused by transient execution failure do not move an activation back to `PENDING`. They create another `AccountActivationAttempt` while the workflow remains `IN_PROGRESS`.

Database enforcement includes:

- A transition trigger implementing the matrix.
- One open (`PENDING` or `IN_PROGRESS`) workflow per user.
- At most one `ACTIVATED` workflow per user.
- Unique workflow and attempt idempotency keys.
- Unique provider event IDs per provider.
- Immutable workflow identity/configuration fields.
- Attempt transitions only from `STARTED` to `SUCCEEDED` or `FAILED`.
- Required terminal-state evidence and human actor identity.

## 3. Actor and execution evidence

Every activation stores its selected method, provider, and execution-mode snapshot. The successful result records:

- `activatedActorType`: `HUMAN`, `SYSTEM`, `PROVIDER`, or `BOT`.
- `activatedByUserId` for human execution.
- `activatedAt`.
- `providerReference`, when supplied.

Every attempt additionally records its trigger, actor, provider, external request ID, idempotency key, sanitized metadata, result, and error information.

## 4. Wallet timing and authorization gate

The wallet and its client ledger accounts are provisioned atomically when the user is created. The wallet may therefore exist while `User.status = PENDING_ACTIVATION`, but existence does not grant access.

The application policy layer must expose a single server-side guard, conceptually `requireActiveUser`, and call it from every protected client query or command. The guard requires:

```text
authenticated session
AND User.role = CLIENT where a client capability is expected
AND User.status = ACTIVE
```

Until activation, the user may access only:

- Activation status
- Approved profile-correction fields
- Support/contact flow
- Logout

The following are blocked until `ACTIVE`:

- Wallet balance and ledger history reads
- Payment/deposit submissions
- Authenticated pricing or client-specific catalog operations
- Checkout and order creation
- Purchase, refund, or balance commands
- Fulfillment data

Public anonymous catalog browsing may remain available because it does not expose client data or permit a transaction.

This policy must be enforced inside server actions, route handlers, and application services. Middleware and hidden navigation are convenience layers, not authorization boundaries.

## 5. Activation transaction

Successful activation is one database transaction:

1. Authenticate and authorize the actor or provider event.
2. Lock/version-check the activation workflow.
3. Verify the workflow is `IN_PROGRESS` and the attempt is `STARTED`.
4. Complete the attempt as `SUCCEEDED`.
5. Mark the workflow `ACTIVATED` with actor evidence.
6. Change `User.status` from `PENDING_ACTIVATION` to `ACTIVE`.
7. Append an `AuditLog` entry.
8. Commit once.

The workflow and attempt idempotency keys make moderator retries, webhook redelivery, and bot retries safe.

## 6. Verification

The database suite proves:

- Valid manual activation succeeds.
- A rejected workflow is terminal.
- A new remediation workflow can follow rejection.
- Direct `PENDING -> ACTIVATED` is rejected.
- Concurrent open workflows are rejected.
- A second successful activation is rejected.
- Method/provider snapshots must match active registry data.
- An already active user cannot open another workflow.
- Human attempts require a human actor ID.
- Workflow, attempt, and provider-event idempotency uniqueness is enforced.
- Completed attempts are terminal.

