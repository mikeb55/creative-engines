/**
 * BHL iteration 1 — compare locked source events.
 *
 * `verifyLockedCopy` (`pcLane.ts`) does not verify typed musical events. It checks:
 * - serialized score header (every child of the root except `<part>`)
 * - part count, part ids, and measure counts
 * - full measure serialization for every part that is not the lane part
 * - full measure serialization for lane-part bars outside the span
 * - inside the span, lane-part measure serialization after the lane voice is stripped
 *   (and a `<backup>` immediately before a lane-voice note)
 * - lane-voice fill when that voice is present: onset 0, tick sum equals the source bar
 *   length, bar cursor length unchanged
 * - `loadScore` reimport (`parseScoreDocument` + `importPartwiseMusicXml`)
 *
 * It does not read bass pitch, onset, duration, rest, tie, metre, tempo, rehearsal,
 * direction text, or a protected-guitar bar list. Those comparisons are below.
 * `measureViews` tie flags cover `<tie>` only; attack flags here also read `<tied>`.
 * `absTimeline` bass omits rests and merges tied pitches, so it is a sounding check
 * beside the unmerged `measureViews` events.
 */

import { loadScore } from '../performance-composer/pcScore';
import { extractBhlSnapshot, sha256File } from './bhlIngest';
import type {
  BhlLockReport,
  BhlLockSpec,
  BhlMetreLock,
  BhlSoundingBass,
  BhlSourceEvent,
  BhlTempoLock,
  BhlTextLock,
} from './bhlTypes';

function show(value: unknown): string {
  return JSON.stringify(value);
}

function diffEvents(label: string, source: readonly BhlSourceEvent[], candidate: readonly BhlSourceEvent[]): string[] {
  const errors: string[] = [];
  if (source.length !== candidate.length) errors.push(`${label}: event count ${candidate.length} != ${source.length}`);
  const count = Math.min(source.length, candidate.length);
  for (let index = 0; index < count; index++) {
    const left = source[index]!;
    const right = candidate[index]!;
    const where = `${label} bar ${left.bar} #${index + 1}`;
    const fields: Array<keyof BhlSourceEvent> = [
      'partId',
      'bar',
      'voice',
      'onsetTicks',
      'ticks',
      'divisions',
      'onsetQuarters',
      'quarters',
      'rest',
      'tieStart',
      'tieStop',
    ];
    for (const field of fields) {
      if (left[field] !== right[field]) errors.push(`${where} ${field}: ${show(left[field])} != ${show(right[field])}`);
    }
    if (left.midis.join(',') !== right.midis.join(',')) {
      errors.push(`${where} midis: ${left.midis.join(',')} != ${right.midis.join(',')}`);
    }
  }
  return errors;
}

function diffMetres(source: readonly BhlMetreLock[], candidate: readonly BhlMetreLock[]): string[] {
  const errors: string[] = [];
  if (source.length !== candidate.length) errors.push(`metre: count ${candidate.length} != ${source.length}`);
  const count = Math.min(source.length, candidate.length);
  for (let index = 0; index < count; index++) {
    const left = source[index]!;
    const right = candidate[index]!;
    if (left.partId !== right.partId || left.bar !== right.bar || left.beats !== right.beats || left.beatType !== right.beatType || left.stated !== right.stated) {
      errors.push(
        `metre part ${left.partId} bar ${left.bar}: ${left.beats}/${left.beatType} stated ${left.stated} != ${right.beats}/${right.beatType} stated ${right.stated}`,
      );
    }
  }
  return errors;
}

function diffTempos(source: readonly BhlTempoLock[], candidate: readonly BhlTempoLock[]): string[] {
  const errors: string[] = [];
  if (source.length !== candidate.length) errors.push(`tempo: count ${candidate.length} != ${source.length}`);
  const count = Math.min(source.length, candidate.length);
  for (let index = 0; index < count; index++) {
    const left = source[index]!;
    const right = candidate[index]!;
    const same =
      left.bar === right.bar &&
      left.beatUnit === right.beatUnit &&
      left.perMinute === right.perMinute &&
      left.soundTempo === right.soundTempo &&
      left.statedAtBar === right.statedAtBar &&
      left.statedOnPartId === right.statedOnPartId;
    if (!same) {
      errors.push(
        `tempo bar ${left.bar}: ${left.perMinute ?? ''} sound ${left.soundTempo ?? ''} from ${left.statedOnPartId ?? ''} bar ${left.statedAtBar ?? ''} != ${right.perMinute ?? ''} sound ${right.soundTempo ?? ''} from ${right.statedOnPartId ?? ''} bar ${right.statedAtBar ?? ''}`,
      );
    }
  }
  return errors;
}

function diffTexts(label: string, source: readonly BhlTextLock[], candidate: readonly BhlTextLock[]): string[] {
  const errors: string[] = [];
  if (source.length !== candidate.length) errors.push(`${label}: count ${candidate.length} != ${source.length}`);
  const count = Math.min(source.length, candidate.length);
  for (let index = 0; index < count; index++) {
    const left = source[index]!;
    const right = candidate[index]!;
    if (left.partId !== right.partId || left.bar !== right.bar || left.kind !== right.kind || left.text !== right.text) {
      errors.push(`${label} part ${left.partId} bar ${left.bar} ${left.kind}: ${show(left.text)} != ${show(right.text)}`);
    }
  }
  return errors;
}

function diffSounding(source: readonly BhlSoundingBass[], candidate: readonly BhlSoundingBass[]): string[] {
  const errors: string[] = [];
  if (source.length !== candidate.length) errors.push(`sounding bass: count ${candidate.length} != ${source.length}`);
  const count = Math.min(source.length, candidate.length);
  for (let index = 0; index < count; index++) {
    const left = source[index]!;
    const right = candidate[index]!;
    if (left.startQuarters !== right.startQuarters || left.endQuarters !== right.endQuarters || left.midi !== right.midi) {
      errors.push(
        `sounding bass #${index + 1}: ${left.startQuarters}-${left.endQuarters} midi ${left.midi} != ${right.startQuarters}-${right.endQuarters} midi ${right.midi}`,
      );
    }
  }
  return errors;
}

export function verifyRecordedSourceSha(sourcePath: string, recordedSha256: string): void {
  const live = sha256File(sourcePath);
  if (live !== recordedSha256) {
    throw new Error(`source SHA-256 changed: recorded ${recordedSha256} live ${live}`);
  }
}

export function verifyBhlLocks(sourceXml: string, candidateXml: string, spec: BhlLockSpec): BhlLockReport {
  const errors: string[] = [];
  try {
    const request = {
      span: spec.span,
      bassPartId: spec.bassPartId,
      guitarPartId: spec.guitarPartId,
      protectedGuitarBars: spec.protectedGuitarBars,
    };
    const source = extractBhlSnapshot(sourceXml, request);
    const candidate = extractBhlSnapshot(candidateXml, request);
    errors.push(...diffEvents('bass', source.bass, candidate.bass));
    errors.push(...diffEvents('guitar', source.guitar, candidate.guitar));
    errors.push(...diffMetres(source.metres, candidate.metres));
    errors.push(...diffTempos(source.tempos, candidate.tempos));
    errors.push(...diffTexts('rehearsal', source.rehearsal, candidate.rehearsal));
    errors.push(...diffTexts('structural', source.structural, candidate.structural));
    errors.push(...diffSounding(source.soundingBass, candidate.soundingBass));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  let reimports = true;
  try {
    loadScore(candidateXml);
  } catch (error) {
    reimports = false;
    errors.push(`candidate does not reimport: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { ok: errors.length === 0, errors, reimports };
}
