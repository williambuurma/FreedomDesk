# FreedomDesk Architecture Map

> **Purpose:** Single source of truth for **how FreedomDesk works** — the mental model a senior engineer needs in 30 minutes.  
> **Authority:** Runtime behavior and layer boundaries defined here. Moral law lives in [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md). Deep specs defer to the documents listed in [Related documents](#related-documents).  
> **Not this document:** Telephony implementation, deployment, HIPAA controls, or feature backlog — see [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`ROADMAP.md`](ROADMAP.md).

**Status (July 2026):** Phase 0 shipped (marketing + dashboard preview). Intelligence layer is stubbed. Telephony is not started. This map describes the **target architecture** and marks what exists today.

---

## 30-minute read path

1. This document — whole-system map (you are here)
2. [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) § Decision Hierarchy — non-negotiable precedence
3. [`V1_FOUNDATION.md`](V1_FOUNDATION.md) — what V1 means and what is deferred
4. [`src/README.md`](../src/README.md) — where intelligence code lives today

Everything else is depth on a single layer.

---

## The whole system

FreedomDesk is **operating intelligence** beside the PMS (system of record). One vertical stack runs from philosophy to the team's workday. Four ideas repeat everywhere: **truth before fluency**, **Office DNA governs this practice**, **reason before speaking**, **filter before informing**.

```
FreedomDesk Philosophy          ← moral law + product filter (not code)
        ↓
Office DNA                      ← this practice's configured truth (L3 knowledge)
        ↓
Incoming Call                   ← patient boundary (channel today: phone)
        ↓
Conversation Engine             ← turn loop, state, orchestration, voice
        ↓
Reasoning Pipeline              ← structured judgment before any patient-facing words
    • Understanding
    • Psychology
    • Business Logic
    • Safety / Triage
    • Knowledge (declarative inputs — not a brain)
        ↓
Conversation Summary            ← structured call artifact (PMS-ready)
        ↓
Practice Intelligence           ← daily cross-call awareness + recommendations
        ↓
Morning Brief                   ← practice-wide digest (manager / huddle)
        ↓
My Day                          ← personal workspace ("what next?")
        ↓
End of Day                      ← personal + practice close (carry-forward)
```

**Side boundary:** PMS (Open Dental, etc.) — chart, schedule, ledger. FreedomDesk reads/writes through adapters; never becomes system of record.

---

## Reduced mental model: four runtime systems

The stack above is the **story**. Implementation collapses to **four runtime systems** plus governance:

| # | System | One sentence | Primary code / config |
|---|--------|--------------|------------------------|
| **G** | **Governance** | What we owe callers and teams; overrides everything | `docs/FREEDOMDESK_CONSTITUTION.md`, `docs/FREEDOMDESK_PRINCIPLES.md` |
| **1** | **Knowledge** | Declarative dental + regional + office truth | `knowledge/`, `config/practices/`, `src/engine/knowledge-store.js`, `src/engine/prompt-context-builder.js` |
| **2** | **Call intelligence** | Per-interaction reason → speak → summarize | `src/conversation/`, `voice/persona.json` |
| **3** | **Practice intelligence** | Observe signals → recommend → brief the practice | `src/practice-brain/` |
| **4** | **Workday surfaces** | Filtered intelligence for people | `app/modules/my-day/`, `app/modules/morning-brief/`, preview JSON in `data/` |

Telephony, PMS adapters, auth, and admin UI are **infrastructure** around system 2 — specified in [`ARCHITECTURE.md`](ARCHITECTURE.md), not duplicated here.

---

## Layer reference

For each layer: **Purpose · Inputs · Outputs · Owner · Never belongs here**

---

### FreedomDesk Philosophy

| | |
|---|---|
| **Purpose** | Moral and product law — safety, truth, clinical boundaries, team experience principles. Answers *what FreedomDesk must never become*. |
| **Inputs** | None at runtime. Human-authored founding documents. |
| **Outputs** | Decision precedence for every other layer (safety → truth → compassion → workflow → efficiency). |
| **Owner** | Founding docs — [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md), [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md), [`V1_FOUNDATION.md`](V1_FOUNDATION.md) |
| **Never belongs here** | API routes, prompt text, appointment types, UI components, telephony config, SQL schemas |

---

### Office DNA

| | |
|---|---|
| **Purpose** | **This practice's** operating profile — hours, providers, insurance accepted, emergency protocol, appointment types, booking mode, callback SLAs, culture notes. Layer 3 (L3) of the Knowledge stack. |
| **Inputs** | Onboarding questionnaire, admin config (future), validated team feedback (future, human-reviewed). |
| **Outputs** | Resolved practice snapshot consumed by reasoning and practice intelligence — `ResolvedKnowledgeSnapshot` / practice config JSON. |
| **Owner** | [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) · example: [`config/practices/`](../config/practices/) |
| **Never belongs here** | Universal dental facts (L1), West Michigan regional defaults (L2), per-turn reasoning logic, LLM prompts that *decide* urgency, PMS chart data, patient PHI storage as authoritative record |

**Merge rule:** L1 (locked safety) → L2 (regional) → L3 (Office DNA). L1 cannot be overridden by office config or model output.

---

### Incoming Call

| | |
|---|---|
| **Purpose** | Patient **boundary** — the moment a person reaches the practice through a channel. Today: inbound phone. Future: messaging, web intake. Delivers normalized utterances + call metadata into the Conversation Engine. |
| **Inputs** | PSTN/media stream, called number → `practiceId`, consent/recording policy, business-hours flag. |
| **Outputs** | Normalized text utterances, ASR confidence, call/session IDs, phase (greeting, active, closing). **No reasoning yet.** |
| **Owner** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § Telephony (target) · [`ROADMAP.md`](ROADMAP.md) Phase 1 |
| **Never belongs here** | Intent classification, triage rules, summary JSON, Morning Brief logic, lead capture, marketing forms |

**Today:** Not implemented. Demo audio (`audio/`, `demo-player.js`) simulates calls for marketing only.

---

### Conversation Engine

| | |
|---|---|
| **Purpose** | Owns the **call session** — turn loop, conversation state, orchestrator, articulation gate, continuous summary updates. The only component that may produce patient-facing language. |
| **Inputs** | Normalized utterance, `ConversationState`, Knowledge snapshot (L1/L2/L3), optional PMS context (future), Aly persona. |
| **Outputs** | Updated state, `ConversationAnalysis` / `EngineDecision`, spoken response (via LLM+TTS), summary deltas. |
| **Owner** | [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) · [`src/conversation/engine.ts`](../src/conversation/engine.ts), [`state.ts`](../src/conversation/state.ts), [`summary.ts`](../src/conversation/summary.ts) |
| **Never belongs here** | Domain facts as hard-coded strings, daily brief generation, PMS write-back, practice-wide analytics, lead storage, telephony webhook handling |

**Seven-step loop (every turn):** Perceive → Understand → Remember → Assess → Reconcile → Decide → Articulate.

**Invariant:** No patient-facing text without a preceding `EngineDecision`.

---

### Reasoning Pipeline

The Conversation Engine invokes this pipeline **before** language generation. Five parallel assessments merge in the orchestrator. **Knowledge** is not a brain — it is declarative input all brains read.

```
                    ┌─────────────────┐
  Utterance + state │  Understanding  │  What was said; what they likely mean
                    └────────┬────────┘
                             │
     Knowledge snapshot ─────┼──────────────────────────────┐
                             │                              │
         ┌───────────────────┼───────────────────┐          │
         ▼                   ▼                   ▼          │
  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
  │ Psychology  │    │ Safety /    │    │  Business   │     │
  │             │    │  Triage     │    │  Logic      │     │
  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
         │                  │                  │            │
         └──────────────────┼──────────────────┘            │
                            ▼                               │
                   ┌─────────────────┐                      │
                   │  Orchestrator   │◀─────────────────────┘
                   │  (engine.ts)    │   Knowledge: facts, atoms,
                   └────────┬────────┘   playbooks, Office DNA
                            ▼
                   EngineDecision + constraints
```

#### Understanding

| | |
|---|---|
| **Purpose** | Extract facts and intent signals from messy human speech — names, symptoms, carrier names, preferences, indirect requests. |
| **Inputs** | Utterance, conversation state, knowledge aliases. |
| **Outputs** | `PatientUnderstanding` — entities, intent signals, per-field confidence. |
| **Owner** | Brain Architecture §8 · [`src/conversation/understanding.ts`](../src/conversation/understanding.ts) |
| **Never belongs here** | Final urgency level, empathy phrasing, goal selection, coverage promises, diagnosis |

#### Psychology

| | |
|---|---|
| **Purpose** | Caller emotional state and interaction discipline — order of questions, tone, pacing. Shapes *how* to ask, not *what is clinically true*. |
| **Inputs** | Understanding output, state emotional arc, L2/L3 communication playbooks. |
| **Outputs** | `EmotionAssessment` — primary emotion, intensity, `deferAdminQuestions`, tone recommendations. |
| **Owner** | [`EMOTIONAL_INTELLIGENCE_ENGINE.md`](EMOTIONAL_INTELLIGENCE_ENGINE.md) · [`src/conversation/psychology.ts`](../src/conversation/psychology.ts) |
| **Never belongs here** | Clinical urgency decisions (may inform, never override triage), scripted phrase libraries as product surface, surveillance of staff |

#### Business Logic

| | |
|---|---|
| **Purpose** | **Operational fit** — what the office needs to complete the call: required fields, appointment type, insurance program taxonomy, hours/booking mode, production flags. Maps spec "Front Desk Brain" + "Business/Practice Brain". |
| **Inputs** | State, understanding, Office DNA scheduling/insurance rules, optional PMS read (future). |
| **Outputs** | Missing-field queue (ordered), `appointmentType`, insurance program classification, transfer triggers, booking-mode constraints. |
| **Owner** | Brain Architecture §8, §11–12 · [`CALL_FLOWS.md`](CALL_FLOWS.md) · partially `engine.ts` (Front Desk stub) |
| **Never belongs here** | Diagnosis, fee quotes, benefit promises, confirmed appointments without PMS validation, daily opportunity detection |

#### Safety / Triage

| | |
|---|---|
| **Purpose** | **Highest-precedence** clinical boundary reasoning — red flags, urgency ladder, escalation path, ER/911 guidance. Deterministic L1 rule floor + triage brain. |
| **Inputs** | Symptoms, L1 red-flag atoms, L3 emergency policy, caller minimization signals. |
| **Outputs** | `UrgencyAssessment`, matched atom IDs, escalation type, `urgencyFloor` constraint on language. |
| **Owner** | Constitution § Clinical · Brain Architecture §13–14 · [`src/conversation/triage.ts`](../src/conversation/triage.ts) |
| **Never belongs here** | Disease naming, treatment advice, medication dosing, lowering urgency to please caller or shorten call |

#### Knowledge (declarative inputs)

| | |
|---|---|
| **Purpose** | **What is true** — universal dental safety (L1), West Michigan regional (L2), office profile (L3). Brains consume; they do not author domain truth. |
| **Inputs** | Authored markdown/JSON, manifest, practice config, version pins. |
| **Outputs** | `ResolvedKnowledgeSnapshot`, prompt slices, atom IDs for provenance. |
| **Owner** | [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) · [`knowledge/`](../knowledge/) · [`src/engine/knowledge-store.js`](../src/engine/knowledge-store.js) |
| **Never belongs here** | Per-turn goal selection, LLM-as-source-of-truth, patient-specific PHI as knowledge atoms, reasoning orchestration |

**Orchestrator precedence (conflicts):** Life-threatening emergency → urgent clinical → acute distress acknowledgment → critical missing fields → scheduling/completion → secondary topics → efficiency.

**Engineering invariants:** Brains do not call each other. Brains do not fetch knowledge — orchestrator loads snapshot once per turn. State is dumb data. L1 rule floor cannot be lowered by LLM.

---

### Conversation Summary

| | |
|---|---|
| **Purpose** | **Operational truth** from the call — structured, paste-ready, specific appointment types and insurance programs. The handoff artifact to the front desk and Practice Intelligence. |
| **Inputs** | Final `ConversationState`, `ConversationAnalysis`, intent schema from CALL_FLOWS. |
| **Outputs** | `CallSummary` JSON, delivery payloads (email/SMS/webhook — future), `CallSummarySignal` for practice brain ingest. |
| **Owner** | [`CALL_FLOWS.md`](CALL_FLOWS.md) § Summary Schemas · [`src/conversation/summary.ts`](../src/conversation/summary.ts) |
| **Never belongs here** | Narrative transcripts as the primary deliverable, PMS chart notes authored without schema validation, analytics rollups, Morning Brief prose |

**Rule:** If the coordinator must re-type fields or replay the recording, the summary failed.

---

### Practice Intelligence

| | |
|---|---|
| **Purpose** | **Cross-call, cross-signal** awareness for *this practice* — observe calls, schedule/PMS signals (future), detect opportunities, generate recommendations, maintain operational memory. The "Chief of Staff" loop. |
| **Inputs** | Call summaries, PMS reads (future), metrics, prior operational memory, Office DNA snapshot. |
| **Outputs** | Recommendations, opportunities, `DailyAwarenessState`, inputs to Morning Brief / My Day / End of Day. |
| **Owner** | [`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md) § Practice Intelligence · [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) · [`src/practice-brain/`](../src/practice-brain/) |
| **Never belongs here** | Per-turn phone reasoning, live LLM chat with staff, autonomous schedule changes, replacing PMS analytics warehouse, patient diagnosis |

**Loop:** Observe → Understand → Recommend → (human accepts) → Measure → Remember → Refine.

**Naming:** **Practice Brain** (`src/practice-brain/`) is the implementation name for this system. **Business Brain** in the five-brains model is **only** per-call scheduling/hours logic inside the Reasoning Pipeline — not the same thing.

**Today:** Preview scripts + mock data only (`npm run preview:morning-brief`).

---

### Morning Brief

| | |
|---|---|
| **Purpose** | **Practice-wide** operational digest before the first patient — aligned priorities, not a personal task list. Manager / huddle consumption. Superset of signals, role-filterable. |
| **Inputs** | Practice Intelligence output, person responsibilities (filter), Office DNA context. |
| **Outputs** | Briefing document / UI — prioritized items, opportunities, schedule risks, carry-forward from prior close. |
| **Owner** | Operating Model §12 · POS §12 · [`src/practice-brain/morningBrief.ts`](../src/practice-brain/morningBrief.ts) · [`app/modules/morning-brief/`](../app/modules/morning-brief/) |
| **Never belongs here** | Raw call transcripts, widget walls, enterprise analytics, per-person "My Day" tasks, clinical treatment planning |

**Terminology:** "Morning Huddle" is the **team ritual**; **Morning Brief** is the **product surface** that powers it ([`FREEDOMDESK_INTELLIGENCE.md`](FREEDOMDESK_INTELLIGENCE.md) §9).

---

### My Day

| | |
|---|---|
| **Purpose** | **One person's** workspace — "What should I do next?" Filtered by responsibilities, not job-title dashboards. |
| **Inputs** | Practice Intelligence recommendations/tasks, PMS-linked work (future), call-derived action items, Morning Brief subset filtered to this person. |
| **Outputs** | Ordered task list, context panels, coordination notes — calm and actionable. |
| **Owner** | Operating Model §11 · UX Philosophy · [`app/modules/my-day/`](../app/modules/my-day/) · [`data/my-day-preview.json`](../data/my-day-preview.json) |
| **Never belongs here** | Practice-wide KPI walls, surveillance metrics, generic AI chat, duplicate PMS schedule UI, unfiltered signal firehose |

**Person model:** One human, one workspace. **Responsibilities** (Receptionist, Assistant, …) filter intelligence — they are not separate apps.

---

### End of Day

| | |
|---|---|
| **Purpose** | **Confidence loop** at close — personal reassurance or honest carry-forward; practice-wide open-item stewardship. Not punishment or surveillance. |
| **Inputs** | My Day completion state, open recommendations, unresolved call follow-ups, schedule vs. plan (future). |
| **Outputs** | Personal close summary, items queued for tomorrow's Morning Brief, optional manager digest. |
| **Owner** | Operating Model §13 · Intelligence doc §10 · POS §28 · **not yet implemented in code** |
| **Never belongs here** | Employee performance scoring, guilt language, raw dumps of everything that happened, autonomous next-day scheduling |

---

## End-to-end flows

### Call flow (system 2)

```
Patient calls
  → Incoming Call normalizes utterance
  → Conversation Engine loads Knowledge snapshot (incl. Office DNA)
  → Reasoning Pipeline → EngineDecision
  → Language (LLM + Aly persona), constrained by decision
  → Conversation Summary on close
  → Practice Intelligence ingests summary signal
```

### Workday flow (systems 3 + 4)

```
Overnight / early: Practice Intelligence runs daily awareness
  → Morning Brief (practice-wide)
  → My Day (per person, filtered)
During day: new summaries + PMS signals update awareness (future: live)
  → End of Day close → carry-forward queue
  → feeds next Morning Brief
```

---

## Duplicate and overlapping concepts (resolved)

Use this table when reading older docs or code. **Architecture Map names win** for runtime mental model.

| Overlap | Resolution |
|---------|------------|
| **Five Brains vs Reasoning Pipeline** | Same layer. Map: Understanding, Psychology, Clinical/Triage → **Safety/Triage**, Front Desk + Business → **Business Logic**, Knowledge Engine → **Knowledge** (input). Orchestrator stays in Conversation Engine. |
| **Practice Brain vs Business Brain** | **Practice Brain** = daily practice intelligence (`src/practice-brain/`). **Business Brain** = per-call hours/scheduling brain inside Reasoning Pipeline only. |
| **`practice-brain/practiceMemory.ts` vs `src/practice-memory/`** | **Operational memory** (tasks, opportunities, daily rhythm) vs **patient-centric institutional memory** (preferences, unresolved issues — future CLE). Do not merge. |
| **FREEDOMDESK_INTELLIGENCE vs PRACTICE_OPERATING_SYSTEM vs Operating Model** | **Intelligence** = decade product vision. **POS** = operational loops and role success. **Operating Model** = glossary + ownership boundaries + daily surfaces. Runtime path: this map. |
| **ARCHITECTURE.md FSM vs Brain Architecture loop** | **Brain Architecture** owns call reasoning. ARCHITECTURE.md state-machine diagram is a simplified Phase 1 view; reasoning loop is authoritative. |
| **Morning Brief vs Morning Huddle** | **Morning Brief** = surface/artifact. **Morning Huddle** = team meeting ritual that consumes it. |
| **Knowledge Engine spec vs `knowledge/` + prompt-context-builder** | Spec = target atom/resolver model. **`knowledge/` tree + `prompt-context-builder.js`** = Phase M1 implementation. Same system, different maturity. |
| **`engine/intents.js` vs CALL_FLOWS full enum** | Registry is Phase 1 wired subset ([`INTENT_REGISTRY.md`](INTENT_REGISTRY.md)); CALL_FLOWS is full vocabulary. |
| **Conversation summary vs comm log** | Summary = FreedomDesk artifact. Comm log = PMS record written by staff or adapter (future write-back). |
| **Reflection Engine vs Practice Intelligence** | **Reflection** (`src/reflection-engine/`) = post-interaction learning *candidates* (future CLE). **Practice Intelligence** = operational awareness and recommendations. Reflection never writes memory directly — human review gate. |

---

## Repository map (architecture-aligned)

| Path | Layer / system |
|------|----------------|
| `docs/FREEDOMDESK_CONSTITUTION.md`, `FREEDOMDESK_PRINCIPLES.md`, `V1_FOUNDATION.md` | Philosophy |
| `config/practices/`, `knowledge/`, `src/engine/` | Knowledge + Office DNA (M1) |
| `voice/persona.json` | Conversation Engine — presentation (Aly) |
| `src/conversation/` | Conversation Engine + Reasoning Pipeline |
| `src/practice-brain/` | Practice Intelligence |
| `src/practice-memory/` | Future patient memory (CLE) — **not** on main daily path yet |
| `src/reflection-engine/` | Future learning extraction — **not** on main daily path yet |
| `app/modules/my-day/`, `app/modules/morning-brief/` | Workday surfaces (preview) |
| `data/*-preview.json` | Mock surface data |
| `docs/CALL_FLOWS.md`, `docs/DENTAL_WORKFLOWS.md` | Domain contracts for Business Logic + summaries |
| `docs/ARCHITECTURE.md` | Telephony, deployment, security, PMS adapters |

---

## Out of architecture (does not fit the stack)

These exist in the repo but are **not part of the FreedomDesk product architecture** above. Do not route new intelligence work through them without explicit intent.

| Location | Why it is outside |
|----------|-------------------|
| `index.html`, `styles.css`, `script.js`, `assets/` | Marketing site — GTM |
| `server/`, `api/leads.js`, `supabase/leads.sql` | Lead capture funnel — sales, not patient intelligence |
| `demo-player.js`, `audio/`, `scripts/generate_demo_audio.py` | Demo/marketing assets |
| `app/modules/calls/`, `patients/`, `opportunities/`, `analytics/` | V1-excluded dashboard placeholders — not registered in `app/index.html` |
| `app/shared/context-engine.js` | UI mock helper for coordination panel — not server intelligence |
| `morning-brief.html` (root) | Legacy/standalone preview duplicate of `app/` module |
| `docs/FEATURE_BACKLOG.md`, `IDEA_VAULT.md`, `SPRINT_3_COORDINATION.md` | Planning and time-bound coordination — not runtime architecture |
| `docs/INTEGRATIONS.md` | Empty placeholder |
| `VISION.md` (root) | Empty placeholder — vision lives in Constitution chain |
| `vercel.json`, `DEPLOY.md` | Hosting — infrastructure |

---

## Implementation status snapshot

| Layer | Status |
|-------|--------|
| Philosophy | ✅ Documented |
| Office DNA | 🟡 Example config + spec; no admin UI |
| Incoming Call | ❌ Not started |
| Conversation Engine | 🟡 Orchestrator stub; psychology partial; other brains stub |
| Reasoning Pipeline | 🟡 Same as above |
| Conversation Summary | 🟡 Stub |
| Practice Intelligence | 🟡 Preview scripts, mock data |
| Morning Brief | 🟡 Dashboard preview |
| My Day | 🟡 Dashboard preview |
| End of Day | ❌ Spec only |

---

## Related documents

Read these for depth on a single layer — **do not duplicate** their authority here.

| Layer | Deep spec |
|-------|-----------|
| Philosophy | [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md), [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md), [`V1_FOUNDATION.md`](V1_FOUNDATION.md) |
| Office DNA | [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) |
| Knowledge | [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) |
| Conversation + reasoning | [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md), [`EMOTIONAL_INTELLIGENCE_ENGINE.md`](EMOTIONAL_INTELLIGENCE_ENGINE.md) |
| Calls + summaries | [`CALL_FLOWS.md`](CALL_FLOWS.md), [`INTENT_REGISTRY.md`](INTENT_REGISTRY.md) |
| Practice intelligence | [`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md), [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md), [`CONTINUOUS_LEARNING_ENGINE.md`](CONTINUOUS_LEARNING_ENGINE.md) |
| Workday UX | [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md) |
| Engineering / telephony | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`ROADMAP.md`](ROADMAP.md) |
| Doc index | [`README.md`](README.md) |

---

## Authority chain (conflicts)

```
FREEDOMDESK_CONSTITUTION.md
  → ARCHITECTURE_MAP.md (this document — whole-system shape)
    → Layer owner docs (Brain Architecture, Operating Model, Knowledge Engine, …)
      → ARCHITECTURE.md (engineering implementation)
        → Code
```

When **moral law** conflicts with convenience, Constitution wins. When **layer boundaries** conflict, this map wins. When **reasoning behavior** conflicts, Brain Architecture wins. When **deployment** conflicts, ARCHITECTURE.md wins.

---

*FreedomDesk succeeds when the stack is invisible: callers hear a prepared teammate; the front desk gets paste-ready summaries; the team opens My Day and already knows what matters.*
