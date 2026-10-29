import { describe, expect, it } from "vitest";

import type { AuthorizationUser } from "@/domain/identity/authorization-user";
import { createAuthorizationGuards } from "@/policies/authorization";
import {
  AccountUnavailableError,
  ActivationRequiredError,
  AuthenticationRequiredError,
  RoleForbiddenError,
  SessionInvalidatedError,
} from "@/policies/authorization-errors";

const activeClient: AuthorizationUser = {
  id: "active-client",
  email: "active@example.test",
  role: "CLIENT",
  status: "ACTIVE",
};

function guardsFor(
  user: AuthorizationUser | null,
  authenticated = true,
  issuedAtSeconds?: number,
) {
  return createAuthorizationGuards({
    async getSessionPrincipal() {
      return authenticated
        ? { userId: user?.id ?? "missing-user", issuedAtSeconds }
        : null;
    },
    async findCurrentUser() {
      return user;
    },
  });
}

describe("requireActiveUser", () => {
  it("separates authentication from activation", async () => {
    const pending = { ...activeClient, status: "PENDING_ACTIVATION" as const };
    const guards = guardsFor(pending);

    await expect(guards.requireAuthenticatedUser()).resolves.toEqual(pending);
    await expect(guards.requireActiveUser()).rejects.toBeInstanceOf(
      ActivationRequiredError,
    );
  });

  it("allows an active user", async () => {
    await expect(guardsFor(activeClient).requireActiveUser()).resolves.toEqual(
      activeClient,
    );
  });

  it("requires a session", async () => {
    await expect(
      guardsFor(activeClient, false).requireActiveUser(),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it.each(["SUSPENDED", "DISABLED"] as const)(
    "rejects a %s account after reloading current database state",
    async (status) => {
      await expect(
        guardsFor({ ...activeClient, status }).requireActiveUser(),
      ).rejects.toBeInstanceOf(AccountUnavailableError);
    },
  );

  it("enforces allowed roles after activation", async () => {
    await expect(
      guardsFor(activeClient).requireActiveUser({ roles: ["MODERATOR", "ADMIN"] }),
    ).rejects.toBeInstanceOf(RoleForbiddenError);
  });

  it("rejects a session issued before the most recent password change", async () => {
    const changedAt = new Date("2026-08-17T12:00:00.000Z");
    const user = { ...activeClient, passwordChangedAt: changedAt };
    const issuedAtSeconds = changedAt.getTime() / 1000 - 60;

    await expect(
      guardsFor(user, true, issuedAtSeconds).requireActiveUser(),
    ).rejects.toBeInstanceOf(SessionInvalidatedError);
  });

  it("allows a session issued after the most recent password change", async () => {
    const changedAt = new Date("2026-08-17T12:00:00.000Z");
    const user = { ...activeClient, passwordChangedAt: changedAt };
    const issuedAtSeconds = changedAt.getTime() / 1000 + 60;

    await expect(
      guardsFor(user, true, issuedAtSeconds).requireActiveUser(),
    ).resolves.toEqual(user);
  });

  it("does not invalidate when the session has no issued-at claim", async () => {
    const user = { ...activeClient, passwordChangedAt: new Date() };

    await expect(guardsFor(user).requireActiveUser()).resolves.toEqual(user);
  });
});
