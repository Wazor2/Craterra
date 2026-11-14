import {
  epochAt,
  horizonAt,
  isVisible,
  margin,
  sampleEphemerisAt,
} from "./geometry";
import type { Ephemeris, Horizon } from "./types";

export interface CrossingEvent {
  time: number;
  type: "rise" | "set";
}

export interface BodyState {
  sunEl: number;
  sunAz: number;
  sunTerrainEl: number;
  sunMargin: number;
  sunVisible: boolean;
  earthEl: number;
  earthAz: number;
  earthTerrainEl: number;
  earthMargin: number;
  earthVisible: boolean;
  outOfRange: "before" | "after" | null;
  clampedEpochMs: number;
}

/**
 * Array of UTC epoch timestamps (ms) matching every ephemeris step.
 */
export function epochsFromEphemeris(eph: Ephemeris): number[] {
  const n = eph.sun_el.length;
  const epochs = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    epochs[i] = epochAt(eph, i);
  }
  return epochs;
}

/**
 * Margin series (body elevation minus terrain horizon at body azimuth)
 * across every step of the ephemeris.
 */
export function marginSeries(
  eph: Ephemeris,
  horizon: Horizon,
  body: "sun" | "earth"
): number[] {
  const azArr = body === "sun" ? eph.sun_az : eph.earth_az;
  const elArr = body === "sun" ? eph.sun_el : eph.earth_el;
  const result = new Array<number>(elArr.length);
  for (let i = 0; i < elArr.length; i++) {
    const h = horizonAt(horizon.elev_deg, azArr[i]);
    result[i] = margin(elArr[i], h);
  }
  return result;
}

/**
 * Scan a margin series for true zero crossings and linearly interpolate
 * the crossing timestamp between consecutive steps.
 * Grazing points (e.g. [+0.5, 0, +0.5] or [-0.5, 0, -0.5]) do NOT emit events.
 */
export function findCrossings(
  margins: number[],
  epochs: number[]
): CrossingEvent[] {
  const n = Math.min(margins.length, epochs.length);
  if (n < 2) return [];

  const events: CrossingEvent[] = [];
  let i = 0;

  while (i < n - 1) {
    const m0 = margins[i];
    const m1 = margins[i + 1];

    // Strict sign change between adjacent samples
    if ((m0 < 0 && m1 > 0) || (m0 > 0 && m1 < 0)) {
      const t0 = epochs[i];
      const t1 = epochs[i + 1];
      const frac = -m0 / (m1 - m0);
      const time = Math.round(t0 + frac * (t1 - t0));
      events.push({
        time,
        type: m1 > 0 ? "rise" : "set",
      });
      i += 1;
      continue;
    }

    // Exact zero on the next sample: inspect what happens after any zero plateau
    if (m1 === 0 && m0 !== 0) {
      let j = i + 1;
      while (j < n && margins[j] === 0) {
        j += 1;
      }
      if (j < n) {
        const mAfter = margins[j];
        if (m0 < 0 && mAfter > 0) {
          // Crossed from negative through zero to positive
          const midTime = Math.round((epochs[i + 1] + epochs[j - 1]) / 2);
          events.push({ time: midTime, type: "rise" });
        } else if (m0 > 0 && mAfter < 0) {
          // Crossed from positive through zero to negative
          const midTime = Math.round((epochs[i + 1] + epochs[j - 1]) / 2);
          events.push({ time: midTime, type: "set" });
        }
        // If m0 and mAfter share the same sign, it merely grazed zero -> no crossing
      }
      i = j - 1;
      continue;
    }

    i += 1;
  }

  return events;
}

/**
 * Find the next rise or set event strictly after `fromEpochMs` (or null if none
 * exists within the loaded ephemeris window).
 */
export function nextEvent(
  eph: Ephemeris,
  horizon: Horizon,
  body: "sun" | "earth",
  fromEpochMs: number,
  type: "rise" | "set"
): number | null {
  const margins = marginSeries(eph, horizon, body);
  const epochs = epochsFromEphemeris(eph);
  if (epochs.length === 0 || fromEpochMs >= epochs[epochs.length - 1]) {
    return null;
  }
  const crossings = findCrossings(margins, epochs);
  for (const c of crossings) {
    if (c.type === type && c.time > fromEpochMs + 1) {
      return c.time;
    }
  }
  return null;
}

/**
 * Compute interpolated Sun & Earth state at `epochMs` (clamped to data bounds).
 */
export function currentState(
  eph: Ephemeris,
  horizon: Horizon,
  epochMs: number
): BodyState {
  const sample = sampleEphemerisAt(eph, epochMs);
  const sunTerrainEl = horizonAt(horizon.elev_deg, sample.sunAz);
  const earthTerrainEl = horizonAt(horizon.elev_deg, sample.earthAz);
  const sunMargin = margin(sample.sunEl, sunTerrainEl);
  const earthMargin = margin(sample.earthEl, earthTerrainEl);

  return {
    sunEl: sample.sunEl,
    sunAz: sample.sunAz,
    sunTerrainEl,
    sunMargin,
    sunVisible: isVisible(sunMargin),
    earthEl: sample.earthEl,
    earthAz: sample.earthAz,
    earthTerrainEl,
    earthMargin,
    earthVisible: isVisible(earthMargin),
    outOfRange: sample.outOfRange,
    clampedEpochMs: sample.clampedEpochMs,
  };
}

/**
 * Format duration until next event as e.g. "3 d 4 h 12 min" (or "4 h 12 min" if < 1 day).
 * Returns null if nextEventMs is null.
 */
export function timeUntil(
  nextEventMs: number | null,
  nowMs: number
): string | null {
  if (nextEventMs === null) return null;
  const diffMs = Math.max(0, nextEventMs - nowMs);
  const totalMinutes = Math.round(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) {
    return `${days} d ${hours} h ${mins} min`;
  }
  return `${hours} h ${mins} min`;
}

/**
 * Simple relative solar power index: max(0, sin(sun_el)) ONLY when Sun is visible above terrain.
 * Always display with disclaimer: "simple index, not mission power".
 */
export function simplePowerIndex(sunElDeg: number, sunVisible: boolean): number {
  if (!sunVisible || sunElDeg <= 0) return 0;
  return Math.max(0, Math.sin((sunElDeg * Math.PI) / 180));
}
