# Front Desk Workflows — FreedomDesk Reference

> **Audience:** FreedomDesk AI and engineers modeling call outcomes.  
> **Purpose:** Mirror what a **Grand Rapids GP front desk** does so FreedomDesk produces PMS-ready output — not voicemail paragraphs.

---

## Front Desk Mission

The front desk is the operational hub. FreedomDesk **replicates phone steps 1–5** and produces structured output for **step 6 (PMS documentation)**.

| Step | Front desk | FreedomDesk |
|------|------------|-------------|
| 1 | Answer ≤3 rings | Always answer |
| 2 | Classify intent in 30 sec | Intent detection |
| 3 | PMS lookup / intake | Adapter or intake schema |
| 4 | Collect required fields | State machine — authoritative |
| 5 | Act or promise callback | Schedule / route / message |
| 6 | Comm log, appointment, task | Structured summary |

---

## Call Priority Queue

When multiple calls compete (overflow scenario), prioritize:

1. **True emergency** — airway, uncontrolled bleeding, trauma
2. **New patient inquiry** — highest revenue
3. **Same-day pain / broken tooth**
4. **Existing patient schedule / confirm / reschedule**
5. **Billing / insurance detail questions**
6. **General info** — hours, directions

FreedomDesk should not deprioritize emergencies for scheduling convenience.

---

## Patient Identification Standard

**Always:** Full name + date of birth before discussing account details.

```
"Can I get your full name and date of birth so I can pull up your chart?"
```

| Insufficient | Why |
|--------------|-----|
| Phone number alone | Shared family phones |
| First name only | Common names |
| "I'm John's wife" | Need patient identity |

Multiple matches → confirm address or phone last four.

---

## Workflow: New Patient (Phone)

| # | Action | Summary field |
|---|--------|---------------|
| 1 | Greet | — |
| 2 | Confirm new patient | `isNewPatient: true` |
| 3 | Legal name | `caller.name` |
| 4 | Phone | `caller.phone` |
| 5 | DOB | `caller.dateOfBirth` |
| 6 | Insurance taxonomy | `insurance.*` |
| 7 | Chief complaint | `chiefComplaint` |
| 8 | Referral source | `referralSource` |
| 9 | Offer slots | `appointment.*` |
| 10 | Arrival instructions | 15 min early, forms |

**Office after call:** Create patient in OD → verify ins → send forms → confirm text.

---

## Workflow: Existing Patient Schedule

| # | Action |
|---|--------|
| 1 | Name + DOB lookup |
| 2 | Determine appointment type (not generic "appointment") |
| 3 | Insurance change? |
| 4 | Offer slots |
| 5 | Confirm + reminder mention |

---

## Workflow: Reschedule / Cancel

| Cancel | Reschedule |
|--------|------------|
| Identify appointment | Same + offer new times |
| Note reason if given | Old slot + new slot in summary |
| State 24–48 hr policy | `lateCancellation` if applicable |
| Offer reschedule | |

**Front desk value:** Cancelled slot in summary → fill from waitlist.

---

## Workflow: Emergency (Business Hours)

1. Triage symptoms
2. Classify urgency
3. Same-day slot OR urgent flag
4. Minimum demographics
5. Summary to front desk + on-call if after hours

See `knowledge/dentistry/emergencies.md`.

---

## Workflow: Insurance Verification (Office — Not FreedomDesk)

FreedomDesk ends at intake. Office then:

1. Clearinghouse eligibility (DentalXChange, etc.)
2. Update OD insurance fields
3. Note annual max / limitations in chart
4. Patient estimate at visit if office policy

FreedomDesk summary: `actionItems: [{ type: "verify_insurance" }]`

---

## Workflow: Demographics Update

| Update | Collect | PMS action |
|--------|---------|------------|
| Phone | New number, cell? | Update + text consent |
| Address | Full address | Update |
| Email | New email | Update |
| Insurance | Full re-intake taxonomy | Re-verify |
| Name change | New legal name | Staff may need new ID |

Summary: `intent: DEMOGRAPHICS_UPDATE`, `updates: {}`

---

## Workflow: Billing Callback

Never quote balance. Collect:

- Name, phone
- Question summary
- Route to billing

`actionItems: [{ type: "billing_callback", assignee: "billing" }]`

---

## Workflow: Prescription / Refill

Collect medication name + pharmacy → route to dentist.

**Never prescribe or authorize refills.**

---

## PMS Documentation Targets

Every call should map to at least one:

| Target | When |
|--------|------|
| **Comm log** | All calls |
| **Appointment** | Scheduled or request |
| **Task** | Urgent callback, billing, PMS update |
| **Confirmation status** | Inbound confirm |

Open Dental: `POST /commlogs` — see `knowledge/software/open-dental.md`.

---

## Peak Hour Behavior (Grand Rapids)

| Time | Front desk state | FreedomDesk value |
|------|------------------|-------------------|
| 8–9 AM | Check-in rush | Capture overflow |
| 12–1 PM | Lunch, half staff | Answer scheduling |
| 4–5 PM | Checkout rush | Reschedules, confirms |
| After hours | Closed | Emergency triage + intake |

---

## 60-Second Summary Rule

Office manager persona (Maria) should action FreedomDesk summary in **under 60 seconds**:

- [ ] Who called
- [ ] What they need (typed appointment)
- [ ] Urgency
- [ ] Insurance program level
- [ ] Next action (confirm, callback, verify ins)

If summary requires re-calling patient for basic fields, FreedomDesk failed intake.

---

## Related Documents

- `knowledge/office/private-practice-operations.md`
- `knowledge/ai/summarization.md`
- `docs/DENTAL_WORKFLOWS.md`
