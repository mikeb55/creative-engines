/**
 * V43 rhythm blend catalog + merge helpers — not in smoke allowlist.
 */

import { exportBlendedScoreToMusicXml as exportBlendedCore } from '../core/blend/blendMusicXmlExporter';
import { exportBlendedScoreToMusicXml as exportBlendedSession } from '../core/blend/rhythmBlendSession';
import {
  lcmGridStepsForPair,
  mergeRhythmLayers,
  resolveBlendContextKeys,
} from '../core/blend/rhythmBlendEngine';
import {
  resetRhythmBlendSessionForTests,
  setEngineA,
  setEngineB,
  getRhythmBlendSessionState,
} from '../core/blend/rhythmBlendSession';
import { getBrazilianRhythmPresetById } from '../core/rhythm/brazilianRhythmPresets';
import { getSecondLineRhythmPresetById } from '../core/rhythm/secondLineRhythmPresets';

export function runRhythmBlendV43Tests(): { name: string; ok: boolean }[] {
  const rows: { name: string; ok: boolean }[] = [];

  const br = getBrazilianRhythmPresetById('bossa-nova-basic');
  const sl = getSecondLineRhythmPresetById('second-line-basic');
  const merged =
    br && sl
      ? mergeRhythmLayers(
          {
            engine: 'brazilian',
            laneId: 'low',
            midiNote: br.gmNoteMap.low,
            stepVelocities: [...br.lanes.low],
          },
          {
            engine: 'second_line',
            laneId: 'low',
            midiNote: sl.gmNoteMap.low,
            stepVelocities: [...sl.lanes.low],
          },
          'max'
        )
      : null;
  rows.push({
    name: 'mergeRhythmLayers(brazilian bossa, second line basic) returns output',
    ok: !!merged && merged.pulsesPerBar === 16 && merged.events.length >= 1,
  });

  rows.push({
    name: 'LCM grid 16 + 16 = 16',
    ok: lcmGridStepsForPair(16, 16) === 16,
  });

  rows.push({
    name: 'LCM grid 16 + 18 = 144',
    ok: lcmGridStepsForPair(16, 18) === 144,
  });

  const keys = resolveBlendContextKeys('brazilian', 'cuban');
  rows.push({
    name: "resolveBlendContextKeys('brazilian','cuban') has br: and cu:",
    ok: keys.some((k) => k.includes('br:')) && keys.some((k) => k.includes('cu:')),
  });

  const xmlBlend = exportBlendedCore({
    engineA: { engine: 'brazilian', presetId: 'bossa-nova-basic' },
    engineB: { engine: 'second_line', presetId: 'second-line-basic' },
    conflictStrategy: 'max',
  });
  rows.push({
    name: 'exportBlendedScoreToMusicXml(brazilian + second_line) contains score-partwise',
    ok: xmlBlend.includes('<score-partwise'),
  });

  resetRhythmBlendSessionForTests({ engineA: 'felaKuti', engineB: 'greekRebetiko' });
  setEngineA('brazilian');
  setEngineB('secondLine');
  const st = getRhythmBlendSessionState();
  rows.push({
    name: 'setEngineA / setEngineB update session',
    ok: st.engineA === 'brazilian' && st.engineB === 'secondLine',
  });

  resetRhythmBlendSessionForTests({
    engineA: 'brazilian',
    engineB: 'secondLine',
    presetIdA: 'bossa-nova-basic',
    presetIdB: 'second-line-basic',
  });
  const xmlSession = exportBlendedSession();
  rows.push({
    name: 'session exportBlendedScoreToMusicXml resolves catalog engines',
    ok: xmlSession.includes('<score-partwise'),
  });

  return rows;
}
