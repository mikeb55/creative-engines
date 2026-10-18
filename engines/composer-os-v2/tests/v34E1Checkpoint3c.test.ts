/**
 * V3.4 E1 checkpoint 3C — Herrmann, Ravel, Dutilleux.
 * Technical checks only. Not an artistic approval.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { runGoldenPathOnce, type RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import { validateMusicXmlSchema } from '../core/export/musicxmlValidation';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { writeScoreModelMidiFile } from '../core/export/midiScoreWriter';
import { createPart, createScore } from '../core/score-model/scoreEventBuilder';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';
import {
  applyE1ComposerLanguage,
  composeE1ComposerLanguage,
  validateE1ComposerLanguageFinalOutput,
  type E1ComposerLanguageId,
} from '../core/phrase/e1Checkpoint3cComposerLanguage';

type Row = { name: string; ok: boolean };

const LANGUAGES = ['bernard_herrmann', 'ravel', 'dutilleux'] as const;
const PRIMARY_SEED = 3340;
const SECOND_SEED = 3341;

function songOpts(primary: string, extra: Partial<RunGoldenPathOptions> = {}): RunGoldenPathOptions {
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
    primarySongwriterStyle: primary,
    scoreTitle: primary,
    ...extra,
  };
}

function digest(score: ScoreModel | undefined): string {
  const parts = (score?.parts ?? []).map((part) => {
    const notes = part.measures
      .map((measure) =>
        measure.events
          .map((event) => {
            if (event.kind === 'note') return `n${event.pitch}@${event.startBeat}:${event.duration}:v${event.voice ?? 1}`;
            if (event.kind === 'rest') return `r@${event.startBeat}:${event.duration}:v${event.voice ?? 1}`;
            return 'x';
          })
          .join(','),
      )
      .join(';');
    return `${part.instrumentIdentity}\n${part.measures.map((measure) => measure.chord ?? '').join('|')}\n${notes}`;
  });
  return createHash('sha256').update(parts.join('\n---\n')).digest('hex');
}

function notesOf(score: ScoreModel, instrument: string, voice: number): NoteEvent[] {
  const part = score.parts.find((item) => item.instrumentIdentity === instrument);
  const notes: NoteEvent[] = [];
  for (const measure of part?.measures ?? []) {
    for (const event of measure.events) {
      if (event.kind === 'note' && (event.voice ?? 1) === voice) notes.push(event);
    }
  }
  return notes;
}

function barNotes(score: ScoreModel, instrument: string, bar: number, voice: number): NoteEvent[] {
  const part = score.parts.find((item) => item.instrumentIdentity === instrument);
  const measure = part?.measures.find((item) => item.index === bar);
  return (measure?.events ?? []).filter((event): event is NoteEvent => event.kind === 'note' && (event.voice ?? 1) === voice);
}

function pc(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function rhythmKey(score: ScoreModel, bar: number, voice: number): string {
  const part = score.parts.find((item) => item.instrumentIdentity === 'clean_electric_guitar');
  const measure = part?.measures.find((item) => item.index === bar);
  return (measure?.events ?? [])
    .filter((event) => (event.voice ?? 1) === voice)
    .map((event) => `${event.kind === 'rest' ? 'r' : 'n'}@${event.startBeat}:${event.duration}`)
    .join(',');
}

function leaps(midis: number[]): number {
  let max = 0;
  for (let i = 1; i < midis.length; i++) max = Math.max(max, Math.abs(midis[i]! - midis[i - 1]!));
  return max;
}

function inRange(midis: number[], low: number, high: number): boolean {
  return midis.every((midi) => midi >= low && midi <= high);
}

function xmlPitches(xml: string): number[] {
  const stepPc: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pitches: number[] = [];
  const notes = xml.match(/<note\b[^>]*>[\s\S]*?<\/note>/g) ?? [];
  for (const note of notes) {
    if (note.includes('<rest') || /<tie type="stop"/.test(note)) continue;
    const step = note.match(/<step>([A-G])<\/step>/);
    const octave = note.match(/<octave>(\d+)<\/octave>/);
    if (!step || !octave) continue;
    const alter = note.match(/<alter>(-?\d+)<\/alter>/);
    pitches.push((Number(octave[1]) + 1) * 12 + (stepPc[step[1]!] ?? 0) + (alter ? Number(alter[1]) : 0));
  }
  return pitches.sort((a, b) => a - b);
}

function scorePitches(score: ScoreModel): number[] {
  const pitches: number[] = [];
  for (const part of score.parts) {
    for (const measure of part.measures) {
      for (const event of measure.events) {
        if (event.kind === 'note') pitches.push(event.pitch);
      }
    }
  }
  return pitches.sort((a, b) => a - b);
}

function decodeMidiPitches(file: string): { pitches: number[]; ticks: number } {
  const buf = fs.readFileSync(file);
  const trackCount = buf.readUInt16BE(10);
  let offset = 14;
  const pitches: number[] = [];
  let ticks = 0;
  const sounding = new Map<string, { tick: number; pitch: number }>();
  for (let track = 0; track < trackCount; track += 1) {
    const size = buf.readUInt32BE(offset + 4);
    const end = offset + 8 + size;
    offset += 8;
    let tick = 0;
    let status = 0;
    while (offset < end) {
      let value = 0;
      let byte = 0;
      do {
        byte = buf[offset++] ?? 0;
        value = (value << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      tick += value;
      byte = buf[offset] ?? 0;
      if (byte >= 0x80) {
        status = byte;
        offset += 1;
      }
      if (status >= 0x90 && status < 0xa0) {
        const pitch = buf[offset++] ?? 0;
        const velocity = buf[offset++] ?? 0;
        const channel = (status & 0x0f) + 1;
        const key = `${channel}:${pitch}`;
        if (velocity > 0) sounding.set(key, { tick, pitch });
        else {
          const start = sounding.get(key);
          if (start) {
            pitches.push(pitch);
            ticks += tick - start.tick;
          }
          sounding.delete(key);
        }
      } else if (status >= 0x80 && status < 0x90) {
        const pitch = buf[offset++] ?? 0;
        offset += 1;
        const channel = (status & 0x0f) + 1;
        const key = `${channel}:${pitch}`;
        const start = sounding.get(key);
        if (start) {
          pitches.push(pitch);
          ticks += tick - start.tick;
        }
        sounding.delete(key);
      } else if (status >= 0xc0 && status < 0xd0) {
        offset += 1;
      } else if (status === 0xff) {
        offset += 1;
        let length = 0;
        do {
          byte = buf[offset++] ?? 0;
          length = (length << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        offset += length;
      } else if (status >= 0xb0 && status < 0xc0) offset += 2;
      else if (status >= 0xe0 && status < 0xf0) offset += 2;
      else offset += 1;
    }
    offset = end;
  }
  return { pitches: pitches.sort((a, b) => a - b), ticks };
}

function shell(bars: number, chords: string[]): ScoreModel {
  const guitar = createPart('guitar', 'Clean Electric Guitar', 'clean_electric_guitar', 27, 'treble', bars, (bar) => chords[bar - 1] ?? 'C', () => undefined);
  const bass = createPart('bass', 'Acoustic Upright Bass', 'acoustic_upright_bass', 32, 'bass', bars, (bar) => chords[bar - 1] ?? 'C', () => undefined);
  for (const part of [guitar, bass]) {
    for (const measure of part.measures) {
      measure.events = [{ kind: 'rest', startBeat: 0, duration: 4, voice: 1 }];
    }
  }
  return createScore('shell', [guitar, bass], { tempo: 72 });
}

function same(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function writeV34E1Checkpoint3cFixtures(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  const notes: string[] = [
    'E1 checkpoint 3C fixtures',
    '16 bars, 4/4, quarter = 72, clean electric guitar and upright bass.',
    'Guitar voice 2 is the inner layer. These files are technical evidence, not musical approval.',
    '',
  ];
  for (const language of LANGUAGES) {
    for (const seed of [PRIMARY_SEED, SECOND_SEED]) {
      const built = composeE1ComposerLanguage(language, seed);
      const xml = exportScoreModelToMusicXml(built.score);
      if (!xml.success || !xml.xml) throw new Error(xml.errors.join('; '));
      const stem = `${language}-seed${seed}`;
      fs.writeFileSync(path.join(dir, `${stem}.musicxml`), xml.xml);
      if (!writeScoreModelMidiFile(built.score, path.join(dir, `${stem}.mid`))) throw new Error(`midi ${stem}`);
      if (seed === PRIMARY_SEED) {
        notes.push(`${language} seed ${seed}`);
        notes.push(`motif [${built.receipt.motifIntervals.join(', ')}]`);
        notes.push(`operators: ${built.receipt.operators.join(', ')}`);
        notes.push(`harmony: ${built.receipt.harmony.join(' | ')}`);
        for (const line of built.receipt.development) notes.push(`- ${line}`);
        notes.push('');
      } else {
        notes.push(`${language} seed ${seed} keeps the same operators (${built.receipt.operators.join(', ')}) and changes the sounding line.`);
        notes.push('');
      }
    }
  }
  fs.writeFileSync(path.join(dir, 'FIXTURES.txt'), `${notes.join('\n')}\n`);
}

export function runV34E1Checkpoint3cTests(): Row[] {
  const out: Row[] = [];
  const t = (name: string, ok: boolean) => out.push({ name, ok });
  const built = new Map<E1ComposerLanguageId, ReturnType<typeof composeE1ComposerLanguage>>();
  const again = new Map<E1ComposerLanguageId, ReturnType<typeof composeE1ComposerLanguage>>();
  const other = new Map<E1ComposerLanguageId, ReturnType<typeof composeE1ComposerLanguage>>();

  for (const language of LANGUAGES) {
    built.set(language, composeE1ComposerLanguage(language, PRIMARY_SEED));
    again.set(language, composeE1ComposerLanguage(language, PRIMARY_SEED));
    other.set(language, composeE1ComposerLanguage(language, SECOND_SEED));
  }

  for (const language of LANGUAGES) {
    const score = built.get(language)!.score;
    const receipt = built.get(language)!.receipt;
    const guitar = notesOf(score, 'clean_electric_guitar', 1).map((note) => note.pitch);
    const bass = notesOf(score, 'acoustic_upright_bass', 1).map((note) => note.pitch);
    const colour = notesOf(score, 'clean_electric_guitar', 2).map((note) => note.pitch);
    const rests = score.parts[0]!.measures.some((measure) => measure.events.some((event) => event.kind === 'rest' && (event.voice ?? 1) === 1));
    const arts = score.parts[0]!.measures.some((measure) =>
      measure.events.some((event) => event.kind === 'note' && event.articulation),
    );
    t(
      `${language} is deterministic, in range, and fills every bar`,
      digest(score) === digest(again.get(language)!.score) &&
        receipt.status === 'applied' &&
        validateStrictBarMath(score).valid &&
        inRange(guitar, 52, 79) &&
        inRange(colour, 48, 76) &&
        inRange(bass, 33, 50) &&
        leaps(guitar) <= 12 &&
        leaps(bass) <= 12 &&
        rests &&
        arts,
    );
    t(
      `${language} seed ${SECOND_SEED} changes the line and keeps the operators`,
      digest(other.get(language)!.score) !== digest(score) &&
        other.get(language)!.receipt.operators.join(',') === receipt.operators.join(','),
    );
  }

  const herrmann = built.get('bernard_herrmann')!;
  const herrmannOther = other.get('bernard_herrmann')!;
  const pedal = pc(barNotes(herrmann.score, 'acoustic_upright_bass', 1, 1)[0]?.pitch ?? -1);
  let pedalBars = 0;
  for (let bar = 1; bar <= 16; bar++) {
    const downbeat = barNotes(herrmann.score, 'acoustic_upright_bass', bar, 1).find((note) => note.startBeat === 0);
    if (downbeat && pc(downbeat.pitch) === pedal) pedalBars += 1;
  }
  const herrmannIntervals: number[] = [];
  const herrmannLine = notesOf(herrmann.score, 'clean_electric_guitar', 1);
  for (let i = 1; i < herrmannLine.length; i++) herrmannIntervals.push(Math.abs(herrmannLine[i]!.pitch - herrmannLine[i - 1]!.pitch) % 12);
  t(
    'Herrmann returns the opening cell after a silence and keeps a pedal',
    same(barNotes(herrmann.score, 'clean_electric_guitar', 1, 1).map((note) => note.pitch), barNotes(herrmann.score, 'clean_electric_guitar', 15, 1).map((note) => note.pitch)) &&
      rhythmKey(herrmann.score, 1, 1) !== rhythmKey(herrmann.score, 2, 1) &&
      barNotes(herrmann.score, 'clean_electric_guitar', 4, 1).length === 0 &&
      barNotes(herrmann.score, 'clean_electric_guitar', 14, 1).length === 0 &&
      barNotes(herrmann.score, 'clean_electric_guitar', 16, 1).length === 1 &&
      pedalBars >= 12 &&
      herrmannIntervals.filter((interval) => interval === 1 || interval === 6).length >= 4 &&
      herrmann.receipt.operators.includes('expand-intervals') &&
      herrmann.receipt.operators.includes('register-lift') &&
      pedalBars <= 16 &&
      barNotes(herrmannOther.score, 'clean_electric_guitar', 4, 1).length === 0 &&
      same(
        barNotes(herrmannOther.score, 'clean_electric_guitar', 1, 1).map((note) => pc(note.pitch)),
        barNotes(herrmannOther.score, 'clean_electric_guitar', 15, 1).map((note) => pc(note.pitch)),
      ),
  );

  const ravel = built.get('ravel')!;
  const suffixes = new Set(ravel.receipt.harmony.map((symbol) => symbol.replace(/^[A-G](?:#|b)?/, '')));
  const ravelLead = notesOf(ravel.score, 'clean_electric_guitar', 1);
  const ravelInner = notesOf(ravel.score, 'clean_electric_guitar', 2);
  let exchangeBass = 0;
  let exchangeGuitar = 0;
  for (let bar = 9; bar <= 12; bar++) {
    exchangeBass += barNotes(ravel.score, 'acoustic_upright_bass', bar, 1).length;
    exchangeGuitar += barNotes(ravel.score, 'clean_electric_guitar', bar, 1).length;
  }
  const verticals: number[] = [];
  for (const measure of ravel.score.parts[0]!.measures) {
    const lead = measure.events.find((event) => event.kind === 'note' && (event.voice ?? 1) === 1);
    const inner = measure.events.find((event) => event.kind === 'note' && (event.voice ?? 1) === 2);
    if (lead?.kind === 'note' && inner?.kind === 'note' && lead.startBeat === inner.startBeat) {
      verticals.push(lead.pitch - inner.pitch);
    }
  }
  let parallelRun = 1;
  let parallelMax = 1;
  for (let i = 1; i < verticals.length; i++) {
    parallelRun = verticals[i] === verticals[i - 1] ? parallelRun + 1 : 1;
    parallelMax = Math.max(parallelMax, parallelRun);
  }
  t(
    'Ravel changes harmonic colour and gives the inner line its own job',
    suffixes.size >= 5 &&
      ravelInner.length > 0 &&
      ravelInner.length * 2 < ravelLead.length &&
      exchangeBass > exchangeGuitar &&
      verticals.length >= 4 &&
      new Set(verticals).size >= 2 &&
      parallelMax < 4 &&
      verticals.every((interval) => interval > 0 && interval <= 16) &&
      ravel.receipt.operators.includes('transpose-in-field'),
  );

  const dutilleux = built.get('dutilleux')!;
  const opening = barNotes(dutilleux.score, 'clean_electric_guitar', 1, 1).map((note) => pc(note.pitch));
  const returned = barNotes(dutilleux.score, 'clean_electric_guitar', 15, 1).map((note) => pc(note.pitch));
  const inverted = barNotes(dutilleux.score, 'clean_electric_guitar', 5, 1).map((note) => pc(note.pitch));
  let pivotBars = 0;
  const pivot = opening[0] ?? -1;
  for (let bar = 9; bar <= 12; bar++) {
    const sounding = [
      ...barNotes(dutilleux.score, 'clean_electric_guitar', bar, 1),
      ...barNotes(dutilleux.score, 'acoustic_upright_bass', bar, 1),
    ];
    if (sounding.some((note) => pc(note.pitch) === pivot)) pivotBars += 1;
  }
  const bar13 = dutilleux.score.parts[0]!.measures.find((measure) => measure.index === 13);
  t(
    'Dutilleux transforms the cell and returns only its head',
    same(opening, dutilleux.receipt.motifIntervals.map((step) => pc((opening[0] ?? 0) + step))) &&
      inverted.join(',') !== opening.join(',') &&
      inverted.includes(pivot) &&
      pivotBars === 4 &&
      bar13?.events[0]?.kind === 'rest' &&
      returned.length < opening.length &&
      returned.includes(pivot) &&
      dutilleux.receipt.operators.includes('invert') &&
      dutilleux.receipt.operators.includes('fragment-head') &&
      (dutilleux.receipt.operators.includes('expand-intervals') || dutilleux.receipt.operators.includes('retrograde')),
  );

  const digests = LANGUAGES.map((language) => digest(built.get(language)!.score));
  t('the three languages do not sound the same line', new Set(digests).size === 3);
  t(
    'Herrmann is the pedal language, Ravel the layered language, Dutilleux the inverted language',
    pedalBars > 8 &&
      notesOf(ravel.score, 'clean_electric_guitar', 2).length > notesOf(dutilleux.score, 'clean_electric_guitar', 2).length &&
      !herrmann.receipt.operators.includes('invert') &&
      dutilleux.receipt.operators.includes('invert'),
  );

  const locked = shell(16, Array.from({ length: 16 }, () => 'Cmaj7'));
  const lockedBefore = digest(locked);
  const lockedApply = applyE1ComposerLanguage(locked, { seed: PRIMARY_SEED, songwriterId: 'ravel', leadSheetLocked: true });
  const blendApply = applyE1ComposerLanguage(locked, { seed: PRIMARY_SEED, songwriterId: 'ravel', blendBlocked: true });
  const outside = applyE1ComposerLanguage(locked, { seed: PRIMARY_SEED, songwriterId: 'john_barry' });
  const planted = composeE1ComposerLanguage('bernard_herrmann', PRIMARY_SEED).score;
  const plantedNote = planted.parts[0]!.measures[0]!.events.find((event) => event.kind === 'note');
  if (plantedNote && plantedNote.kind === 'note') plantedNote.pitch = 40;
  const preserved = applyE1ComposerLanguage(planted, {
    seed: PRIMARY_SEED,
    songwriterId: 'herrmann',
    protectedBars: [1],
  });
  const preservedNote = preserved.score.parts[0]!.measures[0]!.events.find((event) => event.kind === 'note');
  const symbolLock = applyE1ComposerLanguage(shell(16, Array.from({ length: 16 }, () => 'Cmaj7')), {
    seed: PRIMARY_SEED,
    songwriterId: 'dutilleux',
  });
  const odd = shell(8, Array.from({ length: 8 }, () => 'C'));
  odd.parts[0]!.measures[1]!.measureBeatSpanQuarters = 3;
  odd.parts[1]!.measures[1]!.measureBeatSpanQuarters = 3;
  const oddApply = applyE1ComposerLanguage(odd, { seed: PRIMARY_SEED, songwriterId: 'ravel' });
  const long = applyE1ComposerLanguage(shell(32, Array.from({ length: 32 }, () => 'Dm7')), {
    seed: PRIMARY_SEED,
    songwriterId: 'bernard_herrmann',
  });
  const bar1pc = pc(barNotes(long.score, 'clean_electric_guitar', 1, 1)[0]?.pitch ?? 0);
  const bar17pc = pc(barNotes(long.score, 'clean_electric_guitar', 17, 1)[0]?.pitch ?? 0);
  t(
    'locks, foreign languages, and odd metres refuse or preserve the source',
    lockedApply.receipt.status === 'refused' &&
      digest(lockedApply.score) === lockedBefore &&
      blendApply.receipt.status === 'refused' &&
      outside.receipt.status === 'refused' &&
      preserved.receipt.status === 'applied' &&
      preserved.receipt.preservedBars.join(',') === '1' &&
      preservedNote?.kind === 'note' &&
      preservedNote.pitch === 40 &&
      symbolLock.receipt.harmony.every((symbol) => symbol === 'Cmaj7') &&
      oddApply.receipt.status === 'refused' &&
      long.receipt.status === 'applied' &&
      bar1pc !== bar17pc,
  );

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e1-3c-'));
  let exportOk = true;
  for (const language of LANGUAGES) {
    const score = built.get(language)!.score;
    const exported = exportScoreModelToMusicXml(score);
    const xmlPath = path.join(tmp, `${language}.musicxml`);
    const midPath = path.join(tmp, `${language}.mid`);
    if (!exported.success || !exported.xml || !validateMusicXmlSchema(exported.xml).valid) exportOk = false;
    else fs.writeFileSync(xmlPath, exported.xml);
    if (!writeScoreModelMidiFile(score, midPath)) exportOk = false;
    else {
      const midi = decodeMidiPitches(midPath);
      const wanted = scorePitches(score);
      if (!same(xmlPitches(exported.xml ?? ''), wanted) || !same(midi.pitches, wanted)) exportOk = false;
      const quarters = score.parts.reduce(
        (total, part) =>
          total +
          part.measures.reduce(
            (barTotal, measure) => barTotal + measure.events.filter((event) => event.kind === 'note').reduce((n, event) => n + event.duration, 0),
            0,
          ),
        0,
      );
      if (midi.ticks !== quarters * 480) exportOk = false;
    }
  }
  t('MusicXML and MIDI carry the same pitches and durations', exportOk);

  const finalOk = LANGUAGES.every((language) => validateE1ComposerLanguageFinalOutput(built.get(language)!.score).valid);
  const lowBass = structuredClone(built.get('bernard_herrmann')!.score);
  const lowNote = lowBass.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass')?.measures
    .flatMap((measure) => measure.events)
    .find((event) => event.kind === 'note');
  if (lowNote && lowNote.kind === 'note') lowNote.pitch = 20;
  const lowResult = validateE1ComposerLanguageFinalOutput(lowBass);
  const highGuitar = structuredClone(built.get('ravel')!.score);
  for (const measure of highGuitar.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar')?.measures ?? []) {
    for (const event of measure.events) {
      if (event.kind === 'note') event.pitch = 85;
    }
  }
  const highResult = validateE1ComposerLanguageFinalOutput(highGuitar);
  t(
    'final output keeps hard range and tessitura, and rejects a pitch that breaks them',
    finalOk &&
      !lowResult.valid &&
      lowResult.errors.some((error) => error.includes('outside hard range [28, 55]')) &&
      !highResult.valid &&
      highResult.errors.includes('Guitar tessitura too high') &&
      !highResult.errors.some((error) => error.includes('outside hard range')),
  );

  const barryOff = runGoldenPathOnce(76017, songOpts('john_barry'));
  const barryOn = runGoldenPathOnce(76017, songOpts('john_barry', { e1ComposerLanguage: true }));
  t(
    'golden-path dispatch stays off for a language outside the three',
    barryOff.success === true &&
      barryOn.success === true &&
      barryOff.context.generationMetadata.e1ComposerLanguageReceipt == null &&
      barryOn.context.generationMetadata.e1ComposerLanguageReceipt?.status === 'refused' &&
      digest(barryOff.score) === digest(barryOn.score),
  );

  return out;
}

if (require.main === module) {
  const dir = path.resolve('docs/v3.4-e1-checkpoint3c');
  writeV34E1Checkpoint3cFixtures(dir);
  const rows = runV34E1Checkpoint3cTests();
  for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
  if (rows.some((row) => !row.ok)) process.exit(1);
}
