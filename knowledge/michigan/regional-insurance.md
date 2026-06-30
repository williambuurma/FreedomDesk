# Michigan Regional Insurance — FreedomDesk Reference

> **Audience:** FreedomDesk AI — insurance intake, disambiguation, and general caller questions.  
> **Purpose:** Michigan-specific insurance intelligence for **private GP practices** in Grand Rapids and West Michigan.  
> **Scope:** Consolidated Michigan intake reference. Carrier detail also in `knowledge/insurance/delta-dental.md`, `healthy-kids-dental.md`, and `concepts.md`.  
> **Critical rule:** Classify to **program level**. Delta Dental PPO, Delta Dental Premier, Delta Dental Medicaid, Healthy Kids Dental, and Michigan Medicaid are **different programs** — never interchangeable on intake or in summaries.

---

## FreedomDesk Role

| Does | Does NOT |
|------|----------|
| Disambiguate Michigan insurance programs | Verify eligibility or remaining benefits |
| Collect member ID, Medicaid ID, MCO | Quote patient portion or fees |
| State in-network status from practice config | Promise procedure coverage |
| Flag intake for front desk verification | Interpret EOBs or claim denials |
| Explain general insurance concepts | Diagnose or prescribe |

---

## Michigan Priority Taxonomy

Use this order when classifying ambiguous caller statements:

| Priority | Program | Caller patterns | `planType` | `carrier` |
|----------|---------|-----------------|------------|-----------|
| 1 | **Delta Dental PPO** (incl. Premier) | "Delta through work," employer card with PPO/Premier | `PPO` | Delta Dental (+ note if Premier) |
| 2 | **Delta Dental Medicaid** | Adult Medicaid card shows Delta | `Medicaid` | Delta Dental |
| 3 | **Healthy Kids Dental (HKD)** | "Healthy Kids," child on state dental | `HKD` | Delta Dental |
| 4 | **Michigan Medicaid (adult)** | "Medicaid," "MI Health," adult patient | `Michigan_Medicaid` | Michigan Medicaid |
| 5 | **Other commercial PPO** | BCBSM, Cigna, MetLife, etc. | `PPO_Other` | Carrier name |
| 6 | **Cash-pay / none** | "No insurance," self-pay | `none` | — |

**Disambiguation rule:** If the patient is a **child** on state/Medicaid dental, classify as **HKD** — not Delta PPO or Delta Dental Medicaid.

---

## Delta Dental of Michigan (All Programs)

Delta Dental of Michigan is the **most common carrier name** heard on Grand Rapids practice phones. It administers:

- Employer **PPO** and **Premier** plans
- **Healthy Kids Dental** (state pediatric Medicaid)
- **Delta Dental Medicaid** (Medicaid fee schedule through Delta)

**Mandatory disambiguation when caller says "Delta" or "Delta Dental":**

> "Is that Delta Dental through your employer, or state insurance like Medicaid or Healthy Kids Dental?"

### Delta Dental PPO (Employer)

| Attribute | Detail |
|-----------|--------|
| **Population** | Working adults and dependents on employer plans |
| **Card markers** | "PPO," group number, employer name |
| **Typical benefits** | Annual max ~$1,000–$2,000; preventive often covered at high percentage |
| **Practice config** | `inNetworkDeltaPPO: true/false` |

**What Aly can say (if in-network):**
> "Yes, we're in-network with Delta Dental PPO. We'll verify your benefits before your visit — please bring your card."

**What Aly cannot say:**
- "Your cleaning will be covered"
- "You have $800 left on your annual max"
- "Delta will pay 80% of your crown"

**Intake JSON:**
```json
{
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "PPO",
    "memberId": "string | null",
    "employer": "optional",
    "verified": false
  }
}
```

### Delta Dental Premier (Employer Legacy)

| Attribute | Detail |
|-----------|--------|
| **Population** | Some long-tenured employer plans; less common than PPO |
| **Card markers** | "Premier" network designation |
| **FreedomDesk handling** | Record `planType: PPO` with `notes: "Delta Premier mentioned"` |
| **Practice note** | Many GPs participate in PPO; Premier participation varies — front desk verifies |

**Disambiguation:** Premier is **employer commercial** — not Medicaid. If caller says "Premier through work," do not classify as HKD.

**What Aly can say:**
> "We participate with Delta Dental plans — our team will verify your specific plan when you're in. Please bring your card."

Do not guarantee Premier fee schedule matches PPO.

### Delta Dental Medicaid

| Attribute | Detail |
|-----------|--------|
| **Population** | Michigan Medicaid enrollees whose dental admin is Delta |
| **Card** | Often shows Delta logo + Medicaid/MI Health ID |
| **vs HKD** | Children on Medicaid dental → `HKD`. Adults on Delta-administered Medicaid → `planType: Medicaid` |
| **Practice config** | `acceptedMedicaidPrograms` includes `delta_dental_medicaid` |

**Intake JSON:**
```json
{
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "Medicaid",
    "medicaidId": "required if available",
    "verified": false
  }
}
```

If practice does not accept:
> "For that plan, you may want to check the Michigan Medicaid dental provider list. We can also see you as a cash-pay patient — our team can discuss options at your visit."

### Delta DMO / HMO

| Attribute | Detail |
|-----------|--------|
| **Caller says** | "Delta DMO," "assigned dentist," "HMO" |
| **Different from PPO** | Patient may need office assigned as primary dentist |
| **Practice config** | `acceptsDeltaDMO: true/false` |

**What Aly can say (if accepted):**
> "With a DMO plan you may need to have our office assigned as your dentist — our team can help with that at your visit."

---

## Healthy Kids Dental (HKD)

HKD is **pediatric Medicaid dental** administered by Delta Dental of Michigan. Cards often say "Delta" — causing frequent misclassification as employer PPO.

| Attribute | Detail |
|-----------|--------|
| **Population** | Children typically under 21 on Michigan Medicaid |
| **Caller says** | "Healthy Kids," "Healthy Kids Dental," "state dental for my child" |
| **`planType`** | `HKD` |
| **Benefits** | Broader pediatric dental than adult Medicaid |

**Disambiguation for child:**
> "Is your child's plan Healthy Kids Dental through the state, or Delta through an employer?"

Full intake: `knowledge/michigan/medicaid-and-healthy-kids-dental.md`.

**Never** tell parent "everything is covered" or quote copays.

---

## Michigan Medicaid (Adult)

Adult dental benefits under Michigan Medicaid are **limited** compared to HKD. Not all Grand Rapids GPs accept adult Medicaid.

| Attribute | Detail |
|-----------|--------|
| **Caller says** | "Medicaid" (adult), "MI Health card," "Bridge card" (colloquial) |
| **`planType`** | `Michigan_Medicaid` or `Medicaid` if Delta-administered |
| **MCO** | Meridian, Molina, UnitedHealthcare Community Plan, etc. — collect if known |

**Always confirm:** Adult calling for self vs. parent calling for child (HKD).

See `knowledge/michigan/medicaid-and-healthy-kids-dental.md` for adult vs pediatric paths.

---

## BCBSM / Blue Dental / Blue Cross Blue Shield of Michigan

BCBSM is the **second most common commercial dental carrier** in West Michigan after Delta.

| Variant | Caller patterns | FreedomDesk handling |
|---------|-----------------|---------------------|
| **Blue Cross Blue Shield dental (PPO)** | "Blue Cross," "BCBS," "Blue Dental through work" | `carrier: BCBS Michigan`, `planType: PPO_Other` |
| **Blue Care Network / HMO** | "BCN," assigned provider | Check `acceptsHMO` — may differ from PPO |
| **Federal BCBS** | Out-of-state employer | Collect member ID; front desk verifies |

**Disambiguation when caller says "Blue Cross":**
> "Is that Blue Cross Blue Shield dental through your employer?"

**What Aly can say (if in-network):**
> "Yes, we're in-network with Blue Cross Blue Shield dental. Please bring your card — we'll verify benefits before your visit."

**HKD awareness:** BCBSM medical and HKD dental are separate. Parent with BCBSM employer plan may still have child on HKD — classify **per patient**.

---

## Other Common Commercial PPO Plans (Michigan Private Practices)

These appear regularly in Grand Rapids employer benefit packages:

| Carrier | Notes | `planType` |
|---------|-------|------------|
| **Cigna** | Employer PPO common | `PPO_Other` |
| **Aetna** | Employer PPO | `PPO_Other` |
| **MetLife** | Employer PPO | `PPO_Other` |
| **Guardian** | Employer PPO | `PPO_Other` |
| **United Healthcare (UHC) Dental** | Employer PPO | `PPO_Other` |
| **Principal** | Smaller employers | `PPO_Other` |
| **Humana** | Employer + some Medicare Advantage dental | `PPO_Other` |
| **GEHA** | Federal employees, VA hospital staff | `PPO_Other` |
| **Anthem** | Out-of-state employers with MI employees | `PPO_Other` |
| **Sun Life** | Less common | `PPO_Other` |
| **Mutual of Omaha** | Less common | `PPO_Other` |

**Intake for any commercial PPO:**
```json
{
  "insurance": {
    "carrier": "Cigna",
    "planType": "PPO_Other",
    "memberId": "string | null",
    "employer": "optional",
    "verified": false
  }
}
```

Only state in-network if carrier appears in `practice_config.acceptedCarriers[]`.

---

## Discount Plans (Not Insurance)

| Plan type | Caller says | Handling |
|-----------|-------------|----------|
| **Dental discount networks** | Careington, DentalSave, Aetna Vital Savings | Not insurance — check `participatingDiscountPlans[]` |
| **Membership plans** | Office in-house membership | Practice-specific — route to front desk |

**What Aly can say:**
> "That's a discount plan rather than insurance — I'll note it and our team can explain how it works at your visit."

Do not classify as PPO.

---

## Intake Decision Tree

```
"Do you have dental insurance?"
        │
        ├── NO → planType: none
        │
        └── YES → "Who is your carrier?"
                    │
                    ├── "Delta" / "Delta Dental"
                    │       └── "Employer, or state/Medicaid/Healthy Kids?"
                    │               ├── Employer → PPO or Premier
                    │               ├── Child + state → HKD
                    │               └── Adult + state → Medicaid / Michigan_Medicaid
                    │
                    ├── "Blue Cross" / "BCBS"
                    │       └── PPO_Other (BCBS Michigan)
                    │
                    ├── "Medicaid" / "state insurance"
                    │       └── "For you or your child?"
                    │               ├── Child → HKD
                    │               └── Adult → Michigan_Medicaid
                    │
                    ├── "Healthy Kids"
                    │       └── HKD
                    │
                    └── Other carrier name
                            └── PPO_Other (or HMO if specified)
```

---

## Common Caller Questions

| Question | Approved response pattern |
|----------|--------------------------|
| "Do you take Delta?" | Disambiguate PPO vs Medicaid/HKD → state acceptance from config |
| "Do you take Medicaid?" | Check config → yes for accepted programs OR referral script |
| "Do you take Healthy Kids?" | Per config → "Yes, we see Healthy Kids Dental patients" |
| "Do you take Blue Cross?" | Per config → in-network statement + verify at visit |
| "Is [procedure] covered?" | "Coverage depends on your plan. We'll verify benefits — the doctor will discuss options at your visit." |
| "How much will I owe?" | "Our team will review costs after verifying your benefits." |
| "What's my remaining benefits?" | "I don't have access to that — our team will verify when you're in." |
| "I'm in-network, right?" | "We'll confirm your specific plan when you're here — please bring your card." |

---

## Misclassification Anti-Patterns

| Wrong | Right |
|-------|-------|
| "Delta" → PPO without asking | Disambiguate employer vs state |
| Child on HKD → Delta PPO | HKD program level |
| Adult Medicaid → HKD | Age and who visit is for |
| BCBS medical → dental accepted | Clarify dental card |
| "State insurance" → PPO | Medicaid path |
| Summary: `"insurance": "Delta"` | Include `planType` always |

---

## Summary Requirements

Every insured call summary must include:

```json
{
  "insurance": {
    "carrier": "Delta Dental | BCBS Michigan | Cigna | ...",
    "planType": "PPO | Medicaid | HKD | Michigan_Medicaid | PPO_Other | none",
    "memberId": "string | null",
    "medicaidId": "string | null",
    "mco": "string | null",
    "employer": "string | null",
    "verified": false
  }
}
```

`verified: false` always on phone intake.

---

## Related Documents

- `knowledge/insurance/delta-dental.md`
- `knowledge/insurance/healthy-kids-dental.md`
- `knowledge/insurance/michigan-medicaid.md`
- `knowledge/michigan/medicaid-and-healthy-kids-dental.md`
- `knowledge/insurance/concepts.md`
- `docs/DENTAL_WORKFLOWS.md` — Insurance Workflows
