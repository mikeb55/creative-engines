/**
 * George Gershwin — VoiceRuleBundle fingerprint receipts (`GG_*`).
 *
 * Functional tonalist + jazz extensions; Rhapsody in Blue, Concerto in F,
 * An American in Paris, Porgy and Bess, and standards (Summertime, I Got
 * Rhythm, Someone to Watch Over Me, Embraceable You, The Man I Love,
 * Fascinating Rhythm).
 */

export const GERSHWIN_VRF_FINGERPRINT_RECEIPTS = [
  // ---- policy (01–08) ----
  'GG_POLICY_01 — voiceId=gershwin: functional jazz tonality — T–PD–D–T paths + circle-of-fifths bridges; tertian extensions inside each function.',
  'GG_POLICY_02 — harmonicRhythm: minChordDurationBars=0 / maxChordDurationBars=8 / allowMidBarChange=true — half-bar to 8-bar holds; rapid functional turnover + sustained tonic tags both valid.',
  'GG_POLICY_03 — bassPolicy.role=walking-or-symphonic: songbook walking / root–5th–approach vs concert longer structural tones + arpeggiated motion.',
  'GG_POLICY_04 — melodicPolicy.contour=blues-diatonic: diatonic song arcs with authorised ♭3 / ♭7 / ♯4 colour; extensions support melody without redefining function.',
  'GG_POLICY_05 — melodicPolicy.preferredIntervalSets=[1,2,3,4,5]: stepwise majority + arpeggiated 3rds/5ths + occasional wider concert leaps (controlled by maxLeapSemitones).',
  'GG_POLICY_06 — formPolicy.narrativeArc=aaba-or-rhapsody: default 32-bar AABA vs multi-section rhapsody (theme return transposed/re-orchestrated).',
  'GG_POLICY_07 — formPolicy.sectionRecallEnforced=true: A′ recognises A material; rhapsody segments may vary texture while keeping thematic tags.',
  'GG_POLICY_08 — rhythmPolicy.antiMetric=false: swing/syncopation rides steady pulse; Charleston / 3+3+2 / tied-quarter cells never abolish meter.',

  // ---- chord families + voice leading (09–14) ----
  'GG_HARM_01 — Chord families: plain_diatonic (Imaj7 ii7 V7 vi7) + jazz_extended_dominant (V9 V13 V7♭9 V7♯9 V7♭13) + secondary_dominant chains + tonic_colour (Imaj6 I6/9 Imaj9).',
  'GG_HARM_02 — Chromatic_mediant palette: I→♭III / I→♭VI / I→♭II colour pivots; return via common tone or V/x of target.',
  'GG_HARM_03 — blue_note_voicing: verticals may stack diatonic + blues degrees under tune so ♭3 / ♯4 / ♭7 read as colour, not new tonic function.',
  'GG_HARM_04 — Guide tones: dominants carry 3+7; 9/13 or alterations layered; prefer voice motion by step or small third between changes.',
  'GG_HARM_05 — Rhythm-changes bridge model: | III7 | VI7 | II7 | V7 | in local key (B♭: D7–G7–C7–F7); optional passing ii7–V7 into each dominant cell.',
  'GG_HARM_06 — Circle-of-fifths subversion: insert chromatic mediant or deceptive resolution inside bridge before completing home dominant.',

  // ---- blues field + chromatic tools (15–18) ----
  'GG_BLUES_01 — blues_field degrees {1 ♭3 3 4 ♯4/♭5 5 ♭7}: tonic may carry ♭3/♭7 in inner voices; subdominant may colour with ♭7 of tonic as passing.',
  'GG_BLUES_02 — ♯4/Lydian tension over I or V as melodic colour, resolved by step or held expressively.',
  'GG_BLUES_03 — Altered dominants at cadences and concert climaxes: V7♭9 / V7♯9 / V7♭13 + occasional Ger+6 as pivot.',
  'GG_BLUES_04 — Semitone root motion idiom: stepwise chromatic bass or inner planing between functional anchors (signature Gershwin excess allowed).',

  // ---- modulation (19–21) ----
  'GG_MOD_01 — Modulation: closely related keys + chromatic mediants (e.g. B♭ ↔ D♭ / E♭ areas) via pivot or II–V–I into new tonic.',
  'GG_MOD_02 — Formal boundary prep: 1–4 bars II–V or V-of-new before arrival; then stabilise with local tonic–dominant rhetoric.',
  'GG_MOD_03 — Thematic return obligation (rhapsody): at least one principal theme reappears in new key and/or new scoring (Rhapsody in Blue model).',

  // ---- melodic language (22–27) ----
  'GG_MEL_01 — Motif DNA: 4-note scalar runs + arpeggiated triads/sevenths + prominent perfect 5th as building blocks.',
  'GG_MEL_02 — Implication–realisation: second phrase half mirrors or reverses first-half contour (e.g. up a 3rd then answering down a 3rd).',
  'GG_MEL_03 — Upbeat profile: phrases favour &-of-beat entries; downbeat = arrival plateau not pick-up.',
  'GG_MEL_04 — Eight-bar A phrase grid: bars 1–2 ascent motif · 3–4 contrary answer · 5–8 sequence/variation; endings on 3 or 1 or blue tone resolving to chord tone.',
  'GG_MEL_05 — Blue notes as accented passing / appoggiaturas over tonic or IV; weak-beat entry → sustain or stepwise resolution at emotional peaks.',
  'GG_MEL_06 — song_mode vs concert_mode: song ≈ octave range + tight 8-bar periods; concert widens register + stretches motifs across 16–32 note spans preserving core contour.',

  // ---- rhythmic vocabulary (28–32) ----
  'GG_RHY_01 — Core cells: dotted_quarter_eighth_quarter (Charleston); grouped_3_3_2 straight-eighth displacement; syncopated_quarter_tied across barline.',
  'GG_RHY_02 — triplet_flourish: three notes over two beats as concert/song flourish.',
  'GG_RHY_03 — Fascinating Rhythm profile: long–short–short repeated syncopation in 4/4.',
  'GG_RHY_04 — I Got Rhythm A-section: syncopated repeated cells + offbeat starts + dotted rhythms + ties across beats 3–4.',
  'GG_RHY_05 — Rhythm-changes B-section: more downbeat-oriented melody while dominants cycle III7–VI7–II7–V7.',

  // ---- texture + orchestration (33–36) ----
  'GG_TEX_01 — song_texture (3–4 parts): single melody + on-beat/walking bass + offbeat inner fills; compact piano-song spacing.',
  'GG_TEX_02 — symphonic_jazz_texture: theme + counter-theme + rhythmic brass/wind riff layer + string pad; each layer owns register + rhythmic role.',
  'GG_TEX_03 — concert_orchestral_mode voice-leading: classical spacing; dominant 3/7 resolve to tonic 1/3; prepared dissonance discipline.',
  'GG_TEX_04 — song_piano_mode: parallel block voicings allowed; keep top line smooth; inner voices target guide tones.',

  // ---- formal models (37–40) ----
  'GG_FORM_01 — Song default: 32-bar AABA + optional verse (parlando); A sections tonic-centred with I–vi–ii–V turnarounds; bridge dominant cycle; tag/coda on I6/9 or rhythmic climax.',
  'GG_FORM_02 — Rhapsody macro: segmented A–B–C–A′–C′–coda with tempo/texture/topic shifts; transitions via II–V chain or mediant jump + local stabilisation.',
  'GG_FORM_03 — Porgy and Bess: closed numbers + recurring leitmotifs (Summertime family); through-composed scenes maintain motivic/harmonic continuity.',
  'GG_FORM_04 — Openings: iconic solo gesture or clarinet-gliss archetype — narrow accompaniment, wide melodic interval + rhythmic hook.',

  // ---- closings + vernacular fusion (41–43) ----
  'GG_END_01 — Closings: strong I with weight; extended Imaj6/I6/9; large forms may rallentando + rhythmic tutti climax.',
  'GG_VERN_01 — Vernacular stack: Tin Pan Alley hook clarity + blues/gospel inflection + ragtime stride echoes + jazz swing layered inside functional shell.',

  // ---- differentiators (44–48) ----
  'GG_DIFF_BACHARACH_01 — vs Bacharach: keep symmetric 8/16-bar periods; forbid surprise irregular phrase lengths as primary engine; modulations stay diatonic/chromatic-mediant jazz paths.',
  'GG_DIFF_MONK_01 — vs Monk: forbid harsh cluster stacks and tritone-structural voicings as norm; prefer smooth extensions + consonant frame.',
  'GG_DIFF_DEBUSSY_01 — vs Debussy: may borrow spare parallel 7ths / add2 colour; forbid metric washout and total functional abandonment — key and pulse stay legible.',
  'GG_DIFF_RAVEL_01 — vs Ravel: orchestration colourful but simpler harmonic rhythm + song/groove centre; less bitonal/modal density than French Impression peak.',
  'GG_DIFF_PORTER_01 — vs Cole Porter: Gershwin leans harder on blues degrees, rhythm-changes bridges, and overt swing syncopation; Porter more chromatic speech-melody without blues field.',

  // ---- work fingerprints (49–52) ----
  'GG_WORK_RHAPSODY_01 — Rhapsody in Blue: slow blues introduction → accelerando jazz band strata → piano cadenzas as pivot zones → tutti blues reprise.',
  'GG_WORK_CONCERTO_F_01 — Piano Concerto in F: bluesy first movement themes + jazz percussion battery + romantic slow movement + toccata/rag finale crossfade.',
  'GG_WORK_PARIS_01 — An American in Paris: taxi-horn collage + blues-waltz episodes + stride/two-step interludes bound by recurring motto.',
  'GG_WORK_SONGS_01 — Standards cluster: Summertime lullaby minor colour; I Got Rhythm changes; Watch Over Me / Embraceable You / Man I Love lyric arcs; Fascinating Rhythm ostinato syncopation.',
] as const;

export type GershwinVrbFingerprintReceipt = (typeof GERSHWIN_VRF_FINGERPRINT_RECEIPTS)[number];
