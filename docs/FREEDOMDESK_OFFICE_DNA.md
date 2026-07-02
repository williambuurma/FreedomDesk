# FreedomDesk Office DNA

> **Status:** Founding document. Canonical definition of practice-specific operating profiles.  
> **Scope:** What Office DNA is, how it is structured, how it differs from universal and regional knowledge, and how it powers FreedomDesk for one dental office.  
> **Audience:** Engineers, dental consultants, office managers, onboarding specialists, and AI agents configuring or reasoning about a practice.

When documents conflict on **what belongs in a practice profile** or **how office-specific rules are expressed**, this document prevails — subject only to [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md).

---

## Document Authority

| Document | Relationship |
|----------|--------------|
| [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) | Highest authority; safety and truth principles |
| **This document** | Canonical definition of Office DNA structure, domains, and boundaries |
| [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) | Technical L1/L2/L3 layer model, atoms, resolver, versioning |
| [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) | How reasoning consumes Office DNA at call time |
| [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md) | Operational source material for L2 defaults and onboarding |
| [`CALL_FLOWS.md`](CALL_FLOWS.md) | Summary schemas and per-intent required fields |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | `practice_configs` storage, multi-tenancy, config-service |

**Office DNA is Layer 3 (L3)** in the Knowledge Engine. This document defines *what* belongs in L3 and *why*. [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) defines *how* L3 is stored, merged, versioned, and queried.

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [What Office DNA Is](#2-what-office-dna-is)
3. [What Office DNA Is Not](#3-what-office-dna-is-not)
4. [The Three Knowledge Layers](#4-the-three-knowledge-layers)
5. [Scheduling DNA](#5-scheduling-dna)
6. [Insurance DNA](#6-insurance-dna)
7. [Clinical Workflow DNA](#7-clinical-workflow-dna)
8. [Doctor Preference DNA](#8-doctor-preference-dna)
9. [Front Desk Workflow DNA](#9-front-desk-workflow-dna)
10. [Assistant Workflow DNA](#10-assistant-workflow-dna)
11. [Hygiene Workflow DNA](#11-hygiene-workflow-dna)
12. [Office Manager DNA](#12-office-manager-dna)
13. [Emergency Policy DNA](#13-emergency-policy-dna)
14. [Communication Style DNA](#14-communication-style-dna)
15. [Patient Experience DNA](#15-patient-experience-dna)
16. [Practice Culture DNA](#16-practice-culture-dna)
17. [Override Rules](#17-override-rules)
18. [Safety Limits](#18-safety-limits)
19. [Onboarding Questionnaire Structure](#19-onboarding-questionnaire-structure)
20. [How Office DNA Connects to the Knowledge Engine](#20-how-office-dna-connects-to-the-knowledge-engine)
21. [How Office DNA Connects to the Brain Architecture](#21-how-office-dna-connects-to-the-brain-architecture)
22. [West Michigan Private Office Examples](#22-west-michigan-private-office-examples)
23. [Governance and Lifecycle](#23-governance-and-lifecycle)

---

## 1. Purpose

### Why Office DNA exists

Every dental office sounds similar from the outside. They answer the phone. They schedule cleanings. They take insurance. They see emergencies.

From the inside, no two offices operate the same way.

One office seats crowns in 45 minutes; another blocks 60. One doctor refers all molar root canals; another keeps premolars in-house. One office accepts Healthy Kids Dental but not adult Michigan Medicaid. One blocks Wednesday mornings for team meetings. One uses "Aly" as the voice agent name; another wants "Sarah." One practice guarantees a 30-minute emergency callback; another routes directly to the on-call dentist's cell.

FreedomDesk cannot hard-code these differences into platform code. A system that assumes every West Michigan GP office runs identically will misroute emergencies, mislabel insurance, book the wrong appointment type, and force the front desk to undo what the phone agent did.

**Office DNA is the structured answer to one question:**

> *How does this specific dental office work — and how is it different from generic dentistry and regional defaults?*

Office DNA is the practice's operating profile: the rules, preferences, constraints, and culture that tell FreedomDesk how to serve *this* office faithfully while honoring universal safety and truth.

### What Office DNA enables

| Without Office DNA | With Office DNA |
|------------------|-----------------|
| Generic scripts that sound like a call center | Responses grounded in this office's hours, providers, and policies |
| "Delta Dental" treated as one plan | Disambiguation to the programs this office actually accepts |
| "Schedule an appointment" summaries | Crown seat, emergency eval, child prophy — typed and PMS-ready |
| One-size emergency routing | On-call rotation, callback SLA, ER triggers per office protocol |
| Front desk re-types every voicemail field | Summaries map to Open Dental comm logs with minimal rework |

### Design mandate

Office DNA exists to **minimize front desk rework** while delivering an **excellent patient experience**. Every field in Office DNA should trace to something a coordinator would otherwise need to know, decide, or type during or after a call.

---

## 2. What Office DNA Is

**Office DNA** is the complete, versioned, machine-readable profile of one dental practice's operational identity — expressed as structured configuration that overrides regional defaults without duplicating universal dental knowledge.

Office DNA is:

- **Practice-specific** — one profile per location (multi-site groups get one DNA per site)
- **Declarative** — facts and rules, not conversation scripts
- **Inspectable** — office managers can see what FreedomDesk believes about their office
- **Versioned** — every change is auditable; rollback is possible
- **Authoritative for this office** — when L3 specifies a value, it wins over L2 defaults for that practice
- **Bounded** — cannot override constitutional safety limits or L1 locked atoms

Office DNA captures how the office actually runs across every role that touches the patient journey:

```
┌─────────────────────────────────────────────────────────────┐
│                     OFFICE DNA (L3)                          │
│  "How Cascade Family Dentistry operates"                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Scheduling  │  Insurance   │  Emergency   │  Communication │
├──────────────┼──────────────┼──────────────┼────────────────┤
│  Clinical    │  Doctor      │  Front desk  │  Hygiene       │
│  workflow    │  preferences │  workflow    │  workflow      │
├──────────────┴──────────────┴──────────────┴────────────────┤
│  Assistant workflow · Office manager · Culture · Experience   │
└─────────────────────────────────────────────────────────────┘
```

### The Office DNA contract

FreedomDesk promises practices:

1. **We implement your rules** — within constitutional bounds, your configured policies are followed on every call.
2. **We show our work** — effective values cite whether they came from your override or a regional default.
3. **We do not invent your office** — missing DNA produces honest limits, not plausible guesses.
4. **We reduce your team's rework** — DNA fields map to summary outputs the front desk can act on.

Practices promise FreedomDesk:

1. **Accurate configuration** — hours, insurance acceptance, and emergency paths reflect reality.
2. **Timely updates** — when policies change, DNA is updated before callers encounter stale rules.
3. **A designated owner** — typically the office manager maintains DNA integrity.

---

## 3. What Office DNA Is Not

Clarity about boundaries prevents dangerous misuse.

| Office DNA is NOT | Why |
|-------------------|-----|
| **Universal dental knowledge** | What a crown is belongs in L1 — same for every office |
| **Regional best-practice defaults** | How West Michigan offices *typically* handle Delta disambiguation belongs in L2 |
| **Conversation scripts** | Scripts become stale and untestable; DNA supplies facts reasoning uses |
| **Free-text "custom AI instructions"** | Bypasses guardrails; not inspectable; not safe |
| **A replacement for the PMS** | DNA informs scheduling requests; Open Dental holds the schedule of record |
| **Clinical decision support** | DNA describes what the office does; it does not diagnose callers |
| **Patient data** | Names, DOBs, member IDs from calls are PHI — never stored in DNA |
| **The voice persona** | Tone and phrasing live in `voice/persona.json` and reasoning; DNA is operational truth |
| **Marketing copy** | Website language about "gentle care" may inform culture DNA; it does not replace structured rules |
| **A training dump** | Pasting 40 pages of office manual prose without structured fields |

### Anti-pattern: the "smart prompt" office

**Invalid:**

```yaml
customPrompt: "Be friendly. We accept most insurance. Same-day emergencies are always available.
  Dr. Smith prefers morning crown seats. Never upset callers."
```

**Why rejected:** Unbounded natural language cannot be tested, versioned, or safety-checked. It invites promises the office cannot keep ("accept most insurance") and cannot be mapped to summary fields.

**Valid alternative:** Structured overrides in scheduling, insurance, emergency, and doctor preference DNA — each field validated against schema and constitutional safety rules.

---

## 4. The Three Knowledge Layers

Office DNA is the top layer of a three-layer knowledge stack. FreedomDesk must never conflate them.

```
┌─────────────────────────────────────────────────────────────┐
│  L3  OFFICE DNA                                            │
│      This office's rules, preferences, constraints, culture │
│      Source: practice_configs (PostgreSQL) + admin UI       │
│      Example: "Cascade seats crowns in 45 min, not 60"      │
├─────────────────────────────────────────────────────────────┤
│  L2  REGIONAL / DEFAULT PRACTICE KNOWLEDGE                   │
│      How good offices in this market typically operate      │
│      Source: knowledge-engine/layers/l2-defaults/           │
│      Example: "West Michigan: disambiguate Delta PPO vs     │
│               Delta Medicaid vs HKD before accepting"       │
├─────────────────────────────────────────────────────────────┤
│  L1  UNIVERSAL DENTAL KNOWLEDGE                              │
│      Profession-wide truth — terminology, safety, CDT       │
│      Source: knowledge-engine/layers/l1-universal/          │
│      Example: "Never diagnose. Never prescribe. Crown seat  │
│               is a procedure type distinct from prophy."    │
└─────────────────────────────────────────────────────────────┘

         Resolution order:  L3  >  L2  >  L1
         Locked L1 atoms:   cannot be overridden by L2 or L3
```

### Layer assignment decision tree

When authoring or onboarding content, ask:

| Question | Layer |
|----------|-------|
| Would this be true in a dental textbook anywhere in the US? | **L1** — Universal |
| Is this how a *good* West Michigan GP office *usually* operates, but another office might differ? | **L2** — Regional/default |
| Is this how *this specific office* operates, and another office might do it differently? | **L3** — Office DNA |
| Is this how Aly should *sound*? | **Persona** — not Office DNA |
| Is this what to ask on turn seven of a call? | **Brain/reasoning** — not Office DNA |

### Worked example: new patient exam duration

| Layer | Content | Mutable by office? |
|-------|---------|------------------|
| **L1** | A new patient exam (comprehensive evaluation) includes health history, exam, and often radiographs — it is not a prophy | No — universal definition |
| **L2** | Default duration: 60–90 minutes for West Michigan GP new patient exams | Yes — L3 override |
| **L3** | Cascade Family Dentistry: 60 minutes, Open Dental type "New Patient", new patients Mon–Thu only | Yes — office manager |

**At call time:** Front Desk Brain reads effective duration **60** from resolved snapshot. Provenance shows L3 override of L2 default.

### Worked example: Delta Dental

| Layer | Content |
|-------|---------|
| **L1** | "Delta Dental" is a brand; multiple distinct insurance programs exist under that brand with different benefits and assignment rules |
| **L2** | West Michigan disambiguation order: Delta PPO → Delta Medicaid → HKD → adult Medicaid → other PPO → cash-pay |
| **L3** | Cascade accepts Delta PPO, Delta Premier, BCBS MI, Cigna, MetLife; Medicaid programs: HKD and Delta Medicaid only; disambiguation required when caller says "Delta" or "Medicaid" |

**At call time:** Understanding Brain maps caller language to hints; Front Desk Brain asks L2 disambiguation questions filtered by L3 accepted list; never promises coverage.

---

## 5. Scheduling DNA

Scheduling DNA defines how *this office* moves patients onto the calendar — appointment types, durations, provider rules, blocks, and booking authority.

### What belongs in Scheduling DNA

| Field domain | Examples | Layer note |
|--------------|----------|------------|
| **Appointment types** | Labels, durations, PMS type mappings | L3 — office-specific |
| **Provider roster** | Dentists, hygienists, names, pronunciation | L3 |
| **Operatory layout** | Hygiene ops vs. doctor ops (reference for summaries) | L3 |
| **Business hours** | Per-day open/close, lunch closures, holidays | L3 |
| **Blockouts** | Team meetings, admin time, lunch | L3 |
| **New patient rules** | Which days accept new patients; Friday afternoon restrictions | L3 |
| **Hygiene attachment** | Whether exam is attached to prophy | L3 |
| **Booking mode** | `request` (default) vs. `confirmed` (PMS-validated only) | L3 |
| **Waitlist policy** | Appointment types eligible; flexibility fields collected | L3 |
| **Same-day squeeze-in** | Enabled; how emergencies are flagged on schedule | L3 |
| **Typical duration for crown prep** | 90 min | L2 default unless L3 overrides |

### Scheduling DNA does not include

- Real-time PMS availability (live query at call time)
- Universal definitions of appointment types (L1)
- Default regional scheduling patterns not specific to this office (L2 — inherited, not duplicated in L3)

### Practical rules

1. **Label precisely** — summaries must say `crown_seat`, not "appointment."
2. **Duration drives expectations** — wrong duration wastes doctor time and disappoints patients.
3. **Respect blocks** — DNA must encode Wednesday team meetings; FreedomDesk does not offer those slots.
4. **Default to request** — until PMS integration validates slots, DNA `bookingMode: request` prevents false confirmation.

### West Michigan scheduling patterns (L2 context)

Offices in this market commonly run:

- Mon–Thu 7/8 AM – 5/6 PM; Fri half-day or closed
- Hygiene columns that fill before doctor columns
- Peak phone volume 8–9 AM and 4–5 PM
- Optional Saturday hygiene-only mornings

L3 encodes *this office's* variation on those patterns.

---

## 6. Insurance DNA

Insurance DNA defines which programs *this office* accepts, how to classify caller statements, and what FreedomDesk may say about coverage.

### What belongs in Insurance DNA

| Field domain | Examples |
|--------------|----------|
| **Accepted commercial carriers** | Delta Dental PPO, BCBS MI, Cigna, MetLife |
| **Accepted Medicaid programs** | `healthy_kids_dental`, `delta_dental_medicaid`, `michigan_medicaid_adult` |
| **Cash-pay acceptance** | `acceptsCashPay: true` |
| **In-network flags** | `inNetworkDeltaPPO: true` — informational, not a coverage promise |
| **Disambiguation triggers** | Words that require follow-up: "Delta", "Medicaid", "state insurance" |
| **Verification policy** | "Benefits verified at visit" — language boundary |
| **Assignment restrictions** | Medicaid-only days (if practice limits) |
| **Fee discussion boundary** | Whether FreedomDesk may discuss payment plans (usually: defer to front desk) |

### West Michigan insurance priority (L2 default — always classify to program level)

FreedomDesk must never treat "Delta" as one plan. Disambiguation order for this market:

1. Delta Dental **PPO** (employer)
2. Delta Dental **Medicaid**
3. **Healthy Kids Dental** (HKD)
4. **Michigan Medicaid** (adult)
5. Other **PPO** (BCBS MI, Cigna, MetLife, etc.)
6. **Cash-pay** / no insurance

L3 specifies which of these programs **this office accepts** — not whether a specific patient's benefits cover a procedure.

### Insurance DNA language boundaries (L1 locked — cannot override)

| FreedomDesk MAY say | FreedomDesk MUST NOT say |
|---------------------|--------------------------|
| "We accept Delta Dental PPO as a plan type" (if in L3) | "You're covered" |
| "We'll verify your benefits before your visit" | "Your cleaning will be $0" |
| "Is this through an employer plan or state insurance like Medicaid?" | "Delta always covers crowns" |
| "I don't see that program on our accepted list — the team can discuss options" | Quote remaining benefits or fee balances |

---

## 7. Clinical Workflow DNA

Clinical workflow DNA describes **what the office treats in-house vs. refers** and how common treatment paths are scheduled — without enabling diagnosis on calls.

### What belongs in Clinical Workflow DNA

| Field domain | Examples |
|--------------|----------|
| **Services offered** | General dentistry, preventive, restorative, extractions, pediatric (age 3+) |
| **In-house scope** | Root canals: anterior/premolar yes, molar refer |
| **Referral partners** | Endodontist, oral surgeon, periodontist — names for summaries |
| **Sedation availability** | None / nitrous / IV (affects scheduling notes) |
| **Implant policy** | Consult in-house; placement referred |
| **Denture workflow stages** | Consult → impression → try-in → delivery (separate appointment types) |
| **Post-op scripts** | Practice-approved scripts only; `enabled: false` by default |
| **Pediatric minimum age** | e.g., age 3+ |
| **Pre-medication policy** | "Bring med list to visit" — not antibiotic premedication advice on phone |

### What does not belong

- Diagnosis trees ("if pain, it's probably...")
- Prescribing guidance
- Treatment plan presentation
- Fee schedules

### Treatment-specific scheduling awareness

Clinical workflow DNA informs **appointment type selection** in summaries:

| Caller need | DNA-informed type | Not generic |
|-------------|---------------------|-------------|
| Crown delivery | `crown_seat` | "appointment" |
| Root canal follow-up | `rct_followup` or refer note | "tooth pain visit" |
| Denture adjustment | `denture_reline` / `denture_adjust` | "denture appointment" |
| Implant question | `implant_consult` or refer per `implantsInHouse` | "consultation" |

---

## 8. Doctor Preference DNA

Doctor preference DNA captures how individual providers shape scheduling, clinical scope, and communication — the details a good front desk coordinator knows after six months on the job.

### What belongs in Doctor Preference DNA

| Field domain | Examples |
|--------------|----------|
| **Provider-specific scheduling** | Dr. Chen prefers new patients Tue/Thu AM |
| **Procedure scope per doctor** | Dr. Buurma does anterior RCT; Dr. Chen refers all RCT |
| **On-call rotation** | Which doctor covers which days after hours |
| **New patient assignment** | Round-robin vs. patient choice vs. complaint-based |
| **Complex case flags** | "Brief doctor before high-anxiety patient" |
| **Production preferences** | Crown seats batched Mon/Wed PM (scheduling hints) |
| **Language skills** | Spanish-speaking provider available |
| **Pronunciation** | "Dr. Buurma" → "BUR-mah" (voice agent) |

### How brains use doctor preferences

| Brain | Use |
|-------|-----|
| **Business/Practice Brain** | Flags provider preference, complex case, on-call routing |
| **Front Desk Brain** | Captures `providerPreference` in summary when caller requests specific doctor |
| **Clinical/Triage Brain** | Routes on-call callback to correct provider per rotation DNA |
| **Orchestrator** | Does not promise "Dr. Smith will see you" — captures preference as request |

Doctor preferences inform summaries and routing; they do not override safety or insurance boundaries.

---

## 9. Front Desk Workflow DNA

Front desk workflow DNA defines how *this office's* front desk team expects calls to be handled, documented, and handed off.

### What belongs in Front Desk Workflow DNA

| Field domain | Examples |
|--------------|----------|
| **Summary delivery** | Email, SMS, webhook targets |
| **Transfer triggers** | Billing disputes, patient insists on staff, complex insurance |
| **Callback SLAs** | Non-emergency: same business day |
| **Required fields per intent** | Overrides to L2 defaults (see [`CALL_FLOWS.md`](CALL_FLOWS.md)) |
| **PMS type** | `open_dental` — affects summary field labels |
| **Comm log format preference** | Structured fields over narrative |
| **Confirmation policy** | Text reminder promised; not sent by FreedomDesk unless integrated |
| **Check-in instructions** | "Arrive 15 minutes early with ID and insurance card" |
| **Parking / directions** | Brief DNA notes for patient-facing answers |

### Front desk priority order (L2 default — L3 may reorder for this office)

1. True dental emergency
2. New patient inquiry
3. Same-day pain / broken tooth
4. Existing patient schedule change
5. Billing / insurance questions (often callback)
6. General information

### Rework reduction mandate

Every front desk DNA field should answer: **"Would Maria re-type this if FreedomDesk didn't collect it?"**

If yes, it belongs in DNA and in the call summary schema.

---

## 10. Assistant Workflow DNA

Assistant workflow DNA describes operational context that affects scheduling, room prep, and handoffs — what the clinical team needs to know before the patient arrives.

### What belongs in Assistant Workflow DNA

| Field domain | Examples |
|--------------|----------|
| **Room prep by appointment type** | Emergency: op ready for radiograph; crown seat: seat tray |
| **Assistant assignment model** | Dedicated assistant per doctor vs. float |
| **Sterilization / turnover buffer** | 10 minutes between emergency squeeze-ins |
| **Lab case coordination** | Crown seat requires lab case received — flag in summary |
| **Equipment constraints** | CEREC same-day crown availability; pano machine in Op 4 |
| **Sedation prep** | NPO instructions only if practice-approved script enabled |

### How FreedomDesk uses assistant DNA

FreedomDesk does not manage sterilization or room turnover. Assistant DNA informs:

- **Summary action items** — "Lab case confirmed?" for crown seats
- **Scheduling constraints** — cannot book CEREC crown if DNA says machine unavailable Thursdays
- **Business/Practice Brain flags** — treatment mentions that need doctor prep

Keep assistant DNA minimal and actionable. If it never appears in a summary or scheduling decision, it does not belong.

---

## 11. Hygiene Workflow DNA

Hygiene workflow DNA defines how *this office* runs its hygiene column — recall, perio, pediatric prophy, and attachment rules.

### What belongs in Hygiene Workflow DNA

| Field domain | Examples |
|--------------|----------|
| **Recall interval defaults** | 6-month prophy standard; 3–4 month perio maintenance |
| **Hygiene exam attachment** | Doctor exam attached to every prophy |
| **Pediatric vs. adult prophy** | Separate types, different durations |
| **SRP scheduling** | Quads per visit; pre-visit requirements |
| **Fluoride policy** | Age limits; offered to adults or not |
| **New patient hygiene path** | NPE includes cleaning same visit vs. separate |
| **Hygienist preference** | Patient may request Jessica vs. Amanda |
| **Hygiene-only Saturdays** | If applicable |

### West Michigan hygiene realities (L2 context)

- Hygiene columns often fill 4–6 weeks out before doctor columns
- HKD and Medicaid patients may be scheduled on specific days at some offices (L3 if true)
- Healthy Kids Dental recall compliance matters for Medicaid panel practices

### Summary requirements

Hygiene-related calls must specify:

- Appointment type (`adult_prophy`, `child_prophy`, `perio_maintenance`, `srp`)
- Hygienist preference if stated
- Last cleaning date if caller mentions it
- Whether patient reports bleeding gums / sensitivity (symptom, not diagnosis)

---

## 12. Office Manager DNA

Office manager DNA captures practice-level policies, compliance posture, and operational authority that span front desk and clinical teams.

### What belongs in Office Manager DNA

| Field domain | Examples |
|--------------|----------|
| **Cancellation policy** | 24-hour notice; fee policy language boundary |
| **No-show policy** | How FreedomDesk handles repeat no-show callers (transfer) |
| **Medicaid compliance** | Programs accepted; documentation requirements flagged in summary |
| **Financial policy** | Payment due at time of service; CareCredit accepted (informational) |
| **Privacy / recording consent** | Two-party consent script if required |
| **Vendor escalation contacts** | Who receives FreedomDesk alerts |
| **Multi-location routing** | If applicable: which location caller needs |
| **Subscription tier capabilities** | Custom greeting, custom fields enabled |
| **DNA owner** | Office manager contact for config updates |

### Office manager as DNA steward

The office manager is the typical **author** of Office DNA changes. FreedomDesk admin UI (Phase 4+) must be usable by someone who knows Open Dental and insurance programs — not an engineer.

---

## 13. Emergency Policy DNA

Emergency policy DNA is among the highest-stakes Office DNA. It defines how *this office* triages and routes urgent calls — especially after hours.

### What belongs in Emergency Policy DNA

| Field domain | Examples |
|--------------|----------|
| **Same-day emergency enabled** | `true` / `false` |
| **Callback SLA** | 30 minutes after hours |
| **On-call rotation** | Provider per day-of-week |
| **Backup number** | Answering service or partner office |
| **ER escalation triggers** | Trouble breathing, uncontrolled bleeding, spreading swelling with fever |
| **Hospital guidance** | Corewell Butterworth for life-threatening (reference only) |
| **Post-op complication handling** | Recent extraction bleeding — callback vs. same-day |
| **After-hours booking authority** | Request only vs. PMS-validated emergency slot |
| **Pharmacy partners** | For summaries when pain script questions arise → defer to on-call |

### Relationship to L1 red flags

| L1 (locked) | L3 (office-specific) |
|-------------|----------------------|
| Defines what "difficulty breathing" means as a red flag | Defines whether backup number is +1-616-555-0199 |
| Sets minimum urgency floor for matched red flags | Defines on-call rotation and callback SLA |
| Requires escalation — never minimize | Defines *how* escalation happens for this office |

**L3 cannot disable L1 red flags.** An office cannot configure "ignore swelling with fever."

### Emergency DNA worked example

```yaml
emergencyPolicy:
  sameDayEmergencyEnabled: true
  callbackSlaMinutes: 30
  onCallRotation:
    - provider: Dr. William Buurma
      days: [monday, tuesday, wednesday]
    - provider: Dr. Sarah Chen
      days: [thursday, friday, saturday, sunday]
  erEscalationTriggers:
    - trouble breathing
    - uncontrolled bleeding
    - spreading facial swelling with fever
  backupNumber: "+16165550199"
```

---

## 14. Communication Style DNA

Communication style DNA defines *practice-facing* communication choices — distinct from the global Aly persona and distinct from clinical facts.

### What belongs in Communication Style DNA

| Field domain | Examples |
|--------------|----------|
| **Agent name** | "Aly" (default) or practice-chosen name |
| **Greeting scripts** | Business hours vs. after-hours |
| **Practice name pronunciation** | If non-obvious |
| **Hold / callback language** | "The team will call you back within 30 minutes" |
| **Transfer script** | "Let me connect you with our front desk" |
| **After-hours expectations** | "Our office opens at 8 AM Monday" |
| **Confirmation language** | "We've requested that time — the team will confirm" |
| **Optional persona overrides** | Custom tier: warmer formality, different agent name |

### What does not belong

- Clinical tone guidance for anxiety (Psychology Brain + L2 playbooks)
- Universal politeness standards (persona)
- Promises about outcomes

### Persona vs. Communication Style DNA

| Concern | Location |
|---------|----------|
| Midwest-friendly tone, pacing, phrase patterns | `voice/persona.json` |
| Practice name in greeting | Office DNA |
| Whether to say "Cascade Family Dentistry" vs. "Cascade Dental" | Office DNA |
| How to reassure an anxious caller | Psychology Brain + L2 communication playbooks |

---

## 15. Patient Experience DNA

Patient experience DNA encodes how *this office* wants callers to feel and what operational promises shape that experience.

### What belongs in Patient Experience DNA

| Field domain | Examples |
|--------------|----------|
| **Arrival instructions** | "Please arrive 15 minutes early with your insurance card" |
| **New patient welcome** | Online forms link; what to bring |
| **Accessibility** | Wheelchair access; translation services available |
| **Family-friendly notes** | Kids' play area in waiting room |
| **Pain acknowledgment standard** | Always acknowledge pain before insurance (orchestrator priority — L2 default, L3 may reinforce) |
| **Wait time honesty** | "We're experiencing a busy Monday morning" |
| **Post-call orientation** | Every call ends with clear next step |
| **Parking / landmark directions** | "Behind the building, free parking" |

### Measurable experience standards

| Standard | DNA support |
|----------|-------------|
| Answer reliably | Hours DNA + after-hours routing |
| Listen before acting | Reasoning priority — not DNA alone |
| Never make caller repeat | Required fields + summary completeness |
| Honest about limitations | `bookingMode: request`, insurance verification policy |
| End with orientation | Callback SLA, confirmation language |

---

## 16. Practice Culture DNA

Practice culture DNA captures the intangible qualities that differentiate one West Michigan private office from another — without replacing structured rules.

### What belongs in Practice Culture DNA

| Field domain | Examples |
|--------------|----------|
| **Practice positioning** | Family-focused, cosmetic-forward, Medicaid-welcoming |
| **Patient population** | Suburban families, university students, retirees |
| **Community involvement** | Local school sponsorships — optional context for warmth |
| **Clinical philosophy** | Conservative treatment, same-day care emphasis |
| **Relationship norms** | First-name basis vs. formal address |
| **Sensitivity priorities** | Financial anxiety common; extra patience on insurance |
| **Staff longevity** | "Jessica has been our hygienist for 12 years" — optional voice context |
| **Non-negotiables** | "We don't rush patients" — informs pacing, not clinical advice |

### Culture DNA guardrails

Culture DNA **informs tone** through reasoning; it does not:

- Override safety or truth
- Authorize clinical promises
- Replace structured insurance or scheduling rules

**Valid:** `cultureNotes: "Patients often embarrassed about neglected care — prioritize dignity before lecturing."`

**Invalid:** `cultureNotes: "Tell everyone they'll be fine and we can always fit them in today."`

---

## 17. Override Rules

Office DNA customizes FreedomDesk by **overriding** L2 defaults — not by forking the knowledge base.

### Precedence

```
L3 Office DNA  >  L2 Regional/default pack  >  L1 Universal knowledge
```

### Merge strategies

| Strategy | When to use | Example |
|----------|-------------|---------|
| `replace` | Whole policy replaced | Emergency callback SLA |
| `deep-merge` | Add or override specific keys | Add one appointment type |
| `append` | Add to inherited list | Additional accepted carrier |
| `remove` | Disable inherited L2 atom | `disables: ["atom://l2/..."]` |

### Override authoring rules

1. **Override, don't duplicate** — if L2 already defines crown-seat default duration, L3 specifies only the delta.
2. **Cite what changed** — admin UI shows effective value and source layer.
3. **Validate on save** — schema + locked-field enforcement before publish.
4. **Version every publish** — `configVersion` increments; audit log records change.
5. **No orphan overrides** — paths must resolve to L2/L1 atoms or defined L3 schema fields.

### Example override patch

```yaml
practiceId: cascade-family-dentistry
extends: l2-west-michigan-gp@1.4.2
knowledgePackages:
  l1: l1-universal@2026.1.0
  l2: l2-west-michigan-gp@1.4.2
overrides:
  appointmentTypes:
    _merge: deep-merge
    crown-seat:
      durationMinutes: 45
      openDentalType: Crown Seat
  emergencyPolicy:
    _merge: replace
    callbackSlaMinutes: 30
  insurance:
    _merge: deep-merge
    acceptedMedicaidPrograms:
      _merge: append
      - healthy_kids_dental
disables: []
```

---

## 18. Safety Limits

Office DNA is powerful. These limits are non-negotiable — enforced by schema validation, resolver lock checks, and constitutional governance.

### L1 locked atoms — cannot override

| Rule | Enforcement |
|------|-------------|
| Never diagnose | L3 cannot add diagnostic language templates |
| Never prescribe | L3 cannot enable drug/dose recommendations |
| Never promise coverage | L3 cannot add "tell callers they're covered" |
| Never promise availability | L3 cannot set `bookingMode: guaranteed` without PMS validation |
| Never invent facts | Missing DNA → honest limit, not fabrication |
| Never ignore red flags | L3 cannot weaken urgency floors for L1 symptom patterns |

### Schema-blocked fields

The following are **rejected** if submitted in Office DNA:

- `customPrompt` / free-text AI instructions
- `diagnosisTemplates`
- `prescriptionGuidance`
- `coverageGuarantees`
- `feeQuotes` / `balanceQuotes`
- `redFlagSuppressions`
- `safetyRuleOverrides`

### DNA completeness failures

| State at call time | Behavior |
|--------------------|----------|
| Valid L3 snapshot | Normal operation |
| Stale L3 (editing in progress) | Last known good snapshot |
| Missing L3 | Fail closed: safe greeting + transfer/callback; alert ops |
| Invalid L3 on save | Reject; do not publish |

### Practice autonomy boundary

Practices configure freely **within** these limits. FreedomDesk refuses requests that violate the Constitution — respectfully, consistently, with explanation.

> *"We can configure your on-call rotation and callback time. We cannot configure FreedomDesk to tell callers their treatment is covered without verification."*

---

## 19. Onboarding Questionnaire Structure

Office DNA is populated through a structured onboarding process — not a single "tell us about your office" text box. Target time to live: **under 7 business days**.

### Onboarding phases

```
Phase A: Identity & systems     →  practiceId, PMS, timezone, contacts
Phase B: Scheduling core        →  hours, types, providers, booking mode
Phase C: Insurance              →  accepted programs, disambiguation
Phase D: Emergency              →  on-call, SLA, ER triggers
Phase E: Workflows & culture    →  clinical scope, referrals, communication
Phase F: Delivery & validation  →  summary routing, test calls, sign-off
```

### Phase A — Identity and systems

| Question | DNA field | Required |
|----------|-----------|----------|
| Legal practice name | `name` | Yes |
| Location address | `address` | Yes |
| Main phone / after-hours line | `phone` | Yes |
| Timezone | `timezone` | Yes |
| PMS type | `pmsType` | Yes |
| Website | `website` | No |
| Office manager DNA owner | `contacts.manager` | Yes |

### Phase B — Scheduling core

| Question | DNA field | Required |
|----------|-----------|----------|
| Hours per day (including lunch closure) | `hoursOfOperation` | Yes |
| Holiday closures (next 12 months) | `holidayClosures` | Yes |
| Dentists and hygienists (names, roles) | `providers`, `hygienists` | Yes |
| Appointment types with durations | `appointmentTypes` | Yes |
| Open Dental / PMS type mappings | `appointmentTypes[].openDentalType` | Yes |
| New patient day restrictions | `schedulingRules.newPatientDays` | Yes |
| Team meeting / blockouts | `schedulingRules.blockouts` | Yes |
| Booking mode: request or PMS-confirmed | `bookingMode` | Yes |
| Hygiene exam attached to prophy? | `schedulingRules.hygieneExamAttached` | Yes |
| Minimum pediatric age | `minPediatricAge` | Yes |

### Phase C — Insurance

| Question | DNA field | Required |
|----------|-----------|----------|
| Commercial carriers accepted | `insurance.acceptedCarriers` | Yes |
| Medicaid programs accepted (HKD, Delta Medicaid, adult Medicaid) | `insurance.acceptedMedicaidPrograms` | Yes |
| Cash-pay accepted? | `insurance.acceptsCashPay` | Yes |
| In-network Delta PPO? | `insurance.inNetworkDeltaPPO` | If Delta accepted |
| Words requiring disambiguation | `insurance.disambiguationRequired` | Yes |
| Medicaid scheduling day restrictions | `insurance.medicaidDays` | If applicable |

### Phase D — Emergency

| Question | DNA field | Required |
|----------|-----------|----------|
| Same-day emergencies during business hours? | `emergencyPolicy.sameDayEmergencyEnabled` | Yes |
| After-hours callback SLA | `emergencyPolicy.callbackSlaMinutes` | Yes |
| On-call rotation by day | `emergencyPolicy.onCallRotation` | Yes |
| Backup / escalation number | `emergencyPolicy.backupNumber` | Yes |
| ER referral triggers | `emergencyPolicy.erEscalationTriggers` | Yes |
| Preferred hospital for life-threatening | `hospitals.erGuidance` | Recommended |
| Post-op scripts enabled? | `postOpScripts.enabled` | Yes (default: false) |

### Phase E — Workflows and culture

| Question | DNA field | Required |
|----------|-----------|----------|
| Services offered | `services` | Yes |
| In-house RCT scope | `clinicalScope.rootCanalInHouse`, `rootCanalReferMolar` | Yes |
| Implants in-house? | `clinicalScope.implantsInHouse` | Yes |
| Sedation available? | `clinicalScope.sedationAvailable` | Yes |
| Referral partners (endo, OS, perio) | `referralResources` | Recommended |
| Agent name and greetings | `agentName`, `greeting` | Yes |
| Cancellation / no-show policy summary | `policies.cancellation` | Yes |
| Culture notes for tone | `cultureNotes` | Optional |
| Arrival / parking instructions | `address.parkingNotes`, `patientExperience.arrival` | Recommended |

### Phase F — Delivery and validation

| Question | DNA field | Required |
|----------|-----------|----------|
| Summary email recipients | `summaryDelivery.email` | Yes |
| Summary SMS recipients | `summaryDelivery.sms` | Optional |
| Webhook URL | `summaryDelivery.webhook` | Optional |
| Test call scenarios completed | `onboarding.testCalls` | Yes |
| Office manager sign-off | `onboarding.signedOffAt` | Yes |

### Onboarding outputs

Successful onboarding produces:

1. Validated L3 config in `practice_configs`
2. Compiled **Resolved Knowledge Snapshot** (cached)
3. Effective knowledge viewer export for office manager review
4. Golden test fixtures for this practice's top 5 call types

---

## 20. How Office DNA Connects to the Knowledge Engine

The Knowledge Engine is FreedomDesk's subsystem for declarative domain truth. Office DNA is its **L3 layer**.

### Architecture relationship

```
┌──────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE ENGINE                           │
│                                                               │
│  L1 Universal ──┐                                              │
│  L2 Regional  ──┼──▶ Resolver ──▶ Compiler ──▶ Snapshot   │
│  L3 Office DNA ─┘         ▲                                    │
│                           │                                    │
│                  practice_configs (PostgreSQL)                 │
│                  Office DNA schema validation                │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  Knowledge Query API
                  (brains never read DNA directly)
```

### Key integration points

| Concern | Mechanism |
|---------|-----------|
| **Storage** | `practice_configs` table, versioned per `practiceId` |
| **Schema** | `knowledge-engine/schemas/office-dna/practice-config.schema.json` |
| **Inheritance** | `extends: l2-west-michigan-gp@1.4.2` |
| **Overrides** | `overrides` patch with merge strategies |
| **Resolution** | Resolver merges L3 > L2 > L1; Compiler builds indexes |
| **Cache** | Redis key: `{practiceId}:{configVersion}:{l1}:{l2}` |
| **Query** | `KnowledgeEngine.forCall(practiceId)` → snapshot |
| **Provenance** | Every effective value cites layer and atom/path |

### What Office DNA authors need from Knowledge Engine docs

- **Layer assignment** — don't put L1/L2 content in L3 ([`KNOWLEDGE_ENGINE.md` §2](KNOWLEDGE_ENGINE.md#2-layer-model))
- **Override format** — merge strategies ([`KNOWLEDGE_ENGINE.md` §7](KNOWLEDGE_ENGINE.md#7-override-system))
- **Versioning** — pin L2, monotonic L3 `configVersion` ([`KNOWLEDGE_ENGINE.md` §8](KNOWLEDGE_ENGINE.md#8-versioning))
- **Safety** — locked atoms ([`KNOWLEDGE_ENGINE.md` §9](KNOWLEDGE_ENGINE.md#9-safety-rules))

### Runtime rule

**No code on the call hot path reads Office DNA from raw JSON files.** Inbound calls read a pre-compiled snapshot. Resolution runs on config save — not per utterance.

---

## 21. How Office DNA Connects to the Brain Architecture

The Five Brains reason about each caller. Office DNA supplies **practice-specific facts** they apply — not the reasoning itself.

### Separation of concerns

| Office DNA provides | Brains provide |
|---------------------|----------------|
| Callback SLA is 30 minutes | Whether this call needs callback vs. continued intake |
| Crown seat is 45 minutes | Whether this caller needs a crown seat |
| Delta Medicaid is accepted | Which program matches caller's description |
| Dr. Chen is on-call Thursday | Whether symptoms meet urgent threshold |
| `bookingMode: request` | Wording that confirms request vs. appointment |

### Per-brain DNA consumption

| Brain | Office DNA slices consumed | Example |
|-------|---------------------------|---------|
| **Understanding** | Insurance aliases, appointment type synonyms | Map "cap" → crown seat hint |
| **Psychology** | Culture notes, communication playbooks (L2 + L3 culture) | Extra patience on financial anxiety |
| **Clinical/Triage** | `emergencyPolicy`, `clinicalScope`, L1 red flags | Route to Dr. Chen on-call Sunday |
| **Front Desk** | `appointmentTypes`, `insurance`, required fields | Collect HKD ID if program accepted |
| **Business/Practice** | `schedulingRules`, `doctorPreferences`, hours | Flag new patient on Friday PM — blocked |
| **Orchestrator** | Full snapshot for goal precedence | After-hours → emergency path + 30-min SLA language |

### Turn processing (simplified)

```
snapshot = KnowledgeEngine.forCall(practiceId, { intent, pmsType })

understanding = understandPatientMessage(message, snapshot.aliases)
emotion       = assessEmotion(message, state, snapshot.psychology)
urgency       = assessUrgency(understanding, state, snapshot.triage)
missing       = getMissingFields(state, intent, snapshot.frontDesk)
practice      = assessPracticeSignals(state, snapshot.business)

decision      = determineNextGoal({ state, emotion, urgency, missing, practice })
```

Brains receive **slices**, not raw `practice_configs`. The orchestrator never embeds domain literals — it reads resolved effective values.

### Provenance in brain outputs

When Office DNA informs a decision, brains cite it:

```yaml
urgency: urgent_today
reasons:
  - { atom: atom://red-flag/spreading-swelling-with-fever, matched: true }
  - { l3: emergencyPolicy.sameDayEmergencyEnabled, value: true }
  - { l3: emergencyPolicy.onCallRotation, provider: "Dr. Sarah Chen", day: thursday }

action: callback_within_sla
reasons:
  - { l3: emergencyPolicy.callbackSlaMinutes, value: 30 }
```

### Prompt assembly

LLM-facing context includes a formatted L3 summary block assembled by the Knowledge Query API — not a dump of raw JSON. Order:

1. L1 safety guardrails
2. Persona (`voice/persona.json`)
3. L2 regional excerpts (intent bundle)
4. **L3 practice summary** (Office DNA)
5. Intent-specific knowledge

Safety-critical behavior uses **structured mode** — not prompt text alone.

---

## 22. West Michigan Private Office Examples

The following examples use **Cascade Family Dentistry** — a representative Grand Rapids–area private GP office (1–2 doctors, 4–8 operatories, Open Dental, Delta/HKD/Medicaid mix). Reference config: `config/practices/example-grand-rapids.json`.

### Example 1: New patient call — Monday 8:15 AM

**Caller:** "Hi, we just moved to Grand Rapids. I have Delta Dental through my employer and need cleanings for our family."

| Layer | What applies |
|-------|--------------|
| L1 | New patient exam ≠ prophy; collect symptoms before diagnosing needs |
| L2 | Disambiguate Delta PPO vs. Medicaid; West Michigan carrier priority |
| L3 | Cascade accepts Delta PPO; new patients Mon–Thu; NPE 60 min; agent Aly |

**FreedomDesk behavior:**

1. Acknowledge move — welcome to area (culture: family-focused suburban practice)
2. Ask employer vs. state insurance — caller confirms employer → `delta_ppo`
3. Collect name, phone, DOB, family members, chief complaint, scheduling preference
4. Offer **appointment request** — not confirmed until front desk validates
5. Summary: `intent: NEW_PATIENT`, `insuranceProgram: delta_ppo`, `appointmentType: new_patient_exam`

**Front desk receives:** PMS-ready fields — not "family needs cleanings."

---

### Example 2: Emergency call — Sunday 9:30 PM

**Caller:** "My husband had a crown fall off. He's in pain but no swelling."

| Layer | What applies |
|-------|--------------|
| L1 | Pain + lost restoration = urgent evaluation; no ER unless red flags |
| L2 | Typical emergency eval 30 min; after-hours callback norm |
| L3 | On-call: Dr. Chen (Sun); callback SLA 30 min; same-day enabled |

**FreedomDesk behavior:**

1. Acknowledge pain; brief symptom triage — no swelling, no fever, breathing fine
2. `urgency: urgent_today` — not life-threatening emergency
3. Collect name, phone, DOB, which tooth, when crown was placed if known
4. Set expectation: Dr. Chen will callback within 30 minutes; if symptoms worsen (swelling, fever, breathing trouble), call back or go to ER
5. Summary: `intent: EMERGENCY`, `appointmentType: emergency_eval`, `onCallProvider: Dr. Sarah Chen`

---

### Example 3: Insurance disambiguation — HKD pediatric

**Caller:** "I need to schedule my 7-year-old. She has Healthy Kids."

| Layer | What applies |
|-------|--------------|
| L1 | HKD is Michigan Medicaid children's program — distinct from commercial Delta |
| L2 | Collect child name/DOB, guardian, HKD ID if available |
| L3 | Cascade accepts `healthy_kids_dental`; child prophy 45 min; pediatric age 3+ |

**FreedomDesk behavior:**

1. Classify `insuranceProgram: healthy_kids_dental` — no Delta disambiguation needed
2. Collect child name, DOB, guardian name, HKD ID (optional), last cleaning if known
3. Schedule request: `child_prophy` — not adult cleaning
4. Summary includes pediatric fields per [`CALL_FLOWS.md`](CALL_FLOWS.md)

---

### Example 4: Crown seat — existing patient

**Caller:** "I'm calling to schedule seating my crown. Dr. Buurma prepped it two weeks ago."

| Layer | What applies |
|-------|--------------|
| L1 | Crown seat is delivery/cementation — distinct from crown prep |
| L2 | Default seat 45–60 min; lab case should be in office |
| L3 | Cascade: crown seat 45 min, Open Dental type "Crown Seat" |

**FreedomDesk behavior:**

1. Existing patient path — name + DOB
2. `appointmentType: crown_seat` — not "follow-up"
3. Ask preference AM/PM; provider preference Dr. Buurma noted
4. Summary action item: verify lab case received before confirming

---

### Example 5: Friday 1 PM — new patient blocked

**Caller:** "Can I schedule a new patient exam this Friday at 2?"

| Layer | What applies |
|-------|--------------|
| L2 | Many West Michigan offices restrict Friday PM for new patients |
| L3 | `newPatientDays: Mon–Thu`; `noNewPatientsFridayAfternoon: true`; Fri close 2 PM |

**FreedomDesk behavior:**

1. Business/Practice Brain flags Friday new patient restriction
2. Offer Mon–Thu alternatives — honest about why
3. Do not book Friday PM new patient even if caller insists
4. Summary captures preference if waitlist enabled

---

### Example 6: Red flag — ER routing

**Caller:** "I'm swollen up into my eye and I have a fever."

| Layer | What applies |
|-------|--------------|
| L1 | Spreading facial swelling + fever = red flag; minimum urgency emergency |
| L3 | ER trigger list includes this pattern; Corewell Butterworth reference |

**FreedomDesk behavior:**

1. **Stop routine intake** — orchestrator priority 1
2. Advise immediate emergency care per protocol — 911 or ER
3. Offer to notify on-call dentist as parallel action — not instead of ER
4. Summary: `urgency: emergency`, `routing: er_directed`, symptoms documented

**L3 cannot weaken this.** No office DNA field disables L1 red-flag floors.

---

### Example 7: Culture in practice — financial anxiety

**Caller (hesitant):** "I haven't been to a dentist in a few years… I bet my insurance won't cover much."

| Layer | What applies |
|-------|--------------|
| L2 | Embarrassment and financial anxiety playbooks — reassure before admin |
| L3 | `cultureNotes`: conservative, judgment-free; cash-pay accepted |

**FreedomDesk behavior:**

1. Psychology Brain: embarrassment + financial anxiety → reassure first
2. Validate without diagnosing: "You're in the right place — we'll walk through options"
3. Collect insurance program type — never promise coverage
4. Defer fees: "The team will verify benefits before your visit"
5. Then collect scheduling fields

---

## 23. Governance and Lifecycle

### Who owns Office DNA

| Role | Responsibility |
|------|----------------|
| **Practice office manager** | Authoritative content; approves publishes |
| **FreedomDesk onboarding** | Initial population; validation |
| **FreedomDesk clinical/domain** | L1/L2 packs; reviews safety-related L3 patterns |
| **Engineering** | Schema, resolver, admin UI — not policy content |

### Change management

| Change type | Process |
|-------------|---------|
| L3 field edit | Admin UI → validate → increment `configVersion` → recompile snapshot |
| L2 package upgrade | Office chooses accept / keep overrides / pin old version |
| L1 safety update | Platform-wide; practices notified if triage behavior changes |
| Emergency policy change | Same-day review; test call recommended |

### Audit trail

Every L3 publish logs:

- `who` — user ID (not PHI)
- `when` — timestamp
- `what` — changed paths (not full config dump in alerts)
- `configVersion` — monotonic integer

### DNA health metrics

| Metric | Target |
|--------|--------|
| Schema validation pass rate | 100% on publish |
| Snapshot compile success | 100% before go-live |
| Required domain completeness | 100% of Phase A–F onboarding |
| Stale DNA (unchanged > 18 months) | Prompt office manager review |
| Summary field coverage vs. DNA | >95% alignment |

### Multi-location practices

- One `practiceId` per physical location
- Shared brand DNA may use org templates — each site still resolves independently
- Phone numbers map to exactly one `practiceId`

---

## Quick Reference for Builders

### Before adding Office DNA content

1. Read this document.
2. Assign layer: L1 / L2 / L3.
3. If L3 → use schema field or structured override — not prose.
4. If safety-related → verify against [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md).
5. If consumed by a brain → add to appropriate DNA domain section and snapshot slice.

### Before modifying brains

1. Brains do not read `practice_configs` directly.
2. Brains do not embed office-specific literals.
3. Load snapshot via Knowledge Query API.
4. Cite L3 path or atom ID in outputs.

### The Office DNA test

> *If this office's office manager read our effective knowledge viewer, would they say "yes, that's how we work" — without surprises that could harm a patient or embarrass the front desk?*

If no, the DNA is not ready for production calls.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) | Governing philosophy and non-negotiables |
| [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) | L1/L2/L3 technical specification, atoms, resolver |
| [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) | Five Brains and orchestration |
| [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) | Product and market context |
| [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md) | Operational workflows — onboarding source material |
| [`CALL_FLOWS.md`](CALL_FLOWS.md) | Summary schemas and required fields |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | `practice_configs` data model |
| [`PRACTICE_MANAGEMENT_SOFTWARE.md`](PRACTICE_MANAGEMENT_SOFTWARE.md) | PMS field mappings |
| `config/practices/example-grand-rapids.json` | Reference L3 example |

---

## Glossary

| Term | Definition |
|------|------------|
| **Office DNA** | L3 per-practice operating profile — rules, preferences, constraints, culture |
| **Effective value** | Result after L3 > L2 > L1 resolution |
| **Override** | L3 patch that replaces or extends L2 defaults |
| **Snapshot** | Compiled, cached resolved knowledge for one practice at one version |
| **Locked atom** | L1 safety content that cannot be overridden |
| **Regional pack** | L2 defaults for a market (e.g., `west-michigan-gp`) |
| **bookingMode** | `request` (default) or PMS-validated confirmation |
| **Provenance** | Citation chain showing which layer set a value |

---

*Established as a founding document of FreedomDesk. Office DNA is how we honor practice autonomy without sacrificing safety, truth, or the front desk's trust.*
