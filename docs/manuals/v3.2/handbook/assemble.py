#!/usr/bin/env python3
"""Write handbook/main.typ from the scenario modules."""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import emit
import more
import rest
from emit import esc, render_scenario

OUT = HERE / "main.typ"


def all_rows():
    rows = []
    for num, title, question, essay, items in emit.CRAFT:
        for item in items:
            rows.append(item)
    rows.extend(rest.RECIPES)
    return rows


def label_of(row: dict) -> str:
    if row["sid"].startswith("R-"):
        return "r-" + row["sid"][2:]
    return "s-" + row["sid"].replace(".", "-")


def main() -> None:
    emit.CRAFT.clear()
    rest.RECIPES.clear()
    emit.build_rows()
    more.add()
    rest.add()
    craft_n = sum(len(items) for *_, items in emit.CRAFT)
    print("craft", craft_n, "recipes", len(rest.RECIPES))
    if craft_n != 92 or len(rest.RECIPES) != 30:
        raise SystemExit(f"count mismatch craft={craft_n} recipes={len(rest.RECIPES)}")

    flat = all_rows()
    labels = [label_of(row) for row in flat]
    parts = []
    parts.append("""#import "../shared/template.typ": *

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
""")
    parts.append("#contents-page(3)\n")

    parts.append("""
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

""")

    for num, title, question, essay, items in emit.CRAFT:
        parts.append(f"""
#pagebreak()
#heading(level: 2)[{esc(num)} · {esc(title)}]
#text(size: 12pt)[{esc(question)}]

{esc(essay)}
""")
        # scenarios in this chapter, link to next overall
        for item in items:
            idx = next(i for i, row in enumerate(flat) if row["sid"] == item["sid"])
            nxt = labels[idx + 1] if idx + 1 < len(labels) else None
            block = render_scenario(item, nxt)
            if item["sid"] == "8.2":
                block += """
#figure(
  image("../assets/diagrams/aug-hex-clock.svg", width: 70%, alt: "Pitch-class clock. Filled notes are C, E-flat, E, G, A-flat, and B. A line joins the cell C, E-flat, E, G."),
  caption: [Augmented hexatonic on C, mask 2457. Joined notes are the cell used in scenario 14.4.],
)
"""
            if item["sid"] == "9.1":
                block += """
#figure(
  image("../assets/diagrams/bhl-worlds.svg", width: 100%, alt: "Six tiles for BHL worlds A to F with common-tone and contrast text from the V1.0 handbook."),
  caption: [Worlds A–F as summarised from the BHL V1.0 table.],
)
"""
            if item["sid"] == "14.4":
                block += """
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
"""
            parts.append(block)

    parts.append("""
#pagebreak()
= Part III · Cross-engine recipes
Thirty recipes. Each one says which engines it touches and which steps are manual or still need a check on your machine. A recipe is a path, not a new feature.

== Recipes R-01 to R-30

""")
    for item in rest.RECIPES:
        idx = next(i for i, row in enumerate(flat) if row["sid"] == item["sid"])
        nxt = labels[idx + 1] if idx + 1 < len(labels) else None
        parts.append(render_scenario(item, nxt))

    parts.append("""
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
""")
    OUT.write_text("".join(parts), encoding="utf-8")
    print("wrote", OUT, "chars", OUT.stat().st_size)


if __name__ == "__main__":
    main()
