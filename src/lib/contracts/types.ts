export type LunarBodyFrame = "MOON_ME";

export type SiteCategory =
  | "apollo"
  | "south_pole_candidate_region"
  | "equatorial_reference";

export type KernelRole = "spk" | "pck" | "fk" | "lsk";

export type Vec3 = readonly [number, number, number];

export interface KernelProvenance {
  filename: string;
  role: KernelRole;
  source_url: string;
  sha256: string;
}

export interface EphemerisMetadata {
  origin: "MOON";
  frame: LunarBodyFrame;
  time_standard: "UTC";
  distance_unit: "km";
  angle_unit: "deg";
  sample_interval_seconds: 1800;
  aberration_correction: "LT+S";
  coverage_start_utc: string;
  coverage_end_utc: string;
  generated_utc: string;
  kernels: KernelProvenance[];
}

export interface EphemerisRecord {
  utc: string;
  et_tdb_seconds: number;
  sun_from_moon_km: Vec3;
  earth_from_moon_km: Vec3;
  sun_distance_km: number;
  earth_distance_km: number;
}

export interface EphemerisData {
  schema_version: 1;
  metadata: EphemerisMetadata;
  records: EphemerisRecord[];
}

export interface SiteProvenance {
  coordinate_status: "published" | "derived_representative_point";
  source_urls: string[];
  note: string;
  dataset_id?: string;
}

export interface LunarSite {
  site_id: string;
  name: string;
  category: SiteCategory;
  latitude_deg: number;
  longitude_east_deg: number;
  latitude_type: "planetocentric";
  frame: LunarBodyFrame;
  elevation_m: number | null;
  elevation_datum: string | null;
  description: string;
  provenance: SiteProvenance;
}

export interface SiteCatalogue {
  schema_version: 1;
  coordinate_frame: LunarBodyFrame;
  latitude_type: "planetocentric";
  longitude_convention: "east_positive";
  sites: LunarSite[];
}

export interface TerrainDemProvenance {
  product_id: string;
  source_url: string;
  resolution_m: number;
  projection: string;
  reference_frame: string;
  vertical_datum: string;
  max_ray_distance_m: number;
  interpolated_fraction: number | null;
  vertical_uncertainty_rms_m: number | null;
  quality_notes: string;
}

export interface TerrainProfile {
  schema_version: 1;
  site_id: string;
  azimuth_start_deg: 0;
  azimuth_step_deg: 1;
  azimuth_convention: "clockwise_from_north";
  horizon_elevation_deg: number[];
  mast_height_m: 0 | 2;
  horizon_method: "ray_max_elevation_with_lunar_curvature";
  generated_utc: string;
  dem: TerrainDemProvenance;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { success: true; value: T; issues: [] }
  | { success: false; issues: ValidationIssue[] };
