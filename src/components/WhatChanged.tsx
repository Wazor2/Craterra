import { useMemo, useState } from "react";
import { endEpoch } from "../lib/geometry";
import { formatDeltaHours, windowStats } from "../lib/windows";
import type { LoadedSiteBundle } from "./CompareGrid";

interface WhatChangedProps {
  bundles: LoadedSiteBundle[];
}

function DeltaBadge({
  delta,
  higherIsBetter,
}: {
  delta: number;
  higherIsBetter: boolean;
}) {
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded) < 0.05) {
    return (
      <span className="font-mono text-xs text-[#687283] tabular-nums">
        0.0 h (Unchanged)
      </span>
    );
  }
  const favorable = higherIsBetter ? rounded > 0 : rounded < 0;
  return (
    <span
      className={`font-mono text-xs font-semibold tabular-nums ${
        favorable ? "text-[#eab354]" : "text-[#d9826c]"
      }`}
    >
      {formatDeltaHours(rounded)} ({favorable ? "Gain" : "Loss"})
    </span>
  );
}

export function WhatChanged({ bundles }: WhatChangedProps) {
  const [siteId, setSiteId] = useState<string>(
    () => bundles[0]?.site.id ?? "shackleton_rim"
  );
  const activeBundle =
    bundles.find((b) => b.site.id === siteId) ?? bundles[0] ?? null;

  const dataStartMs = activeBundle
    ? Date.parse(activeBundle.ephemeris.start_utc)
    : Date.UTC(2026, 11, 1);
  const dataEndMs = activeBundle
    ? endEpoch(activeBundle.ephemeris)
    : Date.UTC(2027, 2, 1);

  const [dateA, setDateA] = useState("2026-12-10");
  const [dateB, setDateB] = useState("2026-12-24");
  const [windowDays, setWindowDays] = useState<number>(7);

  const analysis = useMemo(() => {
    if (!activeBundle) return null;
    const msA = Math.max(
      dataStartMs,
      Math.min(dataEndMs, Date.parse(`${dateA}T00:00:00Z`))
    );
    const msB = Math.max(
      dataStartMs,
      Math.min(dataEndMs, Date.parse(`${dateB}T00:00:00Z`))
    );
    const statsA = windowStats(
      activeBundle.ephemeris,
      activeBundle.horizon,
      msA,
      windowDays
    );
    const statsB = windowStats(
      activeBundle.ephemeris,
      activeBundle.horizon,
      msB,
      windowDays
    );

    const sunDelta = statsB.sunlitHours - statsA.sunlitHours;
    const earthDelta = statsB.earthVisibleHours - statsA.earthVisibleHours;
    const darkDelta = statsB.longestDarkHours - statsA.longestDarkHours;
    const outageDelta =
      statsB.longestEarthOutageHours - statsA.longestEarthOutageHours;

    const sunPhrase =
      Math.abs(sunDelta) < 0.1
        ? "sunlight remains unchanged"
        : sunDelta > 0
        ? `sunlight increases by ${sunDelta.toFixed(1)} h`
        : `sunlight drops by ${Math.abs(sunDelta).toFixed(1)} h`;
    const earthPhrase =
      Math.abs(earthDelta) < 0.1
        ? "Earth visibility remains unchanged"
        : earthDelta > 0
        ? `Earth contact rises by ${earthDelta.toFixed(1)} h`
        : `Earth contact falls by ${Math.abs(earthDelta).toFixed(1)} h`;

    const conclusion = `Delaying ${activeBundle.site.name} from ${dateA} to ${dateB} UTC (${windowDays}-day window): ${sunPhrase}, and ${earthPhrase}.`;

    return { statsA, statsB, sunDelta, earthDelta, darkDelta, outageDelta, conclusion };
  }, [activeBundle, dateA, dateB, windowDays, dataStartMs, dataEndMs]);

  if (!activeBundle || !analysis) {
    return null;
  }

  const applyDelayDays = (days: number) => {
    const base = Date.parse(`${dateA}T00:00:00Z`);
    if (Number.isNaN(base)) return;
    const clamped = Math.max(dataStartMs, Math.min(dataEndMs, base + days * 86_400_000));
    setDateB(new Date(clamped).toISOString().slice(0, 10));
  };

  return (
    <section
      aria-label="What-Changed mission delay analyzer"
      className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-semibold text-[#edf0f5]">
            What-Changed Analyzer — Launch-Delay Impact
          </h2>
          <p className="mt-0.5 text-xs text-[#9aa3b2]">
            Compare two arrival dates on the same site over a fixed mission
            window (default Date B = Date A + 14 days).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {([7, 14, 28] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => applyDelayDays(days)}
              className="rounded-[5px] border border-[#1f2530] bg-[#151922] px-2.5 py-2 font-mono text-xs text-[#edf0f5] hover:border-[#eab354] hover:text-[#eab354] transition-colors whitespace-nowrap"
            >
              +{days}d slip
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setDateA("2026-12-10");
              setDateB("2026-12-24");
              setWindowDays(7);
            }}
            className="rounded-[5px] border border-[#2d3544] bg-[#151922] px-3 py-2 text-xs font-medium text-[#edf0f5] hover:bg-[#1c212c] transition-colors whitespace-nowrap"
          >
            Reset demo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-[#9aa3b2]">
          <span>Landing Site</span>
          <select
            value={activeBundle.site.id}
            onChange={(e) => setSiteId(e.target.value)}
            className="min-h-[42px] rounded-[5px] border border-[#2d3544] bg-[#090b10] px-3 py-2 text-xs text-[#edf0f5]"
          >
            {bundles.map((b) => (
              <option key={b.site.id} value={b.site.id}>
                {b.site.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-[#9aa3b2]">
          <span>Date A (Original UTC)</span>
          <input
            type="date"
            value={dateA}
            min={new Date(dataStartMs).toISOString().slice(0, 10)}
            max={new Date(dataEndMs).toISOString().slice(0, 10)}
            onChange={(e) => {
              const v = e.target.value;
              setDateA(v);
              const plus14 = new Date(
                Date.parse(`${v}T00:00:00Z`) + 14 * 86_400_000
              );
              if (!Number.isNaN(plus14.getTime())) {
                const clamped = Math.min(dataEndMs, plus14.getTime());
                setDateB(new Date(clamped).toISOString().slice(0, 10));
              }
            }}
            className="min-h-[42px] rounded-[5px] border border-[#2d3544] bg-[#090b10] px-3 py-2 font-mono text-xs text-[#edf0f5]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-[#9aa3b2]">
          <span>Date B (Delayed UTC)</span>
          <input
            type="date"
            value={dateB}
            min={new Date(dataStartMs).toISOString().slice(0, 10)}
            max={new Date(dataEndMs).toISOString().slice(0, 10)}
            onChange={(e) => setDateB(e.target.value)}
            className="min-h-[42px] rounded-[5px] border border-[#2d3544] bg-[#090b10] px-3 py-2 font-mono text-xs text-[#edf0f5]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-[#9aa3b2]">
          <span>Evaluation Window</span>
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="min-h-[42px] rounded-[5px] border border-[#2d3544] bg-[#090b10] px-3 py-2 font-mono text-xs text-[#edf0f5]"
          >
            <option value={3}>3 days (72 h)</option>
            <option value={7}>7 days (168 h)</option>
            <option value={14}>14 days (336 h)</option>
            <option value={29.53}>29.53 days (1 lunar day)</option>
          </select>
        </label>
      </div>

      <div className="rounded-[5px] border border-[#2d3544] bg-[#090b10] px-4 py-3 text-sm text-[#edf0f5]">
        {analysis.conclusion}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#1f2530] text-[#9aa3b2]">
              <th className="py-2.5 pr-4 font-medium">
                Metric ({windowDays}-day window)
              </th>
              <th className="py-2.5 px-3 font-mono font-medium">
                Date A ({analysis.statsA.windowStartUtc.slice(0, 10)})
              </th>
              <th className="py-2.5 px-3 font-mono font-medium">
                Date B ({analysis.statsB.windowStartUtc.slice(0, 10)})
              </th>
              <th className="py-2.5 pl-3 font-medium">Delta (B − A)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2530]">
            <tr>
              <td className="py-3 pr-4 text-[#edf0f5] font-medium">
                Total sunlit hours
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-[#edf0f5]">
                {analysis.statsA.sunlitHours.toFixed(1)} h (
                {analysis.statsA.sunlitPct}%)
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-[#edf0f5]">
                {analysis.statsB.sunlitHours.toFixed(1)} h (
                {analysis.statsB.sunlitPct}%)
              </td>
              <td className="py-3 pl-3">
                <DeltaBadge delta={analysis.sunDelta} higherIsBetter />
              </td>
            </tr>

            <tr>
              <td className="py-3 pr-4 text-[#edf0f5] font-medium">
                Total Earth-visible hours
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-[#edf0f5]">
                {analysis.statsA.earthVisibleHours.toFixed(1)} h (
                {analysis.statsA.earthVisiblePct}%)
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-[#edf0f5]">
                {analysis.statsB.earthVisibleHours.toFixed(1)} h (
                {analysis.statsB.earthVisiblePct}%)
              </td>
              <td className="py-3 pl-3">
                <DeltaBadge delta={analysis.earthDelta} higherIsBetter />
              </td>
            </tr>

            <tr>
              <td className="py-3 pr-4 text-[#edf0f5] font-medium">
                Longest continuous dark gap
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-[#edf0f5]">
                {analysis.statsA.longestDarkHours.toFixed(1)} h
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-[#edf0f5]">
                {analysis.statsB.longestDarkHours.toFixed(1)} h
              </td>
              <td className="py-3 pl-3">
                <DeltaBadge delta={analysis.darkDelta} higherIsBetter={false} />
              </td>
            </tr>

            <tr>
              <td className="py-3 pr-4 text-[#edf0f5] font-medium">
                Longest Earth-outage gap
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-[#edf0f5]">
                {analysis.statsA.longestEarthOutageHours.toFixed(1)} h
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-[#edf0f5]">
                {analysis.statsB.longestEarthOutageHours.toFixed(1)} h
              </td>
              <td className="py-3 pl-3">
                <DeltaBadge delta={analysis.outageDelta} higherIsBetter={false} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
