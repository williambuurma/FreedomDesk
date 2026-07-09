# FreedomDesk Action Model

> **Status:** Founding architecture document. Defines how FreedomDesk transforms operational judgment into coordinated human work — the permanent **Action** capability.  
> **Scope:** Event-to-action materialization, action lifecycle, ownership, escalation, completion, outcome, and learning — not UI, implementation, or dashboards.  
> **Audience:** Architects, engineers, product, dental operators, and AI agents extending the intelligence layer beyond Observe → Reason → Operational Events.

When this document conflicts with implementation convenience, **this document defines intent**. When it conflicts with moral law, [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) prevails.

**Read first:** [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) → [`INTELLIGENCE_MODEL.md`](INTELLIGENCE_MODEL.md) → [`OPERATING_INTELLIGENCE.md`](OPERATING_INTELLIGENCE.md) → [`REASONING_PHILOSOPHY.md`](REASONING_PHILOSOPHY.md) → **this document**

This document does not define screens, APIs, or code. It defines the **smallest architecture** that turns judged truth into accountable work without becoming a task manager.

---

## Why this document exists

FreedomDesk can now:

1. **Observe** — faithful attention to calls, schedule, lab, and practice signals  
2. **Reason** — Universal Judgment Loop with evidence, confidence, and precedence  
3. **Produce Operational Events** — normalized, schema-validated practice-time facts  

The next permanent capability is **Action**: transforming judged commitments into **operational work the right person can finish** — with ownership, timing, evidence, and honest closure.

A dental practice already has task lists — sticky notes, Open Dental task boxes, mental queues, manager texts. FreedomDesk must not add another place to dump work. It must add **judgment-backed commitments** — the difference between "someone should probably call them" and "Maria owns a callback by 9:30 because last night's caller reported swelling and the on-call SLA is 30 minutes."

---

## 1. What Action is — and is not

### Action is an operational commitment

An **Action** is a durable record that FreedomDesk's judgment has decided **someone accountable must resolve something** — with enough structure to act in ten seconds and enough provenance to trust or audit.

| Action is | Action is not |
|-----------|---------------|
| Judgment made executable | A user-created to-do |
| One verb, one owner, one because-line | A project plan or checklist |
| Evidence-backed and confidence-scored | A notification without context |
| Routed through **Person → Responsibilities** | A job-title dashboard |
| Born from Operational Events + Judgment | Arbitrary workflow automation |
| Closed with an **outcome** | An infinite open queue |
| Decayed when stale or superseded | Alert debt |

### The distinction from recommendations

[`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §25 defines **Recommendations** as explainable suggestions the team may accept, defer, or dismiss.

**Actions** are the next step when judgment crosses a commitment threshold:

```
Operational Event  →  Judgment  →  Commitment
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
           Below action threshold              At or above threshold
           (informational insight,             → Action (or merge into
            brief item, stay silent)              existing Action)
```

| Artifact | Question it answers | Human obligation |
|----------|---------------------|------------------|
| **Operational Event** | What happened? | None — fact ingest |
| **Recommendation** | What might help? | Consider; accept or dismiss |
| **Action** | What must be resolved? | Own it until outcome or explicit dismissal |

Not every recommendation becomes an Action. Not every event produces one. **Ignore** is a valid judgment outcome.

### The distinction from PMS tasks

Open Dental and sibling systems own **authoritative work queues** tied to chart, schedule, and ledger. FreedomDesk Actions live in the **intelligence layer** ([`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md) §3–§6).

| Layer | Owns |
|-------|------|
| **PMS** | Appointment booked, comm log posted, verified benefits, clinical note signed |
| **FreedomDesk Action** | Judged commitment that those things *should happen* — with why, by when, and for whom |

An Action may **imply** a PMS write-back (post comm log, create appointment request). Completing the Action means the human did the operational work — optionally evidenced by a PMS reference. FreedomDesk does not replace the PMS task box; it **coordinates judgment** so the right PMS work gets done.

---

## 2. Position in the intelligence architecture

Action is the delivery arm of **Judge + Coordinate** — the sixth permanent capability in the product arc, expressed through three existing responsibilities:

```
┌─────────────────────────────────────────────────────────────────────┐
│ PLANE 3 — JUDGMENT (Universal Judgment Loop)                       │
│   Ground → Interpret → Reconcile → Judge → Express → Persist       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Commitment
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ACTION ENGINE (this document)                                        │
│   Materialize · Dedupe · Route · Escalate · Complete · Learn         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ role-filtered delivery
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PLANE 4 — EXPERIENCE (My Day, Brief, Close — sibling specs)         │
│   Surfaces consume Actions; they do not create or prioritize them    │
└─────────────────────────────────────────────────────────────────────┘
```

**Practice Brain** ([`INTELLIGENCE_MODEL.md`](INTELLIGENCE_MODEL.md) §3) is not a separate mind. It is practice-time Judgment over the operational event stream. The Action Engine is where **that judgment becomes accountable work** — the same loop at interaction-time, shift-time, and practice-time.

---

## 3. Smallest architecture

Five logical components. No sixth unless scale demands it.

```
Operational Event Stream
         │
         ▼
┌──────────────────┐
│ Commitment       │  Judgment output: one primary next step with
│ Extractor        │  owner, tier, confidence, evidence, due rule
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Action           │  Dedupe key · merge · supersede · dependency
│ Registry         │  resolution · lifecycle state
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Action           │  Person-through-responsibility · tier gating
│ Router           │  · assignment · reassignment rules
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Escalation       │  SLA watch · tier promotion · fallback owner
│ Monitor          │  · blocked-until dependency cleared
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Outcome          │  Completion · dismissal · expiry · learning
│ Recorder         │  feed to Practice Memory / CLE
└──────────────────┘
```

| Component | Single responsibility |
|-----------|----------------------|
| **Commitment Extractor** | Translate Judgment `Commitment` objects into Action candidates — or none |
| **Action Registry** | One patient + one issue + one verb = one Action; merge duplicates |
| **Action Router** | Map owner responsibility → Person(s) today; respect permission and focus blocks |
| **Escalation Monitor** | Time-based and dependency-based promotion per Office DNA |
| **Outcome Recorder** | Close the loop with inspectable result; emit learning signals |

Surfaces (My Day, Morning Brief, End of Day) **subscribe** to the Action Registry. They are not part of this architecture.

---

## 4. The Action contract

Every Action MUST populate all required fields. Incomplete Actions do not ship to humans.

### Required fields

| Field | Purpose |
|-------|---------|
| **id** | Stable identifier across merge and escalation |
| **practiceId** | Tenant isolation |
| **verb** | One imperative operational step — "Callback," "Verify program," "Confirm lab case" |
| **object** | What the verb applies to — patient reference, slot, case, DNA field — without PHI in aggregate logs |
| **because** | Plain-language reason line — the Answer Contract "why" |
| **primaryResponsibility** | Owner hat — `reception`, `clinical_assist`, `hygiene`, `doctor`, `manager`, `owner` |
| **urgencyTier** | `critical` \| `important` \| `informational` — per [`OPERATING_INTELLIGENCE.md`](OPERATING_INTELLIGENCE.md) §12 |
| **priority** | Derived ordering within tier — computed, not user-sorted |
| **dueAt** | When inaction causes harm, rework, or SLA breach — computed from Office DNA |
| **evidence** | Provenance pointers — same shape as Operational Event evidence |
| **confidence** | 0.0–1.0 — binding confidence for this commitment |
| **uncertainty** | Gaps, `humanReviewNeeded`, conflict class — honesty travels with the Action |
| **dependencies** | Action IDs that must complete or expire before this one is actionable |
| **status** | Lifecycle state — see §7 |
| **sourceEventIds** | Operational Events that produced or updated this Action |
| **createdAt** | When judgment first committed |
| **expiresAt** | When the Action is no longer valid — stale opportunities decay |

### Optional fields

| Field | Purpose |
|-------|---------|
| **assignedPersonId** | Specific Person when DNA or judgment names one (on-call doctor) |
| **fallbackResponsibility** | Escalation target when primary owner unavailable |
| **expectedOutcome** | What "done" looks like — for completion matching and learning |
| **category** | `schedule`, `verification`, `clinical_prep`, `follow_up`, `emergency`, `retention`, `dna_maintenance`, `integration` — aligns with recommendation taxonomy |
| **appointmentType** | Treatment-specific typing when relevant — crown seat, not "appointment" |
| **escalation** | Current escalation level, history, next tier |
| **supersedes** | Prior Action ID when judgment refines |
| **pmsHint** | Suggested PMS operation on completion — comm log, appointment request — not auto-executed |

### The ten-second act test

Before an Action leaves the Registry, it must pass [`OPERATING_INTELLIGENCE.md`](OPERATING_INTELLIGENCE.md) §13:

> *Could this person act on this in ten seconds without asking what it means?*

If no, judgment failed — refine the verb, because-line, or evidence before routing. Do not push interpretation labor onto the recipient.

---

## 5. How events become Actions

### Step 1 — Event ingest (already defined)

All domains normalize into **Operational Events** ([`INTELLIGENCE_MODEL.md`](INTELLIGENCE_MODEL.md) §10, `src/events/types.ts`):

```
OperationalEvent {
  id, practiceId, timestamp, source, eventType
  subject, evidence[], uncertainty, routing?, payload
}
```

Events are facts. They carry optional **routing hints** from boundary judgment (`owner`, `urgencyTier`, `recommendedNextStep`). Hints are not Actions — they are inputs.

### Step 2 — Judgment produces Commitment

The Universal Judgment Loop runs per event or batched event cluster (same patient, same issue, five-minute window):

```
SIGNAL IN → GROUND → INTERPRET → RECONCILE → JUDGE → …
                                              │
                                              ▼
                                    Commitment | Ignore | Defer
```

A **Commitment** is Judgment's output — not language, not UI:

```
Commitment {
  verb, object, because
  primaryResponsibility, urgencyTier, confidence
  evidence[], uncertainty
  dueRule          // DNA-relative: callback_sla, before_appointment, end_of_shift
  dependencies[]   // other commitment keys or event conditions
  actionThreshold  // met | not_met
}
```

**Ignore** and **Defer** produce no Action. Informational-tier commitments may surface in briefings without entering the Action Registry — tier gating is Judgment's job, not the Router's.

### Step 3 — Commitment Extractor applies gates

An Action candidate is created only when **all** pass:

| Gate | Rule |
|------|------|
| **Threshold** | `actionThreshold: met` — confidence ≥ floor for this verb class ([`INTELLIGENCE_MODEL.md`](INTELLIGENCE_MODEL.md) §8) |
| **Constitutional** | No diagnose, promise coverage, or auto-book |
| **Stakes** | Someone must act — not merely know |
| **Owner resolvable** | Primary responsibility maps to at least one Person today |
| **Not redundant** | Dedupe key does not match an active Action |

### Step 4 — Action Registry dedupes and merges

**Dedupe key** (conceptual):

```
hash(practiceId, subject.patientReferenceId | subject.callId | subject.slotId,
     verb.normalized, category)
```

| Incoming vs. existing | Registry behavior |
|----------------------|-------------------|
| Same key, same evidence | No-op — idempotent ingest |
| Same key, stronger evidence or higher tier | Merge — update confidence, evidence, dueAt |
| Same key, conflicting judgment | Reconcile — Conflict object; one Action with `humanReviewNeeded` or split only if genuinely distinct verbs |
| Same issue, refined verb | Supersede — close old Action as `superseded`, link `supersedes` |
| Distinct verbs, same patient | Separate Actions — e.g., "Verify insurance" and "Callback" coexist |

Coordination invariant from [`INTELLIGENCE_MODEL.md`](INTELLIGENCE_MODEL.md) §9: **same patient, same issue, one Action** — unless verbs are genuinely independent.

### Step 5 — Dependencies resolve

Some Actions cannot start until others finish:

| Pattern | Dependency |
|---------|------------|
| Waitlist offer after cancellation | "Fill slot" depends on cancellation Action acknowledged |
| Crown seat prep | "Confirm lab case" before "Prep operatory for crown seat" |
| NPE arrival | "Verify insurance" before "Clinical prep for anxious NPE" — parallel allowed when independent |

Blocked Actions carry `status: blocked` until dependencies reach `completed`, `dismissed`, or `expired`. Escalation Monitor promotes blocked items when dependency clears.

### Step 6 — dueAt computation

`dueAt` is never invented. It is computed from **Office DNA** + event timestamp:

| dueRule | Example |
|---------|---------|
| `callback_sla` | After-hours urgent call → on-call callback by DNA minutes |
| `before_appointment` | Verify insurance → NPE start time minus DNA buffer |
| `before_procedure` | Confirm lab case → crown seat start minus assistant prep window |
| `end_of_shift` | Carry-forward items → practice close per timezone |
| `same_day` | Same-day emergency → today before last doctor block |

Missing DNA for a dueRule → Action may be created with `dueAt: unknown` and `humanReviewNeeded: true`, or Judgment **Defers** — fail closed on safety-critical paths.

### Step 7 — Router assigns Person

Route through **Responsibility → Person**, not job title ([`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md) §7–§10):

1. Resolve `primaryResponsibility` to Person(s) wearing that hat today  
2. If multiple, use DNA assignment rules (primary front desk, on-call rotation)  
3. Merge into each Person's **single workspace** — Sarah does not switch modes  
4. Apply tier filter — `informational` Actions may not interrupt clinical focus blocks  

### Event → Action examples

| Event type | Judgment commitment | Action (verb + object) |
|------------|--------------------|-----------------------|
| `call_completed` — overnight urgent, swelling | Callback within on-call SLA | **Callback** — patient ref; due in 30 min; `doctor` or `reception` per DNA |
| `call_completed` — NPE, Delta stated, unverified | Verify before arrival | **Verify program** — NPE tomorrow 10 AM; `reception` |
| `appointment_cancelled` — hygiene slot | Recover from waitlist | **Offer waitlist** — open hygiene slot Tue 2 PM; `reception` |
| `lab_status_changed` — not received | Confirm before crown seat | **Confirm lab case** — crown seat 11 AM; `clinical_assist` |
| `schedule_conflict_detected` — prophy vs perio overdue | Reconcile appointment type | **Review hygiene type** — patient on chair 3; `hygiene` |
| `insurance_verification_needed` | Queue verification | **Verify program** — before afternoon block; `reception` |
| `shift_start` — 3 open verifications | Batch priority | Three Actions or one merged **Clear verification queue** — Judgment decides by ten-second test |

---

## 6. Action ownership

Ownership is **accountability**, not calendar booking.

### Three ownership layers

| Layer | Field | Meaning |
|-------|-------|---------|
| **Responsibility** | `primaryResponsibility` | Which hat owns this class of work — stable across days |
| **Person** | `assignedPersonId` | Who owns it **today** — may change on reassignment or escalation |
| **Fallback** | `fallbackResponsibility` | Where it goes if unowned at dueAt — manager, on-call, owner |

FreedomDesk assigns **Responsibility by default**. Specific Person assignment happens when DNA requires it (on-call dentist) or when a manager reassigns with reason.

### Reassignment rules

| Actor | May reassign | Must provide |
|-------|--------------|--------------|
| **Person with responsibility** | To another Person wearing same responsibility | Reason optional |
| **Manager** | Any responsibility in scope | Reason — learning signal |
| **System (escalation)** | Per DNA escalation path | Automatic — logged in `escalation` |

Reassignment does not create a new Action. It updates `assignedPersonId` and appends to audit trail.

### Role → responsibility mapping

Actions use **responsibility tags**, aligned with [`INTELLIGENCE_MODEL.md`](INTELLIGENCE_MODEL.md) §10 and [`OPERATING_INTELLIGENCE.md`](OPERATING_INTELLIGENCE.md) §16:

| Practice role | Primary responsibilities | Typical Actions |
|---------------|-------------------------|-----------------|
| **Receptionist** | `reception` | Callback, confirm, verify program, waitlist offer, reschedule request |
| **Assistant** | `clinical_assist` | Confirm lab case, prep operatory, same-day setup |
| **Hygienist** | `hygiene` | Review hygiene type, recall handoff, symptom flag for doctor |
| **Doctor** | `doctor` | On-call callback, emergency eval decision, unsigned note threshold |
| **Office Manager** | `manager` | Complaint escalation, DNA review, integration failure, queue depth |
| **Owner** | `owner` | Strategic follow-ups — weekly rhythm; capacity decisions |

One Person, multiple responsibilities → **one merged Action queue**, deduped ([`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md) §10).

---

## 7. Priority, due time, and lifecycle

### Priority model

Priority is **computed**, not drag-and-drop sorted:

```
sort key = (urgencyTier rank, dueAt ascending, confidence descending, createdAt ascending)
```

| urgencyTier | Standard | Interrupt? |
|-------------|----------|------------|
| **critical** | Harm or major trust failure if delayed minutes | May break focus blocks |
| **important** | Today's rhythm — morning prep, live queue | No interrupt during patient care unless promoted |
| **informational** | Briefing and close — not default Action | Usually **not** materialized as Action |

Within tier, **dueAt** dominates. A callback due in eight minutes outranks a verification due in two hours.

### Lifecycle states

```
                    ┌──────────┐
         create ──▶ │  active  │◀── dependency cleared
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┬──────────────┐
         ▼               ▼               ▼              ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ blocked  │   │escalated │   │ completed│   │ dismissed│
   └──────────┘   └────┬─────┘   └──────────┘   └──────────┘
         │               │               ▲              ▲
         │               └───────────────┘              │
         ▼                                              │
   ┌──────────┐   ┌──────────┐   ┌──────────┐          │
   │ expired  │   │superseded│   │  merged  │──────────┘
   └──────────┘   └──────────┘   └──────────┘
```

| Status | Meaning |
|--------|---------|
| **active** | Awaiting human resolution |
| **blocked** | Dependencies incomplete |
| **escalated** | Promoted tier or reassigned owner — still active |
| **completed** | Outcome recorded — success or acceptable alternate |
| **dismissed** | Human judged not applicable — with reason |
| **expired** | `expiresAt` passed without action — stale decay |
| **superseded** | Replaced by newer judgment |
| **merged** | Absorbed into another Action |

**Resolved work decays.** Completed, dismissed, expired, and superseded Actions leave the active queue. They remain in audit and learning history — not as badges.

---

## 8. Evidence and confidence on Actions

Actions inherit the evidence contract from [`REASONING_PHILOSOPHY.md`](REASONING_PHILOSOPHY.md) §4.

### Evidence on every Action

Each `evidence[]` entry cites:

- **source** — `call_summary`, `caller_stated`, `pms_authoritative`, `office_dna`, `inferred`, `operational_event`  
- **description** — human-readable, team-facing  
- **referenceId** — internal pointer — never PHI in aggregate telemetry  
- **observedAt** — when the fact was true  

The Action's **because** line summarizes evidence in one sentence. Full evidence is inspectable on demand — Answer Contract field 1–2.

### Confidence governs materialization and expression

| Confidence | Action behavior |
|------------|-----------------|
| ≥ tier floor | Materialize as Action |
| Below floor | Defer — queue for review, brief only, or stay silent |
| Mixed fields | `humanReviewNeeded: true` on Action; binding confidence = min(required fields) |

Confidence without provenance is forbidden ([`INTELLIGENCE_MODEL.md`](INTELLIGENCE_MODEL.md) §8).

### Uncertainty travels forward

An Action may be valid and uncertain:

- "Verify Delta **program** — caller said Delta; program unclassified"  
- `uncertainty.class: unverified` — not a reason to hide the Action  
- `uncertainty.gaps[]` — what completion should resolve  

FreedomDesk never resolves uncertainty in the Action text by sounding confident.

---

## 9. Dependencies

Dependencies express **operational order**, not project management.

### Dependency types

| Type | Example |
|------|---------|
| **finish-to-start** | Lab confirmed → prep operatory |
| **event-condition** | Cancellation processed → waitlist offer |
| **verification-before-arrival** | Insurance verified → clinical prep note |

Dependencies reference **Action IDs** or **event conditions** ("when `lab_status_changed` received with status `received`").

### Blocked behavior

- Blocked Actions appear in Registry but Router marks them **non-actionable** until cleared  
- Escalation Monitor watches blocked Actions approaching parent `dueAt` — may promote parent or escalate  
- Completing a dependency **unblocks** dependents in one transaction — no duplicate notifications  

Circular dependencies are a Judgment bug — Registry rejects at ingest.

---

## 10. Escalation

Escalation is **time and trust protection** — not nagging.

### When escalation fires

| Trigger | Behavior |
|---------|----------|
| **dueAt approaching** — DNA warning window | Tier promotion or manager visibility — not second Action |
| **dueAt breached** | Escalate per DNA path — e.g., reception → manager → on-call |
| **critical unacknowledged** | Push to fallback responsibility |
| **blocked too long** | Escalate dependency owner, not blocked child |
| **integration failure** | Manager Action — not front desk retry loop |

### Escalation path (Office DNA)

```
primaryResponsibility
  → fallbackResponsibility (same tier)
  → manager (tier promotion)
  → on-call / owner (critical only, DNA-defined)
```

Each escalation appends to `escalation.history` — inspectable, not silent.

### Anti-patterns

| Forbidden | Why |
|-----------|-----|
| Duplicate Action on escalation | Same issue, one Action |
| Escalation without new evidence | Noise — tier promotion only |
| Infinite re-escalation | Cap at DNA max; then manager + `humanReviewNeeded` |
| Escalate informational tier | Should never have been an Action |

---

## 11. How Actions become completed

Completion is **human-accountable closure** — not checkbox theater.

### Completion paths

| Path | Who | Evidence |
|------|-----|----------|
| **Explicit complete** | Person completes Action | Outcome + optional note |
| **Explicit dismiss** | Person with responsibility | Reason — required for learning |
| **Detected complete** | System observes authoritative signal | PMS appointment created, comm log posted, callback call completed |
| **Auto-expire** | Escalation Monitor | `expiresAt` — no human fault implied |
| **Supersede** | New judgment | Old Action closed automatically |

Detected completion **suggests** closure — manager-configurable whether auto-close or confirm-first. Safety-critical and financial Actions default to **confirm-first**.

### Outcome record

Every terminal state writes an **Outcome**:

```
Outcome {
  actionId, terminalStatus   // completed | dismissed | expired | superseded
  completedAt, completedBy   // Person or system
  result                     // matched | alternate | not_applicable | stale
  actualVerb                 // what was actually done — if different
  expectedOutcomeMet         // boolean | partial | unknown
  notes                      // optional — team-facing
  externalRefs[]             // PMS comm log ID, appointment ID — not authoritative copy
  learningSignals[]          // friction, timing, dismiss reason category
}
```

### Completion ≠ PMS success

Completing "Verify Delta PPO" means the team **confirmed program level** — not that benefits were good. Completing "Offer waitlist" means **candidates were contacted per DNA** — not that the slot filled. Expected outcomes are operational, not clinical or financial guarantees.

### What completion emits

```
Action closed
  → Operational Event (action_completed | action_dismissed | action_expired)
  → Practice Memory update
  → Continuous Learning feed ([`CONTINUOUS_LEARNING_ENGINE.md`](CONTINUOUS_LEARNING_ENGINE.md))
  → End of Day carry-forward if expired unacted
```

---

## 12. How outcomes improve the practice

Actions exist to **close the improvement loop** ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §4.3):

```
Observe → Understand → Recommend → Act → Measure → Remember → Refine
                              ▲         │
                              └─ Action ┘
```

### What outcomes teach

| Outcome pattern | Learning destination | Effect |
|-----------------|---------------------|--------|
| Action completed quickly, expected met | Reinforce confidence for this verb + event pattern | Fewer false positives |
| Dismissed `not_applicable` | Calibration — was judgment wrong or timing wrong? | Adjust materialization threshold |
| Expired unacted | Capacity or routing signal | Manager review — not louder alerts |
| Escalated repeatedly | DNA or staffing mismatch | DNA candidate — human validated |
| Completed `alternate` | Team chose different valid path | Refine verb or expectedOutcome |
| Dependency often blocked | Workflow model fix | Reorder commitments |

### Learning rules (inherited from CLE)

- **No autonomous behavior change** — calibration adjusts confidence and thresholds; DNA changes require manager validation  
- **Per-practice only** — no cross-tenant patient learning  
- **Dismissal is data** — not defiance  
- **Sparse data → uncertainty** — not fabricated trends  

### Practice-level outcomes (aggregated)

Over weeks, Action outcomes feed **honest practice health** — not vanity metrics:

| Measure | Question |
|---------|----------|
| **Time-to-first-action** | Did judgment reach the owner fast enough? |
| **SLA adherence** | Callbacks and verifications before harm? |
| **Dismiss rate by category** | Is FreedomDesk wrong — or over-committing? |
| **Expiry rate** | Attention budget exceeded? |
| **Rework proxy** | Same patient, same verb re-opened within 48h? |
| **Escalation rate** | Routing or staffing stress? |

Owner and manager see **variance with evidence and uncertainty** — aligned with [`OPERATING_INTELLIGENCE.md`](OPERATING_INTELLIGENCE.md) §16 Owner filter. Not intraday task counts.

---

## 13. What Actions are NOT — anti task-manager rules

These rules are architectural. Violating them turns FreedomDesk into software the team learns to ignore.

| Rule | Enforcement |
|------|-------------|
| **No manual Action creation** | Humans dismiss, reassign, complete — they do not add FreedomDesk Actions |
| **No blank checklists** | One verb per Action — sub-steps live in dental workflow, not FreedomDesk |
| **No infinite queue** | DNA cap: max active Actions per responsibility per shift |
| **No duplicate noise** | Registry dedupe — same issue, one Action |
| **No priority inbox sorting** | Computed priority only — eliminates "organizing the organizer" |
| **No Action without because** | Every item cites evidence |
| **No stale badges** | expireAt + decay on terminal states |
| **No metric walls** | Counts serve learning — not homepage anxiety |
| **No autonomous close on clinical/financial** | Confirm-first defaults |
| **No replacement of PMS** | Actions coordinate; PMS records |

### The task-manager test

Before shipping any Action feature, ask:

> *Would Maria recognize this as "the system noticed something I would have owned anyway" — or as "another app giving me homework"?*

If homework, the design failed.

---

## 14. Relationship to sibling artifacts

| Artifact | Relationship to Action |
|----------|------------------------|
| **Operational Event** | Upstream fact — may update or create Actions |
| **Commitment** | Ephemeral Judgment output — materialized as Action |
| **Recommendation** | Sibling — suggestion below or beside Action threshold; accepted recommendations may merge into existing Action |
| **CallSummary action items** | Boundary judgment hints — ingested as events; Registry dedupes into Actions |
| **Morning Brief item** | May reference Action — not duplicate it |
| **RiskFlag** (Practice Brain) | High-severity flags materialize as Actions or escalate existing |
| **PMS task** | Downstream optional — completion evidence, not source of truth |

### Migration from today's codebase

| Today | Becomes |
|-------|---------|
| `Recommendation` | Judgment suggestion — may spawn Action when accepted or when threshold met |
| `CallSummary` action items | Event payload → Action via Commitment Extractor |
| `OperationalEvent.routing` | Hint — not Action |
| `RiskFlag` | Candidate for Action materialization |
| My Day "tasks" in preview data | Expression of Action Registry — not a separate task store |

---

## 15. Authority and document map

| Topic | Owning document |
|-------|-----------------|
| Moral law | [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) |
| Five responsibilities, event stream, Commitment | [`INTELLIGENCE_MODEL.md`](INTELLIGENCE_MODEL.md) |
| What operating intelligence is | [`OPERATING_INTELLIGENCE.md`](OPERATING_INTELLIGENCE.md) |
| Evidence contract, improvement loop | [`REASONING_PHILOSOPHY.md`](REASONING_PHILOSOPHY.md) |
| **Action architecture — this document** | **Canonical for Action** |
| Person, Responsibility, daily rhythm | [`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md) |
| Recommendations, Chief of Staff loops | [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) |
| Learning governance | [`CONTINUOUS_LEARNING_ENGINE.md`](CONTINUOUS_LEARNING_ENGINE.md) |
| Operational event types (implementation) | `src/events/types.ts` |
| Practice Brain types (transitional) | `src/practice-brain/types.ts` |

When implementing: **Constitution → Intelligence Model → this document → sibling specs → code**.

---

## Design tests

Before any Action behavior ships, answer yes to all:

| Test | Question |
|------|----------|
| **Judgment-born** | Was this Action created by Commitment — not user entry? |
| **Ten-second** | Can the owner act without interpretation labor? |
| **One issue** | Is dedupe key unique for this patient + verb + issue? |
| **Honest** | Is uncertainty visible on the Action? |
| **Accountable** | Is there exactly one primary responsibility? |
| **Temporal** | Does dueAt come from DNA — not invention? |
| **Closable** | Does completion produce an Outcome for learning? |
| **Decay** | Does terminal state leave the active queue? |
| **Not task manager** | Would Maria call this "homework" or "the system had my back"? |
| **Dental** | Is the verb specific enough — crown seat, verify program, callback? |

If any answer is no, the design is not ready.

---

## Closing

Operational Events say **what happened**. Judgment says **what matters**. Actions say **who must resolve it, by when, and why** — with evidence honest enough to trust and closure honest enough to learn.

FreedomDesk does not win by giving practices more tasks. It wins by **externalizing the commitments a great office manager already tracks in their head** — and closing them so nothing important decays into ambiguity.

Observe. Reason. Event. **Act.** Learn. Repeat.

That is the Action Engine.

---

*Established as the canonical Action Model for FreedomDesk. Surfaces and code catch up; the contract does not.*
