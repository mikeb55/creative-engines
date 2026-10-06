/**
 * Ordered pentatonic path.
 * Local scores come from the Dev 1 evaluator. This file adds transition cost only.
 * States are pitch-class sets. Nothing here requires a set of five.
 */

import type { MusicContext } from '../music-context/musicContextTypes';
import { generatePentatonicCandidates } from './candidates';
import { readChordEvidence } from './chordEvidence';
import { scoringForEvidenceProfile } from './evidenceProfiles';
import { compareEvaluated, evaluateCandidate, PENTATONIC_EVALUATOR_VERSION, type EvaluationEvidence } from './evaluate';
import {
  optimizePentatonicPath,
  quantizePathCost,
  summarizeOptimizedPath,
  type OptimizerEvent,
  type OptimizerState,
} from './optimizePath';
import { parseNoteList, parseNoteToken, spellingForPc, uniquePitchClasses, type ParsedNote } from './pitch';
import { PENTATONIC_PATH_ENGINE_VERSION, PENTATONIC_PATH_NONE, liquidChangeParts, pathConfigurationId, resolvePathConfig } from './pathConfig';
import {
  PENTATONIC_PATH_LIMITATIONS,
  type PentatonicPassage,
  type PentatonicPassageEvent,
  type PentatonicPathEventDecision,
  type PentatonicPathOptions,
  type PentatonicPathResult,
  type PitchClassTransitionDetail,
} from './pathTypes';
import { PENTATONIC_RELATIONSHIP_SCORING_VERSION } from './relationshipScoring';
import { PENTATONIC_REGISTRY_VERSION } from './registry';

function emptyPath(partial: Partial<PentatonicPathResult> & Pick<PentatonicPathResult, 'kind'>): PentatonicPathResult {
  return {
    kind: partial.kind,
    validationErrors: partial.validationErrors ?? [],
    disposition: partial.disposition ?? null,
    pathEngineVersion: PENTATONIC_PATH_ENGINE_VERSION,
    configVersion: partial.configVersion ?? pathConfigurationId(resolvePathConfig()),
    evaluatorVersion: PENTATONIC_EVALUATOR_VERSION,
    registryVersion: PENTATONIC_REGISTRY_VERSION,
    relationshipScoringVersion: PENTATONIC_RELATIONSHIP_SCORING_VERSION,
    sourceEventCount: partial.sourceEventCount ?? 0,
    events: partial.events ?? [],
    segments: partial.segments ?? [],
    switchCount: partial.switchCount ?? 0,
    distinctResources: partial.distinctResources ?? 0,
    noneEventCount: partial.noneEventCount ?? 0,
    noneSegmentCount: partial.noneSegmentCount ?? 0,
    totalPathCost: partial.totalPathCost ?? null,
    costBreakdown: partial.costBreakdown ?? null,
    bestStaticPathCost: partial.bestStaticPathCost ?? null,
    bestStaticStateId: partial.bestStaticStateId ?? null,
    bestStaticStateName: partial.bestStaticStateName ?? null,
    alternatives: partial.alternatives ?? [],
    diagnostics: partial.diagnostics ?? [],
    limitations: partial.limitations ?? [...PENTATONIC_PATH_LIMITATIONS],
    explanation: partial.explanation ?? '',
  };
}

function readNotes(
  value: readonly string[] | undefined,
  rest: boolean | undefined,
  label: string,
  eventLabel: string,
  errors: string[]
): { pcs: number[]; notes: ParsedNote[] } {
  if (rest) return { pcs: [], notes: [] };
  if (!value || value.length === 0) return { pcs: [], notes: [] };
  const parsed = parseNoteList(value);
  if (!parsed.ok) {
    errors.push(`Event "${eventLabel}" ${label}: ${parsed.error}`);
    return { pcs: [], notes: [] };
  }
  return { pcs: uniquePitchClasses(parsed.notes), notes: parsed.notes };
}

function namesFor(pcs: readonly number[], spellings: readonly ParsedNote[]): string[] {
  return pcs.map((pc) => spellingForPc(pc, spellings));
}

function transitionDetail(previous: readonly number[] | null, next: readonly number[] | null, spellings: readonly ParsedNote[]): PitchClassTransitionDetail | null {
  if (!previous || !next) return null;
  const prev = new Set(previous);
  const nxt = new Set(next);
  const retained = [...prev].filter((pc) => nxt.has(pc)).sort((a, b) => a - b);
  const removed = [...prev].filter((pc) => !nxt.has(pc)).sort((a, b) => a - b);
  const introduced = [...nxt].filter((pc) => !prev.has(pc)).sort((a, b) => a - b);
  const nearest = removed.map((from) => {
    let best = introduced[0];
    let bestDist = 99;
    for (const to of introduced) {
      const raw = Math.abs(from - to) % 12;
      const dist = Math.min(raw, 12 - raw);
      if (best === undefined || dist < bestDist || (dist === bestDist && to < best)) {
        best = to;
        bestDist = dist;
      }
    }
    return best === undefined ? null : { from: spellingForPc(from, spellings), to: spellingForPc(best, spellings), semitones: bestDist };
  });
  return {
    retainedPitchClasses: namesFor(retained, spellings),
    removedPitchClasses: namesFor(removed, spellings),
    introducedPitchClasses: namesFor(introduced, spellings),
    nearestPitchClassDisplacement: nearest.filter((item): item is { from: string; to: string; semitones: number } => item !== null),
  };
}

export function recommendPentatonicPath(passage: PentatonicPassage, options?: PentatonicPathOptions): PentatonicPathResult {
  const config = resolvePathConfig(options?.path);
  const configVersion = pathConfigurationId(config);
  const scoring = scoringForEvidenceProfile(passage.evidenceProfile, options?.scoring);
  const errors: string[] = [];
  const diagnostics: string[] = [];
  if (!passage.events || passage.events.length === 0) errors.push('Passage needs at least one event.');
  const ids = new Set<string>();
  for (const event of passage.events ?? []) {
    if (!event.id) errors.push('Every event needs a stable id.');
    else if (ids.has(event.id)) errors.push(`Duplicate event id "${event.id}".`);
    else ids.add(event.id);
    if (!event.sourceLabel) errors.push(`Event "${event.id || '(missing id)'}" needs a source label.`);
  }
  const tonal = passage.tonalCentre ? parseNoteToken(passage.tonalCentre.root) : null;
  if (!passage.tonalCentre || !tonal) errors.push('Tonal centre is missing or malformed.');
  if (passage.tonalCentre && passage.tonalCentre.mode !== 'major' && passage.tonalCentre.mode !== 'minor') {
    errors.push('Tonal centre mode must be major or minor.');
  }
  if (errors.length > 0 || !tonal || !passage.tonalCentre) {
    return emptyPath({ kind: 'validation', validationErrors: errors, configVersion, sourceEventCount: passage.events?.length ?? 0 });
  }

  const built = generatePentatonicCandidates({
    depth: passage.depth ?? 'near',
    tonalCentrePc: tonal.pc,
    tonalCentreSpelling: tonal.spelling,
    home: passage.home ?? null,
    current: passage.current ?? null,
    pinned: passage.pinned ?? [],
  });
  if (!built.ok) return emptyPath({ kind: 'validation', validationErrors: built.errors, configVersion, sourceEventCount: passage.events.length });

  const spellings: ParsedNote[] = [tonal];
  const prepared = passage.events.map((event) => {
    const melody = readNotes(event.melodyNotes, event.melodyRest, 'melody', event.sourceLabel, errors);
    const bass = readNotes(event.bassNotes, event.bassRest, 'bass', event.sourceLabel, errors);
    const held = readNotes(event.heldNotes, false, 'held notes', event.sourceLabel, errors);
    const target = readNotes(event.targetNotes, false, 'target notes', event.sourceLabel, errors);
    const protectedNotes = readNotes(event.protectedNotes, false, 'protected notes', event.sourceLabel, errors);
    const caution = readNotes(event.cautionNotes, false, 'caution notes', event.sourceLabel, errors);
    spellings.push(...melody.notes, ...bass.notes, ...held.notes, ...target.notes, ...protectedNotes.notes, ...caution.notes);
    let harmony: number[] = [];
    let symbol: string | null = null;
    let slash: number | null = null;
    if (event.chordSymbol && event.chordSymbol.trim()) {
      const chord = readChordEvidence(event.chordSymbol);
      if (!chord.ok) diagnostics.push(`Event "${event.sourceLabel}": ${chord.error} Harmony evidence omitted.`);
      else {
        symbol = chord.chord.symbol;
        harmony = [...chord.chord.harmonyPitchClasses];
        slash = chord.chord.slashBassPitchClass;
      }
    }
    let bassPcs = bass.pcs;
    if (slash !== null) {
      if (event.bassRest) diagnostics.push(`Event "${event.sourceLabel}": slash bass ignored because the bass rests.`);
      else if (event.bassNotes === undefined) bassPcs = [slash];
      else diagnostics.push(`Event "${event.sourceLabel}": slash bass ignored because bass notes were supplied.`);
    }
    const silence = event.melodyRest === true && event.bassRest === true;
    if (silence) diagnostics.push(`Event "${event.sourceLabel}": silence. Previous state continues.`);
    else if (event.bassRest) diagnostics.push(`Event "${event.sourceLabel}": bass rest. Not a penalty.`);
    const evidence: EvaluationEvidence = {
      melody: melody.pcs,
      melodySpellings: spellings,
      bass: bassPcs,
      harmony,
      harmonySymbol: symbol,
      held: held.pcs,
      target: target.pcs,
      caution: caution.pcs,
      protected: protectedNotes.pcs,
      strictMelody: passage.strictMelodyMembership === true,
      purpose: passage.purpose ?? null,
      colourTension: passage.colourTension ?? null,
      currentPitchSet: null,
    };
    const hasEvidence =
      silence ||
      event.melodyRest === true ||
      event.bassRest === true ||
      melody.pcs.length > 0 ||
      bassPcs.length > 0 ||
      harmony.length > 0 ||
      held.pcs.length > 0;
    return { event, evidence, silence, hasEvidence, melody };
  });

  if (errors.length > 0) {
    return emptyPath({ kind: 'validation', validationErrors: errors, configVersion, sourceEventCount: passage.events.length, diagnostics });
  }
  if (!prepared.some((item) => item.hasEvidence)) {
    return emptyPath({
      kind: 'analysis',
      disposition: 'INSUFFICIENT_CONTEXT',
      explanation: 'The passage has no harmony, melody, bass, held notes, rest, or silence.',
      configVersion,
      sourceEventCount: passage.events.length,
      diagnostics,
    });
  }

  const currentCandidate = built.candidates.find((candidate) => candidate.isCurrent) ?? null;
  const states: OptimizerState[] = built.candidates.map((candidate) => {
    const sample = evaluateCandidate(candidate, { ...prepared[0]!.evidence, currentPitchSet: currentCandidate?.canonicalPitchSet ?? null }, scoring);
    return {
      id: candidate.canonicalId,
      pitchSet: candidate.canonicalPitchSet,
      archetypeId: sample.primary.archetypeId,
      referenceNote: sample.primary.referenceNote,
      homeRelationshipId: sample.primary.homeRelationshipId,
      homeRelationshipLabel: sample.primary.homeRelationshipLabel,
      name: sample.primary.transposedName,
      displaySpelling: sample.primary.displaySpelling,
    };
  });

  const optimizerEvents: OptimizerEvent[] = [];
  const localBest: { id: string | null; name: string | null; score: number | null }[] = [];
  const evaluatedByEvent = prepared.map((item) => {
    const evidence = { ...item.evidence, currentPitchSet: currentCandidate?.canonicalPitchSet ?? null, melodySpellings: spellings };
    const evaluated = built.candidates.map((candidate) => evaluateCandidate(candidate, evidence, scoring));
    const feasible = evaluated.filter((row) => row.feasible).sort(compareEvaluated);
    const best = feasible[0] ?? null;
    localBest.push(
      best
        ? { id: best.candidate.canonicalId, name: best.recommendation.transposedName, score: best.totalScore }
        : { id: null, name: null, score: null }
    );
    const localScoreById: Record<string, number> = {};
    for (const row of evaluated) if (row.feasible) localScoreById[row.candidate.canonicalId] = row.totalScore;
    optimizerEvents.push({
      feasibleStateIds: feasible.map((row) => row.candidate.canonicalId),
      localScoreById,
      phraseBoundaryAfter: item.event.phraseBoundaryAfter === true,
      silence: item.silence,
    });
    return evaluated;
  });

  const allowNone = options?.allowNone !== false;
  const homeExplicit = Boolean(passage.home?.archetypeId && passage.home.referenceNote);
  const finalHomeBonusEnabled = homeExplicit && (passage.purpose === 'lyrical_answer' || passage.purpose === 'restraint' || passage.colourTension === 'home');
  if (!allowNone && optimizerEvents.some((event) => !event.silence && event.feasibleStateIds.length === 0)) {
    return emptyPath({
      kind: 'analysis',
      disposition: 'NO_FEASIBLE_PATH',
      explanation: 'An event has no feasible collection and NONE is turned off.',
      configVersion,
      sourceEventCount: passage.events.length,
      diagnostics,
    });
  }

  const optimized = optimizePentatonicPath({
    states,
    events: optimizerEvents,
    config,
    allowNone,
    previousStateId: currentCandidate?.canonicalId ?? null,
    previousPitchSet: currentCandidate?.canonicalPitchSet ?? null,
    homeExplicit,
    finalHomeBonusEnabled,
    sourceLabels: passage.events.map((event) => event.sourceLabel),
    eventIds: passage.events.map((event) => event.id),
  });
  if (!optimized.best) {
    return emptyPath({
      kind: 'analysis',
      disposition: 'NO_FEASIBLE_PATH',
      explanation: 'No path could be built.',
      configVersion,
      sourceEventCount: passage.events.length,
      diagnostics,
    });
  }

  const decisions: PentatonicPathEventDecision[] = optimized.best.path.map((stateIndex, index) => {
    const state = stateIndex >= 0 && stateIndex < states.length ? states[stateIndex]! : null;
    const previousState =
      index === 0
        ? currentCandidate
          ? states.find((item) => item.id === currentCandidate.canonicalId) ?? null
          : null
        : optimized.best!.path[index - 1]! >= states.length
          ? null
          : states[optimized.best!.path[index - 1]!] ?? null;
    const silence = prepared[index]!.silence;
    const hasPrevious = index > 0 || previousState !== null;
    const changed = !silence && hasPrevious && (previousState?.id ?? PENTATONIC_PATH_NONE) !== (state?.id ?? PENTATONIC_PATH_NONE);
    const liquid = liquidChangeParts({
      changed,
      previous: previousState?.pitchSet ?? null,
      next: state?.pitchSet ?? null,
      phraseBoundary: index > 0 && passage.events[index - 1]!.phraseBoundaryAfter === true,
      config,
    });
    const localScore = state ? optimizerEvents[index]!.localScoreById[state.id] ?? null : null;
    const detail = transitionDetail(previousState?.pitchSet ?? null, state?.pitchSet ?? null, spellings);
    const shared = detail?.retainedPitchClasses ?? [];
    const flag = silence ? 'retained' : index === 0 && !currentCandidate ? 'started' : changed ? 'changed' : 'retained';
    const name = state?.name ?? 'NONE';
    const explanation = silence
      ? `Silence. ${previousState?.name ?? name} continues. No new resource.`
      : flag === 'changed'
        ? `Changed to ${name}. Local heuristic ${localScore ?? 'none'}. Retained pitch classes ${shared.join(' ') || 'none'}. Removed ${detail?.removedPitchClasses.join(' ') || 'none'}. Introduced ${detail?.introducedPitchClasses.join(' ') || 'none'}.`
        : flag === 'started'
          ? `Started on ${name}. Local heuristic ${localScore ?? 'none'}.`
          : `Retained ${name}. Local heuristic ${localScore ?? 'none'}.`;
    return {
      eventId: passage.events[index]!.id,
      sourceLabel: passage.events[index]!.sourceLabel,
      chosenId: state?.id ?? PENTATONIC_PATH_NONE,
      chosenName: name,
      archetypeId: state?.archetypeId ?? null,
      referenceNote: state?.referenceNote ?? null,
      canonicalPitchSet: state?.pitchSet ?? null,
      canonicalId: state?.id ?? null,
      displaySpelling: state?.displaySpelling ?? [],
      homeRelationshipId: state?.homeRelationshipId ?? null,
      homeRelationshipLabel: state?.homeRelationshipLabel ?? null,
      localScore,
      localMisfit: silence ? 0 : state ? quantizePathCost(1 - (localScore ?? 0)) : config.noneBaselineCost,
      transitionCost: liquid.net,
      sharedPitchClasses: shared,
      sharedToneContinuity: liquid.continuity,
      changeFlag: flag === 'started' ? 'started' : changed ? 'changed' : 'retained',
      explanation,
      localBestId: localBest[index]!.id,
      localBestName: localBest[index]!.name,
      localBestScore: localBest[index]!.score,
      pitchClassTransition: detail,
    };
  });

  const summary = summarizeOptimizedPath(
    optimized.best,
    states,
    passage.events.map((event) => event.sourceLabel),
    passage.events.map((event) => event.id),
    decisions.map((decision) => decision.localScore)
  );
  const staticState = optimized.staticBest
    ? optimized.staticBest.stateIndex >= states.length
      ? null
      : states[optimized.staticBest.stateIndex] ?? null
    : null;
  const alternatives = optimized.alternatives.map((hyp) =>
    summarizeOptimizedPath(
      hyp,
      states,
      passage.events.map((event) => event.sourceLabel),
      passage.events.map((event) => event.id),
      hyp.path.map((stateIndex, index) => {
        const state = stateIndex < states.length ? states[stateIndex] : null;
        return state ? optimizerEvents[index]!.localScoreById[state.id] ?? null : null;
      })
    )
  );

  return emptyPath({
    kind: 'analysis',
    disposition: 'PATH',
    configVersion,
    sourceEventCount: passage.events.length,
    events: decisions,
    segments: summary.segments,
    switchCount: summary.switchCount,
    distinctResources: summary.distinctResources,
    noneEventCount: summary.noneEventCount,
    noneSegmentCount: summary.noneSegmentCount,
    totalPathCost: summary.totalCost,
    costBreakdown: summary.costBreakdown,
    bestStaticPathCost: optimized.staticBest?.cost ?? null,
    bestStaticStateId: staticState?.id ?? (optimized.staticBest ? PENTATONIC_PATH_NONE : null),
    bestStaticStateName: staticState?.name ?? (optimized.staticBest ? 'NONE' : null),
    alternatives,
    diagnostics,
    explanation: summary.segments
      .map((segment) => {
        const span = segment.firstSourceLabel === segment.lastSourceLabel ? segment.firstSourceLabel : `${segment.firstSourceLabel}–${segment.lastSourceLabel}`;
        const relation = segment.homeRelationshipLabel ? ` ${segment.homeRelationshipLabel}` : '';
        return `${span}  ${segment.chosenName}${relation}`;
      })
      .join('\n'),
  });
}

export function passageFromMusicContext(
  context: MusicContext,
  sourceLabels: readonly string[],
  partial?: Omit<PentatonicPassage, 'events'>
): { ok: true; passage: PentatonicPassage } | { ok: false; errors: string[] } {
  const bars = context.harmony?.bars;
  if (!bars) return { ok: false, errors: ['MusicContext.harmony.bars is missing.'] };
  if (sourceLabels.length !== bars.length) {
    return { ok: false, errors: ['Source labels must be supplied one per harmony bar. Labels are not invented.'] };
  }
  const events: PentatonicPassageEvent[] = bars.map((bar, index) => ({
    id: `context-${index + 1}`,
    sourceLabel: sourceLabels[index]!,
    chordSymbol: bar,
  }));
  return {
    ok: true,
    passage: {
      tonalCentre: partial?.tonalCentre ?? { root: context.key.root, mode: context.key.mode },
      ...partial,
      events,
    },
  };
}

export function formatPathComparison(result: PentatonicPathResult): string {
  const local = result.events
    .map((event) => `${event.sourceLabel}\t${event.localBestName ?? 'NONE'}\t${event.localBestScore ?? ''}`)
    .join('\n');
  const path = result.events.map((event) => `${event.sourceLabel}\t${event.chosenName}\t${event.homeRelationshipLabel ?? ''}`).join('\n');
  const breakdown = result.costBreakdown ? JSON.stringify(result.costBreakdown) : '';
  return `LOCAL BEST\n${local}\nOPTIMIZED PATH\n${path}\nSEGMENTS\n${result.explanation}\nCOST ${result.totalPathCost}\nSTATIC ${result.bestStaticPathCost} ${result.bestStaticStateName ?? ''}\n${breakdown}`;
}
