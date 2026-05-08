/**
 * Wayne Shorter — post-bop chromatic harmony Song Mode / duo golden-path slice.
 * Devices d1–d5: neighbor chromaticism, bass displacement, wrong-quality tonic-of-expectation,
 * planned key-center shifts, harmonic plateau pedals — layered on locked harmony.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  bassPitchClassForChordSymbol,
  coarseSectionRoleFromBar,
  inferTonicPitchClassFromBar1,
} from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';
import { SONG_MODE_MOTIF_BAR_17, SONG_MODE_MOTIF_BAR_9 } from '../motif/motifEngineTypes';

/** Target stochastic fire rates among eligible bars (seeded). */
const D1_NON_FUNCTIONAL_NEIGHBOR_RATE = 0.62;
const D2_STEPWISE_BASS_DISPLACEMENT_RATE = 0.34;
const D3_WRONG_QUALITY_RIGHT_ROOT_RATE = 0.70;
const D4_INTERVAL_PLANNED_KEY_SHIFT_RATE = 0.45;
const D5_HARMONIC_PLATEAU_PEDAL_RATE = 0.42;

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

type WayneSectionTag =
  | 'intro'
  | 'outro'
  | 'solo'
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'pre_chorus'
  | 'other';

type PhrasePositionTag = 'phraseStart' | 'phraseMiddle' | 'phraseFinal';

function wayneShorterSectionTag(bar: number, context: CompositionContext): WayneSectionTag {
  const sec = context.form.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
  const raw = (sec?.label ?? '').trim().toLowerCase();
  if (raw.startsWith('intro')) return 'intro';
  if (raw.startsWith('outro') || raw.startsWith('coda')) return 'outro';
  if (raw.startsWith('solo') || raw.startsWith('instrumental')) return 'solo';
  if (raw.startsWith('verse')) return 'verse';
  if (raw.startsWith('chorus')) return 'chorus';
  if (raw.startsWith('bridge')) return 'bridge';
  if (raw.startsWith('pre')) return 'pre_chorus';
  const L = (sec?.label ?? 'A').trim();
  const u = L.toUpperCase();
  if (u.startsWith('A')) return 'verse';
  if (u.startsWith('B')) return 'chorus';
  if (u === 'C' || /^C_\d+$/i.test(L)) return 'bridge';
  return 'other';
}

function phrasePositionFromBar(bar: number): PhrasePositionTag {
  const k = (bar - 1) % 4;
  if (k === 0) return 'phraseStart';
  if (k === 3) return 'phraseFinal';
  return 'phraseMiddle';
}

function isWayneHookBar(bar: number, context: CompositionContext): boolean {
  return isProtectedBar(bar, context) || bar === SONG_MODE_MOTIF_BAR_9 || bar === SONG_MODE_MOTIF_BAR_17;
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
}

function isCadenceArrivalBar(bar: number, out: string[], tonicPc: number | undefined): boolean {
  if (tonicPc === undefined || bar < 2) return false;
  if (phrasePositionFromBar(bar) !== 'phraseFinal') return false;
  const prev = out[bar - 2]!;
  const cur = out[bar - 1]!;
  return looksPlainDominantSeventh(prev) && harmonyRootPc(cur) === tonicPc;
}

function isTurnaroundLikeBar(
  bar: number,
  out: string[],
  tonicPc: number | undefined,
  context: CompositionContext
): boolean {
  if (bar < 2) return false;
  const prev = out[bar - 2]!;
  const cur = out[bar - 1]!;
  if (!looksPlainDominantSeventh(prev)) return false;
  if (phrasePositionFromBar(bar) !== 'phraseFinal') return false;
  if (tonicPc !== undefined && harmonyRootPc(cur) === tonicPc) return true;
  const role = coarseSectionRoleFromBar(bar, context);
  return role === 'verse' || role === 'chorus';
}

/** Shortest interval class between two pitch classes (0–6 semitones). */
function pcIntervalClass(a: number, b: number): number {
  const d = Math.abs(((a - b) % 12) + 12) % 12;
  return Math.min(d, 12 - d);
}

/**
 * d2 eligibility (single bar): slash chord; bass vs chord-root distance 1–2 semitones;
 * quartal / sus; or modal pedal sonority (m7, m9, m11, maj7, maj7#11) — same vocabulary family as the slice pool.
 */
function d2StepwiseDisplacementEligible(symbol: string): boolean {
  const sym = symbol.trim();
  if (!sym) return false;
  if (sym.includes('/')) return true;
  const rootPc = harmonyRootPc(sym);
  const bassPc = bassPitchClassForChordSymbol(sym);
  if (rootPc !== undefined && bassPc !== undefined) {
    const ic = pcIntervalClass(rootPc, bassPc);
    if (ic === 1 || ic === 2) return true;
  }
  const hp = parseChordSymbol(sym).harmonyPart;
  const tl = hp.toLowerCase();
  if (tl.includes('quartal')) return true;
  if (/7sus|13sus|sus4|sus2|\bsus\b/.test(tl)) return true;
  const compact = hp.replace(/\s/g, '');
  if (/^[a-g][#b]?m(7|9|11)(\/|\(|$)/i.test(compact) || /^[a-g][#b]?m(7|9|11)$/i.test(compact)) return true;
  if (/maj7#11/.test(tl) || /^[a-g][#b]?maj7/i.test(compact)) return true;
  if (/m7b5|ø|half\s*-?\s*dim/i.test(tl)) return true;
  if (/7alt|\/alt|\(alt\)|b13|7\(b9|7\(#11|7\(b13/i.test(tl)) return true;
  if (/^[a-g][#b]?(9|11|13)(sus|alt|\(|\/|$)/i.test(compact) || /^[a-g][#b]?(9|11|13)$/i.test(compact)) return true;
  return false;
}

/**
 * d5 plateau pool: m7, maj7, maj7#11, m9, m11, sus, 7sus, quartal (per slice spec).
 */
function chordMatchesD5PlateauHarmonicPool(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (tl.includes('quartal')) return true;
  if (/maj7#11|maj9.*#11|maj7\(.*#11/i.test(tl)) return true;
  if (/\bmaj7\b|maj9|\bΔ\b/.test(tl) && !/mmaj7/.test(tl)) return true;
  if (/\bm7\b|min7|m\(7\)/i.test(tl)) return true;
  if (/\bm9\b|\bm11\b|min9|min11|m\(9\)|m\(11\)/i.test(tl)) return true;
  if (/7sus|13sus|sus4|sus2|\bsus\b/i.test(tl)) return true;
  return false;
}

function d5PlateauSectionEligible(secTag: WayneSectionTag): boolean {
  return secTag === 'intro' || secTag === 'verse' || secTag === 'solo' || secTag === 'bridge';
}

function resolveWayneShorterSliceSourceChordForBar(bar: number, context: CompositionContext): string {
  const tb = context.form.totalBars;
  const locked = context.lockedHarmonyBarsRaw;
  if (locked && locked.length === tb && bar >= 1 && bar <= tb) {
    return locked[bar - 1]!;
  }
  return resolveBarSymbol(context, bar).symbol;
}

function transposeChordRoot(symbol: string, deltaPc: number): string {
  const p = parseChordSymbol(symbol);
  const hp = p.harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const rootPc = noteNameToPitchClass(m[1]);
  if (rootPc === undefined) return symbol;
  const rest = hp.slice(m[1].length);
  const newRoot = pitchClassToSharpName((rootPc + deltaPc + 12) % 12);
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  return `${newRoot}${rest}${slash}`;
}

function deviceCount(barPlan: { d1?: boolean; d2?: boolean; d3?: boolean; d4?: boolean; d5?: boolean }): number {
  let n = 0;
  if (barPlan.d1) n++;
  if (barPlan.d2) n++;
  if (barPlan.d3) n++;
  if (barPlan.d4) n++;
  if (barPlan.d5) n++;
  return n;
}

function mutualExclusiveDevices(
  barPlan: { d1?: boolean; d2?: boolean; d3?: boolean; d4?: boolean; d5?: boolean },
  secTag: WayneSectionTag
): void {
  if (barPlan.d4) {
    delete barPlan.d1;
    delete barPlan.d2;
    delete barPlan.d3;
    delete barPlan.d5;
    return;
  }
  if (barPlan.d5 && barPlan.d2) {
    // d5 plateau wins on its natural sections (intro/solo/bridge); d2 bass displacement wins elsewhere
    if (secTag === 'intro' || secTag === 'solo' || secTag === 'bridge') {
      delete barPlan.d2;
    } else {
      delete barPlan.d5;
    }
  }
  if (barPlan.d5 && barPlan.d3) {
    delete barPlan.d3;
  }
  const dropOrder: Array<'d1' | 'd3' | 'd2' | 'd5'> = ['d1', 'd3', 'd2', 'd5'];
  while (deviceCount(barPlan) > 2) {
    const id = dropOrder.find((k) => barPlan[k] === true);
    if (!id) break;
    delete barPlan[id];
  }
}

export interface WayneShorterHarmonyAccumulator {
  barsConsidered: number;
  alteredDominantTouches: number;
  slashPedalTouches: number;
  quartalOrSusTouches: number;
  minorColourTouches: number;
}

export function createWayneShorterHarmonyAccumulator(): WayneShorterHarmonyAccumulator {
  return {
    barsConsidered: 0,
    alteredDominantTouches: 0,
    slashPedalTouches: 0,
    quartalOrSusTouches: 0,
    minorColourTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: WayneShorterHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const tl = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/alt|7#9|7b5/i.test(tl)) acc.alteredDominantTouches++;
  if (/\/[a-g]/i.test(c)) acc.slashPedalTouches++;
  if (/quartal|sus|13sus/.test(tl)) acc.quartalOrSusTouches++;
  if (/^[a-g][#b]?m(?!aj)/i.test(parseChordSymbol(c).harmonyPart)) acc.minorColourTouches++;
}

export function accumulateWayneShorterHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: WayneShorterHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface WayneShorterDeviceReceipts {
  deviceReceipts: string[];
}

export interface WayneShorterAntiElaborationGuards {
  neighborClamp: number;
  plateauClamp: number;
}

export interface WayneShorterEligibilityStats {
  totalBars: number;
  d1EligibleBars: number;
  d2EligibleBars: number;
  d3EligibleBars: number;
  d4EligibleBars: number;
  d5EligibleBars: number;
  targetMeanFiresD1: number;
  targetMeanFiresD2: number;
  targetMeanFiresD3: number;
  targetMeanFiresD4: number;
  targetMeanFiresD5: number;
}

export function isSongwriterWayneShorter(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'wayne_shorter' } {
  return genMeta?.songwriterStyleId === 'wayne_shorter';
}

export function countWayneShorterDeviceFiresFromReceipts(receipts: readonly string[]): {
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
} {
  const out = { d1: 0, d2: 0, d3: 0, d4: 0, d5: 0 };
  for (const r of receipts) {
    if (r.includes(':d1:')) out.d1++;
    else if (r.includes(':d2:')) out.d2++;
    else if (r.includes(':d3:')) out.d3++;
    else if (r.includes(':d4:')) out.d4++;
    else if (r.includes(':d5:')) out.d5++;
  }
  return out;
}

function applyNeighborChord(symbol: string, seed: number, bar: number, dirOverride?: 1 | -1): string {
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const dir = dirOverride ?? (seededUnit(seed, bar, 80101) < 0.5 ? 1 : -1);
  const nr = (r + dir + 12) % 12;
  const q = seededUnit(seed, bar, 80102);
  const tail = q < 0.34 ? 'm9' : q < 0.67 ? 'maj7#11' : 'm11';
  return `${pitchClassToSharpName(nr)}${tail}`;
}

function applySlashBassStep(symbol: string, seed: number, bar: number): string {
  const step = seededUnit(seed, bar, 80201) < 0.5 ? 1 : 2;
  const sign = seededUnit(seed, bar, 80202) < 0.5 ? -1 : 1;
  if (symbol.includes('/')) {
    const slashIdx = symbol.indexOf('/');
    const upper = symbol.slice(0, slashIdx).trim();
    const bassStr = symbol.slice(slashIdx + 1).trim();
    const bm = bassStr.match(ROOT_AT_START);
    if (!bm?.[1]) return symbol;
    const bpc = noteNameToPitchClass(bm[1]);
    if (bpc === undefined) return symbol;
    const nb = (bpc + sign * step + 12) % 12;
    return `${upper}/${pitchClassToSharpName(nb)}`;
  }
  // Non-slash: add stepwise bass displacement from the chord root
  const rootPc = harmonyRootPc(symbol);
  if (rootPc === undefined) return symbol;
  const bassPc = (rootPc + sign * step + 12) % 12;
  return `${symbol}/${pitchClassToSharpName(bassPc)}`;
}

function applyWrongQualityDominant(symbol: string, seed: number, bar: number): string {
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  return seededUnit(seed, bar, 80301) < 0.55 ? `${pitchClassToSharpName(r)}m9` : `${pitchClassToSharpName(r)}maj7#11`;
}

function applyPlateauPedal(symbol: string, prevSymbol: string, seed: number, bar: number): string {
  const pedalPc = bassPitchClassForChordSymbol(prevSymbol);
  if (pedalPc === undefined) return symbol;
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const upper =
    seededUnit(seed, bar, 80501) < 0.5
      ? `${pitchClassToSharpName(r)}m11`
      : `${pitchClassToSharpName(r)}maj7#11`;
  return `${upper}/${pitchClassToSharpName(pedalPc)}`;
}

export function precomputeWayneShorterEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: WayneShorterDeviceReceipts = { deviceReceipts: [] };
  const guards: WayneShorterAntiElaborationGuards = { neighborClamp: 0, plateauClamp: 0 };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveWayneShorterSliceSourceChordForBar(b, context));
  }

  let d1E = 0;
  let d2E = 0;
  let d3E = 0;
  let d4E = 0;
  let d5E = 0;

  const plan: Array<{ d1?: boolean; d2?: boolean; d3?: boolean; d4?: boolean; d5?: boolean }> = Array.from({
    length: tb,
  }, () => ({}));

  for (let b = 1; b <= tb; b++) {
    const phrasePos = phrasePositionFromBar(b);
    const hook = isWayneHookBar(b, context);
    const secTag = wayneShorterSectionTag(b, context);

    const d1Base =
      phrasePos === 'phraseMiddle' &&
      !hook &&
      !isCadenceArrivalBar(b, raw, tonicPc);

    if (d1Base) d1E++;

    const d2Ok = !hook && d2StepwiseDisplacementEligible(raw[b - 1]!);
    if (d2Ok) d2E++;

    let d3Ok =
      !hook &&
      b >= 2 &&
      (looksPlainDominantSeventh(raw[b - 2]!) || looksPlainDominantSeventh(raw[b - 1]!));
    if (d3Ok) {
      const role = coarseSectionRoleFromBar(b, context);
      d3Ok = role === 'verse' || role === 'chorus' || role === 'bridge';
    }
    if (d3Ok) d3E++;

    let d4Ok = false;
    if (!hook && b > 1) {
      const startsSection = context.form.sections.some((s) => s.startBar === b);
      const bridgeStart = secTag === 'bridge' && startsSection;
      const sectionJoin = startsSection && b > 2;
      const latePhrase = (b - 1) % 8 === 6 && (secTag === 'verse' || secTag === 'chorus');
      d4Ok = Boolean(bridgeStart || sectionJoin || latePhrase);
    }
    if (d4Ok) d4E++;

    const d5Turnaround = isTurnaroundLikeBar(b, raw, tonicPc, context);
    const d5Ok =
      !hook &&
      d5PlateauSectionEligible(secTag) &&
      chordMatchesD5PlateauHarmonicPool(raw[b - 1]!) &&
      !d5Turnaround;
    if (d5Ok) d5E++;

    if (d1Base && seededUnit(seed, b, 81101) < D1_NON_FUNCTIONAL_NEIGHBOR_RATE) plan[b - 1]!.d1 = true;
    if (d2Ok && seededUnit(seed, b, 81201) < D2_STEPWISE_BASS_DISPLACEMENT_RATE) plan[b - 1]!.d2 = true;
    if (d3Ok && seededUnit(seed, b, 81301) < D3_WRONG_QUALITY_RIGHT_ROOT_RATE) plan[b - 1]!.d3 = true;
    if (d4Ok && seededUnit(seed, b, 81401) < D4_INTERVAL_PLANNED_KEY_SHIFT_RATE) plan[b - 1]!.d4 = true;
    if (d5Ok && seededUnit(seed, b, 81501) < D5_HARMONIC_PLATEAU_PEDAL_RATE) plan[b - 1]!.d5 = true;

    mutualExclusiveDevices(plan[b - 1]!, secTag);
  }

  const out = [...raw];

  const d4Consumed = new Set<number>();
  for (let b = 1; b <= tb; b++) {
    const p = plan[b - 1]!;
    if (!p.d4 || d4Consumed.has(b)) continue;
    const choices = [-5, -4, -3, 3, 4, 5];
    const delta = choices[Math.floor(seededUnit(seed, b, 81402) * choices.length)]!;
    out[b - 1] = transposeChordRoot(out[b - 1]!, delta);
    if (b < tb) out[b] = transposeChordRoot(out[b]!, delta);
    receipts.deviceReceipts.push(`ws:d4:intervalPlannedKeyShift@bar${b}#v12`);
    d4Consumed.add(b);
    if (b < tb) d4Consumed.add(b + 1);
  }

  for (let b = 1; b <= tb; b++) {
    const p = plan[b - 1]!;
    if (p.d4) continue;
    if (p.d5) {
      const prevSym = b > 1 ? out[b - 2]! : out[b - 1]!;
      const plateau = applyPlateauPedal(out[b - 1]!, prevSym, seed, b);
      if (plateau !== out[b - 1]) {
        out[b - 1] = plateau;
        receipts.deviceReceipts.push(`ws:d5:harmonicPlateauPedal@bar${b}#v2`);
      } else {
        guards.plateauClamp++;
      }
    }
    if (p.d2 && !p.d5) {
      const stepped = applySlashBassStep(out[b - 1]!, seed, b);
      if (stepped !== out[b - 1]) {
        out[b - 1] = stepped;
        receipts.deviceReceipts.push(`ws:d2:stepwiseBassDisplacement@bar${b}#v2`);
      }
    }
    if (p.d3 && !p.d5 && looksPlainDominantSeventh(raw[b - 1]!)) {
      out[b - 1] = applyWrongQualityDominant(raw[b - 1]!, seed, b);
      receipts.deviceReceipts.push(`ws:d3:wrongQualityRightRoot@bar${b}#v1`);
    }
    if (p.d1) {
      const prevSym = b > 1 ? out[b - 2]! : undefined;
      const seededDir: 1 | -1 = seededUnit(seed, b, 80101) < 0.5 ? 1 : -1;
      let next = applyNeighborChord(out[b - 1]!, seed, b, seededDir);
      if (prevSym && harmonyRootPc(next) === harmonyRootPc(prevSym)) {
        // Opposite chromatic direction always avoids the collision (two neighbors are 2 semitones apart)
        next = applyNeighborChord(out[b - 1]!, seed, b, (-seededDir) as 1 | -1);
      }
      if (prevSym && harmonyRootPc(next) === harmonyRootPc(prevSym)) {
        guards.neighborClamp++;
      } else {
        out[b - 1] = next;
        receipts.deviceReceipts.push(`ws:d1:nonFunctionalNeighbor@bar${b}#v1`);
      }
    }
  }

  genMeta.wayneShorterEffectiveHarmonyBars = out;
  genMeta.wayneShorterDeviceReceipts = receipts.deviceReceipts;
  genMeta.wayneShorterAntiElaborationGuards = guards;
  genMeta.wayneShorterEligibilityStats = {
    totalBars: tb,
    d1EligibleBars: d1E,
    d2EligibleBars: d2E,
    d3EligibleBars: d3E,
    d4EligibleBars: d4E,
    d5EligibleBars: d5E,
    targetMeanFiresD1: d1E * D1_NON_FUNCTIONAL_NEIGHBOR_RATE,
    targetMeanFiresD2: d2E * D2_STEPWISE_BASS_DISPLACEMENT_RATE,
    targetMeanFiresD3: d3E * D3_WRONG_QUALITY_RIGHT_ROOT_RATE,
    targetMeanFiresD4: d4E * D4_INTERVAL_PLANNED_KEY_SHIFT_RATE,
    targetMeanFiresD5: d5E * D5_HARMONIC_PLATEAU_PEDAL_RATE,
  };
}

export function finalizeWayneShorterMetadata(metadata: GenerationMetadata, acc: WayneShorterHarmonyAccumulator): void {
  const flat = [...(metadata.wayneShorterDeviceReceipts ?? [])];
  const g = metadata.wayneShorterAntiElaborationGuards ?? { neighborClamp: 0, plateauClamp: 0 };
  const guardTotal = g.neighborClamp + g.plateauClamp;
  const tb = Math.max(1, acc.barsConsidered);
  const d = {
    songwriterId: 'wayne_shorter' as const,
    barsConsidered: acc.barsConsidered,
    alteredDominantHitRate: acc.alteredDominantTouches / tb,
    slashPedalHitRate: acc.slashPedalTouches / tb,
    quartalSusHitRate: acc.quartalOrSusTouches / tb,
    minorColourHitRate: acc.minorColourTouches / tb,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Wayne Shorter (post-bop slice): altDom≈${acc.alteredDominantTouches}`,
    `slash≈${acc.slashPedalTouches}`,
    `quartal/sus≈${acc.quartalOrSusTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.wayneShorterDiagnostics = { ...d };
  metadata.wayneShorterSliceReceipt = receipt;
}
