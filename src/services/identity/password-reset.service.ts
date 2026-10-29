import "server-only";

import { createHash, randomBytes } from "node:crypto";

import argon2 from "argon2";
import { z } from "zod";

import { normalizeEmail } from "@/auth/credential-authenticator";
import { sendEmail } from "@/lib/email";
import { getPrisma } from "@/lib/db";
import { passwordSchema } from "@/validation/password";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export const requestPasswordResetSchema = z.object({
  email: z.email().max(320),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(512),
  newPassword: passwordSchema,
});

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

function buildResetUrl(rawToken: string) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/reset-password/${rawToken}`;
}

function renderResetEmail(resetUrl: string) {
  return `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <p style="color:#0b1728; font-size:20px; font-weight:800; margin:0 0 20px;">AuraScale</p>
      <h1 style="color:#101c2e; font-size:20px; margin:0 0 16px;">Reset your password</h1>
      <p style="color:#607087; font-size:14px; line-height:22px; margin:0 0 24px;">
        We received a request to reset your AuraScale account password. This link expires in 30 minutes and can only be used once.
      </p>
      <a href="${resetUrl}" style="display:inline-block; background:#2f6bff; color:#ffffff; font-weight:700; font-size:14px; padding:12px 24px; border-radius:12px; text-decoration:none;">
        Reset password
      </a>
      <p style="color:#607087; font-size:12px; line-height:20px; margin:24px 0 0;">
        If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

export async function requestPasswordReset(
  input: z.input<typeof requestPasswordResetSchema>,
) {
  const { email } = requestPasswordResetSchema.parse(input);
  const normalized = normalizeEmail(email);

  const user = await getPrisma().user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, status: true },
  });

  // Always report success regardless of whether the account exists, so this
  // endpoint cannot be used to enumerate registered emails.
  if (!user || user.status === "DISABLED") {
    return { ok: true } as const;
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await getPrisma().$transaction(async (transaction) => {
    await transaction.passwordResetToken.deleteMany({
      where: { userId: user.id, consumedAt: null },
    });
    await transaction.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
  });

  await sendEmail({
    to: user.email,
    subject: "Reset your AuraScale password",
    html: renderResetEmail(buildResetUrl(rawToken)),
  });

  return { ok: true } as const;
}

export async function resetPassword(
  input: z.input<typeof resetPasswordSchema>,
) {
  const { token, newPassword } = resetPasswordSchema.parse(input);
  const tokenHash = hashToken(token);
  const now = new Date();

  const record = await getPrisma().passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, consumedAt: true },
  });

  if (!record || record.consumedAt || record.expiresAt <= now) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" } as const;
  }

  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 4,
  });

  await getPrisma().$transaction(async (transaction) => {
    await transaction.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: now },
    });
    await transaction.passwordCredential.update({
      where: { userId: record.userId },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: now,
      },
    });
  });

  return { ok: true } as const;
}
