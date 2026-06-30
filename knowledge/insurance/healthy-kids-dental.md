# Healthy Kids Dental (HKD) — FreedomDesk Reference

> **Audience:** FreedomDesk AI — pediatric Medicaid dental intake.  
> **Market:** Very common in Grand Rapids family practices. Administered by **Delta Dental of Michigan** but is **not** Delta PPO.

---

## What HKD Is

Healthy Kids Dental (HKD) is Michigan's dental coverage program for **eligible children** enrolled in Medicaid. Key facts for FreedomDesk:

| Attribute | Detail |
|-----------|--------|
| **Population** | Children typically under 21 on Medicaid |
| **Administrator** | Delta Dental of Michigan (cards often say Delta) |
| **vs Delta PPO** | Completely different — different fee schedule, eligibility, rules |
| **vs Adult Medicaid** | HKD has **broader pediatric dental benefits** than adult MI Medicaid |
| **FreedomDesk `planType`** | `HKD` |

---

## Caller Identification

| Caller says | Map to |
|-------------|--------|
| "Healthy Kids Dental" | HKD |
| "Healthy Kids" | HKD |
| "My kids have state dental" | HKD (confirm) |
| "Delta for my child" + Medicaid | HKD (not Delta PPO) |
| "Medicaid" + child appointment | HKD |

**Disambiguation:**
> "Is your child's insurance Healthy Kids Dental or Medicaid through the state?"

Often both terms apply — record `planType: HKD`.

---

## Required Intake (Pediatric)

| Field | Required |
|-------|----------|
| **Child's legal name** | Yes |
| **Child's DOB** | Yes — determines HKD eligibility |
| **Parent/guardian name** | Yes |
| **Callback phone** | Yes — usually parent cell |
| **Medicaid ID / HKD ID** | Strongly preferred |
| **Chief complaint** | Yes |

```json
{
  "patientIsMinor": true,
  "caller": { "name": "Maria Kowalski", "relationship": "parent" },
  "patient": { "name": "Sofia Kowalski", "dateOfBirth": "2016-04-12" },
  "insurance": {
    "program": "HKD",
    "planType": "HKD",
    "carrier": "Delta Dental",
    "medicaidId": "1234567890",
    "verified": false
  }
}
```

---

## Practice Acceptance

Schedule HKD patients only if:
```
practice_config.acceptedMedicaidPrograms includes "healthy_kids_dental"
```

Grand Rapids family GPs often accept HKD — confirm per practice.

---

## Appointment Types for HKD Patients

| Age | Typical visit |
|-----|---------------|
| First visit | Child NP exam + prophy |
| Recall | Child prophy (D1120) + exam |
| Emergency | Child emergency exam — triage per emergencies.md |

**Duration:** 30–45 min hygiene column typical.

**Caller:** "My 7-year-old has a toothache."  
→ Pediatric emergency triage + HKD insurance + parent on call.

---

## What FreedomDesk Can Say

| OK | Not OK |
|----|--------|
| "Yes, we see Healthy Kids Dental patients." | "Everything is covered" |
| "Please bring your child's HKD/Medicaid card." | "HKD pays for braces" (ortho — verify at office) |
| "A parent or guardian will need to come with them." | Quote copays or fees |

---

## Parent/Guardian Rules

- Schedule contact under **parent phone** for confirmations
- Patient record is **child**
- Verify caller is authorized: "And your name as the parent or guardian?"
- If grandparent calls: schedule OK; note caller relationship

**HIPAA:** Discuss clinical details with parent/guardian for minor — document `authorizedContact: true`.

---

## Common HKD Call Scenarios

### New pediatric patient

**Caller:** "I need a dentist for my daughter — she has Healthy Kids."  
→ Full pediatric intake → child prophy/NP exam → collect Medicaid ID.

### Recall

**Caller:** "Got a reminder for my son's cleaning — he has HKD."  
→ Identify child (name + DOB) → hygiene slot.

### Insurance confusion

**Caller:** "We have Delta — same as my work plan."  
**Aly:** "Just to make sure — is your child's plan Healthy Kids Dental through the state, or Delta through an employer?"  
→ Often discover HKD vs sibling on employer PPO.

---

## Sibling Different Plans

Common in Grand Rapids households:

| Child | Plan |
|-------|------|
| Child A | HKD |
| Child B | Delta PPO (parent's employer) |

Schedule separately; **never assume** same insurance for all children.

---

## Open Dental Front Desk Notes

- HKD fee schedule ≠ PPO fee schedule
- Verify eligibility before visit — FreedomDesk flags `verify_medicaid_eligibility`
- Comm log: "HKD — Medicaid ID xxx — child Sofia K., DOB 4/12/2016"

---

## Transition at Age 19–21

Patients aging out of HKD may transition to adult Medicaid (limited dental) or cash-pay. FreedomDesk does not auto-handle — if parent mentions "aging out," note for front desk insurance review.

---

## Related Documents

- `knowledge/insurance/michigan-medicaid.md`
- `knowledge/insurance/delta-dental.md`
- `knowledge/scheduling/hygiene-and-recall.md`
- `docs/CALL_FLOWS.md` — Pediatric Scheduling
