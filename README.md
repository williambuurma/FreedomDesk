# FreedomDesk

**The AI front desk layer for independent dental practices in West Michigan.**

FreedomDesk answers phone calls, gathers the information your office needs, and delivers organized call summaries so your team can stay focused on patients in the chair. Built by **Dr. William Buurma DDS**, a practicing general dentist in Michigan — not as a replacement for your front desk, but as calm, reliable phone coverage that captures opportunities and protects patient experience.

**Primary market:** Grand Rapids metro and West Michigan independent general dentistry (1–3 doctors, 4–8 operatories, Open Dental–first). See [docs/README.md](docs/README.md) for the full documentation index and reading order.

---

## What FreedomDesk Does

| Capability | Description |
|------------|-------------|
| **New patient intake** | Collects demographics, insurance, chief complaint, and scheduling preferences; delivers structured summaries for front desk follow-up |
| **Existing patient requests** | Reschedule, cancel, confirm, billing questions, prescription refills (routing only), general office inquiries |
| **After-hours coverage** | Answers when the office is closed; captures messages; triages urgent dental emergencies per office rules |
| **Emergency triage** | Symptom screening without diagnosis; flags urgency; routes to on-call dentist or urgent care guidance |
| **Call summaries** | Every call ends with an organized summary delivered to the practice (email, SMS, PMS task, or dashboard — per integration tier) |
| **Treatment scheduling** | Crown seat, root canal, extraction, implant consult, denture stages — typed summaries, not generic "appointment" |
| **West Michigan insurance** | Delta Dental PPO, Delta Dental Medicaid, Healthy Kids Dental, Michigan Medicaid, PPO, cash-pay — program-level classification |
| **PMS integration** | Open Dental (priority), Eaglesoft, Dentrix, CareStack |

---

## Documentation

This repository is the **FreedomDesk knowledge base and marketing site**.

**→ [docs/README.md](docs/README.md) is the canonical documentation index and reading order** for engineers, product, dental consultants, and AI agents. It includes an authority map (which document owns which concept), the full required reading sequence, and task-specific entry points.

Product vision is defined in the Constitution, Principles, Context, Intelligence, and Operating Model documents — not in the empty root [`VISION.md`](VISION.md) placeholder.

| Quick link | Purpose |
|------------|---------|
| [docs/README.md](docs/README.md) | **Start here** — index, reading order, authority map |
| [DEPLOY.md](DEPLOY.md) | Vercel deployment for the marketing site and lead API |

---

## Repository Structure

```
FreedomDesk/
├── index.html              # Marketing landing page
├── styles.css              # Design system
├── script.js               # UI, form validation, lead submission
├── demo-player.js          # Interactive demo call player
├── voice/
│   └── persona.json        # Voice agent persona ("Aly") — tone, phrases, constraints
├── audio/                  # Demo call recordings + manifest.json
├── server/                 # Express API (local dev)
│   ├── index.js
│   └── leads-handler.js
├── api/
│   └── leads.js            # Vercel serverless entry for POST /api/leads
├── supabase/
│   └── leads.sql           # Lead capture table schema
├── scripts/                # Audio generation, alignment utilities
└── docs/                   # Knowledge base — start at docs/README.md
```

---

## Current State (Phase 0)

The repository today ships:

1. **Marketing site** — product positioning, pricing, founder story, demo audio player
2. **Lead capture API** — `POST /api/leads` stores demo requests in Supabase/Airtable and sends confirmation email via Resend
3. **Demo audio** — three sample scenarios (new patient, weekend toothache, broken tooth) with voice persona defined in `voice/persona.json`
4. **Knowledge base** — comprehensive docs for building the full platform

The **production AI phone system** (telephony, real-time voice, PMS write-back, per-practice configuration) is defined in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/ROADMAP.md](docs/ROADMAP.md) and is not yet implemented in this repo.

---

## Quick Start (Developers)

### Prerequisites

- Node.js 18+
- Python 3.10+ (optional — demo audio scripts)
- Supabase project (optional — lead storage)
- Resend account (optional — confirmation emails)

### Full stack (recommended)

```bash
cd server
npm install
cp ../.env.example ../.env
# Edit ../.env with Supabase / Airtable / Resend keys
npm start
```

Open http://127.0.0.1:5500

The Express server serves static assets and handles `POST /api/leads`.

### Static only (no lead storage)

```bash
python3 -m http.server 5500
```

Form submissions will fail without the API server.

---

## Environment Variables

Copy `.env.example` to `.env` in the project root.

| Variable | Purpose |
|----------|---------|
| `PORT` | Local server port (default `5500`) |
| `NODE_ENV` | `development` or `production` |
| `LEADS_PROVIDER` | `supabase`, `airtable`, or `both` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (server-side only — never expose to client) |
| `SUPABASE_TABLE` | Table name (default `leads`) |
| `AIRTABLE_API_KEY` | Airtable personal access token |
| `AIRTABLE_BASE_ID` | Airtable base ID |
| `AIRTABLE_TABLE` | Table name (default `Leads`) |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `FROM_EMAIL` | Verified sender address |
| `REPLY_TO_EMAIL` | Reply-to address for lead confirmations |
| `NOTIFY_EMAIL` | Internal team notification inbox |
| `ALLOWED_ORIGIN` | CORS origin (default `*`) |

---

## Lead Capture Flow

All **Request a Demo** CTAs open a form that collects:

- Full name
- Practice name
- Work email
- Phone number
- Practice management software (Dentrix, Open Dental, Eaglesoft, Curve, CareStack, Other)
- Number of locations
- Estimated monthly call volume

After submission:

1. Lead stored in **Supabase** and/or **Airtable**
2. Confirmation email sent via **Resend**
3. Internal notification to `NOTIFY_EMAIL`
4. User sees success confirmation

---

## Demo Audio

Sample calls live in `audio/` with metadata in `audio/manifest.json`:

| Scenario ID | Title | Purpose |
|-------------|-------|---------|
| `new-patient-exam` | New Patient | Intake + insurance + scheduling offer |
| `toothache` | Weekend Toothache | After-hours urgent triage |
| `brokentooth` | Broken Tooth | Trauma intake + same-day urgency |

Voice direction is defined in `voice/persona.json`. Regenerate dev timing audio on macOS:

```bash
python3 scripts/generate_demo_audio.py
```

For production-quality voice, use recorded audio or a natural TTS provider (ElevenLabs, PlayHT, etc.).

---

## Pricing (Product)

| Tier | Price | Includes |
|------|-------|----------|
| **FreedomDesk** | $699/month per location | New patient, existing patient, after-hours, emergency triage, call summaries |
| **FreedomDesk Custom** | $1,299/month per location | Everything above + office-specific workflows, custom scheduling rules, custom summary fields |

Setup included. Month-to-month. No long-term contract.

---

## Engineering Principles

When contributing to FreedomDesk, internalize these non-negotiables:

1. **Support the front desk, never replace clinical judgment.** FreedomDesk gathers information and routes; it does not diagnose, prescribe, or guarantee coverage.
2. **HIPAA by design.** PHI flows through BAA-covered vendors only. Minimize retention. Encrypt in transit and at rest. Audit everything that touches patient data.
3. **Practice-configurable.** Every office handles calls differently. Hard-coded workflows fail in production.
4. **PMS-aware.** Scheduling language, patient lookup, and write-back must respect each practice management system's data model and API constraints.
5. **Sound human.** The voice agent ("Aly") is a calm, experienced front desk coordinator — not a robot, not a chatbot, not an "AI assistant."

Full standards: [docs/README.md](docs/README.md) → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [.cursor/rules/freedomdesk.mdc](.cursor/rules/freedomdesk.mdc).

---

## Deploy to Production

**→ See [DEPLOY.md](DEPLOY.md) for full Vercel deployment instructions.**

Quick summary:

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add environment variables from `.env.example`
4. Deploy — `vercel.json` routes `/api/leads` to the serverless function

---

## Company

**FreedomDesk** by [Buurma AI](https://buurma.ai)

Founder: **Dr. William Buurma DDS** — practicing dentist, Michigan

© 2026 FreedomDesk
