\set ON_ERROR_STOP on

BEGIN;

INSERT INTO "User" (
  "id", "email", "name", "role", "locale", "displayCurrencyCode",
  "countryCode", "createdAt", "updatedAt"
) VALUES (
  'c0000000-0000-4000-8000-000000000001',
  'authentication-schema@aurascale.test',
  'Authentication Schema Test',
  'CLIENT', 'es-PE', 'PEN', 'PE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

DO $$
DECLARE persisted_status "UserStatus";
BEGIN
  SELECT "status" INTO persisted_status
  FROM "User"
  WHERE "id" = 'c0000000-0000-4000-8000-000000000001';

  IF persisted_status <> 'PENDING_ACTIVATION' THEN
    RAISE EXCEPTION 'User default status must be PENDING_ACTIVATION, got %', persisted_status;
  END IF;
END;
$$;

\echo 'PASS positive: new client identity defaults to PENDING_ACTIVATION'

DO $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    INSERT INTO "PasswordCredential" (
      "userId", "passwordHash", "failedAttempts", "passwordChangedAt",
      "createdAt", "updatedAt"
    ) VALUES (
      'c0000000-0000-4000-8000-000000000001',
      '   ', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    RAISE EXCEPTION 'NEGATIVE TEST FAILED: blank password hash accepted';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint <> 'ck_password_credential_hash_nonblank' THEN RAISE; END IF;
    RAISE NOTICE 'PASS negative: blank hash rejected by %', actual_constraint;
  END;
END;
$$;

DO $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    INSERT INTO "PasswordCredential" (
      "userId", "passwordHash", "failedAttempts", "passwordChangedAt",
      "createdAt", "updatedAt"
    ) VALUES (
      'c0000000-0000-4000-8000-000000000001',
      'valid-test-hash', -1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
    RAISE EXCEPTION 'NEGATIVE TEST FAILED: negative failed-attempt count accepted';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint <> 'ck_password_credential_failed_attempts_nonnegative' THEN RAISE; END IF;
    RAISE NOTICE 'PASS negative: negative failed-attempt count rejected by %', actual_constraint;
  END;
END;
$$;

ROLLBACK;
