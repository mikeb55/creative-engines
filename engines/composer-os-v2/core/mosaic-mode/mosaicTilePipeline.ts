/**
 * Mosaic Mode — post-finalize tile inject, underfill pad, overfill trim (5/4+ bars).
 */

import { BB_PART_SAXES } from '../big-band/buildBigBandOrchestrationPlan';
import type { CompositionContext } from '../compositionContext';
import type { CoreMotif } from '../motif/motifEngineTypes';
import {
  buildMosaicMotifVariants,
  generateMosaicSourceMotif,
} from './mosaicMotifEngine';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import { getEffectiveRegisterWindowForBar } from '../section-architecture/effectiveContextForBar';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { DEFAULT_BAR_METER } from '../rhythm/oddMeterQuantiser';
import type { BarMeterSignature } from '../rhythm/barMeterTypes';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import { addEvent, createNote, createRest } from '../score-model/scoreEventBuilder';
import type {
  MeasureModel,
  NoteEvent,
  PartModel,
  ScoreEvent,
  ScoreModel,
} from '../score-model/scoreModelTypes';
import { isMosaicModeActive } from './mosaicBarHelpers';
import {
  mosaicMotifNotesForBar,
  mosaicVrbTilesMotifAcrossSection,
} from './mosaicMotifEngine';
import { buildMosaicTonicMap, type MosaicModeSectionPlanEntry } from './precomputeMosaicEffectiveHarmonyBars';
import { buildPhraseRoleHints, resolvePhraseRole } from './mosaicPhrasePlanner';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

type MosaicSectionPlanEntry = MosaicModeSectionPlanEntry;

const MOSAIC_PHRASE_ROLE_DYNAMIC_STEP = 12;
const ROOT_AT_START = /^([A-G](?:#|b)?)/i;

type BarInjectSnapshot = {
  events: ScoreEvent[];
  chord?: string;
};

/** Big-band lead melody carrier — `melodyPitchAlto` / head-lead authority in score builder. */
export const BB_MOSAIC_INJECT_LEAD_PART_ID = 'bb_alto_sax' as const;

/** Never receive post-finalize motif inject (comp, rhythm, pads, brass sections). */
export const BB_MOSAIC_INJECT_EXCLUDED_PART_IDS = [
  'bb_drums',
  'bb_rhythm_section',
  'bb_piano',
  'bb_tenor_sax',
  'bb_trumpets',
  'bb_trombones',
] as const;

type MosaicInjectPartTarget = {
  resolvePart: (score: ScoreModel) => PartModel | undefined;
  getRegisterForBar: (bar: number, context: CompositionContext) => [number, number];
};

export function isMosaicInjectEligibleSection(section: MosaicSectionPlanEntry): boolean {
  if (section.spineProtected === true) return false;
  return section.mosaicOwned === true && section.injectEligible === true;
}

function harmonyRootPc(symbol: string | undefined): number | undefined {
  if (!symbol?.trim()) return undefined;
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function harmonyQualitySuffix(symbol: string | undefined): string {
  if (!symbol?.trim()) return '';
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  return m ? h.slice(m[0].length) : h;
}

/** Detect root/quality/cadence-point harmony drift after post-finalize inject. */
export function mosaicInjectHarmonyBarViolated(
  before: string | undefined,
  after: string | undefined,
  bar: number,
  sectionEndBar: number
): boolean {
  const b = before?.trim() ?? '';
  const a = after?.trim() ?? '';
  if (b === a) return false;

  const rootBefore = harmonyRootPc(b);
  const rootAfter = harmonyRootPc(a);
  if (rootBefore !== undefined && rootAfter !== undefined && rootBefore !== rootAfter) {
    return true;
  }

  if (harmonyQualitySuffix(b) !== harmonyQualitySuffix(a)) {
    return true;
  }

  const cadencePoint = bar === sectionEndBar || bar % 4 === 0;
  if (cadencePoint && b !== a) {
    return true;
  }

  return false;
}

function guitarPartFromScore(score: ScoreModel) {
  return score.parts.find(
    (p) => p.instrumentIdentity === 'clean_electric_guitar' || p.id === 'guitar'
  );
}

function guitarInjectTarget(guitarMap: InstrumentRegisterMap): MosaicInjectPartTarget {
  return {
    resolvePart: guitarPartFromScore,
    getRegisterForBar: (bar, context) => {
      const [zLow, zHigh] = getRegisterForBar(guitarMap, bar, context);
      const registerWindow = getEffectiveRegisterWindowForBar(bar, context, 'guitar');
      const effectiveLow = Math.max(zLow, registerWindow?.floor ?? 52);
      const effectiveHigh = Math.min(zHigh, registerWindow?.ceil ?? 84, 79);
      return [effectiveLow, effectiveHigh];
    },
  };
}

function bigBandLeadInjectTarget(): MosaicInjectPartTarget {
  return {
    resolvePart: (score) =>
      score.parts.find((p) => p.id === BB_MOSAIC_INJECT_LEAD_PART_ID),
    getRegisterForBar: (bar, context) => {
      const bounds = BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!;
      const registerWindow = getEffectiveRegisterWindowForBar(bar, context, 'bb_alto_sax');
      const effectiveLow = Math.max(bounds[0], registerWindow?.floor ?? bounds[0]);
      const effectiveHigh = Math.min(bounds[1], registerWindow?.ceil ?? bounds[1]);
      return [effectiveLow, effectiveHigh];
    },
  };
}

function snapshotEligibleBarsForTarget(
  score: ScoreModel,
  sections: readonly MosaicSectionPlanEntry[],
  target: MosaicInjectPartTarget
): Map<number, BarInjectSnapshot> {
  const part = target.resolvePart(score);
  const out = new Map<number, BarInjectSnapshot>();
  if (!part) return out;
  for (const section of sections) {
    for (let bar = section.startBar; bar <= section.endBar; bar++) {
      const m = part.measures.find((x) => x.index === bar);
      if (!m) continue;
      out.set(bar, {
        events: structuredClone(m.events),
        chord: m.chord,
      });
    }
  }
  return out;
}

function snapshotEligibleBars(
  score: ScoreModel,
  sections: readonly MosaicSectionPlanEntry[]
): Map<number, BarInjectSnapshot> {
  return snapshotEligibleBarsForTarget(score, sections, {
    resolvePart: guitarPartFromScore,
    getRegisterForBar: () => [55, 79],
  });
}

function revertInjectedBarFromSnapshotForTarget(
  score: ScoreModel,
  snapshot: Map<number, BarInjectSnapshot>,
  bar: number,
  target: MosaicInjectPartTarget
): void {
  const part = target.resolvePart(score);
  const snap = snapshot.get(bar);
  if (!part || !snap) return;
  const m = part.measures.find((x) => x.index === bar);
  if (!m) return;
  m.events = structuredClone(snap.events);
  m.chord = snap.chord;
}

function revertInjectedBarFromSnapshot(
  score: ScoreModel,
  snapshot: Map<number, BarInjectSnapshot>,
  bar: number
): void {
  revertInjectedBarFromSnapshotForTarget(score, snapshot, bar, {
    resolvePart: guitarPartFromScore,
    getRegisterForBar: () => [55, 79],
  });
}

export function applyMosaicInjectHarmonyFallback(
  score: ScoreModel,
  snapshot: Map<number, BarInjectSnapshot>,
  sections: readonly MosaicSectionPlanEntry[]
): void {
  const guitar = guitarPartFromScore(score);
  if (!guitar) return;
  for (const section of sections) {
    for (let bar = section.startBar; bar <= section.endBar; bar++) {
      const m = guitar.measures.find((x) => x.index === bar);
      if (!m) continue;
      const before = snapshot.get(bar)?.chord;
      if (mosaicInjectHarmonyBarViolated(before, m.chord, bar, section.endBar)) {
        revertInjectedBarFromSnapshot(score, snapshot, bar);
        console.log(
          `[mosaicInject] harmony revert section=${section.sectionLabel} bar=${bar}`
        );
      }
    }
  }
}

/** Part-agnostic harmony revert after post-finalize inject (BB lead uses this in tests + pipeline). */
export function applyMosaicInjectHarmonyFallbackForTarget(
  score: ScoreModel,
  snapshot: Map<number, BarInjectSnapshot>,
  sections: readonly MosaicSectionPlanEntry[],
  target: MosaicInjectPartTarget
): void {
  const part = target.resolvePart(score);
  if (!part) return;
  for (const section of sections) {
    for (let bar = section.startBar; bar <= section.endBar; bar++) {
      const m = part.measures.find((x) => x.index === bar);
      if (!m) continue;
      const before = snapshot.get(bar)?.chord;
      if (mosaicInjectHarmonyBarViolated(before, m.chord, bar, section.endBar)) {
        revertInjectedBarFromSnapshotForTarget(score, snapshot, bar, target);
        console.log(
          `[mosaicInject] harmony revert section=${section.sectionLabel} bar=${bar}`
        );
      }
    }
  }
}

function sectionLabelForBar(bar: number, context: CompositionContext): string {
  const s = context.form.sections.find((sec) => bar >= sec.startBar && bar < sec.startBar + sec.length);
  return s?.label ?? 'A';
}

function getRegisterForBar(
  guitarMap: InstrumentRegisterMap,
  bar: number,
  context: CompositionContext
): [number, number] {
  const label = sectionLabelForBar(bar, context);
  const plan = guitarMap.sections.find((s) => s.sectionLabel === label);
  return plan?.preferredZone ?? [55, 79];
}

export function mosaicSectionMeterForEntry(
  section: MosaicSectionPlanEntry | undefined
): BarMeterSignature {
  return section?.timeSignature ?? DEFAULT_BAR_METER;
}

export function mosaicBarBeatSpanQuarters(meter: BarMeterSignature): number {
  return (meter.numerator * 4) / meter.denominator;
}

/** Mosaic 5/4+ bars: pad underfilled voices with gap + trailing rests (generation fill only). */
export function padMosaicUnderfillBars(score: ScoreModel, context: CompositionContext): ScoreModel {
  if (!isMosaicModeActive(context)) return score;
  const out = structuredClone(score) as ScoreModel;
  for (const part of out.parts) {
    for (const m of part.measures) {
      const cap = measureBeatSpanQuartersOf(m);
      if (cap === 4) continue;
      const voices = new Map<number, ScoreEvent[]>();
      for (const e of m.events) {
        const v = e.voice ?? 1;
        if (!voices.has(v)) voices.set(v, []);
        voices.get(v)!.push(e);
      }
      const newEvents: ScoreEvent[] = [];
      for (const [voice, events] of voices.entries()) {
        const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
        let cursor = 0;
        for (const e of sorted) {
          const sb = e.startBeat;
          if (sb - cursor > 0.01) {
            const gap = createRest(cursor, sb - cursor, voice);
            newEvents.push(gap);
          }
          newEvents.push(e);
          cursor = Math.max(cursor, sb + e.duration);
        }
        if (cap - cursor > 0.01) {
          const trail = createRest(cursor, cap - cursor, voice);
          newEvents.push(trail);
        }
      }
      if (newEvents.length === 0) continue;
      m.events = newEvents;
    }
  }
  return out;
}

/** Mosaic 5/4+ bars: trim overfilled voices from the end (generation fill only). */
export function trimMosaicOverfillBars(score: ScoreModel, context: CompositionContext): ScoreModel {
  if (!isMosaicModeActive(context)) return score;
  const out = structuredClone(score) as ScoreModel;
  for (const part of out.parts) {
    for (const m of part.measures) {
      const cap = measureBeatSpanQuartersOf(m);
      if (cap === 4) continue;
      const voices = new Map<number, ScoreEvent[]>();
      for (const e of m.events) {
        const v = e.voice ?? 1;
        if (!voices.has(v)) voices.set(v, []);
        voices.get(v)!.push(e);
      }
      for (const [voice, events] of voices.entries()) {
        let total = 0;
        for (const e of events) {
          total += e.duration;
        }
        if (total - cap < 0.01) continue;
        let trimmed = total;
        for (let i = events.length - 1; i >= 0 && trimmed > cap; i--) {
          const e = events[i]!;
          const dur = e.duration;
          const excess = trimmed - cap;
          if (excess >= dur) {
            const idx = m.events.indexOf(e);
            if (idx !== -1) m.events.splice(idx, 1);
            trimmed -= dur;
          } else {
            e.duration = dur - excess;
            trimmed = cap;
          }
        }
        appendMosaicFullBarRestIfVoiceEmpty(m, voice, cap);
      }
    }
  }
  return out;
}

/** Guard: voice with no events after overfill trim receives one full-bar rest. */
export function appendMosaicFullBarRestIfVoiceEmpty(
  m: MeasureModel,
  voice: number,
  cap: number
): void {
  const remaining = m.events.filter((ev) => (ev.voice ?? 1) === voice);
  if (remaining.length === 0) {
    m.events.push(createRest(0, cap, voice));
  }
}

/** Clone sealed score and re-inject section-start motif notes (durations not grid-trimmed). */
export function injectMosaicMotifNotesPostFinalize(
  score: ScoreModel,
  context: CompositionContext,
  guitarMap: InstrumentRegisterMap
): ScoreModel {
  if (!isMosaicModeActive(context)) return score;

  if (context.generationMetadata?.songModeHookFirstIdentity) {
    const allowInject =
      context.generationMetadata?.allowMosaicPostFinalizeInject === true;
    if (!allowInject) return score;
    return injectEligibleSectionsOnly(score, context, guitarMap);
  }

  return injectMosaicMotifNotesPostFinalizeCore(
    score,
    context,
    undefined,
    guitarInjectTarget(guitarMap),
    guitarMap
  );
}

/** Section-scoped lift: inject only into mosaicOwned + injectEligible non-spine sections. */
export function injectEligibleSectionsOnly(
  score: ScoreModel,
  context: CompositionContext,
  guitarMap: InstrumentRegisterMap
): ScoreModel {
  return injectEligibleSectionsForTarget(
    score,
    context,
    guitarInjectTarget(guitarMap)
  );
}

function injectEligibleSectionsForTarget(
  score: ScoreModel,
  context: CompositionContext,
  target: MosaicInjectPartTarget
): ScoreModel {
  const meta = context.generationMetadata;
  const plan = meta?.mosaicSectionPlan ?? [];
  const eligible = plan.filter(isMosaicInjectEligibleSection);
  if (!eligible.length) return score;

  const snapshot = snapshotEligibleBarsForTarget(score, eligible, target);
  const injected = injectMosaicMotifNotesPostFinalizeCore(
    structuredClone(score) as ScoreModel,
    context,
    eligible,
    target
  );
  applyMosaicInjectHarmonyFallbackForTarget(injected, snapshot, eligible, target);
  return injected;
}

function injectMosaicMotifNotesPostFinalizeCore(
  score: ScoreModel,
  context: CompositionContext,
  sectionFilter: readonly MosaicSectionPlanEntry[] | undefined,
  target: MosaicInjectPartTarget,
  guitarMap?: InstrumentRegisterMap
): ScoreModel {
  const meta = context.generationMetadata;
  const variants = meta?.mosaicSectionMotifVariants;
  const plan = sectionFilter ?? meta?.mosaicSectionPlan;
  if (!variants || !plan?.length) return score;
  const out = structuredClone(score) as ScoreModel;
  const injectPart = target.resolvePart(out);
  if (!injectPart) return out;
  const tonicPlan = meta?.mosaicSectionPlan ?? plan;

  for (const section of plan) {
    const role = resolvePhraseRole(section);
    const roleHints = role ? buildPhraseRoleHints(role) : null;
    if (roleHints?.motifProminence === 'absent') continue;
    const variant = variants[section.sectionLabel];
    if (!variant || !('intervalPattern' in variant)) continue;
    const core = variant as CoreMotif;
    const tileSection = mosaicVrbTilesMotifAcrossSection(section.songwriterStyleId);
    const sectionBars = tileSection
      ? Array.from(
          { length: section.endBar - section.startBar + 1 },
          (_, i) => section.startBar + i
        )
      : [section.startBar];
    const sectionMeter = mosaicSectionMeterForEntry(section);
    const barCap = mosaicBarBeatSpanQuarters(sectionMeter);
    const tonicMap = buildMosaicTonicMap([...tonicPlan], context);
    const tonicPc = tonicMap[section.sectionLabel] ?? 0;
    const sourceLabel = tonicPlan[0]?.sectionLabel;
    const sourceTonic = sourceLabel ? (tonicMap[sourceLabel] ?? 0) : 0;
    let delta = tonicPc - sourceTonic;
    if (delta > 6) delta -= 12;
    if (delta < -6) delta += 12;
    const motifRef = `mosaic_motif_${section.sectionLabel}`;
    const motifVel =
      roleHints?.motifProminence === 'support'
        ? Math.max(1, 80 - MOSAIC_PHRASE_ROLE_DYNAMIC_STEP)
        : undefined;

    let carryPitch: number | undefined;

    for (const bar of sectionBars) {
      const m = injectPart.measures.find((x) => x.index === bar);
      if (!m) continue;
      const [effectiveLow, effectiveHigh] = guitarMap
        ? guitarInjectTarget(guitarMap).getRegisterForBar(bar, context)
        : target.getRegisterForBar(bar, context);
      let startMidi = 60 + tonicPc + delta;
      while (startMidi < effectiveLow) startMidi += 12;
      while (startMidi > effectiveHigh) startMidi -= 12;
      startMidi = Math.max(effectiveLow, Math.min(effectiveHigh, startMidi));

      const savedChord = tileSection ? m.chord : undefined;

      for (let ei = m.events.length - 1; ei >= 0; ei--) {
        const e = m.events[ei]!;
        if (tileSection) {
          if (e.kind === 'note' || e.kind === 'rest') m.events.splice(ei, 1);
        } else if ((e.voice ?? 1) === 1 && (e.kind === 'note' || e.kind === 'rest')) {
          m.events.splice(ei, 1);
        }
      }

      if (tileSection) {
        const barNotes = mosaicMotifNotesForBar(
          core,
          section.songwriterStyleId,
          context.seed,
          barCap,
          bar - section.startBar,
          startMidi,
          effectiveLow,
          effectiveHigh,
          carryPitch
        );
        for (const n of barNotes) {
          addEvent(
            m,
            createNote(n.pitch, n.startBeat, n.duration, 1, motifRef, undefined, motifVel)
          );
        }
        if (barNotes.length > 0) {
          carryPitch = barNotes[barNotes.length - 1]!.pitch;
        }
        if (savedChord) m.chord = savedChord;
        continue;
      }

      let pitch = startMidi;
      const noteCount = core.rhythmPattern.length;
      for (let i = 0; i < noteCount; i++) {
        const rh = core.rhythmPattern[i]!;
        if (rh.startBeat >= barCap - 1e-6) continue;
        const duration = Math.min(rh.duration, barCap - rh.startBeat);
        if (duration <= 0) continue;
        addEvent(
          m,
          createNote(pitch, rh.startBeat, duration, 1, motifRef, undefined, motifVel)
        );
        if (i < core.intervalPattern.length) {
          pitch += core.intervalPattern[i]!;
          pitch = Math.max(effectiveLow, Math.min(effectiveHigh, pitch));
        }
      }
    }
  }
  return out;
}

function mosaicPlanHasBigBandPresetRole(
  plan: readonly MosaicModeSectionPlanEntry[]
): boolean {
  return plan.some(
    (entry) =>
      (entry as MosaicModeSectionPlanEntry & { presetRole?: string }).presetRole ===
      'big_band'
  );
}

/** True when BB post-finalize motif inject gates are satisfied (default off). */
export function isBigBandMosaicInjectGated(
  context: CompositionContext,
  bbMosaicEnabled?: boolean
): boolean {
  if (!isMosaicModeActive(context)) return false;
  if (bbMosaicEnabled !== true) return false;
  if (context.generationMetadata?.allowMosaicPostFinalizeInject !== true) return false;
  const plan = context.generationMetadata?.mosaicSectionPlan ?? [];
  return mosaicPlanHasBigBandPresetRole(plan);
}

function ensureMosaicMotifVariantsForInject(context: CompositionContext): void {
  const meta = context.generationMetadata;
  if (!meta) return;
  const existing = meta.mosaicSectionMotifVariants;
  if (existing && Object.keys(existing).length > 0) return;
  const plan = meta.mosaicSectionPlan ?? [];
  if (!plan.length) return;
  const totalBars = Math.max(...plan.map((s) => s.endBar), 1);
  const source = generateMosaicSourceMotif(context.seed, totalBars);
  const tonicMap = buildMosaicTonicMap(plan, context);
  meta.mosaicSourceMotif = source;
  meta.mosaicSectionMotifVariants = buildMosaicMotifVariants(source, plan, tonicMap);
}

/**
 * Big-band post-finalize motif inject — lead alto only; section-scoped V79f bypass reused.
 * Gates: `presetRole === 'big_band'`, `bbMosaicEnabled`, `allowMosaicPostFinalizeInject`.
 */
export function injectMosaicMotifNotesPostFinalizeBigBand(
  score: ScoreModel,
  context: CompositionContext,
  bbMosaicEnabled?: boolean
): ScoreModel {
  if (!isBigBandMosaicInjectGated(context, bbMosaicEnabled)) return score;
  ensureMosaicMotifVariantsForInject(context);
  return injectEligibleSectionsForTarget(score, context, bigBandLeadInjectTarget());
}
