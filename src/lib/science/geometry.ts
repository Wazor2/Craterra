import type { EphemerisRecord, LunarSite, Vec3 } from "../contracts/types";

/** BODY301_RADII from the project's pinned NAIF pck00011.tpc: (1737.4, 1737.4, 1737.4) km. */
export const MOON_MEAN_RADIUS_KM = 1737.4;
export const MOON_SITE_ELEVATION_DATUM =
  "radial height above NAIF BODY301_RADII mean sphere (1737.4 km)";
export const NAIF_PCK00011_URL =
  "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc";

const DEGREES_PER_RADIAN = 180 / Math.PI;

export interface LocalEnuKm {
  east_km: number;
  north_km: number;
  up_km: number;
}

export interface SkyDirection {
  azimuth_deg: number;
  elevation_deg: number;
  range_km: number;
  topocentric_vector_km: Vec3;
  enu_km: LocalEnuKm;
}

export interface SiteSkyGeometry {
  site_position_moon_me_km: Vec3;
  sun: SkyDirection;
  earth: SkyDirection;
}

function assertFiniteVec3(value: Vec3, label: string): void {
  if (!value.every(Number.isFinite)) {
    throw new RangeError(`${label} must contain three finite values.`);
  }
}

function assertSiteCoordinates(site: LunarSite): void {
  if (!Number.isFinite(site.latitude_deg) || site.latitude_deg < -90 || site.latitude_deg > 90) {
    throw new RangeError("Planetocentric latitude must be finite and within [-90, 90] degrees.");
  }
  if (!Number.isFinite(site.longitude_east_deg) || site.longitude_east_deg < -180 || site.longitude_east_deg >= 180) {
    throw new RangeError("East-positive longitude must be finite and within [-180, 180) degrees.");
  }
  if (site.frame !== "MOON_ME" || site.latitude_type !== "planetocentric") {
    throw new RangeError("Site coordinates must use planetocentric latitude in MOON_ME.");
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function normKm(vector: Vec3): number {
  assertFiniteVec3(vector, "Vector");
  return Math.hypot(vector[0], vector[1], vector[2]);
}

export function subtractVectorsKm(left: Vec3, right: Vec3): Vec3 {
  assertFiniteVec3(left, "Left vector");
  assertFiniteVec3(right, "Right vector");
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

/**
 * Return the site position in the Moon-centred, body-fixed MOON_ME frame.
 * Site height must already be normalized to the official 1737.4 km mean sphere;
 * an unknown or different vertical datum is rejected rather than silently mixed.
 */
export function sitePositionKm(
  site: LunarSite,
  referenceRadiusKm = MOON_MEAN_RADIUS_KM,
): Vec3 {
  assertSiteCoordinates(site);
  if (site.elevation_m === null || !Number.isFinite(site.elevation_m)) {
    throw new RangeError("A measured or DEM-derived site elevation is required for topocentric geometry.");
  }
  if (site.elevation_datum !== MOON_SITE_ELEVATION_DATUM) {
    throw new RangeError(
      `Site elevation must be normalized to: ${MOON_SITE_ELEVATION_DATUM}.`,
    );
  }
  if (!Number.isFinite(referenceRadiusKm) || referenceRadiusKm <= 0) {
    throw new RangeError("Reference radius must be a finite positive value in kilometres.");
  }
  const radiusKm = referenceRadiusKm + site.elevation_m / 1000;
  if (radiusKm <= 0) throw new RangeError("Site radial distance must be positive.");

  const latitude = toRadians(site.latitude_deg);
  const longitude = toRadians(site.longitude_east_deg);
  const horizontalKm = radiusKm * Math.cos(latitude);
  return [
    horizontalKm * Math.cos(longitude),
    horizontalKm * Math.sin(longitude),
    radiusKm * Math.sin(latitude),
  ];
}

/** Transform a MOON_ME vector from the site origin into its local East-North-Up basis. */
export function enuFromMoonFixed(
  vectorKm: Vec3,
  latitudeDeg: number,
  longitudeEastDeg: number,
): LocalEnuKm {
  assertFiniteVec3(vectorKm, "Moon-fixed vector");
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
    throw new RangeError("Planetocentric latitude must be finite and within [-90, 90] degrees.");
  }
  if (!Number.isFinite(longitudeEastDeg) || longitudeEastDeg < -180 || longitudeEastDeg >= 180) {
    throw new RangeError("East-positive longitude must be finite and within [-180, 180) degrees.");
  }
  const latitude = toRadians(latitudeDeg);
  const longitude = toRadians(longitudeEastDeg);
  const [x, y, z] = vectorKm;
  const sinLat = Math.sin(latitude);
  const cosLat = Math.cos(latitude);
  const sinLon = Math.sin(longitude);
  const cosLon = Math.cos(longitude);
  return {
    east_km: -sinLon * x + cosLon * y,
    north_km: -sinLat * cosLon * x - sinLat * sinLon * y + cosLat * z,
    up_km: cosLat * cosLon * x + cosLat * sinLon * y + sinLat * z,
  };
}

export function anglesFromEnu(enu: LocalEnuKm): Pick<SkyDirection, "azimuth_deg" | "elevation_deg"> {
  const east = enu.east_km;
  const north = enu.north_km;
  const up = enu.up_km;
  if (![east, north, up].every(Number.isFinite)) {
    throw new RangeError("ENU components must be finite.");
  }
  if (east === 0 && north === 0 && up === 0) {
    throw new RangeError("Azimuth and elevation are undefined for the zero vector.");
  }
  const azimuth = (Math.atan2(east, north) * DEGREES_PER_RADIAN + 360) % 360;
  const elevation = Math.atan2(up, Math.hypot(east, north)) * DEGREES_PER_RADIAN;
  return { azimuth_deg: azimuth, elevation_deg: elevation };
}

/**
 * Convert an unnormalized Moon-centred target position into a topocentric local
 * direction. The site vector is subtracted before any normalization, preserving
 * lunar parallax (especially important for the nearby Earth).
 */
export function topocentricDirection(
  targetFromMoonKm: Vec3,
  site: LunarSite,
  referenceRadiusKm = MOON_MEAN_RADIUS_KM,
): SkyDirection {
  const siteVector = sitePositionKm(site, referenceRadiusKm);
  const topocentricVector = subtractVectorsKm(targetFromMoonKm, siteVector);
  const rangeKm = normKm(topocentricVector);
  if (rangeKm === 0) throw new RangeError("Target and site positions cannot coincide.");
  const enu = enuFromMoonFixed(
    topocentricVector,
    site.latitude_deg,
    site.longitude_east_deg,
  );
  return {
    ...anglesFromEnu(enu),
    range_km: rangeKm,
    topocentric_vector_km: topocentricVector,
    enu_km: enu,
  };
}

export function siteSkyGeometry(
  record: EphemerisRecord,
  site: LunarSite,
  referenceRadiusKm = MOON_MEAN_RADIUS_KM,
): SiteSkyGeometry {
  return {
    site_position_moon_me_km: sitePositionKm(site, referenceRadiusKm),
    sun: topocentricDirection(record.sun_from_moon_km, site, referenceRadiusKm),
    earth: topocentricDirection(record.earth_from_moon_km, site, referenceRadiusKm),
  };
}
