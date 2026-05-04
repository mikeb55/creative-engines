import { buildBeatContextLegalityMap } from '../harmony/beatContextLegalityMap';
import { TONALITY_VAULT_DATABASE } from '../harmony/tonalityVaultDatabase';
import { selectQuadratonicMelodySpec } from '../harmony/quadratonicMelodySelector';
import type { FretboardRealization, FretboardTechniqueTag, FretboardTonalRole } from './fretboardRealization';
import { getAlternateGuitarTuningPreset } from '../song-mode/alternateGuitarTunings';

const STANDARD_OPEN_MIDIS: readonly number[] = [40, 45, 50, 55, 59, 64];

const NOTE_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

const CHORD_TYPES = new Set(TONALITY_VAULT_DATABASE.map((r) => r.chordType));

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function parseScientificToMidi(note: string): number | null {
  const m = /^\s*([A-Ga-g])([#b]?)(-?\d+)\s*$/.exec(note);
  if (!m) return null;
  const step = m[1]!.toUpperCase();
  const acc = m[2] ?? '';
  const key = `${step}${acc}`;
  const semi = NOTE_SEMITONE[key];
  if (semi === undefined) return null;
  const oct = Number(m[3]);
  if (!Number.isFinite(oct)) return null;
  return (oct + 1) * 12 + semi;
}

function openStringMidisForTuning(tuningId: string): number[] {
  const preset = getAlternateGuitarTuningPreset(tuningId);
  if (!preset || preset.id === 'custom') {
    return [...STANDARD_OPEN_MIDIS];
  }
  const midis: number[] = [];
  for (const s of preset.strings) {
    const m = parseScientificToMidi(s);
    if (m === null) return [...STANDARD_OPEN_MIDIS];
    midis.push(m);
  }
  return midis.length === 6 ? midis : [...STANDARD_OPEN_MIDIS];
}

function candidateFretsOnString(openMidis: readonly number[], stringIdx: number, absPc: number): number[] {
  const open = openMidis[stringIdx]!;
  const out: number[] = [];
  for (let f = 0; f <= 15; f++) {
    if (normalizePc(open + f) === normalizePc(absPc)) out.push(f);
  }
  return out;
}

type Voicing = { strings: number[]; frets: number[]; pitchClasses: number[] };

function voicingSpan(frets: readonly number[]): number {
  if (frets.length === 0) return 0;
  return Math.max(...frets) - Math.min(...frets);
}

function combinationsStrings(n: number): number[][] {
  const out: number[][] = [];
  function build(start: number, acc: number[]): void {
    if (acc.length === n) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < 6; i++) {
      acc.push(i);
      build(i + 1, acc);
      acc.pop();
    }
  }
  build(0, []);
  return out;
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [[...arr]];
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const head = arr[i]!;
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) {
      res.push([head, ...p]);
    }
  }
  return res;
}

/** Returns false from cb to stop iterating early (caps explosion). */
function productIterate(fretLists: number[][], cb: (combo: number[]) => boolean | void): void {
  const idx = fretLists.map(() => 0);
  const n = idx.length;
  if (n === 0) return;
  let done = false;
  while (!done) {
    const cont = cb(idx.map((k, i) => fretLists[i]![k]!));
    if (cont === false) return;
    let j = n - 1;
    while (j >= 0) {
      idx[j] = idx[j]! + 1;
      if (idx[j]! < fretLists[j]!.length) break;
      idx[j] = 0;
      j--;
    }
    if (j < 0) done = true;
  }
}

function enumerateVoicings(
  openMidis: readonly number[],
  absPcs: readonly number[],
  maxShapes: number
): Voicing[] {
  const n = absPcs.length;
  if (n === 0 || n > 6) return [];
  const pcsOrdered = absPcs.map(normalizePc);
  const results: Voicing[] = [];

  for (const strSet of combinationsStrings(n)) {
    for (const pitchOrder of permutations([...pcsOrdered])) {
      if (results.length >= maxShapes) break;
      const fretLists: number[][] = [];
      let skip = false;
      for (let i = 0; i < n; i++) {
        const s = strSet[i]!;
        const pc = pitchOrder[i]!;
        const frets = candidateFretsOnString(openMidis, s, pc);
        if (frets.length === 0) {
          skip = true;
          break;
        }
        fretLists.push(frets);
      }
      if (skip) continue;

      productIterate(fretLists, (fretCombo) => {
        if (results.length >= maxShapes) return false;
        if (voicingSpan(fretCombo) > 4) return undefined;
        results.push({
          strings: [...strSet],
          frets: fretCombo,
          pitchClasses: pitchOrder.map(normalizePc),
        });
        return results.length >= maxShapes ? false : undefined;
      });
      if (results.length >= maxShapes) break;
    }
    if (results.length >= maxShapes) break;
  }

  return dedupeVoicings(results).slice(0, maxShapes);
}

function dedupeVoicings(v: Voicing[]): Voicing[] {
  const seen = new Set<string>();
  const out: Voicing[] = [];
  for (const x of v) {
    const key = x.strings.join(',') + '|' + x.frets.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}

function inferTechniqueTags(frets: readonly number[], tonalRole: FretboardTonalRole): FretboardTechniqueTag[] {
  const tags: FretboardTechniqueTag[] = ['alternate'];
  if (frets.length === 2) tags.push('double-stop');
  if (tonalRole === 'triadPair') tags.push('economy');
  return tags;
}

function toRealization(
  v: Voicing,
  tonalRole: FretboardTonalRole,
  tuningId: string
): FretboardRealization {
  const positionCenter = v.frets.length ? v.frets.reduce((a, b) => a + b, 0) / v.frets.length : 0;
  return {
    pitchClasses: v.pitchClasses.map(normalizePc),
    strings: v.strings,
    frets: v.frets,
    positionCenter,
    techniqueTags: inferTechniqueTags(v.frets, tonalRole),
    tonalRole,
    tuningId,
  };
}

function relToAbs(rootPc: number, rel: number): number {
  return normalizePc(rootPc + rel);
}

const MAX_GRIPS_PER_GROUP = 36;

/**
 * Enumerates playable grips for Tonality Vault chord types on six strings.
 * Uses {@link buildBeatContextLegalityMap} so only vault-derived pitch classes appear.
 */
export function buildGuitarGripLibrary(
  chordTypeId: string,
  rootPc: number,
  tuningId: string
): FretboardRealization[] {
  if (!CHORD_TYPES.has(chordTypeId)) return [];

  const legality = buildBeatContextLegalityMap(chordTypeId, rootPc);
  if (legality.size === 0) return [];

  const spec = selectQuadratonicMelodySpec(chordTypeId);
  if (!spec) return [];

  const openMidis = openStringMidisForTuning(tuningId);
  const root = normalizePc(rootPc);

  const triadAbs = spec.melodicTriad.map((t) => relToAbs(root, t.pitchClassFromRoot));
  const tensionAbs = relToAbs(root, spec.primaryTension.pitchClassFromRoot);
  const quadAbs = [...new Set([...triadAbs, tensionAbs])].map(normalizePc);

  const out: FretboardRealization[] = [];

  for (const v of enumerateVoicings(openMidis, triadAbs, MAX_GRIPS_PER_GROUP)) {
    out.push(toRealization(v, 'triad', tuningId));
  }
  for (const v of enumerateVoicings(openMidis, quadAbs, MAX_GRIPS_PER_GROUP)) {
    out.push(toRealization(v, 'primaryQuadratonic', tuningId));
  }

  const dyadPcPairs: [number, number][] = [];
  for (let i = 0; i < triadAbs.length; i++) {
    for (let j = i + 1; j < triadAbs.length; j++) {
      dyadPcPairs.push([normalizePc(triadAbs[i]!), normalizePc(triadAbs[j]!)]);
    }
  }
  for (const t of triadAbs) {
    dyadPcPairs.push([normalizePc(t), normalizePc(tensionAbs)]);
  }

  for (const [a, b] of dyadPcPairs) {
    const hasTension = a === normalizePc(tensionAbs) || b === normalizePc(tensionAbs);
    const role: FretboardTonalRole = hasTension ? 'tensionQuadratonic' : 'triad';
    for (const v of enumerateVoicings(openMidis, [a, b], MAX_GRIPS_PER_GROUP)) {
      out.push(toRealization(v, role, tuningId));
    }
  }

  const sortedQuad = [...quadAbs].sort((x, y) => x - y);
  if (sortedQuad.length >= 4) {
    const pairA = [sortedQuad[0]!, sortedQuad[1]!];
    const pairB = [sortedQuad[2]!, sortedQuad[3]!];
    const tpAbs = [...pairA, ...pairB];
    for (const v of enumerateVoicings(openMidis, tpAbs, MAX_GRIPS_PER_GROUP)) {
      out.push(toRealization(v, 'triadPair', tuningId));
    }
  }

  return dedupeRealizations(out);
}

function dedupeRealizations(r: FretboardRealization[]): FretboardRealization[] {
  const seen = new Set<string>();
  const out: FretboardRealization[] = [];
  for (const x of r) {
    const key = [x.tonalRole, x.strings.join(','), x.frets.join(','), x.tuningId].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}
