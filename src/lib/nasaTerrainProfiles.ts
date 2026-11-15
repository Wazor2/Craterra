export type TerrainMorphology =
  | "crater_rim"
  | "connecting_ridge"
  | "massif_summit"
  | "highland_plateau"
  | "mare_plain"
  | "massif_valley";

export interface NasaTerrainProfile {
  siteId: string;
  /** Elevation relative to 1,737.4 km lunar mean radius (MOON_ME datum), in meters */
  elevationM: number;
  /** Regional elevation range summary from NASA LOLA / SLDEM2015 */
  elevationRangeM: string;
  /** Local landing pad slope range (degrees, e.g., HLS <8 deg safe zone) */
  padSlopeDeg: [number, number];
  /** Surrounding flank, massif, or crater wall slope range (degrees) */
  flankSlopeDeg: [number, number];
  /** Characteristic vertical relief around the site (meters) */
  reliefM: number;
  /** Dominant lunar landform type driving 3D terrain sculpting */
  morphology: TerrainMorphology;
  /** Primary drop-off / crater interior / valley orientation azimuth (deg clockwise from N) */
  primaryAzimuthDeg: number;
  /** Regolith albedo tint multiplier (darker basaltic mare vs brighter highland anorthosite) */
  regolithTintHex: number;
  /** Boulder scatter scale (1.0 = standard highland ejecta) */
  boulderDensity: number;
  /** Short geological & topographic note */
  geomorphology: string;
  /** Trusted NASA dataset citation */
  nasaDataset: string;
  nasaDatasetUrl: string;
}

export const NASA_TERRAIN_PROFILES: Record<string, NasaTerrainProfile> = {
  shackleton_rim: {
    siteId: "shackleton_rim",
    elevationM: 1680,
    elevationRangeM: "+1,200 m to +2,000 m crest (−2,500 m crater floor)",
    padSlopeDeg: [5, 8],
    flankSlopeDeg: [28, 32],
    reliefM: 4200,
    morphology: "crater_rim",
    primaryAzimuthDeg: 129, // Steep 4.2 km drop into Shackleton crater interior
    regolithTintHex: 0xe6e9ef,
    boulderDensity: 1.15,
    geomorphology:
      "Elevated crater rim crest (~21 km diameter) with an HLS-compliant 5°–8° crest saddle dropping precipitously (~30° interior wall, 4.2 km deep) into the permanently shadowed interior and sloping ~9°–13° along the outer ejecta blanket.",
    nasaDataset: "NASA GSFC PGDA Site 04 · LRO LOLA 5 m/px LDEM (MOON_ME 1,737.4 km)",
    nasaDatasetUrl: "https://pgda.gsfc.nasa.gov/products/78",
  },
  connecting_ridge: {
    siteId: "connecting_ridge",
    elevationM: 1450,
    elevationRangeM: "+1,300 m to +1,900 m ridge spine",
    padSlopeDeg: [5, 8],
    flankSlopeDeg: [20, 28],
    reliefM: 3600,
    morphology: "connecting_ridge",
    primaryAzimuthDeg: 326, // Flanks drop toward Shackleton & de Gerlache PSRs
    regolithTintHex: 0xe2e6ed,
    boulderDensity: 1.05,
    geomorphology:
      "Narrow elevated saddle ridge linking Shackleton and de Gerlache craters; 5°–8° crest benches flanked on both perpendicular sides by steep 20°–28° slopes plunging into adjacent permanently shadowed basins.",
    nasaDataset: "NASA GSFC PGDA Site 01 · LRO LOLA + NAC SfS 5 m/px DEM",
    nasaDatasetUrl: "https://pgda.gsfc.nasa.gov/products/78",
  },
  malapert_massif: {
    siteId: "malapert_massif",
    elevationM: 5120,
    elevationRangeM: "+5,000 m to +5,174 m summit plateau",
    padSlopeDeg: [4, 8],
    flankSlopeDeg: [18, 25],
    reliefM: 5000,
    morphology: "massif_summit",
    primaryAzimuthDeg: 312, // Steep escarpment overlooking neighboring lowlands / Haworth
    regolithTintHex: 0xebedf2,
    boulderDensity: 1.1,
    geomorphology:
      "Towering 50 km polar massif rising ~5 km above local lowlands (~8 km above Haworth Crater floor); relatively flat 4°–8° summit terrace bordered by rugged 18°–25° escarpments.",
    nasaDataset: "NASA GSFC PGDA Site 23 · LRO LOLA 5 m/px & 60 m/px Polar DEM",
    nasaDatasetUrl: "https://pgda.gsfc.nasa.gov/products/78",
  },
  nobile_rim: {
    siteId: "nobile_rim",
    elevationM: 2420,
    elevationRangeM: "−1,430 m to +6,800 m regional rim range",
    padSlopeDeg: [5, 10],
    flankSlopeDeg: [15, 22],
    reliefM: 3100,
    morphology: "highland_plateau",
    primaryAzimuthDeg: 166, // Slope down toward Nobile crater basin
    regolithTintHex: 0xdfe3ea,
    boulderDensity: 1.2,
    geomorphology:
      "Heavily cratered ancient highland plateau on the western flank of Nobile Crater; 5°–10° traversable regolith benches interspersed with degraded 15°–22° terraced crater walls.",
    nasaDataset: "NASA GSFC PGDA Site 06 (Nobile Rim 1) · LRO LOLA 5 m/px LDEM",
    nasaDatasetUrl: "https://pgda.gsfc.nasa.gov/products/78",
  },
  apollo_11: {
    siteId: "apollo_11",
    elevationM: -1926,
    elevationRangeM: "−1,926 m datum (Mare Tranquillitatis)",
    padSlopeDeg: [1, 3],
    flankSlopeDeg: [2, 5],
    reliefM: 120,
    morphology: "mare_plain",
    primaryAzimuthDeg: 59,
    regolithTintHex: 0xb2b7c0, // Darker basaltic mare regolith
    boulderDensity: 0.45,
    geomorphology:
      "Smooth dark basaltic mare plain in southwestern Mare Tranquillitatis (~1.93 km below 1,737.4 km lunar datum); gentle <3° local slopes punctuated by shallow West and Double craters.",
    nasaDataset: "NASA LRO LOLA SLDEM2015 + LROC NAC Tranquility Base DTM",
    nasaDatasetUrl: "https://pds-geosciences.wustl.edu/missions/lro/lola.htm",
  },
  apollo_17: {
    siteId: "apollo_17",
    elevationM: -2550,
    elevationRangeM: "−2,500 m to −2,600 m valley floor (0 m to +200 m massif peaks)",
    padSlopeDeg: [3, 6],
    flankSlopeDeg: [25, 30],
    reliefM: 2300,
    morphology: "massif_valley",
    primaryAzimuthDeg: 0, // North Massif (~0°) and South Massif (~180°) wall in valley
    regolithTintHex: 0xbcc1cb, // Dark-mantled basalt floor + lighter massif talus
    boulderDensity: 1.35,
    geomorphology:
      "Deep dark-mantled basalt valley (~2.55 km below lunar datum) with 3°–6° floor slopes transitioning to 7°–16° talus aprons and flanked abruptly by 25°–30° North (~2,100 m) and South (~2,300 m) Massif walls.",
    nasaDataset: "NASA LRO LOLA SLDEM2015 + LROC NAC Taurus-Littrow DTM",
    nasaDatasetUrl: "https://pds-geosciences.wustl.edu/missions/lro/lola.htm",
  },
};

export function getNasaTerrainProfile(siteId: string): NasaTerrainProfile {
  return (
    NASA_TERRAIN_PROFILES[siteId] ?? {
      siteId,
      elevationM: 0,
      elevationRangeM: "0 m reference datum",
      padSlopeDeg: [3, 7],
      flankSlopeDeg: [12, 20],
      reliefM: 1500,
      morphology: "highland_plateau",
      primaryAzimuthDeg: 180,
      regolithTintHex: 0xc2c6ce,
      boulderDensity: 1.0,
      geomorphology:
        "Lunar highland terrain profile derived from LRO LOLA reference elevation.",
      nasaDataset: "NASA LRO LOLA Gridded DEM (1,737.4 km datum)",
      nasaDatasetUrl: "https://pgda.gsfc.nasa.gov/products/78",
    }
  );
}
