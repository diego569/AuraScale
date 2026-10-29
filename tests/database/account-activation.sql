\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert_activation_rejected(
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

INSERT INTO "User" (
  "id", "email", "name", "role", "status", "locale",
  "displayCurrencyCode", "countryCode", "createdAt", "updatedAt"
) VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'activation-client@aurascale.test', 'Activation Client', 'CLIENT',
    'PENDING_ACTIVATION', 'es-PE', 'PEN', 'PE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'activation-retry@aurascale.test', 'Activation Retry Client', 'CLIENT',
    'PENDING_ACTIVATION', 'es-PE', 'PEN', 'PE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    'activation-moderator@aurascale.test', 'Activation Moderator', 'MODERATOR',
    'ACTIVE', 'es-PE', 'PEN', 'PE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );

-- Positive MVP flow: pending -> in progress -> activated by a human moderator.
INSERT INTO "AccountActivation" (
  "id", "userId", "methodCode", "providerCode", "executionModeSnapshot",
  "status", "idempotencyKey", "version", "createdAt", "updatedAt"
) VALUES (
  'b1000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'WHATSAPP_MANUAL', 'INTERNAL_WHATSAPP', 'MANUAL',
  'PENDING', 'activation:test:workflow:1', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "AccountActivationAttempt" (
  "id", "accountActivationId", "attemptNumber", "trigger", "status",
  "actorType", "actorUserId", "providerCode", "idempotencyKey", "startedAt"
) VALUES (
  'b2000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001', 1, 'MANUAL', 'STARTED',
  'HUMAN', 'b0000000-0000-4000-8000-000000000003',
  'INTERNAL_WHATSAPP', 'activation:test:attempt:1', CURRENT_TIMESTAMP
);

UPDATE "AccountActivation"
SET "status" = 'IN_PROGRESS', "version" = 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'b1000000-0000-4000-8000-000000000001';

UPDATE "AccountActivationAttempt"
SET "status" = 'SUCCEEDED', "completedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'b2000000-0000-4000-8000-000000000001';

UPDATE "AccountActivation"
SET "status" = 'ACTIVATED',
    "activatedActorType" = 'HUMAN',
    "activatedByUserId" = 'b0000000-0000-4000-8000-000000000003',
    "activatedAt" = CURRENT_TIMESTAMP,
    "version" = 2,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'b1000000-0000-4000-8000-000000000001';

UPDATE "User"
SET "status" = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'b0000000-0000-4000-8000-000000000001';

\echo 'PASS positive: manual activation records method, provider, actor, attempt, and terminal result'

-- A rejected workflow is terminal, but the same still-pending user may receive
-- a distinct remediation workflow after the rejection.
INSERT INTO "AccountActivation" (
  "id", "userId", "methodCode", "providerCode", "executionModeSnapshot",
  "status", "idempotencyKey", "version", "createdAt", "updatedAt"
) VALUES (
  'b1000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000002',
  'WHATSAPP_MANUAL', 'INTERNAL_WHATSAPP', 'MANUAL',
  'PENDING', 'activation:test:workflow:2', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

UPDATE "AccountActivation"
SET "status" = 'IN_PROGRESS', "version" = 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'b1000000-0000-4000-8000-000000000002';

UPDATE "AccountActivation"
SET "status" = 'REJECTED',
    "rejectionReason" = 'Identity details require correction',
    "version" = 2,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'b1000000-0000-4000-8000-000000000002';

INSERT INTO "AccountActivation" (
  "id", "userId", "methodCode", "providerCode", "executionModeSnapshot",
  "status", "idempotencyKey", "version", "createdAt", "updatedAt"
) VALUES (
  'b1000000-0000-4000-8000-000000000003',
  'b0000000-0000-4000-8000-000000000002',
  'WHATSAPP_MANUAL', 'INTERNAL_WHATSAPP', 'MANUAL',
  'PENDING', 'activation:test:workflow:3', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

\echo 'PASS positive: rejected workflow remains historical and a separate remediation workflow opens'

SELECT pg_temp.assert_activation_rejected(
  'duplicate activation workflow idempotency key',
  $sql$INSERT INTO "AccountActivation" (
         "id", "userId", "methodCode", "providerCode", "executionModeSnapshot",
         "status", "idempotencyKey", "version", "createdAt", "updatedAt"
       ) VALUES (
         'b1000000-0000-4000-8000-000000000010',
         'b0000000-0000-4000-8000-000000000002',
         'WHATSAPP_MANUAL', 'INTERNAL_WHATSAPP', 'MANUAL',
         'PENDING', 'activation:test:workflow:3', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )$sql$,
  'AccountActivation_idempotencyKey_key'
);

SELECT pg_temp.assert_activation_rejected(
  'only one open workflow per user',
  $sql$INSERT INTO "AccountActivation" (
         "id", "userId", "methodCode", "providerCode", "executionModeSnapshot",
         "status", "idempotencyKey", "version", "createdAt", "updatedAt"
       ) VALUES (
         'b1000000-0000-4000-8000-000000000011',
         'b0000000-0000-4000-8000-000000000002',
         'WHATSAPP_MANUAL', 'INTERNAL_WHATSAPP', 'MANUAL',
         'PENDING', 'activation:test:workflow:11', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )$sql$,
  'uq_account_activation_open_per_user'
);

SELECT pg_temp.assert_activation_rejected(
  'rejected activation is terminal',
  $sql$UPDATE "AccountActivation"
       SET "status" = 'PENDING', "rejectionReason" = NULL, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = 'b1000000-0000-4000-8000-000000000002'$sql$,
  'account_activation_legal_transition'
);

SELECT pg_temp.assert_activation_rejected(
  'pending cannot jump directly to activated',
  $sql$UPDATE "AccountActivation"
       SET "status" = 'ACTIVATED',
           "activatedActorType" = 'SYSTEM',
           "activatedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = 'b1000000-0000-4000-8000-000000000003'$sql$,
  'account_activation_legal_transition'
);

SELECT pg_temp.assert_activation_rejected(
  'new workflow must begin pending',
  $sql$INSERT INTO "AccountActivation" (
         "id", "userId", "methodCode", "providerCode", "executionModeSnapshot",
         "status", "idempotencyKey", "activatedActorType", "activatedAt",
         "version", "createdAt", "updatedAt"
       ) VALUES (
         'b1000000-0000-4000-8000-000000000014',
         'b0000000-0000-4000-8000-000000000002',
         'WHATSAPP_MANUAL', 'INTERNAL_WHATSAPP', 'MANUAL',
         'ACTIVATED', 'activation:test:workflow:14', 'SYSTEM', CURRENT_TIMESTAMP,
         0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )$sql$,
  'account_activation_initial_status'
);

SELECT pg_temp.assert_activation_rejected(
  'activation configuration snapshot must match method',
  $sql$INSERT INTO "AccountActivation" (
         "id", "userId", "methodCode", "providerCode", "executionModeSnapshot",
         "status", "idempotencyKey", "version", "createdAt", "updatedAt"
       ) VALUES (
         'b1000000-0000-4000-8000-000000000012',
         'b0000000-0000-4000-8000-000000000002',
         'WHATSAPP_MANUAL', 'INTERNAL_WHATSAPP', 'API_AUTOMATIC',
         'PENDING', 'activation:test:workflow:12', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )$sql$,
  'account_activation_configuration_snapshot'
);

SELECT pg_temp.assert_activation_rejected(
  'activated user cannot start another workflow',
  $sql$INSERT INTO "AccountActivation" (
         "id", "userId", "methodCode", "providerCode", "executionModeSnapshot",
         "status", "idempotencyKey", "version", "createdAt", "updatedAt"
       ) VALUES (
         'b1000000-0000-4000-8000-000000000013',
         'b0000000-0000-4000-8000-000000000001',
         'WHATSAPP_MANUAL', 'INTERNAL_WHATSAPP', 'MANUAL',
         'PENDING', 'activation:test:workflow:13', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )$sql$,
  'account_activation_pending_user'
);

DO $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    UPDATE "User"
    SET "status" = 'PENDING_ACTIVATION', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = 'b0000000-0000-4000-8000-000000000001';

    INSERT INTO "AccountActivation" (
      "id", "userId", "methodCode", "providerCode", "executionModeSnapshot",
      "status", "idempotencyKey", "version", "createdAt", "updatedAt"
    ) VALUES (
      'b1000000-0000-4000-8000-000000000015',
      'b0000000-0000-4000-8000-000000000001',
      'WHATSAPP_MANUAL', 'INTERNAL_WHATSAPP', 'MANUAL',
      'PENDING', 'activation:test:workflow:15', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );

    UPDATE "AccountActivation"
    SET "status" = 'IN_PROGRESS', "version" = 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = 'b1000000-0000-4000-8000-000000000015';

    UPDATE "AccountActivation"
    SET "status" = 'ACTIVATED',
        "activatedActorType" = 'SYSTEM',
        "activatedAt" = CURRENT_TIMESTAMP,
        "version" = 2,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = 'b1000000-0000-4000-8000-000000000015';

    RAISE EXCEPTION 'NEGATIVE TEST FAILED: second successful activation accepted';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint <> 'uq_account_activation_activated_per_user' THEN RAISE; END IF;
    RAISE NOTICE 'PASS negative: second successful activation rejected by %', actual_constraint;
  END;
END;
$$;

SELECT pg_temp.assert_activation_rejected(
  'human attempt requires actor user',
  $sql$INSERT INTO "AccountActivationAttempt" (
         "id", "accountActivationId", "attemptNumber", "trigger", "status",
         "actorType", "providerCode", "idempotencyKey", "startedAt"
       ) VALUES (
         'b2000000-0000-4000-8000-000000000010',
         'b1000000-0000-4000-8000-000000000003', 1, 'MANUAL', 'STARTED',
         'HUMAN', 'INTERNAL_WHATSAPP', 'activation:test:attempt:10', CURRENT_TIMESTAMP
       )$sql$,
  'ck_activation_attempt_human_actor'
);

INSERT INTO "AccountActivationAttempt" (
  "id", "accountActivationId", "attemptNumber", "trigger", "status",
  "actorType", "actorUserId", "providerCode", "externalRequestId",
  "idempotencyKey", "startedAt"
) VALUES (
  'b2000000-0000-4000-8000-000000000011',
  'b1000000-0000-4000-8000-000000000003', 1, 'WEBHOOK', 'STARTED',
  'PROVIDER', NULL, 'INTERNAL_WHATSAPP', 'provider-event-001',
  'activation:test:attempt:11', CURRENT_TIMESTAMP
);

SELECT pg_temp.assert_activation_rejected(
  'attempt idempotency key is unique',
  $sql$INSERT INTO "AccountActivationAttempt" (
         "id", "accountActivationId", "attemptNumber", "trigger", "status",
         "actorType", "providerCode", "idempotencyKey", "startedAt"
       ) VALUES (
         'b2000000-0000-4000-8000-000000000012',
         'b1000000-0000-4000-8000-000000000003', 2, 'RETRY', 'STARTED',
         'SYSTEM', 'INTERNAL_WHATSAPP', 'activation:test:attempt:11', CURRENT_TIMESTAMP
       )$sql$,
  'AccountActivationAttempt_idempotencyKey_key'
);

SELECT pg_temp.assert_activation_rejected(
  'provider event reference is unique per provider',
  $sql$INSERT INTO "AccountActivationAttempt" (
         "id", "accountActivationId", "attemptNumber", "trigger", "status",
         "actorType", "providerCode", "externalRequestId", "idempotencyKey", "startedAt"
       ) VALUES (
         'b2000000-0000-4000-8000-000000000013',
         'b1000000-0000-4000-8000-000000000003', 2, 'WEBHOOK', 'STARTED',
         'PROVIDER', 'INTERNAL_WHATSAPP', 'provider-event-001',
         'activation:test:attempt:13', CURRENT_TIMESTAMP
       )$sql$,
  'AccountActivationAttempt_providerCode_externalRequestId_key'
);

UPDATE "AccountActivationAttempt"
SET "status" = 'FAILED', "errorCode" = 'TEST_FAILURE', "completedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'b2000000-0000-4000-8000-000000000011';

SELECT pg_temp.assert_activation_rejected(
  'failed attempt is terminal',
  $sql$UPDATE "AccountActivationAttempt"
       SET "status" = 'SUCCEEDED', "errorCode" = NULL
       WHERE "id" = 'b2000000-0000-4000-8000-000000000011'$sql$,
  'activation_attempt_legal_transition'
);

\echo 'PASS: account activation transition, evidence, actor, and idempotency rules enforced'

ROLLBACK;
