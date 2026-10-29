"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitPaymentProofAction } from "@/actions/payment-proof.actions";

export function PaymentProofForm({
  orderNumber,
  defaultCurrencyCode,
}: {
  orderNumber: string;
  defaultCurrencyCode: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("orderNumber", orderNumber);

    const result = await submitPaymentProofAction(formData);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setStatus("idle");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Amount paid</span>
          <input
            type="number"
            name="reportedAmount"
            step="0.01"
            min="0.01"
            required
            className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Currency</span>
          <select
            name="reportedCurrencyCode"
            defaultValue={defaultCurrencyCode}
            className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
          >
            <option value="USD">USD</option>
            <option value="PEN">PEN</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-bold text-slate-600">Transfer reference (optional)</span>
        <input
          type="text"
          name="externalReference"
          maxLength={255}
          className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none"
          placeholder="Operation number, last 4 digits, etc."
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold text-slate-600">Note (optional)</span>
        <textarea
          name="clientNote"
          maxLength={2000}
          rows={2}
          className="focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold text-slate-600">Proof (JPEG, PNG, WEBP, or PDF — max 8MB)</span>
        <input
          type="file"
          name="proof"
          required
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="focus-ring mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none"
        />
      </label>
      {error ? <p className="text-xs font-bold text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--trust)] text-sm font-extrabold text-white transition hover:bg-[var(--trust-dark)] disabled:opacity-60"
      >
        <UploadCloud size={16} /> {status === "submitting" ? "Uploading…" : "Submit payment proof"}
      </button>
    </form>
  );
}
