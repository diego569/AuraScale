import "server-only";

import {
  requireActiveUser,
  requireAuthenticatedUser,
} from "@/policies/server-authorization";
import { ledgerRepository } from "@/repositories/ledger.repository";
import { orderRepository } from "@/repositories/order.repository";
import { walletRepository } from "@/repositories/wallet.repository";
import { ClientCapabilityService } from "@/services/capabilities/client-capability-service";
import { PendingUserService } from "@/services/capabilities/pending-user-service";
import { createOrder } from "@/services/orders/order.service";
import { submitPaymentProof } from "@/services/payments/payment-submission.service";

export const clientCapabilityService = new ClientCapabilityService(
  () => requireActiveUser({ roles: ["CLIENT"] }),
  (userId) => walletRepository.findSummaryByUserId(userId),
  (userId, cursor) => ledgerRepository.listHistoryForUser(userId, cursor),
  (userId, input) => createOrder({ userId, sku: input.sku, quantity: input.quantity }),
  (userId, input) => submitPaymentProof({ userId, ...input }),
  (userId) => orderRepository.listForUser(userId),
  (userId, orderNumber) => orderRepository.findDetailForUser(orderNumber, userId),
);

export const pendingUserService = new PendingUserService(
  requireAuthenticatedUser,
);
