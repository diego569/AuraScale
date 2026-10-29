"use client";

import { LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl,
    });

    if (!result || result.error) {
      setError("Invalid email or password.");
      setStatus("idle");
      return;
    }

    // A full navigation, not the SPA router: the just-issued session cookie
    // must be present on the very next request, and a client-side push can
    // race ahead of it.
    window.location.href = result.url ?? callbackUrl;
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
      <label className="block">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Password</span>
          <Link href="/forgot-password" className="focus-ring text-xs font-semibold text-[var(--trust)]">
            Forgot password?
          </Link>
        </div>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
        />
      </label>
      {error ? <p className="text-xs font-bold text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--trust)] text-sm font-extrabold text-white transition hover:bg-[var(--trust-dark)] disabled:opacity-60"
      >
        <LogIn size={16} /> {status === "submitting" ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
