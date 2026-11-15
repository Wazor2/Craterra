# Data Contract (do not change without telling all 5)
UTC only. Degrees. Azimuth clockwise from north. Lowercase ids, no spaces. Processed files in public/data/. Never commit raw DEMs.

- `sites.json`: `[{id,name,lat,lon,type:"apollo"|"south_pole"|"other",source_url,description}]`
- `ephemeris/<id>.json`: `{site_id,start_utc,step_minutes,sun_az[],sun_el[],earth_az[],earth_el[]}` (parallel arrays)
- `horizon/<id>.json`: `{site_id,az_step_deg:1,elev_deg[360],mast_height_m,dem_source}`
- `summaries.json`: `{id:{plain_text,expert_text}}` (from computed numbers only)

Visible rule: body visible iff elevation > horizon elev at its azimuth (interpolate).

Time grid: every site's ephemeris must use the same start_utc (00:00Z) and step_minutes.
