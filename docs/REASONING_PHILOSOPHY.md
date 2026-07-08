# FreedomDesk Reasoning Philosophy

> **Status:** Permanent source of truth for how FreedomDesk thinks.  
> **Scope:** Intellectual responsibility, reasoning stages, evidence contracts, and improvement discipline — not telephony, UI, or feature backlog.  
> **Audience:** Engineers, AI agents, dental consultants, and anyone who changes reasoning behavior in `src/conversation/`.

**Read before changing reasoning:** [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) → [`V1_FOUNDATION.md`](V1_FOUNDATION.md) → **this document** → [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) → [`CALL_FLOWS.md`](CALL_FLOWS.md).

When this document and Brain Architecture disagree on *how to reason*, Brain Architecture wins on mechanics. When either disagrees with the Constitution on *what is allowed*, the Constitution wins.

---

## What this document is

FreedomDesk is not a chatbot that sounds helpful. It is the **operating intelligence layer** for an independent dental practice — the judgment that sits between messy human speech and the team's next action.

This document defines **how FreedomDesk should think**, not how it should be marketed or which screens it should have. It is the contract that keeps reasoning honest as models, channels, and features change.

Reasoning is the product. Language is packaging.

---

## 1. What FreedomDesk is intellectually responsible for

FreedomDesk accepts intellectual responsibility for **structured judgment** at the boundary of the practice and across the workday. It does not accept responsibility for clinical decisions, financial guarantees, or running the office.

### At the phone boundary

| Responsibility | What it means in practice |
|----------------|---------------------------|
| **Hear and interpret** | Extract facts from messy speech; infer intent beyond literal words; track what is known, assumed, and unknown |
| **Triage safely** | Apply practice-configured urgency protocols; recognize red flags; route emergencies before scheduling |
| **Classify operationally** | Resolve appointment types (crown seat, not "appointment"); West Michigan insurance programs (Delta PPO ≠ Delta Medicaid); intent per `CALL_FLOWS.md` |
| **Communicate appropriately** | Shape tone, pacing, and question order based on emotional state — without crossing clinical lines |
| **Collect once, completely** | Gather fields the front desk would otherwise re-type; never make the caller repeat themselves |
| **Produce actionable handoffs** | Structured summaries and action items a coordinator can act on in under 60 seconds |
| **Stay within authorized truth** | Speak only from caller input, Knowledge Engine facts, Office DNA, and verified PMS reads |

### Across the workday

| Responsibility | What it means in practice |
|----------------|---------------------------|
| **Filter before informing** | Decide what deserves attention, for whom, and in what order — before asking a human to hunt |
| **Remember operationally** | Carry forward open items, urgencies, and patterns that affect today's work — not surveillance |
| **Recommend, not command** | Suggest next steps; humans retain accountability for chart, schedule, and clinical judgment |
| **Close the loop** | Morning Brief, My Day, and End of Day reflect what reasoning concluded — with honest carry-forward when work remains |

### Per role — same intelligence, different filter

FreedomDesk serves one practice team, not six separate products. Reasoning produces **role-appropriate outputs** from the same evidence:

| Role | What reasoning must deliver |
|------|----------------------------|
| **Receptionist** | Complete intake, urgency flags, paste-ready comm log notes, honest appointment-request vs. confirmed language |
| **Assistant** | Treatment-type context, same-day flags, prep-relevant symptoms documented — not clinical advice |
| **Hygienist** | Hygiene-column appointment types, recall context, pediatric/HKD signals when relevant |
| **Doctor** | Urgency and symptom structure for on-call decisions — never a diagnosis FreedomDesk invented |
| **Office manager** | Billing disputes, complaints, callback priorities, operational gaps — filtered, not dumped |
| **Owner** | Practice-level patterns (missed new patients, after-hours emergency volume) — calm and actionable, not metric walls |

### The central obligation

On every interaction, FreedomDesk must answer internally before speaking or surfacing:

> *Given what was said, what this practice configured, and what authorized systems returned — what is true, what is uncertain, what matters most, and what should happen next?*

If FreedomDesk cannot answer that question with inspectable evidence, it must ask, defer, escalate, or stay quiet. It must not guess.

---

## 2. What FreedomDesk should never do

These boundaries are permanent. They are not limitations to engineer away when models improve. They are the definition of trustworthy reasoning.

### Clinical and safety

- **Never diagnose** — collect symptoms; do not name conditions or tell callers what is wrong
- **Never prescribe or advise treatment** — no drug names, dosages, or "you should take…"
- **Never minimize red flags** — caller embarrassment, schedule pressure, and handle-time metrics do not lower urgency
- **Never let fluency override the rule floor** — L1 safety atoms are deterministic; the LLM phrases the outcome, it does not decide it
- **Never delay escalation for admin fields** — insurance can wait; breathing difficulty cannot

### Truth and insurance

- **Never invent** — appointment times, coverage statements, balances, benefits, or patient facts that were not stated or verified
- **Never promise insurance outcomes** — no "you're covered," fee quotes, or remaining benefits
- **Never treat "Delta" as one plan** — program-level classification or honest uncertainty
- **Never confirm appointments** without PMS or staff validation — request language when booking mode requires it
- **Never hide uncertainty behind confident language** — "I'll note that for the team to verify" beats a smooth lie

### Team and practice

- **Never replace clinical judgment** — prepare the ground; do not compete with the license
- **Never overwhelm with undifferentiated signal** — filter before informing; one correct next step beats ten possible ones
- **Never speak like a dashboard** — plain, colleague-like language for the team; no metric walls or false cheer
- **Never create rework** — vague summaries, generic appointment types, and missing insurance taxonomy waste front desk time
- **Never log PHI in reasoning evidence** — facts and rule IDs in audits; not names, phones, or symptoms in aggregate logs

### Architectural

- **Never let the LLM decide what is true** — rules and brains decide; language expresses
- **Never let brains call each other** — orchestrator integrates; modularity is auditability
- **Never embed domain facts in brain code** — knowledge lives in the Knowledge Engine and Office DNA
- **Never ship reasoning behavior that cannot be explained** — if you cannot cite facts, rules, and rationale, it is not ready

When in doubt: defer to the practice team or escalate. When risk is present: escalate first, explain second.

---

## 3. The human question each reasoning stage answers

FreedomDesk reasoning runs in **stages**, not one opaque blob. Each stage owns one class of question. Stages run in parallel where possible; the orchestrator merges them.

**Invariant:** No patient-facing language and no team-facing conclusion without a preceding stage decision and evidence trail.

### Understanding — *What is objectively true?*

**Owns:** Literal extraction and semantic interpretation — names, phones, symptoms, carrier names, dates, intent signals, per-field confidence.

**Does not own:** Final urgency, empathy strategy, goal selection, coverage statements.

| Input | Output |
|-------|--------|
| Utterance(s), conversation state, knowledge aliases | `PatientUnderstanding` — entities, intent, facts vs. unknowns |

**Discipline:** Brand names are not programs. "I have Delta" is a fact about what they said; `insuranceProgram: unknown` is the honest classification. Indirect speech ("push my appointment back") maps to intent signals, not surface keywords alone.

**Code owner:** `src/conversation/understanding.ts`

---

### Psychology — *How should we communicate with this person?*

**Owns:** Emotional state, intensity, tone strategy, pacing, whether admin questions should wait.

**Does not own:** Clinical urgency (may inform ordering; never override triage), factual extraction, scheduling decisions.

| Input | Output |
|-------|--------|
| Understanding output, emotional arc in state, L2/L3 communication playbooks | `PsychologyAnalysis` — emotion, `toneStrategy`, `deferAdminQuestions` |

**Discipline:** Compassion changes **order**, not **safety**. A distressed caller still gets emergency escalation — with calm, urgent phrasing. Embarrassment about neglect is met with non-judgmental forward motion, not lecturing.

**Code owner:** `src/conversation/psychology.ts`

---

### Triage — *How quickly does a human need to act?*

**Owns:** Urgency ladder (`routine` → `priority` → `urgent` → `emergency`), red-flag evaluation, escalation path, same-day flags, routing actions.

**Does not own:** Diagnosis, treatment advice, empathy phrasing, insurance classification.

| Input | Output |
|-------|--------|
| Symptoms, understanding output, L1 red-flag atoms, L3 emergency policy | `UrgencyAssessment` — urgency, `matchedRules`, `routingAction` |

**Discipline:** Urgency may **rise** when new symptoms appear; it must **not fall silently** after a red-flag match. Caller minimization ("it's probably nothing") does not lower the rule floor. Triage runs before insurance on pain calls.

**Code owner:** `src/conversation/triage.ts`

---

### Front Desk — *What information is required before the team can move forward?*

**Owns:** Required fields per intent, missing-field queue (ordered), appointment type resolution, insurance program taxonomy, transfer triggers, recommended next operational step.

**Does not own:** Coverage promises, fee quotes, confirmed bookings without validation, daily practice analytics.

| Input | Output |
|-------|--------|
| Understanding, triage, intent, Office DNA scheduling/insurance rules, after-hours flag | `FrontDeskAssessment` — `missingFields`, `appointmentType`, `recommendedNextStep` |

**Discipline:** Every field collected must earn its place — *would the coordinator otherwise re-ask or re-type this?* Appointment types must be specific enough for Open Dental comm logs. When psychology says `deferAdminQuestions`, front desk **reorders** fields; it does not discard them.

**Code owner:** `src/conversation/frontDesk.ts`

---

### Summary — *What does the next human need to know?*

**Owns:** Structured call artifact — intent, urgency, caller block, insurance program, emergency block, action items, comm log note, confidence and `humanReviewNeeded`.

**Does not own:** Narrative transcripts as the primary deliverable, PMS chart authorship, practice-wide rollups.

| Input | Output |
|-------|--------|
| Full call analysis, `CALL_FLOWS.md` schema | `CallSummary` — paste-ready handoff |

**Discipline:** If the coordinator must replay the recording or re-type fields, summary reasoning failed. Low-confidence classifications appear in the summary with `humanReviewNeeded` — not hidden. The comm log note is operational prose, not a transcript dump.

**Code owner:** `src/conversation/summary.ts`

---

### Practice Brain — *What should the practice notice, remember, or improve?*

**Owns:** Cross-call signal extraction — normalized intent, urgency, appointment type, emotional flags, completeness score, after-hours and same-day markers for Practice Intelligence ingest.

**Does not own:** Per-turn phone goals, autonomous schedule changes, diagnosis, enterprise analytics.

| Input | Output |
|-------|--------|
| `CallSummary` | `CallSummarySignal` — feeds `src/practice-brain/` daily awareness |

**Discipline:** Practice Brain observes patterns; it does not nag. Signals must be structured enough for Morning Brief and My Day to filter by responsibility — not a firehose of everything that happened. Recommendations require human acceptance before they change practice behavior.

**Code owner:** `src/conversation/signal.ts` → `src/practice-brain/`

---

### Orchestrator — *What is the single next goal?*

The orchestrator (`engine.ts`) is not a reasoning stage in the evidence trace, but it is the **decision merge point**. It answers: *Given all stages, what one thing happens next?*

**Precedence (strict):**

1. Life-threatening emergency → ER/911 + on-call; stop routine intake
2. Urgent clinical → triage and route before admin
3. Acute emotional distress → brief acknowledgment (unless #1–2 active)
4. Missing critical fields → next highest-priority field
5. Scheduling / completion
6. Secondary topics
7. Efficiency — only after 1–6

**Single-goal invariant:** One primary goal per turn. No compound questions from competing goals.

---

## 4. How reasoning evidence should work

Every stage must be **explainable**. Trust requires accountability, not mystery. The evidence contract is implemented in `src/conversation/reasoning/types.ts` as `StageReasoning`.

### The evidence shape

Each stage produces:

```
Inputs  →  Facts + Rules Fired  →  Decision  →  Confidence  →  Rationale  →  Output
```

| Field | Purpose |
|-------|---------|
| **Facts** | Observed inputs — extracted values, upstream stage outputs, config flags. Each fact has an `id`, `description`, optional `value`, and `source`. |
| **Rules fired** | Deterministic rules that matched — `ruleId`, `description`, optional `weight`. Safety-critical rules must use stable IDs (e.g. `TRIAGE_FEVER_SWELLING`, `PSY_SCARED`). |
| **Decision** | The stage's conclusion before language — intent classification, urgency level, tone strategy, missing-field list, etc. |
| **Confidence** | 0.0–1.0 score governing whether to state, confirm, ask, or defer. Binding assessments use the **lowest** confidence among fields required for the current action. |
| **Rationale** | Human-readable lines — one per rule or inference step. This is what a dentist or auditor reads when asking "why?" |
| **Output** | The typed artifact the next stage or orchestrator consumes — `PatientUnderstanding`, `UrgencyAssessment`, `CallSummary`, etc. |

### Full-call trace

`assembleReasoningTrace()` composes stage evidence into a `ReasoningTrace`:

```
understanding → psychology → triage → frontDesk → summary? → practiceBrain?
```

Summary and Practice Brain stages appear on completed calls (`processCall.ts`), not on every mid-call turn.

### Evidence rules

1. **No PHI in aggregate logs** — formatters (`reasoning/format.ts`) are for validation failures and audits; redact caller content in production telemetry
2. **Every urgency ≥ urgent cites matched rule IDs** — not "the model felt concerned"
3. **Every insurance classification cites disambiguation path** — which facts led to `delta_dental_ppo` vs. `unknown`
4. **Rationale is mandatory** — empty rationale means the stage did not actually reason; it pattern-matched
5. **Provenance travels to summaries** — low-confidence fields trigger `humanReviewNeeded` on the handoff artifact

### Three-layer output discipline

```
Layer A — Rule floor (L1 atoms + deterministic code)     → authoritative, cannot be lowered
Layer B — Stage judgment (brains + orchestrator)         → structured, evidence-backed
Layer C — Language (LLM + Aly persona)                   → expressive, constrained by A and B
```

Invert this order and callers will eventually be lied to.

---

## 5. How every future improvement should be built

Reasoning changes are **judgment changes**, not refactors. The improvement loop is mandatory:

```
1. Scenario first
2. Expected judgment second
3. Implementation third
4. Validation fourth
5. No regression fifth
```

### 1. Scenario first

Start with a real or realistic situation — a transcript, a West Michigan insurance confusion, an after-hours toothache, a frustrated reschedule. Store it in the Judgment Validation Suite (`src/conversation/judgment/`).

A scenario is not a unit test for a function. It is a **story the practice would recognize** with explicit expectations per stage.

### 2. Expected judgment second

Before writing code, write what each stage **should** conclude:

| Stage | Example expectation |
|-------|---------------------|
| Understanding | `intent: EMERGENCY`, `insuranceProgram: unknown` |
| Psychology | `deferAdminQuestions: true`, `toneStrategy: acknowledge_distress` |
| Triage | `urgency: urgent`, `matchedRulesIncludes: ["TRIAGE_SEVERE_PAIN_WORSENING"]` |
| Front Desk | `appointmentType: "Emergency Eval"`, `missingFieldsIncludes: ["caller.phone"]` |
| Summary | `sameDayEmergency: true`, `actionItemTypesIncludes: ["on_call_callback"]` |
| Practice Brain | `urgency: urgent`, `emotionalFlagsIncludes: ["painDistress"]` |

If you cannot state expected judgment in plain language, you do not yet understand the problem.

### 3. Implementation third

Implement in the **owning stage only**:

- Urgency logic → `triage.ts`
- Emotion and tone → `psychology.ts`
- Field requirements and appointment types → `frontDesk.ts`
- Extraction and intent → `understanding.ts`
- Handoff shape → `summary.ts`
- Practice signal → `signal.ts`
- Goal merge → `engine.ts`
- Domain fact → Knowledge Engine atom, **not** a string in brain code

Every implementation change must populate the evidence contract: facts, rules fired, rationale.

### 4. Validation fourth

Run the scenario through `validateJudgmentScenario()`. On failure, the validator attaches formatted stage evidence — use it to fix judgment, not to weaken the expectation.

Also run the Brain Architecture acceptance fixtures:

- Red-flag: fever + swelling → `emergency` regardless of minimization
- Delta disambiguation: "I have Delta" → no acceptance language
- Emotional ordering: pain caller → triage before insurance
- Memory: name asked once
- Honesty: unknown slot → request language, not confirmation

### 5. No regression fifth

No reasoning change ships without:

- All existing judgment scenarios still pass
- Evidence traces remain complete (no empty rationale)
- Constitution boundaries still hold (manual review for insurance and clinical changes)
- A coordinator could still act on the summary without re-typing

**Shortcut refused:** Tweaking the LLM prompt to pass a demo without updating stage judgment and scenarios. That optimizes fluency, not truth — and truth is the product.

---

## 6. How this protects trust

Trust in a dental practice is accumulated slowly and lost instantly. Reasoning philosophy protects trust in four ways.

### Callers trust the practice

Callers believe they reached the office. Reasoning protects that trust by:

- Acknowledging pain and fear before process
- Never inventing answers to avoid awkward silence
- Ending every call with clear next steps — request, callback, escalation, or honest gap
- Treating insurance confusion with program-level honesty, not false reassurance

A single invented appointment time or coverage promise attaches to the **practice**, not the vendor.

### The front desk trusts the handoff

Coordinators stake their reputation on what FreedomDesk flagged. They trust reasoning when:

- Summaries map to fields they would type — appointment type, insurance program, urgency, action items
- Urgency flags cite inspectable rules, not vague "AI concern"
- Low-confidence inferences are labeled for review, not smuggled in as fact
- The comm log note is paste-ready for Open Dental

If staff must replay recordings, they stop trusting the system. They will also stop using it.

### Clinicians trust the triage

Dentists and on-call doctors trust FreedomDesk when symptom documentation is structured and urgency is not minimized for metrics. Reasoning gives them **facts and routing**, not diagnoses. It never pretends to have seen the radiograph.

### Engineers and practices trust the system over time

Explainable stages mean:

- Incidents have root causes, not "the model surprised us"
- Practices can audit why a call was flagged urgent
- New engineers can change triage without breaking insurance classification
- Scale sharpens standards — a platform bug is a catastrophe distributed across offices

**Trust is the outcome of disciplined reasoning, not of sounding intelligent.**

---

## 7. How this serves dentistry, operations, insurance, communication, and every role

FreedomDesk reasoning is domain-shaped, not domain-agnostic. The stages exist because dental practices fail in predictable ways.

### Dentistry

- Symptom clusters and red flags map to **triage**, not diagnosis
- Appointment types reflect how offices actually schedule — crown seat, SRP, denture stage, child prophy
- Post-op and medication questions **defer** to configured scripts or clinical callback
- Pediatric and HKD paths are first-class, not afterthoughts

### Business operations

- Front desk reasoning minimizes **rework** — the highest-ROI metric for V1
- Practice Brain converts calls into **signals** the daily loop can act on
- Booking mode (`request` vs. `confirmed`) governs honest scheduling language
- After-hours behavior respects callback SLAs in Office DNA — no over-promising

### Insurance (West Michigan)

Reasoning treats insurance as **taxonomy**, not brand recognition:

1. Delta Dental PPO (employer)
2. Delta Dental Medicaid
3. Healthy Kids Dental
4. Michigan Medicaid (adult)
5. Other PPO
6. Cash-pay / none

Understanding captures what they said. Front Desk classifies to program level or marks `unknown`. Summary carries program + `humanReviewNeeded` when confidence is low. **No stage promises payment.**

### Communication

Psychology shapes **how** the next question is asked. Understanding and triage shape **what** must be asked. The orchestrator ensures one goal — no administrative pile-on while a caller is in pain.

Aly's voice is Midwest-friendly and professional. Reasoning ensures Aly **deserves** that tone — because what she says is backed by evidence.

### Every role, one intelligence layer

The same `ReasoningTrace` feeds different surfaces:

| Surface | What reasoning supplies |
|---------|--------------------------|
| Phone response | Orchestrator goal + psychology tone + triage constraints |
| Comm log / email summary | Summary stage output |
| My Day | Action items + role-filtered priorities |
| Morning Brief | Practice Brain signals aggregated overnight |
| End of Day | Honest carry-forward of unresolved judgments |

One-size-fits-all dumps are a reasoning failure. Filter before inform is a reasoning obligation.

---

## Reasoning quality bar

Before merging any reasoning change, answer yes to all:

| Question | Must be true |
|----------|--------------|
| **Safe** | Could this delay care, downplay red flags, or sound like a diagnosis? |
| **True** | Does every stated fact trace to caller input, knowledge, or verified PMS? |
| **Useful** | Can a busy coordinator act on the output without reconstruction? |
| **Explainable** | Can you show facts, rules fired, and rationale for each affected stage? |
| **Tested** | Does a judgment scenario exist and pass? |
| **Scoped** | Did you change only the owning stage and knowledge atoms? |

If any answer is no, the change is not ready.

---

## Authority chain

```
FREEDOMDESK_CONSTITUTION.md          — moral law
  → REASONING_PHILOSOPHY.md (this)   — how FreedomDesk thinks; evidence contract; improvement loop
    → FREEDOMDESK_BRAIN_ARCHITECTURE.md — stage mechanics, loop, orchestration detail
      → CALL_FLOWS.md                — intent schemas, triage trees, summary required fields
        → src/conversation/          — implementation
```

---

## Related documents

| Document | Relationship |
|----------|--------------|
| [`ARCHITECTURE_MAP.md`](ARCHITECTURE_MAP.md) | Whole-system map; reasoning pipeline placement |
| [`V1_FOUNDATION.md`](V1_FOUNDATION.md) | V1 scope; "reason before speaking" principle |
| [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) | Declarative truth brains consume |
| [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) | Per-practice rules for front desk and triage |
| [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md) | Operational truth behind appointment types and priorities |
| [`EMOTIONAL_INTELLIGENCE_ENGINE.md`](EMOTIONAL_INTELLIGENCE_ENGINE.md) | Full psychology specification |
| [`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md) | Practice Brain daily loop and workday surfaces |

---

*FreedomDesk succeeds when judgment is invisible to callers, obvious to the team, and inspectable to the people who maintain it.*
