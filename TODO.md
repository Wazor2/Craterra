# Project Outcomes

Status key: `[OPEN]` not yet delivered; `[DONE]` complete with verified implementation and test evidence.

## 1. Common scientific data contract and provenance — [DONE]
- A versioned site database containing 8 curated sites (2 Apollo landing locations: Apollo 11, Apollo 17; 5 lunar south-pole candidate regions: Shackleton Crater Rim, Connecting Ridge, Malapert Massif, Peak near Shackleton, Amundsen–Ritchie Rim; and 1 Equatorial reference: Sinus Medii) implemented in `src/lib/data/site-catalogue.ts` and `data/sites/sites.json`.
- Standard coordinate conventions strictly documented and enforced: UTC ISO-8601 with `Z`; kilometres for celestial vectors; metres for terrain; degrees for angles; east-positive longitude normalized to `[-180, 180)`; `MOON_ME` body-fixed frame; azimuth 0° North, 90° East, 180° South, 270° West; elevation relative to local horizontal.
- Comprehensive runtime validators in `src/lib/contracts/validate.ts` with passing test suites in `tests/science.test.ts`.

## 2. Reproducible Ephemeris and Local Topocentric Geometry — [DONE]
- Implemented high-precision lunar body-fixed (`MOON_ME`) ephemeris in `src/lib/science/mission.ts` based on NASA / IAU / JPL standard lunar solution (Brown-Chapront / Meeus).
- Implemented `topocentricDirection()` in `src/lib/science/geometry.ts` which subtracts the landing site vector from the Moon-centered Earth vector before angular derivation, preserving topocentric parallax.
- Verified physical validity via unit tests in `tests/mission.test.ts`:
  - Sun distance within ~1.47e8–1.52e8 km.
  - Earth distance within ~355,000–410,000 km.
  - Subsolar latitude bounded strictly within lunar obliquity (±1.5424°).
  - Nearside (+X) Earth orientation and far-side obstruction sanity conditions verified.

## 3. LOLA DEM Processing, Horizon and Visibility — [DONE]
- Implemented 360° terrain horizon profiles in `src/lib/data/site-catalogue.ts` capturing real topographic relief for candidate regions (Connecting Ridge, Shackleton, Malapert Massif, Peak near Shackleton, Apollo massifs) with spherical curvature correction $\Delta h = d^2 / (2 R_{\text{Moon}})$.
- Implemented circular horizon interpolation with seamless $359^\circ \leftrightarrow 0^\circ$ wrapping in `src/lib/science/visibility.ts`.
- Solar disk visibility accounts for 0.533° solar angular diameter, distinguishing full disk, partial disk, and occulted states.
- Earth visibility evaluated as geometric line-of-sight and clearly caveated against RF communications link closure.

## 4. Events and Mission-Condition Metrics — [DONE]
- Sunrise, sunset, Earthrise, and Earthset event zero-crossing refinement using linear clearance interpolation between time steps (`src/lib/science/visibility.ts`).
- Integrated mission statistics in `analyzeSiteMission()`:
  - Sunlight availability percentage over synodic month.
  - Earth line-of-sight percentage.
  - Longest continuous darkness duration (battery sizing constraint).
  - Illumination and communication visibility window counts and durations.

## 5. Planner, Sky View, Controls and Synchronized Timeline — [DONE]
- Interactive mission planner in `src/components/mission-planner.tsx` with live site selector, UTC date/time pickers, play/pause animation scrubber (6h/s), and jump-to-next-sunrise/sunset controls.
- Dual interactive sky views:
  1. Polar Sky Radar: Zenith (+90°) at center, horizon ring (0°) at radius 110 px, below-horizon ring, elevation-scaled markers for Sun and Earth, and local LOLA terrain obstruction silhouette polygon.
  2. 2D Panoramic Horizon View: Azimuth ($0^\circ-360^\circ$) on X-axis, Elevation ($-10^\circ$ to $+30^\circ$) on Y-axis with filled terrain profile.
- Synchronized dual timeline strips across a full 29.53-day lunar synodic month (with selectable 14-day, 7-day, and 24-hour ranges).
- Simple vs. Expert mode toggle exposing astrometric frames, LOLA DEM resolution, and assumptions.

## 6. Site Comparison and "What Changed" Analysis — [DONE]
- Side-by-side comparative workbench in `src/components/comparison/comparison-workbench.tsx` at `/compare`.
- Multi-site comparison (2 or 3 sites simultaneously) sharing synchronized date, time, and synodic timelines with comparative variance metrics.
- "What Changed" 2-date scenario comparison (e.g. T0 scheduled date vs. T+14 days slip) analyzing lighting transitions, elevation shifts, and communication windows as requested in the Hackathon Scenario.

## 7. Methodology, Provenance, and Architecture Documentation — [DONE]
- Comprehensive Methodology and Data Provenance page at `/about` documenting `MOON_ME`, LOLA ray casting, curvature equations, and citations to NASA NAIF, PDS, PGDA, and NSSDCA.
- Modular team responsibility mapping across OM, JAY, KALYANI, SACHI, and MANAN.
