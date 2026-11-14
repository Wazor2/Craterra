"use client";

import { useMemo, useState } from "react";
import { lunarSiteCatalogue, getSiteById } from "@/lib/data/site-catalogue";
import {
  analyzeSiteMission,
  formatDateTime,
  type MissionAnalysis,
} from "@/lib/science/mission";

export function ComparisonWorkbench() {
  const [comparisonType, setComparisonType] = useState<"sites" | "dates">("sites");

  // Multi-site comparison state
  const [siteAId, setSiteAId] = useState("shackleton-rim");
  const [siteBId, setSiteBId] = useState("malapert-massif");
  const [siteCId, setSiteCId] = useState("connecting-ridge");
  const [includeThirdSite, setIncludeThirdSite] = useState(true);

  // Shared date for multi-site
  const [sharedDate, setSharedDate] = useState("2026-11-14");
  const [sharedTime, setSharedTime] = useState("12:00");

  // Date comparison ("What Changed") state
  const [dateCompSiteId, setDateCompSiteId] = useState("shackleton-rim");
  const [date1, setDate1] = useState("2026-11-14");
  const [date2, setDate2] = useState("2026-11-28"); // Exactly 2 weeks later!
  const [dateTime, setDateTime] = useState("12:00");

  const currentDateShared = useMemo(() => {
    const [y, m, d] = sharedDate.split("-").map(Number);
    const [hr, min] = sharedTime.split(":").map(Number);
    return new Date(Date.UTC(y || 2026, (m || 11) - 1, d || 14, hr || 12, min || 0));
  }, [sharedDate, sharedTime]);

  const dateCompObj1 = useMemo(() => {
    const [y, m, d] = date1.split("-").map(Number);
    const [hr, min] = dateTime.split(":").map(Number);
    return new Date(Date.UTC(y || 2026, (m || 11) - 1, d || 14, hr || 12, min || 0));
  }, [date1, dateTime]);

  const dateCompObj2 = useMemo(() => {
    const [y, m, d] = date2.split("-").map(Number);
    const [hr, min] = dateTime.split(":").map(Number);
    return new Date(Date.UTC(y || 2026, (m || 11) - 1, d || 28, hr || 12, min || 0));
  }, [date2, dateTime]);

  // Analyze sites
  const siteA = useMemo(() => getSiteById(siteAId) ?? lunarSiteCatalogue[0], [siteAId]);
  const siteB = useMemo(() => getSiteById(siteBId) ?? lunarSiteCatalogue[1], [siteBId]);
  const siteC = useMemo(() => getSiteById(siteCId) ?? lunarSiteCatalogue[2], [siteCId]);

  const analysisA: MissionAnalysis = useMemo(
    () => analyzeSiteMission(siteA, currentDateShared, 29.53),
    [siteA, currentDateShared],
  );
  const analysisB: MissionAnalysis = useMemo(
    () => analyzeSiteMission(siteB, currentDateShared, 29.53),
    [siteB, currentDateShared],
  );
  const analysisC: MissionAnalysis = useMemo(
    () => analyzeSiteMission(siteC, currentDateShared, 29.53),
    [siteC, currentDateShared],
  );

  // Analyze single site across two dates
  const dateCompSite = useMemo(
    () => getSiteById(dateCompSiteId) ?? lunarSiteCatalogue[0],
    [dateCompSiteId],
  );
  const analysisDate1: MissionAnalysis = useMemo(
    () => analyzeSiteMission(dateCompSite, dateCompObj1, 29.53),
    [dateCompSite, dateCompObj1],
  );
  const analysisDate2: MissionAnalysis = useMemo(
    () => analyzeSiteMission(dateCompSite, dateCompObj2, 29.53),
    [dateCompSite, dateCompObj2],
  );

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl">
        <div className="flex gap-2">
          <button
            onClick={() => setComparisonType("sites")}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
              comparisonType === "sites"
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            Site vs Site Comparison
          </button>
          <button
            onClick={() => setComparisonType("dates")}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
              comparisonType === "dates"
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            "What Changed" Date Comparison (2-Week Slip)
          </button>
        </div>

        {comparisonType === "sites" ? (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300">
              <span className="font-semibold text-slate-400 mr-2">SHARED DATE:</span>
              <input
                type="date"
                value={sharedDate}
                onChange={(e) => setSharedDate(e.target.value)}
                className="bg-transparent text-white outline-none font-mono"
              />
            </label>
            <label className="flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300">
              <span className="font-semibold text-slate-400 mr-2">UTC:</span>
              <input
                type="time"
                value={sharedTime}
                onChange={(e) => setSharedTime(e.target.value)}
                className="bg-transparent text-white outline-none font-mono"
              />
            </label>
            <button
              onClick={() => setIncludeThirdSite(!includeThirdSite)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-medium text-slate-300 hover:bg-slate-800"
            >
              {includeThirdSite ? "Hide 3rd Site" : "+ Compare 3 Sites"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300">
              <span className="font-semibold text-slate-400 mr-2">SITE:</span>
              <select
                value={dateCompSiteId}
                onChange={(e) => setDateCompSiteId(e.target.value)}
                className="bg-transparent text-white outline-none font-mono"
              >
                {lunarSiteCatalogue.map((s) => (
                  <option key={s.site_id} value={s.site_id} className="bg-slate-900 text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Mode A: Multi-Site Side-by-Side Comparison */}
      {comparisonType === "sites" ? (
        <div className="space-y-6">
          {/* Site Selection Row */}
          <div className={`grid gap-4 ${includeThirdSite ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <div className="rounded-2xl border border-sky-500/40 bg-slate-950/80 p-4 shadow-lg">
              <label className="text-xs uppercase tracking-wider text-sky-400 font-semibold block mb-1">
                Candidate Site A
              </label>
              <select
                value={siteAId}
                onChange={(e) => setSiteAId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-sm text-white font-medium outline-none"
              >
                {lunarSiteCatalogue.map((s) => (
                  <option key={s.site_id} value={s.site_id} className="bg-slate-900">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-amber-500/40 bg-slate-950/80 p-4 shadow-lg">
              <label className="text-xs uppercase tracking-wider text-amber-400 font-semibold block mb-1">
                Candidate Site B
              </label>
              <select
                value={siteBId}
                onChange={(e) => setSiteBId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-sm text-white font-medium outline-none"
              >
                {lunarSiteCatalogue.map((s) => (
                  <option key={s.site_id} value={s.site_id} className="bg-slate-900">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {includeThirdSite && (
              <div className="rounded-2xl border border-emerald-500/40 bg-slate-950/80 p-4 shadow-lg">
                <label className="text-xs uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
                  Candidate Site C
                </label>
                <select
                  value={siteCId}
                  onChange={(e) => setSiteCId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-sm text-white font-medium outline-none"
                >
                  {lunarSiteCatalogue.map((s) => (
                    <option key={s.site_id} value={s.site_id} className="bg-slate-900">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Comparative Metrics Matrix */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Side-by-Side Science & Mission Metrics
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluated at {formatDateTime(currentDateShared)} UTC across 1 Synodic Month (29.53 days)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-slate-400">
                    <th className="p-3.5">Mission Metric</th>
                    <th className="p-3.5 text-sky-300">{siteA.name}</th>
                    <th className="p-3.5 text-amber-300">{siteB.name}</th>
                    {includeThirdSite && <th className="p-3.5 text-emerald-300">{siteC.name}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-200">
                  <tr>
                    <td className="p-3.5 font-sans font-medium text-slate-300">Current Sun Elevation</td>
                    <td className="p-3.5 text-sky-300">{analysisA.observation.sun.elevation_deg.toFixed(2)}°</td>
                    <td className="p-3.5 text-amber-300">{analysisB.observation.sun.elevation_deg.toFixed(2)}°</td>
                    {includeThirdSite && <td className="p-3.5 text-emerald-300">{analysisC.observation.sun.elevation_deg.toFixed(2)}°</td>}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-sans font-medium text-slate-300">Current Sun Status</td>
                    <td className="p-3.5">
                      <span className={analysisA.observation.sun.state.any_solar_disk_visible ? "text-emerald-400" : "text-rose-400"}>
                        {analysisA.observation.sun.state.any_solar_disk_visible ? "Visible" : "Blocked"}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={analysisB.observation.sun.state.any_solar_disk_visible ? "text-emerald-400" : "text-rose-400"}>
                        {analysisB.observation.sun.state.any_solar_disk_visible ? "Visible" : "Blocked"}
                      </span>
                    </td>
                    {includeThirdSite && (
                      <td className="p-3.5">
                        <span className={analysisC.observation.sun.state.any_solar_disk_visible ? "text-emerald-400" : "text-rose-400"}>
                          {analysisC.observation.sun.state.any_solar_disk_visible ? "Visible" : "Blocked"}
                        </span>
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-sans font-medium text-slate-300">Sunlight Availability (%)</td>
                    <td className="p-3.5 text-lg font-bold text-sky-400">{analysisA.observation.sunlightPercent}%</td>
                    <td className="p-3.5 text-lg font-bold text-amber-400">{analysisB.observation.sunlightPercent}%</td>
                    {includeThirdSite && <td className="p-3.5 text-lg font-bold text-emerald-400">{analysisC.observation.sunlightPercent}%</td>}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-sans font-medium text-slate-300">Longest Continuous Darkness</td>
                    <td className="p-3.5">{analysisA.observation.longestDarknessHours} hours</td>
                    <td className="p-3.5">{analysisB.observation.longestDarknessHours} hours</td>
                    {includeThirdSite && <td className="p-3.5">{analysisC.observation.longestDarknessHours} hours</td>}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-sans font-medium text-slate-300">Earth Elevation & LOS</td>
                    <td className="p-3.5">{analysisA.observation.earth.elevation_deg.toFixed(2)}° ({analysisA.observation.earth.state.terrain_visible ? "LOS Open" : "Blocked"})</td>
                    <td className="p-3.5">{analysisB.observation.earth.elevation_deg.toFixed(2)}° ({analysisB.observation.earth.state.terrain_visible ? "LOS Open" : "Blocked"})</td>
                    {includeThirdSite && <td className="p-3.5">{analysisC.observation.earth.elevation_deg.toFixed(2)}° ({analysisC.observation.earth.state.terrain_visible ? "LOS Open" : "Blocked"})</td>}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-sans font-medium text-slate-300">Period Earth Visibility (%)</td>
                    <td className="p-3.5 text-lg font-bold text-sky-400">{analysisA.observation.earthVisiblePercent}%</td>
                    <td className="p-3.5 text-lg font-bold text-amber-400">{analysisB.observation.earthVisiblePercent}%</td>
                    {includeThirdSite && <td className="p-3.5 text-lg font-bold text-emerald-400">{analysisC.observation.earthVisiblePercent}%</td>}
                  </tr>
                  <tr>
                    <td className="p-3.5 font-sans font-medium text-slate-300">Terrain Relief & Elevation</td>
                    <td className="p-3.5">+{siteA.elevation_m} m</td>
                    <td className="p-3.5">+{siteB.elevation_m} m</td>
                    {includeThirdSite && <td className="p-3.5">+{siteC.elevation_m} m</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-Side Synchronized Timelines */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Synchronized 29.5-Day Sunlight Profiles
            </h4>
            <div className="space-y-3">
              {[
                { site: siteA, analysis: analysisA, color: "bg-sky-400", border: "border-sky-500/40" },
                { site: siteB, analysis: analysisB, color: "bg-amber-400", border: "border-amber-500/40" },
                ...(includeThirdSite ? [{ site: siteC, analysis: analysisC, color: "bg-emerald-400", border: "border-emerald-500/40" }] : []),
              ].map(({ site, analysis, color, border }) => (
                <div key={site.site_id} className={`rounded-xl border ${border} bg-slate-950 p-3`}>
                  <div className="mb-1.5 flex justify-between text-xs font-medium">
                    <span className="text-white font-semibold">{site.name}</span>
                    <span className="font-mono text-slate-400">{analysis.observation.sunlightPercent}% Sun • {analysis.observation.longestDarknessHours}h Max Dark</span>
                  </div>
                  <div className="relative h-6 w-full overflow-hidden rounded bg-slate-900 border border-slate-800">
                    {analysis.timeline.map((point, index) => {
                      const widthPercent = (1 / analysis.timeline.length) * 100;
                      const leftPercent = (index / analysis.timeline.length) * 100;
                      return (
                        <div
                          key={index}
                          style={{ left: `${leftPercent}%`, width: `${widthPercent + 0.1}%` }}
                          className={`absolute top-0 bottom-0 ${point.sunVisible ? color : "bg-slate-950"}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Mode B: "What Changed" Date Comparison (Prompt 7.7 & Hackathon Scenario 17) */
        <div className="space-y-6">
          <div className="rounded-2xl border border-violet-500/30 bg-slate-950/90 p-5 shadow-xl">
            <div className="mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">
                Scenario Analysis: Mission Date Slip (+14 Days)
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                {dateCompSite.name} — Temporal Delta Analysis
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Compare lighting and Earth line-of-sight when a launch date slips by 2 weeks (half a lunar synodic cycle).
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-sky-500/30 bg-slate-900/60 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono uppercase text-sky-400 font-semibold">T0: Scheduled Date</span>
                  <input
                    type="date"
                    value={date1}
                    onChange={(e) => setDate1(e.target.value)}
                    className="rounded bg-slate-800 px-2 py-1 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between"><span className="text-slate-400">Sun Elevation:</span><span className="text-white font-bold">{analysisDate1.observation.sun.elevation_deg.toFixed(2)}°</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Sun Status:</span><span className={analysisDate1.observation.sun.state.any_solar_disk_visible ? "text-emerald-400" : "text-rose-400"}>{analysisDate1.observation.sun.state.any_solar_disk_visible ? "ILLUMINATED" : "OCCULTED"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Earth Elevation:</span><span className="text-white">{analysisDate1.observation.earth.elevation_deg.toFixed(2)}°</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Earth LOS:</span><span className={analysisDate1.observation.earth.state.terrain_visible ? "text-sky-400" : "text-rose-400"}>{analysisDate1.observation.earth.state.terrain_visible ? "OPEN" : "BLOCKED"}</span></div>
                  <div className="flex justify-between border-t border-slate-800 pt-1"><span className="text-slate-400">Period Sunlight:</span><span className="text-emerald-400 font-bold">{analysisDate1.observation.sunlightPercent}%</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-slate-900/60 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono uppercase text-amber-400 font-semibold">T+14: Delayed Date</span>
                  <input
                    type="date"
                    value={date2}
                    onChange={(e) => setDate2(e.target.value)}
                    className="rounded bg-slate-800 px-2 py-1 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between"><span className="text-slate-400">Sun Elevation:</span><span className="text-white font-bold">{analysisDate2.observation.sun.elevation_deg.toFixed(2)}°</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Sun Status:</span><span className={analysisDate2.observation.sun.state.any_solar_disk_visible ? "text-emerald-400" : "text-rose-400"}>{analysisDate2.observation.sun.state.any_solar_disk_visible ? "ILLUMINATED" : "OCCULTED"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Earth Elevation:</span><span className="text-white">{analysisDate2.observation.earth.elevation_deg.toFixed(2)}°</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Earth LOS:</span><span className={analysisDate2.observation.earth.state.terrain_visible ? "text-sky-400" : "text-rose-400"}>{analysisDate2.observation.earth.state.terrain_visible ? "OPEN" : "BLOCKED"}</span></div>
                  <div className="flex justify-between border-t border-slate-800 pt-1"><span className="text-slate-400">Period Sunlight:</span><span className="text-amber-400 font-bold">{analysisDate2.observation.sunlightPercent}%</span></div>
                </div>
              </div>
            </div>

            {/* Delta Summary Card */}
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                Δ Key Variances & Engineering Impact
              </span>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Sun Elevation Shift</span>
                  <span className="text-sm font-bold text-white">
                    {(analysisDate2.observation.sun.elevation_deg - analysisDate1.observation.sun.elevation_deg).toFixed(2)}°
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Earth Libration Shift</span>
                  <span className="text-sm font-bold text-white">
                    {(analysisDate2.observation.earth.elevation_deg - analysisDate1.observation.earth.elevation_deg).toFixed(2)}°
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Illumination State Change</span>
                  <span className={`text-sm font-bold ${analysisDate1.observation.sun.state.any_solar_disk_visible !== analysisDate2.observation.sun.state.any_solar_disk_visible ? "text-amber-400" : "text-slate-300"}`}>
                    {analysisDate1.observation.sun.state.any_solar_disk_visible !== analysisDate2.observation.sun.state.any_solar_disk_visible
                      ? "Phase Transition Detected"
                      : "Same Illumination Phase"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
