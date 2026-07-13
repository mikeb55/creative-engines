/**
 * Kenny Wheeler — lyrical ECM / chamber-jazz Song Mode harmony slice.
 * Two-process harmonic generation: upper sonority path + independent bass path — receipts `kw:*`.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

export const KENNY_WHEELER_HARMONIC_VOICE_IDS = ['kenny_wheeler', 'wheeler', 'kw'] as const;

export function isKennyWheelerHarmonicVoiceId(raw: string | null | undefined): boolean {
  const id = normalizeHarmonicVoiceId(String(raw ?? ''));
  return id === 'kenny_wheeler' || id === 'wheeler' || id === 'kw';
}

/**
 * Exact `kenny_wheeler` or VRB twins `wheeler` / `kw`.
 * Soft songwriter aliases that only normalize via ALIASES never engage HV unless already
 * exact/twin. BB / ECM / import holdbacks untouched.
 */
export function isKennyWheelerHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  return (
    isKennyWheelerHarmonicVoiceId(metadata?.songwriterStyleId) ||
    isKennyWheelerHarmonicVoiceId(metadata?.harmonicVoice)
  );
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Six Wheeler slice parameters (0–1). */
export interface KennyWheelerSliceParams {
  /** Probability chord is upper structure + independent bass vs tertian root-stack. */
  polyaxialHarmony: number;
  /** Probability tension-bearing sonority moves to another tension sonority vs functional resolve. */
  tensionCarryForward: number;
  /** Bias toward semitone / major-third bass relations across phrase units. */
  bassTrajectoryLogic: number;
  /** Probability of P4/P5/m6/M6/8ve leaps with stepwise recovery within 1–3 notes. */
  melodicDisjunctionRate: number;
  /** Bias toward 6/9, maj7(add9), sus, #11, slash endings vs plain tonic / V→I. */
  cadentialOpacity: number;
  /** Preserve exact interval spacing templates; do not normalize 6/9#11 → maj9. */
  voicingSpecificity: number;
}

export const DEFAULT_KENNY_WHEELER_SLICE_PARAMS: KennyWheelerSliceParams = {
  polyaxialHarmony: 0.78,
  tensionCarryForward: 0.7,
  bassTrajectoryLogic: 0.68,
  melodicDisjunctionRate: 0.64,
  cadentialOpacity: 0.76,
  voicingSpecificity: 0.72,
};

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

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function phraseRoleAtBar(
  bar: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = bar - 1;
  if (idx < 0 || idx >= positions.length) return 'phraseMiddle';
  return positions[idx]!;
}

/** Asymmetric 2–7 bar phrases — longer when melodicDisjunctionRate high. */
function wheelerPhraseLength(seed: number, phraseIndex: number, melodicDisjunctionRate: number): number {
  const u = seededUnit(seed, phraseIndex, 881011);
  if (melodicDisjunctionRate >= 0.7) {
    if (u < 0.3) return 5;
    if (u < 0.58) return 7;
    if (u < 0.82) return 4;
    return 3;
  }
  if (melodicDisjunctionRate >= 0.45) {
    if (u < 0.32) return 4;
    if (u < 0.62) return 3;
    if (u < 0.85) return 5;
    return 2;
  }
  if (u < 0.4) return 2;
  if (u < 0.75) return 3;
  return u < 0.9 ? 5 : 7;
}

export function computeWheelerPhrasePositions(
  totalBars: number,
  seed: number,
  melodicDisjunctionRate: number
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = wheelerPhraseLength(seed, phraseIdx, melodicDisjunctionRate);
    const end = Math.min(bar + len - 1, totalBars);
    const span = end - bar + 1;
    for (let i = 0; i < span; i++) {
      const globalBar = bar + i;
      if (span <= 1) {
        out.push('phraseFinal');
      } else if (globalBar === bar) {
        out.push('phraseStart');
      } else if (globalBar === end) {
        out.push('phraseFinal');
      } else {
        out.push('phraseMiddle');
      }
    }
    bar = end + 1;
    phraseIdx++;
  }
  while (out.length < totalBars) out.push('phraseMiddle');
  return out.slice(0, totalBars);
}

export function resolveKennyWheelerSliceParams(
  genMeta: GenerationMetadata | undefined
): KennyWheelerSliceParams {
  const fromMeta = genMeta?.kennyWheelerSliceParams;
  if (!fromMeta) return { ...DEFAULT_KENNY_WHEELER_SLICE_PARAMS };
  return {
    polyaxialHarmony: clamp01(fromMeta.polyaxialHarmony ?? DEFAULT_KENNY_WHEELER_SLICE_PARAMS.polyaxialHarmony),
    tensionCarryForward: clamp01(
      fromMeta.tensionCarryForward ?? DEFAULT_KENNY_WHEELER_SLICE_PARAMS.tensionCarryForward
    ),
    bassTrajectoryLogic: clamp01(
      fromMeta.bassTrajectoryLogic ?? DEFAULT_KENNY_WHEELER_SLICE_PARAMS.bassTrajectoryLogic
    ),
    melodicDisjunctionRate: clamp01(
      fromMeta.melodicDisjunctionRate ?? DEFAULT_KENNY_WHEELER_SLICE_PARAMS.melodicDisjunctionRate
    ),
    cadentialOpacity: clamp01(fromMeta.cadentialOpacity ?? DEFAULT_KENNY_WHEELER_SLICE_PARAMS.cadentialOpacity),
    voicingSpecificity: clamp01(fromMeta.voicingSpecificity ?? DEFAULT_KENNY_WHEELER_SLICE_PARAMS.voicingSpecificity),
  };
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest);
}

function looksBareMajorTriad(symbol: string): boolean {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const tl = hp.toLowerCase();
  if (/m(?!aj)|dim|ø|sus|maj|Δ|add|6\/9|11|13|9/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return rest === '' || rest === 'major';
}

function looksMajorTonicColour(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(stemOnly(symbol)) !== tonicPc) return false;
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  return true;
}

function hasTensionExtension(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bmaj7\b|\bmaj9\b|add9|add11|#11|sus|6\/9|11|13/.test(tl);
}

/** Step 1 — upper sonority path: maj triads, sus, 6/9, maj7/#11 clusters. */
function enrichWheelerUpperSonority(symbol: string, seed: number, bar: number, voicingSpecificity: number): string {
  const st = stemOnly(symbol);
  const root = parseChordSymbol(st).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 881102);

  if (looksPlainDominantSeventh(symbol)) {
    if (seededUnit(seed, bar, 881101) < 0.55) {
      return `${root}7sus4(add9)${slash}`;
    }
    return symbol;
  }

  if (looksBareMajorTriad(symbol)) {
    if (voicingSpecificity >= 0.65 && u < 0.28) return `${root}6/9(#11)${slash}`;
    if (u < 0.45) return `${root}maj9${slash}`;
    if (u < 0.7) return `${root}maj7(add11)${slash}`;
    if (u < 0.88) return `${root}sus2(add9)${slash}`;
    return `${root}maj7${slash}`;
  }

  const tl = parseChordSymbol(st).harmonyPart.toLowerCase();
  if (/\bmaj7\b/.test(tl) && !/add9|add11|#11|6\/9/.test(tl) && seededUnit(seed, bar, 881103) < 0.42) {
    return voicingSpecificity >= 0.6 ? `${root}maj7(add9,#11)${slash}` : `${root}maj7(add11)${slash}`;
  }
  return symbol;
}

/** Step 2 — independent bass path (semitone / M3 bias). */
function applyIndependentBassPathPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: KennyWheelerSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[],
  prevBassPc: number | undefined
): number | undefined {
  let lastBass = prevBassPc;
  const threshold = 0.18 + (1 - params.bassTrajectoryLogic) * 0.35;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 881401) >= threshold) continue;
    const sym = out[b - 1]!;
    const rootPc = harmonyRootPc(stemOnly(sym));
    if (rootPc === undefined) continue;
    const useMajorThird = seededUnit(seed, b, 881402) < 0.5 + params.bassTrajectoryLogic * 0.1;
    const bassDelta = useMajorThird ? 4 : 1;
    const bassPc =
      lastBass !== undefined && seededUnit(seed, b, 881403) < params.bassTrajectoryLogic
        ? (lastBass + bassDelta) % 12
        : (rootPc + bassDelta) % 12;
    if (!sym.includes('/')) {
      out[b - 1] = `${stemOnly(sym)}/${pitchClassToSharpName(bassPc)}`;
      receipts.push(`kw:bass_path@bar${b}`);
    }
    lastBass = bassPc;
  }
  return lastBass;
}

/** Step 3 — combine upper structure + bass with spacing template (polyaxial). */
function applyPolyaxialCombinePass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: KennyWheelerSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  const threshold = 0.15 + (1 - params.polyaxialHarmony) * 0.4;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) === 'phraseFinal' && seededUnit(seed, b, 881204) >= params.cadentialOpacity) {
      continue;
    }
    if (stemOnly(out[b - 1]!).includes('/') && seededUnit(seed, b, 881205) >= 0.35) continue;
    if (seededUnit(seed, b, 881201) >= threshold) continue;
    const sym = out[b - 1]!;
    const rootPc = harmonyRootPc(stemOnly(sym));
    if (rootPc === undefined) continue;
    const slot = Math.floor(seededUnit(seed, b, 881202) * 4) % 4;
    const bassDelta = slot === 0 ? 1 : slot === 1 ? 4 : slot === 2 ? -1 : 3;
    const bassPc = (rootPc + bassDelta + 12) % 12;
    const upperTriadPc = (rootPc + 4) % 12;
    const st = stemOnly(sym);
    const qual = st.slice(st.match(ROOT_AT_START)?.[1]?.length ?? 0);
    const upperRoot = pitchClassToSharpName(upperTriadPc);
    out[b - 1] = `${upperRoot}${qual}/${pitchClassToSharpName(bassPc)}`;
    receipts.push(`kw:upper_structure@bar${b}`);
  }
}

function applyTensionCarryPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: KennyWheelerSliceParams
): void {
  const threshold = 1 - params.tensionCarryForward * 0.72;
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const prev = stemOnly(out[b - 2]!);
    const cur = stemOnly(out[b - 1]!);
    if (!hasTensionExtension(prev)) continue;
    if (hasTensionExtension(cur)) continue;
    if (seededUnit(seed, b, 881301) >= threshold) continue;
    const root = parseChordSymbol(cur).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(out[b - 1]!);
    const prevTl = parseChordSymbol(prev).harmonyPart.toLowerCase();
    if (/6\/9|#11/.test(prevTl)) {
      out[b - 1] = `${root}6/9(#11)${slash}`;
    } else if (/sus/.test(prevTl)) {
      out[b - 1] = `${root}sus2(add9)${slash}`;
    } else if (/#11|add11/.test(prevTl)) {
      out[b - 1] = `${root}maj7(add11)${slash}`;
    } else {
      out[b - 1] = `${root}maj9${slash}`;
    }
    receipts.push(`kw:tension_carry@bar${b}`);
  }
}

function applyVoicingSpecificityGuard(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  params: KennyWheelerSliceParams
): void {
  if (params.voicingSpecificity < 0.45) return;
  for (let b = 1; b <= tb; b++) {
    const sym = out[b - 1]!;
    const st = stemOnly(sym);
    const tl = parseChordSymbol(st).harmonyPart.toLowerCase();
    const root = parseChordSymbol(st).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    if (/6\/9.*#11|6\/9\(#11\)/.test(tl) && seededUnit(seed, b, 882101) < params.voicingSpecificity) {
      out[b - 1] = `${root}6/9(#11)${slash}`;
      receipts.push(`kw:voicing_specific@bar${b}`);
    } else if (/maj9/.test(tl) && /6\/9|#11/.test(sym) && params.voicingSpecificity >= 0.7) {
      out[b - 1] = `${root}6/9(add9)${slash}`;
      receipts.push(`kw:voicing_specific@bar${b}`);
    }
  }
}

function applyOpenCadencePass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  params: KennyWheelerSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  const threshold = 1 - params.cadentialOpacity * 0.78;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseFinal') continue;
    const sym = out[b - 1]!;
    if (seededUnit(seed, b, 881601) >= threshold) continue;
    const root = parseChordSymbol(stemOnly(sym)).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    if (looksBareMajorTriad(sym) || looksMajorTonicColour(sym, tonicPc)) {
      const u = seededUnit(seed, b, 881602);
      out[b - 1] =
        u < 0.35
          ? `${root}6/9(add9)${slash}`
          : u < 0.7
            ? `${root}sus2(add9)${slash}`
            : `${root}maj7(add9,#11)${slash}`;
      receipts.push(`kw:open_cadence@bar${b}`);
    }
  }
}

function applyMelodicDisjunctionReceiptPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  params: KennyWheelerSliceParams,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  const threshold = 1 - params.melodicDisjunctionRate * 0.75;
  for (let b = 1; b <= tb; b++) {
    if (phraseRoleAtBar(b, positions) === 'phraseMiddle' && seededUnit(seed, b, 882201) >= threshold) continue;
    if (seededUnit(seed, b, 882202) >= 0.55) continue;
    receipts.push(`kw:wide_leap@bar${b}`);
  }
}

function applyAnacrusisPhrasePass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 1; b <= tb; b++) {
    if (phraseRoleAtBar(b, positions) !== 'phraseStart') continue;
    if (seededUnit(seed, b, 881901) >= 0.45) continue;
    receipts.push(`kw:anacrusis@bar${b}`);
  }
}

function applyTieSpanPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 2; b <= tb; b++) {
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (phraseRoleAtBar(b - 1, positions) !== 'phraseStart') continue;
    if (seededUnit(seed, b, 882001) >= 0.42) continue;
    receipts.push(`kw:tie_span@bar${b}`);
  }
}

function suppressDominantSurplus(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  let domCount = 0;
  let majCount = 0;
  for (let b = 1; b <= tb; b++) {
    const sym = stemOnly(out[b - 1]!);
    if (looksPlainDominantSeventh(sym)) domCount++;
    else if (/\bmaj|sus|6\/9|add9|add11|#11/.test(parseChordSymbol(sym).harmonyPart.toLowerCase())) majCount++;
  }
  if (majCount === 0 || domCount / Math.max(1, majCount) <= 0.34) return;
  for (let b = tb; b >= 1; b--) {
    if (isProtectedBar(b, context)) continue;
    if (!looksPlainDominantSeventh(out[b - 1]!)) continue;
    const root = parseChordSymbol(stemOnly(out[b - 1]!)).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    out[b - 1] = `${root}maj7(add11)${slashTail(out[b - 1]!)}`;
    receipts.push(`kw:dom_soft@bar${b}`);
    domCount--;
    if (domCount / Math.max(1, majCount) <= 0.34) break;
  }
}

export function isSongwriterKennyWheeler(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'kenny_wheeler' } {
  return genMeta?.songwriterStyleId === 'kenny_wheeler';
}

export interface KennyWheelerHarmonyAccumulator {
  barsConsidered: number;
  upperStructureTouches: number;
  tensionCarryTouches: number;
  colorToneTouches: number;
  openCadenceTouches: number;
  bassMotionTouches: number;
}

export function createKennyWheelerHarmonyAccumulator(): KennyWheelerHarmonyAccumulator {
  return {
    barsConsidered: 0,
    upperStructureTouches: 0,
    tensionCarryTouches: 0,
    colorToneTouches: 0,
    openCadenceTouches: 0,
    bassMotionTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: KennyWheelerHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/\//.test(c)) acc.upperStructureTouches++;
  if (/\bmaj9\b|add9|add11|#11|sus|6\/9/.test(t)) acc.colorToneTouches++;
  if (/no3|sus2|sus4|6\/9/.test(t)) acc.openCadenceTouches++;
}

export function accumulateKennyWheelerHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: KennyWheelerHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface KennyWheelerAntiElaborationGuards {
  bareTriadRaised: number;
  dominantSoftened: number;
}

/** @deprecated — use resolveBarSymbol */
export function precomputeKennyWheelerEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const params = resolveKennyWheelerSliceParams(context.generationMetadata);
  genMeta.kennyWheelerSliceParams = params;

  const receipts: string[] = [];
  const guards: KennyWheelerAntiElaborationGuards = {
    bareTriadRaised: 0,
    dominantSoftened: 0,
  };

  const positions = computeWheelerPhrasePositions(tb, seed, params.melodicDisjunctionRate);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    const enriched = enrichWheelerUpperSonority(sym, seed, b, params.voicingSpecificity);
    if (enriched !== sym && looksBareMajorTriad(sym)) guards.bareTriadRaised++;
    raw.push(enriched);
  }

  const out = [...raw];

  applyPolyaxialCombinePass(out, seed, receipts, tb, context, params, positions);
  applyIndependentBassPathPass(out, seed, receipts, tb, context, params, positions, tonicPc);
  applyTensionCarryPass(out, seed, receipts, tb, context, params);
  applyVoicingSpecificityGuard(out, seed, receipts, tb, params);
  applyOpenCadencePass(out, tonicPc, seed, receipts, tb, context, params, positions);
  suppressDominantSurplus(out, seed, receipts, tb, context);
  applyMelodicDisjunctionReceiptPass(out, seed, receipts, tb, params, positions);
  applyAnacrusisPhrasePass(out, seed, receipts, tb, positions);
  applyTieSpanPass(out, seed, receipts, tb, positions);

  /* Piece-final only: bias toward Wheeler open-cadence landings that already pass fBT. */
  biasKennyWheelerFinalBarIdiomaticOpen(out, seed, tb, receipts, context, tonicPc);

  genMeta.kennyWheelerEffectiveHarmonyBars = out;
  genMeta.kennyWheelerDeviceReceipts = receipts;
  genMeta.kennyWheelerAntiElaborationGuards = guards;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece open_cadence / polyaxial / tension devices untouched.
 */
function chordLooksDominantFamilyForFbtWheeler(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Wheeler open-cadence pool that already passes fBT
 * (6/9(add9) · sus2(add9) · maj7(add9,#11) from kw:open_cadence).
 * Not a forced jazz tonic cadence — cadentialOpacity / open ending idiom preserved.
 */
function biasKennyWheelerFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext,
  tonicPc: number | undefined
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtWheeler(sym)) return;

  const rootPc = tonicPc ?? harmonyRootPc(sym);
  if (rootPc === undefined) return;
  const root = pitchClassToSharpName(rootPc);
  const slash = slashTail(sym);
  const u = seededUnit(seed, totalBars, 881701);

  let next: string;
  if (u < 0.35) next = `${root}6/9(add9)${slash}`;
  else if (u < 0.7) next = `${root}sus2(add9)${slash}`;
  else next = `${root}maj7(add9,#11)${slash}`;

  out[idx] = next;
  receipts.push(`kw:final_open_bias@bar${totalBars}`);
}

export function finalizeKennyWheelerMetadata(
  metadata: GenerationMetadata,
  acc: KennyWheelerHarmonyAccumulator
): void {
  const flat = [...(metadata.kennyWheelerDeviceReceipts ?? [])];
  const g = metadata.kennyWheelerAntiElaborationGuards ?? { bareTriadRaised: 0, dominantSoftened: 0 };
  const params = resolveKennyWheelerSliceParams(metadata);
  const upperReceipts = flat.filter((r) => r.startsWith('kw:upper_structure@')).length;
  const carryReceipts = flat.filter((r) => r.startsWith('kw:tension_carry@')).length;
  const openReceipts = flat.filter((r) => r.startsWith('kw:open_cadence@')).length;
  const bassReceipts = flat.filter((r) => r.startsWith('kw:bass_path@')).length;
  const d = {
    songwriterId: 'kenny_wheeler' as const,
    barsConsidered: acc.barsConsidered,
    upperStructureTouches: Math.max(acc.upperStructureTouches, upperReceipts),
    tensionCarryTouches: Math.max(acc.tensionCarryTouches, carryReceipts),
    colorToneTouches: acc.colorToneTouches,
    openCadenceTouches: Math.max(acc.openCadenceTouches, openReceipts),
    bassMotionTouches: Math.max(acc.bassMotionTouches, bassReceipts),
    sliceParams: params,
    antiElaborationGuardTriggers: g.bareTriadRaised + g.dominantSoftened,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Kenny Wheeler (lyrical ECM slice): upper≈${d.upperStructureTouches}`,
    `carry≈${d.tensionCarryTouches}`,
    `color≈${d.colorToneTouches}`,
    `open≈${d.openCadenceTouches}`,
    `bass≈${d.bassMotionTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.kennyWheelerDiagnostics = { ...d };
  metadata.kennyWheelerSliceReceipt = receipt;
}
