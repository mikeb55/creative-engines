# Composer OS Roadmap [2026-05-05]

**Canonical handoff doc for assistants (e.g. Claude).** Detail also lives in [CHANGELOG.md](CHANGELOG.md), [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md), and [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md). **Update this file’s title date** when you refresh the roadmap. **Latest sequencing hint:** section **Next 3 development sessions** below — **`repeatMarkers` → MusicXML export truth** (**DONE** Session 1, 2026-05-03: optional **`ScoreModel.repeatMarkers`**, **`musicxmlExporter`** forward/backward **`barline`**); next → Fagen/Evans odd meter → import stress or SD3 Big Band validation. **MusicXML `<transpose>`** for fixed-offset tunings (**Drop D** / **Eb standard**) is **COMPLETE** (2026-05-04).

**Convention:** Whenever the user asks for a “roadmap,” use the title **`Composer OS Roadmap [YYYY-MM-DD]`** (snapshot date, typically today) and align content with this file or replace sections intentionally.

### Session 1 — repeatMarkers → export truth (**DONE**, 2026-05-03)

- **`ScoreModel.repeatMarkers`** (`ScoreRepeatMarker`: `repeat_start` | `repeat_end`, 1-based bar) — optional; **`musicxmlExporter`** emits **`heavy-light` / `light-heavy`** barlines + **`repeat`** forward/backward when present.
- **Stress:** **`realBookStressTest.test.ts`** — 8-bar section ×2 via **`applyRepeatTruthToScoreModel`**, export asserts **`direction="backward"`**.

---

## Known issues — engine (2026-04-29)

- **`ecm_chamber` golden path — heap pressure (mitigated):** **`runGoldenPath.ts`** caps the duo-lock **variant seed sweep** for **`ecm_chamber`** via **`ecmChamberVariantSweepLimit(totalBars)`** — **≥32 bars → 1** candidate seed, **16–31 → 2**, **≤15 → 3** (missing/invalid bar count defaults as **32** → **1**). Non-ECM presets still use the full **6-offset** sweep (**`GOLDEN_PATH_VARIANT_SEED_OFFSETS`**). Very heavy single-process batches may still warrant **`GCE_SINGLE_PRESET`** as a safety valve. Code: **`engines/composer-os-v2/core/goldenPath/runGoldenPath.ts`**.
- **GCE v2.0 preset benchmark (2026-04-19):** Non-ECM presets **7.8–8.1/10** overall (seed **50021**, 32 bars, 100 BPM); universal weakest pillar **Melodic Identity**. **`ecm_chamber`** long-form runs use the bounded sweep above; if heap exhaustion persists, batch presets (**`GCE_SINGLE_PRESET`**) or raise Node heap before assuming an unfixed engine bug. Tables: [GCE_FRAMEWORK_V2.md](GCE_FRAMEWORK_V2.md), [CHANGELOG.md](CHANGELOG.md).

---

## Product notes — Bacharach & Donald Fagen: UI grouping vs implementation (2026-04-29)

- **Generate UI** (`apps/composer-os-app` Songwriter dropdown): **all 19** golden-path **Shipped (full slice)** writers — including **Donald Fagen** and **Bacharach** — are listed under **Shipped (full slice)** (**`HomeGenerate.tsx`**, **2026-04-29** audit). **Engine** ships **full golden-path slice** packaging (**`donaldFagenSlice.ts`**, **`precomputeDonaldFagenEffectiveHarmonyBars`**, **`df:*` receipts**, export/disk truth, **`donaldFagenSliceSmoke.test.ts`**); **Bacharach** matches (**`bacharachSlice.ts`**, **2026-04-29**).
- **Engine status:** Both writers already ship **real** Song Mode behaviour — registry/rules, surfaces, harmony/guitar passes, **`eval:bacharach`** / **`eval:fagen`**, Bacharach harmony dressing & surfaces, Fagen keys-comp / rhythm overlays / sophisticated-pop hooks — i.e. **not** placeholder or compile-only rows.
- **Gap:** **Architectural / marketing** alignment with the **newest slice template**, not absence of music pipeline behaviour.
- **Parity refactor** (repackage to full **`\*Slice.ts`** pattern): **not a quick win** — budget **days+ per writer**; treat as **normal scheduled work**. **Optional** unless the goal is **one maintenance pattern** or **parity** with Pat Metheny–style receipts/tests.
- **When to skip parity:** Current outputs meet product needs; prioritize **new writer territories** or other **Priority stack** items.
- **When to schedule parity:** Team wants **one canonical slice pattern** and **regression** coverage aligned with the newest shipped slices.

---

## Songwriter — `bill_evans` registry + slice (2026-04-29)

- **`bill_evans`** is a first-class **`SongwriterRuleId`** with **registry rules**, **`SONGWRITER_STYLE_PROFILES`** entry, **`songwriterCompProfile`** (**keys**), **`normalizeSongwriterStyleKey`** alias, and **`SONGWRITER_PRIMARY_INSTRUMENT`** — Song Mode **`resolveSongwritingStyles`** / compiled song planning resolve it like other catalogue ids ( **`songwritingResearchTypes.ts`**, **`songwriterRuleRegistry.ts`**, **`songwriterStyleProfiles.ts`**, **`songwriterCompProfile.ts`** ).
- **Shipped:** **`billEvansSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/billEvansSlice.ts`**) + **`billEvansSliceSmoke.test.ts`** — see **Shipped slices** / **Current** for latest **`test:composer-smoke`** aggregate PASS count.
- **Generate UI:** Bill Evans remains grouped where product placed it; duo golden-path generation uses the slice + export/disk truth like other shipped writers.

---

## User documentation (2026-04-17)

- **[USER_GUIDE.md](USER_GUIDE.md)** — first-time user guide: what the app does **now**, local run commands, Generate workflow, MusicXML locations, Wyble ON/OFF **CLI** (not a UI toggle), limitations; **engine test baseline** for developers.
- **[TEST_DEBT_COMPOSER_OS_V2.md](TEST_DEBT_COMPOSER_OS_V2.md)** — `engines/composer-os-v2` **must-stay-green** npm scripts vs **`npm test`** debt (2026-04-17 snapshot).
- **Root [README.md](../README.md)** — short overview + links to the guide.
- **In-app:** **Help** tab (`apps/composer-os-app/src/pages/UserGuide.tsx`) mirrors the guide for discoverability.
- **Windows local dev shortcut (2026-04-17):** **`scripts/create-composer-os-desktop-shortcut.ps1`** creates Desktop **`Composer OS Dev Launcher.lnk`** (name **Composer OS Dev Launcher**) → **`scripts/launch-composer-os.bat`** → **`scripts/vite-dev-launcher.ps1`** runs **`npm run dev --prefix apps/composer-os-app`** and prints a framed **OPEN THIS IN YOUR BROWSER** block plus numbered **Next steps** when Vite emits **`Local:`** (any port; no auto-open). Not an installer; dev console stays open. Rename a packaged **`Composer-OS.exe`** shortcut to **`Composer OS Release`** to avoid confusion.

---

## Product scope (Composer OS V2)

- **Core:** `engines/composer-os-v2/` — single pipeline: preset → planning → score → MusicXML → gates → readiness.
- **Apps:** `apps/composer-os-app`, `apps/composer-os-desktop` — call **app API** (`app-api/`), not raw core only.
- **Modes matrix (honest):** see `app-api/releaseMetadata.ts` — duo / ECM / Song Mode / riff / Wyble / **Big Band** / **String Quartet** = **full ensemble MusicXML** (**planning JSON** fallback on failure). **String Quartet** is **COMPLETE** (strings + piano harmony staff, section markers, chord symbols on piano, import fix for `SQ_PART_*`). **Big Band + String Quartet:** piano part-list naming (`Piano` / `Pno.` / `keyboard.piano`, MIDI ch. 1 program 1) and **Song Form** + bar-length select (**16 / 24 / 32 / 40 / 48 / 64**, 2026-04-15) wired in Generate.
- **MusicXML lead-sheet import for ensembles (Big Band / String Quartet):** **shipped** — optional MusicXML file drives bar-accurate chord symbols; harmony modes **free / lock / blend**; behavioural hints extracted as advisory metadata (see [USER_GUIDE.md](USER_GUIDE.md) **What’s New — May 2026**). **Song Mode** chart-first workflows may still use typed chord rows; deeper shared **`LeadSheet`** unification across *all* presets remains iterative (see **Priority stack** item **4**).
- **Song Mode — writers & arrangers:** `core/song-mode/` ships a **typed songwriter + arranger rule catalogue** (registry + resolution + optional **songwriter × arranger** pairing). Full detail under **Past → Songwriters & arrangers**; **Generate UI** still lighter than the engine surface (see **Current** / **Future**).

## Motif Development Plan (Phase 1)

### Motivation

- Motif development is one of the few cross-cutting quality levers that can improve coherence across Song Mode, core composer paths, hybrids, and ensemble realizations.
- Composer OS already has **Motif Authority V1**, but today it is still narrow and uneven in impact/surfacing.
- Product direction is intentionally bounded: incremental, inspectable motif governance rather than a broad "motif everywhere" rewrite.

### Phase 1 implementation scope (bounded pilot)

- **Song Mode pilot writers:** `wayne_shorter`, `barry_harris`, `donald_fagen`, `bacharach`.
- **Hybrid pilot:** melody identity from Wayne Shorter + Barry Harris harmony stack.
- **Ensemble pilot:** `ecm_chamber`.

### Motif Authority levels

- **Off** — no motif-development guarantee.
- **Soft** — at least one recognizable core cell should recur with light variation.
- **Strong** — piece should be built from a small motif set with explicit recurrence/transformation across the form.

### Diagnostics / inspectability targets

- Receipts / `_meta` / run manifests should expose:
  - `motifAuthorityLevel`
  - core-cell established/detected flag
  - recurrence estimate / recurrence summary
  - transformation summary
  - dev-facing motif coherence metric
- If a path cannot produce richer detail yet, summaries should be partial and explicit rather than invented.

### Out of scope for Phase 1

- Universal rollout to all engines/presets in one pass.
- Altered guitar tuning governance.
- Full Big Band motif governance.
- Deep Bartok/Ligeti/Zappa motif system integration.
- Broad UI redesign beyond minimal dev-facing inspectability.

---

## Past (delivered)

### T2.17 — Pat Metheny (ECM / PMG modal–Lydian) full-slice songwriter profile (2026-04-28)

- **Complete:** Chord pool **`SONGWRITER_CHORD_POOLS.pat_metheny`** preserved in **`songModeBuilder.ts`** (existing maj9 / #11 / add9 / sus / slash vocabulary — not replaced). Duo golden-path slice (**`song-mode/patMethenySlice.ts`** + **`generateGoldenPathDuoScore.ts`** precompute / accumulate / finalize), **five devices** with **`pm:*`** receipts and **`patMethenyEffectiveHarmonyBars`** / **`getChordForBar`** integration. Anti-elaboration guards (ii–V–I, dominant chain, 2-bar hold, blues-dominant strip). **Pipeline:** **`runGoldenPath.ts`** + **`composerOsAppGeneration.ts`** pass effective bars into MusicXML **`assertLockedHarmonyBars`** and disk **`validateLockedHarmonyMusicXmlTruthFromFile`** (same pattern as Radiohead / Sonic Youth). Metadata (**`patMethenyDiagnostics`**, **`patMethenySliceReceipt`**, **`patMethenyEligibilityStats`**) + manifest echo. Smoke (**`patMethenySliceSmoke.test.ts`**). **Eval:** **`npm run eval:pat_metheny`** (**`scripts/runPatMethenySongModeEval.ts`**). **Eligibility + rates:** duo **`A'`**/**`A''`** section tagging, **d5** includes **chorus**, seeded **d2/d4/d5** probabilities tuned for eval pass vs eligible pools; **probe:** **`npm run probe:pat-metheny-eligibility`** (**`--prefix engines/composer-os-v2`** from repo root). See [CHANGELOG.md](CHANGELOG.md) § **[2026-04-28] Pat Metheny — full Song Mode slice (`patMethenySlice.ts`)** and § **[2026-04-28] Pat Metheny — eligibility gates + device rate tuning (`patMethenySlice.ts`)**. **`test:smoke`** **40** passed / 0 failed.
- **Priority 1 (songwriter profiles):** **`pat_metheny`** full golden-path slice **complete** — see **Priority stack** item **1**.

### T2.16 — Sonic Youth (dual-guitar / alternate-tuning noise harmony) full-slice songwriter profile (2026-04-28)

- **Complete:** Chord pools (**`SONGWRITER_CHORD_POOLS.sonic_youth`** — **Emadd9**, slash pedals, **sus2**/**sus4**, **#11**, **7sus**/**alt** vocabulary in short asymmetric rows), duo golden-path slice (**`song-mode/sonicYouthSlice.ts`** + **`generateGoldenPathDuoScore.ts`** precompute / accumulate / finalize / **`applySonicYouthGuitarBarPasses`**), **`sy:*`** device receipts + **`sonicYouthEffectiveHarmonyBars`** / **`getChordForBar`** integration (truth / export / manifest aligned with Joni Mitchell). Optional **`ChordEvent.sonicYouth`** metadata uses **`sonicYouthChordTypes`** / **`sonicYouthChordGuards`** only. Metadata (**`sonicYouthDiagnostics`**, **`sonicYouthSliceReceipt`**) + manifest echo. Smoke (**`sonicYouthSliceSmoke.test.ts`**). **Eval:** **`npm run eval:sonic_youth`** (**`scripts/runSonicYouthSongModeEval.ts`**). See [CHANGELOG.md](CHANGELOG.md) § **[2026-04-28] Sonic Youth — full Song Mode slice (`sonicYouthSlice.ts`)**. **`test:smoke`** **40** passed / 0 failed (after **T2.17** Pat Metheny smoke; was **39** at Sonic Youth ship).

### T2.15 — Joni Mitchell (modal open-tuning) full-slice songwriter profile (2026-04-28)

- **Complete:** Chord pools (**`SONGWRITER_CHORD_POOLS.joni_mitchell`** — **Dadd9**, **Gsus2**, **Asus4**, **Fadd9** / **Fmaj(add9)** colour, **Cadd9**, **G6/9**, **Bm11**, **Em(add9)**), duo golden-path slice (**`song-mode/joniMitchellSlice.ts`** + **`generateGoldenPathDuoScore.ts`** precompute / accumulate / finalize), **five devices** with **`jm:*`** receipts and **`joniMitchellEffectiveHarmonyBars`** / **`getChordForBar`** integration (truth / export / manifest aligned with Radiohead / James Brown). Anti-elaboration guards (dominant strip, ii–V–I flatten, 2-bar hold, cadence mute). Tuning pattern strings (**`x57543`**, etc.) on slice metadata only — **not** on shared **`ChordEvent`**. Metadata (**`joniMitchellDiagnostics`**, **`joniMitchellSliceReceipt`**) + manifest echo. Smoke (**`joniMitchellSliceSmoke.test.ts`**). **Eval:** **`npm run eval:joni_mitchell`** (**`scripts/runJoniMitchellSongModeEval.ts`**). See [CHANGELOG.md](CHANGELOG.md) § **[2026-04-28] Joni Mitchell — full Song Mode slice**. **`test:smoke`** **38** passed / 0 failed. **Known debt:** **d5** **`modal_centre_shift`** may not fire on typical harness seeds (bridge gate).
- **Priority 1 (songwriter profiles):** **`joni_mitchell`** full golden-path slice **complete** — see **Priority stack** item **1**.

### T2.14 — James Brown (funk/soul dominant-centre) full-slice songwriter profile (2026-04-28)

- **Complete:** Chord pools (**`SONGWRITER_CHORD_POOLS.james_brown`** — **E9**, **D7**, **F9**, **Bb9**, **A9**, **G7**, **I7→IV7** bridge rows), duo golden-path slice (**`song-mode/jamesBrownSlice.ts`** + **`generateGoldenPathDuoScore.ts`** precompute / accumulate / finalize; **`applyJamesBrownGuitarBarPasses`** when comp **`ChordEvent`s exist), **five harmonic devices** with **`jb:*`** receipts and **`jamesBrownEffectiveHarmonyBars`** / **`getChordForBar`** integration (truth / export / manifest aligned with Radiohead / Stevie / Brian Wilson). Anti-elaboration guards (**`reharmBlock`**, **`extensionBeyond13`**, **`turnaroundBlock`**). Metadata (**`jamesBrownDiagnostics`**, **`jamesBrownSliceReceipt`**) + manifest echo. Smoke (**`jamesBrownSliceSmoke.test.ts`**). **Eval:** **`npm run eval:james_brown`** (**`scripts/runJamesBrownSongModeEval.ts`**). See [CHANGELOG.md](CHANGELOG.md) § **[2026-04-28] James Brown — full Song Mode slice (`jamesBrownSlice.ts`)**. **`test:smoke`** **37** passed / 0 failed (historical at ship; **T2.15** raises count to **38**).
- **Priority 1 (songwriter profiles):** **`james_brown`** full golden-path slice **complete** — see **Priority stack** item **1** and **Future → Songwriter profiles — priority 1**.

### T2.13 — Radiohead (OK Computer / Kid A era) full-slice songwriter profile (2026-04-28)

- **Complete:** Chord pools (**`SONGWRITER_CHORD_POOLS.radiohead`**), **`radiohead`** **`SONGWRITER_STYLE_PROFILES`** update (low form regularity, high harmonic ambiguity, low syncopation, Phrygian/Aeolian, stepwise / restricted range, slow harmonic rhythm), duo golden-path slice (**`song-mode/radioheadSlice.ts`** + **`generateGoldenPathDuoScore.ts`** precompute/accumulate/finalize; no extra guitar pass), **five harmonic devices** with **`rh:device*`** receipts and **`radioheadEffectiveHarmonyBars`** / **`getChordForBar`** integration (devices over **full-form locked** harmony; same truth/export/manifest pattern as Stevie Wonder). Metadata (**`radioheadDiagnostics`**, **`radioheadSliceReceipt`**) + manifest echo. Smoke (**`radioheadSliceSmoke.test.ts`**). **Eval:** **`npm run eval:radiohead`** (**`scripts/runRadioheadSongModeEval.ts`**). See [CHANGELOG.md](CHANGELOG.md) § **[2026-04-28] Radiohead full-slice songwriter profile**. **`test:smoke`** 36 passed / 0 failed.

### T2.12 — Stevie Wonder (classic period 1972–1976) full-slice songwriter profile (2026-04-28)

- **Complete:** Chord pools (**`SONGWRITER_CHORD_POOLS.stevie_wonder`**), **`stevie_wonder`** **`SONGWRITER_STYLE_PROFILES`** entry (syncopation / modal bias / pentatonic / irregular phrases), duo golden-path slice (**`song-mode/stevieWonderSlice.ts`** + **`generateGoldenPathDuoScore.ts`** **`buildSongwriterMelodyProfile`** + **`applyStevieWonderGuitarBarPasses`**), **five harmonic/melodic devices** with **`sw:device*`** receipts and **`stevieWonderEffectiveHarmonyBars`** / **`getChordForBar`** integration (devices over **full-form locked** harmony; truth/export/manifest aligned with Brian Wilson pattern). Metadata (**`stevieWonderDiagnostics`**, **`stevieWonderSliceReceipt`**) + manifest echo. Smoke (**`stevieWonderSliceSmoke.test.ts`**). **Eval:** **`npm run eval:stevie_wonder`** (**`scripts/runStevieWonderSongModeEval.ts`**). See [CHANGELOG.md](CHANGELOG.md) § **[2026-04-28] Stevie Wonder (1972–1976) full-slice songwriter profile**. At ship: **`test:smoke`** 35 passed / 0 failed (see **T2.13** for current smoke count).

### T2.11 — Brian Wilson (Pet Sounds era) full-slice songwriter profile (2026-04-28)

- **Complete:** Chord pools (**`SONGWRITER_CHORD_POOLS.brian_wilson`**), updated **`brian_wilson`** **`SONGWRITER_STYLE_PROFILES`** entry, duo golden-path slice (**`song-mode/brianWilsonPetSoundsSlice.ts`** + **`generateGoldenPathDuoScore.ts`** **`buildSongwriterMelodyProfile`** + guitar passes), **five Pet Sounds harmonic devices** (chromatic-bass ø7, inverted V, verse ♭VII vs IV, tonic major→**i7** mixture, semitone-down section modulation) with **`bw:device*`** receipts and **`brianWilsonEffectiveHarmonyBars`** / **`getChordForBar`** integration (**`harmonyResolution.ts`** — devices fire over **full-form locked** Song Mode harmony; truth/export/manifest aligned). Metadata receipts (**`brianWilsonPetSoundsDiagnostics`**, **`brianWilsonPetSoundsSliceReceipt`** on **`GenerationMetadata`** + manifest echo), smoke coverage (**`brianWilsonPetSoundsSliceSmoke.test.ts`**). **Eval harness:** **`npm run eval:brian_wilson`** (**`scripts/runBrianWilsonSongModeEval.ts`**) — **`brian_wilson`** vs **`carole_king`** neutral baseline (default 5 seeds), CSV + markdown under **`output/brian-wilson-eval/`**, **`buildBatchSectionShapingAbMarkdown`** section-shaping A/B. See [CHANGELOG.md](CHANGELOG.md) § **[2026-04-28] Brian Wilson — Pet Sounds era full-slice songwriter profile** and § **[2026-04-28] fix: Brian Wilson Pet Sounds devices over full-form locked Song Mode harmony**. **`test:smoke`** 34 passed / 0 failed.

### T2.10 — Phrase Engine Stage 4 — motif augmentation / compression / displacement (2026-04-28)

- **`applyDuoGoldenPhraseEngineStage4MotifRhythm` — complete:** Duo golden-path **guitar voice 1** only (**`phraseBuilder.ts`** → **`buildGuitarPart`** / **`generateGoldenPathDuoScore.ts`** **before** **`duoBoostPhraseEndLanding`** / **`duoEnforcePhraseEndCadence`**, same **`isDuoGolden`** block). Within each 4-bar cycle (**1-indexed bars**): **phrase 2** (**`b % 4 === 2`**) **compression** (½ durations on grid); **phrase 3** (**`b % 4 === 3`**) **augmentation** (×2 durations) only when doubled rhythm fits in-bar without overlap; **phrase 4 / cadence** (**`b % 4 === 0`**) **displacement** (+½ beat to every v1 onset; notes pushed past the bar end removed). **Phrase 1** unchanged. **At most one** of these per bar — bar position chooses the transform (no stacking). **Indie Art Pop dual-electric** skips Stage 4 (**same gate as Stage 3:** **`skipPhraseEngineStage3Anticipation`**). **`test:smoke`** **33 passed / 0 failed**. No new pipeline stage; **Stage 2 / Stage 3 / cadence** logic untouched.

### T2.9 — Wyble parity: B-category `isGuitarBassDuoFamily` guard replacement (2026-04-28)

- **Complete:** Replaced remaining literal **`presetId === 'guitar_bass_duo'`** / **`!==`** guards that belong to the guitar–bass duo **family** with **`isGuitarBassDuoFamily(context.presetId)`** (matching Category-A patterns), including Song Mode overlays, ECM-style duo texture, duo pipeline truth helpers, **`ecmShapingPass`** post-orchestration VL, **`jamesBrownFunkOverlay`**, **`duoMusicalQuality`** / **`duoLockQuality`** exceptions, and **`generateComposition`** / **`listOutputs`** pilot labels. **`test:smoke`** **33 passed / 0 failed** after change. **`docs/TEST_DEBT_COMPOSER_OS_V2.md`** B-category row marked complete.

### T2.8 — `runAllTests` stability — heap + chunked harness (2026-04-28)

- **`runAllTests.ts` — complete:** Orchestrates **four sequential** Node runs (`tests/runAllTestsChunk1.ts`–`Chunk4.ts`) so the full matrix does not load every suite module in one process; each child uses **`--max-old-space-size=4096`**. Shared loop in **`tests/harness/runHarnessMain.ts`**. **`test:smoke`** remains **`runSmokeTests.ts`** (unchanged). **`docs/TEST_DEBT_COMPOSER_OS_V2.md`** updated. No composer/generation logic changes.

### T2.X — Eval harness `songModeSectionShapingDiagnostics` A/B markdown (2026-04-28)

- **Complete:** Shared **`scripts/eval/songModeSectionShapingEvalTable.ts`** parses existing manifest JSON (no schema changes). **`npm run eval:fagen`**, **`eval:bacharach`**, **`eval:style-soph-pop`** append wide per-seed tables (aggregate + per-section **`phraseType`**, **`cadenceBar`**, **`anticipationCount`**, **`motifTransform`**) with A/B columns aligned field-by-field for diffing. Eval/read-only — no composer logic changes.

### T2.7 — Wayne Shorter — chorus/bridge controlled motif development (2026-04-28)

- **`applyWayneShorterChorusBridgeMotifDevelopment` — complete:** After **`buildGuitarPart`** in **`generateGoldenPathDuoScore.ts`**, for **`songwriterStyleId === 'wayne_shorter'`** only, **one** **seed-deterministic** transform per **chorus** or **bridge** form section (**not** verse / intro): **(1)** shift voice-1 motif onset **+1 beat**, **(2)** augment rhythm (double durations within the bar), or **(3)** widen leaps (intervals **≥ a 4th**) by **±1 semitone** on the second note — **never combined** per section. Receipts merged into **`motifDevelopmentSummary.transformationSummary`** (`motifAuthorityV1.ts`). No new pipeline stage.

### T2.6 — Phrase Engine Stage 3 — controlled anticipation (2026-04-28)

- **`applyDuoGoldenPhraseEngineStage3Anticipation` — complete:** Duo golden-path **guitar** (**`phraseBuilder.ts`** → **`generateGoldenPathDuoScore.ts`**): at most **one** **voice-1** onset per measure may shift **earlier by exactly one eighth-note beat** (half a quarter in 4/4 beat units); **deterministic** candidate choice via **`seed`** / **`seededUnit`**; **skipped** on cadence bars (**`b % 4 === 0`**). Collision-safe against other voice-1 spans; **`normalizeMeasureToEighthBeatGrid`** after apply. **Indie Art Pop dual-electric** route skips Stage 3 (**`skipPhraseEngineStage3Anticipation`**) so **`guitar_2`** chord-density smoke thresholds stay stable. No new pipeline stage.

### T2.5 — Duo golden path bar-4 cadence + Phrase Engine Stage 2 (2026-04-28)

- **`duoEnforcePhraseEndCadence` — complete:** On **guitar–bass duo golden path**, phrase-end cadence runs on **every** 4-bar boundary (**`b % 4 === 0`**, 1-indexed bars): **lengthens** the final **voice-1** note toward the next attack / bar end, then **snaps** melody pitch to the **nearest chord tone** (root / 3 / 5 / 7) in register. Wired in **`generateGoldenPathDuoScore.ts`** after **`duoBoostPhraseEndLanding`** on duo golden paths (Song Mode hook runtime branch and main **`isDuoGolden`** branch).
- **Phrase Engine Stage 2 — complete:** **4-bar phrase-type sequencing** and **inter-phrase contrast** via **`PhraseSequencingType`** (**`phraseTypes.ts`**) and **`duoGoldenPathPhraseIntentAtBar`** / **`phraseSequencingTypeFromIntent`** (**`phraseBuilder.ts`**): **(1)** no two consecutive 4-bar phrases share the same **`PhraseSequencingType`**; **(2)** after a **cadence landing**, the **next phrase** starts with **question / departure** sequencing (cadence / arrival intents replaced on that downbeat); **(3)** **deterministic** (**seed**-driven `seededUnit` only); **guitar** and **bass** both call **`duoGoldenPathPhraseIntentAtBar(seed, bar)`** so **`PhraseIntent`** stays **aligned**. No new pipeline stage.

### T2.4 — Lead-sheet MusicXML Import (Phase 1 vertical slice) (2026-04-22)

- Added a minimal shared `LeadSheet` import model for future realization handoff (`core/lead-sheet/leadSheetTypes.ts`).
- Added bounded `score-partwise` importer (`core/lead-sheet/leadSheetMusicXmlImport.ts`) for:
  - title/composer/tempo, first time/key signature
  - harmony tags as chord events
  - single-line first-part voice-1 melody note events
  - rehearsal labels and simple repeat/ending markers when present
- Unsupported complexity is handled with explicit warnings (extra parts, multi-voice melody, lyrics, stacked note chords), keeping behaviour deterministic and production-safe.
- Added deterministic parser tests (`tests/leadSheetMusicXmlImport.test.ts`) and wired suite into harness.
- No realization integration yet (String Quartet / Big Band import-fed realization remains a later stage).

### T2.3 — Motif Development Phase 1 pilot slice (2026-04-22)

- Added explicit `motifAuthorityLevel` semantics (`off`/`soft`/`strong`) while keeping existing Motif Authority V1 safety posture feature-flagged.
- Implemented bounded pilot-path motif inspectability fields (`motifDevelopmentSummary`) on generation metadata, run manifests, and `_meta` output manifests for:
  - Song Mode pilot writers: Wayne Shorter, Barry Harris, Donald Fagen, Bacharach
  - Hybrid pilot: Wayne melody identity + Barry harmony stack
  - ECM Chamber pilot
- Tightened pilot activation to explicit whitelist context (no broad preset-family unlock).
- `off` now emits minimal honest summary semantics (no motif-development guarantee) rather than rich motif-development claims.
- Hybrid `motifLedPrimaryIdentity` now requires minimal recurrence/coherence evidence.
- Hardening/validation update: motif transformation summaries now explicitly report return-anchor nudge attempted/applied/reverted state for pilot routes.
- Added focused deterministic harness coverage for pilot metadata/manifest assertions (`tests/motifAuthorityPilotSlice.test.ts`).

### T2.2 — Eval diagnostics for riff + duo (`riffEvalDiagnostics` / `duoEvalDiagnostics`) (2026-04-21)

- **Purpose:** Lightweight **symbolic readouts** (interval/contour/rhythm aggregates, riff quality closure row, preset/Wyble/duo-quality snapshots) so repeatability improves without changing generation, scoring exports, or Wyble wiring.
- **Where:** `engines/composer-os-v2/core/diagnostics/riffEvalDiagnostics.ts`, `duoEvalDiagnostics.ts`; CLIs **`npm run eval:riff-diagnostics`** / **`npm run eval:duo-diagnostics`** under `engines/composer-os-v2`; harness **`tests/evalDiagnosticsHarness.test.ts`** (suite **Eval diagnostics harness (T2.2)**). Duo CLI prints **preset/Wyble classification for all ids**; raw **`song_mode`*** golden snapshots are skipped in this dev CLI (use app Generate for full Song Mode compile).
- **Docs:** Short note appended to **`docs/dev-notes/short-riff-quality-2026-04-21.md`** pointing at riff CLI + metrics.
- **Validation:** Same npm **`test:fast`** / **`test:full`** green after add; symbolic metrics complement listening — they do not replace ear checks.

### T2.1 — Wyble / duo family parity (`isGuitarBassDuoFamily`) (2026-04-21)

- **Problem:** `isGuitarBassDuoFamily` only listed the two literal jazz duo preset strings, so **`song_mode`** (and any future `song_mode_*` id) was not treated as the same **guitar + bass** structural family for **portable Wyble** (`wybleVoiceLayoutForPreset` → `WYBLE_ROLE_MAP_DUO_FAMILY`), **Wyble consumption receipts**, `generateComposition` duo-style harmony/chord-diagnostics gating, and other `isGuitarBassDuoFamily` call sites — even though `presets/songModePreset.ts` uses the same two-instrument stack and the app’s Song Mode run often injects `guitar_bass_duo` for the actual `runGoldenPath` call.
- **Change:** `guitarBassDuoPresetIds.ts` now includes **`isSongModeFamily`** (`song_mode` + `song_mode_*`) inside **`isGuitarBassDuoFamily`**. `duoMusicalQuality` rest-ratio exception uses the same family helper. **No JS mirror** (TypeScript-only module); no new features.
- **Tests:** `engines/composer-os-v2/tests/guitarBassDuoFamilyParity.test.ts` (harness suite **Guitar–Bass Duo family parity (T2.1)**) + doc note in `docs/wyble-targets/portable_wyble_voice_layout.md`.
- **Validation:** `npm --prefix engines/composer-os-v2 run test:fast` and `test:full` after this change; desktop `npm --prefix apps/composer-os-desktop run desktop:package-no-bump` (packaging + `start` to `Composer-OS.exe`).

### Reinforced (2026-04-17 — updated 2026-04-19)

- **Song Mode — Wayne Shorter chord pools + row metadata (2026-04-19):** **`wayne_shorter`** verse/chorus rows use **`{ chords, tags }`** (`tension`, `motion`, `cadential`, `pedal`) as scaffolding for future contextual selection; row choice remains **seed modulo** (same path as other writers). Rules-based **`wayneShorterChordRowScore`** removed. See [CHANGELOG.md](CHANGELOG.md), `songModeBuilder.ts`.

- **Song Mode — Burt Bacharach slice + developer tooling (2026-04-18):** Primary **`bacharach`** harmony dressing + diagnostics; **`npm run workflow:bacharach`** / **`eval:bacharach`** / **`mine:bacharach`** from repo root (batch A/B vs neutral, GCE-style diagnostic scoring **not** a gate); reference mining under **`reference/bacharach/`**. See [CHANGELOG.md](CHANGELOG.md), [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md).
- **Song Mode — shared section-aware control layer (2026-04-18):** **`songModeSectionTypes`** / **`songModeSectionControl`** — form-relative **`SongModeSectionRole`** (reuse **`sectionKindForBar`**), optional **outro** tail on long forms, **`SongModeSectionBehaviourDescriptor`** registrations from **Donald Fagen**, **Bacharach**, and **`STYLE_SOPHISTICATED_POP`** surfaces; **`finalizeSongModeSectionShaping`** aggregates **`songModeSectionShapingDiagnostics`** (B vs A colour/density proxies, opening vs return, return-variation summary) into **`RunManifest`**, **`_meta`**, and **`songModeStyleSurfaceNotes`**. Tests: **`tests/songModeSectionControl.test.ts`**. See core under `engines/composer-os-v2/core/song-mode/`.

- **Song Mode — first non-placeholder “style surface” (2026-04-17):** **`STYLE_GROOVE_SOUL`** nudges **`songwriterSyncopationBias`** / **`songwriterDensityBias`** on duo realisation (after optional primary-songwriter resolution); receipt + **`_meta`** manifest echo **`songModeStyleSurfaceNotes`**. **First primary-songwriter golden-path slice (2026-04-17):** **`donald_fagen`** / **`songwriter_donald_fagen`** → **`applyDonaldFagenSongwriterSurface`** (metadata + same receipt field). Other UI style fields remain compile/pairing/receipt-heavy until future slices. See [CHANGELOG.md](CHANGELOG.md), `core/song-mode/songModeStyleSurface.ts`, `tests/songModeGrooveSoulSurface.test.ts`, `tests/songModeDonaldFagenSurface.test.ts`.
- **Song Mode — Donald Fagen audible slice (2026-04-18):** Duo guitar **`generateGoldenPathDuoScore`** applies **Mu/add9 colour** (major harmony, syncopated attacks), **Lydian #11 nudge** when the symbol implies **`#11`**, plus existing **altered dominant** / **strong-beat root diversion**; **`fagenJazzPopColourPassesReceipt`** on **`generationMetadata`**; surface syncopation **+0.06** for Phase C1. See [CHANGELOG.md](CHANGELOG.md), `tests/songModeDonaldFagenSurface.test.ts`.
- **Song Mode — Donald Fagen slice v2 (2026-04):** **`songModeBuilder`** adds **two** extra **verse** chord rows (generic turnaround / mixture templates); **`fagenSliceV2SyncopationBiasForPhrase`** in **`songModeRhythmOverlayC1`** lifts **C1** overlay sync bias **+0.07** for **phrases 0–2** only when **`songwriterStyleId === 'donald_fagen'`**; **`songModeDonaldFagenC1Receipt`** + third **`songModeStyleSurfaceNotes`** bullet. Tests: **`songModeFagenSliceV2.test.ts`**. See [CHANGELOG.md](CHANGELOG.md), [USER_GUIDE.md](USER_GUIDE.md).
- **Song Mode — Donald Fagen keys-comp v15 (2026-04-18):** **`fagenKeysCompV15`** + **`applyFagenKeysCompMusicalAugment`** — split-hand keyboard **comp** (voice-1/voice-2 roles, opening LH shell guard, diagnostics on **`generationMetadata`**); motif and Barry Harris gates aligned with voice split. See [CHANGELOG.md](CHANGELOG.md), `core/goldenPath/fagenKeysCompV15.ts`, `fagenKeysCompMusical.ts`.
- **Song Mode — Fagen developer brief + batch eval:** Engine hooks, receipts, **`npm run eval:fagen`** harness, baseline modes — **[FAGEN_SONG_MODE_DEVELOPMENT_BRIEF.md](FAGEN_SONG_MODE_DEVELOPMENT_BRIEF.md)**.
- **Wyble ON/OFF MusicXML export (2026-04-17):** From `engines/composer-os-v2`, **`npm run export:wyble-examples`** runs **`scripts/exportWybleOnOffExamples.ts`** — quartet + big band, ON vs OFF, default output **`C:\\Users\\mike\\Documents\\Mike Composer Files\\wyble-test\\`** (`quartet_wyble_*`, `bigband_wyble_*`). **`tests/wybleOnOffExportExamples.test.ts`** smoke-checks four files. See [CHANGELOG.md](CHANGELOG.md).
- **Big band Wyble A/B (2026-04-17):** Use **`runBigBandRealisation`** (full ensemble score → MusicXML). Optional **`suppressWybleVoiceLayoutForTest`** turns OFF **Wyble alto/tenor sax separation** (`bigBandWybleHornVoicing.ts`) for the same seed; **`tests/bigBandWybleAudibleInnerLine.test.ts`** compares **tenor** MIDI on bars **1–2**. See [CHANGELOG.md](CHANGELOG.md).
- **String quartet Wyble A/B (2026-04-17):** Use **`runQuartetRealisation`** (four string parts + piano staff) — not **`runGoldenPathOnce`** with `presetId: 'string_quartet'` (that path is still duo). Optional **`suppressWybleVoiceLayoutForTest`** turns OFF the **Violin II / Viola chord-tone swap** for the same seed; **`tests/quartetWybleAudibleInnerLine.test.ts`** compares bar **1–2** MIDI. See [CHANGELOG.md](CHANGELOG.md).
- **Wyble consumption diagnostics (2026-04-17):** `WybleConsumptionReceipt` on **`ScoreModel`**, duo **`generationMetadata`**, **`RunManifest`**, and app **`GenerateResult.runManifest`** — flags + `wybleConsumptionMode` + one-line summary so SQ / BB / duo-family hooks are inspectable without diffing scores. See [CHANGELOG.md](CHANGELOG.md) and `docs/wyble-targets/portable_wyble_voice_layout.md`.
- **BPM end-to-end:** Request body always carries BPM; golden path forwards it into score generation so export tempo is not stuck at 120 when the UI sends a value.
- **Vocal lead sheet in Sibelius:** Python exporter now emits the metronome + `<sound tempo>` direction block, not bare `<sound tempo>`.
- **Bridge TypeScript:** Vocal bridge file compiles cleanly with proper note vs rest narrowing; `npm run test:vocal` is green locally.
- **Packaged app (2026-04-17):** Song Mode + vocal lead sheet **VERIFIED** end-to-end on `release\win-unpacked\Composer OS Desktop.exe` (BPM 100 in UI; main + vocal MusicXML at 100 BPM; Sibelius import correct). See [CHANGELOG.md](CHANGELOG.md).

### Foundation & export

- **V9.0 chord baseline:** unified parsing/normalization (#19); Sibelius-safe MusicXML rhythm (undotted decomposition); multi-voice export discipline.
- **Golden Path:** Guitar–Bass Duo 8-bar default; 16/32-bar long-form; optional modulation planning for 32-bar route. **Wyble (2026-04-17):** portable `wybleVoiceLayout` on duo `GenerationMetadata` nudges **bar 1 first bass** pitch when the duo-family static map matches (`duoWybleBassAnchorNudge.ts` — not full Wyble counterpoint).
- **ECM Chamber:** full MusicXML golden path (`ecm_chamber`), Metheny vs Schneider feel scoring, ECM-specific style stack. **Symbolic texture-eval harness (2026-04-21):** `ecmChamberTextureMetrics.ts`, **`npm run eval:ecm-texture`** / **`probe:ecm-arrangement`** (JSON lines + **`ecmTextureScore`** 0–10) — use to guide **arrangement / orchestration** iteration; not a substitute for full GCE listening review.
- **Research backlog (not implemented yet):** Perplexity research bundle **ECM, Bacharach, Barry Harris** — local file `c:\Users\mike\Documents\Perplexity Research\ECM_Bacharach_BarryHarris_Research.md`. **When refreshing this roadmap or extending ECM chamber feel, pop songcraft, or jazz pedagogy-style harmony in-app,** use it as a reference; assistants should remind the user to implement from this source when roadmap discussions touch those areas.
- **Key signatures (V3.4):** infer / override / hide from harmony API.

### Guitar polyphony (Phase 18.2)

- **18.2A–B:** Voice 2 polyphony, Sibelius/GP8-safe export, span-based continuity, rhythm footprint (bar-level planning).
- **18.2C (partial, historical):** validators/sweep/pitch floor; some bass musical issues deferred to phrase layer.
- **18.2D (2026-04-09):** Bass phrase intelligence — rhythmic cell triple-break, contour overuse break, motif echo repair (bars 1–8 vs guitar), walking density cap; behaviour gates + **`npm run test:duo`** + **`npm run test:bass`** passing. See [CHANGELOG.md](CHANGELOG.md).
- **Wyble Voice 2 inject (single-line duo):** `injectGuitarVoice2WybleLayer` gated with **`isGuitarBassDuoFamily`** so **`guitar_bass_duo_single_line`** receives the same inner-voice injection path as standard duo (`guitarVoice2WybleLayer.ts`).
- **18.2E (2026-04-07):** Phrase-arrival gate loosened (±2 semitones); 24-bar forms skip that gate; 32-bar checks phrase 1 only; bass **written** pitch offset for Sibelius (`acoustic_upright_bass`, export −24 MIDI vs score + `clef-octave-change` -1).

### Voice 2 counterpoint rewrite (2026-04-09)

- Full Wyble contrapuntal rules: contrary motion, stepwise movement, guide tones, phrase arcs
- Pre-planned melodic goal pitches across all 32 bars
- Rhythmic independence against Voice 1
- Clash prevention, repeated pitch prevention
- Range expanded C2–A3
- Breathing space validator bypassed for guitar_bass_duo
- All gates passing, Shareable

### Form & app wiring

- **Phase 19:** Song Form UI, `formId` → engine, rehearsal marks in MusicXML; bar cap ≤32 in UI; longer forms staged (e.g. Phase 19.1).
- **24-bar end-to-end (2026-04-07):** `formId` on API `req_`, chord/bar validation for 24-bar through-composed forms, MusicXML enclosure schema fix (`rehearsal`).

### Song Mode (structural + realisation)

- **compile:** `runSongMode` → `CompiledSong`, lead-sheet contract, songwriting rules from bundled research (`core/song-mode/`).
- **realise:** `runSongStructure` → `runGoldenPath` as **guitar_bass_duo** with Song Mode flags → **MusicXML** + universal lead sheet.
- **Songwriter id → harmony:** `wayne_shorter` enables **`shorterMode`** chord-tone behaviour (upper extensions), not the Python `wayne-shorter-engine`.

### Songwriters & arrangers (Song Mode rules layer) — **delivered in core**

- **Typed catalogue:** `songwritingResearchTypes.ts` defines **`SongwriterRuleId`** (pop/soul writers, indie/alt bands, jazz writers, **big-band and studio arrangers** — e.g. Duke Ellington, Strayhorn, Gil Evans, Thad Jones, Nestico, Quincy Jones, Brookmeyer, Schneider, Clare Fischer, Albam, Nelson, Gerald Wilson, Hefti, Sebesky — plus classical-era names used as song-style ids), **`AuthorRuleId`** (lyric craft: Webb, Pattison, Perricone), and **`ClassicalSongRuleId`** overlays.
- **Rule bundles:** `songwriterRuleRegistry.ts` maps each id to concrete **`SongwritingRuleEntry`** rows (harmony / form / melody / hook / lyric / rhythm); **`applySongwritingRules`** consumes the resolved id set with bundled research prose in `Songwriting.md` (via parser).
- **Style resolution:** `songwriterStyleResolver.ts` — **primary** + optional **secondary** (~35% weight on the blended **`SongwriterStyleProfile`**), optional **author** and **classical** overlays, deterministic **`resolvedRuleIds`** + **`styleFingerprint`**; wired from **`buildCompiledSong`** (`songModeBuilder.ts`).
- **Songwriter × arranger pairing:** `stylePairingResolver.ts` — when **`stylePairing`** is passed into **`buildCompiledSong`**, soft domain weights plus Big Band **era ↔ arranger** alignment heuristics (non-blocking metadata / nudge).
- **Vocal lead sheet (2026-04-10; packaged VERIFIED 2026-04-17):** Python **`songwriting_bridge`** + **`cli_export_lead_sheet.py`**, app checkbox **Include vocal lead sheet**, bridge called from generation — see [CHANGELOG.md](CHANGELOG.md). **Packaged Windows:** Song Mode + vocal + BPM confirmed on `release\win-unpacked\Composer OS Desktop.exe` (historical “integration incomplete” note superseded for tempo + export path).

### Other presets

- **Riff Generator:** short-loop MusicXML to library path. **Future direction:** evolve toward a shared **Phrase Engine / Riff Generator redesign** (motivic cells, not whole-song AI) — see **Future → Phrase Engine / Riff Generator redesign**.
- **Wyble Etude:** Jimmy Wyble engine → MusicXML (chord resolution required).
- **Research backlog (not implemented yet):** Perplexity research **Slonimsky / pattern systems** — local file `c:\Users\mike\Documents\Perplexity Research\Slonimsky Engine.md`. **When refreshing this roadmap or building melodic substitution, line generation, or scale/chord pattern tooling,** use it as a reference; assistants should remind the user to implement from this source when roadmap discussions touch Slonimsky-based or systematic pattern engines.

### Big Band (2026-04-07) — **COMPLETE**

- **Frank Zappa Big Band (2026-05-03) — COMPLETE:** **`frank_zappa`** + Big Band preset runs **`precomputeFrankZappaEffectiveHarmonyBars`** into **`runBigBandRealisation`** → **`buildBigBandScoreModel`** (Zappa brass/sax soli / Slonimsky paths, **`fz:*`** receipts). Mixed **`barMeterMap`** (e.g. **Zappa Classic** **7/8 + 4/4**) is stored on **`ScoreModel.barMeterMap`** and passed through **`runEnsembleExportPipeline`** so MusicXML **`<time>`** + written validation match odd-meter bar spans. Smoke: **`zappaBigBandSmoke.test.ts`** (seed **1673965981**, 32 bars, XML length **>100k**, non-empty **`fz:`** receipts). See **`docs/ZAPPA_CREATION_GUIDE.md`** § **6**.
- **Wyble layout (2026-04-17):** `OrchestrationPlan.wybleVoiceLayout` is forwarded into `buildBigBandScoreModel`; when it matches `WYBLE_ROLE_MAP_BIG_BAND`, **tenor sax** is voiced below **alto** in sax register (`bigBandWybleHornVoicing.ts` — not full Wyble brass arranging).
- **App wiring:** `runBigBandRealisation` after planning → **full 7-part ensemble MusicXML** when the ensemble export pipeline passes; **planning JSON** if realisation or export fails.
- **Parts:** Alto Sax, Tenor Sax, Trumpet, Trombone, Piano, Double Bass, Jazz Drums (percussion clef, MIDI channel 10 — confirmed).
- **Chords / UI:** chord symbols on piano staff; **Generate** chord input wired.
- **Piano staff (export):** part name **Piano**, abbreviation **Pno.**, `instrument-sound` **keyboard.piano**, MIDI channel **1**, program **1** (`bb_piano`).
- **Verification:** `engines/composer-os-v2/scripts/bigband-verify.ts` — **14/14** checks.
- **Research backlog (not implemented yet):** Perplexity deep research on **jazz eras / styles** — local file `c:\Users\mike\Documents\Perplexity Research\jazz-era.md`. **When refreshing this roadmap or deepening Big Band (and other jazz) harmonic and stylistic behaviour,** use it as a reference; assistants should remind the user to draw from this source when roadmap discussions focus on jazz-era vocabulary, arranging norms, or era-accurate defaults beyond current chord pools.
- **Research backlog (not implemented yet):** Perplexity deep research **Big Band** (composers, sections, arranging vocabulary — complements engine rule shapes under `engines/composer-os-v2/core/big-band/`) — local file `c:\Users\mike\Documents\Perplexity Research\BigBandResearch.md`. **When refreshing this roadmap or extending Big Band rules, density, or orchestration defaults,** use it as a reference; assistants should remind the user to merge or reconcile with engine Big Band research when roadmap discussions focus on professional arranging depth.
- **Scope:** behavioural scoring — not full professional arranging.

### String Quartet (2026-04-07) — **COMPLETE**

- **Wyble layout (2026-04-17):** `OrchestrationPlan.wybleVoiceLayout` is forwarded into `buildQuartetScoreModel`; when it matches `WYBLE_ROLE_MAP_STRING_QUARTET`, **violin II** and **viola** receive each other’s legacy chord-tone slots (first real metadata consumer on SQ — not full Wyble counterpoint).
- **App wiring:** `runQuartetRealisation` after planning → **full ensemble MusicXML** (strings + **piano** reduction staff) when the ensemble export pipeline passes; **planning JSON** if realisation or export fails.
- **Parts:** Violin I, Violin II, Viola, Violoncello, **Piano** (`sq_piano` — rests + chord symbols on staff; same piano MusicXML naming as Big Band).
- **Imports:** `quartetScoreBuilder` restores `SQ_PART_V1`–`SQ_PART_VC` for MIDI-bound lookups (regression fix).
- **Section markers:** statement, development, contrast, return, coda (rehearsal / form slices in export).
- **Chords / UI:** chord symbols on **piano** staff; **Generate** chord input wired for String Quartet (and Big Band).
- **Generate UI:** **Song Form** dropdown + **16–64** bar select (ensemble) aligned with duo/song flow; `formId` passed on the generate request.
- **Research backlog (not implemented yet):** Perplexity deep research on **string quartet style parameters** — local file `c:\Users\mike\Documents\Perplexity Research\string-quartet-parameters.txt` (alias: `string-quartet-parameters.md`). **When refreshing this roadmap or extending SQ styles,** use it to plan texture/harmony/era-style work; assistants should remind the user to implement from this source when roadmap discussions touch String Quartet depth.
- **Scope:** behavioural scoring — not full professional arranging.

---

## Current (as of 2026-05-05 snapshot)

- **Harness (project status):** **`test:smoke`** + **`test:fast`** are the primary CI/dev gates; **`npm test` / `test:full`** runs the **chunked** harness (**T2.8**, 2026-04-28 — lower single-process heap vs monolithic import list). **`test:smoke`** (**`npm run test:composer-smoke`**) prints **`Passed: N`** — **N** is the **aggregate** of every **`PASS:`** row across the fixed allowlist in **`engines/composer-os-v2/tests/runSmokeTests.ts`** (not the number of suites). **Snapshot (2026-05-05):** **163** passed / **0** failed (**42** suites) — re-run after editing **`runSmokeTests.ts`** or any smoke suite and refresh this line + **`CLAUDE.md`** smoke blurb. Historical full-matrix debt remains triaged in **`docs/TEST_DEBT_COMPOSER_OS_V2.md`**.
- **Tonality Vault — iReal / paste / PDF multi-chorus variation (2026-05-05) — SHIPPED:** **`VaultGenerationOptions.chorusCount`** (default **1**, max **64**) runs **`generateVaultFromParsedChart`** once per chorus and concatenates output with continuous **`barIndex`** / global **`startBeat`**; return **`bars`** = chart length × **`chorusCount`**. **Melody** mode: per-chorus **`tensionCycleRotation`** steps the **Build F** **`transformMotifThroughLayers`** pick through **primary → tension → chaos → recover → resolve** (length **5**), unless **`songwriterStyleId === 'sonic_youth'`** (no per-chorus tension advance). **Solo** mode: no motif pass; when **`riffStyle`** is omitted or **`triad-pair-pendulum`**, **`TRIAD_PAIR_CHORUS_ROTATION`** varies effective vault **`generateVaultRiff`** **style** per chorus (also suppressed for **SY**). See **`engines/composer-os-v2/core/irealpro/irealVaultPipeline.ts`**, playbook **Multi-Chorus Variation**.
- **Evaluation system (2026-05-05) — SHIPPED:** Combined **GCE + LOCK + style profiles** evaluation path; **Basie**, **Ellington**, **Schneider**, **Quincy Jones** arranger **`StyleProfile`** scoring; **`createCombinedEvaluator`** invoked after Big Band realisation in **`composerOsAppGeneration.ts`** (observational **`evaluationResult`**, non-blocking). Playbook **Evaluation System** + **Future Workstreams** (Afro-Cuban, Odd-Meter).

### Next priorities (ordered — 2026-05-05)

1. Wire six queued arrangers — Thad Jones, Gil Evans, Brookmeyer, Fischer, Nelson, Nestico (parameter table ready).
2. Light Touch styles — Folk Guitar Narrative, Classical Influence, Bebop variants (Perplexity research).
3. MIDI import.
4. Unmeasured cadenza sections.
5. Nutritional Information melody V2.
- **MusicXML `<transpose>` — fixed-offset guitar tunings (2026-05-04):** **COMPLETE** — **`engines/composer-os-v2/core/export/musicxmlExporter.ts`** emits **`<transpose><chromatic>N</chromatic></transpose>`** only in **measure 1** **`<attributes>`** (Sibelius-safe position; not under **`<score-instrument>`**). **`drop_d`** → **−2** semitones, **`eb_standard`** → **−1**; all other alternate/scordatura tunings stay **text label only** (**`exportMeasure1TuningWordsByPartId`**). **`ScoreModel.exportPartTransposeSemitones`** populated from **`buildExportPartTransposeSemitonesFromResolvedAlternateTuning`** (**`alternateGuitarTunings.ts`**) in **`generateGoldenPathDuoScore.ts`**. Smoke **`alternateGuitarTunings.test.ts`** asserts XML for Drop D, Eb standard, and no transpose for DADGAD.
- **Ensembles — Frank Zappa Big Band + mixed meters (2026-05-03):** **COMPLETE** — **`frank_zappa`** + Big Band smoke **`zappaBigBandSmoke.test.ts`**; **`ScoreModel.barMeterMap`** carried into **`runEnsembleExportPipeline`** for MusicXML meter truth on **7/8 + 4/4** (and other maps). Product doc: **[ZAPPA_CREATION_GUIDE.md](ZAPPA_CREATION_GUIDE.md)** §6; engineering note under **Past → Big Band**.
- **Song Mode + vocal path** is in good product shape for tempo and bridge execution.
- **Song Mode section diagnostics** — stable **`songModeSectionShapingDiagnostics`** on manifests / API for eval-friendly reads; receipt lines stack with existing songwriter/style bullets.
- **Test-debt triage (begun 2026-04-17):** **`docs/TEST_DEBT_COMPOSER_OS_V2.md`** + **`scripts/test-baseline-composer-os-v2.ps1`** document a **must-stay-green** set (`test:jest:counterpoint`, `test:duo`, `test:bass`, `test:vocal`, `test:composer-os-regression`) vs occasional **`test:full`** suite-level failures (environment / heavy gates). **Runner stability** item (**chunked harness + 4096 MB heap on each chunk**) is **complete** (2026-04-28).
- **`npm test` / `test:full`** — if **`FAIL:`** lines appear, treat as **known per-suite debt** or environment until triaged; **`test:fast`** remains the broader gate for day-to-day iteration.
- **Generate UI discoverability (2026-04-29):** Songwriter **`optgroup`**s (**Shipped / Ready to build / In library**), Arranger **`optgroup`**s (**Big band core / Charts & studio**), Song Mode **Arranger + Era** helper line (style pairing / soft hints only). **`CLAUDE.md`** smoke blurb aligned with **`runSmokeTests.ts`** aggregate PASS count (**163**). **Shipped (full slice)** lists **22** writers (**`HomeGenerate.tsx`**, **2026-05-02**) — includes **Dave Brubeck** (`dave_brubeck`). **Song Mode odd-meter `barMeterMap` (2026-05-02 / 2026-05-04):** optional tiled meter presets for **Dave Brubeck**, **Thelonious Monk**, **Wayne Shorter**, **Donald Fagen**, and **Bill Evans** (plus Frank Zappa’s existing meter-map UI); **All 4/4** omits **`barMeterMap`** — **`COMPOSER_METER_PRESET_MAP`** / **`oddMeterQuantiser.ts`**, **`HomeGenerate.tsx`**.

| Area | State |
|------|--------|
| **Duo / ECM / Song Mode / Riff / Wyble** | Shipping **MusicXML** path; validation + receipts; chord diagnostics (#17) |
| **Phase 18.2D** | **Complete** (bass phrase intelligence + regression sweeps); **18.2E** **Complete** (gates + bass export) |
| **Phase 19** | **Complete** (UI ≤32 bars for duo/song) |
| **Phase 19.1 (BB/SQ long forms)** | **Complete** (2026-04-15) — Big Band and String Quartet **16–64** bars in UI + API; duo/song **deferred** |
| **Song Mode D-phase** | **D1** + C1–C7: **done** per architecture; **D2** (groove / space / expression / surprise → receipt): **done** per [CHANGELOG.md](CHANGELOG.md); **D3** reserved |
| **Songwriters & arrangers (Song Mode)** | **Core:** typed ids, **`songwriterRuleRegistry`**, **`resolveSongwritingStyles`**, **`stylePairingResolver`**, **`buildCompiledSong`** — **done**. **Twenty-two writers** in **Shipped** dropdown; **21** golden-path harmony **`*Slice.ts`** packs + **`dave_brubeck`** (registry/profile + optional odd-meter **`barMeterMap`** UI; no **`brubeckSlice.ts`** yet) — see **Shipped slices** below — **`frank_zappa`** (**`fz:*`** receipts; ii–V–I break pass) alongside **`charlie_parker`** (**2026-04-29**, bebop ii–V–I slice; **`cp:*`** receipts), **`andrew_hill`** (angular non-functional; **`ah:*`** receipts), **`thelonious_monk`** (rules from **`engines/monk-engine`**), **`kate_bush`**, **`stephen_sondheim`**, **`herbie_hancock`**, **`antonio_carlos_jobim`**, **`ecm_chamber`**, **`donald_fagen`**, **`bacharach`**, **`bill_evans`**, **`dave_brubeck`**, etc. Substantial non-slice behaviour: **`STYLE_GROOVE_SOUL`**, **`STYLE_SOPHISTICATED_POP`**, ECM-writer hooks, etc. **Next product push:** **Future → Overall roadmap priorities** **Tier A** (golden-path slices — queue **Top 10 Song Mode songwriter targets**) + **Tier B** (UI discoverability); **pools ready to slice** remain **empty**. Polish **Generate UI** (grouped selects; **22** shipped writers in dropdown **2026-05-02**). |
| **Vocal lead sheet (Song Mode)** | **VERIFIED (2026-04-17):** Packaged `release\win-unpacked\Composer OS Desktop.exe` — Song Mode + vocal + BPM 100; main + vocal `.musicxml` at 100 BPM; Sibelius OK. Dev: checkbox / API path, metronome + `<sound tempo>` in Python export, TS bridge narrowing; **`npm run test:vocal`** green. See [CHANGELOG.md](CHANGELOG.md). |
| **Wyble Voice 2** | **Inject** extended to **single-line** duo family. **2026-04-17:** Parity + **realized normalization review (first pass)** — `shouldApplyRealizedVoice2Normalization` centralizes when Phase 18.2B.3 runs; `injectPhaseAGuitarVoice2Probe` uses **`isStandardGuitarBassDuo`**; JSDoc on realized pass. Full unify of realized metrics with standard duo / phrase-first single-line still **deferred** (pick list #2). |
| **Big Band + String Quartet — follow-ups** | **Chord input** + **Song Form** + **bar-length select** (16 / 24 / 32 / 40 / 48 / 64) wired; **piano** export naming (Sibelius-friendly) — see [CHANGELOG.md](CHANGELOG.md) |
| **Python engines** (`engines/wayne-shorter-engine`, `shorter-form-engine`, etc.) | **Not** integrated into Composer OS TS Generate path |
| **#19 / #16 / #17 (chord track)** | **Baseline complete** — unified semantics (#19), robustness baseline + export/receipt behaviour (#16), diagnostics in UI (#17). Aligned across [README.md](../README.md) and [docs/CHANGELOG.md](./CHANGELOG.md). |

### Song Mode — shipped slices vs pools ready to slice (2026-04-29)

- **Shipped slices** (**21** golden-path `*Slice.ts` + **`precompute*EffectiveHarmonyBars`** + smoke): **`brian_wilson`**, **`stevie_wonder`**, **`radiohead`**, **`james_brown`**, **`joni_mitchell`**, **`sonic_youth`**, **`pat_metheny`**, **`wayne_shorter`**, **`frank_zappa`**, **`barry_harris`**, **`bill_evans`**, **`bacharach`**, **`donald_fagen`**, **`ecm_chamber`**, **`antonio_carlos_jobim`**, **`herbie_hancock`**, **`stephen_sondheim`**, **`kate_bush`**, **`thelonious_monk`**, **`andrew_hill`**, **`charlie_parker`** — see **Past → T2.x** and [CHANGELOG.md](CHANGELOG.md). **`Shipped` UI row `dave_brubeck`** (**Dave Brubeck**) — registry + style profile + Song Mode odd-meter **`barMeterMap`** presets (**not** a separate **`brubeckSlice.ts`**). **`frankZappaSlice.ts`** + **`frankZappaSliceSmoke.test.ts`** (**`fz:*`** receipts; **`breakFrankZappaIiViProgressions`**); **`charlieParkerSlice.ts`** + **`charlieParkerSliceSmoke.test.ts`** (**`cp:*`** receipts; bebop ii–V–I, tritone sub, turnaround compression, Bird enclosure); **`andrewHillSlice.ts`** + **`andrewHillSliceSmoke.test.ts`** (**`ah:*`** receipts; angular non-functional, open cadence); **`theloniousMonkSlice.ts`** + **`theloniousMonkSliceSmoke.test.ts`** (**`tm:*`** receipts); **`kateBushSlice.ts`** + **`kateBushSliceSmoke.test.ts`**; **`sondheimSlice.ts`** + **`sondheimSliceSmoke.test.ts`**; **`herbieHancockSlice.ts`** + **`herbieHancockSliceSmoke.test.ts`**; **`jobimSlice.ts`** + **`jobimSliceSmoke.test.ts`** — **`npm run test:composer-smoke`** aggregate **157**/0 (**41** suites). **Andrew Hill** research posture documented in [CHANGELOG.md](CHANGELOG.md) (Python ECM trio spec + **`engines/andrew-hill-engine`**). **Thelonious Monk** harmonic grammar was **sourced from `engines/monk-engine` Python internals** (extracted rules in TS) — **no Perplexity research required**. Receipt prefixes **`cp:*`** (Charlie Parker), **`ah:*`** (Andrew Hill), **`kb:*`** (Kate Bush), **`tm:*`** (Monk), **`sh:*`** (Sondheim), **`hh:*`** (Hancock), **`aj:*`** Jobim ( **`jb:*`** reserved for James Brown). **`ecm_chamber`:** ensemble pivot point — string quartet spec begins after Phrase Engine is stable.
- **Pools ready to slice:** **None** — chord pools / registry / UI rows that were queued for a dedicated duo golden-path slice are all **shipped** (**2026-04-29**). **Charlie Parker** (`charlie_parker`) **complete** this session — **`charlieParkerSlice.ts`**, **`cp:*`** devices. **Next after this session:** **open** — gap-fill vs roster (bebop lineage extensions, ECM depth, soul/funk, alt-rock, theatre, etc.); see **Priority stack** and **Future — compositional diversity**.

### Smoke tier — maintenance checklist (when `runSmokeTests.ts` or smoke suites change)

1. **Run** **`npm run test:composer-smoke`** from **repository root**; read **`Passed: N`** in **`=== Smoke summary ===`** (**N** = aggregate of every **`PASS:`** row — not the number of labelled suites).
2. **Update** **`CLAUDE.md`** — Testing comment with **N** and suite count **`smokeSuites.length`** in **`engines/composer-os-v2/tests/runSmokeTests.ts`** (currently **41** suites as of 2026-05-05).
3. **Update** this doc — **Current** harness bullet above (**157** / date) so assistants do not cite a stale total.
4. **Optional:** **[CHANGELOG.md](CHANGELOG.md)** **[Unreleased]** line if the change is user-facing.

### SD3 Drum Guide Export

- **What it does:** Every successful **MusicXML** export also writes a companion **Type-1 MIDI** file (`<basename>_drum_guide.mid`) and a **JSON sidecar** (`<basename>_drum_guide.json`) in the **same folder** as the `.musicxml`. Kick and snare follow **General MIDI** drum map conventions on **channel 10**: **Kick = MIDI 36 (C1), Snare = MIDI 38 (D1)**; timing grid uses **480 PPQ** (pulses per quarter), aligned with MusicXML divisions.
- **Odd-meter aware:** When **`barMeterMap`** is present (Song Mode / Frank Zappa meter UI / composer meter presets), drum-guide bars follow the same per-bar meters — **all 18 composer meter presets** in the engine’s preset map are supported for grouping and tick placement.
- **Superior Drummer 3:** Drag **`_drum_guide.mid`** into **Tap2Find** or the **Song Track** to sketch or align drums to the generated rhythm onsets.
- **Sidecar JSON:** Version **1** payload documents **`ppq`**, **`bpm`**, **`totalBars`**, and a **`bars`** array: each bar lists **meter**, **beat grouping**, and **`kickTicks` / `snareTicks`** (offsets in PPQ from the bar start).
- **Generate UI:** Optional **skip drum guide** checkbox suppresses companion **`_drum_guide.mid` / `.json`** when ticked; default remains **on** (export runs whenever MusicXML is written).

---

## Priority stack (2026-04-29)

Ordered for **product leverage** (what to schedule first). Adjust when ship goals change.

0. **Next session priorities (2026-05-04)** — **`universalLeadSheetBuilder.ts`**: wire **`repeatMarkers`** downstream into export/truth (**first** — replaces dead-end noted in handover); **odd-meter UI** for **Donald Fagen** and **Bill Evans** (parity with other writers); **MusicXML import** stress testing with **real Real Book** charts (hosted fixtures + regression gates). **MusicXML `<transpose>`** for **Drop D** / **Eb standard** guitar export is **COMPLETE** (see **Current**).

1. **More Song Mode songwriter profiles (primary writer slices)** — Expand **full-slice-packaged** profiles using the newest template (**chord-row / planning bias + duo golden-path behaviour + receipts + diagnostics + smoke**). **`donald_fagen`** / **`ecm_chamber`** / **`antonio_carlos_jobim`** / **`herbie_hancock`** / **`stephen_sondheim`** / **`kate_bush`** / **`thelonious_monk`** / **`andrew_hill`** / **`charlie_parker`** ship **golden-path `*Slice.ts`** + smoke **2026-04-29** (plus existing surfaces, dressings, eval harnesses). The **typed catalogue** lists many ids; **user-visible value** is **end-to-end** behaviour, not registry-only rows. **Shipped full-slice template (2026-04-28):** **`james_brown`** (**T2.14**); **`joni_mitchell`** (**T2.15**); **`sonic_youth`** (**T2.16**); **`pat_metheny`** (**T2.17**). **`wayne_shorter`** / **`barry_harris`** / **`bill_evans`** / **`bacharach`** / **`donald_fagen`** / **`ecm_chamber`** / **`antonio_carlos_jobim`** / **`herbie_hancock`** / **`stephen_sondheim`** / **`kate_bush`** / **`thelonious_monk`** / **`andrew_hill`** / **`charlie_parker`** slices + smoke **2026-04-29**. **`dave_brubeck`** (**2026-05-02**) — **Shipped** UI + registry/profile + Song Mode odd-meter **`barMeterMap`** presets; optional future **`brubeckSlice.ts`**. **`test:composer-smoke`** aggregate **122**/0, **35** suites (**`runSmokeTests.ts`** snapshot **2026-05-04**). **Pools ready to slice** list is **empty** — **planned New territory slices shipped** (Jobim, Hancock, Sondheim, Kate Bush, Monk, Andrew Hill, **Charlie Parker**); **next:** **new workstreams**, **ECM** arrangement depth, or **parity** work where justified.
2. **Generate UI / discoverability for writers** — Surface **primary/secondary songwriter**, **style stack**, **diversity presets**, and **arranger pairing** so new profiles are choosable and A/B-able without spelunking the API (pairs with **Near term** item 1). **2026-04-29:** grouped Songwriter + Arranger **`optgroup`**s + Song Mode Arranger/Era hint shipped — extend as needed (tooltips, presets wire-through).
3. **Harness + composer stability** — Keep **`test:smoke`** / **`test:fast`** green; use chunked **`runAllTests`** for full matrix; triage **`TEST_DEBT_COMPOSER_OS_V2.md`** so refactors stay safe while profile count grows.
4. **Lead-sheet MusicXML import** — Finish staged harmony import (ensemble presets, evals) where product needs **chart-in**; complements writers but is a **different axis** than “more profiles.”
5. **Phrase Engine / riff-motif layer** — **DONE.** V2: motif pool, hook seeding, guitar nudge, bass echo — wired before C1, 32-bar duo gate.
6. **ECM arrangement & orchestration depth** — Weakest GCE pillar on ECM; after profiles/harness pressure eases.
7. **Wyble parity + ensemble Wyble** — Duo single-line alignment first; BB/SQ inner-line depth after.

---

## Next 3 development sessions (suggested — 2026-05-03)

Ordered for **dependency leverage** and **small, shippable slices**. Re-sequence if product priority shifts (e.g. publishing/import wins over Song Mode parity).

| Session | Focus | Why now |
|--------|--------|--------|
| **1** | **`universalLeadSheetBuilder.ts`** — wire **`repeatMarkers`** through to materialised score length / MusicXML export truth (and any **`GenerationMetadata`** / manifest fields that assume uncompressed bar counts). Add or extend **smoke** where repeat-heavy charts regress. | **Top priority** after **MusicXML guitar `<transpose>`** (Drop D / Eb standard) **shipped** **2026-05-04**. Unlocks correct playback-length parity and removes a **dead-end** noted in **[HANDOVER_2026-05-03.md](HANDOVER_2026-05-03.md)**; reduces subtle bugs when import + ensemble paths interact. |
| **2** | **Odd-meter UI parity** — **`donald_fagen`** + **`bill_evans`** get the same optional **`barMeterMap`** / composer meter preset affordances as Brubeck / Monk / Shorter / Zappa (**`HomeGenerate.tsx`** + request payload + **`compositionContext`**). Follow with **`fagenSliceSmoke` / `billEvansSliceSmoke`** rows if needed. | **Priority stack** item **0**; narrow surface area (mostly UI + wiring + tests), high user-visible parity for jazz-focused writers. |
| **3** | **Pick one:** **(A)** MusicXML import **stress suite** — host **Real Book**–style `.musicxml` fixtures (subset of charts), regression gates for harmony extraction + repeat behaviour after Session **1**; **or (B)** **SD3 drum guide** validation on **Big Band** (and odd-meter) exports — confirm **`_drum_guide.mid` / `.json`** bar alignment vs **`bb_drums`** / meter map. | **(A)** hardens chart-in for pros; **(B)** validates rhythm-producer workflow from **[USER_GUIDE.md](USER_GUIDE.md)** / **[SD3_DRUM_GUIDE_USER_GUIDE.md](SD3_DRUM_GUIDE_USER_GUIDE.md)** on dense scores. |

**Also queued (outside the “3 sessions” strip):** Zappa **30 Creative Applications** book cross-update (editorial); optional **`brubeckSlice.ts`** only if the team wants slice-pattern parity vs registry-only Brubeck.

---

## HIGH PRIORITY — Odd Meters + Zappa Solo Engine (2026-05-01)

**Update (2026-05-03):** Phase **A** **mixed-meter MusicXML** is **live** for duo / Zappa / ensembles (**`barMeterMap`**, **`oddMeterQuantiser`**, **`ScoreModel.barMeterMap`** on BB/SQ exports). Remaining **HIGH PRIORITY** emphasis is **Phase B** depth (xenochrony-as-rhythm on solo line, continued odd-meter solo realism) and **parity** items (Fagen/Evans meter UI — see **Next 3 development sessions**).

**Status:** Phase **B** (Zappa solo / Slonimsky backbone) is **shipped** through musicality phases **1–5** (see subsection below). Phase **A** infrastructure remains the foundation for **any** writer or ensemble using **`barMeterMap`**; new work is **tuning + coverage**, not greenfield infrastructure.

### Phase A — Odd Meter Infrastructure (**HIGH PRIORITY**)

- Bar-level **meter map** in **`compositionContext.ts`** (per-bar time signature).
- **Rhythm quantiser** extended for non-4/4 grids (**5/8**, **7/16**, **19/16**, mixed meters).
- **MusicXML export:** per-bar **time signature change** support.
- **Song Mode UI (2026-05-02):** **`COMPOSER_METER_PRESET_MAP`** — tiled **`barMeterMap`** presets for **Dave Brubeck**, **Thelonious Monk**, and **Wayne Shorter** (Frank Zappa retains the fuller meter-map block). **`All 4/4`** sends no **`barMeterMap`**.

### Phase B — Zappa Solo / Melodic Generator (**HIGH PRIORITY**)

- **Slonimsky** path traversal over **Zappa chord pools** (solo backbone).
- **Xenochrony** device applied as **rhythmic displacement** of the melodic line (not only harmony-level offset).
- **Odd meter grid awareness** in the solo generator (couples to Phase **A**).

#### Zappa Musicality — Phases 1–5 (**all complete**, **LIVE** — 2026-05-02)

**Product status:** **Phases 1–5** (rhythmic cell, motif, voice-leading + bass, interaction + callbacks, UI) are **shipped and live**; **GCE 9.1/10** achieved (**2026-05-02**, first **9+** overall); **motif lock complete** — sticky **3–4 note** anchor (**tritone / minor 6th** leap), structural recall bars **1 / 5 / 9 / 13**, breath bars after motif statements, recurrence **≥0.75** (see **`docs/ZAPPA_CREATION_GUIDE.md`** §1). **Smoke** aggregate **134**/0 (**36** suites). **Remaining (next tuning, not blockers):** **motif stickiness** (diagnostic similarity vs listenability), **density contrast** refinement vs phrase minimums, **guitar↔bass interaction** boost; plus **Piano** staff label-on-page in Sibelius if desired; **chord language** / symbol vocabulary tuning.

- **Phase 1 — Rhythmic cell lock:** Section **A** = **3+3+2** (canonical 7/8 eighth groups **`[3,2,2]`**); section **B** = **3+2+2+2** (canonical **`[2,2,2,1]`**). ≥**50%** of four-bar phrase windows cell-locked (deterministic). Receipts: **`SoloLine.rhythmicCellLock`**, **`SoloPhrase.zappaRhythmicCell`**. Code: **`zappasoloEngine.ts`** (+ **`phraseBuilder.ts`** re-exports).
- **Phase 2 — Motif ownership:** Sticky anchor (**3–4 notes**, **tritone / m6** leap required) from the **first four bars** of each **form section**; **≥0.75** similarity on **development** fragments and on **structural recall** bars **1 / 5 / 9 / 13**; breath bars (**≤3** attacks) after each structural motif bar; transforms **shift / augment / compress**; full-phrase reinjection when similarity **&lt;0.5**. Receipt: **`SoloLine.zappaMotifReceipt`**. Code: **`zappasoloEngine.ts`**.
- **Phase 3 — Voice-leading + bass authority (**complete**, **LIVE**):** Guide-tone line (**3rd/7th**, smoothed **≤2** semitone motion), **`SoloLine.zappaGuideToneReceipt`**; bass beat **1** root/3rd/7th + beat **2** chord tone or leading tone (**`enforceFrankZappaBassBeatCommitment`**); phrase goal tones **N+2**/**N+4**; implied inner voice + contrary motion per section (**`generateGoldenPathDuoScore.ts`**); **`zappaVoiceLeadingScore`** (0–10) on **`frankZappaDiagnostics`**. Code: **`zappaVoiceLeading.ts`**, **`zappasoloEngine.ts`**, **`bassMelodicLines.ts`**, **`moduleValidation.ts`** (Frank Zappa branch).
- **Phase 4 — Guitar↔bass interaction + cross-bar callbacks (**complete**, **LIVE**):** Duo **imitation** (1–2 beat echo / section, **`zappaImitationReceipt`**), **register swap** once per section; solo **cross-bar callbacks** (bar **1** rhythm/intervals at **5/9/13…**, **`zappaMotifReceipt.crossBarCallbacks`**); **one controlled disruption** bar per section (skip 7/8 cell snap, **`rhythmicCellLock.sectionDisruptionBars`**). Code: **`generateGoldenPathDuoScore.ts`**, **`zappasoloEngine.ts`**.
- **Phase 5 — UI fixes (**complete**, **LIVE**, 2026-05-02):** **Generate** receipt: green when **`exportIntegrityPassed`** is true (even if not shareable); red only on integrity failure / failed run / error; amber **Generated (not shareable)** when integrity passes but **`readiness.shareable`** is false — **`HomeGenerate.tsx`**. Solo export written pitch **+12** semitones, clamp **52–84** MIDI — **`zappasoloEngine.ts`**. MusicXML: comp **Acoustic Grand Piano** (GM **1**, **`songModePresentAsPianoComp`**), bass **Upright Bass**, solo **Elec. Gtr** (electric guitar GM **27**) — **`generateGoldenPathDuoScore.ts`**, **`musicxmlExporter.ts`**, **`soloLineToPartModel`**. Odd-meter **`barMeterMap`** smoke rows — **`frankZappaSliceSmoke.test.ts`**.
- **Docs:** [ZAPPA_CREATION_GUIDE.md](ZAPPA_CREATION_GUIDE.md) §§ **1** (status), **4** (Phase B solo + Phase 5).

### Zappa PDF Analysis Findings (2026-05-01)

Key inputs for Phase B solo engine:

- Septuplet (7:4) and quintuplet (5:4) as primary Zappa tuplet signatures
- Descending minor 6th (−8 semitones) as structural identity marker (d1/d3 signal)
- Factory-cycle 32nd-note motive displacement = d2 metric displacement analogue
- [0137] tetrachord = Zappa bebop harmonic aroma — maps to alt/tritone chord pools
- Lydian confirmed system-wide over all major/add9 chords
- Guitar Book + Over-Nite Sensation: OCR pending for score-level data

### Where this sits vs existing planned work

| Relationship | Notes |
|--------------|--------|
| **Future → Four engine pillars — #2** (*Rhythm, meter & groove intelligence*) | Odd meters upgrade this pillar from **overlay / feel** to **structural** meter maps + export fidelity. |
| **Overall roadmap priorities — Tier A** (`frank_zappa` and related writers) | Harmony pools + slice + wiring can ship **without** Phase **B**; the **Zappa solo engine** narrative assumes **Phase B** after **Slonimsky** + pools exist. |
| **Tier D / Standalone study — Slonimsky Etudes (#15)** | Shared **Slonimsky** traversal / pattern vocabulary; Phase **B** extends **Generate-facing** melody generation, not only the etude tab. |
| **Phrase Engine / riff redesign (Tier G)** | Complementary: phrase-level rhythm lives in Phrase Engine; **quantiser + meter map** are the **score-clock** foundation odd meters need first. |
| **Lead-sheet import (Stages 6–7)** | **Parallel** track — no dependency either way; prioritize odd meters when **rhythm + MusicXML** bandwidth is free. |
| **Motif Phase 1** | **Parallel** — motif receipts remain useful; odd-meter solo lines may later feed motif summaries. |

**Scheduling suggestion:** Treat **Phase A** as a **rhythm/export horizontal** (small dedicated PR chain: context → quantiser → MusicXML). Schedule **Phase B** immediately after **Phase A** smoke + at least one fixture export with **mixed meters**, reusing **`SONGWRITER_CHORD_POOLS.frank_zappa`** and **`frankZappaSlice.ts`** / **`precomputeFrankZappaEffectiveHarmonyBars`** for harmonic truth.

---

## Future — compositional diversity & songwriter expansion (2026-04-28)

These items raise **output diversity** without assuming a single engine rewrite: they are parallel product axes (some already partially present under ensembles / Song Mode / pairing).

### Four engine pillars (diversity)

1. **Ensemble & orchestration grammar** — configurable section/scoring defaults (woodwind colour, brass pads, rhythm-section roles), stem/beam templates, and arrangement receipts so pieces feel less “same orchestration, different chords.”
2. **Rhythm, meter & groove intelligence** — meter feels (odd subdivisions, displacement, pocket vs float), Song Mode groove overlays that survive export, and clearer coupling between harmony rhythm and phrase rhythm. **HIGH PRIORITY elaboration:** **§ HIGH PRIORITY — Odd Meters + Zappa Solo Engine** (bar-level meter map, quantiser + MusicXML meter changes, then Zappa solo backbone).
3. **Form & narrative** — multi-section arcs (beyond A/B tags), turnarounds / pivots as first-class planning objects, and lyric-adjacent phrase shaping hooks where Song Mode already carries structure.
4. **Style fusion & world vocabulary** — explicit blend weights (e.g. ECM × Brazilian × theatre), region/mode libraries that stay bounded (not tourist exoticism), and pairing rules that explain *why* a fusion is chosen (manifest-friendly).

### Candidate primary songwriter modules (highest impact next adds)

**New territory (2026-04-29):** **Charlie Parker** (`charlie_parker`): **`charlieParkerSlice.ts`**, **`cp:*`** receipts — bebop ii–V–I slice (ii–V clarify, tritone sub, turnaround compression, bebop enrich, Bird enclosure); smoke **`charlieParkerSliceSmoke.test.ts`**. Prior shipped: **Hancock** (`herbie_hancock`): `herbieHancockSlice.ts`, **`hh:*`** receipts. **Jobim** (`antonio_carlos_jobim`): `jobimSlice.ts`, **`aj:*`** receipts. **Sondheim** (`stephen_sondheim`): `sondheimSlice.ts`, **`sh:*`** receipts. **Kate Bush** (`kate_bush`): **`kateBushSlice.ts`**, **`kb:*`** receipts. **Thelonious Monk** (`thelonious_monk`): **`theloniousMonkSlice.ts`**, **`tm:*`** receipts — rules extracted from **`engines/monk-engine`** Python internals (**no Perplexity research**). **Andrew Hill** (`andrew_hill`): **`andrewHillSlice.ts`**, **`ah:*`** receipts — angular non-functional slice (**avoid_resolution=True**, open cadence); see [CHANGELOG.md](CHANGELOG.md). **Next candidates** for high-impact primary modules are **open** — use **gap-fill** vs the current roster (ECM/jazz depth, soul/funk, alt-rock, art-pop US/UK, theatre, etc.).

| Target | Proposed id | Why it matters |
|--------|-------------|----------------|
| **Antônio Carlos Jobim** | `antonio_carlos_jobim` | **Shipped (2026-04-29)** — bossa / Brazilian harmony slice; **`precomputeJobimEffectiveHarmonyBars`**, export/disk truth, smoke **`jobimSliceSmoke.test.ts`**. |
| **Herbie Hancock** | `herbie_hancock` | **Shipped (2026-04-29)** — Blue Note post-bop harmony slice (Maiden Voyage / Dolphin Dance zone); **`precomputeHerbieHancockEffectiveHarmonyBars`**, **`hh:*`** receipts, smoke **`herbieHancockSliceSmoke.test.ts`**. |
| **Stephen Sondheim** | `stephen_sondheim` | **Shipped (2026-04-29)** — dramatic musical theatre tonality slice; **`precomputeSondheimEffectiveHarmonyBars`**, **`sh:*`** receipts, smoke **`sondheimSliceSmoke.test.ts`**; aliases **`sondheim`** / **`stephen_sondheim`** in **`songwriterStyleProfiles`**. |
| **Kate Bush** | `kate_bush` | **Shipped (2026-04-29)** — tonal-modal / drone-aware texture harmony; **`precomputeKateBushEffectiveHarmonyBars`**, **`kb:*`** receipts, smoke **`kateBushSliceSmoke.test.ts`**; aliases **`kate_bush`** / **`kate`** / **`bush`** in **`songwriterStyleProfiles`**. |
| **Thelonious Monk** | `thelonious_monk` | **Shipped (2026-04-29)** — angular harmony slice (**7b9** signature dominant, tritone sub, dim7 chromatic passing, stride palette, deferred cadence); **`precomputeTheloniousMonkEffectiveHarmonyBars`**, **`tm:*`** receipts, smoke **`theloniousMonkSliceSmoke.test.ts`**; aliases **`monk`** / **`thelonious`** / **`thelonious_monk`**; harmonic rules from **`engines/monk-engine`** — **no external research required**. |
| **Andrew Hill** | `andrew_hill` | **Shipped (2026-04-29)** — angular non-functional post-bop slice; **`precomputeAndrewHillEffectiveHarmonyBars`**, **`ah:*`** receipts (**d1–d5**), smoke **`andrewHillSliceSmoke.test.ts`**; aliases **`andrew_hill`** / **`hill`** / **`andrew`**; **`avoid_resolution=True`**, open cadence strategy. |

**Note:** The catalogue already lists many writers and arrangers (see **Past → Songwriters & arrangers**); *impact* here means **new musical neighbourhoods** for end users and eval diversity, not raw fame ranking.

---

## FUTURE — Zappa Ensemble Arrangements

**Priority:** **HIGH** — both phases are **HIGH PRIORITY** for future dedicated sessions (product + engine bandwidth).

### Phase A — Zappa String Quartet

- Use existing string quartet preset as base
- Wire Zappa chord pools (tritone-rooted, doo-wop clash, no ii–V–I) as harmonic source for all 4 parts
- Apply odd meter infrastructure to all parts simultaneously
- Xenochrony device (d2): rhythmic displacement per instrument independently
- Violin 1: carries Slonimsky solo engine output
- Viola/Cello: enforce rhythmic cell + bass authority
- Reference: *The Perfect Stranger* (Zappa chamber writing)
- Dependencies: `frankZappaSlice.ts`, `oddMeterQuantiser.ts`, `zappasoloEngine.ts`

### Phase B — Zappa Big Band

- Use existing big band preset as base
- Brass section: polytonal superimposition (d1) — instruments in different keys
- Saxophone soli: carry motif engine output
- Rhythm section: enforce odd meter cell (piano/bass/drums)
- Solo instrument (trumpet/alto): Slonimsky solo engine
- Style juxtaposition (d4): sudden genre switches within piece
- Reference: *The Grand Wazoo*, *Waka/Jawaka*
- Dependencies: all Zappa slice devices, big band preset, drum generator (TBD)

### Order

- **Phase A (String Quartet) first** — simpler, existing preset
- **Phase B (Big Band) second** — most ambitious, needs drum generator

### New work required for both

- Instrument-specific voice range enforcement per part
- Arrangement layer (which device → which instrument)
- Part-writing rules (no parallel fifths in strings etc)
- **Big band only:** drum part generator

---

## MusicXML Harmony Import for Lead Sheets (staged rollout)

### Guardrails (must hold for every stage)

- **No silent harmony-output changes** outside the stage that explicitly enables harmony behavior changes.
- **`free_harmony` remains the default** for backward compatibility unless explicitly changed in a later approved stage.
- **Tests are required at every stage** (unit + integration/regression as appropriate).
- **Plan first, approve, then implement** (no implementation before explicit approval).

### Canonical 7-stage roadmap

1. **Stage 1 — Parse/store MusicXML `<harmony>` into typed timeline, zero output change.**  
   **Status:** **implemented / in progress**
2. **Stage 2 — Add `ImportHarmonyMode` plumbing through request/context/manifest, zero output change.**  
   **Status:** **implemented / in progress**
3. **Stage 3 — Activate `lock_harmony` for Song Mode only.**  
   **Status:** **implemented / in progress**
3b. **Stage 3b — Add Song Mode harmony import debug UI (Dev-first).**  
   **Status:** **implemented / in progress**
4. **Stage 4 — Make `free_harmony` the explicit default behavior and surface this in API, metadata, manifests, and docs (no change to musical output).**  
   **Status:** **implemented / in progress**
5. **Stage 5 — Add conservative `blend_harmony` with bounded control (e.g. `harmonyBlend`).**  
   **Status:** **implemented** (2026-04-27 session)
6. **Stage 6 — Extend support to other lead-sheet presets one by one.**  
   **Status:** planned
7. **Stage 7 — Add evals, regression gates, docs, telemetry.**  
   **Status:** planned

### Current implementation status

- **Stage 1 implemented:** parse/store `ImportedHarmonyTimeline` only (storage-only; no harmony-generation consumption yet).
- **Stage 2 implemented:** `ImportHarmonyMode` and `harmonyBlend` plumbing only (request → context → manifest telemetry).
- **Stage 3 implemented/in progress (Song Mode only):** when `importHarmonyMode === 'lock_harmony'` and imported timeline is usable, Song Mode routes into locked harmony from timeline-derived bars.
- **Stage 3b implemented/in progress (Dev app UI):** Song Mode Generate now includes a dev-only `Harmony import debug` surface for request knobs + receipt inspectability (`importHarmonyMode`, lock applied/fallback reason, locked bars count, compact progression preview).
- **Stage 4 implemented/in progress:** API/docs state that omitted `importHarmonyMode` normalizes to `free_harmony`; manifests and `GenerationMetadata` echo **`importHarmonyPolicyVersion`** (= 2) whenever import-harmony telemetry is written — **no change to that default**; **Stage 5** now supplies `blend_harmony` when explicitly selected (2026-04-27).
- **Explicit fallback retained:** if timeline is missing/empty/unusable, Song Mode falls back to existing behavior and records fallback telemetry.
- **Stage 5 — `blend_harmony` (2026-04-27):** conservative bounded blend **active** when requested; `free_harmony` remains default when import mode is omitted.
- **Guardrails:** prior stages’ no-surprise defaults retained; see [CHANGELOG.md](CHANGELOG.md) for session detail.

---

### Wayne Shorter — TypeScript pipeline integration (**COMPLETE**, 2026-04-27)

- **Status:** **COMPLETE** — musical eval **8.8/10** on the integrated Song Mode + duo golden-path slice (Wayne contextual harmony + motif authority + rhythmic return alignment).
- **Shipped in core:** contextual chord-row bias (verse vs chorus/bridge), optional forced disruption slot on peak sections, **form-aware Motif Authority** phrase windows (`verse` / `chorus` / `bridge` from `context.form.sections`), **interval-size buckets** on motif fingerprints (`step` / `skip` / `leap`), **Wayne-specific return nudge** (pitch-class snap on bar lead + second-note bias; `songwriterStyleId` passed from golden path), and **phrase-A rhythmic fingerprint**: `buildPhrase` on phrase-A guitar notes stores `rhythmFingerprint` on context; return refinement **snaps voice-1 note durations** to the nearest duration values appearing in that fingerprint (duration values only, not beat positions).
- **Future:** Duo golden-path **Phrase Engine Stage 4** (**motif augmentation / compression / displacement** on guitar v1) shipped **2026-04-28** (`phraseBuilder.ts`). Wayne-specific **chorus/bridge** motif pass remains separate (`applyWayneShorterChorusBridgeMotifDevelopment`). Richer **neutral Phrase** type + riff UX remains **Phrase Engine / Riff Generator redesign**.

---

## Future (prioritized directions)

### Overall roadmap priorities (2026-05-01)

**Ordered product-attention stack** — higher tiers get **default scheduling bias**; lower tiers stay **in motion** when capacity or dependencies allow (nothing here is “cancelled”).

| Tier | Bundle | Summary | Where to read |
|:----:|--------|---------|----------------|
| **A** | **Song Mode — golden-path songwriter slices** | Primary lane for **depth / diversity / fun**. Concrete queue: **Top 10 Song Mode songwriter targets** (`frank_zappa` … `duke_ellington`) — pair each ship with smoke + receipts + optional eval. **`frank_zappa`:** odd-meter + **Zappa Solo Engine** tracked as **HIGH PRIORITY** cross-cutting work (**§ HIGH PRIORITY — Odd Meters + Zappa Solo Engine**); harmony slice/pools can ship ahead of Phase **B**. | **§ Songwriter profiles & Song Mode writer expansion — priority 1** · **§ Top 10 Song Mode songwriter targets** · **§ HIGH PRIORITY — Odd Meters + Zappa Solo Engine** |
| **B** | **Generate UI — writer & style discoverability** | Makes Tier **A** testable without API-only workflows (grouped songwriter/arranger UI **shipped**; extend surfacing as needed). | **§ Next best development (top 3)** item **2** · **Current** |
| **C** | **Lead-sheet import → ensemble chart-in** | **`LeadSheet`** + `leadSheetFromMusicXml` → **String Quartet / Big Band** realisers (staged PRs). | **§ Next best development (top 3)** item **3** · **Lead-sheet MusicXML import → String Quartet + Big Band** |
| **D** | **Standalone study tools** | **#15 Slonimsky Etudes** (playback/PDF follow-ups as scheduled) → **#16 Wyble Etudes** (after brief). Outside Generate. | **§ Standalone study tools — Slonimsky Etudes & Wyble Etudes** · pick list **#15 / #16** |
| **E** | **Altered tuning — Tonality Vault voicing maps** | Preset + UI **shipped**; **per-tuning idiomatic maps** follow-up. Synergy with Tier **A** targets **`nick_drake`**, **`frank_zappa`** (guitar colour). | **§ Altered Tuning Presets** |
| **F** | **Motif Development Phase 1** | Pilot writers + inspectable motif receipts (`motifAuthorityLevel`). | **§ Motif Development Plan (Phase 1)** |
| **G** | **Phrase Engine / Riff redesign** | Shared phrase abstraction + adapters (medium-term). | **§ Phrase Engine / Riff Generator redesign** |
| **—** | **Near alternates** | **`TEST_DEBT`**, Wyble depth, ECM arrangement, Slonimsky engine-only backlog **#10**. | **§ Next best development** *Near alternates* · **§ Next possible devs (pick list)** |

**Alignment:** **Next best development (top 3)** items **1 → 3** map **1:1** to **Tier A → Tier C** above.

### Songwriter profiles & Song Mode writer expansion — **priority 1**

- **Done (2026-04-28):** **`james_brown`** — full duo golden-path slice (**`jamesBrownSlice.ts`**), **`SONGWRITER_CHORD_POOLS.james_brown`**, devices **`jb:`** d1–d5, anti-elaboration guards, **`npm run eval:james_brown`**, **`test:smoke`** row (**37**/0). See **T2.14**, [CHANGELOG.md](CHANGELOG.md) § **James Brown — full Song Mode slice**.
- **Done (2026-04-28):** **`pat_metheny`** — full duo golden-path slice (**`patMethenySlice.ts`**), preserved **`SONGWRITER_CHORD_POOLS.pat_metheny`**, devices **`pm:`** d1–d5, anti-elaboration guards, effective-bar export + disk truth, **`npm run eval:pat_metheny`**, **`test:smoke`** **40**/0 at ship. See **T2.17**, [CHANGELOG.md](CHANGELOG.md) § **Pat Metheny — full Song Mode slice (`patMethenySlice.ts`)**.
- **Smoke tier vs bullets:** Row counts in **Past / T2.x** (**33**, **37**, **40**, …) record **aggregate PASS rows at ship**. **Current** smoke tier **aggregate** (**111** as of 2026-05-01) lives in **`runSmokeTests.ts`** — bump **`CLAUDE.md`** + **Current** whenever the allowlist changes.
- **Goal:** **More primary songwriter profiles** that behave distinctly in Song Mode: section-aware **chord pools**, **golden-path** guitar/bass realisation hooks where appropriate, **surface receipts** / **`songModeStyleSurfaceNotes`**, **`songModeSectionShapingDiagnostics`** alignment, and **eval harness** rows where a script exists (`eval:fagen`, `eval:bacharach`, etc.).
- **Implementation pattern:** Follow shipped slices — **registry + resolver** (`songwriterStyleResolver`, `songwriterRuleRegistry`) → **`songModeBuilder`** weighting / rows → **`generateGoldenPathDuoScore`** passes → manifests. Keep **pilot gating** (`motifAuthorityLevel`, motif summaries) until the slice is stable.
- **Candidate directions (pick small batches):** elevate **thin or compile-only** writers to full slices; add **era- or scene-cluster** presets (e.g. singer-songwriter, classic rock book, modern alt) as **product bundles** mapping to existing or new ids; extend **hybrid** pairs (melody writer × harmony writer) with tests.
- **Explicit dependency:** More profiles **increase** the need for **UI exposure** (**Overall roadmap priorities** Tier **B**) and **test/eval** discipline (lead-sheet / ensemble Tier **C** and smoke hygiene).

### Top 10 Song Mode songwriter targets — diversity / depth / fun (2026-05-01)

**Purpose:** Product-facing **schedule bias** for the next golden-path **`*Slice.ts`** investments — **not** a commitment order. Mix of **new ids** (add to `SONGWRITER_OPTIONS` + registry) and **In library** rows in **`HomeGenerate.tsx`** (already in the dropdown but not in **Shipped (full slice)**).

| Priority | Target | Status today | Why (diversity / depth / fun) |
| :--- | :--- | :--- | :--- |
| 1 | **`frank_zappa`** | **New id** | Harmonic range + sectional surprise + **fun**; Song Mode slice is **golden-path duo harmony + devices** — **not** a duplicate of the Python **`engines/zappa-disruption-engine`** (**`zappa_disruption`** IR composer used by **Composer Studio**; **not** wired to **`composer-os-v2`** Generate). Optional later: bounded **alternate tuning** presets where guitar stunt colours matter. |
| 2 | **`astor_piazzolla`** | **New id** | **Nuevo tango** harmony / line grammar vs **`antonio_carlos_jobim`** Brazilian bossa lane — Latin diversity without overlap. |
| 3 | **`nick_drake`** | **New id** | Intimate English folk harmony; **strong altered-tuning affinity** — pair with **`alternateGuitarTunings`** + future **Tonality Vault** voicing maps. |
| 4 | **`carole_king`** | **In library** | Distinct **Tapestry-era** singer-songwriter pillar — fills gap vs shipped **Brian Wilson** / **Stevie Wonder** / **Radiohead** cluster. |
| 5 | **`xtc`** | **In library** | **British art-pop** harmonic sophistication — elevate to **Shipped** slice without adding a dropdown row; complements **Radiohead** / **Kate Bush**. |
| 6 | **`ennio_morricone`** | **New id** | **Cinematic modal** suspense / Italian colour — new **sound world** for duo lead-sheet grammar (not covered by jazz/pop shipped set). |
| 7 | **`george_clinton`** *(or `parliament_funkadelic`)* | **New id** | **P-Funk** harmonic + riff **systems** vs **`james_brown`** — groove diversity + playful eccentricity. |
| 8 | **`laura_nyro`** | **New id** | Extended-chord **jazz singer-songwriter** — bridges **Bacharach** / **Sondheim** complexity with pop vocal harmony. |
| 9 | **`television`** | **New id** | **Tom Verlaine** lineage — lean **angular twin-guitar** art-punk; unique vs **Sonic Youth** (noise density) and **Radiohead** (later era). |
| 10 | **`duke_ellington`** | **In library** | **Big-band jazz composer** harmonic voice — complements small-group shipped writers (**Monk**, **Charlie Parker**, **Jobim**, …). |

**Near alternates (defer):** **`billy_strayhorn`** (pairs with Ellington), **`holland_dozier_holland`** / **`smokey_robinson`** / **`norman_whitfield`** (Motown cluster vs Brown), **`fela_kuti`** (Afrobeat architecture), **`philip_glass`** (minimal pattern lens), **`björk`** (art-pop experimental), **`beatles`** / **`paul_mccartney`** (high recognition, scope-heavy).

### Altered Tuning Presets (workstream)

- **Scope:** **Guitar-layer** feature — **independent** of Song Mode **harmony slices** (`*Slice.ts`); tuning selection colours **voicing maps** and fingering grammar, not the locked harmonic progression row by itself.
- **Target:** **Twenty-four** named presets (six per character zone below), each with **idiomatic chord voicing maps** (symbols + optional fret/string hints where the engine emits guitar-comp metadata).
- **Presets (strings low → high), grouped by character zone:**
  - **Jazz / Sophisticated**
    - **All Fourths** (**E A D G C F**) — Pat Metheny, linear jazz voicings
    - **All Fifths** (**C G D A E B**) — cello tuning, wide interval spread
    - **New Standard** (**C G D A E G**) — Robert Fripp, wide range, open top
    - **Minor Third Stack** (**C Eb F# A**) — diminished symmetry, Monk-adjacent
    - **Augmented Stack** (**C E Ab C**) — symmetrical, Messiaen colour
    - **Whole Tone** (**C D E F# Ab Bb**) — Debussy/impressionist, no leading tone
  - **Sonic Youth / Noise / Experimental**
    - **CGDGCD** — Sonic Youth “Confusion is Sex” era, drone/noise
    - **CGDGBD** — drone-heavy, two open Gs
    - **EBEBEB** — maximum drone, all strings ring together
    - **FACGCE** — dissonant, cluster-friendly
    - **CGCGCE** — open C with added tension
    - **DGDGBD** — open G variant, darker character
  - **Joni Mitchell Specifics**
    - **DGDFCE** — “A Case of You”, highly distinctive
    - **CGEFGE** — “Little Green”
    - **CGDGBE** — “Both Sides Now”
    - **DADGBE** — “Big Yellow Taxi” variant
    - **DADF#AD** — open D minor variant, very dark
    - **EEEEBE** — “The Last Time I Saw Richard” era
  - **Hybrid / Harmonic**
    - **Open Cmaj7** (**C G E G B E**) — impressionist, Bill Evans adjacent
    - **Open Dm9** (**D A D F C E**) — dark, modal
    - **Quartal** (**B E A D G C**) — McCoy Tyner territory, modal jazz
    - **Overtone** (**C G C G C E**) — pure harmonic series, very resonant
    - **Open Em11** (**E B D G B E**) — ECM-adjacent, very open
    - **Sus2 Stack** (**D A D A D E**) — drone with suspended colour
- **Creative target:** A named **Joni Mitchell × Sonic Youth** hybrid preset or style-bundle — deliberate blend of **open-tuning lyric colour** with **noise/drone** gesture space (product/marketing hook, not auto-fusion of slices).
- **Theoretical reference:** **Tonality Vault** — document **`All_Chords_in_Tonality_Vault.docx`** (user-held reference) as the authority for **triad-pair** relationships and **per-tuning voicing maps** when presets are implemented.
- **Hardware note:** User workflow uses **Line 6 Variax + Helix** — **any** tuning is available at **effectively zero** retuning cost in the physical rig, so **no tuning is off limits** for Composer OS preset design.
- **Status:** **SHIPPED (preset + UI layer, 2026-04-29)** — **`ALTERNATE_GUITAR_TUNING_PRESETS`** in **`alternateGuitarTunings.ts`** implements the **24 roadmap zone presets** plus **legacy absorbed** ids (`standard`, `drop_d`, `dadgad`, `open_d` / `open_g`, drone clusters, open modals, Joni-style labels, `custom`); **`getPresetsByZone`**, zone-grouped **Generate** selects (**`HomeGenerate.tsx`**), **`STYLE_PROFILES_WITH_ALTERNATE_GUITAR_TUNING`** (Indie + **STYLE_SONIC_YOUTH**, **STYLE_JONI_MITCHELL**, **STYLE_PAT_METHENY**, **STYLE_ECM_CHAMBER**). **Follow-up:** **per-tuning idiomatic voicing maps** (symbols + fret/string hints) per **Tonality Vault** — separate workstream; does not block preset selection or register/nudge metadata.
- **Smoke:** **`alternateGuitarTunings.test.ts`** included in **`runSmokeTests.ts`** (roadmap preset resolve + zone counts + texture buckets).

### Shared Chord Vocabulary (workstream — infrastructure)

- **Goal:** Consolidate **`sanitize*Symbol`** / cluster-reduction / “lush but clean” spellings duplicated across songwriter slices into a **shared harmonisation helper layer** (slices keep **device receipts** and writer-specific passes on top).
- **Canonical chord-type reference:** **Tonality Vault** (`All_Chords_in_Tonality_Vault.docx`) — shared tertian / extension naming and triad-pair vocabulary for slice sanitizers and future tuning maps.
- **Status:** **Future** — **does not block** shipping individual writer slices.

### Ensemble architecture sequencing

- **Intent:** Tracks ordering of **ensemble** depth (Big Band, String Quartet, ECM chamber) vs **duo / Song Mode** slice investment — see **Priority stack** and **Past → Big Band / String Quartet** for current ship state; this subsection only adds **resource links**, not a reschedule.
- **Tonality Vault (string quartet):** When **string quartet voicing reference** work begins (distributed chord tones across **Vn I / II / Va / Vc** beyond today’s behavioural scoring), **Tonality Vault** should inform **SQ inner-line voicing grammar** alongside the existing Perplexity backlog **`string-quartet-parameters`** (see **Past → String Quartet** in this doc).

### FUTURE — SD3 Drum Guide Export (Groove Search)

**Goal:** Export a deterministic rhythm-reduced MIDI guide alongside MusicXML so Superior Drummer 3 / EZdrummer can match grooves to Composer OS output.

**Not automatic drum composition** — groove search guide only.

**Key design decisions (validated by Perplexity):**

- Dual-lane default: **KickGuide (C1)** + **SnareGuide (D1)**
- Bar-start anchor event in every bar (critical for odd meters)
- Strip all harmony/pitch — rhythm skeleton only
- Cap at **8th-note density maximum**
- Deterministic: same **seed** = identical MIDI
- Sidecar JSON with detected grouping metadata

**10 phases:**

1. Data extraction from score model  
2. Meter-aware grouping detection  
3. Onset reduction (core step)  
4. Velocity encoding  
5. Multi-lane output (single / dual / tri)  
6. MIDI writer (480 PPQ)  
7. Integration into export pipeline  
8. SD3 workflow documentation  
9. Test cases (odd meter, density, determinism)  
10. Success criteria validation  

**Priority:** After **Zappa String Quartet**, before **Zappa Big Band**

**Dependency:** `barMeterMap` + odd-meter quantiser (already built)

**Success criterion:** SD3 returns candidate grooves whose meter feel and accent map require only light editing.

### Lead-sheet MusicXML import → String Quartet + Big Band (planned — **not started**)

**Next major capability under consideration:** a shared **`LeadSheet`** representation plus a **MusicXML → LeadSheet** importer that both **String Quartet** and **Big Band** realisers can consume. Today, ensemble paths are **export-centric** (no general MusicXML-as-input into `runQuartetRealisation` / `runBigBandRealisation`). This work is **staged in small PRs**, not one monolith.

**v1 scope (intentionally narrow):**

- Lead-sheet-like MusicXML: **single melody staff**, **optional** `<harmony>` / chord symbols, **simple meters** (e.g. 4/4, 3/4; maybe 6/8).
- **Not in v1:** piano reductions as inputs, existing **multi-part** scores (downloaded quartet / big-band XML), or “messy” exports from arbitrary tools without clear lead-sheet semantics.

**Intended shape (future implementation order):**

1. **`LeadSheet` model** in core — metadata (title, key, time, tempo) + `bars[]` (`barIndex`, optional chord symbol, **monophonic** melody: pitch + startBeat + durationBeats).
2. **MusicXML parser integration** — parse XML into a **generic** structured layer (parts, measures, notes, harmonies); keep ensemble-agnostic.
3. **`leadSheetFromMusicXml(xml)`** — assume **first part = melody staff**, primary voice = melody; harmony from `<harmony>` (**v1:** roughly **one chord per bar**); **reject** inputs that violate v1 with **explicit errors**.
4. **`realiseQuartetFromLeadSheet(leadSheet, options)`** / **`realiseBigBandFromLeadSheet(leadSheet, options)`** — map `bars[].chord` into existing **`chordProgressionText`** / arranger inputs; **v1:** melody **ignored** (engines keep generating lines); later optional **“head identity”** for violin I / horns.
5. **Optional helpers:** `realiseQuartetFromMusicXml` / `realiseBigBandFromMusicXml` = (3) → (4).
6. **Tests + docs** — small XML fixtures, importer tests, LeadSheet→ensemble smoke tests; user guide listing **accepted vs out-of-scope** MusicXML.

**Explicit non-goal until scheduled:** changing behaviour of current Generate flows without the types/importer landed first.

---

### Phrase Engine / Riff Generator redesign (planned — motivic cells, not a “song writer”)

**Product framing:** This is **not** a magical full-song AI. It is a **controllable phrase engine** that produces **short, reusable musical cells** (motifs, riffs, hooks, ostinati, arpeggio fragments) for import into Composer OS pipelines.

**Goal:** Build a **shared** phrase abstraction and controls so generated material can feed **multiple** modules (duo guitar / guitar+bass, **Big Band** lead-line ideas, **String Quartet** melodic lines, **Song Mode** section hooks and inner-line fragments). **Guardrail:** stay in **phrase-length** generation; longer form remains the job of Song Mode, golden path, and ensemble realisers.

**Stages**

1. **Stage 1 — Neutral core:** Define a **Phrase** representation (instrument-agnostic) and **phrase controls**: range, rhythm complexity, gaps, repetition, feel, density, contour, harmonic role / progression awareness. **Motif-first** musical thinking; creative reference points include (non-exhaustive) melodists such as Wayne Shorter, Beethoven, Stevie Wonder, Donald Fagen, Messiaen, Joni Mitchell, Ligeti — as *direction*, not imitation engines. **Rhythmic motif fingerprinting** (duration-weighted / grid-relative rhythm identity for recurrence scoring) is a natural fit here — complements Motif Authority V1’s coarse onset strings and should land alongside Stage 1 rather than as a one-off in `motifAuthorityV1.ts` only.
2. **Stage 2 — Module adapters:** Phrase **adapters / renderers** for selected surfaces (e.g. duo, quartet line, big-band lead line, songwriter section motif material). Prefer **MIDI-first / reusable phrase output** that existing arrangers can consume.
3. **Stage 3 — Guitar idiom lane:** After the shared core exists, add a **deeper idiomatic guitar lane** (fretboard / playability / articulation), informed by artists such as Scofield, Beck, Metheny, Frisell, Montgomery, Halvorson, Holdsworth — **without** leaking guitar playability rules into Big Band or String Quartet cores (same discipline as **Quartal Guitar Module** below).

**Lanes (conceptual):** Separate a **heavier riff / rhythmic cell** lane from a **clean arpeggio / “flow”** lane — analogous to preset phrase families and flow-style generation in tools like Riffler / Riffler Flow. **Borrow conceptually:** preset phrase families, explicit generation parameters, phrase-shaping controls, harmony-aware generation, MIDI-first reusable output. **Defer:** plugin packaging, amp/tone realism, huge tuning/style matrices.

**Dependencies (likely):** Stable **score model + export** path; alignment with existing **motif** and melody tooling in core; harness/test stability for iterative generation work. Leverages **progression/harmony** inputs already used elsewhere. **Research overlaps:** Slonimsky / pattern-system backlog (pick list #10) may inform **systematic cells**, not a substitute for Stage 1’s neutral Phrase type.

**Could unblock:** Richer **riff preset** behaviour without duplicating logic per ensemble; Song Mode **hook / motif** plumbing; ensemble **seed lines** without full arrangement; clearer handoff between **phrase layer** and **realisers** (BB/SQ/duo).

**Relation to existing roadmap threads:** Distinct from **Lead-sheet MusicXML import** (input path vs generative phrases). Complements **ECM arrangement** and **Big Band** depth by supplying **material**, not replacing sectional arranging. **Quartal Guitar Module** remains **voicing-specific**; Stage 3 phrase lane is **melodic/guitar-idiom** — keep boundaries explicit.

**Priority tier (recommended):** **Medium-term** for Stages 1–2 (after test-harness / core stability investments and alongside motif-related groundwork); **longer-horizon** for Stage 3 guitar idiom lane unless product pulls riff UX forward.

---

### Standalone study tools — Slonimsky Etudes & Wyble Etudes (2026-05-01)

**Positioning:** Both are **intentionally outside the Generate / golden-path pipeline** — separate **desktop** study surfaces (own tab or page), not another Song Mode control.

**15 — Slonimsky Etudes (standalone) — *ranked first* among the two**

- **Concept:** User picks a **pattern family** from a menu (tritone, whole-tone, M3 cycle, etc.); **educational** taxonomy is appropriate here; user supplies **chord or short progression** + **key**; app emits a **short, playable etude** (notation + playback + **MusicXML** export). **Optional:** transposition cycle through **12 keys**. **PDF** — treat as **Phase 2** unless a PDF pipeline already ships in desktop.
- **Engine readiness:** Core already has **Slonimsky pattern generation**, registry / sections, and **MusicXML export** via **`ScoreModel`**. **Gaps (real work):** thin **etude score shell** (parts, length, layout), **desktop UI + routing**, and **playback** wiring; **PDF** is a **dependency** if required in v1.
- **Complexity / priority:** **Medium** — mostly **UI + packaging + export**, bounded if v1 stays **short** and **single-line or minimal staff count**. **Ranks after** **Overall roadmap priorities** **Tiers A–C** (songwriter slices, Generate UI, lead-sheet→ensemble) in **product attention**, but is **Tier D** — the **clear first** among the two etude tools. **Relates to** pick list **#10** (pattern lines) — this row is the **user-facing product** expression; **#10** can stay as **engine / research** backlog or roll into **#15** when scheduled.

**16 — Wyble Etudes (standalone) — *ranked second* (lower priority than Slonimsky Etudes)**

- **Concept:** **Voice-leading / inner-line** study: given harmony, show how **four parts** move in a **Wyble-idiom** exercise. **Not** the same as today’s **pre-passes** only (`applyBigBandWybleLeadInnerSaxMidis`, `applyQuartetWybleChordToneStack`) — a **pedagogical generator** needs **product spec** (audience, instrument model, what “Wyble” means for teaching) and likely **new** generation logic.
- **Complexity / priority:** **Higher ambiguity, smaller addressable audience** (arrangers / advanced users) than **Slonimsky Etudes** — **schedule after #15** and after **design brief**. **Relates to** pick list **#3** (Wyble etude / product preset) — **#16** is the **standalone-study** framing; **#3** remains the **Generate-adjacent / preset** angle unless merged intentionally.

**Confirmed ordering:** **#15 Slonimsky Etudes** → **#16 Wyble Etudes** (same order as advisory review).

---

### Next best development (top 3 options — refreshed 2026-04-28)

**Maps to Overall roadmap priorities Tier A → Tier C** (see **§ Overall roadmap priorities (2026-05-01)** above).

1. **Ship more Song Mode songwriter profiles (golden-path slices)** — **Tier A.** Add or deepen **primary writer** behaviour using the **Songwriter profiles — priority 1** pattern above; pair each slice with **smoke** + **manifest receipts** + optional **eval** script row. **Concrete diversity queue:** **§ Top 10 Song Mode songwriter targets**.
2. **Generate UI: writer & style discoverability** — **Tier B.** Make **primary/secondary songwriter**, **style stack**, **diversity presets**, and **arranger pairing** easy to find so new profiles are testable without API-only workflows.
3. **Lead-sheet import stages 6–7 + ensemble chart-in** — **Tier C.** Extend **MusicXML harmony import** rollout (`importHarmonyPolicy`, blend modes) toward **String Quartet / Big Band** handoff when **`LeadSheet`** realisers land (**Lead-sheet MusicXML import** below).

*Near alternates:* **`TEST_DEBT`** clear-down for **`runAllTests`**; **Wyble** ensemble inner-line after duo parity; **ECM** arrangement pass.

**Scope note — songwriting engine, profiles, ensembles, arrangers:** The **top 3** above centre **songwriter product surface** and **chart input**; infra items (Wyble, chunked harness) remain in **priority stack** and **pick list** below.

| Thread | Where it lives in this doc |
|--------|----------------------------|
| **Songwriting engine** (`runSongMode` → **`buildCompiledSong`**, **`applySongwritingRules`**, compile → golden-path realisation) | **Past → Song Mode (structural + realisation)**; **Past → Songwriters & arrangers**; **Related paths** → `songModeBuilder.ts` |
| **Songwriter profiles & rule catalogue** | **Past → Songwriters & arrangers** — **`songwriterRuleRegistry`**, **`resolveSongwritingStyles`**, typed **`SongwriterRuleId`**; **Current** table row **Songwriters & arrangers (Song Mode)** |
| **Arrangers & songwriter × arranger pairing** | **`stylePairingResolver`**, **`buildCompiledSong`** + optional **`stylePairing`**; **Near term** item 1 “Song Mode diversity” + **priority stack**; pairing metadata still **engine-strong / UI-thin** |
| **Big Band** | **Past → Big Band** (COMPLETE); **Current** table **Phase 19.1 (BB/SQ)** + **Big Band + String Quartet — follow-ups**; pick list #6; **Near term** item 3 follow-ups |
| **String Quartet** | **Past → String Quartet** (COMPLETE); same **Current** rows and Wyble ensemble note (**Near term** item 5) |

**Research backlogs** for BB/SQ/ECM (`BigBandResearch.md`, `string-quartet-parameters`, `ECM_Bacharach_BarryHarris_Research.md`) remain **future depth**, not cancelled.

### Focus (2026-04-17)

- **Test debt:** Initial **baseline** added — see **`docs/TEST_DEBT_COMPOSER_OS_V2.md`** and **`scripts/test-baseline-composer-os-v2.ps1`**. Next: run `npm test` to completion, list remaining **`FAIL:`** cases, fix or document skips (no silent test deletion).
- **Vocal lead sheet closure:** **DONE for 2026-04-17 packaged check** — runbook executed on `release\win-unpacked\Composer OS Desktop.exe`; keep **`npm run test:vocal`** on pre-release checklist for regressions. See [CHANGELOG.md](CHANGELOG.md).
- **Wyble single-line parity (ongoing):** **2026-04-17** completed a **first small patch** (golden-path multi-seed bar-6/7 filter + stabiliser intent naming — see [CHANGELOG.md](CHANGELOG.md)); further alignment of remaining **`guitar_bass_duo`**-only guards and “realized” normalization remains. Keep **`npm run test:duo`** / **`npm run test:bass`** in the loop when touching duo/bass. **2026-04-17:** `Wyble_single_line_reference_01.musicxml` and `engine_trials/trial_01_guitar_line.musicxml` now hold **real** repo MusicXML copies (Wyble imported single staff + latest on-disk `composer_os_guitar_bass_duo` export; not PDF-engrave, not `guitar_bass_duo_single_line` — see [CHANGELOG.md](CHANGELOG.md)); descriptor anchor unchanged; no engine wiring yet.
- **Song Mode section-shape inspector (dev slice):** `songModeSectionShapingDiagnostics` + `songModeSectionBehaviourDescriptors` are now surfaced in desktop UI at `Generate -> latest result card -> Section Shape (dev diagnostics)` for Song Mode runs. This panel shows global A/B and opening/return deltas, return variation, and per-role rows (opening/bridge/return/outro/whole) with contributing slices and role bias means. Reference: `docs/song-mode-section-shape-diagnostics.md`.
- **Song Mode profile/rules inspector (dev slice):** `songModeProfileRuleDiagnostics` is now surfaced in desktop UI at `Generate -> latest result card -> Song Mode Profile / Rules (dev)`. It shows active style profile, songwriter/overlay ids, style fingerprint, resolved rule ids, and active behaviour sources. This differs from Section Shape by explaining *drivers* (profile/rules) rather than *section outcomes* (density/colour/return deltas).
- **Song Mode section slates/sources inspector (dev slice):** complete — desktop UI now shows `Section Sources / Slates (dev)` in the same Song Mode result area. It adds per-role source attribution (`sliceId`s) plus compact shaping tags (`density_bias`, `colour_bias`, `register_bias`, return-variation tag), complementing Section Shape (outcomes) and Profile/Rules (global drivers).
- **Song Mode review/compare UI (dev slice):** complete — Generate page now keeps a small in-memory list of recent Song Mode runs (session-only), lets you select two runs, and shows a side-by-side compare panel with compact profile/rules, section-shape cues, sources/slates cues, and a deterministic review summary (contrast, return clarity, source/rule mix).
- **Song Mode inspectability verification + manifest readability:** complete — real app-path Song Mode run verified all three dev blocks with non-empty diagnostics. Manifests now include compact `songModeDiagnosticsSummary` lines for profile/rules, section-shape deltas, and section-source attribution (eval-friendly scan layer).
- **Wyble inner-line depth (BB/SQ) slice:** started and completed as a bounded pass — added shared octave-nearest inner-line connective motion utility and applied it in both `bigBandWybleHornVoicing` and `quartetWybleChordToneStack` consumption paths, with regression harness coverage.
- **Wyble tranche checkpoint + manual inspection:** checkpointed on `main`; manual symbolic inspection across short seed sets shows inner voices moving in adjacent bars (not block-static), with effect subtle-but-audible rather than aggressive. Follow-up bounded step added: contrary-motion preference for inner voices when octave-equivalent choices are available (BB tenor against alto movement; SQ viola against violin II movement).
- **Wyble refinement checkpoint (final tranche):** complete — contrary-motion preference refinement is now checkpointed on `main` with targeted regression coverage.
- **ECM chamber bounded slice (textural arc shaping):** complete — added a small anti-static role-pair guard in `augmentEcmChamberTexturePlan` so identical guitar/bass role pairs do not carry over for long runs; this keeps chamber space/arc evolving without changing harmony or broad architecture. Effect is intentionally subtle and deterministic.
- **ECM chamber bounded slice (motif phrasing / return handling):** complete — return-cycle bars now apply a modest prior-cycle guitar-role memory in `augmentEcmChamberTexturePlan`, with light evolution (`lead -> shadow`, `sustain_pad -> inner_motion`) so reprise behavior feels recalled rather than copied. Intended effect is subtle motif-memory continuity, not overt repetition.
- **ECM chamber bounded slice (voicing character / role specificity):** complete — `augmentEcmChamberTexturePlan` now enforces clearer role character: guitar lead bars are paired with supportive bass roles (sustain/inner), bass-lead bars pull guitar to shadow with reduced overlap, and dual sustain-pad rows are gently broken to keep connective motion. Intended effect is clearer instrument-role identity without harmonic redesign.
- **ECM chamber bounded slice (voicing/spacing feel pass):** complete — refined ECM chamber texture planning with deterministic, low-risk role shaping that keeps space and role contrast evolving while preserving harmony/form behavior.
- **Riff Generator bounded feel slice (call/response rhythm identity):** complete — `buildMultiBarRhythm` now uses a deterministic A/B response pattern on 4+ bar riffs (A in bars 1/3, response-biased B in bars 2/4 with light tail variation) to reduce bland single-cell looping while preserving motif coherence. Validation added in `tests/riffGenerator.test.ts` via symbolic `perBarRhythm` fingerprint checks (contrast + recall) under seeded generation.
- **Riff Generator bounded feel slice (phrase closure landing):** complete — `applyLoopClosure` now cadences the final melodic attack to the opening pitch class via nearest in-range target selection (with leap guard against awkward penultimate jumps), giving 4+ bar loops a clearer “landed” ending without changing interfaces. Validation added in `tests/riffGenerator.test.ts` by seeded symbolic first/last guitar pitch-class closure checks.
- **Riff Generator bounded feel slice (short-riff style separation, Direction B):** complete — short 2-4 bar riff rhythm planning now applies style-biased attack profiles (`neutral` straighter, `scofield` moderate offbeat articulation, `funk` strongest offbeat/anticipation bias), improving perceived style identity without changing riff length or interfaces. Validation added via seeded symbolic tests asserting offbeat-attack ordering (`neutral <= scofield <= funk`) for both 2-bar and 4-bar riffs; see `docs/dev-notes/short-riff-quality-2026-04-21.md`.
  - Next action (no-code): run an ear-only play-test pass across `neutral` / `scofield` / `funk` short riffs and confirm style feel differences are audibly clear without consulting symbolic metrics.
- **Riff Generator bounded feel slice (Direction A motif development, 2-4 bars):** complete — bars 2 and 4 are now derived as interval-based motif variations of bars 1 and 3 (A1: anchor-relative interval offsets plus one small ±1-2 semitone mutation), producing related-but-not-identical short riff units while preserving style rhythm profiles and phrase closure. Symbolic seeded tests validate bounded similarity (not unrelated, not exact copy) for both 2-bar and 4-bar neutral riffs.
- **Eval readability pass (cross-mode):** complete — added compact one-line summary helpers for Song Mode and ECM eval outputs, and wired these into existing eval scripts for quick scanability in batch logs.
- **Song Mode A/B inspection harness v1:** complete — added a deterministic CLI harness that runs small A/B seed sets and prints compact summary rows (section shape + profile/rules + source cues) for post-build inspection.
- **Longer-horizon items** (Wayne Shorter product integration, ECM/Bacharach/Harris depth, Slonimsky tools, chord UX polish) remain on the roadmap in the sections below; this snapshot does not reprioritize them.

### Next possible devs (pick list)

| # | Dev | Notes |
|---|-----|--------|
| 0 | **Vocal lead sheet stabilization handoff** | **VERIFIED (2026-04-17)** on `release\win-unpacked\Composer OS Desktop.exe` (BPM 100; main + vocal; Sibelius). Ongoing: optional repeat on installer `release/Composer-OS.exe` if that is the ship path; keep **`npm run test:vocal`** on pre-release checklist; see [CHANGELOG.md](CHANGELOG.md). |

| # | Dev | Notes |
|---|-----|--------|
| A | **Song Mode — new songwriter profiles** | **Priority product lane:** ship **full slices** (chord pools + golden-path passes + receipts + **`test:smoke`** / eval), not ids-only — see **Priority stack** + **Future → Songwriter profiles — priority 1**. |
| 1 | **Wyble single-line parity (full stack)** | **2026-04-28:** B-category **`isGuitarBassDuoFamily`** guard sweep **complete** (golden path, Song Mode overlays, duo quality, pipeline truth, App API pilot checks). Optional: **`test:duo` / single-line** extra seeds if desired. |
| 2 | **Wyble “realized” normalization review** | **2026-04-17 (started):** **`shouldApplyRealizedVoice2Normalization`** + stabiliser boundary + probe **`isStandardGuitarBassDuo`** + JSDoc (see [CHANGELOG.md](CHANGELOG.md)). **Deferred:** wiring realized pass into golden path for single-line / shared validators with standard duo — confirm product intent first. |
| 3 | **Wyble Etude / product preset** | Today “Wyble” is mostly inner voice on duo; optional **`wyble_etude`** (or flag) for study mode, stricter rules, or dedicated release metadata row. |
| 4 | ~~**Phase 19.1 — longer forms in UI**~~ **COMPLETE** (2026-04-15) | Big Band + String Quartet: **16–64** bars in UI/API. Duo/Song **>32** still deferred (engine). |
| 5 | ~~**Wayne Shorter integration**~~ **COMPLETE** (2026-04-27) | TS Song Mode path: contextual chord pools, form-aware motif plan, motif fingerprint + Wayne pitch/duration return nudge; eval **8.8/10**. Python **`wayne-shorter-engine`** remains separate. **Also shipped:** duo **Phrase Engine Stage 4** (2026-04-28). Fuller **Phrase Engine** neutral abstraction + riff module remain complementary. |
| 6 | ~~**Big Band / String Quartet polish**~~ **COMPLETE** (2026-04-15) | Double Bass rename + MusicXML export label, **`big_band_blues12`** 42-bar form + UI/API, **`bigband-verify`** 14/14, SQ honestNote. |
| 7 | ~~**Song Mode — style exposure**~~ **COMPLETE** (2026-04-15) | Pattern slider, secondary songwriter, author overlay wired end-to-end; **`styleStack`** / classical overlay / further presets remain optional follow-ups. |
| 12 | **Vocal lead sheet — pipeline** | **VERIFIED packaged (2026-04-17)** — same as Current table; `release\win-unpacked\Composer OS Desktop.exe`; see [CHANGELOG.md](CHANGELOG.md). |
| 8 | **18.2D / bass regression expansion** | More seeds, property tests, or CI hook for **`test:duo`** + **`test:bass`**. |
| 9 | **ECM / Barry Harris / Bacharach** | Implement from **`ECM_Bacharach_BarryHarris_Research.md`** when extending chamber feel or style stacks. |
| 10 | **Slonimsky / pattern lines** | Melodic substitution or line tools from **`Slonimsky Engine.md`**. **Product umbrella (2026-05-01):** prefer scheduling **#15 Slonimsky Etudes (standalone)** when the goal is a **user-visible** study tool; keep **#10** for **engine-only** backlog if split is useful. |
| 11 | **Chord UX polish** | Rarer symbols, help text, parse-error tests; does **not** reopen #16 baseline. |
| 13 | **Lead-sheet MusicXML → SQ / BB (v1)** | **Planned** — shared **`LeadSheet`**, **`leadSheetFromMusicXml`**, **`realiseQuartetFromLeadSheet`** / **`realiseBigBandFromLeadSheet`**; staged PRs; see **Future → Lead-sheet MusicXML import**. |
| 14 | **Phrase Engine / Riff redesign** | **Planned** — motivic phrase core + module adapters + later guitar idiom lane; **not** whole-song generation; see **Future → Phrase Engine / Riff Generator redesign**. |
| 15 | **Slonimsky Etudes (standalone)** | **Planned** — desktop study tab: pattern family + harmony + key → short etude → notation / playback / MusicXML; optional **12-key** cycle; **PDF** Phase 2 unless pipeline exists. **Before #16.** See **Future → Standalone study tools**. |
| 16 | **Wyble Etudes (standalone)** | **Planned — after #15** — voice-leading study tool; needs **design brief**; Wyble today is **ensemble pre-passes** only, not a pedagogy API. See **Future → Standalone study tools**; relates to **#3**. |

### Near term (high leverage)

1. **Song Mode — more songwriter profiles + UI discovery:** **Tiers A + B** — ship **additional primary-writer slices** (see **Future → Overall roadmap priorities** · **Songwriter profiles — priority 1** · **Top 10 Song Mode songwriter targets**) and expose **songwriter / arranger / overlay / styleStack / diversity presets** in Generate so profiles are **discoverable and A/B-able**. **D2** receipt path — **done**; **vocal lead sheet** packaged path **VERIFIED (2026-04-17)** — see [CHANGELOG.md](CHANGELOG.md).
2. ~~**Wayne Shorter “engine integration” (product meaning)**~~ **COMPLETE (2026-04-27)** — contextual harmony + motif binding + fingerprint/nudge upgrades + **rhythmic return duration snap** shipped; optional UI surfacing / Python bridge remains future. Duo golden-path **Phrase Engine Stage 4** shipped **2026-04-28**; shared **Phrase Engine Stage 1** neutral abstraction remains complementary.
3. ~~**Big Band + String Quartet polish**~~ **COMPLETE** (2026-04-15) — Double Bass MusicXML export, **`big_band_blues12`** 42-bar form (UI + API validation), verify 14/14, SQ honestNote; further rehearsal copy / host smoke tests remain optional follow-ups.
4. **Wyble parity + quality** — full single-line stack alignment; expressive/rhetorical refinement (rhythm, phrasing, lower voice). **Do this before** ensemble Wyble work below. **2026-04-28:** B-category **`isGuitarBassDuoFamily`** sweep **complete**; optional extra **`test:duo`** seeds.
5. **Wyble for ensembles** — extend Wyble-style single-line / contrapuntal depth when desired; **near-term only after** item 4 parity is verified (`isGuitarBassDuoFamily` guards + **`npm run test:duo`** / **`test:bass`**). **2026-04-17:** Static duo / SQ / BB maps under `core/wyble/`; **all three** families have a **minimal** score-path consumer: duo bar-1 bass nudge (`duoWybleBassAnchorNudge.ts`), SQ inner swap (`quartetWybleChordToneStack.ts`), BB alto/tenor separation (`bigBandWybleHornVoicing.ts`). Full 3-voice Wyble ensemble generation remains future work.

### Medium term

- **Standalone study tools (#15 / #16)** — **Overall roadmap Tier D** — **Slonimsky Etudes** before **Wyble Etudes**; both outside Generate; see **Future → Standalone study tools — Slonimsky Etudes & Wyble Etudes**.
- **ECM Chamber — Arrangement & Orchestration depth** — register separation, sparser bass vs guitar, silence/space enforcement; shares ideas with sectional Big Band work. (See **ECM Chamber — Arrangement & Orchestration depth** section below.)
- **Big Band — V1 / V1.5 shipped (2026-04-20):** arranging scaffold in `bigBandPatterns.ts` + `bigBandScoreBuilder.ts` — deterministic **8-bar** sax soli **17–24** (when `totalBars >= 24`), brass tacet in-window, cadence punches + late shout fragment; **`npm run test:big-band-arranging`**.
- **Big Band V2 (shipped 2026-04-20):** theme-anchored **soli** (head lead + root contour) and **shout** lift; **drum** tiering (stronger on ensemble-hit bars, lighter timekeeping off hits); tests + **`eval:big-band-chart`**. **Future polish:** sectional counterpoint and further drum/section colour beyond this pass.
- **Voice 2:** **Counterpoint Phase 2 (2026-04-15): COMPLETE** — `voiceLeadingScorer` (Bizzi / Tymoczko / species-lite) wired into Guitar–Bass Duo Voice 2 candidate ranking; **10/10** `test:duo` PASS. Further **18.2B.3**-style melodic imitation / counterpoint refinement and **realized** metrics alignment remain (see table above).
- ~~**Phase 19.1** — forms **>32 bars** in UI~~ **Done for BB/SQ** (2026-04-15). **Duo/Song >32** remains deferred until golden path extends.
- **Chord handling (optional polish)** — rarer lead-sheet symbols, clearer in-app help / parse errors, and extra regression tests across presets/hosts; **does not reopen #16** (baseline marked **DONE** in README + docs/CHANGELOG).

## ECM Chamber — Arrangement & Orchestration depth

ECM is the only preset where Arrangement & Orchestration (not Melodic Identity) is the weakest GCE category (scored in first eval at 7.8/10 overall, Arrangement weakest).

What this means:
- ECM Chamber currently has thin part separation
- Guitar and bass register gap is low
- Density variation between parts is insufficient
- ECM aesthetic requires maximum space and register contrast — sparse bass, high guitar, clear layers

When to tackle:
- After Motif Authority Layer is complete
- After Big Band arranging depth session
- ECM arrangement work can share approaches with Big Band sectional writing

Specific improvements needed:
- Increase register separation between guitar and bass parts in ECM mode
- Add more density contrast — ECM bass should be much sparser than guitar
- Add silence/space enforcement specific to ECM
- Review ECM-specific voicing logic in `generateGoldenPathDuoScore.ts` ECM branches

### Quartal Guitar Module (mid-term, after GCE gate + Pat Metheny)

- User inputs chord progression
- System outputs quartal guitar voicings as MusicXML
- Assets already exist: Quartal Engine (Node+Python, 3-note/4-note stacks) + Quartal Atlas (fretboard viz)
- Phase 1: isolated guitar utility, no Composer coupling
- Phase 2: optional quartal voicing in duo guitar part
- Phase 3: abstract voicing layer for BB/SQ (optional)
- **CRITICAL:** guitar playability logic must never leak into Big Band or String Quartet modules

### Longer term / explicit non-goals until designed

- **D3** — undefined control surface.
- **Full** Python composer engines inside Electron without a bridge strategy.
- **creative-rule-engines** repo split — engine definitions live there per root README policy.

---

## Related paths

| Doc / code | Role |
|------------|------|
| [CHANGELOG.md](CHANGELOG.md) | Dated entries, phase completions |
| [README.md](../README.md) | Product narrative, phase summaries |
| [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md) | C1–C7, D1–D3, pipeline diagram |
| `engines/composer-os-v2/app-api/releaseMetadata.ts` | Honest capability matrix |
| `docs/COMPOSER_OS_ROADMAP.md` | This roadmap (update title date when refreshing) |
| `engines/composer-os-v2/core/song-mode/songwritingResearchTypes.ts` | Songwriter / author / classical rule ids |
| `engines/composer-os-v2/core/song-mode/songwriterRuleRegistry.ts` | Per-id rule bundles (writers + arrangers) |
| `engines/composer-os-v2/core/song-mode/songwriterStyleResolver.ts` | Primary + secondary + overlays → resolved rules + blended profile |
| `engines/composer-os-v2/core/style-pairing/stylePairingResolver.ts` | Songwriter × arranger pairing + era heuristics |
| `engines/composer-os-v2/core/song-mode/songModeBuilder.ts` | **`buildCompiledSong`** — wires resolution + optional **`stylePairing`** |
| `engines/composer-os-v2/core/song-mode/songModeSectionControl.ts` | **Section roles + behaviour descriptors + shaping diagnostics** (Song Mode; 2026-04-18) |
| `engines/songwriting_bridge/cli_export_lead_sheet.py` | Optional vocal lead sheet export (Song Mode) |
| `c:\Users\mike\Documents\Perplexity Research\string-quartet-parameters.txt` | **Future:** Perplexity research — string quartet style parameters to implement when SQ preset gains richer stylistic control (see String Quartet section above) |
| `c:\Users\mike\Documents\Perplexity Research\jazz-era.md` | **Future:** Perplexity research — jazz era / style reference for Big Band and broader jazz presets (see Big Band section above) |
| `c:\Users\mike\Documents\Perplexity Research\BigBandResearch.md` | **Future:** Perplexity research — Big Band arranging / composer vocabulary (see Big Band section; align with `engines/composer-os-v2/core/big-band/`) |
| `c:\Users\mike\Documents\Perplexity Research\Slonimsky Engine.md` | **Future:** Perplexity research — Slonimsky / pattern systems for lines and melodic tooling (see Other presets / research backlog above) |
| `c:\Users\mike\Documents\Perplexity Research\ECM_Bacharach_BarryHarris_Research.md` | **Future:** Perplexity research — ECM, Bacharach, Barry Harris (see Foundation & export / ECM research backlog above) |

---

*End of Composer OS Roadmap [2026-05-02].*


