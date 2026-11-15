import type {
  Ephemeris,
  Horizon,
  LoadedHorizon,
  Site,
  Summaries,
} from "./types";

const BASE_PATH = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function dataUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\//, "");
  return `${BASE_PATH}/data/${clean}`;
}

const sitesCache: { value: Site[] | null } = { value: null };
const ephemerisCache = new Map<string, Ephemeris>();
const horizonCache = new Map<string, LoadedHorizon>();
const summariesCache: { value: Summaries | null | undefined } = {
  value: undefined,
};

async function fetchJson(relativePath: string): Promise<Response> {
  const url = dataUrl(relativePath);
  return fetch(url, { headers: { Accept: "application/json" } });
}

function assertFiniteArray(
  arr: unknown,
  name: string,
  min: number,
  max: number,
  expectedLength?: number
): asserts arr is number[] {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`Contract error: "${name}" must be a non-empty array.`);
  }
  if (expectedLength !== undefined && arr.length !== expectedLength) {
    throw new Error(
      `Contract error: "${name}" length (${arr.length}) does not match expected (${expectedLength}).`
    );
  }
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(`Contract error: "${name}[${i}]" is not a finite number.`);
    }
    if (v < min || v > max) {
      throw new Error(
        `Contract error: "${name}[${i}]" (${v}) is outside [${min}, ${max}].`
      );
    }
  }
}

export async function loadSites(): Promise<Site[]> {
  if (sitesCache.value) return sitesCache.value;
  const res = await fetchJson("sites.json");
  if (!res.ok) {
    throw new Error(`Failed to load sites.json (HTTP ${res.status}).`);
  }
  const raw = await res.json();
  if (!Array.isArray(raw)) {
    throw new Error("Contract error: sites.json must be a JSON array.");
  }
  const sites: Site[] = raw.map((item, idx) => {
    if (
      !item ||
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.lat !== "number" ||
      typeof item.lon !== "number" ||
      typeof item.type !== "string" ||
      typeof item.source_url !== "string" ||
      typeof item.description !== "string"
    ) {
      throw new Error(`Contract error: invalid site entry at index ${idx}.`);
    }
    return {
      id: item.id,
      name: item.name,
      lat: item.lat,
      lon: item.lon,
      type: item.type,
      source_url: item.source_url,
      description: item.description,
    };
  });
  sitesCache.value = sites;
  return sites;
}

export async function loadEphemeris(siteId: string): Promise<Ephemeris> {
  const cached = ephemerisCache.get(siteId);
  if (cached) return cached;

  const res = await fetchJson(`ephemeris/${encodeURIComponent(siteId)}.json`);
  if (!res.ok) {
    throw new Error(
      `Failed to load ephemeris for "${siteId}" (HTTP ${res.status}).`
    );
  }
  const data = await res.json();
  if (
    !data ||
    typeof data.site_id !== "string" ||
    typeof data.start_utc !== "string" ||
    typeof data.step_minutes !== "number" ||
    data.step_minutes <= 0
  ) {
    throw new Error(
      `Contract error: ephemeris/${siteId}.json is missing required header fields.`
    );
  }
  if (Number.isNaN(Date.parse(data.start_utc))) {
    throw new Error(
      `Contract error: ephemeris/${siteId}.json has invalid start_utc "${data.start_utc}".`
    );
  }

  assertFiniteArray(data.sun_az, "sun_az", 0, 360);
  const len = data.sun_az.length;
  assertFiniteArray(data.sun_el, "sun_el", -90, 90, len);
  assertFiniteArray(data.earth_az, "earth_az", 0, 360, len);
  assertFiniteArray(data.earth_el, "earth_el", -90, 90, len);

  const eph: Ephemeris = {
    site_id: data.site_id,
    start_utc: data.start_utc,
    step_minutes: data.step_minutes,
    sun_az: data.sun_az,
    sun_el: data.sun_el,
    earth_az: data.earth_az,
    earth_el: data.earth_el,
  };
  ephemerisCache.set(siteId, eph);
  return eph;
}

export async function loadHorizon(siteId: string): Promise<LoadedHorizon> {
  const cached = horizonCache.get(siteId);
  if (cached) return cached;

  const res = await fetchJson(`horizon/${encodeURIComponent(siteId)}.json`);
  if (res.status === 404) {
    const flat: LoadedHorizon = {
      site_id: siteId,
      az_step_deg: 1,
      elev_deg: new Array(360).fill(0),
      mast_height_m: 0,
      dem_source: "none",
      isFlat: true,
    };
    horizonCache.set(siteId, flat);
    return flat;
  }
  if (!res.ok) {
    throw new Error(
      `Failed to load horizon for "${siteId}" (HTTP ${res.status}).`
    );
  }

  const data: Horizon = await res.json();
  if (
    !data ||
    typeof data.site_id !== "string" ||
    typeof data.az_step_deg !== "number" ||
    typeof data.mast_height_m !== "number" ||
    typeof data.dem_source !== "string"
  ) {
    throw new Error(
      `Contract error: horizon/${siteId}.json is missing required fields.`
    );
  }

  assertFiniteArray(data.elev_deg, "elev_deg", -90, 90, 360);

  const isFlat =
    data.dem_source.toLowerCase().startsWith("none") ||
    data.elev_deg.every((v) => v === 0);

  const loaded: LoadedHorizon = {
    site_id: data.site_id,
    az_step_deg: data.az_step_deg,
    elev_deg: data.elev_deg,
    mast_height_m: data.mast_height_m,
    dem_source: data.dem_source,
    isFlat,
  };
  horizonCache.set(siteId, loaded);
  return loaded;
}

export async function loadSummaries(): Promise<Summaries | null> {
  if (summariesCache.value !== undefined) return summariesCache.value;
  try {
    const res = await fetchJson("summaries.json");
    if (!res.ok) {
      summariesCache.value = null;
      return null;
    }
    const data = await res.json();
    summariesCache.value = data as Summaries;
    return summariesCache.value;
  } catch {
    summariesCache.value = null;
    return null;
  }
}
