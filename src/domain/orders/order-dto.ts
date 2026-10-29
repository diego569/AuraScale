export interface OrderSummaryDto {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalUsdCents: number;
  createdAt: string;
  itemSummary: string;
}

export interface OrderItemFulfillmentDto {
  status: string;
  clientVisibleMessage: string | null;
  provisionedAt: string | null;
}

export interface OrderItemDto {
  serviceNameSnapshot: string;
  offerNameSnapshot: string;
  skuSnapshot: string;
  unitPriceUsdCents: number;
  quantity: number;
  lineTotalUsdCents: number;
  fulfillment: OrderItemFulfillmentDto | null;
}

export interface PaymentProofDto {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface PaymentSubmissionDto {
  id: string;
  status: string;
  reportedAmountMinor: number;
  reportedCurrencyCode: string;
  externalReference: string | null;
  clientNote: string | null;
  rejectionReason: string | null;
  createdAt: string;
  proofs: PaymentProofDto[];
}

export interface OrderDetailDto {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotalUsdCents: number;
  totalUsdCents: number;
  displayCurrencyCode: string;
  displayTotalMinor: number;
  expiresAt: string | null;
  placedAt: string | null;
  items: OrderItemDto[];
  submissions: PaymentSubmissionDto[];
}
