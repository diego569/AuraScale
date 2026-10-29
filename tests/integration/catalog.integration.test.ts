import { afterAll, describe, expect, it } from "vitest";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase("catalog repository active-offer filtering", () => {
  const suffix = crypto.randomUUID();
  const categorySlug = `test-category-${suffix}`;
  const visibleSlug = `test-visible-service-${suffix}`;
  const hiddenSlug = `test-hidden-service-${suffix}`;

  afterAll(async () => {
    const { getPrisma } = await import("@/lib/db");
    await getPrisma().$disconnect();
  });

  it("excludes a service whose only offers are inactive, and strips inactive offers from a visible service", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const { getPrisma } = await import("@/lib/db");
    const { catalogRepository } = await import(
      "@/repositories/catalog.repository"
    );
    const prisma = getPrisma();

    const category = await prisma.serviceCategory.create({
      data: { name: "Test Category", slug: categorySlug, isActive: true },
    });

    const visibleService = await prisma.service.create({
      data: {
        categoryId: category.id,
        name: "Visible Test Service",
        slug: visibleSlug,
        status: "ACTIVE",
        isFeatured: false,
        offers: {
          create: [
            {
              name: "Active tier",
              sku: `test-active-offer-${suffix}`,
              unitPriceUsdCents: 1999n,
              isActive: true,
            },
            {
              name: "Retired tier",
              sku: `test-inactive-offer-${suffix}`,
              unitPriceUsdCents: 999n,
              isActive: false,
            },
          ],
        },
      },
    });

    const hiddenService = await prisma.service.create({
      data: {
        categoryId: category.id,
        name: "Hidden Test Service",
        slug: hiddenSlug,
        status: "ACTIVE",
        offers: {
          create: [
            {
              name: "Retired only tier",
              sku: `test-hidden-offer-${suffix}`,
              unitPriceUsdCents: 500n,
              isActive: false,
            },
          ],
        },
      },
    });

    const services = await catalogRepository.listServices();
    const slugs = services.map((service) => service.slug);
    expect(slugs).toContain(visibleSlug);
    expect(slugs).not.toContain(hiddenSlug);

    await expect(catalogRepository.findBySlug(hiddenSlug)).resolves.toBeNull();

    const visibleDto = await catalogRepository.findBySlug(visibleSlug);
    expect(visibleDto).not.toBeNull();
    expect(visibleDto?.offers).toHaveLength(1);
    expect(visibleDto?.offers[0]).toMatchObject({
      sku: `test-active-offer-${suffix}`,
      unitPriceUsdCents: 1999,
    });
    expect(typeof visibleDto?.offers[0].unitPriceUsdCents).toBe("number");
  });
});
