export type SiteType = "apollo" | "south_pole" | "other";

export interface Site {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: SiteType;
  source_url: string;
  description: string;
}

export interface Ephemeris {
  site_id: string;
  start_utc: string;
  step_minutes: number;
  sun_az: number[];
  sun_el: number[];
  earth_az: number[];
  earth_el: number[];
}

export interface Horizon {
  site_id: string;
  az_step_deg: number;
  elev_deg: number[];
  mast_height_m: number;
  dem_source: string;
}

export type LoadedHorizon = Horizon & {
  isFlat: boolean;
};

export type Summaries = Record<
  string,
  {
    plain_text: string;
    expert_text: string;
    stats?: {
      sunlit_pct: number;
      earth_visible_pct: number;
      longest_dark_hours: number;
      longest_dark_start_utc: string | null;
      sun_el_min: number;
      sun_el_max: number;
      earth_el_min: number;
      earth_el_max: number;
      horizon_min: number;
      horizon_max: number;
    };
  }
>;
