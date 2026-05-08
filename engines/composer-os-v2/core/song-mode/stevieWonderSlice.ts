/**
 * Stevie Wonder — classic period (1972–1976) Song Mode / duo golden-path slice.
 * Named harmonic devices + pentatonic voice-1 shaping (see device 5).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent } from '../score-model/scoreModelTypes';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { coarseSectionRoleFromBar, inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

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

function isTonicMajorish(symbol: string, tonicPc: number): boolean {
  const r = harmonyRootPc(symbol);
  if (r !== tonicPc) return false;
  const t = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/^([a-g][#b]?)m(?!aj)/i.test(parseChordSymbol(symbol).harmonyPart) || /\bmin/.test(t)) return false;
  if (/dim|ø|m7b5|m9|m11|m7(?!aj)/.test(t)) return false;
  return true;
}

function isTonicMinorish(symbol: string, tonicPc: number): boolean {
  const r = harmonyRootPc(symbol);
  if (r !== tonicPc) return false;
  const t = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/^([a-g][#b]?)m(?!aj)/i.test(parseChordSymbol(symbol).harmonyPart) || /m7|m9|m6|min/.test(t)) return true;
  return false;
}

function isDominantOfTonic(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const r = harmonyRootPc(symbol);
  if (r !== (tonicPc + 7) % 12) return false;
  const t = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/^([a-g][#b]?)m(?!aj)/i.test(parseChordSymbol(symbol).harmonyPart)) return false;
  if (/dim|ø|m7b5|sus4|sus2/.test(t)) return false;
  return /7|9|11|13|alt|sus/.test(t) || /[0-9]/.test(t) || t.length > 1;
}

export interface StevieWonderHarmonyAccumulator {
  barsConsidered: number;
  sus4Touches: number;
  alteredDominantTouches: number;
  extensionNines: number;
  minorSeventhColour: number;
}

export function createStevieWonderHarmonyAccumulator(): StevieWonderHarmonyAccumulator {
  return {
    barsConsidered: 0,
    sus4Touches: 0,
    alteredDominantTouches: 0,
    extensionNines: 0,
    minorSeventhColour: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: StevieWonderHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = c.toLowerCase();
  if (t.includes('sus4') || t.includes('sus')) acc.sus4Touches++;
  if (t.includes('7#5') || t.includes('#5') || t.includes('b5') || t.includes('b9') || t.includes('7(b5)')) {
    acc.alteredDominantTouches++;
  }
  if (/(^|[^0-9])9|9\(|9sus|9\(/.test(t) || t.includes('9sus')) acc.extensionNines++;
  if (/\bm7\b|m9|m11|m13|min7/.test(t)) acc.minorSeventhColour++;
}

export function accumulateStevieWonderHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: StevieWonderHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface StevieWonderDeviceReceipts {
  deviceReceipts: string[];
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

/** Device 1 — Dorian vamp: verse — IV7 instead of V→I cadence; minor tonic gains m7 colour. */
export function swDevice1DorianVamp(params: {
  bar: number;
  sectionRole: ReturnType<typeof coarseSectionRoleFromBar>;
  chord: string;
  nextChord: string | undefined;
  tonicPc: number | undefined;
  seed: number;
  receipts: StevieWonderDeviceReceipts;
}): string {
  const { bar, sectionRole, chord, nextChord, tonicPc, seed, receipts } = params;
  if (sectionRole !== 'verse' || tonicPc === undefined) return chord;
  if (!nextChord?.trim()) return chord;

  if (isDominantOfTonic(chord, tonicPc)) {
    const nextRoot = harmonyRootPc(nextChord);
    if (nextRoot === tonicPc && seededUnit(seed, bar, 92001) < 0.92) {
      const ivPc = (tonicPc + 5) % 12;
      const name = pitchClassToSharpName(ivPc);
      const out = `${name}7`;
      receipts.deviceReceipts.push(`sw:device1:dorian_vamp@bar${bar}`);
      return out;
    }
  }

  if (isTonicMinorish(chord, tonicPc) && !parseChordSymbol(chord).harmonyPart.toLowerCase().includes('m7')) {
    const name = pitchClassToSharpName(tonicPc);
    if (seededUnit(seed, bar, 92002) < 0.88) {
      const out = `${name}m7`;
      receipts.deviceReceipts.push(`sw:device1:dorian_vamp@bar${bar}`);
      return out;
    }
  }

  return chord;
}

/** Device 2 — vi7 → II7(13) → V7sus4 → I (applied in post pass over full form). */
export function swApplyDevice2CadentialSequence(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: StevieWonderDeviceReceipts;
}): void {
  const { context, tonicPc, out, receipts } = params;
  if (tonicPc === undefined) return;
  const tb = out.length;
  const tonicName = pitchClassToSharpName(tonicPc);
  const viName = pitchClassToSharpName((tonicPc + 9) % 12);
  const iiName = pitchClassToSharpName((tonicPc + 2) % 12);
  const vName = pitchClassToSharpName((tonicPc + 7) % 12);

  for (let pe = 4; pe <= tb; pe += 4) {
    if (coarseSectionRoleFromBar(pe, context) === 'bridge') continue;
    const i0 = pe - 4;
    out[i0] = `${viName}m7`;
    out[i0 + 1] = `${iiName}7(13)`;
    out[i0 + 2] = `${vName}7sus4`;
    out[i0 + 3] = `${tonicName}maj7`;
    receipts.deviceReceipts.push(`sw:device2:vi_ii_vsus4_i@bar${pe}`);
  }
}

/** Device 3 — Chromatic bridge sequence (first 6 bars of each bridge section). */
export function swApplyDevice3ChromaticBridge(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: StevieWonderDeviceReceipts;
}): void {
  const { context, tonicPc, out, receipts } = params;
  if (tonicPc === undefined) return;
  const vPc = (tonicPc + 7) % 12;
  const bViPc = (tonicPc + 8) % 12;
  const bVPc = (tonicPc + 6) % 12;
  const ivPc = (tonicPc + 5) % 12;
  const vName = pitchClassToSharpName(vPc);
  const bViName = pitchClassToSharpName(bViPc);
  const bVName = pitchClassToSharpName(bVPc);
  const ivName = pitchClassToSharpName(ivPc);

  const seq = [
    `${vName}9`,
    `${bViName}9(b5)`,
    `${vName}9`,
    `${bVName}7(b5)`,
    `${ivName}9sus4`,
    `${vName}7(#5)`,
  ];

  for (const sec of context.form.sections) {
    if (coarseSectionRoleFromBar(sec.startBar, context) !== 'bridge') continue;
    const start = sec.startBar;
    for (let j = 0; j < Math.min(6, sec.length); j++) {
      const bar = start + j;
      if (bar >= 1 && bar <= out.length) {
        out[bar - 1] = seq[j]!;
        receipts.deviceReceipts.push(`sw:device3:chromatic_bridge@bar${bar}`);
      }
    }
  }
}

/** Device 4 — Non-functional chromatic pivot: second bar of each chorus → bIIm7 (once per chorus section). */
export function swDevice4ChromaticPivot(params: {
  bar: number;
  context: CompositionContext;
  tonicPc: number | undefined;
  chord: string;
  prevOutChord: string | undefined;
  sectionChorusPivotFired: Set<number>;
  receipts: StevieWonderDeviceReceipts;
}): string {
  const { bar, context, tonicPc, chord, prevOutChord, sectionChorusPivotFired, receipts } = params;
  if (tonicPc === undefined) return chord;
  const sec = context.form.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
  if (!sec) return chord;
  if (coarseSectionRoleFromBar(bar, context) !== 'chorus') return chord;
  if (bar !== sec.startBar + 1) return chord;
  if (sectionChorusPivotFired.has(sec.startBar)) return chord;
  if (
    !prevOutChord?.trim() ||
    (!isTonicMajorish(prevOutChord, tonicPc) && !isTonicMinorish(prevOutChord, tonicPc))
  ) {
    return chord;
  }

  const bIiPc = (tonicPc + 1) % 12;
  const name = pitchClassToSharpName(bIiPc);
  sectionChorusPivotFired.add(sec.startBar);
  receipts.deviceReceipts.push(`sw:device4:chromatic_pivot@bar${bar}`);
  return `${name}m7`;
}

export function applyStevieWonderHarmonicDevicesFirstPass(params: {
  bar: number;
  context: CompositionContext;
  tonicPc: number | undefined;
  rawChord: string;
  rawNextChord: string | undefined;
  seed: number;
  prevOutChord: string | undefined;
  sectionChorusPivotFired: Set<number>;
  receipts: StevieWonderDeviceReceipts;
}): string {
  const sectionRole = coarseSectionRoleFromBar(params.bar, params.context);
  let chord = params.rawChord;
  chord = swDevice1DorianVamp({
    bar: params.bar,
    sectionRole,
    chord,
    nextChord: params.rawNextChord,
    tonicPc: params.tonicPc,
    seed: params.seed,
    receipts: params.receipts,
  });
  chord = swDevice4ChromaticPivot({
    bar: params.bar,
    context: params.context,
    tonicPc: params.tonicPc,
    chord,
    prevOutChord: params.prevOutChord,
    sectionChorusPivotFired: params.sectionChorusPivotFired,
    receipts: params.receipts,
  });
  return chord;
}

/** Precompute full-form effective harmony when Stevie Wonder + duo golden path. */
export function precomputeStevieWonderEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const receipts: StevieWonderDeviceReceipts = { deviceReceipts: [] };
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const seed = context.seed;
  const sectionChorusPivotFired = new Set<number>();
  const out: string[] = [];

  for (let b = 1; b <= tb; b++) {
    const raw = resolveBarSymbol(context, b).symbol;
    const next = b < tb ? resolveBarSymbol(context, b + 1).symbol : undefined;
    const prevOut = b > 1 ? out[b - 2] : undefined;
    const chord = applyStevieWonderHarmonicDevicesFirstPass({
      bar: b,
      context,
      tonicPc,
      rawChord: raw,
      rawNextChord: next,
      seed,
      prevOutChord: prevOut,
      sectionChorusPivotFired,
      receipts,
    });
    out.push(chord);
  }

  swApplyDevice2CadentialSequence({ context, tonicPc, out, receipts });
  swApplyDevice3ChromaticBridge({ context, tonicPc, out, receipts });

  genMeta.stevieWonderEffectiveHarmonyBars = out;
  genMeta.stevieWonderDeviceReceipts = receipts.deviceReceipts;
}

export function resolveStevieWonderEffectiveChordForBar(
  bar: number,
  context: CompositionContext,
  genMeta: GenerationMetadata & Record<string, unknown>
): string {
  const tb = context.form.totalBars;
  const eff = genMeta.stevieWonderEffectiveHarmonyBars as string[] | undefined;
  if (eff && eff.length === tb && bar >= 1 && bar <= tb) return eff[bar - 1]!;
  return resolveBarSymbol(context, bar).symbol;
}

function inferMajorMinorFromTonicBar(context: CompositionContext): 'major' | 'minor' {
  const t = inferTonicPitchClassFromBar1(context);
  if (t === undefined) return 'major';
  const sym = resolveBarSymbol(context, 1).symbol;
  return isTonicMinorish(sym, t) ? 'minor' : 'major';
}

function pentatonicRelativeOffsets(mode: 'major' | 'minor'): number[] {
  return mode === 'major' ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];
}

function snapPitchToPentatonic(pitch: number, tonicPc: number, mode: 'major' | 'minor'): number {
  const offs = pentatonicRelativeOffsets(mode);
  const pc = ((pitch % 12) + 12) % 12;
  if (offs.some((o) => (tonicPc + o) % 12 === pc)) return pitch;
  let best = pitch;
  let bestAbs = 7;
  for (const o of offs) {
    const targetPc = (tonicPc + o) % 12;
    for (let d = -6; d <= 6; d++) {
      const npc = (((pc + d) % 12) + 12) % 12;
      if (npc === targetPc && Math.abs(d) < bestAbs) {
        bestAbs = Math.abs(d);
        best = pitch + d;
      }
    }
  }
  return best;
}

/**
 * Device 5 — Pentatonic melody bias on voice 1: non-cadence bars only (bar % 4 !== 0).
 */
export function applyStevieWonderGuitarBarPasses(
  m: MeasureModel,
  bar: number,
  context: CompositionContext,
  seed: number,
  low: number,
  high: number
): void {
  void seed;
  if (bar % 4 === 0) return;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  if (tonicPc === undefined) return;
  const mode = inferMajorMinorFromTonicBar(context);

  const v1 = m.events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);
  if (v1.length === 0) return;

  let changed = false;
  for (const e of v1) {
    const snapped = snapPitchToPentatonic(e.pitch, tonicPc, mode);
    const clamped = Math.max(low, Math.min(high, snapped));
    if (clamped !== e.pitch) {
      e.pitch = clamped;
      changed = true;
    }
  }
  if (changed && context.generationMetadata) {
    const cur = (context.generationMetadata as GenerationMetadata & Record<string, unknown>)
      .stevieWonderPentatonicReceipts as string[] | undefined;
    const list = cur ?? [];
    list.push(`sw:device5:pentatonic_bias@bar${bar}`);
    (context.generationMetadata as GenerationMetadata & Record<string, unknown>).stevieWonderPentatonicReceipts =
      list;
  }
}

export function finalizeStevieWonderMetadata(
  metadata: GenerationMetadata,
  acc: StevieWonderHarmonyAccumulator,
  extraReceipts?: string[]
): void {
  const pent = (metadata as GenerationMetadata & Record<string, unknown>).stevieWonderPentatonicReceipts as
    | string[]
    | undefined;
  const flatDevices = [...(metadata.stevieWonderDeviceReceipts ?? []), ...(extraReceipts ?? [])];
  const deviceList = [...flatDevices, ...(pent ?? [])];
  const d = {
    songwriterId: 'stevie_wonder' as const,
    barsConsidered: acc.barsConsidered,
    sus4Touches: acc.sus4Touches,
    alteredDominantTouches: acc.alteredDominantTouches,
    extensionNines: acc.extensionNines,
    minorSeventhColour: acc.minorSeventhColour,
    deviceReceipts: deviceList.length ? deviceList : undefined,
  } as const;
  const receipt = [
    `Stevie Wonder (1972–76 slice): sus4≈${acc.sus4Touches}`,
    `altDom≈${acc.alteredDominantTouches}`,
    `9ths≈${acc.extensionNines}`,
    `m7Colour≈${acc.minorSeventhColour}`,
    `bars=${acc.barsConsidered}`,
    deviceList.length ? `devices=${deviceList.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.stevieWonderDiagnostics = { ...d };
  metadata.stevieWonderSliceReceipt = receipt;
}
