import { KeyRound } from "lucide-react";
import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container-shell max-w-md">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[var(--shadow-soft)]">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-[var(--trust)]">
            <KeyRound size={20} />
          </span>
          <h1 className="mt-6 text-2xl font-black tracking-[-0.04em] text-[var(--ink-950)]">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Enter the email on your account and we&apos;ll send a link to reset it.
          </p>
          <div className="mt-7">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </section>
  );
}
