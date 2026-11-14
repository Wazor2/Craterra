import assert from "node:assert/strict";
import test from "node:test";
import { getSiteById } from "../src/lib/data/site-catalogue";
import {
  buildMoonVectorsAt,
  evaluateAtTime,
  analyzeSiteMission,
} from "../src/lib/science/mission";
import { MOON_SITE_ELEVATION_DATUM } from "../src/lib/science/geometry";

test("Moon celestial vectors have physically accurate distances and coordinates in MOON_ME", () => {
  const date = new Date("2026-11-14T12:00:00Z");
  const vectors = buildMoonVectorsAt(date);

  // Sun distance must be approximately 1 AU (~1.47e8 to 1.52e8 km)
  const sunDist = Math.hypot(...vectors.sun);
  assert.ok(sunDist > 147_000_000 && sunDist < 153_000_000);

  // Earth distance must be approximately 360,000 to 406,000 km
  const earthDist = Math.hypot(...vectors.earth);
  assert.ok(earthDist > 355_000 && earthDist < 410_000);

  // Earth must be on the near side (+X direction towards prime meridian in MOON_ME)
  assert.ok(vectors.earth[0] > 0);

  // Subsolar latitude (Z/distance) must not exceed lunar obliquity to ecliptic (~1.55°)
  const subsolarLatDeg = Math.asin(vectors.sun[2] / sunDist) * (180 / Math.PI);
  assert.ok(Math.abs(subsolarLatDeg) <= 1.55);
});

test("Sanity Check 3: Far side of the Moon has no direct Earth line-of-sight", () => {
  const farSideSite = {
    site_id: "far-side-test",
    name: "Far Side Crater",
    category: "equatorial_reference" as const,
    latitude_deg: 0,
    longitude_east_deg: -180, // Far side meridian
    latitude_type: "planetocentric" as const,
    frame: "MOON_ME" as const,
    elevation_m: 0,
    elevation_datum: MOON_SITE_ELEVATION_DATUM,
    description: "Far side test point",
    provenance: {
      coordinate_status: "published" as const,
      source_urls: ["https://example.test"],
      note: "Far side check",
    },
  };

  const evalFarSide = evaluateAtTime(farSideSite, new Date("2026-11-14T12:00:00Z"));
  // Earth must be below the local horizontal (elevation < 0)
  assert.ok(evalFarSide.earth.elevation_deg < -80);
  assert.equal(evalFarSide.earth.state.terrain_visible, false);
});

test("Equatorial reference site (0°N, 0°E) sees Earth near Zenith (~90°)", () => {
  const eqSite = getSiteById("equatorial-reference");
  assert.ok(eqSite);

  const evalEq = evaluateAtTime(eqSite, new Date("2026-11-14T12:00:00Z"));
  // Due to lunar librations (+/- 7°), Earth elevation at Sinus Medii is between 82° and 90°
  assert.ok(evalEq.earth.elevation_deg > 80 && evalEq.earth.elevation_deg <= 90);
  assert.equal(evalEq.earth.state.terrain_visible, true);
});

test("South pole candidate site has grazing solar elevation consistent with lunar geometry", () => {
  const shackleton = getSiteById("shackleton-rim");
  assert.ok(shackleton);

  const evalShackleton = evaluateAtTime(shackleton, new Date("2026-11-14T12:00:00Z"));
  // At polar latitudes, Sun elevation never exceeds ~2.5° above horizontal
  assert.ok(evalShackleton.sun.elevation_deg > -3.0 && evalShackleton.sun.elevation_deg < 3.0);
});

test("Mission analysis computes valid percentages and non-empty timelines", () => {
  const shackleton = getSiteById("shackleton-rim");
  assert.ok(shackleton);

  const analysis = analyzeSiteMission(shackleton, new Date("2026-11-14T12:00:00Z"), 7);
  assert.ok(analysis.timeline.length > 0);
  assert.ok(analysis.observation.sunlightPercent >= 0 && analysis.observation.sunlightPercent <= 100);
  assert.ok(analysis.observation.earthVisiblePercent >= 0 && analysis.observation.earthVisiblePercent <= 100);
});
