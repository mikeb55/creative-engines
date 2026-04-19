# Composer OS Roadmap [2026-04-19]

**Canonical handoff doc for assistants (e.g. Claude).** Detail also lives in [CHANGELOG.md](CHANGELOG.md), [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md), and [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md). **Update this file’s title date** when you refresh the roadmap.

**Convention:** Whenever the user asks for a “roadmap,” use the title **`Composer OS Roadmap [YYYY-MM-DD]`** (snapshot date, typically today) and align content with this file or replace sections intentionally.

---

## Known issues — engine (2026-04-19)

- **`ecm_chamber` golden path — JavaScript heap OOM (deferred):** Unbounded retry behaviour in **`generateGoldenPathDuoScore.ts`** can exhaust heap at **32-bar** long-form generation. Not fixed in this snapshot. **Workaround:** **`GCE_SINGLE_PRESET`** (one preset per process) for GCE preset runs; omit **`ecm_chamber`** from single-process full eval until bounded. Detail: [CHANGELOG.md](CHANGELOG.md) § **Known issue — `ecm_chamber` golden path OOM**.
- **GCE v2.0 preset benchmark (2026-04-19):** Non-ECM presets **7.8–8.1/10** overall (seed **50021**, 32 bars, 100 BPM); universal weakest pillar **Melodic Identity**; **`ecm_chamber`** eval **OOM** pending. Tables: [GCE_FRAMEWORK_V2.md](GCE_FRAMEWORK_V2.md), [CHANGELOG.md](CHANGELOG.md).

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
- **Song Mode — writers & arrangers:** `core/song-mode/` ships a **typed songwriter + arranger rule catalogue** (registry + resolution + optional **songwriter × arranger** pairing). Full detail under **Past → Songwriters & arrangers**; **Generate UI** still lighter than the engine surface (see **Current** / **Future**).

---

## Past (delivered)

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
- **ECM Chamber:** full MusicXML golden path (`ecm_chamber`), Metheny vs Schneider feel scoring, ECM-specific style stack.
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

- **Riff Generator:** short-loop MusicXML to library path.
- **Wyble Etude:** Jimmy Wyble engine → MusicXML (chord resolution required).
- **Research backlog (not implemented yet):** Perplexity research **Slonimsky / pattern systems** — local file `c:\Users\mike\Documents\Perplexity Research\Slonimsky Engine.md`. **When refreshing this roadmap or building melodic substitution, line generation, or scale/chord pattern tooling,** use it as a reference; assistants should remind the user to implement from this source when roadmap discussions touch Slonimsky-based or systematic pattern engines.

### Big Band (2026-04-07) — **COMPLETE**

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

## Current (as of 2026-04-18 snapshot)

- **Song Mode + vocal path** is in good product shape for tempo and bridge execution.
- **Song Mode section diagnostics** — stable **`songModeSectionShapingDiagnostics`** on manifests / API for eval-friendly reads; receipt lines stack with existing songwriter/style bullets.
- **Test-debt triage (begun 2026-04-17):** **`docs/TEST_DEBT_COMPOSER_OS_V2.md`** + **`scripts/test-baseline-composer-os-v2.ps1`** document a **must-stay-green** set (`test:jest:counterpoint`, `test:duo`, `test:bass`, `test:vocal`, `test:composer-os-regression`) vs the **`npm test` / `runAllTests.ts`** debt bucket (still **not** all green). This is **baselining**, not a full fix pass.
- **`npm test`** in `engines/composer-os-v2` still shows many **`FAIL:`** lines in the full harness (export, written-bar regression, etc.) — treat as **known debt** until the baseline doc is refreshed after fixes.

| Area | State |
|------|--------|
| **Duo / ECM / Song Mode / Riff / Wyble** | Shipping **MusicXML** path; validation + receipts; chord diagnostics (#17) |
| **Phase 18.2D** | **Complete** (bass phrase intelligence + regression sweeps); **18.2E** **Complete** (gates + bass export) |
| **Phase 19** | **Complete** (UI ≤32 bars for duo/song) |
| **Phase 19.1 (BB/SQ long forms)** | **Complete** (2026-04-15) — Big Band and String Quartet **16–64** bars in UI + API; duo/song **deferred** |
| **Song Mode D-phase** | **D1** + C1–C7: **done** per architecture; **D2** (groove / space / expression / surprise → receipt): **done** per [CHANGELOG.md](CHANGELOG.md); **D3** reserved |
| **Songwriters & arrangers (Song Mode)** | **Core:** typed ids, **`songwriterRuleRegistry`**, **`resolveSongwritingStyles`**, **`stylePairingResolver`**, **`buildCompiledSong`** — **done**. **Generate UI:** primary/secondary/author/classical + arranger pairing exposure still **thin vs engine** for most controls; **golden-path slices:** **`STYLE_GROOVE_SOUL`**, **`donald_fagen`**, **`bacharach`**, **`STYLE_SOPHISTICATED_POP`**, plus **section-aware descriptors + aggregated diagnostics** (2026-04-18). |
| **Vocal lead sheet (Song Mode)** | **VERIFIED (2026-04-17):** Packaged `release\win-unpacked\Composer OS Desktop.exe` — Song Mode + vocal + BPM 100; main + vocal `.musicxml` at 100 BPM; Sibelius OK. Dev: checkbox / API path, metronome + `<sound tempo>` in Python export, TS bridge narrowing; **`npm run test:vocal`** green. See [CHANGELOG.md](CHANGELOG.md). |
| **Wyble Voice 2** | **Inject** extended to **single-line** duo family. **2026-04-17:** Parity + **realized normalization review (first pass)** — `shouldApplyRealizedVoice2Normalization` centralizes when Phase 18.2B.3 runs; `injectPhaseAGuitarVoice2Probe` uses **`isStandardGuitarBassDuo`**; JSDoc on realized pass. Full unify of realized metrics with standard duo / phrase-first single-line still **deferred** (pick list #2). |
| **Big Band + String Quartet — follow-ups** | **Chord input** + **Song Form** + **bar-length select** (16 / 24 / 32 / 40 / 48 / 64) wired; **piano** export naming (Sibelius-friendly) — see [CHANGELOG.md](CHANGELOG.md) |
| **Python engines** (`engines/wayne-shorter-engine`, `shorter-form-engine`, etc.) | **Not** integrated into Composer OS TS Generate path |
| **#19 / #16 / #17 (chord track)** | **Baseline complete** — unified semantics (#19), robustness baseline + export/receipt behaviour (#16), diagnostics in UI (#17). Aligned across [README.md](../README.md) and [docs/CHANGELOG.md](./CHANGELOG.md). |

---

## Future (prioritized directions)

### Next best development (top 3 options — 2026-04-18)

1. **Wire eval harnesses to `songModeSectionShapingDiagnostics`** — extend **`eval:fagen`**, **`eval:bacharach`**, and **`eval:style-soph-pop`** (or a thin shared reader) to consume the **stable v1** fields (`densityDeltaBMinusA`, `colourDeltaBMinusA`, `openingVsReturnDelta`, `returnVariationType`, `contributingSlices`) so batch A/B reports match manifest JSON without duplicating slice-specific parsers. Low risk; high inspectability payoff.
2. **Reduce `npm test` / `runAllTests.ts` fragility** — address **heap OOM** (Node `--max-old-space-size`, split suites, or fix the worst regressions listed in **`docs/TEST_DEBT_COMPOSER_OS_V2.md`**) so full Composer OS v2 test runs finish in CI/dev. Unblocks safer refactors across Song Mode and export.
3. **Continue Wyble single-line parity (pick list #1)** — align remaining **`guitar_bass_duo`**-only guards with **`isGuitarBassDuoFamily`** where musical rules match; keep **`npm run test:duo`** / **`test:bass`** green. Still the best **duo-product** leverage before deeper ensemble Wyble work.

*Optional near alternates:* UI surfacing of **section shaping** lines in the Generate receipt panel; **duo/Song >32** golden path when form product spec is ready.

**Scope note — songwriting engine, profiles, ensembles, arrangers:** The **top 3** above are a **narrow slice** (Song Mode diagnostics + test harness + Wyble duo). They do **not** replace the wider roadmap:

| Thread | Where it lives in this doc |
|--------|----------------------------|
| **Songwriting engine** (`runSongMode` → **`buildCompiledSong`**, **`applySongwritingRules`**, compile → golden-path realisation) | **Past → Song Mode (structural + realisation)**; **Past → Songwriters & arrangers**; **Related paths** → `songModeBuilder.ts` |
| **Songwriter profiles & rule catalogue** | **Past → Songwriters & arrangers** — **`songwriterRuleRegistry`**, **`resolveSongwritingStyles`**, typed **`SongwriterRuleId`**; **Current** table row **Songwriters & arrangers (Song Mode)** |
| **Arrangers & songwriter × arranger pairing** | **`stylePairingResolver`**, **`buildCompiledSong`** + optional **`stylePairing`**; **Near term** item 3 “Song Mode diversity”; pairing metadata still **engine-strong / UI-thin** |
| **Big Band** | **Past → Big Band** (COMPLETE); **Current** table **Phase 19.1 (BB/SQ)** + **Big Band + String Quartet — follow-ups**; pick list #6; **Near term** item 2 follow-ups |
| **String Quartet** | **Past → String Quartet** (COMPLETE); same **Current** rows and Wyble ensemble note (**Near term** item 5) |

**Research backlogs** for BB/SQ/ECM (`BigBandResearch.md`, `string-quartet-parameters`, `ECM_Bacharach_BarryHarris_Research.md`) remain **future depth**, not cancelled.

### Focus (2026-04-17)

- **Test debt:** Initial **baseline** added — see **`docs/TEST_DEBT_COMPOSER_OS_V2.md`** and **`scripts/test-baseline-composer-os-v2.ps1`**. Next: run `npm test` to completion, list remaining **`FAIL:`** cases, fix or document skips (no silent test deletion).
- **Vocal lead sheet closure:** **DONE for 2026-04-17 packaged check** — runbook executed on `release\win-unpacked\Composer OS Desktop.exe`; keep **`npm run test:vocal`** on pre-release checklist for regressions. See [CHANGELOG.md](CHANGELOG.md).
- **Wyble single-line parity (ongoing):** **2026-04-17** completed a **first small patch** (golden-path multi-seed bar-6/7 filter + stabiliser intent naming — see [CHANGELOG.md](CHANGELOG.md)); further alignment of remaining **`guitar_bass_duo`**-only guards and “realized” normalization remains. Keep **`npm run test:duo`** / **`npm run test:bass`** in the loop when touching duo/bass. **2026-04-17:** `Wyble_single_line_reference_01.musicxml` and `engine_trials/trial_01_guitar_line.musicxml` now hold **real** repo MusicXML copies (Wyble imported single staff + latest on-disk `composer_os_guitar_bass_duo` export; not PDF-engrave, not `guitar_bass_duo_single_line` — see [CHANGELOG.md](CHANGELOG.md)); descriptor anchor unchanged; no engine wiring yet.
- **Longer-horizon items** (Wayne Shorter product integration, ECM/Bacharach/Harris depth, Slonimsky tools, chord UX polish) remain on the roadmap in the sections below; this snapshot does not reprioritize them.

### Next possible devs (pick list)

| # | Dev | Notes |
|---|-----|--------|
| 0 | **Vocal lead sheet stabilization handoff** | **VERIFIED (2026-04-17)** on `release\win-unpacked\Composer OS Desktop.exe` (BPM 100; main + vocal; Sibelius). Ongoing: optional repeat on installer `release/Composer-OS.exe` if that is the ship path; keep **`npm run test:vocal`** on pre-release checklist; see [CHANGELOG.md](CHANGELOG.md). |

| # | Dev | Notes |
|---|-----|--------|
| 1 | **Wyble single-line parity (full stack)** | **2026-04-17:** Partial — `runGoldenPath` seed sweep bar-6/7 filter now uses **`isGuitarBassDuoFamily`**. Remaining: align other **`presetId === 'guitar_bass_duo'`** guards where behaviour should match inject; add **`test:duo` / single-line** seed if missing. |
| 2 | **Wyble “realized” normalization review** | **2026-04-17 (started):** **`shouldApplyRealizedVoice2Normalization`** + stabiliser boundary + probe **`isStandardGuitarBassDuo`** + JSDoc (see [CHANGELOG.md](CHANGELOG.md)). **Deferred:** wiring realized pass into golden path for single-line / shared validators with standard duo — confirm product intent first. |
| 3 | **Wyble Etude / product preset** | Today “Wyble” is mostly inner voice on duo; optional **`wyble_etude`** (or flag) for study mode, stricter rules, or dedicated release metadata row. |
| 4 | ~~**Phase 19.1 — longer forms in UI**~~ **COMPLETE** (2026-04-15) | Big Band + String Quartet: **16–64** bars in UI/API. Duo/Song **>32** still deferred (engine). |
| 5 | **Wayne Shorter integration** | Deepen TS pipeline: **`shorterMode`**, style modules, or UI; keep distinct from Python **`wayne-shorter-engine`**. |
| 6 | ~~**Big Band / String Quartet polish**~~ **COMPLETE** (2026-04-15) | Double Bass rename + MusicXML export label, **`big_band_blues12`** 42-bar form + UI/API, **`bigband-verify`** 14/14, SQ honestNote. |
| 7 | ~~**Song Mode — style exposure**~~ **COMPLETE** (2026-04-15) | Pattern slider, secondary songwriter, author overlay wired end-to-end; **`styleStack`** / classical overlay / further presets remain optional follow-ups. |
| 12 | **Vocal lead sheet — pipeline** | **VERIFIED packaged (2026-04-17)** — same as Current table; `release\win-unpacked\Composer OS Desktop.exe`; see [CHANGELOG.md](CHANGELOG.md). |
| 8 | **18.2D / bass regression expansion** | More seeds, property tests, or CI hook for **`test:duo`** + **`test:bass`**. |
| 9 | **ECM / Barry Harris / Bacharach** | Implement from **`ECM_Bacharach_BarryHarris_Research.md`** when extending chamber feel or style stacks. |
| 10 | **Slonimsky / pattern lines** | Melodic substitution or line tools from **`Slonimsky Engine.md`**. |
| 11 | **Chord UX polish** | Rarer symbols, help text, parse-error tests; does **not** reopen #16 baseline. |

### Near term (high leverage)

1. **Wayne Shorter “engine integration” (product meaning)** — deepen **Composer OS** integration: style modules, duo grammar, or UI surfacing; distinguish from standalone Python `wayne-shorter-engine`.
2. ~~**Big Band + String Quartet polish**~~ **COMPLETE** (2026-04-15) — Double Bass MusicXML export, **`big_band_blues12`** 42-bar form (UI + API validation), verify 14/14, SQ honestNote; further rehearsal copy / host smoke tests remain optional follow-ups.
3. **Song Mode diversity:** expose **songwriter / arranger / overlay** controls and **`styleStack`** (or presets) in UI; **D2** receipt path — **done**; next: diversity presets / advanced intent; **vocal lead sheet** packaged path **VERIFIED (2026-04-17)** — see [CHANGELOG.md](CHANGELOG.md).
4. **Wyble parity + quality** — full single-line stack alignment; expressive/rhetorical refinement (rhythm, phrasing, lower voice). **Do this before** ensemble Wyble work below.
5. **Wyble for ensembles** — extend Wyble-style single-line / contrapuntal depth when desired; **near-term only after** item 4 parity is verified (`isGuitarBassDuoFamily` guards + **`npm run test:duo`** / **`npm run test:bass`**). **2026-04-17:** Static duo / SQ / BB maps under `core/wyble/`; **all three** families have a **minimal** score-path consumer: duo bar-1 bass nudge (`duoWybleBassAnchorNudge.ts`), SQ inner swap (`quartetWybleChordToneStack.ts`), BB alto/tenor separation (`bigBandWybleHornVoicing.ts`). Full 3-voice Wyble ensemble generation remains future work.

### Medium term

- **Voice 2:** **Counterpoint Phase 2 (2026-04-15): COMPLETE** — `voiceLeadingScorer` (Bizzi / Tymoczko / species-lite) wired into Guitar–Bass Duo Voice 2 candidate ranking; **10/10** `test:duo` PASS. Further **18.2B.3**-style melodic imitation / counterpoint refinement and **realized** metrics alignment remain (see table above).
- ~~**Phase 19.1** — forms **>32 bars** in UI~~ **Done for BB/SQ** (2026-04-15). **Duo/Song >32** remains deferred until golden path extends.
- **Chord handling (optional polish)** — rarer lead-sheet symbols, clearer in-app help / parse errors, and extra regression tests across presets/hosts; **does not reopen #16** (baseline marked **DONE** in README + docs/CHANGELOG).

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

*End of Composer OS Roadmap [2026-04-19].*

