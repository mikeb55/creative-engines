import {
  TONALITY_VAULT_DATABASE,
  type TonalityVaultChordRow,
} from './tonalityVaultDatabase';
import { selectQuadratonicMelodySpec, vaultDegreeToPitchClass } from './quadratonicMelodySelector';

const STANDARD_OPEN_MIDIS: readonly number[] = [40, 45, 50, 55, 59, 64];

const ROW_BY_TYPE = new Map<string, TonalityVaultChordRow>(
  TONALITY_VAULT_DATABASE.map((r) => [r.chordType, r])
);

export type ReharmStrategy = 'shared-melodic-triad' | 'tension-layer-swap' | 'shell-swap';

export type EmotionalDrift =
  | 'darker'
  | 'brighter'
  | 'more-suspended'
  | 'more-unstable'
  | 'more-cinematic'
  | 'neutral';

export type ReharmCandidate = {
  originalChordTypeId: string;
  substituteChordTypeId: string;
  substituteRootPc: number;
  strategy: ReharmStrategy;
  emotionalDrift: EmotionalDrift;
  bassSmoothnessScore: number;
  melodicTriadPreserved: boolean;
  guitarFriendly: boolean;
};

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

/** Degree anchor for the vault melodic triad (matches `melodicTriadRoot` label). */
function melodicTriadRootScaleDegree(row: TonalityVaultChordRow): number {
  switch (row.melodicTriadRoot) {
    case 'T3':
      return 3;
    case 'T4':
      return 4;
    case 'T7':
      return 7;
    default:
      return 3;
  }
}

function triadDegreeTriple(row: TonalityVaultChordRow): [number, number, number] | null {
  const spec = selectQuadratonicMelodySpec(row.chordType);
  if (!spec) return null;
  return [
    spec.melodicTriad[0]!.degree,
    spec.melodicTriad[1]!.degree,
    spec.melodicTriad[2]!.degree,
  ];
}

function bassSmoothness(originalRoot: number, substituteRoot: number): number {
  const a = normalizePc(originalRoot);
  const b = normalizePc(substituteRoot);
  const d = Math.min(Math.abs(a - b), 12 - Math.abs(a - b));
  if (d >= 6) return 0;
  return 1 - d / 6;
}

/** True if chord root PC can be played at fret &lt; 7 on at least three strings (E standard). */
function isGuitarFriendlyRoot(rootPc: number): boolean {
  let count = 0;
  for (let s = 0; s < 6; s++) {
    const open = STANDARD_OPEN_MIDIS[s]!;
    for (let f = 0; f <= 6; f++) {
      if (normalizePc(open + f) === normalizePc(rootPc)) {
        count++;
        break;
      }
    }
  }
  return count >= 3;
}

function quadratonicAbsPcsForChord(row: TonalityVaultChordRow, rootPc: number): Set<number> {
  const root = normalizePc(rootPc);
  const triple = triadDegreeTriple(row);
  const pcs = new Set<number>();
  if (triple) {
    for (const deg of triple) {
      const rpc = vaultDegreeToPitchClass(row, deg);
      if (rpc !== undefined) pcs.add(normalizePc(root + rpc));
    }
  }
  const tp = vaultDegreeToPitchClass(row, row.primaryTensionNote);
  if (tp !== undefined) pcs.add(normalizePc(root + tp));
  return pcs;
}

function melodyFitsSubstitution(
  subRow: TonalityVaultChordRow,
  substituteRootPc: number,
  melodyPc: number | null
): boolean {
  if (melodyPc === null) return true;
  return quadratonicAbsPcsForChord(subRow, substituteRootPc).has(normalizePc(melodyPc));
}

function driftAffinity(chordTypeId: string, drift: EmotionalDrift): number {
  const id = chordTypeId;
  const lower = id.toLowerCase();

  switch (drift) {
    case 'darker': {
      if (id.startsWith('min') || id.includes('min9') || id.includes('min11') || id.includes('minMaj'))
        return 0.95;
      if (lower.includes('dim') || lower.includes('b13') || lower.includes('b9')) return 0.92;
      if (lower.includes('min7b5')) return 0.9;
      if (lower.startsWith('maj') || lower.includes('#11#9')) return 0.35;
      return 0.5;
    }
    case 'brighter': {
      if (
        id === 'Maj7' ||
        id === 'Maj9' ||
        id === 'Maj7#11' ||
        id.includes('Maj9') ||
        (lower.includes('maj') && !id.startsWith('min'))
      )
        return 0.92;
      if (lower.includes('#11') && !id.startsWith('min')) return 0.88;
      if (lower.includes('sus9')) return 0.78;
      if (id.startsWith('min')) return 0.32;
      return 0.48;
    }
    case 'more-suspended': {
      return lower.includes('sus') ? 0.95 : 0.42;
    }
    case 'more-unstable': {
      if (lower.includes('#9') || lower.includes('7#9') || lower.includes('#11#9')) return 0.95;
      if (lower.includes('13#11') || lower.includes('13b9')) return 0.88;
      if (lower.includes('b9')) return 0.72;
      return 0.45;
    }
    case 'more-cinematic': {
      if (lower.includes('maj7') || lower.includes('minmaj') || lower.includes('sus9')) return 0.88;
      if (lower.includes('m11') || lower.includes('maj9')) return 0.82;
      return 0.52;
    }
    case 'neutral':
    default:
      return 0.55;
  }
}

function combinedRank(
  c: ReharmCandidate,
  drift: EmotionalDrift,
  melodyPc: number | null,
  subRow: TonalityVaultChordRow | undefined
): number {
  if (!subRow) return 0;
  const aff = driftAffinity(c.substituteChordTypeId, drift);
  const bass = c.bassSmoothnessScore;
  const melodyBonus =
    melodyPc !== null && melodyFitsSubstitution(subRow, c.substituteRootPc, melodyPc) ? 0.15 : 0;
  return aff * bass + melodyBonus + (c.guitarFriendly ? 0.05 : 0);
}

/**
 * Enumerates Tonality Vault reharm candidates (same root by default; bass smoothness favours common-tone bass).
 */
export function generateReharmCandidates(
  chordTypeId: string,
  rootPc: number,
  melodyPc: number | null,
  drift: EmotionalDrift
): ReharmCandidate[] {
  const original = ROW_BY_TYPE.get(chordTypeId);
  if (!original) return [];

  const origTriple = triadDegreeTriple(original);
  const origAnchorDeg = melodicTriadRootScaleDegree(original);

  if (!origTriple) return [];

  const out: ReharmCandidate[] = [];
  const substituteRootPc = normalizePc(rootPc);

  for (const sub of TONALITY_VAULT_DATABASE) {
    if (sub.chordType === chordTypeId) continue;

    const subTriple = triadDegreeTriple(sub);
    if (!subTriple) continue;

    const sameMelodicTriadRoot = sub.melodicTriadRoot === original.melodicTriadRoot;
    const sameTriadDegrees =
      subTriple[0] === origTriple[0] &&
      subTriple[1] === origTriple[1] &&
      subTriple[2] === origTriple[2];

    const tensionMatchesMelodicTriadRootAnchor = sub.primaryTensionNote === origAnchorDeg;

    const strategies = new Set<ReharmStrategy>();
    if (sameMelodicTriadRoot) strategies.add('shared-melodic-triad');
    if (sameTriadDegrees) strategies.add('shell-swap');
    if (tensionMatchesMelodicTriadRootAnchor) strategies.add('tension-layer-swap');

    for (const strategy of strategies) {
      const melodicTriadPreserved =
        strategy === 'tension-layer-swap' ? false : true;

      out.push({
        originalChordTypeId: chordTypeId,
        substituteChordTypeId: sub.chordType,
        substituteRootPc,
        strategy,
        emotionalDrift: drift,
        bassSmoothnessScore: bassSmoothness(rootPc, substituteRootPc),
        melodicTriadPreserved,
        guitarFriendly: isGuitarFriendlyRoot(substituteRootPc),
      });
    }
  }

  const dedup = new Map<string, ReharmCandidate>();
  for (const c of out) {
    const key = `${c.strategy}|${c.substituteChordTypeId}|${c.substituteRootPc}`;
    dedup.set(key, c);
  }

  return [...dedup.values()].sort((a, b) => {
    const rowA = ROW_BY_TYPE.get(a.substituteChordTypeId);
    const rowB = ROW_BY_TYPE.get(b.substituteChordTypeId);
    return combinedRank(b, drift, melodyPc, rowB) - combinedRank(a, drift, melodyPc, rowA);
  });
}
