# Summarization — FreedomDesk Reference

> **Audience:** Engineers building summary schemas, email templates, and PMS write-back.  
> **Purpose:** Every call produces **structured, PMS-ready output** — not paragraphs the front desk must re-type.

---

## Design Principle

> If FreedomDesk collected it on the phone, the front desk should not ask again.

Every field should map to:

- Open Dental comm log line
- Appointment book entry
- Task/tickler
- Insurance verification queue

Prefer **structured JSON** over narrative. Narrative is optional supplement.

---

## Base Schema (All Calls)

```json
{
  "$schema": "https://freedomdesk.com/schemas/call-summary/v1",
  "id": "uuid",
  "practiceId": "uuid",
  "callId": "uuid",
  "timestamp": "ISO-8601",
  "durationSeconds": 120,
  "intent": "NEW_PATIENT | SCHEDULE_EXISTING | TREATMENT_SCHEDULE | PEDIATRIC | RESCHEDULE | CANCEL | CONFIRM | EMERGENCY | SAME_DAY_EMERGENCY | INSURANCE | DEMOGRAPHICS_UPDATE | WAITLIST | BILLING | GENERAL_INFO | OTHER",
  "urgency": "routine | priority | urgent | emergency",
  "caller": {
    "name": "string",
    "phone": "+16165550142",
    "isNewPatient": true,
    "dateOfBirth": "YYYY-MM-DD | null",
    "email": "string | null",
    "pmsPatientId": "string | null"
  },
  "actionItems": [
    {
      "type": "schedule_appointment | on_call_callback | billing_callback | verify_insurance | pms_update | confirm_appointment",
      "assignee": "front_desk | on_call_dentist | billing | office_manager",
      "priority": "routine | urgent | emergency",
      "notes": "string"
    }
  ],
  "deliveryStatus": "pending | delivered | failed"
}
```

---

## Required Fields by Intent

| Intent | Must include |
|--------|--------------|
| **NEW_PATIENT** | name, phone, DOB, insurance taxonomy, chief complaint, appointment preference |
| **SCHEDULE_EXISTING** | name, DOB, `appointment.type`, slot or preference |
| **TREATMENT_SCHEDULE** | `appointment.type` (crown seat, RCT, extraction, etc.) — not generic "appointment" |
| **PEDIATRIC** | child name/DOB, guardian, HKD/Medicaid ID if applicable |
| **EMERGENCY** | symptoms, swelling/fever, urgency, `sameDayEmergency` if applicable, routing |
| **WAITLIST** | `appointmentType`, flexibility |
| **DEMOGRAPHICS_UPDATE** | `updates` object with fields to change |
| **INSURANCE** | question summary + carrier if collected |
| **BILLING** | question summary — no balance |
| **CANCEL** | appointment being cancelled, `lateCancellation` if applicable |
| **RESCHEDULE** | old slot + new slot or preferences |

Validation target: **>95% completeness** on required fields.

---

## Intent Extensions

### New patient

```json
{
  "intent": "NEW_PATIENT",
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "PPO",
    "memberId": "string | null",
    "medicaidId": null
  },
  "chiefComplaint": "New patient exam — new to Grand Rapids",
  "referralSource": "Google",
  "appointment": {
    "type": "New Patient Exam",
    "durationMinutes": 60,
    "scheduledSlot": "2026-07-03T09:00:00",
    "status": "request | scheduled"
  }
}
```

### Treatment schedule

```json
{
  "intent": "TREATMENT_SCHEDULE",
  "appointment": {
    "type": "Crown Seat",
    "tooth": "14",
    "toothArea": "upper right back",
    "provider": "Dr. Van Der Berg",
    "scheduledSlot": "2026-07-10T14:00:00",
    "status": "scheduled",
    "notes": "Temporary in place, no pain"
  }
}
```

### Emergency

```json
{
  "intent": "EMERGENCY",
  "urgency": "urgent",
  "sameDayEmergency": true,
  "emergency": {
    "symptoms": ["sharp pain", "lower left"],
    "swelling": false,
    "fever": false,
    "trauma": false,
    "bleeding": false,
    "painLevel": "severe",
    "duration": "since last night, worsening",
    "routingAction": "on_call_callback | same_day_slot | er_referral"
  }
}
```

### Demographics update

```json
{
  "intent": "DEMOGRAPHICS_UPDATE",
  "updates": {
    "phone": "+16165550199",
    "insurance": {
      "carrier": "Delta Dental",
      "planType": "PPO",
      "memberId": "XXX"
    }
  }
}
```

### Waitlist

```json
{
  "intent": "WAITLIST",
  "waitlist": {
    "appointmentType": "Prophy",
    "flexibility": "mornings only",
    "notes": "Hoping for sooner than March 15"
  }
}
```

### Pediatric

```json
{
  "intent": "PEDIATRIC",
  "patientIsMinor": true,
  "guardianName": "Maria Kowalski",
  "patient": {
    "name": "Sofia Kowalski",
    "dateOfBirth": "2016-04-12"
  },
  "insurance": {
    "planType": "HKD",
    "medicaidId": "1234567890"
  }
}
```

---

## Insurance Taxonomy in Summaries

Always use canonical `planType`:

| Value | Meaning |
|-------|---------|
| `PPO` | Delta Dental PPO |
| `Medicaid` | Delta Dental Medicaid |
| `HKD` | Healthy Kids Dental |
| `Michigan_Medicaid` | Adult Michigan Medicaid |
| `PPO_Other` | BCBS, Cigna, MetLife, etc. |
| `none` | Cash-pay |

**Never** summarize as `"insurance": "Delta"` without plan type.

---

## Human-Readable Email Format

Staff-facing email supplements JSON:

```
Subject: [FreedomDesk] New Patient — Finn Leo — Jul 3 at 9 AM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FREEDOMDESK CALL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type:        New Patient Exam
Urgency:     Routine
Duration:    2m 50s

CALLER
  Name:      Finn Leo
  Phone:     (616) 555-0142
  DOB:       01/15/1990
  New Patient: Yes

INSURANCE
  Carrier:   Delta Dental PPO
  Member ID: (bring card)

APPOINTMENT
  Type:      New Patient Exam (60 min)
  Time:      Thu Jul 3, 2026 at 9:00 AM
  Status:    Request — confirm in OD

ACTION NEEDED
  □ Confirm appointment in Open Dental
  □ Send new patient forms
  □ Verify insurance eligibility

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Urgent emails: subject prefix `[URGENT]` + SMS to on-call.

---

## Open Dental Comm Log Mapping

Single paste-friendly block for `POST /commlogs`:

```
FreedomDesk | NEW_PATIENT | Routine
Caller: Finn Leo | (616) 555-0142 | DOB 1/15/1990 | New patient
Insurance: Delta Dental PPO | Member ID: pending card
Appt: NP Exam | Thu 7/3/26 9:00 AM | REQUEST
Chief complaint: New to area, wants comprehensive exam
Referral: Google
Actions: Confirm OD, send forms, verify ins
```

Keep under practice note length limits; truncate with link to full record if needed.

---

## Action Item Types

| type | assignee | When |
|------|----------|------|
| `schedule_appointment` | front_desk | Request mode booking |
| `confirm_appointment` | front_desk | After-hours request |
| `on_call_callback` | on_call_dentist | Urgent/emergency after hours |
| `verify_insurance` | front_desk | New/changed insurance |
| `billing_callback` | billing | Balance, EOB questions |
| `pms_update` | front_desk | Demographics change |
| `send_forms` | front_desk | New patient |
| `waitlist_add` | front_desk | Waitlist request |

---

## Partial and Failed Calls

| Scenario | Summary behavior |
|----------|------------------|
| Caller hung up mid-intake | Partial summary + `completeness: incomplete` |
| Required field missing | Flag validation failure; still deliver what was collected |
| PMS write failed | Email delivery + retry queue |

---

## Anti-Patterns in Summaries

| Bad summary | Good summary |
|-------------|--------------|
| "Caller wants appointment" | `appointment.type: Crown Seat`, tooth #14 |
| "Has Delta" | `Delta Dental PPO`, member ID |
| "Tooth pain" | `symptoms: [sharp LL pain]`, `urgency: urgent`, `sameDayEmergency: true` |
| Paragraph story | Structured fields + optional one-line narrative |

---

## Delivery Channels

| Channel | Content |
|---------|---------|
| Email | Full formatted summary |
| Webhook | JSON to practice systems |
| PMS comm log | Tier 2 write-back |
| SMS (on-call) | Urgent abbreviated: name, phone, symptoms |

On-call SMS example:

```
URGENT FD: Finn Leo (616)555-0198 — Severe LL toothache since last night. No swelling/fever. Callback ASAP.
```

No PHI in engineering logs — use `callId` references.

---

## Related Documents

- `docs/CALL_FLOWS.md` — Summary Schemas section
- `knowledge/office/front-desk-workflows.md`
- `knowledge/software/open-dental.md`
- `docs/ARCHITECTURE.md`
