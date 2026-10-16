/**
 * H6-C2 — advanced tertian colours and alternate trichord constructions.
 * Collection ids already in the H2 registry and the 12 Core pairs stay as they are.
 * A sus or quartal pair that reproduces a known pitch-class set links to that set.
 */

import { canonicalPitchSet, mod12 } from '../pentatonic/pitch';
import { parseSpelledPitch } from '../wwh/wwhTriadPair';
import { classifyPitchClassSet, FORTE_HEXACHORD_PRIMES } from './setClass';
import { listHexatonicScalars, rootSpelled, transposeScalar } from './collections';
import { CORE_CANDIDATES, CORE_LABORATORY_STATUS } from './coreLaboratory';
import { listTertianTriads, commonToneCount } from './tertianTriadUniverse';
import { listHexatonicWpsPairs, transposeHexatonicWpsPair } from './triadPairs';

export const ADVANCED_STATUS = 'ADVANCED — NOT MUSICALLY APPROVED' as const;
export const EXPLORER_STATUS = 'EXPLORER — NOT MUSICALLY APPROVED' as const;

export type CollectionTier = 'established' | 'provisional' | 'advanced' | 'explorer';
export type ConstructionKind = 'sus2' | 'sus4' | 'quartal';

export interface AdvancedColour {
  id: 'adv-6-13' | 'adv-6-23' | 'adv-6-28';
  forte: '6-13' | '6-23' | '6-28';
  label: string;
  leftSpelling: readonly [string, string, string];
  rightSpelling: readonly [string, string, string];
  leftQuality: 'diminished' | 'augmented';
  rightQuality: 'diminished' | 'augmented';
  pitchClasses: readonly number[];
  normalForm: readonly number[];
  status: typeof ADVANCED_STATUS;
  mathematicallyValid: true;
  humanApproved: false;
  provenance: string;
}

export interface ConstructionLink {
  family: 'scalar' | 'wps' | 'provisional' | 'advanced';
  id: string;
  referencePc: number;
}

export interface AlternativeConstruction {
  id: string;
  kind: string;
  leftKind: ConstructionKind;
  rightKind: ConstructionKind;
  leftSpelling: readonly [string, string, string];
  rightSpelling: readonly [string, string, string];
  pitchClasses: readonly number[];
  normalForm: readonly number[];
  forte: string;
  links: readonly ConstructionLink[];
}

export interface ExplorerRow {
  forte: string;
  prime: readonly number[];
  tier: CollectionTier;
  status: string;
  suspendedQuartalOnly: boolean;
  catalogueIds: readonly string[];
}

export interface GuitarVoicing {
  frets: readonly (number | null)[];
  openStrings: number;
  span: number;
  humanPlayability: 'NOT VERIFIED';
}

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

const PROPOSED: readonly Omit<AdvancedColour, 'pitchClasses' | 'normalForm' | 'status' | 'mathematicallyValid' | 'humanApproved' | 'provenance'>[] = [
  {
    id: 'adv-6-13',
    forte: '6-13',
    label: 'C diminished / Db diminished',
    leftSpelling: ['C', 'Eb', 'Gb'],
    rightSpelling: ['Db', 'Fb', 'Abb'],
    leftQuality: 'diminished',
    rightQuality: 'diminished',
  },
  {
    id: 'adv-6-23',
    forte: '6-23',
    label: 'C diminished / D diminished',
    leftSpelling: ['C', 'Eb', 'Gb'],
    rightSpelling: ['D', 'F', 'Ab'],
    leftQuality: 'diminished',
    rightQuality: 'diminished',
  },
  {
    id: 'adv-6-28',
    forte: '6-28',
    label: 'C diminished / Db augmented',
    leftSpelling: ['C', 'Eb', 'Gb'],
    rightSpelling: ['Db', 'F', 'A'],
    leftQuality: 'diminished',
    rightQuality: 'augmented',
  },
];

function pcsOf(notes: readonly string[]): number[] {
  return canonicalPitchSet(notes.map((token) => parseSpelledPitch(token).pc));
}

function admit(row: (typeof PROPOSED)[number]): AdvancedColour {
  const pitchClasses = pcsOf([...row.leftSpelling, ...row.rightSpelling]);
  if (pitchClasses.length !== 6) throw new Error(`${row.id} does not union to six pitch classes`);
  const setClass = classifyPitchClassSet(pitchClasses);
  if (setClass.forte !== row.forte) throw new Error(`${row.id} is Forte ${setClass.forte}, not ${row.forte}`);
  return {
    ...row,
    pitchClasses,
    normalForm: setClass.normalForm,
    status: ADVANCED_STATUS,
    mathematicallyValid: true,
    humanApproved: false,
    provenance: `Computed tertian union. Forte ${row.forte} checked against the hexachord prime. Not admitted to the Core. ${ADVANCED_STATUS}.`,
  };
}

export const ADVANCED_COLOURS: readonly AdvancedColour[] = PROPOSED.map(admit);

export function listAdvancedColours(): readonly AdvancedColour[] {
  return ADVANCED_COLOURS;
}

export function getAdvancedColour(id: string): AdvancedColour | undefined {
  return ADVANCED_COLOURS.find((row) => row.id === id);
}

function spell(pitchClass: number): string {
  return NAMES[mod12(pitchClass)]!;
}

function trichord(kind: ConstructionKind, rootPc: number): [string, string, string] {
  if (kind === 'sus2') return [spell(rootPc), spell(rootPc + 2), spell(rootPc + 7)];
  if (kind === 'sus4') return [spell(rootPc), spell(rootPc + 5), spell(rootPc + 7)];
  return [spell(rootPc), spell(rootPc + 5), spell(rootPc + 10)];
}

interface KnownSet {
  family: ConstructionLink['family'];
  id: string;
  referencePc: number;
  key: string;
}

function knownSets(): KnownSet[] {
  const rows: KnownSet[] = [];
  for (let semitones = 0; semitones < 12; semitones += 1) {
    for (const scalar of listHexatonicScalars()) {
      rows.push({
        family: 'scalar',
        id: scalar.id,
        referencePc: semitones,
        key: canonicalPitchSet(transposeScalar(scalar.id, semitones)).join(','),
      });
    }
    const spelling = rootSpelled(semitones);
    for (const pair of listHexatonicWpsPairs()) {
      rows.push({
        family: 'wps',
        id: pair.id,
        referencePc: semitones,
        key: canonicalPitchSet(transposeHexatonicWpsPair(pair.id, spelling).pitchClasses).join(','),
      });
    }
    for (const candidate of CORE_CANDIDATES) {
      const moved = [...candidate.leftSpelling, ...candidate.rightSpelling].map((token) => parseSpelledPitch(token).pc + semitones);
      rows.push({ family: 'provisional', id: candidate.id, referencePc: semitones, key: canonicalPitchSet(moved).join(',') });
    }
    for (const colour of ADVANCED_COLOURS) {
      rows.push({
        family: 'advanced',
        id: colour.id,
        referencePc: semitones,
        key: canonicalPitchSet(colour.pitchClasses.map((pitchClass) => pitchClass + semitones)).join(','),
      });
    }
  }
  return rows;
}

let cachedKnown: KnownSet[] | null = null;

function linksFor(pitchClasses: readonly number[]): ConstructionLink[] {
  const key = canonicalPitchSet(pitchClasses).join(',');
  const found = new Map<string, ConstructionLink>();
  for (const row of cachedKnown ?? (cachedKnown = knownSets())) {
    if (row.key !== key) continue;
    const id = `${row.family}:${row.id}`;
    if (!found.has(id)) found.set(id, { family: row.family, id: row.id, referencePc: row.referencePc });
  }
  return [...found.values()];
}

let cachedConstructions: AlternativeConstruction[] | null = null;

export function listAlternativeConstructions(): readonly AlternativeConstruction[] {
  if (cachedConstructions) return cachedConstructions;
  const kinds: ConstructionKind[] = ['sus2', 'sus4', 'quartal'];
  const trichords = kinds.flatMap((kind) =>
    Array.from({ length: 12 }, (_, rootPc) => ({ kind, rootPc, spelling: trichord(kind, rootPc) })),
  );
  const rows: AlternativeConstruction[] = [];
  const seen = new Set<string>();
  for (let left = 0; left < trichords.length; left += 1) {
    for (let right = left + 1; right < trichords.length; right += 1) {
      const a = trichords[left]!;
      const b = trichords[right]!;
      const pitchClasses = pcsOf([...a.spelling, ...b.spelling]);
      if (pitchClasses.length !== 6) continue;
      const id = [`${a.kind}:${a.rootPc}`, `${b.kind}:${b.rootPc}`].sort().join('|');
      if (seen.has(id)) continue;
      seen.add(id);
      const setClass = classifyPitchClassSet(pitchClasses);
      rows.push({
        id,
        kind: `${a.kind}+${b.kind}`,
        leftKind: a.kind,
        rightKind: b.kind,
        leftSpelling: a.spelling,
        rightSpelling: b.spelling,
        pitchClasses,
        normalForm: setClass.normalForm,
        forte: setClass.forte,
        links: linksFor(pitchClasses),
      });
    }
  }
  cachedConstructions = rows;
  return rows;
}

export function constructionsForPitchClasses(pitchClasses: readonly number[]): readonly AlternativeConstruction[] {
  const key = canonicalPitchSet(pitchClasses).join(',');
  return listAlternativeConstructions().filter((row) => canonicalPitchSet(row.pitchClasses).join(',') === key);
}

function tertianUnionFortes(): Set<string> {
  const fortes = new Set<string>();
  const triads = listTertianTriads();
  for (let left = 0; left < triads.length; left += 1) {
    for (let right = left + 1; right < triads.length; right += 1) {
      if (commonToneCount(triads[left]!.pitchClasses, triads[right]!.pitchClasses) !== 0) continue;
      const union = canonicalPitchSet([...triads[left]!.pitchClasses, ...triads[right]!.pitchClasses]);
      if (union.length !== 6) continue;
      fortes.add(classifyPitchClassSet(union).forte);
    }
  }
  return fortes;
}

/** Forte classes reached by a disjoint sus/quartal pair and by no disjoint tertian pair. */
export function suspendedQuartalOnlyFortes(): readonly string[] {
  const tertian = tertianUnionFortes();
  const found = new Set<string>();
  for (const row of listAlternativeConstructions()) {
    if (row.links.some((link) => link.family === 'advanced')) continue;
    if (!tertian.has(row.forte)) found.add(row.forte);
  }
  return [...found].sort();
}

function tierFor(forte: string, established: Set<string>, provisional: Set<string>): CollectionTier {
  if (established.has(forte)) return 'established';
  if (ADVANCED_COLOURS.some((row) => row.forte === forte)) return 'advanced';
  if (provisional.has(forte)) return 'provisional';
  return 'explorer';
}

export function listExplorerCatalogue(): readonly ExplorerRow[] {
  const established = new Set<string>();
  const ids = new Map<string, string[]>();
  const add = (forte: string, id: string, establishedRow: boolean) => {
    if (establishedRow) established.add(forte);
    const group = ids.get(forte) ?? [];
    group.push(id);
    ids.set(forte, group);
  };
  for (const scalar of listHexatonicScalars()) add(classifyPitchClassSet(scalar.pitchClasses).forte, scalar.id, true);
  for (const pair of listHexatonicWpsPairs()) add(classifyPitchClassSet(pair.pitchClasses).forte, pair.id, true);
  const provisional = new Set<string>();
  for (const candidate of CORE_CANDIDATES) {
    const forte = classifyPitchClassSet(pcsOf([...candidate.leftSpelling, ...candidate.rightSpelling])).forte;
    provisional.add(forte);
    add(forte, candidate.id, false);
  }
  for (const colour of ADVANCED_COLOURS) add(colour.forte, colour.id, false);
  const susOnly = new Set(suspendedQuartalOnlyFortes());
  return FORTE_HEXACHORD_PRIMES.map((row) => {
    const tier = tierFor(row.forte, established, provisional);
    const status = tier === 'established'
      ? 'catalogue'
      : tier === 'provisional'
        ? CORE_LABORATORY_STATUS
        : tier === 'advanced'
          ? ADVANCED_STATUS
          : EXPLORER_STATUS;
    return {
      forte: row.forte,
      prime: row.prime,
      tier,
      status,
      suspendedQuartalOnly: susOnly.has(row.forte),
      catalogueIds: ids.get(row.forte) ?? [],
    };
  });
}

function fretsFor(stringMidi: number, pitchClass: number): number[] {
  const found: number[] = [];
  for (let fret = 0; fret <= 12; fret += 1) {
    if (mod12(stringMidi + fret) === mod12(pitchClass)) found.push(fret);
  }
  return found;
}

export function openGuitarVoicings(pitchClasses: readonly number[], limit = 4): GuitarVoicing[] {
  const tones = canonicalPitchSet(pitchClasses);
  if (tones.length < 2 || tones.length > 3) return [];
  const found: GuitarVoicing[] = [];
  const indexes = OPEN_MIDI.map((_, index) => index);
  const groups: number[][] = [];
  const pick: number[] = [];
  const walk = (start: number) => {
    if (pick.length === tones.length) {
      groups.push(pick.slice());
      return;
    }
    for (let index = start; index < indexes.length; index += 1) {
      pick.push(indexes[index]!);
      walk(index + 1);
      pick.pop();
    }
  };
  walk(0);
  for (const strings of groups) {
    const permute = (left: number[]) => {
      if (found.length >= limit * 4) return;
      if (left.length === tones.length) {
        const choices = left.map((tone, place) => fretsFor(OPEN_MIDI[strings[place]!]!, tone));
        const fretPick: number[] = [];
        const take = (place: number) => {
          if (found.length >= limit * 4) return;
          if (place === choices.length) {
            const frets = OPEN_MIDI.map(() => null as number | null);
            fretPick.forEach((fret, placeIndex) => {
              frets[strings[placeIndex]!] = fret;
            });
            const sounded = fretPick.filter((fret) => fret > 0);
            const span = sounded.length ? Math.max(...sounded) - Math.min(...sounded) : 0;
            if (span > 4) return;
            found.push({
              frets,
              openStrings: fretPick.filter((fret) => fret === 0).length,
              span,
              humanPlayability: 'NOT VERIFIED',
            });
            return;
          }
          for (const fret of choices[place] ?? []) {
            fretPick.push(fret);
            take(place + 1);
            fretPick.pop();
          }
        };
        take(0);
        return;
      }
      for (let index = 0; index < tones.length; index += 1) {
        const tone = tones[index]!;
        if (left.includes(tone)) continue;
        permute([...left, tone]);
      }
    };
    permute([]);
  }
  const unique = new Map<string, GuitarVoicing>();
  for (const row of found) unique.set(row.frets.join(','), row);
  return [...unique.values()].sort((left, right) => right.openStrings - left.openStrings || left.span - right.span).slice(0, limit);
}
