"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { ServiceCard } from "@/components/storefront/service-card";
import type { CatalogServiceDto } from "@/domain/catalog/catalog-dto";

export function CatalogExplorer({ services }: { services: CatalogServiceDto[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(
    () => Array.from(new Map(services.map((service) => [service.categorySlug, service.categoryName]))),
    [services],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return services.filter((service) => {
      const matchesCategory = category === "all" || service.categorySlug === category;
      const matchesQuery =
        !normalized ||
        service.name.toLowerCase().includes(normalized) ||
        service.shortDescription?.toLowerCase().includes(normalized) ||
        service.categoryName.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query, services]);

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search services</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search access tiers or capabilities"
            className="focus-ring h-12 w-full rounded-xl bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>
        <label className="relative md:w-64">
          <span className="sr-only">Filter by category</span>
          <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="focus-ring h-12 w-full appearance-none rounded-xl bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="all">All categories</option>
            {categories.map(([slug, name]) => (
              <option key={slug} value={slug}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <p className="font-semibold text-slate-500">
          <span className="font-extrabold text-[var(--ink-950)]">{filtered.length}</span> configurations found
        </p>
        <p className="hidden text-xs text-slate-400 sm:block">Prices shown in authoritative USD</p>
      </div>

      {filtered.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>
      ) : (
        <div className="mt-8 rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-lg font-extrabold text-slate-800">No matching access tier</p>
          <p className="mt-2 text-sm text-slate-500">Try a broader search or another category.</p>
        </div>
      )}
    </div>
  );
}
