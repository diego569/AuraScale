import "server-only";

import type { OrderDetailDto, OrderSummaryDto } from "@/domain/orders/order-dto";
import { getPrisma } from "@/lib/db";

export const orderRepository = {
  async listForUser(userId: string): Promise<OrderSummaryDto[]> {
    const orders = await getPrisma().order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        orderNumber: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        totalUsdCents: true,
        createdAt: true,
        items: {
          select: { offerNameSnapshot: true, quantity: true },
        },
      },
    });

    return orders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      totalUsdCents: Number(order.totalUsdCents),
      createdAt: order.createdAt.toISOString(),
      itemSummary: order.items
        .map((item) => `${item.offerNameSnapshot} × ${item.quantity}`)
        .join(", "),
    }));
  },

  async findDetailForUser(
    orderNumber: string,
    userId: string,
  ): Promise<OrderDetailDto | null> {
    const order = await getPrisma().order.findFirst({
      where: { orderNumber, userId },
      select: {
        orderNumber: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        subtotalUsdCents: true,
        totalUsdCents: true,
        displayCurrencyCode: true,
        displayTotalMinor: true,
        expiresAt: true,
        placedAt: true,
        items: {
          select: {
            serviceNameSnapshot: true,
            offerNameSnapshot: true,
            skuSnapshot: true,
            unitPriceUsdCents: true,
            quantity: true,
            lineTotalUsdCents: true,
            fulfillment: {
              select: { status: true, clientVisibleMessage: true, provisionedAt: true },
            },
          },
        },
        paymentSubmissions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            reportedAmountMinor: true,
            reportedCurrencyCode: true,
            externalReference: true,
            clientNote: true,
            rejectionReason: true,
            createdAt: true,
            proofs: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                originalFileName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!order) return null;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      subtotalUsdCents: Number(order.subtotalUsdCents),
      totalUsdCents: Number(order.totalUsdCents),
      displayCurrencyCode: order.displayCurrencyCode,
      displayTotalMinor: Number(order.displayTotalMinor),
      expiresAt: order.expiresAt?.toISOString() ?? null,
      placedAt: order.placedAt?.toISOString() ?? null,
      items: order.items.map((item) => ({
        serviceNameSnapshot: item.serviceNameSnapshot,
        offerNameSnapshot: item.offerNameSnapshot,
        skuSnapshot: item.skuSnapshot,
        unitPriceUsdCents: Number(item.unitPriceUsdCents),
        quantity: item.quantity,
        lineTotalUsdCents: Number(item.lineTotalUsdCents),
        fulfillment: item.fulfillment
          ? {
              status: item.fulfillment.status,
              clientVisibleMessage: item.fulfillment.clientVisibleMessage,
              provisionedAt: item.fulfillment.provisionedAt?.toISOString() ?? null,
            }
          : null,
      })),
      submissions: order.paymentSubmissions.map((submission) => ({
        id: submission.id,
        status: submission.status,
        reportedAmountMinor: Number(submission.reportedAmountMinor),
        reportedCurrencyCode: submission.reportedCurrencyCode,
        externalReference: submission.externalReference,
        clientNote: submission.clientNote,
        rejectionReason: submission.rejectionReason,
        createdAt: submission.createdAt.toISOString(),
        proofs: submission.proofs.map((proof) => ({
          id: proof.id,
          originalFileName: proof.originalFileName,
          mimeType: proof.mimeType,
          sizeBytes: Number(proof.sizeBytes),
          createdAt: proof.createdAt.toISOString(),
        })),
      })),
    };
  },
};
