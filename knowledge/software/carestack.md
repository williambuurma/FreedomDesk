# CareStack — FreedomDesk Integration Reference

> **Priority:** #4 — modern API, smaller independent base in West Michigan; more common in multi-location groups.  
> **Audience:** Engineers and AI agents.

---

## Profile

| Attribute | Detail |
|-----------|--------|
| Vendor | CareStack (Good Methods, Inc.) |
| Deployment | **Cloud-native SaaS** |
| API | REST, OAuth 2.0 — modern |
| FreedomDesk advantage | No on-premise bridge required |
| Typical customer | 2–15 location groups; some single locations |

---

## Why CareStack Is Different

| vs Open Dental / Eaglesoft / Dentrix G7 |
|----------------------------------------|
| Cloud-only — API always reachable |
| JSON-native schema |
| First-class **location** entity |
| Webhooks for appointment changes (future sync) |

---

## Authentication

- OAuth 2.0 client credentials
- Partner program access required
- Credentials per practice or partner-level in vault

**Base URL:** `https://api.carestack.com/v1/` (conceptual)

---

## Key Endpoints for FreedomDesk

| Endpoint | Purpose |
|----------|---------|
| `POST /patients/search` | Name, DOB, phone search |
| `POST /patients` | New patient create (Phase 2+) |
| `GET /appointments` | Upcoming for patient |
| `POST /appointments` | Create booking |
| `GET /schedule/availability` | Open slots |
| `GET /providers` | Doctor/hygienist list |
| `GET /operatories` | Ops by location |
| `GET /locations` | Multi-site filter |
| `POST /communications` | Summary write-back |

---

## Multi-Location

CareStack customers often have multiple sites:

```json
{
  "practice_config": {
    "carestackLocationId": "loc_123",
    "locationName": "Grand Rapids — Plainfield"
  }
}
```

**Caller:** "Which office am I calling?" — use called number mapping or ask if practice has multiple locations in config.

---

## Patient Lookup

```
POST /patients/search
{ "lastName": "Leo", "firstName": "Finn", "dateOfBirth": "1990-01-15" }
```

Same disambiguation rules as Open Dental.

---

## Scheduling Flow

1. Classify appointment type (canonical FreedomDesk type)
2. Map to `appointmentTypeId` in CareStack config
3. Query `/schedule/availability` with location + provider filters
4. Offer 2–3 slots
5. `POST /appointments` — request or confirmed

Cloud API enables **Tier 3** scheduling faster than on-prem Eaglesoft.

---

## Appointment Type Mapping

| FreedomDesk | CareStack (example) |
|-------------|---------------------|
| NP Exam | `new-patient-comprehensive` |
| Prophy | `adult-prophy` |
| Emergency | `emergency-exam` |
| Crown Seat | `crown-delivery` |

Loaded from practice sync — names vary.

---

## Communications Write-Back

```
POST /communications
{
  "patientId": "...",
  "channel": "phone",
  "direction": "inbound",
  "body": "[FreedomDesk structured summary]"
}
```

---

## FreedomDesk AI on CareStack Practices

Caller experience **identical** to Open Dental — domain knowledge is PMS-agnostic:

- Michigan insurance taxonomy
- Emergency triage
- Aly persona
- Structured summaries

Backend uses CareStack adapter instead of OpenDentalAdapter.

---

## Webhooks (Future)

CareStack supports outbound webhooks — useful for:

- Appointment cancelled → trigger waitlist
- Schedule changed → refresh slot cache

Not Phase 1 — document for roadmap.

---

## Insurance

Same intake rules — CareStack eligibility modules exist but FreedomDesk Phase 1 collects only:

- Program-level classification
- Member/Medicaid ID
- `verified: false`

---

## Integration Checklist

- [ ] CareStack partner agreement
- [ ] OAuth credentials per location
- [ ] Map location IDs, providers, ops, appointment types
- [ ] Test search, availability, create, communications
- [ ] Configure booking mode (request vs confirmed)

---

## Related Documents

- `docs/PRACTICE_MANAGEMENT_SOFTWARE.md`
- `knowledge/software/open-dental.md` — parallel integration patterns
- `docs/ROADMAP.md`
