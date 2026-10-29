import "server-only";

import { randomUUID } from "node:crypto";

import { getPrisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import {
  PAYMENT_PROOF_MAX_SIZE_BYTES,
  isAllowedProofMimeType,
} from "@/validation/payment-proof";

export class PaymentProofSubmissionError extends Error {
  constructor(
    readonly code:
      | "ORDER_NOT_FOUND"
      | "ORDER_NOT_ELIGIBLE"
      | "WALLET_NOT_FOUND"
      | "FILE_TOO_LARGE"
      | "FILE_TYPE_NOT_ALLOWED",
  ) {
    super(`Payment proof submission failed: ${code}`);
    this.name = "PaymentProofSubmissionError";
  }
}

export interface SubmitPaymentProofInput {
  userId: string;
  orderNumber: string;
  file: { buffer: Buffer; originalFileName: string; mimeType: string };
  reportedAmountMinor: bigint;
  reportedCurrencyCode: string;
  externalReference?: string | null;
  clientNote?: string | null;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "proof";
}

export async function submitPaymentProof(input: SubmitPaymentProofInput) {
  if (input.file.buffer.byteLength > PAYMENT_PROOF_MAX_SIZE_BYTES) {
    throw new PaymentProofSubmissionError("FILE_TOO_LARGE");
  }
  if (!isAllowedProofMimeType(input.file.mimeType)) {
    throw new PaymentProofSubmissionError("FILE_TYPE_NOT_ALLOWED");
  }

  const prisma = getPrisma();

  const [order, wallet] = await Promise.all([
    prisma.order.findFirst({
      where: { orderNumber: input.orderNumber, userId: input.userId },
      select: { id: true, paymentStatus: true },
    }),
    prisma.wallet.findUnique({ where: { userId: input.userId }, select: { id: true } }),
  ]);

  if (!order) throw new PaymentProofSubmissionError("ORDER_NOT_FOUND");
  if (!wallet) throw new PaymentProofSubmissionError("WALLET_NOT_FOUND");
  if (order.paymentStatus !== "UNPAID" && order.paymentStatus !== "REJECTED") {
    throw new PaymentProofSubmissionError("ORDER_NOT_ELIGIBLE");
  }

  const submissionId = randomUUID();
  const proofId = randomUUID();
  const objectKey = `payment-proofs/${submissionId}/${proofId}-${sanitizeFileName(input.file.originalFileName)}`;

  // Written before the transaction commits: on the rare failure between here
  // and commit, this leaves an orphaned file with no PaymentProof row rather
  // than a dangling DB reference to a missing file. The DB row is the source
  // of truth for what "exists"; an unreferenced file is harmless disk usage.
  const stored = await storage.putObject(objectKey, input.file.buffer);

  return prisma.$transaction(async (transaction) => {
    const submission = await transaction.paymentSubmission.create({
      data: {
        id: submissionId,
        walletId: wallet.id,
        orderId: order.id,
        submittedByUserId: input.userId,
        paymentMethodCode: "WHATSAPP_MANUAL",
        reportedCurrencyCode: input.reportedCurrencyCode,
        reportedAmountMinor: input.reportedAmountMinor,
        externalReference: input.externalReference || null,
        clientNote: input.clientNote || null,
        status: "SUBMITTED",
      },
      select: { id: true },
    });

    await transaction.paymentProof.create({
      data: {
        id: proofId,
        paymentSubmissionId: submission.id,
        objectKey: stored.key,
        originalFileName: input.file.originalFileName,
        mimeType: input.file.mimeType,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
      },
    });

    await transaction.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PROOF_SUBMITTED" },
    });

    await transaction.auditLog.create({
      data: {
        actorUserId: input.userId,
        action: "PAYMENT_PROOF_SUBMITTED",
        entityType: "PaymentSubmission",
        entityId: submission.id,
        afterSnapshot: { orderId: order.id, proofId },
        correlationId: `order:${order.id}`,
      },
    });

    return { submissionId: submission.id, proofId };
  });
}
