/**
 * Mosaic Mode — post-finalize tile inject, underfill pad, overfill trim (5/4+ bars).
 */

import type { CompositionContext } from '../compositionContext';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import { getEffectiveRegisterWindowForBar } from '../section-architecture/effectiveContextForBar';
import { DEFAULT_BAR_METER } from '../rhythm/oddMeterQuantiser';
import type { BarMeterSignature } from '../rhythm/barMeterTypes';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import { addEvent, createNote, createRest } from '../score-model/scoreEventBuilder';
import type {
  MeasureModel,
  NoteEvent,
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

function snapshotEligibleBars(
  score: ScoreModel,
  sections: readonly MosaicSectionPlanEntry[]
): Map<number, BarInjectSnapshot> {
  const guitar = guitarPartFromScore(score);
  const out = new Map<number, BarInjectSnapshot>();
  if (!guitar) return out;
  for (const section of sections) {
    for (let bar = section.startBar; bar <= section.endBar; bar++) {
      const m = guitar.measures.find((x) => x.index === bar);
      if (!m) continue;
      out.set(bar, {
        events: structuredClone(m.events),
        chord: m.chord,
      });
    }
  }
  return out;
}

function revertInjectedBarFromSnapshot(
  score: ScoreModel,
  snapshot: Map<number, BarInjectSnapshot>,
  bar: number
): void {
  const guitar = guitarPartFromScore(score);
  const snap = snapshot.get(bar);
  if (!guitar || !snap) return;
  const m = guitar.measures.find((x) => x.index === bar);
  if (!m) return;
  m.events = structuredClone(snap.events);
  m.chord = snap.chord;
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
      if (
        mosaicInjectHarmonyBarViolated(before, m.chord, bar, section.endBar)
      ) {
        revertInjectedBarFromSnapshot(score, snapshot, bar);
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

  return injectMosaicMotifNotesPostFinalizeCore(score, context, guitarMap);
}

/** Section-scoped lift: inject only into mosaicOwned + injectEligible non-spine sections. */
export function injectEligibleSectionsOnly(
  score: ScoreModel,
  context: CompositionContext,
  guitarMap: InstrumentRegisterMap
): ScoreModel {
  const meta = context.generationMetadata;
  const plan = meta?.mosaicSectionPlan ?? [];
  const eligible = plan.filter(isMosaicInjectEligibleSection);
  if (!eligible.length) return score;

  const snapshot = snapshotEligibleBars(score, eligible);
  const injected = injectMosaicMotifNotesPostFinalizeCore(
    structuredClone(score) as ScoreModel,
    context,
    guitarMap,
    eligible
  );
  applyMosaicInjectHarmonyFallback(injected, snapshot, eligible);
  return injected;
}

function injectMosaicMotifNotesPostFinalizeCore(
  score: ScoreModel,
  context: CompositionContext,
  guitarMap: InstrumentRegisterMap,
  sectionFilter?: readonly MosaicSectionPlanEntry[]
): ScoreModel {
  const meta = context.generationMetadata;
  const variants = meta?.mosaicSectionMotifVariants;
  const plan = sectionFilter ?? meta?.mosaicSectionPlan;
  if (!variants || !plan?.length) return score;
  const out = structuredClone(score) as ScoreModel;
  const guitar = guitarPartFromScore(out);
  if (!guitar) return out;
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
      const m = guitar.measures.find((x) => x.index === bar);
      if (!m) continue;
      const [zLow, zHigh] = getRegisterForBar(guitarMap, bar, context);
      const registerWindow = getEffectiveRegisterWindowForBar(bar, context, 'guitar');
      const effectiveLow = Math.max(zLow, registerWindow?.floor ?? 52);
      const effectiveHigh = Math.min(zHigh, registerWindow?.ceil ?? 84, 79);
      let startMidi = 60 + tonicPc + delta;
      while (startMidi < effectiveLow) startMidi += 12;
      while (startMidi > effectiveHigh) startMidi -= 12;
      startMidi = Math.max(effectiveLow, Math.min(effectiveHigh, startMidi));

      const savedChord = tileSection ? m.chord : undefined;

      for (let ei = m.events.length - 1; ei >= 0; ei--) {
        const e = m.events[ei]!;
        if (tileSection) {
          if (e.kind === 'note' || e.kind === 'rest') m.events.splice(ei, 1);
        } else if (e.kind === 'note' && (e as NoteEvent).motifRef?.startsWith('mosaic_motif_')) {
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
