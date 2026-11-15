import { marginSeries } from "./events";
import { epochAt } from "./geometry";
import type { Ephemeris, Horizon } from "./types";

export interface IllumRow {
  dateUtc: string; // YYYY-MM-DD
  cells: Array<{
    hourUtc: number;
    marginDeg: number | null;
    epochMs: number | null;
  }>;
}

export interface IllumGrid {
  rows: IllumRow[];
  minMargin: number;
  maxMargin: number;
}

/**
 * Group ephemeris steps by UTC date (rows) and UTC hour 0..23 (columns).
 */
export function buildIllumGrid(eph: Ephemeris, horizon: Horizon): IllumGrid {
  const sunMargins = marginSeries(eph, horizon, "sun");
  const dateMap = new Map<
    string,
    Array<{ hourUtc: number; marginDeg: number | null; epochMs: number | null }>
  >();

  let minMargin = Infinity;
  let maxMargin = -Infinity;

  for (let i = 0; i < sunMargins.length; i++) {
    const t = epochAt(eph, i);
    const d = new Date(t);
    const dateKey = d.toISOString().slice(0, 10);
    const hour = d.getUTCHours();

    if (!dateMap.has(dateKey)) {
      const rowCells = Array.from({ length: 24 }, (_, h) => ({
        hourUtc: h,
        marginDeg: null as number | null,
        epochMs: null as number | null,
      }));
      dateMap.set(dateKey, rowCells);
    }

    const m = sunMargins[i];
    if (m < minMargin) minMargin = m;
    if (m > maxMargin) maxMargin = m;

    const row = dateMap.get(dateKey)!;
    // Prefer exact top-of-hour or first sample in that hour
    if (row[hour].epochMs === null) {
      row[hour] = { hourUtc: hour, marginDeg: m, epochMs: t };
    }
  }

  const rows: IllumRow[] = Array.from(dateMap.entries()).map(
    ([dateUtc, cells]) => ({
      dateUtc,
      cells,
    })
  );

  return {
    rows,
    minMargin: Number.isFinite(minMargin) ? minMargin : -10,
    maxMargin: Number.isFinite(maxMargin) ? maxMargin : 10,
  };
}

/**
 * Color-blind-safe sequential scale:
 * - Below horizon (margin <= 0): deep slate/navy (#0F172A -> #1E293B)
 * - Above horizon (margin > 0): dark teal -> Okabe-Ito sky/teal -> amber -> bright gold
 */
export function marginColor(marginDeg: number | null, maxMargin: number): string {
  if (marginDeg === null) return "#090b10";
  if (marginDeg <= 0) {
    // Sub-horizon darkness gradient (-15 to 0) on #0b0e14 -> #181d28
    const t = Math.max(0, Math.min(1, (marginDeg + 15) / 15));
    const r = Math.round(11 + t * 13);
    const g = Math.round(14 + t * 15);
    const b = Math.round(20 + t * 20);
    return `rgb(${r}, ${g}, ${b})`;
  }
  // Above horizon: color-blind-safe sequential deep ocean-teal -> warm solar gold -> bright ivory-gold
  const denom = Math.max(2, Math.min(maxMargin, 25));
  const t = Math.max(0, Math.min(1, marginDeg / denom));
  if (t < 0.35) {
    const u = t / 0.35;
    // #1c4d69 -> #2b7c7d
    const r = Math.round(28 + u * (43 - 28));
    const g = Math.round(77 + u * (124 - 77));
    const b = Math.round(105 + u * (125 - 105));
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (t < 0.7) {
    const u = (t - 0.35) / 0.35;
    // #2b7c7d -> #eab354
    const r = Math.round(43 + u * (234 - 43));
    const g = Math.round(124 + u * (179 - 124));
    const b = Math.round(125 + u * (84 - 125));
    return `rgb(${r}, ${g}, ${b})`;
  }
  const u = (t - 0.7) / 0.3;
  // #eab354 -> #f7e3ae
  const r = Math.round(234 + u * (247 - 234));
  const g = Math.round(179 + u * (227 - 179));
  const b = Math.round(84 + u * (174 - 84));
  return `rgb(${r}, ${g}, ${b})`;
}
