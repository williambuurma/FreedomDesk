# FreedomDesk Companion

**Not the marketing site** (`freedomdeskai.com`). **Not a full-page dashboard.**

This is the product customers use after they buy — a **narrow operating companion** that docks beside Open Dental / the PMS and stays open all day. UI v2 uses a permanent icon rail and decision-first workspaces. On desktop the companion stays narrow (~320–360px) so the PMS remains visible; decision cards stack vertically like quiet notifications.

## Launch

```bash
npm run dev
```

Opens **http://127.0.0.1:5500/app/#today**.

Locally you will see a muted PMS stage on the left (preview context only) and the FreedomDesk companion panel on the right. The companion is the product.

## Companion workspaces

| Workspace | Route | Role |
|-----------|-------|------|
| Today | `#today` | What to focus on right now (morning state opens with Brief judgments) |
| Patients | `#patients` | Patient context |
| Ask FreedomDesk | `#ask` | Practice Q&A |

Settings opens from the companion footer — not primary nav.

Legacy hashes `#my-day`, `#morning-brief`, and `#intelligence-inbox` redirect to `#today`.

## Regenerate mock data

```bash
npm run preview:intelligence-inbox
npm run preview:my-day
npm run preview:morning-brief
```

`npm run dev` runs these automatically before serving.

## Architecture

- `dashboard.js` — companion shell, icon rail, module routing
- `shared/registry.js` — module registration (`navVisible` for companion nav)
- `modules/today/` — single operating workspace
- `modules/morning-brief/` — morning state renderer (not primary nav)
- `modules/intelligence-inbox/` — decision mechanics (not primary nav)
- `modules/patients/`, `modules/ask/` — workspace placeholders
- `modules/settings/` — utility (footer menu only)

See [`src/README.md`](../src/README.md) for the intelligence layer that will feed these surfaces.
