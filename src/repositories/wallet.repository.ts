import "server-only";

import type { WalletSummaryDto } from "@/domain/wallet/wallet-dto";
import { getPrisma } from "@/lib/db";

export const walletRepository = {
  async findSummaryByUserId(userId: string): Promise<WalletSummaryDto | null> {
    const wallet = await getPrisma().wallet.findUnique({
      where: { userId },
      select: {
        currencyCode: true,
        status: true,
        availableBalanceCents: true,
        pendingBalanceCents: true,
        lastReconciledAt: true,
      },
    });

    if (!wallet) return null;

    return {
      currencyCode: wallet.currencyCode,
      status: wallet.status,
      availableBalanceCents: Number(wallet.availableBalanceCents),
      pendingBalanceCents: Number(wallet.pendingBalanceCents),
      lastReconciledAt: wallet.lastReconciledAt?.toISOString() ?? null,
    };
  },
};
