# FreedomDesk Companion

**Not the marketing site** (`freedomdeskai.com`). **Not a full-page dashboard.**

This is the product customers use after they buy — a **narrow operating companion** that docks beside Open Dental / the PMS and stays open all day.

## Launch

```bash
npm run dev
```

Opens **http://127.0.0.1:5500/app/#my-day**.

Locally you will see a muted PMS stage on the left (preview context only) and the FreedomDesk companion panel on the right. The companion is the product.

## Companion workspaces

| Workspace | Route | Role |
|-----------|-------|------|
| Morning Brief | `#morning-brief` | What to know before the day starts |
| My Day | `#my-day` | Your work for today |
| Next | `#intelligence-inbox` | Decisions that need action |
| Patients | `#patients` | Patient context |
| Ask FreedomDesk | `#ask` | Practice Q&A |

Settings opens from the companion footer — not primary nav.

## Regenerate mock data

```bash
npm run preview:intelligence-inbox
npm run preview:my-day
npm run preview:morning-brief
```

`npm run dev` runs these automatically before serving.

## Architecture

- `dashboard.js` — companion shell, nav tabs, module routing
- `shared/registry.js` — module registration (`navVisible` for companion nav)
- `modules/intelligence-inbox/` — Next (decision-first Actions)
- `modules/my-day/`, `modules/morning-brief/` — daily rhythm
- `modules/patients/`, `modules/ask/` — workspace placeholders
- `modules/settings/` — utility (footer menu only)

See [`src/README.md`](../src/README.md) for the intelligence layer that will feed these surfaces.
