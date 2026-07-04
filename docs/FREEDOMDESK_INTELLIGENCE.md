# FreedomDesk Intelligence

> **Status:** Flagship product specification. The canonical vision for FreedomDesk as the unified intelligence layer of a dental practice.  
> **Scope:** What FreedomDesk Intelligence is, who it serves, how it answers questions, how it acts proactively, and how it compounds value across a decade — not telephony implementation, not UI mockups, not model selection.  
> **Audience:** Founders, product, engineers, dental consultants, office managers, and every person who will build, configure, or govern FreedomDesk for the next ten years.

When documents conflict on **what FreedomDesk owes the practice as an intelligence system** or **how intelligence should behave across roles and time**, this document prevails — subject only to [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md).

**Read first:** [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) → [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) → **this document** → sibling specifications below

---

## Table of Contents

1. [What FreedomDesk Intelligence Is](#1-what-freedomdesk-intelligence-is)
2. [The Guiding Question](#2-the-guiding-question)
3. [This Is Not a Chatbot](#3-this-is-not-a-chatbot)
4. [The Intelligence Architecture](#4-the-intelligence-architecture)
5. [Knowledge Sources and Provenance](#5-knowledge-sources-and-provenance)
6. [The Answer Contract](#6-the-answer-contract)
7. [Three Categories of Questions](#7-three-categories-of-questions)
8. [How Intelligence Serves Each Role](#8-how-intelligence-serves-each-role)
9. [Morning Huddle](#9-morning-huddle)
10. [End of Day Review](#10-end-of-day-review)
11. [Proactive Intelligence](#11-proactive-intelligence)
12. [Daily, Weekly, and Long-Horizon Loops](#12-daily-weekly-and-long-horizon-loops)
13. [Boundaries and Non-Negotiables](#13-boundaries-and-non-negotiables)
14. [Success Over a Decade](#14-success-over-a-decade)
15. [Relationship to Sibling Specifications](#15-relationship-to-sibling-specifications)
16. [Glossary](#16-glossary)

---

## 1. What FreedomDesk Intelligence Is

FreedomDesk Intelligence is the **unified intelligence layer for the entire dental practice** — the system that helps every team member make better decisions at the right moment, with honest evidence, and without waiting to be asked.

It begins at the phone. It does not end there.

A West Michigan independent GP practice runs on fragmented attention: the front desk triages three lines while checking in a family; the hygienist notices bleeding gums and an overdue perio plan while the schedule says prophy; the assistant discovers a lab case was never confirmed twenty minutes before a crown seat; the dentist finishes a long restorative block unaware that two new patients arrived anxious and under-verified; the office manager learns at 4 PM that production is down because cancellations were never filled. Each role holds partial truth. None holds the whole picture all day.

FreedomDesk Intelligence exists to **integrate operational truth across roles, time, and systems** — and to turn that truth into decisions the team can trust.

| FreedomDesk Intelligence is | FreedomDesk Intelligence is not |
|-----------------------------|----------------------------------|
| The operating intelligence of a dental practice | A generic AI chat window |
| Always-on situational awareness | A search box you open when stuck |
| Proactive when help is needed | Reactive only when prompted |
| Grounded in this practice's reality | A national dental trivia bot |
| Honest about uncertainty | An oracle that guesses confidently |
| Role-aware | One-size-fits-all answers |
| Compounding over years | Amnesiac session memory |

### The central promise

Every team member — dentist, front desk, assistant, hygienist, office manager, practice owner — should be able to ask a question in plain language and receive an answer that is:

1. **Correct for this office** (not generic dentistry)
2. **Traceable** (they can see where it came from)
3. **Actionable** (they know what to do next)
4. **Honest** (uncertainty is stated, not hidden)

That promise extends from *"What happened yesterday?"* to *"My 2 PM patient takes apixaban — what should I review before treatment?"* to *"You have not asked me anything in an hour, but three things need attention before the crown block starts."*

### Design mandate

FreedomDesk Intelligence reflects how **successful private practices actually operate** — not how software demos look. When choosing between implementations, prefer the path that **minimizes rework for the front desk**, **protects clinical time for the doctor**, and **surfaces the right signal to the right role** — never volume for its own sake.

---

## 2. The Guiding Question

FreedomDesk Intelligence never waits to be useful. It continuously asks internally:

> **What is the most helpful thing I can do for this practice right now?**

This is not marketing language. It is the **scheduling function of the intelligence layer** — the question that prioritizes Morning Huddle content, chooses proactive alerts, orders recommendations, and decides when to stay silent.

| Interpretation | Intelligence behavior |
|----------------|----------------------|
| **Helpful for patients** | Callbacks completed, emergencies recognized, anxious patients prepared for, insurance verified before surprises at the desk |
| **Helpful for the team** | Fewer surprises, fewer repeated questions, paste-ready summaries, lab cases confirmed, notes signed before end of day |
| **Helpful for the practice** | Cancellations filled, recall captured, production protected, opportunities not lost to inattention |
| **Helpful over time** | Practice Brain grows; recommendations calibrate; Office DNA stays accurate; year two is smarter than month one |

### Attention as the scarce resource

A dental practice cannot act on fifty alerts before 8 AM. Intelligence earns trust by being **right, concise, and role-routed** — not by maximizing notifications. A false proactive alert trains the team to ignore the next one. A missed unsigned note before an audit is a failure of the same system.

The guiding question resolves conflicts:

| Situation | Intelligence prioritizes |
|-----------|-------------------------|
| Emergency callback overdue vs. recall opportunity | Callback |
| Low-confidence production insight vs. confirmed missing insurance verification | Verification (high confidence, high harm if missed) |
| Doctor asks clinical drug question vs. front desk needs schedule help | Route to requester; queue the other without losing it |
| Proactive suggestion vs. team in active patient care | Defer non-urgent; surface critical only |

---

## 3. This Is Not a Chatbot

Chatbots optimize for conversation. FreedomDesk Intelligence optimizes for **practice outcomes**.

| Chatbot pattern | FreedomDesk Intelligence pattern |
|-----------------|-----------------------------------|
| Waits for a prompt | Maintains Daily Practice Awareness continuously |
| Optimizes fluent replies | Optimizes correct decisions and completed actions |
| Treats each message as isolated | Reads Patient Timeline and Practice Brain |
| Hides reasoning | Shows provenance, confidence, and evidence |
| Same personality for all users | Role-aware views and priorities |
| Measures engagement | Measures rework reduced, items actioned, emergencies routed |
| Improvises when unsure | States limits; routes to human guidance |

FreedomDesk Intelligence **may use conversational interfaces** — voice with Aly at the boundary, text with staff inside the practice — but conversation is a **transport**, not the product. The product is a practice that runs with more clarity, less reconstruction, and fewer preventable failures.

### Three modes of intelligence delivery

```
┌─────────────────────────────────────────────────────────────────┐
│                    FREEDOMDESK INTELLIGENCE                      │
├─────────────────┬─────────────────────┬─────────────────────────┤
│  PROACTIVE      │  DIGEST             │  INTERACTIVE            │
│  Push when the  │  Morning Huddle,    │  Staff asks a question  │
│  practice needs │  End of Day Review, │  in natural language;   │
│  action now     │  weekly/monthly     │  hybrid answers merge   │
│                 │  intelligence       │  multiple sources       │
└─────────────────┴─────────────────────┴─────────────────────────┘
```

All three modes obey the same Answer Contract (§6), the same provenance rules (§5), and the same Constitution (§13).

---

## 4. The Intelligence Architecture

FreedomDesk Intelligence unifies six sibling capabilities into one practice-facing layer:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     FREEDOMDESK INTELLIGENCE                              │
│         "What is the most helpful thing I can do right now?"             │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Practice Brain│     │ Patient Timeline│     │ Reasoning Engine│
│ This office's │     │ This patient's  │     │ Structured      │
│ operational   │     │ journey at this │     │ judgment on     │
│ memory &      │     │ practice        │     │ questions &     │
│ live awareness│     │ (operational)   │     │ signals         │
└───────┬───────┘     └────────┬────────┘     └────────┬────────┘
        │                      │                       │
        └──────────────────────┼───────────────────────┘
                               ▼
              ┌────────────────────────────────────┐
              │  Knowledge Base (L1/L2) + Office DNA │
              │  Declarative truth + this office's │
              │  rules, preferences, constraints   │
              └────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
    ┌──────────────────┐            ┌──────────────────┐
    │ Human guidance   │            │ External verified│
    │ Explicit practice│            │ references when  │
    │ policies, team   │            │ appropriate      │
    │ input, overrides │            │ (ADA, labeling,  │
    │                  │            │ carrier docs)    │
    └──────────────────┘            └──────────────────┘
```

### Practice Brain

**Practice Brain** is FreedomDesk's **accumulated operational intelligence for one practice** — the institutional memory and live situational model that makes Intelligence smarter in year two than on day one.

It includes:

- Daily Practice Awareness (calendar posture, call stream, capacity, risk flags)
- Aggregated patterns (peak call hours, fill rates by weekday, seasonal demand)
- Recommendation history and acceptance calibration
- Opportunity queue state (waitlist matches, open slots, recall candidates)
- Integration health and DNA drift signals
- De-identified operational trends — never cross-practice patient data

Practice Brain answers practice questions: *What happened yesterday? Why is production down? Why did the crown schedule fall behind?*

See [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §11, §27 and [`CONTINUOUS_LEARNING_ENGINE.md`](CONTINUOUS_LEARNING_ENGINE.md).

### Patient Timeline

**Patient Timeline** is the **operational event history of one patient at one practice** — the sequence of calls, appointments, summaries, flags, and administrative events FreedomDesk and connected systems know about.

It is **not** a clinical chart replacement. It does not diagnose. It connects:

- Call summaries and emotional flags (anxiety, financial stress)
- Appointment types scheduled, cancelled, no-showed
- Insurance program classification and verification status
- Pending treatment mentions from calls
- Recall and hygiene context from PMS (when integrated)
- Communication preferences and handoff notes

Patient Timeline answers patient-in-context questions: *Which patients sounded anxious? My 2 PM patient takes apixaban — what should I review?*

Timeline entries carry provenance and timestamps. Gaps are visible — Intelligence does not invent missing visits.

### Reasoning Engine

The **Reasoning Engine** applies structured judgment to questions and signals — the same discipline as [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md), extended beyond live phone calls to staff queries, proactive alerts, and hybrid questions.

On every intelligence output:

```
PERCEIVE → UNDERSTAND → RECALL (Practice Brain / Timeline) → ASSESS → RECONCILE → DECIDE → ARTICULATE
```

The Reasoning Engine **does not replace clinical judgment**. It prepares context, surfaces conflicts, and recommends next actions within constitutional boundaries.

### Knowledge Base and Office DNA

| Source | What it holds | Scope |
|--------|---------------|-------|
| **Knowledge Base** | Universal and regional dental truth (L1/L2) | All practices; versioned packages |
| **Office DNA** | This practice's rules, preferences, policies (L3) | One practice; manager-maintained |

Together they answer knowledge questions: *What's the CDT code? How do I verify Delta PPO? What is pericoronitis?*

See [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) and [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md).

### Human guidance

**Human guidance** is explicit input from the practice that Intelligence must respect:

- Office DNA authored and validated by the office manager
- Doctor preferences and clinical scope boundaries
- Team feedback on recommendations (accept / reject / snooze)
- Escalation when Intelligence reaches a configured limit
- Corrections that update Practice Brain confidence — not silent overrides of safety

When Intelligence says *"confirm with Dr. Buurma"* or *"office policy requires verification before stating acceptance,"* that is human guidance surfaced — not failure.

### External verified references

When Knowledge Base alone is insufficient — especially for pharmacology, evolving guidelines, or carrier-specific verification steps — Intelligence may cite **external verified references**:

- FDA drug labeling (reference class effects, not patient-specific prescribing)
- ADA / CDT publications for code definitions
- Authoritative clinical references flagged in L1 (defer-to-clinician boundaries preserved)
- Carrier verification workflow documentation (process, not benefit guarantees)

External references are **supplementary**. They never override Office DNA acceptance lists, constitutional safety rules, or the requirement to defer clinical decisions to licensed providers.

---

## 5. Knowledge Sources and Provenance

Every answer **must identify where it came from**. Provenance is not optional metadata for engineers — it is how the team trusts Intelligence enough to act.

### Source types

| Source | Typical use | Example citation |
|--------|-------------|------------------|
| **Practice Brain** | Patterns, trends, yesterday's events, production analysis | "Yesterday: 14 calls, 2 unfilled cancellations, hygiene column 92% booked" |
| **Knowledge Base** | Universal/regional dental facts, CDT, terminology, triage definitions | "L1: atom://cdt/D2740 — crown, porcelain/ceramic substrate" |
| **Office DNA** | This office's hours, accepted plans, SLAs, appointment types | "L3: emergencyPolicy.callbackSlaMinutes = 30" |
| **Patient Timeline** | This patient's calls, flags, appointments, verification status | "Call summary 2026-07-03: anxiety flag; NPE scheduled 2026-07-04 2 PM" |
| **Reasoning Engine** | Synthesis, prioritization, conflict resolution across sources | "Inference: crown schedule delay likely from two late lab confirmations + 20-min overruns" |
| **Human guidance** | Explicit policy, doctor preference, manager rule | "Office DNA: Dr. Chen prefers crown seats Mon/Wed PM" |
| **External verified reference** | Drug class, code definition, verification procedure | "FDA labeling: apixaban — bleeding risk; clinical clearance required" |

### Multi-source answers

Hybrid questions often require **multiple sources in ranked order**. Intelligence displays each contribution separately — never blending them into unattributed prose.

**Example:** *My 2 PM patient takes apixaban. What should I review before treatment?*

| Source | Contribution |
|--------|--------------|
| Patient Timeline | Patient identity, appointment type, anticoagulant noted on intake call |
| Knowledge Base | Anticoagulant category reference; defer prescribing/stopping to clinician |
| Office DNA | Pre-medication policy: collect med list; no phone advice to stop medication |
| External verified reference | Apixaban bleeding risk class — link to labeling for clinician review |
| Reasoning Engine | Recommended pre-visit checklist items; no treatment clearance |
| Human guidance | "Confirm with treating physician per office protocol" |

### Provenance display rules

1. **Primary source first** — the source that most constrains the answer (often Office DNA or Patient Timeline for practice-specific questions)
2. **Locked safety from Knowledge Base** — L1 rules always visible when they bound the answer
3. **Inference labeled** — Reasoning Engine outputs marked as inference, not fact
4. **Stale data flagged** — PMS last synced, DNA last validated, timeline gap
5. **No phantom sources** — if Intelligence does not know, it cites absence — not generic confidence

---

## 6. The Answer Contract

Every intelligence output — proactive alert, huddle item, interactive answer, review section — conforms to the **Answer Contract**.

### Required elements

| Element | Purpose | Minimum standard |
|---------|---------|------------------|
| **Answer** | Direct response to the question or signal | Plain language; role-appropriate depth |
| **Confidence** | How much the team should rely on this | 0.0–1.0 + label (High / Moderate / Low / Insufficient) |
| **Evidence** | What supports the answer | Source-typed bullets with timestamps or atom IDs |
| **Recommended next actions** | What to do | Owner role, urgency (now / today / this week), one primary action |
| **Uncertainty statement** | What is not known | Explicit gaps; what would resolve them |

### Confidence thresholds

Aligned with [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) §15:

| Range | Label | Team behavior Intelligence supports |
|-------|-------|-------------------------------------|
| 0.90 – 1.00 | **High** | Act without second-guessing operational facts |
| 0.70 – 0.89 | **Moderate** | Act with light verification |
| 0.50 – 0.69 | **Low** | Verify before acting; present as hypothesis |
| 0.00 – 0.49 | **Insufficient** | Do not recommend irreversible action; state limits |

**Binding rule:** Confidence is the **lowest confidence among load-bearing claims** — not the average. An answer with high-confidence schedule data and low-confidence production attribution must label overall confidence Low for the attribution claim.

### Recommended next actions format

Every action item includes:

```yaml
action: "Verify Delta PPO benefits for NPE at 2 PM"
owner: front_desk
urgency: today
confidence: 0.88
evidence:
  - { source: Patient Timeline, ref: "call-summary-2026-07-03", field: insuranceProgram }
  - { source: Office DNA, path: insurance.acceptedCarriers, value: "Delta PPO" }
expectedOutcome: "Benefits verified before patient arrival; no coverage surprise at desk"
expires: "2026-07-04T14:00:00-04:00"
```

### Uncertainty statement — when required

Intelligence **must** state uncertainty when:

- PMS data is unavailable or stale
- Inference crosses from operational to clinical judgment
- Insurance benefits are unverified
- Production attribution has multiple plausible causes
- Patient Timeline has gaps (patient new, call not captured)
- External reference may not reflect this patient's full medical history

**Valid uncertainty:** *"Production is down 18% vs. last Tuesday. Two cancellations and one lab-delayed crown seat explain roughly 70% of the gap; remaining variance is unclear without doctor time audit."*

**Invalid:** Inventing a single cause to sound helpful.

### Answer Contract anti-patterns

| Anti-pattern | Why rejected |
|--------------|--------------|
| Answer without evidence | Untrustworthy; team re-validates everything |
| Evidence without confidence | Team cannot calibrate urgency |
| Actions without owner role | Items die in collective ambiguity |
| Hidden clinical boundary crossing | Liability and trust failure |
| Confident insurance or fee statements | Constitutional violation |

---

## 7. Three Categories of Questions

FreedomDesk Intelligence classifies every staff question into one of three categories — **Practice**, **Knowledge**, or **Hybrid** — and routes it through the appropriate source stack.

### 7.1 Practice Questions

**Practice questions** ask about **this office, this day, this team, this schedule, this operational reality**.

| Example question | Primary sources | Intelligence behavior |
|------------------|-----------------|----------------------|
| What happened yesterday? | Practice Brain, Patient Timeline | Summarize calls, schedule changes, open items; carry forward to Morning Huddle |
| Who needs a callback? | Practice Brain, Office DNA, Patient Timeline | List promised callbacks with SLA status; rank by urgency |
| Why is production down? | Practice Brain, Reasoning Engine | Attribute with evidence; state uncertainty on unexplained variance |
| Which patients sounded anxious? | Patient Timeline, Reasoning Engine | Surface emotional flags from calls; link to today's appointments |
| What should I focus on today? | Practice Brain, Office DNA, Reasoning Engine | Role-specific prioritized list; max items per attention budget |

**Practice question principles:**

- Default to **today and yesterday** unless range specified
- Prefer **actionable lists** over narrative essays
- Never invent schedule facts — booking mode and PMS sync status visible
- Route by role automatically when asker identity known

### 7.2 Knowledge Questions

**Knowledge questions** ask about **dental facts, terminology, codes, procedures, verification processes, or education** — often without a specific patient context.

| Example question | Primary sources | Intelligence behavior |
|------------------|-----------------|----------------------|
| Refresh me on apixaban. | Knowledge Base, External verified reference | Drug class, dental relevance, defer-to-clinician boundaries |
| What's the CDT code for a porcelain crown? | Knowledge Base | Code, nomenclature, typical use — not fee |
| Explain pericoronitis. | Knowledge Base | Terminology and general presentation — not diagnosis of a patient |
| Teach me removable prosthodontics. | Knowledge Base | Structured educational overview; depth by role |
| How do I verify Delta PPO? | Knowledge Base, Office DNA, Human guidance | West Michigan disambiguation + this office's accepted plans + verification steps |

**Knowledge question principles:**

- Cite Knowledge Base atoms when available
- Layer Office DNA when question implicates *this office's* policies
- **Never diagnose a patient** in response to educational phrasing
- Distinguish universal fact (L1) from regional default (L2) from office rule (L3)

### 7.3 Hybrid Questions

**Hybrid questions** combine **patient-specific or schedule-specific context** with **clinical, administrative, or educational knowledge** — the highest-value category for chairside and front-desk decision support.

| Example question | Source stack | Intelligence behavior |
|------------------|--------------|----------------------|
| My 2 PM patient takes apixaban. What should I review before treatment? | Patient Timeline + Knowledge Base + Office DNA + External reference + Reasoning Engine | Pre-visit checklist; med list confirmation; no stop/start advice |
| This patient is anxious. Any communication tips? | Patient Timeline + Knowledge Base + Office DNA + Reasoning Engine | Prior call flags + EIE playbooks + culture notes; no clinical promises |
| Why did today's crown schedule fall behind? | Practice Brain + Patient Timeline + Office DNA + Reasoning Engine | Lab status, overruns, squeeze-ins, assistant alerts — with uncertainty |

**Hybrid question principles:**

- **Patient Timeline first** — establish who, when, what appointment
- **Merge without blurring** — separate what we know about the patient from what we know about dentistry
- **Clinical boundary guard** — preparation and communication yes; diagnosis and clearance no
- **Escalate to human** when question requires licensed judgment

### Question classification (internal)

```
Staff utterance
    → Classify: Practice | Knowledge | Hybrid
    → Identify role and urgency
    → Load source stack
    → Reasoning Engine: reconcile conflicts
    → Answer Contract output
    → Log for Practice Brain (feedback loop)
```

---

## 8. How Intelligence Serves Each Role

FreedomDesk Intelligence is **one layer with role-specific views** — not six different products. The Answer Contract is constant; priorities and default digests differ.

### 8.1 Dentist

**Job to be done:** Protect clinical time, arrive prepared, never be surprised by operational gaps that should have been caught before the chair.

| Intelligence serves the dentist by… | Example |
|-------------------------------------|---------|
| Preparing context for today's patients | Morning Huddle: new patients, high-anxiety flags, medical notes from intake |
| Supporting on-call dignity | After-hours summaries with symptoms, urgency, identity — not "someone has a toothache" |
| Flagging schedule integrity issues | Crown seats without lab confirmation; emergency squeeze-ins |
| Answering hybrid clinical-admin questions | Anticoagulant patient prep; post-op concern triage boundaries |
| Protecting from inappropriate promises | Intelligence never confirms coverage, fees, or treatment necessity |

**Default proactive items:** Emergency callbacks overnight; high-anxiety or complex-case patients; same-day schedule changes affecting doctor blocks; unsigned notes approaching compliance threshold.

**What Intelligence does not do for dentists:** Diagnose, prescribe, present treatment plans, guarantee outcomes, or replace clinical judgment.

### 8.2 Front Desk

**Job to be done:** Move patients through the boundary — phone, window, schedule — with complete typed data and minimal rework.

| Intelligence serves the front desk by… | Example |
|----------------------------------------|---------|
| Answering practice questions in real time | Who needs a callback? What's still open on the schedule? |
| Delivering paste-ready call intelligence | Summaries map to Open Dental comm logs |
| Prioritizing verification and follow-up | Missing insurance verification before today's NPEs |
| Supporting insurance taxonomy | How do I verify Delta PPO? — with Office DNA acceptance context |
| Driving cancellation recovery | Waitlist matches within 15 minutes of cancellation |

**Default proactive items:** Callback SLA warnings; unfilled cancellations; insurance verification queue; new patient arrivals with incomplete intake; missed call recovery from overnight.

**North star metric:** Coordinator acts on summary in ≤60 seconds without re-typing ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §6).

### 8.3 Dental Assistant

**Job to be done:** Room ready, lab ready, doctor ready — before the patient sits down.

| Intelligence serves the assistant by… | Example |
|-----------------------------------------|---------|
| Lab and case reminders | Crown seat today — lab case received status unconfirmed |
| Appointment-type-aware prep | Emergency vs. crown seat vs. denture stage implies different setup |
| Surfacing patient communication flags | Anxious patient at 10 AM — pacing and tone tips (not clinical advice) |
| Explaining procedure stages | Denture try-in vs. delivery — Knowledge Base + Office DNA durations |
| Alerting to schedule propagation delays | Cancellation not yet reflected — patient may still arrive |

**Default proactive items:** Lab case reminders; same-day emergency prep; schedule mismatch alerts; supply shortage flags when inventory signals exist (Phase 5+).

### 8.4 Hygienist

**Job to be done:** Correct hygiene appointment, recall continuity, symptom handoff — without chart archaeology.

| Intelligence serves the hygienist by… | Example |
|---------------------------------------|---------|
| Distinguishing hygiene types | Prophy vs. perio maintenance vs. child prophy on today's schedule |
| Recall awareness | Patient on chair overdue for perio maintenance — mentioned bleeding on last call |
| Capturing preference | Patient requested Jessica — noted on intake call |
| Supporting education questions | Explain SRP scheduling protocol — Knowledge Base + Office DNA quads-per-visit |
| Symptom handoff from calls | Caller reported sensitivity — symptom documented, not diagnosed |

**Default proactive items:** Recall opportunities on today's schedule; hygiene type mismatches (scheduled prophy, perio history flagged); pediatric HKD/Medicaid documentation gaps.

### 8.5 Office Manager

**Job to be done:** DNA integrity, compliance confidence, team coordination, ROI visibility — without babysitting systems.

| Intelligence serves the office manager by… | Example |
|----------------------------------------------|---------|
| End of Day Review and weekly intelligence | Production trends, open items, team adoption |
| DNA health monitoring | Stale configuration warnings; suggested updates after policy change |
| Compliance-oriented queues | Medicaid/HKD field completeness; unsigned notes approaching deadline |
| Complaint and billing escalation routing | Anger flags from calls → manager callback queue |
| Analytics with action linkage | Every metric connects to a recommended next step |

**Default proactive items:** DNA stale warnings; integration degradation; billing dispute queue; unsigned notes summary; supply shortage if tracked; schedule imbalance across columns.

### 8.6 Practice Owner

**Job to be done:** Understand practice health, trust the system, invest with confidence — without reading fifty dashboards daily.

| Intelligence serves the practice owner by… | Example |
|----------------------------------------------|---------|
| Monthly Practice Intelligence digest | Growth, retention, production, FreedomDesk ROI narrative |
| Honest variance explanation | Why production down — evidence-based, uncertainty stated |
| Strategic capacity signals | Hygiene weeks-out, new patient throughput, after-hours capture |
| DNA and culture fidelity | System reflects how *this* practice operates — not generic scripts |
| Decade view | Year-over-year improvement in capture, rework, emergency adherence |

**Default delivery:** Weekly abbreviated slice + monthly full intelligence report; interactive access for any practice or hybrid question.

**What the owner should feel:** *"My practice runs better with this — mornings are calmer, nothing important falls through, and when I ask a question I get the truth."*

---

## 9. Morning Huddle

The **Morning Huddle** is the team's daily alignment ritual — the first ten minutes of the practice day transformed from reactive chaos into prioritized, shared clarity.

FreedomDesk Intelligence **powers** the Morning Huddle. It is not a PDF attached to an email. It is the practice's operational briefing, assembled by the guiding question: *What does this team need to know before the first patient arrives?*

### Purpose

| Without Morning Huddle | With Morning Huddle |
|------------------------|---------------------|
| First ring sets the day's agenda | Team starts with shared priorities |
| Overnight emergencies discovered by accident | Callbacks and urgencies ranked and owned |
| Crown seats fail due to unconfirmed lab | Lab reminders surface before 8 AM |
| Anxious new patients surprise the clinical team | Emotional flags in prep context |
| Cancellations forgotten | Openings and waitlist matches visible |

### Huddle contents (by section)

Each item conforms to the Answer Contract — confidence, evidence, action, owner role.

| Section | Content | Primary consumers |
|---------|---------|-------------------|
| **Overnight & early calls** | After-hours summaries; urgency ranking | Front desk, on-call doctor |
| **Callbacks due** | Promised callbacks vs. Office DNA SLA | Front desk, doctor |
| **Today's schedule snapshot** | Patient count by column; high-risk appointments | All clinical + front desk |
| **New patients today** | NPE arrivals: insurance program, chief complaint, verification status | Front desk, doctor, assistant |
| **Clinical prep flags** | High-anxiety patients; anticoagulant mentions; complex cases | Doctor, assistant, hygienist |
| **Lab & case reminders** | Crown/denture appointments requiring lab confirmation | Assistant, front desk |
| **Insurance verification queue** | Today's patients with unverified benefits | Front desk, manager |
| **Open schedule opportunities** | Yesterday's unfilled cancellations; waitlist matches | Front desk |
| **Recall on today's schedule** | Patients overdue for additional hygiene or treatment | Hygienist, front desk |
| **Supply & operational alerts** | Shortages, integration health, DNA warnings | Manager, assistant |
| **Focus recommendation** | Top 3 actions for this role (personalized view) | Each role |
| **Yesterday's win** | One metric or outcome that improved — stewardship framing | All |

### Huddle delivery rules

| Rule | Rationale |
|------|-----------|
| Delivered ≥30 minutes before first patient | Time to act |
| Scannable in ≤3 minutes per role view | Respects attention |
| Every item has owner role + recommended action | No ambiguous "someone should…" |
| Confidence labeled on predictions and attributions | Honest uncertainty |
| No clinical advice or treatment planning | Operational intelligence only |
| Configurable sections per Office DNA | Manager toggles relevance |
| Interactive follow-up supported | "Tell me more about the 2 PM NPE" → Patient Timeline depth |

### Huddle success metrics

| Metric | Target |
|--------|--------|
| Delivery reliability (business days) | 100% |
| Items actioned by noon | ≥70% of flagged critical items |
| False positive rate (team-dismissed without cause) | ≤10% |
| Team engagement (optional acknowledgment) | Track trend ↑ |

### Relationship to Morning Brief

[`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) defines **Morning Brief** as the Chief of Staff daily digest. **Morning Huddle** is the team-facing ritual name for that digest — optimized for huddle-room discussion, role-filtered views, and interactive drill-down. One intelligence product; two consumption modes (push digest + team meeting).

---

## 10. End of Day Review

The **End of Day Review** closes the operational loop — what happened, what remains, what improved, and what tomorrow inherits.

If Morning Huddle asks *"What should we focus on today?"*, End of Day Review asks *"Did we? What carries forward?"*

### Purpose

| Function | Description |
|----------|-------------|
| **Accountability** | Open callbacks, unactioned summaries, unresolved alerts |
| **Continuity** | Items carry forward to tomorrow's Morning Huddle |
| **Learning** | Practice Brain ingests outcomes — fills, misses, accuracy |
| **Stewardship** | One explicit statement of how the practice improved today |
| **Owner visibility** | Manager and owner see the day without reconstructing it |

### Review contents

| Section | Content | Sources |
|---------|---------|---------|
| **Call volume & capture** | Total calls, by intent, peak hours, after-hours | Practice Brain |
| **Highlights** | New patients captured, emergencies handled, cancellations filled | Practice Brain, Patient Timeline |
| **Open items** | Unresolved callbacks, unverified insurance, unconfirmed lab cases | Practice Brain |
| **Schedule outcomes** | Cancellations, no-shows, fills, waitlist conversions | Practice Brain, PMS |
| **Opportunities** | Detected vs. acted vs. missed — with evidence | Practice Brain, Reasoning Engine |
| **Quality** | Summary completeness score for the day | Call summaries, Office DNA |
| **Compliance flags** | Unsigned notes, incomplete Medicaid documentation | PMS, Office DNA |
| **Integration health** | PMS sync status, delivery failures | Practice Brain |
| **Tomorrow preview** | First patient, NPE count, known gaps, inherited open items | Practice Brain, schedule |
| **Stewardship note** | One thing that left the practice better today | Reasoning Engine |

### Review delivery rules

| Rule | Rationale |
|------|-----------|
| Delivered within 30 minutes of practice close | Same-day memory fresh |
| Primary consumers: office manager + front desk lead | Operational ownership |
| Open items auto-queue for Morning Huddle | Closed loop |
| Answer Contract on all carry-forward items | No vague "follow up needed" |
| Comparative context when available | "Fill rate above Tuesday average" |

### End of Day success metrics

| Metric | Target |
|--------|--------|
| Delivery reliability | 100% |
| Open item resolution by next noon | ≥80% |
| Same-day summary completeness average | ≥95% |
| Carry-forward item duplication (same item day 3+) | ↓ over time |

---

## 11. Proactive Intelligence

Proactive Intelligence is FreedomDesk **initiating help** — surfacing the most important action before a human asks, when waiting would cause harm, rework, or lost opportunity.

Proactive behavior is governed by the same guiding question, Answer Contract, and constitutional boundaries as interactive answers. **Proactivity is a privilege earned through accuracy.**

### Proactive principles

| Principle | Rule |
|-----------|------|
| **Evidence first** | No alert without source-typed evidence |
| **Role routing** | Every alert has primary owner per [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §22 |
| **Urgency tiers** | Critical (interrupt) vs. important (huddle) vs. informational (review) |
| **Confidence floor** | Low-confidence insights queue for review — do not push as urgent |
| **Decay** | Resolved items auto-clear; no alert debt |
| **Restraint** | Daily proactive budget per role — Office DNA configurable |
| **No patient pressure** | Opportunities go to team, not unsolicited patient outreach without consent |

### Proactive intelligence examples

Each example shows: **signal → sources → recommended action → owner → urgency**

#### Unsigned notes

| Field | Value |
|-------|-------|
| **Signal** | 4 progress notes unsigned >48 hours; 2 from today's doctor block |
| **Sources** | Practice Brain (PMS); Office DNA (compliance threshold) |
| **Action** | Doctor sign notes for patients X, Y before end of day |
| **Owner** | Dentist |
| **Urgency** | Today |
| **Confidence** | 0.97 |
| **Uncertainty** | None on identification; compliance deadline per office policy |

#### Missing insurance verification

| Field | Value |
|-------|-------|
| **Signal** | 3 patients tomorrow stated Delta PPO on calls — benefits not verified |
| **Sources** | Patient Timeline; Office DNA (accepted plans); Practice Brain (verification queue) |
| **Action** | Run verification for listed patients before 10 AM NPE block |
| **Owner** | Front desk |
| **Urgency** | Today |
| **Confidence** | 0.91 |
| **Uncertainty** | Program classified on call, not yet confirmed against carrier |

#### Lab case reminder

| Field | Value |
|-------|-------|
| **Signal** | Crown seat 11 AM — lab case receipt not confirmed in PMS |
| **Sources** | Patient Timeline; Office DNA (assistant workflow DNA); Practice Brain (schedule) |
| **Action** | Confirm lab case received with lab before patient arrival |
| **Owner** | Assistant |
| **Urgency** | Now |
| **Confidence** | 0.89 |
| **Uncertainty** | Case may be in office but not charted — physical verify recommended |

#### Recall opportunity

| Field | Value |
|-------|-------|
| **Signal** | Patient on hygiene chair today — 4 months overdue for perio maintenance per recall report |
| **Sources** | Practice Brain (PMS recall); Patient Timeline (scheduled as prophy) |
| **Action** | Hygienist discuss rebooking to perio maintenance; front desk schedule if accepted |
| **Owner** | Hygienist → front desk |
| **Urgency** | Today |
| **Confidence** | 0.86 |
| **Uncertainty** | Clinical necessity of perio maintenance requires hygienist/doctor judgment |

#### Missed callback

| Field | Value |
|-------|-------|
| **Signal** | On-call callback promised within 30 min — 47 minutes elapsed, no outbound logged |
| **Sources** | Patient Timeline; Office DNA (`callbackSlaMinutes: 30`) |
| **Action** | Doctor or front desk call patient at [number] — urgent toothache summary attached |
| **Owner** | On-call doctor |
| **Urgency** | Now |
| **Confidence** | 0.98 |
| **Uncertainty** | None on SLA breach |

#### Supply shortage

| Field | Value |
|-------|-------|
| **Signal** | Impression material below reorder threshold; 3 denture impressions scheduled this week |
| **Sources** | Practice Brain (inventory signal, Phase 5+); schedule |
| **Action** | Reorder or confirm stock before Wednesday impressions |
| **Owner** | Office manager / assistant |
| **Urgency** | This week |
| **Confidence** | 0.82 |
| **Uncertainty** | Manual stock check may show unrecorded inventory |

#### High-anxiety patient

| Field | Value |
|-------|-------|
| **Signal** | 2 PM NPE — anxiety flag on intake call; caller stated "haven't been in years" |
| **Sources** | Patient Timeline; Reasoning Engine (EIE profile); Office DNA (culture notes) |
| **Action** | Front desk allow extra check-in time; assistant/doctor use non-judgmental pacing |
| **Owner** | Front desk, clinical team |
| **Urgency** | Before 2 PM |
| **Confidence** | 0.93 |
| **Uncertainty** | Emotional state may have changed — read patient in person |

#### Schedule imbalance

| Field | Value |
|-------|-------|
| **Signal** | Doctor column 40% open 2–5 PM; hygiene column overbooked with no same-day hygiene openings |
| **Sources** | Practice Brain (schedule); Office DNA (column rules) |
| **Action** | Manager evaluate waitlist hygiene moves or contact hygiene waitlist; do not double-book beyond DNA |
| **Owner** | Office manager |
| **Urgency** | Today |
| **Confidence** | 0.94 |
| **Uncertainty** | Blockouts or doctor admin time may explain open doctor column — verify before rebalancing |

### Proactive tier matrix

| Tier | Delivery | Examples |
|------|----------|----------|
| **Critical** | Push / SMS / immediate alert | SLA breach, same-day emergency, lab case unconfirmed <2 hours before crown seat |
| **Important** | Morning Huddle, live dashboard | Verification queue, recall opportunity, schedule imbalance |
| **Informational** | End of Day Review, weekly digest | Trend insights, DNA freshness, supply reorder this week |

### When Intelligence stays quiet

Proactive silence is intentional when:

- Confidence below tier floor
- Team is in configured "do not disturb" (active surgery block)
- Recommendation would violate clinical or insurance boundaries
- Duplicate alert already acknowledged
- Issue self-resolved (callback completed; lab confirmed)

---

## 12. Daily, Weekly, and Long-Horizon Loops

FreedomDesk Intelligence compounds through time-bounded loops — each feeding Practice Brain.

```
        ┌─────────────────────────────────────────────────────────┐
        │              CONTINUOUS (intraday)                       │
        │  Live awareness · proactive alerts · interactive Q&A   │
        └─────────────────────────┬───────────────────────────────┘
                                  ▼
        ┌─────────────────────────────────────────────────────────┐
        │              DAILY                                         │
        │  Morning Huddle → intraday → End of Day Review             │
        └─────────────────────────┬───────────────────────────────┘
                                  ▼
        ┌─────────────────────────────────────────────────────────┐
        │              WEEKLY                                        │
        │  Weekly Practice Review — trends, audit sample, top 3 actions│
        └─────────────────────────┬───────────────────────────────┘
                                  ▼
        ┌─────────────────────────────────────────────────────────┐
        │              MONTHLY                                       │
        │  Monthly Practice Intelligence — ROI, retention, forecast  │
        └─────────────────────────┬───────────────────────────────┘
                                  ▼
        ┌─────────────────────────────────────────────────────────┐
        │              PRACTICE BRAIN (years)                        │
        │  Seasonal baselines · calibration · DNA evolution          │
        └─────────────────────────────────────────────────────────┘
```

| Loop | Guiding question variant | Primary consumer |
|------|--------------------------|------------------|
| **Intraday** | What needs attention *right now*? | Front desk, clinical team |
| **Daily** | What did we commit to this morning — and what carries forward? | All roles |
| **Weekly** | What patterns are we missing in the daily noise? | Office manager, owner |
| **Monthly** | Is this practice healthier than last month — and why? | Owner, manager |
| **Annual / decade** | Has FreedomDesk made this practice sustainably stronger? | Owner, FreedomDesk governance |

See [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §12, §28–§30 and [`CONTINUOUS_LEARNING_ENGINE.md`](CONTINUOUS_LEARNING_ENGINE.md).

---

## 13. Boundaries and Non-Negotiables

FreedomDesk Intelligence inherits [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) without exception.

### Clinical boundaries

| Intelligence may | Intelligence must never |
|------------------|-------------------------|
| Surface symptoms documented on calls | Diagnose conditions |
| Provide drug class reference for clinician review | Prescribe or advise stopping medication |
| Triage urgency per L1 red flags | Guarantee treatment outcomes |
| Recommend pre-visit administrative checklist | Confirm clinical clearance |
| Flag high-anxiety communication context | Provide clinical reassurance that implies diagnosis |

### Insurance and financial boundaries

Always classify to program level — never treat "Delta" as one plan:

1. Delta Dental **PPO** (employer)
2. Delta Dental **Medicaid**
3. **Healthy Kids Dental** (HKD)
4. **Michigan Medicaid** (adult)
5. Other **PPO** (BCBS MI, Cigna, MetLife, etc.)
6. **Cash-pay** / no insurance

| Intelligence may | Intelligence must never |
|------------------|-------------------------|
| State accepted plan types per Office DNA | Promise coverage |
| Queue verification tasks | Quote fees or remaining benefits |
| Acknowledge financial anxiety | Negotiate payment |

### Privacy and HIPAA

- Minimum necessary PHI in intelligence outputs — role-appropriate views
- No PHI in platform logs, ops alerts, or cross-practice learning
- Patient Timeline scoped to single practice
- Practice Brain stores operational aggregates — not exploitable patient narratives across tenants

### Honesty hierarchy

When information is missing:

1. **Ask** (interactive mode)
2. **Defer** with explicit uncertainty
3. **Escalate** to human guidance
4. **Never invent** — no plausible slots, coverage, or clinical labels

### Intelligence-specific prohibitions

- Present as generic chatbot ("How can I help you today?" as empty default)
- Auto-action on clinical or financial decisions without human acceptance
- Cross-practice patient matching or learning
- Override L1 locked safety atoms via Office DNA or Reasoning Engine
- Identify Aly or staff-facing intelligence as "AI" to patients (persona rule)

---

## 14. Success Over a Decade

FreedomDesk Intelligence succeeds when a Grand Rapids-area GP practice — and ten thousand like it — runs with the coordination of a much larger organization **without losing the personal character of private dentistry**.

### Year 1 success (foundation)

- Every call produces actionable intelligence feeding Practice Brain
- Morning Huddle and End of Day Review delivered reliably
- Staff ask practice questions and receive Answer Contract responses
- Proactive alerts for callbacks, verification, lab cases at high precision
- Team trust score ≥4/5 on accuracy and usefulness

### Year 3 success (integration)

- PMS-connected Patient Timeline and schedule-aware proactive intelligence
- Hybrid questions routine for clinical and front-desk prep
- Cancellation recovery and waitlist matching measurable in production
- Recommendation acceptance rate in 40–70% band (calibrated, not noise)
- Office DNA freshness ≤90 days; drift detection active

### Year 5 success (indispensability)

- Practice owner cites FreedomDesk in peer referrals — not for "phones" but for *how the practice runs*
- Recall and retention intelligence measurable in patient continuity metrics
- Monthly Practice Intelligence drives staffing and schedule template decisions
- Regional Knowledge Base improvements from opt-in aggregates — never cross-practice PHI
- New team members onboard to practice workflows via Intelligence, not tribal knowledge alone

### Year 10 success (category definition)

- **Operating intelligence for dental practice** is synonymous with FreedomDesk — the way PMS became synonymous with schedule of record
- Intelligence spans boundary, operatory, hygiene column, and manager office — channel-agnostic
- Decade of Practice Brain makes seasonal, cultural, and operational predictions routine — always with stated uncertainty
- Clinical and legal boundaries unchanged — trust earned through restraint, not capability boasts
- West Michigan roots with national L2 packs — Office DNA preserves local autonomy everywhere

### Decade metrics (practice level)

| Metric | Direction |
|--------|-------------|
| Rework minutes per interaction | ↓ sustained |
| Emergency protocol adherence | ≥99% |
| Summary / intelligence action rate | ↑ sustained |
| Team trust score | ↑ or stable high |
| Captured new patient opportunities | ↑ vs. pre-FreedomDesk baseline |
| Cancellation fill rate | ↑ |
| Recall overdue population | ↓ |
| FreedomDesk ROI (manager-validated) | Positive and documented |
| Proactive alert false positive rate | ↓ |
| DNA accuracy (manager quarterly confirm) | ≥95% |

---

## 15. Relationship to Sibling Specifications

FreedomDesk Intelligence is the **unifying product vision**. Sibling documents are **implementation specifications** for subsystems Intelligence composes.

### Authority chain

```
FREEDOMDESK_CONSTITUTION.md
  → FREEDOMDESK_INTELLIGENCE.md (this document)
    → PRACTICE_OPERATING_SYSTEM.md (daily loops, role success, stewardship)
    → FREEDOMDESK_BRAIN_ARCHITECTURE.md (Reasoning Engine on calls + recommendations)
    → KNOWLEDGE_ENGINE.md (Knowledge Base L1/L2)
    → FREEDOMDESK_OFFICE_DNA.md (Office DNA L3)
    → EMOTIONAL_INTELLIGENCE_ENGINE.md (communication adaptation)
    → CONTINUOUS_LEARNING_ENGINE.md (Practice Brain learning loops)
    → CALL_FLOWS.md (boundary intake → Patient Timeline events)
    → DENTAL_WORKFLOWS.md (operational truth)
    → ARCHITECTURE.md (technical deployment)
    → ROADMAP.md (phasing)
```

When sibling specs define **how** a subsystem works, this document defines **why it exists in the intelligence layer** and **what the team experiences**.

### Subsystem mapping

| Intelligence concept | Sibling specification |
|---------------------|---------------------|
| Reasoning Engine | [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) |
| Knowledge Base | [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) L1/L2 |
| Office DNA | [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) L3 |
| Practice Brain | [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) + [`CONTINUOUS_LEARNING_ENGINE.md`](CONTINUOUS_LEARNING_ENGINE.md) |
| Patient Timeline | [`CALL_FLOWS.md`](CALL_FLOWS.md) summaries + PMS integration ([`ARCHITECTURE.md`](ARCHITECTURE.md)) |
| Morning Huddle / End of Day Review | [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §12, §28 |
| Emotional context | [`EMOTIONAL_INTELLIGENCE_ENGINE.md`](EMOTIONAL_INTELLIGENCE_ENGINE.md) |
| Human guidance | Office DNA + team feedback loops |
| External verified references | Knowledge Base citation policy + curated L1 links |

### Phasing alignment

Per [`ROADMAP.md`](ROADMAP.md):

| Phase | Intelligence capability |
|-------|------------------------|
| **Phase 1** | Call → summary → basic End of Day; practice questions on call data; foundational Patient Timeline |
| **Phase 2** | PMS-enriched timeline; recall flags; schedule-aware Morning Huddle |
| **Phase 3** | Cancellation proactive; waitlist; live schedule imbalance |
| **Phase 4** | Interactive staff Q&A; role views; recommendation accept/reject; DNA self-service |
| **Phase 5** | Full proactive matrix; analytics; monthly intelligence; supply signals |
| **Phase 6** | Advanced hybrid clinical-admin support; outbound recall intelligence; decade-scale memory |

The guiding question applies from Phase 1: a complete summary that prevents five minutes of rework **is** Intelligence leaving the practice better.

---

## 16. Glossary

| Term | Definition |
|------|------------|
| **FreedomDesk Intelligence** | Unified intelligence layer for the entire dental practice |
| **Practice Brain** | Accumulated operational memory and live awareness for one practice |
| **Patient Timeline** | Operational event history of one patient at one practice |
| **Reasoning Engine** | Structured judgment pipeline — calls, questions, alerts, recommendations |
| **Knowledge Base** | L1 universal + L2 regional declarative dental truth |
| **Office DNA** | L3 per-practice operating profile |
| **Human guidance** | Explicit practice policies and team input Intelligence must respect |
| **External verified reference** | Authoritative third-party source cited with boundaries |
| **Answer Contract** | Required structure: answer, confidence, evidence, actions, uncertainty |
| **Morning Huddle** | Team daily alignment ritual powered by intelligence digest |
| **End of Day Review** | Daily close that carries forward open items and stewardship |
| **Proactive Intelligence** | System-initiated help when waiting would cause harm or missed opportunity |
| **Practice question** | About this office's operational reality |
| **Knowledge question** | About dental facts, codes, or processes |
| **Hybrid question** | Patient/schedule context + knowledge combined |
| **Guiding question** | "What is the most helpful thing I can do for this practice right now?" |

---

## The Standard

FreedomDesk Intelligence will be judged not by how fluently it speaks, but by whether:

- The front desk acts in sixty seconds instead of reconstructing for six minutes
- The assistant confirms the lab case before the crown fails
- The hygienist knows recall context before probing
- The dentist arrives prepared without reading three screens
- The office manager closes the day with clarity instead of dread
- The owner trusts the monthly story because every claim has evidence
- The patient — who never opens this document — was never punished for timing

This is the operating intelligence for a dental practice.

This is FreedomDesk.

---

*Established as the flagship product specification of FreedomDesk. The phone is where intelligence begins. The practice is where it lives. The decade is where it proves itself.*
