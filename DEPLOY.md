# Deploy FreedomDesk on Vercel

This guide gets you a **public HTTPS URL** for FreedomDesk with the lead capture API working in production.

**What you get**
- Public URL like `https://freedomdesk.vercel.app`
- Automatic HTTPS (included free)
- Environment variables for Supabase, Airtable, and Resend
- Global CDN for the site and demo audio files

**Time required:** ~15–20 minutes

---

## Before you start

You need:

1. A [GitHub](https://github.com) account (free)
2. A [Vercel](https://vercel.com) account (free — sign in with GitHub)
3. (Recommended) A [Supabase](https://supabase.com) project for storing leads
4. (Optional) A [Resend](https://resend.com) account for confirmation emails

---

## Step 1 — Put the project on GitHub

### 1.1 Open Terminal

On Mac: **Terminal** → navigate to the project:

```bash
cd ~/Documents/AI/Apps/FreedomDesk
```

### 1.2 Initialize git (first time only)

```bash
git init
git add .
git commit -m "Initial FreedomDesk site"
```

### 1.3 Create a GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Name it something like `freedomdesk`
3. Leave it **Private** or **Public** (your choice)
4. Do **not** add a README (you already have one)
5. Click **Create repository**

### 1.4 Push your code

Replace `YOUR_USERNAME` with your GitHub username:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/freedomdesk.git
git push -u origin main
```

---

## Step 2 — Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your `freedomdesk` repository
3. Vercel auto-detects the project — use these settings:

| Setting | Value |
|---------|--------|
| Framework Preset | **Other** |
| Root Directory | `./` (leave default) |
| Build Command | leave **empty** |
| Output Directory | leave **empty** |

4. **Do not deploy yet** — add environment variables first (Step 3)
5. Click **Deploy**

Vercel will build and give you a URL like:

`https://freedomdesk-xxxxx.vercel.app`

HTTPS is enabled automatically. No extra setup needed.

---

## Step 3 — Add environment variables

In Vercel: **Project → Settings → Environment Variables**

Add each variable below for **Production** (and Preview if you want staging to work the same).

### Required for lead storage (pick one provider)

**Option A — Supabase (recommended)**

| Name | Value |
|------|--------|
| `LEADS_PROVIDER` | `supabase` |
| `SUPABASE_URL` | Your project URL from Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key (keep secret — never put in frontend code) |
| `SUPABASE_TABLE` | `leads` |
| `NODE_ENV` | `production` |

Run `supabase/leads.sql` in the Supabase SQL editor before going live.

**Option B — Airtable**

| Name | Value |
|------|--------|
| `LEADS_PROVIDER` | `airtable` |
| `AIRTABLE_API_KEY` | Personal access token |
| `AIRTABLE_BASE_ID` | Base ID |
| `AIRTABLE_TABLE` | `Leads` |
| `NODE_ENV` | `production` |

### Email (optional but recommended)

| Name | Value |
|------|--------|
| `RESEND_API_KEY` | From resend.com → API Keys |
| `FROM_EMAIL` | `FreedomDesk <onboarding@yourdomain.com>` (must be a verified domain in Resend) |
| `REPLY_TO_EMAIL` | Your support email |
| `NOTIFY_EMAIL` | Email where you want new lead alerts |

### CORS (optional)

| Name | Value |
|------|--------|
| `ALLOWED_ORIGIN` | Your Vercel URL, e.g. `https://freedomdesk.vercel.app` |

After adding variables, redeploy: **Deployments → ⋯ on latest → Redeploy**

---

## Step 4 — Test production

1. Open your Vercel URL in a browser
2. Click **Try it free** and submit the form
3. Confirm the success screen appears
4. Check Supabase (or Airtable) for the new lead
5. Check your inbox for the confirmation email (if Resend is configured)

**Test the API directly:**

```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/leads \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","practiceName":"Test Dental","email":"test@example.com","phone":"(555) 555-0100","practiceSoftware":"Dentrix","locations":"1","callVolume":"500-1000"}'
```

You should get: `{"ok":true,"stored":true,...}`

---

## Step 5 — Custom domain (optional)

1. Vercel → **Project → Settings → Domains**
2. Add your domain (e.g. `freedomdesk.com`)
3. Follow Vercel’s DNS instructions at your registrar
4. HTTPS certificate is provisioned automatically

Update `ALLOWED_ORIGIN` to your custom domain after connecting it.

---

## Deploy updates later

Every push to `main` on GitHub triggers a new production deploy automatically.

```bash
git add .
git commit -m "Describe your change"
git push
```

---

## Alternative — Deploy from Terminal (no GitHub)

If you prefer the CLI:

```bash
npm i -g vercel
cd ~/Documents/AI/Apps/FreedomDesk
vercel login
vercel
```

Follow prompts. For production:

```bash
vercel --prod
```

Add environment variables in the Vercel dashboard (Step 3) or via:

```bash
vercel env add SUPABASE_URL production
```

---

## Project structure on Vercel

| Path | Purpose |
|------|---------|
| `index.html`, `styles.css`, `script.js` | Marketing site |
| `demo-player.js`, `audio/` | Interactive demo |
| `app/` | Internal dashboard preview (optional; `noindex`) |
| `api/leads.js` | Serverless lead capture API |
| `server/leads-handler.js` | Shared API logic |
| `vercel.json` | Routes `/api/leads` to the serverless function |

`.vercelignore` excludes `src/`, `prototypes/`, `scripts/`, and other internal paths from deploy bundles — marketing site and lead API only.

Local development still uses `server/index.js`:

```bash
cd server && npm install && npm start
```

---

## Troubleshooting

**Form submits but nothing is stored**
- Check Vercel → **Deployments → Functions → Logs**
- Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set for Production
- Confirm `NODE_ENV=production` is set

**503 “Lead storage is not configured”**
- Add Supabase or Airtable env vars and redeploy

**Demo audio doesn’t play**
- Confirm the `audio/` folder was pushed to GitHub
- Hard refresh the page (Cmd+Shift+R)

**Email not sending**
- Verify your domain in Resend
- Check `FROM_EMAIL` uses that verified domain
- Function logs will show email errors without blocking lead storage

---

## Security reminders

- Never commit `.env` to GitHub
- Never expose `SUPABASE_SERVICE_KEY` in frontend code
- Use Vercel Environment Variables for all secrets
- The service role key is server-side only (inside `/api/leads`)

---

Need help? Check [Vercel Docs](https://vercel.com/docs) or review `README.md` in this project.
