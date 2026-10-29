import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  Headphones,
  Layers3,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { HeroDashboard } from "@/components/storefront/hero-dashboard";
import { Reveal } from "@/components/motion/reveal";
import { ServiceCard } from "@/components/storefront/service-card";
import { catalogRepository } from "@/repositories/catalog.repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const principles = [
  {
    icon: CircleDollarSign,
    title: "USD-first clarity",
    copy: "Authoritative pricing in USD, with local currency shown only as a clear reference.",
  },
  {
    icon: ShieldCheck,
    title: "Verified access",
    copy: "Account activation and provisioning are reviewed before protected capabilities open.",
  },
  {
    icon: Headphones,
    title: "Human-guided MVP",
    copy: "WhatsApp-assisted activation keeps every early transaction understandable and traceable.",
  },
];

export default async function HomePage() {
  const featured = await catalogRepository.listFeatured(3);

  return (
    <>
      <section className="hero-glow grid-sheen relative overflow-hidden py-20 text-white sm:py-28 lg:py-32">
        <div className="container-shell relative grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-blue-200 backdrop-blur">
              <Sparkles size={14} /> Wholesale access, without the usual friction
            </div>
            <h1 className="display-title text-balance mt-7 max-w-3xl">
              Digital access built for operators who plan to scale.
            </h1>
            <p className="mt-7 max-w-xl text-balance text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Discover premium service licenses, compare transparent volume tiers, and move from selection to guided provisioning with confidence.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/services"
                className="focus-ring inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[var(--trust)] px-6 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(47,107,255,.34)] transition hover:-translate-y-0.5 hover:bg-blue-500"
              >
                Explore wholesale tiers <ArrowRight size={17} />
              </Link>
              <Link
                href="/#how-it-works"
                className="focus-ring inline-flex h-13 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Transparent USD pricing</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Volume-aware tiers</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Traceable provisioning</span>
            </div>
          </div>
          <HeroDashboard />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-7">
        <div className="container-shell grid grid-cols-2 gap-6 text-center md:grid-cols-4 md:text-left">
          {[
            ["USD", "Authoritative currency"],
            ["PE", "Initial market"],
            ["Manual", "Verified activation"],
            ["Mixed", "Fulfillment-ready model"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-lg font-black tracking-tight text-[var(--ink-950)]">{value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="container-shell">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow"><Layers3 size={14} /> Curated access</p>
              <h2 className="section-title text-balance mt-4 max-w-2xl">Start with the services operators use every day.</h2>
            </div>
            <Link href="/services" className="focus-ring inline-flex items-center gap-2 self-start rounded-xl text-sm font-extrabold text-[var(--trust)] md:self-auto">
              View full catalog <ArrowRight size={16} />
            </Link>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((service, index) => (
              <Reveal key={service.id} delay={index * 0.07}>
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20 sm:py-28">
        <div className="container-shell grid gap-14 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <Reveal>
            <p className="eyebrow"><MessageCircleMore size={14} /> Guided journey</p>
            <h2 className="section-title text-balance mt-4">A clear path from discovery to access.</h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-[var(--text-muted)]">
              The MVP keeps sensitive steps human-guided while the underlying workflow is ready for provider automation later.
            </p>
            <Link href="/services" className="focus-ring mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--ink-950)] px-5 py-3 text-sm font-extrabold text-white">
              Browse services <ArrowRight size={16} />
            </Link>
          </Reveal>

          <div className="space-y-4">
            {[
              ["01", "Choose a service", "Compare clear access tiers, minimum quantities, and authoritative USD pricing."],
              ["02", "Activate your account", "Sign in while pending, complete the WhatsApp-guided review, then unlock client capabilities."],
              ["03", "Request provisioning", "Continue through the protected checkout boundary and track fulfillment from your client area."],
            ].map(([number, title, copy], index) => (
              <Reveal key={number} delay={index * 0.08} className="rounded-[24px] border border-slate-200 bg-[var(--paper)] p-6 sm:flex sm:gap-6">
                <span className="text-sm font-black text-[var(--trust)]">{number}</span>
                <div className="mt-3 sm:mt-0">
                  <h3 className="text-lg font-extrabold tracking-tight text-[var(--ink-950)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="py-20 sm:py-28">
        <div className="container-shell">
          <Reveal className="text-center">
            <p className="eyebrow"><BadgeDollarSign size={14} /> Designed for trust</p>
            <h2 className="section-title text-balance mx-auto mt-4 max-w-3xl">Financial clarity in the interface. Durable rules underneath.</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {principles.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 0.08} className="rounded-[24px] border border-slate-200 bg-white p-7 shadow-[var(--shadow-card)]">
                <principle.icon className="size-6 text-[var(--trust)]" />
                <h3 className="mt-7 text-xl font-extrabold tracking-tight text-[var(--ink-950)]">{principle.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{principle.copy}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <Reveal className="container-shell overflow-hidden rounded-[32px] bg-[var(--ink-950)] px-6 py-12 text-center text-white shadow-[var(--shadow-soft)] sm:px-12 sm:py-16">
          <p className="eyebrow text-emerald-300"><Sparkles size={14} /> Your next operating layer</p>
          <h2 className="section-title text-balance mx-auto mt-5 max-w-3xl">Build your service stack with pricing you can actually reason about.</h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">Explore the catalog openly. Sign in when you are ready, complete activation, and continue through the protected client journey.</p>
          <Link href="/services" className="focus-ring mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-extrabold text-[var(--ink-950)] transition hover:-translate-y-0.5">
            Explore all services <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
