/**
 * Henry Threadgill — interval-cell / episodic polymodal Song Mode harmony slice (`ht:*` receipts).
 * Episode texture plan + pitch-set enrichment (not functional ii–V grammar).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type {
  HenryThreadgillEpisodePlan,
  HenryThreadgillSliceParams,
  ThreadgillDensityTier,
  ThreadgillEpisodeSpec,
  ThreadgillEpisodeTexture,
  ThreadgillMetricFeel,
  ThreadgillModalLayer,
} from './threadgillEpisodeTypes';
import { DEFAULT_HENRY_THREADGILL_SLICE_PARAMS } from './threadgillEpisodeTypes';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const TEXTURES: ThreadgillEpisodeTexture[] = ['sparse_cell', 'hocket_stream', 'polymodal_field', 'episodic_bloom'];
const METRIC_FEELS: ThreadgillMetricFeel[] = ['offset_five', 'offset_seven', 'fractured_four', 'open_three'];
const MODAL_LAYERS: ThreadgillModalLayer[] = ['low_anchor', 'mid_hocket', 'high_edge'];
const DENSITIES: ThreadgillDensityTier[] = ['sparse', 'low_medium', 'bloom'];

/** Closed interval families — aligned with `harmonicScene.ts` Threadgill rotation. */
const THREADGILL_IC_FAMILIES: readonly (readonly number[])[] = [
  [1, 2, 3],
  [5, 6, 7],
  [8, 10],
];

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

function looksFunctionalTwoFive(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bm7\b|\bm9\b|ø|m7b5/.test(tl) && !/maj|sus|dim|aug/.test(tl);
}

function looksDominantFamily(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  return /7|9|11|13|alt/.test(tl);
}

function episodeTupleDiff(a: ThreadgillEpisodeSpec, b: ThreadgillEpisodeSpec): number {
  let n = 0;
  if (a.texture !== b.texture) n++;
  if (a.metricFeel !== b.metricFeel) n++;
  if (a.modalLayer !== b.modalLayer) n++;
  if (a.densityTier !== b.densityTier) n++;
  if (a.intervalFamilyIdx !== b.intervalFamilyIdx) n++;
  return n;
}

function antiMetricPhraseLength(seed: number, phraseIndex: number, antiMetricStrength: number): number {
  const u = seededUnit(seed, phraseIndex, 771011);
  if (antiMetricStrength >= 0.55) {
    if (u < 0.22) return 5;
    if (u < 0.42) return 7;
    if (u < 0.58) return 6;
    if (u < 0.74) return 9;
    if (u < 0.88) return 3;
    return 11;
  }
  if (u < 0.35) return 6;
  if (u < 0.65) return 8;
  return 5;
}

function distributeIrregularEpisodeBarCounts(
  totalBars: number,
  seed: number,
  antiMetricStrength: number,
  episodeContrast: number
): { counts: number[]; phraseLengths: number[] } {
  const tb = Math.max(4, Math.floor(totalBars));
  const minEpisodes = Math.max(3, Math.min(8, Math.floor(tb / (4 + episodeContrast * 4))));
  const counts: number[] = [];
  const phraseLengths: number[] = [];
  let remaining = tb;
  let phraseIdx = 0;
  while (remaining > 0 && counts.length < 8) {
    let len = antiMetricPhraseLength(seed, phraseIdx, antiMetricStrength);
    phraseLengths.push(len);
    if (counts.length === minEpisodes - 1 || remaining <= len + 2) {
      len = remaining;
    } else {
      len = Math.min(remaining, Math.max(2, len));
    }
    counts.push(len);
    remaining -= len;
    phraseIdx++;
    if (counts.length >= minEpisodes && remaining <= 0) break;
  }
  if (remaining > 0 && counts.length) {
    counts[counts.length - 1] = (counts[counts.length - 1] ?? 0) + remaining;
  }
  return { counts, phraseLengths };
}

export function resolveHenryThreadgillSliceParams(
  genMeta: GenerationMetadata | undefined
): HenryThreadgillSliceParams {
  const fromMeta = genMeta?.henryThreadgillSliceParams;
  if (!fromMeta) return { ...DEFAULT_HENRY_THREADGILL_SLICE_PARAMS };
  return {
    intervalCellDensity: clamp01(fromMeta.intervalCellDensity ?? DEFAULT_HENRY_THREADGILL_SLICE_PARAMS.intervalCellDensity),
    antiMetricStrength: clamp01(fromMeta.antiMetricStrength ?? DEFAULT_HENRY_THREADGILL_SLICE_PARAMS.antiMetricStrength),
    polymodalSeparation: clamp01(fromMeta.polymodalSeparation ?? DEFAULT_HENRY_THREADGILL_SLICE_PARAMS.polymodalSeparation),
    episodeContrast: clamp01(fromMeta.episodeContrast ?? DEFAULT_HENRY_THREADGILL_SLICE_PARAMS.episodeContrast),
  };
}

/**
 * Seeded episode chain: adjacent episodes differ in ≥2 texture/metric/modal/density/family axes;
 * irregular phrase lengths when antiMetricStrength is high.
 */
export function buildHenryThreadgillEpisodePlan(
  seed: number,
  totalBars: number,
  params: HenryThreadgillSliceParams = DEFAULT_HENRY_THREADGILL_SLICE_PARAMS
): HenryThreadgillEpisodePlan {
  const { counts, phraseLengths } = distributeIrregularEpisodeBarCounts(
    totalBars,
    seed,
    params.antiMetricStrength,
    params.episodeContrast
  );
  const episodes: ThreadgillEpisodeSpec[] = [];
  let startBar = 1;
  let prev: ThreadgillEpisodeSpec | null = null;

  for (let i = 0; i < counts.length; i++) {
    const dur = Math.max(1, counts[i] ?? 1);
    const endBar = Math.min(Math.max(1, Math.floor(totalBars)), startBar + dur - 1);
    let attempt = 0;
    let spec: ThreadgillEpisodeSpec;
    for (;;) {
      const u0 = seededUnit(seed, i, 771100 + attempt);
      const u1 = seededUnit(seed, i, 771200 + attempt);
      const u2 = seededUnit(seed, i, 771300 + attempt);
      const u3 = seededUnit(seed, i, 771400 + attempt);
      const u4 = seededUnit(seed, i, 771500 + attempt);
      let texture = TEXTURES[Math.floor(u0 * 4) % 4]!;
      const metricFeel = METRIC_FEELS[Math.floor(u1 * 4) % 4]!;
      const modalLayer = MODAL_LAYERS[Math.floor(u2 * 3) % 3]!;
      const densityTier = DENSITIES[Math.floor(u3 * 3) % 3]!;
      const intervalFamilyIdx = i % 3;
      if (prev && texture === prev.texture) {
        texture = TEXTURES[(TEXTURES.indexOf(texture) + 1 + Math.floor(u4 * 3)) % 4]!;
      }
      spec = {
        index: i,
        startBar,
        endBar,
        texture,
        metricFeel,
        modalLayer,
        densityTier,
        intervalFamilyIdx,
      };
      const minDiff = params.episodeContrast >= 0.5 ? 2 : 1;
      if (!prev || (episodeTupleDiff(spec, prev) >= minDiff && spec.texture !== prev.texture)) {
        break;
      }
      attempt++;
      if (attempt > 80) {
        spec = {
          ...spec,
          texture: TEXTURES[(TEXTURES.indexOf(prev!.texture) + 1) % 4]!,
          intervalFamilyIdx: (prev!.intervalFamilyIdx + 1) % 3,
        };
        break;
      }
    }
    episodes.push(spec);
    prev = spec;
    startBar = endBar + 1;
    if (startBar > totalBars) break;
  }

  return { episodes, sliceParams: params, antiMetricPhraseLengths: phraseLengths };
}

export function episodeForBar(plan: HenryThreadgillEpisodePlan, bar: number): ThreadgillEpisodeSpec | undefined {
  return plan.episodes.find((e) => bar >= e.startBar && bar <= e.endBar);
}

export function isSongwriterHenryThreadgill(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'henry_threadgill' } {
  return genMeta?.songwriterStyleId === 'henry_threadgill';
}

export interface HenryThreadgillHarmonyAccumulator {
  barsConsidered: number;
  intervalCellTouches: number;
  polymodalTouches: number;
  antiMetricTouches: number;
  pitchSetTouches: number;
}

export function createHenryThreadgillHarmonyAccumulator(): HenryThreadgillHarmonyAccumulator {
  return { barsConsidered: 0, intervalCellTouches: 0, polymodalTouches: 0, antiMetricTouches: 0, pitchSetTouches: 0 };
}

function scanChordForDiagnostics(chord: string, acc: HenryThreadgillHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/\(add|#9|b9|#11|no3|sus/.test(t)) acc.intervalCellTouches++;
  if (/\//.test(c)) acc.polymodalTouches++;
  if (/sus|quart|no3|add4|add9/.test(t)) acc.pitchSetTouches++;
}

export function accumulateHenryThreadgillHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: HenryThreadgillHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

function cellEnrichmentForFamily(symbol: string, familyIdx: number, seed: number, bar: number): string {
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 771601 + familyIdx);
  const fam = THREADGILL_IC_FAMILIES[familyIdx % 3]!;
  if (fam.includes(1) || fam.includes(2)) {
    if (u < 0.34) return `${root}(b9,#9,no3)${slash}`;
    if (u < 0.67) return `${root}m(add4,b6)${slash}`;
    return `${root}(add9,b9)${slash}`;
  }
  if (fam.includes(6)) {
    if (u < 0.4) return `${root}sus(b9,#11)${slash}`;
    if (u < 0.75) return `${root}7alt${slash}`;
    return `${root}(no3,b13)${slash}`;
  }
  if (u < 0.45) return `${root}m11${slash}`;
  if (u < 0.8) return `${root}7sus(b9)${slash}`;
  return `${root}6(9,b13)${slash}`;
}

function maybeDefunctionalizeBar(symbol: string, seed: number, bar: number, density: number): string {
  if (density < 0.35) return symbol;
  if (!looksFunctionalTwoFive(symbol) && !looksDominantFamily(symbol)) return symbol;
  const u = seededUnit(seed, bar, 771701);
  if (u > 0.22 + density * 0.35) return symbol;
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const sidePc = (r + (u < 0.11 ? 1 : 2) + 12) % 12;
  return `${pitchClassToSharpName(sidePc)}(add9,no3)${slash}`;
}

function maybePolymodalBass(
  symbol: string,
  seed: number,
  bar: number,
  separation: number,
  modalLayer: ThreadgillModalLayer | undefined
): string {
  if (separation < 0.3 || symbol.includes('/')) return symbol;
  const u = seededUnit(seed, bar, 771801);
  if (u > 0.18 + separation * 0.42) return symbol;
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const st = stemOnly(symbol);
  const bassOffset = modalLayer === 'low_anchor' ? 7 : modalLayer === 'high_edge' ? 10 : 5;
  const bassPc = (r + bassOffset + 12) % 12;
  return `${st}/${pitchClassToSharpName(bassPc)}`;
}

function appendPlanReceipts(plan: HenryThreadgillEpisodePlan, receipts: string[], tb: number): void {
  const p = plan.sliceParams;
  receipts.push(
    `ht:params=icd:${p.intervalCellDensity.toFixed(2)};am:${p.antiMetricStrength.toFixed(2)};pm:${p.polymodalSeparation.toFixed(2)};ec:${p.episodeContrast.toFixed(2)}`
  );
  receipts.push(`ht:phrase_lengths=${plan.antiMetricPhraseLengths.join(';')}`);
  for (const ep of plan.episodes) {
    receipts.push(
      `ht:episode@${ep.startBar}-${ep.endBar}:texture=${ep.texture};metric=${ep.metricFeel};modal=${ep.modalLayer};density=${ep.densityTier};fam=${ep.intervalFamilyIdx}`
    );
    receipts.push(`ht:texture_${ep.texture}@${ep.startBar}`);
    receipts.push(`ht:family_${ep.intervalFamilyIdx}@${ep.startBar}`);
  }
  if (tb >= 12) {
    const pivot = plan.episodes[Math.min(1, plan.episodes.length - 1)]?.startBar ?? 5;
    receipts.push(`ht:anti_metric_pivot@${pivot}`);
  }
}

function wireVrbFingerprintReachability(context: CompositionContext, receipts: string[]): void {
  const bundle = context.voiceBundle;
  if (bundle?.voiceId !== 'henry_threadgill') return;
  const fps = bundle.orchestrationPolicy.fingerprintReceipts ?? [];
  receipts.push(`ht:vrb_fingerprints=${fps.length}`);
  if (fps.length >= 20) receipts.push('ht:vrb_reachable');
}

function applyEpisodePasses(
  out: string[],
  plan: HenryThreadgillEpisodePlan,
  seed: number,
  receipts: string[],
  params: HenryThreadgillSliceParams
): void {
  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const ep = episodeForBar(plan, bar);
    if (!ep) continue;
    let sym = out[i]!;
    const before = sym;
    if (seededUnit(seed, bar, 771901) < params.intervalCellDensity * 0.55) {
      sym = cellEnrichmentForFamily(sym, ep.intervalFamilyIdx, seed, bar);
    }
    sym = maybeDefunctionalizeBar(sym, seed, bar, params.intervalCellDensity);
    sym = maybePolymodalBass(sym, seed, bar, params.polymodalSeparation, ep.modalLayer);
    if (sym !== before) {
      out[i] = sym;
      receipts.push(`ht:cell@${bar}`);
    }
    if (bar === ep.startBar) {
      receipts.push(`ht:episode_start@${bar}`);
      if (ep.metricFeel.startsWith('offset_')) receipts.push(`ht:${ep.metricFeel}@${bar}`);
    }
  }
}

export function precomputeHenryThreadgillEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const params = resolveHenryThreadgillSliceParams(genMeta);
  genMeta.henryThreadgillSliceParams = params;

  const plan = buildHenryThreadgillEpisodePlan(seed, tb, params);
  genMeta.henryThreadgillEpisodePlan = plan;

  const receipts: string[] = [];
  appendPlanReceipts(plan, receipts, tb);
  wireVrbFingerprintReachability(context, receipts);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  inferTonicPitchClassFromBar1(context);
  applyEpisodePasses(out, plan, seed, receipts, params);

  genMeta.henryThreadgillEffectiveHarmonyBars = out;
  genMeta.henryThreadgillDeviceReceipts = receipts;
}

export function finalizeHenryThreadgillMetadata(
  metadata: GenerationMetadata,
  acc: HenryThreadgillHarmonyAccumulator
): void {
  const flat = [...(metadata.henryThreadgillDeviceReceipts ?? [])];
  const ep = metadata.henryThreadgillEpisodePlan;
  const params = metadata.henryThreadgillSliceParams ?? DEFAULT_HENRY_THREADGILL_SLICE_PARAMS;
  metadata.henryThreadgillDiagnostics = {
    songwriterId: 'henry_threadgill',
    barsConsidered: acc.barsConsidered,
    intervalCellTouches: acc.intervalCellTouches,
    polymodalTouches: acc.polymodalTouches,
    antiMetricTouches: flat.filter((r) => r.startsWith('ht:anti_metric') || r.includes('offset_')).length,
    pitchSetTouches: acc.pitchSetTouches,
    episodeCount: ep?.episodes.length,
    sliceParams: { ...params },
    vrbFingerprintCount: flat.find((r) => r.startsWith('ht:vrb_fingerprints='))?.split('=')[1],
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.henryThreadgillSliceReceipt = [
    `Henry Threadgill (interval-cell episode slice): episodes=${ep?.episodes.length ?? 0}`,
    `icd=${params.intervalCellDensity.toFixed(2)}`,
    `am=${params.antiMetricStrength.toFixed(2)}`,
    `pm=${params.polymodalSeparation.toFixed(2)}`,
    `ec=${params.episodeContrast.toFixed(2)}`,
    `cell≈${acc.intervalCellTouches}`,
    `poly≈${acc.polymodalTouches}`,
    `pitchSet≈${acc.pitchSetTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
