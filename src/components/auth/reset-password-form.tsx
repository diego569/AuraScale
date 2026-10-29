"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { resetPasswordAction } from "@/actions/password-reset.actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    setError(null);

    const result = await resetPasswordAction(formData);

    if (!result.ok) {
      setStatus("idle");
      if (result.reason === "INVALID_OR_EXPIRED") {
        setError("This reset link is invalid or has expired. Request a new one.");
      } else {
        setError(
          result.fieldErrors?.newPassword?.[0] ??
            "That password does not meet the requirements.",
        );
      }
      return;
    }

    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-[var(--value-soft)] p-6 text-center">
        <ShieldCheck className="mx-auto size-8 text-[var(--value)]" />
        <p className="mt-4 text-sm font-bold text-emerald-900">Password updated</p>
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          Your password has been reset and any existing sessions have been signed out.
        </p>
        <Link
          href="/login"
          className="focus-ring mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--trust)] px-5 text-sm font-extrabold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="text-xs font-bold text-slate-600">New password</span>
        <input
          type="password"
          name="newPassword"
          required
          minLength={12}
          autoComplete="new-password"
          className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold text-slate-600">Confirm new password</span>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={12}
          autoComplete="new-password"
          className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
        />
      </label>
      <p className="text-[11px] leading-5 text-slate-400">
        At least 12 characters, with an uppercase letter, a lowercase letter, and a number.
      </p>
      {error ? <p className="text-xs font-bold text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--trust)] text-sm font-extrabold text-white transition hover:bg-[var(--trust-dark)] disabled:opacity-60"
      >
        <KeyRound size={16} /> {status === "submitting" ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
