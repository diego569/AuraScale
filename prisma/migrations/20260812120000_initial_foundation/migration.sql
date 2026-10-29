-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PaymentMethodKind" AS ENUM ('MANUAL', 'BANK_TRANSFER', 'CARD', 'CRYPTO', 'DIGITAL_WALLET');

-- CreateEnum
CREATE TYPE "FxRateSourceKind" AS ENUM ('MANUAL', 'API');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FulfillmentStrategy" AS ENUM ('MANUAL', 'API_AUTOMATIC');

-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('MANUAL', 'API');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PLACED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('UNPAID', 'PROOF_SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderFulfillmentStatus" AS ENUM ('NOT_STARTED', 'QUEUED', 'IN_PROGRESS', 'PROVISIONED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentSubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "LedgerAccountCategory" AS ENUM ('ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY');

-- CreateEnum
CREATE TYPE "LedgerAccountPurpose" AS ENUM ('CLIENT_AVAILABLE', 'CLIENT_PENDING', 'PAYMENT_CLEARING', 'PLATFORM_REVENUE', 'PROMOTION_EXPENSE', 'REFUND_CLEARING', 'SYSTEM_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerAccountStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "LedgerOriginType" AS ENUM ('DEPOSIT', 'EARNING', 'PROMO_CREDIT', 'REFUND', 'PURCHASE', 'MANUAL_ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "LedgerEntryDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'PROVISIONED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FulfillmentAttemptTrigger" AS ENUM ('MANUAL', 'API_REQUEST', 'WEBHOOK', 'RETRY');

-- CreateEnum
CREATE TYPE "FulfillmentAttemptStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "emailVerified" TIMESTAMPTZ(3),
    "name" VARCHAR(160),
    "image" TEXT,
    "phoneE164" VARCHAR(20),
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(16) NOT NULL DEFAULT 'es-PE',
    "displayCurrencyCode" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "countryCode" CHAR(2),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" VARCHAR(64),
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "sessionToken" VARCHAR(255) NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" VARCHAR(320) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "symbol" VARCHAR(12) NOT NULL,
    "minorUnits" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Country" (
    "code" CHAR(2) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "defaultCurrencyCode" VARCHAR(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "kind" "PaymentMethodKind" NOT NULL,
    "instructions" TEXT,
    "publicConfiguration" JSONB,
    "requiresProof" BOOLEAN NOT NULL DEFAULT false,
    "supportsAutomation" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "PaymentMethodCountry" (
    "paymentMethodCode" VARCHAR(50) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaymentMethodCountry_pkey" PRIMARY KEY ("paymentMethodCode","countryCode")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" UUID NOT NULL,
    "baseCurrencyCode" VARCHAR(3) NOT NULL,
    "quoteCurrencyCode" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "sourceKind" "FxRateSourceKind" NOT NULL DEFAULT 'MANUAL',
    "source" VARCHAR(80) NOT NULL,
    "externalReference" VARCHAR(255),
    "effectiveAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "shortDescription" VARCHAR(280),
    "description" TEXT,
    "imageKey" VARCHAR(500),
    "status" "ServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentProvider" (
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "kind" "ProviderKind" NOT NULL,
    "configurationKey" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FulfillmentProvider_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ServiceOffer" (
    "id" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "providerCode" VARCHAR(50),
    "name" VARCHAR(140) NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "unitPriceUsdCents" BIGINT NOT NULL,
    "minimumQuantity" INTEGER NOT NULL DEFAULT 1,
    "maximumQuantity" INTEGER,
    "estimatedDeliveryMinutes" INTEGER,
    "fulfillmentStrategy" "FulfillmentStrategy" NOT NULL DEFAULT 'MANUAL',
    "customerInputSchema" JSONB,
    "fulfillmentInstructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ServiceOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "orderNumber" VARCHAR(32) NOT NULL,
    "userId" UUID NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "paymentMethodCode" VARCHAR(50) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "fulfillmentStatus" "OrderFulfillmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "baseCurrencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "displayCurrencyCode" VARCHAR(3) NOT NULL,
    "fxRateId" UUID,
    "fxRateSnapshot" DECIMAL(20,8),
    "subtotalUsdCents" BIGINT NOT NULL,
    "discountUsdCents" BIGINT NOT NULL DEFAULT 0,
    "totalUsdCents" BIGINT NOT NULL,
    "displayTotalMinor" BIGINT NOT NULL,
    "whatsappMessageVersion" VARCHAR(32),
    "whatsappOpenedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "placedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "serviceOfferId" UUID NOT NULL,
    "serviceNameSnapshot" VARCHAR(140) NOT NULL,
    "offerNameSnapshot" VARCHAR(140) NOT NULL,
    "skuSnapshot" VARCHAR(80) NOT NULL,
    "unitPriceUsdCents" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalUsdCents" BIGINT NOT NULL,
    "fulfillmentStrategySnapshot" "FulfillmentStrategy" NOT NULL,
    "providerCodeSnapshot" VARCHAR(50),
    "customerInput" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSubmission" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "orderId" UUID,
    "submittedByUserId" UUID NOT NULL,
    "paymentMethodCode" VARCHAR(50) NOT NULL,
    "reportedCurrencyCode" VARCHAR(3) NOT NULL,
    "reportedAmountMinor" BIGINT NOT NULL,
    "normalizedUsdCents" BIGINT,
    "fxRateId" UUID,
    "externalReference" VARCHAR(255),
    "clientNote" TEXT,
    "status" "PaymentSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "rejectionReason" TEXT,
    "moderatorNotes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaymentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" UUID NOT NULL,
    "paymentSubmissionId" UUID NOT NULL,
    "objectKey" VARCHAR(700) NOT NULL,
    "originalFileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(120) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "availableBalanceCents" BIGINT NOT NULL DEFAULT 0,
    "pendingBalanceCents" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "lastReconciledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" UUID NOT NULL,
    "walletId" UUID,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "category" "LedgerAccountCategory" NOT NULL,
    "purpose" "LedgerAccountPurpose" NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "LedgerAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" UUID NOT NULL,
    "originType" "LedgerOriginType" NOT NULL,
    "idempotencyKey" VARCHAR(180) NOT NULL,
    "orderId" UUID,
    "paymentSubmissionId" UUID,
    "createdByUserId" UUID,
    "reversalOfId" UUID,
    "referenceType" VARCHAR(80),
    "referenceId" VARCHAR(180),
    "description" VARCHAR(500),
    "metadata" JSONB,
    "postedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" UUID NOT NULL,
    "ledgerTransactionId" UUID NOT NULL,
    "ledgerAccountId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "direction" "LedgerEntryDirection" NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fulfillment" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "strategy" "FulfillmentStrategy" NOT NULL,
    "providerCode" VARCHAR(50),
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'QUEUED',
    "assignedToUserId" UUID,
    "idempotencyKey" VARCHAR(180) NOT NULL,
    "providerReference" VARCHAR(255),
    "deliveryDataCiphertext" TEXT,
    "encryptionKeyVersion" VARCHAR(80),
    "clientVisibleMessage" TEXT,
    "failureReason" TEXT,
    "startedAt" TIMESTAMPTZ(3),
    "provisionedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Fulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentAttempt" (
    "id" UUID NOT NULL,
    "fulfillmentId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "trigger" "FulfillmentAttemptTrigger" NOT NULL,
    "status" "FulfillmentAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "actorUserId" UUID,
    "externalRequestId" VARCHAR(255),
    "requestMetadata" JSONB,
    "responseMetadata" JSONB,
    "errorCode" VARCHAR(120),
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "FulfillmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(180) NOT NULL,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "ipAddress" INET,
    "userAgent" TEXT,
    "correlationId" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_countryCode_idx" ON "User"("countryCode");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Country_defaultCurrencyCode_idx" ON "Country"("defaultCurrencyCode");

-- CreateIndex
CREATE INDEX "PaymentMethodCountry_countryCode_isActive_idx" ON "PaymentMethodCountry"("countryCode", "isActive");

-- CreateIndex
CREATE INDEX "FxRate_baseCurrencyCode_quoteCurrencyCode_effectiveAt_idx" ON "FxRate"("baseCurrencyCode", "quoteCurrencyCode", "effectiveAt" DESC);

-- CreateIndex
CREATE INDEX "FxRate_expiresAt_idx" ON "FxRate"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_baseCurrencyCode_quoteCurrencyCode_source_effectiveA_key" ON "FxRate"("baseCurrencyCode", "quoteCurrencyCode", "source", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "ServiceCategory_isActive_sortOrder_idx" ON "ServiceCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_categoryId_status_sortOrder_idx" ON "Service"("categoryId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "Service_isFeatured_status_idx" ON "Service"("isFeatured", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOffer_sku_key" ON "ServiceOffer"("sku");

-- CreateIndex
CREATE INDEX "ServiceOffer_serviceId_isActive_sortOrder_idx" ON "ServiceOffer"("serviceId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceOffer_providerCode_idx" ON "ServiceOffer"("providerCode");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_fulfillmentStatus_createdAt_idx" ON "Order"("fulfillmentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Order_countryCode_idx" ON "Order"("countryCode");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_serviceId_idx" ON "OrderItem"("serviceId");

-- CreateIndex
CREATE INDEX "OrderItem_serviceOfferId_idx" ON "OrderItem"("serviceOfferId");

-- CreateIndex
CREATE INDEX "PaymentSubmission_walletId_createdAt_idx" ON "PaymentSubmission"("walletId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PaymentSubmission_orderId_createdAt_idx" ON "PaymentSubmission"("orderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PaymentSubmission_status_createdAt_idx" ON "PaymentSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentSubmission_reviewedByUserId_idx" ON "PaymentSubmission"("reviewedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProof_objectKey_key" ON "PaymentProof"("objectKey");

-- CreateIndex
CREATE INDEX "PaymentProof_paymentSubmissionId_idx" ON "PaymentProof"("paymentSubmissionId");

-- CreateIndex
CREATE INDEX "PaymentProof_sha256_idx" ON "PaymentProof"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");

-- CreateIndex
CREATE INDEX "LedgerAccount_purpose_status_idx" ON "LedgerAccount"("purpose", "status");

-- CreateIndex
CREATE INDEX "LedgerAccount_currencyCode_idx" ON "LedgerAccount"("currencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_walletId_purpose_key" ON "LedgerAccount"("walletId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_idempotencyKey_key" ON "LedgerTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_paymentSubmissionId_key" ON "LedgerTransaction"("paymentSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_reversalOfId_key" ON "LedgerTransaction"("reversalOfId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_orderId_idx" ON "LedgerTransaction"("orderId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_originType_postedAt_idx" ON "LedgerTransaction"("originType", "postedAt");

-- CreateIndex
CREATE INDEX "LedgerTransaction_referenceType_referenceId_idx" ON "LedgerTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "LedgerEntry_ledgerAccountId_createdAt_idx" ON "LedgerEntry"("ledgerAccountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_ledgerTransactionId_sequence_key" ON "LedgerEntry"("ledgerTransactionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Fulfillment_orderItemId_key" ON "Fulfillment"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Fulfillment_idempotencyKey_key" ON "Fulfillment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Fulfillment_status_createdAt_idx" ON "Fulfillment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Fulfillment_assignedToUserId_status_idx" ON "Fulfillment"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "Fulfillment_providerCode_providerReference_idx" ON "Fulfillment"("providerCode", "providerReference");

-- CreateIndex
CREATE INDEX "FulfillmentAttempt_externalRequestId_idx" ON "FulfillmentAttempt"("externalRequestId");

-- CreateIndex
CREATE INDEX "FulfillmentAttempt_status_startedAt_idx" ON "FulfillmentAttempt"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentAttempt_fulfillmentId_attemptNumber_key" ON "FulfillmentAttempt"("fulfillmentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_displayCurrencyCode_fkey" FOREIGN KEY ("displayCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_defaultCurrencyCode_fkey" FOREIGN KEY ("defaultCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethodCountry" ADD CONSTRAINT "PaymentMethodCountry_paymentMethodCode_fkey" FOREIGN KEY ("paymentMethodCode") REFERENCES "PaymentMethod"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethodCountry" ADD CONSTRAINT "PaymentMethodCountry_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FxRate" ADD CONSTRAINT "FxRate_baseCurrencyCode_fkey" FOREIGN KEY ("baseCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FxRate" ADD CONSTRAINT "FxRate_quoteCurrencyCode_fkey" FOREIGN KEY ("quoteCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FxRate" ADD CONSTRAINT "FxRate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffer" ADD CONSTRAINT "ServiceOffer_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffer" ADD CONSTRAINT "ServiceOffer_providerCode_fkey" FOREIGN KEY ("providerCode") REFERENCES "FulfillmentProvider"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentMethodCode_fkey" FOREIGN KEY ("paymentMethodCode") REFERENCES "PaymentMethod"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_baseCurrencyCode_fkey" FOREIGN KEY ("baseCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_displayCurrencyCode_fkey" FOREIGN KEY ("displayCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_fxRateId_fkey" FOREIGN KEY ("fxRateId") REFERENCES "FxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_serviceOfferId_fkey" FOREIGN KEY ("serviceOfferId") REFERENCES "ServiceOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_paymentMethodCode_fkey" FOREIGN KEY ("paymentMethodCode") REFERENCES "PaymentMethod"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_reportedCurrencyCode_fkey" FOREIGN KEY ("reportedCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_fxRateId_fkey" FOREIGN KEY ("fxRateId") REFERENCES "FxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_paymentSubmissionId_fkey" FOREIGN KEY ("paymentSubmissionId") REFERENCES "PaymentSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_paymentSubmissionId_fkey" FOREIGN KEY ("paymentSubmissionId") REFERENCES "PaymentSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_providerCode_fkey" FOREIGN KEY ("providerCode") REFERENCES "FulfillmentProvider"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentAttempt" ADD CONSTRAINT "FulfillmentAttempt_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentAttempt" ADD CONSTRAINT "FulfillmentAttempt_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- AuraScale domain invariants
-- PostgreSQL CHECK constraints cover row-local rules. Cross-row and immutable
-- rules are enforced by the constraint/immutability triggers below.
-- -----------------------------------------------------------------------------

-- Invariant 1: canonical uppercase reference codes.
ALTER TABLE "Currency"
  ADD CONSTRAINT "ck_currency_code_uppercase" CHECK ("code" = upper("code")),
  ADD CONSTRAINT "ck_currency_minor_units_range" CHECK ("minorUnits" BETWEEN 0 AND 8);

ALTER TABLE "Country"
  ADD CONSTRAINT "ck_country_code_uppercase" CHECK ("code" = upper("code")),
  ADD CONSTRAINT "ck_country_currency_code_uppercase" CHECK ("defaultCurrencyCode" = upper("defaultCurrencyCode"));

ALTER TABLE "PaymentMethod"
  ADD CONSTRAINT "ck_payment_method_code_uppercase" CHECK ("code" = upper("code"));

ALTER TABLE "FulfillmentProvider"
  ADD CONSTRAINT "ck_fulfillment_provider_code_uppercase" CHECK ("code" = upper("code"));

-- Invariants 1 and 2: USD is authoritative for wallets, ledger accounts, and orders.
ALTER TABLE "Wallet"
  ADD CONSTRAINT "ck_wallet_currency_usd" CHECK ("currencyCode" = 'USD'),
  ADD CONSTRAINT "ck_wallet_balances_nonnegative" CHECK (
    "availableBalanceCents" >= 0 AND "pendingBalanceCents" >= 0
  ),
  ADD CONSTRAINT "ck_wallet_version_nonnegative" CHECK ("version" >= 0);

ALTER TABLE "LedgerAccount"
  ADD CONSTRAINT "ck_ledger_account_currency_usd" CHECK ("currencyCode" = 'USD');

ALTER TABLE "Order"
  ADD CONSTRAINT "ck_order_base_currency_usd" CHECK ("baseCurrencyCode" = 'USD'),
  ADD CONSTRAINT "ck_order_display_currency_uppercase" CHECK ("displayCurrencyCode" = upper("displayCurrencyCode")),
  ADD CONSTRAINT "ck_order_money_nonnegative" CHECK (
    "subtotalUsdCents" >= 0
    AND "discountUsdCents" >= 0
    AND "totalUsdCents" >= 0
    AND "displayTotalMinor" >= 0
  ),
  ADD CONSTRAINT "ck_order_total_equation" CHECK (
    "subtotalUsdCents" - "discountUsdCents" = "totalUsdCents"
  ),
  ADD CONSTRAINT "ck_order_version_nonnegative" CHECK ("version" >= 0),
  ADD CONSTRAINT "ck_order_fx_snapshot_positive" CHECK (
    "fxRateSnapshot" IS NULL OR "fxRateSnapshot" > 0
  );

-- Invariant 3: valid USD-based FX observations.
ALTER TABLE "FxRate"
  ADD CONSTRAINT "ck_fx_rate_base_usd" CHECK ("baseCurrencyCode" = 'USD'),
  ADD CONSTRAINT "ck_fx_rate_quote_uppercase" CHECK ("quoteCurrencyCode" = upper("quoteCurrencyCode")),
  ADD CONSTRAINT "ck_fx_rate_positive" CHECK ("rate" > 0),
  ADD CONSTRAINT "ck_fx_rate_distinct_currencies" CHECK ("baseCurrencyCode" <> "quoteCurrencyCode"),
  ADD CONSTRAINT "ck_fx_rate_expiry_after_effective" CHECK (
    "expiresAt" IS NULL OR "expiresAt" > "effectiveAt"
  );

-- Invariants 4 and 5: nonnegative prices and legal offer quantities.
ALTER TABLE "ServiceOffer"
  ADD CONSTRAINT "ck_service_offer_price_nonnegative" CHECK ("unitPriceUsdCents" >= 0),
  ADD CONSTRAINT "ck_service_offer_minimum_quantity_positive" CHECK ("minimumQuantity" > 0),
  ADD CONSTRAINT "ck_service_offer_quantity_range" CHECK (
    "maximumQuantity" IS NULL OR "maximumQuantity" >= "minimumQuantity"
  ),
  ADD CONSTRAINT "ck_service_offer_delivery_nonnegative" CHECK (
    "estimatedDeliveryMinutes" IS NULL OR "estimatedDeliveryMinutes" >= 0
  );

-- Invariants 4, 5, and 7: legal order-item values and exact line totals.
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "ck_order_item_price_nonnegative" CHECK ("unitPriceUsdCents" >= 0),
  ADD CONSTRAINT "ck_order_item_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "ck_order_item_line_total_nonnegative" CHECK ("lineTotalUsdCents" >= 0),
  ADD CONSTRAINT "ck_order_item_line_total_equation" CHECK (
    "unitPriceUsdCents" * "quantity" = "lineTotalUsdCents"
  );

-- Invariant 4: legal payment and proof amounts.
ALTER TABLE "PaymentSubmission"
  ADD CONSTRAINT "ck_payment_submission_currency_uppercase" CHECK (
    "reportedCurrencyCode" = upper("reportedCurrencyCode")
  ),
  ADD CONSTRAINT "ck_payment_submission_reported_amount_positive" CHECK ("reportedAmountMinor" > 0),
  ADD CONSTRAINT "ck_payment_submission_normalized_amount_nonnegative" CHECK (
    "normalizedUsdCents" IS NULL OR "normalizedUsdCents" >= 0
  );

ALTER TABLE "PaymentProof"
  ADD CONSTRAINT "ck_payment_proof_size_positive" CHECK ("sizeBytes" > 0),
  ADD CONSTRAINT "ck_payment_proof_sha256_lower_hex" CHECK ("sha256" ~ '^[0-9a-f]{64}$');

ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "ck_ledger_entry_amount_positive" CHECK ("amountCents" > 0),
  ADD CONSTRAINT "ck_ledger_entry_sequence_nonnegative" CHECK ("sequence" >= 0);

-- Invariant 13: a reversal is explicit, self-reversal is forbidden, and the
-- existing unique reversalOfId constraint permits only one reversal per posting.
ALTER TABLE "LedgerTransaction"
  ADD CONSTRAINT "ck_ledger_transaction_reversal_shape" CHECK (
    ("originType" = 'REVERSAL' AND "reversalOfId" IS NOT NULL AND "reversalOfId" <> "id")
    OR ("originType" <> 'REVERSAL' AND "reversalOfId" IS NULL)
  );

-- Invariants 14 and 15: terminal review states carry their required evidence.
ALTER TABLE "PaymentSubmission"
  ADD CONSTRAINT "ck_payment_submission_verified_review" CHECK (
    "status" <> 'VERIFIED'
    OR ("reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL)
  ),
  ADD CONSTRAINT "ck_payment_submission_rejected_review" CHECK (
    "status" <> 'REJECTED'
    OR (
      "reviewedByUserId" IS NOT NULL
      AND "reviewedAt" IS NOT NULL
      AND length(btrim(COALESCE("rejectionReason", ''))) > 0
    )
  );

-- Invariant 16: provisioned work records when provisioning completed.
ALTER TABLE "Fulfillment"
  ADD CONSTRAINT "ck_fulfillment_provisioned_timestamp" CHECK (
    "status" <> 'PROVISIONED' OR "provisionedAt" IS NOT NULL
  );

ALTER TABLE "FulfillmentAttempt"
  ADD CONSTRAINT "ck_fulfillment_attempt_number_positive" CHECK ("attemptNumber" > 0),
  ADD CONSTRAINT "ck_fulfillment_attempt_completion" CHECK (
    "status" = 'STARTED' OR "completedAt" IS NOT NULL
  );

-- Invariants 8, 9, and 10: every ledger transaction has at least two entries,
-- balances debits and credits, and uses a single account currency. Deferral lets
-- the application create the transaction header and all entries atomically.
CREATE OR REPLACE FUNCTION "enforce_ledger_transaction_integrity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_transaction_id uuid;
  entry_count bigint;
  debit_total numeric(30, 0);
  credit_total numeric(30, 0);
  currency_count bigint;
BEGIN
  IF TG_TABLE_NAME = 'LedgerTransaction' THEN
    IF TG_OP = 'DELETE' THEN
      target_transaction_id := OLD."id";
    ELSE
      target_transaction_id := NEW."id";
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      target_transaction_id := OLD."ledgerTransactionId";
    ELSE
      target_transaction_id := NEW."ledgerTransactionId";
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "LedgerTransaction" WHERE "id" = target_transaction_id
  ) THEN
    RETURN NULL;
  END IF;

  SELECT
    count(*),
    COALESCE(sum(CASE WHEN entry."direction" = 'DEBIT' THEN entry."amountCents" ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN entry."direction" = 'CREDIT' THEN entry."amountCents" ELSE 0 END), 0),
    count(DISTINCT account."currencyCode")
  INTO entry_count, debit_total, credit_total, currency_count
  FROM "LedgerEntry" AS entry
  JOIN "LedgerAccount" AS account ON account."id" = entry."ledgerAccountId"
  WHERE entry."ledgerTransactionId" = target_transaction_id;

  IF entry_count < 2 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'ledger_transaction_minimum_entries',
      MESSAGE = format('Ledger transaction %s must contain at least two entries', target_transaction_id);
  END IF;

  IF debit_total <> credit_total THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'ledger_transaction_balanced_entries',
      MESSAGE = format(
        'Ledger transaction %s is unbalanced: debits=%s credits=%s',
        target_transaction_id,
        debit_total,
        credit_total
      );
  END IF;

  IF currency_count <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'ledger_transaction_single_currency',
      MESSAGE = format('Ledger transaction %s must use exactly one currency', target_transaction_id);
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "ct_ledger_transaction_integrity_header"
AFTER INSERT ON "LedgerTransaction"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "enforce_ledger_transaction_integrity"();

CREATE CONSTRAINT TRIGGER "ct_ledger_transaction_integrity_entries"
AFTER INSERT OR UPDATE OR DELETE ON "LedgerEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "enforce_ledger_transaction_integrity"();

-- Invariants 11 and 12: financial postings, audit records, and FX observations
-- are append-only. Corrections use explicit ledger reversals or new observations.
CREATE OR REPLACE FUNCTION "reject_immutable_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = format('%I records are append-only; %s is not permitted', TG_TABLE_NAME, TG_OP);
END;
$$;

CREATE TRIGGER "tr_ledger_transaction_immutable"
BEFORE UPDATE OR DELETE ON "LedgerTransaction"
FOR EACH ROW
EXECUTE FUNCTION "reject_immutable_mutation"();

CREATE TRIGGER "tr_ledger_entry_immutable"
BEFORE UPDATE OR DELETE ON "LedgerEntry"
FOR EACH ROW
EXECUTE FUNCTION "reject_immutable_mutation"();

CREATE TRIGGER "tr_fx_rate_immutable"
BEFORE UPDATE OR DELETE ON "FxRate"
FOR EACH ROW
EXECUTE FUNCTION "reject_immutable_mutation"();

CREATE TRIGGER "tr_audit_log_immutable"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION "reject_immutable_mutation"();
