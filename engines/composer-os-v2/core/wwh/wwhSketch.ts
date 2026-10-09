/**
 * V9 sketch mode. Reads a hand-authored sketch and writes one duo MusicXML.
 * Does not choose pitches. Seeds are not read.
 *
 * sketch.json:
 * { source, insertAfterBar, label, bars: [[ {dur, tones:[{step,alter,octave,string,fret}]} | {dur, rest:true} ]] }
 * Optional tie and voice copy atoms the existing hand-authored Wyble and Space sketches already use.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ANGULAR_BARS } from './wwhBlackAuraV9AngularV2';
import { LIQUID_BARS } from './wwhBlackAuraV9Liquid';
import { SPACE_BARS } from './wwhBlackAuraV9Space';
import { LOWER, UPPER } from './wwhBlackAuraV9Wyble';
import { loadBlackAuraIndex, V8A_DUO_FILE } from './wwhBlackAuraV8a';
import { midiOf, soundingFromStringFret, stoppedSpan, V8B_MAX_FRET, V8B_MAX_STOPPED_SPAN } from './wwhBlackAuraV8bRecipe';
import { readInsertionBass } from './wwhBlackAuraV8c';
import { V9_OUT_DIR } from './wwhBlackAuraV9Pilot';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import {
  assertWwhBar,
  wwhBarTicks,
  wwhDyad,
  wwhNote,
  wwhRest,
  wwhTriad,
  WWH_DIVISIONS,
  WWH_DUR,
  type WwhAtom,
} from './wwhPerformanceTypes';

export const WWH_SKETCH_PLACEHOLDER_PREFIX = 'Placeholder — repeats bar ';

export interface WwhSketchTone {
  step: string;
  alter: number;
  octave: number;
  string: number;
  fret: number;
}

export interface WwhSketchEvent {
  dur: string;
  rest?: boolean;
  tones?: WwhSketchTone[];
  /** Copied onto every pitched atom. Space and Wyble hand-authored sketches use this. */
  tie?: 'start' | 'stop';
  /** 2 selects the existing second guitar voice. Default is voice 1. */
  voice?: 1 | 2;
}

export interface WwhSketch {
  source: string;
  insertAfterBar: number;
  label: string;
  bars: WwhSketchEvent[][];
}

export interface SketchFailure {
  bar: number;
  beat: string;
  note: string;
  message: string;
}

export interface SketchReport {
  output: string;
  barsInserted: number;
  sourceShaBefore: string;
  sourceShaAfter: string;
  sourceMtimeBeforeMs: number;
  sourceMtimeAfterMs: number;
  placeholderBars: number[];
}

interface SketchPrint {
  title: string;
  movementTitle: string;
  composer: string;
  software: string;
  rehearsal: string;
  tempo: number;
}

/** Same header strings the hand-authored writers already print, so a sketch can match that export. */
const KNOWN_PRINT: Record<string, SketchPrint> = {
  LIQUID: {
    title: 'Black Aura',
    movementTitle: 'V9 creative liquid duo',
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V9 liquid',
    rehearsal: 'LIQUID',
    tempo: 92,
  },
  WYBLE: {
    title: 'Black Aura',
    movementTitle: 'V9 creative wyble duo',
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V9 wyble',
    rehearsal: 'WYBLE',
    tempo: 92,
  },
  SPACE: {
    title: 'Black Aura',
    movementTitle: 'V9 creative space duo',
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V9 space',
    rehearsal: 'SPACE',
    tempo: 92,
  },
  'ANGULAR V2': {
    title: 'Black Aura',
    movementTitle: 'V9 creative angular duo V2',
    composer: 'Michael Bryant',
    software: 'Composer OS WWH V9 angular V2',
    rehearsal: 'ANGULAR V2',
    tempo: 92,
  },
};

function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function slug(value: string): string {
  return value.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]+/g, '');
}

export function formatSketchFailure(failure: SketchFailure): string {
  return `bar ${failure.bar} beat ${failure.beat} note ${failure.note}: ${failure.message}`;
}

export function placeholderText(insertAfterBar: number): string {
  return `${WWH_SKETCH_PLACEHOLDER_PREFIX}${insertAfterBar}`;
}

function beatLabel(tick: number): string {
  const beat = 1 + tick / WWH_DIVISIONS;
  return Number.isInteger(beat) ? String(beat) : String(Math.round(beat * 1000) / 1000);
}

function spellTone(tone: WwhSketchTone): string {
  const accidental = tone.alter < 0 ? 'b'.repeat(-tone.alter) : tone.alter > 0 ? '#'.repeat(tone.alter) : '';
  return `${tone.step}${accidental}${tone.octave}`;
}

function noteLabel(event: WwhSketchEvent): string {
  if (event.rest || !event.tones?.length) return 'rest';
  return event.tones.map(spellTone).join('+');
}

function ticksOf(dur: string): number | null {
  return WWH_DUR[dur]?.divisions ?? null;
}

function fail(failures: SketchFailure[], bar: number, tick: number, note: string, message: string): void {
  failures.push({ bar, beat: beatLabel(tick), note, message });
}

function atomsOfEvent(event: WwhSketchEvent): WwhAtom[] {
  if (event.rest || !event.tones?.length) return [wwhRest(event.dur)];
  const ordered = [...event.tones].sort(
    (a, b) => midiOf(a.step, a.alter, a.octave) - midiOf(b.step, b.alter, b.octave)
  );
  let atoms: WwhAtom[];
  if (ordered.length === 1) {
    const tone = ordered[0]!;
    atoms = [wwhNote(tone.step, tone.octave, event.dur, tone.alter)];
  } else if (ordered.length === 2) {
    const low = ordered[0]!;
    const high = ordered[1]!;
    atoms = wwhDyad([low.step, low.octave, low.alter], [high.step, high.octave, high.alter], event.dur);
  } else {
    const low = ordered[0]!;
    const mid = ordered[1]!;
    const high = ordered[2]!;
    atoms = wwhTriad(
      [low.step, low.octave, low.alter],
      [mid.step, mid.octave, mid.alter],
      [high.step, high.octave, high.alter],
      event.dur
    );
  }
  if (event.tie === 'start') {
    for (const atom of atoms) {
      if (!atom.rest) atom.tieStart = true;
    }
  }
  if (event.tie === 'stop') {
    for (const atom of atoms) {
      if (!atom.rest) atom.tieStop = true;
    }
  }
  return atoms;
}

function voiceOf(event: WwhSketchEvent): 1 | 2 {
  return event.voice === 2 ? 2 : 1;
}

export function validateWwhSketch(sketch: WwhSketch): SketchFailure[] {
  const failures: SketchFailure[] = [];
  if (!Number.isInteger(sketch.insertAfterBar) || sketch.insertAfterBar < 1) {
    failures.push({ bar: 0, beat: '1', note: '(sketch)', message: `insertAfterBar ${sketch.insertAfterBar}` });
  }
  sketch.bars.forEach((events, barIndex) => {
    const bar = barIndex + 1;
    const cursors: Record<1 | 2, number> = { 1: 0, 2: 0 };
    const used = new Set<1 | 2>();
    for (const event of events) {
      const voice = voiceOf(event);
      used.add(voice);
      const tick = cursors[voice];
      const label = noteLabel(event);
      const ticks = ticksOf(event.dur);
      if (ticks === null) {
        fail(failures, bar, tick, label, `unknown duration ${event.dur}`);
        continue;
      }
      const tones = event.rest ? [] : (event.tones ?? []);
      if (!event.rest && tones.length > 3) {
        fail(failures, bar, tick, label, `${tones.length} notes is denser than a triad`);
      }
      const checked: WwhSketchTone[] = [];
      for (const tone of tones) {
        const name = spellTone(tone);
        if (tone.fret < 0 || tone.fret > V8B_MAX_FRET) {
          fail(failures, bar, tick, name, `fret ${tone.fret} outside 0–${V8B_MAX_FRET}`);
          continue;
        }
        let sounded: ReturnType<typeof soundingFromStringFret>;
        try {
          sounded = soundingFromStringFret(tone.string, tone.fret);
        } catch (error) {
          fail(failures, bar, tick, name, error instanceof Error ? error.message : String(error));
          continue;
        }
        const written = midiOf(tone.step, tone.alter, tone.octave);
        if (sounded.midi !== written - 12) {
          fail(
            failures,
            bar,
            tick,
            name,
            `string ${tone.string} fret ${tone.fret} sounds ${sounded.name}, not written ${name}`
          );
          continue;
        }
        checked.push(tone);
      }
      const strings = checked.map((tone) => tone.string);
      if (new Set(strings).size !== strings.length) {
        fail(failures, bar, tick, label, 'stacks one string');
      }
      const span = stoppedSpan(checked.map((tone) => tone.fret));
      if (span > V8B_MAX_STOPPED_SPAN) {
        fail(failures, bar, tick, label, `stopped span ${span} exceeds ${V8B_MAX_STOPPED_SPAN}`);
      }
      cursors[voice] += ticks;
    }
    for (const voice of used) {
      const got = cursors[voice];
      if (got === wwhBarTicks()) continue;
      try {
        assertWwhBar([{ rest: true, divisions: got, type: 'whole' }], wwhBarTicks(), `sketch bar ${bar} voice ${voice}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fail(failures, bar, got, `(voice ${voice})`, message);
      }
    }
    if (!used.size) fail(failures, bar, 0, '(bar)', `duration 0 != ${wwhBarTicks()}`);
  });
  return failures;
}

function printFor(sketch: WwhSketch, title: string, composer: string): SketchPrint {
  return (
    KNOWN_PRINT[sketch.label] ?? {
      title,
      movementTitle: `${sketch.label} hand-authored sketch`,
      composer: composer || 'Michael Bryant',
      software: 'Composer OS WWH V9 sketch',
      rehearsal: sketch.label,
      tempo: 92,
    }
  );
}

export function renderWwhSketch(sketch: WwhSketch): { xml: string; placeholderBars: number[] } {
  const failures = validateWwhSketch(sketch);
  if (failures.length) {
    throw new Error(failures.map(formatSketchFailure).join('\n'));
  }
  const { index } = loadBlackAuraIndex();
  readInsertionBass(index);
  const sourcePath = path.resolve(sketch.source);
  const scoreIndex =
    sourcePath === path.resolve(V8A_DUO_FILE)
      ? index
      : loadBlackAuraIndex().index;
  if (sourcePath !== path.resolve(V8A_DUO_FILE)) {
    throw new Error(`sketch source must be the locked Black Aura leadsheet, got ${sketch.source}`);
  }
  if (sketch.insertAfterBar > scoreIndex.measures.length) {
    throw new Error(`insertAfterBar ${sketch.insertAfterBar} is past the source`);
  }
  const template = scoreIndex.measures[sketch.insertAfterBar - 1];
  if (!template) throw new Error(`bar ${sketch.insertAfterBar} missing`);
  const barTicks = wwhBarTicks(template.guitar.beats, template.guitar.beatType, template.guitar.divisions);
  const voices = sketch.bars.map((events, barIndex) => {
    const split: Record<1 | 2, WwhSketchEvent[]> = { 1: [], 2: [] };
    for (const event of events) split[voiceOf(event)].push(event);
    const upper = split[1].flatMap(atomsOfEvent);
    const lower = split[2].flatMap(atomsOfEvent);
    assertWwhBar(upper, barTicks, `sketch-${barIndex + 1}`);
    if (lower.length) assertWwhBar(lower, barTicks, `sketch-${barIndex + 1}-voice-2`);
    return { upper, lower };
  });
  const source: WwhWrittenBar[] = scoreIndex.measures.map((measure) => ({
    guitar: [],
    bass: [],
    guitarClone: measure.guitar.element,
    bassClone: measure.bass.element,
    beats: measure.guitar.beats,
    beatType: measure.guitar.beatType,
    divisions: measure.guitar.divisions,
    fifths: measure.guitar.fifths,
    mode: measure.guitar.mode,
    guitarTranspose: measure.guitar.transposeOctave,
    bassTranspose: measure.bass.transposeOctave,
  }));
  const printed = printFor(sketch, scoreIndex.title, scoreIndex.composer);
  const placeholder = placeholderText(sketch.insertAfterBar);
  const window: WwhWrittenBar[] = voices.map((voice, indexBar) => ({
    guitar: voice.upper,
    guitarVoice2: voice.lower.length ? voice.lower : undefined,
    bass: [],
    bassClone: template.bass.element,
    beats: template.guitar.beats,
    beatType: template.guitar.beatType,
    divisions: template.guitar.divisions || WWH_DIVISIONS,
    fifths: template.guitar.fifths,
    mode: template.guitar.mode,
    guitarTranspose: -1,
    bassTranspose: -1,
    rehearsal: indexBar === 0 ? printed.rehearsal : undefined,
    bassWords: indexBar === 0 ? [placeholder] : undefined,
    tempoMark: indexBar === 0 ? { beatUnit: 'quarter', dots: 0, perMinute: String(printed.tempo), soundTempo: null } : undefined,
  }));
  const header: WwhScoreHeader = {
    title: printed.title,
    movementTitle: printed.movementTitle,
    composer: printed.composer,
    software: printed.software,
    tempo: printed.tempo,
    transposeOctave: -1,
  };
  const bars = [...source.slice(0, sketch.insertAfterBar), ...window, ...source.slice(sketch.insertAfterBar)];
  return {
    xml: renderWwhDuoScore(bars, header),
    placeholderBars: [sketch.insertAfterBar + 1],
  };
}

export function sketchFileName(title: string, label: string): string {
  return `${slug(title) || 'sketch'}-SKETCH-${slug(label) || 'untitled'}.musicxml`;
}

export function runWwhSketch(sketchPath: string, options?: { open?: boolean; outDir?: string }): SketchReport {
  const raw = JSON.parse(fs.readFileSync(sketchPath, 'utf8')) as WwhSketch;
  const source = path.resolve(raw.source);
  const beforeSha = sha256File(source);
  const beforeMtime = fs.statSync(source).mtimeMs;
  const failures = validateWwhSketch({ ...raw, source });
  if (failures.length) {
    for (const failure of failures) console.error(formatSketchFailure(failure));
    throw new Error(`sketch rejected (${failures.length})`);
  }
  const rendered = renderWwhSketch({ ...raw, source });
  const afterReadSha = sha256File(source);
  if (afterReadSha !== beforeSha) throw new Error('source changed before write');
  const { index } = loadBlackAuraIndex();
  const outDir = options?.outDir ?? V9_OUT_DIR;
  const outFile = path.join(outDir, sketchFileName(KNOWN_PRINT[raw.label]?.title ?? index.title, raw.label));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, rendered.xml);
  const afterSha = sha256File(source);
  const afterMtime = fs.statSync(source).mtimeMs;
  if (afterSha !== beforeSha || afterMtime !== beforeMtime) {
    fs.unlinkSync(outFile);
    throw new Error('source changed during write');
  }
  const report: SketchReport = {
    output: outFile,
    barsInserted: raw.bars.length,
    sourceShaBefore: beforeSha,
    sourceShaAfter: afterSha,
    sourceMtimeBeforeMs: beforeMtime,
    sourceMtimeAfterMs: afterMtime,
    placeholderBars: rendered.placeholderBars,
  };
  console.log(`bars inserted: ${report.barsInserted}`);
  console.log(`source sha before: ${report.sourceShaBefore}`);
  console.log(`source sha after: ${report.sourceShaAfter}`);
  console.log(`source mtime before: ${report.sourceMtimeBeforeMs}`);
  console.log(`source mtime after: ${report.sourceMtimeAfterMs}`);
  console.log(`placeholder bars: ${report.placeholderBars.join(', ')}`);
  console.log(`output: ${report.output}`);
  if (options?.open !== false) {
    execFileSync('open', ['-a', 'MuseScore 4', outFile], { stdio: 'inherit' });
  }
  return report;
}

interface ChordSlot {
  dur: string;
  tones: Array<{ step: string; alter: number; octave: number; stringNumber: number; fret: number }>;
  tie?: 'start' | 'stop';
}

interface VoiceSlot {
  dur: string;
  tone: {
    step: string;
    alter: number;
    octave: number;
    stringNumber: number;
    fret: number;
    tie?: 'start' | 'stop';
  } | null;
}

function chordEvents(slots: readonly ChordSlot[]): WwhSketchEvent[] {
  return slots.map((slot) => {
    if (!slot.tones.length) return { dur: slot.dur, rest: true, ...(slot.tie ? { tie: slot.tie } : {}) };
    return {
      dur: slot.dur,
      tones: slot.tones.map((tone) => ({
        step: tone.step,
        alter: tone.alter,
        octave: tone.octave,
        string: tone.stringNumber,
        fret: tone.fret,
      })),
      ...(slot.tie ? { tie: slot.tie } : {}),
    };
  });
}

function voiceEvents(slots: readonly VoiceSlot[], voice: 1 | 2): WwhSketchEvent[] {
  return slots.map((slot) => {
    const voiceField = voice === 2 ? { voice: 2 as const } : {};
    if (!slot.tone) return { dur: slot.dur, rest: true, ...voiceField };
    let string = slot.tone.stringNumber;
    let fret = slot.tone.fret;
    // Written pitch stays. Fret 8 is outside the existing max-fret helper, so the sketch uses the same sounding F.
    if (slot.tone.step === 'F' && slot.tone.alter === 0 && slot.tone.octave === 3 && string === 5 && fret === 8) {
      string = 4;
      fret = 3;
    }
    return {
      dur: slot.dur,
      tones: [
        {
          step: slot.tone.step,
          alter: slot.tone.alter,
          octave: slot.tone.octave + 1,
          string,
          fret,
        },
      ],
      ...(slot.tone.tie ? { tie: slot.tone.tie } : {}),
      ...voiceField,
    };
  });
}

export function handAuthoredV9Sketches(source = V8A_DUO_FILE): WwhSketch[] {
  return [
    { source, insertAfterBar: 16, label: 'LIQUID', bars: LIQUID_BARS.map((bar) => chordEvents(bar)) },
    {
      source,
      insertAfterBar: 16,
      label: 'WYBLE',
      bars: UPPER.map((bar, index) => [...voiceEvents(bar, 1), ...voiceEvents(LOWER[index]!, 2)]),
    },
    { source, insertAfterBar: 16, label: 'SPACE', bars: SPACE_BARS.map((bar) => chordEvents(bar)) },
    { source, insertAfterBar: 16, label: 'ANGULAR V2', bars: ANGULAR_BARS.map((bar) => chordEvents(bar)) },
  ];
}
