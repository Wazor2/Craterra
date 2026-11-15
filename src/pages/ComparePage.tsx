import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CompareGrid, type LoadedSiteBundle } from "../components/CompareGrid";
import { SiteCard, siteTypeLabel } from "../components/SiteCard";
import { sortSitesSouthPoleFirst } from "../components/SitePicker";
import { TimeScrubber } from "../components/TimeScrubber";
import { WhatChanged } from "../components/WhatChanged";
import {
  loadEphemeris,
  loadHorizon,
  loadSites,
  loadSummaries,
} from "../lib/data";
import { endEpoch } from "../lib/geometry";
import type { Site, Summaries } from "../lib/types";

const LUNAR_DAY_MS = 29.53 * 86_400_000;

interface ComparePageProps {
  selectedIds: string[];
  onChangeSelectedIds: (next: string[] | ((prev: string[]) => string[])) => void;
  onInspectSiteInPlanner?: (siteId: string) => void;
}

export function ComparePage({
  selectedIds,
  onChangeSelectedIds,
  onInspectSiteInPlanner,
}: ComparePageProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [summaries, setSummaries] = useState<Summaries | null>(null);
  const [bundles, setBundles] = useState<LoadedSiteBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"compare" | "what-changed">(
    "compare"
  );
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "south_pole" | "apollo">(
    "all"
  );

  const [nowMs, setNowMs] = useState<number>(Date.parse("2026-12-10T00:00:00Z"));
  const [windowStartMs, setWindowStartMs] = useState<number>(
    Date.parse("2026-12-01T00:00:00Z")
  );

  useEffect(() => {
    let active = true;
    Promise.all([loadSites(), loadSummaries()])
      .then(([loadedSites, loadedSummaries]) => {
        if (!active) return;
        setSites(sortSitesSouthPoleFirst(loadedSites));
        setSummaries(loadedSummaries);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load site catalog."
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (sites.length === 0) return;
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all(
      selectedIds.map(async (id) => {
        const site = sites.find((s) => s.id === id);
        if (!site) return null;
        const [ephemeris, horizon] = await Promise.all([
          loadEphemeris(id),
          loadHorizon(id),
        ]);
        return { site, ephemeris, horizon };
      })
    )
      .then((loaded) => {
        if (!active) return;
        const valid = loaded.filter(
          (b): b is LoadedSiteBundle => b !== null
        );
        setBundles(valid);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load site bundles."
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sites, selectedIds]);

  const toggleSiteSelection = (siteId: string) => {
    onChangeSelectedIds((prev) => {
      if (prev.includes(siteId)) {
        if (prev.length <= 2) return prev;
        return prev.filter((id) => id !== siteId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), siteId];
      }
      return [...prev, siteId];
    });
  };

  const filteredSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((site) => {
      if (typeFilter !== "all" && site.type !== typeFilter) return false;
      if (!q) return true;
      return (
        site.name.toLowerCase().includes(q) ||
        site.id.toLowerCase().includes(q) ||
        siteTypeLabel(site.type).toLowerCase().includes(q)
      );
    });
  }, [sites, query, typeFilter]);

  const firstEph = bundles[0]?.ephemeris;
  const startMs = firstEph
    ? Date.parse(firstEph.start_utc)
    : Date.parse("2026-12-01T00:00:00Z");
  const endMs = firstEph
    ? endEpoch(firstEph)
    : Date.parse("2027-03-01T00:00:00Z");

  const handleTimeChange = useCallback(
    (nextMs: number) => {
      const clamped = Math.max(startMs, Math.min(endMs, nextMs));
      setNowMs(clamped);
      setWindowStartMs((prevWin) => {
        if (clamped < prevWin || clamped > prevWin + LUNAR_DAY_MS) {
          return Math.max(
            startMs,
            Math.min(clamped, Math.max(startMs, endMs - LUNAR_DAY_MS))
          );
        }
        return prevWin;
      });
    },
    [startMs, endMs]
  );

  const [showSiteSelector, setShowSiteSelector] = useState(false);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-[6px] border border-[#d9826c]/60 bg-[#151922] p-6 text-sm text-[#d9826c]"
      >
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-[#1f2530] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs text-[#9aa3b2]">
            Multi-Site Tradeoff &amp; Slip Analysis
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#edf0f5] text-balance">
            Compare Sites &amp; Launch-Delay Impact
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSiteSelector((v) => !v)}
            aria-expanded={showSiteSelector}
            className="rounded-[5px] border border-[#2d3544] bg-[#151922] px-3 py-2 text-xs font-medium text-[#edf0f5] hover:border-[#eab354] transition-colors whitespace-nowrap"
          >
            {showSiteSelector
              ? "Done Selecting"
              : `Choose Sites (${selectedIds.length} active)`}
          </button>

          <div
            role="tablist"
            aria-label="Compare mode"
            className="inline-flex rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-1 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "compare"}
              onClick={() => setActiveTab("compare")}
              className={`rounded-[4px] px-3 py-1.5 font-semibold whitespace-nowrap transition-colors ${
                activeTab === "compare"
                  ? "bg-[#edf0f5] text-[#090b10]"
                  : "text-[#9aa3b2] hover:text-[#edf0f5]"
              }`}
            >
              Side-by-Side (2–3 Sites)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "what-changed"}
              onClick={() => setActiveTab("what-changed")}
              className={`rounded-[4px] px-3 py-1.5 font-semibold whitespace-nowrap transition-colors ${
                activeTab === "what-changed"
                  ? "bg-[#edf0f5] text-[#090b10]"
                  : "text-[#9aa3b2] hover:text-[#edf0f5]"
              }`}
            >
              What-Changed (+14d Slip)
            </button>
          </div>
        </div>
      </div>

      {showSiteSelector && (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center bg-[#06080f]/65 p-3 pt-16 sm:pt-20"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSiteSelector(false);
          }}
        >
          <section
            role="dialog"
            aria-label="Choose 2 to 3 sites to compare"
            className="w-full max-w-4xl max-h-[80vh] overflow-y-auto rounded-[7px] border border-[#2d3544] bg-[#0f1218]/[0.98] p-4 space-y-3 shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
          >
            <div className="flex flex-col gap-3 border-b border-[#1f2530] pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-[#edf0f5]">
                  Select 2–3 Landing Sites ({selectedIds.length} active)
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSiteSelector(false)}
                  aria-label="Close site selection window"
                  className="sm:hidden inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5]"
                >
                  <X size={15} />
                </button>
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
                    placeholder="Filter sites..."
                    aria-label="Filter comparison sites by name"
                    className="min-h-[36px] w-48 rounded-[5px] border border-[#2d3544] bg-[#090b10] pl-8 pr-7 py-1 text-xs text-[#edf0f5] placeholder:text-[#687283]"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear filter"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#687283] hover:text-[#edf0f5]"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div
                  role="group"
                  aria-label="Filter comparison sites by region"
                  className="inline-flex rounded-[5px] border border-[#1f2530] bg-[#090b10] p-0.5 text-xs"
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
                      className={`rounded-[4px] px-2.5 py-1 whitespace-nowrap ${
                        typeFilter === val
                          ? "bg-[#1c212c] text-[#edf0f5] font-medium"
                          : "text-[#687283] hover:text-[#edf0f5]"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-[5px] border border-[#1f2530] bg-[#090b10] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setExpertMode(false)}
                    className={`rounded-[4px] px-2.5 py-1 whitespace-nowrap ${
                      !expertMode
                        ? "bg-[#1c212c] text-[#edf0f5] font-medium"
                        : "text-[#687283] hover:text-[#edf0f5]"
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpertMode(true)}
                    className={`rounded-[4px] px-2.5 py-1 whitespace-nowrap ${
                      expertMode
                        ? "bg-[#1c212c] text-[#edf0f5] font-medium"
                        : "text-[#687283] hover:text-[#edf0f5]"
                    }`}
                  >
                    Expert
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSiteSelector(false)}
                  aria-label="Close site selection window"
                  className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-[#1f2530] bg-[#151922] text-[#9aa3b2] hover:text-[#edf0f5]"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredSites.map((site) => {
                const isSelected = selectedIds.includes(site.id);
                return (
                  <SiteCard
                    key={site.id}
                    site={site}
                    selected={isSelected}
                    onSelect={toggleSiteSelection}
                    summary={summaries?.[site.id]}
                    expertMode={expertMode}
                    selectionLabel={isSelected ? "Comparing" : "Add to compare"}
                  />
                );
              })}
              {filteredSites.length === 0 && (
                <div className="col-span-full rounded-[5px] border border-[#1f2530] bg-[#090b10] p-4 text-xs text-[#9aa3b2]">
                  No landing sites match your filter.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setTypeFilter("all");
                    }}
                    className="ml-2 text-[#56B4E9] underline"
                  >
                    Reset filter
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {loading ? (
        <div className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-8 text-sm text-[#9aa3b2]">
          Loading comparison datasets...
        </div>
      ) : (
        <>
          {activeTab === "compare" ? (
            <div className="space-y-4">
              <CompareGrid
                bundles={bundles}
                nowMs={nowMs}
                windowStartMs={windowStartMs}
                onSelectTime={handleTimeChange}
                onInspectSiteInPlanner={onInspectSiteInPlanner}
              />

              <TimeScrubber
                startMs={startMs}
                endMs={endMs}
                valueMs={nowMs}
                onChange={handleTimeChange}
                outOfRange={null}
                showEventJumps={false}
              />
            </div>
          ) : (
            <WhatChanged bundles={bundles} />
          )}
        </>
      )}
    </div>
  );
}
