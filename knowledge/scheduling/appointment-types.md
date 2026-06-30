# Appointment Types — Scheduling Reference

> **Audience:** FreedomDesk scheduling logic and AI agents.  
> **Purpose:** Map intents to **appointment types**, **durations**, **schedule columns**, and **summary fields** for West Michigan GP offices (Open Dental first).

---

## Scheduling Dimensions

Every booking is constrained by:

| Dimension | FreedomDesk handling |
|-----------|---------------------|
| **Appointment type** | Primary classifier — drives duration and column |
| **Provider** | Doctor vs hygienist; caller preference if offered |
| **Operatory** | PMS-managed; not discussed with caller unless needed |
| **Duration** | From practice config — defaults below |
| **Column** | Hygiene vs doctor production |
| **Status** | Request vs confirmed — per `practice_configs.bookingMode` |

---

## Default Duration Table (West Michigan GP)

**Defer to `practice_configs.appointment_types[]`** — these are starting defaults.

| Appointment type | Minutes | Column | Provider |
|------------------|---------|--------|----------|
| NP Exam Comprehensive | 60–90 | Doctor (+ hygiene optional) | GP |
| NP Exam Doctor Only | 45–60 | Doctor | GP |
| Periodic Exam (D0120) | 15–30 | Doctor | GP |
| Prophy Adult (D1110) | 45–60 | Hygiene | Hygienist |
| Child Prophy (D1120) | 30–45 | Hygiene | Hygienist |
| Perio Maintenance (D4910) | 60 | Hygiene | Hygienist |
| SRP (per quadrant) | 60–90 | Hygiene | Hygienist |
| Emergency / Limited Exam | 30–45 | Doctor | GP |
| Crown Prep | 60–90 | Doctor | GP + assistant |
| Crown Seat | 30–45 | Doctor | GP |
| Filling / Restorative | 30–60 | Doctor | GP |
| Extraction Simple | 30–45 | Doctor | GP |
| Extraction Surgical | 45–60 | Doctor | GP |
| Root Canal (start) | 60–90 | Doctor | GP or endo |
| Implant Consult | 30–45 | Doctor | GP |
| Denture Consult | 30–45 | Doctor | GP |
| Denture Impression | 45–60 | Doctor | GP |
| Denture Delivery | 45–60 | Doctor | GP |
| Denture Reline/Repair | 30–60 | Doctor | GP |
| Whitening | 60–90 | Hygiene | Hygienist |
| Infant / knee-to-knee exam | 20–30 | Doctor | GP |

---

## Intent → Appointment Type Routing

| Intent | First question | Resulting type |
|--------|----------------|----------------|
| NEW_PATIENT | Chief complaint? | NP Exam Comprehensive (default) |
| SCHEDULE_EXISTING + "cleaning" | Perio history? | Prophy vs Perio Maint |
| TREATMENT_SCHEDULE + "crown" | Prep done? | Crown Prep vs Crown Seat |
| TREATMENT_SCHEDULE + "filling" | Planned? | Restorative |
| EMERGENCY | After triage | Emergency / Limited Exam |
| PEDIATRIC + cleaning | Age? | Child Prophy vs Adult Prophy |
| WAITLIST | Appt type? | Preserve specific type |

---

## Hygiene vs Doctor Column

| Book in hygiene column | Book in doctor column |
|------------------------|----------------------|
| Prophy, child prophy | Crown prep/seat |
| Perio maintenance | Fillings, extractions |
| SRP | Emergency exams |
| Whitening (often) | RCT, implant consult |
| — | NP comprehensive (if doctor-only workflow) |

**Combined visits:** Some offices attach doctor exam to hygiene block. FreedomDesk follows `practice_configs.hygieneExamAttached: true/false`.

---

## New Patient Exam Variants

Grand Rapids offices differ:

| Model | Scheduling | FreedomDesk notes |
|-------|------------|-------------------|
| **All-in-one** | 60–90 min doctor + cleaning same visit | Default for many GPs |
| **Doctor first** | NPE doctor only; hygiene scheduled separately | Longer doctor block; note "hygiene separate" |
| **Hygiene first** | Rare — cleaning then exam | Flag if practice config |

**Caller:** "I need a cleaning — I'm new."  
**Action:** New patient exam path, not prophy — new patients need chart, X-rays, exam.

---

## Appointment Request vs Confirmed

| Mode | When | Summary `appointment.status` |
|------|------|------------------------------|
| **Request** (default) | Phase 1; new customers; after-hours | `request` — front desk confirms in OD |
| **Confirmed** | PMS integration validated | `scheduled` — with `pmsAppointmentId` |

After-hours scheduling always uses **request** unless practice explicitly enables auto-confirm.

---

## Slot Presentation Rules

1. Offer **2–3 options** — different days or times
2. Respect `practice_configs.schedulingRules` (e.g., no new patients Friday PM)
3. If no slots: next available date + waitlist offer
4. Never invent times — template slots or PMS `/appointments/Slots` only

**Script:**
> "For a new patient exam we set aside about an hour. I have Tuesday at 9 AM or Thursday at 2 PM — would either work?"

---

## Summary: Appointment Object

```json
{
  "appointment": {
    "type": "Crown Seat",
    "durationMinutes": 40,
    "column": "doctor",
    "provider": "Dr. Van Der Berg",
    "scheduledSlot": "2026-07-10T14:00:00",
    "status": "request | scheduled",
    "tooth": "14",
    "toothArea": "upper right back",
    "notes": "Temporary still on; no pain"
  }
}
```

---

## Common Misbooking Prevention

| Mistake | Prevention |
|---------|------------|
| Crown seat booked as "exam" | Always ask prep vs seat |
| New patient booked as prophy | "Have you been here before?" |
| Emergency in hygiene column | Emergency types → doctor only |
| RCT scheduled when practice refers out | Check `rootCanalInHouse` |
| Medicaid patient in non-Medicaid block | Check `medicaidSchedulingDays` config |

---

## Open Dental Integration Notes

- Appointment types from `GET /appointmenttypes`
- Slots from `GET /appointments/Slots?dateStart&dateEnd&ProvNum&OpNum`
- Pattern strings (`//XXXX//`) translate duration — adapter handles
- Create via `POST /appointments` with `ProcDescript` matching type

See `knowledge/software/open-dental.md`.

---

## Related Documents

- `knowledge/scheduling/hygiene-and-recall.md`
- `knowledge/scheduling/emergency-scheduling.md`
- `knowledge/dentistry/procedures.md`
