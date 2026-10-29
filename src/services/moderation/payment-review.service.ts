import "server-only";

import { getPrisma } from "@/lib/db";

export class PaymentReviewError extends Error {
  constructor(
    readonly code:
      | "SUBMISSION_NOT_FOUND"
      | "SUBMISSION_ALREADY_REVIEWED"
      | "ORDER_NOT_FOUND"
      | "ORDER_NOT_ELIGIBLE"
      | "REASON_REQUIRED",
  ) {
    super(`Payment review failed: ${code}`);
    this.name = "PaymentReviewError";
  }
}

const PENDING_SUBMISSION_STATUSES = ["SUBMITTED", "UNDER_REVIEW"] as const;
const PAYMENT_CLEARING_ACCOUNT_CODE = "SYSTEM:PAYMENT_CLEARING:USD";
const PLATFORM_REVENUE_ACCOUNT_CODE = "SYSTEM:PLATFORM_REVENUE:USD";

export interface AcceptPaymentSubmissionInput {
  submissionId: string;
  moderatorId: string;
}

/**
 * The order's authoritative USD total is what gets verified and posted, not
 * a currency-converted version of the client's self-reported amount: Accept
 * means "the moderator confirms this order's total was paid," not "trust an
 * FX conversion of the client's own figure." No ledger entry ever touches
 * CLIENT_AVAILABLE/CLIENT_PENDING here — those track the client's own
 * spendable balance, and this is a direct order purchase paid externally,
 * not a wallet deposit. The two entries simply recognize cash received
 * (PAYMENT_CLEARING, an asset) as platform revenue.
 */
export async function acceptPaymentSubmission(input: AcceptPaymentSubmissionInput) {
  const prisma = getPrisma();

  const submission = await prisma.paymentSubmission.findUnique({
    where: { id: input.submissionId },
    select: { id: true, status: true, orderId: true },
  });
  if (!submission) throw new PaymentReviewError("SUBMISSION_NOT_FOUND");
  if (!submission.orderId) throw new PaymentReviewError("ORDER_NOT_FOUND");

  const order = await prisma.order.findUnique({
    where: { id: submission.orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalUsdCents: true,
      items: { select: { id: true, fulfillmentStrategySnapshot: true, providerCodeSnapshot: true } },
    },
  });
  if (!order) throw new PaymentReviewError("ORDER_NOT_FOUND");
  if (order.status === "CANCELLED" || order.status === "EXPIRED" || order.status === "COMPLETED") {
    throw new PaymentReviewError("ORDER_NOT_ELIGIBLE");
  }

  const [clearingAccount, revenueAccount] = await Promise.all([
    prisma.ledgerAccount.findUniqueOrThrow({ where: { code: PAYMENT_CLEARING_ACCOUNT_CODE } }),
    prisma.ledgerAccount.findUniqueOrThrow({ where: { code: PLATFORM_REVENUE_ACCOUNT_CODE } }),
  ]);

  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    // Guarded/conditional update: if another request already reviewed this
    // submission (double-click, retry), zero rows match and we bail out
    // cleanly instead of double-crediting. This, plus the unique constraint
    // on LedgerTransaction.paymentSubmissionId below, are the two layers of
    // idempotency protection for this endpoint.
    const claimed = await transaction.paymentSubmission.updateMany({
      where: { id: submission.id, status: { in: [...PENDING_SUBMISSION_STATUSES] } },
      data: {
        status: "VERIFIED",
        reviewedByUserId: input.moderatorId,
        reviewedAt: now,
        normalizedUsdCents: order.totalUsdCents,
      },
    });
    if (claimed.count === 0) {
      throw new PaymentReviewError("SUBMISSION_ALREADY_REVIEWED");
    }

    await transaction.ledgerTransaction.create({
      data: {
        originType: "PURCHASE",
        idempotencyKey: `payment-submission:${submission.id}:accept`,
        orderId: order.id,
        paymentSubmissionId: submission.id,
        createdByUserId: input.moderatorId,
        referenceType: "Order",
        referenceId: order.id,
        description: `Payment verified for order ${order.orderNumber}`,
        entries: {
          create: [
            {
              sequence: 1,
              ledgerAccountId: clearingAccount.id,
              direction: "DEBIT",
              amountCents: order.totalUsdCents,
            },
            {
              sequence: 2,
              ledgerAccountId: revenueAccount.id,
              direction: "CREDIT",
              amountCents: order.totalUsdCents,
            },
          ],
        },
      },
    });

    await transaction.order.update({
      where: { id: order.id },
      data: { status: "PROCESSING", paymentStatus: "VERIFIED", fulfillmentStatus: "QUEUED" },
    });

    for (const item of order.items) {
      await transaction.fulfillment.create({
        data: {
          orderItemId: item.id,
          strategy: item.fulfillmentStrategySnapshot,
          providerCode: item.providerCodeSnapshot,
          status: "QUEUED",
          idempotencyKey: `order-item:${item.id}:fulfillment`,
        },
      });
    }

    await transaction.auditLog.create({
      data: {
        actorUserId: input.moderatorId,
        action: "PAYMENT_SUBMISSION_VERIFIED",
        entityType: "PaymentSubmission",
        entityId: submission.id,
        afterSnapshot: { orderId: order.id, amountUsdCents: order.totalUsdCents.toString() },
        correlationId: `order:${order.id}`,
      },
    });

    return { orderId: order.id, orderNumber: order.orderNumber };
  });
}

export interface RejectPaymentSubmissionInput {
  submissionId: string;
  moderatorId: string;
  reason: string;
}

export async function rejectPaymentSubmission(input: RejectPaymentSubmissionInput) {
  const reason = input.reason.trim();
  if (!reason) throw new PaymentReviewError("REASON_REQUIRED");

  const prisma = getPrisma();
  const submission = await prisma.paymentSubmission.findUnique({
    where: { id: input.submissionId },
    select: { id: true, orderId: true },
  });
  if (!submission) throw new PaymentReviewError("SUBMISSION_NOT_FOUND");

  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const claimed = await transaction.paymentSubmission.updateMany({
      where: { id: submission.id, status: { in: [...PENDING_SUBMISSION_STATUSES] } },
      data: {
        status: "REJECTED",
        reviewedByUserId: input.moderatorId,
        reviewedAt: now,
        rejectionReason: reason,
      },
    });
    if (claimed.count === 0) {
      throw new PaymentReviewError("SUBMISSION_ALREADY_REVIEWED");
    }

    if (submission.orderId) {
      await transaction.order.update({
        where: { id: submission.orderId },
        data: { paymentStatus: "REJECTED" },
      });
    }

    await transaction.auditLog.create({
      data: {
        actorUserId: input.moderatorId,
        action: "PAYMENT_SUBMISSION_REJECTED",
        entityType: "PaymentSubmission",
        entityId: submission.id,
        afterSnapshot: { orderId: submission.orderId, reason },
        correlationId: submission.orderId ? `order:${submission.orderId}` : undefined,
      },
    });

    return { ok: true as const };
  });
}
