/**
 * Maps each module category to handoff contract identifiers (declarative).
 */

import type { HandoffModuleCategory } from './handoffTypes';

export interface HandoffMapEntry {
  category: HandoffModuleCategory;
  /** Contract type name for docs / tooling. */
  contractName: string;
  /** Narrative: typical upstream conductor roles. */
  consumesFromRoles: readonly string[];
  /** Narrative: typical downstream conductor roles. */
  producesToRoles: readonly string[];
  /** Optional: declarative orchestration planning stage (Prompt 4/7). */
  orchestrationPlanningStage?: 'orchestration_planning';
}

export const HANDOFF_MAP: readonly HandoffMapEntry[] = [
  {
    category: 'melody',
    contractName: 'MelodyHandoffContract',
    consumesFromRoles: ['form', 'feel_rhythm'],
    producesToRoles: ['score_model', 'validation'],
  },
  {
    category: 'harmony',
    contractName: 'HarmonyHandoffContract',
    consumesFromRoles: ['form'],
    producesToRoles: ['score_model', 'validation'],
  },
  {
    category: 'rhythm',
    contractName: 'RhythmHandoffContract',
    consumesFromRoles: ['feel_rhythm', 'form'],
    producesToRoles: ['score_model'],
  },
  {
    category: 'counterpoint',
    contractName: 'CounterpointHandoffContract',
    consumesFromRoles: ['harmony', 'melody'],
    producesToRoles: ['score_model'],
  },
  {
    category: 'orchestration',
    contractName: 'OrchestrationHandoffContract',
    consumesFromRoles: ['register', 'density'],
    producesToRoles: ['score_model'],
    orchestrationPlanningStage: 'orchestration_planning',
  },
  {
    category: 'songwriting',
    contractName: 'SongwritingHandoffContract',
    consumesFromRoles: ['form', 'motif'],
    producesToRoles: ['score_model', 'validation'],
  },
  {
    category: 'bridge/export',
    contractName: 'BridgeExportHandoffContract',
    consumesFromRoles: ['validation'],
    producesToRoles: ['export'],
  },
];

export const HANDOFF_CATEGORIES: readonly HandoffModuleCategory[] = HANDOFF_MAP.map((e) => e.category);

export function handoffEntryForCategory(category: HandoffModuleCategory): HandoffMapEntry | undefined {
  return HANDOFF_MAP.find((e) => e.category === category);
}
