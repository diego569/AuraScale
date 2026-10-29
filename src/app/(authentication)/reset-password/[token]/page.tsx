import { LockKeyhole } from "lucide-react";
import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <section className="py-16 sm:py-24">
      <div className="container-shell max-w-md">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[var(--shadow-soft)]">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-[var(--trust)]">
            <LockKeyhole size={20} />
          </span>
          <h1 className="mt-6 text-2xl font-black tracking-[-0.04em] text-[var(--ink-950)]">
            Set a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Choose a strong password for your AuraScale account.
          </p>
          <div className="mt-7">
            <ResetPasswordForm token={token} />
          </div>
        </div>
      </div>
    </section>
  );
}
