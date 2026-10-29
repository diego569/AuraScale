"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BrandMark } from "@/components/storefront/brand-mark";

const navigation = [
  { href: "/services", label: "Services" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#trust", label: "Why AuraScale" },
];

export function StorefrontHeader({
  authenticated,
  isModerator = false,
}: {
  authenticated: boolean;
  isModerator?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/88 backdrop-blur-xl">
      <div className="container-shell flex h-[72px] items-center justify-between">
        <BrandMark />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring rounded-md text-sm font-semibold text-slate-600 transition hover:text-[var(--ink-950)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {authenticated ? (
            <>
              {isModerator ? (
                <Link
                  href="/mod"
                  className="focus-ring rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Moderation
                </Link>
              ) : (
                <>
                  <Link
                    href="/account/orders"
                    className="focus-ring rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                  >
                    My orders
                  </Link>
                  <Link
                    href="/account/wallet"
                    className="focus-ring rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                  >
                    My wallet
                  </Link>
                </>
              )}
              <Link
                href="/api/auth/signout"
                className="focus-ring rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Sign out
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="focus-ring rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="focus-ring rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Create account
              </Link>
            </>
          )}
          <Link
            href="/services"
            className="focus-ring rounded-xl bg-[var(--trust)] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(47,107,255,.24)] transition hover:-translate-y-0.5 hover:bg-[var(--trust-dark)]"
          >
            Explore tiers
          </Link>
        </div>

        <button
          type="button"
          className="focus-ring grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {open ? (
        <div id="mobile-navigation" className="border-t border-slate-200 bg-white px-4 pb-5 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 pt-3" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="focus-ring rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
            {authenticated ? (
              <>
                {isModerator ? (
                  <Link
                    href="/mod"
                    onClick={() => setOpen(false)}
                    className="focus-ring mt-2 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700"
                  >
                    Moderation
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/account/orders"
                      onClick={() => setOpen(false)}
                      className="focus-ring mt-2 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700"
                    >
                      My orders
                    </Link>
                    <Link
                      href="/account/wallet"
                      onClick={() => setOpen(false)}
                      className="focus-ring rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700"
                    >
                      My wallet
                    </Link>
                  </>
                )}
                <Link
                  href="/api/auth/signout"
                  className="focus-ring rounded-xl px-4 py-3 text-center text-sm font-bold text-slate-700"
                >
                  Sign out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="focus-ring mt-2 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700"
                >
                  Create account
                </Link>
              </>
            )}
            <Link
              href="/services"
              onClick={() => setOpen(false)}
              className="focus-ring rounded-xl bg-[var(--trust)] px-4 py-3 text-center text-sm font-extrabold text-white"
            >
              Explore tiers
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
