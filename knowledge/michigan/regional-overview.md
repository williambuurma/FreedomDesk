# Michigan Regional Overview — FreedomDesk Reference

> **Audience:** FreedomDesk AI agents, prompt engineers, and onboarding staff.  
> **Purpose:** Geographic, demographic, and operational context for **private general dentistry** in West Michigan — the anchor market for FreedomDesk.  
> **Scope:** Regional intelligence only. Clinical, insurance, and procedure detail lives in sibling files under `knowledge/michigan/` and `knowledge/procedures/`.

---

## Why Michigan First

FreedomDesk is built by a practicing GP in West Michigan. Product defaults — insurance taxonomy, call patterns, PMS priority, emergency routing — reflect **how independent private practices actually operate** in this market before generic national patterns.

| Factor | Michigan relevance |
|--------|-------------------|
| **Delta Dental of Michigan** | Dominant commercial carrier; also administers HKD and Delta Dental Medicaid |
| **Medicaid volume** | Healthy Kids Dental and adult Michigan Medicaid are significant in family practices |
| **Open Dental concentration** | Many independents run Open Dental locally or cloud-hosted |
| **After-hours demand** | Suburban/lakeshore families call evenings and weekends; voicemail loses patients |
| **Practice size** | 1–3 doctor GPs with 4–8 operatories — not DSO call-center models |

---

## Geographic Scope

### Primary anchor: Grand Rapids metro (Kent County)

| Area | Notes for FreedomDesk |
|------|----------------------|
| **Grand Rapids (city)** | Urban mix of employer PPO, Medicaid, cash-pay; high call volume |
| **Suburbs** (Ada, Cascade, Kentwood, Wyoming, Grandville, Walker) | Family-heavy; Delta PPO + HKD common |
| **Holland / Zeeland** | Lakeshore employers; similar insurance mix |
| **Muskegon** | Medicaid/HKD higher proportion in some practices |
| **Kalamazoo / Lansing** | Secondary expansion markets; same carrier patterns |

**Area code:** 616 is dominant in Grand Rapids metro. FreedomDesk should accept 616, 269, 517 numbers without assuming out-of-area.

### Regional identity

- Callers expect **Midwest-friendly, direct, unhurried** phone tone — not coastal call-center energy
- "West Michigan" and "Grand Rapids area" are familiar self-descriptors
- Many patients work in **manufacturing, healthcare, education, and professional services** — employer dental benefits skew PPO

---

## Target Practice Profile (FreedomDesk Default)

| Attribute | Typical West Michigan independent GP |
|-----------|-------------------------------------|
| Dentists | 1–3 owner/associate general dentists |
| Operatories | 4–8 (2–3 hygiene, 3–5 doctor) |
| Hygienists | 2–4 |
| Front desk | 1–3 |
| PMS | Open Dental → Eaglesoft → Dentrix → CareStack |
| Hours | Mon–Thu 7/8 AM – 5/6 PM; Fri half-day or closed; Sat optional hygiene |
| Phone peaks | 8:00–9:30 AM and 4:00–5:30 PM |
| After-hours | Significant Thu–Sun evenings; on-call dentist rotation |
| Insurance mix | Delta PPO (largest) → Delta Medicaid → HKD → MI Medicaid → other PPO → cash-pay |

See `knowledge/michigan/grand-rapids-dental-market.md` for market-specific detail.

---

## Call Volume and Timing Patterns

Understanding daily rhythm helps Aly set expectations and prioritize urgency.

| Time window | Call pattern | FreedomDesk value |
|-------------|--------------|-------------------|
| 8:00–9:30 AM | Confirmations, late arrivals, insurance questions, same-day squeeze-ins | Peak overflow coverage |
| 11:30 AM–1:30 PM | Lunch-hour scheduling; front desk often half-staffed | Overflow + appointment requests |
| 4:00–5:30 PM | Reschedules, end-of-day emergencies, checkout conflicts | Peak overflow coverage |
| Evenings (Mon–Thu) | Toothaches, broken teeth, post-op concerns | After-hours triage + on-call routing |
| Weekends | Emergencies, new patient Google searches | Highest after-hours urgency |

**Monday mornings** and **post-holiday weekends** are disproportionately high for emergency volume — offices often release emergency blocks at 8 AM.

---

## Insurance Landscape (Summary)

FreedomDesk must classify Michigan insurance to **program level**. Never treat "Delta" as one plan.

| Priority | Program | `planType` |
|----------|---------|------------|
| 1 | Delta Dental PPO (employer; includes Premier) | `PPO` (+ note if Premier) |
| 2 | Delta Dental Medicaid (adult; not HKD) | `Medicaid` |
| 3 | Healthy Kids Dental (HKD) | `HKD` |
| 4 | Michigan Medicaid (adult) | `Michigan_Medicaid` |
| 5 | Other PPO (BCBS MI, Cigna, MetLife, etc.) | `PPO_Other` |
| 6 | Cash-pay / none | `none` |

**Child on state/Medicaid dental → HKD**, not Delta PPO or Delta Dental Medicaid. See `knowledge/michigan/regional-insurance.md`.

Full detail: `knowledge/michigan/regional-insurance.md`, `knowledge/michigan/medicaid-and-healthy-kids-dental.md`.

---

## PMS and Front Desk Reality

West Michigan independents optimize for **front desk throughput**, not call-center metrics.

| Principle | Implementation |
|-----------|----------------|
| Collect once on the phone | Structured summary maps to PMS fields, not paragraphs |
| Precise appointment types | Crown seat ≠ cleaning ≠ limited exam |
| Insurance taxonomy on intake | Delta PPO vs Delta Medicaid vs HKD — not interchangeable |
| Same-day emergency flagging | `sameDayEmergency: true` when applicable |
| Open Dental comm log ready | Single paste block per `knowledge/ai/summarization.md` |

---

## Seasonal and Local Factors

| Factor | Phone impact |
|--------|--------------|
| **Summer (Jun–Aug)** | Families schedule before school; hygiene recall backlog |
| **Back-to-school (Aug–Sep)** | Pediatric NP and HKD new patients spike |
| **Holiday weekends** | Post-holiday emergency volume (temp crowns, broken teeth) |
| **Winter weather** | Cancellation/reschedule calls; "running late" summaries |
| **Benefit year-end (Oct–Dec)** | Patients trying to use remaining benefits — schedule treatment, do not quote benefits |
| **New year (Jan)** | Insurance changes; demographics update calls increase |

FreedomDesk does not quote remaining benefits — route to front desk verification.

---

## What Aly Should Know (Regional Defaults)

### Tone and language

- Calm, professional, Midwest-friendly — see `voice/persona.json`
- Use "cleaning" not "prophylaxis" with patients
- Use "exam" or "checkup" for periodic visits
- Never identify as AI

### Default disambiguation questions

When caller says **"Delta"**:
> "Is that Delta Dental through your employer, or state insurance like Medicaid or Healthy Kids Dental?"

When caller says **"Medicaid"** or **"state insurance"**:
> "Is this for you or your child? Healthy Kids Dental covers children on Medicaid."

When caller says **"Blue Cross"**:
> "Is that Blue Cross Blue Shield of Michigan dental through your employer?"

### What Aly must never do (regional context)

| Prohibited | Why |
|------------|-----|
| Diagnose | Liability; not clinical role |
| Prescribe or recommend antibiotics | Clinical decision — route to dentist |
| Say patient definitely does/does not need antibiotics | Clinical judgment |
| Guarantee insurance coverage | Requires eligibility verification |
| Quote exact fees | Unless practice-specific fee schedule in config |
| Hard-code hospital/pharmacy/referral names as universal | Practice-configurable — see sibling files |

---

## Configuration Dependencies

Regional knowledge layers on **practice-specific config**. These keys override regional defaults:

| Config key | Purpose |
|------------|---------|
| `practice_configs.hours_of_operation` | Business vs after-hours routing |
| `practice_configs.acceptedCarriers[]` | In-network PPO list |
| `practice_configs.acceptedMedicaidPrograms[]` | HKD, MI Medicaid, Delta Medicaid |
| `practice_configs.emergencyPolicy` | On-call rotation, ER escalation thresholds |
| `practice_configs.referralResources[]` | Endo, OS, perio, FQHC referrals |
| `practice_configs.pharmacies[]` | Preferred pharmacies for Rx routing |
| `practice_configs.hospitals[]` | ER/urgent care guidance |
| `practice_configs.appointment_types[]` | Durations and Open Dental labels |

**Rule:** Regional docs describe *patterns*. Practice config is *authoritative* for a given office.

---

## Related Documents

| Document | Content |
|----------|---------|
| `knowledge/michigan/grand-rapids-dental-market.md` | Market demographics, employers, competition |
| `knowledge/michigan/regional-insurance.md` | Carrier disambiguation, BCBSM, commercial PPOs |
| `knowledge/michigan/medicaid-and-healthy-kids-dental.md` | HKD and adult Medicaid intake |
| `knowledge/michigan/emergency-routing.md` | Triage, ER escalation, on-call |
| `knowledge/michigan/local-pharmacies-and-hospitals.md` | Configurable local resources |
| `knowledge/michigan/referral-patterns.md` | Specialist referral norms |
| `docs/FREEDOMDESK_CONTEXT.md` | Product context |
| `docs/DENTAL_WORKFLOWS.md` | Operational workflows |
