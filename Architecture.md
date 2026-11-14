# System Architecture
### Lunar Landing Site Navigator — NASA Space Apps Challenge 2026

---

## 1. Architectural Philosophy

The Lunar Landing Site Navigator is designed according to a clean separation of concerns:
1. **Global Ephemeris Layer:** Celestial positions of the Sun and Earth relative to the Moon's center over time. These vectors are independent of the chosen landing location and depend solely on the solar system ephemeris.
2. **Site-Specific Topographic Layer:** Local 360-degree horizon profiles derived from NASA LOLA digital elevation models. These profiles are independent of time.
3. **Topocentric Synthesis & Visibility Engine:** Transforms global vectors into topocentric East-North-Up (ENU) coordinates for any site, taking into account topocentric parallax and spherical surface curvature, and evaluates line-of-sight against the local horizon.

---

## 2. Component Hierarchy

```text
lunar-landing/
├── src/
│   ├── app/                    # Next.js App Router (Planner, Compare, About routes)
│   │   ├── page.tsx            # Main Mission Planner page
│   │   ├── compare/page.tsx    # Multi-Site & "What Changed" workbench
│   │   ├── about/page.tsx      # Scientific methodology and provenance
│   │   └── globals.css         # Styling with Tailwind CSS
│   ├── components/
│   │   ├── mission-planner.tsx # Planner UI, Dual Sky Views, Metrics, Controls
│   │   └── comparison/
│   │       └── comparison-workbench.tsx # Side-by-side site & date slip comparison
│   └── lib/
│       ├── contracts/          # Strict schema definitions (types.ts, validate.ts)
│       ├── data/               # Curated site catalogue & horizon profiles
│       └── science/            # Mathematical & astronomical calculations
│           ├── geometry.ts     # ENU transformations, parallax, vector algebra
│           ├── visibility.ts   # Circular horizon interpolation, solar disk states
│           └── mission.ts      # Celestial mechanics, synodic timeline, event crossings
├── science/                    # Python Scientific Processing Layer
│   ├── load_kernels.py         # NAIF SPICE kernel manifest
│   ├── calculate_ephemeris.py  # Global MOON_ME ephemeris generation
│   ├── generate_horizon.py     # Ray-casting with spherical curvature drop
│   ├── calculate_visibility.py # Topocentric clearances and event crossings
│   └── validate_horizons.py    # Independent JPL Horizons benchmark verification
├── data/                       # Versioned scientific data products
│   ├── sites/sites.json        # Curated candidate site catalogue
│   ├── terrain/terrain_profiles.json # 360° LOLA horizon profiles
│   └── processed/ephemeris.json      # Precalculated ephemeris series
└── tests/                      # Automated test suite (19 unit & contract tests)
```

---

## 3. Data Flow Diagram

```
                 +-----------------------------+
                 |  NASA SPICE / JPL Ephemeris |
                 +-----------------------------+
                               |
                               v
                     [ Global Vectors in km ]
                 (Sun & Earth in MOON_ME frame)
                               |
       +-----------------------+-----------------------+
       |                                               |
       v                                               v
+-----------------------+                     +-----------------------+
| Landing Site Geodetic |                     | LOLA Topography DEM   |
| (Lat, Lon, Elevation) |                     | (360 Azimuth Rays)    |
+-----------------------+                     +-----------------------+
       |                                               |
       v                                               v
+-------------------------------+             +-----------------------+
| Topocentric Parallax & ENU    |             | Local Horizon Profile |
| Elevation & Azimuth Derived   |             | Curvature Corrected   |
+-------------------------------+             +-----------------------+
       |                                               |
       +-----------------------+-----------------------+
                               |
                               v
               +-------------------------------+
               | Line-of-Sight & Clearance     |
               | - Sun: Full/Partial/Occulted  |
               | - Earth: Geometric Visibility |
               +-------------------------------+
                               |
                               v
               +-------------------------------+
               | Metrics & Timeline Generation |
               | - Illumination Windows        |
               | - Longest Darkness Duration   |
               | - Sunrise / Sunset Crossings  |
               +-------------------------------+
                               |
                               v
               +-------------------------------+
               | Mission Planning Dashboard    |
               | (Polar Radar, 2D Panorama,    |
               |  Synodic Month Timeline)      |
               +-------------------------------+
```

---

## 4. Key Performance Characteristics

- **Zero Client-Side Heavy Binaries:** Does not require compiling C/Fortran SPICE libraries or loading multi-gigabyte GeoTIFF rasters in the user's browser.
- **Deterministic Math:** Calculations run in real-time in pure TypeScript/JavaScript using native vector mathematics, ensuring instantaneous response when scrubbing through time.
- **Contract-Validated Data:** Every dataset loaded into the application is validated against strict TypeScript runtime schemas (`src/lib/contracts/validate.ts`).
