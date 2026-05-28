# FreedomDesk by Buurma AI

Landing page and lead capture funnel for **FreedomDesk** — the trusted front desk layer for independent dental practices.

## Deploy to production (Vercel)

For a public HTTPS URL with environment variables and the lead API:

**→ See [DEPLOY.md](DEPLOY.md) for full beginner step-by-step instructions.**

Quick summary:
1. Push this folder to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables from `.env.example`
4. Deploy — you get `https://your-project.vercel.app` with HTTPS automatically

## Run locally

### Static only (no lead storage)

```bash
cd Apps/DentalReceptionistAI
python3 -m http.server 5500
```

Form submissions will fail without the API server.

### Full stack (recommended)

```bash
cd Apps/DentalReceptionistAI/server
npm install
cp ../.env.example ../.env
# Edit ../.env with your Supabase / Airtable / Resend keys
npm start
```

Open http://127.0.0.1:5500

The Express server serves the static site and handles `POST /api/leads`.

## Lead capture flow

All **Try it free** and **Start free trial** buttons open a premium onboarding modal that collects:

- Full name
- Practice name
- Email
- Phone number
- Practice management software
- Number of locations
- Estimated monthly call volume

After submission:

1. Lead is stored in **Supabase** and/or **Airtable**
2. Confirmation email is sent via **Resend**
3. Your team receives an internal notification
4. User sees a premium success screen

## Environment variables

Copy `.env.example` to `.env` in the project root.

| Variable | Purpose |
|----------|---------|
| `LEADS_PROVIDER` | `supabase`, `airtable`, or `both` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (server-side only) |
| `AIRTABLE_API_KEY` | Airtable personal access token |
| `AIRTABLE_BASE_ID` | Airtable base ID |
| `RESEND_API_KEY` | Resend API key for confirmation emails |
| `FROM_EMAIL` | Sender address (verified domain in Resend) |
| `NOTIFY_EMAIL` | Internal team notification inbox |

## Supabase setup

1. Create a new Supabase project
2. Run `supabase/leads.sql` in the SQL editor
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to `.env`

## Airtable setup

Create a table named **Leads** with columns:

- Full Name (text)
- Practice Name (text)
- Email (email)
- Phone (phone)
- Practice Software (single select)
- Locations (single select)
- Call Volume (single select)
- Source (text)
- Submitted At (date)

## Deploy

### Vercel

Deploy the repo root. `vercel.json` routes `/api/leads` to the serverless function.

Add all environment variables in the Vercel dashboard.

### Other hosts

Run `server/index.js` on Railway, Render, Fly.io, or similar. Point your domain to the Node server.

## Demo audio

Sample calls use generated audio in `audio/`. Regenerate on macOS:

```bash
python3 scripts/generate_demo_audio.py
```

## Files

- `index.html` — page structure, onboarding modal
- `styles.css` — FreedomDesk design system
- `script.js` — UI, form validation, API submission
- `demo-player.js` — interactive audio demo player
- `audio/` — demo call audio + manifest
- `server/` — Express API + lead handler
- `api/leads.js` — Vercel serverless entry
- `supabase/leads.sql` — database schema
