"use server";

import { clientCapabilityService } from "@/services/capabilities/server-services";

export async function getWalletBalanceAction() {
  return clientCapabilityService.getWalletBalance();
}

export async function getLedgerHistoryAction(cursor?: string | null) {
  return clientCapabilityService.getLedgerHistory(cursor);
}

export async function submitPaymentDepositAction() {
  return clientCapabilityService.submitPaymentDeposit();
}

export async function getAuthenticatedCatalogPricingAction() {
  return clientCapabilityService.getAuthenticatedCatalogPricing();
}

export async function createCheckoutAction() {
  return clientCapabilityService.createCheckout();
}

export async function createOrderAction() {
  return clientCapabilityService.createOrder();
}

export async function executePurchaseAction() {
  return clientCapabilityService.executePurchase();
}

export async function requestRefundAction() {
  return clientCapabilityService.requestRefund();
}

export async function executeBalanceCommandAction() {
  return clientCapabilityService.executeBalanceCommand();
}

export async function getFulfillmentDataAction() {
  return clientCapabilityService.getFulfillmentData();
}
