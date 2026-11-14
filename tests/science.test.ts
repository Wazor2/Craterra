import assert from "node:assert/strict";
import test from "node:test";
import {
  validateEphemerisData,
  validateSiteCatalogue,
  validateTerrainProfile,
} from "../src/lib/contracts/validate";

// Synthetic fixtures below exercise validators only. They are not observations or site data.
const syntheticKernel = {
  filename: "fixture.bsp",
  role: "spk",
  source_url: "https://example.test/fixture.bsp",
  sha256: "a".repeat(64),
};

function syntheticEphemeris() {
  const firstUtc = "2026-11-14T00:00:00Z";
  const lastUtc = "2026-11-14T00:30:00Z";
  return {
    schema_version: 1,
    metadata: {
      origin: "MOON",
      frame: "MOON_ME",
      time_standard: "UTC",
      distance_unit: "km",
      angle_unit: "deg",
      sample_interval_seconds: 1800,
      aberration_correction: "LT+S",
      coverage_start_utc: firstUtc,
      coverage_end_utc: lastUtc,
      generated_utc: "2026-11-14T01:00:00Z",
      kernels: [syntheticKernel],
    },
    records: [
      {
        utc: firstUtc,
        et_tdb_seconds: 847987269.184,
        sun_from_moon_km: [149_600_000, 0, 0],
        earth_from_moon_km: [380_000, 0, 0],
        sun_distance_km: 149_600_000,
        earth_distance_km: 380_000,
      },
      {
        utc: lastUtc,
        et_tdb_seconds: 847989069.184,
        sun_from_moon_km: [149_600_000, 0, 0],
        earth_from_moon_km: [380_000, 0, 0],
        sun_distance_km: 149_600_000,
        earth_distance_km: 380_000,
      },
    ],
  };
}

function syntheticSiteCatalogue() {
  return {
    schema_version: 1,
    coordinate_frame: "MOON_ME",
    latitude_type: "planetocentric",
    longitude_convention: "east_positive",
    sites: [
      {
        site_id: "fixture-site",
        name: "Synthetic validator fixture",
        category: "equatorial_reference",
        latitude_deg: 0,
        longitude_east_deg: 0,
        latitude_type: "planetocentric",
        frame: "MOON_ME",
        elevation_m: null,
        elevation_datum: null,
        description: "Synthetic record used only by unit tests.",
        provenance: {
          coordinate_status: "published",
          source_urls: ["https://example.test/fixture"],
          note: "Test fixture; not a real landing site.",
        },
      },
    ],
  };
}

function syntheticTerrainProfile() {
  return {
    schema_version: 1,
    site_id: "fixture-site",
    azimuth_start_deg: 0,
    azimuth_step_deg: 1,
    azimuth_convention: "clockwise_from_north",
    horizon_elevation_deg: Array.from({ length: 360 }, () => 0),
    mast_height_m: 0,
    horizon_method: "ray_max_elevation_with_lunar_curvature",
    generated_utc: "2026-11-14T01:00:00Z",
    dem: {
      product_id: "synthetic-fixture",
      source_url: "https://example.test/fixture-dem",
      resolution_m: 5,
      projection: "synthetic fixture grid",
      reference_frame: "MOON_ME test fixture",
      vertical_datum: "synthetic fixture datum",
      max_ray_distance_m: 1000,
      interpolated_fraction: 0,
      vertical_uncertainty_rms_m: 0,
      quality_notes: "Synthetic fixture; not measured terrain.",
    },
  };
}

test("ephemeris contract accepts a structurally valid synthetic fixture", () => {
  const result = validateEphemerisData(syntheticEphemeris());
  assert.equal(result.success, true);
});

test("ephemeris contract rejects normalized/mismatched vectors and bad time steps", () => {
  const candidate = syntheticEphemeris();
  candidate.records[1].earth_distance_km = 1;
  const result = validateEphemerisData(candidate);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.issues.some((issue) => issue.path.endsWith("earth_distance_km")));
  }
});

test("site contract requires sourced coordinates and valid east-positive longitude", () => {
  const candidate = syntheticSiteCatalogue();
  const site = candidate.sites[0];
  site.longitude_east_deg = 180;
  site.provenance.source_urls = [];
  const result = validateSiteCatalogue(candidate);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.issues.some((issue) => issue.path.endsWith("longitude_east_deg")));
    assert.ok(result.issues.some((issue) => issue.path.endsWith("source_urls")));
  }
});

test("terrain contract requires exactly 360 finite, sourced horizon samples", () => {
  const candidate = syntheticTerrainProfile();
  candidate.horizon_elevation_deg[359] = Number.NaN;
  const result = validateTerrainProfile(candidate);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.issues.some((issue) => issue.path.endsWith("horizon_elevation_deg[359]")));
  }
});

test("production data/sites/sites.json passes full contract validation", async () => {
  const fs = await import("node:fs");
  const raw = fs.readFileSync("./data/sites/sites.json", "utf-8");
  const parsed = JSON.parse(raw);
  const result = validateSiteCatalogue(parsed);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.value.sites.length, 8);
  }
});

test("production data/terrain/terrain_profiles.json profiles all pass contract validation", async () => {
  const fs = await import("node:fs");
  const raw = fs.readFileSync("./data/terrain/terrain_profiles.json", "utf-8");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.schema_version, 1);
  assert.equal(parsed.profiles.length, 8);
  for (const profile of parsed.profiles) {
    const result = validateTerrainProfile(profile);
    assert.equal(result.success, true);
  }
});

