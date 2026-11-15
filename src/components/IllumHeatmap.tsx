import { useMemo, useState } from "react";
import { buildIllumGrid, marginColor } from "../lib/heatmap";
import type { Ephemeris, Horizon } from "../lib/types";

interface IllumHeatmapProps {
  ephemeris: Ephemeris;
  horizon: Horizon;
  nowMs: number;
  onSelectTime: (epochMs: number) => void;
}

export function IllumHeatmap({
  ephemeris,
  horizon,
  nowMs,
  onSelectTime,
}: IllumHeatmapProps) {
  const grid = useMemo(
    () => buildIllumGrid(ephemeris, horizon),
    [ephemeris, horizon]
  );

  const [hoverCell, setHoverCell] = useState<{
    dateUtc: string;
    hourUtc: number;
    marginDeg: number;
  } | null>(null);

  const activeIso = new Date(nowMs).toISOString();
  const activeDate = activeIso.slice(0, 10);
  const activeHour = new Date(nowMs).getUTCHours();

  const legendStops = useMemo(() => {
    const posMax = Math.max(2, Math.min(grid.maxMargin, 25));
    return [
      { label: "≤ 0° (Dark)", color: marginColor(-2, posMax) },
      { label: "+0.5°", color: marginColor(0.5, posMax) },
      { label: `+${(posMax * 0.4).toFixed(1)}°`, color: marginColor(posMax * 0.4, posMax) },
      { label: `+${(posMax * 0.75).toFixed(1)}°`, color: marginColor(posMax * 0.75, posMax) },
      { label: `+${posMax.toFixed(1)}°`, color: marginColor(posMax, posMax) },
    ];
  }, [grid.maxMargin]);

  return (
    <section
      aria-label="90-day solar illumination margin heatmap"
      className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-4"
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base sm:text-lg font-semibold text-[#edf0f5]">
            Illumination Heatmap — Date × UTC Hour (Sun Margin, deg)
          </h2>
          <p className="text-xs text-[#9aa3b2]">
            Each cell shows solar elevation minus terrain horizon. Click any cell
            to jump to that UTC hour.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#9aa3b2]">
          {legendStops.map((stop) => (
            <span key={stop.label} className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-[2px] border border-[#2d3544]"
                style={{ backgroundColor: stop.color }}
              />
              <span>{stop.label}</span>
            </span>
          ))}
        </div>
      </div>

      {hoverCell ? (
        <div className="mb-2 font-mono text-xs text-[#edf0f5] tabular-nums">
          Probe: {hoverCell.dateUtc} {String(hoverCell.hourUtc).padStart(2, "0")}:00
          UTC · Sun margin {hoverCell.marginDeg >= 0 ? "+" : ""}
          {hoverCell.marginDeg.toFixed(2)} deg (
          {hoverCell.marginDeg > 0 ? "Sunlit" : "Dark"})
        </div>
      ) : (
        <div className="mb-2 font-mono text-xs text-[#9aa3b2] tabular-nums">
          Active marker: {activeDate} {String(activeHour).padStart(2, "0")}:00
          UTC (white outline)
        </div>
      )}

      <div className="overflow-x-auto rounded-[4px] border border-[#1f2530] bg-[#090b10] p-2">
        <div className="min-w-[540px]">
          <div className="mb-1 grid grid-cols-[76px_repeat(24,minmax(0,1fr))] gap-[1px] font-mono text-[10px] text-[#687283]">
            <span>Date UTC</span>
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center">
                {String(h).padStart(2, "0")}
              </span>
            ))}
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-[1px]">
            {grid.rows.map((row) => (
              <div
                key={row.dateUtc}
                className="grid grid-cols-[76px_repeat(24,minmax(0,1fr))] gap-[1px] items-center"
              >
                <span className="font-mono text-[10px] text-[#687283] tabular-nums pr-1">
                  {row.dateUtc.slice(5)}
                </span>
                {row.cells.map((cell) => {
                  const isActive =
                    row.dateUtc === activeDate && cell.hourUtc === activeHour;
                  return (
                    <button
                      key={cell.hourUtc}
                      type="button"
                      disabled={cell.epochMs === null}
                      aria-label={`${row.dateUtc} ${String(cell.hourUtc).padStart(
                        2,
                        "0"
                      )}:00 UTC, Sun margin ${
                        cell.marginDeg !== null
                          ? `${cell.marginDeg.toFixed(2)} degrees`
                          : "unavailable"
                      }`}
                      onMouseEnter={() => {
                        if (cell.marginDeg !== null) {
                          setHoverCell({
                            dateUtc: row.dateUtc,
                            hourUtc: cell.hourUtc,
                            marginDeg: cell.marginDeg,
                          });
                        }
                      }}
                      onClick={() => {
                        if (cell.epochMs !== null) {
                          onSelectTime(cell.epochMs);
                        }
                      }}
                      style={{
                        backgroundColor: marginColor(
                          cell.marginDeg,
                          grid.maxMargin
                        ),
                      }}
                      className={`h-4 w-full transition-transform focus-visible:z-10 ${
                        isActive
                          ? "ring-2 ring-[#edf0f5] z-10"
                          : "hover:ring-1 hover:ring-[#9aa3b2]"
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
