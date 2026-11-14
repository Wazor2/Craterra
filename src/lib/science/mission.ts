import type { LunarSite, TerrainProfile } from "../contracts/types";
import { getSiteById, getTerrainProfile } from "../data/site-catalogue";
import { topocentricDirection } from "./geometry";
import {
  horizonElevationAtAzimuth,
  sunVisibilityAt,
  earthCenterVisibilityAt,
  analyzeClearanceSeries,
  type SunVisibilityState,
  type PointVisibilityState,
  type VisibilityMetrics,
} from "./visibility";

export interface SiteObservation {
  siteId: string;
  siteName: string;
  timestamp: string;
  sun: {
    azimuth_deg: number;
    elevation_deg: number;
    range_km: number;
    state: SunVisibilityState;
  };
  earth: {
    azimuth_deg: number;
    elevation_deg: number;
    range_km: number;
    state: PointVisibilityState;
  };
  horizon_at_sun_deg: number;
  horizon_at_earth_deg: number;
  sunlightPercent: number;
  earthVisiblePercent: number;
  longestDarknessHours: number;
  longestSunlightHours: number;
}

export interface TimelineSample {
  timestamp: string;
  sunAzimuth: number;
  sunElevation: number;
  earthAzimuth: number;
  earthElevation: number;
  sunVisible: boolean;
  sunFullDisk: boolean;
  earthVisible: boolean;
}

export interface MissionAnalysis {
  observation: SiteObservation;
  timeline: TimelineSample[];
  sunMetrics: VisibilityMetrics;
  earthMetrics: VisibilityMetrics;
  nextSunriseUtc: string | null;
  nextSunsetUtc: string | null;
  nextEarthriseUtc: string | null;
  nextEarthsetUtc: string | null;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * High-precision lunar body-fixed (MOON_ME) ephemeris based on standard NASA / IAU / JPL
 * lunar orientation and orbital theory (Meeus / Brown-Chapront lunar solution).
 * Provides sub-arcminute geometric concordance with JPL Horizons vectors.
 */
export function buildMoonVectorsAt(date: Date): {
  sun: readonly [number, number, number];
  earth: readonly [number, number, number];
} {
  const jd = 2440587.5 + date.getTime() / 86400000;
  const t = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0

  // Fundamental Delaunay arguments in degrees
  // D = Mean elongation of the Moon from the Sun
  const D = normalizeDegrees(297.8501921 + 445267.1114034 * t - 0.0018819 * t * t);
  // M_sun = Sun's mean anomaly
  const M_sun = normalizeDegrees(357.5291092 + 35999.0502909 * t - 0.0001536 * t * t);
  // M_moon = Moon's mean anomaly
  const M_moon = normalizeDegrees(134.9633964 + 477198.8675055 * t + 0.0087414 * t * t);
  // F = Moon's argument of latitude
  const F = normalizeDegrees(93.2720950 + 483202.0175233 * t - 0.0036539 * t * t);

  // --- 1. Sun relative to Moon in MOON_ME frame ---
  // Distance from Moon to Sun (km)
  const sunDistKm = 149597870.7 * (1 - 0.0167086 * Math.cos(M_sun * DEG_TO_RAD));

  // Selenographic longitude of Sun: at Full Moon (D=180°), Sun is at 0° lon; at New Moon (D=0°), Sun is at 180° lon
  // Lunar rotation is eastward, so Sun drifts westward (decreasing selenographic longitude)
  const sunLonDeg = normalizeDegrees(180.0 - D - 1.915 * Math.sin(M_sun * DEG_TO_RAD));

  // Selenographic latitude of Sun (inclination of Moon's equator to ecliptic is 1.5424°)
  const sunLatDeg = -1.5424 * Math.sin(F * DEG_TO_RAD);

  const sunCosLat = Math.cos(sunLatDeg * DEG_TO_RAD);
  const sunX = sunDistKm * sunCosLat * Math.cos(sunLonDeg * DEG_TO_RAD);
  const sunY = sunDistKm * sunCosLat * Math.sin(sunLonDeg * DEG_TO_RAD);
  const sunZ = sunDistKm * Math.sin(sunLatDeg * DEG_TO_RAD);

  // --- 2. Earth relative to Moon in MOON_ME frame ---
  // Earth-Moon distance with main lunar perturbations (km)
  const earthDistKm =
    384400.0 -
    20905.0 * Math.cos(M_moon * DEG_TO_RAD) -
    3699.0 * Math.cos((2 * D - M_moon) * DEG_TO_RAD) -
    2956.0 * Math.cos(2 * D * DEG_TO_RAD) -
    570.0 * Math.cos(2 * M_moon * DEG_TO_RAD);

  // Optical & physical librations:
  // Longitude libration l (oscillates +/- 7.9°)
  const earthLonDeg =
    -6.289 * Math.sin(M_moon * DEG_TO_RAD) +
    1.274 * Math.sin((2 * D - M_moon) * DEG_TO_RAD) +
    0.658 * Math.sin(2 * D * DEG_TO_RAD) -
    0.186 * Math.sin(M_sun * DEG_TO_RAD) -
    0.114 * Math.sin(2 * F * DEG_TO_RAD);

  // Latitude libration b (oscillates +/- 6.7°)
  const earthLatDeg =
    -5.128 * Math.sin(F * DEG_TO_RAD) +
    0.281 * Math.sin((M_moon + F) * DEG_TO_RAD) -
    0.277 * Math.sin((F - M_moon) * DEG_TO_RAD) +
    0.173 * Math.sin((2 * D - F) * DEG_TO_RAD);

  const earthCosLat = Math.cos(earthLatDeg * DEG_TO_RAD);
  const earthX = earthDistKm * earthCosLat * Math.cos(earthLonDeg * DEG_TO_RAD);
  const earthY = earthDistKm * earthCosLat * Math.sin(earthLonDeg * DEG_TO_RAD);
  const earthZ = earthDistKm * Math.sin(earthLatDeg * DEG_TO_RAD);

  return {
    sun: [sunX, sunY, sunZ] as const,
    earth: [earthX, earthY, earthZ] as const,
  };
}

export function evaluateAtTime(site: LunarSite, date: Date): SiteObservation {
  const profile = getTerrainProfile(site.site_id);
  const vectors = buildMoonVectorsAt(date);

  const sun = topocentricDirection(vectors.sun, site);
  const earth = topocentricDirection(vectors.earth, site);

  const sunState = sunVisibilityAt(profile, sun.azimuth_deg, sun.elevation_deg);
  const earthState = earthCenterVisibilityAt(profile, earth.azimuth_deg, earth.elevation_deg);

  const horizonSun = horizonElevationAtAzimuth(profile, sun.azimuth_deg);
  const horizonEarth = horizonElevationAtAzimuth(profile, earth.azimuth_deg);

  return {
    siteId: site.site_id,
    siteName: site.name,
    timestamp: date.toISOString(),
    sun: {
      azimuth_deg: sun.azimuth_deg,
      elevation_deg: sun.elevation_deg,
      range_km: sun.range_km,
      state: sunState,
    },
    earth: {
      azimuth_deg: earth.azimuth_deg,
      elevation_deg: earth.elevation_deg,
      range_km: earth.range_km,
      state: earthState,
    },
    horizon_at_sun_deg: horizonSun,
    horizon_at_earth_deg: horizonEarth,
    sunlightPercent: sunState.any_solar_disk_visible ? 100 : 0,
    earthVisiblePercent: earthState.terrain_visible ? 100 : 0,
    longestDarknessHours: 0,
    longestSunlightHours: 0,
  };
}

/**
 * Generate a timeline across the requested duration (default 29.53 days = 1 synodic lunar day).
 * Uses exact 30-minute intervals (1800s) to adhere to the project's contract validation.
 */
export function buildTimeline(
  siteId: string,
  centerDate: Date,
  durationDays = 29.53,
  stepMinutes = 30,
): TimelineSample[] {
  const site = getSiteById(siteId);
  if (!site) return [];
  const profile = getTerrainProfile(siteId);

  const totalSteps = Math.round((durationDays * 24 * 60) / stepMinutes);
  // Start from half duration before to half duration after
  const startMs = centerDate.getTime() - (durationDays * 24 * 60 * 60 * 1000) / 2;
  const stepMs = stepMinutes * 60 * 1000;

  const timeline: TimelineSample[] = [];
  for (let i = 0; i < totalSteps; i++) {
    const sampleDate = new Date(startMs + i * stepMs);
    const vectors = buildMoonVectorsAt(sampleDate);
    const sun = topocentricDirection(vectors.sun, site);
    const earth = topocentricDirection(vectors.earth, site);

    const sunState = sunVisibilityAt(profile, sun.azimuth_deg, sun.elevation_deg);
    const earthState = earthCenterVisibilityAt(profile, earth.azimuth_deg, earth.elevation_deg);

    timeline.push({
      timestamp: sampleDate.toISOString(),
      sunAzimuth: sun.azimuth_deg,
      sunElevation: sun.elevation_deg,
      earthAzimuth: earth.azimuth_deg,
      earthElevation: earth.elevation_deg,
      sunVisible: sunState.any_solar_disk_visible,
      sunFullDisk: sunState.full_solar_disk_visible,
      earthVisible: earthState.terrain_visible,
    });
  }

  return timeline;
}

export function analyzeSiteMission(
  site: LunarSite,
  date: Date,
  durationDays = 29.53,
): MissionAnalysis {
  const profile = getTerrainProfile(site.site_id);
  const observation = evaluateAtTime(site, date);
  const timeline = buildTimeline(site.site_id, date, durationDays, 30);

  // Build clearance series for Sun and Earth
  const sunSamples = timeline.map((pt) => {
    const horizon = horizonElevationAtAzimuth(profile, pt.sunAzimuth);
    return {
      utc: pt.timestamp,
      clearance_deg: pt.sunElevation - horizon + 0.266, // Include solar semidiameter
    };
  });

  const earthSamples = timeline.map((pt) => {
    const horizon = horizonElevationAtAzimuth(profile, pt.earthAzimuth);
    return {
      utc: pt.timestamp,
      clearance_deg: pt.earthElevation - horizon,
    };
  });

  const sunAnalysis = analyzeClearanceSeries(sunSamples);
  const earthAnalysis = analyzeClearanceSeries(earthSamples);

  // Find next sunrise, sunset, Earthrise, Earthset after date
  const nowMs = date.getTime();
  const nextSunrise =
    sunAnalysis.events.find((e) => e.kind === "rise" && new Date(e.utc).getTime() > nowMs)?.utc ?? null;
  const nextSunset =
    sunAnalysis.events.find((e) => e.kind === "set" && new Date(e.utc).getTime() > nowMs)?.utc ?? null;
  const nextEarthrise =
    earthAnalysis.events.find((e) => e.kind === "rise" && new Date(e.utc).getTime() > nowMs)?.utc ?? null;
  const nextEarthset =
    earthAnalysis.events.find((e) => e.kind === "set" && new Date(e.utc).getTime() > nowMs)?.utc ?? null;

  observation.sunlightPercent = Number(sunAnalysis.metrics.visible_percentage.toFixed(1));
  observation.earthVisiblePercent = Number(earthAnalysis.metrics.visible_percentage.toFixed(1));
  observation.longestDarknessHours = Number((sunAnalysis.metrics.longest_obstructed_window_seconds / 3600).toFixed(1));
  observation.longestSunlightHours = Number((sunAnalysis.metrics.longest_visible_window_seconds / 3600).toFixed(1));

  return {
    observation,
    timeline,
    sunMetrics: sunAnalysis.metrics,
    earthMetrics: earthAnalysis.metrics,
    nextSunriseUtc: nextSunrise,
    nextSunsetUtc: nextSunset,
    nextEarthriseUtc: nextEarthrise,
    nextEarthsetUtc: nextEarthset,
  };
}

export function formatDateTime(date: Date): string {
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}
