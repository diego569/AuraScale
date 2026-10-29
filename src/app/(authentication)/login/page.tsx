import { LogIn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { requireAuthenticatedUser } from "@/policies/server-authorization";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Sign in" };

function safeCallbackUrl(raw: string | undefined) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/account/wallet";
  }
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);

  // Re-verified against the current database record, not just a decoded JWT
  // claim: a cryptographically valid session cookie can still reference a
  // user that no longer exists (e.g. a different/reset database), and that
  // must not be treated as "signed in" here.
  const isAuthenticated = await requireAuthenticatedUser()
    .then(() => true)
    .catch(() => false);

  if (isAuthenticated) {
    redirect(callbackUrl);
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="container-shell max-w-md">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[var(--shadow-soft)]">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-[var(--trust)]">
            <LogIn size={20} />
          </span>
          <h1 className="mt-6 text-2xl font-black tracking-[-0.04em] text-[var(--ink-950)]">
            Sign in to AuraScale
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Access your wallet, ledger history, and checkout.
          </p>
          <div className="mt-7">
            <LoginForm callbackUrl={callbackUrl} />
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            New to AuraScale?{" "}
            <Link href="/register" className="focus-ring font-bold text-[var(--trust)]">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
