/**
 * Domain module registry — all intelligence domains share one pipeline.
 */

import type { OperationalEvent } from "../../events/types.ts";
import type { DomainAssessmentModule, IntelligenceDomain } from "../types.ts";
import { operatingDomain } from "./operating.ts";
import { ownerDomain } from "./owner.ts";
import { phoneDomain } from "./phone.ts";
import { practiceBrainDomain } from "./practiceBrain.ts";
import { supplyDomain } from "./supply.ts";

/** Default modules — all share one pipeline; selection is by accepts(). */
export const DEFAULT_DOMAIN_MODULES: DomainAssessmentModule[] = [
  phoneDomain,
  operatingDomain,
  supplyDomain,
  ownerDomain,
  practiceBrainDomain,
];

/** All modules that accept this event (may be more than one). */
export function selectDomainModules(
  event: OperationalEvent,
  modules: DomainAssessmentModule[] = DEFAULT_DOMAIN_MODULES
): DomainAssessmentModule[] {
  return modules.filter((m) => m.accepts(event));
}

/**
 * Primary module for an event — first accepting module in registry order.
 * Prefer selectDomainModules when multiple domains may apply.
 */
export function selectDomainModule(
  event: OperationalEvent,
  modules: DomainAssessmentModule[] = DEFAULT_DOMAIN_MODULES
): DomainAssessmentModule | null {
  return selectDomainModules(event, modules)[0] ?? null;
}

export function modulesByDomain(
  modules: DomainAssessmentModule[] = DEFAULT_DOMAIN_MODULES
): Record<IntelligenceDomain, DomainAssessmentModule | undefined> {
  const map = {} as Record<IntelligenceDomain, DomainAssessmentModule | undefined>;
  for (const m of modules) {
    map[m.domain] = m;
  }
  return map;
}

export {
  phoneDomain,
  operatingDomain,
  supplyDomain,
  ownerDomain,
  practiceBrainDomain,
};
