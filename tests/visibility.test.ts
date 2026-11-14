import assert from "node:assert/strict";
import test from "node:test";
import type { TerrainProfile } from "../src/lib/contracts/types";
import {
  analyzeClearanceSeries,
  earthCenterVisibilityAt,
  horizonElevationAtAzimuth,
  sunVisibilityAt,
} from "../src/lib/science/visibility";

// The zero/elevated horizon below is an explicitly synthetic validator fixture.
const profile: TerrainProfile = {
  schema_version: 1,
  site_id: "visibility-fixture",
  azimuth_start_deg: 0,
  azimuth_step_deg: 1,
  azimuth_convention: "clockwise_from_north",
  horizon_elevation_deg: Array.from({ length: 360 }, () => 0),
  mast_height_m: 0,
  horizon_method: "ray_max_elevation_with_lunar_curvature",
  generated_utc: "2026-11-14T00:00:00Z",
  dem: {
    product_id: "synthetic-fixture",
    source_url: "https://example.test/visibility-fixture",
    resolution_m: 1,
    projection: "synthetic fixture grid",
    reference_frame: "MOON_ME test fixture",
    vertical_datum: "synthetic fixture datum",
    max_ray_distance_m: 1000,
    interpolated_fraction: 0,
    vertical_uncertainty_rms_m: 0,
    quality_notes: "Synthetic test profile; not measured lunar terrain.",
  },
};

function horizonWithSeam(): TerrainProfile {
  const horizon = Array.from({ length: 360 }, () => 0);
  horizon[359] = 4;
  horizon[0] = 8;
  return { ...profile, horizon_elevation_deg: horizon };
}

test("terrain horizon interpolation wraps between 359° and 0°", () => {
  assert.equal(horizonElevationAtAzimuth(horizonWithSeam(), 359.5), 6);
  assert.equal(horizonElevationAtAzimuth(horizonWithSeam(), -0.5), 6);
});

test("Sun state distinguishes the mathematical horizontal, terrain and finite disk", () => {
  const raisedHorizon = { ...profile, horizon_elevation_deg: Array.from({ length: 360 }, () => 2) };
  const blockedCenter = sunVisibilityAt(raisedHorizon, 180, 1);
  assert.equal(blockedCenter.center_above_mathematical_horizon, true);
  assert.equal(blockedCenter.center_terrain_visible, false);
  assert.equal(blockedCenter.any_solar_disk_visible, false);
  assert.equal(blockedCenter.refraction_applied, false);

  const partialDisk = sunVisibilityAt(raisedHorizon, 180, 2.1);
  assert.equal(partialDisk.disk_state, "partial");
  const fullDisk = sunVisibilityAt(raisedHorizon, 180, 2.3);
  assert.equal(fullDisk.disk_state, "full");
});

test("Earth visibility is explicitly its centre's geometric terrain visibility", () => {
  const raisedHorizon = { ...profile, horizon_elevation_deg: Array.from({ length: 360 }, () => 3) };
  const state = earthCenterVisibilityAt(raisedHorizon, 270, 2);
  assert.equal(state.above_mathematical_horizon, true);
  assert.equal(state.terrain_visible, false);
  assert.equal(state.meaning, "target-centre geometric visibility only");
});

test("rise/set events interpolate zero-clearance times and summarize windows", () => {
  const samples = [
    { utc: "2026-11-14T00:00:00Z", clearance_deg: -1 },
    { utc: "2026-11-14T00:30:00Z", clearance_deg: 1 },
    { utc: "2026-11-14T01:00:00Z", clearance_deg: 1 },
    { utc: "2026-11-14T01:30:00Z", clearance_deg: -1 },
  ];
  const result = analyzeClearanceSeries(samples);
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].utc, "2026-11-14T00:15:00.000Z");
  assert.equal(result.events[0].kind, "rise");
  assert.equal(result.events[1].utc, "2026-11-14T01:15:00.000Z");
  assert.equal(result.events[1].kind, "set");
  assert.equal(result.metrics.visible_seconds, 3600);
  assert.equal(result.metrics.coverage_seconds, 5400);
  assert.ok(Math.abs(result.metrics.visible_percentage - 100 * (2 / 3)) < 1e-12);
  assert.equal(result.metrics.longest_obstructed_window_seconds, 900);
  assert.equal(result.interpolation, "linear_clearance_between_30m_samples");
});

test("visibility analysis rejects gaps outside the declared 30-minute sampling contract", () => {
  assert.throws(
    () => analyzeClearanceSeries([
      { utc: "2026-11-14T00:00:00Z", clearance_deg: -1 },
      { utc: "2026-11-14T01:00:00Z", clearance_deg: 1 },
    ]),
    /30-minute intervals/,
  );
});
