"use client";
import type { Ephemeris } from "@/lib/data";
import { both, windows, type Vis } from "@/lib/events";
import { dayStr, idxToMs, nSteps } from "@/lib/time";
import { SUN, EARTH, BOTH } from "./colors";

export default function Timeline({ eph, vis, idx, setIdx }: { eph: Ephemeris; vis: Vis; idx: number; setIdx: (i: number) => void }) {
  const n = nSteps(eph);
  const W = 720, rowH = 22, L = 70, top = 4;
  const pw = W - L - 6;
  const x = (i: number) => L + (i / n) * pw;
  const rows = [
    { name: "Sun", vis: vis.sun, color: SUN },
    { name: "Earth", vis: vis.earth, color: EARTH },
    { name: "Both", vis: both(vis.sun, vis.earth), color: BOTH },
  ];
  const H = top + rows.length * (rowH + 4) + 18;
  const stepsPerDay = 1440 / eph.step_minutes;
  const days = Math.floor(n / stepsPerDay);
  const click = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setIdx(Math.max(0, Math.min(n - 1, Math.round(((px - L) / pw) * n))));
  };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-pointer rounded-lg bg-slate-900" onClick={click}
        role="img" aria-label="Timeline of Sun and Earth visibility windows">
        {rows.map((r, k) => {
          const yy = top + k * (rowH + 4);
          return (
            <g key={r.name}>
              <text x={L - 6} y={yy + 15} textAnchor="end" fontSize={12} fill="#cbd5e1">{r.name}</text>
              <rect x={L} y={yy} width={pw} height={rowH} fill="#1e293b" />
              {windows(r.vis).map(([s, e], i) => (
                <rect key={i} x={x(s)} y={yy} width={Math.max(0.8, x(e) - x(s))} height={rowH} fill={r.color} />
              ))}
            </g>
          );
        })}
        {Array.from({ length: Math.floor(days / 5) + 1 }, (_, k) => k * 5).map((d) => (
          <text key={d} x={x(d * stepsPerDay)} y={H - 4} fontSize={10} fill="#94a3b8">{dayStr(idxToMs(eph, d * stepsPerDay)).slice(5)}</text>
        ))}
        <line x1={x(idx)} x2={x(idx)} y1={0} y2={H - 14} stroke="#fff" strokeWidth={1.5} />
      </svg>
      <p className="mt-1 text-xs text-slate-400">Coloured = above the terrain horizon (UTC dates). Click the strip to jump to a time.</p>
    </div>
  );
}
