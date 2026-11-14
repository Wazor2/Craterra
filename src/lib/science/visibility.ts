import type { TerrainProfile } from "../contracts/types";

export const SUN_SEMIDIAMETER_DEG = 0.266;
export const LUNAR_SYNODIC_DAY_SECONDS = 29.530589 * 24 * 60 * 60;
export const REQUIRED_SAMPLE_INTERVAL_SECONDS = 1800;

export interface SunVisibilityState {
  horizon_elevation_deg: number;
  center_clearance_deg: number;
  center_above_mathematical_horizon: boolean;
  center_terrain_visible: boolean;
  any_solar_disk_visible: boolean;
  full_solar_disk_visible: boolean;
  disk_state: "blocked" | "partial" | "full";
  refraction_applied: false;
}

export interface PointVisibilityState {
  horizon_elevation_deg: number;
  clearance_deg: number;
  above_mathematical_horizon: boolean;
  terrain_visible: boolean;
  meaning: "target-centre geometric visibility only";
}

export interface VisibilitySample {
  utc: string;
  clearance_deg: number;
}

export interface VisibilityEvent {
  utc: string;
  kind: "rise" | "set";
  from_visible: boolean;
  to_visible: boolean;
  interpolation: "linear_clearance_between_30m_samples";
}

export interface VisibilityWindow {
  start_utc: string;
  end_utc: string;
  duration_seconds: number;
  visible: boolean;
  starts_at_coverage_boundary: boolean;
  ends_at_coverage_boundary: boolean;
}

export interface VisibilityMetrics {
  coverage_seconds: number;
  visible_seconds: number;
  obstructed_seconds: number;
  visible_percentage: number;
  obstructed_percentage: number;
  longest_visible_window_seconds: number;
  longest_obstructed_window_seconds: number;
  visible_window_count: number;
  obstructed_window_count: number;
}

export interface VisibilityAnalysis {
  events: VisibilityEvent[];
  visible_windows: VisibilityWindow[];
  obstructed_windows: VisibilityWindow[];
  metrics: VisibilityMetrics;
  interpolation: "linear_clearance_between_30m_samples";
}

function normalizeAzimuth(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function validateHorizon(profile: TerrainProfile): void {
  if (
    profile.horizon_elevation_deg.length !== 360 ||
    profile.azimuth_start_deg !== 0 ||
    profile.azimuth_step_deg !== 1 ||
    profile.azimuth_convention !== "clockwise_from_north"
  ) {
    throw new RangeError("Terrain profile must contain 360 one-degree, clockwise-from-north samples.");
  }
  if (!profile.horizon_elevation_deg.every(Number.isFinite)) {
    throw new RangeError("Terrain horizon samples must all be finite.");
  }
}

/** Circularly interpolate a 0°..359° horizon array; the 359°/0° seam wraps. */
export function horizonElevationAtAzimuth(
  profile: TerrainProfile,
  azimuthDeg: number,
): number {
  validateHorizon(profile);
  if (!Number.isFinite(azimuthDeg)) throw new RangeError("Azimuth must be finite.");
  const normalized = normalizeAzimuth(azimuthDeg);
  const lowerIndex = Math.floor(normalized);
  const upperIndex = (lowerIndex + 1) % 360;
  const fraction = normalized - lowerIndex;
  const lower = profile.horizon_elevation_deg[lowerIndex];
  const upper = profile.horizon_elevation_deg[upperIndex];
  return lower + (upper - lower) * fraction;
}

export function sunVisibilityAt(
  profile: TerrainProfile,
  azimuthDeg: number,
  centerElevationDeg: number,
): SunVisibilityState {
  if (!Number.isFinite(centerElevationDeg)) throw new RangeError("Solar elevation must be finite.");
  const horizon = horizonElevationAtAzimuth(profile, azimuthDeg);
  const centerClearance = centerElevationDeg - horizon;
  const anySolarDiskVisible = centerClearance + SUN_SEMIDIAMETER_DEG > 0;
  const fullSolarDiskVisible = centerClearance - SUN_SEMIDIAMETER_DEG >= 0;
  const diskState = !anySolarDiskVisible
    ? "blocked"
    : fullSolarDiskVisible
      ? "full"
      : "partial";
  return {
    horizon_elevation_deg: horizon,
    center_clearance_deg: centerClearance,
    center_above_mathematical_horizon: centerElevationDeg > 0,
    center_terrain_visible: centerClearance >= 0,
    any_solar_disk_visible: anySolarDiskVisible,
    full_solar_disk_visible: fullSolarDiskVisible,
    disk_state: diskState,
    refraction_applied: false,
  };
}

/** The Earth is evaluated as a geometric direction to its centre, not as a comms link. */
export function earthCenterVisibilityAt(
  profile: TerrainProfile,
  azimuthDeg: number,
  centerElevationDeg: number,
): PointVisibilityState {
  if (!Number.isFinite(centerElevationDeg)) throw new RangeError("Earth-centre elevation must be finite.");
  const horizon = horizonElevationAtAzimuth(profile, azimuthDeg);
  const clearance = centerElevationDeg - horizon;
  return {
    horizon_elevation_deg: horizon,
    clearance_deg: clearance,
    above_mathematical_horizon: centerElevationDeg > 0,
    terrain_visible: clearance >= 0,
    meaning: "target-centre geometric visibility only",
  };
}

function parseUtcMilliseconds(utc: string, index: number): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(utc)) {
    throw new RangeError(`Sample ${index} must use an ISO-8601 UTC timestamp ending in Z.`);
  }
  const milliseconds = Date.parse(utc);
  if (!Number.isFinite(milliseconds)) throw new RangeError(`Sample ${index} has an invalid UTC timestamp.`);
  return milliseconds;
}

function interpolatedCrossingMs(
  leftMs: number,
  rightMs: number,
  leftClearance: number,
  rightClearance: number,
): number {
  const difference = rightClearance - leftClearance;
  if (difference === 0) return leftMs;
  const fraction = Math.min(1, Math.max(0, -leftClearance / difference));
  return leftMs + fraction * (rightMs - leftMs);
}

function makeWindow(
  startMs: number,
  endMs: number,
  visible: boolean,
  startsAtBoundary: boolean,
  endsAtBoundary: boolean,
): VisibilityWindow {
  return {
    start_utc: new Date(startMs).toISOString(),
    end_utc: new Date(endMs).toISOString(),
    duration_seconds: Math.max(0, (endMs - startMs) / 1000),
    visible,
    starts_at_coverage_boundary: startsAtBoundary,
    ends_at_coverage_boundary: endsAtBoundary,
  };
}

/**
 * Detect transitions and visibility windows from signed target-minus-horizon
 * clearances. Crossings are linearly interpolated between 30-minute samples;
 * they are not mislabeled as exact SPICE instants.
 */
export function analyzeClearanceSeries(samples: readonly VisibilitySample[]): VisibilityAnalysis {
  if (samples.length < 2) throw new RangeError("At least two samples are required to analyze visibility.");
  const times = samples.map((sample, index) => {
    if (!Number.isFinite(sample.clearance_deg)) {
      throw new RangeError(`Sample ${index} clearance must be finite.`);
    }
    return parseUtcMilliseconds(sample.utc, index);
  });
  for (let index = 1; index < times.length; index += 1) {
    const intervalSeconds = (times[index] - times[index - 1]) / 1000;
    if (Math.abs(intervalSeconds - REQUIRED_SAMPLE_INTERVAL_SECONDS) > 0.001) {
      throw new RangeError("Visibility samples must be strictly increasing at 30-minute intervals.");
    }
  }

  const events: VisibilityEvent[] = [];
  const visibleWindows: VisibilityWindow[] = [];
  const obstructedWindows: VisibilityWindow[] = [];
  let activeVisible = samples[0].clearance_deg >= 0;
  let windowStartMs = times[0];
  let startsAtCoverageBoundary = true;

  for (let index = 1; index < samples.length; index += 1) {
    const previousVisible = samples[index - 1].clearance_deg >= 0;
    const currentVisible = samples[index].clearance_deg >= 0;
    if (previousVisible === currentVisible) continue;

    const eventMs = interpolatedCrossingMs(
      times[index - 1],
      times[index],
      samples[index - 1].clearance_deg,
      samples[index].clearance_deg,
    );
    const eventUtc = new Date(eventMs).toISOString();
    const closedWindow = makeWindow(windowStartMs, eventMs, activeVisible, startsAtCoverageBoundary, false);
    (activeVisible ? visibleWindows : obstructedWindows).push(closedWindow);
    events.push({
      utc: eventUtc,
      kind: currentVisible ? "rise" : "set",
      from_visible: previousVisible,
      to_visible: currentVisible,
      interpolation: "linear_clearance_between_30m_samples",
    });
    activeVisible = currentVisible;
    windowStartMs = eventMs;
    startsAtCoverageBoundary = false;
  }

  const finalWindow = makeWindow(
    windowStartMs,
    times[times.length - 1],
    activeVisible,
    startsAtCoverageBoundary,
    true,
  );
  (activeVisible ? visibleWindows : obstructedWindows).push(finalWindow);

  const coverageSeconds = (times[times.length - 1] - times[0]) / 1000;
  const visibleSeconds = visibleWindows.reduce((sum, window) => sum + window.duration_seconds, 0);
  const obstructedSeconds = Math.max(0, coverageSeconds - visibleSeconds);
  const longest = (windows: VisibilityWindow[]) =>
    windows.reduce((maximum, window) => Math.max(maximum, window.duration_seconds), 0);

  return {
    events,
    visible_windows: visibleWindows,
    obstructed_windows: obstructedWindows,
    metrics: {
      coverage_seconds: coverageSeconds,
      visible_seconds: visibleSeconds,
      obstructed_seconds: obstructedSeconds,
      visible_percentage: (visibleSeconds / coverageSeconds) * 100,
      obstructed_percentage: (obstructedSeconds / coverageSeconds) * 100,
      longest_visible_window_seconds: longest(visibleWindows),
      longest_obstructed_window_seconds: longest(obstructedWindows),
      visible_window_count: visibleWindows.length,
      obstructed_window_count: obstructedWindows.length,
    },
    interpolation: "linear_clearance_between_30m_samples",
  };
}
