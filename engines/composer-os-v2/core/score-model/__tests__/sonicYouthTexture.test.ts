/**
 * Sonic Youth — texture engine, guards, slice extension, MusicXML augmentation (smoke suite).
 */

import type { CompositionContext } from '../../compositionContext';
import { exportScoreModelToMusicXml } from '../../export/musicxmlExporter';
import type { ScoreModel } from '../scoreModelTypes';
import { buildSonicYouthExtension } from '../../song-mode/sonicYouthSlice';
import { getSYTextureState, isSonicYouthEvent } from '../sonicYouthChordGuards';
import type {
  NoiseLevel,
  SixStringOpenPitches,
  SixStringDroneMask,
  SonicYouthExtension,
  SYDissonancePreset,
  SYTextureState,
} from '../sonicYouthChordTypes';
import { getNextTextureState } from '../sonicYouthTextureEngine';

const TEXTURES: SYTextureState[] = ['riff', 'shimmer', 'noise_wall', 'clearing'];
const NOISES: NoiseLevel[] = ['clean', 'crunchy', 'feedback', 'prepared'];
const DISS: SYDissonancePreset[] = ['low_friction', 'medium_friction', 'high_friction'];

/** Frozen grid from `getNextTextureState` (all 4×4×3 combinations). */
const EXPECTED_NEXT_LINE = `
riff,clean,low_friction=>shimmer
riff,clean,medium_friction=>shimmer
riff,clean,high_friction=>noise_wall
riff,crunchy,low_friction=>shimmer
riff,crunchy,medium_friction=>shimmer
riff,crunchy,high_friction=>noise_wall
riff,feedback,low_friction=>shimmer
riff,feedback,medium_friction=>noise_wall
riff,feedback,high_friction=>noise_wall
riff,prepared,low_friction=>clearing
riff,prepared,medium_friction=>clearing
riff,prepared,high_friction=>clearing
shimmer,clean,low_friction=>noise_wall
shimmer,clean,medium_friction=>noise_wall
shimmer,clean,high_friction=>noise_wall
shimmer,crunchy,low_friction=>noise_wall
shimmer,crunchy,medium_friction=>noise_wall
shimmer,crunchy,high_friction=>noise_wall
shimmer,feedback,low_friction=>noise_wall
shimmer,feedback,medium_friction=>noise_wall
shimmer,feedback,high_friction=>noise_wall
shimmer,prepared,low_friction=>clearing
shimmer,prepared,medium_friction=>clearing
shimmer,prepared,high_friction=>clearing
noise_wall,clean,low_friction=>shimmer
noise_wall,clean,medium_friction=>shimmer
noise_wall,clean,high_friction=>clearing
noise_wall,crunchy,low_friction=>shimmer
noise_wall,crunchy,medium_friction=>clearing
noise_wall,crunchy,high_friction=>clearing
noise_wall,feedback,low_friction=>shimmer
noise_wall,feedback,medium_friction=>clearing
noise_wall,feedback,high_friction=>clearing
noise_wall,prepared,low_friction=>clearing
noise_wall,prepared,medium_friction=>clearing
noise_wall,prepared,high_friction=>clearing
clearing,clean,low_friction=>riff
clearing,clean,medium_friction=>riff
clearing,clean,high_friction=>noise_wall
clearing,crunchy,low_friction=>riff
clearing,crunchy,medium_friction=>riff
clearing,crunchy,high_friction=>noise_wall
clearing,feedback,low_friction=>riff
clearing,feedback,medium_friction=>noise_wall
clearing,feedback,high_friction=>noise_wall
clearing,prepared,low_friction=>clearing
clearing,prepared,medium_friction=>clearing
clearing,prepared,high_friction=>clearing
`
  .trim()
  .split(/\s*\n\s*/)
  .filter(Boolean);

function parseExpectedGrid(): Map<string, SYTextureState> {
  const m = new Map<string, SYTextureState>();
  for (const line of EXPECTED_NEXT_LINE) {
    const [lhs, rhs] = line.split('=>');
    const key = lhs!.trim();
    const exp = rhs!.trim() as SYTextureState;
    m.set(key, exp);
  }
  return m;
}

const OPEN: SixStringOpenPitches = [40, 45, 50, 55, 59, 64];
const DRONE: SixStringDroneMask = [true, true, true, true, true, true];

function dummySonicYouthExtension(textureState: SYTextureState): SonicYouthExtension {
  const g = {
    tuningId: 'test_tuning',
    openPitches: OPEN,
    shapeId: 'shape',
    fretPattern: [0, 0, 0, 0, 0, 0] as const,
    stringMask: 0x3f,
    droneStrings: DRONE,
    noiseLevel: 'clean' as const,
  };
  return {
    guitar1: g,
    guitar2: { ...g, tuningId: 'test_tuning_2' },
    interGuitarDissonance: {
      score: 0.5,
      minor2Count: 0,
      major2Count: 0,
      tritoneCount: 0,
      unisonCount: 0,
      preset: 'medium_friction',
    },
    textureState,
  };
}

function syChordScore(texture: SYTextureState): ScoreModel {
  return {
    title: 'SY Texture Export Probe',
    tempo: 120,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [
      {
        id: 'guitar',
        name: 'Electric Guitar',
        instrumentIdentity: 'clean_electric_guitar',
        midiProgram: 27,
        clef: 'treble',
        measures: [
          {
            index: 1,
            events: [
              {
                kind: 'chord',
                pitches: [60, 64, 67],
                startBeat: 0,
                duration: 4,
                voice: 2,
                sonicYouth: dummySonicYouthExtension(texture),
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeSonicYouthContext(seed: number, chords: string[]): CompositionContext {
  const tb = chords.length;
  return {
    seed,
    form: { totalBars: tb, sections: [{ label: 'A', startBar: 1, length: tb }] },
    generationMetadata: {
      songwriterStyleId: 'sonic_youth',
      sonicYouthEffectiveHarmonyBars: chords,
    },
  } as unknown as CompositionContext;
}

export function runSonicYouthTextureTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];
  const expectedMap = parseExpectedGrid();

  out.push({
    name: 'SY texture: getNextTextureState full grid (4×4×3)',
    ok: (() => {
      for (const cur of TEXTURES) {
        for (const nl of NOISES) {
          for (const di of DISS) {
            const key = `${cur},${nl},${di}`;
            const want = expectedMap.get(key);
            if (!want) return false;
            const got = getNextTextureState(cur, nl, di);
            if (got !== want) return false;
          }
        }
      }
      return expectedMap.size === 48;
    })(),
  });

  out.push({
    name: 'SY texture: getSYTextureState undefined without sonicYouth',
    ok:
      getSYTextureState({ kind: 'chord', pitches: [60], startBeat: 0, duration: 4, voice: 2 }) === undefined,
  });

  out.push({
    name: 'SY texture: getSYTextureState matches extension.textureState',
    ok: (() => {
      const ev = {
        kind: 'chord' as const,
        pitches: [60],
        startBeat: 0,
        duration: 4,
        voice: 2,
        sonicYouth: dummySonicYouthExtension('noise_wall'),
      };
      return getSYTextureState(ev) === 'noise_wall' && isSonicYouthEvent(ev);
    })(),
  });

  out.push({
    name: 'SY slice: buildSonicYouthExtension.textureState is always defined (fallback riff)',
    ok: (() => {
      const chords = Array.from({ length: 24 }, () => 'Emaj9');
      const ctx = makeSonicYouthContext(91001, chords);
      for (let bar = 1; bar <= 24; bar++) {
        const ext = buildSonicYouthExtension('Emaj9#11', bar, 91001, ctx);
        if (ext.textureState === undefined || ext.textureState === null) return false;
        const allowed = TEXTURES.includes(ext.textureState);
        if (!allowed) return false;
      }
      return true;
    })(),
  });

  const mkXml = (tex: SYTextureState) =>
    exportScoreModelToMusicXml(syChordScore(tex), { omitChordSymbols: true }).xml ?? '';

  out.push({
    name: 'MusicXML SY: riff — no tremolo/stress/extra dynamics attrs',
    ok: (() => {
      const xml = mkXml('riff');
      return (
        !xml.includes('dynamics="127"') &&
        !xml.includes('dynamics="24"') &&
        !xml.includes('<tremolo') &&
        !xml.includes('<stress')
      );
    })(),
  });

  out.push({
    name: 'MusicXML SY: shimmer — tremolo ornament',
    ok: mkXml('shimmer').includes('<tremolo type="single">3</tremolo>'),
  });

  out.push({
    name: 'MusicXML SY: noise_wall — dynamics 127 (fff) + stress',
    ok: (() => {
      const xml = mkXml('noise_wall');
      return xml.includes('dynamics="127"') && xml.includes('<stress');
    })(),
  });

  out.push({
    name: 'MusicXML SY: clearing — dynamics 24 (ppp proxy)',
    ok: (() => {
      const xml = mkXml('clearing');
      return xml.includes('dynamics="24"') && !xml.includes('<tremolo');
    })(),
  });

  return out;
}
