# FreedomDesk Feature Backlog

> **Status:** Permanent product backlog — the long-term collection of FreedomDesk ideas.  
> **Scope:** What FreedomDesk may become, organized by capability area. Not a sprint list, not a delivery timeline.  
> **Audience:** Product, engineering, design, dental consultants, and AI agents planning future work.

**This document is the master backlog.** Sprints pull from here. [`ROADMAP.md`](ROADMAP.md) defines *when* capabilities ship in phases. [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md) defines *how* they must feel.

When an idea appears in both this backlog and another document, the other document holds operational or technical detail; this document holds the product intent.

---

## Table of Contents

1. [Morning Experience](#morning-experience)
2. [Role-Specific Homepages](#role-specific-homepages)
3. [Receptionist Experience](#receptionist-experience)
4. [Dentist Experience](#dentist-experience)
5. [Dental Assistant Experience](#dental-assistant-experience)
6. [Hygienist Experience](#hygienist-experience)
7. [Office Manager Experience](#office-manager-experience)
8. [Reflection / Before You Leave](#reflection--before-you-leave)
9. [Universal Search](#universal-search)
10. [Practice Intelligence](#practice-intelligence)
11. [Supplies & Inventory](#supplies--inventory)
12. [Insurance Intelligence](#insurance-intelligence)
13. [CDT Code Intelligence](#cdt-code-intelligence)
14. [Team Communication](#team-communication)
15. [Scheduling Intelligence](#scheduling-intelligence)
16. [Opportunity Detection](#opportunity-detection)
17. [Practice Memory](#practice-memory)
18. [Analytics](#analytics)
19. [Future AI Features](#future-ai-features)
20. [Platform Modules (Current Shell)](#platform-modules-current-shell)
21. [Document Relationships](#document-relationships)

**Status key:** ✅ Preview exists · 🔲 Placeholder module · 📋 Specified in docs · 🚧 In progress

---

## Morning Experience

Personal morning briefing — not a dashboard. Every employee should feel prepared within ten seconds.

- 📋 Four morning questions answered on login: what changed since I left, what to do first, what needs to happen today, what to know before beginning ([`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md))
- 📋 Ten-second test — homepage must not require scrolling or chart interpretation to orient the user
- 📋 Morning Brief as Chief of Staff daily opening handshake — delivered before first patient, optimized for first 10 minutes ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §12)
- ✅ **My Day** — role-aware morning homepage with conversational morning summary, priorities, patients, opportunities, insight, quick actions, today's focus (`app/modules/my-day/`)
- ✅ **Morning Brief** — practice-wide operational digest: today's focus, practice snapshot, ops cards, insights, stewardship (`app/modules/morning-brief/`)
- 📋 Homepage hierarchy: Welcome → Since your last login → Urgent tasks → Today's tasks → Coming up → Role-specific reminders
- 📋 "Start here" as visual anchor — urgent tasks dominate scanning path
- 📋 Morning is actions and awareness, not analytics — production charts belong on manager surfaces
- 📋 Morning Brief sections: overnight calls, emergent follow-ups, schedule snapshot, new patients today, squeeze-in capacity, lab reminders, recall opportunities, cancellation openings, waitlist matches, insurance verification queue, alerts, yesterday's highlight
- 📋 Morning Brief delivery rules: ≥30 min before first patient, scannable in ≤3 minutes, every item has owner role, confidence labeled, configurable sections per Office DNA
- 📋 Daily Practice Awareness as continuous situational model feeding morning surfaces ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §11)

---

## Role-Specific Homepages

Each role receives a filtered intelligence surface — not the same page with sections hidden.

- 📋 Role filtering happens before rendering, not after ([`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md))
- ✅ Role switcher on My Day (Doctor / Front Desk) with distinct perspective per role (`app/shared/labels.js`, `data/my-day-preview.json`)
- 📋 Expand role switcher to: Receptionist, Dentist, Dental Assistant, Hygienist, Office Manager
- 📋 Role switching changes perspective and content — not labels on identical data
- 📋 Each role homepage follows shared hierarchy but different content slices
- 📋 Dentist homepage must feel quiet when nothing requires clinical attention
- 📋 Office manager sees broadest view — still filtered and prioritized, never raw data dump

---

## Receptionist Experience

Front desk as phone-and-schedule command center. FreedomDesk exists largely to multiply front desk capacity.

- 📋 Overnight calls with urgency ranking and callback SLA
- 📋 Appointment requests — new bookings, reschedules, cancellations needing action
- 📋 Emergency patients — same-day urgent cases requiring callback or squeeze-in
- 📋 Insurance verification queue before today's visits
- 📋 Scheduling priorities — open blocks, waitlist matches, cancellation recovery
- 📋 Messages — team notes, patient messages, vendor callbacks
- 📋 Call summaries with clear next steps — structured fields, not transcripts to re-read
- 📋 Paste-ready summaries mapped to Open Dental comm logs ([`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md))
- 📋 60-second action rule — coordinator reads summary and knows next step immediately
- 📋 Peak-hour breathing room — 8–9 AM and 4–5 PM overflow handled ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §6)
- 📋 West Michigan insurance taxonomy on every call (Delta PPO, Delta Medicaid, HKD, MI Medicaid, PPO, cash-pay)
- 📋 Precise appointment typing — crown seat, child prophy, emergency eval — never generic "appointment"
- 🔲 **Calls module** — live monitoring, after-hours queue, structured summaries, emergency history, search by patient/intent/type (`app/modules/calls/`)
- 🔲 **Patients module** — intake status, insurance classification, demographics updates, quick lookup without PMS (`app/modules/patients/`)

---

## Dentist Experience

Only information affecting patient care today. No receptionist workflow clutter.

- 📋 Anxious or special-needs patients — emotional flags, first-visit anxiety, language needs
- 📋 Medical alerts surfaced for today's patients
- 📋 Schedule changes — cancellations, additions, column shifts since yesterday
- 📋 Lunch and block changes, meeting conflicts
- 📋 Sales reps / vendor visits scheduled or expected
- 📋 Unsigned notes requiring attention
- 📋 Emergency callbacks with clinical context
- 📋 Informed emergency callbacks — symptoms, urgency, patient identity, not "someone has a toothache" ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §5)
- 📋 High-anxiety patients and incomplete treatment plans surfaced in morning brief
- 📋 On-call dignity — rotation respected, callbacks within SLA, ER routing when required
- ✅ Doctor view in My Day preview — clinical patient attention, lab case priorities, reduced front-desk noise (`data/my-day-preview.json`)

---

## Dental Assistant Experience

Keeping the practice running smoothly behind the chair.

- 📋 Operatory status — room turnover, setup needs, which rooms are open
- 📋 Sterilization — instrument cycles, spore test reminders (when applicable)
- 📋 Supplies — low-stock alerts, orders expected today (see [Supplies & Inventory](#supplies--inventory))
- 📋 Electronic referrals — pending referrals needing follow-up
- 📋 Equipment — maintenance flags, broken equipment reports
- 📋 Doctor support — lab case status, crown seats today, procedure setup
- 📋 Lab case flags on crown/denture appointments per Office DNA ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §8)
- 📋 Appointment stage accuracy — denture impression, try-in, delivery, reline
- 📋 Emergency prep notification — same-day emergency flagged with symptom summary
- 📋 Turnover buffer respected on same-day squeeze-ins per Office DNA

---

## Hygienist Experience

Today's clinical column and patient flow.

- 📋 Today's schedule with appointment types — not generic "hygiene"
- 📋 Procedure mix — prophylaxis, SRP, periodontal maintenance, child prophy
- 📋 Doctor exams — which patients need doctor check; timing expectations
- 📋 Special patient needs — anxiety, medical flags, first visits
- 📋 Schedule awareness — running early/late signals, room changes
- 📋 Correct hygiene appointment type — prophy vs. perio maintenance vs. SRP ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §7)
- 📋 Recall-aware scheduling — overdue recall flagged when patient calls
- 📋 Hygienist preference captured in summaries
- 📋 Appropriate exam attachment per Office DNA scheduling rules
- 📋 Symptom handoff — bleeding gums, sensitivity reported as symptoms, not diagnoses

---

## Office Manager Experience

Practice operations, staffing, production, and business oversight.

- 📋 Staffing — absences, coverage gaps, schedule conflicts
- 📋 Production — today's targets vs. schedule; open chair time
- 📋 Opportunities — cancellation recovery, recall gaps, unscheduled treatment
- 📋 Business oversight — integration health, summary quality, operational anomalies
- 📋 Team coordination — cross-role items needing manager attention
- 📋 Office DNA integrity — configuration reflects reality; quarterly validation ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §9)
- 📋 ROI visibility — analytics prove captured patients and time saved
- 📋 Vendor alert clarity — FreedomDesk issues to configured contacts, not front desk
- 📋 Onboarding velocity — new practice live in <7 business days with validated DNA
- ✅ **Morning Brief** — manager-oriented practice-wide digest with snapshot metrics and stewardship note
- 🔲 **Analytics module** — call volume, summary quality, fill rate, after-hours capture (`app/modules/analytics/`)
- 🔲 **Settings module** — office hours, triage protocols, PMS connection, persona preferences (`app/modules/settings/`)
- 📋 Weekly Practice Review — manager strategic digest ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §29)
- 📋 Monthly Practice Intelligence — trends, patterns, recommendations ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §30)

---

## Reflection / Before You Leave

End-of-day confidence loop — the mirror of the morning briefing. Goal is confidence, not punishment.

- 📋 Automatic review of user's work before leaving ([`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md) §9)
- 📋 Green completion state when everything important is handled — reassuring message, optional stewardship note
- 📋 Encouraging checklist when items remain — exact unfinished work with direct actions
- 📋 Unfinished items carry forward to next morning's "Since your last login"
- 📋 Never blocks logout punitively — allow "I'll handle this tomorrow" with acknowledgment
- 📋 Role-aware end-of-day focus per role (front desk, dentist, assistant, hygienist, manager)
- 📋 End-of-Day Summary — call volume, capture highlights, open items, schedule changes, opportunities acted/missed, summary quality, integration health, tomorrow preview, stewardship note ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §28)
- 📋 End-of-day delivery within 30 minutes of practice close; open items feed next Morning Brief
- 🚧 **Reflection Engine** — post-interaction learning pipeline: Reasoning Engine → Reflection → Memory Steward → Practice Memory (`src/reflection-engine/`)
- 📋 Post-interaction reflection after every call — structured organizational assessment, not patient-facing ([`CONTINUOUS_LEARNING_ENGINE.md`](CONTINUOUS_LEARNING_ENGINE.md) §27)
- 📋 Reflection produces Memory Candidates only — never writes to Practice Memory directly
- 📋 Reflection observation categories: fact, preference, insurance, emotional, scheduling, operational, opportunity, follow_up

---

## Universal Search

One entry point to find anything relevant to the practice. Supplements briefings; does not replace them.

- 📋 Search patients — name, phone, chart number, appointment history
- 📋 Search CDT codes — procedure codes with plain-language descriptions
- 📋 Search insurance — carriers, plans, verification status, benefits notes
- 📋 Search calls — summaries, transcripts, intent, date
- 📋 Search documents — consent forms, policies, lab slips, referral letters
- 📋 Search supplies — inventory items, order history, vendor info
- 📋 Search policies — Office DNA rules, protocols, team preferences
- 📋 Search knowledge — Practice Brain answers, FAQ, workflow guidance
- 📋 Search labs — case status, due dates, lab contacts
- 📋 Results filtered, ranked, and role-permissioned — not exhaustive dumps
- 📋 Results include context and next action per homepage task rules
- 📋 Office vocabulary in search — "crown seat," not "D2740" as primary label

---

## Practice Intelligence

FreedomDesk as AI Chief of Staff — one intelligence layer with role-specific views.

- 📋 Practice Brain interprets signals first; UI presents conclusions ([`FREEDOMDESK_INTELLIGENCE.md`](FREEDOMDESK_INTELLIGENCE.md))
- 📋 Three question categories: Practice, Knowledge, Hybrid — routed through appropriate source stack
- 📋 Answer Contract — evidence, confidence, actions with owner role; no answer without evidence
- 📋 Staff Q&A — interactive practice and knowledge questions (Phase 4+ per Intelligence doc)
- 📋 Live Operational Awareness — intraday signals during peak hours ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §13)
- 📋 Live signals: call surge, same-day emergency, schedule conflict, cancellation event, long hold, integration degradation, complaint/anger flag
- 📋 AI Recommendations with explainability, accept/reject/snooze, confidence scoring ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §25)
- 📋 Recommendation categories: schedule, follow-up, verification, clinical prep, DNA maintenance, retention
- 📋 Patient Timeline — foundational continuity across calls and PMS (Phase 1 foundational, enriched Phase 2+)
- 📋 Proactive intelligence matrix — lab reminders, emergency prep, schedule mismatch, supply flags (Phase 5+)
- ✅ My Day "Something I noticed" — practice insight section from reflection/memory signals
- ✅ My Day "Why this matters" — expandable reasoning on demand (`app/shared/components/dashboard-ui.js`)

---

## Supplies & Inventory

Operational support for assistants and front desk — not a full inventory system replacement.

- 📋 Low-stock alerts surfaced on assistant homepage ([`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md))
- 📋 Orders expected today
- 📋 Supply shortage flags in proactive intelligence when inventory signals exist (Phase 5+ per [`FREEDOMDESK_INTELLIGENCE.md`](FREEDOMDESK_INTELLIGENCE.md))
- 📋 Universal search scope includes supplies — inventory items, order history, vendor info
- 📋 Manual stock check uncertainty acknowledged when inventory unrecorded

---

## Insurance Intelligence

Program-level classification and verification support — never coverage promises.

- 📋 West Michigan insurance hierarchy: Delta PPO → Delta Medicaid → HKD → MI Medicaid → other PPO → cash-pay ([`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md))
- 📋 Program disambiguation on calls — never treat "Delta" as one plan
- 📋 Accepted-plan classification vs. Office DNA
- 📋 Collecting member ID, group, Medicaid ID — not remaining benefits or fee quotes
- 📋 Pre-visit verification queue — new patients needing benefits check before visit
- 📋 Financial anxiety acknowledgment without payment negotiation ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §21)
- 📋 Verification deferral language on calls; front desk runs clearinghouse in PMS after intake ([`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md))
- 📋 Real-time eligibility verification during call via clearinghouse API (Phase 6 — [`ROADMAP.md`](ROADMAP.md))
- 🔲 Patients module — West Michigan insurance classification in patient context view

---

## CDT Code Intelligence

Procedure code knowledge for team reference — codes, not fees.

- 📋 Knowledge Base L1 atoms for CDT codes — nomenclature, typical use, not fee ([`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md))
- 📋 Staff knowledge questions: "What's the CDT code for a porcelain crown?" → code and description
- 📋 Treatment-specific appointment typing on calls — crown seat, RCT, extraction, implant consult, denture stage ([`CALL_FLOWS.md`](CALL_FLOWS.md))
- 📋 Hygiene codes — D1110 prophy, D1120 child prophy, D4910 perio maintenance ([`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md))
- 📋 Universal search — CDT codes with plain-language descriptions
- 📋 Annual CDT alignment in Knowledge Engine versioning

---

## Team Communication

How intelligence reaches the team — channels, urgency tiers, role routing, noise discipline.

- 📋 Per-call summary email/SMS — structured output ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §22)
- 📋 Webhook / PMS task — comm log, task queue write-back
- 📋 Live alert (push/SMS) — emergency, same-day urgent only
- 📋 Planned digests — Morning Brief, End-of-Day Summary, Weekly Review
- 📋 On-demand dashboard — self-serve awareness (not primary daily entry)
- 📋 Role routing matrix — signal type to primary/secondary owner (emergency → front desk + doctor; billing → manager; lab → assistant; etc.)
- 📋 Tiered urgency — not everything is a push notification
- 📋 Acknowledgment tracking for critical items
- 📋 Failover — webhook failure triggers email/SMS backup per Office DNA
- 📋 Structured over prose — typed fields, action items, owner role
- 📋 No PHI in logs or ops alerts

---

## Scheduling Intelligence

Continuous alignment of patient need, appointment type, provider rules, and chair capacity.

- 📋 Correct appointment type selection — not clinical treatment planning ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §14)
- 📋 Column routing — hygiene vs. doctor
- 📋 Duration matching Office DNA; blockout and holiday respect
- 📋 Waitlist and fill logic — cancellation recovery within 15-minute target latency
- 📋 Scheduling recommendations and slot fit scores for waitlist matching
- 📋 New patient placement suggestions per DNA new-patient days
- 📋 Same-day squeeze-in capacity surfaced in morning brief
- 📋 Real-time slot offering when PMS integrated — honest request vs. confirmed booking ([`ROADMAP.md`](ROADMAP.md) Phase 3)
- 📋 Recall-driven scheduling — "You're due for your cleaning" when PMS read available (Phase 2)
- 📋 Schedule optimization outputs — column balance alerts, production-aware sequencing for manager review
- 📋 Emergency lifecycle — triage → route → document → follow-up → learn ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §15)

---

## Opportunity Detection

Proactive identification of revenue, retention, and efficiency gains the team would pursue if they had bandwidth.

- 📋 Opportunity types: new patient capture, waitlist fill, unscheduled treatment, recall reactivation, household expansion, same-day production, insurance upgrade path, capacity balance ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §23)
- 📋 Every opportunity cites evidence source — call summary, PMS, schedule
- 📋 Confidence scoring; low-confidence queues for human review
- 📋 DNA gating — office opts into opportunity categories
- 📋 Opportunity decay — expired opportunities auto-close
- 📋 No pressure — presented to team, not pushed to patients without consent
- ✅ My Day "When you have a moment" — verb-first opportunity recommendations
- ✅ Morning Brief Top Opportunities and Recommended Actions sections
- 🔲 **Opportunities module** — cancellation recovery, recall/reactivation, open blocks, impact-ranked with owner (`app/modules/opportunities/`)

---

## Practice Memory

Institutional memory for one practice — more valuable in year two than day one.

- 📋 Memory categories: configuration history, operational patterns, recommendation history, seasonal baselines, integration health, team preferences ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §27)
- 📋 Per-practice only — no cross-practice identifiable data in memory pools
- 📋 Operational metadata, not clinical charts
- 📋 Memory feeds Morning Brief baselines, recommendation confidence, analytics trends, DNA drift suggestions
- 📋 Continuous Learning loop — observe → understand → recommend → act → measure → remember → refine
- 📋 DNA drift detection — summary vs. PMS mismatches alert manager, never auto-change
- 📋 Recommendation accept/reject feedback calibrates confidence per office
- 🚧 Reflection Engine → Memory Steward → Practice Memory pipeline (`src/reflection-engine/`)
- ✅ My Day preview includes `memorySummary` — open tasks, unresolved issues, opportunity counts (`data/my-day-preview.json`)

---

## Analytics

Measurement layer proving FreedomDesk leaves the practice better — action-linked, not vanity metrics.

- 📋 Analytics domains: access, intake quality, clinical routing, schedule health, retention, production, team efficiency, ROI ([`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) §24)
- 📋 Every dashboard metric connects to a recommended action
- 📋 De-identified aggregates for platform learning — practice-owned data, exportable
- 📋 Honest baselines — pre-FreedomDesk comparison where available
- 📋 Role-specific metrics roll up to practice success principles
- 📋 Front desk: summary completeness, time-to-action, rework rate, insurance classification accuracy
- 📋 Manager: DNA accuracy, ROI report utilization, staff adoption rate
- 🔲 **Analytics module** — call volume patterns, summary completeness trends, fill rate, after-hours capture, emergency routing metrics (`app/modules/analytics/`)
- 📋 Phase 5 analytics dashboard — volume trends, new patient capture, answer rate, handle time, ROI calculator ([`ROADMAP.md`](ROADMAP.md))
- 📋 Analytics belong on manager review surfaces — not morning homepages for clinical/front-desk roles

---

## Future AI Features

Differentiation requiring dental domain depth — evaluated per [`ROADMAP.md`](ROADMAP.md) Phase 6 criteria.

- 📋 Insurance eligibility verification via clearinghouse during call (DentalXChange, Change Healthcare, Availity)
- 📋 Smart scheduling optimization — ML-based slot selection to maximize production
- 📋 Outbound recall campaigns — automated recall calls/texts for overdue patients
- 📋 Sentiment analysis — flag unhappy callers for office manager follow-up
- 📋 Multi-language support — Spanish at minimum
- 📋 Treatment plan scheduling — "I see you have a crown pending" → schedule treatment
- 📋 Post-call patient satisfaction survey via SMS
- 📋 Voice biometrics for caller verification (research phase)
- 📋 DSO enterprise tier — custom pricing, dedicated support, API access
- 📋 Advanced hybrid clinical-admin support — decade-scale memory (Phase 6 Intelligence)
- 📋 Decade-scale proactive intelligence and outbound recall intelligence

**Phase 6 evaluation criteria:** Requires dental domain expertise; increases capture or reduces front desk burden; HIPAA-compliantly buildable; validated customer demand at 50+ customers.

---

## Platform Modules (Current Shell)

Internal dashboard (`app/`) — operating surface for practice intelligence preview.

- ✅ Dashboard shell — sidebar navigation, module routing, responsive layout system (`app/dashboard.js`, `app/styles/layout.css`)
- ✅ Shared UI components — morning summary, priority lists, patient/opportunity lists, reasoning toggles, role switcher (`app/shared/components/dashboard-ui.js`)
- ✅ Module registry and placeholder factory (`app/shared/registry.js`, `app/shared/placeholder-module.js`)
- 🔲 Calls, Patients, Opportunities, Analytics, Settings — placeholder modules awaiting Practice Brain integration
- 📋 Admin dashboard (Phase 4) — onboarding wizard, call flow config, PMS setup, call history, user management ([`ROADMAP.md`](ROADMAP.md))
- 📋 Phone agent MVP (Phase 1) — Twilio telephony, Aly voice pipeline, conversation engine, structured summaries, email/SMS delivery

---

## Document Relationships

| Document | Role relative to this backlog |
|----------|-------------------------------|
| **[`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md)** | **How** backlog items must feel — calm, role-filtered, action-first, confidence at close. Every feature pulled from this backlog must pass the philosophy checklist before shipping. |
| **[`ROADMAP.md`](ROADMAP.md)** | **When** backlog items ship — phased delivery with dependencies, milestones, and success criteria. Sprints select from this backlog and schedule via ROADMAP phases. |
| **[`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md)** | **What intelligence exists** — operational signals, role success metrics, brief contents, opportunity types, memory categories. Backlog items trace here for domain truth. |
| **[`FREEDOMDESK_INTELLIGENCE.md`](FREEDOMDESK_INTELLIGENCE.md)** | **How intelligence reasons** — question categories, Answer Contract, proactive matrix, staff Q&A. |
| **[`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md)** | **Non-negotiable boundaries** — safety, truth, clinical limits. No backlog item overrides the Constitution. |
| **[`CALL_FLOWS.md`](CALL_FLOWS.md)** | Call structure and summary schemas feeding Calls module and morning surfaces. |
| **[`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md)** | Operational truth for scheduling, insurance, hygiene, and treatment workflows. |

### How to use these documents together

1. **Discover ideas** → this backlog (by capability area)
2. **Validate feel** → [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md)
3. **Confirm domain** → [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) or [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md)
4. **Schedule delivery** → [`ROADMAP.md`](ROADMAP.md) phase and dependencies
5. **Implement** → [`ARCHITECTURE.md`](ARCHITECTURE.md), [`CALL_FLOWS.md`](CALL_FLOWS.md), engine docs

---

*This backlog grows when product decisions are made. It shrinks when ideas are shipped, rejected, or merged. It never replaces the Constitution.*
