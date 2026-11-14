# Lunar Landing Site Navigator
### NASA Space Apps Challenge 2026

An interactive, scientifically rigorous mission-planning application engineered to evaluate solar illumination dynamics and direct-to-Earth geometric communication line-of-sight for lunar exploration and Artemis landing candidate regions.

---

## Overview

Future lunar missions—especially those targeting the extreme topography of the **Lunar South Pole**—face unprecedented lighting and communications constraints. The Sun hovers within $\pm 1.54^\circ$ of the local horizon, casting elongated and persistent shadows over craters and ridges. Similarly, the Moon's optical and physical librations cause Earth to oscillate near the horizon, risking loss of direct line-of-sight communications.

**Lunar Landing Site Navigator** integrates two independent classes of authoritative scientific data:
1. **Celestial Ephemeris Geometry:** NASA SPICE and JPL planetary ephemerides in the Moon Mean Earth/Polar Axis body-fixed frame (`MOON_ME`), incorporating topocentric parallax.
2. **High-Resolution Lunar Topography:** NASA Lunar Reconnaissance Orbiter (LRO) LOLA digital elevation models, ray-traced across 360 compass azimuths with spherical curvature correction.

---

## Key Features

- **Candidate Landing Site Selector:** Curated database of 8 verified lunar locations, including prime Artemis III candidate regions (Shackleton Crater Rim, Connecting Ridge, Malapert Massif, Peak near Shackleton, Amundsen–Ritchie Rim), historic Apollo sites (Apollo 11, Apollo 17), and an equatorial reference (Sinus Medii).
- **Dual Interactive Sky Views:**
  - **Polar Sky Radar:** Elevation-scaled circular horizon plot showing the Zenith ($+90^\circ$), horizon ($0^\circ$), below-horizon occultation, and the real-time LOLA terrain horizon polygon.
  - **2D Panoramic Horizon Panorama:** Compass azimuth ($0^\circ \to 360^\circ$) vs. elevation ($-10^\circ \to +30^\circ$) with filled terrain profile silhouette, active solar disk ($0.533^\circ$ diameter), and Earth indicator.
- **Synodic Month Timelines:** Synchronized illumination and communications availability timeline strips spanning a complete 29.53-day lunar day (~708.7 hours), with selectable 14-day, 7-day, and 24-hour zoom views.
- **Side-by-Side Site Comparison:** Compare 2 or 3 candidate landing locations simultaneously at the exact same epoch, highlighting variances in continuous darkness duration, solar availability, and Earth line-of-sight.
- **"What-Changed" Temporal Slip Analysis:** Directly compare the impact of a launch slip (e.g., $T_0$ vs. $T+14$ days) on solar elevation, lighting phases, and communication windows.
- **Event Zero-Crossing Detection:** Sub-sample linear interpolation refining sunrise, sunset, Earthrise, and Earthset event timestamps.
- **Simple & Expert Mode Toggle:** Exposes astrometric frame definitions (`MOON_ME`), LOLA DEM resolutions, radial datums (1,737.4 km), and engineering assumptions.

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Run contract & scientific validation tests
pnpm test

# Verify TypeScript types
pnpm typecheck

# Start local Next.js development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the application.

---

## Architecture & Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4.
- **Scientific Engine:** Topocentric vector transformations, spherical curvature corrections, and clearance event detection.
- **Scientific Data Sources:** NASA NAIF SPICE (`de440`, `moon_pa_de440`, `moon_de440`, `pck00011`, `naif0012`), NASA PDS Geosciences LOLA GDR, NASA GSFC PGDA high-resolution polar stereographic products.
- **Validation:** JPL Horizons independent verification and comprehensive automated unit test suites (`tests/`).

---

## Documentation

- [Architecture.md](./Architecture.md) — Architectural design, system layers, and data flow.
- [Scientific_Methodology.md](./Scientific_Methodology.md) — Coordinate frames, mathematical formulations, and algorithms.
- [Data_Sources.md](./Data_Sources.md) — NASA datasets, SPICE kernels, and coordinate provenance.
- [Installation_Guide.md](./Installation_Guide.md) — Prerequisites, installation, and deployment instructions.
- [Validation_Report.md](./Validation_Report.md) — JPL Horizons benchmark comparisons and sanity checks.
- [Team_Contributions.md](./Team_Contributions.md) — Roles and modular responsibilities of the five-person multidisciplinary team.

---

## License

Developed for the **NASA Space Apps Challenge 2026**. Open source under the MIT License.
