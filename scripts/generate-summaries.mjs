import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "public", "data");

function normaliseAz(az) {
  const m = ((az % 360) + 360) % 360;
  return m === 360 ? 0 : m;
}

function horizonAt(elevDeg, az) {
  const a = normaliseAz(az);
  const i0 = Math.floor(a) % 360;
  const i1 = (i0 + 1) % 360;
  const frac = a - Math.floor(a);
  return elevDeg[i0] * (1 - frac) + elevDeg[i1] * frac;
}

const sites = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "sites.json"), "utf8")
);
const summaries = {};

for (const site of sites) {
  const ephPath = path.join(DATA_DIR, "ephemeris", `${site.id}.json`);
  const horPath = path.join(DATA_DIR, "horizon", `${site.id}.json`);
  if (!fs.existsSync(ephPath)) continue;

  const eph = JSON.parse(fs.readFileSync(ephPath, "utf8"));
  const hor = fs.existsSync(horPath)
    ? JSON.parse(fs.readFileSync(horPath, "utf8"))
    : { elev_deg: new Array(360).fill(0), mast_height_m: 0 };

  const startMs = Date.parse(eph.start_utc);
  const stepHours = eph.step_minutes / 60;
  const n = eph.sun_el.length;

  let sunlitSteps = 0;
  let earthSteps = 0;
  let sunMin = Infinity;
  let sunMax = -Infinity;
  let earthMin = Infinity;
  let earthMax = -Infinity;
  let sunMarginMax = -Infinity;
  let sunMarginMin = Infinity;

  let darkRun = 0;
  let darkRunStartIdx = 0;
  let bestDarkSteps = 0;
  let bestDarkStartIdx = 0;

  for (let i = 0; i < n; i++) {
    const sEl = eph.sun_el[i];
    const eEl = eph.earth_el[i];
    const sH = horizonAt(hor.elev_deg, eph.sun_az[i]);
    const eH = horizonAt(hor.elev_deg, eph.earth_az[i]);
    const sMargin = sEl - sH;
    const eMargin = eEl - eH;

    if (sEl < sunMin) sunMin = sEl;
    if (sEl > sunMax) sunMax = sEl;
    if (eEl < earthMin) earthMin = eEl;
    if (eEl > earthMax) earthMax = eEl;
    if (sMargin < sunMarginMin) sunMarginMin = sMargin;
    if (sMargin > sunMarginMax) sunMarginMax = sMargin;

    if (sMargin > 0) {
      sunlitSteps++;
      darkRun = 0;
    } else {
      if (darkRun === 0) darkRunStartIdx = i;
      darkRun++;
      if (darkRun > bestDarkSteps) {
        bestDarkSteps = darkRun;
        bestDarkStartIdx = darkRunStartIdx;
      }
    }

    if (eMargin > 0) {
      earthSteps++;
    }
  }

  const sunlitPct = Math.round((sunlitSteps / n) * 1000) / 10;
  const earthPct = Math.round((earthSteps / n) * 1000) / 10;
  const longestDarkHours = Math.round(bestDarkSteps * stepHours * 10) / 10;
  const longestDarkStartUtc =
    bestDarkSteps > 0
      ? new Date(startMs + bestDarkStartIdx * eph.step_minutes * 60_000)
          .toISOString()
          .slice(0, 16) + " UTC"
      : null;

  const hMin = Math.round(Math.min(...hor.elev_deg) * 100) / 100;
  const hMax = Math.round(Math.max(...hor.elev_deg) * 100) / 100;

  const darkPhrase =
    longestDarkHours > 0
      ? `the longest continuous dark stretch is ${longestDarkHours} h starting ${longestDarkStartUtc}`
      : "there are no continuous dark outages in the loaded window";

  summaries[site.id] = {
    plain_text: `At ${site.name}, the Sun is above local terrain for ${sunlitPct}% of the 90-day window and Earth is visible for ${earthPct}%; ${darkPhrase}.`,
    expert_text: `Sun elevation spans ${sunMin.toFixed(2)}° to ${sunMax.toFixed(2)}° (terrain margin ${sunMarginMin.toFixed(2)}° to ${sunMarginMax.toFixed(2)}° over ${hMin.toFixed(2)}°..${hMax.toFixed(2)}° horizon); Earth elevation spans ${earthMin.toFixed(2)}° to ${earthMax.toFixed(2)}° (${earthPct}% direct-to-Earth visibility).`,
    stats: {
      sunlit_pct: sunlitPct,
      earth_visible_pct: earthPct,
      longest_dark_hours: longestDarkHours,
      longest_dark_start_utc: longestDarkStartUtc,
      sun_el_min: Math.round(sunMin * 100) / 100,
      sun_el_max: Math.round(sunMax * 100) / 100,
      earth_el_min: Math.round(earthMin * 100) / 100,
      earth_el_max: Math.round(earthMax * 100) / 100,
      horizon_min: hMin,
      horizon_max: hMax,
    },
  };
}

fs.writeFileSync(
  path.join(DATA_DIR, "summaries.json"),
  JSON.stringify(summaries, null, 2) + "\n"
);

console.log(`Generated deterministic summaries for ${Object.keys(summaries).length} sites.`);
