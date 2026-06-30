# Dental Workflows

> **Purpose:** Operational reference for how **West Michigan independent private dental practices** work — scheduling, insurance, emergencies, patient communication, and front desk procedures. Engineers and AI agents must understand these workflows to build FreedomDesk correctly. This document assumes the reader is building software for a **Grand Rapids–style general dentistry office** (1–3 doctors, 4–8 operatories, 1–3 front desk staff) — not a generic call center.

---

## Table of Contents

1. [West Michigan Practice Profile](#west-michigan-practice-profile)
2. [Practice Operations Overview](#practice-operations-overview)
3. [Front Desk Roles and Responsibilities](#front-desk-roles-and-responsibilities)
4. [Scheduling Workflows](#scheduling-workflows)
5. [Appointment Types and Durations](#appointment-types-and-durations)
6. [Treatment-Specific Scheduling](#treatment-specific-scheduling)
7. [Same-Day Emergency Workflow](#same-day-emergency-workflow)
8. [New Patient Workflow](#new-patient-workflow)
9. [Existing Patient Workflow](#existing-patient-workflow)
10. [Pediatric Scheduling](#pediatric-scheduling)
11. [Insurance Workflows — West Michigan](#insurance-workflows--west-michigan)
12. [Emergency Triage](#emergency-triage)
13. [Appointment Confirmations](#appointment-confirmations)
14. [Cancellations, Rescheduling, and Waitlist](#cancellations-rescheduling-and-waitlist)
15. [Demographics and Insurance Updates](#demographics-and-insurance-updates)
16. [Patient Communication](#patient-communication)
17. [Recall and Reactivation](#recall-and-reactivation)
18. [Billing and Financial Conversations](#billing-and-financial-conversations)
19. [Daily Office Rhythm — West Michigan GP](#daily-office-rhythm--west-michigan-gp)
20. [Regulatory and Documentation Requirements](#regulatory-and-documentation-requirements)

---

## West Michigan Practice Profile

FreedomDesk is optimized for this office archetype — the most common independent GP layout in the Grand Rapids metro:

| Attribute | Typical value |
|-----------|---------------|
| **Location** | Grand Rapids, MI (suburban or city) |
| **Specialty** | General dentistry (restorative, hygiene, some perio, extractions, limited endo/implant) |
| **Dentists** | 1–3 owner/associate GPs |
| **Operatories** | 4–8 (often 2–3 hygiene ops, 3–5 doctor ops) |
| **Hygienists** | 2–4 |
| **Assistants** | 2–4 |
| **Front desk** | 1–3 (phone, check-in/out, insurance verification, scheduling) |
| **PMS** | Open Dental (most common), Eaglesoft, Dentrix, CareStack |
| **Hours** | Mon–Thu 7/8 AM – 5/6 PM; Fri 7 AM – 2 PM or closed; Sat optional half-day hygiene |
| **Phone volume** | High 8:00–9:30 AM and 4:00–5:30 PM; after-hours emergencies Thu–Sun |
| **Insurance mix** | Delta Dental PPO (largest share), employer PPOs, Healthy Kids Dental, Michigan Medicaid, cash-pay |

### Design principle: front desk time is the bottleneck

Successful private practices are not short on clinical capacity — they are short on **front desk attention**. FreedomDesk must:

- Collect **complete intake once** on the phone so the front desk does not re-ask
- Label appointment type precisely (crown seat ≠ new patient exam ≠ emergency exam)
- Distinguish insurance types that look similar (Delta Dental PPO vs. Delta Dental Medicaid)
- Deliver summaries formatted for **Open Dental comm log paste** or task creation
- Flag same-day emergencies and waitlist matches so the front desk acts in under 60 seconds

---

## Practice Operations Overview

A private dental practice is a small healthcare business that combines clinical care, insurance administration, and hospitality. The front desk is the operational hub — every patient interaction that is not clinical happens here or on the phone.

### Typical West Michigan GP structure

| Role | Count | Primary responsibilities |
|------|-------|--------------------------|
| Dentist(s) | 1–3 | Clinical care, treatment planning, on-call emergency rotation |
| Hygienist(s) | 2–4 | Prophy, perio maintenance, SRP, fluoride, patient education |
| Dental assistant(s) | 2–4 | Chairside, sterilization, room turnover, some lab/denture steps |
| Front desk / reception | 1–3 | Phone, scheduling, check-in/out, insurance verification, payments |
| Office manager | 0–1 (often dual role) | Open Dental admin, billing, HR, vendor management, Medicaid compliance |

### Hours of operation (West Michigan typical)

| Day | Hours | Call pattern |
|-----|-------|--------------|
| Monday–Thursday | 7:00 AM – 5:00 PM or 8:00 AM – 6:00 PM | Peak 8–9 AM and 4–5 PM |
| Friday | 7:00 AM – 2:00 PM or closed | Moderate; afternoon closed |
| Saturday | 8:00 AM – 12:00 PM (optional) | Hygiene-only at many offices |
| Sunday | Closed | After-hours emergency line |
| Evenings | Closed | **Significant** toothache/trauma calls — West Michigan families call after work |

FreedomDesk must respect each practice's configured hours. "After-hours" behavior activates outside configured windows.

---

## Front Desk Roles and Responsibilities

### Phone answering priorities (in order)

1. **True dental emergency** — severe pain, trauma, uncontrolled bleeding, swelling affecting airway
2. **New patient inquiry** — highest revenue impact per call
3. **Same-day appointment need** — patient in pain or broken restoration
4. **Existing patient scheduling** — reschedule, confirm, cancel
5. **Billing/insurance questions** — can often be callback unless pre-appointment
6. **General information** — hours, directions, services offered

### What the front desk does on every call

1. **Answer within 3 rings** with practice name and agent name
2. **Identify caller intent** within first 30 seconds
3. **Look up patient** in PMS (existing) or begin intake (new)
4. **Collect required information** per call type
5. **Take action or promise callback** with specific timeframe
6. **Document in PMS** — comm log, appointment note, or task for dentist

FreedomDesk replicates steps 1–5 and produces structured output for step 6.

---

## Scheduling Workflows

### Scheduling constraints

Dental scheduling is constrained by multiple dimensions simultaneously:

| Dimension | Examples |
|-----------|----------|
| **Provider** | Dr. Smith (GP), Dr. Jones (endo referral) |
| **Operatory** | Op 1 (hygiene), Op 3 (restorative) |
| **Appointment type** | NPE (60 min), prophy (60 min), crown prep (90 min) |
| **Equipment** | Cerec machine, surgical suite |
| **Staff** | Assistant assigned to doctor |
| **Blocks** | Lunch 12–1, team meeting Wed 8 AM, admin time |
| **Insurance/day rules** | Medicaid only Tue/Thu (some practices) |

FreedomDesk does not need to solve full constraint scheduling initially. Phase 1: **offer pre-configured available slots** from PMS or practice-defined templates. Phase 2: real-time availability queries.

### Standard scheduling call flow

```
1. Greeting
2. "Are you a current patient with us?"
   ├── YES → Look up by name + DOB
   └── NO  → New patient intake path
3. "What can I help you schedule?"
4. Determine appointment type + duration
5. Check availability (PMS or configured slots)
6. Offer 2–3 options
7. Confirm selection
8. Collect/verify insurance (new or changed)
9. Provide arrival instructions
10. Confirm contact info for reminders
```

### Reschedule workflow

```
1. Identify patient (name + DOB)
2. Locate existing appointment in PMS
3. Confirm which appointment to move
4. Ask reason (optional — office policy)
5. Offer new times
6. Confirm new appointment
7. Note cancellation reason in PMS if required
```

**Cancellation policy:** Many practices require 24–48 hours notice. FreedomDesk communicates the policy but does not enforce fees — flags late cancellations for office review.

### Confirmation workflow

Many practices run confirmation calls/texts 1–2 days before appointments. Inbound confirmation calls ("I'm calling to confirm my appointment Thursday") are simple:

```
1. Identify patient
2. Locate appointment
3. Confirm date/time/provider
4. Mark confirmed in PMS (or note for staff)
```

---

## Appointment Types and Durations

FreedomDesk must use practice-configured appointment types. Defaults below are industry norms — **always defer to practice config**.

| Appointment type | Typical duration | Provider | Notes |
|-----------------|------------------|----------|-------|
| **New patient exam (comprehensive)** | 60–90 min | Doctor + hygienist or doctor only | Includes exam, X-rays, cleaning (sometimes separate visit) |
| **New patient exam (doctor only)** | 45–60 min | Doctor | X-rays and cleaning scheduled separately at some offices |
| **Periodic oral evaluation** | 15–30 min | Doctor | Existing patient exam (CDT D0120) |
| **Prophylaxis (adult cleaning)** | 45–60 min | Hygienist | CDT D1110 |
| **Prophylaxis (child)** | 30–45 min | Hygienist | CDT D1120 |
| **Periodontal maintenance** | 60 min | Hygienist | CDT D4910; post-SRP ongoing |
| **Scaling & root planing (SRP)** | 60–90 min per quadrant | Hygienist | Often 2–4 visits |
| **Emergency/exam limited** | 30–45 min | Doctor | Same-day or next-available |
| **Crown prep** | 60–90 min | Doctor | Often needs assistant + specific operatory |
| **Crown delivery/seat** | 30–45 min | Doctor | |
| **Filling/restorative** | 30–60 min | Doctor | Varies by surface count |
| **Extraction (simple)** | 30–45 min | Doctor | |
| **Extraction (surgical)** | 45–60 min | Doctor | May need surgical suite |
| **Root canal (consult/treatment)** | 60–90 min | Doctor or endo referral | Many GPs refer to endodontist |
| **Consultation (implant, ortho, cosmetic)** | 30–45 min | Doctor or TC | |
| **Whitening** | 60–90 min | Hygienist or assistant | |

### Scheduling hygiene vs. doctor

Many practices schedule hygiene and doctor production separately:

- **Hygiene columns** — hygienist schedule, cleanings, perio
- **Doctor columns** — restorative, exams attached to hygiene, emergencies

New patient exams may require **both** a doctor block and hygiene block, or a single extended block depending on office workflow.

---

## Treatment-Specific Scheduling

West Michigan general dentistry offices handle a predictable set of appointment types on the phone. FreedomDesk must classify each call to the **correct appointment type** so the front desk does not re-triage. Durations below are West Michigan GP norms — **always defer to practice config in Open Dental appointment types**.

### Hygiene recall (prophy / perio maintenance)

**When:** Existing patient due or overdue for cleaning; responds to postcard/text; or calls proactively.

| Field | Collect |
|-------|---------|
| Patient ID | Name + DOB |
| Last cleaning date | Confirm if PMS unavailable |
| Appointment type | Prophy (D1110) vs. perio maintenance (D4910) — hygiene knows from chart; FreedomDesk schedules "cleaning" and flags perio history if mentioned |
| Provider preference | Hygienist preference if caller asks |
| Insurance change | "Any insurance changes since your last visit?" |

**Front desk benefit:** Summary says `appointmentType: "Prophy"` with recall due flag — front desk drops into hygiene column, not doctor.

**Script note:**
> "I'd be happy to get you scheduled for your cleaning. I have [hygiene slots]. Would any of these work?"

---

### Crown seat (crown delivery)

**When:** Patient had crown prep weeks ago; lab case returned; front desk or assistant scheduled seat.

| Field | Collect |
|-------|---------|
| Patient ID | Name + DOB |
| Tooth / treatment | "Which tooth is the crown for?" (patient-facing language — not clinical diagnosis) |
| Prep date / provider | "Do you remember which doctor prepped it?" |
| Appointment type | Crown seat — typically **30–40 min** doctor block |
| Urgency | Temporary off? Pain? → may upgrade to urgent |

**Scheduling rules:**
- Crown seats are **doctor column** — not hygiene
- Often scheduled 2–3 weeks after prep when lab case confirmed
- Some offices batch crown seats in specific operatory with assistant

**Front desk benefit:** Summary specifies `crownSeat: true`, tooth number if given, provider — avoids misbooking as "exam."

---

### Root canal

**When:** Patient told they need root canal; referral from GP to endo; or GP office does limited endo in-house.

| Field | Collect |
|-------|---------|
| Patient ID | Name + DOB |
| Tooth / area | "Which tooth is bothering you?" |
| Referral status | In-house vs. referred to endodontist |
| Pain level | Triage if active pain → may be same-day emergency |
| Appointment type | RCT consult vs. RCT treatment start — different durations |

**West Michigan GP pattern:**
- Many GPs **refer molars/complex cases** to endodontist (Grand Rapids has multiple endo practices)
- Some GPs do anterior/premolar RCT in-house
- FreedomDesk follows practice config: `rootCanalInHouse: true/false`, referral script if false

**If referring out:**
> "Dr. [Name] would refer that to a specialist. I can note your information and our team will call you with a referral and next steps."

**Never:** Diagnose "you need a root canal" — only schedule if patient says treatment was already recommended.

---

### Extraction (simple and surgical)

**When:** Treatment planned extraction; emergency extraction for pain; wisdom tooth consult.

| Field | Collect |
|-------|---------|
| Patient ID | Name + DOB |
| Planned vs. emergency | Already discussed with doctor vs. new pain |
| Tooth / area | Location in mouth |
| Medical history flags | "Are you on blood thinners?" → collect yes/no, route to clinical review — do not advise stopping meds |
| Appointment type | Simple extraction (30–45 min) vs. surgical (45–60 min) vs. consult |
| Sedation / nitrous | Patient may ask — "Our team can discuss sedation options when they confirm your appointment." |

**Same-day:** Pain + swelling may trigger [Same-Day Emergency Workflow](#same-day-emergency-workflow).

---

### Implant consultation

**When:** Patient interested in implant; referred for missing tooth; existing patient with treatment plan.

| Field | Collect |
|-------|---------|
| Patient ID | Name + DOB |
| New vs. existing | Full intake if new |
| Reason | Missing tooth, failing tooth, denture alternative |
| Referral | Some GPs place implants; others refer to periodontist/oral surgeon |
| Appointment type | Implant consult — **30–45 min**, often with CT discussion |

**Script:**
> "I'll schedule you for an implant consultation with Dr. [Name]. We'll review your options and imaging at that visit."

**Never:** Quote implant fees or promise candidacy on the phone.

---

### Denture workflows

Dentures involve **multiple appointments** — FreedomDesk must identify which stage:

| Stage | Typical duration | Caller might say |
|-------|------------------|------------------|
| **New denture consult** | 30–45 min | "I need dentures" / "All my teeth need to come out" |
| **Impression appointment** | 45–60 min | "I'm ready for impressions" |
| **Try-in / wax try** | 30–45 min | "Fitting for my dentures" |
| **Delivery / insert** | 45–60 min | "Getting my new dentures" |
| **Reline / rebase / repair** | 30 min | "My denture is loose" / "denture broke" |
| **Adjustment** | 15–30 min | "Denture is rubbing" — may be urgent if sore |

**Broken denture:** Usually priority within 48–72 hours — patient may be without teeth. Collect whether they have a spare.

**Front desk benefit:** Summary includes `dentureStage: "reline" | "delivery" | ...` — not generic "denture appointment."

---

### Restorative (fillings, crown prep, bridge)

| Type | Duration | Notes |
|------|----------|-------|
| Filling | 30–60 min | Surfaces affect length |
| Crown prep | 60–90 min | Assistant + operatory; temp crown |
| Bridge prep | 60–90 min | Similar to crown prep |
| Post-op follow-up | 15 min | "Check on crown prep" — route per office |

Patient usually says "I need to schedule what the doctor recommended" — FreedomDesk collects **treatment description from patient words** and flags for front desk to match treatment plan in Open Dental.

---

## Same-Day Emergency Workflow

Same-day emergencies are a **daily operational reality** in busy West Michigan GP offices — especially Mondays and post-holiday weekends. FreedomDesk must distinguish same-day emergency scheduling from routine booking.

### When same-day applies

| Trigger | Action |
|---------|--------|
| Severe pain (caller-described) | Triage → urgent → same-day emergency slot or on-call |
| Broken tooth with pain | Same-day if slot available |
| Lost crown with pain | Same-day or next-day |
| Post-extraction complication | Urgent callback; same-day if bleeding controlled |
| Swelling + fever | Emergency — on-call + ER guidance |
| Trauma / avulsion | Emergency — immediate on-call |

### Same-day workflow (business hours)

```
1. Triage symptoms (see Emergency Triage)
2. Classify urgency
3. IF urgent/emergency AND office open:
   a. "Let me see what we have available today."
   b. Offer same-day emergency slot (PMS query or configured emergency blocks)
   c. IF no slot: "I'll flag this urgent — our team will call you back within [X] minutes to work you in."
4. Collect: name, DOB, phone, symptoms summary, pain level (caller description)
5. Summary: urgency + sameDayRequested: true + symptoms
```

### Same-day workflow (after hours)

```
1. Triage → flag urgent/emergency
2. On-call dentist callback per rotation schedule
3. IF life-threatening → ER / 911 guidance
4. Collect contact info; promise callback timeframe from practice config
5. Summary delivered to on-call via SMS + email with URGENT flag
```

### Emergency block scheduling (Open Dental context)

Many West Michigan offices maintain **emergency blocks** — 30–45 min doctor slots held daily or released at 8 AM. FreedomDesk Phase 2+ queries these via Open Dental `/appointments/Slots` with emergency appointment type. Phase 1: summary flags `sameDayEmergency: true` for front desk to squeeze in.

### What FreedomDesk never does on same-day calls

- Diagnose cause of pain
- Promise a specific time without slot confirmation
- Tell patient to take specific medication/dose
- Decline urgency because schedule is full (always flag for staff)

---

## New Patient Workflow

New patients are the **highest-value phone calls**. A new patient exam generates $200–$400+ in first-visit production and $1,500–$3,000+ lifetime value.

### Phone intake (FreedomDesk responsibility)

**Required fields:**

| Field | Required | Notes |
|-------|----------|-------|
| Full legal name | Yes | As it appears on insurance |
| Date of birth | Yes | Patient lookup dedup |
| Phone number | Yes | Primary contact |
| Email | Preferred | For forms and reminders |
| Insurance carrier | Yes | **Use Michigan taxonomy** — Delta Dental PPO vs. Delta Dental Medicaid vs. Healthy Kids Dental vs. Michigan Medicaid vs. cash-pay |
| Member ID / Medicaid ID | If insured | Critical for Medicaid/HKD — front desk needs this for verification |
| Chief complaint / reason for visit | Yes | "What brings you in?" |
| Referral source | Preferred | Google, friend, dentist referral |
| Preferred provider | Optional | "Any preference for dentist?" |
| Preferred days/times | Yes | For scheduling offer |

**Optional fields (Custom tier):**

- Employer name
- Previous dentist name
- Medical alerts (allergies — collect but do NOT store as medical advice; flag for office)
- Special accommodations

### Greeting script (example)

> "Thank you for calling [Practice Name]. This is Aly. How can I help you today?"

### New patient without insurance

```
"We absolutely see patients without insurance. We'd be happy to discuss fees at your visit.
For a new patient exam, we set aside about [duration]. I have [option A] or [option B] — would either work?"
```

Never quote specific fees unless the practice has configured fee disclosure in FreedomDesk.

### New patient arrival instructions

> "We'll send a confirmation text with your appointment details. If you could arrive about 15 minutes early to complete your new patient paperwork, that would be great. You can also fill out forms online — I can text you the link."

### Post-call office workflow (not FreedomDesk — for context)

1. Front desk reviews FreedomDesk summary
2. Creates patient record in PMS (or verifies auto-created)
3. Sends new patient forms (online or paper)
4. Runs insurance verification (see Insurance section)
5. Adds appointment to schedule
6. Sends confirmation text/email from PMS

---

## Existing Patient Workflow

### Patient identification

Always verify with **name + date of birth**. Phone number alone is insufficient (family plans, shared phones).

```
"Can I get your full name and date of birth so I can pull up your chart?"
```

If multiple matches, ask for address or last four of phone.

### Common existing patient call types

| Call type | Key actions | FreedomDesk handling |
|-----------|-------------|---------------------|
| Schedule cleaning | Check recall due date, offer hygiene slots | Query PMS recall or offer configured hygiene times |
| Schedule treatment | Reference pending treatment plan | Note treatment needed; schedule per configured types |
| Reschedule | Find appointment, offer alternatives | PMS lookup + reschedule or request |
| Cancel | Find appointment, note reason | Cancel or flag for office; state cancellation policy |
| Confirm appointment | Mark confirmed | Confirm details; note in summary |
| Billing question | Balance inquiry | **Do not quote balance** — collect question, route to billing |
| Insurance question | Coverage inquiry | General accepted/not accepted; no guarantee of coverage |
| Prescription | Refill request | Collect medication name; route to dentist (never prescribe) |
| Post-op question | Pain, healing concern | Triage urgency; route per protocol; no clinical advice |
| Complaint | Service dissatisfaction | Empathize; collect details; route to office manager |

### Recall-driven scheduling

When an existing patient calls and is due (or overdue) for cleaning:

```
"It looks like you're due for your regular cleaning. I have [hygiene slots]. Would any of these work?"
```

If PMS integration unavailable, ask: "When was your last cleaning with us?" and proceed.

---

## Pediatric Scheduling

West Michigan family practices see many **Healthy Kids Dental (HKD)** and **Michigan Medicaid** pediatric patients alongside commercial Delta Dental families.

### Age-based appointment types

| Age | Appointment type | Duration | Notes |
|-----|------------------|----------|-------|
| Under 3 | Infant exam / knee-to-knee | 20–30 min | Some offices accept; others refer |
| 3–12 | Child prophy (D1120) + exam | 30–45 min | Hygiene + doctor exam |
| 13+ | Adult prophy (D1110) or per config | 45–60 min | Transition age varies by office |

### Pediatric intake differences

| Field | Notes |
|-------|-------|
| **Patient name + DOB** | Required |
| **Parent/guardian name** | Required if caller is parent |
| **Insurance** | HKD and Michigan Medicaid common — use exact program name |
| **Medicaid ID** | Collect if available — essential for front desk |
| **Chief complaint** | Parent describes; use parent-friendly language |
| **Behavior/special needs** | "Anything we should know to make the visit comfortable?" — optional, flag in summary |

### Parent calling vs. adult patient

- Verify guardian authority before discussing appointment details for minors
- Schedule in parent's name contact fields; patient record under child
- Confirmation texts go to parent phone on file

### Script (pediatric new patient)

> "We'd love to meet [child's name]. How old are they? ... For a first visit we usually set aside about [duration]. I have [slots]. Would any work for you and [child]?"

**Never:** Give behavioral predictions or sedation advice on the phone.

---

## Insurance Workflows — West Michigan

Dental insurance in West Michigan independent practices is dominated by **Delta Dental of Michigan** and state Medicaid programs. FreedomDesk handles **intake and general questions** — not eligibility verification or claims. The front desk runs verification in Open Dental after FreedomDesk collects accurate **program-level** insurance classification.

### Priority insurance taxonomy (configure per practice)

FreedomDesk must distinguish these — they are **not interchangeable** on intake:

| Priority | Plan | What callers say | FreedomDesk collects |
|----------|------|------------------|---------------------|
| **1** | **Delta Dental PPO** | "Delta Dental," "I have Delta through work" | Carrier: Delta Dental; plan type: PPO; member ID if available |
| **2** | **Delta Dental Medicaid** | "Delta for Medicaid," "State insurance through Delta" | Carrier: Delta Dental; plan type: Medicaid; Medicaid ID |
| **3** | **Healthy Kids Dental (HKD)** | "Healthy Kids," "My kids have state dental" | Program: HKD; child's name + DOB; Medicaid ID |
| **4** | **Michigan Medicaid (non-HKD adult)** | "Medicaid," "State insurance," "MI Health" | Program: Michigan Medicaid; Medicaid ID |
| **5** | **Other PPO** | "Blue Cross," "Aetna," "Cigna," "MetLife," "Guardian," "United" | Carrier name; member ID; employer if known |
| **6** | **Cash-pay / no insurance** | "No insurance," "Self-pay" | `insurance: none` — do not treat as Medicaid |

### Why taxonomy matters

- **Delta Dental PPO** — fee-for-service PPO; annual max ~$1,000–$2,000; most Grand Rapids employers
- **Delta Dental Medicaid** — capitation/fee schedule; different fee schedule and verification in Open Dental
- **Healthy Kids Dental** — pediatric Medicaid managed through Delta; age limits; common in family practices
- **Michigan Medicaid adult** — limited adult dental benefit; not all GPs accept; must check practice config
- Misclassification wastes front desk time re-verifying and causes claim errors

### Plan types (general)

| Type | Patient experience | FreedomDesk guidance |
|------|-------------------|---------------------|
| **PPO (Preferred Provider Organization)** | Can see out-of-network but pays less; annual max ($1,000–$2,000 typical) | "We are in-network with [carrier]" if configured |
| **HMO / DMO (Dental Maintenance Organization)** | Must see assigned dentist; limited out-of-network | "We accept [carrier] HMO" only if configured; warn about assignment requirements |
| **Indemnity / Fee-for-service** | Any dentist; insurance pays percentage | "We will file your claim for you" |
| **Discount plans (not insurance)** | Reduced fees at participating offices | "We participate with [plan name]" if configured |
| **Medicaid / State insurance** | Government-funded; restricted | Only if practice configured as Medicaid provider |
| **No insurance (self-pay)** | Full fee | "We see self-pay patients; fees discussed at visit" |

### What FreedomDesk CAN say about insurance

- Whether the practice **accepts** or is **in-network** with a carrier (from config)
- That the patient should **bring their insurance card** to the visit
- That **benefits will be verified** before or at the appointment
- General explanation of how dental insurance works (annual max, deductible) if caller asks — without quoting their specific benefits

### What FreedomDesk MUST NOT say

- "Your procedure will be covered"
- "You will owe $X" (specific dollar amounts)
- "You have $Y remaining on your annual maximum" (requires real-time eligibility)
- Guarantee any payment amount from insurance

### Insurance intake script (West Michigan)

```
"Do you have dental insurance you'd like us to have on file before your visit?"

If YES:
  "Who is your insurance carrier?"
  [Map to taxonomy — clarify if ambiguous:]
  IF "Delta":
    "Is that Delta Dental through an employer, or state insurance like Medicaid or Healthy Kids?"
  IF "State insurance" / "Medicaid":
    "Is this for you or your child? Healthy Kids Dental covers children on Medicaid."
  "Do you have your member ID or Medicaid ID handy?"
  "Is the policy under your name or someone else's?"

If NO:
  "No problem — we see many patients without insurance. We'll go over fees at your visit."
```

### Medicaid and HKD — practice acceptance

**Only** schedule Medicaid/HKD patients if `practice_config.acceptsMedicaid: true` and specific programs listed. If not accepted:

> "For that insurance plan, we'd recommend contacting [community health center / Medicaid dental list]. I can still help if you'd like to be seen as a cash-pay patient — our team can discuss fees at your visit."

Never promise Medicaid coverage or benefits.

### Cash-pay patients

Common in West Michigan independents — especially patients between jobs or without employer dental.

> "We absolutely see patients without insurance. We'll go over fees and payment options at your visit."

Never quote fee schedule unless practice configures specific disclosure.

### Insurance verification (office workflow — context only)

After FreedomDesk intake, the office (not FreedomDesk Phase 1) typically:

1. Runs eligibility check via clearinghouse (DentalXChange, Change Healthcare, Availity)
2. Verifies annual maximum remaining, deductible met, frequency limitations
3. Documents in PMS insurance plan fields
4. Informs patient of estimated patient portion at visit

FreedomDesk Phase 3+ may integrate eligibility APIs — see [ROADMAP.md](ROADMAP.md).

### Other common West Michigan carriers

Blue Cross Blue Shield of Michigan (dental), Cigna, Aetna, MetLife, Guardian, Humana, United Healthcare, Principal, GEHA (federal employees). Practice config lists accepted PPOs explicitly.

---

## Emergency Triage

Dental emergencies require careful triage without clinical diagnosis. FreedomDesk follows **office-configured protocols** layered on industry-standard urgency classification.

### Urgency levels

| Level | Definition | Examples | FreedomDesk action |
|-------|------------|----------|-------------------|
| **Emergency (immediate)** | Life-threatening or requires same-day care | Uncontrolled bleeding, airway compromise, severe trauma with jaw fracture, spreading facial cellulitis with fever | Route to on-call dentist immediately; advise ER if life-threatening |
| **Urgent (same/next day)** | Significant pain or risk of permanent damage | Severe toothache, abscess with swelling, avulsed/broken tooth, lost crown with pain, post-extraction bleeding (controlled) | Flag urgent; schedule emergency slot or on-call callback within 1 hour |
| **Priority (48–72 hours)** | Uncomfortable but stable | Mild-moderate ache, broken tooth without pain, lost filling, broken denture | Schedule next available emergency/exam slot |
| **Routine** | No urgency | Chipped tooth (no pain), cosmetic concern, general question | Schedule regular appointment |

### Triage questions (screening — not diagnosis)

FreedomDesk asks these to classify urgency:

1. **"Are you in pain right now? Can you describe it — sharp, throbbing, constant?"**
2. **"When did this start?"**
3. **"Is there any swelling in your face or gums?"**
4. **"Do you have a fever or feel unwell?"**
5. **"Did anything happen — an injury, fall, or biting something hard?"**
6. **"Are you bleeding? Can you control it with pressure?"**
7. **"Have you taken anything for the pain?"** (collect info — do not recommend medications)

### Emergency routing (configurable per practice)

```
EMERGENCY detected
       │
       ├── During office hours → "Let me connect you with our team" OR schedule emergency slot
       │
       └── After hours
               ├── On-call dentist available → "I'm flagging this as urgent. Dr. [Name] will call you back within [X] minutes."
               ├── Partner oral surgeon → Refer per protocol
               └── Life-threatening → "Please go to the nearest emergency room or call 911."
```

### After-hours emergency script (from demo)

> "I'm so sorry you're dealing with that. Are you having any swelling or fever with the pain?"
>
> "Okay, thank you for letting me know. I'm going to flag this as urgent for our on-call team right away."
>
> "Someone from our team will call you back as soon as possible. If the pain becomes severe, you develop swelling or a fever, please seek urgent care or your dentist's emergency line right away."

### Scenarios reference

| Scenario | Urgency | Typical routing |
|----------|---------|-----------------|
| Severe toothache, no swelling/fever | Urgent | Same/next day emergency slot or on-call callback |
| Toothache + facial swelling + fever | Emergency | Immediate on-call; ER if spreading |
| Broken/chipped tooth, no pain | Priority | Next available slot (1–3 days) |
| Broken tooth with pain | Urgent | Same-day if possible |
| Knocked-out permanent tooth (avulsion) | Emergency | Immediate — reimplant window ~60 min; on-call NOW |
| Lost crown, no pain | Priority | 48–72 hours |
| Lost crown with pain | Urgent | Same/next day |
| Post-extraction bleeding (controlled with gauze) | Urgent | On-call callback |
| Post-extraction bleeding (uncontrolled) | Emergency | ER or immediate on-call |
| Broken denture | Routine–Priority | Depends on patient needs |
| Orthodontic wire poking | Priority | Next available |
| TMJ/jaw pain, can open/close | Priority | Next available |
| Jaw locked open/closed | Emergency | ER or oral surgeon |

### Absolute prohibitions

- Never diagnose ("That sounds like an abscess")
- Never prescribe ("Take ibuprofen 600mg" — unless practice has pre-approved post-op scripts in config)
- Never dismiss ("It's probably nothing")
- Never guarantee same-day availability without checking schedule

---

## Appointment Confirmations

West Michigan offices send automated confirmation texts 48–24 hours before visits (Open Dental eConfirmations or similar). Patients still call to confirm — especially Monday mornings.

### Inbound confirmation call

```
1. Identify patient (name + DOB)
2. Locate upcoming appointment in PMS (or ask "What day is your appointment?")
3. Read back: date, time, provider, appointment type
4. Mark confirmed in PMS if integration available; otherwise note in summary
5. Remind arrival time / forms if new patient
```

**Script:**
> "Hi [Name], I see your [cleaning / crown seat / appointment] on [Day] at [Time] with [Provider]. You're all confirmed. Please arrive [X] minutes early. See you then!"

### Patient running late

```
1. Identify patient + today's appointment
2. Collect ETA
3. Summary flags `runningLate: true` with ETA — front desk decides if schedule accommodates
4. Do not promise they can still be seen
```

> "Thanks for letting us know. I'll pass that along to our team right away."

### Patient asking "Do I still have an appointment?"

Same as confirmation — verify identity, read appointment details from PMS or collect from caller.

---

## Cancellations, Rescheduling, and Waitlist

### Cancellation workflow

```
1. Identify patient (name + DOB)
2. Locate appointment(s) — confirm which one to cancel
3. Optional: reason for cancellation (office policy)
4. State cancellation policy if within window: "Our policy is [24/48] hours notice."
5. Offer to reschedule now vs. call back later
6. Summary: cancelled appointment details + lateCancellation flag if applicable
```

**Front desk benefit:** Cancelled slot visible immediately — office can fill from waitlist.

### Reschedule workflow

See [Scheduling Workflows](#scheduling-workflows). Summary must include **old slot** and **new slot** (or requested times if appointment request mode).

### Waitlist management

Busy Grand Rapids offices maintain mental or PMS waitlists for:

- Hygiene openings (especially before holidays)
- Popular early-morning slots
- Crown seats when lab case arrives early
- Same-day emergency squeeze-in queue

**When patient calls about waitlist:**

```
1. Identify patient
2. "What type of appointment were you waiting for?"
3. Confirm contact info and flexibility ("Any day this week?" / "Mornings only?")
4. Summary: waitlistRequest with appointmentType, flexibility, dateAdded
```

**When patient accepts a waitlist opening (outbound — future):** Not Phase 1. Inbound: patient returns call about opening → treat as schedule/reschedule.

**If no PMS waitlist integration (Phase 0–1):**
> "I've noted that you'd like an earlier [cleaning / appointment]. Our team will call you if something opens up."

Summary includes `waitlist: true` + preferences — front desk updates Open Dental task or spreadsheet.

### Short-notice cancellation → waitlist match (office workflow context)

When FreedomDesk handles a cancellation call, summary should prompt front desk: **"Slot opened: [Day/Time] — check waitlist for [appointment type]."** Future Phase: automated waitlist notification.

---

## Demographics and Insurance Updates

Patients call to update information the front desk would otherwise chase:

### Common update requests

| Update type | Collect | FreedomDesk action |
|-------------|---------|-------------------|
| **Phone number** | New number; confirm if cell for texts | Summary → PMS update task |
| **Address** | New full address | Summary → PMS update task |
| **Email** | New email | Summary → PMS update task |
| **Employer / insurance change** | New carrier, member ID, effective date | Full insurance re-intake using Michigan taxonomy |
| **Name change** | New legal name, reason (marriage, etc.) | Summary → front desk (may need new card/ID) |
| **Emergency contact** | Name + phone | Summary → PMS update task |
| **Pharmacy change** | Pharmacy name/location | Route to clinical — prescription-related |

### Verification before discussing account

Always **name + DOB** before confirming or changing record details.

### Insurance change script

> "Thanks for letting us know. Who is your new insurance carrier?"
> [Run Michigan insurance taxonomy flow]
> "We'll verify your new benefits before your next visit. Please bring your new card."

**Never:** Tell patient old insurance "won't cover" future treatment — route to billing.

### Summary schema extension

```json
{
  "intent": "DEMOGRAPHICS_UPDATE",
  "updates": {
    "phone": "+16165550199",
    "insurance": { "carrier": "Delta Dental", "planType": "PPO", "memberId": "XXX" }
  },
  "actionItems": [{ "type": "pms_update", "assignee": "front_desk" }]
}
```

---

## Patient Communication

### Channels

| Channel | Used for | FreedomDesk role |
|---------|----------|-----------------|
| **Phone** | Primary inbound | Core product |
| **SMS/text** | Confirmations, reminders, forms links | Trigger via PMS integration or post-call |
| **Email** | Forms, receipts, newsletters | Summary delivery; form links |
| **Patient portal** | Forms, messaging, payments | Not FreedomDesk core (PMS feature) |

### Tone and language

- Warm, professional, plain language
- Avoid dental jargon with patients ("prophylaxis" → "cleaning")
- Use patient name naturally (not every sentence)
- Empathize before proceeding on pain/urgency calls
- Confirm understanding: "Just to make sure I have this right..."

### Confirmation and reminders (context)

Most practices send:

- **Confirmation text** immediately after scheduling
- **Reminder text** 48 hours and/or 24 hours before appointment
- **Form link** for new patients (online intake)

FreedomDesk promises what the practice configures: "We'll send a confirmation text" only if the practice has automated confirmations enabled.

### HIPAA in communication

- Verify identity before discussing appointment details on inbound calls
- Do not leave detailed medical info on voicemail without patient consent on file
- SMS must not include clinical details — "You have an appointment tomorrow at 9 AM" not "Your root canal is tomorrow"

---

## Recall and Reactivation

### Recall system

Dental practices track when patients are due for periodic exams and cleanings:

| Recall type | Typical interval | CDT code |
|-------------|-----------------|----------|
| Prophy (cleaning) | 6 months | D1110/D1120 |
| Periodic exam | 6–12 months | D0120 |
| Bitewing X-rays | 6–12 months | D0272/D0274 |
| Full mouth X-rays | 3–5 years | D0210 |
| Periodontal maintenance | 3–4 months | D4910 |

PMS generates recall lists. FreedomDesk does not run outbound recall campaigns in Phase 1 but handles **inbound recall responses** ("I got a postcard saying I'm due for a cleaning").

### Reactivation

Patients overdue 12–24+ months are "inactive." Inbound calls from inactive patients follow new patient intake if no record found, or existing patient workflow with reactivation flag.

---

## Billing and Financial Conversations

### What callers ask

- "What's my balance?"
- "Do you have a payment plan?"
- "Why did insurance only pay X?"
- "Can I get a statement?"
- "I need a receipt for my FSA/HSA"

### FreedomDesk handling

| Question | Response approach |
|----------|-------------------|
| Balance inquiry | "I'll have our billing team look into that and call you back. Can I confirm the best number?" |
| Payment plan | "We do offer payment options — our team can go over those with you. I'll have someone call you back." |
| Insurance payment dispute | Route to billing; do not explain EOB |
| Statement/receipt request | Collect request; route to billing |
| Fee estimate for treatment | "Treatment costs depend on your specific plan. We'll review that at your visit." |

**Never quote account balances** — requires PMS billing integration with auth.

---

## Daily Office Rhythm — West Michigan GP

Understanding daily rhythm in a Grand Rapids-style office helps FreedomDesk prioritize and set expectations.

| Time | Front desk activity | Call volume |
|------|--------------------|----|
| 7:00–8:00 AM | Open office, review day sheet, morning huddle | Low |
| 8:00–9:00 AM | Check-ins, confirmations, late calls | **High** |
| 9:00–11:30 AM | Steady clinical day, phone between patients | Medium |
| 11:30–1:00 PM | Lunch (often half-staffed), scheduling calls | Medium–High |
| 1:00–4:00 PM | Afternoon production, checkout | Medium |
| 4:00–5:00 PM | Checkouts, next-day prep, end-of-day calls | **High** |
| After hours | Voicemail/emergency line | Low volume, high urgency |

FreedomDesk provides maximum value during **peak hours** (8–9 AM, 4–5 PM) and **after hours** (evenings, weekends).

---

## Regulatory and Documentation Requirements

### HIPAA

All patient information collected by phone is PHI. FreedomDesk must:

- Collect minimum necessary information
- Transmit and store securely
- Allow patients to request access/correction through the practice
- Not disclose PHI to unauthorized parties

### Informed consent

- Call recording consent where required by state law
- New patient forms include HIPAA privacy notice acknowledgment

### Documentation in PMS

Every patient contact should be documented:

- **Comm log entry** — summary of call, action taken
- **Appointment** — if scheduled
- **Task** — if follow-up needed by dentist or billing

FreedomDesk summaries map directly to comm log content.

---

## Related Documents

- [CALL_FLOWS.md](CALL_FLOWS.md) — phone conversation scripts and decision trees
- [PRACTICE_MANAGEMENT_SOFTWARE.md](PRACTICE_MANAGEMENT_SOFTWARE.md) — PMS data models for scheduling and patient records
- [FREEDOMDESK_CONTEXT.md](FREEDOMDESK_CONTEXT.md) — product principles
- [ARCHITECTURE.md](ARCHITECTURE.md) — summary schemas and integration
