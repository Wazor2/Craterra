import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, MapPin } from "lucide-react";
import { FloatingSitesWindow } from "../components/FloatingSitesWindow";
import { IllumHeatmap } from "../components/IllumHeatmap";
import { LunarScene3D } from "../components/LunarScene3D";
import { MoonGlobe3D } from "../components/MoonGlobe3D";
import { NumberCards } from "../components/NumberCards";
import { SkyView } from "../components/SkyView";
import { TechnicalPanel } from "../components/TechnicalPanel";
import { TimeScrubber } from "../components/TimeScrubber";
import { TimelineStrips } from "../components/TimelineStrips";
import {
  loadEphemeris,
  loadHorizon,
  loadSites,
  loadSummaries,
} from "../lib/data";
import { currentState, nextEvent } from "../lib/events";
import { endEpoch } from "../lib/geometry";
import type { Ephemeris, LoadedHorizon, Site, Summaries } from "../lib/types";
import { windowStats } from "../lib/windows";

const LUNAR_DAY_MS = 29.53 * 86_400_000;

type WorkspaceTab =
  | "globe"
  | "3d"
  | "2d"
  | "split"
  | "timelines"
  | "technical";

interface PlannerPageProps {
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
  onCompareSite?: (siteId: string) => void;
}

export function PlannerPage({
  selectedSiteId,
  onSelectSite,
  onCompareSite,
}: PlannerPageProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [summaries, setSummaries] = useState<Summaries | null>(null);
  const [ephemeris, setEphemeris] = useState<Ephemeris | null>(null);
  const [horizon, setHorizon] = useState<LoadedHorizon | null>(null);

  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingSiteData, setLoadingSiteData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState<number>(Date.parse("2026-12-01T00:00:00Z"));
  const [stripWindowStartMs, setStripWindowStartMs] = useState<number>(
    Date.parse("2026-12-01T00:00:00Z")
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("globe");
  const [sitesWindowOpen, setSitesWindowOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  const handleSelectSiteFromGlobe = useCallback(
    (siteId: string) => {
      onSelectSite(siteId);
      setSitesWindowOpen(false);
      setActiveTab("3d");
    },
    [onSelectSite]
  );

  useEffect(() => {
    let active = true;
    setLoadingSites(true);
    Promise.all([loadSites(), loadSummaries()])
      .then(([loadedSites, loadedSummaries]) => {
        if (!active) return;
        setSites(loadedSites);
        setSummaries(loadedSummaries);
        if (
          loadedSites.length > 0 &&
          !loadedSites.some((s) => s.id === selectedSiteId)
        ) {
          onSelectSite(loadedSites[0].id);
        }
        setLoadingSites(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load landing sites."
        );
        setLoadingSites(false);
      });
    return () => {
      active = false;
    };
  }, [selectedSiteId, onSelectSite]);

  useEffect(() => {
    if (!selectedSiteId) return;
    let active = true;
    setLoadingSiteData(true);
    setError(null);

    Promise.all([loadEphemeris(selectedSiteId), loadHorizon(selectedSiteId)])
      .then(([eph, hor]) => {
        if (!active) return;
        setEphemeris(eph);
        setHorizon(hor);
        const startMs = Date.parse(eph.start_utc);
        const endMs = endEpoch(eph);
        setNowMs((prev) => {
          if (prev < startMs || prev > endMs) return startMs;
          return prev;
        });
        setStripWindowStartMs((prev) => {
          if (prev < startMs || prev > endMs) return startMs;
          return prev;
        });
        setLoadingSiteData(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : `Failed to load site data for ${selectedSiteId}.`
        );
        setLoadingSiteData(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSiteId]);

  const handleTimeChange = useCallback(
    (nextMs: number) => {
      if (!ephemeris) return;
      const startMs = Date.parse(ephemeris.start_utc);
      const endMs = endEpoch(ephemeris);
      const clamped = Math.max(startMs, Math.min(endMs, nextMs));
      setNowMs(clamped);

      setStripWindowStartMs((prevWin) => {
        if (clamped < prevWin || clamped > prevWin + LUNAR_DAY_MS) {
          return Math.max(
            startMs,
            Math.min(clamped, Math.max(startMs, endMs - LUNAR_DAY_MS))
          );
        }
        return prevWin;
      });
    },
    [ephemeris]
  );

  const computed = useMemo(() => {
    if (!ephemeris || !horizon) return null;
    const state = currentState(ephemeris, horizon, nowMs);
    const nextSunriseMs = nextEvent(ephemeris, horizon, "sun", nowMs, "rise");
    const nextSunsetMs = nextEvent(ephemeris, horizon, "sun", nowMs, "set");
    const nextEarthriseMs = nextEvent(
      ephemeris,
      horizon,
      "earth",
      nowMs,
      "rise"
    );
    const nextEarthsetMs = nextEvent(
      ephemeris,
      horizon,
      "earth",
      nowMs,
      "set"
    );
    const lunarDayStats = windowStats(
      ephemeris,
      horizon,
      stripWindowStartMs,
      29.53
    );
    return {
      state,
      nextSunriseMs,
      nextSunsetMs,
      nextEarthriseMs,
      nextEarthsetMs,
      lunarDayStats,
    };
  }, [ephemeris, horizon, nowMs, stripWindowStartMs]);

  const activeSite = sites.find((s) => s.id === selectedSiteId);
  const activeSummary = summaries?.[selectedSiteId];

  if (loadingSites) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#03050a] p-6">
        <div className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] px-6 py-4 text-sm text-[#9aa3b2]">
          Loading lunar landing site catalog...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#03050a] p-6">
        <div
          role="alert"
          className="max-w-md rounded-[6px] border border-[#d9826c]/60 bg-[#151922] p-6 text-sm text-[#d9826c]"
        >
          <h2 className="font-display text-base font-semibold">
            Data Loading Error
          </h2>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const ready = !loadingSiteData && ephemeris && horizon && computed;
  const is3DCanvasTab = activeTab === "globe" || activeTab === "3d";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#03050a]">
      {/* Main Stage */}
      {activeTab === "globe" ? (
        <div className="absolute inset-0">
          <MoonGlobe3D
            sites={sites}
            selectedSiteId={selectedSiteId}
            onSelectSiteForTerrain={handleSelectSiteFromGlobe}
            fullScreen
          />
        </div>
      ) : !ready ? (
        <div className="flex h-full w-full items-center justify-center p-6">
          <div className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] px-6 py-4 text-sm text-[#9aa3b2]">
            Loading ephemeris and terrain horizon for {selectedSiteId}...
          </div>
        </div>
      ) : activeTab === "3d" ? (
        <div className="absolute inset-0">
          <LunarScene3D
            siteId={selectedSiteId}
            siteName={activeSite?.name ?? selectedSiteId}
            horizon={horizon}
            state={computed.state}
            fullScreen
          />
        </div>
      ) : (
        <div className="h-full w-full overflow-y-auto px-3 sm:px-6 pt-16 pb-10">
          <div className="mx-auto max-w-[1440px] space-y-4">
            {horizon.isFlat && (
              <div
                role="status"
                className="inline-block rounded-[5px] border border-[#d9826c]/60 bg-[#151922] px-3 py-1.5 text-xs font-medium text-[#d9826c]"
              >
                No terrain data yet: flat horizon assumed
              </div>
            )}

            {/* Telemetry Cards visible cleanly in 2D / Split / Timelines views (never covering 3D views) */}
            {(activeTab === "2d" ||
              activeTab === "split" ||
              activeTab === "timelines") && (
              <NumberCards
                state={computed.state}
                nowMs={nowMs}
                nextSunriseMs={computed.nextSunriseMs}
                nextSunsetMs={computed.nextSunsetMs}
                nextEarthriseMs={computed.nextEarthriseMs}
                nextEarthsetMs={computed.nextEarthsetMs}
                lunarDayStats={computed.lunarDayStats}
              />
            )}

            {activeTab === "split" && (
              <LunarScene3D
                siteId={selectedSiteId}
                siteName={activeSite?.name ?? selectedSiteId}
                horizon={horizon}
                state={computed.state}
              />
            )}

            {(activeTab === "2d" || activeTab === "split") && (
              <SkyView
                key={selectedSiteId}
                horizon={horizon}
                state={computed.state}
              />
            )}

            {activeTab === "timelines" && (
              <div className="space-y-4">
                <TimelineStrips
                  ephemeris={ephemeris}
                  horizon={horizon}
                  nowMs={nowMs}
                  windowStartMs={stripWindowStartMs}
                  onSelectTime={handleTimeChange}
                />

                <IllumHeatmap
                  ephemeris={ephemeris}
                  horizon={horizon}
                  nowMs={nowMs}
                  onSelectTime={handleTimeChange}
                />
              </div>
            )}

            {activeTab === "technical" && (
              <TechnicalPanel
                site={activeSite}
                summary={activeSummary}
                ephemeris={ephemeris}
                horizon={horizon}
                state={computed.state}
                nowMs={nowMs}
              />
            )}

            <TimeScrubber
              startMs={Date.parse(ephemeris.start_utc)}
              endMs={endEpoch(ephemeris)}
              valueMs={nowMs}
              onChange={handleTimeChange}
              outOfRange={computed.state.outOfRange}
              nextSunriseMs={computed.nextSunriseMs}
              nextSunsetMs={computed.nextSunsetMs}
              nextEarthriseMs={computed.nextEarthriseMs}
              nextEarthsetMs={computed.nextEarthsetMs}
            />
          </div>
        </div>
      )}

      {/* Ultra-Minimal Floating Top Bar (Google Earth Explorer style — single slim row) */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 px-3 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left Floating Control Pill */}
          <div className="pointer-events-auto flex items-center gap-1 rounded-[6px] border border-[#1f2530] bg-[#0f1218]/[0.88] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)] min-w-0">
            {activeTab !== "globe" && (
              <button
                type="button"
                onClick={() => setActiveTab("globe")}
                aria-label="Back to 3D Moon Globe"
                className="inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-xs font-medium text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5] transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeft size={13} />
                <span className="hidden sm:inline">Moon</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSitesWindowOpen((v) => !v)}
              aria-expanded={sitesWindowOpen}
              className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                sitesWindowOpen
                  ? "bg-[#151922] text-[#eab354]"
                  : "text-[#edf0f5] hover:bg-[#151922]"
              }`}
            >
              <MapPin size={12} className="text-[#eab354]" aria-hidden="true" />
              <span>Sites</span>
            </button>

            {ready && activeTab === "3d" && (
              <>
                <span aria-hidden="true" className="h-4 w-px bg-[#1f2530] shrink-0" />
                <button
                  type="button"
                  onClick={() => setTelemetryOpen((v) => !v)}
                  aria-expanded={telemetryOpen}
                  className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    telemetryOpen
                      ? "bg-[#151922] text-[#56B4E9]"
                      : "text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5]"
                  }`}
                >
                  <Activity size={12} aria-hidden="true" />
                  <span>Key Numbers</span>
                </button>
              </>
            )}

            {activeTab !== "globe" && activeSite && (
              <>
                <span aria-hidden="true" className="h-4 w-px bg-[#1f2530] shrink-0" />
                <span className="hidden sm:inline font-display text-xs font-semibold text-[#edf0f5] px-1.5 truncate max-w-[200px]">
                  {activeSite.name}
                </span>
              </>
            )}
          </div>

          {/* Right Floating View Switcher */}
          <div
            role="tablist"
            aria-label="Observatory workspace views"
            className="pointer-events-auto inline-flex items-center overflow-x-auto max-w-[calc(100vw-124px)] rounded-[6px] border border-[#1f2530] bg-[#0f1218]/[0.88] p-1 text-[11px] sm:text-xs shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
          >
            {(
              [
                ["globe", "Moon Globe"],
                ["3d", "3D Terrain"],
                ["2d", "2D Horizon"],
                ["split", "Split"],
                ["timelines", "Timelines"],
                ["technical", "Tech Specs"],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-[4px] px-2 sm:px-2.5 py-1 font-medium whitespace-nowrap shrink-0 transition-colors ${
                  activeTab === tab
                    ? "bg-[#edf0f5] text-[#090b10] font-semibold"
                    : "text-[#9aa3b2] hover:text-[#edf0f5]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {ready && horizon.isFlat && is3DCanvasTab && activeTab === "3d" && (
          <div
            role="status"
            className="pointer-events-auto mt-2 inline-block rounded-[5px] border border-[#d9826c]/60 bg-[#151922]/[0.95] px-3 py-1 text-xs font-medium text-[#d9826c]"
          >
            No terrain data yet: flat horizon assumed
          </div>
        )}
      </div>

      {/* Click-to-Open Draggable Landing Sites Window */}
      <FloatingSitesWindow
        sites={sites}
        selectedId={selectedSiteId}
        onSelect={(id) => {
          onSelectSite(id);
        }}
        summaries={summaries}
        open={sitesWindowOpen}
        onClose={() => setSitesWindowOpen(false)}
        onCompareSite={onCompareSite}
      />

      {/* Collapsible Top-Left Key Numbers Deck in 3D Terrain view */}
      {ready && activeTab === "3d" && telemetryOpen && !sitesWindowOpen && (
        <div className="pointer-events-auto absolute top-[58px] left-3 right-3 sm:right-auto sm:left-4 sm:w-[348px] z-10">
          <NumberCards
            variant="deck"
            state={computed.state}
            nowMs={nowMs}
            nextSunriseMs={computed.nextSunriseMs}
            nextSunsetMs={computed.nextSunsetMs}
            nextEarthriseMs={computed.nextEarthriseMs}
            nextEarthsetMs={computed.nextEarthsetMs}
            lunarDayStats={computed.lunarDayStats}
            onClose={() => setTelemetryOpen(false)}
          />
        </div>
      )}

      {/* Slim Single-Line UTC Time Bar (only in 3D Terrain view; omitted on Moon Globe) */}
      {ready && activeTab === "3d" && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-auto sm:w-[calc(100vw-32px)] lg:w-[680px] xl:w-[740px] lg:max-w-[calc(100vw-360px)] z-20">
          <div className="pointer-events-auto">
            <TimeScrubber
              variant="minimal"
              startMs={Date.parse(ephemeris.start_utc)}
              endMs={endEpoch(ephemeris)}
              valueMs={nowMs}
              onChange={handleTimeChange}
              outOfRange={computed.state.outOfRange}
              nextSunriseMs={computed.nextSunriseMs}
              nextSunsetMs={computed.nextSunsetMs}
              nextEarthriseMs={computed.nextEarthriseMs}
              nextEarthsetMs={computed.nextEarthsetMs}
            />
          </div>
        </div>
      )}
    </div>
  );
}
