import { marginSeries } from "./events";
import { epochAt, indexAt, isVisible } from "./geometry";
import type { Ephemeris, Horizon } from "./types";

export interface WindowStats {
  windowStartUtc: string;
  windowHours: number;
  sunlitHours: number;
  sunlitPct: number;
  earthVisibleHours: number;
  earthVisiblePct: number;
  longestSunlitHours: number;
  longestDarkHours: number;
  longestEarthHours: number;
  longestEarthOutageHours: number;
  actualHoursEvaluated: number;
}

/**
 * Longest contiguous run (in hours) where predicate(margins[i]) is true.
 */
export function longestRun(
  margins: number[],
  stepMinutes: number,
  predicate: (m: number) => boolean
): number {
  const stepHours = stepMinutes / 60;
  let current = 0;
  let best = 0;
  for (let i = 0; i < margins.length; i++) {
    if (predicate(margins[i])) {
      current += stepHours;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return Math.round(best * 100) / 100;
}

/**
 * Total sunlit hours inside a slice of margin values.
 */
export function sunlitHours(margins: number[], stepMinutes: number): number {
  const stepHours = stepMinutes / 60;
  let total = 0;
  for (let i = 0; i < margins.length; i++) {
    if (isVisible(margins[i])) total += stepHours;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Total Earth-visible hours inside a slice of margin values.
 */
export function earthVisibleHours(
  margins: number[],
  stepMinutes: number
): number {
  return sunlitHours(margins, stepMinutes);
}

/**
 * Compute window statistics starting at `startEpochMs` for `windowDays` days.
 */
export function windowStats(
  eph: Ephemeris,
  horizon: Horizon,
  startEpochMs: number,
  windowDays: number
): WindowStats {
  const sunMargins = marginSeries(eph, horizon, "sun");
  const earthMargins = marginSeries(eph, horizon, "earth");

  const { clampedIndex } = indexAt(eph, startEpochMs);
  const startIdx = Math.round(clampedIndex);
  const stepsNeeded = Math.max(
    1,
    Math.round((windowDays * 24 * 60) / eph.step_minutes)
  );
  const endIdx = Math.min(sunMargins.length, startIdx + stepsNeeded);

  const sunSlice = sunMargins.slice(startIdx, endIdx);
  const earthSlice = earthMargins.slice(startIdx, endIdx);

  const evaluatedHours = (sunSlice.length * eph.step_minutes) / 60;
  const sunHours = sunlitHours(sunSlice, eph.step_minutes);
  const earthHours = earthVisibleHours(earthSlice, eph.step_minutes);

  return {
    windowStartUtc: new Date(epochAt(eph, startIdx)).toISOString(),
    windowHours: windowDays * 24,
    actualHoursEvaluated: Math.round(evaluatedHours * 100) / 100,
    sunlitHours: sunHours,
    sunlitPct:
      evaluatedHours > 0 ? Math.round((sunHours / evaluatedHours) * 1000) / 10 : 0,
    earthVisibleHours: earthHours,
    earthVisiblePct:
      evaluatedHours > 0
        ? Math.round((earthHours / evaluatedHours) * 1000) / 10
        : 0,
    longestSunlitHours: longestRun(sunSlice, eph.step_minutes, (m) => isVisible(m)),
    longestDarkHours: longestRun(sunSlice, eph.step_minutes, (m) => !isVisible(m)),
    longestEarthHours: longestRun(
      earthSlice,
      eph.step_minutes,
      (m) => isVisible(m)
    ),
    longestEarthOutageHours: longestRun(
      earthSlice,
      eph.step_minutes,
      (m) => !isVisible(m)
    ),
  };
}

/**
 * Signed delta string with unit, e.g. "+12.5 h" or "-8.0 h".
 */
export function formatDeltaHours(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)} h`;
}
