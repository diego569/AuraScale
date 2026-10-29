import { CheckCircle2, FileText, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  acceptPaymentSubmissionAction,
  rejectPaymentSubmissionAction,
} from "@/actions/moderation.actions";
import { StatusBanner } from "@/components/moderation/status-banner";
import { formatUsd } from "@/components/storefront/money";
import { AuthorizationError } from "@/policies/authorization-errors";
import { requireModerator } from "@/policies/server-authorization";
import { moderationRepository } from "@/repositories/moderation.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment review" };

export default async function ModerationPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; accepted?: string; rejected?: string }>;
}) {
  try {
    await requireModerator();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/login");
    throw error;
  }

  const resolvedSearchParams = await searchParams;
  const submissions = await moderationRepository.listPendingSubmissions();

  return (
    <section className="py-10">
      <div className="container-shell max-w-4xl">
        <h1 className="text-2xl font-black tracking-tight text-[var(--ink-950)]">Payment review queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          {submissions.length} pending submission{submissions.length === 1 ? "" : "s"}
        </p>

        {resolvedSearchParams.accepted ? (
          <StatusBanner tone="success">Payment verified and fulfillment queued.</StatusBanner>
        ) : null}
        {resolvedSearchParams.rejected ? (
          <StatusBanner tone="neutral">Submission rejected.</StatusBanner>
        ) : null}
        {resolvedSearchParams.error ? (
          <StatusBanner tone="danger">{resolvedSearchParams.error.replace(/_/g, " ")}</StatusBanner>
        ) : null}

        {submissions.length === 0 ? (
          <div className="mt-8 rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-sm font-bold text-slate-700">Queue is empty</p>
            <p className="mt-2 text-xs text-slate-500">Newly submitted payment proofs will appear here.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {submissions.map((submission) => (
              <div key={submission.submissionId} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold text-[var(--ink-950)]">
                      {submission.orderNumber ?? "No linked order"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {submission.clientName ?? submission.clientEmail} · {submission.clientEmail}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Submitted {new Date(submission.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {submission.orderTotalUsdCents !== null ? (
                      <p className="text-lg font-black text-[var(--ink-950)]">{formatUsd(submission.orderTotalUsdCents)}</p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      Reported {(submission.reportedAmountMinor / 100).toFixed(2)} {submission.reportedCurrencyCode}
                    </p>
                  </div>
                </div>

                {submission.externalReference ? (
                  <p className="mt-3 text-xs text-slate-500">Reference: {submission.externalReference}</p>
                ) : null}
                {submission.clientNote ? (
                  <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{submission.clientNote}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {submission.proofs.map((proof) => (
                    <a
                      key={proof.id}
                      href={`/api/account/payment-proofs/${proof.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                    >
                      <FileText size={12} /> {proof.originalFileName}
                    </a>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5">
                  <form action={acceptPaymentSubmissionAction}>
                    <input type="hidden" name="submissionId" value={submission.submissionId} />
                    <button
                      type="submit"
                      className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--value)] px-4 text-sm font-extrabold text-white transition hover:opacity-90"
                    >
                      <CheckCircle2 size={16} /> Accept &amp; verify
                    </button>
                  </form>

                  <form action={rejectPaymentSubmissionAction} className="flex flex-1 flex-wrap items-end gap-2">
                    <input type="hidden" name="submissionId" value={submission.submissionId} />
                    <label className="flex-1 min-w-[200px]">
                      <span className="text-[11px] font-bold text-slate-500">Rejection reason (required)</span>
                      <input
                        type="text"
                        name="reason"
                        required
                        maxLength={2000}
                        className="focus-ring mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                        placeholder="e.g. amount does not match order total"
                      />
                    </label>
                    <button
                      type="submit"
                      className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-extrabold text-[var(--danger)] transition hover:bg-red-50"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
