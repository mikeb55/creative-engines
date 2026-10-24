/**
 * V3.4 Stage B orchestration evidence.
 * Measures the score. Does not rewrite notes, rebalance parts, or approve the music.
 */

import { DOMParser } from '@xmldom/xmldom';
import { elementChildren, partElements } from '../performance-composer/pcScore';
import { listInstruments } from '../instruments/instrumentCatalogue';
import type { BalanceClass, InstrumentSpec, Transposition } from '../instruments/instrumentTypes';
import { CONCERT_TRANSPOSITION } from '../instruments/instrumentTypes';
import {
  ingestCanonicalScore,
  sha256Text,
  type CanonicalEvaluationScore,
  type CanonicalEvent,
} from './canonicalScore';
import { assertNeutralNotes } from './independenceReport';

export type SequentialTextureLabel =
  | 'stream_segregation'
  | 'stream_integration'
  | 'stratification'
  | 'surface_texture';

export type ConcurrentTextureLabel =
  | 'blend'
  | 'timbral_augmentation'
  | 'timbral_emergence'
  | 'non_blend'
  | 'timbral_heterogeneity';

export type SegmentalTextureLabel =
  | 'timbral_shift'
  | 'timbral_echo'
  | 'antiphonal_contrast'
  | 'sectional_boundary'
  | 'timbral_juxtaposition';

export interface OrchestrationParams {
  /** Inference. Spec 6.6. */
  closeIntervalSemitones: 4;
  /** Inference. About E3. */
  lowRegisterMidi: 52;
  /** Inference. Octave between adjacent upper voices. */
  upperAdjacentGapSemitones: 12;
  /** Inference. McAdams sequential vocabulary, local onset overlap. */
  coOnsetIntegration: 0.6;
  /** Inference. */
  coOnsetSegregation: 0.35;
  melodyRule: 'highest-mean-sounding-pitch';
  unmarkedDynamicBand: 'loud';
  /** Engineering map from MusicXML marks onto Rimsky loud and piano passages. */
  loudDynamics: readonly string[];
  softDynamics: readonly string[];
}

export const ORCHESTRATION_PARAMS: OrchestrationParams = {
  closeIntervalSemitones: 4,
  lowRegisterMidi: 52,
  upperAdjacentGapSemitones: 12,
  coOnsetIntegration: 0.6,
  coOnsetSegregation: 0.35,
  melodyRule: 'highest-mean-sounding-pitch',
  unmarkedDynamicBand: 'loud',
  loudDynamics: ['mf', 'f', 'ff', 'fff', 'ffff', 'sf', 'sfz', 'fz', 'rf', 'rfz', 'fp'],
  softDynamics: ['mp', 'p', 'pp', 'ppp', 'pppp'],
};

export interface OrchestrationReport {
  version: 'orchestration-evidence-1';
  inputSha256: string;
  params: OrchestrationParams;
  rangeUse: Array<{ partId: string; lowest: number; highest: number; outsideHard: number; outsideComfort: number }>;
  transpositionChecks: Array<{ partId: string; declared: Transposition | null; expected: Transposition; matches: boolean }>;
  balanceByBar: Array<{ bar: number; dynamicBand: 'soft' | 'loud'; melodyWeight: number; accompanimentWeight: number }>;
  doublingRuns: Array<{ parts: [string, string]; interval: 'unison' | 'octave'; startBar: number; bars: number }>;
  spacing: Array<{ bar: number; beat: number; lowestInterval: number; lowestPitch: number; widestInnerGap: number }>;
  activity: Array<{ partId: string; notesPerBar: number[]; restBars: number[] }>;
  textureStates: Array<{ startBar: number; endBar: number; label: SequentialTextureLabel }>;
  concurrentTextures: Array<{ bar: number; label: ConcurrentTextureLabel }>;
  segmentalEvents: Array<{ bar: number; label: SegmentalTextureLabel }>;
  notes: string[];
  musicalQualityScore: null;
  musicallyApproved: false;
}

const LOUD_DOCUMENTED: Partial<Record<BalanceClass, number>> = {
  trumpet_trombone_tuba: 2,
  horn: 1,
  woodwind: 0.5,
};

function emptyReport(inputSha256: string, notes: string[]): OrchestrationReport {
  const report: OrchestrationReport = {
    version: 'orchestration-evidence-1',
    inputSha256,
    params: ORCHESTRATION_PARAMS,
    rangeUse: [],
    transpositionChecks: [],
    balanceByBar: [],
    doublingRuns: [],
    spacing: [],
    activity: [],
    textureStates: [],
    concurrentTextures: [],
    segmentalEvents: [],
    notes,
    musicalQualityScore: null,
    musicallyApproved: false,
  };
  assertNeutralNotes(report.notes);
  return report;
}

function catalogueForName(name: string): InstrumentSpec | null {
  const text = name.trim();
  if (/piccolo/i.test(text)) return byId('piccolo');
  if (/flute/i.test(text)) return byId('flute');
  if (/oboe/i.test(text)) return byId('oboe');
  if (/bass\s*clarinet/i.test(text)) return byId('bass_clarinet_bb');
  if (/clarinet/i.test(text)) return byId('clarinet_bb');
  if (/contra\s*bassoon|contrabassoon/i.test(text)) return byId('contrabassoon');
  if (/bassoon/i.test(text)) return byId('bassoon');
  if (/trumpet|cornet/i.test(text)) return byId('trumpet_bb');
  if (/trombone/i.test(text)) return byId('trombone');
  if (/tuba/i.test(text)) return byId('tuba');
  if (/baritone\s*sax|bari\s*sax/i.test(text)) return byId('baritone_sax');
  if (/tenor\s*sax/i.test(text)) return byId('tenor_sax');
  if (/alto\s*sax/i.test(text)) return byId('alto_sax');
  if (/sax/i.test(text)) return null;
  if (/\bhorn\b/i.test(text)) return byId('horn_f');
  if (/violin/i.test(text)) return byId('violin');
  if (/viola/i.test(text)) return byId('viola');
  if (/violoncello|cello/i.test(text)) return byId('cello');
  if (/double\s*bass|contrabass|upright\s*bass/i.test(text)) return byId('double_bass');
  if (/\bharp\b/i.test(text)) return byId('harp');
  if (/glockenspiel/i.test(text)) return byId('glockenspiel');
  if (/celesta/i.test(text)) return byId('celesta');
  if (/timpani/i.test(text)) return byId('timpani');
  if (/\bpiano\b/i.test(text)) return byId('piano');
  return null;
}

function byId(id: string): InstrumentSpec | null {
  return listInstruments().find((item) => item.id === id) ?? null;
}

function soundingNotes(score: CanonicalEvaluationScore, partId: string, bar?: number): CanonicalEvent[] {
  return score.soundingEvents.filter((event) => (
    event.partId === partId
    && !event.rest
    && event.soundingMidi !== null
    && (bar === undefined || event.bar === bar)
  ));
}

function quarters(event: CanonicalEvent): number {
  return event.duration.n / event.duration.d;
}

function onsetKey(event: CanonicalEvent): string {
  return `${event.onsetInBar.n}/${event.onsetInBar.d}`;
}

function beatOf(event: CanonicalEvent): number {
  const beat = event.onsetInBar.n / event.onsetInBar.d;
  return Math.round(beat * 10000) / 10000;
}

function sameTranspose(left: Transposition, right: Transposition): boolean {
  return left.diatonic === right.diatonic && left.chromatic === right.chromatic && left.octaveChange === right.octaveChange;
}

interface DeclaredTranspose {
  partId: string;
  value: Transposition | null;
}

function readDeclaredTranspositions(xml: string): Map<string, Transposition | null> {
  const out = new Map<string, Transposition | null>();
  const doc = parseXml(xml);
  if (!doc) return out;
  for (const part of partElements(doc)) {
    const partId = part.getAttribute('id') ?? '';
    let found: Transposition | null = null;
    for (const measure of elementChildren(part, 'measure')) {
      for (const attributes of elementChildren(measure, 'attributes')) {
        const transpose = elementChildren(attributes, 'transpose')[0];
        if (!transpose) continue;
        const diatonicText = textOf(transpose, 'diatonic');
        const chromaticText = textOf(transpose, 'chromatic');
        const octaveText = textOf(transpose, 'octave-change');
        found = {
          diatonic: diatonicText === '' ? 0 : Number(diatonicText),
          chromatic: chromaticText === '' ? 0 : Number(chromaticText),
          octaveChange: octaveText === '' ? 0 : Number(octaveText),
        };
      }
    }
    out.set(partId, found);
  }
  return out;
}

function readDynamicMarks(xml: string): Array<{ bar: number; onset: number; mark: string }> {
  const doc = parseXml(xml);
  if (!doc) return [];
  const marks: Array<{ bar: number; onset: number; mark: string }> = [];
  for (const part of partElements(doc)) {
    let divisions = 1;
    for (const measure of elementChildren(part, 'measure')) {
      const bar = marksBar(measure);
      for (const attributes of elementChildren(measure, 'attributes')) {
        const next = Number(textOf(attributes, 'divisions'));
        if (Number.isFinite(next) && next > 0) divisions = next;
      }
      for (const direction of elementChildren(measure, 'direction')) {
        const offsetText = textOf(direction, 'offset');
        const onset = offsetText === '' ? 0 : Number(offsetText) / divisions;
        for (const typed of elementChildren(direction, 'direction-type')) {
          for (const child of elementChildren(typed)) {
            if (child.nodeName === 'dynamics') {
              for (const mark of elementChildren(child)) pushMark(marks, bar, onset, mark.nodeName);
            } else {
              pushMark(marks, bar, onset, child.nodeName);
            }
          }
        }
      }
    }
  }
  marks.sort((a, b) => a.bar - b.bar || a.onset - b.onset || a.mark.localeCompare(b.mark));
  return marks;
}

function pushMark(marks: Array<{ bar: number; onset: number; mark: string }>, bar: number, onset: number, name: string): void {
  const mark = name.toLowerCase();
  if (ORCHESTRATION_PARAMS.loudDynamics.includes(mark) || ORCHESTRATION_PARAMS.softDynamics.includes(mark)) {
    marks.push({ bar, onset, mark });
  }
}

function marksBar(measure: Element): number {
  const raw = Number(measure.getAttribute('number'));
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function parseXml(xml: string): Document | null {
  if (!xml.trim()) return null;
  try {
    const doc = new DOMParser({
      onError: () => undefined,
    }).parseFromString(xml, 'text/xml') as unknown as Document;
    if (doc.documentElement?.nodeName !== 'score-partwise') return null;
    return doc;
  } catch {
    return null;
  }
}

function textOf(parent: Element | undefined, name: string): string {
  if (!parent) return '';
  return elementChildren(parent, name)[0]?.textContent?.trim() ?? '';
}

function bandForMark(mark: string): 'soft' | 'loud' | null {
  if (ORCHESTRATION_PARAMS.loudDynamics.includes(mark)) return 'loud';
  if (ORCHESTRATION_PARAMS.softDynamics.includes(mark)) return 'soft';
  return null;
}

function dynamicBandByBar(bars: number[], marks: Array<{ bar: number; onset: number; mark: string }>): {
  bands: Map<number, 'soft' | 'loud'>;
  unmarked: boolean;
  mixedBars: number[];
} {
  const bands = new Map<number, 'soft' | 'loud'>();
  const mixedBars: number[] = [];
  let carry: 'soft' | 'loud' | null = null;
  let any = false;
  for (const bar of bars) {
    const inBar = marks.filter((mark) => mark.bar === bar);
    const unique = [...new Set(inBar.map((mark) => mark.mark))];
    if (unique.length > 1) mixedBars.push(bar);
    if (inBar.length) {
      const band = bandForMark(inBar[0]!.mark);
      if (band) {
        carry = band;
        any = true;
      }
    }
    bands.set(bar, carry ?? ORCHESTRATION_PARAMS.unmarkedDynamicBand);
  }
  return { bands, unmarked: !any, mixedBars };
}

function weightFor(spec: InstrumentSpec | null, band: 'soft' | 'loud'): { weight: number; basis: 'documented' | 'inference' | 'omitted' } {
  if (!spec) return { weight: 0, basis: 'omitted' };
  if (band === 'soft') {
    if (spec.balanceClass === 'woodwind' || spec.balanceClass === 'horn' || spec.balanceClass === 'trumpet_trombone_tuba') {
      return { weight: 1, basis: 'documented' };
    }
    return { weight: 1, basis: 'inference' };
  }
  const documented = LOUD_DOCUMENTED[spec.balanceClass];
  if (documented !== undefined) return { weight: documented, basis: 'documented' };
  return { weight: 1, basis: 'inference' };
}

function shiftMatch(left: number[], right: number[]): 'unison' | 'octave' | null {
  if (!left.length || left.length !== right.length) return null;
  const a = [...left].sort((x, y) => x - y);
  const b = [...right].sort((x, y) => x - y);
  const diffs = a.map((pitch, index) => b[index]! - pitch);
  if (diffs.every((diff) => diff === 0)) return 'unison';
  const first = diffs[0]!;
  if ((first === 12 || first === -12) && diffs.every((diff) => diff === first)) return 'octave';
  return null;
}

function doublingInterval(score: CanonicalEvaluationScore, leftId: string, rightId: string, bar: number): 'unison' | 'octave' | null {
  const left = soundingNotes(score, leftId, bar);
  const right = soundingNotes(score, rightId, bar);
  if (!left.length || !right.length) return null;
  const leftKeys = new Set(left.map(onsetKey));
  const rightKeys = new Set(right.map(onsetKey));
  if (leftKeys.size !== rightKeys.size) return null;
  for (const key of leftKeys) if (!rightKeys.has(key)) return null;
  let kind: 'unison' | 'octave' | null = null;
  for (const key of leftKeys) {
    const match = shiftMatch(
      left.filter((event) => onsetKey(event) === key).map((event) => event.soundingMidi!),
      right.filter((event) => onsetKey(event) === key).map((event) => event.soundingMidi!),
    );
    if (!match) return null;
    if (kind && kind !== match) return null;
    kind = match;
  }
  return kind;
}

function meanCoOnset(score: CanonicalEvaluationScore, partIds: string[], bar: number): number {
  const sets = partIds.map((partId) => new Set(soundingNotes(score, partId, bar).map(onsetKey)));
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      let shared = 0;
      for (const onset of sets[i]!) if (sets[j]!.has(onset)) shared += 1;
      const union = new Set([...sets[i]!, ...sets[j]!]).size || 1;
      total += shared / union;
      pairs += 1;
    }
  }
  return pairs ? total / pairs : 0;
}

function familyKey(score: CanonicalEvaluationScore, partIds: string[]): string {
  const families = partIds.map((partId) => {
    const part = score.parts.find((item) => item.id === partId);
    return part ? catalogueForName(part.name)?.family ?? 'unsupported' : 'unsupported';
  });
  return [...new Set(families)].sort().join('+');
}

export function buildOrchestrationReport(input: { xml: string }): OrchestrationReport {
  const xml = input.xml ?? '';
  const inputSha256 = sha256Text(xml);
  const ingested = ingestCanonicalScore(xml);
  if (!ingested.score) {
    return emptyReport(inputSha256, [
      'The file did not parse as score-partwise. No orchestration evidence was measured.',
      'This report does not change the score and does not approve it.',
    ]);
  }
  const score = ingested.score;
  const notes: string[] = [];
  if (!score.parts.length) {
    notes.push('No parts were available for orchestration evidence.');
  }

  for (const item of score.unsupported) {
    if (item.kind === 'missing-part') {
      notes.push(`Warning: score-part ${item.partId} has no part body. Activity and range were not measured for it.`);
    }
  }

  const declared = readDeclaredTranspositions(xml);
  const rangeUse: OrchestrationReport['rangeUse'] = [];
  const transpositionChecks: OrchestrationReport['transpositionChecks'] = [];
  let soundingMismatches = 0;

  for (const part of score.parts) {
    const spec = catalogueForName(part.name);
    const pitches = soundingNotes(score, part.id).map((event) => event.soundingMidi!);
    if (!spec) {
      notes.push(`Warning: ${part.name} has no V3.4 catalogue entry. Range and Rimsky weight were not applied.`);
    } else if (pitches.length) {
      let outsideHard = 0;
      let outsideComfort = 0;
      const hard = spec.soundingHardRange;
      const comfort = spec.soundingComfortRange;
      for (const pitch of pitches) {
        if (hard && (pitch < hard[0] || pitch > hard[1])) outsideHard += 1;
        else if (comfort && (pitch < comfort[0] || pitch > comfort[1])) outsideComfort += 1;
      }
      const lowest = Math.min(...pitches);
      const highest = Math.max(...pitches);
      rangeUse.push({ partId: part.id, lowest, highest, outsideHard, outsideComfort });
      if (outsideHard > 0 && hard) {
        notes.push(`Warning: ${part.name} has ${outsideHard} note${outsideHard === 1 ? '' : 's'} outside the documented hard range ${hard[0]}–${hard[1]}. The pitches were not moved.`);
      }
      if (outsideComfort > 0 && comfort) {
        notes.push(`Warning: ${part.name} has ${outsideComfort} note${outsideComfort === 1 ? '' : 's'} outside the inferred comfort range ${comfort[0]}–${comfort[1]}. Comfort limits are not documented facts.`);
      }
      if (!hard) {
        notes.push(`Limitation: ${part.name} has transposition data and no documented numeric range. Extrema were recorded without a range flag.`);
      }
    }

    const expected = spec?.transposition ?? CONCERT_TRANSPOSITION;
    const declaredValue = declared.get(part.id) ?? null;
    const matches = spec
      ? (declaredValue === null ? sameTranspose(expected, CONCERT_TRANSPOSITION) : sameTranspose(declaredValue, expected))
      : false;
    transpositionChecks.push({
      partId: part.id,
      declared: declaredValue,
      expected: spec ? expected : CONCERT_TRANSPOSITION,
      matches,
    });
    if (spec && !matches) {
      const shown = declaredValue
        ? `diatonic ${declaredValue.diatonic}, chromatic ${declaredValue.chromatic}, octave-change ${declaredValue.octaveChange}`
        : 'no transpose element';
      notes.push(
        `Warning: ${part.name} declares ${shown}. Catalogue ${spec.displayName} expects diatonic ${expected.diatonic}, chromatic ${expected.chromatic}, octave-change ${expected.octaveChange}.`,
      );
    }
    if (!spec) continue;
    const transpose = declaredValue ?? CONCERT_TRANSPOSITION;
    for (const event of soundingNotes(score, part.id)) {
      if (!event.written) continue;
      const expectedSounding = event.written.midi + transpose.chromatic + 12 * transpose.octaveChange;
      if (expectedSounding !== event.soundingMidi) soundingMismatches += 1;
    }
  }
  if (soundingMismatches > 0) {
    notes.push(`Warning: ${soundingMismatches} notes have a sounding pitch that does not match written pitch plus the declared transposition.`);
  }

  const bars = [...new Set(score.measures.map((measure) => measure.bar))].sort((a, b) => a - b);
  const dynamics = readDynamicMarks(xml);
  for (const direction of score.directions) {
    if (direction.kind === 'dynamic' && !dynamics.some((mark) => mark.bar === direction.bar && mark.mark === direction.text)) {
      dynamics.push({ bar: direction.bar, onset: direction.onsetInBar.n / direction.onsetInBar.d, mark: direction.text });
    }
  }
  dynamics.sort((a, b) => a.bar - b.bar || a.onset - b.onset || a.mark.localeCompare(b.mark));
  const { bands, unmarked, mixedBars } = dynamicBandByBar(bars, dynamics);
  if (unmarked && bars.length) {
    notes.push('Limitation: no dynamic marking was found. Loud-band weights were used. That default is an engineering assumption.');
  }
  if (mixedBars.length) {
    notes.push(`Limitation: bar ${mixedBars.join(', ')} has more than one dynamic. The first mark sets the band. That choice is an engineering assumption.`);
  }

  const balanceByBar: OrchestrationReport['balanceByBar'] = [];
  const doublingByBar = new Map<string, 'unison' | 'octave'>();
  for (const bar of bars) {
    const active = score.parts.filter((part) => soundingNotes(score, part.id, bar).length > 0);
    let melodyId: string | null = null;
    let bestMean = -Infinity;
    let bestDuration = -Infinity;
    for (const part of active) {
      const notesInBar = soundingNotes(score, part.id, bar);
      const mean = notesInBar.reduce((sum, event) => sum + event.soundingMidi!, 0) / notesInBar.length;
      const duration = notesInBar.reduce((sum, event) => sum + quarters(event), 0);
      const better = mean > bestMean + 1e-9
        || (Math.abs(mean - bestMean) <= 1e-9 && duration > bestDuration + 1e-9)
        || (Math.abs(mean - bestMean) <= 1e-9 && Math.abs(duration - bestDuration) <= 1e-9 && (melodyId === null || part.id < melodyId));
      if (better) {
        melodyId = part.id;
        bestMean = mean;
        bestDuration = duration;
      }
    }
    const melodyIds = new Set<string>();
    if (melodyId) melodyIds.add(melodyId);
    for (let i = 0; i < active.length; i += 1) {
      for (let j = i + 1; j < active.length; j += 1) {
        const interval = doublingInterval(score, active[i]!.id, active[j]!.id, bar);
        if (!interval) continue;
        const key = `${active[i]!.id}|${active[j]!.id}|${bar}`;
        doublingByBar.set(key, interval);
        if (melodyId && (active[i]!.id === melodyId || active[j]!.id === melodyId)) {
          melodyIds.add(active[i]!.id);
          melodyIds.add(active[j]!.id);
        }
      }
    }
    const band = bands.get(bar) ?? 'loud';
    let melodyWeight = 0;
    let accompanimentWeight = 0;
    for (const part of active) {
      const spec = catalogueForName(part.name);
      const weighted = weightFor(spec, band);
      if (weighted.basis === 'omitted') continue;
      if (melodyIds.has(part.id)) melodyWeight += weighted.weight;
      else accompanimentWeight += weighted.weight;
    }
    balanceByBar.push({
      bar,
      dynamicBand: band,
      melodyWeight: roundWeight(melodyWeight),
      accompanimentWeight: roundWeight(accompanimentWeight),
    });
  }

  const doublingRuns = collectDoublingRuns(score, doublingByBar);
  const spacing = collectSpacing(score);
  const wideUpper = spacing.filter((row) => row.widestInnerGap > ORCHESTRATION_PARAMS.upperAdjacentGapSemitones).length;
  const closeLow = spacing.filter((row) => (
    row.lowestInterval <= ORCHESTRATION_PARAMS.closeIntervalSemitones
    && row.lowestPitch <= ORCHESTRATION_PARAMS.lowRegisterMidi
  )).length;
  if (wideUpper > 0) {
    notes.push(`Limitation: ${wideUpper} verticals have an upper adjacent gap wider than an octave. The octave threshold is an engineering assumption.`);
  }
  if (closeLow > 0) {
    notes.push(`Limitation: ${closeLow} verticals place an interval of ${ORCHESTRATION_PARAMS.closeIntervalSemitones} semitones or less at or below MIDI ${ORCHESTRATION_PARAMS.lowRegisterMidi}. That low-register threshold is an engineering assumption.`);
  }

  const activity = score.parts.map((part) => {
    const notesPerBar = bars.map((bar) => soundingNotes(score, part.id, bar).length);
    const restBars = bars.filter((bar, index) => notesPerBar[index] === 0);
    return { partId: part.id, notesPerBar, restBars };
  });

  const textureStates = sequentialTextures(score, bars);
  const concurrentTextures = concurrentLabels(score, bars, doublingByBar);
  const segmentalEvents = segmentalLabels(score, bars);

  notes.push('Documented: loud-band weights are trumpet, trombone and tuba 2, horn 1, and woodwind 0.5. Soft-band wind weights are 1. Source: Rimsky-Korsakov, Principles of Orchestration, chapter I.');
  notes.push('Inference: saxophone loud-band weight is 1, and each string part is weight 1. Those weights are not in the Rimsky table.');
  notes.push('Inference: comfort ranges come from the instrument catalogue. Hard ranges are the documented sounding limits.');
  notes.push('Inference: the melody part in a bar is the part with the highest mean sounding pitch. Ties break on duration, then part id. Unison or octave partners of that part are counted with the melody.');
  notes.push('Inference: mf and louder map to the loud band, and mp and softer map to the soft band.');
  notes.push('Documented vocabulary: concurrent, sequential and segmental labels follow McAdams, Goodchild and Soden, MTO 28.3. The bar-to-label rules are engineering assumptions. ORCHARD annotations were not used.');
  notes.push('This report does not change the score and does not approve it.');

  const report: OrchestrationReport = {
    version: 'orchestration-evidence-1',
    inputSha256,
    params: ORCHESTRATION_PARAMS,
    rangeUse,
    transpositionChecks,
    balanceByBar,
    doublingRuns,
    spacing,
    activity,
    textureStates,
    concurrentTextures,
    segmentalEvents,
    notes,
    musicalQualityScore: null,
    musicallyApproved: false,
  };
  assertNeutralNotes(report.notes);
  return report;
}

function roundWeight(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function collectDoublingRuns(
  score: CanonicalEvaluationScore,
  doublingByBar: Map<string, 'unison' | 'octave'>,
): OrchestrationReport['doublingRuns'] {
  const runs: OrchestrationReport['doublingRuns'] = [];
  const bars = [...new Set(score.measures.map((measure) => measure.bar))].sort((a, b) => a - b);
  for (let i = 0; i < score.parts.length; i += 1) {
    for (let j = i + 1; j < score.parts.length; j += 1) {
      const left = score.parts[i]!.id;
      const right = score.parts[j]!.id;
      let current: { interval: 'unison' | 'octave'; startBar: number; bars: number } | null = null;
      for (const bar of bars) {
        const interval = doublingByBar.get(`${left}|${right}|${bar}`) ?? null;
        if (interval && current && current.interval === interval && bar === current.startBar + current.bars) {
          current.bars += 1;
        } else {
          if (current) runs.push({ parts: [left, right], interval: current.interval, startBar: current.startBar, bars: current.bars });
          current = interval ? { interval, startBar: bar, bars: 1 } : null;
        }
      }
      if (current) runs.push({ parts: [left, right], interval: current.interval, startBar: current.startBar, bars: current.bars });
    }
  }
  return runs;
}

function collectSpacing(score: CanonicalEvaluationScore): OrchestrationReport['spacing'] {
  const groups = new Map<string, { bar: number; beat: number; pitches: number[] }>();
  for (const event of score.soundingEvents) {
    if (event.rest || event.soundingMidi === null) continue;
    const beat = beatOf(event);
    const key = `${event.bar}|${beat}`;
    const group = groups.get(key) ?? { bar: event.bar, beat, pitches: [] };
    group.pitches.push(event.soundingMidi);
    groups.set(key, group);
  }
  const rows: OrchestrationReport['spacing'] = [];
  for (const group of groups.values()) {
    const pitches = [...new Set(group.pitches)].sort((a, b) => a - b);
    if (pitches.length < 2) continue;
    const gaps = pitches.slice(1).map((pitch, index) => pitch - pitches[index]!);
    const lowestInterval = gaps[0]!;
    const inner = gaps.slice(1);
    rows.push({
      bar: group.bar,
      beat: group.beat,
      lowestInterval,
      lowestPitch: pitches[0]!,
      widestInnerGap: inner.length ? Math.max(...inner) : 0,
    });
  }
  rows.sort((a, b) => a.bar - b.bar || a.beat - b.beat || a.lowestPitch - b.lowestPitch);
  return rows;
}

function sequentialTextures(score: CanonicalEvaluationScore, bars: number[]): OrchestrationReport['textureStates'] {
  const labels: Array<{ bar: number; label: SequentialTextureLabel } | null> = bars.map((bar) => {
    const active = score.parts.filter((part) => soundingNotes(score, part.id, bar).length > 0).map((part) => part.id);
    if (active.length < 2) return null;
    const pitches = active.flatMap((partId) => soundingNotes(score, partId, bar).map((event) => event.soundingMidi!));
    const unique = [...new Set(pitches)].sort((a, b) => a - b);
    const gaps = unique.slice(1).map((pitch, index) => pitch - unique[index]!);
    const span = unique.length ? unique[unique.length - 1]! - unique[0]! : 0;
    const attacks = active.reduce((sum, partId) => sum + soundingNotes(score, partId, bar).length, 0);
    const coOnset = meanCoOnset(score, active, bar);
    let label: SequentialTextureLabel;
    if (gaps.some((gap) => gap >= ORCHESTRATION_PARAMS.upperAdjacentGapSemitones)) label = 'stratification';
    else if (active.length >= 3 && span < ORCHESTRATION_PARAMS.upperAdjacentGapSemitones && attacks >= 8) label = 'surface_texture';
    else if (coOnset < ORCHESTRATION_PARAMS.coOnsetSegregation) label = 'stream_segregation';
    else label = 'stream_integration';
    return { bar, label };
  });
  const states: OrchestrationReport['textureStates'] = [];
  for (const item of labels) {
    if (!item) continue;
    const last = states[states.length - 1];
    if (last && last.label === item.label && last.endBar + 1 === item.bar) last.endBar = item.bar;
    else states.push({ startBar: item.bar, endBar: item.bar, label: item.label });
  }
  return states;
}

function concurrentLabels(
  score: CanonicalEvaluationScore,
  bars: number[],
  doublingByBar: Map<string, 'unison' | 'octave'>,
): OrchestrationReport['concurrentTextures'] {
  const rows: OrchestrationReport['concurrentTextures'] = [];
  for (const bar of bars) {
    const active = score.parts.filter((part) => soundingNotes(score, part.id, bar).length > 0);
    if (active.length < 2) continue;
    const doubled = active.some((left, index) => active.slice(index + 1).some((right) => doublingByBar.has(`${left.id}|${right.id}|${bar}`)));
    const families = new Set(active.map((part) => catalogueForName(part.name)?.family ?? 'unsupported'));
    const pitches = active.flatMap((part) => soundingNotes(score, part.id, bar).map((event) => event.soundingMidi!));
    const unique = [...new Set(pitches)].sort((a, b) => a - b);
    const span = unique.length ? unique[unique.length - 1]! - unique[0]! : 0;
    const coOnset = meanCoOnset(score, active.map((part) => part.id), bar);
    let label: ConcurrentTextureLabel;
    if (doubled) label = 'timbral_augmentation';
    else if (families.size === 1 && span <= 12 && coOnset >= ORCHESTRATION_PARAMS.coOnsetIntegration) label = 'blend';
    else if (families.size >= 2 && span <= 7) label = 'non_blend';
    else if (families.size >= 2 && active.length >= 4 && span <= 12) label = 'timbral_emergence';
    else if (families.size >= 2) label = 'timbral_heterogeneity';
    else label = 'blend';
    rows.push({ bar, label });
  }
  return rows;
}

function segmentalLabels(score: CanonicalEvaluationScore, bars: number[]): OrchestrationReport['segmentalEvents'] {
  const events: OrchestrationReport['segmentalEvents'] = [];
  const activeAt = (bar: number) => score.parts.filter((part) => soundingNotes(score, part.id, bar).length > 0).map((part) => part.id);
  for (const bar of bars) {
    if (score.directions.some((direction) => direction.kind === 'rehearsal' && direction.bar === bar)) {
      events.push({ bar, label: 'sectional_boundary' });
    }
    const index = bars.indexOf(bar);
    if (index <= 0) continue;
    const previousBar = bars[index - 1]!;
    const now = new Set(activeAt(bar));
    const previous = new Set(activeAt(previousBar));
    if (now.size && previous.size) {
      const overlap = [...now].some((partId) => previous.has(partId));
      if (!overlap) events.push({ bar, label: 'antiphonal_contrast' });
      else if (familyKey(score, [...now]) !== familyKey(score, [...previous])) events.push({ bar, label: 'timbral_shift' });
    }
    if (index >= 1) {
      const echoed = score.parts.some((part) => {
        const current = soundingNotes(score, part.id, bar).map((event) => event.soundingMidi! % 12).sort((a, b) => a - b);
        const skipped = soundingNotes(score, part.id, previousBar);
        const earlierBar = bars[index - 2];
        if (!current.length || skipped.length || earlierBar === undefined) return false;
        const earlier = soundingNotes(score, part.id, earlierBar).map((event) => event.soundingMidi! % 12).sort((a, b) => a - b);
        return earlier.length > 0 && earlier.join(',') === current.join(',');
      });
      if (echoed) events.push({ bar, label: 'timbral_echo' });
    }
    if (index >= 2) {
      const older = bars[index - 2]!;
      const mid = familyKey(score, activeAt(previousBar));
      const currentKey = familyKey(score, activeAt(bar));
      const olderKey = familyKey(score, activeAt(older));
      if (currentKey && currentKey === olderKey && currentKey !== mid) events.push({ bar, label: 'timbral_juxtaposition' });
    }
  }
  return events;
}

export function orchestrationReportSha256(report: OrchestrationReport): string {
  return sha256Text(stableJson(report));
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) out[key] = sortValue(source[key]);
    return out;
  }
  return value;
}
