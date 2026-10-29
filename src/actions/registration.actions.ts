"use server";

import { registerClient, registrationSchema } from "@/services/identity/registration.service";

export interface RegistrationActionResult {
  ok: boolean;
  userId?: string;
  status?: "PENDING_ACTIVATION";
  fieldErrors?: Record<string, string[]>;
}

export async function registerClientAction(
  formData: FormData,
): Promise<RegistrationActionResult> {
  const parsed = registrationSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    phoneE164: formData.get("phoneE164"),
    countryCode: formData.get("countryCode") || "PE",
    displayCurrencyCode: formData.get("displayCurrencyCode") || "PEN",
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await registerClient(parsed.data);
  return { ok: true, userId: user.id, status: "PENDING_ACTIVATION" };
}
