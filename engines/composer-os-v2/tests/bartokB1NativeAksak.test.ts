/**
 * Bartók B1 opt-in: 9/16, attacks 4+2+3, sounding events survive the duo seal and MusicXML.
 * Flag off stays on the existing 4/4 fingerprint.
 */

import { createHash } from 'node:crypto';
import { runGoldenPathOnce, type RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import {
  BARTOK_BULGARIAN_AKSAK_CELL_SPECS,
  applyBartokB1NativeAksak,
  bartokB1AttackPulses,
  type BartokB1NativeReceipt,
} from '../core/rhythm/bartokBulgarianAksakRhythmEngine';
import { measureDivisionsForMeter } from '../core/rhythm/oddMeterQuantiser';
import { finalizeAndSealDuoScoreBarMath } from '../core/score-integrity/duoBarMathFinalize';
import { createNote, createRest } from '../core/score-model/scoreEventBuilder';
import { DIVISIONS, type MeasureModel, type NoteEvent, type PartModel, type ScoreEvent, type ScoreModel } from '../core/score-model/scoreModelTypes';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import type { CompositionContext } from '../core/compositionContext';

type Row = { name: string; ok: boolean };

const OFF_FP = '3040be53078e4f1857b4d98fb74911591ef033b372ae04da39b439a54449856e';
const Q = 0.25;

export const bartokB1Evidence: string[] = [];

function safeRun(seed: number, opts: RunGoldenPathOptions) {
  try {
    return runGoldenPathOnce(seed, opts);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    bartokB1Evidence.push(`throw ${message.slice(0, 500)}`);
    return undefined;
  }
}

function songOpts(extra: Partial<RunGoldenPathOptions> = {}): RunGoldenPathOptions {
  return {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    styleStack: { primary: 'triad_pairs', weights: { primary: 1 } },
    creativeControlLevel: 'stable',
    chromaticStrength: 'prominent',
    endingContext: 'open_idiom',
    keySignatureMode: 'none',
    primarySongwriterStyle: 'bartok',
    scoreTitle: 'bartok',
    ...extra,
  };
}

function eventDigest(score: ScoreModel | undefined): string {
  const parts = (score?.parts ?? []).map((part) => {
    const notes = part.measures
      .map((measure) =>
        measure.events
          .map((event) => {
            if (event.kind === 'note') return `n${event.pitch}@${event.startBeat}:${event.duration}:v${event.voice ?? 1}`;
            if (event.kind === 'rest') return `r@${event.startBeat}:${event.duration}:v${event.voice ?? 1}`;
            return `c${event.pitches.join('+')}@${event.startBeat}:${event.duration}:v${event.voice}`;
          })
          .join(','),
      )
      .join(';');
    const chords = part.measures.map((measure) => measure.chord ?? '').join('|');
    return `${part.instrumentIdentity}\n${chords}\n${notes}`;
  });
  return createHash('sha256').update(parts.join('\n---\n')).digest('hex');
}

function describe(events: ScoreEvent[]): string {
  return events
    .map((event) => {
      if (event.kind === 'note') {
        return `n${event.pitch}@${event.startBeat}+${event.duration}v${event.voice ?? 1}${event.notation?.tie ? ':' + event.notation.tie : ''}`;
      }
      if (event.kind === 'rest') return `r@${event.startBeat}+${event.duration}v${event.voice ?? 1}`;
      return `c@${event.startBeat}+${event.duration}`;
    })
    .join(' | ');
}

function measure(index: number, span: number, events: ScoreEvent[], chord = 'Cmaj7', preserve = false): MeasureModel {
  return {
    index,
    chord,
    events,
    measureBeatSpanQuarters: span,
    ...(preserve ? { b1PulsePreserve: true as const } : {}),
  };
}

function duoScore(bars: { guitar: MeasureModel; bass: MeasureModel }[], snap: 'eighth_beats' | 'quarter'): ScoreModel {
  const guitar: PartModel = {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: bars.map((bar) => bar.guitar),
  };
  const bass: PartModel = {
    id: 'bass',
    name: 'Bass',
    instrumentIdentity: 'acoustic_upright_bass',
    midiProgram: 43,
    clef: 'bass',
    measures: bars.map((bar) => bar.bass),
  };
  return {
    title: 'B1 fixture',
    tempo: 96,
    timeSignature: { beats: 4, beatType: 4 },
    duoRhythmSnap: snap,
    parts: [guitar, bass],
    barMeterMap: Object.fromEntries(
      bars.map((bar) => {
        const span = bar.guitar.measureBeatSpanQuarters ?? 4;
        return [bar.guitar.index, { numerator: span === 4 ? 4 : 9, denominator: span === 4 ? 4 : 16 }];
      }),
    ),
  };
}

function fixturePair(preserve: boolean): { guitar: MeasureModel; bass: MeasureModel } {
  return {
    guitar: measure(
      1,
      2.25,
      [
        createNote(62, 0, 4 * Q, 1),
        createNote(64, 4 * Q, 2 * Q, 1),
        createNote(69, 6 * Q, 3 * Q, 1),
        createRest(0, 3 * Q, 2),
        createNote(67, 3 * Q, 4 * Q, 2),
        createRest(7 * Q, 2 * Q, 2),
      ],
      'Dmin9',
      preserve,
    ),
    bass: measure(
      1,
      2.25,
      [createRest(0, 2 * Q, 1), createNote(38, 2 * Q, 3 * Q, 1), createNote(41, 5 * Q, 4 * Q, 1)],
      'Dmin9',
      preserve,
    ),
  };
}

function ticksOf(start: number, duration: number): { start: number; duration: number } {
  return {
    start: Math.round(start * DIVISIONS),
    duration: Math.round(duration * DIVISIONS),
  };
}

interface Sounding {
  pitch: number | null;
  start: number;
  duration: number;
  tieIn: boolean;
  tieOut: boolean;
}

function soundingFromEvents(events: ScoreEvent[], voice: number): Sounding[] {
  const sorted = events.filter((event) => (event.voice ?? 1) === voice).sort((a, b) => a.startBeat - b.startBeat);
  const out: Sounding[] = [];
  for (const event of sorted) {
    const ticks = ticksOf(event.startBeat, event.duration);
    if (event.kind === 'rest') {
      out.push({ pitch: null, start: ticks.start, duration: ticks.duration, tieIn: false, tieOut: false });
      continue;
    }
    if (event.kind !== 'note') continue;
    const tie = event.notation?.tie;
    const prev = out[out.length - 1];
    const continues =
      (tie === 'stop' || tie === 'continue') &&
      prev !== undefined &&
      prev.pitch === event.pitch &&
      prev.start + prev.duration === ticks.start;
    if (continues && prev) {
      prev.duration += ticks.duration;
      prev.tieOut = tie === 'start' || tie === 'continue';
      continue;
    }
    out.push({
      pitch: event.pitch,
      start: ticks.start,
      duration: ticks.duration,
      tieIn: tie === 'stop' || tie === 'continue',
      tieOut: tie === 'start' || tie === 'continue',
    });
  }
  return out;
}

function attacksOf(sounding: Sounding[]): number[] {
  return sounding.filter((event) => event.pitch !== null && !event.tieIn).map((event) => event.start);
}

interface XmlNote {
  voice: number;
  pitch: number | null;
  start: number;
  duration: number;
  ties: string[];
  chord: boolean;
}

function midiOf(step: string, alter: number, octave: number): number {
  const base = [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(step)] ?? 0;
  return (octave + 1) * 12 + base + alter;
}

function parseXmlPart(partXml: string): { measures: XmlNote[][]; times: string[] } {
  const chunks = partXml.split(/<measure\b/);
  const measures: XmlNote[][] = [];
  const times: string[] = [];
  for (const chunk of chunks.slice(1)) {
    const time = chunk.match(/<beats>(\d+)<\/beats>\s*<beat-type>(\d+)<\/beat-type>/);
    times.push(time ? `${time[1]}/${time[2]}` : '');
    const body = chunk.split('</measure>')[0] ?? '';
    const tokens = [...body.matchAll(/<backup>[\s\S]*?<\/backup>|<forward>[\s\S]*?<\/forward>|<note\b[\s\S]*?<\/note>/g)];
    let cursor = 0;
    const notes: XmlNote[] = [];
    for (const token of tokens) {
      const xml = token[0];
      const duration = Number(xml.match(/<duration>(\d+)<\/duration>/)?.[1] ?? 0);
      if (xml.startsWith('<backup>')) {
        cursor -= duration;
        continue;
      }
      if (xml.startsWith('<forward>')) {
        cursor += duration;
        continue;
      }
      const voice = Number(xml.match(/<voice>(\d+)<\/voice>/)?.[1] ?? 1);
      const chord = xml.includes('<chord/>');
      const rest = xml.includes('<rest/>') || xml.includes('<rest ');
      const step = xml.match(/<step>([A-G])<\/step>/)?.[1];
      const alter = Number(xml.match(/<alter>(-?\d+)<\/alter>/)?.[1] ?? 0);
      const octave = Number(xml.match(/<octave>(\d+)<\/octave>/)?.[1] ?? 0);
      const ties = [...xml.matchAll(/<tie type="(start|stop)"\/>/g)].map((match) => match[1]!);
      const start = chord ? (notes[notes.length - 1]?.start ?? cursor) : cursor;
      notes.push({
        voice,
        pitch: rest || !step ? null : midiOf(step, alter, octave),
        start,
        duration,
        ties,
        chord,
      });
      if (!chord) cursor += duration;
    }
    measures.push(notes);
  }
  return { measures, times };
}

function xmlSounding(notes: XmlNote[], voice: number): Sounding[] {
  const out: Sounding[] = [];
  for (const note of notes.filter((item) => item.voice === voice && !item.chord)) {
    if (note.pitch === null) {
      const prevRest = out[out.length - 1];
      if (prevRest && prevRest.pitch === null && prevRest.start + prevRest.duration === note.start) {
        prevRest.duration += note.duration;
        continue;
      }
      out.push({ pitch: null, start: note.start, duration: note.duration, tieIn: false, tieOut: false });
      continue;
    }
    const tieIn = note.ties.includes('stop');
    const tieOut = note.ties.includes('start');
    const prev = out[out.length - 1];
    if (tieIn && prev && prev.pitch === note.pitch && prev.start + prev.duration === note.start) {
      prev.duration += note.duration;
      prev.tieOut = prev.tieOut || tieOut;
      continue;
    }
    out.push({ pitch: note.pitch, start: note.start, duration: note.duration, tieIn, tieOut });
  }
  return out;
}

function voiceSum(notes: XmlNote[], voice: number): number {
  return notes.filter((note) => note.voice === voice && !note.chord).reduce((sum, note) => sum + note.duration, 0);
}

function contextStub(extra: Partial<CompositionContext['generationMetadata']> = {}): CompositionContext {
  return {
    presetId: 'guitar_bass_duo',
    seed: 1,
    generationMetadata: {
      generatedAt: 'test',
      songwriterStyleId: 'bartok',
      bartokB1Aksak: true,
      bartokB1Bars: [1],
      ...extra,
    },
  } as CompositionContext;
}

export function runBartokB1NativeAksakTests(): Row[] {
  const out: Row[] = [];
  const t = (name: string, ok: boolean) => out.push({ name, ok });
  const cell = BARTOK_BULGARIAN_AKSAK_CELL_SPECS.B1;
  t(
    'B1 contract is 4+2+3 sixteenths, not 9/8',
    cell.pulseBase === '16th' &&
      cell.vector.join('+') === '4+2+3' &&
      cell.totalPulses === 9 &&
      measureDivisionsForMeter(9, 16) === 1080 &&
      measureDivisionsForMeter(9, 8) === 2160,
  );

  const before = fixturePair(true);
  bartokB1Evidence.push(`before guitar ${describe(before.guitar.events)}`);
  bartokB1Evidence.push(`before bass ${describe(before.bass.events)}`);
  const sealed = duoScore([fixturePair(true)], 'eighth_beats');
  let sealedOk = true;
  try {
    finalizeAndSealDuoScoreBarMath(sealed);
  } catch (error) {
    sealedOk = false;
    bartokB1Evidence.push(`seal threw ${error instanceof Error ? error.message : String(error)}`);
  }
  const g = sealed.parts[0]!.measures[0]!;
  const b = sealed.parts[1]!.measures[0]!;
  bartokB1Evidence.push(`after guitar ${describe(g.events)}`);
  bartokB1Evidence.push(`after bass ${describe(b.events)}`);
  const g1 = soundingFromEvents(g.events, 1);
  const g2 = soundingFromEvents(g.events, 2);
  const bassSound = soundingFromEvents(b.events, 1);
  const gAttacks = attacksOf(g1);
  const bAttacks = attacksOf(bassSound);
  t(
    'fixture seal keeps three guitar attacks and two bass attacks',
    sealedOk &&
      gAttacks.join(',') === '0,480,720' &&
      bAttacks.join(',') === '240,600' &&
      attacksOf(g2).join(',') === '360' &&
      g1.map((event) => event.duration).join(',') === '480,240,360' &&
      bassSound.filter((event) => event.pitch !== null).map((event) => event.duration).join(',') === '360,480' &&
      g1.every((event) => event.pitch !== null) &&
      [g1, g2, bassSound].every((line) => line.reduce((sum, event) => sum + event.duration, 0) === 1080),
  );
  const third = g1[2];
  t(
    'third guitar group is one sounding 360-tick event',
    third?.pitch === 69 && third.duration === 360 && third.start === 720 && g.events.filter((event) => event.kind === 'note' && (event.voice ?? 1) === 1 && event.pitch === 69).length >= 1 &&
      bartokB1AttackPulses(g.events, 1).join(',') === '0,4,6',
  );

  const bare = duoScore([fixturePair(false)], 'eighth_beats');
  let bareAttacks = '';
  try {
    finalizeAndSealDuoScoreBarMath(bare);
    bareAttacks = attacksOf(soundingFromEvents(bare.parts[0]!.measures[0]!.events, 1)).join(',');
  } catch (error) {
    bareAttacks = error instanceof Error ? error.message : 'threw';
  }
  bartokB1Evidence.push(`unscoped seal ${bareAttacks}`);
  t('eighth snap alone does not keep the B1 attacks', bareAttacks !== '0,480,720');

  const untied = g.events.map((event) =>
    event.kind === 'note' ? { ...event, notation: undefined } : event,
  );
  t(
    'dropping the split ties invents a fourth guitar attack',
    bartokB1AttackPulses(untied, 1).join(',') !== '0,4,6',
  );

  const samePitch = duoScore(
    [
      {
        guitar: measure(1, 2.25, [createNote(62, 0, 1, 1), createNote(62, 1, 0.5, 1), createRest(1.5, 0.75, 1)], 'C', true),
        bass: measure(1, 2.25, [createRest(0, 2.25, 1)], 'C', true),
      },
    ],
    'eighth_beats',
  );
  finalizeAndSealDuoScoreBarMath(samePitch);
  t(
    'equal pitches without a tie stay separate attacks',
    bartokB1AttackPulses(samePitch.parts[0]!.measures[0]!.events, 1).join(',') === '0,4',
  );

  const tied = duoScore(
    [
      {
        guitar: measure(1, 4, [createRest(0, 3, 1), createNote(60, 3, 1, 1)], 'C', false),
        bass: measure(1, 4, [createRest(0, 4, 1)], 'C', false),
      },
      {
        guitar: measure(
          2,
          2.25,
          [
            createNote(60, 0, 1, 1),
            createNote(64, 1, 0.5, 1),
            createNote(69, 1.5, 0.75, 1),
          ],
          'C',
          true,
        ),
        bass: measure(2, 2.25, [createRest(0, 2.25, 1)], 'C', true),
      },
    ],
    'eighth_beats',
  );
  const tieNote = tied.parts[0]!.measures[0]!.events[1] as NoteEvent;
  tieNote.notation = { tie: 'start' };
  (tied.parts[0]!.measures[1]!.events[0] as NoteEvent).notation = { tie: 'stop' };
  finalizeAndSealDuoScoreBarMath(tied);
  const bar1Tie = tied.parts[0]!.measures[0]!.events.find((event) => event.kind === 'note') as NoteEvent | undefined;
  const bar2 = soundingFromEvents(tied.parts[0]!.measures[1]!.events, 1);
  t(
    'cross-bar tie survives and does not reattack the continuation',
    bar1Tie?.notation?.tie === 'start' && bar2[0]?.pitch === 60 && bar2[0].tieIn && attacksOf(bar2).join(',') === '480,720',
  );

  const xml = exportScoreModelToMusicXml(sealed, { barMeterMap: sealed.barMeterMap }).xml ?? '';
  const parts = [...xml.matchAll(/<part id="([^"]+)">[\s\S]*?<\/part>/g)].map((match) => match[0]);
  const parsed = parts.map(parseXmlPart);
  const gXml = xmlSounding(parsed[0]?.measures[0] ?? [], 1);
  const bXml = xmlSounding(parsed[1]?.measures[0] ?? [], 1);
  const g2Xml = xmlSounding(parsed[0]?.measures[0] ?? [], 2);
  bartokB1Evidence.push(
    `xml parts ${parsed.length} time ${parsed[0]?.times[0]}/${parsed[1]?.times[0]} g ${gXml.map((event) => `${event.pitch}@${event.start}+${event.duration}`).join(',')} b ${bXml.map((event) => `${event.pitch}@${event.start}+${event.duration}`).join(',')} v2 ${g2Xml.map((event) => `${event.pitch}@${event.start}+${event.duration}`).join(',')}`,
  );
  t(
    'MusicXML matches fixture pitches, attacks, durations, rests and 1080 ticks',
    parsed[0]?.times[0] === '9/16' &&
      parsed[1]?.times[0] === '9/16' &&
      gXml.map((event) => `${event.pitch}@${event.start}+${event.duration}`).join(',') === '62@0+480,64@480+240,69@720+360' &&
      bXml.map((event) => `${event.pitch}@${event.start}+${event.duration}`).join(',') === 'null@0+240,38@240+360,41@600+480' &&
      g2Xml.map((event) => `${event.pitch}@${event.start}+${event.duration}`).join(',') === 'null@0+360,67@360+480,null@840+240' &&
      voiceSum(parsed[0]?.measures[0] ?? [], 1) === 1080 &&
      voiceSum(parsed[0]?.measures[0] ?? [], 2) === 1080 &&
      voiceSum(parsed[1]?.measures[0] ?? [], 1) === 1080,
  );

  const empty = duoScore([fixturePair(false)], 'eighth_beats');
  const beforeEvents = describe(empty.parts[0]!.measures[0]!.events);
  const locked = contextStub({ songModeLeadSheetMelodyAnchors: [{ bar: 1, midi: 60 }] });
  const lockedReceipt = applyBartokB1NativeAksak(empty, locked);
  t(
    'locked melody refuses before mutation',
    lockedReceipt?.status === 'refused' && describe(empty.parts[0]!.measures[0]!.events) === beforeEvents,
  );
  const clash = duoScore([fixturePair(false)], 'eighth_beats');
  clash.barMeterMap = { 1: { numerator: 7, denominator: 8 } };
  const clashContext = contextStub();
  clashContext.barMeterMap = { 1: { numerator: 7, denominator: 8 } };
  const clashReceipt = applyBartokB1NativeAksak(clash, clashContext);
  t(
    'conflicting meter refuses',
    clashReceipt?.status === 'refused' && clash.parts[0]!.measures[0]!.b1PulsePreserve !== true,
  );
  const sq = contextStub();
  sq.presetId = 'string_quartet';
  const sqScore = duoScore([fixturePair(false)], 'eighth_beats');
  t('string quartet route is refused', applyBartokB1NativeAksak(sqScore, sq)?.status === 'refused');
  const vrb = contextStub({ songwriterStyleId: 'sq_vrb_bartok' });
  t('sq_vrb_bartok is not the Song Mode switch', applyBartokB1NativeAksak(duoScore([fixturePair(false)], 'eighth_beats'), vrb)?.status === 'refused');

  const off17 = safeRun(76017, songOpts());
  const off = safeRun(76018, songOpts());
  const offAgain = safeRun(76018, songOpts());
  bartokB1Evidence.push(`off17 ${off17?.success} ${eventDigest(off17?.score)} ${(off17?.errors ?? []).slice(0, 2).join(' || ')}`);
  bartokB1Evidence.push(`off18 ${off?.success} ${eventDigest(off?.score)}`);
  t(
    'flag-off seed 76017 keeps the 4/4 fingerprint',
    off17?.success === true && eventDigest(off17?.score) === OFF_FP,
  );
  t(
    'flag-off seed 76018 is deterministic',
    off?.success === true && eventDigest(off?.score) === eventDigest(offAgain?.score) && eventDigest(off?.score) === 'c0189827fdcf5a6b687157cf5def52f3ffd6cadd0ae19ea089b2fc00275b7d78',
  );

  const mixedOpts = songOpts({ bartokB1Aksak: true, bartokB1Bars: [9, 10, 11, 12] });
  const mixed = safeRun(76018, mixedOpts);
  const mixedAgain = safeRun(76018, mixedOpts);
  const receipt = mixed?.context.generationMetadata?.bartokB1Receipt as BartokB1NativeReceipt | undefined;
  bartokB1Evidence.push(`mixed success ${mixed?.success} errors ${(mixed?.errors ?? []).slice(0, 4).join(' || ')}`);
  bartokB1Evidence.push(`mixed receipt ${receipt?.status} survived ${receipt?.survivedFinalisation} bars ${(receipt?.bars ?? []).join(',')}`);
  const guitar = mixed?.score?.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  const bass = mixed?.score?.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass');
  const mixedBass: Record<number, string> = { 9: '2,5', 10: '4,6', 11: '3,7', 12: '2,5' };
  const mixedAttacksOk = [9, 10, 11, 12].every((bar) => {
    const gm = guitar?.measures.find((measure) => measure.index === bar);
    const bm = bass?.measures.find((measure) => measure.index === bar);
    return (
      gm?.measureBeatSpanQuarters === 2.25 &&
      bm?.measureBeatSpanQuarters === 2.25 &&
      bartokB1AttackPulses(gm?.events ?? [], 1).join(',') === '0,4,6' &&
      bartokB1AttackPulses(bm?.events ?? [], 1).join(',') === mixedBass[bar]
    );
  });
  const fourFourSame = (off?.score?.parts ?? []).every((part) => {
    const other = mixed?.score?.parts.find((item) => item.instrumentIdentity === part.instrumentIdentity);
    return part.measures.every((measure) => {
      if (measure.index >= 9 && measure.index <= 12) return true;
      const twin = other?.measures.find((item) => item.index === measure.index);
      return describe(measure.events) === describe(twin?.events ?? []);
    });
  });
  t(
    'native 4/4 to 9/16 to 4/4 succeeds and keeps bars 9-12 attacks',
    mixed?.success === true &&
      receipt?.status === 'applied' &&
      receipt.survivedFinalisation === true &&
      mixedAttacksOk &&
      fourFourSame &&
      eventDigest(mixed?.score) === eventDigest(mixedAgain?.score) &&
      mixed?.xml === mixedAgain?.xml,
  );
  const chordsOff = off?.score?.parts.find((part) => part.id === 'guitar')?.measures.map((measure) => measure.chord).join('|');
  const chordsOn = mixed?.score?.parts.find((part) => part.id === 'guitar')?.measures.map((measure) => measure.chord).join('|');
  t('harmony symbols stay when B1 is on', chordsOff === chordsOn && (chordsOn?.length ?? 0) > 0);

  const nativeXml = mixed?.xml ?? '';
  const nativeParts = [...nativeXml.matchAll(/<part id="([^"]+)">[\s\S]*?<\/part>/g)].map((match) => parseXmlPart(match[0]));
  const nativeGuitar = nativeParts[0];
  const nativeBass = nativeParts[1];
  const nativeBarsOk = [8, 9, 10, 11].every((index) => {
    const gLine = xmlSounding(nativeGuitar?.measures[index] ?? [], 1).filter((event) => event.pitch !== null && !event.tieIn);
    const bLine = xmlSounding(nativeBass?.measures[index] ?? [], 1).filter((event) => event.pitch !== null && !event.tieIn);
    const time = index === 8 ? '9/16' : '';
    return (
      nativeGuitar?.times[index] === time &&
      nativeBass?.times[index] === time &&
      gLine.map((event) => event.start).join(',') === '0,480,720' &&
      bLine.map((event) => event.start / 120).join(',') === mixedBass[index + 1] &&
      voiceSum(nativeGuitar?.measures[index] ?? [], 1) === 1080 &&
      voiceSum(nativeBass?.measures[index] ?? [], 1) === 1080
    );
  });
  const backToFour =
    (nativeGuitar?.times[7] === '' || nativeGuitar?.times[7] === '4/4') &&
    nativeGuitar?.times[12] === '4/4' &&
    nativeBass?.times[12] === '4/4' &&
    voiceSum(nativeGuitar?.measures[12] ?? [], 1) === 1920;
  bartokB1Evidence.push(
    `native times ${nativeGuitar?.times.slice(6, 14).join(',')} bassTimes ${nativeBass?.times.slice(6, 14).join(',')} bar13 ${voiceSum(nativeGuitar?.measures[12] ?? [], 1)} attacks ${[8, 9, 10, 11].map((index) => xmlSounding(nativeBass?.measures[index] ?? [], 1).filter((event) => event.pitch !== null && !event.tieIn).map((event) => event.start).join('+')).join(' / ')}`,
  );
  t('native MusicXML bars 9-12 are 9/16 and bar 13 returns to 4/4', nativeBarsOk && backToFour);

  const allBars = Array.from({ length: 32 }, (_, index) => index + 1);
  const all = safeRun(76018, songOpts({ bartokB1Aksak: true, bartokB1Bars: allBars }));
  const allReceipt = all?.context.generationMetadata?.bartokB1Receipt;
  bartokB1Evidence.push(`all-9/16 success ${all?.success} ${(all?.errors ?? []).slice(0, 4).join(' || ')}`);
  const allAttacks = (all?.score?.parts ?? [])
    .filter((part) => part.instrumentIdentity === 'clean_electric_guitar' || part.instrumentIdentity === 'acoustic_upright_bass')
    .every((part) =>
      part.measures.every((measure) => {
        const expected =
          part.instrumentIdentity === 'acoustic_upright_bass'
            ? measure.index % 3 === 1
              ? '4,6'
              : measure.index % 3 === 2
                ? '3,7'
                : '2,5'
            : '0,4,6';
        return (
          measure.measureBeatSpanQuarters === 2.25 &&
          bartokB1AttackPulses(measure.events, 1).join(',') === expected
        );
      }),
    );
  t(
    'explicit 32-bar 9/16 passage succeeds',
    all?.success === true && allReceipt?.status === 'applied' && allReceipt.survivedFinalisation === true && allAttacks === true,
  );

  const withPlanner = safeRun(76018, songOpts({ bartokB1Aksak: true, bartokB1Bars: [9, 10, 11, 12], e1PhrasePlanner: true }));
  t(
    'E1 planner does not replace B1 bars',
    withPlanner?.success === true &&
      withPlanner.context.generationMetadata?.e1PhrasePlannerReceipt?.status === 'refused' &&
      withPlanner.context.generationMetadata?.bartokB1Receipt?.survivedFinalisation === true &&
      bartokB1AttackPulses(
        withPlanner.score?.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar')?.measures.find((measure) => measure.index === 9)?.events ?? [],
        1,
      ).join(',') === '0,4,6',
  );

  if (process.env.BARTOK_B1_EVIDENCE === '1') {
    for (const line of bartokB1Evidence) console.log(line);
    const failed = out.filter((row) => !row.ok).map((row) => row.name);
    if (failed.length) console.log('FAILED ' + failed.join(' | '));
  }
  return out;
}

if (process.argv[1]?.includes('bartokB1NativeAksak.test')) {
  const rows = runBartokB1NativeAksakTests();
  for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
  console.log(`${rows.filter((row) => row.ok).length}/${rows.length}`);
  process.exit(rows.every((row) => row.ok) ? 0 : 1);
}
