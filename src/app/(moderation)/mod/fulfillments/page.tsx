import { PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { markFulfillmentProvisionedAction } from "@/actions/moderation.actions";
import { StatusBanner } from "@/components/moderation/status-banner";
import { AuthorizationError } from "@/policies/authorization-errors";
import { requireModerator } from "@/policies/server-authorization";
import { moderationRepository } from "@/repositories/moderation.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fulfillment queue" };

export default async function ModerationFulfillmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; provisioned?: string }>;
}) {
  try {
    await requireModerator();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/login");
    throw error;
  }

  const resolvedSearchParams = await searchParams;
  const fulfillments = await moderationRepository.listQueuedFulfillments();

  return (
    <section className="py-10">
      <div className="container-shell max-w-4xl">
        <h1 className="text-2xl font-black tracking-tight text-[var(--ink-950)]">Fulfillment queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          {fulfillments.length} item{fulfillments.length === 1 ? "" : "s"} awaiting provisioning
        </p>

        {resolvedSearchParams.provisioned ? (
          <StatusBanner tone="success">Marked as delivered.</StatusBanner>
        ) : null}
        {resolvedSearchParams.error ? (
          <StatusBanner tone="danger">{resolvedSearchParams.error.replace(/_/g, " ")}</StatusBanner>
        ) : null}

        {fulfillments.length === 0 ? (
          <div className="mt-8 rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-sm font-bold text-slate-700">Queue is empty</p>
            <p className="mt-2 text-xs text-slate-500">Verified orders awaiting delivery will appear here.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {fulfillments.map((item) => (
              <div key={item.fulfillmentId} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold text-[var(--ink-950)]">{item.orderNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.serviceName} — {item.offerName} × {item.quantity}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">{item.clientEmail}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                    {item.strategy === "MANUAL" ? "Manual delivery" : "API automatic"}
                  </span>
                </div>

                <form action={markFulfillmentProvisionedAction} className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5">
                  <input type="hidden" name="fulfillmentId" value={item.fulfillmentId} />
                  <label className="flex-1 min-w-[240px]">
                    <span className="text-[11px] font-bold text-slate-500">Delivery message (shown to client)</span>
                    <input
                      type="text"
                      name="clientVisibleMessage"
                      required
                      maxLength={4000}
                      className="focus-ring mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      placeholder="e.g. access credentials sent to your email"
                    />
                  </label>
                  <button
                    type="submit"
                    className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--trust)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--trust-dark)]"
                  >
                    <PackageCheck size={16} /> Mark delivered
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
