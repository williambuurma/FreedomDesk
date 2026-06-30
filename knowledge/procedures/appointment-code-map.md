# Appointment Code Map — FreedomDesk Reference

> **Audience:** FreedomDesk engineers and AI agents — maps caller intents to appointment types, CDT references, schedule columns, and Open Dental labels.  
> **Purpose:** Single lookup table for **West Michigan GP defaults**. Practice `appointment_types[]` config is authoritative at runtime.  
> **Scope:** Intent-to-type routing with CDT and Open Dental labels. Duration defaults and column rules also in `knowledge/scheduling/appointment-types.md`.

---

## Map Structure

Each row defines:

| Field | Meaning |
|-------|---------|
| **FreedomDesk type** | Canonical `appointment.type` in summary JSON |
| **Likely CDT** | Reference codes — see `common-cdt-codes.md` |
| **Duration** | Default minutes (override per practice) |
| **Column** | `hygiene` or `doctor` |
| **Open Dental example** | Common label in GR offices — varies per practice |
| **Intent** | Primary FreedomDesk intent |

---

## Master Appointment Map

| FreedomDesk type | Likely CDT | Min | Column | OD example label | Intent |
|------------------|------------|-----|--------|------------------|--------|
| New Patient Exam Comprehensive | D0150 (+ D0210) | 60–90 | doctor | `NP Comp Exam` | NEW_PATIENT |
| New Patient Exam — Doctor Only | D0150 | 45–60 | doctor | `NP Exam Dr` | NEW_PATIENT |
| Periodic Exam | D0120 | 15–30 | doctor | `Periodic Exam` / `Exam` | SCHEDULE_EXISTING |
| Prophy — Adult | D1110 | 45–60 | hygiene | `Prophy Ad` | SCHEDULE_EXISTING |
| Child Prophy | D1120 | 30–45 | hygiene | `Prophy Ch` | PEDIATRIC |
| Perio Maintenance | D4910 | 60 | hygiene | `Perio Maint` | SCHEDULE_EXISTING |
| SRP — Quadrant | D4341 | 60–90 | hygiene | `SRP Q1` etc. | TREATMENT_SCHEDULE |
| Emergency / Limited Exam | D0140 | 30–45 | doctor | `Emerg` / `Limited` | EMERGENCY |
| Crown Prep | D2740, D2950 | 60–90 | doctor | `Crown Prep` | TREATMENT_SCHEDULE |
| Crown Seat | D2740 | 30–45 | doctor | `Crown Del` / `Seat Crown` | TREATMENT_SCHEDULE |
| Filling / Restorative | D2330–D2394 | 30–60 | doctor | `Fill` / `Restorative` | TREATMENT_SCHEDULE |
| Extraction — Simple | D7140 | 30–45 | doctor | `Ext Simple` | TREATMENT_SCHEDULE |
| Extraction — Surgical | D7210+ | 45–60 | doctor | `Ext Surgical` | TREATMENT_SCHEDULE |
| Root Canal — Consult/Start | D3310–D3330 | 60–90 | doctor | `RCT` / `Endo` | TREATMENT_SCHEDULE |
| Root Canal — Referral Pending | — | — | — | Task/referral | TREATMENT_SCHEDULE |
| Implant Consult | D0364 (imaging) | 30–45 | doctor | `Implant Consult` | TREATMENT_SCHEDULE |
| Denture Consult | — | 30–45 | doctor | `Dent Consult` | TREATMENT_SCHEDULE |
| Denture Impression | — | 45–60 | doctor | `Dent Impress` | TREATMENT_SCHEDULE |
| Denture Try-In | — | 30–45 | doctor | `Dent Try-In` | TREATMENT_SCHEDULE |
| Denture Delivery | D5110/D5120 | 45–60 | doctor | `Dent Delivery` | TREATMENT_SCHEDULE |
| Denture Reline | D5730+ | 30–60 | doctor | `Dent Reline` | TREATMENT_SCHEDULE |
| Denture Repair | D5510 | 30 | doctor | `Dent Repair` | TREATMENT_SCHEDULE |
| Denture Adjustment | D5410/D5421 | 15–30 | doctor | `Dent Adj` | TREATMENT_SCHEDULE |
| Whitening | — | 60–90 | hygiene | `Whitening` | SCHEDULE_EXISTING |
| Infant / Knee-to-Knee Exam | D0150 | 20–30 | doctor | `Infant Exam` | PEDIATRIC |

---

## Intent → Type Quick Routing

```
NEW_PATIENT
  └── default → New Patient Exam Comprehensive

SCHEDULE_EXISTING + "cleaning"
  ├── perio history mentioned → Perio Maintenance (D4910)
  └── default → Prophy — Adult (D1110)

PEDIATRIC + cleaning
  └── Child Prophy (D1120)

EMERGENCY (after triage)
  └── Emergency / Limited Exam (D0140)

TREATMENT_SCHEDULE
  ├── "crown" → disambiguate → Crown Prep | Crown Seat
  ├── "root canal" → RCT | Referral Pending
  ├── "extraction" / "pull tooth" → Extraction Simple | Surgical | Emergency path
  ├── "implant" → Implant Consult
  ├── "denture" → disambiguate stage
  └── "filling" / "cavity" → Filling / Restorative
```

---

## Hygiene Recall Map

| Caller says | PMS recall context | FreedomDesk type | CDT |
|-------------|-------------------|------------------|-----|
| "Cleaning" / "checkup" | Standard 6-month recall | Prophy — Adult | D1110 + D0120 |
| "Periodontal cleaning" / "after deep cleaning" | Post-SRP | Perio Maintenance | D4910 |
| "Deep cleaning" | Treatment, not recall | SRP — Quadrant | D4341 |
| "Cleaning" (child) | Pediatric recall | Child Prophy | D1120 + D0120 |

**Insurance change check:** Always ask on recall scheduling.

---

## Emergency Exam Map

| Triage result | FreedomDesk type | CDT | Flags |
|---------------|------------------|-----|-------|
| Urgent/emergency dental | Emergency / Limited Exam | D0140 | `sameDayEmergency: true` |
| Priority (stable) | Emergency / Limited Exam | D0140 | `sameDayEmergency: false` |
| Red flags → ER | No dental slot — ER guidance | — | `erAdvised: true` |

Treatment (extraction, pulpotomy, etc.) may occur same visit — **clinical decision**. FreedomDesk books evaluation block unless config allows treatment type booking.

---

## Crown Workflow Map

| Caller state | Question | Result type |
|--------------|----------|-------------|
| Unclear | "Have you had the first visit with the temporary crown?" | — |
| Temp in place, prep done | Yes | Crown Seat |
| No prep yet | No | Crown Prep |
| Temp off + pain | Either | Crown Seat or Limited Exam + `urgency: urgent` |

| Visit | Type | Duration | Column |
|-------|------|----------|--------|
| Prep | Crown Prep | 60–90 | doctor |
| Seat | Crown Seat | 30–45 | doctor |

---

## Root Canal Map

| Condition | Type | Notes |
|-----------|------|-------|
| `rootCanalInHouse: true`, any tooth | Root Canal — Consult/Start | Collect tooth |
| `rootCanalReferMolar: true`, molar | Root Canal — Referral Pending | Endo referral |
| Active severe pain | Emergency / Limited Exam first | May convert to RCT |

| Tooth (patient-reported) | GP pattern (typical) | FreedomDesk |
|--------------------------|----------------------|-------------|
| Front tooth | Often in-house | Schedule RCT |
| Back molar | Often referred | Referral Pending |

Do not classify tooth type clinically — use patient's description and config.

---

## Extraction Map

| Scenario | Type | Urgency |
|----------|------|---------|
| Planned, discussed with doctor | Extraction — Simple or Surgical | routine |
| New pain, swelling | Emergency / Limited Exam → extraction TBD | urgent |
| Wisdom teeth, impacted | Extraction — Surgical or referral | varies |
| Blood thinners mentioned | Flag `medicalFlags` — clinical review | — |

| Complexity | Type | Likely CDT |
|------------|------|------------|
| Simple erupted | Extraction — Simple | D7140 |
| Surgical / flap | Extraction — Surgical | D7210 |
| Impacted third molar | Referral or Surgical | D7220–D7240 |

---

## Denture Stage Map

| Caller language | `dentureStage` | FreedomDesk type |
|-----------------|----------------|------------------|
| "Need dentures" / "all teeth coming out" | consult | Denture Consult |
| "Impressions" / "molds" | impression | Denture Impression |
| "Wax try" / "try-in" | try-in | Denture Try-In |
| "Pick up dentures" / "delivery" | delivery | Denture Delivery |
| "Loose denture" / "doesn't fit" | reline | Denture Reline |
| "Broken in half" | repair | Denture Repair |
| "Rubbing" / "sore spot" | adjustment | Denture Adjustment |

---

## Implant Map

| Caller language | Type | Notes |
|-----------------|------|-------|
| "Dental implant" / "replace missing tooth" | Implant Consult | 30–45 min |
| "Implant crown" (existing implant) | Restorative — flag for TP | Match treatment plan |
| Post-surgical implant pain | Emergency / Limited Exam | Triage swelling/bleeding |

---

## Open Dental Integration

```json
{
  "practice_config": {
    "appointment_types": [
      {
        "freedomDeskType": "Crown Seat",
        "openDentalName": "Crown Del",
        "durationMinutes": 40,
        "column": "doctor",
        "likelyCdtCodes": ["D2740"]
      }
    ]
  }
}
```

Engineering loads this at onboarding via `GET /appointmenttypes` — see `knowledge/software/open-dental.md`.

---

## Summary Appointment Object

```json
{
  "appointment": {
    "type": "Crown Seat",
    "likelyCdtCodes": ["D2740"],
    "durationMinutes": 40,
    "column": "doctor",
    "tooth": "14",
    "toothArea": "upper right back",
    "openDentalLabel": "Crown Del",
    "status": "request | scheduled"
  }
}
```

---

## Related Documents

- `knowledge/procedures/common-cdt-codes.md`
- `knowledge/procedures/follow-up-question-trees.md`
- `knowledge/scheduling/appointment-types.md`
- `knowledge/software/open-dental.md`
