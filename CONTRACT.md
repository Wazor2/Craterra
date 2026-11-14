# Data Contract — Lunar Landing Site Planner

All times are **UTC**. All angles are **degrees**. Azimuth is measured clockwise from north (`N = 0`, `E = 90`, `S = 180`, `W = 270`). File and folder names use lowercase site IDs with no spaces (e.g., `shackleton_rim`).

## Files

### `public/data/sites.json`
Array of:
```json
{
  "id": "shackleton_rim",
  "name": "Shackleton Crater Rim",
  "lat": -89.54,
  "lon": 129.78,
  "type": "south_pole",
  "source_url": "https://www.nasa.gov/...",
  "description": "..."
}
```
- `type`: `"apollo" | "south_pole" | "other"`

### `public/data/ephemeris/<site_id>.json`
Parallel arrays, one value per time step:
```json
{
  "site_id": "shackleton_rim",
  "start_utc": "2026-12-01T00:00:00Z",
  "step_minutes": 60,
  "sun_az": [ ... ],
  "sun_el": [ ... ],
  "earth_az": [ ... ],
  "earth_el": [ ... ]
}
```
- All four arrays must have identical length (`> 0`).
- `sun_az`, `earth_az` in `[0, 360]`; `sun_el`, `earth_el` in `[-90, 90]`.
- Values come from the smooth reference Moon ephemeris (no atmospheric refraction, disc center).

### `public/data/horizon/<site_id>.json`
Terrain horizon profile, 360 values, one per degree of azimuth (`0..359`):
```json
{
  "site_id": "shackleton_rim",
  "az_step_deg": 1,
  "elev_deg": [ ... 360 numbers ... ],
  "mast_height_m": 2.0,
  "dem_source": "LOLA ..."
}
```
- If missing (HTTP 404) or `dem_source` begins with `"none"`, the app falls back to a flat `0°` horizon and shows: `"No terrain data yet: flat horizon assumed"`.

### `public/data/summaries.json`
Deterministic summaries generated from computed numbers only:
```json
{
  "<site_id>": {
    "plain_text": "...",
    "expert_text": "..."
  }
}
```

## How to validate your JSON

Run the built-in validator:
```bash
npm run check-data
```
The script verifies required keys, matching `site_id`, valid UTC ISO timestamps, equal array lengths, `[0, 360]` azimuth bounds, `[-90, 90]` elevation bounds, and finite numeric values, exiting non-zero on any violation.
