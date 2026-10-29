\set ON_ERROR_STOP on

BEGIN;

INSERT INTO "User" (
  "id", "email", "name", "role", "locale", "displayCurrencyCode",
  "countryCode", "createdAt", "updatedAt"
) VALUES (
  'd0000000-0000-4000-8000-000000000001',
  'password-reset-schema@aurascale.test',
  'Password Reset Schema Test',
  'CLIENT', 'es-PE', 'PEN', 'PE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

DO $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    INSERT INTO "PasswordResetToken" (
      "id", "userId", "tokenHash", "expiresAt", "createdAt"
    ) VALUES (
      'd0000000-0000-4000-8000-0000000000a1',
      'd0000000-0000-4000-8000-000000000001',
      'expiry-before-creation-hash',
      CURRENT_TIMESTAMP - INTERVAL '1 minute',
      CURRENT_TIMESTAMP
    );
    RAISE EXCEPTION 'NEGATIVE TEST FAILED: token expiring before creation accepted';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint <> 'ck_password_reset_token_expiry_after_creation' THEN RAISE; END IF;
    RAISE NOTICE 'PASS negative: expiry-before-creation rejected by %', actual_constraint;
  END;
END;
$$;

DO $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    INSERT INTO "PasswordResetToken" (
      "id", "userId", "tokenHash", "expiresAt", "consumedAt", "createdAt"
    ) VALUES (
      'd0000000-0000-4000-8000-0000000000a2',
      'd0000000-0000-4000-8000-000000000001',
      'consumed-before-creation-hash',
      CURRENT_TIMESTAMP + INTERVAL '30 minutes',
      CURRENT_TIMESTAMP - INTERVAL '1 minute',
      CURRENT_TIMESTAMP
    );
    RAISE EXCEPTION 'NEGATIVE TEST FAILED: token consumed before creation accepted';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint <> 'ck_password_reset_token_consumed_after_creation' THEN RAISE; END IF;
    RAISE NOTICE 'PASS negative: consumed-before-creation rejected by %', actual_constraint;
  END;
END;
$$;

INSERT INTO "PasswordResetToken" (
  "id", "userId", "tokenHash", "expiresAt", "createdAt"
) VALUES (
  'd0000000-0000-4000-8000-0000000000a3',
  'd0000000-0000-4000-8000-000000000001',
  'first-pending-token-hash',
  CURRENT_TIMESTAMP + INTERVAL '30 minutes',
  CURRENT_TIMESTAMP
);

DO $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    INSERT INTO "PasswordResetToken" (
      "id", "userId", "tokenHash", "expiresAt", "createdAt"
    ) VALUES (
      'd0000000-0000-4000-8000-0000000000a4',
      'd0000000-0000-4000-8000-000000000001',
      'second-pending-token-hash',
      CURRENT_TIMESTAMP + INTERVAL '30 minutes',
      CURRENT_TIMESTAMP
    );
    RAISE EXCEPTION 'NEGATIVE TEST FAILED: a second concurrently pending token was accepted';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint <> 'ux_password_reset_token_one_pending_per_user' THEN RAISE; END IF;
    RAISE NOTICE 'PASS negative: second pending token rejected by %', actual_constraint;
  END;
END;
$$;

UPDATE "PasswordResetToken"
SET "consumedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'd0000000-0000-4000-8000-0000000000a3';

INSERT INTO "PasswordResetToken" (
  "id", "userId", "tokenHash", "expiresAt", "createdAt"
) VALUES (
  'd0000000-0000-4000-8000-0000000000a5',
  'd0000000-0000-4000-8000-000000000001',
  'second-token-after-first-consumed-hash',
  CURRENT_TIMESTAMP + INTERVAL '30 minutes',
  CURRENT_TIMESTAMP
);

\echo 'PASS positive: a new pending token is accepted once the prior one is consumed'

ROLLBACK;
