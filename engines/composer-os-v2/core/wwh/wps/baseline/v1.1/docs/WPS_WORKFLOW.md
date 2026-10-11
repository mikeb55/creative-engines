# WWH Performance Synthesis V1.1

WPS is a repeatable composition-support and verification workflow. It checks a duo performance score against its leadsheet and a song-specific plan.

**WPS does not generate musical notes.** It does not compose, it does not splice arrangements into a score, and it does not write MusicXML. Musical synthesis is done by a compositional agent. After that agent writes a file, WPS verifies it.

Command, from the repo root:

```bash
npm run wps --prefix engines/composer-os-v2 -- --spec core/wwh/wps/specs/07-impossible-metaphysics.json
```

The Impossible Metaphysics spec resolves **Performance Edition V1.3** (`performanceEditionId`: `V1.3`). An older performance filename fails the run.

Copy a spec in `engines/composer-os-v2/core/wwh/wps/specs/` for the next song. The checker is the same for every song. Change the paths, the motif, the landmarks, the narrative, the seams, the silences, the rehearsal bars, the bar count, and the tempo plan. Leave the narrative as long or as short as that song is.

Configured, performance check not yet named:

- `03-the-mirror.json` — The Mirror, leadsheet V1.0. The file is 68 bars. A planning run fails the shared duration/type audit: guitar bar 39 has two dotted halves whose stored duration is 512, while divisions 256 expects 768. The leadsheet was not edited. Orbit and Wrong Turning do not have that audit failure.
- `05-orbit-v2.1.json` — Orbit, leadsheet V2.1, 29 bars of 3/4. Planning run resolves the leadsheet.
- `06-wrong-turning.json` — Wrong Turning, leadsheet V1.2, 32 bars. Planning run resolves the leadsheet.

Their musical narratives are not frozen. A planning pass is not a finished performance.

Authority for the checks, not restated here as a second scoring system:

- GCE math and hard gates: `docs/GCE_FRAMEWORK_V2.md`
- LOCK and one DCR pass: `docs/GCE_LOCK_DCR_STANDARDS.md`
- Qualitative evidence, including the WWH 65/20/40 listening heuristic: `docs/GCE_FRAMEWORK_V3.md`
- MORPH method and the guitar-solver contract: `docs/MORPH_FRAMEWORK_V0.3.md`

## 1. Source ingestion and LOCK

The spec names the authoritative leadsheet. WPS reads it with `importWwhDuoMusicXml` and audits durations with `auditWwhMusicXml`. A missing or unreadable file fails the run. It does not create a substitute.

When a performance edition is named, the filename must contain `performanceEditionId`. The bass event stream, the metre map, the rehearsal marks, the bar count, and the protected guitar silences are compared with the leadsheet and the spec. A bass difference fails the run. That is strict bass LOCK for the principal score.

## 2. MCI — Musical Continuity & Innovation

`mci.continuity` says what a listener must still be able to follow. `mci.innovation` says what is new, and where. Both are song-specific sentences in the spec. WPS prints them. It does not turn them into a numeric score, and it does not force every song into the same sections.

## 3. CBV — Controlled Bass Variation

`cbv` may list reversible bass-change proposals. `incorporated` stays `false`. WPS prints the proposals and does not write them.

A decision of `no-change` carries an empty list. Impossible Metaphysics V1.3 is `no-change`: no bass alternative is recommended.

The principal performance score still has to match the leadsheet bass event stream. A proposal never relaxes that lock.

## 4. Radical WWH 65/20/40

The starting listening heuristic is about 65% recognisable melodic identity, 20% harmonic identity, and 40% rhythmic identity. It is not a note-count quota and not a hard gate. Do not transform melody, harmony, and rhythm at the same moment.

`radicalProfile` records the mix for that song. Another song may change the three numbers in its own spec.

## 5. Selective synthesis from A–H

Up to eight arrangement files are read. The report gives bar count, guitar attack count, and the first and last guitar attack. `arrangementIds` must match the list when the spec sets it. Impossible Metaphysics expects A, B, C, D, E-V3.0, F, G, H.

`selectiveSynthesis` stays `true`. The notes are inventoried. They are not copied into the performance file. A missing or unreadable arrangement fails the run.

## 6. Song-specific musical narrative

The narrative, motif, landmarks, and seams come from the spec. They are printed so the compositional agent has a plan. A song with four sections stays four sections.

## 7. Guitar idiom and feasibility

Sounding guitar pitches, after `octave-change`, go through `solveFretPath` and `assessGuitarFeasibility` at fret span 4. The bass is not part of that calculation. A solver pass is not a player’s approval.

## 8. Canonical GCE evidence and one DCR refinement

`evaluateGce` scores a Composer OS `ScoreModel`. A hand-authored WWH MusicXML file is not that object. WPS reports **NO OFFICIAL NUMERIC GCE** and does not run `runDcrProtocol`.

The spec records the one refinement the compositional agent already made (`gce.dcrRefinements`: `1` when a performance edition is checked). A second refinement fails the performance check. Planning specs use `0` until that pass exists. Record the weakest musical dimension in the song’s own spec. Do not invent a GCE number.

## 9. Duration and export

WPS does not write a score. The performance path in the spec is the export. Playback `<sound tempo>` must match the spec’s tempo plan, sit inside the target window, and finish in under five minutes.

No audio, MIDI, TAB, or PDF is part of this procedure.

## Failure

Missing leadsheet, missing performance file, missing arrangement, unreadable MusicXML, a bass stream that differs from the leadsheet, or a performance filename that is not the named edition: the run prints `FAIL` and exits `1`. Source files are not repaired and not replaced.
