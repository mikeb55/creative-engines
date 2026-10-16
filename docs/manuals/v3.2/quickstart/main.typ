#import "../shared/template.typ": *

#show: configure.with(
  [Quick Start · Discover, hear, see, practise, develop, export],
  [Composer OS V3.2.0 · Musician’s Quick Start · commit 1072b365 · 16 October 2026],
  qs-accent,
)

#align(horizon + left)[
  #kicker[Composer OS V3.2]
  #v(2mm)
  #text(font: "Source Sans 3", size: 28pt, weight: 700)[Musician’s Quick Start Guide]
  #v(4mm)
  #text(size: 12pt)[Worked examples for the finished V3.2 application. You will discover a scale, hear it, see it on the guitar, practise it, develop a short piece, and export MusicXML.]
  #v(6mm)
  #link(<contents>)[Go to Contents]
]

#pagebreak()
= How to use this book
This book follows one path: *Discover, hear, see, practise, develop, export.* Each worked example has a fast lane for players who already know the screen, then numbered steps that use the button names on the running app.

#duo[
  A blue *Verified* badge means the control was seen in the source or on the open application during this edition. An amber *Verify* badge means the route exists and the exact result still needs your ears on your machine. A purple *Manual* badge means you do the musical work outside Composer OS, usually in your notation program or a DAW.

  Scale names such as Dorian come from the Tonal glossary (MIT). Numbers such as 1709 are the scale mask used by the Ian Ring link in *About this scale*. This book does not rename scales from that site.

  BHL worlds A–F are not rewritten here. When a step is a BHL scenario, the text says *BHL s05* and points at *BHL Composer Quick Start* and *Creative Scenarios Handbook*, version 1.0.
][
  #callout[Edition][UI bundle seen while writing: v2.10.10, stamp 2026-10-16T14:07:23Z, git 862c142, on top of baseline commit 1072b365. Practice files in the working tree may be newer than that commit.]
  #callout[Notation][Sibelius was not launched. The quartet cell is a MuseScore Studio 4.7.5 plate in the handbook, scenario 14.4. This guide uses diagrams and screenshots.]
]

#pagebreak()
#contents-page(2)

#pagebreak()
= 1 · Your first five minutes
By the end of this chapter you will have a Guitar/Bass Duo file and you will know where to open it. You do not need a style theory yet.

#pagebreak()
== QS-01 First duo in two minutes
#kicker[Worked example · Beginner]
#duo[
  *Fast lane.* Open #ui[Generate], choose the preset #ui[Guitar/Bass Duo], give the piece a title, and generate. Save the MusicXML.

  #strong[1.] Start Composer OS and stay on #ui[Generate]. The top row of routes is the map for the whole app.

  #strong[2.] In the preset list, choose #ui[Guitar/Bass Duo]. The registry describes it as clean electric guitar plus acoustic upright bass, with chord symbols.

  #strong[3.] Type a short title. Leave custom chords empty for this first pass so you can hear the preset’s own harmony.

  #strong[4.] Generate. If the button is disabled, the page is still waiting for a required field. Read the status line before changing composers.

  #strong[5.] Save the MusicXML beside your other scores. Do not overwrite an older file.
][
  #callout[Listen for][Two parts. The bass should have a line of its own, not only roots on beat one.]
  #callout[Why it works][A duo is the smallest texture in which harmony, register, and silence are all audible.]
  #v(2mm)
  #badge("ok") #badge("verify")
  #v(2mm)
  #text(size: 8.5pt)[Preset name is verified in the registry. A fresh generate was not clicked during this print run, so treat the first sounding result as something you confirm by ear.]
]

#pagebreak()
== QS-02 Open the MusicXML
#kicker[Worked example · Beginner]
#duo[
  *Fast lane.* Open the file you just saved in your notation program. Do not use a one-click host button as the only copy.

  #strong[1.] Keep the MusicXML. That file is the piece.

  #strong[2.] Open it in the notation program you already trust. Check the guitar staff and the bass staff, the bar count, and the chord symbols.

  #strong[3.] Press play there if you want sound. Composer OS can audition some pages, and that playback is a preview, not a finished recording.

  #strong[4.] If a part is missing, go back to Generate and read the status. Big Band and String Quartet can fall back to a planning file when export does not pass. A duo should be MusicXML.
][
  #callout[Limit][This edition did not engrave the duo in Sibelius or MuseScore. Your notation program is the place to see the staves.]
  #badge("manual")
]

#pagebreak()
= 2 · Finding your way
The routes across the top are the job list. Pick the page for the job, then come back to Generate when you want a score.

#pagebreak()
== QS-03 Find the right page
#kicker[Worked example · Beginner]
#figure(
  image("../assets/screenshots/generate-nav.png", width: 100%, alt: "Composer OS navigation with Generate selected. Routes include Arranger, Structure, Ensemble, Grid, Presets, Outputs, RiffGen, Composer Engines, Pentatonic, Hexatonic, BHL, Practice and Scales Studio, Evaluation, Slonimsky Etudes, Performance Composer, Help, and Credits."),
  caption: [Screenshot. Generate route on the running app. The Composers tab is open. The inner Generate tab is a different control.],
)

#duo[
  #strong[1.] #ui[Practice & Scales Studio] when you want to hear a scale, see the fretboard, and make an exercise.

  #strong[2.] #ui[Pentatonic] for the twenty registered colours, a path, and a handoff into practice.

  #strong[3.] #ui[Hexatonic] for six-note collections and whole-tone-pair triads. The phrase button reads #ui[Generate INSIDE / OUTSIDE / RETURN].

  #strong[4.] #ui[BHL] when a locked bass and one harmonic world should rewrite the guitar. Read the V1.0 handbook before you invent a workflow.

  #strong[5.] #ui[Arranger], #ui[Structure], #ui[Ensemble], and #ui[Grid] are real routes. Their exact musical effect is marked Verify until you try the control on your file.
][
  #callout[Which page][Scale: Studio. Colour path: Pentatonic. Six-note cell: Hexatonic. Locked-bass development: BHL. Full score: Generate.]
  #badge("ok") #badge("verify")
]

#pagebreak()
= 3 · Hear a scale, see it, play it
The Studio opens on A Dorian. One root drives the fretboard, Play Scale, the exercise, and the export. There is no drone.

#pagebreak()
== QS-04 A Dorian
#kicker[Worked example · Beginner · mask 1709]
#duo[
  *Fast lane.* Stay on A Dorian, press #ui[Play Scale], then play the fifth-position shape while you count intervals.

  Dorian is a minor scale with a raised sixth. In A, that note is F-sharp. The same seven pitch classes as G major, with A as home.

  #strong[1.] Open #ui[Practice & Scales Studio]. Root A, catalogue Essentials, row Dorian. Formula 1 2 b3 4 5 6 b7.

  #strong[2.] Press #ui[Play Scale]. The player sends one octave up and back. The status line does not offer a drone.

  #strong[3.] On the fretboard, a filled circle is the root and a square is another scale tone. Switch dot labels to intervals if you want numbers on the app itself.

  #strong[4.] The diagram marks the sixth as a diamond so the bright note is obvious on paper. In the app that same F-sharp is a square labelled F\# or 6.
][
  #callout[Listen for][Sing A, C, E, then F-sharp. Minor triad, then the bright sixth.]
  #callout[Try this][Press #ui[Generate] with family #ui[Scale pathways] and difficulty #ui[Beginner]. Keep seed 1 if you want the same exercise again.]
  #badge("ok")
  #link(<qs-08>)[Next: QS-08]
]

#figure(
  image("../assets/diagrams/a-dorian-fretboard.svg", width: 100%, alt: "A Dorian on the guitar from fret 5 to fret 10. Filled circles are the root A. Diamonds are the sixth, F-sharp. Squares are the other scale tones. Interval numbers sit inside the marks."),
  caption: [A Dorian, frets 5 to 10. Circle: root. Diamond: sixth, the note that makes Dorian bright. Square: other scale tones.],
)

#pagebreak()
== QS-05 Minor pentatonic box and beyond
#kicker[Worked example · Beginner]
#duo[
  *Fast lane.* In the Studio list, choose Minor Pentatonic, root A, press #ui[Play Scale], then generate a #ui[Pentatonic studies] exercise.

  #strong[1.] Essentials includes Minor Pentatonic, formula 1 b3 4 5 b7. At A the notes are A, C, D, E, G.

  #strong[2.] Hear it once. Then set the position filter to lowest fret V and look only at that window. Dots are pitch locations, not a solved fingering.

  #strong[3.] Family #ui[Pentatonic studies], difficulty Beginner, then #ui[Generate].

  #strong[4.] The same colour also lives on #ui[Pentatonic] as a registered collection. #ui[Practice this collection] can send it back to the Studio.
][
  #callout[Why it works][The box is a map. The scale is a sound. Leave the box once the sound is familiar.]
  #badge("ok")
]

#pagebreak()
== QS-06 A named scale from the Tonal list
#kicker[Worked example · Beginner]
#duo[
  *Fast lane.* Set the catalogue to #ui[More Named Scales], search Hirajoshi, set the root, and press #ui[Play Scale].

  #strong[1.] More Named Scales holds glossary names beyond the Essentials row.

  #strong[2.] Search Hirajoshi. At root A the GUI check on 16 October 2026 showed notes A, B, C, E, F.

  #strong[3.] Open #ui[About this scale] only when you want the mask, the Forte number, or the external number link. The panel starts closed on purpose.

  #strong[4.] Names are credited to Tonal. The link is a number, not a second name for the scale.
][
  #callout[Listen for][A smaller set than Dorian. Fewer notes, more silence between them.]
  #badge("ok")
]

#pagebreak()
== QS-07 An unnamed scale by its formula
#kicker[Worked example · Intermediate]
#duo[
  *Fast lane.* Switch the catalogue to #ui[Advanced Set Theory], search a pitch-class list, and read the formula before you play.

  #strong[1.] All Scales and Advanced Set Theory list sets that may have no traditional name.

  #strong[2.] Search by pitch classes or by the mask. The heading still shows an interval formula when one can be spelled from the root.

  #strong[3.] Press #ui[Play Scale]. If the row is only a mathematical set, treat it as a constraint, not as a style.

  #strong[4.] Generate a short pathway. If validation reports an error, do not export that exercise as a finished study.
][
  #callout[Manual step][Naming the set for your own notebook is your job. The app will not invent a pretty title.]
  #badge("ok") #badge("manual")
]

#pagebreak()
== QS-08 Export and save a practice session <qs-08>
#kicker[Worked example · Beginner]
#duo[
  *Fast lane.* #ui[Generate], then #ui[Export MusicXML], then #ui[Save session].

  #strong[1.] Generate an exercise first. Export without a score asks you to generate or import one.

  #strong[2.] #ui[Export MusicXML] downloads a file in the browser. On the desktop build it can write a path. This edition did not rebuild or install the desktop app.

  #strong[3.] #ui[Save session] stores JSON with the scale, root, tempo, and the MusicXML inside it. #ui[Reopen session] restores that file and does not regenerate the exercise.

  #strong[4.] #ui[Open File] and #ui[Open in Finder] run in the desktop app after a file has been written. In the browser they report that limit.

  #strong[5.] Loop, Repeat, and Metronome belong to the player. The metronome is not written into the score.
][
  #callout[Limit][#ui[Develop in BHL Composer] appears only when the sounding set matches a BHL colour. It is not on the default A Dorian screen.]
  #badge("ok") #badge("verify")
]

#figure(
  image("../assets/screenshots/practice-studio.png", width: 88%, alt: "Practice and Scales Studio showing A Dorian selected, formula 1 2 flat 3 4 5 6 flat 7, root A, and the Play Scale button."),
  caption: [Practice and Scales Studio, Scale panel, on the running app. A Dorian is the default.],
)

#pagebreak()
= 4 · Generate: one idea, many forms
The same harmonic thought can become a duo, a single-line conversation, a song plan, a riff, or a quartet sketch. The preset names below are the ones in the app registry.

#pagebreak()
== QS-09 Duo with your own chords
#kicker[Worked example · Intermediate]
#duo[
  *Fast lane.* Preset #ui[Guitar/Bass Duo], type a short chord line into custom chords, generate, and read the symbols against the bass notes.

  #strong[1.] Use symbols you can already hear, for example Cmaj7, Am7, Dm7, G7, one bar each.

  #strong[2.] Generate and open the MusicXML.

  #strong[3.] Check that the printed symbol and the bass note can live in the same bar. If they fight, change the symbol or the bass, and keep a copy of the first file.
][
  #callout[Verify][The exact custom-chord field label can read Custom chords. Confirm it on your Generate tab before you rely on a saved recipe.]
  #badge("ok") #badge("verify")
]

#pagebreak()
== QS-10 Single-line conversation
#kicker[Worked example · Intermediate]
#duo[
  *Fast lane.* Choose #ui[Guitar–Bass Duo (Single-Line)] and generate a short chart.

  The registry calls this the same duo harmony path with one note at a time in each hand of the conversation. Use it when block chords would hide the reply.

  #strong[1.] Generate 16 bars if the form control allows a length. If you cannot see a bar-count field, accept the preset length and note it.

  #strong[2.] In your notation program, look for bars where one part rests. Those rests are the breath.

  #strong[3.] If both parts speak on every beat, thin one line by hand.
][
  #callout[Listen for][An answer that starts after the other part has finished a small shape.]
  #badge("ok") #badge("manual")
]

#pagebreak()
== QS-11 Song Mode hook
#kicker[Worked example · Intermediate]
#duo[
  *Fast lane.* Preset #ui[Song Mode]. Write one hook sentence in pitches or in chord rhythm, then let the song plan place sections.

  #strong[1.] Song Mode plans hooks, sections, and rules, then realises a guitar and bass score.

  #strong[2.] Keep the hook to four bars. A long tune hides the section plan.

  #strong[3.] Per-section metre, pin, and avoid are documented in the Musician Guide. If you cannot find the control on the open form, mark that step Verify and do not invent a slider.

  #strong[4.] Export MusicXML and sing the hook before you add a bridge.
][
  #callout[Why it works][Form is easier to hear when the hook is already a sound, not a paragraph.]
  #badge("ok") #badge("verify")
]

#pagebreak()
== QS-12 A four-bar riff
#kicker[Worked example · Beginner]
#duo[
  *Fast lane.* Preset #ui[Riff Generator], or the #ui[RiffGen] route, and keep the result inside four bars.

  #strong[1.] The registry describes loopable riffs of one to four bars on a strict grid.

  #strong[2.] Generate, then loop the MusicXML in your notation program. A riff that only works once is a phrase, not a riff.

  #strong[3.] Later, BHL scenario 33 can borrow the rhythm. Do not import the file into an engine the BHL limits forbid. BHL files do not go into the Riff Engine.
][
  #callout[Limit][Riff Generator output is not a promise of a full song.]
  #badge("ok")
]

#pagebreak()
== QS-13 String quartet sketch
#kicker[Worked example · Intermediate]
#duo[
  *Fast lane.* Preset #ui[String Quartet]. Generate. Open the MusicXML and count four string parts plus the harmony staff.

  #strong[1.] The registry says four strings plus a piano harmony staff when realisation and export pass. If they do not pass, you may receive planning JSON instead of a score. Read the status.

  #strong[2.] There is no orchestral page. A quartet sketch is not a film cue and not a symphony.

  #strong[3.] Harmonic voices such as Philip Glass or Nino Rota appear in the composer library. Confirm that the name is actually offered on the String Quartet form before you describe the result as that composer’s quartet.
][
  #callout[Verify][Which harmonic-voice rows are selectable on the quartet preset was not re-clicked for this print run.]
  #badge("ok") #badge("verify")
]

#pagebreak()
= 5 · Colour with Pentatonic and Hexatonic
Pentatonic colour is a five-note field with a job: home, suspension, brightness, or strain. Hexatonic colour is a six-note field, often two triads.

#pagebreak()
== QS-14 Kumoi colour
#kicker[Worked example · Intermediate]
#figure(
  image("../assets/screenshots/pentatonic.png", width: 100%, alt: "Pentatonic Engine showing Colour collections, spelling reference C, Major Pentatonic intervals 0 2 4 7 9, and the button Use for path transform and phrase generation."),
  caption: [Pentatonic Engine on the running app. Twenty colour cards begin with Major Pentatonic.],
)
#duo[
  *Fast lane.* On #ui[Pentatonic], press #ui[Use for path transform and phrase generation] on Kumoi, then #ui[Generate path].

  #strong[1.] Kumoi at C is C, D, E-flat, G, A. Intervals 0, 2, 3, 7, 9. Soft dark colour, with a major sixth.

  #strong[2.] Spelling reference sets how the card is spelled. It is not a key signature by itself.

  #strong[3.] Generate a path with a required return home if you want the first collection back at the end. Open ending if you do not.

  #strong[4.] #ui[Practice this collection] sends the set toward the Studio. Confirm the root when you arrive.
][
  #callout[Listen for][E-flat beside D, then the bright A. The semitone is local.]
  #badge("ok")
]

#pagebreak()
== QS-15 Triad-pair hexatonic
#kicker[Worked example · Intermediate]
#duo[
  *Fast lane.* On #ui[Hexatonic], set Family to #ui[WPS triad pair], pick one pair, and press #ui[Generate INSIDE / OUTSIDE / RETURN].

  #strong[1.] A whole-tone-pair (WPS) is two triads whose notes add up to six. Read the Selection line: name, pitches, triads.

  #strong[2.] Generated notes are a phrase preview. The page says they are not an artistic approval.

  #strong[3.] #ui[Export MusicXML] after a phrase exists. The button stays off until then.

  #strong[4.] The Core triad-pair laboratory can show common tones and voice-leading. #ui[Blind audition] hides the name so you can listen first.
][
  #callout[Why it works][Two triads give the ear a door in and a door out without a scale run.]
  #badge("ok")
]

#pagebreak()
== QS-16 Augmented collection
#kicker[Worked example · Advanced]
#duo[
  *Fast lane.* Family #ui[Scalar collection], choose #ui[Augmented t0], tonal centre C, then generate and export.

  The spelling in the source is C, E-flat, E, G, A-flat, B. The mask is 2457. Transposing the whole set by a major third lands on the same notes.

  #strong[1.] Select Augmented t0. Read Pitches before you generate.

  #strong[2.] Press #ui[Generate INSIDE / OUTSIDE / RETURN]. Export MusicXML.

  #strong[3.] The cell C, E-flat, E, G sits inside that set. A manual quartet built from it is Handbook scenario 14.4. The MusicXML is `assets/notation/hexatonic-cell-quartet.musicxml`.

  #strong[4.] #ui[Open in MuseScore 4] is a real Hexatonic button after export. This book still asks you to keep the MusicXML and open it yourself. The command-line engraving for this PDF did not succeed.
][
  #figure(
    image("../assets/diagrams/aug-hex-clock.svg", width: 100%, alt: "Pitch-class clock for the augmented hexatonic on C. Filled dots are C, E-flat, E, G, A-flat, and B. A line joins the cell C, E-flat, E, G."),
    caption: [Augmented hexatonic on C, mask 2457. Joined dots: cell C, E-flat, E, G.],
  )
  #badge("ok") #badge("manual")
]

#pagebreak()
= 6 · Develop with BHL
BHL keeps a bass and repaints the guitar inside one world. The six worlds are fixed. Liquid harmony is world B. There is no BHL audio of its own, and no tablature. Full recipes are BHL scenarios 1–68.

#pagebreak()
== QS-17 BHL import and lock
#kicker[Worked example · Intermediate · BHL s05]
#duo[
  *Fast lane.* Export a duo as MusicXML, open #ui[BHL], import, and lock the bass before you change the guitar.

  #strong[1.] Use a file you can stand to hear twice. BHL s05 is the import path in the V1.0 handbook.

  #strong[2.] Lock the bass. Later guitar edits should not move those bass pitches.

  #strong[3.] Do not send the BHL file back into the Riff Engine. That refusal is a published limit.

  #strong[4.] Performance Composer, if you use it later, receives MusicXML only.
][
  #callout[Limit][No artist-named BHL approach. No automatic winner when you compare a pair.]
  #badge("ok")
]

#pagebreak()
== QS-18 World A against the bass
#kicker[Worked example · Intermediate · BHL s52]
#duo[
  *Fast lane.* With the bass locked, set Harmonic world to A, Triad pairs.

  World A holds two major triads a major second apart. They share no pitch class. C major and D major together are C, D, E, F-sharp, G, A.

  #strong[1.] Choose world A before or at the lock, as the V1.0 handbook describes.

  #strong[2.] Let the bass keep the ground. The guitar changes triad.

  #strong[3.] BHL s52 and s53 cover the pair and the choice. Follow those pages rather than a second copy here.
][
  #figure(
    image("../assets/diagrams/bhl-worlds.svg", width: 100%, alt: "Six tiles for BHL worlds A to F, with the common-tone and contrast wording from the BHL V1.0 handbook."),
    caption: [Worlds A–F, copied from the V1.0 handbook table. Not a new theory.],
  )
  #badge("ok")
]

#pagebreak()
== QS-19 Three candidates, one pair
#kicker[Worked example · Intermediate · BHL s53]
#duo[
  *Fast lane.* Make three candidates, compare them as a pair, keep one, and refine without losing the parent. BHL s54 is the refine rule.

  #strong[1.] Three candidates are for your ear. Comparison has no automatic winner.

  #strong[2.] Listen for the bass still matching the locked line.

  #strong[3.] Write one sentence about why you kept the pair. That sentence is the start of an Evaluation note, not a score.
][
  #callout[Listen for][The candidate whose guitar changes the light without dragging the bass off the lock.]
  #badge("ok") #badge("manual")
]

#pagebreak()
= 7 · Arrange and finish
A chart, a printed part, and a listening note. Orchestra and picture-sync stay manual.

#pagebreak()
== QS-20 SQ to BB first chart
#kicker[Worked example · Advanced]
#duo[
  *Fast lane.* Preset #ui[SQ → BB]. Read the four-voice sketch, then the big-band section plan, and export only if the status says the score passed.

  #strong[1.] The registry describes a line-first SATB sketch, a review of four voices, then a translation into a big-band section plan.

  #strong[2.] This is not a full band arrangement with shout chorus, drum parts, and copyist cues unless those staves are actually in the file. Count the parts.

  #strong[3.] #ui[Big Band] is the other preset: seven-part ensemble MusicXML when export passes.

  #strong[4.] Shaping a longer arc on #ui[Structure] or #ui[Arranger] is Verify until you have tried those pages on this file.
][
  #callout[Limit][No orchestral rendering and no hit-point clock live in the app navigation.]
  #badge("ok") #badge("verify") #badge("manual")
]

#pagebreak()
== QS-21 Engrave and print
#kicker[Worked example · Beginner]
#duo[
  *Fast lane.* Open the MusicXML in your notation program, set A4, and export a PDF from there.

  #strong[1.] Guitar is treble clef, sounding an octave lower, labelled guitar. Double bass is bass clef, sounding an octave lower.

  #strong[2.] Put bar numbers at the start of each system. Keep chord symbols on one staff.

  #strong[3.] Dynamics and fermatas are manual if the exported file has none.

  #strong[4.] This Quick Start was not engraved in Sibelius. Do not treat a schematic in the Handbook as a plate from a publishing house.
][
  #badge("manual")
]

#pagebreak()
== QS-22 Log a listening note in Evaluation
#kicker[Worked example · Beginner]
#duo[
  *Fast lane.* Open #ui[Evaluation] after you have two files, and write what you heard in your own words.

  #strong[1.] The route exists. The exact form of a comparison was not re-run for this edition, so confirm the controls on the page.

  #strong[2.] Write three lines: what stayed, what changed, what you will play tomorrow.

  #strong[3.] A note is not an approval of the piece, and it is not a GCE release score.
][
  #callout[Why it works][A decision you can read next week is more useful than a second generate you cannot remember.]
  #badge("verify") #badge("manual")
]

#pagebreak()
= Quick reference
*Studio.* #ui[Play Scale], #ui[Generate], #ui[Generate another], #ui[Export MusicXML], #ui[Save session], #ui[Reopen session]. Families: Scale pathways, Melodic cells, Pentatonic studies, Triad and dyad studies, BHL colour studies, Rhythmic studies. Levels: Beginner, Intermediate, Advanced. Bars: 4, 8, 16. Metres include 4/4, 3/4, 5/4, 6/8, 7/8.

*Pentatonic.* #ui[Use for path transform and phrase generation], #ui[Generate path], #ui[Practice this collection], #ui[Save project].

*Hexatonic.* Family Scalar collection or WPS triad pair. #ui[Generate INSIDE / OUTSIDE / RETURN]. #ui[Export MusicXML].

*Generate presets.* Guitar/Bass Duo. Guitar–Bass Duo (Single-Line). Wyble Etude. Slonimsky Etude. Martino Linear. ECM Chamber. Song Mode. Big Band. String Quartet. Riff Generator. SQ → BB.

No keyboard shortcut list is printed here. The Pentatonic search on Generate shows Ctrl+K for composer search. Do not assume that chord works on every page.

#pagebreak()
= What Composer OS does not do
These limits are quoted from the source and the BHL V1.0 manuals.

- BHL has no audio of its own and no tablature.
- BHL files are not imported into the Riff Engine. There is no artist-named BHL approach.
- Performance Composer receives MusicXML only.
- Comparison of a pair has no automatic winner.
- The six BHL worlds A–F are fixed. Liquid harmony is world B. There is no separate Liquid Harmony button inside BHL.
- Practice has no drone. #ui[Develop in BHL Composer] is conditional. #ui[Use in Generate] is not on the Studio page.
- #ui[Open File] and #ui[Open in Finder] are desktop actions. This edition did not install the desktop app.
- There is no orchestral score engine and no film-sync clock in the route list. Those jobs are manual after MusicXML export.
- Electronic sound design happens in your DAW after export.
- #ui[Arranger], #ui[Structure], #ui[Ensemble], and #ui[Grid] are routes. This book does not invent their internals.
- A generate status that returns planning JSON is not a finished score.
