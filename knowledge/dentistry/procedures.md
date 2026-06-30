# Dental Procedures — Phone Scheduling Reference

> **Audience:** FreedomDesk AI and engineering.  
> **Purpose:** Classify caller requests to the **correct appointment type** so the front desk does not re-triage. Durations are West Michigan GP norms — **always defer to practice config**.

---

## Core Rule

Patients describe **symptoms** or **what the doctor already told them**. FreedomDesk schedules **appointment types**, not diagnoses.

- ✅ "I'll get you scheduled for a crown seat."
- ❌ "You need a root canal based on your symptoms."

---

## Procedure Classification Matrix

| Procedure | Caller triggers | Appointment type | Duration | Column | Required summary fields |
|-----------|-----------------|------------------|----------|--------|-------------------------|
| New patient exam | "New patient," "first visit," "new to area" | NP Exam Comprehensive | 60–90 min | Doctor (+ hygiene) | Full intake + insurance taxonomy |
| Periodic exam | "Checkup only," "doctor needs to look" | Periodic Exam (D0120) | 15–30 min | Doctor | Patient ID |
| Adult prophy | "Cleaning," "hygiene" | Prophy (D1110) | 45–60 min | Hygiene | Patient ID, insurance change? |
| Child prophy | "My child's cleaning" | Child Prophy (D1120) | 30–45 min | Hygiene | Child name/DOB, guardian |
| Perio maintenance | "Periodontal cleaning," "after deep cleaning" | Perio Maint (D4910) | 60 min | Hygiene | Note perio history if mentioned |
| SRP | "Deep cleaning," "scaling" | SRP Quad | 60–90 min/quad | Hygiene | Which quads if known |
| Emergency / limited exam | Pain, trauma, broken tooth | Emergency / Limited Exam | 30–45 min | Doctor | Symptoms, urgency, `sameDayEmergency` |
| Crown prep | "First visit for crown," "prep" | Crown Prep | 60–90 min | Doctor + assistant | Tooth area, provider |
| Crown seat | "Put crown on," "delivery," "permanent crown" | Crown Seat | 30–45 min | Doctor | Tooth, temp status, provider |
| Filling | "Cavity," "filling" | Restorative / Filling | 30–60 min | Doctor | Tooth area if known |
| Extraction (simple) | "Pull tooth," planned extraction | Ext Simple | 30–45 min | Doctor | Planned vs emergency |
| Extraction (surgical) | "Surgical," "impacted," wisdom teeth | Ext Surgical | 45–60 min | Doctor | Referral status |
| Root canal | "Root canal," "RCT" | RCT Start / Complete | 60–90 min | Doctor or referral | Tooth, pain level, in-house? |
| Implant consult | "Implant," "replace missing tooth" | Implant Consult | 30–45 min | Doctor | Reason, imaging discussion at visit |
| Denture consult | "Need dentures," "all teeth out" | Denture Consult | 30–45 min | Doctor | New vs existing denture patient |
| Denture impression | "Impressions for dentures" | Denture Impression | 45–60 min | Doctor | Stage in denture workflow |
| Denture delivery | "Getting new dentures" | Denture Delivery | 45–60 min | Doctor | |
| Denture reline/repair | "Loose denture," "broken denture" | Reline / Repair / Adjustment | 15–60 min | Doctor | Urgency if no teeth |
| Whitening | "Whiten teeth" | Whitening | 60–90 min | Hygiene/assistant | Elective — routine urgency |

---

## Multi-Visit Procedures (Disambiguate Stage)

### Crowns

```
Caller: "I need to schedule my crown."

FreedomDesk asks:
1. "Have you already had the first visit with the temporary crown?"
   ├── YES → Crown Seat
   └── NO  → Crown Prep (or confirm treatment plan exists)

2. "Which tooth is it for?"
3. "Is the temporary still in place? Any pain?"
   └── Pain + temp off → upgrade urgency
```

### Root canals

```
Caller: "I need a root canal."

FreedomDesk asks:
1. "Has a dentist already recommended a root canal for a specific tooth?"
2. "Which tooth is bothering you?"
3. "Are you in pain right now?"

IF practice.rootCanalInHouse == false AND molar/complex:
  → Note referral; team will call with endodontist referral
ELSE:
  → Schedule RCT per config
```

**West Michigan pattern:** Many GPs refer molars to endodontists in Grand Rapids. Do not promise in-house treatment without config.

### Dentures

| Stage | Caller might say | FreedomDesk `dentureStage` |
|-------|------------------|---------------------------|
| Consult | "I want dentures" | `consult` |
| Impression | "Molds," "impressions" | `impression` |
| Try-in | "Wax try," "try-in" | `try-in` |
| Delivery | "Pick up dentures" | `delivery` |
| Reline | "Loose," "doesn't fit" | `reline` |
| Repair | "Cracked," "broke in half" | `repair` |
| Adjustment | "Rubbing," "sore spot" | `adjustment` |

**Broken denture:** Priority — patient may have no teeth. Ask: "Do you have a spare set?"

### Implants

Never quote fees or guarantee candidacy.

> "I'll schedule an implant consultation. The doctor will review your options and any imaging needed at that visit."

---

## Treatment Already Recommended vs. New Concern

| Scenario | Questions | Routing |
|----------|-----------|---------|
| "Schedule what Dr. Smith recommended" | "What treatment did they discuss?" | Match to appointment type; flag for front desk to link treatment plan |
| "I don't remember the name" | "Was it a filling, crown, extraction, or cleaning?" | Best-effort type + `notes: "patient unsure of treatment name"` |
| New pain, no prior discussion | Full triage | Emergency path if urgent |

---

## Medical History Flags (Collect, Do Not Advise)

Ask yes/no only; flag for clinical review. **Never tell patient to stop medications.**

| Question | When to ask | Summary flag |
|----------|-------------|--------------|
| Blood thinners? | Extractions, surgery | `medicalFlags: ["blood_thinners"]` |
| Heart condition / joint replacement? | Extractions (antibiotic premed — clinical decision) | `medicalFlags: ["cardiac_history"]` |
| Diabetes? | Surgery, healing concerns | `medicalFlags: ["diabetes"]` |
| Pregnancy? | X-rays, treatment timing | `medicalFlags: ["pregnancy"]` |
| Allergies (latex, anesthetic)? | Any invasive procedure | `allergies: ["latex"]` |

---

## Caller Examples — Full Interpretation

### Example 1: Vague treatment request

**Caller:** "I need to come in for what we talked about last time."  
**FreedomDesk:** Identify patient → "Do you recall if it was a filling, crown, or something else?" → Schedule best-match type → Summary: `appointment.type: "Restorative"`, `notes: "Patient could not name procedure — verify treatment plan in OD"`.

### Example 2: Crown seat with urgency

**Caller:** "My temporary crown fell off and it hurts."  
**FreedomDesk:** Urgent → same-day/next-day limited exam or crown seat eval → `urgency: urgent`, `symptoms: ["temp crown off", "pain"]`, `sameDayEmergency: true`.

### Example 3: Wisdom teeth

**Caller:** "My wisdom teeth are killing me."  
**FreedomDesk:** Triage swelling/fever → Urgent → Emergency exam. Note: may refer to oral surgeon after exam — do not promise extraction same day.

### Example 4: "Just a cleaning" with perio history

**Caller:** "I just need my regular cleaning."  
**FreedomDesk:** If PMS shows perio maintenance OR patient says "after my deep cleanings": → `appointment.type: Perio Maintenance`, not Prophy. If unsure: schedule "cleaning" but `notes: "Confirm prophy vs perio maint in chart"`.

---

## Open Dental Appointment Type Mapping

Exact names vary per office. Examples:

| FreedomDesk type | Example Open Dental label |
|------------------|---------------------------|
| NP Exam Comprehensive | `NP Comp Exam` |
| Crown Seat | `Crown Del` / `Seat Crown` |
| Emergency | `Emerg` / `Limited Exam` |
| Prophy | `Prophy Ad` |

Loaded from `practice_configs.appointment_types[]` synced from `/appointmenttypes`.

---

## Related Documents

- `knowledge/scheduling/appointment-types.md`
- `knowledge/dentistry/emergencies.md`
- `docs/DENTAL_WORKFLOWS.md` — Treatment-Specific Scheduling section
