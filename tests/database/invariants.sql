\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert_rejected(
  test_name text,
  statement_under_test text,
  expected_constraint text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  actual_constraint text;
BEGIN
  BEGIN
    EXECUTE statement_under_test;
    RAISE EXCEPTION 'NEGATIVE TEST FAILED: % accepted invalid data', test_name;
  EXCEPTION
    WHEN check_violation OR unique_violation OR foreign_key_violation OR object_not_in_prerequisite_state THEN
      GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
      IF expected_constraint IS NOT NULL AND actual_constraint IS DISTINCT FROM expected_constraint THEN
        RAISE EXCEPTION
          'NEGATIVE TEST FAILED: % expected constraint %, got %',
          test_name,
          expected_constraint,
          COALESCE(actual_constraint, '<none>');
      END IF;
      RAISE NOTICE 'PASS negative: % rejected by %', test_name, COALESCE(actual_constraint, SQLSTATE);
  END;
END;
$$;

-- Stable valid fixtures used by both positive and negative cases.
INSERT INTO "User" (
  "id", "email", "name", "role", "status", "locale",
  "displayCurrencyCode", "countryCode", "createdAt", "updatedAt"
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  'invariant-client@aurascale.test',
  'Invariant Client',
  'CLIENT',
  'ACTIVE',
  'es-PE',
  'PEN',
  'PE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "User" (
  "id", "email", "name", "role", "status", "locale",
  "displayCurrencyCode", "countryCode", "createdAt", "updatedAt"
) VALUES (
  '10000000-0000-4000-8000-000000000002',
  'invariant-moderator@aurascale.test',
  'Invariant Moderator',
  'MODERATOR',
  'ACTIVE',
  'es-PE',
  'PEN',
  'PE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "Wallet" (
  "id", "userId", "currencyCode", "status", "availableBalanceCents",
  "pendingBalanceCents", "version", "createdAt", "updatedAt"
) VALUES (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'USD', 'ACTIVE', 10000, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "LedgerAccount" (
  "id", "walletId", "code", "name", "category", "purpose",
  "currencyCode", "status", "createdAt", "updatedAt"
) VALUES (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'CLIENT:TEST:AVAILABLE:USD',
  'Test client available balance',
  'LIABILITY', 'CLIENT_AVAILABLE', 'USD', 'ACTIVE',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "ServiceCategory" (
  "id", "name", "slug", "sortOrder", "isActive", "createdAt", "updatedAt"
) VALUES (
  '40000000-0000-4000-8000-000000000001',
  'Test category', 'test-category', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "Service" (
  "id", "categoryId", "name", "slug", "status", "createdAt", "updatedAt"
) VALUES (
  '41000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'Test service', 'test-service', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "ServiceOffer" (
  "id", "serviceId", "providerCode", "name", "sku", "unitPriceUsdCents",
  "minimumQuantity", "maximumQuantity", "fulfillmentStrategy", "isActive",
  "sortOrder", "createdAt", "updatedAt"
) VALUES (
  '42000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001',
  'INTERNAL_MANUAL', 'Test tier', 'TEST-TIER-001', 2500,
  1, 10, 'MANUAL', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "FxRate" (
  "id", "baseCurrencyCode", "quoteCurrencyCode", "rate", "sourceKind",
  "source", "effectiveAt", "createdAt"
) VALUES (
  '50000000-0000-4000-8000-000000000001',
  'USD', 'PEN', 3.75, 'MANUAL', 'INVARIANT_TEST', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "Order" (
  "id", "orderNumber", "userId", "countryCode", "paymentMethodCode",
  "status", "paymentStatus", "fulfillmentStatus", "baseCurrencyCode",
  "displayCurrencyCode", "fxRateId", "fxRateSnapshot", "subtotalUsdCents",
  "discountUsdCents", "totalUsdCents", "displayTotalMinor", "version",
  "createdAt", "updatedAt"
) VALUES (
  '60000000-0000-4000-8000-000000000001',
  'TEST-ORDER-001',
  '10000000-0000-4000-8000-000000000001',
  'PE', 'WHATSAPP_MANUAL', 'PLACED', 'UNPAID', 'NOT_STARTED',
  'USD', 'PEN', '50000000-0000-4000-8000-000000000001', 3.75,
  5000, 0, 5000, 18750, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "OrderItem" (
  "id", "orderId", "serviceId", "serviceOfferId", "serviceNameSnapshot",
  "offerNameSnapshot", "skuSnapshot", "unitPriceUsdCents", "quantity",
  "lineTotalUsdCents", "fulfillmentStrategySnapshot", "providerCodeSnapshot",
  "createdAt"
) VALUES (
  '61000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000001',
  'Test service', 'Test tier', 'TEST-TIER-001', 2500, 2, 5000,
  'MANUAL', 'INTERNAL_MANUAL', CURRENT_TIMESTAMP
);

INSERT INTO "PaymentSubmission" (
  "id", "walletId", "orderId", "submittedByUserId", "paymentMethodCode",
  "reportedCurrencyCode", "reportedAmountMinor", "normalizedUsdCents",
  "status", "createdAt", "updatedAt"
) VALUES (
  '70000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'WHATSAPP_MANUAL', 'PEN', 18750, 5000, 'SUBMITTED',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "PaymentProof" (
  "id", "paymentSubmissionId", "objectKey", "originalFileName", "mimeType",
  "sizeBytes", "sha256", "createdAt"
) VALUES (
  '71000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'test/proof.png', 'proof.png', 'image/png', 1024,
  repeat('a', 64), CURRENT_TIMESTAMP
);

INSERT INTO "Fulfillment" (
  "id", "orderItemId", "strategy", "providerCode", "status",
  "idempotencyKey", "createdAt", "updatedAt"
) VALUES (
  '80000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000001',
  'MANUAL', 'INTERNAL_MANUAL', 'QUEUED', 'fulfillment:test:001',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "AuditLog" (
  "id", "action", "entityType", "entityId", "createdAt"
) VALUES (
  '90000000-0000-4000-8000-000000000001',
  'TEST_CREATED', 'TEST', 'fixture', CURRENT_TIMESTAMP
);

-- Positive proof: a valid two-entry posting is accepted by the deferred trigger.
INSERT INTO "LedgerTransaction" (
  "id", "originType", "idempotencyKey", "description", "postedAt", "createdAt"
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'DEPOSIT', 'ledger:test:balanced', 'Balanced test posting', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "LedgerEntry" (
  "id", "ledgerTransactionId", "ledgerAccountId", "sequence", "direction",
  "amountCents", "createdAt"
) VALUES
  (
    'a1000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000101', 0, 'DEBIT', 5000, CURRENT_TIMESTAMP
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001', 1, 'CREDIT', 5000, CURRENT_TIMESTAMP
  );

SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;
\echo 'PASS positive: valid schema fixtures and balanced posting accepted'

-- 1. Uppercase canonical codes.
SELECT pg_temp.assert_rejected(
  '1 uppercase currency codes',
  $sql$INSERT INTO "Currency" ("code", "name", "symbol", "minorUnits", "isActive", "createdAt", "updatedAt")
       VALUES ('eur', 'Euro', 'EUR', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)$sql$,
  'ck_currency_code_uppercase'
);

-- 2. Wallet/ledger/order authoritative currency is USD.
SELECT pg_temp.assert_rejected(
  '2 wallet currency must be USD',
  $sql$UPDATE "Wallet" SET "currencyCode" = 'PEN' WHERE "id" = '20000000-0000-4000-8000-000000000001'$sql$,
  'ck_wallet_currency_usd'
);

-- 3. FX rates are positive, USD-based, and cross-currency.
SELECT pg_temp.assert_rejected(
  '3 FX rate must be positive',
  $sql$INSERT INTO "FxRate" ("id", "baseCurrencyCode", "quoteCurrencyCode", "rate", "sourceKind", "source", "effectiveAt", "createdAt")
       VALUES ('50000000-0000-4000-8000-000000000099', 'USD', 'PEN', 0, 'MANUAL', 'INVALID', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)$sql$,
  'ck_fx_rate_positive'
);

-- 4. Monetary and proof-size values obey their sign rules.
SELECT pg_temp.assert_rejected(
  '4 negative wallet balances',
  $sql$UPDATE "Wallet" SET "availableBalanceCents" = -1 WHERE "id" = '20000000-0000-4000-8000-000000000001'$sql$,
  'ck_wallet_balances_nonnegative'
);
SELECT pg_temp.assert_rejected(
  '4 ledger amount must be positive',
  $sql$INSERT INTO "LedgerEntry" ("id", "ledgerTransactionId", "ledgerAccountId", "sequence", "direction", "amountCents", "createdAt")
       VALUES ('a1000000-0000-4000-8000-000000000099', 'a0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 99, 'CREDIT', 0, CURRENT_TIMESTAMP)$sql$,
  'ck_ledger_entry_amount_positive'
);

-- 5. Offer and order-item quantities are legal.
SELECT pg_temp.assert_rejected(
  '5 offer maximum cannot be below minimum',
  $sql$UPDATE "ServiceOffer" SET "maximumQuantity" = 0 WHERE "id" = '42000000-0000-4000-8000-000000000001'$sql$,
  'ck_service_offer_quantity_range'
);

-- 6. Order total equation.
SELECT pg_temp.assert_rejected(
  '6 order totals must reconcile',
  $sql$UPDATE "Order" SET "totalUsdCents" = 4999 WHERE "id" = '60000000-0000-4000-8000-000000000001'$sql$,
  'ck_order_total_equation'
);

-- 7. Order item line-total equation.
SELECT pg_temp.assert_rejected(
  '7 order-item line total must reconcile',
  $sql$UPDATE "OrderItem" SET "lineTotalUsdCents" = 4999 WHERE "id" = '61000000-0000-4000-8000-000000000001'$sql$,
  'ck_order_item_line_total_equation'
);

-- 8. A ledger transaction requires at least two entries.
DO $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    INSERT INTO "LedgerTransaction" (
      "id", "originType", "idempotencyKey", "postedAt", "createdAt"
    ) VALUES (
      'a0000000-0000-4000-8000-000000000008',
      'DEPOSIT', 'ledger:test:minimum-entries', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    INSERT INTO "LedgerEntry" (
      "id", "ledgerTransactionId", "ledgerAccountId", "sequence", "direction", "amountCents", "createdAt"
    ) VALUES (
      'a1000000-0000-4000-8000-000000000008',
      'a0000000-0000-4000-8000-000000000008',
      '00000000-0000-4000-8000-000000000101', 0, 'DEBIT', 100, CURRENT_TIMESTAMP
    );
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'NEGATIVE TEST FAILED: 8 minimum ledger entries accepted invalid data';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint <> 'ledger_transaction_minimum_entries' THEN RAISE; END IF;
    RAISE NOTICE 'PASS negative: 8 minimum ledger entries rejected by %', actual_constraint;
  END;
  SET CONSTRAINTS ALL DEFERRED;
END;
$$;

-- 9. Debit and credit totals must match.
DO $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    INSERT INTO "LedgerTransaction" (
      "id", "originType", "idempotencyKey", "postedAt", "createdAt"
    ) VALUES (
      'a0000000-0000-4000-8000-000000000009',
      'DEPOSIT', 'ledger:test:unbalanced', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    INSERT INTO "LedgerEntry" (
      "id", "ledgerTransactionId", "ledgerAccountId", "sequence", "direction", "amountCents", "createdAt"
    ) VALUES
      ('a1000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000101', 0, 'DEBIT', 100, CURRENT_TIMESTAMP),
      ('a1000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000001', 1, 'CREDIT', 99, CURRENT_TIMESTAMP);
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'NEGATIVE TEST FAILED: 9 unbalanced posting accepted invalid data';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint <> 'ledger_transaction_balanced_entries' THEN RAISE; END IF;
    RAISE NOTICE 'PASS negative: 9 unbalanced posting rejected by %', actual_constraint;
  END;
  SET CONSTRAINTS ALL DEFERRED;
END;
$$;

-- 10. All entries in a posting use one currency. The USD account CHECK is the
-- first defense; this test temporarily removes it inside a rollback subtransaction
-- to independently prove the deferred trigger's currency branch.
DO $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    ALTER TABLE "LedgerAccount" DROP CONSTRAINT "ck_ledger_account_currency_usd";
    INSERT INTO "LedgerAccount" (
      "id", "code", "name", "category", "purpose", "currencyCode", "status", "createdAt", "updatedAt"
    ) VALUES (
      '30000000-0000-4000-8000-000000000010', 'TEST:PEN', 'Test PEN account',
      'ASSET', 'SYSTEM_ADJUSTMENT', 'PEN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    INSERT INTO "LedgerTransaction" (
      "id", "originType", "idempotencyKey", "postedAt", "createdAt"
    ) VALUES (
      'a0000000-0000-4000-8000-000000000010',
      'MANUAL_ADJUSTMENT', 'ledger:test:mixed-currency', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    INSERT INTO "LedgerEntry" (
      "id", "ledgerTransactionId", "ledgerAccountId", "sequence", "direction", "amountCents", "createdAt"
    ) VALUES
      ('a1000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000101', 0, 'DEBIT', 100, CURRENT_TIMESTAMP),
      ('a1000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000010', 1, 'CREDIT', 100, CURRENT_TIMESTAMP);
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'NEGATIVE TEST FAILED: 10 mixed-currency posting accepted invalid data';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint <> 'ledger_transaction_single_currency' THEN RAISE; END IF;
    RAISE NOTICE 'PASS negative: 10 mixed-currency posting rejected by %', actual_constraint;
  END;
  SET CONSTRAINTS ALL DEFERRED;
END;
$$;

-- 11. Posted financial rows are immutable.
SELECT pg_temp.assert_rejected(
  '11 ledger entries are immutable',
  $sql$UPDATE "LedgerEntry" SET "amountCents" = 5001 WHERE "id" = 'a1000000-0000-4000-8000-000000000001'$sql$,
  NULL
);

-- 12. Audit and FX observations are append-only.
SELECT pg_temp.assert_rejected(
  '12 FX observations are immutable',
  $sql$UPDATE "FxRate" SET "rate" = 3.80 WHERE "id" = '50000000-0000-4000-8000-000000000001'$sql$,
  NULL
);
SELECT pg_temp.assert_rejected(
  '12 audit records are immutable',
  $sql$DELETE FROM "AuditLog" WHERE "id" = '90000000-0000-4000-8000-000000000001'$sql$,
  NULL
);

-- 13. Reversal shape and uniqueness.
SELECT pg_temp.assert_rejected(
  '13 reversal must reference an original posting',
  $sql$INSERT INTO "LedgerTransaction" ("id", "originType", "idempotencyKey", "postedAt", "createdAt")
       VALUES ('a0000000-0000-4000-8000-000000000013', 'REVERSAL', 'ledger:test:bad-reversal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)$sql$,
  'ck_ledger_transaction_reversal_shape'
);

-- 14. Verified submissions require a reviewer and review time.
SELECT pg_temp.assert_rejected(
  '14 verified submission requires review evidence',
  $sql$UPDATE "PaymentSubmission" SET "status" = 'VERIFIED' WHERE "id" = '70000000-0000-4000-8000-000000000001'$sql$,
  'ck_payment_submission_verified_review'
);

-- 15. Rejected submissions require reviewer, time, and a nonblank reason.
SELECT pg_temp.assert_rejected(
  '15 rejected submission requires reason',
  $sql$UPDATE "PaymentSubmission"
       SET "status" = 'REJECTED',
           "reviewedByUserId" = '10000000-0000-4000-8000-000000000002',
           "reviewedAt" = CURRENT_TIMESTAMP,
           "rejectionReason" = '   '
       WHERE "id" = '70000000-0000-4000-8000-000000000001'$sql$,
  'ck_payment_submission_rejected_review'
);

-- 16. Provisioned fulfillment requires its completion timestamp.
SELECT pg_temp.assert_rejected(
  '16 provisioned fulfillment requires timestamp',
  $sql$UPDATE "Fulfillment" SET "status" = 'PROVISIONED' WHERE "id" = '80000000-0000-4000-8000-000000000001'$sql$,
  'ck_fulfillment_provisioned_timestamp'
);

\echo 'PASS: all 16 invariant groups rejected invalid data as designed'

ROLLBACK;
