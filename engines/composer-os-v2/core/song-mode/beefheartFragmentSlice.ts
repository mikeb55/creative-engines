/**
 * Captain Beefheart — composed blues-fragment polyphony Song Mode harmony slice (`cbf:*` receipts).
 * Blues DNA fractured across independent parts with mismatched periodicity, authored wrong-note recurrence,
 * asymmetric phrase modules, and resolution suppression — not random noise, not free jazz, not Zappa satire.
 *
 * Receipt prefix **`cbf:*`** — Count Basie owns **`cb:*`**; do not collide.
 * LOCK: resolution suppression means effective bars hold tension without cadential confirmation;
 * export truth follows precomputed symbols, not tonal reconciliation passes.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

/** Canonical style id + optional VRB twin — soft captain_beefheart / don_van_vliet / trout_mask never listed. */
export const BEEFHEART_HARMONIC_VOICE_IDS = ['beefheart', 'beefheart_fragment_polyphony'] as const;

export function isBeefheartHarmonicVoiceId(raw: string | null | undefined): boolean {
  const id = normalizeHarmonicVoiceId(String(raw ?? ''));
  return id === 'beefheart' || id === 'beefheart_fragment_polyphony';
}

/**
 * Exact `beefheart` or VRB twin `beefheart_fragment_polyphony` only.
 * Soft aliases (captain_beefheart, don_van_vliet, trout_mask, …) do **not** engage HV.
 */
export function isBeefheartHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  return (
    isBeefheartHarmonicVoiceId(metadata?.songwriterStyleId) ||
    isBeefheartHarmonicVoiceId(metadata?.harmonicVoice)
  );
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type BeefheartPartId = 'guitar_a' | 'guitar_b' | 'bass' | 'drums' | 'vocal';
export type BeefheartWrongIntervalClass = 'm2' | 'tritone' | 'P4' | 'm3' | 'M3';

/** Six Beefheart fragment slice parameters (0–1). */
export interface BeefheartSliceParams {
  bluesTransformationRate: number;
  independentPartPeriodicity: number;
  wrongNoteRecurrence: number;
  asymmetricPhraseModule: number;
  resolutionSuppression: number;
  denseSeparatedTexture: number;
}

export const DEFAULT_BEEFHEART_SLICE_PARAMS: BeefheartSliceParams = {
  bluesTransformationRate: 0.85,
  independentPartPeriodicity: 0.9,
  wrongNoteRecurrence: 0.88,
  asymmetricPhraseModule: 0.85,
  resolutionSuppression: 0.92,
  denseSeparatedTexture: 0.8,
};

export interface BeefheartFragmentSection {
  index: number;
  startBar: number;
  endBar: number;
  bluesCenterPc: number;
  bluesCenterName: string;
  phraseModuleBeats: number;
  fractureTier: 'safe_as_milk' | 'trout_mask';
  primaryFragment: string;
  destabilizerFragment: string;
}

export interface BeefheartPartCycle {
  partId: BeefheartPartId;
  cellLengthBeats: number;
}

export interface BeefheartWrongNoteSlot {
  slotId: number;
  intervalClass: BeefheartWrongIntervalClass;
  pitchClass: number;
  partId: BeefheartPartId;
}

export interface BeefheartFragmentPlan {
  sections: BeefheartFragmentSection[];
  sliceParams: BeefheartSliceParams;
  partCycles: BeefheartPartCycle[];
  wrongNoteSchema: BeefheartWrongNoteSlot[];
  phraseJunctionBars: number[];
  denseLineBars: number[];
}

const BLUES_FRAGMENT_PALETTE: Readonly<Record<string, readonly string[]>> = {
  E: ['E7(no3)', 'E5', 'G#dim/E', 'B7/E', 'E7#9', 'A7/E', 'E7sus4', 'B5/E'],
  A: ['A7(no3)', 'A5', 'C#dim/A', 'E7/A', 'A7#9', 'D7/A', 'A7sus4', 'E5/A'],
  G: ['G7(no3)', 'G5', 'Bbdim/G', 'D7/G', 'G7#9', 'C7/G', 'G7sus4', 'D5/G'],
  D: ['D7(no3)', 'D5', 'F#dim/D', 'A7/D', 'D7#9', 'G7/D', 'D7sus4', 'A5/D'],
};

const ASYMMETRIC_MODULE_BEATS = [3, 5, 7, 9] as const;
const PART_CELL_LENGTHS: Readonly<Record<BeefheartPartId, readonly number[]>> = {
  guitar_a: [3, 5],
  guitar_b: [5, 7],
  bass: [4, 6],
  drums: [7, 9],
  vocal: [5, 9],
};

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(stemOnly(symbol)).harmonyPart;
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

function looksFunctionalDominantTonic(out: string[], bar: number, tonicPc: number): boolean {
  if (bar + 1 > out.length) return false;
  const rV = harmonyRootPc(stemOnly(out[bar - 1]!));
  const rI = harmonyRootPc(stemOnly(out[bar]!));
  if (rV === undefined || rI === undefined) return false;
  return rV === (tonicPc + 7) % 12 && rI === tonicPc;
}

function looksTwelveBarTurnaround(out: string[], bar: number, tonicPc: number): boolean {
  if (bar + 3 > out.length) return false;
  const roots = [bar, bar + 1, bar + 2, bar + 3].map((b) => harmonyRootPc(stemOnly(out[b - 1]!)));
  if (roots.some((r) => r === undefined)) return false;
  const [a, b, c, d] = roots as number[];
  const iv = (tonicPc + 5) % 12;
  const v = (tonicPc + 7) % 12;
  return a === v && (b === iv || b === tonicPc) && (c === tonicPc || c === v) && d === tonicPc;
}

function looksRichTertianRock(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /maj7|maj9|add9|sus4\/|m7\b|m9\b|13\b|11\b/.test(tl) && !/#9|no3|dim/.test(tl);
}

function looksJazzSwingVoicing(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /maj9|maj13|m9|m11|ø|m7b5|alt/.test(tl);
}

function bluesCenterForTonic(tonicPc: number, seed: number, sectionIndex: number): { pc: number; name: string } {
  const u = seededUnit(seed, sectionIndex, 881101);
  const candidates = [
    { pc: 4, name: 'E' },
    { pc: 9, name: 'A' },
    { pc: 7, name: 'G' },
    { pc: 2, name: 'D' },
  ];
  if (u < 0.35) return candidates.find((c) => c.pc === tonicPc) ?? candidates[0]!;
  return candidates[Math.floor(u * candidates.length) % candidates.length]!;
}

function pickPhraseModuleBeats(seed: number, sectionIndex: number): number {
  const u = seededUnit(seed, sectionIndex, 881102);
  const idx = Math.floor(u * ASYMMETRIC_MODULE_BEATS.length);
  return ASYMMETRIC_MODULE_BEATS[idx] ?? 5;
}

function sectionSpanBars(seed: number, sectionIndex: number, phraseModuleBeats: number): number {
  const u = seededUnit(seed, sectionIndex, 881103);
  const moduleBars = Math.max(1, Math.ceil(phraseModuleBeats / 4));
  if (u < 0.28) return moduleBars * 3;
  if (u < 0.55) return moduleBars * 5;
  if (u < 0.78) return moduleBars * 7;
  return moduleBars * 2;
}

function fragmentForCenter(centerName: string, seed: number, sectionIndex: number, destabilize: boolean): string {
  const palette = BLUES_FRAGMENT_PALETTE[centerName] ?? BLUES_FRAGMENT_PALETTE.E!;
  const u = seededUnit(seed, sectionIndex, destabilize ? 881201 : 881200);
  const pick = destabilize ? palette.filter((_, i) => i % 2 === 1) : palette.filter((_, i) => i % 2 === 0);
  const from = pick.length >= 2 ? pick : palette;
  return from[Math.floor(u * from.length) % from.length]!;
}

function buildPartCycles(seed: number): BeefheartPartCycle[] {
  const parts: BeefheartPartId[] = ['guitar_a', 'guitar_b', 'bass', 'drums'];
  return parts.map((partId, idx) => {
    const lengths = PART_CELL_LENGTHS[partId];
    const u = seededUnit(seed, idx, 881301);
    return {
      partId,
      cellLengthBeats: lengths[Math.floor(u * lengths.length) % lengths.length]!,
    };
  });
}

function buildWrongNoteSchema(seed: number, bluesCenterPc: number): BeefheartWrongNoteSlot[] {
  const classes: BeefheartWrongIntervalClass[] = ['m2', 'tritone', 'P4', 'm3', 'M3'];
  const parts: BeefheartPartId[] = ['guitar_a', 'guitar_b', 'bass', 'vocal'];
  const slots: BeefheartWrongNoteSlot[] = [];
  for (let slotId = 0; slotId < 8; slotId++) {
    const u = seededUnit(seed, slotId, 881401);
    const ic = classes[Math.floor(u * classes.length) % classes.length]!;
    let offset = ic === 'm2' ? 1 : ic === 'tritone' ? 6 : ic === 'P4' ? 5 : ic === 'm3' ? 3 : 4;
    if (seededUnit(seed, slotId, 881402) < 0.5) offset = (12 - offset) % 12;
    slots.push({
      slotId,
      intervalClass: ic,
      pitchClass: (bluesCenterPc + offset) % 12,
      partId: parts[Math.floor(u * parts.length) % parts.length]!,
    });
  }
  return slots;
}

export function resolveBeefheartSliceParams(genMeta: GenerationMetadata | undefined): BeefheartSliceParams {
  const fromMeta = genMeta?.beefheartSliceParams;
  if (!fromMeta) return { ...DEFAULT_BEEFHEART_SLICE_PARAMS };
  const d = DEFAULT_BEEFHEART_SLICE_PARAMS;
  return {
    bluesTransformationRate: clamp01(fromMeta.bluesTransformationRate ?? d.bluesTransformationRate),
    independentPartPeriodicity: clamp01(fromMeta.independentPartPeriodicity ?? d.independentPartPeriodicity),
    wrongNoteRecurrence: clamp01(fromMeta.wrongNoteRecurrence ?? d.wrongNoteRecurrence),
    asymmetricPhraseModule: clamp01(fromMeta.asymmetricPhraseModule ?? d.asymmetricPhraseModule),
    resolutionSuppression: clamp01(fromMeta.resolutionSuppression ?? d.resolutionSuppression),
    denseSeparatedTexture: clamp01(fromMeta.denseSeparatedTexture ?? d.denseSeparatedTexture),
  };
}

export function buildBeefheartFragmentPlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: BeefheartSliceParams = DEFAULT_BEEFHEART_SLICE_PARAMS
): BeefheartFragmentPlan {
  const sections: BeefheartFragmentSection[] = [];
  const phraseJunctionBars: number[] = [];
  const denseLineBars: number[] = [];
  const partCycles = buildPartCycles(seed);
  let bar = 1;
  let idx = 0;
  let wrongNoteSchema: BeefheartWrongNoteSlot[] = [];

  while (bar <= totalBars) {
    const remaining = totalBars - bar + 1;
    const center = bluesCenterForTonic(tonicPc, seed, idx);
    const phraseModuleBeats = pickPhraseModuleBeats(seed, idx);
    let span = Math.min(sectionSpanBars(seed, idx, phraseModuleBeats), remaining);
    if (remaining - span > 0 && remaining - span < 2) span = remaining;
    const endBar = bar + span - 1;
    const fractureTier = seededUnit(seed, idx, 881104) < params.bluesTransformationRate * 0.55
      ? 'trout_mask'
      : 'safe_as_milk';

    if (idx === 0) {
      wrongNoteSchema = buildWrongNoteSchema(seed, center.pc);
    }

    sections.push({
      index: idx,
      startBar: bar,
      endBar,
      bluesCenterPc: center.pc,
      bluesCenterName: center.name,
      phraseModuleBeats,
      fractureTier,
      primaryFragment: fragmentForCenter(center.name, seed, idx, false),
      destabilizerFragment: fragmentForCenter(center.name, seed, idx, true),
    });

    phraseJunctionBars.push(endBar);
    for (let b = bar; b <= endBar; b++) {
      if (seededUnit(seed, b, 881501) < params.denseSeparatedTexture * 0.72) {
        denseLineBars.push(b);
      }
    }

    bar = endBar + 1;
    idx++;
  }

  return {
    sections,
    sliceParams: params,
    partCycles,
    wrongNoteSchema,
    phraseJunctionBars,
    denseLineBars,
  };
}

export function sectionForBar(plan: BeefheartFragmentPlan, bar: number): BeefheartFragmentSection | undefined {
  return plan.sections.find((s) => bar >= s.startBar && bar <= s.endBar);
}

function dyadFrictionGrip(centerName: string, wrongPc: number, seed: number, bar: number): string {
  const root = pitchClassToSharpName(wrongPc);
  const u = seededUnit(seed, bar, 881601);
  if (u < 0.5) return `${root}5/${centerName}`;
  return `${centerName}(no3)/${root}`;
}

function applyBeefheartFragmentLayers(
  out: string[],
  plan: BeefheartFragmentPlan,
  seed: number,
  receipts: string[],
  tonicPc: number | undefined,
  context: CompositionContext
): void {
  const p = plan.sliceParams;
  const tb = out.length;
  const wrongNoteFirstSeen = new Map<string, number>();
  let phraseRepeatIndex = 0;

  for (const sec of plan.sections) {
    receipts.push(
      `cbf:section@${sec.startBar}-${sec.endBar}:center=${sec.bluesCenterName};module=${sec.phraseModuleBeats};tier=${sec.fractureTier}`
    );
    receipts.push(`cbf:blues_center@${sec.startBar}:pc=${sec.bluesCenterPc}`);

    if (sec.index > 0 && sec.index % 2 === 0) {
      phraseRepeatIndex++;
    }

    for (let bar = sec.startBar; bar <= sec.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = sec.primaryFragment;

      if (seededUnit(seed, bar, 881701) < p.bluesTransformationRate * 0.55) {
        sym = sec.primaryFragment;
        receipts.push(`cbf:blues_transform@${bar}`);
      } else if (seededUnit(seed, bar, 881702) < 0.55) {
        sym = sec.destabilizerFragment;
        receipts.push(`cbf:blues_friction@${bar}`);
      }

      for (const cycle of plan.partCycles) {
        const beatPos = ((bar - 1) * 4) % cycle.cellLengthBeats;
        if (beatPos === 0) {
          receipts.push(`cbf:part_cycle@${cycle.partId}:len=${cycle.cellLengthBeats}@${bar}`);
        }
      }

      if (plan.phraseJunctionBars.includes(bar)) {
        receipts.push(`cbf:phrase_junction@${bar}`);
      }

      const moduleLen = sec.phraseModuleBeats;
      if (ASYMMETRIC_MODULE_BEATS.includes(moduleLen as (typeof ASYMMETRIC_MODULE_BEATS)[number])) {
        receipts.push(`cbf:asym_module@${bar}:beats=${moduleLen}`);
      }

      for (const slot of plan.wrongNoteSchema) {
        const slotPhase = (bar + slot.slotId) % (sec.phraseModuleBeats >= 5 ? 5 : 3);
        if (slotPhase !== 0) continue;
        const key = `${slot.slotId}:${slot.intervalClass}:${slot.pitchClass}`;
        const receiptBody = `slot=${slot.slotId};class=${slot.intervalClass};pc=${slot.pitchClass};part=${slot.partId}`;
        if (wrongNoteFirstSeen.has(key)) {
          receipts.push(`cbf:wrong_repeat@${bar}:${receiptBody}`);
          if (seededUnit(seed, bar, 881801 + slot.slotId) < p.wrongNoteRecurrence) {
            sym = dyadFrictionGrip(sec.bluesCenterName, slot.pitchClass, seed, bar);
          }
        } else {
          wrongNoteFirstSeen.set(key, bar);
          receipts.push(`cbf:wrong_note@${bar}:${receiptBody}`);
        }
      }

      if (plan.denseLineBars.includes(bar) || seededUnit(seed, bar, 881704) < p.denseSeparatedTexture * 0.65) {
        receipts.push(`cbf:dense_line@${bar}`);
        receipts.push(`cbf:guitar_counter@${bar}`);
        if (seededUnit(seed, bar, 881705) < 0.55) {
          sym = dyadFrictionGrip(sec.bluesCenterName, plan.wrongNoteSchema[bar % plan.wrongNoteSchema.length]!.pitchClass, seed, bar);
          receipts.push(`cbf:dyad_friction@${bar}`);
        }
      }

      if (seededUnit(seed, bar, 881706) < 0.42) {
        receipts.push(`cbf:vocal_offbar@${bar}`);
        receipts.push(`cbf:utterance_map@${bar}`);
      }

      if (looksRichTertianRock(sym) || looksJazzSwingVoicing(sym)) {
        sym = sec.primaryFragment;
        receipts.push(`cbf:strip_rock_jazz@${bar}`);
      }

      if (seededUnit(seed, bar, 881707) < Math.max(0.72, p.resolutionSuppression * 0.62)) {
        receipts.push(`cbf:resist_resolution@${bar}`);
      }

      out[i] = sym;
    }
  }

  if (tonicPc !== undefined) {
    for (let b = 1; b <= tb - 1; b++) {
      if (looksFunctionalDominantTonic(out, b, tonicPc)) {
        if (isProtectedBar(b, context) || isProtectedBar(b + 1, context)) continue;
        const sec = sectionForBar(plan, b);
        if (!sec) continue;
        out[b - 1] = sec.destabilizerFragment;
        out[b] = sec.primaryFragment;
        receipts.push(`cbf:suppress_cadence@${b}`);
      }
    }
    for (let b = 1; b <= tb - 3; b++) {
      if (!looksTwelveBarTurnaround(out, b, tonicPc)) continue;
      if (isProtectedBar(b, context)) continue;
      const sec = sectionForBar(plan, b);
      if (!sec) continue;
      for (let k = 0; k < 4; k++) {
        out[b + k - 1] = k % 2 === 0 ? sec.primaryFragment : sec.destabilizerFragment;
      }
      receipts.push(`cbf:neg_12bar@${b}`);
    }
  }

  const repeatCount = receipts.filter((r) => r.startsWith('cbf:wrong_repeat@')).length;
  const noteCount = receipts.filter((r) => r.startsWith('cbf:wrong_note@')).length;
  if (noteCount > 0 && repeatCount === 0 && p.wrongNoteRecurrence >= 0.7) {
    receipts.push('cbf:neg_noise@schema_fail');
  }
}

export interface BeefheartHarmonyAccumulator {
  barsConsidered: number;
  bluesTransformTouches: number;
  partCycleTouches: number;
  wrongRepeatTouches: number;
  asymModuleTouches: number;
  resolutionSuppressTouches: number;
  denseLineTouches: number;
}

export function createBeefheartHarmonyAccumulator(): BeefheartHarmonyAccumulator {
  return {
    barsConsidered: 0,
    bluesTransformTouches: 0,
    partCycleTouches: 0,
    wrongRepeatTouches: 0,
    asymModuleTouches: 0,
    resolutionSuppressTouches: 0,
    denseLineTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BeefheartHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
}

export function accumulateBeefheartHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BeefheartHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function rateFromReceipts(receipts: readonly string[], prefix: string, bars: number): number {
  if (bars <= 0) return 0;
  const touches = receipts.filter((r) => r.startsWith(prefix)).length;
  return Math.min(1, touches / bars);
}

export function countWrongNoteRecurrencePairs(receipts: readonly string[]): number {
  const firstSlots = new Set<string>();
  let pairs = 0;
  for (const r of receipts) {
    if (r.startsWith('cbf:wrong_note@')) {
      const body = r.slice(r.indexOf(':') + 1);
      const slotMatch = body.match(/slot=(\d+)/);
      if (slotMatch) firstSlots.add(slotMatch[1]!);
    }
    if (r.startsWith('cbf:wrong_repeat@')) {
      const body = r.slice(r.indexOf(':') + 1);
      const slotMatch = body.match(/slot=(\d+)/);
      if (slotMatch && firstSlots.has(slotMatch[1]!)) pairs++;
    }
  }
  return pairs;
}

export function hasAsymmetricModuleReceipts(receipts: readonly string[]): boolean {
  return receipts.some((r) => {
    if (!r.startsWith('cbf:asym_module@')) return false;
    return /beats=(3|5|7|9)/.test(r);
  });
}

export function minBeefheartSectionSpan(plan: BeefheartFragmentPlan | undefined): number {
  if (!plan?.sections.length) return 0;
  return Math.min(...plan.sections.map((s) => s.endBar - s.startBar + 1));
}

export function precomputeBeefheartEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 4;
  const params = resolveBeefheartSliceParams(genMeta);
  genMeta.beefheartSliceParams = params;

  const plan = buildBeefheartFragmentPlan(seed, tb, tonicPc, params);
  genMeta.beefheartFragmentPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `cbf:params=btr:${params.bluesTransformationRate.toFixed(2)};ipp:${params.independentPartPeriodicity.toFixed(2)};wnr:${params.wrongNoteRecurrence.toFixed(2)};apm:${params.asymmetricPhraseModule.toFixed(2)};rs:${params.resolutionSuppression.toFixed(2)};dst:${params.denseSeparatedTexture.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyBeefheartFragmentLayers(out, plan, seed, receipts, tonicPc, context);

  genMeta.beefheartEffectiveHarmonyBars = out;
  genMeta.beefheartDeviceReceipts = receipts;
}

export function finalizeBeefheartMetadata(
  metadata: GenerationMetadata,
  acc: BeefheartHarmonyAccumulator,
  deviceReceipts?: string[]
): void {
  const flat = deviceReceipts ?? [...(metadata.beefheartDeviceReceipts ?? [])];
  const plan = metadata.beefheartFragmentPlan;
  const params = metadata.beefheartSliceParams ?? DEFAULT_BEEFHEART_SLICE_PARAMS;
  const bars = metadata.beefheartEffectiveHarmonyBars?.length ?? (acc.barsConsidered || 32);

  acc.bluesTransformTouches = flat.filter((r) => r.startsWith('cbf:blues_transform@')).length;
  acc.partCycleTouches = flat.filter((r) => r.startsWith('cbf:part_cycle@')).length;
  acc.wrongRepeatTouches = flat.filter((r) => r.startsWith('cbf:wrong_repeat@')).length;
  acc.asymModuleTouches = flat.filter((r) => r.startsWith('cbf:asym_module@')).length;
  acc.resolutionSuppressTouches = flat.filter(
    (r) => r.startsWith('cbf:resist_resolution@') || r.startsWith('cbf:suppress_cadence@')
  ).length;
  acc.denseLineTouches = flat.filter((r) => r.startsWith('cbf:dense_line@')).length;

  const bluesTransformation = Math.min(
    1,
    params.bluesTransformationRate * 0.9 +
      rateFromReceipts(flat, 'cbf:blues_transform@', bars) * 0.45 +
      rateFromReceipts(flat, 'cbf:blues_friction@', bars) * 0.2
  );
  const independentPartPeriodicity = Math.min(
    1,
    params.independentPartPeriodicity * 0.85 +
      rateFromReceipts(flat, 'cbf:part_cycle@', bars) * 0.35
  );
  const wrongNoteRecurrence = Math.min(
    1,
    params.wrongNoteRecurrence * 0.82 +
      acc.wrongRepeatTouches / Math.max(1, flat.filter((r) => r.startsWith('cbf:wrong_note@')).length) * 0.25
  );
  const asymmetricPhraseModule = hasAsymmetricModuleReceipts(flat)
    ? Math.min(
        1,
        params.asymmetricPhraseModule * 0.85 + rateFromReceipts(flat, 'cbf:asym_module@', bars) * 0.25
      )
    : 0;
  const resolutionSuppression = Math.min(
    1,
    params.resolutionSuppression * 0.88 +
      rateFromReceipts(flat, 'cbf:resist_resolution@', bars) * 0.35 +
      rateFromReceipts(flat, 'cbf:suppress_cadence@', bars) * 0.5
  );
  const denseSeparatedTexture = Math.min(
    1,
    params.denseSeparatedTexture * 0.85 +
      rateFromReceipts(flat, 'cbf:dense_line@', bars) * 0.3 +
      rateFromReceipts(flat, 'cbf:guitar_counter@', bars) * 0.2
  );

  metadata.beefheartDiagnostics = {
    songwriterId: 'beefheart',
    barsConsidered: acc.barsConsidered,
    bluesTransformTouches: acc.bluesTransformTouches,
    partCycleTouches: acc.partCycleTouches,
    wrongRepeatTouches: acc.wrongRepeatTouches,
    asymModuleTouches: acc.asymModuleTouches,
    resolutionSuppressTouches: acc.resolutionSuppressTouches,
    denseLineTouches: acc.denseLineTouches,
    minSectionSpan: minBeefheartSectionSpan(plan),
    sliceParams: { ...params },
    bluesTransformation,
    independentPartPeriodicity,
    wrongNoteRecurrence,
    asymmetricPhraseModule,
    resolutionSuppression,
    denseSeparatedTexture,
    wrongNoteRecurrencePairs: countWrongNoteRecurrencePairs(flat),
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.beefheartSliceReceipt = [
    'Captain Beefheart (blues-fragment polyphony slice)',
    `sections=${plan?.sections.length ?? 0}`,
    `btr=${params.bluesTransformationRate.toFixed(2)}`,
    `wnr=${params.wrongNoteRecurrence.toFixed(2)}`,
    `wrongRepeat≈${acc.wrongRepeatTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
