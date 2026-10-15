/**
 * Deterministic hexatonic fixtures.
 * These are not generated compositions and they are not artistically approved.
 */

import { getHexatonicScalar, scalarTriadsAt } from './collections';
import { measureHexatonicDistance, melodicFragment, returnHomePath, type HexatonicDistance, type ReturnHomePath } from './relations';
import { getHexatonicWpsPair, type HexatonicWpsPair } from './triadPairs';

export const HEXATONIC_EVIDENCE_STATUS = 'fixture' as const;
export const HEXATONIC_ARTISTIC_APPROVAL = false as const;

export interface FamilyRelationshipEvidence {
  status: typeof HEXATONIC_EVIDENCE_STATUS;
  artisticApproval: typeof HEXATONIC_ARTISTIC_APPROVAL;
  majorToMinor: HexatonicDistance;
  wholeToneComplement: HexatonicDistance;
  augmentedNeighbor: HexatonicDistance;
}

export interface FragmentEvidence {
  status: typeof HEXATONIC_EVIDENCE_STATUS;
  artisticApproval: typeof HEXATONIC_ARTISTIC_APPROVAL;
  two: readonly number[];
  three: readonly number[];
  four: readonly number[];
  collectionId: string;
}

export function majorMinorWholeToneAugmentedEvidence(): FamilyRelationshipEvidence {
  const major = getHexatonicScalar('hex_major_omit_seventh');
  const minor = getHexatonicScalar('hex_minor_primary');
  const even = getHexatonicScalar('hex_whole_tone_even');
  const odd = getHexatonicScalar('hex_whole_tone_odd');
  const augmented = getHexatonicScalar('hex_augmented_t0');
  const neighbor = getHexatonicScalar('hex_augmented_t1');
  if (!major || !minor || !even || !odd || !augmented || !neighbor) throw new Error('missing scalar evidence collections');
  return {
    status: HEXATONIC_EVIDENCE_STATUS,
    artisticApproval: HEXATONIC_ARTISTIC_APPROVAL,
    majorToMinor: measureHexatonicDistance(major.pitchClasses, minor.pitchClasses),
    wholeToneComplement: measureHexatonicDistance(even.pitchClasses, odd.pitchClasses),
    augmentedNeighbor: measureHexatonicDistance(augmented.pitchClasses, neighbor.pitchClasses),
  };
}

export function omitSeventhFragments(): FragmentEvidence {
  const home = getHexatonicScalar('hex_major_omit_seventh');
  if (!home) throw new Error('missing major hexatonic');
  return {
    status: HEXATONIC_EVIDENCE_STATUS,
    artisticApproval: HEXATONIC_ARTISTIC_APPROVAL,
    two: melodicFragment(home.pitchClasses, 2),
    three: melodicFragment(home.pitchClasses, 3),
    four: melodicFragment(home.pitchClasses, 4),
    collectionId: home.id,
  };
}

export function westernReturnPath(): ReturnHomePath & {
  status: typeof HEXATONIC_EVIDENCE_STATUS;
  artisticApproval: typeof HEXATONIC_ARTISTIC_APPROVAL;
} {
  const home = getHexatonicScalar('hex_major_omit_seventh');
  const outside = getHexatonicScalar('hex_western_claim_not_ritsu');
  if (!home || !outside) throw new Error('missing return-path collections');
  return {
    ...returnHomePath(home.id, home.pitchClasses, outside.id, outside.pitchClasses),
    status: HEXATONIC_EVIDENCE_STATUS,
    artisticApproval: HEXATONIC_ARTISTIC_APPROVAL,
  };
}

export function wpsReturnPair(id = 'maj9'): {
  pair: HexatonicWpsPair;
  path: ReturnHomePath;
  status: typeof HEXATONIC_EVIDENCE_STATUS;
  artisticApproval: typeof HEXATONIC_ARTISTIC_APPROVAL;
  parentStays: string;
  tensionIsModulation: false;
} {
  const pair = getHexatonicWpsPair(id);
  if (!pair) throw new Error(`missing WPS pair ${id}`);
  return {
    pair,
    path: returnHomePath(
      `${pair.id}:resolution`,
      pair.resolution.pitchClasses,
      `${pair.id}:tension`,
      pair.tension.pitchClasses
    ),
    status: HEXATONIC_EVIDENCE_STATUS,
    artisticApproval: HEXATONIC_ARTISTIC_APPROVAL,
    parentStays: pair.parentSymbol,
    tensionIsModulation: false,
  };
}

export function lydianExchangeSpellings(): { lower: readonly string[]; upper: readonly string[] } {
  const reading = scalarTriadsAt('hex_lydian_triad_pair');
  if (!reading) throw new Error('lydian triad reading missing');
  return { lower: reading[0]!.spelling, upper: reading[1]!.spelling };
}
