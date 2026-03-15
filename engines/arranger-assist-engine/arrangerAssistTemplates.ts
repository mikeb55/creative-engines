/**
 * Arranger-Assist Engine — Template library for arranging suggestions
 */

import type { ArrangerSuggestion } from './arrangerAssistTypes';

export type TemplateId =
  | 'classic_swing_backgrounds'
  | 'ellington_punctuation'
  | 'sax_soli_basic'
  | 'brass_shout_ramp'
  | 'ballad_support_figures';

export interface TemplateMatch {
  sectionRole: string;
  phraseType?: string;
  leadSection?: string;
}

export const TEMPLATE_DEFINITIONS: Record<
  TemplateId,
  (section: string, startBar: number, length: number, density: string, leadSection?: string) => ArrangerSuggestion[]
> = {
  classic_swing_backgrounds: (section, startBar, length, density, leadSection) => [
    {
      section,
      barRange: { startBar, endBar: startBar + length - 1 },
      role: 'background_figure',
      density: density as any,
      description: 'Sax pad — sustained chords, soft blend, avoid melody register',
      confidence: 0.85,
      optionalRhythmText: 'Whole and half notes',
      optionalVoicingHint: 'Close voicings, alto/tenor focus',
      subtype: 'sax_pad',
    },
    {
      section,
      barRange: { startBar: startBar + Math.floor(length / 2), endBar: startBar + length - 1 },
      role: 'background_figure',
      density: density as any,
      description: 'Sax rhythmic background — light syncopation, off-beat figures',
      confidence: 0.75,
      optionalRhythmText: 'Eighth-note pickups, 2+4 accents',
      optionalVoicingHint: 'Unison or two-part',
      subtype: 'sax_rhythmic',
    },
  ],

  ellington_punctuation: (section, startBar, length, density, leadSection) => [
    {
      section,
      barRange: { startBar: startBar + 2, endBar: startBar + 3 },
      role: 'punctuation',
      density: 'medium',
      description: 'Brass stab — short answer to lead phrase',
      confidence: 0.9,
      optionalRhythmText: 'Quarter-note hit on beat 1 or 3',
      optionalVoicingHint: 'Trumpets 1–3, block chord',
      subtype: 'brass_stab',
    },
    {
      section,
      barRange: { startBar: startBar + length - 2, endBar: startBar + length - 1 },
      role: 'punctuation',
      density: density as any,
      description: 'Section answer — brass responds to reed lead',
      confidence: 0.8,
      optionalRhythmText: '2-bar call-response',
      optionalVoicingHint: 'Full brass section',
      subtype: 'section_answer',
    },
  ],

  sax_soli_basic: (section, startBar, length, density, leadSection) => [
    {
      section,
      barRange: { startBar, endBar: startBar + length - 1 },
      role: 'soli_texture',
      density: 'dense',
      description: 'Sax soli — tutti saxes, block harmony, rhythmic unison',
      confidence: 0.95,
      optionalRhythmText: 'Unison melody with harmonized hits',
      optionalVoicingHint: '4-part close, optional 5th for baritone',
      subtype: 'sax_soli',
    },
    {
      section,
      barRange: { startBar: startBar + Math.floor(length / 2), endBar: startBar + length - 1 },
      role: 'soli_texture',
      density: 'medium',
      description: 'Brass block answer — 2-bar brass punctuation after sax phrase',
      confidence: 0.8,
      optionalRhythmText: 'Staccato block chord',
      optionalVoicingHint: 'Trumpets + trombones',
      subtype: 'brass_block_answer',
    },
  ],

  brass_shout_ramp: (section, startBar, length, density, leadSection) => {
    const q = Math.floor(length / 4);
    return [
      {
        section,
        barRange: { startBar, endBar: startBar + q - 1 },
        role: 'shout_ramp',
        density: 'medium',
        description: 'Setup — establish brass presence, moderate density',
        confidence: 0.9,
        optionalRhythmText: 'Rhythmic figures, build anticipation',
        optionalVoicingHint: 'Trumpets lead, trombones support',
        subtype: 'setup',
      },
      {
        section,
        barRange: { startBar: startBar + q, endBar: startBar + 2 * q - 1 },
        role: 'shout_ramp',
        density: 'dense',
        description: 'Intensification — increase activity, add hits',
        confidence: 0.9,
        optionalRhythmText: 'Shorter note values, more syncopation',
        optionalVoicingHint: 'Full brass',
        subtype: 'intensification',
      },
      {
        section,
        barRange: { startBar: startBar + 2 * q, endBar: startBar + 3 * q - 1 },
        role: 'shout_ramp',
        density: 'tutti',
        description: 'Arrival — climax, tutti hits',
        confidence: 0.95,
        optionalRhythmText: 'Big hits on downbeats',
        optionalVoicingHint: 'Full band',
        subtype: 'arrival',
      },
      {
        section,
        barRange: { startBar: startBar + 3 * q, endBar: startBar + length - 1 },
        role: 'shout_ramp',
        density: 'dense',
        description: 'Release — ease off, prepare next section',
        confidence: 0.85,
        optionalRhythmText: 'Longer notes, fewer hits',
        optionalVoicingHint: 'Brass sustain',
        subtype: 'release',
      },
    ];
  },

  ballad_support_figures: (section, startBar, length, density, leadSection) => [
    {
      section,
      barRange: { startBar, endBar: startBar + length - 1 },
      role: 'background_figure',
      density: 'sparse',
      description: 'Trombone pad support — sustained chords, soft dynamics',
      confidence: 0.9,
      optionalRhythmText: 'Half and whole notes',
      optionalVoicingHint: 'Close voicings, avoid lead register',
      subtype: 'bone_support',
    },
    {
      section,
      barRange: { startBar: startBar + Math.floor(length / 2) - 1, endBar: startBar + Math.floor(length / 2) + 1 },
      role: 'background_figure',
      density: 'sparse',
      description: 'Brass punctuation behind lead — subtle answer',
      confidence: 0.75,
      optionalRhythmText: 'Single chord or short figure',
      optionalVoicingHint: 'Muted brass',
      subtype: 'brass_punctuation_behind_lead',
    },
  ],
};
