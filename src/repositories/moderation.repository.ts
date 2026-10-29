import "server-only";

import type {
  FulfillmentQueueItemDto,
  PendingReviewSubmissionDto,
} from "@/domain/moderation/moderation-dto";
import { getPrisma } from "@/lib/db";

export const moderationRepository = {
  async listPendingSubmissions(): Promise<PendingReviewSubmissionDto[]> {
    const submissions = await getPrisma().paymentSubmission.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        reportedAmountMinor: true,
        reportedCurrencyCode: true,
        externalReference: true,
        clientNote: true,
        createdAt: true,
        submittedBy: { select: { email: true, name: true } },
        order: { select: { orderNumber: true, totalUsdCents: true } },
        proofs: {
          orderBy: { createdAt: "asc" },
          select: { id: true, originalFileName: true, mimeType: true },
        },
      },
    });

    return submissions.map((submission) => ({
      submissionId: submission.id,
      orderNumber: submission.order?.orderNumber ?? null,
      orderTotalUsdCents: submission.order ? Number(submission.order.totalUsdCents) : null,
      clientEmail: submission.submittedBy.email,
      clientName: submission.submittedBy.name,
      reportedAmountMinor: Number(submission.reportedAmountMinor),
      reportedCurrencyCode: submission.reportedCurrencyCode,
      externalReference: submission.externalReference,
      clientNote: submission.clientNote,
      createdAt: submission.createdAt.toISOString(),
      proofs: submission.proofs,
    }));
  },

  async listQueuedFulfillments(): Promise<FulfillmentQueueItemDto[]> {
    const fulfillments = await getPrisma().fulfillment.findMany({
      where: { status: { in: ["QUEUED", "IN_PROGRESS"] } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        strategy: true,
        status: true,
        createdAt: true,
        orderItem: {
          select: {
            offerNameSnapshot: true,
            serviceNameSnapshot: true,
            quantity: true,
            order: { select: { orderNumber: true, user: { select: { email: true } } } },
          },
        },
      },
    });

    return fulfillments.map((fulfillment) => ({
      fulfillmentId: fulfillment.id,
      orderNumber: fulfillment.orderItem.order.orderNumber,
      serviceName: fulfillment.orderItem.serviceNameSnapshot,
      offerName: fulfillment.orderItem.offerNameSnapshot,
      quantity: fulfillment.orderItem.quantity,
      clientEmail: fulfillment.orderItem.order.user.email,
      strategy: fulfillment.strategy,
      status: fulfillment.status,
      createdAt: fulfillment.createdAt.toISOString(),
    }));
  },
};
