import Link from "next/link";

import { BrandMark } from "@/components/storefront/brand-mark";

export function StorefrontFooter() {
  return (
    <footer className="bg-[var(--ink-950)] py-14 text-slate-300">
      <div className="container-shell grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandMark inverse />
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
            Wholesale digital access with transparent USD pricing, guided activation,
            and traceable provisioning.
          </p>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Platform</p>
          <div className="mt-4 flex flex-col gap-3 text-sm font-semibold">
            <Link href="/services" className="hover:text-white">Services</Link>
            <Link href="/#how-it-works" className="hover:text-white">How it works</Link>
            <Link href="/login" className="hover:text-white">Client access</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Principles</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
            <span>USD is authoritative</span>
            <span>Local currency is reference-only</span>
            <span>Human-verified MVP activation</span>
          </div>
        </div>
      </div>
      <div className="container-shell mt-12 border-t border-white/10 pt-6 text-xs text-slate-500">
        © 2026 AuraScale. Digital service access for modern operators.
      </div>
    </footer>
  );
}
