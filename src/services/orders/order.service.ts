import "server-only";

import { randomInt } from "node:crypto";

import { Prisma } from "@prisma/client";

import { getPrisma } from "@/lib/db";

const ORDER_TTL_MS = 24 * 60 * 60 * 1000;
const ORDER_NUMBER_MAX_ATTEMPTS = 5;

export class OrderCreationError extends Error {
  constructor(readonly code: "OFFER_UNAVAILABLE" | "USER_NOT_FOUND") {
    super(`Order could not be created: ${code}`);
    this.name = "OrderCreationError";
  }
}

function generateOrderNumber() {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const suffix = randomInt(0, 36 ** 5).toString(36).toUpperCase().padStart(5, "0");
  return `AS-${stamp}-${suffix}`;
}

export interface CreateOrderInput {
  userId: string;
  sku: string;
  quantity: number;
}

export async function createOrder(input: CreateOrderInput) {
  const prisma = getPrisma();

  const [offer, user] = await Promise.all([
    prisma.serviceOffer.findFirst({
      where: { sku: input.sku, isActive: true, service: { status: "ACTIVE" } },
      select: {
        id: true,
        name: true,
        sku: true,
        unitPriceUsdCents: true,
        minimumQuantity: true,
        maximumQuantity: true,
        fulfillmentStrategy: true,
        providerCode: true,
        service: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { countryCode: true, displayCurrencyCode: true },
    }),
  ]);

  if (!offer) throw new OrderCreationError("OFFER_UNAVAILABLE");
  if (!user) throw new OrderCreationError("USER_NOT_FOUND");

  const quantity = Math.min(
    Math.max(Math.trunc(input.quantity) || offer.minimumQuantity, offer.minimumQuantity),
    offer.maximumQuantity ?? 999,
  );

  const lineTotalUsdCents = offer.unitPriceUsdCents * BigInt(quantity);
  const countryCode = user.countryCode ?? "PE";
  const preferredDisplayCurrencyCode = user.displayCurrencyCode ?? "PEN";

  const fxRate =
    preferredDisplayCurrencyCode === "USD"
      ? null
      : await prisma.fxRate.findFirst({
          where: {
            baseCurrencyCode: "USD",
            quoteCurrencyCode: preferredDisplayCurrencyCode,
            effectiveAt: { lte: new Date() },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { effectiveAt: "desc" },
          select: { id: true, rate: true },
        });

  // No fabricated fallback rate: if a reference rate isn't available, this
  // order's display currency degrades to USD (identical to the authoritative
  // total) rather than storing a fictitious non-USD amount.
  const displayCurrencyCode = fxRate ? preferredDisplayCurrencyCode : "USD";
  const displayTotalMinor = fxRate
    ? BigInt(Math.round(Number(lineTotalUsdCents) * Number(fxRate.rate)))
    : lineTotalUsdCents;

  for (let attempt = 0; attempt < ORDER_NUMBER_MAX_ATTEMPTS; attempt += 1) {
    const orderNumber = generateOrderNumber();

    try {
      return await prisma.$transaction(async (transaction) => {
        const order = await transaction.order.create({
          data: {
            orderNumber,
            userId: input.userId,
            countryCode,
            paymentMethodCode: "WHATSAPP_MANUAL",
            status: "PLACED",
            paymentStatus: "UNPAID",
            fulfillmentStatus: "NOT_STARTED",
            baseCurrencyCode: "USD",
            displayCurrencyCode,
            fxRateId: fxRate?.id ?? null,
            fxRateSnapshot: fxRate?.rate ?? null,
            subtotalUsdCents: lineTotalUsdCents,
            discountUsdCents: 0n,
            totalUsdCents: lineTotalUsdCents,
            displayTotalMinor,
            placedAt: new Date(),
            expiresAt: new Date(Date.now() + ORDER_TTL_MS),
          },
          select: { id: true, orderNumber: true },
        });

        await transaction.orderItem.create({
          data: {
            orderId: order.id,
            serviceId: offer.service.id,
            serviceOfferId: offer.id,
            serviceNameSnapshot: offer.service.name,
            offerNameSnapshot: offer.name,
            skuSnapshot: offer.sku,
            unitPriceUsdCents: offer.unitPriceUsdCents,
            quantity,
            lineTotalUsdCents,
            fulfillmentStrategySnapshot: offer.fulfillmentStrategy,
            providerCodeSnapshot: offer.providerCode,
          },
        });

        await transaction.auditLog.create({
          data: {
            actorUserId: input.userId,
            action: "ORDER_PLACED",
            entityType: "Order",
            entityId: order.id,
            afterSnapshot: {
              orderNumber: order.orderNumber,
              sku: offer.sku,
              quantity,
              totalUsdCents: lineTotalUsdCents.toString(),
            },
            correlationId: `order:${order.id}`,
          },
        });

        return { orderNumber: order.orderNumber };
      });
    } catch (error) {
      const isOrderNumberConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("orderNumber");

      if (!isOrderNumberConflict || attempt === ORDER_NUMBER_MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error("Unreachable: order number retry loop exhausted without returning.");
}
