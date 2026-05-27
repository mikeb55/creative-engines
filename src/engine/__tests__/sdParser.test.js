/**
 * SD parser gate — unpitched percussion / multi-voice merge.
 */

import {
  defaultKickStep,
  mergePercussionVoices,
  parsePercussionMeasure,
  parsePercussionNote,
} from '../sdParser.js';

export function runSdParserGateTests() {
  const out = [];

  const singleVoice = parsePercussionMeasure(
    [
      { unpitched: { displayStep: 'C' }, voice: 1, instrumentId: 'P1-I1-drum' },
      { unpitched: { displayStep: 'G' }, voice: 1, instrumentId: 'P1-I1-drum' },
    ],
    { instrumentId: 'P1-I1-drum' }
  );
  out.push({
    name: 'SD parser: single-voice percussion parses hits',
    ok: singleVoice.length === 2 && singleVoice[0].beatPosition === 0 && singleVoice[1].beatPosition === 8,
  });

  let twoVoiceOk = true;
  try {
    const merged = parsePercussionMeasure(
      [
        { unpitched: { displayStep: 'C' }, voice: 1, instrumentId: 'perc-kit' },
        { unpitched: { displayStep: 'F' }, voice: 2, instrumentId: 'perc-kit' },
        { unpitched: { displayStep: 'G' }, voice: 2, instrumentId: 'perc-kit' },
      ],
      { instrumentId: 'perc-kit', partName: 'Drums' }
    );
    twoVoiceOk = merged.length === 3 && merged.every((h) => typeof h.beatPosition === 'number');
  } catch {
    twoVoiceOk = false;
  }
  out.push({
    name: 'SD parser: two-voice percussion merges without error',
    ok: twoVoiceOk,
  });

  let missingStepOk = true;
  try {
    const hit = parsePercussionNote(
      { unpitched: {}, voice: 1, instrumentId: 'drum-kit' },
      { instrumentId: 'drum-kit' }
    );
    missingStepOk = hit != null && hit.beatPosition === defaultKickStep();
    parsePercussionMeasure([{ unpitched: {}, instrumentId: 'perc' }]);
    mergePercussionVoices([{ beatPosition: 4, voice: 1 }, { beatPosition: 4, voice: 2 }]);
  } catch {
    missingStepOk = false;
  }
  out.push({
    name: 'SD parser: missing step defaults without throw',
    ok: missingStepOk,
  });

  return out;
}
