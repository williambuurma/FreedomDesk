# Call Summary Templates — FreedomDesk Reference

> **Audience:** FreedomDesk engineers, prompt engineers, and AI agents.  
> **Purpose:** Production-ready **summary schemas and comm-log templates** per call type — what Aly collects on the phone and what the front desk receives.  
> **Scope:** Intent-specific examples and templates. Canonical base schema in `knowledge/ai/summarization.md`.  
> **Validation target:** >95% completeness on required fields per intent.

---

## Summary Design Rules

1. **Structured JSON is authoritative** — email/comm log renders from JSON
2. **Every field maps to front desk action** — Open Dental comm log, task, or verification queue
3. **Insurance always includes `planType`** — never bare carrier name
4. **Appointment type is precise** — Crown Seat ≠ Exam ≠ Prophy
5. **Urgency always set** — default `routine` if non-emergency
6. **`verified: false`** on all phone insurance intake

---

## Base Schema (All Calls)

```json
{
  "$schema": "https://freedomdesk.com/schemas/call-summary/v1",
  "id": "uuid",
  "practiceId": "uuid",
  "callId": "uuid",
  "timestamp": "ISO-8601",
  "durationSeconds": 0,
  "intent": "NEW_PATIENT | SCHEDULE_EXISTING | TREATMENT_SCHEDULE | PEDIATRIC | RESCHEDULE | CANCEL | CONFIRM | EMERGENCY | SAME_DAY_EMERGENCY | INSURANCE | DEMOGRAPHICS_UPDATE | WAITLIST | BILLING | GENERAL_INFO | OTHER",
  "urgency": "routine | priority | urgent | emergency",
  "caller": {
    "name": "string",
    "phone": "+16165550142",
    "isNewPatient": false,
    "dateOfBirth": "YYYY-MM-DD | null",
    "email": "string | null",
    "pmsPatientId": "string | null"
  },
  "actionItems": [],
  "completeness": "complete | incomplete",
  "deliveryStatus": "pending | delivered | failed"
}
```

---

## Template: New Patient Exam

### Aly collects

| Field | Required |
|-------|----------|
| Full legal name | ✅ |
| Phone | ✅ |
| DOB | ✅ |
| Email | Preferred |
| Insurance (Michigan taxonomy) | ✅ |
| Member ID / Medicaid ID | If insured |
| Chief complaint | ✅ |
| Referral source | Preferred |
| Preferred appointment times | ✅ |

### JSON

```json
{
  "intent": "NEW_PATIENT",
  "urgency": "routine",
  "caller": {
    "name": "Finn Leo",
    "phone": "+16165550142",
    "isNewPatient": true,
    "dateOfBirth": "1990-01-15",
    "email": "finn@example.com"
  },
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "PPO",
    "memberId": null,
    "medicaidId": null,
    "verified": false
  },
  "chiefComplaint": "New patient exam — new to Grand Rapids",
  "referralSource": "Google",
  "appointment": {
    "type": "New Patient Exam Comprehensive",
    "likelyCdtCodes": ["D0150"],
    "durationMinutes": 60,
    "column": "doctor",
    "scheduledSlot": "2026-07-03T09:00:00",
    "status": "request"
  },
  "actionItems": [
    { "type": "confirm_appointment", "assignee": "front_desk", "priority": "routine" },
    { "type": "verify_insurance", "assignee": "front_desk", "priority": "routine" },
    { "type": "send_forms", "assignee": "front_desk", "priority": "routine" }
  ]
}
```

### Comm log

```
FreedomDesk | NEW_PATIENT | Routine
Caller: Finn Leo | (616) 555-0142 | DOB 1/15/1990 | New patient
Insurance: Delta Dental PPO | Member ID: bring card | VERIFY
Appt: NP Exam Comprehensive | Thu 7/3/26 9:00 AM | REQUEST
Chief complaint: New to Grand Rapids
Referral: Google
Actions: Confirm OD, verify ins, send forms
```

---

## Template: Hygiene Recall (Prophy)

### Aly collects

| Field | Required |
|-------|----------|
| Name + DOB | ✅ |
| Insurance change? | Ask always |
| Prophy vs perio maint | Best effort |
| Hygienist preference | Optional |

### JSON

```json
{
  "intent": "SCHEDULE_EXISTING",
  "urgency": "routine",
  "caller": {
    "name": "Maria Kowalski",
    "phone": "+16165550199",
    "isNewPatient": false,
    "dateOfBirth": "1985-03-22"
  },
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "PPO",
    "verified": false,
    "changed": false
  },
  "appointment": {
    "type": "Prophy — Adult",
    "likelyCdtCodes": ["D1110", "D0120"],
    "durationMinutes": 60,
    "column": "hygiene",
    "scheduledSlot": "2026-07-08T10:00:00",
    "status": "scheduled"
  },
  "actionItems": [
    { "type": "confirm_appointment", "assignee": "front_desk", "priority": "routine" }
  ]
}
```

---

## Template: Emergency / Limited Exam

### Aly collects

| Field | Required |
|-------|----------|
| Name + phone | ✅ |
| DOB (if existing/new) | ✅ when scheduling |
| Symptom description | ✅ |
| Pain level (caller-described) | ✅ |
| Swelling, fever, trauma, bleeding | ✅ |
| Red flags → ER advised | If applicable |
| Onset / duration | ✅ |

### JSON — severe toothache

```json
{
  "intent": "EMERGENCY",
  "urgency": "urgent",
  "sameDayEmergency": true,
  "caller": {
    "name": "James Porter",
    "phone": "+16165550198",
    "isNewPatient": false,
    "dateOfBirth": "1978-11-04"
  },
  "emergency": {
    "symptoms": ["severe throbbing pain", "lower left"],
    "swelling": false,
    "fever": false,
    "trauma": false,
    "bleeding": false,
    "painLevel": "severe",
    "duration": "since last night, worsening",
    "redFlags": [],
    "routingAction": "same_day_slot",
    "erAdvised": false
  },
  "appointment": {
    "type": "Emergency / Limited Exam",
    "likelyCdtCodes": ["D0140"],
    "durationMinutes": 30,
    "column": "doctor",
    "scheduledSlot": "2026-06-30T15:30:00",
    "status": "request"
  },
  "actionItems": [
    {
      "type": "schedule_appointment",
      "assignee": "front_desk",
      "priority": "urgent",
      "notes": "Severe LL pain since last night. No swelling/fever. Squeeze-in requested."
    }
  ]
}
```

### JSON — swelling + fever (ER advised)

```json
{
  "intent": "EMERGENCY",
  "urgency": "emergency",
  "sameDayEmergency": true,
  "emergency": {
    "symptoms": ["facial swelling", "fever", "dental pain"],
    "swelling": true,
    "fever": true,
    "painLevel": "severe",
    "redFlags": ["facial_swelling", "fever", "systemic_illness"],
    "routingAction": "er_referral",
    "erAdvised": true
  },
  "actionItems": [
    {
      "type": "on_call_callback",
      "assignee": "on_call_dentist",
      "priority": "emergency",
      "notes": "Facial swelling + fever. ER advised per protocol. Callback when safe."
    }
  ]
}
```

### Comm log — urgent

```
FreedomDesk | EMERGENCY | URGENT
Caller: James Porter | (616) 555-0198 | DOB 11/4/1978 | Existing patient
Symptoms: Severe throbbing LL pain since last night, worsening
Swelling: No | Fever: No | Trauma: No | Bleeding: No
Appt: Limited Exam D0140 | Today 3:30 PM | REQUEST | sameDayEmergency
Actions: Squeeze-in / confirm emerg block
```

---

## Template: Broken Tooth

```json
{
  "intent": "EMERGENCY",
  "urgency": "urgent",
  "sameDayEmergency": true,
  "emergency": {
    "symptoms": ["broken tooth", "pain with chewing"],
    "swelling": false,
    "fever": false,
    "trauma": true,
    "painLevel": "moderate",
    "duration": "today, bit hard food"
  },
  "appointment": {
    "type": "Emergency / Limited Exam",
    "likelyCdtCodes": ["D0140"],
    "toothArea": "upper right",
    "status": "request"
  }
}
```

---

## Template: Post-Op / Dry Socket Concern

```json
{
  "intent": "EMERGENCY",
  "subIntent": "post_op_concern",
  "urgency": "urgent",
  "sameDayEmergency": true,
  "caller": {
    "name": "Lisa Chen",
    "phone": "+16165550177",
    "dateOfBirth": "1992-06-18"
  },
  "postOp": {
    "procedureType": "extraction",
    "daysSinceProcedure": 4,
    "symptoms": ["worsening throbbing pain", "no bleeding"],
    "swelling": false,
    "fever": false,
    "bleeding": "none"
  },
  "emergency": {
    "painLevel": "severe",
    "routingAction": "on_call_callback"
  },
  "actionItems": [{
    "type": "on_call_callback",
    "assignee": "on_call_dentist",
    "priority": "urgent",
    "notes": "Day 4 post-extraction, worsening pain. Dry socket concern — eval needed. NO antibiotic advice given."
  }]
}
```

---

## Template: Antibiotic / Prescription Request

```json
{
  "intent": "OTHER",
  "subIntent": "prescription_request",
  "urgency": "routine",
  "caller": {
    "name": "Robert Hayes",
    "phone": "+16165550155",
    "dateOfBirth": "1970-09-30"
  },
  "prescription": {
    "medicationName": "Amoxicillin",
    "requestType": "refill | new_question | unfilled_rx",
    "callerQuestion": "Do I still need to take the antibiotic?"
  },
  "pharmacy": {
    "name": "Meijer Pharmacy — Alpine Ave",
    "location": "Grand Rapids, MI"
  },
  "actionItems": [{
    "type": "general_callback",
    "assignee": "on_call_dentist",
    "priority": "routine",
    "notes": "Antibiotic question — routed to dentist. No clinical advice provided on call."
  }]
}
```

---

## Template: Crown Seat

```json
{
  "intent": "TREATMENT_SCHEDULE",
  "urgency": "routine",
  "caller": {
    "name": "Sarah Van Der Berg",
    "dateOfBirth": "1988-02-14"
  },
  "appointment": {
    "type": "Crown Seat",
    "likelyCdtCodes": ["D2740"],
    "durationMinutes": 40,
    "column": "doctor",
    "tooth": "14",
    "toothArea": "upper right back",
    "scheduledSlot": "2026-07-10T14:00:00",
    "status": "scheduled",
    "notes": "Temporary in place, no pain"
  }
}
```

---

## Template: Crown Prep

```json
{
  "intent": "TREATMENT_SCHEDULE",
  "appointment": {
    "type": "Crown Prep",
    "likelyCdtCodes": ["D2740", "D2950"],
    "durationMinutes": 90,
    "column": "doctor",
    "tooth": "3",
    "status": "request",
    "notes": "Treatment planned — verify TP in OD"
  },
  "actionItems": [
    { "type": "schedule_appointment", "assignee": "front_desk", "priority": "routine", "notes": "Match to treatment plan" }
  ]
}
```

---

## Template: Root Canal (In-House)

```json
{
  "intent": "TREATMENT_SCHEDULE",
  "urgency": "urgent",
  "appointment": {
    "type": "Root Canal — Consult/Start",
    "likelyCdtCodes": ["D3320"],
    "durationMinutes": 90,
    "column": "doctor",
    "tooth": "12",
    "toothArea": "upper left front",
    "status": "request",
    "notes": "RCT recommended; patient reports active pain"
  },
  "emergency": {
    "painLevel": "moderate",
    "symptoms": ["pain with biting"]
  }
}
```

---

## Template: Root Canal (Referral)

```json
{
  "intent": "TREATMENT_SCHEDULE",
  "urgency": "urgent",
  "appointment": {
    "type": "Root Canal — Referral Pending",
    "tooth": "19",
    "toothArea": "lower left molar",
    "status": "referral_request"
  },
  "referral": {
    "needed": true,
    "specialty": "endodontics",
    "reason": "Molar RCT — practice refers molars",
    "urgency": "urgent"
  },
  "actionItems": [{
    "type": "general_callback",
    "assignee": "front_desk",
    "priority": "urgent",
    "notes": "Prepare endo referral — patient in pain"
  }]
}
```

---

## Template: Extraction

```json
{
  "intent": "TREATMENT_SCHEDULE",
  "urgency": "routine",
  "medicalFlags": ["blood_thinners"],
  "appointment": {
    "type": "Extraction — Simple",
    "likelyCdtCodes": ["D7140"],
    "durationMinutes": 45,
    "column": "doctor",
    "tooth": "32",
    "status": "scheduled",
    "notes": "Patient on blood thinners — clinical review required"
  }
}
```

---

## Template: Implant Consult

```json
{
  "intent": "TREATMENT_SCHEDULE",
  "urgency": "routine",
  "chiefComplaint": "Missing tooth — interested in implant",
  "appointment": {
    "type": "Implant Consult",
    "durationMinutes": 45,
    "column": "doctor",
    "scheduledSlot": "2026-07-15T09:00:00",
    "status": "request"
  }
}
```

---

## Template: Denture (by Stage)

```json
{
  "intent": "TREATMENT_SCHEDULE",
  "urgency": "priority",
  "dentureStage": "repair",
  "chiefComplaint": "Lower denture cracked in half",
  "appointment": {
    "type": "Denture Repair",
    "likelyCdtCodes": ["D5510"],
    "durationMinutes": 30,
    "column": "doctor",
    "status": "request",
    "notes": "Patient has no spare set"
  }
}
```

---

## Template: Pediatric / HKD

```json
{
  "intent": "PEDIATRIC",
  "urgency": "routine",
  "patientIsMinor": true,
  "guardianName": "Maria Kowalski",
  "caller": {
    "name": "Maria Kowalski",
    "phone": "+16165550142",
    "relationship": "parent"
  },
  "patient": {
    "name": "Sofia Kowalski",
    "dateOfBirth": "2016-04-12"
  },
  "insurance": {
    "program": "HKD",
    "planType": "HKD",
    "carrier": "Delta Dental",
    "medicaidId": "1234567890",
    "verified": false
  },
  "appointment": {
    "type": "Child Prophy",
    "likelyCdtCodes": ["D1120", "D0120"],
    "durationMinutes": 45,
    "column": "hygiene",
    "status": "request"
  },
  "actionItems": [
    { "type": "verify_insurance", "assignee": "front_desk", "priority": "routine", "notes": "Verify HKD eligibility" }
  ]
}
```

---

## Template: Michigan Medicaid Adult

```json
{
  "intent": "NEW_PATIENT",
  "urgency": "routine",
  "insurance": {
    "carrier": "Michigan Medicaid",
    "planType": "Michigan_Medicaid",
    "medicaidId": "9876543210",
    "mco": "Meridian",
    "verified": false
  },
  "appointment": {
    "type": "New Patient Exam Comprehensive",
    "status": "request"
  },
  "actionItems": [
    { "type": "verify_insurance", "assignee": "front_desk", "priority": "routine", "notes": "Verify adult Medicaid eligibility + MCO" }
  ]
}
```

---

## Template: Waitlist

```json
{
  "intent": "WAITLIST",
  "urgency": "routine",
  "waitlist": {
    "appointmentType": "Prophy — Adult",
    "flexibility": "mornings only",
    "notes": "Hoping for sooner than March 15 appointment"
  },
  "actionItems": [
    { "type": "waitlist_add", "assignee": "front_desk", "priority": "routine" }
  ]
}
```

---

## Template: Demographics / Insurance Update

```json
{
  "intent": "DEMOGRAPHICS_UPDATE",
  "updates": {
    "phone": "+16165550199",
    "insurance": {
      "carrier": "BCBS Michigan",
      "planType": "PPO_Other",
      "memberId": "XYZ123",
      "effectiveDate": "2026-01-01"
    }
  },
  "actionItems": [
    { "type": "pms_update", "assignee": "front_desk", "priority": "routine" },
    { "type": "verify_insurance", "assignee": "front_desk", "priority": "routine" }
  ]
}
```

---

## Email Subject Lines

| Intent | Subject pattern |
|--------|----------------|
| New patient | `[FreedomDesk] New Patient — {Name} — {ApptDate}` |
| Emergency urgent | `[URGENT] [FreedomDesk] Emergency — {Name} — {SymptomShort}` |
| Emergency routine priority | `[FreedomDesk] Priority — {Name} — {ApptType}` |
| Treatment | `[FreedomDesk] {ApptType} — {Name} — {Date}` |
| Prescription | `[FreedomDesk] Rx Request — {Name}` |
| Billing | `[FreedomDesk] Billing Callback — {Name}` |

---

## On-Call SMS (Abbreviated)

```
URGENT FD: {Name} ({Phone}) — {OneLineSymptoms}. {RoutingAction}. Callback ASAP.
```

Example:
```
URGENT FD: James Porter (616)555-0198 — Severe LL toothache since last night. No swelling/fever. Same-day limited exam requested.
```

No clinical diagnoses in SMS.

---

## Required Field Checklist by Intent

| Intent | Must include |
|--------|--------------|
| NEW_PATIENT | name, phone, DOB, insurance.planType, chief complaint, appointment.type |
| SCHEDULE_EXISTING | name, DOB, appointment.type |
| TREATMENT_SCHEDULE | appointment.type (specific), name, DOB |
| PEDIATRIC | child name/DOB, guardian, insurance.planType |
| EMERGENCY | symptoms, swelling/fever flags, urgency, routingAction |
| SAME_DAY_EMERGENCY | above + sameDayEmergency: true |
| WAITLIST | appointmentType, flexibility |
| DEMOGRAPHICS_UPDATE | updates object |
| Prescription/Rx | medication if known, pharmacy, route to dentist |

---

## Anti-Patterns

| Bad | Good |
|-----|------|
| `"insurance": "Delta"` | `"carrier": "Delta Dental", "planType": "PPO"` |
| `"appointment": "cleaning"` | `"type": "Prophy — Adult", "likelyCdtCodes": ["D1110"]` |
| `"notes": "Patient has tooth pain"` | Structured `emergency.symptoms[]`, `painLevel`, `urgency` |
| Diagnosis in summary | Caller-reported symptoms only |
| "Antibiotic recommended" | "Routed to dentist — no clinical advice on call" |

---

## Related Documents

- `knowledge/ai/summarization.md`
- `knowledge/procedures/follow-up-question-trees.md`
- `knowledge/procedures/appointment-code-map.md`
- `docs/CALL_FLOWS.md` — Summary Schemas
