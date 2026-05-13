/**
 * Helmut Lachenmann — SQ VRB noise-gesture-grammar entry.
 * Musique concrète instrumentale: noise/gesture as primary grammar;
 * pitch decoupled from structural role; energy + sound_type +
 * gesture_profile + technique parameter spaces replace chord/key
 * grammar. Reference vocabulary: LC_* receipts. Anchored in
 * Gran Torso (1971/88), Reigen seliger Geister (1989), Grido (2001).
 */

export const LACHENMANN_SQ_VRF_FINGERPRINT_RECEIPTS = [
  'LC_POLICY_01 — voiceId=lachenmann: SQ VRB noise-grammar entry; musique concrète instrumentale; technique parameter spaces replace chord/key grammar.',
  'LC_POLICY_02 — harmonicRhythm: not applicable (sound-type-based not chord-based); minChordDurationBars 0 / maxChordDurationBars 64 used only as duration cap on fields.',
  'LC_POLICY_03 — bassPolicy.role=noise-field: no structural bass; Vc participates in sound_type distribution like any other voice.',
  'LC_POLICY_04 — melodicPolicy.contour=gesture-physical: pitch_role ∈ {none, approximate, precise} with Gran Torso=none/approximate, Reigen=approximate, Grido=pockets of precise tonklang.',
  'LC_POLICY_05 — formPolicy.narrativeArc=through-composed-noise-grammar: form = sound_type trajectory + energy arc; no recap, no thematic return required.',
  'LC_POLICY_06 — rhythmPolicy.antiMetric=true: time_state=measured_free — precise notated durations with no perceptible stable beat required; meter is alignment, not groove.',
  'LC_POLICY_07 — soundTypeGrammarEnabled=true: events tagged with sound_type ∈ {fließklang, geräuschklang, druckklang, tonklang, impulsklang}; trajectory across these types is the primary formal logic.',
  'LC_POLICY_08 — pitchRoleDecoupled=true: pitch is one dimension among many; noise is not exceptional but part of the continuous sound space.',
  'LC_POLICY_09 — noSemanticOverlay=true: no extra-musical program / numerology / quotation as symbolic anchor; techniques themselves are the grammar.',

  'LC_PARAM_01 — Primary structural parameters per event: sound_type, energy_level (ppp→fff continuous), gesture_profile ∈ {sustained, impulse, scrape, tremor, burst}, pitch_role ∈ {none, approximate, precise}, technique_bundle.',
  'LC_PARAM_02 — sound_type derives from technique_bundle combination; a single event may carry multi-label technique tags (e.g. sul_pont + overpressure + tremolo = druckklang).',
  'LC_PARAM_03 — gesture_profile interacts with sound_type: sustained ↔ fließklang/druckklang/tonklang; impulse/burst ↔ impulsklang/geräuschklang; scrape/tremor ↔ geräuschklang/druckklang.',

  'LC_KLANG_FLIESS_01 — fließklang (flow-sound): continuous soft friction; sul ponticello/tasto with noise components; broadband noise spectrum with partials; long duration, low-definition attack; function = background fields / slow energy build; technique_bundle {sul_pont OR sul_tasto, light_pressure, slow_bow}.',
  'LC_KLANG_GERAUSCH_01 — geräuschklang (pure noise-sound): mostly unpitched; behind-bridge bowing, body bowing, col legno battuto, overpressure hiss, taps, knocks; short impulses or noisy bursts; attack-rich; function = scraping/pressing textures (Gran Torso) and whoosh/gas sounds (Reigen); technique_bundle {behind_bridge OR body_bow OR col_legno_battuto, overpressure OR tap}.',
  'LC_KLANG_DRUCK_01 — druckklang (pressure-sound): extreme bow pressure + slow bow → compressed distorted sound; partial pitch + heavy noise; continuous but unstable; function = energy peaks; may layer with fließklang; technique_bundle {overpressure, any_contact_point, slow_bow}.',
  'LC_KLANG_TON_01 — tonklang (tone-sound / colour-tone): more conventional pitched harmonic or stopped tone; altered timbre (bridge position, no vibrato); pitch_role=precise; sparing in Gran Torso, re-emerges in Grido; function = "emergent tonality" moments / reference points in noise; technique_bundle {normal_bow_position, light_pressure, harmonics}.',
  'LC_KLANG_IMPULS_01 — impulsklang (impulse/percussive sound): short attack (snap pizz, slap, knock, col legno hit); very short duration; high attack energy; function = punctuation / rhythmic patterns / structural markers; technique_bundle {snap_pizz OR col_legno_battuto OR body_tap, high_attack_energy}.',

  'LC_TRAJECTORY_01 — sound-type trajectory = primary formal logic; low tension = fließklang + soft tonklang + low energy; build = druckklang + more impulsklang; peak = dense geräuschklang + druckklang at max energy; release = thin fließklang or near-silence.',
  'LC_TRAJECTORY_02 — Section boundaries triggered by: new technique introduction, density change, register-span shift, or field-type change (sustained → impulsive).',

  'LC_TECH_BOW_01 — sul_pont_extreme: near/onto bridge; bright noisy whistling; primary fließklang/geräuschklang ingredient.',
  'LC_TECH_BOW_02 — sul_tasto_extreme: over fingerboard; airy breath-like; fließklang ingredient.',
  'LC_TECH_BOW_03 — behind_bridge: bowing between bridge and tailpiece; very high brittle noise; geräuschklang ingredient.',
  'LC_TECH_BOW_04 — overpressure: bow too hard → druckklang; distorted partial; energy-peak ingredient.',
  'LC_TECH_BOW_05 — body_bow: bowing on wood surfaces (upper bout, ribs, neck, tailpiece) → unpitched friction noise; geräuschklang ingredient.',

  'LC_TECH_STROKE_01 — col_legno_battuto: hit with wood of bow; percussive unpitched impulsklang.',
  'LC_TECH_STROKE_02 — col_legno_tratto: bowed with wood of bow; gritty friction geräuschklang.',
  'LC_TECH_STROKE_03 — ricochet_non_standard: jeté-like stroke on non-string surface; hybrid impulsklang/geräuschklang.',
  'LC_TECH_STROKE_04 — whoosh_stroke: soft low-pressure sweep; Reigen primary gesture (silence-adjacent).',

  'LC_TECH_LHPIZZ_01 — snap_pizzicato: extreme snap onto fingerboard (Bartók-style but as noise not note); impulsklang.',
  'LC_TECH_LHPIZZ_02 — left_hand_pizz: left-hand pluck or tap; impulsklang ingredient.',
  'LC_TECH_LHPIZZ_03 — body_tap: tapping on strings and instrument body; impulsklang ingredient.',
  'LC_TECH_LHPIZZ_04 — harmonic_destabilised: harmonics with non-standard bow pressure/location → unstable pitch; fließklang/tonklang hybrid.',

  'LC_TECH_PERC_01 — wood_knock: knocking on body, ribs, pegs; impulsklang.',
  'LC_TECH_PERC_02 — fingernail_scratch: scratching with fingernail or bow screw; geräuschklang.',
  'LC_TECH_PERC_03 — string_slap: muted string slapped against fingerboard; no clear pitch; impulsklang ingredient.',

  'LC_TECH_COMBO_01 — A single event may carry multiple technique labels; sound_type is derived from the combination, not chosen independently.',
  'LC_TECH_COMBO_02 — sul_pont + overpressure + tremolo = druckklang; behind_bridge + high_attack = geräuschklang; harmonic_destabilised + soft_pressure = fließklang/tonklang.',
  'LC_TECH_COMBO_03 — Per section define energy_band + allowed technique set; transitions with large energy leaps must change ≥1 of {sound_type, technique, register, dynamic}.',

  'LC_ROLE_01 — Per section role ∈ {lead_gesture, background_field, impulse_layer}; any instrument may hold any role; no default melody/bass mapping.',
  'LC_ROLE_GRAN_TORSO_01 — Gran Torso: similar gestures distributed across all four voices (swarm distribution); coordinated_field is primary ensemble_relation.',
  'LC_ROLE_REIGEN_01 — Reigen seliger Geister: voices answer each other with similar textures (dance call-and-response); independent_streams allowed in episode interiors.',
  'LC_ROLE_GRIDO_01 — Grido: clearer leading vs supporting roles; pitch re-emerges in upper voices more often; contrasted_layers allowed at tonklang pillars.',

  'LC_NOISE_VL_01 — Noise voice-leading = parameter continuity: contact_point(t), pressure(t), motion_type(t) shift gradually along their continuous axes.',
  'LC_NOISE_VL_02 — Legal noise voice-leading uses small continuous parameter changes; structural cuts are large parameter jumps between events.',
  'LC_NOISE_VL_03 — Motion-type transitions: sustained → tremolo → scrape may chain within a single sustained event without re-attack.',

  'LC_ENSEMBLE_REL_01 — ensemble_relation=coordinated_field: same sound_type distributed across parts, staggered not simultaneous (Gran Torso primary).',
  'LC_ENSEMBLE_REL_02 — ensemble_relation=contrasted_layers: different sound_types with complementary energy (e.g. fließklang upper + impulsklang lower).',
  'LC_ENSEMBLE_REL_03 — ensemble_relation=independent_streams: each voice runs its own parameter curves with minimal synchronisation (Reigen episodes).',

  'LC_REGISTER_01 — Register-extreme events are structural only when combined with high energy OR a novel technique combination; register alone is secondary to sound_type.',
  'LC_REGISTER_02 — Extreme high: sul_pont_extreme or behind_bridge harmonics; extreme low: overpressure druckklang or body_bow.',

  'LC_TIME_01 — time_state=measured_free: precise notated durations; no perceptible stable beat required; meter for alignment, not groove.',
  'LC_TIME_02 — Gran Torso largely non-metric feel; Reigen more dance-like periodicities under noise; Grido clearer temporal articulations still non-groove.',

  'LC_GESTURE_01 — single_impulse: isolated knock/snap/scratch followed by silence.',
  'LC_GESTURE_02 — short_group: 2–5 impulses clustered, separated by fließklang.',
  'LC_GESTURE_03 — long_mass: sustained fließklang or druckklang internally modulated by parameter drift.',
  'LC_GESTURE_04 — burst: sudden high-density accumulation of impulses or druckklang; energy spike.',

  'LC_DENSITY_01 — density(t) curve per section: Gran Torso = multiple smaller waves of accumulation/dissipation; Reigen = circular dance episodes with recurring gesture complexes; Grido = larger arcs with tonklang pillars framing noise fields.',
  'LC_DENSITY_02 — Density envelopes are the formal axes that replace harmonic rhythm.',

  'LC_SILENCE_01 — silence_window: full rests or ultra-pp fließklang required at form joints and after energy peaks.',
  'LC_SILENCE_02 — Silence is a structural element, not background: treat with equal formal weight to sound events.',
  'LC_SILENCE_03 — Reigen near-silence whoosh = primary "silence-adjacent" material; not equivalent to general rest but adjacent.',

  'LC_FORM_GRAN_TORSO_01 — Gran Torso: one through-composed movement segmented by technique + energy change; no traditional recaps; possible returns of earlier sound types as motivic sound objects.',
  'LC_FORM_GRAN_TORSO_02 — Gran Torso opening_profile=raw_noise_open: immediately establishes non-pitched friction palette; pressing/scraping/scratching from bar 1.',
  'LC_FORM_REIGEN_01 — Reigen seliger Geister: multi-section continuous chain of dance episodes with recurring sound types; light impulsklang + airy fließklang form the "Reigen" (ghost dance) gesture complex.',
  'LC_FORM_REIGEN_02 — Reigen opening_profile=ghost_dance_open: soft airy sounds; ultra-quiet whoosh_stroke; fragile rhythms; playful/ethereal vs violent gesture interplay.',
  'LC_FORM_GRIDO_01 — Grido: multi-section with formal logic; tonklang pillars function as thematic anchors; noise fields frame, disturb, or dissolve tonal apparitions.',
  'LC_FORM_GRIDO_02 — Grido opening_profile=fragile_pitch_open: delicate coloured tonal fragments build outward to noise; more precise pitch / dynamic / attack specification than Gran Torso or Reigen.',

  'LC_CLOSE_01 — Shared closing_profile (all three): decline in density and energy; recall of opening sound types; no tonal cadence; ambiguous; fade to near-silence.',
  'LC_CLOSE_02 — Shared closing_profile: no applause-cue silence until physical mechanics (bow noise, breath) fully cease.',

  'LC_MOTIVIC_01 — Motivic sound objects: certain sound_type + technique bundles flagged as recurring "motives"; recurrence at structurally corresponding formal points required.',
  'LC_MOTIVIC_02 — Motive identity = physical/sonic parameter bundle (technique + sound_type + energy_band), NOT pitch-interval pattern.',

  'LC_VS_CRUMB_01 — vs George Crumb: no semantic tags (Devil/God/numerology); no extra-musical program; techniques are the grammar itself; structure emerges from physical situations not ritual scaffolding.',
  'LC_VS_CRUMB_02 — vs Crumb: no quotation events; no tonal islands as symbolic anchors; sound_type transitions are self-justifying with no symbolic overlay.',

  'LC_VS_LIGETI_01 — vs Ligeti: foreground physical action and noise spectra; pitch may be absent; no strict canonic structures; no hidden polyphony.',
  'LC_VS_LIGETI_02 — vs Ligeti: clusters arise from distributed noise, not chromatic pitch canons; pc_sets and interval profiles are secondary or absent; no tension_metric based on ic1/ic2 density.',

  'LC_VS_BARTOK_01 — vs Bartók: retain four equal voices and chamber-laboratory intensity; discard tonal harmony, folk modes, motivic development, Beethovenian form, axis system, Bulgarian rhythms.',
  'LC_VS_BARTOK_02 — vs Bartók: replace classical apparatus with sound_type transition structures and energy curves; no centre_key, no mode_tag, no phrase-based formal logic.',

  'LC_VS_SONIC_YOUTH_01 — vs Sonic Youth: no backbeat; no riff repetition; no verse/chorus form; no distortion-as-chord; no drone harmony.',
  'LC_VS_SONIC_YOUTH_02 — vs Sonic Youth: noise organised by microscopic gesture changes on acoustic instruments, not by guitar feedback / pedal loops; formal logic = energy/perception, not groove/song structure.',
  'LC_VS_SONIC_YOUTH_03 — Sonic Youth profile: tunings, distortion, riff cycles, drum patterns. Lachenmann profile: technique parameter spaces, no steady beat, non-repeating physical situations.',

  'LC_VS_SHOSTAKOVICH_01 — vs Shostakovich: no DSCH motive system; no quotation events; no narrative-episodic march/lament/scherzo blocks; no tragic_slow_movement profile — replaced by sound_type trajectory.',
  'LC_VS_REICH_GLASS_01 — vs Reich/Glass: no phase_block / additive_pattern / pattern_integrity rules; no steady pulse_state; non-repeating physical situations over loop processes.',
  'LC_VS_TURTLE_ISLAND_01 — vs Turtle Island: no chord_symbols / improv slots / walking-bass / swing_feel — instead pitch_role is decoupled and grammar is gestural-physical.',
  'LC_VS_BEETHOVEN_01 — vs Beethoven late: no sonata-variation-fugue-attacca spine; no dim7/Aug6/N6 pivot graph; no species voice-leading; no recap requirement.',
] as const;
