/**
 * Burt Bacharach Song Mode v1 — deterministic chord-symbol dressing on locked progressions.
 * Active only when primary songwriter resolves to `bacharach`. Non-imitative generative biases.
 *
 * Reference-informed traits (cross-score lead-sheet tradition; not any single arrangement):
 * see `reference/bacharach/BACHARACH_MINING_FINDINGS.md` and `bacharachSongModeRuleBundle.ts`.
 */

import type { CompositionContext } from '../compositionContext';
import type { GenerationMetadata } from '../compositionContext';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import { buildHarmonyPlanFromBars, buildChordSymbolPlanFromBars } from '../harmony/chordProgressionParser';
import { buildLockedHarmonyBarContracts, assertLockedHarmonyContractsToneParity } from '../harmony/harmonyBarContract';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { BACHARACH_SONG_MODE_RULE_BUNDLE_ID } from './bacharachSongModeRuleBundle';
import {
  chordColourDepth,
  sectionKindForBar,
  type SophisticatedPopSectionKind,
} from './sophisticatedPopHarmonyDressing';
import {
  isValidChordShapeNormalized,
  normalizeChordSymbol,
  normalizeLeadSheetChordSpelling,
} from '../../../core/leadSheetChordNormalize';
import { normalizeSongwriterStyleKey } from './songwriterStyleProfiles';

function validateChord(out: string): boolean {
  const t = normalizeChordSymbol(out.trim());
  return isValidChordShapeNormalized(t);
}

function mergeSlash(harmony: string, slash: string | null): string {
  const h = normalizeLeadSheetChordSpelling(harmony.trim());
  const out = slash ? `${h}${slash}` : h;
  return out.replace(/\s+/g, ' ').trim();
}

function sectionBucket(kind: SophisticatedPopSectionKind): 'A' | 'B' | 'R' {
  if (kind === 'B') return 'B';
  if (kind === 'return') return 'R';
  return 'A';
}

/** Naive major-tonic proxy: pitch class of first-bar chord root (pop charts often open on I). */
function tonicPcFromFirstBarChord(firstChord: string | undefined): number | null {
  if (!firstChord?.trim()) return null;
  const h = parseChordSymbol(firstChord).harmonyPart.trim();
  const rm = h.match(/^([A-G](?:#|b)?)/i);
  if (!rm) return null;
  const pc = noteNameToPitchClass(rm[1]);
  return pc === undefined ? null : pc;
}

/** I / IV / vi — relative major roots only (generative proxy; not Roman analysis). */
function isPillarDegreeRelativeToTonic(tonicPc: number | null, root: string, rest: string): boolean {
  if (tonicPc === null) return false;
  const r = noteNameToPitchClass(root);
  if (r === undefined) return false;
  const d = (r - tonicPc + 12) % 12;
  if (d === 0) return true;
  if (d === 5) return true;
  if (d === 9) return /^m(in)?$/i.test(rest) || rest === '';
  return false;
}

/**
 * Dress one bar for Bacharach v1. `bridgeColourBar` is the single bridge slot for mixture/secondary colour.
 * `finalBar` gets optional return cadence lift.
 */
export function dressBacharachChordForBar(args: {
  fullChord: string;
  barIndex1: number;
  totalBars: number;
  seed: number;
  bridgeColourBar: number | null;
  finalBar: number;
  /** Pitch class 0–11 of inferred tonic from progression bar 1 (optional pillar bias). */
  tonicPc: number | null;
}): { chord: string; tags: { bridgeTouch: boolean; returnLift: boolean; secDom: boolean; mixture: boolean } } {
  const { fullChord, barIndex1, totalBars, seed, bridgeColourBar, finalBar, tonicPc } = args;
  const p = parseChordSymbol(fullChord);
  const slash = fullChord.includes('/') ? fullChord.slice(fullChord.indexOf('/')) : '';
  const h = p.harmonyPart.trim();
  const kind = sectionKindForBar(barIndex1, totalBars);
  const bucket = sectionBucket(kind);
  const salt = barIndex1 * 8311 + totalBars * 17;

  const rootRe = /^([A-G][#b]?)/;
  const rm = h.match(rootRe);
  if (!rm) {
    return { chord: fullChord, tags: { bridgeTouch: false, returnLift: false, secDom: false, mixture: false } };
  }
  const root = rm[1];
  const rest = h.slice(rm[0].length).trim();
  const restLow = rest.toLowerCase();

  let candidate: string | null = null;
  let bridgeTouch = false;
  let returnLift = false;
  let secDom = false;
  let mixture = false;

  /** Single controlled bridge colour / secondary-dominant hint (no key analysis — positional clichés only). */
  if (bridgeColourBar === barIndex1 && bucket === 'B') {
    const uBr = seededUnit(seed, 77101, salt);
    if (rest === '' && root === 'F' && uBr < 0.48) {
      candidate = 'Fm7';
      bridgeTouch = true;
      mixture = true;
    } else if (rest === '' && root === 'G' && uBr < 0.52) {
      candidate = 'G7';
      bridgeTouch = true;
      secDom = true;
    } else if (rest === '' && uBr < 0.4) {
      candidate = `${root}maj7`;
      bridgeTouch = true;
    } else if (/^m(in)?$/i.test(rest) && uBr < 0.38) {
      candidate = `${root}m7`;
      bridgeTouch = true;
    }
  }

  /** Return cadence: tiny colour lift on final bar. */
  if (!candidate && barIndex1 === finalBar && bucket === 'R') {
    const uRet = seededUnit(seed, 77102, salt);
    if (rest === '' && uRet < 0.42) {
      candidate = `${root}maj9`;
      returnLift = true;
    }
  }

  /** Section-smooth extensions (I/IV/vi pillars: favour maj7 / m7 when tonic proxy matches). */
  if (!candidate) {
    const u = seededUnit(seed, 77103, salt);
    let soft = bucket === 'A' ? 0.38 : bucket === 'B' ? 0.52 : 0.44;
    const pillar = isPillarDegreeRelativeToTonic(tonicPc, root, rest);
    /** Nudge pillars toward smooth colour on stable sections (reference: sustained pop harmony). */
    if (pillar && (bucket === 'A' || bucket === 'R')) soft += 0.14;
    else if (pillar && bucket === 'B') soft += 0.06;

    if (rest === '') {
      if (u < soft) candidate = `${root}maj7`;
    } else if (/^m(in)?$/i.test(rest)) {
      if (u < soft + 0.12) candidate = `${root}m7`;
    } else if (/^7$/.test(restLow)) {
      if (bucket === 'B' && u < 0.22) {
        candidate = `${root}9`;
        secDom = true;
      }
    }
  }

  if (candidate && validateChord(mergeSlash(candidate, slash))) {
    const out = mergeSlash(candidate, slash);
    return { chord: out, tags: { bridgeTouch, returnLift, secDom, mixture } };
  }

  return { chord: fullChord, tags: { bridgeTouch: false, returnLift: false, secDom: false, mixture: false } };
}

export interface BacharachHarmonyDiagnostics {
  barsConsidered: number;
  barsChanged: number;
  meanColourDepth: number;
  meanColourDepthSectionA: number;
  meanColourDepthSectionB: number;
  sectionContrastDelta: number;
  bridgeColourApplied: boolean;
  returnCadenceLiftApplied: boolean;
  secondaryDominantTouches: number;
  mixtureTouches: number;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Deterministic single bar in section **B** for bridge colour / mixture (one slot per form). */
export function pickBridgeColourBarIndex1(totalBars: number, seed: number): number | null {
  const indices: number[] = [];
  for (let barIndex1 = 1; barIndex1 <= totalBars; barIndex1++) {
    if (sectionKindForBar(barIndex1, totalBars) === 'B') indices.push(barIndex1);
  }
  if (indices.length === 0) return null;
  const pick = Math.floor(seededUnit(seed, 77150, totalBars) * indices.length);
  return indices[Math.min(pick, indices.length - 1)]!;
}

/**
 * Mutates locked harmony when primary songwriter is Bacharach.
 */
export function applyBacharachSongModeHarmonyDressing(context: CompositionContext): void {
  const md = context.generationMetadata as GenerationMetadata;
  if (!md?.songModeHookFirstIdentity) return;
  if (normalizeSongwriterStyleKey(md.songwriterStyleId ?? '') !== 'bacharach') return;

  const bars = context.lockedHarmonyBarsRaw;
  if (!bars?.length) return;

  const totalBars = bars.length;
  const finalBar = totalBars;
  const bridgeColourBar = pickBridgeColourBarIndex1(totalBars, context.seed);
  const tonicPc = tonicPcFromFirstBarChord(bars[0]);

  let bridgeApplied = false;
  let returnLiftApplied = false;
  let secDom = 0;
  let mixture = 0;
  let changed = 0;
  const depths: number[] = [];
  const depthsA: number[] = [];
  const depthsB: number[] = [];

  const newBars = bars.map((c, i) => {
    const barIndex1 = i + 1;
    const r = dressBacharachChordForBar({
      fullChord: c,
      barIndex1,
      totalBars,
      seed: context.seed,
      bridgeColourBar,
      finalBar,
      tonicPc,
    });
    if (r.chord !== c) changed++;
    if (r.tags.bridgeTouch) bridgeApplied = true;
    if (r.tags.returnLift) returnLiftApplied = true;
    if (r.tags.secDom) secDom++;
    if (r.tags.mixture) mixture++;

    const d = chordColourDepth(r.chord);
    depths.push(d);
    const sk = sectionKindForBar(barIndex1, totalBars);
    if (sk === 'A' || sk === 'A_prime' || sk === 'single') depthsA.push(d);
    if (sk === 'B') depthsB.push(d);
    return r.chord;
  });

  context.lockedHarmonyBarsRaw = newBars;
  context.harmony = buildHarmonyPlanFromBars(newBars);
  context.chordSymbolPlan = buildChordSymbolPlanFromBars(newBars);
  context.lockedHarmonyBarContracts = buildLockedHarmonyBarContracts(newBars);
  assertLockedHarmonyContractsToneParity(context.lockedHarmonyBarContracts);

  md.customChordProgressionSummary = newBars.join(' | ');
  md.parsedCustomProgressionBars = [...newBars];
  md.bacharachSongModeRuleBundleId = BACHARACH_SONG_MODE_RULE_BUNDLE_ID;

  const meanA = mean(depthsA.length ? depthsA : depths);
  const meanB = mean(depthsB.length ? depthsB : depths);

  md.bacharachHarmonyDiagnostics = {
    barsConsidered: totalBars,
    barsChanged: changed,
    meanColourDepth: mean(depths),
    meanColourDepthSectionA: meanA,
    meanColourDepthSectionB: meanB,
    sectionContrastDelta: meanB - meanA,
    bridgeColourApplied: bridgeApplied,
    returnCadenceLiftApplied: returnLiftApplied,
    secondaryDominantTouches: secDom,
    mixtureTouches: mixture,
  };
}
