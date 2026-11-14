#🌙 Cratera
 
### 🔦 Know your light before you land.
 
 
![NASA Space Apps Challenge 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-0B3D91?style=for-the-badge&logo=nasa&logoColor=white) ![Challenge](https://img.shields.io/badge/Challenge-Lunar%20Landing%20Site%20Navigator-F5B83D?style=for-the-badge) ![Status](https://img.shields.io/badge/Status-Hackathon%20Prototype-3FA7E0?style=for-the-badge)
 
Cratera is a web app that helps lunar mission planners, educators and the public compare landing sites and dates at the Moon's south pole. For any site and date, it shows where the **Sun** and **Earth** sit relative to the site's **real terrain horizon**, so you can quickly judge solar power and direct-to-Earth communication windows.
 
🛰️ Built for the **NASA Space Apps Challenge 2026**.
 
🎯 **Challenge / problem statement:** **Lunar Landing Site Navigator**
 
---
 
## 👥 Team
 
**Team name:** [TEAM NAME]
 
| Name | Role | GitHub |
|---|---|---|
| [Om Manjule] | [@Wazor2](https://github.com/username) |
| [Manan Agrawal] | [@username](https://github.com/username) |
| [SachiSingh Bais] | [@username](https://github.com/username) |
| [Kalyani Bijwe] | [@liyanshin](https://github.com/username) |
| [Jaywardhan Sonwane] | [@username](https://github.com/username) |
 
---
 
## 📚 Table of contents
 
1. [🌑 The problem](#-the-problem)
2. [🧭 What Cratera does](#-what-cratera-does)
3. [✨ Features](#-features)
4. [⚙️ How it works](#-how-it-works)
5. [🛰️ Data sources](#-data-sources)
6. [📍 Sites in the app](#-sites-in-the-app)
7. [🔬 Method in detail](#-method-in-detail)
8. [🗂️ Data file formats](#-data-file-formats)
9. [📁 Project structure](#-project-structure)
10. [🧰 Tech stack](#-tech-stack)
11. [🚀 Getting started](#-getting-started)
12. [🔁 Reproducing the data](#-reproducing-the-data)
13. [✅ Validation](#-validation)
14. [⚠️ Limitations](#-limitations)
15. [🗺️ Roadmap](#-roadmap)
16. [🤖 AI usage disclosure](#-ai-usage-disclosure)
17. [🙏 Credits and acknowledgments](#-credits-and-acknowledgments)
18. [📄 License](#-license)
---
 
## 🌑 The problem
 
Many future lunar missions target the Moon's south pole because of its water ice and other valuable resources. Planning there is hard:
 
- The Sun stays very close to the horizon (at the pole itself it never rises more than about 1.5° above it). A single ridge or crater rim can block it completely.
- Earth also sits low in the sky or is hidden, which decides whether a lander can talk to Earth directly or needs a relay.
- A lunar day lasts about 29.5 Earth days, and a small change in landing site or date can change power and communication windows dramatically.
- Missions often slip. Planners then need to re-check alternative sites and dates quickly.
Existing tools such as NASA's Quickmap, Moon Trek and the JPL Horizons system are powerful but built for detailed expert analysis, and are slow for rapid what-if comparisons by non-specialists.
 
## 🧭 What Cratera does
 
Cratera turns complex ephemeris and terrain data into clear, comparable visuals. Choose a site on the Moon globe, pick a date, and see:
 
- ☀️🌍 where the Sun and Earth are relative to the site's terrain horizon
- ⏳ how long until sunset and Earthset, and when each returns
- 📈 how sunlight and Earth visibility change across a lunar day
- ⚖️ how another site or another date compares, side by side
> ✏️ Edit the checklist below so it matches exactly what is built in the final submission.
 
## ✨ Features
 
- [x] 🌐 Interactive Moon globe with clickable landing sites
- [x] Site info panel (type, coordinates, description)
- [ ] 📅 Date and time selection
- [ ] 🌅 Sky view: Sun and Earth positions against the real terrain horizon
- [ ] Time until sunset and Earthset, and next sunrise and Earthrise
- [ ] 📊 Sunlit and Earth-visible timelines across a lunar day
- [ ] ⚖️ Side-by-side comparison of sites and of dates
- [ ] Plain-language explanations for non-specialists
- [ ] 📱 Mobile-friendly layout
## ⚙️ How it works
 
```
 NASA LOLA elevation model            JPL Horizons
 (south pole DEM, PGDA)               (Sun and Earth az/el for each site)
          |                                      |
          v                                      v
 Horizon profile per site              Sun/Earth position time series
 (360 elevation values)                (azimuth + elevation vs time, UTC)
          \                                      /
           \                                    /
            v                                  v
                 Visibility engine (in the browser)
        "Is the Sun / Earth above the local horizon
              at its azimuth, at this moment?"
                           |
                           v
        Sky view, timelines, sunset/Earthset times, comparison
```
 
Heavy calculations run **once, offline**, and are saved as small JSON files. The website only loads those files and draws the results, so it is fast, cheap to host and works on any device without a server.
 
## 🛰️ Data sources
 
| Data | Source | Used for |
|---|---|---|
| Lunar south pole elevation | NASA LRO **LOLA** gridded DEMs, hosted by the Planetary Geodesy Data Archive (PGDA): `LDEM_80S_80MPP_ADJ.TIF` (80 m/pixel) and `LDEM_80S_40MPP_ADJ.TIF` (40 m/pixel) | Terrain horizon at each site |
| Sun and Earth positions | NASA/JPL **Horizons** system | Azimuth and elevation of the Sun and Earth over time |
| Feature names and coordinates | USGS Gazetteer of Planetary Nomenclature, PGDA site files, LROC / Quickmap, NASA mission pages | Site list |
| Artemis candidate region names | NASA Artemis III candidate regions announcement | Site list |
 
Links:
 
- LOLA products (PGDA): https://pgda.gsfc.nasa.gov/
- JPL Horizons: https://ssd.jpl.nasa.gov/horizons/
- Horizons API docs: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- Quickmap: https://quickmap.lroc.asu.edu/
- Moon Trek: https://trek.nasa.gov/moon/
- USGS Gazetteer: https://planetarynames.wr.usgs.gov/
> Raw terrain files are large and are **not** stored in this repository. Only small processed JSON files are committed.
 
## 📍 Sites in the app
 
> Edit this table to match `sites.json`. Mark coordinates as verified only after checking them against the sources above.
 
| ID | Name | Type | Latitude | Longitude | Terrain horizon | Coordinates verified |
|---|---|---|---|---|---|---|
| `apollo11` | Apollo 11 (Tranquility Base) | Apollo | [lat] | [lon] | Flat (outside terrain coverage) | [yes/no] |
| `apollo17` | Apollo 17 (Taurus-Littrow) | Apollo | [lat] | [lon] | Flat (outside terrain coverage) | [yes/no] |
| `shackleton` | Shackleton crater rim | South pole | [lat] | [lon] | LOLA-derived | [yes/no] |
| `connecting_ridge` | Connecting Ridge | South pole (Artemis candidate) | [lat] | [lon] | LOLA-derived | [yes/no] |
| `malapert` | Malapert Massif | South pole (Artemis candidate) | [lat] | [lon] | LOLA-derived | [yes/no] |
| `im1_malapert_a` | IM-1 Odysseus (Malapert A) | Commercial (CLPS) | [lat] | [lon] | LOLA-derived | [yes/no] |
| `chandrayaan3` | Chandrayaan-3 (Shiv Shakti) | Other agency | [lat] | [lon] | Flat (outside terrain coverage) | [yes/no] |
 
**Coordinate convention:** planetocentric latitude (negative = south), east-positive longitude, degrees, Moon mean-Earth / polar-axis frame.
 
## 🔬 Method in detail
 
### 1. Terrain horizon
For each site, we read the LOLA elevation model and, for each compass azimuth (every 1° from 0 to 359, measured clockwise from north), trace a ray outward to a maximum distance of **[MAX DISTANCE, e.g. 60 km]**. For every sample point along the ray we compute the angle above the site's local horizontal:
 
```
angle = atan2( terrain_height - site_height - mast_height - curvature_drop , distance )
curvature_drop = R - sqrt(R^2 - distance^2)      (R = 1,737,400 m, Moon radius)
```
 
The horizon elevation for that azimuth is the **maximum** angle along the ray. Because the polar stereographic grid does not line up with compass north, we compute **local north** for each site and rotate azimuths accordingly.
 
Observer (mast) height used: **[0 m / 2 m]**.
 
### 2. Sun and Earth positions
Sun and Earth azimuth and elevation, as seen from each site on the Moon's surface, come from JPL Horizons at a fixed time step (**[STEP, e.g. 60 min]**) over **[DATE RANGE]**. All times are **UTC**.
 
### 3. Visibility
A body is considered **visible** when its elevation is above the site's horizon elevation at the body's azimuth. The Sun is treated as **[a point at its center / a disc with its upper edge]**. The Moon has essentially no atmosphere, so no atmospheric refraction is applied.
 
### 4. Events and times
Sunset, sunrise, Earthset and Earthrise are found by scanning forward through the time series for changes between visible and hidden. Times are **[interpolated between steps / accurate to the time step]**.
 
### 5. Comparison
Comparison views run the same visibility logic for multiple sites or dates on a shared time axis.
 
## 🗂️ Data file formats
 
All files use UTC times, degrees for angles, and azimuth measured clockwise from north.
 
**`sites.json`**
```json
[{ "id": "shackleton", "name": "...", "type": "south_pole", "lat": 0.0, "lon": 0.0,
   "coords_verified": false, "desc": "...", "source_url": "..." }]
```
 
**`ephemeris/<site_id>.json`**
```json
{ "site_id": "...", "start_utc": "YYYY-MM-DDTHH:MM:SSZ", "step_minutes": 60,
  "sun_az": [], "sun_el": [], "earth_az": [], "earth_el": [] }
```
 
**`horizon/<site_id>.json`**
```json
{ "site_id": "...", "az_step_deg": 1, "elev_deg": [ /* 360 values */ ],
  "mast_height_m": 0, "dem_source": "LOLA LDEM_80S_80MPP_ADJ (PGDA)" }
```
 
## 📁 Project structure
 
> Edit to match the real folders.
 
```
cratera/
├── public/
│   └── data/              # processed JSON used by the app
│       ├── sites.json
│       ├── ephemeris/
│       └── horizon/
├── src/
│   ├── app/               # pages (globe, planner, compare, about)
│   ├── components/        # globe, sky view, timelines, cards
│   └── lib/               # visibility logic, event finding, data loading
├── scripts/               # data pipeline (horizon + ephemeris)
├── CONTRACT.md            # agreed data formats
├── AI_USAGE.md            # AI usage disclosure
└── README.md
```
 
## 🧰 Tech stack
 
> Edit to match what is actually used.
 
- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Visualization:** [Plotly / D3 / Three.js, as used]
- **Data pipeline:** Python (NumPy, SciPy, rasterio, pyproj, Matplotlib)
- **Data services:** JPL Horizons API
- **Hosting:** [Vercel / GitHub Pages / other]
## 🚀 Getting started
 
**Requirements:** Node.js (LTS) and Git.
 
```bash
git clone https://github.com/[ORG-OR-USER]/[REPO].git
cd [REPO]
npm install
npm run dev
```
 
Open http://localhost:3000.
 
Production build:
 
```bash
npm run build
```
 
## 🔁 Reproducing the data
 
You only need this if you want to regenerate the processed files in `public/data/`.
 
1. Download the LOLA DEM(s) from PGDA into a folder **outside the repo** (for example `raw/`). These files are large and must not be committed.
2. Install Python 3.10+ and the packages: `numpy scipy rasterio pyproj matplotlib requests pandas`.
3. Run the horizon script: `[COMMAND, e.g. python scripts/make_horizons.py]`
4. Run the ephemeris script: `[COMMAND, e.g. python scripts/fetch_ephemeris.py]`
5. Copy the outputs into `public/data/`.
## ✅ Validation
 
> Fill this in honestly with the checks you actually ran. Remove rows you did not do.
 
| Site | Date (UTC) | Quantity | Cratera | JPL Horizons | Difference |
|---|---|---|---|---|---|
| [site] | [date] | Sun elevation | [value] | [value] | [diff] |
| [site] | [date] | Earth azimuth | [value] | [value] | [diff] |
 
Terrain horizons were also compared visually against Quickmap / Moon Trek for [sites].
 
## ⚠️ Limitations
 
- Terrain resolution is **[80 m / 40 m]**; very fine terrain features are not captured.
- Horizons are computed out to **[distance]** and for a mast height of **[value]**.
- Sites outside the LOLA south pole coverage (80-90°S) use a flat horizon.
- Some site coordinates are approximate (see the sites table).
- Sun and Earth data covers **[date range]** only.
- The simple power and communication indicators are not a substitute for real mission analysis.
- Cratera is a prototype built during a hackathon and is not an official NASA tool.
## 🗺️ Roadmap
 
- Custom coordinate input
- 3D terrain view with a moving Sun
- More sites, including additional CLPS and international missions
- A more detailed power model (solar angle, partial shadowing)
- Shareable links for comparisons
## 🤖 AI usage disclosure
 
AI tools were used to assist with coding, data processing and writing during this hackathon. The team reviewed, tested and integrated the output, and all commits were authored and pushed by registered human team members from their own accounts. Full details are in [AI_USAGE.md](./AI_USAGE.md).
 
## 🙏 Credits and acknowledgments
 
- **NASA LRO / LOLA** team and the **Planetary Geodesy Data Archive (PGDA)** for lunar elevation data
- **NASA JPL Horizons** system for ephemeris data
- **USGS Astrogeology** for planetary nomenclature
- **LROC / Arizona State University** (Quickmap) and **NASA Moon Trek**
- The **NASA Space Apps Challenge 2026** organizers, navigators and mentors

 
---
 
*🌙 Built for the NASA Space Apps Challenge 2026 by [ERROR-404].*
 
