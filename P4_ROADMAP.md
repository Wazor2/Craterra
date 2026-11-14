# P4_ROADMAP.md — P4 Execution Roadmap
**Project:** NASA Space Apps Challenge 2026 — Lunar Landing Site Planner  
**Workstream:** P4 — Visualization Frontend  
**Last updated:** 2026-11-14

---

> [!NOTE]
> A milestone is marked **Complete** only after implementation, verification, and human review.
> A prompt being written or issued does not mark a milestone complete.
> Optional stretch features are explicitly labeled.

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete — implemented, verified, reviewed |
| 🔄 | In progress |
| ⏳ | Pending — next in queue |
| 🔲 | Not started |
| 🚧 | Blocked — external dependency |
| ✨ | Optional / stretch feature |

---

## P00 — Repository Reconnaissance & Technical Audit

**Objective:** Understand the existing codebase, verify the technology stack, identify what P4 must build, and document all risks before any implementation begins.

**Scope:**
- Full repository directory inspection
- Technology stack verification
- Existing frontend inventory
- Existing data contracts and utilities audit
- Visualization dependency assessment
- P4 ownership boundary definition
- Technical risk identification
- Design reference review

**Dependencies:** None.

**Acceptance criteria:**
- Repository fully inspected.
- Actual technology stack verified.
- P4 ownership boundaries clear.
- Major technical risks documented.
- Recommended implementation approach grounded in actual repository state.
- No project files modified.

---

| Prompt | Description | Status |
|--------|-------------|--------|
| P00-01 | Repository reconnaissance | ✅ Complete — 2026-11-14 |
| P00-02A | Context and continuity documentation (AGENT.md, P4_History.md, P4_ROADMAP.md) | ✅ Complete — 2026-11-14 |
| P00-02 | Official NASA challenge brief analysis | ✅ Complete — 2026-11-14 |

---

## P01 — Product Definition and Frontend Architecture

**Objective:** Define the complete P4 product scope, confirm the technology stack with P1, and establish the frontend architecture before any components are built.

**Scope:**
- Confirm application scaffold (framework, package manager, directory structure) with P1
- Define P4 component architecture
- Define data loading and validation strategy
- Define state management approach
- Define design token system
- Establish mock data strategy
- Document integration contracts with P1 and P5

**Dependencies:**
- P1 must confirm: framework, package manager, App Router vs Pages Router, data file location, 3D terrain scope
- P00 complete

**Acceptance criteria:**
- Technology stack confirmed with P1
- Directory structure agreed
- Component list defined
- State management approach chosen
- Mock data strategy documented
- No implementation begun

**Status:** 🚧 Blocked — awaiting P1 architecture decisions

---

## P02 — Design System and Visual Direction

**Objective:** Establish the typographic system, color palette, spacing scale, and design tokens that all P4 components will use.

**Scope:**
- Typography selection and scale (Inter or Geist)
- Color palette — dark base, accent, semantic colors (sun visible, Earth visible, below horizon)
- Spacing and sizing scale (Tailwind configuration)
- Design token definitions in `globals.css` and `tailwind.config.*`
- Component anatomy guidelines (how panels, labels, and charts are structured)
- Motion and animation principles

**Dependencies:** P01 complete; framework initialized

**Acceptance criteria:**
- Design tokens implemented in CSS/Tailwind config
- Typography renders correctly
- Color system supports dark background (space aesthetic) with accessibility contrast
- No generic SaaS or glassmorphism aesthetics
- Reviewed visually by human developer

**Status:** 🔲 Not started

---

## P03 — Application Shell and Dashboard Foundation

**Objective:** Build the top-level page layout and dashboard structure that P4 visualization components will inhabit.

**Scope:**
- Root layout (header, navigation if any, main content area)
- Site selector panel skeleton
- Primary visualization panel skeleton
- Timeline panel skeleton
- Loading and error state components
- Responsive grid structure

**Dependencies:** P02 complete

**Acceptance criteria:**
- Application renders without errors
- Responsive layout works at desktop, tablet, and mobile widths
- Loading and error states visible and correct
- Design tokens apply consistently
- No visualization logic implemented yet

**Status:** 🔲 Not started

---

## P04 — Scientific Data Contracts and Mock Integration

**Objective:** Implement TypeScript interfaces, runtime validators, and loaders for all four shared data contracts. Establish clearly-labeled mock data for use until P2/P3 deliver real files.

**Scope:**
- `src/types/dataContracts.ts` — TypeScript interfaces for all four contracts
- `src/lib/loaders/loadSites.ts`
- `src/lib/loaders/loadEphemeris.ts`
- `src/lib/loaders/loadHorizon.ts`
- `src/lib/validation/contractValidators.ts` — runtime schema validation
- `src/lib/science/visibility.ts` — `isVisible(el, az, horizon): boolean`
- `src/lib/science/azimuthUtils.ts` — normalize, interpolate, 360° wraparound
- `src/lib/science/timeIndex.ts` — UTC offset → array index arithmetic
- Mock data files for at least one lunar south pole site (clearly labeled)

**Dependencies:** P01 and P03 complete; P1 must confirm data file location

**Acceptance criteria:**
- All TypeScript interfaces match agreed data contracts exactly
- Validators catch: wrong array lengths, non-finite values, out-of-range azimuths, UTC format errors
- `isVisible()` correctly implements `el > horizon[az]` with circular interpolation at 359°→0°
- Mock data loads and validates without errors
- Science utilities have unit tests or verified manual test cases
- No fabricated data presented as real

**Status:** 🔲 Not started

---

## P05 — Sky-View Visualization Engine

**Objective:** Build the core polar sky-view component that renders the terrain horizon, sun marker, and Earth marker at their current azimuth and elevation.

**Scope:**
- `src/components/visualizations/SkyView.tsx` — polar SVG container
- `src/components/visualizations/HorizonCurve.tsx` — 360-point terrain horizon overlay
- `src/components/visualizations/CelestialMarker.tsx` — positioned marker for sun/Earth
- Polar coordinate math: azimuth/elevation → SVG x/y
- Terrain-visible vs. below-horizon visual states
- Azimuth compass labels (N, E, S, W)
- Elevation rings (0°, 30°, 60°, 90°)
- Responsive via `viewBox`
- Loading and empty states

**Dependencies:** P04 complete

**Acceptance criteria:**
- Horizon curve renders correctly as a continuous line across all 360°
- 359°→0° azimuth wraparound renders without gap or discontinuity
- Sun and Earth markers position correctly at any az/el value
- Markers change visual state when below the terrain horizon
- Elevation rings and compass labels are legible and correctly spaced
- Component is responsive (scales with container)
- Renders correctly with mock data

**Status:** 🔲 Not started

---

## P06 — Time Controller and Simulation Engine

**Objective:** Build the time scrubber that allows users to step or play through the ephemeris time range, updating all visualizations simultaneously.

**Scope:**
- `src/components/visualizations/TimeController.tsx` — scrubber, play/pause, step controls
- `src/store/useMissionStore.ts` — Zustand store: selected site, time index, playback state
- Time label display: current UTC timestamp from `start_utc + timeIndex * step_minutes`
- Play speed control (1×, 10×, 100×)
- Clamp and boundary behavior at array start and end
- Keyboard accessibility (arrow keys)
- Integration with SkyView (sky view updates as time index changes)

**Dependencies:** P05 complete

**Acceptance criteria:**
- Scrubber steps through the full ephemeris array without out-of-bounds access
- UTC timestamp label is accurate for every index
- Play/pause works; playback stops at array end
- Sky view updates correctly at every time step
- Performance acceptable for arrays of ~700 steps (28-day month at 1-hour resolution)
- Keyboard accessible

**Status:** 🔲 Not started

---

## P07 — Scientific Metrics and Event Detection

**Objective:** Display derived scientific values for the current time index: sun/Earth elevation and azimuth, terrain-visible flags, sun angle above horizon, time to next visibility event.

**Scope:**
- `src/components/visualizations/MetricsPanel.tsx`
- Current sun elevation, sun azimuth, sun visible (boolean)
- Current Earth elevation, Earth azimuth, Earth visible (boolean)
- Degrees above/below horizon for sun and Earth
- Time to next sunrise (sun becoming terrain-visible)
- Time to next Earth rise (Earth becoming terrain-visible)
- Clear "MOCK DATA" label when real data is not loaded
- Error state when data is invalid

**Dependencies:** P06 complete; P04 science utilities

**Acceptance criteria:**
- All displayed values derived from actual ephemeris and horizon data, not invented
- Terrain-visible flag uses `isVisible()` from P04 — not approximated
- Time-to-event calculation scans forward in the ephemeris array correctly
- Transitions between visible/not-visible are detected correctly at array boundaries
- No NaN or undefined displayed to the user

**Status:** 🔲 Not started

---

## P08 — Sunlight and Earth Visibility Timelines

**Objective:** Build time-series strip charts showing sun and Earth above/below the terrain horizon across the full ephemeris time range.

**Scope:**
- `src/components/visualizations/VisibilityTimeline.tsx` — combined strip chart
- Two horizontal strips: sun visibility, Earth visibility
- Each strip: one segment per time step, colored by above/below horizon
- Time axis with UTC labels at meaningful intervals
- Current-time cursor synchronized with the time controller
- Click-to-seek: clicking a strip position updates the time index
- Tooltip showing exact UTC time and elevation value at hover
- Performance: SVG for ≤1000 steps; consider Canvas for larger arrays

**Dependencies:** P06 complete

**Acceptance criteria:**
- Sun and Earth visibility correctly derived from `isVisible()` for every time step
- Strip colors accurately represent above-horizon (lit) vs. below-horizon (dark) states
- Time cursor moves synchronously with the time controller
- Click-to-seek changes the time index correctly
- Tooltip shows accurate UTC time and elevation
- Renders in <100ms for a 28-day, 1-hour-step dataset (~672 steps)
- Legible at desktop width; degrades gracefully on mobile

**Status:** 🔲 Not started

---

## P09 — Real Dataset Integration

**Objective:** Replace mock data with real ephemeris files from P2 and real horizon files from P3. Validate that all visualizations render correctly with real scientific data.

**Scope:**
- Remove or gate mock data files
- Load and validate real P2 ephemeris JSON
- Load and validate real P3 horizon JSON
- Identify and resolve any data-contract mismatches
- Verify scientific accuracy of visibility calculations with real data
- Report any discrepancies to P2/P3

**Dependencies:**
- P08 complete
- P2 must deliver: `public/data/ephemeris/<site_id>.json`
- P3 must deliver: `public/data/horizon/<site_id>.json`

**Acceptance criteria:**
- Application loads real data without validation errors
- All visualizations render correctly with real data
- No NaN, undefined, or display errors
- Terrain visibility logic produces scientifically defensible results
- Any discovered data issues reported to P2/P3 with specific file, field, and index

**Status:** 🚧 Blocked — P2 and P3 data not yet available

---

## P10 — Illumination Heatmap

**Objective:** Build a grid-based heatmap showing cumulative or time-sliced sun availability across the full ephemeris time range.

**Scope:**
- `src/components/visualizations/IlluminationHeatmap.tsx`
- X-axis: time (day or orbit phase)
- Y-axis: individual sites (for multi-site comparison) or azimuth sectors
- Cell color: fraction of time steps where sun is terrain-visible
- Accurate color scale (sequential, perceptually uniform)
- Tooltip with exact illumination percentage and time range
- Site selector integration

**Dependencies:** P09 complete; multiple site data available

**Acceptance criteria:**
- Illumination percentages computed from actual `isVisible()` results — not approximated
- Color scale is perceptually uniform and interpretable
- Heatmap updates when selected time range or site changes
- Performance acceptable for multi-site comparison (up to 10 sites)

**Status:** 🔲 Not started

---

## P11 — Advanced Visualization and Optional 3D ✨

**Objective:** *(Optional stretch goal)* Implement a Three.js terrain view that renders the lunar horizon profile in 3D with the sun and Earth positioned correctly in the sky.

**Scope:**
- `src/components/visualizations/TerrainView3D.tsx`
- Three.js / React Three Fiber scene
- Heightmap-based terrain mesh (from P3 DEM data if available as texture)
- Sun and Earth positioned as 3D direction vectors
- Sky dome with horizon profile overlay
- Performance-safe rendering (LOD if needed)

**Dependencies:**
- P09 complete
- P1 approval to add Three.js to the bundle
- P3 must confirm DEM texture/heightmap availability

**Note:** This milestone is explicitly optional. It is included as a stretch goal and must not delay core functionality. Only begin if all mandatory milestones (P00–P10) are complete.

**Status:** ✨ Optional — not started

---

## P12 — Responsiveness, Accessibility and Polish

**Objective:** Audit and improve the entire P4 frontend for responsive layout, keyboard accessibility, screen-reader compatibility, and visual polish.

**Scope:**
- Responsive layout audit at mobile (375px), tablet (768px), desktop (1280px+)
- Keyboard navigation for time controller and site selector
- ARIA labels and roles for all interactive elements
- Focus management
- Reduced-motion media query compliance
- Typography and spacing review
- Visual polish pass: alignment, color consistency, micro-interactions
- Performance audit: render times, bundle size, re-render frequency

**Dependencies:** All mandatory milestones (P00–P10) complete

**Acceptance criteria:**
- All interactive elements keyboard accessible
- Core information legible at 375px width
- No critical WCAG 2.1 AA violations
- Visualizations do not overflow containers at any breakpoint
- No unnecessary re-renders on time scrub
- Reduced-motion preference respected

**Status:** 🔲 Not started

---

## P13 — Integration, Quality and Reliability Audit

**Objective:** Final end-to-end quality check before project submission. Verify P4 integration with P1's shell, P5's comparison interface, and all data sources.

**Scope:**
- Full integration test with P1's application shell and routing
- Full integration test with P5's comparison and summaries interface
- Cross-browser check (Chrome, Firefox, Safari if available)
- Error state testing (missing files, malformed JSON, network failure)
- Performance testing with the largest expected dataset
- Scientific accuracy spot-check with P2 and P3
- Removal of all debug logging, mock-data labels, TODO comments

**Dependencies:**
- P12 complete
- P1 integration complete
- P5 integration complete
- Real data from P2 and P3

**Acceptance criteria:**
- Application runs end-to-end without errors
- All P4 components integrate cleanly with P1 and P5
- Error states are handled gracefully (no crashes on bad data)
- No debug output in production build
- Build succeeds without TypeScript errors or lint warnings
- All mock data removed or gated behind a development flag

**Status:** 🔲 Not started

---

## Summary Table

| Milestone | Title | Status | Mandatory |
|-----------|-------|--------|-----------|
| P00-01 | Repository Reconnaissance | ✅ Complete | ✅ |
| P00-02A | Context Documentation | ✅ Complete | ✅ |
| P00-02 | NASA Challenge Brief Analysis | ✅ Complete — 2026-11-14 |
| P01 | Product Definition & Architecture | 🚧 Blocked (P1) | ✅ |
| P02 | Design System & Visual Direction | 🔲 Not started | ✅ |
| P03 | Application Shell & Dashboard | 🔲 Not started | ✅ |
| P04 | Data Contracts & Mock Integration | 🔲 Not started | ✅ |
| P05 | Sky-View Visualization Engine | 🔲 Not started | ✅ |
| P06 | Time Controller & Simulation | 🔲 Not started | ✅ |
| P07 | Scientific Metrics & Event Detection | 🔲 Not started | ✅ |
| P08 | Sunlight & Earth Visibility Timelines | 🔲 Not started | ✅ |
| P09 | Real Dataset Integration | 🚧 Blocked (P2/P3) | ✅ |
| P10 | Illumination Heatmap | 🔲 Not started | ✅ |
| P11 | Advanced 3D Visualization | 🔲 Not started | ✨ Optional |
| P12 | Responsiveness, Accessibility & Polish | 🔲 Not started | ✅ |
| P13 | Integration, Quality & Reliability Audit | 🔲 Not started | ✅ |
