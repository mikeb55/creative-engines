#!/usr/bin/env python3
"""Emit the V3.2 Creative Composition Handbook Typst source."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent / "main.typ"

SPECIAL = set("#@$<>*_`\\[]")


def esc(text: str) -> str:
    return "".join("\\" + ch if ch in SPECIAL else ch for ch in text)


def S(
    sid: str,
    title: str,
    level: str,
    marks: str,
    goal: str,
    material: str,
    steps: tuple[str, ...],
    result: str,
    vary: str,
    why: str,
    exercise: str,
    bhl: str = "",
    further: str = "",
    engines: str = "",
) -> dict:
    return dict(
        sid=sid,
        title=title,
        level=level,
        marks=marks,
        goal=goal,
        material=material,
        steps=steps,
        result=result,
        vary=vary,
        why=why,
        exercise=exercise,
        bhl=bhl,
        further=further or "Read the related scenario in another chapter before you add a second engine.",
        engines=engines,
    )


# marks: ok, verify, manual, or combinations separated by +
CRAFT: list[tuple[str, str, list[dict]]] = []


def chapter(num: str, title: str, question: str, essay: str, rows: list[dict]) -> None:
    CRAFT.append((num, title, question, essay, rows))


def ui_steps(lines: tuple[str, ...]) -> str:
    bits = []
    for n, line in enumerate(lines, start=1):
        bits.append(f"#strong[{n}.] {line}\\")
    return "\n".join(bits)


def render_scenario(row: dict, nxt: str | None) -> str:
    if row["sid"].startswith("R-"):
        label = "r-" + row["sid"][2:]
    else:
        label = "s-" + row["sid"].replace(".", "-")
    badges = []
    for mark in row["marks"].split("+"):
        badges.append(f'#badge("{mark}")')
    bhl = f" Cross-read BHL {esc(row['bhl'])}." if row["bhl"] else ""
    related = ""
    if nxt and nxt.startswith("s-"):
        shown = nxt[2:].replace("-", ".", 1)
        related = f"#link(<{nxt}>)[Related {esc(shown)}]"
    elif nxt and nxt.startswith("r-"):
        related = f"#link(<{nxt}>)[Related {esc(nxt.replace('r-', 'R-'))}]"
    return f"""
#pagebreak()
#kicker[{esc(row['level'])} · Scenario {esc(row['sid'])}]
#heading(level: 3)[{esc(row['sid'])} {esc(row['title'])}] <{label}>
#duo[
*Fast lane.* {esc(row['goal'])}

*Musical goal.* {esc(row['goal'])}

*Starting material.* {esc(row['material'])}

*Engine selection.* {esc(row['engines'])}{bhl}

*Exact procedure.*

{ui_steps(row['steps'])}

*Musical result.* {esc(row['result'])}

*Variations.* {esc(row['vary'])}

*Further development.* {esc(row['further'])}
][
#callout[Why it is interesting][{esc(row['why'])}]
#v(2mm)
{' '.join(badges)}
#v(2mm)
#callout[Exercise][{esc(row['exercise'])}]
#v(2mm)
{related}
]
"""


def build_rows() -> None:
    U = "#ui"
    chapter(
        "4",
        "Melodic invention and transformation",
        "How does a three-note idea stay itself after you bend it?",
        "A motif is a sound you can recognise, not a bar you must repeat. These scenarios keep one cell and change contour, pitch field, speed, or register. BHL already teaches several of the transforms. This chapter points at those scenarios and adds the Studio and the Martino preset where they are the better tool.",
        [
            S("4.1", "One motif, four contours", "Intermediate", "ok",
              "Keep three notes and draw them four ways: rising, falling, wedge, and flat.",
              "A three-note cell you can sing, exported as MusicXML from a short duo or written by hand.",
              (f"State the cell once in {U}[Guitar/Bass Duo] or on paper.",
               "Copy it up, then down, then as a wedge that opens and closes, then as a repeated pitch.",
               "Follow BHL s34 for the guitar-side transforms if the bass is already locked.",
               "Stop when a listener can still sing the first three notes."),
              "Four shapes, one identity. The rhythm can stay.",
              "Change only the last note of contour three.",
              "The ear binds notes by shape more reliably than by bar number.",
              "Sing the four contours before you look at the page.",
              bhl="s34", engines="Generate preset Guitar/Bass Duo, then BHL if the bass should stay.",
              further="Take the winning contour into 4.3."),
            S("4.2", "Keep the rhythm, change the pitch field", "Intermediate", "ok",
              "The durations stay. The pitch collection changes.",
              "One bar of rhythm you like, plus a second scale in the Studio.",
              (f"Notate or generate the rhythm.",
               f"In {U}[Practice & Scales Studio], choose a new scale and press {U}[Play Scale].",
               "Map the old rhythm onto the new scale degrees. Do not add notes.",
               "BHL s35 is the same idea inside a locked bass."),
              "A familiar gait in a new light.",
              "Move only the last pitch by one scale step.",
              "Rhythm is the memory. Pitch is the colour.",
              "Clap the rhythm, then play it on the new scale.",
              bhl="s35", engines="Practice and Scales Studio, or BHL s35."),
            S("4.3", "Augment and diminish a hook", "Intermediate", "ok",
              "Double the note values, then halve them, without rewriting the intervals.",
              "A one-bar hook.",
              ("Write the hook in crotchets.",
               "Augment it to minims. BHL s37 if you are already in BHL.",
               "Diminish the original to quavers. BHL s38.",
               "Place the long form at the cadence and the short form at the start."),
              "The same intervals at two speeds.",
              "Augment only the first half.",
              "Speed changes weight. The tune does not have to change pitch.",
              "Play the long form, then the short form, as a pair.",
              bhl="s37 and s38", engines="Your notation program, or BHL s37 and s38."),
            S("4.4", "The inverted motto in a new register", "Intermediate", "ok",
              "Turn the motif upside down and move it an octave.",
              "The cell from 4.1.",
              ("Invert the intervals. Up a third becomes down a third.",
               "Put the inversion an octave away from the original.",
               "BHL s43 covers invert-and-lift with the bass locked.",
               "Keep one note in common with the original register so the ear can join them."),
              "A reply that is the same shape in a mirror.",
              "Invert only the last two notes.",
              "Register makes the mirror feel like a second voice.",
              "Play original then inversion without looking.",
              bhl="s43", engines="BHL s43, or by hand in the notation program."),
            S("4.5", "A melodic-cell exercise as a theme", "Beginner", "ok",
              "Let a Studio exercise become the theme, not a warm-up you discard.",
              "Family Melodic cells, difficulty Intermediate, 4 bars, seed written down.",
              (f"In the Studio choose {U}[Melodic cells] and {U}[Intermediate].",
               f"Press {U}[Generate]. Write down the seed.",
               f"Press {U}[Export MusicXML].",
               "Use that file as the theme. Do not generate another until you have played this one."),
              "A theme whose intervals already survived the exercise generator.",
              f"Press {U}[Generate another] only after you can sing the first one.",
              "A practised cell is already a motif.",
              "Loop it at the exercise tempo, then half that tempo.",
              engines="Practice and Scales Studio."),
            S("4.6", "Martino Linear as a long melody", "Advanced", "ok",
              "Use the Martino Linear preset as a long line, then cut it down to a singable theme.",
              "Preset Martino Linear.",
              (f"On {U}[Generate], choose {U}[Martino Linear].",
               "Generate and open the MusicXML.",
               "Circle four bars you can sing. Delete nothing yet.",
               "That four-bar slice is the theme. The rest is reserve material."),
              "A long line with one memorable slice.",
              "Transpose the slice up a fourth by hand and see if it still sings.",
              "Length is not a melody. A slice you can remember is.",
              "Sing the slice from memory the next day.",
              engines="Generate preset Martino Linear. Cutting the line is manual."),
            S("4.7", "Melody from an unnamed scale formula", "Advanced", "ok+manual",
              "Build a tune from a formula that has no traditional name.",
              "Advanced Set Theory in the Studio, one mask you choose.",
              (f"Search the mask or the pitch classes. Press {U}[Play Scale].",
               "Write eight notes using only those pitch classes.",
               "If validation on an exercise reports an error, do not treat that exercise as the tune.",
               "Name the set in your notebook yourself. The app will not invent a title."),
              "A melody whose only rule is membership of the set.",
              "Allow one outside note and mark it.",
              "A formula is a fence, not a style.",
              "Play the eight notes over a single held root.",
              engines="Practice and Scales Studio. The tune itself is manual."),
        ],
    )

    chapter(
        "5",
        "Riffs and hooks",
        "What makes four bars want to start again?",
        "A riff is a loop with a reason to return. A hook is the same idea asked to survive a song section. The Riff Generator makes the short file. BHL and the Studio change its colour. They do not replace the decision to stop at four bars.",
        [
            S("5.1", "Four-bar loop with a turnaround", "Beginner", "ok",
              "A four-bar riff whose last bar leans back into the first.",
              "Preset Riff Generator, or the RiffGen route.",
              (f"Choose {U}[Riff Generator]. Keep the result inside four bars.",
               "Loop it in your notation program.",
               "If the fourth bar does not lead to the first, change the last chord or the last pitch by hand.",
               "Do not add a fifth bar."),
              "A loop you can enter without a count-off once you know it.",
              "Move the turnaround chord to bar 2 and hear the loop weaken.",
              "The return is the composition.",
              "Record yourself looping it eight times. Mark the bar where you drift.",
              engines="Riff Generator. The turnaround edit is manual if the export has no cadence."),
            S("5.2", "Riff into BHL, pitches from the world", "Intermediate", "ok",
              "Keep the riff rhythm. Take the pitches from a BHL world.",
              "The four-bar riff, bass locked if you import it.",
              ("Import only if BHL accepts the file. BHL s33 is the rhythm case.",
               "Lock the bass. Choose one world.",
               "Let the guitar pitches come from that world. Do not keep the old melody out of habit.",
               "Do not send the BHL file back into the Riff Engine."),
              "Same kick, new pitch field.",
              "Try world E, pentatonic harmony, if the riff was diatonic.",
              "The body remembers the rhythm while the ear accepts new notes.",
              "Clap the riff, then play only the new pitches.",
              bhl="s33", engines="Riff Generator, then BHL s33."),
            S("5.3", "Riff rhythm, pentatonic colour", "Intermediate", "ok",
              "Hang the riff’s rhythm on one pentatonic card.",
              "A rhythm from 5.1 and one colour on the Pentatonic page.",
              (f"On {U}[Pentatonic], press {U}[Use for path transform and phrase generation] on Minor Pentatonic or Kumoi.",
               "Write the riff rhythm using only that spelling.",
               f"Optional: {U}[Practice this collection] and generate a rhythmic study in the Studio.",
               "Loop four bars."),
              "A riff that cannot leave the five notes.",
              "Swap Kumoi for Hirajoshi and keep every duration.",
              "Five notes make the loop easier to hear and harder to clutter.",
              "Play it with a metronome click that is not written into the score.",
              engines="Pentatonic page and, if you want an exercise, the Studio."),
            S("5.4", "One-note-away riff variants", "Intermediate", "ok+manual",
              "Change one note and keep three riffs that still loop.",
              "The four-bar riff.",
              ("Copy the riff twice.",
               "Change one pitch in bar 2 on the first copy.",
               "Change one pitch in bar 4 on the second copy.",
               "Discard any copy that no longer returns."),
              "A small family, not a new piece.",
              "Change a rest into a note and see the loop get worse.",
              "One note is enough difference if the rhythm holds.",
              "Teach the three versions to your hands in one sitting.",
              engines="Manual editing of a Riff Generator file."),
            S("5.5", "Hook placement in Song Mode sections", "Intermediate", "ok+verify",
              "Put the hook at the start of the chorus section and nowhere else, first.",
              "Preset Song Mode and a four-bar hook.",
              (f"Choose {U}[Song Mode].",
               "Place the hook only in the section you mean to be the chorus.",
               "If you cannot find per-section controls, stop and read the Musician Guide before inventing a slider.",
               "Export and check the hook bars by counting."),
              "A song plan where the hook has an address.",
              "Allow the hook once in the verse, shortened.",
              "Placement is form.",
              "Point at the hook bar without replaying the whole file.",
              engines="Song Mode. Section controls are Verify if they are not on your form."),
            S("5.6", "Riff as bass ostinato under a new melody", "Advanced", "ok+manual",
              "The riff moves to the bass. The guitar sings something slower.",
              "A four-bar riff that already loops.",
              ("Put the riff in the bass, an octave down if range allows.",
               "Write a guitar melody in minims that uses the same pitch classes.",
               "Leave one bar of the guitar empty.",
               "If you use Single-Line Duo, generate a reference and replace the guitar by hand."),
              "A bass hook with a tune above it.",
              "Let the bass rest on bar 4.",
              "The riff can be the accompaniment and still be the idea.",
              "Sing the slow tune while the bass riff plays.",
              engines="Guitar–Bass Duo (Single-Line) as a reference. The new melody is manual."),
        ],
    )
