# Team guide (who touches what)

Rule: only edit your own files. Everyone builds to [CONTRACT.md](../CONTRACT.md). All times UTC. Data files should start at 00:00Z and use the same `start_utc` and `step_minutes` for every site.

| Person | Files you own |
|---|---|
| P1 | `.github/`, `next.config.ts`, `lib/data.ts`, `lib/useSiteData.ts`, README, merges |
| P2 | `public/data/ephemeris/<site_id>.json` (+ `docs/validation.md`) |
| P3 | `public/data/horizon/<site_id>.json`, `public/data/sites.json` (with source URLs) |
| P4 | `components/SkyView.tsx`, `TimeControls.tsx`, `Timeline.tsx`, `Heatmap.tsx`, `Cards.tsx`, `lib/events.ts` + test, `app/page.tsx` |
| P5 | `app/compare/`, `app/about/`, `public/data/summaries.json`, `components/SiteChips.tsx`, pitch/demo script |

Replacing mock data: overwrite the JSON file for the same `site_id` and set `dem_source` in the horizon file to the real source name (the MOCK banner disappears automatically). Add a new site by adding it to `sites.json` plus its ephemeris and horizon files.

Daily git flow (each person, own account, no AI/bot authors, no auto-commit scripts):
```bash
git pull --rebase origin main
# ...work...
git add -A
git commit -m "short honest message about what you did"
git log -1 --format=full        # check author/email, no Co-authored-by
git push origin main            # or push your branch and open a PR to P1
```
