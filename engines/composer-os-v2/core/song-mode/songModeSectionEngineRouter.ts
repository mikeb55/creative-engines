/**
 * Song Mode per-section MusicContext producer router (V104p7).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { BigBandCompingStyle } from '../big-band/bigBandMusicContextTypes';
import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import type { MusicContext } from '../music-context/musicContextTypes';
import type { EcmChamberTexture } from '../ecm/ecmTypes';
import { buildTritonicDictionary } from '../tritonic/tritonicCell';
import {
  buildMusicContextFromVaultTritonic,
  type TritonicRealisationContext,
} from '../tritonic/tritonicRealisation';
import {
  buildMusicContextFromWayneShorterHarmony,
} from '../wayne-shorter/wayneShorterMusicContextProducer';
import type { SongSectionKind } from './songModeTypes';
import {
  DEFAULT_SONG_MODE_SECTION_ENGINE,
  type SongModeSectionEngine,
} from './songModeSectionEngineTypes';

export type BuildSectionMusicContextInput = {
  sectionId: string;
  sectionKind: SongSectionKind;
  sectionEngine?: SongModeSectionEngine;
  harmonyBars: readonly string[];
  seed?: number;
  bpm?: number;
  /** Tritonic mode when sectionEngine is tritonic_vault. */
  tritonicMode?: TritonicRealisationContext['mode'];
  /** Big Band comping style when sectionEngine is big_band. */
  bigBandCompingStyle?: BigBandCompingStyle;
  /** ECM texture stamp when sectionEngine is ecm_chamber. */
  ecmTexture?: EcmChamberTexture;
  /** Wayne Shorter profile when sectionEngine is wayne_shorter. */
  wayneProfile?: string;
};

function vaultMusicContextFromBars(
  harmonyBars: readonly string[],
  seed: number,
  bpm: number,
): MusicContext {
  const bars = harmonyBars.map(normalizeChordSymbol);
  const checksum = computeMusicContextChecksum(bars);
  return {
    schemaVersion: '1.0',
    seed,
    presetId: 'vault',
    key: { root: 'C', mode: 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm,
    totalBars: bars.length,
    harmony: { bars, checksum, source: 'user' },
    provenance: { sourceEngineId: 'vault', capturedAt: Date.now() },
    receipts: [],
  };
}

function defaultBigBandStyle(kind: SongSectionKind): BigBandCompingStyle {
  if (kind === 'chorus') return 'brass_punch';
  if (kind === 'verse') return 'freddie_green';
  return 'shell_voicing';
}

function defaultTritonicMode(kind: SongSectionKind): TritonicRealisationContext['mode'] {
  if (kind === 'bridge') return 'ecm';
  if (kind === 'chorus') return 'bb';
  return 'sq';
}

function defaultEcmTexture(kind: SongSectionKind): EcmChamberTexture {
  if (kind === 'verse') return 'sparse';
  if (kind === 'bridge') return 'suspended';
  return 'resonant';
}

/** Route section chord plan through the requested MusicContext producer. */
export function buildSectionMusicContextForEngine(
  input: BuildSectionMusicContextInput,
): MusicContext {
  const engine = input.sectionEngine ?? DEFAULT_SONG_MODE_SECTION_ENGINE;
  const seed = input.seed ?? 0;
  const bpm = input.bpm ?? 120;
  const harmonyBars = input.harmonyBars.map(normalizeChordSymbol);

  if (engine === 'song_mode') {
    return buildMusicContextFromHarmonyBars({
      harmonyBars,
      sourceEngineId: 'song_mode',
      presetId: 'song_mode',
      seed,
      bpm,
    });
  }

  if (engine === 'ecm_chamber') {
    const texture = input.ecmTexture ?? defaultEcmTexture(input.sectionKind);
    return buildMusicContextFromHarmonyBars({
      harmonyBars,
      sourceEngineId: 'ecm',
      presetId: 'ecm_chamber',
      seed,
      bpm,
      receipts: [
        {
          engine: 'ecm',
          kind: 'ecm_chamber_section_realisation',
          payload: {
            sectionId: input.sectionId,
            texture,
            barCount: harmonyBars.length,
          },
        },
      ],
    });
  }

  if (engine === 'big_band') {
    const compingStyle = input.bigBandCompingStyle ?? defaultBigBandStyle(input.sectionKind);
    return buildMusicContextFromHarmonyBars({
      harmonyBars,
      sourceEngineId: 'big_band',
      presetId: 'big_band',
      seed,
      bpm,
      receipts: [
        {
          engine: 'big_band',
          kind: 'big_band_realisation_complete',
          payload: {
            sectionId: input.sectionId,
            compingStyle,
            barCount: harmonyBars.length,
            harmonyChecksum: computeMusicContextChecksum(harmonyBars),
            bpm,
          },
        },
      ],
    });
  }

  if (engine === 'tritonic_vault') {
    const vaultCtx = vaultMusicContextFromBars(harmonyBars, seed, bpm);
    const tritonicCtx: TritonicRealisationContext = {
      mode: input.tritonicMode ?? defaultTritonicMode(input.sectionKind),
      cells: buildTritonicDictionary().cells,
      behaviourOptions: {
        oddityScore: 0.5,
        delayedResolution: true,
        melodyPriority: false,
      },
    };
    return buildMusicContextFromVaultTritonic(vaultCtx, tritonicCtx);
  }

  if (engine === 'wayne_shorter') {
    return buildMusicContextFromWayneShorterHarmony({
      title: input.sectionId,
      harmonyBars,
      seed,
      bpm,
      profile: input.wayneProfile ?? 'balanced',
    });
  }

  return buildMusicContextFromHarmonyBars({
    harmonyBars,
    sourceEngineId: 'song_mode',
    presetId: 'song_mode',
    seed,
    bpm,
  });
}
