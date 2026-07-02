# FreedomDesk Knowledge Engine

> **Status:** Canonical specification. Single source of truth for all knowledge implementation.  
> **Scope:** What FreedomDesk knows, how that knowledge is structured, versioned, resolved per office, and consumed by reasoning systems.  
> **Audience:** Engineers, dental consultants, product, and AI agents building or modifying knowledge, practice configuration, or brain integration.

---

## Document Authority

When documents conflict, resolve in this order:

1. [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) — highest authority
2. **This document** — knowledge structure, layers, APIs, and safety boundaries
3. [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) — how reasoning consumes knowledge
4. [`VISION.md`](../VISION.md) — product philosophy (reason from state; do not script)
5. Implementation guides: [`ARCHITECTURE.md`](ARCHITECTURE.md), [`CALL_FLOWS.md`](CALL_FLOWS.md), [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md)

**This document does not define reasoning logic.** It defines the educational foundation reasoning systems read from. If a proposed change embeds domain facts inside brain code instead of the Knowledge Engine, that change violates this specification.

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Layer Model](#2-layer-model)
3. [Knowledge Package Format](#3-knowledge-package-format)
4. [Resolver Architecture](#4-resolver-architecture)
5. [Knowledge Query API](#5-knowledge-query-api)
6. [Brain Integration Contract](#6-brain-integration-contract)
7. [Override System](#7-override-system)
8. [Versioning](#8-versioning)
9. [Safety Rules](#9-safety-rules)
10. [Migration Plan](#10-migration-plan)
11. [Engineering Rules](#11-engineering-rules)
12. [Examples](#12-examples)

---

## 1. Purpose

### 1.1 What the Knowledge Engine is

The **Knowledge Engine** is FreedomDesk's subsystem for **declarative domain truth** — everything the platform must know to serve dental practices without hardcoding workflows into reasoning code.

It answers questions like:

- What is a crown seat, and how does it differ from a new patient exam?
- What does "Delta Dental" mean in West Michigan, and how do we disambiguate programs?
- What symptoms constitute a red flag before clinical review?
- How long does a typical emergency evaluation take in a GP office?
- What are this office's hours, providers, emergency policy, and accepted insurance?

It does **not** answer:

- What should we ask this caller on turn seven?
- Should we reassure before collecting insurance on this specific call?
- What goal should the orchestrator choose right now?

Those are **reasoning** questions. They belong in `src/conversation/` (the Five Brains and `engine.ts`). The Knowledge Engine supplies facts, defaults, and playbooks; reasoning applies judgment to those inputs in call context.

### 1.2 Why it exists

FreedomDesk was founded on a discovery: **workflows must not be hardcoded.** A system that encodes one office's habits into platform code will fail at scale, violate practice autonomy (Constitution decision hierarchy, sixth priority), and produce untestable behavior.

The Constitution requires:

- **Configuration over hard-coding** — what varies by office belongs in configuration
- **Modularity** — understanding, triage, intake, and response generation must remain separable
- **Explainability** — routing and classification must cite inspectable logic
- **Truth** — speak only from verified information; do not fill gaps with plausible invention

The Vision requires:

- **Think, don't script** — reasoning from conversation state, not rigid trees frozen in code
- **Never ask a question without purpose** — every field collected must trace to operational need

The Knowledge Engine is how FreedomDesk honors both: **rich domain education without entangling it with per-turn judgment.**

### 1.3 Relationship to the Three Pillars

FreedomDesk separates three concerns:

| Pillar | Subsystem | Question | Location |
|--------|-----------|----------|----------|
| **Reasoning** | Five Brains + Orchestrator | *What should we do on this call, right now?* | `src/conversation/` |
| **Knowledge** | Knowledge Engine | *What is true in dentistry, and how do offices typically operate?* | `knowledge-engine/` |
| **Office DNA** | Practice configuration (L3) | *How is this office different?* | PostgreSQL + `knowledge-engine/layers/l3-office/` |

**Presentation** (how Aly speaks) is a fourth concern, intentionally outside the Knowledge Engine:

| Concern | Location | Notes |
|---------|----------|-------|
| Voice persona | `voice/persona.json` | Tone, pacing, phrases — not clinical facts |
| Conversation style | Reasoning layer + prompt excerpts | How to speak, not what is true |

### 1.4 Success criteria

The Knowledge Engine succeeds when:

1. A dentist can change crown-seat duration in admin config and every brain sees the new value **without a code deploy**
2. A triage decision cites **atom IDs and rule versions**, not "the model felt it was urgent"
3. West Michigan insurance disambiguation lives in one canonical place, not scattered across prompts and keyword lists
4. L1 safety content cannot be overridden by office configuration
5. Ten thousand offices share L1/L2 packages from CDN while L3 remains tenant-isolated
6. No file under `src/conversation/` contains carrier names, CDT codes, appointment durations, or emergency routing tables

### 1.5 Non-goals

The Knowledge Engine is **not**:

- A replacement for the practice management system
- A clinical decision support system
- A vector database or RAG pipeline (V1)
- A place to store patient data or call transcripts
- A free-text "custom instructions" field that bypasses guardrails

---

## 2. Layer Model

Knowledge is organized into three layers. Each layer has different authority, mutability, and ownership.

```
┌─────────────────────────────────────────────────────────────┐
│  L3  Office DNA          Per-practice overrides              │
│      "How Cascade Family Dentistry operates"                 │
├─────────────────────────────────────────────────────────────┤
│  L2  Best-Practice       Configurable defaults               │
│      Defaults            "How good West Michigan GP offices   │
│                          typically operate"                  │
├─────────────────────────────────────────────────────────────┤
│  L1  Universal           Profession-wide truth               │
│      Knowledge           "What dentistry is"                 │
└─────────────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
    Runtime merge              Authored in git,
    L3 > L2 > L1               versioned packages
```

### 2.1 Layer 1 — Universal Knowledge

**Definition:** Facts and definitions that are true regardless of which dental office is being served. Changes rarely. Owned by FreedomDesk clinical and domain governance.

**Characteristics:**

- Immutable or versioned on long cycles (e.g., annual CDT updates)
- Shared identically across all tenants
- Some atoms are **locked** — L3 cannot override them
- Not "how an office should operate" — "what the profession means"

**Domains:**

| Domain | Examples | Locked? |
|--------|----------|---------|
| Clinical terminology | Prophy, SRP, crown, bridge, abutment | No |
| Tooth anatomy | Quadrants, numbering systems (Universal, Palmer, FDI) | No |
| Specialty fundamentals | Endodontics, periodontics, prosthodontics, oral surgery, pediatric dentistry | No |
| Pharmacology reference | Drug classes, common dental prescriptions (reference only — never prescribe) | Partially |
| Oral pathology reference | Lesion terminology (not diagnosis on calls) | Partially |
| Medical history concepts | ASA classification, anticoagulant categories | No |
| Drug interaction awareness | Flags for "defer to clinician" — not dosing advice | Locked |
| Insurance terminology | PPO, HMO, EOB, coordination of benefits | No |
| CDT codes | ADA Current Dental Terminology | No |
| Imaging reference | PA, BW, FMX, panoramic — what they are | No |
| Safety / non-negotiables | Never diagnose, never prescribe, never promise coverage | **Locked** |
| Red-flag symptom definitions | Life-threatening presentation patterns | **Locked** |

**Storage:** `knowledge-engine/layers/l1-universal/`

**Prose supplements:** `knowledge-engine/prose/l1/` — human-readable reference; not authoritative without backing atoms.

### 2.2 Layer 2 — Clinical & Operational Best Practices

**Definition:** FreedomDesk-curated defaults for how independent dental practices typically operate. Configurable defaults — **not universal truth**. Offices may differ; L3 overrides apply here.

**Characteristics:**

- Packaged by region, specialty, and practice archetype
- Inherits from other L2 packs (e.g., `west-michigan-gp` extends `us-gp-private`)
- Safe to update with practice opt-in or version pinning
- Explicitly labeled as defaults in all consumer outputs

**Domains:**

| Domain | Examples |
|--------|----------|
| Emergency workflows | Typical same-day triage flow, symptom follow-up trees |
| Imaging recommendations | Typical PA/BW for new patient, emergency periapical |
| Appointment lengths | Default durations when office has not specified |
| Documentation patterns | Common charting and comm-log field expectations |
| Insurance intake | Disambiguation order, required fields per program |
| Front desk best practices | Hold language, transfer triggers, message-taking |
| Assistant best practices | Room prep expectations by appointment type |
| Patient psychology | Anxiety, embarrassment, pain-distress patterns |
| Scheduling workflows | Hygiene column patterns, recall intervals |
| Patient communication | Callback SLAs, confirmation norms |
| Office management | Block scheduling, team meeting patterns |
| Revenue cycle | Verification timing, fee discussion boundaries |

**Regional packs (initial):**

| Pack ID | Scope |
|---------|-------|
| `us-gp-private` | National independent general practice baseline |
| `west-michigan-gp` | West Michigan: Delta/HKD/Medicaid priority, local routing patterns |

**Storage:** `knowledge-engine/layers/l2-defaults/packs/` and `knowledge-engine/layers/l2-defaults/domains/`

**Important:** L2 content must never be stated to callers as fact about *their* office until merged with L3. Example: L2 default "new patient exam 90 minutes" becomes operative only if L3 does not specify otherwise.

### 2.3 Layer 3 — Office DNA

**Definition:** Everything unique to one dental practice. The Constitution's "practice autonomy" layer — hours, providers, policies, preferences, and operational rules that make one office different from another.

**Characteristics:**

- One L3 config per practice (per location at multi-site)
- Stored in PostgreSQL at runtime; templates and examples in git
- Expressed as a **patch** against resolved L2, not a parallel knowledge base
- Editable by office managers via admin UI (Phase 4+)
- Versioned with audit trail

**Domains:**

| Domain | Examples |
|--------|----------|
| Identity | Practice name, address, phone, timezone, website |
| Hours | Business hours, lunch closures, holiday closures |
| Providers | Dentists, hygienists, roles, pronunciation |
| Appointment types | Labels, durations, PMS mappings |
| Scheduling rules | New-patient days, blockouts, hygiene attachment |
| Insurance | Accepted carriers and programs, in-network flags |
| Emergency policy | Same-day enabled, on-call rotation, callback SLA, ER triggers |
| Doctor preferences | RCT in-house scope, implant policy, sedation |
| Financial policy | Payment expectations, financing referrals |
| Communication | Greeting scripts, agent name, after-hours messaging |
| Referral resources | Specialist partners, pharmacies, hospitals |
| Summary delivery | Email, SMS, webhook targets |
| Post-op scripts | Practice-approved scripts (opt-in only) |
| Clinical scope | What the office treats in-house vs. refers |

**Storage:**

- **Runtime:** `practice_configs` table (PostgreSQL, tenant-scoped, versioned)
- **Templates:** `knowledge-engine/layers/l3-office/templates/`
- **Examples:** `knowledge-engine/layers/l3-office/examples/` (e.g., migrated from `config/practices/`)

### 2.4 Layer assignment rules

When authoring content, assign to exactly one primary layer:

| If the content… | Layer |
|-----------------|-------|
| Would be true in a dental textbook nationwide | L1 |
| Describes how good offices *usually* do something | L2 |
| Describes how *this* office does something | L3 |
| Tells Aly how to *speak* | Persona / reasoning (not Knowledge Engine) |
| Tells the orchestrator how to *choose goals* | Brain architecture (not Knowledge Engine) |
| Describes PMS API field mappings | Integration docs; reference atoms only if needed for summaries |

### 2.5 Layer tagging in the registry

Every registered knowledge artifact carries:

```yaml
layer: l1 | l2 | l3
pack: <pack-id>          # required for l2
locked: true | false     # l1 safety atoms only
```

---

## 3. Knowledge Package Format

Knowledge ships as **versioned packages** containing **atoms** (machine-addressable units), **bundles** (grouped atoms for intents/domains), **prose** (optional human/LLM excerpts), and a **registry** (catalog and entity index).

### 3.1 Package identity

Packages are named and versioned with semantic versioning:

```
<scope>@<major>.<minor>.<patch>

Examples:
  l1-universal@2026.1.0        # annual CDT alignment
  l2-us-gp-private@1.0.0
  l2-west-michigan-gp@1.4.2
```

A practice's resolved knowledge references:

```
l1-universal@2026.1.0
+ l2-west-michigan-gp@1.4.2
+ l3://cascade-family-dentistry@47
```

### 3.2 Repository layout

Authoring lives in the monorepo:

```
knowledge-engine/
├── README.md
├── registry/
│   ├── manifest.json              # Master catalog (evolves from knowledge/manifest.json)
│   ├── packages.json              # Released package versions and checksums
│   └── entity-index.json          # Canonical IDs, synonyms, cross-references
├── schemas/
│   ├── atoms/                     # JSON Schema per atom type
│   ├── bundles/                   # Intent bundle, brain-slice schemas
│   └── office-dna/                # Practice config and override-patch schemas
├── layers/
│   ├── l1-universal/
│   ├── l2-defaults/
│   └── l3-office/
├── prose/                         # Markdown excerpts for LLM context
└── migrations/                    # Package-to-package transforms
```

Runtime code (future) lives separately:

```
src/knowledge-engine/              # Resolver, compiler, query API, cache
```

### 3.3 Atoms

An **atom** is the smallest addressable unit of knowledge. Atoms are JSON or YAML files validated against schemas in `schemas/atoms/`.

**Canonical ID format:**

```
atom://<domain>/<slug>

Examples:
  atom://appointment-type/crown-seat
  atom://insurance-program/delta-ppo-mi
  atom://symptom-cluster/spreading-swelling-with-fever
  atom://cdt/D2740
  atom://safety-rule/never-diagnose
  atom://red-flag/difficulty-breathing
```

**Atom envelope (required fields):**

```yaml
id: atom://appointment-type/crown-seat
layer: l2
pack: west-michigan-gp
version: 1
locked: false
type: appointment-type
title: Crown Seat
synonyms: ["seat a crown", "crown delivery", "cement crown"]
fields:
  defaultDurationMinutes: 45
  typicalOperatory: doctor
  requiresPriorPrep: true
references:
  cdtCodes: ["atom://cdt/D2740", "atom://cdt/D2750"]
  prose: "prose/l2/scheduling/crown-seat.md"
provenance:
  source: "FreedomDesk clinical review"
  reviewedAt: "2026-03-01"
```

**Atom types (V1 minimum):**

| Type | Purpose |
|------|---------|
| `safety-rule` | Non-negotiable behavioral constraints (L1, locked) |
| `red-flag` | Symptom/presentation patterns requiring escalation (L1, locked) |
| `insurance-program` | Program definition and disambiguation hints |
| `insurance-disambiguation-tree` | Ordered decision tree for intake |
| `appointment-type` | Scheduling unit with duration and PMS hints |
| `symptom-cluster` | Grouped symptoms for triage mapping |
| `urgency-matrix` | Maps clusters + flags to urgency levels |
| `required-fields` | Per-intent field checklist for Front Desk Brain |
| `communication-playbook` | Tone guidance tied to patient state (not workflow) |
| `cdt-code` | Procedure code reference |
| `pms-type-hint` | PMS field mapping metadata (reference, not live API) |

### 3.4 Bundles

**Bundles** group atoms for efficient loading. Two bundle types matter:

**Intent bundles** — loaded per call intent:

```yaml
id: bundle://intent/NEW_PATIENT
version: 1
atoms:
  - atom://insurance-disambiguation-tree/west-michigan-default
  - atom://required-fields/new-patient
  - atom://appointment-type/new-patient-exam
prose:
  - prose/l2/call-flows/new-patient-excerpt.md
  - prose/l2/michigan/new-patient-regional-excerpt.md
```

**Brain slices** — pre-computed views for a specific brain (see §5):

```yaml
id: bundle://brain/triage
version: 1
atoms:
  - atom://red-flag/*
  - atom://symptom-cluster/*
  - atom://urgency-matrix/gp-default
```

### 3.5 Prose documents

Prose is **supplementary**. It exists for:

- LLM prompt context (budgeted excerpts)
- Admin UI explanations
- Dental consultant review

**Rules:**

1. Every prose document that drives behavior must reference backing atom IDs
2. Prose may not introduce facts absent from atoms (CI validates)
3. Prefer `promptExcerpt` variants for token-budgeted assembly
4. Full documents live in `knowledge-engine/prose/`; excerpts may be generated or hand-maintained

**Evolution from today:** `knowledge/*.md` migrates to `knowledge-engine/prose/` with layer tags and atom backlinks.

### 3.6 Registry files

**`registry/manifest.json`** — catalog of all artifacts:

```yaml
version: "2.0.0"
documents: [...]       # prose catalog (backward compatible with knowledge/manifest.json)
atoms: [...]             # atom registry entries
bundles: [...]           # intent and brain bundles
intentBundles:
  NEW_PATIENT:
    bundle: bundle://intent/NEW_PATIENT
  EMERGENCY:
    bundle: bundle://intent/EMERGENCY
```

**`registry/entity-index.json`** — deduplication and synonym resolution:

```yaml
entities:
  - id: atom://appointment-type/crown-seat
    synonyms: ["cap seat", "crown cementation"]
    replaces: []                    # deprecated IDs that alias here
  - id: atom://insurance-program/delta-ppo-mi
    synonyms: ["delta ppo", "delta dental ppo", "employer delta"]
    parent: atom://insurance-program/delta-dental-brand
```

**`registry/packages.json`** — release manifest:

```yaml
packages:
  - id: l1-universal
    version: "2026.1.0"
    sha256: "..."
    releasedAt: "2026-01-15"
    channel: stable
  - id: l2-west-michigan-gp
    version: "1.4.2"
    extends: l2-us-gp-private@1.0.0
    sha256: "..."
    channel: stable
```

### 3.7 Office DNA schema (L3)

L3 practice configuration validates against `schemas/office-dna/practice-config.schema.json`.

Required envelope fields:

```yaml
practiceId: string          # stable tenant identifier
schemaVersion: string       # office DNA schema version
knowledgePackages:
  l1: l1-universal@2026.1.0
  l2: l2-west-michigan-gp@1.4.2
extends: l2-west-michigan-gp@1.4.2
overrides: { ... }          # patch set (see §7)
disables: [ ... ]           # atom IDs to exclude from L2
lockedAcknowledgements: [ ... ]  # safety atoms office has read (audit)
```

The existing `config/practices/example-grand-rapids.json` is the reference shape for L3 content domains; it will gain `extends`, `knowledgePackages`, and structured `overrides` during migration.

---

## 4. Resolver Architecture

The **Resolver** merges L1, L2, and L3 into a single **Resolved Knowledge Snapshot** per practice. Resolution is deterministic, versioned, and cacheable.

### 4.1 Components

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ L1 Package   │     │ L2 Package   │     │ L3 Office    │
│ (CDN/git)    │     │ (CDN/git)    │     │ (PostgreSQL) │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            ▼
                   ┌─────────────────┐
                   │    Resolver     │
                   │  merge + validate│
                   └────────┬────────┘
                            ▼
                   ┌─────────────────┐
                   │    Compiler     │
                   │  index + denorm │
                   └────────┬────────┘
                            ▼
                   ┌─────────────────┐
                   │ ResolvedKnowledge│
                   │ Snapshot         │
                   └────────┬────────┘
                            ▼
                   ┌─────────────────┐
                   │  Cache (Redis)   │
                   │  per practice@   │
                   │  version key     │
                   └─────────────────┘
```

| Component | Responsibility |
|-----------|----------------|
| **Loader** | Fetch L1/L2 packages by version; fetch L3 by `practiceId` + `configVersion` |
| **Resolver** | Apply merge strategies (§7); resolve inheritance chain for L2 packs |
| **Validator** | Schema validation; orphan override detection; locked-field enforcement |
| **Compiler** | Build indexes: synonym maps, intent bundles, brain slices, prompt excerpts |
| **Cache** | Store compiled snapshot; invalidate on L3 edit or package upgrade |

### 4.2 Resolution pipeline

```
1. LOAD     Fetch pinned L1@version, L2@version, L3@configVersion
2. INHERIT  Expand L2 pack inheritance chain (child → parent → …)
3. MERGE    Apply L2 chain onto L1, then apply L3 overrides
4. DISABLE  Remove L3-disabled atoms from effective set
5. LOCK     Re-assert L1 locked atoms; reject L3 overrides that conflict
6. VALIDATE Schema + referential integrity + CI rules
7. COMPILE  Build ResolvedKnowledgeSnapshot
8. CACHE    Store at key: {practiceId}:{configVersion}:{l1}:{l2}
```

Resolution is **pure**: same inputs always produce the same snapshot hash.

### 4.3 Resolved Knowledge Snapshot

The snapshot is the only object consumers read at call time.

```yaml
meta:
  practiceId: cascade-family-dentistry
  configVersion: 47
  l1Package: l1-universal@2026.1.0
  l2Package: l2-west-michigan-gp@1.4.2
  compiledAt: "2026-07-02T04:00:00Z"
  snapshotHash: "sha256:..."
indexes:
  atomsById: { ... }
  synonyms: { "delta ppo": "atom://insurance-program/delta-ppo-mi" }
  intentBundles: { NEW_PATIENT: [...atom ids...] }
  brainSlices: { triage: [...], frontDesk: [...] }
effective:
  appointmentTypes: { ... }
  insurancePrograms: { ... }
  emergencyPolicy: { ... }
  redFlagRules: [ ... ]           # from L1, never overridden
  safetyRules: [ ... ]            # from L1, never overridden
  requiredFieldsByIntent: { ... }
promptExcerpts:
  NEW_PATIENT: "..."              # budget-trimmed prose
```

### 4.4 When resolution runs

| Trigger | Action |
|---------|--------|
| Inbound call | Read snapshot from cache (no resolution on hot path) |
| Office manager saves config | Re-resolve + recompile + cache invalidate |
| L2 package upgrade (opt-in) | Re-resolve all affected practices |
| L1 package upgrade | Re-resolve all practices; may require migration review |
| New practice onboarding | Initial resolve + compile + cache seed |

**Latency requirement:** Resolution may take seconds. Call handling may not. Target cache read: **< 5ms**.

### 4.5 Failure modes

| Failure | Behavior |
|---------|----------|
| L3 config invalid | Reject save in admin; use last known good snapshot |
| L3 missing at call time | Fail closed: safe minimal greeting + transfer/callback; alert ops |
| L2 package not found | Pin to last known; alert ops; block onboarding completion |
| L1 package not found | Platform halt for new calls; existing cache continues until TTL |
| Merge conflict (locked) | Reject L3 override with explicit error to office manager |

Aligns with Constitution: **fail gracefully and honestly** — never invent office facts.

---

## 5. Knowledge Query API

Brains and services access knowledge exclusively through the **Knowledge Query API**. No consumer reads `knowledge-engine/` files or `knowledge/*.md` directly at runtime.

### 5.1 API surface (conceptual)

Two-stage access:

```
KnowledgeEngine.forCall(practiceId, callContext) → ResolvedKnowledgeSnapshot
KnowledgeEngine.query(snapshot, request) → KnowledgeSlice
```

**`callContext`:**

```yaml
intent: NEW_PATIENT | EMERGENCY | SCHEDULE_EXISTING | ...
regionPack: west-michigan-gp        # resolved from L3 if not passed
pmsType: open_dental
phase: greeting | intake | triage | scheduling | close
```

**`request`:**

```yaml
domain: triage | frontDesk | insurance | scheduling | safety | prompt
slice: brainSliceName | intentBundleName
mode: structured | prompt
budget:                         # prompt mode only
  maxCharacters: 12000
```

### 5.2 Query types by consumer

| Consumer | Query | Mode | Returns |
|----------|-------|------|---------|
| `triage.ts` | `{ domain: triage, slice: triage }` | structured | `redFlagRules`, `symptomClusters`, `urgencyMatrix` |
| `understanding.ts` | `{ domain: insurance, slice: aliases }` | structured | Synonym maps, program hints |
| Front Desk helpers | `{ domain: frontDesk, slice: requiredFields, intent }` | structured | Ordered field checklist |
| `engine.ts` | `{ domain: safety, slice: guardrails }` | structured | Locked safety rules |
| `prompt-context-builder` | `{ domain: prompt, slice: intent, mode: prompt }` | prompt | Budgeted prose + practice summary |
| `summary.ts` | `{ domain: frontDesk, slice: summarySchema, intent }` | structured | Required summary fields |
| Admin UI | `{ domain: *, mode: structured }` | structured | Effective knowledge viewer |

### 5.3 KnowledgeSlice response shape

Every query returns provenance:

```yaml
slice:
  appointmentTypes:
    crown-seat:
      durationMinutes: 45
      label: Crown Seat
      openDentalType: Crown Seat
provenance:
  crown-seat:
    - { layer: l3, path: overrides.appointmentTypes.crown-seat }
    - { layer: l2, atom: atom://appointment-type/crown-seat, field: defaultDurationMinutes, overridden: true }
defaultsUsed:
  - atom://appointment-type/crown-seat
locked: []
```

### 5.4 Prompt assembly (migrated from PromptContextBuilder)

`src/engine/prompt-context-builder.js` becomes a **thin adapter** over `KnowledgeEngine.query(..., { mode: prompt })`.

Assembly order (preserved from `knowledge/manifest.json`):

1. Global guardrails (L1 safety atoms → prose excerpts)
2. Persona (from `voice/persona.json` — not Knowledge Engine)
3. Regional/procedural supplements (L2 prose via intent bundle)
4. Practice configuration (L3 formatted summary)
5. Intent-specific knowledge (bundle prose)
6. Call flow excerpt (if defined for intent)

Budget enforcement remains: exceed `maxCharacters` → error in strict mode, trim by excerpt priority in production fallback (logged, never silent in CI).

### 5.5 Structured vs prompt mode

| Mode | Used by | Content |
|------|---------|---------|
| **structured** | Brains, rule floors, validators | Typed atoms, rules, maps — no narrative |
| **prompt** | LLM turns | Budgeted prose excerpts + formatted L3 summary |

**Invariant (Constitution):** Safety-critical behavior must not depend on prompt mode alone. Red-flag evaluation uses structured mode in `triage.ts` with L1 atoms as the rule floor.

---

## 6. Brain Integration Contract

This section defines how the Five Brains ([`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md)) consume the Knowledge Engine.

### 6.1 Separation of concerns

| Knowledge Engine provides | Brain provides |
|---------------------------|----------------|
| What a crown seat is | Whether this caller needs a crown seat |
| Default emergency callback SLA | Whether to escalate before collecting DOB |
| Insurance disambiguation tree | Which branch matches caller's words |
| Required fields for NEW_PATIENT | Which missing field to ask next |
| Red-flag definitions | Whether caller's symptoms match a red flag |

### 6.2 Integration rules

1. **Brains do not fetch knowledge.** `engine.ts` loads the snapshot once per turn (or per call) and passes slices as arguments.

2. **Brains do not call each other.** Orchestration stays in `engine.ts`.

3. **Brains do not import from `knowledge-engine/` or read markdown files.**

4. **Brains return assessments with provenance** when knowledge informed the output:
   ```yaml
   urgency: urgent_today
   reasons:
     - { atom: atom://red-flag/spreading-swelling-with-fever, matched: true }
     - { atom: atom://l3/emergencyPolicy.sameDayEmergencyEnabled, value: true }
   ```

5. **State remains dumb data** (`state.ts`). Knowledge does not live in `ConversationState`.

6. **LLM is Layer C; atoms are Layer A.** Precedence: code rule floor (L1 atoms) > brain judgment > LLM phrasing.

### 6.3 Per-brain contracts

#### Understanding Brain (`understanding.ts`)

**Receives:** `slice.aliases`, `slice.insuranceProgramHints`, `slice.appointmentTypeSynonyms`

**Returns:** `PatientUnderstanding` — extracted facts only; no final urgency/emotion (migrating out per brain architecture)

**Must not:** Classify insurance program finally (Front Desk); set urgency (Triage)

#### Psychology Brain (`psychology.ts`)

**Receives:** `slice.communicationPlaybooks` (anxiety, embarrassment, pain-distress)

**Returns:** `EmotionAssessment` + tone recommendations

**Must not:** Override triage priority; invent reassurance that implies clinical facts

#### Clinical/Triage Brain (`triage.ts`)

**Receives:** `slice.redFlagRules`, `slice.symptomClusters`, `slice.urgencyMatrix`, `slice.emergencyPolicy` (L3)

**Returns:** `UrgencyAssessment` + escalation recommendation

**Must not:** Diagnose; promise same-day slot unless L3 policy enables the language

#### Front Desk Brain (helpers + `engine.ts`)

**Receives:** `slice.requiredFieldsByIntent`, `slice.insuranceDisambiguation`, `slice.appointmentTypes`

**Returns:** Ordered `missingFields`, insurance classification candidate

**Must not:** Promise coverage; quote fees

#### Business/Practice Brain (`engine.ts` helpers)

**Receives:** `slice.schedulingRules`, `slice.clinicalScope`, `slice.hoursOfOperation`

**Returns:** Production flags, scheduling constraints, after-hours routing hints

**Must not:** Auto-book without PMS validation

#### Orchestrator (`engine.ts`)

**Receives:** All brain outputs + full snapshot access for goal selection

**Returns:** `EngineDecision` — single next goal

**Precedence (unchanged from brain architecture):**

1. Life-threatening emergency
2. Urgent clinical
3. Acute emotional distress (brief)
4. Missing critical fields
5. Scheduling / completion

### 6.4 Turn processing sequence

```
snapshot = KnowledgeEngine.forCall(practiceId, { intent, pmsType })

understanding = understandPatientMessage(message, query(snapshot, { slice: aliases }))
state         = mergeState(state, understanding)

emotion  = assessEmotion(message, state, query(snapshot, { slice: psychology }))
urgency  = assessUrgency(understanding, state, query(snapshot, { slice: triage }))
missing  = getMissingFields(state, intent, query(snapshot, { slice: frontDesk }))
practice = assessPracticeSignals(state, query(snapshot, { slice: business }))

decision = determineNextGoal({ state, emotion, urgency, missing, practice })
```

### 6.5 Prompt injection per turn

When the LLM generates patient-facing language:

```
promptContext = query(snapshot, { domain: prompt, intent, budget: 12000 })
```

Prompt context is **input** to the LLM, not a substitute for brain outputs. The state machine and rule floors still govern structure.

---

## 7. Override System

Office customization is expressed as **overrides** against resolved L2 defaults — not as duplicate knowledge.

### 7.1 Precedence

```
L3 Office DNA  >  L2 Default Pack  >  L1 Universal
```

L1 **locked** atoms are not overridable at any level.

### 7.2 Merge strategies

Each override path declares a merge strategy:

| Strategy | Semantics | Example |
|----------|-----------|---------|
| `replace` | L3 value wholly replaces L2/L1 for this path | `emergencyPolicy.callbackSlaMinutes: 15` |
| `deep-merge` | Objects merge recursively; L3 keys win | Add one `appointmentType` while inheriting others |
| `append` | L3 adds to L2 arrays | Additional accepted insurance program |
| `remove` | L3 removes specific L2 atom or list entry | `disables: ["atom://l2/imaging/pano-np-default"]` |
| `locked` | No override permitted | L1 `safety-rule/*`, `red-flag/*` |

### 7.3 Override patch format

```yaml
practiceId: cascade-family-dentistry
extends: l2-west-michigan-gp@1.4.2
overrides:
  appointmentTypes:
    _merge: deep-merge
    crown-seat:
      durationMinutes: 45
      openDentalType: Crown Seat
  emergencyPolicy:
    _merge: replace
    sameDayEmergencyEnabled: true
    callbackSlaMinutes: 30
    onCallRotation: [...]
  insurance:
    _merge: deep-merge
    acceptedMedicaidPrograms:
      _merge: append
      - healthy_kids_dental
disables:
  - atom://l2-defaults/scheduling/wednesday-pm-block
```

### 7.4 Inheritance (L2 packs)

L2 packs may extend other L2 packs:

```yaml
# l2-west-michigan-gp@1.4.2
extends: l2-us-gp-private@1.0.0
overrides:
  insurance-disambiguation-order:
    _merge: replace
    order:
      - atom://insurance-program/delta-ppo-mi
      - atom://insurance-program/delta-medicaid-mi
      - atom://insurance-program/healthy-kids-dental
      - atom://insurance-program/michigan-medicaid-adult
```

Resolution flattens the chain before L3 applies.

### 7.5 Effective knowledge viewer

Admin UI (Phase 4) must show, for any atom or field:

- Final effective value
- Which layer set it
- Which defaults were overridden
- Which L2 atoms were disabled

This is essential for Constitution **explainability** and practice trust.

### 7.6 Anti-patterns (forbidden)

| Anti-pattern | Why forbidden |
|--------------|---------------|
| Free-text "custom AI instructions" | Bypasses guardrails; not testable |
| Copying L2 markdown into L3 | Creates duplication drift |
| Per-office fork of L1 atoms | Breaks universal truth |
| Override of locked safety atoms | Violates Constitution |
| Embedding overrides in brain code | Violates configuration-over-code |

---

## 8. Versioning

Knowledge is **firmware**, not a wiki. Practices pin versions; upgrades are deliberate.

### 8.1 Version identifiers

| Artifact | Version format | Example |
|----------|----------------|---------|
| L1 package | `YYYY.major.minor` or semver | `l1-universal@2026.1.0` |
| L2 package | semver | `l2-west-michigan-gp@1.4.2` |
| L3 office config | monotonic integer | `cascade-family@47` |
| Atom | integer per atom | `atom version: 3` |
| Snapshot | content hash | `sha256:abc...` |

### 8.2 Release channels

| Channel | Purpose |
|---------|---------|
| `stable` | Default for new onboardings |
| `pinned` | Per-practice lock until admin upgrades |
| `canary` | Guardrail hotfixes; 1% rollout, 24h bake |

### 8.3 Upgrade flows

**L1 upgrade (e.g., annual CDT):**

1. FreedomDesk publishes `l1-universal@2027.1.0`
2. Migration notes document atom additions/deprecations
3. Practices auto-apply if non-breaking; breaking changes require explicit approval
4. All snapshots recompiled

**L2 upgrade (regional playbook change):**

1. Publish new L2 package
2. Admin UI shows diff: new defaults vs. office's effective values
3. Office chooses: **Accept recommended defaults** | **Keep my overrides** | **Pin old L2**
4. Recompile affected snapshots

**L3 edit (office manager):**

1. Validate against schema + locked rules
2. Increment `configVersion`
3. Recompile single practice snapshot
4. Audit log entry (who, when, what changed — no PHI in log metadata)

### 8.4 Rollback

- Every compiled snapshot stores `snapshotHash` and source versions
- One-click rollback to `configVersion N-1` for L3
- L1/L2 rollback via package pin (re-resolve all affected practices)

### 8.5 Deprecation

Atoms are deprecated, not deleted, for one major cycle:

```yaml
id: atom://insurance-program/delta-premier-legacy
deprecated:
  since: l2-west-michigan-gp@1.5.0
  replacedBy: atom://insurance-program/delta-premier-mi
  removeIn: l2-west-michigan-gp@2.0.0
```

Entity index aliases deprecated IDs to replacements.

### 8.6 Changelog requirements

Every package release includes:

- Added, changed, deprecated, removed atoms
- Affected intent bundles
- Safety impact assessment (required for L1 and triage-related L2 changes)
- Migration script reference if applicable

---

## 9. Safety Rules

Safety rules are constitutional requirements expressed as Knowledge Engine policy.

### 9.1 Locked L1 atoms

The following **cannot** be overridden by L2 or L3:

| Atom domain | Rule |
|-------------|------|
| `safety-rule/never-diagnose` | Do not name diseases or confirm conditions on calls |
| `safety-rule/never-prescribe` | Do not recommend drugs or dosages |
| `safety-rule/never-promise-coverage` | Do not guarantee benefits, fees, or balances |
| `safety-rule/never-promise-availability` | Do not confirm appointments until PMS/staff validates |
| `safety-rule/never-invent-facts` | Missing information stays missing |
| `safety-rule/never-ignore-red-flags` | Urgent indicators always escalate per protocol |
| `red-flag/*` | Life-threatening symptom definitions and ER routing triggers |

### 9.2 Rule floor architecture

```
Layer A (authoritative): L1 atoms → deterministic code in triage.ts / engine.ts
Layer B (judgment):      Brains apply knowledge slices to call state
Layer C (language):      LLM phrasing constrained by A and B
```

**LLM cannot lower urgency below Layer A matches.**

Keyword logic in brains is transitional. Target: rules load from L1 atoms; keywords become test fixtures, not definitions.

### 9.3 Provenance and audit

Any output that affects routing, urgency, or insurance classification must cite:

- Atom ID or L3 path
- Package versions
- Rule match boolean

Audit logs use atom IDs — not patient content.

### 9.4 PHI boundaries

| Allowed in Knowledge Engine | Forbidden |
|-----------------------------|-----------|
| Practice name, hours, policies | Patient names, DOB, phone |
| Generic symptom cluster definitions | Caller-specific symptom storage |
| Insurance program taxonomy | Member IDs, group numbers |
| Example configs (synthetic) | Real call transcripts |

Knowledge packages contain **no PHI**. L3 stores practice operational config only.

### 9.5 Clinical review gate

Changes to these require clinical/domain review before release:

- `l1-universal/**/safety/**`
- `l1-universal/**/red-flag/**`
- L2 emergency workflows and urgency matrices
- Any new locked atom

### 9.6 Constitution alignment checklist

Every knowledge change must pass:

| Constitution principle | Knowledge Engine enforcement |
|------------------------|------------------------------|
| Truth | Atoms are sourced and versioned; no prose-only behavior |
| Safety | Locked L1; structured triage mode |
| Humility | Knowledge provides facts; brains state limits |
| Practice autonomy | L3 overrides within locked bounds |
| Explainability | Provenance on every slice |
| Configuration over code | No domain literals in `src/conversation/` |

---

## 10. Migration Plan

Migration evolves today's `knowledge/`, `knowledge/manifest.json`, `config/practices/`, and `prompt-context-builder.js` into this specification without breaking the runnable app.

### 10.1 Current state inventory

| Asset | Location | Target |
|-------|----------|--------|
| Knowledge markdown | `knowledge/**` | `knowledge-engine/prose/` + backing atoms |
| Knowledge catalog | `knowledge/manifest.json` | `knowledge-engine/registry/manifest.json` |
| Practice example | `config/practices/example-grand-rapids.json` | `knowledge-engine/layers/l3-office/examples/` |
| File loader | `src/engine/knowledge-store.js` | Retained; used by resolver loader |
| Prompt assembly | `src/engine/prompt-context-builder.js` | Thin adapter over Query API |
| Brain stubs | `src/conversation/*.ts` | Consume structured slices |
| Workflow docs | `docs/DENTAL_WORKFLOWS.md`, `docs/CALL_FLOWS.md` | Source material for atoms; remain as human reference |

### 10.2 Migration phases

#### Phase M1 — Foundation (no behavior change)

- Create `knowledge-engine/` directory structure
- Add JSON Schemas for V1 atom types and office DNA
- Add layer tags to existing `knowledge/manifest.json` entries
- Write `registry/entity-index.json` for top 30 concepts
- Document mapping table (markdown → layer → atom ID)
- CI: manifest paths still valid

**Exit criteria:** Directory exists; schemas validate; no runtime changes.

#### Phase M2 — Atom extraction (parallel catalog)

- Extract V1 atoms from highest-value content:
  - 6 safety/red-flag atoms
  - 6 Michigan insurance programs + disambiguation tree
  - 8 appointment types
  - 6 symptom clusters + urgency matrix
  - 3 intent bundles (NEW_PATIENT, EMERGENCY, SCHEDULE_EXISTING)
- Prose files gain `atoms:` frontmatter backlinks
- CI: prose-atom consistency check (new linter)

**Exit criteria:** V1 atom set covers new-patient and emergency calls.

#### Phase M3 — Resolver (behind feature flag)

- Implement Resolver + Compiler (see `src/knowledge-engine/`)
- Compile `example-grand-rapids` snapshot
- Snapshot hash matches golden fixture in tests
- `PromptContextBuilder` reads from snapshot when flag enabled

**Exit criteria:** Prompt output parity (±5% character budget) with legacy builder.

#### Phase M4 — Brain wiring

- `triage.ts` loads red-flag rules from structured slice
- Front Desk `getMissingFields` loads from `required-fields` atoms
- Remove duplicated domain literals from `understanding.ts` (aliases from snapshot)
- Deprecation JSDoc on embedded urgency/emotion keywords

**Exit criteria:** Zero carrier names and CDT codes in `src/conversation/`.

#### Phase M5 — L3 schema + admin readiness

- Add `extends`, `knowledgePackages`, `overrides` to office DNA schema
- Migrate `example-grand-rapids.json` to new schema
- Effective knowledge viewer (read-only CLI or admin page)
- PostgreSQL `practice_configs` alignment per `ARCHITECTURE.md`

**Exit criteria:** Office manager can see effective crown-seat duration source layers.

#### Phase M6 — Deprecate legacy paths

- `knowledge/` → symlink or redirect to `knowledge-engine/prose/`
- `config/practices/` → examples only; runtime from DB
- Remove feature flag; snapshot-only path
- Update all docs to reference this specification

**Exit criteria:** No production code reads `knowledge/*.md` without resolver.

### 10.3 File mapping (initial)

| Current file | Layer | Atom(s) |
|--------------|-------|---------|
| `knowledge/ai/guardrails.md` | L1 | `safety-rule/*` |
| `knowledge/dentistry/emergencies.md` | L1 + L2 | `red-flag/*`, `symptom-cluster/*` |
| `knowledge/dentistry/terminology.md` | L1 | terminology atoms |
| `knowledge/procedures/common-cdt-codes.md` | L1 | `cdt/*` |
| `knowledge/insurance/concepts.md` | L1 | insurance terminology |
| `knowledge/insurance/delta-dental.md` | L2 | `insurance-program/delta-*` |
| `knowledge/michigan/*.md` | L2 | `west-michigan-gp` pack atoms |
| `knowledge/scheduling/*.md` | L2 | appointment-type defaults |
| `knowledge/office/*.md` | L2 | operational playbooks |
| `knowledge/call-flows/new-patient.md` | L2 | `bundle://intent/NEW_PATIENT` prose |
| `knowledge/software/*.md` | — | Integration docs; not in call prompts |
| `config/practices/example-grand-rapids.json` | L3 | full office DNA |

### 10.4 Backward compatibility

During M1–M4:

- `knowledge/manifest.json` remains valid
- `PromptContextBuilder` API unchanged externally
- Existing tests pass without snapshot flag
- Brains fall back to legacy behavior if snapshot unavailable (logged; alert)

### 10.5 V1 scope boundaries

**In V1:**

- One L2 regional pack: `west-michigan-gp`
- ~30 atoms, 3 intent bundles
- Structured triage + front desk slices
- Prompt adapter parity

**Not in V1:**

- Full CDT corpus
- Vector / RAG search
- DSO org-level L2.5 templates
- Real-time knowledge editing during calls
- Self-service L2 upgrade UI (manual ops acceptable)

---

## 11. Engineering Rules

### 11.1 Authoring rules

1. **Atoms first.** Create or update the atom before prose.
2. **One canonical ID per concept.** Synonyms go in entity index.
3. **Layer honesty.** Do not put office-specific content in L2 or universal clinical opinion in L1.
4. **Locked means locked.** CI rejects L3 patches targeting locked paths.
5. **Intent bundles stay small.** Load only what the intent needs.
6. **Prose excerpts are budgeted.** Full docs are for humans; excerpts for LLM.

### 11.2 Runtime rules

1. **No file reads outside Resolver** in conversation hot path.
2. **Snapshot at call start** (or cache hit); refresh only on config change mid-call if admin saves.
3. **Structured mode for safety.** Triage and guardrails never depend on prompt mode alone.
4. **Provenance required** on urgency, insurance classification, and escalation outputs.
5. **No PHI in knowledge logs** — log `practiceId`, `configVersion`, atom IDs.

### 11.3 CI and validation gates

| Gate | Check |
|------|-------|
| Schema validation | All atoms and L3 configs validate |
| Orphan overrides | L3 paths resolve to L2/L1 atoms |
| Duplicate IDs | No collisions in entity index |
| Prose-atom drift | Prose facts match atom fields |
| Layer violations | L3 content not in L2 files |
| Brain literal scan | No domain literals in `src/conversation/` |
| Locked override scan | No L3 override of locked atoms |
| Bundle resolution | Every intent bundle atom exists |
| Snapshot golden test | Example practice compiles to expected hash |

### 11.4 Testing requirements

| Layer | Requirement |
|-------|-------------|
| Resolver | Unit tests per merge strategy; golden snapshots |
| Query API | Contract tests per brain slice |
| Brains | Rule floor tests with fixture snapshots |
| Prompt adapter | Character budget + section order parity |
| Migration | Legacy vs snapshot diff tests during M3 |

### 11.5 Documentation rules

- This document is updated when the Knowledge Engine changes shape
- `FREEDOMDESK_BRAIN_ARCHITECTURE.md` references this doc for knowledge access — not file paths
- `ARCHITECTURE.md` config-service section references L3 versioning here
- New atoms require entry in `entity-index.json`

### 11.6 Agent rules (Cursor / AI)

Before modifying knowledge or brains:

1. Read this document
2. Identify layer (L1/L2/L3) for the content
3. If adding a fact → atom, not brain literal
4. If adding urgency logic → L1 atom + `triage.ts` loader
5. If adding office behavior → L3 schema field
6. Do not conflate persona with knowledge

---

## 12. Examples

### 12.1 Example: Crown seat duration override

**L2 atom** (`l2-west-michigan-gp`):

```yaml
id: atom://appointment-type/crown-seat
layer: l2
fields:
  defaultDurationMinutes: 60
  label: Crown Seat
```

**L3 override** (Cascade Family Dentistry):

```yaml
overrides:
  appointmentTypes:
    _merge: deep-merge
    crown-seat:
      durationMinutes: 45
      openDentalType: Crown Seat
```

**Effective snapshot:**

```yaml
appointmentTypes:
  crown-seat:
    durationMinutes: 45
    label: Crown Seat
    openDentalType: Crown Seat
provenance:
  crown-seat:
    - { layer: l3, field: durationMinutes }
    - { layer: l2, atom: atom://appointment-type/crown-seat, overridden: true }
```

**Front Desk Brain query** returns 45 minutes. No code deploy.

---

### 12.2 Example: Delta Dental disambiguation

**L1 atom** (terminology):

```yaml
id: atom://insurance-term/brand-vs-program
layer: l1
fields:
  definition: "Carrier brand names often map to multiple distinct programs with different benefits and assignment rules."
```

**L2 atom** (West Michigan tree):

```yaml
id: atom://insurance-disambiguation-tree/west-michigan-default
layer: l2
fields:
  order:
    - atom://insurance-program/delta-ppo-mi
    - atom://insurance-program/delta-medicaid-mi
    - atom://insurance-program/healthy-kids-dental
  questions:
    - when: "caller says delta dental"
      ask: "Is this through an employer plan, or state insurance like Medicaid or Healthy Kids?"
```

**L3 override** (office accepts only some programs):

```yaml
overrides:
  insurance:
    _merge: deep-merge
    acceptedMedicaidPrograms:
      _merge: append
      - healthy_kids_dental
    acceptedCarriers:
      _merge: replace
      - Delta Dental PPO
      - Blue Cross Blue Shield of Michigan
```

**Understanding Brain** maps "my kid has state insurance" → hint toward HKD.

**Front Desk Brain** asks disambiguation question from tree; classifies to `healthy_kids_dental` only if in L3 accepted list.

**Never:** Understanding or LLM says "you're covered."

---

### 12.3 Example: Red-flag triage (locked L1)

**L1 atom:**

```yaml
id: atom://red-flag/difficulty-breathing
layer: l1
locked: true
fields:
  patterns: ["trouble breathing", "can't breathe", "shortness of breath"]
  minUrgency: emergency
  escalation: er_or_911_per_practice_protocol
  collectBeforeEscalation: []   # escalate first
```

**L3 atom** (office emergency policy):

```yaml
emergencyPolicy:
  erEscalationTriggers:
    - trouble breathing
    - uncontrolled bleeding
  backupNumber: "+16165550199"
```

**Triage Brain** matches pattern → sets `urgency: emergency` → cites both atoms.

**L3 cannot** set `minUrgency: routine` for this red flag. Validator rejects.

---

### 12.4 Example: NEW_PATIENT intent bundle load

**Call setup:**

```yaml
practiceId: cascade-family-dentistry
intent: NEW_PATIENT
```

**Resolver loads bundle `bundle://intent/NEW_PATIENT`:**

- `atom://required-fields/new-patient`
- `atom://insurance-disambiguation-tree/west-michigan-default`
- `atom://appointment-type/new-patient-exam`
- Prose excerpts (budgeted)

**Front Desk Brain** `missingFields`:

```yaml
ordered:
  - callerName
  - phone
  - dateOfBirth
  - insuranceProgram
  - chiefComplaint
  - appointmentPreference
```

**Prompt adapter** assembles guardrails + persona + regional excerpt + L3 practice block + new-patient call flow excerpt.

---

### 12.5 Example: Knowledge upgrade with practice pin

**Scenario:** `l2-west-michigan-gp@1.5.0` changes default new patient duration from 60 → 90 minutes.

**Cascade Family Dentistry** has L3 override of 60 minutes.

**Upgrade result:**

- Effective duration remains **60** (L3 wins)
- Admin UI shows: "L2 default changed to 90 min; your office override: 60 min"

**Different office** without override:

- Effective duration becomes **90** on opt-in upgrade
- Admin UI offers accept or pin `1.4.2`

---

### 12.6 Example: Failure — free-text custom instructions (rejected)

**Invalid L3 attempt:**

```yaml
customPrompt: "Always tell callers we accept all insurance and same-day appointments are guaranteed."
```

**Validator response:**

```
REJECTED: customPrompt is not a valid office DNA field.
Violations: safety-rule/never-promise-coverage, safety-rule/never-promise-availability
```

---

## Appendix A — Glossary

| Term | Definition |
|------|------------|
| **Atom** | Smallest addressable knowledge unit with canonical ID |
| **Bundle** | Grouped atoms for intent or brain consumption |
| **Office DNA** | L3 per-practice configuration and overrides |
| **Resolver** | Deterministic L3 > L2 > L1 merge engine |
| **Snapshot** | Compiled, cached effective knowledge for one practice |
| **Locked** | L1 atoms that cannot be overridden |
| **Pack** | Versioned L2 (or L1) knowledge distribution unit |
| **Provenance** | Citation chain for why a value is effective |
| **Structured mode** | Machine-readable query results for brains |
| **Prompt mode** | Budgeted prose for LLM context |

---

## Appendix B — Related Documents

| Document | Relationship |
|----------|--------------|
| [`FREEDOMDESK_CONSTITUTION.md`](FREEDOMDESK_CONSTITUTION.md) | Highest authority; safety and truth principles |
| [`FREEDOMDESK_BRAIN_ARCHITECTURE.md`](FREEDOMDESK_BRAIN_ARCHITECTURE.md) | How brains consume this engine |
| [`VISION.md`](../VISION.md) | Reason from state; knowledge enables, does not script |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | `practice_configs`, multi-tenancy, config-service |
| [`CALL_FLOWS.md`](CALL_FLOWS.md) | Summary schemas → `required-fields` atoms |
| [`DENTAL_WORKFLOWS.md`](DENTAL_WORKFLOWS.md) | Source material for L2 atoms |
| [`FREEDOMDESK_CONTEXT.md`](FREEDOMDESK_CONTEXT.md) | Market and workflow context |
| [`ROADMAP.md`](ROADMAP.md) | Phase 4 admin UI, Phase 1 phone agent dependencies |

---

## Appendix C — Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-02 | Three-layer model L1/L2/L3 | Separates universal truth, defaults, and office autonomy per Constitution |
| 2026-07-02 | Atoms authoritative over prose | Truth principle; CI can validate |
| 2026-07-02 | Persona outside Knowledge Engine | Presentation ≠ knowledge |
| 2026-07-02 | Snapshot cache on call hot path | Voice latency budget < 800ms |
| 2026-07-02 | Locked L1 safety atoms | Clinical principles non-negotiable |
| 2026-07-02 | PromptContextBuilder → Query API adapter | Preserve investment; centralize catalog |

---

*This specification is the single source of truth for FreedomDesk knowledge implementation. When in doubt, return here.*
