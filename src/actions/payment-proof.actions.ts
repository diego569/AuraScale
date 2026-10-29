"use server";

import { z } from "zod";

import { clientCapabilityService } from "@/services/capabilities/server-services";
import { PaymentProofSubmissionError } from "@/services/payments/payment-submission.service";
import {
  PAYMENT_PROOF_MAX_SIZE_BYTES,
  isAllowedProofMimeType,
} from "@/validation/payment-proof";

const submitPaymentProofSchema = z.object({
  orderNumber: z.string().min(1),
  reportedAmount: z.coerce.number().positive(),
  reportedCurrencyCode: z.enum(["USD", "PEN"]),
  externalReference: z.string().max(255).optional(),
  clientNote: z.string().max(2000).optional(),
});

const PROOF_SUBMISSION_ERROR_MESSAGES: Record<PaymentProofSubmissionError["code"], string> = {
  ORDER_NOT_FOUND: "Order not found.",
  ORDER_NOT_ELIGIBLE: "This order already has a proof under review or verified.",
  WALLET_NOT_FOUND: "No wallet was found for this account.",
  FILE_TOO_LARGE: "File is too large (max 8MB).",
  FILE_TYPE_NOT_ALLOWED: "Unsupported file type. Use JPEG, PNG, WEBP, or PDF.",
};

export interface SubmitPaymentProofActionResult {
  ok: boolean;
  error?: string;
}

export async function submitPaymentProofAction(
  formData: FormData,
): Promise<SubmitPaymentProofActionResult> {
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please attach a payment proof file." };
  }

  const parsed = submitPaymentProofSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    reportedAmount: formData.get("reportedAmount"),
    reportedCurrencyCode: formData.get("reportedCurrencyCode"),
    externalReference: formData.get("externalReference") || undefined,
    clientNote: formData.get("clientNote") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Please check the submitted details." };
  }

  if (!isAllowedProofMimeType(file.type)) {
    return { ok: false, error: PROOF_SUBMISSION_ERROR_MESSAGES.FILE_TYPE_NOT_ALLOWED };
  }
  if (file.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
    return { ok: false, error: PROOF_SUBMISSION_ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const reportedAmountMinor = BigInt(Math.round(parsed.data.reportedAmount * 100));

  try {
    await clientCapabilityService.submitPaymentProof({
      orderNumber: parsed.data.orderNumber,
      file: { buffer, originalFileName: file.name, mimeType: file.type },
      reportedAmountMinor,
      reportedCurrencyCode: parsed.data.reportedCurrencyCode,
      externalReference: parsed.data.externalReference ?? null,
      clientNote: parsed.data.clientNote ?? null,
    });
  } catch (error) {
    if (error instanceof PaymentProofSubmissionError) {
      return { ok: false, error: PROOF_SUBMISSION_ERROR_MESSAGES[error.code] };
    }
    throw error;
  }

  return { ok: true };
}
