/**
 * Structured Big Band rule registry (research-aligned ids; descriptions are short labels).
 */

import type {
  BigBandComposerId,
  BigBandEraId,
  BigBandRule,
  BigBandRuleRegistryShape,
} from './bigBandResearchTypes';

function R(
  id: string,
  description: string,
  category: BigBandRule['category'],
  effectType: BigBandRule['effectType'],
  priority: number
): BigBandRule {
  return { id, description, category, effectType, priority };
}

/** Thad Jones — shared rule rows for `thad` (alias) and `thad_jones` canonical id. */
const THAD_JONES_COMPOSER_RULES: BigBandRule[] = [
  R('thad_jones.extended_form', 'Extended forms with interludes/tags', 'composer', 'form', 80),
  R('thad_jones.solo_background_arc', 'Solo backgrounds evolve toward near-shout', 'composer', 'density', 82),
  R('thad_jones.voice_leading', 'Strong inner voice-leading', 'composer', 'harmony', 78),
  R('thad_jones.metric_tension', 'Metric tension near climaxes', 'composer', 'rhythm', 76),
  R('thad_jones.shout_sequence', 'Shout with sequences + harmonic shift', 'composer', 'form', 81),
];

/** Henry Threadgill — shared for `threadgill` alias and `henry_threadgill` canonical id. */
const HENRY_THREADGILL_COMPOSER_RULES: BigBandRule[] = [
  R('threadgill.brass_sparse', 'Brass sparse and punctuating — not continuous lead wallpaper', 'composer', 'orchestration', 84),
  R('threadgill.reed_interval_cells', 'Reeds carry interval-cell melodic material from active family pool', 'composer', 'harmony', 83),
  R('threadgill.episodic_density', 'Ensemble low–medium density with episodic blooms at module seams', 'composer', 'density', 82),
  R('threadgill.no_shout_saturation', 'No shout-chorus saturation — tutti unisons only as structural pillars', 'composer', 'form', 81),
  R('threadgill.polymodal_layers', 'Bass anchor and upper voices may occupy different modal areas', 'composer', 'harmony', 80),
];

/** Charles Mingus — shared for `mingus` alias and `charles_mingus` canonical id. */
const CHARLES_MINGUS_COMPOSER_RULES: BigBandRule[] = [
  R('mingus.episode_form', 'Episode sequences differ in tempo/texture/harmony/improv density', 'composer', 'form', 84),
  R('mingus.bass_authority', 'Bass introduces motives; substitute dominants independent of comping', 'composer', 'harmony', 83),
  R('mingus.collective_improv', 'Collective episodes: horns loose pitch-set; bass/drums hold form', 'composer', 'density', 82),
  R('mingus.texture_shock', 'Abrupt texture shifts bridged by bass ostinato/pedal', 'composer', 'form', 81),
  R('mingus.blues_gospel_axis', 'Blues/gospel axis through chromatic departures + functional recovery', 'composer', 'harmony', 80),
];

/** Billy Strayhorn — chromatic song-form / extended-tone fusion (distinct from Ellington). */
const STRAYHORN_COMPOSER_RULES: BigBandRule[] = [
  R(
    'strayhorn.compact_block',
    'CompactBlockRule: sustained closed-position block voicing as structural feature — sections within one octave below lead trumpet; baritone sax close to melodic line',
    'composer',
    'orchestration',
    84
  ),
  R(
    'strayhorn.sax_countermelody',
    'SaxCountermelodyRule: reed section thin independent contrapuntal countermelody at unison or near-unison — horizontal layer refracted from main melody',
    'composer',
    'orchestration',
    83
  ),
  R(
    'strayhorn.inner_voice_motion',
    'InnerVoiceMotionRule: accompaniment chords show semitone or whole-step inner voice motion between adjacent events at ≥45% rate — penalise static harmonic pads',
    'composer',
    'harmony',
    82
  ),
  R(
    'strayhorn.chromatic_harmony_rhythm',
    'ChromaticHarmonyRhythmRule: harmonic rhythm steady and song-governed with local chromatic intensification via planing, dominant chains, or tonic reinterpretation at phrase boundaries',
    'composer',
    'harmony',
    81
  ),
  R(
    'strayhorn.cross_section_blend',
    'CrossSectionBlendRule: voicings built across families not section blocks only — melody refracted with countermelody or close harmonic coloring',
    'composer',
    'orchestration',
    80
  ),
  R(
    'strayhorn.no_ellington_riff',
    'NoEllingtonRiffRule: suppress blues-riff repeated-figure writing, hard sectional character contrast, and dramatic-stop fragmentation',
    'composer',
    'form',
    85
  ),
];

/** John Surman — British folk-minimalist ECM; modal folk centers, dark reed lines, structural silence. */
const SURMAN_COMPOSER_RULES: BigBandRule[] = [
  R(
    'surman.folk_modal_harmony',
    'FolkModalHarmonyRule: harmony from Dorian/Mixolydian/pentatonic modal centers — no altered dominants or chromatic functional motion; modal center sustained across phrase spans',
    'composer',
    'harmony',
    87
  ),
  R(
    'surman.dark_reed_melody',
    'DarkReedMelodyRule: primary melodic voice in low reed register — baritone sax or bass clarinet weight; long introspective phrases; suppress bright upper-register leads',
    'composer',
    'melody',
    86
  ),
  R(
    'surman.minimalist_ostinato',
    'MinimalistOstinatoRule: rhythmic and melodic ostinato as structural device — gradual evolution preferred over variety; organic repetition not mechanical',
    'composer',
    'rhythm',
    85
  ),
  R(
    'surman.chamber_space',
    'ChamberSpaceRule: low ensemble density throughout — structural silence enforced; no tutti saturation; each phrase needs decay space',
    'composer',
    'density',
    84
  ),
  R(
    'surman.folk_phrase_contour',
    'FolkPhraseContourRule: melodic phrases shaped as folk-song arcs — stepwise motion, singable contour, modal leaps only (m3, P4, P5); no bebop fragmentation',
    'composer',
    'form',
    83
  ),
];

/** Ralph Towner — guitar-born polyphonic ECM; fingerstyle voicing, arpeggio melody, resonance architecture. */
const TOWNER_COMPOSER_RULES: BigBandRule[] = [
  R(
    'towner.guitar_born_harmony',
    'GuitarBornHarmonyRule: harmony from fingerstyle voicing logic — open-string spacing, classical independence, piano-informed extensions; not jazz-grip block chords; open strings ring across changes',
    'composer',
    'harmony',
    87
  ),
  R(
    'towner.melody_from_voicing',
    'MelodyFromVoicingRule: primary melody derived from arpeggio pattern or chord shape; contour inseparable from resonance; suppress separate lead-line-above-block-chord writing',
    'composer',
    'melody',
    86
  ),
  R(
    'towner.resonance_architecture',
    'ResonanceArchitectureRule: common tones preserved; overtone decay structural; silence after key events completes the phrase; do not fill all space',
    'composer',
    'density',
    85
  ),
  R(
    'towner.classical_counterpoint',
    'ClassicalCounterpointRule: independent bass against upper melody; middle strand implied; arpeggiation as linear composition; counterpoint by register — bass slower, upper more active',
    'composer',
    'harmony',
    84
  ),
  R(
    'towner.chamber_dialogue',
    'ChamberDialogueRule: ensemble as distributed chamber counterpoint; guitar as harmonic center but flexible role exchange; no strict soloist vs rhythm section split; dialogic not domineering',
    'composer',
    'form',
    83
  ),
];

/** Jan Garbarek — ritual modal ECM field; melody as invocation over sparse modal center. */
const JAN_GARBAREK_COMPOSER_RULES: BigBandRule[] = [
  R('garbarek.modal_field', 'ModalFieldRule: harmonic environment is a field not a progression — Dorian/Aeolian/Mixolydian/pentatonic centers held for extended spans; avoid functional ii–V–I', 'composer', 'harmony', 86),
  R('garbarek.drone_architecture', 'DroneArchitectureRule: bass and lower voices sustain pedal tones — walking bass is a hard fail; lyrical sustaining bass (Weber-influenced)', 'composer', 'harmony', 85),
  R('garbarek.line_protection', 'LineProtectionRule: during melody statements ensemble thins to max 2–3 voices; entries delayed until melody atmosphere established', 'composer', 'orchestration', 84),
  R('garbarek.ritual_percussion', 'RitualPercussionRule: percussion as textural color and ostinato — no swing ride grammar; light circular patterns', 'composer', 'rhythm', 82),
  R('garbarek.silence_enforcement', 'SilenceEnforcementRule: inter-phrase rests mandatory — minimum 12% phrase timeline in silence or sustained decay', 'composer', 'density', 83),
  R('garbarek.folk_motive', 'FolkMotiveRule: short nuclei (2–5 notes) recycled with variation; arch and descent contour preferred over through-composed development', 'composer', 'form', 81),
];

/** Bill Holman — chart-first linear counterpoint (lines generate harmony). */
const HOLMAN_COMPOSER_RULES: BigBandRule[] = [
  R(
    'holman.chart_first',
    'ChartFirstRule: generate all soli and ensemble voices as independent melodic lines before validating vertical harmony; reject voicings where any inner voice has no melodic logic',
    'composer',
    'harmony',
    86
  ),
  R(
    'holman.sax_soli',
    'SaxSoliRule: 5-voice sax soli primary textural statement in A sections; lead alto upper register, stepwise register descent, baritone bass support; each voice independent contour',
    'composer',
    'orchestration',
    85
  ),
  R(
    'holman.shout_chorus',
    'ShoutChorusRule: spread outer brass (high lead trumpet, low bass trombone) with mid-register inner cluster; reeds cushion below brass; linear voice leading at fortissimo',
    'composer',
    'orchestration',
    84
  ),
  R(
    'holman.countermelody',
    'CountermelodyRule: at least one inner voice carries independently singable counter-line against lead — real second melody not harmonic padding',
    'composer',
    'form',
    83
  ),
  R(
    'holman.voice_leading_gate',
    'VoiceLeadingGateRule: reject parallel 5ths/8ths; flag voice crossing and large inner leaps without resolution before soli commits',
    'composer',
    'harmony',
    87
  ),
  R(
    'holman.linear_harmony',
    'LinearHarmonyRule: accept unusual vertical sonorities when individual voice leading is smooth; do not normalise to nearest functional equivalent',
    'composer',
    'harmony',
    82
  ),
];

/** Eberhard Weber — bass-led harmonic field over sustained pedal axis. */
/** Lalo Schifrin — groove-native jazz-Latin film orchestration. */
const SCHIFRIN_COMPOSER_RULES: BigBandRule[] = [
  R(
    'schifrin.latin_percussion_grid',
    'LatinPercussionGridRule: percussion establishes and maintains clave-like subdivision — structural not decorative; interlocks bass ostinato and piano comping through all transitions',
    'composer',
    'rhythm',
    88
  ),
  R(
    'schifrin.brass_riff_engine',
    'BrassRiffEngineRule: brass as syncopated attack engine — unisons, clustered punches, cup-muted calls, trombone support; short attacks alternate held tension notes; climax by registral spread and density not romantic swell',
    'composer',
    'orchestration',
    87
  ),
  R(
    'schifrin.odd_meter_groove',
    'OddMeterGrooveRule: 5/4 and 7/8 signature meters — riff groupings make meter unmistakable; cross-rhythm by layering Latin percussion over straight orchestral ostinati',
    'composer',
    'rhythm',
    86
  ),
  R(
    'schifrin.string_color_support',
    'StringColorSupportRule: strings as color, momentum support, tremolo pressure, modal reinforcement — subordinate to percussion and brass rhetoric; urban groove-aware not pastoral lead',
    'composer',
    'orchestration',
    82
  ),
  R(
    'schifrin.modal_vamp_lock',
    'ModalVampLockRule: harmony locks to percussion grid in film mode — vamp fields over pedal points; chromatic planing, tritone dominant exchange, pedal upper-structure shifts',
    'composer',
    'harmony',
    85
  ),
  R(
    'schifrin.additive_tension',
    'AdditiveTensionRule: tension by additive layering — ostinato → percussion → brass → register expansion → altered dominant; release by thinning or riff-snap not cadential resolution',
    'composer',
    'density',
    84
  ),
];

const OGERMAN_COMPOSER_RULES: BigBandRule[] = [
  R(
    'ogerman.string_continuum',
    'StringContinuumRule: strings carry harmonic argument, registral shading, and counterpoint — divided 4–6 layers; moving middles required',
    'composer',
    'orchestration',
    87
  ),
  R(
    'ogerman.inner_voice_motion',
    'InnerVoiceMotionRule: 2+ inner voices move by step or semitone across harmonic changes; block pad unanimity penalised',
    'composer',
    'harmony',
    86
  ),
  R(
    'ogerman.brass_episodic',
    'BrassEpisodicRule: brass architectural and episodic — enters at formal climaxes only; coloristic wind doublings over power brass',
    'composer',
    'orchestration',
    84
  ),
  R(
    'ogerman.climax_accumulation',
    'ClimaxAccumulationRule: climax by register accumulation and pedal tension over 8–32 bars — not brass punch or functional cadential release',
    'composer',
    'density',
    85
  ),
  R(
    'ogerman.orchestra_relation',
    'OrchestraRelationRule: orchestra rotates veil/echo/commentary every 8–16 bars; static background beyond 8 bars penalised',
    'composer',
    'form',
    83
  ),
  R(
    'ogerman.cyclic_cell',
    'CyclicCellRule: harmonic spans from 3-chord cyclic cells; return to cell rather than resolving functionally',
    'composer',
    'harmony',
    86
  ),
];

const MANDEL_COMPOSER_RULES: BigBandRule[] = [
  R(
    'mandel.melody_forward',
    'MelodyForwardRule: primary melody drives harmonic language; lands on extensions at strong points; 4–8 bar lyrical arcs; conjunct with expressive leaps at peaks',
    'composer',
    'harmony',
    86
  ),
  R(
    'mandel.inner_voice_warmth',
    'InnerVoiceWarmthRule: semitone/whole-step inner motion at most chord changes; common tones retained; contrary/oblique to melody — precision warmth not orchestral mass',
    'composer',
    'harmony',
    85
  ),
  R(
    'mandel.borrowed_minor',
    'BorrowedMinorRule: borrowed iv-minor inflection as structural warmth device embedded in progression — not decorative',
    'composer',
    'harmony',
    83
  ),
  R(
    'mandel.warm_brass',
    'WarmBrassRule: brass as chorale/cushion/pad; rounded attack by voicing/register; mid-register bias; suppress punchy unison stabs',
    'composer',
    'orchestration',
    84
  ),
  R(
    'mandel.orchestra_framing',
    'OrchestraFramingRule: orchestra frames soloist; selective countermelodies; dense continuous commentary penalised; tuttis as formal support',
    'composer',
    'orchestration',
    82
  ),
  R(
    'mandel.softened_cadence',
    'SoftenedCadenceRule: resolve clearly but arrive on 6/9 or extended tonic; plain triad tonic arrival penalised; inner extensions retained at endings',
    'composer',
    'harmony',
    85
  ),
];

const WEBER_COMPOSER_RULES: BigBandRule[] = [
  R(
    'weber.bass_foreground',
    'BassForegroundRule: bass central in register and compositional function — foreground voice not support (target 0.85)',
    'composer',
    'orchestration',
    86
  ),
  R(
    'weber.keyboard_plane',
    'KeyboardPlaneRule: keyboards and strings create harmonic planes not comping changes (target 0.70)',
    'composer',
    'harmony',
    84
  ),
  R(
    'weber.wind_line_length',
    'WindLineLengthRule: winds draw long melodic trajectories across static or slowly shifting support (target 0.72)',
    'composer',
    'form',
    83
  ),
  R(
    'weber.drum_color',
    'DrumColorRule: low swing-ride obligation — drums as color, texture, pulse-flex not swing driver (target 0.15)',
    'composer',
    'rhythm',
    81
  ),
  R(
    'weber.resonant_silence',
    'ResonantSilenceRule: rests expose tail resonance not break time — silenceWeighting resonant_structural',
    'composer',
    'density',
    82
  ),
  R(
    'weber.pedal_field',
    'PedalFieldRule: one bass pitch or two-pitch axis 4–12 bars while upper color clusters refresh every 2–4 bars',
    'composer',
    'harmony',
    85
  ),
];

/** Carla Bley — formal irony: legible topics reframed by deadpan presentation. */
const CARLA_BLEY_COMPOSER_RULES: BigBandRule[] = [
  R(
    'bley.topic_staging',
    'TopicStagingRule: sections open with a clearly legible style-topic (hymn, march, cabaret, ballad, chamber dance) detectable within 4 bars with distinct instrumentation signature',
    'composer',
    'form',
    86
  ),
  R(
    'bley.reprise_reframing',
    'RepriseReframingRule: when material returns at least one domain strongly altered — orchestration, register, harmonic support, tempo feel, or bar extension; pure literal reprise fails',
    'composer',
    'form',
    85
  ),
  R(
    'bley.climax_deflation',
    'ClimaxDeflationRule: every major orchestral build followed within 4 bars by 40%+ density reduction, pause, plain tonic-family landing, or comic thin scoring',
    'composer',
    'density',
    84
  ),
  R(
    'bley.deadpan_cadence',
    'DeadpanCadenceRule: major phrase endings avoid full-density root-confirming emotionally affirmative closure in ≥60% of cadential events',
    'composer',
    'harmony',
    83
  ),
  R(
    'bley.quotation_window',
    'QuotationWindowRule: brief idiomatic reference (march, hymn, cabaret, tango, church, fanfare) at 5–15% duration; quotation is comment not development',
    'composer',
    'form',
    82
  ),
  R(
    'bley.low_gloss_orchestration',
    'LowGlossOrchestrationRule: suppress continuous atmospheric pad writing; sustained bloom over 8 consecutive bars requires formal justification',
    'composer',
    'orchestration',
    81
  ),
];

const composerRules: Record<BigBandComposerId, BigBandRule[]> = {
  ellington: [
    R('ellington.counterpoint_density', '≥2 independent lines when not thin', 'composer', 'density', 82),
    R('ellington.intro_color', 'Small ensemble intros; avoid full-band hits', 'composer', 'orchestration', 74),
    R('ellington.melody_counter', 'Melody + countermelody/obbligato', 'composer', 'orchestration', 80),
    R('ellington.motive_tags', 'Motive IDs and transformed reappearance', 'composer', 'form', 78),
    R('ellington.shout_derive', 'Shout lead from earlier motives', 'composer', 'form', 79),
    R('ellington.elastic_time', 'Rhythm section timing variance', 'composer', 'rhythm', 71),
  ],
  strayhorn: STRAYHORN_COMPOSER_RULES,
  basie: [
    R('basie.riff_core', 'Recurring 1–2 bar riff in head/backgrounds', 'composer', 'form', 85),
    R('basie.sparse_baseline', 'Baseline low density: one horn line + rhythm', 'composer', 'density', 83),
    R('basie.riff_stack', 'Density via riff stacking across sections', 'composer', 'density', 81),
    R('basie.functional_harmony', 'Mostly functional harmony', 'composer', 'harmony', 72),
    R('basie.shout_homophony', 'Shout homophony + earlier riff reuse', 'composer', 'orchestration', 84),
    R('basie.piano_reactive_density', 'Piano comp density reacts to horn lead — sparse stabs unless answering figures', 'composer', 'density', 82),
    R('basie.sax_soli_drop2', 'Sax soli: four-way close / drop-2 spreads with dim7 passing tones', 'composer', 'orchestration', 81),
    R('basie.call_response_equal', 'Call-and-response balanced durations — affirmation vs imitation; response density matches or decreases', 'composer', 'form', 79),
    R('basie.basie_button_cadence', 'Basie Button cadential grammar — ii–dim–I6/9 closure with static upper voices', 'composer', 'harmony', 80),
    R('basie.old_new_testament', 'Old Testament riff-forward KC groove vs New Testament Ne‑He‑Hi orchestral precision', 'composer', 'form', 77),
  ],
  thad_jones: THAD_JONES_COMPOSER_RULES,
  thad: THAD_JONES_COMPOSER_RULES,
  charles_mingus: CHARLES_MINGUS_COMPOSER_RULES,
  mingus: CHARLES_MINGUS_COMPOSER_RULES,
  henry_threadgill: HENRY_THREADGILL_COMPOSER_RULES,
  threadgill: HENRY_THREADGILL_COMPOSER_RULES,
  wayne_shorter: [
    R('wayne.lateral_root', 'Modal plateaus + lateral dominants without ii–V wallpaper', 'composer', 'harmony', 81),
    R('wayne.section_colour_turn', 'Orchestral colour turns at phrase seams', 'composer', 'orchestration', 79),
    R('wayne.metric_float', 'Elastic phrase placement vs rigid riff grid', 'composer', 'rhythm', 77),
    R('wayne.counter_line_peak', 'Counter-lines bloom toward climax without shout cliché', 'composer', 'density', 78),
    R('wayne.development_arc', 'Small-cell development across sections', 'composer', 'form', 80),
  ],
  schneider: [
    R('schneider.through_composed', 'Through-composed form graph', 'composer', 'form', 79),
    R('schneider.texture_density', 'Density from texture layers not player count', 'composer', 'density', 86),
    R('schneider.ostinato', 'Ostinato under changing top lines', 'composer', 'rhythm', 77),
    R('schneider.groove_switch', 'Groove type may change mid-piece', 'composer', 'rhythm', 73),
    R('schneider.climax_counterpoint', 'Climax: layered counter-lines over riff-shout', 'composer', 'orchestration', 84),
  ],
  wheeler: [
    R('wheeler.brass_blend', 'BrassBlendRule: flugelhorn/trombone/trumpet blend; forbid Basie punch unisons except rare contrast', 'composer', 'orchestration', 84),
    R('wheeler.woodwind_halo', 'WoodwindHaloRule: flute/clarinet sustain 9/#11/maj7/13 above brass at 0.55–0.70 — not root doublings', 'composer', 'orchestration', 83),
    R('wheeler.register_separation', 'RegisterSeparationRule: 10th–15th gap bass floor to upper colour stack; leave middle register porous', 'composer', 'density', 82),
    R('wheeler.cross_section_voicing', 'CrossSectionVoicingRule: voicings across families — lead trumpet/alto, inner clarinet/trombone, bass separate', 'composer', 'harmony', 81),
    R('wheeler.bloom_not_slam', 'BloomNotSlamRule: crescendi bloom into sonority — soft attack, long decay, no accented tutti hits', 'composer', 'form', 80),
    R('wheeler.silence_architecture', 'SilenceArchitectureRule: every 8–16 bars one thinning event — 1–4 voices, sustained tail, or ensemble breath', 'composer', 'density', 79),
    R('wheeler.no_terminal_triad', 'NoTerminalTriadRule: final bars avoid root-position tonic triad — prefer 6/9, maj7(add9), sus, slash upper-structure', 'composer', 'harmony', 85),
  ],
  garbarek: JAN_GARBAREK_COMPOSER_RULES,
  jan_garbarek: JAN_GARBAREK_COMPOSER_RULES,
  surman: SURMAN_COMPOSER_RULES,
  john_surman: SURMAN_COMPOSER_RULES,
  surman_folk_modal: SURMAN_COMPOSER_RULES,
  towner: TOWNER_COMPOSER_RULES,
  ralph_towner: TOWNER_COMPOSER_RULES,
  towner_guitar_polyphony: TOWNER_COMPOSER_RULES,
  bill_holman: HOLMAN_COMPOSER_RULES,
  holman: HOLMAN_COMPOSER_RULES,
  carla_bley: CARLA_BLEY_COMPOSER_RULES,
  bley: CARLA_BLEY_COMPOSER_RULES,
  weber: WEBER_COMPOSER_RULES,
  eberhard_weber: WEBER_COMPOSER_RULES,
  weber_field: WEBER_COMPOSER_RULES,
  ogerman: OGERMAN_COMPOSER_RULES,
  claus_ogerman: OGERMAN_COMPOSER_RULES,
  ogerman_continuum: OGERMAN_COMPOSER_RULES,
  mandel: MANDEL_COMPOSER_RULES,
  johnny_mandel: MANDEL_COMPOSER_RULES,
  mandel_lyric_warmth: MANDEL_COMPOSER_RULES,
  schifrin: SCHIFRIN_COMPOSER_RULES,
  lalo_schifrin: SCHIFRIN_COMPOSER_RULES,
  schifrin_groove: SCHIFRIN_COMPOSER_RULES,
  /** Quincy Jones — LA studio punch / crossover pop–jazz / tight rhythm-section locks. */
  quincy_jones: [
    R('quincy_jones.tight_brass', 'Brass punches locked to rhythm-section kicks & backbeats', 'composer', 'orchestration', 84),
    R('quincy_jones.crossover_harmony', 'Pop vocal hooks over jazz extensions (9/13/sus) without mud', 'composer', 'harmony', 82),
    R('quincy_jones.rhythm_precision', 'Rhythm-section pocket — articulated kicks; minimal drift vs grid', 'composer', 'rhythm', 83),
    R('quincy_jones.call_response', 'Call-and-response: brass/reeds vs rhythm hits or guitar comps', 'composer', 'form', 81),
    R('quincy_jones.section_trade', 'Section trades (saxes ↔ trombones ↔ trumpets) with registral clarity', 'composer', 'orchestration', 80),
    R('quincy_jones.shout_stack', 'Shout choruses via layered stacks — staged dynamics not constant tutti', 'composer', 'density', 82),
    R('quincy_jones.orchestral_bridge', 'Orchestral bridge lifts — dominant prolongation / pad handoffs', 'composer', 'harmony', 79),
    R('quincy_jones.groove_first', 'Groove-first reductions before orchestral peaks', 'composer', 'form', 78),
  ],
  sebesky: [
    R('sebesky.groove_first', 'GrooveFirstRule: rhythm section stable pulse ≥70% post-intro; orchestra floats above', 'composer', 'rhythm', 86),
    R('sebesky.string_usage', 'StringUsageRule: strings/harp >50% bars — pad, double, swell, transition support', 'composer', 'orchestration', 84),
    R('sebesky.harp_gloss', 'HarpGlossRule: harp at sectional seams and pre-lift — not constant wallpaper', 'composer', 'orchestration', 78),
    R('sebesky.brass_arrival', 'BrassArrivalRule: brightest brass at crowns; mid-form reinforcement only', 'composer', 'orchestration', 82),
    R('sebesky.sectional_architecture', 'SectionalArchitectureRule: 4–6 discrete sections with role change; intro texture ≤8 bars', 'composer', 'form', 83),
    R('sebesky.climax_builder', 'ClimaxBuilderRule: tiered strings → brass/reeds → tutti; discrete production lifts', 'composer', 'density', 85),
    R('sebesky.orchestra_answer', 'OrchestraAnswerRule: 2–4 bar ensemble answers after solo phrases', 'composer', 'form', 80),
    R('sebesky.center_fill', 'CenterFillRule: mid-register filled at tutti; ECM registral porosity hard fail', 'composer', 'density', 84),
  ],
  gil_evans: [
    // TODO: deprecated — now parsed from BigBandResearch.md
    R('gil_evans.colour_field', 'Harmonic colour fields over sparse rhythm hooks', 'composer', 'harmony', 83),
    R('gil_evans.mid_register_blend', 'Mid-register blends; avoid shout-default brass peaks', 'composer', 'orchestration', 80),
    R('gil_evans.intro_small_group', 'Small-group intros / instrumental subset colours', 'composer', 'form', 77),
    R('gil_evans.elastic_time', 'Flexible phrase placement vs strict riff grid', 'composer', 'rhythm', 78),
    R('gil_evans.modal_side_slip', 'Modal prolongation with occasional side-step colour', 'composer', 'harmony', 79),
  ],
  bob_brookmeyer: [
    // TODO: deprecated — now parsed from BigBandResearch.md
    R('brookmeyer.counter_lines', 'Multiple simultaneous independent lines when dense', 'composer', 'orchestration', 84),
    R('brookmeyer.quartal_colour', 'Quartal/quintal harmonic stacks as structural colour', 'composer', 'harmony', 82),
    R('brookmeyer.section_takeover', 'Section-to-section line handoffs (linear narrative)', 'composer', 'form', 79),
    R('brookmeyer.metric_shift', 'Metric displacement near peaks (controlled)', 'composer', 'rhythm', 76),
    R('brookmeyer.balance_dense_clear', 'Dense voicings with registral clarity', 'composer', 'density', 81),
  ],
  clare_fischer: [
    R('fischer.dense_voicing', 'Dense tertian/cluster voicing vocabulary', 'composer', 'harmony', 85),
    R('fischer.latin_groove_coupling', 'Rhythm-section groove couples to harmonic rhythm', 'composer', 'rhythm', 80),
    R('fischer.inner_voice_lead', 'Active inner-voice motion under sustained tops', 'composer', 'orchestration', 83),
    R('fischer.section_colour_turn', 'Harmonic colour turns at section boundaries', 'composer', 'form', 78),
    R('fischer.controlled_density', 'Orchestral density via harmony weight not player spam', 'composer', 'density', 82),
  ],
  oliver_nelson: [
    // TODO: deprecated — now parsed from BigBandResearch.md
    R('nelson.blues_functional', 'Blues-functional backbone with arranged extensions', 'composer', 'harmony', 81),
    R('nelson.section_contrast', 'Contrasting sections via orchestration register', 'composer', 'orchestration', 80),
    R('nelson.chart_economy', 'Economical fills; intentional punches vs wallpaper', 'composer', 'density', 79),
    R('nelson.swing_authority', 'Swing authority on primary phrases', 'composer', 'rhythm', 77),
    R('nelson.head_soli_shout', 'Classic head–solos–shout dramaturgy', 'composer', 'form', 78),
  ],
  sammy_nestico: [
    R('nestico.chart_tight', 'Reading-chart clarity; tidy phrase corners', 'composer', 'form', 84),
    R('nestico.kick_figure', 'Rhythm-section kicks aligned to brass hits', 'composer', 'rhythm', 83),
    R('nestico.riff_punch', 'Short riff punches vs sustained pads', 'composer', 'density', 82),
    R('nestico.functional_clarity', 'Strong functional harmony with Basie-era clarity', 'composer', 'harmony', 80),
    R('nestico.section_purity', 'Clean sectional roles (reeds vs brass responsibilities)', 'composer', 'orchestration', 81),
  ],
};

const eraRules: Record<BigBandEraId, BigBandRule[]> = {
  swing: [
    R('swing.form_templates', '12/32-bar templates; chorus structure', 'era', 'form', 70),
    R('swing.steady_groove', 'Steady swing groove', 'era', 'rhythm', 75),
    R('swing.functional_harmony', 'Functional harmony limits', 'era', 'harmony', 68),
    R('swing.parallel_soli', 'Parallel section harmonisation', 'era', 'orchestration', 66),
    R('swing.shout_placement', 'Shout ~2/3 form', 'era', 'form', 72),
    R('swing.not_overdense', 'Chorus density alternation', 'era', 'density', 67),
  ],
  bebop: [
    R('bebop.complex_forms', 'Bebop forms / rhythm changes', 'era', 'form', 74),
    R('bebop.line_language', 'Chromatics, enclosures, substitutions', 'era', 'harmony', 80),
    R('bebop.brass_punctuation', 'Brass punctuate vs long riffs', 'era', 'orchestration', 71),
    R('bebop.high_syncopation', 'Dense syncopation comp', 'era', 'rhythm', 76),
    R('bebop.line_architecture', 'Line-driven vs riff loops', 'era', 'form', 82),
  ],
  post_bop: [
    R('post.extended_climax', 'Architected climaxes', 'era', 'form', 73),
    R('post.side_step', 'Side-steps / poly-chords', 'era', 'harmony', 77),
    R('post.inner_motion', 'Active inner parts', 'era', 'density', 75),
    R('post.cross_section', 'Cross-section voicing maps', 'era', 'orchestration', 76),
  ],
  contemporary: [
    R('contemp.long_form', 'Long-form / multi-section', 'era', 'form', 70),
    R('contemp.texture_density', 'Texture-led density', 'era', 'density', 78),
    R('contemp.modal_fields', 'Modal / non-functional fields', 'era', 'harmony', 72),
    R('contemp.meter_flex', 'Mixed meters / ostinati', 'era', 'rhythm', 74),
  ],
  cool_jazz: [
    R('cool.lighter_extensions', 'Lighter extensions; open voicings', 'era', 'harmony', 73),
    R('cool.modal_hints', 'Modal colour; sparse brass hits', 'era', 'harmony', 71),
    R('cool.mid_register', 'Mid-register blend emphasis', 'era', 'orchestration', 69),
    R('cool.phrase_space', 'Phrase space / less dense fills', 'era', 'density', 70),
  ],
  hard_bop: [
    R('hard_bop.blues_gospel', 'Blues/gospel inflection in lines', 'era', 'harmony', 75),
    R('hard_bop.altered_dominants', 'Altered dominants in turnarounds', 'era', 'harmony', 77),
    R('hard_bop.riff_line_mix', 'Riff stacks vs line peaks', 'era', 'density', 72),
    R('hard_bop.shout_drive', 'Shout sections with rhythmic drive', 'era', 'rhythm', 74),
  ],
  fusion: [
    R('fusion.modal_vamps', 'Modal vamps / static harmony fields', 'era', 'harmony', 74),
    R('fusion.electric_colour', 'Electric rhythm-section colour', 'era', 'orchestration', 71),
    R('fusion.groove_pocket', 'Groove pocket / backbeat clarity', 'era', 'rhythm', 76),
    R('fusion.layered_lines', 'Layered lines over ostinato', 'era', 'density', 73),
  ],
};

const foundationalRules: BigBandRule[] = [
  R('found.swing_grid', '4-beat grid + walking bass in swing modes', 'foundational', 'rhythm', 60),
  R('found.triplet_feel', 'Triplet-based horn subdivisions', 'foundational', 'rhythm', 58),
  R('found.space', 'Space between busy figures', 'foundational', 'density', 62),
  R('found.functional_tag', 'Tag sections functional/modal/non-functional', 'foundational', 'harmony', 59),
  R('found.bebop_alter', 'Altered dominants when bebop/post-bop', 'foundational', 'harmony', 61),
];

const functionalRules = {
  shout: [
    R('func.shout.position', 'Shout ~60–75% form', 'shout', 'form', 77),
    R('func.shout.contrast', 'Higher density than preceding', 'shout', 'density', 79),
    R('func.shout.motive', 'Reuse prior motive in shout', 'shout', 'form', 76),
  ],
  riff: [
    R('func.riff.window', '1–2 bar motif windows', 'riff', 'form', 72),
    R('func.riff.grid', 'Lock to groove grid', 'riff', 'rhythm', 74),
    R('func.riff.layers', 'Limit simultaneous riff layers', 'riff', 'density', 73),
  ],
  soli: [
    R('func.soli.lead', 'Single lead then harmonise', 'soli', 'orchestration', 75),
    R('func.soli.range', 'Respect ranges / octave adjust', 'soli', 'orchestration', 70),
  ],
};

export const BIG_BAND_RULE_REGISTRY: BigBandRuleRegistryShape = {
  composerRules,
  eraRules,
  foundationalRules,
  functionalRules,
};

export function allRuleIdsFromRegistry(): Set<string> {
  const s = new Set<string>();
  for (const r of foundationalRules) s.add(r.id);
  for (const g of Object.values(composerRules)) for (const r of g) s.add(r.id);
  for (const g of Object.values(eraRules)) for (const r of g) s.add(r.id);
  for (const r of functionalRules.shout) s.add(r.id);
  for (const r of functionalRules.riff) s.add(r.id);
  for (const r of functionalRules.soli) s.add(r.id);
  return s;
}
