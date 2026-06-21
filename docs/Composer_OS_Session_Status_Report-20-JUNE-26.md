# Composer OS — Session Status Report

*Television Field Suite preset, packaged-app fixes, and the Generate verification*

## 1. Where things stand

Television Field Suite / Art Rock mosaic work is committed on **`main`**, HEAD **`6f41a5a3`** (origin + backup synced 2026-06-21).

**Diagnosis correction:** An earlier working theory — Song Mode **“Imported harmony MISSING”** on the receipt, or absent harmonic content — was **incorrect**. Failures traced to **golden-path routing / validation profile mapping**, not missing harmony on the TV Suite preset (locked `mosaicSectionPlan` carries harmony).

### Committed & solid

| Feature | Commit | Status |
|---|---|---|
| Television Field Suite Mosaic preset | `ea22d7fa` | Shipped |
| Preset-load UI fix (auto-apply, correct bar count) | `3675febf` | Shipped |
| TV Suite golden-path bar-math (intro / melody-bass routing) | `305f3e15` | Shipped |
| Art Rock mosaic — skip Metheny gate on riff VRB paths (profile-mapping mismatch) | `67c83789` | Shipped |
| Art Rock composer + help/tooltip text | `f7563b59` / `6fd570e1` | Shipped |
| Read-only MusicXML per-bar form analyzer | `5e812b66` | Shipped |
| .gitignore / repo hygiene | `306a2245` | Shipped |

### Verified facts

- James Brown engine genuinely re-voices the FormAB recap (VARIED, not replayed) — confirmed across all 6 quintet outputs.
- The packaged-app blank-window crash (`require()` reaching the renderer bundle) is fixed.
- The Mosaic preset-load bug (stale import rows overriding the preset; wrong bar count) is fixed and verified: rows now read Verlaine 1–8 / Marr 9–20 / Fripp 21–28 / Verlaine 29–40, total 40 bars.
- Generate/export path itself is sound: `scripts/verifyGenerateWritesFile.ts` proves `apiGenerate()` writes valid MusicXML. A separate Playwright timeout also falsely suggested “writes nothing.”
- TV Suite Song Mode failures were **validation gates**, not export: (1) bar-math in `generateMelodyBassScore` / mosaic inject (`305f3e15`); (2) **`validateMethenyConformance`** firing on Art Rock because `verlaine` has no `defaultStyleProfileForPrimarySongwriter` entry and falls back to **`STYLE_ECM`** in `runGoldenPath.ts` — fixed by art-rock bypass in `behaviourGates.ts` (`67c83789`). Proof: `engines/composer-os-v2/scripts/validateArtRockMosaicArc.ts` seed **90106**, golden path PASS.

### Quarantined (not lost, just shelved)

All flaky Playwright/automation work (smoke scripts, `.cmd` launchers, `data-testid` edits, Playwright dependency) was uncommitted-only and has been moved to a git stash, not deleted:

- Stash: `stash@{0}` — "wip: playwright smoke harness + testids (flaky)"
- Recover anytime with: `git stash pop stash@{0}`
- Working tree is clean at the solid commits; Mosaic preset test suite passes 13/13.

## 2. Open investigation — TV Suite section-start bar-math (checkpoint 2026-06-21)

**Status: PAUSED — no generation fix committed.**

- **Symptom (reported):** Art Rock / TV Suite score-truth failure on guitar bars **1, 9, 29** — voice 1 duration **4.5 ≠ 4**, overlapping events at **beat 2**. Same family as intro **5.5 ≠ 4** fixed in **`305f3e15`** (`generateMelodyBassScore.ts` `occupiedIntervals` / `stripMelodyMeasure` gap rests).
- **Section pattern:** bars 1 / 9 / 29 are mosaic **section starts** (intro Verlaine · build Marr · tail Verlaine). Bar 21 (Fripp peak) tiles motif across section — different inject path.
- **CLI seed 90106 (HEAD `6f41a5a3`):** `validateArtRockMosaicArc.ts` golden path **PASS**; raw pre-strip guitar v1 sums **4.0** at 1/9/21/29. Bug not reproduced on automated path yet — may be GUI-only, stale EXE, or post-`applyMelodyBassFormat` when guitar voice 2 comping present.
- **Resume script:** `engines/composer-os-v2/scripts/diagnoseTvSuiteBarMath.ts` — re-run with **`mosaicOutputFormat` omitted** (not `lead-sheet`) for valid PRE/POST `applyMelodyBassFormat` dump.
- **Likely fix locus (plan only):** `generateMelodyBassScore.ts` → `stripMelodyMeasure` / `collapseSimultaneousTopMelodyNotes`; secondary: `mosaicTilePipeline.ts` section-start inject clear.

## 3. Still open

- Confirm the desktop EXE in `release/Composer-OS.exe` is freshly built from current HEAD (it has drifted stale at least twice this session) before trusting any GUI result.
- Run the actual listening test: load Television Field Suite in the GUI, Generate against a ~40-bar melody, and listen for the arc — sparse Verlaine intro → Marr jangle build → audibly denser Fripp peak → thin unresolved Verlaine tail.
- Plan B ("KC Process Suite", using `fripp_king_crimson` and a 5/4 intro) remains parked as a written spec — build only after Plan A's listening test confirms the arc works.
- Roster gap note (`art_rock_roster_gaps_PARKED.md`) flags a shoegaze/wall-of-sound voice as the top future addition, intended as the first test of the archetype/template system once that's built.

## 4. Roadmap (current sequence)

| # | Step | Difficulty |
|---|---|---|
| 1 | Repo hygiene + roster help text + Art Rock smoke test | Easy — done |
| 2 | Art Rock listening pass (quality tuning by ear) | Easy — open |
| 3 | Confirm JB recap is form-aware (FormAB VARIED) | Easy — done |
| 4+5 | Television Field Suite design + build (Plan A) | Medium — built, pending listen |
| 6 | Nolen guitar-2 archetype (JB-only stabs + space) | Hard — not started |
| 7 | Archetype/template system, built off two art-rock voices | Hard — not started |
| 8 | Roster expansion (shoegaze voice first) | Hard — not started |

**Next concrete action: run the Television Field Suite listening test (sparse intro → Marr build → Fripp peak → thin Verlaine tail). Automated arc validation is green; ear check is the remaining gate.**
