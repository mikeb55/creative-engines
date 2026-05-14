/**
 * Antônio Carlos Jobim — VoiceRuleBundle fingerprint receipts.
 *
 * Reference grammar: extended-tertian bossa-nova harmony (maj7 /
 * maj9 / maj7♯11 Lydian colour, min7 / min9, dom7 / dom9 / dom7♭9 /
 * dom7♯9 / dom13, suspended dominants, parallel mode-mixture moves
 * on the same root, chromatic mediants, pedal points, sustained
 * tonic maj7); stepwise inner-voice motion with guide-tone semitone
 * resolution; bass as melodic counterline; Brazilian modal colour
 * (Dorian on ii, Lydian on I, Mixolydian on V — no classical V→I
 * rhetoric); long-range tonal planning by minor-third / major-second
 * key relations; bossa-nova rhythmic feel (3+3+2 / 2+3+3 over 4/4,
 * melodic 8th-note anticipation, soft pulse, no drum kit); AABA /
 * AABBA / through-composed song forms with remote-key bridges; work
 * fingerprints for Girl from Ipanema · Corcovado · Wave · Desafinado
 * · Waters of March · One Note Samba · Triste. JB_* receipts encode
 * the cross-piece grammar.
 */

export const JOBIM_VRB_FINGERPRINT_RECEIPTS = [
  // ---- policy receipts (1–10) ----
  'JB_POLICY_01 — voiceId=jobim: bossa-nova songbook entry; extended-tertian harmony + melodic-counterline bass + stepwise-arc melody over a soft 4/4 pulse (3+3+2 / 2+3+3 8th-note groupings); pulse always present, no antimetric structures.',
  'JB_POLICY_02 — harmonicRhythm: 2–8 bars per chord (minChordDurationBars=2 / maxChordDurationBars=8); tonic maj7 may sustain across multiple bars (Wave, Corcovado, One Note Samba).',
  'JB_POLICY_03 — bassPolicy.role=melodic-counterline: Vc / bass acts as a singing line independent of chord root motion; roots on beat 1 + syncopated 8th-note fill; contrary motion against top voice at cadences.',
  'JB_POLICY_04 — melodicPolicy.contour=stepwise-arc: predominantly stepwise with occasional 4th / 5th leaps; wide arcs over slow harmonic rhythm; preferredIntervalSets=[1,2,4,5,7] (semitone · whole-tone · perfect 4th · perfect 5th · diminished 5th).',
  'JB_POLICY_05 — formPolicy.narrativeArc=aaba-or-through-composed-song: 32-bar AABA the default; AABBA + through-composed Águas de Março variant covered; sectionRecallEnforced=true so A and A′ retain motivic core.',
  'JB_POLICY_06 — rhythmPolicy.antiMetric=false: pulse always present; rubato in ballads but never bar-grid abandonment; bossa pulse is soft but never lost.',
  'JB_POLICY_07 — bossaNovaFeel=true: 3+3+2 (or 2+3+3) 8th-note grouping over 4/4; melody anticipates beat by an 8th note; tied notes across barlines produce metric ambiguity without disturbing pulse.',
  'JB_POLICY_08 — lydianColourEnabled=true: raised 4 on tonic maj7 in major contexts (Wave, Girl from Ipanema, Triste); allow maj7♯11 vertical without functional dominant preparation.',
  'JB_POLICY_09 — voicingPolicy: open voicings with frequent omission of 5th; routinely add 9 / 13 / ♯11; cluster width sits between thin two-voice melody+bass and lush four-voice extended harmony.',
  'JB_POLICY_10 — repairPolicy: classical parallel-fifth / parallel-octave reflex disabled (resolveParallels=false); guide-tone semitone preservation is the primary repair target, not species voice-leading.',

  // ---- chord vocabulary + tonal language (11–17) ----
  'JB_HARM_VOCAB_01 — chord vocabulary: maj7 / maj9 / maj7♯11 (Lydian colour) · min7 / min9 (often Dorian ii) · dom7 / dom9 / dom7♭9 / dom7♯9 / dom13 · suspended dominants (sus4, sus2-add9) resolving lazily or not at all.',
  'JB_HARM_VOCAB_02 — parallel mode-mixture moves on the same root: maj7 ↔ min7 ↔ dom7 swaps allowed inside the same tonal area (e.g. Cmaj7 → Cmin7 → C7) as colour change, not modulation.',
  'JB_HARM_VOCAB_03 — chromatic mediant moves: Cmaj7 → E♭maj7 → Dmaj7 chains; minor-third and major-third root relations carry the same weight as fifth-related motion.',
  'JB_HARM_VOCAB_04 — pedal points: tonic or dominant pedal under shifting upper harmonies (especially in intros, codas, bridge re-entries) is a primary device.',
  'JB_HARM_VOCAB_05 — sustained tonic maj7: tonic chord may persist 2–8 bars without re-statement; the melody, not chord change, drives forward motion.',
  'JB_HARM_TONAL_01 — Brazilian modal colour: ii is Dorian (natural 6); I is Lydian (♯4); V is Mixolydian-with-tendency (♭7 chord tone, ♮7 melody allowed) — no enforced V→I leading-tone resolution.',
  'JB_HARM_TONAL_02 — long-range tonal plan: key areas land a minor-third or major-second apart at least as often as dominant-related; tritone-related bridges (Girl from Ipanema F → G♭) are canonical.',

  // ---- voice leading (18–21) ----
  'JB_VL_01 — guide-tone resolution: 3rds and 7ths resolve by semitone between consecutive chords; this is the primary voice-leading constraint, replacing strict parallel-motion rules.',
  'JB_VL_02 — inner voices: chromatic passing tones into chord tones on strong beats; stepwise motion preferred; sustained common tones across chord changes encouraged.',
  'JB_VL_03 — bass independence: bass-line may move stepwise or by 3rd against a static or differently-rooted chord (slash chord context); bass beat 1 may be a chord tone other than the root.',
  'JB_VL_04 — cadential contrary motion: at AABA section cadences and bridge re-entries, bass and top voice move in contrary motion (descending bass / ascending top, or the inverse).',

  // ---- melodic language (22–25) ----
  'JB_MEL_01 — stepwise-with-leaps profile: stepwise majority + occasional 4th / 5th leap; intervalPreference="diatonic-with-modal-inflections"; raised 4 in major, natural 6 in minor.',
  'JB_MEL_02 — anticipation: melody arrives on the "&" of the beat preceding a chord change; phrase resolutions land on weak beats more often than strong; tied notes across the barline accepted.',
  'JB_MEL_03 — chromatic approach: target chord tones approached by a chromatic neighbour one semitone above or below (Desafinado is the canonical case for sustained semitone-clash colour).',
  'JB_MEL_04 — long sustained notes: melodic high points may sit on a single pitch for 2+ bars over slow harmonic rhythm (Wave bridge, Corcovado opening, One Note Samba A section).',

  // ---- rhythm + groove (26–28) ----
  'JB_RHY_01 — bossa-nova grouping: comp pattern groups 8th notes as 3+3+2 or 2+3+3 inside a 4/4 bar; not a strict clave but carries the same asymmetric tilt as 3-2 / 2-3 son.',
  'JB_RHY_02 — internalised pulse: no drum-kit feel required; pulse may be carried by guitar / bass / hand-percussion alone; pulse never disappears (rhythmPolicy.antiMetric=false).',
  'JB_RHY_03 — ballad rubato: in slow ballads (Corcovado, Triste) micro-rubato is allowed; the bar grid stays intact even when individual phrases stretch / compress.',

  // ---- texture + arranging (29–31) ----
  'JB_TEX_01 — sparse texture: melody + bass + minimal harmony with explicit empty space; dense counterpoint is forbidden; inner voices remain sustained pads or sparse chord stabs.',
  'JB_TEX_02 — orchestration hints: flute / string section / nylon guitar primary; light percussion (no drum kit); melody often doubled at the octave by flute or strings.',
  'JB_TEX_03 — guitar voicing: open voicings, frequent omission of the 5th, 9 / 13 / ♯11 routinely added; alternating thumb bass + chord stabs in the 3+3+2 / 2+3+3 grouping.',

  // ---- form + bridge (32–34) ----
  'JB_FORM_01 — AABA 32-bar default; AABBA and through-composed (Águas de Março) variants covered; intro 2–4 bars (bass + chord); coda returns to opening harmony without full functional resolution.',
  'JB_FORM_02 — bridge profile: sudden modulation to a remote key (minor-third or tritone distant), fuller texture, slightly more urgent harmonic rhythm; resolution back to A via chromatic voice-leading.',
  'JB_FORM_03 — A / A′ retention: A and A′ keep motivic core (same opening cell + cadential figure); A′ may add a tag, ornament, or new closing chord but not a new theme.',

  // ---- work fingerprints (35–41) ----
  'JB_WORK_GIROTA_IPANEMA_01 — Garota de Ipanema (Girl from Ipanema): F major / Lydian (♯4 in melody over Fmaj7♯11) on A; B-section sudden modulation to G♭ major (tritone-related); swaying 8th-note phrasing with consistent up-beat entrances.',
  'JB_WORK_CORCOVADO_01 — Corcovado (Quiet Nights of Quiet Stars): sparse melodic cells, wide intervals, introspective; slow harmonic rhythm (~4–8 bars per chord at times); ballad rubato profile.',
  'JB_WORK_WAVE_01 — Wave: Lydian Cmaj7♯11 as primary colour; arching pentatonic-adjacent melody; bridge moves through minor-third-related keys; sustained tonic across multiple bars.',
  'JB_WORK_DESAFINADO_01 — Desafinado: chromatic approach notes used ironically as "out of tune" semitone clashes; melody repeatedly leans on the ♯9 / ♭9 against an underlying dom7; harmonic motion ii–V–I but coloured by altered upper structures.',
  'JB_WORK_AGUAS_DE_MARCO_01 — Águas de Março (Waters of March): additive / cumulative form (through-composed); short repeated melodic cells; modal ambiguity (major / minor third oscillation); descending stepwise harmonic skeleton.',
  'JB_WORK_ONE_NOTE_SAMBA_01 — Samba de Uma Nota Só (One Note Samba): single-note melody over moving harmony in the A section; second section adds stepwise descent; extreme melodic minimalism over rich extended harmony.',
  'JB_WORK_TRISTE_01 — Triste: lush extended chords, maj9 / min9 / dom13 colour; bossa pulse over a romantic ballad melody; long-range Lydian-then-minor-third modulation arc.',

  // ---- differentiators (42–45) ----
  'JB_DIFF_BILL_EVANS_01 — vs Bill Evans: Jobim keeps a Brazilian rhythmic inflection + simpler inner-voice texture + folk/popular song form; bossaNovaFeel=true is a Jobim-only constraint. No rubato trio language, no rootless 4-way close, no modal-jazz reharm chains.',
  'JB_DIFF_BACHARACH_01 — vs Bacharach: Jobim is asymmetric inside steady 4/4 (3+3+2) — never breaks the bar; no pop-orchestral horns-and-strings density, no abrupt meter changes, no Tin Pan Alley form discipline.',
  'JB_DIFF_DEBUSSY_01 — vs Debussy: Jobim is anchored to song form + Brazilian popular tradition; shares Lydian colour but harmonic rhythm is slower and less chromatic; no planed parallel-chord washes, never abandons groove reference.',
  'JB_DIFF_WAYNE_SHORTER_01 — vs Wayne Shorter: Jobim retains clear tonal centres + song forms + Brazilian groove; harmony serves the melody, not the other way around. No floating-tonality slabs, no anti-cadential ambiguity, no improvisational anti-form.',
] as const;

export type JobimVrbFingerprintReceipt = (typeof JOBIM_VRB_FINGERPRINT_RECEIPTS)[number];
