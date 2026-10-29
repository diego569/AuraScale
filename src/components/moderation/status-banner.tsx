const TONE_CLASSES: Record<"success" | "neutral" | "danger", string> = {
  success: "border-emerald-200 bg-[var(--value-soft)] text-emerald-800",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  danger: "border-red-200 bg-red-50 text-[var(--danger)]",
};

export function StatusBanner({
  tone,
  children,
}: {
  tone: "success" | "neutral" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${TONE_CLASSES[tone]}`}>
      {children}
    </div>
  );
}
