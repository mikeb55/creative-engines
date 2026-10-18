/**
 * Piano V1.1 Stage B. Phrase development and polychords stay opt-in.
 * Stage A acceptance files are not rewritten here.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { persistPianoComposition } from '../app-api/pianoCompositionPersist';
import { composeGeneralPianoV1 } from '../core/piano/generalPianoWriter';
import { pianoMidiNotes, writePianoScoreMidi } from '../core/piano/pianoMidi';
import { cyclePlan, uniformPlan } from '../core/piano/pianoMeterPlan';
import { PIANO_LEGACY_COMBINED_KEY_LIMIT, PIANO_V11_POLYCHORD_COMBINED_KEYS, PIANO_V11_POLYCHORD_KEYS_PER_HAND } from '../core/piano/pianoTypes';
import { acceptancePolychordRegions, voiceTriad } from '../core/piano/pianoV11Polychord';
import { pianoV11FileBase } from '../core/piano/pianoV11Output';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

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

function sha(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pcs(pitches: number[]): number[] {
  return [...new Set(pitches.map((pitch) => ((pitch % 12) + 12) % 12))].sort((a, b) => a - b);
}

const base = {
  seed: 76018,
  bars: 24 as const,
  tempo: 80,
  tonalCentre: 'C' as const,
  harmony: harmony(24),
};

const plain = composeGeneralPianoV1(base);
const phrase = composeGeneralPianoV1({ ...base, phraseDevelopmentV11: true });
const phraseReplay = composeGeneralPianoV1({ ...base, phraseDevelopmentV11: true });
row('phrase development composes', phrase.ok === true, phrase.ok ? '' : phrase.error);
row('phrase replay matches', phrase.ok && phraseReplay.ok && phrase.xml === phraseReplay.xml);
row('phrase changes notes', phrase.ok && plain.ok && phrase.xml !== plain.xml);
row('phrase request keeps the chord symbols', phrase.ok && phrase.score.parts[0]?.measures.every((measure, index) => measure.chord === base.harmony[index]));
const eight = composeGeneralPianoV1({ ...base, bars: 8, harmony: harmony(8), phraseDevelopmentV11: true });
row('phrase development rejects 8 bars', eight.ok === false && eight.error.includes('24-bar'));

if (phrase.ok && plain.ok) {
  const spans = phrase.plan.general?.phraseDevelopment?.spans ?? [];
  row('twelve phrase spans', spans.length === 12);
  row('at most 12 candidates', spans.every((span) => span.candidates.length > 0 && span.candidates.length <= 12));
  const opening = phrase.plan.general?.phraseDevelopment?.opening.filter((event) => event.midi !== null) ?? [];
  const returnDurations = phrase.plan.general?.phraseDevelopment?.returnDurations ?? [];
  row('realised opening is stored', opening.length >= 2);
  row('return keeps the opening rhythm', opening.map((event) => event.duration).join(',') === returnDurations.join(','));
  const rhMax = (bars: number[]) => {
    let max = 0;
    for (const measure of phrase.score.parts[0]?.measures ?? []) {
      if (!bars.includes(measure.index)) continue;
      for (const event of measure.events) {
        if (event.kind !== 'note' || (event.voice ?? 1) !== 1) continue;
        max = Math.max(max, event.pitch);
      }
    }
    return max;
  };
  row('climax register is above the opening', rhMax([19, 20]) > rhMax([1, 2, 3, 4]));
  const bar1 = plain.score.parts[0]?.measures.slice(2, 8).flatMap((measure) => measure.events.filter((event) => event.kind === 'note' && (event.voice ?? 1) === 1).map((event) => event.kind === 'note' ? event.pitch : 0));
  const developed = phrase.score.parts[0]?.measures.slice(2, 8).flatMap((measure) => measure.events.filter((event) => event.kind === 'note' && (event.voice ?? 1) === 1).map((event) => event.kind === 'note' ? event.pitch : 0));
  row('development bar changes pitches', JSON.stringify(bar1) !== JSON.stringify(developed));
  const restBar = phrase.score.parts[0]?.measures.some((measure) => (
    (measure.index === 17 || measure.index === 18 || measure.index === 24)
    && measure.events.some((event) => event.kind === 'rest' && (event.voice ?? 1) === 1)
  ));
  row('phrase keeps a rest', restBar === true);
}

const slash = composeGeneralPianoV1({
  seed: 76018,
  bars: 8,
  tempo: 80,
  tonalCentre: 'C',
  harmony: ['C/D', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Cmaj7', 'Cmaj7'],
});
row('slash chord still composes', slash.ok === true, slash.ok ? '' : slash.error);
row('C/D keeps a bass note', slash.ok && slash.xml.includes('<bass-step>D</bass-step>') && !slash.xml.includes('Upper: C'));

const regions = acceptancePolychordRegions();
const poly = composeGeneralPianoV1({ ...base, polychords: regions });
row('polychords compose', poly.ok === true, poly.ok ? '' : poly.error);
if (poly.ok) {
  const bar19 = poly.xml.split('<measure number="19"')[1]?.split('</measure>')[0] ?? '';
  row('Eb is spelled E-flat', bar19.includes('<step>E</step><alter>-1</alter>'));
  row('polychord words fallback', poly.xml.includes('Upper: Eb major / Lower: A minor'));
  row('two harmony parents', (bar19.match(/<harmony>/g) ?? []).length === 2 && !bar19.includes('<bass-step>'));
  const change = poly.plan.general?.polychords?.find((item) => item.bar === 1);
  row('bar 1 owns three plus three', change !== undefined && pcs(change.upper).length === 3 && pcs(change.lower).length === 3);
  const shared = poly.plan.general?.polychords?.find((item) => item.bar === 13);
  const upper = new Set((shared?.upper ?? []).map((pitch) => pitch % 12));
  const lower = new Set((shared?.lower ?? []).map((pitch) => pitch % 12));
  const common = [...upper].filter((pc) => lower.has(pc));
  const sameKey = (shared?.upper ?? []).some((pitch) => (shared?.lower ?? []).includes(pitch));
  row('common tones keep separate keys', common.length > 0 && !sameKey);
}

row('legacy combined limit stays 6', PIANO_LEGACY_COMBINED_KEY_LIMIT === 6);
row('polychord profile is 3+3', PIANO_V11_POLYCHORD_KEYS_PER_HAND === 3 && PIANO_V11_POLYCHORD_COMBINED_KEYS === 6);
const illegal = voiceTriad({
  members: [
    { step: 'C', alter: 0, pc: 0 },
    { step: 'E', alter: 0, pc: 4 },
    { step: 'G', alter: 0, pc: 7 },
  ],
  low: 60,
  high: 62,
  anchor: 60,
  previous: null,
  preferExtreme: 'high',
  avoid: new Set<number>(),
  label: 'upper C major',
});
row('unvoicable triad is explicit', illegal.ok === false && illegal.diagnostic.includes('cannot be voiced legally'));

const badQuality = apiComposePianoV1({
  pianoCompositionV1: true,
  generalPianoV1: true,
  seed: 76018,
  bars: 8,
  tempo: 80,
  tonalCentre: 'C',
  harmony: harmony(8),
  pianoV11: {
    polychords: [{
      startBar: 1,
      endBar: 1,
      polychord: {
        upper: { root: 'C', quality: 'dominant' },
        lower: { root: 'D', quality: 'minor' },
        assignment: { upper: 'RH', lower: 'LH' },
      },
    }],
  },
});
row('bad polychord quality is rejected', badQuality.ok === false);

const locked = composeGeneralPianoV1({
  ...base,
  bars: 8,
  harmony: harmony(8),
  polychords: [{
    startBar: 1,
    endBar: 1,
    polychord: {
      upper: { root: 'C', quality: 'major' },
      lower: { root: 'D', quality: 'minor' },
      assignment: { upper: 'RH', lower: 'LH' },
    },
  }],
  lockedEvents: [{ bar: 1, voice: 1, startBeat: 0, duration: 1, pitch: 72 }],
});
row('lock blocks a polychord overwrite', locked.ok === false && locked.error.includes('locked'));

const meterOnly = composeGeneralPianoV1({
  ...base,
  tempo: 48,
  timing: { enabled: true, meterPlan: cyclePlan(4), acceptance: true },
});
const phraseMeter = composeGeneralPianoV1({
  ...base,
  tempo: 48,
  phraseDevelopmentV11: true,
  timing: { enabled: true, meterPlan: cyclePlan(4) },
});
const polyMeter = composeGeneralPianoV1({
  ...base,
  tempo: 48,
  polychords: regions,
  timing: { enabled: true, meterPlan: uniformPlan(24, 4, 4, [2, 2]) },
});
row('metre and tuplets still compose', meterOnly.ok === true, meterOnly.ok ? '' : meterOnly.error);
row('phrase plus metre composes', phraseMeter.ok === true, phraseMeter.ok ? '' : phraseMeter.error);
row('polychord plus metre composes', polyMeter.ok === true, polyMeter.ok ? '' : polyMeter.error);
row('phrase plus metre changes the 4/4 phrase', phrase.ok && phraseMeter.ok && phrase.xml !== phraseMeter.xml);

const combined = composeGeneralPianoV1({
  seed: 76018,
  bars: 24,
  tempo: 48,
  tonalCentre: 'C',
  harmony: harmony(24),
  phraseDevelopmentV11: true,
  polychords: regions,
  groupedNineSixteenTriplet: true,
  timing: { enabled: true, meterPlan: cyclePlan(4), acceptance: true },
});
const combinedReplay = composeGeneralPianoV1({
  seed: 76018,
  bars: 24,
  tempo: 48,
  tonalCentre: 'C',
  harmony: harmony(24),
  phraseDevelopmentV11: true,
  polychords: regions,
  groupedNineSixteenTriplet: true,
  timing: { enabled: true, meterPlan: cyclePlan(4), acceptance: true },
});
row('combined fixture composes', combined.ok === true, combined.ok ? '' : combined.error);
row('combined replay matches', combined.ok && combinedReplay.ok && combined.xml === combinedReplay.xml);
if (combined.ok) {
  row('combined grid is 103.75 seconds', combined.elapsedSeconds === 103.75);
  row('combined has 3:2 and 5:4', combined.xml.includes('<actual-notes>3</actual-notes>') && combined.xml.includes('<actual-notes>5</actual-notes>'));
  row('bar 12 3:2 is present', combined.xml.includes('bar12-3-2') || combined.score.parts[0]?.measures[11]?.events.some((event) => event.kind === 'note' && event.pianoExact?.tuplet?.actualNotes === 3) === true);
  const openingDurations = combined.plan.general?.phraseDevelopment?.opening.filter((event) => event.midi !== null).map((event) => event.duration) ?? [];
  row('combined return keeps rhythm', openingDurations.join(',') === (combined.plan.general?.phraseDevelopment?.returnDurations ?? []).join(','));
  const outDir = join(__dirname, '..', '..', '..', '.tmp-piano-v1.1-stage-b', 'acceptance');
  mkdirSync(outDir, { recursive: true });
  const xmlPath = join(outDir, 'piano-v11-stage-b-combined-seed76018-24bars.musicxml');
  const midiPath = join(outDir, 'piano-v11-stage-b-combined-seed76018-24bars.mid');
  writeFileSync(xmlPath, combined.xml);
  writePianoScoreMidi(combined.score, midiPath);
  const midi = pianoMidiNotes(midiPath);
  const xmlAttacks = combined.soundingAttacks;
  row('combined MIDI PPQ is 480', midi.ppq === 480);
  row('combined MIDI has notes', midi.notes.length > 0 && xmlAttacks > 0);
  const manifest = {
    algorithm: 'piano-v1.1-b',
    seed: 76018,
    quarterBpm: 48,
    bars: 24,
    tonalCentre: 'C',
    harmony: harmony(24),
    polychords: regions,
    meter: cyclePlan(4),
    phraseDevelopment: true,
    groupedNineSixteenTriplet: true,
    quarters: 83,
    ticksAt480: 39840,
    seconds: combined.elapsedSeconds,
    xmlSha256: sha(combined.xml),
    midiSha256: sha(readFileSync(midiPath)),
    listening: 'PENDING',
    notationInspection: 'PENDING',
    physicalPlayability: 'PENDING',
  };
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const pack = join(__dirname, '..', '..', '..', '.tmp-piano-v1.1-stage-b', 'comparison');
  mkdirSync(pack, { recursive: true });
  const pieces = [
    ['01-general-v1', plain],
    ['02-phrase-only', phrase],
    ['03-polychords-only', poly],
    ['04-metre-tuplets', meterOnly],
    ['05-combined', combined],
  ] as const;
  for (const [name, piece] of pieces) {
    if (!piece.ok) continue;
    writeFileSync(join(pack, `${name}.musicxml`), piece.xml);
    writePianoScoreMidi(piece.score, join(pack, `${name}.mid`));
    writeFileSync(join(pack, `${name}.manifest.json`), `${JSON.stringify({
      name,
      bars: piece.plan.bars,
      tempo: piece.plan.tempo,
      xmlSha256: sha(piece.xml),
      listening: 'PENDING',
      notationInspection: 'PENDING',
      physicalPlayability: 'PENDING',
    }, null, 2)}\n`);
  }
  row('comparison pack written', true);
}

const left = pianoV11FileBase({ seed: 1, tempo: 48, bars: 24, tonalCentre: 'C', payload: { harmony: ['C'] } });
const right = pianoV11FileBase({ seed: 1, tempo: 48, bars: 24, tonalCentre: 'C', payload: { harmony: ['D'] } });
row('filenames do not collide', left !== right);

const apiPhrase = apiComposePianoV1({
  pianoCompositionV1: true,
  generalPianoV1: true,
  seed: 76018,
  bars: 24,
  tempo: 80,
  tonalCentre: 'C',
  harmony: harmony(24),
  pianoV11: { phraseDevelopment: true },
});
row('API phrase flag reaches the writer', apiPhrase.ok === true && apiPhrase.plan.general?.phraseDevelopment !== undefined, apiPhrase.ok ? '' : apiPhrase.error);
const apiWindow = apiComposePianoV1({
  pianoCompositionV1: true,
  generalPianoV1: true,
  seed: 76018,
  bars: 8,
  tempo: 80,
  tonalCentre: 'C',
  harmony: harmony(8),
  pianoV11: {
    polyrhythm: '3:2',
    meterPlan: uniformPlan(8, 4, 4, [2, 2]),
  },
});
const apiStraight = apiComposePianoV1({
  pianoCompositionV1: true,
  generalPianoV1: true,
  seed: 76018,
  bars: 8,
  tempo: 80,
  tonalCentre: 'C',
  harmony: harmony(8),
});
row('API 3:2 changes the rhythm', apiWindow.ok && apiStraight.ok && apiWindow.xml.includes('<actual-notes>3</actual-notes>') && apiWindow.xml !== apiStraight.xml, apiWindow.ok ? '' : apiWindow.error);

const dir = mkdtempSync(join(tmpdir(), 'piano-v11b-'));
const persistedA = persistPianoComposition({
  pianoCompositionV1: true,
  generalPianoV1: true,
  seed: 76018,
  bars: 8,
  tempo: 80,
  tonalCentre: 'C',
  harmony: harmony(8),
  pianoV11: { meterPlan: uniformPlan(8, 5, 4, [3, 2]) },
}, dir);
const persistedB = persistPianoComposition({
  pianoCompositionV1: true,
  generalPianoV1: true,
  seed: 76018,
  bars: 8,
  tempo: 80,
  tonalCentre: 'C',
  harmony: harmony(8).map((symbol, index) => index === 0 ? 'Am7' : symbol),
  pianoV11: { meterPlan: uniformPlan(8, 5, 4, [3, 2]) },
}, dir);
row('persisted files stay apart', persistedA.ok && persistedB.ok && persistedA.filepath !== persistedB.filepath && persistedA.filepath.includes('Solo Piano V1.1'), persistedA.ok ? persistedA.filepath : persistedA.error);

if (process.argv[1]?.includes('pianoV11StageB.test')) {
  for (const item of rows) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

export function runPianoV11StageBTests(): Row[] {
  return rows;
}
