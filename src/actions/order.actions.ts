"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  AccountUnavailableError,
  ActivationRequiredError,
  AuthenticationRequiredError,
  RoleForbiddenError,
  SessionInvalidatedError,
} from "@/policies/authorization-errors";
import { clientCapabilityService } from "@/services/capabilities/server-services";
import { OrderCreationError } from "@/services/orders/order.service";

const placeOrderSchema = z.object({
  sku: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export async function createOrderAction(formData: FormData) {
  const sku = String(formData.get("sku") ?? "");
  const parsed = placeOrderSchema.safeParse({
    sku: formData.get("sku"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    redirect(`/checkout/${sku}?error=invalid`);
  }

  let orderNumber: string;
  try {
    ({ orderNumber } = await clientCapabilityService.placeOrder(parsed.data));
  } catch (error) {
    if (error instanceof OrderCreationError) {
      redirect(`/checkout/${sku}?error=unavailable`);
    }
    if (error instanceof AuthenticationRequiredError || error instanceof SessionInvalidatedError) {
      redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout/${sku}`)}`);
    }
    if (error instanceof ActivationRequiredError || error instanceof AccountUnavailableError) {
      redirect(`/checkout/${sku}`);
    }
    if (error instanceof RoleForbiddenError) {
      redirect("/mod");
    }
    throw error;
  }

  redirect(`/account/orders/${orderNumber}`);
}
