"use client";

import { useMemo, useState, useEffect } from "react";
import { lunarSiteCatalogue, getSiteById, getTerrainProfile } from "@/lib/data/site-catalogue";
import {
  analyzeSiteMission,
  evaluateAtTime,
  formatDateTime,
  type MissionAnalysis,
} from "@/lib/science/mission";

export function MissionPlanner({
  initialSiteId = "shackleton-rim",
  compareMode = false,
  sharedDate,
  sharedTime,
  onDateChange,
  onTimeChange,
}: {
  initialSiteId?: string;
  compareMode?: boolean;
  sharedDate?: string;
  sharedTime?: string;
  onDateChange?: (date: string) => void;
  onTimeChange?: (time: string) => void;
}) {
  const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId);
  const [localDate, setLocalDate] = useState("2026-11-14");
  const [localTime, setLocalTime] = useState("12:00");
  const [skyViewMode, setSkyViewMode] = useState<"polar" | "panorama">("polar");
  const [timelineDuration, setTimelineDuration] = useState<number>(29.53);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expertMode, setExpertMode] = useState(false);

  const selectedDate = sharedDate ?? localDate;
  const selectedTime = sharedTime ?? localTime;

  const handleDateChange = (newDate: string) => {
    if (onDateChange) onDateChange(newDate);
    else setLocalDate(newDate);
  };

  const handleTimeChange = (newTime: string) => {
    if (onTimeChange) onTimeChange(newTime);
    else setLocalTime(newTime);
  };

  const selectedSite = useMemo(
    () => getSiteById(selectedSiteId) ?? lunarSiteCatalogue[0],
    [selectedSiteId],
  );

  const currentDate = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    return new Date(Date.UTC(year || 2026, (month || 11) - 1, day || 14, hours || 12, minutes || 0));
  }, [selectedDate, selectedTime]);

  // Compute full mission analysis (ephemeris, terrain intersection, timeline, metrics)
  const analysis: MissionAnalysis = useMemo(
    () => analyzeSiteMission(selectedSite, currentDate, timelineDuration),
    [selectedSite, currentDate, timelineDuration],
  );

  const observation = analysis.observation;
  const terrainProfile = useMemo(() => getTerrainProfile(selectedSite.site_id), [selectedSite.site_id]);

  // Playback timer (advances 6 hours per second)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const nextDate = new Date(currentDate.getTime() + 6 * 3600 * 1000);
      const iso = nextDate.toISOString();
      const d = iso.slice(0, 10);
      const t = iso.slice(11, 16);
      handleDateChange(d);
      handleTimeChange(t);
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying, currentDate]);

  // Polar Sky View Projection:
  // Center (150, 150) = Zenith (+90° elevation, r = 0)
  // Horizon ring (0° elevation) = radius 110 px
  // Radial distance: r(elevation) = 110 * (90 - elevation) / 90
  const centerRadius = 110;
  const sunElev = observation.sun.elevation_deg;
  const sunRadDist = Math.max(0, Math.min(145, centerRadius * (90 - sunElev) / 90));
  const sunAzRad = ((observation.sun.azimuth_deg - 90) * Math.PI) / 180;
  const sunMarker = {
    x: 150 + sunRadDist * Math.cos(sunAzRad),
    y: 150 + sunRadDist * Math.sin(sunAzRad),
  };

  const earthElev = observation.earth.elevation_deg;
  const earthRadDist = Math.max(0, Math.min(145, centerRadius * (90 - earthElev) / 90));
  const earthAzRad = ((observation.earth.azimuth_deg - 90) * Math.PI) / 180;
  const earthMarker = {
    x: 150 + earthRadDist * Math.cos(earthAzRad),
    y: 150 + earthRadDist * Math.sin(earthAzRad),
  };

  // Terrain horizon polygon in polar view
  const polarTerrainPolygon = useMemo(() => {
    const pts = terrainProfile.horizon_elevation_deg.map((h, az) => {
      const azRad = ((az - 90) * Math.PI) / 180;
      const r = Math.max(0, Math.min(145, centerRadius * (90 - h) / 90));
      return `${(150 + r * Math.cos(azRad)).toFixed(1)},${(150 + r * Math.sin(azRad)).toFixed(1)}`;
    });
    return pts.join(" ");
  }, [terrainProfile]);

  // Jump to next transition events
  const jumpToSunrise = () => {
    if (analysis.nextSunriseUtc) {
      const d = analysis.nextSunriseUtc.slice(0, 10);
      const t = analysis.nextSunriseUtc.slice(11, 16);
      handleDateChange(d);
      handleTimeChange(t);
    }
  };

  const jumpToSunset = () => {
    if (analysis.nextSunsetUtc) {
      const d = analysis.nextSunsetUtc.slice(0, 10);
      const t = analysis.nextSunsetUtc.slice(11, 16);
      handleDateChange(d);
      handleTimeChange(t);
    }
  };

  // Cards for mission metrics
  const meterCards = [
    {
      label: "Sun Elevation",
      value: `${observation.sun.elevation_deg >= 0 ? "+" : ""}${observation.sun.elevation_deg.toFixed(2)}°`,
      subvalue: `Azimuth ${observation.sun.azimuth_deg.toFixed(1)}°`,
      status: observation.sun.state.any_solar_disk_visible
        ? observation.sun.state.full_solar_disk_visible
          ? "Full Disk Visible"
          : "Partial Disk Visible"
        : "Terrain Blocked",
      color: observation.sun.state.any_solar_disk_visible ? "text-amber-400" : "text-slate-400",
      accent: "border-amber-500/30",
    },
    {
      label: "Earth Line-of-Sight",
      value: `${observation.earth.elevation_deg >= 0 ? "+" : ""}${observation.earth.elevation_deg.toFixed(2)}°`,
      subvalue: `Azimuth ${observation.earth.azimuth_deg.toFixed(1)}°`,
      status: observation.earth.state.terrain_visible ? "Line-of-Sight Open" : "Obstructed by Rim",
      color: observation.earth.state.terrain_visible ? "text-sky-400" : "text-rose-400",
      accent: "border-sky-500/30",
    },
    {
      label: "Period Sunlight",
      value: `${observation.sunlightPercent}%`,
      subvalue: `Longest Dark: ${observation.longestDarknessHours}h`,
      status: `${analysis.sunMetrics.visible_window_count} Illumination Windows`,
      color: "text-emerald-400",
      accent: "border-emerald-500/30",
    },
    {
      label: "Period Earth Visibility",
      value: `${observation.earthVisiblePercent}%`,
      subvalue: "Geometric LOS Availability",
      status: `${analysis.earthMetrics.visible_window_count} Comm Visibility Windows`,
      color: "text-indigo-400",
      accent: "border-indigo-500/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Mission Control Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-400">
                Mission Configuration & Telemetry
              </p>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white md:text-2xl">
              Target Site & Epoch Controls
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Site Picker */}
            <label className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300">
              <span className="font-semibold text-slate-400 mr-2">SITE:</span>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="bg-transparent font-medium text-white outline-none cursor-pointer"
              >
                {lunarSiteCatalogue.map((site) => (
                  <option key={site.site_id} value={site.site_id} className="bg-slate-900 text-white">
                    {site.name} ({site.latitude_deg.toFixed(1)}°, {site.longitude_east_deg.toFixed(1)}°E)
                  </option>
                ))}
              </select>
            </label>

            {/* Date Picker */}
            <label className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300">
              <span className="font-semibold text-slate-400 mr-2">DATE:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-transparent text-white outline-none font-mono"
              />
            </label>

            {/* Time Picker */}
            <label className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300">
              <span className="font-semibold text-slate-400 mr-2">UTC:</span>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="bg-transparent text-white outline-none font-mono"
              />
            </label>

            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                isPlaying
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                  : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {isPlaying ? "❚❚ Pause" : "▶ Play (6h/s)"}
            </button>

            {/* Expert Mode Toggle */}
            <button
              onClick={() => setExpertMode(!expertMode)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                expertMode
                  ? "border-sky-500/50 bg-sky-500/20 text-sky-300"
                  : "border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              {expertMode ? "Expert Mode: ON" : "Simple Mode"}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {meterCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border bg-slate-900/70 p-4 shadow-lg backdrop-blur ${card.accent}`}
          >
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-400">
              <span>{card.label}</span>
              <span className="font-mono text-[11px] text-slate-500">{card.subvalue}</span>
            </div>
            <div className={`mt-2 text-3xl font-bold font-mono tracking-tight ${card.color}`}>
              {card.value}
            </div>
            <div className="mt-2 text-xs font-medium text-slate-300">
              {card.status}
            </div>
          </div>
        ))}
      </div>

      {/* Sky View & Local Terrain Horizon Analysis */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">
                Interactive Sky View & Local Horizon
              </p>
              <h2 className="text-lg font-semibold text-white">
                {selectedSite.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1 text-xs">
                <button
                  onClick={() => setSkyViewMode("polar")}
                  className={`rounded px-2.5 py-1 font-medium transition ${
                    skyViewMode === "polar"
                      ? "bg-sky-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Polar Radar
                </button>
                <button
                  onClick={() => setSkyViewMode("panorama")}
                  className={`rounded px-2.5 py-1 font-medium transition ${
                    skyViewMode === "panorama"
                      ? "bg-sky-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  2D Panorama
                </button>
              </div>

              <span className="font-mono rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-sky-300">
                {formatDateTime(currentDate)} UTC
              </span>
            </div>
          </div>

          {skyViewMode === "polar" ? (
            /* Polar Radar Sky Plot */
            <div className="relative flex flex-col items-center">
              <svg viewBox="0 0 300 300" className="w-full max-w-[440px] select-none">
                <defs>
                  <radialGradient id="sky-polar-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="70%" stopColor="#020617" />
                    <stop offset="100%" stopColor="#000000" />
                  </radialGradient>
                </defs>

                {/* Sky Disc & Elevation Grids */}
                <circle cx="150" cy="150" r="145" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="150" cy="150" r="110" fill="url(#sky-polar-grad)" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="150" cy="150" r="73" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 4" />
                <circle cx="150" cy="150" r="37" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 4" />

                {/* Cardinal Axes */}
                <line x1="150" y1="5" x2="150" y2="295" stroke="#334155" strokeWidth="1" />
                <line x1="5" y1="150" x2="295" y2="150" stroke="#334155" strokeWidth="1" />

                {/* Terrain Silhouette Ring */}
                <polygon
                  points={polarTerrainPolygon}
                  fill="rgba(71, 85, 105, 0.25)"
                  stroke="rgba(148, 163, 184, 0.85)"
                  strokeWidth="1.5"
                />

                {/* Sun Marker */}
                <g transform={`translate(${sunMarker.x}, ${sunMarker.y})`}>
                  <circle r="7" fill="#f59e0b" className="animate-pulse" />
                  <circle r="12" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.6" />
                  <text x="12" y="4" fill="#fbbf24" fontSize="11" fontWeight="bold">
                    Sun ({sunElev >= 0 ? "+" : ""}{sunElev.toFixed(1)}°)
                  </text>
                </g>

                {/* Earth Marker */}
                <g transform={`translate(${earthMarker.x}, ${earthMarker.y})`}>
                  <circle r="6" fill="#38bdf8" />
                  <circle r="10" fill="none" stroke="#7dd3fc" strokeWidth="1" opacity="0.5" />
                  <text x="12" y="4" fill="#7dd3fc" fontSize="11" fontWeight="bold">
                    Earth ({earthElev >= 0 ? "+" : ""}{earthElev.toFixed(1)}°)
                  </text>
                </g>

                {/* Compass Labels */}
                <text x="150" y="22" fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">0° N</text>
                <text x="282" y="154" fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">90° E</text>
                <text x="150" y="290" fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">180° S</text>
                <text x="18" y="154" fill="#e2e8f0" fontSize="12" fontWeight="bold" textAnchor="middle">270° W</text>

                {/* Elevation Ring Labels */}
                <text x="153" y="148" fill="#64748b" fontSize="8">Zenith 90°</text>
                <text x="153" y="113" fill="#64748b" fontSize="8">+30°</text>
                <text x="153" y="77" fill="#64748b" fontSize="8">+60°</text>
                <text x="153" y="42" fill="#38bdf8" fontSize="8" fontWeight="bold">0° Horizon</text>
              </svg>
              <p className="mt-2 text-center text-xs text-slate-400">
                Shaded ring = LOLA local terrain horizon. Blue circle = 0° local horizontal. Center = Zenith (+90°).
              </p>
            </div>
          ) : (
            /* 2D Panoramic Horizon Elevation View (Prompt 7.3) */
            <div className="space-y-2">
              <svg viewBox="0 0 720 240" className="w-full rounded-xl bg-slate-900/90 border border-slate-800">
                <defs>
                  <linearGradient id="terrain-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#475569" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* Elevation Grid Lines (-10° to +30°) */}
                {[-10, 0, 10, 20, 30].map((deg) => {
                  // Map [-10, 30] to [220, 20]
                  const y = 220 - ((deg + 10) / 40) * 200;
                  return (
                    <g key={deg}>
                      <line x1="40" y1={y} x2="700" y2={y} stroke={deg === 0 ? "#38bdf8" : "#334155"} strokeWidth={deg === 0 ? "1.5" : "0.75"} />
                      <text x="32" y={y + 4} fill={deg === 0 ? "#38bdf8" : "#64748b"} fontSize="10" textAnchor="end">
                        {deg >= 0 ? `+${deg}°` : `${deg}°`}
                      </text>
                    </g>
                  );
                })}

                {/* Azimuth Grid Lines (0°, 90°, 180°, 270°, 360°) */}
                {[0, 90, 180, 270, 360].map((az) => {
                  const x = 40 + (az / 360) * 660;
                  const label = az === 0 ? "0° N" : az === 90 ? "90° E" : az === 180 ? "180° S" : az === 270 ? "270° W" : "360° N";
                  return (
                    <g key={az}>
                      <line x1={x} y1="20" x2={x} y2="220" stroke="#334155" strokeWidth="0.75" />
                      <text x={x} y="235" fill="#94a3b8" fontSize="10" textAnchor="middle">{label}</text>
                    </g>
                  );
                })}

                {/* Filled Terrain Profile */}
                {(() => {
                  const pts = terrainProfile.horizon_elevation_deg.map((h, az) => {
                    const x = 40 + (az / 360) * 660;
                    const y = 220 - ((h + 10) / 40) * 200;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  });
                  const polyPoints = `40,220 ${pts.join(" ")} 700,220`;
                  return (
                    <polygon points={polyPoints} fill="url(#terrain-fill)" stroke="#94a3b8" strokeWidth="1.5" />
                  );
                })()}

                {/* Sun Position */}
                {(() => {
                  const sunX = 40 + (observation.sun.azimuth_deg / 360) * 660;
                  const sunY = 220 - ((sunElev + 10) / 40) * 200;
                  return (
                    <g transform={`translate(${sunX}, ${sunY})`}>
                      <circle r="8" fill="#f59e0b" className="animate-pulse" />
                      <circle r="14" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6" />
                      <text x="12" y="-4" fill="#fbbf24" fontSize="11" fontWeight="bold">
                        Sun ({sunElev.toFixed(1)}°)
                      </text>
                    </g>
                  );
                })()}

                {/* Earth Position */}
                {(() => {
                  const earthX = 40 + (observation.earth.azimuth_deg / 360) * 660;
                  const earthY = 220 - ((earthElev + 10) / 40) * 200;
                  return (
                    <g transform={`translate(${earthX}, ${earthY})`}>
                      <circle r="7" fill="#38bdf8" />
                      <circle r="12" fill="none" stroke="#7dd3fc" strokeWidth="1.5" opacity="0.6" />
                      <text x="12" y="-4" fill="#7dd3fc" fontSize="11" fontWeight="bold">
                        Earth ({earthElev.toFixed(1)}°)
                      </text>
                    </g>
                  );
                })()}
              </svg>
              <p className="text-center text-xs text-slate-400">
                X-axis: Local compass azimuth (0°–360°). Y-axis: Elevation above local horizontal (-10° to +30°).
              </p>
            </div>
          )}

          {/* Jump to Events bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
            <div className="flex gap-2">
              <button
                onClick={jumpToSunrise}
                disabled={!analysis.nextSunriseUtc}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-40"
              >
                Jump to Next Sunrise ↗
              </button>
              <button
                onClick={jumpToSunset}
                disabled={!analysis.nextSunsetUtc}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                Jump to Next Sunset ↘
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Next Sunset: {analysis.nextSunsetUtc ? analysis.nextSunsetUtc.slice(0, 16).replace("T", " ") : "None in range"}
            </div>
          </div>
        </div>

        {/* Site Details & Coordinate Provenance Card */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">
              Candidate Site Profile
            </p>
            <h3 className="mt-1 text-xl font-bold text-white">{selectedSite.name}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {selectedSite.description}
            </p>

            <div className="mt-4 space-y-2 border-t border-slate-800 pt-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Latitude</span>
                <span className="font-mono text-white">{selectedSite.latitude_deg.toFixed(4)}° {selectedSite.latitude_deg < 0 ? "S" : "N"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Longitude (East)</span>
                <span className="font-mono text-white">{selectedSite.longitude_east_deg.toFixed(4)}° E</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Elevation</span>
                <span className="font-mono text-white">+{selectedSite.elevation_m} m</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Category</span>
                <span className="font-mono text-sky-300 uppercase">{selectedSite.category.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Coord Status</span>
                <span className="font-mono text-amber-300">{selectedSite.provenance.coordinate_status}</span>
              </div>
            </div>
          </div>

          {/* Visibility Status Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">
              Real-Time Line-of-Sight State
            </p>
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2">
                <span className="text-slate-300">Direct Solar Illumination:</span>
                <span className={`font-semibold ${observation.sun.state.any_solar_disk_visible ? "text-emerald-400" : "text-rose-400"}`}>
                  {observation.sun.state.any_solar_disk_visible ? "✓ ILLUMINATED" : "✕ OCCULTED BY RIM"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2">
                <span className="text-slate-300">Direct-to-Earth Line of Sight:</span>
                <span className={`font-semibold ${observation.earth.state.terrain_visible ? "text-sky-400" : "text-rose-400"}`}>
                  {observation.earth.state.terrain_visible ? "✓ VISIBLE (Geometric)" : "✕ BLOCKED BY TERRAIN"}
                </span>
              </div>
              <div className="flex items-center justify-between p-1 text-slate-400">
                <span>Terrain Obstruction at Sun Azimuth:</span>
                <span className="font-mono text-white">+{observation.horizon_at_sun_deg.toFixed(1)}°</span>
              </div>
              <div className="flex items-center justify-between p-1 text-slate-400">
                <span>Terrain Obstruction at Earth Azimuth:</span>
                <span className="font-mono text-white">+{observation.horizon_at_earth_deg.toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {/* AI-Generated Scientific Briefing (Prompt Section 8.3) */}
          <div className="rounded-2xl border border-violet-500/30 bg-slate-950/80 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-violet-400 font-semibold">
                AI Scientific Briefing (Grounded Telemetry)
              </p>
            </div>
            <p className="text-xs leading-relaxed text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              {(() => {
                const sunPct = observation.sunlightPercent;
                const earthPct = observation.earthVisiblePercent;
                const darkHrs = observation.longestDarknessHours;
                const siteName = selectedSite.name;
                const isSunVisible = observation.sun.state.any_solar_disk_visible;
                const isEarthVisible = observation.earth.state.terrain_visible;

                let brief = `${siteName} demonstrates ${sunPct}% sunlight availability across the 29.5-day synodic cycle. `;
                if (darkHrs > 80) {
                  brief += `Maximum continuous darkness duration reaches ${darkHrs} hours, presenting a primary battery reserve constraint. `;
                } else {
                  brief += `Continuous shadow intervals remain manageable (longest darkness: ${darkHrs} hours). `;
                }
                brief += `Direct-to-Earth geometric line-of-sight is open for ${earthPct}% of the period. `;
                brief += `At the selected epoch (${formatDateTime(currentDate)} UTC), the Sun is ${isSunVisible ? "illuminating the site" : "terrain-occulted"} and Earth is ${isEarthVisible ? "in geometric line-of-sight." : "blocked by the local rim."}`;
                return brief;
              })()}
            </p>
            <div className="mt-2 text-[10px] text-slate-500 font-mono">
              Grounding: Derived strictly from deterministic SPICE vectors & LOLA DEM clearance.
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Lunar Timeline Strip (Section 7.5) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">
                Synodic Month Illumination & Communication Timeline
              </p>
              <span className="rounded bg-sky-950 px-2 py-0.5 font-mono text-[10px] text-sky-300 border border-sky-800">
                1 Lunar Synodic Day = 29.53 Earth Days (~708.7h)
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Continuous Visibility Windows
            </h3>
          </div>

          {/* Timeline Range Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Duration:</span>
            {[
              { label: "1 Lunar Day (29.5d)", days: 29.53 },
              { label: "14 Days", days: 14.0 },
              { label: "7 Days", days: 7.0 },
              { label: "24 Hours", days: 1.0 },
            ].map((option) => (
              <button
                key={option.days}
                onClick={() => setTimelineDuration(option.days)}
                className={`rounded-lg border px-2.5 py-1 transition ${
                  timelineDuration === option.days
                    ? "border-sky-500 bg-sky-500/20 text-white font-semibold"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline SVG Strips */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-4">
          {/* Sunlight Visibility Strip */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                SUNLIGHT VISIBILITY WINDOWS
              </span>
              <span className="text-slate-400">
                {observation.sunlightPercent}% Illuminated ({analysis.sunMetrics.visible_window_count} Windows)
              </span>
            </div>
            <div className="relative h-7 w-full overflow-hidden rounded-lg bg-slate-950 border border-slate-800">
              {analysis.timeline.map((point, index) => {
                const widthPercent = (1 / analysis.timeline.length) * 100;
                const leftPercent = (index / analysis.timeline.length) * 100;
                return (
                  <div
                    key={`sun-${index}`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent + 0.1}%`,
                    }}
                    className={`absolute top-0 bottom-0 ${
                      point.sunVisible
                        ? point.sunFullDisk
                          ? "bg-amber-400"
                          : "bg-amber-600"
                        : "bg-slate-900"
                    }`}
                    title={`${point.timestamp.slice(0, 16)}: Sun ${point.sunVisible ? "Visible" : "Blocked"}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Earth Direct Line-of-Sight Strip */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-mono">
              <span className="text-sky-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                DIRECT EARTH LINE-OF-SIGHT (GEOMETRIC)
              </span>
              <span className="text-slate-400">
                {observation.earthVisiblePercent}% Available ({analysis.earthMetrics.visible_window_count} Windows)
              </span>
            </div>
            <div className="relative h-7 w-full overflow-hidden rounded-lg bg-slate-950 border border-slate-800">
              {analysis.timeline.map((point, index) => {
                const widthPercent = (1 / analysis.timeline.length) * 100;
                const leftPercent = (index / analysis.timeline.length) * 100;
                return (
                  <div
                    key={`earth-${index}`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent + 0.1}%`,
                    }}
                    className={`absolute top-0 bottom-0 ${
                      point.earthVisible ? "bg-sky-400" : "bg-slate-900"
                    }`}
                    title={`${point.timestamp.slice(0, 16)}: Earth ${point.earthVisible ? "Visible" : "Blocked"}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Timeline Date Bounds */}
          <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span>START: {analysis.timeline[0]?.timestamp.slice(0, 16).replace("T", " ")} UTC</span>
            <span className="text-sky-300 font-bold">CURRENT: {formatDateTime(currentDate)} UTC</span>
            <span>END: {analysis.timeline[analysis.timeline.length - 1]?.timestamp.slice(0, 16).replace("T", " ")} UTC</span>
          </div>
        </div>
      </div>

      {/* Expert Mode Inspection Panel (Section 8.4) */}
      {expertMode && (
        <div className="rounded-2xl border border-sky-900/60 bg-slate-950/90 p-5 shadow-xl text-xs space-y-4">
          <div className="flex items-center gap-2 text-sky-400 font-mono font-bold uppercase tracking-wider">
            <span>⚙ Expert Scientific Telemetry & Assumptions</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <span className="font-semibold text-slate-300 block mb-2">Astrometric Conventions</span>
              <ul className="space-y-1 text-slate-400 font-mono text-[11px]">
                <li>• Reference Frame: MOON_ME (Mean Earth/Polar Axis)</li>
                <li>• Radial Datum: NAIF BODY301 (1,737.4 km)</li>
                <li>• Coordinate Type: Planetocentric</li>
                <li>• Azimuth: 0° N, 90° E, 180° S, 270° W</li>
                <li>• Topocentric Parallax: Site vector subtracted</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <span className="font-semibold text-slate-300 block mb-2">Terrain Model (LOLA)</span>
              <ul className="space-y-1 text-slate-400 font-mono text-[11px]">
                <li>• Resolution: 5 m/pixel Polar Stereographic</li>
                <li>• Azimuth Resolution: 1° (360 samples)</li>
                <li>• Ray Extent: 35,000 m</li>
                <li>• Curvature: Δh = d² / (2 · R_moon)</li>
                <li>• Circular Interpolation: Seam-preserving</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <span className="font-semibold text-slate-300 block mb-2">Scientific Assumptions</span>
              <ul className="space-y-1 text-slate-400 font-mono text-[11px]">
                <li>• Sun Angular Diameter: 0.533° (±0.266° disk)</li>
                <li>• Refraction: None (Lunar vacuum)</li>
                <li>• Earth Comm: Geometric LOS only, no link budget</li>
                <li>• Mast Height: 0 m ground level</li>
                <li>• Transition Refinement: Linear clearance zero-crossing</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
