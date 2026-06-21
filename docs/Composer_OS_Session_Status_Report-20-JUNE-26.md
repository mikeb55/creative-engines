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

## 2. Open investigation — TV Suite section-start bar-math (parked 2026-06-21)

**Status: PAUSED — no generation fix committed.**

### Seed 90106 on current HEAD

**Bars 1 / 9 / 29, guitar voice 1:**

- **No `mosaicOutputFormat`** (true pre-strip), **`lead-sheet`**, and **`melody-bass-chords`** paths all report **`v1_sum = 4.0`**.
- **No strict overlap at beat 2**; events only *span* beat 2 (e.g. note 1.5–2.5, rest 1.5–3.5), so strict bar-math passes.

**`stripMelodyMeasure`:**

- Correctly strips bass-register v1 notes and removes v2 on guitar without changing the 4.0 bar sum.
- Does not add gap rests that push sum to 4.5 on this seed.

**Resume script:** `engines/composer-os-v2/scripts/diagnoseTvSuiteBarMath.ts` — re-run with **`mosaicOutputFormat` omitted** for valid PRE/POST `applyMelodyBassFormat` dump (see script TODO for repro gap).

### Bug class and likely locus (305f3e15 family)

When it *does* fail, the pattern is mosaic **section starts** (intro · build · tail) with:

- **v2 intervals → gap rests:** v2 intervals converted to `gapRests` and appended to v1 without merging against existing v1 rests first → double-fill and **4.5 ≠ 4** with beat-2 overlap. Likely locus: `generateMelodyBassScore.ts` → `stripMelodyMeasure` (~104–112).
- **Section-start motif inject:** `mosaicTilePipeline.ts` wipes v1 at `section.startBar` and injects motif rhythm that can misalign with surviving harmony surface before strip runs (~483–532).

Bar 21 (Fripp peak) tiles motif across section — different inject path.

### Repro status

- **Earlier run** reported `success: false` with guitar bars **1 / 9 / 29** at **4.5 ≠ 4** and overlap at beat 2.
- **Current HEAD** with seed **90106** (all three format paths) does **NOT** reproduce this; strict bar-math is clean.
- **Unresolved:** whether that earlier failure came from a specific `mosaicOutputFormat` / CLI-only config or from a real app **Generate-tab** path.

### Open bug (not closed)

**TV Suite bar-math failure at section starts (intro/build/tail) — 4.5 ≠ 4 with v1 gap-rest overfill and beat-2 overlap.**

### Future step (later session — not now)

Run bar-math validation on the actual **Generate-tab TV Suite duo path** across multiple seeds to decide: live reproducible bug vs stale/config ghost; fix only once a solid repro seed+config is confirmed.

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
