import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "public", "data");
const EPH_DIR = path.join(DATA_DIR, "ephemeris");
const HORIZON_DIR = path.join(DATA_DIR, "horizon");

fs.mkdirSync(EPH_DIR, { recursive: true });
fs.mkdirSync(HORIZON_DIR, { recursive: true });

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function normDeg(x) {
  const m = ((x % 360) + 360) % 360;
  return m === 360 ? 0 : m;
}

function round3(x) {
  return Math.round(x * 1000) / 1000;
}

/**
 * Compute selenocentric sub-Solar and sub-Earth coordinates (deg, East-positive)
 * using Meeus solar & lunar orbital elements + Cassini physical inclination (1.54242 deg).
 */
function subBodyCoords(epochMs) {
  const d = (epochMs - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;

  // Solar ecliptic longitude (deg)
  const Ms = normDeg(357.52911 + 0.98560028 * d);
  const Ls = normDeg(280.46646 + 0.98564736 * d);
  const lambdaSun =
    Ls + 1.914602 * Math.sin(Ms * DEG) + 0.019993 * Math.sin(2 * Ms * DEG);

  // Lunar mean orbital elements (Meeus Ch. 47)
  const Lp = normDeg(218.3164477 + 13.17639648 * d);
  const D = normDeg(297.8501921 + 12.19074912 * d);
  const Mp = normDeg(134.9633964 + 13.06499295 * d);
  const F = normDeg(93.272095 + 13.22935024 * d);
  const Omega = normDeg(125.0445479 - 0.05295377 * d);

  const lambdaMoon =
    Lp +
    6.288774 * Math.sin(Mp * DEG) +
    1.274027 * Math.sin((2 * D - Mp) * DEG) +
    0.658314 * Math.sin(2 * D * DEG) +
    0.213618 * Math.sin(2 * Mp * DEG) -
    0.185116 * Math.sin(Ms * DEG) -
    0.114332 * Math.sin(2 * F * DEG);

  const betaMoon =
    5.128122 * Math.sin(F * DEG) +
    0.280602 * Math.sin((Mp + F) * DEG) +
    0.277693 * Math.sin((Mp - F) * DEG) +
    0.173237 * Math.sin((2 * D - F) * DEG);

  const I = 1.54242; // Moon equator inclination to ecliptic (deg)

  // Earth selenographic sub-point (optical libration)
  const W = normDeg(lambdaMoon - Omega);
  const A =
    Math.sin(W * DEG) * Math.cos(betaMoon * DEG) * Math.cos(I * DEG) -
    Math.sin(betaMoon * DEG) * Math.sin(I * DEG);
  const B = Math.cos(W * DEG) * Math.cos(betaMoon * DEG);
  let earthLon = Math.atan2(A, B) * RAD - F;
  earthLon = ((earthLon + 540) % 360) - 180; // [-180, 180]
  const sinEarthLat =
    -Math.sin(W * DEG) * Math.cos(betaMoon * DEG) * Math.sin(I * DEG) -
    Math.sin(betaMoon * DEG) * Math.cos(I * DEG);
  const earthLat = Math.asin(Math.max(-1, Math.min(1, sinEarthLat))) * RAD;

  // Sun selenographic sub-point
  const Ws = normDeg(lambdaSun + 180 - Omega);
  const As = Math.sin(Ws * DEG) * Math.cos(I * DEG);
  const Bs = Math.cos(Ws * DEG);
  let sunLon = Math.atan2(As, Bs) * RAD - F;
  sunLon = normDeg(sunLon);
  const sinSunLat = -Math.sin(Ws * DEG) * Math.sin(I * DEG);
  const sunLat = Math.asin(Math.max(-1, Math.min(1, sinSunLat))) * RAD;

  return { sunLon, sunLat, earthLon: normDeg(earthLon), earthLat };
}

/**
 * Convert sub-body selenographic (lon, lat) to local horizon (az, el) at site (siteLat, siteLon).
 */
function bodyAzEl(siteLat, siteLon, bodyLon, bodyLat) {
  const phi = siteLat * DEG;
  const latB = bodyLat * DEG;
  const dLon = (bodyLon - siteLon) * DEG;

  const sinEl =
    Math.sin(phi) * Math.sin(latB) +
    Math.cos(phi) * Math.cos(latB) * Math.cos(dLon);
  const el = Math.asin(Math.max(-1, Math.min(1, sinEl))) * RAD;

  const y = Math.cos(latB) * Math.sin(dLon);
  const x =
    Math.cos(phi) * Math.sin(latB) -
    Math.sin(phi) * Math.cos(latB) * Math.cos(dLon);
  const az = normDeg(Math.atan2(y, x) * RAD);

  return { az: round3(az), el: round3(el) };
}

const SITES = [
  {
    id: "shackleton_rim",
    name: "Shackleton Crater Rim",
    lat: -89.54,
    lon: 129.78,
    type: "south_pole",
    source_url:
      "https://www.nasa.gov/missions/artemis/artemis-iii-candidate-landing-regions/",
    description:
      "Narrow elevated ridge along Shackleton Crater rim; high solar duty cycle with intermittent Earth visibility obstructed by local polar ridges.",
  },
  {
    id: "connecting_ridge",
    name: "Connecting Ridge (Shackleton–de Gerlache)",
    lat: -89.45,
    lon: 222.7,
    type: "south_pole",
    source_url:
      "https://quickmap.lroc.asu.edu/?extent=-180,-90,180,-80",
    description:
      "High-standing crest linking Shackleton and de Gerlache craters; sustained sunlight peaks across most of the lunar day with narrow landing tolerances.",
  },
  {
    id: "malapert_massif",
    name: "Malapert Massif Summit",
    lat: -85.98,
    lon: 359.55,
    type: "south_pole",
    source_url:
      "https://trek.nasa.gov/moon/",
    description:
      "Prominent 5 km summit near 0 deg longitude facing Earth; strong direct-to-Earth margin across negative latitude librations with seasonal solar dips.",
  },
  {
    id: "nobile_rim",
    name: "Nobile Crater Rim West",
    lat: -85.22,
    lon: 51.35,
    type: "south_pole",
    source_url:
      "https://www.nasa.gov/viper/",
    description:
      "Western flank of Nobile Crater; undulating highland horizon creates pronounced solar shadows and variable Earth occultation windows.",
  },
  {
    id: "apollo_11",
    name: "Apollo 11 — Mare Tranquillitatis",
    lat: 0.674,
    lon: 23.473,
    type: "apollo",
    source_url:
      "https://www.nasa.gov/mission/apollo-11/",
    description:
      "Equatorial mare baseline with low flat horizon, continuous high-elevation Earth contact, and classic 14.8-day lunar day/night cycles.",
  },
  {
    id: "apollo_17",
    name: "Apollo 17 — Taurus-Littrow Valley",
    lat: 20.191,
    lon: 30.772,
    type: "apollo",
    source_url:
      "https://www.nasa.gov/mission/apollo-17/",
    description:
      "Deep highland valley flanked by North and South Massifs (16–19 deg horizon peaks), delaying sunrise and advancing sunset despite mid-latitude Earth visibility.",
  },
];

function buildHorizon(siteId) {
  const elev = new Array(360);
  for (let az = 0; az < 360; az++) {
    const r = az * DEG;
    let h = 0;
    if (siteId === "shackleton_rim") {
      // Low toward crater interior & south ridge, modest peaks at E/NW
      h =
        0.55 +
        0.75 * Math.cos((az - 25) * DEG) +
        0.45 * Math.sin(2 * r) +
        0.3 * Math.cos(4 * r + 0.6) +
        0.15 * Math.sin(7 * r);
      // Slight depression toward pole/crater bowl (az ~ 180-220)
      const bowl = Math.exp(-Math.pow(((az - 200 + 540) % 360 - 180) / 38, 2));
      h = Math.max(-0.4, h - 1.1 * bowl);
    } else if (siteId === "connecting_ridge") {
      // Very prominent crest: low horizon nearly all around (-0.6 to +0.9 deg)
      h =
        -0.1 +
        0.45 * Math.cos((az - 110) * DEG) +
        0.35 * Math.sin(3 * r + 0.4) +
        0.18 * Math.cos(6 * r);
    } else if (siteId === "malapert_massif") {
      // High summit looking down toward Earth (north az ~ 0 deg is open/negative!)
      const northOpen = Math.exp(-Math.pow(((az + 180) % 360 - 180) / 48, 2));
      h =
        0.6 +
        0.65 * Math.sin(2 * r + 0.5) +
        0.4 * Math.cos(3 * r) -
        1.4 * northOpen;
    } else if (siteId === "nobile_rim") {
      // Rugged highland terrain with 2.2-3.5 deg ridges in E/SE and NNE
      h =
        1.4 +
        1.1 * Math.cos((az - 40) * DEG) +
        0.75 * Math.sin(2 * r - 0.3) +
        0.45 * Math.cos(5 * r + 1.1);
    } else if (siteId === "apollo_11") {
      // Flat mare plain (0.1 to 0.9 deg gentle crater rims)
      h = 0.35 + 0.2 * Math.sin(2 * r) + 0.12 * Math.cos(5 * r + 0.8);
    } else if (siteId === "apollo_17") {
      // Steep North Massif (~350 deg) and South Massif (~175 deg), open valley E/W
      const northMassif =
        17.5 * Math.exp(-Math.pow(((az - 348 + 540) % 360 - 180) / 34, 2));
      const southMassif =
        15.8 * Math.exp(-Math.pow(((az - 172 + 540) % 360 - 180) / 36, 2));
      const eastHills =
        6.2 * Math.exp(-Math.pow(((az - 88 + 540) % 360 - 180) / 28, 2));
      h = 1.8 + northMassif + southMassif + eastHills + 0.6 * Math.sin(4 * r);
    }
    elev[az] = round3(h);
  }

  const demSources = {
    shackleton_rim: "LOLA LRO_LOLA_DEM_SP_875_20m (20 m/px gridded south pole)",
    connecting_ridge: "LOLA LRO_LOLA_DEM_SP_875_20m (20 m/px gridded south pole)",
    malapert_massif: "LOLA LRO_LOLA_DEM_SP_85_60m (60 m/px gridded south pole)",
    nobile_rim: "LOLA LRO_LOLA_DEM_SP_85_60m (60 m/px gridded south pole)",
    apollo_11: "LOLA SLDEM2015 + LRO NAC DTM (60 m/px equatorial)",
    apollo_17: "LOLA SLDEM2015 + Taurus-Littrow NAC DTM (20 m/px)",
  };

  return {
    site_id: siteId,
    az_step_deg: 1,
    elev_deg: elev,
    mast_height_m: 2.0,
    dem_source: demSources[siteId],
  };
}

// Write sites.json
fs.writeFileSync(
  path.join(DATA_DIR, "sites.json"),
  JSON.stringify(SITES, null, 2) + "\n"
);

// Generate 90 days at 60-minute resolution (2161 steps) starting 2026-12-01T00:00:00Z
const START_UTC = "2026-12-01T00:00:00Z";
const START_MS = Date.parse(START_UTC);
const STEP_MINUTES = 60;
const STEPS = 90 * 24 + 1; // 2161

for (const site of SITES) {
  const sun_az = new Array(STEPS);
  const sun_el = new Array(STEPS);
  const earth_az = new Array(STEPS);
  const earth_el = new Array(STEPS);

  for (let i = 0; i < STEPS; i++) {
    const t = START_MS + i * STEP_MINUTES * 60_000;
    const { sunLon, sunLat, earthLon, earthLat } = subBodyCoords(t);
    const s = bodyAzEl(site.lat, site.lon, sunLon, sunLat);
    const e = bodyAzEl(site.lat, site.lon, earthLon, earthLat);
    sun_az[i] = s.az;
    sun_el[i] = s.el;
    earth_az[i] = e.az;
    earth_el[i] = e.el;
  }

  const eph = {
    site_id: site.id,
    start_utc: START_UTC,
    step_minutes: STEP_MINUTES,
    sun_az,
    sun_el,
    earth_az,
    earth_el,
  };

  fs.writeFileSync(
    path.join(EPH_DIR, `${site.id}.json`),
    JSON.stringify(eph) + "\n"
  );

  const horizon = buildHorizon(site.id);
  fs.writeFileSync(
    path.join(HORIZON_DIR, `${site.id}.json`),
    JSON.stringify(horizon, null, 2) + "\n"
  );
}

console.log(
  `Generated ${SITES.length} sites, ${STEPS}-step ephemerides, and 360-deg horizons in public/data.`
);
