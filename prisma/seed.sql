-- AuraScale deterministic reference and system-account seed.
-- Safe to rerun: stable business keys are inserted with explicit conflict rules.

BEGIN;

INSERT INTO "Currency" (
  "code", "name", "symbol", "minorUnits", "isActive", "createdAt", "updatedAt"
) VALUES
  ('USD', 'United States Dollar', '$', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('PEN', 'Peruvian Sol', 'S/', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "symbol" = EXCLUDED."symbol",
  "minorUnits" = EXCLUDED."minorUnits",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Country" (
  "code", "name", "defaultCurrencyCode", "isActive", "createdAt", "updatedAt"
) VALUES
  ('PE', 'Peru', 'PEN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "defaultCurrencyCode" = EXCLUDED."defaultCurrencyCode",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "FxRate" (
  "id", "baseCurrencyCode", "quoteCurrencyCode", "rate", "sourceKind", "source",
  "effectiveAt", "expiresAt", "createdAt"
) VALUES (
  '00000000-0000-4000-8000-000000000201', 'USD', 'PEN', 3.75000000,
  'MANUAL', 'AURASCALE_INITIAL_REFERENCE', '2026-08-14T00:00:00Z', NULL, CURRENT_TIMESTAMP
)
ON CONFLICT ("baseCurrencyCode", "quoteCurrencyCode", "source", "effectiveAt") DO NOTHING;

INSERT INTO "PaymentMethod" (
  "code", "name", "kind", "instructions", "publicConfiguration",
  "requiresProof", "supportsAutomation", "sortOrder", "isActive",
  "createdAt", "updatedAt"
) VALUES (
  'WHATSAPP_MANUAL',
  'WhatsApp manual payment',
  'MANUAL',
  'Contact AuraScale through the generated WhatsApp checkout message and submit payment proof.',
  '{"checkoutChannel":"WHATSAPP"}'::jsonb,
  true,
  false,
  10,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "kind" = EXCLUDED."kind",
  "instructions" = EXCLUDED."instructions",
  "publicConfiguration" = EXCLUDED."publicConfiguration",
  "requiresProof" = EXCLUDED."requiresProof",
  "supportsAutomation" = EXCLUDED."supportsAutomation",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PaymentMethodCountry" (
  "paymentMethodCode", "countryCode", "isActive"
) VALUES (
  'WHATSAPP_MANUAL', 'PE', true
)
ON CONFLICT ("paymentMethodCode", "countryCode") DO UPDATE SET
  "isActive" = EXCLUDED."isActive";

INSERT INTO "ActivationProvider" (
  "code", "name", "kind", "configurationKey", "isActive", "createdAt", "updatedAt"
) VALUES (
  'INTERNAL_WHATSAPP',
  'AuraScale WhatsApp activation',
  'MANUAL',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "kind" = EXCLUDED."kind",
  "configurationKey" = EXCLUDED."configurationKey",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ActivationMethod" (
  "code", "name", "executionMode", "providerCode", "publicConfiguration",
  "isActive", "createdAt", "updatedAt"
) VALUES (
  'WHATSAPP_MANUAL',
  'WhatsApp manual activation',
  'MANUAL',
  'INTERNAL_WHATSAPP',
  '{"channel":"WHATSAPP"}'::jsonb,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "executionMode" = EXCLUDED."executionMode",
  "providerCode" = EXCLUDED."providerCode",
  "publicConfiguration" = EXCLUDED."publicConfiguration",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "FulfillmentProvider" (
  "code", "name", "kind", "configurationKey", "isActive", "createdAt", "updatedAt"
) VALUES (
  'INTERNAL_MANUAL',
  'AuraScale manual fulfillment',
  'MANUAL',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "kind" = EXCLUDED."kind",
  "configurationKey" = EXCLUDED."configurationKey",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Public catalog fixtures. Stable IDs and business keys keep this seed rerunnable.
INSERT INTO "ServiceCategory" (
  "id", "name", "slug", "description", "sortOrder", "isActive", "createdAt", "updatedAt"
) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Productivity & AI', 'productivity-ai', 'AI-assisted and collaborative tools for modern teams.', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000002', 'Creative Tools', 'creative-tools', 'Professional creative licenses for design and media production.', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000003', 'Growth Infrastructure', 'growth-infrastructure', 'Operational tools that help digital businesses scale reliably.', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Service" (
  "id", "categoryId", "name", "slug", "shortDescription", "description",
  "status", "isFeatured", "sortOrder", "createdAt", "updatedAt"
) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'AI Workflow Pro', 'ai-workflow-pro', 'Premium AI workspace access for focused operators and growing teams.', 'Turn repetitive work into repeatable systems with a managed premium AI workspace, clear activation guidance, and responsive support.', 'ACTIVE', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Team Office Suite', 'team-office-suite', 'Collaborative productivity access sized for distributed teams.', 'A practical collaboration suite for shared documents, planning, and day-to-day team operations.', 'ACTIVE', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Design Studio License', 'design-studio-license', 'Professional design access for brand, social, and campaign work.', 'Create polished visual assets with a professionally managed design license and a straightforward manual setup.', 'ACTIVE', true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Video Creator Toolkit', 'video-creator-toolkit', 'A streamlined production toolkit for short-form and campaign video.', 'Equip creators and marketing teams with dependable editing access and guided provisioning.', 'ACTIVE', false, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'Commerce Automation Access', 'commerce-automation-access', 'Automation capacity for lean commerce and operations teams.', 'Connect routine commerce workflows and keep operational handoffs moving with less manual effort.', 'ACTIVE', false, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', 'Cloud Workspace Access', 'cloud-workspace-access', 'Secure cloud collaboration capacity with flexible team sizing.', 'A dependable workspace foundation for files, coordination, and distributed delivery.', 'ACTIVE', false, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "shortDescription" = EXCLUDED."shortDescription",
  "description" = EXCLUDED."description",
  "status" = EXCLUDED."status",
  "isFeatured" = EXCLUDED."isFeatured",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ServiceOffer" (
  "id", "serviceId", "providerCode", "name", "sku", "unitPriceUsdCents",
  "minimumQuantity", "maximumQuantity", "estimatedDeliveryMinutes",
  "fulfillmentStrategy", "customerInputSchema", "fulfillmentInstructions",
  "isActive", "sortOrder", "createdAt", "updatedAt"
) VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'INTERNAL_MANUAL', 'Individual', 'AI-WORKFLOW-IND', 1900, 1, 1, 120, 'MANUAL', '{"fields":[{"key":"email","type":"email","required":true}]}'::jsonb, 'Verify the client email and provision access manually.', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'INTERNAL_MANUAL', 'Team', 'AI-WORKFLOW-TEAM', 1600, 3, 20, 240, 'MANUAL', '{"fields":[{"key":"emails","type":"email_list","required":true}]}'::jsonb, 'Verify the team roster and provision access manually.', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'INTERNAL_MANUAL', 'Essential', 'OFFICE-ESSENTIAL', 1100, 1, 5, 180, 'MANUAL', '{"fields":[{"key":"email","type":"email","required":true}]}'::jsonb, 'Provision the requested seats manually.', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'INTERNAL_MANUAL', 'Business', 'OFFICE-BUSINESS', 900, 6, 50, 360, 'MANUAL', '{"fields":[{"key":"emails","type":"email_list","required":true}]}'::jsonb, 'Provision the submitted roster manually.', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', 'INTERNAL_MANUAL', 'Creator', 'DESIGN-CREATOR', 1400, 1, 3, 180, 'MANUAL', '{"fields":[{"key":"email","type":"email","required":true}]}'::jsonb, 'Provision design access manually.', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'INTERNAL_MANUAL', 'Studio', 'DESIGN-STUDIO', 1150, 4, 30, 360, 'MANUAL', '{"fields":[{"key":"emails","type":"email_list","required":true}]}'::jsonb, 'Provision the studio roster manually.', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000004', 'INTERNAL_MANUAL', 'Creator', 'VIDEO-CREATOR', 1700, 1, 3, 180, 'MANUAL', '{"fields":[{"key":"email","type":"email","required":true}]}'::jsonb, 'Provision creator access manually.', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000004', 'INTERNAL_MANUAL', 'Production Team', 'VIDEO-TEAM', 1450, 4, 20, 360, 'MANUAL', '{"fields":[{"key":"emails","type":"email_list","required":true}]}'::jsonb, 'Provision production team access manually.', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000005', 'INTERNAL_MANUAL', 'Operator', 'COMMERCE-OPERATOR', 2400, 1, 3, 240, 'MANUAL', '{"fields":[{"key":"workspace","type":"text","required":true}]}'::jsonb, 'Configure the workspace manually.', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000005', 'INTERNAL_MANUAL', 'Scale', 'COMMERCE-SCALE', 2100, 4, 25, 480, 'MANUAL', '{"fields":[{"key":"workspace","type":"text","required":true}]}'::jsonb, 'Configure scale workspace access manually.', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000006', 'INTERNAL_MANUAL', 'Workspace', 'CLOUD-WORKSPACE', 800, 1, 10, 180, 'MANUAL', '{"fields":[{"key":"email","type":"email","required":true}]}'::jsonb, 'Provision workspace access manually.', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000006', 'INTERNAL_MANUAL', 'Organization', 'CLOUD-ORG', 650, 11, 100, 480, 'MANUAL', '{"fields":[{"key":"emails","type":"email_list","required":true}]}'::jsonb, 'Provision organization access manually.', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("sku") DO UPDATE SET
  "serviceId" = EXCLUDED."serviceId",
  "providerCode" = EXCLUDED."providerCode",
  "name" = EXCLUDED."name",
  "unitPriceUsdCents" = EXCLUDED."unitPriceUsdCents",
  "minimumQuantity" = EXCLUDED."minimumQuantity",
  "maximumQuantity" = EXCLUDED."maximumQuantity",
  "estimatedDeliveryMinutes" = EXCLUDED."estimatedDeliveryMinutes",
  "fulfillmentStrategy" = EXCLUDED."fulfillmentStrategy",
  "customerInputSchema" = EXCLUDED."customerInputSchema",
  "fulfillmentInstructions" = EXCLUDED."fulfillmentInstructions",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "LedgerAccount" (
  "id", "walletId", "code", "name", "category", "purpose",
  "currencyCode", "status", "createdAt", "updatedAt"
) VALUES
  (
    '00000000-0000-4000-8000-000000000101', NULL,
    'SYSTEM:PAYMENT_CLEARING:USD', 'Payment clearing',
    'ASSET', 'PAYMENT_CLEARING', 'USD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000102', NULL,
    'SYSTEM:PLATFORM_REVENUE:USD', 'Platform revenue',
    'REVENUE', 'PLATFORM_REVENUE', 'USD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000103', NULL,
    'SYSTEM:PROMOTION_EXPENSE:USD', 'Promotion expense',
    'EXPENSE', 'PROMOTION_EXPENSE', 'USD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000104', NULL,
    'SYSTEM:REFUND_CLEARING:USD', 'Refund clearing',
    'LIABILITY', 'REFUND_CLEARING', 'USD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000105', NULL,
    'SYSTEM:ADJUSTMENT:USD', 'System adjustment',
    'EQUITY', 'SYSTEM_ADJUSTMENT', 'USD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "purpose" = EXCLUDED."purpose",
  "currencyCode" = EXCLUDED."currencyCode",
  "status" = EXCLUDED."status",
  "updatedAt" = CURRENT_TIMESTAMP;

COMMIT;
