# Pentatonic Engine in Composer OS

The Pentatonic page is part of Composer OS. Open it from the Pentatonic tab.

Load a MusicXML score. The score itself is not rewritten. Anything you export is a new file.

## Analyse

**Centre** is the harmonic reference the score keeps coming back to. It is a pitch, such as A or C.

**Home** is the pentatonic colour relationships are heard against. It is a five-note collection, such as A Major Pentatonic. Centre and Home are not the same thing. A score can have a centre and still have no settled home.

**Colour** is the pentatonic in use for a stretch of the piece. The path registry is still Major Pentatonic and Minor Pentatonic. A separate colour vocabulary describes other five-note fields. It does not change the path, and it does not force every note inside those five pitches.

**None** means that stretch is not being read as a pentatonic. None is a real path result. It is not a missing file and it is not the same as choosing not to write a phrase.

Regions are listed with their measure ranges. Auto follows that path. Manual lets you pick a registered collection for the next step. Manual does not change the score you loaded.

## Transform a motif

**M-DEG** is the usual method. It keeps the motif’s pentatonic-degree pattern and moves that pattern into the new colour.

**M-NEAR** moves each note into the new pentatonic while changing the pitches as little as possible.

**Pitch change: Yes** means at least one note moved. **Pitch change: No** means the notes were already where that method leaves them. An unchanged result is still a finished transformation. It is not a failed one.

## Generate a phrase

Purpose:

- Motif
- Lyrical answer
- Counterline
- Comping fragment
- No phrase / silence

Activity is Very sparse, Sparse, or Moderate. Sparse is the usual setting. There is no dense setting here.

The phrase is written by Composer OS’s existing phrase tools, then looked at by the existing evaluation. You get at most three candidates, labelled A, B, and C. A higher evaluation score is information. It does not pick the music for you.

**Result: Silence / No phrase** means the choice is to add nothing. That is a musical result. It is not an error, and it is not the same as a None region in the analysis.

## Path and phrase

A path region is one decision. The usual shapes are home, home then colour then home, home then outside then home, a held field, or none.

**Reseat** keeps the same five notes and moves the landing. That is home, then colour, then home, without a new collection.

**Slip** states the cell, moves that colour up or down a semitone, and comes back. **M-DEG** is the usual map. **M-NEAR** is still there when you ask for it.

**Cell lineage** starts from a motif, or from three or four notes of a five-note colour. A straight scale run is refused.

**Tritone pair** is two pentatonics with no notes in common, heard as one field when they keep trading. Black Aura’s opening is that field. One switch is not a pair.

Outside motion wants a ground: a bass pedal, a bass ostinato, a held tone, the motif itself, or an anchor you name. The outside budget is low, moderate, or high. Low is the usual setting. Silence is still a result. None on the path is still a different result.

**Hold-field** keeps the current five-note colour when the chords change and a common tone still belongs to that colour. A new chord is not a new pentatonic. If a chord shares nothing with the colour, the hold stops.

**Quartal comp** is two or three notes from the colour, with a fourth when the colour has one. It does not use all five notes and it does not fill the bar.

**Quartal line** is one fourth from the colour, then a different interval. It is not a chain of fourths. The cell should still be recognisable.

Reset Pentatonic Inputs clears the pentatonic form and the results on this page. It does not rewrite the score you loaded, and it does not clear the rest of Composer OS.

## Form and the duo

The engine can see whether a bar sits in a phrase or a section, and whether that stretch is an opening, a continuation, a development, a climax, a release, an ending, or simply unknown.

It would rather keep one colour through a phrase than change it every bar. A change fits better at a phrase boundary. HOME is not pasted onto every boundary.

Guitar and bass each have a role. Either one can lead. The other can answer, support, share the field, or stay silent. Silence here is a musical choice. It is not the same as a path that declines a pentatonic, and it is not the same as choosing no phrase at all.

A counterline wants its own rhythm and its own register. Sharing a pitch class is not voice-leading.

A slip can keep the same shape one fret higher or lower when that stays in range. A fourth can sit on adjacent strings. The G–B pair is a major third, so it is not that shape. There is still no tablature.

## AUTO COLOR

AUTO COLOR turns a small set of intentions into one restrained plan. It uses the score’s form, the duo roles, the current colour, and the phrase tools that are already there. It does not pick a scale from a sentence, and it does not imitate a player.

You can combine intentions when they do not contradict. Darker and brighter together stay on the current field and say why.

The plan prefers keeping the field, reseating it, or holding it. A new colour is the later choice. Silence, no phrase, and a path that declines a pentatonic stay three different results.

The page shows the intention, the form, the duo, the plan, the resource, the operator, the return, the silence decision, and a short reason.

## Colour, not a cage

The selected pentatonic is a colour field. Notes in the phrase may sit outside those five pitches when the line needs them.

The page shows:

- Selected resource
- Resource notes
- Actual generated notes
- Outside-resource notes

Outside-resource notes are not marked wrong. If every note sits inside the colour, that line reads None.

## Audition and export

Choose a candidate and audition it. Export writes a separate MusicXML file: the new line, with the region’s meter, tempo, and chord. No tablature. The source score stays where it was.
