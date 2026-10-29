import { ArrowUpRight, Clock3, Sparkles } from "lucide-react";
import Link from "next/link";

import type { CatalogServiceDto } from "@/domain/catalog/catalog-dto";
import { formatUsd } from "@/components/storefront/money";
import { ServiceIcon } from "@/components/storefront/service-icon";

export function ServiceCard({ service }: { service: CatalogServiceDto }) {
  const lowestPrice = Math.min(...service.offers.map((offer) => offer.unitPriceUsdCents));
  const fastestDelivery = Math.min(
    ...service.offers.map((offer) => offer.estimatedDeliveryMinutes ?? 1440),
  );

  return (
    <Link
      href={`/services/${service.slug}`}
      className="focus-ring group flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_60px_rgba(20,40,75,.13)] sm:p-6"
    >
      <div className="flex items-start justify-between">
        <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-[var(--trust)]">
          <ServiceIcon category={service.categorySlug} className="size-5" />
        </span>
        <div className="flex items-center gap-2">
          {service.isFeatured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--accent)]">
              <Sparkles size={11} /> Featured
            </span>
          ) : null}
          <ArrowUpRight className="size-5 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--trust)]" />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--trust)]">
          {service.categoryName}
        </p>
        <h3 className="mt-2 text-xl font-extrabold tracking-[-0.035em] text-[var(--ink-950)]">
          {service.name}
        </h3>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
          {service.shortDescription}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">From</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--ink-950)]">
            {formatUsd(lowestPrice)}
          </p>
          <p className="text-[11px] text-slate-400">per unit · USD</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
          <Clock3 size={13} /> {fastestDelivery < 60 ? `${fastestDelivery} min` : "Same day"}
        </span>
      </div>
    </Link>
  );
}
