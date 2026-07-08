# FreedomDesk Intelligence Model

> **Status:** Founding architecture document. The deepest technical and conceptual description of how FreedomDesk thinks — designed to remain correct ten years from now.  
> **Scope:** What intelligence is in a dental practice, permanent responsibilities, reasoning structure, knowledge flow, memory/judgment/uncertainty/confidence/coordination placement, and decade-scale architecture.  
> **Audience:** Founders, architects, engineers, product, dental operators, and every person who will inherit this system.

When this document conflicts with implementation convenience, **this document defines intent**. When it conflicts with moral law, [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) prevails.

**Read first:** Constitution → [`OPERATING_INTELLIGENCE.md`](OPERATING_INTELLIGENCE.md) → [`REASONING_PHILOSOPHY.md`](REASONING_PHILOSOPHY.md) → **this document**

This document does not define features, screens, or APIs. It defines the **intellectual architecture** everything else must express.

---

## Why this document exists

FreedomDesk has accumulated good ideas: five brains, Practice Brain, Office DNA, operating intelligence faculties, judgment validation scenarios, Morning Brief, My Day. Many of these were right for Phase 0. Some were right permanently. Several were **implementation accidents** that will not survive a decade of domains.

This document challenges every prior architectural decision — including ones we wrote last month — and replaces them with the smallest model that can still explain:

- A Sunday night toothache call
- A crown seat with an unconfirmed lab case
- A Delta Medicaid vs. PPO confusion at intake
- A cancellation that should fill from the waitlist
- A hygienist chair scheduled as prophy when perio is overdue
- An owner asking why production dropped without reading fifty alerts

The goal is not cleverness. The goal is a model a senior engineer, an office manager, and a dentist would all recognize as **how a great practice actually thinks**.

---

## 1. What actually is intelligence inside a dental practice?

### Intelligence is not what vendors usually sell

A dental practice does not lack **data**. Open Dental holds the chart, schedule, ledger, and recall. It does not lack **activity**. Phones ring, patients arrive, labs ship, claims go out. It does not lack **people who can think**. Maria has triaged emergencies for eleven years. Jamie knows which crown cases need the doctor briefed. Dr. Buurma reads a room in seconds.

What the practice lacks — structurally, every busy Tuesday — is **integrated operational judgment under load**:

| The practice has | The practice lacks |
|------------------|-------------------|
| Partial truth in many heads | A single reconciled picture of what matters now |
| Tribal knowledge | Durable institutional memory that survives turnover |
| Reactive hustle | Prioritized foresight before preventable failure |
| Siloed attention | Coordinated routing — who should know what, when |
| Hope that nothing was missed | Honest close — either settled or explicitly carried forward |

**Intelligence inside a dental practice is the continuous work of turning fragmented operational reality into prioritized, actionable truth — while knowing what must remain human.**

That work is already performed by an excellent office manager, a veteran front desk coordinator, and a dentist who reads the schedule before the first patient. FreedomDesk does not invent a new kind of mind. It **externalizes and amplifies** the judgment a high-functioning team already performs — without claiming the license, the ledger, or the relationship.

### Intelligence has four irreducible properties

These properties appear in every domain — phone, schedule, lab, hygiene, production — and survive any technology change.

**1. Faithful observation**

Notice what happened without surveillance, scoring, or clinical overreach. The phone call. The cancellation. The lab status change. What the caller actually said — not what we wish they had said.

**2. Operational interpretation**

Translate observation into meaning a dental team recognizes: this is a crown seat, not a cleaning; this is Delta Medicaid confusion, not acceptance; this caller is minimizing pain; this schedule block conflicts with the lab case we thought was ready.

**3. Bounded judgment**

Decide what matters most, for whom, and what should happen next — within constitutional limits. Triage without diagnosis. Classify without promising coverage. Recommend without commanding. **Stay silent** when confidence is insufficient.

**4. Stewardship of continuity**

Remember open commitments. Connect the call to the 2 PM patient. Carry yesterday's unresolved items into today's start. Improve calibration over months — with human governance, not autonomous drift.

### Intelligence is distributed in the practice today

| Human role | Intelligence they already provide |
|------------|-------------------------------------|
| **Front desk** | Boundary triage, intake completeness, insurance disambiguation, schedule language honesty |
| **Assistant** | Lab readiness, room prep, same-day surprise prevention |
| **Hygienist** | Appointment type correctness, recall continuity, symptom handoff |
| **Doctor** | Clinical judgment, on-call decisions, treatment appropriateness |
| **Office manager** | DNA integrity, team coordination, compliance and production health |
| **Owner** | Strategic confidence, capacity decisions, trust in the system |

FreedomDesk is **one intelligence layer** that serves all roles — not six products. The moral and operational truth is singular; the **filter** differs by responsibility.

### What intelligence is not

| Not intelligence | Why |
|------------------|-----|
| Fluency | Cheap; dangerous in healthcare |
| Data display | Raw PMS screens already exist |
| Automation | Booking, charting, and diagnosing remain human-accountable |
| Generic dental knowledge | Textbooks do not know Cascade Family Dentistry blocks Friday PM new patients |
| Surveillance | Trust dies instantly |
| Omniscience | Fabrication follows |

### The one-sentence definition

> **Dental practice intelligence is structured, inspectable judgment about operational reality — continuously reconciled, honestly uncertain where verification is required, and routed to the humans who retain accountability.**

FreedomDesk exists to perform that work reliably at scale.

---

## 2. The smallest number of permanent intelligence responsibilities

Many documents list ten faculties: observe, understand, remember, connect, anticipate, recommend, coordinate, learn, ignore, and more. Those are **behaviors**, not responsibilities. Behaviors compose; responsibilities endure.

After stripping channel-specific and implementation-specific labels, **five permanent responsibilities** remain. Every FreedomDesk capability for the next decade must map to exactly one primary responsibility (coordination spans two — see §9).

```
┌─────────────────────────────────────────────────────────────────┐
│              FREEDOMDESK — FIVE PERMANENT RESPONSIBILITIES       │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│   GROUND    │  INTERPRET  │    JUDGE    │   EXPRESS   │ PERSIST │
│  What is    │  What does  │  What       │  How is it  │ What    │
│  true?      │  it mean?   │  matters?   │  delivered? │ carries │
│             │             │             │             │ forward?│
└─────────────┴─────────────┴─────────────┴─────────────┴─────────┘
         ▲                           │
         │                           ▼
    Knowledge Engine            COORDINATE
    PMS reads                   (routing truth
    Office DNA                   to people)
```

### R1 — Ground

**Question:** Given authorized sources, what is true, assumed, or unknown?

Ground binds every later step to provenance:

- Caller utterance (fact: they said it)
- Office DNA (fact: this office configured it)
- PMS read (fact: system of record returned it)
- L1 safety atoms (fact: non-negotiable)

Ground **never** fills gaps with plausibility. Missing DNA produces honest limits, not invention.

*Current mapping:* Knowledge Engine, Office DNA, Understanding extraction, epistemic fields in conversation state.

### R2 — Interpret

**Question:** What does this signal mean operationally?

Interpretation transforms grounded inputs into **operational types** the team acts on:

- Intent (new patient, emergency, reschedule — not keywords)
- Urgency tier (routine → emergency — not politeness)
- Appointment type (crown seat, child prophy, denture reline — never generic "appointment")
- Insurance program (Delta PPO ≠ Delta Medicaid ≠ HKD — or honest `unknown`)
- Emotional context (anxiety, financial shame — shapes order, not diagnosis)
- Conflict detection (schedule says prophy; recall says perio overdue)

Interpret **stops at the clinical line**. Swelling and fever are facts. Abscess is not FreedomDesk's conclusion.

*Current mapping:* Understanding, Psychology, partial Front Desk / Business classification.

### R3 — Judge

**Question:** What matters most, what should happen next, and what should stay silent?

Judgment is the product. It includes:

- **Reconciliation** when sources disagree (Constitution precedence, PMS wins on authoritative facts)
- **Precedence** (safety → truth → compassion → workflow → efficiency)
- **Commitment** — one primary next action per interaction turn or operational cycle
- **Ignore** — discipline to stay quiet when confidence or stakes do not justify surfacing

Judgment produces **decisions**, not paragraphs. Every decision carries evidence, confidence, owner, and expiry where applicable.

*Current mapping:* Triage, Orchestrator, Practice Brain recommendations, reconciliation rules — today fragmented across modules.

### R4 — Express

**Question:** How is the judgment packaged for this audience on this channel?

Expression is **not** judgment. It is constrained articulation:

- Aly on the phone (Midwest-friendly, never AI-identified)
- Paste-ready comm log note (structured, Open Dental-ready)
- My Day task (one verb, one owner)
- Morning Brief item (because-line + evidence)

The LLM lives here. It **must not** decide what is true.

*Current mapping:* Language generation, Summary compiler, Morning Brief prose, persona.

### R5 — Persist

**Question:** What must the practice not have to reconstruct?

Persistence spans three horizons (detailed in §5):

- **Working** — this shift's open threads
- **Practice** — how this office behaves over months
- **Patient operational** — administrative journey at this practice (not a clinical chart)

Persist also includes **governed learning**: calibration from feedback, friction patterns, DNA drift detection — never autonomous behavior change.

*Current mapping:* ConversationState, Practice Brain memory, practice-memory, Continuous Learning Engine.

### Why five — not three, not twelve

| If fewer | What breaks |
|----------|-------------|
| Merge Ground + Interpret | Facts and inferences blur — fabrication becomes likely |
| Merge Judge + Express | LLM decides truth — constitutional violation |
| Merge Persist into Judge | Memory becomes implicit — audit and carry-forward fail |

| If more | What breaks |
|---------|-------------|
| Separate "Anticipate" | Foresight is Interpret + Judge at a future time horizon — not a separate mind |
| Separate "Recommend" | Recommendation is Judgment offered to a human — not a separate responsibility |
| Separate "Connect" | Connection is Persist + Coordinate — relating fragments, not a new faculty |
| Separate brains per domain | Lab Brain, Hygiene Brain, Production Brain — unbounded proliferation |

**Anticipate, recommend, connect, learn, and ignore are behaviors inside Judge and Persist — not permanent responsibilities.**

---

## 3. Are our current reasoning stages correct?

### Short answer

**Partially.** The moral architecture is right: reason before speaking, modular assessments, evidence traces, rule floor for safety. The **stage decomposition is wrong for decade scale** — it is call-centric, brain-centric, and will not absorb schedule, lab, hygiene, and production without accreting parallel pipelines.

### What we got right (keep)

| Element | Verdict | Why it survives |
|---------|---------|-----------------|
| Reason before speaking | ✅ Permanent | Language is packaging; judgment is product |
| L1 rule floor | ✅ Permanent | Safety cannot be probabilistic |
| Evidence contract (facts, rules, rationale) | ✅ Permanent | Trust requires inspection |
| Orchestrator precedence | ✅ Permanent | Conflicts must resolve deterministically |
| Summary as structured artifact | ✅ Permanent | Rework reduction is the ROI |
| Judgment Validation Suite | ✅ Permanent | Scenarios before code |
| Psychology changes order, not safety | ✅ Permanent | Compassion ≠ minimization |
| Brains do not call each other | ✅ Permanent | Modularity is auditability |

### What we got wrong (change)

| Element | Problem | Decade consequence |
|---------|---------|-------------------|
| **Five Brains as architecture** | Brains multiply per domain | Lab Brain, Schedule Brain, Production Brain — unbounded |
| **Front Desk vs Business Brain split** | Same question: "what does the office need to complete this?" | Duplication, unclear ownership, merge conflicts in orchestrator |
| **Summary as reasoning stage** | Summary compiles artifacts; it does not reason | Validation suite treats compiler as thinker |
| **Practice Brain signal on call path** | Boundary judgment mixed with practice-scale ingest | Two pipelines, two mental models |
| **No explicit Reconcile stage** | Hidden in orchestrator | Uninspectable when PMS ≠ caller ≠ DNA |
| **Psychology as parallel peer to Triage** | Emotion and urgency compete at same abstraction | Orchestrator complexity; wrong for non-voice domains |
| **Seven-step loop vs Five Brains** | Two competing mental models in docs | Engineers read different maps |
| **Knowledge as pseudo-brain** | Correctly input, incorrectly diagrammed | Confusion about what "thinks" |

### The replacement: Universal Judgment Loop

Every operational signal — phone utterance, schedule cancellation, lab status update, unsigned note threshold — runs the **same loop**. Domain specifics are **assessment modules**, not architectural brains.

```
SIGNAL IN
    │
    ▼
┌──────────┐
│  GROUND  │  Bind sources; classify fact / assumption / unknown
└────┬─────┘
     ▼
┌──────────┐
│ INTERPRET│  Domain modules: boundary, schedule, lab, insurance, …
└────┬─────┘
     ▼
┌──────────┐
│ RECONCILE│  Explicit precedence; surface conflicts — never hide
└────┬─────┘
     ▼
┌──────────┐
│  JUDGE   │  Rule floor (L1) → precedence → one commitment
└────┬─────┘
     ▼
┌──────────┐
│  EXPRESS │  Channel + role filter → artifact
└────┬─────┘
     ▼
┌──────────┐
│  PERSIST │  Update working / practice / patient operational memory
└────┬─────┘
     ▼
┌──────────┐
│COORDINATE│  Route to person-through-responsibility; dedupe
└──────────┘
```

**Reconcile** is explicit — not buried in orchestrator. When the schedule says confirmed and the caller was told request-only, Reconcile produces a **conflict object** Judgment must resolve or escalate.

### Assessment modules (replace "Five Brains")

Modules are **invoked by Interpret and Judge**, not peers in a star diagram:

| Module | Question | Replaces |
|--------|----------|----------|
| **Boundary** | What did the person say; what intent signals exist? | Understanding Brain |
| **Human context** | Emotional state; communication order constraints | Psychology Brain |
| **Clinical boundary** | Urgency, red flags, escalation path | Triage / Safety Brain |
| **Operational fit** | Required fields, appointment type, insurance taxonomy, hours/booking mode | Front Desk + Business Brains **merged** |
| **Schedule integrity** | Column fit, duration, provider rules, waitlist eligibility | *New — extracted from Business Brain* |
| **Financial boundary** | Program classification, verification queues — never coverage | *Partially in Front Desk — elevated for clarity* |

Modules **share** Ground output. They **do not** call each other. Judge integrates their assessments.

### Call-time vs practice-time: same loop, different modules

| Timescale | Signal examples | Active modules | Expression |
|-----------|-----------------|----------------|------------|
| **Interaction** (seconds) | Utterance, ASR | Boundary, Human context, Clinical boundary, Operational fit | Aly speech, live state |
| **Shift** (minutes–hours) | Cancellation, lab webhook, arrival | Schedule integrity, Operational fit | My Day, live queue |
| **Practice** (hours–days) | Overnight calls, open items, metrics | All modules + anticipation patterns | Morning Brief, End of Day |

The Judgment Validation Suite should evolve to validate **scenarios** at any timescale — not only call transcripts.

### Migration map (conceptual — not implementation)

| Today | Becomes |
|-------|---------|
| `understanding.ts` | Boundary module under Interpret |
| `psychology.ts` | Human context module under Interpret |
| `triage.ts` | Clinical boundary module + L1 rule floor under Judge |
| `frontDesk.ts` + business logic in `engine.ts` | **Single** Operational fit module |
| `engine.ts` orchestrator | Judge (precedence + commitment) |
| Reconciliation rules | Explicit Reconcile step |
| `summary.ts` | Express — artifact compiler |
| `signal.ts` | Persist + Coordinate — practice event emission |
| `practice-brain/*` | Practice-time Judge + Express + Persist (same loop) |

### What happens to "Practice Brain"?

**Practice Brain is not a separate mind.** It is the practice-timescale execution of the same five responsibilities against aggregated operational events.

Rename conceptually: **Practice Judgment** — not a brain, not a chatbot, not a dashboard. A scheduled and event-driven invocation of the Universal Judgment Loop over the practice's operational event stream.

---

## 4. What information should flow through the system?

Not code. **Knowledge** — the typed information that makes judgment possible.

### Knowledge classes

| Class | Description | Mutable by office? | Example |
|-------|-------------|-------------------|---------|
| **Constitutional law** | What must never happen | No | Never diagnose; never promise coverage |
| **Universal dental (L1)** | Profession-wide truth | Platform only | Red-flag definitions; crown seat ≠ prophy |
| **Regional defaults (L2)** | Market operating patterns | Inherited; office overrides | West Michigan insurance disambiguation order |
| **Office DNA (L3)** | This practice's rules | Office manager | On-call rotation; crown seat 45 min; HKD accepted |
| **Authoritative runtime** | System of record | PMS / staff | Schedule, chart, ledger, recall status |
| **Interaction evidence** | What was said or observed | Immutable per event | Caller: "I have Delta" |
| **Judgment artifacts** | Structured outputs | FreedomDesk writes | CallSummary, Recommendation, Conflict |
| **Operational commitments** | Promises and open work | Both | Callback by 10 AM; verify insurance before NPE |
| **Calibrated patterns** | Learned office behavior | Governed update | "Tuesday 8–9 AM peak"; dismissed recall alerts |

### What flows where

```
                    CONSTITUTIONAL LAW
                           │
                           ▼
              ┌────────────────────────┐
              │   KNOWLEDGE ENGINE     │
              │   L1 → L2 → L3         │
              └───────────┬────────────┘
                          │ resolves downward
                          ▼
    PMS / LAB / TELEPHONY ──────▶ GROUND ◀────── OFFICE DNA snapshot
           evidence                    │
                                       ▼
                                  INTERPRET
                                       │
                                       ▼
                                  JUDGMENT
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
              EXPRESS            PERSIST            COORDINATE
           (summaries,          (memory,           (tasks, owners,
            speech, briefs)      patterns)          routing)
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       ▼
                              TEAM + PMS WRITE-BACK
                              (human acceptance required)
```

### Domain knowledge bundles (decade inventory)

Each domain FreedomDesk will reason about carries **ground truth** and **interpretive types**:

| Domain | Ground truth consumed | Interpretive outputs |
|--------|----------------------|----------------------|
| **Phone / boundary** | Utterances, Office DNA hours, emergency policy | Intent, urgency, emotional context, missing fields |
| **Insurance** | L2 taxonomy, L3 accepted programs, caller statements | Program classification, verification task, `unknown` |
| **Schedule** | PMS appointments, blocks, providers, DNA durations | Appointment type, column, conflict, waitlist match |
| **Treatment planning** | PMS treatment plan status, DNA in-house scope | Scheduling type, referral flag — **never** clinical necessity |
| **Lab cases** | Lab vendor status (future), appointment type | Readiness flag, prep task for assistant |
| **Hygiene** | Recall status, scheduled type, perio history | Type mismatch, recall opportunity |
| **Communication** | Comm log, call summaries, message threads | Completeness, handoff gaps, callback SLA |
| **Production** | PMS production data, schedule utilization | Variance explanation with uncertainty — not diagnosis |
| **Business** | Aggregated metrics, DNA capacity rules | Capacity signals, capture opportunities — manager filter |

**Treatment planning knowledge stops at scheduling and referral preparation.** FreedomDesk never holds clinical treatment planning authority.

### Information that must never flow as "knowledge"

| Forbidden as knowledge | Why |
|------------------------|-----|
| `customPrompt` prose | Untestable; bypasses guardrails |
| LLM weights | Not inspectable |
| Cross-practice patient identity | Privacy |
| Invented appointment times | Fabrication |
| Diagnosis labels from calls | Clinical overreach |
| Surveillance scores | Trust destruction |

### The provenance rule

Every judgment artifact must answer: **where did each field come from?**

- `caller_stated`
- `pms_authoritative`
- `office_dna`
- `l1_atom`
- `inferred` (→ triggers verification or `humanReviewNeeded`)

Connected intelligence that cannot be unpacked is not trustworthy intelligence.

---

## 5. Where should memory exist?

Memory is not one database. It is **three horizons** with different volatility, governance, and privacy rules.

### Horizon 1 — Working memory (interaction / shift)

**Scope:** Active now — this call, this check-in rush, this morning's open queue.

**Contains:**

- Collected fields and asked questions (never repeat)
- Provisional intent and urgency trajectory
- Pending topics and last confirmation context
- Conflicts detected but not yet resolved
- Today's tasks before they commit to Persist

**Volatility:** Hours. Cleared or archived at shift close.

**Location:** ConversationState (calls); shift-scoped operational state (practice day).

**Does not contain:** Permanent patient dossiers built from surveillance.

### Horizon 2 — Practice memory (institutional)

**Scope:** How *this office* runs over months and years.

**Contains:**

- Peak demand patterns (Tuesdays 8–9 AM)
- Recommendation accept/reject calibration
- Summary field friction patterns
- DNA last-validated date and drift signals
- Seasonal baselines with uncertainty bands
- Team briefing preferences

**Volatility:** Months to years. Decays stale patterns.

**Location:** Practice Brain persistence layer; governed by Continuous Learning Engine.

**Does not contain:** Cross-practice learning; clinical conclusions; employee performance scores.

### Horizon 3 — Patient operational timeline

**Scope:** One patient's **administrative** journey at this practice.

**Contains:**

- Call history summaries (structured, not raw audio)
- Insurance program stated on phone
- Anxiety or communication flags (operational, not clinical)
- Recall status at time of interaction
- Open administrative issues (billing dispute flagged, callback promised)

**Volatility:** Years — bounded by retention policy and practice consent.

**Location:** `practice-memory/` concept; PMS comm log as system of record mirror.

**Does not contain:** A clinical chart. Diagnoses invented from calls. Cross-practice identity.

### Memory placement rule

| Question | Answer |
|----------|--------|
| Would Maria forget this during lunch? | Working memory |
| Would a new coordinator need six months to learn it? | Practice memory |
| Would the front desk look up this patient before the window? | Patient operational timeline |
| Does it require a license to interpret? | **Not FreedomDesk memory** |

### What memory is not

- **PMS** — system of record; FreedomDesk reads, does not replace
- **Raw transcripts in aggregate logs** — PHI violation
- **LLM context window** — amnesia by design between calls in V1; PMS provides continuity

---

## 6. Where should judgment exist?

Judgment is **centralized in one logical layer** with **distributed module inputs**. It must never diffuse into LLM prompts, dashboard widgets, or ad hoc business logic in surfaces.

### The judgment layer

```
┌─────────────────────────────────────────────────────────┐
│                    JUDGMENT LAYER                        │
│  Reconcile · Precedence · Rule floor · Commit · Ignore    │
│                                                          │
│  Inputs: module assessments + ground truth + memory      │
│  Outputs: Commitment (action, owner, confidence, expiry) │
└─────────────────────────────────────────────────────────┘
         ▲                                    │
         │                                    ▼
   Assessment modules                    EXPRESS + COORDINATE
   (stateless per invocation)           (may not override)
```

### Where judgment must exist

| Locus | Judgment type | Human accountability |
|-------|---------------|---------------------|
| **Interaction Judge** | Next turn goal; urgency floor; field priority | Front desk trusts handoff |
| **Event Judge** | Cancellation → waitlist? Lab unconfirmed → flag? | Assistant / coordinator acts |
| **Practice Judge** | Morning priorities; opportunity ranking | Manager accepts or dismisses |
| **Escalation Judge** | ER / on-call / transfer routing | Doctor / on-call |
| **Ignore Judge** | Silence — what not to surface | Team attention protected |

### Where judgment must NOT exist

| Locus | Why forbidden |
|-------|---------------|
| **LLM prompt** | Fluency overrides truth |
| **UI components** | Surfaces display; they do not decide |
| **PMS** | System of record, not intelligence layer |
| **Office DNA** | Declarative truth, not reasoning |
| **Marketing site / lead capture** | Outside product architecture |

### Safety judgment is special

Clinical boundary judgments that affect patient welfare use **deterministic L1 rule floor** — then Judgment applies precedence. The rule floor is not a module that can be tuned down by office config or model temperature.

```
L1 RULE FLOOR (deterministic, versioned, testable)
        ↓ constrains
JUDGMENT PRECEDENCE (orchestrator logic)
        ↓ constrains
EXPRESSION (LLM phrasing only)
```

---

## 7. Where should uncertainty exist?

Uncertainty is not a bug. It is **structural honesty** — a first-class field in every judgment artifact, not an apology added in Expression.

### Uncertainty belongs in Ground and Interpret

| Stage | Uncertainty type | Example |
|-------|------------------|---------|
| **Ground** | Source unavailable | PMS timeout — cannot confirm appointment |
| **Ground** | Missing Office DNA | Emergency SLA unknown — fail closed |
| **Interpret** | Ambiguous intent | "I need to come in" — why? |
| **Interpret** | Ambiguous insurance | "Delta" — which program? |
| **Interpret** | Ambiguous appointment type | "The doctor said I need something" |

### Uncertainty must survive into Express

Callers and staff hear uncertainty **clearly**:

- "I'll note that for the team to verify."
- "I don't have your schedule pulled up — let me collect your name and someone will confirm."
- `humanReviewNeeded: true` on summary fields

**Never** resolve uncertainty in Expression by sounding confident.

### Uncertainty taxonomy (permanent)

| Class | Meaning | Patient-facing | Team-facing |
|-------|---------|----------------|-------------|
| **Unknown** | Not yet collected | Ask or defer | Missing field queue |
| **Unverified** | Stated but not confirmed | Defer verification | Verification task |
| **Inferred** | Pattern match, not stated | Do not state as fact | Flag for review |
| **Conflicted** | Sources disagree | Honest limit | Conflict object + owner |
| **Unverifiable on channel** | Cannot resolve here | Callback / transfer | Escalation task |

### Where uncertainty must NOT be hidden

| Anti-pattern | Correct behavior |
|--------------|------------------|
| LLM fills slot to avoid silence | Ask or defer |
| Summary omits low-confidence insurance | Include with `humanReviewNeeded` |
| Morning Brief states trend from n=2 | "Not enough data — not a trend yet" |
| Dashboard green check on unverified benefits | Queue verification — no false reassurance |

---

## 8. Where should confidence exist?

Confidence and uncertainty are related but **not identical**. Uncertainty describes epistemic state. Confidence governs **action thresholds**.

### Confidence is a Judgment input and output

```
Module assessments → per-field confidence scores
        ↓
Judge aggregates: binding confidence = min(required fields for commitment)
        ↓
Commitment gated by tier thresholds
        ↓
Express adapts: state / confirm / ask / defer
```

### Confidence tiers (permanent)

| Range | Label | Behavior |
|-------|-------|----------|
| 0.90 – 1.00 | **High** | May proceed; state naturally if appropriate |
| 0.70 – 0.89 | **Moderate** | Light confirmation |
| 0.50 – 0.69 | **Low** | Clarifying question before action |
| 0.00 – 0.49 | **Insufficient** | Do not act; ask, defer, or stay silent |

### Domain-specific confidence floors

Different actions require different floors:

| Action | Minimum confidence | Override |
|--------|-------------------|----------|
| ER/911 guidance | Rule floor match — not probabilistic | L1 atom |
| On-call escalation | Matched urgency rules | L1 + L3 policy |
| Insurance acceptance language | High — program explicitly classified | Never guess from brand |
| Appointment confirmation | PMS validated or explicit staff confirm | `bookingMode` |
| Proactive Morning Brief alert | Tier-dependent | Below floor → queue, not push |
| Recall opportunity suggestion | Moderate | Informational tier |

### Where confidence lives in artifacts

| Artifact | Confidence fields |
|----------|-------------------|
| `StageReasoning` | Per-stage 0.0–1.0 + rationale |
| `CallSummary` | Per-field; `humanReviewNeeded` aggregate |
| `Recommendation` | Explicit; below floor → do not surface |
| `Conflict` | Confidence in each source |
| `MorningBriefItem` | Evidence count + "not yet a trend" |

### Where confidence must NOT exist alone

Confidence without provenance is **false precision**. Every confidence score must cite which facts and rules produced it. "0.82" without evidence is worse than "unknown."

---

## 9. Where should coordination exist?

Coordination is the **movement of judged truth to the right person at the right time** — the connective tissue between judgment and human action.

### Coordination is not a sixth responsibility — it is the delivery arm of Persist + Judge

```
JUDGMENT produces Commitment { action, owner, urgency, evidence }
        ↓
COORDINATE routes through Person → Responsibilities (not job titles)
        ↓
EXPRESS renders role-filtered artifact
        ↓
Human acts (accountability remains human)
        ↓
PERSIST records outcome + feedback
```

### Coordination loci

| Locus | Coordinates |
|-------|-------------|
| **Boundary → front desk** | CallSummary, action items, comm log note |
| **Boundary → clinical** | Urgency block, symptoms — prep only |
| **Schedule event → recovery** | Cancellation → waitlist owner |
| **Intake → verification** | Insurance program → front desk queue |
| **Treatment type → prep** | Crown seat → lab confirmation task for assistant |
| **Practice Judge → roles** | Morning Brief → responsibility filters → My Day |
| **Escalation → owner** | SLA breach → on-call or manager per DNA |

### Coordination invariants

1. **Person-through-responsibility** — Sarah wears two hats; she gets one merged workspace, not two apps.
2. **Dedupe always** — same patient, same issue, one task.
3. **Tier before interrupt** — Critical / Important / Informational (see Operating Intelligence §12).
4. **Ten-second act test** — if the recipient cannot act in ten seconds without asking "what does this mean?", coordination failed — refine judgment before routing.
5. **Decay resolved items** — no alert graveyard.

### Where coordination must NOT live

| Anti-pattern | Why |
|--------------|-----|
| Raw PMS notifications to doctor | Role filter failure |
| Duplicate tasks per role hat | Dedupe failure |
| Chat room for every signal | Attention theft |
| Autonomous PMS writes | Human acceptance required |

---

## 10. Does today's architecture scale?

### Short answer

**No.** Today's architecture is the right **Phase 0 proof** for phone reasoning. It is not the decade model for unified practice intelligence.

### What breaks at scale

| Domain added | Current architecture response | Failure mode |
|--------------|------------------------------|--------------|
| Schedule live awareness | Bolt onto Practice Brain | Second pipeline, inconsistent precedence |
| Lab cases | New detector module | Lab Brain pressure |
| Hygiene recall | Opportunity detector | Disconnected from call reasoning |
| Production analytics | Manager dashboard widgets | Metric walls — constitution violation |
| Interactive staff Q&A | Generic chat | Oracle behavior, no provenance |
| Multi-location | Per-tenant Practice Brain registry | Works — but judgment not unified |

The root issue: **call intelligence and practice intelligence use different metaphors** (five brains vs Chief of Staff loop) when they are the same five responsibilities at different timescales.

### The decade architecture: four planes

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PLANE 1 — GOVERNANCE                                                     │
│ Constitution · Principles · Decision hierarchy · Safety limits           │
│ Overrides everything. Not runtime code — moral law.                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│ PLANE 2 — KNOWLEDGE                                                      │
│ L1 / L2 / L3 · PMS adapters · Lab adapters · Event normalization       │
│ Declarative truth + authoritative reads. Brains consume; never author.   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│ PLANE 3 — JUDGMENT                                                       │
│ Universal Judgment Loop · Assessment modules · Rule floor · Evidence     │
│ Single engine; interaction-time + shift-time + practice-time invocations │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│ PLANE 4 — EXPERIENCE                                                     │
│ Phone (Aly) · My Day · Morning Brief · End of Day · Future channels    │
│ Role-filtered expression. Never decides — only delivers commitments.     │
└─────────────────────────────────────────────────────────────────────────┘
```

### The operational event stream (decade backbone)

All domains normalize into **Operational Events**:

```
OperationalEvent {
  id, practiceId, timestamp
  source: call | pms | lab | staff | system
  type: boundary_utterance | appointment_cancelled | lab_status_changed | ...
  payload: structured, schema-validated
  groundRefs: [ provenance pointers ]
}
```

The Judgment Engine subscribes to events — not to channels.

| Event type | Modules invoked | Output |
|------------|-----------------|--------|
| `boundary_utterance` | Boundary, Human context, Clinical boundary, Operational fit | Turn commitment + state delta |
| `call_completed` | Express compilers | CallSummary → event → Persist |
| `appointment_cancelled` | Schedule integrity, Operational fit | Waitlist recommendation |
| `lab_status_changed` | Schedule integrity | Assistant prep flag |
| `shift_start` | Practice-time Judge (all modules) | Morning Brief |
| `shift_end` | Persist + Practice Judge | End of Day carry-forward |

### Domain coverage matrix

| Domain | Ground sources | Primary modules | Expression | Human owner |
|--------|---------------|-----------------|------------|-------------|
| **Phone** | Utterance, DNA, PMS | Boundary, Human context, Clinical boundary, Operational fit | Aly + CallSummary | Front desk |
| **Insurance** | Caller, DNA, PMS eligibility read | Operational fit, Financial boundary | Verification task | Coordinator |
| **Schedule** | PMS, DNA | Schedule integrity, Operational fit | My Day / schedule note | Front desk |
| **Treatment planning** | PMS treatment plan | Operational fit (scheduling types only) | Booking request | Doctor / front desk |
| **Lab cases** | Lab adapter, PMS appt | Schedule integrity | Assistant task | Assistant |
| **Hygiene** | PMS recall, scheduled type | Schedule integrity, Operational fit | Hygienist brief item | Hygienist |
| **Communication** | Calls, comm logs | Boundary, Operational fit | Callback tasks | Front desk |
| **Production** | PMS metrics | Practice-time Judge only | Manager brief — weekly rhythm | Manager / owner |
| **Business** | Aggregated events | Practice-time Judge | Owner digest — calm, evidenced | Owner |

**Production and business** intelligence operate at **practice-time** with **informational tier** defaults — never intraday noise to clinical roles.

### Role filter is intrinsic — not a UI afterthought

Every commitment carries:

```
responsibilityTags: [ reception, clinical_assist, hygiene, doctor, manager, owner ]
urgencyTier: critical | important | informational
confidence: 0.0–1.0
```

Experience Plane filters; Judgment Plane tags. Same evidence. Same truth. Different priority. Different silence.

### What we keep from today's repo

| Asset | Decade role |
|-------|-------------|
| Constitution + Office DNA spec | Governance + Knowledge Plane |
| Knowledge tree + manifest | Knowledge Plane (M1 → atom resolver) |
| Judgment Validation Suite | Permanent quality gate — expand beyond calls |
| Evidence types in `reasoning/types.ts` | Judgment Plane contract |
| `practice-brain/` modules | Refactored into practice-time Judgment invocations |
| `psychology.ts` | Human context module — proven |
| Architecture Map four systems | Collapse to four planes + event stream |

### What we retire conceptually

| Concept | Replacement |
|---------|-------------|
| Five Brains as permanent architecture | Assessment modules under Universal Judgment Loop |
| Business Brain vs Front Desk Brain | Operational fit module |
| Summary as reasoning stage | Express artifact compiler |
| Practice Brain as separate mind | Practice-time Judgment invocation |
| Brain proliferation per domain | Module registry keyed by event type |
| Dashboard widget intelligence | Commitments routed to My Day / Brief |

---

## The Answer Contract (unchanged — enforced at Judgment output)

Every intelligence output — phone turn, task, brief item, recommendation — must answer:

1. **What is known?** — With provenance
2. **What is uncertain?** — Explicit gaps
3. **What matters most?** — Precedence applied
4. **What should happen next?** — One primary action, one owner
5. **What should we not say or do?** — Constraints (`mustNotSay`, rule floor)

Intelligence that sounds complete while hiding uncertainty is fabrication wearing a uniform.

---

## Authority and sibling documents

| Topic | Owning document | This document's relationship |
|-------|-----------------|------------------------------|
| Moral law | [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) | Subordinate — never overrides |
| What operating intelligence is | [`OPERATING_INTELLIGENCE.md`](OPERATING_INTELLIGENCE.md) | Faculties map to five responsibilities |
| Evidence contract, improvement loop | [`REASONING_PHILOSOPHY.md`](REASONING_PHILOSOPHY.md) | Stage model superseded; evidence permanent |
| Call mechanics (transitional) | [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) | Valid until modules migrate |
| Whole-system map (transitional) | [`ARCHITECTURE_MAP.md`](ARCHITECTURE_MAP.md) | Planes + event stream supersede layers |
| Office profile | [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) | Knowledge Plane L3 |
| Daily loops | [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) | Practice-time Judgment expression |
| Product vision | [`FREEDOMDESK_INTELLIGENCE.md`](FREEDOMDESK_INTELLIGENCE.md) | Decade delivery — this doc is decade structure |
| Judgment scenarios | `src/conversation/judgment/` | Permanent; expand event types |

When implementing, **Constitution → this document → domain specs → code**. Brain Architecture remains authoritative for call mechanics until Judgment Plane migration completes.

---

## Design tests (ten-year)

Before any architectural decision ships, answer yes to all:

| Test | Question |
|------|----------|
| **Dental** | Would Maria recognize this as how a good front desk thinks? |
| **Safety** | Is patient welfare in deterministic logic, not prompt hope? |
| **Scale** | Does adding lab/hygiene/production require a new Brain — or a new module? |
| **Honesty** | Is uncertainty visible before Expression? |
| **Role** | Could Sarah act in ten seconds without interpretation labor? |
| **Decay** | Does resolved work disappear — or become alert debt? |
| **Audit** | Could a dentist ask "why?" and get facts, rules, and rationale? |
| **Ten-year** | Will this still be correct when the channel is not a phone? |

If any answer is no, the decision is not ready.

---

## Closing

FreedomDesk will not win by simulating intelligence. It wins by **doing the unglamorous work of operational judgment** — faithfully, inspectably, and quietly — so humans can spend their thinking on care, relationships, and decisions that require a license.

The phone is where we prove it first. The practice is where it lives.

Five responsibilities. One judgment loop. Three memory horizons. Four planes. One event stream.

Everything else is implementation.

---

*Established as the canonical intelligence model for FreedomDesk. Implementation catches up; principles do not.*
