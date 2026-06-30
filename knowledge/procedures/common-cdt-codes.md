# Common CDT Codes — FreedomDesk Reference

> **Audience:** FreedomDesk AI agents and engineers mapping phone conversations to procedure vocabulary.  
> **Purpose:** Reference for **common CDT codes** associated with appointment types in West Michigan private GP practices.  
> **Rule:** FreedomDesk schedules **appointment types**, not CDT codes. Codes appear in summaries as **reference labels** for front desk/PMS alignment — Aly does not quote codes to patients unless the practice configures it.

---

## How FreedomDesk Uses CDT Codes

| Use | Do not use |
|-----|------------|
| Map `appointment.type` to likely CDT in summary metadata | Diagnose which code applies clinically |
| Help engineers align Open Dental procedure codes | Quote fees by CDT code |
| Front desk paste into comm logs | Tell patient "You need code D3330" |

**Patient-facing language:** "cleaning," "exam," "crown," "filling," "extraction" — not "D1110."

---

## Diagnostic (Exam) Codes

| CDT | Description | Appointment type | Typical duration | Column |
|-----|-------------|------------------|------------------|--------|
| **D0150** | Comprehensive oral evaluation — new/established patient | New Patient Exam | 60–90 min | Doctor (+ hygiene) |
| **D0120** | Periodic oral evaluation — established patient | Periodic Exam / attached to hygiene | 15–30 min | Doctor |
| **D0140** | Limited oral evaluation — problem focused | Emergency / Limited Exam | 30–45 min | Doctor |
| **D0180** | Comprehensive periodontal evaluation | Perio exam (often with SRP planning) | 30–45 min | Doctor/hygiene |

### Exam type disambiguation (phone)

| Caller need | Appointment type | Likely CDT |
|-------------|------------------|------------|
| New patient, first visit | NP Exam Comprehensive | D0150 (+ imaging/cleaning may add codes) |
| Existing patient, due for checkup with cleaning | Prophy + periodic exam | D1110/D1120 + D0120 |
| Pain, broken tooth, swelling — urgent | Emergency / Limited Exam | D0140 |
| Doctor-only check of one problem | Limited Exam | D0140 |

---

## Preventive / Hygiene Codes

| CDT | Description | Appointment type | Typical duration | Column |
|-----|-------------|------------------|------------------|--------|
| **D1110** | Prophylaxis — adult | Prophy / Hygiene Recall | 45–60 min | Hygiene |
| **D1120** | Prophylaxis — child | Child Prophy | 30–45 min | Hygiene |
| **D4910** | Periodontal maintenance | Perio Maintenance | 60 min | Hygiene |
| **D4341** | SRP — per quadrant (4+ teeth) | SRP Quad | 60–90 min/quad | Hygiene |
| **D4342** | SRP — 1–3 teeth per quadrant | SRP limited | 60 min | Hygiene |
| **D1206** | Topical fluoride varnish | Often with child prophy | — | Hygiene |
| **D1351** | Sealant — per tooth | Often scheduled separately | 15–30 min | Doctor/hygiene |

### Hygiene recall

**Caller:** "I need my cleaning."

| Chart context | Appointment type | CDT |
|---------------|------------------|-----|
| Standard recall | Prophy | D1110 (adult) / D1120 (child) |
| Post-SRP maintenance | Perio Maintenance | D4910 |
| Unsure | Schedule "cleaning" + note: confirm prophy vs D4910 | Front desk verifies |

---

## Restorative Codes

| CDT | Description | Appointment type | Notes |
|-----|-------------|------------------|-------|
| **D2140–D2161** | Amalgam fillings | Filling / Restorative | By surfaces |
| **D2330–D2394** | Composite fillings | Filling / Restorative | Anterior vs posterior |
| **D2740** | Crown — porcelain/ceramic | Crown Prep / Crown Seat | Often same code family for porcelain crowns |
| **D2750** | Crown — porcelain fused to metal | Crown Prep / Seat | |
| **D2790** | Crown — full cast metal | Crown Prep / Seat | |
| **D2950** | Core buildup | Often with crown prep | Same visit or separate |
| **D2962** | Labial veneer | Cosmetic consult | Elective |

### Crown workflow (two visits typical)

| Visit | Appointment type | Likely CDT at visit |
|-------|------------------|---------------------|
| Visit 1 | Crown Prep | D2740 (prep) + D2950 (buildup if needed) + impression |
| Visit 2 | Crown Seat | D2740 (delivery) — same code, different visit |

**Phone:** Always disambiguate prep vs seat — see `follow-up-question-trees.md`.

---

## Endodontic Codes

| CDT | Description | Appointment type |
|-----|-------------|------------------|
| **D3310** | Root canal — anterior | RCT Anterior |
| **D3320** | Root canal — premolar | RCT Premolar |
| **D3330** | Root canal — molar | RCT Molar (often referred) |
| **D3346–D3348** | Retreatment | RCT Retreatment — usually referred |
| **D3410–D3426** | Apicoectomy | Surgical endo — referred |

**FreedomDesk:** Schedule "Root Canal" or referral — do not classify molar vs premolar clinically from symptoms.

---

## Oral Surgery / Extraction Codes

| CDT | Description | Appointment type |
|-----|-------------|------------------|
| **D7140** | Extraction — erupted tooth | Extraction Simple |
| **D7210** | Extraction — erupted tooth requiring elevation/flap | Extraction Surgical |
| **D7220** | Impacted tooth — soft tissue | Wisdom teeth — often referred |
| **D7230** | Impacted tooth — partially bony | Wisdom teeth — referred |
| **D7240** | Impacted tooth — completely bony | Wisdom teeth — referred |
| **D7310** | Alveoloplasty | With extractions — clinical |

**Phone triage:** Emergency pain → Limited Exam (D0140) first; extraction may follow same day or be scheduled.

---

## Prosthodontic / Denture Codes

| CDT | Description | Denture stage |
|-----|-------------|---------------|
| **D5110** | Complete denture — maxillary | Delivery |
| **D5120** | Complete denture — mandibular | Delivery |
| **D5211–D5212** | Max/mand partial denture | Delivery |
| **D5410** | Adjust complete denture — chairside | Adjustment |
| **D5421** | Adjust partial denture | Adjustment |
| **D5510** | Repair broken complete denture | Repair |
| **D5730–D5765** | Reline/rebase | Reline |
| **D5863** | Overdenture | Implant overdenture |

**Phone:** Identify stage (consult / impression / try-in / delivery / reline / repair / adjustment).

---

## Implant Codes

| CDT | Description | Appointment type |
|-----|-------------|------------------|
| **D6010** | Surgical placement — endosteal implant | Implant surgery (often referred) |
| **D6056** | Prefabricated abutment | Restorative phase |
| **D6058** | Abutment supported porcelain crown | Implant crown |
| **D0364** | Cone beam CT — capture | Imaging at consult |

**Phone:** Schedule **Implant Consult** only — never quote implant fees.

---

## Adjunct / Palliative Codes (Emergency Context)

| CDT | Description | When |
|-----|-------------|------|
| **D9110** | Palliative treatment — emergency | Emergency visit pain relief (clinical decision) |
| **D9222** | Deep sedation — first 15 min | Sedation cases — route to clinical |
| **D9230** | Nitrous oxide | Patient may ask — "Team can discuss at visit" |

FreedomDesk does not promise palliative treatment or sedation on phone.

---

## Imaging Codes (Reference)

| CDT | Description | Typical with |
|-----|-------------|--------------|
| **D0210** | Full mouth X-rays | New patient exam |
| **D0272** | Bitewings — two films | Periodic exam |
| **D0274** | Bitewings — four films | Periodic exam |
| **D0330** | Panoramic | NP, implant consult, wisdom teeth |

Imaging is clinical decision — FreedomDesk notes NP exam includes X-rays only if practice script says so.

---

## Michigan Insurance Note on Codes

Medicaid/HKD fee schedules cover **specific codes** with limitations. FreedomDesk:

- **Never** tells caller a code is "covered"
- Records appointment type; front desk maps to insplan fee schedule
- Flags `verify_insurance` action item for HKD/Medicaid patients (note eligibility in `notes`)

---

## Summary Metadata Example

```json
{
  "appointment": {
    "type": "Emergency / Limited Exam",
    "likelyCdtCodes": ["D0140"],
    "column": "doctor",
    "durationMinutes": 30
  }
}
```

`likelyCdtCodes` is **informational** for front desk — not a clinical claim.

---

## Related Documents

- `knowledge/procedures/appointment-code-map.md`
- `knowledge/scheduling/appointment-types.md`
- `knowledge/dentistry/procedures.md`
- `docs/PRACTICE_MANAGEMENT_SOFTWARE.md`
