#import "../shared/template.typ": *

#show: configure.with(
  [Handbook · The Complete Creative Composition Handbook],
  [Composer OS V3.2.0 · Handbook · commit 1072b365 · 16 October 2026],
  hb-accent,
)

#align(horizon + left)[
  #kicker[Composer OS V3.2]
  #v(2mm)
  #text(font: "Source Sans 3", size: 26pt, weight: 700)[The Complete Creative Composition Handbook]
  #v(4mm)
  #text(size: 12pt)[Ninety-two craft scenarios and thirty cross-engine recipes. The software is one tool. The musical job comes first. Every software step carries a status: Verified, Verify, or Manual.]
  #v(4mm)
  #link(<contents>)[Go to Contents]
  #linebreak()
  #link("Composer-OS-V3.2-Musicians-Quick-Start-Guide.pdf")[Musician’s Quick Start Guide]
]

#pagebreak()
= Edition and how to read a scenario
This book teaches composition. Generate, the Studio, Pentatonic, Hexatonic, and BHL are ways to get a sound onto the desk. They are not the piece.

Each scenario uses the same blocks: musical goal, starting material, engine selection, exact procedure, musical result, variations, further development. The rail holds why the idea is interesting, the status badges, and an exercise.

Verified means the control or preset is in the source, and in several cases was seen on the running app (bundle v2.10.10, 16 October 2026). Verify means the route exists and this edition did not click that exact result. Manual means you do the work in a notation program, a DAW, or your ear.

BHL scenarios 1–68 stay in the V1.0 handbook. This book cites them as BHL sNN. Scale names from the Tonal glossary are used under the MIT licence. Mask 1709 and mask 2457 are numbers, not imported scale titles.

Sibelius was not launched. One plate, scenario 14.4, was exported from the MusicXML with MuseScore Studio 4.7.5. The other figures are diagrams. Open `assets/notation/hexatonic-cell-quartet.musicxml` if you want to engrave it again.

#pagebreak()
= The capability rule
Do not treat a route name as a finished feature. Arranger, Structure, Ensemble, and Grid are real pages. Their musical effect is Verify until you try them on a file you care about. There is no orchestral score engine and no film-sync clock. Electronic processing starts after MusicXML leaves the app. Practice has no drone. Develop in BHL Composer appears only when the sounding set matches. Use in Generate is not on the Studio page.

Presets you can ask for by name: Guitar/Bass Duo, Guitar–Bass Duo (Single-Line), Wyble Etude, Slonimsky Etude, Martino Linear, ECM Chamber, Song Mode, Big Band, String Quartet, Riff Generator, and SQ → BB.

#pagebreak()
#contents-page(3)

#pagebreak()
= Part I · Foundations
Three short chapters before the scenarios. They are the method, the map, and the scale language used later.

#pagebreak()
== 1 · Composing with engines
An engine proposes notes. You decide whether they are the piece. Keep the parent file. Change one musical variable at a time so you know what you heard. Write one sentence when you choose. That sentence is worth more than another generate.

Exercise. Generate one duo and refuse to listen twice. Write what you remember. Then listen and mark what you invented.

Exercise. Take a four-note cell and write only its inversion. Stop.

#pagebreak()
== 2 · The map and the register
#ui[Generate] makes scores from presets. #ui[Practice & Scales Studio] hears a scale, shows the fretboard, and writes exercises. #ui[Pentatonic] holds twenty colour cards and a path. #ui[Hexatonic] holds scalar collections and WPS triad pairs. #ui[BHL] repaints a guitar against a locked bass inside worlds A–F. #ui[Evaluation] and #ui[Performance Composer] are routes whose exact forms this edition marks Verify.

Exercise. Open each of those routes and write the heading you see. Do not generate.

#pagebreak()
== 3 · Scales as sound worlds
A formula such as 1 2 b3 4 5 6 b7 is A Dorian when the root is A. The Essentials list says so. More Named Scales holds names such as Hirajoshi. Advanced Set Theory holds sets that may have no traditional name. The mask is the number in About this scale. A Dorian’s mask is 1709. The augmented hexatonic on C, spelling C, E-flat, E, G, A-flat, B, is mask 2457.

Brightness here is informal: a raised sixth sounds brighter than a flat sixth. Kumoi’s A against Hirajoshi’s A-flat is the example used in scenario 7.3. The app does not print a brightness score on the card. The card does print a role sentence. Read that sentence before you compose.

Exercise. Play A Dorian with #ui[Play Scale]. Sing the sixth. Then switch to natural minor and sing the flat sixth.

#pagebreak()
= Part II · Craft
Sixteen chapters. Ninety-two scenarios. One musical question per chapter.


#pagebreak()
#heading(level: 2)[4 · Melodic invention and transformation]
#text(size: 12pt)[How does a three-note idea stay itself after you bend it?]

A motif is a sound you can recognise, not a bar you must repeat. These scenarios keep one cell and change contour, pitch field, speed, or register. BHL already teaches several of the transforms. This chapter points at those scenarios and adds the Studio and the Martino preset where they are the better tool.

#pagebreak()
#kicker[Intermediate · Scenario 4.1]
#heading(level: 3)[4.1 One motif, four contours] <s-4-1>
#duo[
*Fast lane.* Keep three notes and draw them four ways: rising, falling, wedge, and flat.

*Musical goal.* Keep three notes and draw them four ways: rising, falling, wedge, and flat.

*Starting material.* A three-note cell you can sing, exported as MusicXML from a short duo or written by hand.

*Engine selection.* Generate preset Guitar/Bass Duo, then BHL if the bass should stay. Cross-read BHL s34.

*Exact procedure.*

#strong[1.] State the cell once in #ui[Guitar/Bass Duo] or on paper.\
#strong[2.] Copy it up, then down, then as a wedge that opens and closes, then as a repeated pitch.\
#strong[3.] Follow BHL s34 for the guitar-side transforms if the bass is already locked.\
#strong[4.] Stop when a listener can still sing the first three notes.\

*Musical result.* Four shapes, one identity. The rhythm can stay.

*Variations.* Change only the last note of contour three.

*Further development.* Take the winning contour into 4.3.
][
#callout[Why it is interesting][The ear binds notes by shape more reliably than by bar number.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Sing the four contours before you look at the page.]
#v(2mm)
#link(<s-4-2>)[Related 4.2]
]

#pagebreak()
#kicker[Intermediate · Scenario 4.2]
#heading(level: 3)[4.2 Keep the rhythm, change the pitch field] <s-4-2>
#duo[
*Fast lane.* The durations stay. The pitch collection changes.

*Musical goal.* The durations stay. The pitch collection changes.

*Starting material.* One bar of rhythm you like, plus a second scale in the Studio.

*Engine selection.* Practice and Scales Studio, or BHL s35. Cross-read BHL s35.

*Exact procedure.*

#strong[1.] Notate or generate the rhythm.\
#strong[2.] In #ui[Practice & Scales Studio], choose a new scale and press #ui[Play Scale].\
#strong[3.] Map the old rhythm onto the new scale degrees. Do not add notes.\
#strong[4.] BHL s35 is the same idea inside a locked bass.\

*Musical result.* A familiar gait in a new light.

*Variations.* Move only the last pitch by one scale step.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Rhythm is the memory. Pitch is the colour.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Clap the rhythm, then play it on the new scale.]
#v(2mm)
#link(<s-4-3>)[Related 4.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 4.3]
#heading(level: 3)[4.3 Augment and diminish a hook] <s-4-3>
#duo[
*Fast lane.* Double the note values, then halve them, without rewriting the intervals.

*Musical goal.* Double the note values, then halve them, without rewriting the intervals.

*Starting material.* A one-bar hook.

*Engine selection.* Your notation program, or BHL s37 and s38. Cross-read BHL s37 and s38.

*Exact procedure.*

#strong[1.] Write the hook in crotchets.\
#strong[2.] Augment it to minims. BHL s37 if you are already in BHL.\
#strong[3.] Diminish the original to quavers. BHL s38.\
#strong[4.] Place the long form at the cadence and the short form at the start.\

*Musical result.* The same intervals at two speeds.

*Variations.* Augment only the first half.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Speed changes weight. The tune does not have to change pitch.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Play the long form, then the short form, as a pair.]
#v(2mm)
#link(<s-4-4>)[Related 4.4]
]

#pagebreak()
#kicker[Intermediate · Scenario 4.4]
#heading(level: 3)[4.4 The inverted motto in a new register] <s-4-4>
#duo[
*Fast lane.* Turn the motif upside down and move it an octave.

*Musical goal.* Turn the motif upside down and move it an octave.

*Starting material.* The cell from 4.1.

*Engine selection.* BHL s43, or by hand in the notation program. Cross-read BHL s43.

*Exact procedure.*

#strong[1.] Invert the intervals. Up a third becomes down a third.\
#strong[2.] Put the inversion an octave away from the original.\
#strong[3.] BHL s43 covers invert-and-lift with the bass locked.\
#strong[4.] Keep one note in common with the original register so the ear can join them.\

*Musical result.* A reply that is the same shape in a mirror.

*Variations.* Invert only the last two notes.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Register makes the mirror feel like a second voice.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Play original then inversion without looking.]
#v(2mm)
#link(<s-4-5>)[Related 4.5]
]

#pagebreak()
#kicker[Beginner · Scenario 4.5]
#heading(level: 3)[4.5 A melodic-cell exercise as a theme] <s-4-5>
#duo[
*Fast lane.* Let a Studio exercise become the theme, not a warm-up you discard.

*Musical goal.* Let a Studio exercise become the theme, not a warm-up you discard.

*Starting material.* Family Melodic cells, difficulty Intermediate, 4 bars, seed written down.

*Engine selection.* Practice and Scales Studio.

*Exact procedure.*

#strong[1.] In the Studio choose #ui[Melodic cells] and #ui[Intermediate].\
#strong[2.] Press #ui[Generate]. Write down the seed.\
#strong[3.] Press #ui[Export MusicXML].\
#strong[4.] Use that file as the theme. Do not generate another until you have played this one.\

*Musical result.* A theme whose intervals already survived the exercise generator.

*Variations.* Press \#ui\[Generate another\] only after you can sing the first one.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A practised cell is already a motif.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Loop it at the exercise tempo, then half that tempo.]
#v(2mm)
#link(<s-4-6>)[Related 4.6]
]

#pagebreak()
#kicker[Advanced · Scenario 4.6]
#heading(level: 3)[4.6 Martino Linear as a long melody] <s-4-6>
#duo[
*Fast lane.* Use the Martino Linear preset as a long line, then cut it down to a singable theme.

*Musical goal.* Use the Martino Linear preset as a long line, then cut it down to a singable theme.

*Starting material.* Preset Martino Linear.

*Engine selection.* Generate preset Martino Linear. Cutting the line is manual.

*Exact procedure.*

#strong[1.] On #ui[Generate], choose #ui[Martino Linear].\
#strong[2.] Generate and open the MusicXML.\
#strong[3.] Circle four bars you can sing. Delete nothing yet.\
#strong[4.] That four-bar slice is the theme. The rest is reserve material.\

*Musical result.* A long line with one memorable slice.

*Variations.* Transpose the slice up a fourth by hand and see if it still sings.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Length is not a melody. A slice you can remember is.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Sing the slice from memory the next day.]
#v(2mm)
#link(<s-4-7>)[Related 4.7]
]

#pagebreak()
#kicker[Advanced · Scenario 4.7]
#heading(level: 3)[4.7 Melody from an unnamed scale formula] <s-4-7>
#duo[
*Fast lane.* Build a tune from a formula that has no traditional name.

*Musical goal.* Build a tune from a formula that has no traditional name.

*Starting material.* Advanced Set Theory in the Studio, one mask you choose.

*Engine selection.* Practice and Scales Studio. The tune itself is manual.

*Exact procedure.*

#strong[1.] Search the mask or the pitch classes. Press #ui[Play Scale].\
#strong[2.] Write eight notes using only those pitch classes.\
#strong[3.] If validation on an exercise reports an error, do not treat that exercise as the tune.\
#strong[4.] Name the set in your notebook yourself. The app will not invent a title.\

*Musical result.* A melody whose only rule is membership of the set.

*Variations.* Allow one outside note and mark it.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A formula is a fence, not a style.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Play the eight notes over a single held root.]
#v(2mm)
#link(<s-5-1>)[Related 5.1]
]

#pagebreak()
#heading(level: 2)[5 · Riffs and hooks]
#text(size: 12pt)[What makes four bars want to start again?]

A riff is a loop with a reason to return. A hook is the same idea asked to survive a song section. The Riff Generator makes the short file. BHL and the Studio change its colour. They do not replace the decision to stop at four bars.

#pagebreak()
#kicker[Beginner · Scenario 5.1]
#heading(level: 3)[5.1 Four-bar loop with a turnaround] <s-5-1>
#duo[
*Fast lane.* A four-bar riff whose last bar leans back into the first.

*Musical goal.* A four-bar riff whose last bar leans back into the first.

*Starting material.* Preset Riff Generator, or the RiffGen route.

*Engine selection.* Riff Generator. The turnaround edit is manual if the export has no cadence.

*Exact procedure.*

#strong[1.] Choose #ui[Riff Generator]. Keep the result inside four bars.\
#strong[2.] Loop it in your notation program.\
#strong[3.] If the fourth bar does not lead to the first, change the last chord or the last pitch by hand.\
#strong[4.] Do not add a fifth bar.\

*Musical result.* A loop you can enter without a count-off once you know it.

*Variations.* Move the turnaround chord to bar 2 and hear the loop weaken.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The return is the composition.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Record yourself looping it eight times. Mark the bar where you drift.]
#v(2mm)
#link(<s-5-2>)[Related 5.2]
]

#pagebreak()
#kicker[Intermediate · Scenario 5.2]
#heading(level: 3)[5.2 Riff into BHL, pitches from the world] <s-5-2>
#duo[
*Fast lane.* Keep the riff rhythm. Take the pitches from a BHL world.

*Musical goal.* Keep the riff rhythm. Take the pitches from a BHL world.

*Starting material.* The four-bar riff, bass locked if you import it.

*Engine selection.* Riff Generator, then BHL s33. Cross-read BHL s33.

*Exact procedure.*

#strong[1.] Import only if BHL accepts the file. BHL s33 is the rhythm case.\
#strong[2.] Lock the bass. Choose one world.\
#strong[3.] Let the guitar pitches come from that world. Do not keep the old melody out of habit.\
#strong[4.] Do not send the BHL file back into the Riff Engine.\

*Musical result.* Same kick, new pitch field.

*Variations.* Try world E, pentatonic harmony, if the riff was diatonic.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The body remembers the rhythm while the ear accepts new notes.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Clap the riff, then play only the new pitches.]
#v(2mm)
#link(<s-5-3>)[Related 5.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 5.3]
#heading(level: 3)[5.3 Riff rhythm, pentatonic colour] <s-5-3>
#duo[
*Fast lane.* Hang the riff’s rhythm on one pentatonic card.

*Musical goal.* Hang the riff’s rhythm on one pentatonic card.

*Starting material.* A rhythm from 5.1 and one colour on the Pentatonic page.

*Engine selection.* Pentatonic page and, if you want an exercise, the Studio.

*Exact procedure.*

#strong[1.] On #ui[Pentatonic], press #ui[Use for path transform and phrase generation] on Minor Pentatonic or Kumoi.\
#strong[2.] Write the riff rhythm using only that spelling.\
#strong[3.] Optional: #ui[Practice this collection] and generate a rhythmic study in the Studio.\
#strong[4.] Loop four bars.\

*Musical result.* A riff that cannot leave the five notes.

*Variations.* Swap Kumoi for Hirajoshi and keep every duration.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Five notes make the loop easier to hear and harder to clutter.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Play it with a metronome click that is not written into the score.]
#v(2mm)
#link(<s-5-4>)[Related 5.4]
]

#pagebreak()
#kicker[Intermediate · Scenario 5.4]
#heading(level: 3)[5.4 One-note-away riff variants] <s-5-4>
#duo[
*Fast lane.* Change one note and keep three riffs that still loop.

*Musical goal.* Change one note and keep three riffs that still loop.

*Starting material.* The four-bar riff.

*Engine selection.* Manual editing of a Riff Generator file.

*Exact procedure.*

#strong[1.] Copy the riff twice.\
#strong[2.] Change one pitch in bar 2 on the first copy.\
#strong[3.] Change one pitch in bar 4 on the second copy.\
#strong[4.] Discard any copy that no longer returns.\

*Musical result.* A small family, not a new piece.

*Variations.* Change a rest into a note and see the loop get worse.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][One note is enough difference if the rhythm holds.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Teach the three versions to your hands in one sitting.]
#v(2mm)
#link(<s-5-5>)[Related 5.5]
]

#pagebreak()
#kicker[Intermediate · Scenario 5.5]
#heading(level: 3)[5.5 Hook placement in Song Mode sections] <s-5-5>
#duo[
*Fast lane.* Put the hook at the start of the chorus section and nowhere else, first.

*Musical goal.* Put the hook at the start of the chorus section and nowhere else, first.

*Starting material.* Preset Song Mode and a four-bar hook.

*Engine selection.* Song Mode. Section controls are Verify if they are not on your form.

*Exact procedure.*

#strong[1.] Choose #ui[Song Mode].\
#strong[2.] Place the hook only in the section you mean to be the chorus.\
#strong[3.] If you cannot find per-section controls, stop and read the Musician Guide before inventing a slider.\
#strong[4.] Export and check the hook bars by counting.\

*Musical result.* A song plan where the hook has an address.

*Variations.* Allow the hook once in the verse, shortened.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Placement is form.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Point at the hook bar without replaying the whole file.]
#v(2mm)
#link(<s-5-6>)[Related 5.6]
]

#pagebreak()
#kicker[Advanced · Scenario 5.6]
#heading(level: 3)[5.6 Riff as bass ostinato under a new melody] <s-5-6>
#duo[
*Fast lane.* The riff moves to the bass. The guitar sings something slower.

*Musical goal.* The riff moves to the bass. The guitar sings something slower.

*Starting material.* A four-bar riff that already loops.

*Engine selection.* Guitar–Bass Duo (Single-Line) as a reference. The new melody is manual.

*Exact procedure.*

#strong[1.] Put the riff in the bass, an octave down if range allows.\
#strong[2.] Write a guitar melody in minims that uses the same pitch classes.\
#strong[3.] Leave one bar of the guitar empty.\
#strong[4.] If you use Single-Line Duo, generate a reference and replace the guitar by hand.\

*Musical result.* A bass hook with a tune above it.

*Variations.* Let the bass rest on bar 4.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The riff can be the accompaniment and still be the idea.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Sing the slow tune while the bass riff plays.]
#v(2mm)
#link(<s-6-1>)[Related 6.1]
]

#pagebreak()
#heading(level: 2)[6 · Songwriting and unusual song structures]
#text(size: 12pt)[Where does the hook live if the song refuses a chorus?]

Song Mode plans hooks, sections, and rules, then realises guitar and bass. Per-section metre, pin, and avoid are described in the Musician Guide. If a control is not on the form in front of you, the step stays Verify. A through-composed song is still mostly your own assembly.

#pagebreak()
#kicker[Intermediate · Scenario 6.1]
#heading(level: 3)[6.1 Hook-first Song Mode] <s-6-1>
#duo[
*Fast lane.* Write the hook before you name the sections.

*Musical goal.* Write the hook before you name the sections.

*Starting material.* A four-bar hook you can sing, and preset Song Mode.

*Engine selection.* Song Mode.

*Exact procedure.*

#strong[1.] Choose #ui[Song Mode].\
#strong[2.] Put the hook in first. Do not start from a 32-bar habit.\
#strong[3.] Generate and mark the bars that still contain the hook.\
#strong[4.] If the hook vanished, keep the MusicXML and place it by hand.\

*Musical result.* A song file whose memorable bars are the ones you wrote first.

*Variations.* Move the hook one bar later and hear the vocal entry change.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The hook is the architecture.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Sing only the hook bars from the export.]
#v(2mm)
#link(<s-6-2>)[Related 6.2]
]

#pagebreak()
#kicker[Advanced · Scenario 6.2]
#heading(level: 3)[6.2 Verse in four, chorus in seven] <s-6-2>
#duo[
*Fast lane.* One song, two metres, each with a job.

*Musical goal.* One song, two metres, each with a job.

*Starting material.* A verse phrase in 4/4 and a chorus phrase that wants 7/8.

*Engine selection.* Song Mode if per-section metre is on the form. Otherwise manual.

*Exact procedure.*

#strong[1.] Confirm the Musician Guide path for per-section metre.\
#strong[2.] Set the verse section in 4/4 and the chorus in 7/8 only if those controls are on the form.\
#strong[3.] If they are not, write the two metres in your notation program and keep Song Mode as the harmony plan.\
#strong[4.] Count beats aloud across the join.\

*Musical result.* A chorus that limps on purpose against a straight verse.

*Variations.* Swap the metres and notice which section can stand the odd bar.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Metre can be the contrast. You do not need a new key.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Conduct the join with one hand.]
#v(2mm)
#link(<s-6-3>)[Related 6.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 6.3]
#heading(level: 3)[6.3 Pin and Avoid for a contrast arc] <s-6-3>
#duo[
*Fast lane.* Hold one colour in the verse and refuse it in the bridge.

*Musical goal.* Hold one colour in the verse and refuse it in the bridge.

*Starting material.* A Song Mode plan and two pitch classes you care about.

*Engine selection.* Song Mode Pin and Avoid. Verify on your build.

*Exact procedure.*

#strong[1.] Find Pin and Avoid. The Musician Guide documents them.\
#strong[2.] Pin a pitch class in the verse.\
#strong[3.] Avoid that pitch class in the bridge.\
#strong[4.] If the controls are absent, do the same edit in the MusicXML and mark the step Manual.\

*Musical result.* Two sections with a deliberate missing note.

*Variations.* Pin a rest instead, by leaving beat 4 empty.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Refusal is a compositional act.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][Name the pinned note before you press generate.]
#v(2mm)
#link(<s-6-4>)[Related 6.4]
]

#pagebreak()
#kicker[Advanced · Scenario 6.4]
#heading(level: 3)[6.4 A song with no chorus] <s-6-4>
#duo[
*Fast lane.* Through-composed. The hook returns as a memory, not as a section label.

*Musical goal.* Through-composed. The hook returns as a memory, not as a section label.

*Starting material.* Three different four-bar ideas.

*Engine selection.* Song Mode as a spine. Assembly is manual.

*Exact procedure.*

#strong[1.] Generate a #ui[Song Mode] reference if you want a harmonic spine.\
#strong[2.] Assemble A B C by hand so no block repeats in full.\
#strong[3.] Quote two notes of A at the end of C.\
#strong[4.] Do not add a chorus section out of habit.\

*Musical result.* A song that arrives somewhere and does not reset.

*Variations.* Repeat only the rhythm of A, not the pitches.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Form can be a journey without a billboard.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Tell a friend where the quote happens without playing it.]
#v(2mm)
#link(<s-6-5>)[Related 6.5]
]

#pagebreak()
#kicker[Intermediate · Scenario 6.5]
#heading(level: 3)[6.5 Bridge in a remote pentatonic] <s-6-5>
#duo[
*Fast lane.* The bridge leaves the home five notes.

*Musical goal.* The bridge leaves the home five notes.

*Starting material.* A verse in major pentatonic and the Remote Altered card, or In Sen.

*Engine selection.* Pentatonic colours. Song Mode splice is manual.

*Exact procedure.*

#strong[1.] On #ui[Pentatonic], read Remote Altered: C, D-flat, E, G-flat, B-flat at C.\
#strong[2.] Press #ui[Use for path transform and phrase generation] on that card.\
#strong[3.] Write the bridge only from those pitches.\
#strong[4.] Splicing it into Song Mode is manual unless a handoff is on the page. There is no Use in Generate button on the Studio.\

*Musical result.* A bridge that shares little with the verse and still has a fence.

*Variations.* Use In Sen instead: C, D-flat, F, G, B-flat. No third.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Distance is audible when common tones disappear.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][List the common pitch classes between verse and bridge. Aim for one or none.]
#v(2mm)
#link(<s-6-6>)[Related 6.6]
]

#pagebreak()
#kicker[Advanced · Scenario 6.6]
#heading(level: 3)[6.6 Zappa disruption in a song form] <s-6-6>
#duo[
*Fast lane.* Break the form once, on purpose, then return.

*Musical goal.* Break the form once, on purpose, then return.

*Starting material.* A Song Mode file and the Frank Zappa disruption behaviour described in the Musician Guide.

*Engine selection.* Song Mode with the documented Zappa disruption path.

*Exact procedure.*

#strong[1.] Read the Guide section on Zappa disruption before you look for a button.\
#strong[2.] Plan one bar that interrupts the hook.\
#strong[3.] Generate or edit so the interruption happens once.\
#strong[4.] Return to the hook immediately after.\

*Musical result.* Humour from a planned break, not from random notes.

*Variations.* Put the break on the last bar of the verse instead.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Surprise needs a pattern to break.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Ask a listener which bar felt wrong, and whether that was the planned bar.]
#v(2mm)
#link(<s-7-1>)[Related 7.1]
]

#pagebreak()
#heading(level: 2)[7 · Pentatonic worlds]
#text(size: 12pt)[What can five notes do if you refuse the usual minor box?]

The Pentatonic page holds twenty registered colours. Each card can become the path collection. Silence is a real result. A colour is not a claim that every note in a score belongs to it. Names such as Kumoi are the app’s labels. The Studio can practise the same set after Practice this collection.

#pagebreak()
#kicker[Beginner · Scenario 7.1]
#heading(level: 3)[7.1 Bright home, dark home] <s-7-1>
#duo[
*Fast lane.* Hear major pentatonic and minor pentatonic as two homes, not as one shape moved.

*Musical goal.* Hear major pentatonic and minor pentatonic as two homes, not as one shape moved.

*Starting material.* Major Pentatonic C D E G A, and Minor Pentatonic C E-flat F G B-flat.

*Engine selection.* Pentatonic page and the Studio. Cross-read BHL s19 and s20.

*Exact procedure.*

#strong[1.] On #ui[Pentatonic], press #ui[Use for path transform and phrase generation] on Major Pentatonic.\
#strong[2.] Press #ui[Generate path] with Ending set to Required return home.\
#strong[3.] Repeat on Minor Pentatonic.\
#strong[4.] Send one of them with #ui[Practice this collection] and press #ui[Play Scale].\

*Musical result.* Two stable homes. Same set-class, different centre, as the card text says for minor.

*Variations.* Hold C in the bass under both and hear the third change.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Home is a centre, not a fingering.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Sing 1–2–3–5–6, then 1–b3–4–5–b7, from the same C.]
#v(2mm)
#link(<s-7-2>)[Related 7.2]
]

#pagebreak()
#kicker[Beginner · Scenario 7.2]
#heading(level: 3)[7.2 Suspended, no third] <s-7-2>
#duo[
*Fast lane.* A colour that will not choose major or minor.

*Musical goal.* A colour that will not choose major or minor.

*Starting material.* Suspended Pentatonic: C D F G B-flat. Open Pentatonic: C D F G A.

*Engine selection.* Pentatonic Suspended and Open cards. Cross-read BHL s21.

*Exact procedure.*

#strong[1.] Use the Suspended Pentatonic card, then #ui[Generate path].\
#strong[2.] Write a four-bar tune with no E and no E-flat.\
#strong[3.] Compare with Open Pentatonic, which also has no seventh.\
#strong[4.] Do not add a third to make it easier.\

*Musical result.* An open loop. Harmony can sit on the fence.

*Variations.* Add the third only in the last bar, by hand, and hear the spell break.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The missing third is the sound.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Improvise for one minute without playing a third.]
#v(2mm)
#link(<s-7-3>)[Related 7.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 7.3]
#heading(level: 3)[7.3 Kumoi to Hirajoshi] <s-7-3>
#duo[
*Fast lane.* Move from a soft dark colour to a more fragile one by one pitch.

*Musical goal.* Move from a soft dark colour to a more fragile one by one pitch.

*Starting material.* Kumoi C D E-flat G A. Hirajoshi C D E-flat G A-flat.

*Engine selection.* Pentatonic Kumoi and Hirajoshi cards. Cross-read BHL s23.

*Exact procedure.*

#strong[1.] Select Kumoi and press #ui[Use for path transform and phrase generation].\
#strong[2.] Write a four-note cell.\
#strong[3.] Change only A to A-flat and you are in Hirajoshi.\
#strong[4.] Generate a path on Hirajoshi and hear the flat sixth.\

*Musical result.* One semitone of difference, and the colour turns inward.

*Variations.* Keep A in the bass and A-flat in the tune.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Neighbour colours teach the ear more than distant ones.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Name which note changed before you play the second colour.]
#v(2mm)
#link(<s-7-4>)[Related 7.4]
]

#pagebreak()
#kicker[Intermediate · Scenario 7.4]
#heading(level: 3)[7.4 Both thirds in one field] <s-7-4>
#duo[
*Fast lane.* Major and minor at once, without a key change.

*Musical goal.* Major and minor at once, without a key change.

*Starting material.* Ambiguous Third: C E-flat E G B-flat.

*Engine selection.* Pentatonic Ambiguous Third card. Any drone is manual. Cross-read BHL s26.

*Exact procedure.*

#strong[1.] Open the Ambiguous Third card and read the spelling.\
#strong[2.] Press #ui[Use for path transform and phrase generation].\
#strong[3.] Write a bar that contains both E-flat and E.\
#strong[4.] Do not resolve them. The card’s job is that they stay unresolved.\

*Musical result.* A field that will not pick a mode.

*Variations.* Put the two thirds a bar apart and hear the tension drop.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Ambiguity is a colour, not a mistake.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Play the bar slowly over a C drone you supply yourself. The Studio has no drone.]
#v(2mm)
#link(<s-7-5>)[Related 7.5]
]

#pagebreak()
#kicker[Intermediate · Scenario 7.5]
#heading(level: 3)[7.5 Shift a collection without a new scale] <s-7-5>
#duo[
*Fast lane.* Move the same five intervals onto a new spelling reference.

*Musical goal.* Move the same five intervals onto a new spelling reference.

*Starting material.* One card you already know.

*Engine selection.* Pentatonic spelling reference. Cross-read BHL s29.

*Exact procedure.*

#strong[1.] Change Spelling reference from C to E-flat.\
#strong[2.] Read the new spelling on the same card.\
#strong[3.] The intervals stay. The letter names move.\
#strong[4.] This is not a new colour. BHL s29 is the related shift.\

*Musical result.* The same colour, a new place on the fingerboard.

*Variations.* Shift by a tritone and see which chord you still believe.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Transposition is not a new scale.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Play both spellings and say the intervals, not the note names.]
#v(2mm)
#link(<s-7-6>)[Related 7.6]
]

#pagebreak()
#kicker[Advanced · Scenario 7.6]
#heading(level: 3)[7.6 When nothing is shared] <s-7-6>
#duo[
*Fast lane.* Two collections with no common pitch class, used as tension.

*Musical goal.* Two collections with no common pitch class, used as tension.

*Starting material.* A home colour and Remote Altered, or another card whose notes do not overlap.

*Engine selection.* Pentatonic cards. The comparison is manual. Cross-read BHL s31.

*Exact procedure.*

#strong[1.] List the five pitch classes of the home colour.\
#strong[2.] List Remote Altered at the same reference.\
#strong[3.] If they share a note, pick another card or another spelling until the intersection is empty.\
#strong[4.] Put home in bars 1–2 and the remote colour in bars 3–4. BHL s31 is the handbook version of the empty intersection.\

*Musical result.* A cut, not a modulation.

*Variations.* Allow one shared tone and hear the cut soften.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Zero common tones is a structural event.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Write the two sets on paper and circle the intersection. It should be empty.]
#v(2mm)
#link(<s-8-1>)[Related 8.1]
]

#pagebreak()
#heading(level: 2)[8 · Hexatonic and triad pairs]
#text(size: 12pt)[What happens when two triads, not a scale, own the bar?]

Hexatonic Engine offers scalar collections and WPS triad pairs. Generated notes are a phrase preview, not an approval. The laboratory can show common tones. Blind audition hides the name. Export MusicXML only after a phrase exists.

#pagebreak()
#kicker[Intermediate · Scenario 8.1]
#heading(level: 3)[8.1 Triad-pair hexatonic on the fretboard] <s-8-1>
#duo[
*Fast lane.* See a six-note pair as two grips, not as a scale run.

*Musical goal.* See a six-note pair as two grips, not as a scale run.

*Starting material.* Family WPS triad pair, one pair whose label you can read.

*Engine selection.* Hexatonic WPS triad pair. Fretboard check is in the Studio if you enter the pitch classes there.

*Exact procedure.*

#strong[1.] Set Family to #ui[WPS triad pair] and choose a pair.\
#strong[2.] Read Selection: pitches and triads.\
#strong[3.] Press #ui[Generate INSIDE / OUTSIDE / RETURN].\
#strong[4.] Find both triads on the Studio fretboard only after you know the pitch classes. Do not expect the Hexatonic page to draw the frets.\

*Musical result.* Two triads you can name, and a phrase that moves between them.

*Variations.* Stay inside one triad for two bars.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A pair is vocabulary. A scale run would hide it.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Say the two triad names aloud, then play one note from each.]
#v(2mm)
#link(<s-8-2>)[Related 8.2]
]

#pagebreak()
#kicker[Advanced · Scenario 8.2]
#heading(level: 3)[8.2 Augmented hexatonic symmetry] <s-8-2>
#duo[
*Fast lane.* Hear a set that survives transposition by a major third.

*Musical goal.* Hear a set that survives transposition by a major third.

*Starting material.* Scalar collection Augmented t0: C, E-flat, E, G, A-flat, B. Mask 2457.

*Engine selection.* Hexatonic Augmented t0.

*Exact procedure.*

#strong[1.] Choose #ui[Scalar collection] and #ui[Augmented t0]. Tonal centre C.\
#strong[2.] Read Pitches before you generate.\
#strong[3.] Press #ui[Generate INSIDE / OUTSIDE / RETURN], then #ui[Export MusicXML].\
#strong[4.] Transpose the exported line up a major third in your notation program. The pitch classes should match the set.\

*Musical result.* Imitation that does not leave the sound.

*Variations.* Use Augmented t1 and compare the spelling.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Symmetry is a way to write canon without new notes.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][List the six pitch classes and tick each note of the export.]
#v(2mm)
#link(<s-8-3>)[Related 8.3]
]

#figure(
  image("../assets/diagrams/aug-hex-clock.svg", width: 70%, alt: "Pitch-class clock. Filled notes are C, E-flat, E, G, A-flat, and B. A line joins the cell C, E-flat, E, G."),
  caption: [Augmented hexatonic on C, mask 2457. Joined notes are the cell used in scenario 14.4.],
)

#pagebreak()
#kicker[Beginner · Scenario 8.3]
#heading(level: 3)[8.3 Triad and dyad studies as vocabulary] <s-8-3>
#duo[
*Fast lane.* Practise the pair as grips before you write a tune.

*Musical goal.* Practise the pair as grips before you write a tune.

*Starting material.* A hexatonic whose pitch classes you have written down.

*Engine selection.* Practice and Scales Studio, family Triad and dyad studies.

*Exact procedure.*

#strong[1.] In the Studio, set the scale or the pitch classes you can actually select.\
#strong[2.] Family #ui[Triad and dyad studies], difficulty #ui[Intermediate], then #ui[Generate].\
#strong[3.] If the Studio cannot represent that exact hexatonic, practise the two triads as pitch lists by hand and say so.\
#strong[4.] Export only if validation says there are no errors.\

*Musical result.* Hands that know the verticals before the melody asks for them.

*Variations.* Limit yourself to dyads for the first eight bars of writing.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Vocabulary learned in the hand shows up in the line.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Play four dyads from the set, then stop.]
#v(2mm)
#link(<s-8-4>)[Related 8.4]
]

#pagebreak()
#kicker[Intermediate · Scenario 8.4]
#heading(level: 3)[8.4 Hexatonic melody over a static bass] <s-8-4>
#duo[
*Fast lane.* The bass holds one pitch. The guitar uses the six.

*Musical goal.* The bass holds one pitch. The guitar uses the six.

*Starting material.* An exported hexatonic phrase and one bass note chosen from the set.

*Engine selection.* Hexatonic export. Bass pedal is manual.

*Exact procedure.*

#strong[1.] Export the phrase.\
#strong[2.] Add a bass whole note on a chord tone from the set. That edit is manual.\
#strong[3.] Do not walk the bass yet.\
#strong[4.] Hear the melody change colour over the pedal.\

*Musical result.* Motion against stillness.

*Variations.* Move the pedal to the other triad’s root.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A pedal reveals the collection.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Hold the bass and sing the phrase.]
#v(2mm)
#link(<s-8-5>)[Related 8.5]
]

#pagebreak()
#kicker[Advanced · Scenario 8.5]
#heading(level: 3)[8.5 Provisional collections, hearing not approving] <s-8-5>
#duo[
*Fast lane.* Listen to a provisional pair without treating the screen as a verdict.

*Musical goal.* Listen to a provisional pair without treating the screen as a verdict.

*Starting material.* Core triad-pair laboratory, Provisional Core candidates.

*Engine selection.* Hexatonic laboratory, blind audition.

*Exact procedure.*

#strong[1.] Open the laboratory and choose Provisional Core candidates.\
#strong[2.] Press #ui[Blind audition] and answer before you reveal the name.\
#strong[3.] Save a listening answer with #ui[Save listening answer].\
#strong[4.] Leave the status as not approved. The page does not promote a provisional set by itself.\

*Musical result.* A note about what you heard, not a stamp.

*Variations.* Reveal the name only after you have written the note.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Hearing is not approval.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Write one sentence before you click the next excerpt.]
#v(2mm)
#link(<s-8-6>)[Related 8.6]
]

#pagebreak()
#kicker[Advanced · Scenario 8.6]
#heading(level: 3)[8.6 Hexatonic into BHL colour] <s-8-6>
#duo[
*Fast lane.* Send a hexatonic set toward BHL only when the sounding set matches.

*Musical goal.* Send a hexatonic set toward BHL only when the sounding set matches.

*Starting material.* A scalar or WPS set that the Studio or BHL can recognise.

*Engine selection.* Conditional Studio to BHL handoff. Otherwise manual MusicXML import. Verify.

*Exact procedure.*

#strong[1.] Do not assume a Hexatonic button hands the set to BHL.\
#strong[2.] On the Studio, #ui[Develop in BHL Composer] appears only when the sounding set matches.\
#strong[3.] If the button is absent, export MusicXML and import it in BHL yourself, then lock the bass.\
#strong[4.] Keep world E or the matching world. Do not force world A onto a set it does not describe.\

*Musical result.* A colour that survives the handoff, or a clear refusal.

*Variations.* If the button is missing, stop. That is information.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A handoff that changes the notes is not a handoff.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][Compare pitch classes before and after. They should match.]
#v(2mm)
#link(<s-9-1>)[Related 9.1]
]

#pagebreak()
#heading(level: 2)[9 · BHL and liquid harmony]
#text(size: 12pt)[How do you repaint the guitar without moving the bass?]

These pages are summaries. The procedures live in BHL Creative Scenarios Handbook V1.0, scenarios 1–68. Worlds A–F are fixed. Liquid harmony is world B. There is no separate Liquid Harmony button. BHL has no audio of its own and no tablature.

#pagebreak()
#kicker[Beginner · Scenario 9.1]
#heading(level: 3)[9.1 Worlds A to F on one page] <s-9-1>
#duo[
*Fast lane.* Know the six worlds well enough to choose one before you lock.

*Musical goal.* Know the six worlds well enough to choose one before you lock.

*Starting material.* The world table in the V1.0 handbook.

*Engine selection.* BHL Harmonic world menu, as documented in the V1.0 handbook.

*Exact procedure.*

#strong[1.] Read worlds A to F once. Do not generate yet.\
#strong[2.] Say the contrast of world A: the other major triad a tone away, no shared pitch class.\
#strong[3.] Say the contrast of world F: the tritone triad, which shares none.\
#strong[4.] Pick one world for today’s file and ignore the other five.\

*Musical result.* A choice, not a tour.

*Variations.* Swap A for F on the same bass and hear the guitar’s light change.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The world is the guitar’s pitch field. The bass is the promise.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Cover the table and recite one contrast from memory.]
#v(2mm)
#link(<s-9-2>)[Related 9.2]
]

#figure(
  image("../assets/diagrams/bhl-worlds.svg", width: 100%, alt: "Six tiles for BHL worlds A to F with common-tone and contrast text from the V1.0 handbook."),
  caption: [Worlds A–F as summarised from the BHL V1.0 table.],
)

#pagebreak()
#kicker[Intermediate · Scenario 9.2]
#heading(level: 3)[9.2 Liquid harmony as world B] <s-9-2>
#duo[
*Fast lane.* World B is the liquid-harmony integration: three chord tones plus a primary tension.

*Musical goal.* World B is the liquid-harmony integration: three chord tones plus a primary tension.

*Starting material.* A locked bass and world B, Harmonic quadratonics.

*Engine selection.* BHL world B. Cross-read BHL s59.

*Exact procedure.*

#strong[1.] Lock the bass.\
#strong[2.] Choose world B. There is no Liquid Harmony button to press instead.\
#strong[3.] Follow BHL s59.\
#strong[4.] The tension tone may sit in the field without being the star of the line.\

*Musical result.* Chord tones carry the line. The tension is available.

*Variations.* Feature the tension tone on one downbeat only.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Liquid harmony here is a world, not a second app.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Name the tension tone before you play.]
#v(2mm)
#link(<s-9-3>)[Related 9.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 9.3]
#heading(level: 3)[9.3 A tension tone that leans] <s-9-3>
#duo[
*Fast lane.* One tension tone, aimed, not sprinkled.

*Musical goal.* One tension tone, aimed, not sprinkled.

*Starting material.* World B already locked. BHL s10.

*Engine selection.* BHL world B, scenario s10. Cross-read BHL s10.

*Exact procedure.*

#strong[1.] Identify the primary tension.\
#strong[2.] Place it once in the bar, on a weak beat first.\
#strong[3.] Resolve it by step inside the chord tones, or leave it hanging on purpose.\
#strong[4.] Do not add a second tension until you can hear the first.\

*Musical result.* Lean, then arrival, or lean with no arrival.

*Variations.* Put the tension on beat one and hear it become a chord tone in the ear.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][One foreign note is a story. Five are weather.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Sing the tension and its resolution before you fret them.]
#v(2mm)
#link(<s-9-4>)[Related 9.4]
]

#pagebreak()
#kicker[Intermediate · Scenario 9.4]
#heading(level: 3)[9.4 Protected bars] <s-9-4>
#duo[
*Fast lane.* Some bars must survive every later pass.

*Musical goal.* Some bars must survive every later pass.

*Starting material.* A statement you refuse to lose. BHL s06.

*Engine selection.* BHL protect and lock. Cross-read BHL s06.

*Exact procedure.*

#strong[1.] Mark the protected bars before you generate again.\
#strong[2.] If you edit the protected text after locking, generate waits until you lock again.\
#strong[3.] The bass stays locked even when the protect box is empty, as the V1.0 text says.\
#strong[4.] Protect a second bar only when a later rhyme must survive.\

*Musical result.* A fixed statement inside a changing guitar.

*Variations.* Protect nothing and notice what you miss.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Protection is form.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Point at the protected bar in the file after a second pass.]
#v(2mm)
#link(<s-9-5>)[Related 9.5]
]

#pagebreak()
#kicker[Intermediate · Scenario 9.5]
#heading(level: 3)[9.5 Refine without losing the parent] <s-9-5>
#duo[
*Fast lane.* A child candidate that still shows its parent.

*Musical goal.* A child candidate that still shows its parent.

*Starting material.* Three candidates. BHL s54.

*Engine selection.* BHL refine. Dynamics are manual. Cross-read BHL s54.

*Exact procedure.*

#strong[1.] Keep the parent file untouched.\
#strong[2.] Refine one candidate.\
#strong[3.] If you cannot hear the parent in the child, undo.\
#strong[4.] Comparison has no automatic winner.\

*Musical result.* A revision, not a new piece.

*Variations.* Change only dynamics by hand. BHL will not write them.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Refinement that erases the parent has failed.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Play parent and child back to back and name one shared bar.]
#v(2mm)
#link(<s-10-1>)[Related 10.1]
]

#pagebreak()
#heading(level: 2)[10 · Transformational harmony, unrelated triads, and reharmonisation]
#text(size: 12pt)[How do you move to a triad that shares one note, or none?]

BHL worlds A and F already contain the minor-third pair and the tritone pair. Duo generation can carry polychords, slash chords, and Coltrane changes when those symbols are accepted. If the form rejects a symbol, keep the manual version and do not pretend the preset invented it.

#pagebreak()
#kicker[Intermediate · Scenario 10.1]
#heading(level: 3)[10.1 Minor-third pair, one shared tone] <s-10-1>
#duo[
*Fast lane.* Two major triads a minor third apart, joined by one note.

*Musical goal.* Two major triads a minor third apart, joined by one note.

*Starting material.* World F’s minor-third pair. BHL s17. Example: C major and E-flat major share G.

*Engine selection.* BHL world F. Cross-read BHL s17.

*Exact procedure.*

#strong[1.] Lock a bass. Choose world F.\
#strong[2.] Use the pair that shares one tone. Do not jump to the tritone triad yet.\
#strong[3.] Let the shared tone be the hinge in the guitar.\
#strong[4.] Follow s17 rather than rewriting it.\

*Musical result.* A door between triads.

*Variations.* Put the shared tone in the bass instead of the guitar.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][One common tone is enough glue.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Name the shared pitch class before you play.]
#v(2mm)
#link(<s-10-2>)[Related 10.2]
]

#pagebreak()
#kicker[Advanced · Scenario 10.2]
#heading(level: 3)[10.2 Tritone triad, nothing shared] <s-10-2>
#duo[
*Fast lane.* A triad a tritone away that shares no pitch class with the first.

*Musical goal.* A triad a tritone away that shares no pitch class with the first.

*Starting material.* World F’s tritone contrast. BHL s18.

*Engine selection.* BHL world F. Cross-read BHL s18.

*Exact procedure.*

#strong[1.] Start from the minor-third pair so the ear has a home.\
#strong[2.] Move to the tritone triad for one bar only.\
#strong[3.] Return.\
#strong[4.] Do not fill the gap with passing chromatics.\

*Musical result.* A clean break, then a return.

*Variations.* Stay on the tritone triad for four bars and hear the home disappear.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][No shared tone means the change is the event.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][List both triads’ pitch classes and confirm the intersection is empty.]
#v(2mm)
#link(<s-10-3>)[Related 10.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 10.3]
#heading(level: 3)[10.3 Polychord reharmonisation in the duo] <s-10-3>
#duo[
*Fast lane.* An upper structure over a simple bass, written as a polychord if the duo accepts it.

*Musical goal.* An upper structure over a simple bass, written as a polychord if the duo accepts it.

*Starting material.* A tune you already have, and a polychord symbol such as D over C.

*Engine selection.* Guitar/Bass Duo. Symbol acceptance is Verify.

*Exact procedure.*

#strong[1.] Open #ui[Guitar/Bass Duo].\
#strong[2.] Enter the polychord in custom chords only if the field accepts it. The Musician Guide documents polychords.\
#strong[3.] If the symbol is rejected, write the upper structure in the guitar staff by hand.\
#strong[4.] Compare with the original file. Do not overwrite it.\

*Musical result.* The tune stands. The colour above the bass changes.

*Variations.* Move the upper triad by a semitone and keep the bass.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Upper structures are reharmonisation you can see.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Play the bass alone, then add the upper triad.]
#v(2mm)
#link(<s-10-4>)[Related 10.4]
]

#pagebreak()
#kicker[Advanced · Scenario 10.4]
#heading(level: 3)[10.4 Coltrane changes as a duo] <s-10-4>
#duo[
*Fast lane.* Major-third key cycles in the duo, not in a big band.

*Musical goal.* Major-third key cycles in the duo, not in a big band.

*Starting material.* A short tune and Coltrane changes as described in the Musician Guide.

*Engine selection.* Duo with documented Coltrane changes, or a manual chart.

*Exact procedure.*

#strong[1.] Confirm the Guide’s Coltrane-changes path.\
#strong[2.] Apply it to eight bars of the duo.\
#strong[3.] If the control is missing, write the three tonal centres a major third apart by hand.\
#strong[4.] Keep the melody. Change the centres under it.\

*Musical result.* A cycle that moves by major thirds.

*Variations.* Put the same cycle in 5/4 only if per-section metre is available.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The cycle is the harmony. The tune should still be recognisable.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Name the three centres before you listen.]
#v(2mm)
#link(<s-10-5>)[Related 10.5]
]

#pagebreak()
#kicker[Intermediate · Scenario 10.5]
#heading(level: 3)[10.5 Slash-chord pedal reharmonisation] <s-10-5>
#duo[
*Fast lane.* A pedal in the bass, a moving chord above, written as a slash chord.

*Musical goal.* A pedal in the bass, a moving chord above, written as a slash chord.

*Starting material.* A four-bar tune.

*Engine selection.* Guitar/Bass Duo or a manual slash spelling.

*Exact procedure.*

#strong[1.] Choose a pedal, for example C.\
#strong[2.] Write slash chords whose bass is C if the duo field accepts them.\
#strong[3.] If it does not, put C in the bass staff and the upper chords in the guitar.\
#strong[4.] Hold the pedal for all four bars.\

*Musical result.* Motion over a floor.

*Variations.* Change the pedal on bar 3.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The slash is a spelling of a pedal, not a new style.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Sing the upper chord roots while the pedal stays.]
#v(2mm)
#link(<s-10-6>)[Related 10.6]
]

#pagebreak()
#kicker[Intermediate · Scenario 10.6]
#heading(level: 3)[10.6 Compare two reharmonisations] <s-10-6>
#duo[
*Fast lane.* Two files, one choice, written down.

*Musical goal.* Two files, one choice, written down.

*Starting material.* The original and one reharm from this chapter.

*Engine selection.* Evaluation route is Verify. The note is manual.

*Exact procedure.*

#strong[1.] Open #ui[Evaluation] and confirm what the page actually compares.\
#strong[2.] If it will not load both files, compare them in your notation program.\
#strong[3.] Write three lines: what stayed, what changed, which file you will play.\
#strong[4.] There is no automatic winner.\

*Musical result.* A decision you can read next week.

*Variations.* Compare a third file only after the pair is decided.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Choosing is part of composing.]
#v(2mm)
#badge("verify") #badge("manual")
#v(2mm)
#callout[Exercise][Date the note.]
#v(2mm)
#link(<s-11-1>)[Related 11.1]
]

#pagebreak()
#heading(level: 2)[11 · Jazz guitar and radical chord melody]
#text(size: 12pt)[How do you harmonise a line without turning it into a piano reduction?]

Wyble Etude is a real two-voice guitar preset. Slonimsky Etude is a chromatic pattern preset. Drop-voicing and unrelated-triad chord melody are hand work on top of those files. There is no tablature in BHL, and this chapter does not add any.

#pagebreak()
#kicker[Intermediate · Scenario 11.1]
#heading(level: 3)[11.1 Wyble two-voice étude] <s-11-1>
#duo[
*Fast lane.* Two independent guitar voices from the Wyble preset, read as counterpoint.

*Musical goal.* Two independent guitar voices from the Wyble preset, read as counterpoint.

*Starting material.* Preset Wyble Etude.

*Engine selection.* Generate preset Wyble Etude.

*Exact procedure.*

#strong[1.] Choose #ui[Wyble Etude] and generate.\
#strong[2.] Open the MusicXML and confirm two voices.\
#strong[3.] Mark where the voices share an attack and where they do not.\
#strong[4.] Do not add a third voice yet.\

*Musical result.* A guitar étude whose interest is the gap between the voices.

*Variations.* Mute one voice and hear what the other still says.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Two notes at a time can be complete.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Tap the shared attacks only.]
#v(2mm)
#link(<s-11-2>)[Related 11.2]
]

#pagebreak()
#kicker[Advanced · Scenario 11.2]
#heading(level: 3)[11.2 Slonimsky pattern as a chord-melody skeleton] <s-11-2>
#duo[
*Fast lane.* A chromatic pattern becomes the top voice. You add the chords by hand.

*Musical goal.* A chromatic pattern becomes the top voice. You add the chords by hand.

*Starting material.* Preset Slonimsky Etude.

*Engine selection.* Slonimsky Etude. Chord tones are manual.

*Exact procedure.*

#strong[1.] Generate #ui[Slonimsky Etude].\
#strong[2.] Pick four bars of the line.\
#strong[3.] Under each downbeat, add one dyad by hand. Stay inside a key you can name, or refuse a key and say so.\
#strong[4.] Do not harmonise every semiquaver.\

*Musical result.* A skeleton. The pattern is still audible.

*Variations.* Harmonise only bar 1 and bar 4.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A pattern is not yet a chord melody.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Play the top voice alone, then with the dyads.]
#v(2mm)
#link(<s-11-3>)[Related 11.3]
]

#pagebreak()
#kicker[Advanced · Scenario 11.3]
#heading(level: 3)[11.3 Two-note sevenths over a BHL line] <s-11-3>
#duo[
*Fast lane.* Dyads of a third and a seventh above a locked BHL guitar line.

*Musical goal.* Dyads of a third and a seventh above a locked BHL guitar line.

*Starting material.* A BHL export whose bass is locked.

*Engine selection.* BHL export. Dyads are manual.

*Exact procedure.*

#strong[1.] Export the BHL MusicXML.\
#strong[2.] On the guitar, add a second note a third or a seventh above selected melody notes. Manual.\
#strong[3.] Leave at least half the melody unharmonised.\
#strong[4.] Do not release the bass lock in a later BHL pass if you still need it.\

*Musical result.* Chord melody that is still a line.

*Variations.* Use sixths instead of sevenths for four bars.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Two notes imply the chord. The rest can stay melodic.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Name the seventh quality on each dyad you added.]
#v(2mm)
#link(<s-11-4>)[Related 11.4]
]

#pagebreak()
#kicker[Advanced · Scenario 11.4]
#heading(level: 3)[11.4 Unrelated-triad chord melody] <s-11-4>
#duo[
*Fast lane.* Harmonise a line with triads that share one note, then none.

*Musical goal.* Harmonise a line with triads that share one note, then none.

*Starting material.* A single-note line from world F or from your own hand.

*Engine selection.* Manual voicing. BHL world F can supply the line.

*Exact procedure.*

#strong[1.] Bar 1: triad that shares one note with the melody.\
#strong[2.] Bar 2: triad a tritone away that shares none. See 10.2.\
#strong[3.] Keep the melody untouched.\
#strong[4.] This voicing step is not a preset.\

*Musical result.* Surprise without a chromatic smear.

*Variations.* Share the melody note as the top of the triad, then as an inner voice.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The melody can be the glue the triads refuse to be.]
#v(2mm)
#badge("manual")
#v(2mm)
#callout[Exercise][Write the shared or empty intersection under each bar.]
#v(2mm)
#link(<s-11-5>)[Related 11.5]
]

#pagebreak()
#kicker[Advanced · Scenario 11.5]
#heading(level: 3)[11.5 Drop-voicing a hexatonic line] <s-11-5>
#duo[
*Fast lane.* Drop the middle note of a close triad down an octave.

*Musical goal.* Drop the middle note of a close triad down an octave.

*Starting material.* Three-note chords drawn from Augmented t0 or from a WPS pair.

*Engine selection.* Manual. Hexatonic only supplies the pitch field.

*Exact procedure.*

#strong[1.] Build a close-position triad from the set.\
#strong[2.] Drop the middle voice an octave.\
#strong[3.] Check every note is still in the six.\
#strong[4.] No engine does this drop for you.\

*Musical result.* A wider guitar voicing that has not left the collection.

*Variations.* Drop the top voice instead and reject it if it muddies the melody.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Spacing changes the chord more than a new pitch sometimes.]
#v(2mm)
#badge("manual")
#v(2mm)
#callout[Exercise][Play close, then dropped, on the same beat.]
#v(2mm)
#link(<s-11-6>)[Related 11.6]
]

#pagebreak()
#kicker[Advanced · Scenario 11.6]
#heading(level: 3)[11.6 Radical reharm of a standard-like form] <s-11-6>
#duo[
*Fast lane.* A 32-bar frame with a strange triadic surface.

*Musical goal.* A 32-bar frame with a strange triadic surface.

*Starting material.* Your own chord sketch in a 32-bar song form. Not a copyrighted lead sheet.

*Engine selection.* Duo reference plus BHL or manual triads.

*Exact procedure.*

#strong[1.] Put the original changes into #ui[Guitar/Bass Duo] if you want a reference file.\
#strong[2.] Replace the bridge with world F triads by hand or via BHL.\
#strong[3.] Keep the form’s bar counts.\
#strong[4.] Compare the two files. No automatic winner.\

*Musical result.* An old shape with a new surface.

*Variations.* Reharm only the last eight bars.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Form can stay familiar while the triads misbehave.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Count to 32. If you are short, you changed the form.]
#v(2mm)
#link(<s-12-1>)[Related 12.1]
]

#pagebreak()
#heading(level: 2)[12 · Guitar and upright bass]
#text(size: 12pt)[Who speaks first, and who leaves the space?]

The duo presets are the centre of this chapter. Single-line duo is one note at a time in each part. Register, rests, and odd metres are musical choices. Performance Composer receives MusicXML only.

#pagebreak()
#kicker[Beginner · Scenario 12.1]
#heading(level: 3)[12.1 The bass speaks first] <s-12-1>
#duo[
*Fast lane.* The bass states the cell. The guitar answers.

*Musical goal.* The bass states the cell. The guitar answers.

*Starting material.* Preset Guitar/Bass Duo or Single-Line. BHL s44 if you are developing a locked bass.

*Engine selection.* Single-line duo. The delay may be manual. Cross-read BHL s44.

*Exact procedure.*

#strong[1.] Generate #ui[Guitar–Bass Duo (Single-Line)].\
#strong[2.] If the guitar enters on beat one with the bass, delay the guitar by hand.\
#strong[3.] Give the bass two bars alone.\
#strong[4.] BHL s44 is the same dramatic order inside a locked file.\

*Musical result.* A conversation with a first speaker.

*Variations.* Let the guitar speak first and hear the piece become a tune with bass.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Order is character.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Cover the guitar staff. The bass should still make sense.]
#v(2mm)
#link(<s-12-2>)[Related 12.2]
]

#pagebreak()
#kicker[Intermediate · Scenario 12.2]
#heading(level: 3)[12.2 Single-line conversation] <s-12-2>
#duo[
*Fast lane.* Neither part plays a chord.

*Musical goal.* Neither part plays a chord.

*Starting material.* Preset Guitar–Bass Duo (Single-Line).

*Engine selection.* Guitar–Bass Duo (Single-Line).

*Exact procedure.*

#strong[1.] Generate #ui[Guitar–Bass Duo (Single-Line)].\
#strong[2.] Confirm both staves are single-note lines.\
#strong[3.] If you see block chords, you are on Guitar/Bass Duo instead.\
#strong[4.] Thin any bar where both parts fill every beat.\

*Musical result.* Two lines and the air between them.

*Variations.* Add one dyad in the guitar at the end. Only one.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Conversation needs turns.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Mark the bar where you think the guitar answers.]
#v(2mm)
#link(<s-12-3>)[Related 12.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 12.3]
#heading(level: 3)[12.3 Register and silence] <s-12-3>
#duo[
*Fast lane.* The same pitches, two octaves apart, with a rest that is part of the line.

*Musical goal.* The same pitches, two octaves apart, with a rest that is part of the line.

*Starting material.* A duo you already believe. BHL s50.

*Engine selection.* Duo export plus a manual register change, or BHL s50. Cross-read BHL s50.

*Exact procedure.*

#strong[1.] Move the guitar up an octave for four bars. Manual if the export will not.\
#strong[2.] Leave the last beat of those bars empty.\
#strong[3.] Return to the original register.\
#strong[4.] Do not fill the rest with a pickup.\

*Musical result.* Space you can hear.

*Variations.* Put the rest in the bass instead.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Silence is a note with no pitch.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Count the empty beat out loud.]
#v(2mm)
#link(<s-12-4>)[Related 12.4]
]

#pagebreak()
#kicker[Advanced · Scenario 12.4]
#heading(level: 3)[12.4 Mixed-metre duo] <s-12-4>
#duo[
*Fast lane.* A duo that changes metre because the phrase does.

*Musical goal.* A duo that changes metre because the phrase does.

*Starting material.* BHL s51, or a duo you rebar in the notation program.

*Engine selection.* BHL mixed metre or a manual rebar of a duo. Cross-read BHL s51.

*Exact procedure.*

#strong[1.] Decide the metres before you generate, for example 4/4 then 7/8.\
#strong[2.] If Generate will not set them, rebar the MusicXML in your notation program.\
#strong[3.] Keep the motif. Change only the barline.\
#strong[4.] Play the join until the odd bar feels inevitable.\

*Musical result.* A limp that belongs to the tune.

*Variations.* Stay in 4/4 and displace the accent instead. That is 17.4’s cousin.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Metre is a spelling of accent.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Conduct both metres.]
#v(2mm)
#link(<s-12-5>)[Related 12.5]
]

#pagebreak()
#kicker[Advanced · Scenario 12.5]
#heading(level: 3)[12.5 Duo hand-off to Performance Composer] <s-12-5>
#duo[
*Fast lane.* A second guitar response to a finished duo, via Performance Composer.

*Musical goal.* A second guitar response to a finished duo, via Performance Composer.

*Starting material.* BHL or duo MusicXML. The route is Performance Composer. BHL s62.

*Engine selection.* Performance Composer. Verify the respond path on your build. Cross-read BHL s62.

*Exact procedure.*

#strong[1.] Export MusicXML. Performance Composer receives MusicXML only.\
#strong[2.] Open #ui[Performance Composer] and confirm it will take the file.\
#strong[3.] If the page does not offer a respond path, stop. Do not invent one.\
#strong[4.] Keep the bass. Let any new guitar be a second take, not a replacement of the file.\

*Musical result.* Two takes. The bass still agrees with itself.

*Variations.* Refuse the second take if the bass moved.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A second persona is useful only if the first file survives.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][Write which take you prefer and why, in one sentence.]
#v(2mm)
#link(<s-13-1>)[Related 13.1]
]

#pagebreak()
#heading(level: 2)[13 · Counterpoint and independent lines]
#text(size: 12pt)[When do two lines stay two lines?]

Independence is not density. Wyble, the SQ to BB sketch, and a protected bass are three different machines. Mirror counterpoint in a symmetric cell is hand work. The augmented hexatonic is the safest fence for that hand work because a major-third transposition stays inside the set.

#pagebreak()
#kicker[Intermediate · Scenario 13.1]
#heading(level: 3)[13.1 Wyble counterpoint, analysed] <s-13-1>
#duo[
*Fast lane.* Describe the two Wyble voices before you change them.

*Musical goal.* Describe the two Wyble voices before you change them.

*Starting material.* A Wyble Etude export.

*Engine selection.* Wyble Etude.

*Exact procedure.*

#strong[1.] Mark contrary motion, parallel motion, and rests.\
#strong[2.] Count shared attacks per bar.\
#strong[3.] If every attack is shared, the file is a harmonisation, not a conversation.\
#strong[4.] Change nothing until the count is written down.\

*Musical result.* A diagnosis.

*Variations.* Then delay one voice by a crotchet and listen again.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][You cannot edit independence you have not measured.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Write the count on the first page of the printout.]
#v(2mm)
#link(<s-13-2>)[Related 13.2]
]

#pagebreak()
#kicker[Advanced · Scenario 13.2]
#heading(level: 3)[13.2 SATB line-first sketch] <s-13-2>
#duo[
*Fast lane.* Four voices first. The band chart is a later translation.

*Musical goal.* Four voices first. The band chart is a later translation.

*Starting material.* Preset SQ → BB.

*Engine selection.* Preset SQ → BB.

*Exact procedure.*

#strong[1.] Choose #ui[SQ → BB].\
#strong[2.] Read the four-voice sketch before you read any big-band plan.\
#strong[3.] If export fails, you may have planning JSON. That is not four sung lines.\
#strong[4.] Only then look at the section plan.\

*Musical result.* A quartet of lines that might later wear a band’s clothes.

*Variations.* Sing one inner voice alone.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Translation is not the same job as invention.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Name the voice that has the motif.]
#v(2mm)
#link(<s-13-3>)[Related 13.3]
]

#pagebreak()
#kicker[Advanced · Scenario 13.3]
#heading(level: 3)[13.3 Mirror counterpoint in a symmetric cell] <s-13-3>
#duo[
*Fast lane.* A line and its inversion, both inside Augmented t0.

*Musical goal.* A line and its inversion, both inside Augmented t0.

*Starting material.* Cell C, E-flat, E, G. Inversion can stay in C, E-flat, E, G, A-flat, B.

*Engine selection.* Manual, inside the Augmented t0 field from Hexatonic.

*Exact procedure.*

#strong[1.] Write the cell.\
#strong[2.] Invert it.\
#strong[3.] Check every pitch against the six. The MusicXML companion file shows one working quartet spelling.\
#strong[4.] No preset writes this mirror for you.\

*Musical result.* Two shapes, one set.

*Variations.* Start the mirror a crotchet later.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Symmetry lets the mirror be consonant without a new chord.]
#v(2mm)
#badge("manual")
#v(2mm)
#callout[Exercise][Tick each pitch class. Reject any outsider.]
#v(2mm)
#link(<s-13-4>)[Related 13.4]
]

#pagebreak()
#kicker[Intermediate · Scenario 13.4]
#heading(level: 3)[13.4 Rhythmic independence by displacement] <s-13-4>
#duo[
*Fast lane.* Same pitches. One voice starts a beat late.

*Musical goal.* Same pitches. One voice starts a beat late.

*Starting material.* A duo line. BHL s36.

*Engine selection.* BHL s36 or a manual shift. Cross-read BHL s36.

*Exact procedure.*

#strong[1.] Copy the guitar rhythm onto the bass.\
#strong[2.] Shift the bass by one crotchet.\
#strong[3.] Keep the pitch classes.\
#strong[4.] Stop if the bar no longer adds up. Fix the durations before you add notes.\

*Musical result.* Two downbeats.

*Variations.* Shift by a quaver instead.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Displacement is counterpoint’s cheapest tool.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Clap both rhythms together.]
#v(2mm)
#link(<s-13-5>)[Related 13.5]
]

#pagebreak()
#kicker[Intermediate · Scenario 13.5]
#heading(level: 3)[13.5 Counter-line against a protected bass] <s-13-5>
#duo[
*Fast lane.* The bass is frozen. The guitar is a new line, not a doubling.

*Musical goal.* The bass is frozen. The guitar is a new line, not a doubling.

*Starting material.* A protected bass. BHL s45.

*Engine selection.* BHL locked bass. Cross-read BHL s45.

*Exact procedure.*

#strong[1.] Confirm the bass lock.\
#strong[2.] Write a guitar line that avoids the bass’s rhythm.\
#strong[3.] Share at most one pitch class per bar on purpose.\
#strong[4.] If you share every pitch, you have written organum. Decide if you want that.\

*Musical result.* A bass that is safe and a guitar that is not a copy.

*Variations.* Allow a unison on the last note only.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Protection is what makes the risk above it legible.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Sing the guitar while a friend plays the bass.]
#v(2mm)
#link(<s-14-1>)[Related 14.1]
]

#pagebreak()
#heading(level: 2)[14 · String quartet and chamber music]
#text(size: 12pt)[What does a quartet add that a duo cannot?]

String Quartet means four strings plus a piano harmony staff when export passes. Otherwise you may get planning JSON. ECM Chamber is a separate preset. Orchestrating a quartet into a larger group is manual. Philip Glass and Nino Rota appear in the composer library. Confirm either name on the quartet form before you claim that voice.

#pagebreak()
#kicker[Intermediate · Scenario 14.1]
#heading(level: 3)[14.1 String quartet with chord symbols] <s-14-1>
#duo[
*Fast lane.* A quartet sketch whose harmony you can read.

*Musical goal.* A quartet sketch whose harmony you can read.

*Starting material.* Preset String Quartet.

*Engine selection.* String Quartet preset.

*Exact procedure.*

#strong[1.] Choose #ui[String Quartet] and generate.\
#strong[2.] Open the MusicXML. Count the parts.\
#strong[3.] Read the chord symbols against the cello.\
#strong[4.] If the file is JSON, stop and read the status. Do not dress a plan up as a score.\

*Musical result.* Four sounding lines plus a harmony spelling, or a clear failure.

*Variations.* Replace one symbol and regenerate only if you kept the first file.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Symbols are a claim. The cello tests the claim.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Point at one bar where symbol and bass disagree, or write none.]
#v(2mm)
#link(<s-14-2>)[Related 14.2]
]

#pagebreak()
#kicker[Advanced · Scenario 14.2]
#heading(level: 3)[14.2 A Glass-like quartet voice] <s-14-2>
#duo[
*Fast lane.* Ask for a Philip Glass harmonic voice only if that row is on the quartet form.

*Musical goal.* Ask for a Philip Glass harmonic voice only if that row is on the quartet form.

*Starting material.* String Quartet preset and the composer list.

*Engine selection.* String Quartet. Glass selection is Verify.

*Exact procedure.*

#strong[1.] Find Philip Glass in the library or the harmonic-voice control.\
#strong[2.] If it is only a library row and not offered for this preset, do not generate under that name.\
#strong[3.] If it is offered, generate a short file and listen for repetition, not for a biography.\
#strong[4.] The app does not sync to picture.\

*Musical result.* A short repetitive sketch, or a refused label.

*Variations.* Compare with a plain quartet from 14.1.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A name in a list is not a style guarantee until you hear the file.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][Write what repeated, in one sentence.]
#v(2mm)
#link(<s-14-3>)[Related 14.3]
]

#pagebreak()
#kicker[Advanced · Scenario 14.3]
#heading(level: 3)[14.3 A Rota-like quartet voice] <s-14-3>
#duo[
*Fast lane.* The same test for Nino Rota.

*Musical goal.* The same test for Nino Rota.

*Starting material.* String Quartet preset.

*Engine selection.* String Quartet. Rota selection is Verify.

*Exact procedure.*

#strong[1.] Find Nino Rota the same way as Glass.\
#strong[2.] Generate only if the control is real.\
#strong[3.] Do not describe the result as a film cue.\
#strong[4.] There is no hit-point clock.\

*Musical result.* A melodic sketch with a name you have verified, or no file.

*Variations.* Put the same chords through 14.1 and compare.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Style labels need a control and a sound.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][If the name is missing, write missing and move on.]
#v(2mm)
#link(<s-14-4>)[Related 14.4]
]

#pagebreak()
#kicker[Advanced · Scenario 14.4]
#heading(level: 3)[14.4 One hexatonic cell, four voices] <s-14-4>
#duo[
*Fast lane.* Four notes from Augmented t0 become a quartet texture.

*Musical goal.* Four notes from Augmented t0 become a quartet texture.

*Starting material.* Cell C E-flat E G inside C, E-flat, E, G, A-flat, B. Companion file assets/notation/hexatonic-cell-quartet.musicxml.

*Engine selection.* Hexatonic for the field. The four-voice spelling in the companion file is a manual example.

*Exact procedure.*

#strong[1.] In #ui[Hexatonic], export a short phrase on #ui[Augmented t0] if you want a rhythmic reference.\
#strong[2.] Violin I states C5, E-flat5, E5, G5.\
#strong[3.] Violin II waits one crotchet, then plays the cell up a major third: E5, G5, G-sharp5, B5. Manual.\
#strong[4.] Viola mirrors G4, E4, E-flat4, C4. Cello holds C3, then A-flat2, then E2. Manual. Every pitch stays in the six.\

*Musical result.* Independence without a new harmony.

*Variations.* Start the viola a beat later than the table.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A set that maps onto itself makes imitation safe.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Tick the pitch classes in the MusicXML against the six.]
#v(2mm)
#link(<s-14-5>)[Related 14.5]
]

#figure(
  image("../assets/notation/hexatonic-cell-quartet.svg", width: 100%, alt: "Four staves. Violin I plays C, E-flat, E, G. Violin II enters one crotchet later with E, G, G-sharp, B. Viola plays G, E, E-flat, C. Cello holds C, then A-flat, then E."),
  caption: [Scenario 14.4, exported from the MusicXML with MuseScore Studio 4.7.5. Not heard in this edition.],
)
#figure(
  table(
    columns: (1.1fr, 1.6fr, 1.4fr),
    inset: 4pt,
    [*Voice*], [*Pitches*], [*How*],
    [Violin I], [C5, E-flat5, E5, G5], [Cell],
    [Violin II], [E5, G5, G-sharp5, B5], [Manual. Up a major third, one crotchet later],
    [Viola], [G4, E4, E-flat4, C4], [Manual mirror],
    [Cello], [C3, then A-flat2, then E2], [Manual roots],
  ),
  caption: [Same cell as a table. Every pitch is in C, E-flat, E, G, A-flat or G-sharp, B. Source: assets/notation/hexatonic-cell-quartet.musicxml.],
)

#pagebreak()
#kicker[Intermediate · Scenario 14.5]
#heading(level: 3)[14.5 ECM Chamber modal piece] <s-14-5>
#duo[
*Fast lane.* A chamber texture that is not a string quartet.

*Musical goal.* A chamber texture that is not a string quartet.

*Starting material.* Preset ECM Chamber.

*Engine selection.* ECM Chamber preset.

*Exact procedure.*

#strong[1.] Choose #ui[ECM Chamber].\
#strong[2.] Generate and read which instruments actually arrived.\
#strong[3.] Keep the harmony modal and slow. Do not add a shout chorus.\
#strong[4.] If you wanted strings only, you are on the wrong preset.\

*Musical result.* Space, long notes, and a mode.

*Variations.* Import one line from your duo by hand if you want a familiar voice inside it.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][ECM here is a preset, not a record label.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Name the mode you think you hear, then check the notes.]
#v(2mm)
#link(<s-14-6>)[Related 14.6]
]

#pagebreak()
#kicker[Advanced · Scenario 14.6]
#heading(level: 3)[14.6 Quartet from a duo] <s-14-6>
#duo[
*Fast lane.* Add two voices to a duo you already trust.

*Musical goal.* Add two voices to a duo you already trust.

*Starting material.* A finished duo MusicXML.

*Engine selection.* Manual expansion of a duo file.

*Exact procedure.*

#strong[1.] Keep guitar and bass as the outer idea.\
#strong[2.] Write two inner parts by hand. Viola range and a second violin, or whatever your notation program will hold.\
#strong[3.] Do not double every guitar note.\
#strong[4.] There is no duo-to-quartet button.\

*Musical result.* The duo, heard from inside a larger room.

*Variations.* Let one inner part rest for eight bars.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][More players should add space, not notes.]
#v(2mm)
#badge("manual")
#v(2mm)
#callout[Exercise][Mute the new parts. The duo should still be the piece.]
#v(2mm)
#link(<s-15-1>)[Related 15.1]
]

#pagebreak()
#heading(level: 2)[15 · Big-band writing]
#text(size: 12pt)[What can the band presets actually return?]

Big Band is a seven-part ensemble MusicXML when realisation and export pass. SQ to BB translates a four-voice sketch into a section plan. A shout chorus, a sax soli copied from a riff, and a full chart with drums are not promised by those sentences. Count the staves.

#pagebreak()
#kicker[Advanced · Scenario 15.1]
#heading(level: 3)[15.1 Big Band preset and an arranger name] <s-15-1>
#duo[
*Fast lane.* Generate the seven-part file, then see whether an arranger voice changed it.

*Musical goal.* Generate the seven-part file, then see whether an arranger voice changed it.

*Starting material.* Preset Big Band.

*Engine selection.* Big Band preset. Arranger effect is Verify.

*Exact procedure.*

#strong[1.] Choose #ui[Big Band] and generate.\
#strong[2.] Count parts. The registry says seven when export passes.\
#strong[3.] If you select an arranger and the file does not change, mark that voice Verify.\
#strong[4.] Planning JSON is not a chart. Read the status.\

*Musical result.* A short ensemble file, or a clear export failure.

*Variations.* Generate once with no arranger and keep that control file.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][An arranger name is a hypothesis until the notes move.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][List the part names in the MusicXML.]
#v(2mm)
#link(<s-15-2>)[Related 15.2]
]

#pagebreak()
#kicker[Advanced · Scenario 15.2]
#heading(level: 3)[15.2 SQ to BB translation] <s-15-2>
#duo[
*Fast lane.* Four lines become a section plan. Do not skip the four lines.

*Musical goal.* Four lines become a section plan. Do not skip the four lines.

*Starting material.* Preset SQ → BB.

*Engine selection.* SQ → BB.

*Exact procedure.*

#strong[1.] Generate.\
#strong[2.] Read the SATB sketch.\
#strong[3.] Then read the section plan.\
#strong[4.] Export only what the status calls a score.\

*Musical result.* A translation you can trace.

*Variations.* Reject the plan if you cannot find the motif in it.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The band is a later orchestration of lines you already wrote.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Circle the motif in both stages.]
#v(2mm)
#link(<s-15-3>)[Related 15.3]
]

#pagebreak()
#kicker[Advanced · Scenario 15.3]
#heading(level: 3)[15.3 Slonimsky cells for the ensemble] <s-15-3>
#duo[
*Fast lane.* A chromatic cell as source material, scored only where you can hear it.

*Musical goal.* A chromatic cell as source material, scored only where you can hear it.

*Starting material.* Slonimsky Etude export.

*Engine selection.* Slonimsky Etude. Scoring is manual.

*Exact procedure.*

#strong[1.] Generate a short étude.\
#strong[2.] Choose one cell of a bar or less.\
#strong[3.] Assign it to one section by hand. Do not paste it into every staff.\
#strong[4.] The Big Band preset will not do this assignment for you.\

*Musical result.* One cell, one section, silence elsewhere.

*Variations.* Give the cell to the bass instead.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A band can whisper a pattern.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Play the cell on piano before you copy it.]
#v(2mm)
#link(<s-15-4>)[Related 15.4]
]

#pagebreak()
#kicker[Advanced · Scenario 15.4]
#heading(level: 3)[15.4 Riff into a sax soli] <s-15-4>
#duo[
*Fast lane.* The four-bar riff becomes a unison or a simple soli, written by you.

*Musical goal.* The four-bar riff becomes a unison or a simple soli, written by you.

*Starting material.* Riff Generator file.

*Engine selection.* Riff Generator. The soli copy is manual.

*Exact procedure.*

#strong[1.] Keep the riff.\
#strong[2.] Write it in unison for the sax staves you actually have.\
#strong[3.] If your Big Band file has no sax staves, do not pretend it does.\
#strong[4.] Harmonise the soli only after the unison works.\

*Musical result.* A riff the section can play together.

*Variations.* Leave the brass silent.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Unison is a legitimate soli.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Sing the riff, then play the soli.]
#v(2mm)
#link(<s-15-5>)[Related 15.5]
]

#pagebreak()
#kicker[Advanced · Scenario 15.5]
#heading(level: 3)[15.5 Shout chorus from dyads] <s-15-5>
#duo[
*Fast lane.* Open the duo’s dyads into a louder voicing. The band file is only a reference.

*Musical goal.* Open the duo’s dyads into a louder voicing. The band file is only a reference.

*Starting material.* BHL s48 dyads, if you have them.

*Engine selection.* Manual voicing. Big Band file is a reference only. Cross-read BHL s48.

*Exact procedure.*

#strong[1.] Take the dyads.\
#strong[2.] Add a third and a seventh by hand.\
#strong[3.] Do not call it a shout chorus unless the dynamics and the brass are in the file.\
#strong[4.] There is no shout-chorus button.\

*Musical result.* A louder version of an intimate idea, still traceable.

*Variations.* Keep the dyads and only add octave doubles.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Volume is not a new motif.]
#v(2mm)
#badge("manual")
#v(2mm)
#callout[Exercise][Mark which notes are new.]
#v(2mm)
#link(<s-15-6>)[Related 15.6]
]

#pagebreak()
#kicker[Intermediate · Scenario 15.6]
#heading(level: 3)[15.6 Section shaping for a chart arc] <s-15-6>
#duo[
*Fast lane.* A plan for which section plays, even if the route’s behaviour is unconfirmed.

*Musical goal.* A plan for which section plays, even if the route’s behaviour is unconfirmed.

*Starting material.* A Big Band or SQ to BB file, and the Structure or Arranger route.

*Engine selection.* Structure and Arranger are Verify.

*Exact procedure.*

#strong[1.] Open #ui[Structure] or #ui[Arranger].\
#strong[2.] Write down the controls you actually see.\
#strong[3.] If they do not shape the chart, shape it in the notation program: tutti, soli, brass, rest.\
#strong[4.] Do not invent a control to match this paragraph.\

*Musical result.* An arc you can point at, or a list of missing controls.

*Variations.* Cut the middle section in half.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Arrangement is subtraction as often as addition.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][Label the loudest bar. There should be one.]
#v(2mm)
#link(<s-16-1>)[Related 16.1]
]

#pagebreak()
#heading(level: 2)[16 · Orchestral thinking and film scoring]
#text(size: 12pt)[What can you sketch here, and what must you score by hand?]

There is no orchestral engine and no picture clock in the route list. Film-composer names in the library are not a scoring stage. Use the quartet and the duo as sketches. Take the MusicXML to a notation program for real orchestration. Hit points are a pencil and a timer.

#pagebreak()
#kicker[Intermediate · Scenario 16.1]
#heading(level: 3)[16.1 A cinematic arc in sections] <s-16-1>
#duo[
*Fast lane.* Three sections: still, strain, release. No picture required.

*Musical goal.* Three sections: still, strain, release. No picture required.

*Starting material.* Song Mode or three duo exports.

*Engine selection.* Song Mode or duo. Timing is manual.

*Exact procedure.*

#strong[1.] Write eight bars of still harmony.\
#strong[2.] Write eight bars that remove a common tone. See 7.6.\
#strong[3.] Write eight bars that return.\
#strong[4.] Dynamics are manual.\

*Musical result.* A ninety-second shape if the tempo is slow. Check the clock yourself.

*Variations.* Reverse the order.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Arc is form. Film is a later use.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Time the export. Write the duration on the file.]
#v(2mm)
#link(<s-16-2>)[Related 16.2]
]

#pagebreak()
#kicker[Advanced · Scenario 16.2]
#heading(level: 3)[16.2 A film-profile quartet sketch] <s-16-2>
#duo[
*Fast lane.* A quartet sketch you might later treat as a cue. It is not synced.

*Musical goal.* A quartet sketch you might later treat as a cue. It is not synced.

*Starting material.* 14.2 or 14.3, only if the voice was really selectable.

*Engine selection.* String Quartet. Sync is manual and not in the app.

*Exact procedure.*

#strong[1.] Generate the quartet sketch.\
#strong[2.] Do not claim picture sync.\
#strong[3.] Write a cue title in your notebook, not as a fake app field.\
#strong[4.] Orchestration beyond the quartet is chapter 16.3.\

*Musical result.* A sketch with an honest boundary.

*Variations.* Add a pedal in the cello.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A sketch is allowed to be small.]
#v(2mm)
#badge("verify") #badge("manual")
#v(2mm)
#callout[Exercise][State, in writing, that no picture was attached.]
#v(2mm)
#link(<s-16-3>)[Related 16.3]
]

#pagebreak()
#kicker[Advanced · Scenario 16.3]
#heading(level: 3)[16.3 Orchestrating a quartet sketch] <s-16-3>
#duo[
*Fast lane.* Move a quartet into a larger score by hand.

*Musical goal.* Move a quartet into a larger score by hand.

*Starting material.* A quartet MusicXML you trust.

*Engine selection.* Manual.

*Exact procedure.*

#strong[1.] Open it in your notation program.\
#strong[2.] Assign violin I to a woodwind only where the line can breathe. Manual.\
#strong[3.] Do not copy every double stop into the brass.\
#strong[4.] There is no orchestration preset.\

*Musical result.* A larger score that still shows the quartet if you mute the new parts.

*Variations.* Keep the cello as the only bass.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Orchestration is choice of who rests.]
#v(2mm)
#badge("manual")
#v(2mm)
#callout[Exercise][Mute the new staves and confirm the quartet remains.]
#v(2mm)
#link(<s-16-4>)[Related 16.4]
]

#pagebreak()
#kicker[Advanced · Scenario 16.4]
#heading(level: 3)[16.4 Tension from remote pentatonics] <s-16-4>
#duo[
*Fast lane.* Unease from an empty intersection, not from a dissonant cluster.

*Musical goal.* Unease from an empty intersection, not from a dissonant cluster.

*Starting material.* 7.6’s two colours, scored for quartet by hand.

*Engine selection.* Pentatonic sets. Quartet spelling is manual.

*Exact procedure.*

#strong[1.] Bars 1–2: home pentatonic in the violins.\
#strong[2.] Bars 3–4: the remote colour. No common pitch class.\
#strong[3.] Cello holds a note from the first set, then switches. Manual.\
#strong[4.] Do not add a diminished seventh to explain the unease.\

*Musical result.* Suspense without the usual cliché.

*Variations.* Share one tone and hear the fear drop.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Distance can be quiet.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Prove the empty intersection on paper.]
#v(2mm)
#link(<s-16-5>)[Related 16.5]
]

#pagebreak()
#kicker[Advanced · Scenario 16.5]
#heading(level: 3)[16.5 Hit points and timing] <s-16-5>
#duo[
*Fast lane.* Place a musical event on a clock time. The app will not see the picture.

*Musical goal.* Place a musical event on a clock time. The app will not see the picture.

*Starting material.* A timed list you write yourself, and a MusicXML file.

*Engine selection.* Manual.

*Exact procedure.*

#strong[1.] Write three times, for example 0:08, 0:21, 0:40.\
#strong[2.] Find those times from the tempo and the bar length. Show the arithmetic.\
#strong[3.] Put a chord or a rest at each spot in the notation program.\
#strong[4.] Do not look for a hit-point control in Composer OS.\

*Musical result.* A cue that meets a clock you calculated.

*Variations.* Miss one hit on purpose and write why.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Sync is arithmetic plus taste. This app does the notes, not the picture.]
#v(2mm)
#badge("manual")
#v(2mm)
#callout[Exercise][Show the arithmetic to someone else.]
#v(2mm)
#link(<s-17-1>)[Related 17.1]
]

#pagebreak()
#heading(level: 2)[17 · Mixed metre, displacement, and fragmentation]
#text(size: 12pt)[How do you bend time without losing the cell?]

BHL already has metres and rhythmic transforms in scenarios 3, 4, 36, 39, 41, and 61. The Studio can generate rhythmic studies in 5/4, 7/8, and their neighbours. Use those. Do not invent a new metre engine.

#pagebreak()
#kicker[Intermediate · Scenario 17.1]
#heading(level: 3)[17.1 A 7/8 canvas] <s-17-1>
#duo[
*Fast lane.* Seven quavers with a grouping you can say aloud.

*Musical goal.* Seven quavers with a grouping you can say aloud.

*Starting material.* BHL s03, or a Studio exercise in 7/8.

*Engine selection.* Studio rhythmic studies or BHL s03. Cross-read BHL s03.

*Exact procedure.*

#strong[1.] In the Studio, open More exercise controls and set metre #ui[7/8].\
#strong[2.] Family #ui[Rhythmic studies], then #ui[Generate].\
#strong[3.] Or follow BHL s03.\
#strong[4.] Speak a grouping, such as 2+2+3, and stick to it.\

*Musical result.* An odd bar that has a gait.

*Variations.* Switch the grouping to 3+2+2.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][7/8 without a grouping is only a time signature.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Speak the grouping while you play.]
#v(2mm)
#link(<s-17-2>)[Related 17.2]
]

#pagebreak()
#kicker[Intermediate · Scenario 17.2]
#heading(level: 3)[17.2 A 5/4 ballad frame] <s-17-2>
#duo[
*Fast lane.* A slow five that still phrases.

*Musical goal.* A slow five that still phrases.

*Starting material.* BHL s04 or Studio metre 5/4.

*Engine selection.* Studio or BHL s04. Cross-read BHL s04.

*Exact procedure.*

#strong[1.] Set metre #ui[5/4] and a slow tempo.\
#strong[2.] Write or generate a line that breathes on beat 5.\
#strong[3.] Do not fill beat 5 just because it is there.\
#strong[4.] Follow s04 if you are in BHL.\

*Musical result.* Five as a ballad, not as a trick.

*Variations.* Tie beat 5 into the next bar.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The extra beat can be a rest.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Conduct in 3+2.]
#v(2mm)
#link(<s-17-3>)[Related 17.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 17.3]
#heading(level: 3)[17.3 Fragment and keep the opening] <s-17-3>
#duo[
*Fast lane.* Cut the cell and still know how it began.

*Musical goal.* Cut the cell and still know how it began.

*Starting material.* BHL s39.

*Engine selection.* BHL s39. Cross-read BHL s39.

*Exact procedure.*

#strong[1.] State the cell whole.\
#strong[2.] Repeat only its first two notes.\
#strong[3.] Do this twice, then stop.\
#strong[4.] The opening must remain audible.\

*Musical result.* A fragment that points backward.

*Variations.* Fragment the rhythm and keep every pitch.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Cuts work when the start is memorable.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Ask someone to sing the opening after hearing only the fragment.]
#v(2mm)
#link(<s-17-4>)[Related 17.4]
]

#pagebreak()
#kicker[Beginner · Scenario 17.4]
#heading(level: 3)[17.4 A rest inside the cell] <s-17-4>
#duo[
*Fast lane.* The motif includes a silence.

*Musical goal.* The motif includes a silence.

*Starting material.* BHL s41, or any four-note cell.

*Engine selection.* BHL s41 or a manual rest. Cross-read BHL s41.

*Exact procedure.*

#strong[1.] Replace the third note with a rest of the same duration.\
#strong[2.] Do not close the gap.\
#strong[3.] Loop it.\
#strong[4.] If the cell dies, the rest was in the wrong place. Move it, do not delete the idea.\

*Musical result.* A cell that breathes.

*Variations.* Put the rest first.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A rest inside is not the same as a rest between.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Clap the rest.]
#v(2mm)
#link(<s-17-5>)[Related 17.5]
]

#pagebreak()
#kicker[Advanced · Scenario 17.5]
#heading(level: 3)[17.5 A multi-bar rhythm inside the phrase] <s-17-5>
#duo[
*Fast lane.* A rhythm longer than one bar, borrowed whole.

*Musical goal.* A rhythm longer than one bar, borrowed whole.

*Starting material.* BHL s61.

*Engine selection.* BHL s61. Cross-read BHL s61.

*Exact procedure.*

#strong[1.] Take a two-bar rhythm you can clap.\
#strong[2.] Lay pitches from today’s collection on top.\
#strong[3.] Do not trim the rhythm to the barline.\
#strong[4.] The phrase may be three bars. Let it.\

*Musical result.* A phrase that is not a bar-long loop.

*Variations.* Start the rhythm on beat 2.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Phrase length and bar length are allowed to disagree.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Clap two bars before you choose pitches.]
#v(2mm)
#link(<s-17-6>)[Related 17.6]
]

#pagebreak()
#kicker[Beginner · Scenario 17.6]
#heading(level: 3)[17.6 Rhythmic studies as a metre trainer] <s-17-6>
#duo[
*Fast lane.* Use the exercise generator to feel a metre before you compose in it.

*Musical goal.* Use the exercise generator to feel a metre before you compose in it.

*Starting material.* Studio, family Rhythmic studies.

*Engine selection.* Practice and Scales Studio.

*Exact procedure.*

#strong[1.] Choose #ui[Rhythmic studies] and #ui[Beginner].\
#strong[2.] Set 7/8 or 5/4 in More exercise controls.\
#strong[3.] Press #ui[Generate]. Write down the seed.\
#strong[4.] Play it before you write a piece in that metre.\

*Musical result.* A body that knows the metre.

*Variations.* Generate another only after the first one is clean.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Practice is part of composition when the metre is new.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Keep the seed in the notebook.]
#v(2mm)
#link(<s-18-1>)[Related 18.1]
]

#pagebreak()
#heading(level: 2)[18 · Electronic textures, experiment, and avant-garde improvisation]
#text(size: 12pt)[What leaves with the MusicXML, and what starts only in the DAW?]

Composer OS does not design electronic sound. It can give you a score, a loop, a constraint, or a set of candidates. Stretching, granulating, and free improvisation happen after export, or with no export at all. Say so in the piece note.

#pagebreak()
#kicker[Intermediate · Scenario 18.1]
#heading(level: 3)[18.1 MusicXML into a DAW] <s-18-1>
#duo[
*Fast lane.* Treat a score as raw material for an electronic texture.

*Musical goal.* Treat a score as raw material for an electronic texture.

*Starting material.* Any exported MusicXML, imported into your DAW.

*Engine selection.* Manual, after export.

*Exact procedure.*

#strong[1.] Export MusicXML.\
#strong[2.] Import it in the DAW. The app does not host that import.\
#strong[3.] Stretch or process one part. Manual.\
#strong[4.] Keep the MusicXML unchanged so you can return.\

*Musical result.* Acoustic DNA inside an electronic bed, if your DAW did the work.

*Variations.* Process only the bass.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The score is a sample source, not a mixer preset.]
#v(2mm)
#badge("manual")
#v(2mm)
#callout[Exercise][Write down the process in one line so you can repeat it.]
#v(2mm)
#link(<s-18-2>)[Related 18.2]
]

#pagebreak()
#kicker[Beginner · Scenario 18.2]
#heading(level: 3)[18.2 Loops from the Riff Generator] <s-18-2>
#duo[
*Fast lane.* A one-to-four-bar riff becomes a DAW loop.

*Musical goal.* A one-to-four-bar riff becomes a DAW loop.

*Starting material.* Riff Generator file.

*Engine selection.* Riff Generator. Audio loop is manual.

*Exact procedure.*

#strong[1.] Generate a riff that survives eight repeats.\
#strong[2.] Export MusicXML.\
#strong[3.] Loop it in the DAW or in the notation program.\
#strong[4.] The app’s riff is not an audio loop.\

*Musical result.* A loop whose score you still have.

*Variations.* Mute every other repeat.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Repetition is a decision.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Stop at the repeat where you get bored. Note the number.]
#v(2mm)
#link(<s-18-3>)[Related 18.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 18.3]
#heading(level: 3)[18.3 Constraint cards from unnamed sets] <s-18-3>
#duo[
*Fast lane.* An unnamed mask becomes a rule for improvisation.

*Musical goal.* An unnamed mask becomes a rule for improvisation.

*Starting material.* Advanced Set Theory in the Studio.

*Engine selection.* Studio for the set. Improvisation is manual.

*Exact procedure.*

#strong[1.] Pick a mask. Press #ui[Play Scale].\
#strong[2.] Write the pitch classes on a card.\
#strong[3.] Improvise for three minutes using only those notes. Manual.\
#strong[4.] Do not rename the set with a style.\

*Musical result.* Focused freedom.

*Variations.* Allow one outside note, once.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A constraint is kinder than a blank page.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Record the improvisation only if you want to. The card is the piece of paper that matters.]
#v(2mm)
#link(<s-18-4>)[Related 18.4]
]

#pagebreak()
#kicker[Advanced · Scenario 18.4]
#heading(level: 3)[18.4 Free improvisation on the world map] <s-18-4>
#duo[
*Fast lane.* Improvise from the six BHL worlds without generating.

*Musical goal.* Improvise from the six BHL worlds without generating.

*Starting material.* The world table.

*Engine selection.* Manual. The map is the V1.0 table.

*Exact procedure.*

#strong[1.] Pick a world.\
#strong[2.] Improvise inside its contrast rule for two minutes.\
#strong[3.] Change world only when you can say the new contrast.\
#strong[4.] No file is required.\

*Musical result.* A playing knowledge of A–F.

*Variations.* Spend the two minutes in world F only.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Improvisation can be the research.]
#v(2mm)
#badge("manual")
#v(2mm)
#callout[Exercise][Say the world letter before you play.]
#v(2mm)
#link(<s-18-5>)[Related 18.5]
]

#pagebreak()
#kicker[Advanced · Scenario 18.5]
#heading(level: 3)[18.5 A Slonimsky chromatic cloud] <s-18-5>
#duo[
*Fast lane.* A chromatic pattern used as texture, not as a tune.

*Musical goal.* A chromatic pattern used as texture, not as a tune.

*Starting material.* Slonimsky Etude.

*Engine selection.* Slonimsky Etude. Overlay is manual.

*Exact procedure.*

#strong[1.] Generate a short étude.\
#strong[2.] Overlay two transpositions by hand, both still readable.\
#strong[3.] Thin it until some air remains.\
#strong[4.] Do not call the cloud a chord.\

*Musical result.* Density with a source pattern.

*Variations.* Delete every other note.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A cloud should still have a parent.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Find three notes of the original pattern inside the cloud.]
#v(2mm)
#link(<s-18-6>)[Related 18.6]
]

#pagebreak()
#kicker[Advanced · Scenario 18.6]
#heading(level: 3)[18.6 A process piece from repeated candidates] <s-18-6>
#duo[
*Fast lane.* Three BHL candidates, played in a fixed order, many times.

*Musical goal.* Three BHL candidates, played in a fixed order, many times.

*Starting material.* Three candidates from one parent. No automatic winner.

*Engine selection.* BHL candidates. The process performance is manual.

*Exact procedure.*

#strong[1.] Export the three. Keep the parent.\
#strong[2.] Play them in order, five times, without improving them.\
#strong[3.] That repetition is the process piece. Manual performance.\
#strong[4.] Stop if you start editing during the pass.\

*Musical result.* A process, not a best-of.

*Variations.* Play them backwards.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Choosing less can be the concept.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Write the order down so the process is repeatable.]
#v(2mm)
#link(<s-19-1>)[Related 19.1]
]

#pagebreak()
#heading(level: 2)[19 · From fragment to form]
#text(size: 12pt)[How does a cell become a piece that knows when to stop?]

BHL scenarios 40, 42, 67, and 68 already study return, contrast, and longer spans. This chapter uses them and adds a rondo you assemble yourself. Do not inflate a four-bar idea into a fake symphony.

#pagebreak()
#kicker[Beginner · Scenario 19.1]
#heading(level: 3)[19.1 State once, then stop] <s-19-1>
#duo[
*Fast lane.* The piece is the statement. No development.

*Musical goal.* The piece is the statement. No development.

*Starting material.* BHL s42, or an eight-bar duo.

*Engine selection.* BHL s42 or any short export you refuse to extend. Cross-read BHL s42.

*Exact procedure.*

#strong[1.] State the cell.\
#strong[2.] Add nothing.\
#strong[3.] Put the double bar.\
#strong[4.] If you are bored, the cell was not ready. Do not add bars to hide that.\

*Musical result.* An ending that is an ending.

*Variations.* Repeat the cell once, identical, and decide whether that helped.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Stopping is a skill.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Do not press generate again today on this idea.]
#v(2mm)
#link(<s-19-2>)[Related 19.2]
]

#pagebreak()
#kicker[Intermediate · Scenario 19.2]
#heading(level: 3)[19.2 Continue so the cell returns] <s-19-2>
#duo[
*Fast lane.* Leave, and come back.

*Musical goal.* Leave, and come back.

*Starting material.* BHL s40.

*Engine selection.* BHL s40. Cross-read BHL s40.

*Exact procedure.*

#strong[1.] State the cell.\
#strong[2.] Write a contrasting bar that does not quote it.\
#strong[3.] Return to the cell, changed by one note at most.\
#strong[4.] The return should be hearable without a label.\

*Musical result.* A small ABA.

*Variations.* Return in a new octave.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Return is the smallest form.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Ask a listener when the opening came back.]
#v(2mm)
#link(<s-19-3>)[Related 19.3]
]

#pagebreak()
#kicker[Intermediate · Scenario 19.3]
#heading(level: 3)[19.3 Two sections, one contrast] <s-19-3>
#duo[
*Fast lane.* Only one thing changes between A and B.

*Musical goal.* Only one thing changes between A and B.

*Starting material.* BHL s67.

*Engine selection.* BHL s67. Cross-read BHL s67.

*Exact procedure.*

#strong[1.] Pick the contrast: metre, or register, or collection. One.\
#strong[2.] Keep everything else.\
#strong[3.] If two things change, you will not know which one you heard.\
#strong[4.] Write the contrast in the title of your note.\

*Musical result.* A clear before and after.

*Variations.* Change a second parameter only in a later piece.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][One contrast is enough for two sections.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Name the contrast in four words.]
#v(2mm)
#link(<s-19-4>)[Related 19.4]
]

#pagebreak()
#kicker[Advanced · Scenario 19.4]
#heading(level: 3)[19.4 A rondo from three candidates] <s-19-4>
#duo[
*Fast lane.* A B A C A, assembled from candidates you already have.

*Musical goal.* A B A C A, assembled from candidates you already have.

*Starting material.* Three BHL candidates and the parent. BHL s42 and s40 sit underneath.

*Engine selection.* BHL candidates. Assembly is manual.

*Exact procedure.*

#strong[1.] Call the parent A.\
#strong[2.] Pick two candidates as B and C.\
#strong[3.] Assemble A B A C A by hand. Do not generate a rondo preset. There is not one.\
#strong[4.] Keep each letter at least four bars.\

*Musical result.* A five-part form from one family.

*Variations.* Cut C to two bars.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Rondo is return with guests.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Label the letters in the score. The labels are yours, not an app field.]
#v(2mm)
#link(<s-19-5>)[Related 19.5]
]

#pagebreak()
#kicker[Advanced · Scenario 19.5]
#heading(level: 3)[19.5 A longer developmental span] <s-19-5>
#duo[
*Fast lane.* A span long enough that the cell has to work for its return.

*Musical goal.* A span long enough that the cell has to work for its return.

*Starting material.* BHL s68.

*Engine selection.* BHL s68. Cross-read BHL s68.

*Exact procedure.*

#strong[1.] Follow s68 for the long span.\
#strong[2.] Do not add new motifs.\
#strong[3.] The opening cell should be the thing that returns.\
#strong[4.] If you are lost, shorten the span. Length is not a virtue.\

*Musical result.* Development that still knows its parent.

*Variations.* Insert one rest-bar in the middle.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Long form is the same cell under more pressure.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][At the end, sing the opening.]
#v(2mm)
#link(<r-01>)[Related R-01]
]

#pagebreak()
= Part III · Cross-engine recipes
Thirty recipes. Each one says which engines it touches and which steps are manual or still need a check on your machine. A recipe is a path, not a new feature.

== Recipes R-01 to R-30


#pagebreak()
#kicker[Intermediate · Scenario R-01]
#heading(level: 3)[R-01 A sparse duo that breathes] <r-01>
#duo[
*Fast lane.* Silence is part of the duo. Two major triads a tone apart share no notes.

*Musical goal.* Silence is part of the duo. Two major triads a tone apart share no notes.

*Starting material.* Guitar–Bass Duo (Single-Line), 16 bars if you can set that length.

*Engine selection.* Single-line duo, BHL world A, Studio if the handoff exists.

*Exact procedure.*

#strong[1.] Generate #ui[Guitar–Bass Duo (Single-Line)].\
#strong[2.] Import to BHL, lock the bass, world A. See BHL s05 and s52.\
#strong[3.] Prefer sparse dyads and an empty last beat. BHL s47 and s48.\
#strong[4.] Practise the guitar hexatonic in the Studio only if #ui[Develop in BHL Composer] or a manual pitch list gets you there. That handoff is Verify.\

*Musical result.* A lyrical conversation without a cadence cliché.

*Variations.* Swap to world F for a darker pair.

*Further development.* Recipe R-12.
][
#callout[Why it is interesting][No shared tone makes every triad change audible.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Leave the last beat empty in your own playing for eight bars.]
#v(2mm)
#link(<r-02>)[Related R-02]
]

#pagebreak()
#kicker[Advanced · Scenario R-02]
#heading(level: 3)[R-02 A lyrical duet through BHL transforms] <r-02>
#duo[
*Fast lane.* One hook grows over 32 bars and still sounds like itself.

*Musical goal.* One hook grows over 32 bars and still sounds like itself.

*Starting material.* A Song Mode hook exported as MusicXML.

*Engine selection.* Song Mode and BHL s37, s39, s43.

*Exact procedure.*

#strong[1.] Lock the bass in BHL.\
#strong[2.] Augment, fragment, and invert using s37, s39, and s43. Do not do all three in one bar.\
#strong[3.] Assemble the 32 bars by hand if BHL will not span them.\
#strong[4.] The hook must return.\

*Musical result.* A return you can sing.

*Variations.* Use only augmentation.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Transformation is how a hook earns a long form.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Sing the return without the paper.]
#v(2mm)
#link(<r-03>)[Related R-03]
]

#pagebreak()
#kicker[Advanced · Scenario R-03]
#heading(level: 3)[R-03 Chord melody with unrelated triads] <r-03>
#duo[
*Fast lane.* Triads that share one note, then none, under a guitar line.

*Musical goal.* Triads that share one note, then none, under a guitar line.

*Starting material.* A world F guitar line.

*Engine selection.* BHL world F. Voicing is manual.

*Exact procedure.*

#strong[1.] Export the line.\
#strong[2.] Harmonise C with E-flat, shared G, by hand.\
#strong[3.] Then a triad that shares nothing. See 10.2.\
#strong[4.] Practise the dyads in the Studio if you can enter the pitch classes.\

*Musical result.* Surprise without chromatic filler.

*Variations.* Keep every triad in close position.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The line is the continuity the triads abandon.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Write shared or none under each bar.]
#v(2mm)
#link(<r-04>)[Related R-04]
]

#pagebreak()
#kicker[Advanced · Scenario R-04]
#heading(level: 3)[R-04 Quartet from one hexatonic cell] <r-04>
#duo[
*Fast lane.* The 14.4 texture, checked against mask 2457.

*Musical goal.* The 14.4 texture, checked against mask 2457.

*Starting material.* Augmented t0 and the companion MusicXML.

*Engine selection.* Hexatonic Augmented t0. Quartet voicing is manual.

*Exact procedure.*

#strong[1.] Export a hexatonic reference phrase if you want rhythms from the app.\
#strong[2.] Copy the four voices from scenario 14.4.\
#strong[3.] Optional String Quartet generate on chords C, A-flat, and E is only a harmonic reference, and only if those symbols are accepted. Verify.\
#strong[4.] Reject any pitch outside C, E-flat, E, G, A-flat, B.\

*Musical result.* Four independent lines, one set.

*Variations.* Canon at the major third. See R-27.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The set is invariant under that transposition, so the canon does not need new notes.]
#v(2mm)
#badge("ok") #badge("manual") #badge("verify")
#v(2mm)
#callout[Exercise][Run the pitch checklist before you print.]
#v(2mm)
#link(<r-05>)[Related R-05]
]

#pagebreak()
#kicker[Advanced · Scenario R-05]
#heading(level: 3)[R-05 Big band from a fragmented riff] <r-05>
#duo[
*Fast lane.* A chart whose soli is a broken four-bar riff.

*Musical goal.* A chart whose soli is a broken four-bar riff.

*Starting material.* Riff Generator file.

*Engine selection.* Riff Generator, BHL s39, Big Band as reference. Soli is manual.

*Exact procedure.*

#strong[1.] Fragment the riff using BHL s39 if you import it there.\
#strong[2.] Generate Big Band only as a reference ensemble.\
#strong[3.] Put the fragment in unison on the staves that actually exist.\
#strong[4.] If the big-band file has no sax part, do not write sax soli.\

*Musical result.* A riff-driven texture you can trace.

*Variations.* Give the fragment to the bass.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Fragmentation can be orchestration.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Circle the fragment in the band score.]
#v(2mm)
#link(<r-06>)[Related R-06]
]

#pagebreak()
#kicker[Intermediate · Scenario R-06]
#heading(level: 3)[R-06 A song in In Sen] <r-06>
#duo[
*Fast lane.* A familiar form in an unfamiliar five-note colour.

*Musical goal.* A familiar form in an unfamiliar five-note colour.

*Starting material.* In Sen: at C, C, D-flat, F, G, B-flat. No third.

*Engine selection.* Pentatonic In Sen, Song Mode, manual hook.

*Exact procedure.*

#strong[1.] On #ui[Pentatonic], use the In Sen card and #ui[Generate path].\
#strong[2.] Write the hook by hand from that spelling.\
#strong[3.] Use Song Mode for the section plan if the form helps.\
#strong[4.] The splice is manual.\

*Musical result.* A song that is memorable and slightly homeless.

*Variations.* Add a third only in the last bar.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][No third keeps the song suspended.]
#v(2mm)
#badge("ok") #badge("manual") #badge("verify")
#v(2mm)
#callout[Exercise][Improvise the hook for two minutes before you write the verse.]
#v(2mm)
#link(<r-07>)[Related R-07]
]

#pagebreak()
#kicker[Advanced · Scenario R-07]
#heading(level: 3)[R-07 One theme, three harmonic lights] <r-07>
#duo[
*Fast lane.* The same theme in worlds A, then C, then F.

*Musical goal.* The same theme in worlds A, then C, then F.

*Starting material.* A short guitar theme.

*Engine selection.* BHL worlds A, C, F. Orchestration beyond the sketch is manual.

*Exact procedure.*

#strong[1.] Run the theme through BHL worlds A, C, and F with the bass locked.\
#strong[2.] Keep three files.\
#strong[3.] A quartet or SQ to BB file can be a reference, not an orchestration.\
#strong[4.] Any larger scoring is manual. No picture sync.\

*Musical result.* Narrative change without a key-change slogan.

*Variations.* Use only A and F.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The theme is the constant. The world is the light.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Play the three versions in a row.]
#v(2mm)
#link(<r-08>)[Related R-08]
]

#pagebreak()
#kicker[Advanced · Scenario R-08]
#heading(level: 3)[R-08 A ladder of stranger modes] <r-08>
#duo[
*Fast lane.* Each movement one step further from the major scale.

*Musical goal.* Each movement one step further from the major scale.

*Starting material.* Studio Essentials, then a named scale, then an unnamed mask, then Slonimsky.

*Engine selection.* Studio and Slonimsky Etude. Suite form is manual.

*Exact procedure.*

#strong[1.] Movement 1: Major, #ui[Play Scale], short tune.\
#strong[2.] Movement 2: Lydian.\
#strong[3.] Movement 3: a More Named Scales row you can pronounce.\
#strong[4.] Movement 4: an Advanced Set Theory mask, then a Slonimsky étude as a contrasting movement. The suite assembly is yours.\

*Musical result.* A suite with a direction.

*Variations.* Stop at Lydian if the later sets are not playable yet.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Strangeness should be paced.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Order the movements from memory.]
#v(2mm)
#link(<r-09>)[Related R-09]
]

#pagebreak()
#kicker[Advanced · Scenario R-09]
#heading(level: 3)[R-09 Slonimsky tamed by a BHL world] <r-09>
#duo[
*Fast lane.* A chromatic pattern filtered by a pitch field.

*Musical goal.* A chromatic pattern filtered by a pitch field.

*Starting material.* Slonimsky Etude MusicXML.

*Engine selection.* Slonimsky Etude and BHL import. Import of this file type is Verify.

*Exact procedure.*

#strong[1.] Generate the étude.\
#strong[2.] Import to BHL only if import accepts the file. Verify.\
#strong[3.] World D, Major plus diminished, if you get that far. BHL s05 is the import story.\
#strong[4.] Notes outside the world should be named and omitted, not quietly kept.\

*Musical result.* A ghost of the pattern.

*Variations.* If import fails, filter the notes by hand against world D’s description.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A field can discipline a pattern.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][Count the omitted notes.]
#v(2mm)
#link(<r-10>)[Related R-10]
]

#pagebreak()
#kicker[Advanced · Scenario R-10]
#heading(level: 3)[R-10 Wyble reharmonised] <r-10>
#duo[
*Fast lane.* A two-voice étude pulled into another harmonic world.

*Musical goal.* A two-voice étude pulled into another harmonic world.

*Starting material.* Wyble Etude MusicXML.

*Engine selection.* Wyble Etude. BHL import is Verify.

*Exact procedure.*

#strong[1.] Generate Wyble.\
#strong[2.] Try a BHL import. Verify whether the file is accepted.\
#strong[3.] If it is, world C, major plus augmented.\
#strong[4.] If it is not, reharmonise by hand and say so.\

*Musical result.* Counterpoint with a new colour, or a documented refusal.

*Variations.* Change only the lower voice’s harmony.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Do not break the counterpoint just to use a world.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][Check that two voices are still two voices.]
#v(2mm)
#link(<r-11>)[Related R-11]
]

#pagebreak()
#kicker[Intermediate · Scenario R-11]
#heading(level: 3)[R-11 Martino line over a song form] <r-11>
#duo[
*Fast lane.* A long line cut into sections.

*Musical goal.* A long line cut into sections.

*Starting material.* Martino Linear export and a Song Mode section plan.

*Engine selection.* Martino Linear and Song Mode. The join is manual.

*Exact procedure.*

#strong[1.] Generate Martino Linear.\
#strong[2.] Generate or sketch Song Mode sections.\
#strong[3.] Place slices of the line into the sections by hand.\
#strong[4.] Do not let the line ignore the section downbeats.\

*Musical result.* A solo with rooms.

*Variations.* Leave one section almost empty.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Line and form are different jobs until you join them.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Mark the section letters on the line.]
#v(2mm)
#link(<r-12>)[Related R-12]
]

#pagebreak()
#kicker[Intermediate · Scenario R-12]
#heading(level: 3)[R-12 Duo into a chamber trio] <r-12>
#duo[
*Fast lane.* Add a third voice without doubling the duo.

*Musical goal.* Add a third voice without doubling the duo.

*Starting material.* The R-01 result, and an ECM Chamber file on the same chords if you can enter them.

*Engine selection.* ECM Chamber reference. Merge is manual.

*Exact procedure.*

#strong[1.] Keep the duo.\
#strong[2.] Generate #ui[ECM Chamber] as a reference, not as a merge button.\
#strong[3.] Copy one new line into the duo by hand.\
#strong[4.] There is no merge command.\

*Musical result.* More space, not more notes.

*Variations.* Add the third voice in only half the bars.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Chamber music is often a duo that allowed a guest.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Mute the guest. The duo must remain.]
#v(2mm)
#link(<r-13>)[Related R-13]
]

#pagebreak()
#kicker[Advanced · Scenario R-13]
#heading(level: 3)[R-13 Pentatonic lines toward a band plan] <r-13>
#duo[
*Fast lane.* A pentatonic melody, then a four-voice sketch, then a section plan.

*Musical goal.* A pentatonic melody, then a four-voice sketch, then a section plan.

*Starting material.* A pentatonic tune you wrote.

*Engine selection.* Pentatonic plus SQ → BB. The fit is Verify.

*Exact procedure.*

#strong[1.] Write the tune from a Pentatonic card.\
#strong[2.] Use #ui[SQ → BB] as the four-voice and section-plan machine.\
#strong[3.] Do not expect the pentatonic page to create SATB.\
#strong[4.] Check the motif survived the translation. Verify by ear.\

*Musical result.* A modal band sketch with a known parent tune.

*Variations.* Keep the tune in unison and skip the harmony.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The tune is the test of the translation.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Find the first four notes in the section plan.]
#v(2mm)
#link(<r-14>)[Related R-14]
]

#pagebreak()
#kicker[Beginner · Scenario R-14]
#heading(level: 3)[R-14 Practise the riff, then transform it] <r-14>
#duo[
*Fast lane.* Learn the riff in the hands before you develop it.

*Musical goal.* Learn the riff in the hands before you develop it.

*Starting material.* A Riff Generator file and its scale.

*Engine selection.* Riff Generator and Studio. Exact scale handoff is Verify.

*Exact procedure.*

#strong[1.] Generate the riff.\
#strong[2.] In the Studio, set that scale and #ui[Rhythmic studies].\
#strong[3.] Play the study, then the riff.\
#strong[4.] Only then open BHL s33. The scale handoff into the study may be manual.\

*Musical result.* Development that comes from the hands.

*Variations.* Change nothing the day you learn it.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The body finds variants the screen will not.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Play the riff from memory.]
#v(2mm)
#link(<r-15>)[Related R-15]
]

#pagebreak()
#kicker[Advanced · Scenario R-15]
#heading(level: 3)[R-15 Hand the duo to Performance Composer] <r-15>
#duo[
*Fast lane.* A second guitar take on a locked bass.

*Musical goal.* A second guitar take on a locked bass.

*Starting material.* BHL MusicXML. See 12.5 and BHL s62.

*Engine selection.* Performance Composer. Verify.

*Exact procedure.*

#strong[1.] Export MusicXML.\
#strong[2.] Open #ui[Performance Composer].\
#strong[3.] If Respond is not there, stop.\
#strong[4.] Keep both takes.\

*Musical result.* Two personas, one bass.

*Variations.* Reject the take that moves the bass.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A second take is not a deletion.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][Write the difference in one sentence.]
#v(2mm)
#link(<r-16>)[Related R-16]
]

#pagebreak()
#kicker[Intermediate · Scenario R-16]
#heading(level: 3)[R-16 Choose with your ears] <r-16>
#duo[
*Fast lane.* Three candidates, a pair, and a written reason.

*Musical goal.* Three candidates, a pair, and a written reason.

*Starting material.* A BHL three-candidate set.

*Engine selection.* BHL candidates. Evaluation is Verify.

*Exact procedure.*

#strong[1.] Listen to all three.\
#strong[2.] Compare two. Evaluation if it will host them. Otherwise the notation program.\
#strong[3.] Write why you kept one.\
#strong[4.] No automatic winner.\

*Musical result.* A decision with a sentence attached.

*Variations.* Sleep on it and read the sentence again.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Memory is a bad archive. The sentence is the archive.]
#v(2mm)
#badge("verify") #badge("manual")
#v(2mm)
#callout[Exercise][Date the note.]
#v(2mm)
#link(<r-17>)[Related R-17]
]

#pagebreak()
#kicker[Intermediate · Scenario R-17]
#heading(level: 3)[R-17 Polychord colour on a simple tune] <r-17>
#duo[
*Fast lane.* Upper-structure colour, same melody.

*Musical goal.* Upper-structure colour, same melody.

*Starting material.* A simple duo tune.

*Engine selection.* Guitar/Bass Duo. Symbol support is Verify.

*Exact procedure.*

#strong[1.] Keep a copy of the original.\
#strong[2.] Apply a polychord spelling if the duo accepts it. See 10.3.\
#strong[3.] If it does not, write the upper triad by hand.\
#strong[4.] The melody stays.\

*Musical result.* A richer surface, same tune.

*Variations.* Use one polychord, not eight.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][One colour is enough to teach the ear.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Sing the melody over both versions.]
#v(2mm)
#link(<r-18>)[Related R-18]
]

#pagebreak()
#kicker[Advanced · Scenario R-18]
#heading(level: 3)[R-18 Coltrane changes in five] <r-18>
#duo[
*Fast lane.* Major-third cycles inside 5/4.

*Musical goal.* Major-third cycles inside 5/4.

*Starting material.* A duo and the Guide’s Coltrane path, plus 5/4 if you can set it.

*Engine selection.* Duo plus manual or documented controls. Verify.

*Exact procedure.*

#strong[1.] Set 5/4 in the notation program if Generate will not.\
#strong[2.] Apply the three centres.\
#strong[3.] Keep the melody.\
#strong[4.] If either control is missing, write the chart by hand and say which control was missing.\

*Musical result.* Friction between cycle and metre.

*Variations.* Stay in 4/4 and keep the cycle.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Two kinds of unevenness at once need a simple tune.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Name the three centres.]
#v(2mm)
#link(<r-19>)[Related R-19]
]

#pagebreak()
#kicker[Intermediate · Scenario R-19]
#heading(level: 3)[R-19 A song that interrupts itself] <r-19>
#duo[
*Fast lane.* One planned break, then the hook.

*Musical goal.* One planned break, then the hook.

*Starting material.* Song Mode and the Zappa disruption note in the Guide. See 6.6.

*Engine selection.* Song Mode and the documented disruption path.

*Exact procedure.*

#strong[1.] Write the hook.\
#strong[2.] Plan one interrupting bar.\
#strong[3.] Return at once.\
#strong[4.] Do not interrupt twice.\

*Musical result.* Humour from design.

*Variations.* Make the interruption a rest.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A joke needs a setup.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Ask which bar surprised someone.]
#v(2mm)
#link(<r-20>)[Related R-20]
]

#pagebreak()
#kicker[Intermediate · Scenario R-20]
#heading(level: 3)[R-20 A bridge filtered through world C] <r-20>
#duo[
*Fast lane.* A pentatonic bridge recoloured by world C.

*Musical goal.* A pentatonic bridge recoloured by world C.

*Starting material.* BHL s30, then a Song Mode verse and chorus.

*Engine selection.* BHL s30 and Song Mode. Splice is manual.

*Exact procedure.*

#strong[1.] Follow s30 for the filtered colour.\
#strong[2.] Splice that bridge into the song by hand.\
#strong[3.] The verse stays in the home colour.\
#strong[4.] There is no automatic splice.\

*Musical result.* A bridge that is related and differently lit.

*Variations.* Use world F for the bridge instead.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Filter, do not replace, if you want kinship.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Name one shared tone between verse and bridge.]
#v(2mm)
#link(<r-21>)[Related R-21]
]

#pagebreak()
#kicker[Advanced · Scenario R-21]
#heading(level: 3)[R-21 Nothing shared, a tension cue] <r-21>
#duo[
*Fast lane.* Remote collections, quiet unease.

*Musical goal.* Remote collections, quiet unease.

*Starting material.* BHL s31 and s28, then a quartet spelling by hand. See 16.4.

*Engine selection.* BHL s31. Quartet is manual.

*Exact procedure.*

#strong[1.] Build the empty intersection.\
#strong[2.] Score it for quartet by hand.\
#strong[3.] No diminished-seventh shortcut.\
#strong[4.] No picture sync.\

*Musical result.* Suspense from distance.

*Variations.* Add one shared tone and keep both versions.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Emptiness can be the dissonance.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Show the intersection on paper.]
#v(2mm)
#link(<r-22>)[Related R-22]
]

#pagebreak()
#kicker[Intermediate · Scenario R-22]
#heading(level: 3)[R-22 Triad-pair chord-melody drill] <r-22>
#duo[
*Fast lane.* Turn a hexatonic pair into personal voicings.

*Musical goal.* Turn a hexatonic pair into personal voicings.

*Starting material.* A WPS pair and Studio triad and dyad studies.

*Engine selection.* Hexatonic pair and Studio or manual grips.

*Exact procedure.*

#strong[1.] Read the pair on #ui[Hexatonic].\
#strong[2.] Generate #ui[Triad and dyad studies] on a scale that matches, or practise the triads by hand if it does not.\
#strong[3.] Write eight bars of chord melody using only those dyads and triads.\
#strong[4.] The piece is manual.\

*Musical result.* Vocabulary you can use next week.

*Variations.* Forbid triads. Dyads only.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][A language is a small set you can remember.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Play the eight bars from memory.]
#v(2mm)
#link(<r-23>)[Related R-23]
]

#pagebreak()
#kicker[Intermediate · Scenario R-23]
#heading(level: 3)[R-23 An odd-metre groove] <r-23>
#duo[
*Fast lane.* 7/8 with a rhythm borrowed from somewhere else.

*Musical goal.* 7/8 with a rhythm borrowed from somewhere else.

*Starting material.* BHL s03 and s61.

*Engine selection.* BHL s03 and s61.

*Exact procedure.*

#strong[1.] Make the 7/8 canvas.\
#strong[2.] Borrow a two-bar rhythm as in s61.\
#strong[3.] The limp should be intentional.\
#strong[4.] Loop it before you add pitches.\

*Musical result.* A groove that does not apologise for the extra quaver.

*Variations.* Change the grouping.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Groove is a rhythm you trust.]
#v(2mm)
#badge("ok")
#v(2mm)
#callout[Exercise][Dance it, even sitting down.]
#v(2mm)
#link(<r-24>)[Related R-24]
]

#pagebreak()
#kicker[Intermediate · Scenario R-24]
#heading(level: 3)[R-24 Electronic bed from a quartet] <r-24>
#duo[
*Fast lane.* A quartet file becomes source audio in a DAW.

*Musical goal.* A quartet file becomes source audio in a DAW.

*Starting material.* String Quartet MusicXML.

*Engine selection.* String Quartet export. DAW is manual.

*Exact procedure.*

#strong[1.] Export.\
#strong[2.] Import in the DAW. Manual.\
#strong[3.] Stretch one part.\
#strong[4.] Do not claim Composer OS made the electronic sound.\

*Musical result.* A bed with a score ancestor.

*Variations.* Use only the cello.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The score is the DNA. The DAW is the chemistry.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Keep both files.]
#v(2mm)
#link(<r-25>)[Related R-25]
]

#pagebreak()
#kicker[Beginner · Scenario R-25]
#heading(level: 3)[R-25 Constraint cards for a duo improvisation] <r-25>
#duo[
*Fast lane.* Two players, one unnamed set, no other rules.

*Musical goal.* Two players, one unnamed set, no other rules.

*Starting material.* A Studio mask printed on a card.

*Engine selection.* Studio for the set. Playing is manual.

*Exact procedure.*

#strong[1.] Press #ui[Play Scale] on the mask.\
#strong[2.] Write the notes on two cards.\
#strong[3.] Improvise a duo using only those notes.\
#strong[4.] Stop at five minutes.\

*Musical result.* Focused freedom.

*Variations.* One player may play only long notes.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Shared constraints make improvisation social.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Afterward, name one moment you want to write down.]
#v(2mm)
#link(<r-26>)[Related R-26]
]

#pagebreak()
#kicker[Advanced · Scenario R-26]
#heading(level: 3)[R-26 Fragment to rondo] <r-26>
#duo[
*Fast lane.* A small cell becomes A B A C A.

*Musical goal.* A small cell becomes A B A C A.

*Starting material.* BHL s42, s40, and three candidates. See 19.4.

*Engine selection.* BHL candidates. Assembly is manual.

*Exact procedure.*

#strong[1.] Do not extend s42 until the statement is strong.\
#strong[2.] Build the rondo by hand.\
#strong[3.] Each return should be recognisable.\
#strong[4.] There is no rondo preset.\

*Musical result.* A long form from a small seed.

*Variations.* Omit C.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Return is the form.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Label the letters yourself.]
#v(2mm)
#link(<r-27>)[Related R-27]
]

#pagebreak()
#kicker[Advanced · Scenario R-27]
#heading(level: 3)[R-27 Canon at the major third] <r-27>
#duo[
*Fast lane.* A canon that stays inside Augmented t0 because the set maps onto itself.

*Musical goal.* A canon that stays inside Augmented t0 because the set maps onto itself.

*Starting material.* The cell from 14.4.

*Engine selection.* Hexatonic field. Canon is manual.

*Exact procedure.*

#strong[1.] Write the leader.\
#strong[2.] Follower enters a bar later, transposed up a major third.\
#strong[3.] Check pitch classes.\
#strong[4.] The canon is manual. Hexatonic only proves the set.\

*Musical result.* Imitation without clashes outside the set.

*Variations.* Try the canon at the octave and hear it leave the demonstration.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][The maths is in service of a canon you can hear.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Tick every follower note.]
#v(2mm)
#link(<r-28>)[Related R-28]
]

#pagebreak()
#kicker[Advanced · Scenario R-28]
#heading(level: 3)[R-28 A climax from the opening dyads] <r-28>
#duo[
*Fast lane.* The loud part is the quiet part, widened.

*Musical goal.* The loud part is the quiet part, widened.

*Starting material.* BHL s48 dyads.

*Engine selection.* BHL s48. Widening is manual.

*Exact procedure.*

#strong[1.] Keep the dyads.\
#strong[2.] Add voices by hand for the climax.\
#strong[3.] A Big Band file may be a reference for range, not an automatic orchestration.\
#strong[4.] The climax must quote the dyads.\

*Musical result.* A peak that remembers the opening.

*Variations.* Reach the peak with octave doubles only.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Climax is expansion, not a new theme.]
#v(2mm)
#badge("ok") #badge("manual")
#v(2mm)
#callout[Exercise][Point at the original dyad inside the climax.]
#v(2mm)
#link(<r-29>)[Related R-29]
]

#pagebreak()
#kicker[Advanced · Scenario R-29]
#heading(level: 3)[R-29 An old form, a strange surface] <r-29>
#duo[
*Fast lane.* 32 bars, unrelated triads, a written comparison.

*Musical goal.* 32 bars, unrelated triads, a written comparison.

*Starting material.* Your chord sketch, not a copyrighted chart.

*Engine selection.* BHL world F. Evaluation is Verify.

*Exact procedure.*

#strong[1.] Keep the 32-bar counts.\
#strong[2.] Develop the bridge in world F.\
#strong[3.] Compare in Evaluation if the page allows, otherwise by ear.\
#strong[4.] Verify the comparison control.\

*Musical result.* A familiar jacket, strange buttons.

*Variations.* Reharm only eight bars.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Form can host a radical surface.]
#v(2mm)
#badge("ok") #badge("verify")
#v(2mm)
#callout[Exercise][Count the bars.]
#v(2mm)
#link(<r-30>)[Related R-30]
]

#pagebreak()
#kicker[Intermediate · Scenario R-30]
#heading(level: 3)[R-30 The same theme, two lights] <r-30>
#duo[
*Fast lane.* One theme, two quartet voices, if those voices exist on the form.

*Musical goal.* One theme, two quartet voices, if those voices exist on the form.

*Starting material.* Scenario 14.2 and 14.3.

*Engine selection.* String Quartet voices. Verify.

*Exact procedure.*

#strong[1.] Generate a quartet with a Glass voice only if selectable.\
#strong[2.] Generate again with a Rota voice only if selectable.\
#strong[3.] If either name is missing, stop that half.\
#strong[4.] Compare the files yourself. Pairing them in Evaluation is Verify.\

*Musical result.* Two sketches, one theme, no film.

*Variations.* Use the plain quartet as a third file.

*Further development.* Read the related scenario in another chapter before you add a second engine.
][
#callout[Why it is interesting][Style is a hypothesis you test by generating twice.]
#v(2mm)
#badge("verify")
#v(2mm)
#callout[Exercise][Write which file you would play first.]
#v(2mm)

]

#pagebreak()
= Part IV · Reference
== Limits carried forward
- BHL has no audio of its own and no tablature.
- BHL files are not imported into the Riff Engine.
- There is no artist-named BHL approach.
- Performance Composer receives MusicXML only.
- Comparing a pair does not produce an automatic winner.
- Worlds A–F are fixed. Liquid harmony is world B. There is no Liquid Harmony button.
- The Studio has no drone. Develop in BHL Composer is conditional.
- Open File and Open in Finder are desktop actions. This edition did not install the desktop app.
- Orchestra, film-sync, and electronic sound design are manual.
- Arranger, Structure, Ensemble, and Grid are routes marked Verify.
- A planning JSON file is not a score.
- Sibelius was not launched. One MuseScore Studio 4.7.5 plate is in scenario 14.4. The other figures are diagrams.

#pagebreak()
== Glossary
#heading(level: 3, outlined: false)[Bar] <g-bar>
A bar is a measure. This book says bar.

#heading(level: 3, outlined: false)[Crotchet] <g-crotchet>
A crotchet is a quarter note.

#heading(level: 3, outlined: false)[Dorian] <g-dorian>
A minor scale with a raised sixth. A Dorian is 1 2 b3 4 5 6 b7. The Studio opens on it. Mask 1709. See #link(<s-4-2>)[4.2] and the Quick Start.

#heading(level: 3, outlined: false)[Hexatonic] <g-hexatonic>
A six-note field. In this app, a scalar collection or a WPS triad pair. See #link(<s-8-1>)[8.1] and #link(<s-8-2>)[8.2].

#heading(level: 3, outlined: false)[Mask] <g-mask>
The integer the Studio shows for a pitch-class set, and the number used in the external scale link. A Dorian is 1709. Augmented t0 on C is 2457.

#heading(level: 3, outlined: false)[MusicXML] <g-musicxml>
The score file you keep. Open it in your notation program. See #link(<s-4-5>)[4.5] and #link(<s-14-4>)[14.4].

#heading(level: 3, outlined: false)[Pentatonic colour] <g-pentatonic>
One of the twenty registered five-note cards. A colour, not a claim that every note in a piece belongs to it. See #link(<s-7-1>)[7.1].

#heading(level: 3, outlined: false)[Quaver] <g-quaver>
An eighth note.

#heading(level: 3, outlined: false)[Triad pair] <g-triad-pair>
Two triads treated as one six-note field, or as world A’s two major triads a tone apart. See #link(<s-8-1>)[8.1] and #link(<s-9-1>)[9.1].

#heading(level: 3, outlined: false)[World B] <g-world-b>
BHL’s harmonic quadratonics. Three chord tones plus a primary tension. This is liquid harmony inside BHL. See #link(<s-9-2>)[9.2].

#heading(level: 3, outlined: false)[WPS] <g-wps>
Whole-tone-pair triad pairs on the Hexatonic page. Family menu label: WPS triad pair.

#pagebreak()
== Index
#link(<s-4-1>)[4.1 motif contours] ·
#link(<s-5-1>)[5.1 riff] ·
#link(<s-6-1>)[6.1 Song Mode] ·
#link(<s-7-3>)[7.3 Kumoi] ·
#link(<s-8-2>)[8.2 augmented hexatonic] ·
#link(<s-9-2>)[9.2 world B] ·
#link(<s-10-2>)[10.2 tritone triad] ·
#link(<s-11-1>)[11.1 Wyble] ·
#link(<s-12-2>)[12.2 single-line duo] ·
#link(<s-13-2>)[13.2 SQ to BB] ·
#link(<s-14-4>)[14.4 quartet cell] ·
#link(<s-15-1>)[15.1 Big Band] ·
#link(<s-16-5>)[16.5 hit points] ·
#link(<s-17-1>)[17.1 7/8] ·
#link(<s-18-1>)[18.1 DAW] ·
#link(<s-19-4>)[19.4 rondo] ·
#link(<r-01>)[R-01 sparse duo] ·
#link(<r-04>)[R-04 quartet cell] ·
#link(<r-27>)[R-27 canon] ·
#link(<g-dorian>)[Dorian] ·
#link(<g-mask>)[mask] ·
#link(<g-world-b>)[world B]

#pagebreak()
== Sources
Button names were taken from the running Practice and Pentatonic pages and from the source files named in `docs/manuals/v3.2/capabilities.yaml`. Preset names come from `composerOsPresetUi.ts`. BHL world wording comes from the V1.0 Creative Scenarios Handbook. Tonal scale-type data is MIT licensed: https://github.com/tonaljs/tonal

The external number link shown for A Dorian on the Studio page is https://ianring.com/musictheory/scales/1709

Fonts: Source Serif 4, Source Sans 3, and JetBrains Mono, SIL Open Font Licence. Notices are in `docs/manuals/v3.2/fonts/`.

This edition does not copy the BHL manuals. It does not modify WWH scores.
