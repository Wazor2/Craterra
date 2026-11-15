# 🌙 Cratera
 
### 🔦 Know your light before you land.
 
![NASA Space Apps Challenge 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-0B3D91?style=for-the-badge&logo=nasa&logoColor=white) ![Challenge](https://img.shields.io/badge/Challenge-Lunar%20Landing%20Site%20Navigator-F5B83D?style=for-the-badge) ![Status](https://img.shields.io/badge/Status-Hackathon%20Prototype-3FA7E0?style=for-the-badge)
 
Cratera is a web app that helps lunar mission planners, educators and the public compare landing sites and dates at the Moon's south pole. For any site and date, it shows where the **Sun** and **Earth** sit relative to the site's **real terrain horizon**, so you can quickly judge solar power and direct-to-Earth communication windows.
 
🛰️ Built for the **NASA Space Apps Challenge 2026**.
 
🎯 **Challenge / problem statement:** **Lunar Landing Site Navigator**
 
---
 
## 👥 Team
 
**Team name:** ERROR-404
 
| Name | GitHub |
|---|---|
| Om Manjule | [@Wazor2](https://github.com/Wazor2) |
| Manan Agrawal | [@MananAgrawal29](https://github.com/MananAgrawal29) |
| SachiSingh Bias | [@Sachi-16](https://github.com/Sachi-16) |
| Kalyani Bijwe | [@liyanshin](https://github.com/liyanshin) |
| Jaywardhan Sonwane | [@jaysonwanework-debug](https://github.com/jaysonwanework-debug) |
 
---
 
## 🌑 The problem
 
Many future lunar missions target the Moon's south pole because of its water ice. Planning there is hard:
 
- The Sun stays very close to the horizon (at the pole itself it never rises more than about 1.5° above it), so a single ridge or crater rim can block it completely.
- Earth also sits low in the sky or is hidden, which decides whether a lander can talk to Earth directly.
- A lunar day lasts about 29.5 Earth days, and a small change in site or date can change power and communication windows dramatically.
- Missions slip often, so planners must re-check alternative sites and dates quickly.
Quickmap, Moon Trek and JPL Horizons are powerful, but they are built for expert analysis and are slow for quick what-if comparisons.
 
## 🧭 What Cratera does
 
Cratera turns terrain and ephemeris data into clear, comparable visuals. Choose a site on the Moon globe, pick a date, and see:
 
- ☀️🌍 where the Sun and Earth are relative to the site's terrain horizon
- ⏳ how long until sunset and Earthset, and when each returns
- 📈 how sunlight and Earth visibility change across a lunar day
- ⚖️ how another site or date compares, side by side
## ✨ Features

 
- 🌐 Interactive Moon globe with clickable south pole sites
- ⛰️ Real, curvature-corrected terrain horizon (360 values) for all 6 sites
- 🧭 Local-north handling for the polar grid, with verification plots
- 📅 Date and time selection
- 🌅 Sky view: Sun and Earth against the terrain horizon
- ⏱️ Time until sunset and Earthset, and next sunrise and Earthrise
- 📊 Sunlit and Earth-visible timelines across a lunar day
- ⚖️ Side-by-side comparison of sites and dates
- 📱 Mobile-friendly layout
## ⚙️ How it works
 
```
 NASA LOLA south pole DEM              JPL Horizons
 (80 m, optional 40 m)                 (Sun and Earth az/el per site)
          |                                      |
          v                                      v
 Horizon profile per site              Sun/Earth time series
 (360 elevation values)                (azimuth + elevation, UTC)
          \                                      /
           v                                    v
              Visibility check in the browser
      "Is the body above the horizon at its azimuth?"
                          |
                          v
     Sky view, timelines, sunset/Earthset, comparison
```
 
Heavy calculations run **once, offline** and are saved as small static JSON files. The website only loads and draws them, so it is fast and needs **no backend and no API keys** at runtime.
 
## 🛰️ Data sources
 
| Data | Source | Used for |
|---|---|---|
| Lunar south pole elevation | NASA LRO **LOLA** south pole DEM from the Planetary Geodesy Data Archive ([PGDA product 90](https://pgda.gsfc.nasa.gov/products/90)): `LDEM_80S_80MPP_ADJ.TIF` (80 m/pixel, baseline) and `LDEM_80S_40MPP_ADJ.TIF` (40 m/pixel, upgrade) | Terrain horizon per site |
| Sun and Earth positions | NASA/JPL [Horizons](https://ssd.jpl.nasa.gov/horizons/) system | Azimuth and elevation over time |
| Candidate region names | NASA Artemis III candidate landing regions announcement | Site list |
| Reference views | [Quickmap](https://quickmap.lroc.asu.edu/) and [Moon Trek](https://trek.nasa.gov/moon/) | Visual comparison of terrain |
 
> Raw DEM files are large and are **not** stored in this repository.
 
## 📍 Sites in the app
 
Six south pole sites, all inside the LOLA 80-90°S coverage, each with a real terrain horizon (none use a flat placeholder).
 
| Site | ID | Lat / Lon | Elevation | Horizon range (min to max) | Terrain profile |
|---|---|---|---|---|---|
| Shackleton Crater Rim | `shackleton_rim` | -89.90°, 0.00° | +648 m | -3.0° to +22.3° | High crater rim with steep inward wall |
| Connecting Ridge | `connecting_ridge` | -89.44°, -137.31° | +1,957 m | -0.9° to +0.3° | Broad elevated ridge, nearly flat open horizon |
| Malapert Mountain | `malapert_mountain` | -85.99°, 2.93° | +5,128 m | -5.6° to +5.2° | Massive summit looking down on the terrain |
| Haworth Crater Rim | `haworth_rim` | -87.40°, -5.10° | -3,371 m | +2.9° to +10.9° | Enclosed terrain overlooking shadow traps |
| Nobile Crater Rim | `nobile_rim` | -85.24°, 35.80° | +6,562 m | -7.4° to +14.9° | High mountain shoulder near the VIPER target |
| de Gerlache Crater Rim | `de_gerlache_rim` | -88.48°, -88.35° | -1,217 m | +3.7° to +16.6° | Crater rim crest facing opposing rims |
 
**Conventions:** planetocentric latitude (negative = south), east-positive longitude, azimuth measured clockwise from north, all times in UTC.
 
 
Apollo and equatorial sites are not included because the terrain data covers only 80°S to 90°S.
 
## 🔬 Method in detail
 
### 1. Terrain horizon
For each site we trace rays along **all 360 compass azimuths** (1° steps) out to **60 km**. Terrain heights are sampled every **80 m** (or 40 m with the upgrade DEM) using bilinear interpolation (`scipy.ndimage.map_coordinates`). For each sample at ground distance `d` we compute the elevation angle:
 
```
drop  = R - sqrt(R^2 - d^2)            R = 1,737,400 m (Moon radius)
angle = atan2( z_sample - z_site - mast_height - drop , d )
```
 
The horizon for that azimuth is the **highest angle** along the ray. The curvature drop lowers terrain at the 60 km boundary by about 1,036 m. Observer (mast) height defaults to **0 m** and can be set with `--mast-height` (for example 2 m for a lander deck).
 
### 2. Local north
A polar stereographic grid does not line up with compass north. For each site we project a point 0.01° north of it (with `pyproj`) to get the true-north direction in the grid. East is a 90° clockwise rotation of north, so any compass azimuth converts to a grid ray direction.
 
### 3. Sun and Earth positions
Sun and Earth azimuth and elevation per site come from the **JPL Horizons** API and web form, saved as one ephemeris file per site at a fixed time step. Date range: **[DATE RANGE]**. Time step: **[STEP]**.
 
### 4. Visibility
A body at azimuth α (rounded to the nearest degree) is **visible** when its elevation is greater than `elev_deg[α]` for that site. The Sun is treated as a **point at its center**, so sunset is when its center drops below the terrain angle. The Sun's apparent size (about 0.26° semi-diameter) is not modeled. The Moon has essentially no atmosphere, so no refraction is applied.
 
### 5. Sunset, Earthset and rises
Events are found by scanning the ephemeris time series for changes between visible and hidden. Event times are accurate to the ephemeris time step **[CONFIRM: interpolated or not]**.
 
## ✅ Validation
 
What we actually checked:
 
- **Resolution cross-check:** for Shackleton Rim, the 80 m and 40 m horizon profiles differ by only **0.18° on average**, and the highest horizon point is at the same azimuth (**138°**).
- **Mast height:** raising the observer from 0 m to 2 m lowers nearby horizon angles by about **0.11° on average** (up to 0.88°).
- **Terrain sanity checks:** crater rims such as Shackleton show a high inward wall (+22.3°), while summits such as Malapert and Nobile show negative horizon dips (down to -5.6° and -7.4°). We also made linear plots, polar plots and hillshade maps with a north arrow for every site.
- **Sun and Earth positions:** [ADD results of the comparison against the Horizons web form: site, date, difference]. Delete this line if not done.
## ⚠️ Limitations
 
- Rays stop at 60 km, so more distant terrain is not included (much of it is hidden by the Moon's curvature anyway).
- The Sun is a point, and the Moon's libration and the solar limb are not modeled in the point comparison.
- Terrain resolution is 80 m for the baseline, with 40 m available as an upgrade.
- Site coordinates are approximate.
- Sun and Earth data covers **[DATE RANGE]** only.
- Not an official NASA tool, and not a replacement for full mission analysis.
## 🗺️ Roadmap
 
- Custom coordinate input
- 3D terrain view with a moving Sun
- Apollo and other equatorial or mid-latitude sites (needs more terrain coverage)
- A more detailed power model
- Shareable comparison links
## 🧰 Tech stack
 
> ✏️ Edit to match what is used.
 
- **App:** Next.js, TypeScript, Tailwind CSS, static export
- **Visualization:** [Plotly / D3 / Three.js]
- **Data pipeline:** Python (NumPy, SciPy, rasterio, pyproj, Matplotlib)
- **Hosting:** [Vercel]
## 🚀 Getting started
 
**Run the app** (needs Node.js and Git):
 
```bash
git clone https://github.com/[ORG-OR-USER]/[REPO].git
cd [REPO]
npm install
npm run dev
```
 
Open http://localhost:3000.
 
**Regenerate the terrain horizons** (optional): download the LOLA DEM(s) into a `raw/` folder outside version control, install `numpy scipy rasterio pyproj matplotlib`, then run:
 
```bash
python inspect_and_locate.py
python compute_horizon.py --mast-height 0
```
 
> ✏️ Adjust the commands to match your final script options.
 
## 🤖 AI usage disclosure
 
AI tools helped with coding and writing. AI agents wrote the first versions of the terrain scripts, and the team chose the parameters and sites, reviewed and tested the output, and integrated it. All commits were authored and pushed by registered human team members from their own accounts. Full details: [AI_USAGE.md](./AI_USAGE.md).
 
## 🙏 Credits
 
- **NASA LRO / LOLA** team and the **Planetary Geodesy Data Archive (PGDA)**
- **NASA JPL Horizons** system
- **LROC / Arizona State University** (Quickmap) and **NASA Moon Trek**
- The **NASA Space Apps Challenge 2026** organizers, navigators and mentors
---
 
*🌙 Built for the NASA Space Apps Challenge 2026 by Team ERROR-404.*
