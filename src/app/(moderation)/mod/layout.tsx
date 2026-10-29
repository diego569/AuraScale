import Link from "next/link";
import type { ReactNode } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ModerationLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="border-b border-slate-800 bg-[var(--ink-950)]">
        <div className="container-shell flex h-14 items-center gap-6 text-sm font-bold text-slate-300">
          <span className="text-white">Moderation</span>
          <Link href="/mod" className="transition hover:text-white">
            Payment review
          </Link>
          <Link href="/mod/fulfillments" className="transition hover:text-white">
            Fulfillment queue
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
