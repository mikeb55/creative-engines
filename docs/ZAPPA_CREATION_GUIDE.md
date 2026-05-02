# Frank Zappa — Creation Guide

Composer OS Song Mode + duo golden path: harmony slice, odd meters, export truth, and the **Phase B** solo lead engine. Implementation references: `engines/composer-os-v2/core/song-mode/frankZappaSlice.ts`, `engines/composer-os-v2/core/solo/zappasoloEngine.ts`, `engines/composer-os-v2/core/solo/zappaVoiceLeading.ts`, `engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts`.

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

### Phase 3 — Voice-leading + bass authority — **LIVE**

- **Guide-tone line tracking:** Smoothed **3rd / 7th** alternating line per bar with **≤2 semitone** bar-to-bar motion where chord tones allow (`buildZappaSmoothedGuideToneReceipt`, **`zappaVoiceLeading.ts`**); light nudge of the first non-structural solo attack per bar toward the guide. Receipt: **`SoloLine.zappaGuideToneReceipt`** (`bars`, `stepwiseContinuityRatio`, `stepwiseChainMet`, optional **`phraseTargets`**).
- **Bass commitment (beats 1–2):** Beat **1** = **root / 3rd / 7th** of the current chord (slash-bass pitch class allowed); beat **2** = **chord tone** or **leading tone** into the next harmony. **`enforceFrankZappaBassBeatCommitment`** in **`bassMelodicLines.ts`**; applied from **`buildBassPart`** when **`songwriterStyleId === 'frank_zappa'`**. Diagnostic: **`generationMetadata.frankZappaBassBeatCommitmentViolated`** if any bar initially failed (after repair).
- **Directional phrase targeting:** Each four-bar phrase targets a **goal tone** = guide tone at **bar N+2 or N+4** (seeded); closing pitch nudged when it does not improve distance to the goal vs the phrase opening.
- **Implied inner voice:** **`applyFrankZappaImpliedInnerVoicePass`** — narrows **> octave** bass–melody spans under **parallel** motion; guarantees **≥1 contrary-motion moment per form section** when missing. Telemetry on **`frankZappaDiagnostics`** (`zappaInnerVoiceNudgeBars`, `zappaContraryMotionSections`).
- **Voice-leading gate:** **`validateBarryHarrisConformance`** (when **`frank_zappa`**) computes **`zappaVoiceLeadingScore`** (0–10): rewards semitone motion, small-step fraction, **`zappaGuideToneReceipt.stepwiseContinuityRatio`**; penalizes large leaps and harsh chord-change melody resets. Written to **`frankZappaDiagnostics.zappaVoiceLeadingScore`** when slice diagnostics exist.

---

## Smoke / maintenance

- **`npm run test:composer-smoke`** includes **`zappasoloSmoke.test.ts`** and Frank Zappa slice smoke; aggregate PASS total lives in **`engines/composer-os-v2/tests/runSmokeTests.ts`**, **`CLAUDE.md`**, and **`docs/COMPOSER_OS_ROADMAP.md`**.
