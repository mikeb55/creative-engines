import { buildBeatContextLegalityMap } from './beatContextLegalityMap';
import type { TonalityVaultChordRow } from './tonalityVaultDatabase';
import { TONALITY_VAULT_DATABASE } from './tonalityVaultDatabase';
import { selectQuadratonicMelodySpec } from './quadratonicMelodySelector';
import type { ReharmStrategy } from './reharmCandidateEngine';
import { generateReharmCandidates } from './reharmCandidateEngine';
import type { TensionState } from './layerStateMachine';
import { buildGuitarGripLibrary } from '../guitar/guitarGripLibrary';

export type VaultChordRuleSet = {
  chordTypeId: string;
  displayName: string;
  melodicTriadDegrees: number[];
  primaryQuadratonic: number[];
  tensionHierarchy: number[];
  phraseTemplates: (
    | 'triad-sweep'
    | 'quadratonic-enclosure'
    | 'dyad-bounce'
    | 'bebop-insertion'
    | 'tension-climb'
    | 'liquid-resolution'
    | 'quartal'
    | 'modal_pedal'
    | 'side_slip'
  )[];
  beatAffinityProfile: Record<'strong' | 'weak' | 'offbeat', number[]>;
  guitarGripCount: number;
  reharmStrategies: ReharmStrategy[];
  recommendedTensionStates: TensionState[];
};

function buildBeatAffinityProfile(chordTypeId: string): Record<'strong' | 'weak' | 'offbeat', number[]> {
  const m = buildBeatContextLegalityMap(chordTypeId, 0);
  const strong: number[] = [];
  const weak: number[] = [];
  const offbeat: number[] = [];
  for (const [pc, tag] of m) {
    if (tag.layer <= 1) strong.push(pc);
    if (tag.layer >= 1 && tag.layer <= 2) weak.push(pc);
    if (tag.layer >= 2) offbeat.push(pc);
  }
  const uniqSort = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);
  return {
    strong: uniqSort(strong),
    weak: uniqSort(weak),
    offbeat: uniqSort(offbeat),
  };
}

function phraseTemplatesForChord(chordTypeId: string): VaultChordRuleSet['phraseTemplates'] {
  const id = chordTypeId;
  const out = new Set<VaultChordRuleSet['phraseTemplates'][number]>();

  if (id.includes('sus')) {
    out.add('quadratonic-enclosure');
    out.add('dyad-bounce');
    out.add('triad-sweep');
    return [...out];
  }

  if (
    /dim|13b9|7#9|min7b5|#11#9|13#11#9|minMaj13|Maj7#11#9/i.test(id)
  ) {
    out.add('tension-climb');
    out.add('liquid-resolution');
    out.add('bebop-insertion');
    return [...out];
  }

  out.add('triad-sweep');
  out.add('dyad-bounce');
  out.add('quadratonic-enclosure');
  return [...out];
}

/**
 * Vault phrase bias for **`thelonious_monk`** — angular / displaced phrasing; drop smooth liquid-resolution sweep.
 * Maps research labels `angular` / `displaced` onto existing template ids.
 */
export function phraseTemplatesForChordTheloniousMonk(chordTypeId: string): VaultChordRuleSet['phraseTemplates'] {
  const base = phraseTemplatesForChord(chordTypeId);
  const out = new Set(base);
  out.delete('liquid-resolution');
  if (out.has('triad-sweep') && out.size > 2) out.delete('triad-sweep');
  if (!out.has('tension-climb')) out.add('tension-climb');
  if (!out.has('bebop-insertion')) out.add('bebop-insertion');
  if (!out.has('dyad-bounce')) out.add('dyad-bounce');
  if (!out.has('quadratonic-enclosure')) out.add('quadratonic-enclosure');
  return [...out];
}

/** Ascending-thirds / quartal bias — maps research labels onto Vault template ids (no blues sweep). */
export function phraseTemplatesForChordJohnColtrane(chordTypeId: string): VaultChordRuleSet['phraseTemplates'] {
  const base = phraseTemplatesForChord(chordTypeId);
  const out = new Set(base);
  out.delete('liquid-resolution');
  out.delete('triad-sweep');
  out.add('tension-climb');
  out.add('bebop-insertion');
  out.add('quadratonic-enclosure');
  out.add('dyad-bounce');
  return [...out];
}

/** Floating / mediant-chain / wedge_pass vocabulary — no bebop-insertion (`SHORTER_SLICE_PARAMETERS`). */
export function phraseTemplatesForChordWayneShorter(chordTypeId: string): VaultChordRuleSet['phraseTemplates'] {
  const id = chordTypeId;
  const out = new Set<VaultChordRuleSet['phraseTemplates'][number]>();
  out.add('modal_pedal');
  out.add('liquid-resolution');
  out.add('quartal');
  out.add('side_slip');
  out.add('quadratonic-enclosure');
  out.add('tension-climb');
  out.add('dyad-bounce');
  out.delete('bebop-insertion');
  if (id.includes('sus')) {
    out.add('triad-sweep');
  }
  return [...out];
}

/** Quartal / modal pedal / side-slip — no bebop-insertion (`HANCOCK_SLICE_PARAMETERS`). */
export function phraseTemplatesForChordHerbieHancock(chordTypeId: string): VaultChordRuleSet['phraseTemplates'] {
  const id = chordTypeId;
  const out = new Set<VaultChordRuleSet['phraseTemplates'][number]>();
  out.add('quartal');
  out.add('modal_pedal');
  out.add('side_slip');
  out.add('quadratonic-enclosure');
  out.add('dyad-bounce');
  out.delete('bebop-insertion');
  out.delete('liquid-resolution');
  if (id.includes('sus')) {
    out.add('triad-sweep');
  } else if (/dim|13b9|7#9|min7b5|#11#9/i.test(id)) {
    out.add('tension-climb');
  } else {
    out.add('triad-sweep');
  }
  return [...out];
}

function topReharmStrategies(chordTypeId: string, limit: number): ReharmStrategy[] {
  const cands = generateReharmCandidates(chordTypeId, 0, null, 'neutral');
  const freq = new Map<ReharmStrategy, number>();
  for (const c of cands) {
    freq.set(c.strategy, (freq.get(c.strategy) ?? 0) + 1);
  }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked.slice(0, limit).map(([s]) => s);
}

function recommendedTensionStatesFor(chordTypeId: string): TensionState[] {
  const id = chordTypeId;
  if (id.includes('sus')) {
    return ['primary', 'resolve', 'tension', 'recover'];
  }
  if (/dim|13b9|7#9|min7b5|#11#9|13#11#9|minMaj13|Maj7#11#9/i.test(id)) {
    return ['tension', 'chaos', 'recover', 'primary'];
  }
  if (/^Maj7$|^Maj9$|^Maj7#11$/i.test(id) || id === 'Maj7#5') {
    return ['resolve', 'primary', 'recover'];
  }
  return ['primary', 'tension', 'resolve', 'recover'];
}

function buildVaultChordRuleSet(
  row: TonalityVaultChordRow,
  phrasePick: (chordTypeId: string) => VaultChordRuleSet['phraseTemplates']
): VaultChordRuleSet | null {
  const spec = selectQuadratonicMelodySpec(row.chordType);
  if (!spec) return null;

  const melodicTriadDegrees = [
    spec.melodicTriad[0]!.degree,
    spec.melodicTriad[1]!.degree,
    spec.melodicTriad[2]!.degree,
  ].sort((a, b) => a - b);

  const primaryQuadratonic = [
    ...new Set([...melodicTriadDegrees, spec.primaryTension.degree]),
  ].sort((a, b) => a - b);

  const grips = buildGuitarGripLibrary(row.chordType, 0, 'standard');

  return {
    chordTypeId: row.chordType,
    displayName: row.displayName,
    melodicTriadDegrees,
    primaryQuadratonic,
    tensionHierarchy: [...row.tensionHierarchy],
    phraseTemplates: phrasePick(row.chordType),
    beatAffinityProfile: buildBeatAffinityProfile(row.chordType),
    guitarGripCount: grips.length,
    reharmStrategies: topReharmStrategies(row.chordType, 3),
    recommendedTensionStates: recommendedTensionStatesFor(row.chordType),
  };
}

/**
 * One complete ruleset per Tonality Vault chord type (melodic triad, quadratonic, beats, grips, reharm, arc hints).
 * Pass **`songwriterId: 'thelonious_monk'`** / **`'john_coltrane'`** / **`'herbie_hancock'`** / **`'wayne_shorter'`** for composer-specific phrase template bias.
 */
export function buildAllVaultChordRuleSets(opts?: { songwriterId?: string }): VaultChordRuleSet[] {
  const phrasePick =
    opts?.songwriterId === 'thelonious_monk'
      ? phraseTemplatesForChordTheloniousMonk
      : opts?.songwriterId === 'john_coltrane'
        ? phraseTemplatesForChordJohnColtrane
        : opts?.songwriterId === 'herbie_hancock'
          ? phraseTemplatesForChordHerbieHancock
          : opts?.songwriterId === 'wayne_shorter'
            ? phraseTemplatesForChordWayneShorter
            : phraseTemplatesForChord;
  const out: VaultChordRuleSet[] = [];
  for (const row of TONALITY_VAULT_DATABASE) {
    const rs = buildVaultChordRuleSet(row, phrasePick);
    if (rs) out.push(rs);
  }
  return out;
}
