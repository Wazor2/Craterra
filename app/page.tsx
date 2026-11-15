"use client";
import { useState } from "react";
import { useSites, useSiteData, useSummaries } from "@/lib/useSiteData";
import SiteChips from "@/components/SiteChips";
import SkyView from "@/components/SkyView";
import Cards from "@/components/Cards";
import TimeControls from "@/components/TimeControls";
import Timeline from "@/components/Timeline";
import Heatmap from "@/components/Heatmap";
import MockBanner from "@/components/MockBanner";

export default function Planner() {
  const sites = useSites();
  const sums = useSummaries();
  const [siteId, setSiteId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [expert, setExpert] = useState(false);
  const id = siteId ?? sites.data?.[0]?.id ?? null;
  const site = sites.data?.find((s) => s.id === id);
  const d = useSiteData(id);
  const i = d.eph ? Math.min(idx, d.eph.sun_el.length - 1) : 0;
  const summary = id ? sums.data?.[id] : undefined;

  return (
    <>
      <h1 className="text-2xl font-bold">Planner</h1>
      <p className="text-sm text-slate-400">
        Pick a landing site and a date to see when the Sun (power) and Earth (direct-to-Earth comms) are above the terrain horizon.
      </p>
      <MockBanner hz={d.hz} />
      {sites.error && <p className="text-red-400">Could not load sites: {sites.error}</p>}
      {sites.data && <SiteChips sites={sites.data} value={id} onChange={setSiteId} />}
      {site && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm">
          <div className="font-medium">{site.name} <span className="text-slate-400">({site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°)</span></div>
          <p className="mt-1 text-slate-300">{site.description}</p>
          {site.source_url.startsWith("http") && (
            <a href={site.source_url} className="text-sky-400 underline" target="_blank" rel="noreferrer">Source</a>
          )}
        </div>
      )}
      {d.error && <p className="text-red-400">Could not load site data: {d.error}</p>}
      {d.loading && <p className="text-slate-400">Loading…</p>}
      {d.eph && d.hz && d.vis && (
        <>
          <Cards eph={d.eph} vis={d.vis} idx={i} />
          <SkyView eph={d.eph} hz={d.hz} idx={i} />
          <TimeControls eph={d.eph} vis={d.vis} idx={i} setIdx={setIdx} />
          <h2 className="pt-2 text-lg font-semibold">Visibility timeline</h2>
          <Timeline eph={d.eph} vis={d.vis} idx={i} setIdx={setIdx} />
          <h2 className="pt-2 text-lg font-semibold">Sunlight by date and hour</h2>
          <Heatmap eph={d.eph} sun={d.vis.sun} setIdx={setIdx} />
          {summary && (
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-semibold">Summary</h2>
                <button onClick={() => setExpert((e) => !e)} className="rounded border border-slate-600 px-2 py-0.5 text-xs">
                  {expert ? "Show simple" : "Show expert"}
                </button>
              </div>
              <p>{expert ? summary.expert_text : summary.plain_text}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
