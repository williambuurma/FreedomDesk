# FreedomDesk Architecture

> **Purpose:** Technical architecture reference for senior engineers building FreedomDesk. Describes current implementation (Phase 0 marketing site), target production architecture, security model, data flows, and coding standards.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Implementation (Phase 0)](#current-implementation-phase-0)
3. [Target Production Architecture](#target-production-architecture)
4. [Component Deep Dive](#component-deep-dive)
5. [Data Model](#data-model)
6. [Integration Architecture](#integration-architecture)
7. [Telephony and Voice Pipeline](#telephony-and-voice-pipeline)
8. [Security and HIPAA](#security-and-hipaa)
9. [Multi-Tenancy](#multi-tenancy)
10. [Observability](#observability)
11. [Deployment Topology](#deployment-topology)
12. [Coding Standards](#coding-standards)
13. [Technology Decisions](#technology-decisions)

---

## Architecture Overview

FreedomDesk is a **multi-tenant SaaS platform** that sits between inbound phone calls and dental practice operations. At full maturity, the system comprises:

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Patient   │────▶│  Telephony Layer │────▶│   Voice AI Engine   │
│   (PSTN)    │     │  (Twilio/Telnyx) │     │  (STT → LLM → TTS)  │
└─────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                        │
                        ┌───────────────────────────────┼───────────────────────────────┐
                        │                               ▼                               │
                        │                    ┌─────────────────────┐                    │
                        │                    │  Conversation Engine │                    │
                        │                    │  (state machine +    │                    │
                        │                    │   practice config)   │                    │
                        │                    └──────────┬──────────┘                    │
                        │                               │                               │
                        │         ┌─────────────────────┼─────────────────────┐         │
                        │         ▼                     ▼                     ▼         │
                        │  ┌────────────┐      ┌──────────────┐      ┌──────────────┐   │
                        │  │ PMS Adapter│      │ Summary Svc  │      │ Notification │   │
                        │  │ (OD/Dentrix│      │ (structured  │      │ (email/SMS/  │   │
                        │  │ /Eaglesoft)│      │  output)     │      │  webhook)    │   │
                        │  └──────┬─────┘      └──────┬───────┘      └──────┬───────┘   │
                        │         │                     │                     │         │
                        │         ▼                     ▼                     ▼         │
                        │  ┌─────────────────────────────────────────────────────────┐  │
                        │  │              PostgreSQL (tenant-scoped)                 │  │
                        │  │  practices · configs · calls · summaries · audit_logs   │  │
                        │  └─────────────────────────────────────────────────────────┘  │
                        │                     FreedomDesk Platform                      │
                        └───────────────────────────────────────────────────────────────┘
                                                        │
                                                        ▼
                        ┌───────────────────────────────────────────────────────────────┐
                        │  Practice Staff — email, SMS, PMS tasks, admin dashboard      │
                        └───────────────────────────────────────────────────────────────┘
```

### Design tenets

1. **Adapter pattern for PMS** — each practice management system gets an isolated adapter implementing a common interface
2. **Configuration over code** — call flows, triage rules, and summary fields live in practice config, not hard-coded branches
3. **Event-sourced call records** — every turn, tool call, and state transition is logged for audit and debugging
4. **Fail open on phone, fail closed on PHI** — always answer the call; never expose PHI without auth
5. **Async write-back** — PMS operations are queued; call completion never blocks on PMS latency

---

## Current Implementation (Phase 0)

The repository today implements the **marketing site, lead capture funnel, dashboard preview, and intelligence-layer prototypes**. The production phone agent is not yet wired.

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | Static HTML/CSS/JS (no framework) |
| API (local) | Express.js (`server/index.js`) |
| API (Vercel) | Serverless function (`api/leads.js`) |
| Database | Supabase (PostgreSQL) |
| CRM (optional) | Airtable |
| Email | Resend |
| Hosting | Vercel (static + serverless) |

### Request flow (lead capture)

```
Browser form submit
       │
       ▼
POST /api/leads  ──▶  leads-handler.js
       │                    │
       │                    ├── validateLead()
       │                    ├── normalizeLead()
       │                    ├── storeInSupabase() / storeInAirtable()
       │                    ├── sendConfirmationEmail() via Resend
       │                    └── notifyTeam()
       ▼
JSON { ok, stored, emailSent }
```

### Key files

| File | Responsibility |
|------|----------------|
| `script.js` | Form validation, modal UX, API submission |
| `server/leads-handler.js` | Lead validation, storage, email — shared by Express and Vercel |
| `api/leads.js` | Vercel serverless wrapper |
| `supabase/leads.sql` | Lead table schema |
| `demo-player.js` | Demo audio playback with transcript sync |
| `voice/persona.json` | Voice agent persona definition |
| `app/` | Internal dashboard preview (My Day, Morning Brief) — mock data |
| `src/engine/prompt-context-builder.js` | Assembles LLM prompt context from `knowledge/` |
| `src/conversation/` | Conversation orchestrator and brain stubs (not telephony-connected) |
| `src/practice-brain/` | Daily awareness, Morning Brief generation (preview scripts) |
| `knowledge/manifest.json` | Knowledge document catalog for prompt assembly |
| `config/practices/` | Example Office DNA (Layer 3) practice configs |

### Local vs. production

| Environment | Server | Lead storage |
|-------------|--------|--------------|
| Local dev (no `.env`) | Express | Console log only |
| Local dev (configured) | Express | Supabase/Airtable + email |
| Vercel production | Serverless | Supabase/Airtable + email (503 if unconfigured) |

---

## Target Production Architecture

### Service map (target state)

| Service | Responsibility | Tech candidates |
|---------|----------------|-----------------|
| **api-gateway** | Auth, rate limiting, REST/GraphQL for admin | Node.js or Go |
| **telephony-webhook** | Inbound call handling, media streams | Node.js + Twilio/Telnyx SDK |
| **conversation-engine** | State machine, LLM orchestration, tool calls | Python or Node.js |
| **voice-pipeline** | STT/TTS streaming, barge-in, latency optimization | Deepgram + ElevenLabs or similar |
| **pms-connector** | Adapter registry, OAuth, read/write operations | Node.js microservice per PMS |
| **summary-service** | Schema validation, delivery routing | Node.js |
| **notification-service** | Email, SMS, webhook dispatch | Node.js |
| **config-service** | Practice configuration CRUD, versioning | Node.js + PostgreSQL |
| **admin-dashboard** | Practice onboarding, call review, analytics | React/Next.js |
| **worker** | Async jobs: PMS write-back, recording retention, reports | BullMQ / SQS |

### Call lifecycle (target)

```
1. INBOUND          Twilio receives call → webhook to telephony-webhook
2. IDENTIFY         Lookup called number → practice_id + config
3. GREET            Load persona + greeting script from config
4. CLASSIFY         Intent detection: new patient / existing / emergency / other
5. EXECUTE          Run state machine for intent; call tools (PMS lookup, availability)
6. SUMMARIZE        Build typed CallSummary from conversation state
7. DELIVER          Send summary via configured channels
8. WRITE-BACK       Queue PMS operations (appointment request, note, task)
9. RECORD           Store transcript, recording (if enabled), audit log
10. CLOSE           Hangup; emit analytics event
```

---

## Component Deep Dive

### Conversation Engine

The conversation engine is a **finite state machine** driven by practice configuration, not free-form LLM chat.

```
                    ┌─────────────┐
                    │   GREETING  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │NEW_PATIENT│ │EXISTING  │ │EMERGENCY │
        │  INTAKE  │ │ PATIENT  │ │ TRIAGE   │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                   ┌─────────────┐
                   │  SUMMARIZE  │
                   └──────┬──────┘
                          ▼
                   ┌─────────────┐
                   │    CLOSE    │
                   └─────────────┘
```

Each state defines:

- **Required slots** — data fields to collect before transition
- **Prompt template** — LLM system prompt segment for this state
- **Tools available** — PMS lookup, schedule query, etc.
- **Transition rules** — deterministic + LLM-assisted intent classification
- **Validation** — phone format, DOB, insurance carrier against accepted list

The LLM generates natural language; the state machine enforces structure. Never rely on the LLM alone to decide clinical routing.

### PMS Adapter Interface (target)

All PMS integrations implement:

```typescript
interface PmsAdapter {
  // Identity
  readonly pmsType: 'open_dental' | 'dentrix' | 'eaglesoft' | 'carestack';

  // Patient
  findPatient(query: PatientSearchQuery): Promise<Patient[]>;
  createPatient(patient: NewPatientInput): Promise<Patient>;

  // Scheduling
  getAvailability(params: AvailabilityQuery): Promise<TimeSlot[]>;
  createAppointmentRequest(request: AppointmentRequest): Promise<AppointmentRequestResult>;
  getAppointments(patientId: string, range: DateRange): Promise<Appointment[]>;
  cancelAppointment(appointmentId: string, reason: string): Promise<void>;
  rescheduleAppointment(appointmentId: string, newSlot: TimeSlot): Promise<void>;

  // Reference data
  getProviders(): Promise<Provider[]>;
  getOperatories(): Promise<Operatory[]>;
  getAcceptedInsurance(): Promise<InsurancePlan[]>;

  // Write-back
  createCommLog(patientId: string, note: string): Promise<void>;
  createTask(task: TaskInput): Promise<void>;

  // Health
  ping(): Promise<PmsHealthStatus>;
}
```

Each adapter handles authentication, rate limits, and idempotency internally. See [PRACTICE_MANAGEMENT_SOFTWARE.md](PRACTICE_MANAGEMENT_SOFTWARE.md).

### Summary Service

Every completed call produces a `CallSummary` JSON document:

```typescript
interface CallSummary {
  id: string;
  practiceId: string;
  callId: string;
  timestamp: string;          // ISO 8601
  durationSeconds: number;
  intent: CallIntent;
  urgency: 'routine' | 'urgent' | 'emergency';
  caller: {
    name: string;
    phone: string;
    isNewPatient: boolean;
    dateOfBirth?: string;
    email?: string;
  };
  insurance?: {
    carrier: string;
    memberId?: string;
    groupNumber?: string;
  };
  chiefComplaint?: string;
  appointment?: {
    type: string;
    preferredTimes: string[];
    scheduledSlot?: string;
    providerPreference?: string;
  };
  emergency?: {
    symptoms: string[];
    swelling: boolean;
    fever: boolean;
    trauma: boolean;
    routingAction: string;
  };
  actionItems: ActionItem[];
  transcriptUrl?: string;     // secured, time-limited
  recordingUrl?: string;      // secured, time-limited
}
```

Summaries are validated against JSON Schema before delivery. Missing required fields trigger a "needs review" flag.

---

## Data Model

### Phase 0: Leads

```sql
-- supabase/leads.sql
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  practice_name text not null,
  email text not null,
  phone text not null,
  practice_software text not null,
  locations text not null,
  call_volume text not null,
  source text default 'website',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

### Target: Core entities

```
practices
├── id, name, phone_numbers[], timezone, pms_type, pms_credentials_ref
├── subscription_tier, status, onboarded_at
└── config_version

practice_configs
├── practice_id, version, effective_at
├── greeting_script, persona_overrides
├── hours_of_operation (JSON)
├── providers[], appointment_types[]
├── insurance_accepted[]          # Michigan taxonomy: delta_ppo, delta_medicaid, hkd, mi_medicaid, ppo_other
├── medicaid_programs_accepted[]  # HKD, adult Medicaid — practice opt-in
├── emergency_protocol (JSON)
├── summary_delivery (email[], sms[], webhook_url)
└── call_flow_overrides (JSON)

calls
├── id, practice_id, twilio_call_sid
├── started_at, ended_at, duration
├── intent, urgency, outcome
├── recording_s3_key, transcript_s3_key
└── summary_id

call_summaries
├── id, call_id, practice_id
├── summary_json (JSONB)
├── delivery_status, delivered_at
└── pms_writeback_status

audit_logs
├── id, practice_id, actor, action, resource_type, resource_id
├── timestamp, ip_address, metadata (JSONB)
└── (no PHI in metadata — use resource IDs)
```

### Tenant isolation

Every query includes `practice_id` filter. Row-level security in PostgreSQL enforces tenant boundaries. Service accounts are scoped per practice for PMS credentials.

---

## Integration Architecture

### Inbound integrations (FreedomDesk receives)

| Source | Protocol | Purpose |
|--------|----------|---------|
| Twilio/Telnyx | Webhook + Media Streams | Inbound calls |
| PMS webhooks | HTTPS POST | Appointment changes (future) |
| Admin dashboard | REST/GraphQL | Configuration management |

### Outbound integrations (FreedomDesk sends)

| Target | Protocol | Purpose |
|--------|----------|---------|
| Open Dental API | REST | Patient lookup, appointments |
| Dentrix API | REST/Odbc bridge | Patient lookup, appointments |
| Eaglesoft API | REST/SQL bridge | Patient lookup, appointments |
| CareStack API | REST | Patient lookup, appointments |
| Resend | REST | Summary email delivery |
| Twilio SMS | REST | Summary SMS, confirmation texts |
| Practice webhooks | HTTPS POST | Real-time summary push |

Full integration catalog: [INTEGRATIONS.md](INTEGRATIONS.md).

---

## Telephony and Voice Pipeline

### Latency budget

Target end-to-end voice latency (caller speaks → agent responds): **<800ms**.

| Stage | Target |
|-------|--------|
| STT (streaming) | <200ms to first partial |
| LLM inference | <300ms (streaming first token) |
| TTS (streaming) | <200ms to first audio byte |
| Network/overhead | <100ms |

### Barge-in

Callers must be able to interrupt the agent mid-sentence. The voice pipeline cancels TTS playback on VAD (voice activity detection) trigger and processes the new utterance.

### Recording and transcription

| Setting | Default | Notes |
|---------|---------|-------|
| Call recording | On (with consent announcement) | Stored encrypted in S3; retention per practice config |
| Real-time transcription | On | Used for summary generation |
| Recording consent | Configurable script at call start | Required in two-party consent states |

---

## Security and HIPAA

### Authentication and authorization

| Actor | Auth method | Scope |
|-------|-------------|-------|
| Practice admin | Email + MFA | Own practice data |
| FreedomDesk ops | SSO + MFA | Support access with audit (break-glass) |
| Service-to-service | mTLS or signed JWT | Internal microservices |
| PMS connectors | OAuth / API key per practice | PMS operations for that practice only |

### PHI handling rules

1. **Never log PHI** — use `patient_id`, `call_id` in log lines
2. **Encrypt at rest** — S3 SSE-KMS, PostgreSQL TDE or column-level encryption for PHI fields
3. **Encrypt in transit** — TLS everywhere; no PHI over unencrypted WebSocket
4. **Minimum retention** — delete recordings per practice policy; default 90 days
5. **Access audit** — every PHI read logged with actor and timestamp
6. **BAA chain** — Twilio (HIPAA eligible), AWS/GCP (BAA), Supabase (BAA tier), Resend (evaluate)

### Secrets management

- PMS credentials stored in **AWS Secrets Manager** or **HashiCorp Vault**, referenced by ID in `practices.pms_credentials_ref`
- Never in environment variables in production (except secrets manager ARN)
- Rotate on practice request or suspected compromise

### Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Cross-tenant data leak | RLS + practice_id on every query + integration tests |
| PHI in logs | Structured logging with redaction middleware |
| Unauthorized recording access | Signed URLs, 15-minute expiry, auth required |
| Prompt injection via caller | State machine constraints; tool call validation; no arbitrary code execution |
| PMS credential theft | Vault storage, scoped permissions, audit |

---

## Multi-Tenancy

Each dental practice is a **tenant**. Shared infrastructure, isolated data.

| Concern | Approach |
|---------|----------|
| Data isolation | PostgreSQL RLS + application-level practice_id |
| Config isolation | practice_configs table, versioned |
| Telephony | Dedicated phone number(s) per practice, mapped in routing table |
| Voice persona | Default "Aly" + per-practice overrides (Custom tier) |
| PMS credentials | Per-practice vault entry |
| Rate limits | Per-practice call concurrency limits |

---

## Observability

### Metrics (Prometheus/Datadog)

- `calls_total{practice, intent, outcome}`
- `call_duration_seconds{practice, intent}`
- `summary_completeness_ratio{practice}`
- `pms_writeback_success_total{practice, pms_type}`
- `voice_latency_seconds{stage}` — STT, LLM, TTS
- `errors_total{service, error_type}`

### Alerting

| Alert | Condition | Severity |
|-------|-----------|----------|
| Telephony webhook failures | >5 failures in 5 min | P1 |
| PMS adapter down | ping fails 3 consecutive | P2 |
| Summary delivery failure | any failure | P2 |
| High call latency | p95 > 1.5s | P3 |

### Tracing

OpenTelemetry traces across telephony → conversation → PMS → summary. Trace ID linked to `call_id` for support debugging.

---

## Deployment Topology

### Phase 0 (current)

```
Vercel
├── Static files (HTML, CSS, JS, audio)
└── Serverless function: /api/leads
         │
         ├── Supabase (leads table)
         ├── Airtable (optional)
         └── Resend (email)
```

### Target production

```
AWS (or GCP)
├── ECS/Fargate or Kubernetes
│   ├── telephony-webhook (2+ replicas, autoscale on call volume)
│   ├── conversation-engine (2+ replicas)
│   ├── pms-connector (1 per PMS type, autoscale)
│   ├── summary-service
│   └── notification-service
├── RDS PostgreSQL (Multi-AZ)
├── ElastiCache Redis (session state, job queues)
├── S3 (recordings, transcripts)
├── Secrets Manager
└── CloudFront (admin dashboard CDN)

Vercel (marketing site — may remain separate repo or subdomain)
```

---

## Coding Standards

### General

- **Minimize scope** — smallest correct diff; no drive-by refactors
- **Match existing conventions** — read surrounding code before writing
- **No PHI in client-side code** — ever
- **Validate at boundaries** — all external input validated before processing
- **Fail with context** — errors include operation, practice_id (not patient name), and correlation ID

### JavaScript/Node.js (current codebase)

```javascript
// ✅ Validate external input explicitly
function validateLead(body) {
  const errors = {};
  for (const field of REQUIRED_FIELDS) {
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (!value) errors[field] = "This field is required.";
  }
  return errors;
}

// ✅ Normalize before storage
function normalizeLead(body) {
  return {
    email: body.email.trim().toLowerCase(),
    submitted_at: new Date().toISOString(),
  };
}

// ❌ Never swallow errors silently in production paths
try {
  await storeInSupabase(lead);
} catch (e) {}  // BAD

// ✅ Log without PHI, rethrow or return structured error
try {
  await storeInSupabase(lead);
} catch (err) {
  console.error("Lead storage failed:", { error: err.message, leadId: lead.id });
  throw err;
}
```

### File organization (target)

```
src/
├── adapters/
│   ├── pms/
│   │   ├── interface.ts
│   │   ├── open-dental.ts
│   │   ├── dentrix.ts
│   │   ├── eaglesoft.ts
│   │   └── carestack.ts
│   └── telephony/
│       └── twilio.ts
├── engine/
│   ├── state-machine.ts
│   ├── intents.ts
│   └── tools.ts
├── services/
│   ├── summary.ts
│   └── notification.ts
├── models/
│   └── schemas/          # JSON Schema for CallSummary, PracticeConfig
└── api/
    ├── webhooks/
    └── admin/
```

### Testing requirements

| Layer | Requirement |
|-------|-------------|
| Unit | All validation, normalization, schema validation |
| Integration | PMS adapters against sandbox APIs |
| E2E | Full call simulation with mock telephony |
| Compliance | No PHI in test fixtures; use synthetic data |

### Git and PR conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- PR description includes: what, why, test plan
- No force push to main
- Security-sensitive changes require explicit review

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Phase 0 hosting | Vercel | Fast deploy, serverless API, CDN for audio |
| Phase 0 database | Supabase | Managed PostgreSQL, quick setup, BAA available |
| Phase 0 email | Resend | Developer-friendly, good deliverability |
| Target telephony | Twilio (primary) | HIPAA-eligible, media streams, market standard in healthcare |
| Target STT | Deepgram | Low latency streaming, medical vocabulary |
| Target TTS | ElevenLabs or PlayHT | Natural voice quality for Aly persona |
| Target LLM | GPT-4o / Claude (evaluated per latency) | Tool calling, instruction following |
| Target queue | BullMQ + Redis | Reliable async PMS write-back |
| Static site framework | None (Phase 0) | Simplicity; migrate to Next.js if marketing site grows |

---

## Related Documents

- [FREEDOMDESK_CONTEXT.md](FREEDOMDESK_CONTEXT.md) — product context
- [PRACTICE_MANAGEMENT_SOFTWARE.md](PRACTICE_MANAGEMENT_SOFTWARE.md) — PMS adapter details
- [CALL_FLOWS.md](CALL_FLOWS.md) — conversation design
- [INTEGRATIONS.md](INTEGRATIONS.md) — third-party services
- [ROADMAP.md](ROADMAP.md) — implementation phases
