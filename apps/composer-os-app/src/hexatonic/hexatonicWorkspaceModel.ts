/**
 * Hexatonic workspace view. Labels and previews only.
 * Generation stays in generateHexatonicPhrase.
 */

import {
  getHexatonicScalar,
  listHexatonicScalars,
  listHexatonicWpsPairs,
  outsideScalarId,
  rootSpelled,
  scalarTriadsAt,
  transposedScalarOrder,
  transposeHexatonicWpsPair,
  type HexatonicPhrase,
} from '@composer-os/core/hexatonic';
import { spellName } from '@composer-os/core/wwh/wps/wpsTonalityVaultRecord';

export const HEXATONIC_SCALAR_LABELS: Record<string, string> = {
  hex_western_claim_not_ritsu: 'Western six-note claim',
  hex_major_omit_seventh: 'Major, omit seventh',
  hex_major_omit_fourth: 'Major, omit fourth',
  hex_lydian_triad_pair: 'Lydian triad pair',
  hex_minor_primary: 'Minor primary',
  hex_whole_tone_even: 'Whole tone, even',
  hex_whole_tone_odd: 'Whole tone, odd',
  hex_augmented_t0: 'Augmented t0',
  hex_augmented_t1: 'Augmented t1',
  hex_augmented_t2: 'Augmented t2',
  hex_augmented_t3: 'Augmented t3',
};

export function hexatonicScalarLabel(id: string): string {
  return HEXATONIC_SCALAR_LABELS[id] ?? id;
}

export function hexatonicCentreName(centre: number): string {
  return spellName(rootSpelled(centre));
}

export interface HexatonicSelectionView {
  family: 'scalar' | 'wps-pair';
  name: string;
  id: string;
  pitches: string;
  triads: string;
  source: string;
  outside: string;
}

export function describeHexatonicSelection(args: {
  family: 'scalar' | 'wps-pair';
  scalarId: string;
  wpsId: string;
  centre: number;
}): HexatonicSelectionView {
  if (args.family === 'scalar') {
    const row = getHexatonicScalar(args.scalarId);
    if (!row) throw new Error(`unknown hexatonic scalar ${args.scalarId}`);
    const ordered = transposedScalarOrder(args.scalarId, args.centre);
    const triads = scalarTriadsAt(args.scalarId, rootSpelled(args.centre));
    return {
      family: 'scalar',
      name: hexatonicScalarLabel(args.scalarId),
      id: args.scalarId,
      pitches: ordered.spellings.join(' '),
      triads: triads
        ? triads.map((triad) => `${triad.role} ${triad.quality} ${triad.spelling.join(' ')}`).join(' · ')
        : 'No constituent triad reading on this collection.',
      source: row.source,
      outside: hexatonicScalarLabel(outsideScalarId(args.scalarId)),
    };
  }
  const pair = transposeHexatonicWpsPair(args.wpsId, rootSpelled(args.centre));
  return {
    family: 'wps-pair',
    name: `Vol ${pair.volume} ${pair.parentSymbol}`,
    id: pair.id,
    pitches: [...pair.resolution.spelling, ...pair.tension.spelling].join(' '),
    triads: `resolution ${pair.resolution.quality} ${pair.resolution.spelling.join(' ')} · tension ${pair.tension.quality} ${pair.tension.spelling.join(' ')}`,
    source: `${pair.provenance} · Harris ${pair.harrisLabel} · parent ${pair.parentSymbol}`,
    outside: 'Tension triad of the same pair. Parent root stays.',
  };
}

export function listHexatonicWorkspaceScalars() {
  return listHexatonicScalars().map((row) => ({ id: row.id, label: hexatonicScalarLabel(row.id) }));
}

export function listHexatonicWorkspacePairs() {
  return listHexatonicWpsPairs().map((pair) => ({
    id: pair.id,
    label: `Vol ${pair.volume} · ${pair.parentSymbol} · ${pair.id}`,
  }));
}

export interface HexatonicPhrasePreview {
  sequence: string;
  guitar: string[];
  bass: string[];
  transformations: string;
  provenance: string;
  diagnostics: string[];
}

export function describeHexatonicPhrase(phrase: HexatonicPhrase): HexatonicPhrasePreview {
  const line = (part: 'guitar' | 'bass') =>
    phrase.bars.map((bar) => {
      const attacks = bar.attacks.filter((attack) => attack.part === part);
      const text = attacks
        .map((attack) => (attack.pitches.length === 0 ? `rest ${attack.duration}` : `${attack.spellings.join('+')} ${attack.duration}`))
        .join(', ');
      const mark = bar.direction ? ` ${bar.direction}` : '';
      return `Bar ${bar.index} ${bar.role.toUpperCase()}${mark}: ${text}`;
    });
  return {
    sequence: phrase.bars.map((bar) => `${bar.index}:${bar.role}`).join(' '),
    guitar: line('guitar'),
    bass: line('bass'),
    transformations: phrase.bmef.transformations.filter(Boolean).join(', '),
    provenance: phrase.provenance,
    diagnostics: [
      `BMEF role: ${phrase.bmef.role}`,
      `artisticApproval: ${String(phrase.bmef.artisticApproval)}`,
      `humanPlayability: ${phrase.bmef.humanPlayability}`,
      `motif cell ${phrase.bmef.motifRecurrence.cellNotes}, return notes ${phrase.bmef.motifRecurrence.returnNotes}, shared pitch classes ${phrase.bmef.motifRecurrence.sharedPitchClasses}`,
      `density ${phrase.bmef.noteDensityPerBar}, rests ${phrase.bmef.restCount}, register span ${phrase.bmef.registerSpan}`,
      `membership inside ${phrase.bmef.collectionMembership.inside}, outside ${phrase.bmef.collectionMembership.outside}, return ${phrase.bmef.collectionMembership.return}`,
      `displacement ${phrase.bmef.harmonicDisplacement.distanceClass}, outside-only pcs ${phrase.bmef.harmonicDisplacement.outsideOnlyPitchClasses}`,
      `return ${phrase.bmef.returnEvidence.method}, home recovered ${phrase.bmef.returnEvidence.homeRecovered}`,
      `guitar max simultaneous ${phrase.bmef.guitar.maxSimultaneous}, fret span ${phrase.bmef.guitar.maxFretSpan}, six-note chords ${phrase.bmef.guitar.sixNoteChords}`,
      phrase.bmef.note,
    ],
  };
}
