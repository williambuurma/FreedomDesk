# Open Dental — FreedomDesk Integration Reference

> **Priority:** #1 PMS for West Michigan independents. **Reference implementation** for all FreedomDesk adapters.  
> **Audience:** Engineers and AI agents needing PMS context during calls.

---

## Why Open Dental First

| Factor | Detail |
|--------|--------|
| Grand Rapids prevalence | High among tech-forward independents |
| API quality | REST API, documented, widely used |
| FreedomDesk fit | Comm logs, slots, recalls map cleanly to phone workflows |
| Founder familiarity | Primary PMS in target market |

---

## Deployment Models

| Model | FreedomDesk connection |
|-------|------------------------|
| **On-premise server** | API at practice server URL; may need VPN |
| **Open Dental Cloud** | Hosted API endpoint |
| **eConnector** | Required for some on-prem API features |

Credentials: Developer Key + Customer Key per practice (vault-stored).

---

## Entities FreedomDesk Uses

| OD Entity | API | Phone call use |
|-----------|-----|----------------|
| Patient (`PatNum`) | `/patients` | Lookup: LName + FName + Birthdate |
| Appointment (`AptNum`) | `/appointments` | Confirm, reschedule, cancel |
| Slots | `/appointments/Slots` | Offer real times (Tier 3) |
| Provider (`ProvNum`) | `/providers` | Dr. vs hygienist |
| Operatory (`Op`) | `/operatories` | Scheduling constraint |
| Appointment Types | `/appointmenttypes` | Duration, pattern |
| Recall | `/recalls` | "Due for cleaning" |
| Comm Log | `/commlogs` | **Write-back target for summaries** |
| Pat Plan | `/patplans` | Insurance linkage (read; write Phase 2+) |

---

## Patient Lookup (Existing Patient Calls)

```
GET /patients?LName=Leo&FName=Finn&Birthdate=1990-01-15
```

| Results | FreedomDesk behavior |
|---------|---------------------|
| 0 matches | "I'm not finding a record — are you a new patient?" |
| 1 match | Proceed with `pmsPatientId: PatNum` |
| 2+ matches | "Can you confirm your address or phone on file?" |

**Always verify name + DOB on phone** — never rely on caller ID alone.

---

## Appointment Types (West Michigan GP Examples)

Exact names vary — sync from `/appointmenttypes` into `practice_configs`:

| Caller intent | Example OD type | Column |
|---------------|-----------------|--------|
| New patient exam | `NP Comp Exam` | Doctor |
| Cleaning | `Prophy Ad` / `Child Pro` | Hygiene |
| Crown seat | `Crown Del` | Doctor |
| Emergency | `Emerg` / `Limited` | Doctor |
| Perio maint | `Perio Maint` | Hygiene |

FreedomDesk maps canonical `appointment.type` → office `appointmentTypeId`.

---

## Scheduling Integration

### Availability query

```
GET /appointments/Slots?dateStart=2026-07-01&dateEnd=2026-07-14&ProvNum=1&OpNum=3
```

Returns open slots respecting blockouts and existing appointments.

### Create appointment (request mode)

```
POST /appointments
{
  "PatNum": 123,
  "AptDateTime": "2026-07-03T09:00:00",
  "ProvNum": 1,
  "Op": 3,
  "Pattern": "//XXXX//",
  "ProcDescript": "New Patient Exam",
  "Note": "FreedomDesk. Delta PPO. Verify ins."
}
```

Phase 1 default: **appointment request** — front desk confirms.

### Time patterns

OD uses pattern strings (`/`, `X`) for chair time — adapter translates `durationMinutes` ↔ pattern.

---

## Comm Log Write-Back (Summary Delivery)

Primary Tier 2 write target — maps to front desk workflow:

```
POST /commlogs
{
  "PatNum": 123,
  "CommDateTime": "2026-06-30T14:30:00",
  "Mode": "Phone",
  "SentOrReceived": "Received",
  "Note": "[FreedomDesk summary — structured or human-readable]"
}
```

**Design goal:** Front desk copies summary into comm log with **zero re-typing** of name, phone, insurance, appointment type.

---

## Recall Integration

```
GET /recalls?PatNum=123
```

Enables:
> "It looks like you're due for your regular cleaning."

If API unavailable, ask: "When was your last cleaning with us?"

---

## Clinic Mode (Multi-Location)

Practices with multiple sites use `ClinicNum`. All queries filter by `practice_config.clinicNum`.

---

## Insurance in Open Dental

FreedomDesk collects intake → front desk maps to:

- `insplan` — plan definition
- `patplan` — patient ↔ plan linkage

**Do not write insurance from FreedomDesk Phase 1** unless validated — intake in summary is sufficient.

Taxonomy in summary must match Michigan programs (Delta PPO vs HKD) so Maria can pick correct plan in OD.

---

## Common Open Dental Front Desk Tasks (Context)

| Task | FreedomDesk helps by |
|------|---------------------|
| Morning huddle | Accurate next-day appointment notes |
| eConfirmations | Confirm calls documented |
| Task list | Urgent items with symptoms |
| Family accounts | Collect each patient separately — OD uses family linking |

---

## Error Handling

| Condition | Caller experience |
|-----------|-------------------|
| API down | "One moment — I'm having trouble pulling up the schedule. I can take your information and have our team confirm." |
| Auth failure | Alert practice; summary-only mode |
| No slots | Next available + waitlist |

---

## Integration Checklist

- [ ] Developer Key + Customer Key in vault
- [ ] eConnector running (on-prem)
- [ ] Appointment types synced to config
- [ ] Provider/operatory IDs mapped
- [ ] Clinic num if applicable
- [ ] Test: patient search, slots, commlog POST
- [ ] Emergency appointment type ID configured

---

## Related Documents

- `docs/PRACTICE_MANAGEMENT_SOFTWARE.md`
- `knowledge/scheduling/appointment-types.md`
- `knowledge/office/front-desk-workflows.md`
