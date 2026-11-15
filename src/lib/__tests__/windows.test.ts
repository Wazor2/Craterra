import { describe, expect, it } from "vitest";
import {
  earthVisibleHours,
  formatDeltaHours,
  longestRun,
  sunlitHours,
  windowStats,
} from "../windows";
import type { Ephemeris, Horizon } from "../types";

describe("windows module", () => {
  it("computes sunlitHours, earthVisibleHours, and longestRun accurately", () => {
    const margins = [1, 2, 0.5, -0.5, -1, 0.2, 0.4, 0.6, 0.8, -0.2];
    expect(sunlitHours(margins, 60)).toBe(7);
    expect(earthVisibleHours(margins, 60)).toBe(7);
    expect(longestRun(margins, 60, (m) => m > 0)).toBe(4);
    expect(longestRun(margins, 60, (m) => m <= 0)).toBe(2);
  });

  it("computes windowStats across a 7-day window and formats deltas", () => {
    // 10 days = 241 steps: alternating 24h sunlit, 24h dark
    const steps = 241;
    const sun_el = Array.from({ length: steps }, (_, i) =>
      Math.floor(i / 24) % 2 === 0 ? 2 : -2
    );
    const earth_el = Array.from({ length: steps }, (_, i) => (i < 120 ? 3 : -3));
    const eph: Ephemeris = {
      site_id: "test",
      start_utc: "2026-12-01T00:00:00Z",
      step_minutes: 60,
      sun_az: sun_el.map(() => 90),
      sun_el,
      earth_az: earth_el.map(() => 0),
      earth_el,
    };
    const h: Horizon = {
      site_id: "test",
      az_step_deg: 1,
      elev_deg: new Array(360).fill(0),
      mast_height_m: 2,
      dem_source: "synthetic",
    };

    const stats = windowStats(eph, h, Date.parse("2026-12-01T00:00:00Z"), 7);
    expect(stats.actualHoursEvaluated).toBe(168);
    expect(stats.sunlitHours).toBe(96); // days 0, 2, 4, 6 -> 4 * 24 = 96h
    expect(stats.longestSunlitHours).toBe(24);
    expect(stats.longestDarkHours).toBe(24);
    expect(stats.earthVisibleHours).toBe(120);
    expect(stats.longestEarthOutageHours).toBe(48);

    expect(formatDeltaHours(12.5)).toBe("+12.5 h");
    expect(formatDeltaHours(-4)).toBe("-4.0 h");
  });
});
