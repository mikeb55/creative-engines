/**
 * Frank Zappa — string quartet harmony variant: devices mapped per part (not one device per bar globally).
 * Receipts **`fz:sq:d{1–5}:<device>@bar{N}#v1`**.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { SONG_MODE_MOTIF_BAR_17, SONG_MODE_MOTIF_BAR_9 } from '../motif/motifEngineTypes';
/** Device constants + transforms: canonical `frankZappaSlice.ts` (`core/goldenPath` → `song-mode`). */
import {
  applyFrankZappaHarmonyDevice,
  countFrankZappaDeviceFiresFromReceipts,
  enforceZappaHarmonyLanguageFloors,
  FRANK_ZAPPA_DEVICE_POLYTONAL_SUPERIMPOSITION,
  FRANK_ZAPPA_DEVICE_METRIC_DISPLACEMENT,
  FRANK_ZAPPA_DEVICE_XENOCHRONY_PITCH_OFFSET,
  FRANK_ZAPPA_DEVICE_STYLE_JUXTAPOSITION,
  FRANK_ZAPPA_DEVICE_THROUGH_COMPOSED_CUT,
  FRANK_ZAPPA_DEVICE_TARGET_RATES,
  resolveFrankZappaSliceSourceChordForBar,
  type FrankZappaAntiElaborationGuards,
  type FrankZappaEligibilityStats,
  type FrankZappaHarmonyAccumulator,
  type FrankZappaHarmonyDeviceId,
} from '../goldenPath/frankZappaSlice';
import { SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC } from './stringQuartetTypes';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

/**
 * Per string part: ordered device pipeline for that instrument’s harmonic contribution (same bar, sequential transforms).
 * Cello: d5 only (bass authority — no polytonal stack on this voice).
 */
export const ZAPPA_SQ_INSTRUMENT_DEVICE_MAP: Record<
  typeof SQ_PART_V1 | typeof SQ_PART_V2 | typeof SQ_PART_VA | typeof SQ_PART_VC,
  readonly FrankZappaHarmonyDeviceId[]
> = {
  [SQ_PART_V1]: ['d3', 'd1'],
  [SQ_PART_V2]: ['d2', 'd1'],
  [SQ_PART_VA]: ['d4', 'd2'],
  [SQ_PART_VC]: ['d5'],
};

const ZAPPA_SQ_PART_ORDER = [SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC] as const;

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = h.indexOf('/');
  const head = slashIdx >= 0 ? h.slice(0, slashIdx) : h;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function isFrankZappaHookBar(bar: number, context: CompositionContext): boolean {
  return isProtectedBar(bar, context) || bar === SONG_MODE_MOTIF_BAR_9 || bar === SONG_MODE_MOTIF_BAR_17;
}

function isSectionStartBar(bar: number, context: CompositionContext): boolean {
  return context.form.sections.some((s) => s.startBar === bar);
}

function deviceSpecLabel(device: FrankZappaHarmonyDeviceId): string {
  switch (device) {
    case 'd1':
      return FRANK_ZAPPA_DEVICE_POLYTONAL_SUPERIMPOSITION;
    case 'd2':
      return FRANK_ZAPPA_DEVICE_METRIC_DISPLACEMENT;
    case 'd3':
      return FRANK_ZAPPA_DEVICE_XENOCHRONY_PITCH_OFFSET;
    case 'd4':
      return FRANK_ZAPPA_DEVICE_STYLE_JUXTAPOSITION;
    case 'd5':
      return FRANK_ZAPPA_DEVICE_THROUGH_COMPOSED_CUT;
  }
}

/** Receipt: `fz:sq:d{N}:{device_label}@bar{N}#v1` */
function fzSqReceipt(device: FrankZappaHarmonyDeviceId, deviceLabel: string, bar: number): string {
  return `fz:sq:${device}:${deviceLabel}@bar${bar}#v1`;
}

function computeDeviceEligible(
  sym: string,
  device: FrankZappaHarmonyDeviceId,
  bar: number,
  context: CompositionContext
): boolean {
  const rootOk = harmonyRootPc(sym) !== undefined;
  switch (device) {
    case 'd1':
      return rootOk;
    case 'd2':
      return rootOk && !sym.includes('/');
    case 'd3':
      return rootOk;
    case 'd4':
      return rootOk;
    case 'd5':
      return rootOk && isSectionStartBar(bar, context) && bar > 1;
  }
}

function attemptSalt(partIdx: number, devIdx: number, device: FrankZappaHarmonyDeviceId): number {
  return 912000 + partIdx * 61 + devIdx * 19 + device.charCodeAt(1) * 7;
}

type GenMetaSq = GenerationMetadata & {
  zappaSQHarmonySlice?: boolean;
  zappaSQEffectiveHarmonyBars?: string[];
  zappaSQDeviceReceipts?: string[];
  zappaSQAntiElaborationGuards?: FrankZappaAntiElaborationGuards;
  zappaSQEligibilityStats?: FrankZappaEligibilityStats;
  zappaSQDiagnostics?: ZappaStringQuartetDiagnostics;
  zappaSQSliceReceipt?: string;
};

export interface ZappaStringQuartetDiagnostics {
  songwriterId: 'frank_zappa';
  ensembleSlice: 'string_quartet';
  barsConsidered: number;
  polytonalSlashHitRate: number;
  alteredColourHitRate: number;
  triadClashHitRate: number;
  deviceFireCounts?: {
    d1: number;
    d2: number;
    d3: number;
    d4: number;
    d5: number;
  };
  antiElaborationGuardTriggers: number;
  antiElaborationGuards?: {
    polytonalNoop: number;
    xenochronyNoop: number;
  };
  deviceReceipts?: string[];
}

/**
 * Precompute one effective harmony bar line: per bar, walk parts in score order and apply each part’s device pipeline
 * with the same Bernoulli targets as the duo slice (per attempt), mutating the working chord sequentially.
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeZappaSQEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenMetaSq;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const guards: FrankZappaAntiElaborationGuards = { polytonalNoop: 0, xenochronyNoop: 0 };

  genMeta.zappaSQHarmonySlice = true;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveFrankZappaSliceSourceChordForBar(b, context));
  }

  let d1E = 0;
  let d2E = 0;
  let d3E = 0;
  let d4E = 0;
  let d5E = 0;

  for (let b = 1; b <= tb; b++) {
    const hook = isFrankZappaHookBar(b, context);
    const sym = raw[b - 1]!;
    const rootOk = harmonyRootPc(sym) !== undefined;
    if (!hook && rootOk) {
      d1E++;
      d2E++;
      d3E++;
      d4E++;
    }
    if (!hook && rootOk && isSectionStartBar(b, context) && b > 1) d5E++;
  }

  const out = [...raw];

  for (let b = 1; b <= tb; b++) {
    if (isFrankZappaHookBar(b, context)) continue;
    let sym = out[b - 1]!;
    let partIdx = 0;
    for (const partId of ZAPPA_SQ_PART_ORDER) {
      const pipeline = ZAPPA_SQ_INSTRUMENT_DEVICE_MAP[partId];
      let devIdx = 0;
      for (const device of pipeline) {
        if (!computeDeviceEligible(sym, device, b, context)) {
          devIdx++;
          continue;
        }
        const rate = FRANK_ZAPPA_DEVICE_TARGET_RATES[device];
        if (seededUnit(seed, b, attemptSalt(partIdx, devIdx, device)) >= rate) {
          devIdx++;
          continue;
        }
        const { next, noopGuard } = applyFrankZappaHarmonyDevice(sym, device, seed, b);
        if (noopGuard === 'polytonalNoop') guards.polytonalNoop++;
        if (noopGuard === 'xenochronyNoop') guards.xenochronyNoop++;
        if (next !== sym) {
          sym = next;
          receipts.push(fzSqReceipt(device, deviceSpecLabel(device), b));
        }
        devIdx++;
      }
      partIdx++;
    }
    out[b - 1] = sym;
  }

  enforceZappaHarmonyLanguageFloors({ out, receipts, context, seed });

  genMeta.zappaSQEffectiveHarmonyBars = out;
  genMeta.zappaSQDeviceReceipts = receipts;
  genMeta.zappaSQAntiElaborationGuards = guards;
  genMeta.zappaSQEligibilityStats = {
    totalBars: tb,
    d1EligibleBars: d1E,
    d2EligibleBars: d2E,
    d3EligibleBars: d3E,
    d4EligibleBars: d4E,
    d5EligibleBars: d5E,
    targetMeanFiresD1: d1E * FRANK_ZAPPA_DEVICE_TARGET_RATES.d1,
    targetMeanFiresD2: d2E * FRANK_ZAPPA_DEVICE_TARGET_RATES.d2,
    targetMeanFiresD3: d3E * FRANK_ZAPPA_DEVICE_TARGET_RATES.d3,
    targetMeanFiresD4: d4E * FRANK_ZAPPA_DEVICE_TARGET_RATES.d4,
    targetMeanFiresD5: d5E * FRANK_ZAPPA_DEVICE_TARGET_RATES.d5,
  };
}

export function finalizeZappaSQMetadata(metadata: GenerationMetadata, acc: FrankZappaHarmonyAccumulator): void {
  const meta = metadata as GenMetaSq;
  const flat = [...(meta.zappaSQDeviceReceipts ?? [])];
  const g = meta.zappaSQAntiElaborationGuards ?? { polytonalNoop: 0, xenochronyNoop: 0 };
  const guardTotal = g.polytonalNoop + g.xenochronyNoop;
  const tb = Math.max(1, acc.barsConsidered);
  const fires = countFrankZappaDeviceFiresFromReceipts(flat);
  const d: ZappaStringQuartetDiagnostics = {
    songwriterId: 'frank_zappa',
    ensembleSlice: 'string_quartet',
    barsConsidered: acc.barsConsidered,
    polytonalSlashHitRate: acc.polytonalSlashTouches / tb,
    alteredColourHitRate: acc.alteredColourTouches / tb,
    triadClashHitRate: acc.triadClashTouches / tb,
    deviceFireCounts: fires,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  };
  const receipt = [
    `Frank Zappa (string quartet slice): slash≈${acc.polytonalSlashTouches}`,
    `altColour≈${acc.alteredColourTouches}`,
    `triadClash≈${acc.triadClashTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  meta.zappaSQDiagnostics = d;
  meta.zappaSQSliceReceipt = receipt;
}

/** True after {@link precomputeZappaSQEffectiveHarmonyBars} (or when dispatch sets the slice flag). */
export function isSongwriterFrankZappaStringQuartet(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'frank_zappa'; zappaSQHarmonySlice: true } {
  const g = genMeta as GenMetaSq | undefined;
  return g?.songwriterStyleId === 'frank_zappa' && g?.zappaSQHarmonySlice === true;
}
