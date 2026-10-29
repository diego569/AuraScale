-- Password credential persistence for Auth.js Credentials authentication.

CREATE TABLE "PasswordCredential" (
  "userId" UUID NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMPTZ(3),
  "passwordChangedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "PasswordCredential_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "ck_password_credential_hash_nonblank" CHECK (
    length(btrim("passwordHash")) > 0
  ),
  CONSTRAINT "ck_password_credential_failed_attempts_nonnegative" CHECK (
    "failedAttempts" >= 0
  )
);

ALTER TABLE "PasswordCredential"
  ADD CONSTRAINT "PasswordCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
