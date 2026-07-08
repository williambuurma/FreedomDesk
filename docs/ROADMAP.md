# FreedomDesk Roadmap

> **Purpose:** Phased delivery plan from current marketing site to full production AI phone platform. Product, engineering, and dental consultants use this to prioritize work and understand dependencies.

---

## Table of Contents

1. [Roadmap Overview](#roadmap-overview)
2. [Phase 0 — Marketing Site and Lead Capture (Current)](#phase-0--marketing-site-and-lead-capture-current)
3. [Phase 1 — MVP Phone Agent (Summary-Only)](#phase-1--mvp-phone-agent-summary-only)
4. [Phase 2 — PMS Read Integration](#phase-2--pms-read-integration)
5. [Phase 3 — PMS Write-Back and Live Scheduling](#phase-3--pms-write-back-and-live-scheduling)
6. [Phase 4 — Admin Dashboard and Self-Service Config](#phase-4--admin-dashboard-and-self-service-config)
7. [Phase 5 — Scale, Analytics, and Enterprise Features](#phase-5--scale-analytics-and-enterprise-features)
8. [Phase 6 — Advanced Intelligence](#phase-6--advanced-intelligence)
9. [Cross-Cutting Workstreams](#cross-cutting-workstreams)
10. [Risk Register](#risk-register)
11. [Decision Log](#decision-log)

---

## Roadmap Overview

```
Phase 0  ████████████████████  COMPLETE (marketing site + lead capture)
Phase 1  ░░░░░░░░░░░░░░░░░░░░  MVP phone agent — summary-only
Phase 2  ░░░░░░░░░░░░░░░░░░░░  PMS read (patient lookup, schedule read)
Phase 3  ░░░░░░░░░░░░░░░░░░░░  PMS write-back + live scheduling
Phase 4  ░░░░░░░░░░░░░░░░░░░░  Admin dashboard + self-service config
Phase 5  ░░░░░░░░░░░░░░░░░░░░  Scale + analytics + multi-location
Phase 6  ░░░░░░░░░░░░░░░░░░░░  Advanced intelligence (eligibility, outbound)
```

### Guiding priorities

1. **Ship phone answering fast** — practices need value before PMS integration is perfect
2. **Open Dental first** — best API, strong independent practice base, founder familiarity
3. **Summary quality over automation** — a great summary with manual PMS entry beats a bad auto-book
4. **HIPAA from day one** — no shortcuts on compliance, even in MVP
5. **Custom tier drives revenue** — FreedomDesk Custom ($1,299) is the long-term margin driver

### Target milestones

| Milestone | Target date | Success criteria |
|-----------|-------------|-----------------|
| First paying customer (Phase 1) | Q3 2026 | 1 practice live on summary-only phone agent |
| 10 paying customers | Q4 2026 | 10 practices, <5% churn, NPS >40 |
| Open Dental Tier 2 live | Q1 2027 | Patient lookup + comm log write-back |
| 50 paying customers | Q2 2027 | $35K+ MRR |
| Admin dashboard GA | Q2 2027 | Self-service onboarding in <7 days |
| Dentrix + Eaglesoft adapters | Q3 2027 | Top 3 PMS platforms supported |
| 100 paying customers | Q4 2027 | $70K+ MRR |

---

## Phase 0 — Marketing Site and Lead Capture (Current)

**Status:** ✅ Complete

### Delivered

| Component | Status | Location |
|-----------|--------|----------|
| Landing page | ✅ | `index.html`, `styles.css`, `script.js` |
| Demo audio player | ✅ | `demo-player.js`, `audio/` |
| Lead capture form | ✅ | Contact section + modal |
| Lead API | ✅ | `server/leads-handler.js`, `api/leads.js` |
| Supabase schema | ✅ | `supabase/leads.sql` |
| Email confirmation | ✅ | Resend integration |
| Vercel deployment | ✅ | `vercel.json`, `DEPLOY.md` |
| Voice persona definition | ✅ | `voice/persona.json` |
| Demo call scripts | ✅ | `scripts/generate_demo_audio.py` |
| Knowledge base docs | ✅ | `docs/` |
| Dashboard preview (My Day, Morning Brief) | ✅ | `app/`, `data/*-preview.json` |
| Intelligence layer (stubs + tests) | 🟡 In progress | `src/conversation/`, `src/practice-brain/`, `src/engine/` |
| Prompt context builder | ✅ | `src/engine/prompt-context-builder.js`, `knowledge/` |
| Example Office DNA config | ✅ | `config/practices/example-grand-rapids.json` |

### Demo call scenarios

| Scenario | Audio file | Intent |
|----------|-----------|--------|
| New Patient Exam | `audio/New Patient/New Patient.flac` | New patient intake + scheduling |
| Weekend Toothache | `audio/Weekend Toothache/Toothache.mp3` | After-hours emergency triage |
| Broken Tooth | `audio/Broken Tooth/Broken-Tooth.mp3` | Trauma intake + urgency routing |

---

## Phase 1 — MVP Phone Agent (Summary-Only)

**Status:** 🔲 Not started  
**Target:** Q3 2026  
**Tier:** PMS Tier 0 (summary only)

### Goal

Answer real inbound phone calls for paying dental practices. Collect structured information via voice conversation. Deliver call summaries via email and SMS. No PMS integration — office staff manually enter data.

### Scope

#### Telephony

- [ ] Twilio phone number provisioning per practice
- [ ] Inbound call webhook handler
- [ ] Call recording with consent announcement
- [ ] After-hours vs. business hours routing (configurable)
- [ ] Failover to practice backup number if FreedomDesk unreachable

#### Voice pipeline

- [ ] Streaming STT (Deepgram or equivalent)
- [ ] Streaming TTS with Aly persona (ElevenLabs or PlayHT)
- [ ] Barge-in support
- [ ] End-to-end latency <800ms (p95)
- [ ] Natural voice quality — no robotic macOS `say` output

#### Conversation engine

- [ ] State machine framework (see [CALL_FLOWS.md](CALL_FLOWS.md))
- [ ] Intent classification: new patient, existing, treatment-specific, pediatric, emergency, same-day emergency, waitlist, demographics, billing, insurance, general
- [ ] West Michigan insurance taxonomy (Delta PPO vs Delta Medicaid vs HKD vs MI Medicaid)
- [ ] Treatment-specific flows: crown seat, RCT, extraction, implant consult, denture stage
- [ ] Waitlist and demographics update flows
- [ ] New patient intake flow (all required fields)
- [ ] Emergency triage flow (symptom screening + urgency classification)
- [ ] Existing patient message-taking flow (schedule request, reschedule request, cancel request)
- [ ] Insurance question handling (from practice config accepted list)
- [ ] Billing question routing (callback request)
- [ ] General info (hours, address from config)
- [ ] LLM guardrails: no diagnosis, no prescribing, no AI disclosure

#### Summary delivery

- [ ] Structured CallSummary JSON generation (see [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] Email summary to practice (HTML + plain text)
- [ ] SMS summary to configured number(s)
- [ ] Urgent/emergency summaries flagged with priority indicator

#### Practice configuration (manual/engineering-assisted)

- [ ] Practice onboarding questionnaire → JSON config
- [ ] Configurable: greeting, hours, address, providers, **Michigan insurance programs accepted**, emergency protocol, on-call rotation, summary recipients
- [ ] Config stored in PostgreSQL

#### Infrastructure

- [ ] Production AWS/GCP environment with HIPAA-eligible services
- [ ] PostgreSQL (practices, configs, calls, summaries)
- [ ] S3 for recordings (encrypted, 90-day retention default)
- [ ] Secrets Manager for credentials
- [ ] BAAs with Twilio, cloud provider, STT/TTS vendors
- [ ] Basic monitoring and alerting

### Out of scope (Phase 1)

- PMS integration
- Admin dashboard (config via engineering + questionnaire)
- Patient SMS confirmation texts
- Outbound calling
- Multi-language support

### Success criteria

- [ ] **3 pilot practices in West Michigan (Grand Rapids metro)** live on summary-only phone agent
- [ ] >98% call answer rate
- [ ] >90% summary completeness (required fields)
- [ ] <800ms voice latency (p95)
- [ ] Zero clinical advice incidents
- [ ] Pilot NPS >40

### Pricing at launch

FreedomDesk ($699/mo) — summary-only tier. FreedomDesk Custom ($1,299/mo) adds custom call flows and summary fields.

---

## Phase 2 — PMS Read Integration

**Status:** 🔲 Not started  
**Target:** Q4 2026 – Q1 2027  
**Tier:** PMS Tier 1 (read)

### Goal

Look up existing patients during calls. Read upcoming appointments. Read provider schedules and recall status. Enrich summaries with PMS data.

### Scope

#### Open Dental adapter (priority #1)

- [ ] Patient search by name + DOB
- [ ] Read upcoming appointments for patient
- [ ] Read provider list and operatory list
- [ ] Read recall status
- [ ] Read accepted insurance plans
- [ ] Connection health monitoring

#### Dentrix Ascend adapter (priority #2)

- [ ] Same read capabilities as Open Dental
- [ ] OAuth authentication flow

#### Middleware evaluation (Eaglesoft, Dentrix G7)

- [ ] Evaluate NexHealth / DentalRobot for unified API
- [ ] Pilot with 1 Eaglesoft practice if middleware viable

#### Conversation engine enhancements

- [ ] Existing patient identification via PMS lookup mid-call
- [ ] "I see you have an appointment on [date]" — confirm/reschedule/cancel with context
- [ ] Recall-driven scheduling: "You're due for your cleaning"
- [ ] Summary includes `pmsPatientId` and linked appointment IDs

#### Infrastructure

- [ ] PMS credential storage in Secrets Manager
- [ ] PMS adapter service (separate microservice)
- [ ] Circuit breaker for PMS unavailability (fallback to message-taking)
- [ ] PMS API audit logging

### Success criteria

- [ ] Open Dental read integration live for 10+ practices
- [ ] Patient lookup success rate >95%
- [ ] PMS unavailability fallback works (zero dropped calls)
- [ ] Existing patient calls include PMS context in summary

---

## Phase 3 — PMS Write-Back and Live Scheduling

**Status:** 🔲 Not started  
**Target:** Q1 – Q2 2027  
**Tier:** PMS Tier 2–3 (write + real-time schedule)

### Goal

Create appointment requests (or confirmed appointments) during calls. Write comm logs to PMS. Query real-time availability and offer actual open slots.

### Scope

#### Open Dental write-back

- [ ] Create appointment (request mode — unconfirmed)
- [ ] Create appointment (confirmed mode — practice opt-in)
- [ ] Query available slots via `/appointments/Slots`
- [ ] Create comm log entry with call summary
- [ ] Create task/tickler for urgent follow-up
- [ ] Reschedule appointment
- [ ] Cancel appointment

#### Dentrix Ascend write-back

- [ ] Same write capabilities

#### CareStack adapter

- [ ] Full read + write adapter (cloud-native, modern API)

#### Conversation engine enhancements

- [ ] Real-time slot offering: "I have Thursday at 9 AM or Tuesday at 2 PM"
- [ ] Appointment request vs. confirmed booking (per practice config)
- [ ] Automatic comm log write-back on call completion
- [ ] Idempotent write-back (retry-safe)

#### Patient communication

- [ ] Trigger confirmation SMS via Twilio (if practice enables)
- [ ] New patient form link via SMS (if practice uses online forms)

### Success criteria

- [ ] 50%+ of scheduling calls result in PMS appointment (request or confirmed)
- [ ] Write-back success rate >98%
- [ ] Zero double-bookings
- [ ] Average call handle time <4 minutes for scheduling calls

---

## Phase 4 — Admin Dashboard and Self-Service Config

**Status:** 🔲 Not started  
**Target:** Q2 2027

### Goal

Practice staff and FreedomDesk ops can configure, monitor, and review calls without engineering involvement. Onboarding a new practice takes <7 business days with minimal manual work.

### Scope

#### Admin dashboard (Next.js)

- [ ] Practice onboarding wizard
- [ ] Call flow configuration UI (hours, greeting, emergency protocol, insurance list)
- [ ] Provider and appointment type management
- [ ] Summary delivery configuration (email, SMS, webhook)
- [ ] Call history and summary review
- [ ] Call recording playback (auth-protected, audit-logged)
- [ ] PMS connection setup and health status
- [ ] User management (office manager, front desk roles)

#### Self-service onboarding

- [ ] Questionnaire → auto-generate practice config
- [ ] Phone number provisioning workflow
- [ ] PMS credential setup wizard (Open Dental customer key, etc.)
- [ ] Test call feature (call your own number to verify setup)
- [ ] Go-live checklist

#### FreedomDesk ops tools

- [ ] Cross-practice monitoring dashboard
- [ ] Call quality review queue
- [ ] Config version history and rollback
- [ ] Support ticket integration

### Success criteria

- [ ] New practice onboarding <7 business days (median)
- [ ] 80%+ of config changes done by practice staff (not FreedomDesk ops)
- [ ] Zero config-related call failures in production

---

## Phase 5 — Scale, Analytics, and Enterprise Features

**Status:** 🔲 Not started  
**Target:** Q3 – Q4 2027

### Goal

Support 100+ practices reliably. Provide analytics that prove ROI. Enable multi-location groups.

### Scope

#### Scale infrastructure

- [ ] Auto-scaling telephony and conversation services
- [ ] Multi-region deployment (US East + West)
- [ ] 99.9% uptime SLA
- [ ] Load testing: 500 concurrent calls

#### Analytics dashboard

- [ ] Call volume trends
- [ ] New patient capture rate
- [ ] Answer rate vs. baseline
- [ ] Average handle time by intent
- [ ] Emergency routing accuracy
- [ ] Summary completeness scores
- [ ] ROI calculator (new patients × average lifetime value)

#### Multi-location support

- [ ] Location-specific configs within a practice group
- [ ] Centralized billing and reporting
- [ ] Location-based call routing (which number → which location)

#### Eaglesoft and Dentrix G7 adapters

- [ ] Production-ready via middleware or bridge agent
- [ ] Full read + write for legacy on-premise PMS

#### Compliance

- [ ] SOC 2 Type I audit
- [ ] Annual HIPAA risk assessment process
- [ ] Patient data export/deletion tooling

### Success criteria

- [ ] 100+ paying practices
- [ ] 99.9% uptime over 90 days
- [ ] <$3K cost per practice per month (infrastructure)
- [ ] SOC 2 Type I complete

---

## Phase 6 — Advanced Intelligence

**Status:** 🔲 Future  
**Target:** 2028+

### Goal

Differentiate with intelligence that generic phone agents cannot match.

### Potential features

| Feature | Description | Dependency |
|---------|-------------|------------|
| **Insurance eligibility verification** | Real-time eligibility check during call via clearinghouse API | Phase 3 PMS write |
| **Smart scheduling optimization** | ML-based slot selection to maximize production | Phase 3 scheduling + analytics data |
| **Outbound recall campaigns** | Automated recall calls/texts for overdue patients | Phase 2 recall read + outbound telephony |
| **Sentiment analysis** | Flag unhappy callers for office manager follow-up | Phase 1 call recordings |
| **Multi-language support** | Spanish at minimum for US practices | Phase 1 voice pipeline |
| **Treatment plan scheduling** | "I see you have a crown pending" → schedule treatment | Phase 2 PMS read |
| **Post-call patient survey** | SMS satisfaction survey | Phase 3 SMS |
| **Voice biometrics** | Caller verification for existing patients | Research phase |
| **DSO enterprise tier** | Custom pricing, dedicated support, API access | Phase 5 scale |

### Evaluation criteria for Phase 6 features

- Does it require dental domain expertise to build well? (If no, it's a commodity — deprioritize)
- Does it directly increase new patient capture or reduce front desk burden?
- Can it be built HIPAA-compliantly?
- Is there customer demand (validated by 50+ customers)?

---

## Cross-Cutting Workstreams

These run across all phases:

### HIPAA and compliance

| Phase | Work |
|-------|------|
| 0 | Document compliance posture |
| 1 | BAAs, encryption, audit logging, minimum necessary |
| 2 | PMS credential security, access audit |
| 3 | Write-back audit trail |
| 4 | Dashboard access controls, recording access audit |
| 5 | SOC 2, annual risk assessment |

### Voice quality

| Phase | Work |
|-------|------|
| 0 | Persona definition, demo scripts |
| 1 | Production TTS with Aly voice, latency optimization |
| 2–3 | Context-aware responses with PMS data |
| 4+ | A/B testing voice variations, Custom tier persona options |

### Dental consultant program

| Phase | Work |
|-------|------|
| 0 | Document workflows (DENTAL_WORKFLOWS.md, CALL_FLOWS.md) |
| 1 | Pilot practice workflow review with consultant |
| 2+ | Consultant review of call quality samples monthly |
| 4+ | Self-service workflow templates by practice type (GP, pedo, perio) |

### Customer success

| Phase | Work |
|-------|------|
| 1 | White-glove onboarding for first 10 customers |
| 2 | Onboarding playbook documented |
| 4 | Self-service onboarding wizard |
| 5 | Customer success manager at 50+ customers |

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Voice latency >1s | Poor patient experience | Medium | Streaming STT/TTS, edge deployment, latency budget per component |
| LLM gives clinical advice | Liability, trust loss | Medium | State machine guardrails, output filtering, regular audit |
| PMS API unavailable | Can't lookup/schedule | High | Graceful fallback to message-taking; circuit breaker |
| Eaglesoft/Dentrix G7 integration blocked | Can't serve 50%+ market | High | Middleware (NexHealth); summary-only tier as fallback |
| HIPAA breach | Business-ending | Low | Encryption, access controls, audit, BAAs, no PHI in logs |
| Practice churn after trial | Revenue loss | Medium | White-glove onboarding, prove ROI in first 30 days |
| Twilio outage | Calls fail | Low | Failover number, status page monitoring, multi-provider eval |
| Competitor launches dental AI | Market pressure | Medium | Domain depth, dentist-founder trust, PMS integration moat |

---

## Decision Log

| Date | Decision | Rationale | Alternatives considered |
|------|----------|-----------|------------------------|
| 2026-06 | Phase 0 on Vercel + Supabase | Fast deploy, low cost for marketing site | Netlify, custom VPS |
| 2026-06 | Summary-only before PMS integration | Ship value fast; PMS integration is high-effort | Wait for full PMS before launch |
| 2026-06 | Open Dental first PMS adapter | Best API, developer-friendly, strong indie base | Dentrix first (larger market but harder API) |
| 2026-06 | Twilio for telephony | HIPAA-eligible, market standard, media streams | Telnyx (backup eval) |
| 2026-06 | Aly persona, no AI disclosure | Patients expect human front desk experience | Transparent AI disclosure |
| 2026-06 | $699/$1,299 pricing | Under FTE cost ($3,500+/mo), premium vs. answering services ($200–400/mo) | Per-call pricing (rejected — unpredictable for practices) |
| TBD | Target LLM provider | Evaluating latency + tool calling + cost | GPT-4o, Claude, Gemini |
| TBD | Middleware vs. direct for Eaglesoft | Pending NexHealth eval | Direct Patterson API partnership |

---

## Related Documents

- [FREEDOMDESK_CONTEXT.md](FREEDOMDESK_CONTEXT.md) — product vision and principles
- [USER_EXPERIENCE_PHILOSOPHY.md](USER_EXPERIENCE_PHILOSOPHY.md) — how features must feel
- [FEATURE_BACKLOG.md](FEATURE_BACKLOG.md) — permanent product backlog by capability area
- [ARCHITECTURE.md](ARCHITECTURE.md) — technical architecture per phase
- [PRACTICE_MANAGEMENT_SOFTWARE.md](PRACTICE_MANAGEMENT_SOFTWARE.md) — PMS integration timeline
- [CALL_FLOWS.md](CALL_FLOWS.md) — call flows to implement per phase
- [DENTAL_WORKFLOWS.md](DENTAL_WORKFLOWS.md) — domain workflows
