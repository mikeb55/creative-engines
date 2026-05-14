/**
 * Erik Satie — VoiceRuleBundle fingerprint receipts (ES_*).
 *
 * Covers Gymnopédies, Gnossiennes, Sarabandes, Trois morceaux en forme de
 * poire, Parade, Socrate, and musique d'ameublement (furniture music).
 * Modal/diatonic colour harmony, naive parallel-friendly voice-leading,
 * non-functional dominants, ironic style switches vs Pärt tintinnabuli rigour.
 */

export const SATIE_VRF_FINGERPRINT_RECEIPTS = [
  // ---- policy (01–06) ----
  'ES_POLICY_01 — voiceId=satie: French fin-de-siècle modal salon grammar; deliberately underwritten textures; anti-teleological form bias (gymnopedies / gnossiennes / furniture); humour + deadpan repetition allowed.',
  'ES_POLICY_02 — harmonicRhythm: 1–8 bars per chord (slow; default ≈1 chord/bar); allowMidBarChange=false for barred_satie spine; gnossienne barless mode may relax grid at slice level.',
  'ES_POLICY_03 — bassPolicy.role=pedal-or-static: slow stepwise or small-leap bass; frequent tonic/modal pedal; Gymnopédie alternation root vs 3rd/5th on strong beats; forbid walking bass and Alberti figuration.',
  'ES_POLICY_04 — melodicPolicy.contour=stepwise-modal: shallow arcs; preferredIntervalSets=[1,2,3,4] (m2·M2·m3·M3); maxLeapSemitones=4; no leading-tone climax grammar; phrase may start off-tonic.',
  'ES_POLICY_05 — formPolicy.narrativeArc=non-teleological: sectionRecallEnforced=false; loops, juxtaposition, and arbitrary module concat valid; no mandatory sonata climax.',
  'ES_POLICY_06 — rhythmPolicy.antiMetric=false (barred_satie default: Gymnopédies / Sarabandes / Parade metrical spine); set true only for barless_satie (Gnossiennes-style loose 16-unit grid).',

  // ---- harmonic palette (07–14) ----
  'ES_HARM_PAL_01 — plain_triad: root position and first inversion; bare triads welcome; no 7th required for validity.',
  'ES_HARM_PAL_02 — added_note: triad + added 2nd/9th, 6th, or 4th as stable colour (e.g. E–G#–B–C# added-6th; F–A–C–D added-2nd); float without functional prep/resolution.',
  'ES_HARM_PAL_03 — unresolved_dominant7: V7 as colour; target tonic resolution probability <0.4; ~0.3 jump to unrelated/modal sonority; ~0.3 self-repeat or planed copy — forbid functional tension/release reading.',
  'ES_HARM_PAL_04 — modal_open: open 5ths or modal stacks on Dorian/Aeolian/Mixolydian/Phrygian-flavoured steps; no raised leading tone in modal contexts.',
  'ES_HARM_PAL_05 — parallel_planed: entire voicing transposed by step or semitone without CP voice-leading repair; chord types = maj7/maj6, triads, added-note chords; 2–4 consecutive steps then return toward tonic area.',
  'ES_HARM_PAL_06 — parallel_planing_speed: slow — default one chord per bar or half-bar; do not sustain parallel motion long enough to erase tonal centre.',
  'ES_HARM_PAL_07 — tonal_centre_without_V_I: establish tonic via bass pedal, >50% downbeat chords carrying tonic pc, melodic focal pitch, or final tonic/modal variant — never authentic V–I as default closure.',
  'ES_HARM_PAL_08 — cadence_substitutes: plagal IV–I, modal ♭VII–I, naked tonic return, or no cadence (stop on colour) preferred over dominant-tonic rhetoric.',

  // ---- modes + chromatic limits (15–18) ----
  'ES_MODAL_01 — scales: Dorian, Aeolian, Mixolydian, Phrygian-flavoured (Gnossiennes); harmonise Aeolian with i–♭VII–♭III grammar; forbid ii–V–I jazz chain entirely.',
  'ES_MODAL_02 — modal_cadence: phrase ends on scale degree 1 or 5 without leading-tone pull; melodic final may be added-2nd/4th/6th colour against chord.',
  'ES_CHROM_01 — chromatic restriction: modal/diatonic field primary; limit chromatic colour chords vs Debussy; forbid chromatic approach chords and chromatic voice-leading as structural driver.',
  'ES_CHROM_02 — forbid chromatic modulation as Satie-mode constraint; side-by-side modal blocks + planing inside mode OK.',

  // ---- dissonance + voice-leading (19–24) ----
  'ES_DISS_01 — dissonance is colouristic or ignorable: added 2nds/4ths/6ths, diatonic NCT over pedal, suspensions often left unresolved; forbid functional tension→release logic.',
  'ES_VL_01 — deliberately naive voice-leading: parallel 3rds/6ths/perfect intervals permitted; direct 5ths/8ves allowed; smoothness (≤M3 between consecutive chord positions) may outrank parallel avoidance.',
  'ES_VL_02 — inner_voices: static pads from chord voicing; sustained chord tones while melody moves; no independent contrapuntal obligations on inner lines.',
  'ES_TEX_GYM_01 — gymnopedie_texture: Layer1 bass single note beat1 (half or dotted); Layer2 chord/broken chord offbeats 2–3; Layer3 cantabile mid-register melody mostly quarters/halves; harmonic rhythm ~1 chord/bar.',
  'ES_TEX_GYM_02 — sparse_subdivision_rule: if one layer takes 8ths, all others stay on quarters/halves — only one voice may subdivide at a time.',
  'ES_TEX_SOC_01 — socrate_texture: homophonic_vocal + light_chordal_strings; recitative-like syllabic French prosody; soft underpinning; dynamics never extreme; affect “white” and neutral.',

  // ---- melody + phrase (25–28) ----
  'ES_MEL_01 — melody floats above harmony: 40–60% diatonic non-chord tones within phrase; not chord-tone driven; narrow phrase register (often ≤ octave).',
  'ES_PHRASE_01 — irregular phrase lengths: bias 3–7 bars; 4/8 allowed but not default; closures = tonic-area harmony + stable melodic pitch or open colour stop.',
  'ES_LOOP_01 — repetition: 1–2 bar motif looped 3–8× with minimal variation (revoice, subtle bass shift, dynamic nuance, small colour tweak); obsessive looping is idiomatic.',

  // ---- rhythm modes (29–33) ----
  'ES_RHY_BARRED_01 — barred_satie: fixed slow triple (Gymnopédies 3/4; Sarabande solemn triple); steady pulse; no syncopation; no strong dance accent in Gymnopédie layer model.',
  'ES_RHY_BARLESS_01 — barless_satie: events on loose 16-unit span; visual grouping without regular bar segmentation; rubato implied; long notes + occasional dotted/tied gestures.',
  'ES_RHY_PARADE_01 — parade_mode: 2/4 or 4/4 cakewalk/ragtime syncopation; blocky triads + simple 7ths; occasional percussive/noise hit on strong beat (theatrical).',
  'ES_RHY_FURN_01 — furniture_music: 1–2 bar isochronous loops ad lib; equal note lengths; no accent hierarchy; minimal dynamic range; no cadential closure; modules concatenate arbitrarily.',
  'ES_IRONY_01 — irony_parameters: extended I–IV–I or I–♭VII–I banality; sudden non-resolving “wrong” chord; dynamic marking contradicts material (“pomp without weight”); ironicStyleSwitchEnabled=true.',

  // ---- form schemas (34–36) ----
  'ES_FORM_GYM_01 — gymnopedies_form: three main sections ABA′-like; change via harmony/register tint, not thematic overhaul; B slightly richer; A′ near A.',
  'ES_FORM_GNOS_01 — gnossiennes_form: through-composed micro-phrase chain; recurring motives with small variations; divisions from text cues + variation not barline cadences.',
  'ES_FORM_POIRE_01 — poire_form: short suite movements; stylistic juxtaposition (modal chorale ↔ salon waltz ↔ cabaret vamp) with continuity only in tempo or cell.',

  // ---- differentiators (37–40) ----
  'ES_DIFF_DEB_01 — vs Debussy: forbid dense quartal/quintal colour stacks, chromatic colour progressions, sophisticated voice-leading, thick polyphony; keep parallelism blatant + repetition more deadpan.',
  'ES_DIFF_RAV_01 — vs Ravel: forbid virtuoso figuration, layered counterpoint, structural intricacy, brilliant climaxes; Satie stays static and deliberately “amateurish on purpose”.',
  'ES_DIFF_PART_01 — vs Pärt: forbid tintinnabuli M/T algorithm, sacred_profile, liturgical silence-as-structure; Satie allows unresolved dominants, furniture loops, parody, style switches (tintinnabuliEnabled=false).',
  'ES_DIFF_BACH_01 — vs Bacharach: forbid ii–V–I, chromatic approach chords, extended jazz-functional harmony; Satie stays modal/diatonic colour stasis only.',
] as const;
