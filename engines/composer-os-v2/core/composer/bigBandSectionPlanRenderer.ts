/**
 * Phase 6 — consume {@link BigBandVoicing} rhythm / geometry plans for BB section output.
 * Falls back to legacy {@link SoliPlan} / {@link BackgroundsPlan} when Phase 6 arrays are empty.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { vrbContextMapFromSectionRecord } from '../counterpoint/vrbProfiles/vrbContextResolver';
import type { AbstractLineSet, LineRole, NoteEvent as AbstractNoteEvent } from '../counterpoint/abstractLineSet';
import type { BigBandVoicing } from '../counterpoint/ContrapuntalLineEngine';
import { ContrapuntalLineEngine } from '../counterpoint/ContrapuntalLineEngine';
import { runSqBbGceGate2, shouldApplySqToBbGceGates } from '../counterpoint/sqToBbGceGates';
import type { VoicingGeometry, VoicingGeometryShape } from '../counterpoint/chooseVoicingGeometry';
import type {
  BackgroundsRhythmPlan,
  SoliRhythmPlan,
} from '../counterpoint/planSoliAndBackgroundsRhythm';
import type {
  EnsembleSection,
  SectionAssignment,
  SectionRole,
  SectionWritingIntent,
} from '../counterpoint/quartetFeatureTypes';
import type { BackgroundsPlan, SoliPlan } from './bigBandSectionWriter';

export type BackgroundsRhythmValue = BackgroundsRhythmPlan['backgroundsRhythm'];

export interface BigBandSectionNoteStub {
  readonly section: EnsembleSection;
  readonly role: SectionRole;
  readonly pitchMidi: number;
  readonly startBeat: number;
  readonly durationBeats: number;
  readonly lineDerived: boolean;
}

export interface BigBandSectionPhraseRender {
  readonly phraseId: string;
  readonly startBeat: number;
  readonly endBeat: number;
  readonly soliDurationsBeats: readonly number[];
  readonly backgroundsRhythm: BackgroundsRhythmValue;
  readonly geometryShape: VoicingGeometryShape;
  readonly assignments: readonly SectionAssignment[];
  readonly notes: readonly BigBandSectionNoteStub[];
}

export interface BigBandSectionRenderOutput {
  readonly phrases: readonly BigBandSectionPhraseRender[];
}

export type WiredBigBandVoicing = BigBandVoicing & {
  readonly sectionRender?: BigBandSectionRenderOutput;
};

const VOICE_ID_TO_ROLE: Record<'S' | 'A' | 'T' | 'B', LineRole> = {
  S: 'soprano',
  A: 'alto',
  T: 'tenor',
  B: 'bass',
};

export function rhythmDensityRank(rhythm: BackgroundsRhythmValue | BackgroundsPlan['rhythm']): number {
  switch (rhythm) {
    case 'whole':
      return 0;
    case 'half':
      return 1;
    case 'quarter':
      return 2;
    case 'eighth':
      return 3;
    default:
      return 0;
  }
}

function phase6PlansPresent(voicing: BigBandVoicing): boolean {
  return (
    (voicing.voicingGeometries?.length ?? 0) > 0 &&
    (voicing.soliRhythmPlans?.length ?? 0) > 0 &&
    (voicing.backgroundsRhythmPlans?.length ?? 0) > 0 &&
    (voicing.sectionWritingIntents?.length ?? 0) > 0
  );
}

function pickPhraseIndex(voicing: BigBandVoicing): number {
  const intents = voicing.sectionWritingIntents ?? [];
  if (intents.length === 0) return 0;
  let best = 0;
  let bestSpan = intents[0]!.endBeat - intents[0]!.startBeat;
  for (let i = 1; i < intents.length; i++) {
    const span = intents[i]!.endBeat - intents[i]!.startBeat;
    if (span > bestSpan) {
      bestSpan = span;
      best = i;
    }
  }
  return best;
}

function spreadFromGeometry(
  geometry: VoicingGeometry,
  base: SoliPlan,
): Pick<SoliPlan, 'closePosition' | 'spreadMin' | 'spreadMax'> {
  switch (geometry.shape) {
    case 'close':
      return {
        closePosition: true,
        spreadMin: Math.max(2, base.spreadMin - 2),
        spreadMax: Math.min(18, base.spreadMax),
      };
    case 'cluster':
      return {
        closePosition: true,
        spreadMin: Math.max(0, base.spreadMin - 4),
        spreadMax: Math.min(14, base.spreadMax),
      };
    case 'spread':
      return {
        closePosition: false,
        spreadMin: base.spreadMin,
        spreadMax: base.spreadMax,
      };
    case 'drop2and4':
      return {
        closePosition: false,
        spreadMin: Math.min(base.spreadMin + 2, 12),
        spreadMax: Math.min(base.spreadMax + 4, 36),
      };
    default:
      return {
        closePosition: base.closePosition,
        spreadMin: base.spreadMin,
        spreadMax: base.spreadMax,
      };
  }
}

function mapBackgroundsRhythmToLegacy(
  rhythm: BackgroundsRhythmValue,
): BackgroundsPlan['rhythm'] {
  if (rhythm === 'whole') return 'whole';
  return 'half';
}

function phraseNotesInRange(
  lines: AbstractLineSet,
  intent: SectionWritingIntent,
): AbstractNoteEvent[] {
  const lo = intent.startBeat - 1e-9;
  const hi = intent.endBeat + 1e-9;
  const out: AbstractNoteEvent[] = [];
  for (const v of lines.voices) {
    for (const n of v.notes) {
      if (n.offsetBars >= lo && n.offsetBars < hi) {
        out.push(n);
      }
    }
  }
  return out;
}

function notesForAssignment(
  lines: AbstractLineSet,
  intent: SectionWritingIntent,
  assign: SectionAssignment,
): AbstractNoteEvent[] {
  const roles = new Set(assign.sourceVoiceIds.map((id) => VOICE_ID_TO_ROLE[id]));
  const lo = intent.startBeat - 1e-9;
  const hi = intent.endBeat + 1e-9;
  const picked: AbstractNoteEvent[] = [];
  for (const v of lines.voices) {
    if (!roles.has(v.role)) continue;
    for (const n of v.notes) {
      if (n.offsetBars >= lo && n.offsetBars < hi) {
        picked.push(n);
      }
    }
  }
  picked.sort((a, b) => a.offsetBars - b.offsetBars || a.pitchMidi - b.pitchMidi);
  return picked;
}

function cycleDurations(totalBeats: number, pattern: readonly number[]): number[] {
  if (pattern.length === 0) return [totalBeats];
  const out: number[] = [];
  let remain = totalBeats;
  let i = 0;
  while (remain > 1e-6) {
    const d = pattern[i % pattern.length]!;
    const take = Math.min(remain, Math.max(0.25, d));
    out.push(take);
    remain -= take;
    i++;
  }
  return out.length ? out : [totalBeats];
}

function materializeSoliNotes(
  lines: AbstractLineSet,
  intent: SectionWritingIntent,
  soliRhythm: SoliRhythmPlan,
): BigBandSectionNoteStub[] {
  const phraseSpan = Math.max(0.25, intent.endBeat - intent.startBeat);
  const durations = cycleDurations(phraseSpan, soliRhythm.primaryDurationsBeats);
  const soliAssigns = intent.assignments.filter(
    (a) => a.role === 'lead' || a.role === 'counterline' || a.role === 'doubling',
  );
  const stubs: BigBandSectionNoteStub[] = [];
  for (const assign of soliAssigns) {
    const src = notesForAssignment(lines, intent, assign);
    if (src.length === 0) continue;
    let cursor = intent.startBeat;
    let di = 0;
    for (const n of src) {
      const dur = durations[di % durations.length] ?? phraseSpan;
      stubs.push({
        section: assign.section,
        role: assign.role,
        pitchMidi: Math.round(n.pitchMidi),
        startBeat: Math.max(0, n.offsetBars - intent.startBeat),
        durationBeats: Math.min(dur, Math.max(0.25, intent.endBeat - cursor)),
        lineDerived: assign.lineDerived,
      });
      cursor += dur;
      di++;
      if (cursor >= intent.endBeat - 1e-9) break;
    }
  }
  return stubs;
}

function padDurationBeats(rhythm: BackgroundsRhythmValue, phraseSpan: number): number {
  switch (rhythm) {
    case 'whole':
      return phraseSpan;
    case 'half':
      return phraseSpan / 2;
    case 'quarter':
      return phraseSpan / 4;
    case 'eighth':
      return phraseSpan / 8;
    default:
      return phraseSpan;
  }
}

function materializeBackgroundNotes(
  lines: AbstractLineSet,
  intent: SectionWritingIntent,
  bgRhythm: BackgroundsRhythmPlan,
): BigBandSectionNoteStub[] {
  const phraseSpan = Math.max(0.25, intent.endBeat - intent.startBeat);
  const dur = padDurationBeats(bgRhythm.backgroundsRhythm, phraseSpan);
  const padAssigns = intent.assignments.filter((a) => a.role === 'pad' || a.role === 'pedal');
  const stubs: BigBandSectionNoteStub[] = [];
  for (const assign of padAssigns) {
    const src = notesForAssignment(lines, intent, assign);
    const seeds = src.length ? src : phraseNotesInRange(lines, intent).slice(0, 1);
    for (const n of seeds) {
      stubs.push({
        section: assign.section,
        role: assign.role,
        pitchMidi: Math.round(n.pitchMidi),
        startBeat: Math.max(0, n.offsetBars - intent.startBeat),
        durationBeats: dur,
        lineDerived: assign.lineDerived,
      });
    }
  }
  return stubs;
}

function renderPhrasesFromVoicing(
  voicing: BigBandVoicing,
  lines: AbstractLineSet | undefined,
): BigBandSectionRenderOutput | undefined {
  if (!phase6PlansPresent(voicing) || !lines) return undefined;
  const intents = voicing.sectionWritingIntents!;
  const soliPlans = voicing.soliRhythmPlans!;
  const bgPlans = voicing.backgroundsRhythmPlans!;
  const geometries = voicing.voicingGeometries!;
  const phrases: BigBandSectionPhraseRender[] = [];
  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i]!;
    const soliRh = soliPlans[i] ?? soliPlans[0]!;
    const bgRh = bgPlans[i] ?? bgPlans[0]!;
    const geo = geometries[i] ?? geometries[0]!;
    const soliNotes = materializeSoliNotes(lines, intent, soliRh);
    const bgNotes = materializeBackgroundNotes(lines, intent, bgRh);
    phrases.push({
      phraseId: intent.phraseId,
      startBeat: intent.startBeat,
      endBeat: intent.endBeat,
      soliDurationsBeats: soliRh.primaryDurationsBeats,
      backgroundsRhythm: bgRh.backgroundsRhythm,
      geometryShape: geo.shape,
      assignments: intent.assignments,
      notes: [...soliNotes, ...bgNotes],
    });
  }
  return { phrases };
}

/**
 * Merge Phase 6 geometry / rhythm into legacy plan fields + optional phrase-level note stubs.
 */
export function applyPhase6RendererWiring(
  voicing: BigBandVoicing,
  lines?: AbstractLineSet,
): WiredBigBandVoicing {
  if (!phase6PlansPresent(voicing)) {
    return { ...voicing, sectionRender: renderPhrasesFromVoicing(voicing, lines) };
  }
  const idx = pickPhraseIndex(voicing);
  const geometry = voicing.voicingGeometries![idx]!;
  const soliRhythm = voicing.soliRhythmPlans![idx]!;
  const bgRhythm = voicing.backgroundsRhythmPlans![idx]!;

  const mergedSoli: SoliPlan | undefined = voicing.soliPlan
    ? {
        ...voicing.soliPlan,
        ...spreadFromGeometry(geometry, voicing.soliPlan),
        derivationTag: voicing.soliPlan.derivationTag ?? 'phase6_geometry',
      }
    : voicing.soliPlan;

  const mergedBg: BackgroundsPlan | undefined = voicing.backgroundsPlan
    ? {
        ...voicing.backgroundsPlan,
        rhythm: mapBackgroundsRhythmToLegacy(bgRhythm.backgroundsRhythm),
        derivationTag: voicing.backgroundsPlan.derivationTag ?? 'phase6_backgrounds_rhythm',
      }
    : voicing.backgroundsPlan;

  return {
    ...voicing,
    soliPlan: mergedSoli,
    backgroundsPlan: mergedBg,
    sectionRender: renderPhrasesFromVoicing(
      {
        ...voicing,
        soliPlan: mergedSoli,
        backgroundsPlan: mergedBg,
      },
      lines,
    ),
  };
}

/** Effective spread for voicing solver — Phase 6 geometry when wired metadata is present. */
export function effectiveSpreadSemitonesFromMetadata(
  context: CompositionContext,
): { minSpreadSemitones: number; maxSpreadSemitones: number } | null {
  const wired = context.generationMetadata?.bigBandVoicing as WiredBigBandVoicing | undefined;
  const soli = wired?.soliPlan;
  if (!soli || soli.kind !== 'soli') return null;
  if (!phase6PlansPresent(wired)) return null;
  return { minSpreadSemitones: soli.spreadMin, maxSpreadSemitones: soli.spreadMax };
}

/**
 * Duo golden path — render BB plans from contrapuntal line set and store on metadata.
 */
export function wireBigBandSectionRendererOnContext(context: CompositionContext): WiredBigBandVoicing | null {
  const ls = context.generationMetadata?.contrapuntalLineSet;
  if (!ls) return null;
  const gen = context.generationMetadata as GenerationMetadata & {
    bigBandVoicing?: WiredBigBandVoicing;
    bigBandSectionRender?: BigBandSectionRenderOutput;
    sqBbGceGate1BlockedRenderer?: boolean;
    sqBbGceGate2?: import('../counterpoint/sqToBbGceGates').SqBbGceGate2Record;
  };
  if (gen.sqBbGceGate1BlockedRenderer) {
    return null;
  }
  const vrbId = ls.styleSourceVrbId;
  const engine = new ContrapuntalLineEngine(
    vrbId,
    context,
    vrbContextMapFromSectionRecord(context.generationMetadata?.sqToBbVrbContextBySection),
    context.form?.sections?.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })) ?? null,
  );
  const raw = engine.renderForBigBand(ls);
  const wired = applyPhase6RendererWiring(raw, ls);
  if (shouldApplySqToBbGceGates(context, vrbId) && wired.sectionRender) {
    const gate2 = runSqBbGceGate2(wired, ls, context);
    gen.sqBbGceGate2 = gate2;
    if (gate2.hardFail) {
      return null;
    }
  }
  gen.bigBandVoicing = wired;
  if (wired.sectionRender) {
    gen.bigBandSectionRender = wired.sectionRender;
  }
  return wired;
}
