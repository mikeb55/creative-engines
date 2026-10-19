# V4.0 Phase 2 — source-led distribution

Technical evidence. Not artistic approval. Player feasibility was not reviewed.

Phase 2 is `correction.symphonic.allocation: "phase-2"`. Absent allocation, and explicit `phase-1`, keep the Phase 1 allocator. Chamber stays the default when `ensemble` is absent.

## Examples

Seed 11. Mode developing. Sources were not edited.

- lyrical: fl1 48, vn1 42, db 20, va 12, vc 4, vn2 4, hp 4, timp 1
- contrapuntal: fl1 36, vn1 36, va 36, cl1 36, vn2 4
- rhythmic: cl1 72, vn2 56, db 17, vn1 36, fl1 28, vc 7, tp1 4, hn1 3, tba 1, timp 1, perc 2

Primary A/B is Phase 1 versus Phase 2 symphonic MusicXML, same source, review, and seed, allocation only. Those files are not byte-identical. That difference is the allocation. Secondary comparison is the developing chamber file already stored under `docs/v3.5-phase1`. Hashes are in each `comparison.json`.

Listening was not performed. MuseScore import is recorded under Acceptance render. That pass does not judge the music.

## What the notes do

- Lyrical, brass off: flute and violin alternate the melody when a wind span reaches six quarters. Violin II has one displaced inner answer. Viola carries inner source tones. Cello carries one phrase of the bass. Harp uses a few source inner pitches. One timpani note uses the declared bass tuning.
- Contrapuntal, brass and percussion off: melody alternates flute and violin. The source countermelody alternates viola and clarinet. One augmented answer sits on violin II. Bar 4 stays empty.
- Rhythmic, brass open: trumpet reinforces a short head, horn colours it, tuba reinforces one bass attack, and percussion has one bass-drum and one cymbal off the bar downbeat. Density drops again in the final phrase.

An independent answer is one line at a time. Exact octave copies are labelled reinforcement and are not that answer.

## Listening questions

These are questions, not findings.

- Does the melody still sound like one line after a wind/string handover?
- Does the inner-string answer feel necessary?
- In the rhythmic example, is the brass weight useful or too heavy?
- Would any added note be clearer as silence?

Artistic approval: PENDING.

## Limitations

- Player feasibility was not reviewed.
- String staves are unison sections. No divisi.
- At most one newly composed independent answer is active at a time.
- No new harp-pedalling system and no new timpani-retuning system. Harp uses source pitches that share one pedal spelling. Timpani uses the declared bass tuning.
- Playback is four synchronized MIDI files, not one conventional full-orchestra MIDI file.
- Desktop DEV and STABLE applications were not rebuilt. The chamber page source can request Phase 2. Packaged apps are unchanged.

## Acceptance render

MuseScore Studio 4.7.5 at `/Applications/MuseScore 4.app` imported the three Phase 2 MusicXML files in isolated temporary directories. Each import wrote a complete MSCX (31 parts, 32 staves, 24 bars) and a PDF. The process then aborted during shutdown (exit 134, mutex). Round-trip pitches, ties, and quarter-lengths matched the source MusicXML after MuseScore rescaled divisions. No duration repair was observed. This render is not artistic approval.
