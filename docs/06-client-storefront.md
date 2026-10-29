# Client Storefront

**Status:** Implemented  
**Decision date:** 2026-08-14  
**Scope:** Iteration 4 public storefront and activation-aware checkout entry

## 1. Scope

Iteration 4 introduces the public marketing page, searchable service catalog, service detail and tier selection, and the authenticated checkout entry shell. It does not yet persist orders, debit balances, accept proof uploads, or provision licenses; those remain application-service boundaries for the core ordering and client payment iterations.

## 2. Visual system

The design applies the approved 60–30–10 color psychology:

- **60% foundation:** midnight navy and warm off-white establish authority, legibility, and premium restraint.
- **30% trust/value:** corporate blue communicates reliability; emerald marks verified value and positive operational states.
- **10% accent:** gold/amber (`--accent`, with `--accent-soft` for badge backgrounds) is reserved for exclusivity- and urgency-flavored moments — featured/VIP badges and future high-intent CTAs (e.g. wholesale membership, "Invertir ahora") — rather than general-purpose emphasis. It is currently applied to the "Featured" badge on `ServiceCard` for services flagged `isFeatured`.

Tokens live in `src/app/globals.css`, alongside typography, surfaces, focus treatment, responsive utilities, and reduced-motion behavior. Motion is progressive enhancement and respects `prefers-reduced-motion`.

**Revision (2026-08-17):** the accent was originally implemented as violet. The color-psychology brief calls for gold/amber tied to exclusivity and savings/urgency for high-value moments, so the token was corrected and wired to a real usage (the featured-service badge) instead of sitting reserved and unused.

## 3. Route boundaries

| Route | Access | Responsibility |
| --- | --- | --- |
| `/` | Public | Positioning, trust signals, featured catalog entries, and primary calls to action |
| `/services` | Public | Searchable and category-filtered active catalog |
| `/services/[slug]` | Public | Service details, wholesale tier comparison, and offer selection |
| `/checkout/[sku]` | Authenticated | Rehydrates the user from the database and applies the centralized active-user capability guard |

Pending users can still authenticate and see the activation handoff. They cannot begin checkout. Suspended or disabled users receive a blocked state. Active users can review the selected offer, but no order is written until the server-authoritative ordering workflow is implemented.

All database-backed storefront and checkout routes run on the Node runtime. Authorization never relies on JWT role or status claims.

## 4. Catalog read model and seed

`catalogRepository` returns explicit serializable DTOs and converts Prisma `BigInt` prices to safe integer cents at the server boundary. Only active categories and services that contain at least one active offer are exposed. Public fixtures are deterministic and rerunnable through `prisma/seed.sql` using stable UUIDs and unique business keys.

The initial catalog contains six services across Productivity & AI, Creative Tools, and Growth Infrastructure, each with quantity-aware wholesale offers and manual fulfillment metadata.

PEN reference displays resolve the latest currently effective `USD/PEN` observation from `FxRate`. There is no application fallback constant; when no valid observation exists, the interface states that the reference is unavailable.

## 5. Checkout boundary

The checkout route deliberately delegates capability evaluation to `clientCapabilityService.createCheckout`, which invokes `requireActiveUser`. This preserves one authorization policy for every protected route, action, and service. The current screen is a review boundary only; prices, quantities, totals, wallet debits, and WhatsApp order messages will be derived and persisted by the ordering engine rather than trusted from client input.

The public WhatsApp destination is configured with `NEXT_PUBLIC_WHATSAPP_NUMBER`. No number is embedded in application code.

## 6. Accessibility and metadata

- Semantic landmarks and headings are used across public pages.
- Interactive controls have visible keyboard focus and minimum touch targets.
- Color is supported by text and iconography rather than acting as the sole state indicator.
- Animation is disabled or reduced according to the user’s system preference.
- Root metadata includes an AuraScale-specific Open Graph and large Twitter preview image at `public/og.png`.

## 7. Carried scope

- Endpoint/IP rate limiting for login, registration, proof upload, and order creation is explicitly scheduled for Iteration 7 production hardening and is required before public launch.
- Password reset is scheduled for Iteration 5 using hashed, single-use, expiring tokens and session revocation after a successful reset.

## 8. Test coverage added post-review (2026-08-17)

Iteration 4 originally shipped with zero new tests, leaving the unit-test count unchanged from Iteration 3. The following coverage was added, bringing the suite to 39 passing tests (1 additional test is conditionally skipped without `TEST_DATABASE_URL`, matching the existing convention):

- `tests/integration/catalog.integration.test.ts` — proves `catalogRepository` excludes a service whose only offers are inactive from both `listServices()` and `findBySlug()`, and that a visible service's inactive offers are stripped from its returned DTO (also asserts the Prisma `BigInt` price is converted to a safe `number`).
- `tests/integration/fx.integration.test.ts` — proves `fxRepository.findLatestRate` returns `null` (not a hardcoded fallback) when no observation exists and when the only observation has expired, and returns the correct numeric rate for a valid, currently effective observation. Fixture rows are intentionally left in place rather than deleted: `FxRate` is enforced append-only by a database trigger, and this matches the existing integration-test convention of not tearing down created fixtures.
- Pending-user checkout blocking was already covered by the Iteration 3 capability matrix (`checkout creation` / `createCheckout` is one of the ten `protectedMethods` cases in `tests/unit/activation-capability-gate.test.ts`); no gap existed there.

These are integration-tier tests (real PostgreSQL via a disposable Docker container, `prisma migrate deploy` + `prisma/seed.sql`) rather than mocked unit tests, because the filtering and no-fallback behavior live inside the Prisma query itself in the repository layer — there is no separate pure-logic layer above it to unit test in isolation, consistent with how `registration.integration.test.ts` already covers the registration repository/service boundary.
