"use client";
import { useMemo, useState } from "react";
import { useSites, useSiteData } from "@/lib/useSiteData";
import { both, countVisible, windowStats } from "@/lib/events";
import { dayStr, idxToMs, msToIdx, nSteps, startMs } from "@/lib/time";
import SkyView from "@/components/SkyView";
import Cards from "@/components/Cards";
import TimeControls from "@/components/TimeControls";
import MockBanner from "@/components/MockBanner";

function Column({ id, name, ms }: { id: string; name: string; ms: number }) {
  const d = useSiteData(id);
  if (d.error) return <p className="text-red-400">{name}: {d.error}</p>;
  if (!d.eph || !d.hz || !d.vis) return <p className="text-slate-400">Loading {name}…</p>;
  const i = msToIdx(d.eph, ms);
  const n = nSteps(d.eph);
  const pct = (v: boolean[]) => ((100 * countVisible(v, 0, n)) / n).toFixed(0);
  return (
    <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
      <h3 className="font-semibold">{name}</h3>
      <SkyView eph={d.eph} hz={d.hz} idx={i} />
      <Cards eph={d.eph} vis={d.vis} idx={i} />
      <p className="text-sm text-slate-300">
        Whole data window: sunlit {pct(d.vis.sun)}% · Earth visible {pct(d.vis.earth)}% · both {pct(both(d.vis.sun, d.vis.earth))}%
      </p>
    </div>
  );
}

function WhatChanged({ id }: { id: string }) {
  const d = useSiteData(id);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [days, setDays] = useState(7);
  const range = d.eph ? [dayStr(idxToMs(d.eph, 0)), dayStr(idxToMs(d.eph, nSteps(d.eph) - 1))] : ["", ""];
  const da = a || range[0];
  const db = b || (d.eph ? dayStr(idxToMs(d.eph, Math.min(nSteps(d.eph) - 1, Math.floor((14 * 1440) / d.eph.step_minutes)))) : "");
  const res = useMemo(() => {
    if (!d.eph || !d.vis || !da || !db) return null;
    const e = d.eph;
    const len = Math.floor((days * 1440) / e.step_minutes);
    const from = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - startMs(e)) / (e.step_minutes * 60000));
    const fa = from(da), fb = from(db);
    return { A: windowStats(d.vis, fa, fa + len, e.step_minutes), B: windowStats(d.vis, fb, fb + len, e.step_minutes), clipped: fa + len > nSteps(e) || fb + len > nSteps(e) || fa < 0 || fb < 0 };
  }, [d.eph, d.vis, da, db, days]);
  const rows: [string, "sunH" | "earthH" | "bothH" | "longestDarkH"][] = [
    ["Sunlit hours", "sunH"], ["Earth-visible hours", "earthH"], ["Sun AND Earth hours", "bothH"], ["Longest dark stretch (h)", "longestDarkH"],
  ];
  return (
    <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-3">
      <div className="flex flex-wrap gap-3 text-sm">
        <label>Original date <input type="date" min={range[0]} max={range[1]} value={da} onChange={(e) => setA(e.target.value)} className="rounded bg-slate-800 px-2 py-1" /></label>
        <label>Slipped date <input type="date" min={range[0]} max={range[1]} value={db} onChange={(e) => setB(e.target.value)} className="rounded bg-slate-800 px-2 py-1" /></label>
        <label>Mission window (days) <input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} className="w-16 rounded bg-slate-800 px-2 py-1" /></label>
      </div>
      {res?.clipped && <p className="text-sm text-amber-300">Part of a window falls outside the data range, so totals are truncated.</p>}
      {res && (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-400"><th>Metric</th><th>Original</th><th>Slipped</th><th>Change</th></tr></thead>
          <tbody>
            {rows.map(([label, k]) => {
              const delta = res.B[k] - res.A[k];
              return (
                <tr key={k} className="border-t border-slate-800">
                  <td className="py-1">{label}</td><td>{res.A[k].toFixed(0)}</td><td>{res.B[k].toFixed(0)}</td>
                  <td>{delta > 0 ? "+" : ""}{delta.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Compare() {
  const sites = useSites();
  const [picked, setPicked] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [wcSite, setWcSite] = useState<string | null>(null);
  const all = sites.data ?? [];
  const sel = (picked ?? all.slice(0, 2).map((s) => s.id)).filter((id) => all.some((s) => s.id === id));
  const ref = useSiteData(sel[0] ?? null);
  const ms = ref.eph ? idxToMs(ref.eph, Math.min(idx, nSteps(ref.eph) - 1)) : 0;
  const toggle = (id: string) => {
    const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id].slice(-3);
    setPicked(next.length ? next : sel);
  };
  return (
    <>
      <h1 className="text-2xl font-bold">Compare</h1>
      <MockBanner hz={ref.hz} />
      <div className="flex flex-wrap gap-3 text-sm">
        {all.map((s) => (
          <label key={s.id} className="flex items-center gap-1">
            <input type="checkbox" checked={sel.includes(s.id)} onChange={() => toggle(s.id)} /> {s.name}
          </label>
        ))}
        <span className="text-slate-500">(pick 2 to 3)</span>
      </div>
      {ref.eph && ref.vis && <TimeControls eph={ref.eph} vis={ref.vis} idx={Math.min(idx, nSteps(ref.eph) - 1)} setIdx={setIdx} />}
      <div className="grid gap-4 lg:grid-cols-2">
        {ref.eph && sel.map((id) => <Column key={id} id={id} name={all.find((s) => s.id === id)?.name ?? id} ms={ms} />)}
      </div>
      <h2 className="pt-4 text-xl font-semibold">What changed if the mission slips?</h2>
      <p className="text-sm text-slate-400">Same site, two start dates: sunlight and Earth visibility over the same mission window.</p>
      {all.length > 0 && (
        <>
          <select value={wcSite ?? all[0].id} onChange={(e) => setWcSite(e.target.value)} className="rounded bg-slate-800 px-2 py-1 text-sm">
            {all.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <WhatChanged key={wcSite ?? all[0].id} id={wcSite ?? all[0].id} />
        </>
      )}
    </>
  );
}
