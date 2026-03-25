/**
 * Songwriting rule registry (research-aligned ids; short labels only).
 */

import type {
  AuthorRuleId,
  ClassicalSongRuleId,
  FoundationalRuleCategory,
  SongwriterRuleId,
  SongwritingEffectType,
  SongwritingRuleEntry,
  SongwritingRuleRegistryShape,
} from './songwritingResearchTypes';

function R(
  id: string,
  description: string,
  category: SongwritingRuleEntry['category'],
  effectType: SongwritingEffectType,
  priority: number,
  applicability: SongwritingRuleEntry['applicability']
): SongwritingRuleEntry {
  return { id, description, category, effectType, priority, applicability };
}

const songwriterRules: Record<SongwriterRuleId, SongwritingRuleEntry[]> = {
  bacharach: [
    R('bacharach.phrase_asym', 'Allow 3–7 bar phrase groupings', 'songwriter', 'form', 8, 'form'),
    R('bacharach.meter_flex', 'Meter changes when phrase requires', 'songwriter', 'rhythm', 7, 'form'),
    R('bacharach.melody_first', 'Melody-first; lyric fits contour', 'songwriter', 'melody', 9, 'global'),
    R('bacharach.borrowed', 'Borrowed chords + secondary dominants', 'songwriter', 'harmony', 8, 'global'),
    R('bacharach.harm_rhythm_decouple', 'Harmonic rhythm may cross barlines', 'songwriter', 'harmony', 7, 'verse'),
  ],
  stevie_wonder: [
    R('wonder.modal_mix', 'Modal mixture at pre-chorus/chorus', 'songwriter', 'harmony', 8, 'chorus'),
    R('wonder.tension_zone', 'Slow harmonic rhythm before chorus lift', 'songwriter', 'harmony', 7, 'pre_chorus'),
    R('wonder.groove_sync', 'Melodic rhythm aligned to groove', 'songwriter', 'rhythm', 8, 'global'),
    R('wonder.prechorus_required', 'Pre-chorus lift in Wonder mode', 'songwriter', 'form', 7, 'pre_chorus'),
    R('wonder.melisma', 'Melisma on emotional peaks', 'songwriter', 'melody', 6, 'chorus'),
  ],
  beatles: [
    R('beatles.compact_motif', 'Short memorable motifs', 'songwriter', 'hook', 8, 'global'),
    R('beatles.modal_interchange', 'bVII / bVI / borrowed color', 'songwriter', 'harmony', 7, 'verse'),
    R('beatles.title_peak', 'Title on melodic high point', 'songwriter', 'hook', 8, 'chorus'),
    R('beatles.surprise_chord', 'At least one harmonic surprise', 'songwriter', 'harmony', 6, 'form'),
    R('beatles.singable_range', 'Default ~octave vocal window', 'songwriter', 'melody', 7, 'global'),
  ],
  joni_mitchell: [
    R('joni.shape_harmony', 'Shape-based voicings (add2/add4)', 'songwriter', 'harmony', 8, 'verse'),
    R('joni.prosody_drive', 'Lyric prosody drives phrase edges', 'songwriter', 'lyric', 9, 'verse'),
    R('joni.weak_cadence', 'De-emphasise V–I loops', 'songwriter', 'harmony', 7, 'global'),
    R('joni.partial_refrain', 'Partial refrains vs big chorus', 'songwriter', 'form', 7, 'chorus'),
  ],
  donald_fagen: [
    R('fagen.extended_harm', '7th/9th/13th + substitutions', 'songwriter', 'harmony', 8, 'verse'),
    R('fagen.behind_beat', 'Vocal phrasing behind beat', 'songwriter', 'rhythm', 7, 'global'),
    R('fagen.mid_register', 'Mid-range jazz contour', 'songwriter', 'melody', 7, 'verse'),
    R('fagen.turns', 'Harmonic side-steps in bridges', 'songwriter', 'harmony', 6, 'bridge'),
  ],
  bob_dylan: [
    R('dylan.strophic', 'Strophic / many verses', 'songwriter', 'form', 8, 'verse'),
    R('dylan.narrow_range', 'Narrow chant-like range', 'songwriter', 'melody', 7, 'verse'),
    R('dylan.lyric_primary', 'Lyric density over hook', 'songwriter', 'lyric', 9, 'verse'),
    R('dylan.simple_prog', 'Simple diatonic harmony', 'songwriter', 'harmony', 6, 'global'),
  ],
  paul_simon: [
    R('simon.primary_axis', 'Tag melody/rhythm/harmony primary per song', 'songwriter', 'form', 8, 'global'),
    R('simon.section_contrast', 'Contrast at least one dimension V/C/B', 'songwriter', 'form', 8, 'form'),
    R('simon.prosody_stress', 'Speech stress vs accents', 'songwriter', 'lyric', 7, 'verse'),
    R('simon.folk_jazz_blend', 'Folk shapes + occasional colour', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  jeff_tweedy: [
    R('tweedy.simple_form', 'Stable V/C with narrative lyric', 'songwriter', 'form', 7, 'global'),
    R('tweedy.limited_range', 'Limited leaps; conversational', 'songwriter', 'melody', 7, 'verse'),
    R('tweedy.behind_simple', 'Slightly behind-beat feel', 'songwriter', 'rhythm', 6, 'verse'),
  ],
  carole_king: [
    R('king.piano_pop', 'Piano-centric triads/7ths', 'songwriter', 'harmony', 7, 'chorus'),
    R('king.big_chorus', 'Strong repeated chorus hook', 'songwriter', 'hook', 9, 'chorus'),
    R('king.title_repeat', 'Title at chorus start/end', 'songwriter', 'hook', 8, 'chorus'),
    R('king.bridge_mod', 'Bridge mod or reharm', 'songwriter', 'harmony', 6, 'bridge'),
  ],
  smokey_robinson: [
    R('smokey.short_cells', 'Short hook cells + reharm', 'songwriter', 'hook', 8, 'chorus'),
    R('smokey.title_on_peak', 'Title on strong beats / peaks', 'songwriter', 'hook', 8, 'chorus'),
    R('smokey.backbeat', 'Melodic rhythm locked to backbeat', 'songwriter', 'rhythm', 7, 'chorus'),
    R('smokey.bv_echo', 'Backing echo motifs', 'songwriter', 'form', 6, 'chorus'),
  ],
  randy_newman: [
    R('newman.speech_melody', 'Narrow speech-like lines', 'songwriter', 'melody', 8, 'verse'),
    R('newman.rich_harm', 'Secondary dominants + chromatic bass', 'songwriter', 'harmony', 8, 'verse'),
    R('newman.narrative_turn', 'Harmonic shifts at narrative turns', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  richard_thompson: [
    R('thompson.modal', 'Dorian/Mixolydian fields', 'songwriter', 'harmony', 8, 'verse'),
    R('thompson.guitar_cell', 'Melody aligned to guitar cells', 'songwriter', 'rhythm', 7, 'verse'),
    R('thompson.refrain_form', 'Verse/refrain narrative', 'songwriter', 'form', 7, 'verse'),
  ],
  max_martin: [
    R('martin.time_to_chorus', 'Early chorus / tight form', 'songwriter', 'form', 9, 'form'),
    R('martin.hook_cells', '1–3 note hook cells repeated', 'songwriter', 'hook', 9, 'chorus'),
    R('martin.diatonic_pop', 'I–V–vi–IV variants', 'songwriter', 'harmony', 8, 'chorus'),
    R('martin.pre_lift', 'Pre-chorus lift into chorus', 'songwriter', 'harmony', 8, 'pre_chorus'),
  ],
};

const authorRules: Record<AuthorRuleId, SongwritingRuleEntry[]> = {
  jimmy_webb: [
    R('webb.motif_reuse', 'Motif reuse across sections', 'author', 'hook', 8, 'form'),
    R('webb.late_climax', 'Climax in later third', 'author', 'form', 8, 'form'),
    R('webb.form_map', 'Form map before detail', 'author', 'form', 7, 'global'),
    R('webb.bridge_mod_plan', 'Planned modulations in bridge', 'author', 'harmony', 7, 'bridge'),
  ],
  pat_pattison: [
    R('pattison.stable_map', 'Stable vs unstable lyric/music map', 'author', 'lyric', 9, 'global'),
    R('pattison.stress_beats', 'Stressed syllables on strong beats', 'author', 'lyric', 8, 'chorus'),
    R('pattison.prechorus_instability', 'Pre-chorus instability → chorus resolution', 'author', 'form', 8, 'pre_chorus'),
  ],
  jack_perricone: [
    R('perricone.motif_abc', 'Motif types A/B/C quotas', 'author', 'melody', 8, 'form'),
    R('perricone.t_pd_d', 'Tonic / PD / D classification', 'author', 'harmony', 8, 'global'),
    R('perricone.phrase_pairs', 'Antecedent/consequent pairs', 'author', 'melody', 7, 'verse'),
  ],
};

const classicalSongRules: Record<ClassicalSongRuleId, SongwritingRuleEntry[]> = {
  schubert: [
    R('schubert.syllabic', 'Syllabic clarity mapping', 'classical', 'lyric', 8, 'verse'),
    R('schubert.mod_words', 'Modulation at narrative words', 'classical', 'harmony', 7, 'bridge'),
    R('schubert.contour_text', 'Contour mirrors text', 'classical', 'melody', 7, 'global'),
  ],
  schumann: [
    R('schumann.psych_shift', 'Sudden harmonic psychology shifts', 'classical', 'harmony', 7, 'bridge'),
    R('schumann.motif_cycles', 'Motifs link song cycles', 'classical', 'form', 6, 'form'),
  ],
  faure: [
    R('faure.smooth_mod', 'Smooth modal colour; gentle chromaticism', 'classical', 'harmony', 7, 'verse'),
    R('faure.legato_line', 'Legato small-interval lines', 'classical', 'melody', 7, 'global'),
  ],
};

const foundationalRules: Record<FoundationalRuleCategory, SongwritingRuleEntry[]> = {
  hook: [
    R('found.hook_object', 'Primary hook object per song', 'foundational', 'hook', 9, 'chorus'),
    R('found.hook_repeat', 'Hook repeats at structural points', 'foundational', 'hook', 8, 'form'),
    R('found.hook_fatigue', 'Limit back-to-back repeats', 'foundational', 'hook', 5, 'form'),
  ],
  melody: [
    R('found.motif_variation', 'Motifs + variation rules', 'foundational', 'melody', 8, 'global'),
    R('found.stepwise', 'Mostly stepwise; leaps for peaks', 'foundational', 'melody', 8, 'chorus'),
    R('found.range_style', 'Range budget by style', 'foundational', 'melody', 6, 'global'),
  ],
  harmony: [
    R('found.section_tag', 'Tag functional vs modal sections', 'foundational', 'harmony', 7, 'form'),
    R('found.harm_rhythm', 'Harmonic rhythm per section', 'foundational', 'harmony', 7, 'verse'),
    R('found.surprise_slot', 'Borrowed / colour slots', 'foundational', 'harmony', 6, 'form'),
  ],
  lyric_prosody: [
    R('found.stress_align', 'Stress vs strong beats', 'foundational', 'lyric', 8, 'chorus'),
    R('found.line_length', 'Line length vs phrase length', 'foundational', 'lyric', 7, 'verse'),
    R('found.emotional_peaks', 'Peaks on emotional words', 'foundational', 'lyric', 7, 'chorus'),
  ],
};

export const SONGWRITER_RULE_REGISTRY: SongwritingRuleRegistryShape = {
  songwriterRules,
  authorRules,
  classicalSongRules,
  foundationalRules,
};

export function allRegistryRuleIds(): string[] {
  const ids: string[] = [];
  for (const g of Object.values(songwriterRules)) for (const r of g) ids.push(r.id);
  for (const g of Object.values(authorRules)) for (const r of g) ids.push(r.id);
  for (const g of Object.values(classicalSongRules)) for (const r of g) ids.push(r.id);
  for (const g of Object.values(foundationalRules)) for (const r of g) ids.push(r.id);
  return ids;
}
