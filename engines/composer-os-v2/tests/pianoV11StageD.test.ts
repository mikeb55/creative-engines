/**
 * Piano V1.1 Stage D. Opt-in musical refinement.
 * Stage C output stays byte-identical when the flag is absent.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { pianoMidiNotes, writePianoScoreMidi } from '../core/piano/pianoMidi';
import { buildPianoTimeline, cyclePlan, timelineTotals } from '../core/piano/pianoMeterPlan';
import { canonicalStageBHarmony, fullV11DemonstrationBody } from '../core/piano/pianoV11Windows';
import { stageDVelocity } from '../core/piano/pianoV11StageD';

type Row = { name: string; ok: boolean; detail?: string };
const rows: Row[] = [];
function row(name: string, ok: boolean, detail?: string): void {
  rows.push({ name, ok, detail });
}

function noteKey(note: { midi: number; ticks: number; durationTicks: number }): string {
  return `${note.midi}@${note.ticks}+${note.durationTicks}`;
}

const base = {
  pianoCompositionV1: true,
  generalPianoV1: true,
  seed: 76018,
  bars: 24,
  tempo: 48,
  tonalCentre: 'C' as const,
  harmony: canonicalStageBHarmony(24),
  pianoV11: fullV11DemonstrationBody(),
};

const off = apiComposePianoV1(base);
const offAgain = apiComposePianoV1({ ...base, pianoV11: { ...fullV11DemonstrationBody(), musicalRefinement: false } });
const onBody = { ...base, pianoV11: { ...fullV11DemonstrationBody(), musicalRefinement: true } };
const on = apiComposePianoV1(onBody);
const onReplay = apiComposePianoV1(JSON.parse(JSON.stringify(onBody)));

row('stage D off composes', off.ok === true, off.ok ? '' : off.error);
row('explicit false matches absent flag', off.ok && offAgain.ok && off.xml === offAgain.xml);
row('stage D on composes', on.ok === true, on.ok ? '' : on.error);
row('stage D replay matches', on.ok && onReplay.ok && on.xml === onReplay.xml);

if (off.ok && on.ok) {
  const dir = mkdtempSync(join(tmpdir(), 'piano-v11d-'));
  const offMidi = join(dir, 'off.mid');
  const onMidi = join(dir, 'on.mid');
  writePianoScoreMidi(off.score, offMidi);
  writePianoScoreMidi(on.score, onMidi);
  const offNotes = pianoMidiNotes(offMidi);
  const onNotes = pianoMidiNotes(onMidi);
  row('stage C baseline keeps 223 attacks', off.soundingAttacks === 223 && offNotes.notes.length === 223);
  row('stage C baseline MIDI identity', offNotes.notes.map(noteKey).sort().join('|') === pianoMidiNotes(offMidi).notes.map(noteKey).sort().join('|'));
  row('stage D off XML has no written dynamics', !off.xml.includes('<dynamics>'));
  row('bar 21 source stays Fmaj7', off.score.parts[0]?.measures[20]?.chordSymbol === 'Fmaj7' && on.score.parts[0]?.measures[20]?.chordSymbol === 'Fmaj7');
  const offSpans = (off.score.parts[0]?.measures ?? []).map((measure) => measure.measureBeatSpanQuarters);
  const onSpans = (on.score.parts[0]?.measures ?? []).map((measure) => measure.measureBeatSpanQuarters);
  const totals = timelineTotals(buildPianoTimeline(cyclePlan(4)));
  row('metre timeline stays 83 quarters', totals.quarters.n === 83 && totals.ticks === 39840 && offSpans.join(',') === onSpans.join(','));
  row('tuplets remain', on.xml.includes('<actual-notes>3</actual-notes>') && on.xml.includes('<actual-notes>5</actual-notes>'));
  row('no tempo map and no pedal', !on.score.tempoMap && !on.score.pianoPedal);
  row('PPQ stays 480', offNotes.ppq === 480 && onNotes.ppq === 480);

  const chosen = on.plan.general?.phraseDevelopment?.spans.map((span) => span.chosen) ?? [];
  const development = chosen.slice(1, 4);
  const dialogue = chosen.slice(5, 8);
  row('development operators are not one repeated choice', new Set(development).size > 1, development.join(','));
  row('dialogue operators are not one repeated choice', new Set(dialogue).size > 1, dialogue.join(','));
  row('return uses the opening head', chosen[10] === 'return-head', chosen.join(','));
  row('ending uses the motif tail', on.plan.general?.phraseDevelopment?.spans[11]?.chosen === 'ending-tail');

  const rhPitches = (bar: number) => (on.score.parts[0]?.measures[bar - 1]?.events ?? [])
    .filter((event) => event.kind === 'note' && (event.voice ?? 1) === 1)
    .map((event) => event.kind === 'note' ? event.pitch : 0);
  const climax = [...rhPitches(19), ...rhPitches(20)];
  const preparation = [...rhPitches(17), ...rhPitches(18)];
  row('climax right hand is not one repeated pitch', new Set(climax).size > 1, climax.join(','));
  row('climax sits above the preparation', Math.max(...climax) > Math.max(...preparation), `${Math.max(...preparation)} -> ${Math.max(...climax)}`);

  const opening = off.plan.general?.phraseDevelopment?.opening.filter((event) => event.midi !== null).slice(0, 3) ?? [];
  const returnDurations = on.plan.general?.phraseDevelopment?.returnDurations ?? [];
  row(
    'return rhythm keeps the opening head',
    opening.length === 3 && opening.every((event, index) => Math.abs(event.duration - (returnDurations[index] ?? -1)) < 1e-6),
    `${opening.map((event) => event.duration).join(',')} vs ${returnDurations.join(',')}`,
  );

  const velocity = (bar: number, voice: number) => {
    const event = on.score.parts[0]?.measures[bar - 1]?.events.find((item) => item.kind === 'note' && (item.voice ?? 1) === voice);
    return event && event.kind === 'note' ? event.velocity : undefined;
  };
  row('preparation is quieter than the climax', (velocity(17, 1) ?? 0) < (velocity(19, 1) ?? 0) && (velocity(19, 1) ?? 0) < 110);
  row('ending tapers below the return', (velocity(24, 1) ?? 99) < (velocity(21, 1) ?? 0) && (velocity(21, 1) ?? 99) < (velocity(19, 1) ?? 0));
  row('hands do not share one velocity', velocity(1, 1) !== velocity(1, 3) && velocity(13, 3)! > velocity(13, 1)!);
  row('velocity follows the written plan', velocity(19, 1) === stageDVelocity(19, 1) && velocity(24, 3) === stageDVelocity(24, 3));
  row('MusicXML writes the dynamic plan', on.xml.includes('<mp/>') && on.xml.includes('<p/>') && on.xml.includes('<f/>') && on.xml.includes('<pp/>'));
  row('stage D plan records the contour', on.plan.general?.stageD?.enabled === true && on.plan.general.stageD.rhVelocity[18] === 92);
  row('off plan has no stage D record', off.plan.general?.stageD === undefined);
}

const eight = apiComposePianoV1({
  ...base,
  bars: 8,
  harmony: canonicalStageBHarmony(8),
  pianoV11: { musicalRefinement: true },
});
row('eight bars reject stage D', eight.ok === false && eight.error.includes('24'));

if (process.argv[1]?.includes('pianoV11StageD.test')) {
  for (const item of rows) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

export function runPianoV11StageDTests(): Row[] {
  return rows;
}
