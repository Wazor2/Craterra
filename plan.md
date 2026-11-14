# Lunar Landing Site Navigator — Implementation Plan

## Project boundary and current state

This is a new, independent Manus-managed website in `C:\Users\omman\OneDrive\Desktop\lunar landing`. The user-provided GitHub project, [Wazor2/NASA-s-SPACE-APP-HACKATHON](https://github.com/Wazor2/NASA-s-SPACE-APP-HACKATHON), is read-only reference material. Do not clone it into this project, edit its files, alter its branches/history, or push to it. Do not connect this new app to that repository. The current project directory contains only its Manus website identity file; no app source, package manifest, tests, or dependency lockfile exist yet.

The new project is initialized with the flexible Web template. Its managed server capability is enabled for server-side AI explanations; the managed database is off because the product can use versioned, precomputed scientific JSON. Preview port 3000 is applied for this session. Auto-publish is off. Initialization and the user's managed-development choice do not authorize public deployment.

## Repository reconnaissance findings

The reference repository's README reports Next.js 16.4.6, React 19.3.0, TypeScript, Tailwind CSS 4, custom SVG visualizations, Python preprocessing, and static GitHub Pages deployment. It already sketches a planner, comparison, methodology page, timeline, and event utilities. Its small event utility tests basic visibility and windows but counts sample intervals and detects transitions at samples rather than interpolating event times.

Its `CONTRACT.md` stores per-site arrays of Sun/Earth azimuth and elevation, and its JSON sample contains no global Moon-centered vectors, distances, body-fixed frame, kernel list, or astrometric provenance. Its README and `public/data/sites.json` explicitly label the current ephemeris and all three listed site records as mock; the south-pole coordinate sources are `TODO`. These values cannot be represented as scientific observations or reused as verified site data. The new data contract will preserve the useful 360-point horizon idea while replacing per-site mock celestial arrays with a shared, provenance-rich global ephemeris. The existing repository's project instructions are not instructions for this new codebase.

The official challenge describes rapid comparison of landing sites and dates, visualizing Sun and Earth relative to the horizon, and assessing power-generation potential and direct-to-Earth communication windows. The official NASA challenge page also emphasizes time/date changes, temporal dynamics, terrain, and accessibility to expert and public users.

## Implementation approach

Use a Next.js App Router + React + TypeScript frontend with Tailwind and hand-authored SVG for the central sky plot and time strips. This matches the reference's compatible stack and avoids a heavy chart dependency for the MVP. Keep the deterministic scientific engine outside React components. Python 3.12+ scripts own data acquisition, SPICE ephemeris generation, LOLA DEM preparation, horizon generation, and offline validation. The browser consumes small, versioned JSON products and computes site-specific topocentric angles and visibility deterministically from the common ephemeris plus the selected site's coordinates and horizon profile. Do not load raw DEMs in the browser.

The managed server is reserved for a later, optional explanation endpoint. It may send already-calculated metrics to the built-in LLM and return a short grounded explanation. It must not compute or invent numeric results. No API key is placed in browser code. There is no application database in the MVP. The site can be a static-data frontend with a narrow server route for AI explanations; deployment details are a later, separately authorized phase.

### Scientific conventions and shared data contract

Use UTC ISO-8601 timestamps ending in `Z`; angles in degrees; distances in kilometres; DEM heights in metres. Use east-positive longitude normalized to `[-180, 180)`, planetocentric latitude, and the lunar Mean Earth/Polar Axis frame alias `MOON_ME`. Define azimuth as clockwise from north: north 0°, east 90°, south 180°, west 270°. Define elevation relative to the local mathematical horizontal, before any terrain obstruction. Do not use terrestrial atmospheric refraction on the Moon. `MOON_ME` is defined by the chosen DE440 frame kernel and is closely aligned with the DE421 ME realization used by NASA Apollo coordinates and the cited polar LOLA GeoTIFFs; preserve that frame provenance and do not silently relabel data.

Proposed `data/processed/ephemeris.json`:

```json
{
  "schema_version": 1,
  "metadata": {
    "origin": "MOON",
    "frame": "MOON_ME",
    "time_standard": "UTC",
    "distance_unit": "km",
    "angle_unit": "deg",
    "sample_interval_seconds": 1800,
    "aberration_correction": "LT+S",
    "coverage_start_utc": "...Z",
    "coverage_end_utc": "...Z",
    "generated_utc": "...Z",
    "kernels": [{"filename": "...", "sha256": "...", "source_url": "..."}]
  },
  "records": [
    {
      "utc": "...Z",
      "et_tdb_seconds": 0,
      "sun_from_moon_km": [0, 0, 0],
      "earth_from_moon_km": [0, 0, 0],
      "sun_distance_km": 0,
      "earth_distance_km": 0
    }
  ]
}
```

The zeros above are schema illustrations, not application data. The actual file is generated only by SPICE. Keep the Earth vector unnormalized so each site can subtract its Moon-centred position and preserve topocentric parallax. The interval and coverage are explicit; clients must not extrapolate outside them.

Proposed `data/sites/sites.json` records include `schema_version`, stable lowercase `id`, display name, category (`apollo`, `south_pole_candidate_region`, or `equatorial_reference`), latitude/longitude/latitude type, elevation and explicit vertical datum, description, source URLs, coordinate provenance/status, and relevant DEM identifier. An Artemis candidate **region** is not a specific NASA-selected landing point: NASA describes 13 regions about 15 by 15 km and individual landing sites within them. Where a representative point is derived from an official DEM/ROI, label it as a project-selected representative point and cite the derivation, not as an agency-approved site.

Proposed `data/terrain/terrain_profiles.json` records include site ID, 360 horizon elevations at integer azimuths 0–359°, azimuth convention, observer mast height, DEM product and source URL, map projection/reference frame, pixel resolution, processing footprint/range, vertical datum, interpolation/quality metadata, and generated timestamp. Missing or non-finite samples are errors, not zero-degree horizons. Store raw DEMs outside version control; commit only appropriately cropped/derived profiles and small visual assets.

Derived site/time output should remain reproducible from these inputs. If persisted, each derived metric/event record must include the analysed coverage, sample interval, interpolation/refinement method and assumptions. Runtime validators must reject incompatible schema versions, frame or unit mismatch, mismatched time grids, non-finite coordinates/vectors, malformed 360-element horizons, and timestamps outside coverage.

### SPICE kernels and ephemeris

The official NAIF generic-kernel listings and headers were checked for this project. Use a matched DE440 set for the first generator rather than mixing a newer planetary solution with a DE440-only lunar orientation model:

- Planetary/lunar SPK: `de440.bsp` (NAIF lists coverage 1549-12-31 through 2650-01-25 and includes Sun 10, Moon 301, Earth 399).
- Lunar binary orientation PCK: `moon_pa_de440_200625.bpc`.
- Matching lunar frame kernel: `moon_de440_250416.tf`; its header explicitly says it is compatible with the binary PCK above and defines `MOON_PA` and `MOON_ME` aliases.
- Text planetary constants kernel: `pck00011.tpc`.
- Leap-seconds kernel: `naif0012.tls` (the NAIF directory also exposes `latest_leapseconds.tls`; record the actual downloaded file and checksum).

The selected full SPK is larger than a small frontend asset; keep it in ignored/raw data storage and record URL, checksum, release information, and the exact kernel manifest. Load and test kernels in the Python preprocessing environment. Compute Moon-centred Sun and Earth vectors once per timestamp, initially every 30 minutes, in the documented fixed `MOON_ME` frame. Record distances. Select and document the aberration correction, then use an equivalent observer/time/frame convention for Horizons comparison. Refine transition times locally rather than treating a 30-minute endpoint as an exact event.

### LOLA terrain and site database

Use the NASA PDS Geosciences Node LOLA LRO GDR archive and its catalog as the authoritative global/topographic source. The catalog describes gridded DEMs in equirectangular resolutions of 4, 16, 64, 128, 256 and 512 pixels/degree, a preliminary sparse 1024-pixel/degree product, plus polar stereographic products spanning 5–240 m/pixel. Do not assume these resolutions have equal effective accuracy or coverage.

For southern-polar candidates, evaluate the NASA GSFC PGDA high-resolution LOLA polar products. The source lists Site01 as Connecting Ridge, Site04 as Shackleton rim, Site07 as Peak near Shackleton, Site23 as Malapert Massif, and additional regions. Its products are 5 m/pixel GeoTIFFs in south-polar stereographic coordinates in the DE421 `MOON_ME` reference, but the source warns that about 90% of the 5 m cells are interpolated and reports region-dependent height/slope uncertainty. Extract coordinates/coverage from actual GeoTIFF georeferencing and the supplied ROI shapes; do not infer a point from the product name. For Apollo 11 and 12 use NASA NSSDCA's published Lunar Module positions, whose page explicitly states planetocentric ME/Polar Axis coordinates based on DE421. A prime-meridian/equator origin may serve as a clearly labelled mathematical reference, not an unsourced landing location.

Generate horizon angles along 360 local compass bearings from the observer to terrain samples. Account for Moon curvature using the lunar reference shape and the sample's central angle/distance; a flat horizon is not terrain data. The finite ray range must be limited by real DEM coverage and recorded in metadata. Test optional observer mast heights of 0 m and 2 m. Interpolate azimuth circularly across 359°/0° when applying horizons.

### Visibility, events and metrics

Transform the global vectors into each site's local ENU frame using the selected lunar shape and topocentric observer position. For Earth specifically, subtract the site position vector from the Moon-centred Earth vector before converting to ENU. Compute azimuth with `atan2(East, North)` and normalize to `[0, 360)`; compute elevation from Up versus horizontal range. Document the behavior at the exact poles, where longitude selects the local tangent orientation.

Compare object elevation to the circularly interpolated terrain horizon at its azimuth. Keep distinct booleans/statuses for geometric elevation above horizontal, terrain visible, entire Sun disk visible, and partial Sun disk visible. Use approximately 0.5° solar diameter (about 0.25° angular radius). Do not apply atmospheric refraction. Earth visibility is geometric only; it is not an operational link budget and does not guarantee a working communication link.

Detect sunrise, sunset, Earthrise, and Earthset from terrain-visible transitions and locally refine/interpolate the crossing. Calculate time visible, time obstructed, visibility percentage, visible windows, longest continuous darkness, and longest Earth obstruction. Label the relative solar availability number as a simplified index. Do not claim electrical power without array orientation, panel efficiency, incidence, temperature, degradation and other engineering assumptions.

### Frontend structure and interaction

Provide Planner, Compare, and About/Methodology routes. The main planner uses a compact site/search and UTC-control rail beside a large sky/horizon SVG; an at-a-glance metric band sits above the sky view, with separate synchronized Sun and Earth timelines below. Keep direct manipulation and evidence visible: select site/date/time, scrub or play through time, inspect UTC, jump to next Sun rise/set, and switch Simple/Expert explanations. Object markers always derive from the selected ephemeris record and site transform. Expert mode shows frame, kernel, DEM resolution/quality, sample interval and assumptions.

The comparison page supports two or three sites at a shared date/time and timeline range. The What Changed comparison uses one site and two dates. Show sunlight percentage, longest dark period, Earth-visible percentage, longest Earth-obstructed period, and current Sun/Earth angles. On narrow screens use a stacked sequence without hiding selected scenario/date context. Later, after MVP data are validated, add a south-pole map, date/time illumination heatmap, optional grounded text explanations, transparent objective-weighted recommendation (not a landing safety rating), and 3D terrain.

### Proposed project structure

```text
app/                         Planner, Compare, About routes; AI route only if enabled
components/planner/          Site and UTC controls, shared mission state
components/sky-view/         Horizon and celestial markers in SVG
components/timeline/         Sun/Earth visibility strips and UTC scrubber
components/dashboard/        Metrics and validity/provenance states
components/comparison/       Site and date comparison panels
components/maps/             Later south-pole map / heatmap
components/ai-explanation/   Later explanation UI, numeric facts kept visible
lib/contracts/               JSON schema and TypeScript runtime validators
lib/science/                 ENU, azimuth wrap, parallax, visibility, events, metrics
lib/data/                    Static JSON fetchers and coverage/status handling
science/                     Independent Python 3.12 preprocessing package/scripts
  download_terrain.py        obtain/crop PDS/PGDA data, store raw data outside Git
  load_kernels.py            controlled SPICE kernel manifest/loading
  calculate_ephemeris.py     global 30-minute vector series
  generate_horizon.py        DEM ray sampling and curvature
  calculate_visibility.py    deterministic site/time derivations
  calculate_events.py        event crossing refinement
  generate_metrics.py        duration/windows/indices
  validate_horizons.py       physical and reference checks
  validate_horizons_against_horizons.py  optional clearer validation name
  schemas/                   shared data JSON schemas
  tests/                     deterministic unit/fixture tests
public/data/                 small processed, provenance-labelled data only
 data/raw/                   .gitignored source kernels/DEMs
 data/processed/             reproducible JSON products
 data/validation/            comparison outputs and validation report
```

The Python engine must remain importable and testable independently from the frontend. Keep downloaded kernels and raw rasters out of the client bundle and Git.

## Design direction

Reuse the user's professional, dark lunar mission-planning direction and the compatible design intentions in the read-only reference repository; do not copy its layout literally. **Design movement:** scientific cartography translated into a restrained mission-operations console. **Core principles:** evidence before decoration; separate observation, calculation, and simplification; prioritize scenario context and actionable time; accessible contrast and consistent units. **Color philosophy:** graphite/navy grounds the interface; warm amber marks the Sun; cool cyan marks Earth; a quiet neutral terrain line remains legible without neon glow. **Layout paradigm:** a narrow operations rail and wide instrument field, with a top metric strip and stacked temporal tracks rather than a generic equal-card dashboard. **Signature elements:** a circular azimuth horizon plot, a fixed UTC playhead, and compact provenance chips adjacent to derived values. **Interaction:** changing one scenario immediately updates all plots and metrics; expert details are expandable, not buried. **Animation:** playback is restrained and time-driven; reduced-motion disables decorative transitions; no random starfields or unmotivated motion. **Typography:** Inter or a similar neutral sans for labels and explanation text, paired with a monospaced face for UTC, degrees, vector/frame metadata, and measurements. **Brand essence:** a precise, accessible planning instrument that explains how site and date alter lunar lighting and Earth line-of-sight; personality: measured, clear, exploratory. **Voice:** concise and evidence-led. Example lines: “Sun above terrain; partial disk.” “Earth is geometrically visible at this time—not a link guarantee.” **Wordmark:** a custom horizon arc with a rising solar point and a short lunar limb mark, never a stock default-font logo. **Signature brand color:** warm lunar amber used only for the Sun and key illumination emphasis.

## Verification and acceptance approach

All outputs distinguish verified inputs, calculated geometry, simplified indices, and AI-written explanation. Use independent scientific checks, not a visual demo as evidence. Validate source coordinates/projections and kernel checksums; test transforms with known cardinal directions, poles and longitude wrap; ensure non-NaN output; ensure terrain affects visibility independently from sign of elevation; ensure a geometrical far-side Earth is blocked; check a polar sun-angle case; verify event times agree with refined underlying time series. Compare Sun and Earth azimuth/elevation against JPL Horizons for at least three sites, three dates, and multiple instants, with matching frame, observation point, time standard, light-time/aberration convention and angle convention. Record residuals and method. No empty or unresolved comparison may be presented as a passed validation. Include limitations about DEM interpolation/quality and geometric-only communications.

## Risks and decisions to manage

1. Candidate *regions* are not point coordinates. Pull ROI geometry or raster georeferencing before creating site rows; clearly identify representative points. NASA's press release alone does not provide center coordinates.
2. 5 m/pixel polar rasters are not 5 m independent measurements: PGDA reports extensive interpolation and non-zero uncertainty. Expose resolution and quality, and use different/global LOLA products only with explicit caveats for non-polar locations.
3. Mean Earth frame realization matters. Apollo/PDS coordinates reference DE421; the selected DE440 ME frame is a near-aligned realization. Preserve frame names and transform where needed; do not silently assume all DEMs and vectors share a frame.
4. 30-minute sampling is for global precomputation, not event precision. Refine crossings and show the supported event-time resolution.
5. Horizon results depend on observer height, DEM coverage, raster interpolation, maximum ray range and curvature correction. Record those decisions and avoid false precision.
6. Date controls cannot imply coverage outside generated files. Show the coverage interval, disable/qualify unsupported timestamps, and choose the initial coverage around the hackathon scenario only after a team-approved range is recorded.
7. A server-side AI feature needs a real managed LLM path, graceful failure, prompt-injection-resistant grounding, and numeric values kept visible. It remains optional until deterministic outputs work.

## Practical sequence and team checklist

**OM — lead/integration:** [ ] Agree on version-1 schema, frames and repository boundaries. [ ] Set up the independent new website and data layout. [ ] Integrate science/UI modules without replacing teammate-owned work. [ ] Build comparison and demo narrative. [ ] Review deployment choice with the owner before any public release.

**JAY — ephemeris/geometry:** [ ] Install/use the matched DE440 SPK, lunar binary PCK, matching lunar FK, text PCK and LSK with checksums. [ ] Implement reusable global Moon-centred Sun/Earth vectors and distances at 30-minute samples. [ ] Implement frame/coordinate transformations and topocentric site vectors. [ ] Derive/validate azimuth/elevation and refine events. [ ] Compare to Horizons and publish error/method records.

**KALYANI — terrain/visibility:** [ ] Identify LOLA global and south-polar products and ROI shapefiles. [ ] Establish per-site DEM/projection/frame/height datum. [ ] Generate site-specific 360-point horizons with curvature and documented ray extent/mast. [ ] Validate data gaps/interpolation and visibility transitions. [ ] Provide quality/uncertainty metadata and optional hillshade tiles.

**SACHI — frontend/visualization:** [ ] Implement the accessible mission-console shell and site/date/time controls. [ ] Build the horizon SVG and computed Sun/Earth markers. [ ] Build linked metrics and independent timelines with play/scrub/jump actions. [ ] Implement responsive compare and What Changed views. [ ] Keep data loading, invalid, missing, and out-of-coverage states explicit.

**MANAN — source/validation/docs:** [ ] Verify 2 Apollo coordinates and all polar region labels/representative-point sources. [ ] Maintain source URLs, coordinate-frame conversions and DEM provenance. [ ] Build validation cases for three sites, dates and times and document Horizons comparability. [ ] Draft README, methodology, sources, installation, validation and team contribution docs. [ ] Confirm limitations and hackathon demo claims.

**Development order:** (1) settle version-1 contracts, frame and date coverage; (2) verify the initial site set and data downloads; (3) implement/test SPICE and coordinate engine; (4) implement/test terrain horizon and visibility; (5) generate and independently validate real JSON; (6) add validators, loaders, planner, sky view, metrics and timeline; (7) implement comparisons; (8) complete documentation and integration review; (9) consider optional AI/map/heatmap/3D after MVP; (10) discuss deployment as a separate decision. Each module exposes inputs, outputs, assumptions and checks. Do not claim a feature complete without implementation evidence.

## Authoritative source notes

- [NASA Space Apps 2026 challenge statement](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/)
- [NAIF generic-kernel categories](https://naif.jpl.nasa.gov/naif/data_generic.html)
- [NAIF planetary SPK directory](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/)
- [NAIF DE440 technical comments](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440_tech-comments.txt)
- [NAIF lunar PCK directory/readme](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/)
- [NAIF lunar frame kernel `moon_de440_250416.tf`](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf)
- [NAIF LSK directory](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/)
- [NASA PDS Geosciences Node LOLA overview](https://pds-geosciences.wustl.edu/missions/lro/lola.htm)
- [NASA PDS LOLA GDR data-set catalog](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/catalog/gdr_ds.cat)
- [NASA GSFC PGDA high-resolution LOLA south-pole products](https://pgda.gsfc.nasa.gov/products/78)
- [NASA NSSDCA Apollo landing-site coordinates](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html)
- [NASA Artemis III candidate-region announcement](https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/)
- [NASA GSFC SVS Artemis III region visualization](https://svs.gsfc.nasa.gov/5013/)
- [Read-only project reference repository](https://github.com/Wazor2/NASA-s-SPACE-APP-HACKATHON)
