"use client";

import { Check, Minus, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatPenReference, formatUsd } from "@/components/storefront/money";
import type { CatalogOfferDto } from "@/domain/catalog/catalog-dto";

export function OfferSelector({ offers, penRate }: { offers: CatalogOfferDto[]; penRate: number | null }) {
  const [selectedSku, setSelectedSku] = useState(offers[0]?.sku ?? "");
  const selected = offers.find((offer) => offer.sku === selectedSku) ?? offers[0];
  const [quantity, setQuantity] = useState(selected?.minimumQuantity ?? 1);

  const total = useMemo(
    () => (selected?.unitPriceUsdCents ?? 0) * quantity,
    [quantity, selected],
  );

  if (!selected) return null;

  function selectOffer(offer: CatalogOfferDto) {
    setSelectedSku(offer.sku);
    setQuantity(offer.minimumQuantity);
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-soft)] sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-extrabold text-[var(--ink-950)]">Choose your access tier</p>
          <p className="mt-1 text-xs text-slate-500">Lower unit pricing at higher volumes</p>
        </div>
        <ShieldCheck className="size-6 text-[var(--value)]" />
      </div>

      <div className="mt-5 space-y-3">
        {offers.map((offer) => {
          const active = offer.sku === selected.sku;
          return (
            <button
              type="button"
              key={offer.id}
              onClick={() => selectOffer(offer)}
              className={`focus-ring flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-blue-300 bg-blue-50/70 shadow-[0_8px_24px_rgba(47,107,255,.08)]"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`grid size-5 place-items-center rounded-full border ${active ? "border-[var(--trust)] bg-[var(--trust)] text-white" : "border-slate-300"}`}>
                  {active ? <Check size={12} strokeWidth={3} /> : null}
                </span>
                <span>
                  <span className="block text-sm font-extrabold text-slate-900">{offer.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Minimum {offer.minimumQuantity} units</span>
                </span>
              </span>
              <span className="text-right">
                <span className="block text-base font-black tracking-tight text-slate-900">{formatUsd(offer.unitPriceUsdCents)}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">per unit</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
        <div>
          <p className="text-xs font-bold text-slate-500">Quantity</p>
          <p className="mt-1 text-[11px] text-slate-400">Tier minimum applies</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((value) => Math.max(selected.minimumQuantity, value - 1))}
            className="focus-ring grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
            disabled={quantity <= selected.minimumQuantity}
          >
            <Minus size={15} />
          </button>
          <span className="w-8 text-center text-sm font-black text-slate-900">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((value) => Math.min(selected.maximumQuantity ?? 999, value + 1))}
            className="focus-ring grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
            disabled={quantity >= (selected.maximumQuantity ?? 999)}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">Estimated total</p>
            <p className="mt-1 text-3xl font-black tracking-[-0.05em] text-[var(--ink-950)]">{formatUsd(total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">
              {penRate === null ? "PEN reference unavailable" : `≈ ${formatPenReference(total, penRate)}`}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">Latest stored reference rate</p>
          </div>
        </div>
        <Link
          href={`/checkout/${selected.sku}?quantity=${quantity}`}
          className="focus-ring mt-5 flex h-13 items-center justify-center rounded-2xl bg-[var(--trust)] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(47,107,255,.25)] transition hover:-translate-y-0.5 hover:bg-[var(--trust-dark)]"
        >
          Continue securely
        </Link>
        <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
          Authentication and account activation are verified before checkout.
        </p>
      </div>
    </div>
  );
}
