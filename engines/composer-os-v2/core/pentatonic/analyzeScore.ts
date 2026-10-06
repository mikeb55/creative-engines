/**
 * Whole-song pentatonic map.
 * MusicXML adapter → existing Dev 2 path engine. No new notes. No retune.
 */

import { DEFAULT_PENTATONIC_SCORING } from './evaluate';
import { importPentatonicScoreFromMusicXml, PENTATONIC_SCORE_ORDER_POLICY, type PentatonicScoreEvent, type PentatonicScoreImport } from './musicXmlScore';
import { orbitAPassage } from './orbitPassages';
import { parseNoteToken, spellingForPc, type ParsedNote } from './pitch';
import { recommendPentatonicPath } from './recommendPath';
import type { PentatonicPassage, PentatonicPassageEvent, PentatonicPathEventDecision, PentatonicPathResult } from './pathTypes';
import { impossibleMetaphysicsObjectPassage, mirrorFramePassage } from './wwhValidationPassages';

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
  profile: 'default' | 'wwh-duo-1.0';
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
}

export interface AnalyzePentatonicScoreOptions {
  profile?: 'default' | 'wwh-duo-1.0';
  sourceFile?: string;
  sourceSha256?: string;
}

interface OpeningReading {
  tonalCentre: { root: string; mode: 'major' | 'minor' };
  home: { archetypeId: string; referenceNote: string };
  depth: 'near' | 'home_wheel' | 'chromatic';
  purpose: PentatonicPassage['purpose'];
  reading: string;
}

function knownOpening(title: string): OpeningReading | null {
  const key = title.trim().toLowerCase();
  if (key === 'orbit') {
    const frame = orbitAPassage();
    return {
      tonalCentre: frame.tonalCentre!,
      home: { archetypeId: frame.home!.archetypeId, referenceNote: frame.home!.referenceNote },
      depth: frame.depth ?? 'chromatic',
      purpose: frame.purpose,
      reading: 'Frozen Dev 2 Orbit opening: F minor, HOME F minor pentatonic. Not a search over centres.',
    };
  }
  if (key === 'impossible metaphysics') {
    const frame = impossibleMetaphysicsObjectPassage();
    return {
      tonalCentre: frame.tonalCentre!,
      home: { archetypeId: frame.home!.archetypeId, referenceNote: frame.home!.referenceNote },
      depth: frame.depth ?? 'chromatic',
      purpose: frame.purpose,
      reading: 'Frozen Dev 2 Impossible Metaphysics opening: A major, HOME A major pentatonic. Not a search over centres.',
    };
  }
  if (key === 'the mirror') {
    const frame = mirrorFramePassage();
    return {
      tonalCentre: frame.tonalCentre!,
      home: { archetypeId: frame.home!.archetypeId, referenceNote: frame.home!.referenceNote },
      depth: frame.depth ?? 'chromatic',
      purpose: frame.purpose,
      reading: 'Frozen Dev 2 Mirror opening: C minor, HOME C minor pentatonic. Not a search over centres.',
    };
  }
  return null;
}

const MAJOR_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Cb',
  [-6]: 'Gb',
  [-5]: 'Db',
  [-4]: 'Ab',
  [-3]: 'Eb',
  [-2]: 'Bb',
  [-1]: 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
};
const MINOR_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Ab',
  [-6]: 'Eb',
  [-5]: 'Bb',
  [-4]: 'F',
  [-3]: 'C',
  [-2]: 'G',
  [-1]: 'D',
  0: 'A',
  1: 'E',
  2: 'B',
  3: 'F#',
  4: 'C#',
  5: 'G#',
  6: 'D#',
  7: 'A#',
};

function openingFromKey(score: PentatonicScoreImport, profile: 'default' | 'wwh-duo-1.0'): OpeningReading | null {
  const match = score.diagnostics.find((line) => line.startsWith('First guitar key signature is fifths '));
  if (!match) return null;
  const fifths = parseInt(match.replace('First guitar key signature is fifths ', ''), 10);
  const minor = /\bminor\b/.test(match);
  if (!Number.isFinite(fifths)) return null;
  const root = (minor ? MINOR_BY_FIFTHS : MAJOR_BY_FIFTHS)[fifths];
  if (!root) return null;
  return {
    tonalCentre: { root, mode: minor ? 'minor' : 'major' },
    home: { archetypeId: minor ? 'minor_pentatonic' : 'major_pentatonic', referenceNote: root },
    depth: profile === 'wwh-duo-1.0' ? 'chromatic' : 'near',
    purpose: 'colour',
    reading: `Opening reading from the first key signature: ${root} ${minor ? 'minor' : 'major'}. Not a search over centres.`,
  };
}

function toPassage(score: PentatonicScoreImport, opening: OpeningReading, profile: 'default' | 'wwh-duo-1.0'): PentatonicPassage {
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
      ...(next?.sourceBoundary ? { phraseBoundaryAfter: true } : {}),
    };
    return row;
  });
  return {
    events,
    tonalCentre: opening.tonalCentre,
    home: opening.home,
    depth: opening.depth,
    purpose: opening.purpose,
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

export function analyzePentatonicScore(xml: string, options?: AnalyzePentatonicScoreOptions): PentatonicScoreAnalysis {
  const totalStart = performance.now();
  const profile = options?.profile ?? 'wwh-duo-1.0';
  const score = importPentatonicScoreFromMusicXml(xml);
  const opening = knownOpening(score.title) ?? openingFromKey(score, profile);
  const diagnostics = [...score.diagnostics];
  const warnings = [...score.warnings];
  if (!opening) {
    const path = recommendPentatonicPath({ events: [] });
    return {
      song: score.title,
      sourceFile: options?.sourceFile ?? '',
      sourceSha256: options?.sourceSha256 ?? '',
      profile,
      orderPolicy: PENTATONIC_SCORE_ORDER_POLICY,
      homeReading: 'No known opening and no key signature. A tonal centre was not invented.',
      regions: [],
      inferredBoundaries: [],
      noneObservations: [],
      summary: {
        totalRegions: 0,
        pentatonicRegions: 0,
        noneRegions: 0,
        collectionChanges: 0,
        distinctCollections: 0,
        noneEventCount: 0,
        eventCount: score.events.length,
        noneEventProportion: 0,
      },
      timingsMs: {
        parse: score.timingsMs.parse,
        extract: score.timingsMs.extract,
        boundary: 0,
        path: 0,
        total: performance.now() - totalStart,
      },
      diagnostics,
      warnings: [...warnings, 'Analysis stopped before the path engine. Tonal centre was not invented.'],
      path,
      score,
    };
  }
  diagnostics.push(opening.reading);
  diagnostics.push('Path constants, WWH weights, and NONE cost are the frozen Dev 2 values.');
  const passage = toPassage(score, opening, profile);
  const boundaryStart = performance.now();
  const inferred = inferredBoundaries(score.events);
  const boundaryMs = performance.now() - boundaryStart;
  const pathStart = performance.now();
  const path = recommendPentatonicPath(passage);
  const pathMs = performance.now() - pathStart;
  const regions = path.kind === 'analysis' ? regionsFrom(score, path) : [];
  const pentatonicRegions = regions.filter((region) => region.collectionName !== 'NONE').length;
  const noneRegions = regions.filter((region) => region.collectionName === 'NONE').length;
  const distinct = new Set(regions.filter((region) => region.collectionName !== 'NONE').map((region) => region.collectionName));
  return {
    song: score.title || options?.sourceFile || 'Untitled',
    sourceFile: options?.sourceFile ?? '',
    sourceSha256: options?.sourceSha256 ?? '',
    profile,
    orderPolicy: PENTATONIC_SCORE_ORDER_POLICY,
    homeReading: opening.reading,
    regions,
    inferredBoundaries: inferred,
    noneObservations: noneObservations(path.events),
    summary: {
      totalRegions: regions.length,
      pentatonicRegions,
      noneRegions,
      collectionChanges: path.switchCount,
      distinctCollections: distinct.size,
      noneEventCount: path.noneEventCount,
      eventCount: score.events.length,
      noneEventProportion: score.events.length === 0 ? 0 : path.noneEventCount / score.events.length,
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
    lines.push('');
  }
  const summary = analysis.summary;
  lines.push(
    `regions ${summary.totalRegions}; pentatonic ${summary.pentatonicRegions}; NONE ${summary.noneRegions}; changes ${summary.collectionChanges}; distinct ${summary.distinctCollections}; NONE events ${summary.noneEventCount}/${summary.eventCount} (${summary.noneEventProportion.toFixed(3)})`
  );
  lines.push(
    `parse ${analysis.timingsMs.parse.toFixed(1)} ms; extract ${analysis.timingsMs.extract.toFixed(1)} ms; boundary ${analysis.timingsMs.boundary.toFixed(1)} ms; path ${analysis.timingsMs.path.toFixed(1)} ms; total ${analysis.timingsMs.total.toFixed(1)} ms`
  );
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
