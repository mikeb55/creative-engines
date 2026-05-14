/**
 * Cole Porter — VoiceRuleBundle fingerprint receipts (`CP_*`).
 *
 * Functional harmony under chromatic line pressure; speech-shaped melody;
 * descending chromatic bass; major/minor mixture; urbane wit. Focus corpus:
 * Night and Day · Under My Skin · Anything Goes · Begin the Beguine ·
 * Just One of Those Things · Every Time We Say Goodbye · I Love Paris ·
 * So in Love · Love for Sale.
 */

export const COLE_PORTER_VRF_FINGERPRINT_RECEIPTS = [
  // ---- policy (01–08) ----
  'CP_POLICY_01 — voiceId=cole_porter: Great American Songbook chromatic tonality — singable cadential goals + linear chromaticism (bass / guide tones), not vertical blues stacks.',
  'CP_POLICY_02 — harmonicRhythm: minChordDurationBars=1 / maxChordDurationBars=8 — bar-level functional rhythm with room for chromatic-bass modules spanning 4–8 beats or 4–8 bars.',
  'CP_POLICY_03 — bassPolicy.role=chromatic-descent-or-root: functional roots + semitone descent chains + scalar linkage between pillars.',
  'CP_POLICY_04 — melodicPolicy.contour=speech-elegant: lyric-led rhetoric, narrow or repeated-note openings widening into long arches; theatrical leaps compensated by scalar fill.',
  'CP_POLICY_05 — melodicPolicy.preferredIntervalSets=[1,2,3,6,8]: stepwise motion + wider interval classes for rhetorical peaks (post-leap step bias 2–4 notes).',
  'CP_POLICY_06 — formPolicy.narrativeArc=aaba-or-extended-refrain: stock 32-bar AABA/ABAC vs enlarged continuous refrain (Night and Day) vs beguine chain.',
  'CP_POLICY_07 — formPolicy.sectionRecallEnforced=true: A′ varies midpoints/register while retaining motivic relation — forbid literal A clone when variation profile active.',
  'CP_POLICY_08 — rhythmPolicy.antiMetric=false; swingFeel=false posture — refined pulse, dotted/tied elegance, no groove-drive swing as primary identity.',

  // ---- harmonic families (09–14) ----
  'CP_HARM_01 — Chord families: tonic_major_colour (Imaj7 Imaj6 I6/9) + tonic_minor_colour (im6 im(maj7)) + ii7–V7 chains with altered V options.',
  'CP_HARM_02 — applied_dominant vocabulary: V7/ii V7/IV V7/V etc. with common-tone pivots into bridge regions.',
  'CP_HARM_03 — diminished_passing: dim7 stitching semitone bass steps between diatonic anchors.',
  'CP_HARM_04 — borrowed_predominant: iv in major, ♭VI, Neapolitan ♭II — Porter mixture fingerprint.',
  'CP_HARM_05 — mixture_chord: parallel-major/minor flip on shared tonic_pc at lyric or sectional hinge.',
  'CP_HARM_06 — Dominant polish: altered V7 colours + deceptive / side-slip resolutions — line of fifths remains inferable; forbid raw unresolved dominant as default closing colour.',

  // ---- chromatic bass module (15–18) ----
  'CP_BASS_01 — Descending chromatic bass: each semitone class ∈ {tonic_inversion, diminished_passing, secondary_dominant, borrowed_predominant} per local goal.',
  'CP_BASS_02 — Night and Day model: repeated-note obsession in melody over prolonged tonic colour + passing dim7 + dominant preparation before cadence.',
  'CP_BASS_03 — Love for Sale model: B♭ major ↔ B♭ minor toggle as expressive colour thread, not random side-slip.',
  'CP_BASS_04 — Bass states: functional_root · chromatic_descent · scalar_linkage — avoid constant walking-quarters as core composer grammar (arranger overlay is separate).',

  // ---- mode mixture (19–21) ----
  'CP_MODE_01 — Major/minor module: parallel flip at lyric milestone (Every Time We Say Goodbye: A♭ major → A♭ minor = structural) or sectional boundary (I Love Paris minor A → major B).',
  'CP_MODE_02 — mode_state flip preserves tonic_pc while retinting tonic / subdominant / mediant simultaneously.',
  'CP_MODE_03 — Mode change must align with formal marker when textCoupledHarmonyEnabled profile is active.',

  // ---- modulation + drift (22–24) ----
  'CP_MOD_01 — Bridge targets: relative / parallel region, flat-side colour, bright major answer to minor A section — prep via common-tone dominant or ii–V into new key.',
  'CP_MOD_02 — Night and Day contrast region: tonicize ♭III / relative major-minor colour fields; re-entry via ii–V or shared dominant tone.',
  'CP_MOD_03 — Allow tonal drift before explicit dominant prep — sustained hover then clarified cadential path.',

  // ---- melodic language (25–29) ----
  'CP_MEL_01 — Repeated-note opening: 4–8 same-pitch attacks before intervallic expansion (Night and Day / Goodbye archetypes).',
  'CP_MEL_02 — Elegant pickup → sustained arch; midpoint contrast varies harmony or registral peak each 4–8 bar subphrase.',
  'CP_MEL_03 — Chromatic melody tones = passing / neighbour / lyric stress — align with applied dominants or bass chromaticism; NOT blue-note inflection.',
  'CP_MEL_04 — Jazz reharmonizability: phrase goals land on strong chord tones (1 3 5 7) while mid-phrase chromatic approach stays intervallically logical.',
  'CP_MEL_05 — Long-form Begin the Beguine: ~108-bar chain of 4–8 bar subphrases; motivic unity without literal repeat; persistent accompaniment groove as spine.',

  // ---- rhythm (30–33) ----
  'CP_RHY_01 — Refined syncopation: dotted figures, ties, occasional triplets — subordinated to diction and harmonic timing.',
  'CP_RHY_02 — Layer split: accompaniment marks harmonic rhythm regularly; melody legato, may anticipate/lag change by 8th or quarter.',
  'CP_RHY_03 — Harmonic_turn_under: place stressed syllable immediately before chromatic shift so harmony pivots under sustained pitch.',
  'CP_RHY_04 — Beguine cell: two-bar Latin/habanera-adjacent pattern repeats; melody crosses barline, begins offbeat, floats above groove.',

  // ---- texture + voice leading (34–37) ----
  'CP_VL_01 — Hidden spine: guide-tone line (3rds/7ths) + chromatic bass first; ornament with 6ths/9ths/alterations after spine locked.',
  'CP_TEX_01 — porter_vocal_mode: melody over abstract harmonic slots — sparse, text-primary.',
  'CP_TEX_02 — porter_piano_mode: denser four-note voicings + active inner lines with exposed stepwise guide motion.',
  'CP_TEX_03 — Verse→chorus: verse thin/exploratory ending V or chromatic approach; chorus thickens register, clarifies tonic, periodic melody.',

  // ---- wit + closings (38–40) ----
  'CP_WIT_01 — Encodable wit: chromatic_sidestep at worldly lyric; mode_change_trigger at semantic pivot; cadence_delay 1–2 bars before resolution.',
  'CP_END_01 — Closings: Imaj7 / I6 colour — knowing_elegance sidestep before final tonic; polished extension not abrupt cutoff.',

  // ---- differentiators (41–45) ----
  'CP_DIFF_GERSHWIN_01 — vs Gershwin: forbid blue-note vocabulary + rhythm-changes bridge as primary ID + overt swing-drive; Porter = chromatic urbane descent + mixture + speech rhythm.',
  'CP_DIFF_BACHARACH_01 — vs Bacharach: forbid irregular phrase lengths and metric surprise as spine; Porter stays 32-bar disciplined with functional chromaticism.',
  'CP_DIFF_DEBUSSY_01 — vs Debussy: may borrow extended tertian colour; forbid cadential abandonment and non-metric wash; goals stay clear.',
  'CP_DIFF_MONK_01 — vs Monk: forbid angular percussive asymmetry as default; Porter = suave guide-tone lyricism.',
  'CP_DIFF_ROUGH_01 — Urbane profile: sensual without roughness; chromatic without blues; supple without swing ostinato identity.',

  // ---- work fingerprints (46–50) ----
  'CP_WORK_NIGHT_DAY_01 — Night and Day: enlarged refrain, chromatic bass binding, contrasting middle region, return of descent obsession.',
  'CP_WORK_BEGUINE_01 — Begin the Beguine: through_composed_chain + recurring motivic tags + fixed two-bar accompaniment DNA.',
  'CP_WORK_GOODBYE_01 — Every Time We Say Goodbye: structural A♭ major→minor flip tied to lyric “change from major to minor”.',
  'CP_WORK_UNDER_SKIN_01 — I\'ve Got You Under My Skin: applied dominant density + polished bridge drift + strong cadential polish.',
  'CP_WORK_LOVE_SALE_01 — Love for Sale: parallel major/minor colour oscillation on tonic area with chromatic side-steps in verse.',
] as const;

export type ColePorterVrbFingerprintReceipt = (typeof COLE_PORTER_VRF_FINGERPRINT_RECEIPTS)[number];
