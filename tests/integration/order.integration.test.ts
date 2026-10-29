import { afterAll, describe, expect, it } from "vitest";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

async function registerTestClient(suffix: string) {
  const { registerClient } = await import(
    "@/services/identity/registration.service"
  );
  return registerClient({
    email: `order-test-${suffix}@example.test`,
    password: "OrderTestPassw0rd",
    name: "Order Test Client",
    phoneE164: `+519${Date.now().toString().slice(-8)}`,
    countryCode: "PE",
    displayCurrencyCode: "PEN",
  });
}

describeWithDatabase("order creation and history", () => {
  afterAll(async () => {
    const { getPrisma } = await import("@/lib/db");
    await getPrisma().$disconnect();
  });

  it("persists an immutable price snapshot, a unique order number, and a 24h expiry", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { createOrder } = await import("@/services/orders/order.service");
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const user = await registerTestClient(suffix);

    const { orderNumber } = await createOrder({
      userId: user.id,
      sku: "AI-WORKFLOW-IND",
      quantity: 1,
    });

    expect(orderNumber).toMatch(/^AS-\d{8}-[0-9A-Z]{5}$/);

    const persisted = await getPrisma().order.findUniqueOrThrow({
      where: { orderNumber },
      include: { items: true },
    });

    expect(persisted.status).toBe("PLACED");
    expect(persisted.paymentStatus).toBe("UNPAID");
    expect(persisted.fulfillmentStatus).toBe("NOT_STARTED");
    expect(persisted.subtotalUsdCents).toBe(1900n);
    expect(persisted.totalUsdCents).toBe(1900n);
    expect(persisted.items).toHaveLength(1);
    expect(persisted.items[0]).toMatchObject({
      skuSnapshot: "AI-WORKFLOW-IND",
      quantity: 1,
      unitPriceUsdCents: 1900n,
      lineTotalUsdCents: 1900n,
    });

    const expiresInMs = persisted.expiresAt!.getTime() - Date.now();
    expect(expiresInMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(expiresInMs).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it("clamps an out-of-range quantity to the offer's tier bounds", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { createOrder } = await import("@/services/orders/order.service");
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const user = await registerTestClient(suffix);

    const { orderNumber } = await createOrder({
      userId: user.id,
      sku: "AI-WORKFLOW-TEAM",
      quantity: 999,
    });

    const item = await getPrisma().orderItem.findFirstOrThrow({
      where: { order: { orderNumber } },
    });

    expect(item.quantity).toBe(20);
    expect(item.lineTotalUsdCents).toBe(1600n * 20n);
  });

  it("rejects creation for an unknown or inactive SKU", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { createOrder, OrderCreationError } = await import(
      "@/services/orders/order.service"
    );

    const suffix = crypto.randomUUID();
    const user = await registerTestClient(suffix);

    await expect(
      createOrder({ userId: user.id, sku: "DOES-NOT-EXIST", quantity: 1 }),
    ).rejects.toBeInstanceOf(OrderCreationError);
  });

  it("scopes order history and detail lookups to the owning user only", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { createOrder } = await import("@/services/orders/order.service");
    const { orderRepository } = await import("@/repositories/order.repository");

    const suffixA = crypto.randomUUID();
    const suffixB = crypto.randomUUID();
    const userA = await registerTestClient(suffixA);
    const userB = await registerTestClient(suffixB);

    const { orderNumber } = await createOrder({
      userId: userA.id,
      sku: "AI-WORKFLOW-IND",
      quantity: 1,
    });

    const ownerHistory = await orderRepository.listForUser(userA.id);
    expect(ownerHistory.map((o) => o.orderNumber)).toContain(orderNumber);

    const strangerHistory = await orderRepository.listForUser(userB.id);
    expect(strangerHistory.map((o) => o.orderNumber)).not.toContain(orderNumber);

    await expect(
      orderRepository.findDetailForUser(orderNumber, userB.id),
    ).resolves.toBeNull();

    const ownDetail = await orderRepository.findDetailForUser(orderNumber, userA.id);
    expect(ownDetail?.orderNumber).toBe(orderNumber);
    expect(ownDetail?.items[0].skuSnapshot).toBe("AI-WORKFLOW-IND");
  });
});
