/**
 * Deterministic fingerprint of frozen Dev 1/2 inputs.
 * Dev 3 reads these values. It does not change them.
 */
import { createHash } from 'node:crypto';
import { DEFAULT_PENTATONIC_SCORING, PENTATONIC_CONFIGURATION_ID, PENTATONIC_EVALUATOR_VERSION } from './evaluate';
import { WWH_DUO_EVIDENCE_WEIGHTS, WWH_DUO_PROFILE_ID } from './evidenceProfiles';
import { HOME_RELATIONSHIPS } from './homeRelationships';
import { DEFAULT_PENTATONIC_PATH_CONFIG, PENTATONIC_PATH_CONFIG_VERSION, PENTATONIC_PATH_ENGINE_VERSION, PENTATONIC_PATH_NONE } from './pathConfig';
import { COLOUR_HOME_RELATIONSHIP_SCORES, PENTATONIC_RELATIONSHIP_SCORING_VERSION, PURPOSE_HOME_RELATIONSHIP_SCORES } from './relationshipScoring';

export function pentatonicFrozenConfigFingerprint(): string {
  const payload = {
    evaluatorVersion: PENTATONIC_EVALUATOR_VERSION,
    configurationId: PENTATONIC_CONFIGURATION_ID,
    scoring: DEFAULT_PENTATONIC_SCORING,
    wwhProfileId: WWH_DUO_PROFILE_ID,
    wwhWeights: WWH_DUO_EVIDENCE_WEIGHTS,
    pathEngine: PENTATONIC_PATH_ENGINE_VERSION,
    pathConfigVersion: PENTATONIC_PATH_CONFIG_VERSION,
    pathNone: PENTATONIC_PATH_NONE,
    pathConfig: DEFAULT_PENTATONIC_PATH_CONFIG,
    homeRelationships: HOME_RELATIONSHIPS,
    relationshipScoringVersion: PENTATONIC_RELATIONSHIP_SCORING_VERSION,
    colourScores: COLOUR_HOME_RELATIONSHIP_SCORES,
    purposeScores: PURPOSE_HOME_RELATIONSHIP_SCORES,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
