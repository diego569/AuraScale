import { describe, expect, it, vi } from "vitest";

import type { AuthorizationUser } from "@/domain/identity/authorization-user";
import { createAuthorizationGuards } from "@/policies/authorization";
import { ActivationRequiredError } from "@/policies/authorization-errors";
import { ClientCapabilityService } from "@/services/capabilities/client-capability-service";
import { PendingUserService } from "@/services/capabilities/pending-user-service";

const pendingClient: AuthorizationUser = {
  id: "pending-client",
  email: "pending@example.test",
  role: "CLIENT",
  status: "PENDING_ACTIVATION",
};

const activeClient: AuthorizationUser = {
  ...pendingClient,
  id: "active-client",
  status: "ACTIVE",
};

function createServices(user: AuthorizationUser) {
  const findCurrentUser = vi.fn(async () => user);
  const guards = createAuthorizationGuards({
    async getSessionPrincipal() {
      return { userId: user.id };
    },
    findCurrentUser,
  });

  return {
    findCurrentUser,
    client: new ClientCapabilityService(() =>
      guards.requireActiveUser({ roles: ["CLIENT"] }),
    ),
    pending: new PendingUserService(guards.requireAuthenticatedUser),
  };
}

const protectedMethods = [
  ["wallet balance read", "getWalletBalance"],
  ["ledger history read", "getLedgerHistory"],
  ["payment/deposit submission", "submitPaymentDeposit"],
  ["authenticated catalog pricing", "getAuthenticatedCatalogPricing"],
  ["checkout creation", "createCheckout"],
  ["order creation", "createOrder"],
  ["purchase command", "executePurchase"],
  ["refund command", "requestRefund"],
  ["balance command", "executeBalanceCommand"],
  ["fulfillment-data read", "getFulfillmentData"],
] as const;

describe("pending-user capability matrix", () => {
  it.each(protectedMethods)("blocks %s until ACTIVE", async (_label, method) => {
    const { client, findCurrentUser } = createServices(pendingClient);

    await expect(client[method]()).rejects.toBeInstanceOf(ActivationRequiredError);
    expect(findCurrentUser).toHaveBeenCalledWith(pendingClient.id);
  });

  it.each(protectedMethods)("allows %s for an ACTIVE client", async (_label, method) => {
    const { client } = createServices(activeClient);
    await expect(client[method]()).resolves.toMatchObject({ userId: activeClient.id });
  });

  it("allows activation status, profile correction, and support while pending", async () => {
    const { pending } = createServices(pendingClient);

    await expect(pending.getActivationStatus()).resolves.toEqual({
      userId: pendingClient.id,
      status: "PENDING_ACTIVATION",
    });
    await expect(pending.getProfileCorrectionContext()).resolves.toMatchObject({
      editable: true,
    });
    await expect(pending.getSupportContext()).resolves.toMatchObject({
      canContactSupport: true,
    });
  });
});
