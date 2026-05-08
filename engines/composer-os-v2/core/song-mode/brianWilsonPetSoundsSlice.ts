/**
 * Brian Wilson — Pet Sounds era (1964–67) Song Mode / duo golden-path slice.
 * Named harmonic devices + light guitar melody shaping (progressive register / pickups).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent } from '../score-model/scoreModelTypes';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

export interface BrianWilsonHarmonyAccumulator {
  barsConsidered: number;
  chromaticBassTransitions: number;
  halfDiminishedTouches: number;
  augmentedTouches: number;
  diminishedSeventhTouches: number;
}

export function createBrianWilsonHarmonyAccumulator(): BrianWilsonHarmonyAccumulator {
  return {
    barsConsidered: 0,
    chromaticBassTransitions: 0,
    halfDiminishedTouches: 0,
    augmentedTouches: 0,
    diminishedSeventhTouches: 0,
  };
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

function rootPcFromHarmonyPart(harmonyPart: string): number | undefined {
  const m = harmonyPart.trim().match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

/** Prefer slash bass PC; else chord root PC. */
export function bassPitchClassForChordSymbol(symbol: string): number | undefined {
  const p = parseChordSymbol(symbol);
  if (p.slashBassPc !== undefined) return p.slashBassPc;
  return rootPcFromHarmonyPart(p.harmonyPart);
}

export function accumulateBrianWilsonHarmonyDiagnostics(
  previousChord: string | undefined,
  currentChord: string,
  acc: BrianWilsonHarmonyAccumulator
): void {
  const cur = currentChord.trim();
  if (!cur) return;
  acc.barsConsidered++;

  const h = parseChordSymbol(cur).harmonyPart;
  const hl = h.toLowerCase();

  if (hl.includes('m7b5') || hl.includes('ø') || hl.includes('half-dim')) {
    acc.halfDiminishedTouches++;
  } else if (hl.includes('dim7') || hl.includes('°') || (/\bdim\b/i.test(h) && !hl.includes('maj'))) {
    acc.diminishedSeventhTouches++;
  }
  if (hl.includes('aug') || /^[a-g][#b]?\+(?=\(|\/|$)/i.test(h.trim())) {
    acc.augmentedTouches++;
  }

  if (!previousChord?.trim()) return;
  const prevPc = bassPitchClassForChordSymbol(previousChord);
  const curPc = bassPitchClassForChordSymbol(currentChord);
  if (prevPc === undefined || curPc === undefined) return;
  const step = (curPc - prevPc + 12) % 12;
  if (step === 1 || step === 11) {
    acc.chromaticBassTransitions++;
  }
}

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function melodySurfaceAllowsDimPass(seed: number, bar: number): boolean {
  let s = (seed ^ bar * 1103515245 ^ 77101 * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff < 0.72;
}

export interface BrianWilsonPetSoundsDeviceReceipts {
  deviceReceipts: string[];
}

export interface BrianWilsonHarmonicDeviceState {
  /** Bar indices (1-based) already forced to Pet Sounds modal-mixture i7. */
  modalMixtureBar3Fired: Set<number>;
}

export function createBrianWilsonHarmonicDeviceState(): BrianWilsonHarmonicDeviceState {
  return { modalMixtureBar3Fired: new Set() };
}

/** Letter / named sections → coarse roles for Pet Sounds devices. */
export function coarseSectionRoleFromBar(bar: number, context: CompositionContext): 'verse' | 'chorus' | 'bridge' | 'other' {
  const sec = context.form.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
  const label = sec?.label ?? 'A';
  const L = label.trim().toLowerCase();
  if (L.startsWith('verse')) return 'verse';
  if (L.startsWith('chorus')) return 'chorus';
  if (L.startsWith('bridge')) return 'bridge';
  const u = label.trim().toUpperCase();
  if (u === 'A' || /^A_\d+$/i.test(label.trim())) return 'verse';
  if (u === 'B' || /^B_\d+$/i.test(label.trim())) return 'chorus';
  if (u === 'C' || /^C_\d+$/i.test(label.trim())) return 'bridge';
  return 'other';
}

function isVerseLikeSectionRole(role: 'verse' | 'chorus' | 'bridge' | 'other'): boolean {
  return role === 'verse';
}

function formSectionMetaAtBar(
  bar: number,
  context: CompositionContext
): { label: string; startBar: number } | undefined {
  const sec = context.form.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
  if (!sec) return undefined;
  return { label: sec.label, startBar: sec.startBar };
}

function isSectionBoundaryBar(bar: number, context: CompositionContext): boolean {
  if (bar <= 1) return false;
  const cur = formSectionMetaAtBar(bar, context);
  const prev = formSectionMetaAtBar(bar - 1, context);
  if (!cur || !prev) return false;
  return cur.startBar === bar && (cur.label !== prev.label || cur.startBar !== prev.startBar);
}

function isVerseToPeakTransition(bar: number, context: CompositionContext): boolean {
  if (!isSectionBoundaryBar(bar, context)) return false;
  const prevRole = coarseSectionRoleFromBar(bar - 1, context);
  const curRole = coarseSectionRoleFromBar(bar, context);
  const fromVerse = prevRole === 'verse';
  const toPeak = curRole === 'chorus' || curRole === 'bridge';
  return fromVerse && toPeak;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function harmonyLooksMinorOrHalfDim(symbol: string): boolean {
  const h = parseChordSymbol(symbol).harmonyPart;
  const t = h.toLowerCase();
  if (/maj7|maj9|maj6|Δ|ma7|add|sus/.test(t)) return false;
  if (/^([a-g][#b]?)m(?!aj)/i.test(h) || /\bm(in)?(7|9|11|13)\b/i.test(t)) return true;
  if (/ø|m7b5|half-dim|dim/.test(t)) return true;
  return false;
}

export function inferTonicPitchClassFromBar1(context: CompositionContext): number | undefined {
  const tb = context.form.totalBars;
  if (tb < 1) return undefined;
  return harmonyRootPc(resolveBarSymbol(context, 1).symbol);
}

/** Device 1 — Chromatic ascending bass: insert ø7 over the raised bass step. */
export function bwDevice1ChromaticBassHalfDim7(params: {
  bar: number;
  prevChord: string | undefined;
  chord: string;
  seed: number;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, prevChord, chord, seed, receipts } = params;
  if (!prevChord?.trim()) return chord;
  const prevPc = bassPitchClassForChordSymbol(prevChord);
  const curPc = bassPitchClassForChordSymbol(chord);
  if (prevPc === undefined || curPc === undefined) return chord;
  const up = (curPc - prevPc + 12) % 12;
  if (up !== 1) return chord;
  if (!melodySurfaceAllowsDimPass(seed, bar)) return chord;
  const bassName = pitchClassToSharpName(curPc);
  const next = `${bassName}m7b5`;
  if (normalizeToken(chord) === normalizeToken(next)) return chord;
  receipts.deviceReceipts.push(`bw:device1:chromatic_bass_dim7@bar${bar}`);
  return next;
}

function normalizeToken(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** Device 2 — Inverted dominant: avoid root-position V; use V/3 or V/5. */
export function bwDevice2InvertedDominant(params: {
  bar: number;
  chord: string;
  nextChord: string | undefined;
  tonicPc: number | undefined;
  seed: number;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, chord, nextChord, tonicPc, seed, receipts } = params;
  if (tonicPc === undefined) return chord;
  const p = parseChordSymbol(chord);
  if (p.slashBassPc !== undefined) return chord;
  const h = p.harmonyPart.trim();
  const rm = h.match(ROOT_AT_START);
  if (!rm?.[1]) return chord;
  const rootPc = noteNameToPitchClass(rm[1]);
  if (rootPc === undefined) return chord;
  const vPc = (tonicPc + 7) % 12;
  if (rootPc !== vPc) return chord;
  const rest = h.slice(rm[1].length).toLowerCase();
  if (/^m(?!aj)/.test(rest) || /dim|ø|m7b5/.test(rest)) return chord;

  let landCadence = false;
  if (nextChord?.trim()) {
    const nextRoot = harmonyRootPc(nextChord);
    if (nextRoot === tonicPc && !harmonyLooksMinorOrHalfDim(nextChord)) landCadence = true;
  }
  if (!landCadence && seededUnit(seed, bar, 88401) > 0.55) return chord;

  const thirdPc = (rootPc + 4) % 12;
  const fifthPcFromRoot = (rootPc + 7) % 12;
  const bassPc = seededUnit(seed, bar, 88402) < 0.5 ? thirdPc : fifthPcFromRoot;
  const slash = pitchClassToSharpName(bassPc);
  const out = `${h}/${slash}`;
  receipts.deviceReceipts.push(`bw:device2:inverted_v@bar${bar}`);
  return out;
}

/** Device 3 — bVII as primary subdominant in verse-like sections: IV major → ♭VII major. */
export function bwDevice3FlatSevenSubdominant(params: {
  bar: number;
  sectionRole: ReturnType<typeof coarseSectionRoleFromBar>;
  chord: string;
  tonicPc: number | undefined;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, sectionRole, chord, tonicPc, receipts } = params;
  if (!isVerseLikeSectionRole(sectionRole) || tonicPc === undefined) return chord;
  const p = parseChordSymbol(chord);
  if (p.slashBassPc !== undefined) return chord;
  const rootPc = harmonyRootPc(chord);
  if (rootPc === undefined) return chord;
  const ivPc = (tonicPc + 5) % 12;
  if (rootPc !== ivPc) return chord;
  if (harmonyLooksMinorOrHalfDim(chord)) return chord;
  const bViiPc = (tonicPc + 10) % 12;
  const name = pitchClassToSharpName(bViiPc);
  const out = `${name}maj7`;
  receipts.deviceReceipts.push(`bw:device3:bvii_subdominant@bar${bar}`);
  return out;
}

/** Device 4 — Two bars tonic major → next bar i7 (modal mixture). */
export function bwDevice4TonicMinorSevenMixture(params: {
  bar: number;
  rawChordThisBar: string;
  rawChordTwoBack: string | undefined;
  rawChordOneBack: string | undefined;
  tonicPc: number | undefined;
  state: BrianWilsonHarmonicDeviceState;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, rawChordThisBar, rawChordTwoBack, rawChordOneBack, tonicPc, state, receipts } = params;
  if (tonicPc === undefined || !rawChordTwoBack?.trim() || !rawChordOneBack?.trim()) return rawChordThisBar;
  if (!isTonicMajorSymbol(rawChordTwoBack, tonicPc) || !isTonicMajorSymbol(rawChordOneBack, tonicPc)) {
    return rawChordThisBar;
  }
  if (state.modalMixtureBar3Fired.has(bar)) return rawChordThisBar;
  const tonicName = pitchClassToSharpName(tonicPc);
  const out = `${tonicName}m7`;
  state.modalMixtureBar3Fired.add(bar);
  receipts.deviceReceipts.push(`bw:device4:modal_mixture_i7@bar${bar}`);
  return out;
}

function isTonicMajorSymbol(symbol: string, tonicPc: number): boolean {
  const root = harmonyRootPc(symbol);
  if (root !== tonicPc) return false;
  return !harmonyLooksMinorOrHalfDim(symbol);
}

/** Device 5 — Semitone down at verse → chorus/bridge boundary (first bar of new section). */
export function bwDevice5SemitoneSectionModulation(params: {
  bar: number;
  context: CompositionMetadataWrite;
  chord: string;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, context, chord, receipts } = params;
  if (!isVerseToPeakTransition(bar, context.compositionContext)) return chord;
  const out = transposeChordSymbolDownSemitone(chord);
  if (normalizeToken(out) === normalizeToken(chord)) return chord;
  context.appendModulationHint({
    atBar: bar,
    semitoneDelta: -1 as const,
    fromRole: 'verse',
    toRole: coarseSectionRoleFromBar(bar, context.compositionContext),
  });
  receipts.deviceReceipts.push(`bw:device5:semitone_mod_down@bar${bar}`);
  return out;
}

export interface CompositionMetadataWrite {
  compositionContext: CompositionContext;
  appendModulationHint(h: {
    atBar: number;
    semitoneDelta: -1;
    fromRole: 'verse';
    toRole: 'chorus' | 'bridge' | 'verse' | 'other';
  }): void;
}

function transposeChordSymbolDownSemitone(symbol: string): string {
  const p = parseChordSymbol(symbol);
  const h = p.harmonyPart.trim();
  const rm = h.match(ROOT_AT_START);
  if (!rm?.[1]) return symbol;
  const rootPc = noteNameToPitchClass(rm[1]);
  if (rootPc === undefined) return symbol;
  const newPc = (rootPc + 11) % 12;
  const newRoot = pitchClassToSharpName(newPc);
  const rest = h.slice(rm[1].length);
  const harmony = `${newRoot}${rest}`;
  if (p.slashBassPc === undefined) return harmony;
  const slashName = pitchClassToSharpName((p.slashBassPc + 11) % 12);
  return `${harmony}/${slashName}`;
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

/** Apply devices 1–5 in order for one bar (5 only at eligible section boundaries). */
export function applyBrianWilsonPetSoundsHarmonicDevicesForBar(params: {
  bar: number;
  context: CompositionContext;
  tonicPc: number | undefined;
  rawChord: string;
  rawPrevChord: string | undefined;
  rawNextChord: string | undefined;
  seed: number;
  state: BrianWilsonHarmonicDeviceState;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
  metaWrite: CompositionMetadataWrite;
}): string {
  const {
    bar,
    context,
    tonicPc,
    rawChord,
    rawPrevChord,
    rawNextChord,
    seed,
    state,
    receipts,
    metaWrite,
  } = params;
  const sectionRole = coarseSectionRoleFromBar(bar, context);
  const rawTwoBack = bar >= 3 ? resolveBarSymbol(context, bar - 2).symbol : undefined;
  const rawOneBack = bar >= 2 ? resolveBarSymbol(context, bar - 1).symbol : undefined;

  let chord = rawChord;
  chord = bwDevice1ChromaticBassHalfDim7({ bar, prevChord: rawPrevChord, chord, seed, receipts });
  chord = bwDevice2InvertedDominant({ bar, chord, nextChord: rawNextChord, tonicPc, seed, receipts });
  chord = bwDevice3FlatSevenSubdominant({ bar, sectionRole, chord, tonicPc, receipts });
  chord = bwDevice4TonicMinorSevenMixture({
    bar,
    rawChordThisBar: chord,
    rawChordTwoBack: rawTwoBack,
    rawChordOneBack: rawOneBack,
    tonicPc,
    state,
    receipts,
  });
  chord = bwDevice5SemitoneSectionModulation({ bar, context: metaWrite, chord, receipts });
  return chord;
}

/** Precompute full-form effective harmony when Brian Wilson + duo golden path. */
/** @deprecated — use resolveBarSymbol */
export function precomputeBrianWilsonEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const receipts: BrianWilsonPetSoundsDeviceReceipts = { deviceReceipts: [] };
  const state = createBrianWilsonHarmonicDeviceState();
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const hints: Array<{
    atBar: number;
    semitoneDelta: -1;
    fromRole: 'verse';
    toRole: 'chorus' | 'bridge' | 'verse' | 'other';
  }> = [];
  const metaWrite: CompositionMetadataWrite = {
    compositionContext: context,
    appendModulationHint(h) {
      hints.push(h);
    },
  };
  const seed = context.seed;
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    const raw = resolveBarSymbol(context, b).symbol;
    const prev = b > 1 ? resolveBarSymbol(context, b - 1).symbol : undefined;
    const next = b < tb ? resolveBarSymbol(context, b + 1).symbol : undefined;
    const effective = applyBrianWilsonPetSoundsHarmonicDevicesForBar({
      bar: b,
      context,
      tonicPc,
      rawChord: raw,
      rawPrevChord: prev,
      rawNextChord: next,
      seed,
      state,
      receipts,
      metaWrite,
    });
    out.push(effective);
  }
  genMeta.brianWilsonEffectiveHarmonyBars = out;
  genMeta.brianWilsonSectionModulationHints = hints;
  genMeta.brianWilsonPetSoundsDeviceReceipts = receipts.deviceReceipts;
}

export function resolveBrianWilsonEffectiveChordForBar(
  bar: number,
  context: CompositionContext,
  genMeta: GenerationMetadata & Record<string, unknown>
): string {
  const tb = context.form.totalBars;
  const eff = genMeta.brianWilsonEffectiveHarmonyBars as string[] | undefined;
  if (eff && eff.length === tb && bar >= 1 && bar <= tb) return eff[bar - 1]!;
  return resolveBarSymbol(context, bar).symbol;
}

function clampPitch(p: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, p));
}

/**
 * Guitar voice-1 shaping: progressive upward expansion over the form, pickup entries,
 * mild arch emphasis (lift mid-phrase notes slightly).
 */
export function applyBrianWilsonGuitarBarPasses(
  m: MeasureModel,
  bar: number,
  seed: number,
  low: number,
  high: number,
  phrasePhase: number
): void {
  const expansion = Math.min(3, Math.floor((bar - 1) / 7));
  const archLift =
    phrasePhase === 3 || phrasePhase === 4 ? 1 : phrasePhase === 5 ? 2 : 0;

  const v1 = m.events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);

  if (v1.length === 0) return;

  const first = v1[0];
  if (
    first &&
    Math.abs(first.startBeat) < 1e-4 &&
    seededUnit(seed, bar, 88301) < 0.34
  ) {
    first.startBeat = 0.25;
  }

  let i = 0;
  for (const e of v1) {
    let p = e.pitch;
    if (expansion > 0 && seededUnit(seed, bar, 88320 + i) < 0.48) {
      p = clampPitch(p + expansion, low, high);
    }
    if (archLift > 0 && i === Math.floor(v1.length / 2) && seededUnit(seed, bar, 88340 + i) < 0.55) {
      p = clampPitch(p + archLift, low, high);
    }
    e.pitch = p;
    i++;
  }
}

export function finalizeBrianWilsonPetSoundsMetadata(
  metadata: GenerationMetadata,
  acc: BrianWilsonHarmonyAccumulator,
  extraReceipts?: string[]
): void {
  const deviceList = [...(extraReceipts ?? []), ...(metadata.brianWilsonPetSoundsDeviceReceipts ?? [])];
  const d = {
    songwriterId: 'brian_wilson',
    barsConsidered: acc.barsConsidered,
    chromaticBassTransitions: acc.chromaticBassTransitions,
    halfDiminishedTouches: acc.halfDiminishedTouches,
    augmentedTouches: acc.augmentedTouches,
    diminishedSeventhTouches: acc.diminishedSeventhTouches,
    deviceReceipts: deviceList.length ? deviceList : undefined,
  } as const;
  const receipt = [
    `Brian Wilson (Pet Sounds slice): bass chromatic steps≈${acc.chromaticBassTransitions}`,
    `ø7=${acc.halfDiminishedTouches}`,
    `aug=${acc.augmentedTouches}`,
    `dim7=${acc.diminishedSeventhTouches}`,
    `bars=${acc.barsConsidered}`,
    deviceList.length ? `devices=${deviceList.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.brianWilsonPetSoundsDiagnostics = { ...d };
  metadata.brianWilsonPetSoundsSliceReceipt = receipt;
}
