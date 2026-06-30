# Emergency Scheduling — Same-Day and Urgent Slots

> **Audience:** FreedomDesk AI and scheduling engineers.  
> **Purpose:** Handle **same-day squeeze-ins**, emergency blocks, and urgent routing for West Michigan GP offices.

---

## When Same-Day Applies

| Trigger | `sameDayEmergency` | Slot type |
|---------|-------------------|-----------|
| Severe pain | true | Emergency / Limited Exam |
| Broken tooth + pain | true | Emergency |
| Trauma | true | Emergency |
| Swelling (no fever) | true | Emergency |
| Lost temp crown + pain | true | Emergency or crown eval |
| Post-op uncontrolled bleeding | true | On-call + ER if needed |
| Broken tooth, no pain | false | Priority — next 1–3 days |
| Lost crown, no pain | false | Priority |

Triage first (`knowledge/dentistry/emergencies.md`), then schedule.

---

## Business Hours Same-Day Flow

```
Triage → urgency = urgent | emergency
        │
        ├── Query PMS emergency slots (Tier 3)
        │         OR practice emergency template slots
        │
        ├── Slot found
        │     └── Offer time → collect demographics → confirm
        │
        └── No slot
              └── "I'm flagging this urgent — our team will call within [X] minutes"
                    + actionItem: front_desk | on_call_dentist
```

**Never** say schedule is full without flagging urgency.

**Script (slot available):**
> "I'm sorry you're dealing with that. We can see you today at 3:30 PM. Can I get your name and date of birth?"

**Script (no slot):**
> "I'm flagging this as urgent for our team. Someone will call you back within thirty minutes to work you in."

---

## Emergency Blocks (Open Dental Pattern)

Many West Michigan GPs maintain **reserved emergency time**:

| Pattern | Description |
|---------|-------------|
| **Daily hold** | 30–45 min doctor block 1–2× daily, not released until 8 AM |
| **Floating squeeze-in** | No formal block — front desk fits between patients |
| **Released at open** | Emergency slot opens when morning huddle completes |

FreedomDesk Phase 2+: query via `GET /appointments/Slots` with emergency appointment type.  
Phase 1: flag `sameDayEmergency: true` — front desk squeezes in.

### Config keys

```json
{
  "emergencyScheduling": {
    "enabled": true,
    "appointmentTypeId": "emerg",
    "callbackPromiseMinutes": 30,
    "dailyBlocks": 2,
    "allowNewPatients": true
  }
}
```

---

## New Patient Emergency

Emergencies from **new patients** happen often (tourists, new to Grand Rapids, no established dentist).

| Step | Action |
|------|--------|
| Triage | Full emergency questions |
| Intake | Name, phone, DOB minimum |
| Insurance | Quick taxonomy — may verify later |
| Book | Emergency slot OR urgent callback |
| Summary | `isNewPatient: true`, `sameDayEmergency: true` |

Do not require full new patient intake before urgent routing — collect minimum, complete later.

---

## After-Hours Emergency Scheduling

| Capability | Behavior |
|------------|----------|
| No live scheduling | On-call callback only |
| Appointment request | Collect preferred times for next business day **in addition** to urgent flag |
| Life-threatening | ER/911 first |

**Do not** confirm "you're on the schedule tomorrow" as guaranteed — use appointment **request** language after hours.

---

## Operatory and Provider Rules

| Rule | Rationale |
|------|-----------|
| Emergency → **doctor column** | Hygienists do not treat acute emergencies |
| May use any doctor operatory | Front desk assigns |
| Duration 30–45 min default | Extensible if extraction likely |

---

## Interaction with On-Call Rotation

Independent 1–3 doctor offices rotate on-call:

| Config | Purpose |
|--------|---------|
| `onCall.schedule` | Weekly rotation |
| `onCall.contactMethod` | SMS + email to FreedomDesk summary |
| `onCall.responseSLA` | "30 minutes" promised to caller |

**Summary must include** `actionItems[].assignee: "on_call_dentist"` with symptoms in notes.

---

## Monday and Post-Holiday Surge

Expect higher same-day volume:

- Offices may exhaust emergency blocks by 10 AM
- FreedomDesk should still flag urgent — never turn away without staff review
- Waitlist for emergency callback queue if configured

---

## Caller Examples

**Caller:** "Can someone see me today? I cracked a tooth this morning and it hurts."  
→ Urgent → query slots → book OR callback flag.

**Caller:** "I'm a patient of yours — pain since yesterday, getting worse."  
→ Identify patient → urgent → same-day.

**Caller:** "I'm not your patient but I'm in town and my crown fell off."  
→ New patient emergency → minimum intake → same-day if policy allows (`allowNewPatients: true`).

---

## Summary Fields

```json
{
  "intent": "SAME_DAY_EMERGENCY",
  "urgency": "urgent",
  "sameDayEmergency": true,
  "appointment": {
    "type": "Emergency",
    "scheduledSlot": "2026-06-30T15:30:00",
    "status": "scheduled | request"
  },
  "emergency": {
    "symptoms": ["cracked tooth", "pain"],
    "routingAction": "same_day_slot"
  }
}
```

---

## Related Documents

- `knowledge/dentistry/emergencies.md`
- `knowledge/scheduling/appointment-types.md`
- `knowledge/software/open-dental.md` — Slots endpoint
