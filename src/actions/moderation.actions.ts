"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { AuthorizationError } from "@/policies/authorization-errors";
import { requireModerator } from "@/policies/server-authorization";
import {
  FulfillmentReviewError,
  markFulfillmentProvisioned,
} from "@/services/moderation/fulfillment.service";
import {
  PaymentReviewError,
  acceptPaymentSubmission,
  rejectPaymentSubmission,
} from "@/services/moderation/payment-review.service";

async function requireModeratorOrRedirect() {
  try {
    return await requireModerator();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/login");
    }
    throw error;
  }
}

export async function acceptPaymentSubmissionAction(formData: FormData) {
  const moderator = await requireModeratorOrRedirect();
  const submissionId = String(formData.get("submissionId") ?? "");

  try {
    await acceptPaymentSubmission({ submissionId, moderatorId: moderator.id });
  } catch (error) {
    if (error instanceof PaymentReviewError) {
      redirect(`/mod?error=${error.code}`);
    }
    throw error;
  }

  redirect("/mod?accepted=1");
}

const rejectSchema = z.object({
  submissionId: z.string().min(1),
  reason: z.string().trim().min(1).max(2000),
});

export async function rejectPaymentSubmissionAction(formData: FormData) {
  const moderator = await requireModeratorOrRedirect();
  const parsed = rejectSchema.safeParse({
    submissionId: formData.get("submissionId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirect("/mod?error=REASON_REQUIRED");
  }

  try {
    await rejectPaymentSubmission({
      submissionId: parsed.data.submissionId,
      moderatorId: moderator.id,
      reason: parsed.data.reason,
    });
  } catch (error) {
    if (error instanceof PaymentReviewError) {
      redirect(`/mod?error=${error.code}`);
    }
    throw error;
  }

  redirect("/mod?rejected=1");
}

const provisionSchema = z.object({
  fulfillmentId: z.string().min(1),
  clientVisibleMessage: z.string().trim().min(1).max(4000),
});

export async function markFulfillmentProvisionedAction(formData: FormData) {
  const moderator = await requireModeratorOrRedirect();
  const parsed = provisionSchema.safeParse({
    fulfillmentId: formData.get("fulfillmentId"),
    clientVisibleMessage: formData.get("clientVisibleMessage"),
  });

  if (!parsed.success) {
    redirect("/mod/fulfillments?error=MESSAGE_REQUIRED");
  }

  try {
    await markFulfillmentProvisioned({
      fulfillmentId: parsed.data.fulfillmentId,
      moderatorId: moderator.id,
      clientVisibleMessage: parsed.data.clientVisibleMessage,
    });
  } catch (error) {
    if (error instanceof FulfillmentReviewError) {
      redirect(`/mod/fulfillments?error=${error.code}`);
    }
    throw error;
  }

  redirect("/mod/fulfillments?provisioned=1");
}
