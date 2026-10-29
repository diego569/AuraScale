"use client";

import { CheckCircle2, MailCheck } from "lucide-react";
import { useState } from "react";

import { requestPasswordResetAction } from "@/actions/password-reset.actions";

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await requestPasswordResetAction(new FormData(event.currentTarget));

    if (!result.ok) {
      setError(result.fieldErrors?.email?.[0] ?? "Enter a valid email address.");
      setStatus("idle");
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
        <MailCheck className="mx-auto size-8 text-[var(--trust)]" />
        <p className="mt-4 text-sm font-bold text-blue-900">Check your inbox</p>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          If that email is associated with an AuraScale account, a reset link has been sent. It expires in 30 minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-xs font-bold text-slate-600">Email address</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
          placeholder="you@example.com"
        />
      </label>
      {error ? <p className="text-xs font-bold text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--trust)] text-sm font-extrabold text-white transition hover:bg-[var(--trust-dark)] disabled:opacity-60"
      >
        <CheckCircle2 size={16} /> {status === "submitting" ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
