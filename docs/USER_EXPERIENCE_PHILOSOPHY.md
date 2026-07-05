# FreedomDesk User Experience Philosophy

> **Status:** Founding product experience document.  
> **Scope:** How FreedomDesk should *feel* to the people who use it eight hours a day — morning through close, across every role in the practice. Governs homepage design, daily briefings, role-specific surfaces, end-of-day confidence, and the voice of the product interface.  
> **Audience:** Product, design, engineers, AI agents, and anyone building surfaces that present practice intelligence to humans.

When documents conflict on **how information should be presented, prioritized, or spoken to users**, this document prevails — subject only to [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) for safety, truth, and clinical boundaries.

**Read first:** [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) → [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) → [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) → **this document**

---

## Table of Contents

1. [Product Identity](#1-product-identity)
2. [Core Philosophy](#2-core-philosophy)
3. [Voice and Language](#3-voice-and-language)
4. [Morning Experience](#4-morning-experience)
5. [Role-Specific Homepages](#5-role-specific-homepages)
6. [Homepage Information Hierarchy](#6-homepage-information-hierarchy)
7. [Tasks and Actions](#7-tasks-and-actions)
8. [Universal Search (Future)](#8-universal-search-future)
9. [End-of-Day Experience](#9-end-of-day-experience)
10. [What FreedomDesk Is Not](#10-what-freedomdesk-is-not)
11. [Design Evaluation Checklist](#11-design-evaluation-checklist)
12. [Document Authority and Related Reading](#12-document-authority-and-related-reading)

---

## 1. Product Identity

FreedomDesk is **not a dashboard**.

It is a **calm operating intelligence platform** that helps every team member start their day prepared and end their day confident that nothing important was forgotten.

FreedomDesk should feel like an **experienced office manager who quietly reviewed the entire practice before everyone arrived** — not like software displaying data and expecting the user to figure out what it means.

| FreedomDesk is | FreedomDesk is not |
|----------------|-------------------|
| A personal morning briefing | A wall of widgets |
| An interpreter of practice signals | A raw data feed |
| A calm operating surface | A busy analytics dashboard |
| Role-aware intelligence | One-size-fits-all reporting |
| Confidence at open and close | Anxiety from information overload |

The emotional goal for every session:

> **"I know exactly what matters today."**

At the end of the day:

> **"Nothing important was forgotten."**

---

## 2. Core Philosophy

These principles apply to every screen, every notification, and every sentence FreedomDesk presents to the practice team.

### 2.1 Reduce stress before increasing information

The interface must lower cognitive load before it adds detail. A user who opens FreedomDesk should feel **calmer after ten seconds**, not more overwhelmed.

- Lead with what matters, not with everything available
- Use whitespace, grouping, and hierarchy to create breathing room
- Never show a metric without context the user can act on
- Prefer one clear next step over five possible options

### 2.2 Filter before informing

FreedomDesk's job is to **decide what deserves attention** — not to expose the full practice record and let the user hunt.

- Practice Brain and Practice Memory interpret signals first; the UI presents conclusions
- Role filtering happens before rendering, not after
- Low-confidence or low-priority items stay quiet unless the user asks
- "Inform" means "here is what you should know and do" — not "here is everything we found"

### 2.3 Every role sees only what matters to them

A dentist should never wade through receptionist workflow. A hygienist should not see office-manager production analytics on their home surface.

Role-specific homepages are a **product requirement**, not a customization option. See [Role-Specific Homepages](#5-role-specific-homepages).

### 2.4 Never make the user interpret information

If a user must ask "What does this mean?" or "What should I do about this?", FreedomDesk has failed.

- Translate operational signals into plain recommendations
- State the action, not just the observation
- Label urgency honestly; do not rely on color alone
- Surface reasoning on demand ("Why this matters") — never require it for basic comprehension

### 2.5 Prepared, organized, confident

Every design decision should move the user toward one of these three states:

| State | Meaning |
|-------|---------|
| **Prepared** | I know what changed and what to do first |
| **Organized** | My work is sequenced; nothing is hiding |
| **Confident** | I can leave knowing the important things are handled |

---

## 3. Voice and Language

Every sentence FreedomDesk writes — in briefings, task lists, alerts, and end-of-day summaries — should sound like an **experienced dental office team member**, never an engineer or corporate dashboard.

### 3.1 Sounds like

- "Good morning, Jessica. One overnight call needs a callback before 8:30."
- "Sarah Mitchell is in at 10:00 — benefits still need verification before the crown seat."
- "You're clear for the rest of the day. Everything important is handled."

### 3.2 Does not sound like

- "3 critical priority items detected in the overnight call queue."
- "Schedule utilization: 43%. Target: 80%."
- "Action required: Review pending workflow items."

### 3.3 Language rules

| Rule | Rationale |
|------|-----------|
| Use people's names when referring to patients or team members | Matches how offices actually talk |
| Lead with the verb — what to do | Action-first, not label-first |
| Use dental office vocabulary, not software vocabulary | "Callback," not "ticket"; "NPE," not "new lead" |
| One idea per sentence in task lists | Scannable under morning pressure |
| No exclamation points, no hype, no false cheer | Calm professionalism |
| Admit uncertainty plainly | "I haven't confirmed lab status yet — worth checking before the 10:00 crown seat" |

Voice on the **phone** (Aly persona) and voice in the **application** share the same values: calm, Midwest-friendly, honest, concise. See [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) for phone persona details.

---

## 4. Morning Experience

Every employee should log in and **immediately understand** four questions — without scrolling, without interpreting charts, without opening secondary screens:

| Question | What the user needs |
|----------|---------------------|
| **What changed since I left?** | Overnight calls, schedule changes, cancellations, new messages, staffing updates |
| **What do I need to do first?** | The single most important action for this role right now |
| **What needs to happen today?** | The day's operational work, sequenced by priority |
| **What should I know before I begin?** | Patient context, alerts, and reminders that affect how today goes |

### 4.1 The ten-second test

A team member opening FreedomDesk at 7:45 AM should feel prepared within **ten seconds**. If the homepage requires exploration to answer the four questions above, the design has failed.

### 4.2 Morning is not metrics time

Morning surfaces prioritize **actions and awareness**, not analytics. Production numbers, trend charts, and month-over-month comparisons belong in manager review surfaces — not on the morning homepage for clinical and front-desk roles.

Operational detail for morning brief content lives in [`PRACTICE_OPERATING_SYSTEM.md` §12 Morning Brief](PRACTICE_OPERATING_SYSTEM.md#12-morning-brief). This document governs **how that intelligence is experienced**, not what signals exist.

---

## 5. Role-Specific Homepages

Each role receives a homepage that reflects **their actual morning reality**. FreedomDesk filters Practice Brain output to role-relevant items before the user sees anything.

### 5.1 Receptionist / Front Desk

**Focus:** The phone-and-schedule command center.

| Priority content | Examples |
|------------------|----------|
| Overnight calls | After-hours summaries with urgency and callback SLA |
| Appointment requests | New bookings, reschedules, cancellations needing action |
| Emergency patients | Same-day urgent cases requiring callback or squeeze-in |
| Insurance | Verification queue, benefits checks before today's visits |
| Scheduling priorities | Open blocks, waitlist matches, cancellation recovery |
| Messages | Team notes, patient messages, vendor callbacks |
| Call summaries | Structured next steps — not transcripts to re-read |

**Does not show:** Doctor production analytics, operatory sterilization status, unsigned clinical notes.

### 5.2 Dentist

**Focus:** Only information that affects **patient care today**.

| Priority content | Examples |
|------------------|----------|
| Anxious or special-needs patients | Emotional flags, first-visit anxiety, language needs |
| Medical alerts | Relevant health history surfaced for today's patients |
| Schedule changes | Cancellations, additions, column shifts since yesterday |
| Lunch and block changes | Production block adjustments, meeting conflicts |
| Sales reps / vendor visits | Scheduled or expected interruptions |
| Unsigned notes | Charting items requiring attention |
| Emergency callbacks | On-call items with clinical context |

**Does not show:** Receptionist scheduling workflow, insurance verification queues, waitlist management, front-desk call volume metrics.

The dentist homepage must feel **quiet**. If nothing requires clinical attention, say so clearly.

### 5.3 Dental Assistant

**Focus:** Keeping the practice running smoothly behind the chair.

| Priority content | Examples |
|------------------|----------|
| Operatories | Room turnover, setup needs, which rooms are open |
| Sterilization | Instrument cycles, spore test reminders if applicable |
| Supplies | Low-stock alerts, orders expected today |
| Electronic referrals | Pending referrals needing follow-up |
| Equipment | Maintenance flags, broken equipment reports |
| Doctor support | Lab case status, crown seats today, setup for procedures |

**Does not show:** Business production analytics, insurance verification, marketing opportunities.

### 5.4 Hygienist

**Focus:** Today's clinical column and patient flow.

| Priority content | Examples |
|------------------|----------|
| Today's schedule | Patient list with appointment types |
| Procedure mix | Prophylaxis, SRP, periodontal maintenance — not generic "hygiene" |
| Doctor exams | Which patients need doctor check; timing expectations |
| Special patient needs | Anxiety, medical flags, first visits |
| Schedule awareness | Running early/late signals, room changes |

**Does not show:** Front-desk call summaries, office-manager staffing, production dashboards.

### 5.5 Office Manager

**Focus:** Practice operations, staffing, production, and business oversight.

| Priority content | Examples |
|------------------|----------|
| Staffing | Absences, coverage gaps, schedule conflicts |
| Production | Today's targets vs. schedule; open chair time |
| Opportunities | Cancellation recovery, recall gaps, unscheduled treatment |
| Business oversight | Integration health, summary quality, operational anomalies |
| Team coordination | Cross-role items needing manager attention |

The office manager sees the **broadest** homepage — but still filtered and prioritized, never a raw dump of all practice data.

### 5.6 Role switching

When a user holds multiple roles (e.g., dentist who also reviews front-desk items), role switching changes **perspective**, not just labels. Each role view is a distinct filtered intelligence surface — not the same page with sections hidden.

Current implementation: My Day role switcher (Doctor / Front Desk). Future roles expand per this specification.

---

## 6. Homepage Information Hierarchy

The homepage should feel like a **personal morning briefing**, not a dashboard.

Recommended section order (adapt per role; not all sections appear for every role):

| Order | Section | Purpose |
|-------|---------|---------|
| 1 | **Welcome** | Greeting, date, practice name — orient the user in one breath |
| 2 | **Since your last login** | What changed overnight or since the user was last here |
| 3 | **Urgent tasks** | Items requiring immediate action — the visual anchor of the page |
| 4 | **Today's tasks** | The day's operational work, sequenced |
| 5 | **Coming up** | Later today or this week — awareness without urgency |
| 6 | **Role-specific reminders** | Optional context: lab cases, recall notes, policy reminders |

### 6.1 Visual hierarchy rules

- **Urgent tasks** (e.g., "Start here") are the visual anchor — largest, first in the scanning path, unmistakable
- **Welcome** orients; it does not dominate
- **Coming up** and **reminders** recede visually — present but not competing for attention
- Sections are grouped in subtle containers, not one endless vertical list
- Desktop layouts use available width intelligently; mobile layouts stack without losing hierarchy

### 6.2 Homepage is not the only surface

The homepage is the **starting point**, not the entire product. Deep work — call review, patient lookup, schedule management — lives in dedicated modules reachable from homepage actions. The homepage answers "what matters now"; modules answer "let me work on this."

---

## 7. Tasks and Actions

Every task FreedomDesk presents must provide **a direct action or a clear link to additional context**.

| Task quality | Example |
|--------------|---------|
| **Good** | "Callback overnight urgent patient — (616) 555-0142" → [Start callback] |
| **Good** | "Verify Delta PPO benefits for Sarah Mitchell before 10:00 crown seat" → [Open patient] |
| **Bad** | "Overnight call received — review summary" (no next step) |
| **Bad** | "Schedule utilization below target" (metric without action) |

### 7.1 Task structure

Each task should communicate:

1. **What to do** — verb-first, plain language
2. **Why it matters** — one line, optional expansion ("Why this matters")
3. **Who owns it** — role label when relevant
4. **How to act** — button, link, or navigation to the right module

### 7.2 Empty states are reassuring

When nothing needs attention, say so clearly:

- "You're in good shape — nothing urgent flagged."
- "No patients need extra attention today."
- "Nothing extra flagged — keep the schedule moving."

Empty states are **success states**, not failures of the system to find data.

---

## 8. Universal Search (Future)

FreedomDesk should eventually include a **universal search** — one entry point to find anything relevant to the practice, without navigating module by module.

### 8.1 Search scope

| Category | Examples |
|----------|----------|
| **Patients** | Name, phone, chart number, appointment history |
| **CDT codes** | Procedure codes with plain-language descriptions |
| **Insurance** | Carriers, plans, verification status, benefits notes |
| **Calls** | Call summaries, transcripts, intent, date |
| **Documents** | Consent forms, policies, lab slips, referral letters |
| **Supplies** | Inventory items, order history, vendor info |
| **Policies** | Office DNA rules, protocols, team preferences |
| **Knowledge** | Practice Brain answers, FAQ, workflow guidance |
| **Labs** | Case status, due dates, lab contacts |

### 8.2 Search philosophy

- Search results are **filtered and ranked** — not exhaustive dumps
- Results include **context and next action**, consistent with homepage task rules
- Search respects **role permissions** — a hygienist does not see manager-only financial data
- Search language matches office vocabulary — "crown seat," not "procedure code D2740"

Universal search is a **future capability**. Homepage and role-specific surfaces remain the primary daily entry point. Search supplements; it does not replace prepared briefings.

---

## 9. End-of-Day Experience

FreedomDesk should **automatically review the user's work** before they leave — closing the loop opened by the morning briefing.

The goal is **confidence, not punishment**.

### 9.1 When everything is complete

Show a clear completion state:

- Green completion indicator
- Reassuring message: *"Everything important is handled. You're clear to go."*
- Optional brief stewardship note — one thing that went well today

The user should leave feeling **relieved**, not surveilled.

### 9.2 When items remain unfinished

Show a prominent but **encouraging** checklist:

- Exactly what still needs attention before logging off
- Each item with a direct action or link
- Plain language — not "3 open workflow items"
- Tone: *"Before you go — these still need a look"* — not *"You failed to complete 3 tasks"*

Unfinished items **carry forward** to tomorrow's morning briefing. Nothing disappears silently.

### 9.3 End-of-day is role-aware

| Role | End-of-day focus |
|------|------------------|
| Front desk | Unresolved callbacks, unverified insurance, unconfirmed tomorrow |
| Dentist | Unsigned notes, emergency follow-ups, tomorrow's high-anxiety patients |
| Assistant | Operatory close-out, sterilization cycles, tomorrow's setup |
| Hygienist | Incomplete charting, tomorrow's exam coordination |
| Office manager | Open operational items, staffing gaps tomorrow, opportunity follow-ups |

Operational detail for end-of-day content lives in [`PRACTICE_OPERATING_SYSTEM.md` §28 End-of-Day Summary](PRACTICE_OPERATING_SYSTEM.md#28-end-of-day-summary). This document governs **how that review is experienced**.

### 9.4 End-of-day timing

- Triggered when the user indicates they are leaving, or automatically near practice close
- Never blocks logout punitively — always allows "I'll handle this tomorrow" with acknowledgment
- Unfinished items appear in next morning's "Since your last login" section

---

## 10. What FreedomDesk Is Not

These anti-patterns apply to every surface. If a proposed design matches any row, reject it.

| Anti-pattern | Why it fails |
|--------------|--------------|
| **Dashboard of widgets** | Widgets invite comparison and anxiety; briefings invite action |
| **Wall of metrics** | Numbers without interpretation increase stress |
| **One endless vertical list** | No hierarchy; everything feels equally urgent |
| **Same page for every role** | Clutters clinical staff with operational noise |
| **Decorative graphics** | Visual noise without information value |
| **Excessive shadows and chrome** | Feels like consumer software, not professional tooling |
| **Busy color coding** | Color reserved for true urgency only |
| **Corporate dashboard language** | Breaks trust; sounds like software, not a colleague |
| **Data the user must interpret** | FreedomDesk interprets first |
| **Punitive end-of-day** | Confidence, not guilt |

---

## 11. Design Evaluation Checklist

Before shipping any FreedomDesk surface, verify:

- [ ] A user feels **calmer** after opening it, not more anxious
- [ ] The four morning questions are answerable within **ten seconds**
- [ ] Content is **filtered to role** before rendering
- [ ] Every visible task has a **direct action or link**
- [ ] Language sounds like an **experienced team member**, not software
- [ ] Urgent items are the **visual anchor** — unmistakable scanning path
- [ ] Empty states are **reassuring**, not apologetic
- [ ] End-of-day builds **confidence**, not guilt
- [ ] No metric appears without **actionable context**
- [ ] The surface would still feel calm after **eight hours of daily use**

---

## 12. Document Authority and Related Reading

### 12.1 Authority chain

| Topic | Canonical document |
|-------|-------------------|
| Safety, truth, clinical boundaries | [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) |
| Product domain, personas, phone persona | [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) |
| Operational intelligence, signals, briefings | [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) |
| **User experience, homepage, role surfaces, daily rhythm** | **This document** |
| Call structure and summary schemas | [`CALL_FLOWS.md`](CALL_FLOWS.md) |
| Dental workflows (operational truth) | [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md) |
| Technical architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Responsive layout system | `app/styles/layout.css` |
| Office-specific configuration | [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) |

When [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) defines *what intelligence exists* and this document defines *how it is experienced*, both apply. Neither overrides the Constitution.

### 12.2 Documents that should reference this philosophy

| Document | Why |
|----------|-----|
| [`docs/README.md`](README.md) | Canonical reading order for agents and engineers |
| [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) | Morning Brief and End-of-Day sections define signals; this doc defines presentation |
| [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) | Personas and product principles should align with role-specific homepage rules |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Module routing, role filtering, and search architecture |
| [`FEATURE_BACKLOG.md`](FEATURE_BACKLOG.md) | Permanent product backlog; sprints pull ideas from here |
| [`ROADMAP.md`](ROADMAP.md) | Phase scope should respect homepage-before-dashboard sequencing |
| [`.cursor/rules/freedomdesk.mdc`](../.cursor/rules/freedomdesk.mdc) | Agent guidance for daily implementation decisions |
| `app/shared/components/dashboard-ui.js` | Shared UI renderers must follow voice and task rules |
| `app/shared/labels.js` | Role labels and priority language |
| `src/reflection-engine/` | Reflection output feeds My Day; tone and filtering start here |

### 12.3 Implementation surfaces (current)

| Surface | Module | Philosophy expression |
|---------|--------|----------------------|
| My Day | `app/modules/my-day/` | Role-aware morning homepage — primary UX reference |
| Morning Brief | `app/modules/morning-brief/` | Practice-wide operational digest — manager-oriented |
| Placeholder modules | `app/shared/placeholder-module.js` | Future modules inherit homepage hierarchy rules |

---

*FreedomDesk exists so that every person in the practice can start prepared and leave confident. The interface is how that promise is kept — or broken.*
