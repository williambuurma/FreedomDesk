# Michigan Medicaid and Healthy Kids Dental — FreedomDesk Reference

> **Audience:** FreedomDesk AI — pediatric and adult Medicaid intake for West Michigan private GP practices.  
> **Purpose:** Consolidated Michigan public insurance intelligence for phone intake, scheduling gates, and summary output.  
> **Guardrails:** Never promise coverage. Never quote fees or copays. Schedule Medicaid/HKD patients **only** if practice config accepts the program.  
> **Scope:** Michigan consolidated reference. Carrier-specific detail also in `knowledge/insurance/healthy-kids-dental.md` and `knowledge/insurance/michigan-medicaid.md`.

---

## Program Overview

Michigan public dental insurance splits into programs that **look similar on the phone** but have different rules, fee schedules, and practice acceptance requirements.

| Program | Population | Administrator | `planType` | Typical card |
|---------|------------|---------------|------------|--------------|
| **Healthy Kids Dental (HKD)** | Children on Medicaid (typically under 21) | Delta Dental of Michigan | `HKD` | Delta logo + MI Health/Medicaid ID |
| **Delta Dental Medicaid** | Adult Medicaid enrollees with Delta admin (not HKD) | Delta Dental of Michigan | `Medicaid` | Delta + Medicaid ID |
| **Michigan Medicaid (adult)** | Adults 21+ with limited dental benefit | State / MCO | `Michigan_Medicaid` | MI Health card |

**Cards often say "Delta Dental"** for HKD and Delta Medicaid — causing misclassification as employer Delta PPO. Always disambiguate.

---

## Mandatory Disambiguation

### When caller says "Medicaid" or "state insurance"

> "Is this for you or your child? Healthy Kids Dental covers children on Medicaid."

| Answer | Route |
|--------|-------|
| Child / "my son/daughter" | HKD intake |
| Adult / "for me" | Michigan Medicaid adult intake |
| "Both" (sibling scheduling) | Separate classification per patient |

### When caller says "Delta" for a child

> "Is your child's plan Healthy Kids Dental through the state, or Delta through an employer?"

### When caller says "Healthy Kids"

→ HKD intake directly. Confirm child name and DOB.

---

## Healthy Kids Dental (HKD)

### What HKD is

- Michigan's **pediatric dental program** for eligible children on Medicaid
- **Administered by Delta Dental of Michigan** — not Delta PPO
- **Broader pediatric benefits** than adult Michigan Medicaid dental
- Very common in Grand Rapids **family practices**

### Practice acceptance gate

```json
{
  "practice_config": {
    "acceptsMedicaid": true,
    "acceptedMedicaidPrograms": ["healthy_kids_dental"]
  }
}
```

If not accepted → use configured referral resources; offer cash-pay path without quoting fees.

### Required intake (HKD)

| Field | Required | Summary field |
|-------|----------|---------------|
| Child's legal name | Yes | `patient.name` |
| Child's DOB | Yes | `patient.dateOfBirth` |
| Parent/guardian name | Yes | `guardianName` |
| Callback phone | Yes | `caller.phone` |
| Medicaid ID / HKD ID | Strongly preferred | `insurance.medicaidId` |
| Chief complaint | Yes | `chiefComplaint` |
| Relationship of caller | Yes | `caller.relationship` |

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
    "program": "HKD",
    "planType": "HKD",
    "carrier": "Delta Dental",
    "medicaidId": "1234567890",
    "verified": false
  }
}
```

### HKD appointment types

| Age | Visit type | CDT (reference) | Duration |
|-----|------------|-------------------|----------|
| First visit | Child NP exam + prophy | D0150 + D1120 | 30–45 min |
| Recall | Child prophy + exam | D1120 + D0120 | 30–45 min |
| Emergency | Limited exam + treatment as indicated | D0140 | Triage first |

Schedule in **hygiene column** for recall; **doctor column** for emergency.

### What Aly can say (HKD)

| Approved | Prohibited |
|----------|------------|
| "Yes, we see Healthy Kids Dental patients." | "Everything is covered" |
| "Please bring your child's HKD/Medicaid card." | Quote copays or fees |
| "A parent or guardian will need to come with them." | Promise ortho/braces coverage |
| "We'll verify eligibility before the visit." | Classify as Delta PPO |

### Sibling mixed-plan households

Common in West Michigan:

| Child | Plan |
|-------|------|
| Child A | HKD |
| Child B | Delta PPO (parent's employer) |

Schedule and classify **separately**. Never copy insurance from sibling to sibling.

### HKD transition (aging out)

Patients aging out of HKD (typically 19–21) may transition to adult Medicaid (limited dental) or cash-pay.

If parent mentions "aging out" or "turning 19":
→ Note in summary: `notes: "Patient aging out of HKD — front desk insurance review needed"`

FreedomDesk does not auto-reclassify insurance.

---

## Michigan Medicaid (Adult)

### What adult Medicaid dental covers

- **Limited benefit** compared to HKD — not all services covered
- Benefit details vary by policy year and MCO
- **Not all Grand Rapids GPs accept** adult Medicaid dental

FreedomDesk schedules only if practice accepts. Never promise specific procedure coverage.

### Practice acceptance gate

```json
{
  "practice_config": {
    "acceptsMedicaid": true,
    "acceptedMedicaidPrograms": ["michigan_medicaid_adult", "delta_dental_medicaid"]
  }
}
```

### Required intake (adult Medicaid)

| Field | Required | Summary field |
|-------|----------|---------------|
| Patient legal name | Yes | `caller.name` |
| DOB | Yes | `caller.dateOfBirth` |
| Medicaid ID | Strongly preferred | `insurance.medicaidId` |
| MCO name | If known | `insurance.mco` |
| Phone | Yes | `caller.phone` |
| Chief complaint | Yes | `chiefComplaint` |

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

### Delta Dental Medicaid (adult)

When adult's card shows **Delta Dental + Medicaid**:

```json
{
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "Medicaid",
    "medicaidId": "1234567890",
    "verified": false
  }
}
```

Front desk maps to correct Open Dental fee schedule — FreedomDesk uses canonical taxonomy.

### MCO (Managed Care Organization)

Many Michigan Medicaid members have an MCO. Collect if patient knows it — helps front desk verification.

| Common MCOs | Notes |
|-------------|-------|
| Meridian | Common in West Michigan |
| Molina Healthcare | Common |
| UnitedHealthcare Community Plan | Common |
| McLaren Health Plan | Regional |
| Priority Health Choice | West Michigan |

Unknown MCO is OK — proceed with scheduling if accepted.

### Medicaid scheduling restrictions

Some practices limit Medicaid to specific days:

| Config | Example |
|--------|---------|
| `medicaidSchedulingDays` | `["Tuesday", "Thursday"]` |
| `medicaidNewPatientAllowed` | `true/false` |

FreedomDesk offers only compliant slots or creates appointment **request** if rules are complex.

---

## BCBSM / Healthy Kids Awareness

Parents may mention **Blue Cross Blue Shield of Michigan** for medical while child has **HKD for dental**. These are separate.

| Scenario | Action |
|----------|--------|
| "We have Blue Cross for medical, Healthy Kids for dental" | Classify dental as HKD for child |
| Parent on BCBSM PPO, child on HKD | Separate plans per patient |
| Caller confused about which card to bring | "Please bring your child's Healthy Kids or Medicaid dental card." |

Never assume medical carrier = dental carrier.

---

## Caller Questions — Approved Responses

| Question | Response |
|----------|----------|
| "Do you accept Medicaid?" | Per config: yes for accepted programs OR referral script |
| "Do you take Healthy Kids?" | Per config: "Yes, we see Healthy Kids Dental patients" |
| "Is a root canal covered on Medicaid?" | "Coverage depends on your specific plan. We'll verify benefits — the doctor will discuss options at your visit." |
| "How much is a cleaning on Medicaid?" | "Our team can review costs after we verify your benefits." |
| "I need dentures — does Medicaid pay?" | "Denture coverage varies by plan. We'll verify when you're in — I can schedule a consultation." |
| "My card says Delta — is that OK?" | Disambiguate: "Is that through an employer or state insurance like Healthy Kids?" |

---

## If Practice Does Not Accept

Use configured referral message — do not invent specific clinics unless in `practice_config.referralResources[]`.

**Template (customize per practice):**
> "For [Healthy Kids Dental / adult Michigan Medicaid], I'd recommend contacting your managed care plan for a list of participating dentists. If you'd like to be seen here without using that insurance, our team can discuss self-pay options at your visit."

Do not schedule as Medicaid if practice doesn't accept — creates claim failures and front desk rework.

---

## Summary and Front Desk Actions

Every Medicaid/HKD summary should enable one-click verification:

| Action item | When |
|-------------|------|
| `verify_insurance` | All HKD and Medicaid intakes (note: verify Medicaid/HKD eligibility in `notes`) |
| `send_forms` | New HKD pediatric patient |

**Open Dental comm log example:**
```
FreedomDesk | PEDIATRIC | Routine
Child: Sofia K. | DOB 4/12/2016 | Guardian: Maria K. | (616) 555-0142
Insurance: HKD | Medicaid ID: 1234567890 | VERIFY ELIGIBILITY
Appt: Child Prophy + Exam | Thu 7/10 2:00 PM | REQUEST
Chief complaint: First visit / cleaning
Actions: Confirm OD, verify HKD eligibility, send forms
```

---

## Guardrails (Non-Negotiable)

| Never | Always |
|-------|--------|
| Promise "everything is covered" | Collect Medicaid ID when possible |
| Quote fees or copays | Check practice acceptance before scheduling |
| Classify HKD as Delta PPO | Disambiguate employer vs state Delta |
| Treat adult Medicaid as HKD | Confirm age / who visit is for |
| Skip Medicaid ID | Flag `verified: false` |
| Schedule non-accepted program | Use referral script |

---

## Related Documents

- `knowledge/insurance/healthy-kids-dental.md`
- `knowledge/insurance/michigan-medicaid.md`
- `knowledge/insurance/delta-dental.md`
- `knowledge/michigan/regional-insurance.md`
- `docs/CALL_FLOWS.md` — Pediatric Scheduling
