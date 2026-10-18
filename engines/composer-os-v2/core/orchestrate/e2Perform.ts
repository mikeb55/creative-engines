/**
 * E2 C+D opt-in performance. Legacy orchestrate() calls this only when request.e2 is set.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { CONCERT_TRANSPOSITION } from '../instruments/instrumentTypes';
import { writtenToSounding } from '../instruments/writtenPitch';
import { midiOfPitch } from '../performance-composer/pcChord';
import { q, type ExactQuarter } from '../piano/pianoExactTiming';
import { adaptBigBand } from '../big-band/e2BigBandAdapter';
import { adaptEcmDuo, type GuitarGripWitness } from '../ecm/e2EcmDuoAdapter';
import { adaptQuartet, type DoubleStopWitness } from '../string-quartet/e2QuartetAdapter';
import type { E2EnsembleId } from './ensembleTemplates';
import { buildE2Score, defaultMetres, type BuiltE2Score } from './e2Placement';
import type { RealisationReceipt } from './harmonicRealisation';
import { realiseScheduled, type FullAnchor, type ScheduledSlot } from './harmonicRealisation';
import type { HarmonicRegion } from './harmonicColourTypes';
import type { LockPolicy } from './sourceLocks';
import type { SpelledRegister } from './harmonicColourTypes';
import { parametersHash, type SourceBundle } from './sourceFoundation';
import { verifyExpandedLocks } from './e2LockBoundary';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';

export interface E2PerformRequest {
  ensemble: E2EnsembleId;
  regions: readonly HarmonicRegion[];
  schedule: readonly ScheduledSlot[];
  fullAnchors?: readonly FullAnchor[];
  witnesses?: readonly GuitarGripWitness[];
  doubleStops?: readonly DoubleStopWitness[];
  partFor?: (placementId: string, logicalVoiceId: string, midi: number) => string;
  seed: number;
  title: string;
  tempo: number;
  bars: number;
  metres?: BarMeterMap;
  source?: SourceBundle;
  lockPolicy?: LockPolicy;
  sourceXml?: string;
  allowReduced?: boolean;
  words?: Record<string, Record<number, string>>;
  sourceNotes?: readonly {
    partId: string;
    pitch: SpelledRegister;
    onset: ExactQuarter;
    duration: ExactQuarter;
    sourceId: string;
  }[];
}

export interface E2PerformSuccess {
  ok: true;
  realisation: RealisationReceipt;
  placements: RealisationReceipt['placements'];
  score: ScoreModel;
  musicXml: string;
  built: BuiltE2Score;
  planPartIds: readonly string[];
  parallelMotion: boolean | null;
  witnessIds: readonly string[];
}

export type E2PerformResult = E2PerformSuccess | { ok: false; reason: string };

export function performE2(request: E2PerformRequest): E2PerformResult {
  const realised = realiseScheduled({
    regions: request.regions,
    schedule: request.schedule,
    seed: request.seed,
    fullAnchors: request.fullAnchors,
    allowReduced: request.allowReduced,
    source: request.source,
    lockPolicy: request.lockPolicy,
    sourceXml: request.sourceXml,
  });
  if (!realised.ok) return realised;
  const placements = [
    ...realised.receipt.placements,
    ...(request.sourceNotes ?? []).map((note, index) => ({
      id: `source:${note.sourceId}:${index}`,
      attack: {
        eventId: note.sourceId,
        onset: note.onset,
        duration: note.duration,
        pitch: note.pitch,
        members: [],
        rest: false,
      },
      lineage: {
        eventId: note.sourceId,
        origin: 'source' as const,
        sourceEventIds: [note.sourceId],
        parentEventIds: [],
        operation: { id: 'source-lock', version: 'e2-harmonic-realisation-1', parametersHash: parametersHash({ sourceId: note.sourceId }) },
      },
      regionId: 'source',
      slotId: 'source',
      logicalVoiceId: note.partId,
      occurrence: index + 1,
      sourceNotationEventIds: [note.sourceId],
    })),
  ];
  try {
    if (request.ensemble === 'big-band') {
      const adapted = adaptBigBand(placements.map((placement) => ({
        ...placement,
        logicalVoiceId: request.partFor?.(placement.id, placement.logicalVoiceId, placement.attack.pitch.midi) ?? placement.logicalVoiceId,
      })), request.seed);
      if (!adapted.ok) return adapted;
      const built = buildE2Score({
        title: request.title,
        tempo: request.tempo,
        bars: request.bars,
        metres: request.metres ?? defaultMetres(request.bars),
        parts: adapted.adaptation.parts,
        placements,
        rests: realised.receipt.rests,
        assignments: adapted.adaptation.assignments,
        words: request.words,
      });
      return finish(realised.receipt, placements, built, adapted.adaptation.planPartIds, null, []);
    }
    if (request.ensemble === 'string-quartet') {
      const retargeted = placements.map((placement) => ({
        ...placement,
        logicalVoiceId: request.partFor?.(placement.id, placement.logicalVoiceId, placement.attack.pitch.midi) ?? placement.logicalVoiceId,
      }));
      const adapted = adaptQuartet(retargeted, request.doubleStops ?? []);
      if (!adapted.ok) return adapted;
      const built = buildE2Score({
        title: request.title,
        tempo: request.tempo,
        bars: request.bars,
        metres: request.metres ?? defaultMetres(request.bars),
        parts: adapted.adaptation.parts,
        placements,
        rests: realised.receipt.rests,
        assignments: adapted.adaptation.assignments,
        words: request.words,
      });
      return finish(realised.receipt, placements, built, adapted.adaptation.parts.map((part) => part.partId), adapted.adaptation.parallelMotion, []);
    }
    const retargeted = placements.map((placement) => ({
      ...placement,
      logicalVoiceId: request.partFor?.(placement.id, placement.logicalVoiceId, placement.attack.pitch.midi) ?? placement.logicalVoiceId,
    }));
    const adapted = adaptEcmDuo(retargeted, request.witnesses ?? [], request.seed, (placement) => placement.logicalVoiceId);
    if (!adapted.ok) return adapted;
    const built = buildE2Score({
      title: request.title,
      tempo: request.tempo,
      bars: request.bars,
      metres: request.metres ?? defaultMetres(request.bars),
      parts: adapted.adaptation.parts,
      placements,
      rests: realised.receipt.rests,
      assignments: adapted.adaptation.assignments,
      words: request.words,
    });
    return finish(realised.receipt, placements, built, ['guitar', 'bass'], null, adapted.adaptation.witnessIds);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function finish(
  realisation: RealisationReceipt,
  placements: RealisationReceipt['placements'],
  built: BuiltE2Score,
  planPartIds: readonly string[],
  parallelMotion: boolean | null,
  witnessIds: readonly string[],
): E2PerformResult {
  const exported = exportScoreModelToMusicXml(built.score);
  if (!exported.success || !exported.xml) return { ok: false, reason: exported.errors.join('; ') || 'MusicXML export failed' };
  return {
    ok: true,
    realisation,
    placements,
    score: built.score,
    musicXml: exported.xml,
    built,
    planPartIds,
    parallelMotion,
    witnessIds,
  };
}

export function projectSourceLocks(
  source: SourceBundle,
  policy: LockPolicy,
  built: BuiltE2Score,
  placements: RealisationReceipt['placements'],
): { ok: boolean; detail: string } {
  const checked = verifyExpandedLocks(source, source, policy);
  if (checked.expansion.mode === 'zero') {
    return { ok: checked.expansion.expandedIds.length === 0, detail: 'zero selected events' };
  }
  for (const id of checked.expansion.expandedIds) {
    const record = source.records.find((item) => item.canonical.id === id);
    if (!record || record.canonical.rest || record.canonical.soundingMidi === null) continue;
    const placement = placements.find((item) => item.sourceNotationEventIds.includes(id));
    if (!placement) return { ok: false, detail: `protected ${id} missing from output placements` };
    const exported = exportedSounding(built, placement.id);
    if (!exported || exported.midi !== record.canonical.soundingMidi) {
      return { ok: false, detail: `protected ${id} sounding pitch changed` };
    }
    if (exported.onset.n * record.canonical.onset.d !== record.canonical.onset.n * exported.onset.d) {
      return { ok: false, detail: `protected ${id} onset changed` };
    }
  }
  return { ok: true, detail: `${checked.expansion.mode}:${checked.expansion.expandedIds.length}` };
}

function exportedSounding(
  built: BuiltE2Score,
  placementId: string,
): { midi: number; onset: ExactQuarter } | null {
  for (const part of built.score.parts) {
    const transposition = built.score.exportPartTranspose?.[part.id] ?? CONCERT_TRANSPOSITION;
    for (const measure of part.measures) {
      for (const event of measure.events) {
        if (event.kind !== 'note' || event.pianoExact?.logicalEventId !== placementId || !event.spelling) continue;
        const { step, alter } = event.spelling;
        let octave = -1;
        for (let candidate = 0; candidate <= 9; candidate += 1) {
          if (midiOfPitch(step, alter, candidate) === event.pitch) octave = candidate;
        }
        if (octave < 0) return null;
        const sounding = writtenToSounding({ step, alter, octave, midi: event.pitch }, transposition);
        return { midi: sounding.midi, onset: event.pianoExact.onsetQ };
      }
    }
  }
  return null;
}

export function span(onset: ExactQuarter = q(0), duration: ExactQuarter = q(16)): { onset: ExactQuarter; duration: ExactQuarter } {
  return { onset, duration };
}
