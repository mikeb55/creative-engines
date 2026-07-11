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
import { isProtectedBar } from '../score-integrity/identityLock';
import type { PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import { normalizeMeasureToEighthBeatGrid } from '../score-integrity/duoEighthBeatGrid';
import { clampPitch } from '../goldenPath/guitarBassDuoHarmony';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import { selectMotifTransform, type SectionRole } from './motifMutationEngine';

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

function tintinnabuliSectionRole(bar: number, tb: number, label: string): SectionRole {
  const L = label.trim();
  const up = L.toUpperCase();
  if (bar >= tb - 2 && tb >= 16) return 'coda';
  if (up.includes('BRIDGE')) return 'bridge';
  if (up === 'B' || up.includes('CHORUS')) return 'B';
  if (up.includes('A2') || up.includes('VERSE 2')) return 'A2';
  return 'A';
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

function collectTriadMidis(triadSym: string, low: number, high: number): number[] {
  const pcs = triadChordTonePcs(triadSym);
  const out: number[] = [];
  for (let m = low - 12; m <= high + 24; m++) {
    if (pcs.includes(((m % 12) + 12) % 12)) out.push(m);
  }
  return out.sort((a, b) => a - b);
}

function nearestTriadStrictAbove(mMidi: number, candidates: number[]): number {
  const above = candidates.filter((t) => t > mMidi);
  if (above.length > 0) return above.reduce((a, b) => (b - mMidi < a - mMidi ? b : a));
  const pcs = [...new Set(candidates.map((c) => ((c % 12) + 12) % 12))];
  let best = mMidi + 24;
  for (const pc of pcs) {
    let m = mMidi + 1;
    for (let k = 0; k < 36; k++, m++) {
      if (((m % 12) + 12) % 12 === pc) {
        if (m > mMidi && m < best) best = m;
        break;
      }
    }
  }
  return best <= mMidi + 23 ? best : mMidi + 4;
}

function nearestTriadStrictBelow(mMidi: number, candidates: number[]): number {
  const below = candidates.filter((t) => t < mMidi);
  if (below.length > 0) return below.reduce((a, b) => (mMidi - b < mMidi - a ? b : a));
  const pcs = [...new Set(candidates.map((c) => ((c % 12) + 12) % 12))];
  let best = mMidi - 24;
  for (const pc of pcs) {
    let m = mMidi - 1;
    for (let k = 0; k < 36; k++, m--) {
      if (((m % 12) + 12) % 12 === pc) {
        if (m < mMidi && m > best) best = m;
        break;
      }
    }
  }
  return best >= mMidi - 23 ? best : mMidi - 4;
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

function degreeDeltaFromTransform(
  tr: ReturnType<typeof selectMotifTransform>,
  dir: -1 | 1,
  u: number
): number {
  if (tr === 'fragmentation' && u < 0.38) return 0;
  if (tr === 'contour_inversion') return -dir;
  if (tr === 'sequence' || tr === 'registral_displacement') return dir;
  if (tr === 'augmentation') return u < 0.78 ? dir : dir * 2;
  if (tr === 'diminution') return u < 0.55 ? dir : 0;
  if (tr === 'rhythmic_displacement') return u < 0.5 ? dir : 0;
  return u < 0.58 ? dir : 0;
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

/**
 * Replace duo guitar/bass note events with real tintinnabuli layers (M stepwise diatonic; T triad tones).
 * Call after guitar + bass parts exist; before overlap thinning / Wyble coupling for this slice.
 */
export function applyArvoPartTintinnabuliToDuoScore(
  guitar: PartModel,
  bass: PartModel,
  context: CompositionContext,
  opts: ArvoPartTintinnabuliApplyOpts
): void {
  const seed = context.seed;
  const tb = context.form.totalBars;
  const md = context.generationMetadata as GenerationMetadata;
  const beatReceipts: string[] = [];

  const getRegisterForBar = (bar: number): [number, number] => {
    const label = sectionLabelForBar(bar, context);
    const plan = opts.guitarMap.sections.find((s) => s.sectionLabel === label);
    return plan?.preferredZone ?? [55, 79];
  };
  const getBassRegisterForBar = (bar: number): [number, number] => {
    const label = sectionLabelForBar(bar, context);
    const plan = opts.bassMap.sections.find((s) => s.sectionLabel === label);
    return plan?.preferredZone ?? [40, 55];
  };

  let degreeIdx = Math.floor(seededUnit(seed, 0, 889001) * 7);
  let dir: -1 | 1 = seededUnit(seed, 0, 889002) < 0.5 ? -1 : 1;
  let prevMidi = 64;

  for (let bar = 1; bar <= tb; bar++) {
    const eff =
      md.arvoPartEffectiveHarmonyBars?.[bar - 1] ?? stripChordToTriad(resolveBarSymbol(context, bar).symbol);
    const chordSym = substituteBarSymbolForArvo(context, eff);
    const triSym = stripChordToTriad(chordSym);
    const tint = resolveTintParams(context, triSym);
    const { rootPc, triadQuality, position, mode, effectiveTriadSym } = tint;
    const scalePcs = scaleDegreesDiatonic(rootPc, triadQuality);

    const [gLow, gHigh] = getRegisterForBar(bar);
    const [bLowRaw, bHighRaw] = getBassRegisterForBar(bar);
    const bLow = Math.max(opts.walkLow, bLowRaw);
    const bHigh = Math.min(opts.bassCeiling, bHighRaw);

    const role = tintinnabuliSectionRole(bar, tb, sectionLabelForBar(bar, context));

    const gm = guitar.measures.find((m) => m.index === bar);
    const bm = bass.measures.find((m) => m.index === bar);
    if (!gm || !bm) continue;

    gm.chord = effectiveTriadSym;
    bm.chord = effectiveTriadSym;

    const span = measureBeatSpanQuartersOf(gm);
    const beats = Math.max(1, Math.round(span));
    const qdur = span / beats;

    gm.events = [];
    bm.events = [];

    const gTriMidis = collectTriadMidis(effectiveTriadSym, gLow, gHigh);
    const bTriMidis = collectTriadMidis(effectiveTriadSym, bLow, bHigh);

    for (let bi = 0; bi < beats; bi++) {
      const beat = bi;
      const tr = selectMotifTransform(role, seed + bar * 7919 + beat * 17);
      const u = seededUnit(seed, bar, 889100 + beat);
      const delta = degreeDeltaFromTransform(tr, dir, u);
      degreeIdx = Math.max(0, Math.min(6, degreeIdx + delta));
      const mMidi = midiForDegree(degreeIdx, scalePcs, prevMidi, gLow, gHigh);
      prevMidi = mMidi;

      const st = bi * qdur;
      const dur = Math.min(qdur, span - st);
      if (dur <= 1e-4) continue;

      addEvent(gm, createNote(mMidi, st, dur, 1));

      const posBeat: ArvoPartTintinnabuliPosition =
        position === 'alternating' ? (beat % 2 === 0 ? 'above' : 'below') : position;

      if (mode === 'M2') {
        const tAbove = nearestTriadStrictAbove(mMidi, gTriMidis);
        const tBelow = nearestTriadStrictBelow(mMidi, bTriMidis);
        addEvent(gm, createNote(tAbove, st, dur, 2));
        addEvent(bm, createNote(tBelow, st, dur, 1));
        beatReceipts.push(
          `ap:d1_tintinnabuli|bar${bar}|beat${beat}|m=${mMidi}|t_above=${tAbove}|t_below=${tBelow}|mode=M2`
        );
      } else if (posBeat === 'above') {
        const tAbove = nearestTriadStrictAbove(mMidi, gTriMidis);
        addEvent(gm, createNote(tAbove, st, dur, 2));
        addEvent(bm, createRest(st, dur, 1));
        beatReceipts.push(`ap:d1_tintinnabuli|bar${bar}|beat${beat}|m=${mMidi}|t=${tAbove}|pos=above`);
      } else if (posBeat === 'below') {
        const tBelow = nearestTriadStrictBelow(mMidi, bTriMidis);
        addEvent(bm, createNote(tBelow, st, dur, 1));
        beatReceipts.push(`ap:d1_tintinnabuli|bar${bar}|beat${beat}|m=${mMidi}|t=${tBelow}|pos=below`);
      }

      dir = seededUnit(seed, bar, 889200 + beat) < 0.5 ? (-1 as const) : (1 as const);
    }

    normalizeMeasureToEighthBeatGrid(gm);
    normalizeMeasureToEighthBeatGrid(bm);
  }

  md.arvoPartDeviceReceipts = [...(md.arvoPartDeviceReceipts ?? []), ...beatReceipts];
}
