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
  brian_wilson: [
    R('wilson.layered_vocals', 'Stacked harmony layers', 'songwriter', 'form', 8, 'chorus'),
    R('wilson.section_pivot', 'Section pivots via colour chords', 'songwriter', 'harmony', 8, 'form'),
    R('wilson.hook_return', 'Hook return with arrangement lift', 'songwriter', 'hook', 8, 'chorus'),
    R('wilson.modal_colour', 'Modal mixture in bridges', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  paul_mccartney: [
    R('mccartney.melodic_peak', 'Melodic peaks on title/hook', 'songwriter', 'melody', 8, 'chorus'),
    R('mccartney.tight_verse', 'Verse economy → chorus release', 'songwriter', 'form', 8, 'verse'),
    R('mccartney.contrast_bridge', 'Bridge contrast or pivot', 'songwriter', 'form', 7, 'bridge'),
    R('mccartney.singable', 'Singable stepwise with leap at peak', 'songwriter', 'melody', 7, 'global'),
  ],
  jeff_lynne: [
    R('lynne.straight_eighth', 'Driving straight-eighth groove', 'songwriter', 'rhythm', 8, 'global'),
    R('lynne.layered_hook', 'Layered guitar/vocal hook', 'songwriter', 'hook', 8, 'chorus'),
    R('lynne.diatonic_lift', 'Diatonic lifts + stacked chords', 'songwriter', 'harmony', 7, 'chorus'),
    R('lynne.tight_form', 'Tight verse-chorus economy', 'songwriter', 'form', 8, 'form'),
  ],
  xtc: [
    R('xtc.harmonic_twist', 'Unexpected harmonic turns', 'songwriter', 'harmony', 8, 'verse'),
    R('xtc.art_pop_form', 'Art-pop section pivots', 'songwriter', 'form', 7, 'form'),
    R('xtc.rhythmic_push', 'Syncopated pushes vs backbeat', 'songwriter', 'rhythm', 7, 'chorus'),
    R('xtc.title_irony', 'Title/hook with lyrical irony', 'songwriter', 'lyric', 6, 'chorus'),
  ],
  kurt_weill: [
    R('weill.theatre_harm', 'Theatre harmony / cabaret colour', 'songwriter', 'harmony', 8, 'verse'),
    R('weill.speech_melody', 'Speech-song melodic contour', 'songwriter', 'melody', 8, 'verse'),
    R('weill.section_drama', 'Dramatic section contrasts', 'songwriter', 'form', 8, 'form'),
    R('weill.chromatic_bass', 'Chromatic bass motion', 'songwriter', 'harmony', 7, 'verse'),
  ],
  holland_dozier_holland: [
    R('hdh.motown_hook', 'Motown hook cell repetition', 'songwriter', 'hook', 9, 'chorus'),
    R('hdh.backbeat_lock', 'Melody locked to backbeat', 'songwriter', 'rhythm', 8, 'chorus'),
    R('hdh.iv_v', 'IV–V lifts into chorus', 'songwriter', 'harmony', 8, 'pre_chorus'),
    R('hdh.call_response', 'Call/response hook framing', 'songwriter', 'form', 7, 'chorus'),
  ],
  norman_whitfield: [
    R('whitfield.psychedelic_riff', 'Extended vamps + riff hooks', 'songwriter', 'hook', 8, 'verse'),
    R('whitfield.syncop_groove', 'Heavy syncop vs straight sections', 'songwriter', 'rhythm', 8, 'global'),
    R('whitfield.slow_burn', 'Slow harmonic rhythm builds', 'songwriter', 'harmony', 7, 'verse'),
    R('whitfield.density_stack', 'Dense instrumental stacks', 'songwriter', 'form', 7, 'chorus'),
  ],
  bach: [
    R('bach.sequential', 'Sequential development of motifs', 'songwriter', 'melody', 8, 'global'),
    R('bach.voice_leading', 'Strong voice-leading between chords', 'songwriter', 'harmony', 8, 'verse'),
    R('bach.metric_drive', 'Metric drive + suspensions', 'songwriter', 'rhythm', 7, 'global'),
    R('bach.cycle_fifths', 'Circle-of-fifths motion slots', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  beethoven: [
    R('beethoven.motivic', 'Motivic development across sections', 'songwriter', 'melody', 8, 'form'),
    R('beethoven.dramatic_contrast', 'Dramatic dynamic/harmonic contrast', 'songwriter', 'harmony', 8, 'form'),
    R('beethoven.metric_shift', 'Metric/hypermetric surprises', 'songwriter', 'rhythm', 7, 'verse'),
    R('beethoven.climax_arc', 'Climax arc toward recap', 'songwriter', 'form', 8, 'form'),
  ],
  debussy: [
    R('debussy.parallel_chords', 'Parallel chord streams / planing', 'songwriter', 'harmony', 8, 'verse'),
    R('debussy.whole_tone', 'Whole-tone / colour shifts', 'songwriter', 'harmony', 7, 'bridge'),
    R('debussy.rubato_phrase', 'Phrase-level rubato vs pulse', 'songwriter', 'rhythm', 7, 'global'),
    R('debussy.pentatonic', 'Pentatonic / mode colour', 'songwriter', 'melody', 7, 'verse'),
  ],
  stravinsky: [
    R('stravinsky.metric_cell', 'Metric cell displacement', 'songwriter', 'rhythm', 8, 'global'),
    R('stravinsky.polytonal', 'Polytonal / bitonal colour', 'songwriter', 'harmony', 8, 'verse'),
    R('stravinsky.primitive_hook', 'Primitive / ritual hook shapes', 'songwriter', 'hook', 7, 'chorus'),
    R('stravinsky.section_cut', 'Abrupt sectional cuts', 'songwriter', 'form', 8, 'form'),
  ],
  ravel: [
    R('ravel.orchestral_line', 'Orchestral line in pop frame', 'songwriter', 'melody', 8, 'verse'),
    R('ravel.pedal_colour', 'Pedal + modal colour', 'songwriter', 'harmony', 8, 'verse'),
    R('ravel.miniature_form', 'Miniature balanced phrases', 'songwriter', 'form', 7, 'global'),
    R('ravel.sparkle_register', 'High-register sparkle peaks', 'songwriter', 'melody', 7, 'chorus'),
  ],
  schubert: [
    R('schubert_song.lied_line', 'Lied-style melodic line', 'songwriter', 'melody', 8, 'verse'),
    R('schubert_song.mod_bridge', 'Modulation in bridge', 'songwriter', 'harmony', 7, 'bridge'),
    R('schubert_song.strophic_var', 'Strophic with variation', 'songwriter', 'form', 7, 'verse'),
    R('schubert_song.piano_comment', 'Piano commentary texture', 'songwriter', 'form', 6, 'verse'),
  ],
  mahler: [
    R('mahler.epic_arc', 'Epic multi-section arc', 'songwriter', 'form', 8, 'form'),
    R('mahler.chromatic_wander', 'Chromatic wandering lines', 'songwriter', 'harmony', 8, 'verse'),
    R('mahler.folk_intrude', 'Folk intrusion in art frame', 'songwriter', 'melody', 7, 'bridge'),
    R('mahler.climax_orchestra', 'Orchestral climax planning', 'songwriter', 'form', 8, 'chorus'),
  ],
  prokofiev: [
    R('prokofiev.toccata_drive', 'Toccata-like motor drive', 'songwriter', 'rhythm', 8, 'global'),
    R('prokofiev.sarcasm_turn', 'Sarcasm / irony turns', 'songwriter', 'harmony', 7, 'bridge'),
    R('prokofiev.neoclassical', 'Neoclassical clarity + bite', 'songwriter', 'melody', 7, 'verse'),
    R('prokofiev.percussive_hook', 'Percussive hook cells', 'songwriter', 'hook', 8, 'chorus'),
  ],
  shostakovich: [
    R('shosta.grotesque', 'Grotesque march / irony', 'songwriter', 'form', 8, 'verse'),
    R('shosta.quote_layer', 'Quotation / layer juxtaposition', 'songwriter', 'harmony', 7, 'bridge'),
    R('shosta.lament_line', 'Narrow lament contour', 'songwriter', 'melody', 8, 'verse'),
    R('shosta.strings_brass', 'Strings vs brass contrast', 'songwriter', 'form', 7, 'chorus'),
  ],
  messiaen: [
    R('messiaen.mode_rot', 'Mode rotation / limited transposition', 'songwriter', 'harmony', 9, 'global'),
    R('messiaen.additive_rhythm', 'Additive rhythmic groups', 'songwriter', 'rhythm', 8, 'verse'),
    R('messiaen.bird_call', 'Bird-call / nature motifs', 'songwriter', 'melody', 7, 'verse'),
    R('messiaen.static_colour', 'Static harmony colour fields', 'songwriter', 'harmony', 8, 'verse'),
  ],
  duke_ellington: [
    R('duke.jungle_riff', 'Jungle / growl riff colour', 'songwriter', 'harmony', 8, 'verse'),
    R('duke.mood_suite', 'Mood suite / extended form', 'songwriter', 'form', 7, 'form'),
    R('duke.brass_melody', 'Brass-led melodic hooks', 'songwriter', 'melody', 8, 'chorus'),
    R('duke.swing_elide', 'Swing elision across bars', 'songwriter', 'rhythm', 8, 'global'),
  ],
  billy_strayhorn: [
    R('strayhorn.lush_7', 'Lush 7th/9th voicings', 'songwriter', 'harmony', 8, 'verse'),
    R('strayhorn.late_night', 'Late-night ballad contour', 'songwriter', 'melody', 8, 'verse'),
    R('strayhorn.ironic_title', 'Ironic / oblique title hook', 'songwriter', 'hook', 7, 'chorus'),
    R('strayhorn.counter_line', 'Countermelody under lead', 'songwriter', 'form', 7, 'chorus'),
  ],
  james_brown: [
    R('jb.the_one', 'The One — downbeat anchor', 'songwriter', 'rhythm', 9, 'global'),
    R('jb.funk_cell', 'Funk cell vamps', 'songwriter', 'hook', 9, 'verse'),
    R('jb.call_minimal', 'Minimal call; maximum groove', 'songwriter', 'form', 8, 'verse'),
    R('jb.syncop_stack', 'Stacked syncop layers', 'songwriter', 'rhythm', 8, 'chorus'),
  ],
  prince: [
    R('prince.minneapolis', 'Minneapolis funk pocket', 'songwriter', 'rhythm', 8, 'global'),
    R('prince.androgyny_hook', 'Androgynous register hook', 'songwriter', 'hook', 8, 'chorus'),
    R('prince.purple_colour', 'Colour-chord side-slips', 'songwriter', 'harmony', 8, 'verse'),
    R('prince.arena_peak', 'Arena chorus peak', 'songwriter', 'form', 8, 'chorus'),
  ],
  kendrick_lamar: [
    R('kdot.story_arc', 'Narrative arc over sections', 'songwriter', 'form', 9, 'form'),
    R('kdot.jazz_soul', 'Jazz/soul sample harmony', 'songwriter', 'harmony', 8, 'verse'),
    R('kdot.prosody_rap', 'Prosody-first rap phrasing', 'songwriter', 'lyric', 9, 'verse'),
    R('kdot.section_flip', 'Sudden section flips', 'songwriter', 'form', 8, 'bridge'),
  ],
  gil_evans: [
    R('evans.cool_pastel', 'Cool pastel voicing clouds', 'songwriter', 'harmony', 8, 'verse'),
    R('evans.miles_space', 'Space + colour over time', 'songwriter', 'form', 8, 'global'),
    R('evans.modal_pad', 'Modal pad + moving inner lines', 'songwriter', 'harmony', 8, 'verse'),
    R('evans.orchestral_register', 'Orchestral register washes', 'songwriter', 'melody', 7, 'chorus'),
  ],
  thad_jones: [
    R('thad.brass_shout', 'Brass shout chorus hooks', 'songwriter', 'hook', 8, 'chorus'),
    R('thad.bop_changes', 'Bop changes + blues side', 'songwriter', 'harmony', 8, 'verse'),
    R('thad.section_lift', 'Section lifts via II–V', 'songwriter', 'harmony', 7, 'bridge'),
    R('thad.swing_line', 'Swing line in brass + rhythm', 'songwriter', 'rhythm', 8, 'global'),
  ],
  sammy_nestico: [
    R('nestico.chart_tight', 'Tight chart reading form', 'songwriter', 'form', 8, 'form'),
    R('nestico.basie_kick', 'Basie-style kick figures', 'songwriter', 'rhythm', 8, 'chorus'),
    R('nestico.sax_sol', 'Soli sections + shout', 'songwriter', 'melody', 7, 'verse'),
    R('nestico.diatonic_shout', 'Diatonic shout hooks', 'songwriter', 'hook', 8, 'chorus'),
  ],
  quincy_jones: [
    R('qj.film_arc', 'Film / soundtrack arc', 'songwriter', 'form', 8, 'form'),
    R('qj.rnb_lift', 'R&B lift + jazz harmony', 'songwriter', 'harmony', 8, 'chorus'),
    R('qj.groove_first', 'Groove-first arrangement', 'songwriter', 'rhythm', 8, 'global'),
    R('qj.horn_pad', 'Horn pads under vocal hook', 'songwriter', 'hook', 7, 'chorus'),
  ],
  bob_brookmeyer: [
    R('brook.counterpoint', 'Linear counterpoint in big band', 'songwriter', 'melody', 8, 'verse'),
    R('brook.valve_cluster', 'Valve cluster colour', 'songwriter', 'harmony', 8, 'verse'),
    R('brook.odd_meter', 'Odd-meter phrase pivots', 'songwriter', 'rhythm', 8, 'form'),
    R('brook.west_coast', 'West Coast cool voicings', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  maria_schneider: [
    R('msch.wind_texture', 'Wind texture swells', 'songwriter', 'form', 8, 'verse'),
    R('msch.improv_slot', 'Improv slots in long forms', 'songwriter', 'form', 8, 'form'),
    R('msch.natural_image', 'Nature / image harmonic drift', 'songwriter', 'harmony', 9, 'global'),
    R('msch.pulse_rubato', 'Collective pulse + rubato', 'songwriter', 'rhythm', 7, 'global'),
  ],
  clare_fischer: [
    R('fisch.poly_plan', 'Poly-planar voicings', 'songwriter', 'harmony', 9, 'verse'),
    R('fisch.latino_clave', 'Latin clave + jazz changes', 'songwriter', 'rhythm', 8, 'global'),
    R('fisch.dense_mid', 'Dense mid-register clusters', 'songwriter', 'harmony', 8, 'chorus'),
    R('fisch.vocal_harm', 'Vocal harmony orchestration', 'songwriter', 'melody', 7, 'chorus'),
  ],
  manny_albam: [
    R('albam.studio_chart', 'Studio big-band clarity', 'songwriter', 'form', 7, 'form'),
    R('albam.trombone_row', 'Trombone section hooks', 'songwriter', 'hook', 7, 'chorus'),
    R('albam.swing_even', 'Even eighth swing charts', 'songwriter', 'rhythm', 8, 'global'),
    R('albam.bridge_mod', 'Bridge reharm lift', 'songwriter', 'harmony', 7, 'bridge'),
  ],
  oliver_nelson: [
    R('on.stolen_moments', 'Ballad contour + blues colour', 'songwriter', 'melody', 8, 'verse'),
    R('on.stax_bridge', 'Stax / soul bridge contrast', 'songwriter', 'harmony', 7, 'bridge'),
    R('on.sax_unison', 'Sax unison shout', 'songwriter', 'hook', 8, 'chorus'),
    R('on.form_story', 'Story form through sections', 'songwriter', 'form', 8, 'form'),
  ],
  gerald_wilson: [
    R('gw.la_bigband', 'LA big-band swagger', 'songwriter', 'rhythm', 8, 'global'),
    R('gw.blues_side', 'Blues side-slips', 'songwriter', 'harmony', 8, 'verse'),
    R('gw.section_soli', 'Section soli trade', 'songwriter', 'form', 7, 'verse'),
    R('gw.shout_chorus', 'Shout chorus peaks', 'songwriter', 'hook', 8, 'chorus'),
  ],
  neal_hefti: [
    R('hefti.tv_bite', 'TV theme bite hooks', 'songwriter', 'hook', 9, 'chorus'),
    R('hefti.bright_brass', 'Bright brass fanfares', 'songwriter', 'melody', 8, 'chorus'),
    R('hefti.swing_tv', 'Swing pocket for broadcast', 'songwriter', 'rhythm', 8, 'global'),
    R('hefti.tight_turn', 'Tight turnarounds', 'songwriter', 'harmony', 7, 'verse'),
  ],
  don_sebesky: [
    R('seb.fusion_stack', 'Fusion horn stacks', 'songwriter', 'harmony', 8, 'chorus'),
    R('seb.string_pad', 'String pad + brass', 'songwriter', 'form', 8, 'verse'),
    R('seb.dramatic_mod', 'Dramatic mod lifts', 'songwriter', 'harmony', 8, 'bridge'),
    R('seb.groove_orchestra', 'Groove + orchestral weight', 'songwriter', 'rhythm', 8, 'global'),
  ],
  radiohead: [
    R('radiohead.modal_colour', 'Modal harmony + colour shifts', 'songwriter', 'harmony', 7, 'verse'),
    R('radiohead.irregular_form', 'Irregular phrase / form motion', 'songwriter', 'form', 7, 'form'),
    R('radiohead.sync_anchor', 'Syncopated melodic anchors', 'songwriter', 'rhythm', 7, 'global'),
  ],
  blur: [
    R('blur.brit_hook', 'Brit-pop hook emphasis', 'songwriter', 'hook', 8, 'chorus'),
    R('blur.section_punch', 'Sectional punches', 'songwriter', 'form', 7, 'form'),
    R('blur.diatonic_bite', 'Diatonic harmony with bite', 'songwriter', 'harmony', 7, 'verse'),
  ],
  pavement: [
    R('pavement.loose_cells', 'Loose melodic cells', 'songwriter', 'melody', 7, 'verse'),
    R('pavement.indie_form', 'Non-linear indie form', 'songwriter', 'form', 6, 'global'),
    R('pavement.dry_phrase', 'Dry vocal phrasing', 'songwriter', 'lyric', 7, 'verse'),
  ],
  sonic_youth: [
    R('sy.noise_space', 'Noise vs space contrast', 'songwriter', 'form', 8, 'form'),
    R('sy.angular_riff', 'Angular guitar riff logic', 'songwriter', 'melody', 7, 'verse'),
    R('sy.alt_tuning', 'Alternate tuning colour', 'songwriter', 'harmony', 7, 'global'),
  ],
  arcade_fire: [
    R('af.anthem_hook', 'Anthemic chorus lift', 'songwriter', 'hook', 8, 'chorus'),
    R('af.dynamics_arc', 'Dynamic section arcs', 'songwriter', 'form', 8, 'form'),
    R('af.repetition_build', 'Repetition builds tension', 'songwriter', 'hook', 7, 'chorus'),
  ],
  wayne_shorter: [
    R('shorter.chromatic_side', 'Chromatic side-slips and colour', 'songwriter', 'harmony', 8, 'verse'),
    R('shorter.irregular_phrase', 'Irregular phrase architecture', 'songwriter', 'form', 8, 'form'),
    R('shorter.melodic_angle', 'Angular melodic cells', 'songwriter', 'melody', 8, 'global'),
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
