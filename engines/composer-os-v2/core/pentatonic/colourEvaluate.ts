/**
 * Dev 5A contextual colour evaluation.
 * Reads the existing MusicContext. Does not build another one.
 * Does not call the path optimiser, the phrase engine, GCE, or the MusicXML exporter.
 * Pitch-class overlap is pitch compatibility. It is not voice-leading.
 * NONE abstains. It is not an empty result.
 */

import type { MusicContext } from '../music-context/musicContextTypes';
import { getPentatonicColourResource, listPentatonicColourResources, PENTATONIC_COLOUR_REGISTRY_VERSION } from './colourRegistry';
import type {
  ColourBand,
  ColourContextEvidence,
  ColourFieldAssessment,
  ColourFieldResult,
  PentatonicColourFunction,
  PentatonicColourResource,
} from './colourTypes';
import { canonicalPitchSet, canonicalPitchSetId, mod12, parseNoteToken, sharpName, spellFromReference } from './pitch';

export const PENTATONIC_COLOUR_EVALUATOR_VERSION = 'pentatonic-colour-evaluator-5a';

/** Colour vocabulary does not enter Dev 1–4 candidate generation. */
export const COLOUR_VOCABULARY_ENTERS_PATH = false;

const SHORTLIST_LIMIT = 4;

function bandValue(band: ColourBand): number {
  if (band === 'low') return 0.25;
  if (band === 'moderate') return 0.55;
  return 0.85;
}

function quantize(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 10000) / 10000;
}

function sharedCount(left: readonly number[], right: readonly number[]): number {
  const set = new Set(right);
  let count = 0;
  for (const pc of left) if (set.has(pc)) count += 1;
  return count;
}

function pitchDistance(left: number, right: number): number {
  const raw = Math.abs(mod12(left) - mod12(right));
  return Math.min(raw, 12 - raw);
}

function meanNearestDistance(from: readonly number[], to: readonly number[]): number {
  if (from.length === 0 || to.length === 0) return 0;
  const total = from.reduce((sum, pc) => sum + Math.min(...to.map((other) => pitchDistance(pc, other))), 0);
  return total / from.length;
}

function usefulContrast(shared: number): number {
  if (shared <= 0) return 0.2;
  if (shared === 1) return 0.45;
  if (shared === 2) return 0.85;
  if (shared === 3) return 1;
  if (shared === 4) return 0.55;
  return 0;
}

function collectPitchClasses(notes: readonly string[] | undefined): number[] {
  if (!notes) return [];
  const found: number[] = [];
  for (const note of notes) {
    const parsed = parseNoteToken(note);
    if (parsed) found.push(parsed.pc);
  }
  return canonicalPitchSet(found);
}

function midiSpelling(midi: number): string {
  return sharpName(mod12(midi));
}

function resourceSet(resource: PentatonicColourResource, referencePc: number): number[] {
  return canonicalPitchSet(resource.intervals.map((interval) => mod12(referencePc + interval)));
}

function sameSet(left: readonly number[], right: readonly number[]): boolean {
  return canonicalPitchSetId(left) === canonicalPitchSetId(right);
}

interface Placement {
  resource: PentatonicColourResource;
  referencePc: number;
  referenceNote: string;
  pitchClasses: number[];
}

function colourWhenNotHome(resource: PentatonicColourResource): PentatonicColourFunction {
  if (resource.metadata.primaryColour !== 'HOME') return resource.metadata.primaryColour;
  const next = resource.metadata.alsoServes.find((item) => item !== 'HOME' && item !== 'CONTINUITY');
  return next ?? (resource.metadata.brightness === 'high' ? 'BRIGHT_COLOUR' : 'DARK_COLOUR');
}

function classify(
  resource: PentatonicColourResource,
  pitchClasses: readonly number[],
  homeSet: readonly number[] | null,
  continuity: number | null
): PentatonicColourFunction {
  if (homeSet && sameSet(pitchClasses, homeSet)) return 'HOME';
  const primary = colourWhenNotHome(resource);
  if (continuity !== null && continuity >= 0.8 && (primary === 'INSIDE' || primary === 'BRIGHT_COLOUR' || primary === 'DARK_COLOUR')) {
    return 'CONTINUITY';
  }
  if (homeSet && resource.metadata.distanceFromHome === 'far' && resource.metadata.commonTonePotential === 'low' && resource.metadata.tension === 'high') {
    return primary === 'EDGE' ? 'OUTSIDE' : primary;
  }
  return primary;
}

function scorePlacement(
  placement: Placement,
  evidence: readonly number[],
  homeSet: readonly number[] | null,
  currentSet: readonly number[] | null,
  previous: readonly number[] | null,
  next: readonly number[] | null
): ColourFieldAssessment {
  const have = placement.pitchClasses;
  const compatibility = evidence.length === 0 ? null : sharedCount(evidence, have) / evidence.length;
  const continuityBase = currentSet ?? homeSet;
  const continuity = continuityBase && continuityBase.length > 0 ? sharedCount(have, continuityBase) / Math.max(have.length, continuityBase.length) : null;
  const contrastBase = homeSet ?? currentSet;
  const contrast = contrastBase && contrastBase.length > 0 ? usefulContrast(sharedCount(have, contrastBase)) : null;
  const displacement = homeSet && homeSet.length > 0 ? meanNearestDistance(have, homeSet) : null;
  const colourDistance = displacement === null ? null : displacement / 6;
  const neighbourParts: number[] = [];
  if (previous && previous.length > 0) neighbourParts.push(sharedCount(have, previous) / Math.max(have.length, previous.length));
  if (next && next.length > 0) neighbourParts.push(sharedCount(have, next) / Math.max(have.length, next.length));
  const neighbourContinuity = neighbourParts.length === 0 ? null : neighbourParts.reduce((sum, value) => sum + value, 0) / neighbourParts.length;
  const changed = currentSet ? !sameSet(have, currentSet) : homeSet ? !sameSet(have, homeSet) : false;
  const continuityForFriction = continuity ?? 0;
  const changeFriction = changed ? quantize(Math.max(0.12, 0.35 * (1 - continuityForFriction))) : 0;
  const tension = bandValue(placement.resource.metadata.tension);
  const resolution = quantize(
    bandValue(placement.resource.metadata.suitabilityResolution) *
      (homeSet ? (sharedCount([mod12(placement.referencePc)], homeSet) > 0 ? 1 : 0.65) : 0.75)
  );
  const colour = classify(placement.resource, have, homeSet, continuity);
  const parts: { weight: number; value: number }[] = [];
  if (compatibility !== null) parts.push({ weight: 2, value: compatibility });
  if (continuity !== null) parts.push({ weight: 1.2, value: continuity });
  if (contrast !== null) parts.push({ weight: 0.7, value: contrast });
  parts.push({ weight: 0.4, value: resolution });
  parts.push({ weight: 0.7, value: 1 - changeFriction });
  if (neighbourContinuity !== null) parts.push({ weight: 0.45, value: neighbourContinuity });
  parts.push({ weight: 0.25, value: bandValue(placement.resource.metadata.stability) });
  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0);
  const score = quantize(parts.reduce((sum, part) => sum + part.weight * part.value, 0) / weightSum);
  const compatibilityText =
    compatibility === null ? 'No pitch evidence.' : `Pitch compatibility ${compatibility.toFixed(2)}.`;
  const continuityText =
    continuity === null
      ? 'No current collection and no HOME, so common-tone continuity is omitted.'
      : `Common-tone continuity ${continuity.toFixed(2)}.`;
  const distanceText =
    colourDistance === null
      ? 'No HOME, so colour distance is omitted. Centre is not HOME.'
      : `Colour distance from HOME ${colourDistance.toFixed(2)} by mean nearest pitch-class distance.`;
  return {
    resourceId: placement.resource.id,
    displayName: placement.resource.displayName,
    referenceNote: placement.referenceNote,
    pitchClasses: have,
    colour,
    pitchCompatibility: compatibility === null ? null : quantize(compatibility),
    commonToneContinuity: continuity === null ? null : quantize(continuity),
    usefulContrast: contrast === null ? null : quantize(contrast),
    colourDistanceFromHome: colourDistance === null ? null : quantize(colourDistance),
    nearestPitchClassDisplacement: displacement === null ? null : quantize(displacement),
    tension: quantize(tension),
    resolutionPotential: resolution,
    neighbourContinuity: neighbourContinuity === null ? null : quantize(neighbourContinuity),
    changeFriction,
    score,
    explanation: `${placement.referenceNote} ${placement.resource.displayName} as ${colour}. ${compatibilityText} ${continuityText} ${distanceText} Change friction ${changeFriction.toFixed(2)}.`,
  };
}

function placementsFor(resource: PentatonicColourResource, biasNote: string): Placement[] {
  const bias = parseNoteToken(biasNote)?.spelling ?? 'C';
  const rows: Placement[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const referenceNote = sharpName(pc);
    const spelled = spellFromReference(bias.includes('b') && pc === parseNoteToken(bias)?.pc ? bias : referenceNote, resource.intervals, resource.letterSteps);
    rows.push({
      resource,
      referencePc: pc,
      referenceNote: spelled[0] ?? referenceNote,
      pitchClasses: resourceSet(resource, pc),
    });
  }
  return rows;
}

function prefer(
  left: ColourFieldAssessment,
  right: ColourFieldAssessment,
  homeResourceId: string | null,
  homeSet: readonly number[] | null,
  centrePc: number | null
): ColourFieldAssessment {
  const leftHome = Boolean(homeSet && homeResourceId === left.resourceId && sameSet(left.pitchClasses, homeSet));
  const rightHome = Boolean(homeSet && homeResourceId === right.resourceId && sameSet(right.pitchClasses, homeSet));
  if (leftHome && !rightHome) return left;
  if (rightHome && !leftHome) return right;
  if (centrePc !== null) {
    const leftRef = parseNoteToken(left.referenceNote)?.pc;
    const rightRef = parseNoteToken(right.referenceNote)?.pc;
    if (leftRef === centrePc && rightRef !== centrePc) return left;
    if (rightRef === centrePc && leftRef !== centrePc) return right;
  }
  if (left.score !== right.score) return left.score > right.score ? left : right;
  const leftPath = getPentatonicColourResource(left.resourceId)?.pathArchetypeId ? 1 : 0;
  const rightPath = getPentatonicColourResource(right.resourceId)?.pathArchetypeId ? 1 : 0;
  if (leftPath !== rightPath) return leftPath > rightPath ? left : right;
  const leftRetention = bandValue(getPentatonicColourResource(left.resourceId)?.metadata.suitabilityRetention ?? 'low');
  const rightRetention = bandValue(getPentatonicColourResource(right.resourceId)?.metadata.suitabilityRetention ?? 'low');
  if (leftRetention !== rightRetention) return leftRetention > rightRetention ? left : right;
  return left.resourceId.localeCompare(right.resourceId) <= 0 ? left : right;
}

function dedupeBySet(
  rows: ColourFieldAssessment[],
  homeResourceId: string | null,
  homeSet: readonly number[] | null,
  centrePc: number | null
): ColourFieldAssessment[] {
  const grouped = new Map<string, ColourFieldAssessment>();
  for (const row of rows) {
    const id = canonicalPitchSetId(row.pitchClasses);
    const current = grouped.get(id);
    if (!current) {
      grouped.set(id, row);
      continue;
    }
    const chosen = prefer(current, row, homeResourceId, homeSet, centrePc);
    grouped.set(id, { ...chosen, score: Math.max(current.score, row.score) });
  }
  return [...grouped.values()];
}

export function evaluatePentatonicColour(evidence: ColourContextEvidence): ColourFieldResult {
  const centre = evidence.centreNote ? parseNoteToken(evidence.centreNote) : null;
  const centreNote = centre?.spelling ?? null;
  const homeResource = evidence.home ? getPentatonicColourResource(evidence.home.resourceId) : undefined;
  const homeRef = evidence.home ? parseNoteToken(evidence.home.referenceNote) : null;
  const homeSet = homeResource && homeRef ? resourceSet(homeResource, homeRef.pc) : null;
  const currentResource = evidence.current ? getPentatonicColourResource(evidence.current.resourceId) : undefined;
  const currentRef = evidence.current ? parseNoteToken(evidence.current.referenceNote) : null;
  const currentSet = currentResource && currentRef ? resourceSet(currentResource, currentRef.pc) : null;
  const melody = collectPitchClasses(evidence.melodyNotes);
  const bass = collectPitchClasses(evidence.bassNotes);
  const harmony = collectPitchClasses(evidence.harmonyNotes);
  const held = collectPitchClasses(evidence.heldNotes);
  const sounding = canonicalPitchSet([...melody, ...bass, ...harmony, ...held]);
  const bias = homeRef?.spelling ?? centre?.spelling ?? 'C';
  const homeResourceId = homeResource?.id ?? null;

  const bestPerResource: ColourFieldAssessment[] = [];
  for (const resource of listPentatonicColourResources()) {
    let best: ColourFieldAssessment | null = null;
    for (const placement of placementsFor(resource, bias)) {
      const assessed = scorePlacement(
        placement,
        sounding,
        homeSet,
        currentSet,
        evidence.previousPitchClasses ?? null,
        evidence.nextPitchClasses ?? null
      );
      if (!best || assessed.score > best.score) best = assessed;
    }
    if (best) bestPerResource.push(best);
  }

  const unique = dedupeBySet(bestPerResource, homeResourceId, homeSet, centre?.pc ?? null).sort(
    (a, b) => b.score - a.score || a.resourceId.localeCompare(b.resourceId)
  );
  const base: Omit<ColourFieldResult, 'disposition' | 'selected' | 'shortlist' | 'nonePreferred' | 'explanation'> = {
    registryVersion: PENTATONIC_COLOUR_REGISTRY_VERSION,
    evaluatorVersion: PENTATONIC_COLOUR_EVALUATOR_VERSION,
    centreNote,
    homeResourceId,
    harmonySymbolsIgnored: [],
  };

  if (sounding.length === 0) {
    return {
      ...base,
      disposition: 'NONE',
      selected: null,
      shortlist: [],
      nonePreferred: true,
      explanation: 'NONE. No sounding pitches. A colour field is not assumed. Centre is not HOME.',
    };
  }
  if (sounding.length === 1) {
    return {
      ...base,
      disposition: 'NONE',
      selected: null,
      shortlist: unique.slice(0, 1),
      nonePreferred: true,
      explanation: 'NONE. One pitch does not earn a five-note colour field.',
    };
  }

  const exactCovers = sounding.length >= 4 ? unique.filter((row) => row.pitchCompatibility === 1) : [];
  const pool = exactCovers.length > 0 ? exactCovers : unique;
  const best = pool[0]!;
  const bestCoverage = best.pitchCompatibility ?? 0;
  const weakFit = sounding.length >= 3 && bestCoverage < 0.5;
  const chromaticSpill = sounding.length >= 6 && bestCoverage < 0.8;
  if (weakFit || chromaticSpill) {
    return {
      ...base,
      disposition: 'NONE',
      selected: null,
      shortlist: pool.slice(0, 1),
      nonePreferred: true,
      explanation: chromaticSpill
        ? 'NONE. The passage spreads past a five-note colour. Pitch compatibility is not high enough to justify a resource. Outside notes would be legal later; they do not force a scale here.'
        : 'NONE. No resource shares enough sounding pitches to earn the passage.',
    };
  }

  const currentAssessment = currentSet ? unique.find((row) => sameSet(row.pitchClasses, currentSet)) ?? null : null;
  if (currentAssessment && sameSet(best.pitchClasses, currentAssessment.pitchClasses)) {
    return {
      ...base,
      disposition: 'RETAIN',
      selected: currentAssessment,
      shortlist: pool.slice(0, SHORTLIST_LIMIT),
      nonePreferred: false,
      explanation: `RETAIN ${currentAssessment.referenceNote} ${currentAssessment.displayName}. The current colour already matches. Change friction stays at rest.`,
    };
  }
  if (currentAssessment && !sameSet(best.pitchClasses, currentAssessment.pitchClasses)) {
    const advantage = best.score - currentAssessment.score;
    const stated = (best.pitchCompatibility ?? 0) === 1 && sounding.length >= 4 && (currentAssessment.pitchCompatibility ?? 0) < 1;
    if (!stated && advantage <= best.changeFriction) {
      const shortlist = [currentAssessment, ...pool.filter((row) => row !== currentAssessment)].slice(0, SHORTLIST_LIMIT);
      return {
        ...base,
        disposition: 'RETAIN',
        selected: currentAssessment,
        shortlist,
        nonePreferred: false,
        explanation: `RETAIN ${currentAssessment.referenceNote} ${currentAssessment.displayName}. The alternative does not clear the change friction. Continuity stays. This is not a suitability floor.`,
      };
    }
  }

  const shortlist = pool.filter((row, index) => index === 0 || (best.score - row.score <= 0.12 && row.colour !== best.colour)).slice(0, SHORTLIST_LIMIT);
  return {
    ...base,
    disposition: 'SELECT',
    selected: best,
    shortlist,
    nonePreferred: false,
    explanation: `SELECT ${best.referenceNote} ${best.displayName}. ${best.explanation} Shortlist ${shortlist.length} of ${listPentatonicColourResources().length}.`,
  };
}

export function evaluatePentatonicColourFromContext(context: MusicContext, evidence: ColourContextEvidence = {}): ColourFieldResult {
  const melody =
    evidence.melodyNotes ??
    (context.motif?.seedPitches ? context.motif.seedPitches.map((midi) => midiSpelling(midi)) : []);
  const result = evaluatePentatonicColour({
    ...evidence,
    centreNote: evidence.centreNote ?? context.key.root,
    melodyNotes: melody,
  });
  const ignored = evidence.harmonyNotes && evidence.harmonyNotes.length > 0 ? [] : [...context.harmony.bars];
  return {
    ...result,
    harmonySymbolsIgnored: ignored,
    explanation:
      ignored.length > 0
        ? `${result.explanation} Harmony symbols were not mapped to a chord scale. Centre ${result.centreNote ?? 'unknown'} is not HOME.`
        : result.explanation,
  };
}
