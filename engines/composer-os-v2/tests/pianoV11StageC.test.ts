/**
 * Piano V1.1 Stage C engine contract.
 * Does not write .tmp-piano-v1.1-stage-a or .tmp-piano-v1.1-stage-b.
 */

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { composeGeneralPianoV1 } from '../core/piano/generalPianoWriter';
import { pianoMidiNotes, writePianoScoreMidi } from '../core/piano/pianoMidi';
import { composePianoV1 } from '../core/piano/pianoWriter';
import { acceptancePolychordRegions } from '../core/piano/pianoV11Polychord';
import { cyclePlan } from '../core/piano/pianoMeterPlan';
import {
  canonicalStageBHarmony,
  fullV11DemonstrationBody,
  type PianoPublicRhythmicWindow,
} from '../core/piano/pianoV11Windows';

type Row = { name: string; ok: boolean; detail?: string };
const rows: Row[] = [];
function row(name: string, ok: boolean, detail?: string): void {
  rows.push({ name, ok, detail });
}

function sha(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function noteKey(note: { midi: number; ticks: number; durationTicks: number }): string {
  return `${note.midi}@${note.ticks}+${note.durationTicks}`;
}

function multiset(notes: readonly { midi: number; ticks: number; durationTicks: number }[]): string {
  return notes.map(noteKey).sort().join('|');
}

const dir = mkdtempSync(join(tmpdir(), 'piano-v11c-'));
const legacyHarmony = canonicalStageBHarmony(8);
const general = composeGeneralPianoV1({ seed: 76018, bars: 8, tempo: 80, tonalCentre: 'C', harmony: legacyHarmony });
const fixture = composePianoV1({ seed: 76018, innerVoice: true });
if (!general.ok || !fixture.ok) {
  row('legacy composers still run', false, general.ok ? fixture.error : general.error);
} else {
  const generalMidi = join(dir, 'general.mid');
  const fixtureMidi = join(dir, 'fixture.mid');
  writePianoScoreMidi(general.score, generalMidi);
  writePianoScoreMidi(fixture.score, fixtureMidi);
  row('legacy general XML unchanged', sha(general.xml) === '2bbb1e7199210e7f8b6c09826a72001d9e03004849b142ff928eebc3666293ef');
  row('legacy general MIDI unchanged', sha(readFileSync(generalMidi)) === '099a56073dbcd19eb94450a82c88d1afa5ed06c6d82213c9b859f71234fa7f95');
  row('legacy fixture XML unchanged', sha(fixture.xml) === '5dd30ba985442a4e6b82bb5f94e51b81525a50b37dada0f022cfea7b195d5c96');
  row('legacy fixture MIDI unchanged', sha(readFileSync(fixtureMidi)) === 'b74006be12c7b56a8f1608bbfe5bc3a3283945297836f8b4859b924ba5338ba9');
}

const request = {
  pianoCompositionV1: true,
  generalPianoV1: true,
  seed: 76018,
  bars: 24,
  tempo: 48,
  tonalCentre: 'C' as const,
  harmony: canonicalStageBHarmony(24),
  pianoV11: fullV11DemonstrationBody(),
};
const demo = apiComposePianoV1(request);
const replay = apiComposePianoV1(JSON.parse(JSON.stringify(request)));
row('demonstration request composes', demo.ok === true, demo.ok ? '' : demo.error);
row('demonstration replay matches', demo.ok && replay.ok && demo.xml === replay.xml);
row('demonstration uses eight windows', request.pianoV11.rhythmicWindows.length === 8);
row('bar 21 stays Fmaj7', canonicalStageBHarmony(24)[20] === 'Fmaj7');

const stageB = composeGeneralPianoV1({
  seed: 76018,
  bars: 24,
  tempo: 48,
  tonalCentre: 'C',
  harmony: canonicalStageBHarmony(24),
  phraseDevelopmentV11: true,
  polychords: acceptancePolychordRegions(),
  groupedNineSixteenTriplet: true,
  timing: { enabled: true, meterPlan: cyclePlan(4), acceptance: true },
});

if (demo.ok && stageB.ok) {
  const demoMidi = join(dir, 'demo.mid');
  const stageBMidi = join(dir, 'stage-b.mid');
  writePianoScoreMidi(demo.score, demoMidi);
  writePianoScoreMidi(stageB.score, stageBMidi);
  const demoNotes = pianoMidiNotes(demoMidi);
  const stageBNotes = pianoMidiNotes(stageBMidi);
  row('demonstration duration is 103.75 seconds', demo.elapsedSeconds === 103.75);
  row('demonstration has 223 sounding attacks', demo.soundingAttacks === 223 && demoNotes.notes.length === 223);
  row('demonstration MIDI matches Stage B', multiset(demoNotes.notes) === multiset(stageBNotes.notes) && demoNotes.ppq === 480);
  row('score bar 21 symbol is Fmaj7', demo.score.parts[0]?.measures[20]?.chordSymbol === 'Fmaj7');
  const bar19 = demo.xml.split('<measure number="19"')[1]?.split('</measure>')[0] ?? '';
  row('Eb parent spelling is E-flat', bar19.includes('<step>E</step><alter>-1</alter>'));
  row('cross-bar 3:2 and 5:4 are written', demo.xml.includes('<actual-notes>3</actual-notes>') && demo.xml.includes('<actual-notes>5</actual-notes>'));
  row('final realised diagnostics are attached', demo.plan.general?.finalEvents?.evidence === 'final-realised-score');
}

const renamed = fullV11DemonstrationBody();
renamed.rhythmicWindows = renamed.rhythmicWindows.map((window, index) => ({ ...window, id: `renamed-${index}` }));
const renamedResult = apiComposePianoV1({ ...request, pianoV11: renamed });
row(
  'window id rename keeps sounding XML',
  demo.ok && renamedResult.ok && demo.xml.replace(/demo-bar[\w-]*/g, 'id') === renamedResult.xml.replace(/renamed-\d+/g, 'id'),
  renamedResult.ok ? '' : renamedResult.error,
);

const duplicate = cyclePlan(4);
duplicate.push({ ...duplicate[0]! });
const duplicateResult = apiComposePianoV1({
  ...request,
  pianoV11: { ...fullV11DemonstrationBody(), meterPlan: duplicate },
});
row('duplicate metre bar is rejected', duplicateResult.ok === false && duplicateResult.error.includes('duplicated'));

const broken = apiComposePianoV1({
  ...request,
  pianoV11: {
    ...fullV11DemonstrationBody(),
    meterPlan: [null, { bar: 2, numerator: 0, denominator: 4, groups: [2, 2] }],
  },
});
row(
  'malformed metre entries are rejected',
  broken.ok === false && broken.error.includes('must be objects') && broken.error.includes('numerator'),
  broken.ok ? '' : broken.error,
);

const emptyId = fullV11DemonstrationBody();
const firstWindow: PianoPublicRhythmicWindow = { ...emptyId.rhythmicWindows[0]!, id: '   ' };
emptyId.rhythmicWindows = [firstWindow, ...emptyId.rhythmicWindows.slice(1)];
const blank = apiComposePianoV1({ ...request, pianoV11: emptyId });
row('blank window id is rejected', blank.ok === false && blank.error.includes('non-empty'));

if (process.argv[1]?.includes('pianoV11StageC.test')) {
  for (const item of rows) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

export function runPianoV11StageCTests(): Row[] {
  return rows;
}
