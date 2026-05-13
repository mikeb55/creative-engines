/**
 * George Crumb — SQ VRB ritual / symbolic entry (Black Angels frame).
 *
 * Reference work: Black Angels — Thirteen Images from the Dark Land
 * (1970), for electric string quartet. Three parts × thirteen images
 * × numerological scaffolding (7 and 13); quotations of Schubert
 * "Death and the Maiden" + Dies irae chant + Tartini "Devil's Trill"
 * gesture; symbolically coded extended techniques (electric_insects,
 * devil_music, god_music, consort_past, lament_slow); amplification
 * decoupled from dynamic; mirror/echo structure around image 7
 * (Threnody II). CB_* receipts encode the cross-piece grammar.
 */

export const CRUMB_BLACK_ANGELS_SQ_VRB_FINGERPRINT_RECEIPTS = [
  // ---- policy receipts (1–10) ----
  'CB_POLICY_01 — voiceId=crumb_black_angels: SQ VRB ritual/symbolic entry framed by Black Angels (1970) for electric string quartet; 13 images / 3 parts; technique + quotation + numerology bound together by ritual meaning.',
  'CB_POLICY_02 — harmonicRhythm: numerologically governed (0–13 bars); image-by-image transitions, not chord-level; minChordDurationBars=0 / maxChordDurationBars=13 used as image-duration cap not chord grammar.',
  'CB_POLICY_03 — bassPolicy.role=noise-or-pedal: Vc alternates between low_ground noise-layer (devil_growl, col legno scratch) and sustained focal-pc pedal (B in god_music, D in lament images); no functional structural bass.',
  'CB_POLICY_04 — melodicPolicy.contour=gesture-symbolic: linear motion = symbolic gesture (angelic ascent / demonic plunge / spectral hover) tied to image label; preferredIntervalSets [1,6,7,5] (ic1 / tritone / perfect 5th / perfect 4th).',
  'CB_POLICY_05 — formPolicy.narrativeArc=ritual-arch: 13 images in 3 parts (Departure 1–5 · Absence 6–9 · Return 10–13); global_arch around image 7 (Threnody II); Threnodies at positions 1 / 7 / 13 act as structural arch supports.',
  'CB_POLICY_06 — rhythmPolicy.antiMetric=true: time_state ∈ {measured, quasi_free, proportional}; only Sarabanda + Pavana sustain measured pulse; Threnodies + bell + god images = quasi_free or proportional.',
  'CB_POLICY_07 — numerologyEnabled=true: 7 and 13 govern groupings, repeat counts, phrase lengths, counting gestures, and pitch-element appearances at key images.',
  'CB_POLICY_08 — quotationEventsEnabled=true: quotation_event carries near-exact interval pattern from Schubert (Death and the Maiden, D minor) / Dies irae chant / Tartini Devil\'s Trill (gesture-based); each must be framed by contrasting modern field on both sides.',
  'CB_POLICY_09 — amplificationDecoupled=true: amp_level is an independent parameter from dynamic marking; high amp on ppp gestures (sul pont harmonics) yields hyper-real sound; ppp may be louder in acoustic terms than mf.',
  'CB_POLICY_10 — soundTypeStates ∈ {pitched, noise, hybrid}: per image; transitions aligned with image boundaries or part changes; Threnodies mostly noise, God-music + Pavana mostly pitched, most other images hybrid.',

  // ---- germinal pc-sets (11–17) ----
  'CB_HARM_SETS_01 — Primary germinal pc-sets {0,1,2} (Forte 3-1) and {0,1,6} (Forte 3-5); high-tension images must contain at least one of these sets in verticals and linear gestures.',
  'CB_HARM_SETS_02 — Chromatic completion target at climaxes: ≥ 10 distinct pcs in a short span; tracked as `chromatic_completion_event` for tension-curve scoring.',
  'CB_HARM_SETS_03 — fateful_triad = {D#, A, E}; inversions and transpositions allowed; require appearance in each Threnody and key ritual images; functions as a local centric set.',
  'CB_HARM_SETS_04 — Outside tonal islands the pc_field is chromatic_dense governed by 012 + 016 subsets; focal_pc per image enforced by pedal or repeated emphasis in low or high voice.',
  'CB_HARM_SETS_05 — Ascending perfect 4th D#→A is a marked interval (fateful_triad axis); falling tritone (diabolus in musica) is the demonic dual axis; rising ic1 cluster is the lament axis.',
  'CB_HARM_SETS_06 — chromatic dense allowed only where image is NOT a tonal island; tonal-island bars must conform to that island\'s diatonic surface (B major or D minor).',
  'CB_HARM_SETS_07 — Set-class continuity: 012 / 016 subsets must reappear across non-tonal-island images so the harmonic identity of the work is continuous across the 13 images.',

  // ---- tonal islands (18–22) ----
  'CB_ISLAND_GOD_01 — god_music (image 10): tonal_island=B_major; required pcs B + D#; wide spacing; harmonic / glass voice duplications; added 2 / 6 optional; pc_set ⊆ B major diatonic.',
  'CB_ISLAND_PAVANA_01 — pavana_lachrymae (image 6): D minor area; Schubert Death and the Maiden interval pattern; literal diatonic voicing; consort_past timbre frame.',
  'CB_ISLAND_DIES_IRAE_01 — Dies irae fragment harmonised in D minor or related mode; chant interval pattern preserved; literal voicing; sits as quotation_event inside surrounding chromatic field.',
  'CB_ISLAND_SARABANDA_01 — sarabanda_de_la_muerte_oscura (image 8): D minor / sarabande quasi-baroque style; consort_past + lament_slow timbre; measured time_state; literal triadic voicing inside a chromatic frame.',
  'CB_ISLAND_FRAME_01 — Every tonal-island bar must be framed by starkly contrasting modern surroundings (noise + 012/016 field) on both sides; un-framed islands are forbidden — quotation must be ritualistically interrupted.',

  // ---- chord types (23–26) ----
  'CB_CHORD_RESONANCE_01 — resonance_B_major: required pcs B + D#; wide spacing; multiple harmonic/glass voice duplications; pc_set ⊆ B major diatonic; deployed only inside god_music image.',
  'CB_CHORD_CLUSTER_01 — cluster_chord (Threnodies, devil-music): vertical span includes ≥ k consecutive pcs; adjacent voices ≤ whole tone apart; pc_set contains 012 or 016; count of cluster notes often 7 or 13 (numerological coupling).',
  'CB_CHORD_QUOTE_01 — quote_chord (Schubert, Dies irae): strict triadic voicing; little or no added dissonance; acts as structural icon against surrounding chromatic field.',
  'CB_CHORD_DISSONANCE_01 — dissonance_index = f(ic1_density, ic6_density, texture_density, presence_of_012_or_016, distance_from_tonal_island); accumulation via cluster size + 012/016 + tritone + devil\'s trill gestures; release via thinning + tonal-island chord + glass_halo.',

  // ---- numerology in pitch (27–30) ----
  'CB_NUM_GROUP_01 — group_size constraint: sequences of single tones must group in 7s or 13s (e.g. 3+4 = 7, 7+3+3 or 7+6 = 13); deviations are marked structural events.',
  'CB_NUM_REPEAT_01 — repeat_count for motifs and pitches often exactly 7 or 13 iterations; B and D#–A–E appear in counts matching multiples of 7 / 13 at key images.',
  'CB_NUM_PHRASE_01 — phrase_length constraint: phrase durations often exactly 7 or 13 beats or measures; non-7/13 phrase lengths are marked events with a justified structural function.',
  'CB_NUM_SPEECH_01 — speech_event ritual counting in multiple languages (German, French, Russian, Hungarian, Japanese, Swahili); positioned at numerologically significant points; cardinality of items spoken = 7 or 13 exactly.',

  // ---- symbolism + 13-image form (31–37) ----
  'CB_FORM_13_01 — 13 images in 3 parts: Part I Departure (1–5) · Part II Absence (6–9) · Part III Return (10–13); global_arch peak at image 7 (Threnody II); Threnodies at 1 / 7 / 13 = arch supports.',
  'CB_FORM_PART_I_01 — Part I (Departure 1–5): images 1 Threnody I "Night of the Electric Insects" · 2 Sounds of Bones and Flutes · 3 Lost Bells · 4 Devil-music · 5 Danse Macabre; high dissonance_index; aggressive timbre; chromatic saturation; little tonal reference.',
  'CB_FORM_PART_II_01 — Part II (Absence 6–9): images 6 Pavana Lachrymae · 7 Threnody II "Black Angels!" · 8 Sarabanda de la Muerte Oscura · 9 Lost Bells (Echo); sparser; tonal/memorial; quotation density rises; lament figures; Threnody II at the centre of the work.',
  'CB_FORM_PART_III_01 — Part III (Return 10–13): images 10 God-music · 11 Ancient Voices · 12 Ancient Voices (Echo) · 13 Threnody III "Last Rites"; B major tonal island opens; electric_insects return; dynamic + timbral reconstruction; closing dissolution.',
  'CB_FORM_MIRROR_01 — Mirrored image pairs share motive + pc_set + technique but transformed (echo / inversion / dynamic change): Lost Bells (3) ↔ Lost Bells Echo (9); Ancient Voices (11) ↔ Ancient Voices Echo (12); Threnodies (1 ↔ 13) symmetric around image 7.',
  'CB_FORM_QUOT_01 — quotation_event must align with numerological milestones or formal pivots (image 6 Pavana, image 8 Sarabanda, Dies irae fragments embedded in lament_slow); framed by contrasting modern field both before and after.',
  'CB_FORM_RITUAL_01 — Theatrical ritual events: speech_event + instrumental_transform (bow → glass, bow → maracas, string → tam-tam) treated as structural events that mark transitions between images or parts (not decorative inserts).',

  // ---- technique states (38–43) ----
  'CB_TECH_ELECTRIC_INSECTS_01 — electric_insects (Threnodies, Departure): fast high sul ponticello tremolo clusters; amplified to surreal level even at ppp; chromatic_dense pc field with 012/016 sets; sound_type ∈ {noise, hybrid}.',
  'CB_TECH_DEVIL_MUSIC_01 — devil_music (image 4 + dark passages): low sul ponticello scratch + col legno; tritone-heavy intervals (diabolus in musica); Devil\'s Trill gesture (rapid alternating intervals); sound_type=noise dominant.',
  'CB_TECH_GOD_MUSIC_01 — god_music (image 10): thimble-bowed crystal glasses (glass-harmonica effect); B major resonance chords; high harmonics; tam-tam struck softly; wide spacing; overtone-like / quasi-spectral; sound_type=pitched; tonal_island=B_major.',
  'CB_TECH_CONSORT_PAST_01 — consort_past (Sarabanda, Pavana): bowing on the wrong side of the bridge (between bridge and tailpiece); "viol consort" eerie thin timbre; quasi-tonal; quotation-bearing; sound_type=hybrid with tonal_island active.',
  'CB_TECH_LAMENT_SLOW_01 — lament_slow (Pavana Lachrymae, Sarabanda): arco; sul tasto or normal; slow bow; Schubert / Dies irae quotations embedded; measured time_state; sarabande rhythm.',
  'CB_TECH_SOUND_TYPE_01 — sound_type per image ∈ {pitched, noise, hybrid}; transitions aligned with image / part boundaries; Threnodies mostly noise; God-music + Pavana mostly pitched; most other images hybrid.',

  // ---- noise phoneme vocabulary (44–49) ----
  'CB_PHONEME_ELECTRIC_BUZZ_01 — electric_buzz: fast high sul pont tremolo; high register; dynamic pp–fff; associated with electric_insects technique; recurs in Threnodies I / II / III.',
  'CB_PHONEME_BONE_FLUTE_01 — bone_flute: whistling sul tasto + overpressure partials; hollow timbre; associated with image 2 "Sounds of Bones and Flutes".',
  'CB_PHONEME_DEVIL_GROWL_01 — devil_growl: low sul pont scratch + col legno battuto; low register; associated with image 4 Devil-music + dark passages.',
  'CB_PHONEME_CONSORT_HISS_01 — consort_hiss: wrong-side bowing (between bridge and tailpiece); mid register; pp–mp; associated with Pavana + Sarabanda + Ancient Voices.',
  'CB_PHONEME_PERCUSSIVE_KNOCK_01 — percussive_knock: col legno + tam-tam stroke + string snap; impulsive; structural punctuation between images.',
  'CB_PHONEME_GLASS_HALO_01 — glass_halo: thimble-bowed crystal glass; pure harmonic; B major pcs; associated with image 10 God-music + closing echo gestures.',

  // ---- amplification + sound_type (50–52) ----
  'CB_AMP_01 — amp_level is an independent dimension from dynamic marking; per-image amplification curves required (Threnodies and Devil-music carry max amp on ppp tremolos; Pavana / Sarabanda carry low amp on sustained arco).',
  'CB_AMP_02 — Hyper-real ppp: when dynamic ≤ ppp and amp_level ≥ high, mark event as `hyper_real_event`; reserved for sul pont harmonics + bell decay + glass_halo gestures.',
  'CB_SOUND_TYPE_TRANS_01 — sound_type transitions occur ONLY at image or part boundaries; mid-image sound_type changes are forbidden unless explicitly justified by a numerological pivot (group_of_7 or group_of_13 boundary).',

  // ---- voice leading + register (53–57) ----
  'CB_VL_01 — Register role per voice per image ∈ {high_halo, mid_body, low_ground, noise_layer}; not fixed across the work; drastic role changes between images allowed and expected.',
  'CB_VL_02 — Image-specific layouts: Threnodies all voices in high register (electric insects mass); God-music spread extreme high (glass) + mid (B major arco); Devil-music low ground (growl) + high (trill/shriek).',
  'CB_VL_03 — Voice-leading behaviour is gesture-based not species-based: glissando spans, stepwise inside small pc-sets, symbolic leaps (angel ascents = upward, devil plunges = downward); classical counterpoint rules minimised.',
  'CB_VL_04 — extreme_register_event when new highest or lowest sounding pitch is reached; must coincide with structural nodes (beginning of parts, Threnodies, God-music, Threnody III).',
  'CB_VL_05 — Inter-voice texture_state ∈ {heterophony_cluster, unison_quote, independent_streams}: heterophony_cluster = similar contours inside small pc-set (cluster field); unison_quote = 2–4 voices on same quotation (Dies irae / Schubert) in strict unison or octave; independent_streams = distinct gestures per voice, tied by pc-sets + numerology not rhythm.',

  // ---- rhythm + motivic identity (58–62) ----
  'CB_RHY_01 — time_state per image: measured (Sarabanda, Pavana); quasi_free (Threnodies, God-music, bell images); proportional (durations tied to 7 / 13 unit ratios).',
  'CB_RHY_02 — numerological_segment: total beats or notated durations grouped in 7 or 13 units; sustained tones held 7 or 13 times before changing; counting gestures cover exactly 7 or 13 items.',
  'CB_MOTIF_01 — Motivic identity is multi-axis: any subset of (pc_set, interval_profile, gesture_type, technique, numerology_tag) can constitute a recurrence; e.g. same gesture + technique with altered pcs, or same pc_set with different gesture.',
  'CB_MOTIF_02 — pc_set axis: {D#, A, E} · {0,1,2} · {0,1,6} · Dies irae fragment · Schubert interval pattern; interval_profile axis: falling tritone (diabolus), ascending P4 (D#→A), rising ic1 cluster.',
  'CB_MOTIF_03 — gesture_type axis: devil\'s_trill · electric_tremolo · glass_arpeggio · bell_decay · snap_pizz_punctuation; technique axis: electric_buzz · glass_halo · consort_hiss · devil_growl; numerology_tag axis: group_of_7 · group_of_13 · mirror_position.',

  // ---- formal habits — opening / closing / silence (63–66) ----
  'CB_FORM_OPENING_01 — Opening profile (Threnody I): sudden amplified noise; high sul pont tremolo clusters; immediate chromatic shock; no introduction; dissonance_index at max from bar 1.',
  'CB_FORM_CLOSING_01 — Closing profile (Threnody III "Last Rites"): return of electric_insects transformed; gradual decay into silence; possible ghostly Schubert echo as final memory; reduced density + dynamic; no tonal resolution.',
  'CB_FORM_SILENCE_01 — silence_block: measured or quasi_free silence between images or after numerological climaxes; treated as structural marker not background; required between every image boundary; length often numerologically determined (e.g. 7 or 13 beats).',
  'CB_FORM_THRENODY_ARCH_01 — Threnodies at images 1 / 7 / 13 form the structural arch of the entire work; their internal pc_set + technique vocabularies must remain coherent across the three positions (same electric_insects DNA, transformed by position).',

  // ---- differentiators (67–70) ----
  'CB_DIFF_LACHENMANN_01 — vs Lachenmann: techniques are symbolically coded (Devil / God / insects) AND embedded in numerology + quotation frameworks; never pure material/noise syntax; treating technique sequences as primary grammar without extra-musical scaffolding is forbidden.',
  'CB_DIFF_LIGETI_01 — vs Ligeti: no sustained dense micropolyphonic fields; emphasise discrete gestures + sudden contrasts + symbolic pc-sets; collage-like image structure not hidden canonic web; images are distinct characters, not continuous texture evolution.',
  'CB_DIFF_SHOSTAKOVICH_01 — vs Shostakovich: quotations are archetypal symbols (death / judgment / devil) inside a non-tonal environment; NOT autobiographical self-reference within a shared tonal grammar; quote_chord must be framed by starkly contrasting modern field; numerological positioning of quotations required.',
  'CB_DIFF_DUTILLEUX_01 — vs Dutilleux: explicit numerological counts (7 and 13) drive grouping + form; quotations + techniques recur in ritual cycles, not gradual growth; no progressive growth stages, no memory parenthèses; mirror/echo structure is numerologically fixed, not process-emergent.',

  // ---- works (71–72) ----
  'CB_WORK_BLACK_ANGELS_01 — Reference anchor: Black Angels — Thirteen Images from the Dark Land (1970) for electric string quartet; full 13-image / 3-part scaffold preserved as the canonical form_schema for crumb_black_angels generation.',
  'CB_WORK_BLACK_ANGELS_02 — Anchor image titles preserved as section_tag library: Threnody I (Night of the Electric Insects) · Sounds of Bones and Flutes · Lost Bells · Devil-music · Danse Macabre · Pavana Lachrymae · Threnody II (Black Angels!) · Sarabanda de la Muerte Oscura · Lost Bells (Echo) · God-music · Ancient Voices · Ancient Voices (Echo) · Threnody III (Last Rites).',
] as const;

export type CrumbBlackAngelsSqVrbFingerprintReceipt =
  (typeof CRUMB_BLACK_ANGELS_SQ_VRB_FINGERPRINT_RECEIPTS)[number];
