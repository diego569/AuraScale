import { ArrowDownLeft, ArrowUpRight, MessageCircleMore, ShieldAlert, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { formatUsd } from "@/components/storefront/money";
import { whatsappActivationUrl } from "@/lib/whatsapp";
import {
  AccountUnavailableError,
  ActivationRequiredError,
  AuthenticationRequiredError,
  RoleForbiddenError,
  SessionInvalidatedError,
} from "@/policies/authorization-errors";
import { clientCapabilityService } from "@/services/capabilities/server-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wallet" };

export default async function WalletPage() {
  let walletBalance: Awaited<ReturnType<typeof clientCapabilityService.getWalletBalance>>;
  let ledgerHistory: Awaited<ReturnType<typeof clientCapabilityService.getLedgerHistory>>;

  try {
    [walletBalance, ledgerHistory] = await Promise.all([
      clientCapabilityService.getWalletBalance(),
      clientCapabilityService.getLedgerHistory(),
    ]);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof SessionInvalidatedError) {
      redirect(`/login?callbackUrl=${encodeURIComponent("/account/wallet")}`);
    }

    if (error instanceof ActivationRequiredError) {
      return (
        <section className="py-16 sm:py-24">
          <div className="container-shell max-w-2xl">
            <div className="rounded-[30px] border border-amber-200 bg-white p-7 shadow-[var(--shadow-soft)] sm:p-10">
              <span className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <ShieldAlert size={25} />
              </span>
              <p className="eyebrow mt-7 text-amber-600">Activation required</p>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-[var(--ink-950)] sm:text-4xl">
                Your wallet unlocks once activation is complete.
              </h1>
              <p className="mt-5 text-base leading-7 text-[var(--text-muted)]">
                Complete the WhatsApp-guided activation review to unlock wallet, checkout, ordering, and fulfillment capabilities.
              </p>
              <a
                href={whatsappActivationUrl()}
                target="_blank"
                rel="noreferrer"
                className="focus-ring mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#20b85a] px-6 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#169c4a]"
              >
                <MessageCircleMore size={18} /> Continue activation on WhatsApp
              </a>
            </div>
          </div>
        </section>
      );
    }

    if (error instanceof AccountUnavailableError) {
      return (
        <section className="py-20">
          <div className="container-shell max-w-xl rounded-[28px] border border-red-200 bg-white p-8 text-center shadow-[var(--shadow-soft)]">
            <ShieldAlert className="mx-auto size-9 text-[var(--danger)]" />
            <h1 className="mt-5 text-2xl font-black tracking-tight text-[var(--ink-950)]">Account access unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">Please contact AuraScale support before continuing.</p>
          </div>
        </section>
      );
    }

    // Wallet/orders are CLIENT-only capabilities; the only other roles are
    // MODERATOR/ADMIN, whose home is the moderation dashboard, not a crash.
    if (error instanceof RoleForbiddenError) {
      redirect("/mod");
    }

    throw error;
  }

  const wallet = walletBalance.wallet;

  return (
    <section className="py-12 sm:py-20">
      <div className="container-shell max-w-3xl">
        <p className="eyebrow"><Wallet size={14} /> Your wallet</p>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-[var(--ink-950)] sm:text-4xl">
          Balances and transaction history.
        </h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Available balance</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--ink-950)]">
              {formatUsd(wallet?.availableBalanceCents ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Ready to spend · USD</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending balance</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--ink-950)]">
              {formatUsd(wallet?.pendingBalanceCents ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Awaiting review · USD</p>
          </div>
        </div>

        {!wallet ? (
          <p className="mt-6 text-sm font-semibold text-[var(--danger)]">
            No wallet record was found for this account. Please contact support.
          </p>
        ) : null}

        <div className="mt-10">
          <h2 className="text-lg font-extrabold tracking-tight text-[var(--ink-950)]">Ledger history</h2>
          {ledgerHistory.entries.length === 0 ? (
            <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <p className="text-sm font-bold text-slate-700">No activity yet</p>
              <p className="mt-2 text-xs text-slate-500">Ledger entries appear here once a deposit or purchase is posted.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              {ledgerHistory.entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-10 place-items-center rounded-xl ${
                        entry.direction === "CREDIT"
                          ? "bg-[var(--value-soft)] text-[var(--value)]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {entry.direction === "CREDIT" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {entry.description ?? entry.originType.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(entry.postedAt).toLocaleString()} · {entry.accountPurpose.replace(/_/g, " ").toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-black ${
                      entry.direction === "CREDIT" ? "text-[var(--value)]" : "text-slate-700"
                    }`}
                  >
                    {entry.direction === "CREDIT" ? "+" : "-"}
                    {formatUsd(entry.amountCents)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
