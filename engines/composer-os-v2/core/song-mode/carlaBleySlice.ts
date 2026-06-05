/**
 * Carla Bley — formal irony ECM Song Mode harmony slice (`cbl:*` receipts).
 * Topic staging → motif contamination → climax deflation → reprise with altered meaning.
 * Distinct from Wheeler suspension, Garbarek ritual field, Schneider bloom, Threadgill cells.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';
import {
  bleyEpisodeForBar,
  buildCarlaBleyEpisodePlan,
  DEFAULT_CARLA_BLEY_SLICE_PARAMS,
  type BleyIronyEpisodeSpec,
  type BleyStyleTopic,
  type CarlaBleyEpisodePlan,
  type CarlaBleySliceParams,
} from './bleyEpisodeTypes';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type { CarlaBleySliceParams, CarlaBleyEpisodePlan, BleyStyleTopic };

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

function harmonyRootPc(sym: string): number | undefined {
  const hp = parseChordSymbol(sym).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function replaceChordRoot(symbol: string, newRoot: string): string {
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const qual = hp.slice(m[1]!.length);
  return `${newRoot}${qual}${slash}`;
}

function looksFunctionalTwoFive(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bm7\b|\bm9\b|ø|m7b5/.test(tl) && !/maj|sus|dim|aug/.test(tl);
}

function looksDominantFamily(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  return /7|9|11|13|alt/.test(tl);
}

export function resolveCarlaBleySliceParams(genMeta: GenerationMetadata | undefined): CarlaBleySliceParams {
  const fromMeta = genMeta?.carlaBleySliceParams;
  if (!fromMeta) return { ...DEFAULT_CARLA_BLEY_SLICE_PARAMS };
  const d = DEFAULT_CARLA_BLEY_SLICE_PARAMS;
  return {
    formalIronyIndex: clamp01(fromMeta.formalIronyIndex ?? d.formalIronyIndex),
    deadpanPresentation: clamp01(fromMeta.deadpanPresentation ?? d.deadpanPresentation),
    tonicLegibility: clamp01(fromMeta.tonicLegibility ?? d.tonicLegibility),
    cadenceDeflection: clamp01(fromMeta.cadenceDeflection ?? d.cadenceDeflection),
    motifContamination: clamp01(fromMeta.motifContamination ?? d.motifContamination),
    climaxDeflation: clamp01(fromMeta.climaxDeflation ?? d.climaxDeflation),
    repriseDefamiliarization: clamp01(fromMeta.repriseDefamiliarization ?? d.repriseDefamiliarization),
  };
}

function topicStagingHarmony(
  topic: BleyStyleTopic,
  seed: number,
  bar: number,
  base: string,
  tonicLegibility: number
): string {
  const pc = harmonyRootPc(base) ?? (seed + bar) % 12;
  const r = PC_NAMES[pc]!;
  const u = seededUnit(seed, bar, 893101);
  if (topic === 'hymn') {
    if (u < tonicLegibility * 0.8) return `${r}maj7(add9)`;
    return `${r}sus4(add9)`;
  }
  if (topic === 'march') return u < 0.5 ? `${r}maj7` : `${r}7`;
  if (topic === 'cabaret') return u < 0.55 ? `${r}m7` : `${r}maj7`;
  if (topic === 'ballad') return u < 0.6 ? `${r}maj9` : `${r}6/9`;
  return u < 0.5 ? `${r}m9` : `${r}maj7`;
}

function motifContaminationPass(
  sym: string,
  seed: number,
  bar: number,
  weight: number,
  receipts: string[]
): string {
  if (seededUnit(seed, bar, 893201) > weight) return sym;
  const pc = harmonyRootPc(sym);
  if (pc === undefined) return sym;
  receipts.push(`cbl:contamination@bar${bar}`);
  const u = seededUnit(seed, bar, 893202);
  if (u < 0.34) return replaceChordRoot(sym, PC_NAMES[(pc + 1) % 12]!);
  if (u < 0.67) return `${stemOnly(sym)}6/9`;
  return `${PC_NAMES[pc]!}maj7`;
}

function climaxDeflationPass(
  sym: string,
  seed: number,
  bar: number,
  weight: number,
  receipts: string[]
): string {
  if (seededUnit(seed, bar, 893301) > weight) return sym;
  const pc = harmonyRootPc(sym);
  if (pc === undefined) return sym;
  receipts.push(`cbl:deflate@bar${bar}`);
  const u = seededUnit(seed, bar, 893302);
  if (u < 0.4) return `${PC_NAMES[pc]!}6`;
  if (u < 0.7) return `${PC_NAMES[pc]!}maj7`;
  return `${PC_NAMES[pc]!}`;
}

function repriseDefamiliarizationPass(
  sym: string,
  ep: BleyIronyEpisodeSpec,
  seed: number,
  bar: number,
  weight: number,
  openingTopic: BleyStyleTopic,
  receipts: string[]
): string {
  if (ep.phase !== 'reprise_altered' && ep.topic !== openingTopic) return sym;
  if (seededUnit(seed, bar, 893401) > weight) return sym;
  const pc = harmonyRootPc(sym);
  if (pc === undefined) return sym;
  receipts.push(`cbl:reprise_altered@bar${bar}`);
  if (ep.choirSwap) receipts.push(`cbl:choir_swap@bar${bar}`);
  const bassPc = (pc + (ep.choirSwap ? 7 : 5)) % 12;
  return `${stemOnly(sym)}/${PC_NAMES[bassPc]!}`;
}

function cadenceDeflectionPass(
  sym: string,
  seed: number,
  bar: number,
  weight: number,
  receipts: string[]
): string {
  if (!looksFunctionalTwoFive(sym) && !looksDominantFamily(sym)) return sym;
  if (seededUnit(seed, bar, 893501) > weight) return sym;
  const pc = harmonyRootPc(sym) ?? 0;
  receipts.push(`cbl:cadence_deflect@bar${bar}`);
  if (seededUnit(seed, bar, 893502) < 0.5) return `${PC_NAMES[pc]!}6/9`;
  return `${PC_NAMES[(pc + 1) % 12]!}maj7`;
}

function deadpanCadencePass(
  sym: string,
  seed: number,
  bar: number,
  deadpan: number,
  receipts: string[]
): string {
  if (seededUnit(seed, bar, 893601) > deadpan * 0.85) return sym;
  const pc = harmonyRootPc(sym);
  if (pc === undefined) return sym;
  receipts.push(`cbl:deadpan_cadence@bar${bar}`);
  return `${PC_NAMES[pc]!}maj7`;
}

function plainChordExposure(sym: string, seed: number, bar: number, receipts: string[]): string {
  if (seededUnit(seed, bar, 893701) > 0.5) return sym;
  const pc = harmonyRootPc(sym);
  if (pc === undefined) return sym;
  receipts.push(`cbl:plain_chord@bar${bar}`);
  const u = seededUnit(seed, bar, 893702);
  if (u < 0.33) return `${PC_NAMES[pc]!}`;
  if (u < 0.66) return `${PC_NAMES[pc]!}6`;
  return `${PC_NAMES[pc]!}maj7`;
}

function chromaticPivotPass(
  sym: string,
  seed: number,
  bar: number,
  tonicLegibility: number,
  receipts: string[]
): string {
  if (seededUnit(seed, bar, 893801) > tonicLegibility * 0.55) return sym;
  const pc = harmonyRootPc(sym);
  if (pc === undefined) return sym;
  receipts.push(`cbl:chromatic_pivot@bar${bar}`);
  return replaceChordRoot(sym, PC_NAMES[(pc + 1) % 12]!);
}

function applyIronyEngine(
  out: string[],
  plan: CarlaBleyEpisodePlan,
  params: CarlaBleySliceParams,
  seed: number,
  receipts: string[]
): void {
  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const ep = bleyEpisodeForBar(plan, bar);
    if (!ep) continue;
    let sym = out[i]!;

    if (bar === ep.startBar) {
      receipts.push(`cbl:episode@${ep.topic}_${ep.phase}@bar${bar}`);
      if (ep.phase === 'topic_staging' || ep.phase === 'quotation_window') {
        receipts.push(`cbl:topic_${ep.topic}@bar${bar}`);
      }
      if (ep.phase === 'quotation_window') receipts.push(`cbl:quotation@${ep.topic}@bar${bar}`);
    }

    sym = cadenceDeflectionPass(sym, seed, bar, params.cadenceDeflection, receipts);

    if (ep.phase === 'topic_staging' || ep.phase === 'quotation_window') {
      sym = topicStagingHarmony(ep.topic, seed, bar, sym, params.tonicLegibility);
      receipts.push(`cbl:topic_staging@bar${bar}`);
    }

    if (ep.phase === 'motif_contamination') {
      sym = motifContaminationPass(sym, seed, bar, params.motifContamination, receipts);
    }

    if (ep.phase === 'climax_deflation' || bar === plan.deflationPivotBar) {
      sym = climaxDeflationPass(sym, seed, bar, params.climaxDeflation, receipts);
      if (seededUnit(seed, bar, 893901) < params.deadpanPresentation * 0.6) {
        receipts.push(`cbl:climax_undercut@bar${bar}`);
      }
    }

    sym = repriseDefamiliarizationPass(
      sym,
      ep,
      seed,
      bar,
      params.repriseDefamiliarization,
      plan.openingTopic,
      receipts
    );

    sym = chromaticPivotPass(sym, seed, bar, params.tonicLegibility, receipts);

    if (seededUnit(seed, bar, 894001) < params.deadpanPresentation * 0.7) {
      sym = deadpanCadencePass(sym, seed, bar, params.deadpanPresentation, receipts);
    }

    if (seededUnit(seed, bar, 894101) < params.formalIronyIndex * 0.45) {
      sym = plainChordExposure(sym, seed, bar, receipts);
    }

    if (seededUnit(seed, bar, 894201) < params.formalIronyIndex * 0.65) {
      receipts.push(`cbl:formal_irony@bar${bar}`);
    }

    out[i] = sym;
  }
}

export function isSongwriterCarlaBley(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'carla_bley' } {
  return genMeta?.songwriterStyleId === 'carla_bley';
}

export interface CarlaBleyHarmonyAccumulator {
  barsConsidered: number;
  ironyTouches: number;
  deflationTouches: number;
  deadpanTouches: number;
  plainChordTouches: number;
  repriseTouches: number;
  topicStagingTouches: number;
}

export function createCarlaBleyHarmonyAccumulator(): CarlaBleyHarmonyAccumulator {
  return {
    barsConsidered: 0,
    ironyTouches: 0,
    deflationTouches: 0,
    deadpanTouches: 0,
    plainChordTouches: 0,
    repriseTouches: 0,
    topicStagingTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: CarlaBleyHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/sus|add9|6\/9|maj7|maj9/.test(t)) acc.topicStagingTouches++;
  if (/^[^/]+$/.test(stemOnly(c)) && !/9|11|13|add|sus/.test(t)) acc.plainChordTouches++;
  if (/6\b|6\/9|maj7\b/.test(t) && !/add9|13/.test(t)) acc.deadpanTouches++;
  if (/\//.test(c)) acc.repriseTouches++;
  if (/m7|7\b|sus/.test(t)) acc.ironyTouches++;
  if (/6\b|^[^/]+$/.test(c)) acc.deflationTouches++;
}

export function accumulateCarlaBleyHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: CarlaBleyHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function finalizeCarlaBleyMetadata(metadata: GenerationMetadata, acc: CarlaBleyHarmonyAccumulator): void {
  const flat = [...(metadata.carlaBleyDeviceReceipts ?? [])];
  const plan = metadata.carlaBleyEpisodePlan;
  const params = metadata.carlaBleySliceParams ?? DEFAULT_CARLA_BLEY_SLICE_PARAMS;
  metadata.carlaBleyDiagnostics = {
    songwriterId: 'carla_bley',
    barsConsidered: acc.barsConsidered,
    ironyTouches: acc.ironyTouches,
    deflationTouches: acc.deflationTouches,
    deadpanTouches: acc.deadpanTouches,
    plainChordTouches: acc.plainChordTouches,
    repriseTouches: acc.repriseTouches,
    topicStagingTouches: acc.topicStagingTouches,
    episodeCount: plan?.episodes.length,
    formalIronyIndex: params.formalIronyIndex,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.carlaBleySliceReceipt = [
    'Carla Bley (formal irony ECM slice)',
    `episodes=${plan?.episodes.length ?? 0}`,
    `fii=${params.formalIronyIndex.toFixed(2)}`,
    `deadpan=${params.deadpanPresentation.toFixed(2)}`,
    `irony≈${acc.ironyTouches}`,
    `deflate≈${acc.deflationTouches}`,
    `reprise≈${acc.repriseTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `cbl_devices=${flat.length}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

function appendPlanReceipts(plan: CarlaBleyEpisodePlan, receipts: string[], tb: number): void {
  const p = plan.sliceParams;
  receipts.push(
    `cbl:params=fii:${p.formalIronyIndex.toFixed(2)};dp:${p.deadpanPresentation.toFixed(2)};tl:${p.tonicLegibility.toFixed(2)}`
  );
  receipts.push(`cbl:opening_topic=${plan.openingTopic}`);
  receipts.push(`cbl:deflation_pivot@${plan.deflationPivotBar}`);
  for (const ep of plan.episodes) {
    receipts.push(
      `cbl:episode_plan@${ep.startBar}-${ep.endBar}:topic=${ep.topic};phase=${ep.phase};swap=${ep.choirSwap}`
    );
  }
  if (tb >= 16) receipts.push(`cbl:formal_irony_hierarchy`);
}

function wireVrbFingerprintReachability(context: CompositionContext, receipts: string[]): void {
  const bundle = context.voiceBundle;
  if (bundle?.voiceId !== 'carla_bley' && bundle?.voiceId !== 'bley') return;
  const fps = bundle.orchestrationPolicy.fingerprintReceipts ?? [];
  receipts.push(`cbl:vrb_fingerprints=${fps.length}`);
  if (fps.length >= 12) receipts.push('cbl:vrb_reachable');
}

export function precomputeCarlaBleyEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const params = resolveCarlaBleySliceParams(genMeta);
  const receipts: string[] = [];

  genMeta.carlaBleySliceParams = params;
  genMeta.formalIronyHierarchy = true;
  genMeta.lineFirstHierarchy = false;
  context.formalIronyHierarchy = true;

  const plan = buildCarlaBleyEpisodePlan(seed, tb, params);
  genMeta.carlaBleyEpisodePlan = plan;
  genMeta.carlaBleyEpisodePlanSummary = plan.episodes
    .map((e) => `${e.topic}:${e.phase}:${e.startBar}-${e.endBar}`)
    .join('|');
  genMeta.carlaBleyDeflationPivotBar = plan.deflationPivotBar;

  appendPlanReceipts(plan, receipts, tb);
  wireVrbFingerprintReachability(context, receipts);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) {
      out[b - 1] = raw[b - 1]!;
    }
  }

  applyIronyEngine(out, plan, params, seed, receipts);

  genMeta.carlaBleyEffectiveHarmonyBars = out;
  genMeta.carlaBleyDeviceReceipts = receipts;
}
