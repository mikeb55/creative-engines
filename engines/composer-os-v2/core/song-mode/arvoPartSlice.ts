/**
 * Arvo Pärt — tintinnabuli / sparse triadic harmony slice (Song Mode / duo golden-path).
 * Lead-sheet symbols — triads only — receipts **`ap:*`** (`d1`–`d5`).
 */

import type { ArvoPartContextMode, CompositionContext, GenerationMetadata } from '../compositionContext';
import { getChordForBar } from '../harmony/harmonyResolution';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function harmonyHead(symbol: string): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  return slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
}

function transposeChordRoot(symbol: string, deltaPc: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const rootPc = noteNameToPitchClass(m[1]);
  if (rootPc === undefined) return symbol;
  const rest = head.slice(m[1].length);
  const newRoot = pitchClassToSharpName((rootPc + deltaPc + 12) % 12);
  const slash = slashTail(symbol);
  return `${newRoot}${rest}${slash}`;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = h.indexOf('/');
  const head = slashIdx >= 0 ? h.slice(0, slashIdx) : h;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

/** Reduce symbol to tertian triad (major / minor / dim / aug); strips 7ths, sus, and extensions. */
function stripChordToTriad(symbol: string): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const slash = slashIdx >= 0 ? hp.slice(slashIdx) : '';
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = head.slice(root.length).replace(/\s/g, '');
  const tl = rest.toLowerCase();
  if (/^sus/.test(tl)) {
    return `${root}${slash}`;
  }
  if (/dim|°|o\b/.test(tl)) return `${root}dim${slash}`;
  if (/aug|\+/.test(tl)) return `${root}aug${slash}`;
  if (/^m(?!aj)|min/.test(tl)) return `${root}m${slash}`;
  return `${root}${slash}`;
}

function triadChordTonePcs(symbol: string): number[] {
  const rpc = harmonyRootPc(symbol);
  if (rpc === undefined) return [];
  const head = harmonyHead(symbol);
  const tl = head.toLowerCase();
  if (/dim|°/.test(tl)) return [rpc, (rpc + 3) % 12, (rpc + 6) % 12];
  if (/aug|\+/.test(tl)) return [rpc, (rpc + 4) % 12, (rpc + 8) % 12];
  if (/m(?!aj)|min/.test(tl) || /^[a-g][#b]?m([^a-z]|$)/i.test(head.replace(/\s/g, ''))) {
    return [rpc, (rpc + 3) % 12, (rpc + 7) % 12];
  }
  return [rpc, (rpc + 4) % 12, (rpc + 7) % 12];
}

function nearestTriadToneFromM(
  mPc: number,
  triadPcs: number[],
  mode: 'above' | 'below' | 'indexed',
  bar: number
): number {
  const uniq = [...new Set(triadPcs)].sort((a, b) => a - b);
  if (uniq.length === 0) return ((mPc % 12) + 12) % 12;
  if (mode === 'indexed') {
    return uniq[bar % uniq.length]!;
  }
  const m = ((mPc % 12) + 12) % 12;
  if (mode === 'above') {
    let best = uniq[0]!;
    let bestUp = 12;
    for (const t of uniq) {
      const up = (t - m + 12) % 12;
      const dist = up === 0 ? 0 : up;
      if (dist < bestUp) {
        bestUp = dist;
        best = t;
      }
    }
    return best;
  }
  let bestB = uniq[0]!;
  let bestDown = 12;
  for (const t of uniq) {
    const down = (m - t + 12) % 12;
    const dist = down === 0 ? 0 : down;
    if (dist < bestDown) {
      bestDown = dist;
      bestB = t;
    }
  }
  return bestB;
}

export interface ArvoPartHarmonyAccumulator {
  barsConsidered: number;
  pedalTouches: number;
}

export function createArvoPartHarmonyAccumulator(): ArvoPartHarmonyAccumulator {
  return {
    barsConsidered: 0,
    pedalTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: ArvoPartHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  if (hp.includes('/')) acc.pedalTouches++;
}

export function accumulateArvoPartHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: ArvoPartHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

/** d1 — tintinnabuli_voice: M-voice proxy → T-voice nearest triad tone (receipts only). */
function applyTintinnabuliReceiptsPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  _ctx: ArvoPartContextMode
): void {
  for (let b = 1; b <= tb; b++) {
    const sym = out[b - 1]!;
    const mPc = Math.floor(seededUnit(seed, b, 887101) * 12);
    const tri = triadChordTonePcs(sym);
    const mode: 'above' | 'below' | 'indexed' = b % 3 === 0 ? 'above' : b % 3 === 1 ? 'below' : 'indexed';
    const tPc = nearestTriadToneFromM(mPc, tri, mode, b);
    receipts.push(`ap:d1_tintinnabuli_voice@bar${b}|m=${mPc}|t=${tPc}|mode=${mode}`);
  }
}

/** d2 — silence_as_structure: hold previous harmony. */
function applySilenceAsStructurePass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 887201) >= 0.26) continue;
    out[b - 1] = out[b - 2]!;
    receipts.push(`ap:d2_silence_as_structure@bar${b}`);
  }
}

/** d3 — additive_rhythm (form-level receipt). */
function applyAdditiveRhythmReceiptPass(seed: number, receipts: string[], tb: number, ctx: ArvoPartContextMode): void {
  const cells = ctx === 'fur_alina' ? '3+3+2' : ctx === 'spiegel' ? '2+2+2+2' : '5+3';
  receipts.push(`ap:d3_additive_rhythm|cells=${cells}|tb=${tb}|seed=${seed % 10000}`);
}

/** d4 — register_arch — golden-section climax hint. */
function applyRegisterArchReceiptPass(tb: number, seed: number, receipts: string[]): void {
  if (tb < 8) return;
  const climaxBar = Math.max(2, Math.min(tb - 1, Math.floor(tb * 0.618)));
  if (seededUnit(seed, climaxBar, 887301) >= 0.55) return;
  receipts.push(`ap:d4_register_arch@bar${climaxBar}`);
}

function triadIsMinorHead(head: string): boolean {
  const tl = head.toLowerCase();
  if (/dim|aug|°|\+/.test(tl)) return false;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = head.slice(m[1].length).replace(/\s/g, '').toLowerCase();
  return /^m(?!aj)|min/.test(rest);
}

/** d5 — triadic_transformation — slow root motion / parallel major–minor toggle. */
function applyTriadicTransformationPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: ArvoPartContextMode
): void {
  const step = ctx === 'fur_alina' ? 3 : ctx === 'spiegel' ? 4 : 5;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const u = seededUnit(seed, b, 887401);
    if (u >= 0.22) continue;
    const sym = out[b - 1]!;
    const head = harmonyHead(sym);
    const tl = head.toLowerCase();
    if (ctx === 'spiegel' && u < 0.11 && !/dim|aug/.test(tl)) {
      const root = head.match(ROOT_AT_START)?.[1];
      if (root) {
        const slash = slashTail(sym);
        const minor = triadIsMinorHead(head);
        out[b - 1] = minor ? `${root}${slash}` : `${root}m${slash}`;
        receipts.push(`ap:d5_triadic_transformation@bar${b}|parallel`);
        continue;
      }
    }
    out[b - 1] = transposeChordRoot(sym, step);
    receipts.push(`ap:d5_triadic_transformation@bar${b}|transpose=${step}`);
  }
}

/** Pedal bass: tonic in bass under shifting triads. */
function applyDronePedalPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const tonicName = pitchClassToSharpName(tonicPc);
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 887501) >= 0.34) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    const rpc = harmonyRootPc(sym);
    if (rpc === tonicPc) continue;
    out[b - 1] = `${sym}/${tonicName}`;
    receipts.push(`ap:pedal_bass@bar${b}`);
  }
}

export interface ArvoPartAntiElaborationGuards {
  noopTriad: number;
}

export function precomputeArvoPartEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const apCtx: ArvoPartContextMode = genMeta.arvoPartContext ?? 'fur_alina';
  genMeta.arvoPartContext = apCtx;

  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: ArvoPartAntiElaborationGuards = { noopTriad: 0 };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = getChordForBar(b, context);
    const before = sym;
    sym = stripChordToTriad(sym);
    if (sym === before) guards.noopTriad++;
    raw.push(sym);
  }

  const out = [...raw];

  applyTriadicTransformationPass(out, seed, receipts, tb, context, apCtx);
  applySilenceAsStructurePass(out, seed, receipts, tb, context);
  applyDronePedalPass(out, tonicPc, seed, receipts, tb, context);
  applyTintinnabuliReceiptsPass(out, seed, receipts, tb, apCtx);
  applyAdditiveRhythmReceiptPass(seed, receipts, tb, apCtx);
  applyRegisterArchReceiptPass(tb, seed, receipts);

  for (let b = 1; b <= tb; b++) {
    out[b - 1] = stripChordToTriad(out[b - 1]!);
  }

  genMeta.arvoPartEffectiveHarmonyBars = out;
  genMeta.arvoPartDeviceReceipts = receipts;
  genMeta.arvoPartAntiElaborationGuards = guards;
}

export function finalizeArvoPartMetadata(metadata: GenerationMetadata, acc: ArvoPartHarmonyAccumulator): void {
  const flat = [...(metadata.arvoPartDeviceReceipts ?? [])];
  const g = metadata.arvoPartAntiElaborationGuards ?? { noopTriad: 0 };
  const d1 = flat.filter((r) => r.includes('ap:d1_')).length;
  const d2 = flat.filter((r) => r.includes('ap:d2_')).length;
  const d3 = flat.filter((r) => r.includes('ap:d3_')).length;
  const d4 = flat.filter((r) => r.includes('ap:d4_')).length;
  const d5 = flat.filter((r) => r.includes('ap:d5_')).length;

  metadata.arvoPartDiagnostics = {
    songwriterId: 'arvo_part',
    barsConsidered: acc.barsConsidered,
    tintinnabuliTouches: d1,
    silenceAsStructureTouches: d2,
    additiveRhythmTouches: d3,
    registerArchTouches: d4,
    triadicTransformTouches: d5,
    pedalTouches: acc.pedalTouches,
    antiElaborationGuardTriggers: g.noopTriad,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  };
  const receipt = [
    `Arvo Pärt (slice): tintinnabuli=${d1}`,
    `silence=${d2}`,
    `additive=${d3}`,
    `register=${d4}`,
    `transform=${d5}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 12).join(';')}${flat.length > 12 ? '…' : ''}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.arvoPartSliceReceipt = receipt;
}
