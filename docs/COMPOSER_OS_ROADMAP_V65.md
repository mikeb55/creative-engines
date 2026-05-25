# Composer OS Roadmap V65

**Status:** closed — V65 closed 2026-05-25.

## Final Baseline

- Baseline entering P6: `6f1b9c51`.
- P6 closeout: this commit.
- Smoke fast: **324/80/0**.
- Smoke full: **489/94/0**.
- Desktop: `desktop:build` passed; `desktop:package-no-bump` passed using `release_p6` output because Cursor held the old `release/win-unpacked/resources/app.asar`; fresh `Composer-OS.exe` and `Composer-OS-Setup.exe` were copied into `apps/composer-os-desktop/release`.
- Icon: executable built from `apps/composer-os-desktop/resources/icon.ico`; extracted EXE palette confirms the violet/blue icon colours.

## P1-P5 Ship Ledger

| Phase | Commit | Status | Scope |
|---|---:|---|---|
| P1 | `501b97f7` | Complete | Song schema wired at generate time; `effectiveContextForBar`, FormMap bridge, per-bar consumers; goldens `80001`, `80002`. |
| P2 | `f8d436c2` | Complete | Per-section tuning, register windows, bass root-follow, Slonimsky `cellSets`, Big Band / String Quartet profile fan-out; goldens `81001`, `81002`, `81003`. |
| P3 | `3982b644` | Complete | MusicXML deep import into imported `Song` / `ImportedSongResult`, chord rails, meter, tempo, rehearsal section markers; golden `82001`; Sibelius QA report. |
| P4 | `48c2df8f` | Complete | Groove Scaffold opt-in drums, percussion MusicXML/MIDI, `GROOVE_*` receipts and diagnostics; goldens `83001`, `83002`. |
| P5 | `6f1b9c51` | Complete | `FZ_DIFF_01` / `FZ_DIFF_02` runtime patches, `frankZappaDiffReceipts`, per-section Zappa density/register behavior, goldens `84001`, `84002`, `84003`. |

## P6 Closeout

- Promoted all V65 off-smoke goldens into `runSmokeTests.ts`.
- Smoke totals moved from **307/73/0** fast and **472/87/0** full to **324/80/0** fast and **489/94/0** full.
- Updated `CLAUDE.md`, `CHANGELOG.md`, and canonical `COMPOSER_OS_ROADMAP.md`.
- Added `docs/V65_HANDOVER.md`.

## V66 Backlog

- Promote remaining **10** `FZ_*` receipt stubs with runtime patches, diagnostics, and goldens.
- Build section editor UI for per-section meter / VRB / tuning / density assignment.
- Add fretboard view for generated guitar material.
- Harden MusicXML import stress and repeat truth across real chart fixtures.
- Follow-up: ContrapuntalLineEngine, `parallelRepair`, and `eraChordNormalizer`.
