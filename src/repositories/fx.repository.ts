import "server-only";

import { getPrisma } from "@/lib/db";

export const fxRepository = {
  async findLatestRate(baseCurrencyCode: string, quoteCurrencyCode: string) {
    const now = new Date();
    const observation = await getPrisma().fxRate.findFirst({
      where: {
        baseCurrencyCode,
        quoteCurrencyCode,
        effectiveAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { effectiveAt: "desc" },
      select: { rate: true },
    });

    return observation ? Number(observation.rate) : null;
  },
};
