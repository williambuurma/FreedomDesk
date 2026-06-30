# Follow-Up Question Trees — FreedomDesk Reference

> **Audience:** FreedomDesk AI — structured decision trees for disambiguating caller requests.  
> **Purpose:** Define **what Aly should ask** after intent classification to reach the correct appointment type, urgency, and summary fields.  
> **Scope:** Question-and-branch reference for Aly. Canonical scripts and state machines in `docs/CALL_FLOWS.md`.  
> **Rule:** Questions collect information for routing and documentation — not for clinical diagnosis.

---

## How to Use These Trees

1. Classify intent first (see `docs/CALL_FLOWS.md`)
2. Walk the relevant tree — skip branches already answered
3. Map outcome to `appointment.type`, `urgency`, and summary fields
4. Never skip emergency red-flag screen on pain/trauma calls

**Tone:** Conversational — not interrogation. Max 2 questions before pausing for response.

---

## Universal Opening Branches

```
All calls
    │
    ├── Pain / emergency / trauma / swelling / bleeding keywords?
    │       └── YES → EMERGENCY TREE (before other intake)
    │
    ├── "New patient" / "first visit" / "never been there"?
    │       └── NEW PATIENT TREE
    │
    ├── "Schedule" / "appointment" / "cleaning"?
    │       └── "Are you a current patient with us?"
    │               ├── NO → NEW PATIENT TREE
    │               └── YES → EXISTING PATIENT TREE (by request type)
    │
    └── Treatment keyword (crown, RCT, extraction, denture, implant)?
            └── TREATMENT TREE (specific procedure)
```

---

## Emergency Tree (All Urgent Presentations)

```
EMERGENCY / pain / trauma reported
    │
    ├── RED FLAG SCREEN (always)
    │       "Any trouble breathing or swallowing?"
    │       "Is swelling spreading quickly across your face?"
    │       "Any uncontrolled bleeding?"
    │       "Do you have a fever and feel very unwell?"
    │       │
    │       └── ANY YES → urgency: emergency, erAdvised: true
    │               → ER/911 script per practice policy + on-call flag
    │
    ├── "Are you in pain right now?"
    │       ├── NO → may be priority/routine — continue scenario tree
    │       └── YES → collect pain description, onset, location
    │
    ├── Swelling present?
    │       ├── YES + fever → emergency path
    │       └── YES, no fever → urgent
    │
    ├── Trauma / injury?
    │       ├── Knocked-out permanent tooth → emergency, immediate on-call
    │       ├── Broken tooth → BROKEN TOOTH TREE
    │       └── Jaw injury → emergency if severe
    │
    ├── Post-operative?
    │       └── POST-OP TREE
    │
    └── Default dental pain
            ├── Severe / worsening → urgent, sameDayEmergency: true
            ├── Moderate → urgent or priority
            └── Mild → priority or routine
```

### Outcome → appointment type

| Urgency | Appointment type |
|---------|------------------|
| emergency / urgent | Emergency / Limited Exam (D0140) |
| priority | Emergency / Limited Exam — schedule 48–72 hr |
| routine | Periodic or regular exam |

---

## Broken Tooth Tree

```
"Broken tooth" / "chipped tooth" / "piece broke off"
    │
    ├── "Is it causing pain right now?"
    │       ├── YES → urgency: urgent, sameDayEmergency: true
    │       └── NO → urgency: priority
    │
    ├── "Is there any bleeding?"
    │       └── YES → note bleeding; if uncontrolled → emergency
    │
    ├── "Did you break it biting something, or did it happen on its own?"
    │       └── trauma: true/false (informational)
    │
    ├── "Is anything sharp or loose bothering your tongue or cheek?"
    │       └── note in symptoms
    │
    ├── Existing patient?
    │       └── Collect name + DOB
    │
    └── Schedule Emergency / Limited Exam
            Summary: symptoms, tooth area if known, urgency, sameDayEmergency
```

**Never:** "It's just a small chip — you don't need to come in."

---

## Swelling Tree

```
"Swelling" / "puffy face" / "abscess" (caller's word)
    │
    ├── RED FLAGS: breathing, swallowing, spreading, eye swelling shut
    │       └── emergency + ER guidance
    │
    ├── "Where is the swelling — gum, cheek, jaw, under the eye?"
    │
    ├── "Is it getting bigger or spreading?"
    │       └── spreading → upgrade urgency
    │
    ├── "Do you have a fever or feel unwell?"
    │       ├── YES → emergency or urgent + same-day
    │       └── NO → urgent if significant; priority if mild/localized
    │
    ├── Recent dental work or spontaneous?
    │
    └── Route: Emergency / Limited Exam
            Never diagnose "abscess" — document caller's words in symptoms[]
```

---

## Severe Pain Tree

```
"Severe pain" / "toothache" / "worst pain" / "can't sleep"
    │
    ├── RED FLAG SCREEN
    │
    ├── "Can you point to which tooth or area — upper, lower, left, right?"
    │
    ├── "When did it start? Getting worse or staying the same?"
    │
    ├── "Constant or does it come and go?"
    │
    ├── Swelling? Fever?
    │       └── upgrade per EMERGENCY TREE
    │
    ├── "Have you taken anything for the pain?"
    │       └── collect only — DO NOT recommend meds
    │
    ├── painLevel mapping:
    │       "worst ever" / "can't sleep" → severe
    │       "bad but manageable" → moderate
    │
    └── urgency: urgent (severe) → sameDayEmergency: true
            Schedule Emergency / Limited Exam OR on-call callback
```

---

## Post-Op Pain Tree

```
Pain after recent dental procedure
    │
    ├── "What procedure did you have, and when was it?"
    │       └── procedureType, daysSinceProcedure
    │
    ├── "Is the pain getting better or worse?"
    │       ├── Worse day 3–5 after extraction → urgent (dry socket concern — don't diagnose)
    │       └── Improving → priority or reassurance per config
    │
    ├── Bleeding?
    │       ├── Uncontrolled → emergency
    │       └── Controlled → note
    │
    ├── Swelling + fever?
    │       └── emergency/urgent per SWELLING TREE
    │
    ├── "Are you following the instructions from your visit?"
    │       └── informational
    │
    └── Route: on-call callback or eval slot
            Never diagnose dry socket or infection
```

---

## Dry Socket Concern Tree

```
Caller mentions "dry socket" OR worsening pain days 2–5 after extraction
    │
    ├── Confirm extraction date and which area
    │
    ├── Bleeding? Swelling? Fever?
    │       └── apply standard escalation rules
    │
    ├── "Is the pain throbbing and getting worse instead of better?"
    │       └── note symptom — do not confirm dry socket
    │
    └── urgency: urgent
            "Pain that worsens a few days after an extraction is something we'd want
             the doctor to evaluate. I'm flagging this urgent."
            → Eval slot or on-call callback
            Summary: subIntent: post_op_concern, procedureType: extraction
            NEVER: "Yes that's dry socket" or "You need antibiotics"
```

---

## Antibiotic Question Tree

```
Antibiotic / prescription / medication question
    │
    ├── Types:
    │       ├── "Do I need antibiotics?"
    │       ├── "Should I take the antibiotic they prescribed?"
    │       ├── "I didn't fill the prescription"
    │       ├── "Need a refill"
    │       ├── "Can I drink alcohol on my antibiotic?"
    │       └── "I'm allergic — can they prescribe something else?"
    │
    └── ALL PATHS → same response pattern:
            "I'm not able to give medical advice on medications —
             the doctor will need to review that."
            Collect: patient name, DOB, medication name if known, pharmacy
            Route: on_call_dentist or front_desk
            NEVER: advise for/against antibiotics
            NEVER: suggest alternative drug
```

---

## New Patient Exam Tree

```
NEW PATIENT
    │
    ├── "Have you been to our office before?"
    │       └── NO (confirm new patient)
    │
    ├── COLLECT: full legal name
    ├── COLLECT: phone, email (preferred)
    ├── COLLECT: date of birth
    │
    ├── INSURANCE TREE (Michigan taxonomy)
    │       "Do you have dental insurance?"
    │       → regional-insurance.md disambiguation
    │
    ├── "What brings you in?" / chief complaint
    │
    ├── Referral source (optional): "How did you hear about us?"
    │
    ├── Preferred days/times
    │
    └── Offer New Patient Exam Comprehensive (60–90 min)
            Arrival: 15 min early for paperwork
            Summary: full intake + appointment.type + insurance.planType
```

---

## Limited Exam vs New Patient (Existing Elsewhere)

```
Caller with pain — not current patient
    │
    ├── "Have you been to our office before?"
    │       ├── NO + pain → may still need NP intake OR emergency limited exam
    │       │       └── If urgent pain: prioritize Emergency / Limited Exam
    │       │           Collect demographics during scheduling
    │       └── YES → existing patient path
    │
    └── New patient with chief complaint "toothache"
            → Emergency triage first, then NP record creation if scheduling
```

---

## Hygiene Recall Tree

```
Existing patient — "cleaning" / "checkup" / recall postcard
    │
    ├── Collect name + DOB
    │
    ├── "Any insurance changes since your last visit?"
    │       └── if yes → INSURANCE TREE
    │
    ├── Perio history check:
    │       "Have you had deep cleanings or periodontal maintenance with us?"
    │       ├── YES / "periodontal cleaning" → Perio Maintenance (D4910)
    │       └── NO → Prophy — Adult (D1110)
    │
    ├── Child patient?
    │       └── PEDIATRIC TREE
    │
    ├── Hygienist preference? (optional)
    │
    └── Offer hygiene slots
            Summary: appointment.type, recallDue if mentioned
```

---

## Crown Prep / Crown Seat Tree

```
"crown" / "cap" / "permanent crown"
    │
    ├── "Have you already had the first visit with the temporary crown?"
    │       ├── YES → CROWN SEAT branch
    │       └── NO → CROWN PREP branch
    │
    CROWN SEAT:
    │   ├── "Which tooth is the crown for?"
    │   ├── "Is the temporary still in place?"
    │   ├── "Any pain or sensitivity?"
    │   │       └── pain → urgency: urgent
    │   └── Schedule Crown Seat (30–45 min, doctor column)
    │
    CROWN PREP:
        ├── "Which tooth?"
        ├── "Was this recommended on your treatment plan?"
        └── Schedule Crown Prep (60–90 min, doctor column)
```

---

## Root Canal Tree

```
"root canal" / "RCT" / "nerve treatment"
    │
    ├── "Has a dentist already recommended a root canal for a specific tooth?"
    │       └── if NO + pain only → EMERGENCY/LIMITED EXAM first
    │
    ├── "Which tooth or area is bothering you?"
    │
    ├── "Are you in pain right now?"
    │       └── YES → urgent flag
    │
    ├── practice_config.rootCanalInHouse?
    │       ├── false → Referral Pending script
    │       └── true → continue
    │
    ├── practice_config.rootCanalReferMolar && patient says back molar?
    │       └── Referral Pending for endodontist
    │
    └── Schedule Root Canal — Consult/Start
            OR Referral Pending with action item for front desk
```

---

## Extraction Tree

```
"extraction" / "pull tooth" / "get tooth removed"
    │
    ├── "Was this already recommended by Dr. [Name], or is this a new concern?"
    │       ├── NEW concern + pain → EMERGENCY TREE
    │       └── Planned → continue
    │
    ├── "Which tooth or area?"
    │
    ├── "Are you in pain now? Swelling or fever?"
    │       └── triage if yes
    │
    ├── "Are you on any blood thinners?"
    │       └── medicalFlags: blood_thinners — never advise stopping
    │
    ├── Wisdom teeth / impacted mentioned?
    │       └── may be surgical or referral — note in summary
    │
    └── Schedule Extraction Simple/Surgical OR Emergency Limited Exam first
```

---

## Denture Tree

```
"denture" / "false teeth" / "plates"
    │
    ├── "Is this for new dentures, an adjustment, a repair, or a fitting?"
    │       │
    │       ├── "Need dentures" / "all teeth out" → consult
    │       ├── "Impressions" / "molds" → impression
    │       ├── "Try-in" / "wax" → try-in
    │       ├── "Pick up" / "delivery" → delivery
    │       ├── "Loose" / "doesn't fit" → reline
    │       ├── "Broken" → repair
    │       └── "Rubbing" / "sore" → adjustment
    │
    ├── Broken denture: "Do you have a spare set to wear?"
    │       └── priority if patient without teeth
    │
    └── Schedule per stage + dentureStage in summary
```

---

## Implant Consult Tree

```
"implant" / "replace missing tooth"
    │
    ├── New or existing patient?
    │       └── new → demographics + insurance
    │
    ├── "Is this for a missing tooth, or a tooth that needs to come out?"
    │
    ├── "Are you in pain now?"
    │       └── if yes → may need emergency eval first
    │
    └── Schedule Implant Consult (30–45 min)
            NEVER quote fees or promise candidacy
            Summary: reason, tooth area if known
```

---

## Pediatric Tree (HKD/Medicaid)

```
Child appointment
    │
    ├── "Is this for your child?"
    │       └── child's name + DOB
    │
    ├── Guardian name and relationship
    │
    ├── INSURANCE: HKD disambiguation
    │       "Does your child have Healthy Kids Dental or dental through the state?"
    │
    ├── Medicaid ID if available
    │
    ├── Chief complaint
    │
    ├── Age-based type:
    │       ├── Under 3 → check minPediatricAge config
    │       ├── 3–12 → Child Prophy + exam
    │       └── 13+ → may be adult prophy per practice
    │
    └── "A parent or guardian will need to come with them."
            Summary: patientIsMinor, guardianName, planType: HKD if applicable
```

---

## Insurance Disambiguation Tree (Michigan)

```
Insurance mentioned
    │
    ├── "Delta" / "Delta Dental"
    │       └── "Employer, or state/Medicaid/Healthy Kids?"
    │               ├── Employer → PPO or Premier
    │               ├── Child + state → HKD
    │               └── Adult + state → Medicaid / Michigan_Medicaid
    │
    ├── "Blue Cross" / "BCBS"
    │       └── "Blue Cross dental through employer?" → PPO_Other
    │
    ├── "Medicaid" / "state insurance"
    │       └── "For you or your child?"
    │               ├── Child → HKD
    │               └── Adult → Michigan_Medicaid
    │
    ├── "Healthy Kids"
    │       └── HKD
    │
    ├── Other carrier name
    │       └── PPO_Other + member ID
    │
    └── No insurance → planType: none
```

---

## Pharmacy Routing Tree

```
Prescription / pharmacy mentioned
    │
    ├── Refill request?
    │       └── collect med name, pharmacy, patient ID → route dentist
    │
    ├── "Do I need antibiotics?"
    │       └── ANTIBIOTIC TREE — no clinical advice
    │
    ├── Pharmacy update?
    │       └── collect pharmacy name/location → demographics update
    │
    └── "Which pharmacy do you use?"
            → note from practice_config or caller-provided
```

---

## Question → Summary Field Map

| Question topic | Summary field |
|----------------|---------------|
| Pain description | `emergency.painLevel`, `emergency.symptoms[]` |
| Swelling | `emergency.swelling` |
| Fever | `emergency.fever` |
| Trauma | `emergency.trauma` |
| Bleeding | `emergency.bleeding` |
| Tooth location | `appointment.tooth`, `appointment.toothArea` |
| Temp crown status | `appointment.notes` |
| Denture stage | `dentureStage` |
| Insurance disambiguation | `insurance.planType` |
| Medicaid ID | `insurance.medicaidId` |
| Blood thinners | `medicalFlags[]` |
| Post-op procedure | `postOp.procedureType`, `postOp.daysSinceProcedure` |
| ER advised | `emergency.erAdvised` |

---

## Related Documents

- `knowledge/michigan/emergency-routing.md`
- `knowledge/procedures/appointment-code-map.md`
- `knowledge/procedures/call-summary-templates.md`
- `docs/CALL_FLOWS.md`
