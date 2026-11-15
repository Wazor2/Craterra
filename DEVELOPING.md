# Developing — Lunar Landing Site Planner

## Local Commands

- **Install dependencies**: `npm install`
- **Run dev server**: `npm run dev` (serves on port `3000`)
- **Build static bundle**: `npm run build`
- **Typecheck**: `npm run lint`
- **Run unit tests**: `npm test`
- **Validate JSON data contract**: `npm run check-data`
- **Regenerate deterministic summaries**: `npm run generate-summaries`

## Architecture

- `src/lib/types.ts`: Canonical TypeScript interfaces matching `CONTRACT.md`.
- `src/lib/data.ts`: Cached static JSON loaders with `BASE_URL` awareness, contract assertions, and 404 flat-horizon fallback.
- `src/lib/geometry.ts`: Azimuth normalization, wrap-around `horizonAt`, strict `margin > 0` visibility, and UTC time-step indexing.
- `src/lib/events.ts`: Pure crossing detection (sunrise, sunset, Earthrise, Earthset) with linear zero-crossing interpolation and grazing protection.
- `src/lib/windows.ts`: Pure window statistics (`sunlitHours`, `earthVisibleHours`, `longestRun`, `windowStats`) for Compare and What-Changed analysis.
- `src/lib/heatmap.ts`: 90-day × 24-hour UTC solar margin grid and color-blind-safe sequential color mapping.
- `src/components/`: `SkyView`, `TimeScrubber`, `NumberCards`, `TimelineStrips`, `IllumHeatmap`, `SitePicker`, `SiteCard`, `CompareGrid`, `WhatChanged`.
