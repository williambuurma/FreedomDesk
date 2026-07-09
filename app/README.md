# Internal Product UI

**Not the production phone agent.** Static HTML/CSS/JS surfaces for FreedomDesk practice workflows — using mock data.

## Launch

```bash
npm run dev
```

Opens **http://127.0.0.1:5500/app/#intelligence-inbox** (Next).

## Practice workflows (sidebar)

| Workspace | Route | Role |
|-----------|-------|------|
| Morning Brief | `#morning-brief` | Start the day |
| My Day | `#my-day` | Role-aware daily work |
| Next | `#intelligence-inbox` | Decision queue |
| Patients | `#patients` | Patient context |
| Ask FreedomDesk | `#ask` | Practice Q&A |

Settings is not in the sidebar — open **Practice** (gear) at the bottom of the nav.

## Regenerate mock data

```bash
npm run preview:intelligence-inbox
npm run preview:my-day
npm run preview:morning-brief
```

`npm run dev` runs these automatically before serving.

## Architecture

- `dashboard.js` — workflow nav, profile menu, module routing
- `shared/registry.js` — module registration (`navVisible` for sidebar)
- `modules/intelligence-inbox/` — Next (decision-first Actions)
- `modules/my-day/`, `modules/morning-brief/` — daily rhythm
- `modules/patients/`, `modules/ask/` — workflow placeholders
- `modules/settings/` — utility (profile menu only)

See [`src/README.md`](../src/README.md) for the intelligence layer that will feed these surfaces.
