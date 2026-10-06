/**
 * Public pentatonic recommendation API.
 * `recommendPentatonics(context, options)` is headless and does not require React.
 */

import type { MusicContext } from '../music-context/musicContextTypes';
import { generatePentatonicCandidates } from './candidates';
import { pentatonicHarmonyChecksum } from './checksum';
import { readChordEvidence } from './chordEvidence';
import {
  compareEvaluated,
  configurationIdFor,
  DEFAULT_PENTATONIC_SCORING,
  evaluateCandidate,
  PENTATONIC_EVALUATOR_VERSION,
  quantizeScore,
  type EvaluationEvidence,
} from './evaluate';
import { parseNoteList, parseNoteToken, sharpName, uniquePitchClasses, type ParsedNote } from './pitch';
import { PENTATONIC_RELATIONSHIP_SCORING_VERSION } from './relationshipScoring';
import { PENTATONIC_REGISTRY_VERSION } from './registry';
import type {
  EvidencePresence,
  PentatonicCollectionSpec,
  PentatonicDiagnostics,
  PentatonicEngineResult,
  PentatonicRecommendOptions,
  PentatonicRegionInput,
  PentatonicScoringConfig,
  RetentionReport,
} from './types';

export const PENTATONIC_TEMPORAL_LIMIT =
  'Dev 1 scores one supplied region. Ordered harmony bars are checked for agreement and are not merged into a pitch-class union. Melody order is recorded and is not weighted by duration, metre, or voice-leading.';

export const RETENTION_COMPARISON_RULE =
  'Retain the current collection only when it is feasible and its quantized score is at least the configured minimum suitability, and no other feasible candidate improves on that score by more than the retention margin. An improvement equal to the margin retains the current collection. A current collection below minimum suitability cannot be retained.';

/**
 * OPTION B. A five-note current collection that is not a registry transposition is allowed.
 * It stays labelled `custom_non_registry`. It is not given a registry archetype id.
 * Retention uses the same minimum-suitability rule as a registry current collection.
 */
export const CURRENT_NON_REGISTRY_POLICY =
  'custom_non_registry: a current pitch-class set that matches no registry transposition is kept only as a labelled custom current collection for retention comparison. It is not treated as a registry resource. Scores below minimum suitability cannot retain it.';

const IGNORED_CONTEXT_FIELDS = [
  'seed',
  'presetId',
  'meter',
  'bpm',
  'totalBars',
  'motif.intervalPattern',
  'motif.rhythmPattern',
  'motif.contourPattern',
  'modulation',
  'tuning',
  'receipts',
] as const;

function emptyResult(partial: Partial<PentatonicEngineResult> & Pick<PentatonicEngineResult, 'kind'>): PentatonicEngineResult {
  return {
    kind: partial.kind,
    validationErrors: partial.validationErrors ?? [],
    disposition: partial.disposition ?? null,
    explanation: partial.explanation ?? '',
    recommendations: partial.recommendations ?? [],
    alternatives: partial.alternatives ?? [],
    retained: partial.retained ?? null,
    retention: partial.retention ?? null,
    limitations: partial.limitations ?? [PENTATONIC_TEMPORAL_LIMIT],
    constraintFailures: partial.constraintFailures ?? [],
    diagnostics: partial.diagnostics ?? null,
    registryVersion: PENTATONIC_REGISTRY_VERSION,
    evaluatorVersion: PENTATONIC_EVALUATOR_VERSION,
    relationshipScoringVersion: PENTATONIC_RELATIONSHIP_SCORING_VERSION,
    configurationId: partial.configurationId ?? configurationIdFor(DEFAULT_PENTATONIC_SCORING),
  };
}

function resolveScoring(options: PentatonicRecommendOptions | undefined): PentatonicScoringConfig {
  return {
    minimumSuitability: options?.scoring?.minimumSuitability ?? DEFAULT_PENTATONIC_SCORING.minimumSuitability,
    retentionMargin: options?.scoring?.retentionMargin ?? DEFAULT_PENTATONIC_SCORING.retentionMargin,
    weights: { ...DEFAULT_PENTATONIC_SCORING.weights, ...options?.scoring?.weights },
  };
}

interface NoteField {
  presence: EvidencePresence;
  notes: ParsedNote[];
  pitchClasses: number[];
}

function readNoteField(value: readonly string[] | undefined, label: string, errors: string[]): NoteField {
  if (value === undefined) return { presence: 'missing', notes: [], pitchClasses: [] };
  if (value.length === 0) return { presence: 'empty', notes: [], pitchClasses: [] };
  const parsed = parseNoteList(value);
  if (!parsed.ok) {
    errors.push(`${label}: ${parsed.error}`);
    return { presence: 'malformed', notes: [], pitchClasses: [] };
  }
  const pitchClasses = uniquePitchClasses(parsed.notes);
  if (pitchClasses.length !== parsed.notes.length) errors.push(`${label} repeats a pitch class.`);
  return { presence: 'used', notes: parsed.notes, pitchClasses };
}

function motifMelody(context: MusicContext, tonalSpelling: string): NoteField {
  const pitches = context.motif?.seedPitches;
  if (!pitches || pitches.length === 0) return { presence: 'missing', notes: [], pitchClasses: [] };
  const notes = pitches.map((midi) => {
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    const spelling = sharpName(pc);
    const parsed = parseNoteToken(spelling);
    return parsed ?? { pc, spelling, letter: 'C' };
  });
  void tonalSpelling;
  return { presence: 'used', notes, pitchClasses: uniquePitchClasses(notes) };
}

export function recommendPentatonics(context: MusicContext, options?: PentatonicRecommendOptions): PentatonicEngineResult {
  const scoring = resolveScoring(options);
  const configurationId = configurationIdFor(scoring);
  const errors: string[] = [];
  const limitations: string[] = [PENTATONIC_TEMPORAL_LIMIT];

  const bars = context.harmony?.bars;
  if (!bars) errors.push('MusicContext.harmony.bars is missing.');
  else if (pentatonicHarmonyChecksum(bars) !== context.harmony.checksum) {
    errors.push('MusicContext harmony checksum does not match the bars.');
  }

  const tonalRoot = options?.tonalCentreOverride?.root ?? context.key?.root;
  const tonalMode = options?.tonalCentreOverride?.mode ?? context.key?.mode;
  const tonal = tonalRoot ? parseNoteToken(tonalRoot) : null;
  if (!tonal) errors.push('Tonal centre is missing or malformed.');
  if (tonalMode !== 'major' && tonalMode !== 'minor') errors.push('Tonal centre mode must be major or minor.');

  const melodyField =
    options != null && Object.prototype.hasOwnProperty.call(options, 'melodyNotes')
      ? readNoteField(options.melodyNotes, 'Melody', errors)
      : motifMelody(context, tonal?.spelling ?? 'C');
  const bassField = readNoteField(options?.bassNotes, 'Bass', errors);
  const heldField = readNoteField(options?.heldNotes, 'Held notes', errors);
  const targetField = readNoteField(options?.targetNotes, 'Target notes', errors);
  const protectedField = readNoteField(options?.protectedNotes, 'Protected notes', errors);
  const cautionField = readNoteField(options?.cautionNotes, 'Caution notes', errors);

  let harmonyPresence: EvidencePresence = 'missing';
  let harmonySymbol: string | null = null;
  let harmonyPcs: number[] = [];
  let slashBass: number | null = null;
  const harmonyBars = bars ?? [];
  if (harmonyBars.length === 0) harmonyPresence = 'empty';
  else {
    const distinct = [...new Set(harmonyBars.map((bar) => bar.trim()).filter((bar) => bar.length > 0))];
    if (distinct.length === 0) harmonyPresence = 'empty';
    else if (distinct.length > 1) {
      harmonyPresence = 'ambiguous';
      limitations.push('Harmony bars disagree. Their pitch classes were not combined.');
    } else {
      const chord = readChordEvidence(distinct[0]!);
      if (!chord.ok) errors.push(chord.error);
      else {
        harmonyPresence = 'used';
        harmonySymbol = chord.chord.symbol;
        harmonyPcs = [...chord.chord.harmonyPitchClasses];
        slashBass = chord.chord.slashBassPitchClass;
      }
    }
  }

  let bassPresence = bassField.presence;
  let bassPcs = bassField.pitchClasses;
  if (slashBass !== null) {
    if (bassField.presence === 'missing') {
      bassPresence = 'used';
      bassPcs = [slashBass];
      limitations.push('Slash bass was used as bass evidence because no bass notes were supplied.');
    } else if (bassField.presence === 'empty') {
      limitations.push('Slash bass was ignored because bass notes were explicitly empty.');
    } else {
      limitations.push('Slash bass was ignored because bass notes were supplied.');
    }
  }

  if (errors.length > 0 || !tonal || (tonalMode !== 'major' && tonalMode !== 'minor')) {
    return emptyResult({ kind: 'validation', validationErrors: errors, configurationId, limitations });
  }

  const home = options?.home ?? null;
  const current = options?.current ?? null;
  const depth = options?.depth ?? 'near';
  const built = generatePentatonicCandidates({
    depth,
    tonalCentrePc: tonal.pc,
    tonalCentreSpelling: tonal.spelling,
    home,
    current,
    pinned: options?.pinned ?? [],
  });
  if (!built.ok) {
    return emptyResult({ kind: 'validation', validationErrors: built.errors, configurationId, limitations });
  }

  const spellings: ParsedNote[] = [
    tonal,
    ...melodyField.notes,
    ...bassField.notes,
    ...heldField.notes,
    ...targetField.notes,
    ...protectedField.notes,
    ...cautionField.notes,
  ];

  const evidenceUsed =
    melodyField.presence === 'used' || bassPresence === 'used' || harmonyPresence === 'used' || heldField.presence === 'used';

  const currentCandidate = built.candidates.find((candidate) => candidate.isCurrent) ?? null;

  const diagnostics: PentatonicDiagnostics = {
    temporalLimit: PENTATONIC_TEMPORAL_LIMIT,
    evaluated: {
      tonalCentre: { root: tonal.spelling, mode: tonalMode, pitchClass: tonal.pc },
      home: home?.archetypeId && home.referenceNote ? homeSummary(home) : null,
      harmony: { presence: harmonyPresence, symbol: harmonySymbol, pitchClasses: harmonyPcs, barCount: harmonyBars.length },
      melody: {
        presence: melodyField.presence,
        pitchClasses: melodyField.pitchClasses,
        order: melodyField.notes.map((note) => note.spelling),
      },
      bass: { presence: bassPresence, pitchClasses: bassPcs },
      held: { presence: heldField.presence, pitchClasses: heldField.pitchClasses },
      target: { presence: targetField.presence, pitchClasses: targetField.pitchClasses },
      caution: { presence: cautionField.presence, pitchClasses: cautionField.pitchClasses },
      protected: { presence: protectedField.presence, pitchClasses: protectedField.pitchClasses },
    },
    ignoredMusicContextFields: [...IGNORED_CONTEXT_FIELDS],
    candidatePoolSize: built.candidates.length,
    evaluatedCandidateIds: built.candidates.map((candidate) => candidate.canonicalId),
    currentIncludedOutsideDepth: built.currentIncludedOutsideDepth,
    currentCollectionKind: currentCandidate?.collectionKind ?? null,
    fieldPrecedence:
      'Explicit pentatonic note lists override MusicContext motif seed pitches, including an explicit empty list. tonalCentreOverride replaces MusicContext.key for this call only. HOME is never copied from the tonal centre.',
  };

  if (!evidenceUsed) {
    return emptyResult({
      kind: 'analysis',
      disposition: 'INSUFFICIENT_CONTEXT',
      explanation:
        'Not enough musical evidence for a passage recommendation. A tonal centre or a HOME collection on its own does not describe the region. Add harmony, melody, bass, or held notes.',
      diagnostics,
      configurationId,
      limitations,
    });
  }

  if (built.candidates.length === 0) {
    return emptyResult({
      kind: 'validation',
      validationErrors: [
        'No candidates to evaluate. Set a HOME collection, a current collection, a pinned candidate, or a wider resource depth.',
      ],
      diagnostics,
      configurationId,
      limitations,
    });
  }

  const evidence: EvaluationEvidence = {
    melody: melodyField.pitchClasses,
    melodySpellings: spellings,
    bass: bassPcs,
    harmony: harmonyPcs,
    harmonySymbol,
    held: heldField.pitchClasses,
    target: targetField.pitchClasses,
    caution: cautionField.pitchClasses,
    protected: protectedField.pitchClasses,
    strictMelody: options?.strictMelodyMembership === true,
    purpose: options?.purpose ?? null,
    colourTension: options?.colourTension ?? null,
    currentPitchSet: currentCandidate?.canonicalPitchSet ?? null,
  };

  const evaluated = built.candidates.map((candidate) => evaluateCandidate(candidate, evidence, scoring));
  const failures = evaluated.filter((item) => !item.feasible);
  const feasible = evaluated.filter((item) => item.feasible).sort(compareEvaluated);
  const suitable = feasible.filter((item) => item.totalScore >= scoring.minimumSuitability);
  const constraintFailures = failures.map((item) => ({
    canonicalId: item.candidate.canonicalId,
    name: item.primary.transposedName,
    reasons: item.failureReasons,
  }));

  if (feasible.length === 0) {
    return emptyResult({
      kind: 'analysis',
      disposition: 'NO_FEASIBLE_CANDIDATE',
      explanation: 'The region has enough evidence, and every considered collection breaks a hard constraint.',
      constraintFailures,
      diagnostics,
      configurationId,
      limitations,
    });
  }

  const currentEval = feasible.find((item) => item.candidate.isCurrent) ?? null;
  const bestAlternative = feasible.find((item) => !item.candidate.isCurrent) ?? null;
  if (currentEval && currentEval.totalScore >= scoring.minimumSuitability) {
    const actualImprovement =
      bestAlternative === undefined || bestAlternative === null
        ? null
        : quantizeScore(bestAlternative.totalScore - currentEval.totalScore);
    const improves = actualImprovement !== null && actualImprovement > scoring.retentionMargin;
    const retention: RetentionReport = {
      currentScore: currentEval.totalScore,
      bestAlternativeScore: bestAlternative?.totalScore ?? null,
      requiredImprovementMargin: scoring.retentionMargin,
      actualImprovement,
      comparisonRule: RETENTION_COMPARISON_RULE,
    };
    if (!improves) {
      const alternatives = suitable
        .filter((item) => item.candidate.canonicalId !== currentEval.candidate.canonicalId)
        .slice(0, 3)
        .map((item) => item.recommendation);
      return emptyResult({
        kind: 'analysis',
        disposition: 'RETAIN_CURRENT',
        explanation: retainExplanation(retention),
        recommendations: [],
        alternatives,
        retained: currentEval.recommendation,
        retention,
        constraintFailures,
        diagnostics,
        configurationId,
        limitations,
      });
    }
  }

  if (suitable.length === 0) {
    const best = feasible[0]!;
    return emptyResult({
      kind: 'analysis',
      disposition: 'NO_PENTATONIC_INTERVENTION',
      explanation: `Feasible collections were scored. The best heuristic score is ${best.totalScore}, below the minimum suitability of ${scoring.minimumSuitability}. No pentatonic change is recommended.`,
      constraintFailures,
      diagnostics,
      configurationId,
      limitations,
    });
  }

  return emptyResult({
    kind: 'analysis',
    disposition: 'RECOMMEND',
    explanation: suitable[0]!.recommendation.explanation,
    recommendations: suitable.slice(0, 3).map((item) => item.recommendation),
    constraintFailures,
    diagnostics,
    configurationId,
    limitations,
  });
}

function retainExplanation(retention: RetentionReport): string {
  if (retention.bestAlternativeScore === null || retention.actualImprovement === null) {
    return `The current collection scores ${retention.currentScore} and no different feasible alternative was available.`;
  }
  return `The current collection scores ${retention.currentScore}. The best different feasible collection scores ${retention.bestAlternativeScore}, an improvement of ${retention.actualImprovement}. The retention margin is ${retention.requiredImprovementMargin}. The current collection stays.`;
}

function homeSummary(home: PentatonicCollectionSpec): PentatonicDiagnostics['evaluated']['home'] {
  const note = home.referenceNote ? parseNoteToken(home.referenceNote) : null;
  if (!home.archetypeId || !note) return null;
  return { archetypeId: home.archetypeId, referenceNote: note.spelling, pitchClass: note.pc };
}

export function buildPentatonicMusicContext(region: PentatonicRegionInput): MusicContext {
  const bars = [...(region.harmonyBars ?? [])];
  return {
    schemaVersion: '1.0',
    seed: 0,
    presetId: 'pentatonic_engine',
    key: { root: region.tonalCentre.root, mode: region.tonalCentre.mode },
    meter: { beats: 4, beatType: 4 },
    bpm: 120,
    totalBars: Math.max(bars.length, 1),
    harmony: {
      bars,
      checksum: pentatonicHarmonyChecksum(bars),
      source: 'user',
    },
    receipts: [],
  };
}

export function recommendPentatonicsFromRegion(region: PentatonicRegionInput): PentatonicEngineResult {
  const context = buildPentatonicMusicContext(region);
  const options: PentatonicRecommendOptions = {};
  if (region.home !== undefined) options.home = region.home;
  if (region.current !== undefined) options.current = region.current;
  if (region.melodyNotes !== undefined) options.melodyNotes = region.melodyNotes;
  if (region.bassNotes !== undefined) options.bassNotes = region.bassNotes;
  if (region.heldNotes !== undefined) options.heldNotes = region.heldNotes;
  if (region.targetNotes !== undefined) options.targetNotes = region.targetNotes;
  if (region.protectedNotes !== undefined) options.protectedNotes = region.protectedNotes;
  if (region.cautionNotes !== undefined) options.cautionNotes = region.cautionNotes;
  if (region.purpose !== undefined) options.purpose = region.purpose;
  if (region.colourTension !== undefined) options.colourTension = region.colourTension;
  if (region.depth !== undefined) options.depth = region.depth;
  if (region.strictMelodyMembership !== undefined) options.strictMelodyMembership = region.strictMelodyMembership;
  if (region.pinned !== undefined) options.pinned = region.pinned;
  if (region.scoring !== undefined) options.scoring = region.scoring;
  return recommendPentatonics(context, options);
}

export function lyricalAnswerExampleRegion(): PentatonicRegionInput {
  return {
    tonalCentre: { root: 'A', mode: 'minor' },
    harmonyBars: ['Am(add9)'],
    home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
    melodyNotes: ['E', 'G', 'A', 'C', 'B'],
    bassNotes: ['A'],
    purpose: 'lyrical_answer',
    depth: 'near',
  };
}
