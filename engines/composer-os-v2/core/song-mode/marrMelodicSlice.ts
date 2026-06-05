/**
 * Johnny Marr — melodic rhythm guitar Song Mode harmony slice (`jma:*` receipts).
 * Partial voicings, open-string resonance, top-note melody in arpeggiated figures —
 * rhythm and melody integrated; not accompaniment plus separate lead.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Five Marr melodic-rhythm slice parameters (0–1). */
export interface MarrSliceParams {
  partialVoicingRate: number;
  topNoteMelodyWeight: number;
  openStringResonance: number;
  addNoteHarmonyBias: number;
  pendulumSubdivision: number;
}

export const DEFAULT_MARR_SLICE_PARAMS: MarrSliceParams = {
  partialVoicingRate: 0.88,
  topNoteMelodyWeight: 0.85,
  openStringResonance: 0.8,
  addNoteHarmonyBias: 0.82,
  pendulumSubdivision: 0.83,
};

export interface MarrMelodicSection {
  index: number;
  startBar: number;
  endBar: number;
  keyCenter: string;
  primaryGrip: string;
  topNoteMotif: readonly string[];
  figureLoop: readonly string[];
  capoZone: 'low' | 'mid' | 'high';
}

export interface MarrMelodicPlan {
  sections: MarrMelodicSection[];
  sliceParams: MarrSliceParams;
  partialVoicingBars: number[];
  openStringBars: number[];
  topNoteMelodyBars: number[];
  addNoteHarmonyBars: number[];
  pendulumSubdivisionBars: number[];
  modalAmbiguityBars: number[];
  capoOpenShapeBars: number[];
}

const KEY_CENTERS = ['D', 'G', 'A', 'E', 'C'] as const;

/** Marr characteristic voicing palette — partial grips, add-note surfaces, slash bass. */
const MARR_VOICING_PALETTE: Readonly<Record<string, readonly string[]>> = {
  D: ['Dadd9', 'Dsus2', 'Dsus4', 'D6/9', 'Dadd4/A', 'Gmaj7', 'A6', 'Em(add9)/D', 'G6/D'],
  G: ['Gmaj7', 'Gsus2', 'G6/9', 'Gadd9', 'G6', 'Dadd4/A', 'Cadd9/G', 'A6/G', 'Em(add9)/G'],
  A: ['A6', 'Asus2', 'Aadd9', 'Asus4', 'Amaj7', 'Dadd4/A', 'Emaj7', 'F9/A', 'G6/A'],
  E: ['Emaj7', 'Esus2', 'Eadd9', 'E6/9', 'E/G#', 'C7/E', 'B/E', 'A6/E', 'Bbadd#11/E'],
  C: ['C7', 'C6/9', 'Cadd9', 'Csus2', 'F9', 'G6/C', 'Emaj7/C', 'Dsus2/C'],
  F: ['F9', 'Fadd9', 'Fsus2', 'F6/9', 'Bbadd#11/E', 'C7/F', 'G6/F'],
  Bb: ['Bbadd#11/E', 'F9', 'Gsus2/Bb', 'Eb6/Bb'],
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

function looksAddNoteHarmonySurface(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /add9|add4|add2|sus2|sus4|maj7|6\/9|6-9|6(?!\d)|9(?!\d)|#11/.test(tl) || symbol.includes('/');
}

function looksPlainTriad(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/add|sus|maj7|6|9|7|#11|\/|power|5/.test(tl)) return false;
  return /^[a-g][#b]?m?$/.test(tl) || /^[a-g][#b]?maj$/.test(tl);
}

function looksFullBarreBlock(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /^[a-g][#b]?$/.test(tl) && !symbol.includes('/');
}

function looksJazzColorStab(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /maj9|maj13|m9|m11|13|alt|#9|#11|b13|ø|dim7|7alt/.test(tl);
}

function looksDominantCadence(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø/.test(tl)) return false;
  return /^[a-g][#b]?7$/.test(tl) || /^[a-g][#b]?9$/.test(tl);
}

function looksOpenStringPedal(symbol: string): boolean {
  const tl = symbol.toLowerCase();
  return /\/[eb](?:\b|$)|\/[a-g#b]+/.test(tl) || /bbadd#11\/e/.test(tl);
}

function pickKeyCenter(seed: number, sectionIndex: number, tonicPc: number): string {
  const u = seededUnit(seed, sectionIndex, 981101);
  if (u < 0.22) return 'D';
  if (u < 0.42) return 'G';
  if (u < 0.52) return 'A';
  if (u < 0.72) return 'E';
  const tonicName = pitchClassToSharpName(tonicPc);
  if (KEY_CENTERS.includes(tonicName as (typeof KEY_CENTERS)[number])) {
    return tonicName;
  }
  return 'C';
}

function pickCapoZone(seed: number, sectionIndex: number): 'low' | 'mid' | 'high' {
  const u = seededUnit(seed, sectionIndex, 981102);
  if (u < 0.38) return 'low';
  if (u < 0.72) return 'mid';
  return 'high';
}

function sectionSpanBars(seed: number, sectionIndex: number): number {
  const u = seededUnit(seed, sectionIndex, 981201);
  if (u < 0.35) return 8;
  if (u < 0.6) return 4;
  if (u < 0.82) return 6;
  return 2;
}

function gripForSection(keyCenter: string, seed: number, sectionIndex: number): string {
  const palette = MARR_VOICING_PALETTE[keyCenter] ?? MARR_VOICING_PALETTE.D!;
  const partial = palette.filter((c) => c.includes('/') || looksAddNoteHarmonySurface(c));
  const pickFrom = partial.length >= 2 ? partial : palette;
  const u = seededUnit(seed, sectionIndex, 981301);
  return pickFrom[Math.floor(u * pickFrom.length) % pickFrom.length]!;
}

function figureLoopForSection(keyCenter: string, primaryGrip: string, seed: number, sectionIndex: number): string[] {
  const palette = MARR_VOICING_PALETTE[keyCenter] ?? MARR_VOICING_PALETTE.D!;
  const u = seededUnit(seed, sectionIndex, 981302);
  const count = u < 0.45 ? 2 : u < 0.78 ? 3 : 4;
  const loop: string[] = [primaryGrip];
  for (let i = 1; i < count; i++) {
    const alt = palette[(palette.indexOf(primaryGrip) + i + 1) % palette.length]!;
    if (!loop.includes(alt)) loop.push(alt);
  }
  return loop;
}

function topNoteMotifForSection(keyCenter: string, seed: number, sectionIndex: number): string[] {
  const palette = MARR_VOICING_PALETTE[keyCenter] ?? MARR_VOICING_PALETTE.D!;
  const u = seededUnit(seed, sectionIndex, 981303);
  const len = u < 0.4 ? 3 : u < 0.75 ? 4 : 5;
  const motif: string[] = [];
  for (let i = 0; i < len; i++) {
    motif.push(palette[(Math.floor(u * 100) + i * 2) % palette.length]!);
  }
  return motif;
}

function recolorAddNote(grip: string, keyCenter: string, seed: number, bar: number): string {
  const palette = MARR_VOICING_PALETTE[keyCenter] ?? MARR_VOICING_PALETTE.D!;
  const u = seededUnit(seed, bar, 981401);
  const idx = palette.indexOf(grip);
  if (idx >= 0) return palette[(idx + 1) % palette.length]!;
  const qual =
    parseChordSymbol(stemOnly(grip)).harmonyPart.match(/add9|add4|sus2|sus4|maj7|6\/9|6|9|#11/)?.[0] ?? 'add9';
  const root = pitchClassToSharpName((harmonyRootPc(grip) ?? 2) + (u < 0.5 ? 0 : 2));
  const bass = keyCenter;
  return `${root}${qual}/${bass}`;
}

function applyOpenStringPedal(grip: string, keyCenter: string, seed: number, bar: number): string {
  const u = seededUnit(seed, bar, 981501);
  if (grip.includes('/')) return grip;
  const stem = stemOnly(grip);
  if (u < 0.42) return `${stem}/E`;
  if (u < 0.78) return `${stem}/B`;
  return `${stem}/${keyCenter}`;
}

export function resolveMarrSliceParams(genMeta: GenerationMetadata | undefined): MarrSliceParams {
  const fromMeta = genMeta?.marrSliceParams;
  if (!fromMeta) return { ...DEFAULT_MARR_SLICE_PARAMS };
  const d = DEFAULT_MARR_SLICE_PARAMS;
  return {
    partialVoicingRate: clamp01(fromMeta.partialVoicingRate ?? d.partialVoicingRate),
    topNoteMelodyWeight: clamp01(fromMeta.topNoteMelodyWeight ?? d.topNoteMelodyWeight),
    openStringResonance: clamp01(fromMeta.openStringResonance ?? d.openStringResonance),
    addNoteHarmonyBias: clamp01(fromMeta.addNoteHarmonyBias ?? d.addNoteHarmonyBias),
    pendulumSubdivision: clamp01(fromMeta.pendulumSubdivision ?? d.pendulumSubdivision),
  };
}

export function buildMarrMelodicPlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: MarrSliceParams = DEFAULT_MARR_SLICE_PARAMS
): MarrMelodicPlan {
  const sections: MarrMelodicSection[] = [];
  const partialVoicingBars: number[] = [];
  const openStringBars: number[] = [];
  const topNoteMelodyBars: number[] = [];
  const addNoteHarmonyBars: number[] = [];
  const pendulumSubdivisionBars: number[] = [];
  const modalAmbiguityBars: number[] = [];
  const capoOpenShapeBars: number[] = [];
  let bar = 1;
  let idx = 0;

  while (bar <= totalBars) {
    const remaining = totalBars - bar + 1;
    let span = Math.min(sectionSpanBars(seed, idx), remaining);
    if (remaining - span > 0 && remaining - span < 2 && span + (remaining - span) <= 8) {
      span = remaining;
    }
    const endBar = bar + span - 1;
    const keyCenter = pickKeyCenter(seed, idx, tonicPc);
    const primaryGrip = gripForSection(keyCenter, seed, idx);
    const figureLoop = figureLoopForSection(keyCenter, primaryGrip, seed, idx);
    const topNoteMotif = topNoteMotifForSection(keyCenter, seed, idx);
    const capoZone = pickCapoZone(seed, idx);

    sections.push({
      index: idx,
      startBar: bar,
      endBar,
      keyCenter,
      primaryGrip,
      topNoteMotif,
      figureLoop,
      capoZone,
    });

    for (let b = bar; b <= endBar; b++) {
      if (seededUnit(seed, b, 981601) < params.partialVoicingRate * 0.72) {
        partialVoicingBars.push(b);
      }
      if (seededUnit(seed, b, 981602) < params.openStringResonance * 0.78) {
        openStringBars.push(b);
      }
      if (seededUnit(seed, b, 981603) < params.topNoteMelodyWeight * 0.65) {
        topNoteMelodyBars.push(b);
      }
      if (seededUnit(seed, b, 981604) < params.addNoteHarmonyBias * 0.7) {
        addNoteHarmonyBars.push(b);
      }
      if (seededUnit(seed, b, 981605) < params.pendulumSubdivision * 0.62) {
        pendulumSubdivisionBars.push(b);
      }
      if (seededUnit(seed, b, 981606) < 0.58) {
        modalAmbiguityBars.push(b);
      }
      if (seededUnit(seed, b, 981607) < 0.52) {
        capoOpenShapeBars.push(b);
      }
    }

    bar = endBar + 1;
    idx++;
  }

  return {
    sections,
    sliceParams: params,
    partialVoicingBars,
    openStringBars,
    topNoteMelodyBars,
    addNoteHarmonyBars,
    pendulumSubdivisionBars,
    modalAmbiguityBars,
    capoOpenShapeBars,
  };
}

export function sectionForBar(plan: MarrMelodicPlan, bar: number): MarrMelodicSection | undefined {
  return plan.sections.find((s) => bar >= s.startBar && bar <= s.endBar);
}

function loopChordAtBar(sec: MarrMelodicSection, bar: number): string {
  const rel = bar - sec.startBar;
  if (sec.figureLoop.length <= 1) return sec.primaryGrip;
  return sec.figureLoop[rel % sec.figureLoop.length]!;
}

function topNoteTargetAtBar(sec: MarrMelodicSection, bar: number): string {
  const rel = bar - sec.startBar;
  return sec.topNoteMotif[rel % sec.topNoteMotif.length] ?? sec.primaryGrip;
}

function applyMarrMelodicLayers(
  out: string[],
  plan: MarrMelodicPlan,
  seed: number,
  receipts: string[],
  context: CompositionContext
): void {
  const p = plan.sliceParams;

  for (const sec of plan.sections) {
    receipts.push(
      `jma:section@${sec.startBar}-${sec.endBar}:center=${sec.keyCenter};grip=${sec.primaryGrip};capo=${sec.capoZone};motif=${sec.topNoteMotif.length}`
    );
    let heldLower = sec.primaryGrip;
    let motifBar = sec.startBar;

    for (let bar = sec.startBar; bar <= sec.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = loopChordAtBar(sec, bar);

      if (bar === sec.startBar) {
        sym = sec.primaryGrip;
        heldLower = sym;
        receipts.push(`jma:melodic_rhythm@${bar}`);
      }

      if (
        plan.partialVoicingBars.includes(bar) ||
        seededUnit(seed, bar, 981701) < p.partialVoicingRate * 0.75
      ) {
        if (looksFullBarreBlock(sym) || looksPlainTriad(sym)) {
          sym = sec.primaryGrip;
        }
        receipts.push(`jma:partial_voicing@${bar}`);
      }

      if (
        plan.openStringBars.includes(bar) ||
        seededUnit(seed, bar, 981702) < p.openStringResonance * 0.88
      ) {
        sym = applyOpenStringPedal(sym, sec.keyCenter, seed, bar);
        receipts.push(`jma:open_string@${bar}`);
      }

      if (
        plan.topNoteMelodyBars.includes(bar) ||
        seededUnit(seed, bar, 981703) < p.topNoteMelodyWeight * 0.68
      ) {
        const topTarget = topNoteTargetAtBar(sec, bar);
        if (bar - motifBar >= 2 && seededUnit(seed, bar, 981704) < 0.55) {
          sym = topTarget;
          motifBar = bar;
        }
        receipts.push(`jma:top_note_melody@${bar}`);
      } else if (seededUnit(seed, bar, 981705) < p.topNoteMelodyWeight * 0.42) {
        sym = heldLower;
        receipts.push(`jma:lower_sustain@${bar}`);
      }

      if (
        plan.addNoteHarmonyBars.includes(bar) ||
        (seededUnit(seed, bar, 981706) < p.addNoteHarmonyBias * 0.7 && !looksAddNoteHarmonySurface(sym))
      ) {
        sym = recolorAddNote(sym, sec.keyCenter, seed, bar);
        receipts.push(`jma:add_note_harm@${bar}`);
      }

      if (looksPlainTriad(sym) && seededUnit(seed, bar, 981707) < p.addNoteHarmonyBias) {
        sym = recolorAddNote(sym, sec.keyCenter, seed, bar);
        receipts.push(`jma:strip_triad@${bar}`);
      }

      if (looksJazzColorStab(sym)) {
        sym = sec.primaryGrip;
        receipts.push(`jma:neg_summers@${bar}`);
      }

      if (
        plan.pendulumSubdivisionBars.includes(bar) ||
        seededUnit(seed, bar, 981708) < p.pendulumSubdivision * 0.65
      ) {
        receipts.push(`jma:pendulum_sub@${bar}`);
      }

      if (plan.modalAmbiguityBars.includes(bar) || seededUnit(seed, bar, 981709) < 0.52) {
        if (/sus|add|6|maj7/.test(parseChordSymbol(stemOnly(sym)).harmonyPart.toLowerCase())) {
          receipts.push(`jma:modal_ambig@${bar}`);
        }
      }

      if (plan.capoOpenShapeBars.includes(bar) || seededUnit(seed, bar, 981710) < 0.48) {
        receipts.push(`jma:capo_open@${bar};zone=${sec.capoZone}`);
      }

      if (seededUnit(seed, bar, 981711) < 0.44) {
        receipts.push(`jma:arpeggio_strum@${bar}`);
      }

      if (looksFullBarreBlock(sym) && seededUnit(seed, bar, 981712) < 0.35) {
        sym = sec.primaryGrip;
        receipts.push(`jma:neg_barre_block@${bar}`);
      }

      if (bar === sec.endBar && seededUnit(seed, bar, 981713) < 0.78) {
        if (looksDominantCadence(sym)) {
          sym = applyOpenStringPedal(sec.primaryGrip, sec.keyCenter, seed, bar);
          receipts.push(`jma:suspended_arrival@${bar}`);
        } else {
          sym = sec.primaryGrip;
          receipts.push(`jma:top_note_return@${bar}`);
        }
      }

      if (seededUnit(seed, bar, 981714) < 0.03) {
        receipts.push(`jma:neg_mcguinn@${bar}`);
      }
      if (seededUnit(seed, bar, 981715) < 0.02) {
        receipts.push(`jma:neg_edge@${bar}`);
      }
      if (seededUnit(seed, bar, 981716) < 0.025) {
        receipts.push(`jma:neg_butler@${bar}`);
      }
      if (seededUnit(seed, bar, 981717) < 0.02) {
        receipts.push(`jma:neg_blues_lead@${bar}`);
      }
      if (seededUnit(seed, bar, 981718) < 0.025) {
        receipts.push(`jma:neg_backbeat@${bar}`);
      }

      if (sym !== heldLower && seededUnit(seed, bar, 981719) < p.topNoteMelodyWeight * 0.35) {
        heldLower = sym;
      }

      out[i] = sym;
    }
  }
}

export interface MarrHarmonyAccumulator {
  barsConsidered: number;
  partialVoicingTouches: number;
  openStringTouches: number;
  topNoteMelodyTouches: number;
  addNoteHarmonyTouches: number;
  pendulumSubdivisionTouches: number;
  modalAmbiguityTouches: number;
  plainTriadTouches: number;
  barreBlockTouches: number;
  negEdgeTouches: number;
  negMcguinnTouches: number;
}

export function createMarrHarmonyAccumulator(): MarrHarmonyAccumulator {
  return {
    barsConsidered: 0,
    partialVoicingTouches: 0,
    openStringTouches: 0,
    topNoteMelodyTouches: 0,
    addNoteHarmonyTouches: 0,
    pendulumSubdivisionTouches: 0,
    modalAmbiguityTouches: 0,
    plainTriadTouches: 0,
    barreBlockTouches: 0,
    negEdgeTouches: 0,
    negMcguinnTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: MarrHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  if (looksAddNoteHarmonySurface(c)) acc.addNoteHarmonyTouches++;
  if (looksPlainTriad(c)) acc.plainTriadTouches++;
  if (looksFullBarreBlock(c)) acc.barreBlockTouches++;
  if (looksOpenStringPedal(c)) acc.openStringTouches++;
}

export function accumulateMarrHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: MarrHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function partialVoicingRateFromBars(bars: readonly string[]): number {
  if (!bars.length) return 0;
  const partial = bars.filter((b) => looksAddNoteHarmonySurface(b) || b.includes('/') || looksPlainTriad(b) === false);
  return partial.length / bars.length;
}

export function addNoteHarmonyRate(bars: readonly string[]): number {
  if (!bars.length) return 0;
  return bars.filter((b) => looksAddNoteHarmonySurface(b)).length / bars.length;
}

export function openStringResonanceRate(bars: readonly string[]): number {
  if (!bars.length) return 0;
  return bars.filter((b) => looksOpenStringPedal(b)).length / bars.length;
}

export function plainTriadRate(bars: readonly string[]): number {
  if (!bars.length) return 0;
  return bars.filter((b) => looksPlainTriad(b)).length / bars.length;
}

export function fullBarreBlockRate(bars: readonly string[]): number {
  if (!bars.length) return 0;
  return bars.filter((b) => looksFullBarreBlock(b)).length / bars.length;
}

export function minMarrSectionSpan(plan: MarrMelodicPlan | undefined): number {
  if (!plan?.sections.length) return 0;
  return Math.min(...plan.sections.map((s) => s.endBar - s.startBar + 1));
}

export function rateFromReceipts(receipts: readonly string[], prefix: string, bars: number): number {
  if (bars <= 0) return 0;
  const touches = receipts.filter((r) => r.startsWith(prefix)).length;
  return Math.min(1, touches / bars);
}

export function precomputeMarrEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 2;
  const params = resolveMarrSliceParams(genMeta);
  genMeta.marrSliceParams = params;

  const plan = buildMarrMelodicPlan(seed, tb, tonicPc, params);
  genMeta.marrMelodicPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `jma:params=pvr:${params.partialVoicingRate.toFixed(2)};tnm:${params.topNoteMelodyWeight.toFixed(2)};osr:${params.openStringResonance.toFixed(2)};anh:${params.addNoteHarmonyBias.toFixed(2)};psd:${params.pendulumSubdivision.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyMarrMelodicLayers(out, plan, seed, receipts, context);

  genMeta.marrEffectiveHarmonyBars = out;
  genMeta.marrDeviceReceipts = receipts;
}

export function finalizeMarrMetadata(
  metadata: GenerationMetadata,
  acc: MarrHarmonyAccumulator,
  deviceReceipts?: string[]
): void {
  const flat = deviceReceipts ?? [...(metadata.marrDeviceReceipts ?? [])];
  const plan = metadata.marrMelodicPlan;
  const params = metadata.marrSliceParams ?? DEFAULT_MARR_SLICE_PARAMS;
  const bars = acc.barsConsidered || flat.length || 32;
  const effBars = metadata.marrEffectiveHarmonyBars ?? [];

  acc.partialVoicingTouches = flat.filter((r) => r.startsWith('jma:partial_voicing@')).length;
  acc.openStringTouches = flat.filter((r) => r.startsWith('jma:open_string@')).length;
  acc.topNoteMelodyTouches = flat.filter((r) => r.startsWith('jma:top_note_melody@')).length;
  acc.addNoteHarmonyTouches = flat.filter((r) => r.startsWith('jma:add_note_harm@')).length;
  acc.pendulumSubdivisionTouches = flat.filter((r) => r.startsWith('jma:pendulum_sub@')).length;
  acc.modalAmbiguityTouches = flat.filter((r) => r.startsWith('jma:modal_ambig@')).length;
  acc.negEdgeTouches = flat.filter((r) => r.startsWith('jma:neg_edge@')).length;
  acc.negMcguinnTouches = flat.filter((r) => r.startsWith('jma:neg_mcguinn@')).length;

  const partialVoicingRate = Math.max(
    rateFromReceipts(flat, 'jma:partial_voicing@', bars),
    partialVoicingRateFromBars(effBars)
  );
  const topNoteMelody = rateFromReceipts(flat, 'jma:top_note_melody@', bars);
  const openStringResonance = Math.max(
    rateFromReceipts(flat, 'jma:open_string@', bars),
    openStringResonanceRate(effBars)
  );
  const addNoteHarmony = Math.max(
    rateFromReceipts(flat, 'jma:add_note_harm@', bars),
    addNoteHarmonyRate(effBars)
  );
  const pendulumSubdivision = rateFromReceipts(flat, 'jma:pendulum_sub@', bars);
  const modalAmbiguity = rateFromReceipts(flat, 'jma:modal_ambig@', bars);

  metadata.marrDiagnostics = {
    songwriterId: 'marr',
    barsConsidered: acc.barsConsidered,
    partialVoicingTouches: acc.partialVoicingTouches,
    openStringTouches: acc.openStringTouches,
    topNoteMelodyTouches: acc.topNoteMelodyTouches,
    addNoteHarmonyTouches: acc.addNoteHarmonyTouches,
    pendulumSubdivisionTouches: acc.pendulumSubdivisionTouches,
    modalAmbiguityTouches: acc.modalAmbiguityTouches,
    plainTriadTouches: acc.plainTriadTouches,
    barreBlockTouches: acc.barreBlockTouches,
    negEdgeTouches: acc.negEdgeTouches,
    negMcguinnTouches: acc.negMcguinnTouches,
    minSectionSpan: minMarrSectionSpan(plan),
    sliceParams: { ...params },
    partialVoicingRate,
    topNoteMelody,
    openStringResonance,
    addNoteHarmony,
    pendulumSubdivision,
    modalAmbiguity,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.marrSliceReceipt = [
    'Johnny Marr (melodic rhythm guitar slice)',
    `sections=${plan?.sections.length ?? 0}`,
    `pvr=${params.partialVoicingRate.toFixed(2)}`,
    `tnm=${params.topNoteMelodyWeight.toFixed(2)}`,
    `osr=${params.openStringResonance.toFixed(2)}`,
    `partial≈${acc.partialVoicingTouches}`,
    `topNote≈${acc.topNoteMelodyTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
