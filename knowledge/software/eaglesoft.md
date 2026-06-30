# Eaglesoft — FreedomDesk Integration Reference

> **Priority:** #2 in West Michigan (Patterson Dental regional presence).  
> **Audience:** Engineers — expect **middleware or bridge** for most integrations.

---

## Profile

| Attribute | Detail |
|-----------|--------|
| Vendor | Patterson Dental |
| Deployment | On-premise only (SQL Server) |
| API | Limited official API; middleware common |
| West Michigan | Common in established Patterson customers |
| FreedomDesk tier target | Tier 1–2 via middleware initially |

---

## Integration Reality

Eaglesoft does **not** offer an Open Dental–class public REST API. FreedomDesk options:

| Option | Description |
|--------|-------------|
| **NexHealth / DentalRobot / LocalMed** | Unified API over Eaglesoft — **recommended** |
| **Patterson partner API** | Limited; partnership required |
| **On-premise bridge** | FreedomDesk agent on practice LAN |
| **Tier 0 summary-only** | Email/SMS summary; manual Eaglesoft entry |

---

## Data Entities (Conceptual)

| Entity | Typical fields | FreedomDesk use |
|--------|----------------|-----------------|
| Patient | `patient_id`, name, DOB, phone | Lookup |
| Appointment | `start_time`, `duration`, provider, operatory | Schedule |
| Provider | `provider_id`, name | Assignment |
| Operatory | `operatory_id` | Scheduling |
| Contact record | Note text | Summary write-back |

Exact schema **varies by Eaglesoft version** (18.x, 19.x, 20.x) — adapter must be version-aware.

---

## Patient Lookup

Same phone pattern as all PMS:

```
findPatient({ lastName, firstName, dateOfBirth })
```

| Outcome | AI response |
|---------|-------------|
| Not found | New patient or spelling verification |
| Found | "Hi [First Name], I have your chart here." |

---

## Scheduling

### With middleware

- Query availability by appointment type
- Create appointment or appointment request
- Map FreedomDesk types → Eaglesoft appointment types per config

### Without integration

- Practice-configured template slots
- Summary with all fields for front desk to enter in Eaglesoft schedule

---

## Eaglesoft-Specific Front Desk Context

| Consideration | FreedomDesk impact |
|---------------|-------------------|
| Patterson ecosystem | IT may require Patterson approval for integrations |
| On-premise only | No cloud API — bridge or middleware |
| Version fragmentation | Per-practice adapter config |
| Limited write API | Appointment request > auto-confirm initially |

---

## Appointment Type Mapping

Sync from practice config — example mappings:

| FreedomDesk | Eaglesoft type (example) |
|-------------|--------------------------|
| NP Exam | `NEW PATIENT` |
| Prophy | `PROPHY` |
| Crown Seat | `CROWN SEAT` |
| Emergency | `EMERGENCY` |

Caller-facing behavior identical to Open Dental offices.

---

## Comm Log / Contact Notes

Write-back target for Tier 2:

- Middleware `createNote(patientId, summaryText)`
- Or task/tickler for urgent items

Front desk in Eaglesoft offices has same pain: **voicemail re-typing** — structured summaries are the value prop.

---

## IT and Onboarding

Expect:

- Practice manager + Patterson rep involvement
- Windows server network access for bridge
- Longer onboarding than Open Dental Cloud

FreedomDesk should default Eaglesoft customers to **summary-first** until integration validated.

---

## Insurance Intake

Same Michigan taxonomy — Eaglesoft insurance setup differs visually but FreedomDesk summary fields are PMS-agnostic:

```json
{
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "PPO",
    "memberId": "..."
  }
}
```

---

## Error Handling

| Issue | Caller script |
|-------|---------------|
| Bridge offline | "I'll take your information and our team will confirm when we open." |
| Slow lookup | "One moment while I pull that up." |

---

## Integration Checklist

- [ ] Identify Eaglesoft version
- [ ] Select middleware partner
- [ ] Deploy bridge if required
- [ ] Map appointment types, providers, operatories
- [ ] Test patient search + appointment read
- [ ] Confirm comm log write path
- [ ] Default booking mode: request

---

## Related Documents

- `docs/PRACTICE_MANAGEMENT_SOFTWARE.md`
- `knowledge/software/open-dental.md`
- `knowledge/software/dentrix.md`
