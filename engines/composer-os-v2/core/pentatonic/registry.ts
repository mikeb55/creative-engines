/**
 * Pentatonic registry v1.
 * Major and minor pentatonic only. Further archetypes stay out until interval
 * definitions are verified inside Composer OS. Relationship labels are not archetypes.
 */

export const PENTATONIC_REGISTRY_VERSION = 'pentatonic-registry-1.0';

export interface PentatonicArchetype {
  id: string;
  displayName: string;
  /** Semitone offsets from the reference pitch. Reference is scale degree 1. */
  intervals: readonly number[];
  /** Letter steps from the reference letter, used only for display spelling. */
  letterSteps: readonly number[];
  family: string;
  aliases: readonly string[];
  explorationDepth: 'core';
  provenance: string;
  verificationStatus: 'verified';
}

export const PENTATONIC_ARCHETYPES: readonly PentatonicArchetype[] = [
  {
    id: 'major_pentatonic',
    displayName: 'Major Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    letterSteps: [0, 1, 2, 4, 5],
    family: 'diatonic_pentatonic',
    aliases: ['major pentatonic', 'pentatonic major'],
    explorationDepth: 'core',
    provenance:
      'Standard major pentatonic, scale degrees 1 2 3 5 6. The same absolute set appears when a minor-pentatonic HOME collection is transposed by −3 (MAJOR relationship), which is the color-wheel result checked against the read-only Pentatonic Options reference.',
    verificationStatus: 'verified',
  },
  {
    id: 'minor_pentatonic',
    displayName: 'Minor Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    letterSteps: [0, 2, 3, 4, 6],
    family: 'diatonic_pentatonic',
    aliases: ['minor pentatonic', 'pentatonic minor'],
    explorationDepth: 'core',
    provenance:
      'Standard minor pentatonic, scale degrees 1 b3 4 5 b7. Matches the HOME position of the minor-pentatonic color wheel in the read-only Pentatonic Options reference (1, b3, 4, 5, b7). Composer OS does not import that project.',
    verificationStatus: 'verified',
  },
];

const BY_ID = new Map(PENTATONIC_ARCHETYPES.map((archetype) => [archetype.id, archetype]));

export function getPentatonicArchetype(id: string): PentatonicArchetype | undefined {
  return BY_ID.get(id);
}

export function listPentatonicArchetypes(): readonly PentatonicArchetype[] {
  return PENTATONIC_ARCHETYPES;
}
