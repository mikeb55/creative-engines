/**
 * ECM chamber MusicContext producer (V101) — always-on, no feature flag, no DuoLock.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import {
  computeMusicContextChecksum,
} from '../music-context/musicContextAdapters';
import { wybleEtudeKeyRootName } from '../music-context/wybleEtudePresetProgressions';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import type { EcmChamberPreset, EcmChamberTexture, EcmChamberVoicing } from './ecmTypes';

type CycleSpec = { readonly offset: number; readonly quality: string; readonly bars: number };

const PC_ROOT_NAMES: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

function rootNameFromPc(keyPc: PitchClass, semitoneOffset: number): string {
  const pc = (((keyPc + semitoneOffset) % 12) + 12) % 12;
  return PC_ROOT_NAMES[pc]!;
}

function expandCycle(key: PitchClass, specs: readonly CycleSpec[]): string[] {
  const out: string[] = [];
  for (const s of specs) {
    const sym = `${rootNameFromPc(key, s.offset)}${s.quality}`;
    for (let i = 0; i < s.bars; i++) out.push(sym);
  }
  return out;
}

const TEXTURE_CYCLES: Record<EcmChamberTexture, readonly CycleSpec[]> = {
  sparse: [
    { offset: 0, quality: 'min9', bars: 2 },
    { offset: 5, quality: '7sus4', bars: 2 },
    { offset: 10, quality: 'maj7', bars: 2 },
    { offset: 3, quality: 'maj9', bars: 2 },
  ],
  resonant: [
    { offset: 0, quality: 'maj9', bars: 2 },
    { offset: 9, quality: 'min11', bars: 2 },
    { offset: 5, quality: 'maj7#11', bars: 2 },
    { offset: 2, quality: 'm7', bars: 2 },
  ],
  suspended: [
    { offset: 0, quality: 'sus2', bars: 2 },
    { offset: 5, quality: '7sus4', bars: 2 },
    { offset: 10, quality: 'sus4', bars: 2 },
    { offset: 7, quality: 'm7sus4', bars: 2 },
  ],
};

const VOICING_QUALITY: Record<EcmChamberVoicing, Record<string, string>> = {
  close: {
    maj9: 'maj7',
    min11: 'min9',
    'maj7#11': 'maj7',
    sus2: 'min9',
    sus4: 'maj7',
    m7sus4: 'm7',
  },
  open: {
    min9: 'min11',
    maj7: 'maj7#11',
    maj9: 'maj7#11',
    m7: 'm7sus4',
    '7sus4': '7sus4',
  },
  mixed: {},
};

function applyVoicing(quality: string, voicing: EcmChamberVoicing): string {
  return VOICING_QUALITY[voicing][quality] ?? quality;
}

function resolveEcmHarmonyRawBars(preset: EcmChamberPreset): string[] {
  const cycle = TEXTURE_CYCLES[preset.texture].map((s) => ({
    ...s,
    quality: applyVoicing(s.quality, preset.voicing),
  }));
  return expandCycle(preset.key, cycle);
}

/** MusicContext snapshot from ECM chamber preset; harmony normalised before checksum. */
export function buildMusicContextFromEcm(preset: EcmChamberPreset): MusicContext {
  const harmonyBars = resolveEcmHarmonyRawBars(preset).map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'generated',
  };
  const root = wybleEtudeKeyRootName(preset.key);
  return {
    schemaVersion: '1.0',
    seed: 0,
    presetId: 'ecm_chamber',
    key: { root, mode: 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm: preset.tempo,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'ecm',
      capturedAt: Date.now(),
    },
    receipts: [],
  };
}
