import test from "node:test";
import assert from "node:assert/strict";
import { visibility, nextChange, nextTransition, windows, countVisible, longestRun, windowStats } from "./events";
import type { Ephemeris, Horizon } from "./data";

const flat: Horizon = { site_id: "t", az_step_deg: 1, elev_deg: Array(360).fill(0), mast_height_m: 0, dem_source: "test" };
const eph: Ephemeris = {
  site_id: "t", start_utc: "2026-12-01T00:00:00Z", step_minutes: 60,
  sun_az: [0, 0, 0, 0, 0, 0], sun_el: [-1, 1, 2, 1, -1, -2],
  earth_az: [0, 0, 0, 0, 0, 0], earth_el: [3, 3, -1, -1, 3, 3],
};

test("visibility uses horizon", () => {
  assert.deepEqual(visibility(eph, flat, "sun"), [false, true, true, true, false, false]);
  const high: Horizon = { ...flat, elev_deg: Array(360).fill(1.5) };
  assert.deepEqual(visibility(eph, high, "sun"), [false, false, true, false, false, false]);
});
test("nextChange / nextTransition", () => {
  const v = [false, true, true, false, false, true];
  assert.equal(nextChange(v, 0), 1);
  assert.equal(nextChange(v, 1), 3);
  assert.equal(nextChange(v, 5), null);
  assert.equal(nextTransition(v, 1, false), 3);
  assert.equal(nextTransition(v, 1, true), 5);
});
test("windows / counts / runs", () => {
  const v = [true, true, false, true, false, false];
  assert.deepEqual(windows(v), [[0, 2], [3, 4]]);
  assert.equal(countVisible(v, 0, 6), 3);
  assert.equal(longestRun(v, 0, 6, false), 2);
});
test("windowStats hours", () => {
  const s = windowStats({ sun: visibility(eph, flat, "sun"), earth: visibility(eph, flat, "earth") }, 0, 6, 60);
  assert.equal(s.sunH, 3);
  assert.equal(s.earthH, 4);
  assert.equal(s.bothH, 1);
  assert.equal(s.longestDarkH, 2);
});
