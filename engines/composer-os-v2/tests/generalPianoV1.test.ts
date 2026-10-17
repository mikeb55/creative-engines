/**
 * General Piano V1 acceptance tests.
 * The 8-bar fixture and Coffee Run stay on their own entry points.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { persistPianoComposition } from '../app-api/pianoCompositionPersist';
import { pianoMidiNotes, writePianoScoreMidi } from '../core/piano/pianoMidi';
import { comparePianoScoreToXml } from '../core/piano/pianoXmlOracle';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import {
  validateLhDevelopment,
  validatePianoIndependence,
  validatePianoPlayability,
  validatePianoTies,
} from '../core/piano/pianoValidation';
import { pianoGrandStaffConfig } from '../core/piano/pianoTypes';

type Row = { name: string; ok: boolean; detail?: string };

function row(name: string, ok: boolean, detail?: string): Row {
  return { name, ok, detail };
}

const CYCLE_C = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'Cmaj7'] as const;
const CYCLE_A = ['Am7', 'Dm7', 'E7', 'Am7', 'Fmaj7', 'Cmaj7', 'Dm7', 'E7'] as const;
const OTHER_C = ['Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Bbmaj7'] as const;

function progression(bars: number, kind: 'C' | 'Am' | 'other'): string[] {
  const source = kind === 'C' ? CYCLE_C : kind === 'Am' ? CYCLE_A : OTHER_C;
  const out: string[] = [];
  for (let index = 0; index < bars; index += 1) out.push(source[index % source.length]!);
  const tonic = kind === 'Am' ? 'Am7' : kind === 'other' ? 'Fmaj7' : 'Cmaj7';
  out[0] = tonic;
  const returnIndex = bars === 8 ? 6 : bars === 16 ? 12 : 20;
  out[returnIndex] = tonic;
  out[bars - 2] = tonic;
  out[bars - 1] = tonic;
  return out;
}

function request(seed: number, bars: number, extra: Record<string, unknown> = {}) {
  const centre = extra.tonalCentre === 'Am' ? 'Am' : 'C';
  const kind = centre === 'Am' ? 'Am' : 'C';
  return {
    pianoCompositionV1: true,
    generalPianoV1: true,
    seed,
    bars,
    tempo: 64,
    tonalCentre: centre,
    harmony: progression(bars, kind),
    metre: '4/4',
    ...extra,
  };
}

function notes(score: ScoreModel, voice: number): NoteEvent[] {
  const part = score.parts[0];
  if (!part) return [];
  const out: NoteEvent[] = [];
  for (const measure of part.measures) {
    for (const event of measure.events) {
      if (event.kind === 'note' && (event.voice ?? 1) === voice) out.push(event);
    }
  }
  return out;
}

function signature(score: ScoreModel): string {
  return notes(score, 1).concat(notes(score, 3)).map((note) => (
    `${note.voice}:${note.startBeat}:${note.duration}:${note.pitch}:${(note.pitches ?? []).join('+')}`
  )).join('|');
}

function rhythm(score: ScoreModel, bar: number, voice: number): string {
  const measure = score.parts[0]?.measures[bar - 1];
  return (measure?.events ?? [])
    .filter((event) => event.kind === 'note' && (event.voice ?? 1) === voice)
    .map((event) => event.kind === 'note' ? `${event.startBeat}:${event.duration}` : '')
    .join(',');
}

function mod12(pitch: number): number {
  return ((pitch % 12) + 12) % 12;
}

const TONE: Record<string, number[]> = {
  Cmaj7: [0, 4, 7, 11],
  Am7: [9, 0, 4, 7],
  Dm7: [2, 5, 9, 0],
  G7: [7, 11, 2, 5],
  Fmaj7: [5, 9, 0, 4],
  Em7: [4, 7, 11, 2],
  E7: [4, 8, 11, 2],
  Bbmaj7: [10, 2, 5, 9],
};

function strongBeatsMatch(score: ScoreModel): boolean {
  const part = score.parts[0];
  if (!part) return false;
  return part.measures.every((measure) => {
    const tones = TONE[measure.chord ?? ''] ?? [];
    return measure.events.every((event) => {
      if (event.kind !== 'note') return true;
      const voice = event.voice ?? 1;
      const strong = Math.abs(event.startBeat % 2) < 1e-6;
      const pitches = [event.pitch, ...(event.pitches ?? [])];
      if (voice === 3) return pitches.every((pitch) => tones.includes(mod12(pitch)));
      if (voice === 1 && strong) return pitches.every((pitch) => tones.includes(mod12(pitch)));
      return true;
    });
  });
}

function voiceSums(score: ScoreModel): boolean {
  const part = score.parts[0];
  if (!part) return false;
  return part.measures.every((measure) => {
    const sums = new Map<number, number>();
    for (const event of measure.events) {
      const voice = event.voice ?? 1;
      sums.set(voice, (sums.get(voice) ?? 0) + event.duration);
    }
    return [...sums.values()].every((sum) => Math.abs(sum - 4) < 1e-6);
  });
}

export function runGeneralPianoV1Tests(): Row[] {
  const rows: Row[] = [];
  const eight = apiComposePianoV1(request(76018, 8));
  const sixteen = apiComposePianoV1(request(76018, 16, { tempo: 96 }));
  const twentyFour = apiComposePianoV1(request(76018, 24, { tempo: 64 }));
  const twentyFourSlow = apiComposePianoV1(request(76018, 24, { tempo: 80 }));
  rows.push(row('8-bar general path composes', eight.ok, eight.ok ? '' : eight.error));
  rows.push(row('16-bar general path composes', sixteen.ok, sixteen.ok ? '' : sixteen.error));
  rows.push(row('24-bar general path composes', twentyFour.ok, twentyFour.ok ? '' : twentyFour.error));
  rows.push(row('24-bar alternate tempo composes', twentyFourSlow.ok, twentyFourSlow.ok ? '' : twentyFourSlow.error));

  if (eight.ok && sixteen.ok && twentyFour.ok && twentyFourSlow.ok) {
    rows.push(row(
      'bar counts match the request',
      eight.score.parts[0]?.measures.length === 8
        && sixteen.score.parts[0]?.measures.length === 16
        && twentyFour.score.parts[0]?.measures.length === 24,
    ));
    rows.push(row(
      '24 bars at 64 last 90 seconds and 80 lasts 72',
      twentyFour.elapsedSeconds === 90 && twentyFourSlow.elapsedSeconds === 72,
      `${twentyFour.elapsedSeconds}, ${twentyFourSlow.elapsedSeconds}`,
    ));
    rows.push(row(
      'tempo change keeps 4-beat bar sums',
      voiceSums(twentyFour.score) && voiceSums(twentyFourSlow.score)
        && twentyFour.score.timeSignature?.beats === 4
        && twentyFourSlow.score.tempo === 80,
    ));
    rows.push(row('8-bar elapsed duration follows tempo', eight.elapsedSeconds === 30, String(eight.elapsedSeconds)));
    rows.push(row('16-bar elapsed duration follows tempo', sixteen.elapsedSeconds === 40, String(sixteen.elapsedSeconds)));

    const replay = apiComposePianoV1(request(76018, 24));
    const seed19 = apiComposePianoV1(request(76019, 24));
    const seed20 = apiComposePianoV1(request(76020, 24));
    rows.push(row('seed 76019 composes', seed19.ok, seed19.ok ? '' : seed19.error));
    rows.push(row('seed 76020 composes', seed20.ok, seed20.ok ? '' : seed20.error));
    if (replay.ok && seed19.ok && seed20.ok) {
      rows.push(row('same seed repeats the XML', replay.xml === twentyFour.xml));
      const a = signature(twentyFour.score);
      const b = signature(seed19.score);
      const c = signature(seed20.score);
      rows.push(row(
        'three seeds change sounding note events',
        a !== b && a !== c && b !== c,
      ));
      for (const [name, piece] of [
        ['76018', twentyFour],
        ['76019', seed19],
        ['76020', seed20],
      ] as const) {
        const play = validatePianoPlayability(piece.score, 64);
        const independent = validatePianoIndependence(piece.score);
        const developed = validateLhDevelopment(piece.score);
        const ties = validatePianoTies(piece.score);
        const math = validateStrictBarMath(piece.score);
        rows.push(row(
          `seed ${name} stays playable, independent and grammatical`,
          play.ok && independent.ok && developed.ok && ties.ok && math.valid && strongBeatsMatch(piece.score),
          [...play.errors, ...independent.errors, ...developed.errors, ...ties.errors, ...math.errors].slice(0, 4).join(' | '),
        ));
      }
      const returnBar = twentyFour.plan.returnBar;
      rows.push(row(
        'return keeps the opening rhythm and intervals',
        rhythm(twentyFour.score, 1, 1) === rhythm(twentyFour.score, returnBar, 1)
          && JSON.stringify(twentyFour.plan.general?.openingIntervals) === JSON.stringify(twentyFour.plan.general?.returnIntervals)
          && rhythm(twentyFour.score, 1, 1).length > 0,
        `bar1 ${rhythm(twentyFour.score, 1, 1)} return ${rhythm(twentyFour.score, returnBar, 1)}`,
      ));
      const openingDurations = notes(twentyFour.score, 1).slice(0, 4).map((note) => note.duration);
      const developedDurations = twentyFour.plan.general?.developmentDurations ?? [];
      rows.push(row(
        'development changes durations',
        developedDurations.length > 0
          && developedDurations.join(',') !== openingDurations.join(',')
          && developedDurations.some((duration) => openingDurations.some((original) => Math.abs(duration - original * 2) < 1e-6)),
        `open ${openingDurations.join(',')} dev ${developedDurations.join(',')}`,
      ));
      const phaseSet = new Set(twentyFour.plan.general?.phases ?? []);
      rows.push(row(
        'form includes statement, contrast, return and ending',
        phaseSet.has('statement') && phaseSet.has('contrast') && phaseSet.has('return') && phaseSet.has('ending') && phaseSet.has('development'),
      ));
      const rhRefs = new Set(notes(twentyFour.score, 1).map((note) => note.motifRef));
      rows.push(row(
        'motif identity is written on the right hand',
        rhRefs.has('m1') && [...rhRefs].some((ref) => ref?.includes('return')),
        [...rhRefs].join(','),
      ));
      const restCount = twentyFour.score.parts[0]?.measures.reduce((sum, measure) => (
        sum + measure.events.filter((event) => event.kind === 'rest').length
      ), 0) ?? 0;
      rows.push(row('rests are present', restCount > 0, String(restCount)));
      const tieStart = twentyFour.score.parts[0]?.measures[22]?.events.find((event) => event.kind === 'note' && event.notation?.tie === 'start');
      const tieStop = twentyFour.score.parts[0]?.measures[23]?.events.find((event) => event.kind === 'note' && event.notation?.tie === 'stop');
      rows.push(row(
        'final bars tie one left-hand attack',
        tieStart?.kind === 'note' && tieStop?.kind === 'note' && tieStart.pitch === tieStop.pitch,
      ));

      const centre = apiComposePianoV1(request(76018, 8, { tonalCentre: 'Am', harmony: progression(8, 'Am') }));
      rows.push(row('A minor centre composes', centre.ok, centre.ok ? '' : centre.error));
      if (centre.ok) {
        rows.push(row(
          'tonal centre changes sounding pitches',
          signature(eight.score) !== signature(centre.score)
            && centre.plan.general?.tonalCentre === 'Am'
            && eight.plan.general?.tonalCentre === 'C'
            && centre.score.keySignature?.mode === 'minor'
            && eight.score.keySignature?.mode === 'major',
        ));
      }

      const otherHarmony = apiComposePianoV1(request(76018, 8, { harmony: progression(8, 'other') }));
      rows.push(row('second progression composes', otherHarmony.ok, otherHarmony.ok ? '' : otherHarmony.error));
      if (otherHarmony.ok) {
        const leftA = notes(eight.score, 3).map((note) => note.pitch).join(',');
        const leftB = notes(otherHarmony.score, 3).map((note) => note.pitch).join(',');
        const rightA = notes(eight.score, 1).map((note) => note.pitch).join(',');
        const rightB = notes(otherHarmony.score, 1).map((note) => note.pitch).join(',');
        rows.push(row(
          'harmony changes left-hand and right-hand pitches',
          leftA !== leftB && rightA !== rightB && eight.score.parts[0]?.measures[0]?.chord !== otherHarmony.score.parts[0]?.measures[0]?.chord,
          `LH ${leftA} vs ${leftB}`,
        ));
        rows.push(row(
          'changed chords still own their strong-beat pitches',
          strongBeatsMatch(otherHarmony.score) && strongBeatsMatch(eight.score),
        ));
      }

      const oracle = comparePianoScoreToXml(twentyFour.score, twentyFour.xml);
      rows.push(row('24-bar XML oracle matches the score', oracle.ok, oracle.errors.slice(0, 3).join(' | ')));
      const midiDir = mkdtempSync(join(tmpdir(), 'general-piano-v1-'));
      const midiPath = join(midiDir, 'seed76018.mid');
      writePianoScoreMidi(twentyFour.score, midiPath);
      const midi = pianoMidiNotes(midiPath);
      const xmlKeys = oracle.sounding
        .filter((event) => !event.rest && event.midi !== null)
        .map((event) => `${event.midi}:${Math.round(event.onset * midi.ppq)}:${Math.round(event.duration * midi.ppq)}`)
        .sort();
      const midiKeys = midi.notes.map((note) => `${note.midi}:${note.ticks}:${note.durationTicks}`).sort();
      const endTicks = 24 * 4 * midi.ppq;
      const lastOff = midi.notes.reduce((max, note) => Math.max(max, note.ticks + note.durationTicks), 0);
      const tieOff = (22 * 4 + 2) * midi.ppq;
      rows.push(row(
        'MIDI sounding events match MusicXML',
        xmlKeys.join('|') === midiKeys.join('|'),
        `xml ${xmlKeys.length} midi ${midiKeys.length}`,
      ));
      rows.push(row(
        'last-bar note-off reaches the final beat and the tie releases mid-bar',
        lastOff === endTicks && midi.notes.some((note) => note.ticks + note.durationTicks === tieOff),
        `last ${lastOff} end ${endTicks}`,
      ));
      rows.push(row(
        'hands are not the same line',
        notes(twentyFour.score, 1).length > 0 && notes(twentyFour.score, 3).length > 0
          && notes(twentyFour.score, 1).length !== notes(twentyFour.score, 3).length,
        `RH ${notes(twentyFour.score, 1).length} LH ${notes(twentyFour.score, 3).length}`,
      ));
    }
  }

  const metre = apiComposePianoV1(request(76018, 8, { metre: '3/4' }));
  const meter = apiComposePianoV1(request(76018, 8, { meter: '6/8' }));
  const time = apiComposePianoV1(request(76018, 8, { timeSignature: { beats: 3, beatType: 4 } }));
  rows.push(row('3/4 is rejected', metre.ok === false && metre.code === 'bad_request'));
  rows.push(row('6/8 is rejected', meter.ok === false && meter.code === 'bad_request'));
  rows.push(row('3/4 time signature is rejected', time.ok === false && time.code === 'bad_request'));
  const badChord = apiComposePianoV1(request(76018, 8, { harmony: ['Cxyz', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7'] }));
  const blankChord = apiComposePianoV1(request(76018, 8, { harmony: ['', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7'] }));
  rows.push(row('invalid chord symbol is rejected', badChord.ok === false && badChord.code === 'bad_request', badChord.ok ? '' : badChord.error));
  rows.push(row('blank chord symbol is rejected', blankChord.ok === false && blankChord.code === 'bad_request'));
  const shortHarmony = apiComposePianoV1(request(76018, 8, { harmony: ['Cmaj7', 'G7', 'Cmaj7'] }));
  const longHarmony = apiComposePianoV1(request(76018, 8, { harmony: progression(24, 'C') }));
  rows.push(row('short chord list is rejected', shortHarmony.ok === false && shortHarmony.code === 'bad_request'));
  rows.push(row('long chord list is rejected', longHarmony.ok === false && longHarmony.code === 'bad_request'));
  const bars12 = apiComposePianoV1(request(76018, 12));
  const bars4 = apiComposePianoV1(request(76018, 4));
  rows.push(row('12-bar general request is rejected', bars12.ok === false && bars12.code === 'bad_request'));
  rows.push(row('4-bar general request is rejected', bars4.ok === false && bars4.code === 'bad_request'));
  const slow = apiComposePianoV1(request(76018, 8, { tempo: 47 }));
  const fast = apiComposePianoV1(request(76018, 8, { tempo: 121 }));
  const fuzzy = apiComposePianoV1(request(76018, 8, { tempo: 64.5 }));
  rows.push(row('tempo 47 is rejected', slow.ok === false && slow.code === 'bad_request'));
  rows.push(row('tempo 121 is rejected', fast.ok === false && fast.code === 'bad_request'));
  rows.push(row('non-integer tempo is rejected', fuzzy.ok === false && fuzzy.code === 'bad_request'));
  const centreD = apiComposePianoV1(request(76018, 8, { tonalCentre: 'D' }));
  rows.push(row('unsupported tonal centre is rejected', centreD.ok === false && centreD.code === 'bad_request'));

  const fixture = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018 });
  const longFixture = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, bars: 24 });
  rows.push(row('fixture path still composes 8 bars', fixture.ok && fixture.plan.bars === 8 && fixture.plan.general === undefined));
  rows.push(row('fixture still rejects 24 bars', longFixture.ok === false));

  if (eight.ok) {
    const first = eight.score.parts[0]?.measures[0]?.events.find((event) => event.kind === 'note' && (event.voice ?? 1) === 1);
    const locked = apiComposePianoV1(request(76018, 8, {
      lockedEvents: first && first.kind === 'note'
        ? [{ bar: 1, voice: 1, startBeat: first.startBeat, duration: first.duration, pitch: first.pitch }]
        : [],
    }));
    rows.push(row('matching source lock is kept', locked.ok === true, locked.ok ? '' : locked.error));
    const missed = apiComposePianoV1(request(76018, 8, {
      lockedEvents: [{ bar: 1, voice: 1, startBeat: 0, duration: 1, pitch: 61 }],
    }));
    rows.push(row('mismatched lock is rejected', missed.ok === false && missed.code === 'unsupported_lock'));
    const unplayable = apiComposePianoV1(request(76018, 8, {
      lockedEvents: [{ bar: 1, voice: 1, startBeat: 0, duration: 1, pitch: 20 }],
    }));
    rows.push(row('unplayable lock is rejected', unplayable.ok === false && unplayable.code === 'unsupported_lock'));
  }

  const bare: ScoreModel = {
    title: 'tie grammar',
    tempo: 64,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [{
      id: 'piano',
      name: 'Piano',
      instrumentIdentity: 'piano',
      midiProgram: 0,
      clef: 'treble',
      pianoGrandStaff: pianoGrandStaffConfig(false),
      measures: [
        {
          index: 1,
          events: [
            { kind: 'note', pitch: 48, startBeat: 0, duration: 4, voice: 3, notation: { tie: 'stop' } },
            { kind: 'rest', startBeat: 0, duration: 4, voice: 1 },
          ],
        },
        {
          index: 2,
          events: [
            { kind: 'note', pitch: 50, startBeat: 0, duration: 2, voice: 3 },
            { kind: 'note', pitch: 50, startBeat: 0, duration: 2, voice: 3 },
            { kind: 'rest', startBeat: 2, duration: 2, voice: 3 },
            { kind: 'rest', startBeat: 0, duration: 4, voice: 1 },
          ],
        },
      ],
    }],
  };
  const tieErrors = validatePianoTies(bare);
  rows.push(row(
    'missing and duplicated tie attacks fail',
    tieErrors.ok === false
      && tieErrors.errors.some((error) => error.includes('missing tie attack'))
      && tieErrors.errors.some((error) => error.includes('duplicated tie attack')),
    tieErrors.errors.join(' | '),
  ));

  const persisted = persistPianoComposition(request(76018, 8), mkdtempSync(join(tmpdir(), 'general-piano-persist-')));
  rows.push(row(
    'persist writes a separate general-piano file',
    persisted.ok === true && persisted.filepath.includes('general-piano-v1-seed76018-8bars-64bpm.musicxml'),
    persisted.ok ? persisted.filepath : persisted.error,
  ));

  return rows;
}

if (process.argv[1]?.includes('generalPianoV1.test')) {
  const rows = runGeneralPianoV1Tests();
  for (const item of rows) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
