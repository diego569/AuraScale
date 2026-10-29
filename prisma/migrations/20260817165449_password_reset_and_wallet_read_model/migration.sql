-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "requestedIp" VARCHAR(64),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraints
ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "ck_password_reset_token_expiry_after_creation"
    CHECK ("expiresAt" > "createdAt"),
  ADD CONSTRAINT "ck_password_reset_token_consumed_after_creation"
    CHECK ("consumedAt" IS NULL OR "consumedAt" >= "createdAt");

-- One outstanding (unconsumed) reset token per user: requesting a new reset
-- must supersede any prior pending token rather than let two remain valid.
CREATE UNIQUE INDEX "ux_password_reset_token_one_pending_per_user"
  ON "PasswordResetToken" ("userId")
  WHERE "consumedAt" IS NULL;
