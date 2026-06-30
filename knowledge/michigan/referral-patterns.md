# Michigan Referral Patterns — FreedomDesk Reference

> **Audience:** FreedomDesk AI scheduling and intake for West Michigan private GP practices.  
> **Purpose:** Document **typical referral patterns** from independent general dentistry to specialists — what Aly should collect, say, and include in summaries.  
> **Rule:** Specific specialist names and offices are **practice-configurable** via `practice_config.referralResources[]`. This document describes patterns, not a universal referral directory.

---

## Core Principle

Grand Rapids-area independent GPs handle broad restorative and surgical scope but **refer selectively** based on:

- Doctor preference and training
- Case complexity (molar endo, impacted thirds, full-arch implant)
- Operatory/equipment availability (CBCT, surgical suite)
- Patient insurance (some specialists don't accept Medicaid)

FreedomDesk **schedules in-house when configured** and **routes to referral workflow** when not — without promising which specialist or appointment date.

---

## Referral Configuration

```json
{
  "practice_config": {
    "clinicalScope": {
      "rootCanalInHouse": true,
      "rootCanalReferMolar": true,
      "implantPlacementInHouse": false,
      "wisdomTeethInHouse": "simple_only",
      "orthoInHouse": false
    },
    "referralResources": [
      {
        "specialty": "endodontics",
        "name": "Example Endodontics — Grand Rapids",
        "phone": "+16165550400",
        "notes": "Preferred endo partner"
      },
      {
        "specialty": "oral_surgery",
        "name": "Example Oral Surgery",
        "phone": "+16165550401"
      },
      {
        "specialty": "periodontics",
        "name": "Example Periodontics",
        "phone": "+16165550402"
      },
      {
        "specialty": "orthodontics",
        "name": "Example Orthodontics",
        "phone": "+16165550403"
      },
      {
        "specialty": "pediatric_dentistry",
        "name": "Example Pediatric Dentistry",
        "phone": "+16165550404",
        "notes": "Complex peds / sedation cases"
      }
    ],
    "referralScript": "Dr. {provider} may refer some cases to a specialist. I'll note your information and our team will call you with referral details and next steps."
  }
}
```

---

## Endodontics (Root Canal)

### West Michigan GP pattern

| Case | Typical handling |
|------|-------------------|
| Anterior/premolar RCT | Often in-house if `rootCanalInHouse: true` |
| Molar RCT | Many GPs refer — `rootCanalReferMolar: true` |
| Retreatment / complex | Usually refer to endodontist |
| Active pain / swelling | Triage first — may be emergency limited exam before referral |

### Caller: "I need a root canal"

**Aly asks:**
1. "Has a dentist already recommended a root canal for a specific tooth?"
2. "Which tooth is bothering you?"
3. "Are you in pain right now?"

**If in-house:**
→ Schedule RCT consult or treatment start per appointment types.

**If referral path:**
> "Dr. [Name] may refer some root canals to a specialist. I'll note your information and our team will call you with referral details and next steps."

**Never:** "You need a root canal" based on symptoms alone.

### Summary (referral path)

```json
{
  "intent": "TREATMENT_SCHEDULE",
  "appointment": {
    "type": "Root Canal — Referral Pending",
    "tooth": "19",
    "toothArea": "lower left back",
    "status": "referral_request"
  },
  "referral": {
    "specialty": "endodontics",
    "reason": "Patient reports RCT recommended for #19; practice refers molars",
    "urgency": "urgent"
  },
  "actionItems": [{
    "type": "general_callback",
    "assignee": "front_desk",
    "notes": "Prepare endo referral — patient in pain, LL molar"
  }]
}
```

---

## Oral Surgery (Extractions, Wisdom Teeth, Implants)

### Extraction

| Case | Typical handling |
|------|-------------------|
| Simple extraction (planned) | In-house GP |
| Surgical / impacted wisdom teeth | Often refer to OS |
| Emergency extraction (pain) | Emergency limited exam in-house first; extraction same day or refer |
| Medical complexity (anticoagulation) | Collect flags; clinical review — may refer |

**Aly asks for extraction:**
1. "Was this already recommended by Dr. [Name], or is this a new concern?"
2. "Which tooth or area?"
3. "Are you in pain now? Any swelling or fever?"
4. "Are you on any blood thinners?" → flag only; never advise stopping meds

### Wisdom teeth

**Caller:** "My wisdom teeth are killing me."

→ Full emergency triage. Schedule emergency exam in-house. Extraction may be same day (simple) or referral (impacted).

**Never promise** same-day extraction or sedation type on phone.

### Implant placement vs consult

| Service | GP pattern |
|---------|--------------|
| **Implant consult** | Many GPs in-house — schedule Implant Consult |
| **Implant placement surgery** | Some GPs in-house; many refer to OS or periodontist |

Check `implantPlacementInHouse`. If false:
> "I'll schedule you for an implant consultation with Dr. [Name]. If specialist care is needed, our team will coordinate referral after the consult."

**Never quote implant fees or guarantee candidacy.**

---

## Periodontics

### When GPs refer

| Indication | Pattern |
|------------|---------|
| Advanced periodontitis beyond GP SRP | Refer to periodontist |
| Periodontal surgery (osseous, grafting) | Refer |
| Implant placement (some GPs refer to perio) | Per config |
| Routine SRP / perio maintenance | Usually in-house hygiene |

**Caller:** "I was told I need gum surgery."

→ Identify patient → note referral need → front desk matches treatment plan.

---

## Orthodontics

Most West Michigan independents **refer ortho** unless practice has in-house ortho provider.

**Caller:** "Do you do braces / Invisalign?"

**If refer:**
> "We work with orthodontic specialists for braces and aligners. I can note your interest and our team will follow up with referral options."

**If in-house:**
→ Schedule ortho consult per config.

**Never promise** HKD/insurance ortho coverage.

---

## Pediatric Dentistry

Family GPs see most pediatric patients (HKD). Referral to pediatric dentist when:

- Complex medical history
- Sedation / hospital dentistry needed
- Severe behavior management beyond GP scope
- Infant oral health programs (some GPs don't see under-3)

**Caller:** "My 2-year-old needs a dentist."

→ Check `practice_config.minPediatricAge`. If below threshold:
> "For children that young, our team may refer to a pediatric dental specialist. I'll note your information and have someone call you with options."

---

## Prosthodontics / Complex Dentures

| Case | Pattern |
|------|---------|
| Standard complete/partial dentures | Most GPs in-house |
| Complex full-mouth rehab | May refer to prosthodontist |
| Implant-supported overdenture | GP consult or refer to OS/perio |

Identify **denture stage** on every denture call — see `knowledge/procedures/follow-up-question-trees.md`.

---

## Referral + Insurance Considerations

| Program | Referral note |
|---------|---------------|
| **Delta PPO** | Specialist may be in/out of network — do not guarantee |
| **HKD** | Specialist must accept HKD — front desk verifies |
| **Adult Medicaid** | Limited specialist network — front desk handles |
| **Cash-pay** | Collect intake; front desk discusses specialist fees |

**Aly never says:** "Your insurance will cover the specialist visit."

---

## What Aly Says (Templates)

### Generic referral (no specific name to caller unless configured)

> "I'll note this for Dr. [Name]'s team. They'll call you with referral information and help coordinate your next appointment with the specialist."

### If practice config allows sharing specialist name

> "Our office often works with [Configured Specialist Name]. Our team will call you with the referral and contact details."

Only use names from `referralResources[]`.

### Urgent referral (pain/swelling)

> "I'm flagging this as urgent. Our team will prioritize your referral and call you back [within configured SLA]. If you develop trouble breathing, spreading swelling, or uncontrolled bleeding, please seek emergency care."

---

## Summary Fields (Referral)

```json
{
  "referral": {
    "needed": true,
    "specialty": "endodontics | oral_surgery | periodontics | orthodontics | pediatric_dentistry",
    "urgency": "routine | urgent",
    "tooth": "19",
    "reason": "Caller reports molar RCT recommended; practice refers molars",
    "referralResourceId": "from practice_config if assigned"
  },
  "actionItems": [{
    "assignee": "front_desk",
    "type": "general_callback",
    "notes": "Prepare endo referral — see call summary"
  }]
}
```

---

## In-House vs Refer — Quick Reference

| Procedure | Usually in-house (GR GP) | Often referred |
|-----------|-------------------------|----------------|
| Fillings, crowns, bridges | ✅ | |
| Simple extractions | ✅ | |
| Dentures (standard) | ✅ | Complex cases |
| Child prophy + exam (HKD) | ✅ | Age/complexity exceptions |
| Anterior RCT | ✅ | |
| Molar RCT | varies | ✅ common |
| Impacted wisdom teeth | | ✅ |
| Implant placement | varies | ✅ common |
| Implant consult | ✅ | |
| Braces / Invisalign | | ✅ |
| Periodontal surgery | | ✅ |
| SRP / perio maintenance | ✅ | |

**Always defer to `practice_config.clinicalScope`.**

---

## Related Documents

- `knowledge/dentistry/procedures.md`
- `knowledge/procedures/follow-up-question-trees.md`
- `knowledge/michigan/emergency-routing.md`
- `docs/DENTAL_WORKFLOWS.md` — Treatment-Specific Scheduling
