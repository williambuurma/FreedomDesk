# Dental Emergencies — Triage Reference

> **Audience:** FreedomDesk AI — emergency and urgent call handling.  
> **Purpose:** Classify **urgency** and **routing** without clinical diagnosis. Layered on practice-configured protocols.

---

## Absolute Rules

| Never | Always |
|-------|--------|
| Diagnose ("That sounds like an abscess") | Ask symptom questions |
| Prescribe medications or doses | Collect what they've taken (info only) |
| Guarantee same-day appointment | Flag urgency; offer slot if available OR callback |
| Dismiss symptoms | Route per protocol; ER/911 when life-threatening |
| Promise treatment outcome | "Our team will help you figure out next steps" |

---

## Urgency Levels

| Level | Definition | FreedomDesk `urgency` | Typical action |
|-------|------------|----------------------|----------------|
| **Emergency** | Life-threatening or immediate risk | `emergency` | On-call NOW + ER guidance if indicated |
| **Urgent** | Significant pain; risk of worsening; time-sensitive | `urgent` | Same-day / next-day slot or on-call callback ≤1 hr |
| **Priority** | Uncomfortable but stable | `priority` | Schedule within 48–72 hours |
| **Routine** | No acute symptoms | `routine` | Regular scheduling |

---

## Triage Question Set

Ask in natural conversation — not as a checklist interrogation:

1. **Pain now?** "Are you in pain right now? Sharp, throbbing, or constant?"
2. **Onset:** "When did this start?"
3. **Swelling:** "Any swelling in your face or gums?"
4. **Fever / systemic:** "Do you have a fever or feel unwell?"
5. **Trauma:** "Did anything happen — a fall, injury, or biting something hard?"
6. **Bleeding:** "Any bleeding? Can you control it with pressure?"
7. **Medications taken:** "Have you taken anything for the pain?" (collect only — do not recommend)

---

## Scenario Decision Table

| Scenario | Caller example | Urgency | Routing | `sameDayEmergency` |
|----------|----------------|---------|---------|---------------------|
| Severe toothache, no swelling/fever | "Worst pain of my life, lower left" | Urgent | Same-day emergency block / on-call | true |
| Toothache + facial swelling + fever | "My face is swollen and I have a fever" | **Emergency** | On-call + ER if spreading | true |
| Broken tooth, no pain | "Chipped my tooth eating" | Priority | 1–3 days | false |
| Broken tooth with pain | "Broke a tooth and it hurts bad" | Urgent | Same-day | true |
| Knocked-out permanent tooth | "My tooth got knocked out" | **Emergency** | On-call **immediately** — time window | true |
| Knocked-out baby tooth | "My 6-year-old knocked out a tooth" | Priority–Urgent | Same-day eval; do not promise reimplant | varies |
| Lost crown, no pain | "Crown came off, no pain" | Priority | 48–72 hr | false |
| Lost crown with pain | "Crown fell off and it's sensitive" | Urgent | Same/next day | true |
| Lost filling | "Filling fell out" | Priority (no pain) / Urgent (pain) | Per pain | per pain |
| Post-extraction bleeding (controlled) | "Still bleeding a little with gauze" | Urgent | On-call callback | true |
| Post-extraction bleeding (uncontrolled) | "Won't stop bleeding" | **Emergency** | ER or immediate on-call | true |
| Dry socket concern | "Throbbing pain 3 days after extraction" | Urgent | Same/next day | true |
| Abscess (caller word) | "I think I have an abscess" | Urgent–Emergency | Swelling/fever → emergency | per symptoms |
| Orthodontic wire poking | "Braces wire cutting my cheek" | Priority | Next available | false |
| TMJ pain, can open/close | "Jaw aches when I chew" | Priority | Regular schedule | false |
| Jaw locked open/closed | "Can't open my mouth" | **Emergency** | ER or oral surgeon | true |
| Soft tissue trauma (cut lip/tongue) | "Cut my lip in a fall" | Urgent–Emergency | Bleeding controlled? | per bleeding |
| Broken denture | "Denture broke, I have no teeth" | Priority | 48–72 hr; empathy | false |
| Sensitivity only | "Cold sensitivity" | Routine | Regular exam | false |

---

## Avulsion (Knocked-Out Permanent Tooth)

**Time-critical** — reimplant window is roughly 60 minutes. Do not delay with long intake.

**Caller:** "My son's front tooth got knocked out at soccer."

**FreedomDesk:**
1. Stay calm — flag `urgency: emergency` immediately
2. Brief: "Keep the tooth moist — milk or saliva if you have it. I'm flagging our on-call team right now."
3. Collect: name, callback number, child's age
4. Route: on-call dentist **immediately**
5. Do not give detailed medical instructions beyond practice-configured script

---

## After-Hours vs. Business Hours

| Context | Behavior |
|---------|----------|
| **Business hours + urgent** | Query emergency slots OR flag front desk for squeeze-in |
| **After hours + urgent** | On-call callback per rotation; document symptoms |
| **After hours + routine** | Appointment request for next business day |
| **Life-threatening any time** | "Please go to the nearest emergency room or call 911." |

**After-hours script fragment:**
> "I'm flagging this as urgent for our on-call team. Someone will call you back as soon as possible. If you develop severe swelling, fever, or trouble breathing, please seek emergency care right away."

---

## Pain Scale (Caller-Described)

Do not insist on numeric scale. Accept descriptive:

| Caller says | Map to `painLevel` |
|-------------|-------------------|
| "Mild annoyance" | mild |
| "Moderate, comes and goes" | moderate |
| "Bad, keeping me up" | severe |
| "Worst pain ever" / "10 out of 10" | severe |
| "No pain" | none |

---

## What NOT to Do on Emergency Calls

| Caller asks | FreedomDesk response |
|-------------|---------------------|
| "Do I need a root canal?" | "The doctor will need to evaluate that. Let me get you scheduled / connect you with our on-call team." |
| "Can I take ibuprofen?" | "I'm not able to give medical advice on medications. Our on-call team can discuss that when they call." (Unless practice has pre-approved post-op config) |
| "Is this infected?" | "I can't diagnose over the phone, but swelling and fever are important — [triage questions]." |
| "Will you see me today?" | "Let me see what we have" OR "I'm flagging this urgent — our team will call you within [X] minutes." |

---

## Emergency Summary Schema (Required Fields)

```json
{
  "intent": "EMERGENCY",
  "urgency": "urgent | emergency",
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
  },
  "actionItems": [{
    "type": "on_call_callback",
    "assignee": "on_call_dentist",
    "priority": "urgent"
  }]
}
```

---

## West Michigan Context

- Independent GPs often have **one doctor on-call** evenings/weekends — callback may be 15–60 minutes
- Patients may mention **Spectrum Health / Corewell ER** — OK to direct for life-threatening
- Monday mornings and post-holiday weekends = high emergency volume
- Many offices hold **daily emergency blocks** released at 8 AM — see `emergency-scheduling.md`

---

## Related Documents

- `knowledge/scheduling/emergency-scheduling.md`
- `knowledge/dentistry/post-op.md`
- `docs/CALL_FLOWS.md` — Emergency and Same-Day Emergency flows
