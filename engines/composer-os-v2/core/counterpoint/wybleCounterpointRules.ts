/*
 * WYBLE THREE-VOICE COUNTERPOINT RULES
 * Voices: G1 (guitar upper), G2 (guitar lower), B (bass)
 * Source: Perplexity research — Jimmy Wyble + three-part counterpoint
 *
 * MOTION RULES
 * - G1, G2, B are three independent melodies; forbid G2 or B doubling another voice for >2 consecutive notes
 * - On every new beat, at least 2 voices must move; avoid >2 consecutive beats where all 3 hold
 * - At cadential beats, all 3 may align rhythmically but must land on different scale degrees
 *
 * INTERVAL PREFERENCE
 * - G1–G2: prefer 3rds, 6ths, 10ths; allow 4ths/5ths; limit 2nds/7ths to weak beats
 * - B–G2, B–G1: prefer 6ths and 10ths; limit perfect 5ths/octaves to single beats or cadences
 * - Register: B at least a 10th below G1 most of the time; B at least a 3rd below G2
 *
 * RHYTHMIC OFFSET
 * - B = slowest (quarters/halves), G2 = medium (eighths/quarters), G1 = fastest (eighths/16ths)
 * - Each bar: at least 2 beats where B sustains while a guitar voice moves
 * - Forbid all 3 voices attacking every beat for more than 1 bar
 *
 * DISSONANCE
 * - 2nds/7ths (any pair) only on metrically weak positions; resolve by step on next event
 * - Strong-beat sustained intervals must be consonant (3, 6, 8, 10, perfect 5) across all pairs
 * - If two voices form a perfect interval on a strong beat, third voice must be a 3rd or 6th from one of them
 *
 * INDEPENDENT RESOLUTION
 * - Phrase end: G1 and G2 land on different chord tones/extensions; B targets root or 5th
 * - Phrase boundaries per voice may be offset by 1–2 beats or 1 bar
 *
 * CONTRARY MOTION
 * - When B moves by step on a strong beat, bias G2 to contrary motion, G1 to contrary or oblique
 * - At ii–V–I: require at least one contrary-motion pair involving B on approach to I chord
 *
 * OBLIQUE MOTION
 * - When B holds pedal (≥2 beats), G1+G2 act as Wyble duet; at least one must move every beat
 * - When G1 or G2 holds suspension, the other guitar voice must move by step or small leap
 *
 * PARALLEL MOTION LIMITS
 * - G1–G2 parallel 3rds/6ths allowed up to 3 consecutive intervals; then require motion change
 * - B pairs: forbid more than 1 consecutive parallel perfect 5th or octave
 * - Perfect interval approached in similar motion: one voice moves by step, third moves contrary
 *
 * VOICE CROSSING
 * - G1/G2 may cross for ≤1 beat; restore usual ordering immediately after
 * - B may leap above G2 for ≤1 beat then must return to lower register
 * - After any crossing: enforce at least 2 non-crossing events before next crossing
 *
 * PHRASE LENGTH
 * - 2–4 bars per voice; voices may start/end phrases offset by up to 1 bar
 * - At least one phrase per section: G2 takes more melodic role while G1 simplifies
 *
 * HARMONY RELATIONSHIP
 * - B carries roots/5ths on strong beats
 * - G1+G2 collectively realize chord quality; every strong-beat sonority contains at least one guide tone (3 or 7)
 * - Modal passages: B as mode-defining center (1, 5, occasional 4); G1/G2 explore color tones
 *
 * DEFINING RULE
 * - At every time step, harmony is built only from three independently melodic lines (G1, G2, B);
 *   never allow guitar to fall back into chord-grip + bass-root texture
 */

export const wybleCounterpointRules = {} as const;
