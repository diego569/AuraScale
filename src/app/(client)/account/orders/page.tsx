import { ClipboardList, MessageCircleMore, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
export const metadata: Metadata = { title: "Orders" };

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  UNPAID: "bg-slate-100 text-slate-600",
  PROOF_SUBMITTED: "bg-amber-50 text-amber-700",
  UNDER_REVIEW: "bg-amber-50 text-amber-700",
  VERIFIED: "bg-[var(--value-soft)] text-[var(--value)]",
  REJECTED: "bg-red-50 text-[var(--danger)]",
  REFUNDED: "bg-slate-100 text-slate-600",
};

export default async function OrderHistoryPage() {
  let orders: Awaited<ReturnType<typeof clientCapabilityService.listOrders>>;

  try {
    orders = await clientCapabilityService.listOrders();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof SessionInvalidatedError) {
      redirect(`/login?callbackUrl=${encodeURIComponent("/account/orders")}`);
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
                Your order history unlocks once activation is complete.
              </h1>
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

  return (
    <section className="py-12 sm:py-20">
      <div className="container-shell max-w-3xl">
        <p className="eyebrow"><ClipboardList size={14} /> Your orders</p>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-[var(--ink-950)] sm:text-4xl">
          Order history.
        </h1>

        {orders.length === 0 ? (
          <div className="mt-8 rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-sm font-bold text-slate-700">No orders yet</p>
            <p className="mt-2 text-xs text-slate-500">Orders you place from the catalog will appear here.</p>
            <Link
              href="/services"
              className="focus-ring mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--trust)] px-5 text-sm font-extrabold text-white"
            >
              Browse services
            </Link>
          </div>
        ) : (
          <div className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            {orders.map((order) => (
              <Link
                key={order.orderNumber}
                href={`/account/orders/${order.orderNumber}`}
                className="focus-ring flex flex-col gap-2 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">{order.itemSummary}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold ${
                      PAYMENT_STATUS_STYLE[order.paymentStatus] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {order.paymentStatus.replace(/_/g, " ")}
                  </span>
                  <p className="text-sm font-black text-[var(--ink-950)]">{formatUsd(order.totalUsdCents)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
