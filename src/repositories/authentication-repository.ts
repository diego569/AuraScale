import "server-only";

import { getPrisma } from "@/lib/db";

export const authenticationRepository = {
  async findByNormalizedEmail(email: string) {
    const credential = await getPrisma().passwordCredential.findFirst({
      where: { user: { email } },
      select: {
        passwordHash: true,
        failedAttempts: true,
        lockedUntil: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    return credential;
  },

  async recordFailure(userId: string) {
    await getPrisma().$transaction(async (transaction) => {
      const credential = await transaction.passwordCredential.update({
        where: { userId },
        data: { failedAttempts: { increment: 1 } },
        select: { failedAttempts: true },
      });

      if (credential.failedAttempts >= 5) {
        await transaction.passwordCredential.update({
          where: { userId },
          data: {
            failedAttempts: 0,
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
      }
    });
  },

  async clearFailures(userId: string) {
    await getPrisma().passwordCredential.updateMany({
      where: { userId, failedAttempts: { gt: 0 } },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  },
};
