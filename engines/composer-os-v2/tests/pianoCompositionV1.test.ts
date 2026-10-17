/**
 * Piano Composition V1 checkpoint: research findings, eight-bar writer, grand-staff export.
 */

import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { apiComposePianoV1 } from '../app-api/pianoCompositionApp';
import { pianoMidiNotes, writePianoScoreMidi } from '../core/piano/pianoMidi';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { assertSibeliusExportMeasureStructure } from '../core/export/exportMeasureStructureAssert';
import { validateExportedMusicXmlBarMath } from '../core/export/validateMusicXmlBarMath';
import { validateWrittenMusicXmlStrict } from '../core/export/validateMusicXmlWrittenStrict';
import { validateMusicXml } from '../../../src/utils/musicXmlValidator';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { comparePianoScoreToXml } from '../core/piano/pianoXmlOracle';
import { pianoGrandStaffConfig } from '../core/piano/pianoTypes';
import {
  validateLhDevelopment,
  validatePianoIndependence,
  validatePianoPlayability,
} from '../core/piano/pianoValidation';

const FLAG_OFF_XML_SHA256 = 'b196591e9ecfb4ec420dfd82da29022afc805a9bde8383b8999a3e5f5e883e2d';

type Row = { name: string; ok: boolean; detail?: string };

function row(name: string, ok: boolean, detail?: string): Row {
  return { name, ok, detail };
}

function whole(voice: number, pitch: number) {
  return { kind: 'note' as const, pitch, startBeat: 0, duration: 4, voice };
}

function probeScore(voices: number[], grand: boolean): ScoreModel {
  return {
    title: 'probe',
    tempo: 64,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [{
      id: grand ? 'piano' : 'keys',
      name: 'Piano',
      instrumentIdentity: 'piano',
      midiProgram: 0,
      clef: 'treble',
      ...(grand ? { pianoGrandStaff: pianoGrandStaffConfig(voices.includes(2)) } : {}),
      measures: [{
        index: 1,
        events: voices.map((voice) => voice === 1
          ? { kind: 'note' as const, pitch: 64, startBeat: 0, duration: 1, voice }
          : { kind: 'rest' as const, startBeat: 0, duration: 4, voice }),
      }],
    }],
  };
}

function flagOffScore(): ScoreModel {
  return {
    title: 'flag-off',
    tempo: 120,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [{
      id: 'guitar',
      name: 'Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures: [1, 2].map((index) => ({
        index,
        chord: index === 1 ? 'Cmaj7' : 'Dm7',
        events: [
          { kind: 'note' as const, pitch: 64, startBeat: 0, duration: 2, voice: 1 },
          { kind: 'note' as const, pitch: 67, startBeat: 2, duration: 2, voice: 1 },
          { kind: 'rest' as const, startBeat: 0, duration: 4, voice: 2 },
        ],
      })),
    }],
  };
}

function tieProbe(grand: boolean): ScoreModel {
  const note = (tie: 'start' | 'stop', index: number) => ({
    kind: 'note' as const,
    pitch: 60,
    pitches: [60, 64],
    startBeat: 0,
    duration: 4,
    voice: 1,
    notation: { tie },
    ...(grand ? {} : {}),
  });
  return {
    title: 'tie-probe',
    tempo: 64,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [{
      id: grand ? 'piano' : 'keys',
      name: grand ? 'Piano' : 'Keys',
      instrumentIdentity: grand ? 'piano' : 'clean_electric_guitar',
      midiProgram: grand ? 0 : 27,
      clef: 'treble',
      ...(grand ? { pianoGrandStaff: pianoGrandStaffConfig(false) } : {}),
      measures: [1, 2].map((index) => ({
        index,
        events: [
          note(index === 1 ? 'start' : 'stop', index),
          { kind: 'rest' as const, startBeat: 0, duration: 4, voice: 3 },
        ],
      })),
    }],
  };
}

export function runPianoCompositionV1Tests(): Row[] {
  const rows: Row[] = [];
  const flagOff = exportScoreModelToMusicXml(flagOffScore());
  const flagHash = createHash('sha256').update(flagOff.xml ?? '').digest('hex');
  rows.push(row('flag-off guitar XML fingerprint unchanged', flagOff.success && flagHash === FLAG_OFF_XML_SHA256, flagHash));

  const voices13 = exportScoreModelToMusicXml(probeScore([1, 3], false));
  rows.push(row(
    'finding 1: voices 1 and 3 without the contract stay one treble staff',
    voices13.success === true && (voices13.xml?.match(/<staves>1<\/staves>/g) ?? []).length === 1 && !voices13.xml?.includes('<staff>'),
  ));
  const voices13Fixed = exportScoreModelToMusicXml(probeScore([1, 3], true));
  rows.push(row(
    'finding 1 fixed only by the piano contract',
    voices13Fixed.success === true
      && voices13Fixed.xml?.includes('<staves>2</staves>') === true
      && voices13Fixed.xml?.includes('<clef number="1"><sign>G</sign><line>2</line></clef>') === true
      && voices13Fixed.xml?.includes('<clef number="2"><sign>F</sign><line>4</line></clef>') === true
      && (voices13Fixed.xml?.match(/<staff>1<\/staff>/g) ?? []).length > 0
      && (voices13Fixed.xml?.match(/<staff>2<\/staff>/g) ?? []).length > 0,
    voices13Fixed.errors.join('; '),
  ));

  const voices123 = exportScoreModelToMusicXml(probeScore([1, 2, 3], false));
  rows.push(row(
    'finding 2: voices 1/2/3 without the contract fail the one-backup rule',
    voices123.success === false && voices123.errors.join(' ').includes('exactly one <backup>'),
    voices123.errors.join('; '),
  ));
  const voices123Fixed = exportScoreModelToMusicXml(probeScore([1, 2, 3], true));
  rows.push(row(
    'finding 2 fixed by the piano backup contract',
    voices123Fixed.success === true && (voices123Fixed.xml?.match(/<backup>/g) ?? []).length === 2,
    voices123Fixed.errors.join('; '),
  ));

  const oldTie = exportScoreModelToMusicXml(tieProbe(false));
  const oldSound = (oldTie.xml?.match(/<tie type=/g) ?? []).length;
  const oldNotation = (oldTie.xml?.match(/<tied type=/g) ?? []).length;
  rows.push(row(
    'finding 3: old stack export ties the primary pitch only',
    oldTie.success === true && oldSound === 2 && oldNotation === 2,
    `sound ${oldSound} notation ${oldNotation}`,
  ));
  const newTie = exportScoreModelToMusicXml(tieProbe(true));
  const newSound = (newTie.xml?.match(/<tie type=/g) ?? []).length;
  const newNotation = (newTie.xml?.match(/<tied type=/g) ?? []).length;
  rows.push(row(
    'finding 3 fixed: every stack pitch receives sound and notation ties',
    newTie.success === true && newSound === 4 && newNotation === 4,
    `sound ${newSound} notation ${newNotation} ${newTie.errors.join('; ')}`,
  ));

  const overlap: ScoreModel = {
    title: 'overlap',
    tempo: 64,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [{
      id: 'keys',
      name: 'Keys',
      instrumentIdentity: 'piano',
      midiProgram: 0,
      clef: 'treble',
      measures: [{
        index: 1,
        events: [whole(1, 60), whole(1, 64), whole(1, 67)],
      }],
    }],
  };
  const overlapMath = validateStrictBarMath(overlap);
  const overlapXml = exportScoreModelToMusicXml(overlap);
  rows.push(row(
    'finding 4: simultaneous same-voice notes fail bar math while export can still succeed',
    overlapMath.valid === false && overlapXml.success === true,
    overlapMath.errors[0] ?? overlapXml.errors.join('; '),
  ));

  const disabled = apiComposePianoV1({});
  rows.push(row('absent flag returns disabled', disabled.ok === false && disabled.code === 'disabled'));
  const explicitOff = apiComposePianoV1({ pianoCompositionV1: false, seed: 76018 });
  rows.push(row('explicit disable returns disabled', explicitOff.ok === false && explicitOff.code === 'disabled'));

  const composed = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018 });
  const replay = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018 });
  const other = apiComposePianoV1({ pianoCompositionV1: true, seed: 76019, innerVoice: true });
  const twoLayer = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, innerVoice: false });
  rows.push(row('seed 76018 composes', composed.ok, composed.ok ? '' : composed.error));
  rows.push(row('seed 76019 composes', other.ok, other.ok ? '' : other.error));
  rows.push(row('two-layer fixture composes', twoLayer.ok, twoLayer.ok ? '' : twoLayer.error));
  rows.push(row(
    'replay is deterministic',
    composed.ok && replay.ok && composed.xml === replay.xml,
  ));

  if (composed.ok && other.ok && twoLayer.ok) {
    const part = composed.score.parts[0]!;
    const scoreParts = composed.xml.match(/<score-part /g) ?? [];
    const parts = composed.xml.match(/<part /g) ?? [];
    rows.push(row(
      'one piano instrument and grand staff',
      scoreParts.length === 1
        && parts.length === 1
        && part.id === 'piano'
        && part.instrumentIdentity === 'piano'
        && part.midiProgram === 0
        && composed.xml.includes('<midi-program>1</midi-program>')
        && composed.xml.includes('<instrument-sound>keyboard.piano</instrument-sound>')
        && !composed.xml.includes('TAB')
        && !composed.xml.includes('clean_electric_guitar'),
    ));
    const oracle = comparePianoScoreToXml(composed.score, composed.xml);
    rows.push(row('independent event and attack parity', oracle.ok, oracle.errors.slice(0, 4).join(' | ')));
    rows.push(row('elapsed duration from XML is 30 seconds', oracle.elapsedSeconds === 30, String(oracle.elapsedSeconds)));
    const written = validateWrittenMusicXmlStrict(composed.xml);
    const bar = validateExportedMusicXmlBarMath(composed.xml);
    const schema = validateMusicXml(composed.xml);
    rows.push(row('structural and schema checks', written.valid && bar.valid && schema.valid, [...written.errors, ...bar.errors, ...schema.errors].slice(0, 3).join(' | ')));
    rows.push(row(
      'seeds differ and both stay inside the plan',
      composed.xml !== other.xml && composed.plan.harmonyBars.join('|') === other.plan.harmonyBars.join('|'),
    ));
    rows.push(row(
      'LH response comes from the motif chain',
      composed.plan.transformOps.join(',') === 'fragment-head,augment'
        && composed.plan.lhResponse.pitches.join(',') === '50,52'
        && composed.plan.lhResponse.durations.join(',') === '1,1',
    ));
    const rhBar1 = part.measures[0]!.events.filter((event) => event.kind === 'note' && (event.voice ?? 1) === 1);
    const rhReturn = part.measures[6]!.events.filter((event) => event.kind === 'note' && (event.voice ?? 1) === 1);
    rows.push(row(
      'return keeps the opening RH cell',
      JSON.stringify(rhBar1.map((event) => event.kind === 'note' ? [event.pitch, event.startBeat, event.duration] : []))
        === JSON.stringify(rhReturn.map((event) => event.kind === 'note' ? [event.pitch, event.startBeat, event.duration] : [])),
    ));
    const augmented = part.measures[4]!.events.filter((event) => event.kind === 'note' && (event.voice ?? 1) === 1);
    rows.push(row(
      'augmentation changes durations',
      augmented.length === 2 && augmented.every((event) => event.kind === 'note' && event.duration === 2),
    ));
    rows.push(row(
      'textures cover sustain, broken chord, response and inner voice',
      composed.plan.textures.some((item) => item.texture === 'broken')
        && composed.plan.textures.some((item) => item.texture === 'sparse')
        && composed.plan.textures.some((item) => item.texture === 'response')
        && part.measures[6]!.events.some((event) => event.kind === 'note' && event.voice === 2)
        && twoLayer.score.parts[0]!.measures.every((measure) => measure.events.every((event) => (event.voice ?? 1) !== 2)),
    ));
    const finalEvents = part.measures[7]!.events.filter((event) => (event.voice ?? 1) === 1);
    const last = finalEvents[finalEvents.length - 1];
    rows.push(row('final RH event is a rest', last?.kind === 'rest'));
    rows.push(row(
      'input plan is unchanged',
      JSON.stringify(composed.lockSnapshot.harmonyBars) === JSON.stringify(composed.plan.harmonyBars)
        && composed.plan.returnLockBars.join(',') === '7',
    ));
    const locked = apiComposePianoV1({
      pianoCompositionV1: true,
      seed: 76018,
      lockedEvents: [{ bar: 1, voice: 1, startBeat: 0, duration: 1, pitch: 62 }],
    });
    rows.push(row('matching source lock is preserved', locked.ok === true));
    const rewritten = apiComposePianoV1({
      pianoCompositionV1: true,
      seed: 76018,
      lockedEvents: [{ bar: 1, voice: 1, startBeat: 0, duration: 1, pitch: 64 }],
    });
    rows.push(row(
      'mismatched lock fails without rewriting',
      rewritten.ok === false && rewritten.code === 'unsupported_lock',
      rewritten.ok ? '' : rewritten.error,
    ));
    const unplayable = apiComposePianoV1({
      pianoCompositionV1: true,
      seed: 76018,
      lockedEvents: [{ bar: 1, voice: 1, startBeat: 0, duration: 1, pitch: 20 }],
    });
    rows.push(row('unplayable lock fails', unplayable.ok === false && unplayable.code === 'unsupported_lock'));
    const longForm = apiComposePianoV1({ pianoCompositionV1: true, seed: 76018, bars: 24 });
    rows.push(row('24-bar request stays outside this checkpoint', longForm.ok === false));

    const stripped = composed.xml.replace(
      /<note><chord\/><pitch><step>E<\/step><octave>3<\/octave><\/pitch><duration>1920<\/duration><tie type="start"\/><voice>3<\/voice><type>whole<\/type><stem>up<\/stem><staff>2<\/staff><notations><tied type="start"\/><\/notations><\/note>/,
      '<note><chord/><pitch><step>E</step><octave>3</octave></pitch><duration>1920</duration><voice>3</voice><type>whole</type><stem>up</stem><staff>2</staff></note>',
    );
    const brokenParity = comparePianoScoreToXml(composed.score, stripped);
    rows.push(row('missing chord-follower tie fails parity', stripped !== composed.xml && brokenParity.ok === false));

    const midiDir = mkdtempSync(join(tmpdir(), 'piano-v1-parity-'));
    const midiPath = join(midiDir, 'seed76018.mid');
    const scoreBeforeMidi = JSON.stringify(composed.score);
    writePianoScoreMidi(composed.score, midiPath);
    const replayPath = join(midiDir, 'seed76018-replay.mid');
    writePianoScoreMidi(replay.score, replayPath);
    const midi = pianoMidiNotes(midiPath);
    const replayMidi = pianoMidiNotes(replayPath);
    const soundingKey = (midiNumber: number, onsetQuarters: number, durationQuarters: number) => (
      `${midiNumber}:${Math.round(onsetQuarters * midi.ppq)}:${Math.round(durationQuarters * midi.ppq)}`
    );
    const xmlKeys = oracle.sounding
      .filter((event) => !event.rest && event.midi !== null)
      .map((event) => soundingKey(event.midi ?? 0, event.onset, event.duration))
      .sort();
    const midiKeys = midi.notes.map((note) => `${note.midi}:${note.ticks}:${note.durationTicks}`).sort();
    const replayKeys = replayMidi.notes.map((note) => `${note.midi}:${note.ticks}:${note.durationTicks}`).sort();
    const lhBar1 = part.measures[0]!.events.find((event) => event.kind === 'note' && event.voice === 3);
    const lhTieStart = part.measures[6]!.events.find((event) => event.kind === 'note' && event.voice === 3);
    const lhTieStop = part.measures[7]!.events.find((event) => event.kind === 'note' && event.voice === 3);
    rows.push(row(
      'bar 1 LH bass onset matches score XML and MIDI',
      lhBar1?.kind === 'note'
        && lhBar1.pitch === 50
        && lhBar1.startBeat === 0
        && lhBar1.duration === 4
        && xmlKeys.includes(soundingKey(50, 0, 4))
        && midiKeys.includes(soundingKey(50, 0, 4))
        && !midiKeys.includes('50:480:1920'),
    ));
    rows.push(row(
      'bars 7-8 LH dyad tie is one sounding attack',
      lhTieStart?.kind === 'note'
        && lhTieStop?.kind === 'note'
        && lhTieStart.notation?.tie === 'start'
        && lhTieStop.notation?.tie === 'stop'
        && lhTieStart.duration === 4
        && lhTieStop.duration === 2
        && JSON.stringify(lhTieStart.pitches) === JSON.stringify([45, 52])
        && JSON.stringify(lhTieStop.pitches) === JSON.stringify([45, 52])
        && xmlKeys.includes(soundingKey(45, 24, 6))
        && xmlKeys.includes(soundingKey(52, 24, 6))
        && midiKeys.includes(soundingKey(45, 24, 6))
        && midiKeys.includes(soundingKey(52, 24, 6))
        && !midiKeys.some((key) => key.startsWith('45:13440:') || key.startsWith('52:13440:')),
    ));
    rows.push(row(
      'full sounding MIDI matches XML',
      midi.ppq === 480 && JSON.stringify(midiKeys) === JSON.stringify(xmlKeys),
      `xml ${xmlKeys.length} midi ${midiKeys.length}`,
    ));
    rows.push(row(
      'MIDI regeneration is deterministic and leaves the score unchanged',
      JSON.stringify(replayKeys) === JSON.stringify(midiKeys)
        && JSON.stringify(composed.score) === scoreBeforeMidi
        && composed.xml.includes('<voice>1</voice>')
        && composed.xml.includes('<voice>3</voice>')
        && midi.pedal.length === 0,
    ));

    const outDir = resolve(__dirname, '../../../.tmp-piano-v1');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, 'piano-v1-seed76018.musicxml'), composed.xml);
    writeFileSync(resolve(outDir, 'piano-v1-seed76019.musicxml'), other.xml);
    writeFileSync(resolve(outDir, 'piano-v1-seed76018-two-layer.musicxml'), twoLayer.xml);
  }

  const identical = exportScoreModelToMusicXml({
    title: 'same',
    tempo: 64,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [{
      id: 'piano',
      name: 'Piano',
      instrumentIdentity: 'piano',
      midiProgram: 0,
      clef: 'treble',
      pianoGrandStaff: pianoGrandStaffConfig(false),
      measures: [1].map((index) => ({
        index,
        events: [
          { kind: 'note' as const, pitch: 72, startBeat: 0, duration: 4, voice: 1 },
          { kind: 'note' as const, pitch: 72, startBeat: 0, duration: 4, voice: 3 },
        ],
      })),
    }],
  });
  rows.push(row(
    'identical hands fail independence',
    identical.success === true && validatePianoIndependence(identical.success ? {
      title: 'same',
      tempo: 64,
      parts: [{
        id: 'piano',
        name: 'Piano',
        instrumentIdentity: 'piano',
        midiProgram: 0,
        clef: 'treble',
        pianoGrandStaff: pianoGrandStaffConfig(false),
        measures: [{
          index: 1,
          events: [
            { kind: 'note', pitch: 72, startBeat: 0, duration: 4, voice: 1 },
            { kind: 'note', pitch: 72, startBeat: 0, duration: 4, voice: 3 },
          ],
        }],
      }],
    } : { title: '', parts: [] }).ok === false,
  ));

  const doubled: ScoreModel = {
    title: 'octave',
    tempo: 64,
    parts: [{
      id: 'piano',
      name: 'Piano',
      instrumentIdentity: 'piano',
      midiProgram: 0,
      clef: 'treble',
      pianoGrandStaff: pianoGrandStaffConfig(false),
      measures: [{
        index: 1,
        events: [
          { kind: 'note', pitch: 72, startBeat: 0, duration: 1, voice: 1 },
          { kind: 'rest', startBeat: 1, duration: 3, voice: 1 },
          { kind: 'note', pitch: 60, startBeat: 0, duration: 1, voice: 3 },
          { kind: 'rest', startBeat: 1, duration: 3, voice: 3 },
        ],
      }],
    }],
  };
  rows.push(row('octave doubling fails independence', validatePianoIndependence(doubled).ok === false));

  const wide: ScoreModel = {
    title: 'wide',
    tempo: 64,
    parts: [{
      id: 'piano',
      name: 'Piano',
      instrumentIdentity: 'piano',
      midiProgram: 0,
      clef: 'treble',
      pianoGrandStaff: pianoGrandStaffConfig(false),
      measures: [{
        index: 1,
        events: [
          { kind: 'note', pitch: 60, pitches: [60, 74], startBeat: 0, duration: 4, voice: 1 },
          { kind: 'note', pitch: 36, startBeat: 0, duration: 4, voice: 3 },
        ],
      }],
    }],
  };
  rows.push(row('excessive span fails', validatePianoPlayability(wide, 64).ok === false));

  const jump: ScoreModel = {
    title: 'jump',
    tempo: 64,
    parts: [{
      id: 'piano',
      name: 'Piano',
      instrumentIdentity: 'piano',
      midiProgram: 0,
      clef: 'treble',
      pianoGrandStaff: pianoGrandStaffConfig(false),
      measures: [{
        index: 1,
        events: [
          { kind: 'note', pitch: 60, startBeat: 0, duration: 0.5, voice: 1 },
          { kind: 'note', pitch: 74, startBeat: 0.5, duration: 0.5, voice: 1 },
          { kind: 'rest', startBeat: 1, duration: 3, voice: 1 },
          { kind: 'rest', startBeat: 0, duration: 4, voice: 3 },
        ],
      }],
    }],
  };
  rows.push(row('rapid relocation fails', validatePianoPlayability(jump, 64).ok === false));

  const wallpaper: ScoreModel = {
    title: 'wallpaper',
    tempo: 64,
    parts: [{
      id: 'piano',
      name: 'Piano',
      instrumentIdentity: 'piano',
      midiProgram: 0,
      clef: 'treble',
      pianoGrandStaff: pianoGrandStaffConfig(false),
      measures: [1, 2, 3, 4, 5].map((index) => ({
        index,
        events: [
          { kind: 'note' as const, pitch: 72, startBeat: 0, duration: 1, voice: 1 },
          { kind: 'rest' as const, startBeat: 1, duration: 3, voice: 1 },
          { kind: 'note' as const, pitch: 48, startBeat: 0, duration: 1, voice: 3 },
          { kind: 'rest' as const, startBeat: 1, duration: 3, voice: 3 },
        ],
      })),
    }],
  };
  rows.push(row('repeated LH pattern fails', validateLhDevelopment(wallpaper).ok === false));

  if (voices123Fixed.success && voices123Fixed.xml) {
    const strippedBackup = voices123Fixed.xml.replace('<backup><duration>1920</duration></backup>\n', '');
    let threw = false;
    try {
      assertSibeliusExportMeasureStructure(strippedBackup, { pianoGrandStaffPartIds: ['piano'] });
    } catch {
      threw = true;
    }
    rows.push(row('missing piano backup still fails structural validation', threw));
  }

  return rows;
}

if (process.argv[1]?.includes('pianoCompositionV1.test')) {
  const rows = runPianoCompositionV1Tests();
  for (const item of rows) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  const failed = rows.filter((item) => !item.ok);
  console.log(`${rows.length - failed.length}/${rows.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
