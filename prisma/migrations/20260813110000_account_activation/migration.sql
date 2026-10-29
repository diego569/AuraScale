-- Account activation workflow aggregate.

ALTER TYPE "UserStatus" ADD VALUE 'PENDING_ACTIVATION' BEFORE 'ACTIVE';

ALTER TABLE "User"
  ALTER COLUMN "status" SET DEFAULT 'PENDING_ACTIVATION';

CREATE TYPE "ActivationExecutionMode" AS ENUM ('MANUAL', 'API_AUTOMATIC');
CREATE TYPE "AccountActivationStatus" AS ENUM (
  'PENDING', 'IN_PROGRESS', 'ACTIVATED', 'REJECTED', 'EXPIRED', 'CANCELLED'
);
CREATE TYPE "ActivationAttemptTrigger" AS ENUM (
  'MANUAL', 'API_REQUEST', 'WEBHOOK', 'BOT', 'RETRY'
);
CREATE TYPE "ActivationAttemptStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED');
CREATE TYPE "ActivationActorType" AS ENUM ('HUMAN', 'SYSTEM', 'PROVIDER', 'BOT');

CREATE TABLE "ActivationProvider" (
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "kind" VARCHAR(32) NOT NULL,
  "configurationKey" VARCHAR(255),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "ActivationProvider_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "ck_activation_provider_code_uppercase" CHECK ("code" = upper("code")),
  CONSTRAINT "ck_activation_provider_kind_uppercase" CHECK ("kind" = upper("kind"))
);

CREATE TABLE "ActivationMethod" (
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "executionMode" "ActivationExecutionMode" NOT NULL,
  "providerCode" VARCHAR(50) NOT NULL,
  "publicConfiguration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "ActivationMethod_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "ck_activation_method_code_uppercase" CHECK ("code" = upper("code"))
);

CREATE TABLE "AccountActivation" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "methodCode" VARCHAR(50) NOT NULL,
  "providerCode" VARCHAR(50) NOT NULL,
  "executionModeSnapshot" "ActivationExecutionMode" NOT NULL,
  "status" "AccountActivationStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" VARCHAR(180) NOT NULL,
  "providerReference" VARCHAR(255),
  "activatedActorType" "ActivationActorType",
  "activatedByUserId" UUID,
  "activatedAt" TIMESTAMPTZ(3),
  "rejectionReason" TEXT,
  "expiresAt" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "AccountActivation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_account_activation_version_nonnegative" CHECK ("version" >= 0),
  CONSTRAINT "ck_account_activation_expiry_after_creation" CHECK (
    "expiresAt" IS NULL OR "expiresAt" > "createdAt"
  ),
  CONSTRAINT "ck_account_activation_activated_shape" CHECK (
    (
      "status" = 'ACTIVATED'
      AND "activatedAt" IS NOT NULL
      AND "activatedActorType" IS NOT NULL
      AND "rejectionReason" IS NULL
    )
    OR (
      "status" <> 'ACTIVATED'
      AND "activatedAt" IS NULL
      AND "activatedActorType" IS NULL
      AND "activatedByUserId" IS NULL
    )
  ),
  CONSTRAINT "ck_account_activation_human_actor" CHECK (
    "activatedActorType" IS DISTINCT FROM 'HUMAN' OR "activatedByUserId" IS NOT NULL
  ),
  CONSTRAINT "ck_account_activation_rejected_reason" CHECK (
    "status" <> 'REJECTED'
    OR length(btrim(COALESCE("rejectionReason", ''))) > 0
  )
);

CREATE TABLE "AccountActivationAttempt" (
  "id" UUID NOT NULL,
  "accountActivationId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "trigger" "ActivationAttemptTrigger" NOT NULL,
  "status" "ActivationAttemptStatus" NOT NULL DEFAULT 'STARTED',
  "actorType" "ActivationActorType" NOT NULL,
  "actorUserId" UUID,
  "providerCode" VARCHAR(50) NOT NULL,
  "externalRequestId" VARCHAR(255),
  "idempotencyKey" VARCHAR(180) NOT NULL,
  "requestMetadata" JSONB,
  "responseMetadata" JSONB,
  "errorCode" VARCHAR(120),
  "errorMessage" TEXT,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),

  CONSTRAINT "AccountActivationAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_activation_attempt_number_positive" CHECK ("attemptNumber" > 0),
  CONSTRAINT "ck_activation_attempt_human_actor" CHECK (
    "actorType" <> 'HUMAN' OR "actorUserId" IS NOT NULL
  ),
  CONSTRAINT "ck_activation_attempt_completion" CHECK (
    ("status" = 'STARTED' AND "completedAt" IS NULL)
    OR ("status" IN ('SUCCEEDED', 'FAILED') AND "completedAt" IS NOT NULL)
  ),
  CONSTRAINT "ck_activation_attempt_failure_shape" CHECK (
    "status" <> 'FAILED'
    OR "errorCode" IS NOT NULL
    OR length(btrim(COALESCE("errorMessage", ''))) > 0
  )
);

CREATE UNIQUE INDEX "AccountActivation_idempotencyKey_key"
  ON "AccountActivation"("idempotencyKey");
CREATE INDEX "AccountActivation_userId_createdAt_idx"
  ON "AccountActivation"("userId", "createdAt" DESC);
CREATE INDEX "AccountActivation_status_createdAt_idx"
  ON "AccountActivation"("status", "createdAt");
CREATE INDEX "AccountActivation_providerCode_providerReference_idx"
  ON "AccountActivation"("providerCode", "providerReference");

-- One live workflow at a time. Rejection is terminal, but remediation may open
-- a new workflow after the rejected record leaves this index predicate.
CREATE UNIQUE INDEX "uq_account_activation_open_per_user"
  ON "AccountActivation"("userId")
  WHERE "status" IN ('PENDING', 'IN_PROGRESS');

-- A user can be activated successfully only once.
CREATE UNIQUE INDEX "uq_account_activation_activated_per_user"
  ON "AccountActivation"("userId")
  WHERE "status" = 'ACTIVATED';

CREATE INDEX "ActivationMethod_providerCode_isActive_idx"
  ON "ActivationMethod"("providerCode", "isActive");

CREATE UNIQUE INDEX "AccountActivationAttempt_idempotencyKey_key"
  ON "AccountActivationAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "AccountActivationAttempt_accountActivationId_attemptNumber_key"
  ON "AccountActivationAttempt"("accountActivationId", "attemptNumber");
CREATE UNIQUE INDEX "AccountActivationAttempt_providerCode_externalRequestId_key"
  ON "AccountActivationAttempt"("providerCode", "externalRequestId");
CREATE INDEX "AccountActivationAttempt_status_startedAt_idx"
  ON "AccountActivationAttempt"("status", "startedAt");

ALTER TABLE "ActivationMethod"
  ADD CONSTRAINT "ActivationMethod_providerCode_fkey"
  FOREIGN KEY ("providerCode") REFERENCES "ActivationProvider"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountActivation"
  ADD CONSTRAINT "AccountActivation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountActivation_methodCode_fkey"
  FOREIGN KEY ("methodCode") REFERENCES "ActivationMethod"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountActivation_providerCode_fkey"
  FOREIGN KEY ("providerCode") REFERENCES "ActivationProvider"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountActivation_activatedByUserId_fkey"
  FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AccountActivationAttempt"
  ADD CONSTRAINT "AccountActivationAttempt_accountActivationId_fkey"
  FOREIGN KEY ("accountActivationId") REFERENCES "AccountActivation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountActivationAttempt_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountActivationAttempt_providerCode_fkey"
  FOREIGN KEY ("providerCode") REFERENCES "ActivationProvider"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Snapshots must match the selected method/provider when the workflow is opened.
CREATE OR REPLACE FUNCTION "validate_activation_configuration"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  configured_provider varchar(50);
  configured_mode "ActivationExecutionMode";
  subject_status "UserStatus";
BEGIN
  IF NEW."status" <> 'PENDING' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'account_activation_initial_status',
      MESSAGE = 'A new activation workflow must begin in PENDING';
  END IF;

  SELECT "providerCode", "executionMode"
    INTO configured_provider, configured_mode
  FROM "ActivationMethod"
  WHERE "code" = NEW."methodCode" AND "isActive" = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'account_activation_active_method',
      MESSAGE = 'Activation method must exist and be active';
  END IF;

  IF configured_provider <> NEW."providerCode"
     OR configured_mode <> NEW."executionModeSnapshot" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'account_activation_configuration_snapshot',
      MESSAGE = 'Activation provider and execution-mode snapshot must match the selected method';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "ActivationProvider"
    WHERE "code" = NEW."providerCode" AND "isActive" = true
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'account_activation_active_provider',
      MESSAGE = 'Activation provider must be active';
  END IF;

  SELECT "status" INTO subject_status FROM "User" WHERE "id" = NEW."userId";
  IF subject_status <> 'PENDING_ACTIVATION' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'account_activation_pending_user',
      MESSAGE = 'Only a pending user can begin an activation workflow';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "tr_account_activation_configuration"
BEFORE INSERT ON "AccountActivation"
FOR EACH ROW
EXECUTE FUNCTION "validate_activation_configuration"();

-- Explicit transition matrix:
-- PENDING     -> IN_PROGRESS | REJECTED | EXPIRED | CANCELLED
-- IN_PROGRESS -> ACTIVATED   | REJECTED | EXPIRED | CANCELLED
-- ACTIVATED, REJECTED, EXPIRED, and CANCELLED are terminal.
CREATE OR REPLACE FUNCTION "enforce_account_activation_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."userId" <> OLD."userId"
     OR NEW."methodCode" <> OLD."methodCode"
     OR NEW."providerCode" <> OLD."providerCode"
     OR NEW."executionModeSnapshot" <> OLD."executionModeSnapshot"
     OR NEW."idempotencyKey" <> OLD."idempotencyKey"
     OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      CONSTRAINT = 'account_activation_identity_immutable',
      MESSAGE = 'Activation workflow identity and configuration are immutable';
  END IF;

  IF NEW."status" = OLD."status" THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD."status" = 'PENDING' AND NEW."status" IN ('IN_PROGRESS', 'REJECTED', 'EXPIRED', 'CANCELLED'))
    OR
    (OLD."status" = 'IN_PROGRESS' AND NEW."status" IN ('ACTIVATED', 'REJECTED', 'EXPIRED', 'CANCELLED'))
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'account_activation_legal_transition',
      MESSAGE = format('Illegal account activation transition: %s -> %s', OLD."status", NEW."status");
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "tr_account_activation_transition"
BEFORE UPDATE ON "AccountActivation"
FOR EACH ROW
EXECUTE FUNCTION "enforce_account_activation_transition"();

CREATE OR REPLACE FUNCTION "enforce_activation_attempt_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."accountActivationId" <> OLD."accountActivationId"
     OR NEW."attemptNumber" <> OLD."attemptNumber"
     OR NEW."trigger" <> OLD."trigger"
     OR NEW."actorType" <> OLD."actorType"
     OR NEW."actorUserId" IS DISTINCT FROM OLD."actorUserId"
     OR NEW."providerCode" <> OLD."providerCode"
     OR NEW."externalRequestId" IS DISTINCT FROM OLD."externalRequestId"
     OR NEW."idempotencyKey" <> OLD."idempotencyKey"
     OR NEW."startedAt" <> OLD."startedAt" THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      CONSTRAINT = 'activation_attempt_identity_immutable',
      MESSAGE = 'Activation attempt identity and execution context are immutable';
  END IF;

  IF NEW."status" = OLD."status" THEN
    RETURN NEW;
  END IF;

  IF OLD."status" <> 'STARTED' OR NEW."status" NOT IN ('SUCCEEDED', 'FAILED') THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'activation_attempt_legal_transition',
      MESSAGE = format('Illegal activation attempt transition: %s -> %s', OLD."status", NEW."status");
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "tr_activation_attempt_transition"
BEFORE UPDATE ON "AccountActivationAttempt"
FOR EACH ROW
EXECUTE FUNCTION "enforce_activation_attempt_transition"();
