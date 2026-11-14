# 🌙 Lunar Landing Site Planner

**Live demo: https://wazor2.github.io/NASA-s-SPACE-APP-HACKATHON/**

## 1. Project Title & Problem Statement
**Lunar Landing Site Planner** — NASA Space Apps Challenge 2026, Nagpur.
TODO (copy official title from the challenge page): an easy tool that shows, for a chosen lunar landing site and date, when the Sun and Earth are above the horizon, so planners can judge solar power and direct-to-Earth communication and quickly compare alternatives when a mission slips. Focus: the Moon's south pole.

## 2. Team Details
Team name: TODO

| Name | Institution | GitHub | Role |
|---|---|---|---|
| Om Manjule | TODO | Wazor2 | P1: lead, repo, integration, deployment |
| TODO | TODO | TODO | P2: Sun and Earth ephemeris (JPL Horizons) |
| TODO | TODO | TODO | P3: terrain and horizon (LOLA DEM) |
| TODO | TODO | TODO | P4: visualization frontend |
| TODO | TODO | TODO | P5: compare view, content, summaries, pitch |

## 3. Solution Overview & Architecture
For each site we precompute Sun/Earth azimuth+elevation over time (JPL Horizons) and a 360-value terrain horizon profile (LOLA DEM). The web app marks a body as visible only when its elevation is above the terrain horizon at its azimuth, then shows: sky view, key numbers, scrubber with play, visibility timelines, an illumination heatmap, side-by-side site comparison, and a "what changed if the mission slips" table.

```
Colab (P2: Horizons API) ──► public/data/ephemeris/<site>.json ─┐
Colab (P3: LOLA DEM)     ──► public/data/horizon/<site>.json  ──┼─► Next.js static site ─► GitHub Pages
P3/P5: sites.json, summaries.json ──────────────────────────────┘
```
Stack: Next.js (static export), TypeScript, Tailwind CSS, hand-written SVG charts (no chart library), Python in Google Colab for data prep, GitHub Actions + GitHub Pages. Data format: see [CONTRACT.md](CONTRACT.md).

## 4. Live Demo & Screenshots
- Live: https://wazor2.github.io/NASA-s-SPACE-APP-HACKATHON/
- Demo video: TODO
- Screenshots: TODO (add to `docs/`)

## 5. Installation & Setup
```bash
git clone https://github.com/Wazor2/NASA-s-SPACE-APP-HACKATHON.git
cd NASA-s-SPACE-APP-HACKATHON
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests for the event-finding logic
npm run build    # static export to ./out
```

## 6. AI Usage Disclosure
| Tool | Used for | What the team did on top |
|---|---|---|
| Claude (Anthropic) | Initial project scaffold: Next.js pages (Planner, Compare, About), SVG components, event-finding logic and its unit tests, data loader, GitHub Pages workflow, CONTRACT.md, mock data, this README draft | Reviewed, ran and tested the code, integrated real data, edited text. TODO: describe your own changes |
| TODO (e.g. Antigravity / Gemma / AI Studio) | TODO | TODO |

No AI tool is a commit author or contributor; all commits are made by team members from their own accounts. Data files in `public/data/` marked MOCK are placeholders until replaced with real Horizons/LOLA outputs.

## Credits
NASA JPL Horizons, NASA LRO LOLA, NASA Moon Trek and Quickmap, CSA Moon Exploration portal. Not endorsed by NASA.Special thanks to all my teammates.
