Live Demo: https://ais-dev-yaoikytu7g7sa65bvwml2s-870833335351.asia-northeast1.run.app

# Lunar Landing Site Planner

**NASA Space Apps Challenge 2026** — A mission-planning web tool that visualizes when the Sun and Earth rise above local lunar terrain for South Pole and Apollo landing sites, enabling mission planners to evaluate solar power continuity, direct-to-Earth communications, and 2-week launch slip resilience.

## Features

- **Planner (`/`)**: Interactive 360° horizon **SkyView** with terrain silhouette, zoom, South/North centering, and color-blind-safe Sun/Earth markers; UTC **TimeScrubber** with event-jump controls and playback; **NumberCards** with live elevation margins and simple solar power index; 29.53-day **TimelineStrips** with pattern-coded visibility bands; and 90-day × 24h **IllumHeatmap**.
- **Compare & What-Changed (`/compare`)**: Side-by-side comparison of 2–3 landing sites on a single synchronized UTC timeline, plus a **What-Changed** 14-day mission delay analyzer computing exact deltas in sunlit hours, Earth-visible hours, and outage durations.
- **About / Method (`/about`)**: Plain-language explanation of selenocentric geometry, physical assumptions, limitations, NASA/LRO data credits, roadmap, and AI-use disclosure.

## Quick Start

```bash
npm install
npm run check-data
npm test
npm run dev
```

## Data Sources

- Lunar orbital & solar ephemeris geometry modeled on IAU Mean Earth / Polar Axis selenographic frame and Cassini's laws (modeled after JPL Horizons `coord@301`).
- Terrain horizon silhouettes modeled on NASA LRO LOLA South Pole gridded DEMs (`20 m/px`–`60 m/px`) and SLDEM2015 / LROC NAC DTMs via PDS Geosciences Node, Moon Trek, and LROC Quickmap.

## 3-Minute Demo Script

1. **0:00–0:45 — Problem**: Open the **Planner** on **Shackleton Crater Rim**. Point out the narrow ±1° solar margin above the crater horizon and Earth dipping below local ridges.
2. **0:45–1:30 — Two-Week Delay**: Scrub forward 14 days (or use **Jump to next sunset** / **Earthset**). Show how the Sun and Earth visibility strips visibly shift as lunar phase and draconic libration progress.
3. **1:30–2:30 — Compare Alternatives**: Switch to **Compare** (`/compare`), select **Shackleton Crater Rim**, **Connecting Ridge**, and **Malapert Massif Summit**, and inspect **What-Changed** (`+14 days` delay). Show how Connecting Ridge maximizes solar continuity while Malapert Massif preserves higher Earth contact margin.
4. **2:30–3:00 — Method & Roadmap**: Open **About / Method** (`/about`) to review physical assumptions (no atmosphere, disc center, 2 m mast), limitations, and roadmap (custom coordinates, 3D terrain).
