/**
 * Generate screen preset ids + labels, and **static Presets tab registry** (always visible).
 * Must stay aligned with `engines/composer-os-v2/app-api/getPresets.ts` (PRESETS array).
 */
export type AppPresetCard = {
  id: string;
  name: string;
  description: string;
  supported: boolean;
};

/**
 * Full app preset list for the Presets tab when the API is empty, fails, or returns a stale subset.
 * Same order and copy as engine `getPresets()` — merge with live API when available.
 */
export const APP_PRESET_REGISTRY: readonly AppPresetCard[] = [
  {
    id: 'guitar_bass_duo',
    name: 'Guitar/Bass Duo',
    description:
      'Clean Electric Guitar + Acoustic Upright Bass. Chord symbols and rehearsal marks.',
    supported: true,
  },
  {
    id: 'guitar_bass_duo_single_line',
    name: 'Guitar–Bass Duo (Single-Line)',
    description:
      'Same duo harmony path with one single-note guitar line and one single-note bass line (conversational interplay).',
    supported: true,
  },
  {
    id: 'wyble_etude',
    name: 'Wyble Etude',
    description: 'Two-voice contrapuntal guitar etude (Jimmy Wyble style)',
    supported: true,
  },
  {
    id: 'ecm_chamber',
    name: 'ECM Chamber',
    description:
      'ECM chamber jazz: Metheny-style quartet or Schneider/Wheeler-style chamber modes (straight feel, modal harmony).',
    supported: true,
  },
  {
    id: 'song_mode',
    name: 'Song Mode',
    description:
      'Song Mode: structural song + lead-sheet-ready contract (JSON summary; no MusicXML lead sheet export in this build).',
    supported: true,
  },
  {
    id: 'big_band',
    name: 'Big Band',
    description:
      'Big band planning mode: form/section/density/orchestration via runBigBandMode (no full ensemble MusicXML yet).',
    supported: true,
  },
  {
    id: 'string_quartet',
    name: 'String Quartet',
    description:
      'String quartet planning: form/texture/density/orchestration via runStringQuartetMode (no quartet MusicXML yet).',
    supported: true,
  },
  {
    id: 'riff_generator',
    name: 'Riff Generator',
    description:
      'Short loopable riffs (1–4 bars), high-identity rhythm & melody, LOCK grid, GCE ≥ 9, Sibelius-safe MusicXML to your library Riffs folder.',
    supported: true,
  },
];

/** Expected count from app API `getPresets()` — used to detect stale desktop bundles. */
export const EXPECTED_APP_PRESET_COUNT = 8;

/** Merge live API presets over the static registry so every id always appears (API may be partial/stale). */
export function mergePresetsWithRegistry(
  apiPresets: AppPresetCard[] | undefined | null
): AppPresetCard[] {
  const map = new Map((apiPresets ?? []).map((p) => [p.id, p]));
  return APP_PRESET_REGISTRY.map((base) => {
    const fromApi = map.get(base.id);
    if (!fromApi) return { ...base };
    return {
      id: base.id,
      name: fromApi.name || base.name,
      description: fromApi.description ?? base.description,
      supported: typeof fromApi.supported === 'boolean' ? fromApi.supported : base.supported,
    };
  });
}
