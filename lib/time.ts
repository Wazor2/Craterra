import type { Ephemeris } from "./data";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const nSteps = (e: Ephemeris) => e.sun_el.length;
export const startMs = (e: Ephemeris) => Date.parse(e.start_utc);
export const idxToMs = (e: Ephemeris, i: number) => startMs(e) + i * e.step_minutes * 60000;
export const msToIdx = (e: Ephemeris, ms: number) =>
  clamp(Math.round((ms - startMs(e)) / (e.step_minutes * 60000)), 0, nSteps(e) - 1);
export const fmtUTC = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";
export const dayStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function fmtDuration(steps: number, stepMin: number) {
  const m = Math.round(steps * stepMin);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return mm ? `${h} h ${mm} min` : `${h} h`;
  return `${mm} min`;
}
