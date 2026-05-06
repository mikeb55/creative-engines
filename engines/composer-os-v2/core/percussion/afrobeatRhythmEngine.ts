/**
 * Afrobeat / Tony Allen–style drum grids — loads tidal-derived patterns and applies
 * simple polyrhythm pulses (even spacing across one 16-step bar) plus grid quantisation.
 */

import * as fs from 'fs';
import * as path from 'path';

export type TonyAllenFeel = 'straight' | 'swing' | 'afrobeat';

export type DrumVoiceId = 'kick' | 'snare' | 'hiHat' | 'bell' | 'conga';

/** One bar of drum triggers; row length is 16 (sixteenths) unless produced by `quantise(..., 24)`. */
export interface DrumPattern {
  kick: number[];
  snare: number[];
  hiHat: number[];
  bell: number[];
  conga: number[];
}

export interface TonyAllenPatternsBundle {
  readonly schemaVersion: number;
  readonly feels: Record<TonyAllenFeel, DrumPattern>;
}

export interface PolyrhythmLayer {
  /** Voice to merge pulses into. */
  voice: DrumVoiceId;
  /** Number of evenly spaced hits across one bar (16-step cycle). */
  pulses: number;
  /** Rotation in 16th-note steps before spacing (fractions rounded). */
  phaseSteps?: number;
}

const VOICES: readonly DrumVoiceId[] = ['kick', 'snare', 'hiHat', 'bell', 'conga'];

function clonePattern(p: DrumPattern): DrumPattern {
  return {
    kick: [...p.kick],
    snare: [...p.snare],
    hiHat: [...p.hiHat],
    bell: [...p.bell],
    conga: [...p.conga],
  };
}

/** Integer index into `cycleLen` steps (bar wrap — JS `%` keeps negatives). */
export function modCycle(index: number, cycleLen: number): number {
  if (cycleLen <= 0 || !Number.isFinite(cycleLen)) {
    throw new Error('[afrobeatRhythmEngine] cycleLen must be a positive finite number');
  }
  return ((Math.round(index) % cycleLen) + cycleLen) % cycleLen;
}

/** One bar of silence (valid 16-step rows). */
export function createEmptyDrumPattern(steps = 16): DrumPattern {
  const z = (): number[] => new Array(steps).fill(0);
  return { kick: z(), snare: z(), hiHat: z(), bell: z(), conga: z() };
}

function assertRow(name: string, row: number[], steps: number): void {
  if (row.length !== steps) {
    throw new Error(`[afrobeatRhythmEngine] ${name}: expected ${steps} steps, got ${row.length}`);
  }
  for (let i = 0; i < row.length; i++) {
    const v = row[i];
    if (v !== 0 && v !== 1) {
      throw new Error(`[afrobeatRhythmEngine] ${name}[${i}] must be 0 or 1`);
    }
  }
}

export function validateDrumPattern(p: DrumPattern, steps = 16): void {
  for (const v of VOICES) {
    assertRow(v, p[v], steps);
  }
}

/** Parse committed JSON (tests may inject bundles without filesystem). */
export function parseTonyAllenPatternsBundle(raw: unknown): TonyAllenPatternsBundle {
  if (!raw || typeof raw !== 'object') throw new Error('tonyAllenPatterns: invalid root');
  const o = raw as Record<string, unknown>;
  const sv = o.schemaVersion;
  if (typeof sv !== 'number') throw new Error('tonyAllenPatterns: schemaVersion missing');
  const feelsRaw = o.feels;
  if (!feelsRaw || typeof feelsRaw !== 'object') throw new Error('tonyAllenPatterns: feels missing');

  const empty = createEmptyDrumPattern(16);
  const feels: Record<TonyAllenFeel, DrumPattern> = {
    straight: extractFeelOrEmpty(feelsRaw, 'straight', empty),
    swing: extractFeelOrEmpty(feelsRaw, 'swing', empty),
    afrobeat: extractFeelOrEmpty(feelsRaw, 'afrobeat', empty),
  };
  return { schemaVersion: sv, feels };
}

function extractFeelOrEmpty(
  feelsRaw: object,
  feel: TonyAllenFeel,
  fallback: DrumPattern
): DrumPattern {
  const fr = feelsRaw as Record<string, unknown>;
  const kit = fr[feel];
  if (!kit || typeof kit !== 'object') return clonePattern(fallback);
  return extractFeel(feelsRaw, feel);
}

function extractFeel(feelsRaw: object, feel: TonyAllenFeel): DrumPattern {
  const fr = feelsRaw as Record<string, unknown>;
  const kit = fr[feel];
  if (!kit || typeof kit !== 'object') throw new Error(`tonyAllenPatterns: feels.${feel} missing`);
  const k = kit as Record<string, unknown>;
  const pat: DrumPattern = {
    kick: rowFrom(k.kick, `${feel}.kick`),
    snare: rowFrom(k.snare, `${feel}.snare`),
    hiHat: rowFrom(k.hiHat, `${feel}.hiHat`),
    bell: rowFrom(k.bell, `${feel}.bell`),
    conga: rowFrom(k.conga, `${feel}.conga`),
  };
  validateDrumPattern(pat, 16);
  return pat;
}

function rowFrom(v: unknown, label: string): number[] {
  if (!Array.isArray(v)) throw new Error(`tonyAllenPatterns: ${label} not an array`);
  return v.map((x, i) => {
    if (x !== 0 && x !== 1) throw new Error(`tonyAllenPatterns: ${label}[${i}] invalid`);
    return x as 0 | 1;
  });
}

export function loadDefaultTonyAllenPatternsBundle(): TonyAllenPatternsBundle {
  const jsonPath = path.join(__dirname, 'data', 'tonyAllenPatterns.json');
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as unknown;
  return parseTonyAllenPatternsBundle(raw);
}

export interface AfrobeatRhythmEngine {
  readonly patterns: TonyAllenPatternsBundle;
  selectPattern(feel: TonyAllenFeel): DrumPattern;
  applyPolyrhythm(basePattern: DrumPattern, layers: PolyrhythmLayer[]): DrumPattern;
  quantise(pattern: DrumPattern, grid: 16 | 24): DrumPattern;
}

/** Even pulse indices on a repeating `cycleLen` grid (default one bar = 16). Phase wraps at bar boundary. */
export function pulseIndices(pulses: number, phaseSteps: number, cycleLen: number): number[] {
  if (pulses <= 0 || !Number.isFinite(pulses)) {
    throw new Error('[afrobeatRhythmEngine] pulses must be a positive finite number');
  }
  const phase = Number.isFinite(phaseSteps) ? phaseSteps : 0;
  const phaseNorm = modCycle(phase, cycleLen);
  const out: number[] = [];
  for (let i = 0; i < pulses; i++) {
    const pos = Math.round(phaseNorm + (i * cycleLen) / pulses);
    out.push(modCycle(pos, cycleLen));
  }
  return out;
}

export function applyPolyrhythm(basePattern: DrumPattern, layers: PolyrhythmLayer[]): DrumPattern {
  validateDrumPattern(basePattern, 16);
  const next = clonePattern(basePattern);
  for (const layer of layers) {
    const phase = layer.phaseSteps ?? 0;
    const idx = pulseIndices(layer.pulses, phase, 16);
    const row = next[layer.voice];
    for (const p of idx) {
      row[p] = 1;
    }
  }
  return next;
}

/** Map a 16-step row onto a 24-step triplet-sixteenth grid (same bar duration). Bar-edge safe: k∈[0,23] → src∈[0,15]. */
export function expandSixteenthsToTripletGrid(row16: number[]): number[] {
  if (row16.length !== 16) throw new Error('expandSixteenthsToTripletGrid: need length 16');
  const out: number[] = new Array(24).fill(0);
  for (let k = 0; k < 24; k++) {
    const src = Math.min(15, Math.max(0, Math.floor((k * 16) / 24)));
    if (row16[src]) out[k] = 1;
  }
  return out;
}

/** Fold a 24-step triplet-sixteenth grid to 16 steps (OR-merge slots that map to each 16th). Bar-edge safe dest ∈ [0,15]. */
export function foldTripletGridToSixteenths(row24: number[]): number[] {
  if (row24.length !== 24) throw new Error('foldTripletGridToSixteenths: need length 24');
  const out = new Array(16).fill(0);
  for (let k = 0; k < 24; k++) {
    if (!row24[k]) continue;
    const dest = Math.min(15, Math.max(0, Math.floor((k * 16) / 24)));
    out[dest] = 1;
  }
  return out;
}

export function quantise(pattern: DrumPattern, grid: 16 | 24): DrumPattern {
  validateDrumPattern(pattern, 16);
  if (grid === 16) {
    return clonePattern(pattern);
  }
  const q = {
    kick: expandSixteenthsToTripletGrid(pattern.kick),
    snare: expandSixteenthsToTripletGrid(pattern.snare),
    hiHat: expandSixteenthsToTripletGrid(pattern.hiHat),
    bell: expandSixteenthsToTripletGrid(pattern.bell),
    conga: expandSixteenthsToTripletGrid(pattern.conga),
  };
  validateDrumPattern(q, 24);
  return q;
}

export function createAfrobeatRhythmEngine(
  bundle: TonyAllenPatternsBundle = loadDefaultTonyAllenPatternsBundle()
): AfrobeatRhythmEngine {
  return {
    patterns: bundle,
    selectPattern(feel: TonyAllenFeel): DrumPattern {
      const p = bundle.feels[feel];
      if (!p) throw new Error(`[afrobeatRhythmEngine] unknown feel: ${feel}`);
      return clonePattern(p);
    },
    applyPolyrhythm,
    quantise,
  };
}
