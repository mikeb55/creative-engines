/**
 * User-facing copy for Generate page (no engine imports).
 */

export type OutputCategory = 'planning' | 'lead_sheet_ready' | 'full_score_musicxml';

export type ModeUx = {
  id: string;
  label: string;
  /** One-line hint under the mode selector */
  hint: string;
  /** Short paragraphs for the mode description card */
  whatItDoes: string;
  bestFor: string;
  output: string;
};

export const MODE_UX: ModeUx[] = [
  {
    id: 'guitar_bass_duo',
    label: 'Guitar–Bass Duo',
    hint: 'Eight-bar jazz duo sketches with chords, rehearsal letters, and duo interplay.',
    whatItDoes:
      'Generates a complete guitar and upright bass duo with harmony, melody, and rhythm using the engine’s duo defaults (Barry Harris–led style path in this build).',
    bestFor: 'Practice charts, teaching examples, and quick duo ideas you can open in Sibelius or MuseScore.',
    output: 'Exported MusicXML — a full, bar-complete score file.',
  },
  {
    id: 'guitar_bass_duo_single_line',
    label: 'Guitar–Bass Duo (Single-Line)',
    hint: 'Same duo harmony path with independent single-note guitar and bass lines.',
    whatItDoes:
      'Builds an interactive guitar and bass duo using the same chord progression handling as the standard duo preset, but with monophonic lines only (no chordal guitar layer).',
    bestFor: 'Single-line reading, contrapuntal duo practice, and charts that stay in melodic register.',
    output: 'Exported MusicXML — full score, same export path as other duo presets.',
  },
  {
    id: 'wyble_etude',
    label: 'Wyble Etude',
    hint: 'Contrapuntal two-voice guitar study',
    whatItDoes:
      'Generates interlocking upper and lower guitar voices in a Jimmy Wyble–style contrapuntal etude.',
    bestFor: 'Two-voice guitar reading, independence, and contrapuntal practice.',
    output: 'Exported MusicXML — two-staff guitar score.',
  },
  {
    id: 'song_mode',
    label: 'Song Mode',
    hint: 'Best for hook-led song structures and lead-sheet-ready ideas.',
    whatItDoes:
      'Plans sections, hooks, and songwriting rules. Songwriter style shapes melody and form; arranger style nudges how sections relate (pairing is guidance, not a second engine).',
    bestFor: 'Verse/chorus arcs, title hooks, and a contract you can take to a lead sheet or band.',
    output:
      'Exported MusicXML — song structure and hooks from Song Mode, realised as an eight-bar guitar–bass duo chart.',
  },
  {
    id: 'ecm_chamber',
    label: 'ECM Chamber',
    hint: 'Atmospheric chamber jazz — choose Metheny-style line focus or Schneider / Wheeler-style clouds.',
    whatItDoes:
      'Builds a chamber-jazz texture in the ECM spirit: modal harmony, space, and long-line development.',
    bestFor: 'Through-composed, colour-rich writing where mood and colour matter more than shout choruses.',
    output: 'Exported MusicXML — a full score sized for the chamber preset you pick below.',
  },
  {
    id: 'big_band',
    label: 'Big Band',
    hint: 'Full big-band MusicXML (reeds, brass, piano, bass, drums) when export succeeds — planning JSON if not.',
    whatItDoes:
      'Plans form, section roles, and density, then realises a full ensemble score: saxes, brass, piano (with chord symbols), bass, and jazz drums — exported as MusicXML you can open in Sibelius or MuseScore.',
    bestFor:
      'Sketch charts, rehearsal materials, section balance, and custom harmony experiments before you refine voicings and dynamics by hand.',
    output: 'Full ensemble MusicXML score when export succeeds; planning JSON if export fails.',
  },
  {
    id: 'string_quartet',
    label: 'String Quartet',
    hint: 'Full quartet MusicXML (strings + piano harmony staff) when export succeeds — planning JSON if not.',
    whatItDoes:
      'Plans texture and narrative form, then realises a full score: two violins, viola, violoncello, plus a piano staff for harmony and chord symbols — exported as MusicXML for notation software.',
    bestFor:
      'Chamber layouts, contrast between voices, harmonic clarity on the piano staff, and quick playable drafts to refine in the DAW or score editor.',
    output: 'Full ensemble MusicXML score when export succeeds; planning JSON if export fails.',
  },
  {
    id: 'riff_generator',
    label: 'Riff Generator',
    hint: '1–4 bar loopable riffs with chord symbols, rehearsal mark “Riff”, and Sibelius-safe MusicXML.',
    whatItDoes:
      'Builds a short riff on a strict eighth or sixteenth grid: repeating rhythm, syncopation, hook, and loop closure. Candidates are ranked against an internal 0–10 riff composite only (not the duo/Song Mode GCE); only passes export when that gate is met.',
    bestFor: 'Practice cells, hooks, and grooves you can drop into Sibelius or extend into a full piece.',
    output: 'Single MusicXML file under the Riffs project folder (projects/riffs).',
  },
];

export function getModeUx(id: string): ModeUx | undefined {
  return MODE_UX.find((m) => m.id === id);
}

/** Honest labels: planning vs lead-sheet-ready vs full score file. */
export function describeOutputKind(presetId: string): {
  category: OutputCategory;
  headline: string;
  subtitle: string;
} {
  if (presetId === 'big_band' || presetId === 'string_quartet') {
    return {
      category: 'full_score_musicxml',
      headline: 'Full ensemble MusicXML',
      subtitle:
        presetId === 'big_band'
          ? 'Big band: full score when realisation and export succeed; planning JSON if realisation or export fails.'
          : 'String quartet: full score when realisation and export succeed; planning JSON if realisation or export fails.',
    };
  }
  if (
    presetId === 'guitar_bass_duo' ||
    presetId === 'guitar_bass_duo_single_line' ||
    presetId === 'ecm_chamber' ||
    presetId === 'riff_generator' ||
    presetId === 'song_mode' ||
    presetId === 'wyble_etude'
  ) {
    return {
      category: 'full_score_musicxml',
      headline:
        presetId === 'wyble_etude' ? 'Score (MusicXML)' : 'Full score · MusicXML export',
      subtitle:
        presetId === 'song_mode'
          ? 'Song Mode plans hooks and sections, then exports a duo chart as MusicXML for Sibelius or MuseScore.'
          : presetId === 'wyble_etude'
            ? 'Wyble Etude: two-voice guitar MusicXML for Sibelius or MuseScore.'
            : 'You get a complete exported score file for notation software.',
    };
  }
  return {
    category: 'planning',
    headline: 'Planning only',
    subtitle: 'Orchestration / architecture JSON — not a finished notated score in this build.',
  };
}

export function labelCreativeLevel(level: 'stable' | 'balanced' | 'surprise'): string {
  switch (level) {
    case 'stable':
      return 'Stable';
    case 'balanced':
      return 'Balanced';
    case 'surprise':
      return 'Surprise';
    default:
      return level;
  }
}

export const EXPERIMENTAL_HELP =
  'Experimental marks an unusual but allowed pairing — still usable; try another variation if you want something safer.';
