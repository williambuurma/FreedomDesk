# Grand Rapids Dental Market — FreedomDesk Reference

> **Audience:** FreedomDesk AI agents and practice onboarding.  
> **Purpose:** Market-specific intelligence for **independent private general dentistry** in the Grand Rapids metro — patient demographics, employer insurance patterns, competitive context, and phone-call implications.  
> **Note:** Specific provider names, competitor lists, and referral offices are **examples** unless loaded from `practice_config`. Do not hard-code as universal truth.

---

## Market Summary

Grand Rapids is the economic hub of West Michigan (~1 million metro population). Independent GP practices (1–3 doctors, 4–8 operatories) serve a mix of:

- **Employer-insured families** (Delta PPO, BCBSM dental, other PPOs)
- **Medicaid/HKD pediatric patients** (significant in family practices)
- **Adult Medicaid** (limited dental benefit; not all GPs accept)
- **Cash-pay and uninsured** patients
- **College-age and young professional** transplants (GVSU, Calvin, growing tech/healthcare sector)

FreedomDesk's default persona ("Aly") and call flows assume this **suburban family + working-adult** mix.

---

## Practice Landscape

### Dominant model: independent GP

| Characteristic | Grand Rapids norm |
|----------------|-------------------|
| Ownership | Private, 1–3 GP owners or small partnerships |
| Clinical scope | Restorative, hygiene, extractions, limited endo, some implants, dentures |
| Referrals | Endo, oral surgery, periodontics, ortho — see `knowledge/michigan/referral-patterns.md` |
| PMS | Open Dental most common among independents |
| Marketing | Google, word-of-mouth, employer directories, Delta provider search |
| After-hours | On-call dentist rotation — not 24/7 in-office staff |

### What FreedomDesk offices are NOT (Phase 1 target)

- Large DSO call-center models
- Hospital-based dental clinics (different intake flows)
- Orthodontic-only or pediatric-only specialty practices
- Medicaid-only FQHC clinics (different scheduling rules)

---

## Patient Demographics and Caller Profiles

### Profile A: New transplant with employer Delta PPO

| Attribute | Detail |
|-----------|--------|
| **Caller says** | "Just moved to Grand Rapids," "Need a new dentist," "Do you take Delta?" |
| **Insurance** | Delta Dental PPO through employer (Steelcase, Amway, Spectrum/Corewell, Meijer, etc.) |
| **Intent** | `NEW_PATIENT` |
| **Aly collects** | Name, phone, DOB, Delta PPO + member ID, chief complaint, scheduling preference |
| **Summary must include** | Full intake + `planType: PPO` — not generic "Delta" |

### Profile B: Suburban family with mixed insurance

| Attribute | Detail |
|-----------|--------|
| **Common pattern** | Parent on employer PPO; one or more children on HKD |
| **Pitfall** | Assuming all family members share same plan |
| **Aly action** | Schedule each patient separately; classify insurance per individual |
| **Summary** | Separate insurance objects per patient when scheduling siblings |

### Profile C: HKD pediatric patient

| Attribute | Detail |
|-----------|--------|
| **Caller says** | "Healthy Kids," "My kid has state dental," "Delta for my child" (Medicaid) |
| **Insurance** | HKD — administered by Delta but **not** Delta PPO |
| **Intent** | `PEDIATRIC` |
| **Aly collects** | Child name/DOB, guardian, Medicaid ID, chief complaint |
| **Practice check** | `acceptedMedicaidPrograms` includes `healthy_kids_dental` |

### Profile D: Adult Michigan Medicaid

| Attribute | Detail |
|-----------|--------|
| **Caller says** | "Medicaid," "MI Health card," "State insurance" (adult) |
| **Insurance** | Michigan Medicaid adult or Delta Dental Medicaid |
| **Practice check** | Many GPs do **not** accept adult Medicaid — verify config before scheduling |
| **If not accepted** | Refer to configured community resources; offer cash-pay path without promising fees |

### Profile E: After-hours emergency caller

| Attribute | Detail |
|-----------|--------|
| **Timing** | Evenings, weekends, holidays |
| **Caller says** | Toothache, broken tooth, swelling, post-extraction bleeding |
| **Aly action** | Triage → classify urgency → on-call callback or same-day request |
| **Never** | Promise exact appointment time if schedule unconfirmed after hours — flag for team |

---

## Employer and Insurance Patterns

Grand Rapids has a strong **employer-sponsored dental** base. Common carriers through local employers:

| Carrier | Frequency | FreedomDesk `planType` |
|---------|-----------|------------------------|
| **Delta Dental PPO** | Highest | `PPO` |
| **Delta Dental Premier** | Moderate (legacy plans) | `PPO` + note Premier |
| **BCBSM / Blue Dental** | High | `PPO_Other` |
| **Cigna** | Moderate | `PPO_Other` |
| **MetLife** | Moderate | `PPO_Other` |
| **Guardian** | Moderate | `PPO_Other` |
| **Aetna** | Moderate | `PPO_Other` |
| **United Healthcare Dental** | Moderate | `PPO_Other` |
| **Principal** | Lower | `PPO_Other` |
| **Humana** | Lower | `PPO_Other` |
| **GEHA** | Federal employees | `PPO_Other` |

**Employer name is optional** on intake but helps front desk verification (e.g., "I work at [local employer]").

### Delta disambiguation (required in this market)

> "Is that Delta Dental through your employer, or state insurance like Medicaid or Healthy Kids Dental?"

Misclassification is the **#1 insurance intake error** in West Michigan family practices.

---

## Common Appointment Types (Phone Volume)

Ranked by inbound call frequency in a typical Grand Rapids GP:

| Rank | Call type | Appointment type | Notes |
|------|-----------|------------------|-------|
| 1 | Hygiene recall / cleaning | Prophy (D1110) / Perio Maint (D4910) | Hygiene column |
| 2 | New patient exam | NP Exam Comprehensive | Highest revenue per call |
| 3 | Same-day emergency / limited exam | Emergency / Limited Exam (D0140) | Doctor column; `sameDayEmergency` |
| 4 | Crown seat | Crown Seat | 30–45 min doctor block |
| 5 | Reschedule / cancel / confirm | — | Administrative |
| 6 | Crown prep | Crown Prep | 60–90 min |
| 7 | Extraction (planned or urgent) | Ext Simple / Surgical | Triage if new pain |
| 8 | Insurance questions | — | Intake only; no benefit quotes |
| 9 | Root canal | RCT or referral | Many GPs refer molars |
| 10 | Denture (stage-dependent) | Consult / delivery / reline | Multi-visit workflow |
| 11 | Implant consult | Implant Consult | Never quote fees |
| 12 | Pediatric cleaning + exam | Child Prophy (D1120) | HKD common |

See `knowledge/procedures/appointment-code-map.md` for CDT mapping.

---

## Competitive and Patient-Choice Context

Patients often call **2–3 offices** before booking. FreedomDesk practices win when:

- Phone answered on first ring (vs. voicemail at competitor)
- Insurance acknowledged correctly on first call (Delta PPO vs HKD)
- Same-day emergency path clear ("We can see you today at…" or urgent callback promised)
- Warm, local tone — not scripted call-center feel

**Aly should not** mention competitors or compare offices. Focus on helping the caller.

---

## Geographic Submarkets (Scheduling Implications)

| Submarket | Patient behavior |
|-----------|-----------------|
| **East side (Ada, Cascade, Forest Hills)** | Higher PPO concentration; longer commutes — morning/evening slots valued |
| **South (Kentwood, Wyoming)** | Diverse insurance mix; HKD volume |
| **West (Grandville, Jenison, Hudsonville)** | Family practices; mixed PPO/Medicaid |
| **City core** | Medicaid/HKD higher; parking/directions questions common |
| **Lakeshore (Holland — expansion)** | Seasonal population; similar patterns to GR |

Directions and parking come from `practice_config` — not regional defaults.

---

## Phone Call Implications for Aly

### New patient calls (highest value)

Collect **complete intake in one call**:

- Legal name, DOB, phone, email
- Insurance taxonomy (Michigan program level)
- Member ID or Medicaid ID if available
- Chief complaint
- Referral source
- Preferred days/times

**Never** quote new patient exam fees unless practice configures fee disclosure.

### Existing patient calls

Always verify **name + DOB** before discussing chart details.

Ask **"Any insurance changes since your last visit?"** on hygiene scheduling calls.

### Treatment-specific calls

Classify to precise appointment type — see `knowledge/procedures/follow-up-question-trees.md`:

- Crown prep vs crown seat
- Denture stage (consult / impression / delivery / reline)
- RCT in-house vs referral
- Extraction planned vs emergency

### Emergency calls

Grand Rapids independents typically maintain **daily emergency blocks** (30–45 min doctor slots). Phase 1: flag `sameDayEmergency: true`; Phase 2+: query PMS slots.

---

## Seasonal Patterns (Grand Rapids)

| Period | Pattern |
|--------|---------|
| **January** | Insurance changes; "new year new dentist" searches |
| **March–April** | Hygiene recall from Q1 mailers |
| **June–August** | Pediatric scheduling before school; college students home |
| **August–September** | Back-to-school NP and HKD spike |
| **November–December** | "Use it or lose it" benefit calls — schedule treatment, never quote remaining max |
| **Post-Memorial Day / post-Labor Day weekends** | Emergency volume spike |

---

## Practice Onboarding Checklist (Regional)

When configuring a Grand Rapids-area practice, confirm:

- [ ] Accepted carriers (Delta PPO, Premier, BCBSM, etc.)
- [ ] Accepted Medicaid programs (HKD, adult MI Medicaid, Delta Medicaid)
- [ ] Open Dental appointment type names and durations
- [ ] Emergency policy and on-call rotation
- [ ] Root canal in-house vs referral
- [ ] Implant placement in-house vs referral
- [ ] Preferred pharmacies and ER/urgent care names
- [ ] Specialist referral list (endo, OS, perio)
- [ ] Medicaid scheduling day restrictions (if any)

---

## Related Documents

- `knowledge/michigan/regional-overview.md`
- `knowledge/michigan/regional-insurance.md`
- `knowledge/michigan/emergency-routing.md`
- `knowledge/procedures/follow-up-question-trees.md`
- `knowledge/procedures/call-summary-templates.md`
- `docs/DENTAL_WORKFLOWS.md`
