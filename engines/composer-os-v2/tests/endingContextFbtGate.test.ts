/**
 * endingContext + finalBarTension hybrid gate — numeric threshold unchanged.
 */
import {
  resolveEndingContext,
  endingContextMetadataStamp,
} from '../core/gce/endingContext';
import {
  FINAL_BAR_TENSION_HARD_GATE,
  evaluateFinalBarTensionGate,
  computeFinalBarTensionProxy,
} from '../core/gce/finalBarTensionGate';
import { createMeasure, createNote, createScore } from '../core/score-model/scoreEventBuilder';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

function miniScore(bars: string[]): ScoreModel {
  const measures = bars.map((chord, i) => {
    const m = createMeasure(i + 1, chord);
    m.events = [createNote(60, 0, 1)];
    return m;
  });
  return createScore('fbt-test', [
    {
      id: 'gtr',
      name: 'Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures,
    } as any,
  ]);
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

export function runEndingContextFbtTests(): Array<{ name: string; ok: boolean; detail?: string }> {
  const rows: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const push = (name: string, ok: boolean, detail?: string) => rows.push({ name, ok, detail });

  try {
    assert(FINAL_BAR_TENSION_HARD_GATE === 0.7, 'threshold must stay 0.7');
    push('threshold unchanged 0.7', true);
  } catch (e) {
    push('threshold unchanged 0.7', false, String(e));
  }

  push(
    'riff_generator defaults to loop',
    resolveEndingContext({ presetId: 'riff_generator' }) === 'loop'
  );
  push(
    'song_mode defaults to terminal',
    resolveEndingContext({ presetId: 'song_mode' }) === 'terminal'
  );
  push(
    'guitar_bass_duo defaults to terminal',
    resolveEndingContext({ presetId: 'guitar_bass_duo' }) === 'terminal'
  );
  push(
    'ack promotes open_idiom',
    resolveEndingContext({ presetId: 'song_mode', acknowledgeOpenIdiomEnding: true }) ===
      'open_idiom'
  );
  push(
    'openIdiomDefault promotes open_idiom',
    resolveEndingContext({ presetId: 'song_mode', openIdiomDefault: true }) === 'open_idiom'
  );
  push(
    'openIdiomDefault OFF leaves terminal',
    resolveEndingContext({ presetId: 'song_mode', openIdiomDefault: false }) === 'terminal'
  );
  push(
    'explicit loop wins over non-riff preset',
    resolveEndingContext({ presetId: 'song_mode', endingContext: 'loop' }) === 'loop'
  );

  const stamp = endingContextMetadataStamp({ presetId: 'riff_generator' });
  push('stamp riff → loop', stamp.endingContext === 'loop');

  const chords = [
    'Bb13',
    'Ebmaj7#11',
    'Bb7alt',
    'G7alt',
    'Cm11',
    'F13',
    'Bbmaj9',
    'Abo',
    'Cm7',
    'F7alt',
    'Bb13',
    'G7alt',
  ];
  const score = miniScore(chords);
  const proxy = computeFinalBarTensionProxy(score, chords);
  push('G7alt proxy > 0.7', proxy.tension > 0.7, `tension=${proxy.tension}`);

  const terminal = evaluateFinalBarTensionGate({
    score,
    chords,
    presetId: 'song_mode',
  });
  push('terminal auto-fails G7alt', terminal.pass === false && terminal.endingContext === 'terminal');

  const loop = evaluateFinalBarTensionGate({
    score,
    chords,
    presetId: 'riff_generator',
  });
  push(
    'loop does not auto-fail G7alt',
    loop.pass === true && loop.endingContext === 'loop' && loop.autoFailExempt === true,
    loop.detail
  );

  const open = evaluateFinalBarTensionGate({
    score,
    chords,
    presetId: 'song_mode',
    acknowledgeOpenIdiomEnding: true,
  });
  push(
    'open_idiom passes with disclosure',
    open.pass === true && open.endingContext === 'open_idiom' && !!open.disclosure,
    open.disclosure?.summary
  );

  const viaPref = evaluateFinalBarTensionGate({
    score,
    chords,
    presetId: 'song_mode',
    openIdiomDefault: true,
  });
  push(
    'openIdiomDefault passes with disclosure (not silent)',
    viaPref.pass === true &&
      viaPref.endingContext === 'open_idiom' &&
      !!viaPref.disclosure &&
      viaPref.disclosure.viaOpenIdiomDefault === true,
    viaPref.disclosure?.summary
  );

  const prefOff = evaluateFinalBarTensionGate({
    score,
    chords,
    presetId: 'song_mode',
    openIdiomDefault: false,
  });
  push(
    'openIdiomDefault OFF still terminal-fails G7alt',
    prefOff.pass === false && prefOff.endingContext === 'terminal' && !prefOff.disclosure
  );

  const tonicChords = [...chords.slice(0, 11), 'Bbmaj9'];
  const tonicScore = miniScore(tonicChords);
  const tonicTerminal = evaluateFinalBarTensionGate({
    score: tonicScore,
    chords: tonicChords,
    presetId: 'song_mode',
  });
  push('terminal passes tonic close', tonicTerminal.pass === true);

  return rows;
}

if (require.main === module) {
  const rows = runEndingContextFbtTests();
  for (const r of rows) console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.detail ?? '');
  if (rows.some((r) => !r.ok)) process.exit(1);
}