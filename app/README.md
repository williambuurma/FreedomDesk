# Internal Dashboard Preview

**Not the production phone agent.** This folder is a static HTML/CSS/JS prototype of the FreedomDesk daily rhythm surfaces — My Day and Morning Brief — using mock data.

## What ships here

| Module | Status | Data source |
|--------|--------|-------------|
| **My Day** | Preview | `data/my-day-preview.json` (generated) |
| **Morning Brief** | Preview | `data/morning-brief-preview.json` (generated) |
| **Settings** | Placeholder | Static "coming soon" card |

V1 scope intentionally excludes Calls, Patients, Opportunities, and Analytics nav items — those modules exist as files but are not registered in `index.html`.

## How to open

1. Start the local server: `cd server && npm start`
2. Open http://127.0.0.1:5500/app/

The page has `noindex` — it is for internal preview only.

## Regenerate mock data

```bash
npm run preview:my-day
npm run preview:morning-brief
```

## Architecture

- `dashboard.js` — shell routing, sidebar, header
- `shared/registry.js` — module registration
- `shared/coordination-panel.js` — notes side panel
- `modules/my-day/` and `modules/morning-brief/` — V1 preview surfaces

See [`src/README.md`](../src/README.md) for the intelligence layer that will eventually feed these surfaces with live call data.
