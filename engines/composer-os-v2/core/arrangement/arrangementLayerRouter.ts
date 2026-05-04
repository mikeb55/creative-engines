import { buildBeatContextLegalityMap } from '../harmony/beatContextLegalityMap';
import { TONALITY_VAULT_DATABASE } from '../harmony/tonalityVaultDatabase';
import type { NoteLayer, NoteTag, NoteTonalRole } from '../harmony/noteTag';

const CHORD_TYPES = new Set(TONALITY_VAULT_DATABASE.map((r) => r.chordType));

export type InstrumentFamily =
  | 'bass'
  | 'inner-strings'
  | 'upper-strings'
  | 'saxophone'
  | 'trombone'
  | 'trumpet'
  | 'guitar'
  | 'piano';

export type ArrangementLayer = {
  instrumentFamily: InstrumentFamily;
  /** Primary vault layer for voicing / register rules (see playbook role split). */
  assignedTensionLayer: NoteLayer;
  allowedRoles: NoteTonalRole[];
  description: string;
};

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function collectRolesForLayers(
  legality: Map<number, NoteTag>,
  layers: readonly NoteLayer[]
): NoteTonalRole[] {
  const want = new Set(layers);
  const roles = new Set<NoteTonalRole>();
  for (const tag of legality.values()) {
    if (want.has(tag.layer)) roles.add(tag.tonalRole);
  }
  return [...roles];
}

function buildLayer(
  chordTypeId: string,
  rootPc: number,
  instrumentFamily: InstrumentFamily,
  assignedTensionLayer: NoteLayer,
  layerPool: readonly NoteLayer[],
  description: string
): ArrangementLayer {
  const legality = buildBeatContextLegalityMap(chordTypeId, normalizePc(rootPc));
  return {
    instrumentFamily,
    assignedTensionLayer,
    allowedRoles: collectRolesForLayers(legality, layerPool),
    description,
  };
}

/**
 * String quartet: cello shell / viola quadratonic anchor / V2 triad fragments / V1 tension melody.
 */
export function routeStringQuartet(chordTypeId: string, rootPc: number): ArrangementLayer[] {
  if (!CHORD_TYPES.has(chordTypeId)) return [];
  const r = normalizePc(rootPc);

  return [
    buildLayer(
      chordTypeId,
      r,
      'bass',
      0,
      [0],
      'Cello: layer 0 — shell / root motion, bass register foundation.'
    ),
    buildLayer(
      chordTypeId,
      r,
      'inner-strings',
      1,
      [1],
      'Viola: layer 1 — guide-tone / primary quadratonic anchor.'
    ),
    buildLayer(
      chordTypeId,
      r,
      'upper-strings',
      0,
      [0, 1],
      'Violin 2: layers 0–1 — melodic triad lines or dyad fragments.'
    ),
    buildLayer(
      chordTypeId,
      r,
      'upper-strings',
      2,
      [2],
      'Violin 1: layer 2 — tension-layer melody or liquid-harmony suspensions.'
    ),
  ];
}

/**
 * Big band: bass shell / trombone liquid inner / sax triad-pair & quadratonic / trumpet tension punctures / guitar & piano quadratonic comp.
 */
export function routeBigBand(chordTypeId: string, rootPc: number): ArrangementLayer[] {
  if (!CHORD_TYPES.has(chordTypeId)) return [];
  const r = normalizePc(rootPc);

  return [
    buildLayer(chordTypeId, r, 'bass', 0, [0], 'Bass: layer 0 — shell / roots.'),
    buildLayer(
      chordTypeId,
      r,
      'trombone',
      0,
      [0, 1],
      'Trombone: layers 0–1 — shell plus inner liquid movement.'
    ),
    buildLayer(
      chordTypeId,
      r,
      'saxophone',
      1,
      [1, 2],
      'Saxophone: layers 1–2 — triad-pair runs and quadratonic counterlines.'
    ),
    buildLayer(
      chordTypeId,
      r,
      'trumpet',
      2,
      [2],
      'Trumpet: layer 2 — tension-quadratonic punctures on strong beats.'
    ),
    buildLayer(
      chordTypeId,
      r,
      'guitar',
      1,
      [1],
      'Guitar: layer 1 — three-note quadratonic voicings and comp cells.'
    ),
    buildLayer(
      chordTypeId,
      r,
      'piano',
      1,
      [1],
      'Piano: layer 1 — three-note quadratonic voicings.'
    ),
  ];
}
