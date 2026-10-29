"use client";

import { UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { registerClientAction } from "@/actions/registration.actions";

export function RegisterForm() {
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("submitting");

    const result = await registerClientAction(formData);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setError("Please correct the highlighted fields.");
      setStatus("idle");
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/account/wallet",
    });

    if (!signInResult || signInResult.error) {
      // Registration succeeded even if this automatic sign-in did not.
      window.location.href = "/login";
      return;
    }

    // A full navigation, not the SPA router: the just-issued session cookie
    // must be present on the very next request, and a client-side push can
    // race ahead of it.
    window.location.href = signInResult.url ?? "/account/wallet";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-xs font-bold text-slate-600">Full name</span>
        <input
          type="text"
          name="name"
          required
          minLength={2}
          autoComplete="name"
          className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
        />
        {fieldErrors.name ? (
          <p className="mt-1 text-xs font-bold text-[var(--danger)]">{fieldErrors.name[0]}</p>
        ) : null}
      </label>
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
        {fieldErrors.email ? (
          <p className="mt-1 text-xs font-bold text-[var(--danger)]">{fieldErrors.email[0]}</p>
        ) : null}
      </label>
      <label className="block">
        <span className="text-xs font-bold text-slate-600">WhatsApp phone number</span>
        <input
          type="tel"
          name="phoneE164"
          required
          autoComplete="tel"
          placeholder="+51987654321"
          className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-400">Include the country code, e.g. +51 for Peru. Used for activation.</p>
        {fieldErrors.phoneE164 ? (
          <p className="mt-1 text-xs font-bold text-[var(--danger)]">{fieldErrors.phoneE164[0]}</p>
        ) : null}
      </label>
      <label className="block">
        <span className="text-xs font-bold text-slate-600">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={12}
          autoComplete="new-password"
          className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
        />
        {fieldErrors.password ? (
          <p className="mt-1 text-xs font-bold text-[var(--danger)]">{fieldErrors.password[0]}</p>
        ) : null}
      </label>
      <label className="block">
        <span className="text-xs font-bold text-slate-600">Confirm password</span>
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
        <UserPlus size={16} /> {status === "submitting" ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
