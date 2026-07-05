/**
 * Mosaic Mode — composer dispatch registry (precompute / accumulate / apply / finalize).
 * One entry per slice-authority composer; registry is sole duo dispatch authority.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel } from '../score-model/scoreModelTypes';
import { resolveFrankZappaSoloLineForContext } from '../song-mode/songModeZappaSoloRiffBridge';
import { applyZappaSoloToMetadata } from '../solo/zappasoloEngine';
import { applyBrianWilsonGuitarBarPasses } from '../goldenPath/brianWilsonPetSoundsSlice';
import { applyStevieWonderGuitarBarPasses } from '../goldenPath/stevieWonderSlice';
import { applyJamesBrownGuitarBarPasses } from '../goldenPath/jamesBrownSlice';
import { applySonicYouthGuitarBarPasses } from '../goldenPath/sonicYouthSlice';
import {
  resolveZappaSectionBehaviorForBar,
  finalizeFrankZappaMetadata,
  attachFrankZappaHarmonyContext,
  createFrankZappaHarmonyAccumulator,
} from '../goldenPath/frankZappaSlice';
import { COMPOSER_ID_ALIASES } from '../groups/composerGroupDefinitions';
import { SLICE_ROWS, type MosaicComposerSliceRow } from './mosaicComposerSliceRows';

export type ComposerDispatchEntry = {
  composerId: string;
  precompute: (context: CompositionContext) => void;
  accumulate:
    | ((
        prevSymbol: string | undefined,
        symbol: string,
        accumulator: unknown
      ) => void)
    | null;
  apply:
    | ((measure: unknown, barIndex: number, context: CompositionContext) => void)
    | null;
  finalize: ((context: CompositionContext) => void) | null;
  /** Metadata key written by precompute — used by duo orchestrator stitch. */
  effectiveHarmonyKey: keyof GenerationMetadata;
};

export type DuoApplyScratch = {
  seed: number;
  effectiveLow: number;
  effectiveHigh: number;
};

let activeFinalizeAccumulator: unknown;
let activeApplyScratch: DuoApplyScratch | null = null;

export function setDuoDispatchFinalizeAccumulator(accumulator: unknown): void {
  activeFinalizeAccumulator = accumulator;
}

export function setDuoDispatchApplyScratch(scratch: DuoApplyScratch | null): void {
  activeApplyScratch = scratch;
}

function loadMod(relativePath: string): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`../${relativePath}`) as Record<string, unknown>;
}

function fn<T extends (...args: never[]) => unknown>(
  mod: Record<string, unknown>,
  name: string
): T {
  const f = mod[name];
  if (typeof f !== 'function') {
    throw new Error(`mosaicComposerDispatch: missing ${name} in slice module`);
  }
  return f as T;
}

function applyZappaOutputRegisterForBar(
  m: MeasureModel,
  low: number,
  high: number,
  behavior: ReturnType<typeof resolveZappaSectionBehaviorForBar>
): void {
  if (!behavior || behavior.registerShiftSemitones <= 0) return;
  const shift = Math.min(12, Math.max(0, behavior.registerShiftSemitones));
  const targetHigh = Math.min(96, Math.max(high, 84));
  const targetLow = Math.max(28, Math.min(targetHigh, low + shift));
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    e.pitch = Math.min(targetHigh, e.pitch + shift);
    while (e.pitch < targetLow && e.pitch + 12 <= targetHigh) e.pitch += 12;
    e.pitch = Math.max(targetLow, Math.min(targetHigh, e.pitch));
  }
}

/**
 * Alias keys referencing existing SLICE_ROWS entries (no duplicate slice wiring).
 * holdsworth → allan_holdsworth (also in COMPOSER_ID_ALIASES; listed here explicitly).
 */
const SLICE_ROW_ALIAS_IDS: Readonly<Record<string, string>> = {
  holdsworth: 'allan_holdsworth',
};

/**
 * Stub aliases for composer ids without a dedicated mosaic slice yet.
 * Values must resolve to an existing SLICE_ROWS composerId (directly or via COMPOSER_ID_ALIASES).
 */
const DISPATCH_STUB_ALIASES: Readonly<Record<string, string>> = {
  // rc19 — ornette_coleman remapped from andrew_hill stub to wayne_shorter; full ornette profile planned
  ornette_coleman: 'wayne_shorter',
  ornette: 'wayne_shorter',
  harmolodics: 'wayne_shorter',
  free_jazz: 'wayne_shorter',
  lonely_woman: 'wayne_shorter',
  /** Guitar ids with VRB/stub only — nearest ROCK_FUSION / ART_ROCK / JAZZ_GUITAR dispatch fit. */
  morello: 'fripp',
  eddie_van_halen: 'allan_holdsworth',
  wes_montgomery: 'jim_hall',
  joe_pass: 'jim_hall',
  scott_henderson: 'allan_holdsworth',
  /** Leadsheet-input art-rock contrast voice — harmony via Verlaine field slice; texture via PopArtRock pass. */
  art_rock: 'verlaine',
};

const modCache = new Map<string, Record<string, unknown>>();

function getMod(path: string): Record<string, unknown> {
  let mod = modCache.get(path);
  if (!mod) {
    mod = loadMod(path);
    modCache.set(path, mod);
  }
  return mod;
}

function buildApplyFn(row: MosaicComposerSliceRow): ComposerDispatchEntry['apply'] {
  if (row.composerId === 'frank_zappa') {
    return (measure, barIndex, context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      const behavior = resolveZappaSectionBehaviorForBar(barIndex, context);
      applyZappaOutputRegisterForBar(measure as MeasureModel, scratch.effectiveLow, scratch.effectiveHigh, behavior);
    };
  }
  if (!row.apply) return null;
  const mod = getMod(row.mod);
  const applyName = row.apply;
  if (row.composerId === 'brian_wilson') {
    return (measure, barIndex, _context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      const phaseHook = ((barIndex - 1) % 8) + 1;
      applyBrianWilsonGuitarBarPasses(
        measure as MeasureModel,
        barIndex,
        scratch.seed,
        scratch.effectiveLow,
        scratch.effectiveHigh,
        phaseHook
      );
    };
  }
  if (row.composerId === 'stevie_wonder') {
    return (measure, barIndex, context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      applyStevieWonderGuitarBarPasses(
        measure as MeasureModel,
        barIndex,
        context,
        scratch.seed,
        scratch.effectiveLow,
        scratch.effectiveHigh
      );
    };
  }
  if (row.composerId === 'james_brown') {
    return (measure, barIndex, context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      applyJamesBrownGuitarBarPasses(measure as MeasureModel, barIndex, context);
    };
  }
  if (row.composerId === 'sonic_youth') {
    return (measure, barIndex, context) => {
      const scratch = activeApplyScratch;
      if (!scratch) return;
      applySonicYouthGuitarBarPasses(measure as MeasureModel, barIndex, context);
    };
  }
  const applyFn = fn<
    (m: MeasureModel, bar: number, ctx: CompositionContext, seed: number, low: number, high: number) => void
  >(mod, applyName);
  return (measure, barIndex, context) => {
    const scratch = activeApplyScratch;
    if (!scratch) return;
    applyFn(
      measure as MeasureModel,
      barIndex,
      context,
      scratch.seed,
      scratch.effectiveLow,
      scratch.effectiveHigh
    );
  };
}

function buildFinalizeFn(row: MosaicComposerSliceRow): ComposerDispatchEntry['finalize'] {
  if (row.composerId === 'frank_zappa') {
    return (context) => {
      if (!context.generationMetadata) return;
      finalizeFrankZappaMetadata(context.generationMetadata, activeFinalizeAccumulator as never);
      const solo = resolveFrankZappaSoloLineForContext(context);
      applyZappaSoloToMetadata(context.generationMetadata, solo);
    };
  }
  if (!row.finalize) return null;
  const mod = getMod(row.mod);
  const finalizeFn = fn<(meta: GenerationMetadata, acc: unknown, ctx?: CompositionContext) => void>(
    mod,
    row.finalize
  );
  if (row.composerId === 'wayne_shorter' || row.composerId === 'debussy') {
    return (context) => {
      if (!context.generationMetadata) return;
      finalizeFn(context.generationMetadata, activeFinalizeAccumulator, context);
    };
  }
  return (context) => {
    if (!context.generationMetadata) return;
    finalizeFn(context.generationMetadata, activeFinalizeAccumulator);
  };
}

function buildEntry(row: MosaicComposerSliceRow): ComposerDispatchEntry {
  const mod = getMod(row.mod);
  const precomputeFn =
    row.composerId === 'frank_zappa'
      ? attachFrankZappaHarmonyContext
      : fn<(ctx: CompositionContext) => void>(mod, row.precompute);

  let accumulate: ComposerDispatchEntry['accumulate'] = null;
  if (row.accumulate) {
    const accFn = fn<(prev: string | undefined, sym: string, acc: unknown) => void>(mod, row.accumulate);
    accumulate = accFn;
  }

  return {
    composerId: row.composerId,
    precompute: precomputeFn,
    accumulate,
    apply: buildApplyFn(row),
    finalize: buildFinalizeFn(row),
    effectiveHarmonyKey: row.effKey,
  };
}

// Lazy registry: `buildEntry` calls `getMod` → `require(...)`, which is undefined in the
// browser/renderer bundle. Building the registry at module-eval time crashed the renderer
// (require is not defined). Defer construction until first actual dispatch use (Node/engine
// path only), so importing this module in the renderer is side-effect-free.
let duoComposerRegistryCache: ComposerDispatchEntry[] | undefined;
let registryByIdCache: Map<string, ComposerDispatchEntry> | undefined;

function ensureDuoComposerRegistry(): void {
  if (duoComposerRegistryCache) return;
  duoComposerRegistryCache = SLICE_ROWS.map(buildEntry);
  registryByIdCache = new Map<string, ComposerDispatchEntry>(
    duoComposerRegistryCache.map((entry) => [entry.composerId, entry])
  );
  registerDispatchAliases();
}

function registryById(): Map<string, ComposerDispatchEntry> {
  ensureDuoComposerRegistry();
  return registryByIdCache!;
}

export function getDuoComposerRegistry(): ComposerDispatchEntry[] {
  ensureDuoComposerRegistry();
  return duoComposerRegistryCache!;
}

/** Walk alias/stub chain to a canonical SLICE_ROWS composerId present in registryById. */
function resolveCanonicalDispatchId(composerId: string): string | undefined {
  let id = composerId.trim();
  if (!id) return undefined;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    if (registryById().has(id)) return id;
    const next =
      SLICE_ROW_ALIAS_IDS[id] ?? DISPATCH_STUB_ALIASES[id] ?? COMPOSER_ID_ALIASES[id];
    if (!next || next === id) return undefined;
    id = next;
  }
  return undefined;
}

function registerDispatchAliases(): void {
  const map = registryByIdCache!;
  const aliasKeys = new Set<string>([
    ...Object.keys(SLICE_ROW_ALIAS_IDS),
    ...Object.keys(COMPOSER_ID_ALIASES),
    ...Object.keys(DISPATCH_STUB_ALIASES),
  ]);
  for (const alias of aliasKeys) {
    const canonical = resolveCanonicalDispatchId(alias);
    if (!canonical) continue;
    const entry = map.get(canonical);
    if (entry) map.set(alias, entry);
  }
}

export function getDispatchEntry(composerId: string): ComposerDispatchEntry | undefined {
  const direct = registryById().get(composerId);
  if (direct) return direct;
  const canonical = resolveCanonicalDispatchId(composerId);
  return canonical ? registryById().get(canonical) : undefined;
}

export function createHarmonyAccumulatorForComposer(composerId: string): unknown | null {
  const entry = getDispatchEntry(composerId);
  if (!entry) return null;
  const row = SLICE_ROWS.find((r) => r.composerId === entry.composerId);
  if (!row?.createAcc) return null;
  if (row.composerId === 'frank_zappa') {
    return createFrankZappaHarmonyAccumulator();
  }
  const mod = getMod(row.mod);
  return fn<() => unknown>(mod, row.createAcc)();
}

export function extractEffectiveHarmonyFromMetadata(
  metadata: GenerationMetadata,
  composerId: string
): string[] | undefined {
  const entry = getDispatchEntry(composerId);
  if (!entry) return undefined;
  const bars = metadata[entry.effectiveHarmonyKey];
  return Array.isArray(bars) ? (bars as string[]) : undefined;
}
