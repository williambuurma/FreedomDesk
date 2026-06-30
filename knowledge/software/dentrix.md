# Dentrix — FreedomDesk Integration Reference

> **Priority:** #3 in West Michigan; **#1 nationally**.  
> **Audience:** Engineers — product line determines integration path entirely.

---

## Critical: Which Dentrix Product?

FreedomDesk **must** identify product line at onboarding:

| Product | Deployment | Integration path |
|---------|------------|------------------|
| **Dentrix Ascend** | Cloud | REST API — **preferred** |
| **Dentrix G5/G6/G7** | On-premise | Dentrix Developer Program (DDP) or middleware |
| **Dentrix Enterprise** | Multi-location on-prem | DDP + location IDs |

**Wrong adapter = failed integration.** Ask: "Are you on Dentrix Ascend or Dentrix installed on your server?"

---

## Dentrix Ascend (Cloud — Preferred)

### Profile

- Modern REST API, OAuth 2.0
- Closest experience to Open Dental API
- Growing share in newer offices

### Key endpoints (conceptual)

| Endpoint | FreedomDesk use |
|----------|-----------------|
| `/patients` | Search by name + DOB |
| `/appointments` | CRUD |
| `/schedule-availability` | Slot offering |
| `/providers`, `/operatories` | Schedule constraints |
| `/appointment-types` | Duration mapping |

### Patient search

Match on `FirstName`, `LastName`, `BirthDate` — same pattern as OD.

---

## Dentrix G7 / On-Premise (Legacy)

### Challenges

- No public REST API comparable to Open Dental
- **Dentrix Developer Program (DDP)** — local DLL API
- Requires **bridge agent** on practice network
- Henry Schein partner approval process

### Recommended approach

| Option | Tradeoff |
|--------|----------|
| **Middleware** (NexHealth, DentalRobot) | Cost + dependency; faster time-to-market |
| **DDP + FreedomDesk bridge** | Full control; deployment complexity |
| **Summary-only (Tier 0)** | Launch fast; manual PMS entry |

West Michigan independents on legacy Dentrix often use middleware for scheduling integrations.

---

## Dentrix Data Concepts

| Dentrix term | FreedomDesk canonical |
|--------------|----------------------|
| `PatNum` | `pmsPatientId` |
| `ApptDate` + time | `appointment.scheduledSlot` |
| `Reason` / appointment reason codes | `appointment.type` |
| `ProvNum` | `providerId` |
| `OpNum` | `operatoryId` |
| Contact note | Comm log equivalent |

Appointment **reason codes** must be mapped per installation — numeric IDs differ.

---

## Scheduling on Calls

### With integration

1. `findPatient(name, DOB)`
2. `getAvailability(appointmentType, dateRange)`
3. Present 2–3 slots
4. `createAppointment()` — request or confirmed per config

### Without integration (Tier 0)

- Template slots from `practice_configs`
- Summary flags `appointment.status: request`
- Front desk enters in Dentrix appointment book

---

## Multi-Location (Enterprise)

- Filter all queries by `locationId`
- Caller may say "your Knapp's Corner office" — map to location in config

---

## Insurance on Calls

Same Michigan taxonomy as Open Dental practices:

- Delta PPO vs Delta Medicaid vs HKD
- Collect member/Medicaid ID
- Dentrix eligibility via separate clearinghouse — not FreedomDesk Phase 1

---

## Comm Log / Contact Notes

Ascend: API write to patient communication.  
G7: middleware or bridge — write contact note with FreedomDesk summary.

Target: same structured content as `knowledge/ai/summarization.md`.

---

## FreedomDesk AI Behavior (Dentrix Office)

No caller-facing difference — backend adapter changes. AI still:

- Uses precise appointment types from `practice_configs.appointment_types[]`
- Does not mention "Dentrix" to patients
- Says "Let me pull up your chart" not "Let me query Dentrix"

---

## Integration Checklist

### Ascend
- [ ] Confirm Ascend tenant URL
- [ ] OAuth credentials in vault
- [ ] Map appointment reasons, providers, ops
- [ ] Test patient search, availability, create

### G7
- [ ] Confirm version
- [ ] Choose middleware vs DDP
- [ ] Deploy bridge if needed
- [ ] Test read paths minimum; write comm log

---

## Related Documents

- `docs/PRACTICE_MANAGEMENT_SOFTWARE.md`
- `knowledge/software/open-dental.md` — reference patterns
- `knowledge/software/eaglesoft.md` — similar middleware path
