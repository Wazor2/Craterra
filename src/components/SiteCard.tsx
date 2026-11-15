import { ExternalLink } from "lucide-react";
import type { Site, Summaries } from "../lib/types";

interface SiteCardProps {
  site: Site;
  selected: boolean;
  onSelect: (siteId: string) => void;
  summary?: Summaries[string];
  expertMode?: boolean;
  selectionLabel?: string;
}

export function formatLatLon(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew =
    lon <= 180
      ? `${lon.toFixed(2)}° E`
      : `${(360 - lon).toFixed(2)}° W (${lon.toFixed(2)}° E)`;
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${ew}`;
}

export function siteTypeLabel(type: Site["type"]): string {
  if (type === "south_pole") return "South Pole";
  if (type === "apollo") return "Apollo Baseline";
  return "Lunar Site";
}

export function SiteCard({
  site,
  selected,
  onSelect,
  summary,
  expertMode = false,
  selectionLabel,
}: SiteCardProps) {
  return (
    <div
      className={`flex flex-col justify-between rounded-[6px] border p-4 transition-colors ${
        selected
          ? "border-[#eab354]/80 bg-[#eab354]/[0.06]"
          : "border-[#1f2530] bg-[#0f1218] hover:border-[#2d3544] hover:bg-[#151922]/80"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#9aa3b2]">
              <span
                className={
                  site.type === "south_pole"
                    ? "font-medium text-[#56B4E9]"
                    : "font-medium text-[#eab354]"
                }
              >
                {siteTypeLabel(site.type)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {formatLatLon(site.lat, site.lon)}
              </span>
            </div>
            <h3 className="mt-1 font-display text-base font-semibold text-[#edf0f5] leading-snug">
              {site.name}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => onSelect(site.id)}
            aria-pressed={selected}
            className={`shrink-0 rounded-[4px] px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap min-h-[34px] ${
              selected
                ? "bg-[#edf0f5] text-[#090b10]"
                : "border border-[#2d3544] bg-[#151922] text-[#edf0f5] hover:bg-[#1c212c]"
            }`}
          >
            {selectionLabel ?? (selected ? "Active" : "Select")}
          </button>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-[#9aa3b2]">
          {site.description}
        </p>

        {summary && (
          <div className="mt-3 border-t border-[#1f2530] pt-2.5 text-xs leading-relaxed text-[#edf0f5]">
            <p>{expertMode ? summary.expert_text : summary.plain_text}</p>
            {summary.stats && (
              <p className="mt-1.5 font-mono text-[11px] text-[#9aa3b2] tabular-nums">
                Sunlit {summary.stats.sunlit_pct}% · Earth{" "}
                {summary.stats.earth_visible_pct}% · Max dark{" "}
                {summary.stats.longest_dark_hours} h
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-[#1f2530] flex items-center justify-between text-xs">
        <span className="font-mono text-[#687283]">{site.id}</span>
        <a
          href={site.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#56B4E9] hover:text-sky-300 underline-offset-2 hover:underline"
        >
          <span>Source</span>
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
