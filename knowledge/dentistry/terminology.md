# Dental Terminology — FreedomDesk Reference

> **Audience:** AI agents, prompt engineers, software engineers building FreedomDesk.  
> **Purpose:** Map what **callers say** to what the **front desk and PMS need** — not clinical textbook definitions.

---

## How to Use This Document

FreedomDesk hears patient language, not CDT codes. Your job is to:

1. **Understand** what the caller means
2. **Translate** to the correct appointment type, urgency, and summary fields
3. **Never** use clinical jargon back to callers unless they use it first
4. **Never** diagnose or name conditions the patient has not already been told by a dentist

---

## Patient Language → FreedomDesk Interpretation

| Caller says | Likely meaning | FreedomDesk maps to | Notes |
|-------------|----------------|---------------------|-------|
| "Cleaning" / "teeth cleaning" | Prophy or perio maintenance | `appointment.type: Prophy` or `Perio Maintenance` | Ask if they had deep cleaning (SRP) before |
| "Checkup" | Exam ± cleaning | Prophy + periodic exam | Common for recall |
| "Deep cleaning" | SRP or perio maintenance | `SRP` or `Perio Maintenance` | Do not assume — flag "mentioned deep cleaning" |
| "Crown" / "cap" | Crown prep or crown seat | Disambiguate stage | "Is this to put the crown on, or the first visit?" |
| "Filling" / "cavity" | Restorative | `Filling` / `Restorative` | Match treatment plan if possible |
| "Root canal" / "RCT" | Endodontic treatment | `Root Canal` or referral | Only schedule if already recommended |
| "Pull a tooth" / "extraction" | Extraction | `Extraction Simple` or `Surgical` | Triage if new pain |
| "Dentures" / "false teeth" | Denture workflow stage | `dentureStage` field | See procedures.md |
| "Implant" | Implant consult or treatment | `Implant Consult` | Never quote fees or candidacy |
| "Wisdom teeth" | Third molar consult/extraction | `Extraction Consult` or `Wisdom Teeth` | Often referred to OS |
| "Gum disease" / "perio" | Periodontal care | Hygiene column — SRP or perio maint | |
| "Whitening" / "bleaching" | Cosmetic | `Whitening` | Usually elective |
| "X-rays" | Diagnostic imaging | Usually part of exam — not standalone unless office offers | |
| "Temp crown" / "temporary" | Post crown-prep | May affect crown seat urgency | "Is the temporary still on?" |
| "Bridge" | Fixed partial denture | `Bridge Prep` or `Bridge Seat` | Similar to crown workflow |

---

## Tooth Identification (Caller-Friendly)

Callers rarely know tooth numbers. Collect **location in plain language**:

| Caller description | Document as | Example summary field |
|--------------------|-------------|----------------------|
| "Upper right in the back" | UR posterior | `toothArea: "upper right back"` |
| "Lower left, middle" | LL premolar area | `toothArea: "lower left side"` |
| "Front tooth" | Anterior | `toothArea: "front tooth"` |
| "#14" / "number fourteen" | Tooth #14 (if confident) | `tooth: "14"` |

**If caller gives FDI or "tooth 3"** — note verbatim; front desk converts. Do not argue numbering systems.

---

## Clinical Abbreviations (Internal / Summary Only)

Use in summaries and PMS notes — **not** in patient conversation unless caller uses them.

| Abbrev | Meaning | FreedomDesk relevance |
|--------|---------|----------------------|
| **NPE** | New patient exam / comprehensive exam | 60–90 min; doctor (+ hygiene) |
| **EP** | Existing patient | Lookup path |
| **NP** | New patient | Intake path |
| **Prophy** | Prophylaxis — routine cleaning | Hygiene column, D1110 adult |
| **Child prophy** | Pediatric cleaning | D1120, shorter block |
| **SRP** | Scaling and root planing | Per quadrant; multiple visits |
| **Perio maint** | Periodontal maintenance | Post-SRP ongoing; D4910 |
| **RCT** | Root canal treatment | In-house or referral per practice config |
| **Ext** | Extraction | Simple vs surgical |
| **PA** | Periapical X-ray | Not scheduled alone on phone usually |
| **BW** | Bitewing X-rays | Part of recall |
| **FMX** | Full mouth X-rays | New patient / periodic |
| **OPG / Pano** | Panoramic X-ray | New patient, implant, wisdom teeth |
| **CDT** | Procedure code set | Front desk maps; FreedomDesk uses appointment types |
| **EOB** | Explanation of Benefits | Billing — route, do not interpret |

---

## Anatomy Terms Callers Use

| Term | What they usually mean | Triage note |
|------|------------------------|-------------|
| "Gum" | Gingiva — pain, swelling, bleeding | Ask swelling, fever |
| "Jaw" | TMJ area or mandible pain | Locked jaw → emergency |
| "Wisdom tooth" | Third molar region | Pain + swelling → urgent |
| "Roof of mouth" | Palate | Less common; note location |
| "Under my tongue" | Floor of mouth | Swelling here + fever → emergency flag |
| "TMJ" / "jaw popping" | Joint issue | Usually priority, not same-day unless locked |
| "Abscess" | **Caller may self-diagnose** | Do not confirm — collect symptoms: swelling, pain, fever |
| "Infection" | **Caller may self-diagnose** | Collect symptoms; route urgency |

**Rule:** If caller says "I have an abscess" — respond with symptom questions, not "Yes, that sounds like an abscess."

---

## West Michigan / Grand Rapids Caller Patterns

| Pattern | Interpretation |
|---------|----------------|
| "I have Delta" | **Must disambiguate** — PPO vs Medicaid vs HKD (see insurance docs) |
| "State insurance" | Michigan Medicaid or Delta Dental Medicaid or HKD |
| "Healthy Kids" | HKD — pediatric |
| "BCBS" / "Blue Cross" | Often BCBS of Michigan dental PPO |
| "I'm new to Grand Rapids" | New patient + possible insurance change |
| "My kid needs to be seen" | Pediatric path — guardian, HKD common |
| "Church referral" / "friend recommended" | `referralSource` field |
| "I go to [other practice] but need emergency" | May be new patient or second opinion — collect intake |

---

## What FreedomDesk Should Say vs. Avoid

| Instead of (clinical) | Say (patient-friendly) |
|-----------------------|------------------------|
| Prophylaxis | Cleaning |
| Periodic oral evaluation | Checkup with the doctor |
| Scaling and root planing | Deep cleaning |
| Operatory | Treatment room |
| Mandibular | Lower jaw |
| Maxillary | Upper jaw |
| Restoration | Filling or crown |
| Extraction | Having a tooth pulled |
| Alveolitis | **Do not use** — say "dry socket concern" only if caller says it |

---

## Example Call Fragments

**Caller:** "I need a prophy."  
**Interpret:** Existing patient, hygiene recall.  
**Action:** Identify patient → schedule prophy → confirm insurance unchanged.

**Caller:** "The doctor said I need a crown on my upper molar."  
**Interpret:** Treatment planned — likely crown prep unless they already had prep.  
**Action:** "Did you already have the first visit with the temporary, or is this the first step?"

**Caller:** "My filling fell out."  
**Interpret:** Priority if no pain; urgent if pain.  
**Action:** Pain? → triage. No pain → schedule emergency/limited exam within 48–72 hours.

**Caller:** "I think I need a root canal."  
**Interpret:** Patient believes they need treatment — may or may not be clinically accurate.  
**Action:** "Has Dr. [Name] already recommended that, or is this a new concern?" + pain triage.

---

## Related Documents

- `knowledge/dentistry/procedures.md` — procedure scheduling detail
- `knowledge/dentistry/emergencies.md` — urgency classification
- `knowledge/scheduling/appointment-types.md` — duration and column mapping
- `docs/CALL_FLOWS.md` — conversation scripts
