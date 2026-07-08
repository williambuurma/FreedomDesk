# FreedomDesk Documentation

> **Purpose:** Canonical documentation index and reading order for engineers, product, dental consultants, and AI agents. **Start here** before modifying product behavior, knowledge, reasoning, call handling, dashboard surfaces, or integrations.
>
> Root [`README.md`](../README.md) covers repo setup and deployment. This file is the authoritative map of *what to read and in what order*.

When documents conflict, defer to the authority chain in each document — **always beginning with the Constitution**.

---

## About `VISION.md`

[`VISION.md`](../VISION.md) is an empty placeholder. **Do not treat it as authoritative.**

Product vision lives in these documents (read in order):

1. [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) — what FreedomDesk owes callers and practices; non-negotiable boundaries
2. [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md) — timeless product decision filter
3. [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) — market, personas, competitive positioning, voice identity
4. [`FREEDOMDESK_INTELLIGENCE.md`](FREEDOMDESK_INTELLIGENCE.md) — flagship intelligence-layer vision
5. [`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md) — daily rhythm, person model, My Day / Morning Brief / End of Day

Older references to `VISION.md` in sibling specs should be interpreted as pointers to the chain above.

---

## Authority map

Each concept has **one owning document**. Other specs may reference it but must not redefine it.

| Concept | Owning document | What it governs |
|---------|-----------------|-----------------|
| Moral law, safety, truth, clinical boundaries | [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) | Highest authority; overrides specs, contracts, and implementation convenience |
| Product decision filter | [`FREEDOMDESK_PRINCIPLES.md`](FREEDOMDESK_PRINCIPLES.md) | What we build, what we reject, how features should behave |
| Market, personas, business context | [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) | Why FreedomDesk exists, who we serve, West Michigan focus, HIPAA posture |
| Daily surfaces & person model | [`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md) | Person, Responsibility, My Day, Morning Brief, End of Day, Practice Intelligence, Office DNA glossary |
| Operating intelligence (philosophical definition) | [`OPERATING_INTELLIGENCE.md`](OPERATING_INTELLIGENCE.md) | What operating intelligence is — observe, understand, remember, connect, anticipate, coordinate, learn, ignore |
| Intelligence product vision | [`FREEDOMDESK_INTELLIGENCE.md`](FREEDOMDESK_INTELLIGENCE.md) | Unified intelligence layer — questions, proactive signals, decade-scale value |
| Knowledge structure & consumption | [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) | Universal / regional / office layers; versioning; no domain facts in brain code |
| Practice-specific profiles (Layer 3) | [`FREEDOMDESK_OFFICE_DNA.md`](FREEDOMDESK_OFFICE_DNA.md) | Scheduling, insurance, clinical workflows, staff preferences per office |
| Live-call reasoning | [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) | Five-brain model, conversation loop, orchestration on phone calls |
| Caller emotion | [`EMOTIONAL_INTELLIGENCE_ENGINE.md`](EMOTIONAL_INTELLIGENCE_ENGINE.md) | Perception, adaptation, interaction discipline — not phrase libraries |
| Chief-of-Staff operations | [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) | Daily awareness, role success, opportunity detection, recommendations |
| Organizational learning | [`CONTINUOUS_LEARNING_ENGINE.md`](CONTINUOUS_LEARNING_ENGINE.md) | Practice memory, pattern detection, recommendation governance, human review |
| Dashboard & product feel | [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md) | Morning briefings, role homepages, task hierarchy, voice in the app |
| Dental operational truth | [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md) | How private practices actually operate — scheduling, insurance, emergencies |
| Phone conversation design | [`CALL_FLOWS.md`](CALL_FLOWS.md) | Per-intent structure, triage, slot collection, summary JSON schemas |
| Product backlog | [`FEATURE_BACKLOG.md`](FEATURE_BACKLOG.md) | Long-term ideas by capability area; sprints pull from here |
| Phased delivery | [`ROADMAP.md`](ROADMAP.md) | Phase scope, dependencies, delivery schedule |
| V1 scope and decision filter | [`V1_FOUNDATION.md`](V1_FOUNDATION.md) | What belongs in foundation release; what is explicitly deferred |
| Call intent vocabulary | [`INTENT_REGISTRY.md`](INTENT_REGISTRY.md) | Phase 1 wired intents vs CALL_FLOWS full enum |
| Technical architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) | Telephony, deployment, security, data model, coding standards — **not** conversation reasoning |
| PMS integration | [`PRACTICE_MANAGEMENT_SOFTWARE.md`](PRACTICE_MANAGEMENT_SOFTWARE.md) | Open Dental, Eaglesoft, Dentrix, CareStack — APIs and data models |
| Third-party services catalog | [`INTEGRATIONS.md`](INTEGRATIONS.md) | Telephony, voice, email, CRM, PMS connectors — **placeholder; not yet populated** |
| Sprint 3 coordination vision | [`SPRINT_3_COORDINATION.md`](SPRINT_3_COORDINATION.md) | Practice coordination sprint — time-bound; defers to Constitution and Operating Model for glossary |

**Complementary, not duplicate:** [`ARCHITECTURE.md`](ARCHITECTURE.md) (engineering) and [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) (reasoning) answer different questions. [`FREEDOMDESK_INTELLIGENCE.md`](FREEDOMDESK_INTELLIGENCE.md) (decade vision) and [`PRACTICE_OPERATING_SYSTEM.md`](PRACTICE_OPERATING_SYSTEM.md) (operational loops) are siblings — each defers to the other where noted in-document.

---

## Required reading order

Read in sequence before making substantive changes. Skim the authority map first if you are joining mid-project.

### Foundation — vision, principles, context

#### 1. [FREEDOMDESK_CONSTITUTION.md](FREEDOMDESK_CONSTITUTION.md)

The highest authority in the project. Governs what FreedomDesk is, what it owes callers and practices, and what it must never become — including safety, truth, clinical boundaries, and non-negotiable obligations that override specs, contracts, and implementation convenience.

#### 2. [FREEDOMDESK_PRINCIPLES.md](FREEDOMDESK_PRINCIPLES.md)

The timeless principles behind every product decision. Governs what we build, what we reject, and how features should behave — not implementation, not architecture, not phone scripts.

#### 3. [FREEDOMDESK_CONTEXT.md](FREEDOMDESK_CONTEXT.md)

The canonical product and domain context. Defines *why* we exist, *who* we serve, West Michigan market focus, personas, competitive landscape, voice agent identity, and HIPAA posture.

#### 4. [FREEDOMDESK_OPERATING_MODEL.md](FREEDOMDESK_OPERATING_MODEL.md)

How FreedomDesk works alongside practice management software and how people experience it every day. Defines the person model, responsibilities, My Day, Morning Brief, End of Day, and the canonical glossary used across sibling specs.

#### 5. [OPERATING_INTELLIGENCE.md](OPERATING_INTELLIGENCE.md)

The philosophical foundation for what *operating intelligence* means — FreedomDesk's permanent intellectual identity beyond any channel or surface. Defines what intelligence observes, understands, remembers, connects, anticipates, recommends, coordinates, and learns; what it ignores; how it routes attention; and what a perfect practice would no longer have to think about.

#### 6. [FREEDOMDESK_INTELLIGENCE.md](FREEDOMDESK_INTELLIGENCE.md)

The flagship product specification for FreedomDesk as the unified intelligence layer of a dental practice — how it answers questions, acts proactively, and compounds value across roles and time.

### Knowledge & reasoning

#### 7. [KNOWLEDGE_ENGINE.md](KNOWLEDGE_ENGINE.md)

The single source of truth for all knowledge implementation. Governs what FreedomDesk knows, how knowledge is structured across universal, regional, and office layers, and how it is versioned, resolved per practice, and consumed by reasoning systems — without embedding domain facts in brain code.

#### 8. [FREEDOMDESK_OFFICE_DNA.md](FREEDOMDESK_OFFICE_DNA.md)

The canonical definition of practice-specific operating profiles (Layer 3 knowledge). Governs what belongs in an office profile — scheduling, insurance, clinical workflows, staff preferences, and front-desk rules.

#### 9. [FREEDOMDESK_BRAIN_ARCHITECTURE.md](FREEDOMDESK_BRAIN_ARCHITECTURE.md)

The canonical reference for conversation intelligence. Governs how FreedomDesk reasons about patient calls — the five-brain model, conversation loop, and design rules for behaving like a careful dental team member rather than a keyword matcher or script reader.

#### 10. [EMOTIONAL_INTELLIGENCE_ENGINE.md](EMOTIONAL_INTELLIGENCE_ENGINE.md)

The canonical reference for emotionally intelligent conversation. Governs how FreedomDesk perceives, reasons about, and adapts to caller emotion — principles, assessment dimensions, interaction disciplines, and measurable outcomes — without scripts or phrase libraries.

### Practice intelligence & experience

#### 11. [PRACTICE_OPERATING_SYSTEM.md](PRACTICE_OPERATING_SYSTEM.md)

The founding architecture for FreedomDesk as an AI Chief of Staff — daily awareness, opportunity detection, role-specific success, recommendations, and practice-wide operational intelligence beyond individual calls.

#### 12. [CONTINUOUS_LEARNING_ENGINE.md](CONTINUOUS_LEARNING_ENGINE.md)

The canonical reference for organizational learning. Governs how FreedomDesk improves from every interaction — pattern detection, practice memory, recommendation governance, human review, and improvement cycles — without machine learning training or autonomous behavior change.

#### 13. [USER_EXPERIENCE_PHILOSOPHY.md](USER_EXPERIENCE_PHILOSOPHY.md)

The canonical product experience document. Governs how FreedomDesk should feel to the practice team — morning briefings, role-specific homepages, task hierarchy, end-of-day confidence, voice and language, and the principle that FreedomDesk is an operating intelligence platform, not a dashboard.

### Domain & calls

#### 14. [DENTAL_WORKFLOWS.md](DENTAL_WORKFLOWS.md)

How private dental practices actually operate — scheduling, insurance, emergencies, hygiene recall, treatment coordination, and front-desk communication. Operational truth for engineers and dental consultants.

#### 15. [CALL_FLOWS.md](CALL_FLOWS.md)

The canonical phone conversation design. Governs per-intent call structure, triage rules, slot collection, decision trees, and structured summary schemas — optimized for West Michigan independent general dentistry and aligned with Open Dental-ready front-desk output.

### Planning & delivery

#### 16. [FEATURE_BACKLOG.md](FEATURE_BACKLOG.md)

The permanent product backlog — long-term ideas organized by capability area. Sprints pull from here; [`ROADMAP.md`](ROADMAP.md) schedules delivery; [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md) governs how items must feel.

#### 17. [ROADMAP.md](ROADMAP.md)

Phased delivery plan from the current marketing site and dashboard prototypes to the full production AI phone platform. Use for phase scope and dependencies before starting implementation work.

#### 18. [V1_FOUNDATION.md](V1_FOUNDATION.md)

The document every engineer reads before writing code. V1 success criteria, decision filter, and explicit deferrals — not a feature backlog.

### Engineering & integrations

#### 19. [ARCHITECTURE.md](ARCHITECTURE.md)

Technical architecture reference for senior engineers — current Phase 0 implementation, target production architecture, security model, data flows, telephony pipeline, multi-tenancy, and coding standards. **Not** a substitute for brain or intelligence specs.

#### 20. [PRACTICE_MANAGEMENT_SOFTWARE.md](PRACTICE_MANAGEMENT_SOFTWARE.md)

Open Dental (priority), Eaglesoft, Dentrix, CareStack — APIs, data models, and integration patterns for West Michigan independent general dentistry.

#### 21. [INTEGRATIONS.md](INTEGRATIONS.md)

Third-party services catalog (telephony, voice, email, CRM, PMS connectors). **Currently empty** — integration detail is partially covered in [`ARCHITECTURE.md`](ARCHITECTURE.md) until this document is populated.

---

## Task-specific entry points

Use the full reading order for greenfield work. For focused tasks, start at the owning document, then read upstream authorities as needed.

| Task | Start here | Also read |
|------|------------|-----------|
| Dashboard / My Day / UI | [`USER_EXPERIENCE_PHILOSOPHY.md`](USER_EXPERIENCE_PHILOSOPHY.md) | Operating Model, Practice Operating System, Feature Backlog |
| Practice coordination (Sprint 3) | [`SPRINT_3_COORDINATION.md`](SPRINT_3_COORDINATION.md) | Constitution, Principles, Operating Model, UX Philosophy |
| Voice / phone agent | [`CALL_FLOWS.md`](CALL_FLOWS.md) | Brain Architecture, Emotional Intelligence, Dental Workflows, Architecture |
| Knowledge / prompts | [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) | Office DNA, `knowledge/` tree |
| PMS integration | [`PRACTICE_MANAGEMENT_SOFTWARE.md`](PRACTICE_MANAGEMENT_SOFTWARE.md) | Architecture, Integrations (when populated), Call Flows summaries |
| Phase scoping | [`ROADMAP.md`](ROADMAP.md) | V1 Foundation, Feature Backlog, Architecture |
| V1 scope check | [`V1_FOUNDATION.md`](V1_FOUNDATION.md) | Decision filter; [`IDEA_VAULT.md`](IDEA_VAULT.md) for deferred ideas |
| Intent naming | [`INTENT_REGISTRY.md`](INTENT_REGISTRY.md) | CALL_FLOWS, `src/engine/intents.js` |
| Deployment | [`DEPLOY.md`](../DEPLOY.md) | Architecture § Deployment |

---

## Runtime knowledge

Structured domain facts consumed by the prompt-context builder live in [`knowledge/`](../knowledge/) (see [`knowledge/manifest.json`](../knowledge/manifest.json)). That tree is the **current Phase M1 implementation** of [`KNOWLEDGE_ENGINE.md`](KNOWLEDGE_ENGINE.md) — markdown documents loaded by `src/engine/knowledge-store.js`. The full atom/resolver architecture described in KNOWLEDGE_ENGINE is planned; it does not replace the canonical docs above.

---

## Glossary (quick reference)

Full definitions live in [`FREEDOMDESK_OPERATING_MODEL.md`](FREEDOMDESK_OPERATING_MODEL.md). Use these when reading code or sibling specs.

| Term | Meaning |
|------|---------|
| **Person** | One human using FreedomDesk — not a job title or login role |
| **Responsibility** | A bundle of work a person owns today (front desk, clinical, manager) |
| **My Day** | Personal home surface — "What should I do next?" |
| **Morning Brief** | Practice-wide digest for managers; superset of filtered signals |
| **End of Day** | Personal close — reassurance or honest carry-forward |
| **Office DNA** | Layer 3 practice-specific config (hours, triage, insurance, scheduling) |
| **Practice Brain** | Daily intelligence loop (`src/practice-brain/`) — awareness, recommendations |
| **Business Brain** | Per-call scheduling/hours brain in the five-brains model — not the same as Practice Brain |
| **Five Brains** | Understanding, Psychology, Triage, Front Desk, Business — merged by orchestrator |
| **Operating intelligence** | FreedomDesk's product identity — defined philosophically in `OPERATING_INTELLIGENCE.md`; intelligence layer alongside the PMS |

Implementation maps: [`src/README.md`](../src/README.md), [`app/README.md`](../app/README.md).

---

## Related files outside `docs/`

| File | Role |
|------|------|
| [`README.md`](../README.md) | Repo overview, quick start, lead capture, deploy pointer |
| [`app/README.md`](../app/README.md) | Internal dashboard preview scope |
| [`src/README.md`](../src/README.md) | Intelligence layer source map |
| [`DEPLOY.md`](../DEPLOY.md) | Vercel deployment |
| [`.cursor/rules/freedomdesk.mdc`](../.cursor/rules/freedomdesk.mdc) | Cursor agent guardrails — defers to this index |
| [`voice/persona.json`](../voice/persona.json) | Aly voice persona (phone) |
| [`config/practices/`](../config/practices/) | Example practice configuration |
