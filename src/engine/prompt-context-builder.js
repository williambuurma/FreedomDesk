"use strict";

const path = require("path");

const { KnowledgeStore } = require("./knowledge-store");
const { assertValidPracticeConfig } = require("./validate-practice-config");
const { isKnownIntent } = require("./intents");

const DEFAULT_MANIFEST_PATH = "knowledge/manifest.json";
const DEFAULT_PERSONA_PATH = "voice/persona.json";
const DEFAULT_MAX_CHAR_BUDGET = 12000;

const SECTION_HEADERS = {
  guardrails: "## Global Guardrails",
  persona: "## Aly Persona and Conversation Style",
  regional: "## Michigan Regional Knowledge",
  practice: "## Practice Configuration",
  supplemental: "## Intent-Specific Knowledge",
  "call-flow": "## Call Flow",
};

function resolveRepoPath(repoRoot, relativePath) {
  return path.join(repoRoot, relativePath);
}

function formatPersona(persona) {
  const lines = [
    `Role: ${persona.role}`,
    `Tone: ${persona.tone.join(", ")}`,
    `Pacing: ${persona.pacing.style}; ${persona.pacing.response_length} responses`,
    "",
    "Phrases to use:",
    ...persona.phrases_to_use.map((phrase) => `- ${phrase}`),
    "",
    "Avoid:",
    ...persona.avoid.map((item) => `- ${item}`),
  ];

  if (persona.urgent_calls) {
    lines.push(
      "",
      "Urgent calls:",
      `- Approach: ${persona.urgent_calls.approach}`,
      `- Must include: ${persona.urgent_calls.must_include}`,
      `- Never: ${persona.urgent_calls.never}`
    );
  }

  return lines.join("\n");
}

function formatPracticeConfig(practiceConfig) {
  const lines = [
    `Practice: ${practiceConfig.name} (${practiceConfig.practiceId})`,
    `Timezone: ${practiceConfig.timezone}`,
    `Agent name: ${practiceConfig.agentName || "Aly"}`,
    `Booking mode: ${practiceConfig.bookingMode || "request"}`,
    "",
    "Greeting (business hours):",
    practiceConfig.greeting?.businessHours || "",
    "",
    "Address:",
    `${practiceConfig.address.street}, ${practiceConfig.address.city}, ${practiceConfig.address.state} ${practiceConfig.address.zip}`,
    practiceConfig.address.parkingNotes
      ? `Parking: ${practiceConfig.address.parkingNotes}`
      : "",
    "",
    "Hours:",
    ...Object.entries(practiceConfig.hoursOfOperation || {}).map(([day, hours]) => {
      if (!hours) return `- ${day}: closed`;
      return `- ${day}: ${hours.open}–${hours.close}`;
    }),
    "",
    "Providers:",
    ...(practiceConfig.providers || []).map(
      (provider) => `- ${provider.name} (${provider.role})`
    ),
    "",
    "Appointment types:",
    ...(practiceConfig.appointmentTypes || []).map(
      (type) =>
        `- ${type.label}: ${type.durationMinutes} min` +
        (type.openDentalType ? ` (Open Dental: ${type.openDentalType})` : "")
    ),
    "",
    "Accepted insurance carriers:",
    ...(practiceConfig.insurance?.acceptedCarriers || []).map(
      (carrier) => `- ${carrier}`
    ),
    "",
    "Accepted Medicaid programs:",
    ...(practiceConfig.insurance?.acceptedMedicaidPrograms || []).map(
      (program) => `- ${program}`
    ),
    "",
    "Emergency policy:",
    `- Same-day emergency: ${practiceConfig.emergencyPolicy?.sameDayEmergencyEnabled ? "enabled" : "disabled"}`,
    `- Callback SLA: ${practiceConfig.emergencyPolicy?.callbackSlaMinutes ?? "not configured"} minutes`,
    `- Backup number: ${practiceConfig.emergencyPolicy?.backupNumber || "not configured"}`,
  ];

  return lines.filter(Boolean).join("\n");
}

function uniqueDocumentIds(ids) {
  return [...new Set(ids)];
}

class PromptContextBudgetError extends Error {
  constructor({ characterCount, maxCharBudget, intent, practiceId }) {
    super(
      `Prompt context exceeds character budget: ${characterCount} characters ` +
        `(max ${maxCharBudget}) for intent ${intent}, practice ${practiceId}`
    );
    this.name = "PromptContextBudgetError";
    this.characterCount = characterCount;
    this.maxCharBudget = maxCharBudget;
    this.intent = intent;
    this.practiceId = practiceId;
  }
}

class PromptContextBuilder {
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || path.resolve(__dirname, "../..");
    this.knowledgeStore =
      options.knowledgeStore ||
      new KnowledgeStore({ repoRoot: this.repoRoot, readFile: options.readFile });
    this.manifestPath =
      options.manifestPath ||
      resolveRepoPath(this.repoRoot, DEFAULT_MANIFEST_PATH);
    this.personaPath =
      options.personaPath ||
      resolveRepoPath(this.repoRoot, DEFAULT_PERSONA_PATH);
    this.manifest = options.manifest || this.loadManifest();
    this.documentsById = new Map(
      this.manifest.documents.map((document) => [document.id, document])
    );
    this.enforceBudget = options.enforceBudget !== false;
  }

  loadManifest() {
    const relativePath = path.relative(this.repoRoot, this.manifestPath);
    return this.knowledgeStore.readJson(relativePath);
  }

  loadDocumentContent(documentId, options = {}) {
    const document = this.documentsById.get(documentId);
    if (!document) {
      throw new Error(`Unknown knowledge document: ${documentId}`);
    }

    const useExcerpt = options.useExcerpt !== false;
    const relativePath =
      useExcerpt && document.promptExcerptPath
        ? document.promptExcerptPath
        : document.path;

    return {
      id: document.id,
      title: document.title,
      path: relativePath,
      content: this.knowledgeStore.readUtf8(relativePath),
    };
  }

  loadPersona() {
    const relativePath = path.relative(this.repoRoot, this.personaPath);
    return this.knowledgeStore.readJson(relativePath);
  }

  resolveIntentBundle(intent) {
    const bundle = this.manifest.intentBundles?.[intent];
    if (!bundle) {
      return {
        callFlow: null,
        regional: [],
        supplemental: [],
      };
    }

    return {
      callFlow: bundle.callFlow || null,
      regional: bundle.regional || [],
      supplemental: bundle.supplemental || [],
    };
  }

  getDefaultDocumentsByRole() {
    const byRole = {
      guardrails: [],
      persona: [],
      regional: [],
      supplemental: [],
      "call-flow": [],
    };

    for (const document of this.manifest.documents) {
      if (!document.includeInDefaultPrompt) continue;
      if (!byRole[document.promptRole]) continue;
      byRole[document.promptRole].push(document.id);
    }

    return byRole;
  }

  getMaxCharBudget() {
    return (
      this.manifest.promptContextBudget?.maxCharacters ??
      DEFAULT_MAX_CHAR_BUDGET
    );
  }

  build({ intent, practiceConfig }) {
    if (!intent) {
      throw new Error("intent is required");
    }
    if (!practiceConfig) {
      throw new Error("practiceConfig is required");
    }

    assertValidPracticeConfig(practiceConfig);

    if (!isKnownIntent(intent)) {
      throw new Error(`Unknown intent: ${intent}`);
    }

    const bundle = this.resolveIntentBundle(intent);
    const defaults = this.getDefaultDocumentsByRole();

    const documentPlan = {
      guardrails: [...defaults.guardrails],
      persona: [...defaults.persona],
      regional: uniqueDocumentIds([
        ...defaults.regional,
        ...bundle.regional,
      ]),
      supplemental: uniqueDocumentIds(bundle.supplemental),
      "call-flow": bundle.callFlow ? [bundle.callFlow] : [],
    };

    const personaJson = this.loadPersona();
    const sections = [];

    for (const role of this.manifest.promptAssemblyOrder) {
      if (role === "practice") {
        sections.push({
          role,
          title: SECTION_HEADERS.practice,
          sourcePaths: ["runtime:practiceConfig"],
          content: formatPracticeConfig(practiceConfig),
        });
        continue;
      }

      if (role === "persona") {
        const loadedDocs = documentPlan.persona.map((id) =>
          this.loadDocumentContent(id)
        );
        const personaContent = [
          formatPersona(personaJson),
          "",
          ...loadedDocs.map((doc) => doc.content),
        ].join("\n");

        sections.push({
          role,
          title: SECTION_HEADERS.persona,
          sourcePaths: [
            this.manifest.persona.path,
            ...loadedDocs.map((doc) => doc.path),
          ],
          content: personaContent,
        });
        continue;
      }

      const ids = documentPlan[role] || [];
      if (ids.length === 0) continue;

      const loadedDocs = ids.map((id) => this.loadDocumentContent(id));
      sections.push({
        role,
        title: SECTION_HEADERS[role],
        sourcePaths: loadedDocs.map((doc) => doc.path),
        content: loadedDocs.map((doc) => doc.content).join("\n\n---\n\n"),
      });
    }

    const compiled = [
      "# FreedomDesk Prompt Context",
      "",
      `Intent: ${intent}`,
      `Practice: ${practiceConfig.name}`,
      `Generated by: PromptContextBuilder (deterministic assembly)`,
      "",
      ...sections.flatMap((section) => [
        section.title,
        "",
        section.content,
        "",
      ]),
    ].join("\n");

    const maxCharBudget = this.getMaxCharBudget();
    const characterCount = compiled.length;
    const withinBudget = characterCount <= maxCharBudget;

    if (this.enforceBudget && !withinBudget) {
      throw new PromptContextBudgetError({
        characterCount,
        maxCharBudget,
        intent,
        practiceId: practiceConfig.practiceId,
      });
    }

    return {
      intent,
      practiceId: practiceConfig.practiceId,
      sections,
      compiled,
      documentPlan,
      characterCount,
      maxCharBudget,
      withinBudget,
    };
  }
}

module.exports = {
  PromptContextBuilder,
  PromptContextBudgetError,
  DEFAULT_MAX_CHAR_BUDGET,
  formatPersona,
  formatPracticeConfig,
};
