import { horizonAt, type Ephemeris, type Horizon } from "./data";

export type Body = "sun" | "earth";
export type Vis = { sun: boolean[]; earth: boolean[] };

/** A body is visible only if its elevation is above the terrain horizon at its azimuth. */
export function visibility(e: Ephemeris, h: Horizon, body: Body): boolean[] {
  const az = body === "sun" ? e.sun_az : e.earth_az;
  const el = body === "sun" ? e.sun_el : e.earth_el;
  return el.map((v, i) => v > horizonAt(h, az[i]));
}

/** Index of the first step after i where visibility differs from step i (null if none). */
export function nextChange(vis: boolean[], i: number): number | null {
  for (let j = i + 1; j < vis.length; j++) if (vis[j] !== vis[i]) return j;
  return null;
}

/** First step after i where visibility becomes `target` (rise: true, set: false). */
export function nextTransition(vis: boolean[], i: number, target: boolean): number | null {
  for (let j = i + 1; j < vis.length; j++) if (vis[j] === target && vis[j - 1] !== target) return j;
  return null;
}

/** Visible windows as [start, end) step indices. */
export function windows(vis: boolean[]): [number, number][] {
  const out: [number, number][] = [];
  let s = -1;
  vis.forEach((v, i) => {
    if (v && s < 0) s = i;
    if (!v && s >= 0) {
      out.push([s, i]);
      s = -1;
    }
  });
  if (s >= 0) out.push([s, vis.length]);
  return out;
}

export function countVisible(vis: boolean[], from: number, to: number): number {
  let n = 0;
  for (let i = Math.max(0, from); i < Math.min(vis.length, to); i++) if (vis[i]) n++;
  return n;
}

export const both = (a: boolean[], b: boolean[]) => a.map((v, i) => v && b[i]);

/** Longest run (in steps) of `value` inside [from, to). */
export function longestRun(vis: boolean[], from: number, to: number, value: boolean): number {
  let best = 0;
  let cur = 0;
  for (let i = Math.max(0, from); i < Math.min(vis.length, to); i++) {
    cur = vis[i] === value ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

export function windowStats(v: Vis, from: number, to: number, stepMin: number) {
  const h = (n: number) => (n * stepMin) / 60;
  const end = Math.min(to, v.sun.length);
  return {
    totalH: h(Math.max(0, end - from)),
    sunH: h(countVisible(v.sun, from, end)),
    earthH: h(countVisible(v.earth, from, end)),
    bothH: h(countVisible(both(v.sun, v.earth), from, end)),
    longestDarkH: h(longestRun(v.sun, from, end, false)),
  };
}
