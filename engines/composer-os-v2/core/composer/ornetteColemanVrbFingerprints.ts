/**
 * Ornette Coleman — harmolodic VoiceRuleBundle fingerprint receipts (`OC_*`).
 *
 * Grammar: independent lines on shared pulse; pitch field (not chord-scale);
 * harmolodic unison; democratic foreground/background; blues-inflected
 * melody; no fixed progression backbone. Corpus: The Shape of Jazz to Come,
 * Change of the Century, Free Jazz, Lonely Woman, Skies of America, Prime Time.
 */

export const ORNETTE_COLEMAN_VRF_FINGERPRINT_RECEIPTS = [
  // ---- policy (01–08) ----
  'OC_POLICY_01 — voiceId=ornette_coleman: harmolodic bundle; harmony/melody/rhythm/time/phrase treated as coequal; no permanent soloist/accompanist hierarchy.',
  'OC_POLICY_02 — harmonicRhythm=N/A posture: minChordDurationBars=0 / maxChordDurationBars=64; no bar-locked chord-cycle truth; pitch field + pulse grid govern material.',
  'OC_POLICY_03 — bassPolicy.role=melodic-floating: bass implies tonic area via steps, 4ths/5ths, recurring riffs — not a bar-by-bar functional progression.',
  'OC_POLICY_04 — melodicPolicy.contour=blues-field-free: lines draw from tune-local pitch field (blues/Dorian + chromatic tolerance); forbid chord-scale-per-bar mapping.',
  'OC_POLICY_05 — melodicPolicy.preferredIntervalSets=[1,2,3,4,5]: semitone, whole tone, minor third, major third, perfect fourth, perfect fifth as primary melodic IC budget.',
  'OC_POLICY_06 — formPolicy.narrativeArc=head-solos-head (early quartet default) with sectionRecallEnforced=false so head returns may be partial, displaced, or harmolodically transformed.',
  'OC_POLICY_07 — rhythmPolicy.antiMetric=false: global pulse (swing 8ths, straight 16ths, or Prime Time backbeat) never abandoned; melodic phrases float across barlines anyway.',
  'OC_POLICY_08 — orchestrationPolicy.allowCollectiveImprov=true: democratic ensemble + micro call/response; density envelopes cue transitions — not harmonic milestones.',

  // ---- harmolodic core (09–14) ----
  'OC_HARM_01 — Primary abstraction: harmolodic_head_line = ordered time–pitch contour; any instrument may state head, transposed head, contour-variant, or independent field-line on same grid.',
  'OC_HARM_02 — Global pulse grid: clear tempo/grouping (swing 4/4, funk 4/4, backbeat) without anchoring harmony to a fixed chord chart.',
  'OC_HARM_03 — Local pitch_field per tune/section: primary_tonic + default_scale (blues/Dorian + chromatic neighbours) + target_tones {♭3, 3, 5, ♭7} as high-emphasis blue anchors.',
  'OC_HARM_04 — chromatic_tolerance≈30%: occasional semitone/tritone approaches outside diatonic collection; no bar-locked chord spelling enforcement.',
  'OC_HARM_05 — ♭3 / natural 3 oscillation: register as micro-alteration / bend / neighbour motion — signature blues inflection marker inside the field.',
  'OC_HARM_06 — Forbid: fixed chord changes as sole spine; chord-scale mapping per bar; strict functional turnaround grammar as structural driver.',

  // ---- line autonomy + harmolodic unison (15–18) ----
  'OC_LINE_01 — Line autonomy: each voice applies its own melodic logic to the shared field; verticalities are emergent intersections, not pre-voiced changes.',
  'OC_LINE_02 — Harmolodic unison: multiple voices align start/end anchors while pitches spread via fixed transposition, interval transform, or slight rhythmic skew — "sensation of unison" not MIDI-unison.',
  'OC_LINE_03 — Democratic coordination: 0–2 foreground voices per time-slice (density + activity); role flip probability every 4–8 beats; no voice stays background across full 16 bars without foreground chance.',
  'OC_LINE_04 — leadership_weight heuristic: rises when others imitate a cell; decays when a strand goes static or drops out — social listening model, not chart reading.',

  // ---- bass + rhythm section (19–22) ----
  'OC_BASS_01 — Bass state machine {root_drone, walking, riffing, silence}: transitions driven by ensemble density and imitation cues — never a walking functional outline of preset changes.',
  'OC_RHY_01 — Early quartet drums: maintain swing pulse; swell fills at ensemble peaks; drop to thin ride/hi-hat during collective thins — phrase-following, not click-track.',
  'OC_RHY_02 — Melodic duration palette favours {8th, quarter, dotted quarter, triplet-8th cell}; irregular groupings over steady pulse; triplet/duple mixture encouraged.',
  'OC_RHY_03 — Phrase placement: pickups, offbeat entries, overlap across barlines; mean phrase length ≈2 bars with high variance (3–10 beats) — speech-like, not square 4-bar blocks.',

  // ---- melodic language (23–27) ----
  'OC_MEL_01 — Interval budget: ~40–50% ±1–2 scale steps; ~30–40% m3/M3/P4/P5; ≤10% >P5; emphasise quartal blues colour (P4/P5/m7); m9 leaps require immediate stepwise recovery.',
  'OC_MEL_02 — Seed motif 2–4 notes: develop via transposition, rhythmic displacement, interval twist, or immediate extension — "talking around an idea" vs long literal loops.',
  'OC_MEL_03 — Internal call-and-response inside one line: short question cell answered by altered echo in the same instrument before handoff to ensemble.',
  'OC_MEL_04 — Blues inflection required: ♭3, ♮3, ♭5 as colour targets; bent/approached arrivals from chromatic neighbour below/above.',
  'OC_MEL_05 — Phrase endings: taper into small-cell repetition or jump to contrasting idea; classical cadence not required.',

  // ---- ensemble models (28–31) ----
  'OC_ENS_01 — Free Jazz double-quartet model: two harmolodic pools share tempo/dynamic waves; occasional tutti hits / brief unisons; polytonality emerges from independent centres inside one field.',
  'OC_ENS_02 — Skies of America model: orchestral layers carry distinct pitch centres/transpositions; each layer = independent phrase contour; solo is another line — not chord+solo reduction.',
  'OC_ENS_03 — Prime Time model: locked syncopated 16th funk grid + backbeat 2/4; dual guitars/basses/drummers = dense polyrhythm; horns float or lock — groove spine without harmonic scheme.',
  'OC_ENS_04 — Collective improv density_zones {sparse, medium, dense}: global density must match zone; transitions via head fragment, bass riff, drum roll — not ii–V flags.',

  // ---- formal / work anchors (32–36) ----
  'OC_FORM_01 — through-composed-event-script (Free Jazz / large forms): top-level event list (tutti → solo A over bed → solo B → duo → tutti); internal lines stay harmolodic.',
  'OC_FORM_02 — Lonely Woman model: slow rubato melody over faster rhythmic undertow; A–A′–A″ returns preserve contour while varying intervals/rhythm; no chord progression spine.',
  'OC_FORM_03 — Shape / Change era: no comping pad imposing changes; drums+bass carry time; horns state songlike heads that seed the field for entire side.',
  'OC_FORM_04 — Prime Time formal loop: A establish groove+riffs → B long ensemble improv on same grid → C riff variation/breakdown; interest = layering/energy not harmonic contrast.',
  'OC_WORK_SKIES_01 — Skies of America: multi-section (21 movements) pitch-field + density plan per section; layered democratic lines throughout; no sonata teleology.',

  // ---- differentiators (37–42) ----
  'OC_DIFF_MONK_01 — vs Monk: forbid angular chord-tone pivoting + altered-dominant puzzle grammar; Coleman stays blues-field, songlike hooks, emergent verticals.',
  'OC_DIFF_COLTRANE_01 — vs Coltrane: forbid chord-cycle time-grid + sheets-of-sound scalar chains tied to changes; Coleman abandons progression backbone for shared pulse + field.',
  'OC_DIFF_WAYNE_01 — vs Wayne Shorter: forbid sophisticated pre-written non-functional progressions as spine; Coleman ambiguity from multiple autonomous centres + polytonal overlap.',
  'OC_DIFF_LACHENMANN_01 — vs Lachenmann: jazz sound world (swing/funk, sax/bass/drums); no noise-grammar-as-primary or pitch_role decoupled timbral form.',
  'OC_DIFF_REICH_GLASS_01 — vs Reich/Glass: forbid phase_shift/additive process as structure; repetition is social/oral-time variation — forbidAudibleProcessOperators=true on bundle.',
  'OC_DIFF_PROCESS_01 — "Process" = listening/reacting ensemble behaviour, not pre-notated mechanical phase or pattern growth operators.',

  'OC_PRIME_01 — Prime Time: horn lines may deliberately skew against 16th grid for blues talk; re-align to hits only at section seams or choreographed unison flares.',
] as const;

export type OrnetteColemanVrbFingerprintReceipt = (typeof ORNETTE_COLEMAN_VRF_FINGERPRINT_RECEIPTS)[number];
