# FreedomDesk Brain Architecture

> **Purpose:** Define how FreedomDesk reasons about patient calls. This is the canonical reference for building conversation intelligence — not a keyword matcher, but a careful dental team member. Read after `docs/FREEDOMDESK_CONTEXT.md` and before modifying anything under `src/conversation/`.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [The Five Brains](#2-the-five-brains)
3. [Conversation Loop](#3-conversation-loop)
4. [File Responsibilities](#4-file-responsibilities)
5. [Near-Term Implementation Plan](#5-near-term-implementation-plan)
6. [Design Rule](#6-design-rule)

---

## 1. Core Philosophy

FreedomDesk is **not** an AI receptionist that pattern-matches phrases and reads scripts. It should behave like an **intelligent dental team member** — the kind of front desk coordinator a good GP practice trusts on a busy Monday morning.

### Understand the patient, not just match keywords

Callers rarely speak in clean intents. They say "my tooth broke last night and I'm not sure if I need to come in or if it's just cosmetic." A keyword system hears "broke" and fires a template. A reasoning system hears:

- A structural dental concern (broken tooth)
- Uncertainty about urgency (cosmetic vs. functional)
- Likely anxiety or embarrassment about appearance
- A scheduling need that depends on symptoms not yet collected

Every message should be interpreted in **context of the full call** — prior turns, what's already collected, and what the practice still needs.

### Reason like a careful front desk team member with dentist-level awareness

The front desk team member FreedomDesk emulates:

- Knows when swelling + fever changes the conversation
- Knows Delta Dental PPO and Delta Dental Medicaid are different programs
- Knows a crown seat is not a "new patient exam"
- Knows when to reassure before asking for insurance
- Knows when to stop collecting and escalate

That awareness comes from **dental workflow knowledge** (`docs/DENTAL_WORKFLOWS.md`, `docs/CALL_FLOWS.md`) applied at reasoning time — not bolted on as post-hoc rules.

### Help the patient while protecting the practice

These goals are not in conflict. Good front desk work does both:

| Help the patient | Protect the practice |
|------------------|----------------------|
| Acknowledge pain and fear | Never diagnose or promise treatment outcomes |
| Collect complete intake on the phone | Never promise coverage, fees, or benefits |
| Route emergencies correctly | Flag red flags for clinical review |
| Reduce repeat calls with clear next steps | Produce summaries the team can act on without re-typing |

FreedomDesk **supports** the front desk. It does not replace clinical judgment, scheduling authority, or the dentist's treatment decisions.

---

## 2. The Five Brains

FreedomDesk reasoning is split into five specialized modules ("brains"). Each brain answers one class of question. They run on every patient message and feed a single orchestrator (`engine.ts`).

```
                    ┌─────────────────────┐
   Patient message  │   Understanding     │  What did they say? What do they likely mean?
        ──────────▶ │       Brain         │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Psychology    │  │ Clinical/Triage │  │   Front Desk    │
│     Brain       │  │     Brain       │  │     Brain       │
│ How do they     │  │ How urgent?     │  │ What's missing  │
│ feel?           │  │ Red flags?      │  │ for scheduling? │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │ Business/       │  Production fit, retention, doctor awareness
                    │ Practice Brain  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │  engine.ts      │  Choose goal + next question
                    │  (Orchestrator) │
                    └─────────────────┘
```

### Understanding Brain

**Question:** What did the patient literally say, and what do they likely mean?

**Owns:**

- Literal extraction: names, phone, symptoms mentioned, insurance carrier names, appointment preferences
- Semantic interpretation: "I've been putting this off" → delayed care, possible anxiety; "is this covered?" → insurance question, not treatment question
- Intent signals: new vs. existing patient, wants appointment, wants transfer, has a question
- Confidence in extractions (explicit vs. inferred)

**Does not own:**

- Urgency classification (Clinical/Triage Brain)
- Emotional tone beyond surface lexical cues (Psychology Brain)
- What to ask next (engine.ts)
- Staff-facing summary formatting (summary.ts)

**Current file:** `src/conversation/understanding.ts`

### Psychology Brain

**Question:** What is the patient's emotional state, and how should that shape the response?

**Owns:**

- Emotion detection: calm, anxious, frustrated, confused, pain-driven, embarrassed
- Fear and dental anxiety signals
- Frustration from prior bad experiences, hold times, billing disputes
- Embarrassment about condition, neglect, or finances
- Recommended **tone adjustment**: reassure first, slow down, validate, don't rush to admin questions

**Does not own:**

- Clinical urgency (Clinical/Triage Brain)
- Factual extraction of symptoms (Understanding Brain)
- Final goal selection (engine.ts — but engine weighs psychology heavily)

**Current file:** `src/conversation/psychology.ts` *(stub — not yet implemented)*

### Clinical/Triage Brain

**Question:** How urgent is this, and are there red flags?

**Owns:**

- Urgency levels: `routine` → `soon` → `urgent_today` → `doctor_callback` → `emergency`
- Red flag detection: swelling, fever, uncontrolled bleeding, difficulty breathing/swallowing, trauma, spreading infection signs
- Dental concern classification: pain, broken tooth, abscess suspicion, post-op complication, etc.
- Escalation routing: same-day squeeze-in, on-call callback, ER/911 directive for life-threatening symptoms
- **Never** diagnoses; triages symptoms and routes per office protocol

**Does not own:**

- Empathetic phrasing (Psychology Brain)
- Insurance or scheduling admin (Front Desk Brain)
- Promising treatment outcomes

**Current file:** `src/conversation/triage.ts` *(stub — not yet implemented)*

**Note:** `understanding.ts` currently sets `urgency` via keywords. That logic should **migrate** to `triage.ts` over time. Understanding extracts facts; triage interprets clinical urgency from those facts.

### Front Desk Brain

**Question:** What does the office need to schedule, route, or complete this call?

**Owns:**

- Required fields per intent (see `docs/CALL_FLOWS.md`): name, phone, DOB, insurance taxonomy, chief complaint, appointment preference
- Missing-field detection and prioritization (ask the highest-value missing field next)
- Insurance intake: classify to Michigan program level (Delta PPO vs. Delta Medicaid vs. HKD vs. adult Medicaid vs. other PPO vs. cash-pay)
- Transfer triggers: billing disputes, clinical questions beyond triage, patient insists on staff
- Scheduling goal: new patient exam, emergency visit, hygiene, crown seat, etc.

**Does not own:**

- Emotional reassurance logic (Psychology Brain — though Front Desk Brain may defer admin questions when psychology says so)
- Clinical red-flag rules (Clinical/Triage Brain)
- Revenue/production optimization (Business/Practice Brain)

**Current file:** Partially in `engine.ts` today via `missingFields` checks. Will gain explicit helpers as `engine.ts` matures.

### Business/Practice Brain

**Question:** How does this call affect the practice operationally?

**Owns:**

- Production opportunity awareness: unscheduled treatment mentions, incomplete treatment plans, recall overdue
- Schedule efficiency: right appointment type and duration, avoid booking emergency into hygiene slot
- Patient retention signals: threatening to leave, comparing offices, long wait frustration
- Doctor awareness flags: complex case, high-anxiety patient, VIP, staff should brief doctor before visit
- After-hours and peak-hour routing preferences (from practice config)

**Does not own:**

- Patient-facing language (other brains inform tone; engine decides)
- Clinical safety decisions (Clinical/Triage Brain always wins)
- Replacing front desk scheduling authority — flags and suggests, does not auto-book without PMS validation

**Current file:** Not yet implemented. Will live as helpers consumed by `engine.ts`, likely drawing from `config/practices/` and `src/engine/prompt-context-builder.js`.

---

## 3. Conversation Loop

Every inbound patient message runs through this loop. The orchestrator (`engine.ts`) drives the sequence; individual brains supply structured outputs.

```
┌──────────────────────────────────────────────────────────────────┐
│                     INBOUND PATIENT MESSAGE                       │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
                    1. UNDERSTAND
                    Extract facts + interpret meaning
                    (Understanding Brain → understanding.ts)
                                ▼
                    2. INTERPRET
                    Merge with ConversationState; resolve conflicts
                    (engine.ts + state.ts)
                                ▼
                    3. ASSESS EMOTION
                    Detect fear, pain, frustration, embarrassment
                    (Psychology Brain → psychology.ts)
                                ▼
                    4. ASSESS URGENCY
                    Red flags, triage level, escalation path
                    (Clinical/Triage Brain → triage.ts)
                                ▼
                    5. IDENTIFY MISSING INFORMATION
                    Required fields for this intent; priority order
                    (Front Desk Brain + state.ts)
                                ▼
                    6. CHOOSE BEST NEXT QUESTION
                    Goal + one focused question or action
                    (engine.ts — weighs all brains)
                                ▼
                    7. SUMMARIZE FOR STAFF
                    Structured output for comm log / handoff
                    (summary.ts — continuous + end-of-call)
                                ▼
                    ┌─────────────────────────┐
                    │  Response to patient    │
                    │  + updated state        │
                    └─────────────────────────┘
```

### Step details

| Step | Input | Output |
|------|-------|--------|
| **Understand** | Raw transcript turn | `PatientUnderstanding` — extracted facts and signals |
| **Interpret** | Understanding + prior `ConversationState` | Updated state; resolved conflicts (e.g., urgency only rises, never falls silently) |
| **Assess emotion** | Message + state | `Emotion` + tone recommendation |
| **Assess urgency** | Symptoms + state | `Urgency` + escalation flags |
| **Identify missing info** | Intent + state + practice config | Ordered `missingFields` list |
| **Choose next question** | All brain outputs | `EngineDecision`: goal, reason, suggested question |
| **Summarize for staff** | Final or interim state | Structured summary per `docs/CALL_FLOWS.md` |

### Goal priority (engine.ts)

When brains disagree, `engine.ts` applies this precedence:

1. **Life-threatening emergency** → escalate immediately (ER/911 language per protocol)
2. **Urgent clinical** → triage and route before admin collection
3. **Acute emotional distress** → brief reassurance before continuing
4. **Missing critical fields** → gather information
5. **Scheduling / completion** → book request, confirm next steps, or transfer

---

## 4. File Responsibilities

### `src/conversation/state.ts`

**Owns:**

- Shared types: `PatientType`, `Emotion`, `Urgency`
- `ConversationState` — the single in-memory model of what the AI knows about this call
- `completedFields` and `missingFields` tracking
- State initialization and merge helpers (as added)

**Does not own:**

- Reasoning logic (any brain)
- Goal selection (engine.ts)
- Persistence, call IDs, or PHI logging

**Rule:** State is **dumb data**. Brains read and write through typed fields; they do not embed business logic in the state file.

---

### `src/conversation/understanding.ts`

**Owns:**

- `PatientUnderstanding` interface — per-turn extraction result
- `understandPatientMessage(message)` — literal + light semantic interpretation
- Mapping spoken insurance names to taxonomy hints (not final classification)

**Does not own:**

- `Emotion` or `Urgency` final values (today it sets some — **migrate to psychology.ts and triage.ts**)
- Missing-field lists
- Response generation
- Call summary output

**Current state:** Keyword-based MVP. Future: LLM-assisted extraction with structured output, still returning `PatientUnderstanding`.

---

### `src/conversation/psychology.ts`

**Owns:**

- `assessEmotion(message, state)` → emotion label + confidence
- Tone recommendations: `shouldReassure`, `shouldSlowDown`, `shouldValidate`
- Detection of embarrassment, frustration, dental anxiety, pain-distress

**Does not own:**

- Clinical urgency (triage.ts)
- Factual symptom extraction (understanding.ts)
- Choosing the literal next question (engine.ts)

**Current state:** Empty stub. Implement before expanding triage complexity.

---

### `src/conversation/triage.ts`

**Owns:**

- `assessUrgency(understanding, state)` → `Urgency` + clinical flags
- Red-flag rule evaluation (swelling, fever, breathing, trauma, bleeding)
- Dental concern normalization ("broke my tooth" → `broken_tooth`)
- Escalation recommendations: same-day, doctor callback, ER

**Does not own:**

- Empathetic response wording
- Insurance or demographic collection
- Diagnosis or treatment promises

**Current state:** Empty stub. Urgency logic currently duplicated in `understanding.ts` — move here incrementally.

---

### `src/conversation/engine.ts`

**Owns:**

- `ConversationGoal` type and `EngineDecision`
- `determineNextGoal(state)` — orchestrates brain outputs into a single goal
- Future: `processTurn(message, state, practiceConfig)` — runs the full conversation loop
- Conflict resolution across brains
- Practice-config-aware decisions (office hours, transfer numbers, required fields)

**Does not own:**

- Raw message parsing (understanding.ts)
- Emotion rules (psychology.ts)
- Clinical red-flag tables (triage.ts)
- Summary JSON schema (summary.ts)
- Type definitions for state (state.ts)

**Current state:** Simple goal picker based on `state.urgency`, `state.emotion`, and `state.missingFields`. Expand to call all brains per turn.

---

### `src/conversation/summary.ts`

**Owns:**

- `buildCallSummary(state, decisions)` → structured JSON per `docs/CALL_FLOWS.md`
- Intent-specific required fields (new patient, emergency, treatment type, pediatric, etc.)
- Staff-actionable formatting: what front desk should do next
- Open Dental comm-log-friendly field mapping

**Does not own:**

- Real-time turn-by-turn goal selection
- Patient-facing responses
- PMS write operations (integration layer)

**Current state:** Empty stub. Priority after psychology and triage stubs exist.

---

### Related files (outside `src/conversation/`)

| File | Role in brain architecture |
|------|---------------------------|
| `src/engine/prompt-context-builder.js` | Assembles practice + knowledge context for LLM turns |
| `src/engine/intents.js` | Intent constants; align with Front Desk Brain |
| `config/practices/*.json` | Practice-specific rules for Business/Practice Brain |
| `knowledge/` | Domain truth brains draw from at runtime |
| `docs/CALL_FLOWS.md` | Summary schema and per-intent required fields |

---

## 5. Near-Term Implementation Plan

Improve reasoning incrementally. **Do not break existing functions.** Each step should leave the app runnable.

### Phase 1 — Clarify boundaries (no behavior change)

1. Document which fields each brain owns (this file).
2. Add JSDoc to `understandPatientMessage` marking urgency/emotion fields as `@deprecated — migrate to triage.ts / psychology.ts`.
3. Add empty exported functions in stubs with typed signatures:
   - `psychology.ts`: `assessEmotion(message, state)`
   - `triage.ts`: `assessUrgency(understanding, state)`
   - `summary.ts`: `buildCallSummary(state)`

### Phase 2 — Extract without moving (parallel implementations)

4. Implement `assessEmotion` in `psychology.ts` using the same keyword rules currently in `understanding.ts` for anxious/pain signals.
5. Implement `assessUrgency` in `triage.ts` using the same keyword rules currently in `understanding.ts` for swelling, fever, breathing.
6. Keep `understanding.ts` behavior identical — still sets emotion/urgency for backward compatibility.
7. Add unit tests for psychology and triage in isolation.

### Phase 3 — Wire through engine.ts

8. Add `processTurn(message, state)` in `engine.ts`:
   ```ts
   const understanding = understandPatientMessage(message);
   const emotion = assessEmotion(message, mergeState(state, understanding));
   const urgency = assessUrgency(understanding, state);
   const goal = determineNextGoal({ ...state, emotion, urgency });
   ```
9. Migrate callers to `processTurn` one at a time.
10. Once all callers use `processTurn`, remove emotion/urgency assignment from `understanding.ts`.

### Phase 4 — Introduce ConversationAnalysis (single object)

11. Define a `ConversationAnalysis` type (in `state.ts` or a new `types.ts`):
    ```ts
    interface ConversationAnalysis {
      understanding: PatientUnderstanding;
      emotion: EmotionAssessment;
      urgency: UrgencyAssessment;
      missingFields: string[];
      goal: EngineDecision;
    }
    ```
12. Add types gradually — `EmotionAssessment`, `UrgencyAssessment` with confidence and reasons.
13. Refactor `processTurn` to return `ConversationAnalysis` instead of scattered values.

### Phase 5 — Front Desk and Business brains

14. Add `getMissingFields(state, intent, practiceConfig)` helper (engine.ts or new `front-desk.ts` if file grows).
15. Add `assessPracticeSignals(state, practiceConfig)` for retention/production flags (inline in engine.ts first; extract only if needed).
16. Implement `buildCallSummary` with intent-aware required fields from `docs/CALL_FLOWS.md`.

### Phase 6 — LLM enrichment (when voice pipeline is live)

17. Replace keyword extraction in `understanding.ts` with structured LLM output — same `PatientUnderstanding` interface.
18. Keep rule-based triage as **safety floor** — LLM cannot lower urgency below red-flag rules.
19. Connect `prompt-context-builder.js` to inject practice knowledge into understanding prompts.

### Constraints throughout

- **Keep existing functions working** — deprecate, don't delete, until callers migrate.
- **Add new types gradually** — extend interfaces before replacing them.
- **Avoid unnecessary dependencies** — pure TypeScript functions, no new npm packages for brains.
- **One ConversationAnalysis object** — target shape from Phase 4; don't prematurely unify.
- **Connect through engine.ts** — brains never call each other directly; engine orchestrates.
- **No PHI in logs** — brain debug output uses field names and enums, not patient content.

---

## 6. Design Rule

> **Every response should be clinically safe, emotionally intelligent, operationally useful, and easy for the front desk to act on.**

Use this as the acceptance test for any conversation change:

| Lens | Ask |
|------|-----|
| **Clinically safe** | Could this response delay necessary care, downplay red flags, or sound like a diagnosis? |
| **Emotionally intelligent** | Does this acknowledge how the patient feels before asking for their member ID? |
| **Operationally useful** | Does the call summary give typed fields the front desk can paste into Open Dental? |
| **Easy to act on** | Can a busy coordinator read the summary in 10 seconds and know what to do? |

If a proposed response passes three lenses but fails one, fix the failure before shipping.

---

## Quick Reference for Cursor Agents

**Before editing conversation code:**

1. Read this file.
2. Identify which brain owns the change.
3. If adding urgency logic → `triage.ts`, not `understanding.ts`.
4. If adding emotion/tone logic → `psychology.ts`.
5. If changing what we ask next → `engine.ts`.
6. If changing summary shape → `summary.ts` + `docs/CALL_FLOWS.md`.
7. Run the conversation loop mentally: understand → interpret → emotion → urgency → missing → goal → summary.

**Do not:**

- Put clinical red-flag rules only in the LLM prompt with no code floor.
- Promise insurance coverage, fees, or treatment outcomes in any brain.
- Log patient names, phone numbers, or symptoms to console/files.
- Add cross-brain imports (e.g., `triage.ts` importing from `psychology.ts`) — orchestration stays in `engine.ts`.
