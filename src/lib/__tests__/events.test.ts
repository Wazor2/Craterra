import { describe, expect, it } from "vitest";
import {
  currentState,
  findCrossings,
  marginSeries,
  nextEvent,
  simplePowerIndex,
  timeUntil,
} from "../events";
import { horizonAt, isVisible, margin, normaliseAz } from "../geometry";
import type { Ephemeris, Horizon } from "../types";

function flatHorizon(siteId = "test_site"): Horizon {
  return {
    site_id: siteId,
    az_step_deg: 1,
    elev_deg: new Array(360).fill(0),
    mast_height_m: 2,
    dem_source: "synthetic",
  };
}

function makeSinusoidEphemeris(
  hours = 48,
  periodHours = 24,
  offsetDeg = 0,
  amplitudeDeg = 5
): Ephemeris {
  const sun_az: number[] = [];
  const sun_el: number[] = [];
  const earth_az: number[] = [];
  const earth_el: number[] = [];
  for (let i = 0; i <= hours; i++) {
    sun_az.push((i * 15) % 360);
    sun_el.push(
      offsetDeg + amplitudeDeg * Math.sin((2 * Math.PI * i) / periodHours)
    );
    earth_az.push(0);
    earth_el.push(10);
  }
  return {
    site_id: "test_site",
    start_utc: "2026-12-01T00:00:00Z",
    step_minutes: 60,
    sun_az,
    sun_el,
    earth_az,
    earth_el,
  };
}

describe("geometry helpers", () => {
  it("normalises azimuth into [0, 360) and wraps 359.5..0.5", () => {
    expect(normaliseAz(-10)).toBe(350);
    expect(normaliseAz(360)).toBe(0);
    expect(normaliseAz(725)).toBe(5);

    const elev = new Array(360).fill(0);
    elev[359] = 4;
    elev[0] = 8;
    elev[1] = 10;

    expect(horizonAt(elev, 359.5)).toBeCloseTo(6, 5);
    expect(horizonAt(elev, 0.5)).toBeCloseTo(9, 5);
  });

  it("enforces strict visibility above horizon (no refraction)", () => {
    expect(isVisible(margin(0, 0))).toBe(false);
    expect(isVisible(margin(0.001, 0))).toBe(true);
    expect(isVisible(margin(-0.1, 0))).toBe(false);
  });
});

describe("events module", () => {
  it("finds exact interpolated crossings on a synthetic sinusoid with flat horizon", () => {
    // At t=0: sin(0)=0, t=1..11 >0, t=12: 0, t=13..23 <0, t=24: 0
    // Shift by -0.5 h so crossings happen cleanly between integer hours
    const startMs = Date.parse("2026-12-01T00:00:00Z");
    const sun_el = Array.from({ length: 25 }, (_, i) =>
      5 * Math.sin((2 * Math.PI * (i - 0.5)) / 24)
    );
    const eph: Ephemeris = {
      site_id: "test_site",
      start_utc: "2026-12-01T00:00:00Z",
      step_minutes: 60,
      sun_az: sun_el.map((_, i) => (i * 15) % 360),
      sun_el,
      earth_az: sun_el.map(() => 0),
      earth_el: sun_el.map(() => 5),
    };
    const h = flatHorizon();
    const margins = marginSeries(eph, h, "sun");
    const epochs = sun_el.map((_, i) => startMs + i * 3600_000);
    const crossings = findCrossings(margins, epochs);

    expect(crossings.length).toBe(2);
    expect(crossings[0].type).toBe("rise");
    expect(crossings[0].time).toBeCloseTo(startMs + 0.5 * 3600_000, -3);
    expect(crossings[1].type).toBe("set");
    expect(crossings[1].time).toBeCloseTo(startMs + 12.5 * 3600_000, -3);
  });

  it("shifts crossing time when terrain has a hill at Sun azimuth", () => {
    const startMs = Date.parse("2026-12-01T00:00:00Z");
    const eph = makeSinusoidEphemeris(48, 24, 0, 5);
    const flat = flatHorizon();
    const hilly = flatHorizon();
    // Put a 3 deg ridge along azimuths 0..90 (covering hours 24..30)
    for (let az = 0; az <= 90; az++) {
      hilly.elev_deg[az] = 3;
    }

    const fromMs = startMs + 13 * 3600_000;
    const riseFlat = nextEvent(eph, flat, "sun", fromMs, "rise");
    const riseHilly = nextEvent(eph, hilly, "sun", fromMs, "rise");

    expect(riseFlat).not.toBeNull();
    expect(riseHilly).not.toBeNull();
    expect(riseHilly!).toBeGreaterThan(riseFlat!);
  });

  it("returns null for always-lit series with no crossings", () => {
    const startMs = Date.parse("2026-12-01T00:00:00Z");
    const eph = makeSinusoidEphemeris(48, 24, 8, 2); // always between +6 and +10 deg
    const h = flatHorizon();
    expect(nextEvent(eph, h, "sun", startMs, "set")).toBeNull();
    expect(nextEvent(eph, h, "sun", startMs, "rise")).toBeNull();
  });

  it("ignores grazing series that touches zero without crossing", () => {
    const startMs = Date.parse("2026-12-01T00:00:00Z");
    const margins = [2, 1, 0, 1, 2, 1, 0, 0, 1];
    const epochs = margins.map((_, i) => startMs + i * 3600_000);
    expect(findCrossings(margins, epochs)).toEqual([]);

    const negMargins = [-2, -1, 0, -1, -2];
    const negEpochs = negMargins.map((_, i) => startMs + i * 3600_000);
    expect(findCrossings(negMargins, negEpochs)).toEqual([]);
  });

  it("clamps dates outside data range and flags outOfRange", () => {
    const startMs = Date.parse("2026-12-01T00:00:00Z");
    const eph = makeSinusoidEphemeris(24, 24, 2, 1);
    const h = flatHorizon();

    const before = currentState(eph, h, startMs - 10 * 3600_000);
    expect(before.outOfRange).toBe("before");
    expect(before.clampedEpochMs).toBe(startMs);

    const after = currentState(eph, h, startMs + 100 * 3600_000);
    expect(after.outOfRange).toBe("after");
    expect(after.clampedEpochMs).toBe(startMs + 24 * 3600_000);
    expect(nextEvent(eph, h, "sun", startMs + 100 * 3600_000, "set")).toBeNull();
  });

  it("formats timeUntil cleanly and computes simplePowerIndex only when visible", () => {
    const now = Date.parse("2026-12-01T00:00:00Z");
    const target = now + ((3 * 24 + 4) * 60 + 12) * 60_000;
    expect(timeUntil(target, now)).toBe("3 d 4 h 12 min");
    expect(timeUntil(null, now)).toBeNull();

    expect(simplePowerIndex(30, true)).toBeCloseTo(0.5, 5);
    expect(simplePowerIndex(30, false)).toBe(0);
    expect(simplePowerIndex(-2, true)).toBe(0);
  });
});
