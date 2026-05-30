/**
 * Generate page — three-lane producer chooser (v1.5p10).
 * Maps UI producer tiles to existing presetId / sub-routes without engine changes.
 */

export type GenerateProducerLaneId = 'song_chart' | 'study_pattern' | 'texture_arrangement';

export type GenerateProducerId =
  | 'song_mode'
  | 'ireal'
  | 'vault'
  | 'comping'
  | 'wyble'
  | 'martino'
  | 'slonimsky'
  | 'standalone_etude'
  | 'wyble_etude_preset'
  | 'duo'
  | 'ecm_chamber'
  | 'big_band'
  | 'new_orleans'
  | 'riff'
  | 'tritonic'
  | 'wayne_shorter'
  | 'monk'
  | 'string_quartet'
  | 'sq_to_bb';

export type GenerateProducerTile = {
  id: GenerateProducerId;
  label: string;
  /** Short line under the tile */
  tagline: string;
  /** Lane card copy when this producer is selected */
  selectionBlurb: string;
  presetId: string;
};

export type GenerateProducerLane = {
  id: GenerateProducerLaneId;
  title: string;
  purpose: string;
  producers: readonly GenerateProducerTile[];
};

export const GENERATE_PRODUCER_LANES: readonly GenerateProducerLane[] = [
  {
    id: 'song_chart',
    title: 'Song & Chart',
    purpose: 'Harmonic truth, form, lead sheet',
    producers: [
      {
        id: 'song_mode',
        label: 'Song Mode',
        tagline: 'Hooks · sections · duo export',
        selectionBlurb:
          'Plans song form and songwriter slices, then golden-path duo realisation with LOCK’d harmony for export.',
        presetId: 'song_mode',
      },
      {
        id: 'ireal',
        label: 'iReal',
        tagline: 'ireal:// chart import',
        selectionBlurb:
          'Paste an iReal Pro chart — Tonality Vault riff/melody over parsed changes with bar-accurate form.',
        presetId: 'song_mode',
      },
      {
        id: 'vault',
        label: 'Vault',
        tagline: 'Paste chords · grips · drift',
        selectionBlurb:
          'Tonality Vault from pasted or parsed chord charts — emotional drift, tuning, chorus locks, MusicXML export.',
        presetId: 'song_mode',
      },
      {
        id: 'comping',
        label: 'Comping',
        tagline: 'Freddie · shell · grid',
        selectionBlurb:
          'Rhythm-guitar comping over your progression — style, density, and beat pattern without a full duo sketch.',
        presetId: 'riff_generator',
      },
    ],
  },
  {
    id: 'study_pattern',
    title: 'Study & Pattern',
    purpose: 'Learning, pattern, etude',
    producers: [
      {
        id: 'wyble',
        label: 'Wyble',
        tagline: 'Two-voice etude',
        selectionBlurb:
          'Jimmy Wyble–style contrapuntal guitar etude — optional progression or pattern/difficulty preset when chords are blank.',
        presetId: 'wyble_etude',
      },
      {
        id: 'martino',
        label: 'Martino',
        tagline: 'Linear Expressions',
        selectionBlurb:
          'Pat Martino linear system — minor centres, canonical activity lines, LFV window, teaching or performance mode.',
        presetId: 'martino_linear',
      },
      {
        id: 'slonimsky',
        label: 'Slonimsky',
        tagline: 'Chromatic cells',
        selectionBlurb:
          'Slonimsky pattern families over your changes — cell family, density, and chromatic strength for study scores.',
        presetId: 'slonimsky_etude',
      },
      {
        id: 'standalone_etude',
        label: 'Standalone etude',
        tagline: 'Engine-agnostic preset',
        selectionBlurb:
          'Standalone etude MusicContext preset — same Wyble path, emphasising self-contained study material without parent engine hops.',
        presetId: 'wyble_etude',
      },
      {
        id: 'wyble_etude_preset',
        label: 'Wyble etude preset',
        tagline: 'Pentatonic · chromatic · whole tone',
        selectionBlurb:
          'Wyble etude when chord progression is empty — pattern type and difficulty drive the chart from tonal centre and BPM.',
        presetId: 'wyble_etude',
      },
    ],
  },
  {
    id: 'texture_arrangement',
    title: 'Texture & Arrangement',
    purpose: 'Ensemble colour, groove, arrangement',
    producers: [
      {
        id: 'duo',
        label: 'Duo',
        tagline: 'Guitar · bass',
        selectionBlurb:
          'Eight-bar jazz guitar–bass duo with chord symbols, rehearsal marks, and conversational interplay defaults.',
        presetId: 'guitar_bass_duo',
      },
      {
        id: 'ecm_chamber',
        label: 'ECM chamber',
        tagline: 'Modal · space',
        selectionBlurb:
          'ECM chamber jazz — Metheny line focus or Schneider/Wheeler clouds; straight feel and long-form colour.',
        presetId: 'ecm_chamber',
      },
      {
        id: 'big_band',
        label: 'Big Band',
        tagline: 'Seven-part score',
        selectionBlurb:
          'Full big-band realisation — saxes, brass, piano, bass, drums — MusicXML when export gates pass.',
        presetId: 'big_band',
      },
      {
        id: 'new_orleans',
        label: 'New Orleans / funk',
        tagline: 'Second line · NOL',
        selectionBlurb:
          'Song Mode with New Orleans second-line rhythm profile — groove-forward harmony and ensemble colour.',
        presetId: 'song_mode',
      },
      {
        id: 'riff',
        label: 'Riff',
        tagline: '1–4 bar loop',
        selectionBlurb:
          'Short loopable riff on a strict grid — internal riff composite gate before Sibelius-safe MusicXML export.',
        presetId: 'riff_generator',
      },
      {
        id: 'tritonic',
        label: 'Tritonic',
        tagline: 'Float · trace',
        selectionBlurb:
          'Tritonic harmonic float and melodic trace — cells above locked harmony; monitor strands after generate.',
        presetId: 'string_quartet',
      },
      {
        id: 'wayne_shorter',
        label: 'Wayne Shorter',
        tagline: 'Harmolodic plan',
        selectionBlurb:
          'Song Mode with Wayne Shorter songwriter slice — Python bridge harmony and oddity-aware section colour.',
        presetId: 'song_mode',
      },
      {
        id: 'monk',
        label: 'Monk',
        tagline: 'Angular changes',
        selectionBlurb:
          'Song Mode with Thelonious Monk slice — chromatic neighbours, tritone shifts, and deferred cadence language.',
        presetId: 'song_mode',
      },
      {
        id: 'string_quartet',
        label: 'String Quartet',
        tagline: 'Four strings + piano',
        selectionBlurb:
          'String quartet texture archetypes, optional Tritonic colour, voice-leading diagnostics, and full-score MusicXML.',
        presetId: 'string_quartet',
      },
      {
        id: 'sq_to_bb',
        label: 'SQ → BB',
        tagline: 'SATB → big band',
        selectionBlurb:
          'Line-first quartet sketch, review gates, then big-band section translation — dual SQ and BB exports.',
        presetId: 'sq_to_bb',
      },
    ],
  },
] as const;

const PRODUCER_BY_ID = new Map<GenerateProducerId, GenerateProducerTile>(
  GENERATE_PRODUCER_LANES.flatMap((lane) => lane.producers.map((p) => [p.id, p] as const))
);

const LANE_BY_PRODUCER = new Map<GenerateProducerId, GenerateProducerLaneId>(
  GENERATE_PRODUCER_LANES.flatMap((lane) => lane.producers.map((p) => [p.id, lane.id] as const))
);

export function getGenerateProducerTile(id: GenerateProducerId): GenerateProducerTile | undefined {
  return PRODUCER_BY_ID.get(id);
}

export function getGenerateProducerLaneId(id: GenerateProducerId): GenerateProducerLaneId | undefined {
  return LANE_BY_PRODUCER.get(id);
}

export function producerIdFromPresetId(
  presetId: string,
  opts?: { riffSubMode?: 'riff' | 'comping' }
): GenerateProducerId {
  if (presetId === 'riff_generator' && opts?.riffSubMode === 'comping') return 'comping';
  switch (presetId) {
    case 'guitar_bass_duo':
    case 'guitar_bass_duo_single_line':
      return 'duo';
    case 'wyble_etude':
      return 'wyble';
    case 'martino_linear':
      return 'martino';
    case 'slonimsky_etude':
      return 'slonimsky';
    case 'ecm_chamber':
      return 'ecm_chamber';
    case 'big_band':
      return 'big_band';
    case 'string_quartet':
      return 'string_quartet';
    case 'riff_generator':
      return 'riff';
    case 'sq_to_bb':
      return 'sq_to_bb';
    case 'song_mode':
    default:
      return 'song_mode';
  }
}

export type ApplyGenerateProducerSideEffects = {
  riffSubMode?: 'riff' | 'comping';
  songwriterStyle?: string;
  rhythmEngineId?: string;
  sqTritonicColour?: 'none' | 'subtle' | 'active';
};

/** Side effects beyond presetId when a producer tile is chosen. */
export function applyGenerateProducerSideEffects(
  id: GenerateProducerId
): ApplyGenerateProducerSideEffects {
  switch (id) {
    case 'comping':
      return { riffSubMode: 'comping' };
    case 'riff':
      return { riffSubMode: 'riff' };
    case 'new_orleans':
      return { rhythmEngineId: 'new_orleans_second_line' };
    case 'wayne_shorter':
      return { songwriterStyle: 'wayne_shorter' };
    case 'monk':
      return { songwriterStyle: 'thelonious_monk' };
    case 'tritonic':
      return { sqTritonicColour: 'subtle' };
    case 'ireal':
    case 'vault':
    case 'standalone_etude':
    case 'wyble_etude_preset':
    default:
      return {};
  }
}

export function tritonicFloatOverLabel(opts: {
  hasVaultChart: boolean;
  hasGeneratedHarmony: boolean;
}): string {
  if (opts.hasVaultChart) return 'vault chart';
  if (opts.hasGeneratedHarmony) return 'generated harmony';
  return 'vault chart | generated harmony';
}
