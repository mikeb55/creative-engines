/**
 * Tom Verlaine / Television — suspended modal field Song Mode harmony slice (`tv:*` receipts).
 * Static or slowly shifting modal centers, suspended grips, bass displacement under upper shape,
 * melody as by-product of intersecting lines — distinct from Towner ECM / Weber pedal / Fripp process.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Five Verlaine field slice parameters (0–1). */
export interface VerlaineSliceParams {
  modalFieldPersistence: number;
  extensionRetentionRate: number;
  chordSurfaceBias: number;
  bassDisplacementRate: number;
  progressionAvoidance: number;
}

export const DEFAULT_VERLAINE_SLICE_PARAMS: VerlaineSliceParams = {
  modalFieldPersistence: 0.82,
  extensionRetentionRate: 0.68,
  chordSurfaceBias: 0.85,
  bassDisplacementRate: 0.72,
  progressionAvoidance: 0.9,
};

export interface VerlaineFieldSection {
  index: number;
  startBar: number;
  endBar: number;
  modalCenter: string;
  primaryGrip: string;
  riffReturnGrip: string;
  loopChords: readonly string[];
}

export interface VerlaineFieldPlan {
  sections: VerlaineFieldSection[];
  sliceParams: VerlaineSliceParams;
  bassDisplacementBars: number[];
  extensionHoldBars: number[];
  intersectingLineBars: number[];
}

const MODAL_CENTERS = ['Em', 'Am', 'D', 'G'] as const;

const SUSPENDED_FIELD_PALETTE: Readonly<Record<string, readonly string[]>> = {
  Em: ['Em(add9)', 'Esus2', 'Em7sus4', 'Gsus2/E', 'Am(add9)/E', 'Bm/E', 'Dsus2/E', 'Em6/9'],
  Am: ['Am(add9)', 'Asus2', 'Am7sus4', 'Dsus2/A', 'Em(add9)/A', 'Gsus4/A', 'C6/9/A', 'Fadd9/A'],
  D: ['Dsus2', 'Dadd9', 'D6/9', 'Gsus2/D', 'Asus4/D', 'Em7/D', 'Bm(add4)/D', 'Esus4/D'],
  G: ['Gsus2', 'Gadd9', 'G6/9', 'Dsus2/G', 'Em(add9)/G', 'Asus4/G', 'Cadd9/G', 'Bm/G'],
  E: ['Esus2', 'Eadd9', 'E6/9', 'Asus2/E', 'Bsus4/E', 'Gsus2/E', 'Dsus2/E'],
  A: ['Asus2', 'Aadd9', 'A6/9', 'Dsus2/A', 'Esus4/A', 'Gsus2/A', 'Fadd9/A'],
  C: ['Csus2', 'Cadd9', 'C6/9', 'Gsus2/C', 'Fadd9/C', 'Dsus2/C', 'Am(add9)/C'],
};

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function slashBassName(symbol: string): string | undefined {
  if (!symbol.includes('/')) return undefined;
  const tail = symbol.slice(symbol.indexOf('/') + 1).trim();
  const m = tail.match(ROOT_AT_START);
  return m?.[1];
}

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

function looksSuspendedSurface(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /sus|add9|add4|add2|6\/9|6-9|5\+2|power/.test(tl) || symbol.includes('/');
}

function looksAlteredJazzLush(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /alt|b9|#9|#11|b13|maj9|maj13|ø|dim7|7alt/.test(tl);
}

function looksFunctionalTwoFive(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bm7\b|\bm9\b|ø|m7b5/.test(tl) && !/maj|sus|add|6/.test(tl);
}

function looksDominantSeventh(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  return /7|9|11|13|alt/.test(tl);
}

function pickModalCenter(seed: number, sectionIndex: number, tonicPc: number): string {
  const u = seededUnit(seed, sectionIndex, 971101);
  if (u < 0.28) return 'Em';
  if (u < 0.52) return 'Am';
  if (u < 0.74) return 'D';
  const tonicName = pitchClassToSharpName(tonicPc);
  if (MODAL_CENTERS.includes(tonicName as (typeof MODAL_CENTERS)[number])) {
    return tonicName;
  }
  return 'G';
}

function sectionSpanBars(seed: number, sectionIndex: number, modalFieldPersistence: number): number {
  const u = seededUnit(seed, sectionIndex, 971201);
  if (modalFieldPersistence >= 0.8) {
    if (u < 0.22) return 16;
    if (u < 0.42) return 12;
    if (u < 0.62) return 8;
    if (u < 0.82) return 10;
    return 4;
  }
  if (u < 0.4) return 6;
  return 4;
}

function gripForSection(modalCenter: string, seed: number, sectionIndex: number): string {
  const palette = SUSPENDED_FIELD_PALETTE[modalCenter] ?? SUSPENDED_FIELD_PALETTE.Em!;
  const slashed = palette.filter((c) => c.includes('/'));
  const pickFrom = slashed.length >= 2 ? slashed : palette;
  const u = seededUnit(seed, sectionIndex, 971301);
  return pickFrom[Math.floor(u * pickFrom.length) % pickFrom.length]!;
}

function modalLoopForSection(modalCenter: string, primaryGrip: string, seed: number, sectionIndex: number): string[] {
  const palette = SUSPENDED_FIELD_PALETTE[modalCenter] ?? SUSPENDED_FIELD_PALETTE.Em!;
  const u = seededUnit(seed, sectionIndex, 971302);
  const count = u < 0.55 ? 2 : u < 0.85 ? 3 : 1;
  const loop: string[] = [primaryGrip];
  for (let i = 1; i < count; i++) {
    const alt = palette[(palette.indexOf(primaryGrip) + i + 1) % palette.length]!;
    if (!loop.includes(alt)) loop.push(alt);
  }
  return loop;
}

function retainExtensionRecolor(
  held: string,
  modalCenter: string,
  seed: number,
  bar: number
): string {
  const palette = SUSPENDED_FIELD_PALETTE[modalCenter] ?? SUSPENDED_FIELD_PALETTE.Em!;
  const u = seededUnit(seed, bar, 971401);
  const idx = palette.indexOf(held);
  if (idx >= 0) return palette[(idx + 1) % palette.length]!;
  const qual =
    parseChordSymbol(stemOnly(held)).harmonyPart.match(/sus2|sus4|add9|add4|6\/9|6-9/)?.[0] ?? 'add9';
  const root = pitchClassToSharpName((harmonyRootPc(held) ?? 4) + (u < 0.5 ? 0 : 2));
  const bass = slashBassName(held) ?? modalCenter.replace(/m$/, '');
  return `${root}${qual}/${bass}`;
}

function bassDisplaceGrip(grip: string, modalCenter: string, seed: number, bar: number): string {
  const stem = stemOnly(grip);
  const u = seededUnit(seed, bar, 971501);
  const gripPc = harmonyRootPc(stem) ?? noteNameToPitchClass(modalCenter.charAt(0)) ?? 4;
  const centerPc = noteNameToPitchClass(modalCenter.replace(/m$/, '').charAt(0)) ?? gripPc;
  let bassPc = centerPc;
  if (u < 0.28) bassPc = (centerPc + 11) % 12;
  else if (u < 0.52) bassPc = (centerPc + 2) % 12;
  else if (u < 0.74) bassPc = (centerPc + 7) % 12;
  else bassPc = (gripPc + 11) % 12;
  const bassName = pitchClassToSharpName(bassPc);
  if (grip.includes('/')) {
    return `${stem}/${bassName}`;
  }
  return `${stem}/${bassName}`;
}

export function resolveVerlaineSliceParams(genMeta: GenerationMetadata | undefined): VerlaineSliceParams {
  const fromMeta = genMeta?.verlaineSliceParams;
  if (!fromMeta) return { ...DEFAULT_VERLAINE_SLICE_PARAMS };
  const d = DEFAULT_VERLAINE_SLICE_PARAMS;
  return {
    modalFieldPersistence: clamp01(fromMeta.modalFieldPersistence ?? d.modalFieldPersistence),
    extensionRetentionRate: clamp01(fromMeta.extensionRetentionRate ?? d.extensionRetentionRate),
    chordSurfaceBias: clamp01(fromMeta.chordSurfaceBias ?? d.chordSurfaceBias),
    bassDisplacementRate: clamp01(fromMeta.bassDisplacementRate ?? d.bassDisplacementRate),
    progressionAvoidance: clamp01(fromMeta.progressionAvoidance ?? d.progressionAvoidance),
  };
}

export function buildVerlaineFieldPlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: VerlaineSliceParams = DEFAULT_VERLAINE_SLICE_PARAMS
): VerlaineFieldPlan {
  const sections: VerlaineFieldSection[] = [];
  const bassDisplacementBars: number[] = [];
  const extensionHoldBars: number[] = [];
  const intersectingLineBars: number[] = [];
  let bar = 1;
  let idx = 0;

  while (bar <= totalBars) {
    const remaining = totalBars - bar + 1;
    let span = Math.min(sectionSpanBars(seed, idx, params.modalFieldPersistence), remaining);
    if (remaining - span > 0 && remaining - span < 4 && span + (remaining - span) <= 16) {
      span = remaining;
    }
    const endBar = bar + span - 1;
    const modalCenter = pickModalCenter(seed, idx, tonicPc);
    const primaryGrip = gripForSection(modalCenter, seed, idx);
    const loopChords = modalLoopForSection(modalCenter, primaryGrip, seed, idx);

    sections.push({
      index: idx,
      startBar: bar,
      endBar,
      modalCenter,
      primaryGrip,
      riffReturnGrip: primaryGrip,
      loopChords,
    });

    for (let b = bar; b <= endBar; b++) {
      if (seededUnit(seed, b, 971601) < params.bassDisplacementRate * 0.62) {
        bassDisplacementBars.push(b);
      }
      if (seededUnit(seed, b, 971602) < params.extensionRetentionRate * 0.7) {
        extensionHoldBars.push(b);
      }
      if (seededUnit(seed, b, 971603) < 0.48) {
        intersectingLineBars.push(b);
      }
    }

    bar = endBar + 1;
    idx++;
  }

  return {
    sections,
    sliceParams: params,
    bassDisplacementBars,
    extensionHoldBars,
    intersectingLineBars,
  };
}

export function sectionForBar(plan: VerlaineFieldPlan, bar: number): VerlaineFieldSection | undefined {
  return plan.sections.find((s) => bar >= s.startBar && bar <= s.endBar);
}

function loopChordAtBar(sec: VerlaineFieldSection, bar: number): string {
  const rel = bar - sec.startBar;
  if (sec.loopChords.length <= 1) return sec.primaryGrip;
  return sec.loopChords[rel % sec.loopChords.length]!;
}

function matchesMajorTwoFiveOne(
  out: string[],
  iiBar: number,
  tonicPc: number,
  tb: number
): boolean {
  if (iiBar + 2 > tb) return false;
  const rIi = harmonyRootPc(stemOnly(out[iiBar - 1]!));
  const rV = harmonyRootPc(stemOnly(out[iiBar]!));
  const rI = harmonyRootPc(stemOnly(out[iiBar + 1]!));
  if (rIi === undefined || rV === undefined || rI === undefined) return false;
  const iiPc = (tonicPc + 2) % 12;
  const vPc = (tonicPc + 7) % 12;
  return rIi === iiPc && rV === vPc && rI === tonicPc;
}

function looksPopProgressionTelegraph(out: string[], bar: number, tonicPc: number): boolean {
  if (bar + 3 > out.length) return false;
  const roots = [bar, bar + 1, bar + 2, bar + 3].map((b) => harmonyRootPc(stemOnly(out[b - 1]!)));
  if (roots.some((r) => r === undefined)) return false;
  const [i, v, vi, iv] = roots as number[];
  return i === tonicPc && v === (tonicPc + 7) % 12 && vi === (tonicPc + 9) % 12 && iv === (tonicPc + 5) % 12;
}

function applyVerlaineFieldLayers(
  out: string[],
  plan: VerlaineFieldPlan,
  seed: number,
  receipts: string[],
  tonicPc: number | undefined,
  context: CompositionContext
): void {
  const p = plan.sliceParams;
  const tb = out.length;

  for (const sec of plan.sections) {
    receipts.push(
      `tv:section@${sec.startBar}-${sec.endBar}:center=${sec.modalCenter};grip=${sec.primaryGrip};loop=${sec.loopChords.length}`
    );
    let held = sec.primaryGrip;
    let lastRootChangeBar = sec.startBar;

    for (let bar = sec.startBar; bar <= sec.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = loopChordAtBar(sec, bar);

      if (bar === sec.startBar) {
        sym = sec.primaryGrip;
        held = sym;
        receipts.push(`tv:modal_field@${bar}`);
      }

      if (seededUnit(seed, bar, 971701) < p.modalFieldPersistence * 0.78) {
        sym = held;
        receipts.push(`tv:field_hold@${bar}`);
      }

      if (looksAlteredJazzLush(sym) || looksFunctionalTwoFive(sym)) {
        sym = sec.primaryGrip;
        receipts.push(`tv:strip_jazz@${bar}`);
      }

      if (looksDominantSeventh(sym) && seededUnit(seed, bar, 971702) < p.progressionAvoidance) {
        sym = retainExtensionRecolor(held, sec.modalCenter, seed, bar);
        receipts.push(`tv:non_dominant@${bar}`);
      }

      if (seededUnit(seed, bar, 971703) < p.chordSurfaceBias * 0.72 && !looksSuspendedSurface(sym)) {
        sym = sec.primaryGrip;
        receipts.push(`tv:suspended_surface@${bar}`);
      }

      if (
        plan.extensionHoldBars.includes(bar) ||
        seededUnit(seed, bar, 971704) < p.extensionRetentionRate * 0.65
      ) {
        const recolored = retainExtensionRecolor(held, sec.modalCenter, seed, bar);
        if (recolored !== sym) {
          sym = recolored;
          receipts.push(`tv:extension_hold@${bar}`);
        }
      }

      if (
        plan.bassDisplacementBars.includes(bar) ||
        seededUnit(seed, bar, 971705) < p.bassDisplacementRate * 0.58
      ) {
        sym = bassDisplaceGrip(sym, sec.modalCenter, seed, bar);
        receipts.push(`tv:bass_displace@${bar}`);
      }

      if (plan.intersectingLineBars.includes(bar)) {
        receipts.push(`tv:intersecting_line@${bar}`);
      }

      if (bar === sec.endBar) {
        if (seededUnit(seed, bar, 971706) < 0.82) {
          sym = sec.riffReturnGrip;
          receipts.push(`tv:return_riff@${bar}`);
        } else {
          receipts.push(`tv:textural_cutoff@${bar}`);
        }
      }

      const newRoot = harmonyRootPc(stemOnly(sym));
      const heldRoot = harmonyRootPc(stemOnly(held));
      if (newRoot !== undefined && heldRoot !== undefined && newRoot !== heldRoot) {
        if (bar - lastRootChangeBar < 4 && seededUnit(seed, bar, 971707) < p.modalFieldPersistence * 0.7) {
          sym = held;
          receipts.push(`tv:root_penalty@${bar}`);
        } else {
          lastRootChangeBar = bar;
        }
      }

      if (sym !== held && seededUnit(seed, bar, 971708) < p.extensionRetentionRate * 0.45) {
        held = sym;
      }

      out[i] = sym;
    }
  }

  if (tonicPc !== undefined) {
    for (let iiBar = 1; iiBar <= tb - 2; iiBar++) {
      if (!matchesMajorTwoFiveOne(out, iiBar, tonicPc, tb)) continue;
      if (
        isProtectedBar(iiBar, context) ||
        isProtectedBar(iiBar + 1, context) ||
        isProtectedBar(iiBar + 2, context)
      ) {
        continue;
      }
      const sec = sectionForBar(plan, iiBar);
      if (!sec) continue;
      for (let k = 0; k < 3; k++) {
        out[iiBar + k - 1] = sec.primaryGrip;
      }
      receipts.push(`tv:defunctional@${iiBar}`);
    }
    for (let b = 1; b <= tb - 3; b++) {
      if (!looksPopProgressionTelegraph(out, b, tonicPc)) continue;
      if (isProtectedBar(b, context)) continue;
      const sec = sectionForBar(plan, b);
      if (!sec) continue;
      for (let k = 0; k < 4; k++) {
        out[b + k - 1] = sec.loopChords[k % sec.loopChords.length] ?? sec.primaryGrip;
      }
      receipts.push(`tv:pop_strip@${b}`);
    }
  }
}

export interface VerlaineHarmonyAccumulator {
  barsConsidered: number;
  suspendedSurfaceTouches: number;
  bassDisplacementTouches: number;
  extensionHoldTouches: number;
  fieldHoldTouches: number;
  intersectingLineTouches: number;
}

export function createVerlaineHarmonyAccumulator(): VerlaineHarmonyAccumulator {
  return {
    barsConsidered: 0,
    suspendedSurfaceTouches: 0,
    bassDisplacementTouches: 0,
    extensionHoldTouches: 0,
    fieldHoldTouches: 0,
    intersectingLineTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: VerlaineHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  if (looksSuspendedSurface(c)) acc.suspendedSurfaceTouches++;
  if (c.includes('/')) acc.bassDisplacementTouches++;
}

export function accumulateVerlaineHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: VerlaineHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function countMajorTwoFiveOneChains(bars: readonly string[], tonicPc: number): number {
  let count = 0;
  for (let iiBar = 1; iiBar <= bars.length - 2; iiBar++) {
    if (matchesMajorTwoFiveOne([...bars], iiBar, tonicPc, bars.length)) count++;
  }
  return count;
}

export function minVerlaineSectionSpan(plan: VerlaineFieldPlan | undefined): number {
  if (!plan?.sections.length) return 0;
  const spans = plan.sections.map((s) => s.endBar - s.startBar + 1).filter((span) => span >= 4);
  if (!spans.length) return Math.min(...plan.sections.map((s) => s.endBar - s.startBar + 1));
  return Math.min(...spans);
}

export function slashChordRate(bars: readonly string[]): number {
  if (!bars.length) return 0;
  return bars.filter((b) => b.includes('/')).length / bars.length;
}

export function precomputeVerlaineEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 4;
  const params = resolveVerlaineSliceParams(genMeta);
  genMeta.verlaineSliceParams = params;

  const plan = buildVerlaineFieldPlan(seed, tb, tonicPc, params);
  genMeta.verlaineFieldPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `tv:params=mfp:${params.modalFieldPersistence.toFixed(2)};err:${params.extensionRetentionRate.toFixed(2)};csb:${params.chordSurfaceBias.toFixed(2)};bdr:${params.bassDisplacementRate.toFixed(2)};pa:${params.progressionAvoidance.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyVerlaineFieldLayers(out, plan, seed, receipts, tonicPc, context);

  genMeta.verlaineEffectiveHarmonyBars = out;
  genMeta.verlaineDeviceReceipts = receipts;
}

export function finalizeVerlaineMetadata(
  metadata: GenerationMetadata,
  acc: VerlaineHarmonyAccumulator,
  deviceReceipts?: string[]
): void {
  const flat = deviceReceipts ?? [...(metadata.verlaineDeviceReceipts ?? [])];
  const plan = metadata.verlaineFieldPlan;
  const params = metadata.verlaineSliceParams ?? DEFAULT_VERLAINE_SLICE_PARAMS;

  acc.fieldHoldTouches = flat.filter((r) => r.startsWith('tv:field_hold@')).length;
  acc.extensionHoldTouches = flat.filter((r) => r.startsWith('tv:extension_hold@')).length;
  acc.bassDisplacementTouches = flat.filter((r) => r.startsWith('tv:bass_displace@')).length;
  acc.intersectingLineTouches = flat.filter((r) => r.startsWith('tv:intersecting_line@')).length;
  acc.suspendedSurfaceTouches = flat.filter((r) => r.startsWith('tv:suspended_surface@')).length;

  metadata.verlaineDiagnostics = {
    songwriterId: 'verlaine',
    barsConsidered: acc.barsConsidered,
    suspendedSurfaceTouches: acc.suspendedSurfaceTouches,
    bassDisplacementTouches: acc.bassDisplacementTouches,
    extensionHoldTouches: acc.extensionHoldTouches,
    fieldHoldTouches: acc.fieldHoldTouches,
    intersectingLineTouches: acc.intersectingLineTouches,
    minSectionSpan: minVerlaineSectionSpan(plan),
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.verlaineSliceReceipt = [
    'Tom Verlaine (suspended modal field slice)',
    `sections=${plan?.sections.length ?? 0}`,
    `mfp=${params.modalFieldPersistence.toFixed(2)}`,
    `bdr=${params.bassDisplacementRate.toFixed(2)}`,
    `suspended≈${acc.suspendedSurfaceTouches}`,
    `bassDisplace≈${acc.bassDisplacementTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
