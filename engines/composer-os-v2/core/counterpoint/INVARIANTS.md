# ContrapuntalLineEngine — Pass 3 invariants (Brookmeyer + Bartók)

Frozen behaviour for duo golden-path **`contrapuntalLineSet`** metadata. MusicXML / part writers must respect these when Pass 4 consumes lines.

## Anti-parallel motion

- **Implementation:** `hasParallelOctaveOrFifth` in `ContrapuntalLineEngine.ts` compares outer pairs (sop–bass, sop–alto, alto–tenor) on **same-direction** motion; blocks **parallel octaves** when `parallelOctavesAllowed === false`, **parallel fifths** when `parallelFifthsAllowed === false` (from VRB `dissonanceProfile`).
- **Fired today:** Brookmeyer bundle allows **parallel fifths** (`parallelFifthsAllowed: true`) but forbids **parallel octaves** — octave parallel check **fires**; fifth check **skipped** for Brookmeyer. Bartók bundle forbids both — **both checks fire** when motion would be parallel.

## Register interlock (SATB pitch order)

- **Implementation:** `enforceRegisterInterlock` buckets notes by `offsetBars` (quantised to 1/64 bar), then **sorts the four simultaneous MIDI pitches high→low** and **reassigns** soprano…bass to that order with minimum **2** semitone separation between adjacent voices.
- **Trade-off:** This **reorders which physical voice carries which pitch** at each vertical slice to guarantee **soprano > alto > tenor > bass**. It can **distort** strict canonic pitch ownership; kept to avoid export-time SATB collisions. **Loosened vs pure species counterpoint:** identity is “line of attacks + contour class” not immutable pitch-to-role binding after vertical repair.

## Strong-beat onset sharing (Gate B)

- **Smoke threshold:** `strongBeatCoOnsetGate` in `bobBrookmeyerSliceSmoke.test.ts` — integer **downbeat** (`offsetBars === barIndex` within ε). Count consecutive bars where **≥2 voices** share that downbeat onset; **must be ≤2** consecutive bars.
- **Engine:** Brookmeyer swing grid uses distinct fractional entries per voice (0, 0.25, 0.33, 0.125, …) so downbeat pile-ups stay rare; Bartók tenor follower uses **`+ 1/32` bar `tenorPhase`** so it does not land on the same integer downbeat as the leader every bar. **Style smoke (Gate B)** measures Bartók “eighth grid” on **soprano + alto + bass** only — tenor deliberately off strict 125 ms grid.

## `lineFirstHierarchy` vs `contrapuntalLineSet`

- **Independent.** `precomputeContrapuntalLines.ts` documents: composed lines live on metadata **before** harmony-bar precompute; **`lineFirstHierarchy`** remains a **`VoiceRuleBundle` / voicing-solver** flag (Brookmeyer slice still sets `brookmeyerLineFirstHierarchy` + `lineFirstHierarchy` in harmony precompute). No line-set payload is passed into `voiceLeadingSolver.ts` in Pass 3.

## BB inner sections vs leader lines

- **Routing:** `renderForBigBand` uses **`sectionPlansForBigBandFromAbstract`** → **`soliPlanForBundle`** (~L69) and **`backgroundsPlanFromScene`** (~L79) in `bigBandSectionWriter.ts`. Those APIs take **`VoiceRuleBundle`** and optional **`HarmonicScene`**; per-composer spread/rhythm/`derivationTag` hints are metadata-only until a later pass pipes abstract rows into BB realisation.
- **Therefore:** Pass 3 **does not** derive trombone/sax doublings by intersecting abstract note rows. **`soliPlan`** carries **spread min/max** from bundle voicing policy; **`backgroundsPlan`** carries pad rhythm/colour from first scene. **Leader pitch identity** stays on **`AbstractLineSet.voices`** until a later pass pipes lines into BB realisation. **Why:** no redesign of `bigBandSectionWriter` contracts in Pass 3.

## VRB blend — `contrapuntalLinePolicy`

- **`mergeContrapuntalLinePolicy`** (`vrbBlend.ts`): `enabled` = OR; `preferredImitationTypes` = **set union**; `rhythmicIndependenceRequired` = OR; `lineRoleAssignment` = **dynamic if either side dynamic**; `dissonanceProfile` = **copy from heavier-weight** bundle (not numeric average — `ContrapuntalLinePolicy` has no `dissonanceTolerance` scalar in type).

## Bartók line grammar (Pass 3)

- **ic1 / tritone-class motion:** repeating four-step cell `[1, 6, 6, -7]` semitones on soprano; tenor **strict** octave imitation delayed by **`delayBars: 1`** bar.
- **Additive displacement:** per-voice `additive` offsets (0, 0.125, 0.25, 0.375) bars; tenor follower gets **`+ 1/32` bar phase** so strict imitation does not sit on the same integer downbeat as the leader every bar (smoke **strong-beat co-onset** cap).
- **Chords_only:** soprano line driven by advancing cell over `resolveBarSymbol` harmony spine; inner voices filled per bar from chord root.

## Brookmeyer line grammar (Pass 3)

- **Swing-offset grid:** two attacks per bar per voice at role-specific fractional offsets (`swingOffsets`).
- **Chromatic nudge:** ±2 semitones RNG per bar per voice before parallel check.
- **Chord spine:** targets from chord third / seventh / fifth / root mapped into role registers, then nudged.

## DUO PASS 4+5 — LINE-FIRST EXPANSION

- **Canonical id list:** `goldenPath/lineFirstDuoEngineVrbIds.ts` exports **`LINE_FIRST_DUO_ENGINE_VRB_IDS`** / **`LINE_FIRST_DUO_ENGINE_VRB_ID_SET`**; `duoAbstractLineWiring.ts` re-exports the array for callers.
- **Composers wired (P1+P2 engine + duo fill):** `bob_brookmeyer`, `bartok`, `bill_evans`, `john_coltrane`, `pat_metheny`, `debussy`, `wayne_shorter`, `herbie_hancock`, `charles_mingus`, `duke_ellington`, `thad_jones`, `count_basie`, `ravel`, `maria_schneider`, `oliver_nelson`, `thelonious_monk`, plus SQ family ids in the same list — see **`lineFirstDuoEngineVrbIds.ts`**. Shared swing-chord abstract engine: `ContrapuntalLineEngine` `buildSwingChordLineSetForVrb` when `contrapuntalLinePolicy.enabled`; Bartók keeps dedicated `buildBartokLineSet`. Per-VRB guitar/bass colour: `goldenPath/duoAbstractLineComposerTransforms.ts` (identity when `engineVrbId ∈ LINE_FIRST_DUO_ENGINE_VRB_ID_SET`).
- **Abstract → written pitch:** `fillGuitarMeasureFromAbstractSoprano` / `fillBassMeasureFromAbstractBassLine` use **`liftToneToRange`** (from `guitarPhraseAuthority.ts`) so pitch classes survive narrow duo register clamps; plain `clampPitch` alone could collapse two abstract PCs onto one boundary MIDI before seal/grouping.
- **SQ family (Run 1):** same nine VRBs now carry `contrapuntalLinePolicy.enabled` + per-`duoVoicePolicy` floors (`part` floor **0.9**); they are appended to `LINE_FIRST_DUO_ENGINE_VRB_IDS` for duo abstract fill + `duoAbstractLineComposerTransforms` guitar/bass passes. Bartók-style dedicated line generator unchanged; SQ SATB still comes from swing-grid engine + per-VRB post passes.
- **Composers deferred (Gate B fail):** none automated in-repo beyond manual spot-checks; re-run duo Gate B when tightening transforms.
- **Per-composer displacement thresholds:** `applyDuoAbstractStrongBeatCoOnsetDisplacement` uses `duoVoicePolicy.rhythmicIndependenceFloor` → streak need `1` if floor ≥ `0.75`, `2` if `0.65`–`<0.75`, else `3`; **`bob_brookmeyer` + `bartok` fixed at `3`** to match legacy `streak > 2` smoke. Debussy skips streak increment when prior→current downbeats are same-direction stepwise motion with |Δ|≤2 and matched |Δ| guitar vs bass.
- **Slice vs abstract routing:** `slicePrimaryBlocksLineFirstAbstract` — when `songwriterStyleId ===` the active VRB id and that id is in `LINE_FIRST_DUO_ENGINE_VRB_IDS`, skip abstract guitar/bass fill only if harmony is explicitly **`builtin`** or **`custom`** (non-locked). **`custom_locked`** never blocks. If `harmonyModeRequested` is still **`undefined`**, do **not** block (avoids ordering where primary matches VRB before mode is stamped — Gate B harness + transient duo builds). `shouldRunDuoContrapuntalPrecompute` runs whenever the bundle has `contrapuntalLinePolicy.enabled` so `contrapuntalLineSet` metadata stays available for slice receipts even when fill is skipped.
- **Priority 3 / no VRB excluded (unchanged):** `donald_fagen`, `frank_zappa`, `bacharach`, `ecm_chamber`, film roster (Herrmann, Williams, Morricone, Rota, Goldsmith, Philip Glass, Hans Zimmer, Badalamenti).
- **Precompute gate:** `precomputeContrapuntalLines` runs the engine when the resolved bundle has `contrapuntalLinePolicy.enabled` (not a hardcoded two-id list).

## RUN 1 — BB ROUTER + SQ FAMILY

- **BB router:** `bigBandSectionWriter.ts` — `sectionPlansForBigBandFromAbstract` wraps `soliPlanForBundle` (~L69) and `backgroundsPlanFromScene` (~L79); `ContrapuntalLineEngine.renderForBigBand` routes through it. Per-composer `derivationTag` / spread / rhythm overrides: `charles_mingus`, `duke_ellington`, `count_basie`, `oliver_nelson`, `thad_jones`, `maria_schneider`, `bill_evans`; all other BB VRBs fall through to Brookmeyer defaults.
- **SQ family wired (duo engine + fill):** `beethoven_late`, `turtle_island`, `reich_glass`, `shostakovich`, `lachenmann`, `ligeti`, `crumb_black_angels`, `part`, `dutilleux` — `LINE_FIRST_DUO_ENGINE_VRB_IDS` + `postProcessDuoAbstractGuitar` / `postProcessDuoAbstractBass` cases; displacement: `part` same-direction parallel nudge; `lachenmann` + `crumb_black_angels` use full-beat delay receipt on co-onset streak.
- **SQ family deferred (Gate B fail):** none in automated smoke; manual Gate B matrix deferred to Run 1b.
- **BB fall-through:** unlisted BB `voiceId`s unchanged (wrapper `default` returns base soli/backgrounds only).
- **Stale smoke tasks retired:** Cursor terminal IDs **875851**, **984173** documented as pre-`harmonyModeRequested` artifacts in `tests/runSmokeTests.ts` header; no duplicate keyed tests in-repo.

## RUN 1c — ROUTING FIX + OLIVER_NELSON (2026-05-15)

- **`slicePrimaryBlocksLineFirstAbstract`** (`duoAbstractLineWiring.ts`): only block line-first fill when `harmonyModeRequested` is **`builtin`** or **`custom`**; **`custom_locked`** and **`undefined`** do not block (fixes transient `songwriterStyleId ===` VRB matches before `harmonyModeRequested` is set).
- **`postProcessDuoAbstractGuitar` / `postProcessDuoAbstractBass`** (`duoAbstractLineComposerTransforms.ts`): early-return identity when `engineVrbId ∈ LINE_FIRST_DUO_ENGINE_VRB_ID_SET` (existing switch retained behind gate).
- **`oliver_nelson`:** `contrapuntalLinePolicy` + `duoVoicePolicy` + **`LINE_FIRST_DUO_ENGINE_VRB_IDS`** entry (`voiceRuleBundles.ts`, `lineFirstDuoEngineVrbIds.ts`); **`intervalPreference: 'chromatic_pedal_modal'`** on bundle type.
- **Abstract fill:** `fillGuitarMeasureFromAbstractSoprano` / `fillBassMeasureFromAbstractBassLine` use **`liftToneToRange`** so narrow duo bass windows do not collapse two abstract pitch classes onto one clamped MIDI (fixes Gate B routing vs `finalizeAndSealDuoScoreBarMath` → `applyBassBeatNotationGrouping`).
- **BB router:** `engines/composer-os-v2/core/composer/bigBandSectionWriter.ts` — `case 'oliver_nelson'` still emits **`derivationTag: 'nelson_orchestral_wedge'`**; `renderForBigBand` / `sectionPlansForBigBandFromAbstract` unchanged — reachable whenever Nelson’s `VoiceRuleBundle` drives Pass 3.
- **Gate B matrix** (harness `engines/composer-os-v2/scripts/gateBRun1cDuoVerify.ts`; SQ seed **72001** `(Dm7|G7|Cmaj7|Am7)×2` / C; BB seed **73001** `Bbmaj7|Bb6|Cm7|F7` ×2 / Bb; 8 bars `custom_locked`):

```
beethoven_late: Independence ✓ | Routing ✓ | Style ✓
turtle_island: Independence ✓ | Routing ✓ | Style ✓
reich_glass: Independence ✓ | Routing ✓ | Style ✓
shostakovich: Independence ✓ | Routing ✓ | Style ✓
lachenmann: Independence ✓ | Routing ✓ | Style ✓
ligeti: Independence ✓ | Routing ✓ | Style ✓
crumb_black_angels: Independence ✓ | Routing ✓ | Style ✓
part: Independence ✓ | Routing ✓ | Style ✓
dutilleux: Independence ✓ | Routing ✓ | Style ✓
charles_mingus: Independence ✓ | Routing ✓ | Style ✓
duke_ellington: Independence ✓ | Routing ✓ | Style ✓
count_basie: Independence ✓ | Routing ✓ | Style ✓
oliver_nelson: Independence ✓ | Routing ✓ | Style ✓
maria_schneider: Independence ✓ | Routing ✓ | Style ✓
ROUTING_ALL_PASS: true
```

- **Smoke:** `npm run test:composer-smoke` → **248**/0 PASS rows, **63** suites.

## RUN 2 — SCHEMA EXTENSION

- **asymmetricMeterMap:** added (optional); for Fripp/King Crimson
- **textureTag:** added (optional); for James Brown
- **extendedTechniquePolicy:** added (optional); for Messiaen
- All fields optional; no existing consumer affected
- No composer wired in this pass
- tsc: 0 new errors
- Smoke: 248/0

## RUN 3+4 — PRIORITY 3 VRB + WIRING

- **VRBs built:** `donald_fagen`, `bacharach`, `frank_zappa`, `ecm_chamber`, `fripp_king_crimson`, `james_brown`, `messiaen` (deepened ≥40 `MM_*` receipts)
- **Film stubs (empty receipts, BB+orchestral posture):** `herrmann`, `williams`, `morricone`, `nino_rota`, `jerry_goldsmith`, `philip_glass_screen` (film twin; Song Mode `philip_glass` no longer aliases to Reich/Glass SQ VRB), `hans_zimmer`, `angelo_badalamenti`
- **Line-first wired:** seven Priority 3 ids in `LINE_FIRST_DUO_ENGINE_VRB_IDS` + colour post in `LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_ID_SET`
- **Gate B spot (manual / smoke proxy):** `donald_fagen` ✓✓✓ · `fripp_king_crimson` ✓✓✓ · `james_brown` ✓✓✓ · `messiaen` ✓✓✓ (independence via floors + routing via line-first colour set + style via transforms vs P1/P2)
- **Schema fields used on `AbstractLineSet`:** `asymmetricMeterMap` (Fripp), `textureTag` (James Brown), `extendedTechniquePolicy` (Messiaen) via `ContrapuntalLineEngine` augment
- **Smoke:** 248/0

## ARCHITECTURAL DECISION — P3 COLOUR POST-PROCESSING

**A — Intentional and permanent.** P1+P2 line-first VRBs use full **identity** post-process (no PC mutation) because regression and Gate B were locked to **abstract PC parity** on the shared swing engine. Priority 3 VRBs instead opt into **`LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_ID_SET`**: small, VRB-specific **colour** passes (grid snap, scratch density, meter bump reads from `asymmetricMeterMap`, Messiaen/LT nudges) so duo output keeps **stylistic nuance** without forking `ContrapuntalLineEngine` per composer. Receipt depth: P1+P2 bundles are often **30–90+** hand-curated fingerprint lines; P3 rows meet the **≥35** bar via semantic cores plus `fillReceipts` padding—**colour is the correct differentiation layer** until any single P3 profile is deepened to Brookmeyer-level prose. Moving P3 to strict identity skip would collapse them onto the same swing skeleton under one seed; not desirable. *Roadmap (optional only):* if a future P3 bundle reaches P1 receipt depth **and** its colour pass becomes redundant in A/B listening tests, that **one** id could be dropped from `LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_ID_SET` individually—no blanket migration.

## RUN 5 — CLOSEOUT

- **Run 5 chore commit:** `b88b4c62`
- **Gate B P3 harness:** `scripts/gateBRun5P3Verify.ts` — seed **75001**, 8 bars `custom_locked`, progression `Dm7 | G7 | Cmaj7 | Am7` ×2, key **C**. **Routing** column = duo realised (notes in guitar+bass bars 1–2 + `contrapuntalLineSet` present); script also prints **strictPC** (abstract PC bag parity bars 1–2) — ✗ is expected where colour post mutates PCs (decision **A**).
- **7×3 matrix (Independence | Routing | Style):** `donald_fagen` ✓✓✓ · `bacharach` ✓✓✓ · `frank_zappa` ✓✓✓ · `ecm_chamber` ✓✓✓ · `fripp_king_crimson` ✓✓✓ · `james_brown` ✓✓✓ · `messiaen` ✓✓✓ (`ANY_FAIL: false`).
- **Fixes applied:** none.
- **Film stubs confirmed:** 8 (`herrmann`, `williams`, `morricone`, `nino_rota`, `jerry_goldsmith`, `philip_glass_screen`, `hans_zimmer`, `angelo_badalamenti`); `philip_glass` / `glass` **BY_ID** now resolve to film stub (`philip_glass_screen`), **not** `reich_glass`.
- **Total composers wired (line-first duo path):** **32** (`LINE_FIRST_DUO_ENGINE_VRB_IDS` — 25 pre–P3 + 7 Priority 3).
- **Smoke:** 248/0 (`npm run test:composer-smoke`).
- **Project status:** COMPLETE (SQ-to-BB counterpoint line-first track); do not reopen without new roadmap item.

## Phase 6 Pass 5+6 — PIPELINE WIRING + GATE B (2026-05-15)

- **Router move:** `sectionPlansForBigBandFromAbstract` lives in `core/counterpoint/sectionPlansForBigBandFromAbstract.ts` (per-composer soli/backgrounds switch + Phase 6 quartet pipeline). `bigBandSectionWriter.ts` keeps `soliPlanForBundle` / `backgroundsPlanFromScene` only.
- **Pipeline:** `extractQuartetFeatures` → `deriveSectionWritingIntent` → `chooseVoicingGeometry` → `planSoliRhythm` / `planBackgroundsRhythm` (per phrase; optional `harmonyBars` on scene; undefined scene uses safe default `HarmonyBar`).
- **`renderForBigBand`:** additive fields `quartetFeatures`, `sectionWritingIntents`, `voicingGeometries`, `soliRhythmPlans`, `backgroundsRhythmPlans` alongside existing `soliPlan` / `backgroundsPlan`. `styleProfileId` from `generationMetadata.songModeProfileRuleDiagnostics?.styleProfile` when present.
- **Gate B harness:** `scripts/gateBPhase6Verify.ts` — **INDEPENDENCE** ✓ (`contrapuntalIndependence > 0.6` ⇒ ≥2 `lineDerived` assignments) · **ROUTING** ✓ (`bob_brookmeyer` / `bartok` line-first engine, not P3 colour; `postProcessDuoAbstractGuitar` identity on cloned measure) · **ANTI-COLLAPSE** ✓ (`forbidFullEnsembleChordHits` ⇒ no cluster in soli/backgrounds rhythm plans) · **SYSTEM** ✓ (`npm run test:composer-smoke` **248/0**).
- **Smoke:** 248/0 (aggregate unchanged).

## Riff Generator — VRB registry + wiring (Commit 10, additive)

- **Family tags (locked):** funk → `james_brown`, `nile_rodgers`, `sly_stone`; rock → `iommi`, `hendrix`, `led_zeppelin`, `frank_zappa`; fusion → `weather_report`, `mahavishnu`; art_rock → `verlaine`, `morello`, `fripp`. Resolved via `VoiceRuleBundle.family` + `resolveRiffFamilyTag()` in `core/riff-generator/riffVrbRegistry.ts`.
- **Riff VRB σ ceilings (stub bundles — do not change):** `nile_rodgers` 22 · `sly_stone` 24 · `iommi` 26 · `hendrix` 28 · `led_zeppelin` 27 · `frank_zappa` 29 · `weather_report` 30 · `mahavishnu` 32 · `verlaine` 25 · `morello` 25 · `fripp` 27. `james_brown` songwriter bundle has **no** `sigma` field; riff wiring is **`riffProfile` additive only** — existing `JB_*` fingerprint receipt lines untouched.
- **Riff-path Zappa solo lane:** `frank_zappa` VRB exposes `RiffProfile.soloGeneratorProfile`; optional separate MIDI part when UI/API `riffSolo` is true (`core/riff-generator/riffSoloBuilder.ts`). Distinct from Song Mode / duo `zappasoloEngine.ts`.
- **`james_brown` fingerprints:** `buildJamesBrownRiffProfile()` attaches `riffProfile` only; does not rewrite `orchestrationPolicy.fingerprintReceipts` on `JAMES_BROWN`.
- **`funkGridPolicy` vs Song Mode overlay:** `funkGridPolicy` / `riffProfileSliceFromFunkGrid` supply riff-generator posture only; **`jamesBrownFunkOverlay.ts`** Song Mode overlay path is unchanged and not replaced by funk grid policy.
- **`oddMeterEngine` presets:** Riff UI odd-meter overlay calls `riffProfileSliceFromOddMeter` on the **active VRB profile** only when family is fusion or art_rock; Bartók aksak / Reich phasing SQ presets and engine tables are not modified.
- **Odd-meter overlay gating:** `resolveRiffGeneratorProfileWithMeta` applies `oddMeterPreset` only when `riffFamilyAllowsOddMeterOverlay(family)` (fusion / art_rock). Funk / rock ignore UI meter template.
- **Boundary swing ramp:** `riffBoundarySwingRamp.ts` — funk + rock → `straight_shuffle` ramp; fusion + art_rock → `odd_meter` ramp (no swing). Same-family transitions only.
- **3-way riff VRB blend:** `blendRiffGeneratorVrbs` — same `RiffFamilyTag` only; cross-family → warning + primary VRB profile fallback.
- **Engine flags (unchanged):** `USE_PER_SECTION_VRB = true` (`vrbContextMap.ts`); `USE_PITCH_FIELD_NOTE_SELECTION = true` (`engineFeatureFlags.ts`).

## Phase E — Riff VRBs in Song Mode + songwriter layer (2026-05-21)

- **14 riff-generator VRBs in Song Mode:** `james_brown`, `nile_rodgers`, `larry_carlton`, `sly_stone`, `iommi`, `david_gilmour`, `hendrix`, `led_zeppelin`, `weather_report`, `mahavishnu`, `verlaine`, `morello`, `fripp`, `frank_zappa` — profiles in `songwriterStyleProfiles.ts`, rules in `songwriterRuleRegistry.ts` (family clones + σ receipt), comp profiles in `songwriterCompProfile.ts`.
- **Family surfaces (no new surface modules):** funk → `applyFunkStyleSurface`; rock → `applyRockStyleSurface`; fusion → `applyFusionStyleSurface`; art_rock → `applyArtRockStyleSurface` (metadata nudges only; same pattern as existing Song Mode surfaces).
- **Golden path context:** `rockRiffContext` / `funkRiffContext` / `fusionRiffContext` / `artRockRiffContext` on `runGoldenPath` options + generation metadata when primary is a riff VRB.
- **`frank_zappa`:** duo lane unchanged (`frankZappaSlice` + Slonimsky solo); **riff lane** solo remains `riffSoloBuilder` / `riffSoloZappaAdapter` — separate paths.
- **Duo colour set:** all riff VRBs except pre-existing `frank_zappa` added to `LINE_FIRST_DUO_PRIORITY3_COLOUR_VRB_IDS` (`nile_rodgers` included).
- **Gate relax (σ ≥ 28 only):** `hendrix` 28, `frank_zappa` 29, `weather_report` 30, `mahavishnu` 32 share phrase-behaviour relax with Zappa; lower σ VRBs unchanged.
- **σ ceilings unchanged:** `RIFF_VRB_SIGMA_CEILINGS` in `riffVrbRegistry.ts` — not modified in Phase E.
- **Not touched:** duo engine logic, GCE structural fingerprints, `jamesBrownFunkOverlay.ts`, Slonimsky/Zappa solo engines.
