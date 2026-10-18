/**
 * Nine original E2 demonstrations. Pitches are sounding. Durations are quarters.
 * Hand-authored expectations live in the tests, not here.
 */

import { dyadPair, dyadParent, polychord, triadPair, triadParent } from './harmonicColour';
import type { HarmonicRegion, SpelledRegister } from './harmonicColourTypes';
import { midiOfPitch } from '../performance-composer/pcChord';
import { q } from '../piano/pianoExactTiming';
import type { E2PerformRequest } from './e2Perform';
import { span } from './e2Perform';
import type { ScheduledSlot } from './harmonicRealisation';
import type { GuitarGripWitness } from '../ecm/e2EcmDuoAdapter';
import type { DoubleStopWitness } from '../string-quartet/e2QuartetAdapter';

function pitch(token: string): SpelledRegister {
  const match = /^([A-G])([b#]*)(-?\d+)$/.exec(token);
  if (!match) throw new Error(token);
  const alter = match[2] === '' ? 0 : match[2]!.startsWith('b') ? -match[2]!.length : match[2]!.length;
  const octave = Number(match[3]);
  return { step: match[1]!, alter, octave, midi: midiOfPitch(match[1]!, alter, octave) };
}

function region(id: string, intent: HarmonicRegion['intent']): HarmonicRegion {
  return { span: span(), intent };
}

function slot(partial: ScheduledSlot): ScheduledSlot {
  return partial;
}

const lowerC = () => triadParent('lower-C', 'major', ['C', 'E', 'G'], ['C3', 'E3', 'G3'], [48, 59]);
const upperD = () => triadParent('upper-D', 'major', ['D', 'F#', 'A'], ['D5', 'F#5', 'A5'], [72, 84]);
const cHigh = () => triadParent('Cmaj', 'major', ['C', 'E', 'G'], ['C5', 'E5', 'G5']);
const dLow = () => triadParent('Dmaj', 'major', ['D', 'F#', 'A'], ['D4', 'F#4', 'A4']);
const cEcm = () => triadParent('Cmaj', 'major', ['C', 'E', 'G'], ['C4', 'E3', 'G3']);
const aEcm = () => triadParent('Amin', 'minor', ['A', 'C', 'E'], ['A2', 'C4', 'E3']);

function base(partial: Omit<E2PerformRequest, 'tempo' | 'bars' | 'seed'> & { seed?: number }): E2PerformRequest {
  return { tempo: 96, bars: 4, seed: partial.seed ?? 3401, ...partial };
}

export function polychordBigBand(): E2PerformRequest {
  const intent = polychord('CD', upperD(), lowerC());
  const anchor = [
    slot({ regionId: 'CD', slotId: 'low-root', logicalVoiceId: 'tbn3', onset: q(0), duration: q(2), parent: 'lower', memberIds: ['root'] }),
    slot({ regionId: 'CD', slotId: 'low-third', logicalVoiceId: 'tbn2', onset: q(0), duration: q(2), parent: 'lower', memberIds: ['third'] }),
    slot({ regionId: 'CD', slotId: 'low-fifth', logicalVoiceId: 'tbn1', onset: q(0), duration: q(2), parent: 'lower', memberIds: ['fifth'] }),
    slot({ regionId: 'CD', slotId: 'up-root', logicalVoiceId: 'tp3', onset: q(0), duration: q(2), parent: 'upper', memberIds: ['root'] }),
    slot({ regionId: 'CD', slotId: 'up-third', logicalVoiceId: 'tp2', onset: q(0), duration: q(2), parent: 'upper', memberIds: ['third'] }),
    slot({ regionId: 'CD', slotId: 'up-fifth', logicalVoiceId: 'tp1', onset: q(0), duration: q(2), parent: 'upper', memberIds: ['fifth'] }),
    slot({ regionId: 'CD', slotId: 'sax-back', logicalVoiceId: 'as1', onset: q(4), duration: q(1, 2), parent: 'upper', arpeggio: true }),
    slot({ regionId: 'CD', slotId: 'return', logicalVoiceId: 'tbn3', onset: q(8), duration: q(2), parent: 'lower', memberIds: ['root'] }),
    slot({ regionId: 'CD', slotId: 'return-e', logicalVoiceId: 'tbn2', onset: q(8), duration: q(2), parent: 'lower', memberIds: ['third'] }),
    slot({ regionId: 'CD', slotId: 'return-g', logicalVoiceId: 'tbn1', onset: q(8), duration: q(2), parent: 'lower', memberIds: ['fifth'] }),
    slot({ regionId: 'CD', slotId: 'return-d', logicalVoiceId: 'tp3', onset: q(8), duration: q(2), parent: 'upper', memberIds: ['root'] }),
    slot({ regionId: 'CD', slotId: 'return-fs', logicalVoiceId: 'tp2', onset: q(8), duration: q(2), parent: 'upper', memberIds: ['third'] }),
    slot({ regionId: 'CD', slotId: 'return-a', logicalVoiceId: 'tp1', onset: q(8), duration: q(2), parent: 'upper', memberIds: ['fifth'] }),
    slot({ regionId: 'CD', slotId: 'piano-gap', logicalVoiceId: 'pn', onset: q(12), duration: q(1), parent: 'upper', memberIds: ['root'] }),
    slot({ regionId: 'CD', slotId: 'bass-release', logicalVoiceId: 'bass', onset: q(14), duration: q(2), parent: 'lower', memberIds: ['root'] }),
  ];
  return base({
    ensemble: 'big-band',
    title: 'E2 Polychord Big Band',
    regions: [region('CD', intent)],
    schedule: anchor,
    fullAnchors: [{ regionId: 'CD', onset: q(0), duration: q(2) }],
    words: { tp1: { 1: 'D major + C major' } },
    sourceNotes: [{ partId: 'pn', pitch: pitch('C4'), onset: q(13), duration: q(1), sourceId: 'locked-piano-c4' }],
  });
}

export function polychordQuartet(): E2PerformRequest {
  const lower = triadParent('Cmaj', 'major', ['C', 'E', 'G'], ['C4', 'E5', 'G2']);
  const upper = triadParent('Dmaj', 'major', ['D', 'F#', 'A'], ['D3', 'F#5', 'A4']);
  const intent = polychord('CD', upper, lower);
  const doubles: DoubleStopWitness[] = [
    { partId: 'vc', midis: [43, 50], openAdjacent: true },
    { partId: 'vn2', midis: [69, 76], openAdjacent: true },
  ];
  return base({
    ensemble: 'string-quartet',
    title: 'E2 Polychord String Quartet',
    regions: [region('CD', intent)],
    schedule: [
      slot({ regionId: 'CD', slotId: 'vc-g', logicalVoiceId: 'vc', onset: q(0), duration: q(2), parent: 'lower', memberIds: ['fifth'] }),
      slot({ regionId: 'CD', slotId: 'vc-d', logicalVoiceId: 'vc', onset: q(0), duration: q(2), parent: 'upper', memberIds: ['root'] }),
      slot({ regionId: 'CD', slotId: 'va-c', logicalVoiceId: 'va', onset: q(0), duration: q(2), parent: 'lower', memberIds: ['root'] }),
      slot({ regionId: 'CD', slotId: 'vn2-a', logicalVoiceId: 'vn2', onset: q(0), duration: q(2), parent: 'upper', memberIds: ['fifth'] }),
      slot({ regionId: 'CD', slotId: 'vn2-e', logicalVoiceId: 'vn2', onset: q(0), duration: q(2), parent: 'lower', memberIds: ['third'] }),
      slot({ regionId: 'CD', slotId: 'vn1-fs', logicalVoiceId: 'vn1', onset: q(0), duration: q(2), parent: 'upper', memberIds: ['third'] }),
      slot({ regionId: 'CD', slotId: 'vn1-return', logicalVoiceId: 'vn1', onset: q(8), duration: q(2), parent: 'upper', memberIds: ['third'] }),
      slot({ regionId: 'CD', slotId: 'space', logicalVoiceId: 'va', onset: q(4), duration: q(2), parent: 'lower', rest: true, restReason: 'phrase-space' }),
    ],
    fullAnchors: [{ regionId: 'CD', onset: q(0), duration: q(2) }],
    doubleStops: doubles,
    words: { vn1: { 1: 'D major + C major' } },
  });
}

export function polychordEcm(): E2PerformRequest {
  const intent = polychord('CA', aEcm(), cEcm());
  const witness: GuitarGripWitness = {
    id: 'xx201x',
    slotIds: ['anchor'],
    assignments: [
      { stringNumber: 4, fret: 2, midi: 52 },
      { stringNumber: 3, fret: 0, midi: 55 },
      { stringNumber: 2, fret: 1, midi: 60 },
    ],
  };
  return base({
    ensemble: 'ecm-duo',
    title: 'E2 Polychord ECM Duo',
    regions: [region('CA', intent)],
    schedule: [
      slot({ regionId: 'CA', slotId: 'anchor', logicalVoiceId: 'chord', onset: q(0), duration: q(2), parent: 'both' }),
      slot({ regionId: 'CA', slotId: 'guitar-line', logicalVoiceId: 'guitar', onset: q(4), duration: q(1), parent: 'upper', memberIds: ['fifth'] }),
      slot({ regionId: 'CA', slotId: 'guitar-rest', logicalVoiceId: 'guitar', onset: q(8), duration: q(2), parent: 'upper', rest: true, restReason: 'dialogue' }),
    ],
    fullAnchors: [{ regionId: 'CA', onset: q(0), duration: q(2) }],
    witnesses: [witness, { id: 'e3', slotIds: ['guitar-line'], assignments: [{ stringNumber: 4, fret: 2, midi: 52 }] }],
    partFor: (_id, voice, midi) => (voice === 'guitar' ? 'guitar' : midi === 45 ? 'bass' : 'guitar'),
    words: { guitar: { 1: 'C major + A minor' } },
  });
}

export function triadBigBand(): E2PerformRequest {
  const intent = triadPair('CD', cHigh(), dLow(), 'alternate');
  const swapped = triadPair('swap', triadParent('Clow', 'major', ['C', 'E', 'G'], ['C4', 'E4', 'G4']), triadParent('Dhigh', 'major', ['D', 'F#', 'A'], ['D5', 'F#5', 'A5']), 'alternate');
  return base({
    ensemble: 'big-band',
    title: 'E2 Triad Pair Big Band',
    regions: [region('CD', intent), region('swap', swapped)],
    schedule: [
      slot({ regionId: 'CD', slotId: 'alto-state', logicalVoiceId: 'as1', onset: q(0), duration: q(1, 2), parent: 'a', arpeggio: true }),
      slot({ regionId: 'CD', slotId: 'tenor-answer', logicalVoiceId: 'ts1', onset: q(2), duration: q(1, 2), parent: 'b', arpeggio: true }),
      slot({ regionId: 'swap', slotId: 'tenor-swap', logicalVoiceId: 'ts1', onset: q(4), duration: q(1, 2), parent: 'a', arpeggio: true }),
      slot({ regionId: 'swap', slotId: 'alto-swap', logicalVoiceId: 'as1', onset: q(6), duration: q(1, 2), parent: 'b', arpeggio: true }),
      slot({ regionId: 'CD', slotId: 'alto-state:return', logicalVoiceId: 'as1', onset: q(8), duration: q(1, 2), parent: 'a', arpeggio: true }),
    ],
    words: { as1: { 1: 'C major then D major' } },
  });
}

export function triadQuartet(): E2PerformRequest {
  const intent = triadPair('CD', cHigh(), dLow(), 'interlock');
  return base({
    ensemble: 'string-quartet',
    title: 'E2 Triad Pair String Quartet',
    regions: [region('CD', intent)],
    schedule: [
      slot({ regionId: 'CD', slotId: 'vn1-c', logicalVoiceId: 'vn1', onset: q(0), duration: q(1, 2), parent: 'a', memberIds: ['root'] }),
      slot({ regionId: 'CD', slotId: 'vn1-e', logicalVoiceId: 'vn1', onset: q(1), duration: q(1, 2), parent: 'a', memberIds: ['third'] }),
      slot({ regionId: 'CD', slotId: 'vn1-g', logicalVoiceId: 'vn1', onset: q(2), duration: q(1, 2), parent: 'a', memberIds: ['fifth'] }),
      slot({ regionId: 'CD', slotId: 'va-d', logicalVoiceId: 'va', onset: q(1, 2), duration: q(1, 2), parent: 'b', memberIds: ['root'] }),
      slot({ regionId: 'CD', slotId: 'va-fs', logicalVoiceId: 'va', onset: q(3, 2), duration: q(1, 2), parent: 'b', memberIds: ['third'] }),
      slot({ regionId: 'CD', slotId: 'va-a', logicalVoiceId: 'va', onset: q(5, 2), duration: q(1, 2), parent: 'b', memberIds: ['fifth'] }),
      slot({ regionId: 'CD', slotId: 'vn1-g:return', logicalVoiceId: 'vn1', onset: q(4), duration: q(1, 2), parent: 'a', memberIds: ['fifth'] }),
      slot({ regionId: 'CD', slotId: 'vn1-e:return', logicalVoiceId: 'vn1', onset: q(5), duration: q(1, 2), parent: 'a', memberIds: ['third'] }),
      slot({ regionId: 'CD', slotId: 'vn1-c:return', logicalVoiceId: 'vn1', onset: q(6), duration: q(1, 2), parent: 'a', memberIds: ['root'] }),
    ],
  });
}

export function triadEcm(): E2PerformRequest {
  const intent = triadPair('CD', triadParent('Cmaj', 'major', ['C', 'E', 'G'], ['C4', 'E4', 'G4']), triadParent('Dmaj', 'major', ['D', 'F#', 'A'], ['D4', 'F#4', 'A4']), 'alternate');
  const singles: GuitarGripWitness[] = [
    ['c', 60, 2, 1],
    ['e', 64, 1, 0],
    ['g', 67, 1, 3],
    ['d', 62, 2, 3],
    ['fs', 66, 1, 2],
    ['a', 69, 1, 5],
    ['g-return', 67, 1, 3],
  ].map(([id, midi, stringNumber, fret]) => ({
    id: String(id),
    slotIds: [String(id)],
    assignments: [{ stringNumber: stringNumber as 1 | 2 | 3 | 4 | 5 | 6, fret: Number(fret), midi: Number(midi) }],
  }));
  return base({
    ensemble: 'ecm-duo',
    title: 'E2 Triad Pair ECM Duo',
    regions: [region('CD', intent)],
    schedule: [
      slot({ regionId: 'CD', slotId: 'c', logicalVoiceId: 'guitar', onset: q(0), duration: q(1, 2), parent: 'a', memberIds: ['root'] }),
      slot({ regionId: 'CD', slotId: 'e', logicalVoiceId: 'guitar', onset: q(1, 2), duration: q(1, 2), parent: 'a', memberIds: ['third'] }),
      slot({ regionId: 'CD', slotId: 'g', logicalVoiceId: 'guitar', onset: q(1), duration: q(1, 2), parent: 'a', memberIds: ['fifth'] }),
      slot({ regionId: 'CD', slotId: 'd', logicalVoiceId: 'guitar', onset: q(2), duration: q(1, 2), parent: 'b', memberIds: ['root'] }),
      slot({ regionId: 'CD', slotId: 'fs', logicalVoiceId: 'guitar', onset: q(5, 2), duration: q(1, 2), parent: 'b', memberIds: ['third'] }),
      slot({ regionId: 'CD', slotId: 'a', logicalVoiceId: 'guitar', onset: q(3), duration: q(1, 2), parent: 'b', memberIds: ['fifth'] }),
      slot({ regionId: 'CD', slotId: 'g-return', logicalVoiceId: 'guitar', onset: q(8), duration: q(1, 2), parent: 'a', memberIds: ['fifth'] }),
    ],
    witnesses: singles,
    sourceNotes: [
      { partId: 'bass', pitch: pitch('A2'), onset: q(0), duration: q(1), sourceId: 'locked-bass-a2' },
      { partId: 'bass', pitch: pitch('E2'), onset: q(2), duration: q(1), sourceId: 'locked-bass-e2' },
    ],
  });
}

export function dyadBigBand(): E2PerformRequest {
  const intent = dyadPair('CF-DG', dyadParent('A', 'C4', 'F4'), dyadParent('B', 'D5', 'G5'), 'interlock');
  return base({
    ensemble: 'big-band',
    title: 'E2 Dyad Pair Big Band',
    regions: [region('CF-DG', intent)],
    schedule: [
      slot({ regionId: 'CF-DG', slotId: 'tenor-c', logicalVoiceId: 'ts1', onset: q(0), duration: q(1), parent: 'a', memberIds: ['low'] }),
      slot({ regionId: 'CF-DG', slotId: 'tenor-f', logicalVoiceId: 'ts2', onset: q(0), duration: q(1), parent: 'a', memberIds: ['high'] }),
      slot({ regionId: 'CF-DG', slotId: 'tp-d', logicalVoiceId: 'tp1', onset: q(3, 2), duration: q(1), parent: 'b', memberIds: ['low'] }),
      slot({ regionId: 'CF-DG', slotId: 'tp-g', logicalVoiceId: 'tp2', onset: q(3, 2), duration: q(1), parent: 'b', memberIds: ['high'] }),
      slot({ regionId: 'CF-DG', slotId: 'overlap-c', logicalVoiceId: 'ts1', onset: q(8), duration: q(1), parent: 'a', memberIds: ['low'] }),
      slot({ regionId: 'CF-DG', slotId: 'overlap-f', logicalVoiceId: 'ts2', onset: q(8), duration: q(1), parent: 'a', memberIds: ['high'] }),
      slot({ regionId: 'CF-DG', slotId: 'overlap-d', logicalVoiceId: 'tp1', onset: q(8), duration: q(1), parent: 'b', memberIds: ['low'] }),
      slot({ regionId: 'CF-DG', slotId: 'overlap-g', logicalVoiceId: 'tp2', onset: q(8), duration: q(1), parent: 'b', memberIds: ['high'] }),
    ],
  });
}

export function dyadQuartet(): E2PerformRequest {
  const first = dyadPair('pairs', dyadParent('A', 'C4', 'G4'), dyadParent('B', 'D4', 'F4'), 'interlock');
  const next = dyadPair('moved', dyadParent('A2', 'C4', 'G4'), dyadParent('B2', 'C#4', 'F#4'), 'alternate');
  return base({
    ensemble: 'string-quartet',
    title: 'E2 Dyad Pair String Quartet',
    regions: [region('pairs', first), region('moved', next)],
    schedule: [
      slot({ regionId: 'pairs', slotId: 'va-c', logicalVoiceId: 'va', onset: q(0), duration: q(2), parent: 'a', memberIds: ['low'] }),
      slot({ regionId: 'pairs', slotId: 'vn2-g', logicalVoiceId: 'vn2', onset: q(0), duration: q(2), parent: 'a', memberIds: ['high'] }),
      slot({ regionId: 'pairs', slotId: 'vc-d', logicalVoiceId: 'vc', onset: q(1), duration: q(1), parent: 'b', memberIds: ['low'] }),
      slot({ regionId: 'pairs', slotId: 'vn1-f', logicalVoiceId: 'vn1', onset: q(1), duration: q(1), parent: 'b', memberIds: ['high'] }),
      slot({ regionId: 'moved', slotId: 'vc-cs', logicalVoiceId: 'vc', onset: q(4), duration: q(1), parent: 'b', memberIds: ['low'] }),
      slot({ regionId: 'moved', slotId: 'vn1-fs', logicalVoiceId: 'vn1', onset: q(4), duration: q(1), parent: 'b', memberIds: ['high'] }),
    ],
  });
}

export function dyadEcm(): E2PerformRequest {
  const intent = dyadPair('CF-BF', dyadParent('A', 'C4', 'F4'), dyadParent('B', 'B3', 'F#4'), 'alternate');
  const witnesses: GuitarGripWitness[] = [
    {
      id: 'cf-5-6',
      slotIds: ['low-c', 'high-f'],
      assignments: [
        { stringNumber: 3, fret: 5, midi: 60 },
        { stringNumber: 2, fret: 6, midi: 65 },
      ],
    },
    {
      id: 'bf-4-7',
      slotIds: ['low-b', 'high-fs'],
      assignments: [
        { stringNumber: 3, fret: 4, midi: 59 },
        { stringNumber: 2, fret: 7, midi: 66 },
      ],
    },
  ];
  return base({
    ensemble: 'ecm-duo',
    title: 'E2 Dyad Pair ECM Duo',
    regions: [region('CF-BF', intent)],
    schedule: [
      slot({ regionId: 'CF-BF', slotId: 'low-c', logicalVoiceId: 'guitar', onset: q(0), duration: q(1), parent: 'a', memberIds: ['low'] }),
      slot({ regionId: 'CF-BF', slotId: 'high-f', logicalVoiceId: 'guitar', onset: q(0), duration: q(1), parent: 'a', memberIds: ['high'] }),
      slot({ regionId: 'CF-BF', slotId: 'low-b', logicalVoiceId: 'guitar', onset: q(3, 2), duration: q(1), parent: 'b', memberIds: ['low'] }),
      slot({ regionId: 'CF-BF', slotId: 'high-fs', logicalVoiceId: 'guitar', onset: q(3, 2), duration: q(1), parent: 'b', memberIds: ['high'] }),
    ],
    witnesses,
    sourceNotes: [{ partId: 'bass', pitch: pitch('A2'), onset: q(0), duration: q(2), sourceId: 'locked-bass-a2' }],
  });
}

export const E2_NINE = [
  polychordBigBand,
  polychordQuartet,
  polychordEcm,
  triadBigBand,
  triadQuartet,
  triadEcm,
  dyadBigBand,
  dyadQuartet,
  dyadEcm,
] as const;
