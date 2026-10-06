/**
 * Whole-song pentatonic map.
 * MusicXML adapter → existing Dev 2 path engine. No new notes. No retune.
 */

import { chromaticFriction, type ChromaticFrictionRegion } from './chromaticFriction';
import { inferCentreAndHome, type CentreHomeIdentity } from './centreIdentity';
import { DEFAULT_PENTATONIC_SCORING } from './evaluate';
import { reportPentatonicFields, intervalLabelFor, type PentatonicField } from './fieldFamily';
import { inferPentatonicHome, type HomeCandidate } from './inferHome';
import { importPentatonicScoreFromMusicXml, PENTATONIC_SCORE_ORDER_POLICY, type PentatonicScoreEvent, type PentatonicScoreImport } from './musicXmlScore';
import { mod12, parseNoteToken, spellingForPc, type ParsedNote } from './pitch';
import { recommendPentatonicPath } from './recommendPath';
import type { PentatonicPassage, PentatonicPassageEvent, PentatonicPathEventDecision, PentatonicPathResult } from './pathTypes';

const BORDERLINE_WINDOW = 0.08;

export interface PentatonicScoreRegion {
  firstSourceLabel: string;
  lastSourceLabel: string;
  measureRangeLabel: string;
  collectionName: string;
  notes: readonly string[];
  pitchClasses: readonly number[] | null;
  homeRelationshipLabel: string | null;
  meanLocalFit: number | null;
  commonTones: readonly string[];
  retainedPitchClasses: readonly string[];
  removedPitchClasses: readonly string[];
  introducedPitchClasses: readonly string[];
  pitchClassDisplacement: readonly { from: string; to: string; semitones: number }[];
  boundaryKind: 'opening' | 'source' | 'path';
  boundaryReason: string;
  explanation: string;
  /** Report only. Signed semitone count from the centre to this collection's root. */
  geometricRelation: string | null;
}

export interface PentatonicNoneObservation {
  sourceLabel: string;
  chosenName: string;
  localScore: number | null;
  localBestName: string | null;
  localBestScore: number | null;
  flag: 'none-won' | 'borderline-pentatonic';
  note: string;
}

export interface PentatonicInferredBoundary {
  sourceLabel: string;
  reason: string;
}

export interface PentatonicScoreAnalysis {
  song: string;
  sourceFile: string;
  sourceSha256: string;
  profile: 'default' | 'wwh-duo-1.1';
  orderPolicy: typeof PENTATONIC_SCORE_ORDER_POLICY;
  homeReading: string;
  regions: readonly PentatonicScoreRegion[];
  inferredBoundaries: readonly PentatonicInferredBoundary[];
  noneObservations: readonly PentatonicNoneObservation[];
  summary: {
    totalRegions: number;
    pentatonicRegions: number;
    noneRegions: number;
    collectionChanges: number;
    distinctCollections: number;
    noneEventCount: number;
    eventCount: number;
    noneEventProportion: number;
  };
  timingsMs: { parse: number; extract: number; boundary: number; path: number; total: number };
  diagnostics: readonly string[];
  warnings: readonly string[];
  path: PentatonicPathResult;
  score: PentatonicScoreImport;
  homeEvidence: readonly string[];
  homeCandidates: readonly HomeCandidate[];
  identity: CentreHomeIdentity;
  fields: readonly PentatonicField[];
  friction: readonly ChromaticFrictionRegion[];
  lowFitRegions: readonly { measureRangeLabel: string; meanLocalFit: number; lowestLocalFit: number; lowestSourceLabel: string }[];
  nearIdenticalSwitches: readonly { measureRangeLabel: string; sharedCount: number; previous: string; next: string }[];
}

export interface AnalyzePentatonicScoreOptions {
  profile?: 'default' | 'wwh-duo-1.1' | 'wwh-duo-1.0';
  sourceFile?: string;
  sourceSha256?: string;
}

function openingPassage(score: PentatonicScoreImport, identity: CentreHomeIdentity, profile: 'default' | 'wwh-duo-1.1' | 'wwh-duo-1.0'): PentatonicPassage {
  const events: PentatonicPassageEvent[] = score.events.map((event, index) => {
    const next = score.events[index + 1];
    const row: PentatonicPassageEvent = {
      id: event.id,
      sourceLabel: event.sourceLabel,
      ...(event.chordSymbol ? { chordSymbol: event.chordSymbol } : {}),
      ...(event.melodyNotes ? { melodyNotes: event.melodyNotes } : {}),
      ...(event.bassNotes ? { bassNotes: event.bassNotes } : {}),
      ...(event.heldNotes ? { heldNotes: event.heldNotes } : {}),
      ...(event.melodyRest ? { melodyRest: true } : {}),
      ...(event.bassRest ? { bassRest: true } : {}),
      ...(event.durationBeats !== undefined ? { durationBeats: event.durationBeats } : {}),
      ...(event.soundingAttacks.length > 0 ? { soundingAttacks: event.soundingAttacks } : {}),
      ...(next?.sourceBoundary ? { phraseBoundaryAfter: true } : {}),
    };
    return row;
  });
  if (identity.centreStatus !== 'CENTRE' || !identity.centre) {
    return {
      events,
      depth: 'chromatic',
      evidenceProfile: profile,
    };
  }
  const mode = identity.home?.archetypeId === 'minor_pentatonic' ? 'minor' : 'major';
  return {
    events,
    tonalCentre: { root: identity.centre.spelling, mode },
    ...(identity.home
      ? { home: { archetypeId: identity.home.archetypeId, referenceNote: identity.home.referenceNote } }
      : {}),
    ...(identity.colourScoring === 'on' ? { purpose: 'colour' as const } : {}),
    depth: profile === 'default' ? 'near' : 'chromatic',
    evidenceProfile: profile,
  };
}

function inferredBoundaries(events: readonly PentatonicScoreEvent[]): PentatonicInferredBoundary[] {
  const out: PentatonicInferredBoundary[] = [];
  const melodyKey = new Map<string, string>();
  for (const event of events) {
    if (event.melodyRest && event.bassRest) {
      out.push({
        sourceLabel: event.sourceLabel,
        reason: 'INFERRED: melody and bass both rest. Silence continues the previous path state. It was not promoted to a path phrase boundary.',
      });
    }
    const melody = (event.melodyNotes ?? []).join(' ');
    if (!melody) continue;
    const earlier = melodyKey.get(melody);
    if (earlier && event.orderIndex - Number(earlier.split(':')[0]) >= 8) {
      out.push({
        sourceLabel: event.sourceLabel,
        reason: `INFERRED: melody spelling returns the spelling first heard at m. ${earlier.split(':')[1]}. Heuristic only. Not a path phrase boundary.`,
      });
    } else if (!earlier) {
      melodyKey.set(melody, `${event.orderIndex}:${event.sourceLabel}`);
    }
  }
  return out;
}

function rangeLabel(first: string, last: string): string {
  return first === last ? `mm. ${first}` : `mm. ${first}–${last}`;
}

function spellList(pcs: readonly number[], notes: readonly string[]): string[] {
  const parsed = notes.map((note) => parseNoteToken(note)).filter((note): note is ParsedNote => note !== null);
  return pcs.map((pc) => spellingForPc(pc, parsed));
}

function regionsFrom(score: PentatonicScoreImport, path: PentatonicPathResult): PentatonicScoreRegion[] {
  const byId = new Map(path.events.map((event) => [event.eventId, event]));
  const scoreById = new Map(score.events.map((event) => [event.id, event]));
  return path.segments.map((segment) => {
    const decision = byId.get(segment.eventIds[0] ?? '');
    const scoreEvent = scoreById.get(segment.eventIds[0] ?? '');
    const transition = decision?.pitchClassTransition;
    const sharedPcs = segment.sharedPitchClassesWithPrevious.map((pc) => Number(pc)).filter((pc) => Number.isFinite(pc));
    const commonTones = decision?.sharedPitchClasses.length
      ? [...decision.sharedPitchClasses]
      : spellList(sharedPcs, segment.displaySpelling);
    let boundaryKind: PentatonicScoreRegion['boundaryKind'] = 'path';
    let boundaryReason = 'No source boundary. The path changed collection because local fit paid the continuity cost. A chord change alone was not treated as a phrase boundary.';
    if (segment.eventIds[0] === score.events[0]?.id) {
      boundaryKind = 'opening';
      boundaryReason = 'Opening of the written score.';
    } else if (scoreEvent?.sourceBoundary) {
      boundaryKind = 'source';
      boundaryReason = `SOURCE BOUNDARY: ${scoreEvent.sourceBoundaryReasons.join('; ')}.`;
    }
    const explanation = decision?.explanation ?? segment.reason;
    return {
      firstSourceLabel: segment.firstSourceLabel,
      lastSourceLabel: segment.lastSourceLabel,
      measureRangeLabel: rangeLabel(segment.firstSourceLabel, segment.lastSourceLabel),
      collectionName: segment.chosenName,
      notes: segment.displaySpelling,
      pitchClasses: segment.canonicalPitchSet,
      homeRelationshipLabel: segment.homeRelationshipLabel,
      meanLocalFit: segment.meanLocalFit,
      commonTones,
      retainedPitchClasses: transition?.retainedPitchClasses ?? [],
      removedPitchClasses: transition?.removedPitchClasses ?? [],
      introducedPitchClasses: transition?.introducedPitchClasses ?? [],
      pitchClassDisplacement: transition?.nearestPitchClassDisplacement ?? [],
      boundaryKind,
      boundaryReason,
      explanation,
      geometricRelation: null,
    };
  });
}

function noneObservations(events: readonly PentatonicPathEventDecision[]): PentatonicNoneObservation[] {
  const floor = DEFAULT_PENTATONIC_SCORING.minimumSuitability;
  const out: PentatonicNoneObservation[] = [];
  for (const event of events) {
    if (event.chosenName === 'NONE') {
      out.push({
        sourceLabel: event.sourceLabel,
        chosenName: event.chosenName,
        localScore: event.localScore,
        localBestName: event.localBestName,
        localBestScore: event.localBestScore,
        flag: 'none-won',
        note: 'NONE won this event. Dev 2 NONE cost was not changed.',
      });
      continue;
    }
    if (event.localScore !== null && event.localScore < floor + BORDERLINE_WINDOW) {
      out.push({
        sourceLabel: event.sourceLabel,
        chosenName: event.chosenName,
        localScore: event.localScore,
        localBestName: event.localBestName,
        localBestScore: event.localBestScore,
        flag: 'borderline-pentatonic',
        note: `Pentatonic local score ${event.localScore} is within ${BORDERLINE_WINDOW} of the suitability floor ${floor}. Observation only.`,
      });
    }
  }
  return out;
}

function lowFit(
  regions: readonly PentatonicScoreRegion[],
  path: PentatonicPathResult
): PentatonicScoreAnalysis['lowFitRegions'] {
  const floor = DEFAULT_PENTATONIC_SCORING.minimumSuitability;
  const out: PentatonicScoreAnalysis['lowFitRegions'][number][] = [];
  for (const region of regions) {
    if (region.meanLocalFit === null || region.meanLocalFit >= floor) continue;
    const start = path.events.findIndex((item) => item.sourceLabel === region.firstSourceLabel);
    const end = path.events.findIndex((item) => item.sourceLabel === region.lastSourceLabel);
    const events = start < 0 || end < start ? [] : path.events.slice(start, end + 1);
    let lowest = events[0];
    for (const event of events) {
      if ((event.localScore ?? 1) < (lowest?.localScore ?? 1)) lowest = event;
    }
    out.push({
      measureRangeLabel: region.measureRangeLabel,
      meanLocalFit: region.meanLocalFit,
      lowestLocalFit: lowest?.localScore ?? region.meanLocalFit,
      lowestSourceLabel: lowest?.sourceLabel ?? region.firstSourceLabel,
    });
  }
  return out;
}

function nearSwitches(regions: readonly PentatonicScoreRegion[]): PentatonicScoreAnalysis['nearIdenticalSwitches'] {
  const out: PentatonicScoreAnalysis['nearIdenticalSwitches'][number][] = [];
  for (let index = 1; index < regions.length; index++) {
    const region = regions[index]!;
    const previous = regions[index - 1]!;
    if (region.commonTones.length < 4) continue;
    if (region.collectionName === 'NONE' || previous.collectionName === 'NONE') continue;
    out.push({
      measureRangeLabel: region.measureRangeLabel,
      sharedCount: region.commonTones.length,
      previous: previous.collectionName,
      next: region.collectionName,
    });
  }
  return out;
}

export function analyzePentatonicScore(xml: string, options?: AnalyzePentatonicScoreOptions): PentatonicScoreAnalysis {
  const totalStart = performance.now();
  const profile = options?.profile === 'wwh-duo-1.0' ? 'wwh-duo-1.1' : options?.profile ?? 'wwh-duo-1.1';
  const score = importPentatonicScoreFromMusicXml(xml);
  const identity = inferCentreAndHome(score);
  const previous = inferPentatonicHome(score, profile);
  const diagnostics = [...score.diagnostics, ...identity.evidence];
  diagnostics.push(`Dev 3.2 reading kept for comparison: ${previous.reading}`);
  for (const candidate of previous.candidates) {
    diagnostics.push(`Dev 3.2 ${candidate.source} ${candidate.centre} ${candidate.mode} membership ${candidate.membership}.`);
  }
  const warnings = [...score.warnings];
  const passage = openingPassage(score, identity, profile);
  const absentCentre = identity.centreStatus !== 'CENTRE' || !identity.centre;
  if (absentCentre) {
    diagnostics.push('Path runs without a centre. No HOME was invented. Relationship labels and colour scoring stay off. This is not NONE.');
  }
  if (!score.events.some((event) => event.chordSymbol)) {
    diagnostics.push('Harmony evidence absent. Harmony component omitted. Missing harmony is not scored as zero.');
  }
  diagnostics.push(identity.reading);
  if (!absentCentre && identity.colourScoring === 'omitted') {
    diagnostics.push('Path tonal-centre mode is not a HOME mode. Colour scoring is omitted.');
  }
  diagnostics.push('Dev 2.2: genuine collection changes cost at least half the base change cost. NONE cost is unchanged. Chromatic friction is scored with the same measure as this report.');
  diagnostics.push('Neutral bars continue the current collection when they sound none of the pitch classes that distinguish it from the alternative.');
  const boundaryStart = performance.now();
  const inferredBounds = inferredBoundaries(score.events);
  const boundaryMs = performance.now() - boundaryStart;
  const pathStart = performance.now();
  const path = recommendPentatonicPath(passage, {
    continueWithoutDistinctPcs: true,
    ...(absentCentre ? { allowAbsentTonalCentre: true } : {}),
  });
  const pathMs = performance.now() - pathStart;
  const regions = (path.kind === 'analysis' ? regionsFrom(score, path) : []).map((region) => {
    const decision = path.events.find((event) => event.sourceLabel === region.firstSourceLabel);
    const referencePc = decision?.referenceNote ? parseNoteToken(decision.referenceNote)?.pc ?? null : null;
    const geometricRelation =
      identity.centreStatus === 'CENTRE' && identity.centre && referencePc !== null && region.collectionName !== 'NONE'
        ? `centre ${identity.centre.spelling} · field ${region.collectionName} · root interval +${mod12(referencePc - identity.centre.pc)}`
        : null;
    if (absentCentre) {
      return { ...region, homeRelationshipLabel: null, geometricRelation };
    }
    if (identity.colourScoring !== 'omitted' || !identity.centre) return { ...region, geometricRelation };
    return {
      ...region,
      homeRelationshipLabel: intervalLabelFor(identity.centre.pc, referencePc, decision?.archetypeId ?? null),
      geometricRelation,
    };
  });
  const fields = reportPentatonicFields(
    regions,
    score.events,
    identity.centreStatus === 'CENTRE' ? identity.centre?.pc ?? null : null
  );
  const pentatonicRegions = regions.filter((region) => region.collectionName !== 'NONE').length;
  const noneRegions = regions.filter((region) => region.collectionName === 'NONE').length;
  const distinct = new Set(regions.filter((region) => region.collectionName !== 'NONE').map((region) => region.collectionName));
  return {
    song: score.title || options?.sourceFile || 'Untitled',
    sourceFile: options?.sourceFile ?? '',
    sourceSha256: options?.sourceSha256 ?? '',
    profile,
    orderPolicy: PENTATONIC_SCORE_ORDER_POLICY,
    homeReading: identity.reading,
    regions,
    inferredBoundaries: inferredBounds,
    homeEvidence: identity.evidence,
    homeCandidates: previous.candidates,
    identity,
    fields,
    friction: chromaticFriction(score, path),
    lowFitRegions: lowFit(regions, path),
    nearIdenticalSwitches: nearSwitches(regions),
    noneObservations: noneObservations(path.events),
    summary: {
      totalRegions: regions.length,
      pentatonicRegions,
      noneRegions,
      collectionChanges: path.switchCount,
      distinctCollections: distinct.size,
      noneEventCount: path.noneEventCount,
      eventCount: path.events.length,
      noneEventProportion: path.events.length === 0 ? 0 : path.noneEventCount / path.events.length,
    },
    timingsMs: {
      parse: score.timingsMs.parse,
      extract: score.timingsMs.extract,
      boundary: boundaryMs,
      path: pathMs,
      total: performance.now() - totalStart,
    },
    diagnostics,
    warnings,
    path,
    score,
  };
}

export function formatPentatonicScoreMap(analysis: PentatonicScoreAnalysis): string {
  const lines = [
    `SONG ${analysis.song}`,
    `SOURCE FILE ${analysis.sourceFile}`,
    `SOURCE SHA-256 ${analysis.sourceSha256}`,
    `PROFILE ${analysis.profile}`,
    `ORDER POLICY ${analysis.orderPolicy}`,
    `HOME ${analysis.homeReading}`,
    `FIELDS ${analysis.fields.length}; raw switches ${analysis.summary.collectionChanges}`,
    ...analysis.fields.map((field) => `${field.measureRangeLabel} — ${field.name}; inflections ${field.inflectionLabels.join(', ')}`),
    'DIAGNOSTICS',
    ...analysis.diagnostics.map((line) => `- ${line}`),
    ...analysis.warnings.map((line) => `- warning: ${line}`),
    '',
  ];
  for (const region of analysis.regions) {
    const colour = region.homeRelationshipLabel ? ` ${region.homeRelationshipLabel}` : '';
    lines.push(`${region.measureRangeLabel}`);
    lines.push(`${region.collectionName}${colour}`);
    lines.push(region.notes.length > 0 ? region.notes.join(' ') : 'no pitch classes');
    lines.push(`mean local fit ${region.meanLocalFit ?? 'none'}`);
    lines.push(`common tones ${region.commonTones.join(' ') || 'none'}`);
    lines.push(
      `retained ${region.retainedPitchClasses.join(' ') || 'none'}; removed ${region.removedPitchClasses.join(' ') || 'none'}; introduced ${region.introducedPitchClasses.join(' ') || 'none'}`
    );
    if (region.pitchClassDisplacement.length > 0) {
      lines.push(
        `pitch-class displacement ${region.pitchClassDisplacement.map((item) => `${item.from}→${item.to} (${item.semitones})`).join(', ')}`
      );
    }
    lines.push(region.boundaryReason);
    lines.push(region.explanation);
    if (region.geometricRelation) lines.push(region.geometricRelation);
    lines.push('');
  }
  const summary = analysis.summary;
  lines.push(
    `regions ${summary.totalRegions}; pentatonic ${summary.pentatonicRegions}; NONE ${summary.noneRegions}; changes ${summary.collectionChanges}; distinct ${summary.distinctCollections}; NONE events ${summary.noneEventCount}/${summary.eventCount} (${summary.noneEventProportion.toFixed(3)})`
  );
  lines.push(
    `parse ${analysis.timingsMs.parse.toFixed(1)} ms; extract ${analysis.timingsMs.extract.toFixed(1)} ms; boundary ${analysis.timingsMs.boundary.toFixed(1)} ms; path ${analysis.timingsMs.path.toFixed(1)} ms; total ${analysis.timingsMs.total.toFixed(1)} ms`
  );
  if (analysis.nearIdenticalSwitches.length > 0) {
    lines.push('NEAR-IDENTICAL SWITCHES (>=4 shared pitch classes)');
    for (const item of analysis.nearIdenticalSwitches) {
      lines.push(`- ${item.measureRangeLabel} ${item.previous} -> ${item.next} shared ${item.sharedCount}`);
    }
  }
  if (analysis.lowFitRegions.length > 0) {
    lines.push('MEAN LOCAL FIT BELOW 0.62');
    for (const item of analysis.lowFitRegions) {
      lines.push(`- ${item.measureRangeLabel} mean ${item.meanLocalFit} lowest ${item.lowestLocalFit} at ${item.lowestSourceLabel}`);
    }
  }
  if (analysis.friction.length > 0) {
    lines.push('CHROMATIC FRICTION (scored colour/tension cost, same measure as the evaluator)');
    for (const region of analysis.friction) {
      if (region.hits.length === 0) continue;
      lines.push(`- ${region.measureRangeLabel} ${region.collectionName} friction beats ${region.totalDurationBeats}`);
      for (const hit of region.hits) {
        lines.push(
          `  m.${hit.sourceLabel} ${hit.role} ${hit.spelling} nearest ${hit.nearest.join(' ')} beats ${hit.durationBeats}`
        );
      }
    }
  }
  if (analysis.noneObservations.length === 0) {
    lines.push('NONE observations: none won, and no chosen pentatonic sat inside the borderline window.');
  } else {
    lines.push('NONE observations');
    for (const item of analysis.noneObservations) {
      lines.push(`- m. ${item.sourceLabel} ${item.flag} chosen ${item.chosenName} local ${item.localScore ?? 'none'} best ${item.localBestName ?? 'none'} ${item.localBestScore ?? ''}`);
    }
  }
  return lines.join('\n');
}
