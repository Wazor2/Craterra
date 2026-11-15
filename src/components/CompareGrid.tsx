import { useMemo } from "react";
import {
  currentState,
  marginSeries,
  nextEvent,
  timeUntil,
} from "../lib/events";
import { endEpoch } from "../lib/geometry";
import { longestRun, sunlitHours } from "../lib/windows";
import type { Ephemeris, LoadedHorizon, Site } from "../lib/types";
import { formatLatLon, siteTypeLabel } from "./SiteCard";
import { SkyView } from "./SkyView";
import { TimelineStrips } from "./TimelineStrips";

export interface LoadedSiteBundle {
  site: Site;
  ephemeris: Ephemeris;
  horizon: LoadedHorizon;
}

interface CompareGridProps {
  bundles: LoadedSiteBundle[];
  nowMs: number;
  windowStartMs: number;
  onSelectTime: (epochMs: number) => void;
  onInspectSiteInPlanner?: (siteId: string) => void;
}

const LUNAR_DAY_MS = 29.53 * 86_400_000;

export function CompareGrid({
  bundles,
  nowMs,
  windowStartMs,
  onSelectTime,
  onInspectSiteInPlanner,
}: CompareGridProps) {
  const windowSummary = useMemo(() => {
    if (bundles.length === 0) return null;

    const metrics = bundles.map((b) => {
      const startMs = Date.parse(b.ephemeris.start_utc);
      const endMs = endEpoch(b.ephemeris);
      const winStart = Math.max(startMs, windowStartMs);
      const winEnd = Math.min(endMs, winStart + LUNAR_DAY_MS);
      const stepMs = b.ephemeris.step_minutes * 60_000;

      const i0 = Math.max(0, Math.floor((winStart - startMs) / stepMs));
      const i1 = Math.min(
        b.ephemeris.sun_el.length,
        Math.ceil((winEnd - startMs) / stepMs)
      );

      const sunSlice = marginSeries(b.ephemeris, b.horizon, "sun").slice(i0, i1);
      const earthSlice = marginSeries(b.ephemeris, b.horizon, "earth").slice(i0, i1);

      const maxSunRun = longestRun(
        sunSlice,
        b.ephemeris.step_minutes,
        (m) => m > 0
      );
      const totalSunH = sunlitHours(sunSlice, b.ephemeris.step_minutes);
      const totalEarthH = sunlitHours(earthSlice, b.ephemeris.step_minutes);
      const maxEarthRun = longestRun(
        earthSlice,
        b.ephemeris.step_minutes,
        (m) => m > 0
      );

      return {
        site: b.site,
        maxSunRun,
        totalSunH,
        maxEarthRun,
        totalEarthH,
      };
    });

    const bestSun = [...metrics].sort((a, b) => b.maxSunRun - a.maxSunRun)[0];
    const bestEarth = [...metrics].sort((a, b) => b.totalEarthH - a.totalEarthH)[0];
    return { metrics, bestSun, bestEarth };
  }, [bundles, windowStartMs]);

  if (bundles.length === 0) {
    return (
      <div className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-6 text-sm text-[#9aa3b2]">
        Select 2 or 3 landing sites above to compare them side by side.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {windowSummary && (
        <section
          aria-label="Window comparison summary"
          className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-4"
        >
          <h3 className="text-xs font-medium text-[#9aa3b2]">
            Active Lunar-Day Window Summary ({new Date(windowStartMs).toISOString().slice(0, 10)} UTC + 29.5 days)
          </h3>
          <div className="mt-2.5 grid grid-cols-1 gap-px overflow-hidden rounded-[5px] border border-[#1f2530] bg-[#1f2530] md:grid-cols-2">
            <div className="bg-[#0b0e14] p-3.5">
              <span className="text-xs text-[#eab354] font-medium">
                Longest continuous sunlight
              </span>
              <p className="mt-1 font-display text-base font-semibold text-[#edf0f5]">
                {windowSummary.bestSun.site.name}
              </p>
              <p className="mt-0.5 font-mono text-xs text-[#9aa3b2] tabular-nums">
                {windowSummary.bestSun.maxSunRun.toFixed(1)} h continuous ·{" "}
                {windowSummary.bestSun.totalSunH.toFixed(1)} h total sunlit in
                window
              </p>
            </div>

            <div className="bg-[#0b0e14] p-3.5">
              <span className="text-xs text-[#56B4E9] font-medium">
                Longest Earth direct-to-Earth visibility
              </span>
              <p className="mt-1 font-display text-base font-semibold text-[#edf0f5]">
                {windowSummary.bestEarth.site.name}
              </p>
              <p className="mt-0.5 font-mono text-xs text-[#9aa3b2] tabular-nums">
                {windowSummary.bestEarth.totalEarthH.toFixed(1)} h total DTE ·{" "}
                {windowSummary.bestEarth.maxEarthRun.toFixed(1)} h longest
                continuous pass
              </p>
            </div>
          </div>
        </section>
      )}

      <div
        className={`grid grid-cols-1 gap-4 ${
          bundles.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {bundles.map(({ site, ephemeris, horizon }) => {
          const st = currentState(ephemeris, horizon, nowMs);
          const nextSun = st.sunVisible
            ? nextEvent(ephemeris, horizon, "sun", nowMs, "set")
            : nextEvent(ephemeris, horizon, "sun", nowMs, "rise");
          const nextEarth = st.earthVisible
            ? nextEvent(ephemeris, horizon, "earth", nowMs, "set")
            : nextEvent(ephemeris, horizon, "earth", nowMs, "rise");

          const sunCountdown = timeUntil(nextSun, nowMs);
          const earthCountdown = timeUntil(nextEarth, nowMs);

          return (
            <article
              key={site.id}
              className="flex flex-col gap-3 rounded-[6px] border border-[#1f2530] bg-[#0b0e14] p-4"
            >
              <header className="flex items-start justify-between gap-2 border-b border-[#1f2530] pb-2.5">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#9aa3b2]">
                    <span className="text-[#56B4E9] font-medium">
                      {siteTypeLabel(site.type)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatLatLon(site.lat, site.lon)}
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-semibold text-[#edf0f5]">
                    {site.name}
                  </h3>
                </div>
                {onInspectSiteInPlanner && (
                  <button
                    type="button"
                    onClick={() => onInspectSiteInPlanner(site.id)}
                    className="shrink-0 rounded-[4px] border border-[#2d3544] bg-[#151922] px-2.5 py-1.5 text-xs font-medium text-[#edf0f5] hover:border-[#eab354] hover:text-[#eab354] transition-colors whitespace-nowrap"
                  >
                    Open in 3D
                  </button>
                )}
              </header>

              <SkyView horizon={horizon} state={st} compact />

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-[#1f2530] bg-[#1f2530] font-mono text-xs tabular-nums">
                <div className="bg-[#0f1218] p-2.5">
                  <div className="text-[11px] text-[#687283]">Sun Elevation</div>
                  <div className="mt-0.5 text-base font-semibold text-[#edf0f5]">
                    {st.sunEl >= 0 ? "+" : ""}
                    {st.sunEl.toFixed(2)}°
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] font-medium ${
                      st.sunVisible ? "text-[#eab354]" : "text-[#d9826c]"
                    }`}
                  >
                    {st.sunVisible ? "● Sunlit" : "○ Dark"} (margin{" "}
                    {st.sunMargin >= 0 ? "+" : ""}
                    {st.sunMargin.toFixed(2)}°)
                  </div>
                </div>

                <div className="bg-[#0f1218] p-2.5">
                  <div className="text-[11px] text-[#687283]">Earth Contact</div>
                  <div className="mt-0.5 text-base font-semibold text-[#edf0f5]">
                    {st.earthEl >= 0 ? "+" : ""}
                    {st.earthEl.toFixed(2)}°
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] font-medium ${
                      st.earthVisible ? "text-[#56B4E9]" : "text-[#d9826c]"
                    }`}
                  >
                    {st.earthVisible ? "◆ Visible" : "◇ Occulted"} (margin{" "}
                    {st.earthMargin >= 0 ? "+" : ""}
                    {st.earthMargin.toFixed(2)}°)
                  </div>
                </div>

                <div className="bg-[#0f1218] p-2.5">
                  <div className="text-[11px] text-[#687283]">
                    {st.sunVisible ? "To sunset" : "To sunrise"}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-[#edf0f5]">
                    {sunCountdown ?? "beyond loaded data range"}
                  </div>
                </div>

                <div className="bg-[#0f1218] p-2.5">
                  <div className="text-[11px] text-[#687283]">
                    {st.earthVisible ? "To Earthset" : "To Earthrise"}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-[#edf0f5]">
                    {earthCountdown ?? "beyond loaded data range"}
                  </div>
                </div>
              </div>

              <TimelineStrips
                ephemeris={ephemeris}
                horizon={horizon}
                nowMs={nowMs}
                windowStartMs={windowStartMs}
                onSelectTime={onSelectTime}
                compact
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
