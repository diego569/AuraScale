"use server";

import {
  requestPasswordReset,
  requestPasswordResetSchema,
  resetPassword,
  resetPasswordSchema,
} from "@/services/identity/password-reset.service";

export interface RequestPasswordResetActionResult {
  ok: boolean;
  fieldErrors?: Record<string, string[]>;
}

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<RequestPasswordResetActionResult> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await requestPasswordReset(parsed.data);
  return { ok: true };
}

export interface ResetPasswordActionResult {
  ok: boolean;
  reason?: "INVALID_OR_EXPIRED";
  fieldErrors?: Record<string, string[]>;
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<ResetPasswordActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await resetPassword(parsed.data);
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  return { ok: true };
}
