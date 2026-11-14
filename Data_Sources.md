# Data Sources & Provenance
### NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator

---

## 1. NAIF SPICE Kernel Manifest

The global celestial calculations conform to the matched DE440 lunar and planetary SPICE kernel suite distributed by NASA's Navigation and Ancillary Information Facility (NAIF):

| Kernel Filename | Type | Role | Source URL | SHA256 Checksum |
| :--- | :--- | :--- | :--- | :--- |
| `de440.bsp` | SPK | Planetary & Lunar Ephemeris | [NAIF Planetary SPK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440.bsp) | `4d15655a90ad24e23cfb8b9d3b379301e858db1d5964861be5d7fa85b88dbb63` |
| `moon_pa_de440_200625.bpc` | PCK | Binary Lunar Orientation (PA) | [NAIF Lunar PCK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc) | `a7b233a5cf9571faeb6cfb1fa67ee595b1dc07788a101b0460d3d4b68bb2e805` |
| `moon_de440_250416.tf` | FK | Lunar Reference Frame Definition | [NAIF Satellite FK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf) | `8c92a953e5e4fcb4d216954fb3dfa83279bbec9044d4734898144da58a0ca97e` |
| `pck00011.tpc` | PCK | Planetary Constants Kernel | [NAIF Generic PCK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc) | `bb6a6111fcbbd8a876798e1f0e4701235ee20f01a3575c0ee8bbf4004944d6da` |
| `naif0012.tls` | LSK | Leapseconds Kernel | [NAIF LSK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls) | `25a704849e8dd88846115668a04f6899a99b4455cb20b6879ab75765494c6df3` |

---

## 2. Lunar Terrain Datasets (LOLA)

Digital elevation models utilized for ray-casting terrain horizon profiles originate from the Lunar Orbiter Laser Altimeter (LOLA) aboard NASA's Lunar Reconnaissance Orbiter (LRO):

1. **NASA GSFC Planetary Geodynamics Laboratory (PGDA):**
   - **Product Collection:** High-Resolution South Pole LOLA Polar Stereographic DEMs.
   - **Resolution:** 5 metres per pixel.
   - **Coverage:** $87.5^\circ\text{S}$ to $90.0^\circ\text{S}$.
   - **URL:** [https://pgda.gsfc.nasa.gov/products/78](https://pgda.gsfc.nasa.gov/products/78)
   - **Candidate Region Models:**
     - Site 01: Connecting Ridge between Shackleton and de Gerlache.
     - Site 04: Shackleton Crater Rim crest.
     - Site 07: Peak near Shackleton.
     - Site 23: Malapert Massif.

2. **NASA PDS Geosciences Node:**
   - **Product Collection:** LRO LOLA Gridded Data Records (GDR).
   - **Equirectangular Resolutions:** 64, 128, 256, 512 pixels/degree.
   - **Vertical Datum:** Radial height above NAIF `BODY301_RADII` mean sphere ($1,737.4\text{ km}$).
   - **URL:** [https://pds-geosciences.wustl.edu/missions/lro/lola.htm](https://pds-geosciences.wustl.edu/missions/lro/lola.htm)

---

## 3. Curated Landing Site Provenance

| Site ID | Name | Category | Latitude | Longitude (East) | Elevation | Coordinate Source |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `shackleton-rim` | Shackleton Crater Rim (Site 04) | South Pole Candidate | $-89.9000^\circ$ | $0.0000^\circ$ | $+1,900\text{ m}$ | NASA GSFC PGDA Site 04 |
| `connecting-ridge` | Connecting Ridge (Site 01) | South Pole Candidate | $-89.4400^\circ$ | $-137.4000^\circ$ ($222.6^\circ$) | $+1,850\text{ m}$ | NASA GSFC PGDA Site 01 |
| `malapert-massif` | Malapert Massif (Site 23) | South Pole Candidate | $-85.9000^\circ$ | $+2.9000^\circ$ | $+5,000\text{ m}$ | NASA GSFC PGDA Site 23 |
| `peak-near-shackleton` | Peak near Shackleton (Site 07) | South Pole Candidate | $-89.7000^\circ$ | $+126.0000^\circ$ | $+1,720\text{ m}$ | NASA GSFC PGDA Site 07 |
| `amundsen-ritchie` | Amundsen–Ritchie Rim | South Pole Candidate | $-84.6000^\circ$ | $+120.5000^\circ$ | $+1,400\text{ m}$ | NASA PDS LOLA Polar GDR |
| `apollo-11` | Apollo 11 Tranquility Base | Apollo Landing Location | $+0.67408^\circ$ | $+23.47297^\circ$ | $0\text{ m}$ | NASA NSSDCA Apollo Catalogue |
| `apollo-17` | Apollo 17 Taurus-Littrow | Apollo Landing Location | $+20.19080^\circ$ | $+30.77168^\circ$ | $0\text{ m}$ | NASA NSSDCA Apollo Catalogue |
| `equatorial-reference` | Sinus Medii | Equatorial Reference | $0.0000^\circ$ | $0.0000^\circ$ | $0\text{ m}$ | NASA NSSDCA Zero Reference |
