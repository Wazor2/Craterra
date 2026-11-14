import type {
  EphemerisData,
  EphemerisRecord,
  LunarSite,
  SiteCatalogue,
  TerrainProfile,
  ValidationIssue,
  ValidationResult,
  Vec3,
} from "./types";

const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;
const SITE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isUtc(value: unknown): value is string {
  return (
    typeof value === "string" &&
    UTC_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((component: unknown) => isFiniteNumber(component))
  );
}

function distance(vector: Vec3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function measuredDistanceMatches(vector: Vec3, reported: unknown): boolean {
  if (!isFiniteNumber(reported) || reported <= 0) return false;
  const toleranceKm = Math.max(0.01, reported * 1e-8);
  return Math.abs(distance(vector) - reported) <= toleranceKm;
}

function success<T>(value: T): ValidationResult<T> {
  return { success: true, value, issues: [] };
}

function failure<T>(issues: ValidationIssue[]): ValidationResult<T> {
  return { success: false, issues };
}

function validateKernel(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(value)) {
    issues.push({ path, message: "Expected kernel provenance object." });
    return;
  }
  if (!isNonEmptyString(value.filename)) {
    issues.push({ path: `${path}.filename`, message: "Filename is required." });
  }
  if (!["spk", "pck", "fk", "lsk"].includes(String(value.role))) {
    issues.push({ path: `${path}.role`, message: "Unknown NAIF kernel role." });
  }
  if (!isHttpsUrl(value.source_url)) {
    issues.push({ path: `${path}.source_url`, message: "Expected an HTTPS source URL." });
  }
  if (typeof value.sha256 !== "string" || !SHA256_PATTERN.test(value.sha256)) {
    issues.push({ path: `${path}.sha256`, message: "Expected a 64-character SHA-256 checksum." });
  }
}

function validateEphemerisRecord(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is EphemerisRecord {
  if (!isObject(value)) {
    issues.push({ path, message: "Expected ephemeris record object." });
    return false;
  }
  let valid = true;
  if (!isUtc(value.utc)) {
    issues.push({ path: `${path}.utc`, message: "Expected an ISO-8601 UTC timestamp ending in Z." });
    valid = false;
  }
  if (!isFiniteNumber(value.et_tdb_seconds)) {
    issues.push({ path: `${path}.et_tdb_seconds`, message: "Expected finite SPICE ephemeris seconds." });
    valid = false;
  }
  const sunVector = value.sun_from_moon_km;
  const sunValid = isVec3(sunVector);
  if (!sunValid) {
    issues.push({ path: `${path}.sun_from_moon_km`, message: "Expected a finite 3-vector in kilometres." });
    valid = false;
  } else if (!measuredDistanceMatches(sunVector, value.sun_distance_km)) {
    issues.push({ path: `${path}.sun_distance_km`, message: "Distance must agree with the unnormalized Moon-centred Sun vector." });
    valid = false;
  }
  const earthVector = value.earth_from_moon_km;
  const earthValid = isVec3(earthVector);
  if (!earthValid) {
    issues.push({ path: `${path}.earth_from_moon_km`, message: "Expected a finite 3-vector in kilometres." });
    valid = false;
  } else if (!measuredDistanceMatches(earthVector, value.earth_distance_km)) {
    issues.push({ path: `${path}.earth_distance_km`, message: "Distance must agree with the unnormalized Moon-centred Earth vector." });
    valid = false;
  }
  return valid;
}

export function validateEphemerisData(input: unknown): ValidationResult<EphemerisData> {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return failure([{ path: "$", message: "Expected an ephemeris data object." }]);
  if (input.schema_version !== 1) {
    issues.push({ path: "$.schema_version", message: "Only schema version 1 is supported." });
  }

  const metadata = input.metadata;
  if (!isObject(metadata)) {
    issues.push({ path: "$.metadata", message: "Expected metadata object." });
  } else {
    const fixedFields: Array<[string, unknown, unknown]> = [
      ["origin", metadata.origin, "MOON"],
      ["frame", metadata.frame, "MOON_ME"],
      ["time_standard", metadata.time_standard, "UTC"],
      ["distance_unit", metadata.distance_unit, "km"],
      ["angle_unit", metadata.angle_unit, "deg"],
      ["sample_interval_seconds", metadata.sample_interval_seconds, 1800],
      ["aberration_correction", metadata.aberration_correction, "LT+S"],
    ];
    for (const [field, actual, expected] of fixedFields) {
      if (actual !== expected) {
        issues.push({ path: `$.metadata.${field}`, message: `Expected ${String(expected)}.` });
      }
    }
    for (const field of ["coverage_start_utc", "coverage_end_utc", "generated_utc"] as const) {
      if (!isUtc(metadata[field])) {
        issues.push({ path: `$.metadata.${field}`, message: "Expected an ISO-8601 UTC timestamp ending in Z." });
      }
    }
    if (!Array.isArray(metadata.kernels) || metadata.kernels.length === 0) {
      issues.push({ path: "$.metadata.kernels", message: "At least one NAIF kernel provenance entry is required." });
    } else {
      (metadata.kernels as unknown[]).forEach((kernel, index) =>
        validateKernel(kernel, `$.metadata.kernels[${index}]`, issues),
      );
    }
  }

  const records = input.records;
  if (!Array.isArray(records) || records.length < 2) {
    issues.push({ path: "$.records", message: "At least two samples are required for a time series." });
  } else {
    const parsedTimes: number[] = [];
    (records as unknown[]).forEach((record, index) => {
      if (validateEphemerisRecord(record, `$.records[${index}]`, issues) && isObject(record)) {
        parsedTimes.push(Date.parse(String(record.utc)));
      }
    });
    if (parsedTimes.length === records.length) {
      for (let index = 1; index < parsedTimes.length; index += 1) {
        const deltaSeconds = (parsedTimes[index] - parsedTimes[index - 1]) / 1000;
        if (Math.abs(deltaSeconds - 1800) > 0.001) {
          issues.push({ path: `$.records[${index}].utc`, message: "Samples must be strictly increasing at 30-minute intervals." });
          break;
        }
      }
      if (isObject(metadata)) {
        if (String(metadata.coverage_start_utc) !== String((records[0] as Record<string, unknown>).utc)) {
          issues.push({ path: "$.metadata.coverage_start_utc", message: "Coverage start must equal the first record time." });
        }
        if (String(metadata.coverage_end_utc) !== String((records[records.length - 1] as Record<string, unknown>).utc)) {
          issues.push({ path: "$.metadata.coverage_end_utc", message: "Coverage end must equal the last record time." });
        }
      }
    }
  }

  return issues.length === 0 ? success(input as unknown as EphemerisData) : failure(issues);
}

function validateSite(value: unknown, path: string, issues: ValidationIssue[]): value is LunarSite {
  if (!isObject(value)) {
    issues.push({ path, message: "Expected site object." });
    return false;
  }
  let valid = true;
  if (typeof value.site_id !== "string" || !SITE_ID_PATTERN.test(value.site_id)) {
    issues.push({ path: `${path}.site_id`, message: "Expected a stable lowercase kebab-case site ID." });
    valid = false;
  }
  if (!isNonEmptyString(value.name)) {
    issues.push({ path: `${path}.name`, message: "Site name is required." });
    valid = false;
  }
  if (!["apollo", "south_pole_candidate_region", "equatorial_reference"].includes(String(value.category))) {
    issues.push({ path: `${path}.category`, message: "Unknown site category." });
    valid = false;
  }
  if (!isFiniteNumber(value.latitude_deg) || value.latitude_deg < -90 || value.latitude_deg > 90) {
    issues.push({ path: `${path}.latitude_deg`, message: "Latitude must be finite and within [-90, 90]." });
    valid = false;
  }
  if (!isFiniteNumber(value.longitude_east_deg) || value.longitude_east_deg < -180 || value.longitude_east_deg >= 180) {
    issues.push({ path: `${path}.longitude_east_deg`, message: "East-positive longitude must be within [-180, 180)." });
    valid = false;
  }
  if (value.latitude_type !== "planetocentric") {
    issues.push({ path: `${path}.latitude_type`, message: "Only planetocentric latitude is supported." });
    valid = false;
  }
  if (value.frame !== "MOON_ME") {
    issues.push({ path: `${path}.frame`, message: "Site coordinates must declare the MOON_ME frame." });
    valid = false;
  }
  if (value.elevation_m === null) {
    if (value.elevation_datum !== null) {
      issues.push({ path: `${path}.elevation_datum`, message: "A null elevation must have a null datum." });
      valid = false;
    }
  } else if (!isFiniteNumber(value.elevation_m) || !isNonEmptyString(value.elevation_datum)) {
    issues.push({ path: `${path}.elevation_m`, message: "A finite elevation and its explicit vertical datum are both required." });
    valid = false;
  }
  if (!isNonEmptyString(value.description)) {
    issues.push({ path: `${path}.description`, message: "A sourced site description is required." });
    valid = false;
  }
  const provenance = value.provenance;
  if (!isObject(provenance)) {
    issues.push({ path: `${path}.provenance`, message: "Coordinate provenance is required." });
    valid = false;
  } else {
    if (!["published", "derived_representative_point"].includes(String(provenance.coordinate_status))) {
      issues.push({ path: `${path}.provenance.coordinate_status`, message: "Coordinate status must identify published or derived representative coordinates." });
      valid = false;
    }
    if (!Array.isArray(provenance.source_urls) || provenance.source_urls.length === 0 || !(provenance.source_urls as unknown[]).every(isHttpsUrl)) {
      issues.push({ path: `${path}.provenance.source_urls`, message: "At least one HTTPS source URL is required." });
      valid = false;
    }
    if (!isNonEmptyString(provenance.note)) {
      issues.push({ path: `${path}.provenance.note`, message: "Explain how the coordinates were sourced or derived." });
      valid = false;
    }
  }
  return valid;
}

export function validateSiteCatalogue(input: unknown): ValidationResult<SiteCatalogue> {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return failure([{ path: "$", message: "Expected a site catalogue object." }]);
  if (input.schema_version !== 1) issues.push({ path: "$.schema_version", message: "Only schema version 1 is supported." });
  if (input.coordinate_frame !== "MOON_ME") issues.push({ path: "$.coordinate_frame", message: "Expected MOON_ME." });
  if (input.latitude_type !== "planetocentric") issues.push({ path: "$.latitude_type", message: "Expected planetocentric latitude." });
  if (input.longitude_convention !== "east_positive") issues.push({ path: "$.longitude_convention", message: "Expected east-positive longitude." });

  const sites = input.sites;
  if (!Array.isArray(sites) || sites.length === 0) {
    issues.push({ path: "$.sites", message: "At least one sourced site is required." });
  } else {
    const ids = new Set<string>();
    (sites as unknown[]).forEach((site, index) => {
      if (validateSite(site, `$.sites[${index}]`, issues) && isObject(site)) {
        const id = String(site.site_id);
        if (ids.has(id)) issues.push({ path: `$.sites[${index}].site_id`, message: "Site IDs must be unique." });
        ids.add(id);
      }
    });
  }
  return issues.length === 0 ? success(input as unknown as SiteCatalogue) : failure(issues);
}

export function validateTerrainProfile(input: unknown): ValidationResult<TerrainProfile> {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) return failure([{ path: "$", message: "Expected a terrain profile object." }]);
  if (input.schema_version !== 1) issues.push({ path: "$.schema_version", message: "Only schema version 1 is supported." });
  if (typeof input.site_id !== "string" || !SITE_ID_PATTERN.test(input.site_id)) {
    issues.push({ path: "$.site_id", message: "Expected a stable lowercase kebab-case site ID." });
  }
  if (input.azimuth_start_deg !== 0 || input.azimuth_step_deg !== 1) {
    issues.push({ path: "$.azimuth_step_deg", message: "Horizon samples must start at 0° and be spaced exactly 1° apart." });
  }
  if (input.azimuth_convention !== "clockwise_from_north") {
    issues.push({ path: "$.azimuth_convention", message: "Expected clockwise-from-north azimuth." });
  }
  if (!Array.isArray(input.horizon_elevation_deg) || input.horizon_elevation_deg.length !== 360) {
    issues.push({ path: "$.horizon_elevation_deg", message: "Exactly 360 horizon samples are required." });
  } else {
    (input.horizon_elevation_deg as unknown[]).forEach((angle, index) => {
      if (!isFiniteNumber(angle) || angle < -90 || angle > 90) {
        issues.push({ path: `$.horizon_elevation_deg[${index}]`, message: "Horizon elevation must be finite and within [-90, 90] degrees." });
      }
    });
  }
  if (input.mast_height_m !== 0 && input.mast_height_m !== 2) {
    issues.push({ path: "$.mast_height_m", message: "Observer mast height must be explicitly 0 m or 2 m." });
  }
  if (input.horizon_method !== "ray_max_elevation_with_lunar_curvature") {
    issues.push({ path: "$.horizon_method", message: "Terrain horizon method must be identified." });
  }
  if (!isUtc(input.generated_utc)) {
    issues.push({ path: "$.generated_utc", message: "Expected an ISO-8601 UTC timestamp ending in Z." });
  }
  const dem = input.dem;
  if (!isObject(dem)) {
    issues.push({ path: "$.dem", message: "DEM provenance is required." });
  } else {
    for (const field of ["product_id", "projection", "reference_frame", "vertical_datum", "quality_notes"] as const) {
      if (!isNonEmptyString(dem[field])) issues.push({ path: `$.dem.${field}`, message: "This provenance field is required." });
    }
    if (!isHttpsUrl(dem.source_url)) issues.push({ path: "$.dem.source_url", message: "Expected an HTTPS source URL." });
    for (const field of ["resolution_m", "max_ray_distance_m"] as const) {
      if (!isFiniteNumber(dem[field]) || dem[field] <= 0) issues.push({ path: `$.dem.${field}`, message: "Expected a finite positive value in metres." });
    }
    if (dem.interpolated_fraction !== null && (!isFiniteNumber(dem.interpolated_fraction) || dem.interpolated_fraction < 0 || dem.interpolated_fraction > 1)) {
      issues.push({ path: "$.dem.interpolated_fraction", message: "Expected null or a fraction in [0, 1]." });
    }
    if (dem.vertical_uncertainty_rms_m !== null && (!isFiniteNumber(dem.vertical_uncertainty_rms_m) || dem.vertical_uncertainty_rms_m < 0)) {
      issues.push({ path: "$.dem.vertical_uncertainty_rms_m", message: "Expected null or a non-negative finite RMS value in metres." });
    }
  }
  return issues.length === 0 ? success(input as unknown as TerrainProfile) : failure(issues);
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues.map(({ path, message }) => `${path}: ${message}`).join("\n");
}
