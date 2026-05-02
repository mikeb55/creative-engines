# Frank Zappa — Creation Guide

Composer OS Song Mode + duo golden path: harmony slice, odd meters, export truth, and the **Phase B** solo lead engine. Implementation references: `engines/composer-os-v2/core/song-mode/frankZappaSlice.ts`, `engines/composer-os-v2/core/solo/zappasoloEngine.ts`, `engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts`.

---

## 1. Harmony slice (`frank_zappa`)

Polytonal clash, metric bass displacement, xenochrony-like pitch offset, style juxtaposition, through-composed sectional cuts — **`fz:d{1–5}:*`** receipts, **`HarmonyContext`** / **`attachFrankZappaHarmonyContext`**, **`breakFrankZappaIiViProgressions`** (no rolling ii–V–I chains). See slice source and roadmap § Frank Zappa.

---

## 2. Odd meters + export

**Phase A** infrastructure: **`barMeterMap`**, **`oddMeterQuantiser`**, MusicXML per-bar **`<time>`** changes. Mixed-meter duo + Zappa solo smoke use **`resolveMeterForBar`** / **`measureQuarterSpanForBar`** so 7/8 (and other meters) stay bar-math–correct through finalize and export.

---

## 3. Phase B — Solo engine (`zappasoloEngine.ts`)

Slonimsky-backed melodic line, PDF-style tuplet vocabulary (septuplet / quintuplet), structural **descending minor 6th**, **[0137]** tetrachord on structural bars, factory-cycle displacement — merged as **`zappa_solo`** MusicXML part when generation requests it.

### Phase 1 — Rhythmic cell lock — **LIVE**

- **Section A (form):** product label **3+3+2** for 7/8; canonical eighth grouping **`[3, 2, 2]`** (sum **7** per measure).
- **Section B (form):** product label **3+2+2+2** for 7/8; canonical grouping **`[2, 2, 2, 1]`** (sum **7**).
- **Constraint:** at least **50%** of four-bar phrase windows use the cell lock pass (**`ceil(phraseCount/2)`** first phrases, deterministic).
- **Mechanism:** snap eligible plain-note onsets in **7/8** bars to the section cell grid; tuplets and structural markers (**m6**, **[0137]**) stay off the grid; monophonic collapse + rhythm normalization keep MusicXML tick sums valid.
- **Metadata:** **`SoloLine.rhythmicCellLock`**, per-phrase **`zappaRhythmicCell`** on **`SoloPhrase`**.

### Phase 2 — Motif ownership — **LIVE**

- **Anchor:** one motif per **form section** — intervals + duration ratios extracted from the **first two bars** of that section (structural/tuplets excluded from the anchor slice).
- **Recurrence:** mean similarity **≥ 0.7** within section on **development** fragments (bars after the two-bar anchor window, clamped to the section).
- **Transforms** used for scoring vs anchor: **shift** (transpose — contour via intervals), **augment** / **compress** (IOI shape scales **0.25–4×** vs anchor inter-onset ratios).
- **Reject / repair:** phrases with **zero** or **&lt; 0.7** similarity to the section anchor after transforms get plain notes in the development window replaced by a deterministic anchor reinjection pass.
- **Metadata:** **`SoloLine.zappaMotifReceipt`** (`anchors`, `phraseScores`, `sectionRecurrence`, `sectionsMeetingRecurrence`, `phrasesRejectedOrRepaired`).

---

## Smoke / maintenance

- **`npm run test:composer-smoke`** includes **`zappasoloSmoke.test.ts`** and Frank Zappa slice smoke; aggregate PASS total lives in **`engines/composer-os-v2/tests/runSmokeTests.ts`**, **`CLAUDE.md`**, and **`docs/COMPOSER_OS_ROADMAP.md`**.
