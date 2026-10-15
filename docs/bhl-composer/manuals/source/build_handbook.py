"""BHL Creative Scenarios & Integration Handbook, version 1.0."""

from pathlib import Path

from manual_engine import Manual

ROOT = Path(__file__).resolve().parent.parent
SHOT = ROOT / "assets" / "screenshots"
MUSIC = ROOT / "assets" / "music"


def add_scenario(m: Manual, number: int, title: str, aim: str, start: str, settings: list[str], steps: list[str], result: str, variations: list[str], limits: str):
    anchor = f"s{number:02d}"
    m.h2(f"Scenario {number}. {title}", anchor)
    m.h3("Musical aim", f"{anchor}a")
    m.p(aim)
    m.h3("Starting material", f"{anchor}b")
    m.p(start)
    m.h3("BHL settings", f"{anchor}c")
    m.bullets(settings)
    m.h3("Procedure", f"{anchor}d")
    m.numbers(steps)
    m.h3("Expected musical result", f"{anchor}e")
    m.p(result)
    m.h3("Variations", f"{anchor}f")
    m.bullets(variations)
    m.h3("Limitations", f"{anchor}g")
    m.p(limits)


def build() -> Manual:
    m = Manual(
        "BHL Composer",
        "Creative Scenarios and Integration Handbook",
        "BHL-CREATIVE-SCENARIOS-HANDBOOK-V1.0",
    )
    m.h1("How to use this handbook", "how")
    m.p("Each scenario is a musical job you can do on the BHL page of the current Composer OS web application. The controls are the ones on that page. The installed desktop application dated 13 October 2026 does not yet contain them. This handbook does not ask you to install software, to program, or to approve a generated line by ear.")
    m.p("Read the aim before you touch a menu. The settings name the real controls. The result describes what the process is built to produce. It is not a promise of a beautiful piece. Every candidate remains marked **CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED**.")
    m.p("Worlds, colours, and transfers are summarised in [[worlds|Chapter B]], [[colours|Chapter C]], and [[integrate|Chapter G]]. The Quick Start Guide, version 1.0, is the shorter path if you have not locked a score before.")
    m.p("Cross-engine facts that must not be blurred:")
    m.bullets([
        "All twenty colour collections are available as BHL development colours. On worlds A to D and F they only sound where the world already contains those pitches.",
        "World E uses the selected collection as its pitch source.",
        "The separate Pentatonic page can run path transform and phrase generation for all twenty colours. An unknown colour is refused. It does not substitute minor pentatonic.",
        "Performance Composer accepts an exported MusicXML file through **Respond**. It does not accept a BHL project object.",
        "The Riff Engine does not import a BHL project. Contour and rhythm travel into BHL only.",
    ])

    m.h1("A. Starting a composition", "start")
    m.p("A BHL piece begins as a guitar and upright bass, either from an empty count of bars or from a span of a score you already trust. The bass will be locked. The guitar is the voice you develop. Think of the guitar as a chamber partner: line, dyad, triad, counterline, or silence. Not a chord on every beat.")
    m.figure(str(SHOT / "bhl-10-scratch.png"), "Figure 1. New composition set to 16 bars, 4 beats, beat type 4, tempo 92. Import and lock is on the same screen and is used only after the new file exists.")

    add_scenario(
        m, 1, "Sixteen-bar chamber canvas",
        "A short duo with room for a statement, a turn, and a quiet close.",
        "No existing score. You only need a length, a metre, and a tempo.",
        ["Mode: New composition.", "Bars 16, beats 4, beat type 4, tempo 92.", "After the file exists: From bar 1, To bar 16, seed of your choice.", "Harmonic world E · Pentatonic Harmony.", "Protected guitar bars empty.", "Approach: Chamber lyricism."],
        ["Click BHL.", "Create the guitar and bass score.", "Import and lock the new path for bars 1 to 16.", "Leave the region controls on the approach.", "Generate three candidates."],
        "A sixteen-bar 4/4 duo at 92. The bass holds long tones. Chamber lyricism asks the guitar for a sparse single line and space after the bass. The three candidates share that posture and differ by seed.",
        ["Tempo 72 makes the same bars feel like a ballad. See Scenario 65.", "World A instead of E makes the guitar think in two major triads a tone apart."],
        "Six bars is the shortest new score. Sixty-four is the longest. The new file must still be locked before Generate three candidates will run.",
    )
    add_scenario(
        m, 2, "The shortest study, six bars",
        "A motif and one answer, with no time for a large form.",
        "None. A six-bar new score.",
        ["Mode: New composition.", "Bars 6, beats 4, beat type 4, tempo 84.", "World A · Triad Pairs.", "Approach: No profile — use the controls below.", "Rhythmic transformation: Original — state the cell once."],
        ["Create the score.", "Lock bars 1 to 6.", "Set the first region’s density to single line and its dialogue to answer after bass.", "Generate guitar."],
        "Six bars. The cell is stated once. Later bars stay silent unless you change the transformation to Continue. The silence after the statement is the form.",
        ["Fragment the motif instead of Original, so only the opening of the cell speaks.", "Protect bar 1 after you like the statement, then generate again so the answer cannot erase it."],
        "Thematic return and large form are not meaningful in six bars. Do not judge this study as a full piece.",
    )
    add_scenario(
        m, 3, "A seven-eight canvas",
        "An asymmetric groove whose bar is seven quavers, not a 4/4 sentence squeezed.",
        "None.",
        ["Mode: New composition.", "Bars 16, beats 7, beat type 8, tempo 126.", "World D · Major + Diminished.", "Approach: Angular modern jazz.", "Riff rhythm: BHL rhythm.", "Rhythm menu: syncopate."],
        ["Create the score.", "Lock the whole span.", "Read the metre line. It should show 7/8 on the bars you created.", "Generate three candidates."],
        "Sixteen bars of 7/8. Angular modern jazz fragments the development and inverts the contour. The guitar’s accents sit off the bass rather than decorating a square bar.",
        ["Beat type 8 with beats 5 gives 5/8, a shorter asymmetric bar.", "Switch the approach to Rhythmic counterpoint if you want a second guitar voice rather than a broken single line."],
        "The new-score beats control accepts 2 to 7 only. A bar of 9, or a changing metre inside one new score, is not this control. Mixed metre inside one piece is Scenario 51, and it starts from a score that already changes metre.",
    )
    add_scenario(
        m, 4, "A slow five-four ballad frame",
        "A wide bar in which the bass can breathe and the guitar can enter late.",
        "None.",
        ["Bars 16, beats 5, beat type 4, tempo 60.", "World E · Pentatonic Harmony.", "Approach: Spacious abstraction.", "Dialogue, if you override the approach: leave space.", "Collection off for the first lock, so you hear the world’s own pentatonic first."],
        ["Create and lock.", "Generate one guitar.", "Then tick a collection and generate three candidates so you can compare the plain world with a coloured copy. Save before the second generate if you want both."],
        "A slow 5/4. Spacious abstraction prefers a high register, silence, and a short fragmented answer. The five beats give the bass time before the guitar speaks.",
        ["Colour-field composition in the same 5/4 replaces the high silence with dyads.", "Reference D and Suspended Pentatonic, later, take the third out of the colour. See Scenario 21."],
        "Changing bars, path, or protected bars after the lock requires a new lock. Changing the approach does not.",
    )
    add_scenario(
        m, 5, "Bring in a span you already trust",
        "Develop eight bars inside a longer score without touching the rest of the file.",
        "A MusicXML score that already contains guitar and bass. The regression example used on the page is Wrong Turning, bars 33 to 40. You may use another file. Do not overwrite the original.",
        ["Mode: Import MusicXML.", "MusicXML path: the full path of a copy, if the original must stay byte-for-byte untouched.", "From bar and To bar: the eight bars you mean to touch.", "Seed 3340 for a repeatable first reading.", "World A · Triad Pairs.", "Protected guitar bars empty, until you know which bar must survive."],
        ["Paste the path.", "Set the span.", "Import and lock.", "Read tempo, metre, rehearsal marks, and the SHA-256.", "Generate guitar only inside that span."],
        "The locked span can receive a new guitar. Bars outside the span are checked against the source. The bass events inside the span stay. The source file is not the export.",
        ["Protect the first bar of the span so its guitar remains the source. See Scenario 6.", "Move the same span to world E and save a second project, so both worlds remain."],
        "A wrong path, or a span that does not contain both instruments, will not lock. The web page does not offer a file chooser. A desktop build may show Choose MusicXML. This checked page does not.",
    )
    add_scenario(
        m, 6, "Protect the guitar statement",
        "Keep one guitar bar exactly, and let the following bars answer it.",
        "A locked span in which bar 1, or another bar you name, already holds the guitar idea.",
        ["Protected guitar bars: the bar number, for example 1, or 33.", "Riff rhythm may be anything.", "Dialogue on later regions: answer after bass.", "Do not expect counter-motion on the protected bar."],
        ["Type the bar numbers.", "Import and lock again. Protection is part of the lock.", "Generate.", "Export, and in MuseScore 4 compare the protected bar with the source."],
        "The named guitar bar stays the source, including pitches, durations, and where the notes start. Later bars may answer. A second guitar voice does not rewrite the protected bar.",
        ["Protect two bars, written as 33, 36, when both a statement and a later rhyme must survive.", "Leave the field empty when the whole span is allowed to change."],
        "If you edit the protected text after locking, Generate waits until you lock again. The bass is locked even when this box is empty.",
    )

    m.h1("B. The six harmonic worlds", "worlds")
    m.p("The world is the guitar’s pitch field. It is chosen under **Harmonic world** before or at the lock. Common-tone retention keeps you inside one sound. Contrast is the step to the other triad, the tension tone, or the other collection. None of these worlds is a ii–V–I.")
    m.table(
        ["World", "Common tone", "Contrast"],
        [
            ["A Triad Pairs", "A chord tone inside one major triad", "The other major triad, a major second away. No shared pitch class."],
            ["B Harmonic Quadratonics", "The three chord tones", "The primary tension, from liquid harmony."],
            ["C Major + Augmented", "The major third", "The raised fifth, and an augmented triad a major third away."],
            ["D Major + Diminished", "The root", "The minor third and the tritone."],
            ["E Pentatonic Harmony", "Tones inside the collection", "A contrasting collection, or one reported outside tone."],
            ["F Unrelated Major Triads", "The one shared tone of a minor-third pair", "The tritone triad, which shares none."],
        ],
    )
    m.figure(str(SHOT / "bhl-02-import.png"), "Figure 2. Harmonic world on the import panel. The menu contains A to F.")

    add_scenario(
        m, 7, "Stay inside one triad of a pair",
        "A line that sounds like one major triad, with no drift yet.",
        "A locked span. World A. Bass root clear in the first bars.",
        ["Harmonic world A · Triad Pairs.", "Approach: Colour-field composition.", "Density on the statement: dyad.", "Phrase development: follow the bass phrase.", "Pentatonic collection off, so the triad is heard alone."],
        ["Lock world A.", "Set the statement to dyad.", "Generate guitar.", "Read the dyads against the bass root. They should belong to one of the two triads."],
        "Two major triads a major second apart, sharing no pitch class. This pass asks the guitar to live inside one of them. Dyads keep the grip small. The other triad is still available, but you have not asked for the cross.",
        ["Scenario 8 makes the cross the point.", "A single line instead of a dyad turns the same triad into melody."],
        "The two triads share nothing. A note from the second triad is contrast, not a colour tone of the first. Do not rename that contrast as a seventh or a dominant.",
    )
    add_scenario(
        m, 8, "Cross to the triad a tone away",
        "A nonfunctional lift: the same bar-length, a new major triad with no common pitch.",
        "World A already locked. You have heard one triad.",
        ["World A.", "Phrase development: invert the development.", "On the development region, motivic development: invert-into-field.", "Continuation: sequence the shape inside the field.", "Collection still off."],
        ["Keep the lock.", "Set the development to invert into the field.", "Generate three candidates.", "Compare attacks. Then read which candidate actually crosses."],
        "The contrast triad sits a major second away and shares no pitch class. Inversion pushes the contour toward that other group. The bass does not have to cadence. The shock is the empty intersection, not a dominant.",
        ["Displace the rhythm so the new triad arrives off the bass attack.", "Protect the statement bar so the first triad remains recognisable when the second arrives."],
        "If a pentatonic colour is also on, it can sound only on pitches the triads already contain. An empty intersection leaves the guitar on the world. It does not invent a compromise scale.",
    )
    add_scenario(
        m, 9, "Three chord tones, nothing else",
        "A quadratonic heard as a chord, before its tension tone is admitted.",
        "World B. A locked bass.",
        ["Harmonic world B · Harmonic Quadratonics.", "Approach: Chamber lyricism.", "Permit one outside-field colour: off.", "Harmonic field on the region: leave the bass field, or choose another vault field if the menu offers one.", "Collection off."],
        ["Lock world B.", "Generate guitar.", "Open Cross-engine transfer and read that liquid harmony is direct on world B."],
        "World B asks liquid harmony for one quadratonic: three chord tones plus a primary tension. This calm setting lets the chord tones carry the line. The tension tone is present in the field as the contrast group, but the lyric approach does not feature it.",
        ["Scenario 10 features the tension.", "Colour-field dyads make the same quadratonic vertical rather than melodic."],
        "There is no Liquid Harmony button. World B is the integration. The full Tonality Vault screen, with fretboard and tab, is a different page. BHL does not embed it. There is no guitar tablature in this handbook.",
    )
    add_scenario(
        m, 10, "Let the tension tone lean",
        "The same quadratonic, now with the non-chord tone as the colour that pulls.",
        "World B, locked.",
        ["World B.", "Approach: Angular modern jazz.", "Permit one outside-field colour: on.", "Motivic development on the development: reproject-neighbor.", "Continuation: fragment the motif."],
        ["Set the approach.", "Tick the outside colour.", "Generate three candidates.", "Use the pair comparison to see which line is more broken."],
        "The tension tone is the contrast inside the quadratonic. One outside tone may appear because you allowed it. The return is still supposed to land in the field. Fragmentation keeps the answer short, so the tension does not become a scale run.",
        ["Turn the outside tick off and refine a copy. The parent keeps the lean; the child can be plainer.", "Recall the cell on the return so the chord tones close the phrase."],
        "Outside colour is one tone, not a licence to leave the field. On world E the return must still sit in the collection. If it cannot keep a semitone, the page reports the limit.",
    )
    add_scenario(
        m, 11, "Major triad, then its raised fifth",
        "A major sound that brightens by a raised fifth, sharing the major third.",
        "World C. Locked bass.",
        ["Harmonic world C · Major + Augmented.", "Approach: Colour-field composition.", "Density: dyad.", "Phrase development: recall the cell on the return.", "Quartal colour: off, so the augmented fifth is not confused with a fourth."],
        ["Lock world C.", "Generate guitar.", "Read dyads for a major third that stays and a fifth that sometimes rises."],
        "The major triad and the augmented triad share a root and a major third. The raised fifth is the contrast. Recall brings the opening cell back after that brightening, so the phrase has a memory.",
        ["Single line instead of dyad makes the raised fifth a melodic event.", "Scenario 12 moves the augmented triad by a major third as well."],
        "This is not a dominant augmented sixth and not a resolution to a tonic. Do not add a cadence the world does not write.",
    )
    add_scenario(
        m, 12, "Spin the augmented triad by a major third",
        "Augmented symmetry as motion: the same colour, a new root a major third away, still not a fifth.",
        "World C, after Scenario 11 or instead of it.",
        ["World C.", "Approach: Angular modern jazz.", "Phrase development: invert the development.", "Continuation: sequence the shape inside the field.", "Rhythm: displace."],
        ["Lock or keep the lock.", "Set invert and sequence.", "Generate three candidates."],
        "The field includes the augmented triad on the bass root and the augmented triad a major third away. Inversion and sequence move the shape between those groups. Displacement keeps the guitar off the bass attack. The root step is a major third, which the world treats as legal. A fifth is not the operation.",
        ["Continue the riff cell so the spin becomes an ostinato.", "Protect the first bar so the unspun major triad remains the reference."],
        "A pentatonic colour on this world only survives where it already belongs to the major-plus-augmented field. Shared pitches are named after Generate, under Harmonic-field interaction.",
    )
    add_scenario(
        m, 13, "A major triad darkened from the root",
        "The root stays. The minor third and the tritone cloud it.",
        "World D.",
        ["Harmonic world D · Major + Diminished.", "Approach: Chamber lyricism.", "Density: single line.", "Dialogue: leave space.", "Outside colour: off."],
        ["Lock world D.", "Generate guitar.", "Look for a shared root with the bass and for a minor third or tritone as the colour, with rests after the bass moves."],
        "Major triad plus diminished triad on the same root. The root is the common tone. The minor third and the tritone are the contrast. Lyricism and leave-space keep that colour from becoming a busy diminished scale.",
        ["Dyads stack the root with the tritone as one grip.", "Scenario 14 makes the contrast the whole argument."],
        "Do not relabel the tritone as a dominant that must resolve. The world does not take a fifth-step.",
    )
    add_scenario(
        m, 14, "Feature the minor third and the tritone",
        "A sharper reading of world D, still rooted, no longer shy.",
        "World D, locked.",
        ["World D.", "Approach: Rhythmic counterpoint.", "Density: counterline.", "Dialogue: counter-motion.", "Rhythm: displace.", "Continuation: answer the bass."],
        ["Apply the approach.", "Generate three candidates.", "Compare voices. Counter-motion is the setting that can write a second guitar voice."],
        "A second guitar voice moves against the bass, displaced from the statement. The pitch field is still the major triad plus the diminished triad. The minor third and tritone can occupy the second voice while the first keeps the root.",
        ["Handoff before bass gives the guitar the bar and clears before the next bass note.", "Fragment the motif so the tritone is a gesture, not a line."],
        "Counter-motion does not override a protected bar or a silence. If the comparison shows only voice 1, the region was not a counter-motion region, or the bar was protected.",
    )
    add_scenario(
        m, 15, "Pentatonic harmony as the whole field",
        "A guitar that lives inside a pentatonic collection, with no leading-tone cadence.",
        "A new or imported span. World E.",
        ["Harmonic world E · Pentatonic Harmony.", "Collection off for this first hearing, so the world’s own description applies: major pentatonic on the bass root, as pentatonic dyads, no leading tone and no dominant seventh.", "Approach: Colour-field composition.", "Density: dyad."],
        ["Lock world E.", "Leave the collection unticked.", "Generate guitar.", "Then tick Major Pentatonic at the bass’s reference if you want the same colour named explicitly. Generate a refined copy."],
        "World E’s default field is major pentatonic thinking on the bass root. Dyads stack fifths and sixths from that set. There is no leading tone pushing to a tonic, and no dominant seventh.",
        ["Scenario 16 replaces that default with another of the twenty collections.", "Suspended Pentatonic removes the third. See Scenario 21."],
        "Once a collection is selected, world E takes that collection as the pitch source, including collections that are only reference on the Pentatonic page. Return notes stay inside it.",
    )
    add_scenario(
        m, 16, "Replace world E’s source with a named collection",
        "The same pentatonic world, now spelled from a colour you choose, not from the default major pentatonic.",
        "World E, locked.",
        ["World E.", "Use a pentatonic collection on the development: on.", "Collection: Hirajoshi.", "Reference: D.", "Relationship: HOME.", "Contrasting collection: None."],
        ["Tick the collection.", "Set Hirajoshi and D.", "Read the pitch classes on the page before you generate.", "Generate.", "Open Harmonic-field interaction and read the constraint."],
        "Hirajoshi at D is the pitch source, not a filter. Intervals from the reference are 0, 2, 3, 7, 8. The line may be dark and narrow. It should not be rewritten as major pentatonic. A repaired demonstration of this world kept a return inside the collection and did not put B natural where the collection forbade it.",
        ["Contrast Suspended Pentatonic against Hirajoshi. See Scenario 23.", "Relationship SUSPENDED shifts this same Hirajoshi. It does not create a twenty-first scale."],
        "If a return cannot keep a semitone inside the collection, the limitation is reported. The note is not forced. That is a success of the limit, not a broken file.",
    )
    add_scenario(
        m, 17, "Two major triads a minor third apart",
        "A pair that can keep one shared tone, with roots that are not a fourth or a fifth.",
        "World F.",
        ["Harmonic world F · Unrelated Major Triads.", "Approach: Colour-field composition.", "Phrase development: recall the cell on the return.", "Density: dyad.", "Collection off."],
        ["Lock world F.", "Generate guitar.", "Listen with the eye for one pitch that survives the change of triad, and for roots a minor third apart."],
        "World F places major triads at the minor third and at the tritone. The minor-third pair can keep its one shared tone. Recall puts the opening cell back, so that shared tone can be the memory.",
        ["Scenario 18 removes even that one shared tone, by favouring the tritone triad.", "A single line makes the shared tone melodic rather than a dyad."],
        "Those roots are not a fourth and not a fifth. Do not ‘correct’ the bass motion into a cycle.",
    )
    add_scenario(
        m, 18, "The tritone triad, no shared pitch",
        "A major triad with nothing in common with the one you just left.",
        "World F, locked.",
        ["World F.", "Approach: Spacious abstraction.", "Dialogue: leave space.", "Continuation: fragment the motif.", "Phrase development: invert the development."],
        ["Set the approach.", "Generate three candidates.", "Choose the line whose answer is shortest. Refine a copy of that one if you want a still shorter reply."],
        "The tritone triad shares no pitch class with the triad a tritone away. Space and fragmentation keep the shock to a few notes and a rest. Inversion aims the contour at the remote triad rather than decorating the first one.",
        ["Counter-motion lets a second voice hold a tone from the first triad while the first voice takes the remote triad. Only if the region is not protected.", "Save this project under a different id from Scenario 17 so the shared-tone version survives."],
        "An added pentatonic colour cannot glue the two triads together. If it shares nothing with the field, the guitar stays on the world.",
    )

    m.h1("C. Pentatonic colour", "colours")
    m.p("Tick **Use a pentatonic collection on the development**. Twenty collections appear. The relationship menu shifts the one you chose. **Contrasting collection** names a second colour. The page prints pitch classes and pairs before you generate.")
    m.p("Roles below are the musical jobs of the collections, spelled at C as the registry shows them. Choose another reference when the bass lives somewhere else. D suspended, for example, is D E G A C.")
    m.table(
        ["Collection", "Intervals from the reference", "Spelling at C", "Job"],
        [
            ["Major Pentatonic", "0 2 4 7 9", "C D E G A", "Bright, stable, no semitone, no seventh."],
            ["Minor Pentatonic", "0 3 5 7 10", "C Eb F G Bb", "Dark, stable. Same set-class as major, other centre."],
            ["Suspended Pentatonic", "0 2 5 7 10", "C D F G Bb", "No third. Fourth and flat seventh, unresolved."],
            ["Open Pentatonic", "0 2 5 7 9", "C D F G A", "No third and no seventh."],
            ["Minor Sixth Pentatonic", "0 3 5 8 10", "C Eb F Ab Bb", "Flat sixth instead of the fifth."],
            ["Mixolydian Pentatonic", "0 2 4 7 10", "C D E G Bb", "Major third, flat seventh."],
            ["Dorian Pentatonic", "0 2 3 7 10", "C D Eb G Bb", "Second and flat seventh, no fourth."],
            ["Aeolian Pentatonic", "0 3 5 7 8", "C Eb F G Ab", "Flat sixth and perfect fifth. No second, no seventh."],
            ["Kumoi", "0 2 3 7 9", "C D Eb G A", "Soft dark colour. Local semitone, major sixth."],
            ["Hirajoshi", "0 2 3 7 8", "C D Eb G Ab", "Darker than Kumoi. Flat sixth."],
            ["In Sen", "0 1 5 7 10", "C Db F G Bb", "Flat two, fourth, fifth, flat seventh. No third."],
            ["Iwato", "0 1 5 6 10", "C Db F Gb Bb", "Flat two and flat five. No third, no perfect fifth."],
            ["Phrygian Pentatonic", "0 1 3 7 8", "C Db Eb G Ab", "Flat two, minor third, flat sixth. Fifth remains."],
            ["Lydian Pentatonic", "0 2 4 6 9", "C D E F# A", "Major third and sharp four. No perfect fifth."],
            ["Whole-Tone Pentachord", "0 2 4 6 8", "C D E F# G#", "Symmetrical. Weak pull home."],
            ["Blue Pentatonic", "0 3 5 6 10", "C Eb F Gb Bb", "Minor pentatonic with a flat five instead of the fifth."],
            ["Ambiguous Third", "0 3 4 7 10", "C Eb E G Bb", "Both thirds, fifth, flat seventh."],
            ["Leading-Tone Major", "0 2 4 7 11", "C D E G B", "Major colour with a leading tone. Not a cadence."],
            ["Leading-Tone Minor", "0 3 5 7 11", "C Eb F G B", "Minor colour with a leading tone."],
            ["Remote Altered", "0 1 4 6 10", "C Db E Gb Bb", "Flat two, major third, flat five, flat seventh."],
        ],
    )
    m.figure(str(SHOT / "bhl-06-pentatonic.png"), "Figure 3. BHL development colour. Suspended Pentatonic, reference D, HOME, contrast Hirajoshi.")
    m.figure(str(SHOT / "bhl-11-pentatonic-registry.png"), "Figure 4. Earlier Pentatonic registry. The picture shows a path button on Major and Minor only. The current page puts Use for path transform and phrase generation on every registered collection.")

    add_scenario(
        m, 19, "Major pentatonic as a bright home",
        "A stable, open colour: major third and major sixth, no semitone, no seventh.",
        "World E, or a world whose field already contains those pitches.",
        ["World E.", "Collection: Major Pentatonic.", "Reference: the bass root, or C if you are spelling the registry.", "Relationship: HOME.", "Contrast: None.", "Approach: Colour-field composition."],
        ["Tick the collection.", "Read “Bright stable home colour” under the pitch classes.", "Generate three candidates."],
        "On world E the major pentatonic is the pitch source. Dyads favour the open stacking of that set. No leading tone is required.",
        ["The same collection on the Pentatonic page can be sent to path transform. Click Use for path transform and phrase generation. That step is the Pentatonic page, not BHL.", "Relationship MAJOR shifts the set by the menu’s offset. The name stays Major Pentatonic."],
        "On worlds A to D and F, pitches in the collection that the world lacks are left out. The page lists them after Generate.",
    )
    add_scenario(
        m, 20, "Minor pentatonic as a dark home",
        "The same broad stability as major pentatonic, centred so the third is minor.",
        "World E.",
        ["World E.", "Collection: Minor Pentatonic.", "Reference: match the bass.", "Relationship: HOME.", "Approach: Chamber lyricism.", "Density: single line."],
        ["Set the collection.", "Generate.", "Compare with a saved major-pentatonic project of the same bass, if you made Scenario 19."],
        "A dark single line inside C Eb F G Bb, or the same intervals from your reference. The set-class matches major pentatonic. The centre does not. Lyricism keeps it melodic.",
        ["Minor pentatonic can be sent to the Pentatonic page, as can the other eighteen colours.", "Contrast Major Pentatonic when you want the bright set in the development only."],
        "Do not treat the flat seventh as a dominant seventh that must fall. World E does not write that cadence.",
    )
    add_scenario(
        m, 21, "Suspended colour, no third",
        "Harmony that will not decide major or minor. Fourth and flat seventh keep it open.",
        "World E. Reference chosen from the bass. The checked example used D.",
        ["World E.", "Collection: Suspended Pentatonic.", "Reference: D.", "Relationship: HOME.", "Contrast: None.", "Approach: Colour-field composition.", "Quartal colour on dyads: on, because this set contains a fourth."],
        ["Set D and Suspended.", "Read the pitch classes. At D they are D E G A C.", "Generate.", "Read the constraint under Harmonic-field interaction."],
        "A pentatonic field with no third. Dyads can use the fourth. The harmony stays unresolved. This is a colour, not a sus chord on every beat waiting for a major triad.",
        ["Add Hirajoshi as contrast. Scenario 23.", "On world A, the same collection only contributes pitches the two triads already own."],
        "On the Pentatonic page this row has the same path button as the other colours. That does not remove it from BHL.",
    )
    add_scenario(
        m, 22, "Open pentatonic, no third and no seventh",
        "Still more open than suspended: no third, and no seventh either. Common tones without a decision.",
        "World E.",
        ["World E.", "Collection: Open Pentatonic.", "Reference: C, or the bass.", "Relationship: HOME.", "Quartal colour: on.", "Dialogue: leave space."],
        ["Select Open Pentatonic.", "Read C D F G A if the reference is C.", "Generate a single guitar before you store three candidates."],
        "Dyads and single notes from a set that will not declare mode. Leave-space keeps the last beat empty so the openness is not filled in by rhythm.",
        ["Suspended Pentatonic puts the flat seventh back, which is a darker open sound.", "Major Pentatonic puts the third back and ends the ambiguity."],
        "On the Pentatonic page, Open Pentatonic can be the manual path collection. Inside BHL it remains a development colour.",
    )
    add_scenario(
        m, 23, "Kumoi, then Hirajoshi",
        "Two Japanese-derived colours. Kumoi is softer. Hirajoshi is more fragile, with a flat sixth.",
        "World E.",
        ["World E.", "Collection: Kumoi.", "Reference: D.", "Relationship: HOME.", "Contrasting collection: Hirajoshi.", "Phrase development: recall the cell on the return."],
        ["Set Kumoi against Hirajoshi.", "Confirm the span has a development or transformation region. The lock receipt and the region headings show this.", "Generate.", "If the page says the contrast was not applied, the span had no such region."],
        "The statement can live in Kumoi. The development can move to Hirajoshi. Recall tries to bring the cell back. Both sets are real BHL colours. A verified repair used suspended D as the source and Hirajoshi as the contrast, and kept the return inside the selected collection.",
        ["Swap them: Hirajoshi first, Kumoi as the contrast, for a dark opening and a softer answer.", "In Sen and Iwato are the harsher pair. Scenario 24."],
        "A contrast with no development or transformation region is reported and not applied. Do not expect the second colour in a span that is only a statement.",
    )
    add_scenario(
        m, 24, "In Sen, then Iwato",
        "A suspended edge, then a colour with no perfect fifth.",
        "World E.",
        ["World E.", "Collection: In Sen.", "Reference: C.", "Contrast: Iwato.", "Approach: Angular modern jazz.", "Continuation: fragment the motif."],
        ["Read In Sen at C: C Db F G Bb. No third.", "Read Iwato: C Db F Gb Bb. Flat five, no perfect fifth.", "Generate three candidates."],
        "In Sen keeps a fifth and a fourth, so it can still feel suspended. Iwato removes the perfect fifth. Fragmentation stops the ear treating either set as a scale to run.",
        ["Phrygian Pentatonic keeps the fifth and adds a minor third, a different dark edge.", "Relationship HOME only, so you hear the sets and not a shift."],
        "Iwato is unstable on purpose. Do not ‘fix’ a generated line by adding a perfect fifth in another editor and calling it the same colour.",
    )
    add_scenario(
        m, 25, "Blue pentatonic, the fifth replaced",
        "Minor-pentatonic darkness with a flat five where the fifth was. A colour, not a blues chorus.",
        "World E.",
        ["World E.", "Collection: Blue Pentatonic.", "Reference: the bass.", "Approach: Rhythmic counterpoint.", "Rhythm: syncopate.", "Outside colour: off."],
        ["Select Blue Pentatonic.", "Read the intervals 0 3 5 6 10.", "Generate.", "Look for Gb against C, or the same tritone from your reference, instead of a perfect fifth."],
        "The flat five is inside the collection, so it is not an outside tone. Syncopation and a second voice can worry that interval without a scale run. There is no blues form and no turnaround in this world.",
        ["Minor Pentatonic puts the perfect fifth back.", "Remote Altered is harsher and keeps fewer tones in common with a diatonic bass."],
        "Accents are not imported from riff data. If you wanted a pushed accent, it must come from the rhythm menu or the riff’s own attacks, not from an articulation mark BHL does not have.",
    )
    add_scenario(
        m, 26, "Both thirds in one field",
        "Major and minor unresolved, together, plus fifth and flat seventh.",
        "World E.",
        ["World E.", "Collection: Ambiguous Third.", "Reference: C.", "Approach: Colour-field composition.", "Density: dyad.", "Contrast: None."],
        ["Select Ambiguous Third.", "Read C Eb E G Bb.", "Generate dyads.", "Do not choose a collection that deletes one of the thirds until you have saved this project."],
        "A dyad can hold Eb and E, or one of them with G. The field refuses to vote. That is the aim. A later continuation can still sequence inside the same five notes.",
        ["Leading-Tone Major keeps only the major third and adds B, a different kind of pull.", "Open Pentatonic deletes both thirds."],
        "Five notes that include both thirds are still one collection. BHL will not split them into two keys.",
    )
    add_scenario(
        m, 27, "A leading tone that is not a cadence",
        "Major colour with a leading tone instead of the sixth. The pull is colour, not a perfect cadence.",
        "World E.",
        ["World E.", "Collection: Leading-Tone Major.", "Reference: C.", "Phrase development: follow the bass phrase.", "Continuation: hold, so the region’s own dialogue stays.", "Outside colour: off."],
        ["Read C D E G B.", "Generate.", "See whether B appears as a colour beside the major triad tones, and whether the phrase still ends without a dominant-to-tonic formula."],
        "The leading tone pulls. The world does not write a cadence to satisfy it. Follow-the-bass keeps the guitar’s phrase with the bass’s phrase rather than inventing a classical close.",
        ["Leading-Tone Minor uses Eb F G B from C: dark, with the same kind of pull.", "Major Pentatonic replaces B with A and the pull disappears."],
        "If you wanted an actual perfect cadence, this handbook cannot give it. None of the six worlds is that cadence.",
    )
    add_scenario(
        m, 28, "Remote altered, few common tones",
        "A colour that shares little with a plain major or minor home: flat two, major third, flat five, flat seventh.",
        "World E, or a filter test on world A.",
        ["First: World E, collection Remote Altered, reference C, contrast None, approach Spacious abstraction.", "Second, only after saving: World A, the same collection, to see the filter."],
        ["Generate on world E and save.", "Lock a copy on world A with the same collection.", "Read Harmonic-field interaction on both."],
        "On world E the remote set is the pitch source, so the guitar may sound distant and still be correct. On world A the same set only contributes pitches the triads already contain. The rest are named and left out. The guitar stays on the world when the intersection is empty.",
        ["Iwato is another low-intersection colour, without the major third.", "A contrasting collection of Major Pentatonic against Remote Altered maximises the distance, if a development region exists."],
        "Do not expect world A to ‘play Remote Altered’. The filter is the point of this second lock.",
    )
    add_scenario(
        m, 29, "Shift a collection without adding a scale",
        "The same five intervals, moved. HOME, MAJOR, 6/9 SUSPENDED, MAJOR 7 COLOUR, or SUSPENDED.",
        "Any one collection you already understand. Major Pentatonic is the clearest.",
        ["Collection: Major Pentatonic.", "Reference: C.", "Relationship: HOME, first.", "Then relationship: SUSPENDED.", "World E.", "Save the HOME project before you change the relationship."],
        ["Generate and save under one project id.", "Change only the relationship.", "Lock if the page asks.", "Generate again into a new project id.", "Compare the pitch-class line on the page. The intervals match. The spelling has moved."],
        "SUSPENDED shifts the collection by seven semitones. MAJOR shifts by minus three. 6/9 SUSPENDED shifts by two. MAJOR 7 COLOUR shifts by four. HOME shifts by nothing. The menu does not create a new collection.",
        ["Use the shift to follow a bass that has moved, instead of picking a different colour.", "A contrast collection is a different five-note set. A relationship is not."],
        "The compatible-pair list is recalculated from the shifted pitch classes. Read it again after you change the relationship.",
    )
    add_scenario(
        m, 30, "A colour filtered by world C",
        "Hear only the part of a pentatonic set that major-plus-augmented already owns.",
        "World C, locked. Collection with some, not all, pitches inside that field. Lydian Pentatonic is a clear test: it has a major third and a sharp four, and no perfect fifth.",
        ["World C.", "Collection: Lydian Pentatonic.", "Reference: the bass root.", "Relationship: HOME.", "Approach: Colour-field composition."],
        ["Generate.", "Read the constraint. It should name world C and say which pitches are shared and which are left out.", "Confirm the message does not relabel the colour as major pentatonic."],
        "The guitar may use the shared tones, including the major third and, where the augmented field already has it, the raised colour. Pitches the world lacks stay out. The collection’s name remains Lydian Pentatonic.",
        ["Whole-Tone Pentachord is a sterner filter: symmetrical, no perfect fifth.", "The same collection on world E would sound entire. Save that as another project."],
        "An unknown collection id fails. The page does not substitute major or minor. You will not see that failure from the menu, which only lists real ids.",
    )
    add_scenario(
        m, 31, "When nothing is shared",
        "A colour and a world with an empty intersection. The guitar must stay on the world.",
        "World F, the tritone relationship, plus a remote colour.",
        ["World F.", "Collection: Remote Altered.", "Reference: a note you suspect will miss the triads. Read the pairs on the page.", "If the pair list says the world tones and the colour share nothing, keep going.", "Approach: Chamber lyricism."],
        ["Generate.", "Read Harmonic-field interaction.", "The guitar should remain on the world field."],
        "No snap to major pentatonic. No snap to minor. The colour is reported as unused where it shares nothing. The lyric line is made from the unrelated triads alone.",
        ["Change only the world to E and generate a refined family in a new project. World E will play the remote set.", "Pick a compatible collection, three or more shared classes, when you want the colour to be audible on worlds A to D or F."],
        "The pair counts on the page are about collections against each other, not automatically about the world field. The world test is the constraint after Generate.",
    )
    add_scenario(
        m, 32, "Quartal dyads, and the path page",
        "Use a fourth when the collection has one, then send that colour to the Pentatonic page.",
        "World E. A collection with a fourth, such as Suspended or In Sen.",
        ["World E.", "Collection: Suspended Pentatonic or In Sen.", "Quartal colour on dyads when the collection has a fourth: on.", "Density: dyad.", "Then, separately, open the Pentatonic page."],
        ["Generate the dyads in BHL.", "On the Pentatonic page, set Spelling reference to D.", "Find Suspended Pentatonic.", "Click Use for path transform and phrase generation.", "Set the collection-step bounds and click Generate path. A return home needs at least 3 steps."],
        "In BHL, a dyad may take the fourth. On the Pentatonic page, Suspended Pentatonic can be the manual path collection. M-DEG and M-NEAR use that collection. An unknown id is refused and is not rewritten as minor pentatonic.",
        ["Turn quartal colour off when the fourth is making every dyad sound like the same grip.", "Minor Sixth Pentatonic has no perfect fourth as its identity. Quartal colour will not invent one."],
        "Length counts collection steps, including the start. A repeated collection counts as a step. Save project keeps the route. Reopen project loads it and does not write a new path.",
    )
    m.figure(str(SHOT / "bhl-12-pentatonic-limit.png"), "Figure 5. Earlier Pentatonic page. The picture marks Suspended and Open as reference. The current page gives those rows the path button.")

    m.h1("D. Motif and riff development", "motif")
    m.p("Pitch and rhythm are chosen apart. **Riff contour** takes intervals from the riff cell. **BHL world pitches** takes pitches from the world. The rhythm menu then decides whether the attacks are BHL’s, the same cell’s, another cell’s, or a multi-bar engine cell. Transformations stretch, cut, shift, or rest that rhythm. Leave-space, handoff, silence, and protected bars win.")
    m.figure(str(SHOT / "bhl-05-riff.png"), "Figure 6. Pitch, rhythm, seed, and displacement as separate controls.")

    add_scenario(
        m, 33, "Keep the world’s pitches, take the riff’s rhythm",
        "The harmony stays BHL. The attacks come from the cell.",
        "A locked span.",
        ["Riff pitch: BHL world pitches.", "Riff rhythm: This riff’s rhythm.", "Rhythmic transformation: Continue — repeat the cell.", "Rhythm seed: hidden, and unused.", "Approach: your choice. Colour-field if you want dyads on those attacks."],
        ["Set pitch to world and rhythm to this riff.", "Generate.", "Compare with a second generate that uses BHL rhythm. Save both projects."],
        "Pitches stay in the world or the selected collection. Attacks follow the riff cell and, with Continue, return. The internal Cmaj7 of the riff engine is not written as a chord symbol.",
        ["Original instead of Continue states the rhythm once.", "Another core cell, Scenario 60, uses a different rhythm from a second seed."],
        "This riff’s rhythm ignores the rhythm seed. If two seeds seem to do nothing, you are on this setting, not on Another core cell.",
    )
    add_scenario(
        m, 34, "Keep a contour, change the pitch field",
        "The intervals of the riff survive. The world retunes them.",
        "Locked span. Two worlds you care about, saved separately.",
        ["Riff pitch: Riff contour.", "Riff rhythm: BHL rhythm.", "Transformation: Continue.", "First project: world A.", "Second project: world E, with a collection."],
        ["Generate world A and save.", "Change to world E, set the collection, lock if required, generate, save under a new id.", "The contour should be recognisable. The pitch classes should differ."],
        "A verified pair of examples, same rhythm and Continue, differed in pitch between world A and world E. Bar 34 was one place the pitches diverged. Your seeds will not duplicate that bar unless you repeat that exact setup. The principle is the same: contour held, field changed.",
        ["Invert the motif after Replace the opening cell, if you want the contour upside down.", "BHL world pitches abandons the contour. Use that when the world matters more than the riff’s shape."],
        "The contour is one cell. Original will not tile it across the phrase.",
    )
    add_scenario(
        m, 35, "Keep the rhythm, change the pitches",
        "The attacks stay. The notes move inside the field.",
        "A locked phrase with a continuation region that is not silence, handoff, or leave-space.",
        ["Phrase continuation: keep the rhythm, change the pitches.", "Riff rhythm: BHL rhythm, so this continuation menu is the one writing attacks. If a riff rhythm is selected, it replaces this menu.", "Motivic development: reproject-neighbor.", "Collection on, if you want the new pitches inside a colour."],
        ["Set continuation.", "Generate.", "Compare two candidates for the same attacks and different pitches. The pair readout may show equal attack counts. That is a clue, not a verdict."],
        "The rhythm of the region stays. Pitches move. On world E they should remain in the collection. Reproject-neighbor is the region’s way of parking a neighbour tone in a new place inside the field.",
        ["Sequence the shape inside the field keeps more of the contour than a free repitch.", "Fragment the motif if the rhythm itself should shrink."],
        "Continuation does not rewrite silence, a handoff, or leave-space. If the whole span is those, this scenario has nothing to develop.",
    )
    add_scenario(
        m, 36, "Displace the cell",
        "The same notes, late or early by a fraction of a beat. The cell grows. It is not trimmed to the bar.",
        "A locked 4/4 span is the clearest.",
        ["Rhythmic transformation: Displace.", "Displacement in quarter-lengths: 0.5.", "Riff rhythm: This riff’s rhythm, or Another core cell.", "Dialogue: not leave-space, or the empty beat will win."],
        ["Set 0.5.", "Generate.", "An attack that no longer fits bar 1 should appear whole in the next bar, not as a tied stump and not quantised."],
        "A checked handoff example shifted by 0.5 and moved the overflowing attack whole into the next bar. Your line will do the same kind of move. Leave-space, handoff, silence, and protected bars still override the grid.",
        ["0.25 is a smaller shove. The control accepts quarters in steps of 0.25.", "Augment is a different operation: durations double, rather than the cell sliding."],
        "A note finer than the division grid, or one that cannot cross the bar whole, is named and omitted.",
    )
    add_scenario(
        m, 37, "Augment, twice as long",
        "The cell in slow motion. It will spill.",
        "A short cell you have already heard at Original.",
        ["Transformation: Augment — twice as long.", "Pitch: Riff contour or world pitches.", "Approach: Chamber lyricism, so the long notes have air.", "Protected bars: none, or the spill cannot pass through them."],
        ["Save an Original version.", "Switch to Augment.", "Generate.", "In MuseScore 4, compare the two exports. Durations should double. The cell should cross a bar rather than be clipped."],
        "Twice the duration. The musical point is weight and spill, not a new melody. Lyricism stops the long notes from being harmonised on every beat.",
        ["Diminish is the opposite. Scenario 38.", "Continue plus Augment repeats the long form. It can fill a phrase quickly. Use it only when you want an ostinato of long values."],
        "Protected guitar bars and silence windows block the spill. If the augment seems to vanish, check those first.",
    )
    add_scenario(
        m, 38, "Diminish, twice as fast",
        "The cell in diminution. Values that become too fine are withheld, not quantised.",
        "A cell whose notes are not already the shortest the score can hold.",
        ["Transformation: Diminish — twice as fast.", "A score whose divisions can hold the halved values. Wrong Turning’s guitar divisions are 4, a sixteenth if the beat is a crotchet divided in four. A quaver halved is a semiquaver and may fit. A semiquaver halved may not.", "Approach: Angular modern jazz."],
        ["Generate.", "If the page says the rhythm did not fit, every attack was too fine. Choose Original or Augment instead.", "If it fits, the attacks are twice as fast and different from Original, Fragment, and Insert a rest."],
        "A faster cell, still the same pitches in order, with any illegal short note named and dropped. Angular attack placement keeps the result from sounding like a mechanical halving only.",
        ["Fragment keeps the opening half instead of speeding everything.", "Another core cell at a new seed is a different rhythm, not a diminution of this one."],
        "If every attack is too fine, generation reports the failure. That report is the result. Do not quantise by hand and call it BHL.",
    )
    add_scenario(
        m, 39, "Fragment, keep the opening",
        "The listener remembers the start of the cell. The tail is named and unused.",
        "A cell of more than a couple of notes.",
        ["Transformation: Fragment — keep the opening.", "Continuation: fragment the motif, if you also want the phrase engine to agree.", "Dialogue: answer after bass.", "Approach: Spacious abstraction, optional, for a short high answer."],
        ["Generate.", "The unused tail should be reported, not sounded.", "The sounding part is the opening half."],
        "A recognisable head of the motif, then stop. The answer after the bass can be that head alone. Space around it is the rhetoric.",
        ["Insert a rest cuts duration out of a long note instead of discarding a tail.", "Original states the whole cell once, including the tail."],
        "Fragment and the continuation menu’s “fragment the motif” are related ideas on different controls. Set both if you want them to agree. Setting only one leaves the other menu in force.",
    )
    add_scenario(
        m, 40, "Continue, so the cell can return",
        "An ostinato that is allowed. Repetition here is a choice, not an accident.",
        "A cell you want to recognise later in the phrase.",
        ["Transformation: Continue — repeat the cell.", "Phrase development: recall the cell on the return.", "World E with a collection, so the return has a field to land in.", "Protected bars empty."],
        ["Generate.", "Find the cell more than once.", "Recall on the return is the phrase engine’s own memory, in addition to the repeated rhythm."],
        "Onset plans are marked so a repeated grid is allowed. You should be able to find the cell again. Recall tries to put it on the return region as well. Together they make a motif you can recognise without a song form.",
        ["Original is the control that stops the repetition.", "Displace plus Continue shifts every copy, so the ostinato is late rather than on the beat."],
        "A protected bar will not receive the ostinato. A silence window will not either.",
    )
    add_scenario(
        m, 41, "Put a rest inside the cell",
        "Breath. Split a long enough note into note plus rest.",
        "A cell with a note of at least half a crotchet.",
        ["Transformation: Insert a rest.", "Dialogue: leave space, if you also want the last beat empty. That is a second gap, not the same as this split.", "Approach: Chamber lyricism."],
        ["Generate.", "If the transform is reported unavailable, no note was long enough to split. Lengthen by Augment first, save, then try Insert a rest on that longer cell."],
        "The last note that is at least half a crotchet becomes note plus rest. The pitches stay. The breath is the point. Lyricism agrees with it.",
        ["Leave space empties the last beat of the bar even when Insert a rest is off.", "Fragment discards a tail instead of resting inside it."],
        "If no suitable note exists, the transform is unavailable. The page should say so. Do not draw the rest in another program and call it this result.",
    )
    add_scenario(
        m, 42, "State the cell once, then stop",
        "A motto. The rest of the phrase is bass, or silence, until you ask for more.",
        "Any locked span longer than the cell.",
        ["Transformation: Original — state the cell once.", "Continuation: keep the region’s assigned dialogue.", "Do not tick Continue.", "Approach: Spacious abstraction or Chamber lyricism."],
        ["Generate.", "Confirm later bars do not repeat the cell.", "If they do, Continue is still selected, or the phrase engine’s own recall is on. Turn recall off by choosing follow the bass phrase."],
        "One statement. Later bars silent unless another control fills them. A verified comparison showed Original stopping where Continue kept playing. Silence after the motto is success.",
        ["Answer after bass lets a later region reply without repeating the whole cell.", "Replace the opening cell if the motto should be pitches you typed, not the world’s cell."],
        "Recall the cell on the return will bring material back. That contradicts “once” if you leave it on. Choose one.",
    )
    add_scenario(
        m, 43, "An imported motto, inverted, then lifted in register",
        "Your own pitches, not the world’s cell, turned over and moved.",
        "Three or four pitches you are willing to type as MIDI numbers or as the page expects in the motif box. The control is a text field under Imported pitches.",
        ["Replace the opening cell: on.", "Motif source: Imported pitches.", "Type the pitches.", "Transform: Invert. Generate and save.", "Then Transform: Register transfer. Generate into a new project."],
        ["Tick Replace the opening cell.", "Choose Imported pitches and enter them.", "Invert.", "Generate three candidates.", "Change the transform to Register transfer and save a second project."],
        "The opening cell is no longer the world’s default. Inversion turns the intervals over. Register transfer moves that shape. The field still constrains where notes may land, especially on world E.",
        ["Motif source Intervals lets you type interval numbers instead of pitches.", "Transpose asks for semitones. That third transform is only a shift, not an inversion.", "Existing riff generator as the motif source uses a riff seed of its own, separate from the rhythm seed."],
        "This motif panel is not the riff pitch menu. You can leave riff pitch on world pitches and still replace the opening cell. Read both panels before you generate, so you know which one you meant.",
    )

    m.h1("E. Guitar and upright bass", "duo")
    m.p("The bass is locked. The guitar converses. **Bass dialogue** on each region is the conversation: answer after bass, counter-motion, handoff before bass, or leave space. Density chooses single line, dyad, triad, alternate, or counterline. A triad or a dyad is one grip.")
    m.figure(str(SHOT / "bhl-04-profile.png"), "Figure 7. A region after Colour-field composition: dyad, answer after bass, and the harmonic-field menu.")

    add_scenario(
        m, 44, "The bass speaks first",
        "The guitar waits, then answers. Call and response, with the bass leading.",
        "A locked duo. Bass notes already in the span.",
        ["Dialogue: answer after bass.", "Approach: Chamber lyricism, which also leaves space, or set the dialogue yourself after No profile.", "Density: single line.", "Rhythm: from the bass."],
        ["Set every region you care about to answer after bass.", "Generate.", "In MuseScore 4, the guitar entrance should not cover the bass attack it is answering."],
        "The bass moves. The guitar follows. Rhythm derived from the bass keeps the answer in the bass’s time. The locked bass notes are unchanged.",
        ["Handoff is the opposite order: guitar first, then clear. Scenario 46.", "Counter-motion speaks at once. Scenario 45."],
        "A protected guitar bar will not become an answer. It stays the source.",
    )
    add_scenario(
        m, 45, "A second guitar voice against the bass",
        "Counterpoint in one instrument: two guitar voices, the bass untouched.",
        "A locked span. At least one region that may take counter-motion.",
        ["Approach: Rhythmic counterpoint, or set dialogue to counter-motion and density to counterline yourself.", "Rhythm: displace.", "Continuation: answer the bass.", "Protected guitar bars: empty, or the second voice will not enter there."],
        ["Apply the approach.", "Generate.", "Export.", "In MuseScore 4, look for a second guitar voice. A verified dialogue example placed that voice in later bars and left a protected bar’s first voice identical to the source."],
        "Voice 2 is the counterline. It does not change protected pitches, durations, or attacks. The bass part is the same file you locked. Displace keeps the second voice off the statement’s grid.",
        ["Alternate density switches texture instead of holding two voices all the time.", "Leave space on a later region stops the counterline before the phrase ends."],
        "If you see only one voice, the region was not counter-motion, or it was protected, or it was a silence. The comparison panel prints a voice list. Use it.",
    )
    add_scenario(
        m, 46, "Hand the bar to the bass",
        "The guitar leads, then gets out of the way before the bass attack.",
        "A bass with clear attacks.",
        ["Dialogue: handoff before bass.", "Density: single line or dyad.", "Transformation: Original or Fragment, so the guitar part is short enough to hand off."],
        ["Set handoff on the regions that precede a bass entrance.", "Generate.", "The guitar should shorten before the next bass attack."],
        "A clearance. The bass arrival is clean. This is the conversational opposite of covering the bass.",
        ["Answer after bass reverses the order.", "Leave space clears the last beat even when there is no bass entrance to respect."],
        "Handoff will not lengthen a protected bar to make the clearance. Protection wins.",
    )
    add_scenario(
        m, 47, "Leave the last beat empty",
        "A deliberate hole at the end of the bar. Silence as part of the sentence.",
        "Any metre with a last beat you can spare. 4/4 is obvious. 7/8 still has a last quaver.",
        ["Dialogue: leave space.", "Approach: Spacious abstraction or Chamber lyricism.", "Rhythmic transformation may be Continue, but leave-space still wins.", "Outside colour: off."],
        ["Set leave space.", "Generate.", "In MuseScore 4 the last beat of those bars should be empty in the guitar, even if the riff cell wanted a note there."],
        "The hole is structural. The riff does not fill it. The bass may still be sounding. The guitar’s refusal is the gesture.",
        ["Insert a rest puts a hole inside the cell as well.", "A silence region, where the phrase plan has one, is a larger hole than one beat."],
        "You cannot leave-space a protected bar into a new shape. The source remains.",
    )
    add_scenario(
        m, 48, "Sparse dyads",
        "Two notes, one grip, not a chord chart.",
        "World A, C, or E.",
        ["Density: dyad.", "Approach: Colour-field composition.", "Quartal colour: on only if the collection has a fourth and you are on world E or the world allows it.", "Dialogue: answer after bass."],
        ["Set dyad on the regions you want vertical.", "Generate.", "Read each dyad as a single object against the bass, with rests around it."],
        "Grips of two. Colour-field’s common-tone return can bring the same dyad back. The bass remains the foundation. The guitar is not comping.",
        ["Triad density adds a third note to the grip. Scenario 49.", "Single line deletes the grip and leaves melody."],
        "A dyad is still checked for guitar feasibility. The candidate panel can warn about a fret span. That warning is technical. It is not a player’s approval.",
    )
    add_scenario(
        m, 49, "A triadic gesture",
        "Three notes, once, as a gesture. Then line or silence.",
        "A world built from triads: A, C, D, or F.",
        ["Density on one region: triad.", "The next region: single line.", "Dialogue: handoff before bass.", "World A or F."],
        ["Set only the statement to triad.", "Set the next region to single line.", "Generate.", "You should see one three-note grip, then a thinner answer."],
        "The triad states the world. The single line continues without another block chord. Handoff clears the grip before the bass. This is chamber writing.",
        ["Alternate density lets the page mix grips without you setting each region.", "World E dyads are pentatonic stacks, not necessarily major triads."],
        "Feasibility warnings name bar, onset, MIDI numbers, and fret span. Read them. They do not rewrite the music.",
    )
    add_scenario(
        m, 50, "Register and silence",
        "The guitar high, the bass low, and daylight between phrases.",
        "A locked duo.",
        ["Approach: Spacious abstraction.", "That approach sets a high register, silence, and a short fragmented answer.", "Density: single line.", "Dialogue: leave space.", "Continuation: fragment the motif."],
        ["Apply Spacious abstraction.", "Do not then set density to triad, or you will override the approach.", "Generate three candidates.", "Pick the one with the most rests if space is the aim. The comparison counts rests and silences."],
        "High guitar, intact bass, short answers, empty beats. The distance between the staves is the orchestration. No extra instruments are created.",
        ["Chamber lyricism is lower and more sustained, still sparse.", "Angular modern jazz will fill the same register with fragments and inverted contours."],
        "The approach’s register is a generation setting. The page does not draw a register diagram. Read the notes in MuseScore 4.",
    )
    add_scenario(
        m, 51, "Mixed metre, the cell placed whole",
        "A phrase that already changes metre. The riff cell is still a four-beat cell. It is placed into each bar. It is not quantised, and it is not a mixed-metre cell from the riff engine.",
        "A score whose bars are not all the same length. A verified example runs 4/4, 5/4, 3/4, 7/8, and then the pattern again. The bass of that example stayed the source.",
        ["Import that kind of file, or any file whose lock receipt shows differing metres.", "Riff rhythm: Multi-bar engine rhythm, or This riff’s rhythm.", "Rhythm seed: set it if the multi-bar engine is selected.", "Transformation: Continue or Original.", "Do not expect the engine to supply a 7/8 cell. It will not."],
        ["Lock and read the metre line. Each bar’s beats and beat type should match the file.", "Generate.", "Export.", "Open in MuseScore 4.", "Check each bar adds up, and that a note which did not fit is absent rather than squeezed."],
        "Each bar keeps its own length. Guitar durations inside a verified mixed-metre file summed to the bar. The bass matched the source. The cell was still four beats long. Overflow moves whole or is omitted.",
        ["BHL rhythm instead of a riff cell lets the Rhythm menu write the attacks, which can follow the bass in each metre.", "A new composition cannot change metre mid-piece. Build the mixed file elsewhere, then import it. BHL will not author the metre map from the beats box."],
        "The verified MuseScore page of the mixed-metre example clips the movement title at the left margin. That is an engraving fault of that export. The metres on the systems are still the thing to read. A note finer than the division grid is named and left out.",
    )
    m.figure(str(MUSIC / "mixed-metre.png"), "Figure 8. MuseScore 4 render of the verified mixed-metre example. The title is clipped at the left edge. Candidate for audition, not artistically approved. Read the metre changes, not the cropped words.")

    m.h1("F. Developing a score you already have", "existing")
    m.p("Import locks a span. The bass stays. Protected guitar bars stay. Everything else in the span can be developed, compared, and refined without deleting the parent candidate. Save a project before you change world.")
    m.figure(str(SHOT / "bhl-03-locked.png"), "Figure 9. After Import and lock: instruments, tempo, metre, rehearsal marks, SHA-256, and a locked bass.")

    add_scenario(
        m, 52, "Keep the bass, rewrite the guitar",
        "A new guitar conversation on a bass you already believe.",
        "A duo MusicXML. Work on a copy if the original must remain byte-for-byte identical.",
        ["Import the copy.", "Span: the bars you mean.", "Protected guitar bars: empty if the whole guitar span may change.", "World: the one you are testing.", "Seed noted in your project notes."],
        ["Lock.", "Read “Bass events in the span” and the sentence that those events stay locked.", "Generate guitar.", "Export beside the BHL export folder, not over the album file."],
        "The bass part matches the lock. The guitar in writable bars can differ. Outside the span, the verification says whether the source still matches. The source SHA-256 on a successful lock of the checked Wrong Turning file is the long number printed on the page. Your own file will print its own number.",
        ["Protect the guitar melody and let only later bars change. Scenario 6.", "Three worlds means three projects, not three candidates. Candidates share one world and differ by seed."],
        "Do not export on top of a protected album file. The page writes exports to its export directory. The source stays put only if you do not later copy the export over it yourself.",
    )
    add_scenario(
        m, 53, "Three candidates, then a pair",
        "Hear three seeds with the eye. Compare two at a time. Refuse a numerical winner.",
        "A locked span.",
        ["All musical controls set before you click.", "Generate three candidates.", "Compare stored candidates.", "Select a different row and compare again if you want the third line in a pair."],
        ["Generate the three.", "Leave the first selected.", "Compare. Read attacks, rests, voices, silences.", "Select the third.", "Compare again."],
        "Three stored lines. Each comparison is the selected line against one other. A checked session compared Candidate 1 with Candidate 2 and said the analysis is provisional. There is no score and no automatic winner.",
        ["Refine the line whose silence matches your aim, not the line with the most notes.", "Change the seed on the import panel and lock again only when you want a new family. The three candidates already carry their own seeds."],
        "Comparison uses the stored MusicXML. It does not generate a fourth line. If the controls have changed, the page can mark a candidate stale.",
    )
    m.figure(str(SHOT / "bhl-07-candidates.png"), "Figure 10. Three candidates and one pair comparison.")
    add_scenario(
        m, 54, "Refine without losing the parent",
        "A child line that remembers which candidate it came from.",
        "At least one selected candidate.",
        ["A candidate selected.", "Refine a copy.", "Do not delete the parent. The page does not delete it.", "Project notes: say what you changed before the refine, if you changed anything."],
        ["Select Candidate 1.", "Click Refine a copy.", "Read the new row. It should name the parent.", "Confirm the original row is still there."],
        "A checked refine produced “Candidate 1 refined · seed 3341 · refined from Candidate 1” and the status “Refined candidate added. The original is still in the list.” Your seeds may differ. The parent relationship should be visible.",
        ["Refine the refined row if you want a grandchild. The new row should name its own parent.", "Save after the first refine so a reopen restores the family."],
        "Refine is not an arrangement for a third instrument. The duo remains guitar and bass.",
    )
    m.figure(str(SHOT / "bhl-08-refine.png"), "Figure 11. The refined copy selected, the three originals still listed.")
    add_scenario(
        m, 55, "Save, close, and find the same world again",
        "Tomorrow’s session must restore the world, the riff choice, and the contrast, not only the notes.",
        "At least one candidate. A path you can find again.",
        ["Project id: a musical name, not a date alone.", "Notes: world, collection, reference, contrast, riff pitch, riff rhythm, transformation.", "Save project.", "Project path: the file the button will reopen."],
        ["Save.", "Note the path printed.", "Later, paste that path and click Reopen project.", "Check harmonic world, collection, contrast, and riff menus against your notes."],
        "Reopen restores the locked source and the saved harmonic world. A verified project format stores the riff choice and the contrast id. The controls should show them again.",
        ["Two project ids for two worlds of the same span.", "The notes field is the place to write “do not replace the parent”."],
        "Save project stays disabled until a candidate exists. Reopen stays disabled until the path box has text. The web page will not browse to the file for you.",
    )
    m.figure(str(SHOT / "bhl-09b-reopen-ready.png"), "Figure 12. Project path filled. Reopen project is available. Save project is available once candidates exist.")
    add_scenario(
        m, 56, "Change the span, then lock again",
        "A longer or shorter phrase, without generating on a stale lock.",
        "An existing lock.",
        ["From bar and To bar: the new span.", "Protected guitar bars: revise them if the old numbers fall outside.", "Do not click Generate until the relock message is gone."],
        ["Change the span.", "Read the message that bar span, path, or protected bars changed.", "Import and lock.", "Generate."],
        "The new lock is the span that will be written. The previous candidate is not silently updated. It can be marked stale once controls differ. Generate after the new lock.",
        ["Changing only the approach does not require a new lock.", "Changing the MusicXML path does. You are then on another file."],
        "A span that runs past the end of the file will not lock cleanly. Shorten it to the last real bar.",
    )
    add_scenario(
        m, 57, "One outside tone, then home",
        "A single foreign colour, and a return that still belongs.",
        "World E with a collection, so “home” is unambiguous.",
        ["World E.", "Collection selected.", "Permit one outside-field colour: on.", "Phrase development: recall the cell on the return.", "Transformation: Continue or Original."],
        ["Generate.", "Read resource limitations if any are listed.", "The return should be inside the collection.", "If the page says a semitone could not be kept, accept the report."],
        "At most one outside tone in the development. The return lands in the collection when that is possible. The report, when a semitone will not fit, is the musical limit made visible. Forcing the semitone would lie about the colour.",
        ["Outside colour off is the stricter poem.", "On worlds A to D and F the outside tick still cannot paint pitches the world refuses. Read the constraint."],
        "This is not a modulation plan. One tone is not a new key.",
    )

    m.h1("G. Integration with the rest of Composer OS", "integrate")
    m.p("BHL’s **Cross-engine transfer** panel is the honest list. Direct integration means the choice is made on the BHL page and the engine is called from there. It does not mean a second window opens. File transfer means you export MusicXML and open that file somewhere else.")
    m.table(
        ["From", "Into", "How", "Status"],
        [
            ["Riff cell", "BHL pitch and rhythm", "Menus on the BHL page", "Working, direct"],
            ["Second core cell", "BHL rhythm only", "Another core cell, plus rhythm seed", "Working, direct"],
            ["Multi-bar rhythm", "BHL rhythm", "Multi-bar engine rhythm", "Working, direct"],
            ["Twenty colours", "BHL development", "Collection menu", "Working, direct"],
            ["All twenty colours", "Pentatonic path and phrase", "Use for path transform…", "Working on that page"],
            ["Vault field", "A BHL region", "Harmonic field menu", "Partial. Not the vault screen"],
            ["Liquid harmony", "World B", "The world itself", "Working, direct"],
            ["BHL", "Performance Composer", "Export MusicXML, then Respond", "File only"],
            ["BHL", "Riff Engine", "No import", "Not supported"],
        ],
    )

    add_scenario(
        m, 58, "Choose a harmonic field on the region",
        "The bass field, or another vault field the menu offers, as the local colour of one phrase.",
        "A lock that shows Harmonic field on each region.",
        ["Harmonic field: read the labels. One will be the bass field.", "World B if you want liquid harmony’s quadratonic in particular.", "Any other world if you only want that world’s triads or pentatonic set.", "Do not leave the BHL page looking for a fretboard."],
        ["Open a region.", "Choose a field.", "Generate.", "Open Cross-engine transfer.", "The vault choice should be listed as direct."],
        "The menu is the integration. A different field changes the pitch source for that region inside the world’s rules. You do not import a vault object, and you do not get tablature.",
        ["Leave every region on the bass field when the bass is the harmony you trust.", "World B plus a non-bass field is the more remote quadratonic."],
        "The full Tonality Vault product is another surface. BHL does not embed its fretboard, its tab, its microscope, or its iReal import. This handbook has no guitar tablature.",
    )
    add_scenario(
        m, 59, "Liquid harmony, which is world B",
        "Three chord tones and a tension, planned as liquid harmony, without a button of that name.",
        "A locked bass.",
        ["Harmonic world B · Harmonic Quadratonics.", "No other liquid-harmony control exists.", "Collection optional, as a filter.", "Cross-engine transfer after generate."],
        ["Lock world B.", "Generate.", "Read the transfer text. It should call liquid harmony direct."],
        "The tension tone is the contrast. The chord tones are the common tones. That is the liquid motion this page can do.",
        ["Scenario 9 keeps the chord tones quiet. Scenario 10 features the tension.", "Worlds A and F are triadic and are not liquid harmony, even if a field menu is present."],
        "Do not look for a Liquid Harmony page to launch from BHL. The panel says liquid harmony is world B.",
    )
    add_scenario(
        m, 60, "A second rhythmic cell",
        "Pitches from the first riff. Rhythm from another cell, at another seed.",
        "Locked span.",
        ["Riff pitch: Riff contour.", "Riff rhythm: Another core cell.", "Rhythm seed: a different number from the page seed. The page says to use a different seed from the pitch riff.", "The checked examples found that one seed can accidentally share the pitch riff’s rhythm. If the attacks do not differ, change the rhythm seed.", "Transformation: Continue or Original."],
        ["Set Another core cell.", "Set a rhythm seed.", "Generate.", "If the rhythm matches the pitch cell, change the rhythm seed and generate again."],
        "Two cells. Pitch from one, attacks from the other. A verified file used pitch seed 17 and rhythm seed 1 so the attacks would differ. Seed 29 happened to share the seed-17 rhythm, so it was a bad contrast. Your numbers will differ. The test is whether the attacks differ.",
        ["This riff’s rhythm is the control that refuses a second seed.", "Multi-bar engine rhythm is a longer grid, not a second core cell."],
        "Generate three candidates keeps the rhythm seed. Candidate 1 keeps the transform you chose. The next two change that transform on the same cell, so the three lead rhythms are meant to differ. A checked run used Another core cell, pitch seed 17, rhythm seed 1, and Original, and the three lead rhythms differed. The source file was unchanged. Changing the page seed does not move that onset plan. If the second cell’s attacks match the pitch cell, change the rhythm seed. Seed 29 once shared the seed-17 rhythm.",
    )
    add_scenario(
        m, 61, "A multi-bar rhythm inside the phrase",
        "Four bars of engine rhythm, sixteenth grid, medium, neutral, placed into your metre.",
        "A locked phrase, possibly mixed metre.",
        ["Riff rhythm: Multi-bar engine rhythm.", "Rhythm seed: visible, and used.", "There is no stored second corpus riff and no riff id to type.", "Transformation: Continue if you want that four-bar grid to tile.", "Division grid of the score still applies."],
        ["Select Multi-bar engine rhythm.", "Set the seed.", "Generate.", "Read any note that was named and omitted."],
        "A neutral sixteenth grid, four bars of 4/4 in the engine, placed into the phrase you locked. Mixed metre keeps each bar’s length. The grid is not a quotation of a named riff in a library.",
        ["Another core cell is shorter and comes from a second motif, not from this grid.", "BHL rhythm abandons the engine grid and follows the Rhythm menu."],
        "Accents and articulations are not in the data. They will not appear. A value the bar cannot hold is omitted, not quantised.",
    )
    add_scenario(
        m, 62, "Hand a file to Performance Composer",
        "Continue in another Composer OS page, using notes, not a live BHL object.",
        "A candidate whose locks passed.",
        ["Export MusicXML.", "Remember the path.", "Do not click Open in Sibelius.", "Leave BHL with the project saved.", "Open Performance Composer from the top row.", "Use Respond and choose the exported file."],
        ["Export.", "Save the BHL project first.", "Click Performance Composer.", "Respond, and choose the file.", "Confirm you are looking at MusicXML, not at the .bhl.json project."],
        "Performance Composer reads the notes in the file. It does not receive the BHL world object, the candidate list, or the project. A later change in BHL will not update that page until you export again.",
        ["MuseScore 4 is the place to read engraving. Performance Composer is a different musical tool. Use each for what it accepts.", "You can also open the same MusicXML in any notation host. BHL does not play it."],
        "There is no direct object handoff. If Respond will not take the .bhl.json file, that is correct. Choose the MusicXML.",
    )
    add_scenario(
        m, 63, "What you should not try to connect",
        "A clear stop, so a later session does not invent a wire that is not there.",
        "Any BHL project.",
        ["Do not import a BHL MusicXML into the Riff Engine and expect a round trip. The engine does not import BHL.", "Do not expect an unknown pentatonic id to become minor pentatonic. The page refuses it.", "Do not look for an artist-named approach.", "Do not look for audio inside BHL.", "Do not treat the 13 October desktop app as this page."],
        ["Read Cross-engine transfer once.", "Read the catalogue sentence in the pentatonic panel.", "Stop at the refusals."],
        "The working directions are riff into BHL, colour into BHL, all twenty colours into the Pentatonic path page, vault field as a menu, liquid harmony as world B, and MusicXML out. The reverse riff import, artist profiles, and in-app audio are not supported.",
        ["Hirajoshi and Iwato can be the manual path collection.", "All twenty remain legal as BHL development colours, subject to the world filter."],
        "The catalogue line that mentions Sibelius is stale for this project. Use MuseScore 4. Do not follow that sentence.",
    )

    m.h1("H. Complete short projects", "projects")
    m.p("These five projects combine settings you have already seen. Each is a piece you could take to MuseScore 4 and read. None is approved music. Save a project at the end of each, under its own id.")
    m.figure(str(MUSIC / "sixteen-bars.png"), "Figure 13. The verified sixteen-bar duo in MuseScore 4. Guitar sparse, bass in long notes, audition text colliding with the first system. Use it as a picture of the texture, not as a model you must copy note for note.")

    add_scenario(
        m, 64, "A guitar and bass miniature",
        "Sixteen bars, one colour, one motif, a quiet end.",
        "New composition, or the verified sixteen-bar file opened as a study.",
        ["16 bars, 4/4, tempo 92, seed 3340 if you want a known starting point.", "World E.", "Suspended Pentatonic, reference D, HOME, contrast Hirajoshi only if a development region appears after the lock.", "Approach: Chamber lyricism.", "Riff pitch: BHL world pitches.", "Riff rhythm: BHL rhythm.", "Transformation: Original, then a saved second pass with Continue if you want the cell to return."],
        ["Create, lock, set the approach and the colour.", "Generate three candidates.", "Compare.", "Refine the sparer one.", "Save as miniature-suspended.", "Export.", "Open in MuseScore 4."],
        "A short suspended duo. The bass is long. The guitar is a line with room. Hirajoshi, if the phrase has a development, darkens the middle. Original keeps the motto to one statement. The verified picture in Figure 13 shows how sparse this duo can look, including an engraving collision you should expect on that particular file.",
        ["World A for a triadic miniature instead.", "Protect bar 1 once the motto is right."],
        "Same seed and same controls repeat the guitar. If you change the contrast or the transformation, you have a new piece. Save it separately. The collision of the warning with the notes is a fault of that engraving, not a dynamic marking.",
    )
    add_scenario(
        m, 65, "A reflective ballad",
        "Slow, high or sustained, no cadence, no drum feel.",
        "New score, slow tempo.",
        ["Bars 16 or 32, beats 4, beat type 4, tempo 60.", "World E.", "Open Pentatonic or Suspended Pentatonic.", "Relationship HOME.", "Approach: Chamber lyricism or Spacious abstraction.", "Dialogue: leave space.", "Outside colour: off.", "Transformation: Augment, if you want the motto in long notes."],
        ["Create and lock.", "Apply the approach and do not override density.", "Generate three candidates.", "Choose by rest count and by whether the return sits in the collection.", "Save as ballad-open.", "Export and read in MuseScore 4 at the tempo mark."],
        "A slow duo. Open or suspended colour refuses a third. Leave-space refuses the last beat. Augment lengthens the motto until it spills, which at tempo 60 feels like breath rather than like a groove.",
        ["5/4 at the same tempo widens every bar. Scenario 4.", "Minor pentatonic makes the ballad darker without adding a seventh that functions."],
        "Thirty-two bars is still a song fragment. Do not expect a bridge form unless the bass phrase already has those regions. BHL does not invent lyrics or a chorus.",
    )
    add_scenario(
        m, 66, "An asymmetric groove",
        "Seven quavers, a diminished colour, a fragmented guitar, the bass still locked and plain.",
        "New score in 7/8, or an imported 7/8 span.",
        ["Beats 7, beat type 8, tempo 120, 16 bars.", "World D · Major + Diminished.", "Approach: Angular modern jazz.", "Rhythm: syncopate.", "Riff rhythm: BHL rhythm, for a predictable first pass.", "Transformation: Diminish only if the divisions can hold it. Otherwise Fragment.", "Collection: Blue Pentatonic as a filter, optional, after the first save."],
        ["Create and lock.", "Read the metre.", "Generate three candidates with BHL rhythm.", "Save.", "Only then try Another core cell, and change the rhythm seed if the attacks do not differ."],
        "An uneven bar. World D supplies root, minor third, and tritone. Angular settings fragment and invert. Syncopation shifts the guitar inside the seven. The bass remains whatever the new score or the import locked.",
        ["5/8 is a tighter version of the same idea.", "Rhythmic counterpoint adds voice 2 if the groove needs an argument rather than a fragment."],
        "Do not quantise 7/8 into 4/4 in MuseScore after export and still call it this scenario. Another core cell keeps one rhythm seed across the three candidates and changes the transform. If the second cell matches the pitch cell, change the rhythm seed.",
    )
    add_scenario(
        m, 67, "Two sections, one contrast",
        "A statement in one colour and a development in another, then a return you can recognise.",
        "A span whose region list, after locking, includes a statement and a development or transformation.",
        ["World E.", "Collection: Kumoi or Suspended Pentatonic.", "Contrasting collection: Hirajoshi or Remote Altered.", "Phrase development: recall the cell on the return.", "Transformation: Continue.", "Approach: Colour-field composition.", "Protect the first bar if the statement must be literal."],
        ["Lock and read the region names.", "If you see no development, choose a longer span or a bass that phrases.", "Set the contrast.", "Generate.", "Confirm the constraint mentions both colours.", "Save."],
        "Section one keeps the first collection and, if you protected it, the original guitar. Section two may enter the contrast. The return tries to recall the cell inside the home collection. Continue makes the rhythm recognisable across the cut.",
        ["World F for a triadic version of the same two-section plan, contrast coming from the tritone triad rather than from Hirajoshi.", "Fragment on the second section if the contrast should be shorter than the statement."],
        "No development region means the contrast is reported and unused. Lengthening the span is the remedy, not a second imaginary section control. There is no button named Section B.",
    )
    add_scenario(
        m, 68, "A longer developmental span",
        "As long a duo as the page allows, still guitar and bass, still one world, with silence and a recalled cell.",
        "New composition at the long end, or a long imported span.",
        ["Bars 64, or the longest span you can lock, beats 4, beat type 4, tempo 96.", "World E.", "Collection: Dorian Pentatonic.", "Contrast: Aeolian Pentatonic.", "Approach: Chamber lyricism for the outer regions. On a middle region only, set density to counterline and dialogue to counter-motion.", "Transformation: Continue.", "Phrase development: recall the cell on the return.", "Outside colour: off.", "Save before you override the middle region, so the pure lyric version remains."],
        ["Create or import.", "Lock.", "Read how many regions the bass produced.", "Generate three candidates on the lyric approach.", "Save as long-dorian-lyric.", "Then override one middle region to counter-motion.", "Generate and save as long-dorian-counter.", "Export either. Read it in MuseScore 4 in sections, not only at the first system."],
        "Up to sixty-four bars of one pentatonic world, with a contrasting collection where a development exists, a recalled cell, and optional two-voice writing in the middle. The bass stays locked. Silence from leave-space, if the approach set it, remains part of the length. This is as far as a single BHL canvas goes. It is not an orchestral score and not a multi-movement form.",
        ["32 bars is often enough. Sixty-four can become an ostinato unless Original replaces Continue.", "World B for the same length makes the long form liquid rather than pentatonic."],
        "Sixty-four bars will not grow extra players. Mixed metre will not appear unless the imported file already has it. A return that cannot keep a semitone inside Dorian or Aeolian will be reported. Candidate comparison is still a pair. Artistic approval is still not implied.",
    )

    m.h1("Limits", "limits")
    m.p("These limits are part of the instrument. Working inside them is the craft.")
    m.bullets([
        "No audio in BHL. Read MusicXML in MuseScore 4. Ignore the button labelled Open in Sibelius, and ignore the catalogue sentence that mentions Sibelius.",
        "No artist-named approaches.",
        "No guitar tablature, and no Tonality Vault fretboard inside BHL.",
        "No substitution of minor pentatonic when a colour id is unknown.",
        "No BHL object passed to Performance Composer. MusicXML only, then Respond.",
        "No BHL import into the Riff Engine.",
        "No quantise. Illegal notes are named and omitted.",
        "No automatic winner among candidates. Comparison is a pair.",
        "Another core cell does not make three rhythms by changing the page seed. The three candidates change the transform and keep the rhythm seed.",
        "Empty intersection between a colour and worlds A to D or F leaves the guitar on the world.",
        "A missing development region leaves a contrast unused.",
        "Protected bars and the bass win over riffs, counter-lines, and transformations.",
        "The installed desktop application of 13 October 2026 is not this page.",
        "The headings skip the numbers 3, 4, and 6.",
        "No generated file in this handbook is musically approved.",
    ])
    m.h1("Glossary", "glossary")
    m.table(
        ["Term", "Meaning"],
        [
            ["Approach", "Chamber lyricism, Angular modern jazz, Colour-field composition, Rhythmic counterpoint, or Spacious abstraction."],
            ["Collection", "One of the twenty pentatonic colours."],
            ["Common tone", "A pitch class kept across a move."],
            ["Contrast", "The other triad, the tension tone, the tritone triad, or the contrasting collection."],
            ["Counter-motion", "A second guitar voice against the bass."],
            ["Dialogue", "Answer after bass, counter-motion, handoff before bass, or leave space."],
            ["Dyad / triad", "One grip of two notes, or of three. Not a comping pattern."],
            ["Harmonic field", "The region menu that carries a bass field or a vault choice."],
            ["HOME", "Relationship offset zero. The collection unshifted."],
            ["Liquid harmony", "World B. Not a separate button."],
            ["Lock", "The recorded source. Bass events in the span stay."],
            ["Reference", "The spelling note for a collection."],
            ["Relationship", "A shift. Not a new scale."],
            ["Seed", "Repeats a guitar when the other controls match."],
            ["World E", "The collection is the pitch source."],
            ["Worlds A–D and F", "Their own fields. A colour is a filter."],
        ],
    )
    m.p("The Quick Start Guide walks a first sixteen-bar piece in one sitting. This handbook is the catalogue of musical jobs around that sitting. When a control is missing from both books, it is missing because the page does not have it.")
    return m
