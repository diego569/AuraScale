import { afterAll, describe, expect, it } from "vitest";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase("fx repository reference-rate resolution", () => {
  const suffix = crypto.randomUUID();
  const validQuoteCode = "TS1";
  const expiredQuoteCode = "TS2";

  // FxRate rows are append-only (a DB trigger rejects DELETE), so fixtures are
  // intentionally left in place rather than torn down, matching how the other
  // integration tests never delete what they create.
  afterAll(async () => {
    const { getPrisma } = await import("@/lib/db");
    await getPrisma().$disconnect();
  });

  it("returns null instead of a hardcoded fallback when no observation exists", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { fxRepository } = await import("@/repositories/fx.repository");

    await expect(
      fxRepository.findLatestRate("USD", "NOP"),
    ).resolves.toBeNull();
  });

  it("returns the numeric rate for a currently effective, unexpired observation", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { getPrisma } = await import("@/lib/db");
    const { fxRepository } = await import("@/repositories/fx.repository");
    const prisma = getPrisma();

    await prisma.currency.upsert({
      where: { code: validQuoteCode },
      create: { code: validQuoteCode, name: "Test Currency", symbol: "T$" },
      update: {},
    });

    await prisma.fxRate.create({
      data: {
        baseCurrencyCode: "USD",
        quoteCurrencyCode: validQuoteCode,
        rate: "3.75000000",
        source: `test-fixture-${suffix}`,
        effectiveAt: new Date(Date.now() - 60_000),
        expiresAt: null,
      },
    });

    const rate = await fxRepository.findLatestRate("USD", validQuoteCode);
    expect(rate).toBe(3.75);
  });

  it("excludes an observation that has already expired, leaving no fallback value", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { getPrisma } = await import("@/lib/db");
    const { fxRepository } = await import("@/repositories/fx.repository");
    const prisma = getPrisma();

    await prisma.currency.upsert({
      where: { code: expiredQuoteCode },
      create: { code: expiredQuoteCode, name: "Test Currency", symbol: "T$" },
      update: {},
    });

    await prisma.fxRate.create({
      data: {
        baseCurrencyCode: "USD",
        quoteCurrencyCode: expiredQuoteCode,
        rate: "4.10000000",
        source: `test-fixture-${suffix}`,
        effectiveAt: new Date(Date.now() - 86_400_000),
        expiresAt: new Date(Date.now() - 3_600_000),
      },
    });

    await expect(
      fxRepository.findLatestRate("USD", expiredQuoteCode),
    ).resolves.toBeNull();
  });
});
