import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const errors = [];

function fail(msg) {
  errors.push(msg);
}

function checkArray(arr, name, min, max, expectedLen) {
  if (!Array.isArray(arr) || arr.length === 0) {
    fail(`${name} must be a non-empty array`);
    return;
  }
  if (expectedLen !== undefined && arr.length !== expectedLen) {
    fail(`${name} length ${arr.length} !== ${expectedLen}`);
  }
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      fail(`${name}[${i}] is not a finite number`);
      break;
    }
    if (v < min || v > max) {
      fail(`${name}[${i}] (${v}) out of bounds [${min}, ${max}]`);
      break;
    }
  }
}

const sitesPath = path.join(DATA_DIR, "sites.json");
if (!fs.existsSync(sitesPath)) {
  fail("Missing public/data/sites.json");
} else {
  const sites = JSON.parse(fs.readFileSync(sitesPath, "utf8"));
  if (!Array.isArray(sites) || sites.length === 0) {
    fail("sites.json must be a non-empty array");
  } else {
    for (const site of sites) {
      for (const key of [
        "id",
        "name",
        "lat",
        "lon",
        "type",
        "source_url",
        "description",
      ]) {
        if (!(key in site)) fail(`Site missing key "${key}"`);
      }
      if (!/^[a-z0-9_]+$/.test(site.id)) {
        fail(`Site id "${site.id}" must be lowercase alphanumeric/underscore`);
      }

      const ephPath = path.join(DATA_DIR, "ephemeris", `${site.id}.json`);
      if (!fs.existsSync(ephPath)) {
        fail(`Missing ephemeris file for ${site.id}`);
      } else {
        const eph = JSON.parse(fs.readFileSync(ephPath, "utf8"));
        if (eph.site_id !== site.id) {
          fail(`ephemeris/${site.id}.json site_id mismatch: ${eph.site_id}`);
        }
        if (Number.isNaN(Date.parse(eph.start_utc))) {
          fail(`ephemeris/${site.id}.json invalid start_utc`);
        }
        if (typeof eph.step_minutes !== "number" || eph.step_minutes <= 0) {
          fail(`ephemeris/${site.id}.json invalid step_minutes`);
        }
        const len = eph.sun_az?.length;
        checkArray(eph.sun_az, `${site.id}.sun_az`, 0, 360, len);
        checkArray(eph.sun_el, `${site.id}.sun_el`, -90, 90, len);
        checkArray(eph.earth_az, `${site.id}.earth_az`, 0, 360, len);
        checkArray(eph.earth_el, `${site.id}.earth_el`, -90, 90, len);

        const sMin = Math.min(...eph.sun_el).toFixed(2);
        const sMax = Math.max(...eph.sun_el).toFixed(2);
        const eMin = Math.min(...eph.earth_el).toFixed(2);
        const eMax = Math.max(...eph.earth_el).toFixed(2);
        console.log(
          `[OK] ${site.id}: ${len} steps | Sun el [${sMin}°, ${sMax}°] | Earth el [${eMin}°, ${eMax}°]`
        );
      }

      const horPath = path.join(DATA_DIR, "horizon", `${site.id}.json`);
      if (fs.existsSync(horPath)) {
        const hor = JSON.parse(fs.readFileSync(horPath, "utf8"));
        if (hor.site_id !== site.id) {
          fail(`horizon/${site.id}.json site_id mismatch`);
        }
        checkArray(hor.elev_deg, `${site.id}.elev_deg`, -90, 90, 360);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Contract validation failed:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log("All public/data JSON files passed the data contract.");
