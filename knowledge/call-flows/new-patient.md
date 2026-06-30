# New Patient Call Flow — Excerpt

> **Source:** `docs/CALL_FLOWS.md` — New Patient Call Flow  
> **Intent:** `NEW_PATIENT`

## State machine

```
GREET → NEW_PATIENT_INTAKE
  │
  ├── COLLECT_NAME
  ├── COLLECT_PHONE
  ├── COLLECT_DOB (optional Phase 1, required Phase 2)
  ├── COLLECT_INSURANCE
  ├── COLLECT_CHIEF_COMPLAINT
  ├── COLLECT_REFERRAL_SOURCE (optional)
  ├── OFFER_APPOINTMENT
  ├── CONFIRM_APPOINTMENT
  └── CLOSE
```

## Script

```
AGENT: "Thank you for calling [Practice Name]. This is Aly. How can I help you today?"

CALLER: "Hi, I'd like to schedule a new patient exam. I just moved to the area."

AGENT: "We'd love to welcome you. Have you been to our office before?"

CALLER: "No, this would be my first visit."

AGENT: "Perfect. Can I start with your full name?"

CALLER: "[Full Name]"

AGENT: "Thanks, [First Name]. And what's the best phone number to reach you?"

CALLER: "[Phone]"

AGENT: "Great. Do you have dental insurance you'd like us to have on file before your visit?"

CALLER: "[Yes — carrier / No]"

IF YES:
  AGENT: "Perfect. If you have your member ID handy, I can note that too — otherwise, just bring your card to the visit."

AGENT: "For a new patient exam, we set aside about [60 minutes / an hour]. I have [Day] at [Time] or [Day] at [Time] — would either work?"

CALLER: "[Selection]"

AGENT: "You're all set for [Day] at [Time]. We'll send a confirmation text, and if you could arrive about 15 minutes early for your paperwork, that would be great."

CALLER: "Sounds good. Thank you."

AGENT: "We're looking forward to meeting you, [First Name]. Have a wonderful day."
```

## Insurance disambiguation (Michigan)

When caller mentions Delta or state insurance:

> "Is that Delta Dental through your employer, or state insurance like Medicaid or Healthy Kids Dental?"

Classify to program level: `PPO`, `Medicaid`, `HKD`, `Michigan_Medicaid`, `PPO_Other`, or `none`.

## Required summary fields

```json
{
  "intent": "NEW_PATIENT",
  "urgency": "routine",
  "caller": {
    "name": "string",
    "phone": "string",
    "isNewPatient": true,
    "dateOfBirth": "string | null"
  },
  "insurance": {
    "carrier": "string",
    "planType": "PPO | Medicaid | HKD | Michigan_Medicaid | PPO_Other | none",
    "memberId": "string | null",
    "medicaidId": "string | null"
  },
  "chiefComplaint": "string",
  "referralSource": "string | null",
  "appointment": {
    "type": "New Patient Exam",
    "scheduledSlot": "ISO-8601 | null",
    "preferredTimes": ["string"]
  }
}
```

## Rules

| Rule | Detail |
|------|--------|
| Required slots | Name, phone, insurance taxonomy, chief complaint, appointment preference |
| Medicaid/HKD | Schedule only if practice config accepts the program |
| Appointment type | Use `New Patient Exam` — not generic "appointment" |
| Booking mode | Phase 1: appointment **request** unless practice config allows confirmed booking |
| No guarantees | Never promise coverage, fees, or treatment outcomes |
