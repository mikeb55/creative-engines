/**
 * Piano V1.1 Stage A. Legacy piano output stays on the unchanged writer path.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { composeGeneralPianoV1 } from '../core/piano/generalPianoWriter';
import { pianoMidiNotes, writePianoScoreMidi } from '../core/piano/pianoMidi';
import { provePianoTupletRatios } from '../core/piano/pianoXmlOracle';
import {
  cyclePlan,
  formatTimeXml,
  PIANO_V11_METRES,
  stageAAcceptanceExpectation,
  timelineTotals,
  buildPianoTimeline,
  uniformPlan,
  validatePianoMeterPlan,
} from '../core/piano/pianoMeterPlan';
import { exportResolution, q, requiredPpq } from '../core/piano/pianoExactTiming';
import { fragmentSlotsToSpan, realiseStageA, releaseUnjoinedTies } from '../core/piano/pianoV11Realise';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { DIVISIONS } from '../core/score-model/scoreModelTypes';
import { pianoV11IsolatedOutput } from './pianoV11TestOutput';

type Row = { name: string; ok: boolean; detail?: string };
const rows: Row[] = [];
function row(name: string, ok: boolean, detail?: string): void {
  rows.push({ name, ok, detail });
}

const CYCLE = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'Cmaj7'] as const;
function harmony(bars: number): string[] {
  const out = Array.from({ length: bars }, (_, index) => CYCLE[index % CYCLE.length]!);
  out[0] = 'Cmaj7';
  out[bars - 2] = 'Cmaj7';
  out[bars - 1] = 'Cmaj7';
  return out;
}
function acceptanceHarmony(): string[] {
  const out = harmony(24);
  out[4] = 'Cmaj7';
  out[5] = 'Cmaj7';
  return out;
}

const LEGACY_SHA: Record<string, string> = {
  'general-8 xml': 'e0696622647b29cf383bfe917a718cac1924c8fbb67160a08be75b04e833ed29',
  'general-8 mid': 'efa248872e5a08811a949a4abffaba9f8051fc3067757c3b949b62ee722d78f8',
  'piano-v1 xml': '5dd30ba985442a4e6b82bb5f94e51b81525a50b37dada0f022cfea7b195d5c96',
  'piano-v1 mid': 'b74006be12c7b56a8f1608bbfe5bc3a3283945297836f8b4859b924ba5338ba9',
  'coffee xml': '359c24635dde35840c36e5a7ac267434b4dd88a13801b3679bf1e086a4e95f52',
  'coffee mid': '5ebb09c194ffa15bdd4bacb601321b88bc565d8abeda0dfc9ae76cc04ea4b3be',
};

function sha(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

row('global divisions stay 480', DIVISIONS === 480);

for (const meter of [
  [3, 4, [1, 1, 1]],
  [4, 4, [2, 2]],
  [5, 4, [3, 2]],
  [6, 8, [3, 3]],
  [7, 8, [2, 2, 3]],
  [9, 16, [4, 2, 3]],
] as const) {
  const composed = composeGeneralPianoV1({
    seed: 76018,
    bars: 8,
    tempo: 64,
    tonalCentre: 'C',
    harmony: harmony(8),
    timing: { enabled: true, meterPlan: uniformPlan(8, meter[0], meter[1], [...meter[2]]) },
  });
  row(`${meter[0]}/${meter[1]} composes`, composed.ok === true, composed.ok ? '' : composed.error);
}

const mixed = composeGeneralPianoV1({
  seed: 76018,
  bars: 24,
  tempo: 64,
  tonalCentre: 'C',
  harmony: harmony(24),
  timing: { enabled: true, meterPlan: cyclePlan(4) },
});
const expected = stageAAcceptanceExpectation();
row('24-bar cycle is 83 quarters', expected.quarters === 83 && expected.ticks === 39840 && expected.seconds === 103.75);
row('24-bar mixed metre composes', mixed.ok === true && mixed.plan.general?.stageA?.ticks === 39840, mixed.ok ? '' : mixed.error);

const alt = composeGeneralPianoV1({
  seed: 76018,
  bars: 8,
  tempo: 64,
  tonalCentre: 'C',
  harmony: harmony(8),
  timing: { enabled: true, meterPlan: uniformPlan(8, 7, 8, [3, 2, 2]) },
});
row('alternative 7/8 grouping composes', alt.ok === true && alt.score?.parts[0]?.measures[0]?.pianoBeatGroups?.join('+') === '3+2+2', alt.ok ? '' : alt.error);

const tieSpan = q(5, 1);
const shortTie = fragmentSlotsToSpan(
  [{ start: 2, duration: 2, pitch: 48, tie: 'start', motifRef: 'lh.tie' }],
  tieSpan,
);
row(
  'a short tie keeps its written duration',
  shortTie.kept.length === 1 && shortTie.kept[0]?.durationQ.n === 2 && shortTie.kept[0]?.durationQ.d === 1 && shortTie.omitted.n === 0,
);
const tieTimeline = buildPianoTimeline([
  { bar: 1, numerator: 5, denominator: 4, groups: [3, 2] },
  { bar: 2, numerator: 4, denominator: 4, groups: [2, 2] },
]);
const openTie = { start: 2, duration: 2, pitch: 48, tie: 'start' as const, motifRef: 'lh.tie', startQ: q(2, 1), durationQ: q(2, 1) };
const closeTie = { start: 0, duration: 2, pitch: 48, tie: 'stop' as const, motifRef: 'lh.tie', startQ: q(0, 1), durationQ: q(2, 1) };
const tieBars = new Map<number, (typeof openTie)[]>([[1, [openTie]], [2, [closeTie]]]);
releaseUnjoinedTies(tieTimeline, tieBars);
row('an unjoined tie is not stretched and both marks come off', openTie.durationQ.n === 2 && openTie.tie === undefined && closeTie.durationQ.n === 2 && closeTie.tie === undefined);
const joinedOpen = { start: 2, duration: 2, pitch: 48, tie: 'start' as const, startQ: q(2, 1), durationQ: q(2, 1) };
const joinedClose = { start: 0, duration: 2, pitch: 48, tie: 'stop' as const, startQ: q(0, 1), durationQ: q(2, 1) };
const joinedTimeline = buildPianoTimeline([
  { bar: 1, numerator: 4, denominator: 4, groups: [2, 2] },
  { bar: 2, numerator: 4, denominator: 4, groups: [2, 2] },
]);
releaseUnjoinedTies(joinedTimeline, new Map([[1, [joinedOpen]], [2, [joinedClose]]]));
row('a tie that already meets the next bar stays joined', joinedOpen.tie === 'start' && joinedClose.tie === 'stop' && joinedOpen.durationQ.n === 2);
const fiveFourLock = composeGeneralPianoV1({
  seed: 76018,
  bars: 8,
  tempo: 64,
  tonalCentre: 'C',
  harmony: harmony(8),
  timing: { enabled: true, meterPlan: uniformPlan(8, 5, 4) },
});
const lockedNote = fiveFourLock.ok
  ? fiveFourLock.score.parts[0]?.measures.flatMap((measure) => measure.events.flatMap((event) => (
    event.kind === 'note' && (event.voice ?? 1) === 3 && Math.abs(event.startBeat - 2) < 1e-6 && Math.abs(event.duration - 2) < 1e-6
      ? [{ bar: measure.index, voice: 3 as const, pitch: event.pitch, startBeat: event.startBeat, duration: event.duration, tie: event.notation?.tie }]
      : []
  )))[0]
  : undefined;
const lockedReplay = lockedNote
  ? composeGeneralPianoV1({
    seed: 76018,
    bars: 8,
    tempo: 64,
    tonalCentre: 'C',
    harmony: harmony(8),
    timing: { enabled: true, meterPlan: uniformPlan(8, 5, 4) },
    lockedEvents: [lockedNote],
  })
  : null;
row(
  '5/4 does not lengthen a beat-2 tie, and that duration still locks',
  fiveFourLock.ok === true
    && lockedReplay?.ok === true
    && !fiveFourLock.score.parts[0]?.measures.some((measure) => measure.events.some((event) => (
      event.kind === 'note' && Math.abs(event.startBeat - 2) < 1e-6 && event.duration > 2 + 1e-6
    ))),
  fiveFourLock.ok ? lockedReplay?.ok === false ? lockedReplay.error : '' : fiveFourLock.error,
);

const fourFour = composeGeneralPianoV1({
  seed: 76018,
  bars: 8,
  tempo: 64,
  tonalCentre: 'C',
  harmony: harmony(8),
  timing: { enabled: true, meterPlan: uniformPlan(8, 4, 4) },
});
row(
  '4/4 opening motif fits; later augmentation is logged',
  fourFour.ok === true
    && !fourFour.plan.general?.stageA?.fragments.some((item) => item.bar === 1 && item.reason === 'bar-capacity')
    && (fourFour.plan.general?.stageA?.fragments.some((item) => item.reason === 'bar-capacity' && item.omitted.n > 0) ?? false),
  fourFour.ok ? '' : fourFour.error,
);
const threeFour = composeGeneralPianoV1({
  seed: 76018,
  bars: 8,
  tempo: 64,
  tonalCentre: 'C',
  harmony: harmony(8),
  timing: { enabled: true, meterPlan: uniformPlan(8, 3, 4) },
});
row(
  '3/4 fragments overflow instead of dropping it silently',
  threeFour.ok === true && (threeFour.plan.general?.stageA?.fragments.some((item) => item.reason === 'bar-capacity' && item.omitted.n > 0) ?? false),
);

const acceptance = composeGeneralPianoV1({
  seed: 76018,
  bars: 24,
  tempo: 48,
  tonalCentre: 'C',
  harmony: acceptanceHarmony(),
  timing: { enabled: true, meterPlan: cyclePlan(4), acceptance: true },
});
const replay = composeGeneralPianoV1({
  seed: 76018,
  bars: 24,
  tempo: 48,
  tonalCentre: 'C',
  harmony: acceptanceHarmony(),
  timing: { enabled: true, meterPlan: cyclePlan(4), acceptance: true },
});
row('acceptance composes', acceptance.ok === true, acceptance.ok ? '' : acceptance.error);
row('same seed replays the same MusicXML', acceptance.ok && replay.ok && acceptance.xml === replay.xml);
if (acceptance.ok) {
  const ratios = provePianoTupletRatios(acceptance.xml);
  row('tuplet ratios match written types', ratios.ok, ratios.errors.join('; '));
  row('elapsed grid is 103.75 seconds', acceptance.elapsedSeconds === 103.75);
  row('3:2 eighths are 160 ticks', acceptance.xml.includes('<duration>160</duration>') && acceptance.xml.includes('<actual-notes>3</actual-notes>') && acceptance.xml.includes('<normal-notes>2</normal-notes>') && acceptance.xml.includes('<type>eighth</type>'));
  row('5:4 sixteenths are 96 ticks', acceptance.xml.includes('<duration>96</duration>') && acceptance.xml.includes('<actual-notes>5</actual-notes>') && acceptance.xml.includes('<normal-notes>4</normal-notes>') && acceptance.xml.includes('<type>16th</type>'));
  row('cross-bar 3:2 split is 80 ticks', (acceptance.xml.match(/<duration>80<\/duration>/g) ?? []).length === 2);
  row('cross-bar 5:4 split is 24 and 72 ticks', acceptance.xml.includes('<duration>24</duration>') && acceptance.xml.includes('<duration>72</duration>'));
  row('tuplet brackets exist', acceptance.xml.includes('<tuplet type="start"') && acceptance.xml.includes('<tuplet type="stop"'));
  row('beams exist', acceptance.xml.includes('<beam number="1">begin</beam>') && acceptance.xml.includes('<beam number="1">end</beam>'));
  const expectedTimes = Array.from({ length: 24 }, (_, index) => {
    const meter = PIANO_V11_METRES[index % PIANO_V11_METRES.length]!;
    return formatTimeXml(meter.numerator, meter.denominator, meter.groups);
  });
  const writtenTimes = [...acceptance.xml.matchAll(/<time>[\s\S]*?<\/time>/g)].map((item) => item[0]);
  row('each bar writes one total time signature', writtenTimes.length === 24 && writtenTimes.every((time, index) => time === expectedTimes[index]));
  row('additive component pairs are not serialised', !acceptance.xml.includes('<beats>4</beats><beat-type>16</beat-type><beats>2</beats><beat-type>16</beat-type><beats>3</beats><beat-type>16</beat-type>'));
  const groupLine = acceptance.score.parts[0]?.measures.map((measure) => measure.pianoBeatGroups?.join('+')).join(',');
  const expectedGroups = Array.from({ length: 24 }, (_, index) => PIANO_V11_METRES[index % PIANO_V11_METRES.length]!.groups.join('+')).join(',');
  row('groupings stay on the score model', groupLine === expectedGroups, groupLine);
  const restTuplet = /<note><rest\/>[\s\S]*?<actual-notes>3<\/actual-notes>[\s\S]*?<\/note>/.test(acceptance.xml);
  row('tuplet rest keeps the 3:2 ratio', restTuplet);
  const outDir = join(pianoV11IsolatedOutput('stage-a'), 'acceptance');
  mkdirSync(outDir, { recursive: true });
  const xmlPath = join(outDir, 'piano-v11-stage-a-seed76018-24bars.musicxml');
  const midiPath = join(outDir, 'piano-v11-stage-a-seed76018-24bars.mid');
  writeFileSync(xmlPath, acceptance.xml);
  writePianoScoreMidi(acceptance.score, midiPath);
  const midi = pianoMidiNotes(midiPath);
  row('MIDI PPQ is 480', midi.ppq === 480);
  row('cycle opens 4/4 then 3/4', acceptance.score.parts[0]?.measures[0]?.pianoBeatGroups?.join('+') === '2+2'
    && acceptance.score.timeSignature?.beats === 4
    && acceptance.score.parts[0]?.measures[1]?.pianoBeatGroups?.join('+') === '1+1+1');
  const bar7 = 20.75 * 480;
  const bar8 = 24.75 * 480;
  row('bar 7 stacks 3:2 against 5:4', [0, 160, 320].every((offset) => midi.notes.some((note) => note.ticks === bar7 + offset && note.durationTicks === 160))
    && [0, 96, 192, 288, 384].every((offset) => midi.notes.some((note) => note.ticks === bar7 + offset && note.durationTicks === 96)));
  row('bar 8 reverses 3:2 onto the left hand', [0, 160, 320].every((offset) => midi.notes.some((note) => note.ticks === bar8 + offset && note.durationTicks === 160))
    && [0, 240].every((offset) => midi.notes.some((note) => note.ticks === bar8 + offset && note.durationTicks === 240)));
  row('opening 3:2 against straight eighths', midi.notes.some((note) => note.midi === 72 && note.ticks === 0 && note.durationTicks === 160)
    && midi.notes.some((note) => note.midi === 72 && note.ticks === 160 && note.durationTicks === 160)
    && midi.notes.some((note) => note.midi === 72 && note.ticks === 320 && note.durationTicks === 160)
    && midi.notes.some((note) => note.midi === 48 && note.ticks === 0 && note.durationTicks === 240)
    && midi.notes.some((note) => note.midi === 48 && note.ticks === 240 && note.durationTicks === 240));
  const bar5 = 15 * 480;
  const tripletAttacks = [bar5 + 1440, bar5 + 1600, bar5 + 1760];
  row('cross-bar 3:2 keeps three sounding attacks', tripletAttacks.every((tick) => midi.notes.some((note) => note.ticks === tick))
    && midi.notes.filter((note) => note.ticks === bar5 + 1600).every((note) => note.durationTicks === 160));
  const quintStart = bar5 + Math.round((13 / 4) * 480);
  row('cross-bar 5:4 keeps five sounding attacks', [0, 96, 192, 288, 384].every((offset) => midi.notes.some((note) => note.ticks === quintStart + offset))
    && midi.notes.some((note) => note.ticks === quintStart + 96 && note.durationTicks === 96));
  const manifest = {
    seed: 76018,
    quarterBpm: 48,
    bars: 24,
    cycle: ['4/4 [2,2]', '3/4 [1,1,1]', '5/4 [3,2]', '6/8 [3,3]', '7/8 [2,2,3]', '9/16 [4,2,3]'],
    quarters: 83,
    ticksAt480: 39840,
    seconds: 103.75,
    soundingAttacks: acceptance.soundingAttacks,
    xmlSha256: sha(acceptance.xml),
    midiSha256: sha(readFileSync(midiPath)),
    ppq: midi.ppq,
    midiNotes: midi.notes.length,
    limitation: 'Adaptive export above PPQ 480 is rejected. Nested tuplets are rejected.',
  };
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  row('fixture files written', true, xmlPath);
}

const timeline = buildPianoTimeline([
  { bar: 1, numerator: 7, denominator: 8, groups: [2, 2, 3] },
  { bar: 2, numerator: 9, denominator: 16, groups: [4, 2, 3] },
]);
const cross = realiseStageA({
  timeline,
  rh: new Map([[1, []], [2, [{ start: 0, duration: 2.25, pitch: 67 }]]]),
  lh: new Map([[1, [{ start: 0, duration: 3.5, pitch: 48 }]], [2, []]]),
  windows: [{ id: 'cross-3-2', start: qAddSafe(3), hand: 'RH', ratio: '3:2', pitches: [72, 74, 76] }],
});
row('isolated cross-bar 3:2 realises', cross.errors.length === 0, cross.errors.join('; '));

const nested = realiseStageA({
  timeline: buildPianoTimeline(uniformPlan(1, 4, 4)),
  rh: new Map([[1, [{ start: 0, duration: 4, pitch: 72 }]]]),
  lh: new Map([[1, [{ start: 0, duration: 4, pitch: 48 }]]]),
  windows: [{ id: 'nest', start: q(0, 1), hand: 'RH', ratio: '3:2', pitches: [72, 72, 72], nested: true }],
});
row('nested tuplets fail explicitly', nested.errors.some((error) => error.includes('nested tuplets are unsupported')));

row('2/9 needs PPQ 1440', requiredPpq([q(2, 9)]) === 1440);
row('4/25 needs PPQ 2400', requiredPpq([q(4, 25)]) === 2400);
row('both need PPQ 7200', requiredPpq([q(2, 9), q(4, 25)]) === 7200);
row('1/192 needs PPQ 960', requiredPpq([q(1, 192)]) === 960);
const blocked = exportResolution([q(2, 9)]);
row('adaptive export is rejected', 'error' in blocked && blocked.required === 1440);

const badMeter = validatePianoMeterPlan([{ bar: 1, numerator: 8, denominator: 8, groups: [4, 4] }], 1);
const badGroup = validatePianoMeterPlan([{ bar: 1, numerator: 7, denominator: 8, groups: [2, 2] }], 1);
const missing = validatePianoMeterPlan([{ bar: 1, numerator: 4, denominator: 4, groups: [2, 2] }], 2);
const conflict = validatePianoMeterPlan([
  { bar: 1, numerator: 4, denominator: 4, groups: [2, 2] },
  { bar: 1, numerator: 3, denominator: 4, groups: [1, 1, 1] },
], 1);
row('invalid meters and groups fail', badMeter.length > 0 && badGroup.length > 0 && missing.length > 0 && conflict.length > 0, [...badMeter, ...badGroup, ...missing, ...conflict].join('; '));

const badCompose = composeGeneralPianoV1({
  seed: 76018,
  bars: 8,
  tempo: 64,
  tonalCentre: 'C',
  harmony: harmony(8),
  timing: { enabled: true, meterPlan: uniformPlan(8, 4, 4) },
  lockedEvents: [{ bar: 1, voice: 1, startBeat: 0, duration: 1, pitch: 20 }],
});
row('unplayable lock still fails', badCompose.ok === false && badCompose.code === 'unsupported_lock');

const totals = timelineTotals(buildPianoTimeline(cyclePlan(4)));
row('cycle timeline is 83/1', totals.quarters.n === 83 && totals.quarters.d === 1 && totals.ticks === 39840);

function qAddSafe(offset: number) {
  return q(offset, 1);
}

const general = apiComposePianoV1({
  pianoCompositionV1: true,
  generalPianoV1: true,
  seed: 76018,
  bars: 8,
  tempo: 64,
  tonalCentre: 'C',
  harmony: harmony(8),
  metre: '4/4',
});
const piano = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018 });
const coffee = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, filmCue: 'coffee-run-variation' });
if (!general.ok || !piano.ok || !coffee.ok) {
  row('legacy composers still run', false);
} else {
  const midiDir = pianoV11IsolatedOutput('stage-a-legacy');
  mkdirSync(midiDir, { recursive: true });
  const files = [
    ['general-8', general],
    ['piano-v1', piano],
    ['coffee', coffee],
  ] as const;
  for (const [name, result] of files) {
    const midiPath = join(midiDir, `${name}-legacy.mid`);
    writePianoScoreMidi(result.score, midiPath);
    row(`${name} xml byte-identical`, sha(result.xml) === LEGACY_SHA[`${name} xml`]);
    row(`${name} midi byte-identical`, sha(readFileSync(midiPath)) === LEGACY_SHA[`${name} mid`]);
  }
}

const exported = acceptance.ok ? exportScoreModelToMusicXml(acceptance.score) : null;
row('direct export matches composer xml', exported?.success === true && exported.xml === acceptance.xml);

const MSCORE = '/Applications/MuseScore 4.app/Contents/MacOS/mscore';
function sixBarMeterXml(): string {
  const measures = PIANO_V11_METRES.map((meter, index) => {
    const ticks = (meter.numerator * 4 * 480) / meter.denominator;
    const time = formatTimeXml(meter.numerator, meter.denominator, meter.groups);
    const attributes = index === 0
      ? `<divisions>480</divisions>${time}<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>`
      : time;
    return `<measure number="${index + 1}"><attributes>${attributes}</attributes><note><rest measure="yes"/><duration>${ticks}</duration><voice>1</voice><staff>1</staff></note><backup><duration>${ticks}</duration></backup><note><rest measure="yes"/><duration>${ticks}</duration><voice>3</voice><staff>2</staff></note></measure>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="piano"><part-name>Piano</part-name></score-part></part-list><part id="piano">${measures}</part></score-partwise>`;
}
const metreDir = pianoV11IsolatedOutput('stage-a-printed-metre');
const sixXmlPath = join(metreDir, 'six-bar-total.musicxml');
const sixMscxPath = join(metreDir, 'six-bar-total.mscx');
writeFileSync(sixXmlPath, sixBarMeterXml());
if (!existsSync(MSCORE)) {
  row('renderer prints the six total metres', false, 'MuseScore Studio 4.7.5 binary missing');
} else {
  const home = join(metreDir, 'mscore-home');
  const tmp = join(metreDir, 'mscore-tmp');
  mkdirSync(home, { recursive: true });
  mkdirSync(tmp, { recursive: true });
  const env = { ...process.env, HOME: home, TMPDIR: tmp };
  delete env.QT_QPA_PLATFORM;
  const child = spawnSync('arch', ['-arm64', MSCORE, '-o', sixMscxPath, sixXmlPath], {
    cwd: metreDir,
    encoding: 'utf8',
    timeout: 180000,
    env,
  });
  const code = child.status ?? -1;
  const saved = existsSync(sixMscxPath) ? readFileSync(sixMscxPath, 'utf8') : '';
  const sigs = [...saved.matchAll(/<sigN>(\d+)<\/sigN>\s*<sigD>(\d+)<\/sigD>/g)].map((item) => `${item[1]}/${item[2]}`);
  const printed = sigs.slice(0, 6).join(',');
  row(
    'renderer prints the six total metres',
    printed === '4/4,3/4,5/4,6/8,7/8,9/16',
    `exit ${code} signal ${child.signal ?? 'none'} printed ${printed || 'none'}`,
  );
}

if (process.argv[1]?.includes('pianoV11StageA.test')) {
  for (const item of rows) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

export function runPianoV11StageATests(): Row[] {
  return rows;
}
