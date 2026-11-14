"use client";
import type { Ephemeris } from "@/lib/data";
import { countVisible } from "@/lib/events";
import { dayStr, idxToMs, nSteps } from "@/lib/time";
import { SUN } from "./colors";

export default function Heatmap({ eph, sun, setIdx }: { eph: Ephemeris; sun: boolean[]; setIdx: (i: number) => void }) {
  const sm = eph.step_minutes;
  const n = nSteps(eph);
  const days = Math.floor((n * sm) / 1440);
  const cw = 26, ch = 12, L = 56, T = 16;
  const W = L + 24 * cw, H = T + days * ch + 4;
  const cells: React.ReactNode[] = [];
  for (let d = 0; d < days; d++)
    for (let h = 0; h < 24; h++) {
      const s = Math.floor(((d * 24 + h) * 60) / sm);
      const e = Math.max(s + 1, Math.floor(((d * 24 + h + 1) * 60) / sm));
      if (s >= n) continue;
      const f = countVisible(sun, s, e) / (e - s);
      cells.push(
        <rect key={`${d}-${h}`} x={L + h * cw} y={T + d * ch} width={cw - 1} height={ch - 1}
          fill={SUN} fillOpacity={0.08 + 0.92 * f} onClick={() => setIdx(Math.min(n - 1, s))}>
          <title>{`${dayStr(idxToMs(eph, s))} ${String(h).padStart(2, "0")}:00 UTC — sunlit ${(f * 100).toFixed(0)}%`}</title>
        </rect>,
      );
    }
  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[560px] w-full cursor-pointer rounded-lg bg-slate-900"
          role="img" aria-label="Heatmap of sunlight by date and hour (UTC)">
          {[0, 6, 12, 18].map((h) => (
            <text key={h} x={L + h * cw} y={11} fontSize={10} fill="#94a3b8">{String(h).padStart(2, "0")}h</text>
          ))}
          {Array.from({ length: days }, (_, d) => d).filter((d) => d % 3 === 0).map((d) => (
            <text key={d} x={L - 4} y={T + d * ch + 9} textAnchor="end" fontSize={9} fill="#94a3b8">
              {dayStr(idxToMs(eph, Math.floor((d * 1440) / sm))).slice(5)}
            </text>
          ))}
          {cells}
        </svg>
      </div>
      <p className="mt-1 text-xs text-slate-400">Rows = days from start of data, columns = hour (UTC). Brighter = more sunlight above the terrain horizon. Click a cell to jump there.</p>
    </div>
  );
}
