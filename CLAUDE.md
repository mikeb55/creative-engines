## Autonomous Operation
- Never ask for permission before taking an action
- Never pause to confirm file edits, terminal commands, or git operations
- Never ask "shall I proceed?" or "is it okay to...?"
- Execute all steps in a prompt sequentially without interruption
- Only stop if a command returns a non-zero exit code
- Treat every prompt as full authorisation to complete all stated tasks

# Claude Code Behaviour
The **Autonomous Operation** section above is binding. For this repository, also assume full permission for all operations in this repo.

# Composer OS

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tool Routing Rules

**Claude.ai** (this interface):
- Strategy, architecture decisions, sequencing advice
- Prompt drafting (Cursor, Claude Code, Perplexity)
- Harmonic research interpretation
- Roadmap and prioritisation
- Reading and interpreting results

**Claude Code** (terminal):
- Read-only codebase audits and searches
- Running smoke tests and build checks
- Parallel research tasks while Cursor is running
- Git operations if needed outside Cursor
- Any bash/shell task that does not require visual diff

**Cursor**:
- All slice implementation (TypeScript)
- All file creation and editing
- All wiring (integration files)
- All doc updates and commits
- Visual diff review of changes

**Rule: divide parallel work**
- If Cursor is running a long task, use Claude Code for
  simultaneous read-only research
- Claude Code audits should always complete before the
  dependent Cursor prompt is written
- Never give the same task to both tools

## Documentation

- **`docs/GCE_LOCK_DCR_STANDARDS.md`** — **GCE v2.0**, **LOCK** pre-commit gates, **DCR** workflow (Design · Commit · Refine), **Style Profile Layer** per composer slice/style surface; applies to all builds including ECM/style surfaces. Canonical GCE math remains **`docs/GCE_FRAMEWORK_V2.md`**.
- **`docs/COMPOSER_OS_PLAYBOOK.md`** is the primary user-facing playbook (workflows, presets, scenarios, export notes).
- Update it whenever new composers (songwriter slices), presets, or meter presets are added or materially changed.
- After any playbook edit, regenerate the Word export: **`node scripts/generateComposerOsPlaybookDocx.mjs`**
- Commit **`docs/COMPOSER_OS_PLAYBOOK.md`** and **`docs/COMPOSER_OS_PLAYBOOK.docx`** together so Markdown and DOCX stay in sync.

## Sonic Youth & non-conventional guitar (beyond tuning presets)

**`alternateGuitarTunings.ts`** is only the **open-string catalog** (zones, grip library inputs). It does **not** encode dual-guitar drones, prepared noise, or inter-guitar clash — do not treat “pick `sy_*` from dropdown” as the full Sonic Youth story.

**Score-level truth** for noise-rock / SY-style material lives on **`ChordEvent.sonicYouth`** (**`core/score-model/sonicYouthChordTypes.ts`**): two **`GuitarTuningState`** (per-guitar `tuningId`, **`openPitches`**, `shapeId`, `fretPattern`, `stringMask`, **`droneStrings`**, **`noiseLevel`**: `clean` | `crunchy` | `feedback` | `prepared`), **`InterGuitarDissonance`** (score + interval tallies + **`preset`**), and **`textureState`** (**`SYTextureState`**) for macro phase / exporter hints. **`chordSymbol`** may be **`null`** (explicit no symbol) — guard string ops.

**Guards / helpers:** **`sonicYouthChordGuards.ts`** — **`isSonicYouthEvent`**, **`getSYTextureState`**, re-export **`getSYDissonancePreset`** (0–1 score → friction tier). **Pipeline:** narrow + **profile-gate** before reading SY fields or augmenting MusicXML (**`musicxmlExporter.ts`**, **`sonicYouthSlice.ts`**, **`sonicYouthTextureEngine.ts`**).

**Research / Perplexity prompts** (v1 interface sketch): see **`c:\Users\mike\Documents\Perplexity Research\000 Sonic Youth template.txt`** on this machine when extending the schema.

## Recent update (2026-05-04)

**Composer OS app + desktop packaging:** **Choruses** number input (**1–64**, default **1**, step **1**) on **`HomeGenerate.tsx`** **iReal Pro Import (Beta)** and **Paste Chord Progression** — passes **`chorusCount`** into **`generateFromIReal`** / **`generateVaultFromParsedChart`**; result summary shows total bars as **bars/chorus × choruses**. **Desktop build fix:** **`apps/composer-os-desktop/scripts/build-api-bundle.js`** and **`build-desktop-ipc-bundle.js`** add esbuild **`external: ['@napi-rs/canvas']`** (IPC bundle keeps **`electron`**) so **`@napi-rs/canvas`** native **`.node`** binaries are not bundled. **Rebuilt:** **`npm run desktop:package-no-bump`** → **`apps/composer-os-desktop/release/Composer-OS.exe`** (portable) + **`Composer-OS-Setup.exe`** (NSIS installer).

**Chord Inspector — Reharm UI:** After a successful inspect, **Reharmonise** runs **`generateReharmCandidates`** and shows a **drift proximity** slider (**0.0–1.0**, step **0.1**, default **0.5**) that remaps to a target emotional drift and **reorders** the **top 8** same-root substitutes; each row shows substitute label, dominant **drift** readout, and **Use this chord** (fills the chord symbol field). The reharm panel **closes / clears** on a new **Inspect Chord** so results always match the current symbol.

**Smoke tier:** **`npm run test:composer-smoke`** — **163**/0 PASS rows, **42** labelled suites (**`runSmokeTests.ts`** allowlist). Sync **`CLAUDE.md`**, **`docs/COMPOSER_OS_ROADMAP.md`** (Current + checklist), and **`docs/CHANGELOG.md`** when you change **`engines/composer-os-v2/tests/runSmokeTests.ts`**.

**Vault iReal / paste / PDF pipeline (2026-05-05):** **`VaultGenerationOptions`** — **`chorusCount`** (default **1**, max **64**) repeats the full chart with sequential **`barIndex`** / global **`startBeat`**; each chorus advances **melody** motif **`transformMotifThroughLayers`** tension phase (**primary → tension → chaos → recover → resolve**, modulo **5**) unless **`songwriterStyleId === 'sonic_youth'`** (holds rotation at **0** for SY texture). **Solo** mode repeats bars without motif pass; when **`riffStyle`** is omitted or **`triad-pair-pendulum`**, each chorus rotates effective vault style via **`TRIAD_PAIR_CHORUS_ROTATION`** (same SY bypass). **Melody** mode also wires **Build F** **`motifTransformer`** reuse after initial quadratonic fill. **Song Mode phrase validator:** **`sonic_youth`** bypasses **zigzag** (**`phrase_bar_zigzag`**) only.

**Tonality Vault roadmap session summary (2026-05-04):** **Build A** (**`NoteTag`**, **`buildBeatContextLegalityMap`**); **B** (**`LayerStateMachine`**, **`planLiquidHarmony`**); **C** (**`generateVaultRiff`**, **`buildGuitarGripLibrary`**, **`ScoreNote`**); **D** (**`generateReharmCandidates`**, **`reharmCandidateEngine.ts`**); **E+F** (**`ArrangementLayerRouter`**, **`transformMotifThroughLayers`**); **G** (**`VaultChordRuleSet`**, **`buildAllVaultChordRuleSets()`**); **C2** (alt tuning in **`guitarGripLibrary.ts`**); **H** (**`gceTargetedGenerator.ts`**, **`runWithGCETarget`**); **IMG** ( **`core/irealpro/`** — **`parseIRealProInput`**, **`chordSymbolMapper`**, **`generateFromIReal`**, **`IRealVaultOutput`**; **HomeGenerate.tsx** **iReal Pro Import (Beta)**); **I** (**`core/generation/`** — **`GenerationModeProfile`**, **`planPhrase`**, **`irealVaultPipeline`** **`mode`** / **`IRealVaultOutput.mode`**); **UI** (**`FretboardPanel`**, **`TabPanel`**, **`LayerToggleBar`**, **`FretboardExporter`**, **`VaultMicroscope`** — see playbook **Tonality Vault — Build UI (complete)**). **Full Tonality Vault roadmap complete:** **A, B, C, C2, D, E+F, G, H, I, IMG, UI** all shipped.

**Session handover — V29 complete (2026-05-04):** **Paste Chord Progression** — **`parseChordProgressionText`** (`chordSymbolMapper.ts`), **`generateVaultFromParsedChart`** refactor (`irealVaultPipeline.ts`), **HomeGenerate.tsx** collapsible above iReal (key / meter / tempo / mode / tuning / riff → vault riff + MusicXML). **PDF lead sheet import** — **`core/pdf/`** **`generateFromPdf`**, **`vaultRiffScoreNotesToMusicXml`**, **`apiPdfGenerateFromPdf`**, **`POST /api/pdf/generate-from-pdf`**, desktop IPC, **`dotenv/config`** in **`pdfChordReader.ts`**. **Vision title cleanup** — **`cleanVisionTitle`** in **`pdfChordReader.ts`** strips trailing page-number OCR junk from chart titles before **`ParsedChart`**. Prior retained: GCE / LOCK / DCR / Style Profile evaluation; arranger auto-scoring; playbook Future Workstreams; **Light Touch** profiles; classical overlays; **Tonality Vault** IMG + Build I + **Chord Inspector** + Build UI (**VaultMicroscope** playbook).

**Next priorities — V30:** **multi-chorus quality** · **MusicXML import** · **duo expansion**. *(Backlog: arranger surfaces, MIDI import, unmeasured cadenza, Nutritional Information melody V2 — playbook.)*

**Confirmed working (2026-05-02 — Zappa / export):** **Sibelius** MusicXML import **clean** (no invalid **`<part-name-display>`** / **`<credit>`**; schema-invalid per-measure **`<staff-details>`** removed); comp staff **`Piano`** in XML — **full printed instrument names** in Sibelius are a host preference (**House Styles → Engraving Rules → Instruments**). **Zappa Classic** **7/8 + 4/4** **`barMeterMap`** path; **solo electric guitar** written pitch **+12** semitone shift (see **`docs/ZAPPA_CREATION_GUIDE.md`** §1).

**Frank Zappa Musicality (2026-05-02):** Manual QA — **GCE 9.1/10** (**first 9+** overall); **green receipt** (**`exportIntegrityPassed`**) on Generate. **Motif lock shipped:** sticky **3–4 note** anchor (**tritone / minor 6th** leap), structural recall bars **1 / 5 / 9 / 13**, breath bars after motif statements, recurrence **≥0.75** (see **`docs/ZAPPA_CREATION_GUIDE.md`** §1). Earlier **8.3** category snapshot superseded by **9.1** milestone; plus §4 — **60%** cell lock, phrase breath space, guide-tone streak repair.

**Altered Tuning Presets (2026-04-29):** Expanded to **24 roadmap zone presets** across **four zones** (**`jazz_sophisticated`**, **`sonic_youth_noise`**, **`joni_mitchell`**, **`hybrid_harmonic`**) in **`alternateGuitarTunings.ts`**, plus **`getPresetsByZone`**, **`ROADMAP_ZONE_TUNING_PRESET_IDS`**, **`styleProfileSupportsAlternateGuitarTuning`** (optional **`STYLE_SONIC_YOUTH`**, **`STYLE_JONI_MITCHELL`**, **`STYLE_PAT_METHENY`**, **`STYLE_ECM_CHAMBER`** on **`songModeStyleProfile.ts`**). **Generate** zone **`optgroup`** UI (**`HomeGenerate.tsx`**). **Follow-up:** per-tuning voicing maps (Tonality Vault) remain a separate workstream.

**Summary of work**

- **Charlie Parker Song Mode slice (2026-04-29):** **`charlieParkerSlice.ts`** (`core/song-mode/`) + golden-path re-export **`goldenPath/charlieParkerSlice.ts`**, **`precomputeCharlieParkerEffectiveHarmonyBars`**, smoke **`charlieParkerSliceSmoke.test.ts`** — bebop ii–V–I harmony (**`cp:*`** receipts; **five devices d1–d5**): ii–V clarify, tritone sub, turnaround compression, bebop scale enrichment, Bird enclosure slash. **Aliases registered:** **`charlie_parker`**, **`bird`**, **`parker`**, **`charlie`** in **`songwriterStyleProfiles`**. **`HomeGenerate.tsx`** **Shipped (full slice)** lists **20** golden-path writers (after **Andrew Hill**).
- **Andrew Hill Song Mode slice (2026-04-29):** **`andrewHillSlice.ts`** (`core/song-mode/`) + golden-path re-export **`goldenPath/andrewHillSlice.ts`**, **`precomputeAndrewHillEffectiveHarmonyBars`**, smoke **`andrewHillSliceSmoke.test.ts`** — angular non-functional harmony (**`ah:*`** receipts; **five devices d1–d5**). **`avoid_resolution=True`** posture, **open cadence** strategy (no clean V→I). **Aliases registered:** **`andrew_hill`**, **`hill`**, **`andrew`** in **`songwriterStyleProfiles`**. **`HomeGenerate.tsx`** **Shipped (full slice)** lists **20** golden-path writers (after **Thelonious Monk**).
- **Thelonious Monk Song Mode slice (2026-04-29):** **`theloniousMonkSlice.ts`** (`core/song-mode/`) + golden-path re-export **`goldenPath/theloniousMonkSlice.ts`**, **`precomputeTheloniousMonkEffectiveHarmonyBars`**, smoke **`theloniousMonkSliceSmoke.test.ts`** — angular harmony (**`tm:*`** receipts). **Aliases registered:** **`thelonious_monk`**, **`monk`**, **`thelonious`** in **`songwriterStyleProfiles`**. Harmonic rules extracted from **`engines/monk-engine`** Python internals — **no Perplexity research needed**. **Fix:** **`isDominantFunctionSymbol`** treats **post-coloured `7b9` / `7alt`** symbols correctly after **`colourDominantMonk`** so deferred-cadence / tritone-sub passes still fire. **`HomeGenerate.tsx`** **Shipped (full slice)** lists **19** golden-path writers.
- **Kate Bush Song Mode slice (2026-04-29):** **`kateBushSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeKateBushEffectiveHarmonyBars`**, smoke **`kateBushSliceSmoke.test.ts`** — tonal-modal / drone-aware texture harmony (**`kb:*`** receipts). **Aliases registered:** **`kate_bush`**, **`kate`**, **`bush`** in **`songwriterStyleProfiles`**. **`HomeGenerate.tsx`** **Shipped (full slice)** lists **19** golden-path writers (dropdown audit **2026-04-29**).
- **Stephen Sondheim Song Mode slice (2026-04-29):** **`sondheimSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeSondheimEffectiveHarmonyBars`**, smoke **`sondheimSliceSmoke.test.ts`** — dramatic theatre harmony (**`sh:*`** receipts). **Aliases:** **`sondheim`** and **`stephen_sondheim`** both resolve via **`songwriterStyleProfiles`**. Shipped **19** writer slices including **`stephen_sondheim`**.
- **Herbie Hancock Song Mode slice (2026-04-29):** **`herbieHancockSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeHerbieHancockEffectiveHarmonyBars`**, smoke **`herbieHancockSliceSmoke.test.ts`** — Blue Note post-bop harmony (**`hh:*`** receipts; **`bh:*`** Barry Harris). Among **19** shipped slices with **`herbie_hancock`**.
- **Jobim Song Mode slice (2026-04-29):** **`jobimSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeJobimEffectiveHarmonyBars`**, smoke **`jobimSliceSmoke.test.ts`** — bossa / Brazilian jazz harmony (**`aj:*`** receipts; **`jb:*`** already owned by **James Brown**). Shipped with **`antonio_carlos_jobim`** among the **19** slices.
- **ECM Chamber Song Mode slice (2026-04-29):** **`ecmChamberSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeEcmChamberEffectiveHarmonyBars`**, smoke **`ecmChamberSliceSmoke.test.ts`** — sparse Nordic/modal harmony (`ec:*` receipts). **Pools ready to slice:** none (all previously queued pools shipped).
- **Donald Fagen Song Mode slice (2026-04-29):** **`donaldFagenSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeDonaldFagenEffectiveHarmonyBars`**, smoke **`donaldFagenSliceSmoke.test.ts`** — jazz-rock precision harmony (`df:*` receipts).
- **Frank Zappa Song Mode slice (2026-05-01):** **`frankZappaSlice.ts`** (`core/song-mode/`) + golden-path re-export **`goldenPath/frankZappaSlice.ts`**, **`precomputeFrankZappaEffectiveHarmonyBars`**, smoke **`frankZappaSliceSmoke.test.ts`** — **`fz:*`** receipts; **`breakFrankZappaIiViProgressions`** (no rolling ii–V–I chains). **Aliases:** **`frank_zappa`**, **`fz`**. **`HarmonyContext`** + **`attachFrankZappaHarmonyContext`** — single effective-harmony timeline for score, XML truth, and lock validation; **`runGoldenPath`** export truth prefers **`harmonyContext.bars`** for **`frank_zappa`**. **GCE 9.1 milestone (2026-05-02):** first **9+** overall; **motif lock complete** — sticky **3–4 note** anchor (**tritone / m6**), structural recall **1 / 5 / 9 / 13**, breath bars after motif bars, recurrence **≥0.75**. **Phase B solo (`zappasoloEngine.ts`):** **Phase 1** — 7/8 rhythmic cell lock (section **A** = 3+3+2 label / `[3,2,2]` eighths, section **B** = 3+2+2+2 / `[2,2,2,1]`, ≥**60%** phrase windows locked, **`rhythmicCellLock`** + phrase **`zappaRhythmicCell`** metadata); **Phase 2** — motif ownership (**4-bar** slice → sticky anchor, full-phrase reinjection when similarity **&lt;0.5**, development-window repair below **0.75**, **`zappaMotifReceipt`**); **Phase 3** — voice-leading + bass authority (**`zappaVoiceLeading.ts`**): guide-tone line (**3rd/7th**, step-cost + **streak repair** when **&gt;2** consecutive non-stepwise bars), bass beat **1** root/3rd/7th + beat **2** chord tone or leading tone (**`frankZappaBassBeatCommitmentViolated`** receipt), phrase goals **N+2**/**N+4**, implied inner voice + contrary motion per section, **`zappaVoiceLeadingScore`** (0–10) via **`moduleValidation.ts`**); phrase **breath space** (≥1 bar per 4-bar phrase with **≤2** notes); **Phase 4** — guitar↔bass imitation + register swap (**`applyFrankZappaPhase4GuitarBassAndRegister`**), cross-bar solo callbacks (bar **1**→**5/9/13…**, **`crossBarCallbacks`** on **`zappaMotifReceipt`**), one **cell-disruption** bar per section (**`sectionDisruptionBars`**); **Phase 5 (2026-05-02)** — UI fixes: **`HomeGenerate.tsx`** green receipt when **`exportIntegrityPassed`** (amber **Generated (not shareable)** when shareable false); **export pitch clamp:** **`soloLineToPartModel`** **+12** then hard ceiling **MIDI 84** (no **`<octave>7</octave>`** on **`zappa_solo`**); default gen range **52–84**; **MusicXML trio:** **Piano** (**`<part-name>Piano</part-name>`** + **`<instrument-name>Piano</instrument-name>`**, GM **1**) / **Upright Bass** / **Elec. Gtr** (**`scoreInstrumentName` Electric Guitar**, GM **27**); lead-sheet **`<harmony>`** on comp staff only (no symbols on bass); **d1**/**d4** device rates **55%**/**50%** + **`enforceZappaHarmonyLanguageFloors`** (altered/colour density); solo **≥2** notes per bar + default density **medium** (**0.72**); odd-meter **`barMeterMap`** smoke seed **77777** + XML asserts. Smoke **`zappasoloSmoke.test.ts`** (**114**/0 aggregate tier).
- **Locked harmony routing fix:** **`composerOsAppGeneration.ts`** (`harmonyBarsForLockedAssertions`) + **`customLockedHarmonyRouting.ts`** (`assertScoreMatchesLockedHarmonyWire`) — effective bars for **Wayne Shorter**, **Barry Harris**, **Bill Evans**, **Bacharach**, **Donald Fagen**, **ECM Chamber**, **Antônio Carlos Jobim**, **Herbie Hancock**, **Stephen Sondheim**, **Andrew Hill**, **Charlie Parker**, and related shipped slices so Song Mode / custom harmony assertions match **`getChordForBar`** after slice precompute.
- **Bill Evans Song Mode slice:** **`billEvansSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeBillEvansEffectiveHarmonyBars`**, smoke **`billEvansSliceSmoke.test.ts`** — listed under **Shipped slices** in **`docs/COMPOSER_OS_ROADMAP.md`**.
- **Bacharach Song Mode slice:** **`bacharachSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeBacharachEffectiveHarmonyBars`**, smoke **`bacharachSliceSmoke.test.ts`**. Theatre-pop harmony symbols (`ba:*` receipts); guitar chromatic nudges remain in **`applyBacharachGuitarBarPasses`**.
- **Barry Harris:** **`barryHarrisSlice.ts`** + smoke; **fix:** **`barry_harris`** wired into **`barsForLockedExportTruth`** in **`runGoldenPath.ts`** (export-truth parity with other locked-harmony slices).
- **Registry / engine:** `bill_evans` remains a first-class `SongwriterRuleId`; duo golden-path generation uses **`billEvansSlice`** when primary is **`bill_evans`**.
- **Generate UI:** Songwriter and Arranger dropdowns use `<optgroup>` groupings; Song Mode has helper copy for arranger/era pairing. **Accessibility:** `label` `htmlFor` ↔ control `id`, `aria-describedby` to visually hidden optgroup context (and Song Mode Era → existing pairing paragraph `id`). Implemented in **`apps/composer-os-app/src/pages/HomeGenerate.tsx`** for Song Mode, Big Band, and String Quartet rows.
- **Classical song overlays (2026-05-04):** **`applyClassicalSongOverlay`** in **`songwriterStyleResolver.ts`** — per-composer blended scalar nudges; **`classicalOverlay`** on generate payload; **Classical song influence** UI beside lyric author; playbook section **Classical song overlay (Song Mode)**.
- **Docs:** Roadmap (ECM sweep note, Bacharach/Fagen product note, smoke checklist); **`docs/USER_GUIDE.md`** + **`UserGuide.tsx`** describe grouped dropdowns; **`docs/CHANGELOG.md`** — Composer OS entry dated **2026-04-29** (empty **`[Unreleased]`** until the next drop).

**Suggestions for developers today**

1. After UI changes under **`apps/composer-os-app/`**, run **`npm run build`** in that package (or **`npm run dev`** for manual QA).
2. Before merging engine/harness changes, run **`npm run test:composer-smoke`** and confirm the aggregate PASS count matches **`CLAUDE.md`** and **`docs/COMPOSER_OS_ROADMAP.md`** “Current” when you change **`engines/composer-os-v2/tests/runSmokeTests.ts`**.
3. New or moved songwriter rows in grouped dropdowns: keep **`SONGWRITER_GROUP_*` / `SONGWRITER_OPTIONS`** in sync and extend **a11y** copy in **`HomeGenerate.tsx`** if group labels or semantics change.
4. For a new full slice, follow **`brianWilsonPetSoundsSlice.ts`**, add smoke + eval script pattern, and log in **`CHANGELOG.md`**.

## Commands

### Testing

```bash
# Smoke tier (~5 min) — 163/0 PASS rows, 42 labelled suites (runSmokeTests.ts allowlist; sync CLAUDE + roadmap when edited)
npm run test:composer-smoke

# Fast tier (~15–20 min)
npm run test:composer-fast

# Full tier (~30–45 min, 4 sequential Node processes to manage heap)
npm run test:composer-full

# Run a single test file directly
npx ts-node --project tsconfig.json engines/composer-os-v2/tests/brianWilsonPetSoundsSliceSmoke.test.ts
```

### Evaluation (songwriter slice diagnostics)

```bash
npm run eval:brian_wilson   # outputs to /output/brian_wilson-eval/
npm run eval:stevie_wonder
npm run eval:radiohead
npm run eval:james_brown
npm run eval:joni_mitchell
npm run eval:sonic_youth
npm run eval:pat_metheny
```

### Dev servers

```bash
npm run dev              # React/Vite web app + Express API
npm run desktop:dev      # Electron desktop app (Windows)
npm run desktop:build    # Build desktop executable
npm run desktop:package  # Package NSIS + portable installers
```

## Architecture

### Primary engine: `engines/composer-os-v2/` (TypeScript)

The core of the project is a deterministic generative composition pipeline. A seeded request flows through:

```
app-api/generateComposition
  → runGoldenPath              # preset-specific path selection
  → buildScore                 # songwriter slice, duo, ECM, Big Band, String Quartet
  → C1–C7 Rhythm Overlays      # Song Mode only (soft rhythm → funk → ostinato → expression → space)
  → Phrase Engine V2 (buildMotifPool → seedPoolFromHookIdentity → applyPhraseEngineV2 → applyBassMotifEcho)
  → finalizeAndSeal            # bar math validation
  → exportMusicXML             # Sibelius-safe polyphonic MusicXML
  → readiness gates            # integrity checks
  → OutputManifest
```

Key files:
- `core/conductor/conductor.ts` — main pipeline orchestrator
- `core/goldenPath/generateGoldenPathDuoScore.ts` — duo guitar/bass entry point
- `core/song-mode/songModeBuilder.ts` — Song Mode request → score compilation
- `core/phrase/phraseBuilder.ts` — 4-stage phrase engine
- `core/export/scoreToMusicXml.ts` — MusicXML exporter
- `app-api/appApiServer.ts` — HTTP/IPC gateway (web + desktop share this)
- `core/compositionContext.ts` — central metadata + request typing

### Songwriter slices (`core/song-mode/`)

Each of the **21** shipped writer slices (Brian Wilson, Stevie Wonder, Radiohead, James Brown, Joni Mitchell, Sonic Youth, Pat Metheny, Wayne Shorter, Frank Zappa, Barry Harris, Bill Evans, Bacharach, Donald Fagen, ECM Chamber, Antônio Carlos Jobim, Herbie Hancock, Stephen Sondheim, Kate Bush, Thelonious Monk, Andrew Hill, Charlie Parker) follows the same pattern:
- 5 harmonic devices (`d1–d5`), each with eligibility gates + anti-elaboration guards
- `buildEffectiveHarmonyBars()` precomputes altered progressions
- Results routed through `customLockedHarmonyRouting` into MusicXML
- Evaluation harness: `eval:<name>` script, smoke: `*Slice.test.ts`

Use `core/song-mode/brianWilsonPetSoundsSlice.ts` as the canonical pattern when adding new writer slices.

### Apps

- `apps/composer-os-app/` — React 18 + Vite 5 web UI, Express 4 backend
- `apps/composer-os-desktop/` — Electron 28 desktop wrapper (Windows)

The Electron app and web app share the same `app-api/` backend; `app-api/appApiTypes.ts` defines the `GenerateRequest` / `OutputManifest` contract.

### Secondary engines

- `engines/wayne-shorter-engine/` — Python 3.11, composer IR for instrumental (non-songwriter) composition
- `engines/jimmy-wyble-engine/` — Guitar voice-2 polyphonic dynamics (Wyble layer)
- `engines/big-band-architecture-engine/`, `engines/ellington-orchestration-engine/` — ensemble scoring
- `engines/contemporary-counterpoint-engine/` — counterpoint rules

### Key design patterns

**Deterministic generation:** All generation is seeded (same `seed` → identical output). Never use `Math.random()` directly.

**Receipts/Diagnostics:** Every generation emits `GenerationMetadata` with `{*Receipt, *Diagnostics, *Devices}` — this is the primary debugging interface. Preserve this pattern when adding new pipeline stages.

**Preset-driven:** 40+ presets control ensemble type, scoring rules, rhythm style. New composition modes go through presets, not new code paths.

**Guard pattern:** Multi-pass validation; "guards" at each pipeline stage prevent invalid harmony transitions. Don't skip guards to get output — fix the guard or the input.

**Test harness heap management:** The full test suite runs as 4 sequential Node processes (`runAllTestsChunk1–4`) each with `--max-old-space-size=4096`. Don't add expensive suites to chunks that are already near the memory limit.

## Documentation

- `docs/COMPOSER_OS_ARCHITECTURE.md` — system design + phase labels (A/B/C/D)
- `docs/COMPOSER_OS_ROADMAP.md` — strategic vision + past/current/future roadmap (canonical roadmap source)
- `docs/CHANGELOG.md` — detailed feature history, searchable by date/feature
- `docs/TEST_DEBT_COMPOSER_OS_V2.md` — test tier structure + known gaps
- `.cursor/rules/composer-os-roadmap-request.mdc` — when generating roadmap content, use canonical title format from `docs/COMPOSER_OS_ROADMAP.md`

## CI

`.github/workflows/test.yml` runs on push/PR to `main`: Python 3.11 + pytest for the Wayne Shorter engine. TypeScript tests are not in CI — run `npm run test:composer-smoke` locally before merging.

## Tool Preferences

When working on this project, use the right tool for each task:

- **Cursor** — all repo-specific tasks: audits, file reads, implementation, searches. Faster and more detailed with line numbers and code snippets.
- **Claude Code** — terminal execution outside the repo only: npm package research, global config, running standalone scripts.
- **Perplexity** — external research, library comparisons, current web knowledge, best practices.

Do not use Claude Code for file reading or repo audits — Cursor is significantly faster and more accurate for those tasks.
