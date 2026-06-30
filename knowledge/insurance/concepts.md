# Insurance Concepts — FreedomDesk Reference

> **Audience:** FreedomDesk AI handling insurance questions and intake.  
> **Purpose:** Collect accurate **program-level** classification and answer general questions — **never verify benefits or quote patient cost**.

---

## FreedomDesk Role in Insurance

| FreedomDesk does | FreedomDesk does NOT |
|------------------|---------------------|
| Collect carrier, plan type, member/Medicaid ID | Run eligibility checks (Phase 1) |
| State if practice accepts plan type (from config) | Quote remaining annual maximum |
| Explain general concepts (deductible, annual max) | Promise procedure is covered |
| Disambiguate similar-sounding plans | Quote account balance or patient portion |
| Flag intake for front desk verification | Interpret EOBs |

---

## Michigan Priority Taxonomy

**Always classify to program level** — never treat "Delta" as one plan:

| Priority | Program | `insurance.planType` |
|----------|---------|---------------------|
| 1 | Delta Dental PPO (employer) | `PPO` + carrier Delta |
| 2 | Delta Dental Medicaid | `Medicaid` + carrier Delta |
| 3 | Healthy Kids Dental (HKD) | `HKD` |
| 4 | Michigan Medicaid (adult) | `Michigan_Medicaid` |
| 5 | Other PPO (BCBS MI, Cigna, etc.) | `PPO_Other` |
| 6 | Cash-pay / none | `none` |

See dedicated files for Delta, HKD, and Michigan Medicaid.

---

## Plan Types Explained (Patient-Facing)

### PPO (Preferred Provider Organization)

- Employer-sponsored most common in Grand Rapids
- Patient can often see out-of-network dentist at lower benefit
- Annual maximum typically **$1,000–$2,000**
- FreedomDesk: "We're in-network with [carrier]" if configured

**Caller:** "I have dental through my employer — Blue Cross."  
→ `carrier: BCBS Michigan`, `planType: PPO_Other`, collect member ID.

### HMO / DMO (Dental Maintenance Organization)

- Must often use **assigned dentist**
- Out-of-network may not be covered
- FreedomDesk: only accept if `practice_config.acceptsHMO` includes carrier

**Caller:** "I have Delta DMO."  
→ Different from Delta PPO — check config; may need assignment transfer.

### Medicaid / State insurance

- Government-funded; fee schedule or capitation
- **Not the same as employer Delta**
- Practice must be enrolled — check `acceptsMedicaid`

### Discount plans (NOT insurance)

**Caller:** "I have DentalSave / Careington."  
→ Discount plan, not insurance — `planType: discount` if practice participates.

### Cash-pay / self-pay

**Caller:** "I don't have insurance."  
→ `insurance: none` — still schedule; fees discussed at visit.

---

## Key Terms (For General Questions Only)

| Term | Simple explanation for callers |
|------|-------------------------------|
| **Annual maximum** | Most plans pay up to a yearly limit on dental |
| **Deductible** | Amount you pay before insurance starts paying (if plan has one) |
| **Copay** | Fixed amount for a visit on some plans |
| **Coinsurance** | Percentage split — e.g., plan pays 80%, you pay 20% |
| **In-network** | Dentist has contract with plan — usually better benefits |
| **Out-of-network** | Dentist not contracted — you may pay more |
| **Frequency limitation** | Plans limit how often they pay for cleanings, X-rays |
| **Waiting period** | Some plans delay coverage for major work |
| **Pre-authorization** | Plan may need approval before major treatment — clinical/billing handles |
| **EOB** | Statement from insurance after claim — billing questions |

**If caller asks "How much will insurance pay?"**
> "Our team will verify your benefits and review estimates at your visit. I can note your insurance information now."

---

## Intake Script (All Insured Patients)

```
"Do you have dental insurance you'd like us to have on file?"

IF YES:
  "Who is your insurance carrier?"
  [Disambiguate per Michigan taxonomy]
  "Do you have your member ID or Medicaid ID handy?"
  "Is the policy under your name or someone else's?"

IF NO:
  "No problem — we see many patients without insurance."
```

---

## Subscriber vs Dependent

| Situation | Collect |
|-----------|---------|
| Caller is policy holder | Patient name = subscriber |
| Child on parent's plan | Child = patient; parent = contact |
| Spouse on employee plan | Patient name; subscriber may be spouse |

**Field:** `insurance.subscriberName`, `insurance.relationship: self | spouse | child`

---

## What Callers Say vs What to Record

| Caller says | Record as | Follow-up question |
|-------------|-----------|-------------------|
| "Delta" | **Incomplete** | Employer or state/Medicaid? |
| "State insurance" | **Incomplete** | Adult Medicaid, HKD, or Delta Medicaid? |
| "Healthy Kids" | HKD | Child name, DOB, Medicaid ID |
| "Medicaid" | Michigan Medicaid or Delta Medicaid or HKD | Adult or child? |
| "MI Health card" | Likely Michigan Medicaid | Medicaid ID |
| "I have insurance" | **Incomplete** | Carrier name? |
| "My work pays for it" | Likely PPO | Which carrier? |

---

## Practice Acceptance Rules

Before scheduling Medicaid/HKD:
```
IF NOT practice_config.acceptsMedicaid:
  → Refer to community resources OR cash-pay option
  → Do NOT promise coverage
```

Configurable lists:
- `acceptedCarriers[]` — PPO carriers in-network
- `acceptedMedicaidPrograms[]` — HKD, Michigan Medicaid, Delta Dental Medicaid

---

## Insurance Change on Existing Patient

Full re-intake of insurance fields — effective date if known:
> "We'll verify your new benefits before your next visit. Please bring your new card."

---

## Summary Schema

```json
{
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "PPO | Medicaid | HKD | Michigan_Medicaid | PPO_Other | none",
    "memberId": "123456789",
    "medicaidId": null,
    "subscriberName": "Finn Leo",
    "relationship": "self",
    "employer": "Steelcase",
    "verified": false
  }
}
```

`verified: false` always on phone intake — front desk runs eligibility.

---

## Related Documents

- `knowledge/insurance/delta-dental.md`
- `knowledge/insurance/michigan-medicaid.md`
- `knowledge/insurance/healthy-kids-dental.md`
- `docs/DENTAL_WORKFLOWS.md` — Insurance Workflows
