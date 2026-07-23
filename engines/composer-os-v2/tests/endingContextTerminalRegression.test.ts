/**
 * endingContext terminal vs loop regression — G7alt final chord.
 * Confirms non-riff presets stay terminal (auto-fail) and riff_generator is loop (no auto-fail).
 */
import { resolveEndingContext, endingContextMetadataStamp } from '../core/gce/endingContext';
import { evaluateFinalBarTensionGate } from '../core/gce/finalBarTensionGate';
import { createMeasure, createNote, createScore } from '../core/score-model/scoreEventBuilder';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

function g7altScore(): { score: ScoreModel; chords: string[] } {
  const chords = Array(11).fill('Bbmaj9').concat(['G7alt']) as string[];
  const measures = chords.map((c, i) => {
    const m = createMeasure(i + 1, c);
    m.events = [createNote(60, 0, 1)];
    return m;
  });
  const score = createScore('ending-context-terminal-regression', [
    {
      id: 'gtr',
      name: 'Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures,
    } as any,
  ]);
  return { score, chords };
}

export function runEndingContextTerminalRegressionTests(): Array<{
  name: string;
  ok: boolean;
  detail?: string;
}> {
  const rows: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const push = (name: string, ok: boolean, detail?: string) => rows.push({ name, ok, detail });

  const song = resolveEndingContext({ presetId: 'song_mode' });
  const duo = resolveEndingContext({ presetId: 'guitar_bass_duo' });
  const riff = resolveEndingContext({ presetId: 'riff_generator' });
  push('song_mode default terminal', song === 'terminal');
  push('guitar_bass_duo default terminal', duo === 'terminal');
  push('riff_generator default loop', riff === 'loop');

  const stampSong = endingContextMetadataStamp({ presetId: 'song_mode' });
  const stampRiff = endingContextMetadataStamp({ presetId: 'riff_generator' });
  push('stamp song_mode → terminal', stampSong.endingContext === 'terminal');
  push('stamp riff_generator → loop', stampRiff.endingContext === 'loop');

  const { score, chords } = g7altScore();
  const term = evaluateFinalBarTensionGate({ score, chords, presetId: 'song_mode' });
  const loop = evaluateFinalBarTensionGate({ score, chords, presetId: 'riff_generator' });
  push(
    'G7alt terminal FAIL',
    term.pass === false && term.endingContext === 'terminal',
    term.detail
  );
  push(
    'G7alt loop PASS',
    loop.pass === true && loop.endingContext === 'loop',
    loop.detail
  );

  return rows;
}

if (require.main === module) {
  const rows = runEndingContextTerminalRegressionTests();
  for (const r of rows) console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.detail ?? '');
  if (rows.some((r) => !r.ok)) process.exit(1);
  console.log('REGRESSION_OK');
}