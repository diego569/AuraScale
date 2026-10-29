import { afterAll, describe, expect, it } from "vitest";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase("client registration and pending login", () => {
  afterAll(async () => {
    const { getPrisma } = await import("@/lib/db");
    await getPrisma().$disconnect();
  });

  it("atomically provisions pending identity, credential, wallet, accounts, and activation", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { registerClient } = await import(
      "@/services/identity/registration.service"
    );
    const { authenticateCredentials } = await import("@/auth/authenticate");
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const email = `pending-${suffix}@example.test`;
    const password = "StrongPending123";

    const registered = await registerClient({
      email,
      password,
      name: "Pending Client",
      phoneE164: `+519${Date.now().toString().slice(-8)}`,
      countryCode: "PE",
      displayCurrencyCode: "PEN",
    });

    expect(registered.status).toBe("PENDING_ACTIVATION");

    const persisted = await getPrisma().user.findUniqueOrThrow({
      where: { id: registered.id },
      include: {
        passwordCredential: true,
        wallet: { include: { accounts: true } },
        activationWorkflows: true,
      },
    });

    expect(persisted.wallet?.currencyCode).toBe("USD");
    expect(persisted.wallet?.accounts).toHaveLength(2);
    expect(persisted.passwordCredential?.passwordHash).not.toBe(password);
    expect(persisted.activationWorkflows).toHaveLength(1);
    expect(persisted.activationWorkflows[0]).toMatchObject({
      status: "PENDING",
      methodCode: "WHATSAPP_MANUAL",
      providerCode: "INTERNAL_WHATSAPP",
    });

    await expect(
      authenticateCredentials({ email, password }),
    ).resolves.toMatchObject({
      id: registered.id,
      status: "PENDING_ACTIVATION",
    });
  });
});
