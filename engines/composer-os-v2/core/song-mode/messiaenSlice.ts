/**
 * Olivier Messiaen — limited transposition / colour harmony slice (`om:*` receipts).
 * Slow harmonic rhythm, cadential avoidance, mode-colour metadata (research stub colour map).
 */

import type { CompositionContext, GenerationMetadata, MessiaenPeriodMode } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';

export type { MessiaenPeriodMode } from '../compositionContext';

export type MessiaenEpisodeType =
  | 'colour_field'
  | 'birdsong_layer'
  | 'rhythmic_canon'
  | 'mode_statement'
  | 'transcendence_arc';

/** Episode labels used in receipts / manifests — not exhaustively enforced in score layer. */
export const MESSIAEN_SLICE_PARAMETERS = {
  harmonicRhythmMinBars: 2,
  modeRegisterChordMinimum: 3,
  transcendenceTailBars: 2,
  rhythmicCanonPrimesSixteenths: [17, 19, 23] as const,
} as const;

const ROOT_AT_START = /^([A-G](?:#|b)?)/i;

const BIRDSONG_SPECIES = ['blackbird', 'nightingale', 'skylark', 'finch', 'thrush', 'warbler'] as const;

/** Research stub — Messiaen colour associations (Messiaen-colour-engine not wired to TS yet). */
export const MESSIAEN_MODE_COLOUR_TAG: Record<string, string> = {
  mode2_t1: 'violet-blue',
  mode2_t2: 'gold-brown',
  mode2_t3: 'green',
  mode3_t1: 'orange-gold',
  mode3_t2: 'grey-mauve-gold',
  mode3_t3: 'blue-green',
  mode3_t4: 'orange-red',
  mode4_t1: 'grey-gold-blue',
  mode6_t1: 'grey-gold-orange',
  birdsong_chromatic: 'iridescent-chromatic',
};

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function harmonyRootPc(sym: string): number | undefined {
  const hp = parseChordSymbol(sym).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function isMessiaenDominantSurface(sym: string): boolean {
  const hp = parseChordSymbol(sym).harmonyPart.toLowerCase().replace(/\s/g, '');
  if (/dim|ø|maj|mmaj|Δ|aug|sus|^n\.c\.|^nc$/i.test(sym)) return false;
  if (/m7|m9|m11|maj7|mmaj/.test(hp)) return false;
  return /\d/.test(hp) && /7|9|11|13|alt/.test(hp);
}

function antiCadenceColour(sym: string, seed: number, bar: number): string {
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const pc = harmonyRootPc(sym);
  if (pc === undefined) return sym;
  const altPc = (pc + 6) % 12;
  const altRoot = roots[altPc]!;
  if (seededUnit(seed, bar, 99102) < 0.45) return `${altRoot}maj7(#11)`;
  return `${altRoot}dim7`;
}

function resolveChordPoolTier(seed: number): 0 | 1 | 2 {
  return (Math.abs(seed) % 3) as 0 | 1 | 2;
}

function resolveActiveModeKey(seed: number, tier: 0 | 1 | 2): string {
  if (tier === 0) {
    const tr = (Math.abs(seed) % 3) + 1;
    return `mode2_t${tr}`;
  }
  if (tier === 1) {
    const tr = (Math.abs(seed >> 3) % 4) + 1;
    return `mode3_t${tr}`;
  }
  return 'birdsong_chromatic';
}

export function resolveMessiaenColourTag(activeModeKey: string): string {
  return MESSIAEN_MODE_COLOUR_TAG[activeModeKey] ?? 'grey-mauve-gold';
}

export function resolveMessiaenPeriodMode(
  context: CompositionContext,
  genMeta: GenerationMetadata & Record<string, unknown>
): MessiaenPeriodMode {
  const ctx = context.messiaenPeriodMode;
  if (ctx === 'early_messiaen' || ctx === 'middle_messiaen' || ctx === 'late_messiaen') return ctx;
  const meta = genMeta.messiaenPeriodMode as MessiaenPeriodMode | undefined;
  if (meta === 'early_messiaen' || meta === 'middle_messiaen' || meta === 'late_messiaen') return meta;
  const roll = Math.abs(context.seed) % 3;
  if (roll === 0) return 'early_messiaen';
  if (roll === 1) return 'middle_messiaen';
  return 'late_messiaen';
}

function periodModeShort(p: MessiaenPeriodMode): 'early' | 'middle' | 'late' {
  if (p === 'early_messiaen') return 'early';
  if (p === 'middle_messiaen') return 'middle';
  return 'late';
}

export function isSongwriterMessiaen(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'messiaen' } {
  return genMeta?.songwriterStyleId === 'messiaen';
}

export interface MessiaenHarmonyAccumulator {
  barsConsidered: number;
  slowRhythmReceiptTouches: number;
  cadenceBlockTouches: number;
  colourFieldTouches: number;
}

export function createMessiaenHarmonyAccumulator(): MessiaenHarmonyAccumulator {
  return {
    barsConsidered: 0,
    slowRhythmReceiptTouches: 0,
    cadenceBlockTouches: 0,
    colourFieldTouches: 0,
  };
}

export function accumulateMessiaenHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: MessiaenHarmonyAccumulator
): void {
  const c = currentChord.trim();
  if (!c) return;
  acc.barsConsidered++;
}

export function precomputeMessiaenEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const minHold = MESSIAEN_SLICE_PARAMETERS.harmonicRhythmMinBars;

  const metaPeriod = genMeta.messiaenPeriodMode as MessiaenPeriodMode | undefined;
  if (metaPeriod === 'early_messiaen' || metaPeriod === 'middle_messiaen' || metaPeriod === 'late_messiaen') {
    context.messiaenPeriodMode = metaPeriod;
  }

  const periodResolved = resolveMessiaenPeriodMode(context, genMeta);
  genMeta.messiaenPeriodModeResolved = periodResolved;
  if (
    genMeta.messiaenPeriodMode !== 'early_messiaen' &&
    genMeta.messiaenPeriodMode !== 'middle_messiaen' &&
    genMeta.messiaenPeriodMode !== 'late_messiaen'
  ) {
    genMeta.messiaenPeriodMode = periodResolved;
  }
  context.messiaenPeriodMode = periodResolved;
  genMeta.periodMode = periodModeShort(periodResolved);

  const tier = resolveChordPoolTier(seed);
  const activeMode = resolveActiveModeKey(seed, tier);
  genMeta.activeMode = activeMode;
  genMeta.colourTag = resolveMessiaenColourTag(activeMode);
  genMeta.birdsongSpecies = BIRDSONG_SPECIES[Math.abs(seed >> 5) % BIRDSONG_SPECIES.length]!;
  genMeta.messiaenHarmonicRhythmMinBars = minHold;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  const out = [...raw];

  for (let segStart = 1; segStart <= tb; segStart += minHold) {
    const anchorBar = segStart;
    if (anchorBar > tb) break;
    let sym = raw[anchorBar - 1] ?? 'C';
    if (!isProtectedBar(anchorBar, context)) {
      receipts.push(`om:slow_spine@bars${anchorBar}-${Math.min(anchorBar + minHold - 1, tb)}`);
    }
    for (let k = 0; k < minHold && segStart + k <= tb; k++) {
      const b = segStart + k;
      if (isProtectedBar(b, context)) {
        out[b - 1] = raw[b - 1]!;
        continue;
      }
      out[b - 1] = sym;
      if (k > 0) receipts.push(`om:colour_hold@bar${b}`);
    }
  }

  for (let b = 2; b <= tb; b++) {
    const prev = out[b - 2]!;
    let curr = out[b - 1]!;
    if (!isProtectedBar(b, context) && isMessiaenDominantSurface(prev)) {
      const pPc = harmonyRootPc(prev);
      const cPc = harmonyRootPc(curr);
      if (pPc !== undefined && cPc !== undefined && (pPc + 5) % 12 === cPc) {
        curr = antiCadenceColour(curr, seed, b);
        out[b - 1] = curr;
        receipts.push(`om:no_functional_resolution@bar${b}`);
      }
    }
  }

  let chordChanges = 0;
  let lastSym = '';
  for (let i = 0; i < out.length; i++) {
    const s = out[i]!;
    if (s !== lastSym) {
      chordChanges++;
      lastSym = s;
    }
  }
  if (chordChanges >= MESSIAEN_SLICE_PARAMETERS.modeRegisterChordMinimum) {
    receipts.push(`om:mode_register_eligible@changes${chordChanges}`);
  }

  const primes = MESSIAEN_SLICE_PARAMETERS.rhythmicCanonPrimesSixteenths;
  receipts.push(`om:rhythmic_canon@prime${primes[seed % primes.length]}`);

  for (let b = 1; b <= tb; b++) {
    const roll = seededUnit(seed, b, 77101);
    let ep: MessiaenEpisodeType =
      roll < 0.28
        ? 'colour_field'
        : roll < 0.48
          ? 'birdsong_layer'
          : roll < 0.68
            ? 'rhythmic_canon'
            : roll < 0.86
              ? 'mode_statement'
              : 'transcendence_arc';
    if (periodResolved === 'middle_messiaen' && roll < 0.55) ep = 'birdsong_layer';
    if (periodResolved === 'late_messiaen' && roll < 0.72) ep = 'birdsong_layer';
    receipts.push(`om:episode@${ep}@bar${b}`);
  }

  const tail = MESSIAEN_SLICE_PARAMETERS.transcendenceTailBars;
  if (tb >= tail) {
    const sustain = 'Bmaj7(add9)/F#';
    for (let b = tb - tail + 1; b <= tb; b++) {
      if (!isProtectedBar(b, context)) {
        out[b - 1] = sustain;
      }
    }
    receipts.push(`om:transcendence_arc@tail${tail}`);
  }

  genMeta.messiaenEffectiveHarmonyBars = out;
  genMeta.messiaenDeviceReceipts = receipts;
}

export function finalizeMessiaenMetadata(metadata: GenerationMetadata, acc: MessiaenHarmonyAccumulator): void {
  const flat = [...(metadata.messiaenDeviceReceipts ?? [])];
  const sp = MESSIAEN_SLICE_PARAMETERS;
  metadata.messiaenDiagnostics = {
    songwriterId: 'messiaen',
    barsConsidered: acc.barsConsidered,
    slowRhythmTouches: flat.filter((r) => r.includes('om:slow_spine') || r.includes('om:colour_hold')).length,
    cadenceBlocks: flat.filter((r) => r.includes('om:no_functional_resolution')).length,
    episodeReceipts: flat.filter((r) => r.startsWith('om:episode@')).length,
    sliceParameters: {
      harmonicRhythmMinBars: sp.harmonicRhythmMinBars,
      modeRegisterChordMinimum: sp.modeRegisterChordMinimum,
    },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.messiaenSliceReceipt = [
    `Messiaen (modes / colour slice): period=${metadata.periodMode ?? '?'}; activeMode=${String(metadata.activeMode ?? '')}`,
    `colourTag=${String(metadata.colourTag ?? '')}`,
    `birdsongSpecies=${String(metadata.birdsongSpecies ?? '')}`,
    flat.length ? `devices=${flat.length}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
