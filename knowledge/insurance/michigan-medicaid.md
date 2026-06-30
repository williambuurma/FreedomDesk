# Michigan Medicaid (Adult) — FreedomDesk Reference

> **Audience:** FreedomDesk AI — adult Medicaid dental intake.  
> **Scope:** Michigan Medicaid **adult** dental benefit — distinct from Healthy Kids Dental (children).

---

## Overview

Michigan Medicaid provides healthcare coverage for eligible low-income adults and families. **Adult dental benefits are limited** compared to HKD — not all services are covered, and not all general dentists accept adult Medicaid.

FreedomDesk:

- Collects accurate program classification
- Schedules **only if** practice accepts adult Michigan Medicaid
- **Never** promises coverage for specific procedures
- **Never** quotes fees or copays

---

## Caller Identification

| Caller says | Likely program | Verify |
|-------------|----------------|--------|
| "Medicaid" (adult patient) | Michigan Medicaid adult | Not HKD |
| "State insurance" | Could be Medicaid or Delta Medicaid | "Is this for you or your child?" |
| "MI Health card" | Michigan Medicaid | Medicaid ID |
| "I have Medicaid dental" | Adult Medicaid | Age ≥ 19 typically |
| "Bridge card" | Colloquial for MI benefits | Clarify dental vs medical only |

**Always confirm:** Adult calling for self → `planType: Michigan_Medicaid`.  
Child → `healthy-kids-dental.md`.

---

## vs Delta Dental Medicaid vs HKD

| Program | Population | Admin | `planType` |
|---------|------------|-------|------------|
| Michigan Medicaid (adult) | Adults 21+ (dental benefit varies by policy) | State / MCO | `Michigan_Medicaid` |
| Delta Dental Medicaid | Medicaid enrollees with Delta as admin | Delta | `Medicaid` + carrier Delta |
| Healthy Kids Dental | Children on Medicaid | Delta | `HKD` |

**Caller:** "My Medicaid card says Delta Dental."  
**Adult:** Likely Delta Dental Medicaid → `carrier: Delta Dental`, `planType: Medicaid`.  
**Child:** Likely HKD → see HKD doc.

---

## Practice Acceptance (Required Check)

```json
{
  "practice_config": {
    "acceptsMedicaid": true,
    "acceptedMedicaidPrograms": ["michigan_medicaid_adult", "delta_dental_medicaid"]
  }
}
```

If **not** accepted:

> "For adult Michigan Medicaid dental coverage, I'd recommend contacting your managed care plan for a list of participating dentists. If you'd like to be seen here without using that insurance, our team can discuss self-pay options at your visit."

Do not schedule as Medicaid if practice doesn't accept — creates front desk rework and claim failures.

---

## Intake Fields

| Field | Required | Notes |
|-------|----------|-------|
| Patient legal name | Yes | As on Medicaid card |
| DOB | Yes | |
| Medicaid ID | Strongly preferred | 10-digit MI ID common |
| MCO name | If known | e.g., Meridian, Molina, UnitedHealthcare Community Plan |
| Phone | Yes | |
| Chief complaint | Yes | |

```json
{
  "insurance": {
    "carrier": "Michigan Medicaid",
    "planType": "Michigan_Medicaid",
    "medicaidId": "1234567890",
    "mco": "Meridian",
    "verified": false
  }
}
```

---

## Scheduling Considerations

Some West Michigan offices restrict Medicaid to specific days:

| Config | Example |
|--------|---------|
| `medicaidSchedulingDays` | `["Tuesday", "Thursday"]` |
| `medicaidNewPatientAllowed` | true/false |

FreedomDesk offers only compliant slots — or appointment request if rules complex.

---

## What Callers Ask (and How to Respond)

| Question | Response |
|----------|----------|
| "Do you accept Medicaid?" | Per config — "Yes, we see patients with Michigan Medicaid" OR referral script |
| "Is a root canal covered?" | "Coverage depends on your specific plan. We'll verify benefits — the doctor will discuss options at your visit." |
| "How much is a cleaning?" | "Our team can review costs after we verify your benefits. I can get you scheduled for an exam." |
| "I need dentures — does Medicaid pay?" | "Denture coverage varies. We'll verify when you're in — I can schedule a consultation." |

---

## MCO (Managed Care Organization)

Many Michigan Medicaid members have an MCO. FreedomDesk collects if patient knows it — helps front desk verification. Unknown is OK.

**Caller:** "I have Meridian Medicaid."  
→ `mco: "Meridian"`, `planType: Michigan_Medicaid`.

---

## Documentation for Front Desk

Summary should enable one-click verification:

- Program: Michigan Medicaid adult
- Medicaid ID
- MCO if provided
- Appointment type
- `actionItems: verify_medicaid_eligibility`

Open Dental: link to correct insplan fee schedule — front desk action.

---

## Anti-Patterns

| Wrong | Right |
|-------|-------|
| Treat all "Medicaid" as HKD | Ask age / who visit is for |
| Schedule Medicaid without practice acceptance | Check config |
| "Medicaid covers cleanings" | "We'll verify your benefits" |
| Skip Medicaid ID collection | "Do you have your ID number handy?" |

---

## Community Resources (If Not Accepted)

FreedomDesk may use configured referral message:

- Local Federally Qualified Health Centers (FQHCs) with dental
- Michigan Medicaid provider search
- County health department dental clinics

Do not invent specific providers unless in `practice_config.referralResources[]`.

---

## Related Documents

- `knowledge/insurance/healthy-kids-dental.md`
- `knowledge/insurance/delta-dental.md`
- `knowledge/insurance/concepts.md`
