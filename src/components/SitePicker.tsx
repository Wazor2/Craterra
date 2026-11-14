import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Site, Summaries } from "../lib/types";
import { formatLatLon, siteTypeLabel } from "./SiteCard";

interface SitePickerProps {
  sites: Site[];
  selectedId: string;
  onSelect: (siteId: string) => void;
  summaries?: Summaries | null;
  layout?: "rail" | "bar" | "floating";
}

export function sortSitesSouthPoleFirst(sites: Site[]): Site[] {
  const order: Record<Site["type"], number> = {
    south_pole: 0,
    other: 1,
    apollo: 2,
  };
  return [...sites].sort((a, b) => order[a.type] - order[b.type]);
}

export function SitePicker({
  sites,
  selectedId,
  onSelect,
  summaries,
  layout = "rail",
}: SitePickerProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "south_pole" | "apollo">(
    "all"
  );

  const ordered = useMemo(() => sortSitesSouthPoleFirst(sites), [sites]);

  const filteredSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ordered.filter((site) => {
      if (typeFilter !== "all" && site.type !== typeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        site.name.toLowerCase().includes(q) ||
        site.id.toLowerCase().includes(q) ||
        siteTypeLabel(site.type).toLowerCase().includes(q)
      );
    });
  }, [ordered, query, typeFilter]);

  const activeSite = ordered.find((s) => s.id === selectedId) ?? ordered[0];

  if (layout === "bar") {
    return (
      <section
        aria-label="Landing site selector"
        className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-4 space-y-3"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xs font-medium text-[#9aa3b2]">
              Landing Site Selection
            </h2>
            {activeSite && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#edf0f5]">
                <span className="font-semibold">{activeSite.name}</span>
                <span aria-hidden="true" className="text-[#687283]">
                  ·
                </span>
                <span className="text-[#56B4E9]">
                  {siteTypeLabel(activeSite.type)}
                </span>
                <span aria-hidden="true" className="text-[#687283]">
                  ·
                </span>
                <span className="font-mono tabular-nums text-[#9aa3b2]">
                  {formatLatLon(activeSite.lat, activeSite.lon)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={13}
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#687283]"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter sites by name..."
                aria-label="Filter landing sites by name"
                className="min-h-[38px] w-56 rounded-[5px] border border-[#2d3544] bg-[#090b10] pl-8 pr-7 py-1.5 text-xs text-[#edf0f5] placeholder:text-[#687283]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear site filter"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#687283] hover:text-[#edf0f5]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filteredSites.map((site) => {
            const isSelected = site.id === selectedId;
            return (
              <button
                key={site.id}
                type="button"
                onClick={() => onSelect(site.id)}
                aria-pressed={isSelected}
                className={`rounded-[5px] px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                  isSelected
                    ? "bg-[#edf0f5] text-[#090b10] font-semibold"
                    : "border border-[#1f2530] bg-[#151922] text-[#9aa3b2] hover:border-[#2d3544] hover:text-[#edf0f5]"
                }`}
              >
                {site.name.replace(" — ", ": ")}
              </button>
            );
          })}
          {filteredSites.length === 0 && (
            <p className="text-xs text-[#9aa3b2]">
              No landing sites match &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>
      </section>
    );
  }

  const isFloating = layout === "floating";

  return (
    <section
      aria-label="Landing site catalog"
      className={
        isFloating
          ? "space-y-2.5"
          : "rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-4 space-y-3"
      }
    >
      {!isFloating && (
        <div className="flex items-center justify-between border-b border-[#1f2530] pb-2.5">
          <h2 className="text-xs font-medium text-[#9aa3b2]">
            Landing Sites
          </h2>
          <span className="font-mono text-[11px] text-[#687283] tabular-nums">
            {filteredSites.length} / {ordered.length}
          </span>
        </div>
      )}

      {/* Name Filter Input + Region Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#687283]"
          />
          <label htmlFor="site-name-filter" className="sr-only">
            Filter landing sites by name
          </label>
          <input
            id="site-name-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name..."
            className="w-full min-h-[38px] rounded-[5px] border border-[#2d3544] bg-[#090b10] pl-8 pr-8 py-1.5 text-xs text-[#edf0f5] placeholder:text-[#687283] transition-colors focus:border-[#eab354]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear name filter"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-[#687283] hover:text-[#edf0f5]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filter by region"
          className="grid grid-cols-3 gap-1 rounded-[5px] border border-[#1f2530] bg-[#090b10] p-0.5 text-xs"
        >
          {(
            [
              ["all", "All"],
              ["south_pole", "South Pole"],
              ["apollo", "Apollo"],
            ] as const
          ).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => setTypeFilter(val)}
              className={`rounded-[4px] py-1.5 font-medium whitespace-nowrap transition-colors ${
                typeFilter === val
                  ? "bg-[#1c212c] text-[#edf0f5]"
                  : "text-[#687283] hover:text-[#edf0f5]"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Unified minimal touch-friendly site list */}
      <div
        role="listbox"
        aria-label="Landing sites"
        className={
          isFloating
            ? "grid grid-cols-1 gap-1.5"
            : "grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1 max-h-[250px] overflow-y-auto lg:max-h-none lg:overflow-visible pr-0.5"
        }
      >
        {filteredSites.length === 0 ? (
          <div className="col-span-full rounded-[5px] border border-[#1f2530] bg-[#0b0e14] p-3 text-xs text-[#9aa3b2] space-y-2">
            <p>
              No landing sites match{" "}
              {query ? <>&ldquo;{query}&rdquo;</> : "this filter"}.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTypeFilter("all");
              }}
              className="rounded-[5px] border border-[#2d3544] bg-[#151922] px-3 py-1.5 text-xs font-medium text-[#edf0f5] hover:bg-[#1c212c]"
            >
              Reset filter
            </button>
          </div>
        ) : (
          filteredSites.map((site) => {
            const isSelected = site.id === selectedId;
            const stats = summaries?.[site.id]?.stats;
            return (
              <button
                key={site.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(site.id)}
                className={`w-full min-h-[44px] text-left rounded-[5px] border p-3 transition-colors ${
                  isSelected
                    ? "border-[#eab354]/80 bg-[#eab354]/[0.08]"
                    : "border-[#1f2530] bg-[#0b0e14] hover:border-[#2d3544] hover:bg-[#151922]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span
                    className={
                      site.type === "south_pole"
                        ? "font-medium text-[#56B4E9]"
                        : "font-medium text-[#eab354]"
                    }
                  >
                    {siteTypeLabel(site.type)}
                  </span>
                  <span className="font-mono text-[#687283] tabular-nums">
                    {site.lat.toFixed(1)}°, {site.lon.toFixed(1)}°E
                  </span>
                </div>
                <div className="mt-1 font-display text-sm font-semibold text-[#edf0f5] leading-snug">
                  {site.name}
                </div>
                {stats && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px] text-[#9aa3b2] tabular-nums">
                      <span>Sun {stats.sunlit_pct}%</span>
                      <span>Earth {stats.earth_visible_pct}%</span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="grid grid-cols-2 gap-1.5"
                    >
                      <div className="h-1 overflow-hidden rounded-full bg-[#151922]">
                        <div
                          className="h-full bg-[#eab354]"
                          style={{ width: `${stats.sunlit_pct}%` }}
                        />
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-[#151922]">
                        <div
                          className="h-full bg-[#56B4E9]"
                          style={{ width: `${stats.earth_visible_pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
