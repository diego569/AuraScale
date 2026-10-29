import "server-only";

import type { LedgerHistoryPageDto } from "@/domain/wallet/wallet-dto";
import { getPrisma } from "@/lib/db";

const PAGE_SIZE = 20;

export const ledgerRepository = {
  async listHistoryForUser(
    userId: string,
    cursor?: string | null,
  ): Promise<LedgerHistoryPageDto> {
    const wallet = await getPrisma().wallet.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!wallet) return { entries: [], nextCursor: null };

    const rows = await getPrisma().ledgerEntry.findMany({
      where: { ledgerAccount: { walletId: wallet.id } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        direction: true,
        amountCents: true,
        ledgerAccount: { select: { purpose: true } },
        ledgerTransaction: {
          select: { originType: true, description: true, postedAt: true },
        },
      },
    });

    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    return {
      entries: page.map((row) => ({
        id: row.id,
        postedAt: row.ledgerTransaction.postedAt.toISOString(),
        direction: row.direction,
        amountCents: Number(row.amountCents),
        accountPurpose: row.ledgerAccount.purpose,
        originType: row.ledgerTransaction.originType,
        description: row.ledgerTransaction.description,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  },
};
