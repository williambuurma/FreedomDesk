/**
 * Practice Improvement Engine — public facade.
 *
 * Every observation is evaluated through one objective:
 * "Can I improve this practice?"
 *
 * Operating, Supply, Owner, Phone, and Practice Brain domains all use
 * the same pipeline via DomainAssessmentModule — not separate logic.
 *
 * Quiet by default. Never duplicates the PMS.
 */

import type { OperationalEvent, PracticeId } from "../events/types.ts";
import { DEFAULT_DOMAIN_MODULES } from "./domains/registry.ts";
import {
  learningSignalFromOutcome,
  OutcomeRecorder,
  type RecordOutcomeInput,
} from "./outcomeRecorder.ts";
import { runImprovementPipeline } from "./pipeline.ts";
import {
  IMPROVEMENT_ENGINE_VERSION,
  PRACTICE_IMPROVEMENT_OBJECTIVE,
  type DomainAssessmentModule,
  type ImprovementResult,
  type LearningSignal,
  type Outcome,
  type PipelineContext,
} from "./types.ts";

export interface PracticeImprovementEngineOptions {
  modules?: DomainAssessmentModule[];
  outcomeRecorder?: OutcomeRecorder;
}

export class PracticeImprovementEngine {
  readonly version = IMPROVEMENT_ENGINE_VERSION;
  readonly objective = PRACTICE_IMPROVEMENT_OBJECTIVE;

  private readonly modules: DomainAssessmentModule[];
  private readonly outcomes: OutcomeRecorder;
  private readonly learnings: LearningSignal[] = [];

  constructor(options: PracticeImprovementEngineOptions = {}) {
    this.modules = options.modules || DEFAULT_DOMAIN_MODULES;
    this.outcomes = options.outcomeRecorder || new OutcomeRecorder();
  }

  /** Observe one operational event through the full improvement pipeline. */
  processEvent(
    event: OperationalEvent,
    ctx?: Partial<PipelineContext>
  ): ImprovementResult {
    return runImprovementPipeline(event, { modules: this.modules, ctx });
  }

  /**
   * Process a batch (e.g. overnight call cluster). Each event runs the same pipeline.
   */
  processBatch(
    events: OperationalEvent[],
    ctx?: Partial<PipelineContext>
  ): {
    results: ImprovementResult[];
    surfaced: ImprovementResult[];
    silenced: ImprovementResult[];
  } {
    const results = events.map((e) => this.processEvent(e, ctx));
    const surfaced = results.filter(
      (r) => r.disposition === "action" || r.disposition === "recommend"
    );
    const silenced = results.filter(
      (r) => r.disposition === "ignore" || r.disposition === "defer"
    );
    return { results, surfaced, silenced };
  }

  /**
   * Track Outcome → Learn.
   * Human accept/dismiss/implement feeds calibration — no autonomous DNA change.
   */
  recordOutcome(input: RecordOutcomeInput): {
    outcome: Outcome;
    learning: LearningSignal | null;
  } {
    const outcome = this.outcomes.record(input);
    const learning = learningSignalFromOutcome(outcome);
    if (learning) this.learnings.push(learning);
    return { outcome, learning };
  }

  listOutcomes(practiceId: PracticeId): Outcome[] {
    return this.outcomes.list(practiceId);
  }

  listLearnings(practiceId: PracticeId): LearningSignal[] {
    return this.learnings.filter((l) => l.practiceId === practiceId);
  }

  /** Registered domain ids — proves modular shared-pipeline design. */
  registeredDomains(): string[] {
    return this.modules.map((m) => m.domain);
  }
}

const engines = new Map<string, PracticeImprovementEngine>();

/** Tenant-scoped singleton — one engine per practiceId. */
export function getPracticeImprovementEngine(
  practiceId: PracticeId,
  options?: PracticeImprovementEngineOptions
): PracticeImprovementEngine {
  const existing = engines.get(practiceId);
  if (existing && !options) return existing;
  const engine = new PracticeImprovementEngine(options);
  engines.set(practiceId, engine);
  return engine;
}

export function resetPracticeImprovementEngineRegistry(): void {
  engines.clear();
}
