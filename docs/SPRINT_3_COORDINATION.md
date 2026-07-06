# Sprint 3: Practice Coordination

> **Status:** Approved product vision. Engineering specs follow separately.  
> **Objective:** Teach FreedomDesk to coordinate the team.  
> **Audience:** Product, design, engineering, dental consultants.

**Read first:** [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) → [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md) → [`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md)

---

## North Star

FreedomDesk becomes the **intelligent coordinator** of the practice — helping the right person know the right thing at the right time.

Sarah should not check email, sticky notes, a team chat app, and My Day separately. She opens My Day and the practice's operational conversation is already interpreted, prioritized, and actionable.

This sprint is **not** about adding isolated features. Every capability should improve communication, ownership, and teamwork inside a private dental practice.

---

## One Ongoing Conversation

Everything inside FreedomDesk is part of **one ongoing operational conversation**:

- Notes
- Messages
- Tasks
- Call summaries
- AI recommendations

These are different **views** of the same conversation — not separate products. A message about Sarah Mitchell's insurance, the call that prompted it, and the task Jamie owns are one story, shown where each person needs it.

**Design implication:** Notes, team messages, delegated tasks, and call summaries should feel like one calm communication experience — not four features bolted together.

---

## Core Capabilities

### 1. Notes

Every employee has quick access to personal notes from anywhere inside My Day.

- Notes slide in from the right
- Private by default unless intentionally shared
- Fast capture — jot something down without leaving the current screen
- Optional links to a patient, appointment, or teammate when helpful
- Pinned notes can surface in **Heads up** as gentle reminders

**Examples:**
- Remember to ask about whitening.
- Call patient's mother after lunch.
- Doctor wants to review #19.
- Verify Delta PPO later.

Sharing a note sends it to a teammate as a message. The original stays private unless shared.

---

### 2. Team Messages

Every employee can send quick internal messages that feel like talking to a teammate — not email.

- Messages go to **people**, not job titles ("Jamie," not "Assistant")
- Accessible from a header affordance anywhere in My Day
- Recent conversations grouped by person — compact, scannable
- Quiet by default; only truly time-sensitive items interrupt **Start here**
- Recipients can tap **Got it** so senders know it landed — no surveillance, no read-receipt anxiety

**Examples:**
- Room 2 ready for exam.
- Please verify Sarah Mitchell's insurance.
- Lab case arrived.
- Doctor requested anesthetic.

When someone says "front desk" or "doctor," FreedomDesk resolves to the right person using who is actually working today — but the experience always feels person-to-person.

---

### 3. Task Delegation

Messages easily become owned tasks — without a separate task form.

FreedomDesk intelligently determines ownership whenever enough context exists: who should do it, what patient it relates to, when it is due, and how urgent it is. The sender confirms when the system is unsure. Nothing assigns itself silently.

**Example:**

Sarah → Jamie:
> Please verify benefits before the 10:00 crown.

FreedomDesk understands:

| | |
|---|---|
| **Owner** | Jamie |
| **Priority** | Before 10:00 AM |
| **Related patient** | Sarah Mitchell |
| **Status** | Waiting |

Jamie sees this on My Day as a normal work item — same calm task cards as callbacks and insurance verification — with a direct action to verify. When Jamie finishes, Sarah knows it is done.

---

### 4. Unified Communication

Notes, messages, delegated tasks, and AI-generated call summaries connect naturally:

- **Since you were last here** summarizes what changed: calls, messages, tasks — in one breath, not four alerts
- Opening a call summary shows related messages and tasks for the same patient
- **End of Day** includes open delegated work and unanswered questions — confidence, not guilt
- The right slide-in panel handles notes, messages, tasks, and call detail — one shell, different context

The team never hunts across silos. FreedomDesk filters before it informs.

---

## Where It Lives

Coordination is **ambient across the dashboard** — not a new sidebar module.

The **Coordination Panel** is a permanent right-side workspace shell (dashboard level). Every future coordination feature lives inside it.

| Affordance | Where | Purpose |
|------------|-------|---------|
| **Panel triggers** | Dashboard header, always available | Open Notes or Team tab |
| **Coordination Panel** | Slides in from the right | Notes, Team, call summaries, delegation, related context |
| **Work queue** | Existing My Day sections | Tasks, including delegated work |

**Sprint 3A ships:** panel shell, Notes tab, Team placeholder. Call summaries already open in the same panel (context mode).

My Day hierarchy stays the same:

```
Greeting
Since you were last here
Start here
Today's work
Coming up / Heads up
```

Thread items that need action appear in **Start here** or **Today's work**. Items that only inform appear in **Since you were last here** or **Heads up** — never both.

---

## Interaction Examples

### Room ready (inform only)

Jamie messages Dr. Johnson: *"Room 2 ready for exam."*

Dr. Johnson sees it in **Since you were last here** — not as an urgent interruption. He taps **Got it** and moves on.

### Insurance delegation (action required)

Sarah messages Jamie: *"Please verify Sarah Mitchell's benefits before the 10:00 crown."*

FreedomDesk suggests assigning it to Jamie. Sarah confirms. Jamie's **Start here** shows:

> Verify Delta PPO benefits for Sarah Mitchell — before 10:00 crown seat · From Sarah

Jamie taps **Verify insurance** (existing flow). When done, Sarah sees it completed.

### Doctor's private reminder

Dr. Johnson saves a private note: *"Review #19 before 3:00 composite."*

It stays on his Heads up. He can share it with Jamie if setup help is needed — that share becomes a message, optionally a task.

### Call summary spawns coordination

Overnight call: Sarah Mitchell reports crown sensitivity.

Sarah reviews the summary, messages Dr. Johnson: *"Patient reports cold sensitivity #14 — worth reviewing before seat."*

Dr. Johnson sees it in clinical context — not buried in front desk workflow.

---

## Experience Principles

These govern every surface in Sprint 3:

| Principle | What it means here |
|-----------|-------------------|
| **Filter before informing** | Not every message deserves **Start here** |
| **Protect attention** | Unread dot, not a badge count; no push for routine chatter |
| **Sound like a teammate** | "Jamie completed verification for Sarah Mitchell" — not "Task closed" |
| **Built for people** | Messages to Jamie; responsibilities help routing behind the scenes |
| **One workspace** | No new nav module; coordination lives inside My Day |
| **Private by default** | Notes are yours until you share them |
| **Confirm when unsure** | FreedomDesk interprets; people decide when it matters |
| **Structured over narrative** | Tasks name the patient, the action, and the deadline — ready to act |

---

## What We Refuse

- Group channels, @everyone, or Slack-style noise
- Email-style threads with subjects and CC
- A separate Tasks or Messages app in the sidebar
- Auto-assignment without human confirmation
- Read receipts or activity surveillance
- Push notifications for routine messages
- Replacing the practice management system

FreedomDesk coordinates. The PMS records.

---

## Success Criteria

| Question | Bar |
|----------|-----|
| Can Sarah save a note in two taps? | Yes |
| Can she message Jamie in three? | Yes |
| Does Sarah → Jamie delegation work without a manual form? | Yes |
| Is My Day still calm at 7:45 AM? | Ten-second test still passes |
| Does the team use it instead of sticky notes? | Qualitative pilot bar |

---

## Document Authority

| Topic | Document |
|-------|----------|
| Moral obligations | [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) |
| Product principles | [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md) |
| Person model, My Day | [`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md) |
| How it should feel | [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md) |
| **Sprint 3 product vision** | **This document** |
| Engineering implementation | *Written when build begins* |

---

The goal of Sprint 3 is not to add messaging. The goal is to make FreedomDesk feel like one intelligent teammate coordinating the entire practice.
