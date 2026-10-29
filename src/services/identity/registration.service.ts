import "server-only";

import { randomUUID } from "node:crypto";

import argon2 from "argon2";
import { z } from "zod";

import { normalizeEmail } from "@/auth/credential-authenticator";
import { getPrisma } from "@/lib/db";
import { passwordSchema } from "@/validation/password";

export const registrationSchema = z.object({
  email: z.email().max(320),
  password: passwordSchema,
  name: z.string().trim().min(2).max(160),
  phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  countryCode: z.literal("PE").default("PE"),
  displayCurrencyCode: z.literal("PEN").default("PEN"),
});

export type RegistrationInput = z.input<typeof registrationSchema>;

export async function registerClient(input: RegistrationInput) {
  const data = registrationSchema.parse(input);
  const email = normalizeEmail(data.email);
  const passwordHash = await argon2.hash(data.password, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 4,
  });

  const userId = randomUUID();
  const walletId = randomUUID();
  const activationId = randomUUID();

  return getPrisma().$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        id: userId,
        email,
        name: data.name,
        phoneE164: data.phoneE164,
        role: "CLIENT",
        status: "PENDING_ACTIVATION",
        locale: "es-PE",
        countryCode: data.countryCode,
        displayCurrencyCode: data.displayCurrencyCode,
        passwordCredential: {
          create: { passwordHash },
        },
      },
      select: { id: true, email: true, status: true },
    });

    await transaction.wallet.create({
      data: {
        id: walletId,
        userId,
        currencyCode: "USD",
        accounts: {
          create: [
            {
              code: `CLIENT:${userId}:AVAILABLE:USD`,
              name: "Client available balance",
              category: "LIABILITY",
              purpose: "CLIENT_AVAILABLE",
              currencyCode: "USD",
            },
            {
              code: `CLIENT:${userId}:PENDING:USD`,
              name: "Client pending balance",
              category: "LIABILITY",
              purpose: "CLIENT_PENDING",
              currencyCode: "USD",
            },
          ],
        },
      },
    });

    await transaction.accountActivation.create({
      data: {
        id: activationId,
        userId,
        methodCode: "WHATSAPP_MANUAL",
        providerCode: "INTERNAL_WHATSAPP",
        executionModeSnapshot: "MANUAL",
        status: "PENDING",
        idempotencyKey: `registration:${userId}:activation`,
      },
    });

    await transaction.auditLog.create({
      data: {
        actorUserId: userId,
        action: "USER_REGISTERED",
        entityType: "User",
        entityId: userId,
        afterSnapshot: {
          status: "PENDING_ACTIVATION",
          activationId,
          walletProvisioned: true,
        },
        correlationId: `registration:${userId}`,
      },
    });

    return user;
  });
}
