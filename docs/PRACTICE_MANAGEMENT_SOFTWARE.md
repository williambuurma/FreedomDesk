# Practice Management Software Reference

> **Purpose:** Integration reference for Open Dental, Eaglesoft, Dentrix, and CareStack — the four primary PMS platforms FreedomDesk supports. **West Michigan independent practices most commonly run Open Dental** — it is the first adapter we build and the reference implementation for all others.

---

## Table of Contents

1. [Overview](#overview)
2. [Integration Strategy](#integration-strategy)
3. [Common PMS Concepts](#common-pms-concepts)
4. [Open Dental](#open-dental)
5. [Eaglesoft](#eaglesoft)
6. [Dentrix](#dentrix)
7. [CareStack](#carestack)
8. [Cross-PMS Data Mapping](#cross-pms-data-mapping)
9. [Integration Patterns by FreedomDesk Feature](#integration-patterns-by-freedomdesk-feature)
10. [Testing and Sandboxes](#testing-and-sandboxes)

---

## Overview

### Market share — West Michigan independents

| PMS | West Michigan GP prevalence | FreedomDesk priority |
|-----|------------------------------|---------------------|
| **Open Dental** | **Highest** among tech-forward independents; strong Grand Rapids base | **#1** — first adapter, reference implementation |
| **Eaglesoft** | Common (Patterson Dental regional presence) | **#2** — middleware or bridge likely |
| **Dentrix** | Common in established offices | **#3** — Ascend API preferred over G7 bridge |
| **CareStack** | Growing in multi-location groups | **#4** — modern cloud API |
| **Curve, Denticon, others** | Present | Summary-only (Tier 0) until demand |

### Market share (US private dental, approximate)

| PMS | Market share | Typical practice profile |
|-----|-------------|-------------------------|
| **Dentrix** | ~35–40% | Established practices; Henry Schein ecosystem |
| **Open Dental** | ~15–20% | Tech-forward independents; developer-friendly API |
| **Eaglesoft** | ~15–20% | Patterson Dental customers; Pacific Northwest strong |
| **CareStack** | ~5–10% (growing) | Cloud-native; multi-location groups |
| **Curve, Denticon, others** | Remaining | Supported via summary-only mode initially |

FreedomDesk prioritizes adapters in this order: **Open Dental → Eaglesoft → Dentrix → CareStack** — matching West Michigan independent practice reality and API accessibility.

### Open Dental appointment types (West Michigan GP examples)

FreedomDesk maps caller intent to the practice's configured Open Dental appointment types:

| Caller says | Open Dental type (example) | Column |
|-------------|------------------------------|--------|
| "New patient exam" | NP Exam Comprehensive | Doctor (+ hygiene if blocked) |
| "Cleaning" / "recall" | Prophy Adult / Child Prophy | Hygiene |
| "Crown seat" | Crown Seat / Delivery | Doctor |
| "Crown prep" | Crown Prep | Doctor + assistant |
| "Emergency" / "toothache" | Emergency / Limited Exam | Doctor (same-day block) |
| "Extraction" | Ext Simple / Ext Surgical | Doctor |
| "Root canal" | RCT Start / RCT Complete | Doctor (if in-house) |
| "Implant consult" | Implant Consult | Doctor |
| "Denture impression" | Denture Impression | Doctor |
| "Perio maintenance" | Perio Maint | Hygiene |
| "SRP" | SRP Quad | Hygiene |

Exact names vary per office — loaded from `practice_configs.appointment_types[]` synced from Open Dental `/appointmenttypes`.

### Integration maturity tiers

| Tier | Capability | PMS requirement |
|------|------------|-----------------|
| **Tier 0: Summary only** | Call summaries via email/SMS/webhook; manual PMS entry | Any PMS |
| **Tier 1: Read** | Patient lookup, appointment read, provider/schedule read | API or database read access |
| **Tier 2: Write** | Create appointment requests, comm logs, tasks | API write access |
| **Tier 3: Real-time schedule** | Live availability query, book appointment on call | Full API + constraint engine |

Phase 1 launches at Tier 0–1 for all PMS. Tier 2–3 rolls out per PMS based on API capability.

---

## Integration Strategy

### Adapter architecture

Each PMS implements the `PmsAdapter` interface defined in [ARCHITECTURE.md](ARCHITECTURE.md#pms-adapter-interface-target).

```
FreedomDesk Conversation Engine
         │
         ▼
   PmsAdapterRegistry
         │
    ┌────┼────────┬──────────┐
    ▼    ▼        ▼          ▼
 Open   Dentrix  Eaglesoft  CareStack
 Dental Adapter  Adapter    Adapter
    │    │        │          │
    ▼    ▼        ▼          ▼
  REST  REST/    REST/      REST
  API   Bridge   Bridge     API
```

### Authentication patterns

| PMS | Auth method | Credential storage |
|-----|-------------|-------------------|
| Open Dental | API key + customer key | Vault per practice |
| Dentrix | OAuth 2.0 / API key (Dentrix Ascend vs. Enterprise differ) | Vault per practice |
| Eaglesoft | API key / database credentials via bridge | Vault per practice |
| CareStack | OAuth 2.0 client credentials | Vault per practice |

### Connection methods

| Method | Pros | Cons | Used by |
|--------|------|------|---------|
| **Official REST API** | Supported, documented, safe | Rate limits, feature gaps | Open Dental, CareStack, Dentrix Ascend |
| **Vendor middleware (e.g., NexHealth, DentalRobot)** | Unified API across PMS | Cost, dependency, latency | Fallback for Dentrix/Eaglesoft |
| **On-premise bridge agent** | Works with legacy PMS | Deployment complexity, IT burden | Dentrix Enterprise, Eaglesoft legacy |
| **Read-only database replica** | Full data access | Security concerns, unsupported | Last resort; not recommended |

FreedomDesk prefers **official APIs** and **vendor middleware** over direct database access.

---

## Common PMS Concepts

These entities exist in all four PMS platforms with different names:

| Concept | Description | FreedomDesk usage |
|---------|-------------|-------------------|
| **Patient** | Demographics, contact, insurance links | Lookup, create (new patient) |
| **Appointment** | Scheduled visit with provider, operatory, type, status | Read, create, reschedule, cancel |
| **Provider** | Dentist or hygienist | Schedule assignment, caller preference |
| **Operatory** | Treatment room/chair | Scheduling constraint |
| **Appointment type / procedure** | Category defining duration and production | Slot selection |
| **Schedule / block** | Provider availability windows | Availability query |
| **Recall** | Periodic reminder for cleaning/exam | "You're due for cleaning" |
| **Insurance plan / subscriber** | Coverage details linked to patient | Intake verification |
| **Comm log / contact note** | Record of patient communication | Write-back target for call summaries |
| **Task / tickler** | To-do for staff | Urgent follow-up routing |

### Appointment statuses (typical mapping)

| Status | Meaning | FreedomDesk action |
|--------|---------|-------------------|
| Scheduled | Confirmed future appointment | Reschedule/cancel target |
| Complete | Visit occurred | N/A |
| Broken/missed | No-show | Note for reactivation |
| Unscheduled list | Treatment planned but not booked | Offer scheduling |

---

## Open Dental

### Profile

| Attribute | Detail |
|-----------|--------|
| **Vendor** | Open Dental Software, Inc. |
| **Deployment** | On-premise (Windows server) + Open Dental Cloud (hosted) |
| **License** | Per-workstation; server free |
| **API** | REST API (built-in, well-documented) |
| **Developer community** | Strong; third-party integrations common |
| **FreedomDesk priority** | **#1** — best API, large independent practice base |

### API overview

Open Dental provides a **REST API** served from the practice's Open Dental installation (or cloud instance).

**Base URL:** `https://{server}/OpenDentalWebServices/api/v1/`

**Authentication:** `Authorization: ODFHIR {DeveloperKey}/{CustomerKey}`

**Documentation:** [Open Dental API Manual](https://www.opendental.com/site/api.html)

### Key endpoints for FreedomDesk

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/patients` | GET, POST | Search/create patients |
| `/patients/{PatNum}` | GET, PUT | Patient detail/update |
| `/appointments` | GET, POST | List/create appointments |
| `/appointments/{AptNum}` | GET, PUT | Read/update appointment |
| `/appointments/Slots` | GET | **Available slots** — critical for scheduling |
| `/providers` | GET | Provider list |
| `/operatories` | GET | Operatory list |
| `/appointmenttypes` | GET | Appointment type definitions |
| `/commlogs` | POST | Create communication log entry |
| `/recalls` | GET | Patient recall status |
| `/insplans` | GET | Insurance plan reference |
| `/patplans` | GET, POST | Patient insurance linkage |

### Patient search

```
GET /patients?LName=Leo&FName=Finn&Birthdate=1990-01-15
```

Returns array of matching patients. Match on LName + FName + Birthdate for confident identification.

### Available slots query

```
GET /appointments/Slots?dateStart=2026-07-03&dateEnd=2026-07-10&ProvNum=1&OpNum=2
```

Returns available time slots respecting schedule, blockouts, and existing appointments. This is the **primary scheduling integration point**.

### Create appointment

```
POST /appointments
{
  "PatNum": 123,
  "AptDateTime": "2026-07-03T09:00:00",
  "ProvNum": 1,
  "Op": 2,
  "Pattern": "//XXXX//",  // time pattern
  "ProcDescript": "New Patient Exam",
  "Note": "Scheduled via FreedomDesk. Insurance: Delta Dental PPO."
}
```

Phase 1: create as **appointment request** (unconfirmed) if practice prefers review before confirming.

### Comm log write-back

```
POST /commlogs
{
  "PatNum": 123,
  "CommDateTime": "2026-06-30T14:30:00",
  "Mode": "Phone",
  "SentOrReceived": "Received",
  "Note": "FreedomDesk call summary: New patient intake. Finn Leo, DOB 1/15/1990..."
}
```

### Open Dental-specific considerations

| Consideration | Detail |
|---------------|--------|
| **Server access** | API runs on practice server; may need VPN or Open Dental Cloud for hosted |
| **eConnector** | Required for some API features in on-premise setups |
| **Appointment patterns** | Time patterns use `/` and `X` characters — adapter must translate durations |
| **Clinic mode** | Multi-location practices use clinic numbers — filter all queries by clinic |
| **Preferences** | Many behaviors controlled by Setup → Preferences — document per practice |
| **Rate limits** | No official limit but be respectful; cache provider/operatory lists |

### Open Dental integration checklist

- [ ] Obtain Developer Key from Open Dental
- [ ] Practice generates Customer Key in Open Dental (Setup → Advanced Setup → API)
- [ ] Confirm eConnector running (on-premise)
- [ ] Test patient search, slots, appointment create, commlog in sandbox
- [ ] Map appointment types to practice's definitions
- [ ] Configure clinic number if multi-location

---

## Eaglesoft

### Profile

| Attribute | Detail |
|-----------|--------|
| **Vendor** | Patterson Dental (Eaglesoft) |
| **Deployment** | On-premise (SQL Server backend) |
| **License** | Per-workstation |
| **API** | Patterson API / third-party middleware |
| **Developer community** | Smaller; more middleware-dependent |
| **FreedomDesk priority** | **#3** — requires bridge or middleware |

### API overview

Eaglesoft does not expose a public REST API comparable to Open Dental. Integration options:

| Option | Description |
|--------|-------------|
| **Patterson API** | Limited official API; contact Patterson for partner access |
| **Eaglesoft SQL (read-only)** | Direct database queries — unsupported, security risk |
| **Middleware (NexHealth, DentalRobot, LocalMed)** | Unified API layer over Eaglesoft |
| **On-premise bridge agent** | FreedomDesk-deployed agent on practice network |

**Recommended approach:** NexHealth or similar middleware for Tier 1–2; evaluate Patterson partner API for long-term.

### Key data entities (Eaglesoft schema)

| Entity | Table (approximate) | Key fields |
|--------|---------------------|------------|
| Patient | `patient` | `patient_id`, `first_name`, `last_name`, `birth_date`, `phone` |
| Appointment | `appointment` | `appointment_id`, `patient_id`, `provider_id`, `operatory_id`, `start_time`, `duration`, `status` |
| Provider | `provider` | `provider_id`, `first_name`, `last_name`, `title` |
| Operatory | `operatory` | `operatory_id`, `name` |
| Schedule | `schedule` | Provider availability blocks |

*Exact schema varies by Eaglesoft version. Adapter must be version-aware.*

### Eaglesoft-specific considerations

| Consideration | Detail |
|---------------|--------|
| **On-premise only** | No cloud option — bridge agent likely required |
| **IT involvement** | Practice IT or Patterson rep must approve integration |
| **Version fragmentation** | Eaglesoft 18.x vs 19.x vs 20.x schema differences |
| **Limited write API** | Appointment creation may require middleware |
| **Patterson relationship** | May need formal partnership for API access |

### Eaglesoft integration checklist

- [ ] Identify Eaglesoft version
- [ ] Select middleware (NexHealth recommended) or pursue Patterson API partnership
- [ ] Deploy bridge agent if needed (on-premise Windows service)
- [ ] Test patient search and appointment read
- [ ] Confirm write-back path for comm logs / appointment requests
- [ ] Map appointment types and provider IDs

---

## Dentrix

### Profile

| Attribute | Detail |
|-----------|--------|
| **Vendor** | Henry Schein One (Dentrix) |
| **Deployment** | On-premise (Dentrix Enterprise) + Cloud (Dentrix Ascend) |
| **License** | Per-workstation |
| **API** | Dentrix Developer Program API (varies by product line) |
| **Developer community** | Moderate; partner program required |
| **FreedomDesk priority** | **#2** — largest market share, API available via partner program |

### Product lines (critical distinction)

| Product | Deployment | API |
|---------|------------|-----|
| **Dentrix G5/G6/G7 (legacy)** | On-premise | Dentrix Developer Program (DDP) — COM/local API |
| **Dentrix Enterprise** | On-premise multi-location | DDP + enterprise extensions |
| **Dentrix Ascend** | Cloud | REST API (most modern, preferred) |

FreedomDesk must ask which Dentrix product during onboarding. Integration path differs significantly.

### Dentrix Ascend API (cloud — preferred)

**Base URL:** `https://{tenant}.dentrixascend.com/api/v1/`

**Authentication:** OAuth 2.0

**Key endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `/patients` | Search/create patients |
| `/appointments` | CRUD appointments |
| `/providers` | Provider list |
| `/operatories` | Operatory list |
| `/appointment-types` | Appointment type definitions |
| `/schedule-availability` | Available slots |

Dentrix Ascend is the **most integration-friendly** Dentrix product.

### Dentrix G5/G7 (on-premise)

Integration via **Dentrix Developer Program (DDP)**:

- Local API accessed through registered DLL
- Requires on-premise bridge agent installed on Dentrix server
- Patient lookup via `Patient.GetPatient()`
- Appointment via `Appointment` class
- Schedule via `Schedule` class

**Alternative:** Middleware (NexHealth, DentalRobot) to avoid DDP complexity.

### Dentrix-specific considerations

| Consideration | Detail |
|---------------|--------|
| **Product line matters** | Ascend vs. G7 vs. Enterprise — different APIs entirely |
| **DDP approval** | Developer Program application required for on-premise API |
| **Bridge agent** | Required for G5/G7; FreedomDesk agent polls or receives webhooks |
| **Operatory/provider IDs** | Numeric IDs differ per installation — always map from config |
| **Appointment reasons** | Dentrix uses "appointment reason" codes — map to FreedomDesk types |
| **Multi-location** | Enterprise uses location IDs — filter all queries |

### Dentrix integration checklist

- [ ] Confirm product line (Ascend vs. G5/G7 vs. Enterprise)
- [ ] For Ascend: OAuth credentials, test REST endpoints
- [ ] For G5/G7: Apply to DDP or select middleware; deploy bridge agent
- [ ] Map providers, operatories, appointment reasons
- [ ] Test patient search (LName + FName + DOB)
- [ ] Test appointment read and create (or request)
- [ ] Configure comm log / note write-back

---

## CareStack

### Profile

| Attribute | Detail |
|-----------|--------|
| **Vendor** | CareStack (Good Methods, Inc.) |
| **Deployment** | Cloud-native SaaS |
| **License** | Subscription per location |
| **API** | REST API (modern, documented) |
| **Developer community** | Growing; cloud-first design |
| **FreedomDesk priority** | **#4** — modern API but smaller independent base |

### API overview

**Base URL:** `https://api.carestack.com/v1/`

**Authentication:** OAuth 2.0 client credentials

**Documentation:** CareStack developer portal (partner access)

### Key endpoints for FreedomDesk

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/patients/search` | POST | Search by name, DOB, phone |
| `/patients` | POST | Create new patient |
| `/patients/{id}` | GET | Patient detail |
| `/appointments` | GET, POST | List/create appointments |
| `/appointments/{id}` | PUT, DELETE | Update/cancel |
| `/schedule/availability` | GET | Available slots |
| `/providers` | GET | Provider list |
| `/operatories` | GET | Operatory list |
| `/locations` | GET | Multi-location support |
| `/communications` | POST | Log patient communication |

### CareStack-specific considerations

| Consideration | Detail |
|---------------|--------|
| **Cloud-native** | No on-premise bridge needed — simplest deployment |
| **Multi-location** | First-class location entity — common in CareStack customer base |
| **Partner access** | API access requires CareStack partnership agreement |
| **Webhooks** | CareStack supports outbound webhooks — useful for appointment change sync |
| **Modern schema** | JSON-native; closest to greenfield API design |

### CareStack integration checklist

- [ ] Establish CareStack partner relationship
- [ ] Obtain OAuth client credentials per practice (or partner-level)
- [ ] Test patient search, availability, appointment create
- [ ] Map location IDs for multi-location practices
- [ ] Configure webhook receivers for appointment updates (future)
- [ ] Test communication log write-back

---

## Cross-PMS Data Mapping

FreedomDesk uses a **canonical data model** internally. Adapters translate to/from PMS-native formats.

### Patient mapping

| FreedomDesk field | Open Dental | Dentrix | Eaglesoft | CareStack |
|-------------------|-------------|---------|-----------|-----------|
| `firstName` | `FName` | `FirstName` | `first_name` | `firstName` |
| `lastName` | `LName` | `LastName` | `last_name` | `lastName` |
| `dateOfBirth` | `Birthdate` | `BirthDate` | `birth_date` | `dateOfBirth` |
| `phone` | `WirelessPhone` / `HmPhone` | `Phone` | `home_phone` | `mobilePhone` |
| `email` | `Email` | `Email` | `email` | `email` |
| `pmsPatientId` | `PatNum` | `PatNum` | `patient_id` | `patientId` |

### Appointment mapping

| FreedomDesk field | Open Dental | Dentrix | Eaglesoft | CareStack |
|-------------------|-------------|---------|-----------|-----------|
| `pmsAppointmentId` | `AptNum` | `AptNum` | `appointment_id` | `appointmentId` |
| `startTime` | `AptDateTime` | `ApptDate` + time | `start_time` | `startDateTime` |
| `duration` | Pattern length | `Length` | `duration` | `durationMinutes` |
| `providerId` | `ProvNum` | `ProvNum` | `provider_id` | `providerId` |
| `operatoryId` | `Op` | `OpNum` | `operatory_id` | `operatoryId` |
| `status` | `AptStatus` | `Status` | `status` | `status` |
| `type` | `ProcDescript` | `Reason` | `type` | `appointmentTypeId` |

### Phone number normalization

All adapters normalize phone numbers to E.164 (`+1XXXXXXXXXX`) internally. Display formatting is locale-specific.

---

## Integration Patterns by FreedomDesk Feature

### Feature: Patient lookup (existing patient calls)

```
Caller provides name + DOB
       │
       ▼
PmsAdapter.findPatient({ lastName, firstName, dateOfBirth })
       │
       ├── 0 matches → "I don't see a record. Are you a new patient?"
       ├── 1 match   → Proceed with patient context
       └── 2+ matches → "I found more than one record. Can you confirm your address?"
```

### Feature: Offer appointment times (new patient)

**With PMS (Tier 3):**
```
PmsAdapter.getAvailability({ appointmentType: 'NPE', dateRange, providerPreference })
       │
       ▼
Return 2–3 slots → present to caller
```

**Without PMS (Tier 0):**
```
Load practice-configured template slots (e.g., "Tue/Thu 9 AM and 2 PM for NPE")
       │
       ▼
Present options → note as "appointment request" in summary
```

### Feature: Call summary write-back

**Tier 2:**
```
PmsAdapter.createCommLog(patientId, summaryText)
PmsAdapter.createTask({ assignedTo: 'front_desk', description: summaryText, priority: urgency })
```

**Tier 0:**
```
Email/SMS summary to practice → staff manually enters in PMS
```

### Feature: Appointment request vs. confirmed booking

Most practices prefer FreedomDesk to create **appointment requests** (unconfirmed) rather than confirmed appointments, especially initially:

| Mode | PMS behavior | When to use |
|------|-------------|-------------|
| **Request** | Creates unconfirmed appointment or task for staff review | Default; new FreedomDesk customers |
| **Confirmed** | Creates confirmed appointment on schedule | After trust established; PMS integration validated |

Configurable per practice in `practice_configs`.

---

## Testing and Sandboxes

### Open Dental

- **Test database:** Open Dental trial version with sample data
- **Developer sandbox:** Available via Open Dental developer program
- **Test server:** Run on local Windows VM or Open Dental Cloud trial

### Dentrix

- **Dentrix Ascend:** Sandbox tenant via developer program
- **G5/G7:** Test database on Dentrix trial installation (limited availability)

### Eaglesoft

- **Trial version:** Patterson provides demo databases for partners
- **Middleware sandbox:** NexHealth provides unified test environment

### CareStack

- **Demo environment:** Available via CareStack partner program
- **Test patients:** Pre-loaded in demo tenant

### FreedomDesk integration test suite

Each adapter must pass:

1. **Patient search** — exact match, partial match, no match
2. **Patient create** — new patient with all required fields
3. **Appointment read** — upcoming appointments for patient
4. **Availability query** — returns slots within date range
5. **Appointment create** — creates request/confirmed appointment
6. **Comm log create** — writes summary text
7. **Error handling** — PMS unreachable, auth failure, rate limit
8. **Idempotency** — duplicate create does not double-book

---

## Related Documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — PmsAdapter interface and system design
- [DENTAL_WORKFLOWS.md](DENTAL_WORKFLOWS.md) — scheduling and intake workflows
- [CALL_FLOWS.md](CALL_FLOWS.md) — how calls use PMS data
- [INTEGRATIONS.md](INTEGRATIONS.md) — middleware and third-party services
- [ROADMAP.md](ROADMAP.md) — PMS integration rollout timeline
