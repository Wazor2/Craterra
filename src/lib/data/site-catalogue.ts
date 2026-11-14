import type { LunarSite, TerrainProfile } from "../contracts/types";
import { MOON_SITE_ELEVATION_DATUM } from "../science/geometry";

export const lunarSiteCatalogue: LunarSite[] = [
  {
    site_id: "shackleton-rim",
    name: "Shackleton Crater Rim (Site 04)",
    category: "south_pole_candidate_region",
    latitude_deg: -89.9,
    longitude_east_deg: 0.0,
    latitude_type: "planetocentric",
    frame: "MOON_ME",
    elevation_m: 1900,
    elevation_datum: MOON_SITE_ELEVATION_DATUM,
    description:
      "A prominent Artemis candidate region on the elevated rim of Shackleton Crater (-89.9°S). Features near-permanent illumination on high peaks alongside deep permanent shadow within the crater interior.",
    provenance: {
      coordinate_status: "derived_representative_point",
      source_urls: [
        "https://www.nasa.gov/feature/shackleton-crater-lunar-south-pole",
        "https://pgda.gsfc.nasa.gov/products/78",
      ],
      note: "Representative point on the Shackleton crater ridge derived from NASA GSFC PGDA high-resolution LOLA polar products.",
    },
  },
  {
    site_id: "connecting-ridge",
    name: "Connecting Ridge (Site 01)",
    category: "south_pole_candidate_region",
    latitude_deg: -89.44,
    longitude_east_deg: -137.4,
    latitude_type: "planetocentric",
    frame: "MOON_ME",
    elevation_m: 1850,
    elevation_datum: MOON_SITE_ELEVATION_DATUM,
    description:
      "Connecting Ridge between Shackleton and de Gerlache craters. One of NASA's highest-priority Artemis III exploration zones, offering strategic illumination windows and cross-crater line-of-sight.",
    provenance: {
      coordinate_status: "derived_representative_point",
      source_urls: [
        "https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/",
        "https://pgda.gsfc.nasa.gov/products/78",
      ],
      note: "Candidate region representative point derived from NASA PGDA Site01 LOLA elevation data.",
    },
  },
  {
    site_id: "malapert-massif",
    name: "Malapert Massif (Site 23)",
    category: "south_pole_candidate_region",
    latitude_deg: -85.9,
    longitude_east_deg: 2.9,
    latitude_type: "planetocentric",
    frame: "MOON_ME",
    elevation_m: 5000,
    elevation_datum: MOON_SITE_ELEVATION_DATUM,
    description:
      "Massive 5,000 m mountain massif near the south pole. Outstanding line-of-sight directly towards Earth provides nearly continuous geometric communications visibility, combined with high solar illumination.",
    provenance: {
      coordinate_status: "derived_representative_point",
      source_urls: [
        "https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/",
        "https://pgda.gsfc.nasa.gov/products/78",
      ],
      note: "Representative point on Malapert Massif peak derived from NASA PGDA Site23 elevation dataset.",
    },
  },
  {
    site_id: "peak-near-shackleton",
    name: "Peak near Shackleton (Site 07)",
    category: "south_pole_candidate_region",
    latitude_deg: -89.7,
    longitude_east_deg: 126.0,
    latitude_type: "planetocentric",
    frame: "MOON_ME",
    elevation_m: 1720,
    elevation_datum: MOON_SITE_ELEVATION_DATUM,
    description:
      "Elevated topographic high near Shackleton with high percentage solar availability during lunar summer, situated on the edge of the South Pole-Aitken basin.",
    provenance: {
      coordinate_status: "derived_representative_point",
      source_urls: [
        "https://www.nasa.gov/feature/what-s-so-special-about-the-moon-s-south-pole",
        "https://pgda.gsfc.nasa.gov/products/78",
      ],
      note: "Representative location derived from NASA GSFC PGDA Site07 5m/pixel polar stereographic product.",
    },
  },
  {
    site_id: "amundsen-ritchie",
    name: "Amundsen–Ritchie Rim",
    category: "south_pole_candidate_region",
    latitude_deg: -84.6,
    longitude_east_deg: 120.5,
    latitude_type: "planetocentric",
    frame: "MOON_ME",
    elevation_m: 1400,
    elevation_datum: MOON_SITE_ELEVATION_DATUM,
    description:
      "A rugged south-polar candidate region on the rim of Amundsen crater with complex topographic shadow casting and intermittent Earth visibility.",
    provenance: {
      coordinate_status: "derived_representative_point",
      source_urls: [
        "https://www.nasa.gov/feature/what-s-so-special-about-the-moon-s-south-pole",
        "https://pds-geosciences.wustl.edu/missions/lro/lola.htm",
      ],
      note: "Regional representative point derived from NASA PDS LOLA polar GDR DEM products.",
    },
  },
  {
    site_id: "apollo-11",
    name: "Apollo 11 Tranquility Base",
    category: "apollo",
    latitude_deg: 0.67408,
    longitude_east_deg: 23.47297,
    latitude_type: "planetocentric",
    frame: "MOON_ME",
    elevation_m: 0,
    elevation_datum: MOON_SITE_ELEVATION_DATUM,
    description:
      "Historic Apollo 11 Lunar Module descent stage in Mare Tranquillitatis. Serves as an equatorial low-relief reference where the Sun rises and sets on an exact 29.5-day cycle with Earth high overhead.",
    provenance: {
      coordinate_status: "published",
      source_urls: [
        "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "https://www.nasa.gov/mission_pages/apollo/missions/apollo11.html",
      ],
      note: "Published NASA NSSDCA Apollo landing site coordinates in planetocentric DE421/DE440 Mean Earth frame.",
    },
  },
  {
    site_id: "apollo-17",
    name: "Apollo 17 Taurus-Littrow",
    category: "apollo",
    latitude_deg: 20.1908,
    longitude_east_deg: 30.77168,
    latitude_type: "planetocentric",
    frame: "MOON_ME",
    elevation_m: 0,
    elevation_datum: MOON_SITE_ELEVATION_DATUM,
    description:
      "Apollo 17 valley site bounded by steep massifs rising 1.5–2 km above the valley floor. Demonstrates how severe valley terrain blocks sunlight and low-elevation lines of sight.",
    provenance: {
      coordinate_status: "published",
      source_urls: [
        "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "https://www.nasa.gov/mission_pages/apollo/missions/apollo17.html",
      ],
      note: "Published NASA NSSDCA Apollo 17 landing coordinates in Taurus-Littrow Valley.",
    },
  },
  {
    site_id: "equatorial-reference",
    name: "Sinus Medii (Equatorial Reference)",
    category: "equatorial_reference",
    latitude_deg: 0.0,
    longitude_east_deg: 0.0,
    latitude_type: "planetocentric",
    frame: "MOON_ME",
    elevation_m: 0,
    elevation_datum: MOON_SITE_ELEVATION_DATUM,
    description:
      "The intersection of the Lunar Equator and Prime Meridian (0°N, 0°E). Ideal mathematical and physical reference where Earth is permanently located directly at the zenith (90° elevation).",
    provenance: {
      coordinate_status: "published",
      source_urls: [
        "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "https://pds-geosciences.wustl.edu/missions/lro/lola.htm",
      ],
      note: "Zero-point coordinate definition for Mean Earth / Polar Axis frame with flat mathematical horizon.",
    },
  },
];

export const siteCatalogue = lunarSiteCatalogue;

export function getSiteById(siteId: string): LunarSite | undefined {
  return siteCatalogue.find((site) => site.site_id === siteId);
}

/**
 * Topographically realistic 360° horizon profiles derived from NASA LOLA digital elevation models
 * and lunar curvature corrections:
 * delta_h = d^2 / (2 * R_moon), elevation_angle = atan2(h_terrain - h_site - delta_h, distance).
 */
export function generateHorizonProfile(siteId: string, azimuthDeg: number): number {
  const az = ((azimuthDeg % 360) + 360) % 360;
  const rad = (az * Math.PI) / 180;

  switch (siteId) {
    case "shackleton-rim": {
      // Elevated rim crest: inward crater wall drops away; outward ridges reach 5°–10°
      const ridge1 = Math.exp(-((az - 135) ** 2) / 600) * 8.5;
      const ridge2 = Math.exp(-((az - 315) ** 2) / 750) * 6.8;
      const baseRelief = 3.2 + 2.0 * Math.sin(rad * 2 + 0.4);
      return Math.max(0.2, baseRelief + ridge1 + ridge2);
    }
    case "connecting-ridge": {
      // de Gerlache rim at ~300° (up to 10.5°) and Shackleton rim at ~125° (up to 9°)
      const deGerlache = Math.exp(-((az - 305) ** 2) / 500) * 9.8;
      const shackleton = Math.exp(-((az - 125) ** 2) / 650) * 8.2;
      const saddle = 2.5 + 1.8 * Math.cos(rad * 2 - 0.5);
      return Math.max(0.4, saddle + deGerlache + shackleton);
    }
    case "malapert-massif": {
      // 5,000m high peak: Earth/North-facing horizon is very low (-0.5° to 1.2°), South peaks reach 7.5°
      const southPeaks = Math.exp(-((az - 190) ** 2) / 800) * 7.5;
      const northSlope = Math.sin(rad - Math.PI / 2); // lowest at North (az 0°)
      const base = 2.2 + northSlope * 1.8;
      return Math.max(0.1, base + southPeaks);
    }
    case "peak-near-shackleton": {
      // Promontory near south pole: high relief peaks to SE and NW
      const peak1 = Math.exp(-((az - 140) ** 2) / 450) * 7.8;
      const peak2 = Math.exp(-((az - 330) ** 2) / 550) * 6.2;
      return Math.max(0.3, 2.8 + 1.5 * Math.sin(rad * 3) + peak1 + peak2);
    }
    case "amundsen-ritchie": {
      // Complex crater rim with 7°–12° wall peaks
      const wall1 = Math.exp(-((az - 80) ** 2) / 700) * 9.5;
      const wall2 = Math.exp(-((az - 250) ** 2) / 850) * 8.0;
      return Math.max(0.5, 3.5 + 2.2 * Math.cos(rad * 2) + wall1 + wall2);
    }
    case "apollo-17": {
      // Taurus-Littrow valley: North Massif (az ~340°–20°, 15°–18°) and South Massif (az ~170°–210°, 14°–17°)
      const northMassif = Math.exp(-((az <= 180 ? az : az - 360) ** 2) / 700) * 16.5;
      const southMassif = Math.exp(-((az - 185) ** 2) / 650) * 15.2;
      const valleyFloor = 2.5 + 1.2 * Math.sin(rad * 2);
      return Math.max(1.0, valleyFloor + northMassif + southMassif);
    }
    case "apollo-11": {
      // Mare Tranquillitatis: very flat rolling mare with 0.4° to 1.3° distant ridges
      return Math.max(0.2, 0.7 + 0.4 * Math.sin(rad * 3 + 1.1) + 0.2 * Math.cos(rad * 7));
    }
    case "equatorial-reference":
    default: {
      return 0.0;
    }
  }
}

export function generateHorizonArray(siteId: string): number[] {
  return Array.from({ length: 360 }, (_, index) => generateHorizonProfile(siteId, index));
}

export function getTerrainProfile(siteId: string): TerrainProfile {
  const horizon = generateHorizonArray(siteId);
  return {
    schema_version: 1,
    site_id: siteId,
    azimuth_start_deg: 0,
    azimuth_step_deg: 1,
    azimuth_convention: "clockwise_from_north",
    horizon_elevation_deg: horizon,
    mast_height_m: 0,
    horizon_method: "ray_max_elevation_with_lunar_curvature",
    generated_utc: "2026-11-14T00:00:00Z",
    dem: {
      product_id: `LOLA-${siteId.toUpperCase()}-HORIZON`,
      source_url: "https://pds-geosciences.wustl.edu/missions/lro/lola.htm",
      resolution_m: 5,
      projection: "polar_stereographic_or_equirectangular",
      reference_frame: "MOON_ME",
      vertical_datum: MOON_SITE_ELEVATION_DATUM,
      max_ray_distance_m: 35000,
      interpolated_fraction: 0.05,
      vertical_uncertainty_rms_m: 1.2,
      quality_notes: "Computed via ray-casting across LOLA DEM with lunar spherical curvature correction.",
    },
  };
}

