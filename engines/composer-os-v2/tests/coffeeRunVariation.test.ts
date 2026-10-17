/**
 * Coffee Run — Variation. Musical contract, parity, and negative controls.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import {
  COFFEE_RUN_ACTIVITY,
  COFFEE_RUN_HARMONY,
  COFFEE_RUN_REFERENCE_HARMONY,
  coffeeRunBarSummary,
  coffeeRunMarkerText,
  coffeeRunStartTime,
} from '../core/piano/coffeeRunVariation';
import { pianoMidiNotes, writePianoScoreMidi } from '../core/piano/pianoMidi';
import { comparePianoScoreToXml, parsePianoXmlAtoms } from '../core/piano/pianoXmlOracle';
import { validateMusicXml } from '../../../src/utils/musicXmlValidator';
import { validateExportedMusicXmlBarMath } from '../core/export/validateMusicXmlBarMath';
import { validateWrittenMusicXmlStrict } from '../core/export/validateMusicXmlWrittenStrict';

const ORIGINAL = '/Users/user/Documents/DEVS/FILM CUES/12-FILM-CUES-ALBUM-SOURCE-MATERIAL/01-COFFEE-RUN/05-COMPOSITION/WONDERLAND-LYRICAL-V1.0/Coffee Run Full 17 Oct 2026.musicxml';

type Row = { name: string; ok: boolean; detail?: string };

function row(name: string, ok: boolean, detail?: string): Row {
  return { name, ok, detail };
}

function soundingRh(xml: string): number[] {
  const parsed = parsePianoXmlAtoms(xml);
  return parsed.atoms
    .filter((atom) => !atom.rest && atom.midi !== null && atom.staff === 1 && atom.voice === 1 && !atom.tieStop)
    .sort((a, b) => a.onset - b.onset || (a.midi ?? 0) - (b.midi ?? 0))
    .map((atom) => atom.midi ?? 0);
}

function originalPianoRh(xml: string): number[] {
  const part = xml.match(/<part id="P1">([\s\S]*?)<\/part>/)?.[1] ?? '';
  const step: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const out: number[] = [];
  for (const measure of part.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)) {
    for (const note of measure[1]!.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/g)) {
      const block = note[1] ?? '';
      if (/<rest\b/.test(block) || /<chord\s*\/>/.test(block)) continue;
      const staff = block.match(/<staff>\s*(\d+)\s*<\/staff>/)?.[1] ?? '1';
      if (staff !== '1') continue;
      const name = block.match(/<step>\s*([A-G])\s*<\/step>/)?.[1];
      if (!name) continue;
      const alter = Number(block.match(/<alter>\s*(-?\d+)\s*<\/alter>/)?.[1] ?? '0');
      const octave = Number(block.match(/<octave>\s*(\d+)\s*<\/octave>/)?.[1] ?? '0');
      out.push((octave + 1) * 12 + (step[name] ?? 0) + alter);
    }
  }
  return out;
}

function constantTransposition(left: number[], right: number[]): boolean {
  if (left.length < 4 || left.length !== right.length) return false;
  const delta = left[0]! - right[0]!;
  return left.every((pitch, index) => pitch - right[index]! === delta);
}

export function runCoffeeRunVariationTests(): Row[] {
  const rows: Row[] = [];
  const disabled = apiComposePianoV1({ filmCue: 'coffee-run-variation', seed: 76018 });
  rows.push(row('film cue without the piano flag stays disabled', disabled.ok === false && disabled.code === 'disabled'));
  const unknown = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, filmCue: 'other' });
  rows.push(row('unknown film cue is rejected', unknown.ok === false && unknown.code === 'bad_request'));
  const checkpoint = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, bars: 24 });
  rows.push(row('24 bars without the film cue stays outside the checkpoint', checkpoint.ok === false));
  const wrongBars = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, filmCue: 'coffee-run-variation', bars: 8 });
  rows.push(row('film cue rejects a non-24 bar count', wrongBars.ok === false && wrongBars.code === 'bad_request'));
  const wrongTempo = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, filmCue: 'coffee-run-variation', tempo: 72 });
  rows.push(row('film cue rejects a tempo change', wrongTempo.ok === false && wrongTempo.code === 'bad_request'));

  const first = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, filmCue: 'coffee-run-variation' });
  const replay = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, filmCue: 'coffee-run-variation' });
  const otherSeed = apiComposePianoV1({ pianoCompositionV1: true, seed: 76019, filmCue: 'coffee-run-variation' });
  rows.push(row('variation composes', first.ok, first.ok ? '' : first.error));
  rows.push(row('same seed repeats', first.ok && replay.ok && first.xml === replay.xml));
  rows.push(row('another seed repeats the same composed cue', otherSeed.ok && first.ok && otherSeed.xml === first.xml));

  if (!first.ok) return rows;
  const part = first.score.parts[0]!;
  const tempoMarks = first.xml.match(/<per-minute>(\d+)<\/per-minute>/g) ?? [];
  const soundTempos = first.xml.match(/<sound tempo="(\d+)"/g) ?? [];
  rows.push(row(
    'one piano, 24 bars, 4/4, one tempo of 64',
    first.score.parts.length === 1
      && part.id === 'piano'
      && part.measures.length === 24
      && first.score.timeSignature?.beats === 4
      && first.score.timeSignature.beatType === 4
      && first.elapsedSeconds === 90
      && tempoMarks.length === 1
      && tempoMarks[0] === '<per-minute>64</per-minute>'
      && soundTempos.length === 1
      && !first.xml.includes('Strings')
      && (first.xml.match(/<score-part /g) ?? []).length === 1,
    `elapsed ${first.elapsedSeconds}`,
  ));
  rows.push(row(
    'reharmonisation is bars 6, 8, 10, 16, 20 and 22',
    COFFEE_RUN_HARMONY.map((chord, index) => chord === COFFEE_RUN_REFERENCE_HARMONY[index] ? '' : String(index + 1)).filter(Boolean).join(',') === '6,8,10,16,20,22',
  ));
  const markerOk = [1, 3, 6, 11, 12, 17, 19, 21, 24].every((bar) => {
    const text = coffeeRunMarkerText(bar);
    const measure = first.xml.split(/<measure\b/).slice(1)[bar - 1] ?? '';
    return text.length > 0 && (text.split(' — ')[0] === '' || measure.includes(text.split(' — ')[0]!));
  });
  rows.push(row('film-marker words sit in their bars', markerOk));
  rows.push(row(
    'dynamics and the diminuendo are present, and freely adds no tempo',
    first.xml.includes('<p/>')
      && first.xml.includes('<mp/>')
      && first.xml.includes('<pp/>')
      && first.xml.includes('<wedge type="diminuendo"/>')
      && first.xml.includes('<wedge type="stop"/>')
      && first.xml.includes('Credits — distant echo, freely')
      && soundTempos.length === 1,
  ));
  const pedalStarts = first.xml.match(/<pedal type="start"/g) ?? [];
  const pedalStops = first.xml.match(/<pedal type="stop"/g) ?? [];
  rows.push(row(
    'pedal has starts and controlled stops',
    pedalStarts.length >= 8 && pedalStops.length >= 8 && pedalStops.length === pedalStarts.length,
    `start ${pedalStarts.length} stop ${pedalStops.length}`,
  ));
  const written = validateWrittenMusicXmlStrict(first.xml);
  const barMath = validateExportedMusicXmlBarMath(first.xml);
  const schema = validateMusicXml(first.xml);
  rows.push(row(
    'structural and schema checks',
    written.valid && barMath.valid && schema.valid,
    [...written.errors, ...barMath.errors, ...schema.errors].slice(0, 4).join(' | '),
  ));
  const compared = comparePianoScoreToXml(first.score, first.xml);
  rows.push(row('score and MusicXML sounding events match', compared.ok, compared.errors.slice(0, 4).join(' | ')));
  const parsed = parsePianoXmlAtoms(first.xml);
  const finalNotes = parsed.atoms.filter((atom) => !atom.rest && atom.onset >= 92 && atom.midi !== null);
  rows.push(row(
    'bar 24 chord ends at beat 96',
    finalNotes.length >= 5 && finalNotes.every((atom) => Math.abs(atom.onset + atom.duration - 96) < 1e-6),
    finalNotes.map((atom) => `${atom.midi}@${atom.onset}+${atom.duration}`).join(' '),
  ));
  rows.push(row(
    'opening cell descends and is not the original rising E–F–G',
    soundingRh(first.xml).slice(0, 3).join(',') === '76,74,72',
  ));
  rows.push(row(
    'motif chain is displace, augment, transpose-in-field',
    first.plan.transformOps.join(',') === 'displace,augment,transpose-in-field'
      && first.plan.returnLockBars.join(',') === '17,21',
  ));
  rows.push(row('summary has 24 rows', coffeeRunBarSummary().match(/^\| \d+ \|/gm)?.length === 24));
  rows.push(row(
    'summary times match the 3.75-second bar',
    coffeeRunStartTime(1) === '0:00.00'
      && coffeeRunStartTime(3) === '0:07.50'
      && coffeeRunStartTime(17) === '1:00.00'
      && coffeeRunStartTime(24) === '1:26.25'
      && COFFEE_RUN_ACTIVITY.length === 24,
  ));

  const lock = apiComposePianoV1({
    pianoCompositionV1: true,
    seed: 76018,
    filmCue: 'coffee-run-variation',
    lockedEvents: [{ bar: 1, voice: 1, startBeat: 0.5, duration: 0.5, pitch: 64 }],
  });
  rows.push(row('mismatched variation lock fails', lock.ok === false && lock.code === 'unsupported_lock'));

  const stripped = first.xml.replace(/<per-minute>64<\/per-minute>/, '<per-minute>65</per-minute>');
  rows.push(row('a changed tempo is not this file', stripped !== first.xml));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coffee-run-'));
  const midiPath = path.join(dir, 'Coffee-Run-Variation.mid');
  writePianoScoreMidi(first.score, midiPath);
  const midi = pianoMidiNotes(midiPath);
  const xmlNotes = compared.sounding
    .filter((event) => !event.rest && event.midi !== null)
    .map((event) => ({
      midi: event.midi ?? 0,
      ticks: Math.round(event.onset * 480),
      durationTicks: Math.round(event.duration * 480),
    }))
    .sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);
  const midiKey = midi.notes.map((note) => `${note.midi}:${note.ticks}:${note.durationTicks}`).join('|');
  const xmlKey = xmlNotes.map((note) => `${note.midi}:${note.ticks}:${note.durationTicks}`).join('|');
  rows.push(row(
    'MIDI notes match MusicXML ticks',
    midi.ppq === 480 && midi.notes.length === 110 && midiKey === xmlKey,
    `xml ${xmlNotes.length} midi ${midi.notes.length}`,
  ));
  const lastOff = Math.max(...midi.notes.map((note) => note.ticks + note.durationTicks));
  const endSeconds = lastOff / midi.ppq * (60 / 64);
  rows.push(row(
    'final MIDI note-off is exactly 90 seconds',
    lastOff === 96 * 480 && Math.abs(endSeconds - 90) < 1e-9,
    `tick ${lastOff} seconds ${endSeconds}`,
  ));
  rows.push(row(
    'pedal CC survives and note times stay put',
    midi.pedal.some((event) => event.value === 127) && midi.pedal.some((event) => event.value === 0),
    `pedal ${midi.pedal.length}`,
  ));

  if (fs.existsSync(ORIGINAL)) {
    const originalXml = fs.readFileSync(ORIGINAL, 'utf8');
    const originalRh = originalPianoRh(originalXml);
    const variationRh = soundingRh(first.xml);
    const originalParts = originalXml.match(/<score-part /g) ?? [];
    rows.push(row(
      'original cue was readable and is not this piano line',
      originalParts.length === 2
        && originalRh.length > 8
        && variationRh.join(',') !== originalRh.join(',')
        && !constantTransposition(variationRh, originalRh)
        && originalRh.slice(0, 3).join(',') === '64,65,67',
      `original RH ${originalRh.length} variation RH ${variationRh.length}`,
    ));
  } else {
    rows.push(row('original cue was readable and is not this piano line', false, 'original MusicXML missing'));
  }

  return rows;
}

if (process.argv[1]?.includes('coffeeRunVariation.test')) {
  const rows = runCoffeeRunVariationTests();
  for (const item of rows) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
