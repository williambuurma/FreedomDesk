# Hygiene and Recall — Scheduling Reference

> **Audience:** FreedomDesk AI handling cleaning, recall, and periodontal hygiene calls.  
> **Purpose:** Book the **correct hygiene appointment type** and support recall-driven inbound calls.

---

## Recall Basics

Dental practices track when patients are due for:

| Recall item | Typical interval | CDT | Schedule as |
|-------------|------------------|-----|-------------|
| Adult prophy | 6 months | D1110 | Prophy Adult |
| Child prophy | 6 months | D1120 | Child Prophy |
| Periodic exam | 6–12 months | D0120 | Often attached to prophy |
| Bitewings | 6–24 months | D0272/D0274 | Part of visit, not separate booking |
| Perio maintenance | 3–4 months | D4910 | Perio Maint |
| SRP | As treatment planned | D4341/D4342 | SRP Quad — not recall |

Open Dental generates recall lists; FreedomDesk handles **inbound** recall responses.

---

## Prophy vs Perio Maintenance (Critical Distinction)

| | Prophy (D1110) | Perio Maintenance (D4910) |
|--|----------------|---------------------------|
| **Patient history** | Healthy gums; no SRP | Completed SRP; ongoing perio |
| **Caller says** | "Regular cleaning" | "Periodontal cleaning," "after deep cleaning" |
| **Wrong booking cost** | Clinical mismatch; insurance issues | |
| **FreedomDesk** | Default for "cleaning" if no perio history | If PMS or patient indicates SRP history |

**Caller:** "I just need my six-month cleaning."  
**If chart unavailable:** Schedule prophy; note `confirmProphyVsPerio: true` for front desk.

**Caller:** "I come every three months for my gums."  
**Map to:** Perio Maintenance — not prophy.

---

## Inbound Recall Call Flow

### Postcard / text response

**Caller:** "I got a reminder that I'm due for a cleaning."

```
1. Identify patient (name + DOB)
2. PMS recall lookup if available → confirm due date
3. "Any insurance changes since your last visit?"
4. Offer hygiene slots (2–3 options)
5. Confirm appointment
```

**Summary:**
```json
{
  "intent": "SCHEDULE_EXISTING",
  "appointment": { "type": "Prophy", "column": "hygiene" },
  "recall": { "drivenBy": "postcard | text | proactive", "due": true }
}
```

### Overdue recall (patient hasn't been in 12+ months)

- May need **longer block** or doctor exam attached
- Flag `reactivation: true` in summary
- Some offices treat as new patient exam if 24+ months — follow `practice_configs.reactivationThresholdMonths`

**Caller:** "I haven't been in a couple years but want a cleaning."  
**Action:** Existing patient lookup → if found, schedule prophy + note reactivation → if not found, new patient path.

---

## Hygienist Preference

**Caller:** "Can I see Sarah again?"  
**Action:** Note `providerPreference: "Sarah"` — offer slots if PMS supports hygienist filtering; otherwise flag for front desk.

Do not promise specific hygienist without slot confirmation.

---

## SRP Scheduling (Treatment, Not Recall)

SRP is **treatment**, usually planned by dentist/hygienist — not a routine "cleaning" request.

| Caller says | Action |
|-------------|--------|
| "I need deep cleaning" | "Has the doctor recommended scaling and root planing?" → If yes, schedule SRP quad per plan |
| "They said 4 quadrants" | May need multiple appointments — flag for front desk |
| "Only upper right done, need next" | `appointment.type: SRP`, `notes: "continue quads"` |

---

## Pediatric Hygiene

| Age | Type | Duration |
|-----|------|----------|
| Under 3 | Infant exam / knee-to-knee | 20–30 min — if practice accepts |
| 3–12 | Child prophy + exam | 30–45 min |
| 13+ | Adult prophy (usually) | 45–60 min — per office policy |

**Insurance:** HKD common — see `knowledge/insurance/healthy-kids-dental.md`.

**Caller:** "My 8-year-old is due for a checkup and cleaning."  
**Path:** Pediatric → child prophy → guardian name → HKD/Medicaid taxonomy.

---

## Insurance on Recall Calls

Always ask on hygiene scheduling:
> "Any changes to your dental insurance since your last visit?"

Michigan employers change plans in January — high volume of insurance updates in Q1.

---

## Waitlist for Hygiene

Hygiene columns in Grand Rapids offices often book **2–4 weeks out**. Common waitlist request.

**Caller:** "Do you have anything sooner than March?"  
**Action:** Waitlist flow → `appointmentType: Prophy`, `flexibility: "any morning"`.

---

## Combined Exam + Cleaning

Many offices schedule doctor periodic exam **same visit** as prophy:

- Single hygiene block with exam time built in
- OR separate doctor exam block same day

FreedomDesk does not split unless practice config requires — book `Prophy` and note "exam attached per office workflow."

---

## PMS Integration (Open Dental)

| Endpoint | Use |
|----------|-----|
| `GET /recalls?PatNum=` | Due date, recall type |
| `GET /appointments/Slots` | Hygiene operatory + hygienist provider |
| Appointment type | `Prophy Ad`, `Child Pro`, `Perio Maint` |

---

## Anti-Patterns

| Wrong | Right |
|-------|-------|
| Book overdue 2-year patient as quick prophy only | Flag reactivation; may need FMX + exam |
| Book perio maint as prophy | Ask SRP history |
| Promise "just a cleaning" for new patient | New patient exam |
| Skip insurance change question | Always ask on recall scheduling |

---

## Related Documents

- `knowledge/scheduling/appointment-types.md`
- `knowledge/insurance/healthy-kids-dental.md`
- `docs/DENTAL_WORKFLOWS.md` — Recall and Reactivation
