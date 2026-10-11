/**
 * WPS checks around an existing duo MusicXML score.
 * Does not compose, does not splice A–H, and does not invent a GCE number.
 */

import fs from 'node:fs';
import path from 'node:path';
import { assessGuitarFeasibility } from '../../barry-harris/guitarVoicingFeasibility';
import { solveFretPath, type FretSlice } from '../../performance-composer/pcFretboard';
import { auditWwhMusicXml } from '../wwhValidate';
import {
  importWwhDuoMusicXml,
  type WwhDuoScore,
  type WwhImportedMeasure,
  type WwhImportedNote,
  type WwhImportedPart,
} from '../wwhDuoImport';
import { WPS_VERSION, type WpsSongSpec } from './wpsTypes';

const FIVE_MINUTES_SECONDS = 300;

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export interface WpsRunReport {
  ok: boolean;
  lines: string[];
}

function readScore(file: string): { xml: string; score: WwhDuoScore } {
  const xml = fs.readFileSync(file, 'utf8');
  return { xml, score: importWwhDuoMusicXml(xml) };
}

function loadScore(
  file: string,
  label: string,
  fail: (line: string) => void
): { xml: string; score: WwhDuoScore } | null {
  if (!file || !fs.existsSync(file)) {
    fail(`missing ${label}: ${file || '(empty path)'}`);
    return null;
  }
  try {
    return readScore(file);
  } catch (error) {
    fail(`${label} unreadable: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function noteName(note: WwhImportedNote): string {
  if (note.rest || !note.step || note.octave == null) return 'r';
  const pc = (PC[note.step]! + (note.alter ?? 0) + 120) % 12;
  return `${NAMES[pc]}${note.octave}`;
}

function soundingMidi(note: WwhImportedNote, transposeOctave: number): number | null {
  if (note.rest || !note.step || note.octave == null) return null;
  return (note.octave + 1) * 12 + PC[note.step]! + (note.alter ?? 0) + transposeOctave * 12;
}

function bassSignature(part: WwhImportedPart): string {
  return part.measures
    .map((measure) => {
      const notes = measure.notes
        .map((note) =>
          [
            note.rest ? 'r' : noteName(note),
            note.chord ? 'c' : 'n',
            note.storedDuration,
            note.voice,
            note.tieStart ? 'ts' : '',
            note.tieStop ? 'tp' : '',
            note.type ?? '',
            note.dots,
          ].join(':')
        )
        .join(',');
      return [
        measure.number,
        `${measure.beats}/${measure.beatType}`,
        measure.tempo.soundTempo ?? '',
        measure.rehearsal.join('+'),
        notes,
      ].join('!');
    })
    .join('\n');
}

function metreSignature(part: WwhImportedPart): string {
  return part.measures.map((measure) => `${measure.beats}/${measure.beatType}`).join(',');
}

function guitarAttackBars(part: WwhImportedPart): Set<number> {
  const sounding = new Set<number>();
  part.measures.forEach((measure, index) => {
    if (measure.notes.some((note) => !note.rest)) sounding.add(index + 1);
  });
  return sounding;
}

function quartersIn(measure: WwhImportedMeasure): number {
  return (measure.beats * 4) / measure.beatType;
}

function durationFromSound(part: WwhImportedPart): { seconds: number; tempoByBar: string[] } {
  let seconds = 0;
  let tempo = Number(part.measures[0]?.tempo.soundTempo ?? part.measures[0]?.tempo.perMinute ?? 0);
  const tempoByBar: string[] = [];
  for (const measure of part.measures) {
    const next = Number(measure.tempo.soundTempo ?? '');
    if (Number.isFinite(next) && next > 0) tempo = next;
    const q = quartersIn(measure);
    seconds += (q * 60) / tempo;
    tempoByBar.push(`${measure.number}:${tempo}`);
  }
  return { seconds, tempoByBar };
}

function durationFromPlan(part: WwhImportedPart, plan: WpsSongSpec['tempoPlan']): number {
  const sorted = [...plan].sort((a, b) => a.fromBar - b.fromBar);
  let seconds = 0;
  part.measures.forEach((measure, index) => {
    const bar = index + 1;
    let tempo = sorted[0]?.quartersPerMinute ?? 0;
    for (const span of sorted) {
      if (span.fromBar <= bar) tempo = span.quartersPerMinute;
    }
    seconds += (quartersIn(measure) * 60) / tempo;
  });
  return seconds;
}

function formatClock(seconds: number): string {
  const rounded = Math.round(seconds * 100) / 100;
  const minutes = Math.floor(rounded / 60);
  const remain = rounded - minutes * 60;
  return `${minutes}:${remain.toFixed(2).padStart(5, '0')}`;
}

interface GuitarEvent {
  bar: number;
  start: number;
  end: number;
  midi: number;
  tieStop: boolean;
}

function guitarEvents(part: WwhImportedPart): GuitarEvent[] {
  const events: GuitarEvent[] = [];
  let origin = 0;
  for (let index = 0; index < part.measures.length; index++) {
    const measure = part.measures[index]!;
    const voiceCursor = new Map<string, number>();
    let lastStart = 0;
    for (const note of measure.notes) {
      const voice = note.voice || '1';
      const quarters = note.duration / measure.divisions;
      if (note.chord) {
        const midi = soundingMidi(note, measure.transposeOctave);
        if (midi != null) {
          events.push({
            bar: index + 1,
            start: origin + lastStart,
            end: origin + lastStart + quarters,
            midi,
            tieStop: note.tieStop,
          });
        }
        continue;
      }
      const start = voiceCursor.get(voice) ?? 0;
      lastStart = start;
      const midi = soundingMidi(note, measure.transposeOctave);
      if (midi != null) {
        events.push({
          bar: index + 1,
          start: origin + start,
          end: origin + start + quarters,
          midi,
          tieStop: note.tieStop,
        });
      }
      voiceCursor.set(voice, start + quarters);
    }
    origin += quartersIn(measure);
  }
  return events;
}

function fretSlices(events: readonly GuitarEvent[]): FretSlice[] {
  const onsets = [...new Set(events.map((event) => event.start))].sort((a, b) => a - b);
  return onsets.map((time) => {
    const sounding = events.filter((event) => event.start <= time + 1e-6 && event.end > time + 1e-6);
    const midis = [...new Set(sounding.map((event) => event.midi))];
    const held = [
      ...new Set(
        sounding.filter((event) => event.start < time - 1e-6 || event.tieStop).map((event) => event.midi)
      ),
    ];
    return { time, midis, held, bar: sounding[0]?.bar ?? 0 };
  });
}

function phraseSketch(part: WwhImportedPart): { bars: number; attacks: number; open: string; close: string } {
  const attacks: string[] = [];
  part.measures.forEach((measure, index) => {
    const pitches = measure.notes.filter((note) => !note.rest && !note.chord).map(noteName);
    if (pitches.length) attacks.push(`${index + 1}:${pitches[0]}`);
  });
  const attackCount = part.measures.reduce(
    (sum, measure) => sum + measure.notes.filter((note) => !note.rest && !note.chord).length,
    0
  );
  return {
    bars: part.measures.length,
    attacks: attackCount,
    open: attacks[0] ?? 'none',
    close: attacks[attacks.length - 1] ?? 'none',
  };
}

function seamWindow(part: WwhImportedPart, bars: string): string {
  const match = bars.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!match) return `${bars}: no bar span in the spec`;
  const from = Number(match[1]);
  const to = Number(match[2]);
  const bits: string[] = [];
  for (let bar = from; bar <= to && bar <= part.measures.length; bar++) {
    const measure = part.measures[bar - 1]!;
    const line = measure.notes
      .filter((note) => !note.chord)
      .map((note) => noteName(note))
      .join(' ');
    bits.push(`${bar} ${line || 'empty'}`);
  }
  return bits.join(' | ');
}

export function runWps(spec: WpsSongSpec): WpsRunReport {
  const lines: string[] = [];
  let ok = true;
  const fail = (line: string) => {
    ok = false;
    lines.push(`FAIL ${line}`);
  };

  lines.push(`WPS V${WPS_VERSION} ${spec.id} — ${spec.title}`);
  lines.push(
    'WPS does not generate musical notes. A compositional agent writes the score. This run checks that score and does not write MusicXML.'
  );
  if (spec.wpsVersion !== WPS_VERSION) fail(`spec version ${spec.wpsVersion ?? '(missing)'}, expected ${WPS_VERSION}`);
  if (spec.selectiveSynthesis !== true) fail('selective synthesis is required; whole-passage splicing is outside WPS');
  lines.push(`MCI continuity: ${spec.mci?.continuity ?? '(missing)'}`);
  lines.push(`MCI innovation: ${spec.mci?.innovation ?? '(missing)'}`);
  if (!spec.mci?.continuity || !spec.mci?.innovation) fail('MCI continuity and innovation are required');
  const radical = spec.radicalProfile;
  lines.push(
    'Radical WWH guideline: 65% melody / 20% harmony / 40% rhythm. Listening heuristic, not a note-count quota. Do not transform melody, harmony, and rhythm at the same moment.'
  );
  if (!radical) fail('radical profile is missing');
  else {
    lines.push(
      `This song records melody ${radical.melodyPercent}% / harmony ${radical.harmonyPercent}% / rhythm ${radical.rhythmPercent}%. ${radical.note ?? ''}`
    );
  }
  const cbv = spec.cbv;
  if (!cbv || cbv.incorporated !== false) fail('CBV must stay unincorporated; principal scores keep strict bass LOCK');
  else if (cbv.decision === 'no-change' && cbv.proposals.length > 0) fail('CBV decision is no-change but proposals are listed');
  else if (cbv.decision === 'proposals' && cbv.proposals.length === 0) fail('CBV decision is proposals but the list is empty');
  else if (!cbv.proposals.every((proposal) => proposal.reversible === true)) {
    fail('every CBV proposal must be reversible');
  } else {
    lines.push(
      `CBV ${cbv.decision}: ${cbv.proposals.length} proposal(s), incorporated=false. ${cbv.note} Principal bass LOCK is strict.`
    );
    for (const proposal of cbv.proposals) {
      lines.push(`CBV proposal ${proposal.bars}: ${proposal.change} (reversible, not written)`);
    }
  }
  const gce = spec.gce;
  if (!gce || gce.officialNumeric !== false) fail('official numeric GCE cannot be claimed by WPS');

  lines.push('Step 1 — Source ingestion and LOCK');
  const lead = loadScore(spec.leadsheet, 'leadsheet', fail);
  if (!lead) {
    lines.push(ok ? 'WPS RESULT: PASS' : 'WPS RESULT: FAIL');
    return { ok, lines };
  }
  const leadAudit = auditWwhMusicXml(lead.xml, 'leadsheet');
  lines.push(...leadAudit.lines);
  if (!leadAudit.ok) fail('leadsheet audit');
  lines.push(
    `leadsheet bars ${lead.score.guitar.measures.length}; bass events locked as the comparison stream`
  );
  if (lead.score.guitar.measures.length !== spec.expectedBars || lead.score.bass.measures.length !== spec.expectedBars) {
    fail(`leadsheet bar count ${lead.score.guitar.measures.length}/${lead.score.bass.measures.length}, expected ${spec.expectedBars}`);
  }

  let performance: { xml: string; score: WwhDuoScore } | null = null;
  if (spec.performanceEdition) {
    const editionName = path.basename(spec.performanceEdition);
    if (!spec.performanceEditionId) fail('performance edition is set without performanceEditionId');
    else if (!editionName.includes(spec.performanceEditionId)) {
      fail(`performance file ${editionName} is not edition ${spec.performanceEditionId}`);
    } else {
      lines.push(`performance edition resolved ${spec.performanceEditionId}: ${editionName}`);
    }
    performance = loadScore(spec.performanceEdition, 'performance edition', fail);
    if (!performance) {
      lines.push(ok ? 'WPS RESULT: PASS' : 'WPS RESULT: FAIL');
      return { ok, lines };
    }
    const performanceAudit = auditWwhMusicXml(performance.xml, 'performance');
    lines.push(...performanceAudit.lines);
    if (!performanceAudit.ok) fail('performance audit');
    if (performance.score.bass.measures.length !== spec.expectedBars) {
      fail(`bar count ${performance.score.bass.measures.length}, expected ${spec.expectedBars}`);
    }
    if (bassSignature(performance.score.bass) !== bassSignature(lead.score.bass)) {
      fail('bass event stream differs from the leadsheet');
    } else {
      lines.push('bass event stream matches the leadsheet');
    }
    if (metreSignature(performance.score.guitar) !== metreSignature(lead.score.guitar)) {
      fail('guitar metre map differs from the leadsheet');
    } else {
      lines.push('metre map matches the leadsheet');
    }
    const marks = performance.score.guitar.measures.flatMap((measure, index) =>
      measure.rehearsal.map((mark) => `${mark}@${index + 1}`)
    );
    lines.push(`rehearsal ${marks.join(', ') || 'none'}`);
    for (const expected of spec.rehearsal) {
      const found = performance.score.guitar.measures[expected.bar - 1]?.rehearsal.includes(expected.mark);
      if (!found) fail(`rehearsal ${expected.mark} missing at bar ${expected.bar}`);
    }
    const sounding = guitarAttackBars(performance.score.guitar);
    const silent = performance.score.guitar.measures
      .map((_, index) => index + 1)
      .filter((bar) => !sounding.has(bar));
    lines.push(`guitar bars with no pitched attack: ${silent.join(', ') || 'none'}`);
    for (const bar of spec.protectedGuitarSilences) {
      if (sounding.has(bar)) fail(`protected guitar silence filled at bar ${bar}`);
    }
  } else {
    lines.push('no performance edition — LOCK of a result score was not run');
    if (gce && gce.dcrRefinements > 1) fail('planning run records more than one DCR refinement');
  }

  lines.push('Step 2 — A–H phrase discovery');
  const arrangements = spec.arrangements ?? [];
  if (arrangements.length > 8) fail('more than eight arrangements');
  if (spec.arrangementIds) {
    const found = arrangements.map((arrangement) => arrangement.id);
    if (found.join(',') !== spec.arrangementIds.join(',')) {
      fail(`arrangement ids ${found.join(', ') || '(none)'}, expected ${spec.arrangementIds.join(', ')}`);
    } else {
      lines.push(`arrangement inventory ${spec.arrangementIds.join(', ')}`);
    }
  }
  if (!arrangements.length) lines.push('no arrangements listed');
  for (const arrangement of arrangements) {
    if (!fs.existsSync(arrangement.path)) {
      fail(`missing arrangement ${arrangement.id}: ${arrangement.path}`);
      continue;
    }
    let source: { xml: string; score: WwhDuoScore };
    try {
      source = readScore(arrangement.path);
    } catch (error) {
      fail(`arrangement ${arrangement.id} unreadable: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const sketch = phraseSketch(source.score.guitar);
    const bassSame = bassSignature(source.score.bass) === bassSignature(lead.score.bass);
    lines.push(
      `${arrangement.id}: ${sketch.bars} bars, ${sketch.attacks} guitar attacks, open ${sketch.open}, close ${sketch.close}, bass ${bassSame ? 'matches leadsheet' : 'differs from leadsheet'}`
    );
  }
  lines.push('Arrangements were inventoried and not spliced.');

  lines.push('Step 3 — Musical narrative and motif plan (from this song\'s spec)');
  lines.push(`motif ${spec.motif.name}: ${spec.motif.pitches.join('–')}. ${spec.motif.note}`);
  for (const stage of spec.narrative) lines.push(`narrative ${stage.bars} ${stage.name}: ${stage.job}`);
  if (performance) {
    for (const seam of spec.seams) {
      lines.push(`seam ${seam.bars} (${seam.job}): ${seamWindow(performance.score.guitar, seam.bars)}`);
    }
  } else {
    for (const seam of spec.seams) lines.push(`seam ${seam.bars}: ${seam.job}`);
    lines.push('Step 4 — no performance file, so no synthesis check');
  }

  if (performance) {
    lines.push('Step 4 — Composition is the performance file. This script does not generate notes.');
    lines.push('Step 5 — Guitar idiom and feasibility');
    lines.push('Guitar check uses sounding pitches after octave-change. Bass is excluded. Span 4. A solver pass is not a player’s approval.');
    const events = guitarEvents(performance.score.guitar);
    const slices = fretSlices(events).filter((slice) => slice.midis.length > 0);
    const path = solveFretPath(slices);
    lines.push(
      `solveFretPath ok=${path.ok} slices=${slices.length} maxFret=${path.maxFret} maxSpan=${path.maxSpan} hardShifts=${path.hardShifts}`
    );
    if (!path.ok) fail(`fret path failed at slice ${path.failedAt} bar ${slices[path.failedAt]?.bar ?? '?'}`);
    let infeasible = 0;
    for (const slice of slices) {
      if (!assessGuitarFeasibility(slice.midis, { allowStretch: false }).feasible) infeasible += 1;
    }
    lines.push(`assessGuitarFeasibility span 4 failures: ${infeasible}`);
    if (infeasible) fail('guitar slice outside span 4');
    const octave = performance.score.guitar.measures[0]?.transposeOctave;
    lines.push(`guitar octave-change ${octave}`);

    lines.push('Step 6 — GCE evidence and one DCR refinement');
    if (gce && gce.dcrRefinements !== 1) fail(`performance check requires one DCR refinement, found ${gce.dcrRefinements}`);
    lines.push(
      'NO OFFICIAL NUMERIC GCE. evaluateGce scores a Composer OS ScoreModel. This file is hand-authored MusicXML. MORPH v0.3 forbids treating that mismatch as a musical result. runDcrProtocol was not executed; it generates engine candidates and does not edit this score.'
    );
    if (gce) lines.push(`DCR record: ${gce.dcrRefinements} refinement. Weakest: ${gce.weakest}`);

    lines.push('Step 7 — Duration and export check');
    const sounded = durationFromSound(performance.score.guitar);
    const planned = durationFromPlan(performance.score.guitar, spec.tempoPlan);
    lines.push(`playback from <sound tempo>: ${formatClock(sounded.seconds)} (${sounded.seconds.toFixed(2)}s)`);
    lines.push(`printed tempo plan: ${formatClock(planned)} (${planned.toFixed(2)}s)`);
    const limit = spec.targetDurationSeconds;
    if (limit.max >= FIVE_MINUTES_SECONDS) fail('target maximum is not under five minutes');
    if (sounded.seconds >= FIVE_MINUTES_SECONDS) fail('playback duration is not under five minutes');
    else lines.push(`duration under five minutes: ${formatClock(sounded.seconds)}`);
    if (sounded.seconds < limit.min || sounded.seconds > limit.max) {
      fail(`playback duration outside ${limit.min}–${limit.max}s`);
    }
    if (planned > limit.max) fail('printed tempo plan is not under the maximum');
    if (Math.abs(sounded.seconds - planned) > 0.05) {
      fail('printed tempo plan and <sound tempo> disagree');
    }
    lines.push(`performance file ${spec.performanceEdition}`);
    lines.push('No new MusicXML was written by this run.');
  }

  lines.push(ok ? 'WPS RESULT: PASS' : 'WPS RESULT: FAIL');
  return { ok, lines };
}
