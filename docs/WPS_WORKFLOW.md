# WWH Performance Synthesis V1.4

WPS is the reusable performance-composition workflow for While We're Here duo pieces. It standardises how a piece is planned, checked, and refined. It does not standardise the music.

**WPS V1.4** adds Bryant style gates. The shared definition is `engines/composer-os-v2/core/wwh/wps/wps-bryant-signature.json`. The checker prints PASS or FAIL and the bar numbers. It does not write the notes. An edition uses at least 4 of the 6 signature devices. An anti-cliché hit fails the gate. HEAD IN, HEAD OUT, and BASS SOLO comping use at least 4 grip types from quartal, cluster-with-2nd, open-string, liquid, triad-over-foreign-bass, and drop-2. SOLO 1 is linear, motivic, and non-functional. SOLO 2 keeps at least 40% of its intervals a 4th or wider, a range of 2 octaves, 2 field collisions, and 4 silent bars. The two solos differ in interval profile, density, and register. Those chorus rules apply when `requiredChoruses` lists the role or the MusicXML names it. A missing required role is `MISSING REQUIRED SECTION`. A role that is neither required nor named is `NOT APPLICABLE` and is left out of `editionOk`. Every radical chorus names one source anchor. 65/20/40 stays a listening guide.

For SOLO 1, SOLO 2, and BASS SOLO comping, generate 4 contrasting candidates per chorus. Use different seeds and different lead devices. Rank them by signature use, anti-cliché result, and solo contrast. Present the top 2. Do not auto-select. Read `engines/composer-os-v2/core/wwh/wps/wps-bryant-preferences.md` before creating candidates for the next tune.

Specs at `wpsVersion` 1.2 and 1.3 still pass the older checks. A spec at 1.4 fails the run when a Bryant gate fails.

**WPS V1.1** is frozen. Snapshot: `engines/composer-os-v2/core/wwh/wps/baseline/v1.1/`. That snapshot passed 12/12 on Impossible Metaphysics Performance Edition V1.3 before V1.2 was written. Do not call the live checker V1.1.

**WPS does not generate musical notes.** A compositional agent writes the guitar music. The WPS command reads the leadsheet, checks the musical blueprint, inventories A–H, checks source LOCK, checks guitar feasibility on a finished score, checks duration, and reports evidence. It does not splice arrangements into a score and it does not write MusicXML.

**V1.3** adds a separate candidate interface. `shellAndTriadCandidates`, `resolutionTensionCandidates`, `liquidHarmonyCandidates`, `reduceShellVersusTriad`, and `proposeWpsVaultPassage` return note-level guitar events from the 16-volume record in `wpsTonalityVaultRecord.ts`. The checker does not call them. A blueprint may record optional guitar-role spans and candidate provenance. There is no chordal quota. Human playability stays `NOT VERIFIED`. The integration note is `docs/WPS_V1.3_TONALITY_VAULT_INTEGRATION.md`. Specs written as `1.2` still pass. The V1.1 snapshot stays frozen.

Command, from the repo root:

```bash
npm run wps --prefix engines/composer-os-v2 -- --spec core/wwh/wps/specs/07-impossible-metaphysics.json
```

Song specs live in `engines/composer-os-v2/core/wwh/wps/specs/`. Copy one file per song. Change the paths, the blueprint, the motif, the landmarks, the narrative, the seams, the silences, the bar count, and the tempo plan. Leave the narrative as long or as short as that song is.

Planning spec, no performance score yet: Orbit V2.1, mapped to `PERFORMANCE-EDITIONS/05-Orbit/`. The Mirror spec resolves Performance Edition V1.1 from `PERFORMANCE-EDITIONS/03-The-Mirror/`. Wrong Turning resolves Performance Edition V1.1 from `PERFORMANCE-EDITIONS/06-Wrong-Turning/`. Impossible Metaphysics V1.3 resolves from `PERFORMANCE-EDITIONS/07-Impossible-Metaphysics/`. The `07-` on that filename is the original leadsheet number. The folder is album track 7.

- `03-the-mirror.json` — The Mirror, leadsheet V1.0, 68 bars of 4/4. Focus: reflection, evolving melodic identity, contrapuntal development, long form. Checked score: Performance Edition V1.1.
- `06-wrong-turning.json` — Wrong Turning, leadsheet V1.2, 32 bars, bar 8 in 3/4. Focus: asymmetrical phrasing, unexpected direction, interrupted expectations. Checked score: Performance Edition V1.1.
- `05-orbit-v2.1.json` — Orbit, leadsheet V2.1, 29 bars of 3/4. Focus: compact cyclical development, harmonic transformation, thematic return.

E is **E-V3.0** (`WWH-Liquid-Harmony-E-V3.0`). E V2.0 is not the E source.

Authority for musical judgement, not restated here as a second scoring system:

- `docs/GCE_CANONICAL.md`
- `docs/GCE_FRAMEWORK_V2.md` — ten categories and hard gates
- `docs/GCE_FRAMEWORK_V3.md` — qualitative evidence, including the WWH 65/20/40 listening heuristic
- `docs/GCE_LOCK_DCR_STANDARDS.md` — LOCK and one DCR pass
- `docs/MORPH_FRAMEWORK_V0.3.md` — method and the guitar-solver contract
- `.cursor/rules/gce-evaluation.mdc`
- `.cursor/rules/composer-os-quality-gates.mdc`

## Two responsibilities

**Compositional agent.** Reads the blueprint and the A–H inventory. Writes one complete performance MusicXML. Applies source LOCK and guitar feasibility while writing. Uses real pitches and rhythms from A–H where they help. Writes original connecting music where the sources do not join. Does not concatenate source bars. Does not lay down an eight-bar template and repeat it.

**WPS pipeline.** Source management, blueprint check, A–H inventory, LOCK, guitar validation, duration, evidence. Validation is not composition. `evaluateGce` is not run on these files. `runDcrProtocol` is not executed. No official numeric GCE is invented.

## Minimum-iteration sequence

### Stage 1 — Discover

Read the authoritative leadsheet and the A–H files. Choose material from what is in the music. Write the song’s blueprint before the complete score. Name likely weaknesses before writing.

The blueprint records:

- Authoritative original leadsheet
- Song-specific melodic fingerprints
- Protected structural landmarks
- Original bass identity
- Strongest passages from the leadsheet and from A–H (a listening rank only after someone has listened)
- The proposed harmonic journey
- Contrapuntal opportunities
- Dramatic climax
- Meaningful thematic return
- Expected performance duration

Do not reuse another song’s narrative. Impossible Metaphysics keeps its own seven stages. The Mirror, Wrong Turning, and Orbit do not.

### Stage 2 — Compose

One complete performance score. Source LOCK and guitar feasibility apply throughout. The upright-bass event stream of the leadsheet is copied exactly.

### Stage 3 — Refine

Judge the score against the ten GCE categories and the V3 evidence requirements. Name the weakest meaningful dimension. Make **one** focused refinement. Check again.

Do not automatically produce V1.2, V1.3, V1.4, and V1.5 of the same piece.

If the score still needs a human ear, label it **CANDIDATE FOR AUDITION**. If a material flaw remains, label it **MUSICAL REVISE**. Do not manufacture a PASS. WPS itself does not assign these labels.

A standard song run delivers:

- One complete initial performance MusicXML
- At most one refined MusicXML
- One short performance map
- One short evidence summary

Another revision needs a named defect or a note from audition.

## 1. Source ingestion and LOCK

The spec names the authoritative leadsheet. WPS reads it with `importWwhDuoMusicXml` and audits it with `auditWwhMusicXml`. A missing or unreadable file fails the run. The original file is not edited.

A chord tone that carries the attack’s type, dots, and tuplet is read at the attack’s duration. Sibelius sometimes stores the undotted duration on those chord tones. The Mirror, bar 39, stores 512 on D5 and Bb5 where divisions 256 and a dotted half expect 768. The attack is already 768. The read uses 768. The file stays 512. Melodic onsets are not moved.

When a performance edition is named, the filename must contain `performanceEditionId`. The bass event stream, the metre map, the rehearsal marks, the bar count, and the protected guitar silences are compared with the leadsheet and the spec. A bass difference fails the run. That is strict bass LOCK.

A performance score with a changed bass is not strict source LOCK PASS.

## 2. Musical blueprint and MCI

`blueprint` is required. `mci.continuity` says what a listener must still be able to follow. `mci.innovation` says what is new, and where. Both are song-specific. WPS prints them. It does not turn them into a number.

## 3. CBV — Controlled Bass Variation

`cbv` may list reversible proposals. Together they may name at most 10% of the source measures. `incorporated` stays `false`. WPS prints the proposals and does not write them.

`no-change` carries an empty list. Impossible Metaphysics V1.3, The Mirror, Wrong Turning, and Orbit V2.1 are `no-change`.

## 4. Radical WWH 65/20/40

The starting listening heuristic is about 65% recognisable melodic identity, 20% harmonic identity, and 40% rhythmic identity. It is not a note-count quota and not a hard gate. Do not transform melody, harmony, and rhythm at the same moment without a recognisable anchor.

`radicalProfile` records the mix for that song.

## 5. Selective synthesis from A–H

Up to eight arrangement files are read. The report gives bar count, guitar attack count, and the first and last guitar attack. `arrangementIds` must match the list when the spec sets it. The notes are inventoried. They are not copied into the performance file. A missing or unreadable arrangement fails the run.

## 6. Guitar idiom and feasibility

On a performance score, sounding guitar pitches, after `octave-change`, go through `solveFretPath` and `assessGuitarFeasibility` at fret span 4. The bass is not part of that calculation. A solver pass is not a player’s approval.

The Mirror and Orbit V2.1 print guitar `octave-change` -1. Wrong Turning prints 0. Written pitch is not sounding pitch when the change is -1.

## 7. Canonical GCE evidence and one DCR refinement

`evaluateGce` scores a Composer OS `ScoreModel`. A hand-authored WWH MusicXML file is not that object. WPS reports **NO OFFICIAL NUMERIC GCE** on every run.

The ten categories and the hard gates in `docs/GCE_FRAMEWORK_V2.md` still govern a compositional judgement. WPS does not calculate them.

`gce.dcrRefinements` is `1` when a performance edition already contains its one refinement, and `0` on a planning spec. A second refinement fails the run. `runDcrProtocol` was not executed.

## 8. Duration and export

WPS does not write a score. The performance path in the spec is the export. Playback `<sound tempo>` must match the tempo plan, sit inside the target window, and finish in under five minutes.

`outputDir` is the album-track folder for that song. `wpsPerformanceOutputDir` in `engines/composer-os-v2/core/wwh/wps/wpsAlbumTracks.ts` chooses it from the spec id and title. A future performance edition is written inside that folder. The two-digit prefix on a MusicXML filename is left as it is and is not the folder name.

Album track order: `01-Black-Aura`, `02-Palace-Gates`, `03-The-Mirror`, `04-Meet-Me-at-Hobos`, `05-Orbit`, `06-Wrong-Turning`, `07-Impossible-Metaphysics`, `08-Small-Testimony`, `09-After-Everything`. There is no Palace Gates reprise. Original leadsheet paths and A–H paths stay on their own numbers.

A leadsheet with a metronome and no `<sound tempo>` is timed from the printed per-minute mark. The report says so. The Mirror and Orbit V2.1 are in that group. Wrong Turning has both, at 120.

No audio, MIDI, TAB, or PDF is part of this procedure.

## Failure

Missing leadsheet, missing performance file, missing arrangement, unreadable MusicXML, a bass stream that differs from the leadsheet, a performance filename that is not the named edition, a blueprint field left empty, a CBV list that is incorporated or covers more than 10% of the bars, or more than one DCR refinement: the run prints `FAIL` and exits `1`. Source files are not repaired and not replaced.
