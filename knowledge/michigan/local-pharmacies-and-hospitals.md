# Local Pharmacies and Hospitals — FreedomDesk Reference

> **Audience:** FreedomDesk AI handling prescription routing, pharmacy questions, and ER/urgent care escalation.  
> **Purpose:** Guide Aly on how to discuss local pharmacies and hospitals in West Michigan — as **practice-configurable data**, not hard-coded universal truth.  
> **Guardrails:** Never prescribe. Never call pharmacies to authorize refills. ER/hospital names come from practice config unless caller asks for general guidance.

---

## Core Principle

Pharmacy and hospital information varies by:

- Practice location (Grand Rapids city vs suburbs vs Holland)
- Patient home address
- Practice preferred pharmacy partnerships
- On-call dentist preferences
- Insurance network (for hospital referral — medical, not dental billing)

**FreedomDesk loads authoritative lists from `practice_config`.** Regional examples below illustrate Grand Rapids patterns for onboarding — Aly must use configured values at runtime.

---

## Configuration Schema

```json
{
  "practice_config": {
    "pharmacies": {
      "preferred": [
        {
          "name": "Example Pharmacy — 28th Street",
          "address": "1234 28th St SE, Grand Rapids, MI",
          "phone": "+16165550100",
          "notes": "Most common for our patients"
        }
      ],
      "acceptPatientChoice": true
    },
    "hospitals": {
      "erGuidance": [
        {
          "name": "Example Hospital — Butterworth",
          "address": "100 Example Pl NE, Grand Rapids, MI",
          "phone": "+16165550200",
          "useWhen": "life_threatening_dental_emergency"
        }
      ],
      "urgentCare": [
        {
          "name": "Example Urgent Care — Cascade",
          "address": "5678 Cascade Rd SE, Grand Rapids, MI",
          "phone": "+16165550300",
          "useWhen": "after_hours_non_life_threatening"
        }
      ]
    },
    "emergencyPolicy": {
      "erGuidanceScript": "If you're having trouble breathing, severe uncontrolled bleeding, or rapidly spreading swelling, please go to the nearest emergency room or call 911.",
      "defaultERBehavior": "nearest_er | configured_hospital | 911_only"
    }
  }
}
```

---

## Pharmacy Routing

### When pharmacy comes up on calls

| Call type | Example | Aly action |
|-----------|---------|------------|
| **Prescription refill request** | "I need a refill on my pain medication" | Collect med name, pharmacy, patient ID → route to dentist |
| **Pharmacy on file update** | "I use a different CVS now" | Demographics update → route to clinical/front desk |
| **"Where should I pick up my prescription?"** | Post-visit question | "The doctor's office will send it to the pharmacy on file — our team can confirm which one." |
| **Antibiotic questions** | "Do I need antibiotics?" / "Can I get a refill?" | **Route to dentist** — no clinical advice |
| **Caller asks nearest pharmacy** | "What pharmacy is close to your office?" | Use `practice_config.pharmacies.preferred[]` if configured; otherwise: "Our team can note your preferred pharmacy — which location do you use?" |

### Prescription call intake (never authorize)

| Field | Collect |
|-------|---------|
| Patient name + DOB | Yes |
| Medication name | If caller knows |
| Pharmacy name and location | Yes |
| Callback number | Yes |

```json
{
  "intent": "OTHER",
  "subIntent": "prescription_request",
  "prescription": {
    "medicationName": "Amoxicillin",
    "pharmacy": "Meijer — Alpine Ave",
    "pharmacyPhone": null
  },
  "actionItems": [{
    "type": "general_callback",
    "assignee": "on_call_dentist",
    "priority": "routine",
    "notes": "Patient requesting Rx refill — clinical review required"
  }]
}
```

**Never:** Call pharmacy, authorize refill, or advise on medication interactions.

### Common pharmacy chains (West Michigan — examples only)

These chains appear frequently in Grand Rapids. **Do not recite as recommendations** unless in practice config:

| Chain | Notes |
|-------|-------|
| **Meijer Pharmacy** | Michigan-based; very common in GR |
| **CVS / CVS Target** | Widespread |
| **Walgreens** | Widespread |
| **Rite Aid** | Some locations |
| **Walmart Pharmacy** | Suburban locations |
| **Costco Pharmacy** | Membership required |
| **Local independents** | e.g., Keystone Pharmacy (onboarding example) |

**Aly script when patient names a pharmacy:**
> "Got it — I'll note [Pharmacy Name] on [Street/Location] for our team."

---

## Hospital and ER Escalation

### When to mention ER / 911

Per `knowledge/michigan/emergency-routing.md` red flags:

- Trouble breathing or swallowing
- Rapidly spreading facial swelling
- Uncontrolled bleeding
- Severe trauma (jaw fracture, head injury)
- Signs of systemic infection (high fever + spreading swelling + very ill)
- Allergic reaction with breathing difficulty

**Approved pattern (from practice config):**
> "Based on what you're describing, you need urgent medical care. Please go to the nearest emergency room or call 911 if you're having trouble breathing. I'm also notifying our on-call dentist."

### Configured vs nearest ER

| `defaultERBehavior` | Aly behavior |
|---------------------|--------------|
| `911_only` | "Please call 911" for life-threatening — no specific hospital name |
| `nearest_er` | "Please go to the nearest emergency room" |
| `configured_hospital` | Read name/address from `hospitals.erGuidance[]` if practice prefers specific ER |

**Do not** guarantee ER wait times, that ER has a dentist on staff, or that insurance covers ER visit.

### Grand Rapids-area hospital systems (onboarding examples — NOT hard-coded)

Use these only to populate **default practice config during onboarding**. At runtime, use configured values:

| System | Example facilities | Notes for onboarding |
|--------|---------------------|------------------------|
| **Corewell Health** (formerly Spectrum Health) | Butterworth, Blodgett, Helen DeVos Children's | Level I trauma; common ER reference in GR |
| **Trinity Health** | Mercy Health Saint Mary's | Downtown GR |
| **University of Michigan Health-West** | Former Metro Health | Southwest GR |
| **North Ottawa Community Hospital** | Grand Haven area | Lakeshore |
| **Holland Hospital** | Holland | Lakeshore expansion |

Patients may say "Spectrum" or "Corewell" interchangeably during transition — practice config should use current naming.

### Urgent care vs ER

| Situation | Guidance |
|-----------|----------|
| Life-threatening red flags | ER or 911 — not urgent care |
| After-hours moderate dental pain, no red flags | On-call dentist callback — not urgent care for primary route |
| Practice configures urgent care option | Use `hospitals.urgentCare[]` script for specific after-hours non-dental-medical concerns |

**Dental pain alone** typically routes to **on-call dentist**, not urgent care — unless practice config specifies otherwise.

FreedomDesk does not treat urgent care as a substitute for dental evaluation when caller needs a dentist.

---

## Caller Scenarios

### "Which ER should I go to?"

**If red flags present:**
> "Please go to the nearest emergency room or call 911 if you're having trouble breathing. [If configured: Many of our patients go to {Hospital Name} at {Address}.] I'm also flagging our on-call team."

**If no red flags:**
> "For severe dental pain without the symptoms you mentioned, our on-call dentist is the best first step. I'm flagging them to call you back. If you develop trouble breathing, spreading swelling, or uncontrolled bleeding, please seek emergency care."

### "Can you call in my antibiotic?"

> "I'm not able to authorize prescriptions — I'll send this to our dentist/on-call team to review. Can I get your pharmacy name and the medication?"

### "The pharmacy says they don't have my prescription"

> "I'll flag our team to follow up with the pharmacy. Can I confirm your name, date of birth, and which pharmacy location?"

Route to front desk or on-call — do not contact pharmacy directly.

### "I'm allergic to penicillin — can the doctor prescribe something else?"

> "I'll note that allergy concern for the doctor. They'll review what's appropriate when they call you back."

**Never** suggest alternative antibiotics.

---

## Summary Fields

```json
{
  "pharmacy": {
    "name": "Meijer Pharmacy — Alpine Ave",
    "location": "Grand Rapids, MI",
    "action": "update_on_file | rx_refill_request"
  },
  "emergency": {
    "erAdvised": true,
    "erFacility": "Example Hospital — per practice config",
    "redFlags": ["rapidly_spreading_swelling", "fever"]
  }
}
```

---

## Onboarding Checklist

When configuring a Grand Rapids-area practice:

- [ ] Preferred pharmacy list (if practice has preferences)
- [ ] ER guidance script and hospital names (current legal names)
- [ ] Urgent care list (if practice uses for specific scenarios)
- [ ] `defaultERBehavior` setting
- [ ] On-call dentist Rx policy (handled outside FreedomDesk — route only)

---

## Guardrails Summary

| Never | Always read from config |
|-------|---------------------|
| Prescribe or recommend medications | `pharmacies.preferred[]` |
| Tell patient they need/don't need antibiotics | `hospitals.erGuidance[]` |
| Call pharmacy to authorize Rx | `emergencyPolicy.erGuidanceScript` |
| Hard-code hospital as only option nationally | `hospitals.urgentCare[]` |
| Guarantee ER dental treatment available | On-call routing rules |

---

## Related Documents

- `knowledge/michigan/emergency-routing.md`
- `knowledge/dentistry/post-op.md`
- `knowledge/ai/guardrails.md`
- `docs/CALL_FLOWS.md`
