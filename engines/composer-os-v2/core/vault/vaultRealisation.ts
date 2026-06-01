/**
 * Vault solo realisation — triad-pair riff lane over locked harmony (V107p4).
 */

import { inspectChordSymbol } from '../irealpro/chordSymbolMapper';
import { generateVaultRiff, type ScoreNote } from '../guitar/vaultRiffGenerator';
import {
  computeMusicContextChecksum,
  inferKeyRootFromChordSymbols,
  normalizeKeyRoot,
} from '../music-context/musicContextAdapters';
import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import { loopHarmonyBarsToLength, type SoloExportNote } from '../solo/soloMusicContextExport';

export type VaultContrastLevel = 'low' | 'moderate' | 'high';
export type VaultReharmLevel = 'low' | 'moderate' | 'high';

export type VaultRealisationPreset = {
  harmonyBars: readonly string[];
  totalBars?: number;
  seed?: number;
  bpm?: number;
  key?: string;
  triadPairsMode?: boolean;
  upperStructureContrast?: VaultContrastLevel;
  reharmonisationAppetite?: VaultReharmLevel;
  tuningId?: string;
};

export type VaultRealisationResult = {
  musicContext: MusicContext;
  scoreNotes: ScoreNote[];
  soloNotes: SoloExportNote[];
};

function riffStyleForPreset(
  preset: VaultRealisationPreset,
): 'triad-pair-pendulum' | 'bebop-placement' {
  if (preset.triadPairsMode !== false) return 'triad-pair-pendulum';
  return 'bebop-placement';
}

function eighthsPerBarForContrast(level: VaultContrastLevel | undefined): number {
  if (level === 'high') return 10;
  if (level === 'low') return 6;
  return 8;
}

function scoreNotesToSoloExport(notes: readonly ScoreNote[]): SoloExportNote[] {
  return notes
    .filter((n) => n.pitch > 0)
    .map((n) => ({
      barIndex: n.barIndex + 1,
      startBeat: n.startBeat % 4,
      durationBeats: n.duration,
      pitch: n.pitch,
    }));
}

/** Per-bar vault riff over supplied harmony — harmony stays source-locked when reharm appetite is low. */
export function realiseVaultSolo(preset: VaultRealisationPreset): VaultRealisationResult {
  const totalBars = preset.totalBars ?? preset.harmonyBars.length;
  const harmonyBars = loopHarmonyBarsToLength(preset.harmonyBars, totalBars);
  const style = riffStyleForPreset(preset);
  const eighthsPerBar = eighthsPerBarForContrast(preset.upperStructureContrast);
  const tuningId = preset.tuningId ?? 'standard';

  const scoreNotes: ScoreNote[] = [];
  for (let barIndex = 0; barIndex < harmonyBars.length; barIndex++) {
    const symbol = harmonyBars[barIndex]!;
    if (/^NC$/i.test(symbol)) continue;
    const inspected = inspectChordSymbol(symbol, tuningId);
    if (!inspected) continue;
    const barNotes = generateVaultRiff({
      chordTypeId: inspected.vaultChordTypeId,
      rootPc: inspected.rootPc,
      bars: 1,
      style,
      tuningId,
      eighthsPerBar,
    });
    for (const n of barNotes) {
      scoreNotes.push({ ...n, barIndex });
    }
  }

  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: preset.reharmonisationAppetite === 'low' ? 'locked' : 'user',
  };
  const { root, mode } = normalizeKeyRoot(preset.key ?? inferKeyRootFromChordSymbols(harmonyBars));

  const musicContext: MusicContext = {
    ...buildMusicContextFromHarmonyBars({
      harmonyBars,
      sourceEngineId: 'vault',
      presetId: 'vault',
      seed: preset.seed ?? 0,
      bpm: preset.bpm ?? 120,
      receipts: [
        {
          engine: 'vault',
          kind: 'vault_realisation_complete',
          payload: {
            triadPairsMode: preset.triadPairsMode !== false,
            upperStructureContrast: preset.upperStructureContrast ?? 'high',
            reharmonisationAppetite: preset.reharmonisationAppetite ?? 'low',
            barCount: totalBars,
            noteCount: scoreNotes.length,
            riffStyle: style,
            harmonyChecksum: harmony.checksum,
          },
        },
      ],
    }),
    key: { root, mode },
    totalBars,
    harmony,
  };

  return {
    musicContext,
    scoreNotes,
    soloNotes: scoreNotesToSoloExport(scoreNotes),
  };
}

/** MusicContext + solo notes from vault triad-pair realisation. */
export function buildMusicContextFromVault(preset: VaultRealisationPreset): MusicContext {
  return realiseVaultSolo(preset).musicContext;
}
