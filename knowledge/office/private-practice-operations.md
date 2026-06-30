# Private Practice Operations — FreedomDesk Reference

> **Audience:** FreedomDesk AI and product/engineering.  
> **Purpose:** How a **1–3 doctor Grand Rapids GP** runs day-to-day — so FreedomDesk fits operational reality, not call-center fiction.

---

## Practice Archetype (Target Customer)

| Attribute | Typical |
|-----------|---------|
| Location | Grand Rapids metro (city or suburb) |
| Dentists | 1–3 owner/associate GPs |
| Operatories | 4–8 (2–3 hygiene, 3–5 doctor) |
| Staff | 2–4 hygienists, 2–4 assistants, 1–3 front desk |
| PMS | Open Dental (most common) |
| Hours | Mon–Thu 7/8–5/6; Fri half-day or closed; Sat optional hygiene |
| Calls/month | 600–2,500 |
| Insurance | Delta PPO, HKD, MI Medicaid, employer PPOs, cash-pay |

---

## Clinical vs Administrative Boundary

| Clinical (dentist/hygienist) | Administrative (front desk + FreedomDesk) |
|------------------------------|-------------------------------------------|
| Diagnosis, treatment planning | Scheduling, intake |
| Prescriptions | Route refill requests |
| Procedure fees and estimates | "Discuss at visit" |
| Insurance pre-auth for treatment | Collect insurance info |
| Emergency clinical decisions | Symptom triage + route |

FreedomDesk stays **administrative** — never crosses into clinical decisions.

---

## Schedule Architecture

### Two-column mental model

| Hygiene column | Doctor column |
|----------------|---------------|
| Prophy, child prophy | Restorative, crowns |
| Perio maint, SRP | Extractions, RCT |
| Often books out 2–4 weeks | Production blocks, emergencies |

**Bottleneck:** Hygiene often fills before doctor — recall backlog is common.

### Production blocks

Doctors need uninterrupted time for:

- Crown preps (60–90 min)
- Multiple fillings
- Surgical extractions

FreedomDesk should not squeeze long procedures into short slots.

### Blockouts

| Blockout type | FreedomDesk |
|---------------|-------------|
| Lunch 12–1 | No offers in block |
| Team meeting Wed AM | Per config |
| Admin / lab time | Hidden from slots |
| Emergency hold | May appear as available emergency type only |

---

## On-Call Rotation

1–3 doctor offices rotate after-hours coverage:

| Element | Config |
|---------|--------|
| Weekly schedule | `onCall.schedule` |
| Contact method | SMS to cell |
| Backup | Partner oral surgeon or ER protocol |

FreedomDesk delivers **urgent summaries** to on-call — not all staff.

---

## New Patient Economics

New patient calls are **highest value**:

- First visit production: $200–$400+
- Lifetime value: $1,500–$3,000+
- Missed call → patient calls next Google result

FreedomDesk prioritizes complete new patient intake over shaving 30 seconds off call length.

---

## Insurance Mix (West Michigan)

| Plan | Prevalence | FreedomDesk |
|------|------------|-------------|
| Delta Dental PPO | Highest commercial | Disambiguate always |
| BCBS MI dental | Common | PPO_Other |
| HKD | High in family practices | Pediatric path |
| Michigan Medicaid adult | Significant | Acceptance check |
| Cash-pay | Common | No stigma — welcome |

---

## Medicaid Operations

Offices accepting Medicaid/HKD:

- May limit Medicaid to certain days
- Different fee schedules in PMS
- Verification before visit essential
- Front desk knows Delta Medicaid ≠ Delta PPO

Offices **not** accepting:

- FreedomDesk refers per config — still offer cash-pay if practice chooses

---

## Daily Rhythm

| Time | Operations | Call pattern |
|------|------------|--------------|
| 7–8 AM | Open, huddle, review day | Low |
| 8–9 AM | Check-ins, confirmations | **Peak** |
| 9–11:30 | Clinical production | Medium |
| 11:30–1 | Lunch (half staff) | Medium–high |
| 1–4 PM | Afternoon production | Medium |
| 4–5 PM | Checkout, tomorrow prep | **Peak** |
| Evenings/weekends | Closed | Emergencies only |

FreedomDesk maximum ROI: **peak + after hours**.

---

## Team Roles (Who Gets Summaries)

| Summary type | Assignee |
|--------------|----------|
| Routine schedule | Front desk |
| Urgent / emergency | On-call dentist + front desk email |
| Billing | Billing coordinator |
| Complaint | Office manager |
| Clinical question | Dentist task |

`actionItems[].assignee` must be correct.

---

## Practice-Configurable Policies

Never hard-code — load from `practice_config`:

- Cancellation notice (24 vs 48 hr)
- New patient exam duration model
- Medicaid acceptance and days
- Services offered (implants, Invisalign, sedation)
- Fee disclosure allowed or not
- Post-op scripts enabled or not
- Booking mode: request vs confirmed
- Emergency callback SLA

---

## What Success Looks Like for the Office

| Persona | Win |
|---------|-----|
| **Dr. (owner)** | Fewer missed new patients; correct emergency routing |
| **Maria (office manager)** | Delta vs Medicaid correct first time; no voicemail re-type |
| **Jamie (front desk)** | Crown seat vs cleaning labeled; 60-second summaries |

FreedomDesk metric: **summary completeness >95%** required fields.

---

## What Private Practices Are NOT

| Not this | FreedomDesk implication |
|----------|-------------------------|
| DSO call center | No script-reading; warm local tone |
| Hospital ER | Triage + route; limited scope |
| Billing company | Collect ins; don't verify benefits Phase 1 |
| Teledentistry | No visual exam; phone only |

---

## Related Documents

- `docs/FREEDOMDESK_CONTEXT.md`
- `knowledge/office/front-desk-workflows.md`
- `docs/DENTAL_WORKFLOWS.md`
