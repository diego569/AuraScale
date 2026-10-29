import { describe, expect, it, vi } from "vitest";

import {
  createCredentialAuthenticator,
  type CredentialRecord,
} from "@/auth/credential-authenticator";

function record(
  status: CredentialRecord["user"]["status"],
): CredentialRecord {
  return {
    user: {
      id: "user-1",
      email: "client@example.test",
      role: "CLIENT",
      status,
    },
    passwordHash: "stored-hash",
    failedAttempts: 0,
    lockedUntil: null,
  };
}

function createAuthenticator(
  credential: CredentialRecord | null,
  passwordMatches = true,
) {
  const dependencies = {
    findByNormalizedEmail: vi.fn(async () => credential),
    verifyPassword: vi.fn(async () => passwordMatches),
    consumeMissingUserPassword: vi.fn(async () => undefined),
    recordFailure: vi.fn(async () => undefined),
    clearFailures: vi.fn(async () => undefined),
    now: () => new Date("2026-08-14T12:00:00.000Z"),
  };

  return {
    authenticate: createCredentialAuthenticator(dependencies),
    dependencies,
  };
}

describe("credential authentication", () => {
  it("authenticates PENDING_ACTIVATION independently of capability access", async () => {
    const pending = record("PENDING_ACTIVATION");
    const { authenticate, dependencies } = createAuthenticator(pending);

    await expect(
      authenticate({ email: "  CLIENT@EXAMPLE.TEST ", password: "correct" }),
    ).resolves.toEqual(pending.user);
    expect(dependencies.findByNormalizedEmail).toHaveBeenCalledWith(
      "client@example.test",
    );
  });

  it("authenticates an ACTIVE user", async () => {
    const active = record("ACTIVE");
    await expect(
      createAuthenticator(active).authenticate({
        email: active.user.email,
        password: "correct",
      }),
    ).resolves.toEqual(active.user);
  });

  it.each(["SUSPENDED", "DISABLED"] as const)(
    "rejects %s credentials even when the password matches",
    async (status) => {
      await expect(
        createAuthenticator(record(status)).authenticate({
          email: "client@example.test",
          password: "correct",
        }),
      ).resolves.toBeNull();
    },
  );

  it("records a failed password attempt", async () => {
    const { authenticate, dependencies } = createAuthenticator(
      record("ACTIVE"),
      false,
    );

    await expect(
      authenticate({ email: "client@example.test", password: "wrong" }),
    ).resolves.toBeNull();
    expect(dependencies.recordFailure).toHaveBeenCalledWith("user-1");
  });

  it("uses the missing-user verification path", async () => {
    const { authenticate, dependencies } = createAuthenticator(null);

    await expect(
      authenticate({ email: "missing@example.test", password: "unknown" }),
    ).resolves.toBeNull();
    expect(dependencies.consumeMissingUserPassword).toHaveBeenCalledWith(
      "unknown",
    );
  });

  it("rejects a currently locked credential", async () => {
    const locked = {
      ...record("ACTIVE"),
      lockedUntil: new Date("2026-08-14T12:05:00.000Z"),
    };
    const { authenticate, dependencies } = createAuthenticator(locked);

    await expect(
      authenticate({ email: "client@example.test", password: "correct" }),
    ).resolves.toBeNull();
    expect(dependencies.verifyPassword).not.toHaveBeenCalled();
  });
});
