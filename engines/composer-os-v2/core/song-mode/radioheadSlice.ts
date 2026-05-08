/**
 * Radiohead — OK Computer / Kid A / Amnesiac / Hail to the Thief era Song Mode / duo golden-path slice.
 * Modal Phrygian colour, borrowed harmony, delayed tonic — layered on locked harmony.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
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

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function looksLikeMajorTriadOrMaj7(symbol: string): boolean {
  const t = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(t)) return false;
  return true;
}

function looksLikeIvMajorSubdominant(symbol: string, tonicPc: number): boolean {
  const r = harmonyRootPc(symbol);
  if (r !== (tonicPc + 5) % 12) return false;
  const t = symbol.toLowerCase();
  if (/m(?!aj)|dim/.test(t)) return false;
  return true;
}

export interface RadioheadHarmonyAccumulator {
  barsConsidered: number;
  maj7Touches: number;
  minorTriadTouches: number;
  borrowedModalTouches: number;
  slashPedalTouches: number;
}

export function createRadioheadHarmonyAccumulator(): RadioheadHarmonyAccumulator {
  return {
    barsConsidered: 0,
    maj7Touches: 0,
    minorTriadTouches: 0,
    borrowedModalTouches: 0,
    slashPedalTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: RadioheadHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = c.toLowerCase();
  if (/\bmaj7\b|maj9|Δ/.test(t)) acc.maj7Touches++;
  if (/^([a-g][#b]?)m(?!aj)/i.test(parseChordSymbol(c).harmonyPart) || /\bm\b/.test(t)) acc.minorTriadTouches++;
  if (/\/[a-g]/i.test(c)) acc.slashPedalTouches++;
  if (/dbmaj7|eb6|bii|biii|bvi|bvii/i.test(t) || t.includes('biii')) acc.borrowedModalTouches++;
}

export function accumulateRadioheadHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: RadioheadHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface RadioheadDeviceReceipts {
  deviceReceipts: string[];
}

/** Hygiene: avoid dominant 7 / sus4 delays per era fingerprint — keep maj7/m7 core vocabulary. */
export function rhStripAvoidListColours(out: string[]): void {
  for (let i = 0; i < out.length; i++) {
    let s = out[i]!.trim();
    const hp = parseChordSymbol(s).harmonyPart;
    const tl = hp.toLowerCase();
    if (/sus4|sus2/i.test(tl)) {
      const r = harmonyRootPc(s);
      if (r !== undefined) out[i] = pitchClassToSharpName(r);
      continue;
    }
    if ((/\b7\b|9|11|13|alt|°|ø/.test(tl) || /7/.test(tl)) && !/maj7|m7|mmaj7|dim7/.test(tl)) {
      const r = harmonyRootPc(s);
      if (r !== undefined) {
        const base = pitchClassToSharpName(r);
        const rest = hp.replace(ROOT_AT_START, '').replace(/7|9|11|13|alt|\(.*?\)/gi, '');
        const slash = s.includes('/') ? s.slice(s.indexOf('/')) : '';
        out[i] = `${base}${rest.replace(/^[-]?7.*$/i, '')}${slash}`.replace(/([^/]+)$/, (_, m: string) =>
          m.replace(/7$/i, '')
        );
        const simp = parseChordSymbol(out[i]!).harmonyPart;
        const nm = simp.match(ROOT_AT_START);
        const rootNm = nm?.[1];
        if (rootNm) {
          const rr = noteNameToPitchClass(rootNm);
          const tail = simp.slice(rootNm.length).replace(/7$|9$|11$|13$/i, '');
          if (rr !== undefined) {
            out[i] = `${pitchClassToSharpName(rr)}${tail}${slash}`;
          }
        }
      }
    }
  }
}

/** Device 5 — Absent tonic at verse opens: withhold clear tonic triad for first four bars (modal borrow). */
export function rhApplyDevice5AbsentTonic(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
}): void {
  const { context, tonicPc, out, receipts, seed } = params;
  if (tonicPc === undefined) return;
  const bar1Chord = resolveBarSymbol(context, 1).symbol;
  const keyMinor = (() => {
    const t = bar1Chord.toLowerCase();
    return /^([a-g][#b]?)m(?!aj)/i.test(parseChordSymbol(bar1Chord).harmonyPart) || /\bm(in)?\b/.test(t);
  })();

  for (const sec of context.form.sections) {
    if (coarseSectionRoleFromBar(sec.startBar, context) !== 'verse') continue;
    const end = Math.min(sec.startBar + 3, out.length);
    for (let b = sec.startBar; b <= end; b++) {
      const i = b - 1;
      const raw = out[i]!;
      const r = harmonyRootPc(raw);
      if (r !== tonicPc) continue;
      if (seededUnit(seed, b, 94105) > 0.78) continue;
      if (keyMinor) {
        const bIII = pitchClassToSharpName((tonicPc + 3) % 12);
        out[i] = `${bIII}maj7`;
      } else {
        const vi = pitchClassToSharpName((tonicPc + 9) % 12);
        out[i] = `${vi}m`;
      }
      receipts.deviceReceipts.push(`rh:device5:absent_tonic@bar${b}`);
    }
  }
}

/** Device 1 — Phrygian pedal colours on verse, phrase beats 1–2 (b % 4 === 1 or 2). */
export function rhApplyDevice1PhrygianPedal(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
}): void {
  const { context, tonicPc, out, receipts, seed } = params;
  if (tonicPc === undefined) return;
  const tonicName = pitchClassToSharpName(tonicPc);
  const bII = pitchClassToSharpName((tonicPc + 1) % 12);

  for (let b = 1; b <= out.length; b++) {
    if (coarseSectionRoleFromBar(b, context) !== 'verse') continue;
    const m = b % 4;
    if (m !== 1 && m !== 2) continue;
    if (seededUnit(seed, b, 94101) > 0.72) continue;
    const i = b - 1;
    if (m === 1) {
      out[i] = `${tonicName}maj7/${tonicName}`;
      receipts.deviceReceipts.push(`rh:device1:phrygian_pedal@bar${b}`);
    } else {
      out[i] = `${bII}maj7/${tonicName}`;
      receipts.deviceReceipts.push(`rh:device1:phrygian_pedal@bar${b}`);
    }
  }
}

/** Device 4 — Borrowed iv at emotional peak (b % 8 === 0) in major key. */
export function rhApplyDevice4BorrowedIv(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
}): void {
  const { context, tonicPc, out, receipts, seed } = params;
  if (tonicPc === undefined) return;
  const bar1Chord = resolveBarSymbol(context, 1).symbol;
  const keyMinor =
    /^([a-g][#b]?)m(?!aj)/i.test(parseChordSymbol(bar1Chord).harmonyPart) ||
    bar1Chord.toLowerCase().includes('m');
  if (keyMinor) return;

  for (let b = 1; b <= out.length; b++) {
    if (b % 8 !== 0) continue;
    if (seededUnit(seed, b, 94104) > 0.85) continue;
    const i = b - 1;
    const chord = out[i]!;
    if (!looksLikeIvMajorSubdominant(chord, tonicPc)) continue;
    const ivPc = (tonicPc + 5) % 12;
    const name = pitchClassToSharpName(ivPc);
    out[i] = `${name}m`;
    receipts.deviceReceipts.push(`rh:device4:borrowed_iv@bar${b}`);
  }
}

/** Device 3 — Chromatic insertion a semitone above tonic root; once per 8-bar cycle. */
export function rhApplyDevice3ChromaticInsertion(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
}): void {
  const { tonicPc, out, receipts, seed } = params;
  if (tonicPc === undefined) return;
  const tb = out.length;
  const chromPc = (tonicPc + 1) % 12;
  const chromName = pitchClassToSharpName(chromPc);

  for (let phrase = 0; phrase * 8 < tb; phrase++) {
    const start = phrase * 8 + 1;
    const end = Math.min((phrase + 1) * 8, tb);
    let pick = start;
    let u = seededUnit(seed, phrase + 700, 94103);
    pick = start + Math.floor(u * (end - start + 1));
    if (pick > end) pick = end;
    if (pick < 1 || pick > tb) continue;
    if (seededUnit(seed, phrase, 94106) > 0.55) continue;
    const i = pick - 1;
    out[i] = `${chromName}`;
    receipts.deviceReceipts.push(`rh:device3:chromatic_insertion@bar${pick}`);
  }
}

/** Device 2 — Parallel maj/min: two bars same-root major → following two bars same-root minor (4-bar units). */
export function rhApplyDevice2ParallelAlternation(params: {
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
}): void {
  const { out, receipts, seed } = params;
  const tb = out.length;
  for (let start = 1; start <= tb - 3; start += 4) {
    const b4 = start + 3;
    if (b4 % 8 === 0) continue;
    const b1 = start;
    const b2 = start + 1;
    const b3 = start + 2;
    const i0 = b1 - 1;
    const i1 = b2 - 1;
    const i2 = b3 - 1;
    const i3 = b4 - 1;
    const r0 = harmonyRootPc(out[i0]!);
    const r1 = harmonyRootPc(out[i1]!);
    if (r0 === undefined || r1 === undefined || r0 !== r1) continue;
    if (!looksLikeMajorTriadOrMaj7(out[i0]!) || !looksLikeMajorTriadOrMaj7(out[i1]!)) continue;
    if (seededUnit(seed, start, 94102) > 0.68) continue;
    const name = pitchClassToSharpName(r0);
    out[i2] = `${name}m`;
    out[i3] = `${name}m`;
    receipts.deviceReceipts.push(`rh:device2:parallel_alternation@bar${b3}`);
  }
}

export function precomputeRadioheadEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const receipts: RadioheadDeviceReceipts = { deviceReceipts: [] };
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const seed = context.seed;
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    out.push(resolveBarSymbol(context, b).symbol);
  }

  rhApplyDevice5AbsentTonic({ context, tonicPc, out, receipts, seed });
  rhApplyDevice1PhrygianPedal({ context, tonicPc, out, receipts, seed });
  rhApplyDevice4BorrowedIv({ context, tonicPc, out, receipts, seed });
  rhApplyDevice3ChromaticInsertion({ context, tonicPc, out, receipts, seed });
  rhApplyDevice2ParallelAlternation({ out, receipts, seed });
  rhStripAvoidListColours(out);

  genMeta.radioheadEffectiveHarmonyBars = out;
  genMeta.radioheadDeviceReceipts = receipts.deviceReceipts;
}

export function finalizeRadioheadMetadata(metadata: GenerationMetadata, acc: RadioheadHarmonyAccumulator): void {
  const flat = [...(metadata.radioheadDeviceReceipts ?? [])];
  const d = {
    songwriterId: 'radiohead' as const,
    barsConsidered: acc.barsConsidered,
    maj7Touches: acc.maj7Touches,
    minorTriadTouches: acc.minorTriadTouches,
    borrowedModalTouches: acc.borrowedModalTouches,
    slashPedalTouches: acc.slashPedalTouches,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Radiohead (OK Computer–era slice): maj7≈${acc.maj7Touches}`,
    `m≈${acc.minorTriadTouches}`,
    `borrowed/modal≈${acc.borrowedModalTouches}`,
    `slash≈${acc.slashPedalTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.radioheadDiagnostics = { ...d };
  metadata.radioheadSliceReceipt = receipt;
}
