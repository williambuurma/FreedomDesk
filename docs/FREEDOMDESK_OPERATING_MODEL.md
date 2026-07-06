# FreedomDesk Operating Model

> **Status:** Founding document. Defines how FreedomDesk works alongside practice management software and how people experience it every day.  
> **Scope:** Ownership boundaries, the person model, daily rhythm, and long-term scalability — not phone scripts, not implementation, not moral law.  
> **Audience:** Everyone who builds, designs, sells, supports, or configures FreedomDesk — and every future employee who inherits this work.

When documents conflict on **what FreedomDesk owns**, **how team members are modeled**, or **how daily surfaces relate to each other**, this document prevails — subject only to [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) and [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md).

**Read first:** [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) → [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md) → **this document**

---

## Table of Contents

1. [What This Document Is](#1-what-this-document-is)
2. [Canonical Glossary](#2-canonical-glossary)
3. [The Two Layers](#3-the-two-layers)
4. [What FreedomDesk Owns](#4-what-freedomdesk-owns)
5. [What the System of Record Owns](#5-what-the-system-of-record-owns)
6. [The Shared Zone](#6-the-shared-zone)
7. [The Person Model](#7-the-person-model)
8. [Responsibilities](#8-responsibilities)
9. [Permission Levels](#9-permission-levels)
10. [One Person, One Workspace](#10-one-person-one-workspace)
11. [My Day](#11-my-day)
12. [Morning Brief](#12-morning-brief)
13. [End of Day](#13-end-of-day)
14. [Practice Intelligence](#14-practice-intelligence)
15. [Office DNA](#15-office-dna)
16. [The Daily Rhythm](#16-the-daily-rhythm)
17. [What We Will Not Build](#17-what-we-will-not-build)
18. [Long-Term Scalability](#18-long-term-scalability)
19. [Document Authority](#19-document-authority)

---

## 1. What This Document Is

FreedomDesk is **not** a practice management system. It is the **intelligence layer** that works alongside software the practice already uses — Open Dental, Eaglesoft, Dentrix, CareStack, and others.

This document answers four questions that should still make sense ten years from now:

1. What does FreedomDesk own — and what does it leave to the system of record?
2. How are practice team members represented — as people, not job titles?
3. How do **My Day**, **Morning Brief**, and **End of Day** fit together?
4. How does **Practice Intelligence** compound over time without duplicating the PMS?

Product *principles* live in [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md). Product *experience* lives in [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md). Operational *signals and briefings* live in [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md). This document is the bridge between them.

---

## 2. Canonical Glossary

These terms are defined here and used consistently across all FreedomDesk documents. Do not redefine them elsewhere; reference this section.

| Term | Definition |
|------|------------|
| **Intelligence Layer** | FreedomDesk itself — interprets, prioritizes, coordinates, coaches, and remembers. Not the system of record. |
| **System of Record** | The practice management system (PMS) — authoritative for chart, schedule, billing, claims, and clinical documentation. |
| **Person** | A practice team member in FreedomDesk — one human, one profile, one workspace. We build around people, not job titles. |
| **Profile** | Who someone is: name, contact, notification preferences, optional PMS link. Stable over time. |
| **Responsibility** | A functional hat someone wears — Receptionist, Assistant, Dentist, and so on. Determines what intelligence surfaces and what tasks route to them. A person may have several. |
| **Permission Level** | What someone may see and change in FreedomDesk — Administrator, Manager, Standard User, or Read Only. Orthogonal to responsibilities. |
| **My Day** | One person's personal workspace — the surface they open to start work. Answers: what changed, what to do first, what today requires. |
| **Morning Brief** | The practice-wide operational digest — aligns the team before the first patient. Not a personal task list. |
| **End of Day** | The confidence loop at close — personal (in My Day) and practice-wide (for manager and front desk lead). |
| **Practice Intelligence** | FreedomDesk's long-horizon understanding of how *this* practice operates — patterns, opportunities, recommendations, and memory that improve over time. |
| **Office DNA** | This practice's configured operating profile — hours, providers, insurance accepted, emergency rules, appointment types, and culture. See [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md). |
| **Practice Brain** | The engine that observes signals from calls, the PMS, and practice activity — feeds My Day, Morning Brief, and Practice Intelligence. |

**Terms we avoid in product design:**

| Avoid | Use instead | Why |
|-------|-------------|-----|
| Role (as a dashboard) | **Responsibility** | "Role" implies switching interfaces. Responsibilities combine into one workspace. |
| User | **Person** or team member | We design for Sarah, not a generic user. |
| Dashboard | **Workspace**, **My Day**, or **briefing** | Dashboards invite anxiety. Briefings invite action. |
| Practice DNA | **Office DNA** | Canonical name across the platform. |

---

## 3. The Two Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PATIENT BOUNDARY                             │
│         Phone · Messages · Web intake · Future channels              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FREEDOMDESK — Intelligence Layer                   │
│     Interpret · Prioritize · Coordinate · Coach · Remember           │
│     My Day · Morning Brief · End of Day · Practice Intelligence      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ read / write (bounded)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SYSTEM OF RECORD — Practice Management Software         │
│        Chart · Schedule · Billing · Claims · Clinical notes          │
└─────────────────────────────────────────────────────────────────────┘
```

**The golden rule:** If the system of record already owns it as authoritative truth, FreedomDesk does not duplicate it. FreedomDesk makes that truth more useful by preparing better-informed people.

When FreedomDesk and the PMS disagree, the PMS wins. FreedomDesk updates its understanding and tells the team honestly.

---

## 4. What FreedomDesk Owns

| Domain | FreedomDesk is authoritative for |
|--------|----------------------------------|
| **Communication intelligence** | Call summaries, intent, urgency, structured intake |
| **Interpretation** | What operational signals mean for today's work |
| **Prioritization** | What deserves attention now, for this person |
| **Task orchestration** | FreedomDesk-generated work items with ownership and timing |
| **Practice memory** | Operational patterns, recommendation history, Office DNA drift signals |
| **Briefings** | My Day, Morning Brief, End of Day, and longer-cycle reviews |
| **Recommendations** | Suggestions the team can accept, defer, or dismiss |
| **Coordination** | Connecting a call summary to a schedule action to a verification task |
| **Attention stewardship** | What to show, what to suppress, when to interrupt |

---

## 5. What the System of Record Owns

| Domain | The PMS is authoritative for |
|--------|-------------------------------|
| **Patient record** | Demographics, chart, allergies, medical history, clinical notes |
| **Schedule** | Appointments, operatories, provider columns, blockouts |
| **Clinical documentation** | Treatment plans, procedure codes, charting, signatures |
| **Financial record** | Ledger, balances, claims, payments |
| **Insurance administration** | Plan assignment, verified benefits, claim status |
| **Recall** | Due dates, recall letters, hygiene intervals |

FreedomDesk **reads** these when integrated. FreedomDesk **writes back** only through defined, auditable operations — appointment request, comm log, task. FreedomDesk never becomes the ledger, the chart, or the schedule of record.

---

## 6. The Shared Zone

Some work spans both layers. FreedomDesk prepares; the PMS records.

| Activity | Intelligence Layer | System of Record |
|----------|-------------------|------------------|
| New patient call | Structured intake, summary, task | Patient record, appointment request, comm log |
| Insurance on the phone | Program-level classification | Verified benefits after front desk confirms |
| Emergency | Urgency flag, routing per Office DNA | Appointment once staff books it |
| Cancellation | Opening detected, waitlist match suggested | Cancellation and rebooking recorded |
| Recall opportunity | Overdue patient surfaced as action | Recall due date and history |

---

## 7. The Person Model

FreedomDesk is built around **people**, not job titles.

Every practice team member is one **Person** with three independent dimensions:

```
Person
├── Profile              who they are
├── Responsibilities[]   what work they do (one or more)
└── Permission Level     what they may change
```

**Profile** is stable: name, contact, PMS user link (optional), notification preferences.

**Responsibilities** are additive. They define which signals reach this person and which tasks route to them.

**Permission Level** is a security gate. It does not define what appears on My Day — responsibilities do.

### Worked examples

**Sarah — Receptionist + Assistant, Standard User**

- One workspace combining reception and assistant intelligence
- Sees overnight calls, schedule actions, operatory setup, today's lab reminders
- Does not see monthly production analytics or practice settings
- Tasks from both responsibilities merge into one prioritized list

**Dr. Johnson — Dentist + Owner, Administrator**

- One workspace: clinical items first during patient hours; owner-level items when relevant
- Can manage Office DNA, integrations, and team profiles
- Does not wade through front desk workflow detail unless escalated

**Maria — Office Manager + Insurance Coordinator, Manager**

- Broadest operational view; insurance queue prominent
- Can configure briefing sections and assign tasks
- Cannot change FreedomDesk billing or delete audit records

---

## 8. Responsibilities

A **Responsibility** is a functional hat — not an HR job title and not a separate dashboard.

Responsibilities are FreedomDesk-defined capability bundles. Each maps to a domain of intelligence:

| Responsibility | Primary intelligence |
|----------------|---------------------|
| **Receptionist** | Phone, schedule actions, callbacks, confirmations |
| **Insurance Coordinator** | Verification queue, program classification |
| **Assistant** | Operatory flow, lab cases, setup, sterilization |
| **Hygienist** | Hygiene column, perio, doctor exams |
| **Dentist** | Clinical context, emergencies, unsigned notes |
| **Office Manager** | Staffing, production, opportunities, integration health |
| **Owner** | Practice health, strategic view, growth trends |
| **Treatment Coordinator** | Pending treatment, case acceptance follow-up |

A practice may add custom responsibilities over time. Each is a configured bundle of signal subscriptions and task routing — not a new product silo.

Adding a responsibility to a person **expands** their workspace. Removing one **contracts** it. The person never switches modes.

---

## 9. Permission Levels

**Permission Level** answers: *What may this person see and change in FreedomDesk?*

It is orthogonal to responsibilities.

| Level | Sees | May do | May not do |
|-------|------|--------|------------|
| **Administrator** | All practice data in FreedomDesk | Manage people, Office DNA, integrations | Practice dentistry; override clinical record |
| **Manager** | All operational intelligence | Assign tasks, configure briefings, dismiss recommendations | Change integrations; delete audit logs |
| **Standard User** | Intelligence filtered to their responsibilities | Complete tasks, acknowledge alerts | Change practice settings |
| **Read Only** | Intelligence filtered to responsibilities | View only | Complete tasks; change anything |

| Question | Answered by |
|----------|-------------|
| What should Sarah see on My Day? | **Responsibilities** |
| Can Sarah change Office DNA? | **Permission Level** |
| Does Sarah own insurance verification tasks? | **Responsibilities** (if Insurance Coordinator is assigned) |
| Can Sarah see production analytics? | **Permission Level** (Manager or above) |

---

## 10. One Person, One Workspace

> A person never switches dashboards. The workspace adapts to them.

When a person holds multiple responsibilities, FreedomDesk:

1. **Subscribes** to all relevant signal streams
2. **Dedupes** — same patient, same issue, one task
3. **Prioritizes** — urgency and time sensitivity over responsibility origin
4. **Sequences** — one "start here," one ordered list for today
5. **Suppresses** — low-confidence or out-of-hours items stay quiet
6. **Adapts through the day** — emphasis shifts at peak hours and close without mode switches

Sarah does not choose between a Receptionist tab and an Assistant tab. She opens My Day.

---

## 11. My Day

**My Day** is one person's personal workspace — the first surface they see when they log in.

It answers four questions in ten seconds:

| Question | What the person needs |
|----------|----------------------|
| What changed since I left? | Overnight calls, schedule changes, new messages |
| What do I need to do first? | The single most important action right now |
| What needs to happen today? | Today's work, sequenced by priority |
| What should I know before I begin? | Patient context and reminders that affect today |

My Day is **not** the system of record, **not** a practice-wide report, and **not** a collection of dashboards. Deep work — call review, patient context, schedule assist — lives in modules reached from task actions.

Canonical section order: Greeting → Since you were last here → Start here → Today's work → Coming up → When you have a moment.

Experience rules: [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md).

---

## 12. Morning Brief

**Morning Brief** is the **practice-wide** operational digest — the team's shared picture before the first patient arrives.

| | My Day | Morning Brief |
|---|--------|---------------|
| **Audience** | One person | Whole practice |
| **Purpose** | Personal work queue | Team alignment |
| **Timing** | On login | At least 30 minutes before first patient |
| **Tone** | "Here's your day" | "Here's how the practice opens" |

Morning Brief and My Day are **siblings, not duplicates**. My Day is personalized extraction from shared signals — not a copy of the full brief.

Every employee should **not** read the entire Morning Brief and manually find their part. FreedomDesk already routes relevant slices into each person's My Day.

Signal detail: [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §12.

---

## 13. End of Day

**End of Day** closes the loop opened by morning preparation. The goal is confidence — not punishment.

Two layers:

| Layer | Audience | Purpose |
|-------|----------|---------|
| **Personal End of Day** | Each person, within My Day | Their unfinished work; clear to go or honest carry-forward |
| **Practice End of Day** | Manager and front desk lead | Operational close — volume, open items, tomorrow preview |

Unfinished items carry forward to the next My Day and the next Morning Brief. Nothing disappears silently. Logout is never blocked punitively.

Experience rules: [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md) §9. Signal detail: [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §28.

---

## 14. Practice Intelligence

**Practice Intelligence** is FreedomDesk's long-horizon understanding of how *this* practice operates — not analytics for their own sake.

It includes practice memory, opportunity detection, recommendations with confidence, Office DNA drift awareness, and ROI narrative the manager can validate.

It compounds across time:

```
My Day actions → End of Day open items → Weekly patterns → Monthly intelligence
```

Practice Intelligence **does not** diagnose, replace financial reporting, surveil employees, or autonomously change the schedule. It makes recommendations; people decide.

Signal and review detail: [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §§24–30. Learning substrate: [`CONTINUOUS_LEARNING_ENGINE.md`](CONTINUOUS_LEARNING_ENGINE.md).

---

## 15. Office DNA

**Office DNA** is how FreedomDesk knows that Cascade Family Dentistry is not the office down the street.

It is the practice's configured operating profile — hours, providers, insurance accepted, emergency protocol, appointment types, booking mode, and team preferences. FreedomDesk reads the resolved snapshot for *this* practice before interpreting any signal.

Office DNA is Layer 3 knowledge. Full definition: [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md).

---

## 16. The Daily Rhythm

FreedomDesk organizes the practice day in layers of time and scope:

```
Monthly Practice Intelligence     strategic — owner, manager
Weekly Practice Review            trends, top actions
End of Day                        close the loop
Live Operational Awareness        intraday — interrupt rarely
Morning Brief                     team alignment
My Day                            personal — continuous
```

Each layer feeds the one above. My Day is the personal thread running through all of them.

---

## 17. What We Will Not Build

| We will not | Because |
|-------------|---------|
| Replace the PMS schedule UI | Two systems of record always diverge |
| Chart or bill in FreedomDesk | Clinical and financial truth belongs in the PMS |
| Force dashboard switching by job title | People wear multiple hats; one workspace adapts |
| Dump unfiltered practice data on clinical staff | Filter before inform |
| Punish End of Day incompleteness | Confidence, not surveillance |

---

## 18. Long-Term Scalability

These invariants should hold as FreedomDesk grows:

1. **One person, one workspace** — responsibilities combine; dashboards do not multiply
2. **System of record stays authoritative** — FreedomDesk never duplicates it
3. **Responsibilities and permission levels stay orthogonal**
4. **New patient channels feed the same Practice Brain** — My Day does not fork per channel
5. **New PMS adapters do not change this model** — only the read/write boundary
6. **New responsibilities are configuration bundles** — not new product silos
7. **Multi-location owners see rollups; daily work stays location-scoped**

---

## 19. Document Authority

| Topic | Canonical document |
|-------|-------------------|
| Moral obligations, safety, clinical boundaries | [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) |
| Product principles, feature evaluation | [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md) |
| **Ownership, person model, daily surfaces, glossary** | **This document** |
| What intelligence exists | [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) |
| How intelligence is experienced | [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md) |
| Office configuration detail | [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) |
| Technical implementation | [`ARCHITECTURE.md`](ARCHITECTURE.md) |

---

*FreedomDesk interprets and coordinates. The system of record records and bills. Each person has one workspace. Practice Intelligence makes tomorrow smarter than today.*
