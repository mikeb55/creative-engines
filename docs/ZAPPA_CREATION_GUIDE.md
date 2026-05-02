# Frank Zappa — Creation Guide

Composer OS Song Mode + duo golden path: harmony slice, odd meters, export truth, and the **Phase B** solo lead engine. Implementation references: `engines/composer-os-v2/core/song-mode/frankZappaSlice.ts`, `engines/composer-os-v2/core/solo/zappasoloEngine.ts`, `engines/composer-os-v2/core/solo/zappaVoiceLeading.ts`, `engines/composer-os-v2/core/goldenPath/bassMelodicLines.ts` (bass commitment), `engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts` (duo passes + Phase 4 interaction).

---

## 1. Status

Shipped items reference **`apps/composer-os-app/src/pages/HomeGenerate.tsx`**, **`zappasoloEngine.ts`** (`soloLineToPartModel` + **`mergeZappaSoloPart`**), **`generateGoldenPathDuoScore.ts`** (comp part + **`songModePresentAsPianoComp`**), **`musicxmlExporter.ts`** / **`guitarBassDuoExportNames.ts`** (bass label), **`frankZappaSlice.ts`** (device rates), **`frankZappaSliceSmoke.test.ts`** (odd meter rows).

**MusicXML instruments (Frank Zappa trio):** **Piano** (comp / harmony, GM **1** — **`<part-name>Piano</part-name>`**, **`<instrument-name>Piano</instrument-name>`** — matches Sibelius instrument-library matching); **Upright Bass**; **Elec. Gtr** solo (**`<part-name>Elec. Gtr</part-name>`**, **`<instrument-name>Electric Guitar</instrument-name>`**, GM **27** / `midiProgram` **26**).

**Piano staff label in Sibelius:** MusicXML exports **`Piano`** only. Full/long names on the printed staff are a **Sibelius engraving preference**, not forced by this XML — set manually: **House Styles → Engraving Rules → Instruments → At start → Full names** (or equivalent).

### Product verification (2026-05-02)

#### GCE & motif lock milestone — **LIVE**

- **GCE 9.1/10 confirmed** — first **9+** overall score — **LIVE**.
- **Motif lock:** sticky **3–4 note** anchor with **tritone / minor 6th** leap — **LIVE**.
- **Structural recall** at bars **1, 5, 9, 13** enforced — **LIVE**.
- **Density contrast:** breath bars after motif statements — **LIVE**.

- **Sibelius MusicXML errors resolved** — invalid **`<part-name-display>`** / score-header **`<credit>`** experiments **removed** (DTD scope errors); measure-level **`<staff-details>`** / **`<staff-label>`** remain **removed** — **LIVE**.
- **Electric guitar solo +12 semitone written shift** — **`zappaSoloExportWrittenMidi`**: **+12** (one octave), clamp **\[52, 84\]**, **`while (pitch > 84) pitch -= 12`** — **LIVE**.
- **Zappa Classic 7/8 + 4/4** — **`barMeterMap`** alternating meters confirmed in-app and smoke — **LIVE**.
- **GCE overall** — **9.1/10** confirmed (**2026-05-02**, first **9+**); category snapshots still logged per run (see **`docs/GCE_FRAMEWORK_V2.md`** / receipts).

- **Instrumentation (export):** **Piano** (GM **1**) / **Upright Bass** / **Elec. Gtr** — **LIVE**.
- **Solo density:** minimum **2** notes per bar enforced after solo passes (chord-tone pad where needed; default generation density **medium** / **0.72** when tiers omit density) — **LIVE**.
- **Chord language improved — LIVE:** **d1** (polytonal) / **d4** (style juxtaposition) stochastic rates **55%** / **50%** in **`precomputeFrankZappaEffectiveHarmonyBars`**, plus **enforceZappaHarmonyLanguageFloors** (≥**50%** of bars not vanilla maj7-family; ≥**1** altered/jazz-dense bar per form section when needed; **`fz:enforce:*`** receipts).
- **Chord symbols:** lead-sheet **`<harmony>`** on the **comp (piano) staff** only; **not** on the **Upright Bass** staff — **LIVE**.
- **Green receipt:** When **`exportIntegrityPassed`** / export integrity is true, the generation receipt uses the success (green) styling even if **`readiness.shareable`** is false; amber label **Generated (not shareable)** in that case — **LIVE**.
- **Solo pitch clamp (export):** After **`+12`** semitones, notes are dropped by octave until ≤ **84**, then hard-clamped to **MIDI 84** (default written range **52–84**); **no** MusicXML **`<octave>7</octave>`** on the **`zappa_solo`** part — **LIVE**.
- **Part-list / instruments:** **Piano** + **Pno.** abbreviation + GM **1** on the comp staff (**`songModePresentAsPianoComp`**, **`musicxmlExporter`** piano branch); bass **Upright Bass**; solo **Elec. Gtr** + **Electric Guitar** (GM **27**) — **LIVE**.
- **Odd meter smoke test:** Alternating **7/8 + 4/4** **`barMeterMap`** in **`frankZappaSliceSmoke.test.ts`** (builtin + **`custom_locked`** rows) uses seed **77777** (phrase cadence / motif gates; replaces **50200**) — **LIVE**.
- **GCE overall** — green receipt + **9.1** milestone on Generate (**2026-05-02**); see **`docs/GCE_FRAMEWORK_V2.md`** for category breakdowns by run.
- **All five musicality phases live:** rhythmic cell (Phase 1), motif ownership (Phase 2), voice-leading + bass authority (Phase 3), guitar↔bass interaction + callbacks (Phase 4), UI fixes (Phase 5).
- **Motif similarity & structural recall (2026-05-02)** — sticky **3–4 note** anchor (**tritone / m6** leap), section recurrence **≥0.75**, structural bars **1 / 5 / 9 / 13** vs anchor **≥0.75**, breath bars (**≤3** attacks) after those motif bars; full-phrase repair still below **0.5**; **`frankZappaSliceSmoke`** / **`zappasoloSmoke`** green (**113**/0 smoke tier).

---

## 2. Harmony slice (`frank_zappa`)

Polytonal clash, metric bass displacement, xenochrony-like pitch offset, style juxtaposition, through-composed sectional cuts — **`fz:d{1–5}:*`** receipts, **`HarmonyContext`** / **`attachFrankZappaHarmonyContext`**, **`breakFrankZappaIiViProgressions`** (no rolling ii–V–I chains). Device rates **d1** **55%** / **d4** **50%** + **`enforceZappaHarmonyLanguageFloors`** for altered/colour density. See slice source and roadmap § Frank Zappa.

---

## 3. Odd meters + export

**Phase A** infrastructure: **`barMeterMap`**, **`oddMeterQuantiser`**, MusicXML per-bar **`<time>`** changes. Mixed-meter duo + Zappa solo smoke use **`resolveMeterForBar`** / **`measureQuarterSpanForBar`** so 7/8 (and other meters) stay bar-math–correct through finalize and export.

---

## 4. Phase B — Solo engine (`zappasoloEngine.ts`)

Slonimsky-backed melodic line, PDF-style tuplet vocabulary (septuplet / quintuplet), structural **descending minor 6th**, **[0137]** tetrachord on structural bars, factory-cycle displacement — merged as **`zappa_solo`** MusicXML part when generation requests it.

### Tuning Pass (2026-05-02) — **LIVE**

- **Motif:** **4-bar** slice → **sticky 3–4 note** anchor (**tritone / m6** leap); structural bars **1 / 5 / 9 / 13** + development windows repaired below **0.75**; **full 4-bar phrase** replace when phrase–anchor similarity **&lt; 0.5**; phrase tail fallback when the anchor spans an entire phrase.
- **Rhythmic cell lock:** **60%** of four-bar phrase indices (**`ceil(phraseCount × 0.6)`**); receipt **`rhythmicCellLock.threshold`** **0.6**.
- **Breath space:** each 4-bar phrase keeps **at least one bar** with **≤2** attacks (thins one bar when every bar would exceed that — **`enforceZappaPhraseBreathSpace`** after minimum-density pad).
- **Guide-tone line (`zappaVoiceLeading.ts`):** step-cost favours semitone motion and penalises leaps **&gt; M3**; **three consecutive** non-stepwise bar-to-bar motions (**|Δ| &gt; 2**) trigger **automatic third/seventh re-pick** on interior bars (**`repairZappaGuideToneLongBreakStreaks`**).

### Phase 1 — Rhythmic cell lock — **LIVE**

- **Section A (form):** product label **3+3+2** for 7/8; canonical eighth grouping **`[3, 2, 2]`** (sum **7** per measure).
- **Section B (form):** product label **3+2+2+2** for 7/8; canonical grouping **`[2, 2, 2, 1]`** (sum **7**).
- **Constraint:** at least **60%** of four-bar phrase windows use the cell lock pass (**`ceil(phraseCount × 0.6)`** first phrases, deterministic).
- **Mechanism:** snap eligible plain-note onsets in **7/8** bars to the section cell grid; tuplets and structural markers (**m6**, **[0137]**) stay off the grid; monophonic collapse + rhythm normalization keep MusicXML tick sums valid.
- **Metadata:** **`SoloLine.rhythmicCellLock`**, per-phrase **`zappaRhythmicCell`** on **`SoloPhrase`**.

### Phase 2 — Motif ownership — **LIVE**

- **Anchor:** one motif per **form section** — **sticky 3–4 note** window from the **first four bars** (structural/tuplets excluded from the slice); must include a **tritone / minor 6th** melodic leap (forced if no candidate window).
- **Recurrence:** mean similarity **≥ 0.75** within section on **development** fragments; **structural recall** bars **1 / 5 / 9 / 13** scored vs anchor at **≥ 0.75** (repair/inject when below).
- **Density contrast:** after each structural motif bar, the **next** bar thinned to **≤3** attacks where removable — **LIVE**.
- **Transforms** used for scoring vs anchor: **shift** (transpose — contour via intervals), **augment** / **compress** (IOI shape scales **0.25–4×** vs anchor inter-onset ratios).
- **Reject / repair:** similarity **&lt; 0.5** → strip repairable notes in the **whole phrase** and reinject; below **0.75** on development or structural bars → targeted reinjection (aggressive when **&lt; 0.62** on development windows).
- **Metadata:** **`SoloLine.zappaMotifReceipt`** (`anchors`, `phraseScores`, `sectionRecurrence`, `sectionsMeetingRecurrence`, `phrasesRejectedOrRepaired`).

### Phase 3 — Voice-leading + bass authority — **LIVE**

- **Guide-tone line tracking:** Smoothed **3rd / 7th** alternating line per bar with **≤2 semitone** bar-to-bar motion where chord tones allow (`buildZappaSmoothedGuideToneReceipt`, **`zappaVoiceLeading.ts`**); light nudge of the first non-structural solo attack per bar toward the guide. Receipt: **`SoloLine.zappaGuideToneReceipt`** (`bars`, `stepwiseContinuityRatio`, `stepwiseChainMet`, optional **`phraseTargets`**).
- **Bass commitment (beats 1–2):** Beat **1** = **root / 3rd / 7th** of the current chord (slash-bass pitch class allowed); beat **2** = **chord tone** or **leading tone** into the next harmony. **`enforceFrankZappaBassBeatCommitment`** in **`bassMelodicLines.ts`**; applied from **`buildBassPart`** when **`songwriterStyleId === 'frank_zappa'`**. Diagnostic: **`generationMetadata.frankZappaBassBeatCommitmentViolated`** if any bar initially failed (after repair).
- **Directional phrase targeting:** Each four-bar phrase targets a **goal tone** = guide tone at **bar N+2 or N+4** (seeded); closing pitch nudged when it does not improve distance to the goal vs the phrase opening.
- **Implied inner voice:** **`applyFrankZappaImpliedInnerVoicePass`** — narrows **> octave** bass–melody spans under **parallel** motion; guarantees **≥1 contrary-motion moment per form section** when missing. Telemetry on **`frankZappaDiagnostics`** (`zappaInnerVoiceNudgeBars`, `zappaContraryMotionSections`).
- **Voice-leading gate:** **`validateBarryHarrisConformance`** (when **`frank_zappa`**) computes **`zappaVoiceLeadingScore`** (0–10): rewards semitone motion, small-step fraction, **`zappaGuideToneReceipt.stepwiseContinuityRatio`**; penalizes large leaps and harsh chord-change melody resets. Written to **`frankZappaDiagnostics.zappaVoiceLeadingScore`** when slice diagnostics exist.

### Phase 4 — Guitar↔bass interaction + cross-bar callbacks — **LIVE**

- **Guitar↔bass imitation:** **`applyFrankZappaPhase4GuitarBassAndRegister`** in **`generateGoldenPathDuoScore.ts`** — per form section, either the **bass** states the anchor and **guitar** echoes **1–2 beats** later, or **guitar**’s first-two-bar anchor is **echoed in bass** with the same delay (**≥1** imitation event per section). Receipt: **`frankZappaDiagnostics.zappaImitationReceipt`** (when slice diagnostics already exist).
- **Cross-bar callbacks (solo):** Bar **1** plain-note **rhythm + intervallic contour** is **reused (transposed)** at bars **5, 9, 13, …** via **`applyZappaCrossBarCallbacks`** in **`zappasoloEngine.ts`**. Metadata: **`SoloLine.zappaMotifReceipt.crossBarCallbacks`** (anchor bar, target bars, rhythm/interval digests).
- **One controlled disruption per section:** **`computeZappaSectionDisruptionBars`** — exactly **one** bar per form section **skips** the 7/8 **cell snap** (prefers 7/8 measures when available) for tension/release, then the grid returns on surrounding bars. Logged on **`SoloLine.rhythmicCellLock.sectionDisruptionBars`**.
- **Register swap (once per section):** One **deterministic** bar per section: **guitar** melody **−12** st, **bass** **+12** st (clamped) so the **bass** can sit **above** the guitar for a single bar of textural surprise.

### Phase 5 — UI fixes — **LIVE**

Product polish + export ergonomics (2026-05-02):

- **Receipt:** Green border / success panel when **`exportIntegrityPassed`** is true (even when not shareable); red only on explicit integrity failure, **`success === false`**, or client error; amber **Generated (not shareable)** when integrity passes but **`readiness.shareable`** is false — **`HomeGenerate.tsx`**.
- **Solo octave / range:** **`soloLineToPartModel`** raises written pitches **+12** semitones with **hard ceiling MIDI 84** (no octave **7** in exported **`zappa_solo`** XML); **`zappaSoloOptionsFromTiers`** / solo defaults use **52–84** MIDI for generation.
- **Part-list names:** Comp staff **`Piano`** (**`musicxmlExporter`** → **`<part-name>Piano</part-name>`** / **`<instrument-name>Piano</instrument-name>`** + GM **1**); internal score part **`name`** stays **`Piano`** for routing; bass **`Upright Bass`**; solo **`Elec. Gtr`** / **`Electric Guitar`** (**`soloLineToPartModel`** + **`scoreInstrumentName`**, GM **27**).
- **Smoke:** **`frankZappaSliceSmoke.test.ts`** — alternating-meter **`barMeterMap`** (seed **77777**), export integrity, strict bar math, MusicXML checks (**`Piano`** part-name; **`zappa_solo`** without **`<octave>7</octave>`**).

---

## Smoke / maintenance

- **`npm run test:composer-smoke`** includes **`zappasoloSmoke.test.ts`** and Frank Zappa slice smoke; aggregate **113**/0 PASS rows, **31** labelled suites — sync **`engines/composer-os-v2/tests/runSmokeTests.ts`**, **`CLAUDE.md`**, and **`docs/COMPOSER_OS_ROADMAP.md`** when the allowlist changes.
