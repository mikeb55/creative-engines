/**
 * Vault solo realisation — triad-pair riff lane over locked harmony (V107p4).
 */

import { inspectChordSymbol } from '../irealpro/chordSymbolMapper';
import type { ScoreNote } from '../guitar/vaultRiffGenerator';
import { generateVaultTriadPairMonophonicBar } from './vaultSoloMonophonic';
import { clampSoloMelodicMidi, snapSoloNotesToHarmonyLandings } from '../solo/soloMusicality';
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

function scoreNotesToSoloExport(
  notes: readonly SoloExportNote[],
  harmonyBars: readonly string[],
): SoloExportNote[] {
  return snapSoloNotesToHarmonyLandings(
    notes.map((n) => ({
      ...n,
      pitch: clampSoloMelodicMidi(n.pitch),
    })),
    harmonyBars,
  );
}

/** Per-bar vault riff over supplied harmony — harmony stays source-locked when reharm appetite is low. */
export function realiseVaultSolo(preset: VaultRealisationPreset): VaultRealisationResult {
  const totalBars = preset.totalBars ?? preset.harmonyBars.length;
  const harmonyBars = loopHarmonyBarsToLength(preset.harmonyBars, totalBars);
  const tuningId = preset.tuningId ?? 'standard';
  const useTriadPairs = preset.triadPairsMode !== false;

  const soloNotesRaw: SoloExportNote[] = [];
  for (let barIndex = 0; barIndex < harmonyBars.length; barIndex++) {
    const symbol = harmonyBars[barIndex]!;
    if (/^NC$/i.test(symbol)) continue;
    const inspected = inspectChordSymbol(symbol, tuningId);
    if (!inspected) continue;
    if (useTriadPairs) {
      soloNotesRaw.push(
        ...generateVaultTriadPairMonophonicBar({
          chordTypeId: inspected.vaultChordTypeId,
          rootPc: inspected.rootPc,
          barIndex: barIndex + 1,
        }),
      );
    }
  }
  const scoreNotes: ScoreNote[] = soloNotesRaw.map((n) => ({
    pitch: n.pitch,
    startBeat: n.startBeat,
    duration: n.durationBeats,
    guitarString: 0,
    guitarFret: 0,
    barIndex: n.barIndex - 1,
  }));

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
            noteCount: soloNotesRaw.length,
            riffStyle: useTriadPairs ? 'triad-pair-monophonic' : 'bebop-placement',
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
    soloNotes: scoreNotesToSoloExport(soloNotesRaw, harmonyBars),
  };
}

/** MusicContext + solo notes from vault triad-pair realisation. */
export function buildMusicContextFromVault(preset: VaultRealisationPreset): MusicContext {
  return realiseVaultSolo(preset).musicContext;
}
