import "server-only";

import type { CatalogServiceDto } from "@/domain/catalog/catalog-dto";
import { getPrisma } from "@/lib/db";

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  description: true,
  isFeatured: true,
  category: { select: { name: true, slug: true } },
  offers: {
    where: { isActive: true },
    orderBy: [{ unitPriceUsdCents: "asc" as const }],
    select: {
      id: true,
      name: true,
      sku: true,
      unitPriceUsdCents: true,
      minimumQuantity: true,
      maximumQuantity: true,
      estimatedDeliveryMinutes: true,
      fulfillmentStrategy: true,
    },
  },
};

function toDto(service: Awaited<ReturnType<typeof findRawServices>>[number]): CatalogServiceDto {
  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    shortDescription: service.shortDescription,
    description: service.description,
    categoryName: service.category.name,
    categorySlug: service.category.slug,
    isFeatured: service.isFeatured,
    offers: service.offers.map((offer) => ({
      ...offer,
      unitPriceUsdCents: Number(offer.unitPriceUsdCents),
    })),
  };
}

function findRawServices() {
  return getPrisma().service.findMany({
    where: {
      status: "ACTIVE",
      category: { isActive: true },
      offers: { some: { isActive: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
    select: catalogSelect,
  });
}

export const catalogRepository = {
  async listServices() {
    return (await findRawServices()).map(toDto);
  },

  async listFeatured(limit = 3) {
    const services = await getPrisma().service.findMany({
      where: {
        status: "ACTIVE",
        isFeatured: true,
        category: { isActive: true },
        offers: { some: { isActive: true } },
      },
      orderBy: { sortOrder: "asc" },
      take: limit,
      select: catalogSelect,
    });
    return services.map(toDto);
  },

  async findBySlug(slug: string) {
    const service = await getPrisma().service.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        category: { isActive: true },
        offers: { some: { isActive: true } },
      },
      select: catalogSelect,
    });
    return service ? toDto(service) : null;
  },

  async findOfferBySku(sku: string) {
    const offer = await getPrisma().serviceOffer.findFirst({
      where: { sku, isActive: true, service: { status: "ACTIVE" } },
      select: {
        id: true,
        name: true,
        sku: true,
        unitPriceUsdCents: true,
        minimumQuantity: true,
        maximumQuantity: true,
        estimatedDeliveryMinutes: true,
        service: { select: { name: true, slug: true } },
      },
    });

    return offer
      ? { ...offer, unitPriceUsdCents: Number(offer.unitPriceUsdCents) }
      : null;
  },
};
