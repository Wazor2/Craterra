# AGENT.md — P4 Persistent Instructions
**Project:** NASA Space Apps Challenge 2026 — Lunar Landing Site Planner  
**Workstream:** P4 — Visualization Frontend  
**Last updated:** 2026-11-14

---

## 1. Project Identity

- **Challenge:** NASA Space Apps Challenge 2026
- **Challenge URL:** https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/
- **Product:** Lunar Landing Site Planner
- **Purpose:** Help users evaluate lunar landing sites near the south pole by visualizing sun position, Earth position, terrain horizon, sunlight availability, Earth communication windows, and how these conditions change over time.
- **Workstream:** P4 — Visualization Frontend
- **Team size:** Five members

---

## 2. Team Ownership

| Member | Responsibility |
|--------|---------------|
| **P1** | Project leadership, application architecture, integration, deployment |
| **P2** | Sun and Earth ephemeris processing (JPL Horizons) |
| **P3** | Terrain elevation and horizon processing (lunar DEM data) |
| **P4** | Visualization frontend — **this workstream** |
| **P5** | Site descriptions, comparison interface, summaries, presentation |

**Respect these boundaries strictly.** Do not duplicate another member's responsibilities or modify their files without explicit authorization.

---

## 3. P4 Responsibilities

P4 owns the following visualization components and supporting code:

| Feature | Description |
|---------|-------------|
| **Sky-view visualization** | Polar az/el plot showing sun, Earth, and terrain horizon |
| **Time controller and playback** | Scrubber and playback controls over ephemeris time range |
| **Scientific metric presentation** | Derived values: sun/Earth elevation, terrain-visible flag, illumination % |
| **Sunlight visibility timeline** | Time-series strip showing sun above/below terrain horizon |
| **Earth visibility timeline** | Time-series strip showing Earth above/below terrain horizon |
| **Illumination heatmap** | Grid-based heatmap of cumulative or time-sliced sun availability |
| **Optional: Advanced 3D visualization** | Three.js terrain rendering if DEM data is available and in scope |

P4 also owns:
- TypeScript data contracts for all four shared JSON formats
- Runtime validators for all incoming data
- Science utility functions (visibility logic, azimuth interpolation, time index arithmetic)
- Zustand (or equivalent) mission state store

---

## 4. Shared Data Contracts

### `public/data/sites.json`
```typescript
interface Site {
  id: string;
  name: string;
  lat: number;       // degrees
  lon: number;       // degrees
  type: string;
  source_url: string;
  description: string;
}
```

### `public/data/ephemeris/<site_id>.json`
```typescript
interface EphemerisData {
  site_id: string;
  start_utc: string;    // ISO 8601 UTC
  step_minutes: number;
  sun_az: number[];     // degrees, clockwise from north
  sun_el: number[];     // degrees
  earth_az: number[];   // degrees, clockwise from north
  earth_el: number[];   // degrees
  // All arrays must be the same length
}
```

### `public/data/horizon/<site_id>.json`
```typescript
interface HorizonData {
  site_id: string;
  az_step_deg: number;  // must equal 1 (360 samples)
  elev_deg: number[];   // length === 360, one per degree of azimuth
  mast_height_m: number;
  dem_source: string;
}
```

### `public/data/summaries.json`
```typescript
interface SiteSummary {
  site_id: string;
  plain_text: string;
  expert_text: string;
}
```

**Do not modify the shared data contracts without coordinating with P1, P2, P3, and P5.**

---

## 5. Scientific Conventions

| Convention | Rule |
|-----------|------|
| Timestamps | All UTC, ISO 8601 |
| Angles | All in degrees |
| Azimuth | Clockwise from north (0° = north, 90° = east) |
| Horizon samples | Exactly 360, one per degree of azimuth (index 0 = 0°, index 359 = 359°) |
| Terrain visibility | A body is visible only when its elevation exceeds `horizon.elev_deg[Math.round(az) % 360]` |
| Azimuth wraparound | Must handle 359°→0° boundary with circular interpolation; never use naive modulo without testing edge cases |
| Missing data | NaN or undefined samples are invalid; validate and surface as errors, never silently render |
| Mock data | Must be clearly labeled as mock; never presented as real scientific output |
| Atmospheric refraction | The Moon has no atmosphere. **Never apply an atmospheric refraction correction** (no +0.57° offset). The terrain horizon is an absolute cutoff. |
| Solar elevation angle | Must be displayed **prominently** — it is a primary metric per the official challenge brief |
| Time to next event | "Time remaining before sunset or Earthset" is explicitly named in the official brief as critical operational information |
| Earth libration | P2 must confirm whether JPL Horizons output accounts for Earth libration. P4 must surface the ephemeris source in a provenance label. |

**Do not simplify or alter terrain-visibility logic without documenting the reason.**

---

## 6. Technical Principles

- **Inspect before modifying.** Read existing files before creating or changing anything.
- **TypeScript-first.** All new code must be typed. No `any` without justification.
- **Modular components.** One responsibility per component or utility.
- **Separate science from UI.** Visibility calculations and data transformations live in `src/lib/`, not inside components.
- **Reuse shared interfaces.** Import from `src/types/dataContracts.ts`; never redefine locally.
- **Validate all inputs.** Run contract validators on every loaded JSON before passing to visualizations.
- **No fabricated data.** Never present invented values as scientific fact. Mock data must be labeled.
- **Handle all states.** Every component must handle: loading, empty, invalid, error.
- **Stay in scope.** Implement only the current milestone. Do not add unrequested features.

---

## 7. Design Quality Standards

### Desired character
The application must feel like a **sophisticated lunar exploration and mission-planning instrument** — precise, purposeful, and credible.

### Prioritize
- Exceptional typography (Inter or Geist; precise, neutral, legible)
- Purposeful information hierarchy — every element has a reason
- Precise spacing and alignment
- Beautiful but scientifically accurate visualizations
- Restrained, meaningful motion only
- Clear data presentation
- High-quality interaction details
- Responsive layouts

### Explicitly prohibited
- Generic AI-generated SaaS dashboard aesthetics
- Excessive gradients and glassmorphism
- Random space decorations and glow effects without purpose
- Excessive rounded cards
- Decorative elements without function
- Fake charts or misleading metrics
- Unnecessary animation
- Pre-styled charting libraries that impose visual personality (Recharts, Chart.js, Nivo, Plotly)

**Every design decision must have a reason.**

---

## 8. Design References

### Design intelligence
- https://github.com/pbakaus/impeccable
- https://github.com/Leonxlnx/taste-skill
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- https://github.com/anthropics/skills

### Product and visual references
- https://earth.google.com — information density, interaction precision
- https://science.nasa.gov/moon/exploration/ — scientific communication, visual authority
- https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/ — domain credibility
- https://linear.app — typography, hierarchy, restraint
- https://www.figma.com/community/file/1189160392434218031/10-free-space-background-pack — space visual language

**Do not copy these interfaces directly. Use them to understand design principles, interaction patterns and visual composition.**

---

## 9. Git Restrictions — Absolute

The human developer exclusively handles all Git operations through VS Code.

**NEVER:**
- Execute `git` commands of any kind
- Create commits
- Push or pull changes
- Switch or create branches
- Merge, rebase, or modify Git history
- Generate AI co-author metadata
- Create artificial contributors
- Automate GitHub activity

You may read and write approved project files. The human developer stages and commits all changes manually.

---

## 10. Working Methodology

1. **Read AGENT.md, P4_History.md, P4_ROADMAP.md** before beginning any work session.
2. **Inspect relevant existing implementation** before modifying anything.
3. **Identify the current milestone** from P4_ROADMAP.md.
4. **Confirm explicit human authorization** before beginning implementation.
5. **Implement only the current milestone scope.** Do not add unrequested features.
6. **Test before declaring complete.** Report actual results, not assumptions.
7. **Never automatically proceed to the next milestone.**
8. **Update P4_History.md and P4_ROADMAP.md** after each completed milestone.
9. **Never rewrite history** to make progress appear better than it was.
10. **Ask before making consequential architectural decisions.**

---

## 11. Communication Standards

Distinguish clearly between:
- **Verified facts** — confirmed by reading actual files or running actual commands
- **Existing implementation** — code that actually exists on disk
- **Proposed architecture** — not yet implemented
- **Assumptions** — stated explicitly as assumptions
- **Unresolved questions** — flagged for human or team input

Never claim implementation, testing, or verification that has not actually happened.
