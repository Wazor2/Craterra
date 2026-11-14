# Multidisciplinary Team Contributions
### NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator

This project was built by a collaborative 5-person multidisciplinary engineering and scientific team:

---

### 1. OM — Team Lead, Architecture and Integration
- **Branch:** `feature/integration`
- **Responsibilities:**
  - Defined system architecture, data contracts (`types.ts`), and end-to-end data flow.
  - Initialized Next.js 16, TypeScript, and Tailwind CSS structure.
  - Engineered the Multi-Site and "What-Changed" Comparison Workbench (`src/components/comparison/comparison-workbench.tsx`).
  - Coordinated module integration, code audits, and overall software quality assurance.
  - Finalized production build pipelines and deployment configurations.

### 2. JAY — Ephemeris and Celestial Calculations
- **Branch:** `feature/ephemeris`
- **Responsibilities:**
  - Standardized the NAIF SPICE DE440 kernel manifest and body-fixed frame (`MOON_ME`).
  - Derived the analytical lunar celestial mechanics algorithms for Sun and Earth position vectors in `src/lib/science/mission.ts`.
  - Implemented the topocentric parallax correction algorithm in `src/lib/science/geometry.ts`.
  - Authored the Python ephemeris calculation scripts in `science/calculate_ephemeris.py`.

### 3. KALYANI — Terrain and Visibility Analysis
- **Branch:** `feature/terrain`
- **Responsibilities:**
  - Ingested and processed high-resolution LOLA digital elevation models from NASA GSFC PGDA and PDS Geosciences Node.
  - Derived the spherical curvature correction formula ($\Delta h = d^2 / (2 R_{\text{Moon}})$) for multi-kilometer horizon rays.
  - Generated the 360-degree discrete horizon arrays for all 8 candidate sites in `src/lib/data/site-catalogue.ts` and `data/terrain/terrain_profiles.json`.
  - Implemented the circular interpolation algorithm handling the $359^\circ \leftrightarrow 0^\circ$ seam in `src/lib/science/visibility.ts`.

### 4. SACHI — Frontend and Scientific Visualizations
- **Branch:** `feature/frontend`
- **Responsibilities:**
  - Designed the mission-control dark space UI using Tailwind CSS.
  - Built the dual interactive sky view visualization:
    - Circular Polar Sky Radar (elevation-scaled markers, Zenith center, LOLA obstruction polygon).
    - 2D Panoramic Horizon View (azimuth vs. elevation with filled terrain silhouette).
  - Developed the synchronized 29.53-day synodic timeline strips and animation scrubber (6h/s).
  - Designed responsive layouts, metric telemetry cards, and the Simple/Expert mode inspection panel.

### 5. MANAN — Data Research, Validation and Testing
- **Branch:** `feature/data-validation`
- **Responsibilities:**
  - Researched authoritative NASA sources (NSSDCA, NASA Artemis III candidate region announcement) to verify site coordinates.
  - Designed and executed independent validation benchmarking against JPL Horizons ephemerides.
  - Authored the automated unit and contract test suites in `tests/` (19 passing tests).
  - Compiled comprehensive project documentation, validation reports, and installation guides.
