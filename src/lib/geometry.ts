import type { Ephemeris } from "./types";

/**
 * Normalise any azimuth angle in degrees into [0, 360).
 */
export function normaliseAz(az: number): number {
  const mod = ((az % 360) + 360) % 360;
  return mod === 360 ? 0 : mod;
}

/**
 * Linear interpolation of terrain horizon elevation over a 360-value array
 * (one value per degree 0..359) with wrap-around between 359 and 0.
 */
export function horizonAt(elevDeg: number[], az: number): number {
  if (elevDeg.length === 0) return 0;
  if (elevDeg.length !== 360) {
    const step = 360 / elevDeg.length;
    const norm = normaliseAz(az) / step;
    const i0 = Math.floor(norm) % elevDeg.length;
    const i1 = (i0 + 1) % elevDeg.length;
    const frac = norm - Math.floor(norm);
    return elevDeg[i0] * (1 - frac) + elevDeg[i1] * frac;
  }
  const a = normaliseAz(az);
  const i0 = Math.floor(a) % 360;
  const i1 = (i0 + 1) % 360;
  const frac = a - Math.floor(a);
  return elevDeg[i0] * (1 - frac) + elevDeg[i1] * frac;
}

/**
 * Elevation margin above local terrain horizon (deg).
 * Negative means occulted below terrain.
 */
export function margin(bodyEl: number, terrainEl: number): number {
  return bodyEl - terrainEl;
}

/**
 * Moon has no atmosphere (no refraction). Body centre is visible strictly when margin > 0.
 */
export function isVisible(marginDeg: number): boolean {
  return marginDeg > 0;
}

/**
 * Epoch timestamp in UTC ms for a given step index in an ephemeris.
 */
export function epochAt(eph: Ephemeris, index: number): number {
  const startMs = Date.parse(eph.start_utc);
  return startMs + index * eph.step_minutes * 60_000;
}

/**
 * End epoch timestamp in UTC ms for an ephemeris.
 */
export function endEpoch(eph: Ephemeris): number {
  return epochAt(eph, Math.max(0, eph.sun_el.length - 1));
}

/**
 * Continuous (fractional) index from UTC epoch ms, clamped to [0, length - 1].
 * Returns { index, clamped, outOfRange } so callers can display an out-of-range notice.
 */
export function indexAt(
  eph: Ephemeris,
  epochMs: number
): { index: number; clampedIndex: number; outOfRange: "before" | "after" | null } {
  const startMs = Date.parse(eph.start_utc);
  const stepMs = eph.step_minutes * 60_000;
  const maxIndex = Math.max(0, eph.sun_el.length - 1);
  const rawIndex = (epochMs - startMs) / stepMs;

  if (rawIndex < 0) {
    return { index: rawIndex, clampedIndex: 0, outOfRange: "before" };
  }
  if (rawIndex > maxIndex) {
    return { index: rawIndex, clampedIndex: maxIndex, outOfRange: "after" };
  }
  return { index: rawIndex, clampedIndex: rawIndex, outOfRange: null };
}

/**
 * Shortest-path azimuth interpolation across the 0/360 boundary.
 */
export function interpolateAz(az0: number, az1: number, frac: number): number {
  let diff = az1 - az0;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return normaliseAz(az0 + frac * diff);
}

/**
 * Interpolate Sun and Earth azimuth & elevation at an arbitrary UTC epoch ms
 * (clamped to the ephemeris bounds).
 */
export function sampleEphemerisAt(
  eph: Ephemeris,
  epochMs: number
): {
  sunAz: number;
  sunEl: number;
  earthAz: number;
  earthEl: number;
  outOfRange: "before" | "after" | null;
  clampedEpochMs: number;
} {
  const { clampedIndex, outOfRange } = indexAt(eph, epochMs);
  const maxIdx = eph.sun_el.length - 1;
  const i0 = Math.min(Math.floor(clampedIndex), maxIdx);
  const i1 = Math.min(i0 + 1, maxIdx);
  const frac = clampedIndex - i0;

  return {
    sunAz: interpolateAz(eph.sun_az[i0], eph.sun_az[i1], frac),
    sunEl: eph.sun_el[i0] * (1 - frac) + eph.sun_el[i1] * frac,
    earthAz: interpolateAz(eph.earth_az[i0], eph.earth_az[i1], frac),
    earthEl: eph.earth_el[i0] * (1 - frac) + eph.earth_el[i1] * frac,
    outOfRange,
    clampedEpochMs: epochAt(eph, clampedIndex),
  };
}
