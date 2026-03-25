/**
 * Maps Composer OS pipeline stages (as implemented today) to conductor roles.
 * Architecture documentation only — not a runtime router.
 */

import type { ConductorRole } from './conductorRoleTypes';

/** One implemented stage in the current monolith pipeline. */
export interface ComposerOsStage {
  /** Stable id for tests and docs. */
  id: string;
  /** Primary conductor role(s) this stage owns. */
  roles: ConductorRole[];
  /** Where it lives in code (illustrative). */
  implementationHint: string;
  /** Optional: notes shared orchestration planning alignment (Prompt 4/7); not a router. */
  orchestrationPlanningNote?: string;
}

/**
 * Canonical ordering of stages as they appear in golden path / conductor flow.
 * Covers form, feel, density, register, motif, style, interaction, behaviour, score, validation, export.
 */
export const COMPOSER_OS_STAGE_TO_CONDUCTOR_ROLES: readonly ComposerOsStage[] = [
  {
    id: 'form',
    roles: ['form'],
    implementationHint: 'compositionContext.form, phrase, section roles',
  },
  {
    id: 'feel_rhythm',
    roles: ['feel_rhythm'],
    implementationHint: 'rhythmEngine.computeRhythmicConstraints, feel in context',
  },
  {
    id: 'density',
    roles: ['density'],
    implementationHint: 'densityCurvePlanner, density on context',
    orchestrationPlanningNote: 'densityOwnershipPlanner consumes density curves',
  },
  {
    id: 'register',
    roles: ['register'],
    implementationHint: 'registerMapPlanner (guitar/bass maps)',
    orchestrationPlanningNote: 'registerOwnershipPlanner consumes register intent',
  },
  {
    id: 'motif',
    roles: ['motif'],
    implementationHint: 'motifGenerator, motifTracker, motifValidation',
  },
  {
    id: 'style',
    roles: ['style'],
    implementationHint: 'styleModules, styleModuleRegistry, applyStyleStack',
  },
  {
    id: 'interaction',
    roles: ['interaction'],
    implementationHint: 'interactionPlanner, interactionValidation',
  },
  {
    id: 'instrument_behaviour',
    roles: ['instrument_behaviour'],
    implementationHint: 'guitarBehaviour, bassBehaviour planners',
  },
  {
    id: 'score_model',
    roles: ['score_model'],
    implementationHint: 'generateGoldenPathDuoScore, scoreEventBuilder, score model',
  },
  {
    id: 'validation',
    roles: ['validation'],
    implementationHint: 'scoreIntegrityGate, behaviourGates, strictBarMath',
  },
  {
    id: 'export',
    roles: ['export'],
    implementationHint: 'musicxmlExporter, musicxmlValidation, exportHardening',
  },
];

export function allConductorRolesFromStageMap(): ConductorRole[] {
  const set = new Set<ConductorRole>();
  for (const s of COMPOSER_OS_STAGE_TO_CONDUCTOR_ROLES) {
    for (const r of s.roles) set.add(r);
  }
  return [...set];
}
