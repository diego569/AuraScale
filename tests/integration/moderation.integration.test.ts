import { afterAll, describe, expect, it } from "vitest";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

async function registerTestUser(suffix: string) {
  const { registerClient } = await import(
    "@/services/identity/registration.service"
  );
  return registerClient({
    email: `mod-test-${suffix}@example.test`,
    password: "ModTestPassw0rd",
    name: "Mod Test User",
    phoneE164: `+519${Date.now().toString().slice(-8)}`,
    countryCode: "PE",
    displayCurrencyCode: "PEN",
  });
}

async function setUpSubmission(suffix: string) {
  const { createOrder } = await import("@/services/orders/order.service");
  const { submitPaymentProof } = await import(
    "@/services/payments/payment-submission.service"
  );

  const client = await registerTestUser(suffix);
  const { orderNumber } = await createOrder({
    userId: client.id,
    sku: "AI-WORKFLOW-IND",
    quantity: 1,
  });
  const { submissionId } = await submitPaymentProof({
    userId: client.id,
    orderNumber,
    file: { buffer: Buffer.from("proof"), originalFileName: "proof.png", mimeType: "image/png" },
    reportedAmountMinor: 1900n,
    reportedCurrencyCode: "USD",
  });

  const moderator = await registerTestUser(`${suffix}-mod`);

  return { clientId: client.id, moderatorId: moderator.id, orderNumber, submissionId };
}

describeWithDatabase("moderation: payment review", () => {
  afterAll(async () => {
    const { getPrisma } = await import("@/lib/db");
    await getPrisma().$disconnect();
  });

  it("accepts a submission: posts a balanced PURCHASE ledger transaction, verifies the order, and queues fulfillment", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { acceptPaymentSubmission } = await import(
      "@/services/moderation/payment-review.service"
    );
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const { moderatorId, orderNumber, submissionId } = await setUpSubmission(suffix);

    await acceptPaymentSubmission({ submissionId, moderatorId });

    const submission = await getPrisma().paymentSubmission.findUniqueOrThrow({
      where: { id: submissionId },
    });
    expect(submission.status).toBe("VERIFIED");
    expect(submission.reviewedByUserId).toBe(moderatorId);
    expect(submission.reviewedAt).not.toBeNull();
    expect(submission.normalizedUsdCents).toBe(1900n);

    const order = await getPrisma().order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order.status).toBe("PROCESSING");
    expect(order.paymentStatus).toBe("VERIFIED");
    expect(order.fulfillmentStatus).toBe("QUEUED");

    const transaction = await getPrisma().ledgerTransaction.findUniqueOrThrow({
      where: { paymentSubmissionId: submissionId },
      include: { entries: { include: { ledgerAccount: true }, orderBy: { sequence: "asc" } } },
    });
    expect(transaction.originType).toBe("PURCHASE");
    expect(transaction.orderId).toBe(order.id);
    expect(transaction.entries).toHaveLength(2);

    const debit = transaction.entries.find((entry) => entry.direction === "DEBIT")!;
    const credit = transaction.entries.find((entry) => entry.direction === "CREDIT")!;
    expect(debit.ledgerAccount.purpose).toBe("PAYMENT_CLEARING");
    expect(credit.ledgerAccount.purpose).toBe("PLATFORM_REVENUE");
    expect(debit.amountCents).toBe(1900n);
    expect(credit.amountCents).toBe(1900n);
    expect(debit.amountCents).toBe(credit.amountCents);

    const fulfillment = await getPrisma().fulfillment.findFirstOrThrow({
      where: { orderItem: { orderId: order.id } },
    });
    expect(fulfillment.status).toBe("QUEUED");

    // The client's own spendable balance is untouched by a direct order
    // purchase paid externally.
    const wallet = await getPrisma().wallet.findUniqueOrThrow({
      where: { userId: (await getPrisma().order.findUniqueOrThrow({ where: { orderNumber } })).userId },
    });
    expect(wallet.availableBalanceCents).toBe(0n);
    expect(wallet.pendingBalanceCents).toBe(0n);
  });

  it("is idempotent against a double-accept: no second ledger transaction is posted", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { acceptPaymentSubmission, PaymentReviewError } = await import(
      "@/services/moderation/payment-review.service"
    );
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const { moderatorId, submissionId } = await setUpSubmission(suffix);

    await acceptPaymentSubmission({ submissionId, moderatorId });

    await expect(
      acceptPaymentSubmission({ submissionId, moderatorId }),
    ).rejects.toBeInstanceOf(PaymentReviewError);

    const transactionCount = await getPrisma().ledgerTransaction.count({
      where: { paymentSubmissionId: submissionId },
    });
    expect(transactionCount).toBe(1);
  });

  it("rejects a submission with a mandatory reason and marks the order rejected", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { rejectPaymentSubmission, PaymentReviewError } = await import(
      "@/services/moderation/payment-review.service"
    );
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const { moderatorId, orderNumber, submissionId } = await setUpSubmission(suffix);

    await expect(
      rejectPaymentSubmission({ submissionId, moderatorId, reason: "   " }),
    ).rejects.toMatchObject({ code: "REASON_REQUIRED" });

    await rejectPaymentSubmission({
      submissionId,
      moderatorId,
      reason: "Amount does not match order total",
    });

    const submission = await getPrisma().paymentSubmission.findUniqueOrThrow({
      where: { id: submissionId },
    });
    expect(submission.status).toBe("REJECTED");
    expect(submission.rejectionReason).toBe("Amount does not match order total");

    const order = await getPrisma().order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order.paymentStatus).toBe("REJECTED");

    await expect(
      rejectPaymentSubmission({ submissionId, moderatorId, reason: "again" }),
    ).rejects.toBeInstanceOf(PaymentReviewError);
  });
});

describeWithDatabase("moderation: fulfillment", () => {
  afterAll(async () => {
    const { getPrisma } = await import("@/lib/db");
    await getPrisma().$disconnect();
  });

  it("marks fulfillment provisioned and completes the order once every item is delivered", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { acceptPaymentSubmission } = await import(
      "@/services/moderation/payment-review.service"
    );
    const { markFulfillmentProvisioned, FulfillmentReviewError } = await import(
      "@/services/moderation/fulfillment.service"
    );
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const { moderatorId, orderNumber, submissionId } = await setUpSubmission(suffix);
    await acceptPaymentSubmission({ submissionId, moderatorId });

    const order = await getPrisma().order.findUniqueOrThrow({ where: { orderNumber } });
    const fulfillment = await getPrisma().fulfillment.findFirstOrThrow({
      where: { orderItem: { orderId: order.id } },
    });

    const result = await markFulfillmentProvisioned({
      fulfillmentId: fulfillment.id,
      moderatorId,
      clientVisibleMessage: "Access credentials sent to your email.",
    });
    expect(result.allProvisioned).toBe(true);

    const updatedFulfillment = await getPrisma().fulfillment.findUniqueOrThrow({
      where: { id: fulfillment.id },
    });
    expect(updatedFulfillment.status).toBe("PROVISIONED");
    expect(updatedFulfillment.provisionedAt).not.toBeNull();
    expect(updatedFulfillment.clientVisibleMessage).toBe("Access credentials sent to your email.");

    const attempt = await getPrisma().fulfillmentAttempt.findFirstOrThrow({
      where: { fulfillmentId: fulfillment.id },
    });
    expect(attempt.status).toBe("SUCCEEDED");
    expect(attempt.actorUserId).toBe(moderatorId);

    const updatedOrder = await getPrisma().order.findUniqueOrThrow({ where: { orderNumber } });
    expect(updatedOrder.fulfillmentStatus).toBe("PROVISIONED");
    expect(updatedOrder.status).toBe("COMPLETED");
    expect(updatedOrder.completedAt).not.toBeNull();

    await expect(
      markFulfillmentProvisioned({
        fulfillmentId: fulfillment.id,
        moderatorId,
        clientVisibleMessage: "again",
      }),
    ).rejects.toBeInstanceOf(FulfillmentReviewError);
  });
});

describeWithDatabase("moderation repository", () => {
  afterAll(async () => {
    const { getPrisma } = await import("@/lib/db");
    await getPrisma().$disconnect();
  });

  it("lists pending submissions and queued fulfillments, and stops listing them once resolved", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { moderationRepository } = await import(
      "@/repositories/moderation.repository"
    );
    const { acceptPaymentSubmission } = await import(
      "@/services/moderation/payment-review.service"
    );
    const { markFulfillmentProvisioned } = await import(
      "@/services/moderation/fulfillment.service"
    );
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const { moderatorId, orderNumber, submissionId } = await setUpSubmission(suffix);

    const pendingBefore = await moderationRepository.listPendingSubmissions();
    expect(pendingBefore.map((s) => s.submissionId)).toContain(submissionId);

    await acceptPaymentSubmission({ submissionId, moderatorId });

    const pendingAfter = await moderationRepository.listPendingSubmissions();
    expect(pendingAfter.map((s) => s.submissionId)).not.toContain(submissionId);

    const order = await getPrisma().order.findUniqueOrThrow({ where: { orderNumber } });
    const fulfillment = await getPrisma().fulfillment.findFirstOrThrow({
      where: { orderItem: { orderId: order.id } },
    });

    const queuedBefore = await moderationRepository.listQueuedFulfillments();
    expect(queuedBefore.map((f) => f.fulfillmentId)).toContain(fulfillment.id);

    await markFulfillmentProvisioned({
      fulfillmentId: fulfillment.id,
      moderatorId,
      clientVisibleMessage: "Delivered.",
    });

    const queuedAfter = await moderationRepository.listQueuedFulfillments();
    expect(queuedAfter.map((f) => f.fulfillmentId)).not.toContain(fulfillment.id);
  });
});
