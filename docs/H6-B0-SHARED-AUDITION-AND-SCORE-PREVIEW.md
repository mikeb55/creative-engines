# H6-B0 — Shared audition and score preview

Date: 2026-10-16

Baseline: `25fa8f5` on `main`.

## Reused

- `apps/composer-os-app/src/playback/playbackEngine.ts` — one Tone.js `PolySynth` and one Transport. `play` already stops the previous run.
- `apps/composer-os-app/src/playback/musicXmlToPlaybackSequence.ts` — `parseXmlToPlaybackSequence`.
- `apps/composer-os-app/src/playback/auditionFromGenerateResult.ts` and `AuditionDock` — dock Listen / Play / Pause / Stop is unchanged. Pause stays on the dock.
- `@stringsync/vexml` 0.2.3 and `vexflow` 5, already installed. `MartinoScorePanel` still owns the Martino TAB toggle.
- `coreCandidateAuditionMusicXml` for the 12 provisional Core scores.
- BHL candidate objects already carry `xml`. Worlds A–F and phrase generation were not changed.

`stringVoices.ts` is the string-quartet sampler. This package does not use it.

## New

- `apps/composer-os-app/src/score/ScoreAudition.tsx` — MusicXML plus a label. Play, Stop, Replay. Unmount or a new score calls `stop()`. Invalid MusicXML sets a status and does not throw.
- `apps/composer-os-app/src/score/ScorePreview.tsx` — read-only standard notation. `SHOW_TABS` is false. The MusicXML string is passed through. A render error is shown and the notes are not rewritten. Long scores scroll inside a 70vh box.
- `apps/composer-os-app/src/score/playbackSequenceFromMusicXml.ts` — reads a printed `sound tempo` or `per-minute`, then calls the existing parser.
- `apps/composer-os-app/src/score/vexmlFonts.ts` — loads Bravura and Academico, same requirement as the Martino panel.
- `playbackEngine` `PlayOptions.onEnded` — optional. AuditionDock does not pass it.

## Integration

- Hexatonic laboratory: one player and one preview for the selected candidate. The label includes `PROVISIONAL — NOT MUSICALLY APPROVED`. Decision still starts at `UNDECIDED`. Save and open of the review file are unchanged.
- BHL candidates: the selected stored candidate gets the same player and preview. Compare, refine, and the three-file list stay. The label includes `CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED`.

## Tests and what was seen

Automated:

- App vitest: AuditionDock listen/stop, Play/Stop/Replay, score change and unmount cleanup, invalid XML, guitar/bass preview config, 12 Core sequences at tempo 72, three real BHL candidate sequences, laboratory decision stays off KEEP until a human changes it, BHL compare of stored files.
- Existing app tests: hexatonic panel, hexatonic project UI, BHL reload, audition helper.
- Engine: hexatonic H1, H2, H3, H6 catalogue, H6 laboratory, hexatonic projects; pentatonic engine, project persistence, Dev 3.7, collection identity, score import, spelling repair, path; BHL source lock, Core B candidates, evidence, GUI workflow, present, Batch A, Batch B, generation refine, continuation, iteration 2, intent audit, targeted repair.
- `vite build` in `apps/composer-os-app` succeeded.
- `tsc --noEmit` in the app is clean for these files. `src/components/mosaic-import/barryHarrisChordMelodyUi.ts` still reports invalid characters. That file was not part of this change.

Seen in the running Vite page at `http://127.0.0.1:5173/#/hexatonic`:

- C minor / Db minor, decision `UNDECIDED`, status text provisional.
- Electric Guitar and Upright Bass staves, 4/4, quarter = 72, no TAB. Bar 4 is the contrast system.
- Play changed the status to Playing and enabled Stop. Stop returned Ready. The sound itself was not heard in this check.

`#/bhl` showed Worlds A–F and the candidate section. Generate stayed disabled until import. A live candidate render was not clicked, because that path locks the album source. The candidate player is covered by the component test.

Desktop app was not rebuilt.

## Limitations

- One triangle synth. Guitar and bass are not separate instruments.
- One Transport. Starting this player stops AuditionDock, the Martino player, or the pentatonic player.
- The parser schedules each notehead. A tie is not merged into one sustain.
- vexml 0.2.3 draws standard staves. If it cannot draw a feature, the preview shows the error. Notes, rests, voices, and metres are not repaired in the file.
- The H6-A4 engraving step removes the staff words `PROVISIONAL — NOT MUSICALLY APPROVED`. The page label still says it. The work title contains `provisional`.
- No TAB. No Sibelius. No new audio or notation dependency.

## Deferred to H6-B1

- Hexatonic colour integration.
- A separate audition book player.
- Instrument samples, pause on this shared player, and any automatic KEEP.
