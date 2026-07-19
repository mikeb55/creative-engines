/**
 * Phase-1 schema + derived-field consistency checks for RiffPhraseEntry.
 * No GPX I/O. No melody-path reads.
 */

import {
  RIFF_PHRASE_CATEGORIES,
  type RiffPhraseCategory,
  type RiffPhraseEntry,
  type RiffPhraseIngestAuditRow,
  type RiffPhraseScoreEvent,
} from './riffPhraseLibraryTypes';

const START_TYPES = new Set(['pickup', 'downbeat', 'syncopated', 'rest_lead']);
const END_TYPES = new Set(['sustain', 'rest', 'leap_off', 'chromatic_resolve', 'open']);
const CATEGORY_SET = new Set(RIFF_PHRASE_CATEGORIES as readonly string[]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function contourFromInterval(semitones: number): number {
  if (semitones > 0) return 1;
  if (semitones < 0) return -1;
  return 0;
}

/** Notes only, in time order (rests skipped for interval derivation). */
export function pitchedEvents(
  events: RiffPhraseScoreEvent[]
): Array<{ pitch: number; startBeat: number; duration: number }> {
  return events
    .filter((e): e is Extract<RiffPhraseScoreEvent, { kind: 'note' }> => e.kind === 'note')
    .map((e) => ({ pitch: e.pitch, startBeat: e.startBeat, duration: e.duration }))
    .sort((a, b) => a.startBeat - b.startBeat);
}

export function deriveIntervalSequence(events: RiffPhraseScoreEvent[]): number[] {
  const notes = pitchedEvents(events);
  const out: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    out.push(notes[i]!.pitch - notes[i - 1]!.pitch);
  }
  return out;
}

export function deriveContour(intervals: number[]): number[] {
  return intervals.map(contourFromInterval);
}

export function deriveAttackPositions(events: RiffPhraseScoreEvent[]): number[] {
  return pitchedEvents(events).map((n) => n.startBeat);
}

export function validateRiffPhraseEntry(
  raw: unknown
): { ok: true; entry: RiffPhraseEntry } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['root must be object'] };

  const id = raw.id;
  if (typeof id !== 'string' || id.length === 0) errors.push('id required');

  const category = raw.category;
  if (typeof category !== 'string' || !CATEGORY_SET.has(category)) {
    errors.push('category must be one of ' + RIFF_PHRASE_CATEGORIES.join('|'));
  }

  if (typeof raw.sourceCourse !== 'string' || !raw.sourceCourse) errors.push('sourceCourse required');

  if (!isRecord(raw.sourceFile)) {
    errors.push('sourceFile required');
  } else {
    if (typeof raw.sourceFile.name !== 'string' || !raw.sourceFile.name) errors.push('sourceFile.name required');
    if (typeof raw.sourceFile.sha256 !== 'string' || !raw.sourceFile.sha256) {
      errors.push('sourceFile.sha256 required');
    }
  }

  if (typeof raw.barCount !== 'number' || !(raw.barCount > 0) || !Number.isInteger(raw.barCount)) {
    errors.push('barCount must be positive int');
  }

  if (!isRecord(raw.meter)) {
    errors.push('meter required');
  } else {
    if (typeof raw.meter.numerator !== 'number' || raw.meter.numerator < 1) errors.push('meter.numerator invalid');
    if (typeof raw.meter.denominator !== 'number' || raw.meter.denominator < 1) {
      errors.push('meter.denominator invalid');
    }
  }

  if (!Array.isArray(raw.noteEvents) || raw.noteEvents.length === 0) {
    errors.push('noteEvents must be non-empty array');
  } else {
    for (let i = 0; i < raw.noteEvents.length; i++) {
      const ev = raw.noteEvents[i];
      if (!isRecord(ev) || (ev.kind !== 'note' && ev.kind !== 'rest')) {
        errors.push('noteEvents[' + i + '] kind must be note|rest');
        continue;
      }
      if (typeof ev.startBeat !== 'number' || typeof ev.duration !== 'number') {
        errors.push('noteEvents[' + i + '] startBeat/duration required');
      }
      if (ev.kind === 'note' && typeof ev.pitch !== 'number') {
        errors.push('noteEvents[' + i + '] pitch required');
      }
    }
  }

  const reqNumArr = (key: string) => {
    const arr = raw[key];
    if (!Array.isArray(arr) || !arr.every((x: unknown) => typeof x === 'number')) {
      errors.push(key + ' must be number[]');
    }
  };
  reqNumArr('intervalSequence');
  reqNumArr('contour');
  reqNumArr('rhythmicCell');
  reqNumArr('attackPositions');
  reqNumArr('strongBeatTargets');

  if (!Array.isArray(raw.restMask) || !raw.restMask.every((x: unknown) => typeof x === 'boolean')) {
    errors.push('restMask must be boolean[]');
  }

  if (typeof raw.phraseStartType !== 'string' || !START_TYPES.has(raw.phraseStartType)) {
    errors.push('phraseStartType invalid');
  }
  if (typeof raw.phraseEndType !== 'string' || !END_TYPES.has(raw.phraseEndType)) {
    errors.push('phraseEndType invalid');
  }

  for (const k of [
    'cadenceStrength',
    'registerLow',
    'registerHigh',
    'registerCenter',
    'chromaticityScore',
  ] as const) {
    if (typeof raw[k] !== 'number') errors.push(k + ' must be number');
  }
  if (typeof raw.cadenceStrength === 'number' && (raw.cadenceStrength < 0 || raw.cadenceStrength > 1)) {
    errors.push('cadenceStrength must be 0-1');
  }
  if (
    typeof raw.chromaticityScore === 'number' &&
    (raw.chromaticityScore < 0 || raw.chromaticityScore > 1)
  ) {
    errors.push('chromaticityScore must be 0-1');
  }

  if (!isRecord(raw.leapProfile)) {
    errors.push('leapProfile required');
  } else {
    if (typeof raw.leapProfile.maxLeap !== 'number') errors.push('leapProfile.maxLeap required');
    if (typeof raw.leapProfile.leapRate !== 'number') errors.push('leapProfile.leapRate required');
    if (!isRecord(raw.leapProfile.leapSemitoneHist)) errors.push('leapProfile.leapSemitoneHist required');
  }

  if (!isRecord(raw.ornamentFlags)) {
    errors.push('ornamentFlags required');
  } else {
    for (const k of ['slides', 'ghosts', 'graceAttacks', 'bends', 'deadNotes'] as const) {
      if (typeof raw.ornamentFlags[k] !== 'boolean') errors.push('ornamentFlags.' + k + ' must be boolean');
    }
  }

  if (
    !Array.isArray(raw.inferredHarmonyHints) ||
    !raw.inferredHarmonyHints.every((x: unknown) => typeof x === 'string')
  ) {
    errors.push('inferredHarmonyHints must be string[]');
  }
  if (!Array.isArray(raw.tags) || !raw.tags.every((x: unknown) => typeof x === 'string')) {
    errors.push('tags must be string[]');
  }

  if (errors.length === 0 && Array.isArray(raw.noteEvents) && Array.isArray(raw.intervalSequence)) {
    const derived = deriveIntervalSequence(raw.noteEvents as RiffPhraseScoreEvent[]);
    const stored = raw.intervalSequence as number[];
    if (derived.length !== stored.length || derived.some((v, i) => v !== stored[i])) {
      errors.push(
        'intervalSequence mismatch vs noteEvents (derived=[' +
          derived.join(',') +
          '] stored=[' +
          stored.join(',') +
          '])'
      );
    }
    const derivedContour = deriveContour(derived);
    const storedContour = raw.contour as number[];
    if (
      Array.isArray(storedContour) &&
      (derivedContour.length !== storedContour.length ||
        derivedContour.some((v, i) => v !== storedContour[i]))
    ) {
      errors.push('contour mismatch vs intervalSequence');
    }
    const derivedAttacks = deriveAttackPositions(raw.noteEvents as RiffPhraseScoreEvent[]);
    const storedAttacks = raw.attackPositions as number[];
    if (
      Array.isArray(storedAttacks) &&
      (derivedAttacks.length !== storedAttacks.length ||
        derivedAttacks.some((v, i) => Math.abs(v - (storedAttacks[i] ?? NaN)) > 1e-9))
    ) {
      errors.push('attackPositions mismatch vs noteEvents');
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, entry: raw as unknown as RiffPhraseEntry };
}

export function validateRiffPhraseIngestAuditRow(
  raw: unknown
): { ok: true; row: RiffPhraseIngestAuditRow } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['row must be object'] };
  if (typeof raw.file !== 'string') errors.push('file');
  if (typeof raw.parseOk !== 'boolean') errors.push('parseOk');
  for (const k of [
    'trackCount',
    'voiceCount',
    'barsIn',
    'phrasesOut',
    'droppedOrnaments',
    'tieFixups',
  ] as const) {
    if (typeof raw[k] !== 'number') errors.push(k);
  }
  if (typeof raw.meterMismatch !== 'boolean') errors.push('meterMismatch');
  if (typeof raw.hash !== 'string') errors.push('hash');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, row: raw as unknown as RiffPhraseIngestAuditRow };
}

export function isRiffPhraseCategory(v: string): v is RiffPhraseCategory {
  return CATEGORY_SET.has(v);
}