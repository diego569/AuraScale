import { afterAll, describe, expect, it, vi } from "vitest";

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

interface SentEmail {
  to: string;
  subject: string;
  html: string;
}

const sendEmailMock = vi.fn(async (_input: SentEmail) => undefined);
vi.mock("@/lib/email", () => ({ sendEmail: sendEmailMock }));

function extractTokenFromEmailHtml(html: string) {
  const match = html.match(/reset-password\/([^"]+)"/);
  if (!match) throw new Error("Reset link not found in email body.");
  return match[1];
}

describeWithDatabase("password reset request and consumption", () => {
  afterAll(async () => {
    const { getPrisma } = await import("@/lib/db");
    await getPrisma().$disconnect();
  });

  it("issues a single-use token by email, and silently no-ops for unknown emails", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    sendEmailMock.mockClear();

    const { registerClient } = await import(
      "@/services/identity/registration.service"
    );
    const { requestPasswordReset } = await import(
      "@/services/identity/password-reset.service"
    );
    const { getPrisma } = await import("@/lib/db");

    const suffix = crypto.randomUUID();
    const email = `reset-${suffix}@example.test`;

    const registered = await registerClient({
      email,
      password: "OriginalPassw0rd",
      name: "Reset Test Client",
      phoneE164: `+519${Date.now().toString().slice(-8)}`,
      countryCode: "PE",
      displayCurrencyCode: "PEN",
    });

    await expect(
      requestPasswordReset({ email: `unknown-${suffix}@example.test` }),
    ).resolves.toEqual({ ok: true });
    expect(sendEmailMock).not.toHaveBeenCalled();

    await expect(requestPasswordReset({ email })).resolves.toEqual({ ok: true });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0]).toMatchObject({ to: email });

    const token = await getPrisma().passwordResetToken.findFirst({
      where: { userId: registered.id },
    });
    expect(token?.consumedAt).toBeNull();
    expect(token?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("resets the password exactly once, then rejects reuse and expired/unknown tokens", async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    sendEmailMock.mockClear();

    const { registerClient } = await import(
      "@/services/identity/registration.service"
    );
    const { authenticateCredentials } = await import("@/auth/authenticate");
    const { requestPasswordReset, resetPassword } = await import(
      "@/services/identity/password-reset.service"
    );

    const suffix = crypto.randomUUID();
    const email = `reset-consume-${suffix}@example.test`;
    const originalPassword = "OriginalPassw0rd";
    const newPassword = "BrandNewPassw0rd";

    await registerClient({
      email,
      password: originalPassword,
      name: "Reset Consume Client",
      phoneE164: `+519${Date.now().toString().slice(-8)}`,
      countryCode: "PE",
      displayCurrencyCode: "PEN",
    });

    await requestPasswordReset({ email });
    const rawToken = extractTokenFromEmailHtml(sendEmailMock.mock.calls[0][0].html);

    await expect(
      resetPassword({ token: rawToken, newPassword }),
    ).resolves.toEqual({ ok: true });

    await expect(
      authenticateCredentials({ email, password: originalPassword }),
    ).resolves.toBeNull();
    await expect(
      authenticateCredentials({ email, password: newPassword }),
    ).resolves.toMatchObject({ email });

    await expect(
      resetPassword({ token: rawToken, newPassword: "AnotherPassw0rd" }),
    ).resolves.toEqual({ ok: false, reason: "INVALID_OR_EXPIRED" });

    await expect(
      resetPassword({ token: "not-a-real-token-at-all-000000", newPassword }),
    ).resolves.toEqual({ ok: false, reason: "INVALID_OR_EXPIRED" });
  });
});
