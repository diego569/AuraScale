import { ArrowLeft, CheckCircle2, Clock3, FileText, MessageCircleMore, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatUsd } from "@/components/storefront/money";
import { PaymentProofForm } from "@/components/orders/payment-proof-form";
import { whatsappActivationUrl, whatsappOrderPaymentUrl } from "@/lib/whatsapp";
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
export const metadata: Metadata = { title: "Order detail" };

const ELIGIBLE_FOR_NEW_PROOF = new Set(["UNPAID", "REJECTED"]);

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  let order: Awaited<ReturnType<typeof clientCapabilityService.getOrderDetail>>;

  try {
    order = await clientCapabilityService.getOrderDetail(orderNumber);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof SessionInvalidatedError) {
      redirect(`/login?callbackUrl=${encodeURIComponent(`/account/orders/${orderNumber}`)}`);
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
                Complete activation to view this order.
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

  if (!order) notFound();

  const primaryItem = order.items[0];
  const canSubmitProof = ELIGIBLE_FOR_NEW_PROOF.has(order.paymentStatus);
  const latestSubmission = order.submissions[0];

  return (
    <section className="py-12 sm:py-20">
      <div className="container-shell max-w-3xl">
        <Link href="/account/orders" className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-500">
          <ArrowLeft size={16} /> Back to orders
        </Link>

        <div className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[var(--shadow-soft)]">
          <div className="bg-[var(--ink-950)] px-7 py-8 text-white sm:px-10">
            <p className="eyebrow text-emerald-300">Order {order.orderNumber}</p>
            <h1 className="mt-4 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
              {order.items.map((item) => `${item.offerNameSnapshot} × ${item.quantity}`).join(", ")}
            </h1>
          </div>

          <div className="p-7 sm:p-10">
            <div className="flex items-end justify-between border-b border-slate-100 pb-6">
              <div>
                <p className="text-xs font-bold text-slate-500">Authoritative total</p>
                <p className="mt-1 text-3xl font-black tracking-[-0.05em] text-[var(--ink-950)]">{formatUsd(order.totalUsdCents)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment status</p>
                <p className="mt-1 text-sm font-extrabold text-[var(--ink-950)]">{order.paymentStatus.replace(/_/g, " ")}</p>
              </div>
            </div>

            {order.paymentStatus === "VERIFIED" && order.fulfillmentStatus !== "PROVISIONED" ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-[var(--value-soft)] p-5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--value)]" />
                <div>
                  <p className="text-sm font-extrabold text-emerald-900">Payment verified</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    Fulfillment status: {order.fulfillmentStatus.replace(/_/g, " ").toLowerCase()}.
                  </p>
                </div>
              </div>
            ) : null}

            {order.fulfillmentStatus === "PROVISIONED" ? (
              <div className="mt-6 space-y-3">
                {order.items
                  .filter((item) => item.fulfillment?.clientVisibleMessage)
                  .map((item) => (
                    <div
                      key={item.skuSnapshot}
                      className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-[var(--value-soft)] p-5"
                    >
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--value)]" />
                      <div>
                        <p className="text-sm font-extrabold text-emerald-900">Delivered: {item.offerNameSnapshot}</p>
                        <p className="mt-1 text-xs leading-5 text-emerald-800">{item.fulfillment?.clientVisibleMessage}</p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}

            {order.paymentStatus === "PROOF_SUBMITTED" || order.paymentStatus === "UNDER_REVIEW" ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-extrabold text-amber-900">Your proof is under review</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    A moderator will verify your payment shortly. You&apos;ll see the status update here.
                  </p>
                </div>
              </div>
            ) : null}

            {order.paymentStatus === "REJECTED" && latestSubmission?.rejectionReason ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-extrabold text-red-900">Your last submission was rejected</p>
                <p className="mt-1 text-xs leading-5 text-red-800">{latestSubmission.rejectionReason}</p>
              </div>
            ) : null}

            {canSubmitProof && primaryItem ? (
              <div className="mt-8 space-y-6">
                <a
                  href={whatsappOrderPaymentUrl({
                    orderNumber: order.orderNumber,
                    serviceName: primaryItem.serviceNameSnapshot,
                    offerName: primaryItem.offerNameSnapshot,
                    quantity: primaryItem.quantity,
                    totalUsdCents: order.totalUsdCents,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#20b85a] px-6 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#169c4a]"
                >
                  <MessageCircleMore size={18} /> Complete payment on WhatsApp
                </a>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-sm font-extrabold text-[var(--ink-950)]">Submit payment proof</p>
                  <p className="mt-1 text-xs text-slate-500">Once payment is sent, upload proof here for review.</p>
                  <div className="mt-4">
                    <PaymentProofForm orderNumber={order.orderNumber} defaultCurrencyCode={order.displayCurrencyCode} />
                  </div>
                </div>
              </div>
            ) : null}

            {order.submissions.length > 0 ? (
              <div className="mt-10 border-t border-slate-100 pt-6">
                <p className="text-sm font-extrabold text-[var(--ink-950)]">Submission history</p>
                <div className="mt-4 space-y-3">
                  {order.submissions.map((submission) => (
                    <div key={submission.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-slate-700">{submission.status.replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-slate-400">{new Date(submission.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Reported {(submission.reportedAmountMinor / 100).toFixed(2)} {submission.reportedCurrencyCode}
                      </p>
                      {submission.rejectionReason ? (
                        <p className="mt-1 text-xs font-semibold text-[var(--danger)]">{submission.rejectionReason}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
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
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
