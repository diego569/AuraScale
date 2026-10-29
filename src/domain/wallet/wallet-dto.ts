export interface WalletSummaryDto {
  currencyCode: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  availableBalanceCents: number;
  pendingBalanceCents: number;
  lastReconciledAt: string | null;
}

export interface LedgerHistoryEntryDto {
  id: string;
  postedAt: string;
  direction: "DEBIT" | "CREDIT";
  amountCents: number;
  accountPurpose: string;
  originType: string;
  description: string | null;
}

export interface LedgerHistoryPageDto {
  entries: LedgerHistoryEntryDto[];
  nextCursor: string | null;
}
