import {
  TONALITY_VAULT_DATABASE,
  type MelodicTriadQuality,
  type TonalityVaultChordRow,
} from './tonalityVaultDatabase';
import { selectQuadratonicMelodySpec, vaultDegreeToPitchClass } from './quadratonicMelodySelector';

const STANDARD_OPEN_MIDIS: readonly number[] = [40, 45, 50, 55, 59, 64];

const ROW_BY_TYPE = new Map<string, TonalityVaultChordRow>(
  TONALITY_VAULT_DATABASE.map((r) => [r.chordType, r])
);

export type ReharmStrategy = 'shared-melodic-triad' | 'tension-layer-swap' | 'shell-swap';

/** Contrasting harmonic approaches for passage reharm pools. */
export type ReharmApproach = 'functional-root' | 'modal-borrowed' | 'nonfunctional-mediant';

export const REHARM_APPROACHES: readonly ReharmApproach[] = [
  'functional-root',
  'modal-borrowed',
  'nonfunctional-mediant',
] as const;

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
  strategy: ReharmStrategy | string;
  emotionalDrift: EmotionalDrift;
  bassSmoothnessScore: number;
  melodicTriadPreserved: boolean;
  guitarFriendly: boolean;
  /** Set on approach-pool candidates; absent on legacy same-root colour swaps. */
  approach?: ReharmApproach;
};

type ApproachSeed = {
  approach: ReharmApproach;
  strategy: string;
  rootOffset: number;
  chordTypes: readonly string[];
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

function shellPcMask(row: TonalityVaultChordRow, rootPc: number): number {
  let mask = 0;
  for (const deg of row.leftHandShell) {
    const rel = vaultDegreeToPitchClass(row, deg);
    if (rel === undefined) continue;
    mask |= 1 << normalizePc(rootPc + rel);
  }
  return mask;
}

function qualityFamily(row: TonalityVaultChordRow): MelodicTriadQuality | 'suspended' {
  if (row.chordType.includes('sus')) return 'suspended';
  return row.melodicTriadQuality;
}

function typesForQuality(q: MelodicTriadQuality | 'suspended'): string[] {
  switch (q) {
    case 'minor':
      return ['min9', 'min11', 'minMaj9', 'min7b5'];
    case 'diminished':
      return ['min7b5', 'dim7b13'];
    case 'suspended':
      return ['sus9', 'sus-b9'];
    case 'major':
    default:
      return ['Maj7', 'Maj9', 'Maj7#11', 'Maj6', 'Maj7#5'];
  }
}

function parallelFlipTypes(row: TonalityVaultChordRow): string[] {
  const q = qualityFamily(row);
  if (q === 'minor' || q === 'diminished') return typesForQuality('major');
  if (q === 'major') return typesForQuality('minor');
  return ['min9', 'Maj7', 'minMaj9'];
}

function dominantTypes(): string[] {
  return ['13b9', '7#9#5', '13#11#9'];
}

/**
 * Substitution vocabulary spanning functional roots, modal/borrowed, and non-functional mediants.
 * Root offsets + vault types — mirrors reharmonisationAgent / compositionDepthBuilder moves.
 */
function approachSeedsFor(original: TonalityVaultChordRow): ApproachSeed[] {
  const sameFamily = typesForQuality(qualityFamily(original));
  const seeds: ApproachSeed[] = [
    // Functional root substitutions
    {
      approach: 'functional-root',
      strategy: 'tritone-sub',
      rootOffset: 6,
      chordTypes: dominantTypes(),
    },
    {
      approach: 'functional-root',
      strategy: 'backdoor-dominant',
      rootOffset: 10,
      chordTypes: dominantTypes(),
    },
    {
      approach: 'functional-root',
      strategy: 'secondary-dominant',
      rootOffset: 7,
      chordTypes: dominantTypes(),
    },
    {
      approach: 'functional-root',
      strategy: 'supertonic',
      rootOffset: 2,
      chordTypes: ['min9', 'min11', 'min7b5'],
    },
    {
      approach: 'functional-root',
      strategy: 'relative-major',
      rootOffset: 3,
      chordTypes: ['Maj7', 'Maj9', 'Maj7#11'],
    },
    {
      approach: 'functional-root',
      strategy: 'relative-minor',
      rootOffset: 9,
      chordTypes: ['min9', 'min11', 'minMaj9'],
    },
    // Modal / borrowed harmony
    {
      approach: 'modal-borrowed',
      strategy: 'parallel-mode',
      rootOffset: 0,
      chordTypes: parallelFlipTypes(original),
    },
    {
      approach: 'modal-borrowed',
      strategy: 'borrowed-iv',
      rootOffset: 5,
      chordTypes: ['min9', 'min11', 'minMaj9'],
    },
    {
      approach: 'modal-borrowed',
      strategy: 'borrowed-bVI',
      rootOffset: 8,
      chordTypes: ['Maj7', 'Maj9', 'Maj7#11'],
    },
    {
      approach: 'modal-borrowed',
      strategy: 'borrowed-bVII',
      rootOffset: 10,
      chordTypes: ['Maj7', 'Maj9', '13#11#9'],
    },
    {
      approach: 'modal-borrowed',
      strategy: 'borrowed-bIII',
      rootOffset: 3,
      chordTypes: ['Maj7', 'Maj9', 'min9'],
    },
    {
      approach: 'modal-borrowed',
      strategy: 'modal-sus',
      rootOffset: 0,
      chordTypes: ['sus9', 'sus-b9'],
    },
    // Non-functional mediant / interval movement
    {
      approach: 'nonfunctional-mediant',
      strategy: 'chromatic-mediant-m3',
      rootOffset: 3,
      chordTypes: sameFamily,
    },
    {
      approach: 'nonfunctional-mediant',
      strategy: 'chromatic-mediant-M3',
      rootOffset: 4,
      chordTypes: sameFamily,
    },
    {
      approach: 'nonfunctional-mediant',
      strategy: 'chromatic-mediant-down-M3',
      rootOffset: 8,
      chordTypes: sameFamily,
    },
    {
      approach: 'nonfunctional-mediant',
      strategy: 'chromatic-mediant-down-m3',
      rootOffset: 9,
      chordTypes: sameFamily,
    },
    {
      approach: 'nonfunctional-mediant',
      strategy: 'side-slip',
      rootOffset: 1,
      chordTypes: [...sameFamily, 'sus9'],
    },
    {
      approach: 'nonfunctional-mediant',
      strategy: 'side-slip-down',
      rootOffset: 11,
      chordTypes: [...sameFamily, 'sus9'],
    },
  ];
  return seeds;
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

/** Same root + same quality family + identical shell PC set → extension / colour-only swap. */
export function isExtensionOnlyVariant(
  originalTypeId: string,
  originalRootPc: number,
  substituteTypeId: string,
  substituteRootPc: number
): boolean {
  if (normalizePc(originalRootPc) !== normalizePc(substituteRootPc)) return false;
  const orig = ROW_BY_TYPE.get(originalTypeId);
  const sub = ROW_BY_TYPE.get(substituteTypeId);
  if (!orig || !sub) return false;
  if (qualityFamily(orig) !== qualityFamily(sub)) return false;
  return shellPcMask(orig, originalRootPc) === shellPcMask(sub, substituteRootPc);
}

/** Shell PC-set identity — catches enharmonic respells and identical voicing classes. */
export function isEnharmonicShellDuplicate(
  aTypeId: string,
  aRootPc: number,
  bTypeId: string,
  bRootPc: number
): boolean {
  const a = ROW_BY_TYPE.get(aTypeId);
  const b = ROW_BY_TYPE.get(bTypeId);
  if (!a || !b) return false;
  return shellPcMask(a, aRootPc) === shellPcMask(b, bRootPc);
}

function popcount(mask: number): number {
  let n = 0;
  let m = mask >>> 0;
  while (m) {
    n += m & 1;
    m >>>= 1;
  }
  return n;
}

/** Jaccard distance on shell PC masks in [0,1]; 1 = disjoint. */
export function shellHarmonicDistance(
  aTypeId: string,
  aRootPc: number,
  bTypeId: string,
  bRootPc: number
): number {
  const a = ROW_BY_TYPE.get(aTypeId);
  const b = ROW_BY_TYPE.get(bTypeId);
  if (!a || !b) return 1;
  const ma = shellPcMask(a, aRootPc);
  const mb = shellPcMask(b, bRootPc);
  const inter = popcount(ma & mb);
  const union = popcount(ma | mb);
  if (union === 0) return 0;
  return 1 - inter / union;
}

export function circularRootDistance(a: number, b: number): number {
  const x = Math.abs(normalizePc(a) - normalizePc(b));
  return Math.min(x, 12 - x);
}

/**
 * Combined source distance in [0,1]: root motion + shell set change.
 * Soft first-note-per-bar melody fit is scored separately — not claimed as all-event compat.
 */
export function chordHarmonicDistance(
  aTypeId: string,
  aRootPc: number,
  bTypeId: string,
  bRootPc: number
): number {
  const root = circularRootDistance(aRootPc, bRootPc) / 6;
  const shell = shellHarmonicDistance(aTypeId, aRootPc, bTypeId, bRootPc);
  return Math.min(1, 0.45 * root + 0.55 * shell);
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
  const approachBias = c.approach ? 0.08 : 0;
  return aff * bass + melodyBonus + (c.guitarFriendly ? 0.05 : 0) + approachBias;
}

/**
 * Enumerates Tonality Vault reharm candidates (same root by default; bass smoothness favours common-tone bass).
 * Legacy colour/shell/tension path for Chord Inspector — does not apply approach-pool filters.
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

/**
 * Contrasting approach pool: functional roots, modal/borrowed, non-functional mediants.
 * Rejects extension-only colour swaps and enharmonic shell duplicates of the source.
 * Melody check remains soft first-note-per-bar fit only — not all-event passage proof.
 */
export function generateApproachReharmCandidates(
  chordTypeId: string,
  rootPc: number,
  melodyPc: number | null,
  drift: EmotionalDrift,
  approachFilter?: ReharmApproach
): ReharmCandidate[] {
  const original = ROW_BY_TYPE.get(chordTypeId);
  if (!original) return [];

  const out: ReharmCandidate[] = [];
  const seenShell = new Set<number>();
  const origMask = shellPcMask(original, rootPc);
  seenShell.add(origMask);

  for (const seed of approachSeedsFor(original)) {
    if (approachFilter && seed.approach !== approachFilter) continue;
    const subRoot = normalizePc(rootPc + seed.rootOffset);
    for (const typeId of seed.chordTypes) {
      if (typeId === chordTypeId && subRoot === normalizePc(rootPc)) continue;
      const sub = ROW_BY_TYPE.get(typeId);
      if (!sub) continue;
      if (isExtensionOnlyVariant(chordTypeId, rootPc, typeId, subRoot)) continue;
      const mask = shellPcMask(sub, subRoot);
      if (seenShell.has(mask)) continue;
      if (isEnharmonicShellDuplicate(chordTypeId, rootPc, typeId, subRoot)) continue;
      seenShell.add(mask);

      out.push({
        originalChordTypeId: chordTypeId,
        substituteChordTypeId: typeId,
        substituteRootPc: subRoot,
        strategy: seed.strategy,
        approach: seed.approach,
        emotionalDrift: drift,
        bassSmoothnessScore: bassSmoothness(rootPc, subRoot),
        melodicTriadPreserved: false,
        guitarFriendly: isGuitarFriendlyRoot(subRoot),
      });
    }
  }

  return out.sort((a, b) => {
    return (
      scoreApproachReharmCandidate(b, rootPc, drift, melodyPc) -
      scoreApproachReharmCandidate(a, rootPc, drift, melodyPc)
    );
  });
}

/** Same scalar used to sort {@link generateReharmCandidates} output — for downstream re-ranking (sequence ranker). */
export function scoreReharmCandidate(
  c: ReharmCandidate,
  drift: EmotionalDrift,
  melodyPc: number | null
): number {
  const subRow = ROW_BY_TYPE.get(c.substituteChordTypeId);
  return combinedRank(c, drift, melodyPc, subRow);
}

/** Rank approach-pool candidates with known source root (distance over bass-smoothness). */
export function scoreApproachReharmCandidate(
  c: ReharmCandidate,
  sourceRootPc: number,
  drift: EmotionalDrift,
  melodyPc: number | null
): number {
  const subRow = ROW_BY_TYPE.get(c.substituteChordTypeId);
  if (!subRow) return 0;
  const aff = driftAffinity(c.substituteChordTypeId, drift);
  const dist = chordHarmonicDistance(
    c.originalChordTypeId,
    sourceRootPc,
    c.substituteChordTypeId,
    c.substituteRootPc
  );
  const melodyBonus =
    melodyPc !== null && melodyFitsSubstitution(subRow, c.substituteRootPc, melodyPc) ? 0.12 : 0;
  // Light bass term — contrasting pack must prefer root/set change over same-root colour.
  return aff * 0.35 + dist * 0.55 + c.bassSmoothnessScore * 0.08 + melodyBonus + (c.guitarFriendly ? 0.04 : 0);
}
