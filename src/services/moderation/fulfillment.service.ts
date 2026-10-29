import "server-only";

import { getPrisma } from "@/lib/db";

export class FulfillmentReviewError extends Error {
  constructor(
    readonly code: "FULFILLMENT_NOT_FOUND" | "FULFILLMENT_ALREADY_PROVISIONED",
  ) {
    super(`Fulfillment update failed: ${code}`);
    this.name = "FulfillmentReviewError";
  }
}

const OPEN_FULFILLMENT_STATUSES = ["QUEUED", "IN_PROGRESS"] as const;

export interface MarkFulfillmentProvisionedInput {
  fulfillmentId: string;
  moderatorId: string;
  clientVisibleMessage: string;
}

export async function markFulfillmentProvisioned(input: MarkFulfillmentProvisionedInput) {
  const prisma = getPrisma();

  const fulfillment = await prisma.fulfillment.findUnique({
    where: { id: input.fulfillmentId },
    select: {
      id: true,
      orderItem: { select: { orderId: true } },
    },
  });
  if (!fulfillment) throw new FulfillmentReviewError("FULFILLMENT_NOT_FOUND");

  const orderId = fulfillment.orderItem.orderId;
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const claimed = await transaction.fulfillment.updateMany({
      where: { id: fulfillment.id, status: { in: [...OPEN_FULFILLMENT_STATUSES] } },
      data: {
        status: "PROVISIONED",
        provisionedAt: now,
        assignedToUserId: input.moderatorId,
        clientVisibleMessage: input.clientVisibleMessage,
      },
    });
    if (claimed.count === 0) {
      throw new FulfillmentReviewError("FULFILLMENT_ALREADY_PROVISIONED");
    }

    const priorAttempts = await transaction.fulfillmentAttempt.count({
      where: { fulfillmentId: fulfillment.id },
    });
    await transaction.fulfillmentAttempt.create({
      data: {
        fulfillmentId: fulfillment.id,
        attemptNumber: priorAttempts + 1,
        trigger: "MANUAL",
        status: "SUCCEEDED",
        actorUserId: input.moderatorId,
        completedAt: now,
      },
    });

    await transaction.auditLog.create({
      data: {
        actorUserId: input.moderatorId,
        action: "FULFILLMENT_PROVISIONED",
        entityType: "Fulfillment",
        entityId: fulfillment.id,
        afterSnapshot: { orderId },
        correlationId: `order:${orderId}`,
      },
    });

    const siblingFulfillments = await transaction.fulfillment.findMany({
      where: { orderItem: { orderId } },
      select: { status: true },
    });
    const allProvisioned = siblingFulfillments.every((item) => item.status === "PROVISIONED");

    if (allProvisioned) {
      await transaction.order.update({
        where: { id: orderId },
        data: { fulfillmentStatus: "PROVISIONED", status: "COMPLETED", completedAt: now },
      });
    }

    return { orderId, allProvisioned };
  });
}
