import { createHash } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { PAYMENT_PROOF_MAX_SIZE_BYTES } from "@/validation/payment-proof";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

async function setUpOrder(suffix: string) {
  const { registerClient } = await import(
    "@/services/identity/registration.service"
  );
  const { createOrder } = await import("@/services/orders/order.service");

  const user = await registerClient({
    email: `proof-test-${suffix}@example.test`,
    password: "ProofTestPassw0rd",
    name: "Proof Test Client",
    phoneE164: `+519${Date.now().toString().slice(-8)}`,
    countryCode: "PE",
    displayCurrencyCode: "PEN",
  });

  const { orderNumber } = await createOrder({
    userId: user.id,
    sku: "AI-WORKFLOW-IND",
    quantity: 1,
  });

  return { userId: user.id, orderNumber };
}

describeWithDatabase("payment proof submission", () => {
  afterAll(async () => {
    const { getPrisma } = await import("@/lib/db");
    await getPrisma().$disconnect();
  });

  it("stores the file, records the submission, and moves the order to PROOF_SUBMITTED", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { submitPaymentProof } = await import(
      "@/services/payments/payment-submission.service"
    );
    const { storage } = await import("@/lib/storage");
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const { userId, orderNumber } = await setUpOrder(suffix);
    const fileBuffer = Buffer.from("fake-proof-bytes-for-testing");

    const { submissionId, proofId } = await submitPaymentProof({
      userId,
      orderNumber,
      file: { buffer: fileBuffer, originalFileName: "receipt.png", mimeType: "image/png" },
      reportedAmountMinor: 7125n,
      reportedCurrencyCode: "PEN",
      externalReference: "OP-12345",
      clientNote: "Paid via bank transfer",
    });

    const submission = await getPrisma().paymentSubmission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { proofs: true },
    });
    expect(submission.status).toBe("SUBMITTED");
    expect(submission.orderId).not.toBeNull();
    expect(submission.proofs).toHaveLength(1);
    expect(submission.proofs[0].id).toBe(proofId);
    expect(submission.proofs[0].sha256).toBe(
      createHash("sha256").update(fileBuffer).digest("hex"),
    );

    const order = await getPrisma().order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order.paymentStatus).toBe("PROOF_SUBMITTED");

    const storedFile = await storage.getObject(submission.proofs[0].objectKey);
    expect(storedFile?.toString()).toBe(fileBuffer.toString());
  });

  it("rejects a second submission while one is still under review", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { submitPaymentProof, PaymentProofSubmissionError } = await import(
      "@/services/payments/payment-submission.service"
    );

    const suffix = crypto.randomUUID();
    const { userId, orderNumber } = await setUpOrder(suffix);
    const file = { buffer: Buffer.from("first"), originalFileName: "a.png", mimeType: "image/png" };

    await submitPaymentProof({
      userId,
      orderNumber,
      file,
      reportedAmountMinor: 1000n,
      reportedCurrencyCode: "USD",
    });

    const secondAttempt = submitPaymentProof({
      userId,
      orderNumber,
      file: { ...file, originalFileName: "b.png" },
      reportedAmountMinor: 1000n,
      reportedCurrencyCode: "USD",
    });

    await expect(secondAttempt).rejects.toBeInstanceOf(PaymentProofSubmissionError);
    await expect(secondAttempt).rejects.toMatchObject({ code: "ORDER_NOT_ELIGIBLE" });
  });

  it("allows resubmission once the prior submission was rejected", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { submitPaymentProof } = await import(
      "@/services/payments/payment-submission.service"
    );
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const { userId, orderNumber } = await setUpOrder(suffix);
    const file = { buffer: Buffer.from("first"), originalFileName: "a.png", mimeType: "image/png" };

    await submitPaymentProof({
      userId,
      orderNumber,
      file,
      reportedAmountMinor: 1000n,
      reportedCurrencyCode: "USD",
    });

    await getPrisma().order.update({
      where: { orderNumber },
      data: { paymentStatus: "REJECTED" },
    });

    await expect(
      submitPaymentProof({
        userId,
        orderNumber,
        file: { ...file, originalFileName: "b.png" },
        reportedAmountMinor: 1000n,
        reportedCurrencyCode: "USD",
      }),
    ).resolves.toMatchObject({});
  });

  it("rejects an unknown order, an oversized file, and a disallowed file type", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { submitPaymentProof } = await import(
      "@/services/payments/payment-submission.service"
    );

    const suffix = crypto.randomUUID();
    const { userId, orderNumber } = await setUpOrder(suffix);
    const validFile = { buffer: Buffer.from("x"), originalFileName: "a.png", mimeType: "image/png" };

    await expect(
      submitPaymentProof({
        userId,
        orderNumber: "AS-NOT-A-REAL-ORDER",
        file: validFile,
        reportedAmountMinor: 100n,
        reportedCurrencyCode: "USD",
      }),
    ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });

    await expect(
      submitPaymentProof({
        userId,
        orderNumber,
        file: {
          buffer: Buffer.alloc(PAYMENT_PROOF_MAX_SIZE_BYTES + 1),
          originalFileName: "big.png",
          mimeType: "image/png",
        },
        reportedAmountMinor: 100n,
        reportedCurrencyCode: "USD",
      }),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });

    await expect(
      submitPaymentProof({
        userId,
        orderNumber,
        file: { buffer: Buffer.from("x"), originalFileName: "a.exe", mimeType: "application/x-msdownload" },
        reportedAmountMinor: 100n,
        reportedCurrencyCode: "USD",
      }),
    ).rejects.toMatchObject({ code: "FILE_TYPE_NOT_ALLOWED" });
  });
});
