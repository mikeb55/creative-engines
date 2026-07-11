/**
 * Joni Mitchell — open-tuning modal Song Mode / duo golden-path harmony slice.
 * Modal fields, sus/add9 colour, non-functional harmony — layered on locked harmony.
 */

import type { CompositionContext, GenerationMetadata, JoniMitchellPhaseMode } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { coarseSectionRoleFromBar, inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

/** Research defaults — `buildReharmLensConfig('joni_mitchell')`, sus-first pitch-field grammar. */
export const JONI_MITCHELL_SLICE_PARAMETERS = {
  coreDevice: 'sus_to_sus_motion' as const,
  defaultPhase: 'folk_modal' as JoniMitchellPhaseMode,
  phaseComment:
    "'folk_modal' = early Mixolydian/Dorian sus clusters | 'jazz_folk' = Court/Spark ii–V + sus hybrid | 'modal_jazz' = Hejira long vamps + floating centres",
  tritoneRate: 0.05,
  susBias: 0.9,
  susBiasComment: '// Joni: never stay on sus too long? She does exactly that',
  chromaticMediantBias: 0.15,
  staticDominantBias: 0.65,
  pitchFieldAnchor: true,
  pitchFieldComment: '// melody chooses harmony, not function',
  susResolutionRate: 0.15,
  tuningFieldComment: '// emulates open-string tuning interval logic for non-guitar instruments',
  openStringSimulation: true,
} as const;

function resolveJoniPhase(genMeta: GenerationMetadata & Record<string, unknown>): JoniMitchellPhaseMode {
  const raw = genMeta.joniPhase as JoniMitchellPhaseMode | undefined;
  if (raw === 'folk_modal' || raw === 'jazz_folk' || raw === 'modal_jazz') return raw;
  return JONI_MITCHELL_SLICE_PARAMETERS.defaultPhase;
}

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

export function isSongwriterJoniMitchell(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'joni_mitchell' } {
  return genMeta?.songwriterStyleId === 'joni_mitchell';
}

/**
 * Primary songwriter, STYLE_JONI_MITCHELL surface, or harmonicVoice selects Joni Mitchell harmony authority.
 * Soft aliases (`joni` / `mitchell` / `jm`) stay primary-only via songwriter intake — HV requires exact `joni_mitchell`.
 * `joniPhase` and `joniStyleHarmonyPolicy` stay primary / styleProfile-only — not this helper.
 */
export function isJoniMitchellHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
    styleProfile?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return (
    primary === 'joni_mitchell' ||
    voice === 'joni_mitchell' ||
    metadata?.styleProfile === 'STYLE_JONI_MITCHELL'
  );
}

export interface JoniMitchellHarmonyAccumulator {
  barsConsidered: number;
  susTouches: number;
  slashTouches: number;
  addNineTouches: number;
}

export function createJoniMitchellHarmonyAccumulator(): JoniMitchellHarmonyAccumulator {
  return {
    barsConsidered: 0,
    susTouches: 0,
    slashTouches: 0,
    addNineTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: JoniMitchellHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/sus[24]|sus/.test(t)) acc.susTouches++;
  if (/\/[a-g]/i.test(c)) acc.slashTouches++;
  if (/add9|6\/9|6\/9|69/.test(t)) acc.addNineTouches++;
}

export function accumulateJoniMitchellHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: JoniMitchellHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface JoniMitchellDeviceReceipts {
  deviceReceipts: string[];
}

export interface JoniMitchellAntiElaborationGuards {
  dominantFamilyStripped: number;
  twoFiveOneFlattened: number;
  twoBarHoldForced: number;
  maj7CadenceMuted: number;
}

/** Strip tertian dominant vocabulary (plain 7/9/11/13 on major roots) — not Joni's modal palette. */
function stripDominantFamily(symbol: string, guards: JoniMitchellAntiElaborationGuards): string {
  const p = parseChordSymbol(symbol);
  const hp = p.harmonyPart;
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  const tl = hp.toLowerCase();
  const isMaj7 = /maj7|mmaj7|Δ|major\s*7/.test(tl);
  const isMinor7 = /\bm(?!aj)(7|9|11|13)|min7/.test(tl);
  const isDim = /dim|°|ø/.test(tl);
  if (isMaj7 || isMinor7 || isDim) return symbol;

  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const rest = hp.slice(root.length);
  const domPlain =
    /^7([^a-z0-9]|$)/i.test(rest) ||
    /^9([^a-z0-9]|$)/i.test(rest) ||
    /^11([^a-z0-9]|$)/i.test(rest) ||
    /^13([^a-z0-9]|$)/i.test(rest) ||
    /^7\(/.test(rest) ||
    /^9\(/.test(rest);
  if (domPlain) {
    guards.dominantFamilyStripped++;
    return `${pitchClassToSharpName(noteNameToPitchClass(root) ?? 0)}add9${slash}`;
  }
  return symbol;
}

function looksUnresolvedSus(symbol: string): boolean {
  const t = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /sus[24]|sus2|sus4/.test(t);
}

function looksLydianColourSymbol(symbol: string): boolean {
  const t = symbol.toLowerCase();
  return /#11|#4|6\/9|69\b|lyd/.test(t) || /\/#f|\/f#/i.test(t);
}

/** Rough ii–V–I in major (functional cadence — discouraged). */
function isTwoFiveOne(a: string, b: string, c: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const ii = (tonicPc + 2) % 12;
  const v = (tonicPc + 7) % 12;
  const ia = harmonyRootPc(a);
  const ib = harmonyRootPc(b);
  const ic = harmonyRootPc(c);
  if (ia !== ii || ib !== v) return false;
  const iPc = ic ?? harmonyRootPc(c);
  return iPc === tonicPc;
}

function flattenTwoFiveOnePass(out: string[], tonicPc: number | undefined, guards: JoniMitchellAntiElaborationGuards): void {
  for (let i = 2; i < out.length; i++) {
    const a = out[i - 2]!;
    const b = out[i - 1]!;
    const c = out[i]!;
    if (!isTwoFiveOne(a, b, c, tonicPc)) continue;
    guards.twoFiveOneFlattened++;
    out[i - 1] = out[i - 2]!;
  }
}

/** Hold chords at least two bars: collapse odd transitions inside each 2-bar cell. */
function enforceTwoBarHold(out: string[], guards: JoniMitchellAntiElaborationGuards): void {
  const tb = out.length;
  for (let start = 1; start <= tb; start += 2) {
    const i0 = start - 1;
    const i1 = start;
    if (i1 >= tb) break;
    if (out[i0] !== out[i1]) {
      guards.twoBarHoldForced++;
      out[i1] = out[i0]!;
    }
  }
}

/** If maj7 on dominant resolves to tonic triad next bar, soften the cadence. */
function softenMaj7CadencePass(out: string[], tonicPc: number | undefined, guards: JoniMitchellAntiElaborationGuards): void {
  if (tonicPc === undefined) return;
  for (let i = 0; i < out.length - 1; i++) {
    const V = out[i]!;
    const I = out[i + 1]!;
    if (!/maj7|Δ/.test(parseChordSymbol(V).harmonyPart)) continue;
    const vPc = harmonyRootPc(V);
    const iPc = harmonyRootPc(I);
    if (vPc === (tonicPc + 7) % 12 && iPc === tonicPc) {
      const t = parseChordSymbol(I).harmonyPart;
      if (!/m(?!aj)/.test(t)) {
        guards.maj7CadenceMuted++;
        out[i] = `${pitchClassToSharpName(tonicPc)}sus4`;
      }
    }
  }
}

function emitModalFieldLockReceipts(out: string[], receipts: JoniMitchellDeviceReceipts): void {
  let run = 1;
  for (let b = 2; b <= out.length; b++) {
    const i = b - 1;
    if (out[i] === out[i - 1]) {
      run++;
      if (run >= 2) {
        receipts.deviceReceipts.push(`jm:modal_field_lock@bar${b}`);
      }
    } else {
      run = 1;
    }
  }
}

function barIsPreChorusLike(bar: number, context: CompositionContext): boolean {
  const sec = context.form.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
  const L = (sec?.label ?? '').trim().toLowerCase();
  return L.startsWith('pre');
}

function emitSuspensionReceipts(context: CompositionContext, out: string[], receipts: JoniMitchellDeviceReceipts): void {
  for (let b = 1; b <= out.length; b++) {
    const role = coarseSectionRoleFromBar(b, context);
    if (role !== 'verse' && !barIsPreChorusLike(b, context)) continue;
    const sym = out[b - 1]!;
    if (!looksUnresolvedSus(sym)) continue;
    receipts.deviceReceipts.push(`jm:unresolved_suspension@bar${b}`);
  }
}

function emitNonRootBassReceipts(out: string[], receipts: JoniMitchellDeviceReceipts): void {
  for (let b = 1; b <= out.length; b++) {
    const sym = out[b - 1]!;
    if (!/\/[a-g]/i.test(sym)) continue;
    receipts.deviceReceipts.push(`jm:non_root_bass@bar${b}`);
  }
}

function emitLydianReceipts(context: CompositionContext, out: string[], receipts: JoniMitchellDeviceReceipts): void {
  for (let b = 1; b <= out.length; b++) {
    if (coarseSectionRoleFromBar(b, context) !== 'chorus') continue;
    const sym = out[b - 1]!;
    if (!looksLydianColourSymbol(sym)) continue;
    receipts.deviceReceipts.push(`jm:lydian_colour@bar${b}`);
  }
}

/** Bridge only — once per song: reinterpret cluster toward minor 11 / add9 centre. */
function applyModalCentreShiftDevice(params: {
  context: CompositionContext;
  out: string[];
  receipts: JoniMitchellDeviceReceipts;
  seed: number;
  tonicPc: number | undefined;
}): void {
  const { context, out, receipts, seed, tonicPc } = params;
  if (tonicPc === undefined) return;
  let fired = false;
  for (const sec of context.form.sections) {
    if (fired) break;
    if (coarseSectionRoleFromBar(sec.startBar, context) !== 'bridge') continue;
    if (seededUnit(seed, sec.startBar, 104301) > 0.88) continue;
    const b0 = sec.startBar;
    if (b0 >= 1 && b0 <= out.length) {
      const bmPc = (tonicPc + 2) % 12;
      const emPc = (tonicPc + 4) % 12;
      out[b0 - 1] = `${pitchClassToSharpName(bmPc)}m11`;
      receipts.deviceReceipts.push(`jm:modal_centre_shift@bar${b0}`);
      if (b0 < out.length) {
        out[b0] = `${pitchClassToSharpName(emPc)}add9`;
      }
      fired = true;
    }
  }
}

function longestRunLength(out: string[]): number {
  let best = 0;
  let cur = 0;
  let prev = '';
  for (const c of out) {
    if (c === prev) {
      cur++;
    } else {
      cur = 1;
      prev = c;
    }
    best = Math.max(best, cur);
  }
  return best;
}

function assignTuningPatterns(tb: number, seed: number): string[] {
  const patterns = ['x57543', 'x77543', 'x54002', 'x77554'];
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    const u = seededUnit(seed, b, 104401);
    out.push(patterns[Math.floor(u * patterns.length) % patterns.length]!);
  }
  return out;
}

/**
 * Precompute effective one chord per bar after Joni devices + guards (joni_mitchell primary only).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeJoniMitchellEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const receipts: JoniMitchellDeviceReceipts = { deviceReceipts: [] };
  const guards: JoniMitchellAntiElaborationGuards = {
    dominantFamilyStripped: 0,
    twoFiveOneFlattened: 0,
    twoBarHoldForced: 0,
    maj7CadenceMuted: 0,
  };
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const seed = context.seed;

  genMeta.joniResolvedPhase = resolveJoniPhase(genMeta);
  genMeta.pitchFieldAnchor = JONI_MITCHELL_SLICE_PARAMETERS.pitchFieldAnchor;
  genMeta.openStringSimulation = JONI_MITCHELL_SLICE_PARAMETERS.openStringSimulation;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(stripDominantFamily(resolveBarSymbol(context, b).symbol, guards));
  }

  const out = [...raw];
  flattenTwoFiveOnePass(out, tonicPc, guards);
  softenMaj7CadencePass(out, tonicPc, guards);
  enforceTwoBarHold(out, guards);

  applyModalCentreShiftDevice({ context, out, receipts, seed, tonicPc });
  enforceTwoBarHold(out, guards);

  emitModalFieldLockReceipts(out, receipts);
  emitSuspensionReceipts(context, out, receipts);
  emitNonRootBassReceipts(out, receipts);
  emitLydianReceipts(context, out, receipts);

  const tuningByBar = assignTuningPatterns(tb, seed);
  genMeta.joniMitchellEffectiveHarmonyBars = out;
  genMeta.joniMitchellDeviceReceipts = receipts.deviceReceipts;
  genMeta.joniMitchellAntiElaborationGuards = guards;
  genMeta.joniMitchellModalFieldLockLengthBars = longestRunLength(out);
  genMeta.joniMitchellTuningPatternByBar = tuningByBar;
  genMeta.joniMitchellSliceMeta = {
    tuningPatternByBar: tuningByBar,
    tuningAnnotationOnly: true,
    receiptsVersion: 1,
  };
}

export function finalizeJoniMitchellMetadata(metadata: GenerationMetadata, acc: JoniMitchellHarmonyAccumulator): void {
  const flat = [...(metadata.joniMitchellDeviceReceipts ?? [])];
  const g = metadata.joniMitchellAntiElaborationGuards ?? {
    dominantFamilyStripped: 0,
    twoFiveOneFlattened: 0,
    twoBarHoldForced: 0,
    maj7CadenceMuted: 0,
  };
  const guardTotal =
    g.dominantFamilyStripped + g.twoFiveOneFlattened + g.twoBarHoldForced + g.maj7CadenceMuted;
  const tb = Math.max(1, acc.barsConsidered);
  const susRate = acc.susTouches / tb;
  const slashRate = acc.slashTouches / tb;
  const d = {
    songwriterId: 'joni_mitchell' as const,
    barsConsidered: acc.barsConsidered,
    suspensionHitRate: susRate,
    nonRootBassHitRate: slashRate,
    addNineTouches: acc.addNineTouches,
    modalFieldLockLengthBars: metadata.joniMitchellModalFieldLockLengthBars ?? 0,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Joni Mitchell (modal open-tuning slice): sus≈${acc.susTouches}`,
    `slash≈${acc.slashTouches}`,
    `add9≈${acc.addNineTouches}`,
    `bars=${acc.barsConsidered}`,
    `modalLockLen=${metadata.joniMitchellModalFieldLockLengthBars ?? 0}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.joniMitchellDiagnostics = { ...d };
  metadata.joniMitchellSliceReceipt = receipt;
}
