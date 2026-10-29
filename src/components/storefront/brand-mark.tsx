import Link from "next/link";

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className="focus-ring inline-flex items-center gap-3 rounded-lg"
      aria-label="AuraScale home"
    >
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-xl bg-[var(--trust)] shadow-[0_8px_24px_rgba(47,107,255,.32)]">
        <span className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-white/90" />
        <span className="absolute bottom-2 left-[17px] h-4 w-2 rounded-full bg-white/90" />
        <span className="absolute bottom-2 right-2 h-6 w-2 rounded-full bg-[var(--value)]" />
      </span>
      <span
        className={`text-lg font-extrabold tracking-[-0.035em] ${inverse ? "text-white" : "text-[var(--ink-950)]"}`}
      >
        AuraScale
      </span>
    </Link>
  );
}
