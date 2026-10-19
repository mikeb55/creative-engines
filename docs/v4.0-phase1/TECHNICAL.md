# V4.0 Phase 1 — source-led symphonic orchestration

This is technical evidence. It is not artistic approval and not a player feasibility review.

## Source

The example uses the existing 24-bar lyrical piano file `docs/v3.5-phase1/lyrical/source.musicxml`. That file was not edited.

## Comparison

- `lyrical-chamber.musicxml` and `lyrical-chamber.mid` are the existing developing chamber arrangement, seed 11, harmonic controls off.
- `lyrical-symphony.musicxml` is the symphonic arrangement of the same source, seed, mode and locks.
- `symphony-midi-set.zip` holds four MIDI files plus `manifest.json`. It is not one full-orchestra MIDI file.
- `comparison.json` records phrase owners, answers, protected-bar `silence`, warnings and the timpani tuning set. `silence` is that protected-bar list. On this lyrical example it is empty. It is not the count of silent orchestral parts.
- The example declares 31 parts and 32 staves. 24 of the 31 parts have no sounding notes. Sounding parts are Flute 1, Clarinet 1, Timpani, orchestral percussion, Harp, Violin I and Double Bass. This is an orchestral infrastructure demonstration, not proof of fully developed symphonic distribution. Greater instrumental participation is a Phase 2 objective.
- The four synchronized MIDI files contain 141 note-ons and 141 note-offs. The MusicXML has 141 sounding attacks. Those counts were taken from the staged files during this documentation pass.
- `lyrical-chamber.musicxml` is byte-identical to `docs/v3.5-phase1/lyrical/lyrical.musicxml`. The V3.5 lyrical fixture was not rewritten.

Foreground on the lyrical example follows phrase function: statements and returns stay with Flute 1, development phrases move to Violin I. Clarinet 1 carries a source-derived answer in two development phrases. The final development phrase does not add an answer. Wind endurance warnings are heuristics, not player approval.

## Flute 1 endurance

Flute 1 uninterrupted phrase lengths are 15, 12, 15 and 15 quarter-note durations. These triggered the heuristic endurance warnings in `comparison.json`. Practical breathing and musical feasibility require musician review. No protected source notes were deleted to force a shorter phrase. No player approval has been granted.

## Notation conventions

- Trumpets 1–3: Trumpet in B-flat. Not C trumpet.
- Trombones 1–3: tenor trombone, concert pitch, bass clef. Not bass trombone.
- Bass clarinet: B-flat, treble clef, sounding a major ninth below. Not bass-clef concert pitch.
- Cor anglais: in F, treble clef.
- Contrabassoon: bass clef, sounds one octave below the written pitch.
- Piccolo: sounds one octave above the written pitch. Range D5–C8 from the Orchestralibrary written D4–C7.
- Timpani: pitched, catalogue D2–C4, one declared tuning set taken from the bass lane. No retune.
- Percussion: one player, bass drum GM 36 and suspended cymbal GM 57. No ride pattern and no roll.
- Harp: catalogue harp, two staves. Not a piano. At most a few support notes, and a conflicting pedal spelling rests.
- Strings: five unison staves. Viola uses the alto clef. No divisi and no double-stops.

## Playback limits

General MIDI has no bass-clarinet or contrabassoon program. Those parts use programs 71 and 70. The web sine preview is not orchestral playback.

## Host checks

MuseScore notation and render are separate from audio listening.

Existing working evidence, inspected in this documentation pass and not produced by a new MuseScore run: `roundtrip.musicxml` records software `MuseScore Studio 4.7.5` and encoding date 2026-10-19. Six page renders exist (`lyrical-symphony-1.png` through `lyrical-symphony-6.png`). Page 1 is a title page, “Piano to symphony”. The round-trip file still has the transpositions (piccolo octave up, cor anglais and horns a perfect fifth down, B-flat clarinets and trumpets a major second down, bass clarinet a major ninth down, contrabassoon and double bass an octave down), the viola alto clef, two harp staves, and percussion mapping (bass drum unpitched 36, suspended cymbal unpitched 57).

Sibelius was not run. Cubase was not run. Artistic listening was not performed. Physical playing was not performed. Audio rendering was not used as musical approval.

## Desktop release

Packaged Composer OS DEV was not updated. Composer OS STABLE was not updated. No desktop application was installed. Browser and source-level validation are separate from installed-app acceptance.

## Approval

Artistic approval remains PENDING. Technical acceptance of the symphonic infrastructure is not artistic approval.
