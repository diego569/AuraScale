import { formatUsd } from "@/components/storefront/money";

function whatsappBaseUrl(message: string) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function whatsappActivationUrl() {
  return whatsappBaseUrl(
    "Hello AuraScale, I have signed in and would like help completing my account activation.",
  );
}

export function whatsappOrderPaymentUrl(order: {
  orderNumber: string;
  serviceName: string;
  offerName: string;
  quantity: number;
  totalUsdCents: number;
}) {
  return whatsappBaseUrl(
    `Hello AuraScale, I'd like to complete payment for order ${order.orderNumber} ` +
      `(${order.serviceName} - ${order.offerName} x${order.quantity}), ` +
      `total ${formatUsd(order.totalUsdCents)}.`,
  );
}
