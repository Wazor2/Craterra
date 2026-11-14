import assert from "node:assert/strict";
import test from "node:test";
import type { LunarSite } from "../src/lib/contracts/types";
import {
  anglesFromEnu,
  enuFromMoonFixed,
  MOON_MEAN_RADIUS_KM,
  MOON_SITE_ELEVATION_DATUM,
  sitePositionKm,
  topocentricDirection,
} from "../src/lib/science/geometry";

// These synthetic vectors exercise coordinate math only; they are not ephemerides.
const fixtureSite: LunarSite = {
  site_id: "geometry-fixture",
  name: "Synthetic geometry test point",
  category: "equatorial_reference",
  latitude_deg: 0,
  longitude_east_deg: 0,
  latitude_type: "planetocentric",
  frame: "MOON_ME",
  elevation_m: 0,
  elevation_datum: MOON_SITE_ELEVATION_DATUM,
  description: "Synthetic unit-test coordinate, not a landing site.",
  provenance: {
    coordinate_status: "published",
    source_urls: ["https://example.test/geometry-fixture"],
    note: "Synthetic unit-test fixture only.",
  },
};

test("ENU and azimuth follow 0 north, 90 east, and elevation from local horizontal", () => {
  const north = enuFromMoonFixed([0, 0, 4], 0, 0);
  assert.equal(anglesFromEnu(north).azimuth_deg, 0);
  assert.equal(anglesFromEnu(north).elevation_deg, 0);

  const east = enuFromMoonFixed([0, 4, 0], 0, 0);
  assert.equal(anglesFromEnu(east).azimuth_deg, 90);
  assert.equal(anglesFromEnu(east).elevation_deg, 0);

  const up = enuFromMoonFixed([4, 0, 0], 0, 0);
  assert.equal(anglesFromEnu(up).elevation_deg, 90);
});

test("site radius uses the pinned NAIF mean sphere and a normalized height datum", () => {
  const position = sitePositionKm(fixtureSite);
  assert.ok(Math.abs(Math.hypot(...position) - MOON_MEAN_RADIUS_KM) < 1e-10);

  const unknownDatum = { ...fixtureSite, elevation_datum: "unknown height reference" };
  assert.throws(() => sitePositionKm(unknownDatum), /normalized to/);
  const missingHeight = { ...fixtureSite, elevation_m: null, elevation_datum: null };
  assert.throws(() => sitePositionKm(missingHeight), /elevation is required/);
});

test("topocentric Earth direction subtracts the site vector before deriving angles", () => {
  const moonCenteredEarth: [number, number, number] = [0, 384_400, 0];
  const direction = topocentricDirection(moonCenteredEarth, fixtureSite);
  assert.equal(direction.azimuth_deg, 90);
  assert.ok(Math.abs(direction.range_km - Math.hypot(384_400, MOON_MEAN_RADIUS_KM)) < 1e-8);
  assert.deepEqual(direction.topocentric_vector_km, [-MOON_MEAN_RADIUS_KM, 384_400, 0]);
  assert.equal(direction.topocentric_vector_km[0], -MOON_MEAN_RADIUS_KM);
});
