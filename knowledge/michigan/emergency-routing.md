# Michigan Emergency Routing — FreedomDesk Reference

> **Audience:** FreedomDesk AI — emergency and urgent call triage for West Michigan private GP practices.  
> **Purpose:** Classify urgency, route per practice policy, and escalate to medical emergency care when indicated — **without clinical diagnosis or prescribing**.  
> **Scope:** Michigan-specific routing defaults. General triage tables also in `knowledge/dentistry/emergencies.md` and `knowledge/dentistry/post-op.md`.  
> **Authority:** Practice `emergencyPolicy` config overrides regional defaults. This document defines industry-standard triage patterns for Michigan independents.

---

## Core Principle

FreedomDesk **triages symptoms and routes** — it does not diagnose, treat, or decide whether antibiotics are needed.

| Aly MAY | Aly MUST NOT |
|---------|--------------|
| Ask structured symptom questions | Diagnose ("That sounds like an abscess") |
| Classify urgency (`routine` → `emergency`) | Prescribe or recommend specific medications/doses |
| Flag same-day need | Tell patient they definitely need or don't need antibiotics |
| Route to on-call dentist per config | Guarantee same-day appointment without slot confirmation |
| Recommend urgent medical/ER evaluation for red flags | Dismiss or minimize symptoms |
| Use practice-approved post-op reassurance scripts | Delay avulsion intake with long questionnaires |

---

## Urgency Levels

| Level | `urgency` value | Definition | Typical FreedomDesk action |
|-------|-----------------|------------|----------------------------|
| **Emergency** | `emergency` | Life-threatening, airway risk, uncontrolled bleeding, time-critical trauma | On-call NOW + ER/911 guidance per policy |
| **Urgent** | `urgent` | Significant pain, swelling without red flags, time-sensitive dental care | Same-day / next-day slot OR on-call callback ≤ configured SLA |
| **Priority** | `priority` | Uncomfortable but stable; needs attention within 48–72 hours | Schedule next available limited exam |
| **Routine** | `routine` | No acute symptoms | Regular scheduling |

**Rule:** Never downgrade urgency because the schedule appears full. Always flag for staff.

---

## Red Flags → Urgent Medical / ER Evaluation

When any of these are present, Aly recommends **urgent medical or emergency evaluation according to the practice's emergency policy** — typically ER, 911, or nearest hospital emergency department.

| Red flag | Example caller language | Aly action |
|----------|------------------------|------------|
| **Trouble breathing** | "Hard to breathe," "throat feels tight" | ER/911 per policy + on-call flag |
| **Trouble swallowing** | "Can't swallow saliva," "drooling" | ER/911 per policy |
| **Rapidly spreading facial swelling** | "Swelling spreading across my face," eye swelling shut | ER/911 + on-call; do not wait for dental callback |
| **Facial swelling + fever + malaise** | "Face swollen, fever 102, feel sick" | ER/911 or urgent medical eval + on-call |
| **Uncontrolled bleeding** | "Bleeding won't stop" despite pressure | ER/911 + immediate on-call |
| **Severe trauma** | Jaw fracture suspected, facial laceration, head injury | ER/911 — trauma protocol |
| **Signs of systemic infection** | High fever + spreading swelling + feeling very ill | Urgent medical eval + on-call |
| **Allergic reaction with breathing involvement** | "Rash and can't breathe" after medication | ER/911 — do not advise stopping/starting meds |
| **Jaw locked open or closed** | "Can't open/close mouth" | ER or oral surgeon per policy |

**Approved language (adapt per practice config):**
> "Based on what you're describing, this needs urgent medical attention. Please go to the nearest emergency room or call 911 if you're having trouble breathing. I'm also flagging our on-call team right away."

**Do not** tell patient their condition is "just dental" when red flags present.

---

## Standard Triage Question Set

Ask naturally in conversation — not as rapid-fire checklist:

| # | Question | Purpose |
|---|----------|---------|
| 1 | "Are you in pain right now?" | Establish acute vs non-acute |
| 2 | "Can you describe it — sharp, throbbing, constant?" | `painLevel` mapping |
| 3 | "When did this start?" | Duration |
| 4 | "Any swelling in your face, jaw, or gums?" | Swelling flag |
| 5 | "Do you have a fever or feel unwell?" | Systemic infection flag |
| 6 | "Did anything happen — injury, fall, biting something hard?" | Trauma flag |
| 7 | "Any bleeding? Can you control it with pressure?" | Bleeding urgency |
| 8 | "Any trouble breathing or swallowing?" | **Red flag screen** |
| 9 | "Have you taken anything for the pain?" | Collect info only — **do not recommend** |

---

## Scenario Routing Table

| Scenario | Urgency | `sameDayEmergency` | Routing |
|----------|---------|-------------------|---------|
| Severe toothache, no swelling/fever | Urgent | true | Same-day limited exam or on-call |
| Toothache + facial swelling, no fever | Urgent | true | Same-day + on-call; monitor red flags |
| Swelling + fever + feeling ill | **Emergency** | true | ER guidance + on-call |
| Broken tooth, no pain | Priority | false | 1–3 days limited exam |
| Broken tooth with pain | Urgent | true | Same-day |
| Knocked-out **permanent** tooth | **Emergency** | true | On-call **immediately** — time window |
| Knocked-out **primary** (baby) tooth | Priority–Urgent | varies | Same-day eval; no reimplant promise |
| Lost crown, no pain | Priority | false | 48–72 hr |
| Lost crown with pain/sensitivity | Urgent | true | Same/next day |
| Lost filling, no pain | Priority | false | 48–72 hr |
| Lost filling with pain | Urgent | true | Same-day |
| Post-extraction bleeding (controlled with gauze) | Urgent | true | On-call callback |
| Post-extraction bleeding (uncontrolled) | **Emergency** | true | ER + on-call |
| Dry socket **concern** (worsening pain day 3–5 post-extraction) | Urgent | true | Eval slot — **do not diagnose dry socket** |
| Post-op pain (manageable, improving) | Priority | false | Callback + possible slot |
| Post-op severe worsening pain + swelling + fever | Urgent–Emergency | true | Per swelling/fever/red flags |
| Abscess (caller's word) | Urgent–Emergency | true | Triage swelling/fever → escalate if red flags |
| Sensitivity to cold only | Routine | false | Regular exam |
| Broken denture (no teeth) | Priority | false | 48–72 hr; empathy |
| Orthodontic wire poking | Priority | false | Next available |

---

## Scenario-Specific Guidance

### Broken tooth

**Questions Aly asks:**
1. "Is the tooth causing pain right now?"
2. "Is there any bleeding?"
3. "Did you break it on something, or did it happen on its own?"
4. "Is any piece loose or sharp on your tongue?"

**Routing:**
- Pain + broken → `urgent`, `sameDayEmergency: true`
- No pain → `priority`, schedule 1–3 days

**Never:** "You won't need a crown" or "It's just a small chip — don't worry."

### Swelling

**Questions Aly asks:**
1. "Where is the swelling — gum, cheek, jaw?"
2. "Is it getting bigger or spreading?"
3. "Do you have a fever?"
4. "Any trouble breathing or swallowing?"

**Routing:**
- Spreading facial swelling + fever → **emergency** + ER guidance
- Localized gum swelling, no fever → urgent, same-day
- Mild swelling post-procedure → priority unless worsening

### Severe pain

Accept caller description — do not insist on numeric scale.

| Caller says | `painLevel` |
|-------------|-------------|
| "Worst pain ever," "can't sleep" | severe |
| "Bad but manageable" | moderate |
| "Mild ache" | mild |

**Routing:** Severe pain → urgent minimum; same-day path.

### Post-op pain

**Questions Aly asks:**
1. "What procedure did you have, and when?"
2. "Is the pain getting better or worse?"
3. "Any bleeding, swelling, or fever?"
4. "Are you following the instructions you received at your visit?"

**Routing:**
- Worsening day 3–5 after extraction → urgent (possible dry socket concern — schedule eval, don't diagnose)
- Uncontrolled bleeding → emergency
- Mild soreness day 1–2 → priority or routine reassurance per config

### Dry socket concern

Caller may say "dry socket" or describe throbbing pain days after extraction.

**Aly response pattern:**
> "I'm sorry you're still uncomfortable. Pain that gets worse a few days after an extraction is something we'd want the doctor to evaluate. I'm flagging this urgent — [same-day slot / on-call callback]."

**Never:** "Yes, that's dry socket" or "You need packing/antibiotics."

### Antibiotic questions

Common caller questions:
- "Do I need antibiotics?"
- "Can I get a refill on my antibiotic?"
- "I didn't fill the prescription — should I still take it?"
- "Can I drink alcohol on my antibiotic?"

**Aly response (always):**
> "I'm not able to give medical advice on medications — that's a decision for the doctor. I'll flag this for our team / on-call dentist to call you back."

**Never:**
- "You probably need antibiotics"
- "You don't need antibiotics"
- "Yes, keep taking them" / "Stop taking them"
- Recommend specific antibiotic, dose, or duration

Route prescription requests to dentist with: patient name, medication name (if known), pharmacy, callback number.

---

## Business Hours vs After Hours

| Context | Urgent/emergency behavior |
|---------|--------------------------|
| **Business hours** | Query emergency slots OR flag front desk squeeze-in |
| **After hours** | On-call callback per rotation; appointment **request** for non-emergency |
| **Life-threatening any time** | ER/911 language per policy |

### After-hours script fragment

> "You've reached our after-hours line. I'm flagging this as urgent for our on-call team. Someone will call you back as soon as possible. If you develop severe swelling, fever, trouble breathing, or uncontrolled bleeding, please seek emergency care right away."

### West Michigan on-call pattern

Independent GPs typically rotate on-call among 1–3 doctors:

- Callback SLA: **15–60 minutes** (practice-configured)
- Aly promises only configured timeframe
- Summary delivered via SMS + email to on-call with `[URGENT]` prefix

---

## Same-Day Emergency Workflow

```
Symptoms reported
       │
       ├── Red flags? → EMERGENCY + ER/911 per policy + on-call
       │
       ├── Urgent? → sameDayEmergency: true
       │       ├── Business hours: offer emergency slot OR flag squeeze-in
       │       └── After hours: on-call callback
       │
       ├── Priority? → Schedule 48–72 hr limited exam
       │
       └── Routine? → Regular scheduling
```

### Limited exam / emergency exam

| Attribute | Detail |
|-----------|--------|
| **Appointment type** | Emergency / Limited Exam |
| **CDT reference** | D0140 (limited oral eval) — see `common-cdt-codes.md` |
| **Duration** | 30–45 min doctor block |
| **Column** | Doctor only — never hygiene |
| **Purpose** | Evaluate urgent concern; treatment may follow same visit or be scheduled separately |

FreedomDesk schedules **evaluation** — not specific treatment (extraction, RCT) unless practice config allows treatment block booking.

---

## Avulsion (Knocked-Out Permanent Tooth)

**Time-critical** — minimize intake delay.

1. Flag `urgency: emergency` immediately
2. Brief practice-configured guidance only — may include keeping tooth moist (milk/saliva) **only if in approved script**
3. Collect: name, callback number, patient age
4. Route on-call **immediately**
5. Do not conduct full insurance intake before routing

---

## Emergency Summary Schema

```json
{
  "intent": "EMERGENCY",
  "urgency": "urgent",
  "sameDayEmergency": true,
  "emergency": {
    "symptoms": ["sharp pain lower left", "broken cusp"],
    "swelling": false,
    "fever": false,
    "trauma": true,
    "bleeding": false,
    "painLevel": "severe",
    "duration": "since last night, worsening",
    "redFlags": [],
    "routingAction": "same_day_slot | on_call_callback | er_referral",
    "erAdvised": false
  },
  "appointment": {
    "type": "Emergency / Limited Exam",
    "status": "request | scheduled"
  },
  "actionItems": [{
    "type": "on_call_callback",
    "assignee": "on_call_dentist",
    "priority": "urgent",
    "notes": "Severe LL pain since last night. No swelling/fever. Existing patient."
  }]
}
```

When ER advised: `"erAdvised": true` and document in action item notes.

---

## Practice Configuration Keys

| Key | Purpose |
|-----|---------|
| `emergencyPolicy.onCallRotation` | Who receives urgent summaries |
| `emergencyPolicy.callbackSLAMinutes` | Max time Aly promises for callback |
| `emergencyPolicy.erGuidanceScript` | Approved ER/911 language |
| `emergencyPolicy.redFlagRules[]` | Practice-specific escalation triggers |
| `emergencyPolicy.avulsionScript` | Approved tooth preservation language |
| `postOpScripts.enabled` | Allow general post-op reassurance |
| `appointment_types[]` | Emergency / Limited Exam duration and OD label |

---

## Related Documents

- `knowledge/dentistry/emergencies.md`
- `knowledge/dentistry/post-op.md`
- `knowledge/michigan/local-pharmacies-and-hospitals.md`
- `knowledge/procedures/follow-up-question-trees.md`
- `knowledge/procedures/call-summary-templates.md`
- `docs/CALL_FLOWS.md` — Emergency flows
