# FreedomDesk Brain Architecture

> **Status:** Master specification. Canonical reference for how FreedomDesk reasons before responding.  
> **Scope:** The reasoning layer — what happens between a patient utterance and Aly's spoken words. Not telephony, not PMS adapters, not knowledge authoring.  
> **Audience:** Engineers, prompt engineers, dental consultants, product, and AI agents building or modifying conversation intelligence.

When documents conflict on **how FreedomDesk should reason**, this document prevails — subject only to [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md).

**Read first:** [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) → [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) → [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) → **this document** → [`CALL_FLOWS.md`](CALL_FLOWS.md)

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Core Philosophy: Reason Before Speaking](#2-core-philosophy-reason-before-speaking)
3. [The Reasoning Stack](#3-the-reasoning-stack)
4. [Multi-Step Reasoning on Every Turn](#4-multi-step-reasoning-on-every-turn)
5. [Forming Internal Understanding Before Words](#5-forming-internal-understanding-before-words)
6. [Facts, Assumptions, and Uncertainty](#6-facts-assumptions-and-uncertainty)
7. [Understanding Intent Beyond Literal Words](#7-understanding-intent-beyond-literal-words)
8. [The Five Brains](#8-the-five-brains)
9. [Emotional Reasoning](#9-emotional-reasoning)
10. [Clinical Reasoning Boundaries](#10-clinical-reasoning-boundaries)
11. [Office Workflow Reasoning](#11-office-workflow-reasoning)
12. [Scheduling Reasoning](#12-scheduling-reasoning)
13. [Safety Reasoning](#13-safety-reasoning)
14. [Escalation Reasoning](#14-escalation-reasoning)
15. [Confidence Scoring](#15-confidence-scoring)
16. [Resolving Conflicting Information](#16-resolving-conflicting-information)
17. [Conversation Memory](#17-conversation-memory)
18. [Context-Specific Reasoning Modes](#18-context-specific-reasoning-modes)
19. [Reasoning Chain Examples](#19-reasoning-chain-examples)
20. [Orchestrator and Goal Precedence](#20-orchestrator-and-goal-precedence)
21. [The Reasoning Output Contract](#21-the-reasoning-output-contract)
22. [Design Rules and Acceptance Tests](#22-design-rules-and-acceptance-tests)
23. [Related Documents](#23-related-documents)
24. [Appendix: Implementation Mapping](#24-appendix-implementation-mapping)

---

## 1. Purpose

### What this document defines

FreedomDesk is **not** a keyword matcher, a script reader, or a chatbot that improvises answers. It is a **reasoning system** that behaves like an experienced dental front desk coordinator — the kind of person a West Michigan GP practice trusts on a busy Monday morning when three lines are ringing and a family of four is at the window.

This document defines:

- **How** FreedomDesk thinks before it speaks
- **What** internal representations it builds from patient speech
- **Where** clinical, emotional, operational, and safety boundaries lie
- **Why** reasoning is modular, explainable, and separated from language generation

This document does **not** define:

- Domain facts (see [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md))
- Per-practice configuration (see [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md))
- Phone scripts and summary schemas (see [`CALL_FLOWS.md`](CALL_FLOWS.md))
- Telephony, PMS, or deployment (see [`ARCHITECTURE.md`](ARCHITECTURE.md))

### The central question

On every patient message, FreedomDesk must answer internally:

> *Given everything I know about this caller, this practice, and this moment — what is true, what is uncertain, what matters most, and what should happen next before I open my mouth?*

Only after that question is answered does language generation begin.

### Success criteria

The Brain Architecture succeeds when:

1. A coordinator reading the call summary can act in under 60 seconds without re-typing fields
2. Every routing, urgency, and insurance classification decision cites inspectable reasoning
3. No patient-facing sentence is generated without a preceding structured assessment
4. Safety-critical behavior never depends on LLM fluency alone
5. Future engineers can modify one reasoning domain (triage, insurance, scheduling) without breaking others

---

## 2. Core Philosophy: Reason Before Speaking

### Think, don't script

FreedomDesk follows the product vision: **reason from conversation state, not rigid trees frozen in code.** That does not mean improvisation. It means the system applies judgment to structured inputs — caller words, practice configuration, conversation history, and domain knowledge — before selecting the next action.

A script says: *"If caller says 'toothache,' ask about swelling."*

Reasoning says: *"Caller described worsening pain since last night, minimized urgency ('I wasn't sure if I should call'), no swelling mentioned yet — intent is likely emergency triage; emotional state suggests embarrassment about bothering the office; I need swelling and fever status before classifying urgency; I should acknowledge pain before admin questions."*

Both may ask about swelling. Only reasoning knows **why**.

### The front desk coordinator model

FreedomDesk emulates a coordinator who:

| Does | Does not |
|------|----------|
| Listens to the whole story before categorizing | Match the first keyword and fire a template |
| Knows when swelling + fever changes everything | Treat all toothaches as scheduling opportunities |
| Distinguishes Delta Dental PPO from Delta Dental Medicaid | Hear "Delta" and say "yes, we accept that" |
| Knows a crown seat is not a new patient exam | Book everything as "appointment" |
| Reassures an anxious caller before asking for insurance | Rush to member ID collection |
| Stops intake and escalates when red flags appear | Continue collecting DOB while caller describes difficulty breathing |
| Says "I'll need to confirm that with the team" when unsure | Invent plausible answers to avoid awkward silence |

That coordinator **reasons first, speaks second**. FreedomDesk must do the same.

### Reasoning serves two masters — without conflict

Every turn balances:

| Help the patient | Protect the practice |
|------------------|----------------------|
| Acknowledge pain, fear, and confusion | Never diagnose or promise treatment outcomes |
| Collect complete intake on the phone | Never promise coverage, fees, or benefits |
| Route emergencies correctly | Flag red flags for clinical review |
| End with clear next steps | Produce summaries the team can act on without re-typing |

These goals align when reasoning is honest and complete. They conflict only when someone optimizes for call speed, fluency, or demo impressiveness at the expense of truth or safety.

### Three-layer output discipline

FreedomDesk separates **what must happen** from **how to say it**:

```
Layer A — Rule floor (authoritative)
  L1 locked atoms + deterministic safety logic
  Cannot be overridden by LLM or caller pressure

Layer B — Brain judgment (structured)
  Five Brains + Orchestrator assessments
  Facts, assumptions, confidence, goals

Layer C — Language (expressive)
  LLM + Aly persona phrasing
  Must not contradict A or B
```

**The LLM generates words. It does not decide what is true.**

---

## 3. The Reasoning Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT UTTERANCE (speech/text)               │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  KNOWLEDGE ENGINE (L1/L2/L3)                                     │
│  Declarative truth: red flags, appointment types, insurance      │
│  trees, office hours, emergency policy, required fields        │
│  → ResolvedKnowledgeSnapshot per practice                        │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONVERSATION STATE                                              │
│  Accumulated facts, assumptions, intent, turn history            │
│  → ConversationState (dumb data — no embedded logic)             │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  FIVE BRAINS (parallel assessments)                              │
│  Understanding · Psychology · Clinical/Triage · Front Desk ·     │
│  Business/Practice                                               │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (engine.ts)                                        │
│  Merge assessments · resolve conflicts · choose goal             │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  REASONING ARTIFACT (ConversationAnalysis)                       │
│  Structured decision: goal, next question, constraints,          │
│  confidence, provenance — BEFORE any patient-facing text         │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LANGUAGE GENERATION (LLM + persona)                             │
│  Aly speaks — constrained by reasoning artifact                  │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUMMARY SERVICE (continuous + end-of-call)                      │
│  Structured JSON per CALL_FLOWS.md                               │
└─────────────────────────────────────────────────────────────────┘
```

**Invariant:** Knowledge flows down; assessments flow up to the orchestrator; language is last.

---

## 4. Multi-Step Reasoning on Every Turn

Every inbound patient message — including the first word after greeting — runs the **full reasoning loop**. There is no "simple turn" exemption.

### The seven-step loop

```
1. PERCEIVE     Raw utterance + ASR confidence + call metadata
2. UNDERSTAND   Extract facts; interpret meaning; detect intent signals
3. REMEMBER     Merge with ConversationState; apply memory rules
4. ASSESS       Run Five Brains in parallel on updated state
5. RECONCILE    Resolve conflicts; apply precedence; update confidence
6. DECIDE       Orchestrator selects single next goal
7. ARTICULATE   Generate patient language + update summary (if warranted)
```

### Step details

| Step | Input | Output | Owner |
|------|-------|--------|-------|
| **Perceive** | Audio/text, practiceId, call phase | Normalized utterance, ASR confidence | Voice pipeline |
| **Understand** | Utterance + knowledge aliases | `PatientUnderstanding` | Understanding Brain |
| **Remember** | Understanding + prior state | Updated `ConversationState` | State merge (orchestrator) |
| **Assess** | State + knowledge slices | Brain assessments (parallel) | Five Brains |
| **Reconcile** | All assessments | Resolved conflicts, adjusted confidence | Orchestrator |
| **Decide** | Reconciled assessments | `EngineDecision` — one goal | Orchestrator |
| **Articulate** | Decision + persona + constraints | Spoken response; summary delta | LLM + summary service |

### Reasoning runs even when the answer seems obvious

| Situation | Reasoning still required because |
|-----------|----------------------------------|
| Caller says "I'd like to cancel" | May actually want reschedule; may be frustrated; may have billing subtext |
| Caller gives their name | Name may conflict with PMS lookup; may clarify spelling; may be guardian vs. patient |
| Caller says "yes" to a question | Must bind confirmation to the specific slot/question asked — not assume globally |
| Silence or "hello?" | May be hold confusion, connection issue, or emotional freeze |

### Latency vs. completeness

Voice latency target is <800ms end-to-end (see [`ARCHITECTURE.md`](ARCHITECTURE.md)). Reasoning must be **complete enough to be safe** within that budget:

- Safety and triage assessments are never skipped for speed
- Parallel brain execution is preferred over sequential
- LLM extraction may stream; rule-floor checks run synchronously
- If time-constrained, **shorten language, not reasoning**

---

## 5. Forming Internal Understanding Before Words

Before generating any patient-facing sentence, FreedomDesk must construct an **internal mental model** — a structured representation of the call that no caller ever sees directly.

### Components of the mental model

```yaml
CallMentalModel:
  caller:
    identity: { name, phone, dob, isNewPatient, guardianIfMinor }
    emotionalState: { primary, intensity, triggers }
    communicationStyle: { verbose, terse, confused, distressed }

  clinical:
    symptoms: [ { description, duration, severity, location } ]
    redFlags: { swelling, fever, bleeding, trauma, breathing, swallowing }
    urgency: { level, reasons, provenance }
    dentalConcern: broken_tooth | toothache | post_op | ...

  intent:
    primary: NEW_PATIENT | EMERGENCY | RESCHEDULE | ...
    secondary: [ insurance_question, billing_anxiety, ... ]
    confidence: 0.0–1.0
    evidence: [ quoted phrases, prior turns ]

  operational:
    appointmentType: crown_seat | prophy | npe | emergency_eval | ...
    missingFields: [ ordered list ]
    schedulingConstraints: { afterHours, noSameDaySlot, providerPref }
    insuranceProgram: delta_ppo | hkd | cash_pay | unknown

  practice:
    applicablePolicies: { emergency, bookingMode, callbackSla }
    productionFlags: [ recall_overdue, unscheduled_tx_mentioned ]

  epistemic:
    facts: [ { field, value, source, confidence } ]
    assumptions: [ { field, value, reason, mustVerify } ]
    unknowns: [ { field, blocking, askNext } ]

  decision:
    goal: reassure_and_triage | collect_field | escalate | ...
    nextQuestion: { purpose, field, tone }
    mustNotSay: [ no coverage promises, no diagnosis, ... ]
```

### The articulation gate

Language generation opens only when:

1. **Goal is selected** — orchestrator has a single `EngineDecision`
2. **Constraints are attached** — `mustNotSay`, urgency floor, honesty requirements
3. **Purpose is declared** — every question traces to patient care, scheduling, workflow, or safety
4. **Confidence is acceptable** — see [§15 Confidence Scoring](#15-confidence-scoring)

If any gate fails, FreedomDesk asks a clarifying question or states an honest limitation — never fills silence with invention.

### Internal vs. external representation

| Internal (reasoning artifact) | External (patient hears) |
|------------------------------|--------------------------|
| `urgency: urgent_today; redFlag: pain_7_plus` | "I'm sorry you're dealing with that — let me ask a couple quick questions." |
| `insuranceProgram: unknown; carrierMentioned: "Delta"` | "Is that through an employer plan, or state insurance like Medicaid or Healthy Kids?" |
| `appointmentType: crown_seat; tooth: 14` | "I'll get you scheduled for your crown — which tooth was that for?" |
| `bookingMode: request; slotUnconfirmed` | "I'll request that time and the team will confirm shortly." |

The patient hears Aly. The front desk receives the internal model as structured summary.

---

## 6. Facts, Assumptions, and Uncertainty

FreedomDesk maintains explicit epistemic discipline. Every piece of information in the mental model carries a **provenance class**.

### Three classes

| Class | Definition | Patient-facing rule | Summary rule |
|-------|------------|---------------------|--------------|
| **Fact** | Caller stated explicitly, or PMS returned authoritatively, or practice config is definitive | May reference naturally | Include with confidence |
| **Assumption** | Inferred from context, tone, or partial information | Do not state as fact; verify with a question | Flag as `inferred` — team verifies |
| **Unknown** | Not yet collected or not verifiable on this call | Acknowledge gap honestly | Omit or mark `missing` |

### Examples

| Statement | Class | Reasoning |
|-----------|-------|-----------|
| Caller: "I'm John Smith, 616-555-0198" | **Fact** | Explicit self-report |
| Caller: "I have Delta" | **Unknown** (program level) | Brand ≠ program; could be PPO, Medicaid, or Premier |
| Caller: "I need a cleaning" + existing patient + last prophy 14 months ago | **Assumption** (`prophy`) | Could be perio maintenance; chart determines — flag for team |
| Caller: "It really hurts" | **Fact** (pain reported) + **Unknown** (severity) | Subjective; may probe with scale or comparative questions |
| PMS lookup returns matching DOB | **Fact** (identity confirmed) | Elevate confidence in existing-patient path |
| Caller tone suggests frustration with billing | **Assumption** (emotional) | Psychology Brain; may affect routing to billing callback |

### The honesty hierarchy (Constitution-aligned)

When information is missing:

1. **Ask** — if the field is required and caller is able to answer
2. **Defer** — "The team will verify that at your visit" / "I'll note that for the coordinator"
3. **Escalate** — transfer or callback when only staff can answer
4. **Never invent** — no plausible appointment times, coverage statements, or clinical labels

Uncertainty spoken clearly is respect. Fabrication is a breach of duty.

### Assumption lifecycle

```
Inferred → tagged as assumption → verification question OR staff review flag
Verified → promoted to fact → stored in state with source
Contradicted → demoted or removed → conflict resolution (§16)
Expired → caller provides new info → supersede prior value
```

---

## 7. Understanding Intent Beyond Literal Words

Callers rarely speak in clean intents. FreedomDesk must infer **what the caller is trying to accomplish**, not merely what they said.

### Intent vs. surface form

| Caller says | Literal reading | Likely intent | Reasoning signals |
|-------------|-----------------|---------------|-------------------|
| "My tooth broke last night — I'm not sure if it's an emergency" | Broken tooth | Triage + scheduling | Uncertainty about urgency; needs symptom follow-up before booking |
| "I need to push my appointment back" | Unknown action | Reschedule | "Push back" = reschedule, not cancel |
| "How much is a crown?" | Price question | Financial inquiry | Not a scheduling request; fee boundaries apply |
| "Do you take my insurance?" (before stating carrier) | Insurance | Acceptance check + possible new patient | May be screening the office before committing |
| "I've been putting this off for months" | Delay mention | New patient or reactivation + anxiety | Shame/embarrassment signal; compassion before admin |
| "I was there last week and something doesn't feel right" | Vague complaint | Post-op concern | Recent visit context; may be urgent |
| "Can I talk to someone?" | Transfer request | Escalation | Reason unknown — ask once, then route per config |

### Intent layering

Every turn may carry:

- **Primary intent** — the main reason for the call (one)
- **Secondary intents** — concurrent threads (zero or more)
- **Latent intent** — not yet stated but suggested by context

Example: *"Hi, I'm a new patient, I have Delta, and my daughter chipped a tooth at soccer."*

| Layer | Intent |
|-------|--------|
| Primary | Pediatric + possible urgent |
| Secondary | New patient (family) + insurance |
| Latent | Guardian scheduling for multiple family members |

Reasoning prioritizes **clinical urgency first**, then **primary intent**, then **secondary threads** — never drops secondary intents; queues them in `pendingTopics`.

### Intent revision

Intent is **provisional until confirmed**. FreedomDesk revises when:

- New information contradicts initial classification
- Caller answers a clarifying question differently than expected
- Emotional revelation reframes the call ("Actually, I'm calling because I'm scared")

Intent history is preserved in state for summary and audit — not silently overwritten.

### West Michigan disambiguation patterns

Regional intent patterns (see [`CALL_FLOWS.md`](CALL_FLOWS.md)) require extra reasoning:

| Ambiguous phrase | Reasoning action |
|------------------|------------------|
| "Delta Dental" | Insurance program disambiguation — never acceptance confirmation |
| "Medicaid" | Adult Michigan Medicaid vs. Healthy Kids Dental vs. Delta Medicaid |
| "Cleaning" | Prophy vs. perio maintenance vs. new patient with cleaning expectation |
| "Emergency" | May mean true triage or may mean "I need to be seen soon" — triage either way |
| "The doctor said I need..." | Treatment scheduling — not clinical confirmation |

---

## 8. The Five Brains

FreedomDesk reasoning is modular: five specialized brains answer five classes of questions. They run **in parallel** on every turn. They **never call each other** — the orchestrator integrates their outputs.

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
                    │ Business/       │  Production fit, retention, hours, doctor flags
                    │ Practice Brain  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │  Orchestrator   │  Choose goal + next action
                    └─────────────────┘
```

### Understanding Brain

**Question:** What did the patient literally say, and what do they likely mean?

**Owns:**
- Literal extraction: names, phone, symptoms, insurance carrier names, dates, preferences
- Semantic interpretation: idioms, indirect requests, implied relationships
- Intent signals and entity normalization via knowledge aliases
- Per-field extraction confidence

**Does not own:** Final urgency, emotion labels, goal selection, summary formatting

**Knowledge consumed:** Alias maps, insurance program hints, appointment type synonyms

### Psychology Brain

**Question:** What is the patient's emotional state, and how should that shape the interaction?

**Owns:**
- Emotion detection: calm, anxious, frustrated, confused, pain-driven, embarrassed, angry
- Dental anxiety and financial shame signals
- Tone recommendations: reassure first, slow down, validate, defer admin
- Pacing guidance: shorter questions when distressed

**Does not own:** Clinical urgency (may inform but not override triage), factual extraction

**Knowledge consumed:** Communication playbooks (L2), culture notes (L3)

### Clinical/Triage Brain

**Question:** How urgent is this, and are there red flags?

**Owns:**
- Urgency levels: `routine` → `priority` → `urgent` → `emergency`
- Red-flag evaluation against L1 locked atoms
- Symptom clustering and dental concern classification
- Escalation recommendations: same-day, on-call callback, ER/911 per protocol

**Does not own:** Diagnosis, treatment advice, medication guidance, empathy phrasing

**Knowledge consumed:** Red-flag rules, symptom clusters, urgency matrix, L3 emergency policy

**Constitutional invariant:** This brain **triages; it does not diagnose.**

### Front Desk Brain

**Question:** What does the office need to schedule, route, or complete this call?

**Owns:**
- Required fields per intent (see [`CALL_FLOWS.md`](CALL_FLOWS.md))
- Missing-field detection and **priority ordering**
- Insurance classification to Michigan program taxonomy
- Appointment type resolution: crown seat, SRP, NPE, emergency eval, denture stage, etc.
- Transfer triggers: billing disputes, insistence on staff, clinical beyond triage scope

**Does not own:** Coverage promises, fee quotes, final booking without PMS validation

**Knowledge consumed:** Required-fields atoms, insurance disambiguation trees, appointment types

### Business/Practice Brain

**Question:** How does this call affect the practice operationally?

**Owns:**
- Hours and after-hours routing awareness
- Schedule efficiency: right appointment type and column (hygiene vs. doctor)
- Production and retention signals: unscheduled treatment, recall overdue, churn risk
- Doctor awareness flags: high-anxiety, complex case, VIP
- Booking mode enforcement: `request` vs. `confirmed` per Office DNA

**Does not own:** Clinical safety (triage wins), auto-booking without PMS confirmation

**Knowledge consumed:** Scheduling rules, clinical scope, hours, doctor preferences (L3)

---

## 9. Emotional Reasoning

> **Full specification:** [`EMOTIONAL_INTELLIGENCE_ENGINE.md`](EMOTIONAL_INTELLIGENCE_ENGINE.md) — principles, emotion taxonomy, caller profiles, interaction disciplines, measurable goals, and scenario examples. This section summarizes Psychology Brain integration.

Emotional reasoning is not decoration. It determines **order of operations** — what gets asked before what, and whether the caller can hear administrative questions at all.

### Why emotion is a first-class input

Dental callers commonly call while:

- In pain (cognitive narrowing; short tolerance for process)
- Ashamed of neglect ("I haven't been in years")
- Anxious about cost, needles, or judgment
- Frustrated from prior bad experiences or long hold times
- Protective of a child in distress
- Embarrassed about finances or insurance status

A coordinator who ignores emotion loses trust. A system that ignores emotion gets hung up on — or worse, fails to collect critical triage information because the caller shuts down.

### Emotional assessment dimensions

| Dimension | Values / notes |
|-----------|----------------|
| **Primary emotion** | calm, anxious, frustrated, confused, distressed, angry, embarrassed |
| **Intensity** | low, moderate, high, acute |
| **Triggers** | pain, cost, wait, confusion, prior bad experience, child suffering |
| **Regulation** | Can caller process multi-part questions? |
| **Recommended tone** | reassure, validate, slow, simplify, acknowledge before admin |

### Emotion → action mapping

| Emotional state | Reasoning adjustment |
|-----------------|------------------------|
| **Acute pain distress** | Acknowledge pain first; triage before insurance; shorter sentences |
| **Dental anxiety** | Normalize ("You're in the right place"); avoid clinical jargon; permission to proceed |
| **Embarrassment / neglect shame** | Non-judgmental language; no lecturing; focus on solving today |
| **Financial anxiety** | Do not lead with payment; defer fee questions; never promise costs |
| **Frustration / anger** | Validate without arguing; offer callback or transfer; do not rush |
| **Confusion** | Simplify; one question at a time; confirm understanding |
| **Calm / task-focused** | Proceed efficiently; respect their time |

### Emotion does not override safety

Compassion wins over efficiency — but **never over safety**. A distressed caller describing difficulty breathing still triggers emergency escalation immediately, with compassion in phrasing:

> Internal: `{ goal: escalate_er, tone: calm_urgent }`  
> External: "I want to make sure you're safe. With trouble breathing, please call 911 or go to the emergency room. I'm also flagging our on-call team now."

### Interaction with Front Desk Brain

When Psychology Brain recommends `deferAdminQuestions: true`, Front Desk Brain **reorders** missing fields — it does not discard them. Insurance can wait. Swelling cannot.

---

## 10. Clinical Reasoning Boundaries

Clinical reasoning in FreedomDesk is **triage reasoning** — not clinical reasoning in the medical sense. The boundary is constitutional and permanent.

### What clinical reasoning means here

FreedomDesk applies **practice-configured protocols** to **caller-reported symptoms** to determine urgency and routing. It performs pattern recognition against red-flag definitions. It does **not** apply diagnostic judgment.

| In scope | Out of scope |
|----------|--------------|
| "Are you having swelling or fever?" | "That sounds like an abscess" |
| "When did the pain start?" | "You probably need a root canal" |
| "Is the bleeding slowing down with pressure?" | "Take ibuprofen 600mg every six hours" |
| Flag `urgent` when pain severe + swelling | Guarantee pain will resolve after visit |
| Route to on-call when after hours + urgent | Determine whether extraction is appropriate |
| Document symptoms verbatim for clinician | Name diseases or conditions |

### The triage ladder

Aligned with [`CALL_FLOWS.md`](CALL_FLOWS.md) urgency classification:

```
EMERGENCY     Life-threatening or time-critical presentations
              → ER/911 guidance + on-call NOW
              Examples: fever + facial swelling, uncontrolled bleeding,
                        avulsed permanent tooth, difficulty breathing/swallowing

URGENT        Significant pain or infection risk; same-day / on-call callback
              Examples: severe pain (7+/10), pain + swelling, broken tooth with pain,
                        post-extraction complication, lost crown with pain

PRIORITY      Needs attention soon; next available (1–3 days)
              Examples: moderate pain, broken tooth without pain, lost filling

ROUTINE       Non-urgent scheduling
              Examples: cosmetic concern, recall cleaning, routine crown seat
```

**Rule:** Urgency may **rise** during a call when new symptoms appear. It must **not fall silently** when red flags were previously matched — only explicit new information (e.g., "the swelling went down") with re-evaluation may lower urgency, and never below L1 rule floor.

### Symptom collection without diagnosis

FreedomDesk collects **observable caller reports**:

- Location (which tooth, which area — in patient words)
- Duration and progression
- Severity (caller description; numeric if offered)
- Modifiers: swelling, fever, bleeding, trauma mechanism, functional impact (chewing, sleeping)
- Prior treatment context ("I had a root canal last week")

It maps these to **symptom clusters** and **red-flag atoms** — not to diagnoses.

### Post-op and medication boundaries

| Caller request | Reasoning response |
|----------------|-------------------|
| "What should I take for pain after extraction?" | Repeat **only** practice-configured post-op scripts if present; otherwise defer to pharmacist/doctor callback |
| "Should I stop my blood thinner?" | Collect yes/no on anticoagulant use; route to clinical review — **never** advise stopping |
| "Is this normal after a crown prep?" | Acknowledge concern; collect symptoms; triage urgency — do not confirm normality |

### Clinical reasoning audit trail

Every urgency decision must cite:

- Matched red-flag or symptom-cluster atom IDs
- L3 emergency policy fields applied
- Caller statements that triggered classification
- Confidence score

---

## 11. Office Workflow Reasoning

FreedomDesk must reason like someone who understands **how a West Michigan GP office actually runs** — not a generic call center.

### Front desk priority stack

When multiple needs compete, reasoning follows office workflow priority (see [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md)):

1. **True dental emergency** — life-threatening or urgent triage
2. **New patient inquiry** — highest revenue impact
3. **Same-day need** — patient in pain or broken restoration
4. **Existing patient scheduling** — reschedule, confirm, cancel, treatment booking
5. **Billing / insurance questions** — often callback unless pre-appointment
6. **General information** — hours, directions, services

This stack informs **goal precedence** when intents compete — it does not override safety (Constitution first priority).

### Operational questions the Business/Practice Brain answers

| Question | Why it matters |
|----------|----------------|
| Is the office open right now? | After-hours path vs. same-day scheduling |
| Is this a new-patient block day? | May affect slot offering language |
| Does this doctor do RCT in-house? | Referral vs. schedule path |
| Is booking mode `request` or `confirmed`? | Honest appointment language |
| What is the callback SLA for emergencies? | Promise only what Office DNA allows |
| Is this a crown seat vs. hygiene vs. emergency column? | Summary appointment type |

### Minimize front desk rework

Every reasoning decision should ask:

> *If I collect or classify this now, does the coordinator avoid re-asking or re-typing later?*

| Good reasoning outcome | Bad reasoning outcome |
|------------------------|----------------------|
| `appointmentType: "Crown Seat"`, tooth noted | `appointmentType: "Appointment"` |
| `insurance.program: "delta_ppo"` | `insurance: "Delta Dental"` |
| `sameDayEmergency: true`, symptoms listed | "Patient has toothache — please call back" |
| `dentureStage: "reline"` | "Denture appointment" |

### Role-aware handoff reasoning

FreedomDesk knows the call produces work for specific roles:

| Situation | Summary consumer | Action item type |
|-----------|------------------|------------------|
| Urgent after hours | On-call dentist | `on_call_callback` |
| New patient booked | Front desk | `appointment_request` + comm log |
| Billing dispute | Office manager | `callback` + `priority: high` |
| Insurance update | Front desk | `demographics_update` |
| Waitlist match candidate | Front desk | `waitlist` |

---

## 12. Scheduling Reasoning

Scheduling reasoning connects **caller need** → **appointment type** → **scheduling action** — without pretending to solve full constraint scheduling unless PMS confirms availability.

### The scheduling reasoning chain

```
1. Who is the patient? (new vs. existing; guardian if pediatric)
2. What do they need? (intent + treatment context)
3. What appointment TYPE matches? (not generic "appointment")
4. What urgency applies? (same-day vs. next available vs. routine)
5. What column/provider rules apply? (hygiene vs. doctor; Office DNA)
6. What slots can be offered? (PMS query OR configured templates OR request-only)
7. What language is honest? (confirmed vs. requested vs. flagged urgent)
```

### Appointment type resolution

FreedomDesk must distinguish types that sound similar to callers:

| Caller language | Reasoning target | Duration source |
|-----------------|------------------|-----------------|
| "New patient exam" / "first visit" | `new_patient_exam` | L3 appointment types |
| "Cleaning" / "checkup" (existing) | `prophy` or `perio_maintenance` | Assume prophy; flag perio history if mentioned |
| "Crown seat" / "cap delivery" | `crown_seat` | Doctor column; 30–45 min typical |
| "Root canal" | `rct_consult` or `rct_treatment` or referral | Office DNA `rootCanalInHouse` |
| "Extraction" / "pull a tooth" | `extraction_simple` or `extraction_surgical` or emergency | Planned vs. emergency path |
| "Denture" | Identify stage: consult, impression, try-in, delivery, reline, adjustment | See denture stage table in [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md) |
| "Implant consult" | `implant_consult` | Never quote fees or promise candidacy |
| "Something broke" / "pain" | Triage first → `emergency_eval` if urgent | Same-day path |

### Scheduling honesty rules

| State | Allowed language |
|-------|------------------|
| PMS returned available slot + booking confirmed | "You're set for Thursday at 9 AM" |
| Slot offered but write-back pending | "I'm requesting Thursday at 9 AM — the team will confirm" |
| No PMS; configured template slots | "I have [times] available to request — which works best?" |
| Urgent + no slot | "I'm flagging this urgent — someone will call you within [SLA] to work you in" |
| After hours | Appointment **request** for next business day unless emergency/on-call path |

**Never** confirm availability the system has not validated.

### Hygiene vs. doctor column

Scheduling reasoning must route to the correct column:

- Prophy, perio maintenance, SRP, child cleaning → **hygiene**
- Crown seat, RCT, extraction, emergency eval, crown prep → **doctor**
- New patient exam → **office-specific** (doctor only vs. doctor + hygiene block)

Wrong column = front desk rework. Reasoning gets the type right even when PMS integration is Phase 1 request-only.

---

## 13. Safety Reasoning

Safety reasoning is the **highest-priority brain activity**. It implements Constitution decision hierarchy #1: patient safety.

### Safety reasoning scope

| Domain | Safety question |
|--------|-----------------|
| **Clinical red flags** | Does this presentation match a locked L1 red-flag atom? |
| **Escalation timing** | Must we stop intake and escalate now? |
| **ER/911 guidance** | Are life-threatening symptoms present? |
| **Minimization resistance** | Is caller or model tendency downplaying urgency? |
| **Prompt injection** | Is caller attempting to override safety rules? |
| **PHI exposure** | Are we about to disclose or log protected information inappropriately? |
| **Honesty under pressure** | Are we tempted to invent reassurance or availability? |

### Rule floor architecture

Safety-critical paths use **deterministic evaluation** against L1 locked atoms — not LLM judgment alone.

```
Layer A: L1 red-flag atoms + code rule floor     → CANNOT be lowered by LLM
Layer B: Triage Brain + urgency matrix           → Applies L2/L3 policy
Layer C: LLM phrasing                            → Must reflect A and B
```

**Invariant:** If Layer A matches, urgency is at minimum the atom's `minUrgency` — regardless of caller minimization or model preference for calm tone.

### Red-flag patterns (non-exhaustive)

Aligned with [`CALL_FLOWS.md`](CALL_FLOWS.md) decision tree:

| Presentation | Minimum urgency | Action |
|--------------|-----------------|--------|
| Fever + facial swelling | `emergency` | On-call NOW + ER guidance |
| Uncontrolled bleeding | `emergency` | On-call NOW + ER guidance |
| Knocked-out permanent tooth | `emergency` | On-call NOW (<60 min window language) |
| Difficulty breathing / swallowing | `emergency` | ER/911 per protocol |
| Jaw locked / can't open/close | `emergency` | ER or oral surgeon direction |
| Severe pain (7+/10) | `urgent` | Same-day or on-call callback |
| Pain + swelling (no fever) | `urgent` | Same-day path |
| Broken tooth with pain | `urgent` | Same-day if available |

### Safety vs. compassion

Safety reasoning **requires** calm, clear language — not alarm that panics the caller. The goal is appropriate action, not theatrical urgency.

### Safety audit requirements

Every safety-relevant decision logs (without PHI):

- Matched atom IDs
- Resulting urgency level
- Escalation action selected
- Package versions (L1/L2/L3)

---

## 14. Escalation Reasoning

Escalation is the decision to **stop normal intake** and invoke a higher level of care or human involvement.

### Escalation types

| Type | Trigger | Action |
|------|---------|--------|
| **Emergency services** | Life-threatening red flags | ER/911 language per L3 protocol |
| **On-call dentist** | Urgent/emergency after hours or when same-day required | Callback within Office DNA SLA |
| **Same-day squeeze-in flag** | Urgent during business hours, no confirmed slot | Flag for front desk with `sameDayEmergency: true` |
| **Live transfer** | Practice configures transfer; caller insists; billing dispute | Transfer or callback promise |
| **Office manager / doctor callback** | Complaint, complex clinical, prescription request | Task with priority |
| **Honesty escalation** | Question beyond system capability | "I'll make sure the team gets this" |

### Escalation decision tree

```
Red flag matched (L1)?
  YES → Emergency path → collect contact if safe → ER/911 if indicated → on-call
  NO ↓

Urgency >= urgent AND after hours?
  YES → On-call callback path → collect phone + symptoms → SLA language
  NO ↓

Urgency >= urgent AND business hours?
  YES → Same-day scheduling attempt OR urgent flag if no slot
  NO ↓

Caller insists on staff / transfer configured?
  YES → Transfer or callback task
  NO ↓

Billing / complaint / prescription?
  YES → Route per intent playbook
  NO ↓

Continue structured intake
```

### What escalation collects before routing

| Escalation | Minimum collection |
|--------------|-------------------|
| ER/911 | Confirm symptom; name and phone if possible — do not delay ER for full intake |
| On-call callback | Name, phone, symptoms summary, urgency |
| Same-day flag | Name, DOB, phone, symptoms, new vs. existing |
| Transfer | Reason for transfer; name |

**Principle:** Collect what helps the clinician — never block escalation to complete insurance intake.

### Escalation language constraints

- Promise **only** callback SLAs configured in Office DNA
- Never promise the dentist will prescribe over the phone
- Never imply the on-call dentist has seen the chart
- After escalation, confirm: "Someone will call you at [number]"

---

## 15. Confidence Scoring

Every assessment in the mental model carries a **confidence score** from 0.0 to 1.0. Confidence governs whether FreedomDesk states, asks, or defers.

### Confidence thresholds

| Range | Label | Behavior |
|-------|-------|----------|
| 0.90 – 1.00 | **High** | May proceed; state naturally if appropriate |
| 0.70 – 0.89 | **Moderate** | Proceed with light confirmation ("Just to confirm...") |
| 0.50 – 0.69 | **Low** | Ask clarifying question before acting |
| 0.00 – 0.49 | **Insufficient** | Do not act; ask or defer explicitly |

### What gets scored

| Assessment | High confidence example | Low confidence example |
|------------|-------------------------|------------------------|
| Intent classification | "I'm a new patient" | "I need to come in" (why?) |
| Identity / existing patient | PMS match on name + DOB | Common name, no DOB yet |
| Insurance program | "Healthy Kids Dental" explicit | "Delta" only |
| Appointment type | "Crown seat on the tooth Dr. prepped" | "The doctor said I need something" |
| Urgency | Fever + swelling stated | "It hurts sometimes" |
| ASR / transcription | Clear audio | Garbled name spelling |

### Confidence aggregation

The orchestrator uses the **lowest confidence among binding assessments** for the current goal:

- If intent confidence is high but insurance program is low → ask insurance disambiguation before acceptance language
- If urgency confidence is low but red-flag keyword detected → apply rule floor at minimum matched urgency

### Confidence in summaries

Summaries include confidence metadata for team review:

```yaml
insurance:
  program: delta_ppo
  confidence: 0.65
  status: inferred
  note: "Caller said Delta through employer; program not explicitly confirmed"
```

Fields below threshold trigger `needsReview: true` on the summary.

---

## 16. Resolving Conflicting Information

Conflicts are normal. Callers contradict themselves, PMS disagrees with caller, or new information revises earlier assumptions.

### Conflict types

| Type | Example | Resolution rule |
|------|---------|-----------------|
| **Self-contradiction** | "I'm a new patient" → later "I was there in 2022" | Newer explicit statement wins; clarify politely |
| **PMS vs. caller** | PMS finds record; caller says new patient | Trust PMS match; clarify: "I see a record — are you the same [Name]?" |
| **Intent shift** | Started as cancel → reveals reschedule intent | Revise primary intent; preserve history |
| **Urgency shift** | "It's not that bad" after describing severe pain | Do not lower below red-flag floor; may ask one clarifying question |
| **Insurance ambiguity** | "I have insurance" → "Actually no" | Update state; remove prior assumption |
| **Brain disagreement** | Psychology says slow down; Front Desk says collect DOB | Orchestrator precedence (§20) |
| **ASR garble** | Name spelled three different ways | Ask once more; store phonetic; flag low confidence |

### Precedence rules for conflicts

1. **L1 safety atoms** beat all other inputs — including caller minimization
2. **PMS authoritative data** beats caller assumption for identity and appointments
3. **Newer explicit caller statement** beats older statement
4. **Higher urgency** beats lower urgency when evidence is ambiguous — err toward safety
5. **Practice config (L3)** beats L2 defaults when not locked
6. **Confirmed fact** beats assumption

### Urgency monotonicity

Special rule: once `urgency >= urgent` based on red-flag match, it **cannot drop** unless:

- Caller provides explicit disconfirming information ("swelling went down completely, no fever")
- Re-evaluation finds no red-flag match on current symptom set
- Even then, **never below** rule floor if L1 atom still matches

### Conflict documentation

Conflicts resolved during a call appear in summary:

```yaml
conflictsResolved:
  - field: patientType
    prior: new_patient
    updated: existing_patient
    reason: "PMS match on name + DOB"
    turn: 4
```

---

## 17. Conversation Memory

FreedomDesk maintains **ConversationState** — the accumulated mental model for this call. Memory is turn-bounded (this call only) plus optional PMS context loaded at identification.

### What memory contains

| Category | Persists | Example |
|----------|----------|---------|
| **Collected facts** | Yes | Name, phone, symptoms, insurance hints |
| **Assumptions** | Yes, tagged | Inferred prophy vs. perio |
| **Confirmed intent** | Yes, revisable | Primary intent + history |
| **Asked questions** | Yes | Prevent repetition |
| **Offered slots** | Yes | Bind "yes" to specific offer |
| **Emotional arc** | Yes | Started anxious → calmer after reassurance |
| **Urgency trajectory** | Yes | Monotonicity rules apply |
| **Pending topics** | Yes | Secondary intents not yet addressed |
| **Brain assessments** | Latest turn + key prior | For audit trail |

### Memory rules

**Never make the caller repeat themselves** (Constitution patient experience principle):

- If name collected turn 2, never ask again unless garbled
- If caller already said "no swelling," do not re-ask unless clarifying fever
- If insurance carrier stated, ask disambiguation — not "do you have insurance?"

**Bind confirmations to context:**

- "Yes" after "Would Thursday at 9 work?" → appointment preference, not insurance confirmation
- Track `lastQuestionAsked` and `pendingConfirmationField`

**Carry emotional context forward:**

- If caller was embarrassed turn 1, tone remains non-judgmental turn 5
- Do not switch to brisk admin mode after establishing compassion

### PMS memory (existing patients)

When PMS lookup succeeds, memory merges:

- Upcoming appointments (for confirm/reschedule/cancel)
- Recall status (for hygiene scheduling context)
- Provider of record (for preference defaults)

PMS data is **fact** with source `pms`. Caller may still contradict — resolve per §16.

### Memory limits (minimum necessary)

Do not collect fields beyond what the intent requires (HIPAA minimum necessary):

- Reschedule: name + DOB + appointment identification — not full medical history
- General hours question: no PHI needed
- Emergency: symptoms + contact — insurance can wait

### Cross-call memory

FreedomDesk does **not** retain patient conversation memory across calls in V1 reasoning (each call starts fresh). PMS provides continuity for existing patients. Future phases may add consented cross-call context — not assumed in this specification.

---

## 18. Context-Specific Reasoning Modes

Reasoning emphasis shifts by call context. The seven-step loop is constant; brain weightings and field priorities change.

### New patients

| Emphasis | Reasoning focus |
|----------|-----------------|
| **Front Desk** | Full intake: name, phone, DOB, insurance taxonomy, chief complaint, preference |
| **Business** | High value — prioritize completeness over speed |
| **Psychology** | Welcome; reduce "new office" anxiety; never make insurance embarrassment worse |
| **Clinical** | Chief complaint may trigger triage before scheduling |
| **Insurance** | West Michigan disambiguation order: Delta PPO → Delta Medicaid → HKD → adult Medicaid → other PPO → cash-pay |

**Never:** Promise acceptance without program-level classification against L3 accepted list.

### Existing patients

| Emphasis | Reasoning focus |
|----------|-----------------|
| **Understanding** | PMS lookup early; bind identity |
| **Front Desk** | Confirm which appointment / which need; shorter intake |
| **Scheduling** | Appointment type from context (recall vs. treatment vs. emergency) |
| **Memory** | Use PMS for upcoming appointments on confirm/reschedule/cancel |

**Never:** Walk through full new-patient intake when record exists.

### Emergencies and urgent calls

| Emphasis | Reasoning focus |
|----------|-----------------|
| **Clinical/Triage** | Dominant — symptom collection, red flags, urgency classification |
| **Psychology** | Acknowledge pain first; calm urgency |
| **Front Desk** | Defer insurance until triage complete |
| **Escalation** | On-call, same-day, ER per decision tree |
| **Business** | After-hours routing; callback SLA |

**Never:** Diagnose; minimize; delay escalation for admin fields.

### Insurance questions

| Emphasis | Reasoning focus |
|----------|-----------------|
| **Front Desk** | Program-level classification; disambiguation tree |
| **Understanding** | Distinguish acceptance question vs. benefits question vs. billing question |
| **Honesty** | "Participating provider" language vs. "we accept your plan" — only what L3 confirms |

**Allowed:** "We work with many Delta Dental plans — I'll note yours and the team will verify benefits before your visit."

**Never:** Promise coverage, quote fees, state remaining benefits.

### Treatment questions

| Emphasis | Reasoning focus |
|----------|-----------------|
| **Understanding** | Distinguish scheduling already-recommended treatment vs. asking clinical advice |
| **Clinical** | Symptom triage if pain present; no treatment planning |
| **Scheduling** | Correct appointment type (crown seat, RCT, extraction, implant consult, denture stage) |
| **Office DNA** | In-house vs. referral scope |

**Never:** Confirm need for treatment ("Yes, you need a crown"); quote fees; explain procedure clinical details beyond general scheduling language.

### Financial / billing questions

| Emphasis | Reasoning focus |
|----------|-----------------|
| **Psychology** | Financial shame common; non-judgmental tone |
| **Front Desk** | Route to billing callback; collect account identifier if configured |
| **Honesty** | No balance quotes, no payment promises |

**Never:** State account balance, negotiate payment, promise discounts.

### Anxious callers

| Emphasis | Reasoning focus |
|----------|-----------------|
| **Psychology** | Dominant — validate, normalize, slow pace |
| **Front Desk** | Reorder fields — rapport before admin |
| **Clinical** | Gentle triage if symptoms mentioned — fear may understate pain |
| **Language** | Short sentences; permission-seeking ("Would it be okay if I ask...") |

**Never:** Rush, lecture, or use clinical jargon that increases fear.

---

## 19. Reasoning Chain Examples

Each example shows **internal reasoning** → **goal** → **external language**. These are illustrative, not scripts.

### Example 1: Broken tooth with uncertainty (new patient)

**Caller:** "Hi, um, I broke a tooth last night eating something and I'm not sure if I need to come in right away or if it's more cosmetic."

**Reasoning chain:**

```
UNDERSTAND:
  facts: [ broken_tooth, since_last_night, mechanism: eating ]
  assumptions: [ urgency_uncertain — caller explicitly unsure ]
  intent: { primary: EMERGENCY_TRIAGE, secondary: [NEW_PATIENT?] }
  confidence: { intent: 0.75, urgency: 0.40 }

PSYCHOLOGY:
  emotion: anxious + embarrassed
  tone: reassure, normalize seeking help

TRIAGE:
  redFlags: { pain: unknown, bleeding: unknown, swelling: unknown }
  urgency: priority (provisional — insufficient data for urgent)
  need: pain status, bleeding, swelling before reclassifying

FRONT DESK:
  missing: [ painPresent, swelling, bleeding, name, phone ]
  appointmentTypeHint: emergency_eval OR restorative_consult

BUSINESS:
  hours: business_hours
  sameDayEnabled: true

RECONCILE:
  psychology.deferAdmin → triage questions first

DECIDE:
  goal: triage_symptoms_before_scheduling
  nextQuestion: pain presence
  mustNotSay: [ diagnosis, "it's just cosmetic" reassurance ]
```

**Aly says:** "I'm glad you called — let's figure out the best way to help. Is the tooth causing you any pain right now?"

---

### Example 2: Delta Dental disambiguation (new patient)

**Caller:** "We're new to Grand Rapids. I have Delta Dental through my employer."

**Reasoning chain:**

```
UNDERSTAND:
  facts: [ new_patient, carrier: Delta Dental, employer-sponsored hint ]
  insuranceProgram: unknown (brand ≠ program)
  assumptions: [ likely delta_ppo — NOT confirmed ]

FRONT DESK:
  missing: [ name, phone, insuranceProgram, chiefComplaint, preference ]
  disambiguation: employer hint supports PPO path but verification question required

CONFIDENCE:
  insurance.program: 0.55 → below action threshold for acceptance language

DECIDE:
  goal: collect_name_then_insurance_disambiguation
  mustNotSay: [ "We accept Delta Dental", "You're in network" ]
```

**Aly says:** "We'd love to welcome you. Can I start with your name? ... Thanks. For Delta Dental — employer plans are usually PPO. I'll note that, and our team will verify your specific plan before your visit."

---

### Example 3: After-hours toothache with escalation

**Caller:** "I've had a really bad toothache since last night and it's getting worse."

**Reasoning chain:**

```
UNDERSTAND:
  facts: [ toothache, duration: since_last_night, worsening ]
  intent: EMERGENCY

PSYCHOLOGY:
  emotion: pain_distress
  tone: acknowledge_pain_first

TRIAGE:
  redFlags: { swelling: unknown, fever: unknown }
  urgency: urgent (provisional — severe pain + worsening)
  need: swelling, fever status

BUSINESS:
  afterHours: true
  onCallEnabled: true
  callbackSla: 30 minutes

DECIDE:
  goal: acknowledge_pain → triage_swelling_fever → prepare_on_call_path
```

**Aly says:** "I'm so sorry you're dealing with that. Are you having any swelling or fever with the pain?"

*(Next turn: caller says "no swelling, no fever")*

```
TRIAGE:
  urgency: urgent (severe pain, worsening, no systemic signs)
  routing: on_call_callback

DECIDE:
  goal: collect_phone → on_call_escalation
```

**Aly says:** "Thank you for letting me know. I'm going to flag this as urgent for our on-call team. Can I get the best number to reach you? ... Got it. Someone will call you back within 30 minutes. If you develop swelling or fever, please seek urgent care."

---

### Example 4: Reschedule masked as cancel (frustrated existing patient)

**Caller:** "I need to cancel my appointment. This is ridiculous — I've called twice."

**Reasoning chain:**

```
UNDERSTAND:
  surfaceIntent: CANCEL
  assumptions: [ latentIntent: RESCHEDULE — frustration suggests want, not abandonment ]
  facts: [ existing_patient_likely, frustration: high ]

PSYCHOLOGY:
  emotion: frustrated
  tone: validate, do_not_argue, offer_solution

FRONT DESK:
  need: identity, which appointment, true intent

DECIDE:
  goal: validate → clarify_cancel_vs_reschedule
  mustNotSay: [ defensive language, blame caller ]
```

**Aly says:** "I'm sorry you've had trouble getting through — I can help you now. Are you looking to cancel altogether, or would you prefer a different time?"

---

### Example 5: Red-flag override (caller minimization)

**Caller:** "It's probably nothing — a little swelling from my tooth, but I have a fever and I'm really uncomfortable."

**Reasoning chain:**

```
UNDERSTAND:
  facts: [ swelling, fever, discomfort ]
  callerMinimization: true ("probably nothing")

TRIAGE:
  matched: atom://red-flag/spreading-swelling-with-fever
  urgency: emergency (rule floor — L1)
  collectBeforeEscalate: [ phone ]

RECONCILE:
  caller minimization CANNOT lower urgency below emergency floor

DECIDE:
  goal: emergency_escalation_with_er_guidance
```

**Aly says:** "I want to make sure you're safe. With fever and swelling, you should seek emergency care — please call 911 or go to the nearest emergency room. I'm also notifying our on-call team right now. What's the best number to reach you?"

---

### Example 6: Pediatric HKD intake

**Caller:** "I need to schedule my daughter for a cleaning. She has Healthy Kids Dental."

**Reasoning chain:**

```
UNDERSTAND:
  facts: [ pediatric, insuranceProgram: hkd (explicit), service: cleaning ]
  intent: { primary: PEDIATRIC, secondary: SCHEDULE }

FRONT DESK:
  missing: [ childName, childDob, guardianName, phone, preference ]
  appointmentType: child_prophy + exam
  insurance: verify against L3 acceptedMedicaidPrograms

CONFIDENCE:
  insurance.program: 0.95 (explicit HKD)

DECIDE:
  goal: collect_child_identity → schedule_hygiene_block
```

**Aly says:** "I'd be happy to help. What's her name and date of birth? ... And your name as the parent or guardian?"

---

## 20. Orchestrator and Goal Precedence

The **Orchestrator** (`engine.ts`) is the only component that selects the next goal. It integrates brain outputs, resolves conflicts, and produces a single `EngineDecision`.

### Goal precedence (strict order)

When brains disagree, apply this precedence — aligned with Constitution decision hierarchy:

1. **Life-threatening emergency** → ER/911 + on-call per protocol; stop routine intake
2. **Urgent clinical** → triage and route before admin collection
3. **Acute emotional distress** → brief acknowledgment before continuing (unless #1 or #2 active)
4. **Missing critical fields** → gather next highest-priority field
5. **Scheduling / completion** → offer times, confirm next steps, or close
6. **Secondary topics** → address pending intents before close
7. **Efficiency** → only after 1–6 satisfied

### Single goal invariant

Each turn produces **exactly one primary goal**. No compound questions from competing goals.

| Bad | Good |
|-----|------|
| "What's your DOB and are you having swelling?" | Turn 1: swelling (triage). Turn 2: DOB. |
| "Can I get your insurance and schedule you for Thursday?" | Insurance disambiguation OR scheduling — ordered by precedence |

### EngineDecision shape (conceptual)

```yaml
EngineDecision:
  goal: collect_field | triage | escalate | offer_slots | close | transfer | ...
  reason: "Urgent pain; swelling status unknown — triage before insurance"
  nextField: swelling
  tone: compassionate_urgent
  constraints:
    mustNotSay: [ coverage_promise, diagnosis ]
    urgencyFloor: urgent
  provenance:
    - brain: triage
      atom: atom://symptom-cluster/toothache-worsening
    - brain: psychology
      recommendation: acknowledge_pain_first
```

---

## 21. The Reasoning Output Contract

Before language generation, every turn must produce a **ConversationAnalysis** artifact:

```yaml
ConversationAnalysis:
  turn: number
  timestamp: ISO8601

  understanding: PatientUnderstanding
  emotion: EmotionAssessment
  urgency: UrgencyAssessment
  frontDesk: FrontDeskAssessment
  practice: PracticeAssessment

  state: ConversationState          # updated
  conflictsResolved: [ ... ]
  decision: EngineDecision

  confidence:
    overall: 0.0–1.0
    bindingField: string            # lowest-confidence field blocking action
    needsReview: boolean

  provenance:
    knowledgeVersions: { l1, l2, l3ConfigVersion }
    matchedAtoms: [ ... ]
```

### Contract rules

1. **No patient-facing text without `decision`**
2. **Every urgency ≥ urgent cites matched atoms**
3. **Every insurance classification cites disambiguation path**
4. **Summary service consumes `ConversationAnalysis` — not raw transcript alone**
5. **Audit logs store artifact structure — not PHI content**

---

## 22. Design Rules and Acceptance Tests

### The design rule

> **Every response should be clinically safe, emotionally intelligent, operationally useful, and easy for the front desk to act on.**

| Lens | Test question |
|------|---------------|
| **Clinically safe** | Could this delay necessary care, downplay red flags, or sound like a diagnosis? |
| **Emotionally intelligent** | Does this acknowledge how the patient feels before asking for member ID? |
| **Operationally useful** | Does the summary give typed fields the front desk can paste into Open Dental? |
| **Easy to act on** | Can a busy coordinator read the summary in 10 seconds and know what to do? |

If a proposed change passes three lenses but fails one, fix the failure before shipping.

### Engineering invariants

1. **Brains do not call each other** — orchestrator only
2. **Brains do not fetch knowledge** — orchestrator loads snapshot, passes slices
3. **State is dumb data** — no business logic in `state.ts`
4. **No domain literals in brain code** — facts from Knowledge Engine
5. **L1 rule floor cannot be lowered by LLM**
6. **No PHI in reasoning logs**
7. **Never promise coverage, fees, treatment outcomes, or confirmed appointments without validation**
8. **Never identify as AI** (persona rule — not reasoning, but language constraint)

### Acceptance tests for reasoning changes

| Test | Pass criteria |
|------|---------------|
| Red-flag fixture | Fever + swelling → `emergency` regardless of caller minimization |
| Delta disambiguation | "I have Delta" → no acceptance language; disambiguation question |
| Urgency monotonicity | Once urgent matched, does not drop without disconfirming evidence |
| Emotional ordering | Pain caller receives triage before insurance question |
| Memory | Name asked once; not repeated |
| Honesty | Unknown slot → request language, not confirmation |
| Summary completeness | New patient summary includes required fields per CALL_FLOWS.md |

---

## 23. Related Documents

| Document | Relationship |
|----------|--------------|
| [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) | Highest authority; safety, truth, clinical boundaries |
| [`EMOTIONAL_INTELLIGENCE_ENGINE.md`](EMOTIONAL_INTELLIGENCE_ENGINE.md) | Full emotional intelligence specification; Psychology Brain principles |
| [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) | Declarative truth brains consume; not reasoning logic |
| [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) | L3 practice profile; Business/Front Desk/Triage inputs |
| [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) | Product and market context |
| [`CALL_FLOWS.md`](CALL_FLOWS.md) | Intent schemas, triage trees, summary required fields |
| [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md) | Operational truth for scheduling and workflow reasoning |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Conversation engine, state machine, latency, PHI rules |
| [`VISION.md`](../VISION.md) | Think don't script; patients first |
| [`ROADMAP.md`](ROADMAP.md) | Implementation phasing |

### Document authority chain (reasoning)

```
FREEDOMDESK_CONSTITUTION.md
  → FREEDOMDESK_BRAIN_ARCHITECTURE.md (this document)
    → KNOWLEDGE_ENGINE.md (facts)
    → FREEDOMDESK_OFFICE_DNA.md (per-practice rules)
    → CALL_FLOWS.md (intent and summary schemas)
```

---

## 24. Appendix: Implementation Mapping

This appendix maps the specification to current and target code. **Behavior is defined by this document and the Constitution — not by whatever the code happens to do today.**

### Source layout (target)

```
src/conversation/
├── state.ts           # ConversationState types — dumb data
├── understanding.ts   # Understanding Brain
├── psychology.ts      # Psychology Brain
├── triage.ts          # Clinical/Triage Brain
├── front-desk.ts      # Front Desk Brain helpers (or inline in engine.ts)
├── engine.ts          # Orchestrator — processTurn(), determineNextGoal()
└── summary.ts         # Summary generation from ConversationAnalysis

src/knowledge-engine/  # Resolver, query API — see KNOWLEDGE_ENGINE.md
src/engine/
├── prompt-context-builder.js  # Thin adapter: reasoning artifact → LLM context
```

### Turn processing (target)

```
snapshot = KnowledgeEngine.forCall(practiceId, { intent, pmsType })

analysis = processTurn({
  message,
  state,
  snapshot,
})

response = articulate(analysis.decision, persona, analysis.constraints)
summary  = updateSummary(analysis.state, analysis)
```

### Migration note

Today `understanding.ts` contains transitional keyword logic including urgency and emotion assignment. Per this specification, those responsibilities **migrate** to `triage.ts` and `psychology.ts` respectively. Understanding extracts facts; other brains interpret.

### Quick reference for AI agents

**Before editing conversation code:**

1. Read this document and identify which brain owns the change
2. Urgency logic → `triage.ts`, not `understanding.ts`
3. Emotion/tone logic → `psychology.ts`
4. Next question / goal → `engine.ts`
5. Summary shape → `summary.ts` + `CALL_FLOWS.md`
6. Domain fact → Knowledge Engine atom, not brain literal
7. Run the seven-step loop mentally before shipping

**Do not:**

- Put red-flag rules only in LLM prompts without code floor
- Promise coverage, fees, or outcomes in any brain
- Log patient names, phone numbers, or symptoms
- Import across brains — orchestrator integrates

---

*This specification is the master reference for FreedomDesk reasoning. When in doubt, reason first — then speak.*
