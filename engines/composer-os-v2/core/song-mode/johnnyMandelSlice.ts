/**
 * Johnny Mandel — melody-forward Studio Orchestral warmth slice (`jmd:*` receipts).
 * Song-centered melody, mechanical inner-voice warmth, Hollywood-jazz orchestral framing —
 * distinct from Ogerman continuum, Quincy punch, Sebesky CTI groove, Nelson blues-modal, Nestico Basie.
 *
 * Note: `jm:*` is owned by Joni Mitchell (`joniMitchellSlice.ts`); Mandel uses `jmd:*`.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Five Mandel slice parameters (0–1). */
export interface JohnnyMandelSliceParams {
  melodyForward: number;
  mechanicalWarmth: number;
  songHarmony: number;
  orchestralFraming: number;
  hollywoodAwareness: number;
}

export const DEFAULT_JOHNNY_MANDEL_SLICE_PARAMS: JohnnyMandelSliceParams = {
  melodyForward: 0.78,
  mechanicalWarmth: 0.75,
  songHarmony: 0.72,
  orchestralFraming: 0.7,
  hollywoodAwareness: 0.65,
};

export type MandelLyricSection =
  | 'lyric_theme'
  | 'inner_warmth_pass'
  | 'borrowed_iv_window'
  | 'brass_cushion'
  | 'soft_cadence'
  | 'hollywood_transition';

export interface MandelSongPhrase {
  index: number;
  startBar: number;
  endBar: number;
  progression: readonly string[];
  section: MandelLyricSection;
}

export interface MandelLyricWarmthPlan {
  phrases: MandelSongPhrase[];
  sliceParams: JohnnyMandelSliceParams;
  cadenceBars: number[];
  borrowedIvBars: number[];
}

const MANDEL_PROGRESSIONS: ReadonlyArray<readonly string[]> = [
  ['Cmaj9', 'A7(b13)', 'Dm9', 'G13', 'C6/9'],
  ['Fmaj7', 'Fm6', 'Em7', 'A7(b9)', 'Dm9'],
  ['Cmaj7', 'Cmaj7/E', 'Am9', 'D7sus', 'G13', 'C6/9'],
  ['Ebmaj9', 'Cm9', 'Fm6', 'Bb13', 'Eb6/9'],
  ['Gmaj9', 'Em9', 'Am11', 'D7(#11)', 'G6/9'],
];

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
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

function transposeProgression(prog: readonly string[], tonicPc: number, refPc: number): string[] {
  const shift = ((tonicPc - refPc) % 12 + 12) % 12;
  if (shift === 0) return [...prog];
  return prog.map((sym) => {
    const hp = parseChordSymbol(stemOnly(sym)).harmonyPart;
    const m = hp.match(ROOT_AT_START);
    if (!m?.[1]) return sym;
    const rootPc = noteNameToPitchClass(m[1]);
    if (rootPc === undefined) return sym;
    const newRoot = pitchClassToSharpName(rootPc + shift);
    const qual = hp.slice(m[1].length);
    const slash = slashTail(sym);
    return `${newRoot}${qual}${slash}`;
  });
}

export function resolveJohnnyMandelSliceParams(
  genMeta: GenerationMetadata | undefined
): JohnnyMandelSliceParams {
  const fromMeta = genMeta?.johnnyMandelSliceParams;
  if (!fromMeta) return { ...DEFAULT_JOHNNY_MANDEL_SLICE_PARAMS };
  const d = DEFAULT_JOHNNY_MANDEL_SLICE_PARAMS;
  return {
    melodyForward: clamp01(fromMeta.melodyForward ?? d.melodyForward),
    mechanicalWarmth: clamp01(fromMeta.mechanicalWarmth ?? d.mechanicalWarmth),
    songHarmony: clamp01(fromMeta.songHarmony ?? d.songHarmony),
    orchestralFraming: clamp01(fromMeta.orchestralFraming ?? d.orchestralFraming),
    hollywoodAwareness: clamp01(fromMeta.hollywoodAwareness ?? d.hollywoodAwareness),
  };
}

function phraseSpanBars(seed: number, phraseIndex: number): number {
  const u = seededUnit(seed, phraseIndex, 992101);
  if (u < 0.35) return 8;
  if (u < 0.65) return 6;
  if (u < 0.85) return 4;
  return 5;
}

function sectionForPhraseIndex(idx: number, seed: number): MandelLyricSection {
  const u = seededUnit(seed, idx, 992102);
  if (idx === 0) return 'lyric_theme';
  if (u < 0.22) return 'borrowed_iv_window';
  if (u < 0.42) return 'inner_warmth_pass';
  if (u < 0.62) return 'brass_cushion';
  if (u < 0.82) return 'hollywood_transition';
  return 'soft_cadence';
}

/** Long lyrical phrase arcs (4–8 bars) with Mandel progressions. */
export function buildMandelLyricWarmthPlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: JohnnyMandelSliceParams = DEFAULT_JOHNNY_MANDEL_SLICE_PARAMS
): MandelLyricWarmthPlan {
  const phrases: MandelSongPhrase[] = [];
  const cadenceBars: number[] = [];
  const borrowedIvBars: number[] = [];
  let bar = 1;
  let idx = 0;

  while (bar <= totalBars) {
    const span = Math.min(phraseSpanBars(seed, idx), totalBars - bar + 1);
    const endBar = bar + span - 1;
    const baseProg = MANDEL_PROGRESSIONS[idx % MANDEL_PROGRESSIONS.length]!;
    const progression = transposeProgression(baseProg, tonicPc, 0);
    const section = sectionForPhraseIndex(idx, seed);

    phrases.push({
      index: idx,
      startBar: bar,
      endBar,
      progression,
      section,
    });

    cadenceBars.push(endBar);
    if (section === 'borrowed_iv_window' || progression.some((c) => /m6|Fm6|fm6|iv/.test(c))) {
      for (let b = bar; b <= endBar; b++) {
        if (seededUnit(seed, b, 992201) < params.mechanicalWarmth * 0.55) {
          borrowedIvBars.push(b);
        }
      }
    }

    bar = endBar + 1;
    idx++;
  }

  return { phrases, sliceParams: params, cadenceBars, borrowedIvBars };
}

export function phraseForBar(plan: MandelLyricWarmthPlan, bar: number): MandelSongPhrase | undefined {
  return plan.phrases.find((p) => bar >= p.startBar && bar <= p.endBar);
}

function chordFromPhrase(phrase: MandelSongPhrase, bar: number): string {
  const rel = bar - phrase.startBar;
  const span = phrase.endBar - phrase.startBar + 1;
  const slot = Math.min(
    phrase.progression.length - 1,
    Math.floor((rel / Math.max(1, span)) * phrase.progression.length)
  );
  return phrase.progression[slot] ?? phrase.progression[0]!;
}

function mandelSongColour(symbol: string, seed: number, bar: number, songHarmony: number): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const tl = hp.toLowerCase().replace(/\s/g, '');
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 992301);
  if (/^([a-g][#b]?)?maj|Δ/.test(tl) && u < songHarmony * 0.72) {
    if (u < 0.2) return `${root}6/9${slash}`;
    if (u < 0.38) return `${root}maj9${slash}`;
    if (u < 0.55) return `${root}maj7(add6)${slash}`;
    return `${root}maj7#11${slash}`;
  }
  if (/^([a-g][#b]?)?m(?!aj)/.test(tl) && u < songHarmony * 0.65) {
    if (u < 0.35) return `${root}m9${slash}`;
    return `${root}m11${slash}`;
  }
  if (/^([a-g][#b]?)?7|dom|13/.test(tl) && u < songHarmony * 0.58) {
    if (u < 0.25) return `${root}13${slash}`;
    if (u < 0.45) return `${root}7(b9)${slash}`;
    return `${root}7(#11)${slash}`;
  }
  return symbol;
}

function applyBorrowedIvWarmth(symbol: string, seed: number, bar: number, target: number): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 992401);
  if (u > target) return symbol;
  const rootPc = noteNameToPitchClass(root) ?? 0;
  const ivPc = (rootPc + 5) % 12;
  const ivName = pitchClassToSharpName(ivPc);
  return `${ivName}m6`;
}

function applyTonicProlongation(symbol: string, seed: number, bar: number, target: number): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 992402);
  if (u > target * 0.55) return symbol;
  if (u < 0.33) return `${stemOnly(symbol)}/E`;
  if (u < 0.66) return `${stemOnly(symbol)}/${root}`;
  const tonicPc = noteNameToPitchClass(root) ?? 0;
  const viPc = (tonicPc + 9) % 12;
  return `${pitchClassToSharpName(viPc)}m9`;
}

function softenedCadenceArrival(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 992403);
  if (u < 0.45) return `${root}6/9`;
  if (u < 0.75) return `${root}maj9`;
  return `${root}maj7(add6)`;
}

function looksPlainTriad(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase().replace(/\s/g, '');
  return /^[a-g][#b]?$/.test(tl) || /^[a-g][#b]?maj$/.test(tl) || /^[a-g][#b]?m$/.test(tl);
}

function applyMandelLayers(
  out: string[],
  plan: MandelLyricWarmthPlan,
  seed: number,
  receipts: string[],
  context: CompositionContext
): void {
  const p = plan.sliceParams;
  const tb = out.length;

  for (const phrase of plan.phrases) {
    receipts.push(
      `jmd:phrase@${phrase.startBar}-${phrase.endBar}:section=${phrase.section};prog=${phrase.progression.join('>')}`
    );

    for (let bar = phrase.startBar; bar <= phrase.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = chordFromPhrase(phrase, bar);

      if (seededUnit(seed, bar, 992501) < p.melodyForward * 0.75) {
        sym = mandelSongColour(sym, seed, bar, p.songHarmony);
        receipts.push(`jmd:melody_on_extensions@${bar}`);
      }

      if (seededUnit(seed, bar, 992502) < p.mechanicalWarmth * 0.68) {
        receipts.push(`jmd:inner_voice_semitone@${bar}:common_tone`);
      }

      if (
        phrase.section === 'borrowed_iv_window' ||
        plan.borrowedIvBars.includes(bar) ||
        seededUnit(seed, bar, 992503) < p.songHarmony * 0.42
      ) {
        const iv = applyBorrowedIvWarmth(sym, seed, bar, p.songHarmony * 0.55);
        if (iv !== sym) {
          sym = iv;
          receipts.push(`jmd:borrowed_iv_minor@${bar}`);
        }
      }

      if (seededUnit(seed, bar, 992504) < p.mechanicalWarmth * 0.52) {
        const prolong = applyTonicProlongation(sym, seed, bar, p.songHarmony);
        if (prolong !== sym) {
          sym = prolong;
          receipts.push(`jmd:tonic_prolongation@${bar}`);
        }
      }

      if (seededUnit(seed, bar, 992505) < p.melodyForward * 0.58) {
        receipts.push(`jmd:long_lyric_phrase@${bar}:span=${phrase.endBar - phrase.startBar + 1}`);
      }

      if (phrase.section === 'brass_cushion' && seededUnit(seed, bar, 992506) < p.orchestralFraming * 0.62) {
        receipts.push(`jmd:warm_brass_blend@${bar}:chorale`);
      }

      if (seededUnit(seed, bar, 992507) < p.orchestralFraming * 0.55) {
        receipts.push(`jmd:orchestra_frames_soloist@${bar}`);
      }

      if (seededUnit(seed, bar, 992508) < p.hollywoodAwareness * 0.5) {
        receipts.push(`jmd:hollywood_scene@${bar}:soft_entrance`);
      }

      if (bar === phrase.endBar) {
        sym = softenedCadenceArrival(sym, seed, bar);
        receipts.push(`jmd:softened_cadence@${bar}`);
      }

      if (looksPlainTriad(sym) && seededUnit(seed, bar, 992509) < 0.85) {
        sym = mandelSongColour(sym, seed, bar, p.songHarmony);
        receipts.push(`jmd:strip_plain_triad@${bar}`);
      }

      out[i] = sym;
    }
  }

  for (let bar = 1; bar <= tb; bar++) {
    if (plan.cadenceBars.includes(bar)) continue;
    const phrase = phraseForBar(plan, bar);
    if (!phrase) continue;
    if (phrase.endBar === bar) continue;
  }
}

export interface JohnnyMandelHarmonyAccumulator {
  barsConsidered: number;
  extensionTouches: number;
  innerWarmthTouches: number;
  borrowedIvTouches: number;
  softenedCadenceTouches: number;
  brassCushionTouches: number;
}

export function createJohnnyMandelHarmonyAccumulator(): JohnnyMandelHarmonyAccumulator {
  return {
    barsConsidered: 0,
    extensionTouches: 0,
    innerWarmthTouches: 0,
    borrowedIvTouches: 0,
    softenedCadenceTouches: 0,
    brassCushionTouches: 0,
  };
}

function scanChord(chord: string, acc: JohnnyMandelHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj9|6\/9|6-9|m9|m11|13|add6|#11|b9|sus/.test(t)) acc.extensionTouches++;
  if (/m6|fm6/.test(t)) acc.borrowedIvTouches++;
}

export function accumulateJohnnyMandelHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: JohnnyMandelHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

export function countPlainTriadArrivals(bars: readonly string[] | undefined, cadenceBars: number[]): number {
  if (!bars) return 0;
  let count = 0;
  for (const bar of cadenceBars) {
    const sym = bars[bar - 1];
    if (sym && looksPlainTriad(sym)) count++;
  }
  return count;
}

export function minMandelPhraseSpan(plan: MandelLyricWarmthPlan | undefined): number {
  if (!plan?.phrases.length) return 0;
  return Math.min(...plan.phrases.map((p) => p.endBar - p.startBar + 1));
}

export const JOHNNY_MANDEL_HARMONIC_VOICE_IDS = ['johnny_mandel', 'mandel_lyric_warmth'] as const;

export function isJohnnyMandelHarmonicVoiceId(raw: string | null | undefined): boolean {
  const id = normalizeHarmonicVoiceId(String(raw ?? ''));
  return id === 'johnny_mandel' || id === 'mandel_lyric_warmth';
}

/**
 * Primary songwriter or harmonicVoice selects Johnny Mandel harmony authority.
 * Single-gate — Wave-D pattern.
 *
 * Accepts `johnny_mandel` | VRB `mandel_lyric_warmth`. Soft `mandel`/`jmd` do **not** engage HV.
 * `mandelStructuralRelax` stays primary-id keyed (holdback).
 */
export function isJohnnyMandelHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  return (
    isJohnnyMandelHarmonicVoiceId(metadata?.songwriterStyleId) ||
    isJohnnyMandelHarmonicVoiceId(metadata?.harmonicVoice)
  );
}

export function precomputeJohnnyMandelEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 0;
  const params = resolveJohnnyMandelSliceParams(genMeta);
  genMeta.johnnyMandelSliceParams = params;

  const plan = buildMandelLyricWarmthPlan(seed, tb, tonicPc, params);
  genMeta.mandelLyricWarmthPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `jmd:params=mf:${params.melodyForward.toFixed(2)};mw:${params.mechanicalWarmth.toFixed(2)};sh:${params.songHarmony.toFixed(2)};of:${params.orchestralFraming.toFixed(2)};ha:${params.hollywoodAwareness.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);
  applyMandelLayers(out, plan, seed, receipts, context);

  genMeta.johnnyMandelEffectiveHarmonyBars = out;
  genMeta.johnnyMandelDeviceReceipts = receipts;
}

export function finalizeJohnnyMandelMetadata(
  metadata: GenerationMetadata,
  acc: JohnnyMandelHarmonyAccumulator,
  deviceReceipts?: string[]
): void {
  const flat = deviceReceipts ?? [...(metadata.johnnyMandelDeviceReceipts ?? [])];
  const plan = metadata.mandelLyricWarmthPlan;
  const params = metadata.johnnyMandelSliceParams ?? DEFAULT_JOHNNY_MANDEL_SLICE_PARAMS;

  acc.innerWarmthTouches = flat.filter((r) => r.startsWith('jmd:inner_voice_semitone@')).length;
  acc.borrowedIvTouches = flat.filter((r) => r.startsWith('jmd:borrowed_iv_minor@')).length;
  acc.softenedCadenceTouches = flat.filter((r) => r.startsWith('jmd:softened_cadence@')).length;
  acc.brassCushionTouches = flat.filter((r) => r.startsWith('jmd:warm_brass_blend@')).length;

  metadata.johnnyMandelDiagnostics = {
    songwriterId: 'johnny_mandel',
    barsConsidered: acc.barsConsidered,
    extensionTouches: acc.extensionTouches,
    innerWarmthTouches: acc.innerWarmthTouches,
    borrowedIvTouches: acc.borrowedIvTouches,
    softenedCadenceTouches: acc.softenedCadenceTouches,
    brassCushionTouches: acc.brassCushionTouches,
    minPhraseSpan: minMandelPhraseSpan(plan),
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.johnnyMandelSliceReceipt = [
    'Johnny Mandel (melody-forward Studio Orchestral warmth slice)',
    `phrases=${plan?.phrases.length ?? 0}`,
    `mf=${params.melodyForward.toFixed(2)}`,
    `mw=${params.mechanicalWarmth.toFixed(2)}`,
    `ext≈${acc.extensionTouches}`,
    `iv≈${acc.borrowedIvTouches}`,
    `cadence≈${acc.softenedCadenceTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function isSongwriterJohnnyMandel(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'johnny_mandel' } {
  return genMeta?.songwriterStyleId === 'johnny_mandel';
}
