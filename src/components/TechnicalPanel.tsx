import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { BodyState } from "../lib/events";
import { endEpoch } from "../lib/geometry";
import { getNasaTerrainProfile } from "../lib/nasaTerrainProfiles";
import type { Ephemeris, LoadedHorizon, Site, Summaries } from "../lib/types";
import { formatLatLon, siteTypeLabel } from "./SiteCard";

interface TechnicalPanelProps {
  site?: Site;
  summary?: Summaries[string];
  ephemeris: Ephemeris;
  horizon: LoadedHorizon;
  state: BodyState;
  nowMs: number;
}

export function TechnicalPanel({
  site,
  summary,
  ephemeris,
  horizon,
  state,
  nowMs,
}: TechnicalPanelProps) {
  const [expertMode, setExpertMode] = useState(true);
  const nasaTerrain = getNasaTerrainProfile(site?.id ?? horizon.site_id);

  const minHorizon = Math.min(...horizon.elev_deg);
  const maxHorizon = Math.max(...horizon.elev_deg);
  const avgHorizon =
    horizon.elev_deg.reduce((acc, v) => acc + v, 0) /
    Math.max(1, horizon.elev_deg.length);

  const startIso = new Date(Date.parse(ephemeris.start_utc))
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
  const endIso = new Date(endEpoch(ephemeris))
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
  const currentIso = new Date(nowMs)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");

  return (
    <section
      aria-label="Technical telemetry and site specifications"
      className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-5 space-y-5"
    >
      {/* Header + Summary Mode Toggle */}
      <div className="flex flex-col gap-3 border-b border-[#1f2530] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#edf0f5]">
            Technical Specifications &amp; Telemetry
          </h2>
          <p className="mt-0.5 text-xs text-[#9aa3b2]">
            All physical geometry, terrain DEM metadata, and 90-day summary metrics in one place.
          </p>
        </div>

        {summary && (
          <div
            role="group"
            aria-label="Summary detail level"
            className="inline-flex self-start rounded-[4px] border border-[#1f2530] bg-[#090b10] p-0.5 text-xs"
          >
            <button
              type="button"
              onClick={() => setExpertMode(false)}
              className={`rounded-[3px] px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                !expertMode
                  ? "bg-[#1c212c] text-[#edf0f5]"
                  : "text-[#687283] hover:text-[#edf0f5]"
              }`}
            >
              Plain Summary
            </button>
            <button
              type="button"
              onClick={() => setExpertMode(true)}
              className={`rounded-[3px] px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                expertMode
                  ? "bg-[#1c212c] text-[#edf0f5]"
                  : "text-[#687283] hover:text-[#edf0f5]"
              }`}
            >
              Expert Telemetry
            </button>
          </div>
        )}
      </div>

      {/* Site narrative & NASA reference */}
      {site && (
        <div className="rounded-[4px] border border-[#1f2530] bg-[#151922]/70 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-[#9aa3b2]">
              <span className="font-medium text-[#56B4E9]">
                {siteTypeLabel(site.type)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {formatLatLon(site.lat, site.lon)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#687283]">{site.id}</span>
            </div>
            <a
              href={site.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#56B4E9] hover:text-sky-300 hover:underline"
            >
              <span>NASA / PDS Site Source</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
          <p className="text-sm text-[#edf0f5] leading-relaxed">
            {site.description}
          </p>
          {summary && (
            <p className="border-t border-[#1f2530] pt-2.5 text-xs text-[#9aa3b2] leading-relaxed">
              {expertMode ? summary.expert_text : summary.plain_text}
            </p>
          )}
        </div>
      )}

      {/* 3-Column Technical Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Instantaneous Celestial Vectors */}
        <div className="rounded-[4px] border border-[#1f2530] bg-[#0b0e14] p-4 space-y-2.5">
          <h3 className="text-xs font-medium text-[#9aa3b2]">
            Instantaneous Geometry ({currentIso} UTC)
          </h3>
          <dl className="space-y-1.5 font-mono text-xs tabular-nums">
            <div className="flex justify-between">
              <dt className="text-[#687283]">Sun azimuth</dt>
              <dd className="text-[#eab354]">{state.sunAz.toFixed(2)}°</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#687283]">Sun elevation</dt>
              <dd className="text-[#edf0f5]">
                {state.sunEl >= 0 ? "+" : ""}
                {state.sunEl.toFixed(2)}°
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#687283]">Terrain @ Sun Az</dt>
              <dd className="text-[#9aa3b2]">{state.sunTerrainEl.toFixed(2)}°</dd>
            </div>
            <div className="flex justify-between border-b border-[#1f2530] pb-1.5">
              <dt className="text-[#687283]">Sun margin</dt>
              <dd className={state.sunVisible ? "text-[#eab354]" : "text-[#d9826c]"}>
                {state.sunMargin >= 0 ? "+" : ""}
                {state.sunMargin.toFixed(2)}°
              </dd>
            </div>
            <div className="flex justify-between pt-0.5">
              <dt className="text-[#687283]">Earth azimuth</dt>
              <dd className="text-[#56B4E9]">{state.earthAz.toFixed(2)}°</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#687283]">Earth elevation</dt>
              <dd className="text-[#edf0f5]">
                {state.earthEl >= 0 ? "+" : ""}
                {state.earthEl.toFixed(2)}°
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#687283]">Terrain @ Earth Az</dt>
              <dd className="text-[#9aa3b2]">
                {state.earthTerrainEl.toFixed(2)}°
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#687283]">Earth margin</dt>
              <dd className={state.earthVisible ? "text-[#56B4E9]" : "text-[#d9826c]"}>
                {state.earthMargin >= 0 ? "+" : ""}
                {state.earthMargin.toFixed(2)}°
              </dd>
            </div>
          </dl>
        </div>

        {/* 90-Day Aggregate Statistics */}
        <div className="rounded-[4px] border border-[#1f2530] bg-[#0b0e14] p-4 space-y-2.5">
          <h3 className="text-xs font-medium text-[#9aa3b2]">
            90-Day Statistical Envelope
          </h3>
          {summary?.stats ? (
            <dl className="space-y-1.5 font-mono text-xs tabular-nums">
              <div className="flex justify-between">
                <dt className="text-[#687283]">Total sunlit share</dt>
                <dd className="text-[#eab354] font-semibold">
                  {summary.stats.sunlit_pct}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#687283]">Earth DTE share</dt>
                <dd className="text-[#56B4E9] font-semibold">
                  {summary.stats.earth_visible_pct}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#687283]">Longest dark stretch</dt>
                <dd className="text-[#edf0f5]">
                  {summary.stats.longest_dark_hours} h
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#687283]">Sun elevation span</dt>
                <dd className="text-[#edf0f5]">
                  {summary.stats.sun_el_min.toFixed(2)}° to{" "}
                  {summary.stats.sun_el_max.toFixed(2)}°
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#687283]">Earth elevation span</dt>
                <dd className="text-[#edf0f5]">
                  {summary.stats.earth_el_min.toFixed(2)}° to{" "}
                  {summary.stats.earth_el_max.toFixed(2)}°
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-[#687283]">
              Aggregate statistics unavailable for this site.
            </p>
          )}
        </div>

        {/* Terrain & Ephemeris Contract */}
        <div className="rounded-[4px] border border-[#1f2530] bg-[#0b0e14] p-4 space-y-2.5">
          <h3 className="text-xs font-medium text-[#9aa3b2]">
            Terrain DEM &amp; Ephemeris File
          </h3>
          <dl className="space-y-1.5 font-mono text-xs tabular-nums">
            <div className="flex justify-between gap-2">
              <dt className="text-[#687283]">Horizon DEM</dt>
              <dd className="text-[#edf0f5] text-right">{horizon.dem_source}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#687283]">Mast height</dt>
              <dd className="text-[#edf0f5]">
                {horizon.mast_height_m.toFixed(1)} m
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#687283]">Horizon min / avg / max</dt>
              <dd className="text-[#9aa3b2]">
                {minHorizon.toFixed(1)}° / {avgHorizon.toFixed(1)}° /{" "}
                {maxHorizon.toFixed(1)}°
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#687283]">Azimuth step</dt>
              <dd className="text-[#edf0f5]">{horizon.az_step_deg}° (360 pts)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#687283]">Ephemeris cadence</dt>
              <dd className="text-[#edf0f5]">
                {ephemeris.step_minutes} min ({ephemeris.sun_el.length} steps)
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#687283]">UTC window</dt>
              <dd className="text-[#9aa3b2] text-right">
                {startIso.slice(0, 10)} → {endIso.slice(0, 10)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Researched NASA LRO LOLA Elevation & Slope Profile */}
      <div className="rounded-[4px] border border-[#1f2530] bg-[#0b0e14] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f2530] pb-2.5">
          <div>
            <h3 className="text-xs font-medium text-[#edf0f5]">
              NASA LRO LOLA Elevation &amp; Slope Profile (Drives 3D Terrain)
            </h3>
            <p className="text-[11px] text-[#687283]">
              {nasaTerrain.nasaDataset}
            </p>
          </div>
          <a
            href={nasaTerrain.nasaDatasetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#56B4E9] hover:text-sky-300 hover:underline"
          >
            <span>NASA PGDA / LOLA Archive</span>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs tabular-nums">
          <div>
            <div className="text-[11px] text-[#687283]">Datum Elevation</div>
            <div className="mt-0.5 text-sm font-semibold text-[#edf0f5]">
              {nasaTerrain.elevationM >= 0 ? "+" : ""}
              {nasaTerrain.elevationM.toLocaleString("en-US")} m
            </div>
            <div className="text-[11px] text-[#9aa3b2]">
              vs 1,737.4 km sphere
            </div>
          </div>

          <div>
            <div className="text-[11px] text-[#687283]">Landing Zone Slope</div>
            <div className="mt-0.5 text-sm font-semibold text-[#eab354]">
              {nasaTerrain.padSlopeDeg[0]}° – {nasaTerrain.padSlopeDeg[1]}°
            </div>
            <div className="text-[11px] text-[#9aa3b2]">
              Local pad / crest bench
            </div>
          </div>

          <div>
            <div className="text-[11px] text-[#687283]">Flank / Wall Slope</div>
            <div className="mt-0.5 text-sm font-semibold text-[#56B4E9]">
              {nasaTerrain.flankSlopeDeg[0]}° – {nasaTerrain.flankSlopeDeg[1]}°
            </div>
            <div className="text-[11px] text-[#9aa3b2]">
              Crater / massif escarpment
            </div>
          </div>

          <div>
            <div className="text-[11px] text-[#687283]">Vertical Relief</div>
            <div className="mt-0.5 text-sm font-semibold text-[#edf0f5]">
              ~{nasaTerrain.reliefM.toLocaleString("en-US")} m
            </div>
            <div className="text-[11px] text-[#9aa3b2] truncate">
              {nasaTerrain.elevationRangeM}
            </div>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#9aa3b2]">
          {nasaTerrain.geomorphology}
        </p>

        <div className="border-t border-[#1f2530] pt-2.5 text-[11px] text-[#687283] leading-relaxed">
          <span className="font-medium text-[#9aa3b2]">
            3D Surface &amp; Globe Layers:
          </span>{" "}
          Global 4K LROC WAC albedo (70°N–70°S optical + 70°–90° LOLA 1064 nm LDAM_10) &amp;
          16 px/deg LOLA elevation/normals (90°S–90°N), augmented south of 80°S by NASA PDS{" "}
          <span className="font-mono text-[#9aa3b2]">LDEM_80S_80M</span> (80 m/px polar stereographic)
          with trilinear mipmaps and max anisotropic filtering.
        </div>
      </div>
    </section>
  );
}
