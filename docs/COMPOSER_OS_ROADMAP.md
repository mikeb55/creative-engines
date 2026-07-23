# Composer OS Roadmap [2026-07-23]

## ✅ Active Now (top priority — everything below is backlog)

**Roadmap remaining (2026-07-19) — pick any open item; all independent:**

| Lane | Status |
|------|--------|
| **Riff chord-loop trust** | **Phase 1 SHIPPED** — post-gen `chordLoopDisclosure` + banner (null→Am7 no longer silent) · **Phase 2** inline token badges + preflight · **Phase 3** ack gating + per-token fallback picker (not started; no polychord grammar) |
| **Riff phrase library** | **Phase 1 ingest** + **Phase 1.5 S0–S3** `#/riffgen` QA + GenerateIsland **SHIPPED** — **10** schema categories / target **106**; derived **120** files / **251** phrases; **blues_rock** ingest **SHIPPED** (**18**/18 · **30** phrases); **southern_rock** ingest **SHIPPED** (**13**/13 · **27** phrases); **bebop** ingest + motif-seed **SHIPPED**; **Phase 1.9** fidelity SHIPPED; **seven pairings** (flags + RiffGen toggle default OFF): sax→weather_report / jazz_rock→mahavishnu / dim→fripp / white_rock_funk→iommi / black_soul_funk→nile_rodgers / bebop→bill_evans_sax / blues_rock→hendrix (`COMPOSER_OS_RIFF_BLUESROCK_MOTIF_SEED`) — **bebop seed 2:** OFF hard-gate FAIL → ON PASS; blues-rock confirm **2/3/4** ON cos **≥0.85**; empty stubs await GPX: `modern_rock`, `progressive_blues`; southern_rock pairing deferred; confirm excludes seed 1307 (2-iv degenerate); broader default-ON = future; **Phase 2** full staged (hook/loop/weights) still held · pitch **PR A/B/C** shipped |
| **CLOSED prior session** | CI smoke **8/8** → **0** unexpected · Score-5 (**30**) + Score-6 BB (**4**) wired · Phase 2 Batches **1–6** + Beefheart + Fela + Threadgill + **Weber** HV widen **COMPLETE** · fBT vs custom_locked bug family fully resolved · Bass-identity rhythm-cell (`bacharach` + `oliver_nelson`) **CLOSED** · jamerson RiffGen Phase E **CLOSED** · **Riff Generator Phase A + B + soft-link** **CLOSED** (chord colour + pattern soft-link, smoke **772**/141) · **Mosaic global HV** **CLOSED** · Full smoke **772**/141, known **5**, unexpected **0** |
| **1. Phase 2 widen** | Berg + Beefheart + Fela + Threadgill + **Weber** HV walls **COMPLETE** — next: **Mosaic HV** product decision |
| **2. Mosaic HV** | **COMPLETE (2026-07-16)** — **global** HV overlay shipped; per-section map rejected |
| **3. Riff Generator** | **HV Phase A+B + soft-link COMPLETE (2026-07-16)** — see `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md` · **Phase 1.5 RiffGen** S0–S3 on `#/riffgen` (inspect + GenerateIsland) **SHIPPED** · **chord-loop trust Phase 1** disclosure **SHIPPED** · desktop hash-route reload fix **SHIPPED** · pitch PR A/B/C shipped; phrase-engine Phase 2/3 **gated** · **S4** curation still backlog |
| **4. Score-4 defer** | Parked / low ROI — **9** composers, Slonimsky-transport-only |
| **5. Tier 3** | Parked / low ROI — **10** composers, score **0–3**, out of HV scope |

- **Milestone B — Block cards + manipulation** (desktop Tab 2 “Arrange in Blocks”: scaffold → 8-bar cards, chords + composer chip, duplicate/reorder/delete). **Band Mode engine complete** — progressions, variable length, and section-varying drums shipped (`2414fcbe`).

**Canonical handoff doc for assistants (e.g. Claude).** Detail also lives in [CHANGELOG.md](../CHANGELOG.md), [docs/CHANGELOG.md](CHANGELOG.md), [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md), and [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md). **Update this file’s title date** when you refresh the roadmap.

**V86–V89 premium-melody + Bartók CLE (2026-06-13 snapshot):**

| Track | Status |
|-------|--------|
| **V86 — shared `core/premium-melody/`** | **COMPLETE** — BH rhythm+expression refactored; byte-identical **`bh-benchmark-seed88109`** oracle |
| **V86 Commit 2 — Wayne Shorter** | **FROZEN (rhythm+expression)** — native **`WS_Benchmark_ModalMelody.musicxml`**, **`ws-modal-seed90217`**; pitch-v2 **deferred** |
| **V87 Commit 2c — Bill Evans** | **FROZEN** — full pitch-v2 (`be_jazz_ballad_v1`), **`be-lyrical-seed90301`** oracle; registry **`frozen: true`** (2026-06-13 housekeeping) |
| **V89 Commit 2c — Hendrix** | **FROZEN** — **`jh_blues_lead_v1`** + four optional pitch mechanisms; **`jhGoldenMaster`** seed **90303**; registry **`frozen: true`** |
| **Bacharach / Monk / Joni / SY / Zappa (premium-melody roster)** | **Registry placeholders only** — Song Mode slices **shipped**; premium-melody **not started** |
| **V88 — Bartók CLE pitch scoring** | **FROZEN** — eval **8.0/10** seed **61234**; **`bartokClePitchScoringGoldenMaster`** in smoke |
| **Musician shell (desktop v1)** | **SHIPPED** — default **`Composer-OS.exe`** plain HTML UI; **32-bar Song Mode**; registry-driven composer list; **`COMPOSER_OS_FULL_UI=1`** → React Generate |
| **Smoke tier** | **`npm run test:composer-smoke`** — **772** PASS rows / **141** suites (2026-07-16; Mosaic global HV +4). Known fail **5** (tracked). Unexpected fail **0**. |

**Evans Musician bridge — DONE (2026-06-14):** **`beMusicianPremiumMelodyBridge`** wired behind Evans-only **`musicianPremiumMelody`** + Musician IPC; 32-bar tiling + co-onset seam repair merged (**`2c7bb23d`**); premium-melody fingerprint reaches final **`song_mode`** compiled/export XML on Musician/desktop path; golden oracles **byte-identical**.

**V83d Phase 1 — COMPLETE (2026-06-10):** BH **`guitar_bass_duo`** comp-side rhythm — passing **`passing_dim`** events export to score (was receipts-only); inner comp voices **stagger** to weak beats under locked melody; **`runV83dPhase1AutoValidation.ts`**; smoke **664**/0; V81 **8/8**. **Next — V83d Phase 2:** melody rhythm enrichment (`preservePitchSequence`, composer profiles). **`gp.success`** phrase gate on 8-bar import unchanged (known follow-up).

**V80L — COMPLETE (2026-06-09, tag `v2.8.0`):** Barry Harris **chord-melody UI + docs + ship** — Mosaic style-transfer **Barry Harris Chord-Melody** mode banner · scale-of-chords + rung/VL/guitar sanity readouts · import guidance · **`docs/BH_QUICK_GUIDE.md`** · handbook section · echo fields (`avgVoiceLeadingStep`, `guitarFeasiblePct`, `scaleOfChordsBySection`) · desktop **`v2.8.0`**. Engine ladder shipped in **V82 / `v2.7.0`**.

**V82 — COMPLETE (2026-06-09, tag `v2.7.0`):** Barry Harris **chord-melody** on style-transfer path — sixth/dim7/borrowed note selector · fake-book reinterpret · identity spellings · melody-top block voicings · **`bh:cm:*`** per-note receipts · **`barry_harris`** VRB observability · **`npm run eval:barry_harris`** · smoke depth (+3 rows). Legacy bebop slice **`bh:bebop_*`** / **`bh:sixth_*`** unchanged. See [CHANGELOG.md](CHANGELOG.md) § **2.7.0**.

**V81 — COMPLETE (2026-06-08, tag `v2.6.0`):** Full Generate-tab UI for V80 engines — import panel (**`1acc7b55`**) · API echo (**`ddc8d83c`**) · generate wiring (**`23043450`**) · variation picker (**`a05b5122`**) · style-transfer controls (**`14a7e616`**) · output filename + library folder (**`dbfc2998`** · **`22bd0443`**) · section planner timeline (**`b9b8bb82`**) · receipt upgrades (**`b01ef26b`**) · ship **`v2.6.0`**. See [CHANGELOG.md](../CHANGELOG.md) § **v2.6.0**.

**V80 — COMPLETE (2026-06-07, tag `v2.5.0`):** **Track 1** — BB + SQ fully Mosaic-dispatched (**`18e49bd2`** · **`00afdda0`** · **`cdac241e`** · **`21e66125`** · **`2f15b808`** · **`067ad54f`**) · **Track 2** — MIDI/MusicXML import → variation + style-transfer (**`a3589cbc`** · **`91899bad`** · **`52114366`**) · **Track 3** — mixed-preset MusicXML merge duo + BB + SQ in one score (**`187199c0`** · **`325f6a71`**) · ship **`v2.5.0`**. See [CHANGELOG.md](../CHANGELOG.md) § **v2.5.0**.

**V79 — COMPLETE (2026-06-07):** Song Mode ↔ Mosaic integration — BB/SQ app pass-through (**`673e865d`** + opt-in gate **`e390465b`**) · per-section composer routing mapper v2 (**`739ecd0f`**) · Generate UI mosaic section planner (**`4ab5dfdd`**) · pipeline-truth LOCK harmony spine (**`8b27925c`**) · Song Mode end-to-end mosaic smoke (**`48d65098`**) · hook-first section-scoped bypass lift (**`f1d11ffe`**) · ship **`v2.4.0`**. See [CHANGELOG.md](../CHANGELOG.md) § **v2.4.0**.

**V78 — COMPLETE (2026-06-07, tag `v2.3.0`):** LFV integrity fix (**`05fb79f7`**) · BB mosaic output format at ScoreModel (**`b036849a`**) · SQ mosaic output format (**`55be2520`**) · Song Mode → Mosaic thin mapper at golden-path handoff (**`f14eaaba`**).

**Post-v2.8.0 backlog:** Interactive confidence heatmap (click-to-override) · variation contour SVG previews · pre-generate candidate preview (needs preview API) · section planner drag-to-resize · style-transfer dry-run preview · **`IR.sectionStarts`** (rehearsal-mark parsing for true section auto-fill) · **V83d Phase 2** melody rhythm enrichment · Jack White slice fix (**2** allowlisted smoke rows) · App.tsx Composer Engines tab consolidation · **`HomeGenerate.tsx`** Babel deopt file split · **`desktop:dev`** prod-path `.md` loader · duo depth · multi-chorus quality · MusicXML import phase 3+ · Wyble parity · ECM GCE orchestration. See **§ Current**.

**V30 — COMPLETE (2026-05-05):** **Odd meter UI parity** (mixed-meter badge on chart preview + paste / iReal result blocks); **MusicXML import Phase 1** (`parseMusicXml` / core **`ParsedChart`** path); **Duo expansion** — Song Mode **pairing cards** + swap (**`pat_metheny`**, **`bacharach`**, **`ecm_chamber`**), **Duo intent** selector (UI), **Duo Health** pill on success, **ECM Chamber safe sweep** badge + Advanced override (**UI-only**). Duo expansion here was **surfaces + diagnostics**, not a duo golden-path slice rebuild.

**V64 — COMPLETE (2026-05-24):** Section architecture + Zappa GCE structural layer + per-section VRB/meter (P1–P6). P7 closeout: **+22** smoke rows (**7** goldens in smoke). Smoke **307/73/0** fast · **472/87/0** full. See [COMPOSER_OS_ROADMAP_V64.md](COMPOSER_OS_ROADMAP_V64.md).

**V65 — COMPLETE (closed 2026-05-25):** Section architecture P1/P2, MusicXML deep import P3, Groove Scaffold P4, and Zappa diff/per-section behavior P5 are shipped and promoted to smoke in P6. Smoke **324/80/0** fast · **489/94/0** full. See [COMPOSER_OS_ROADMAP_V65.md](COMPOSER_OS_ROADMAP_V65.md).

**V66 — NEXT BACKLOG:** remaining **10** FZ_* receipt stubs · section editor UI · fretboard view · MusicXML import stress / repeat truth hardening · ContrapuntalLineEngine / parallelRepair / eraChordNormalizer follow-up — see **§ V66 backlog**.

**V58 — COMPLETE since V57 (`0e2dfe0e` … `3b8db553`):** **Export-truth consolidation** (`assertExportTruth`) · **Contrapuntal Pass 4** (SQ/BB MusicXML from `contrapuntalLineSet`) · **Long forms 40–64 bars** (duo/song product quality) · **Film-stub VRBs → full receipts** (8 composers) · **Lead-sheet MusicXML import phase 3+** · **Output validation layer** (MIDI + MusicXML + audio; smoke +11 rows) · **SQ VRB slices:** Ligeti **σ=32**, Satie **σ=19**, Cole Porter **σ=25**, Gershwin **σ=27** · **GM string playback** (Violin I/II, Viola, Cello — Tone.Sampler + FluidR3_GM on SQ→BB panel).

**SQ Harmonic Voice — GCE σ table (`registerCohesionStdevCeilingSt`, all 17):**

| vrbId | σ | vrbId | σ |
|-------|---|-------|---|
| glass | 18 | cole_porter | 25 |
| satie | 19 | williams | 26 |
| rota | 19 | zimmer | 26 |
| ravel | 20 | gershwin | 27 |
| badalamenti | 21 | shostakovich | 28 |
| morricone | 22 | ligeti | 32 |
| joni_mitchell | 23 | herrmann | 36 |
| goldsmith | 24 | webern | 40 |
| **bartók** | **24** | | |

Registry: `sqVrbProfileRegistry.ts` (16 ids) + **bartók** native bundle (not in registry map). **Smoke (2026-05-25):** full **489/0** (**94** suites) · fast **324/0** (**80** suites). V65 closeout: off-smoke goldens promoted (+17 rows, +7 suites).

**V61 — COMPLETE (2026-05-23):** Slonimsky UI panels U1–U9 — universal, song mode, ensemble (BB/SQ), GBD, SQ→BB hybrid, advanced drawer (pin/forbid cells), harmonic voice selector (sonic_youth warning + no `harmonicVoice` in payload), UX copy, Zappa advanced relocation; smoke **`slonimsky-ui`** UI/boundary goldens only.

**Verlaine GBD Voice — WORKING (2026-07-06):** **`verlaine`** in GBD Slonimsky **Voice** roster; **`harmonicVoice: verlaine`** on generate (Barry Harris primary + Verlaine harmonic overlay). Commits **`8f248347`** → **`50e1d2a5`**; desktop **v2.10.8**. See **`docs/VERLAINE_GBD.md`**.

**V31 — COMPLETE (2026-05-11):**

- **Complete:** (1) **CI smoke on `main`** — **`b8d47db`** · (2) **Deterministic remix** (seed wiring, A/B cards, ChorusArcStrip, Keep A/B/Both) — **`3453292`** · (3) **Writer recipe cards** (inline Generate: display name, era, melody device pills, one-line blurb, hover preview on songwriter select) — **`c2d9747`** · (4) **Duke Ellington** full Song Mode harmony slice + handbook — **`21b06fb`** · (5) **Maria Schneider** full Song Mode harmony slice + handbook — **`3b68085`** · (6) **Miles Davis** full Song Mode harmony slice (three period contexts) + handbook — **`263b4e9`** · (7) **Duo intent → generation** (`duoIntent` UI → **`generationMetadata`** → **`duoGoldenPathPhraseIntentAtBar`** phrase bias + **`adjustDuoEnsembleStaggerForProductIntent`** attack stagger) — **complete 2026-05-11** (MIDI velocity voice-balancing explicitly deferred) · (8) **MusicXML import Phase 2** — Song Mode LeadSheet **`SONG_MODE_LEADSHEET_PHASE1_WRITERS`** expanded (**`donald_fagen`**, **`barry_harris`**, **`bill_evans`**, **`antonio_carlos_jobim`**, **`pat_metheny`**, **`bacharach`**, **`herbie_hancock`**); **`HomeGenerate.tsx`** + **`composerOsAppGeneration.ts`** parity; smoke **246/0** — **complete 2026-05-11** · (9) **Clave grid overlay (V31)** — **`ClaveGridSpec`** + stub registry (`son_basic` / `rumba_basic` / `afro_6_8_basic`), **`applyClaveGridOverlay`** after **`computeRhythmicConstraints`**, flag **`COMPOSER_OS_CLAVE_GRID_OVERLAY`** (+ **`VITE_`** mirror), **`GenerationMetadata.claveGridOverlayReceipt`** — **complete 2026-05-11**.
- **Structural memory (Phase 1, 2026-05-10):** **`gceStructuralMemory`** JSON fingerprints + melodic consecutive-bar guard; Steely Orbit script **`orbit_v6_64`** pre-GCE gate; seeds **`orbit_v6_64`** / **`steely_orbit_v1_7`** under **`engines/composer-os-v2/gce-memory/fingerprints/`**.
- **Big Band — Thad Jones vocabulary (2026-05-11):** Research-aligned **`SONGWRITER_CHORD_POOLS`** (**`swing` / `dorian` / `shout`**) + **`VoiceRuleBundle`** **`thad_jones`** (fingerprint receipts); BB registry **`thad`** alias ↔ **`thad_jones`**; arranger mapping normalises to **`thad_jones`**. See [CHANGELOG.md](CHANGELOG.md) `[Unreleased]`.
- **Charles Mingus — pools + episode slice (2026-05-11):** **`mingus_blues` / `mingus_modal` / `mingus_chromatic`** + **`charlesMingusSlice`** episode plan + **`cm:*`** receipts; **`VoiceRuleBundle`** fingerprints; BB **`charles_mingus`** + **`mingus`**. See [CHANGELOG.md](CHANGELOG.md) `[Unreleased]` · [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md).
- **BB gap-fills — Gil / Schneider pools + Gil harmony rail + Wayne preset (2026-05-11):** Renamed **`gil_evans_*`** / **`schneider_*`** tier pools; **`gil_evans`** effective harmony wired like other slices; **`wayne_shorter`** on BB preset + arranger map. See [CHANGELOG.md](CHANGELOG.md) `[Unreleased]`.
- **VRB deepening — Ellington / Gil Evans / Shorter / Schneider — DONE:** **`4aa848a5`** (**11** receipts each) + **`DUKE_ELLINGTON_KEYS_COMP`** · **Brookmeyer / Nelson VRB deepen — DONE:** **`48e5407d`**, **`e4814fb3`** (**12** each). **Sammy Nestico + Quincy Jones — VRB deep DONE:** **`voiceRuleBundles.ts`** **`fingerprintReceipts`** **41** / **46** lines respectively; additive harness **`voiceRuleBundleHarnessAdditive.test.ts`** floors **≥10** / **≥11**. **No VRB composer deepening lane is in the current sprint.** Handbook: [COMPOSER_HANDBOOK.md](COMPOSER_HANDBOOK.md) § **VoiceRuleBundle (VRB) fingerprint status**.
- **Shipped since `6b4f5f89` (engine):** **`6344cdcb`** BB composer stubs + harmony rail (Nestico, Brookmeyer, Fischer, Nelson) · **`ac875ae8`** Count Basie Song Mode (**38** VRB incl. **`CB_HARM_01`–`08`**, **`CB_VL_01`–`06`**, **`CB_RHYTHM_01`–`06`**, **`CB_FORM_01`–`07`**, **`CB_FP_01`–`03`**) · **`8b8775e4`** Quincy Jones Song Mode + BB registry · **`4aa848a5`** VRB batch · **`a4ae08de`** Messiaen slice · **`913987d7`** Messiaen docs · **`48e5407d`** Brookmeyer stack · **`e4814fb3`** Oliver Nelson stack.
- **Debussy research encoding (2026-05-12):** **`debussySlice.ts`** — harmony **`db:*`**, form **`db:form*`**, orchestration **`db:orch*`**, composite **`DB_FP_01–04`** (`debussyFingerprintReceipts`, **`fpTags=`** on slice receipt, **`debussyDiagnostics.fingerprintReceipts`**); **`finalizeDebussyMetadata`** + manifest/API echo; **`voiceRuleBundles`** DEBUSSY **`fingerprintReceipts`** includes DB_FP summary lines; smoke **`debussySliceSmoke.test.ts`**.
- **Radiohead research encoding (2026-05-12):** **`radioheadSlice.ts`** now carries **`RH_HARM_01–10`**, **`RH_VL_01–06`**, **`RH_MEL_01–05`**, **`RH_RHYTHM_01–06`**, **`RH_ORCH_01–05`**, and **`RH_FP_01–03`** fingerprint receipts / diagnostics; **`radioheadMelodicContext`** is on the Generate/API path; manifests echo the rhythm / melodic / orchestration / fingerprint layers.
- **Wayne Shorter deepening (2026-05-12):** **`wayneShorterSlice.ts`** + **`voiceRuleBundles.ts`** now expose **`WS_HARM_01–06`**, **`WS_MEL_01–04`**, **`WS_RHYTHM_01–03`**, **`WS_FORM_01–02`**, and composite **`WS_FP_01–03`**. API + manifest echo **`wayneShorter*FingerprintReceipts`** and **`wayneShorterFingerprintReceipts`**; smoke **`wayneShorterSliceSmoke.test.ts`** asserts the chain.

### Writer Slice Roadmap — priority order for full slice development

**Priority status:** **Beatles (`beatles`) — COMPLETE** · **Bill Evans (`bill_evans`) — COMPLETE** · **Frank Zappa (`frank_zappa`) — COMPLETE** · **ECM Chamber (`ecm_chamber`) — COMPLETE** · **Bacharach (`bacharach`) — COMPLETE** · **Brian Wilson (`brian_wilson`) — COMPLETE** · **Radiohead (`radiohead`) — COMPLETE + deep fingerprint refresh 2026-05-12** · **Thelonious Monk (`thelonious_monk`) — COMPLETE** · **Jobim (`antonio_carlos_jobim`) — COMPLETE + `VoiceRuleBundle` `jobim` / `JB_*` VRB (2026-05-13)** · **Debussy (`debussy`) — COMPLETE** (harmony + form + orch + **DB_FP** composite receipts **2026-05-12**) · **Wayne Shorter (`wayne_shorter`) — COMPLETE + deep fingerprint refresh 2026-05-12** · **Fripp / King Crimson (`fripp_king_crimson`) — COMPLETE** · **Olivier Messiaen (`messiaen`) — COMPLETE (`a4ae08de`)** · **Count Basie (`count_basie`) — COMPLETE (`ac875ae8`)** · **Bob Brookmeyer (`bob_brookmeyer`) — COMPLETE (`48e5407d`)** · **Oliver Nelson (`oliver_nelson`) — COMPLETE (`e4814fb3`)** · **Quincy Jones (`quincy_jones`) — Song Mode + BB wired (`8b8775e4`; VRB deep — **46** `fingerprintReceipts`)**.

**Current sprint composer lane:** none. **Nestico** / **Quincy** BB **`fingerprintReceipts`** stacks **41** / **46** are complete (see V31 bullet); no composer is marked **NEXT** here.

**Later — classical / extended-harmony:** **György Ligeti** (`ligeti`) — **SQ VRB `ligeti` + `LG_*` receipts shipped (2026-05-13)**; optional future **Song Mode** `*Slice.ts` (non-quartet grammar) remains **open** if product wants full golden-path parity beyond harmonic-voice attachment.

**2 — Bill Evans (`bill_evans`) — complete**

| Ship | Commit | Scope |
|------|--------|--------|
| Harmony slice + surface | **`3b8306d`** | Variable **3/4/5** phrase grid (**22/56/22**); **dim delayed** / **IV→ivm9** / **minor detour** / **inner voice** slash / **locked-hands** slash; retuned **dom/maj/quartal/sus/delayed/ii–V** rates; **`STYLE_MODERN_JAZZ`** **`applyBillEvansStyleSurface`** (density / cadence softness / space). |

**3 — Frank Zappa (`frank_zappa`) — complete**

| Ship | Commit | Scope |
|------|--------|--------|
| Context modes + arc + additive passes + surface | **`7d0d512`** | **`frankZappaContext`** **`avant_rock` / `big_band` / `futuristic_jazz`**; **`computeZappaDensityArc`** six zones; **`fz:lyd_dominant`**, **`fz:bitonal_triad`**, **`fz:motif_recycle_*`**, **`fz:hard_cut_trigger`** + **d5** cut + density tail reset; **`frankZappaSyntheticScaleBias`**; **`applyFrankZappaStyleSurface`** (primary **frank_zappa**); API **`frankZappaContext`**; slash chords preserved on additive passes for locked harmony parity. |

**9 — Antônio Carlos Jobim (`antonio_carlos_jobim`) — complete**

| Ship | Commit | Scope |
|------|--------|--------|
| Bossa harmony + phrase grid + anticipation + surface | **`1c3c21a`** | **`computeJobimPhrasePositions`** **4/8/2** (**65/20/15**); **Lydian dominant** **`aj:lyd_dom`**; **bVI m6** cadential colour **`aj:bvi_m6`**; **bossa anticipation** **`jobimBossaAnticipationBars`** + **`aj:bossa_anticipation`**; **`jobimMode`** + **`applyJobimStyleSurface`** under **`STYLE_MODERN_JAZZ`** (Bill Evans surface skipped when Jobim primary). |
| **`VoiceRuleBundle` `jobim` (VRB)** | **2026-05-13** | **`jobimVrbFingerprints.ts`** — **45** **`JB_*`** receipts (bossa harmony / VL / melody / rhythm / texture / form / work presets / differentiators); **`voiceRuleBundles.ts`** **`JOBIM`**; **`attachVoiceRuleBundle`** auto-resolve when primary **`antonio_carlos_jobim`**; new policy enums **`melodic-counterline`**, **`stepwise-arc`**, **`aaba-or-through-composed-song`** + flags **`bossaNovaFeel`**, **`lydianColourEnabled`**. |

**8 — Thelonious Monk (`thelonious_monk`) — complete**

| Ship | Commit | Scope |
|------|--------|--------|
| Asymmetric phrase grid + harmony passes + surface + bass gate | **`2ed5aa0`** | **`computeMonkPhrasePositions`** **4/5/7/9/6** (**58/14/14/11/3**); **`tm:asym_phrase@bar{N}`**; **whole-tone** dominant fragments **`tm:whole_tone@bar{N}`** (V / bII / II-of-V); **chromatic enclosure** slash hints **`tm:chrom_enclosure@bar{N}`**; **deliberate silence** **`monkSilenceBars`** / **`monkPartialRestBars`** + **`tm:deliberate_silence@bar{N}`**; **`applyMonkStyleSurface`** (density −0.12, sync +0.30, space +0.35, cadence softness +0.10) after **`applyFrankZappaStyleSurface`**; **BH** bass leap budget **18 st** for angular slash harmony (parity with Wayne Shorter gate). |

**10 — Duke Ellington (`duke_ellington`) — complete (2026-05-07)**

| Ship | Commit | Scope |
|------|--------|--------|
| Full Song Mode harmony slice + surface + authority chain | **`21b06fb`** | **`computeEllingtonPhrasePositions`** **4/8/2/6** (**60/22/13/5**); stage‑1 **tonic / dominant / minor** enrichments; **d1–d5** **`de:*`** (**jungle growl**, **chromatic diminished**, **call/response** map + receipts, **parallel planing**, **shout chorus** + **`ellingtonShoutBars`**); **`ellingtonCallResponseMap`**; **`applyDukeEllingtonStyleSurface`** after **`applyMonkStyleSurface`** (density +0.15, sync +0.22, space −0.10, cadence softness +0.08); **`dukeEllingtonEffectiveHarmonyBars`** wired through **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked truth, **`composerOsAppGeneration`**; handbook **[COMPOSER_OS_PLAYBOOK.md](COMPOSER_OS_PLAYBOOK.md)** § Duke Ellington. |

**11 — Maria Schneider (`maria_schneider`) — complete (2026-05-05)**

| Ship | Commit | Scope |
|------|--------|--------|
| Full Song Mode harmony slice + surface + authority chain | **`3b68085`** | **`computeSchneiderPhrasePositions`** **4/6/8/5/7/9** (**28/22/22/14/9/5**); stage‑1 **tonic / dominant / minor** enrichments; **d1–d5** **`ms:*`** (**Lydian modal center**, **pedal ostinato** + **`schneiderPedalBars`**, **nature arc** intro/outro, **color stack** + **`schneiderColorStackBars`**, **non-functional planing**); **`applyMariaSchneiderStyleSurface`** after **`applyDukeEllingtonStyleSurface`** (density +0.05, sync −0.20, space +0.25, cadence softness +0.28); **`mariaSchneiderEffectiveHarmonyBars`** wired through **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked truth, **`composerOsAppGeneration`**; **`MELODY_PROFILES`** row + handbook **[COMPOSER_OS_PLAYBOOK.md](COMPOSER_OS_PLAYBOOK.md)** § Maria Schneider. |

**12 — Miles Davis (`miles_davis`) — complete (2026-05-05)**

| Ship | Commit | Scope |
|------|--------|--------|
| Three contexts + slice + surface + authority chain | **`263b4e9`** | **`milesDavisContext`** **`modal_1959`** / **`quintet_1965`** / **`electric_1970`** (default modal); **`computeMilesDavisPhrasePositions`** period-specific grids; stage‑1 **tonic / dominant / minor** enrichments; **d1–d5** **`md:*`** (**modal center**, **time no changes**, **groove vamp**, **cool phrasing**, **harmon mute colour**); **`milesDavisEffectiveHarmonyBars`** + metadata maps (**`milesDavisModalCenterBars`**, **`milesDavisTimeNoChangesBars`**, **`milesDavisVampBars`**); **`applyMilesDavisStyleSurface`** per context; **`SONGWRITER_CHORD_POOLS`** keys **`miles_davis_modal_1959`**, **`miles_davis_quintet_1965`**, **`miles_davis_electric_1970`** via **`chordSymbolsForSection`**; **`MELODY_PROFILES`** row; handbook **[COMPOSER_OS_PLAYBOOK.md](COMPOSER_OS_PLAYBOOK.md)** § Miles Davis. |

**13 — Fripp / King Crimson (`fripp_king_crimson`) — complete (2026-05-10)**

| Ship | Commit | Scope |
|------|--------|--------|
| Asymmetric rhythm + third-cycle harmony + polymeter receipt | — | **`precomputeFrippKingCrimsonEffectiveHarmonyBars`**; **`asymmetricPresets`** **`discipline_a`** / **`discipline_b`** / **`frame_by_frame`** / **`fracture`** / **`red`**; **`frippPolymeterGrid`** LCM on **16th** grid; **`GenerateRequest.asymmetricRhythm`** + **`frippPolymeterSecondaryPresetId`**; **`frippKingCrimsonMelodyHints`** / diagnostics; routing through **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked truth, **`harmonySpineProvider`**; **`SONGWRITER_CHORD_POOLS.fripp_king_crimson`** → **`frank_zappa`** pool alias; smoke **`frippKingCrimsonSliceSmoke.test.ts`**. |

**14 — Olivier Messiaen (`messiaen`) — complete (2026-05-11)**

| Ship | Commit | Scope |
|------|--------|--------|
| Full Song Mode slice + pools + VRB + locked rail | **`a4ae08de`** | **`SONGWRITER_CHORD_POOLS`** **`messiaen_mode2`** / **`messiaen_mode3`** / **`messiaen_birdsong`** (**`seed % 3`**); **`precomputeMessiaenEffectiveHarmonyBars`** → **`messiaenEffectiveHarmonyBars`** (**`om:*`** receipts); spine **≥2** bars/chord; cadential rewrite (**no** bare **V→I**); transcendence tail; **`messiaenPeriodMode`** on **`CompositionContext`** / **`GenerateRequest`**; **`VoiceRuleBundle`** **`messiaen`** (**12** **`fingerprintReceipts`**); handbook/playbook **[COMPOSER_HANDBOOK.md](COMPOSER_HANDBOOK.md)** VRB row · **[COMPOSER_OS_PLAYBOOK.md](COMPOSER_OS_PLAYBOOK.md)** melody profile row. |

**4 — ECM Chamber (`ecm_chamber`) — complete**

| Ship | Commit | Scope |
|------|--------|--------|
| Harmonic slice | **`85d6454`** | **`ecm_chamber`** golden-path slice: **Lydian** primary colour, **m11no3**-family surfaces, **m7b5** destinations, **asymmetric phrase grid**, **wide leap peaks** (melodic identity lane). |
| Surface + UI | **`78aea01`** | **Seven-parameter** ECM surface layer wired end-to-end (**density**, **syncopation**, **space**, **phrase-start looseness**, **bass independence**, **cadence softness**, plus **`ecmChamberMode`** preset); **`STYLE_ECM`** / **`STYLE_ECM_CHAMBER`** consumption in **C1** / **C7** / harmony policy; **Angel Song** / **Balanced ECM Duo** / **Metheny·Scofield** presets; **Chamber ↔ Flow** slider → discrete mode; **Advanced** Style Engine group promotion for ECM profiles. |
| Handbook | **`7b44913`** | **[COMPOSER_OS_PLAYBOOK.md](COMPOSER_OS_PLAYBOOK.md)** — ECM **Style** vs **`ecm_chamber`** songwriter distinction, presets, six example applications, Chamber↔Flow mapping, GCE baseline note. |

**Full slice bar:** deliver **harmonic devices (d1–d5)**, **voice leading**, **phrase contour logic**, **formal behaviour**, **arrangement defaults** — output must read **audibly** distinct from generic baseline on **at least 3 of 5** dimensions.

### New Territories To Add / Deepen

**Priority list** — compositional vocabulary targets only; **no** production, mixing, or timbre assumptions. Several older “missing” rows now have slice files or UI/library support; keep this list for genuinely open territory or material depth.

**UPDATE (2026-05-14 — V56 handoff):** **New composer VoiceRuleBundle territories — COMPLETE (5/5).** Shipped **`part`** (Pärt tintinnabuli, **`AP_*`**), **`satie`** (**`ES_*`**), **`ornette_coleman`** (**`OC_*`** harmolodics), **`gershwin`** (**`GG_*`**), **`cole_porter`** (**`CP_*`**) with fingerprint modules, `BY_ID` aliases, registry `*.vrb_bundle` rows, style-profile aliases, and `attachVoiceRuleBundle` auto-resolve for **`arvo_part`**, **`satie`**, **`ornette_coleman`**, **`gershwin`**, **`cole_porter`**. **SQ rhythm engines — 6/7 COMPLETE** in UI/API (`reich_phasing_grid`, `viennese_waltz`, `jewish_klezmer` + prior three); **`sq_swing` deferred** (not abandoned). Smoke **248/0** (**63** suites). **Post-V56 “next”** — resume **§ What to do next — importance order (2026-05-14)** items **1–2** (smoke + duo depth); composer lane **#6** re-opens for **Ligeti Song Mode slice** (SQ VRB already ships) and **slice-level depth** beyond VRB receipts where product wants it.

1. **Ligeti (Song Mode slice)** — micropolyphony / cluster grammar as **primary writer slice** (distinct from shipped **SQ VRB `ligeti`** **`LG_*`** bundle). **← primary open composer territory after VRB drop.**
2. **Ornette Coleman depth** — **VRB shipped (`ornette_coleman`, `OC_*`)**; optional future: harmolodic **golden-path slice** extensions / eval harness beyond current **slice + VRB** wiring.
3. **Bartók** — slice + SQ VRB shipped; schedule only for deeper receipts, eval harness, UI, or handbook parity. **Cole Porter / Arvo Pärt / Satie / Gershwin** — **Song Mode slices + matching VRBs shipped**; future work = eval / playbook / export-truth parity only if product requests.

**Platform:** **Mobile deployment** is a **separate platform milestone** (packaging, stores, UX), **not** a ranked feature line item next to Song Mode / engine tickets.

**Research parking:** A **full Afro-Cuban rhythmic engine** stays **parked under research** until the **thin clave overlay** slice proves value — do **not** schedule “full engine” as a single backlog row ahead of that proof.

**Earlier sequencing:** **`repeatMarkers` → MusicXML export truth** (**DONE** Session 1, 2026-05-03). **MusicXML `<transpose>`** for fixed-offset tunings (**Drop D** / **Eb standard**) is **COMPLETE** (2026-05-04). Detail: **§ Next best development** below.

**Convention:** Whenever the user asks for a “roadmap,” use the title **`Composer OS Roadmap [YYYY-MM-DD]`** (snapshot date, typically today) and align content with this file or replace sections intentionally.

### Session 1 — repeatMarkers → export truth (**DONE**, 2026-05-03)

- **`ScoreModel.repeatMarkers`** (`ScoreRepeatMarker`: `repeat_start` | `repeat_end`, 1-based bar) — optional; **`musicxmlExporter`** emits **`heavy-light` / `light-heavy`** barlines + **`repeat`** forward/backward when present.
- **Stress:** **`realBookStressTest.test.ts`** — 8-bar section ×2 via **`applyRepeatTruthToScoreModel`**, export asserts **`direction="backward"`**.

---

## Known issues — engine (2026-04-29)

- **`wayne_shorter` style-transfer export — FIXED (2026-06-10):** **0-byte MusicXML** resolved — single authoritative Wayne precompute on style-transfer (`styleTransferWayneHarmonyAuthoritative`; no second `precomputeWayneShorterEffectiveHarmonyBars` drift). Extended symbols export schema-clean. **Follow-up (separate):** duo **phrase gate** on 8-bar import may leave **`gp.success=false`** while export/pipeline-truth pass; **V83 three-way reharm auto-test** still uses **radiohead** in the contrast trio until roster refresh.
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

## Current (as of 2026-07-01 snapshot)

- **Riff pitch PR A — `intervalWeights` live on pick path (2026-07-18):** Field builders populate `preferredIntervals` from profile weights; `pitchFromField` multiplies by directed IC before pick; snap reduced when intervals active. PR B (`enforceHook` gate) + PR C (leap-peak motif-blend skip) shipped. See `docs/CHANGELOG.md` [Unreleased] + `docs/RIFF_GENERATOR_TECHNICAL_SUMMARY.md`.

- **Duo vault Stage 4b.4 — SHIPPED:** Role-contrast fix on **`guitar_bass_duo`** baseline confidence seeds — bass macro B-half routing (bars **5–7**, **`forceGuitarEcho`**) + post-orchestration duplicate-pitch nudge on guitar bars **1–8** (**`generateGoldenPathDuoScore.ts`**, **`bassMelodicLines.ts`**). Seed **50213** proof: **`roleContrast` 0.1174**, gp success, interval test PASS, **`KNOWN_VAULT_LIFT_BREAKS`** empty, **`KNOWN_ROLE_CONTRAST_GP_DEBT`** cleared. Seed **50021** unchanged clean (**`roleContrast` 0.1125**). Detail: **[DUO_VAULT_ROADMAP.md](DUO_VAULT_ROADMAP.md)** § **4b.4**.

- **Duo vault Stage 4b.3 — SHIPPED:** Type-1 vault-lift fix on **`guitar_bass_duo`** baseline motif path — receipt skip + declined-note register-only lift (**`duoOrchestrationPass.ts`**, **`duoVaultMotifContourSnap.ts`**). Seed **50021** proof: **`KNOWN_VAULT_LIFT_BREAKS` empty**, interval test PASS, **`roleContrast` 0.0929**.

- **Leadsheet-input V96 — variation controls — SHIPPED (2026-06-16, `2d0e9d40`):** **`LeadSheetInputDesktopPanel`** — **Another version** (hidden seed reroll) · **Rhythmic activity** slider → `rhythmAntiLoopIntensity` gentle/moderate + micro-timing scale · **Guitar comp** slider → `guitarCompDensity` on guitar chording pass. Export `{stem}_{composerId}_v{runId}_quintet.musicxml`. Handoff: **[HANDOVER_2026-06-16.md](HANDOVER_2026-06-16.md)**. **Next:** **3-up variation gallery**.

- **Premium-melody golden oracles (smoke-listed):** **`bhGoldenMaster`** (88109) · **`wayneGoldenMaster`** (90217) · **`beGoldenMaster`** (90301, FROZEN 2c) · **`jhGoldenMaster`** (90303, FROZEN 2c) · **`bartokClePitchScoringGoldenMaster`** (61234). Registry frozen tier: **BH** · **Wayne** · **Evans** · **Hendrix** (Musician **Reference** optgroup).
- **Musician shell:** Default desktop window — composer dropdown from **`premium-melody-composer-registry.json`**, seed, **32-bar Song Mode** generate; frozen composers under **Reference**. See [COMPOSER_HANDBOOK.md](COMPOSER_HANDBOOK.md) § Musician shell.
- **Leadsheet-input engine — Phases 1–7 + GCE/LOCK proof + full-chart import (2026-06-15):** MusicXML leadsheet file → **`MosaicImportTimeline`** → composer-parameterized harmony (**`debussy`**, **`kenny_wheeler`**, **`bartok`** on Orbit compare) → **guitar + string quartet** quintet → melody hand-off (**N** bars) → **Phase 7 string realization** → MusicXML export. Parallel **`core/import/`** path; **does not** use **`generateGoldenPathDuoScore`**. **GUI:** **`LeadSheetInputDesktopPanel`** when **`COMPOSER_OS_FULL_UI=1`**. **CLI:** **`runDebussyLeadSheetInputProofCli.ts`** · **`runLeadSheetOrbitGceLockProofCli.ts`** (GCE/LOCK eval, no UI). **Gates:** **`debussyLeadSheetInputProof.test.ts`**, **`leadSheetInputPhase5ComposerProof.test.ts`**, **`leadSheetPhase7StringRealizationProof.test.ts`**. **Shipped:** **>8-bar / full-chart support** — processes full input up to **64-bar cap**; **8-bar** regression-safe (Orbit **8/8**); Metaphysics **40/40** for three composers; Phase 7 **17/17 PASS** (**`4b5a791a`**). **Limits (honest):** **64-bar cap** · **MusicXML-only** (MIDI / **`.mxl`** not on this path) · **viola silent** · GCE/LOCK CLI/tests only · composer profiles differ mainly in **harmony** (rhythm/texture largely shared). **Caveat:** sparse-chord leadsheets (~10 symbols / 40 bars) may leave long unlabeled stretches — later bars inherit/default. **Still open:** silent viola · **rhythmAntiLoop** / grid-perfect writing · composer behavioural depth beyond harmony. Docs: [COMPOSER_HANDBOOK.md](COMPOSER_HANDBOOK.md) · [USER_GUIDE.md](USER_GUIDE.md) · [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md).
- **AuditionDock Phase 1 — SHIPPED (2026-06-15):** **`AuditionDock`** on **Composers** tab + shared **`auditionFromGenerateResult`** with **Generate** playback; **`no_notes`** gate; dock demos = **seeded Song Mode generate** only (**not** lead-sheet input). **`debussy`** / **`messiaen`** / **`steve_reich`** audition on **Song Mode duo** (not SQ native ensemble). Docs: [USER_GUIDE.md](USER_GUIDE.md), [COMPOSER_HANDBOOK.md](COMPOSER_HANDBOOK.md). **Future:** lead-sheet / import audition; per-composer native ensemble routing where product warrants.
- **Harness (project status):** **`npm run test:composer-smoke`** — **767** PASS / **140** suites (full tier; 2026-07-15). Known fail **5** (tracked) · unexpected fail **0**. Sync **`CLAUDE.md`** when **`runSmokeTests.ts`** changes. Historical snapshots (248/63, 666/117, 674/121, 678/122, 688/124, 725/132, 727/132, 737/134, 747/136, 757/138) superseded.
- **V83d Phase 1 — BH duo comp rhythm — COMPLETE (2026-06-10):** Passing dims + inner-voice off-beat stagger on **`guitar_bass_duo`**; melody preserved; **`runV83dPhase1AutoValidation.ts`**; V81 **8/8**. **Next:** **V83d Phase 2** — melody rhythm enrichment.
- **V81 — Generate UI for V80 engines — COMPLETE (2026-06-08):** Mosaic Import panel · import → generate wiring · variation picker · style-transfer controls · output filename + library folder · section planner visual timeline + suggest-from-import · receipt export-integrity badge fix + mixed-preset badge + Download XML. Jest **631**/0; smoke **657**/0 unexpected (full tier). Tag **`v2.6.0`**.
- **V80 — Mixed-preset assembly + import — COMPLETE (2026-06-07):** **Track 1** BB + SQ Mosaic dispatch + E2E smoke · **Track 2** MusicXML/MIDI import IR + variation (IMP-4) + style-transfer (IMP-5) · **Track 3** mixed-preset MusicXML merge + export integrity (INS-3–5). Jest **580**/0; smoke **652**/0 unexpected (full tier). Tag **`v2.5.0`**.
- **V79 — Song Mode ↔ Mosaic integration — COMPLETE (2026-06-07):** Explicit opt-in mosaic dispatch from Song Mode; per-section composer routing; Generate UI section planner; pipeline-truth LOCK on harmony spine; hook-first bypass lift behind **`allowMosaicPostFinalizeInject`** (default off). Jest **535**/0; smoke **652**/0 (full tier). Tag **`v2.4.0`**.
- **V78 — LFV + ensemble mosaic format + Song Mode mapper — COMPLETE (`v2.3.0`):** Martino LFV integrity; BB/SQ **`mosaicOutputFormat`** ScoreModel wiring; **`mapSongModeToMosaicSectionPlan`** at golden-path handoff.
- **Post-v2.6.0 backlog (V82 — deferred):**
  - **Interactive confidence heatmap** — click-to-override on import preview
  - **Variation contour SVG previews**
  - **Pre-generate candidate preview** — needs preview API
  - **Section planner drag-to-resize** on visual timeline
  - **Style-transfer dry-run preview**
  - **`IR.sectionStarts`** — rehearsal-mark parsing for true section auto-fill (not on `MosaicImportTimeline` today)
  - **Jack White slice fix** — **2** allowlisted smoke rows; **5** total known-fail rows (Brookmeyer, sonic_youth, V65 P2 Slonimsky, 2× Jack White)
  - **App.tsx "Composer Engines" tab consolidation**
  - **`HomeGenerate.tsx` ~500KB Babel deopt** — file split
  - **`desktop:dev` full Electron prod path `.md` loader**
  - *(carry-forward)* duo depth · multi-chorus quality · MusicXML import phase 3+ · Wyble parity · ECM GCE orchestration
- **Zappa Solo MusicContext producer (2026-05-30) — V106p2 shipped:** `buildMusicContextFromZappaSolo()` — melodic dramatist over supplied harmony; solo arc claim/agitation/fracture/crooked_landing; Population participation primary/secondary/tertiary; receipt `zappa_solo_realisation_complete`; always-on. Jest node **478**/0 (**60** suites).
- **Population Composer hybrid MusicContext (2026-05-30) — V106p1 shipped:** `buildMusicContextFromPopulation()` — ecology selection across tritonic · monk · wayne_shorter · vault · big_band; dramatic arc phases (`build` · `suspend` · `fracture` · `cadence` · `restart`); receipt `population_composer_realisation_complete`; always-on. Jest node **469**/0 (**59** suites).
- **String Quartet SQ rhythm engines (2026-05-14) — 6 / 7 shipped:** Native **`sqRhythmEngineId`** engines on **`GenerationMetadata`** (receipts + Style Panel wiring): **`bartok_bulgarian_aksak`** (`BG_RHYTHM_*`) · **`free_proportional`** (`FP_RHYTHM_*`) · **`baroque_dance`** (`BD_RHYTHM_*`) · **`reich_phasing_grid`** (`RP_RHYTHM_*`) · **`viennese_waltz`** (`VW_RHYTHM_*`) · **`jewish_klezmer`** (`KL_RHYTHM_*`). Style context prefixes: **`bg`**, **`fp`**, **`bd`**, **`rp`**, **`vw`**, **`kl`**. Cross-preset rhythm engines (Fela Kuti, Greek Rebetiko, Brazilian, Second Line, Cuban / Afro-Cuban) unchanged. **Remaining (deferred, not abandoned):** **Swing adapted for SQ** (`sq_swing`) — Perplexity research + execution prompt queued for a future sprint (Turtle Island–aligned grammar).
- **V30 — COMPLETE (2026-05-05):** **Odd meter UI parity** · **MusicXML import Phase 1** · **Duo expansion** (pairing cards, duo intent selector, Duo Health readout, ECM safe sweep badge + Advanced checkbox) — detail under **§ Next best development — V30 complete · V31 sequencing**.
- **Harness (project status):** **`test:smoke`** + **`test:fast`** are the primary CI/dev gates. **`npm run test:composer-smoke`** prints **`Passed: N`** — aggregate of every **`PASS:`** row in **`runSmokeTests.ts`**. **Snapshot (2026-07-15):** **767** PASS (**140** suites); known fail **5**; unexpected fail **0** (Weber HV Phase 2 widen final). Re-run after local changes and refresh this line + **`CLAUDE.md`**. Historical debt in **`docs/TEST_DEBT_COMPOSER_OS_V2.md`**.
- **Multi-arranger VRB blend — String Quartet preset (2026-05-15) — COMPLETE:** Weighted **two-arranger** **`VoiceRuleBundle`** blend (**`vrbBlend.ts`** / **`blendVoiceRuleBundles`**), **`sqArrangerVrb`** on generate when valid; **Generate** UI dual dropdowns + linked weights + incompatibility gate + preview card; **`StyleProfile.arrangerBlend`**; SQ arranger list **15** VRB ids (includes **Pärt**, **Satie**, **Gershwin**, **Porter**, **Ornette Coleman**). Roadmap **§ Item 4.5** marked **COMPLETE**; **SQ arranger surface parity** (new-territory composers on the SQ arranger rows) **COMPLETE**. Smoke **248**/0 (**63** suites).
- **Windows desktop packaging (2026-05-14):** If **`electron-builder`** cannot delete **`release/win-unpacked/resources/app.asar`** (“in use by another process”), **`MsMpEng`** / **`SearchProtocolHost`** / **Explorer** / a **stale Electron** instance may hold a read lock on the prior unpack — rebuild with a **fresh output directory**, e.g. **`npx electron-builder --win --config.directories.output=release-jobim`** from **`apps/composer-os-desktop`**, then ship **`Composer-OS.exe`** from that folder. **Canonical workaround + root-cause detail:** **§ What to do next — #10** and **§ Item 10 — Desktop rebuild (EPERM)**.
- **What to schedule first:** see **§ What to do next — importance order (2026-05-14)** below (replaces stale **Priority stack** ordering for assistants).
- **Tonality Vault — iReal / paste / PDF multi-chorus variation (2026-05-05) — SHIPPED:** **`VaultGenerationOptions.chorusCount`** (default **1**, max **64**) runs **`generateVaultFromParsedChart`** once per chorus and concatenates output with continuous **`barIndex`** / global **`startBeat`**; return **`bars`** = chart length × **`chorusCount`**. **Melody** mode: per-chorus **`tensionCycleRotation`** steps the **Build F** **`transformMotifThroughLayers`** pick through **primary → tension → chaos → recover → resolve** (length **5**), unless **`songwriterStyleId === 'sonic_youth'`** (no per-chorus tension advance). **Solo** mode: no motif pass; when **`riffStyle`** is omitted or **`triad-pair-pendulum`**, **`TRIAD_PAIR_CHORUS_ROTATION`** varies effective vault **`generateVaultRiff`** **style** per chorus (also suppressed for **SY**). See **`engines/composer-os-v2/core/irealpro/irealVaultPipeline.ts`**, playbook **Multi-Chorus Variation**.
- **Generate — Chord Inspector — Reharm UI (2026-05-04) — SHIPPED:** **`HomeGenerate.tsx`** collapsible **Chord Inspector** — **Reharmonise** runs **`generateReharmCandidates`**; **drift proximity** slider (**0.0–1.0**, step **0.1**, default **0.5**) remaps to a target emotional drift and **reorders** substitutes; **top 8** list with substitute symbol, dominant drift label, **Use this chord** (fills inspector input); reharm panel **clears on new Inspect Chord**. See **`reharmCandidateEngine.ts`**, **`CHANGELOG.md`**, **`CLAUDE.md`**.
- **Generate — Reharm Panel post-gen thin v1 (2026-07-03) — COMPLETE:** **`ReharmPanel`** extended (not a third surface) — drift slider · numeric bar range + playback prefill · post-gen **`buildReharmPostGenPreviewContext`** + slice precompute · generic **`melodyPcs`** from last generate MusicXML · staged **`AlternativeProgression`** + harmony-table preview · **Apply** → **`onApplyBars`** + full **`generate()`**; paste path + Chord Inspector unchanged. Tests: **`apps/composer-os-app/tests/reharm*.test.ts`** (**15** vitest rows) + smoke **`reharmPostGenUiThinV1.test.ts`** (**3** rows). Eval harness: **`engines/composer-os-v2/scripts/runReharmPostGenUiGce.ts`** → **`output/reharm-post-gen-ui/gce-report.json`** (**8.4/10** seed **50021**). **Known separate issue (not a Reharm UI blocker):** formal **`finalBarTension`** hard gate still fails on this seed when bar **32** is dominant **`A7alt`** — same root cause as **`reharm-exp3`** GCE (**`output/reharm-exp3/gce-report.json`**, all variants **`hardGatesAllPass: false`**); pre-existing bar-32 / dominant-ending scoring, not introduced by the UI staging path.
- **Evaluation system (2026-05-05) — SHIPPED:** Combined **GCE + LOCK + style profiles** evaluation path; **Basie**, **Ellington**, **Schneider**, **Quincy Jones** arranger **`StyleProfile`** scoring; **`createCombinedEvaluator`** invoked after Big Band realisation in **`composerOsAppGeneration.ts`** (observational **`evaluationResult`**, non-blocking). Playbook **Evaluation System** + **Future Workstreams** (Afro-Cuban, Odd-Meter).

### Next priorities — V30 (2026-05-04) — *ordering superseded*

For **current** ordered backlog use **§ What to do next — importance order (2026-05-14)**. Items remain valid work themes:

1. **Multi-chorus quality** — refine Vault / **`chorusCount`** variation and phrase behaviour beyond ship baseline.
1.5. **Multi-arranger VRB blend (SQ)** — **COMPLETE (2026-05-15)** — **`vrbBlend.ts`** + **`sqArrangerVrb`** + **Generate** dual-arranger UI + **`StyleProfile.arrangerBlend`**; see **§ Item 4.5** (status **COMPLETE**).
2. **MusicXML import** — deepen lead-sheet import + Song Mode / realization handoff (see **T2.4** / **What to do next** § **5**).
3. **Duo expansion** — guitar–bass duo golden-path breadth, registers, and pairing surfaces.

**Backlog (not V30 gate):** Wire queued arrangers (Thad Jones, Gil Evans, Brookmeyer, Fischer, Nelson, Nestico); Light Touch styles; MIDI import; unmeasured cadenza; Nutritional Information melody V2.

**V29 complete:** choruses UI, desktop **`@napi-rs/canvas`** bundling, Chord Inspector reharm, Vault multi-chorus + evaluation wiring, PDF import path, **`cleanVisionTitle`** on Vision OCR titles (**`pdfChordReader.ts`**).
- **MusicXML `<transpose>` — fixed-offset guitar tunings (2026-05-04):** **COMPLETE** — **`engines/composer-os-v2/core/export/musicxmlExporter.ts`** emits **`<transpose><chromatic>N</chromatic></transpose>`** only in **measure 1** **`<attributes>`** (Sibelius-safe position; not under **`<score-instrument>`**). **`drop_d`** → **−2** semitones, **`eb_standard`** → **−1**; all other alternate/scordatura tunings stay **text label only** (**`exportMeasure1TuningWordsByPartId`**). **`ScoreModel.exportPartTransposeSemitones`** populated from **`buildExportPartTransposeSemitonesFromResolvedAlternateTuning`** (**`alternateGuitarTunings.ts`**) in **`generateGoldenPathDuoScore.ts`**. Smoke **`alternateGuitarTunings.test.ts`** asserts XML for Drop D, Eb standard, and no transpose for DADGAD.
- **Ensembles — Frank Zappa Big Band + mixed meters (2026-05-03):** **COMPLETE** — **`frank_zappa`** + Big Band smoke **`zappaBigBandSmoke.test.ts`**; **`ScoreModel.barMeterMap`** carried into **`runEnsembleExportPipeline`** for MusicXML meter truth on **7/8 + 4/4** (and other maps). Product doc: **[ZAPPA_CREATION_GUIDE.md](ZAPPA_CREATION_GUIDE.md)** §6; engineering note under **Past → Big Band**.
- **Song Mode + vocal path** is in good product shape for tempo and bridge execution.
- **Song Mode section diagnostics** — stable **`songModeSectionShapingDiagnostics`** on manifests / API for eval-friendly reads; receipt lines stack with existing songwriter/style bullets.
- **Test-debt triage (begun 2026-04-17):** **`docs/TEST_DEBT_COMPOSER_OS_V2.md`** + **`scripts/test-baseline-composer-os-v2.ps1`** document a **must-stay-green** set (`test:jest:counterpoint`, `test:duo`, `test:bass`, `test:vocal`, `test:composer-os-regression`) vs occasional **`test:full`** suite-level failures (environment / heavy gates). **Runner stability** item (**chunked harness + 4096 MB heap on each chunk**) is **complete** (2026-04-28).
- **`npm test` / `test:full`** — if **`FAIL:`** lines appear, treat as **known per-suite debt** or environment until triaged; **`test:fast`** remains the broader gate for day-to-day iteration.
- **Generate UI discoverability (2026-05-12 / 2026-05-14):** Songwriter **`optgroup`**s (**Shipped / Ready to build / In library**), Arranger **`optgroup`**s (**Big band core / Charts & studio**; **String Quartet** adds **None** + **String Quartet VRB** + jazz groups below), Song Mode **Arranger + Era** helper line (style pairing / soft hints only). **`CLAUDE.md`** smoke blurb aligned with **`runSmokeTests.ts`** aggregate PASS count (**248** / **63** suites). **Shipped (full slice)** covers the golden-path slice roster including **`john_coltrane`**, **`sonic_youth`**, **`verlaine`** (`television` alias), **`debussy`**, **`messiaen`**, **`kenny_wheeler`**, and **`bob_brookmeyer`**; **`dave_brubeck`** stays **In library** (registry/profile + odd-meter **`barMeterMap`** UI only — no **`brubeckSlice.ts`**). **Song Mode odd-meter `barMeterMap` (2026-05-02 / 2026-05-04):** optional tiled meter presets for **Dave Brubeck**, **Thelonious Monk**, **Wayne Shorter**, **Donald Fagen**, and **Bill Evans** (plus Frank Zappa’s existing meter-map UI); **All 4/4** omits **`barMeterMap`** — **`COMPOSER_METER_PRESET_MAP`** / **`oddMeterQuantiser.ts`**, **`HomeGenerate.tsx`**.

| Area | State |
|------|--------|
| **Duo / ECM / Song Mode / Riff / Wyble** | Shipping **MusicXML** path; validation + receipts; chord diagnostics (#17) |
| **Phase 18.2D** | **Complete** (bass phrase intelligence + regression sweeps); **18.2E** **Complete** (gates + bass export) |
| **Phase 19** | **Complete** (UI ≤32 bars for duo/song) |
| **Phase 19.1 (BB/SQ long forms)** | **Complete** (2026-04-15) — Big Band and String Quartet **16–64** bars in UI + API; duo/song **deferred** |
| **Song Mode D-phase** | **D1** + C1–C7: **done** per architecture; **D2** (groove / space / expression / surprise → receipt): **done** per [CHANGELOG.md](CHANGELOG.md); **D3** reserved |
| **Songwriters & arrangers (Song Mode)** | **Core:** typed ids, **`songwriterRuleRegistry`**, **`resolveSongwritingStyles`**, **`stylePairingResolver`**, **`buildCompiledSong`** — **done**. Golden-path slice roster is active across smoke-tested writer suites, with **`dave_brubeck`** still registry/profile + optional odd-meter **`barMeterMap`** UI (no **`brubeckSlice.ts`** yet). Recent deepening: **Debussy DB_FP**, **Radiohead RH_* + RH_FP**, **Wayne Shorter WS_* + WS_FP**, **Basie CB_* deep**, **Nestico / Quincy VRB deep**. Substantial non-slice behaviour: **`STYLE_GROOVE_SOUL`**, **`STYLE_SOPHISTICATED_POP`**, ECM-writer hooks, etc. **Next product push:** duo depth, export-truth consolidation, multi-chorus quality, and import phase 3+ (see **§ What to do next**). |
| **Vocal lead sheet (Song Mode)** | **VERIFIED (2026-04-17):** Packaged `release\win-unpacked\Composer OS Desktop.exe` — Song Mode + vocal + BPM 100; main + vocal `.musicxml` at 100 BPM; Sibelius OK. Dev: checkbox / API path, metronome + `<sound tempo>` in Python export, TS bridge narrowing; **`npm run test:vocal`** green. See [CHANGELOG.md](CHANGELOG.md). |
| **Wyble Voice 2** | **Inject** extended to **single-line** duo family. **2026-04-17:** Parity + **realized normalization review (first pass)** — `shouldApplyRealizedVoice2Normalization` centralizes when Phase 18.2B.3 runs; `injectPhaseAGuitarVoice2Probe` uses **`isStandardGuitarBassDuo`**; JSDoc on realized pass. Full unify of realized metrics with standard duo / phrase-first single-line still **deferred** (pick list #2). |
| **Big Band + String Quartet — follow-ups** | **Chord input** + **Song Form** + **bar-length select** (16 / 24 / 32 / 40 / 48 / 64) wired; **piano** export naming (Sibelius-friendly) — see [CHANGELOG.md](CHANGELOG.md) |
| **Python engines** (`engines/wayne-shorter-engine`, `shorter-form-engine`, etc.) | **Not** integrated into Composer OS TS Generate path |
| **#19 / #16 / #17 (chord track)** | **Baseline complete** — unified semantics (#19), robustness baseline + export/receipt behaviour (#16), diagnostics in UI (#17). Aligned across [README.md](../README.md) and [docs/CHANGELOG.md](./CHANGELOG.md). |

### Song Mode — shipped slices vs pools ready to slice (2026-04-29)

- **Shipped slices / smoke-tested writer roster:** **`runSmokeTests.ts`** includes dedicated writer slice suites (see file allowlist). **`npm run test:composer-smoke`** snapshot (2026-07-15): **767** PASS (**140** suites). Premium-melody golden masters (BH / Wayne / Evans / Hendrix) + Bartók CLE golden master are smoke-listed alongside songwriter slice suites.
- **Pools ready to slice:** **None** — chord pools / registry / UI rows that were queued for a dedicated duo golden-path slice are all **shipped** (**2026-04-29**). **Charlie Parker** (`charlie_parker`) **complete** this session — **`charlieParkerSlice.ts`**, **`cp:*`** devices. **Next after this session:** **open** — gap-fill vs roster (bebop lineage extensions, ECM depth, soul/funk, alt-rock, theatre, etc.); see **§ What to do next — importance order (2026-05-14)** and **Future — compositional diversity**.

### Smoke tier — maintenance checklist (when `runSmokeTests.ts` or smoke suites change)

1. **Run** **`npm run test:composer-smoke`** from **repository root**; read **`Passed: N`** in **`=== Smoke summary ===`** (**N** = aggregate of every **`PASS:`** row — not the number of labelled suites).
2. **Update** **`CLAUDE.md`** — Testing comment with **N** and suite count **`smokeSuites.length`** in **`engines/composer-os-v2/tests/runSmokeTests.ts`** (currently **121** suites as of 2026-06-13).
3. **Update** this doc — **Current** harness bullet above (**248** / date) so assistants do not cite a stale total.
4. **Optional:** **[CHANGELOG.md](CHANGELOG.md)** **[Unreleased]** line if the change is user-facing.

### SD3 Drum Guide Export

- **What it does:** Every successful **MusicXML** export also writes a companion **Type-1 MIDI** file (`<basename>_drum_guide.mid`) and a **JSON sidecar** (`<basename>_drum_guide.json`) in the **same folder** as the `.musicxml`. Kick and snare follow **General MIDI** drum map conventions on **channel 10**: **Kick = MIDI 36 (C1), Snare = MIDI 38 (D1)**; timing grid uses **480 PPQ** (pulses per quarter), aligned with MusicXML divisions.
- **Odd-meter aware:** When **`barMeterMap`** is present (Song Mode / Frank Zappa meter UI / composer meter presets), drum-guide bars follow the same per-bar meters — **all 18 composer meter presets** in the engine’s preset map are supported for grouping and tick placement.
- **Superior Drummer 3:** Drag **`_drum_guide.mid`** into **Tap2Find** or the **Song Track** to sketch or align drums to the generated rhythm onsets.
- **Sidecar JSON:** Version **1** payload documents **`ppq`**, **`bpm`**, **`totalBars`**, and a **`bars`** array: each bar lists **meter**, **beat grouping**, and **`kickTicks` / `snareTicks`** (offsets in PPQ from the bar start).
- **Generate UI:** Optional **skip drum guide** checkbox suppresses companion **`_drum_guide.mid` / `.json`** when ticked; default remains **on** (export runs whenever MusicXML is written).

---

## What to do next — importance order (2026-05-14)

Single ordering for **merge safety → thin debt → user-visible quality → chart-in → depth → new territory → horizontals**. Re-sequence when product shifts.

| # | Priority | Why |
|---|----------|-----|
| **1** | **Smoke + fast tier green** | **`npm run test:composer-smoke`** / **`test:composer-fast`** + CI on **`main`** — gate before any large slice/refactor ship. Sync aggregate **`Passed: N`** in **Current** + **`CLAUDE.md`** when **`runSmokeTests.ts`** changes. |
| **2** | **Duo golden-path depth** | Beyond V31 UI (**duo intent** shipped): registers, phrase bias follow-through; **MIDI velocity voice-balance** explicitly **deferred** from V31 — pick up now that no composer lane is in sprint. |
| **3** | **Export-truth consolidation** | **COMPLETE (2026-05-17, `3b8db553`).** **`assertExportTruth`** + **`exportTruthAudit`**; golden-path wiring. Residual drift: smoke / manual LOCK only. |
| **4** | **Multi-chorus quality** | Vault / **`chorusCount`** — phrase behaviour + variation beyond baseline (**Current** Tonality Vault note). |
| **4.5** | **Multi-arranger VRB blend (SQ preset)** | **COMPLETE (2026-05-15).** Engine **`blendVoiceRuleBundles`** + known safe/incompatible pairs; app UI (two arrangers + weights + preview + generate guard); **`sqArrangerVrb`** payload; **`arrangerBlend`** on **`StyleProfile`**. See **§ Item 4.5**. |
| **5** | **Lead-sheet MusicXML import phase 3+** | **COMPLETE (`e1f583b7`).** Writer parity, anchor expansion, **`ParsedChart`** handoff. |
| **5.5** | **Per-section VRB assignment (SQ→BB)** | **IN PROGRESS (2026-05-18).** `VrbWeight` / `SectionVrbContext` / `VrbContextMap` / `dominantVrb()`; per-section Harmonic Voice picker. Recon done — see **`HANDOFF_V58.md`**. |
| **6** | **New composer territories / depth** | **COMPLETE (2026-05-18):** Satie / Porter / Gershwin **SQ VRB slices** + Ligeti **σ=32** in registry; film-stub receipts. Optional: **Ligeti Song Mode slice**, slice-level eval. |
| **7** | **Horizontal / backlog horizontals** | ECM **GCE** orchestration pillar; **Wyble** duo↔realized parity; BB **Light Touch**; **MIDI** import; **Nutritional Information** melody V2; **unmeasured cadenza**; **Generate UI** tooltips / preset wire-through — after **1–6** unless escalated. |
| **9** | **String Quartet VRB Family** | **Status: COMPLETE (2026-05-13) — 12 shipped + UI wiring + SQ arranger redesign; arranger surface + blend extended (2026-05-15).** Full **songwriter** roster: **Bartók · Ravel · Dutilleux · Debussy · Messiaen · Beethoven (Late Quartets) · Turtle Island Quartet · Reich / Glass · Shostakovich · Lachenmann · Ligeti · Crumb (Black Angels)** — all 12 under **String Quartet VRB** songwriter optgroup. **SQ arranger** rows: **15** VRB ids (adds **Pärt · Satie · Gershwin · Cole Porter · Ornette Coleman**) + **multi-arranger weighted blend** + **`sqArrangerVrb`** (see **#4.5**). Two-way preset reset + `stylePairing.arrangerStyle` omitted when SQ + None unchanged. Excluded composers (Haydn, Schubert, Brahms, Xenakis, Richter) remain out of scope. |
| **10** | **Desktop rebuild (Windows / `electron-builder` EPERM)** | **`release/win-unpacked/resources/app.asar`** removal fails (“in use by another process”). **Workaround confirmed:** build to **`%LocalAppData%\Temp\composer-desktop-vXX-out`** via **`--config.directories.output`**, then copy **`Composer-OS.exe`** into **`apps/composer-os-desktop/release/`**. **Root cause:** **`release\win-unpacked`** held by **Explorer**, **AV**, or **old Electron**. **Fix:** close everything holding **`release\`**, then **`npm run dist`** in-repo. See **§ Item 10 — Desktop rebuild (EPERM)** below. |

#### Item 4.5 — Multi-arranger VRB blend (SQ preset)

**Status:** **COMPLETE (2026-05-15).**

**Shipped:**

- **Engine** — **`engines/composer-os-v2/core/composer/vrbBlend.ts`**: **`blendVoiceRuleBundles(primary, secondary, primaryWeight)`**, **`BlendConflictError`**, conflict-resolution table, **`KNOWN_SAFE_SQ_BLEND_PAIRS`** / **`KNOWN_INCOMPATIBLE_SQ_BLEND_PAIRS`**; smoke **`vrbBlend.test.ts`**.
- **API / metadata** — **`GenerateRequest.sqArrangerVrb`**, **`GenerationMetadata`** echo / **`sqArrangerBlendVoiceId`** where applicable; **`composerOsAppGeneration`** + **`composerOsApiCore`** normalization.
- **UI** — **`HomeGenerate.tsx`** (String Quartet only): **two** SQ arranger slots + **linked** weight slider (two weights sum to 100%); **Arranger 2** disabled when Arranger 1 is **None**; duplicate-id + incompatible-pair validation; **blend preview** card (harmonic rhythm min–max bars, contour, bass role); **Generate** / **Try Another** / **Demo** + Reharm apply guarded when invalid; single arranger path matches prior **`stylePairing.arrangerStyle`** behaviour.
- **Style profile** — **`arrangerBlend?: ArrangerBlendEntry[]`** + **`migrateArrangerStyleToArrangerBlend`** (`apps/composer-os-app/src/types/styleProfile.ts`).
- **SQ arranger list** — **15** VRB arrangers on the SQ surface (adds **`arvo_part`**, **`satie`**, **`gershwin`**, **`cole_porter`**, **`ornette_coleman`**) aligned with shipped **`VoiceRuleBundle`** ids.

**Follow-ups (optional / later):** 3-way blend; fuller architecture doc for enum/boolean conflict policy beyond the shipped table; deeper engine consumption of composite VRB beyond payload attach if product extends Phase 4+.

**Preset catalogue:** No new Generate preset id — **`EXPECTED_APP_PRESET_COUNT`** remains **9**.

**Historical note:** Original roadmap **prerequisite** (≥3 full golden-path slices among the five new-territory lanes) was a **gating** plan; **implementation shipped** once VRB + UI + API were ready. Slice/eval depth for those writers remains independently schedulable under **§ Song Mode — shipped slices** / **What to do next — #6**.

#### Item 10 — Desktop rebuild (EPERM)

**Workaround confirmed:** build to **`%LocalAppData%\Temp\composer-desktop-vXX-out`** (any fresh temp path; e.g. **`npx electron-builder --win --config.directories.output=C:/Users/…/AppData/Local/Temp/composer-desktop-v56-out`** from **`apps/composer-os-desktop`**), then copy **`Composer-OS.exe`** to **`release\`**.

**Root cause:** **`release\win-unpacked`** (especially **`app.asar`**) held by **Explorer**, **AV** (e.g. **`MsMpEng`** / **`SearchProtocolHost`**), or **stale Electron / Composer OS**.

**Fix:** close **all** processes holding **`release\`** before running **`npm run dist`** / **`desktop:package-no-bump`** in-repo; if the lock persists, keep using the **temp output dir** workaround.

**Done / archived (do not reschedule as #1–#3):** **Jobim VRB shipped (2026-05-13)** — Antônio Carlos Jobim's existing Song Mode slice (`jobimSlice.ts`, `aj:*` receipts) gained the missing **`VoiceRuleBundle`**: **`jobim`** (45 `JB_*` receipts — chord vocabulary maj7/maj7♯11/min7/dom-altered + Brazilian modal colour Dorian-on-ii/Lydian-on-I/Mixolydian-on-V + long-range key plans by minor-3rd / major-2nd / tritone + guide-tone semitone voice-leading + stepwise-arc melody + 3+3+2 bossa pulse + AABA / through-composed forms + 7 work fingerprints + 4 differentiators); new bass role `melodic-counterline`, contour `stepwise-arc`, arc `aaba-or-through-composed-song`, plus `bossaNovaFeel` + `lydianColourEnabled` flags; aliases jobim / antonio_carlos_jobim / tom_jobim / bossa_nova / garota_de_ipanema / girl_from_ipanema; auto-resolve set extended to 11 ids. Smoke aggregate **248/0** (**63** suites) unchanged. **SQ arranger redesign + Dutilleux UI surfaced (2026-05-13)** — String Quartet preset arranger dropdown now renders **`— None (no arranger) —`** first → **String Quartet VRB** optgroup (10 ids: `beethoven_late` · `bartok` · `ravel` · `dutilleux` · `ligeti` · `reich_glass` · `shostakovich` · `turtle_island` · `crumb_black_angels` · `lachenmann`) → Big band core → Charts & studio voices (jazz arrangers retained but demoted below the SQ family); two-way reset (`nextArrangerOnPresetChange`) auto-switches between `none` and `thad` when crossing the SQ boundary; SQ + `none` → no `stylePairing.arrangerStyle` overlay in the generate payload. Dutilleux songwriter dropdown row added — bundle (`DX_*` 83 receipts) was already shipped; only the UI row + `SongwriterRuleId` extension + style/registry/comp stubs + `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` entry were missing. Smoke aggregate **248/0** (**63** suites) unchanged. **`repeatMarkers` → export truth** (**Session 1**, 2026-05-03); **odd-meter UI** for **Donald Fagen** + **Bill Evans** (V30); **MusicXML `<transpose>`** Drop D / Eb standard; **Phrase Engine V2**; **melodic variation pack** API (**2026-05-10**); **Debussy** full research stack including **DB_FP_01–04** (**2026-05-12**); **VRB deep — Sammy Nestico** (**41** / harness **≥10**) **+ Quincy Jones** (**46** / harness **≥11**) in **`voiceRuleBundles.ts`** + **`voiceRuleBundleHarnessAdditive.test.ts`**; **SQ VRB Crumb / Black Angels shipped (2026-05-13)** — **`crumb_black_angels`** (**`CB_*`** 72 receipts; ritual / symbolic 13-image × 3-part scaffold with global peak at image 7 Threnody II; germinal pc-sets {0,1,2} + {0,1,6} + fateful_triad {D#,A,E}; tonal islands god_music B major + pavana_lachrymae + dies_irae + sarabanda; cluster_chord + quote_chord + resonance_B_major; numerology 7 + 13 governs groupings + repeat_count + phrase_length + speech_event cardinality; quotation events Schubert + Dies irae + Tartini framed by chromatic field; symbolic technique states electric_insects / devil_music / god_music / consort_past / lament_slow; noise phoneme vocabulary; amp_level decoupled from dynamic; sound_type ∈ {pitched, noise, hybrid} with transitions only at image / part boundaries; mirror+echo pairs 3↔9 + 11↔12 + 1↔13; new `noise-or-pedal` bass role + `gesture-symbolic` contour + `ritual-arch` narrative arc; `numerologyEnabled` / `amplificationDecoupled` / `symbolicTechniqueStatesEnabled` / `soundTypeStates` / `mirrorEchoEnabled` flags). **SQ VRB Ligeti extension shipped (2026-05-13)** — **`ligeti`** (**`LG_*`** 70 receipts; SQ1 G4 germinal cell `{0,1,2,3}` + SQ2 micropolyphony / texture-as-harmony with chromatic_dense pc-field, five-movement form, tension-metric curves, silence as structure; new `embedded-voice` bass role + `neighbor-motion` contour + `continuous-sections` / `five-movement` arcs; `ligetiProfile` / `g4GerminalSetEnabled` / `micropolyphonyMode` / `tensionMetricCurvesRequired` / `pcFieldStateGrammarEnabled` / `silenceAsStructureEnabled` / `tempoCurveDirection` / `textureAsHarmonyEnabled` flags). **SQ VRB family — 12 `VoiceRuleBundle`s** (see priority table **#9**); **String Quartet VRB** songwriter `<optgroup>` surfaces **12** ids present in **`SONGWRITER_OPTIONS`**. **`AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID`** = **11** ids (**`radiohead`**, **`debussy`**, **`beethoven_late`**, **`turtle_island`**, **`reich_glass`**, **`shostakovich`**, **`lachenmann`**, **`ligeti`**, **`crumb_black_angels`**, **`dutilleux`**, **`antonio_carlos_jobim`**) — auto-attaches VRB when that primary songwriter is selected. **Receipt stacks (recap):** **Beethoven late** (`BV_*` ≥30) · **Turtle Island** (`TI_*` 88) · **Reich/Glass** (`RG_*` 89) · **Shostakovich** (`SH_*` 96) · **Lachenmann** (`LC_*` 84) · **Bartók / Ravel / Dutilleux / Debussy / Messiaen** (≥30 each).

---

## V66 backlog

### Remaining FZ_* receipt stubs (10 of 15)

- Promote remaining **`FZ_*`** metadata stubs in **`priority3VoiceRuleBundles.ts`** with goldens + smoke rows when stable

### Section editor UI

- Per-section **meter** + **VRB** assignment in Generate UI (engine wiring shipped P1/P6)

### Product surfaces

- **Fretboard view**
- **MusicXML import** depth (beyond Phase 1–2)
- **Sibelius QA** per mode

---

## Future / Research Backlog

## Priority Order (revised 2026-07-15)

**CLOSED this session (2026-07-15/16):** CI smoke **8/8** → **0** unexpected · Score-5 (**30**) + Score-6 BB (**4**) wired · Phase 2 Batches **1–6** + Beefheart + Fela + Threadgill + **Weber** HV widen **COMPLETE** · fBT vs custom_locked bug family fully resolved · jamerson RiffGen Phase E **CLOSED** · **Riff Generator Phase A + B + soft-link FULLY COMPLETE** (chord colour apply + pattern soft-link, smoke **772**/141) · **Mosaic global HV** **CLOSED** · Full smoke **772**/141, known **5**, unexpected **0**.

**HV authority — items 1–2 SHIPPED (doc lag corrected 2026-07-12):**

1. **Shared HV-aware authority abstraction** — **SHIPPED.** Phase 0 infra + Phase 1 seams 1–4 live under `engines/composer-os-v2/core/authority/` (`EffectiveStyleIdentity`, capability registry, adapters). See `docs/HV_AUTHORITY_ABSTRACTION_DESIGN.md`. Commits `1d8bdff5` → `9200267e`.
2. **Zappa + Verlaine HV rollout** — **SHIPPED.** Verlaine end-to-end (seams 1–4); frank_zappa write-path (`76aec931`). Proven template for later waves. See `docs/COMPOSER_OS_80_STYLE_HV_ROLLOUT_DESIGN.md` §0.

**Still open — higher ROI (all independent, pick any):**

3. **Phase 2 widen** — Berg Batch 6 + **Beefheart** + **Fela Kuti** + **Threadgill** + **Weber** HV-only non-mosaic bridges **COMPLETE**. Next: **Mosaic HV** product decision. BB/SQ Phase 2 Batches **1–6** + five widen composers shipped (Slonimsky, VRB/Pass4, FZ continuity, Berg/Beefheart/Fela/Threadgill/Weber HV walls). See `docs/EIGHTY_STYLE_AUDIT_SWEEP_2026-07-08.md`, `docs/EIGHTY_STYLE_STAGE2_FINDINGS.md`.
4. **Mosaic HV** — **COMPLETE (2026-07-16)** — global HV overlay after per-section `getDispatchEntry` base (`precomputeMosaicEffectiveHarmonyBars`). Walls / item E untouched. Per-section HV map rejected.
5. **Riff Generator** — **FULLY COMPLETE (2026-07-16)**. Phase A honesty + Phase B Iter 1–3 HV chord colour (`riffUseHvForPattern` / `colourRiffChordsWithHv`) + soft-link HV→`riffVrbId` (`riffSoftLinkHvAsPattern`). Both axes smoke-validated **772**/141 known **5** unexpected **0**. See `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`.

**Tracked debt (not red, not blocking):** *(none outstanding from 2026-07-15 remaining list — jamerson Phase E closed.)*

**Low ROI — parked:**

6. **Score-4 defer group** — **9** composers, Slonimsky-transport-only.
7. **Tier 3** — **10** composers, score **0–3**, out of HV scope.
8. **Bill Evans motif-recurrence fix** — small separate DCR; MI 5.5 hard-gate weakness; not urgent.
9. **Two-guitar interplay module** — rule-based interaction modes for the GBD writer (see entry below).
10. **Phrase/motif transformation layer** — phrase-length distributions, contour library, cadence-avoidance, motif ops.
11. **Hand-built Verlaine style fingerprint** — transcribe passages, extract weighted rules, post-generation nudge.
12. **(Parked)** Full ML/performance modeling.

**CLOSED (2026-07-15):** Bass-identity rhythm-cell (`bacharach` + `oliver_nelson`) — line-first abstract early-continue skipped shared rhythm break; narrow HV-path diversify in `buildBassPart`.

**CLOSED (2026-07-15):** jamerson RiffGen Phase E — Song Mode profile + line-first P3 colour + cleared `RIFF_PHASE_E_WIP_EXCLUDED`.

**Historical note:** Wave D Tier 1 complete (**13/13**, `philip_glass` final). Score-5 (**30**) + Score-6 BB (`charles_mingus` / `count_basie` / `maria_schneider` / `thad_jones`) wired **2026-07-15**. BB Fix #3A / SQ Fix #3B forwarding + Phase 2 Batches 1–6 shipped **2026-07-14**.

## Priority 1a-continued: harmonicVoice forwarding gaps (2026-07-07)

**Confirmed:** `harmonicVoice` is silently dropped in most generation paths despite the UI sending it. Only `guitar_bass_duo` full generate and `ecm_chamber` full generate currently forward it correctly end-to-end.

**Broken paths (6):**
1. **Song Mode** — full generate + section regeneration
2. **Big Band** — full generate, mosaic dispatch, and section regeneration
3. **String Quartet** — full generate + section regeneration
4. **Riff Generator** — Phase A + B + soft-link **FULLY COMPLETE** (chord colour + pattern soft-link; `riffVrbId` owns pattern unless soft-link ON)
5. **GBD section regeneration** — drops `harmonicVoice` even though full-generate GBD works
6. **ECM section regeneration** — same gap as GBD section regeneration

**Working (2):**
- `guitar_bass_duo` full generate
- `ecm_chamber` full generate

**Fix approach:** this is a fragmented forwarding problem across multiple entry points and option-builder / metadata-builder seams. Some paths may be fixable via shared forwarding seams, but others clearly require path-specific wiring. Relevant seams identified so far include `songModeGoldenPathOptions`, `duoRunGoldenPathOptionsFromGenerateRequest`, `buildStringQuartetGenerationMetadata`, `mosaicContextFromGenerateRequest`, and `parseRiffVrbId`.

**Priority order:**
1. **GBD + ECM section regeneration** — smallest, highest-confidence fix; should match already-working full-generate path semantics
2. **Song Mode** — live user-facing bug, but verify truth-alignment / LOCK safety when forwarding
3. **Big Band + String Quartet** — larger because they use different planning / metadata-builder paths
4. **Riff Generator** — Phase A + B + soft-link **FULLY COMPLETE (2026-07-16)**.

**Related:** `docs/AUDIT_SEAM_EXTRACT_2026-07-07.md` (entry-point forwarding map and seam inventory)

## Known Issue: Composer OS Smoke — 8 pre-existing test failures — **CLOSED (2026-07-14)**
(logged 2026-07-06; priority 1a / Bucket B closed 2026-07-07; Wayne restamp 2026-07-13; JH root-cause + BE restamp 2026-07-14)

**Status (2026-07-14):** **8/8 PASS.** All red CI smoke rows from this backlog closed. Do **not** re-open as red; track non-red debt below only.

**Closed (one line each):**
1. bhGoldenMaster (seed 88109) — stale MusicXML vs engine — regen/`f8c17335` path — **PASS**
2. wayneGoldenMaster (seed 90217) — re-drift after `f346ee30` fBT tonic `maj7#11` — **restamp** bar **8** only (JSON unchanged) — **PASS**
3. jhGoldenMaster (seed 90303) — pitch DIVERGE from stale compiled `premiumMelodyPitchPipeline.js` (runtime loaded `.js`, not `.ts`) — **code fix** (JS synced to TS optional-pitch path; **not** a restamp) — **PASS**
4. VoiceRuleBundle — riff VRB stubs (nile / iommi / hendrix / evh) — registry/stub wiring `67ef7fce` — **PASS**
5. VoiceRuleBundle — Eddie Van Halen riff VRB #15 — registry + stub aliases `67ef7fce` — **PASS**
6. RiffGenerator — Phase E song mode + duo integration (14 VRBs) — expectations/`67ef7fce` — **PASS** (jamerson Phase E wired 2026-07-15; `RIFF_PHASE_E_WIP_EXCLUDED` cleared)
7. Output validation — SQ MIDI pitch ranges (4 tracks) — baseline refresh `67ef7fce` — **PASS**
8. Output validation — Duo golden path MIDI 2 tracks no overlap — baseline refresh `67ef7fce` — **PASS**

**Related (not in original 8; consequence of #3):** `beGoldenMaster` (seed 90301) — expected pitch drift after shared pipeline.js sync — **restamp** — **PASS**

**Tracked debt (not red):** RiffGen Phase E — `jamerson` Song Mode + line-first wiring **CLOSED (2026-07-15)**; `RIFF_PHASE_E_WIP_EXCLUDED` cleared.

**Tracked debt (not red):** Mid-bar HV rewrite vs custom/locked paste (Verlaine question — `docs/HARMONIC_VOICE_FORWARDING_DESIGN.md`). **Final-bar fBT vs duo expected CLOSED (2026-07-15):** `pipelineTruthGates` uses `resolveEffectiveHarmonyTruth`. Fixture mitigation for `gil_evans` / beatles kept (coexist).

**Do not** silence future golden drift via SMOKE_KNOWN_FAIL — fix or restamp with an intentional note.

### HV-aware authority abstraction — SHIPPED (was “generalize harmonic-voice resolution”)

**Status (2026-07-12):** **SHIPPED.** Shared module lives at **`engines/composer-os-v2/core/authority/`** (`resolveEffectiveStyleIdentity`, `harmonicVoiceCapabilityRegistry`, layer adapters). Phase 0 infra (`1d8bdff5`) + Phase 1 seams 1–4 (`65754282` → `9200267e`). Verlaine + frank_zappa closed the template; Waves A/B/C rolled many Tier 1 styles; **Wave D Tier 1 complete** (`philip_glass` final).

**Background (historical):** Fixing Verlaine as a harmonic voice paired with a different primary (e.g. Barry Harris) required patching ~7 call sites on **2026-07-06** because runtime “is style X active?” checks used primary only. That cascade motivated the shared abstraction instead of per-style probes.

**Still open under this workstream:** Mosaic HV product decision; optional lint/CI on raw `songwriterStyleId === 'x'` outside allowlist. (Phase 2 widen non-mosaic bridge **COMPLETE** — Weber final.)

**Related:** `docs/HV_AUTHORITY_ABSTRACTION_DESIGN.md` · `docs/COMPOSER_OS_80_STYLE_HV_ROLLOUT_DESIGN.md` · early Verlaine fixes `8f248347`, `e2cd13ab`, `6575d778`, `54af24c8`, `50e1d2a5` (`docs/VERLAINE_GBD.md`).

### Future: Two-guitar interplay module (move Verlaine/Television closer to authentic band idiom)

**Background:** The Verlaine harmonic-voice module (shipped **2026-07-06**, see **`docs/VERLAINE_GBD.md`**) captures ONE ingredient of Television's sound — suspended/slash-chord harmony that avoids strong cadential resolution. It does not model the interlocking two-guitar interplay that is arguably the more identity-defining element of that band's sound (Verlaine + Richard Lloyd trading, echoing, and diverging lines).

Research consulted (Perplexity, **2026-07-06**) confirms this is realistically achievable with rule-based/deterministic methods — no ML/training data required — consistent with this codebase's existing architecture.

**Recommended approach (design only, not yet implemented), ranked by impact vs effort:**

1. **Two-guitar interplay module (highest leverage)**
   - Generate guitar 1 phrases as today, but annotate each phrase: contour, density, where it ends, motif ID
   - Generate guitar 2 from a small library of interaction transforms instead of independent generation:
     - Echo (repeat motif 1–2 beats later, different register)
     - Contrary/support (move against lead contour, respecting interval-spacing/collision rules)
     - Dovetail (fill rests/gaps left by the other guitar)
     - Unison-to-divergence (start together, split by rule)
   - Enforce simple constraints: no register collision > N beats, no exact parallel duplication except in allowed windows, answer phrase-endings some target % of the time

2. **Phrase/motif transformation layer (high leverage, medium effort)**
   - Phrase length distributions (weighted, e.g. 2/3/4/6-bar spans)
   - Contour type library (plateau→leap→descent, repeated-note launch into angular turn, etc.)
   - Cadence avoidance rules (melodic, not just harmonic — suppress strong closure patterns, prefer hanging/suspended phrase endings)
   - Motif transformation ops: sequence, truncation, interval expansion, rhythmic displacement

3. **Hand-built style fingerprint (medium leverage, lower effort, good starting point)**
   - Transcribe/annotate 5–15 representative Television passages
   - Extract a compact "style sheet": common dyads/intervals, phrase lengths, motif families, interaction-mode frequency, register ranges, density-over-bar-position
   - Encode as weighted rule choices + forbidden moves
   - Add a post-generation style pass that nudges phrases toward the fingerprint

**Not recommended as next step:** full ML/performance modeling (requires training data + separate pipeline; low leverage for MusicXML-only output without a rendering/performance layer).

**Priority:** Future project, not urgent. Best tackled as its own dedicated design/DCR cycle — do **not** bolt onto other Verlaine fixes.

**Related:** **`docs/VERLAINE_GBD.md`** (harmonic voice, shipped **2026-07-06**); this entry (interplay/phrasing, not yet started).

### Band Mode — multi-block arranger (seed → varied long form)

GOAL: input a short seed (e.g. 8 bars) and build longer forms (16/32/48/64) where each block VARIES, not just repeats.

Variation dimensions wanted (all four):

- different composer voice per block (verlaine/marr/fripp already exist)
- different time signature per block (odd-meter quantiser already built)
- harmony develops/reharmonises across blocks
- arrangement thickens (instruments added as piece progresses)

Block relationship: FREE — each block its own progression (not a tiled repeat).

DESIGN DIRECTION (not yet built):

- Reuse the EXISTING section system (intro/build/peak/tail already assign per-section composer voices) rather than tiling custom_locked.
- Each block stays custom_locked internally (chords = bars per block) → no fight with the length lock.
- NEW work needed = a "conductor" layer that takes a LIST of blocks and assembles one piece, handling arrangement thickening across blocks.
- Constraint inherited from engine: total length multiple of 8, range 8–64.

OPEN QUESTIONS before build:

- input format for the block list (per-block: chords, composer, time sig)?
- how does "harmony develops" work if blocks are free — manual per block, or auto-derived from block 1?
- does arrangement thickening need new instrument-add logic or can it reuse band-mode parts?

WARNING (from 8→32 GCE run): the GCE evaluator OVER-CREDITS pure repeats. Thematic recall scored 10.0 on copy-pasted blocks; "no section contrast" hard gate did NOT fire because intro/build/peak/tail count as distinct roles even when musical content is identical each block. So a passing GCE on repeated material is misleading — judge block variation by ear / by content-difference metrics, not the current section-role scorer.

FINDINGS (investigation) — foundation is the MOSAIC path, not intro/build/peak/tail:

- ALREADY EXISTS (mosaic): per-section composer voice (`composerForBar` / `mosaicSectionPlan`), per-section time signature (`mosaicSectionPlan[].timeSignature` → odd-meter quantiser), per-section reharmonisation (`precomputeMosaicEffectiveHarmonyBars` on a harmony slice).
- 3 of 4 variation dimensions are already built in mosaic — composer, meter, reharm. Arrangement-thickening is the 4th, still to confirm.
- GAP 1: no per-block `chordProgressionText` API. Free per-block progressions = stitch all blocks into ONE parent locked array + `mosaicSectionPlan` `startBar`/`endBar` ranges (not a chord string per block).
- GAP 2: the "conductor" — a layer letting the USER specify a list of blocks (chords + composer + meter each) that assembles into the parent locked array + `mosaicSectionPlan`.
- REVISED SCOPE: not build-from-scratch. = (a) input format for block list, (b) translate block list → parent progression + `mosaicSectionPlan` ranges, (c) reuse existing mosaic per-section composer/meter/reharm. Smaller than first feared.
- Key files: `duoLongFormPlanner.ts`, `resolveMosaicSectionStyles.ts`, `mosaicBarHelpers.ts`, `scoreModelAssembler.ts`, `precomputeMosaicEffectiveHarmonyBars.ts`, `mosaicTilePipeline.ts`.

### Band Mode — user-supplied progressions & variable length

- **DONE (2026-06-23, `dc15bad8`):** Custom chord progressions — Musician shell: paste progression → `guitar_bass_duo` + `harmonyMode: custom_locked` + `bandModeEnabled` via `handleMusicianGenerate` / `runAppGeneration`. Replaces hand-edited `runBandModeCustomProgression.ts` scripts for desktop users.
- **DONE (2026-06-23, `dc15bad8`):** Variable length / auto-pad — short seed cycles to target length (`buildPaddedLockedProgressionText`; 8/16/24/32/40/48/56/64). Musician UI: progression box + length dropdown.
- **DONE (2026-06-23, `2414fcbe`):** Section-varying drums on **custom_locked** Band Mode — when no real `mosaicSectionPlan`, synthesize a minimal 2–4 section plan from `totalBars` so existing mosaic drum arc engages (`resolveBandModeDrumArcPlan` → sparse/medium/busy/thin tiers + proportional boundary fills at section `endBar`, not hardcoded 8/20/28). Real mosaic plans (e.g. TV Suite) unchanged. Sidecar source `art_rock_mosaic_grid`. **Band Mode engine work complete.**

### Desktop app — surface Band mode + custom progressions

- **Musician shell (`dc15bad8`):** Quick Generate path shipped — custom progression + variable length on desktop via Musician IPC (not full `runAppGeneration` web app yet).
- Desktop **web** app still generates via `runAppGeneration` → `generateComposition` (duo only) for Band mode + custom progressions outside Musician.
- OPEN: wire `runAppGeneration` (`composerOsAppGeneration.ts`) to support `bandModeEnabled` + user progressions in the main Generate UI, so the web app matches Musician.

- **Band mode desktop UI — staged two-tab design (UX review + engine testing, 2026-06-23):** Wire Band mode + custom progressions into the desktop app using **section cards, not a spreadsheet**. Precedents: Band-in-a-Box (chord-sheet input + part markers), Ableton Session View (rearrangeable scene blocks), MuseScore (rehearsal marks survive to notation). Two tabs:

  **UI DESIGN (from UX review — staged):**

  - **TAB 1 "Quick Generate"** — wire today's pre-expand feature: one progression box + length selector (16/24/32/48/64) + optional whole-piece composer. SMALLEST viable desktop win.
  - **TAB 2 "Arrange in Blocks"** — the multi-block arranger: scaffold picker (pick length → N empty 8-bar cards) → each card has chords + composer chip → duplicate / move-left-right / delete. Rehearsal marks auto-emit (already working in engine: `Block0: Verlaine` etc.).

  **Smart defaults:** new block copies previous meter; "duplicate block"; "same chords / new voice"; scaffold-first (32 bars = 4 empty cards) which also enforces the multiple-of-8, max-64 constraint at the UI.

  **STAGED ROLLOUT (matches engine readiness):**

  1. Tab 1 (progression + length) — wiring only, engine ready.
  2. Tab 2 cards: chords + composer, fixed 8-bar blocks, duplicate/reorder — engine ready (`mosaicSectionPlan`).
  3. Per-block meter — engine ready (mosaic) but stage late; most likely to hit validation edges.
  4. Arrangement intensity (sparse/normal/full) per block — **DEFER:** this is the "arrangement thickens" dimension, NOT yet confirmed built in engine. Do not build UI for it until engine support is verified.

  **ENGINE-DRIVEN UX REQUIREMENT (from testing):** not every per-block progression survives golden-path voice-leading (e.g. a unique Am7 block fell back to the verlaine palette). Block cards MUST show a per-block generation state (clean / fell-back / failed) so users understand silent fallbacks. This is GAP 1 surfacing — not in the UX review, comes from our own runs.

  **Composer chips:** don't hardcode only 3 — read available ids from `mosaicComposerDispatch.ts` (may be more than verlaine/marr/fripp).

  **BUILD SEQUENCE (4 units)** — combine within proven engine surface, isolate across engine unknowns:

  - **MILESTONE A — Quick Generate (EASY).** **DONE (2026-06-23, `dc15bad8`).** Musician shell: progression box + length dropdown + composer picker → `chordProgressionText` / `totalBars` / `harmonyMode: custom_locked` / optional whole-piece composer through IPC → `apiGenerate` → `generateComposition`. Auto-pad shorter seeds to selected length.

  - **MILESTONE B — Block cards + manipulation (MEDIUM).** **NEXT.** Combines cards + reorder:
    - Scaffold picker → N empty 8-bar cards, each with chord box + composer chip (read ids from `mosaicComposerDispatch.ts`).
    - Duplicate / move-left-right / delete / "same chords-new voice"; reindex `startBar`/`endBar` to stay contiguous each change.
    - Engine ready (`mosaicSectionPlan`).
    - FOLD IN item 5 (per-block generation state: clean/fell-back/failed) ONLY IF engine already reports fallbacks. If it does NOT expose fallback info, SPLIT 5 out — it needs an engine-reporting change first; do not stall B on it.

  - **STEP C — Per-block meter (MEDIUM-HARD).** Separate, after B is solid.
    - Mosaic supports per-section meter, but odd-meter + voice-leading is the most likely validation-edge source. One meter bug must not block the card work — hence standalone.

  - **STEP D — Arrangement intensity sparse/normal/full (HARD / BLOCKED).** Isolated.
    - This is the "arrangement thickens" dimension, NOT confirmed built in engine. Do NOT schedule or bundle until a read-only check verifies engine support. Building UI for it now risks a control with no backing feature.

  **PRINCIPLE:** A and B are safe combinations (proven engine ground). 5, 6, 7 stay splittable because each carries an engine question that could stall whatever it's bundled with.

### Future work — Guitar Quintet (leadsheet-input engine)

**Variation controls v1 — SHIPPED (2026-06-16, `2d0e9d40`):** Another version · Rhythmic activity · Guitar comp sliders; end-to-end UI → IPC → API → assembly → passes. See **[HANDOVER_2026-06-16.md](HANDOVER_2026-06-16.md)**.

**Next — 3-up variation gallery:** one action runs three hidden-seed arrangements in parallel (or quick sequence); user picks one; no visible seed.

**James Brown — Pass A.1 static cello bass (shipped V2.1 baseline, 2026-06-17):** `buildJamesBrownStaticCelloBassEvents` — static `sq_cello` bars = beat **1** + and-of-**3** (0.0 + 2.5), 0.5-beat root/5th stabs; optional and-of-**4** (3.5) on gated bars. Melody-owner bars unchanged.

**Parked — JB anti-loop templates (do not change yet):** at `rhythmicActivity ≥ 0.5`, `james_brown` currently falls back to Debussy `TEMPLATES_2` for 2-note patterns; needs jb-specific templates or `sq_cello` gating to avoid 1+3 remap. Micro feel tweak to 3.5 hit rate is separate follow-up.

**Guitar chording (shipped Phase D; density knob above)**

The quintet guitar is currently **single-note only** — it carries the imported melody line and rests otherwise. A future **guitar-density** pass should add guitar **dyads** / **triads** / **chords**, not just fill empty bars. Goal: guitar behaves like a real guitar (polyphonic), not a single-line voice.

**Requirements when built:**

- **Composer-aware chording** — Debussy: colour-tone dyads / quartal voicings; Bartók: sparse percussive stabs; Kenny Wheeler: jazz comping language.
- **Melody pin inviolable** — chords are added underneath/around pinned melody notes; melody pitch order is never altered.
- **Sequencing** — apply only **after** composer archetype passes exist, so guitar chording inherits the same per-composer character (do not implement a generic chording layer first).
- **Playability** — idiomatic guitar voicings; nothing finer than **16th notes**.

Path: **`engines/composer-os-v2/core/import/`** (leadsheet-input **guitar + string quartet** quintet). See **Current** · **Leadsheet-input engine** and [COMPOSER_HANDBOOK.md](COMPOSER_HANDBOOK.md) § Leadsheet-input engine.

### SQ Rhythm engines — String Quartet preset (2026-05-14)

**Status: 6 / 7 shipped.** Live **`sqRhythmEngineId`** engines (receipt bundles **`engines/composer-os-v2/core/rhythm/*RhythmEngine.ts`**, merge **`composerOsAppGeneration.ts`**, Style Panel **`HomeGenerate.tsx`**):

| # | `sqRhythmEngineId` | Receipt prefix |
|---|-------------------|----------------|
| 1 | `bartok_bulgarian_aksak` | `BG_RHYTHM_*` |
| 2 | `free_proportional` | `FP_RHYTHM_*` |
| 3 | `baroque_dance` | `BD_RHYTHM_*` |
| 4 | `reich_phasing_grid` | `RP_RHYTHM_*` |
| 5 | `viennese_waltz` | `VW_RHYTHM_*` |
| 6 | `jewish_klezmer` | `KL_RHYTHM_*` |

**Deferred (queued, not abandoned):** **Swing adapted for SQ** (`sq_swing`) — Turtle Island–aligned swing template; awaits Perplexity + Cursor build + smoke/UI.

When Swing is promoted: Perplexity prompt (≥30 receipt-style cells) · Cursor engine + registry + merge · **`npm run test:composer-smoke`** → 248/0 · Style Panel row.

### ~~SQ Rhythm Engine candidates (2026-05-13)~~ — superseded 2026-05-14

Items **1–6** from the old backlog are **shipped** (see table above). **Only item 7 (Swing)** remains.

---

## Priority stack (2026-04-29) — *superseded*

**Use § What to do next — importance order (2026-05-14)** for scheduling. The numbered list below is **retained for history** only.

0. **Next session priorities (2026-05-04)** — **`universalLeadSheetBuilder.ts`**: wire **`repeatMarkers`** downstream into export/truth (**first** — replaces dead-end noted in handover); **odd-meter UI** for **Donald Fagen** and **Bill Evans** (parity with other writers); **MusicXML import** stress testing with **real Real Book** charts (hosted fixtures + regression gates). **MusicXML `<transpose>`** for **Drop D** / **Eb standard** guitar export is **COMPLETE** (see **Current**).

1. **More Song Mode songwriter profiles (primary writer slices)** — Expand **full-slice-packaged** profiles using the newest template (**chord-row / planning bias + duo golden-path behaviour + receipts + diagnostics + smoke**). **`donald_fagen`** / **`ecm_chamber`** / **`antonio_carlos_jobim`** / **`herbie_hancock`** / **`stephen_sondheim`** / **`kate_bush`** / **`thelonious_monk`** / **`andrew_hill`** / **`charlie_parker`** ship **golden-path `*Slice.ts`** + smoke **2026-04-29** (plus existing surfaces, dressings, eval harnesses). The **typed catalogue** lists many ids; **user-visible value** is **end-to-end** behaviour, not registry-only rows. **Shipped full-slice template (2026-04-28):** **`james_brown`** (**T2.14**); **`joni_mitchell`** (**T2.15**); **`sonic_youth`** (**T2.16**); **`pat_metheny`** (**T2.17**). **`wayne_shorter`** / **`barry_harris`** / **`bill_evans`** / **`bacharach`** / **`donald_fagen`** / **`ecm_chamber`** / **`antonio_carlos_jobim`** / **`herbie_hancock`** / **`stephen_sondheim`** / **`kate_bush`** / **`thelonious_monk`** / **`andrew_hill`** / **`charlie_parker`** slices + smoke **2026-04-29**. **`dave_brubeck`** (**2026-05-02**) — **Shipped** UI + registry/profile + Song Mode odd-meter **`barMeterMap`** presets; optional future **`brubeckSlice.ts`**. **`test:composer-smoke`** aggregate **122**/0, **35** suites (**`runSmokeTests.ts`** snapshot **2026-05-04**). **Pools ready to slice** list is **empty** — **planned New territory slices shipped** (Jobim, Hancock, Sondheim, Kate Bush, Monk, Andrew Hill, **Charlie Parker**); **next:** **new workstreams**, **ECM** arrangement depth, or **parity** work where justified.
2. **Generate UI / discoverability for writers** — Surface **primary/secondary songwriter**, **style stack**, **diversity presets**, and **arranger pairing** so new profiles are choosable and A/B-able without spelunking the API (pairs with **Near term** item 1). **2026-04-29:** grouped Songwriter + Arranger **`optgroup`**s + Song Mode Arranger/Era hint shipped — extend as needed (tooltips, presets wire-through).
3. **Harness + composer stability** — Keep **`test:smoke`** / **`test:fast`** green; use chunked **`runAllTests`** for full matrix; triage **`TEST_DEBT_COMPOSER_OS_V2.md`** so refactors stay safe while profile count grows.
4. **Lead-sheet MusicXML import** — Finish staged harmony import (ensemble presets, evals) where product needs **chart-in**; complements writers but is a **different axis** than “more profiles.”
5. **Phrase Engine / riff-motif layer** — **DONE.** V2: motif pool, hook seeding, guitar nudge, bass echo — wired before C1, 32-bar duo gate.
6. **Melodic variation pack** — **DONE (2026-05-10).** **`POST /api/melodic-variation-pack`** — motif mutations + **`scoreResultForGce`** on stub duo score; **`transform`** + **`scoringMode: "melody-only"`**; **`reharmController`** progression scores aligned. See [CHANGELOG.md](CHANGELOG.md) **[Unreleased] · Added**, [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md) § HTTP API.
7. **ECM arrangement & orchestration depth** — Weakest GCE pillar on ECM; after profiles/harness pressure eases.
8. **Wyble parity + ensemble Wyble** — Duo single-line alignment first; BB/SQ inner-line depth after.

---

## Next 3 development sessions (suggested — 2026-05-03) — *partially superseded*

**Repeat markers export truth** and **Fagen/Evans odd-meter UI** are **shipped** — treat rows **1–2** as **historical**. Prefer **§ What to do next — importance order (2026-05-14)** for new sequencing; row **3** (import stress vs SD3 drum guide) still valid.

Ordered for **dependency leverage** and **small, shippable slices**. Re-sequence if product priority shifts (e.g. publishing/import wins over Song Mode parity).

| Session | Focus | Why now |
|--------|--------|--------|
| **1** | **`universalLeadSheetBuilder.ts`** — wire **`repeatMarkers`** through to materialised score length / MusicXML export truth (and any **`GenerationMetadata`** / manifest fields that assume uncompressed bar counts). Add or extend **smoke** where repeat-heavy charts regress. | **Top priority** after **MusicXML guitar `<transpose>`** (Drop D / Eb standard) **shipped** **2026-05-04**. Unlocks correct playback-length parity and removes a **dead-end** noted in **[HANDOVER_2026-05-03.md](HANDOVER_2026-05-03.md)**; reduces subtle bugs when import + ensemble paths interact. |
| **2** | **Odd-meter UI parity** — **`donald_fagen`** + **`bill_evans`** get the same optional **`barMeterMap`** / composer meter preset affordances as Brubeck / Monk / Shorter / Zappa (**`HomeGenerate.tsx`** + request payload + **`compositionContext`**). Follow with **`fagenSliceSmoke` / `billEvansSliceSmoke`** rows if needed. | **Priority stack** item **0**; narrow surface area (mostly UI + wiring + tests), high user-visible parity for jazz-focused writers. |
| **3** | **Pick one:** **(A)** MusicXML import **stress suite** — host **Real Book**–style `.musicxml` fixtures (subset of charts), regression gates for harmony extraction + repeat behaviour after Session **1**; **or (B)** **SD3 drum guide** validation on **Big Band** (and odd-meter) exports — confirm **`_drum_guide.mid` / `.json`** bar alignment vs **`bb_drums`** / meter map. | **(A)** hardens chart-in for pros; **(B)** validates rhythm-producer workflow from **[USER_GUIDE.md](USER_GUIDE.md)** / **[SD3_DRUM_GUIDE_USER_GUIDE.md](SD3_DRUM_GUIDE_USER_GUIDE.md)** on dense scores. |

**Also queued (outside the “3 sessions” strip):** Zappa **30 Creative Applications** book cross-update (editorial); optional **`brubeckSlice.ts`** only if the team wants slice-pattern parity vs registry-only Brubeck.

---

## HIGH PRIORITY — Odd Meters + Zappa Solo Engine (2026-05-01)

**Update (2026-05-12):** Phase **A** **mixed-meter MusicXML** is **live** for duo / Zappa / ensembles (**`barMeterMap`**, **`oddMeterQuantiser`**, **`ScoreModel.barMeterMap`** on BB/SQ exports). **Donald Fagen** + **Bill Evans** Song Mode **odd-meter UI parity** is **shipped** (V30). Remaining **HIGH PRIORITY** emphasis is **Phase B** depth (xenochrony-as-rhythm on solo line, continued odd-meter solo realism).

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
| **Antônio Carlos Jobim** | `antonio_carlos_jobim` | **Shipped (2026-04-29)** — bossa / Brazilian harmony slice; **`precomputeJobimEffectiveHarmonyBars`**, export/disk truth, smoke **`jobimSliceSmoke.test.ts`**. **`VoiceRuleBundle` `jobim`** (**45** **`JB_*`** receipts, **2026-05-13**) + **`AUTO_RESOLVE`** when primary is Jobim. |
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

**Alignment:** **Tier A → Tier C** remains the background product-attention ladder. **V30** shipped per **§ Next best development** (2026-05-05); **V31** status + remaining items are listed at the top of this doc and under **§ Next best development** (**refreshed 2026-05-07**). Neither maps 1:1 to those tiers.

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
| 9 | **`verlaine`** (`television` alias) | **Shipped** | **Tom Verlaine** lineage — lean **angular twin-guitar** art-punk via **`verlainFieldSlice.ts`**; alias **`television`** → **`verlaine`** in **`songwriterStyleProfiles.ts`** (no separate composer id). |
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

### Next best development — **V30 complete · V31 sequencing** (refreshed 2026-05-07)

#### V30 — **COMPLETE** (2026-05-05)

1. **Odd meter UI parity** — **mixed meter** badge when resolved meters (global time signature + sparse **`barMeterMap`**) show **≥2** distinct signatures — **Chart preview**, **Paste chord progression** block, **iReal Pro Import** result block (`HomeGenerate.tsx` + `parsedChartHasMixedMeter`).
2. **MusicXML import Phase 1** — core **`parseMusicXml`** / **`musicXmlImport.ts`** → **`ParsedChart`** (title, composer, key, meter, harmonies); DOM-backed, deterministic; pairs with Song Mode / eval workflows as landed.
3. **Duo expansion** — **pairing cards** + **swap** for **`pat_metheny`** / **`bacharach`** / **`ecm_chamber`**; **Duo intent** radios (**Conversational** / **Supportive**); **Duo Health** pill on Song Mode success (vault echo / spacing heuristics); **ECM Chamber** **Safe sweep profile** badge + amber long-form / mixed-meter escalation + **Advanced → Try full sweep anyway** (override **UI-only**).

*Near alternates (unchanged bias):* **`TEST_DEBT`** clear-down for **`runAllTests`**; **Wyble** ensemble inner-line after duo parity; **ECM** arrangement pass; additional **Tier A** songwriter slices when capacity returns (**§ Overall roadmap priorities**).

#### V31 — **complete vs remaining** (refreshed 2026-05-11)

**Shipped:**

1. **CI smoke job on `main`** — **GitHub Actions** workflow: **`npm run test:composer-smoke`** on **push** to **`main`**. Commit **`b8d47db`**.
2. **Deterministic remix controls** — **same seed**, **ChorusArcStrip**, vault/emotional drift + duo remix UX (**Keep A/B/Both**). Commit **`3453292`**.
3. **Writer recipe cards** — inline **Generate** panel per songwriter select: **display name**, **era tag**, **melody device pills** (**`MELODY_PROFILES`**), **one-line blurb** (profile description or first registry rule), **hover preview** on options. Commit **`c2d9747`**.
4. **Duo intent → generation** — **`duoIntent`** on API → **`generationMetadata`** → **`duoGoldenPathPhraseIntentAtBar`** (phrase bias) + **`adjustDuoEnsembleStaggerForProductIntent`** (attack stagger). **2026-05-11 close-out** — MIDI velocity voice-balancing deferred as future enhancement.
5. **MusicXML import Phase 2** — Song Mode **`SONG_MODE_LEADSHEET_PHASE1_WRITERS`** writer expansion (**seven** IDs, **`HomeGenerate.tsx`** + **`composerOsAppGeneration.ts`**); control writer in **`songModeLeadSheetInput.test.ts`** updated (**`radiohead`**); smoke **246/0**. **Complete 2026-05-11**.
6. **Clave-aware grid overlay** — **`claveGridTypes.ts`** stub registry (**`son_basic`**, **`rumba_basic`**, **`afro_6_8_basic`**), **`applyClaveGridOverlay`** (`core/rhythm/claveGridOverlay.ts`), **`runGoldenPath`** hook after **`computeRhythmicConstraints`**, env **`COMPOSER_OS_CLAVE_GRID_OVERLAY`** / **`VITE_COMPOSER_OS_CLAVE_GRID_OVERLAY`**, API **`GenerateRequest.claveGridOverlay`**, metadata **`claveGridOverlayReceipt`**. **Complete 2026-05-11** (smoke **246/0**).

**Deferred / parallel (not in V31 ordering):** **ChorusArcStrip Phase 2–3** (vault chorus tension strip interactions + contour ribbon)—resume when multi-chorus UX capacity returns; see **`ChorusArcStrip.tsx`**.

**Scope note — songwriting engine, profiles, ensembles, arrangers:** V31 **bounded rhythm overlay** (clave slice) is **shipped** alongside **CI**, **deterministic remix**, **writer recipe cards**, **duo intent v1**, and **MusicXML import Phase 2**. Songwriter **full slice** expansion order lives under **§ Writer Slice Roadmap** at the top of this doc; **Tier A** targets also remain in **Overall roadmap priorities** and **pick list** below.

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

### ZAPPA SOLO GENERATOR (post Phase C)

**Status:** **Z1–Z4 shipped (2026-05-21)** — riff-path solo overlay on `frank_zappa` VRB (`soloGeneratorProfile`, `riffSoloBuilder.ts`, UI toggle). Song Mode / duo `zappasoloEngine.ts` unchanged. **σ29** · **family `rock`**.

| Step | Scope | Notes |
|------|--------|--------|
| **Z1** | **Perplexity research** | Scale / modal language, polyrhythm, interval identity, contour, phrasing, variation ops, chromatic budget. **Songs:** *Inca Roads*, *Watermelon in Easter Hay*, *Apostrophe*, *Muffin Man*, *Montana*, *Blessed Relief*. |
| **Z2** | **`frank_zappa` VRB stub** | `riffVrbStubs.ts` + `voiceRuleBundles.ts`. **Aliases:** `zappa` / `frank_zappa` / `mothers`. **σ** TBD. **Family:** `rock` (solo-specific family tag **TBD** at Z2). |
| **Z3** | **Solo generator layer** | `soloGeneratorProfile` on `RiffProfile`; **separate MIDI part**; UI toggle in `RiffGeneratorPanel` (roll out **fusion / art_rock** first, then **rock**). |
| **Z4** | **Wiring** | Family tags, smoke row counts, `INVARIANTS.md` update when implementation starts. |

**Explicit non-goals until Z1–Z2:** duplicating riff receipt compiler behaviour for full ensemble; changing GCE / duo / Song Mode overlays for this lane.

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
| 17 | **Clave-aware grid overlay (thin Afro-Cuban slice)** — **COMPLETE (2026-05-11)** | **`ClaveGridSpec`** + stub registry, **`applyClaveGridOverlay`**, env **`COMPOSER_OS_CLAVE_GRID_OVERLAY`**. **Full** Afro-Cuban timba engine stays **research-parked** (**§ Research parking**). |

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

*End of Composer OS Roadmap [2026-05-06].*

---

## Phase Z6 — Blues-Rock Ferocity (riff + duo)

**Z6 STATUS: SHIPPED**
- bluesrockFerocious styleMode: Slonimsky map + VRB stub + FZBLUES receipts + adapter landed
- UI: zappaStyleMode selector in Advanced panel (frank_zappa only)
- **5b (2026-05-22):** `zappaStyleMode` + `zappaEraPreset` / `zappaPhraseCharacter` / `zappaSymmetryBias` / `zappaChainDepth` threaded through riff chain (`GenerationMetadata` → `RiffGeneratorParams` → `buildSoloPartForScore` → `riffSoloFromZappaEngine` / `resolveEffectiveZappaSoloProfile`); seed-42 golden fixtures; Advanced panel controls.

### Phase Z7 — Slonimsky Harmonic Scene

**Status: SHIPPED (2026-05-22)** — `slonimskyHarmonicScene.ts`: cell pitch classes → `dominantVoicingColor`; `enrichHarmonicScenesWithSlonimskyCells` on `attachVoiceRuleBundle`; compositional Zappa chord bias; `slonimskyHarmonicSceneReceipts` on metadata. Smoke: `slonimskyHarmonicScene.test.ts`.

### Phase Z8 — GBD Slonimsky context

**Status: SHIPPED (2026-05-22)** — `buildGuitarBassDuoSlonimskyContext` on all guitar–bass duo golden-path bars; `z8:gbd@bar1` receipts on `slonimskyGbdCellReceipts`. Smoke: `slonimskyGbdContext.test.ts`.

### Phase Z9 — Song mode Slonimsky

**Status: SHIPPED (2026-05-22)** — `songModeSlonimsky.ts` / `applySongModeSlonimskyCellLayer` (pat_metheny, frank_zappa, sonic_youth, joni_mitchell, radiohead); `z9:songwriter=*` on `slonimskySongModeCellReceipts`. Smoke: `songModeSlonimsky.test.ts`.

### Phase Z10 / Z11 — BB + SQ ensemble cell receipts

**Status: SHIPPED (2026-05-22)** — `pushEnsembleSlonimskyCellReceipt` on BB alto/tenor + SQ Vn1/Vn2 Slonimsky windows; sinks from `runBigBandRealisation` / `runQuartetRealisation` → `slonimskyEnsembleCellReceipts`. Smoke: `slonimskyEnsembleReceipt.test.ts`.

### Receipt deepening R1–R4

**Status: SHIPPED (2026-05-22)** — Nile Rodgers **NR_VL_01** / **NR_TEX_01** / **NR_LOOP_01** / **NR_DIFF_01** in `riffVrbStubs`; refreshed `larry_carlton_golden.json` + `david_gilmour_golden.json` (seed 42); EVH golden seed-42 verify in `riffZappaSolo.test.ts`.

---

## Session Handoff — V61 — 2026-05-23

**SMOKE BASELINE**
- Full: **450** / **80** / **0** (~25s tsx)
- Fast: **285** / **66** / **0** (~11s tsx)

**LAST COMMIT:** `fb2d43b3` → `origin/main`

**COMPLETED THIS SESSION (V61 U1–U9)**
- **U1–U6** — Slonimsky panels: universal macro, song mode (writers + section pin/avoid), ensemble BB/SQ, GBD, SQ→BB hybrid
- **U7–U8** — UX copy, harmonic voice roster, advanced drawer (cell pin/forbid), sonic_youth warning path
- **U9** — **`slonimsky-ui`** smoke suite (UI boundary goldens); vitest render check for sonic_youth badge

**NEXT SESSION ENTRY POINT**
1. Sibelius playback QA on Slonimsky harmonic colour + GBD outside levels
2. V58 per-section VRB assignment (recon complete; await Commit 1)
3. Optional: wire ensemble cell receipts into app manifest echo

**REBUILD DESKTOP APP**

PowerShell:

```powershell
Set-Location "C:\Users\mike\Documents\Cursor AI Projects\creative-engines-fresh\apps\composer-os-desktop"
npm run desktop:package-no-bump
Start-Process "release\Composer-OS.exe"
```


