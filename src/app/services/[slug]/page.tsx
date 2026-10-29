import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OfferSelector } from "@/components/storefront/offer-selector";
import { ServiceIcon } from "@/components/storefront/service-icon";
import { catalogRepository } from "@/repositories/catalog.repository";
import { fxRepository } from "@/repositories/fx.repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const service = await catalogRepository.findBySlug((await params).slug);
  return service
    ? { title: service.name, description: service.shortDescription }
    : { title: "Service not found" };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [service, penRate] = await Promise.all([
    catalogRepository.findBySlug((await params).slug),
    fxRepository.findLatestRate("USD", "PEN"),
  ]);
  if (!service) notFound();

  return (
    <section className="py-10 sm:py-16">
      <div className="container-shell">
        <Link href="/services" className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-500 hover:text-[var(--ink-950)]">
          <ArrowLeft size={16} /> Back to catalog
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_440px] lg:items-start">
          <div>
            <div className="grid size-16 place-items-center rounded-[22px] bg-blue-50 text-[var(--trust)]">
              <ServiceIcon category={service.categorySlug} className="size-7" />
            </div>
            <p className="eyebrow mt-7">{service.categoryName}</p>
            <h1 className="display-title text-balance mt-5 max-w-3xl text-[var(--ink-950)]">{service.name}</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">{service.description ?? service.shortDescription}</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                [ShieldCheck, "Verified workflow", "Protected activation and checkout boundary"],
                [Clock3, "Clear delivery", "Estimate shown before continuing"],
                [Sparkles, "Scale-aware", "Unit pricing improves with volume"],
              ].map(([Icon, title, copy]) => {
                const FeatureIcon = Icon as typeof ShieldCheck;
                return (
                  <div key={String(title)} className="rounded-[20px] border border-slate-200 bg-white p-5">
                    <FeatureIcon className="size-5 text-[var(--value)]" />
                    <p className="mt-4 text-sm font-extrabold text-slate-900">{String(title)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{String(copy)}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 rounded-[24px] bg-[var(--ink-950)] p-6 text-white sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-300">What happens next</p>
              <div className="mt-5 space-y-4">
                {["Select the right tier and quantity", "Sign in and complete account activation", "Continue through the protected order workflow"].map((item) => (
                  <p key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-300" /> {item}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <OfferSelector offers={service.offers} penRate={penRate} />
          </div>
        </div>
      </div>
    </section>
  );
}
