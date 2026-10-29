import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { requireAuthenticatedUser } from "@/policies/server-authorization";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage() {
  const isAuthenticated = await requireAuthenticatedUser()
    .then(() => true)
    .catch(() => false);

  if (isAuthenticated) {
    redirect("/account/wallet");
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="container-shell max-w-md">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[var(--shadow-soft)]">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-[var(--trust)]">
            <UserPlus size={20} />
          </span>
          <h1 className="mt-6 text-2xl font-black tracking-[-0.04em] text-[var(--ink-950)]">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Registration is instant. Activation is verified over WhatsApp before wallet and checkout capabilities unlock.
          </p>
          <div className="mt-7">
            <RegisterForm />
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="focus-ring font-bold text-[var(--trust)]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
