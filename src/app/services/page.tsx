import type { Metadata } from "next";
import { Boxes, CircleDollarSign, ShieldCheck } from "lucide-react";

import { CatalogExplorer } from "@/components/storefront/catalog-explorer";
import { catalogRepository } from "@/repositories/catalog.repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Digital service catalog",
  description: "Compare AuraScale wholesale access tiers and authoritative USD pricing.",
};

export default async function ServicesPage() {
  const services = await catalogRepository.listServices();

  return (
    <>
      <section className="hero-glow grid-sheen py-16 text-white sm:py-20">
        <div className="container-shell">
          <p className="eyebrow text-blue-300"><Boxes size={14} /> Service catalog</p>
          <h1 className="section-title text-balance mt-5 max-w-3xl">Flexible access tiers for the tools behind modern work.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Compare volume-aware configurations across productivity, creative, and growth infrastructure services.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2"><CircleDollarSign size={14} className="text-emerald-300" /> USD authoritative</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2"><ShieldCheck size={14} className="text-blue-300" /> Verified provisioning</span>
          </div>
        </div>
      </section>
      <section className="py-14 sm:py-20">
        <div className="container-shell">
          <CatalogExplorer services={services} />
        </div>
      </section>
    </>
  );
}
