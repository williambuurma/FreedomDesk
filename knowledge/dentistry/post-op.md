# Post-Operative Calls — FreedomDesk Reference

> **Audience:** FreedomDesk AI handling post-treatment phone calls.  
> **Purpose:** Triage post-op concerns, route appropriately, and use **only practice-approved** general instructions.

---

## Core Principle

Post-op calls sit on the **border of clinical advice**. FreedomDesk:

- **May** use scripts **explicitly configured** by the practice (e.g., "gentle salt water rinses after 24 hours")
- **Must** triage urgency for complications (bleeding, swelling, fever, severe pain)
- **Must not** diagnose complications ("That's definitely dry socket")
- **Must not** prescribe or recommend specific drugs/doses unless in approved config
- **Must not** tell patients to stop prescribed medications

When in doubt → flag for dentist/on-call callback.

---

## Common Post-Op Call Types

| Call type | Caller example | Urgency | Action |
|-----------|----------------|---------|--------|
| Normal healing question | "Is it normal to be sore 2 days after?" | Routine–Priority | General reassurance + callback if worsens; route if configured |
| Bleeding (controlled) | "Slight bleeding when I rinse" | Urgent | On-call callback; practice post-op script if configured |
| Bleeding (uncontrolled) | "Bleeding won't stop" | **Emergency** | ER guidance + immediate on-call |
| Swelling (mild) | "Some swelling after extraction" | Priority | Monitor language; fever → urgent |
| Swelling + fever | "Face swollen and fever" | **Emergency** | On-call + ER |
| Severe pain days after extraction | "Pain getting worse on day 4" | Urgent | Dry socket concern — schedule eval; don't diagnose |
| Lost temporary crown | "Temp fell off after crown prep" | Urgent if pain | Same/next day |
| Numbness persisting | "Still numb 6 hours later" | Priority | Note duration; callback |
| Numbness + spreading | "Tongue feels swollen" | **Emergency** | On-call + ER if breathing issues |
| Stitch concern | "Stitch came out" | Priority | Note day post-op |
| Medication question | "Can I take Tylenol with what they gave me?" | — | **Route to dentist** — no drug advice |
| Antibiotic not picked up | "Didn't fill prescription" | Routine | Route to front desk / dentist |
| Allergic reaction | "Rash after antibiotic" | **Emergency** | Stop? → **Do not advise** — "Please seek medical care or call 911 if trouble breathing" |

---

## Approved vs. Prohibited Language

### Generally safe (if practice enables `postOpScripts: true`)

- "Some soreness for a few days can be normal after [extraction/filling/crown]."
- "If symptoms get worse instead of better, please call us back."
- "Follow the written instructions you received at your visit."
- "Avoid chewing on that side until your dentist advises otherwise."

### Never say without clinical authority

- "That's dry socket — you need packing."
- "Take 600mg ibuprofen every 6 hours."
- "You should stop the antibiotic."
- "You don't need to come in."
- "Rinse with hydrogen peroxide." (unless in practice script)

---

## Triage Flow for Post-Op Calls

```
Post-op concern reported
        │
        ├── Uncontrolled bleeding / trouble breathing / severe spreading swelling
        │         └── EMERGENCY → ER/911 + on-call
        │
        ├── Fever + swelling / worsening severe pain
        │         └── URGENT → on-call + same/next day
        │
        ├── Moderate concern (pain manageable, mild swelling)
        │         └── URGENT or PRIORITY → callback + possible slot
        │
        └── General "is this normal?" without red flags
                  └── Reassure per config + offer callback if worsens
```

---

## Procedure-Specific Caller Patterns

### After extraction

**Caller:** "I had a tooth pulled yesterday and it still hurts."  
**Collect:** Bleeding? Clot dislodged? Pain increasing or decreasing? Fever?  
**Urgent if:** Pain worsening day 3–5, foul taste, fever, uncontrolled bleeding.

### After crown prep

**Caller:** "My temporary crown is loose."  
**Collect:** Pain? Eating affected?  
**Action:** Schedule re-cement temp / eval — urgent if pain or temp off.

### After filling

**Caller:** "My bite feels high on the new filling."  
**Action:** Schedule adjustment — priority 24–48 hr. Not emergency unless severe pain.

### After root canal

**Caller:** "Still sore after root canal last week."  
**Collect:** Increasing pain? Swelling? Fever?  
**Urgent if:** Swelling, fever, severe increasing pain — may need follow-up eval.

### After implant surgery

**Caller:** "Implant site is throbbing."  
**Collect:** Swelling, fever, bleeding — often surgical; lower threshold for urgent callback.

---

## Medication and Prescription Calls

| Request | FreedomDesk action |
|---------|-------------------|
| "Need refill on pain med" | Collect medication name, pharmacy, patient ID → route to dentist |
| "Can I drink alcohol on antibiotics?" | Route to dentist/pharmacist — no advice |
| "Lost my prescription" | Route to front desk |
| "Wrong pharmacy called" | Demographics update + route |

**Never** call in prescriptions or authorize refills.

---

## Summary Fields for Post-Op Calls

```json
{
  "intent": "EMERGENCY | SCHEDULE_EXISTING",
  "subIntent": "post_op_concern",
  "postOp": {
    "procedureType": "extraction | crown_prep | filling | rct | implant | other",
    "daysSinceProcedure": 3,
    "symptoms": ["worsening pain", "no bleeding"],
    "swelling": false,
    "fever": false,
    "bleeding": "controlled | uncontrolled | none"
  },
  "urgency": "urgent",
  "actionItems": [{ "type": "on_call_callback", "assignee": "on_call_dentist" }]
}
```

---

## Practice Configuration Keys

| Config key | Purpose |
|------------|---------|
| `postOpScripts.enabled` | Allow general reassurance scripts |
| `postOpScripts.extraction` | Office-approved extraction post-op text |
| `postOpScripts.crownPrep` | Temp crown care text |
| `postOpRouting.default` | `on_call` vs `front_desk` for post-op |

Default for new customers: **triage + route** only, no clinical instructions.

---

## Related Documents

- `knowledge/dentistry/emergencies.md`
- `knowledge/ai/guardrails.md`
- `docs/CALL_FLOWS.md`
