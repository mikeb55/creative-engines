# V65 Handover

## Final Baseline

- Baseline before closeout: `6f1b9c51`.
- Final closeout commit: this P6 closeout commit; use `git log -1 --oneline` after pull to read the immutable hash.
- Fast smoke: **324/80/0**.
- Full smoke: **489/94/0**.
- Desktop build: `npm --prefix apps/composer-os-desktop run desktop:build` passed.
- Desktop package: `npm --prefix apps/composer-os-desktop run desktop:package-no-bump` passed with temporary `release_p6` output because Cursor held the old `release/win-unpacked/resources/app.asar`; fresh `Composer-OS.exe` and `Composer-OS-Setup.exe` were copied into `apps/composer-os-desktop/release`.

## What V65 Built

- **P1:** Song architecture wired at generate time: `Song` -> `FormMap`, cached effective context, density/riff/register consumers, goldens `80001`, `80002`.
- **P2:** Per-section tuning, register windows, bass root-follow, Slonimsky `cellSets`, and ensemble fan-out, goldens `81001`, `81002`, `81003`.
- **P3:** MusicXML deep import into imported `Song` and `ImportedSongResult`, with chord rails, meter, tempo, rehearsal sections, role hints, golden `82001`, and Sibelius QA report.
- **P4:** Groove Scaffold opt-in drums with MusicXML percussion and MIDI channel 10, `GROOVE_*` receipts, diagnostics, goldens `83001`, `83002`.
- **P5:** Frank Zappa differentiator receipts promoted: `FZ_DIFF_01`, `FZ_DIFF_02`, manifest metadata, per-section Zappa density/register behavior, goldens `84001`, `84002`, `84003`.
- **P6:** All V65 goldens promoted into smoke; docs and desktop rebuilt.

## V66 Backlog

- Promote remaining **10** `FZ_*` receipt stubs.
- Build section editor UI.
- Add fretboard view.
- Harden MusicXML import stress and repeat truth.
- Follow up ContrapuntalLineEngine / `parallelRepair` / `eraChordNormalizer`.

## How To Start V66

1. Pull `origin/main`.
2. Run `npm run test:composer-smoke-fast`.
3. Pick one V66 backlog item and create focused goldens before broad smoke promotion.
4. Keep smoke baseline synced in `runSmokeTests.ts`, `CLAUDE.md`, `CHANGELOG.md`, and `COMPOSER_OS_ROADMAP.md` whenever the smoke suite changes.
