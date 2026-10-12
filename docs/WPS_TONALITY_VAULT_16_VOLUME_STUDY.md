# WPS — Tonality Vault 16-volume study

**Date:** 2026-10-12  
**Status:** reference study. No WPS engine edits. No score edits.  
**Manual:** Jordan Klemons, *Complete Tonality Vault Vols 1–16* (2025). Local copy only.  
**Compared with:** `docs/WPS_V1.3_ENGINE_CAPABILITY_AUDIT.md` (35 engines, unchanged).

This file is original technical analysis for Composer OS. It records pitch relationships and page numbers. It does not reproduce the manual’s prose, figures, notation, or TAB.

## 1. Executive findings

The 16 volumes are one method, repeated with different pitch facts. A left-hand shell and a right-hand melodic triad define the tonality. A second triad is built later from the passing tones of that melodic triad’s six-note bebop scale. Guitar string groups are how those notes are fingered. Those three relationships are not the same object.

`TONALITY_VAULT_DATABASE` does not store this method. Of the 16 volumes, only Cmaj7♯5 has the same shell and the same melodic-triad quality the book states, and even that row’s primary tension is the ♯5, which the book says is already inside the E major triad. The other fifteen rows name a different triad root, a different quality, or both. The database also contains `Maj6`, which is not one of the 16 volumes.

The engines that can already sound a guitar dyad or triad (`realizeTriadPair`, `buildGuitarGripLibrary`, `composeTritonePair`, `buildLiquidResponse`) are usable only after a person, or a corrected table, names the book’s pitches. Feeding them the current vault row produces a different chord.

The smallest V1.3 is a parallel 16-row relationship table, one liquid step (two notes held, one note resolving), and a guitar reduction that knows shell versus triad. Pair playback, fret checks, bass lock, and MusicXML stay on functions that already exist. `generateVaultRiff` stays out of accompaniment.

## 2. Manual and source identification

| Item | Value |
| --- | --- |
| Filename | `COMPLETE TONALITY VAULT VOLS 1-16 - 2025.docx` |
| Source found | `/Users/user/Downloads/` |
| Local copy | `reference-materials/tonality-vault/` |
| SHA-256 | `cf0ebf45a5219227d8dc48ae0e14b7b22ba1aeb82034a95ebc0fc3d49e4306f5` |
| Source and copy | equal |
| Git | ignored by `reference-materials/tonality-vault/*.docx` |
| Author | Jordan Klemons, NYC Jazz Guitar Masterclasses |
| Copyright | stated on PDF page 3. Local study use only. Not for the remote repository. |
| DOCX structure | 16 `Heading 1` contents pages, 7,343 paragraphs, 573 sections, 38 inline shapes |
| Page numbers below | matching PDF, 567 pages. The DOCX has no stable page index. Notation and TAB in both files are graphics and were not transcribed. |
| Page count versus “about 584” | the file on disk is 567 PDF pages |

Each volume repeats the same chapter order: theory, guitar adaptations of three triad inversions, primary quadratonic, melody devices, top-down four-note voicings, three-note quadratonic voicings, secondary tension, melodic-triad bebop scale, harmonic quadratonics, quadratonic dyads, triad pairs, tension layers. Volumes 14 and 15 add a chaos layer and a four-note shell harmonisation of the bebop scale. Volumes 14 and 15 also move the advancing-melody chapters to after the triad pairs.

Harris notation, as used in every volume: uppercase `T` is a major triad, lowercase `t` is a minor triad, the number is the chord degree the triad is built on. Augmented is written `G+`. Diminished is written with the diminished sign. A quadratonic is the melodic triad plus one tension, named from the triad (`E / 2` means E major plus its 2nd).

Hierarchy used to pick tensions, stated in every volume: 3, 7, 5, 9, 11, 13, root. A degree is skipped when it is already in the melodic triad, when adding it builds a stronger triad than the one being coloured, or when it is heard as a 7th or ♭7th of that triad. Volume 2 states an extra rule: if a triad tone is the chord’s ♭9, the first added note is the chord root, unless resolving it would turn major into minor or minor into diminished.

Several later volumes still contain an earlier volume’s sentence (a “sus9” or “minMaj9” in a digging-deeper introduction, or a layer-two pair copied from the next booklet). Where the triad-pair page and the layer-two paragraph disagree, the triad-pair page is the pair, and the disagreement is recorded on that row.

## 3. All 16 chordal tonalities

All spellings are for a C root. Transpose by the stated `T` / `t` label. Shared pitches are notes that sit in both the shell and the melodic triad. The shell is a chord grip, not a second independent triad.

| Vol | Symbol | PDF | LH shell | RH melodic triad | Label | Shared | Primary tension | Secondary tension | Top-down under-note | Resolution / tension pair |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Cmaj7♯5 | 8 | C E B | E G♯ B, E major | T3 | E, B | F♯, 2 of E. The 9th D is skipped as ♭7 of E | A, 4 of E | C, the root. 3, ♯5, and 7 are already in the triad | E major / F♯ diminished |
| 2 | Csus♭9 | 42 | C F B | D♭ F B♭, B♭ minor | tb7 | F; B♭ shared on the root-5 guitar shape | C, the root, by the ♭9 rule. Heard as 2 of B♭ minor | G, 6 of B♭ minor | G under B♭ minor | B♭ minor / C minor |
| 3 | CminMaj13♯11(9) | 75 | C E♭ B | D F♯ A, D major | T2 | none | E♭, ♭2 of D | B, absent from D major. The question line on p.86 names Maj7♯11♯9; the answer is computed against the D triad | E♭ under D major | Pair page p.95: D / G+. Layer two on p.97 names B major / C and is the next volume’s paragraph |
| 4 | Cmaj7♯11♯9 | 108 | C E B | D♯ F♯ B, B major | T7 | B | E, 4 of B | G, ♭6 of B | E under B major | B major / C. The header on p.108 says “sus9” while defining this chord |
| 5 | Csus9 | 141 | C F B♭ | D F B♭, B♭ major. One sentence prints “Bbb”; the same paragraph calls it B♭ major | Tb7 | F, B♭ | G, 6 of B♭. For sus, the 4th counts as the 3rd in the hierarchy | C, 2 of B♭. A as 13 is skipped because it is a 7th of B♭ | G, with the root also allowed. Result described as ♭7, 9, 4, plus 5 or root | B♭ major / C. Quality of C is not printed |
| 6 | Cmin9 | 176 | C E♭ B♭ | D G B♭, G minor | t5 | B♭ | A, 2 of G. E♭ is skipped because it builds E♭ major. F is skipped because it builds B♭ major | C, the root | E♭, the chord 3rd. The triad is already 5, ♭7, 9 | G minor / A diminished |
| 7 | Cmaj7 | 211 | C E B | E G B, E minor | t3 | E, B | A, 4 of E. F is skipped as a G7 sound. D is skipped as ♭7 and as a G major | C, ♭6 of E minor, taken because the hierarchy is otherwise exhausted | C, the root. The triad is already 3, 5, 7 | E minor / F major |
| 8 | C°7♭13 | 245 | 1–3–♭5–♭♭7. The ♭5 stays in the shell because it defines the diminished chord | C E♭ A♭, A♭ major | Tb6 | C, E♭ | A (B♭♭), ♭2 of A♭ | G♭, ♭7 of A♭ | Same note as the primary tension. Printed result: ♭♭7, ♭3, ♭13, root | A♭ / D. Quality of D is not printed |
| 9 | C13♯11(9) | 279 | C E B♭ | D F♯ A, D major | T2 | none | E, 2 of D | B♭, ♭7 of the chord, not in D major | B♭, not E. E under D is rejected as a sus voicing. Printed result: ♭7, 9, ♯11, 13 | D major / E diminished |
| 10 | Cmaj7♯11 | 313 | C E B | E G B, E minor | t3 | E, B | F♯, 2 of E minor | A, 4 of E minor. ♯4 is allowed as a blues colour on this minor-triad tension 4 | Prose starts the same root argument as volume 7 and does not finish the pitch in the following text | E minor / F♯ diminished |
| 11 | CminMaj9 | 346 | C E♭ B | D G B, G major | T5 | B | E♭, ♭6 of G | A, 2 of G. F is skipped because it makes a G7 | E♭. Printed result: ♭3, 5, 7, 9 | G major / A diminished |
| 12 | Cmin7♭5 | 380 | C E♭ B♭. The ♭5 is inside the melodic triad, not added again in this shell spelling | E♭ G♭ B♭, E♭ minor | tb3 | E♭, B♭ | F, 2 of E♭ minor | A♭, 4 of E♭ minor. ♯4 allowed as blues | C, the root. 3, ♭5, and ♭7 are already in the triad | Pair page p.401: E♭ minor / F minor. Layer two on p.404 names A♭ major / B♭ diminished and belongs to volume 13 |
| 13 | C7♯9♯5 | 414 | C E B♭ | A♭ C E♭, A♭ major | Tb6 | C | E, ♭6 of A♭ | B♭, 2 of A♭ | E under A♭ major | A♭ major / B♭ diminished. Adding F♯ as the next hierarchy tone builds G♭ major, which the book treats as the stable triad (`Gb / b7`), not as a colour on the diminished triad |
| 14 | C13♭9 | 449 | C E B♭ | A C♯ E, A major | T6 | E | B♭, ♭2 of A | G, ♭7 of A | B♭ under A major | A major / E♭ major |
| 15 | Cmin11(9) | 492 | C E♭ B♭ | B♭ D F, B♭ major | Tb7 | B♭ | E♭, 4 of B♭ | G, 6 of B♭ | E♭ under B♭ major | B♭ major / C minor. Layer-two quadratonic adds A, the 13th: `C- / 6` |
| 16 | Cmaj9 | 533 | C E B | G B D, G major | T5 | B | E, 6 of G | A, 2 of G. Natural 11 is skipped here because it is a 7th of G | E under G major | G major / A minor. The layer-two tension on A minor is F, the natural 11, written `A- / b6`. Lydian F♯ is declined for this ionian major |

`Maj6` is in `tonalityVaultDatabase.ts` and in none of these 16 booklets.

## 4. Pianistic LH/RH methodology

The generating picture is a pianist. The left hand holds a shell. The right hand holds a triad. For Cmaj7♯5 the shell is C–E–B and the right hand is E–G♯–B. C–E–B is a maj7 shell. It is not a second major or minor triad, and it is not the resolution structure.

The right-hand triad is the melodic centre. Its root, third, and fifth are the stable melody notes. The chord root is often absent from that triad. Melodies aim at the triad root as “do”, not at the chord root.

Three pianistic inversions keep the shell underneath and invert only the right-hand triad. On the guitar the same idea is attempted by putting the shell on the lower three strings and the triad inversions on strings 1–2–3. When the hand cannot hold all six notes, the book drops a shell tone that the triad already contains, shares one pitch (very often on string 3), or plays the root and then the rest of the chord. Those are fingering exceptions. They do not change the shell or the triad.

Concrete splits that are not “two triads”:

- Cmaj7 and Cmaj7♯11: left hand C–E–B, right hand E–G–B. The right hand is minor. Replacing G with G♯ produces volume 1, a different tonality.
- Cmin7♭5: left hand C–E♭–B♭, right hand E♭–G♭–B♭. The ♭5 lives in the right hand.
- C°7♭13: the left hand keeps the ♭5 because the diminished shell needs it, and the right hand is A♭ major, not a diminished triad.
- C13♯11(9): left hand C–E–B♭, right hand D–F♯–A. No pitch in common. The hands do not share a note, and the right hand is still the only melodic triad.

Top-down four-note voicings start from the right-hand triad and add one bass note under it. The usual first try is the chord third. If that pitch is already in the triad, or if it produces an unwanted sus or dominant, the book picks the next defining shell tone. The under-note is therefore not always the primary tension and not always the root. Volume 9 is the clear case: the third E is available and is rejected, and the under-note is B♭.

## 5. Guitar string-group adaptations

Every volume states the same transfer: shell on the bottom three strings, melodic-triad inversions on strings 1–2–3, three inversions. Volume 7 says this in string numbers: Cmaj7 shell on strings 3–6, E minor triad on strings 1–3, so string 3 is in both groups and is the shared B.

The manual does not publish a second theory called “strings 5–4–3” or “strings 4–3–2”. Those groups are what remains when the six-note grip is reduced:

| Group | Role in the method | Typical content |
| --- | --- | --- |
| 6–5–4 | Full lower shell when the hand can hold it | Root, shell third or fourth, shell seventh |
| 5–4–3 | Partial shell, root-5 shapes, a shared pivot on string 3 | One or two shell tones, often omitting a note the triad already has |
| 4–3–2 | Upper partial, or a shell tone plus two triad tones | Moving dyad against one held note |
| 3–2–1 | Right-hand triad inversions | The three inversions the book actually draws |

Alternating structures, partial shells, upper-triad inversions, and moving dyads are fingerings of the shell and the triad. They do not define a new chord. A note doubled on string 4 and string 1 (volume 1, third inversion, the E) is one pitch class in two registers.

Recurring guitar facts, all from the exception paragraphs:

- Prefer a shell tone the triad does not already contain.
- Share the one pitch that belongs to both hands rather than duplicating it.
- Replace 3 or 7 with 5 or 6 only when the real shell will not fit. Volume 1 also allows ♯11 in the lower structure for the same reason.
- Break the chord: root on the downbeat, upper voices after it. With an upright bass, that root attack is often unnecessary.
- Rootless upper structures are an explicit option in a bass setting or for a lighter sound (stated in the harmonic-quadratonic chapter of volume 1 and repeated as the physical limit in the dominant volumes).
- Volume 16’s third inversion drops one triad tone an octave so that one triad note sits in the shell register and the other two sit on the top two strings. That is a registral displacement of the same G major triad, not a new harmony.

## 6. Resolution/tension triad-pair methodology

The resolution triad is the right-hand melodic triad. The tension triad is the three passing tones inserted between those triad tones in the six-note bebop scale. The scale is an even rhythmic device: triad tones on the strong eighths, passing tones on the weak eighths. The passing tones are chosen to respect the parent chord, which is why two of them are usually the primary and secondary quadratonic tensions.

This pair is not the left-hand shell. For Cmaj7♯5 the shell is C–E–B, the resolution triad is E major, and the tension triad is F♯–A–C. C–E–B contains neither the F♯ diminished triad nor a second major triad.

The pair is also not a tritone-substitution engine. Volume 14 happens to pair A major with E♭ major, a tritone apart. That is a consequence of the passing tones on C13♭9. `composeTritonePair` builds a mirror from guitar notes already in a file. It does not look up this pair.

Harmonic use in the book: arpeggiate either triad, or play dyads that omit one note from each, or stagger the voices so the top note moves to the next triad while the bottom note is still the previous one. That stagger is one liquid-harmony surface. The other surface is inside a single quadratonic (section 7).

Layer two treats the tension triad as a temporary centre and adds one more chord tone from the hierarchy, producing a tension quadratonic. If that added note builds a major triad stronger than the diminished tension triad, the major triad becomes the thing that feels stable. Volume 1: F♯ diminished plus D is heard as D major with a ♭7. Volume 13: F♯ on B♭ diminished is heard as G♭ major with a ♭7.

## 7. Quadratonic harmony and Liquid Harmony

A quadratonic is the melodic triad plus one tension. Primary quadratonic: the first hierarchy note that survives the skips. Secondary: the next one, practised on its own before the two are joined into a pentatonic. The pentatonic is those five notes, with the triad still heard as the points of rest.

Harmonic quadratonic, stated as the simple liquid device: sound three of the four notes, the tension replacing the nearest triad tone, so the chord is two triad tones plus the tension. Hold the two triad tones. Move the tension back into the omitted triad tone. Two notes stay. One note moves. The chord does not change. The colour tightens.

Quadratonic dyads pair every other note of that four-note set. Volume 16 states the real set for Cmaj9: G–B–D–E grouped as G with D, and B with E. Volume 1’s dyad paragraph illustrates the grouping with B♭–D–F–G. That illustration is not the E–F♯–G♯–B quadratonic of Cmaj7♯5. Use the grouping rule, and use each volume’s own four notes.

Three-note quadratonic inversions number the four pitch classes and then delete one number at each turn (the book’s “drop 2” that removes the note instead of dropping it an octave). Adjacent inversions do not contain the same three pitch classes. One pitch leaves and another arrives. That is the point.

Liquid harmony, in the book’s own picture, is a frozen voicing melted enough that part of it can move while part keeps sounding. It is motion inside one chord. The bebop-scale harmonisation walks that motion from one quadratonic to the other so each scale note is a chord, still with two voices holding.

Tension layers:

| Layer | What it is | Where it exists |
| --- | --- | --- |
| One | Primary quadratonic. Mild tension, returns at once to the triad | All 16 |
| Two | Tension triad plus one further hierarchy tone | All 16. Volumes 3 and 12 have an uncorrected pair name in this chapter; use section 3 |
| Three, chaos | The five pitch classes outside the seven-note quadratonic pair, organised as triads if any exist | Volumes 14 and 15 only |

Volume 14’s chaos text names F minor as the triad inside the leftover notes. The circled pitch names are a graphic and are not repeated here. Volume 15 names the leftover set B, C♯, E, F♯, G♯, and the triads E major and C♯ minor, with quadratonics `E / 2, 6` and `C♯-`.

Volumes 1–13 and 16 do not have this chaos chapter. Do not copy F minor or the E-major sidestep onto them.

## 8. Simple chordal applications

Use one of these for a whole narrative span. Change inversion, register, and which voice moves. Do not change device every bar.

**Shell plus upper triad.** What moves: the right-hand triad’s inversion. What stays: the shell, or the one shell tone that still fits. Effect: the pianistic chord, heard as one sound. Guitar: often five notes, or root then the upper four. Bass: if the bass already sounds the root, the guitar can drop it and keep string 3–6 for shell third and seventh plus a reduced triad.

**Three-note voicing.** What moves: one member of the four-note top-down set, so the omitted pitch changes. What stays: two pitch classes. Effect: the colour stays recognisable while the ear loses and finds a note. Guitar: one triad on strings 3–2–1, or a dyad plus the under-note. Bass: carries any shell tone the three notes left out.

**Rootless accompaniment.** What moves: upper triad or dyad. What stays: nothing in the bass register of the guitar. Effect: the impressionist version the harmonic-quadratonic chapter allows once a bass player is present. Guitar: strings 4–3–2 or 3–2–1 only. Bass: the root, and whichever of 3 or 7 the guitar did not keep.

**Top-down four-note.** What moves: the inversion of the melodic triad. What stays: the single under-note, in a close register. Effect: slash-chord clarity without a full shell. Guitar: four notes inside a small span, or the under-note plus a dyad if the span breaks. Bass: may double the under-note or supply the root the guitar omitted. These are different jobs. Pick one.

**Moving quadratonic dyads.** What moves: one dyad to its partner (every other note of the four). What stays: a common tone when the pairing shares one, otherwise the register. Effect: harmony without a block chord. Guitar: two adjacent string pairs. Bass: root or shell tone the dyads do not contain.

Situations: a ballad bar, a held bass note, a colour bar that should not become a chorus of comping. The Mirror’s frozen triads and Impossible Metaphysics’ successive dyads are the kind of span these belong in. Wrong Turning’s punctuations should stay short.

## 9. Advanced chordal applications

**Three-note quadratonic inversions.** What moves: the pitch class that enters. What stays: two of the four. Effect: a chain of related chords whose membership changes. Guitar: keep one string set. Bass: hold the root through the chain so the changing upper note reads as colour, not as a modulation.

**Liquid step.** What moves: the tension into the triad tone it replaced. What stays: the other two notes, still ringing. Effect: resolution inside the chord. Guitar: the moving note must be a small fret change; the held notes stay fretted. Bass: do not move with the guitar. The bass is the fixed reference the liquid voice resolves against.

**Resolution/tension exchange.** What moves: the voices that are not common to both triads. What stays: any shared pitch class, sustained. Effect: the bebop pair as harmony. Cmaj7♯5 has no common tone between E major and F♯ diminished, so every voice moves and the exchange should be short. Cmin11(9) shares B♭ between B♭ major and C minor; that B♭ can hold. Guitar: `realizeTriadPair` already scores this once both triads are named. Bass: the parent root, unchanged, so the tension triad does not sound like a new chord.

**Harmonised melodic fragment.** What moves: a quadratonic melody note, each one with a two- or three-note chord from the same four. What stays: one inner voice. Effect: the line and the chord are the same set. Guitar: melody on string 1 or 2, dyad under it, then back to a single line. Bass: shell tones not used in the guitar chord.

**Inner-voice counterpoint.** What moves: one inner voice by step between shell tone, triad tone, and tension. What stays: the outer dyad. Effect: pianistic motion without a second melody. Guitar: possible when the moving voice is on string 3 or 4 and the outer notes are open enough to hold. Bass: remains the leadsheet. This is not a second guitar part and not a Wyble etude.

**Tension-layer change.** What moves: the centre, from melodic triad to tension triad, and only then to chaos where chaos exists. What stays: the bass root and at least one common colour if the pair has one. Effect: a rung on the ladder, still the same chord. Guitar: one pair of triads for the span. Chaos triads (F minor on 13♭9; E major and C♯ minor on min11) are a later rung, not the default colour. Bass: the original root. If the bass moves, the layer change is no longer inside one tonality.

**Registral displacement and silence.** What moves: the same pitches into another octave, or off entirely. What stays: the pitch-class set, or nothing. Effect: the volume 16 device of dropping one triad tone an octave, or a bar in which the bass alone is the harmony. Guitar: a rest is a rest. Liquid response must not fill a protected rest. Bass: continues.

None of these is compulsory. A span that is only liquid dyads is complete.

## 10. Guitar and upright-bass implications

The duo already has a bass line. The guitar’s job is the part of the pianistic chord the bass is not playing.

- Bass on the root: guitar may play the melodic triad, a dyad from it, or triad plus one non-root shell tone.
- Bass on the shell third or seventh: guitar should not stack that pitch again in the same register. The book’s shared-note solutions become unisons with the bass and can be omitted.
- Bass holding: the guitar’s moving voice is the liquid note. Two guitar notes can ring.
- Bass moving: the guitar should hold. Two moving parts at once stop being shell-plus-triad and become a new counterpoint.
- Feasibility: four-fret span, the existing fret solver, and the book’s own exceptions (omit, share, break the chord, thumb only as a last resort). A six-note piano chord that the book already marks unplayable should not be exported as a guitar chord.
- Silence: bars the spec marks as guitar rest stay empty. The bass is the harmony there.

Expressive arrangements are reductions: one dyad family, one inversion change, one liquid resolution, then the line returns. They are not a chorus of Freddie Green, and they are not an eighth-note vault riff.

## 11. Manual findings versus the existing 35-engine audit

The audit was not repeated. Its classes stand: READY 5, ADAPTABLE 15, ANALYTICAL 10, NOT RELEVANT 5. This section asks whether those findings implement the book.

What the audit got right, and what this reading confirms:

- `generateVaultRiff` and `generateVaultTriadPairMonophonicBar` are monophonic eighth-note lines. They are not chordal accompaniment, including the styles named dyad and triad-pair.
- `planLiquidHarmony` splits a quadratonic into one melody pitch class and a remainder. It does not hold two notes and move one.
- `LayerStateMachine` emits the names primary, tension, chaos, recover, resolve. It does not build the book’s tension quadratonic or the chaos triads.
- `buildTopDownVoicing` returns four semitone offsets, bass near MIDI 48 and upper notes near MIDI 60. It does not fret a guitar dyad.
- `realizeTriadPair` does place parent triads on the guitar, hold common tones, and move the other voices, with a fret check.
- `buildGuitarGripLibrary` does enumerate dyads, triads, and four-note grips inside four frets.
- `runCompingGenerator` stacks shells on a beat grid. That is a different accompaniment.
- Liquid Response can write a triad-pair realisation into a WWH file and will also occupy rests unless the caller forbids it.
- Song Mode and the golden-path duo rewrite harmony and bass. They fail a locked bass.

What the audit’s description of the vault table does not survive the book:

The table has 17 types. The book has 16, and no Maj6. The audit’s summary that each row stores “left-hand shell degrees, a melodic triad, and one primary tension” is true of the file. Those values match the book for the Cmaj7♯5 shell and for that row’s major triad on 3. They do not match the book’s triad root or quality for the other fifteen volumes, and the Cmaj7♯5 primary tension in the table is degree 5, which the book treats as already inside E major. The real primary tension is F♯.

`buildTopDownVoicing` and `selectQuadratonicMelodySpec` read that table. A guitar grip built from their output is a fingering of the wrong triad. The grip library’s mechanism is sound. Its current vault input is not the manual.

`realizeTriadPair` can sound E major against F♯ diminished only if something names both triads. Nothing in the 35 modules derives that pair from Cmaj7♯5.

## 12. IMPLEMENTED / PARTIAL / MISSING

“Implemented” here means the musical result exists and can be exported. A function name is not enough.

| # | Capability | Status | Why |
| --- | --- | --- | --- |
| 1 | Simultaneous guitar notes, dyad or triad, not a monophonic eighth-note line | IMPLEMENTED | `buildGuitarGripLibrary`, `realizeTriadPair`, `composeTritonePair`, `buildLiquidResponse` return fretted or timed pitches. `generateVaultRiff` does not count. |
| 2 | The 16 volumes’ shell, melodic triad, tensions, and pairs as data | MISSING | The 17-row table disagrees with sections 3–6. Maj6 is extra. Maj7 is stored as a major triad on 3; the book’s triad is E minor. |
| 3 | Three inversions of the melodic triad kept over the shell | MISSING | No function inverts only the right-hand triad and retains the shell. |
| 4 | Guitar reduction onto 6–5–4, 5–4–3, 4–3–2, 3–2–1, with share and omit | PARTIAL | Grips have strings and a four-fret span. They do not know shell versus triad, and they do not apply the book’s omission rules. |
| 5 | Top-down four-note voicing with the book’s under-note | PARTIAL | `buildTopDownVoicing` is the right shape and the wrong row. Output is keyboard offsets, not a guitar chord. |
| 6 | Three-note inversions that drop a different quadratonic member each time | MISSING | Grip triads are every three-note subset. They are not this ordered omission. |
| 7 | Dyads that pair every other quadratonic note | PARTIAL | The library builds dyads. It does not select G–D against B–E as the pairing rule. |
| 8 | Resolution/tension pairs taken from the bebop passing tones | MISSING | No catalogue. A person must name both triads. |
| 9 | Once both triads are named, hold the common tones and move the rest | IMPLEMENTED | `realizeTriadPair`. |
| 10 | Inside one quadratonic: two notes hold, the tension resolves to the missing triad tone | MISSING | `planLiquidHarmony` labels pitch classes. `realizeTriadPair` moves between two parent triads. Neither is this one-note resolution. |
| 11 | Layer-two tension quadratonics, and chaos triads on 13♭9 and min11 only | MISSING | State names exist. The pitch sets do not. |
| 12 | Drop a guitar tone the locked bass already sounds | PARTIAL | WPS bass lock and Liquid Response’s bass lock keep the bass. They do not choose the guitar reduction from it. |
| 13 | Leave protected guitar rests empty | PARTIAL | The WPS lock lists them. `buildLiquidResponse` treats rests as space it may fill. |
| 14 | MusicXML for a chosen guitar event | IMPLEMENTED | Triad-pair, tritone-pair, and Liquid Response paths write WWH XML. The vault table writes nothing. |
| 15 | Chordal rhythm other than a repeated beat grid or constant eighths | PARTIAL | `realizeTriadPair` follows caller slots. `runCompingGenerator` is the grid. The vault riff is the eighths. |
| 16 | A guitar role for a span, with no required comping chorus | MISSING | Described in the audit. Not a field the WPS spec enforces. |

Counts: **IMPLEMENTED 3**, **PARTIAL 6**, **MISSING 7**.

The largest musical gap is row 2. Rows 1, 9, and 14 can already sound and export a chord. They cannot yet sound these chords, because the chords were never stored.

## 13. WPS V1.3 implementation requirements

V1.3 makes the book’s harmony available to a locked-bass duo. It does not become a new composition platform.

1. Authentic shell and melodic triad, including the three inversions as data (which triad tones are on top, which shell tones are under them).
2. The resolution/tension pair for each of the 16, with second-triad quality left unknown where section 3 says the book does not print it.
3. Guitar reductions on the four string groups, using the book’s omit, share, and root-then-upper-voices options.
4. Real dyad and triad events. Not pitch-class advice. Not eighth-note arpeggios.
5. The liquid step: two pitch classes identical across two events, one pitch class moving from tension to triad tone.
6. The guitar chord may omit any pitch class the bass event already sounds. The bass events are not rewritten.
7. One role per span. Inside the span, inversion, register, articulation, and which voice moves may change. The device does not.
8. MusicXML through the existing WWH writer. Fret solver after the notes exist. One DCR pass on that passage. No official numeric GCE. V1.1 files stay the checked baseline.

Preserve source LOCK, the original bass, protected guitar silences, guitar feasibility, canonical GCE, one DCR refinement, and the frozen V1.1 baseline.

Out of scope: retuning all 35 engines, a comping chorus, Song Mode regeneration, Wyble etude import, Respond replace/insert, new rehearsal letters, audio, and chaos-layer generation on volumes that do not have one.

## 14. Minimal integration plan

Do not replace `TONALITY_VAULT_DATABASE` in place. Vault riff tests and `buildTopDownVoicing` depend on those 17 rows. Add a parallel record, one entry per volume, sourced from section 3. Keep Maj6 on the old table only.

Reuse without change of behaviour:

- `realizeTriadPair` — playback of a pair once the new record names both triads and the caller supplies slots that avoid protected rests.
- `buildGuitarGripLibrary` — enumeration, called with the manual pitch classes, then filtered to the four string groups and to span.
- `assessGuitarFeasibility` / `solveFretPath` — the gate WPS already runs.
- `buildLiquidResponse` — only if the caller passes a range that contains no protected rest. It is not the liquid step.
- WPS bass lock, metre lock, rehearsal-mark lock, V1.1 baseline test.

Do not call, for this accompaniment: `generateVaultRiff`, `generateVaultTriadPairMonophonicBar`, `planLiquidHarmony` as a note generator, `runCompingGenerator` as the default texture, Song Mode, the golden-path duo, or the chart-to-riff pipeline.

New, and actually required:

1. The 16-row record. Data, not an engine. Fields: shell pitch classes, triad pitch classes, triad quality, Harris label, primary tension, secondary tension, top-down under-note, resolution triad, tension triad, and a flag where the book’s layer-two paragraph contradicts the pair page.
2. A liquid-step function: input the triad and the tension; output two events; two pitch classes held; the tension moves to the triad tone it displaced. A few dozen lines. `realizeTriadPair` does not do this, because there is only one parent triad.
3. A reduction function: input the record, the bass pitch class, and a string group; output a dyad or triad that prefers triad tones, drops pitches the bass covers, and shares rather than doubles a shell/triad common tone. The grip library can be the candidate generator inside it. The selection rule is the new part.

No fourth engine. Role text can be an optional list on the existing song spec, printed by WPS, empty list still valid, no new FAIL. That is the audit’s blueprint, still the right size.

First musical test, unchanged in location from the audit: **The Mirror, bars 30–33**, in a new edition after approval, not in V1.1. One liquid dyad or one pair exchange whose root matches the locked bass pitch class, taken from the new record. Common tone held where the set has one. Position stable. Stop before the written G6 at 34. Bars 9–11 and 51 stay as they are. Rests at 12, 15, 40, and 62 stay empty. One direction at bar 30 if any. No new letter. No `generateVaultRiff`.

If the bass pitch class at 30–33 is not a sensible root for any of the 16, the test moves to the nearest held-bass span where a row fits. It does not retune the bass.

## 15. Tests required for implementation

When implementation starts, these are the checks. They are not run by this study.

- For each of the 16 C-root rows: shell, triad, primary tension, and pair equal section 3. Cmaj7 is E minor. Cmaj7♯5 is E major. They must not collapse.
- Cmin7♭5 shell is C–E♭–B♭, and G♭ belongs to the E♭ minor triad.
- C°7♭13 melodic triad is A♭ major, not a diminished triad on the 7th.
- The parallel record does not change `TONALITY_VAULT_DATABASE` or current vault-riff assertions.
- Liquid step on Cmaj7♯5: events share two of E, G♯, B; the moving pitch goes from F♯ to the triad tone it replaced; the other two pitch classes match.
- Reduction with bass pitch class C omits C from the guitar dyad. A different bass pitch class does not delete a triad tone the bass is not playing.
- String-group filter never returns a grip outside 6–5–4, 5–4–3, 4–3–2, or 3–2–1, and never outside four frets.
- A protected rest bar is unchanged after any writer runs.
- Bass event stream and rehearsal letters are unchanged.
- One dyad pair round-trips through MusicXML as two simultaneous pitches, not two successive eighths.
- `wpsBaseline` still passes on the V1.1 files.
- One DCR note attached to the trial passage only.

## 16. Manual page references

PDF pages. Theory question pages are the volume anchors. Guitar exceptions are the page of “A few exceptions are being made here,” which is the page after each theory opener or the same spread.

| Vol | Theory | Guitar exceptions | Primary tension stated | Secondary | Triad pair | Liquid / layers | Chaos or special |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Cmaj7♯5 | 8–9 | 10 | 12 | 21 | 29 | 27–28, 31–33 | Top-down under-note 17. Dyad illustration on 28 is not this quadratonic |
| 2 Csus♭9 | 42–43 | 43–44 | 44–45 (♭9 rule) | 54 | 62 | 60, 64 | Under-note G on 50 |
| 3 CminMaj13♯11(9) | 75–76 | 76–77 | 78 | 86 (question names the wrong chord) | 95 | 93, 97 | Pair/layer disagreement 95 vs 97. Under-note E♭ on 83 |
| 4 Cmaj7♯11♯9 | 108–109 | 109–110 | 111 | 120 | 128 | 126, 130 | Under-note E on 116 |
| 5 Csus9 | 141–142 | 142–143 | 144 | 154 | 162 | 160, 164 | Under-note 150 |
| 6 Cmin9 | 176–177 | 177–178 | 179–180 | 188 | 197 | 195, 199 | Under-note is the 3rd, 185 |
| 7 Cmaj7 | 211–212 | 212–213 | 214–215 | 224 | 232 | 230, 233 | Shell on strings 3–6, triad on 1–3, p.213. Under-note root, 220 |
| 8 C°7♭13 | 245–246 | 246–247 | 248 | 257 | 265 | 263, 267 | Result pitches 254 |
| 9 C13♯11(9) | 279–280 | 280–281 | 282 | 290 | 299 | 297, 301 | Result pitches ♭7 9 ♯11 13 on 288 |
| 10 Cmaj7♯11 | 313–314 | 314–315 | 316 | 326 | 334 | 332, 336 | Under-note sentence incomplete, 322 |
| 11 CminMaj9 | 346–347 | 347–348 | 349 | 360 | 368 | 366, 370 | Result ♭3 5 7 9 on 357 |
| 12 Cmin7♭5 | 380–381 | 381–382 | 383–384 | 393 | 401 | 399, 404 | Layer-two pair on 404 is volume 13’s. Under-note C on 389 |
| 13 C7♯9♯5 | 414–415 | 415–416 | 417 | 428 | 437 | 435, 439–440 | G♭ / ♭7 exception 440. Under-note E on 424 |
| 14 C13♭9 | 449–450 | 450–451 | 452 | 459 | 469 | 467, 470, 478–479 | Chaos 481–483, F minor named. Four-note shell 468. Under-note B♭ on 455 |
| 15 Cmin11(9) | 492–493 | 493–494 | 495 | 501 | 512 | 509, 512, 520–524 | Chaos pitches and E / C♯ minor on 523–524. `C- / 6` on 522. Under-note E♭ on 497. Four-note shell 511 |
| 16 Cmaj9 | 533–534 | 534–535 | 536 | 544 | 559 | 557, 560–563 | Real dyad grouping G–D and B–E on 559. `A- / b6` on 563. Under-note E on 540 |

Liquid harmony is defined in prose near the end of each booklet (first statement on page 27, then the same explanation in each later volume). The one-sentence form used beside the staggered dyads is on pages 403, 438, 470, 512, and 560: part of the chord moves, part does not.

Notation, TAB, and chord diagrams on these pages were seen as graphics. Fret numbers inside those graphics are not in this study.
