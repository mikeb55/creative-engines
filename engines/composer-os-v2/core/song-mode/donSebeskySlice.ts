/**
 * Don Sebesky — CTI production-orchestra Song Mode harmony slice (`ds:*` receipts).
 * Center-filled, groove-driven, melody-legible reharm under fixed tune contour.
 * Distinct from ECM Schneider / Gil Evans / Kenny Wheeler.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

/** Seven Sebesky slice parameters (0–1). */
export interface DonSebeskySliceParams {
  groovePersistence: number;
  stringProminence: number;
  melodyLegibility: number;
  functionalLegibility: number;
  liftToBlareArc: number;
  soloistSpotlight: number;
  centerFillDensity: number;
}

export const DEFAULT_DON_SEBESKY_SLICE_PARAMS: DonSebeskySliceParams = {
  groovePersistence: 0.78,
  stringProminence: 0.68,
  melodyLegibility: 0.74,
  functionalLegibility: 0.72,
  liftToBlareArc: 0.66,
  soloistSpotlight: 0.7,
  centerFillDensity: 0.65,
};

export type SebeskyProductionSection =
  | 'intro_halo'
  | 'groove_statement'
  | 'solo_frame'
  | 'orchestral_lift'
  | 'reprise_arrival';

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

export function resolveDonSebeskySliceParams(
  genMeta: GenerationMetadata | undefined
): DonSebeskySliceParams {
  const fromMeta = genMeta?.donSebeskySliceParams;
  if (!fromMeta) return { ...DEFAULT_DON_SEBESKY_SLICE_PARAMS };
  const d = DEFAULT_DON_SEBESKY_SLICE_PARAMS;
  return {
    groovePersistence: clamp01(fromMeta.groovePersistence ?? d.groovePersistence),
    stringProminence: clamp01(fromMeta.stringProminence ?? d.stringProminence),
    melodyLegibility: clamp01(fromMeta.melodyLegibility ?? d.melodyLegibility),
    functionalLegibility: clamp01(fromMeta.functionalLegibility ?? d.functionalLegibility),
    liftToBlareArc: clamp01(fromMeta.liftToBlareArc ?? d.liftToBlareArc),
    soloistSpotlight: clamp01(fromMeta.soloistSpotlight ?? d.soloistSpotlight),
    centerFillDensity: clamp01(fromMeta.centerFillDensity ?? d.centerFillDensity),
  };
}

/** Track-format sections: intro halo → groove → solo → lift → reprise. */
export function computeSebeskyProductionSections(
  totalBars: number
): readonly SebeskyProductionSection[] {
  const out: SebeskyProductionSection[] = [];
  const introEnd = Math.min(8, totalBars);
  const grooveEnd = Math.min(introEnd + Math.max(4, Math.floor(totalBars * 0.22)), totalBars);
  const soloEnd = Math.min(grooveEnd + Math.max(6, Math.floor(totalBars * 0.28)), totalBars);
  const liftEnd = Math.min(soloEnd + Math.max(4, Math.floor(totalBars * 0.2)), totalBars);
  for (let b = 1; b <= totalBars; b++) {
    if (b <= introEnd) out.push('intro_halo');
    else if (b <= grooveEnd) out.push('groove_statement');
    else if (b <= soloEnd) out.push('solo_frame');
    else if (b <= liftEnd) out.push('orchestral_lift');
    else out.push('reprise_arrival');
  }
  return out;
}

function ctiFunctionalColour(symbol: string, seed: number, bar: number, functionalLegibility: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const tl = hp.toLowerCase().replace(/\s/g, '');
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 901101);
  if (/maj|Δ/.test(tl) && u < functionalLegibility * 0.55) {
    if (u < 0.22) return `${root}6/9${slash}`;
    if (u < 0.38) return `${root}maj9${slash}`;
    return `${root}maj7#11${slash}`;
  }
  if (/^([a-g][#b]?)?m7|min7/.test(tl) && u < functionalLegibility * 0.5) {
    return `${root}m9${slash}`;
  }
  if (/^([a-g][#b]?)?7|dom/.test(tl) && u < functionalLegibility * 0.52) {
    if (u < 0.2) return `${root}13${slash}`;
    if (u < 0.35) return `${root}7alt${slash}`;
    return `${root}sus9${slash}`;
  }
  return symbol;
}

export function isSongwriterDonSebesky(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'don_sebesky' } {
  return genMeta?.songwriterStyleId === 'don_sebesky';
}

export interface DonSebeskyHarmonyAccumulator {
  barsConsidered: number;
  functionalTouches: number;
  extensionTouches: number;
  stringHaloTouches: number;
  liftTouches: number;
}

export function createDonSebeskyHarmonyAccumulator(): DonSebeskyHarmonyAccumulator {
  return {
    barsConsidered: 0,
    functionalTouches: 0,
    extensionTouches: 0,
    stringHaloTouches: 0,
    liftTouches: 0,
  };
}

function scanChord(chord: string, acc: DonSebeskyHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj9|6\/9|m9|13|#11|sus|alt|add9/.test(t)) acc.extensionTouches++;
  if (/^([a-g][#b]?)(m7|7|maj|Δ)/.test(t) || /ii|v|IV|iii|vi/.test(c)) acc.functionalTouches++;
  if (/maj9|6\/9|maj7#11/.test(t)) acc.stringHaloTouches++;
  if (/13|7alt|tutti|lift/.test(t)) acc.liftTouches++;
}

export function accumulateDonSebeskyHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: DonSebeskyHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

export function finalizeDonSebeskyMetadata(
  metadata: GenerationMetadata,
  acc: DonSebeskyHarmonyAccumulator,
  params: DonSebeskySliceParams
): void {
  const flat = [...(metadata.donSebeskyDeviceReceipts ?? [])];
  metadata.donSebeskyDiagnostics = {
    songwriterId: 'don_sebesky',
    barsConsidered: acc.barsConsidered,
    functionalTouches: acc.functionalTouches,
    extensionTouches: acc.extensionTouches,
    stringHaloTouches: acc.stringHaloTouches,
    liftTouches: acc.liftTouches,
    sliceParams: params,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.donSebeskySliceReceipt = [
    'Don Sebesky (CTI production slice)',
    `functional≈${acc.functionalTouches}`,
    `ext≈${acc.extensionTouches}`,
    `strings≈${acc.stringHaloTouches}`,
    `lifts≈${acc.liftTouches}`,
    `bars=${acc.barsConsidered}`,
    `groove=${params.groovePersistence.toFixed(2)}`,
    `centerFill=${params.centerFillDensity.toFixed(2)}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function precomputeDonSebeskyEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const params = resolveDonSebeskySliceParams(genMeta);
  genMeta.donSebeskySliceParams = params;

  const sections = computeSebeskyProductionSections(tb);
  genMeta.donSebeskyProductionSections = [...sections];

  const receipts: string[] = [];
  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);

  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const before = out[i]!;
    const after = ctiFunctionalColour(before, seed, bar, params.functionalLegibility);
    if (after !== before) {
      out[i] = after;
      receipts.push(`ds:cti_functional_colour@bar${bar}`);
    }
  }

  let liftEventCount = 0;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const section = sections[b - 1]!;
    receipts.push(`ds:section_${section}@bar${b}`);

    if (section === 'intro_halo' && seededUnit(seed, b, 901201) < params.stringProminence) {
      receipts.push(`ds:string_halo_intro@bar${b}`);
    }
    if (b > 8 && seededUnit(seed, b, 901301) < params.groovePersistence) {
      receipts.push(`ds:groove_bed@bar${b}`);
    }
    if (section === 'solo_frame' && seededUnit(seed, b, 901401) < params.soloistSpotlight) {
      receipts.push(`ds:solo_spotlight_gap@bar${b}`);
    }
    if (section === 'orchestral_lift' && seededUnit(seed, b, 901501) < params.liftToBlareArc) {
      const tierU = seededUnit(seed, b, 901502);
      if (tierU < 0.34) receipts.push(`ds:lift_strings@bar${b}`);
      else if (tierU < 0.67) receipts.push(`ds:lift_brass_reeds@bar${b}`);
      else {
        receipts.push(`ds:lift_full_tutti@bar${b}`);
        liftEventCount++;
      }
    }
    if (seededUnit(seed, b, 901601) < params.melodyLegibility) {
      receipts.push(`ds:melody_legible_reharm@bar${b}`);
    }
    if (seededUnit(seed, b, 901701) < params.centerFillDensity) {
      receipts.push(`ds:center_fill_tutti@bar${b}`);
    }
    if (section === 'solo_frame' && seededUnit(seed, b, 901801) < 0.45) {
      receipts.push(`ds:orchestra_answer@bar${b}`);
    }
    if (
      (section === 'groove_statement' || section === 'reprise_arrival') &&
      seededUnit(seed, b, 901901) < 0.44
    ) {
      receipts.push(`ds:harp_gloss_seam@bar${b}`);
    }
  }

  if (liftEventCount < 2) {
    const liftBars = sections
      .map((s, i) => (s === 'orchestral_lift' ? i + 1 : 0))
      .filter((x) => x > 0);
    for (let k = 0; k < 2 - liftEventCount && k < liftBars.length; k++) {
      const bar = liftBars[k]!;
      receipts.push(`ds:lift_full_tutti@bar${bar}`);
      liftEventCount++;
    }
  }

  genMeta.donSebeskyLiftEventCount = liftEventCount;
  genMeta.donSebeskyEffectiveHarmonyBars = out;
  genMeta.donSebeskyDeviceReceipts = receipts;
}
