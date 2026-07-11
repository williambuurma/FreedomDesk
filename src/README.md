# Source Code Map

TypeScript and Node.js modules for FreedomDesk intelligence — conversation reasoning, practice brain, practice improvement, knowledge assembly, and reflection. **Not imported by the marketing site or dashboard at runtime today**; consumed by preview scripts and tests.

## Layout

```
src/
├── conversation/          # Five-brains call pipeline (orchestrator + brain stubs)
├── practice-improvement/  # Shared Practice Improvement Engine (Universal Judgment Loop)
├── practice-brain/        # Daily awareness, Morning Brief, recommendations (mock data today)
├── practice-memory/       # Patient-centric practice memory helpers (tests + future ingest)
├── reflection-engine/     # Post-call reflection guards (future; tested)
├── actions/               # Action materialization from operational events
├── events/                # Operational event stream types + adapters
└── engine/                # Knowledge store + prompt context builder (Node.js)
```

## Key modules

| Path | Role | Spec |
|------|------|------|
| `practice-improvement/` | **Practice Improvement Engine** — single pipeline for all intelligence domains | `INTELLIGENCE_MODEL.md`, `ACTION_MODEL.md` |
| `conversation/engine.ts` | Orchestrator — merges brain outputs into goals | `docs/FREEDOMDESK_BRAIN_ARCHITECTURE.md` |
| `conversation/psychology.ts` | Psychology brain (emotion assessment) | `docs/EMOTIONAL_INTELLIGENCE_ENGINE.md` |
| `conversation/triage.ts` | Triage brain stub | Constitution + Brain Architecture |
| `conversation/understanding.ts` | Understanding brain stub | `docs/CALL_FLOWS.md` |
| `conversation/summary.ts` | Summary builder stub | `docs/CALL_FLOWS.md` § Summary Schemas |
| `practice-brain/practiceBrain.ts` | Daily Practice Brain loop | `docs/PRACTICE_OPERATING_SYSTEM.md` |
| `practice-brain/practiceMemory.ts` | **Operational** memory (tasks, opportunities) — not `practice-memory/` | Operating Model glossary |
| `practice-memory/` | **Patient-centric** memory types and helpers | `docs/CONTINUOUS_LEARNING_ENGINE.md` |
| `engine/prompt-context-builder.js` | Assembles prompt context from `knowledge/` | `docs/KNOWLEDGE_ENGINE.md` |
| `engine/intents.js` | Phase 1 intent enum (3 intents wired today) | `docs/INTENT_REGISTRY.md` |

## Practice Improvement Engine

**Objective for every observation:** *Can I improve this practice?*

**Pipeline (shared by all domains):**
Observe → Understand → Detect Situation → Identify Opportunity or Risk → **Evaluate Impact & Prioritize** → Recommend Best Action → Explain Why → Track Outcome → Learn

Impact evaluation asks: material improvement? who receives it? interrupt? priority? does it change a decision? Non-decision-changing noise is suppressed (quiet by default).

**Domain modules** (same pipeline, not separate logic):

| Domain | Module | Typical events |
|--------|--------|----------------|
| Phone Intelligence | `domains/phone.ts` | `call_completed`, `boundary_utterance` |
| Operating Intelligence | `domains/operating.ts` | cancellations, conflicts, verification; **Recoverable Schedule Opportunity** (candidate ranking → named fill) |
| Supply Intelligence | `domains/supply.ts` | `lab_status_changed` |
| Owner Intelligence | `domains/owner.ts` | strategic / process-quality signals |
| Practice Brain | `domains/practiceBrain.ts` | practice-timescale quality gaps |

Quiet by default: below confidence floors, non-material impact, or PMS-duplicating recommendations → **Ignore** / **Defer**. Never mirrors the PMS schedule or chart.

**Recoverable Schedule Opportunity** (first demo capability on this engine): when an `appointment_cancelled` event carries a `schedule_opportunity/v1` payload, the operating domain ranks fill candidates (duration, provider, urgency, preference, insurance) and surfaces one decision-first recommendation — Situation → Recommendation → Primary Action — via the shared pipeline. Fixtures live in `fixtures/recoverableScheduleOpportunity.ts` and are projected into Today preview decision cards.

```ts
import { PracticeImprovementEngine } from "./practice-improvement/index.ts";

const engine = new PracticeImprovementEngine();
const result = engine.processEvent(operationalEvent);
// result.disposition: action | recommend | defer | ignore
```

## Naming note

Two "memory" concepts coexist by design:

- **`practice-brain/practiceMemory.ts`** — operational state for the daily rhythm (tasks, open issues, opportunities)
- **`practice-memory/`** — patient interaction memory for organizational learning

Do not merge without reading both specs.

## Tests

```bash
npm test
```

Preview generators import `practice-brain/` and `engine/`:

```bash
npm run preview:my-day
npm run preview:morning-brief
npm run context:new-patient
```

## Implementation status

Conversation brains are stubs except `psychology.ts`. Practice Improvement Engine core pipeline is in place (Sprint 5). Telephony and live ingest are Phase 3 — see `docs/V1_FOUNDATION.md` and `docs/ROADMAP.md`.
