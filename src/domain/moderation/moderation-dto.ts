export interface PendingReviewProofDto {
  id: string;
  originalFileName: string;
  mimeType: string;
}

export interface PendingReviewSubmissionDto {
  submissionId: string;
  orderNumber: string | null;
  orderTotalUsdCents: number | null;
  clientEmail: string;
  clientName: string | null;
  reportedAmountMinor: number;
  reportedCurrencyCode: string;
  externalReference: string | null;
  clientNote: string | null;
  createdAt: string;
  proofs: PendingReviewProofDto[];
}

export interface FulfillmentQueueItemDto {
  fulfillmentId: string;
  orderNumber: string;
  serviceName: string;
  offerName: string;
  quantity: number;
  clientEmail: string;
  strategy: string;
  status: string;
  createdAt: string;
}
