# Composer OS — Session Status Report

*Television Field Suite preset, packaged-app fixes, and the Generate verification*

## 1. Where things stand

All planned work for this thread is committed and unpushed, on branch `chore/composer-coverage-manifest`, HEAD at `3675febf`, 6 commits ahead of origin.

### Committed & solid

| Feature | Commit | Status |
|---|---|---|
| Television Field Suite Mosaic preset | `ea22d7fa` | Shipped |
| Preset-load UI fix (auto-apply, correct bar count) | `3675febf` | Shipped |
| Art Rock composer + help/tooltip text | `f7563b59` / `6fd570e1` | Shipped |
| Read-only MusicXML per-bar form analyzer | `5e812b66` | Shipped |
| .gitignore / repo hygiene | `306a2245` | Shipped |

### Verified facts

- James Brown engine genuinely re-voices the FormAB recap (VARIED, not replayed) — confirmed across all 6 quintet outputs.
- The packaged-app blank-window crash (`require()` reaching the renderer bundle) is fixed.
- The Mosaic preset-load bug (stale import rows overriding the preset; wrong bar count) is fixed and verified: rows now read Verlaine 1–8 / Marr 9–20 / Fripp 21–28 / Verlaine 29–40, total 40 bars.
- Generate/export was suspected broken; a scripted, non-GUI test proved the real `generateComposition()` path writes valid MusicXML (27,076 bytes, well-formed `<score-partwise>`). The earlier "writes nothing" claim was a Playwright smoke-test artifact that timed out at launch and never reached Generate.

### Quarantined (not lost, just shelved)

All flaky Playwright/automation work (smoke scripts, `.cmd` launchers, `data-testid` edits, Playwright dependency) was uncommitted-only and has been moved to a git stash, not deleted:

- Stash: `stash@{0}` — "wip: playwright smoke harness + testids (flaky)"
- Recover anytime with: `git stash pop stash@{0}`
- Working tree is clean at the solid commits; Mosaic preset test suite passes 13/13.

## 2. Still open

- Confirm the desktop EXE in `release/Composer-OS.exe` is freshly built from current HEAD (it has drifted stale at least twice this session) before trusting any GUI result.
- Run the actual listening test: load Television Field Suite in the GUI, Generate against a ~40-bar melody, and listen for the arc — sparse Verlaine intro → Marr jangle build → audibly denser Fripp peak → thin unresolved Verlaine tail.
- Plan B ("KC Process Suite", using `fripp_king_crimson` and a 5/4 intro) remains parked as a written spec — build only after Plan A's listening test confirms the arc works.
- Roster gap note (`art_rock_roster_gaps_PARKED.md`) flags a shoegaze/wall-of-sound voice as the top future addition, intended as the first test of the archetype/template system once that's built.

## 3. Roadmap (current sequence)

| # | Step | Difficulty |
|---|---|---|
| 1 | Repo hygiene + roster help text + Art Rock smoke test | Easy — done |
| 2 | Art Rock listening pass (quality tuning by ear) | Easy — open |
| 3 | Confirm JB recap is form-aware (FormAB VARIED) | Easy — done |
| 4+5 | Television Field Suite design + build (Plan A) | Medium — built, pending listen |
| 6 | Nolen guitar-2 archetype (JB-only stabs + space) | Hard — not started |
| 7 | Archetype/template system, built off two art-rock voices | Hard — not started |
| 8 | Roster expansion (shoegaze voice first) | Hard — not started |

**Next concrete action: verify the EXE build freshness, then run the Television Field Suite listening test. That's the last gate before this round of work is considered fully proven and ready to push.**
