# FreedomDesk Context

> **Purpose:** This document is the canonical product and domain context for FreedomDesk. Any engineer, AI agent, or dental consultant working on this project should read this first. It defines *why* we exist, *who* we serve, and *how* we make decisions.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Primary Market: West Michigan](#primary-market-west-michigan)
3. [The Problem](#the-problem)
4. [Product Vision](#product-vision)
5. [What FreedomDesk Is — and Is Not](#what-freedomdesk-is--and-is-not)
6. [Target Market](#target-market)
7. [Personas](#personas)
8. [Core Product Principles](#core-product-principles)
8. [Competitive Landscape](#competitive-landscape)
9. [Voice Agent Identity](#voice-agent-identity)
10. [HIPAA and Compliance Posture](#hipaa-and-compliance-posture)
11. [Business Model](#business-model)
12. [Success Metrics](#success-metrics)
13. [Glossary](#glossary)

---

## Executive Summary

FreedomDesk is an AI-powered phone front desk system built exclusively for **private dental practices**. It answers inbound calls, conducts structured patient conversations, triages emergencies, and delivers organized call summaries to the practice team.

FreedomDesk was founded by **Dr. William Buurma DDS**, a practicing general dentist in **West Michigan**, who experienced firsthand the daily chaos of phones ringing while the front desk is checking in a patient, missed calls during peak hours, and after-hours patients reaching voicemail when they need help.

The product thesis: **independent dental practices lose revenue and patient trust at the phone.** Hiring another full-time receptionist is expensive and hard. Generic answering services don't understand dental workflows, insurance nuances, or emergency triage. FreedomDesk fills the gap with domain-specific AI that sounds like a trained front desk coordinator and integrates with the software practices already use.

**Design mandate:** FreedomDesk reflects how **successful private practices actually operate** — not generic call-center scripts. When choosing between implementations, prefer the path that **minimizes work for the front desk** while delivering an **excellent patient experience**. The founder is a practicing dentist; product decisions are validated against real chairside and front-desk reality.

---

## Primary Market: West Michigan

FreedomDesk is designed **first and foremost for independent private dental practices in West Michigan.** Every feature, call flow, insurance default, and PMS integration priority should be evaluated against this market before generic national patterns.

### Anchor market: Grand Rapids metro

| Attribute | Initial target profile |
|-----------|------------------------|
| **Location** | Grand Rapids, Michigan (expand to Holland, Muskegon, Kalamazoo, Lansing) |
| **Practice type** | Private general dentistry |
| **Dentists** | 1–3 |
| **Operatories** | 4–8 |
| **Clinical staff** | Hygienists (2–4), assistants (2–4) |
| **Front desk** | 1–3 team members |
| **Call pattern** | High volume during business hours; significant after-hours emergency volume |
| **PMS (priority order)** | Open Dental → Eaglesoft → Dentrix → CareStack |
| **Insurance (priority order)** | Delta Dental → Delta Dental Medicaid → Healthy Kids Dental → Michigan Medicaid → PPO plans → cash-pay |

### Why West Michigan first

- **Founder market fit** — Dr. Buurma practices here; workflows, carriers, and PMS choices are firsthand knowledge
- **Open Dental concentration** — many independent West Michigan offices run Open Dental on local or cloud servers
- **Delta Dental dominance** — Delta Dental of Michigan is the most common commercial carrier; Medicaid/HKD volume is significant
- **After-hours demand** — lakeshore and suburban families call evenings/weekends; voicemail loses patients to the next Google result
- **Pilot proximity** — onboarding, workflow review, and iteration require local access

### What "West Michigan practice" means for engineering

- Default insurance taxonomy includes Michigan Medicaid programs, not just generic "Medicaid"
- Emergency triage assumes on-call dentist rotation common in 1–3 doctor private offices
- Scheduling assumes **hygiene-heavy schedules** with doctor blocks for restorative production
- Summaries must support **same-day emergency squeeze-ins** — a daily reality in busy GP offices
- Voice persona ("Aly") uses **Midwest-friendly** tone — natural for Grand Rapids callers

---

## The Problem

### Phone volume vs. front desk capacity

A typical single-location general dental practice receives **400–1,500 inbound calls per month**. Peak volume clusters around:

- **8:00–9:30 AM** — patients confirming same-day appointments, calling about insurance, running late
- **11:30 AM–1:30 PM** — lunch-hour scheduling requests, new patient inquiries
- **4:30–6:00 PM** — end-of-day reschedules, billing questions
- **Evenings and weekends** — emergencies, new patient Google searches, appointment requests

The front desk team (usually 1–3 people) is simultaneously:

- Checking patients in and out
- Collecting payments and explaining treatment plans
- Managing the schedule in the PMS
- Handling walk-ins
- Answering the phone

When the phone rings and no one can answer within 3–4 rings, **30–60% of callers hang up without leaving a message** (industry estimates for healthcare). Many of those are new patient opportunities — the highest-value calls a practice receives.

### After-hours gap

Most private practices are open **32–40 hours per week**. Dental pain doesn't respect business hours. Patients with toothaches, broken teeth, or post-operative complications call evenings and weekends. Voicemail is a poor experience; patients often call a competitor or go to urgent care/ER.

### Answering service limitations

Traditional answering services:

- Read scripts without dental context
- Cannot access the schedule or patient record
- Cannot distinguish a routine reschedule from a true dental emergency
- Deliver free-text messages that the office must re-process
- Often mispronounce provider names and insurance carriers

### Generic AI limitations

General-purpose AI phone agents:

- Don't know that a "new patient exam" is 60–90 minutes, not 30
- Don't understand PPO vs. HMO vs. Medicaid assignment
- May diagnose or give medical advice (liability risk)
- Don't integrate with Open Dental, Dentrix, or Eaglesoft
- Sound robotic or overly enthusiastic — patients in pain notice immediately

---

## Product Vision

**Build the world's best AI front desk system for private dental practices.**

"Best" means:

| Dimension | Definition of "best" |
|-----------|---------------------|
| **Clinical safety** | Never diagnoses, never prescribes, never minimizes true emergencies |
| **Dental fluency** | Speaks the language of CDT codes, appointment types, insurance verification, and recall schedules |
| **Human warmth** | Sounds like Aly — a calm, experienced coordinator who has worked a dental front desk for years |
| **Practice fit** | Configurable per office: providers, hours, emergency rules, insurance accepted, scheduling blocks |
| **Integration depth** | Reads and writes to the practice's PMS where APIs allow; structured summaries everywhere else |
| **Reliability** | 99.9%+ uptime on telephony; graceful degradation when PMS is unreachable |
| **ROI clarity** | Practices can measure captured new patients, reduced missed calls, and front desk time saved |

Long-term vision: FreedomDesk becomes the **default phone layer** for independent dental — the way Stripe became default payments for startups. Every call answered. Every new patient captured. Every emergency triaged correctly.

---

## What FreedomDesk Is — and Is Not

### FreedomDesk IS

- A **phone answering and intake layer** that handles routine and urgent inbound calls
- A **structured data collector** that turns phone conversations into actionable summaries
- A **front desk multiplier** — handling overflow so in-office staff can focus on patients present
- A **24/7 coverage option** for after-hours, lunch breaks, and peak overflow
- A **practice-configured system** — each office defines its rules, not FreedomDesk HQ

### FreedomDesk IS NOT

- A replacement for the front desk team
- A clinical decision support tool
- A billing or claims submission system
- A patient portal or texting platform (though it may trigger texts via integrations)
- A treatment plan presenter or fee quoter (beyond general "we'll verify at your visit" language)
- An AI that identifies itself as artificial intelligence to callers (it represents the practice)

---

## Target Market

### Primary: West Michigan independent general dentistry

| Attribute | Typical profile |
|-----------|----------------|
| **Region** | Grand Rapids metro first; West Michigan broadly |
| **Locations** | 1–2 (occasionally 3) |
| **Dentists** | 1–3 general dentists |
| **Operatories** | 4–8 |
| **Front desk** | 1–3 team members handling phone + check-in/out |
| **Hygienists** | 2–4; hygiene column often fills before doctor column |
| **PMS** | Open Dental (most common in target), then Eaglesoft, Dentrix, CareStack |
| **Calls/month** | 600–2,500; spikes 8–9 AM and 4–5 PM |
| **After-hours** | Significant emergency volume Thu–Sun evenings |
| **Insurance mix** | Delta Dental PPO, employer PPOs, Healthy Kids Dental, Michigan Medicaid, cash-pay |
| **Pain** | Missed new patients, front desk drowning at peak, after-hours voicemail, incomplete messages |
| **Budget mindset** | Compares to $699/mo vs. $3,500+/mo for another FTE receptionist |

### Workflows FreedomDesk must master (West Michigan GP)

New patient scheduling · same-day emergency scheduling · hygiene recall · crown seat · root canal · extraction · implant consultation · denture workflows · pediatric scheduling · insurance information collection · demographics updates · appointment confirmations · cancellations and rescheduling · waitlist management

See [DENTAL_WORKFLOWS.md](DENTAL_WORKFLOWS.md) for operational detail and [CALL_FLOWS.md](CALL_FLOWS.md) for phone scripts.

### Secondary: Small dental groups (DSO-lite)

Groups with 4–15 locations that want standardized phone intake without building in-house. FreedomDesk Custom tier with per-location configuration.

### Out of scope (for now)

- Large DSOs with custom call centers
- Medical practices (non-dental)
- Outbound recall/teledentistry campaigns (future consideration)
- Insurance verification as a standalone product

---

## Personas

### Persona 1: Dr. Sarah Van Der Berg — Practice Owner / Lead Dentist

**Demographics:** 42, owns a 2-dentist general practice in Grand Rapids suburbs, 6 operatories, 10 staff. Uses Open Dental. Participating Delta Dental provider.

**Goals:**
- Keep hygiene and doctor columns productive
- Stop losing new patients who call during morning rush
- Protect after-hours patients without living on her cell phone
- Maintain the personal feel of a private practice

**Frustrations:**
- "We missed three new patient calls last week — everyone was at the front desk with check-ins."
- "I don't want something that sounds like a call center."
- "We block Wednesday afternoons for team meetings — the schedule has to respect that."
- "Half our new patients ask about Delta Dental or Healthy Kids Dental on the first call."

**FreedomDesk value:** Captures new patients 24/7, triages emergencies to her on-call rotation correctly, delivers summaries she trusts because they were built by a dentist who runs a office like hers.

---

### Persona 2: Maria Kowalski — Office Manager

**Demographics:** 48, 14 years in dental admin in West Michigan, de facto Open Dental admin, knows Delta Dental fee schedules and Medicaid billing quirks.

**Goals:**
- Full hygiene recall column + productive doctor blocks
- Front desk not drowning 8–9 AM and 4–5 PM
- Clean patient records in Open Dental — correct insurance tier, member ID, Medicaid ID
- After-hours emergencies routed with symptoms documented

**Frustrations:**
- "The answering service writes 'has insurance' but not Delta vs. Delta Medicaid — completely different."
- "I spend 20 minutes re-entering voicemail into Open Dental."
- "Emergency callers need same-day slots flagged, not a generic callback."

**FreedomDesk value:** Structured summaries with Michigan insurance taxonomy, appointment type, urgency, and PMS-ready fields — her team reviews and clicks, not re-types.

---

### Persona 3: Jamie — Front Desk Coordinator

**Demographics:** 27, 4 years front desk in a busy Grand Rapids GP office, handles 40+ calls on a Monday.

**Goals:**
- Patients in the office feel welcomed and unhurried
- Phone coverage during check-in rushes and lunch (half-staffed)
- After-hours summaries complete enough to action in 60 seconds

**Frustrations:**
- "I can't check in a family of four and answer the phone."
- "Crown seats and emergency squeeze-ins need specific operatory blocks — generic 'schedule appointment' messages don't help."
- "Waitlist patients call back and I don't know what they wanted."

**FreedomDesk value:** Handles overflow and after-hours; summaries specify appointment type (crown seat, SRP, extraction), insurance, and whether patient is on waitlist.

---

### Persona 4: Patient Caller — "Finn Leo"

**Demographics:** 34, new to Grand Rapids, has Delta Dental PPO through employer, needs a new patient exam.

**Goals:**
- Schedule an appointment quickly
- Know if the office accepts his insurance
- Feel welcomed, not processed

**Frustrations:**
- Voicemail loops
- Hold times over 2 minutes
- Being asked the same question twice

**FreedomDesk value:** Answered on first ring, warm greeting, insurance acknowledged, appointment offered with real times, confirmation text promised.

---

## Core Product Principles

### 1. Support, don't replace

FreedomDesk augments the front desk. Language, marketing, and product design must never position FreedomDesk as eliminating jobs. The office manager configures it; the front desk reviews summaries and completes PMS entries.

### 2. Never cross the clinical line

FreedomDesk agents:

- **May** ask about symptoms, pain level, swelling, fever, trauma mechanism, duration
- **May** flag urgency and route per office protocol
- **May** give general post-op instructions *only if explicitly configured by the practice*
- **Must not** diagnose conditions ("That sounds like an abscess")
- **Must not** prescribe medications or recommend specific drugs/doses
- **Must not** guarantee treatment outcomes or insurance payment amounts

### 3. Practice-configurable everything

Hard-coded workflows fail. Every practice differs in:

- Appointment types and durations
- Provider schedules and blocks
- Insurance plans accepted
- New patient vs. existing patient protocols
- Emergency escalation paths (on-call dentist vs. partner oral surgeon vs. ER referral)
- Cancellation and no-show policies

Configuration is a first-class product surface, not an engineering afterthought.

### 4. Structured output over free text

Every call produces a **typed summary** — not a paragraph the office must parse. Fields map to PMS columns where possible. See [CALL_FLOWS.md](CALL_FLOWS.md) for summary schemas.

### 5. PMS-aware integration

FreedomDesk must understand the practice's software. Patient lookup, appointment creation, and availability queries differ materially between Open Dental, Dentrix, Eaglesoft, and CareStack. See [PRACTICE_MANAGEMENT_SOFTWARE.md](PRACTICE_MANAGEMENT_SOFTWARE.md).

### 6. Sound human

Voice agents use the "Aly" persona: calm, Midwest-friendly, early-30s experienced coordinator. Short responses. Natural pacing. No "As an AI language model..." No corporate jargon. No over-cheerfulness.

### 7. Fail gracefully

When the PMS is down, FreedomDesk still answers, collects information, and queues write-back. When telephony fails, failover routes to backup number or voicemail with alert to practice. Never silent failure.

### 8. Measure what matters

Track: answer rate, average handle time, new patient capture rate, emergency routing accuracy, summary completion rate, patient satisfaction (post-call SMS survey optional).

### 9. Minimize front desk rework

Every summary field should map to something the front desk would otherwise type into Open Dental. If FreedomDesk collects it on the phone, the front desk should not ask again. Prefer **structured, PMS-ready output** over narrative paragraphs. When trade-offs exist, **reduce front desk clicks** over marginal call-length savings.

---

## Competitive Landscape

| Competitor type | Examples | FreedomDesk differentiation |
|-----------------|----------|----------------------------|
| **Traditional answering services** | Ruby, PATLive, local services | Dental-specific intake, structured summaries, PMS integration |
| **Generic AI phone agents** | Bland AI, Vapi-based generic bots | Dental workflows, emergency triage, Aly persona, PMS connectors |
| **Dental-specific answering** | Dental Answering Service, eAssist phone | AI scale (24/7, instant answer), lower cost, deep PMS integration |
| **PMS-native features** | Dentrix Detect AI, Open Dental messaging | FreedomDesk is PMS-agnostic; works across platforms |
| **DSO internal call centers** | Heartland, Aspen internal | FreedomDesk serves independents who can't build call centers |

FreedomDesk wins on: **dental domain depth + human voice quality + PMS integration + price point ($699/mo vs. $3,500/mo FTE).**

---

## Voice Agent Identity

The default FreedomDesk voice agent is **"Aly"** — defined in `voice/persona.json`.

| Attribute | Value |
|-----------|-------|
| Role | Experienced dental front desk coordinator |
| Age range | Early 30s |
| Tone | Calm, conversational, Midwest-friendly, professional, efficient, reassuring |
| Pacing | Natural; short responses; subtle pauses; never rushed or robotic |
| Phrases | "Absolutely," "Of course," "One moment," "Let me pull that up," "I can help with that," "Got it," "Perfect" |
| Avoid | Robotic phrasing, over-cheerfulness, corporate/futuristic language, monologues, repeating the caller, identifying as AI, medical diagnosis |

For urgent calls: stay calm, flag urgency, route per office rules, recommend callback, direct to urgent care when symptoms are severe. Never diagnose, prescribe, or give medical advice.

Practices on **FreedomDesk Custom** may request persona adjustments (name, greeting script) but clinical safety rules are non-negotiable.

---

## HIPAA and Compliance Posture

FreedomDesk handles **Protected Health Information (PHI)** when callers discuss symptoms, names, dates of birth, insurance, and appointment details. Compliance is architectural, not a checkbox.

### Business Associate Agreements (BAAs)

FreedomDesk (Buurma AI) must execute BAAs with:

- Each dental practice (Covered Entity)
- Each subprocessors that touch PHI (telephony, voice AI, cloud hosting, database, email/SMS)

### Minimum necessary standard

Collect only what the call type requires. A reschedule needs name + DOB + current appointment; it does not need full medical history.

### Technical safeguards

| Control | Requirement |
|---------|-------------|
| **Encryption in transit** | TLS 1.2+ on all API and telephony connections |
| **Encryption at rest** | AES-256 for stored call recordings, transcripts, and summaries |
| **Access control** | Role-based; practice staff see only their practice's data |
| **Audit logging** | Who accessed what PHI, when |
| **Retention limits** | Configurable; default 90 days for recordings, 1 year for summaries (practice-configurable) |
| **De-identification** | Analytics use de-identified aggregates only |

### Operational safeguards

- Workforce training on HIPAA
- Incident response plan with 60-day breach notification workflow
- No PHI in logs, error trackers, or Slack alerts (use patient ID references)
- Subprocessor due diligence documented

### What FreedomDesk must never do

- Store PHI in non-BAA-covered tools (e.g., personal email, non-HIPAA Slack)
- Use call recordings for model training without explicit consent and de-identification
- Share patient data across practices

Full technical implementation: [ARCHITECTURE.md](ARCHITECTURE.md#security-and-hipaa).

---

## Business Model

| Tier | Monthly price | Target customer |
|------|---------------|-----------------|
| **FreedomDesk** | $699/location | Standard workflows, structured summaries, emergency triage |
| **FreedomDesk Custom** | $1,299/location | Custom call flows, custom summary fields, custom scheduling rules, deeper PMS integration |

- Setup included in both tiers
- Month-to-month; no long-term contract
- No per-call fees (predictable billing for practices)
- Multi-location discounts (future — not yet implemented)

---

## Success Metrics

### Practice-facing KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Call answer rate | >98% | Calls answered / calls received |
| New patient capture rate | +15–30% vs. baseline | New patient summaries / new patient inquiry calls |
| Average summary completeness | >95% required fields filled | Automated schema validation |
| Emergency routing accuracy | >99% | Audited sample vs. office protocol |
| Patient satisfaction | >4.5/5 | Optional post-call SMS survey |

### Business KPIs

| Metric | Target |
|--------|--------|
| Monthly churn | <3% |
| Time to live (onboarding) | <7 business days |
| Net Promoter Score | >50 |
| Support tickets per practice/month | <2 |

---

## Glossary

| Term | Definition |
|------|------------|
| **PMS** | Practice Management Software (Open Dental, Dentrix, etc.) |
| **PHI** | Protected Health Information under HIPAA |
| **BAA** | Business Associate Agreement |
| **NP** | New patient |
| **EP** | Existing patient |
| **NPE** | New patient exam / comprehensive exam |
| **Prophy** | Prophylaxis (routine cleaning) |
| **SRP** | Scaling and root planing (periodontal treatment) |
| **CDT** | Current Dental Terminology (procedure codes) |
| **EOB** | Explanation of Benefits |
| **PPO** | Preferred Provider Organization (insurance plan type) |
| **HMO / DMO** | Health/Dental Maintenance Organization — restricted provider network |
| **On-call** | Dentist designated for after-hours emergencies |
| **Recall** | System-generated reminder for periodic exam/cleaning |
| **Blockout** | Schedule time blocked for meetings, lunch, or non-patient activity |
| **Operatory** | Treatment room/chair |
| **Write-back** | Creating or updating a record in the PMS from FreedomDesk data |

---

## Related Documents

- [DENTAL_WORKFLOWS.md](DENTAL_WORKFLOWS.md) — operational workflows in dental offices
- [CALL_FLOWS.md](CALL_FLOWS.md) — phone conversation design
- [PRACTICE_MANAGEMENT_SOFTWARE.md](PRACTICE_MANAGEMENT_SOFTWARE.md) — PMS integration reference
- [ARCHITECTURE.md](ARCHITECTURE.md) — technical system design
- [ROADMAP.md](ROADMAP.md) — product delivery phases
