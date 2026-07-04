# FreedomDesk Continuous Learning Engine

> **Status:** Canonical specification. Master reference for how FreedomDesk improves itself, the dental practice, and patient experience over time through organizational intelligence.  
> **Scope:** Learning philosophy, pattern detection, recommendation governance, human review, validation, and improvement cycles — not machine learning algorithms, not prompts, not implementation code.  
> **Audience:** Engineers, product, dental consultants, office managers, and AI agents building or modifying practice memory, recommendations, DNA evolution, or operational intelligence.

When documents conflict on **how FreedomDesk learns, remembers, recommends, or evolves for a practice**, this document prevails — subject only to [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md).

**Read first:** [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) → [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) → [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) → [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) → [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) → **this document**

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Learning Philosophy](#2-learning-philosophy)
3. [What FreedomDesk Learns](#3-what-freedomdesk-learns)
4. [Patient Communication Patterns](#4-patient-communication-patterns)
5. [Emotional Trends](#5-emotional-trends)
6. [Scheduling Patterns](#6-scheduling-patterns)
7. [Insurance Trends](#7-insurance-trends)
8. [Emergency Trends](#8-emergency-trends)
9. [Treatment Acceptance Patterns](#9-treatment-acceptance-patterns)
10. [Missed Opportunity Detection](#10-missed-opportunity-detection)
11. [Workflow Friction Detection](#11-workflow-friction-detection)
12. [Frequently Asked Questions](#12-frequently-asked-questions)
13. [Practice Knowledge Growth](#13-practice-knowledge-growth)
14. [Office Preference Learning](#14-office-preference-learning)
15. [Doctor Preference Learning](#15-doctor-preference-learning)
16. [Front Desk Preference Learning](#16-front-desk-preference-learning)
17. [Patient Preference Memory](#17-patient-preference-memory)
18. [Recommendation Engine](#18-recommendation-engine)
19. [Confidence Before Learning](#19-confidence-before-learning)
20. [Human Review Requirements](#20-human-review-requirements)
21. [Learning Boundaries](#21-learning-boundaries)
22. [Knowledge Validation](#22-knowledge-validation)
23. [Continuous Improvement Cycle](#23-continuous-improvement-cycle)
24. [Weekly Learning Review](#24-weekly-learning-review)
25. [Monthly Intelligence Report](#25-monthly-intelligence-report)
26. [Long-Term Practice Evolution](#26-long-term-practice-evolution)
27. [Post-Interaction Reflection](#27-post-interaction-reflection)
28. [Measurable Learning Metrics](#28-measurable-learning-metrics)
29. [System Integration](#29-system-integration)
30. [Related Documents](#30-related-documents)

---

## 1. Purpose

### What this document defines

The **Continuous Learning Engine (CLE)** is FreedomDesk's architectural layer for **organizational intelligence** — the disciplined process by which the system improves from every interaction while remaining safe, explainable, and consistent with the Constitution.

This document defines:

- **What** FreedomDesk may learn from calls, summaries, outcomes, and team feedback
- **How** patterns become practice memory, Office DNA candidates, or regional defaults
- **When** learning requires human review before it affects patient-facing behavior
- **Why** improvement is cumulative stewardship — not autonomous self-modification

This document does **not** define:

- Machine learning model training, fine-tuning, or embedding pipelines
- Word-for-word prompts or phrase libraries
- Implementation code, database schemas, or API contracts
- Clinical decision support or diagnosis logic

### The central question

After every interaction — and in aggregate across days, weeks, and months — FreedomDesk must answer:

> *What did this interaction teach us about this practice, its patients, and our own performance — and what should we do with that knowledge without overstepping our role?*

Learning serves three beneficiaries in order of moral priority:

| Beneficiary | Learning outcome |
|-------------|------------------|
| **Patients** | Clearer explanations, less confusion, reduced anxiety, fewer repeated questions |
| **Team** | Less rework, better summaries, actionable recommendations, accurate Office DNA |
| **Practice** | Captured opportunities, protected schedule integrity, honest operational growth |

### Success criteria

The Continuous Learning Engine succeeds when:

1. Each call leaves structured learning artifacts — not raw transcript hoarding
2. Recommendations improve in acceptance rate without increasing false positives
3. Office DNA drift is detected before patients encounter stale configuration
4. No learning pathway violates constitutional safety, truth, or privacy boundaries
5. Every applied learning change cites provenance and human approval where required
6. A practice in year two receives measurably better intelligence than in month one

### Relationship to the Practice Operating System

[`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) defines the Chief of Staff mandate — morning briefs, opportunity detection, weekly reviews, monthly intelligence. **This document is the learning substrate** that feeds those capabilities: how observations become memory, how memory becomes recommendations, and how recommendations become validated change.

---

## 2. Learning Philosophy

### Organizational intelligence, not model training

FreedomDesk learns the way an excellent office manager learns — by noticing patterns, validating assumptions with the team, updating the playbook, and measuring whether things improved. It does **not** learn by silently reweighting language models on patient conversations.

| Organizational intelligence | Not this |
|----------------------------|----------|
| "Callers confuse Delta PPO with Delta Medicaid — we should explain earlier" | Retrain ASR on call audio |
| "Maria edits insurance field on 40% of summaries — disambiguation question may be wrong" | Auto-tune LLM temperature |
| "Tuesday 8 AM has highest new-patient volume — brief front desk earlier" | Cross-practice patient embedding cluster |
| "Dr. Van Der Berg prefers RCT consults before scheduling treatment" | Infer clinical judgment from outcomes |

Learning is **explicit, inspectable, and governable** — compatible with HIPAA, practice trust, and the Constitution's explainability requirement.

### Improvement without autonomy

FreedomDesk does not autonomously rewrite its own behavior. Learning produces **candidates**:

- Summary quality flags
- DNA update suggestions
- FAQ additions
- Recommendation confidence adjustments
- Regional default proposals (L2, opt-in aggregate only)

Candidates graduate to production only through validation gates defined in [§19 Confidence Before Learning](#19-confidence-before-learning) and [§20 Human Review Requirements](#20-human-review-requirements).

### Stewardship of trust

Practices lend FreedomDesk their voice, reputation, and operational data. Learning must honor that fiduciary relationship:

- Collect the minimum necessary for operational improvement
- Never treat call content as cross-practice training fodder without explicit authorization
- Prefer de-identified aggregates over raw retention
- When uncertain, surface uncertainty — do not fabricate patterns from sparse data

### Cumulative, not compulsive

Not every observation should become a rule. The Chief of Staff knows when to stay quiet. Learning optimizes for **signal over volume** — one validated FAQ addition beats twenty noisy alerts the team ignores.

### Constitution-aligned learning hierarchy

When learning suggests a change that would improve efficiency but weaken truth or safety, the change is rejected. Learning subordinates to the Constitution decision hierarchy:

1. Patient safety
2. Truthfulness
3. Compassion
4. Privacy
5. Practice workflow
6. Practice autonomy
7. Efficiency

---

## 3. What FreedomDesk Learns

FreedomDesk learns **operational patterns** — how this practice runs, how its patients communicate, and how FreedomDesk performs at the boundary. It does not learn clinical truth from phone calls.

### Learnable categories

| Category | Examples | Storage class |
|----------|----------|---------------|
| **Interaction quality** | Confusion points, anxiety reduction, explanation effectiveness | Per-practice operational memory |
| **Classification accuracy** | Insurance program inference vs. team verification | Per-practice calibration |
| **Workflow friction** | Summary fields frequently edited, missing data patterns | Per-practice friction log |
| **Demand patterns** | Peak call hours, intent mix, seasonal surges | De-identified aggregates |
| **Scheduling behavior** | Preferred times offered vs. accepted, waitlist conversion | Per-practice patterns |
| **Emergency handling** | Triage alignment with on-call outcomes | Per-practice audit samples |
| **Team preferences** | Brief sections toggled, alert thresholds, routing choices | Office DNA / team settings |
| **FAQ emergence** | Repeated caller questions not covered in knowledge | Practice FAQ candidates |
| **DNA drift** | Configured hours vs. actual closures; stale insurance acceptance | DNA health flags |
| **Recommendation calibration** | Accept/reject feedback on suggestions | Per-practice confidence model |

### Non-learnable (explicit boundaries)

| Category | Why forbidden |
|----------|---------------|
| **Diagnosis labels from calls** | FreedomDesk triages; it does not practice dentistry |
| **Cross-practice patient identity** | Privacy and tenant isolation |
| **Coverage guarantees from outcomes** | Insurance truth requires verification, not pattern matching |
| **Autonomous clinical protocol changes** | Clinical judgment belongs to licensed providers |
| **Caller voice biometrics or emotion profiling beyond call** | Surveillance, not stewardship |
| **Fabricated trends from insufficient data** | Uncertainty is honest; invention is not |

### Learning inputs

| Input source | What it contributes |
|--------------|---------------------|
| **Structured call summaries** | Intent, fields collected, confidence metadata, emotional flags |
| **ConversationAnalysis artifacts** | Reasoning provenance without PHI in logs |
| **Team corrections** | PMS entry edits, summary overrides, explicit feedback |
| **Outcome signals** | Appointment kept/missed, callback completed, waitlist filled |
| **PMS integration** | Schedule reality vs. FreedomDesk requests |
| **Office DNA change history** | What the practice explicitly configured |
| **Recommendation feedback** | Accept, dismiss, snooze, implement |

### Learning outputs

| Output | Consumer |
|--------|----------|
| **Practice memory updates** | Morning Brief, recommendations, weekly review |
| **DNA candidate patches** | Office manager review queue |
| **FAQ candidates** | Knowledge Engine L3 prose or L2 regional defaults |
| **Confidence adjustments** | Brain classification thresholds (per practice) |
| **Friction alerts** | Product and onboarding teams |
| **Monthly intelligence narratives** | Owner dentist, office manager |

---

## 4. Patient Communication Patterns

FreedomDesk observes how patients **actually communicate** — not how scripts assume they will.

### Pattern classes

| Pattern | Learning value |
|---------|----------------|
| **Terminology mismatch** | Caller says "cleaning" but needs perio maintenance — informs disambiguation |
| **Regional phrasing** | West Michigan idioms for insurance, urgency, scheduling | 
| **Question order sensitivity** | Callers who ask insurance before stating complaint — routing insight |
| **Comprehension failures** | Repeated "I don't understand" on same topic — explanation gap |
| **Channel preference signals** | Callers requesting text callback — Patient Experience DNA |
| **Minimization language** | "It's probably nothing" before urgent symptoms — triage calibration |

### What FreedomDesk does with communication patterns

1. **Tag** the pattern with evidence count and confidence
2. **Compare** to existing Knowledge Engine playbooks and CALL_FLOWS structure
3. **Propose** explanation improvements, FAQ entries, or disambiguation question refinements
4. **Never** auto-change patient-facing language without human review

### Boundaries

- Communication pattern learning uses **de-identified aggregates** — not caller profiling
- Patterns about protected classes, accent, or demographics are **out of scope**
- Learning does not optimize for shorter calls at the expense of comprehension

---

## 5. Emotional Trends

Emotional learning extends [`EMOTIONAL_INTELLIGENCE_ENGINE.md`](EMOTIONAL_INTELLIGENCE_ENGINE.md) from per-call assessment to **practice-level emotional intelligence**.

### Trend dimensions

| Dimension | Practice-level question |
|-----------|-------------------------|
| **Anxiety prevalence** | Are new patient calls increasingly anxious vs. calm? |
| **Financial stress signals** | Is cost language appearing more often before scheduling? |
| **Frustration sources** | Hold times, scheduling delays, insurance confusion — which dominates? |
| **Pain distress handling** | Is acknowledgment-before-admin compliance improving? |
| **De-escalation success** | Do frustrated callers complete intake after validation? |
| **Emotional arc quality** | Are calls ending calmer than they started? |

### Learning actions

| Observation | Candidate action |
|-------------|------------------|
| High `billingFrustration` flag rate | Recommend billing callback SLA review; front desk briefing |
| New patient anxiety not decreasing across call | Review explanation sequence; suggest Patient Experience DNA note |
| Pediatric protective distress pattern | Confirm pediatric playbook brevity; hygiene block messaging |
| Post-reassurance hang-up rate | Audit for false promise language — constitutional violation |

### Boundaries

- Emotional trends are **aggregated** — no per-patient emotional dossiers
- Learning does not label individual patients as "difficult" or "anxious" in PMS
- Emotional intelligence improvements must not reduce triage rigor

---

## 6. Scheduling Patterns

Scheduling learning connects caller behavior to **schedule reality** without pretending FreedomDesk owns the schedule of record.

### Observable patterns

| Pattern | Signal |
|---------|--------|
| **Time preference clusters** | Callers prefer early morning hygiene; reject late Friday doctor |
| **Offer acceptance rate** | Which offered slots convert to kept appointments |
| **Request-to-confirm latency** | How long until front desk confirms FreedomDesk requests |
| **Appointment type accuracy** | Crown seat vs. generic "appointment" correction rate |
| **Same-day emergency squeeze success** | Urgent flags that resulted in same-day care |
| **Waitlist conversion** | Waitlist offers accepted vs. expired |
| **Cancellation recovery** | Openings filled from cancellation list after FreedomDesk alert |
| **Column mismatch** | Hygiene need booked as doctor — rework indicator |

### Learning actions

| Observation | Candidate action |
|-------------|------------------|
| Consistent Tuesday 8–9 AM new patient surge | Morning Brief staffing suggestion |
| Low acceptance for offered afternoon slots | Adjust **request language** only after manager confirms schedule policy |
| High `appointmentType` correction on denture calls | Improve denture stage disambiguation in knowledge |
| Frequent crown seat duration conflicts | DNA candidate: verify `durationMinutes` override |

### Boundaries

- Learning does **not** auto-book or auto-modify PMS schedules
- Slot preference patterns inform **recommendations**, not guaranteed availability language
- Seasonal patterns require minimum sample size before surfacing (see §19)

---

## 7. Insurance Trends

Insurance learning respects West Michigan program taxonomy — never collapsing "Delta" into one plan.

### Observable patterns

| Pattern | Signal |
|---------|--------|
| **Disambiguation success rate** | Caller stated carrier → final program classification accuracy |
| **HKD / Medicaid identification** | Healthy Kids vs. adult Medicaid confusion frequency |
| **Employer PPO hints** | "Through work" → Delta PPO inference accuracy |
| **Cash-pay hesitation** | Callers reluctant to state no insurance — emotional + intake pattern |
| **Benefits question volume** | Callers asking coverage questions FreedomDesk must defer |
| **Verification rework** | Front desk changes insurance field post-summary |
| **New carrier emergence** | Carrier names not in entity index |

### Learning actions

| Observation | Candidate action |
|-------------|------------------|
| High Delta disambiguation failure | FAQ: "Delta Dental types we see most often"; refine disambiguation tree proposal |
| HKD callers confused with adult Medicaid | Pediatric intake clarification candidate |
| Repeated benefits questions on same procedure | Office FAQ: "We verify benefits before your visit" |
| Unknown carrier spike | Alert onboarding: update `acceptedCarriers` in Office DNA |

### Constitutional invariant

Insurance learning **never** produces rules that promise coverage. Learning may only improve **classification, explanation, and routing** — not benefit guarantees.

---

## 8. Emergency Trends

Emergency learning audits **safety performance** — the highest-stakes learning domain.

### Observable patterns

| Pattern | Signal |
|---------|--------|
| **Red-flag match rate** | Symptoms triggering L1 atoms correctly |
| **Urgency monotonicity compliance** | Urgency never inappropriately lowered mid-call |
| **After-hours escalation timing** | On-call callback within Office DNA SLA |
| **ER/911 guidance appropriateness** | Life-threatening presentations directed correctly |
| **Caller minimization resistance** | "Probably nothing" + fever/swelling still escalated |
| **Same-day flag outcomes** | `sameDayEmergency: true` summaries → actual same-day care |
| **Insurance-before-triage violations** | Pain callers asked insurance before symptom acknowledgment |

### Learning actions

| Observation | Candidate action |
|-------------|------------------|
| SLA misses on on-call callbacks | DNA review: `callbackSlaMinutes`; Morning Brief alert |
| Same-day flags not resulting in care | Workflow review with office manager — not clinical second-guessing |
| Repeated triage question omissions | Knowledge atom or required-fields review |
| Seasonal emergency volume spike | Capacity briefing; after-hours staffing recommendation |

### Boundaries

- Emergency learning does **not** second-guess clinical outcomes
- Learning cannot weaken L1 red-flag atoms or urgency floors
- Emergency audit samples are reviewed by humans — not auto-remediated

---

## 9. Treatment Acceptance Patterns

Treatment acceptance learning observes **scheduling and intake signals** — not clinical case acceptance in the operatory.

### Scope clarification

| In scope | Out of scope |
|----------|--------------|
| Caller schedules recommended treatment (crown seat, RCT, extraction) | Whether patient accepted treatment plan in chair |
| Caller declines to schedule; requests callback | Clinical appropriateness of proposed treatment |
| Unscheduled treatment mentioned on call | Fee quotes or insurance benefit promises |
| Implant consult requests vs. completions | Diagnosis of treatment need |

### Observable patterns

| Pattern | Signal |
|---------|--------|
| **Treatment scheduling conversion** | Mentioned treatment → appointment requested |
| **Deferral language** | "I need to think about it," "call me back" — routing to follow-up |
| **Financial barrier signals** | Cost questions before scheduling treatment calls |
| **Fear barrier signals** | Anxiety flags on RCT, extraction, implant intents |
| **Multi-visit confusion** | Crown prep vs. seat vs. temp — caller confusion pattern |
| **Referral vs. in-house** | Caller expecting in-house service office refers out |

### Learning actions

| Observation | Candidate action |
|-------------|------------------|
| High deferral on implant consults | Patient Experience DNA: financing referral script authorized? |
| Crown prep/seat confusion frequent | FAQ or explanation improvement candidate |
| RCT fear without scheduling | Confirm anxiety notation; follow-up callback recommendation to team |
| In-house vs. referral mismatch | DNA drift alert: `rootCanalInHouse` accuracy |

---

## 10. Missed Opportunity Detection

Missed opportunity detection is how FreedomDesk fulfills the Chief of Staff mandate to **surface revenue and retention the team would catch with infinite attention** — without inventing opportunities.

### Opportunity classes

| Class | Detection signal |
|-------|------------------|
| **Abandoned intake** | Call ended before required fields collected; no callback completed |
| **Unscheduled treatment** | Existing patient mentions recommended treatment; no appointment requested |
| **Recall overdue** | PMS recall status + hygiene scheduling intent not converted |
| **New patient not scheduled** | Complete intake but no appointment request |
| **Waitlist not offered** | Caller needed sooner; waitlist enabled but not mentioned |
| **Cancellation not recovered** | Opening created; no waitlist outreach triggered |
| **Insurance screening dropout** | Caller hung up during disambiguation — possible access barrier |
| **Second-chance reschedule** | Cancel intent that was actually reschedule — not converted |

### Opportunity record shape (conceptual)

Each detected opportunity carries:

- **Type** and **confidence**
- **Evidence** — summary fields, not transcript prose in logs
- **Suggested action** — callback, waitlist, recall outreach
- **Owner role** — front desk, hygiene coordinator, office manager
- **Expiry** — opportunities stale after configured window

### Boundaries

- Opportunities are **recommendations**, not automated outbound campaigns without practice approval
- FreedomDesk does not pressure patients toward treatment
- False opportunity rate must stay low — alert fatigue destroys trust (see §19)

---

## 11. Workflow Friction Detection

Workflow friction is the organizational mirror of the Constitution's **rework reduction** principle.

### Friction signals

| Signal | Meaning |
|--------|---------|
| **Summary field edit rate** | Team re-types or corrects specific fields often |
| **Comm log rejection** | Summary not pasted into PMS — incomplete or untrusted |
| **Repeat caller same issue** | Caller called back within 48 hours on same intent |
| **Transfer escalation after FreedomDesk** | Call returned to human unnecessarily |
| **PMS write-back failure** | Integration could not complete scheduled action |
| **Intent misclassification correction** | Team re-labels intent on review |
| **Missing required field frequency** | CALL_FLOWS schema fields empty at call end |
| **Long coordinator rework time** | Time from summary delivery to PMS entry (if measurable) |

### Friction severity

| Severity | Response |
|----------|----------|
| **Critical** | Safety or emergency field wrong — immediate human review |
| **High** | >25% edit rate on field — weekly learning review item |
| **Moderate** | Emerging pattern — monitor until confidence threshold |
| **Low** | One-off — log but do not act |

### Learning actions

Friction produces **root-cause categories**:

- Knowledge gap (missing FAQ or atom)
- DNA inaccuracy (wrong hours, insurance, appointment type)
- Reasoning gap (disambiguation order, field priority)
- Integration gap (PMS mapping)
- Training gap (team workflow, not FreedomDesk)

---

## 12. Frequently Asked Questions

FAQ learning transforms repeated caller questions into **durable practice knowledge**.

### FAQ lifecycle

```
Repeated question detected (≥N times in window)
  → De-identified question cluster formed
  → Compared to existing Knowledge Engine content
  → Gap confirmed (not already answered in L2/L3)
  → FAQ candidate drafted (factual, constitutional)
  → Human review (office manager or FreedomDesk consultant)
  → Approved → L3 practice FAQ or L2 regional candidate
  → Measured: repeat question rate declines
```

### FAQ quality rules

| Rule | Rationale |
|------|-----------|
| **Answer only what the practice has authorized** | Truth principle |
| **No coverage or fee promises** | Constitutional invariant |
| **Cite DNA source** | Hours, insurance, policies from resolved snapshot |
| **Plain language** | CALL_FLOWS pacing; EIE comprehension |
| **Versioned** | FAQ changes audit like DNA changes |

### Examples (West Michigan)

| FAQ candidate | Trigger |
|---------------|---------|
| "Do you take Delta Dental?" | Clarify program types; never yes/no without disambiguation |
| "What should I bring to my first visit?" | New patient question cluster |
| "Do you see kids?" | Pediatric vs. general family practice |
| "Is parking free?" | Operational — Office DNA |
| "Can I be seen today?" | Honest same-day policy language |

---

## 13. Practice Knowledge Growth

Practice knowledge growth is how **one office's validated learning** enriches its operational playbook without duplicating the Knowledge Engine.

### Growth layers

| Layer | What grows |
|-------|------------|
| **L3 Office DNA** | Policies, preferences, appointment types, accepted insurance |
| **L3 practice FAQs** | Office-specific answers authorized by manager |
| **L3 post-op scripts** | Practice-approved scripts only |
| **Practice memory** | Patterns, baselines, recommendation history |
| **Team playbook notes** | Brief sections, escalation preferences |

### Growth vs. drift

| Knowledge growth (good) | DNA drift (bad) |
|-------------------------|-----------------|
| Manager approves new HKD acceptance | Config says open Saturday; office closed for months |
| FAQ added for parking | Emergency callback number stale |
| Crown duration corrected to 45 min | Insurance list missing newly contracted PPO |

FreedomDesk actively detects **drift** — configured knowledge diverging from operational reality — and surfaces correction candidates. Drift detection never auto-patches DNA.

### Contribution to L2 (regional defaults)

With explicit opt-in aggregate governance, patterns validated across multiple West Michigan practices may become **L2 candidate atoms** — anonymized, no practice-identifiable data. Single-practice anecdotes do not become regional truth.

---

## 14. Office Preference Learning

Office preference learning captures **how the practice wants FreedomDesk to behave** — distinct from universal defaults.

### Preference domains

| Domain | Learnable preference |
|--------|---------------------|
| **Communication** | Greeting formality, agent name, hold language |
| **Scheduling** | Booking mode emphasis (request vs. confirmed language) |
| **Routing** | Transfer vs. callback preferences |
| **Briefings** | Morning Brief sections enabled/disabled |
| **Alerts** | Threshold sensitivity, quiet hours |
| **Summary delivery** | Email vs. SMS vs. webhook priority |
| **Waitlist** | Offer proactively vs. only on request |

### Learning sources

- Explicit manager configuration (authoritative)
- Observed manager behavior (accept/dismiss recommendation patterns)
- Stated feedback during onboarding reviews
- **Not** inferred from single caller interactions

### Application

Office preferences write to **Office DNA** or **team settings** — never to ad-hoc prompt overrides. All preferences must be inspectable in the effective knowledge viewer ([`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) §7.5).

---

## 15. Doctor Preference Learning

Doctor preference learning respects the Constitution's **humility** principle — FreedomDesk supports clinical workflow; it does not usurp clinical judgment.

### Learnable doctor preferences (from DNA + validated patterns)

| Preference | Example |
|------------|---------|
| **Treatment scope** | RCT in-house vs. referral; implant policy |
| **Scheduling column** | Doctor-only new patient exams |
| **Emergency handling** | Doctor wants symptom summary before callback |
| **High-anxiety patients** | Flag for extra chair time notation |
| **Complex case routing** | Office manager callback before scheduling |
| **Provider-specific booking** | "I see Dr. Smith only" — PMS provider mapping |

### Learning boundaries

| Forbidden | Reason |
|-----------|--------|
| Inferring clinical standards from outcomes | FreedomDesk does not see operatory care |
| Learning "doctor always extracts" from calls | Clinical decision, not phone pattern |
| Auto-changing treatment recommendations | Clinical judgment belongs to dentist |
| Ranking doctor performance | Not FreedomDesk's role |

Doctor preferences enter the system through **onboarding, DNA updates, and explicit dentist feedback** — not silent inference.

---

## 16. Front Desk Preference Learning

Front desk preference learning optimizes **the team's daily interface** with FreedomDesk output.

### Learnable preferences

| Preference | Signal |
|------------|--------|
| **Summary format priority** | Which fields coordinator checks first |
| **Notification timing** | Real-time vs. batched summaries |
| **Callback ownership** | Which staff role receives which intent |
| **Correction patterns** | Fields always edited → workflow or knowledge fix |
| **Comm log style** | Short vs. detailed — match office habit |
| **Escalation thresholds** | When coordinator prefers live transfer |

### Rework as learning signal

The front desk is FreedomDesk's **ground truth** for summary quality. High edit rates on a field are not "user error" — they are **learning input**:

> If Maria corrects `appointment.type` on 30% of crown calls, FreedomDesk learns its appointment type resolution needs improvement — not that Maria types wrong.

### Application

Front desk preferences inform:

- Summary field ordering and emphasis
- Recommendation routing
- Friction reduction priorities
- DNA validation questions during weekly review

---

## 17. Patient Preference Memory

Patient preference memory is the **most constrained** learning domain — high value for experience, highest privacy risk.

### Scope (V1 and constitutional default)

| Allowed with consent + PMS | Forbidden |
|----------------------------|---------|
| Preferred appointment times (from PMS) | Cross-call conversation memory without consent |
| Preferred provider (from PMS) | Emotional profiling dossiers |
| Language preference (if in PMS/DNA) | Financial behavior scoring |
| Accessibility notes authorized in chart | Inferred health conditions beyond call facts |
| Callback number on file | Sharing preferences across practices |

### Per-call vs. cross-call

[`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) specifies V1 reasoning does not retain conversation memory across calls. Patient preference memory for returning patients comes from **PMS authoritative data**, not FreedomDesk-constructed profiles.

### Future cross-call memory (if implemented)

Requires:

- Practice explicit enablement
- Patient consent mechanism per HIPAA
- Minimum necessary retention
- Right to deletion
- No use for cross-practice training

### Learning from preferences

Aggregate only:

- "Many existing patients prefer morning hygiene" — scheduling recommendation
- Not: "John Smith always complains about billing" — stigma and privacy violation

---

## 18. Recommendation Engine

The Recommendation Engine transforms learning into **actionable, governable suggestions** for the practice team.

### Recommendation types

| Type | Example | Owner |
|------|---------|-------|
| **Operational** | Staff brief for Monday new-patient surge | Office manager |
| **Scheduling** | Offer waitlist outreach for tomorrow's opening | Front desk |
| **Retention** | Recall overdue cluster outreach | Hygiene coordinator |
| **Configuration** | Update Saturday hours in DNA | Office manager |
| **Knowledge** | Approve FAQ candidate | Office manager |
| **Quality** | Review emergency call sample | Dentist + manager |
| **Integration** | PMS write-back failure pattern | FreedomDesk support |

### Recommendation anatomy

Every recommendation includes:

```yaml
Recommendation:
  id: string
  type: operational | scheduling | retention | configuration | knowledge | quality
  title: string
  rationale: string                    # plain language, explainable
  evidence:
    pattern: string
    sampleSize: number
    confidence: 0.0–1.0
    timeWindow: string
  suggestedAction: string
  ownerRole: front_desk | office_manager | dentist | hygiene
  priority: low | medium | high
  expiresAt: ISO8601
  status: pending | accepted | dismissed | snoozed | implemented
  provenance:
    learningEngineVersion: string
    practiceMemorySnapshot: string
```

### Recommendation principles

| Principle | Implementation |
|-----------|----------------|
| **Actionable** | Every recommendation has a clear next step |
| **Concise** | Chief of Staff brevity — not dashboard noise |
| **Honest** | Uncertainty stated when confidence low |
| **Reversible** | Dismissed recommendations inform calibration |
| **Non-coercive** | Team may ignore without penalty |
| **Constitutional** | No recommendation implies coverage, diagnosis, or guaranteed outcomes |

### Feedback loop

Accept/dismiss/implement signals adjust future recommendation confidence for **this practice only** — organizational calibration, not model retraining.

---

## 19. Confidence Before Learning

FreedomDesk does not learn from anecdotes. Every pattern must meet **confidence thresholds** before becoming a candidate — and higher thresholds before affecting patient-facing behavior.

### Confidence stages

| Stage | Threshold | Effect |
|-------|-----------|--------|
| **Observation** | 1 instance | Log only; no action |
| **Pattern** | ≥5 instances in 30 days OR ≥3% of intent volume | Internal flag |
| **Candidate** | Pattern + ≥0.70 confidence + stable 2 weeks | Enters review queue |
| **Validated** | Human approval | May update DNA, FAQ, or recommendations |
| **Production** | Validated + post-change monitoring | Active in practice operations |

### Confidence factors

| Factor | Weight |
|--------|--------|
| **Sample size** | Higher N → higher confidence |
| **Temporal stability** | Pattern persists across weeks |
| **Multi-source corroboration** | Summary + PMS + team edit agree |
| **Contradiction absence** | No conflicting signals |
| **Severity** | Safety patterns lower threshold for review, not for auto-apply |

### Low-data honesty

When data is sparse — new practice, low call volume, seasonal anomaly — FreedomDesk states **insufficient evidence** rather than fabricating trends. Sparse-data practices receive fewer recommendations, not more speculative ones.

### Alignment with Brain Architecture

Per-call confidence scoring ([`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) §15) and organizational learning confidence are related but distinct:

- **Call confidence** — may I state this to the caller now?
- **Learning confidence** — may I propose this as a practice pattern?

---

## 20. Human Review Requirements

Human review is not a bottleneck — it is the **moral gate** that keeps learning safe and trustworthy.

### Always requires human review

| Change type | Reviewer |
|-------------|----------|
| **L3 Office DNA patch** | Office manager (minimum) |
| **Patient-facing FAQ** | Office manager |
| **Emergency policy change** | Dentist + office manager |
| **Insurance acceptance list change** | Office manager |
| **Safety-related learning alert** | FreedomDesk clinical review + practice |
| **L2 regional default proposal** | FreedomDesk domain governance |
| **Any learning from <10 samples** | Office manager acknowledgment |

### Review cadence

| Cadence | Review scope |
|---------|--------------|
| **Per candidate** | DNA patches, FAQs, policy changes — as surfaced |
| **Weekly** | Learning review digest ([§24](#24-weekly-learning-review)) |
| **Monthly** | Intelligence report validation ([§25](#25-monthly-intelligence-report)) |
| **Quarterly** | DNA comprehensive audit; dentist sign-off on clinical scope |

### Review interface principles

- Show **evidence**, not raw transcripts with PHI in aggregate views
- Show **effective value before/after** for DNA changes
- One-click dismiss with reason — feeds calibration
- Audit trail: who approved, when, what version

### What never requires only automated approval

- Patient-facing behavior changes
- Safety or emergency protocol modifications
- Insurance acceptance changes
- Anything a dentist would be embarrassed to discover unannounced

---

## 21. Learning Boundaries

Learning boundaries implement Constitution **What FreedomDesk Will Never Do** for the improvement domain.

### Permanent boundaries

| Boundary | Rule |
|----------|------|
| **No cross-practice patient learning** | Tenant isolation absolute |
| **No PHI in learning logs** | Operational metadata only |
| **No autonomous DNA writes** | Suggest → review → apply |
| **No clinical learning** | No diagnosis or treatment outcome modeling |
| **No coverage learning** | Cannot infer benefits from historical calls |
| **No surveillance** | No employee monitoring beyond operational metrics |
| **No manipulation** | Learning cannot optimize persuasion toward treatment |
| **No constitutional override** | Learning cannot weaken L1 locked atoms |
| **No silent prompt drift** | Language changes require validated knowledge path |
| **No training on calls without BAA authorization** | Explicit practice consent for any model use |

### Practice opt-out

Practices may disable categories of learning:

- Recommendation engine (summary only mode)
- Aggregate analytics contribution to L2
- Patient preference features (future)

Opt-out does not disable safety auditing — constitutional obligations remain.

### Data retention boundaries

| Data class | Retention guidance |
|------------|-------------------|
| De-identified aggregates | Rolling 24–36 months |
| Recommendation history | 12 months |
| Friction logs (no PHI) | 12 months |
| DNA version history | Indefinite (metadata) |
| Call summaries | Per HIPAA and practice policy |

---

## 22. Knowledge Validation

Knowledge validation ensures learned content meets **truth, safety, and explainability** before entering the Knowledge Engine.

### Validation pipeline

```
Learning candidate
  → Constitutional checklist
  → Schema validation (Office DNA / atom format)
  → Locked atom conflict check
  → Clinical/domain review (if triage, emergency, insurance)
  → Practice manager approval
  → Versioned publish
  → Post-publish monitoring (repeat question rate, friction rate)
```

### Constitutional checklist

| Question | Must pass |
|----------|-----------|
| Does this promise coverage, fees, or availability? | No |
| Does this diagnose or advise treatment? | No |
| Does this override L1 locked safety? | No |
| Is this inspectable and versioned? | Yes |
| Can we cite why this is true for this office? | Yes |
| Does this reduce front desk rework? | Prefer yes |

### Rollback

Every validated change supports **one-click rollback** to prior `configVersion`. Learning that degrades metrics triggers automatic rollback **recommendation** — not automatic revert without human acknowledgment.

### Effective knowledge viewer

After validation, changes appear in the effective knowledge viewer with full provenance chain ([`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) §7.5) — practice trust requires transparency.

---

## 23. Continuous Improvement Cycle

The Continuous Improvement Cycle is the **operational heartbeat** of organizational learning — running daily, compounding weekly, strategic monthly.

### Cycle diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EVERY INTERACTION                                 │
│  Call / message → Reason → Summarize → Post-interaction reflection   │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OBSERVE (real-time + async)                       │
│  Friction signals · outcomes · team edits · opportunity detection    │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PATTERN (batch, confidence-gated)                 │
│  Aggregate · compare to baseline · tag candidates                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RECOMMEND                                           │
│  Chief of Staff suggestions → role-routed queue                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REVIEW (human)                                    │
│  Manager / dentist validation · dismiss · implement                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLY (versioned)                                   │
│  DNA · FAQ · knowledge atoms · calibration · briefings               │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MEASURE                                             │
│  Did friction decrease? Did repeat questions decline? ROI narrative  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                └──────────► Practice memory (richer baseline)
```

### Daily rhythm

| Time | Activity |
|------|----------|
| **During calls** | Real-time reasoning + summary; post-interaction reflection |
| **End of day** | End-of-Day Summary ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §28) |
| **Overnight** | Pattern aggregation; candidate generation; Morning Brief prep |

### Improvement without disruption

The cycle runs **behind** patient-facing behavior. Callers never experience "learning in progress." Teams experience gradual reduction in friction — not daily churn in how FreedomDesk sounds.

---

## 24. Weekly Learning Review

The Weekly Learning Review is the **manager's learning digest** — distinct from operational weekly practice review, focused on **how FreedomDesk and practice knowledge improved**.

### Review contents

| Section | Purpose |
|---------|---------|
| **Learning highlights** | Top patterns discovered this week |
| **Validated changes** | DNA, FAQ, calibration updates applied |
| **Pending candidates** | Items awaiting manager decision |
| **Friction report** | Fields edited, repeat callers, summary rejection rate |
| **Opportunity post-mortem** | Detected vs. captured opportunities |
| **Emergency audit sample** | 1–3 calls reviewed for protocol adherence |
| **Insurance classification accuracy** | Program-level accuracy vs. team verification |
| **Emotional intelligence pulse** | Anxiety/frustration trends; EIE compliance |
| **Recommendation scorecard** | Accepted / dismissed / implemented |
| **DNA health** | Drift flags, stale fields |
| **Next week focus** | Manager-selected learning priority |

### Review principles

- **Comparative** — week over week, not isolated counts
- **Honest** — misses and false positives visible
- **Actionable** — every section links to approve, dismiss, or delegate
- **Brief** — readable in 10 minutes; Chief of Staff discipline

### Engagement targets

| Metric | Target |
|--------|--------|
| Manager opens weekly learning review | ≥75% |
| Pending candidates cleared within 14 days | ≥80% |
| Friction rate week-over-week | Declining trend |
| Recommendation acceptance | ≥40% (calibrated — not maximized blindly) |

---

## 25. Monthly Intelligence Report

The Monthly Intelligence Report synthesizes learning into **strategic practice narrative** — the board-ready view of cumulative improvement.

### Report structure

| Domain | Learning narrative |
|--------|-------------------|
| **Access & communication** | Call patterns, FAQ impact, confusion reduction |
| **Clinical boundary performance** | Emergency handling quality, triage accuracy |
| **Insurance intelligence** | Classification accuracy, disambiguation improvements |
| **Scheduling intelligence** | Fill patterns, opportunity capture, waitlist ROI |
| **Emotional experience** | Anxiety trends, acknowledgment compliance |
| **Team efficiency** | Rework reduction, summary trust, time saved estimate |
| **Knowledge evolution** | DNA changes, FAQs added, drift corrected |
| **FreedomDesk ROI** | Documented value vs. subscription |
| **Forward recommendations** | Top 5 validated initiatives for next month |

### Report outputs

| Output | Audience |
|--------|----------|
| PDF / email report | Owner dentist, office manager |
| Dashboard archive | Historical comparison |
| FreedomDesk account review (Custom tier) | Success team |
| Opt-in L2 feedback | Anonymized regional default candidates |

### Delivery standards

| Metric | Target |
|--------|--------|
| Report delivery | 100% by 3rd business day of month |
| ROI narrative | Manager-validated before send |
| Forward recommendations | ≤5 — restraint over noise |
| Month-over-month learning velocity | Measurable improvement in ≥3 domains |

---

## 26. Long-Term Practice Evolution

Long-term practice evolution is how FreedomDesk becomes **more valuable in year two than day one** — for this specific practice.

### Evolution dimensions

| Dimension | Year-one → year-two trajectory |
|-----------|-------------------------------|
| **Office DNA accuracy** | Complete, current, drift-free |
| **FAQ coverage** | Common questions answered before callers ask |
| **Recommendation precision** | Higher acceptance, fewer dismissals |
| **Friction rate** | Summary edit rate approaches zero |
| **Opportunity capture** | More detected opportunities converted |
| **Seasonal anticipation** | Briefs predict surges before they hit |
| **Team trust** | Staff cite FreedomDesk summaries without second-guessing |
| **Patient experience** | Repeat confusion topics eliminated |

### Institutional memory

Long-term evolution draws on [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §27 Long-term Practice Memory:

- Configuration history
- Operational baselines (24–36 month rolling)
- Recommendation calibration history
- Seasonal patterns
- Integration health patterns

Memory is **operational**, not clinical. It makes the Chief of Staff wiser — not omniscient.

### Multi-location and ownership transition

When practices add locations or change ownership:

- DNA is per-location — learning does not assume homogeneity
- Memory exports follow practice data rights
- New owners receive DNA audit, not hidden inherited assumptions

### Platform evolution (L2)

Validated patterns across opt-in practices may improve **West Michigan regional defaults** — raising the floor for new onboardings without erasing office autonomy.

### The ten-year test

Learning archived today must be explainable to a future engineer or office manager: what was learned, from what evidence, who approved it, and whether it helped. If it cannot pass that test, it should not be stored.

---

## 27. Post-Interaction Reflection

After every interaction, FreedomDesk performs **structured organizational reflection** — internal assessment, not patient-facing monologue. This is the atomic unit of the Continuous Learning Engine.

### The reflection questions

FreedomDesk asks itself:

| Question | Learning domain |
|----------|-----------------|
| **What did I learn?** | New pattern, preference signal, or confirmed baseline |
| **What confused the patient?** | Communication gap, terminology, process ambiguity |
| **What could I explain better?** | FAQ candidate, knowledge clarification |
| **Did I discover a recurring problem?** | Friction, repeat intent, systemic DNA issue |
| **Did I reduce anxiety?** | Emotional arc; EIE effectiveness |
| **Did I reduce work for the team?** | Summary completeness, edit likelihood, rework |
| **Should this become office knowledge?** | FAQ, DNA, or playbook candidate |

### Reflection artifact (conceptual)

```yaml
PostInteractionReflection:
  callId: string                       # internal only; not logged with PHI
  practiceId: string
  intent: string
  timestamp: ISO8601

  learnings:
    - category: communication | emotional | scheduling | insurance | ...
      observation: string
      confidence: 0.0–1.0
      becomesCandidate: boolean

  confusionPoints: [ string ]
  explanationGaps: [ string ]
  recurringProblem: { detected: boolean, patternId: string | null }
  anxietyImpact: { reduced: boolean | unknown, arc: string }
  teamReworkRisk: { low | medium | high, reasons: [ string ] }
  officeKnowledgeCandidate: { recommended: boolean, type: faq | dna | playbook }

  constitutionalViolations: [ ]        # must be empty; else escalate
```

### Reflection rules

1. **Reflection runs after summary generation** — operational output first
2. **Reflection does not change the call** — the interaction is complete
3. **No PHI in reflection logs** — categories and confidence, not caller quotes in aggregate systems
4. **Violations escalate** — false promise detected → quality alert, not learning input
5. **Zero-learning calls are valid** — routine confirm with no new pattern is success, not failure

### Connection to brains

Post-interaction reflection consumes `ConversationAnalysis` artifacts from the Brain Architecture — intent, confidence, emotional arc, conflicts resolved, provenance — without re-running reasoning.

---

## 28. Measurable Learning Metrics

Learning must be **observable**. Vanity metrics that reward call volume or speed without quality are excluded.

### Primary learning metrics

| Metric | Definition | Target direction |
|--------|------------|------------------|
| **Summary field edit rate** | % summaries with ≥1 team correction | ↓ |
| **Classification accuracy** | Insurance program + appointment type vs. team verification | ↑ |
| **Repeat question rate** | Same FAQ topic within 30 days after FAQ published | ↓ |
| **Friction resolution time** | Days from pattern detection to validated fix | ↓ |
| **Recommendation acceptance rate** | Accepted / (accepted + dismissed) | Stable ↑ then plateau |
| **Opportunity capture rate** | Converted opportunities / detected | ↑ |
| **DNA drift incidents** | Stale config causing caller confusion per month | ↓ |
| **Emergency protocol adherence** | Audit sample pass rate | ≥98% |
| **Emotional arc success** | Calls with de-escalation or stable calm close | ↑ |
| **Anxiety acknowledgment latency** | Turns before admin when distress present | ≤1 |
| **Learning candidate precision** | Validated candidates / total candidates | ↑ |
| **Post-interaction learning yield** | Calls producing ≥1 observation / total calls | Stable (not maximized) |

### Secondary metrics

| Metric | Purpose |
|--------|---------|
| **FAQ time-to-publish** | Responsiveness of knowledge growth |
| **Weekly review engagement** | Manager adoption |
| **Rollback rate** | Quality of validated changes |
| **Repeat caller rate (48h, same intent)** | Intake or resolution failure signal |
| **Summary-to-PMS time** | Team efficiency proxy |
| **New patient conversion** | Learning impact on growth (with caution — many factors) |

### Anti-metrics (do not optimize)

| Anti-metric | Why harmful |
|-------------|-------------|
| Raw call volume | Rewards noise |
| Average handle time alone | Rewards rushed incomplete intake |
| Autonomous changes applied | Rewards bypassing human review |
| Recommendations generated | Rewards alert fatigue |
| Cross-practice data accumulation | Privacy violation |

### Metric governance

Metrics are reviewed monthly for **goodharting risk** — if a metric improves while practice trust declines, the metric is wrong.

---

## 29. System Integration

The Continuous Learning Engine is not a standalone service. It integrates across FreedomDesk's architecture as the **memory and improvement layer**.

### Integration map

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FREEDOMDESK_CONSTITUTION                          │
│  Truth · Safety · Stewardship · Improvement is a duty                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ governs
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│           CONTINUOUS LEARNING ENGINE (this document)                 │
│  Patterns · memory · recommendations · validation · cycles           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ feeds & consumes
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Practice      │     │ Knowledge       │     │ Brain           │
│ Operating     │     │ Engine          │     │ Architecture    │
│ System        │     │ L1/L2/L3        │     │ Conversation    │
└───────────────┘     └─────────────────┘     │ Analysis        │
        │                       │             └────────┬────────┘
        │                       │                      │
        ▼                       ▼                      ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Office DNA    │     │ Emotional       │     │ Call Flows      │
│ L3 config     │     │ Intelligence    │     │ Summary schemas │
└───────────────┘     │ Engine          │     └─────────────────┘
                        └─────────────────┘
```

### Constitution

| Principle | CLE implementation |
|-----------|-------------------|
| **Truth** | No learning that fabricates facts; validation before publish |
| **Safety** | Emergency learning audits; no weakening red flags |
| **Stewardship** | Minimum necessary data; fiduciary handling |
| **Humility** | Human review; no autonomous clinical learning |
| **Improvement is a duty** | Continuous Improvement Cycle §23 |
| **Explainability** | Provenance on every recommendation and DNA change |

### Practice Operating System

| POS capability | CLE contribution |
|----------------|------------------|
| Morning Brief | Overnight pattern aggregation |
| Opportunity Detection | Missed opportunity patterns §10 |
| AI Recommendations | Recommendation Engine §18 |
| End-of-Day Summary | Daily learning yield |
| Weekly Practice Review | Learning digest §24 |
| Monthly Practice Intelligence | Strategic narrative §25 |
| Long-term Practice Memory | Evolution baseline §26 |

### Brain Architecture

| Brain output | Learning use |
|--------------|--------------|
| `ConversationAnalysis` | Post-interaction reflection input |
| Confidence metadata | Classification accuracy tracking |
| `conflictsResolved` | Friction and reasoning gap signals |
| `emotionalArc` | Emotional trend aggregation |
| Provenance / atom IDs | Explainable audit trails |
| `needsReview: true` | Quality review queue |

Learning does **not** modify brain code at runtime. Calibration changes go through validated configuration paths.

### Emotional Intelligence Engine

| EIE element | CLE learning |
|-------------|--------------|
| Measurable goals §8 | Emotional trend baselines |
| `EmotionAssessment` | Per-call arc aggregation |
| Interaction disciplines | Compliance auditing |
| False promise prohibition | Constitutional violation detection |

### Knowledge Engine

| Layer | CLE interaction |
|-------|-----------------|
| **L1** | Immutable; learning cannot override |
| **L2** | Opt-in aggregate improvement candidates |
| **L3** | Primary target for validated DNA and FAQ growth |
| **Resolver** | Drift detection vs. effective snapshot |
| **Versioning** | All learning applications versioned |

### Office DNA

Office DNA is the **primary sink** for validated learning:

- Scheduling preferences
- Insurance acceptance
- Emergency policy
- Communication style
- Doctor and front desk preferences
- Practice FAQs

DNA remains declarative — learning proposes patches; humans approve.

### Call Flows

| CALL_FLOWS element | CLE interaction |
|--------------------|-----------------|
| Summary schemas | Required field completion tracking |
| Intent categories | Intent mix trends |
| Triage trees | Emergency adherence auditing |
| Universal rules | Monologue, close, honesty compliance |
| West Michigan insurance order | Classification accuracy baseline |

Call Flows structure is authoritative. Learning proposes improvements through knowledge validation — not silent flow mutation.

---

## 30. Related Documents

| Document | Relationship |
|----------|--------------|
| [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) | Highest authority; learning boundaries |
| [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) | Chief of Staff capabilities consuming CLE output |
| [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) | Knowledge structure, L3 patches, versioning |
| [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) | Practice profile domains learning updates |
| [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) | Per-call reasoning artifacts feeding reflection |
| [`EMOTIONAL_INTELLIGENCE_ENGINE.md`](EMOTIONAL_INTELLIGENCE_ENGINE.md) | Emotional trends and experience metrics |
| [`CALL_FLOWS.md`](CALL_FLOWS.md) | Summary schemas, intent structure, triage alignment |
| [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md) | Operational truth for pattern interpretation |
| [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) | Market context, HIPAA, product scope |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Multi-tenancy, PHI rules, practice_configs |
| [`ROADMAP.md`](ROADMAP.md) | Phasing for intelligence features |

### Document authority chain (learning)

```
FREEDOMDESK_CONSTITUTION.md
  → CONTINUOUS_LEARNING_ENGINE.md (this document)
    → PRACTICE_OPERATING_SYSTEM.md (operational consumption)
      → KNOWLEDGE_ENGINE.md (validated knowledge storage)
      → FREEDOMDESK_OFFICE_DNA.md (practice profile)
      → FREEDOMDESK_BRAIN_ARCHITECTURE.md (per-call artifacts)
      → EMOTIONAL_INTELLIGENCE_ENGINE.md (experience learning)
      → CALL_FLOWS.md (summary and flow alignment)
```

---

*FreedomDesk improves by listening to its practices — not by guessing at them. Organizational intelligence is how a Chief of Staff earns the right to recommend more tomorrow than it did today.*
