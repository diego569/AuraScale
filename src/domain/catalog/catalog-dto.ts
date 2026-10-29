export interface CatalogOfferDto {
  id: string;
  name: string;
  sku: string;
  unitPriceUsdCents: number;
  minimumQuantity: number;
  maximumQuantity: number | null;
  estimatedDeliveryMinutes: number | null;
  fulfillmentStrategy: "MANUAL" | "API_AUTOMATIC";
}

export interface CatalogServiceDto {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  categoryName: string;
  categorySlug: string;
  isFeatured: boolean;
  offers: CatalogOfferDto[];
}
