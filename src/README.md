# Source Code Map

TypeScript and Node.js modules for FreedomDesk intelligence — conversation reasoning, practice brain, knowledge assembly, and reflection. **Not imported by the marketing site or dashboard at runtime today**; consumed by preview scripts and tests.

## Layout

```
src/
├── conversation/     # Five-brains call pipeline (orchestrator + brain stubs)
├── practice-brain/   # Daily awareness, Morning Brief, recommendations (mock data today)
├── practice-memory/  # Patient-centric practice memory helpers (tests + future ingest)
├── reflection-engine/# Post-call reflection guards (future; tested)
└── engine/           # Knowledge store + prompt context builder (Node.js)
```

## Key modules

| Path | Role | Spec |
|------|------|------|
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

Conversation brains are stubs except `psychology.ts`. Telephony and live ingest are Phase 3 — see `docs/V1_FOUNDATION.md` and `docs/ROADMAP.md`.
