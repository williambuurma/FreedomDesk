# Intent Registry

> **Purpose:** Single reference for call intent names across code, knowledge bundles, and conversation design.  
> **Authority for conversation design:** [`CALL_FLOWS.md`](CALL_FLOWS.md). **Authority for Phase 1 code:** `src/engine/intents.js`.

FreedomDesk uses one intent vocabulary in summaries and routing. This document maps what is **wired today** vs **designed for V1+**.

---

## Phase 1 — wired in code (`src/engine/intents.js`)

| Intent | CALL_FLOWS section | Knowledge bundle | Status |
|--------|-------------------|------------------|--------|
| `NEW_PATIENT` | New Patient Call Flow | `knowledge/call-flows/new-patient.md` | Prompt builder + preview |
| `EMERGENCY` | Emergency and Urgent Call Flow | (emergency docs in `knowledge/dentistry/`, `knowledge/scheduling/`) | Prompt builder + preview |
| `SCHEDULE_EXISTING` | Existing Patient — Schedule Appointment | — | Enum only; full flow deferred |

These three are the only intents validated by `isKnownIntent()` today.

---

## V1 target — designed in CALL_FLOWS (not all wired)

From [`CALL_FLOWS.md`](CALL_FLOWS.md) summary schema and flow sections:

| Intent | V1 priority | Notes |
|--------|-------------|-------|
| `NEW_PATIENT` | ✅ Phase 1 | |
| `EMERGENCY` / `SAME_DAY_EMERGENCY` | ✅ Phase 1 | Same-day flag in summary JSON |
| `SCHEDULE_EXISTING` | ✅ Phase 1 | |
| `RESCHEDULE` | ✅ Phase 1 | |
| `CANCEL` | ✅ Phase 1 | |
| `CONFIRM` | ✅ Phase 1 | |
| `TREATMENT_SCHEDULE` | ✅ Phase 1 | Crown seat, RCT, extraction, etc. — typed, not generic |
| `PEDIATRIC` | ✅ Phase 1 | HKD / Medicaid classification |
| `INSURANCE` | ✅ Phase 1 | Classify only; never promise coverage |
| `DEMOGRAPHICS_UPDATE` | Later | |
| `WAITLIST` | Later | |
| `BILLING` | Later | Route only |
| `GENERAL_INFO` | Later | |
| `OTHER` | Always | Wrong number, sales, unclassified |

**Explicitly NOT V1:** outbound recall, autonomous scheduling, multi-language routing — see [`V1_FOUNDATION.md`](V1_FOUNDATION.md).

---

## Knowledge manifest bundles

`knowledge/manifest.json` defines **prompt context bundles**, not the full intent enum. Bundles are keyed by call type for the prompt builder:

- `call-flows.new-patient` → NEW_PATIENT excerpt
- Additional bundles map to categories (insurance, scheduling, michigan regional) — loaded per intent during prompt assembly

Do not assume every CALL_FLOWS intent has a dedicated bundle yet.

---

## Urgency vocabulary (orchestrator)

| Layer | Values | Location |
|-------|--------|----------|
| Spec (Brain Architecture) | `routine`, `priority`, `urgent`, `emergency` | `docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md` |
| Orchestrator stub today | checks `"emergency"` only | `src/conversation/engine.ts` |

Full enum wiring is Phase 2.

---

## Emotion vocabulary (psychology brain)

| `psychology.ts` output | Orchestrator checks today |
|------------------------|---------------------------|
| `dental_anxiety`, `pain`, `frustration`, … | `anxious`, `pain` only |

See `src/conversation/psychology.ts` for the canonical assessment dimensions.

---

## When adding a new intent

1. Add to `CALL_FLOWS.md` with summary schema
2. Add to `src/engine/intents.js` and tests
3. Add knowledge bundle or atom if prompt context is needed
4. Update this registry

Do not add intents to UI or dashboard until summary delivery exists.
