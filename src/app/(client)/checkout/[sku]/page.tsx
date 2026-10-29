import { ArrowLeft, CheckCircle2, LockKeyhole, MessageCircleMore, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createOrderAction } from "@/actions/order.actions";
import { formatPenReference, formatUsd } from "@/components/storefront/money";
import { whatsappActivationUrl } from "@/lib/whatsapp";
import {
  AccountUnavailableError,
  ActivationRequiredError,
  AuthenticationRequiredError,
  RoleForbiddenError,
  SessionInvalidatedError,
} from "@/policies/authorization-errors";
import { catalogRepository } from "@/repositories/catalog.repository";
import { fxRepository } from "@/repositories/fx.repository";
import { clientCapabilityService } from "@/services/capabilities/server-services";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ sku: string }>;
  searchParams: Promise<{ quantity?: string; error?: string }>;
}) {
  const { sku } = await params;
  const [offer, penRate] = await Promise.all([
    catalogRepository.findOfferBySku(sku),
    fxRepository.findLatestRate("USD", "PEN"),
  ]);
  if (!offer) notFound();

  const resolvedSearchParams = await searchParams;
  const requestedQuantity = Number(resolvedSearchParams.quantity ?? offer.minimumQuantity);
  const quantity = Number.isSafeInteger(requestedQuantity)
    ? Math.min(
        Math.max(requestedQuantity, offer.minimumQuantity),
        offer.maximumQuantity ?? 999,
      )
    : offer.minimumQuantity;
  const totalUsdCents = offer.unitPriceUsdCents * quantity;

  try {
    await clientCapabilityService.createCheckout();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof SessionInvalidatedError) {
      redirect(
        `/login?callbackUrl=${encodeURIComponent(`/checkout/${sku}?quantity=${quantity}`)}`,
      );
    }

    if (error instanceof ActivationRequiredError) {
      return (
        <section className="py-16 sm:py-24">
          <div className="container-shell max-w-2xl">
            <Link href={`/services/${offer.service.slug}`} className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-500">
              <ArrowLeft size={16} /> Back to {offer.service.name}
            </Link>
            <div className="mt-8 rounded-[30px] border border-amber-200 bg-white p-7 shadow-[var(--shadow-soft)] sm:p-10">
              <span className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <ShieldAlert size={25} />
              </span>
              <p className="eyebrow mt-7 text-amber-600">Activation required</p>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-[var(--ink-950)] sm:text-4xl">Your account is signed in and safely pending.</h1>
              <p className="mt-5 text-base leading-7 text-[var(--text-muted)]">Complete the WhatsApp-guided activation review to unlock wallet, checkout, ordering, and fulfillment capabilities.</p>
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

    // Checkout is a CLIENT-only capability; the only other roles are
    // MODERATOR/ADMIN, whose home is the moderation dashboard, not a crash.
    if (error instanceof RoleForbiddenError) {
      redirect("/mod");
    }

    throw error;
  }

  return (
    <section className="py-12 sm:py-20">
      <div className="container-shell max-w-3xl">
        <Link href={`/services/${offer.service.slug}`} className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-500">
          <ArrowLeft size={16} /> Back to service
        </Link>
        <div className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[var(--shadow-soft)]">
          <div className="bg-[var(--ink-950)] px-7 py-8 text-white sm:px-10">
            <p className="eyebrow text-emerald-300"><LockKeyhole size={14} /> Protected checkout</p>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] sm:text-4xl">Review your selected access tier.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">Your active status has been verified from the current account record.</p>
          </div>
          <div className="p-7 sm:p-10">
            <div className="flex items-start justify-between gap-6 border-b border-slate-100 pb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--trust)]">{offer.service.name}</p>
                <h2 className="mt-2 text-xl font-extrabold text-[var(--ink-950)]">{offer.name}</h2>
                <p className="mt-2 text-sm text-slate-500">{quantity} units × {formatUsd(offer.unitPriceUsdCents)}</p>
              </div>
              <CheckCircle2 className="size-6 shrink-0 text-[var(--value)]" />
            </div>
            <div className="flex items-end justify-between py-6">
              <div>
                <p className="text-xs font-bold text-slate-500">Authoritative total</p>
                <p className="mt-1 text-3xl font-black tracking-[-0.05em] text-[var(--ink-950)]">{formatUsd(totalUsdCents)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-600">
                  {penRate === null ? "PEN reference unavailable" : `≈ ${formatPenReference(totalUsdCents, penRate)}`}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">Latest stored reference rate</p>
              </div>
            </div>
            {resolvedSearchParams.error ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {resolvedSearchParams.error === "unavailable"
                  ? "This offer is no longer available. Please return to the service page and try again."
                  : "We couldn't process that request. Please try again."}
              </div>
            ) : null}
            <form action={createOrderAction}>
              <input type="hidden" name="sku" value={offer.sku} />
              <input type="hidden" name="quantity" value={quantity} />
              <button
                type="submit"
                className="focus-ring flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--trust)] text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(47,107,255,.25)] transition hover:-translate-y-0.5 hover:bg-[var(--trust-dark)]"
              >
                Place order &amp; continue on WhatsApp
              </button>
              <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
                This creates your order and opens a WhatsApp handoff to complete payment. No wallet balance is debited yet.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
