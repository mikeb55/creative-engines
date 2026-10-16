# COMPOSER OS V3.2 — TWO-MANUAL EDITORIAL DESIGN AND PRODUCTION SPECIFICATION

Final design consultation · 16 October 2026 · Source baseline: `mikeb55/creative-engines` at commit `1072b365`

## 1. Executive design recommendation

**Two books, one design system and one build.** The *Musician's Quick Start Guide* runs to **36 pages with 22 worked examples**. *The Complete Creative Composition Handbook* runs to **196 pages with 122 scenarios**: 92 craft scenarios plus 30 cross-engine recipes. Both are A4 portrait and are built from plain-text Typst source. Notation is engraved in Sibelius and placed as vector PDF.

### Decisions this specification fixes

1. **Every software claim must pass a capability register.** No scenario prints a control, preset or hand-off unless it is listed in `capabilities.yaml` with source evidence from the real build. Where a step needs judgement or software the app does not drive, it is labelled ✎ Manual. Where an interaction has not been confirmed, it is labelled ? Verify. Nothing is printed as fact without evidence.
2. **The BHL manuals are reused, not rewritten.** The existing BHL Quick Start (15 pages) and Creative Scenarios Handbook (56 pages, scenarios 1–68) remain the BHL reference ([BHL manuals README](https://github.com/mikeb55/creative-engines/blob/1072b365/docs/bhl-composer/manuals/README.md)). The new books cite them as "BHL s48" and carry their Limits list forward unchanged.
3. **The Handbook teaches composition, with the software as one tool.** Each scenario explains why the result is musically interesting, then gives the procedure. The model is Ableton's *Making Music*, which is organised around creative problems and strategies rather than features ([Ableton](https://www.ableton.com/en/blog/making-music-book-of-creative-strategies/)).
4. **The toolchain is Typst 0.14 or later.** It produces tagged, accessible PDFs by default and can enforce PDF/UA-1 ([Typst 0.14](https://typst.app/blog/2025/typst-0.14/), [PDF standards](https://typst.app/docs/reference/pdf/)). It embeds PDFs as images, so Sibelius vector exports drop straight in ([Typst 0.14 changelog](https://typst.app/docs/changelog/0.14.0/)). Headings become PDF bookmarks ([heading.bookmarked](https://typst.app/docs/reference/model/heading/)). This replaces the fpdf2 approach used for the BHL manuals, which cannot produce tagged or validated PDFs.

### What the source shows at 1072b365

This is what the books may build on. Cursor must re-confirm it against the running build.

- **Generate presets.** There are 11 ([`composerOsPresetUi.ts`](https://github.com/mikeb55/creative-engines/blob/1072b365/apps/composer-os-app/src/constants/composerOsPresetUi.ts)):
  - Guitar/Bass Duo, and Guitar–Bass Duo (Single-Line);
  - Wyble Etude, Slonimsky Etude and Martino Linear;
  - ECM Chamber and Song Mode;
  - Big Band (seven-part ensemble MusicXML) and String Quartet (four strings plus a piano harmony staff);
  - Riff Generator (1–4 bar loopable riffs);
  - SQ → BB (a line-first SATB sketch translated into a big-band section plan).
- **Navigation.** Generate, Arranger, Structure, Ensemble, Grid, Presets, Outputs, RiffGen, Composer Engines, Slonimsky Etudes, Pentatonic, Hexatonic, BHL, Practice & Scales Studio, Evaluation, Performance Composer, Help and Credits ([`appRouter.ts`](https://github.com/mikeb55/creative-engines/blob/1072b365/apps/composer-os-app/src/router/appRouter.ts)).
- **Practice & Scales Studio.**
  - A Dorian is the default, and one root drives both the fretboard and the player.
  - BHL is offered only when the sounding set matches (commit `1072b365` message).
  - Six exercise families: scale pathways, melodic cells, pentatonic studies, triad and dyad studies, BHL colour studies, and rhythmic studies.
  - Three levels: Beginner, Intermediate and Advanced (`practiceExerciseGenerator.ts`).
- **BHL limits** ([BHL handbook source](https://github.com/mikeb55/creative-engines/blob/1072b365/docs/bhl-composer/manuals/source/BHL-CREATIVE-SCENARIOS-HANDBOOK-V1.0.md)):
  - BHL has no audio of its own and no tablature.
  - BHL files cannot be imported into the Riff Engine, and there are no artist-named approaches.
  - Performance Composer receives MusicXML only.
  - Comparison works on a pair, with no automatic winner.
  - The six worlds A–F are fixed, and liquid harmony is world B.
- **SQ harmonic voices.** These include film-composer profiles such as Philip Glass and Nino Rota. They shape the four string lines in SQ → BB. There is no orchestral engine in the app's navigation ([Film Composer guide](https://github.com/mikeb55/creative-engines/blob/1072b365/docs/FILM_COMPOSER_GUIDE.md)).
- **Song Mode and Generate controls.** Song Mode plans hooks, sections and rules. The Musician Guide documents per-section metre, polychords, slash chords, Coltrane changes, modal progressions, and Pin/Avoid section shaping ([Musician Guide](https://github.com/mikeb55/creative-engines/blob/1072b365/docs/COMPOSER_OS_MUSICIAN_GUIDE.md)).

### Where the books must not imply capabilities

- **Orchestra and film.** Full orchestral writing and film-cue synchronisation are ✎ Manual.
- **Electronic textures.** These are ✎ Manual, done after MusicXML import into your DAW.
- **Arranger, Structure, Ensemble and Grid.** Their exact behaviour is not documented in this baseline, so every step using them is ? Verify until the register confirms it.
- **Practice → BHL.** The hand-off works only when the sounding set matches. Other outbound routes from Practice are ? Verify.

### Notation-tool conflict, resolved

Mike's standing production rule is to engrave in Sibelius. The BHL V1.0 manuals used MuseScore 4 pictures and tell readers to ignore BHL's "Open in Sibelius" button. The new books therefore:

- engrave every figure in Sibelius through the existing Sibelius Connect workflow;
- tell readers to "open the MusicXML in your notation program";
- never instruct anyone to use BHL's Open in Sibelius button.

## 2. Visual design system

### Format and grid

| Item | Specification |
|---|---|
| Page | A4 portrait, 210 × 297 mm, for both books. It prints on UK home printers, reads well on a laptop at fit-width, and is wide enough for two systems of a duo score. |
| Margins | Inside 20 mm, outside 18 mm, top 20 mm, bottom 22 mm. The single-sided PDF uses the same margins on every page. |
| Grid | 12 columns with 4 mm gutters. The **main column** spans 8 columns (about 112 mm). The **rail** spans 4 columns (about 52 mm) and holds Listen for, Why it works, cross-references and status. Scores, fretboards and screenshots may span all 12 columns. |
| Baseline | 15 pt body leading. Space above and below objects is a multiple of 3 mm. |
| Running header | 9 mm from the top edge. Left: book, chapter and scenario ID. Right: **↩ Contents**. A 0.4 pt rule underneath. |
| Footer | 9 mm from the bottom edge. Left: edition line. Right: page number. |

### Typography

All fonts are free to embed under the SIL Open Font License.

| Role | Font | Size / leading | Notes |
|---|---|---|---|
| Body | Source Serif 4 | 10.5 / 15 pt | Warm and readable for long theory passages |
| Lede (opening sentence) | Source Serif 4 | 12 / 17 pt | One or two sentences answering "why should I care" |
| Display headings | Source Sans 3 Bold | 22 / 25 pt (H1), 11.5 pt (H2) | Sans headings keep the page modern rather than academic |
| Kicker (label above the title) | Source Sans 3 Bold caps, +8% tracking | 8.5 pt | Scenario ID, time, level |
| UI control labels | Source Sans 3 Semibold in a key-cap box | 8.6 pt | e.g. ⟦Play scale⟧. The exact string comes from the source |
| Captions and tables | Source Sans 3 | 8–8.5 / 10.5–11 pt | |
| IDs, file paths, Ian Ring numbers | JetBrains Mono | 8.5 pt | |
| Inline accidentals and music symbols | Bravura Text | matches body | Bravura is SMuFL's reference font and is released under the SIL OFL ([W3C SMuFL](https://www.w3.org/2021/03/smufl14/about/implementations.html)) |
| Large-print build variant | Atkinson Hyperlegible | 12.5 / 18 pt | SIL OFL, from the Braille Institute ([Atkinson Hyperlegible](https://github.com/googlefonts/atkinson-hyperlegible/blob/main/README.md)). Same source, one build flag |

### Colour

The palette comes from the Okabe–Ito colour-blind-safe set ([palette reference](https://visualsandbox.com/techniques/colour/functional/colour-blind-safe/)). Every colour is paired with a shape or a word so the pages still work in monochrome.

| Token | Hex | Use | Monochrome fallback |
|---|---|---|---|
| Ink | #1A1A1A | Text, roots | — |
| Quick Start accent | #0072B2 blue | Kickers, step discs, links | Bold weight |
| Handbook accent | #D55E00 vermillion | Kickers, recipe band, links | Bold weight |
| ✓ Verified | #009E73 | Status badge, "Try this" boxes | ✓ glyph and the word |
| ? Verify | #E69F00 | Unconfirmed interaction | ? glyph and the word |
| ✎ Manual | #CC79A7 | Composer works by hand | ✎ glyph and the word |
| Tint | #F3F6F9 | Callout background | 6% grey |

### Chapter treatments

- **Quick Start chapter opener (one page).** A large chapter number in accent at 60 pt, the title, a three-line promise ("By the end you will have…"), and a mini-map of the Discover → Hear → See → Practise → Develop → Export path with the current stage filled in.
- **Handbook part openers (two-page spread).** The left page carries one full-bleed notation image from the part's best example. The right page carries the part title, the musical question the part answers, and a list of its scenarios with status badges.
- **Handbook chapter openers (one page).** The chapter's musical question, a 120-word essay, and a "Techniques in this chapter" list linked to the glossary.
- **Recipe pages.** A 2.2 mm accent band at the top, followed by an engine-chip strip and status badges (see the sample page in section 6).

### Screenshot styling

- Capture from the real build named in the colophon at a fixed 1440 × 900 window and 2× scale, using Playwright's Electron launcher.
- Never recolour the app's own theme.
- Crop each image to the panel being taught. Never show a full window unless the page teaches navigation.
- Frame with a 0.5 pt #CFCFCF border and no drop shadow. Number callouts with filled accent discs that match the step numbers on the page.
- Write captions as "Screenshot n.m: Route › Panel" plus one sentence about what to notice.
- Hide home-directory paths and user names before capture.

### Notation presentation

The house reference for notation decisions is Elaine Gould's *Behind Bars* ([Faber Music](https://www.fabermusic.com/news/new-behind-bars-general-conventions-published-22062023)).

- **Engraving.** Sibelius house style, with a 6.5 mm staff in the Quick Start and 6 mm in the Handbook. Export vector PDF at the exact frame width (112 mm for main-column examples, 172 mm for full width).
- **Guitar.** Treble clef, sounding an octave lower, labelled "Gtr.".
- **Double bass.** Bass clef, sounding an octave lower, labelled "Bass".
- **Tablature.** Only where the exported MusicXML contains it. BHL has none.
- **Excerpt length.** Quick Start up to 8 bars. Handbook up to 16 bars. Every full score ships as MusicXML in the companion folder.
- **Bar numbers** at the start of every system. Chord symbols use the Sibelius default in the score and Source Sans in prose.
- **Analytical labels** (T4, I, ✓ shared tone, world A→F) sit above the staff in Source Sans 7.5 pt in the accent colour, with circled numbers ① ② ③ that the caption explains. They are never placed inside the staff.

### Diagrams

These are built as SVG by the build script, not drawn by hand.

- **Fretboard.** Horizontal, high E on top, frets numbered below. Shapes: ■ root, ◆ characteristic tone, ● other tones, ◇ comparison-only, each labelled with an interval number. Position windows span 5–6 frets.
- **Pitch-class clock** ("bracelet"). C at 12 o'clock, clockwise. Collection tones are filled, others hollow, with the cell joined by an accent line. The caption gives the Ian Ring number and Forte class.
- **BHL world map.** Six tiles, A–F, with common tone and contrast, taken from the BHL handbook table.
- **Engine-flow strip.** Chips joined by arrows, each carrying its status glyph.

### Callout types

There are six, used sparingly with at most three per page:

- **Listen for:** what to hear.
- **Why it works:** a musical explanation in one or two sentences.
- **Try this:** a creative challenge.
- **✎ Manual step:** what the composer does by hand.
- **? Verify:** an unconfirmed interaction.
- **Limit:** a documented refusal, quoted from the source.

## 3. The Musician's Quick Start Guide (36 pages)

| Chapter | Pages | Worked examples | Content |
|---|---|---|---|
| Cover, edition and how to use this book | 2 | — | Cover links to Contents. Colophon gives the build commit |
| Contents | 1 | — | Hyperlinked to depth 2 |
| 1 Your first five minutes | 3 | QS-01, QS-02 | Install check, Generate a Guitar/Bass Duo, play it in your notation program |
| 2 Finding your way | 3 | QS-03 | Annotated navigation map, with a "which page for which job" table |
| 3 Hear a scale, see it, play it | 6 | QS-04 to QS-08 | Practice & Scales Studio: A Dorian (sample page), pentatonic minor, a Tonal-named scale, an unnamed scale, exporting an exercise |
| 4 Generate: one idea, many forms | 6 | QS-09 to QS-13 | Duo, Single-Line Duo, Song Mode hook, Riff Generator, String Quartet |
| 5 Colour with Pentatonic and Hexatonic | 4 | QS-14 to QS-16 | One pentatonic colour, a triad-pair hexatonic, an augmented collection |
| 6 Develop with BHL | 4 | QS-17 to QS-19 | Import, lock the bass, choose a world, three candidates, pick a pair (BHL s05, s52, s53) |
| 7 Arrange and finish | 4 | QS-20 to QS-22 | Big Band or SQ → BB first chart. Opening MusicXML in a notation program. Evaluation as a listening log |
| Quick reference | 2 | — | One-page control map and keyboard shortcuts (if any exist in the source) |
| What Composer OS does not do | 1 | — | Limits quoted from the source |
| **Total** | **36** | **22** | |

### Quick Start worked examples

- QS-01 First duo in 2 minutes
- QS-02 Open the MusicXML
- QS-03 Find the right page
- QS-04 A Dorian
- QS-05 Minor pentatonic box and beyond
- QS-06 A named scale from the Tonal list
- QS-07 An unnamed scale by its formula
- QS-08 Export and save a practice session
- QS-09 Duo with your own chords
- QS-10 Single-line conversation
- QS-11 Song Mode hook
- QS-12 A four-bar riff
- QS-13 String quartet sketch
- QS-14 Kumoi colour
- QS-15 Triad-pair hexatonic
- QS-16 Augmented collection
- QS-17 BHL import and lock
- QS-18 World A against the bass
- QS-19 Three candidates, one pair
- QS-20 SQ → BB first chart
- QS-21 Engrave and print
- QS-22 Log a listening note in Evaluation

### Teaching level

Each worked example fits on one page or a spread. Experienced readers can follow the bold "Fast lane" line, which gives the steps in a single sentence and sits above the full steps.

## 4. The Complete Creative Composition Handbook (196 pages)

| Part / chapter | Pages | Scenarios | Exercises* |
|---|---|---|---|
| Front matter: cover, colophon, Contents (3 pages), How to use this book, the scenario method, the status key | 8 | — | — |
| **Part I Foundations** | 14 | — | 6 |
| 1 Composing with engines: a method | 5 | — | 2 |
| 2 The Composer OS map and the capability register | 4 | — | 1 |
| 3 Scales as sound worlds: names, formulas, numbers, brightness | 5 | — | 3 |
| **Part II Craft** (16 chapters, each with a one-page opener) | 108 | 92 | 92 |
| 4 Melodic invention and transformation | 8 | 7 | 7 |
| 5 Riffs and hooks | 7 | 6 | 6 |
| 6 Songwriting and unusual song structures | 7 | 6 | 6 |
| 7 Pentatonic worlds | 7 | 6 | 6 |
| 8 Hexatonic and triad pairs | 7 | 6 | 6 |
| 9 BHL and liquid harmony | 6 | 5 | 5 |
| 10 Transformational harmony, unrelated triads, reharmonisation | 7 | 6 | 6 |
| 11 Jazz guitar and radical chord melody | 7 | 6 | 6 |
| 12 Guitar and upright bass | 6 | 5 | 5 |
| 13 Counterpoint and independent lines | 6 | 5 | 5 |
| 14 String quartet and chamber music | 7 | 6 | 6 |
| 15 Big-band writing | 7 | 6 | 6 |
| 16 Orchestral thinking and film scoring | 6 | 5 | 5 |
| 17 Mixed metre, displacement and fragmentation | 7 | 6 | 6 |
| 18 Electronic textures, experiment and avant-garde improvisation | 7 | 6 | 6 |
| 19 From fragment to form | 6 | 5 | 5 |
| **Part III Cross-engine recipes** (opener spread, then 30 recipes at 1.5 pages each) | 47 | 30 | 30 |
| **Part IV Reference** | 19 | — | — |
| Capability register summary and limits | 4 | — | — |
| Glossary (hyperlinked) | 6 | — | — |
| Index (hyperlinked) | 7 | — | — |
| Sources and further reading | 2 | — | — |
| **Total** | **196** | **122** | **128** |

\*Each scenario ends with one exercise (a creative challenge). Part I adds six orientation exercises.

### Scenario method

Every scenario uses the same seven blocks, with fixed headings so the Handbook is easy to scan:

**Musical goal → Starting material → Engine selection → Exact procedure → Musical result → Variations → Further development**

The page also carries:

- a **Why it's interesting** rail box, which is mandatory;
- a status badge for each software step;
- a "Fast lane" one-line procedure;
- a "Deeper" extension for advanced readers;
- a closing exercise.

Beginners follow the numbered steps. Experienced composers read the goal, the Why box and the Fast lane, then go straight to the variations.

## 5. Scenario taxonomy (122)

Status codes: ✓ uses documented features (Cursor re-confirms) · ? specific interaction needs verification · ✎ includes manual composition. "BHL sNN" cites the BHL Creative Scenarios Handbook.

**Ch 4 Melodic invention and transformation**
- 4.1 One motif, four contours ✓ (BHL s34)
- 4.2 Keep rhythm, change pitch field ✓ (s35)
- 4.3 Augment and diminish a hook ✓ (s37, s38)
- 4.4 The inverted motto in a new register ✓ (s43)
- 4.5 A Practice melodic-cell exercise as a theme ✓
- 4.6 Martino Linear line as a long melody ✓
- 4.7 Melody from an unnamed scale formula ✓✎

**Ch 5 Riffs and hooks**
- 5.1 Four-bar loop with a turnaround ✓
- 5.2 Riff into BHL, pitches from the world ✓ (s33)
- 5.3 Riff rhythm, pentatonic colour ✓
- 5.4 One-note-away riff variants ✓✎
- 5.5 Hook placement in Song Mode sections ✓
- 5.6 Riff as bass ostinato under a new melody ✓✎

**Ch 6 Songwriting and unusual song structures**
- 6.1 Hook-first Song Mode ✓
- 6.2 Per-section metre: verse in 4, chorus in 7 ✓
- 6.3 Pin and Avoid for a contrast arc ✓
- 6.4 A song with no chorus (through-composed) ✓✎
- 6.5 Bridge in a remote pentatonic ✓?
- 6.6 Zappa disruption in a song form ✓

**Ch 7 Pentatonic worlds**
- 7.1 Bright home, dark home ✓ (s19, s20)
- 7.2 Suspended, no third ✓ (s21)
- 7.3 Kumoi to Hirajoshi ✓ (s23)
- 7.4 Both thirds in one field ✓ (s26)
- 7.5 Shift a collection without a new scale ✓ (s29)
- 7.6 When nothing is shared ✓ (s31)

**Ch 8 Hexatonic and triad pairs**
- 8.1 Triad-pair hexatonic on the fretboard ✓
- 8.2 Augmented hexatonic symmetry ✓
- 8.3 Triad and dyad studies as vocabulary ✓
- 8.4 Hexatonic melody over static bass ✓✎
- 8.5 Provisional collections: hearing, not approving ✓
- 8.6 Hexatonic into BHL colour ?

**Ch 9 BHL and liquid harmony** (summaries with cross-references only)
- 9.1 Worlds A–F in one page ✓
- 9.2 Liquid harmony as world B ✓ (s59)
- 9.3 Tension tone that leans ✓ (s10)
- 9.4 Protected bars ✓ (s06)
- 9.5 Refine without losing the parent ✓ (s54)

**Ch 10 Transformational harmony, unrelated triads and reharmonisation**
- 10.1 Minor-third pair, one shared tone ✓ (s17)
- 10.2 Tritone triad, none shared ✓ (s18)
- 10.3 Polychord reharmonisation in the Duo ✓
- 10.4 Coltrane changes as a duo ✓
- 10.5 Slash-chord pedal reharmonisation ✓
- 10.6 Compare two reharmonisations in Evaluation ✓?

**Ch 11 Jazz guitar and radical chord melody**
- 11.1 Wyble two-voice étude ✓
- 11.2 Slonimsky pattern as a chord-melody skeleton ✓✎
- 11.3 Two-note seventh-chord voicings over a BHL line ✓✎
- 11.4 Unrelated-triad chord melody ✓✎
- 11.5 Drop-voicing a hexatonic line ✎
- 11.6 Radical reharm of a standard-like form ✓✎

**Ch 12 Guitar and upright bass**
- 12.1 The bass speaks first ✓ (s44)
- 12.2 Single-line conversation ✓
- 12.3 Register and silence ✓ (s50)
- 12.4 Mixed-metre duo ✓ (s51)
- 12.5 Duo hand-off to Performance Composer ✓ (s62)

**Ch 13 Counterpoint and independent lines**
- 13.1 Wyble counterpoint analysed ✓
- 13.2 SATB line-first sketch (SQ → BB stage 1) ✓
- 13.3 Mirror counterpoint in a symmetric cell ✎
- 13.4 Rhythmic independence by displacement ✓ (s36)
- 13.5 Counter-line against a protected bass ✓ (s45)

**Ch 14 String quartet and chamber music**
- 14.1 String Quartet preset with chord symbols ✓
- 14.2 SQ harmonic voice: Glass ✓
- 14.3 SQ harmonic voice: Rota ✓
- 14.4 One hexatonic cell, four voices ✓✎ (sample page)
- 14.5 ECM Chamber modal piece ✓
- 14.6 Quartet from a duo ✎

**Ch 15 Big-band writing**
- 15.1 Big Band preset with an arranger voice ✓
- 15.2 SQ → BB translation ✓
- 15.3 Slonimsky ensemble cells ✓
- 15.4 Riff to sax soli ✓✎
- 15.5 Shout chorus from BHL dyads ✎
- 15.6 Section shaping for a chart arc ✓

**Ch 16 Orchestral thinking and film scoring**
- 16.1 Cinematic arc in sections ✓
- 16.2 Film-profile quartet as a cue sketch ✓
- 16.3 Orchestrating a quartet sketch ✎
- 16.4 Tension cue from remote pentatonics ✓✎
- 16.5 Hit points and timing ✎

**Ch 17 Mixed metre, displacement and fragmentation**
- 17.1 7/8 canvas ✓ (s03)
- 17.2 5/4 ballad frame ✓ (s04)
- 17.3 Fragment and keep the opening ✓ (s39)
- 17.4 A rest inside the cell ✓ (s41)
- 17.5 A multi-bar rhythm inside the phrase ✓ (s61)
- 17.6 Rhythmic studies as a metre trainer ✓

**Ch 18 Electronic textures, experiment and avant-garde improvisation**
- 18.1 MusicXML into a DAW as raw material ✎
- 18.2 Loops from Riff Generator ✓✎
- 18.3 Constraint cards from unnamed sets ✓✎
- 18.4 Free improvisation on a world map ✎
- 18.5 Slonimsky chromatic cloud ✓✎
- 18.6 Process piece from repeated candidates ✓✎

**Ch 19 From fragment to form**
- 19.1 State once, then stop ✓ (s42)
- 19.2 Continue so the cell returns ✓ (s40)
- 19.3 Two sections, one contrast ✓ (s67)
- 19.4 A rondo from three candidates ✓✎
- 19.5 A longer developmental span ✓ (s68)

**Part III Recipes R-01 to R-30** are listed in section 6.

### Cross-referencing system

- Every scenario carries three tag kinds: **Technique** (e.g. inversion, displacement), **Engine**, and **Material** (e.g. augmented hexatonic, world F).
- The build generates a "Related" line at the foot of each scenario: up to three links chosen by shared tags, preferring a different chapter.
- Glossary terms link to their first definition, and every glossary entry links back to the scenarios that use it.

## 6. Thirty cross-engine recipes

Each recipe page uses the layout of sample page B, with these fields: title, objective, starting material, engines, sequence, technique, outcome, difficulty and verification. Engine abbreviations: Gen = Generate, PSS = Practice & Scales Studio, Pent = Pentatonic, Hex = Hexatonic, Eval = Evaluation, PC = Performance Composer.

| # | Title and objective | Starting material → sequence | Technique → expected outcome | Level | Status |
|---|---|---|---|---|---|
| R-01 | **A sparse duo that breathes.** A duo where silence is structural | Gen Single-Line Duo → BHL import, lock bass, world A → s47, s48 → 3 candidates → pair → PSS practice | Triad pairs with no shared tones, plus an empty last beat → a lyrical, cadence-free conversation | Int | ✓ (PSS hand-off ?) |
| R-02 | **Lyrical duet through BHL transformations.** One hook that grows over 32 bars | Song Mode hook → MusicXML → BHL: augment (s37), fragment (s39), invert and lift (s43) with the bass locked | Motivic development → the hook returns changed but recognisable | Adv | ✓✎ |
| R-03 | **Avant-garde chord melody with unrelated triads.** A solo guitar piece moving between triads that share one note, then none | BHL world F guitar line → export → harmonise by hand: C / E♭ (shared G), then F♯ (nothing shared) → PSS triad and dyad studies | Common-tone pivot, then a total break → surprise without chromatic clutter | Adv | ✓✎ |
| R-04 | **String quartet from one hexatonic cell.** A four-voice texture from four notes | Hex augmented collection → cell MusicXML → optional Gen String Quartet reference (C, A♭, E) → Sibelius voicing | T4 imitation and mirror inversion (Forte 4-17) → dense but consonant independence | Adv | ✓✎? |
| R-05 | **Big band from a fragmented guitar riff.** A chart built from a four-bar riff | Riff Generator → BHL fragment (s39) → chord plan → Gen Big Band with arranger voice → riff into sax soli by hand | Fragmentation as orchestral material → a riff-driven chart with a real soli | Adv | ✓✎ |
| R-06 | **Song from an unusual pentatonic collection.** A pop-length song in In Sen | Pent In Sen → path page → write the hook by hand → Song Mode for form → duo realisation | Exotic colour in a familiar form → memorable but unfamiliar | Int | ✓✎? |
| R-07 | **A film cue through several harmonic worlds.** 90 seconds that move world A → C → F | BHL guitar theme in three worlds → Gen SQ → BB with a Glass SQ voice → orchestrate by hand | Same theme, three harmonic lights → narrative change without a key change | Adv | ✓✎ |
| R-08 | **Progressively stranger modes.** A suite in which each movement takes one step further from the familiar | PSS: Ionian → Lydian → a Tonal-named mode → an unnamed set (formula) → Gen Slonimsky étude per stage | A brightness and strangeness ladder → a coherent suite with a clear arc | Adv | ✓? |
| R-09 | **Slonimsky into a BHL world.** A chromatic pattern tamed by a pitch field | Gen Slonimsky Etude → MusicXML → BHL import (s05), world D | Pattern meets field: notes outside the world are named and omitted → a ghost of the pattern | Adv | ? |
| R-10 | **Wyble counterpoint, reharmonised.** A two-voice étude in a new harmonic world | Gen Wyble Etude → BHL import, world C | Contrapuntal line plus the major/augmented colour → bittersweet modern counterpoint | Adv | ? |
| R-11 | **Martino line over a song form.** A long linear solo that fits sections | Gen Martino Linear → Song Mode sections → combine by hand | Linear invention across form boundaries → a solo with an architecture | Int | ✓✎ |
| R-12 | **Duo into chamber trio.** Add a third voice to a finished duo | R-01 result → Gen ECM Chamber with the same chord symbols → merge one line by hand | Chamber orchestration of a duo → more space, not more notes | Int | ✓✎ |
| R-13 | **Pentatonic SATB to big band.** A pentatonic melody harmonised as four lines | Pent melody → Gen SQ → BB (line-first SATB) → section plan | Four-voice pentatonic counterpoint → a modal big-band sound | Adv | ✓? |
| R-14 | **Practise the riff, then transform it.** Learn a riff physically before developing it | Riff Generator → PSS rhythmic studies on the riff's scale → BHL riff rhythm (s33) | Embodied learning → development ideas come from the hands | Beg | ✓? |
| R-15 | **Hand the duo to Performance Composer.** A radical guitar response to a BHL duo | BHL MusicXML → PC (s62) → Respond | A locked bass with a new guitar persona → a contrasting second take | Adv | ✓ |
| R-16 | **Choose with your ears.** Pick a pair from three candidates and record why | BHL 3 candidates → Eval compare two → human listening note | Structured listening → a better decision, logged | Int | ✓? |
| R-17 | **Polychord reharmonisation.** Upper-structure colour over a simple tune | Duo preset with polychord symbols (Guide §6.4) → compare with the original | Upper structures → a richer tune with the same melody | Int | ✓ |
| R-18 | **Coltrane changes in five.** Fast key cycles in an odd metre | Duo with Coltrane changes (§6.5) and per-section 5/4 | Cycle by major thirds in an odd metre → a jazz study with new friction | Adv | ✓? |
| R-19 | **Disrupted song.** A song that breaks its own form on purpose | Song Mode + Zappa disruption (Guide §5.6) | Planned interruption → humour and surprise | Int | ✓ |
| R-20 | **Two-colour bridge.** A bridge that filters a pentatonic colour through world C | BHL s30 → splice into a Song Mode verse/chorus | A filtered colour → a bridge that sounds related but lit differently | Int | ✓✎ |
| R-21 | **Nothing shared: a tension cue.** Remote collections for unease | BHL s31 and s28 → quartet orchestration by hand | Zero common tones → suspense without dissonance clichés | Adv | ✓✎ |
| R-22 | **Triad-pair chord-melody drill.** Turn a hexatonic into voicings | PSS triad and dyad studies on the C–D triad pair → write chord melody by hand | Vocabulary to repertoire → a personal chord-melody language | Int | ✓✎ |
| R-23 | **Odd-metre groove.** A 7/8 piece with a borrowed rhythm | BHL 7/8 canvas (s03) + riff rhythm (s61) | Rhythmic transplant → a groove that limps on purpose | Int | ✓ |
| R-24 | **Electronic texture from notation.** Turn a quartet into an ambient bed | Gen String Quartet → MusicXML → DAW → stretch and process by hand | Score as sample source → an acoustic DNA in an electronic sound | Int | ✓✎ |
| R-25 | **Constraint cards for free improvisation.** Unnamed sets as playing rules | PSS unnamed scale formulas → print cards → improvise as a duo | Constraint-based improvisation → focused freedom | Beg | ✓✎ |
| R-26 | **Fragment to rondo.** A five-minute form from one cell | BHL s42, s40 and three candidates → A–B–A–C–A assembled by hand | Return and contrast → a large form from a small seed | Adv | ✓✎ |
| R-27 | **Canon at the major third.** An ostinato canon in the augmented hexatonic | Hex cell → canon at T4 by hand → quartet | A T4-invariant collection → a canon that never clashes | Adv | ✓✎ |
| R-28 | **Shout chorus from dyads.** Expand duo dyads into a brass climax | BHL s48 dyads → four-way close by hand → Big Band reference | Expanding the voicing → a climax derived from the opening intimacy | Adv | ✓✎ |
| R-29 | **Standard-like form, unrelated triads.** Reharmonise a 32-bar form | Your chords → BHL world F development → Eval comparison | Triadic substitution → an old form with a strange surface | Adv | ✓? |
| R-30 | **Chamber-film diptych.** The same material scored twice | Gen SQ with a Glass voice, then a Rota voice → pair in Eval | Style as orchestration → two films from one theme | Int | ✓? |

## 7. Three sample page designs

The complete self-contained HTML/CSS for all three pages is in Appendix A. I rendered all three at A4 with headless Chromium and checked them for overflow and clipped glyphs.

### A. Quick Start QS-07: Discover, hear and practise A Dorian

**Layout and proportions.**
- Header strip (8 mm).
- Title block (full width, about 18%): kicker, H1 and lede.
- Body: main column (8 columns, about 45% of the page height) with five steps and the fretboard figure; rail (4 columns) with Listen for, Why it's useful, Try this, Next links and the status badge.
- Full-width screenshot (about 22%), then the footer.

**Assets.**
- An SVG fretboard of A Dorian in fifth position. Root A is shown ■ on the low E string (fret 5), the D string (fret 7), the B string (fret 10) and the high E string (fret 5). The sixth, F♯, is shown ◆ on the A string (fret 9) and the B string (fret 7).
- A cropped Studio screenshot with two callouts.

**Hierarchy.** The order is goal → sound → shape → exercise. Numbers never appear before sound.

### B. Recipe R-01: A sparse duo that breathes

**Layout.**
- Accent band, kicker, H1 and an engine-chip strip with two status badges.
- Main column: Musical goal, Starting material, a five-step Procedure.
- Rail: Why it's interesting, Listen for, and ✎ Manual step.
- A full-width two-stave Sibelius excerpt with circled analysis numbers.
- Variations (main column) and Develop further links (rail).

**Assets.** A Sibelius vector PDF of bars 1–8 at 172 mm wide, plus a BHL panel screenshot reused from the BHL manuals' asset folder if it is still current.

### C. Handbook S-14.4: One hexatonic cell, four independent voices

**Layout.**
- Title block with a lede that states the musical idea, not the software.
- A pitch-class clock (4 columns) beside a four-voice technique table (8 columns), with a status badge on each row.
- Procedure (main column) with Why it works and ? Verify in the rail.
- A full-width four-stave Sibelius excerpt.

**Music, checked in the build.**
- Cell C–E♭–E–G, Forte 4-17, inside the augmented hexatonic (Ian Ring 2457).
- Violin II: transposed up a major third (T4), giving E–G–G♯–B.
- Viola: mirrored to G–E–E♭–C.
- Cello: augmented-triad roots C–A♭–E.
- Every pitch stays inside {C, E♭, E, G, G♯/A♭, B}.

## 8. Hyperlink, bookmark and navigation specification

| Requirement | Typst implementation | Automated check |
|---|---|---|
| Hierarchical contents | `#outline(depth: 3)` labelled `<contents>`. Entries link by default ([outline](https://typst.app/docs/reference/model/outline/)) | Every outline entry resolves to a page whose heading text matches |
| Back to Contents on every page | Page `header` containing `link(<contents>)[↩ Contents]`, also on the cover | pypdf: every page has a link annotation whose destination is the Contents page |
| PDF bookmarks | Headings to depth 3, `bookmarked: auto` ([heading](https://typst.app/docs/reference/model/heading/)) | The pypdf outline tree matches the heading list ([pypdf outlines](https://pypdf.readthedocs.io/en/latest/user/handling-outlines.html)) |
| Internal cross-references | Labels `<s-14-4>`, `<r-01>`, `<g-triad-pair>`. Links use `link(<label>)` or `@label` ([label](https://typst.app/docs/reference/foundations/label/), [link](https://typst.app/docs/reference/model/link/)) | Typst fails to compile on a missing label. The validator counts resolved destinations |
| External links | `link("https://…")` with visible underlined text | HTTP check (status below 400) with a retry and an allow-list for sites that block automated requests |
| Running headers and page numbers | `context` query of the current H1/H2 in the header; footer counter | Text extraction confirms the header text on each page |
| Searchable, selectable text | Live text only. Music and diagram labels are SVG text or vector PDF | `pdftotext` returns text on every page. `pdffonts` shows every font embedded |
| Glossary | Terms labelled `<g-…>`, with first uses linked | Every `<g-…>` is referenced at least once |
| Index | in-dexter 0.7.2 (Apache-2.0). Its page references are link targets ([in-dexter](https://typst.app/universe/package/in-dexter)) | Every index page reference is a link annotation |
| Links between the two books | Text reference plus a relative file link. It opens at page 1, because page-level targets between files vary by PDF viewer | Manual spot check in Preview and Acrobat |

## 9. Accessibility and notation standards

- **Tagged PDF and PDF/UA-1.** Compile with `--pdf-standard ua-1`. Typst fails the build if alt text is missing ([Typst accessibility guide](https://www.typst.app/docs/guides/accessibility/)). Validate with veraPDF ([veraPDF](https://verapdf.org/home/)).
- **Alt text for notation** describes the music, not the picture. For example: "Bars 1–4. Violin I plays C–E♭–E–G in crotchets; violin II enters a beat later a major third higher; viola mirrors the cell; cello holds C, A♭, E." Put alt text on the image, not on the figure ([Typst accessibility guide](https://www.typst.app/docs/guides/accessibility/)).
- **Colour is never the only signal.** Each colour pairs with a glyph or a word, as WCAG requires ([W3C 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)). Fretboard shapes follow the same rule.
- **Contrast.** Body text at least 4.5:1. Accent text on tint at least 4.5:1. Captions no smaller than 8 pt.
- **Language** set to `en-GB`, with British spelling and terms (crotchet, bar, semitone), and American equivalents in the glossary.
- **Reading order.** Rail boxes follow the main column in tag order. Headers and footers are marked as artifacts.
- **Notation.** Follow *Behind Bars* conventions. Annotation rules are in section 2.

## 10. Cursor-ready PDF production instructions

**Folder structure** (new and versioned; the BHL manual folders are not touched):

```
docs/manuals/v3.2/
  capabilities.yaml          # every documented control/preset/hand-off: id, label (exact string), source file:line, evidence, status ✓/?/✎
  shared/template.typ        # page, grid, fonts, colour tokens, callouts, badges, chips, header/footer
  shared/diagrams.py         # SVG fretboards, pitch-class clocks, world map, engine strips
  quickstart/*.typ           # one file per chapter
  handbook/*.typ             # one file per chapter; scenarios as Typst functions with the seven fixed blocks
  assets/screenshots/        # Playwright Electron captures, 1440×900 @2x
  assets/notation/           # Sibelius .sib + vector PDF per figure; source MusicXML alongside
  assets/manifest.json       # sha256 of every asset + build commit
  build.py                   # compile both books (typst ≥0.14, --pdf-standard ua-1)
  validate.py                # all checks in section 11; writes validation-report.md
  out/COMPOSER-OS-QUICK-START-V3.2.pdf
  out/COMPOSER-OS-CREATIVE-COMPOSITION-HANDBOOK-V3.2.pdf
  CHANGELOG.md
```

**Build rules.**
- A scenario macro takes a `caps:` list. The build fails if any ID is missing from `capabilities.yaml`, and prints the status badge automatically from the register.
- UI labels are generated from the register's exact strings, never typed by hand.
- Notation figures are engraved in Sibelius through the existing Sibelius Connect workflow. If Sibelius is not available, the build stops and reports which figures are missing. It must not substitute another engraver.
- Screenshots come only from the build commit printed in the colophon.

**Tools and licences.**

| Tool | Licence | Use |
|---|---|---|
| Typst | Apache-2.0 | Typesetting and PDF output |
| in-dexter | Apache-2.0 | Index |
| pypdf | BSD | Link and outline checks |
| veraPDF | Open source | PDF/UA checks |
| poppler-utils | GPL, run as command-line tools only | `pdftotext`, `pdffonts`, `pdftoppm` |
| Playwright | Apache-2.0 | Screenshots |
| Source Serif 4, Source Sans 3, JetBrains Mono, Bravura, Atkinson Hyperlegible | SIL OFL | Fonts. Embedding is allowed; include OFL notices in the colophon |
| Tonal.js names | MIT | Credited in the colophon |
| Ian Ring | — | Numbers and links only. No names |

**Versioning.**
- The colophon prints the edition (V3.2.0), build commit, build date and capability-register hash.
- Corrections bump the patch number (V3.2.1) and add a CHANGELOG entry.
- Earlier PDFs are kept, not overwritten.

## 11. Quality-assurance checklist

1. Both PDFs compile with `--pdf-standard ua-1` and pass veraPDF PDF/UA-1.
2. Page counts: Quick Start 30–40, Handbook 150–200. Report the actual counts.
3. Counts: 22 worked examples, 92 scenarios, 30 recipes, all present and numbered with no gaps.
4. Every page has a working ↩ Contents link, including the cover.
5. The outline tree matches the headings to depth 3, and every bookmark opens the right page.
6. Zero unresolved internal links, and every glossary term and index entry is linked.
7. External links return a status below 400. Failures are listed, not ignored.
8. Every font is embedded, and every page returns extractable text.
9. Every image and diagram has alt text, and notation alt text describes the music.
10. Every software step carries a ✓, ? or ✎ badge, and every ✓ maps to register evidence.
11. No Ian Ring names appear, and no feature is described that is absent from the register.
12. The pitch-content tests pass for every figure that states a collection (e.g. S-14.4 stays within 2457).
13. Visual check: every page rendered at 110 dpi into contact sheets; no clipped text, overflow, broken glyphs or orphaned headings; captions sit next to their figures.
14. Every printed UI label ("Play scale", "Practice → BHL" and so on) matches the register's exact string.
15. The BHL manual folders are unchanged (hash comparison).

## 12. Final Cursor production prompt

```
COMPOSER OS V3.2 — BUILD THE TWO ILLUSTRATED MANUALS
Work on main in mikeb55/creative-engines. Create docs/manuals/v3.2/ exactly as in section 10 of the spec. Do not modify engines, app code, or docs/bhl-composer/manuals/ (hash them first; prove unchanged at the end).
1. INSPECT AND REGISTER. Read the real source (presets, router, Practice & Scales Studio, BHL, Pentatonic, Hexatonic, Arranger, Structure, Ensemble, Grid, Evaluation, Performance Composer, exports). Build capabilities.yaml: id, exact UI string, file:line, evidence (test name or screenshot), status ✓ / ? / ✎. Run the app at the current commit to confirm each ✓; anything not confirmed is ?.
2. WRITE. Author both books in Typst ≥0.14 using shared/template.typ and the design system, contents, page budgets, scenario taxonomy (S-4.1…S-19.5), 30 recipes (R-01…R-30) and the three sample page designs in the spec. Every scenario uses the seven fixed blocks plus "Why it's interesting", "Fast lane" and an exercise. Badges and UI labels come only from capabilities.yaml. Cite BHL handbook scenarios as "BHL sNN" instead of duplicating them. No Ian Ring names; Tonal names credited (MIT).
3. ASSETS. Generate SVG diagrams with shared/diagrams.py. Capture screenshots with Playwright Electron at 1440×900 @2x from this commit. Engrave every notation figure in Sibelius via the existing Sibelius Connect workflow and place vector PDFs; if Sibelius is unavailable, stop and list the missing figures — do not substitute another engraver. Write pitch-content tests for each figure that states a collection.
4. BUILD. python3 build.py → out/COMPOSER-OS-QUICK-START-V3.2.pdf and out/COMPOSER-OS-CREATIVE-COMPOSITION-HANDBOOK-V3.2.pdf with --pdf-standard ua-1.
5. VALIDATE. python3 validate.py: veraPDF PDF/UA-1; Back-to-Contents link on every page incl. cover; outline vs headings; zero unresolved internal links; glossary/index links; external links HTTP status; fonts embedded; text extractable per page; alt text present; every software step badged and mapped to the register; pitch tests; contact-sheet renders of every page, then inspect them and fix clipping, overflow, broken glyphs or orphaned headings.
6. REPORT and STOP. Report: actual page counts for both PDFs, counts of worked examples/scenarios/recipes, number of ✓/?/✎ steps, every ? item with its reason, link-check results, veraPDF result, any missing notation figures, BHL-folder hash proof, and commit SHA. Do not start any further phase.
```

AIMS
- Two finished, navigable, accessible PDFs plus editable source
- Every software claim backed by the capability register
- Notation from Sibelius, with BHL material cross-referenced, not copied
- Actual page counts and validation results reported, then stop

## Appendix A. Sample page source

Self-contained layout references. Save `base.css` and `gen.py` in one folder and run `python3 gen.py` to produce `p1-quickstart-a-dorian.html`, `p2-recipe-sparse-duo.html` and `p3-hexatonic-quartet.html`. Each is an A4 page. UI labels in these mockups are provisional until the capability register confirms them.

### base.css

```css
@page{size:A4;margin:0}
:root{--ink:#1a1a1a;--muted:#5a5a5a;--rule:#cfcfcf;--paper:#fff;--qs:#0072B2;--hb:#D55E00;--ok:#009E73;--verify:#E69F00;--manual:#CC79A7;--tint:#f3f6f9;
--serif:"Source Serif 4",Georgia,"Times New Roman",serif;--sans:"Source Sans 3","Helvetica Neue",Arial,sans-serif;--mono:"JetBrains Mono",Menlo,monospace}
*{box-sizing:border-box}
html,body{margin:0;background:#888}
.page{width:210mm;height:297mm;background:var(--paper);margin:0 auto;position:relative;overflow:hidden;color:var(--ink);font-family:var(--serif);font-size:10.5pt;line-height:15pt}
.inner{position:absolute;left:20mm;right:18mm;top:20mm;bottom:22mm;display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm;align-content:start;row-gap:4mm}
.hdr{position:absolute;left:20mm;right:18mm;top:9mm;display:flex;justify-content:space-between;font-family:var(--sans);font-size:8pt;color:var(--muted);border-bottom:.4pt solid var(--rule);padding-bottom:2mm}
.hdr a{color:var(--accent);text-decoration:none;font-weight:600}
.ftr{position:absolute;left:20mm;right:18mm;bottom:9mm;display:flex;justify-content:space-between;font-family:var(--sans);font-size:8pt;color:var(--muted)}
.main{grid-column:1/9}.rail{grid-column:9/13}.full{grid-column:1/13}
.kicker{font-family:var(--sans);font-size:8.5pt;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:0}
h1{font-family:var(--sans);font-weight:700;font-size:22pt;line-height:25pt;margin:1mm 0 0}
.lede{font-size:12pt;line-height:17pt;margin:0;color:#333}
h2{font-family:var(--sans);font-size:11.5pt;margin:0 0 1.5mm;font-weight:700}
p{margin:0 0 2.2mm}
ol.steps{margin:0;padding:0;list-style:none;counter-reset:s}
ol.steps li{counter-increment:s;position:relative;padding-left:9mm;margin-bottom:2.4mm}
ol.steps li::before{content:counter(s);position:absolute;left:0;top:.2mm;width:6mm;height:6mm;border-radius:50%;background:var(--accent);color:#fff;font-family:var(--sans);font-weight:700;font-size:8.5pt;line-height:6mm;text-align:center}
.ui{font-family:var(--sans);font-size:8.6pt;font-weight:600;border:.6pt solid #9a9a9a;border-radius:1.2mm;padding:0 1.3mm;background:#f6f6f6;white-space:nowrap}
.box{border-left:1.2mm solid var(--accent);background:var(--tint);padding:2.5mm 3mm;font-size:9.5pt;line-height:13.5pt}
.box h3{font-family:var(--sans);font-size:9pt;text-transform:uppercase;letter-spacing:.06em;margin:0 0 1mm;color:var(--accent)}
.rail .box{margin-bottom:3mm}
.badge{display:inline-block;font-family:var(--sans);font-size:7.5pt;font-weight:700;border-radius:1mm;padding:.3mm 1.6mm;border:.7pt solid;margin-right:1mm}
.b-ok{color:#00684d;border-color:var(--ok)}.b-ver{color:#8a5a00;border-color:var(--verify)}.b-man{color:#8e3d71;border-color:var(--manual)}
.fig{border:.5pt solid var(--rule);padding:2mm;background:#fff}
.cap{font-family:var(--sans);font-size:8pt;color:var(--muted);margin-top:1.2mm;line-height:10.5pt}
.ph{background:repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4 6px,#ececec 6px,#ececec 12px);display:flex;align-items:center;justify-content:center;font-family:var(--sans);font-size:8.5pt;color:#666;text-align:center}
.meta{display:flex;gap:2mm;flex-wrap:wrap;font-family:var(--sans);font-size:8pt}
.chip{border-radius:3mm;padding:.4mm 2.2mm;background:#eee}
table{border-collapse:collapse;width:100%;font-family:var(--sans);font-size:8.5pt;line-height:11pt}
td,th{border-bottom:.4pt solid var(--rule);padding:1.2mm 1.5mm;text-align:left;vertical-align:top}
th{font-weight:700;background:#f6f6f6}
.xref{color:var(--accent);text-decoration:none;font-family:var(--sans);font-weight:600;font-size:9pt}
.mono{font-family:var(--mono);font-size:8.5pt}
```

### gen.py

```python
import math
def fretboard(w=640,h=190):
    strings=["E","B","G","D","A","E"]  # top = high E
    notes={0:[(5,'1'),(7,'2'),(8,'♭3')],1:[(7,'6'),(8,'♭7'),(10,'1')],2:[(5,'♭3'),(7,'4'),(9,'5')],
           3:[(5,'♭7'),(7,'1'),(9,'2')],4:[(5,'4'),(7,'5'),(9,'6')],5:[(5,'1'),(7,'2'),(8,'♭3')]}
    x0,x1,y0,y1=40,w-20,22,h-34
    frets=list(range(4,11)) # lines at fret boundaries 4..10 -> cells 5..10
    cw=(x1-x0)/6; sg=(y1-y0)/5
    s=[f'<svg viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="A Dorian, fifth position: fretboard diagram">']
    for i,fn in enumerate(range(5,11)):
        if fn in (5,7,9): s.append(f'<circle cx="{x0+cw*(i+.5)}" cy="{(y0+y1)/2}" r="5" fill="#e6e6e6"/>')
    for i in range(7): s.append(f'<line x1="{x0+cw*i}" y1="{y0}" x2="{x0+cw*i}" y2="{y1}" stroke="#777" stroke-width="{1.2}"/>')
    for j in range(6):
        y=y0+sg*j; s.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="#333" stroke-width="{0.8+j*0.25}"/>')
        s.append(f'<text x="{x0-14}" y="{y+4}" font-family="Arial" font-size="11" fill="#555" text-anchor="middle">{strings[j]}</text>')
    for i,fn in enumerate(range(5,11)):
        s.append(f'<text x="{x0+cw*(i+.5)}" y="{h-12}" font-family="Arial" font-size="11" fill="#555" text-anchor="middle">{fn}</text>')
    for j,lst in notes.items():
        y=y0+sg*j
        for fn,lab in lst:
            x=x0+cw*(fn-5+.5)
            if lab=='1': s.append(f'<rect x="{x-11}" y="{y-11}" width="22" height="22" fill="#1a1a1a"/>'); col='#fff'
            elif lab=='6': s.append(f'<polygon points="{x},{y-14} {x+14},{y} {x},{y+14} {x-14},{y}" fill="#D55E00"/>'); col='#fff'
            else: s.append(f'<circle cx="{x}" cy="{y}" r="11" fill="#0072B2"/>'); col='#fff'
            s.append(f'<text x="{x}" y="{y+4}" font-family="Arial" font-weight="700" font-size="10.5" fill="{col}" text-anchor="middle">{lab}</text>')
    s.append('</svg>'); return ''.join(s)

def bracelet(size=200):
    names=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B']
    coll={0,3,4,7,8,11}; cell=[0,3,4,7]
    c=size/2; r=size*0.36
    s=[f'<svg viewBox="0 0 {size} {size}" width="100%" role="img" aria-label="Augmented hexatonic on C as a pitch-class clock; the cell C, E-flat, E, G is joined by lines">']
    s.append(f'<circle cx="{c}" cy="{c}" r="{r}" fill="none" stroke="#ccc"/>')
    pts=[(c+r*math.sin(2*math.pi*k/12), c-r*math.cos(2*math.pi*k/12)) for k in range(12)]
    path=' '.join(f'{pts[k][0]:.1f},{pts[k][1]:.1f}' for k in cell)
    s.append(f'<polyline points="{path}" fill="none" stroke="#D55E00" stroke-width="2.2"/>')
    for k,(x,y) in enumerate(pts):
        if k in coll:
            fill='#D55E00' if k in cell else '#1a1a1a'
            s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="{fill}"/>')
        else: s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="none" stroke="#999"/>')
        lx=c+(r+20)*math.sin(2*math.pi*k/12); ly=c-(r+20)*math.cos(2*math.pi*k/12)
        s.append(f'<text x="{lx:.1f}" y="{ly+4:.1f}" font-family="Arial" font-size="11" text-anchor="middle" fill="{"#1a1a1a" if k in coll else "#999"}">{names[k]}</text>')
    s.append('</svg>'); return ''.join(s)

def staves(labels, height=150, note="Sibelius vector PDF placed here"):
    n=len(labels); w=640; gap=height/(n); s=[f'<svg viewBox="0 0 {w} {height}" width="100%" role="img" aria-label="Placeholder for engraved score excerpt">']
    for i,l in enumerate(labels):
        top=gap*i+gap*0.28
        for k in range(5): s.append(f'<line x1="70" y1="{top+k*6:.1f}" x2="{w-10}" y2="{top+k*6:.1f}" stroke="#bbb" stroke-width="0.8"/>')
        s.append(f'<text x="64" y="{top+16:.1f}" font-family="Arial" font-size="10" text-anchor="end" fill="#555">{l}</text>')
    for bx in (70,210,350,490,w-10): s.append(f'<line x1="{bx}" y1="{gap*0.28:.1f}" x2="{bx}" y2="{gap*(n-1)+gap*0.28+24:.1f}" stroke="#bbb"/>')
    s.append(f'<rect x="200" y="{height/2-11}" width="300" height="22" fill="#fff" stroke="#999" stroke-dasharray="3 2"/><text x="350" y="{height/2+4}" font-family="Arial" font-size="10.5" text-anchor="middle" fill="#555">{note}</text></svg>')
    return ''.join(s)

head=lambda title,accent:f'<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>{title}</title><link rel="stylesheet" href="base.css"><style>:root{{--accent:{accent}}}</style></head><body>'

# ---------- Page 1: Quick Start A Dorian
p1=head("Quick Start — A Dorian","#0072B2")+f'''
<div class="page" id="p1">
<div class="hdr"><span>Composer OS Quick Start · 3 Hear a scale, see it, play it</span><a href="#contents">↩ Contents</a></div>
<div class="inner">
 <div class="full"><p class="kicker">Worked example QS-07 · 10 minutes · Beginner</p>
 <h1>Discover, hear and practise A&nbsp;Dorian</h1>
 <p class="lede" style="margin-top:2mm">Dorian is a minor scale with a raised sixth. That one bright note, F♯ in A&nbsp;Dorian, is what gives tunes like Miles Davis’s “So What” their cool, open minor sound rather than a sad one.</p></div>
 <div class="main">
  <h2>Do this</h2>
  <ol class="steps">
   <li>Open <span class="ui">Practice &amp; Scales Studio</span>. A Dorian is already selected. This is the default since V3.2.</li>
   <li>Press <span class="ui">Play scale</span>. Listen once up and once down. Then turn on the drone and play it again.</li>
   <li>Look at the fretboard. Find the squares (the root, A) and the orange diamonds (F♯, the sixth).</li>
   <li>Play the fifth-position shape below slowly, saying the interval numbers aloud.</li>
   <li>Choose <span class="ui">Scale pathways</span>, level <span class="ui">Beginner</span>, then make an exercise and loop it at 70&nbsp;bpm.</li>
  </ol>
  <div class="fig" style="margin-top:2mm">{fretboard()}
   <div class="cap"><b>Figure 3.4</b> A Dorian, fifth position. ■ root (A) · ◆ characteristic sixth (F♯) · ● other scale tones. Numbers are intervals above A.</div></div>
 </div>
 <div class="rail">
  <div class="box"><h3>Listen for</h3>The F♯ against the drone. Sing the line A–C–E–F♯: minor triad, then the bright sixth.</div>
  <div class="box"><h3>Why it’s useful</h3>The same seven notes as G major, but A is home. Hearing that shift is the first step towards using modes on purpose.</div>
  <div class="box" style="--accent:#009E73;border-color:#009E73"><h3>Try this</h3>Make two exercises with <span class="ui">Make another</span>. Keep the one whose phrase ends on F♯ and play it over the drone.</div>
  <div style="font-family:var(--sans);font-size:8pt;line-height:12pt"><b>Next</b><br>
   <a class="xref" href="#qs08">→ QS-08 Export your exercise</a><br>
   <a class="xref" href="#hb-3-4">→ Handbook 3.4 Modal brightness</a></div>
  <p style="margin-top:3mm"><span class="badge b-ok">✓ Verified</span><span class="cap">Filled in from the capability register at build time.</span></p>
 </div>
 <div class="full fig ph" style="height:62mm">Screenshot 3.5: Practice &amp; Scales Studio, Scale bar and fretboard.<br>1600 px wide, cropped to the panel, 2 numbered callouts.</div>
</div>
<div class="ftr"><span>Composer OS V3.2 · Quick Start</span><span>17</span></div>
</div></body></html>'''

# ---------- Page 2: Recipe duo
p2=head("Recipe — Sparse duo with BHL","#D55E00")+f'''
<div class="page">
<div class="hdr"><span>Handbook · Part III Cross-engine recipes · R-01</span><a href="#contents">↩ Contents</a></div>
<div class="inner">
 <div class="full" style="border-top:2.2mm solid var(--accent);padding-top:3mm">
  <p class="kicker">Recipe R-01 · Guitar and upright bass</p>
  <h1>A sparse duo that breathes</h1>
  <div class="meta" style="margin-top:2.5mm"><span class="chip">Generate: Guitar–Bass Duo (Single-Line)</span><span class="chip">BHL</span><span class="chip">Practice &amp; Scales Studio</span><span class="chip">Intermediate</span><span class="chip">45 min</span>
   <span class="badge b-ok">✓ Generate, BHL import, MusicXML</span><span class="badge b-ver">? Practice → BHL hand-off</span></div>
 </div>
 <div class="main">
  <h2>Musical goal</h2><p>A 16-bar duo where the bass speaks first, the guitar answers in dyads, and silence is part of the line. Its harmony is two major triads a whole tone apart that share no notes.</p>
  <h2>Starting material</h2><p>A single-line duo from Generate (16 bars, 4/4), saved as MusicXML. Harmony: world A, triad pairs. For example C major + D major, whose notes together make the hexatonic C D E F♯ G A.</p>
  <h2>Procedure</h2>
  <ol class="steps">
   <li>Generate <span class="ui">Guitar–Bass Duo (Single-Line)</span>. Keep the bass if it already moves well.</li>
   <li>In <span class="ui">BHL</span>, import the file, lock the bass, and choose world <span class="ui">A Triad Pairs</span>. See BHL Handbook scenarios 5 and 52.</li>
   <li>Apply sparse dyads and leave the last beat empty (BHL scenarios 47 and 48).</li>
   <li>Make three candidates and compare them as a pair. Keep one. Refine without losing the parent.</li>
   <li>Export the MusicXML and engrave it. Practise the guitar part in the Studio using the hexatonic.</li>
  </ol>
 </div>
 <div class="rail">
  <div class="box"><h3>Why it’s interesting</h3>The two triads share no notes, so every move between them is audible without any chromatic notes. The bass holds the ground and the guitar changes the light.</div>
  <div class="box"><h3>Listen for</h3>Bar 8: the empty last beat makes the bass’s next entry feel like a reply.</div>
  <div class="box" style="--accent:#CC79A7;border-color:#CC79A7"><h3>✎ Manual step</h3>Dynamics, articulations and the final fermata are added in Sibelius. BHL does not produce them.</div>
 </div>
 <div class="full fig">{staves(["Gtr.","Bass"],110,"Fig. R-01a · bars 1–8 · Sibelius vector PDF")}
  <div class="cap"><b>Figure R-01a</b> The bass states the cell (bars 1–2). The guitar answers in dyads from the D-major triad (bar 3). Annotations: ① shared rest ② world contrast ③ cadence-free ending.</div></div>
 <div class="main"><h2>Variations</h2><p>Swap to world F (unrelated major triads a minor third apart) for a darker contrast. Or put a rest inside the cell (BHL scenario 41).</p></div>
 <div class="rail" style="font-family:var(--sans);font-size:8pt;line-height:12pt"><b>Develop further</b><br><a class="xref" href="#r12">→ R-12 Duo into chamber trio</a><br><a class="xref" href="#ch12">→ Ch. 12 Guitar and upright bass</a></div>
</div>
<div class="ftr"><span>Composer OS V3.2 · Complete Creative Composition Handbook</span><span>112</span></div>
</div></body></html>'''

# ---------- Page 3: Hexatonic -> quartet
p3=head("Handbook — Hexatonic cell to quartet","#D55E00")+f'''
<div class="page">
<div class="hdr"><span>Handbook · Ch. 14 Strings and chamber music · S-14.4</span><a href="#contents">↩ Contents</a></div>
<div class="inner">
 <div class="full"><p class="kicker">Scenario S-14.4 · Advanced · Hexatonic + String Quartet + manual voicing</p>
 <h1>One hexatonic cell, four independent voices</h1>
 <p class="lede" style="margin-top:2mm">Four notes from the augmented hexatonic, C–E♭–E–G, are enough for a whole quartet texture. The collection maps onto itself when transposed by a major third, and the cell maps onto itself when inverted, so every line stays inside the same sound.</p></div>
 <div class="grid-sub full" style="display:grid;grid-template-columns:repeat(12,1fr);column-gap:4mm">
  <div style="grid-column:1/5" class="fig">{bracelet()}<div class="cap"><b>Figure 14.7</b> Augmented hexatonic on C (Ian Ring 2457). The joined dots are the cell, Forte 4-17.</div></div>
  <div style="grid-column:5/13">
   <h2>The four voices</h2>
   <table><tr><th>Voice</th><th>Technique</th><th>Pitches</th><th>Source</th></tr>
   <tr><td>Violin I</td><td>Cell as melody, rhythm from Hexatonic export</td><td>C5 E♭5 E5 G5</td><td><span class="badge b-ok">✓ Hexatonic</span></td></tr>
   <tr><td>Violin II</td><td>Cell transposed up a major third, delayed by one beat</td><td>E5 G5 G♯5 B5</td><td><span class="badge b-man">✎ Manual</span></td></tr>
   <tr><td>Viola</td><td>Mirror of the cell about E♭/E</td><td>G4 E4 E♭4 C4</td><td><span class="badge b-man">✎ Manual</span></td></tr>
   <tr><td>Cello</td><td>Slow roots of the augmented triad</td><td>C3 – A♭2 – E2</td><td><span class="badge b-man">✎ Manual</span></td></tr></table>
   <p class="cap" style="margin-top:2mm">Check: every pitch above belongs to {{C, E♭, E, G, G♯/A♭, B}}. A test in the build script confirms this.</p>
  </div>
 </div>
 <div class="main">
  <h2>Procedure</h2>
  <ol class="steps">
   <li>In <span class="ui">Hexatonic</span>, choose the augmented collection and export a short melodic cell as MusicXML.</li>
   <li>Optional: in Generate, make a <span class="ui">String Quartet</span> draft using chord symbols C, A♭ and E for a harmonic reference.</li>
   <li>In Sibelius, write the four voices from the table. Stagger the entries by one beat so the lines stay independent.</li>
   <li>Review the result in Evaluation as a human listening note. It is not an approval.</li>
  </ol>
 </div>
 <div class="rail">
  <div class="box"><h3>Why it works</h3>A transposition by a major third maps the collection onto itself, so imitation never leaves the sound. The cell contains both thirds of C, so major and minor sound together.</div>
  <div class="box" style="--accent:#E69F00;border-color:#E69F00"><h3>? Verify</h3>Whether the String Quartet preset accepts this chord input unchanged. If not, keep the draft manual.</div>
 </div>
 <div class="full fig">{staves(["Vn. I","Vn. II","Va.","Vc."],150,"Fig. 14.8 · four-voice texture · Sibelius vector PDF")}
  <div class="cap"><b>Figure 14.8</b> Bars 1–4. Annotations sit above the staff in the margin rail colour: T4 (transposition by a major third), I (mirror), entry offsets in beats.</div></div>
</div>
<div class="ftr"><span>Composer OS V3.2 · Complete Creative Composition Handbook</span><span>143</span></div>
</div></body></html>'''
for n,c in [("p1-quickstart-a-dorian.html",p1),("p2-recipe-sparse-duo.html",p2),("p3-hexatonic-quartet.html",p3)]:
    open(n,"w").write(c)
print("ok")
```
