# V4.0 Phase 3 — expressive orchestration

Technical evidence. Not artistic approval. Player feasibility was not reviewed. The music was not heard.

Expression is `correction.symphonic.expression: "expressive"` and it runs only with `allocation: "phase-2"`. Absent expression, and explicit `legacy`, keep the Phase 2 note pass. `expressive` on Phase 1 allocation is ignored. Chamber stays the default when `ensemble` is absent.

## Examples

Seed 11. Mode developing. Sources were not edited. Allocation stays Phase 2. Expression is the only added pass.

- lyrical: marks 60, hairpins 15, slurs 28, articulations 48, marcato 0, planned velocity levels 29, exported positive note-on velocity levels 28, cc11 42, repeated long patterns 0
- contrapuntal: marks 44, hairpins 8, slurs 25, articulations 31, marcato 0, planned velocity levels 14, exported positive note-on velocity levels 14, cc11 20, repeated long patterns 0
- rhythmic: marks 33, hairpins 4, slurs 12, articulations 217, marcato 2, planned velocity levels 36, exported positive note-on velocity levels 34, cc11 12, repeated long patterns 0

Primary comparison is Phase 2 versus expressive Phase 2 on the same source, review, seed, and allocation. Pitches, durations, and ties match. MusicXML bytes differ where dynamics, hairpins, slurs, and articulations were written. MIDI note-on and note-off ticks match. MIDI velocities differ. CC11 follows a written hairpin, so those hairpins are in the MIDI file. No rubato was written.

## What the expression does

- Each part reads its phrase role: foreground, answer, support, bass, or colour.
- Contour is arch, rising, falling, leap, or static, taken from that part's notes. Tension mixes leap size, short-note density, phrase function, and the ending.
- Dynamics stay inside an instrument range: harp `pp`–`mp`, strings and winds `pp`/`p` through `f` (or `ff` only at high tension), brass and timpani `mp`–`ff`, percussion `mf`–`ff`.
- A hairpin is written only when the line has room and the contour moves. Static pads and harp do not get one. A long phrase does not repeat the previous phrase's pattern.
- A hairpin stays in one part, staff, and voice. Tied notes and chord members stay inside it. A rest in another voice does not end it. At the first gap it stops on the previous note's release, which is the rest's onset when the rest follows at once. That stop does not cross the rest. The written end value is the original dynamic line sampled at the release, not the full change squeezed into the short span. A clipped span under three attacks or under two quarters of onset is omitted. The hairpin is not extended into the next phrase.
- Strings and winds slur a stepwise group and stop at a rest or a leap. Brass slurs only a short legato group. Harp, timpani, and percussion do not slur. A tie is not split.
- Short notes outside a slur take staccato. A slur ending on a longer wind or string note takes tenuto. Brass and strings accent a leap arrival or a phrase-start downbeat. Marcato is one short unslurred brass or timpani peak in a high-tension leap, and the next phrase on that part does not repeat it.
- Note-on velocity follows the written dynamic, and it interpolates across a written hairpin. CC11 carries that same written span. `planned velocity levels` counts distinct attack velocities before export. `exported positive note-on velocity levels` counts distinct MIDI note-ons with velocity above 0. The MIDI writer still scales 1–127 into 1–100. The two counts are not the same measurement. The files were not played back in this run.

Artistic approval: PENDING.

## Acceptance render

MuseScore Studio 4.7.5 at `/Applications/MuseScore 4.app` imported the three expressive MusicXML files. Lyrical import exited 0. Contrapuntal wrote a complete MSCX and then aborted on shutdown (exit 134, mutex). Rhythmic import exited 0. Each MSCX has 31 parts, 32 staves, and 768 measures (32 × 24). Lyrical page 2 shows Flute 1 with a slur, `mp`, a hairpin to `mf`, and `p`. Rhythmic import contains staccato, tenuto, accent, and marcato. This render is not artistic approval. The music was not heard.

## Limitations

- Player feasibility was not reviewed.
- The music was not heard.
- Desktop DEV and STABLE applications were not rebuilt.
- Playback remains four synchronized MIDI files at PPQ 480, plus the set manifest.
