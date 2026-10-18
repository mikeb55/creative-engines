/**
 * Arvo Pärt — tintinnabuli / sparse triadic harmony slice (Song Mode / duo golden-path).
 * Lead-sheet symbols — triads only — receipts **`ap:*`** (`d1`–`d5`).
 * Real M-voice + T-voice dual layer: {@link applyArvoPartTintinnabuliToDuoScore}.
 *
 * **GCE:** Static harmonic field (single chord / `tonic_wash`) weakens “section contrast” and
 * “harmonic rhythm” pillars that assume chord changes — acceptable for this slice by design.
 */

import type {
  ArvoPartContextMode,
  ArvoPartTintinnabuliParams,
  ArvoPartTintinnabuliPosition,
  ArvoPartTintinnabuliVoiceMode,
  CompositionContext,
  GenerationMetadata,
} from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { lockedHarmonyChordSymbolsEquivalent } from '../harmony/chordProgressionParser';
import { isProtectedBar } from '../score-integrity/identityLock';
import type { PartModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import { normalizeMeasureToEighthBeatGrid } from '../score-integrity/duoEighthBeatGrid';
import { clampPitch } from '../goldenPath/guitarBassDuoHarmony';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';

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
  if (/^tonic_wash$/i.test(h.trim())) return undefined;
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

function triadIsMinorHead(head: string): boolean {
  const tl = head.toLowerCase();
  if (/dim|aug|°|\+/.test(tl)) return false;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = head.slice(m[1].length).replace(/\s/g, '').toLowerCase();
  return /^m(?!aj)|min/.test(rest);
}

/** Resolved wash symbol for `tonic_wash` or inference when harmony omits root. */
export function buildWashTriadSymbol(context: CompositionContext): string {
  const genMeta = context.generationMetadata as GenerationMetadata & { arvoPartTintinnabuli?: ArvoPartTintinnabuliParams };
  const p = genMeta.arvoPartTintinnabuli;
  const explicitRoot = p?.triadRoot?.trim();
  if (explicitRoot) {
    const pc = noteNameToPitchClass(explicitRoot.replace(/m$/i, ''));
    if (pc !== undefined) {
      const name = pitchClassToSharpName(pc);
      const minor = p?.triadQuality === 'minor' || /m$/i.test(explicitRoot);
      return minor ? `${name}m` : name;
    }
    return explicitRoot;
  }
  const inferred = inferTonicPitchClassFromBar1(context);
  if (inferred !== undefined) {
    const name = pitchClassToSharpName(inferred);
    return p?.triadQuality === 'minor' ? `${name}m` : name;
  }
  return p?.triadQuality === 'minor' ? 'Cm' : 'C';
}

export function substituteBarSymbolForArvo(context: CompositionContext, sym: string): string {
  if (/^tonic_wash$/i.test(sym.trim())) return buildWashTriadSymbol(context);
  return sym;
}

function sectionLabelForBar(bar: number, context: CompositionContext): string {
  const s = context.form.sections.find((sec) => bar >= sec.startBar && bar < sec.startBar + sec.length);
  return s?.label ?? 'A';
}

function scaleDegreesDiatonic(rootPc: number, quality: 'major' | 'minor'): number[] {
  const intervals =
    quality === 'minor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  return intervals.map((i) => (rootPc + i) % 12);
}

function midiForDegree(idx: number, scalePcs: number[], preferMidi: number, low: number, high: number): number {
  const pc = scalePcs[idx % 7]!;
  let m = preferMidi;
  for (let k = 0; k < 48; k++) {
    if (((m % 12) + 12) % 12 === pc) break;
    if ((((m % 12) + 12) % 12) < pc) m++;
    else m--;
  }
  while (m < low) m += 12;
  while (m > high) m -= 12;
  return clampPitch(m, low, high);
}

function pitchClassOf(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

/** Nearest triad pitch strictly above or below `melody`, inside the voice range. No non-triad fallback. */
function nearestTriadTone(
  melody: number,
  triadPcs: number[],
  direction: 'above' | 'below',
  low: number,
  high: number,
): number | null {
  if (triadPcs.length === 0 || low > high) return null;
  const step = direction === 'above' ? 1 : -1;
  for (let midi = melody + step; direction === 'above' ? midi <= high : midi >= low; midi += step) {
    if (midi < low || midi > high) continue;
    if (triadPcs.includes(pitchClassOf(midi))) return midi;
  }
  return null;
}

function rootMidiInRange(rootPc: number, low: number, high: number, prefer: number): number | null {
  let best: number | null = null;
  let distance = 99;
  for (let midi = low; midi <= high; midi++) {
    if (pitchClassOf(midi) !== rootPc) continue;
    const next = Math.abs(midi - prefer);
    if (best === null || next < distance) {
      best = midi;
      distance = next;
    }
  }
  return best;
}

function resolveTintParams(
  context: CompositionContext,
  triadSym: string
): {
  rootPc: number;
  triadQuality: 'major' | 'minor';
  position: ArvoPartTintinnabuliPosition;
  mode: ArvoPartTintinnabuliVoiceMode;
  effectiveTriadSym: string;
} {
  const md = context.generationMetadata as GenerationMetadata & { arvoPartTintinnabuli?: ArvoPartTintinnabuliParams };
  const p = md.arvoPartTintinnabuli ?? {};
  const stripped = stripChordToTriad(triadSym);
  const rpc = harmonyRootPc(stripped);
  const minorFromSym = triadIsMinorHead(harmonyHead(stripped));
  const triadQuality: 'major' | 'minor' = p.triadQuality ?? (minorFromSym ? 'minor' : 'major');
  const position: ArvoPartTintinnabuliPosition = p.position ?? 'below';
  const mode: ArvoPartTintinnabuliVoiceMode = p.mode ?? 'M1';

  let effectiveTriadSym = stripped;
  let rootPc = rpc ?? 0;
  const explicit = p.triadRoot?.trim();
  if (explicit) {
    const base = explicit.replace(/m$/i, '').trim();
    const pc = noteNameToPitchClass(base);
    if (pc !== undefined) rootPc = pc;
    const name = pitchClassToSharpName(pc ?? rootPc);
    effectiveTriadSym = triadQuality === 'minor' ? `${name}m` : name;
  }

  return { rootPc, triadQuality, position, mode, effectiveTriadSym };
}

/** Bar 1 is a locked two-note cell. These two motif lines are warnings for arvo_part only. */
export function arvoPartLockedBarMotifIssueIsWarning(issue: string): boolean {
  return issue.includes('bar 1 identity cell is weak') || issue.includes('bar 1 lacks a featured leap');
}

/** Canonical songwriter id + VRB voiceId — normalizeHarmonicVoiceId does not unify these. */
export const ARVO_PART_HARMONIC_VOICE_IDS = ['arvo_part', 'part'] as const;

export function isArvoPartHarmonicVoiceId(raw: string | null | undefined): boolean {
  const id = normalizeHarmonicVoiceId(String(raw ?? ''));
  return id === 'arvo_part' || id === 'part';
}

export function isSongwriterArvoPart(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'arvo_part' } {
  return genMeta?.songwriterStyleId === 'arvo_part';
}

/**
 * Primary songwriter or harmonicVoice selects Arvo Pärt harmony authority.
 * Single-gate (no styleProfile) — Wave-C / jobim HV pattern.
 *
 * Accepts **both** `arvo_part` (songwriter / eff-bar id) and `part`
 * (VRB voiceId) — `normalizeHarmonicVoiceId` does not unify them.
 * Soft alias `arvo` and VRB-only work aliases (`tintinnabuli`, `fratres`,
 * `fur_alina`, …) do **not** engage HV — exact `arvo_part` | `part` only.
 *
 * **Primary-only surfaces (do not flip under HV):**
 * - **`arvoPartContext`** — Fur Alina / Spiegel / Fratres posture; primary/API
 *   intake only (joniPhase precedent).
 * - **`applyArvoPartTintinnabuliToDuoScore`** — rewrites duo notes; HV owns
 *   eff-bar harmony only; firing under HV would steal primary note identity
 *   (highest-risk dual-surface; jobimMode/joniPhase class, heavier).
 * - **`skipStandardDuoBassMassaging`** — coupled to tintinnabuli rewrite;
 *   stays primary-gated with it.
 * - **`applyArvoPartStyleSurface`** — Song Mode bias nudges from primaryId;
 *   flipping under HV steals primary surface when primary is another writer.
 */
export function isArvoPartHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  return (
    isArvoPartHarmonicVoiceId(metadata?.songwriterStyleId) ||
    isArvoPartHarmonicVoiceId(metadata?.harmonicVoice)
  );
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

function inferHarmonicStasis(substitutedTriads: string[]): boolean {
  if (substitutedTriads.length <= 1) return true;
  const first = substitutedTriads[0]!;
  return substitutedTriads.every((s) => s === first);
}

/** @deprecated — use resolveBarSymbol */
export function precomputeArvoPartEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const apCtx: ArvoPartContextMode = genMeta.arvoPartContext ?? 'fur_alina';
  genMeta.arvoPartContext = apCtx;

  const receipts: string[] = [];
  const guards: ArvoPartAntiElaborationGuards = { noopTriad: 0 };

  const substituted: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    sym = substituteBarSymbolForArvo(context, sym);
    const before = sym;
    sym = stripChordToTriad(sym);
    if (sym === before) guards.noopTriad++;
    substituted.push(sym);
  }

  const tonicPc = harmonyRootPc(substituted[0] ?? 'C');
  const stasis = inferHarmonicStasis(substituted);
  if (stasis) {
    receipts.push(`ap:stasis_hold|bars=${tb}|triad=${substituted[0] ?? ''}`);
  }

  const out = [...substituted];

  if (!stasis) {
    applyTriadicTransformationPass(out, seed, receipts, tb, context, apCtx);
  }
  applySilenceAsStructurePass(out, seed, receipts, tb, context);
  applyDronePedalPass(out, tonicPc, seed, receipts, tb, context);
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
  const d1 = flat.filter((r) => r.includes('ap:d1')).length;
  const d2 = flat.filter((r) => r.includes('ap:d2')).length;
  const d3 = flat.filter((r) => r.includes('ap:d3')).length;
  const d4 = flat.filter((r) => r.includes('ap:d4')).length;
  const d5 = flat.filter((r) => r.includes('ap:d5')).length;

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

export interface ArvoPartTintinnabuliApplyOpts {
  guitarMap: InstrumentRegisterMap;
  bassMap: InstrumentRegisterMap;
  walkLow: number;
  bassCeiling: number;
}

type TintAttack = { beat: number; dur: number; cellIndex: number };

const PHRASE_CELLS: readonly (readonly number[])[] = [
  [0, 1, 2, 1],
  [0, 2, 1, 0],
  [2, 1, 0, 2],
  [0, 1, 3, 2],
];

function attacksForContext(ctx: ArvoPartContextMode, bar: number): TintAttack[] {
  const mod = ((bar % 4) + 4) % 4;
  if (mod === 3) return [];
  if (mod === 0) {
    return [
      { beat: 0, dur: 1, cellIndex: 0 },
      { beat: 1, dur: 1, cellIndex: 1 },
      { beat: 2, dur: 2, cellIndex: 2 },
    ];
  }
  if (ctx === 'fratres') {
    if (mod === 1) {
      return [
        { beat: 0, dur: 0.5, cellIndex: 0 },
        { beat: 0.5, dur: 0.5, cellIndex: 1 },
        { beat: 1, dur: 0.5, cellIndex: 2 },
        { beat: 1.5, dur: 0.5, cellIndex: 3 },
        { beat: 2, dur: 0.5, cellIndex: 0 },
        { beat: 3, dur: 0.5, cellIndex: 1 },
        { beat: 3.5, dur: 0.5, cellIndex: 2 },
      ];
    }
    return [
      { beat: 0, dur: 0.5, cellIndex: 0 },
      { beat: 0.5, dur: 0.5, cellIndex: 1 },
      { beat: 1, dur: 0.5, cellIndex: 2 },
      { beat: 2, dur: 1, cellIndex: 3 },
      { beat: 3, dur: 1, cellIndex: 0 },
    ];
  }
  if (ctx === 'spiegel') {
    if (mod === 1) {
      return [
        { beat: 0, dur: 1, cellIndex: 0 },
        { beat: 1, dur: 1, cellIndex: 1 },
        { beat: 2, dur: 2, cellIndex: 2 },
      ];
    }
    return [
      { beat: 0, dur: 2, cellIndex: 0 },
      { beat: 2, dur: 2, cellIndex: 1 },
    ];
  }
  if (mod === 1) {
    return [
      { beat: 0, dur: 2, cellIndex: 0 },
      { beat: 2, dur: 2, cellIndex: 1 },
    ];
  }
  return [{ beat: 0, dur: 4, cellIndex: 0 }];
}

function degreeForBar(bar: number, cellIndex: number): number {
  const phrase = Math.floor((bar - 1) / 4);
  const cell = PHRASE_CELLS[phrase % PHRASE_CELLS.length]!;
  const shift = phrase % 3;
  return (cell[cellIndex % cell.length]! + shift) % 7;
}

function scaleQualityForSymbol(symbol: string, declared: 'major' | 'minor'): 'major' | 'minor' {
  const head = harmonyHead(symbol).toLowerCase();
  if (/dim|°/.test(head)) return 'minor';
  if (/aug|\+/.test(head)) return 'major';
  return declared;
}

type TimedPitch = { start: number; dur: number; pitch: number | null };

function eventsForVoice(slots: TimedPitch[], span: number, voice: number, motif: boolean) {
  const events = [];
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const slot of sorted) {
    if (slot.start > cursor + 1e-4) {
      events.push(createRest(cursor, slot.start - cursor, voice));
    }
    if (slot.pitch == null) events.push(createRest(slot.start, slot.dur, voice));
    else events.push(createNote(slot.pitch, slot.start, slot.dur, voice, motif && voice === 1 ? 'song_motif_1' : undefined));
    cursor = slot.start + slot.dur;
  }
  if (span - cursor > 1e-4) events.push(createRest(cursor, span - cursor, voice));
  return events;
}

/**
 * Replace duo guitar/bass note events with tintinnabuli layers.
 * M is a diatonic phrase cell. T is the nearest triad tone in the chosen direction.
 * Bars 1 and 25, and any other identity-locked bar, stay untouched.
 * 4/4 only. Other metres stay untouched.
 */
export function applyArvoPartTintinnabuliToDuoScore(
  guitar: PartModel,
  bass: PartModel,
  context: CompositionContext,
  opts: ArvoPartTintinnabuliApplyOpts
): void {
  const tb = context.form.totalBars;
  const md = context.generationMetadata as GenerationMetadata;
  const beatReceipts: string[] = [];
  md.arvoPartDeviceReceipts = (md.arvoPartDeviceReceipts ?? []).filter((receipt) => !receipt.includes('ap:d1_tintinnabuli'));
  const ctxMode: ArvoPartContextMode = md.arvoPartContext ?? 'fur_alina';
  let prevMidi = 64;

  const zone = (bar: number, map: InstrumentRegisterMap, fallback: [number, number]): [number, number] => {
    const label = sectionLabelForBar(bar, context);
    const plan = map.sections.find((s) => s.sectionLabel === label);
    return plan?.preferredZone ?? fallback;
  };

  for (let bar = 1; bar <= tb; bar++) {
    const gm = guitar.measures.find((m) => m.index === bar);
    const bm = bass.measures.find((m) => m.index === bar);
    if (!gm || !bm) continue;
    const eff =
      md.arvoPartEffectiveHarmonyBars?.[bar - 1] ?? stripChordToTriad(resolveBarSymbol(context, bar).symbol);
    const chordSym = substituteBarSymbolForArvo(context, eff);
    const triSym = stripChordToTriad(chordSym);
    const tint = resolveTintParams(context, triSym);
    const { rootPc, triadQuality, position, mode, effectiveTriadSym } = tint;
    if (isProtectedBar(bar, context) || Math.abs(measureBeatSpanQuartersOf(gm) - 4) > 1e-4) {
      if (!lockedHarmonyChordSymbolsEquivalent(gm.chord ?? '', eff)) gm.chord = eff;
      if (!lockedHarmonyChordSymbolsEquivalent(bm.chord ?? '', eff)) bm.chord = eff;
      continue;
    }
    const span = measureBeatSpanQuartersOf(gm);
    const quality = scaleQualityForSymbol(effectiveTriadSym, triadQuality);
    const scalePcs = scaleDegreesDiatonic(rootPc, quality);
    const triadPcs = triadChordTonePcs(effectiveTriadSym);

    const [gZoneLow, gZoneHigh] = zone(bar, opts.guitarMap, [55, 79]);
    const gLow = Math.max(55, Math.min(gZoneLow, 72));
    const gHigh = Math.min(79, Math.max(gZoneHigh, gLow + 7));
    const bLow = Math.max(40, Math.min(opts.walkLow, 45));
    const bHigh = Math.min(52, Math.max(opts.bassCeiling, bLow + 7));

    gm.chord = effectiveTriadSym;
    bm.chord = effectiveTriadSym;

    const attacks = attacksForContext(ctxMode, bar);
    const oblique = bar % 4 === 2;
    const melody: TimedPitch[] = [];
    const above: TimedPitch[] = [];
    const below: TimedPitch[] = [];
    let placedAbove = false;
    let placedBelow = false;

    attacks.forEach((attack, index) => {
      const degree = degreeForBar(bar, attack.cellIndex);
      let mMidi = midiForDegree(degree, scalePcs, prevMidi, gLow, gHigh);
      const pos: 'above' | 'below' | 'both' =
        mode === 'M2' ? 'both' : position === 'alternating' ? (index % 2 === 0 ? 'above' : 'below') : position;
      const needAbove = pos === 'above' || pos === 'both';
      const needBelow = pos === 'below' || pos === 'both';
      for (let shift = 0; shift < 3; shift++) {
        const candidate = mMidi - shift * 12;
        if (candidate < gLow || candidate > gHigh) continue;
        const aboveOk = !needAbove || nearestTriadTone(candidate, triadPcs, 'above', gLow, gHigh) != null;
        const belowOk = !needBelow || nearestTriadTone(candidate, triadPcs, 'below', bLow, bHigh) != null;
        if (aboveOk && belowOk) {
          mMidi = candidate;
          break;
        }
      }
      mMidi = clampPitch(mMidi, gLow, gHigh);
      prevMidi = mMidi;
      melody.push({ start: attack.beat, dur: attack.dur, pitch: mMidi });

      if (needAbove) {
        const tAbove = nearestTriadTone(mMidi, triadPcs, 'above', gLow, gHigh);
        if (tAbove != null) {
          above.push({ start: attack.beat, dur: attack.dur, pitch: tAbove });
          placedAbove = true;
          beatReceipts.push(
            `ap:d1_tintinnabuli|bar${bar}|beat${attack.beat}|m=${mMidi}|t=${tAbove}|pos=above|mode=${mode}`,
          );
        }
      }
      if (needBelow) {
        const shiftBass = index === 0 && (mode === 'M2' || oblique);
        const delay = !shiftBass ? 0 : attack.dur >= 4 ? 2 : attack.dur >= 2 ? 1 : attack.dur >= 1 ? 0.5 : 0;
        const start = attack.beat + delay;
        const dur = attack.dur - delay;
        if (dur > 1e-4) {
          const tBelow = nearestTriadTone(mMidi, triadPcs, 'below', bLow, bHigh);
          if (tBelow != null) {
            below.push({ start, dur, pitch: tBelow });
            placedBelow = true;
            beatReceipts.push(
              `ap:d1_tintinnabuli|bar${bar}|beat${start}|m=${mMidi}|t=${tBelow}|pos=below|mode=${mode}`,
            );
          }
        }
      }
    });

    if (!placedBelow && mode === 'M1' && position === 'above' && attacks.length > 0) {
      const pedal = rootMidiInRange(rootPc, bLow, bHigh, 43);
      if (pedal != null) {
        const start = oblique ? 1 : 0;
        below.push({ start, dur: 2, pitch: pedal });
        placedBelow = true;
        beatReceipts.push(`ap:d1_tintinnabuli|bar${bar}|beat${start}|m=pedal|t=${pedal}|pos=pedal|mode=M1`);
      }
    }

    gm.events = eventsForVoice(melody, span, 1, true);
    if (placedAbove) gm.events.push(...eventsForVoice(above, span, 2, false));
    bm.events = eventsForVoice(below, span, 1, false);
    normalizeMeasureToEighthBeatGrid(gm);
    normalizeMeasureToEighthBeatGrid(bm);
  }

  md.arvoPartDeviceReceipts = [...(md.arvoPartDeviceReceipts ?? []), ...beatReceipts];
}
