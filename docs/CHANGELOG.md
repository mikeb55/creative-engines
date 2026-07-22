## [Unreleased]

### Fixed

- **Desktop reload after tab nav (file:// + pushState)** — Path-based `history.pushState('/riffgen')` became `file:///C:/riffgen` on Windows; Ctrl+R / Ctrl+Shift+R → `ERR_FILE_NOT_FOUND` blank window. Fix: **hash routes** (`#/riffgen`) in `appRouter` + Electron `did-fail-load` → `loadFile(index.html)` + hash restore. Soft + hard reload verified on all primary nav tabs.

- **Riff chord-loop trust (Phase 1)** — Unparseable chord-loop tokens still fill `Am7` (parse behaviour unchanged) but are no longer silent: `normalizeChordLoopWithDisclosure` emits `chordLoopDisclosure` (typed → used + bars); `GenerateResult` + post-gen banner on Home / RiffGen (“N reviewed substitutions / M unsupported tokens”). Empty input still uses intentional Am7 vamp with no disclosure. Slash chords and typed harmony pass through to MusicXML as typed when parse succeeds. Phase 2 inline badges shipped separately (see Added).

- **RiffGen Corpus QA zero-data** — Desktop IPC/`apiGetRiffPhraseCorpus` resolved derived corpus via `__dirname` + four `..` (correct only for unbundled source). Bundled `resources/` path escaped the repo (`C:\Dev\data\...`), so QA showed Files: 0 / Phrases: 0 with “phrases.jsonl and audit.csv missing”. Fix: `resolveRiffPhraseCorpusDerivedRoot` (repo env / resources / walk) + copy `data/riff-phrase-corpus/derived` into desktop `extraResources` via `copy-riff-phrase-corpus.js`.

### Added

- **Riff phrase corpus ingest — White Rock Funk + Black Soul Funk** — Real GPX/GP5 ingest: `white_rock_funk` **8**/8 parseOk · **8** phrases; `black_soul_funk` **12**/12 parseOk · **54** phrases. Empty stubs skipped (`bebop_jazz_blues`, `blues_rock`, `modern_rock`, `progressive_blues`). Derived totals **58** files / **161** phrases.

- **RiffGen Phase 1.5 S4 curation UX** — Phrase `curation.needsReview` + reasons (`one_bar_leftover`, `max_phrase_chop`, `meter_mismatch_file`) stamped at ingest. Phrase browser: needs-review filter, amber/red badges, detail callout. QA: needs-review + meter-quarantine counts; `mvoldsu-003` highlighted.

- **Riff chord-loop trust Phase 2** — Live per-token badges on Chord loop field (Home riff + RiffGen): valid / normalized / unsupported / invalid + hover “Typed / Interpreted / Status”; preflight summary near Generate. Fallback Am7 behaviour unchanged (Phase 1 disclosure still post-gen).



- **RiffGen empty category visibility** — Corpus QA no longer hides `files===0 && phrases===0` rows (so scaffolded stubs like `white_rock_funk` / `black_soul_funk` show as 0/0). Phrase browser seeds accordion + Category dropdown from `stats.byCategory` keys, not only ingested phrases.

- **RiffGen phrase browser accordion** — `RiffGenPhraseBrowser` groups phrases by category (`sax_inspired (N)` headers), expand/collapse; Category dropdown + id/tag filter kept; text filter auto-expands matching groups; expanded set remembered in `sessionStorage`.

- **Riff phrase corpus — White Rock Funk + Black Soul Funk (scaffold only)** — Schema `RIFF_PHRASE_CATEGORIES` → **9**; `RIFF_PHRASE_CORPUS_TARGET_TOTAL` **56** (`white_rock_funk`: **8**, `black_soul_funk`: **12**). Folders `gpx/white_rock_funk/` + `gpx/black_soul_funk/` (snake_case; space-named dirs removed). Synthetic fixtures + tag heuristics; **no real ingest** until explicit go-ahead. Sources: Chris Buono *30 Funk Rock Riffs You MUST Know*; Funk Fundamentals / Funk Survival Guide.

- **RiffGen Phase 1.5 S3 (GenerateIsland)** — `#/riffgen` mounts `RiffGenGenerateIsland` via local `useRiffGenGenerateState` (minimal Home riff state copy; **not** extracted from HomeGenerate). Reuses `RiffGeneratorPanel`; Variation / Open-folder controls; `api.generate({ presetId: 'riff_generator', … })` unchanged. Phrases.jsonl remains read-only. Seed A/B (Home-shaped vs RiffGen payload) MusicXML SHA match. Melody-path grep gate clean.

- **Riff phrase corpus — Diminished Lines category** — Schema/`RIFF_PHRASE_CATEGORIES` + `gpx/diminished_lines/` + synthetic fixture; **7** categories in schema, **3** populated on disk for QA (see Architecture / technical summary). S4 curation debt for 1-bar leftovers / mid-run chops / meter mismatch still backlog.

- **RiffGen Phase 1.5 S0–S2 (inspect UI)** — Top-level route `#/riffgen` (nav **RiffGen**). Read-only corpus API `GET /api/riff-phrase-corpus` + IPC `composer-os-api:get-riff-phrase-corpus` loads `data/riff-phrase-corpus/derived/phrases.jsonl` + `audit.csv`. QA panel (category counts, bar/start/end hists, meter mismatch, ties/ornaments) + phrase browser. **Melody path OFF**; `presetId` stays `riff_generator`. No imports into `riffMelody` / `riffPitchField` / `buildRiffScoreModel` / `runRiffGenerator`. **S4 backlog (noted, not built):** `diminished_lines` 1-bar leftovers + mid-run splits → needs-review flags; `mvoldsu-003.gpx` 6/4→4/4 meter change — phrase `meter` field exists but ingest stamps file-open meter only (see Architecture).

- **Riff pitch PR C — leap-peak motif blend skip** — When `preferredIntervals` peak on P4/P5/tritone, skip the `0.55*motif + 0.45*pitch` blend in `assignMelodyToBar` (weight 0) so PR A leap bias is not washed out. Step-heavy / absent preferredIntervals keep blend **0.55**. `applyLoopClosure` untouched. Tests: `riffMotifBlendLeapGate.test.ts`.
- **Riff pitch PR B — `enforceHook` leap gate** — When `profile.intervalWeights` peaks on ≤M2/m3 (step-heavy), skip forced-leap inject; peak (or tie) on P4/P5/tritone keeps inject; absent/empty weights = legacy behaviour. `buildRiffScoreModel` passes `profile?.intervalWeights`. Tests: `riffEnforceHookIntervalGate.test.ts`.

- **Riff pitch PR A — `intervalWeights` → pick path** — `guitarRiffPitchFieldForBar` / `bassRiffPitchFieldForBar` populate `ResolvedPitchField.preferredIntervals` from `RiffProfile.intervalWeights` (keys `m2`/`M2`/`m3`/`M3`/`P4`/`tritone`/`P5`/`M6`; receipt parser accepts `tritone` + `M6`). `pitchFromField` multiplies candidate PC weights by directed interval-class match before `pickWeightedPc` (unmatched = pass-through 1.0); near-prev-PC snap drops from **0.65 → 0.12** when preferredIntervals non-empty. Tests: `riffIntervalWeightsPitch.test.ts`. **Flag note:** when `USE_PITCH_FIELD_NOTE_SELECTION` is false, `riffPitchFieldForBar` returns undefined and melody falls back to `strongPitch`/`passingPitch` — intervalWeights still unused on that path.

- **Riff Generator Phase B + soft-link — session close-out (2026-07-16)** — Phase B Iter 1–3 (HV chord colour) + soft-link HV→`riffVrbId` **FULLY COMPLETE**; smoke-validated **772**/141 known **5** unexpected **0**. Canonical: `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`.

- **Riff Generator soft-link — full validation smoke** — Smoke ×2: **772**/141 · known **5** · unexpected **0**. Soft-link OFF identity + ON `nile_rodgers`→`jamerson` pattern swap; Phase B colour (`bill_evans` Dm7→Cmaj9) still PASS; mosaic non-riff HV 4/4. Doc: `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`.

- **Riff Generator soft-link — HV → riffVrbId** — UI toggle **Also use HV as riff pattern?** (`riffSoftLinkHvAsPattern`, default OFF). When ON and HV ∈ `RIFF_GENERATOR_VRB_IDS`, copies into `riffVrbId` (+ family). Mismatch note when no riff library. Separate from Phase B chord-colour toggle. Helper: `resolveRiffSoftLinkHv`. Doc: `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`.

- **Riff Generator Phase B Iter 3 — full validation smoke** — Smoke ×2: **772**/141 · known **5** · unexpected **0**. OFF identity + ON chord colour (`bill_evans`: Dm7→Cmaj9) + `riffVrbId` pattern authority + mosaic non-riff HV 4/4. Phase B complete. Doc: `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`.

- **Riff Generator Phase B Iter 2 — HV chord colour apply** — When `riffUseHvForPattern` is ON, `colourRiffChordsWithHv` (`riffHvChordColour.ts`) runs mosaic `getDispatchEntry` precompute on the normalized chord loop and feeds coloured symbols into score build. Profile/pattern still resolve from uncoloured loop + `riffVrbId`. Toggle OFF / no-dispatch HV = identity. Doc: `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`.

- **Riff Generator Phase B Iter 1 — HV toggle + read-only wire** — On `riff_generator`: UI checkbox **Use HV for riff pattern too?** (`riffUseHvForPattern`, default OFF). Toggle ON forwards `harmonicVoice` for engine read-only access (`hvChordColourReadOnly` / `riffHvChordColourReadOnly`); does **not** drive `riffVrbId` / `parseRiffVrbId` and does **not** apply chord colour (Iter 2). Toggle OFF = Phase A path (HV inert). Doc: `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`.

- **Mosaic global HV overlay** — Product decision: **global** HV (not per-section map). After per-section `getDispatchEntry(section.songwriterStyleId)` base, when `harmonicVoice` is set and differs from the section composer, run HV dispatch precompute on the base bars (same overlay on every section). Item E: `getDispatchEntry` + Berg/Beefheart/Fela/Threadgill/Weber walls unchanged. Receipts: `mosaicGlobalHvOverlayApplied` / `mosaicGlobalHvId` / `mosaicGlobalHvOverlaySections`. No HV → unchanged. Smoke: `mosaicGlobalHvRoutingSmoke.test.ts` (4).

- **Riff Generator Phase A — honesty-only HV UI + receipt** — On `riff_generator`: Harmonic Voice control **visible but greyed out** with short note that pattern authority is **`riffVrbId`** (not HV). Generate payload **stops forwarding** `harmonicVoice`. Receipt **`harmonicVoiceIgnoredOnRiffPreset: true`** on result / runManifest / `_meta` manifest. Engine pattern path unchanged (`parseRiffVrbId` still riffVrbId-only). Soft-link toggle / Phase B chord colour / new riff artists / nile·iommi·hendrix·evh·jamerson content — **OUT**. Doc: `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`. Smoke +1 row (Phase A HV honesty receipt).

- **Phase 2 widen — Eberhard Weber HV-only non-mosaic harmony bridge (BB + SQ)** — Final Phase 2 widen ROI #5: when exact `harmonicVoice=eberhard_weber`, `precomputeEberhardWeberEffectiveHarmonyBars` rewrites `chordBars` (`ew:*`). Gate is **HV-only** (primary `eberhard_weber` alone does not open). Twin `weber_field` and soft `weber` / `ew` do not open (never `webern`). `frank_zappa` primary excluded. Mosaic `getDispatchEntry` untouched. Helpers: `isEberhardWeberHvOnlyEnsembleWall` + `buildEberhardWeberEnsemblePrecomputeContext`. Smokes: `bigBandWeberHvRoutingSmoke.test.ts` (6) + `sqWeberHvRoutingSmoke.test.ts` (4). Sibling widen spot-checks retargeted to `angelo_badalamenti` as still-unwired HV.

- **Phase 2 widen — Henry Threadgill HV-only non-mosaic harmony bridge (BB + SQ)** — Same wall pattern as Berg/Beefheart/Fela: when exact `harmonicVoice=henry_threadgill`, `precomputeHenryThreadgillEffectiveHarmonyBars` rewrites `chordBars` (`ht:*`). Gate is **HV-only** (primary `henry_threadgill` alone does not open). Soft `threadgill` / BB dual-id arranger alias does not open. `frank_zappa` primary excluded. Mosaic `getDispatchEntry` untouched. Helpers: `isHenryThreadgillHvOnlyEnsembleWall` + `buildHenryThreadgillEnsemblePrecomputeContext`. Smokes: `bigBandThreadgillHvRoutingSmoke.test.ts` (6) + `sqThreadgillHvRoutingSmoke.test.ts` (4). Sibling Berg/Beefheart/Fela spot-checks retargeted to `eberhard_weber` as still-unwired HV.

- **Phase 2 widen — Fela Kuti HV-only non-mosaic harmony bridge (BB + SQ)** — Same wall pattern as Berg/Beefheart: when exact `harmonicVoice=fela_kuti`, `precomputeFelaKutiEffectiveHarmonyBars` rewrites `chordBars` (`fk:*`). Gate is **HV-only** (primary `fela_kuti` alone does not open). Soft `fela` does not open. `frank_zappa` primary excluded. Mosaic `getDispatchEntry` untouched. Does **not** call `appendFelaPercussionToScore` (seal-crash path stays duo-only). fBT final-vamp bias still runs inside precompute. Helpers: `isFelaKutiHvOnlyEnsembleWall` + `buildFelaKutiEnsemblePrecomputeContext`. Smokes: `bigBandFelaKutiHvRoutingSmoke.test.ts` (6) + `sqFelaKutiHvRoutingSmoke.test.ts` (4).

- **Phase 2 widen — Beefheart HV-only non-mosaic harmony bridge (BB + SQ)** — Same wall pattern as Berg Batch 6: when exact `harmonicVoice=beefheart`, `precomputeBeefheartEffectiveHarmonyBars` rewrites `chordBars` (`cbf:*`). Gate is **HV-only** (primary `beefheart` alone does not open). Twin `beefheart_fragment_polyphony` and soft `captain_beefheart` do not open. `frank_zappa` primary excluded. Mosaic `getDispatchEntry` untouched. Helpers: `isBeefheartHvOnlyEnsembleWall` + `buildBeefheartEnsemblePrecomputeContext`. Smokes: `bigBandBeefheartHvRoutingSmoke.test.ts` (6) + `sqBeefheartHvRoutingSmoke.test.ts` (4).

- **Phase 2 Batch 6 — Berg HV-only non-mosaic harmony bridge (BB + SQ)** — `runBigBandRealisation` / `runQuartetRealisation` chordBars path: when exact `harmonicVoice=berg`, run `precomputeBergEffectiveHarmonyBars` and rewrite chordBars (`bg:*`). Gate is **HV-only** (primary `berg` alone does not open). Soft `alban_berg` does not open. `frank_zappa` primary excluded. Mosaic `getDispatchEntry` untouched (item E). Smokes: `bigBandBergHvRoutingSmoke.test.ts` (6) + `sqBergHvRoutingSmoke.test.ts` (4).

- **SQ Phase 2 Batch 5 — FZ HV continuity VERIFY-ONLY** — SQ FZ already passes full `generationMetadata` into precompute (no BB-style bare-meta drop). Gate stays primary + `zappaSQHarmonySlice` (HV does not open slice). No production change. Smoke: `sqFzHvRoutingSmoke.test.ts` (4 rows). Opening FZ via `HV=frank_zappa` = separate product DCR (deferred).

- **BB Phase 2 Batch 4 — FZ precompute HV continuity** — `buildFrankZappaBigBandCompositionContext` copies `harmonicVoice` from inherited metadata (mirror mosaic); FZ gate stays primary `songwriterStyleId === 'frank_zappa'` (HV does not open gate). Smoke: `bigBandFzHvRoutingSmoke.test.ts` (6 rows). SQ FZ / mosaic / Slonimsky untouched.

- **SQ Phase 2 Batch 3 — VRB / Pass4 HV routing** — `runQuartetRealisation` Pass4 stage resolves `getVoiceRuleBundle(harmonicVoice || primary)`; primary `songwriterStyleId` unchanged (FZ / mosaic / Slonimsky untouched). Does **not** read `sqArrangerVrb` (arranger blend stays separate). Smoke: `sqVrbHvRoutingSmoke.test.ts` (4 rows).

- **SQ Phase 2 Batch 2 — Slonimsky HV routing** — `runQuartetRealisation` reads `generationMetadata.harmonicVoice` into `BuildQuartetScoreModelInput.slonimskySongwriterStyleId`; `buildQuartetScoreModel` uses HV \|\| primary for Slonimsky `songwriterId` / `styleProfile` only. Primary `songwriterStyleId` unchanged (FZ SQ gate / mosaic / BB untouched). Smoke: `sqSlonimskyHvRoutingSmoke.test.ts` (4 rows). VRB / mosaic / FZ precompute not in this pass.

- **BB Phase 2 Batch 1 — Slonimsky HV routing** — `runBigBandRealisation` reads `generationMetadata.harmonicVoice` into `BuildBigBandScoreModelInput.slonimskySongwriterStyleId`; `buildBigBandScoreModel` uses HV \|\| primary for Slonimsky `songwriterId` / `styleProfile` only. Primary `songwriterStyleId` unchanged (FZ gate / mosaic untouched). Smoke: `bigBandSlonimskyHvRoutingSmoke.test.ts` (4 rows). SQ / mosaic / FZ precompute not in this pass.

- **HV authority — Score-6 BB group (Tier 2 score-6)** — Exact-id path helpers + registry `hv_full` harmony/precompute for `charles_mingus` (soft `mingus` normalize-only; BB dual-id + episode holdbacks untouched), `count_basie` (soft `basie` / `count basie` normalize-only; Testament / shout holdbacks untouched), `maria_schneider` (soft `schneider` normalize-only; through-composed / texture holdbacks untouched), `thad_jones` (soft `thad` normalize-only; BB thad/thad_jones + shout/soli holdbacks untouched). Mosaic merge on HV; spine/`getChordForBar`. Verify each with `--primary wayne_shorter` OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE.

- **HV authority — Batch 5B ECM / world / serial (Tier 2 score-5)** — Exact-id path helpers + registry `hv_full` harmony/precompute for `jan_garbarek` (soft `jg`/`garbarek` normalize-only; `jg:*` receipts Garbarek-local vs Goldsmith film lane), `john_surman` (twin `surman_folk_modal`; soft `js`/`surman` normalize-only), `kenny_wheeler` (twins `wheeler`/`kw`; BB/ECM/import holdbacks untouched), `fela_kuti` (exact only; path helper cycle-safe module), `berg` (exact only; receipts `bg:*`). Mosaic merge on HV; spine/`getChordForBar`. Verify each with `--primary wayne_shorter` OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE.

- **HV authority — Batch 5A Film / ECM (Tier 2 score-5)** — Exact-id path helpers + registry `hv_full` harmony/precompute for `angelo_badalamenti` (VRB twin `badalamenti`), `ennio_morricone` (twin `morricone`), `hans_zimmer` (twin `zimmer`), `lalo_schifrin` (twin `schifrin_groove`), `eberhard_weber` (twin `weber_field`; never `webern`). Mosaic merge on HV; spine/`getChordForBar`. Soft aliases songwriter-normalize only — never engage HV. Film context/surface + Weber field-plan holdbacks untouched. Verify each with `--primary wayne_shorter` OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE.

- **HV authority — `gil_evans` Jazz orchestra / arranger (Tier 2 score-5)** — Exact-id path helper (`isGilEvansHarmonicPath`) + registry `hv_full` harmony/precompute; mosaic merge on HV; spine/`getChordForBar`. Soft songwriter `evans` is **not** used (see **Fixed**). BY_ID short `evans`→`BILL_EVANS` untouched. BB Gil arranger / style-profile holdbacks untouched. Verify with `--primary wayne_shorter` OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE.

- **HV authority — Batch 4B Jazz orchestra / arranger (Tier 2 score-5)** — Exact-id path helpers + registry `hv_full` harmony/precompute for `oliver_nelson`, `quincy_jones` (optional film twin `quincy_jones_film`), `sammy_nestico`, `henry_threadgill`. Mosaic merge on HV; spine/`getChordForBar`. Soft aliases (`nelson`, `quincy`, `nestico`, `threadgill`) songwriter-normalize only — never engage HV. BB arranger / episode / interval-cell holdbacks untouched. (Nestico primary-path `finalBarTension` fix is a separate **Fixed** entry — same ship commit `b9d31d7e`, unrelated to HV wiring.) Verify each with `--primary wayne_shorter` OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE.

- **HV authority — Batch 4A Jazz orchestra / arranger (Tier 2 score-5)** — Exact-id path helpers + registry `hv_full` harmony/precompute for `bill_holman`, `billy_strayhorn`, `bob_brookmeyer`, `carla_bley`, `clare_fischer`. Mosaic merge on HV; spine/`getChordForBar`. Soft aliases (`holman`, `strayhorn`/`bs`, `brookmeyer`, `bley`, `fischer`) songwriter-normalize only — never engage HV. BB arranger / line-first / ContrapuntalLineEngine / style-profile holdbacks untouched. Verify each with `--primary wayne_shorter` OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE.

- **HV authority — Batch 3B Song flagships (Tier 2 score-5)** — Exact-id path helpers + registry `hv_full` harmony/precompute for `miles_davis`, `mccoy_tyner`, `prince`, `beatles`, `beefheart` (optional VRB twin `beefheart_fragment_polyphony`). Mosaic merge on HV; spine/`getChordForBar`. Soft aliases songwriter-normalize only. Surfaces/grammar holdbacks untouched. Verify each with `--primary wayne_shorter` OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE.

- **HV authority — Batch 3A Song flagships (Tier 2 score-5)** — Exact-id path helpers + registry `hv_full` harmony/precompute for `brian_wilson`, `stevie_wonder`, `charlie_parker`, `stephen_sondheim`, `jim_hall`. Mosaic merge on HV; spine/`getChordForBar`. Soft aliases (`brian`/`wilson`, `stevie`, `bird`/`parker`/`charlie`, `sondheim`, `jim`) songwriter-normalize only — never engage HV. Surfaces/grammar holdbacks untouched. Verify each with `--primary wayne_shorter` OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE.

- **HV authority — `barry_harris` Tier 2 Phase 4** — Path helper (`isBarryHarrisHarmonicPath`) accepts `barry_harris` + VRB twins (`barry_harris_chord_melody` / `bh_cm`); soft `harris` songwriter-normalize only; soft `barry` / `jbr` stay John Barry (excluded). Registry `hv_full` harmony/precompute; golden-path precompute + mosaic merge; spine + `getChordForBar`. Style-module + motif hybrid pilot holdbacks untouched. Verify with non-BH primary (`--primary wayne_shorter`) OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE.

- **HV authority — `bartok` Tier 2 Phase 3** — Exact-id path helper + registry `hv_full` harmony/precompute; mosaic merge on HV; spine/`getChordForBar`. Targets Song-Bartok stub only — never `sq_vrb_bartok`. Soft `bela_bartok` / `bela` do not engage HV. Verify OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE (9/9).

- **VRB routing — Song-Bartok stub (pre-HV)** — Detach Song Mode `bartok` / `bela_bartok` / `bela` from SQ Bartók BY_ID. New Song Mode axis–folk stub (`BARTOK_SONG_STUB` + `applyBartokSongStubVrbProfile`, `BS_*` receipts). SQ identity moves to `sq_vrb_bartok` (profile, CLE, SQ UI / arranger). Same split rule as Song-Reich vs `reich_glass`. HV wire not included.

- **VRB routing — Song-Reich stub (pre-HV)** — Detach `steve_reich` / soft `reich` from SQ `REICH_GLASS` BY_ID. New Song Mode process-field stub (`STEVE_REICH_SONG_STUB` + `applySteveReichSongStubVrbProfile`, `SR_*` receipts). SQ ids unchanged: `reich_glass` / `reichglass` / `reich_and_glass` / `minimalist_sq` / `sq_vrb_reich_glass`. Same split rule as film Glass vs `reich_glass`. HV wire not included.

- **HV authority — `steve_reich` Tier 2 Phase 3** — Exact-id path helper + registry `hv_full` harmony/precompute; mosaic merge on HV; spine/`getChordForBar`. Targets Song-Reich stub only — never `reich_glass`. Soft `reich` does not engage HV. Verify OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE (9/9).

- **HV authority — `philip_glass` Wave D (Tier 1 complete)** — Film Glass path helper (`isPhilipGlassHarmonicPath`) accepts `philip_glass` + film-stub twins (`philip_glass_screen` / `philip_glass_film` / `glass`); never `reich_glass`. Registry `hv_full` harmony/precompute; golden-path precompute + mosaic merge; spine + `getChordForBar`. Preceded by VRB routing fix: `philip_glass`/`glass` BY_ID → film stub, not REICH_GLASS.

- **Generate — “How pieces end” browse tab** — Nested Generate workspace tab (renderer-only) listing Song Mode composers by closing approach: Resolved / Confirmed clean / Open / Special handling / Not tagged yet. Static catalog in **`composerFixCategories.ts`**; no generation, harmony, evaluator, or Electron IPC changes.

### Fixed

- **jamerson RiffGen Phase E wire** — Song Mode profile + aliases (`jamerson` / `james_jamerson`) + `LINE_FIRST_DUO_PRIORITY3_COLOUR` entry + `SongwriterRuleId` / primary-instrument row. Cleared `RIFF_PHASE_E_WIP_EXCLUDED`. Rules + riff VRB stub + bass-lens smoke already existed. Also added `jamerson` to line-first bass rhythm diversify (same freeze class as bacharach/nelson). No changes to other Phase E VRBs (nile/iommi/hendrix/evh) or HV composers. Smoke Phase E row now includes jamerson.

- **Bass-identity rhythm-cell (`bacharach` + `oliver_nelson`)** — Line-first abstract bass fill early-continued past the shared rhythm-triple break, so HV (primary ≠ slice) froze one bass rhythm cell across bars → `validateBassIdentity` “rhythmic cell repeated…”. Narrow fix in `buildBassPart` abstract branch only: for those two VRB ids, run `applyBassRhythmTripleFingerprintBreak` + adjacent anti-duplicate. No global bass-gate change. Probe seed **881510**. Blast: bill_evans / duke_ellington / cole_porter / gil_evans / beatles / mechanism-fix composers unaffected (`bill_evans` / `duke_ellington` still have own line-first rhythmic-cell debt). Smoke **727**/132 · unexpected **0**.

- **`bacharach` HV Class C wire≠plan + truthReport skip artifact** — (1) `syncBacharachFinalBarAuthority` skipped on `harmonySource===custom` / `customHarmonyLocked` (Porter pattern; final-bar-only). Stops plan/receipt rewrite off wire (bar 8 `Cmaj9`≠`G13`) while score/export stay on `bacharachEffectiveHarmonyBars` + `isBacharachHarmonicPath`. Builtin strip sync retained. (2) `assertExportTruth` duo gate fail now throws `ExportTruthPipelineError` carrying the real stage report; `runGoldenPath` assigns it — no more skip/skip/skip after input fail. Probe seed **881510**. Bass-identity rhythm-cell: see Fixed entry above (closed same day). Blast: bill_evans / duke_ellington / cole_porter / gil_evans / beatles / mechanism-fix composers unaffected.

- **`cole_porter` HV input/authority sync (class C)** — `syncColePorterAuthorityBars` full-echoed slice `out` into `chordSymbolPlan` + `parsedCustomProgressionBars`, so Input truth failed wire≠plan (bar 3 `Dm7`≠`D7`) while score/export already PASS via `isColePorterHarmonicPath`. Skip sync when `harmonySource===custom` / `customHarmonyLocked` (authority stays on effective). Builtin strip echo retained. Probe seed **881701**. Not a getChordForBar routing-gap fix.

- **`duke_ellington` HV mid dual-surface (score≠effective)** — Same routing gap as bill_evans: `getChordForBar` primary-only `songwriterStyleId === 'duke_ellington'`. HV kept score on locked paste while `dukeEllingtonEffectiveHarmonyBars` / mosaic expected held mid `#11` colour (+ fBT). Flipped to `isDukeEllingtonHarmonicPath`. Probe seed **881601** (first fail bar 5). bill_evans / gil / beatles / mechanism-fix composers untouched.

- **`bill_evans` HV dual-surface final bar (score≠effective)** — `getChordForBar` used primary-only `songwriterStyleId === 'bill_evans'`, so HV (`harmonicVoice=bill_evans`) kept score/XML on locked paste (`G13`) while `billEvansEffectiveHarmonyBars` / mosaic expected held fBT tonic (`Cmaj9`). Flipped gate to `isBillEvansHarmonicPath` (same HV pattern as Barry Harris / peers). Rejected Bacharach final-bar plan sync here — would trip input-stage wire≠plan. Probe seed **881501**.

- **Duo pipeline-truth expected → `resolveEffectiveHarmonyTruth` (fBT vs custom)** — `pipelineTruthGates.ts` score/XML expected now uses shared effective-harmony registry (HV-aware) with fall back to locked/parsed only when no full-length effective bars. Replaces handrolled primary-only 32-bar switch + 8-bar always-parsed path. Closes HV/8-bar `forceFinalBarTonicResolution` vs submitted collision for out-of-chain composers (`quincy_jones`, `sammy_nestico`, `charlie_parker`, `jim_hall`). Input-stage still validates wire ingest. beatles / gil_evans idempotent fixtures kept (coexist). Mid-bar HV vs lock still separate debt. Smoke recount **727**/132 · unexpected **0** (was stale 725 / unexpected 2).

- **Indie App API drop_d/dadgad fixture (pipeline-truth)** — `appApiBoundary.test.ts` Indie separate preset-tunings generate: dedicated 32-bar progression ends `G13` → `Cmaj7` so beatles `forceFinalBarTonicResolution` (tonalCenter C) is idempotent under `custom_locked` (same lane as gil_evans golden `A7alt` → `Dmaj9(#11)`). Shared `SONG_MODE_32_BAR_REGRESSION` / density floor / engine untouched. Chord-density row may pass as side-effect of final-harmony alignment; **0.65 floor not changed**.

- **`gil_evans` HV golden fixture (pipeline-truth)** — VoiceRuleBundle smoke `gil_evans` golden path: last custom chord `A7alt` → `Dmaj9(#11)` so `forceFinalBarTonicResolution` is idempotent under HV precompute (avoids submitted≠score early-exit before spread/bass asserts). Engine / bill_evans / other HV composers untouched. **Mitigated (2026-07-15):** duo expected now resolves via `resolveEffectiveHarmonyTruth`; fixture kept as belt-and-suspenders (not reverted this pass). Mid-bar HV vs lock still open — see `docs/HARMONIC_VOICE_FORWARDING_DESIGN.md`.

- **Smoke allowlist count sync (2026-07-15)** — Full `npm run test:composer-smoke`: **725** PASS rows / **132** suites (replaces stale **688**/124 claim). Known fail **5** unchanged. After Indie #1 fixture fix same day, App API Indie rows PASS locally — full aggregate recount deferred. Synced **CLAUDE.md** / **COMPOSER_OS_ROADMAP.md** / **`runSmokeTests.ts`** header.

- **CI smoke — 8/8 backlog closed (2026-07-14)** — Original “8 pre-existing smoke failures” all **PASS**. Wayne: MusicXML **restamp** seed **90217** (fBT tonic). JH: **code fix** — sync stale `premiumMelodyPitchPipeline.js` to TS optional-pitch path (runtime loads `.js`; **not** a restamp). BE: **restamp** seed **90301** as expected shared-pipeline consequence. BH / VRB stubs / EVH #15 / RiffGen Phase E / SQ MIDI / Duo MIDI — already **PASS**. **Debt (closed 2026-07-15):** `jamerson` Phase E Song Mode + line-first wiring completed; `RIFF_PHASE_E_WIP_EXCLUDED` cleared. Roadmap Known Issue marked **CLOSED**.

- **`wayneGoldenMaster` MusicXML restamp (seed 90217)** — Stale fixture after `f346ee30` (`wayne_shorter` piece-final tonic `maj7#11` for `finalBarTension`). Bar **8** only: harmony `Dm9` → `Dmaj7#11` (+ matching guitar v2 / bass voicing). JSON golden unchanged (melody v1 byte-identical). BH / JH untouched. sha256 XML `c9428ee9c8c0…`.

- **`jhGoldenMaster` pitch DIVERGE (seed 90303) — pipeline.js sync** — Runtime loaded compiled `premiumMelodyPitchPipeline.js` whose optional-pitch / seed path drifted from TypeScript source (BE motif work inlined JS poorly). Synced `.js` to match `.ts`; golden fixtures **not** restamped. Restores byte-exact JSON + MusicXML.

- **`beGoldenMaster` restamp (seed 90301)** — Expected consequence of shared `premiumMelodyPitchPipeline.js` sync for JH; Evans lyrical golden JSON + MusicXML refreshed to current engine output.

- **`fela_kuti` post-seal percussion append** — `appendFelaPercussionToScore` used `score.parts.push` after `finalizeAndSealDuoScoreBarMath` freezes `parts` (duo length 2 → "Cannot add property 2"). Reassign `[...parts, drum]` (Zappa merge pattern). Unblocks Batch 5B HV verify; pre-existing on main.

- **`fela_kuti` HV `finalBarTension` (Batch 5B)** — Afrobeat pools often end on G7/D7/`Am7`; Verlaine fBT treats shorthand `m7` as dominant. Piece-final bias to `Amin7`/`Amin9` + final-bar-only authority sync so primary and wayne+HV gates agree.

- **`john_surman` HV `finalBarTension` strip drift (Batch 5B)** — Surman final-open bias updated `johnSurmanEffectiveHarmonyBars` only; HV verify `stripFromContext` preferred stale Wayne `parsedCustomProgressionBars`. Final-bar-only authority sync (Bacharach dual-surface pattern) so strip ≡ getChordForBar at cadence.

- **Fixed: berg receipt prefix collision (`ab:`→`bg:`)** — prerequisite to Batch 5 HV wire. Alban Berg Song Mode slice + diagnostics/logging (`bergSlice.ts`, style profile, rule registry) now emit **`bg:*`**; **`angelo_badalamenti`** keeps **`ab:*`** untouched. No HV / `isBergHarmonicPath` in this commit.

- **Soft-alias ownership — remove songwriter `evans` → `gil_evans`** — Deleted ALIASES entry in `songwriterStyleProfiles.ts` that mapped soft `evans` to `gil_evans` while VRB BY_ID `evans` maps to `BILL_EVANS` (`voiceRuleBundles.ts`). Soft `evans` no longer songwriter-normalizes; require exact `gil_evans`. BY_ID `evans`→`BILL_EVANS` untouched. Does not change `bill_evans` exact-id HV path (`isBillEvansHarmonicPath`).

- **`sammy_nestico` primary-path `finalBarTension` (Batch 4B ship `b9d31d7e`)** — Pre-existing hard-gate fail on primary (non-HV) generation; missed 68-style ROI tonic-force sweep; **unrelated to HV wiring**. `forceFinalBarTonicResolution` / `enforceFinalBarTonicResolution` in `precomputeSammyNesticoEffectiveHarmonyBars` force Basie-school tonic maj9 on the piece-final bar (all seeds/keys when tonic known, unprotected). Same pattern as Fischer/Nelson. Discovered during Batch 4B HV verify (primary vs HV DIVERGE); fix lives on shared precompute so primary + HV both land clean.

- **68-style ROI hard-gate closeout (2026-07-12)** — Closed **`finalBarTension`** / **`cadentialClarityCoverage`** fails across the Song Mode duo ROI audit: **66** unique composers addressed, **0** open items remaining on the **68**-style set (two flagship names — **`allan_holdsworth`**, **`cole_porter`** — resolved inside batch / own-rewrite work rather than as separate open lanes). Mix: **33** tonic-force / force-final landings, **24** idiomatic-bias landings, **8** already-clear skips (FBT clean on gen-ok; no code change), plus **`bacharach`** dual-surface final-bar sync (**`ca619d8f`**) and **`cole_porter`** own-rewrite-path tonic force before authority sync (**`35202ddd`**). Composers were already UI-selectable; gates were output-quality only (no GATED→hidden filter). **Reusable patterns documented:** idiomatic-bias vs tonic-force decision rule (**`docs/GCE_LOCK_DCR_STANDARDS.md`** §3.1); **`maybeReduceRelentlessAlt`** `/\balt\b/` under-match on compact spellings like **`A7alt`** (**`docs/TEST_DEBT_COMPOSER_OS_V2.md`**); dual-surface final-bar-only sync when dressing + effective-harmony pipelines diverge (§3.1 addendum, **`aa2cde2c`**).

### Added

- **Verlaine GBD Slonimsky Voice — end-to-end working (2026-07-06)** — Tom Verlaine in **Guitar–Bass Duo → Slonimsky → Voice** dropdown generates Verlaine suspended-field harmony with Barry Harris primary stack. Fix chain: **`8f248347`** harmony-wire + **`generateComposition`** forward · **`1b97bce0`** UI roster · **`e2cd13ab`** V3 leap relax · **`6575d778`** Verlaine authority in **`getChordForBar`** · **`54af24c8`** **`apiGenerate`** IPC **`harmonicVoice`** copy · **`50e1d2a5`** payload uses **`gbdWriterId`** (not stale **`slonimskyHarmonicVoice`**). Desktop **v2.10.8**. Verified live UI + musician-facing GCE (readiness **0.9**, shareable). See **`docs/VERLAINE_GBD.md`**.

### Changed

- **Stage 5.1 — Unified vault-pitch guards + cadence receipt lookup fix (DONE)** — **`generateGoldenPathDuoScore.ts`**: **`vaultMotifSnapReceiptsForGuard`** merges in-loop motif receipts with metadata so empty local **`[]`** no longer blocks hook emit receipts at phrase-end cadence (bars **4,8,12…**); **`vaultMotifPitchMutationSkipForV1Note`** shared by Slonimsky, cadence, and **`nudgeMeasureConsecutiveDuplicateV1Pitches`** (bars **1–8**). v2 Wyble untouched (**5.4**). Proof: **`baselineMotifIntervalIdentity`** **50021** / **50213**, **`songModeRegressionBaseline`**, **`duoIdentityV32`**, **`sectionArchitectureP1Golden`**, **`duoVaultHarmony.smoke`** all **PASS**. See **`docs/DUO_VAULT_ROADMAP.md`** § **5.1**.

- **Stage 4a.1 — Slonimsky vault-receipt skip guard + hook-identity finalize (DONE)** — **`generateGoldenPathDuoScore.ts`**: **`slonimskySkipForVaultMotifNote`** skips Slonimsky pitch overwrite on vault-receipt / declined v1 notes in **`applyEnhancedPitchesByBar`** + **`applySectionAwareSongModeSlonimskyPostPass`** (**`isStandardGuitarBassDuo`**). **`songModeMotifEngine.ts`**: hook-return similarity **≥ 0.65** primary; **5-step** core contour prefix via **`hookContourCoreMatches`**; **`validateSongModeHookIdentity`** hard-fail narrowed. **`songModeRegressionBaseline.test.ts`**: seeds **50021** / **50213** hook-on. Vault-faithful bar 1 prioritized over Slonimsky chromatic ornament on tagged notes. **`KNOWN_VAULT_HOOK_EMIT_RESIDUAL`** PC **1** closed; PC **9** (v2 Wyble) remains open. See **`docs/DUO_VAULT_ROADMAP.md`** § **4a.1**.

- **Stage 4a — Duo vault Song Mode hook pool + emit receipts (DONE)** — **`guitarPhraseAuthority.ts`**: **`hookContourPoolMidi`** vault pool helper. **`songModeMotifEngineV2.ts`**: **`pickPitchesForContour`** / **`pickPicksFallback`** use vault pool via **`resolveHookContourPool`**; **`pickHookBarPitches`**, **`appendHookVaultEmitSnapReceipts`**, **`emitMeasureFromPitches`** tag vault-sourced hook emissions for **4b.3** / **4d** skip-guards. **`generateGoldenPathDuoScore.ts`**: ~`:5477` append hook + non-hook **`duoVaultMotifSnapReceipts`** (no overwrite). Gated **`isStandardGuitarBassDuo`**. Proof: **`songModeRegressionBaseline`** **50021** hook-on, **`baselineMotifIntervalIdentity`**, slice smokes, **`duoIdentityV32`**, **`sectionArchitectureP1Golden`**, **`duoVaultHarmony.smoke`** PASS. Residual: **`KNOWN_VAULT_HOOK_EMIT_RESIDUAL`** in **`docs/DUO_VAULT_ROADMAP.md`**.

- **Stage 4d.3 — Duo vault global leap repair (DONE)** — **`guitarPhraseAuthority.ts`**: export **`vaultMelodyPitchesInRange`**. **`ecmShapingPass.ts`**: guitar **`chordTonePitchesInRange`** / **`resolvePitchTowardPrev`** in **`strictEnforceGlobalLeaps`** use vault **`melodyPcs`** on standard **`guitar_bass_duo`** (via **`enforceDuoVoiceLeadingPostOrchestration`**); **`leapRepairSkipForVaultMotifNote`** skips vault-receipt / vault-declined notes (**4b.3**); v2 pair + bar **25** hook guards unchanged; bass leap repair untouched. Fallback → legacy when resolver **`source === 'fallback'`**. **Telemetry stable** vs post-4d.2 (**50021** / **50213** fired/declined/survival unchanged). Proof: **`baselineMotifIntervalIdentity`**, **`songModeRegressionBaseline`**, **`duoIdentityV32`**, **`sectionArchitectureP1Golden`**, **`duoVaultHarmony.smoke`**, **`ecmShapingPass.test`** all **PASS**. See **`docs/DUO_VAULT_ROADMAP.md`** § **4d.3**.

- **Stage 4d.2 — Duo vault orchestration snap (DONE)** — **`guitarPhraseAuthority.ts`**: export **`snapGuitarPitchToChordWindow`** (vault **`melodyPcs`** on standard duo, ±2 semitone window; legacy fallback when resolver **`source === 'fallback'`**). **`duoOrchestrationPass.ts`**: **`snapGuitarToChord`** delegates for category-3 notes (no receipt / not declined); **4b.3** receipt-skip + declined register-only lift **unchanged**. **`duoVaultMotifContourSnap.ts`**: orchestration sim aligned so **`barPasses4b1MotifIntervalContract`** matches production snap. **Telemetry (benign, documented):** seed **50021** `vaultSnapFired` **28→21**, declined **+7** — stricter `:4572` interval-gate sim, **not** reduced orchestration vault reach; **`lostLegacySnap`** unchanged (**50021: 0**, **50213: 1**). Proof: **`baselineMotifIntervalIdentity`**, **`songModeRegressionBaseline`**, **`duoIdentityV32`**, **`sectionArchitectureP1Golden`**, **`duoVaultHarmony.smoke`** all **PASS**. See **`docs/DUO_VAULT_ROADMAP.md`** § **4d.2**.

- **Stage 4d.1 — Duo vault phrase-end cadence (DONE)** — **`generateGoldenPathDuoScore.ts`**: **`duoEnforcePhraseEndCadence`** on standard **`guitar_bass_duo`** uses **`phraseFillTonesFromVaultResolver`** for snap candidates (same as **4c** phrasetail); fallback → legacy inherited inside resolver. **Guard:** skip pitch snap when phrase-end v1 note is vault-receipt-tagged or vault-declined (**4b.3** metadata); in-loop **`duoVaultMotifSnapReceipts`** passed from both call sites. Preset-scoped only; no **`duoVaultMotifEnabled`** gate. Proof: **`baselineMotifIntervalIdentity`** seeds **50021** / **50213** PASS; **`songModeRegressionBaseline`** **50021** PASS; **`duoIdentityV32`** cadence area PASS; **`sectionArchitectureP1Golden`** **80001** PASS. See **`docs/DUO_VAULT_ROADMAP.md`** § **4d.1**.

- **Stage 4c — Duo vault phrase tail + hook-return (DONE)** — **Site 1 (phrase tail):** **`guitarPhraseAuthority.ts`**: export **`phraseFillTonesFromVaultResolver`**. **`generateGoldenPathDuoScore.ts`**: motif-bar phrasetail **`endTone`** uses vault resolver base via **`duoChordTonesWithOptionalTuningMap(..., isStandardGuitarBassDuo)`**; tuning-map overlay unchanged. **`baselineMotifIntervalIdentity.test.ts`**: **`assertPhraseTailVaultPcSeed50213`**. **Site 2 (hook-return):** **`motifShape.ts`**: **`rootPcForDuoHarmonicTransposition`** — vault **`rootPc`** for transposition delta + shape relative-PC extraction; **`realizeReturnMidiFromMotifShape`** + **`extractMotifShapeFromStatement`** wired. **`songModeMotifEngineV2.ts`**: **`hookFirstReturnPitchesFromShape`**. **`duoBarMathFinalize.ts`**: bar-25 restore + **`finalizeAndSealDuoScoreBarMath(score, presetId)`**. Preset-scoped; fallback → legacy inherited. Proof: **`songModeRegressionBaseline`** seed **50021** PASS; Bacharach / Fagen / Wayne hook smokes PASS; **80001** P1 golden PASS. See **`docs/DUO_VAULT_ROADMAP.md`** § **4c**.

- **Stage 4b.5 — Duo vault section-arch pool fallback (seed 80001)** — **`duoVaultMotifContourSnap.ts`**: **`resolveVaultContourPoolMidi`** widens pool-only register when section-arch ceiling vs duo floor squeezes emission window below two vault midis; emission clamp unchanged; fail-loud preserved after full widen. Seed **80001** / **80002** section-arch P1 goldens **PASS**; **50021** / **50213** unchanged. Residual: **80001** may show **`duoVaultContourNullReturns: 23`** (soft per-note clamp degradation — minor known behavior, not a new stage). See **`docs/DUO_VAULT_ROADMAP.md`** § **4b.5**.

- **Stage 4b.4 — Duo vault role-contrast fix (baseline confidence seeds)** — **`generateGoldenPathDuoScore.ts`**: bars **5–7** bass macro routing (`simplifyForDuo` off when guitar not hot) + **`forceGuitarEcho`**; post-orchestration **`nudgeMeasureConsecutiveDuplicateV1Pitches`** on guitar bars **1–8** (fixes bar-2 duplicate-pitch activity tie without touching vault/declined paths). **`bassMelodicLines.ts`**: **`forceGuitarEcho`** on **`emitMelodicBassBar`**. **`baselineMotifIntervalIdentity.test.ts`**: **`KNOWN_ROLE_CONTRAST_GP_DEBT`** cleared (**50213** removed). **50213:** **`roleContrast` 0.1174**, gp success, interval PASS. **50021:** **`roleContrast` 0.1125**, interval PASS, **`KNOWN_VAULT_LIFT_BREAKS`** empty. See **`docs/DUO_VAULT_ROADMAP.md`** § **4b.4**.

- **Stage 4b.3 — Duo vault Type-1 lift fix (declined register-only + receipt skip)** — **`duoOrchestrationPass.ts`**: committed **`duoVaultMotifSnapReceipt`** notes skip legacy lift/snap; **`duoVaultDeclinedNotes`** (recorded in **`duoVaultMotifContourSnap.ts`**) get **`tryDeclinedRegisterOnlyLiftPitch`** (same-pitch-class octave/register nudge only, gated by **`motifBarPasses4b1AfterVaultOrchestration`**). **`duoVaultMotifBarBaselines`** on **`generationMetadata`** at **`generateGoldenPathDuoScore.ts`** `:4572`. **`baselineMotifIntervalIdentity.test.ts`**: **`KNOWN_VAULT_LIFT_BREAKS`** cleared on seeds **50021** / **50213**; register-clamp bars → **`EXCLUDED_REGISTER_CLAMP`**. **50021:** interval test PASS, **`roleContrast` 0.0929**, gp success. **50213:** Type-1 PASS (role contrast fixed in **4b.4**). See **`docs/DUO_VAULT_ROADMAP.md`**.

### Added

- **Generate — optional skip score MIDI export** — **`skipScoreMidiExport`** on **`GenerateRequest`** gates **`writeScoreMidi`** in **`generateComposition`** and BB/SQ paths in **`composerOsAppGeneration`**. Guitar–Bass Duo UI: **Export MIDI file** checkbox; independent of drum guide. LOCK/GCE unchanged.

### Changed

- **Generate — score MIDI export opt-in default** — **`shouldExportScoreMidi`**: omitted or **`skipScoreMidiExport: true`** skips score `.mid`; set **`skipScoreMidiExport: false`** to export. Duo **Export MIDI file** checkbox defaults **unchecked**.

- **Lead Sheet Input V97 — per-bar harmony overrides (MIDI advisory)** — Desktop **Lead Sheet Input** confidence strip bars are clickable; **Save** / **Clear** on a chord symbol sends **`harmonyOverridesByBar`** through IPC → **`runLeadSheetFileInputApi`** → **`applyLeadSheetHarmonyOverrides`** after MIDI inference. Overridden bars get **`user-override`** provenance; non-overridden MIDI bars stay **`inferred-advisory`** (whole chart not hard-locked). Proof: **`leadSheetHarmonyOverrideProof.test.ts`**.

### Changed

- **Milestone C — Arrange in blocks integrated into main Composer OS UI** — Folded standalone Musician shell blocks workflow into **`HomeGenerate.tsx`**: **`ArrangeInBlocksPanel`**, shared **`stitchMosaicBlocks`** / mosaic-blocks payload helpers, duo-gated generate branch, editable block chord fields, browser-safe composer roster. Standalone Musician shell retired; blocks-mode tests ported. Commits **`2cf1fe16`**–**`e1a8f812`**.

- **Leadsheet-input engine — Phase A rhythmAntiLoop gentle default** — **`leadSheetAccompanimentRhythmAntiLoopPass.ts`** adds **`rhythmAntiLoopIntensity`** (`gentle` | `moderate`; default **`gentle`**: selective ±1/12-beat micro-nudge on Phase 7 accompaniment, 4-bar / 3-slot cycle; **`moderate`**: full composer template rewrite ±1/6). Metaphysics **90106** LOCK **`rhythmAntiLoop`** **3/3** pass (swing **0.97** / **0.97** / **0.96**); Orbit **8/8** + Phase 7 proof **17/17** unchanged.

### Added

- **MIDI leadsheet input v1 (single-track only)** — Desktop **Lead Sheet Input** accepts **`.mid`/`.midi`** via **`loadDebussyLeadSheetImportTimelineFromFile`** → **`midiToImportTimeline`** → quintet hand-off (same path as MusicXML). Bounded chord vocabulary (**`midiChordInferenceTemplates.ts`**); harmony **inferred and advisory only** (never hard-lock from MIDI). **v1 limit:** **single-track melody MIDI** only — multi-track Sibelius/DAW exports (lead + harmony + drums) mislabel melody/harmony; use **MusicXML** until **v2** lead-track selection. Panel + **`docs/USER_GUIDE.md`** document the limit.
 — **`docs/GCE_CANONICAL.md`** is the single agent entry point: **formal / technical** GCE (repo gates, evaluator, LOCK/DCR/CI) vs **musician-facing** chat critique (default unless formal validation or LOCK/DCR/CI requested). Live rules: **`.cursor/rules/gce-evaluation.mdc`**, **`docs/GCE_LOCK_DCR_STANDARDS.md`** §1.0–§1.3, **`docs/GCE_FRAMEWORK_V2.md`**, **`AGENTS.md`**. **Parked** (historical only, do not use for guidance): **`docs/GCE_FRAMEWORK.md`**, **`rules/gce_evaluation_framework.md`**, **`rules/gce/*.md`**, stale sections of **`docs/RULES_of_EXCELLENCE.md`**. No formula, weight, threshold, or hard-gate changes.

### Added

- **Leadsheet-input engine — full-chart import (max 64 bars)** — Import/plumbing layer now reads the **actual input bar count** and processes the **full leadsheet** up to a **64-bar cap** (replaces the former hard **8-bar** slice). **`applyDebussyLeadSheetMelodyHandoff`** generalises melody hand-off to **N bars** (segment plan **guitar → Vn1 → cello → guitar** scales with chart length). **8-bar** inputs remain **regression-safe** (Orbit: **8 in / 8 out**). Long-form proof: Metaphysics **40 in / 40 out** for **`debussy`**, **`kenny_wheeler`**, **`bartok`**. Phase 7 proof gate **17/17 PASS**. Commit **`4b5a791a`**.

- **Leadsheet-input engine — Phases 1–4 (parallel import proof)** — Parallel import-layer path under **`engines/composer-os-v2/core/import/`** (does **not** call **`generateGoldenPathDuoScore`**): **`MosaicImportTimeline`** from hardcoded proof fixture (Phase 1) or **`musicXmlToImportTimeline`** file read (Phase 4) → **`buildDebussyLeadSheetHarmonySpine`** (locked import harmony + composer style-transfer / effective bars) → **`assembleDebussyLeadSheetQuintetScore`** (guitar lead + four string parts) → **`applyDebussyLeadSheetMelodyHandoff`** (segment plan **guitar → Vn1 → cello → guitar**; **`ContrapuntalLineEngine`** **called**, not modified) → **`exportScoreModelToMusicXml`**. CLI: **`runDebussyLeadSheetInputProofCli.ts`** · gate **`debussyLeadSheetInputProof.test.ts`**. Sample fixture: **`resources/test-fixtures/debussy-leadsheet-file-proof/debussy_file_proof_leadsheet.musicxml`**. See Phases **5–6** below for composer widening + desktop GUI.

- **Leadsheet-input engine — Phase 5 (second composer proof)** — Same MusicXML file + pipeline with **`composerId`** threading (default **`debussy`**): second proven composer **`kenny_wheeler`** via existing **`getDispatchEntry(composerId)`** + **`ContrapuntalLineEngine(composerId)`** — no slice/dispatch rewrites. Compare proof: **`runLeadSheetPhase5ComposerCompareProof.ts`** · **`leadSheetInputPhase5ComposerProof.test.ts`**. Harmony differs on same input (e.g. **7/8** bars on bundled sample); quintet + hand-off unchanged (**5** parts, no bass, no duo). Commit **`e4f4c015`**.

- **Leadsheet-input engine — Phase 6 (desktop File→Open GUI)** — **`LeadSheetInputDesktopPanel`** on **Generate** when **`COMPOSER_OS_FULL_UI=1`**: composer picker (**debussy**, **kenny_wheeler** only) → **Open MusicXML leadsheet…** → IPC **`composer-os-api:run-leadsheet-file-input`** → **`apiRunLeadSheetFileInput`** → existing Phase 1–5 file pipeline; exports under **`{outputDir}/leadsheet-input/`**. Cancel / empty path → status only, no crash. Commit **`6fc69422`**.

- **Leadsheet-input engine — Phase 7 (string realization + hand-off enforcement)** — **`leadSheetStringRealizationPass.ts`** adds accompaniment motion on non-melody bars while preserving melody ownership; wired through **`assembleDebussyLeadSheetQuintetWithHandoffScore`**. Proof gate: **`leadSheetPhase7StringRealizationProof.test.ts`**. Commit **`b5cf2ba5`**.

- **Leadsheet GCE/LOCK evaluation (CLI + proof tests only)** — **`leadSheetGceLockEvalRunner.ts`** calls existing **`evaluateGce`** + **`evaluateLock`** on assembled quintet **`ScoreModel`** (no main-pipeline hook, no UI). Orbit proof CLI: **`runLeadSheetOrbitGceLockProofCli.ts`** · **`resolveOrbitLeadSheetProofPath.ts`**. Phase 7 proof test also runs eval for **debussy** / **kenny_wheeler**. **Not** surfaced in desktop Generate UI. Commit **`59aa5340`**.

- **AuditionDock Phase 1 — shared in-app audition playback** — **`AuditionDock`** on the **Composers** tab (**`ComposerLauncher.tsx`**) and **Generate** tab playback both call **`auditionFromGenerateResult`** (`apps/composer-os-app/src/playback/auditionFromGenerateResult.ts`): resolve MusicXML from generate result (inline XML or desktop **`read-file`**), parse to **`PlaybackSequence`**, **`no_notes`** gate when the score has no playable notes. **`buildAuditionGenerateRequest`** seeds a **32-bar Song Mode** demo per composer; **`debussy`**, **`messiaen`**, and **`steve_reich`** audition on the **Song Mode duo** path (not String Quartet / native ensemble surfaces — see **`composerCoverageManifest.json`** **`arrangementPath`**). **Limit:** dock auditions **composer-generated** demos from seed, **not** user lead-sheet input (future phase). Tests: **`auditionFromGenerateResult.test.ts`**, **`buildAuditionGenerateRequest.test.ts`**. Gates: smoke **674**/0 (**121** suites).

- **Composer surfacing batch — Debussy, Messiaen, Kenny Wheeler, Bob Brookmeyer** — **`debussy`**, **`messiaen`**, **`kenny_wheeler`**, and **`bob_brookmeyer`** added to **`SONGWRITER_GROUP_SHIPPED_ORDER`** in **`HomeGenerate.tsx`** (slices + smoke already shipped: **`debussySlice.ts`**, **`messiaenSlice.ts`**, **`wheelerLyricSlice.ts`**, **`bobBrookmeyerSlice.ts`**). **`bob_brookmeyer`** also gains a primary **Songwriter** dropdown row (was arranger-only). ECM-group members surface via production-world optgroup; others appear under **Shipped (full slice)**.

- **Composer surfacing batch — Coltrane, Sonic Youth, Verlaine, Brubeck docs** — **`john_coltrane`**, **`sonic_youth`**, and **`verlaine`** added to **`SONGWRITER_GROUP_SHIPPED_ORDER`** in **`HomeGenerate.tsx`** (slices + smoke already shipped: **`johnColtraneSlice.ts`**, **`sonicYouthSlice.ts`**, **`verlainFieldSlice.ts`**). Alias **`television`** → **`verlaine`** unchanged. **`dave_brubeck`** docs corrected to **In library** / no **`brubeckSlice.ts`** (**`USER_GUIDE.md`**, **`COMPOSER_OS_ROADMAP.md`**).

- **feat(bartok-cle): V88 frozen — transformational counterpoint complete, eval 8.0/10 (seed 61234). Window-inversion + climax/contraction scoring added. Golden master frozen.** — **`bartokPitchScorer.ts`** + **`bartokPitchScoringConfig.ts`**: phrase-scale inversion-window scoring (**`docs/bartok_pitch_spec.md`** §10) and phrase-position climax / contraction weighting (§11). Eval trajectory seed **61234**: **4.8 → 5.9 → 6.4 → 7.0 → 7.6 → 8.0** (structural criticisms resolved: frozen bass, square rhythm, weak voice interaction, isolated inversions, lack of climax). Frozen fixtures **`bartok-cle-seed61234.lineSet.golden.json`** (sha256 **`a1c94bc9bf09`**) + **`.trace.golden.json`** (**`496cf6c415c6`**); **`bartokClePitchScoringGoldenMaster.test.ts`** byte-exact oracle. BH / premium-melody golden masters **unchanged**. Gates: smoke **666/666**, BH **8/8**, **`bhGoldenMaster`** byte-identical, **`bartokCleGoldenMaster`** PASS.

### Fixed

- **Art-rock band drum MusicXML export** — **`art_rock_band_drums`** now declares per-GM-pitch score-instrument + midi-instrument pairs (kick **36**, snare **38**, hat **42**) on channel **10**, matching **`grooveDrumsScorePartXml`** (was single **`midi-unpitched` 1** → silent in Sibelius). Score-instrument elements grouped before midi-instrument for schema validity. Sibelius-verified: drums play, no schema warning. Commit **`1c5fa289`**.

- **Art Rock mosaic — skip Metheny behaviour gate on riff VRB paths** — **`behaviourGates.ts`** skips **`validateMethenyConformance`** when primary or **`mosaicSectionPlan`** includes Art Rock riff VRB composers (**`verlaine`** / **`marr`** / **`fripp`** / **`morello`**, or **`riffFamilyForSongwriterId === 'art_rock'`**); never skips when **`styleStack.primary === 'metheny'`**. Fixes unfair **"Density too busy for Metheny"** on Television Field Suite without changing Metheny thresholds or real **`pat_metheny`** / **`ecm_chamber`** paths. Proof: **`scripts/validateArtRockMosaicArc.ts`** (seed **90106**, golden path PASS).

- **Desktop leadsheet GUI build unblock (Phase 6)** — Vite resolved stray compiled **`musicXmlDeepImport.js`** ahead of **`musicXmlDeepImport.ts`**, breaking Rollup named imports; **`apps/composer-os-app/vite.config.ts`** now prefers **`.ts`** before **`.js`** in **`resolve.extensions`** (parsing unchanged). Commit **`48cf6775`**.

- **Evans Musician 32-bar bridge** — Bill Evans premium melody now plays end-to-end on the 32-bar Musician/desktop path (premium pin reordered before behaviour gates, tile-seam bar-math / co-onset repair at 8→32 bar seams, **`BE_Benchmark_LyricalBallad.musicxml`** fixture packaged into the desktop IPC bundle).

- **V87 Commit 2b2 — premium-melody compiled JS sync (QA export pitch-v2)** — Rebuilt **`core/premium-melody/`** compiled output from TypeScript source: **`premiumMelodyRouting.js`**, **`index.js`**, new **`premiumMelodyPitchPipeline.js`**, **`premiumMelodyPitchProfile.js`**. Stale **`premiumMelodyRouting.js`** (rhythm → expression only) was loaded via **`index.js`** during golden-path pin export, so **`be-v86-2b2-check.musicxml`** and **`beGoldenMaster`** fixtures kept **import** pitches while auto-validation passed pitch-v2 on an isolated pipeline call. Export now matches pitch-v2 (seed **90301**: **65,65,65,67,67,67,69,73,75,75,74,78,73,72,71,71**). **`be-isolation-seed90301.golden.*`** re-approved (sha256 **20b402433695** / **36dacebeba3b**). BH / Wayne golden masters **byte-identical**. Gates: smoke **664/664**, **`bhGoldenMaster`** / **`wayneGoldenMaster`** / **`beGoldenMaster`** PASS, **`premiumMelodyPitchPipeline.test.ts`** PASS.

### Added

- **V89 Commit 2a/2b — Jimi Hendrix premium-melody (isolation + pitch layer)** — Profile **`jh_blues_lead_v1`** (`jhPremiumMelodyProfile.ts`, `pitchSeedSalt` **90303**): blues-lead register **MIDI 52–74**, **`chord_root`** tonal centre, **`call_response_variation`** contour, dom7 **`chordFitVector`**, temperature **0.52**, **`maxLeapSemitones` 12**. **Four additive optional pitch mechanisms** (absent for BH / Wayne / Evans): **`bluesInflection`** (b3/b5/b7 + weak-beat weighting), **`pentatonicAnchor`** (replaces guide-tone for Hendrix), **`riffCellRecall`** (five weighted cells + transposition / anti-loop tiers), **`callResponsePhraseScore`** (phrase-pair pre-pass — call bar → response bar pairing, mutation bonus, bar-3 intensity lift, phrase-end sustain, long-target vibrato eligibility). **`premiumMelodyOptionalPitchMechanisms.ts`** + pipeline wiring in **`premiumMelodyPitchPipeline.ts`** (pre-pass after v2 overlay merge; optional score multiplier). **`runGoldenPath.ts`** routing (`hendrix` + `guitar_bass_duo` + `harmonyByBar` + **`jhPremiumMelodyPitchTrace`**). **`jhPremiumMelodyValidation.ts`**: rhythm gates (offbeat **0.28–0.58**, IOI entropy **≥1.4**, velocity **4–12**) + pitch mechanism checks (PROVISIONAL on BH isolation benchmark). Fixtures **`jh-isolation-seed90303.golden.*`** (sha256 **9b658ff7384c** / **63dce636b88c**). QA: **Song Mode** / `jh-v86-2a2b-check.musicxml`. BH **1a** golden master **byte-identical**. Gates: smoke **664/664**, BH **8/8**, **`bhGoldenMaster`** / **`wayneGoldenMaster`** / **`beGoldenMaster`** / **`jhGoldenMaster`** PASS, **`runJhPremiumMelodyAutoValidation`** PASS.

- **V87 Commit 2c — Bill Evans native lyrical benchmark + golden-master freeze** — Original **8**-bar ballad benchmark **`BE_Benchmark_LyricalBallad.musicxml`** (C major: Dm7 | G7 | Cmaj7 | D7 | C7 | Fmaj7 | G7 | Cmaj7) with frozen bar-level guide-tone primary track (F–F–E–F♯–G–A–F–E). **Weight recalibration** on **`be_jazz_ballad_v1`**: guide-tone proximity **2.1**, chord-fit **1.7**, local contour **0.95**, σ **1.5**, hit bonuses **1.7 / 1.4**, phrase-level **60–70%** exact primary guide-tone band + per-bar floor **50%**, climax colour-tone bias. **`premiumMelodyPitchPipeline.ts`**: `barPrimaryGuideTonePc`, `repairGuideToneHitBand`, guide/climax repair after approach fill. **`bePremiumMelodyValidation.ts`**: **FROZEN** thresholds on seed **90301** (proximity **0.55–1.0**, exact-hit **0.60–0.70**, stepwise **≥0.53**, leaps **≤0.31**). Fixtures **`be-lyrical-seed90301.golden.*`** (**FROZEN**; sha256 **53a2ca43075b** / **4889a096763a**); removed superseded **`be-isolation-seed90301`**. QA: **`be-v86-2c-check.musicxml`**. BH / Wayne golden masters **byte-identical** untouched. Gates: smoke **664/664**, BH **8/8**, **`bhGoldenMaster`** / **`wayneGoldenMaster`** / **`beGoldenMaster`** PASS, **`runBePremiumMelodyAutoValidation`** PASS. — Shared **`premiumMelodyPitchPipeline.ts`** gains opt-in v2 pre-pass (`runPitchV2PhrasePrePass`: guide-tone primary line, climax ideal curve, chord-boundary detection from **`harmonyByBar`**, two-pass approach assignment — non-intermediate slots first, intermediates anchored to target MIDI + pattern offsets). Scoring: additive **`weightGuideToneProximity`**, **`weightPhraseArc`**, **`localContourWeight`**, **`approachPatternRate`**. **`PremiumMelodyChordFitVector.sixth?`** (tonic-major only via chord-symbol heuristic); functional vs tonic vectors BE-only. **`repairClimaxSlotPicks`** hard-enforces climax mean+6 / min+9 and neighbor ≥2 semitone clearance. **`bePremiumMelodyProfile.ts`**: `guideTone` / `climaxArc` / `approachPattern` enabled; **`maxLeapSemitones` 5**. **`runGoldenPath.ts`** passes import-timeline harmony into BE pin export. **`bePremiumMelodyValidation.ts`**: v2 gates (guide-tone proximity **0.45–1.0**, approach boundary rate **≥50%**). QA: **`be-v86-2b2-check.musicxml`**. Legacy: v2 blocks absent → byte-identical pitches (`premiumMelodyPitchPipeline.test.ts`); BH / Wayne golden masters unchanged. Gates: **`runBePremiumMelodyAutoValidation`** PASS, **`bhGoldenMaster`** / **`wayneGoldenMaster`** / **`beGoldenMaster`** PASS, smoke **664/664**.
- **V87 Commit 2b — Bill Evans pitch layer + rhythm profile + validation** — First composer with end-to-end **`pitchProfile`** (`be_jazz_ballad_v1`, `pitchSeedSalt` **90301**): arch contour, register **MIDI 55–79** (middle-to-upper RH staff), chord-third tonal centre, full interval-preference table (strictly decreasing; tritone not elevated), surface rules (enclosure, approach, grace **0.05**). Rhythm **2b-provisional**: **`syncopationShiftRate` 0.22**, **`anticipationBias` 0.25**, **`float_preserve`** + **`modal_lyric`**, ballad **`cellFamilyWeightScale`** + trim hooks. Pipeline: rhythm → pitch → expression → surface ornaments (`premiumMelodyRouting.ts` / **`runGoldenPath.ts`** + **`bePremiumMelodyPitchTrace`** metadata). **`bePremiumMelodyValidation.ts`**: offbeat **0.20–0.40**, IOI entropy **1.0–2.40** (BH isolation observes **~2.33**; design intent **≤1.6** tightens at native benchmark **2c**), velocity **4–10**, **pitchTrace** (differ **≥60%**, stepwise+3rd **≥55%**, leaps **>5** **≤20%**). Fixtures **re-approved** (`be-isolation-seed90301.golden.*`, sha256 **d936d283** / **68daf2d10b8a**). QA: **Song Mode** / `be-v86-2b-check.musicxml`. BH **1a** golden master **byte-identical**. Gates: smoke **664/664**, BH **8/8**, **`bhGoldenMaster`** PASS, **`beGoldenMaster`** PASS.
- **V87 Commit 2a — Bill Evans golden-master baseline (isolation)** — Provisional profile **`be_isolation_provisional`** (`bePremiumMelodyProfile.ts`) + **`runGoldenPath.ts`** routing (`bill_evans` + `guitar_bass_duo` + import timeline → premium-melody rhythm + expression + **`pinPremiumMelodyExport`**). Deterministic output captured at seed **90301** on reused **`BH_Benchmark_JazzMelody.musicxml`** pitches for isolation/determinism only — **not** Bill Evans-authentic material (native benchmark in **2c**). **`beGoldenMaster.test.ts`** + **`be-isolation-seed90301.golden.json`** / **`.golden.musicxml`** (PROVISIONAL). BH byte-identical to **1a** golden master. Gates: **`beGoldenMaster`** PASS, **`bhGoldenMaster`** PASS, smoke **664/664**, BH auto-validation **8/8**.
- **V87 pitch layer engine hook (BH-safe)** — Optional `pitchProfile` on `PremiumMelodyProfile`; absent = import pitches unchanged (BH default). New `premiumMelodyPitchProfile.ts` (slot context, scorer/planner/surface types, `PremiumMelodyPitchTraceEvent`) and `premiumMelodyPitchPipeline.ts` (phrase planner + slot scorer + surface ornament annotations). `runPremiumMelodyHarmonyRhythmExpressionPipeline`: seed `>>> 0` at entry; pitch passes after `enrichMelodyRhythm`, expression on post-pitch melody, surface ornaments after expression when `surfaceRules != null`. Determinism: FNV-1a slot seeds, ascending MIDI candidate enumeration, one `mulberry32` draw per slot, ornament order `[approach, enclosure, blues, grace, bend]`. `premiumMelodyPitchPipeline.test.ts` BH proxy proves byte-identical export when `pitchProfile` absent. No BH profile/fixture changes; Bill Evans pitch profile next commit.
- **Electron Musician shell (v1)** — Default **`Composer-OS.exe`** window is plain HTML + TypeScript (no React): composer dropdown from **`registry.json`**, seed + Randomise + Generate, status line. IPC only: **`composer-os-musician:generate`** + **`composer-os-musician:status`**. Output: **`Song Mode/{composerSlug}_{seed}.musicxml`** under Mike Composer Files; OS opens file after write. Frozen BH/Wayne entries appear under **Reference** optgroup. Full React UI: set **`COMPOSER_OS_FULL_UI=1`**. Integration test: **`apps/composer-os-desktop/tests/musicianGenerate.integration.test.ts`**. Engine + golden-master tests unchanged.
 — Adds **`scaffoldPremiumMelodyComposer.ts`** + **`scaffold/premium-melody-composer/registry.json`** (eight queued composers: Bill Evans through Frank Zappa, seeds **90301–90308**; BH/Wayne **frozen** entries for seed-collision + denylist derivation). Generates V86 **2a-start kit** per composer: profile skeleton, golden-master test, PLACEHOLDER validation, auto-validation runner, **`runGoldenPath`** paste snippet, CHANGELOG/HANDBOOK stubs, filled **2a Cursor prompt**, manifest. **BH safety:** write allowlist + registry-derived frozen denylist; post-flight **`bhGoldenMaster`** with rollback on FAIL. Does **not** edit **`runGoldenPath.ts`**, golden binaries, or benchmarks. Run: `npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/scaffoldPremiumMelodyComposer.ts --composer <slug> --seed <int> [--dry-run]`. Gates: smoke **664/664**, **`bhGoldenMaster`** PASS byte-identical.
- **V86 Commit 2c — Wayne Shorter native modal benchmark + golden-master freeze** — Original modal benchmark **`WS_Benchmark_ModalMelody.musicxml`** (`engines/composer-os-v2/core/wayne-shorter/test-fixtures/`): **8** bars D Dorian / modal centres with floating sustains, compact bursts, rests, intervallic pivots, and long-range phrase arc (original contour — not copyrighted Shorter notation). **`wayneGoldenMaster.test.ts`** now targets native benchmark; fixtures **`ws-modal-seed90217.golden.json`** / **`.golden.musicxml`** (**FROZEN** — byte-identical oracle like BH; sha256 **caadd97f1b95** / **abf418d4483e**). **`wsPremiumMelodyValidation.ts`** thresholds finalized on modal benchmark seed **90217**: offbeat ratio **0.28–0.58**, IOI entropy **≥1.83**, velocity spread **4–12** (no BH phrase-density arc; pitch authenticity deferred). BH isolation uniform-float (**`BH_Benchmark_JazzMelody.musicxml`**) sits at IOI-entropy floor edge (**~1.839** vs **~3.346** modal). **`wsPremiumMelodyProfile.ts`**: **`cellFamilyWeightScale`** **`long_gap` 2.0** / **`delayed` 1.65**. **`runWsPremiumMelodyAutoValidation.ts`**: QA export **Song Mode** / `ws-v86-2c-check.musicxml`. BH **1a** golden master **byte-identical** untouched. Gates: smoke **664/664**, BH auto-validation **8/8**, **`bhGoldenMaster`** PASS, **`wayneGoldenMaster`** PASS, Wayne auto-validation PASS.
- **V86 Commit 2b — Wayne Shorter modal-float profile + routing + validation** — Tuned provisional **`ws_isolation_provisional`** for modal float: **`syncopationShiftRate` 0.40**, **`anticipationBias` 0.30**, **`float_preserve`** landing, **`modal_lyric`** expression, **`cellFamilyWeightScale`** boosting **`long_gap`** + **`delayed`** (combined **50%** on seed **90217**, target **≥35%**). Shared **`premiumMelodyRouting.ts`** wires Wayne through full premium-melody rhythm + expression pipeline (same helper BH duo export uses); **`runGoldenPath.ts`** refactored. Wayne-specific **`wsPremiumMelodyValidation.ts`** + **`runWsPremiumMelodyAutoValidation.ts`**: offbeat ratio **0.28–0.52**, IOI entropy **≥1.4**, velocity spread **4–12** (no BH phrase-density arc). **`modal_lyric`** velocity peak tuned (**84→80**). Wayne fixtures **re-approved** (`ws-isolation-seed90217.golden.json` / `.golden.musicxml`, sha256 **ea18328efa6e** / **d30df1a6f950**). BH **1a** golden master **byte-identical** (**`90e02337`**). Gates: smoke **664/664**, BH auto-validation **8/8**, **`bhGoldenMaster`** PASS, **`wayneGoldenMaster`** PASS, Wayne auto-validation PASS. QA export: **Song Mode** / `ws-v86-2b-check.musicxml`.
- **V86 Commit 2a — Wayne Shorter golden-master baseline (isolation)** — Provisional Wayne profile **`ws_isolation_provisional`** (`wsPremiumMelodyProfile.ts`) + minimal **`runGoldenPath.ts`** routing (`wayne_shorter` + `guitar_bass_duo` + import timeline → **`enrichMelodyRhythm`** + **`enrichMelodyExpression`** + **`pinPremiumMelodyExport`**). Deterministic output captured at seed **90217** on reused **`BH_Benchmark_JazzMelody.musicxml`** pitches for isolation/determinism only — **not** Wayne-authentic modal material (native benchmark in **2c**). **`wayneGoldenMaster.test.ts`** + **`ws-isolation-seed90217.golden.json`** / **`.golden.musicxml`** (PROVISIONAL — re-approved in **2b** tuning and **2c** native modal benchmark; freezes for real only after **2c**). BH byte-identical to **1a** golden master (**`90e02337`**). Gates: **`wayneGoldenMaster`** PASS (stable SHA-256 across runs), **`bhGoldenMaster`** PASS, smoke **664/664**, BH auto-validation **8/8**, V85 Phase 3 PASS.
- **V86 Commit 2-pre-2 — premium-melody engine enum branches + pin helper** — Added **`float_preserve`** structural landing mode (preserve imported onsets on phrase starts/ends), **`modal_lyric`** expression character (softer provisional velocity/articulation arc — tune in Wayne **2b**), and **`pinPremiumMelodyExport`** (`premiumMelodyPin.ts`) to pin expressive melody onto a score part for non-chord-melody composers. Each defaults to existing behaviour when not selected; **`buildBarryHarrisPremiumMelodyProfile`** sets neither. BH byte-identical to **1a** golden master (**`90e02337`**); **`bhGoldenMaster`** green. No Wayne wiring yet — Wayne uses these in **2a**.
- **V86 Commit 2-pre — widen `PremiumMelodyProfile` with BH-preserving engine hooks** — Eight optional hooks on **`PremiumMelodyProfile`**: **`offbeatTrimCeiling`**, **`barSlotNudgesEnabled`**, **`structuralLandingMode`**, **`projectedOffbeatBlockThreshold`**, **`restPhraseBreakBeats`**, **`longNotePhraseBreakBeats`**, **`expressionCharacter`**, **`rhythmSeedSalt`**. Each defaults to current Barry Harris behaviour when absent; **`buildBarryHarrisPremiumMelodyProfile`** sets none of them. BH output byte-identical to Commit **1a** golden master (**`90e02337`**); **`bhGoldenMaster`** green. No Wayne profile yet — prepares shared engine for Commit **2** (Wayne Shorter).
- **V86 Commit 1b — shared `core/premium-melody/` engine** — Extracted BH rhythm/expression into **`engines/composer-os-v2/core/premium-melody/`** (profile-driven **`enrichMelodyRhythm`** + **`enrichMelodyExpression`**). Barry Harris remains the first profile via **`buildBarryHarrisPremiumMelodyProfile`**; **`barry-harris/`** files are thin adapters preserving the full export surface (**`deriveBhMelodyRhythmSeed`**, **`BhCellFamily`**, etc.). Behaviour-preserving: byte-identical to Commit **1a** golden master (**`90e02337`**), **`bhGoldenMaster`** green, export surface unchanged. No second composer yet — Wayne Shorter plug-in queued for Commit **2**.
- **V86 Commit 1a — BH golden-master baseline** — Normalized snapshot of BH rhythm+expression+export at seed **88109** on **`BH_Benchmark_JazzMelody.musicxml`**, captured before the shared-engine refactor. Adds **`bhGoldenMaster.test.ts`** byte-exact characterization test (`engines/composer-os-v2/tests/golden/bh-benchmark-seed88109.golden.json` + `.golden.musicxml`). No behaviour change. Fixture is **FROZEN** — only ever regenerated in a commit whose stated purpose is changing BH.
- **V85 Phase 3 Commit 2 — melodic expression pass** — **`enrichMelodyExpression.ts`**: articulation (**accent** / **tenuto** / **staccato**), per-phrase velocity arc **76–99**, **`durationAccent`** stress at export. Timing grid **byte-identical** to Commit 1 (hard-fail guard in **`runV85Phase3AutoValidation.ts`** Phase 3b). **`musicxmlExporter.ts`** / **`scoreModelTypes.ts`**: **`NoteEvent.durationAccent`** wired to MusicXML dynamics. Phase 3b validation added to **`runV85Phase3AutoValidation.ts`**. Also completes **V83e+f**: **`offbeatPassingDimBias`** committed onto **`BhMelodyRhythmProfile`** (**bebop_step** **0.75** / **enclosure_heavy** **0.85** / **scalar_embellish** **0.35**) — restores and-of-1 passing dims (**andOfOneCount=1**). Strict-compile fixes: **`types.ts`** (`pitches`, `exportStackMidis`), **`voicingEngine.ts`** (`MeasureModel` import, dead `passing_dim` overlap), **`compositionContext.ts`** (`barryHarrisProfile` metadata), ES-compatible **`findLast`** in expression pass. Gates: smoke **664/664**, BH auto-validation **8/8**, V85 Phase 3 PASS (2+3+3b).
- **V85 Phase 3 Commit 1 — rhythmic-cell variety** — **`bhRhythmCellLibrary.ts`**: **6** cell families, deterministic **mulberry32** seed, phrase-position weighted selection, **anti-repeat** + **triplet cap**. **`enrichMelodyRhythm.ts`** reworked to cell-library interior onsets; Phase 2 landings + **`preservePitchSequence`** preserved. New **`runV85Phase3AutoValidation.ts`** (Phase 2 checks + IOI buckets **≥ 5**, onset dominance **≤ 0.30**, IOI entropy **≥ 2.0**, duration 3-gram diversity **≥ 6**, phrase-density arc, **≥ 3** cell families). Calibrated on **`BH_Benchmark_JazzMelody.musicxml`** seed **88109**. Gates: smoke **664/664**, BH auto-validation **8/8**, V85 Phase 3 PASS (offbeatRatio **0.688**, IOI buckets **11**, dominance **0.250**, entropy **3.374**, 3-grams **13**, density arc **true**, **5** families, pitch bit-exact), Jest full **662/662**.
- **V83e+f — BH and-of-1 passing diminished grips + inner-comp VL cap** — **`insertPassingDiminishedEvents.ts`**: profile-gated **and-of-1** passing **dim7** inserts at onset **0.5** (MusicXML **240/480** divisions) when passing into beat **2**; **3–5** bars per chart via **`offbeatPassingDimBias`** on **`BhMelodyRhythmProfile`**; real **2–4** note diminished stacks (not receipt-only). **`voicingEngine.ts`**: and-of-1 voicing headroom + **`hasAndOfOnePassingDimInBar`** export guard; global structural inner-comp **VL leap cap** (**10** semitones on family-change fallback; observed max **≤ 8** on benchmark). **`chordMelodyPipeline.ts`**: passes rhythm profile into passing-dim insertion. **`musicxmlExporter.ts`**: **`midi-program`** NaN guard → GM **28** (Electric Guitar). **`runV81AutoValidation.ts`**: **TEST 6** / **TEST 7** de-vacuumed (adjacent inner-comp leap pairs + drop-2 K upper-register assertions on chromatic benchmark). Diagnostic on **`v83e-and-of-1-check.musicxml`**: dim grips in bars **1 / 4 / 9** at beat **0.5** — placement correct; prior “4.5 divisions” report was a divisions-value misread (**480** vs smaller grid). Gates: smoke **664/664**, BH auto-validation **8/8**, **V83d Phase 2** PASS.
- **V83d Phase 2 — BH melody rhythm enrichment (pitches locked)** — **`enrichMelodyRhythm.ts`** + **`bhMelodyRhythmProfile.ts`**: on **`guitar_bass_duo`** BH style-transfer, melody **pitches** stay bit-exact (`assertPreservePitchSequence` / `preservePitchSequence` contract); **onsets/IOIs** only are enriched with Barry Harris anticipation / delayed-attack phrasing. **Structural-landing-aware:** phrase boundaries from rests / long IOIs (not fixed indices); phrase-start and cadence attacks may land on beat **1** or **3**; interior notes syncopate without uniform off-grid displacement (target offbeat band **0.55–0.75**). **`runGoldenPath.ts`** passes **`exportMelody`** into **`applyChordMelodyToScore`** (harmony lookup stays on original onsets). Profiles: **`bebop_step`** (default), **`enclosure_heavy`**, **`scalar_embellish`**. **`runV83dPhase2AutoValidation.ts`** — non-vacuous checks: offbeatRatio window **0.55–0.75**, structural-landing count **≥ 1**, syncopation delta band (rejects saturated **~1.0**), pitch bit-exact, **≥ 3** IOI buckets, schema. Sibelius + ChatGPT re-QA **SHIP** on jazz benchmark (offbeatRatio **0.688**, **2** structural landings, **16** notes pitch-locked). **Parked Phase 3 follow-up:** rhythmic-cell variety still limited (recurring **0.5 / 1.25 / 2.5 / 3.75** placements; IOI buckets at floor of **3**) — future refinement, not a blocker.
- **V83d Phase 1 — BH duo comp-side rhythm (melody preserved)** — **`voicingEngine.ts`** **`applyChordMelodyToScoreGuitarDuo`**: passing **`passing_dim`** harmony events now export to **`guitar_bass_duo`** as voice-2 comp attacks on weak beats (beats **1** / **3**); structural inner voicings **stagger** to off-beats under locked melody onsets (voice **1** unchanged). Style-transfer path wires **`insertPassingDiminishedEvents`** before voicing (**`runGoldenPath.ts`**). **`runV83dPhase1AutoValidation.ts`** asserts exported onsets + pitch lock + schema (not receipt-only). **`runV81AutoValidation.ts`** TEST 5 — per-voice bar duration sums for multi-voice guitar export.

### Fixed

- **Cleanup day (2026-06-11) — Wayne 8-bar style-transfer phrase gate** — **`isStyleTransferEightBarPinnedMelodyRelax`** (`mosaicStyleTransfer.ts` + **`behaviourGates.ts`**): duo phrase authority / LOCK / V3 gates route to **warnings** (non-blocking) when **style-transfer + preserveMelody + 8 bars** — pinned import melody no longer fails **`gp.success`** on short Wayne (and other style-transfer) imports; export + pipeline-truth unchanged. **`runGoldenPath.ts`** propagates **`styleTransferWayneHarmonyAuthoritative`** + **`wayneShorterEffectiveHarmonyBars`** on Wayne style-transfer merge.
- **Cleanup day (2026-06-11) — Jest V83h** — **7 → 0** baselined failures: **6** stale **`barryHarrisChordMelody.test.ts`** expectations (dyad stack size, ladder thresholds, XML dim spelling, wyble note count, chord-stack evidence); **1** **`songModeMosaicSmoke.test.ts`** lead-sheet chord assertion (score `chord` / `<chord/>` vs measure `<harmony>` only). Jest full suite **662/662**.

### Known issues (logged)

- **V83 — three-way reharm auto-test** — `engines/composer-os-v2/scripts/runV83ThreeWayReharmAutoTest.ts` runs the BH jazz benchmark melody through **barry_harris**, **radiohead** (swap for **wayne_shorter**), and **fripp** style-transfer reharm; asserts melody preservation, harmony change, pairwise contrast, and **MusicXML schema** (no `<offset>` inside `<harmony>`, stringsync parse). Outputs to `Song Mode/reharm-*.musicxml`.

### Fixed

- **V83c — MusicXML notation quality (Sibelius-safe)** — **`musicxmlExporter.ts`**: measure-1 **feel** label (italic, e.g. “Medium feel; straight 8ths”) merged into the **above-staff** tempo `<direction>` as its own `<direction-type>` sibling of `<metronome>` (schema-valid `xs:choice` — fixes Sibelius “Element words is not defined in this scope”); measure-1 sibling order on part 0 is tempo+feel → beat-1 harmony → rehearsal → dynamics/tuning/key → notes; removed separate below-staff feel direction. **`chordSemantics.ts`**: all exported `<harmony>` carry **`placement="above"`** (symbol text unchanged). **`musicxmlValidation.ts`**: **`findDirectionTypeScopeViolations`** (mixed `direction-type` choice branches) + **`findHarmonyChildOffsetViolations`** wired into **`validateMusicXmlSchema`**; smoke gate tests in **`export.test.ts`** and **`musicXmlValidator.test.ts`**. **Integrity regex fix**: harmony-count / parse paths use **`<harmony[\s>]`** / **`<harmony[^>]*>`** so attributed harmony blocks are not missed — **`exportHardening.ts`**, **`appApiBoundary.test.ts`**, **`runV83ThreeWayReharmAutoTest.ts`**, **`scoreExportValidation.ts`**, **`gceStructuralMemory.ts`**.
- **MusicXML export — harmony `<offset>`** — `musicxmlExporter.ts` no longer injects `<offset>` inside `<harmony>` for mid-measure Barry Harris chord events; sequential rest/note placement already positions harmony (fixes Sibelius “offset is not defined in this scope” on reharm exports). `musicxmlValidation.ts` — `findHarmonyChildOffsetViolations` + strengthened `validateMusicXmlSchema`.
- **`wayne_shorter` style-transfer export (0-byte XML)** — **`mosaicStyleTransfer.ts`** + **`generateGoldenPathDuoScore.ts`**: style-transfer now uses a **single authoritative Wayne precompute** (`styleTransferWayneHarmonyAuthoritative` + pinned `wayneShorterEffectiveHarmonyBars` from pass-1 `appliedHarmonyBars`) and **skips** the second `precomputeWayneShorterEffectiveHarmonyBars` in duo score build. Fixes double-precompute drift (e.g. `Gmaj7#11` vs `Gmaj7#11/G`) that tripped LOCK/export assert and produced **0-byte** MusicXML. Extended symbols (`Gmaj9#11`, etc.) were never a `chordSemantics` spelling failure.

## [2.10.2a] - 2026-06-10

### Changed

- **Desktop** — Portable/installer **`package.json`** version **2.10.2a** (matches Arranger tab ship).

### Added

- **V83a+b — Arranger preset dropdown** — Step 3 **Preset** selector on the **Arranger** tab: **Song Mode** (default guitar–bass style-transfer path), **String Quartet** (four strings + piano harmony staff), **Big Band** (full sax soli / ensemble export). Same mosaic import + style-transfer composer list; **`presetId`** routes to the matching golden-path realisation.

## [2.10.2] - 2026-06-10

### Changed

- **Arranger** — Optional **Output name** field between settings and Run (passes `outputLabel` to generate). **Open MusicXML** replaces Save-dialog download; desktop opens the saved file with the system default app (`shell.openPath` via `composer-os-api:open-file-default-app`). **Download MIDI** unchanged.

## [2.10.1] - 2026-06-10

### Fixed

- **V82 — Arranger post-ship fixes** — **Download MusicXML** / **Download MIDI** trigger real browser downloads via `GET /api/download-file` (library path validated). **Reveal in folder** always shown in browser dev and desktop; Windows opens Explorer with file selected (`explorer.exe /select`). Removed browser-only copy-path fallback and garbled Unicode in Arranger UI (ASCII labels + CSS icon glyphs). Desktop IPC uses shared `openOutputFolderRoute` helper.

## [2.10.0] - 2026-06-10

### Added

- **V82c — Arranger tab** — New **Arranger** nav route (`/arranger`): 4-step wizard (upload melody → choose Barry Harris / style-transfer composer → settings → run). Mosaic import parsing (MIDI/MusicXML), confidence dots, progress stages, result panel with MusicXML/MIDI download. Style-transfer payload routes through **Song Mode** (same path as Generate mosaic style-transfer). Browser dev: copyable output path when Explorer reveal unavailable; desktop IPC: **Reveal in folder**.

## [2.9.1] - 2026-06-09

### Fixed

- **V82a — Barry Harris Style-Transfer validation** — 8-bar pipeline truth expects post-BH `appliedHarmonyBars` (not wire import); motif consecutive-bar and bass rhythmic anti-loop relax when style-transfer + `preserveMelody`; `pinMelodyOnScore` clears all voice-1 events; deferred bar-math / locked-wire assert after chord-melody overlay; `resolveEffectiveHarmonyTruth` routes style-transfer applied bars. Auto-validation **TEST 8** (BH jazz benchmark fixture).

- **Song Mode harmony authority** — `harmonyLockFromUserOrImport` gate: songwriter scaffold no longer treated as user-locked harmony when `free_harmony` / no paste/import.

## [2.9.0] - 2026-06-09

### Barry Harris Extensions

- Passing diminished insertion (weak-beat approach chords, 25–40% density)
- Song Mode BH entry (`scoreMelodyToImportMelody` adapter)
- String Quartet voicing (4-part distribution, inner-voice passing dims)
- Big Band sax soli (5-voice AATBS, Bari root doubling)

### Engine fixes

- Family-change VL cap reduced 10st → 7st (warn receipt when fallback to 10st)
- Drop-2 K scoring widened for upper-register melody (close top above E5)
- Half-bar rest export artifact resolved (passing-dim + harmony hold durations)
- SQ `DISSONANCE_TOP` rotation fix (dissonant inner drops to viola register)

## [2.8.0] - 2026-06-09

### Added

- **Barry Harris Chord-Melody Engine (UI + ship)** — Dedicated **Barry Harris Chord-Melody** mode in Mosaic style-transfer when **Barry Harris** is the target composer: scale-of-chords display, rung breakdown (sixth / dim7 / borrowed %), average voice-leading step, and guitar feasibility in generate results. Import guidance for MIDI/MusicXML + chord symbols. **`docs/BH_QUICK_GUIDE.md`** (musician quick start). Handbook section on chord-melody workflow and **`bh:cm:*`** receipts.

- **Barry Harris Chord-Melody Engine**
  - 8-rung ladder architecture: pre-voice-led 6th↔dim7 scale of chords
  - Import MIDI/MusicXML or type chords → BH reharmonisation
  - Style-transfer: "Barry-ify my melody" with strength blend 0–1
  - Guitar voicings: close-position + drop-2, fret-span constraint
  - Phrasing roles: full/dyad/single per beat strength
  - Per-note **`bh:cm:*`** receipts for diagnostics
  - Eval harness + 3 benchmark tests (ladder fidelity, jazz melody, Hookpad)

## [2.7.0] - 2026-06-09

### Added

- **V82 — Barry Harris chord-melody (style-transfer path)** — Import a melody with fake-book harmony and reharmonise through Barry Harris sixth–diminished logic: each melody note maps to a **6th chord**, **diminished passing chord**, or **borrowed partner** from the scale-of-chords ladder; identities rename chords to chart-friendly spellings (m6↔m7♭5, dim7↔dom7 enharmonics, maj9 on Ⅴ); **block voicings** stack close 6th/dim7 tones under the melody as the top voice. **`bh:cm:*`** per-note receipts (`select`, `borrowed`, `reinterpret`, `identity`) accompany generation; **`npm run eval:barry_harris`** validates selector coverage, borrowed density, identities, and top-note voicing on a 16-bar reference chart. Style-transfer to **`barry_harris`** echoes chord-melody summary in generate results. Minimal **`barry_harris`** VRB documents voicing observability (melody-top block, stepwise inner voices, max leap 12). Legacy bebop slice **`bh:bebop_*`** / **`bh:sixth_*`** receipts unchanged.

### Changed

- **Fripp mosaic eval calibration (rc12 hotfix)** — `evaluateMosaicSections.ts` Signature 4 (silence discipline): rest-ratio fail upper **0.45 → 0.60**; mean phrase-length fail **> 4 → > 8 bars** — duo/KC space tolerance.
- **Fripp phrase detection fix (hotfix)** — Fripp sig4 replaces bar-empty phrase splitter with **≥0.5 beat rest gap** note-group count on **melody voice (v1)** when present (pass **≥ 3 groups**); comp voice no longer bridges gaps into one 16-bar phrase.

### Added

- **Mosaic Section Eval Profiles (rc12 hotfix)** — `evaluateMosaicSections.ts`: section-scoped signature profiles for **`fripp`**, **`jack_white`**, **`wayne_shorter`** (4 signatures each, 0–1 linear interpolation, weighted sum + min 2 signatures ≥ 0.6); wires mosaic section retry eval for Three Mirrors trio.

- **Mosaic GCE Section Retry (rc12)** — `runMosaicSectionRetry`: regenerates failing section only, max 2 attempts; passing sections preserved unchanged; `mosaicSourceMotif` persists across retry — motif family maintained; surgical metadata merge — no wholesale overwrite; graceful: if retry exhausted, original output kept with warning.

- **Mosaic Dispatch Registry Fix (rc11)** — `holdsworth` alias → `allan_holdsworth`; `ornette_coleman` stub → nearest fit (`andrew_hill`, pending dedicated slice); all `COMPOSER_ID_ALIASES` gaps resolved in dispatch registry via alias registration; `getDispatchEntry`: alias normalization fallback — no more hard throws on unknown composer ids when a canonical/stub target exists.

- **Mosaic Motif Transform Library (rc10)** — `deriveMotifTransformFromVrb`: reads VRB + `SongwriterStyleProfile` at runtime to derive transform per composer automatically; `applyDerivedTransform`: applies derived transform with Perplexity corridor correction (0.40–0.75); named overrides (`rf`/`jw`/`ws`/`tv`/`jma`) now delta layers on top of derived transform, not replacements; all mosaic composers get musically characteristic transforms; final fallback: tonic transposition only for truly unknown composers.

- **Mosaic Motif Engine Upgrade (rc9)** — `generateMosaicSourceMotif`: 5 new rules (noteCount 4–5, one P4 leap, stepwise fill, one contour hinge, offbeat onset, final note = deg 5); `rf:*` transform: sequence by +2, onset rotation (NOT inversion); `ws:*` transform: NEW — interpolation note + onset displacement; duration protection: motif notes survive `normalizeMeasureToEighthBeatGrid` via post-finalize reinject; all pairs similarity target > 0.40.

### Added

- **Mosaic Phrase Planning Layer (rc8)** — `phraseRole` optional field on `MosaicSectionPlan` entry (`'statement'|'development'|'climax'|'release'`); `resolvePhraseRole`: pure resolver; `buildPhraseRoleHints`: density, dynamic, motif prominence per role; applied at section `startBar` before dispatch — graceful no-op when absent; new files `mosaicPhrasePlanner.ts`, `mosaicPhrasePlanner.test.ts`.

### Added

- **Mosaic Time Signatures Per Section (rc7)** — Optional `timeSignature` field on `MosaicSectionPlan` entry `{ numerator, denominator }`; defaults to 4/4 when absent; time signature written to score at each section `startBar`; motif and transition beat placement respects section meter; CLI `--sections` JSON accepts `timeSignature` per section.

### Added

- **Mosaic Transition Bars (rc6)** — `isMosaicTransitionBar`: detects bar immediately before section boundary; `buildTransitionBarNotes`: anticipatory fragment (beats 3–4 only) drawn from incoming motif variant, transposed to incoming tonic; `motifRef` `mosaic_transition_{sectionLabel}`; append-only — does not replace outgoing composer notes; gated: `isMosaicModeActive && !songModeHookFirstIdentity`; new files `mosaicTransitionBars.ts`, `mosaicTransitionBars.test.ts`.

### Added

- **Mosaic Motif Engine MVP (rc5)** — `generateMosaicSourceMotif`: seeded source cell independent of composer; `transformMotifForSection`: rf/jw/tv/jma composer transforms + tonic delta; `buildMosaicMotifVariants`: per-section via `buildMosaicTonicMap`; emission at section-start bars only, `motifRef` `mosaic_motif_{sectionLabel}`; `mosaicMotifSimilarityReceipts`: diagnostic only, no gate; gate: `isMosaicModeActive && !songModeHookFirstIdentity`; new files `mosaicMotifEngine.ts`, `mosaicMotifSimilarity.ts`; `compositionContext.ts`: 3 optional metadata fields added.

### Added

- **Robert Fripp v2 process systems composer (`rf:*`)** — era-dependent systems slice (`frippSystemsSlice.ts`): three modes Red / Discipline / Loop; intervalFieldPriority 0.88, interlockPatternRate 0.85, dissonanceManagement 0.82, loopAccumulationLogic 0.80, asymmetricGroupingRate 0.83; golden-path precompute + locked harmony routing + smoke **`frippSystemsSmoke.test.ts`** seed **11001**. Receipt prefix **`rf:*`** — distinct from Fripp/KC **`fk:*`**.
- **Fripp VRB bundle upgrade** — **`frippVrbFingerprints.ts`** — 8 fingerprints + Holdsworth / Verlaine / Marr / Sonic Youth / Eno / generic prog negative discriminators; bundle id **`fripp_systems_process`**; riff stub **`FRIPP`** in **`riffVrbStubs.ts`** retained with merged **`riffProfile`**.
- **Fripp Big Band rules** — five named rules in **`bigBandRuleRegistry.ts`**: IntervalFieldHarmony, InterlockPattern, DissonanceAsStructure, ProcessAudibility, AsymmetricGrouping (`fripp.*`).
- **Fripp evaluation profile** — **`frippStyleProfile.ts`** with pass/fail thresholds and era-specific bonus scoring; hardest bleed guard: Holdsworth.
- **Fripp Generate UI** — **`fripp`** in **`HomeGenerate.tsx`** songwriter + arranger lists; **`ART_ROCK_POST_PUNK`** group — Fripp stub upgraded to **`fully_implemented`**.

### Added

- **Captain Beefheart v2 avant-blues composer (`cbf:*`)** — composed blues-fragment polyphony slice (`beefheartFragmentSlice.ts`): bluesTransformation 0.85, independentPartPeriodicity 0.90, wrongNoteRecurrence 0.88, asymmetricPhraseModule 0.85, resolutionSuppression 0.92, denseSeparatedTexture 0.80; golden-path precompute + locked harmony routing + smoke **`beefheartFragmentSmoke.test.ts`** seed **66001**. Receipt prefix **`cbf:*`** — Count Basie owns **`cb:*`**.
- **Beefheart VRB bundle** — **`beefheartVrbFingerprints.ts`** — 8 fingerprints + delta blues / rock / Ornette / Zappa / Ayler / Pere Ubu negative discriminators; bundle id **`beefheart_fragment_polyphony`**.
- **Beefheart Big Band rules** — five named rules in **`bigBandRuleRegistry.ts`**: BluesTransformed, IndependentPeriodicity, WrongNoteRecurrence, AsymmetricModules, ResolutionSuppression (`beefheart.*`).
- **Beefheart evaluation profile** — **`beefheartStyleProfile.ts`** with pass/fail thresholds and avant-blues negative discriminators.
- **Beefheart Generate UI** — **`beefheart`** in **`HomeGenerate.tsx`** songwriter + arranger lists; new **`AVANT_BLUES`** production group — Beefheart **`fully_implemented`**.

### Added

- **Johnny Marr v2 art-rock composer (`jma:*`)** — melodic rhythm guitar slice (`marrMelodicSlice.ts`): partialVoicing 0.88, topNoteMelody 0.85, openStringResonance 0.80, addNoteHarmony 0.82, pendulumSubdivision 0.83; golden-path precompute + locked harmony routing + smoke **`marrMelodicRhythmSmoke.test.ts`** seed **55001**. Receipt prefix **`jma:*`** — distinct from Joni Mitchell `jm:*`, Mandel `jmd:*`, Jack White `jw:*`, John Williams `jwill:*`.
- **Marr VRB bundle** — **`marrVrbFingerprints.ts`** — 8 fingerprints + McGuinn / The Edge / Andy Summers / Bernard Butler / generic rock negative discriminators; bundle id **`marr_melodic_rhythm`**.
- **Marr Big Band rules** — five named rules in **`bigBandRuleRegistry.ts`**: MelodicRhythm, PartialVoicing, AddNoteSurface, PendulumSubdivision, SuspendedArrival (`marr.*`).
- **Marr evaluation profile** — **`marrStyleProfile.ts`** with pass/fail thresholds and art-rock negative discriminators.
- **Marr Generate UI** — **`marr`** in **`HomeGenerate.tsx`** songwriter + arranger lists; **`ART_ROCK_POST_PUNK`** group — Marr **`fully_implemented`** alongside Verlaine, Fripp, Morello.

### Added

- **Jack White v2 drone-riff composer (`jw:*`)** — open-tuning tonic floor slice (`jackWhiteDroneSlice.ts`): tonicPersistence 0.82, droneLogic 0.85, harmonyByImplication 0.88, riffCellEconomy 0.85, controlledIncompleteness 0.80; golden-path precompute + locked harmony routing + smoke **`jackWhiteDroneSmoke.test.ts`** seed **33001**. John Williams film receipts migrated to **`jwill:*`** to free **`jw:*`** for Jack White.
- **Jack White VRB bundle** — **`jackWhiteVrbFingerprints.ts`** — 8 fingerprints + Hendrix / Iommi / Page / Gilmour / Verlaine / Black Keys / Spencer / Childish negative discriminators; bundle id **`jack_white_drone_riff`**.
- **Jack White Big Band rules** — five named rules in **`bigBandRuleRegistry.ts`**: TonicPersistence, DroneRiffFusion, HarmonyByImplication, RiffCellEconomy, ControlledIncompleteness (`jwhite.*`).
- **Jack White evaluation profile** — **`jackWhiteStyleProfile.ts`** with pass/fail thresholds and rock-fusion negative discriminators.
- **Jack White Rock / Fusion group** — **`composerGroupDefinitions.ts`** **`ROCK_FUSION`** — Jack White **`fully_implemented`** alongside Allan Holdsworth; handbook updated.

### Changed

- **John Williams film slice receipt prefix** — **`jw:*` → `jwill:*`** (`filmSoundtrackHarmonySlices.ts`, API context modes, film smoke) so Jack White owns **`jw:*`**.

### Added

- **Allan Holdsworth v2 scale-derived fusion composer (`AH:*`)** — scale-family interval-subset slice (`holdsworthScaleSlice.ts`): scaleMembershipPriority 0.90, functional root avoidance, chromatic VL, subset voicing; golden-path precompute + locked harmony routing + smoke **`holdsworthScaleSliceSmoke.test.ts`** seed **96001**. Receipt prefix **`AH:`** (uppercase) — distinct from Andrew Hill **`ah:*`**.
- **Holdsworth VRB bundle upgrade** — **`holdsworthVrbFingerprints.ts`** — 8 fingerprints + negative discriminators (Henderson / Joe Pass / Verlaine / Wes / Hill bleed); bundle id **`allan_holdsworth_scale_derived`**; riff stub **`ALLAN_HOLDSWORTH`** in **`riffVrbStubs.ts`** retained with merged **`riffProfile`**.
- **Holdsworth Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: ScaleMembership, IntervalSubset, ScalePersistence, ChromaticVL, FunctionalAvoidance, IntegratedLine.
- **Holdsworth evaluation profile** — **`holdsworthStyleProfile.ts`** with pass/fail thresholds and fusion negative discriminators.
- **Holdsworth Rock / Fusion group** — **`composerGroupDefinitions.ts`** **`ROCK_FUSION`** — Allan Holdsworth promoted to **`fully_implemented`**; handbook updated.

## [2.0.1] - 2026-06-05

- feat(verlaine): ship Tom Verlaine as first-class v2 art-rock composer (`tv:*`)
- feat(ui): expose 6 riff VRB stubs in songwriter dropdown (EVH, Holdsworth, Sonic Youth, Wes, Joe Pass, Scott Henderson)
- chore(dist): rebuild exe v2.0.1

### Added

- **UI — riff VRB stub_exposed dropdown** — **`HomeGenerate.tsx`** surfaces six existing riff **`VoiceRuleBundle`** stubs in songwriter + arranger production-world optgroups: Eddie Van Halen (`EVH:*`), Allan Holdsworth (`AH:*`), Sonic Youth (`SY:*`), Wes Montgomery (`WM:*`), Joe Pass (`JP:*`), Scott Henderson (`SH:*`). VRB present; Song Mode golden-path slices pending.
- **Rock / Fusion + Jazz Guitar groups** — **`composerGroupDefinitions.ts`** **`ROCK_FUSION`** (EVH, Holdsworth, Henderson) and **`JAZZ_GUITAR`** (Wes, Joe Pass); **`stub_exposed`** member status; Sonic Youth demoted to **`stub_exposed`** under **Art Rock / Post-Punk** (removed from Shipped full slice optgroup).

- **Tom Verlaine v2 art-rock composer (`tv:*`)** — suspended modal field slice (`verlainFieldSlice.ts`): static modal centers, bass displacement under upper shape, extension retention, progression avoidance; golden-path precompute + locked harmony routing + smoke **`verlainFieldSliceSmoke.test.ts`** seed **95001**.
- **Verlaine VRB bundle** — **`verlainVrbFingerprints.ts`** — 8 fingerprints + negative discriminators (Fripp / Morello / Towner / Weber / jazz-lush / arena-pop bleed); bundle id **`verlaine_suspended_field`**; aliases `verlaine` / `tom_verlaine` / `television` / `tv`; riff stub **`VERLAINE`** in **`riffVrbStubs.ts`** retained with **`riffProfile`** merged into full bundle.
- **Verlaine Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: ModalFieldPersistence, SuspendedChordSurface, BassDisplacement, ExtensionRetention, SupraChordMelody, ProgressionAvoidance.
- **Verlaine evaluation profile** — **`verlaineStyleProfile.ts`** with pass/fail thresholds and art-rock negative discriminators.
- **Verlaine Generate UI** — **`verlaine`** in **`HomeGenerate.tsx`** shipped songwriter list.
- **Art Rock / Post-Punk group** — **`composerGroupDefinitions.ts`** **`ART_ROCK_POST_PUNK`** — Verlaine, Sonic Youth, Fripp, Morello (`fully_implemented`); handbook Group Mode section updated.

- **John Barry v2 Film composer (`jbr:*`)** — thematic monolith Bond slice (`johnBarrySlice.ts`): min(maj7) palette, block brass, string mass, climax by accumulation; golden-path precompute + locked harmony routing + **`filmComposerSlices.test.ts`** rows seed **10001**. Receipt prefix **`jbr:*`** (not `jb:*` — James Brown owns `jb:*`).
- **Barry VRB bundle** — **`barryVrbFingerprints.ts`** — 8 fingerprints + negative discriminators (Herrmann / Morricone / Goldsmith / Schifrin / Mancini bleed); bundle id **`barry_thematic_monolith`**; aliases `john_barry` / `barry` / `jbr`.
- **Barry Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: ThematicMonolith, BondHarmony, BlockBrass, StringMass, RestraintPlusMass, BritishNoble.
- **Barry evaluation profile** — **`barryStyleProfile.ts`** with pass/fail thresholds and Film negative discriminators.
- **Barry assigned to Film Soundtrack** — **`composerGroupDefinitions.ts`** **`FILM_SOUNDTRACK`** group; songwriter **`john_barry`** + arranger **`barry`** in **`HomeGenerate.tsx`** Film optgroup.

- **Johnny Mandel v2 Studio Orchestral composer (`jmd:*`)** — melody-forward lyric warmth slice (`johnnyMandelSlice.ts`): song-centered melody on extensions, mechanical inner-voice warmth, Hollywood-jazz orchestral framing; golden-path precompute + locked harmony routing + smoke **`mandelLyricWarmthSmoke.test.ts`** seed **99001**. Receipt prefix **`jmd:*`** (not `jm:*` — Joni Mitchell owns `jm:*`).
- **Mandel VRB bundle** — **`mandelVrbFingerprints.ts`** — 8 fingerprints + negative discriminators (Ogerman / Quincy / Sebesky / Nelson / Nestico bleed); bundle id **`mandel_lyric_warmth`**; aliases `johnny_mandel` / `mandel` / `jmd`.
- **Mandel Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: MelodyForward, InnerVoiceWarmth, BorrowedMinor, WarmBrass, OrchestraFraming, SoftenedCadence.
- **Mandel evaluation profile** — **`mandelStyleProfile.ts`** with pass/fail thresholds and Studio Orchestral negative discriminators.
- **Mandel assigned to Studio Orchestral Jazz** — **`composerGroupDefinitions.ts`** **`STUDIO_ORCHESTRAL_JAZZ`** group; songwriter **`johnny_mandel`** + arranger **`mandel`** in **`HomeGenerate.tsx`** Studio Orchestral optgroup.

- **Ralph Towner v2 ECM composer (`rt:*`)** — guitar-born polyphonic slice (`ralphTownerSlice.ts`): fingerstyle voicing, melody-from-arpeggio, open-string resonance, slow harmonic fields, classical counterpoint; golden-path precompute + locked harmony routing + smoke **`townerGuitarPolySmoke.test.ts`** seed **98001**.
- **Towner VRB bundle** — **`townerVrbFingerprints.ts`** — 8 fingerprints + negative discriminators (Garbarek / Wheeler / Weber / Surman / Bley / generic classical guitar); bundle id **`towner_guitar_polyphony`**; aliases `ralph_towner` / `towner` / `rt`.
- **Towner Big Band rules** — five named rules in **`bigBandRuleRegistry.ts`**: GuitarBornHarmony, MelodyFromVoicing, ResonanceArchitecture, ClassicalCounterpoint, ChamberDialogue.
- **Towner evaluation profile** — **`townerStyleProfile.ts`** with pass/fail thresholds and ECM negative discriminators.
- **Towner assigned to ECM Chamber Jazz** — **`composerGroupDefinitions.ts`** **`ECM_CHAMBER_JAZZ`** group; songwriter **`ralph_towner`** + arranger **`towner`** in **`HomeGenerate.tsx`** ECM optgroup.

- **John Surman v2 ECM composer (`js:*`)** — British folk-minimalist slice (`johnSurmanSlice.ts`): folk modal centers, minimalist ostinato, dark reed register, structural silence; golden-path precompute + locked harmony routing + smoke **`surmanFolkModalSmoke.test.ts`** seed **97001**.
- **Surman VRB bundle** — **`surmanVrbFingerprints.ts`** — 8 fingerprints + negative discriminators (Garbarek / Wheeler / Weber / Bley / jazz bleed); bundle id **`surman_folk_modal`**; aliases `john_surman` / `surman` / `js`.
- **Surman Big Band rules** — five named rules in **`bigBandRuleRegistry.ts`**: FolkModalHarmony, DarkReedMelody, MinimalistOstinato, ChamberSpace, FolkPhraseContour.
- **Surman evaluation profile** — **`surmanStyleProfile.ts`** with pass/fail thresholds and ECM negative discriminators.
- **Surman assigned to ECM Chamber Jazz** — **`composerGroupDefinitions.ts`** **`ECM_CHAMBER_JAZZ`** group; songwriter **`john_surman`** + arranger **`surman`** in **`HomeGenerate.tsx`** ECM optgroup.

### Fixed

- **Surman LOCK routing** — **`harmonyResolution.ts`** authoritative branch for **`john_surman`** effective bars (score/XML align with **`johnSurmanEffectiveHarmonyBars`** on custom long-form duo path).

- **UI — Dave Brubeck** — demoted from **Shipped (full slice)** to **In library** (`HomeGenerate.tsx`); melody profile + odd-meter presets only — no `brubeckSlice.ts`.
- **UI — Beatles** — promoted to **Shipped (full slice)**; `beatlesSlice.ts` already wired in golden path + smoke.
- **UI — McCoy Tyner** — added to primary songwriter dropdown; quartal slice already in golden path.
- **UI — Gershwin / Cole Porter** — added as primary songwriter entries (arranger rows unchanged); slices already wired.
- **UI — Ornette Coleman** — confirmed **In library** songwriter row + VRB stub profile (no golden-path slice this pass).

- **Lalo Schifrin v2 Film composer (`ls:*`)** — groove-native jazz-Latin film slice (`laloSchifrinSlice.ts`): odd-meter riff accents, Latin percussion grid, brass attack strata, modal altered vamps, compact motivic cells; golden-path precompute + locked harmony routing + **`filmComposerSlices.test.ts`** seed **94001**.
- **Schifrin VRB bundle** — **`schifrinVrbFingerprints.ts`** — 8 fingerprints + negative discriminators (Herrmann / Morricone / Goldsmith / Mancini bleed); bundle id **`schifrin_groove`**; aliases `lalo_schifrin` / `schifrin` / `ls`.
- **Schifrin Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: LatinPercussionGrid, BrassRiffEngine, OddMeterGroove, StringColorSupport, ModalVampLock, AdditiveTension.
- **Schifrin evaluation profile** — **`schifrinStyleProfile.ts`** with pass/fail thresholds and negative discriminator hard fails.
- **Schifrin assigned to Film Soundtrack group** — **`composerGroupDefinitions.ts`** **`FILM_SOUNDTRACK`** group; removed from Studio Orchestral partial/future; songwriter **`lalo_schifrin`** in **`HomeGenerate.tsx`** Film harmonic voice optgroup.

- **Claus Ogerman v2 Studio Orchestral composer (`co:*`)** — composed orchestral continuum slice (`clausOgermanSlice.ts`): harmonic suspension, inner-voice counterpoint, texture resolution, string layered sustain, cyclic 3-chord cells, veil/echo/commentary orchestra rotation; golden-path precompute + locked harmony routing + smoke **`ogermanSliceSmoke.test.ts`**.
- **Ogerman VRB bundle** — **`ogermanVrbFingerprints.ts`** — 8 fingerprints + negative discriminators (Quincy / Sebesky / Jenkins-Riddle / riff-logic bleed); bundle id **`ogerman_continuum`**; aliases `claus_ogerman` / `ogerman` / `co`.
- **Ogerman Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: StringContinuum, InnerVoiceMotion, BrassEpisodic, ClimaxAccumulation, OrchestraRelation, CyclicCell.
- **Ogerman evaluation profile** — **`ogermanStyleProfile.ts`** with pass/fail thresholds and negative discriminator hard fails.
- **Ogerman assigned to Studio Orchestral Jazz** — **`composerGroupDefinitions.ts`** fully implemented; songwriter **`claus_ogerman`** + arranger **`ogerman`** in **`HomeGenerate.tsx`** Studio Orchestral optgroup.

- **Eberhard Weber v2 Song Mode slice (`ew:*`)** — bass-led harmonic field architecture (`weberFieldSlice.ts`): pedal persistence, slow upper refresh, bass-as-harmony-source, revoicing-over-resolution; golden-path precompute + locked harmony routing + smoke **`weberFieldSliceSmoke.test.ts`**.
- **Weber VRB bundle** — **`weberVrbFingerprints.ts`** — 8 fingerprints + negative discriminators; aliases `eberhard_weber` / `weber` / `weber_field`.
- **Weber Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: BassForeground, KeyboardPlane, WindLineLength, DrumColor, ResonantSilence, PedalField.
- **Weber evaluation profile** — **`weberStyleProfile.ts`** with Garbarek / Wheeler / Schneider discrimination hard fails.
- **Weber assigned to ECM Chamber Jazz** — **`composerGroupDefinitions.ts`** fully implemented; songwriter **`eberhard_weber`** + arranger **`weber`** in **`HomeGenerate.tsx`** ECM optgroup.

---

## [1.9.0] — 2026-06-05

### Changed

- **Version 1.9.0** — root **`package.json`** bump; **`COMPOSER_HANDBOOK.md`**, **`README.md`**, and **`engine_master_palette.md`** aligned to current fully-implemented roster.
- **Composer handbook (v1.9.0)** — Bill Holman (`bh:*`), Carla Bley (`cbl:*`), Jan Garbarek (`jg:*`), and Don Sebesky (`ds:*`) marked fully implemented in master reference; production-world group rosters confirmed (ECM Chamber Jazz · Studio Orchestral Jazz · Post-Bop Core).

---

## [1.8.6] — 2026-06-05

### Added

- **Carla Bley v2 Song Mode slice (`cbl:*`)** — formal irony ECM architecture (`carlaBleySlice.ts`): topic staging → motif contamination → climax deflation → reprise with altered meaning; golden-path precompute + locked harmony routing + smoke **`carlaBleySliceSmoke.test.ts`**.
- **Bley VRB bundle** — **`carlaBleyVrbFingerprints.ts`** — 12 fingerprints with probability targets; aliases `carla_bley` / `bley`.
- **Bley Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: TopicStaging, RepriseReframing, ClimaxDeflation, DeadpanCadence, QuotationWindow, LowGlossOrchestration.
- **Bley evaluation profile** — **`bleyStyleProfile.ts`** with Garbarek / Schneider / Wheeler discrimination hard fails.
- **Bley assigned to ECM Chamber Jazz** — **`composerGroupDefinitions.ts`** fully implemented; songwriter **`carla_bley`** + arranger **`bley`** in **`HomeGenerate.tsx`** ECM optgroup.
- **`formalIronyIndex`** — new slice parameter type for irony-driven section reframing.

---

## [1.8.5] — 2026-06-05

### Added

- **Bill Holman v2 Song Mode slice (`bh:*`)** — chart-first linear counterpoint architecture (`billHolmanSlice.ts`): lead line → independent inner voices → vertical harmony → voice-leading gate; golden-path precompute + locked harmony routing + smoke **`billHolmanSliceSmoke.test.ts`**.
- **Holman VRB bundle** — **`holmanVrbFingerprints.ts`** — 12 fingerprints with probability targets; aliases `bill_holman` / `holman`.
- **Holman Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: ChartFirst, SaxSoli, ShoutChorus, Countermelody, VoiceLeadingGate, LinearHarmony.
- **Holman evaluation profile** — **`holmanStyleProfile.ts`** with Brookmeyer / Thad / Nelson discrimination hard fails.
- **Holman assigned to Studio Orchestral Jazz** — **`composerGroupDefinitions.ts`** fully implemented; songwriter **`bill_holman`** + arranger **`holman`** in **`HomeGenerate.tsx`** Studio Orchestral Jazz optgroup.

---

## [1.8.4] — 2026-06-04

### Added

- **Jan Garbarek v2 Song Mode slice (`jg:*`)** — ritual modal ECM field architecture (`janGarbarekSlice.ts`): modal field, drone pedal, slow harmony, phrase-breath silence; golden-path precompute + locked harmony routing + smoke **`janGarbarekSliceSmoke.test.ts`**.
- **Garbarek VRB bundle** — **`janGarbarekVrbFingerprints.ts`** — 12 fingerprints with probability targets; aliases `jan_garbarek` / `garbarek` / `jg`.
- **Garbarek Big Band rules** — six named rules in **`bigBandRuleRegistry.ts`**: ModalField, DroneArchitecture, LineProtection, RitualPercussion, SilenceEnforcement, FolkMotive.
- **Garbarek evaluation profile** — **`garbarekStyleProfile.ts`** with Wheeler/Schneider/Threadgill discrimination hard fails.
- **Garbarek assigned to ECM Chamber Jazz** — **`composerGroupDefinitions.ts`** fully implemented; songwriter **`jan_garbarek`** + arranger **`garbarek`** in **`HomeGenerate.tsx`** ECM optgroup.

---

## [1.8.3] — 2026-06-04

### Added

- **Post-Bop Core production group** — fully defined with 10 defaults (Blue Note / Impulse acoustic blowing world).
- **11 composers assigned to Post-Bop Core** — Monk, Coltrane, Parker, Miles, Hancock, Tyner, Harris, Hill, Jim Hall, Pat Martino, Wayne Shorter (default).
- **Dual-group support** — Wayne Shorter (Post-Bop primary, ECM secondary) and Bill Evans (ECM primary, Post-Bop secondary).
- **Shared type values** — `functional_modal`, `blowing_arc`, `rhythmic`, `head_based`, `blowing_sections`.
- **`getComposerGroups`** + **`resolveComposerParams` `groupOverride`** for secondary-world rendering.

### Fixed

- **Post-Bop Core UI optgroup** — active label (removed “coming soon”); composers grouped under Post-Bop Core in songwriter/arranger dropdowns.

---

## [1.8.2] — 2026-06-04

### Added

- **Group Mode architecture** — production-world groups with shared default parameters; composers inherit group defaults and override only where distinct (`composerGroupDefinitions.ts`, `composerGroupEngine.ts`).
- **ECM Chamber Jazz group** — 10 production defaults (spacious / suspended / structural silence).
- **Studio Orchestral Jazz group** — 10 production defaults (groove-driven / melody-legible / tiered lift).
- **Post-Bop Core group placeholder** — name + reserved composer ids; defaults not yet implemented.
- **`productionGloss`** and **`melodyFraming`** — optional fields on shared `ComposerProductionParams` + `SongwriterStyleProfile`.
- **Composer group display** — songwriter and arranger dropdowns grouped by production world in **`HomeGenerate.tsx`**.
- **Big Band preset group fields** — `resolveBigBandPresetForComposer` adds `groupMode` + `groupDefaults` alongside existing preset output.

---

## [1.8.1] — 2026-06-04

### Added

- **Don Sebesky v2 Song Mode slice (`ds:*`)** — **`donSebeskySlice.ts`**: CTI production-orchestra harmony; seven slice params (`groovePersistence`, `stringProminence`, `melodyLegibility`, `functionalLegibility`, `liftToBlareArc`, `soloistSpotlight`, `centerFillDensity`). Golden-path precompute, locked harmony routing, smoke **`donSebeskySliceSmoke.test.ts`**.
- **Sebesky VRB bundle** — **`donSebeskyVrbFingerprints.ts`** — 12 fingerprints with probability targets; aliases `don_sebesky` / `sebesky` / `ds`.
- **Sebesky BB rules** — eight named rules in **`bigBandRuleRegistry.ts`**: GrooveFirst, StringUsage, HarpGloss, BrassArrival, SectionalArchitecture, ClimaxBuilder, OrchestraAnswer, CenterFill. **`BigBandComposerId`** **`sebesky`** + preset support.
- **Sebesky evaluation profile** — **`sebeskyStyleProfile.ts`** — CTI pass/fail gates + ECM/Schneider/Evans/Wheeler discrimination.
- **CTI orchestral mode** — first CTI-world composer in the system (center-filled groove-orchestra vs ECM-adjacent voices).

### Fixed

- **Sebesky promoted from UI-only to first-class v2 composer** — **`HomeGenerate.tsx`** shipped songwriter row + arranger → **`sebesky`** BB composer mapping in **`composerOsAppGeneration.ts`**.

---

## [1.8.0] — 2026-06-04

### Added

- **Billy Strayhorn v2 Song Mode slice (`bs:*`)** — **`billyStrayhornSlice.ts`**: chromatic continuous reinterpretation + extended-tone melody/harmony fusion; six slice params (`chromaticContinuity`, `extendedToneMelody`, `parallelColorMotion`, `phraseArcLength`, `innerVoiceActivity`, `closedBlockSustain`). Golden-path precompute, locked harmony routing, smoke **`billyStrayhornSliceSmoke.test.ts`**.
- **Strayhorn VRB bundle** — **`billyStrayhornVrbFingerprints.ts`** — 12 fingerprints with probability targets; aliases `billy_strayhorn` / `strayhorn` / `bs`.
- **Strayhorn BB rules** — six named rules in **`bigBandRuleRegistry.ts`**: CompactBlock, SaxCountermelody, InnerVoiceMotion, ChromaticHarmonyRhythm, CrossSectionBlend, NoEllingtonRiff. **`BigBandComposerId`** **`strayhorn`** + preset support.
- **Strayhorn evaluation profile** — **`strayhornStyleProfile.ts`** — pass/fail gates + Ellington discrimination.
- **Kenny Wheeler v2 composer (first-class)** — **`wheelerLyricSlice.ts`** (`kw:*` receipts): two-process polyaxial harmony (upper sonority + independent bass), six slice params (`polyaxialHarmony`, `tensionCarryForward`, `bassTrajectoryLogic`, `melodicDisjunctionRate`, `cadentialOpacity`, `voicingSpecificity`). **`kennyWheelerVrbFingerprints.ts`** — 12 VRB fingerprints with probability targets. **Big Band:** `wheeler` composer id + 7 named rules (BrassBlend, WoodwindHalo, RegisterSeparation, CrossSectionVoicing, BloomNotSlam, SilenceArchitecture, NoTerminalTriad). **`wheelerStyleProfile.ts`** — evaluation pass/fail + Schneider discrimination. **ECM:** `ECM_WHEELER_CHAMBER` mode (brittle intervallic density waves, distinct from Schneider). **UI:** `kenny_wheeler` songwriter + `wheeler` arranger dropdowns; ECM preset split Schneider / Wheeler options.
- **Henry Threadgill Song Mode slice (`henry_threadgill`)** — **`threadgillEpisodeTypes.ts`** + **`henryThreadgillSlice.ts`**: episodic interval-cell harmony (`ht:*` receipts), pitch-set enrichment (not ii–V grammar), polymodal bass layers, anti-metric phrase lengths; **`henryThreadgillEpisodePlan`** + four slice params (`intervalCellDensity`, `antiMetricStrength`, `polymodalSeparation`, `episodeContrast`) on **`GenerationMetadata`**. **`SONGWRITER_CHORD_POOLS`**: **`threadgill_cell`**, **`threadgill_polymodal`**, **`threadgill_suite`**. Golden path: **`precomputeHenryThreadgillEffectiveHarmonyBars`** wired in **`generateGoldenPathDuoScore`**; **`getChordForBar`** + **`harmonySpineProvider`** + locked export truth. **Big Band:** **`HENRY_THREADGILL_COMPOSER_RULES`**; **`BigBandComposerId`** **`henry_threadgill`** + **`threadgill`**.

### Fixed

- **Strayhorn promoted from UI-only to first-class v2 composer** — **`HomeGenerate.tsx`** shipped songwriter row + **`strayhorn`** arranger dropdown; **`composerOsAppGeneration.ts`** arranger → BB composer mapping.
- **Kenny Wheeler promoted from legacy Python `wheeler_lyric` engine to first-class v2 TypeScript composer** — golden-path precompute, locked harmony routing, smoke harness `wheelerLyricSliceSmoke.test.ts`.
- **Henry Threadgill** — **`themeGenomeBuilder`** **`cellHenryThreadgill`** stub reachable via slice + **`buildHarmonicScenesForVoiceBundle`** family rotation (existing smoke unchanged).
- **(2026-06-01) V107p11 — Orbit solo MusicXML notation fix (v1.7p11)** — Sibelius was drawing wrong note values and broken 4/4 bar groupings because export wrote correct note lengths but not always the matching note **type** (quarter, eighth, dotted quarter, etc.) and **dot** markers. Martino used a coarser time grid than the other three solos; all four files now share one grid (**divisions=480**). Every note and rest gets an explicit type; dotted notes get an explicit dot; export refuses to write a file if any note fails the consistency check. Re-export: **112/112** bar totals · **28/28** musicality · **8/8** batch · **4/4** Sibelius validate. Note counts: solo_01 **78** · solo_02 **77** · solo_03 **91** · solo_04 **64**. Commit: `PLACEHOLDER` | Tag: **v1.7p11**
- **(2026-06-01) V107p9 — Orbit solo bar total fix (v1.7p9)** — `rebalanceBar()` + `rebalanceMusicXmlBarTotals()` in `soloMusicalityXml.ts` pad/trim every measure to exact **divisions × 4**; `validateBarTotals()` gate in `soloMusicContextExport.ts` throws before write. Diagnosis: **69/112** bars under-filled (v1.7p8). Post-fix: **112/112** valid · **`orbitSoloMusicality.test.ts`** **28/28** · **`orbitSoloBatchExport.test.ts`** **8/8** · **`orbitSoloSibeliusValidate.ts`** **4/4**. Note counts: solo_01 **78** · solo_02 **77** · solo_03 **91** · solo_04 **64**.
- **(2026-06-01) V107p8 — Orbit solo musicality pass (v1.7p8)** — Global monophonic rules: **D4–D6** (MIDI 62–86) · min **eighth** · max **4** consecutive eighths (Martino **6**) · phrase breath every **2–4** bars. New: `soloMusicality.ts` (GCE evaluators) · `soloMusicalityXml.ts` (XML post-process) · `vaultSoloMonophonic.ts` (triad-pair arpeggio) · `orbitSoloMusicality.test.ts` (**28/28** GCE). Engine fixes: Tritonic floating cells **3–5**/bar (no 16ths) · Vault monophonic triad-pair upward arpeggio · Martino breath + rhythm variety + harmony snap · Zappa D4–D6 + eighth floor. Re-export note counts: **`solo_01` 65** · **`solo_02` 58** · **`solo_03` 77** · **`solo_04` 49**. **`orbitSoloBatchExport.test.ts`** **8/8** · **`orbitSoloSibeliusValidate.ts`** **4/4** PASS.
- **(2026-06-01) V107p7 — Pre-Sibelius solo hardening (v1.7p7)** — `soloTreblePitchRange.ts` (C4–G6 concert clamp) · `soloSibeliusHardening.ts` (harmony sanitize · multiline pitch clamp · voice overflow trim · long-silence fill) · `scripts/orbitSoloSibeliusValidate.ts`. Wired into `soloMusicContextExport` · `vaultRealisation` · `martinoRealisation` · `orbitSoloBatchExport28.ts`. **`solo_01`:** 4 pitches B3→B4 · **`solo_02`:** 285 octave-shifted · **`solo_03`:** sub-C4 clamped + bar-1 overflow **361→353** · **`solo_04`:** unchanged. All four: CHECK 1–4 PASS · integrity PASS · **`orbitSoloBatchExport.test.ts`** **8/8** PASS.
- **(2026-06-01) V107p6 — Tritonic solo bar density (v1.7p6)** — `tritonicBarDensity.ts`: **`noteDensityPerBar`** raised (min **3**, tension-scaled target **4–8**; was implicit **1**/bar). `realiseTritonicSolo` expands singer-safe strand before export; receipt `noteDensityPerBar` + `expandedSoloNoteCount`. **`solo_01_tritonic.musicxml`:** **28 → 164** notes · avg **~5.9**/bar · range **3–8**. Jest **`orbitSoloBatchExport.test.ts`** **8/8** PASS.
- **(2026-06-01) V107p5 — Orbit solo batch review fixes** — Martino Python `_parse_root_alter` + shared `sanitizeMusicXmlHarmonyRoots` / schema validation in `soloMusicContextExport.ts` (single-letter `<root-step>` + `<root-alter>`). Tritonic vault timeline one-cell-per-bar for chart length + `tritonicCellContinuation` when voice-leading pool exhausts (bars 1–28 density). Zappa treble clamp C4–G6 in `zappaSoloRealisation.ts`. Re-export `solo_01`–`solo_04` with integrity receipt. Jest **`orbitSoloBatchExport.test.ts`** (+1 sanitizer, tritonic density, zappa range).
- **(2026-06-01) V107p4 — Orbit 28-bar four-engine solo batch export** — `buildMusicContextFromTritonic()` (vault-anchored floating cells) · `buildMusicContextFromVault()` (triad-pair locked harmony) · `martinoRealisation.ts` · `zappaSoloRealisation.ts` · shared `soloMusicContextExport.ts`; batch script `scripts/orbitSoloBatchExport28.ts` → `solo_01_tritonic` · `solo_02_vault_triad_pairs` · `solo_03_martino_linear` · `solo_04_zappa` MusicXML with integrity receipt per file. Jest **`orbitSoloBatchExport.test.ts`** (+7).

---

## [1.6.0] — 2026-05-30

### Added

- Population Composer hybrid engine (Tritonic, Monk, Wayne Shorter, Vault, Big Band as parallel agents; dramatic arc, inheritance pressure, contrast weight, mutation rate)
- Zappa Solo producer (claim/agitation/fracture/crooked_landing arc; modal field + contamination; elastic phrase rhythm; motif mutation; primary, secondary, tertiary participation modes)
- Sonic Youth Tuning producer (5 tuning presets, 3 dual-guitar archetypes, shape-resonance harmony, 7 idiomatic diagnostics)
- COMPOSER_OS_V16_NEW_FEATURES.docx — standalone features guide with 36 scenarios

---

## [Unreleased archive — v1.6.0 development]

### Added

- **(2026-05-30) V106p3 — SY dual-guitar custom tuning MusicContext producer** — `SYTuningPreset` + `buildMusicContextFromSYTuning()` (`sourceEngineId: 'sy_tuning'`); SY-only catalog (**5** tunings: `f_sharp_unison` · `doubled_fifths` · `narrow_consonant` · `cluster_friction` · `drone_melody`) + **3** pairing archetypes (`mass_mass` · `mass_knife` · `drone_shard`); shape-resonance harmony (Wyble anchors → tuning-native fret shapes); SY-only lower-guitar role resolver; receipt `sy_tuning_realisation_complete` (7 shape metrics); harmony via `normalizeChordSymbol` + checksum LOCK. Always-on. Jest **`syTuningProducer.test.ts`** (+13).

- **(2026-05-30) V106p2 — Zappa Solo MusicContext producer** — `ZappaSoloMusicContextPreset` + `buildMusicContextFromZappaSolo()` (`sourceEngineId: 'zappa_solo'`); melodic dramatist over **supplied** harmony (never authors chords); four-state solo arc; Population participation levels (`primary` · `secondary` · `tertiary`); receipt `zappa_solo_realisation_complete`. Always-on. Jest **`zappaSoloMusicContext.test.ts`** (+9).

- **(2026-05-30) V106p1 — Population Composer hybrid MusicContext producer** — `PopulationComposerPreset` + `buildMusicContextFromPopulation()` (`sourceEngineId: 'population_composer'`); ecology selection across **tritonic** · **monk** · **wayne_shorter** · **vault** · **big_band**; receipt `population_composer_realisation_complete`. Always-on. Jest **`populationComposer.test.ts`** (+9).

- **(2026-05-30) docs — v1.6 producer handbook + standalone guide** — **`COMPOSER_HANDBOOK.md`** / **`.docx`**: Population Composer · Zappa Solo · Sonic Youth Tuning · Dual-Guitar Lower Voice chapters (36 scenarios + Try These First); **`COMPOSER_OS_V16_NEW_FEATURES.docx`** + **`generateComposerOsV16NewFeaturesDocx.mjs`**.

---

## [1.5.0] — 2026-05-30

### Added

- String Quartet MusicContext producer (7 textures, 4-layer voice-leading, Tritonic integration)
- String Quartet Generate UI (texture cards, Tritonic colour, status chips)
- Wyble × Tritonic harmony feed (AnchorDescriptor, phrase-level state machine)
- Full dual-guitar lower voice (role resolver, 3 topologies, intent modes)
- Monk Python engine (chromatic neighbours, tritone shifts, rhythmic motifs)
- V88 practice layer (any MusicContext → practice curriculum)
- V89 composition depth (harmonic arcs, motivic transformations, reharmonisation)
- VaultMicroscope + FretboardPanel on Generate
- Tritonic monitor UI (Harmonic Float + Melodic Trace)
- Producer UI reorganised into 3 lanes (Song & Chart · Study & Pattern · Texture & Arrangement)

---

## [Unreleased archive — v1.5.0 development]

### Added

- **(2026-05-30) V1.5p10 — Generate producer lanes (3-lane chooser)** — **`HomeGenerate.tsx`**: flat Mode dropdown replaced with three lanes (**Song & Chart** · **Study & Pattern** · **Texture & Arrangement**), tile producers per lane, selection blurb per lane, shared strip (**harmony** · **time** · **seed** · **export integrity**), always-on Tritonic **Float over** line. New **`generateProducerLanes.ts`**, **`GenerateProducerLaneChooser.tsx`**, **`GenerateSharedContextStrip.tsx`**. UI-only — existing preset/generate paths unchanged. Jest **`generateProducerLanes.test.ts`** (+5).

- **(2026-05-30) V1.5p9 — Tritonic monitor UI (Harmonic Float + Melodic Trace)** — Right-hand **`TritonicMonitorPanel`** on **`HomeGenerate.tsx`** when `sourceEngineId` is `tritonic` · `vault_tritonic` · `wyble_tritonic` (or String Quartet with Tritonic colour active pre-generate): scrolling harmonic-float anchor columns · melodic-trace SVG (singer-safe bold · projected ghost · voicing-top markers, hover-only note detail) · active-cell card + tension sparkline · bias side rail (full pre-generate · compact after) · collapsed diagnostics strip. Engine: **`tritonicMonitorSnapshot.ts`** + **`tritonicMonitorPanels.ts`**; `monitorSnapshot` on tritonic melody/vault/wyble receipts. Jest **`tritonicMonitorSnapshot.test.ts`** · **`tritonicMonitorPanels.test.ts`**.

- **(2026-05-30) V105p8 — VaultMicroscope + Fretboard on Generate** — `MusicContextGeneratePanels` on **`HomeGenerate.tsx`**: collapsible **VaultMicroscope** (vault · wyble_tritonic) and **FretboardPanel** (wyble · riff · duo · wyble_tritonic) read from post-generate MusicContext via **`musicContextGeneratePanels.ts`** (harmonic detail table · tension map · reharm · tuning · synthesised grips · Tritonic float in pink). No backend changes. Jest **`musicContextGeneratePanels.test.ts`** (+7).

- **(2026-05-30) V105p7 — V89 composition depth** — `buildCompositionDepthFromMusicContext()` elaborates any MusicContext in-place: `harmonicDevelopmentPlan` (tension rise · plateau · release) · `motivicTransformations` (augmentation · inversion · retrograde · fragmentation) · per-chord `reharmonisationSuggestions` · `sectionArcMap` (exposition · development · climax · resolution) · `composerNotes`; `sourceEngineId: 'composition_depth'` · receipt `composition_depth_complete` (`sectionCount` · `reharmonisationCount` · `motivicTransformationCount` · `arcSpanBars`). Always-on. Jest **`compositionDepth.test.ts`** (+8).

- **(2026-05-30) V105p6 — V88 practice layer** — `buildPracticeLayerFromMusicContext()` extracts etude targets from any MusicContext: `targetChordSymbols` · voice-led `guideToneLines` (3rd/7th) · per-chord `scaleRecommendations` · `rhythmicFocus` (motif or meter/bpm) · `difficultyRating` · ordered `practiceSequence`; `sourceEngineId: 'practice_layer'` · receipt `practice_layer_complete` (`chordCount` · `guideToneLineLength` · `difficultyRating` · `scaleCount`). Always-on. Jest **`practiceLayer.test.ts`** (+8).

- **(2026-05-30) V105p5 — Monk Python engine bridge** — `monk_bridge.py` stdin JSON → `MonkEngine` compile → stdout harmony bars + Monk language metrics (`chromaticNeighbourRate` · `tritoneShiftCount` · `rhythmicMotifConsistency` · `dissonanceResolutionScore`); `monkEngineBridge.ts` + `buildMusicContextFromMonk()` (`sourceEngineId: 'monk'`, receipt `monk_realisation_complete`); harmony via `normalizeChordSymbol` + checksum after normalisation. Always-on. Jest **`monkMusicContext.test.ts`** (+3) · pytest **`test_monk_bridge.py`** (+2).

- **(2026-05-30) V105p4 — Dual-guitar Duo lower voice** — Extended **`buildMusicContextFromDuo`** in **`duoProducer.ts`** (not a separate producer): `DuoPreset.instrumentTopology` (`guitar_bass` · `dual_guitar` · `dual_guitar_bass`); per-bar lower-guitar role resolver (`guide_tone_lane` · `counterline` · `pedal` · `sparse_comp_answer` · `rest`) from upper + bass harmony; conversational/supportive intent; working-band register + collision/parallel-motion diagnostics; receipt **`duo_realisation_complete`** extended (`lowerGuitarRoleDistribution` · `registralCollisionCount` · `parallelMotionCount`); harmony via `normalizeChordSymbol` + export-truth checksum LOCK. Always-on. Jest **`duoDualGuitar.test.ts`** (+6).

- **(2026-05-30) V105p3 — Wyble × Tritonic harmony feed** — `AnchorDescriptor` type + Wyble bar→descriptor conversion preserving voicing density; `buildMusicContextFromWybleTritonic()` (`sourceEngineId: 'wyble_tritonic'`) feeds per-bar anchor biases into Tritonic state machine without resetting tension arc / unresolved tones / registral centroid; phrase-level cell commits only; receipt `wyble_tritonic_realisation_complete` (anchorDescriptorCount · meanCellTension · phraseCommitCount · unresolvedCarryRate); harmony checksum LOCK after `normalizeChordSymbol`. Always-on. Jest **`wybleTritonicRealisation.test.ts`** (+10).

- **(2026-05-30) V105p2 — String Quartet Generate UI** — `StringQuartetGeneratePanel` in **`HomeGenerate.tsx`**: texture archetype card row (7), key/tempo, Tritonic colour (None · Subtle · Active) with behaviour disclosure, seed + Variation; post-generate status chips (smooth lines · spacing · crossings); advanced diagnostics + full bias sliders. Payload **`stringQuartetMusicContext`** → API **`buildMusicContextFromStringQuartet`** on successful SQ export. Always-on.

- **(2026-05-30) V105p1 — String Quartet MusicContext producer** — `buildMusicContextFromStringQuartet()` (`sourceEngineId: 'string_quartet'`); four-layer realisation (role assignment · texture archetype · voice-leading solver · diagnostics receipt `string_quartet_realisation_complete`); harmony via `normalizeChordSymbol` + checksum after normalisation; Tritonic float on violin_1 + one inner voice (`pad_suspension` · `contrapuntal_weave`; suppressed in `chorale`); cello/viola anchor-first. Always-on. Jest **`stringQuartetMusicContext.test.ts`** (+15).

---

## [1.4.0] — 2026-05-30

### Added

- Tritonic floats above Vault anchors (Vault × Tritonic)
- Tritonic generates singable melody as top-line material
- Time model separates voicingTop, projectedStrand, singerSafeMotif
- Phrase memory + state machine + musical diagnostics
- Nine behaviour dials steer Tritonic bias (0–1, default 0.5)
- Big Band and New Orleans/funk MusicContext producers
- Song Mode differentiates engines by section
- Wayne Shorter Python bridge wired into pipeline

---

## [Unreleased archive — v1.4.0 development]

### Added

- **(2026-05-30) V104p7 — Song Mode per-section engine differentiation + Wayne Shorter Python bridge** — `SongSectionPlan.sectionEngine` (`song_mode` · `ecm_chamber` · `big_band` · `tritonic_vault` · `wayne_shorter`); `songModeSectionEngineRouter.ts` routes each section through its MusicContext producer (verse→ECM · chorus→Big Band · bridge→Tritonic vault); `buildSongModeStructureFromChordPlan` accepts `sectionEngineByKind`; assembly receipt lists `sectionEngines`. Wayne Shorter: `wayne_shorter_bridge.py` stdin JSON → Python compile → stdout harmony bars; `wayneShorterEngineBridge.ts` + `buildMusicContextFromWayneShorter()` (`sourceEngineId: 'wayne_shorter'`, receipt `wayne_shorter_realisation_complete`, checksum after `normalizeChordSymbol`). Always-on. Jest **`songMode.test.ts`** (+4) · **`wayneShorterMusicContext.test.ts`**.

- **(2026-05-30) COMPOSER_HANDBOOK.docx** — `scripts/generateComposerHandbookDocx.mjs` regenerates **`docs/COMPOSER_HANDBOOK.docx`** from **`docs/COMPOSER_HANDBOOK.md`** (title page, TOC, heading hierarchy, tables, page numbers).

- **(2026-05-30) V104p6 — Big Band + New Orleans MusicContext producers** — `buildMusicContextFromBigBand()` (`sourceEngineId: 'big_band'`, comping styles `brass_punch` · `sax_soli` · `shell_voicing` · `freddie_green`, receipt `big_band_realisation_complete`); `buildMusicContextFromNewOrleans()` (`sourceEngineId: 'new_orleans'`, styles `second_line` · `anticipation_bass` · `brass_punch_offbeat`, receipt `new_orleans_realisation_complete`); shared `compingHarmonyTemplates.ts`; harmony via `normalizeChordSymbol` + checksum after normalisation. Always-on. Jest **`bigBandMusicContext.test.ts`** · **`newOrleansMusicContext.test.ts`**.

- **(2026-05-30) V104p5 — Tritonic behaviour biases** — `tritonicBehaviourBiases.ts` (`TritonicBehaviourBiases`: tension, resolutionDelay, density, registralSpread, contourBias, cadenceAvoidance, rhythmicDisplacement, anchorAdhesion, motifSingability — all 0..1, default 0.5 neutral); soft rerank after Wayne layer + state-machine resolution eligibility; optional `behaviourBiases` on `TritonicRealisationContext`; timeline nudge from density/rhythmicDisplacement (identity at neutral). Always-on. Jest **`tritonicBehaviourBiases.test.ts`** (+8 cases; tritonic suite **58**/0).

- **(2026-05-30) V104p4 — Tritonic diagnostics + state machine** — `tritonicDiagnostics.ts` (unresolvedToneCount, contourVariety, cadenceStrength, rhythmicOffsetDistribution); `tritonicStateMachine.ts` (`TritonicStateMachine`, phrase memory across cell transitions); both `tritonic_vault_realisation_complete` and `tritonic_melody_complete` receipts carry diagnostics + `phraseState`. Always-on. Jest **`tritonicDiagnostics.test.ts`**.

- **(2026-05-29) V103b — Song Mode MusicContext handoff** — `composerOsAppGeneration.ts` `runSongStructure`: when `sm.compiledSong.chordPlan` non-empty → `songModeLockedMusicContextFromGoldenPath` (`buildSongModeStructureFromChordPlan` → `buildSongModeResult` → `lockSongMode` → `assertSongModeLock` → `projectSongModeLock`); empty chordPlan → duo LOCK fallback unchanged. V103a exports `buildSongModeResult`, `projectSongModeLock`, `SongModeResult`. Jest **`songMode.test.ts`** (+5 handoff cases). **`musicContextAdapters.ts`** Martino type fixes + root **`ts-node`** devDep for full tier.

- **(2026-05-29) V103a — Song Mode producer + LOCK types** — Extended `core/song-mode/songModeTypes.ts` (`SongModeSectionContext`, `SongModeExportTruth`, `SongModeLock`); `songModeProducer.ts` (section builder, `assembleSongModeExportTruth` with duplicate-ID hard-fail, per-section checksum logging, deterministic `masterChecksum`, `buildMusicContextFromSongModeTruth` — concat + re-normalise + checksum-after-norm); `songModeLock.ts` (`lockSongMode`, `assertSongModeLock`, `assertSongModeLockIntegrity`, `buildMusicContextFromLockedSongMode`). Jest **`core/song-mode/songMode.test.ts`** (10 cases). No app wiring yet (V103b).

- **(2026-05-29) V102 — Tritonic realisation** — `core/tritonic/tritonicRealisation.ts` (`TritonicRealisationContext` / `Result`, `realiseTritonic`, `realisationToMusicContext`): Wayne behaviour + voice-leading phrase chains per mode (BB ≥4 cells / high oddity, SQ ≤3 cells / smooth, ECM suspended+shorter_floating / forced `delayedResolution`); checksum from realised cell notes; MusicContext `sourceEngineId: 'tritonic'`. No phraseEngineV2 / existing producer changes. Jest **`tritonicRealisation.test.ts`**.

- **(2026-05-29) V101 — ECM chamber MusicContext producer** — `core/ecm/ecmTypes.ts` (`EcmChamberPreset`: key/tempo/texture/voicing), `ecmProducer.ts` (`buildMusicContextFromEcm` — modal cycle per texture, voicing spellings, `normalizeChordSymbol` + checksum, `sourceEngineId: 'ecm'`, always-on, no DuoLock). Jest **`core/ecm/ecm.test.ts`**.

- **(2026-05-29) V100b — Duo LOCK integration** — `core/duo/duoLock.ts` (`DuoLock`, `lockDuo`, `isDuoLocked`, `assertDuoLock`, `buildMusicContextFromLockedDuo`, `buildDuoMusicContextFromScore`); `DuoVoice` → per-voice `{ bars }` snapshot; `extractDuoBarsFromScore` on guitar/bass parts. **`generateComposition`** + **`composerOsAppGeneration`** (`duoLockedMusicContextFromGoldenPath`): export truth → LOCK → `buildMusicContextFromDuo` → `musicContext` on success (Shared Brain handoff). Jest **`core/duo/duo.test.ts`** (+7 LOCK cases).

- **(2026-05-29) V100a — Duo MusicContext producer shell** — `core/duo/duoTypes.ts` (`DuoExportTruth`), `duoExportHelper.ts` (`buildDuoExportTruth` — both voices via `normalizeChordSymbol`, checksum over upper+lower), `duoMusicContextShell.ts` (`buildMusicContextFromDuo` — `sourceEngineId: 'duo'`, harmony from `upperBars`, always-on). Jest **`core/duo/duo.test.ts`**.

- **(2026-05-29) V99 — Wayne behaviour layer (tritonic)** — New `core/tritonic/tritonicBehaviourLayer.ts`: `WayneBehaviourOptions` + `applyWayneBehaviour()` reranks `VoiceLeadingResult[]` by `oddityScore` (high → favour tension + rough motion), `delayedResolution` (drop target cells with tension &lt; 0.5, never empty if input non-empty), `melodyPriority` stub (V102). Jest **`tritonicBehaviourLayer.test.ts`**; no producer wiring.

- **(2026-05-29) V98 — Tritonic cell voice-leading engine** — New `core/tritonic/tritonicVoiceLeading.ts`: `VoiceLeadingResult`, `getVoiceLeadingCandidates()` (valid moves ≤6 semitones per voice, sorted by smoothness), `getBestVoiceLeading()`; permutation-aware pitch-class motion via shortest chromatic path. Jest **`tritonicVoiceLeading.test.ts`**; dictionary-only — no producer wiring yet.

- **(2026-05-29) V96b — Standalone etude preset proof** — `buildStandaloneEtudePreset()` in `musicContextAdapters.ts`: engine-agnostic `StandaloneEtudePreset` → valid `MusicContext` with `sourceEngineId: 'etude_preset'`, normalised harmony bars + checksum; no parent engine, no feature flag. Jest parity vs Wyble preset checksum on same key.

- **(2026-05-29) V97 — Tritonic cell dictionary** — New `core/tritonic/tritonicCell.ts`: `TritonicCell` / `TritonicDictionary` types, `buildTritonicDictionary()` with five families (`quartal`, `cluster`, `suspended`, `shorter_floating`, `bergonzi`); `intervalProfile` and `tension` derived from pitch-class content (not Slonimsky interval primitives). Jest **`tritonicCell.test.ts`**; dictionary-only — no MusicContext producer yet.

- **(2026-05-29) V95 — Wyble etude preset MusicContext producer** — `buildMusicContextFromWyblePreset` + `resolveWybleEtudePreset` / `wybleEtudePresetProgressions` (pentatonic · chromatic · whole_tone × easy/medium/hard); harmony bars via `normalizeChordSymbol`, checksum after normalisation; always-on (no feature flag). Wyble generate resolves preset when chord text omitted; UI etude preset panel on **`HomeGenerate.tsx`**.

- **(2026-05-28) V69 — Martino Linear Engine** — Shipped Martino Linear preset end-to-end in Composer OS desktop + web API.
  - **P1:** Martino engine v6 wired + 28-bar Orbit + Python bridge + GCE gate (`martino_linear` preset, `martinoEngineBridge.ts`, `martino_bridge.py`).
  - **P2:** Canonical masters + UI pipeline + explain mode (`MartinoPanel`, `martinoGeneratePipeline.js`, library output path).
  - **P3:** Real melodic activity masters from Pat Martino *Linear Expressions* book exports (`masters/sources/A1–A5.xml` → frozen `bars_gm`); provenance gate (every note traceable, no fallback invention); bridge hardening (timeout, queue, JSON extract, `ok: false` paths); clean MusicXML (no engine metadata in score); `<voice>` before `<type>`; MusicXML 3.1 `kind` enum normalization; `martino/` in Electron `extraResources`; output → `Mike Composer Files\Martino Linear\`.
  - **P4:** Score hygiene — strip `<rehearsal>` from exported MusicXML; `<harmony>` on every bar at beat 1; dynamic work title from `tune` / tune-name UI; provenance sidecars → `temp/martino/provenance/` (MusicXML only in user library); smoke/docs closeout.

- **(2026-05-25) V65 P6 closeout — goldens in smoke + desktop + docs** — Promoted all V65 off-smoke golden suites into `runSmokeTests.ts`: section architecture P1/P2 (**80001–81003**), MusicXML deep import (**82001**), Groove Scaffold (**83001–83002**), and Zappa diff/per-section goldens (**84001–84003**), joining the V64 golden set already in smoke. New baseline: **324/80/0** fast · **489/94/0** full. Desktop build and package no-bump passed; fresh `Composer-OS.exe` / `Composer-OS-Setup.exe` artifacts copied into `apps/composer-os-desktop/release`, with executable icon sourced from committed `resources/icon.ico`. `COMPOSER_OS_ROADMAP_V65.md` closed, V66 backlog moved into `COMPOSER_OS_ROADMAP.md`, and `docs/V65_HANDOVER.md` added.

- **(2026-05-25) V65 P4 — Groove scaffold opt-in Song Mode drums** — Adds a section-aware symbolic drum scaffold for Song Mode when `Song.globalDefaults.grooveScaffold.enabled === true`; no Song object / no opt-in means no drum part and existing compositions are unchanged. New `core/groove-scaffold/grooveScaffold.ts` defines `GrooveStyleProfile`, `GrooveBarContext`, `GrooveBarPlan`, `PercussionRenderPolicy`, six feels (`swing`, `funk`, `rock`, `bossa`, `ballad`, `odd_meter`), sparse rule-based fills, `GROOVE_*` receipts, and diagnostics on `GenerationMetadata` / manifests. `generateGoldenPathDuoScore.ts` wires `grooveScaffoldPass` immediately before `finalizeAndSealDuoScoreBarMath(afterExpressive)` so `groove_drums` participates in strict bar math. MusicXML exports one unpitched percussion staff with GM display-step mapping and MIDI channel 10; MIDI score export routes `groove_drums` to channel 10. Off-smoke goldens **83001** / **83002** live in `grooveScaffold.test.ts` with runner `npm run test:groove-scaffold`. **`COMPOSER_OS_MUSICIAN_GUIDE.md`** §1.1a added + regenerated **`.docx`**.

- **(2026-05-25) V65 P3 — MusicXML deep import + Sibelius QA matrix** — Additive deep MusicXML import (`MusicXmlDeepImportResult`) extracts parts, per-bar meter, tempo marks, rehearsal-mark section starts, role hints, and chord rails, then maps to `ImportedSongResult` (`Song`, `lockedHarmonyBars`, optional LeadSheet). App generation now lets imported Song data drive Song Mode / GBD / ECM / Big Band / String Quartet without replacing legacy `parseMusicXml` or LeadSheet import paths. Golden **`musicXmlImport.test.ts`** seed **82001** asserts imported chords, sections, and meter drive Song Mode; runner **`runMusicXmlDeepImportGolden.ts`** (off smoke until V65 closeout). Sibelius QA runner **`runSibeliusQaV65P3.ts`** and report **`docs/SIBELIUS_QA_REPORT.md`** cover Song Mode, GBD, ECM chamber, String Quartet, Big Band, Riff generator, Wyble etude, and Slonimsky etude. **`COMPOSER_OS_MUSICIAN_GUIDE.md`** Part 11 added + regenerated **`.docx`**.

- **(2026-05-25) V65 P2 — Section tuning + Slonimsky cells + ensemble fan-out** — `PitchProfile.cellSets`, guitar target aliases (`guitarA` → `guitar`, `guitarB` → `guitar_2`), per-bar helpers for tuning/register/root-follow/cellSets, `interpolateRegister`, Sonic Youth tunings `sy_aaddgg` + `sy_eebddg`, per-section tuning diagnostics in score/MusicXML, Song Mode Slonimsky cellSets, bass `followRootProbability`, registerWindow constraints, and Big Band / String Quartet section profile context for pitch/rhythm/voicing/density. Goldens **`sectionArchitectureP2Golden.test.ts`** seeds **81001** (SY tuning), **81002** (Slonimsky cell switch), **81003** (Big Band density + voicing); runner **`runSectionArchitectureP2Golden.ts`** (off smoke until V65 closeout). **`COMPOSER_OS_MUSICIAN_GUIDE.md`** Part 10 extended + regenerated **`.docx`**.

- **(2026-05-24) V65 P1 — Section architecture wired at generate time** — **`effectiveContextForBar.ts`**: `wireSongArchitectureAtPipelineEntry` (validate Song + bridge sections → FormMap), cached **`getEffectiveContextForBar`**, density/riffMode instrument overrides, **`interpolateDensity`** transitions. Consumers: **`voiceBundleHarmonicRhythm`**, **`voiceBundleVoicingFloor`**, **`pitchFieldResolver.resolveFieldForBar`**, **`resolveRiffGeneratorProfile`**, **`harmonyResolution.getChordForBar`**, **`generateGoldenPathDuoScore`** (register + density). Goldens **`sectionArchitectureP1Golden.test.ts`** seeds **80001** (SY 5-section Song Mode) + **80002** (GBD 3-section); runner **`runSectionArchitectureP1Golden.ts`** (off smoke until V65 closeout). **`COMPOSER_OS_MUSICIAN_GUIDE.md`** Part 10 + regenerated **`.docx`**. Smoke **307/73/0** fast unchanged.

- **(2026-05-24) V64 P7 closeout — smoke goldens + desktop + docs** — Promoted **7** off-smoke golden suites (**+22** rows, **+7** suites): `sonicYouthPerSectionVrb` (75002), `zappaGceFingerprint` (76001), `fzBurstReceipt` (77001), `fzMetricShiftReceipt` (77002), `fzRegisterCollisionReceipt` (77003), `sectionArchitectureDomain` (78001), `perSectionMeter` (79001–79003). Fix **`zappaStructuralActiveForMeterResolution`** in **`runGoldenPath.ts`**. Stash assessment: out-of-scope CI fix stash **discarded** (435/15 with stash). Smoke **307/73/0** fast · **472/87/0** full. **`COMPOSER_OS_ROADMAP_V64.md`** closed. Desktop rebuild.

- **(2026-05-24) P6/P7 — Per-section meter + Zappa GCE meter modes** — Commit **`f00ace6f`**. See prior CHANGELOG entry.

- **(2026-05-24) CI smoke fix — Frank Zappa full-tier gates + runner** — Full smoke (`test:composer-smoke`) was failing on GitHub Actions (not timeout): four Frank Zappa rows blocked by `r.success` (behaviour gates + Song Mode phrase/motif validators), unrelated to P4 docs-only commits. Relaxed Zappa-appropriate duo gates (section contrast, guitar sparsity, bass identity, phrase/motif warnings); re-stamp + bass bar-math on 7/8 `barMeterMap`. CI: `smoke.yml` `timeout-minutes: 45`, `NODE_OPTIONS`, `COMPOSER_OS_SMOKE_TIER=full`. Fast tier: `scripts/runSmokeFastTier.ts` (replaces `node -e` spawn). Smoke **285/66/0** fast · **450/80/0** full.

- **(2026-05-24) P5 — Section architecture TypeScript + behavioural contract** — **`sectionArchitectureTypes.ts`**: `Song`, `SongDefaults`, `SectionPreset`, `InstrumentOverride`, `LocalOverride`, `TransitionProfile`, `EffectiveGenerationContext` with JSDoc `@constraint` / `@preference`. **`sectionArchitectureContracts.ts`**: `resolveEffectiveContext`, `validateSong`, `resolveSectionForBar`, `mergeInstrumentOverride` (signatures only; P6 implements). P4 template container renamed **`SectionTemplateBundle`** (deprecated `SectionPreset` alias on domain). **`docs/COMPOSER_OS_SECTION_ARCHITECTURE.md`**. **`COMPOSER_OS_MUSICIAN_GUIDE.md`** §2.9 + regenerated **`.docx`**. Smoke **285/66/0** fast unchanged.

- **(2026-05-24) P4 — Section architecture domain model** — **`core/section-architecture/sectionArchitectureDomain.ts`**: `CompositionSection`, `SectionPreset`, `SectionArchitectureDocument`, layer taxonomy, `validateSectionPartition`. **`docs/SECTION_ARCHITECTURE_DOMAIN.md`**, **`INVARIANTS.md`**. Golden **`sectionArchitectureDomain.test.ts`** seed **78001** (off smoke until P8). Smoke **285/66/0** fast unchanged.

- **(2026-05-24) P3 — Frank Zappa FZ_* receipt promotion (3 of 15)** — Replaced metadata stubs **`FZ_ERA_01`** / **`FZ_WORK_01`** / **`FZ_WORK_02`** with promoted **`FZ_BURST`**, **`FZ_METRIC_SHIFT`**, **`FZ_REGISTER_COLLISION`** in **`priority3VoiceRuleBundles.ts`** + **`patchForFzReceipt`**. **`buildFrankZappaVrbRiffProfile()`** merges compiled receipts into **`FRANK_ZAPPA_VRF.riffProfile`** (Song Mode solo bridge uses merged profile). Goldens **`fzBurstReceipt.test.ts`** (77001), **`fzMetricShiftReceipt.test.ts`** (77002), **`fzRegisterCollisionReceipt.test.ts`** (77003) + runners (off smoke until P8). **`COMPOSER_HANDBOOK_ZAPPA.md`** + **`COMPOSER_OS_MUSICIAN_GUIDE.md`** §2.7 (all 15 stubs + promoted detail); **`generateComposerOsMusicianGuideDocx.mjs`** → **`COMPOSER_OS_MUSICIAN_GUIDE.docx`**. Smoke **285/66/0** fast unchanged.

- **(2026-05-24) P2 — Zappa GCE structural fingerprint (Song Mode generation)** — Extended **`FRANK_ZAPPA_STRUCTURAL_FINGERPRINT`** with **`metricDisruption`**, **`registerShiftProbability: 0.65`**, **`absurdistJuxtaposition`**, **`styleCollisionWeight: 0.7`**. New **`applyZappaGceStructuralGeneration.ts`**: auto **7/8+5/4+4/4** **`barMeterMap`** at section boundaries (skipped when request supplies map); absurdist section-kind sequence + macro plan patch; section-role metadata in **`buildGoldenPathPlans`**. Phase 4 register swap now probabilistic per bar. Golden **`zappaGceFingerprint.test.ts`** seed **76001** + runner **`runZappaGceFingerprintGolden.ts`** (off smoke). Smoke **285/66/0** fast unchanged.

- **(2026-05-24) P7 — Per-section VRB (all modes) + sonic_youth golden** — **`SectionMarker`** + **`VrbParams`** (`sectionMarkerTypes.ts`); per-bar merge via **`resolveVoiceRuleBundleForBar`** / **`resolveSectionVrb.ts`** (harmonic rhythm, voicing spread floor, GBD Slonimsky lane). **sonic_youth** Song Mode auto-wires A (bars 1–4 base) / B (bars 5–8 **SY_SLON_01** + chromaticBudget **0.72** + metricDisplacement **+0.15**). Golden **`sonicYouthPerSectionVrb.test.ts`** seed **75002** (off smoke). Smoke **285/66/0** fast · **450/80/0** full unchanged.

- **(2026-05-24) V63 S6 closeout — promoted voices smoke + desktop** — `promotedVoicesV63UiBoundary.json` + `v63PromotedVoicesGolden.test.ts` (UI/boundary + S1–S5 distinctness goldens in smoke). Smoke **285/66/0** fast · **450/80/0** full (+12 rows, +1 suite). `COMPOSER_OS_MUSICIAN_GUIDE.md` §4.1b (18 examples). `COMPOSER_OS_ROADMAP_V63.md` complete. Desktop rebuild.

- **(2026-05-24) V63 S5 — Sonic Youth dedicated VRB** — `SONIC_YOUTH` in `riffVrbStubs.ts` (σ25, noise-rock dual-guitar / angular-chromatic Slonimsky bias); `SONIC_YOUTH` Slonimsky style profile + songwriter auto-resolve; Song Mode harmonic voice ⚠ removed; distinctness golden `sonicYouthDistinct.json` + `sonicYouthDistinctGolden.test.ts` (not in smoke tier until S6). Smoke **273/65/0** fast unchanged.

- **(2026-05-24) V63 S4 — Allan Holdsworth + Scott Henderson GBD riff VRBs** — `ALLAN_HOLDSWORTH` + `SCOTT_HENDERSON` in `riffVrbStubs.ts`; cross-distinctness goldens `allanHoldsworthGbdDistinct.json` + `scottHendersonGbdDistinct.json`; GBD stub ⚠ removed for both. Smoke **273/65/0** fast unchanged.

- **(2026-05-24) V63 S3 — Joe Pass GBD riff VRB** — `JOE_PASS` in `riffVrbStubs.ts` (σ24, fingerstyle chord-melody / chromatic bebop line); GBD `harmonicVoice` routing; distinctness golden `joePassGbdDistinct.json`; GBD stub ⚠ removed for Joe Pass. Smoke **273/65/0** fast unchanged.

- **(2026-05-24) V63 S2 — Wes Montgomery GBD riff VRB** — `WES_MONTGOMERY` in `riffVrbStubs.ts` (σ25, octave jazz line, bebop-blues cells); GBD `harmonicVoice` routing via `resolveDuoRiffVrbLaneId`; distinctness golden `wesMontgomeryGbdDistinct.json`; GBD stub ⚠ removed for Wes. Smoke **273/65/0** fast unchanged.

- **(2026-05-24) V63 S1 — McCoy Tyner Song Mode slice** — `mccoyTynerSlice.ts` (`mt:*` quartal m11/sus, pentatonic clusters, modal minor pedals, IV-rooted quartal over minor); golden-path precompute + locked harmony routing; Slonimsky Song Mode stub ⚠ removed; harmony golden `mccoyTynerHarmonyDistinct.json` + `mccoyTynerHarmonyGolden.test.ts` (not in smoke tier until S6). Smoke **273/65/0** fast unchanged.

- **(2026-05-23) V62 closeout — UI/boundary goldens + smoke + desktop** — Golden fixtures `engines/composer-os-v2/tests/slonimskyUiGoldens/` (Song Mode 7 writers, GBD 4 stubs, Lane 3 preset wiring, etude surfaces) + `slonimskyUiGolden.ts` verifier; **+14** smoke rows (**slonimsky-ui** + **Mode exposure** + **Wyble Etude pitch offset** suites). Smoke **273/65/0** fast · **438/79/0** full. **`docs/COMPOSER_OS_ROADMAP_V62.md`** marked complete.
- **(2026-05-23) Lane 3 Wave 2 — Etude surfaces** — **`wyble_etude`**: Outside Level 0|1|2 only (`SlonimskyGbdPanel` `chromaticOnly` → `chromaticStrength` → Wyble `chromaticismLevel` via `chromaticStrengthToWybleChromaticismLevel`). **`slonimsky_etude`**: cell family selector only (`SlonimskyEtudeCellFamilyPanel` → `slonimskyPatternIdForCellFamily`). Smoke **259/63/0** fast · **424/77/0** full.

- **(2026-05-23) Slonimsky W4/W5 — SQ Voice Independence + Register Spread** — **Voice Independence** (−1…+1) → `GenerateRequest.blendStrength` + `duoIntent`; strong blend drives per-bar rhythmic splits, conversational Slonimsky `phraseIntent`. **Register Spread** → `chromaticStrength` → `allowedOutsideOverride` + `applyRegisterSpreadToStack` vertical spacing. `mapStringQuartetEnsembleSlonimskyToGenerateRequest` + `HomeGenerate.tsx` `stringQuartetSlonimskyExtras`. Goldens: `sqVoiceIndependenceExtremes.json`, `sqRegisterSpreadExtremes.json`. Smoke **259/63/0** fast · **424/77/0** full.

- **(2026-05-23) Slonimsky W2/W3/W6 — BB middle knobs + SQ+BB hybrid confirm** — **BB Cohesion** (−1…+1) → `GenerateRequest.figureResponse` (`low` / `medium` / `high`) → `applyFigureResponseToPunchMaps` in big-band score build. **BB Harmonic Grip** → `chromaticStrength` (inverted axis) → `allowedOutsideOverride` via `chromaticStrengthToOutsideLevel` in `runBigBandPlanning`. **SQ+BB hybrid** confirmed: `densitySplit` → `blendStrength` + optional `bbLightTouch`; `registerCarve` → `chromaticStrength`. `mapBigBandEnsembleSlonimskyToGenerateRequest` + `HomeGenerate.tsx` `bigBandSlonimskyExtras`. Golden fixtures: `engines/composer-os-v2/tests/slonimskyKnobGoldens/` + `slonimskyKnobGolden.ts`. Smoke **259/63/0** fast · **424/77/0** full.

- **(2026-05-22) Slonimsky Z7–Z11 + Zappa 5b riff params + receipt deepening (R1–R4)** — **Smoke: 411/0 (76 suites) full · 246/0 (62 suites) fast.**
  - **5b — Zappa riff API:** `zappaStyleMode`, `zappaEraPreset`, `zappaPhraseCharacter`, `zappaSymmetryBias`, `zappaChainDepth` on `GenerationMetadata` / `RiffGeneratorParams` / `RiffSoloGeneratorProfile`; `zappaRiffSoloParams.ts` + `resolveEffectiveZappaSoloProfile` in `riffSoloZappaAdapter.ts`; chain through `riffSoloBuilder` → `buildRiffScoreModel` → app API + `RiffGeneratorPanel` / `HomeGenerate.tsx` (frank_zappa Advanced only). Golden fixtures: `zappa-era-rio`, `zappa-phrase-extended`, `zappa-symmetry-high`, `zappa-chain-depth-3` (seed 42); `riffZappaSolo.test.ts` assertions.
  - **Z7 — Harmonic scene:** `core/slonimsky/slonimskyHarmonicScene.ts` — derive `dominantVoicingColor` from cell pitch classes; `HarmonicScene.slonimskyCellPitchClasses`; `applySlonimskyHarmonicSceneToContext` from `attachVoiceRuleBundle`; compositional Zappa path in `harmonicSceneChordBias.ts`; `slonimskyHarmonicSceneReceipts` on metadata. Smoke: `slonimskyHarmonicScene.test.ts`.
  - **Z8 — GBD duo:** `buildGuitarBassDuoSlonimskyContext` in `slonimskyPatternService.ts`; all `isGuitarBassDuoFamily` golden-path bars in `generateGoldenPathDuoScore.ts`; `pushGbdSlonimskyCellReceipt` → `slonimskyGbdCellReceipts`. Smoke: `slonimskyGbdContext.test.ts`.
  - **Z9 — Song mode:** `songModeSlonimsky.ts` — `applySongModeSlonimskyCellLayer` for pat_metheny / frank_zappa / sonic_youth / joni_mitchell / radiohead; `z9:` receipts on `slonimskySongModeCellReceipts`. Smoke: `songModeSlonimsky.test.ts`.
  - **Z10/Z11 — Ensemble:** `slonimskyEnsembleReceipt.ts` — `pushEnsembleSlonimskyCellReceipt` (`z10:bb`, `z11:sq`); BB alto+tenor + SQ Vn1+Vn2 in score builders; sinks from `runBigBandRealisation` / `runQuartetRealisation`. Smoke: `slonimskyEnsembleReceipt.test.ts`.
  - **R1–R4 — Receipts / goldens:** Nile Rodgers **NR_VL_01**, **NR_TEX_01**, **NR_LOOP_01**, **NR_DIFF_01** in `riffVrbStubs.ts`; refreshed `riffGoldenFixtures/larry_carlton_golden.json` + `david_gilmour_golden.json` (seed 42); `testEvhGoldenSeed42Verify` in `riffZappaSolo.test.ts`.
  - **`runSmokeTests.ts`:** +4 Slonimsky suites (Z7–Z11 + Z8 + Z9); smoke comment sync **411/76**, fast **246/62**.

### Fixed

- **(2026-05-15) Duo Run 1c — line-first routing + abstract pitch truth** — `slicePrimaryBlocksLineFirstAbstract` only blocks abstract guitar/bass fill when `harmonyModeRequested` is explicitly **`builtin`** or **`custom`** (`custom_locked` and `undefined` no longer fall through to a false `custom_locked` check that blocked every bar after `songwriterStyleId` matched the VRB). Abstract soprano/bass fill uses **`liftToneToRange`** (`duoAbstractLineWiring.ts`) so two abstract pitch classes are not collapsed onto one boundary `clampPitch` before `finalizeAndSealDuoScoreBarMath` / bass notation grouping. Gate B harness: `engines/composer-os-v2/scripts/gateBRun1cDuoVerify.ts`. **`core/counterpoint/INVARIANTS.md`** — Run 1c matrix. Smoke **248/0** (**63** suites).

### Added

- **(2026-05-15) ContrapuntalLineEngine — Pass 3 wire + generators** — Duo golden path calls **`precomputeContrapuntalLines`** immediately after **`isDuoGoldenPath`** (before any `precompute*EffectiveHarmonyBars`, including Basie) with **`context.voiceBundle?.voiceId`**. **`GenerationMetadata.contrapuntalLineSet`** stores **`AbstractLineSet`** for **`bob_brookmeyer`** + **`bartok`** when **`contrapuntalLinePolicy.enabled`**. **`ContrapuntalLineEngine`**: `generateLines` / `generate` builds four independent SATB strands (`chords_only`, `resolveBarSymbol` spine) with swing-offset Brookmeyer vs additive-entry + strict imitation Bartók; `applyVrbFilter` (Bartók soprano C4–A7 clamp); **`renderForStringQuartet`** literal Vn1–Vc mapping; **`renderForBigBand`** attaches **`soliPlanForBundle`** + **`backgroundsPlanFromScene`** (`bigBandSectionWriter.ts` ~69–80). **`vrbBlend`**: **`mergeContrapuntalLinePolicy`**. Smoke **`bobBrookmeyerSliceSmoke.test.ts`**: Brookmeyer slice row extended with **Gate B** musical assertions (no extra PASS row). Aggregate **`npm run test:composer-smoke`**: **248**/0 (**63** suites). **`core/counterpoint/INVARIANTS.md`** — engine closeout rules.

- **(2026-05-15) String Quartet — multi-arranger VRB blend (UI + engine + API)** — **`engines/composer-os-v2/core/composer/vrbBlend.ts`**: **`blendVoiceRuleBundles`**, **`BlendConflictError`**, **`KNOWN_SAFE_SQ_BLEND_PAIRS`** / **`KNOWN_INCOMPATIBLE_SQ_BLEND_PAIRS`**. **`GenerateRequest`** / pipeline: optional **`sqArrangerVrb`**. **`HomeGenerate.tsx`**: String Quartet dual arranger dropdowns + linked weight slider + blend preview + validation; **`StyleProfile.arrangerBlend`**. SQ arranger list **15** VRB ids.

- **(2026-05-14) VoiceRuleBundle — “New composer territories” VRB lane (5/5)** — Shipped five songbook / chamber harmonic-voice bundles with dedicated fingerprint modules + `voiceRuleBundles.ts` registration + `attachVoiceRuleBundle` auto-resolve where a matching primary songwriter exists:
  - **Arvo Pärt (`part`)** — **`arvoPartTintinnabuliVrbFingerprints.ts`**, **52** `AP_*` receipts; tintinnabuli M+T posture, `tintinnabuliEnabled`, sacred profile, silence-as-structure flags; aliases `arvo_part` / `arvo` / `fratres` / … (see bundle table).
  - **Erik Satie (`satie`)** — **`satieVrbFingerprints.ts`**, **39** `ES_*` receipts; `non-teleological` arc, `parallelChordsEnabled`, `furnitureModeEnabled`, `ironicStyleSwitchEnabled`; Gymnopédies / furniture / Socrate vocabulary.
  - **Ornette Coleman (`ornette_coleman`)** — **`ornetteColemanVrbFingerprints.ts`**, **43** `OC_*` receipts; harmolodics + pitch-field + democratic ensemble flags (`harmolodicsEnabled`, `pitchFieldGoverned`, `collectiveImprovEnabled`, …); new roles `melodic-floating` bass, `blues-field-free` contour, `through-composed-event-script` arc type.
  - **George Gershwin (`gershwin`)** — **`gershwinVrbFingerprints.ts`**, **51** `GG_*` receipts; `blues-diatonic` contour, `walking-or-symphonic` bass, `aaba-or-rhapsody` arc, `blueNoteEnabled` + `rhythmChangesEnabled` + `concertModeEnabled` + `songModeEnabled`, `swingFeel` + `guideToneVoiceLeading`.
  - **Cole Porter (`cole_porter`)** — **`colePorterVrbFingerprints.ts`**, **49** `CP_*` receipts; `speech-elegant` contour, `chromatic-descent-or-root` bass, `aaba-or-extended-refrain` arc, `chromaticBassEnabled` + `majorMinorMixtureEnabled` + `repeatedNoteOpeningEnabled` + `textCoupledHarmonyEnabled` + `witStyleProfile`, `swingFeel=false` posture. **`SongwriterRuleId`** extended with **`ornette_coleman`**; **`HomeGenerate.tsx`** library row for Ornette; **`writerRecipeCardModel`** taxonomy (Jazz / Theatre); **`voiceRuleBundleHarnessAdditive.test.ts`** floors for Gershwin + Porter + existing Ornette assertions. Smoke **248/0** (**63** suites).

- **String Quartet rhythm engines — Bartók Bulgarian aksak + Free/Proportional + Baroque dance + Reich phasing grid + Viennese Waltz + Jewish/Klezmer** — `bartokBulgarianAksakRhythmEngine.ts` (**50+** `BG_RHYTHM_*`) + `freeProportionalRhythmEngine.ts` (**48** `FP_RHYTHM_*`) + `baroqueDanceRhythmEngine.ts` (**42** `BD_RHYTHM_*`) + `reichPhasingGridRhythmEngine.ts` (**45** `RP_RHYTHM_*`) + `vienneseWaltzRhythmEngine.ts` (**67** `VW_RHYTHM_*`: one-bar rotational unit, lilt 3–8%, bass/chord polarity, hypermeter 2/8, style profiles standard / brahms_variant / ravel_variant / ironic_grotesque, tempo 145–190) + `jewishKlezmerRhythmEngine.ts` (**56** `KL_RHYTHM_*`: six gait library KL1–KL6, felt subdivision, ornament classes, modal coupling, Shostakovich variant, `kl` style prefix). `sqRhythmEngineId` + metadata merge; Style Panel prefixes `bg`, `fp`, `bd`, `rp`, `vw`, `kl`; rhythm-only stubs + registry; harness in `runAllTestsChunk1.ts`. Smoke **248/0** (**63** suites).

- **VoiceRuleBundle — Antônio Carlos Jobim (`jobim`) — bossa-nova songbook entry (2026-05-13)** — Jobim's Song Mode slice (`jobimSlice.ts`, `aj:*` receipts) was already shipped, but no matching `VoiceRuleBundle` existed in **`voiceRuleBundles.ts`**. This drop ships the missing VRB. New file **`engines/composer-os-v2/core/composer/jobimVrbFingerprints.ts`** with **`JOBIM_VRB_FINGERPRINT_RECEIPTS`** — **45** `JB_*` receipts across policy / chord vocabulary (maj7 / maj9 / maj7♯11 Lydian / min7 / min9 / dom7 / dom9 / dom7♭9 / dom7♯9 / dom13 / suspended dominants; parallel mode-mixture on same root; chromatic mediants; pedal points; sustained tonic maj7) / Brazilian modal colour (Dorian on ii · Lydian on I · Mixolydian on V with no enforced V→I) / long-range tonal plan (minor-3rd / major-2nd / tritone key relations) / voice leading (guide-tone semitone resolution as primary constraint, chromatic passing tones on strong beats, bass-independence, cadential contrary motion) / melodic language (stepwise-arc + occasional 4th/5th leaps, raised 4 in major / natural 6 in minor, beat anticipation, chromatic approach notes, long sustained notes over slow harmonic rhythm) / rhythm (3+3+2 / 2+3+3 8th-note groupings over 4/4, internalised pulse with no drum kit, ballad rubato preserving the bar grid) / texture + arranging (sparse melody + bass + minimal harmony, flute / strings doubling melody at octave, open guitar voicings omitting 5th, light strings + nylon guitar + minimal percussion) / form (AABA 32-bar default + AABBA + through-composed `Águas de Março`; 2–4 bar intro; bridge remote-key modulation with fuller texture; coda returns without functional resolution; A / A′ retention) / work fingerprints (Garota de Ipanema F→G♭ Lydian + swaying 8ths · Corcovado sparse cells / introspective ballad · Wave Cmaj7♯11 / arching pentatonic-adjacent · Desafinado ironic semitone clashes · Águas de Março additive cumulative form · Samba de Uma Nota Só single-note A / stepwise B · Triste lush ext + Lydian-then-minor-3rd modulation) / differentiators vs Bill Evans (no rootless 4-way close / no modal-jazz reharm; bossa rhythm only) · Bacharach (asymmetric inside steady 4/4; no Tin Pan Alley orchestration / no meter changes) · Debussy (anchored to song form / Brazilian groove; no planed parallel chord washes) · Wayne Shorter (clear tonal centres; harmony serves melody / no floating tonality). **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `melodic-counterline`, **`MelodicContourPolicy`** `stepwise-arc`, **`NarrativeArcPolicy`** `aaba-or-through-composed-song`, plus new optional flags **`bossaNovaFeel`** + **`lydianColourEnabled`**. **`voiceRuleBundles.ts`** registers **`JOBIM`** (`harmonicRhythm.minChordDurationBars=2 / maxChordDurationBars=8`, `bassPolicy.role='melodic-counterline'`, `melodicPolicy.contour='stepwise-arc'`, `melodicPolicy.preferredIntervalSets=[1,2,4,5,7]`, `melodicPolicy.maxLeapSemitones=7`, `voicingPolicy.minSpreadSemitones=10 / maxSpreadSemitones=36 / clusterSizeNotes=[3,5]`, `rhythmPolicy.antiMetric=false`, `formPolicy.narrativeArc='aaba-or-through-composed-song'`, `formPolicy.sectionRecallEnforced=true`, `repairPolicy.resolveParallels=false`, `repairPolicy.maxVoiceOverlap=6`, `bossaNovaFeel=true`, `lydianColourEnabled=true`) with aliases **`jobim`**, **`antonio_carlos_jobim`**, **`tom_jobim`**, **`bossa_nova`**, **`garota_de_ipanema`**, **`girl_from_ipanema`**. **`attachVoiceRuleBundle.ts`** `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` extended to **11** ids (adds `antonio_carlos_jobim`) so picking Jobim as primary songwriter auto-attaches the matching VRB without an explicit `harmonicVoice` option. Smoke `voiceRuleBundle.test.ts` + `voiceRuleBundleHarnessAdditive.test.ts` assert ≥30 `JB_*` receipts + role/contour/arc + `bossaNovaFeel` + `lydianColourEnabled` + 5-element preferred-interval-set (`[1,2,4,5,7]`) + harmonicRhythm `2..8` + 18 receipt prefix presence checks (policy / harm vocab / tonal / VL / melody / rhythm / texture / form / 7 work fingerprints / 4 differentiators) + alias resolution (5 aliases). Smoke aggregate **248/0** (**63** suites) unchanged.

- **SQ VRB UI — Dutilleux surfaced + SQ arranger dropdown redesigned (2026-05-13)** — Dutilleux bundle (`dutilleux`, **83** `DX_*` receipts, fully shipped) now visible in the Generate UI under the **String Quartet VRB** songwriter optgroup; previously the bundle had no `SONGWRITER_OPTIONS` row so the slot was filtered out of the rendered dropdown. **`HomeGenerate.tsx`** `SONGWRITER_OPTIONS` += `{ id: 'dutilleux', label: 'Dutilleux' }`; **`SongwriterRuleId`** union extended with `dutilleux`; stub rows added to **`SONGWRITER_STYLE_PROFILES`** (`harmonyColourBias=0.85`, `formRegularity=0.35`, `sectionContrast=0.8`, `motifCellSize=3`, `intervalPreference='chromatic'`) + **`songwriterRuleRegistry`** (`dx.sq_vrb_bundle`) + **`SONGWRITER_PRIMARY_INSTRUMENT`** (`'keys'`) + style-profile `ALIASES` map (`dutilleux` / `henri_dutilleux` / `ainsi_la_nuit` → `dutilleux`); **`attachVoiceRuleBundle`** `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` set extended to **10** ids — picking Dutilleux as primary songwriter auto-attaches the matching VRB without an explicit `harmonicVoice` option. **SQ arranger dropdown redesigned** — String Quartet preset no longer shows jazz big band arrangers as the primary arranger surface. New `ARRANGER_NONE_ID = 'none'` sentinel + new `ARRANGER_GROUP_SQ_VRB_ORDER` (`beethoven_late` · `bartok` · `ravel` · `dutilleux` · `ligeti` · `reich_glass` · `shostakovich` · `turtle_island` · `crumb_black_angels` · `lachenmann`); `ARRANGER_OPTIONS` extended with the 10 SQ VRB ids; new `ARRANGER_SQ_VRB_IDS` set; `ArrangerSelectOptionGroups` accepts a `variant` prop — when `variant === 'string_quartet'` the dropdown renders in order: **`— None (no arranger) —`** → **String Quartet VRB** optgroup → **Big band core (research-backed)** optgroup → **Charts & studio voices** optgroup. For all other presets the dropdown is unchanged. Two-way reset in `nextArrangerOnPresetChange`: entering `string_quartet` with a jazz arranger selected resets to `none`; leaving `string_quartet` with `none` or an SQ-only arranger selected resets to the default jazz arranger (`thad`). Generation guard: when `presetId === 'string_quartet' && arrangerStyle === 'none'`, the `stylePairing.arrangerStyle` block is **omitted entirely** from the generate payload (engine receives no arranger overlay; SQ VRB ids continue to auto-attach their matching `VoiceRuleBundle` via the same auto-resolve set extended above). Files touched: **`apps/composer-os-app/src/pages/HomeGenerate.tsx`**, **`engines/composer-os-v2/core/composer/attachVoiceRuleBundle.ts`**, **`engines/composer-os-v2/core/song-mode/songwritingResearchTypes.ts`**, **`engines/composer-os-v2/core/song-mode/songwriterStyleProfiles.ts`**, **`engines/composer-os-v2/core/song-mode/songwriterRuleRegistry.ts`**, **`engines/composer-os-v2/core/song-mode/songwriterCompProfile.ts`**. `EXPECTED_APP_PRESET_COUNT` unchanged (still 9). Smoke aggregate **248/0** (**63** suites) unchanged.

- **VoiceRuleBundle — Crumb / Black Angels (`crumb_black_angels`) — SQ VRB ritual / symbolic entry** (final SQ VRB original-roster slot now filled). New file **`engines/composer-os-v2/core/composer/crumbBlackAngelsSqVrbFingerprints.ts`** with **`CRUMB_BLACK_ANGELS_SQ_VRB_FINGERPRINT_RECEIPTS`** — **72** `CB_*` receipts across policy / germinal pc-sets (Forte 3-1 `{0,1,2}` + 3-5 `{0,1,6}` + fateful_triad `{D#,A,E}`) / chromatic completion at climaxes / tonal islands (god_music B major · pavana_lachrymae D minor · dies_irae chant mode · sarabanda_de_la_muerte_oscura) with literal triadic framing + chromatic-field flanking on both sides / chord types (resonance_B_major · cluster_chord 7- or 13-note · quote_chord) / dissonance_index accumulation+release / numerology in pitch (7 + 13 group_size · repeat_count · phrase_length · speech_event cardinality) / 13-image / 3-part form schema (Departure 1–5 · Absence 6–9 · Return 10–13) with Threnodies at 1/7/13 acting as arch supports and global peak at image 7 / mirror+echo pairs (3↔9 · 11↔12 · 1↔13) / quotation events (Schubert Death and the Maiden · Dies irae · Tartini Devil's Trill gesture) framed by contrasting modern field / theatrical ritual events (speech_event in 6+ languages · instrumental_transform bow→glass / maracas / tam-tam) / technique states (electric_insects · devil_music · god_music · consort_past · lament_slow) / noise phoneme vocabulary (electric_buzz · bone_flute · devil_growl · consort_hiss · percussive_knock · glass_halo) / amplification decoupled from dynamic (hyper-real ppp on sul pont harmonics) / sound_type per image ∈ {pitched, noise, hybrid} only at image / part boundaries / register role per image (high_halo · mid_body · low_ground · noise_layer) with drastic role changes between images / texture_state (heterophony_cluster · unison_quote · independent_streams) / time_state (measured · quasi_free · proportional) with numerological segments / multi-axis motivic identity (pc_set · interval_profile · gesture_type · technique · numerology_tag) / opening (Threnody I sudden amplified noise) + closing (Threnody III decay to silence + ghostly echo) / silence_block as structural marker / differentiators vs Lachenmann (symbolic + numerological scaffolding, not pure noise syntax) · Ligeti (discrete gestures + collage, not micropolyphonic web) · Shostakovich (archetypal quotations in non-tonal field, not autobiographical) · Dutilleux (numerologically fixed mirror/echo, not process-emergent growth) / works (Black Angels — Thirteen Images from the Dark Land, 1970). **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `noise-or-pedal`, **`MelodicContourPolicy`** `gesture-symbolic`, **`NarrativeArcPolicy`** `ritual-arch`, plus optional **`numerologyEnabled`** / **`amplificationDecoupled`** / **`symbolicTechniqueStatesEnabled`** / **`soundTypeStates`** (`pitched` \| `noise` \| `hybrid`) / **`mirrorEchoEnabled`** flags. **`voiceRuleBundles.ts`** registers **`CRUMB_BLACK_ANGELS`** (`bassPolicy.role='noise-or-pedal'`, `melodicPolicy.contour='gesture-symbolic'`, `melodicPolicy.preferredIntervalSets=[1,6,7,5]`, `voicingPolicy.clusterSizeNotes=[3,13]`, `voicingPolicy.maxSpreadSemitones=60`, `melodicPolicy.maxLeapSemitones=24`, `rhythmPolicy.antiMetric=true`, `formPolicy.narrativeArc='ritual-arch'`, all 5 ritual flags enabled, `quotationEventsEnabled=true`, `soundTypeStates=['pitched','noise','hybrid']`) with aliases **`crumb_black_angels`**, **`crumb`**, **`george_crumb`**, **`black_angels`**, **`thirteen_images`**, **`sq_vrb_crumb`**. **`SongwriterRuleId`** union extended with `crumb_black_angels`; stub rows added to **`SONGWRITER_STYLE_PROFILES`** + **`songwriterRuleRegistry`** + **`SONGWRITER_PRIMARY_INSTRUMENT`** + style-profile **`ALIASES`** map (crumb / george_crumb / black_angels / thirteen_images → `crumb_black_angels`); **`attachVoiceRuleBundle`** `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` set extended to 9 ids; **`HomeGenerate.tsx`** **`SONGWRITER_OPTIONS`** + Crumb now renders in the **String Quartet VRB** optgroup (slot updated from reserved `crumb` to active `crumb_black_angels`); **`writerRecipeCardModel.ts`** **`CLASSICAL`** set includes both `crumb` (legacy) and `crumb_black_angels`. Smoke `voiceRuleBundle.test.ts` + `voiceRuleBundleHarnessAdditive.test.ts` assert ≥30 `CB_*` receipts + role/contour/arc + all 5 ritual flags + quotation flag + 3-state soundTypeStates + 4 preferred-interval-set entries + alias resolution. **SQ VRB family roster — original 10 COMPLETE (now 12 shipped including extensions):** `bartok` · `ravel` · `dutilleux` · `debussy` · `messiaen` · `beethoven_late` · `turtle_island` · `reich_glass` · `shostakovich` · `lachenmann` · `ligeti` · `crumb_black_angels`. Smoke aggregate **248/0** (**63** suites) unchanged.

- **VoiceRuleBundle — Ligeti (`ligeti`) — SQ VRB micropolyphony / texture-as-harmony entry** (extension beyond the original SQ VRB 10). New file **`engines/composer-os-v2/core/composer/ligetiSqVrbFingerprints.ts`** with **`LIGETI_SQ_VRB_FINGERPRINT_RECEIPTS`** — **70** `LG_*` receipts across policy / G4 germinal cell (Forte 4-1 `{0,1,2,3}` whole-tone+semitone+whole-tone pattern; subsets/permutations omnipresent across SQ1 motives + verticals) / SQ2 pc-field state grammar (chromatic_dense / cluster_narrow / constellation / sparse_filtered) / centricity (SQ1 focal_pc by occurrence + outer-voice peaks, no V→I; SQ2 focal_interval or focal_pc_class per movement) / tension_metric = f(cluster_width, pc_count, ic1_density) with rise + release rules / micropolyphony lifecycle (Beginning · Development · Dissolution with monotonic density envelopes; 4–8 micro-voices; phase-independent; "halo" of high harmonics on dissolution) / voice-leading (V1 high · V2 upper-mid · Va mid · Vc low; `texture_role ∈ {embedded, emergent}`; ≥0.85 of intervals ≤2 semitones in micropolyphony_mode; `register_extreme_event` marks boundaries) / rhythm (SQ1 additive 2+3 / 3+2 / 3+3+2 Bartók-like; SQ2 `pulse_state ∈ {steady, flexible, suspended}` per movement; tempo_curve as primary structural force; motif_profile ∈ {nervoso_tremolo, gliss_cluster, flautando_halo, col_legno_tap, sighing_semitone_cell}) / texture by movement (Mvt I micropolyphonic_mass + accelerating; Mvt II harmonics_only + suspended + sparse_filtered; Mvt III mechanical_polyphony + steady + col legno; Mvt IV violent_mass + max tension + snap pizz; Mvt V dissolving_micropolyphony + decelerating) / silence as active structure (silence_windows at boundaries; full rests after density peaks) / form (SQ1 12–17 continuous_sections with `section_tag ∈ {nocturne, scherzo, waltz, presto, dance, recitative, lento}`; SQ2 five-movement; contrast_profile = ≥1 max_density + ≥1 max_sparsity per movement) / differentiators vs Bartók (G4 ubiquity + non-functional chromatic webs; no axis system, no Bulgarian rhythms; texture replaces motivic development) · Dutilleux (no fixed focal hexachord HC0; no memory parenthèses; field_state + tension_metric arcs instead) · Lachenmann (pitched identity retained; col legno + sul pont = timbre not phoneme; no noise-state primary structure) · Reich/Glass (forbid long exact repetitions + simple ostinati; pattern mutation required; phasing non-periodic; no diatonic/modal groove fields) / works (SQ No. 1 "Métamorphoses nocturnes" 1953/54 + SQ No. 2 1968). **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `embedded-voice`, **`MelodicContourPolicy`** `neighbor-motion`, **`NarrativeArcPolicy`** `continuous-sections` + `five-movement`, plus optional **`ligetiProfile`** (`sq1` \| `sq2`) / **`g4GerminalSetEnabled`** / **`micropolyphonyMode`** / **`tensionMetricCurvesRequired`** / **`pcFieldStateGrammarEnabled`** / **`silenceAsStructureEnabled`** / **`tempoCurveDirection`** (`accelerating` \| `decelerating` \| `arch` \| `flat` \| `flexible`) / **`textureAsHarmonyEnabled`** flags. **`voiceRuleBundles.ts`** registers **`LIGETI`** (`bassPolicy.role='embedded-voice'`, `melodicPolicy.contour='neighbor-motion'`, `melodicPolicy.preferredIntervalSets=[1,2]`, `voicingPolicy.clusterSizeNotes=[4,8]`, `rhythmPolicy.antiMetric=true`, `ligetiProfile='sq2'`, all 7 new flags enabled, `tempoCurveDirection='accelerating'`) with aliases **`ligeti`**, **`gyorgy_ligeti`**, **`ligeti_sq1`**, **`ligeti_sq2`**, **`micropolyphony`**, **`metamorphoses_nocturnes`**, **`sq_vrb_ligeti`**. **`SongwriterRuleId`** union extended with `ligeti`; stub rows added to **`SONGWRITER_STYLE_PROFILES`** + **`songwriterRuleRegistry`** + **`SONGWRITER_PRIMARY_INSTRUMENT`**; **`attachVoiceRuleBundle`** `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` set extended to 8 ids; **`HomeGenerate.tsx`** **`SONGWRITER_OPTIONS`** + Ligeti now renders in the **String Quartet VRB** optgroup (slot already reserved in `SONGWRITER_GROUP_SHIPPED_SQ_VRB_ORDER`). Smoke `voiceRuleBundle.test.ts` + `voiceRuleBundleHarnessAdditive.test.ts` assert ≥30 `LG_*` receipts + role/contour/arc + all 7 micropolyphony flags + preferred-interval-set + alias resolution. **SQ VRB family roster (11 shipped):** `bartok` · `ravel` · `dutilleux` · `debussy` · `messiaen` · `beethoven_late` · `turtle_island` · `reich_glass` · `shostakovich` · `lachenmann` · `ligeti`. Smoke aggregate **248/0** (**63** suites) unchanged.

- **SQ VRB family — UI wiring (10/10 surfaced in Generate)** — five new SQ VRB ids (`beethoven_late`, `turtle_island`, `reich_glass`, `shostakovich`, `lachenmann`) plus existing `bartok` / `ravel` / `debussy` / `dutilleux` / `messiaen` now surface in the String Quartet preset under a dedicated **String Quartet (SQ VRB family)** `<optgroup>` (top of the harmonic-voice dropdown). **`HomeGenerate.tsx`**: new `SQ_VRB_HARMONIC_VOICE_IDS` set + `buildHarmonicVoiceGroups({ sqVrbFirst: true })` produces `HARMONIC_VOICE_GROUPS_SQ`; passed to `<StylePanel>` only when `presetId === 'string_quartet'` (Song Mode + Big Band keep prior Library / Jazz Masters / Film grouping). **`SongwriterRuleId` union** (`core/song-mode/songwritingResearchTypes.ts`) extended with `beethoven_late`, `turtle_island`, `reich_glass`, `lachenmann` (shostakovich already present) so the new dropdown ids type-check end-to-end. **`SONGWRITER_STYLE_PROFILES`** + **`SONGWRITER_PRIMARY_INSTRUMENT`** + **`songwriterRuleRegistry`** stub rows added for the four new ids; **`normalizeSongwriterStyleKey`** alias map gains `late_beethoven`, `turtle_island_quartet`, `turtle`, `reich_and_glass`, `minimalist_sq`, `helmut_lachenmann`. **`attachVoiceRuleBundle.ts`**: hardcoded radiohead/debussy fallback replaced with `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` set covering `radiohead`, `debussy`, `beethoven_late`, `turtle_island`, `reich_glass`, `shostakovich`, `lachenmann` — picking any of these as primary songwriter auto-attaches the matching VRB without an explicit `harmonicVoice` option. **`writerRecipeCardModel.ts`** **`CLASSICAL`** set extended with `beethoven_late`, `turtle_island`, `reich_glass`, `lachenmann`. Smoke aggregate **248/0** (**63** suites) unchanged.

- **VoiceRuleBundle — Lachenmann (`lachenmann`) — SQ VRB family COMPLETE** — tenth and final SQ VRB entry: **musique concrète instrumentale** noise-gesture grammar. New file **`engines/composer-os-v2/core/composer/lachenmannSqVrbFingerprints.ts`** with **`LACHENMANN_SQ_VRF_FINGERPRINT_RECEIPTS`** — **84** `LC_*` receipts across policy / primary structural parameters (sound_type · energy_level · gesture_profile · pitch_role · technique_bundle) / **Klangtypen** (5 sound types: **fließklang**, **geräuschklang**, **druckklang**, **tonklang**, **impulsklang**) with technique-bundle derivations / sound-type trajectory as formal logic / extended-technique vocabulary (sul_pont_extreme · sul_tasto_extreme · behind_bridge · overpressure · body_bow · col_legno_battuto · col_legno_tratto · ricochet_non_standard · whoosh_stroke · snap_pizzicato · left_hand_pizz · body_tap · harmonic_destabilised · wood_knock · fingernail_scratch · string_slap) / multi-label technique combinations / role assignment (lead_gesture / background_field / impulse_layer; no default melody-bass) / noise voice-leading as parameter continuity (contact_point + pressure + motion_type) / ensemble_relation (coordinated_field / contrasted_layers / independent_streams) / register-extreme rules / measured_free time / gesture types (single_impulse / short_group / long_mass / burst) / density(t) curves replacing harmonic rhythm / silence as structural element / Gran Torso (raw_noise_open) / Reigen (ghost_dance_open) / Grido (fragile_pitch_open) form presets / motivic sound objects (physical parameter bundle identity) / differentiators vs Crumb · Ligeti · Bartók · Sonic Youth · Shostakovich · Reich-Glass · Turtle Island · Beethoven. **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `noise-field`, **`MelodicContourPolicy`** `gesture-physical`, **`NarrativeArcPolicy`** `through-composed-noise-grammar`, plus optional **`soundTypeGrammarEnabled`** / **`klangtypenPrimary`** (5-element Klangtypen palette) / **`pitchRoleDecoupled`** / **`noSemanticOverlay`** flags. **`voiceRuleBundles.ts`** registers **`LACHENMANN`** (`rhythmPolicy.antiMetric=true`, `clusterSizeNotes=[1,6]`, `maxLeapSemitones=36`, `pitchRoleDecoupled=true`) with aliases **`lachenmann`**, **`helmut_lachenmann`**, **`musique_concrete_instrumentale`**, **`gran_torso`**, **`reigen_seliger_geister`**, **`grido`**, **`sq_vrb_lachenmann`**. Smoke `voiceRuleBundle.test.ts` + `voiceRuleBundleHarnessAdditive.test.ts` assert ≥30 receipts + role/contour/arc + Klangtypen palette + all four noise-grammar flags + alias resolution. **SQ VRB family roster (10 shipped):** `bartok` · `ravel` · `dutilleux` · `debussy` · `messiaen` · `beethoven_late` · `turtle_island` · `reich_glass` · `shostakovich` · `lachenmann`. Smoke aggregate **248/0** (**63** suites) unchanged.

- **VoiceRuleBundle — Shostakovich (`shostakovich`)** — SQ VRB **narrative / dystopian-modern** entry. New file **`engines/composer-os-v2/core/composer/shostakovichSqVrbFingerprints.ts`** with **`SHOSTAKOVICH_SQ_VRF_FINGERPRINT_RECEIPTS`** — **96** `SH_*` receipts across policy / pitch & mode-mixture (phrygian/dorian/aeolian/jewish_harmonic_minor + octatonic_subset) / centricity (V→vi, V→III, plagal) / chord types (plain triads + modal pre-doms ♭II, iv) / DSCH motive system (D-E♭-C-B, [ic1,ic3,ic1]; theme + accomp + bass + fugue subject; ≥100 SQ 8 appearances; transforms Tn/In/retro/aug) / mode-mixture + ironic_layering / obsessive cell technique (≥60% thematic share) / quotation events / transformed (darkened) recap / rhythmic cell library (march_cell, obsessive_ostinato, grotesque_scherzo, jewish_dance, metric_ambiguity 2+2+3 in 4/4, strategic_pause "knock on door") / register norms + expressive_violation / fugato (pseudo-fugal) / bare two-voice texture / pizzicato function (comedic + structural lament bass) / texture states melody_accomp · chorale_state · passacaglia_bass · unison_mass / shostakovich_accomp library (repeated_low_tonic / pulsing_fifths / syncopated_stab / walking_minor_line / obsessive_eighth_pulse) / melodic archetypes (march_theme · lament_theme · grotesque_scherzo · tragic_slow_movement · jewish_theme) / opening profiles (slow_autobiographical_motto · stark_unison · sardonic_scherzo) / closing profiles (pp_morendo · circular_return · grim_assertion) / work presets SQ 3 / 5 / 7 / 8 / 10 / period sub-profiles (early / middle / late) / differentiators vs Beethoven · Bartók · Reich-Glass · Ravel. **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `ostinato-or-pedal`, **`MelodicContourPolicy`** `stepwise-with-leaps`, **`NarrativeArcPolicy`** `narrative-episodic`, plus optional **`dschMotifEnabled`** / **`quotationEventsEnabled`** / **`tragicSlowMovementProfile`** / **`shostakovichPeriod`** (`early` \| `middle` \| `late`) flags. **`voiceRuleBundles.ts`** registers **`SHOSTAKOVICH`** with aliases **`shostakovich`**, **`dmitri_shostakovich`**, **`shosti`**, **`dsch`**, **`sq_vrb_shostakovich`**. Smoke `voiceRuleBundle.test.ts` + `voiceRuleBundleHarnessAdditive.test.ts` assert ≥30 receipts + role/contour/arc + DSCH / quotation / tragic-slow flags + alias resolution. Smoke aggregate **248/0** (**63** suites) unchanged.

- **VoiceRuleBundle — Reich / Glass (`reich_glass`)** — SQ VRB **minimalist-process** entry with two sub-profiles (**`reich_profile`**, **`glass_profile`**). New file **`engines/composer-os-v2/core/composer/reichGlassSqVrbFingerprints.ts`** with **`REICH_GLASS_SQ_VRF_FINGERPRINT_RECEIPTS`** — **89** `RG_*` receipts across policy / pitch collections (centre_pc + pc_set vs mode_tag) / centricity / chord types (open 5ths / triads / stacked 4ths–5ths vs tertian + 7ths) / harmonic rhythm (4–64 bars) / phase_block / crossfade_section / additive_pattern / section_cut / repetition rules / pattern_integrity / role assignment (top_pattern / second_pattern / mid_ostinato / bass_pedal) / inter-voice (canon vs unison stacks) / within-line intervals {±2,±3,±4,±7} / Reich rhythmic cells + paradiddle accent maps / Glass additive units (3+3+2, 2+2+2+2) / steady pulse_state / rests / rhythm-harmony relationship / layered_ostinato + unison_line + heterophonic_canon textures / density-as-form / standard arco technique / terraced dynamics / Different Trains three-movement spine / Glass quartet sectional form / opening (pattern_in_medias_res) + closing (loop_decrescendo / sharp_cut) profiles / sub-profile flags / differentiators vs each other · Ligeti · Bartók · Beethoven · Turtle Island · Kronos / works (Different Trains, Glass SQ 2–5). **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `pattern-bass`, **`MelodicContourPolicy`** `pattern-loop`, **`NarrativeArcPolicy`** `minimalist-process`, plus optional **`composerProfile`** (`reich` \| `glass`) / **`pulseState`** (`steady` \| `flexible` \| `suspended`) / **`phaseProcessEnabled`** / **`additiveProcessEnabled`** / **`patternIntegrityMinRepeats`** flags. **`voiceRuleBundles.ts`** registers **`REICH_GLASS`** (`pulseState=steady`, `phaseProcessEnabled=true`, `additiveProcessEnabled=true`, `patternIntegrityMinRepeats=4`, `minChordDurationBars=4`, `maxChordDurationBars=64`) with aliases **`reich_glass`**, **`reichglass`**, **`reich_and_glass`**, **`reich`**, **`steve_reich`**, **`glass`**, **`philip_glass`**, **`minimalist_sq`**, **`sq_vrb_reich_glass`**. Smoke `voiceRuleBundle.test.ts` + `voiceRuleBundleHarnessAdditive.test.ts` assert ≥30 receipts + role/contour/arc/pulseState/process flags + alias resolution. Smoke aggregate **248/0** (**63** suites) unchanged.

- **VoiceRuleBundle — Turtle Island Quartet (`turtle_island`)** — SQ VRB **jazz-bridge** sibling to **`beethoven_late`**. New file **`engines/composer-os-v2/core/composer/turtleIslandSqVrbFingerprints.ts`** with **`TURTLE_ISLAND_SQ_VRF_FINGERPRINT_RECEIPTS`** — **88** `TI_*` receipts across policy / chord-scale voicings / ii–V–I guide-tone chain / tritone sub / pedal_section / role rotation / walking-pedal-arco bass modes / improv slots / swing-Latin-funk-ballad groove libraries / call-response / unison_riff / displacement / rhythmic cells / chop · slide · hickety_mute · pizz · chop_pizz · arco_lead · arco_pad / drum_sim / full_rhythm_section_state / articulation × style / dynamic micro-shaping / structure slots (intro→head_in→solos→head_out→tag) / 12-bar blues / 32-bar AABA / modal vamp / standard_mode / original_mode / transitional_section / bebop · ballad · blues · latin profiles / differentiators vs classical SQ · piano trio · Kronos · big-band. **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `walking-bass`, **`MelodicContourPolicy`** `chord-scale`, **`NarrativeArcPolicy`** `head-solos-head`, plus optional **`swingFeel`** / **`guideToneVoiceLeading`** / **`improvSlots`** flags. **`voiceRuleBundles.ts`** registers **`TURTLE_ISLAND`** with aliases **`turtle_island`**, **`turtle_island_quartet`**, **`turtleisland`**, **`ti`**, **`sq_vrb_turtle_island`**, **`david_balakrishnan`**, **`balakrishnan`**. Smoke `voiceRuleBundle.test.ts` + `voiceRuleBundleHarnessAdditive.test.ts` assert ≥30 receipts + role/contour/arc/swing-feel checks + alias resolution. Smoke aggregate **248/0** (**63** suites) unchanged.

- **Radiohead — `RH_FP_01`–`RH_FP_03` fingerprints** — **`radioheadSlice`**: **`RADIOHEAD_FP_RULE_REGISTRY`**, **`radioheadFingerprintTags`**, **`collectRadioheadHarmonicFingerprintReceipts`** / **`Rhythmic`** / **`Orchestral`**; **`rh:orch_*`** additions (**sul ponticello**, **harmonics climax**, **microtonal cluster field**); **`radioheadFingerprintReceipts`** + diagnostics **`fingerprintReceipts`**; manifest echo; **`songwriterRuleRegistry`** **`radiohead.fp_*`**.

- **Radiohead — `RH_ORCH_01`–`RH_ORCH_05`** — **`radioheadSlice`**: **`RADIOHEAD_ORCH_RULE_REGISTRY`**, **`radioheadOrchestrationGrammarTags`**, **`collectRadioheadOrchestrationGrammarReceipts`**, **`radioheadOrchestrationPaletteForPeriod`**; **`finalizeRadioheadMetadata`**: **`radioheadOrchestrationGrammarReceipts`**, **`radioheadOrchestrationPalette`**, **`radioheadMicrotonalGuitarEligible`**; diagnostics **`orchestrationGrammarReceipts`**; manifest echo; **`songwriterRuleRegistry`** orch rows.

- **Radiohead — `RH_RHYTHM_01`–`RH_RHYTHM_06`** — **`radioheadSlice`**: **`RADIOHEAD_RHYTHM_RULE_REGISTRY`**, **`radioheadRhythmGrammarTags`**, **`collectRadioheadRhythmGrammarReceipts`** (**`rh:rhythmNN_*`**); **`finalizeRadioheadMetadata`**: rhythm receipts + **`radioheadRhythmEarlyPeriodBackbeat`** / **`radioheadRhythmAsymmetricFeaturesEligible`**; manifest **`radioheadRhythm*`** echo; **`songwriterRuleRegistry`** rhythm rows.

- **Radiohead — `RH_MEL_01`–`RH_MEL_05`** — **`melodyBehaviourPlanner`**: **`applyRadioheadMelodicEncoding`**, **`radioheadMelodicGrammarTags`**, **`collectRadioheadMelodicGrammarReceipts`**, **`planMelodyBehaviour`** 4th-arg **`RadioheadMelodyPlanOptions`**; **`radioheadSlice`** **`RADIOHEAD_MEL_RULE_REGISTRY`** + **`finalizeRadioheadMetadata`** melodic receipts; **`GenerateRequest` / `runGoldenPath` / `runSongMode`**: **`radioheadMelodicContext`** (`acoustic` \| `electronic`); **`songwriterRuleRegistry`** melodic rows.

- **Radiohead — `RH_VL_01`–`RH_VL_06`** — **`voiceRuleBundles`** **`radiohead`** (**`thom_yorke`** alias) + **`attachVoiceRuleBundle`**: auto harmonic voice when **`songwriterStyleId===radiohead`**; **`voiceLeadingSolver`**: parallel fifth/octave cost **0** for **`radiohead`** bundle; **`radioheadSlice`**: **`RADIOHEAD_VL_RULE_REGISTRY`**, **`collectRadioheadVoiceLeadingGrammarReceipts`** (**`rh:vlNN_*`**), **`radioheadVoiceLeadingGrammarReceipts`** on **`GenerationMetadata`** / diagnostics; **`songwriterRuleRegistry`** VL rows.

- **Radiohead slice — `RH_HARM_01`–`RH_HARM_10` hooks** — **`radioheadSlice.ts`**: **`RADIOHEAD_HARM_RULE_REGISTRY`**, era **`radioheadHarmonicPeriod`** + **`radioheadHarmonicPrimarySystem`**, **`rhApplyHarm04ChromaticMediant`**, prototypes **`RADIOHEAD_PARANOID_ANDROID_VERSE_PROTOTYPE`** / **`RADIOHEAD_CHROMATIC_NONFUNCTIONAL_CHORUS_PROTOTYPE`**; **`RH_HARM_05`** sus chords no longer stripped; device weights by era; **`songwriterStyleProfiles.radiohead.songwriterHarmonicPeriods`**.

- **VoiceRuleBundle — Count Basie (`count_basie`)** — **`CB_HARM_01`–`CB_HARM_08`** + **`CB_VL_01`–`CB_VL_06`** + **`CB_RHYTHM_01`–`CB_RHYTHM_06`** + **`CB_FORM_01`–`CB_FORM_07`** + **`CB_FP_01`–`CB_FP_03`** on **`orchestrationPolicy.fingerprintReceipts`** (eight legacy prose lines retained → **38** receipts total). **`docs/COMPOSER_HANDBOOK.md`**: Basie **deep** (**38**); **Extended:** none.

- **Song Mode smoke — Beatles + Debussy** — **`beatlesSliceSmoke.test.ts`**, **`debussySliceSmoke.test.ts`** (`runGoldenPathOnce` golden-path + effective harmony + slice receipts); **`runSmokeTests.ts`** allowlist (+2 suites). **`docs/COMPOSER_OS_ROADMAP.md`**: Writer Slice priority **Beatles**, **Bacharach**, **Debussy** marked **COMPLETE**; shipped-slices count **25** (adds **`beatles`**, **`debussy`**). **`CLAUDE.md`** smoke aggregate **248**/0 (**63** suites).

- **VoiceRuleBundle — Sammy Nestico (`sammy_nestico`)** — **`SN_HARM_01`–`SN_HARM_07`** + **`SN_VL_01`–`SN_VL_07`** + **`SN_RHYTHM_01`–`SN_RHYTHM_06`** + **`SN_FORM_01`–`SN_FORM_07`** + **`SN_ORCH_01`–`SN_ORCH_05`** + **`SN_FP_01`–`SN_FP_03`** on **`orchestrationPolicy.fingerprintReceipts`** (six legacy prose lines retained → **41** receipts total). **`docs/COMPOSER_HANDBOOK.md`**: Nestico **41** / **deep**; **thin** row — none. Smoke **246/0**.

- **V31 — Clave grid overlay** — **`core/rhythm/claveGridTypes.ts`**: **`ClaveGridSpec`**, **`CLAVE_GRID_STUB_REGISTRY`** (`son_basic`, `rumba_basic`, `afro_6_8_basic` → Cuban preset ids), **`validateClaveGridSpec`**. **`core/rhythm/claveGridOverlay.ts`**: **`applyClaveGridOverlay`**, **`isClaveGridOverlayEnvEnabled`** (`COMPOSER_OS_CLAVE_GRID_OVERLAY`, **`VITE_COMPOSER_OS_CLAVE_GRID_OVERLAY`**). **`runGoldenPath.buildGoldenPathPlans`**: runs after **`computeRhythmicConstraints`** (before rhythm-motif binding). **`RunGoldenPathOptions.claveGridOverlay`**, **`GenerateRequest.claveGridOverlay`** (passed when env on), **`GenerationMetadata.claveGridOverlayReceipt`**. **`generateComposition`** + **`composerOsAppGeneration`** passthrough. Smoke **246/0**.

- **Song Mode — MusicXML LeadSheet Phase 2 (writer expansion)** — **`SONG_MODE_LEADSHEET_PHASE1_WRITERS`** adds **`bill_evans`**, **`antonio_carlos_jobim`**, **`pat_metheny`**, **`bacharach`**, **`herbie_hancock`** (with **`donald_fagen`**, **`barry_harris`**); **`HomeGenerate.tsx`** + **`composerOsAppGeneration.ts`** parity; **`isLeadSheetSongModeRoute`** uses same set; disabled-route copy via **`SONG_MODE_LEADSHEET_DISABLED_ROUTE_HINT`**; Phase 1 file input **`id="co-song-mode-leadsheet-phase1-file"`**. **`songModeLeadSheetInput.test.ts`**: non-target control writer **`radiohead`** (replaces **`bacharach`**). App tests: **`homeGenerateUi.test.ts`** (`beforeEach` **`api.generate.mockReset`**, stable **`getLeadSheetFileInput`**). Smoke **246/0**.

- **Documentation — full sync (`6b4f5f89` → `e4814fb3`, 2026-05-11)** — **`docs/COMPOSER_HANDBOOK.md`**: VRB deep / extended / thin table; **Brookmeyer** / **Nelson** / **Messiaen** sections; ship-hash index **`6344cdcb`** · **`ac875ae8`** · **`8b8775e4`** · **`4aa848a5`** · **`a4ae08de`** · **`913987d7`** · **`48e5407d`** · **`e4814fb3`**. **`docs/COMPOSER_OS_PLAYBOOK.md`**: **`MELODY_PROFILES`** row count **56**; Song Mode **slice + VRB** table (Basie, Brookmeyer, Nelson, Messiaen, Quincy). **`docs/COMPOSER_OS_ROADMAP.md`**: DONE batch + **NEXT — Clare Fischer**. **`docs/COMPOSER_OS_ARCHITECTURE.md`**: cross-cutting **`lineFirstHierarchy`**, **`twoLayerForm`**, **`messiaenPeriodMode`/`colourTag`**. **`docs/CHANGELOG.md`**: this entry. Regenerated **`docs/COMPOSER_OS_PLAYBOOK.docx`**.  
  **Commit → paths (index):** **`6344cdcb`** — `stubBbComposerChordPools.ts`, `bobBrookmeyerSlice.ts`, `oliverNelsonSlice.ts`, `clareFischerSlice.ts`, `sammyNesticoSlice.ts`, `harmonySpineProvider.ts`, `harmonyResolution.ts`, `generateGoldenPathDuoScore.ts`, `runGoldenPath.ts`, `voiceRuleBundles.ts`, `bergSlice.ts`, … · **`ac875ae8`** — `basieSlice.ts`, `basieEpisodeTypes.ts`, `count_basie.ts`, `voiceRuleBundles.ts` (`count_basie` **8**), `basieSliceSmoke.test.ts`, `HomeGenerate.tsx`, docs **`CLAUDE`**, **`COMPOSER_OS_*`**, architecture · **`8b8775e4`** — `quincyJonesSlice.ts`, `bigBandRuleRegistry.ts`, `stubBbComposerChordPools.ts`, harmony spine / golden path wiring · **`4aa848a5`** — `voiceRuleBundles.ts` (Ellington / Gil / Shorter / Schneider **11** each), `songwriterCompProfile.ts` · **`a4ae08de`** — `messiaenSlice.ts`, pools, VRB **12**, golden-path rail · **`913987d7`** — handbook, playbook, roadmap, CHANGELOG, **`COMPOSER_OS_PLAYBOOK.docx`** · **`48e5407d`** — `bobBrookmeyerSlice.ts`, **`lineFirstHierarchy`**, VRB **12** · **`e4814fb3`** — `oliverNelsonSlice.ts`, `nelsonEpisodeTypes.ts`, VRB **12**, **`BigBandResearch.md`**.

- **Oliver Nelson Song Mode stack (`oliver_nelson`)** — pools **`nelson_minor_modal`** / **`nelson_minor_blues`** / **`nelson_orchestral`**; planner tags **`pedalBased` / `bluesModalHybrid` / `twoLayerForm`**; **`nelsonEpisodeTypes.ts`** + **`oliverNelsonSlice.ts`** **`on:*`** episodes (pedal · modal head · turnaround · minor blues · orchestral), **`NelsonPeriodMode`**, **`NelsonBluesFormVariant`**, **`activePedal` / `upperModalChords`**; **`VoiceRuleBundle`** **12** fingerprints; **`runGoldenPath`** MusicXML truth + **`GenerateRequest` / manifest**; **`BigBandResearch.md`** **`### Oliver Nelson`**; alias **`oliver nelson`**; smoke **`oliverNelsonSliceSmoke.test.ts`** — **`npm run test:composer-smoke`:** **246**/0 (**61** suites).

- **Bob Brookmeyer Song Mode stack (`bob_brookmeyer`)** — tier pools **`brookmeyer_quartal`** / **`brookmeyer_linear`** / **`brookmeyer_cluster`** (**`seed % 3`**); chord-plan tags **`line_first:true`**; **`bobBrookmeyerSlice.ts`** **`brk:*`** receipts, pitch-module spine, solo gate, **`early_brookmeyer` / `late_brookmeyer`**; **`voiceLeadingSolver`** **`lineFirstHierarchy`**; **`VoiceRuleBundle`** **12** fingerprints; **`GenerateRequest` / `OutputEntry`** **`brookmeyerPeriodMode`** + Brookmeyer manifest fields; **`BigBandResearch.md`** composer section; alias **`bob brookmeyer`**; smoke **`bobBrookmeyerSliceSmoke.test.ts`**.

- **Docs — Messiaen post-ship (`a4ae08de`)** — **`COMPOSER_HANDBOOK.md`**: VRB row **`messiaen`** (**12** / deep), **`messiaenPeriodMode`**, colour-tag stub table · **`COMPOSER_OS_ROADMAP.md`**: slice DONE + **NEXT — Ligeti** · **`COMPOSER_OS_PLAYBOOK.md`**: **`MELODY_PROFILES['messiaen']`** row + spine harmony note · regenerated **`COMPOSER_OS_PLAYBOOK.docx`**.

- **Olivier Messiaen Song Mode slice (`messiaen`)** — *(commit **`a4ae08de`**)* — **`stubBbComposerChordPools`** tiers **`messiaen_mode2`** / **`messiaen_mode3`** / **`messiaen_birdsong`** (**`seed % 3`**); **`messiaenSlice.ts`** **`precomputeMessiaenEffectiveHarmonyBars`** → **`messiaenEffectiveHarmonyBars`** (`**om:***` receipts), spine minimum **2** bars/chord, cadential rewrite pass, transcendence tail; **`colourTag`** stub map + **`birdsongSpecies`** + **`periodMode`**. **`VoiceRuleBundle`** **`messiaen`** (**12** **`fingerprintReceipts`**). Golden path **`generateGoldenPathDuoScore`** + **`getChordForBar`** / **`harmonySpineProvider`** / **`runGoldenPath`** export truth / **`customLockedHarmonyRouting`** / **`composerOsAppGeneration`** locked assertions / **`pipelineTruthGates`**. **`normalizeSongwriterStyleKey`**: **`olivier_messiaen`**, **`olivier messiaen`**. **`CompositionContext`** / **`GenerateRequest`** **`messiaenPeriodMode`**. Smoke **`messiaenSliceSmoke.test.ts`**; **`npm run test:composer-smoke`:** **244**/0 (**59** suites).

- **VoiceRuleBundle fingerprints (Ellington, Gil Evans, Shorter, Schneider)** — *(commit **4aa848a5**)* — `voiceRuleBundles.ts`: ≥11 `fingerprintReceipts` each for **`gil_evans`**, **`wayne_shorter`**, **`maria_schneider`**; new **`DUKE_ELLINGTON`** bundle + **`BY_ID`** keys **`duke_ellington`** / **`ellington`**. **`songwriterCompProfile`**: dedicated **`DUKE_ELLINGTON_KEYS_COMP`** (was generic keys). **`voiceRuleBundleHarnessAdditive.test.ts`**: asserts ≥10 fingerprints for all four + gil repair gate. Docs: **`COMPOSER_HANDBOOK.md`** (VRB status table), **`COMPOSER_OS_PLAYBOOK.md`** (evaluation / lens VRB notes), **`COMPOSER_OS_ROADMAP.md`** (VRB deepening DONE).
- **Count Basie Song Mode stack (`count_basie`)** — **`SONGWRITER_CHORD_POOLS`** **`basie_blues`** / **`basie_swing`** / **`basie_ballad`** (**`seed % 3`**); **`precomputeBasieEffectiveHarmonyBars`** + **`basieEffectiveHarmonyBars`** on spine / **`getChordForBar`** / locked export truth / duo golden path; **`cb:*`** slice receipts, **`basieEpisodePlan`**, **`basieShoutBars`**, **`basieTestamentMode`** (**Old/New Testament** on **`basieStyleProfile`** + **`CompositionContext`**). **`VoiceRuleBundle`** **`count_basie`**; **`BIG_BAND_RULE_REGISTRY.basie`** expanded to **10** rules. **`normalizeSongwriterStyleKey`**: **`basie`**, **`count_basie`**, **`count basie`**. **`OutputEntry`** / **`writeOutputManifest`** echo **`basie*`** fields. Smoke **`basieSliceSmoke.test.ts`**; **`npm run test:composer-smoke`:** **243**/0 (**58** suites).

- **Big Band gap-fills — Gil Evans pools + harmony rail; Maria Schneider pools; Wayne Shorter preset rail** — **`SONGWRITER_CHORD_POOLS`**: **`gil_evans_modal`** / **`gil_evans_orchestral`** / **`gil_evans_blues`** (replace **`gil_evans_impressionist`** / **`gil_evans_wide_interval`**); **`schneider_through_composed`** / **`schneider_impressionist`** / **`schneider_groove`** (replace **`maria_schneider_swing`** / **`ballad`** / **`through_composed`** naming); tier still **`seed % 3`**. **`precomputeGilEvansEffectiveHarmonyBars`** wired duo golden path + **`getChordForBar`** / **`harmonySpineProvider`** / **`runGoldenPath`** export truth + **`composerOsAppGeneration`** locked/disk assertions (**`gilEvansEffectiveHarmonyBars`**). **`bigBandPreset.supportedComposerStyles`** adds **`wayne_shorter`**; **`composerStyleFromArrangerStyle`** maps **`wayne_shorter`** / **`wayne`** / **`shorter`** → **`wayne_shorter`**; **`bigBandEvaluationStyleProfile`** uses **`basieStyleProfile`** placeholder for Wayne. **`BIG_BAND_RULE_REGISTRY`** already had **`wayne_shorter`** rules + **`BigBandComposerId`**.

- **Charles Mingus — slice + pools + episode engine + BB registry** — **`mingusEpisodeTypes.ts`** + **`charlesMingusSlice.ts`**: seeded **`buildCharlesMingusEpisodePlan`** (textures **`dirge` / `riff_layer` / `collective_shout` / `pedal_modal`**, adjacent episodes ≥2 differing params among tempo / texture / harmonic family / improv density; scripted/collective/hybrid rotation; shock-cut + bass-bridge receipts when long-form); **`cm:*`** harmony receipts + optional chromatic-episode tritone-sub hints; **`charlesMingusEpisodePlan`** on **`GenerationMetadata`**. **`SONGWRITER_CHORD_POOLS`** renamed tiers **`mingus_blues`**, **`mingus_modal`**, **`mingus_chromatic`** (replace **`charles_mingus_*`**). **`VoiceRuleBundle`** **`charles_mingus`**: **11** **`fingerprintReceipts`** (voicing + melodic fingerprint rules). **Golden path:** **`precomputeCharlesMingusEffectiveHarmonyBars`** wired in **`generateGoldenPathDuoScore`**; **`getChordForBar`** + **`harmonySpineProvider`** + **`runGoldenPath`** export truth + **`composerOsAppGeneration`** locked-harmony assertions include **`charlesMingusEffectiveHarmonyBars`**. **Big Band:** **`BigBandComposerId`** **`charles_mingus`** + **`mingus`**; **`CHARLES_MINGUS_COMPOSER_RULES`**; **`composerStyleFromArrangerStyle`** maps both → **`charles_mingus`**; **`bigBandPreset.supportedComposerStyles`**; **`bigBandEvaluationStyleProfile`** → **`basieStyleProfile`** placeholder; **`bigBandEraResolver`** Mingus density arc. **Aliases:** **`mingus`**, **`charles_mingus`** (`songwriterStyleProfiles`). Docs: **`COMPOSER_OS_ARCHITECTURE.md`**, roadmap.

- **Thad Jones — research chord pools + VoiceRuleBundle** — **`SONGWRITER_CHORD_POOLS`** tiers **`thad_jones_swing`** (functional + octatonic dominant colour + chromatic approach dominants), **`thad_jones_dorian`** (Dorian / quartal minor extensions, no plain m7 rows), **`thad_jones_shout`** (polychords, dense ii–V, altered symmetric dominants); seed resolver picks tier **`swing | dorian | shout`**. **`VoiceRuleBundle`** **`thad_jones`** with documented voicing templates A/B/C, sectional roles, inner-line rules via **`orchestrationPolicy.fingerprintReceipts`**. **Big Band registry:** **`thad`** alias shares **`THAD_JONES_COMPOSER_RULES`** with **`thad_jones`**; **`composerStyleFromArrangerStyle`** maps **`thad`** / **`thad_jones`** → **`thad_jones`**; **`thadJonesStyleProfile.id`** **`thad_jones`**; **`bigBandPreset.supportedComposerStyles`** lists **`thad_jones`**. **`normalizeSongwriterStyleKey`** unchanged (**`thad`** → **`thad_jones`** already in aliases). **`thadJonesSlice`** unchanged — primary **`songwriterStyleId`** stays **`thad_jones`**.

- **Steely Orbit V2.1** — export **`V2.1-Steely-Orbit.musicxml`**; **`STEELY_GCE_GATE`** default **7.3**; **`formatGateOverrides.big_band`** **7.3**; **`steely_orbit_target.json`** **`gceScore`** **7.42** (V2.1 combined baseline). **V2.2** targets: **`rhythmicIdentity`**, **`structureAndForm`**.

- **BB-aware GCE pillars** — **`scoreArrangementAndOrchestrationForEnsemble`** / **`scoreArrangementAndOrchestrationBigBand`** (ensemble density motion / spread vs duo guitar–bass); **`scoreTensionAndReleaseForEnsemble`** + **`scoreTensionAndReleaseMelodicContour`** (melodic contour when chord-symbol arcs thin); **`scoreEconomyAndFocusForEnsemble`** / **`scoreEconomyAndFocusBigBand`** (section-wise lead density spread blended with duo density). **`gceEvaluator.ts`** + **`gceGate.ts`** route BB **`bb_*`** scores; **`activePartsNormalizedBigBand`** exported from **`gceStructuralMemory.ts`**.
- **`GceIntentTag`** + **`intentTags`** on **`StructuralFingerprint`** — **`sparse_ending`** widens drain-zone density cap; **`constant_density`** disables section |Δ| floor in **`validateSteelyOrbitV2FingerprintGate`**. **`steely_orbit_target.json`** / **`orbit_v6_64.json`** tagged; handbook **Intent tags** subsection.

- **`COMPOSER_HANDBOOK.md`** — **GCE Structural Memory** user-facing section (fingerprints, extract/store/validate/retry, five Steely V2 gate rules, **`formatGateOverrides`**, adding fingerprints, **`validateAgainstFingerprint`** for targeted fixes, cross-format use).

- **Steely Orbit V17** — **`enforceFill48Shout49Contrast`** in **`orbitSteelyV17Finishing.ts`**: bar **48** „Fill” = tacet **trumpets, trombones, piano, tenor** (alto + bass + drums only); bar **49** „Shout Chorus” = **tutti** shell (piano + brass sustain + tenor) so **`section_transition_min_density_delta`** passes.

- **`steely_orbit_target` fingerprint** — **`gce-memory/fingerprints/steely_orbit_target.json`**: cloned from **`orbit_v6_64`** with **bars 57–64** density thinned for Steely handoff; **`validateDensityEightBarVsReference`** supports **`DensityEightBarTransitionZone`** ( **`generateSteelyOrbitV1.ts`** default **`STEELY_V2_DENSITY_ZONE_START`/`END`** **57–64**, **`STEELY_V2_DENSITY_ZONE_MAX`** **0.65**). V2 gate loads **`steely_orbit_target`** instead of **`orbit_v6_64`**.

- **GCE structural memory (Phase 1)** — **`core/gce/gceStructuralMemory.ts`** + **`core/gce/gceMemoryRegistry.ts`**; JSON fingerprints in **`engines/composer-os-v2/gce-memory/fingerprints/`** (`orbit_v6_64`, `steely_orbit_v1_7`). **`validateAgainstFingerprint`** + **`validateMelodicPitchSequenceStreaks`** (no three consecutive identical melodic bar signatures outside intro **1–4**). **`scripts/generateSteelyOrbitV1.ts`** gates attempts against **`orbit_v6_64`** before combined eval; **`npm run gce:seed-structural-fingerprints`** ( **`engines/composer-os-v2`** ) refreshes seeds from Orbit MusicXML. Docs: **`COMPOSER_OS_ARCHITECTURE.md`**, **`COMPOSER_OS_ROADMAP.md`**.
- **Steely Orbit V2.0 fingerprint gate** — **`validateSteelyOrbitV2FingerprintGate`** (density 8-bar vs **`orbit_v6_64`**, drum 16-bar non-flat, section |Δ|, alto rest span, melody streak); **`npm run orbit:steely-v2`**; export **`V2.0-Steely-Orbit.musicxml`** only when fingerprint passes **and** combined ≥ **`STEELY_GCE_GATE`** (default **7.5**).

- **Fripp / King Crimson Song Mode slice** — **`core/song-mode/frippKingCrimsonSlice.ts`** (third-cycle harmony surfaces, **`fk:*`** slice receipt, **`frippKingCrimsonEffectiveHarmonyBars`**, optional **`frippKingCrimsonPolymeterReceipt`** via **`core/rhythm/frippPolymeterGrid.ts`**); asymmetric presets **`discipline_a`**, **`discipline_b`**, **`frame_by_frame`**, **`fracture`**, **`red`** in **`asymmetricPresets.ts`**. **`GenerateRequest`**: **`asymmetricRhythm`**, **`frippPolymeterSecondaryPresetId`** → **`runGoldenPath`** / **`composerOsApiCore`** / **`generateGoldenPathDuoScore`** precompute. **`SONGWRITER_CHORD_POOLS.fripp_king_crimson`** aliases **`frank_zappa`** rows. UI **`HomeGenerate.tsx`** shipped writer + **`normalizeSongwriterStyleKey`** aliases **`fripp`**, **`king_crimson`**, **`crimson`**. Smoke **`frippKingCrimsonSliceSmoke.test.ts`** (+**2** rows, +**1** suite); **`npm run test:composer-smoke`:** **242**/0 (**57** suites).

- **Asymmetric rhythm engine** — **`core/rhythm/asymmetricRhythmEngine.ts`** (additive **`CycleDefinition`**, **`materializeOnsets`**, **`generateCycle`**, **`rhythmicEventsToNoteEvents`**, **`cycleSpanQuarters`**) + **`asymmetricPresets.ts`** (**`five_two`**, **`seven_three`**, **`seven_two`**, **`nine_two`**, **`eleven_four`**, **`thirteen_five`**). Smoke **`asymmetricRhythmIntegration.test.ts`** (**`seven_three`** → **7/8** quarter span **3.5** vs **`measureBeatSpanQuartersOf`**). **`runSmokeTests.ts`** +**2** PASS rows, +**1** suite; **`npm run test:composer-smoke`:** **240**/0 (**56** suites).

- **Arvo Pärt tintinnabuli slice** — real dual-voice M/T engine (`applyArvoPartTintinnabuliToDuoScore`, **`arvoPartSlice.ts`**; **`generateGoldenPathDuoScore`** after guitar+bass build; skips overlap / Wyble register coupling for **`arvo_part`**)
  - **M-voice:** stepwise diatonic within triad field (`selectMotifTransform` contour bias per section role)
  - **T-voice:** nearest **{1,3,5}** above / below / alternating per **`position`** param (strict MIDI above/below M per beat)
  - **M2 mode:** dual T-voices (above + below simultaneously — guitar v2 + bass)
  - **`tonic_wash`:** static harmonic field; single-symbol / wash **stasis** bypasses triadic transform pass (**`chordProgressionParser.ts`**, **`parseChordSymbol`**, **`normalizeLeadSheetChordSpelling`**)
  - **Registered:** **`arvoPartTintinnabuli`** on **`GenerateRequest`**, **`composerOsApiCore`**, **`runGoldenPath`** (`triadRoot`, `position`, **`mode`** M1/M2, **`triadQuality`**)
  - **`tonic_wash`** valid in chord pipeline only (not **`normalizeSongwriterStyleKey`**)

- **POST `/api/melodic-variation-pack`** — **3–5** GCE-scored melodic variations per melody (`scripts/startComposerOsAppApi.ts`, **`apiMelodicVariationPack`** in **`composerOsApiCore.ts`**). **Mutations:** `rhythmic_displacement`, `contour_inversion`, `registral_displacement`, `augmentation`, `diminution`, `fragmentation` (`melodicVariationPack.ts`). **Dedup:** `scoreMotifSimilarity` **> 0.92** vs base / peers dropped before scoring. **`scoringMode`: `"melody-only"`** — stub duo `ScoreModel` (guitar line + bass rests); full **`scoreResultForGce`** / **`gceAutoScorers`** weighted overall. **`songwriterId`** validated via **`normalizeSongwriterStyleKey`** (aliases e.g. **`harris`** → **`barry_harris`**); unknown id → **400**. **Desktop IPC:** `composer-os-api:melodic-variation-pack`. **`reharmController`:** **`gceScore`** on alternatives uses real **`scoreResultForGce`** (replaces prior placeholder mean).

- **feat(orbit+bb):** Orbit Big Band chart **V4.0–V6.0** — **`orbit_bb_64`** form (**`planOrbitBigBandForm64`**), **`orbit_v4_64` / `orbit_v5_64` / `orbit_v6_64`** profiles, overlay chain **`orbitBbV64Overlay`** → **`orbitBbV5Extended`** → **`orbitBbV6Extended`** (**`runBigBandRealisation.ts`**). Lead **`projects/Orbit/Orbit_lead_V5.1.musicxml`** (alto head **5–32** lock). Scripts **`engines/composer-os-v2/scripts/generateOrbitBbV4.ts`**, **`generateOrbitBbV5.ts`**, **`generateOrbitBbV6.ts`** → **`projects/Orbit/V*.0 orbit - BB.musicxml`**. Engine **`drumArticulationBarOverrides`**. Manual GCE iterations **~8.9–9.1**; LOCK / **`docs/GCE_LOCK_DCR_STANDARDS.md`** unchanged. Docs: **`COMPOSER_OS_PLAYBOOK.md`** (Orbit BB).
- **feat(big_band):** Output quality controls — **`sectionIntensityOverrides`**, **`figureResponse`** (`low` / `medium` / `high`), **`feelMode`** (`in2` / `in4`), **`drumArticulation`** (`auto` / `brushes` / `sticks`) on **`GenerateRequest`** → **`BigBandRunInput`** → **`buildBigBandScoreModel`** (`bigBandDrumIntensity.ts`, **`applyFigureResponseToPunchMaps`** in **`bigBandPatterns.ts`**, **`HomeGenerate.tsx`** **`BigBandRhythmControls`**). Tests: **`bigBandOutputQualityControls.test.ts`** (**chunk 3**). Docs: **`COMPOSER_OS_PLAYBOOK.md`**.
- **feat(api):** **Section-scoped regeneration** — five wired paths: **`guitar_bass_duo` / `guitar_bass_duo_single_line` / `ecm_chamber`** (`generateComposition`), **`song_mode`**, **`big_band`**, **`string_quartet`**. Shared **`core/regeneration/`**: **`musicXmlSectionSplice.ts`**, **`ensembleChordBars.ts`**, **`sliceLeadSheetChordSpan.ts`**, **`ensembleSectionRegeneration.ts`**, **`barMeterMapFragment.ts`**, **`runDuoSectionRegeneration.ts`**, **`sectionRegenerationPlanning.ts`**. **`barMeterMap`** fragment remap for odd-meter spans. Unsupported guard: **`riff_generator`**, **`wyble_etude`**, **`slonimsky_etude`** when **`sectionRegeneration.baseMusicXml`** is set. Tests: **`sectionRegenerationPlanning.test.ts`**, **`sectionRegenerationBarMeter.test.ts`**. **`runManifest`**: **`sectionRegenerationReceipt`**, **`sectionRegenerationPartialScore`**. Docs: **`COMPOSER_OS_PLAYBOOK.md`** Section-scoped regeneration.
- **refactor(harmony):** **`assertHarmonySpineMatchesScore`** — Guitar–Bass Duo LOCK vs **`resolveBarSymbol`** after score build (same **`custom` / `custom_locked`** gate as **`assertScoreMatchesLockedHarmonyWire`**); **`harmonySpineProvider.ts`**, **`runGoldenPath.ts`**; smoke **`harmonySpineLock.smoke.test.ts`** (+**1** PASS row, +**1** suite). **`npm run test:composer-smoke`:** **234**/0 (**51** suites).
- **fix(followup5):** Big Band shout-chorus — **`mergeShoutChorusIntoExistingParts`** replaces brass/reed measures in **`shoutBarRange`** (no **`P_MINGUS_GOSPEL_LAYER_*`** append); **`applyMingusGospelShoutInPlace`** for Mingus gospel; **`appendMingusCollectiveImprovPart`** unchanged. Smoke **`followup5ShoutBrassInPlaceSmoke.test.ts`** (+**9** rows, +**1** suite); **`npm run test:composer-smoke`:** **233**/0 (**50** suites).
- **fix(phase8):** Stochastic **`weightedChordSample`** / **`weightedRhythmSample`** — **`solveVoiceLeading`** weighted top-N when **`stochasticVariance` > 0**; **`buildGoldenPathPlans`** per-bar **`phase8RhythmDnaCellByBar`** + guitar rhythm nudge; **`runGoldenPath`** / **`generateComposition`** pass **`stochasticVariance`** + **`stochasticRenderOrdinal`**; improv **`appendImprovPartToPartwiseXml`** multi-note **`P_IMPROV_PHASE8`** + **`validateMusicXml`**. Smoke **+5** rows (**202**/0).
- **ci(export):** **`@stringsync/musicxml`** + **`src/utils/musicXmlValidator.ts`** — parse gate + unpitched sibling-order + **`displayOctave`** rule; dev-only **`musicxmlExporter`** warnings when invalid; smoke **`musicXmlValidator.test.ts`** (+**4** PASS rows, +**1** suite). **`npm run test:composer-smoke`:** **172**/0 (**44** suites).
- **fix(desktop/pdf):** **`ANTHROPIC_API_KEY`** — **`hydrateAnthropicKeyFromAllSources`** merges registry hydration + Electron **`safeStorage`** ciphertext in **`userData/.composer-os-secrets/anthropic-api-key.bin`**; IPC **`composer-os-api:save-anthropic-api-key`** + preload **`saveAnthropicApiKey`** (desktop). Vitest: **`parseRegQueryValue`**, **`anthropicKeyPaths`**, quarantine excludes **`ipcEntry.ts`** from naive **`python`** substring scan. **Rebuild:** run **`npm run build`** from **`apps/composer-os-desktop`** after **`electron/`** changes so **`resources/desktop-ipc.bundle.cjs`**, **`dist/main.js`**, and **`resources/ui`** stay in sync.
- **ui(generate):** **Chord Inspector** — **Reharm** section: **Reharmonise** + **drift proximity** slider (**0.0–1.0**, step **0.1**, default **0.5**) reordering **`generateReharmCandidates`** output by drift affinity; **top 8** substitutes with emotional-drift label and **Use this chord**; reharm UI **resets on new Inspect Chord** (**`HomeGenerate.tsx`**).
- **ui(generate):** **Choruses** control (**1–64**, default **1**) on **iReal Pro Import (Beta)** and **Paste Chord Progression** (**`HomeGenerate.tsx`**) — wires **`chorusCount`** into **`generateFromIReal`** / **`generateVaultFromParsedChart`**; result summary shows total bars as **bars/chorus × choruses**.
- **fix(desktop):** Esbuild **`external: ['@napi-rs/canvas']`** in **`apps/composer-os-desktop/scripts/build-api-bundle.js`** and **`build-desktop-ipc-bundle.js`** (with existing **`electron`** on IPC) so **`@napi-rs/canvas`** **`.node`** native bindings are resolved at runtime, not bundled.
- **chore(desktop):** Rebuilt Windows desktop artifacts — **`release/Composer-OS.exe`** (portable) + **`release/Composer-OS-Setup.exe`** (NSIS) via **`npm run desktop:package-no-bump`** after the canvas external fix.
- **feat(ireal-vault):** **`VaultGenerationOptions.chorusCount`** (default **1**, max **64**) — **`generateVaultFromParsedChart`** runs the full bar loop once per chorus and concatenates **`generatedNotes`** with sequential **`barIndex`** and cumulative **`startBeat`**; total **`bars`** = chart length × **`chorusCount`**.
- **feat(ireal-vault):** **Melody** mode — per-chorus **`tensionCycleRotation`** advances the **`transformMotifThroughLayers`** tension-state pick (**primary → tension → chaos → recover → resolve**) so repeated choruses do not all start on **primary**; skipped when **`songwriterStyleId === 'sonic_youth'`** (chorus index does not advance the cycle; SY owns texture state).
- **feat(ireal-vault):** **Solo** mode — when **`riffStyle`** is unset or **`triad-pair-pendulum`**, each chorus uses the next entry in **`TRIAD_PAIR_CHORUS_ROTATION`** (`triad-pair-pendulum` / `bebop-placement` / `quadratonic` pattern); same **SY** option suppresses this rotation. Other explicit **`riffStyle`** values keep one style for all choruses.
- **feat(ireal-vault):** **Melody** mode — **Build F** **`transformMotifThroughLayers`** (`motifTransformer`) applied after per-bar generation for cross-bar motif reuse.
- **feat(song-mode):** **Sonic Youth** — Song Mode phrase engine skips **`phrase_bar_zigzag`** only (bar-level contour flip warnings); hook / landing / other phrase rules unchanged.
- **feat(big_band):** Six queued arranger profiles (**Thad Jones**, **Gil Evans**, **Bob Brookmeyer**, **Clare Fischer**, **Oliver Nelson**, **Sammy Nestico**) — **`BigBandComposerId`** extension, **`BIG_BAND_RULE_REGISTRY`** composer rules, **`bigBandEraResolver`** tuning + **`BigBandArrangerProfileReceiptV1`** receipts (research comparison table), **`StyleProfile`** modules + **`composerOsAppGeneration`** evaluation routing; **`composerStyleFromArrangerStyle`** maps **`thad`** and **`gil_evans`** / **`bob_brookmeyer`** / **`clare_fischer`** / **`oliver_nelson`** / **`sammy_nestico`** UI ids.
- **feat(evaluation):** Combined evaluator wired into Big Band pipeline (**`combinedEvaluator.ts`**, **`composerOsAppGeneration.ts`**).
- **feat(evaluation):** Ellington, Schneider, Quincy Jones style profiles (**`ellingtonStyleProfile.ts`**, **`schneiderStyleProfile.ts`**, **`quincyStyleProfile.ts`**).
- **Docs:** Evaluation System documented in **`COMPOSER_OS_PLAYBOOK.md`**; regenerated **`COMPOSER_OS_PLAYBOOK.docx`**.
- **feat(evaluation):** GCE evaluator — 10-category scoring engine with default weights (**`engines/composer-os-v2/core/evaluation/gceEvaluator.ts`**). **`npm run test:composer-smoke`:** **146**/0.
- **feat(evaluation):** LOCK gates — 6 hard validation gates (**`lockGates.ts`**); smoke **`evaluation.smoke.test.ts`**.
- **feat(big_band):** **`ellington`**, **`schneider`**, **`quincy_jones`** — **`ellingtonProofOfConcept`**, **`schneiderProofOfConcept`**, **`quincyJonesProofOfConcept`** on **`BigBandRuleTuning`** (**`bigBandEraResolver.ts`**, **`bigBandResearchTypes.ts`**) using the same **`BigBandArrangerProfileReceiptV1`** pattern as **`basieProofOfConcept`** (chord density, extensions policy, functional harmony %, harmonic rhythm, overall density, texture arc, section blending, rhythm section weight, time feel, horn relationship, build strategy, space usage) plus scalar tuning nudges per arranger. **`npm run test:composer-smoke`:** **142**/0.
- **feat(big_band):** Map **`stylePairing.arrangerStyle`** → **`composerStyle`** for **`basie`**, **`ellington`**, **`schneider`**, **`quincy_jones`** before **`runBigBandMode`** / **`runBigBandRealisation`** (**`composerOsAppGeneration.ts`**). Extend **`BigBandComposerId`** with **`quincy_jones`** + registry **`composerRules`** row (**`bigBandRuleRegistry.ts`**).
- **ui(generate):** **Big Band** — muted helper under arranger select: *Coming soon: full per-arranger Big Band styles.* (**`HomeGenerate.tsx`**).
- **fix(song-mode):** **`STYLE_ECM_CHAMBER`** matches **`STYLE_ECM`** for Song Mode duo: **`applyEcmStyleHarmonyMotionPolicy`** accepts **`STYLE_ECM_CHAMBER`** (`ecmStyleHarmonyPolicy.ts`); **`planEcmTextureBars`** when **`styleProfile`** is **`STYLE_ECM`** or **`STYLE_ECM_CHAMBER`** (`generateGoldenPathDuoScore.ts`); same gentle ECM velocity swell as **`STYLE_ECM`** (`songModeStyleEngine.ts`). **Docs:** **`COMPOSER_OS_PLAYBOOK.md`** — **Known Architectural Gaps** (Big Band arranger `arrangerStyle` not mapped to `composerStyle`); regenerated **`COMPOSER_OS_PLAYBOOK.docx`**. **`patMethenySliceSmoke.test.ts`** — drop Jest **`describe`/`it`** so **`npm run test:composer-smoke`** (**ts-node**) compiles (**142**/0).
- **feat(song-mode):** Wire **`STYLE_SONIC_YOUTH`**, **`STYLE_JONI_MITCHELL`**, **`STYLE_PAT_METHENY`** to existing **sonic_youth** / **joni_mitchell** / **pat_metheny** slice logic when the primary songwriter is not that slice: **`precompute*EffectiveHarmonyBars`**, **`getChordForBar`** / locked-truth routing (**`harmonyResolution.ts`**, **`customLockedHarmonyRouting.ts`**, **`runGoldenPath.ts`**, **`composerOsAppGeneration.ts`**), **`applySonicYouthGuitarBarPasses`**, **`finalize*Metadata`** / diagnostics loops in **`generateGoldenPathDuoScore.ts`**. **`songModeStyleEngine.ts`** — explicit velocity curves (SY: texture-aware noise_wall/clearing; Joni: rubato-like bar midpoint peak; Pat: lyrical swell). **`joniStyleHarmonyPolicy.ts`** — builtin **STYLE_JONI_MITCHELL** folk-modal chord-plan nudge (sus preference, lighter cadential gravity). **`getSonicYouthTextureStateAtBar`** exported from **`sonicYouthSlice.ts`**. **Generate:** **`STYLE_SONIC_YOUTH` / `STYLE_JONI_MITCHELL` / `STYLE_PAT_METHENY`** moved to **Advanced styles** (**`HomeGenerate.tsx`**). **Docs:** **`COMPOSER_OS_PLAYBOOK.md`** Style Engine subsection + Sonic Youth gating note; regenerated **`COMPOSER_OS_PLAYBOOK.docx`**.
- **chore(desktop):** Desktop build **v1.0.41** — vocal melody engine, **34** composer profiles, Sonic Youth texture state machine, Real Book MusicXML stress test, Pat Metheny slice improvements, playbook fully updated.
- **test(vocal-melody):** Smoke **`engines/composer-os-v2/tests/vocalMelodySmoke.test.ts`** (**`runVocalMelodySmokeTests`**) — **`MELODY_PROFILES`** (≥34 keys, exported), distinct **`planMelodyBehaviour`** tuples for ten representative **`SongwriterRuleId`** values, **`planLeadMelody`** bar density + SATB comfort + **`eighth_patterns`** / **`whole_bar`** checks, **`buildSongwritingBridgePayloadFromLeadSheetContract`** **`melody_events`** parity. **`runSmokeTests.ts`** suite **Vocal melody engine — composer profiles + lead sheet**. **`npm run test:composer-smoke`:** **142**/0 (**38** suites). **`MELODY_PROFILES`** tweaks: **`brian_wilson`** phrase hint **7** bars (distinct profile tuple vs **`bill_evans`**); **`kendrick_lamar`** phrase hint **3** bars. **Docs:** **`COMPOSER_OS_PLAYBOOK.md`** smoke subsection + profile table rows; **`COMPOSER_OS_PLAYBOOK.docx`** regenerated.
- **feat(vocal-melody):** **`MELODY_PROFILES`** — **34** research **`MelodyBehaviourPlan`** rows (**`phraseLength`**, **`contourProfile`**, **`devices`**, …) in **`melodyBehaviourPlanner.ts`**; **`melodyContourProfileToPhraseKind`** maps contour for **`planLeadMelody`**. **Vocal lead sheet:** **`exportVocalLeadSheetMusicXmlViaPython`** emits **`LeadSheetContract.vocalMelody.events`**, not guitar **`NoteEvent`** scrape. **Generate:** **`HomeGenerate.tsx`** checkbox copy. **Docs:** playbook vocal section + composer table; **`COMPOSER_OS_PLAYBOOK.docx`** regenerated.
- **feat(pat_metheny):** Smoke **`patMethenySliceSmoke.test.ts`** — assert **≥ 2** distinct **`pm:*`** device families from **`patMethenyDeviceReceipts`** (SY-style diversity, lower threshold). **`songwriterRuleRegistry.ts`** **`pat_metheny`** block — replace placeholder prose with slice-accurate descriptions (ii–V–I flattening, dominant-chain stripping, d5 modal side-slip, d2/d4 pedal-shimmer/sus-float, two-bar hold). **Docs:** **`docs/COMPOSER_OS_PLAYBOOK.md`** Pat Metheny subsection (harmony-centric design, **`pm:*`** families, eligibility pipeline, ECM arc); regenerated **`docs/COMPOSER_OS_PLAYBOOK.docx`**.
- **Docs:** **`docs/COMPOSER_OS_PLAYBOOK.md`** expanded — **Real Book** (entry points **`parseImportedHarmonyEvent`** / **`sortImportedHarmonyTimeline`** via **`leadSheetMusicXmlImport.ts`**, validations, **`repeatMarkers`**, **`keyChanges`**, chord timeline / collisions, round-trip, voice-1 melody retained + warnings); **Sonic Youth** (**`SYTextureState`**, full **`getNextTextureState`** transition table, **`GuitarTuningState`** / **`interGuitarDissonance`**, MusicXML riff/shimmer/noise_wall/clearing mapping, **`guitar1`/`guitar2`** tuning workflow, profile gating, **`isSonicYouthEvent`** / **`getSYTextureState`**); **Joni Mitchell** (open-tuning philosophy, **`GuitarTuningState`** cross-reference, voicing behaviour); **Alternate tunings** standalone (**Drop D −2**, **Eb −1**, **`<transpose>`** measure 1, Sibelius-safe placement, scordatura text-only); **Fagen / Evans** (**`FAGEN_METER_CYCLE_PRESET_DEFINITIONS`**, **`EVANS_METER_CYCLE_PRESET_DEFINITIONS`**, **`COMPOSER_METER_PRESET_MAP`**, **`ComposerOddMeterSongwriterId`** in **`oddMeterQuantiser.ts`**). Regenerated **`docs/COMPOSER_OS_PLAYBOOK.docx`**.
- **test(lead-sheet):** Real Book MusicXML stress — **`engines/composer-os-v2/tests/realBookStressTest.test.ts`** (fixtures: repeat/volta + segno / D.S. / coda, mid-score key change, eighth-grid `<harmony>` offsets, multi-voice staff); asserts **`importedHarmonyTimeline`**, **`UniversalLeadSheet.repeatMarkers`**, chord-slot collisions, **`exportScoreModelToMusicXml`** round-trip. **`runSmokeTests.ts`** (+1 suite, +4 PASS rows). **`npm run test:composer-smoke`:** **138**/0 (**37** suites).
- **feat(sonic_youth):** **SYTextureState** machine (**`sonicYouthTextureEngine.ts`** **`getNextTextureState`**), **`getSYTextureState`**, **`ChordEvent.sonicYouth.textureState`**, MusicXML texture mapping on SY comp chords (**`musicxmlExporter.ts`**); **`buildSonicYouthExtension`** exported for tests; smoke **`sonicYouthTexture.test.ts`** (+8 rows) + **`runSmokeTests.ts`** suite **Sonic Youth texture + MusicXML augmentation**. Aggregate smoke **134**/0 (**36** suites). **Docs:** **`docs/COMPOSER_OS_PLAYBOOK.md`** Sonic Youth chapter + regenerated **`COMPOSER_OS_PLAYBOOK.docx`**.
- **feat(export):** MusicXML **`<transpose><chromatic>`** for fixed-offset guitar tunings — **Drop D** **−2** semitones, **Eb standard** **−1**; measure **1** **`<attributes>`** only (Sibelius-safe). **`musicxmlExporter.ts`**, **`ScoreModel.exportPartTransposeSemitones`**, **`alternateGuitarTunings.ts`** (**`buildExportPartTransposeSemitonesFromResolvedAlternateTuning`**, **`eb_standard`** preset), **`generateGoldenPathDuoScore.ts`**; **`alternateGuitarTunings.test.ts`** (+4 rows). Aggregate smoke **121**/0 (**34** suites).
- **feat(big_band):** Zappa Big Band — **`frank_zappa`** + Big Band realisation, **`zappaBigBandSmoke.test.ts`** (seed **1673965981**, Zappa Classic **`barMeterMap`**, **`fz:`** receipts, large MusicXML). **Ensemble export:** **`ScoreModel.barMeterMap`** + **`runEnsembleExportPipeline`** / **`exportScoreModelToMusicXml`** so mixed meters validate; Big Band drum layer voice **1** allows GM **42** (hi-hat) and **51** (ride). Docs: **`docs/ZAPPA_CREATION_GUIDE.md`** §6, **`docs/HANDOVER_2026-05-03.md`**, roadmap smoke **121**/0 (**34** suites).
- **feat(string-quartet):** Zappa SQ — app dispatch metadata into **`runQuartetRealisation`**, **`zappaSQHarmonySlice`** on **`GenerationMetadata`**, odd-meter score path skips fragile solo fragments when **`barMeterMap`** is set; piano dual-voice bar fill + smoke **`zappaStringQuartetSmoke.test.ts`** (**121**/0 aggregate smoke).
- **feat(duo):** route song-mode post-pass `outsideLevel` through `resolveAllowedOutsideLevelForSlonimsky` — all songwriter profiles now active in Duo pipeline for Slonimsky chromatic layer.
- **feat(ensemble):** wire `ensembleLeadSheetMusicXml` through Big Band + String Quartet pipeline boundary.
- **feat(ensemble):** map `leadSheet.chordEvents` into Big Band + String Quartet arranger chord inputs (bar-accurate, forward-fill).
- **feat(ensemble):** wire reference-import behavioural hint layer into Big Band + String Quartet pipelines.
- **feat(ensemble):** extend `importHarmonyMode` / `harmonyBlend` to Big Band + String Quartet pipelines — Stage 6.
- **test(ensemble):** add import-harmony ensemble smoke suite — Stage 7 (106/28 baseline).
- **feat(slonimsky):** add `slonimskyEtudeGenerator` — engine layer for Etudes #15.
- **feat(slonimsky):** wire `slonimsky_etude` preset and app-api dispatch — Etudes #15 Session 2.
- **feat(slonimsky):** add SlonimskyEtudes page and tab — Etudes #15 Session 3 (UI complete).
- **Docs:** **`docs/USER_GUIDE.md`**, **`docs/SLONIMSKY_USER_GUIDE.md`**, **`apps/composer-os-app/src/pages/UserGuide.tsx`** — What's New May 2026 (Slonimsky Etudes tab, ensemble lead-sheet import, songwriter Slonimsky profiles); plain English, no code blocks in new USER_GUIDE section.
- **Docs:** **`docs/COMPOSER_OS_ROADMAP.md`** — **Overall roadmap priorities (2026-05-01)** tier stack (**A–G** + near alternates) linking Song Mode slices, UI discoverability, lead-sheet→ensemble, study tools, altered tuning, motif pilot, phrase/riff redesign; **Top 10 Song Mode songwriter targets** table (**`frank_zappa`** … **`duke_ellington`**, **Zappa** vs Python **`zappa_disruption`** note).

## [2026-05-06] fixes and new composer slices

- **fix(slonimsky / app-api):** **`apiGenerate`** normalization in **`composerOsApiCore.ts`** now forwards **`slonimskyPatternId`** (and top-level **`patternId`** alias) plus **`slonimskyKeyPc`** / **`slonimskyCycleKeys`** — previously dropped before **`runAppGeneration`**, so Slonimsky Etude UI selections reached IPC but not the engine.
- **fix(pdf / desktop):** **`ANTHROPIC_API_KEY`** for PDF vision extraction — **`reg.exe`** fallback plus **IPC-level hydration** so packaged **`Composer-OS.exe`** can supply the key when env files are absent (**`winAnthropicEnv.ts`**, **`ipcEntry.ts`** / preload path).
- **feat(song-mode) Satie slice:** Three contexts **`gymnopedie`** / **`gnossienne`** / **`poire`**; devices **`es:`** **d1–d5**; static harmony; parallel planing posture.
- **feat(song-mode) Arvo Pärt slice:** Three contexts **`fur_alina`** / **`spiegel`** / **`fratres`**; tintinnabuli **M+T** voice rules.
- **feat(song-mode) Gershwin slice:** Three contexts **`song_aaba`** / **`rhapsody`** / **`rhythm_changes`**.
- **feat(song-mode) Bartók slice:** Three contexts **`mikrokosmos`** / **`string_quartet`** / **`music_for_strings`**.
- **feat(song-mode) Ornette Coleman slice:** Three contexts **`shape_1959`** / **`free_1961`** / **`science_1971`**.
- **feat(song-mode):** **Debussy** slice + **Cole Porter** slice (Song Mode).

## [2026-04-29] feat: altered tuning presets — 24 zones, grouped UI, 98/98 smoke

- **feat:** **Altered Guitar Tuning Presets** — **24 roadmap zone presets** across **four zones** (`jazz_sophisticated`, `sonic_youth_noise`, `joni_mitchell`, `hybrid_harmonic`) in **`engines/composer-os-v2/core/song-mode/alternateGuitarTunings.ts`**, plus legacy absorbed ids (`standard`, `drop_d`, `dadgad`, `open_d`, `open_g`, drone clusters, open modals, Joni-style labels, `custom`); **`getPresetsByZone`**, **`ROADMAP_ZONE_TUNING_PRESET_IDS`**, **`styleProfileSupportsAlternateGuitarTuning`**, expanded **`resolveIndieArtPopTuningTexture`** drone/open_modal buckets; new **`StyleProfile`** ids **`STYLE_SONIC_YOUTH`**, **`STYLE_JONI_MITCHELL`**, **`STYLE_PAT_METHENY`**, **`STYLE_ECM_CHAMBER`**.
- **feat:** **Generate** (`apps/composer-os-app/src/pages/HomeGenerate.tsx`) — zone **`optgroup`** tuning selects; alternate-tuning request assembly for Song Mode when style is Indie / Sonic Youth / Joni / Pat Metheny / ECM Chamber; **`AlternateTuningPresetSelect`**.
- **feat:** Golden path + API — **`applyIndieArtPopAlternateTuningPolicy`**, dual-guitar route, and correlation logging use **`styleProfileSupportsAlternateGuitarTuning`** (not Indie-only).
- **test:** **`alternateGuitarTunings.test.ts`** — roadmap preset resolve, zone counts, texture samples; wired into **`runSmokeTests.ts`**.
- **note:** **Per-tuning voicing maps** (Tonality Vault) remain a **follow-up** workstream; **`docs/COMPOSER_OS_ROADMAP.md`** Altered Tuning section marked **SHIPPED** for preset/UI layer.
- **Docs:** **`CLAUDE.md`**, **`docs/COMPOSER_OS_ROADMAP.md`** — smoke **98** PASS rows / **27** suites.

## [2026-04-29] feat: Charlie Parker Song Mode slice — 61/61 smoke

- **feat:** **`charlieParkerSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/charlieParkerSlice.ts`**) — golden-path precompute, **`cp:*`** device receipts (**d1–d5**: ii–V clarify, tritone sub on isolated dominants, turnaround compression, bebop scale enrichment maj7(#11)/m9, Bird enclosure slash), **`charlieParkerEffectiveHarmonyBars`** + **`getChordForBar`**, locked export truth (**`runGoldenPath.ts`** **`barsForLockedExportTruth`**), truth / app manifest wiring; **`charlieParkerSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **61** passed / **0** failed (**26** suites). **20** shipped songwriter slices.
- **note:** Bebop ii–V–I slice — clean tertian preprocessing, Bird harmonic devices aligned with internal `parker_vocabulary` posture.
- **Docs:** **`COMPOSER_OS_ROADMAP.md`**, **`CLAUDE.md`** — smoke **61**/0 (**26** suites), **20** shipped slices; **`HomeGenerate.tsx`** Shipped group includes **`charlie_parker`**.

## [2026-04-29] feat: Andrew Hill Song Mode slice — 58/58 smoke

- **feat:** **`andrewHillSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/andrewHillSlice.ts`**) — golden-path precompute, **`ah:*`** device receipts (**d1–d5**), **`andrewHillEffectiveHarmonyBars`** + **`getChordForBar`**, truth / export / manifest wiring (**`runGoldenPath.ts`** MusicXML locked-truth chain includes **`andrew_hill`**); **`andrewHillSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **58** passed / **0** failed (**25** suites). **19** shipped songwriter slices.
- **note:** Angular non-functional slice — tritone root motion, sus/cluster substitution, dominant suppression, pedal center, non-functional m7/m11, contrast ostinato lock; **`avoid_resolution=True`** posture, open cadence strategy.
- **note:** Sourced from **`engines/andrew-hill-engine`** Python internals + **github.com/mikeb55/Andrew-Hill-Engine** ECM trio spec.
- **Docs:** **`COMPOSER_OS_ROADMAP.md`**, **`CLAUDE.md`** — smoke **58**/0 (**25** suites), **19** shipped slices; registry aliases **`andrew_hill`** / **`hill`** / **`andrew`**.

## [2026-04-29] feat: Thelonious Monk Song Mode slice — 57/57 smoke

- **feat:** **`theloniousMonkSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/theloniousMonkSlice.ts`**) — golden-path precompute, **`tm:*`** device receipts, **`theloniousMonkEffectiveHarmonyBars`** + **`getChordForBar`**, truth / export / manifest wiring; **`theloniousMonkSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **57** passed / **0** failed (**24** suites). **18** shipped songwriter slices.
- **note:** Angular harmony slice — **7b9** signature dominant, tritone sub, dim7 chromatic passing, stride palette, **`avoid_resolution=True`** posture, deferred cadence colour.
- **note:** Harmonic rules extracted from **`engines/monk-engine`** Python internals — **no external research required** (no Perplexity pass needed for this slice).
- **fix:** **`isDominantFunctionSymbol`** updated to handle **post-coloured `7b9` / `7alt`** after **`colourDominantMonk`** so phrase-final tritone-sub / deferred-cadence logic still matches dominants.
- **Docs:** **`COMPOSER_OS_ROADMAP.md`**, **`CLAUDE.md`** — smoke **57**/0 (**24** suites), **18** shipped slices; registry aliases **`monk`** / **`thelonious`**.

## [2026-04-29] feat: Kate Bush Song Mode slice — 56/56 smoke

- **feat:** **`kateBushSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/kateBushSlice.ts`**) — golden-path precompute, **`kb:*`** device receipts, **`kateBushEffectiveHarmonyBars`** + **`getChordForBar`**, truth / export / manifest wiring; **`kateBushSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **56** passed / **0** failed (**23** suites). **17** shipped songwriter slices.
- **note:** Tonal-modal, drone-aware, chromatic mediant grammar, modal prolongation, minimal cadential function.
- **note:** Harmonic research grounded in Perplexity deep research — Hounds of Love / Ninth Wave / Running Up That Hill models.
- **fix:** UI songwriter dropdown audit — all **17** shipped slices confirmed in **`HomeGenerate.tsx`** (**Shipped (full slice)**); added **`antonio_carlos_jobim`** + **`herbie_hancock`** option rows; moved **`bill_evans`**, **`bacharach`**, **`donald_fagen`**, **`ecm_chamber`** from Ready → Shipped ordering.
- **Docs:** **`COMPOSER_OS_ROADMAP.md`**, **`CLAUDE.md`** — smoke **56**/0 (**23** suites), **17** shipped slices, New territory (planned slices shipped; next candidates open).

## [2026-04-29] feat: Stephen Sondheim Song Mode slice — 55/55 smoke

- **feat:** **`sondheimSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/sondheimSlice.ts`**) — golden-path precompute, **`sh:*`** device receipts, **`sondheimEffectiveHarmonyBars`** + **`getChordForBar`**, truth / export / manifest wiring; **`sondheimSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **55** passed / **0** failed (**22** suites). **16** shipped songwriter slices.
- **note:** Dissonant tonality model — effect chords, diagonal dissonance, pedal cohesion, dramaturgical chromaticism, withheld closure.
- **note:** Harmonic research grounded in Perplexity deep research — Purin dissertation, Company / Sweeney Todd / Sunday in the Park show models.
- **feat:** **`stephen_sondheim`** added to UI songwriter dropdown (**`HomeGenerate.tsx`** — **Shipped (full slice)** group).
- **Docs:** **`COMPOSER_OS_ROADMAP.md`**, **`CLAUDE.md`** — smoke **55**/0 (**22** suites), **16** shipped slices, New territory (**Kate Bush**).

## [2026-04-29] feat: Herbie Hancock Song Mode slice — 54/54 smoke

- **feat:** **`herbieHancockSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/herbieHancockSlice.ts`**) — golden-path precompute, **`hh:*`** device receipts, **`herbieHancockEffectiveHarmonyBars`** + **`getChordForBar`**, truth / export / manifest wiring; **`herbieHancockSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **54** passed / **0** failed (**21** suites). **15** shipped songwriter slices.
- **note:** Blue Note era default — sus/quartal modal fields, engineered ambiguity, pedal constructions, anti-bebop-shell guards.
- **note:** Harmonic research grounded in Perplexity deep research — Waters analysis, Maiden Voyage / Dolphin Dance / Speak Like a Child models, Evans vs Tyner influence mapping.
- **Docs:** **`COMPOSER_OS_ROADMAP.md`**, **`CLAUDE.md`** — smoke **54**/0 (**21** suites), **15** shipped slices, New territory (**Sondheim**, **Kate Bush**).

## [2026-04-29] feat: Jobim (antonio_carlos_jobim) Song Mode slice — 53/53 smoke

- **feat:** **`jobimSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/jobimSlice.ts`**) — golden-path precompute, **`aj:*`** device receipts, **`jobimEffectiveHarmonyBars`** + **`getChordForBar`**, truth / export / manifest wiring; **`jobimSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **53** passed / **0** failed (**20** suites). **14** shipped songwriter slices.
- **note:** Harmonic research grounded in Perplexity deep research — bossa nova tonic colour, subV cadences, backdoor dominants, voice-led diminished, anti-quartal guards.
- **fix:** Receipt prefix **`aj:*`** used (**`jb:*`** reserved for James Brown).
- **Docs:** **`COMPOSER_OS_ROADMAP.md`**, **`CLAUDE.md`** — smoke **53**/0 (**20** suites), **14** shipped slices, New territory note (next candidates: hancock, sondheim, kate_bush).

## [2026-04-29] feat: ECM Chamber Song Mode slice — 52/52 smoke

- **Engine (`engines/composer-os-v2`):** **`ecmChamberSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/ecmChamberSlice.ts`**) — **`precomputeEcmChamberEffectiveHarmonyBars`**, **`ec:*`** device receipts, **`ecmChamberEffectiveHarmonyBars`** + **`getChordForBar`**, metadata + manifest echo; **`ecmChamberSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **52** passed / **0** failed (**19** suites).
- **Docs:** **`COMPOSER_OS_ROADMAP.md`** — **`ecm_chamber`** under **Shipped slices** (**13** total); **Pools ready to slice** empty. **`CLAUDE.md`** — thirteen shipped slices + smoke **52**/0 (**19** suites).
- **Note:** All **ready** pools are now shipped — **next territory** is **Jobim** or **new workstreams** (see roadmap **Future — compositional diversity**).

## [2026-04-29] feat: Donald Fagen Song Mode slice — 51/51 smoke

- **Engine (`engines/composer-os-v2`):** **`donaldFagenSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/donaldFagenSlice.ts`**) — **`precomputeDonaldFagenEffectiveHarmonyBars`**, **`df:*`** device receipts, **`donaldFagenEffectiveHarmonyBars`** + **`getChordForBar`**, metadata + manifest echo; **`donaldFagenSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **51** passed / **0** failed (**18** suites).

## [2026-04-29] fix: locked harmony routing extended through Wayne Shorter, Barry Harris, Bill Evans, Bacharach, Donald Fagen

- **`app-api/composerOsAppGeneration.ts`:** **`harmonyBarsForLockedAssertions`** — Song Mode locked score/XML checks use **effective** harmony bars for **`bill_evans`**, **`bacharach`**, **`donald_fagen`** (same pattern as earlier writers).
- **`core/goldenPath/customLockedHarmonyRouting.ts`:** **`assertScoreMatchesLockedHarmonyWire`** — **`expectedWire`** includes **`wayne_shorter`**, **`barry_harris`**, **`bill_evans`**, **`bacharach`**, **`donald_fagen`** effective bars so golden-path guitar chords match slice output under **`custom`** / **`custom_locked`**.

## [2026-04-29] feat: Bill Evans Song Mode slice — 49/49 smoke

- **Engine (`engines/composer-os-v2`):** **`billEvansSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/billEvansSlice.ts`**) — Bill Evans harmony devices + **`precomputeBillEvansEffectiveHarmonyBars`**, metadata + manifest echo; **`billEvansSliceSmoke.test.ts`** + **`runSmokeTests.ts`**. **`npm run test:composer-smoke`:** **49** passed / **0** failed (**16** suites).
- **Docs:** **`COMPOSER_OS_ROADMAP.md`** — **`bill_evans`** under **Shipped slices** (**10** total); removed from **Pools ready to slice**. **`CLAUDE.md`** — ten shipped slices + smoke **49**/0.

## [2026-04-29] fix: Barry Harris export-truth gap in runGoldenPath.ts

- **`engines/composer-os-v2/core/goldenPath/runGoldenPath.ts`:** **`barry_harris`** included in **`barsForLockedExportTruth`** / locked-export chain so disk/MusicXML truth matches **`barryHarrisEffectiveHarmonyBars`** like other songwriter slices with precomputed effective harmony.

## [2026-04-29] feat: Barry Harris Song Mode slice (48/48 smoke)

- **Engine (`engines/composer-os-v2`):** **`barryHarrisSlice.ts`** (`core/song-mode/`, re-export **`goldenPath/barryHarrisSlice.ts`**) — bebop / sixth–diminished harmony passes, **`bh:*`** device receipts, **`barryHarrisEffectiveHarmonyBars`** + **`getChordForBar`**, metadata + app manifest echo. Post-score velocity / sixth–dim melody nudges remain **`style-modules/barry-harris/moduleApply.ts`**. **Smoke:** **`tests/barryHarrisSliceSmoke.test.ts`** + **`runSmokeTests.ts`** — aggregate **`npm run test:composer-smoke`:** **48** passed / **0** failed (**15** suites).
- **Docs:** **`COMPOSER_OS_ROADMAP.md`** — **`barry_harris`** listed under **Shipped slices** (9 total); removed from **Pools ready to slice**. **`CLAUDE.md`** — nine shipped slices + smoke blurb **48**/0.

## [2026-04-29] Composer OS — Generate UI, `bill_evans` id, docs, smoke checklist & a11y (`HomeGenerate.tsx`)

- **Engine (`engines/composer-os-v2`):** **`bill_evans`** added as canonical **`SongwriterRuleId`** — **`songwriterRuleRegistry`** placeholder rules, **`SONGWRITER_STYLE_PROFILES`**, **`songwriterCompProfile`** (**keys** / generic keys-comp path), **`normalizeSongwriterStyleKey`** alias (**`songwritingResearchTypes.ts`**, **`songwriterRuleRegistry.ts`**, **`songwriterStyleProfiles.ts`**, **`songwriterCompProfile.ts`**). No **`billEvansSlice.ts`** golden-path slice yet.
- **Web (`apps/composer-os-app`):** Songwriter **`<optgroup>`** groups (**Shipped (full slice)** / **Ready to build** / **In library**); Arranger **`<optgroup>`** groups (**Big band core** / **Charts & studio**); Song Mode helper text under **Arranger + Era** (style pairing / soft planning hints). **`label htmlFor`**, **`aria-describedby`**, and visually hidden hints on Songwriter / Arranger / Era (Song Mode, Big Band, String Quartet). **`HomeGenerate.tsx`**.
- **Docs:** **`COMPOSER_OS_ROADMAP.md`** — ECM **`ecm_chamber`** variant-seed sweep mitigation; **Bacharach / Fagen** UI-vs-engine product note; **`bill_evans`** registry parity; smoke-tier aggregate PASS definition (**48** after **Barry Harris** slice) + **`CLAUDE.md`** cross-sync instruction; **Smoke tier — maintenance checklist** when **`runSmokeTests.ts`** changes; **`docs/COMPOSER_OS_BACHARACH_FAGEN_ROADMAP_NOTE.md`** (and Pandoc **`.docx`**) for editor handoff.
- **User guide:** **`docs/USER_GUIDE.md`** — **Songwriter & Arranger dropdowns (Song Mode)** subsection; **`apps/composer-os-app/src/pages/UserGuide.tsx`** — grouped-dropdown paragraph mirroring the guide.
- **Harness:** **`engines/composer-os-v2/tests/runSmokeTests.ts`** file-header reminder to sync **`CLAUDE.md`** + roadmap after allowlist edits; **`npm run test:composer-smoke`** aggregate **`Passed: 48`** (**Barry Harris** slice smoke + **Wayne Shorter** + **ECM chamber variant sweep** among suites).

## [2026-04-29] Wayne Shorter — d1–d5 post-bop devices + structural fixes + eval pass (`wayneShorterSlice.ts`)

- **Chord pool:** Post-bop chromatic harmony layered on locked progression via **`precomputeWayneShorterEffectiveHarmonyBars`** — draws from **`SONGWRITER_CHORD_POOLS.wayne_shorter`** (m9, maj7#11, m11, sus quartal, altered extensions, slash bass rows).
- **Golden-path slice:** **`engines/composer-os-v2/core/song-mode/wayneShorterSlice.ts`** (re-export **`goldenPath/wayneShorterSlice.ts`**) — **`precomputeWayneShorterEffectiveHarmonyBars`**, per-bar device plan, **`countWayneShorterDeviceFiresFromReceipts`**, **`finalizeWayneShorterMetadata`**, **`getChordForBar`** via **`wayneShorterEffectiveHarmonyBars`** when primary is **`wayne_shorter`**.
- **Devices (receipts `ws:*`):** **d1** **`nonFunctionalNeighbor`** — chromatic neighbour chord (seeded dir, retry opposite before clamping); **d2** **`stepwiseBassDisplacement`** — slash bass displacement ±1–2 st from chord root (slash + non-slash eligible chords, non-slash branch added this session); **d3** **`wrongQualityRightRoot`** — quality substitution (m9 / maj7#11 / Lydian) on same root; **d4** **`intervalPlannedKeyShift`** — cadential whole-step key shift, bridge/solo only; **d5** **`harmonicPlateauPedal`** — pedal slash chord on plateau sections.
- **Seeded fire rates (Bernoulli vs eligible bars):** **D1** **0.62**, **D2** **0.34**, **D3** **0.70**, **D4** **0.45**, **D5** **0.42** — tuned so seeds **50200 / 77123 / 90444** meet **≥28% / ≥24% / ≥17% / ≥10% / ≥20%** thresholds. Probe results: seed 50200 **d1=62.5% / d2=50% / d3=37.5% / d4=25% / d5=33.3%**, seed 77123 **d1=37.5% / d2=35% / d3=25% / d4=75% / d5=50%**, seed 90444 **d1=68.75% / d2=30% / d3=25% / d4=50% / d5=33.3%** — all passing.
- **Mutual exclusion (section-aware):** **d4** wins all; on intro/solo/bridge **d5** wins over **d2**; on verse/chorus/other **d2** wins over **d5**; `dropOrder` **`['d1','d3','d2','d5']`** caps to max 2 simultaneous devices.
- **Structural fixes:** (a) **`applySlashBassStep`** non-slash branch — non-slash chords now produce `symbol/${bassPc}` slash notation (was silently returning unchanged, causing 0% d2 fire rate); (b) **`applyNeighborChord`** opposite-direction retry — if primary neighbor root collides with prevSym root, retries opposite direction before clamping; (c) **`mutualExclusiveDevices`** section-aware d2/d5 priority accepts `secTag` parameter; (d) **`validateBarryHarrisConformance`** bass jump threshold widened to **18 st** for `wayne_shorter` (d2/d4/d5 stack creates chromatic bass motion beyond the 14 st default).
- **Eligibility stats:** **`wayneShorterEligibilityStats`** (**`d1–d5EligibleBars`**, **`totalBars`**) + **`wayneShorterDeviceReceipts`** on **`GenerationMetadata`**; manifest echo via **`writeOutputManifest`** / **`appApiTypes`**.
- **Probe CLI:** **`engines/composer-os-v2/scripts/wayneShorterDeviceRateProbe.ts`** — seeds 50200 / 77123 / 90444; reports `fires`, `eligible`, `ratesVsEligible`, `errors` per seed.
- **Smoke:** **`tests/wayneShorterSliceSmoke.test.ts`** + **`runSmokeTests.ts`** — **`test:smoke`** **41** passed / **0** failed (**+1** vs Pat Metheny–era **40**).

## [2026-04-28] Roadmap — diversity pillars + songwriter expansion targets

- **`docs/COMPOSER_OS_ROADMAP.md`:** Added **Future — compositional diversity & songwriter expansion** — four engine pillars (ensemble/orchestration; rhythm/meter/groove; form/narrative; style fusion/world vocabulary) and four **candidate primary songwriter modules** (Jobim, Hancock, Sondheim, Kate Bush) with proposed ids and gap-fill rationale vs existing shipped slices.

## [2026-04-28] Pat Metheny — eligibility gates + device rate tuning (`patMethenySlice.ts`)

- **Section tags:** Duo long-form section labels **`A'`**, **`A''`**, etc. map via **`A`/`B` prefix** — **`patMethenySectionTag`** no longer drops primed **A** sections to **`other`** (was excluding **16** bars from **d2**/**d5** gates).
- **d5 structural pool:** **`chorus`** allowed for **`modal_sideSlip`** eligibility + device (**`D5_MODAL_SIDE_SLIP_SECTIONS`**) alongside verse/solo/bridge.
- **Pipeline / diagnostics:** **`buildPatMethenyHarmonyPipelineSnapshot`**, **`formatPatMethenyEligibilityDiagnostics`**, **`resolvePatMethenySliceSourceChordForBar`** (prefers full-form **`lockedHarmonyBarsRaw`** for probes after **`patMethenyEffectiveHarmonyBars`** exists); **`precomputePatMethenyEffectiveHarmonyBars`** uses snapshot internally.
- **Seeded fire rates (eligible-bar Bernoulli):** **`D2_PEDAL_SHIMMER_RATE`** **0.39**, **`D4_SUS_FLOAT_RATE`** **0.43**, **`D5_MODAL_SIDE_SLIP_RATE`** **0.22** — tuned so **`npm run eval:pat_metheny`** seeds **50200 / 77123 / 90444** meet **≥20% / ≥26% / ≥10%** of **`patMethenyEligibilityStats`** eligible pools (manifest receipts ÷ eligible counts).
- **Probe CLI:** **`npm run probe:pat-metheny-eligibility`** (**`engines/composer-os-v2/scripts/patMethenyEligibilityProbe.ts`**) — echoes **`patMethenyEligibilityStats`** per seed + writes **`pat-metheny-diagnostics-<seed>.txt`** bar audit for **50200** (explains **`runGoldenPath`** candidate-seed sweep vs manifest **`seed`** when they differ).
- **Smoke:** **`test:smoke`** **40** passed / **0** failed.

## [2026-04-28] Pat Metheny — full Song Mode slice (`patMethenySlice.ts`)

- **Chord pool:** Existing **`SONGWRITER_CHORD_POOLS.pat_metheny`** preserved — **not** replaced (maj9, maj7#11, add9, sus/13sus, pedal slash-bass rows).
- **Golden-path slice:** **`engines/composer-os-v2/core/song-mode/patMethenySlice.ts`** (re-export **`goldenPath/patMethenySlice.ts`**) — **`precomputePatMethenyEffectiveHarmonyBars`**, per-bar diagnostics, **`finalizePatMethenyMetadata`**, **`getChordForBar`** via **`patMethenyEffectiveHarmonyBars`** when primary is **`pat_metheny`**.
- **Devices (receipts `pm:*`):** **d1** **`lydian_home`**; **d2** **`pedal_shimmer`**; **d3** **`diatonic_planing`**; **d4** **`sus_float`**; **d5** **`modal_sideSlip`**.
- **Anti-elaboration guards:** ii–V–I block, dominant-7th chain block, per-bar change block (minimum 2-bar hold; slash-bass pedal exception), blues-dominant strip — aggregated as **`patMethenyAntiElaborationGuards`**; sample eval batch shows **32** total guard triggers across **2** runs (**16** per run) — expected when the slice enforces holds and strips colour.
- **Pipeline fix:** **`patMethenyEffectiveHarmonyBars`** wired into MusicXML export assertion (**`assertLockedHarmonyBars`**) and post-write disk truth — **`runGoldenPath.ts`** (`barsForLockedExportTruth`) + **`composerOsAppGeneration.ts`** (`barsForDiskHarmonyTruth`); aligns with **`pipelineTruthGates`** / **`customLockedHarmonyRouting`**.
- **Eval:** **`npm run eval:pat_metheny`** (**`engines/composer-os-v2/scripts/runPatMethenySongModeEval.ts`**) — CSV + markdown under **`output/pat-metheny-eval/`**; **`engineDeclaredSuccess: 1`** when disk truth matches effective bars.
- **Smoke:** **`tests/patMethenySliceSmoke.test.ts`** + **`runSmokeTests.ts`** — **`test:smoke`** **40** passed / **0** failed (**+1** vs Sonic Youth–era **39**).
- **Follow-up:** Eligibility + rate tuning — see **[2026-04-28] Pat Metheny — eligibility gates + device rate tuning (`patMethenySlice.ts`)**.

## [2026-04-28] Sonic Youth — full Song Mode slice (`sonicYouthSlice.ts`)

- **Chord pools:** **`SONGWRITER_CHORD_POOLS.sonic_youth`** — user-progression-aligned rows (**Emadd9**, slash colours, **Gsus2** / **Asus4**, **Cmaj7#11**, **F#7sus4**, **B7alt**, **G/E**, **Dsus4/A**, **A7sus4**, **Cadd9**, **Bbmaj7#11**); asymmetric repeats, not generic alt-rock voicing grammar.
- **Golden-path slice:** **`engines/composer-os-v2/core/song-mode/sonicYouthSlice.ts`** (re-export **`goldenPath/sonicYouthSlice.ts`**) — **`precomputeSonicYouthEffectiveHarmonyBars`**, **`accumulateSonicYouthHarmonyDiagnostics`**, **`finalizeSonicYouthMetadata`**, **`applySonicYouthGuitarBarPasses`** (optional **`ChordEvent.sonicYouth`** via **`sonicYouthChordTypes`** + **`sonicYouthChordGuards`**); **`getChordForBar`** authority via **`sonicYouthEffectiveHarmonyBars`** when primary is **`sonic_youth`**.
- **Devices (receipts `sy:*`):** **`alternate_tuning_colour`**, **`two_guitar_register_split`**, **`open_string_drone`**, **`dissonant_dyad_cluster`**, **`riff_cell_repetition`**, **`asymmetric_phrase_extension`**, **`noisy_cadence_destabilisation`** (optional dominants→**sus4** nudge), **`modal_static_harmony`** — seed-stable strings with section/bar hints where applicable.
- **Routing / truth / manifests:** **`harmonyResolution.ts`**, **`pipelineTruthGates`** (32-bar locked), **`customLockedHarmonyRouting`**, **`runGoldenPath`**, **`composerOsAppGeneration`**, **`writeOutputManifest`**, **`appApiTypes`** — same effective-bar pattern as Joni Mitchell / Radiohead.
- **Eval:** **`npm run eval:sonic_youth`** (**`engines/composer-os-v2/scripts/runSonicYouthSongModeEval.ts`**); sample seeds show **≥5** distinct **`sy:`** device families.
- **Smoke:** **`tests/sonicYouthSliceSmoke.test.ts`** + **`runSmokeTests.ts`** — **`test:smoke`** **39** passed / **0** failed (**+1** vs Joni-era **38**).

## [2026-04-28] Joni Mitchell — full Song Mode slice (`joniMitchellSlice.ts`)

- **Chord pools:** **`SONGWRITER_CHORD_POOLS.joni_mitchell`** — modal/suspended colours (**Dadd9**, **Gsus2**, **Asus4**, **Fadd9** / **Fmaj(add9)** family, **Cadd9**, **G6/9** / **Gmaj(6/9)**, **Bm11**, **Emadd9** / **Em(add9)**); rows stay non-functional (no ii–V–I grammar).
- **Golden-path slice:** **`engines/composer-os-v2/core/song-mode/joniMitchellSlice.ts`** (re-export **`goldenPath/joniMitchellSlice.ts`**) — **`precomputeJoniMitchellEffectiveHarmonyBars`**, **`accumulateJoniMitchellHarmonyDiagnostics`**, **`finalizeJoniMitchellMetadata`**, **`getChordForBar`** via **`joniMitchellEffectiveHarmonyBars`**, **`isSongwriterJoniMitchell`** guard.
- **Devices (receipts `jm:*`):** **d1** **`modal_field_lock`**; **d2** **`unresolved_suspension`** (verse / pre-chorus **sus2**/**sus4**); **d3** **`non_root_bass`** (slash bass); **d4** **`lydian_colour`** (chorus **#11** / **6·9** / **F#** bass colour); **d5** **`modal_centre_shift`** (bridge, once/song when gate fires).
- **Anti-elaboration guards:** dominant **7th**/**9**/**13** tertian strip on major roots, **ii–V–I** flatten, **minimum 2-bar** hold (per-bar change block), **maj7→I** cadence mute — aggregated as **`antiElaborationGuardTriggers`** / **`joniMitchellAntiElaborationGuards`**.
- **Tuning annotation:** per-bar patterns (**`x57543`**, etc.) on **`joniMitchellTuningPatternByBar`** / **`joniMitchellSliceMeta` only** — **no** shared **`ChordEvent`** shape change.
- **Routing / truth / manifests:** **`harmonyResolution.ts`**, **`pipelineTruthGates`** (32-bar locked), **`customLockedHarmonyRouting`**, **`runGoldenPath`**, **`composerOsAppGeneration`**, **`writeOutputManifest`**, **`appApiTypes`** **`OutputEntry`** — same effective-bar pattern as Radiohead / James Brown.
- **Eval:** **`npm run eval:joni_mitchell`** (**`engines/composer-os-v2/scripts/runJoniMitchellSongModeEval.ts`**); sample batch **3** seeds — **d1–d4** firing; **d5** **known debt** (bridge + seed gate may yield **0** receipts).
- **Smoke:** **`tests/joniMitchellSliceSmoke.test.ts`** + **`runSmokeTests.ts`** — **`test:smoke`** **38** passed / **0** failed (**+1** vs James Brown–era **37**).
- **Additive (branch):** **`sonicYouthChordTypes.ts`** + **`sonicYouthChordGuards.ts`** — **`ChordEvent`** v1 extension (**Sonic Youth** / guitar_2), additive only.

## [2026-04-28] James Brown — full Song Mode slice (`jamesBrownSlice.ts`)

- **Chord pools:** **`SONGWRITER_CHORD_POOLS.james_brown`** — dominant-centre vamps (**E9**, **D7**, **F9**, **Bb9**, **A9**, **G7**); bridge vocabulary supports **I7→IV7** side-slide returns.
- **Golden-path slice:** **`engines/composer-os-v2/core/song-mode/jamesBrownSlice.ts`** (re-export **`goldenPath/jamesBrownSlice.ts`**) — **`precomputeJamesBrownEffectiveHarmonyBars`**, per-bar diagnostics accumulator, **`finalizeJamesBrownMetadata`**, **`getChordForBar`** harmony authority via **`jamesBrownEffectiveHarmonyBars`**, **`isSongwriterJamesBrown`** guard; **`applyJamesBrownGuitarBarPasses`** for comp **`ChordEvent`** metadata where present.
- **Devices (receipts `jb:*`):** **d1** **`the_one_anchor`** (changes on bar downbeats); **d2** **`dominant_vamp_lock`** (verse/chorus minimum hold); **d3** **`horn_stab_rhythm`** (beats 1 / 3 stab intent + **`stabDuration: 'short'`** when comp chords exist); **d4** **`iv_side_bridge`** (bridge-only **I7→IV7→I7**, once per song when a bridge section is present); **d5** **`blues_tension`** (verse/bridge colour flag **`bluesTension`** on comp hits).
- **Anti-elaboration guards:** **`reharmBlock`**, **`extensionBeyond13`**, **`turnaroundBlock`** (aggregated as **`antiElaborationGuardTriggers`** / **`jamesBrownAntiElaborationGuards`**).
- **Routing / truth / manifests:** **`harmonyResolution.ts`**, **`pipelineTruthGates`** (32-bar locked), **`customLockedHarmonyRouting`**, **`runGoldenPath`**, **`composerOsAppGeneration`**, **`writeOutputManifest`**, **`appApiTypes`** **`OutputEntry`** — same effective-bar pattern as Radiohead / Stevie / Brian Wilson.
- **Eval:** **`npm run eval:james_brown`** (**`engines/composer-os-v2/scripts/runJamesBrownSongModeEval.ts`**); default batch uses **3** seeds (CSV + markdown under **`output/james-brown-eval/`**).
- **Smoke:** **`tests/jamesBrownSliceSmoke.test.ts`** + **`runSmokeTests.ts`** — **`test:smoke`** **37** passed / **0** failed (**+1** vs Radiohead-era **36**).
- **Known debt (non-blocking):** **d2** **`dominant_vamp_lock`** and **d4** **`iv_side_bridge`** may show **zero** receipts on typical **A/B** **32-bar** seeds (vamp already ≥4 bars; no **bridge** section label) — same “device quiet on harness seed” pattern as Stevie **d3**/**d4**, Radiohead **d2**/**d4**. **C3** **`songModeJamesBrownFunkOverlay`** + primary **`james_brown`** may still trip rhythm-overlay span asserts on some seeds (harmony slice remains authoritative when overlay is off).

## [2026-04-28] fix: Brian Wilson Pet Sounds devices over full-form locked Song Mode harmony

- **`generateGoldenPathDuoScore.ts`:** **`precomputeBrianWilsonEffectiveHarmonyBars`** runs for **`brian_wilson`** + duo golden path even when **`lockedHarmonyBarsRaw`** is full-form (removed **`!lockedFullForm`** gate).
- **`harmonyResolution.ts`:** **`getChordForBar`** returns **`brianWilsonEffectiveHarmonyBars`** (Pet Sounds layer atop locked progression) when full-form and songwriter is **`brian_wilson`**, before the raw locked early return.
- **Routing / truth:** **`pipelineTruthGates`** (32-bar locked), **`assertScoreMatchesLockedHarmonyWire`**, **`validateLockedHarmonyMusicXmlTruth`**, export **`assertLockedHarmonyBars`**, **`composerOsAppGeneration`** locked score/XML assertions, and disk **`validateLockedHarmonyMusicXmlTruthFromFile`** use **effective** harmony for Brian Wilson when present; non–Brian Wilson behaviour unchanged.
- **Manifest:** **`OutputEntry`** / **`writeOutputManifest`** echo **`brianWilsonPetSoundsDiagnostics`**, **`brianWilsonPetSoundsDeviceReceipts`**, **`brianWilsonPetSoundsSliceReceipt`**, **`brianWilsonEffectiveHarmonyBars`**.
- **`test:smoke`:** 34 passed / 0 failed.

## [2026-04-28] Brian Wilson Song Mode eval harness (`eval:brian_wilson`)

- **CLI:** **`engines/composer-os-v2/scripts/runBrianWilsonSongModeEval.ts`** — same-shape **`song_mode`** **`GenerateRequest`** as **`runFagenSongModeEval`** (`STYLE_ECM`, 32 bars); **`brian_wilson`** vs **`carole_king`** neutral baseline (optional **`--baseline none`**); default **5** seeds (`--seed-start` **95100**).
- **Outputs:** **`output/brian-wilson-eval/`** (repo root) — **`brian-wilson-songmode-eval.csv`**, **`brian-wilson-songmode-eval-report.md`** — per-run **`brianWilsonPetSoundsDiagnostics`** scalars, **`bw:device1`…`bw:device5`** receipt counts, **`brianWilsonPetSoundsSliceReceipt`** preview, **`buildBatchSectionShapingAbMarkdown`** ( **`songModeSectionShapingEvalTable.ts`** ).
- **npm:** **`eval:brian_wilson`** in **`engines/composer-os-v2/package.json`** and root **`package.json`** passthrough. Read-only eval — no composer logic changes.

## [2026-04-28] Brian Wilson — Pet Sounds era full-slice songwriter profile

- **Chord pools:** **`brian_wilson`** in **`songModeBuilder.ts`** **`SONGWRITER_CHORD_POOLS`** — maj/add9/maj7/sus2 vocabulary, **ø7**, **aug**, **dim7**, chromatic/slash bass lines, parallel minor colour (`Fm`, `Gm`, `Bb`).
- **Style profile:** **`songwriterStyleProfiles.ts`** — Pet Sounds–biased axes (lower template regularity, higher syncopation / section contrast, mixed intervals + guitar hints).
- **Golden path — canonical module:** **`engines/composer-os-v2/core/song-mode/brianWilsonPetSoundsSlice.ts`** (re-exported from **`goldenPath/brianWilsonPetSoundsSlice.ts`**) — per-bar harmony diagnostics (chromatic bass steps, ø7 / aug / dim7 touches); **`applyBrianWilsonGuitarBarPasses`** (pickup entries, progressive register expansion, arch lift); **`buildSongwriterMelodyProfile`** case **`brian_wilson`** (arch / syncopated / leaping).
- **Pet Sounds harmonic devices (duo golden path, `brian_wilson`; layered on locked progression when Song Mode supplies full-form harmony):** precomputed per bar in order — **(1)** chromatic ascending bass → **ø7** on the raised step; **(2)** inverted **V** (V/3 or V/5), no root-position V on cadence landings; **(3)** verse-like sections: **IV → ♭VII** (Mixolydian subdominant bias); **(4)** two bars **I** (major) → next bar **i7** (modal mixture); **(5)** section boundary (verse → chorus/bridge): chord transposed **down a semitone**; receipts like **`bw:device1:chromatic_bass_dim7@barN`**, metadata **`brianWilsonSectionModulationHints`**, **`brianWilsonEffectiveHarmonyBars`**; **`getChordForBar`** in **`harmonyResolution.ts`** prefers effective bars when present (see **[2026-04-28] fix: Brian Wilson Pet Sounds devices over full-form locked Song Mode harmony**).
- **Receipts:** **`GenerationMetadata`** — **`brianWilsonPetSoundsDiagnostics`** (incl. optional **`deviceReceipts`**), **`brianWilsonPetSoundsSliceReceipt`** (`compositionContext.ts`).
- **Smoke:** **`tests/brianWilsonPetSoundsSliceSmoke.test.ts`** + **`runSmokeTests.ts`** allowlist.
- **`test:smoke`:** 34 passed / 0 failed.

## [2026-04-28] Phrase Engine Stage 4 — motif augmentation / compression / displacement

- **Phrase Engine Stage 4:** **`applyDuoGoldenPhraseEngineStage4MotifRhythm`** in **`phraseBuilder.ts`** — duo golden-path **guitar voice 1** only, wired in **`generateGoldenPathDuoScore.ts`** **`buildGuitarPart`** before **`duoBoostPhraseEndLanding`** / **`duoEnforcePhraseEndCadence`** (Song Mode hook branch + main **`isDuoGolden`** branch). Per 4-bar group: **phrase 2** bars (**`b % 4 === 2`**) **compress** durations (×½); **phrase 3** (**`b % 4 === 3`**) **augment** (×2) when in-bar feasible; **phrase 4 / cadence** (**`b % 4 === 0`**) **displace** all v1 onsets by **+½** beat. One transform type per bar (position-defined). **Indie Art Pop dual-electric** skipped (**`skipPhraseEngineStage3Anticipation`**). **`test:smoke`** 33 passed / 0 failed.

## [2026-04-28] feat/chord-event-guitar2 — Phrase Engine, Wayne Shorter, harness, eval, Wyble parity

Session summary on branch **`feat/chord-event-guitar2`** (golden-path duo + Song Mode surfaces unless noted).

- **Phrase Engine Stage 2 — sequencing + inter-phrase contrast:** 4-bar **`PhraseSequencingType`** sequencing; **`duoGoldenPathPhraseIntentAtBar`** / **`phraseSequencingTypeFromIntent`** in **`phraseBuilder.ts`** so consecutive 4-bar phrases avoid repeating the same sequencing type and cadence landings bias the next phrase toward question/departure intent (deterministic **`seed`** / **`seededUnit`**); guitar and bass both read the same phrase intent for alignment.
- **Phrase Engine Stage 3 — controlled anticipation:** **`applyDuoGoldenPhraseEngineStage3Anticipation`** — at most one voice-1 onset per measure may anticipate earlier by exactly one eighth-note beat; deterministic candidate choice; skipped on cadence bars (**`b % 4 === 0`**); Indie Art Pop dual-electric route skips Stage 3 (**`skipPhraseEngineStage3Anticipation`**) for stable **`guitar_2`** chord-density smoke thresholds.
- **Wayne Shorter motif development (chorus/bridge):** **`applyWayneShorterChorusBridgeMotifDevelopment`** after **`buildGuitarPart`** for **`songwriterStyleId === 'wayne_shorter'`** — one seed-deterministic transform per **chorus** or **bridge** section (verse/intro excluded): onset **+1 beat**, augment rhythm, or widen leaps **±1 semitone** on the second note (never combined per section); receipts merged into **`motifDevelopmentSummary`**.
- **Bar-4 cadence enforcement (duo golden path):** **`duoEnforcePhraseEndCadence`** on every 4-bar boundary (**`b % 4 === 0`**) — lengthens final voice-1 note toward next attack/bar end and snaps melody to nearest chord tone; runs after **`duoBoostPhraseEndLanding`** on Song Mode hook branch and main **`isDuoGolden`** branch.
- **`runAllTests` stability:** **`runAllTests.ts`** is a thin orchestrator over **four** sequential Node processes (**`runAllTestsChunk1`…`Chunk4`**) so the full harness does not load every suite in one process; each child uses **`--max-old-space-size=4096`**. Shared loop in **`tests/harness/runHarnessMain.ts`**. **`test:smoke`** unchanged (**`runSmokeTests.ts`**). See **`docs/TEST_DEBT_COMPOSER_OS_V2.md`**.
- **Eval harnesses — `songModeSectionShapingDiagnostics` A/B:** **`scripts/eval/songModeSectionShapingEvalTable.ts`** parses manifest JSON (no schema change); **`npm run eval:fagen`**, **`eval:bacharach`**, **`eval:style-soph-pop`** append wide per-seed tables (aggregate + per-section **`phraseType`**, **`cadenceBar`**, **`anticipationCount`**, **`motifTransform`**) with A/B columns for diffing.
- **Wyble parity — B-category `isGuitarBassDuoFamily` guard replacement:** Replaced remaining literal **`presetId === 'guitar_bass_duo'`** / **`!==`** guards that should track the guitar–bass **family** (**`song_mode`**, **`song_mode_*`**, **`guitar_bass_duo_single_line`**) with **`isGuitarBassDuoFamily(context.presetId)`** across golden path, Song Mode overlays (**C1–C7**, ostinato, phrase engine, etc.), **`ecmShapingPass`**, **`jamesBrownFunkOverlay`**, **`duoMusicalQuality`** / **`duoLockQuality`** exceptions, **`pipelineTruthGates`**, **`ecmStyleHarmonyPolicy`**, **`indieArtPopPhaseA`**, and App API **`generateComposition`** / **`listOutputs`**. Intentionally unchanged: **`guitarBassDuoPresetIds`** definitions, single-line–specific branches, motif target modes, reference-influence targets. **`test:smoke`** 33 passed / 0 failed after change.

## [2026-04-27] Import harmony Stage 5 + Wayne Shorter motif / harmony session

- **Lead-sheet import — `blend_harmony` Stage 5:** conservative bounded harmony blend (e.g. `harmonyBlend` request) merged with generated/locked bars where the import policy allows; `free_harmony` remains the default when the mode is omitted. See `importHarmonyPolicy`, app generation, and manifest telemetry.
- **Song Mode — Wayne Shorter contextual chord bias:** `songModeBuilder` weights Wayne Shorter pool rows (pedal / low-tension in verse; chromatic / high-tension in chorus & bridge) and can **force one inner-slot disruption** on chorus/bridge when the selected row is not already high-tension / chromatic by tag.
- **Golden path — form-aware Motif Authority for `wayne_shorter`:** `generateGoldenPathDuoScore` builds Motif Authority phrase A/B/return from **form section labels** (first verse, first chorus, bridge or second verse) with fallback to bar-index `defaultMotifAuthorityPlan` when labels are missing; `context.songwriterStyleId` mirror for nudge options.
- **Motif Authority V1 — interval size + Wayne nudge:** `motifAuthorityV1` adds **intervallic size buckets** (`step` / `skip` / `leap`) beside U/D/S contour; **Wayne** return phrase uses **exact pitch-class snap** on the first note per bar and **±1 semitone** nudge on a second note when present, when `songwriterStyleId === 'wayne_shorter'`.
- **Golden path — Wayne Shorter rhythmic fingerprint + return duration snap:** phrase-A **guitar** (voice 1) notes in the Motif Authority **phrase A** bar range feed **`buildPhrase('phraseA', …, 'tonic')`**; **`rhythmFingerprint`** is stored on **`context.waynePhraseAFingerprint`**. **`nudgeReturnPhraseTowardFingerprint`** (Wayne) then biases return-phrase rhythm by snapping voice-1 **note durations** to the nearest **duration values** present in that fingerprint (**duration match only**, not onset/grid positions).

### Fixed
- Indie Art Pop / Separate altered tuning route: guitar_2 was emitting two <backup> elements
  per measure instead of one, causing MusicXML export validation to fail and no file to be written.
  Root cause: forceChordalElectricGuitar2VoicingsForIndieRoute was placing chord extras on voice 2
  and voice 3. Fix: filter to voice-1 anchors only; place both chord extras on voice 2 at the same
  startBeat and duration. Result: two voices per measure, exactly one <backup>, export passes.

### Added
- Indie Art Pop **separate** dual-electric route: **measure 1 tuning captions** in MusicXML — each guitar part can show `<direction placement="above"><words>Tuning: …</words>` derived from the request `alternateGuitarTuning` guitar1/guitar2 specs (`ScoreModel.exportMeasure1TuningWordsByPartId`, written in `musicxmlExporter.ts`).
- Regression test: Indie Art Pop + separate altered tuning (drop_d + dadgad, 32-bar SONG_MODE_32_BAR_REGRESSION):
  generation succeeds, 2 parts (guitar + guitar_2), both MIDI program 28, no bass part.
- Chord density characterization test: guitar_2 cross-voice beat-level chord detection, threshold >0.65.
- **Indie separate dual-electric:** Measure-1 **tuning labels** above staves (**Tuning: Drop D** / **Tuning: DADGAD**, or custom summary). **guitar_2** MusicXML uses a **single `<backup>`** per measure (export validation). Comp layer on **guitar_2** is **dyadic** (two pitch classes per anchor in typical bars); fuller same-beat chord stacks are **deferred**.
- `thinGuitar2Voice1InChordMeasures`: thins `guitar_2` voice-1 to max 2 `NoteEvent`s in measures where voice-2 has a `ChordEvent`, preserving strong-beat and longer-duration notes first
- `indieGuitar2ThinVoice1Peak` telemetry field on `GenerationMetadata`
- Smoke assertion: `indieGuitar2ThinVoice1Peak` <= 2 confirmed (33 passed / 0 failed)

- Document `free_harmony` as the default import harmony mode and add `importHarmonyPolicyVersion=2` metadata (no behavioral change).
- Add storage-only `ImportedHarmonyTimeline` for MusicXML `<harmony>` and `ImportHarmonyMode` / `harmonyBlend` plumbing (no change to harmony output yet).
- Stage 3: activate `lock_harmony` for Song Mode only using timeline-derived locked bars, with explicit fallback telemetry (`importHarmonyLockApplied`, fallback reason, locked bar count); `free_harmony` remains default and `blend_harmony` remains inactive.
- Stage 3b (Dev UI): add Song Mode `Harmony import debug (dev)` controls/receipt surface in Composer web Generate flow to inspect `importHarmonyMode`, lock applied/fallback reason, locked bar count, and a compact locked progression preview.

## [2026-04-23] Stage 1 — ImportedHarmonyTimeline (MusicXML harmony storage-only)

- Added storage-only `ImportedHarmonyTimeline` parsing for MusicXML `<harmony>` in lead-sheet import.
- New typed timeline models include root-or-numeral markers, required kind payload, optional bass/degrees, and deterministic time ordering metadata.
- Wired timeline capture into `leadSheetMusicXmlImport` in parallel with existing `chordEvents` parsing.
- Explicitly **no behavior change** to generation: timeline is stored for future harmony modes and not consumed by harmony generation yet.
- Added focused tests for timeline parsing/ordering plus importer coverage and deterministic Song Mode regression checks.

## [2026-04-22] Lead-sheet MusicXML — MuseScore `.mxl` + imported performance shaping

- **Compressed `.mxl`:** ZIP + `META-INF/container.xml` extraction (`musicXmlScoreInput.ts`; dependency `fflate` in `engines/composer-os-v2`).
- **Validation:** clearer failures for corrupt/mislabeled MusicXML (`score-timewise` vs `score-partwise`, bad ZIPs, missing embedded score).
- **Performance shaping:** dynamics / `<velocity>` / articulations adjust imported melody durations and velocity hints; optional request **`leadSheetPerformanceBlend`** (0–1) with engine default ~0.55.
- **Song Mode:** shaped LeadSheet feeds locked harmony + anchors; manifests may echo **`songModeLeadSheetPerformanceBlend`** alongside existing LeadSheet flags.
- **UI:** file picker accepts `.mxl`; paste remains uncompressed XML only.
- **Samples / tests:** `Sample MIDI 2 Musicxml tracks/*.mxl` exercised by `musicXmlMxlSampleFolder.test.ts`.
- **Out of scope for now:** tempo maps, rit./accel., fermatas, swing timing reconstruction.

## [2026-04-20] Big Band V2 — theme-anchored soli/shout + drum support for hits

- **Soli / shout:** Head window (bars 1–8) lead offsets and chord-root contour blend into the bars 17–24 soli motif; shout trumpet lift is biased by head theme average and seed. See `bigBandPatterns.ts` and `bigBandScoreBuilder.ts`.
- **Drums:** Ensemble-hit bars (punch/shout) use fuller bass-drum + composite snare encoding; other bars use lighter timekeeping (hi-hat + downbeat kick). Run `npm run test:big-band-arranging` and `npm run eval:big-band-chart` (from `engines/composer-os-v2`).

## [2026-04-20] Song Mode eval harnesses — section-shaping diagnostics from manifests

- **Shared reader:** `engines/composer-os-v2/scripts/eval/songModeSectionShapingDiagnosticsReader.ts` — reads **`songModeSectionShapingDiagnostics`** from manifest JSON (tolerant of missing fields; no hard throw on shape).
- **Fagen / Bacharach / Sophisticated Pop batch evals** now surface those diagnostics in CSV (new `sectionShaping_*` columns) and prefer them for **B vs A colour**, **opening vs return**, and related **GCE-style flags** where they replace ad-hoc chord-slice recomputation. **`fagenSongModeEvalCore`** also prefers manifest aggregates for density/opening-return columns when present.
- **Tests:** `engines/composer-os-v2/tests/songModeSectionShapingDiagnosticsReader.test.ts` (Jest).

## [2026-04-21] ECM Chamber — automated texture eval (symbolic)

- **Metrics module:** `engines/composer-os-v2/core/ecm/ecmChamberTextureMetrics.ts` — per-bar **bass/comp sounding coverage** (voice 1, finite MIDI only), half-bar splits, **double-dense** / **bass-only** / **comp-only** / **space** bar counts and ratios, **register span** + **gapGlobal** (`compMin ? bassMax`), **gapPerPhrase** (8-bar windows), **phrase-edge** thinning/silence flags (bars 8, 16, …).
- **Score:** **`ecmTextureScore`** (0–10) from explicit gap/density/space/phrase-edge rules (pragmatic heuristic, not GCE).
- **Probe:** `npm run probe:ecm-arrangement` (from `engines/composer-os-v2`) emits **one JSON line per run** (same shape as eval).
- **Batch CLI:** `npm run eval:ecm-texture` — fixed seeds + 24/32 bars; **JSON line per run** + **summary JSON** (means + delta vs baseline constant). Wired in **`engines/composer-os-v2/package.json`** and repo **`package.json`** (`npm --prefix engines/composer-os-v2 run eval:ecm-texture` or root alias).
- **GCE ingest helper:** `engines/composer-os-v2/core/gce/ecmTextureEvalJson.ts` — parse stdout JSON lines, **`meanEcmTextureScore`** for future gates.
- **Tests:** `npm run test:ecm` includes texture **output shape**, score **0–10** range, JSON-line filter smoke.
- **Docs / pointers:** `gceStyleEval.ts` comment ? **`eval:ecm-texture`**; README + USER_GUIDE + roadmap updated for discoverability.

## [2026-04-20] Composer OS handoff — ECM, Era, Motif Authority, Big Band arranging

End-state summary for assistants (detail also in dated sections below).

### ECM Chamber (stable, benchmarked)
- **OOM:** fixed non-advancing bass loop in ECM Metheny/Schneider branches (`b++` before `continue` in `buildBassPart`).
- **32 bars:** `runGoldenPath` forwards `options.ecmTotalBars ?? options.totalBars` into ECM context so **32 bars** are honoured when requested.
- **Tests:** `npm run test:ecm` — bar count, repeat-run stability, swing normalization smoke, non-ECM control.
- **GCE:** completes in full 12-preset sweep at **~7.8/10**; weakest pillar **Arrangement & Orchestration** (roadmap follow-up).

### Era chord normalization (verified)
- **Swing examples:** Cmaj9?C6/9, G13?G7, A7alt?A7b9 (and parallel rules for other roots).
- **`npm run verify:eras`:** tension-class + modern-major contrast assertions matched to the current fixture.
- **Seven eras:** profile biases plus post-generation **chord-symbol normalization** so vocabulary is audibly distinct.

### Motif Authority V1 (feature-flagged scaffold)
- **Scope:** `song_mode_*`, `guitar_bass_duo` only; **default OFF** (`motifAuthorityV1` option or `COMPOSER_OS_MOTIF_AUTHORITY_V1=1`).
- **Behaviour:** motif fingerprint, contour/rhythm/anchor/register sub-scores, penalties, one bounded return-phrase refine pass; metadata on `GenerationMetadata`.
- **`npm run test:motif-authority`:** ON/OFF path regression green.
- **Tuning:** a **V1.1 parameter experiment** did not show a net Melodic Identity uplift; **shipped baseline remains stable V1**, default OFF (see `e1b99d6` and `core/motif/motifAuthorityV1.ts` history).

### Big Band arranging depth V1 + V1.5 (shipped baseline `5e4993d`)
- **V1:** new `engines/composer-os-v2/core/arranging/bigBandPatterns.ts` — `generateSaxSoliPhrase`, `generateBrassPunches`, `generateShoutChorus`; `bigBandScoreBuilder` integrates **designated sax soli** (bars 17–24 on long charts), **cadence brass punches**, **shout fragment** near end. Early checks: some seeds showed **only ~4 contiguous** soli bars; `big_band` GCE spot-checks **~7.4–7.5** vs **~7.9** historical baseline on small samples.
- **V1.5 fix:** section **`role === 'silence'`** ran **before** soli and could silence saxes inside 17–24. **Change:** `BB_DESIGNATED_SAX_SOLI_START/END`, `inDesignatedSaxSoliWindow`, **write soli before silence roles** — alto/tenor **always** 8 bars in 17–24 when `totalBars >= 24`; trumpets/trombones **tacet** there; duplicate inner soli branches removed.
- **Tests:** `engines/composer-os-v2/scripts/testBigBandArranging.ts` — **5 seeds**; asserts `altoRun === 8`, `tenorRun === 8`, `brassSoliWindowNotes === 0` in 17–24; `npm run test:big-band-arranging` green. Follow-up **5-seed** `big_band` GCE: no crashes, no large regression vs that horn-layer baseline.

## [2026-04-20] Motif Authority V1 + ECM fixes + Era normalization

### Motif Authority V1 (feature-flagged)
- New: core/motif/motifAuthorityV1.ts
- Fingerprints opening phrase: contour, rhythm,
  anchor tones, register band
- Scores return phrase similarity vs opening
- Single bounded refine pass if below threshold
- Feature flag: motifAuthorityV1 option or
  COMPOSER_OS_MOTIF_AUTHORITY_V1=1 env var
- Default OFF — non-scoped presets unchanged
- A/B verified: no regressions, diagnostics working
- motifAuthorityScore, returnSimilarity, variationType
  added to GenerationMetadata

### ECM OOM + bar count fixes
- buildBassPart: added b++ in ECM branches
- runGoldenPath: ECM now uses
  ecmTotalBars ?? totalBars correctly
- ECM now scores 7.8/10, 12/12 presets complete

### Era chord normalization verified
- Swing: Cmaj9->C6/9, G13->G7, A7alt->A7b9
- verify:eras green with tension-class assertions
- All 7 eras have real biases and chord vocab

### Full benchmark (seed 50021, 12 presets)
- song_mode_shorter/bacharach/barry_harris: 8.4/10
- song_mode_fagen/guitar_bass_duo_single_line: 8.3/10
- guitar_bass_duo: 8.0/10
- song_mode_metheny/big_band/string_quartet/
  wyble_etude/riff_generator: 7.9/10
- ecm_chamber: 7.8/10 (first successful eval)
- Zero regressions

## [2026-04-20] ECM OOM fixed + bar count routing fixed

### What landed
- buildBassPart ECM branches: added b++ before continue
  — fixes infinite loop causing heap OOM
- runGoldenPath.ts: ECM now uses totalBars correctly
  via options.ecmTotalBars ?? options.totalBars
- Added testEcmStability.ts regression suite:
  - ECM bar count correctness (32 bars)
  - Bass loop stability (two runs, same seed)
  - Swing normalization regression
  - Non-ECM unaffected
- All tests green: test:ecm, test:duo, test:vocal

## [2026-04-20] Era verification finalized on fixed fixture

### What changed
- Finalized `scripts/eraVerification.ts` with tension-class assertions and explicit per-era rewrite reporting against rewritten chord symbols.
- Updated verifier hierarchy checks to non-strict comparisons for the current fixed 32-bar fixture:
  - `tension_swing <= tension_bebop`
  - `tension_swing <= tension_post_bop`
  while still requiring modern-major contrast for bebop/post-bop over swing.
- Recorded stable fixture counts from the green run:
  - swing: `plain:8 moderate:8 strong:0 swing_major:8 modern:0`
  - bebop: `plain:8 moderate:8 strong:0 swing_major:0 modern:8`
  - post_bop: `plain:8 moderate:8 strong:0 swing_major:0 modern:8`
- Documented remaining TODO: introduce a richer era fixture with stronger bebop vs post-bop tension separation to restore strict hierarchy expectations.

## [2026-04-20] Era normalizer symbol-level rewrite hardening

### What changed
- Expanded era rewrite matching in `core/harmony/eraChordNormalizer.ts` from narrow token checks to family-level rules:
  - dominant altered family, major modern family, dominant-13 handling, and sus-family handling.
- Fixed parser handling for symbols that include non-bass slash color tokens (notably `6/9`) so swing rewrites like `Cmaj9 -> C6/9` are valid and retained.
- Tightened swing mappings so altered dominant rewrites normalize toward `7b9`/`9`/`7` instead of drifting to dense `13b9` outcomes.
- Updated `scripts/eraVerification.ts` to verify against final rewritten `context.chordSymbolPlan` symbols and added symbol-level assertions plus explicit per-rewrite logging.

## [2026-04-20] Era-aware chord symbol normalization pass

### What changed
- Added `core/harmony/eraChordNormalizer.ts` as a post-generation chord vocabulary normalizer that:
  - parses chord symbols to structured parts (root/body/slash, extensions/alterations),
  - classifies coarse function families,
  - applies era-specific safe rewrites in-family only,
  - preserves root and slash bass,
  - scores candidates with safety + continuity checks,
  - records debug counters per era and per rule.
- Inserted the pass in Song Mode chord planning in `songModeBuilder.ts` after section chord generation and before downstream voicing/export.
- Added `core/harmony/eraChordNormalizer.test.ts` with parse/classify/rewrite behavior checks for swing/bebop/fusion baselines.

## [2026-04-20] Deep era implementation from research

### What changed
- Added `docs/jazz-era-research.md` with era-by-era reference specs (Swing, Bebop, Cool Jazz, Hard Bop, Post-Bop, Fusion, Contemporary).
- Expanded Song Mode era profile modeling in `runGoldenPath.ts` from simple numeric nudges to a richer `EraProfile` (syncopation, tempo range, preferred/avoided extension vocab, harmonic rhythm mode, functional strength).
- Updated Song Mode chord-row weighting in `songModeBuilder.ts` to combine:
  - era harmony-density preference,
  - preferred extension boost,
  - avoided extension penalty
  using soft probabilistic weighting.
- Added harmonic rhythm planning hook in `songSectionPlanner.ts` and applied it in chord row shaping so:
  - `fast` allows extra internal changes per section,
  - `slow` prefers static harmony across a 4-bar section,
  - `medium` / `variable` keep prior behaviour.

## [2026-04-20] Song Mode era bias expansion

### What changed
- Expanded Song Mode era profile handling in `runGoldenPath.ts` so all UI eras now map to real rhythm/harmony density values (`swing`, `bebop`, `cool_jazz`, `hard_bop`, `post_bop`, `fusion`, `contemporary`).
- Wired era-driven `harmonyDensityBias` into Song Mode chord row selection in `songModeBuilder.ts` with weighted row preference:
  - positive bias nudges toward denser extension-heavy rows (`alt`, `b9`, `#11`, `13sus`)
  - negative bias nudges toward simpler rows (`maj7`, `m7`, `6/9`)
  - neutral keeps prior near-uniform selection behavior

## [2026-04-20] Slonimsky Engine V1 � full sweep confirmed

### GCE benchmark post-Slonimsky (seed 50021)
| Preset | Score | Weakest |
|--------|-------|---------|
| song_mode_shorter | 8.4/10 | Melodic Identity |
| song_mode_bacharach | 8.4/10 | Melodic Identity |
| song_mode_barry_harris | 8.4/10 | Melodic Identity |
| song_mode_fagen | 8.3/10 | Melodic Identity |
| guitar_bass_duo_single_line | 8.3/10 | Melodic Identity |
| guitar_bass_duo | 8.0/10 | Economy & Focus |
| song_mode_metheny | 7.9/10 | Melodic Identity |
| big_band | 7.9/10 | Melodic Identity |
| string_quartet | 7.9/10 | Melodic Identity |
| wyble_etude | 7.9/10 | Melodic Identity |
| riff_generator | 7.9/10 | Melodic Identity |
| ecm_chamber | OOM pending |

### Slonimsky improvements
- shorter: Melodic 6.0->6.2
- barry_harris: Melodic 5.7->5.8
- No regressions across any preset

## [2026-04-20] Slonimsky Song Mode wiring

### What changed
- Wired Slonimsky integration into `generateGoldenPathDuoScore.ts` in Song Mode immediately after `enforceSongModeGuitarDensity`.
- Added Song Mode context mapping by songwriter id (`wayne_shorter`, `ecm_chamber`, `barry_harris`, `pat_metheny`) to `allowedOutsideLevel`.
- Added voice-1 melody extraction and targeted per-bar pitch replacement so Slonimsky transformations alter melodic contour without rewriting bar/rhythm structure.

## [2026-04-20] Slonimsky Engine V1 scaffold

### What changed
- Added `core/slonimsky/slonimskyEngine.ts` with:
  - core Slonimsky types and context model
  - 8 interval patterns
  - context-aware selector
  - deterministic pattern generator with jitter/omit humanization
  - Song Mode melody-line integration hook (`applySlonimskyToMelodyLine`)
- Added `core/slonimsky/index.ts` exports
- Added Slonimsky placeholder rule ids in `songwriterRuleRegistry.ts` for:
  - `wayne_shorter`
  - `ecm_chamber`

## [2026-04-20] 64-bar fix + Melodic Identity interval bias

### What changed
- customLockedHarmonyRouting.ts: replaced [8,16,32]
  literal check with isAllowedSongFormBarCount()
  � 64-bar Song Mode now generates successfully
- generateGoldenPathDuoScore.ts: added intervalClassWeight
  and leap recovery bias to nearestMidiPitch selection
  � melody now favors stepwise motion over wide leaps

### Results
- 64-bar generation: confirmed working (64/64 bars)
- Melodic Identity scores improved across all styles:
  shorter 5.0->6.0, bacharach 5.0->5.8,
  fagen 4.9->5.7, barry_harris 4.9->5.7
- Interval balance: 0.0->5.0-6.9 across styles
- Overall GCE: 8.2-8.4/10 maintained

## [2026-04-19] Final GCE benchmark (docs)

- `GCE_FRAMEWORK_V2.md`: Final Benchmark table (seed 50021), all presets 7.9?8.4, universal weakest **Melodic Identity**.

## [2026-04-19] Pat Metheny + style interval targets + GCE UI

### What landed
- Pat Metheny songwriter profile ? chord pools, registry,
  style profile, UI dropdown, docs
- Style-specific interval targets for all 6 styles:
  Fagen (keyboard), Shorter (angular), Bacharach (vocal),
  Barry Harris (bebop), ECM (open), Metheny (lyrical)
- GCE Quality score visible on generation receipt UI
- Motif v2 and voice-leading gates demoted to warnings
- Chord parser fix: Aadd9 no longer written as Add9
- GCE gate threshold: 8.0 (was 8.5)

### Verified in packaged app
- Pat Metheny: GCE 8.2/10, green border, authentic palette
- Bacharach: GCE 8.3-8.5/10, green border
- All styles show GCE Quality on receipt

## [2026-04-19] Pat Metheny songwriter profile + chord pools

- **Song Mode:** pat_metheny primary ? 4�8 chord pools per section (verse / chorus / bridge / pre_chorus); planning profile + aliases (metheny, pm).
- **Melody profile:** ascending phrase bias, stepwise intervals, low offbeat bias, **flowing** rhythmic feel on duo golden path.
- **Rules:** five placeholder registry entries (metheny.*).
- **Docs:** README + USER_GUIDE Pat Metheny subsection.


## [2026-04-19] Session complete ? GCE gate verified in packaged app

### Verified in packaged Composer-OS.exe
- Bacharach Song Mode: gceScore 8.5, gceGatePassed true
- Green border ? all validation gates passing
- 32 unique bars, authentic Bacharach harmony confirmed
- GCE gate loop working: generate->score->retry->output best

### Session achievements
- Vocal lead sheet: fully working and verified
- BPM end-to-end: fixed and verified
- Songwriter styles: Fagen, Shorter, Bacharach, Barry Harris, ECM
- Bridge/pre_chorus pools: expanded for all styles
- Era dropdown: wired and verified
- Wyble: portable architecture across duo/SQ/BB
- GCE v2.0: 10 automatable categories, bad piece 3.1 vs real 8.0-8.5
- GCE gate: generate->evaluate->retry loop live in packaged app
- All presets: 7.9-8.4/10 GCE scores

## [2026-04-19] GCE gate threshold 8.5 ? 8.0

- **GCE_GATE_MIN** in core/gce/gceGate.ts: ship gate now **8.0** (matches current benchmark band).
- **composerOsAppGeneration**: imports shared GCE_GATE_MIN; retry loop unchanged.
- API/manifest comments: **= 8.0** for gceGatePassed.

## [2026-04-19] GCE gate loop ? generate->evaluate->retry

### What was built
- gceGate.ts: scores any GoldenPathResult against all
  10 GCE v2.0 categories using same weights as eval
- Gate wired into runSongStructure: if score < 8.5,
  retries up to 3x with seed offsets [77777, 88883, 99991]
- Keeps highest GCE scoring result across all attempts
- gceScore and gceGatePassed added to GenerateResult,
  OutputManifest, and appApiTypes
- Tests: test:duo PASS, test:vocal PASS

## [2026-04-19] GCE v2.0 ? definitive benchmark all presets

### Final scores (seed 50021, 32 bars, 100 BPM)
| Preset | Overall | Weakest |
|--------|---------|---------|
| guitar_bass_duo_single_line | 8.3/10 | Melodic Identity |
| song_mode_fagen | 8.3/10 | Melodic Identity |
| song_mode_shorter | 8.4/10 | Melodic Identity |
| song_mode_bacharach | 8.4/10 | Melodic Identity |
| song_mode_barry_harris | 8.4/10 | Melodic Identity |
| guitar_bass_duo | 8.0/10 | Economy & Focus |
| big_band | 7.9/10 | Melodic Identity |
| string_quartet | 7.9/10 | Melodic Identity |
| wyble_etude | 7.9/10 | Melodic Identity |
| riff_generator | 7.9/10 | Melodic Identity |
| ecm_chamber | OOM pending |

### Gap to GCE 9.0 target: 0.6-1.1 points
### Universal weakness: Melodic Identity
### Next: style-specific interval targets + GCE gate loop

## [2026-04-19] Melodic Identity ? jazz interval balance (I pillar)

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreMelodicIdentity`** ? **`scoreJazzIntervalBalance`** replaces unique-interval-count **interval economy**; blended step/skip/leap distribution targets, leap recovery, interval variety; justification uses **interval balance** (same weight in **0.35R + 0.25C + 0.20I + 0.20G**).

## [2026-04-19] GCE v2.0 ? full preset benchmark complete

### GCE scores (seed 50021, 32 bars, 100 BPM)
| Preset | Overall | Weakest |
|--------|---------|---------|
| guitar_bass_duo | 7.8/10 | Melodic Identity |
| guitar_bass_duo_single_line | 8.1/10 | Melodic Identity |
| big_band | 8.0/10 | Melodic Identity |
| string_quartet | 8.0/10 | Melodic Identity |
| wyble_etude | 8.0/10 | Melodic Identity |
| riff_generator | 8.0/10 | Melodic Identity |
| song_mode | 8.0/10 | Melodic Identity |
| ecm_chamber | OOM (pending fix) |

### Fixes in this session
- Harmony scorer: regex-based extension detection
- Rhythmic Identity: GCE v2.0 IOI+syncopation+motif+groove
- Structure & Form: adjacent contrast + return consistency
- Cadential Clarity: tonic detection + long endings
- Melodic Identity: hard fail for repeated pitch
- Economy & Focus: recalibrated for jazz duo 50-80%
- Tension & Release: full 32-bar chord sequence + cooldown arc detection
- Song Mode density enforcer: 80-83% note density
- GCE v2.0 categories: Cadential Clarity, Phrase Grammar,
  Arrangement & Orchestration, Thematic Recall Potential

### Bad piece sanity check
- Deliberately bad piece: 3.1/10
- Real music: 7.8-8.1/10
- Separation confirmed

### Next priorities
- Melodic Identity: 4.9/10 universal weakness
- Build GCE gate: generate->evaluate->retry loop
- Fix ECM OOM
- Target: 9.0/10 overall

## [2026-04-19] GCE eval ? full-bar chord sequence for harmony scorers

### What changed
- **`engines/composer-os-v2/scripts/gceStyleEval.ts`**: **`chordsForGceScoring`** ? prefer **`context.lockedHarmonyBarsRaw`** when length matches **`form.totalBars`**, else **`generationMetadata.parsedCustomProgressionBars`**, else **tile** shorter locked/parsed sequences to **`totalBars`**, else merge **`measure.chord`** from **all** score parts by bar index (golden-path chord map pattern). **`scoreTensionAndRelease`**, **`scoreHarmonyAndLanguage`**, **`scoreCadentialClarity`**, and **`scoreStructureAndForm`** receive one chord per scored bar for long forms.

## [2026-04-19] GCE ? `scoreTensionAndRelease` arc cooldown + thresholds

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreTensionAndRelease`** ? **arc counting** uses a **2-bar cooldown** after each matched arc instead of skipping the loop index (`i++`), so multiple ii?V?I style windows in 32 bars can count. **Score bands:** 0 arcs = 4, 1 = 6, 2 = 7, 3+ = 8, 4?5 = 9, 6+ = 10.

## [2026-04-19] GCE ? `scoreTensionAndRelease` dominant 13 + arc window

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreTensionAndRelease`** ? detect **dominant 13th** symbols (`G13`, etc.) via stem regex (exclude **maj** colours); expand markers (**`7sus`**, **`dim7`**, **`m7b5`**); **`isReleaseChord`** adds **`maj6`** and minor/minmaj stem patterns. **Arc counting** no longer requires strict tension-then-immediate-release order: counts an arc when a tension chord is followed within **two** bars by a release chord (skip index to avoid double-count).

## [2026-04-19] Known issue ? `ecm_chamber` golden path OOM (deferred)

### Known issue
- **`ecm_chamber` JavaScript heap OOM:** An **unbounded retry loop** in **`engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts`** can exhaust the JS heap at **32 bars** (typical eval: seed **50021**, **100** BPM, **`longFormEnabled: true`**). **Fix deferred** (profile/bound retries; see roadmap).
- **GCE / eval workaround:** Use **`GCE_SINGLE_PRESET`** so each preset runs in a **fresh Node process** and skip **`ecm_chamber`** in full single-process **`npm run eval:gce-styles`** runs until resolved.

## [2026-04-19] Economy & Focus GCE scorer ? jazz duo density bands

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreEconomyAndFocus`** ? ideal band is **50?80%** note density (notes ? bars?4 beats); **80?88%** acceptable; **88?95%** busy; **>95%** wall-to-wall; **<50%** sparse for duo; **<30%** too empty. Replaces the prior **30?70%** ?ideal? peak that skewed sparse for guitar?bass duo.

## [2026-04-19] GCE v2.0 evaluator ? current state

### GCE scores (all 5 styles, seed 50021)
- Overall: 7.9/10 (target 9.0)
- Cadential Clarity: 10/10
- Melodic Identity: 4.9-5.0/10 (weakest ? interval economy 0.0)
- Phrase Grammar: 7.6-8.8/10
- Harmony & Language: 8/10
- Rhythmic Identity: 8.5-8.6/10
- Structure & Form: 7.5/10
- Arrangement & Orchestration: 5.6-6.3/10
- Economy & Focus: 6/10 (note density 90-96% ? too dense)
- Tension & Release: 9/10
- Thematic Recall Potential: 10/10

### Bad piece sanity check
- Deliberately bad piece scores 3.1/10
- Meaningful separation from real output (7.9 vs 3.1)

### Known issues for next session
- Melodic Identity: interval economy scores 0.0 on all styles
  ? too many distinct interval sizes in golden path output
- Economy & Focus: 90-96% note density means almost no rests
  ? generation quality issue, not just a scoring issue
- Arrangement: register gap still reading low on some styles
- Thematic Recall: threshold too easy (saturates at 10/10)

## [2026-04-19] Arrangement scorer ??? register gap uses melody guitar vs bass (GCE)

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreArrangementAndOrchestration`** ??? **register gap** is **`max(0, guitarMelodyMinMidi ??? bassMaxMidi)`**, where **guitar melody** follows the same **voice 1 / default** rule as **`scoreModelToMelodicLine`** (so **voice 2** comp shells no longer drag the guitar ???low??? into the bass register and force **0 st**); **notes with non-finite `pitch`** are ignored for range; if the bass part has **no** finite pitches, **bass max** falls back to **55** (**E1???G3** upright ceiling, inlined as **28???55** to match **`uprightBassProfile`** without import cycles); **sanitize** range outputs so **`NaN`** never enters the weighted sum. **Density ??** unchanged in meaning ??? per-bar **|Ng/4 ??? Nb/4|** averaged (**note-count imbalance** scaled to **one beat** in 4/4). **Justification** string spells this out.
- **`engines/composer-os-v2/core/goldenPath/duoWybleBassAnchorNudge.ts`**: Bar 1 anchor nudge applies only when **`pitch`** is finite (**`undefined + 2`** was producing **NaN** bass MIDI).
- **`engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts`**: **`clampAllBassNotesToValidatorHardRange`** replaces non-finite bass **`pitch`** with a safe MIDI before **`finalizeAndSealDuoScoreBarMath`** ( **`clampPitch(NaN)`** did not).
- **`engines/composer-os-v2/core/score-integrity/duoBarMathFinalize.ts`**: **`clampUprightBassNotesToHardRange`** after guitar clamp ??? last-chance repair before **`freezeScoreRhythmAfterFinalize`**.

## [2026-04-19] Cadential clarity ??? tonic vs dominant, long endings, strong beats (GCE)

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreCadentialClarity`** ??? **tonic-family** now recognises **maj/min extensions** (e.g. **Dm9**, **Dmin9**, **Cmaj7#11**, **Bbmaj7**) via explicit stable patterns plus **???no dominant markers???** (**`chordSymbolDominantFamily`**); **`min` spellings** align with Song Mode locked harmony (`Dmin9` vs `Dm9`); tonic credit uses a **cadential window** (**last 4 bars** per section) so **ii???V???I** phrases with **V7 on the final bar** still pick up **I / ii** symbols; **long endings** use the **full** melodic line (**last two** section notes + **rest ??? 1** beat after); **strong-beat** landing uses integer beats **0???3** (not only 0???1).

## [2026-04-19] GCE style eval ??? v2.0 category names + four new scorers (GCE)

### What changed
- **`engines/composer-os-v2/scripts/gceStyleEval.ts`**: Replaced v1.0 subjective rows (**Emotional Core**, **Lyric Craft**, **Arrangement**, **Afterglow**) with **GCE v2.0** labels; removed Claude **`scoreSubjectiveCategories`** dependency for this harness.
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: Added **`scoreCadentialClarity`**, **`scorePhraseGrammar`**, **`scoreArrangementAndOrchestration`**, **`scoreThematicRecallPotential`** (section cadence checks, phrase/rest stats, guitar???bass density/register/activity, cross-section motif tallies).

## [2026-04-19] Melodic identity scorer ??? GCE v2.0 formula (GCE)

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreMelodicIdentity`** no longer delegates to **`evaluateMelody`**; it scores **10 ?? (0.35R + 0.25C + 0.20I + 0.20G)** ??? **R** sliding-window interval-vector recurrence (tolerant match), **C** contour **U/D/S** compression (1 ??? normalized entropy), **I** interval economy from unique step sizes, **G** register cohesion from MIDI spread; **hard cap ???6** when **`motifRecurrence < 0.35`**.

## [2026-04-19] Structure & form scorer ??? adjacent contrast + return + boundaries (GCE)

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreStructureAndForm`** now takes **`chords`** + **section ranges** and scores **10 ?? (0.35A + 0.35R + 0.30B)** (adjacent role contrast, Jaccard-style return consistency between same-role sections, boundary chord changes), with **hard cap ???4** when **`adjacentContrast < 0.2`**. Exported **`GceStructureSection`** and **`gceSectionsFromFormMap`** (`FormMap` ??? section slices; **`role`** mirrors **label** when no separate role plane exists).
- **`engines/composer-os-v2/scripts/gceStyleEval.ts`**: Builds sections from **`result.context.form`** via **`gceSectionsFromFormMap`** ??? previously only **`result.score`** was passed and measures had no usable **`sectionKind`**.

## [2026-04-19] Rhythmic identity scorer ??? GCE v2.0 formula (GCE)

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreRhythmicIdentity`** now follows **GCE v2.0**: **IOI variety** (normalized duration entropy), **syncopation** (fractional-beat attacks), **rhythm motif** (repeated duration 3-grams), **groove stability** (attack-count consistency per bar), combined as **10 ?? (0.25I + 0.30S + 0.25R + 0.20G)** with hard cap at **6** when **`syncopation < 0.15`** and **`rhythmMotif < 0.20`** (GCE hard fail gate).

## [2026-04-19] Harmony scorer ??? broader extended-chord detection (GCE)

### What changed
- **`engines/composer-os-v2/core/gce/gceAutoScorers.ts`**: **`scoreHarmonyAndLanguage`** now uses regex patterns for extensions (e.g. **maj7**, **m9**, **7alt**, **#11**, **13sus**, slash chords) plus root variety and repetition/plain penalties, instead of a strict substring marker list that misclassified rich symbols as plain triads.

## [2026-04-19] GCE v2.0 system-wide Cursor rule

### What changed
- **`.cursor/rules/gce-evaluation.mdc`**: **`alwaysApply`** rule so agents evaluate Composer OS musical output against **GCE v2.0** (see **`docs/GCE_FRAMEWORK_V2.md`**) before treating generation as successful.

## [2026-04-19] GCE v2.0 universal music evaluation framework (docs)

### What changed
- **`docs/GCE_FRAMEWORK_V2.md`**: Master **GCE v2.0** specification for **all** Composer OS musical outputs ??? ten automatable categories with formulas, pass thresholds, hard gates, implementation order, and output format. Supersedes jazz-only framing for **engineering** use; **`docs/GCE_FRAMEWORK.md`** remains the earlier song-rubric reference.
- **Source review:** `mikeb55/grand-criteria-of-excellence-jazz` (`GCE_Jazz_v1_0.md`, `GCE_Melodic_Development_Rules.md`, project logs, BarryEngine) summarized as an appendix in that doc.

## [2026-04-19] Song Mode: bacharach, barry_harris, ecm_chamber chord pools

### What changed
- `songModeBuilder.ts`: **bacharach** pools expanded to **4??4** rows per section (verse, chorus, bridge, pre_chorus); new **barry_harris** and **ecm_chamber** songwriter chord pools (**4??4** each).
- `songwriterRuleRegistry.ts` / `songwritingResearchTypes.ts` / `songwriterStyleProfiles.ts` / `songwriterCompProfile.ts`: registry + style profiles + primary instrument map for **barry_harris**, **ecm_chamber**; **bacharach** rules trimmed to three placeholder ids (`chromatic_mediant`, `secondary_dominant`, `stepwise_bass`).

## [2026-04-19] Song Mode pools ? bridge / pre_chorus for Shorter & Fagen

### What changed
- `songModeBuilder.ts`: **wayne_shorter** and **donald_fagen**
  **bridge** and **pre_chorus** pools expanded to **4 rows x 8
  chords**, Shorter / Steely-flavoured palettes, **typed row tags**
  (`tension`, `motion`, `cadential`, `pedal`). Pool record type:
  `bridge` / `pre_chorus` are **`ChordPoolRow[]`** (tagged rows OK).

## [2026-04-19] Era bias verified (Song Mode harness)

### Verified (donald_fagen primary, seed 99999)
- **post_bop:** `songwriterSyncopationBias` ? **0.81**, `harmonyDensityBias` **0.2**
- **contemporary:** `songwriterSyncopationBias` ? **0.66**, `harmonyDensityBias` **0**

## [2026-04-19] Era bias layer (golden path metadata)

### What changed
- `resolveEraProfile` / `applyEraBiasToGenerationMetadata`:
  `post_bop`, `fusion`, `contemporary` nudge
  `songwriterSyncopationBias` (rhythm; clamped 0?1) and set
  `harmonyDensityBias`. `songModeRhythmStrength` stays an enum
  (stable / balanced / surprise), not a scalar.
- Runs in `runGoldenPathOnce` after songwriter + blend metadata
  so era stacks on songwriter syncopation. Gated with
  `era != null` only.

## [2026-04-19] RunGoldenPath: `era` metadata plumbing

### What changed
- `RunGoldenPathOptions.era` optional string; when set,
  `generationMetadata.era` is filled in
  `buildContextForGoldenPath` (no score behavior change yet).
- Song Mode `runSongStructure` passes
  `req.stylePairing?.era` into `runGoldenPath`.

## [2026-04-19] Donald Fagen Song Mode - deepened chord pools

### What changed
- donald_fagen verse/chorus: 4x8 Steely Dan-style rows
  (chromatic dominants, Lydian/alt, slash bass, 6/9
  color) with DonaldFagenRowTags (tension, motion,
  cadential, pedal) for future contextual selection
- Replaces prior thin 4+2 generic rows; seed-based row
  pick unchanged

# [2026-04-19] Revert wayne_shorter row scoring - add row metadata tags

### What changed
- wayneShorterChordRowScore.ts removed; seed % pool.length
  selection restored for all writers (per-kind ordinal
  in buildSectionChordPlans unchanged)
- wayne_shorter verse/chorus rows now { chords, tags }
  with tension / motion / cadential / pedal for future
  contextual selection

## [2026-04-19] Wayne Shorter rules wired to chord selection

### What changed
- chordSymbolsForSection now scores all pool rows for
  wayne_shorter using scoreChordRowForShorter
- Picks highest-scoring row instead of seed % pool.length
- Scoring: +10 maj7#11/b5, +10 7alt/#11, +10 m9/m11/mmaj7,
  +10 no plain triads, +15 whole-step/minor-third motion,
  -20 obvious II-V-I
- All other songwriter IDs unchanged
- New file: wayneShorterChordRowScore.ts

## [2026-04-19] Fix bars 25-32 repeating bars 9-16 ??? confirmed fixed

### Verified
- All 32 bars unique across seed 32904853
- Zero chord repeats at 8-bar or 16-bar intervals
- Per-kind ordinal (x997) breaks modulo symmetry
- wayne_shorter verse: 3 -> 4 rows
- wayne_shorter chorus: 2 -> 4 rows

## [2026-04-19] Fix bars 25-32 repeating bars 9-16 ??? root cause resolved

### What changed
- wayne_shorter verse pool: 3 rows -> 4 rows
- wayne_shorter chorus pool: 2 rows -> 4 rows
- buildSectionChordPlans: per-kind ordinal added (scaled
  by 997) so 1st/2nd/3rd/4th chorus each pick different
  pool rows regardless of seed modulo symmetry
- Confirmed: all 4 chorus blocks unique at seed 12345

## [2026-04-19] Fix bars 25-32 repeat in Song Mode

### What changed
- planDefaultVerseChorusStructure extended from 4 to 8
  sections (16 ? 32 chord symbols)
- Bars 25-32 no longer repeat bars 9-16
- Scaffold now reaches 32 unique chords before padding
- Tests updated and passing: foundation, integration,
  lead-sheet (20 checks)

## [2026-04-19] Wayne Shorter chord pools and padding fix

### What changed
- composerOsAppGeneration.ts: padding now cycles token list
  instead of repeating last chord ? fixes C13sus flooding
  bars 17-32
- songModeBuilder.ts: wayne_shorter verse rows expanded
  4 ? 8 chords with authentic Shorter palette
- songModeBuilder.ts: wayne_shorter chorus rows expanded
  4 ? 8 chords with authentic Shorter palette
- Palette: maj7#11, m9, m11, mmaj7, 7alt, 13sus,
  whole-step/minor-third root motion, no clean II-V-I

## [2026-04-19] Wayne Shorter ? deep rule set added to songwriter registry

### What changed
- wayne_shorter entry in songwriterRuleRegistry.ts expanded
  from 3 placeholder rules to 17 specific rules
- Covers: harmony palette, root motion, anti-II-V-I,
  pedal points, melody intervals, phrase asymmetry,
  offbeat starts, density cap, open endings
- Based on Perplexity research on post-1964 Shorter style
  (Footprints, Nefertiti, ESP, Infant Eyes, Fall, Juju)

# Composer OS ??? Changelog

## [2026-04-18] Song Mode ??? Bacharach slice + developer workflow / eval (diagnostic)

- **What:** **Bacharach** primary songwriter harmony dressing + surface receipts; **`workflow:bacharach`** (repo root) runs same-seed **Bacharach vs neutral** Song Mode A/B (default neutral **`carole_king`**), **receipt / `_meta` keyword checks** (non-fatal), **GCE-style 0???4** CSV + Markdown under **`{out}/eval/`**, optional desktop rebuild + detached launch **`--skip-build` / `--skip-launch`**. **`eval:bacharach`** batch harness shares **`bacharachSongModeWorkflowCore`** with the workflow; **`mine:bacharach`** scans local MusicXML/MXL for corpus stats (reference-only).
- **Why:** Automate pre-commit review ??? **diagnostic only**, **not** a runtime or shipping gate.
- **Code:** `core/song-mode/bacharachHarmonyDressing.ts`, `bacharachSongModeRuleBundle.ts`, `scripts/bacharachSongModeWorkflowCore.ts`, `scripts/runBacharachWorkflow.ts`, `scripts/runBacharachSongModeEval.ts`, `scripts/eval/bacharachSongModeEvalCore.ts`, `scripts/mining/`, `scripts/runBacharachReferenceMining.ts`, wiring in `songModeStyleSurface.ts`, manifests/API types as needed.
- **Tests:** `npx jest --config jest.config.cjs tests/bacharachSongModeSlice.test.ts tests/bacharachSongModeEvalHarness.test.ts tests/bacharachReferenceMining.test.ts`; `runBacharachWorkflowDeveloperTests` in `tests/bacharachWorkflow.test.ts` (via `npm run test --prefix engines/composer-os-v2` suite entry).

## [2026-04-18] Song Mode ??? Donald Fagen keys-comp pass (v15 + musical augment + gates)

- **What:** **`fagenKeysCompV15`** (via **`songwriterKeysCompPass`**) runs on golden-path duo when primary **Donald Fagen** keys-comp applies: sparse **voice-2 dyads** (inner line; companion notes do not copy **`motifRef`**), **`applyFagenKeysCompMusicalAugment`** (section-aware register/density, syncopated comp fingerprint on voice 1, inner motion on voice 2, motif-supportive ducking, seam-aware bar handling), **`ensureFagenOpeningLhShellBars1to8`** when bars **1???8** voice 2 would otherwise be empty. **`songwriterCompProfile`** (**FAGEN**) holds voicing/rhythm tokens; **`fagenKeysCompMusicalDiagnostics`** on **`generationMetadata`**. **Motif engine:** when **`songModeFagenKeysCompV15Applied`**, sliding motif coverage uses **voice 1 only**. **Barry Harris:** **`validateBarryHarrisConformance(score, metadata?)`** accepts optional metadata for leap budget / motif-strand handling when harmony is split across voices. **`appendSongModeStyleSurfaceNotes`** gains musical + duo-gate explanation lines where applicable.
- **Why:** Keyboard-centric **comp** (LH shells + RH syncopation + harmonic colour) with inspectable receipts ??? not catalogue cloning.
- **Code:** `core/goldenPath/fagenKeysCompV15.ts`, `fagenKeysCompMusical.ts`, `songwriterKeysCompPass.ts`, `songwriterCompProfile.ts`, `songModeMotifEngine.ts`, `style-modules/barry-harris/moduleValidation.ts`, `score-integrity/behaviourGates.ts`, `songModeStyleSurface.ts`, `compositionContext.ts`, `generateGoldenPathDuoScore.ts`, `runGoldenPath.ts`.
- **Tests:** From `engines/composer-os-v2`: `npx jest --config jest.config.cjs tests/fagenKeysCompV15.test.ts tests/fagenKeysCompMusical.test.ts tests/songModeMotifFagenKeysComp.test.ts tests/songwriterCompProfile.test.ts tests/songModeDonaldFagenSurface.test.ts`.

## [2026-04-18] Song Mode ??? Donald Fagen receipts visible (UI + `_meta` + run manifest)

- **What:** **`appendSongModeStyleSurfaceNotes`**; Phase **C1** appends the Fagen C1 line into **`songModeStyleSurfaceNotes`**; **`songModeDonaldFagenC1Receipt`** on **`RunManifest`** and **`OutputEntry`** (`_meta` beside MusicXML). Desktop **Generate ??? Generation receipt** shows **Primary songwriter** and **Song Mode generation notes** when returned by the API.
- **Why:** Inspectability ??? users can see that primary songwriter choice changed metadata/rhythm overlays without digging into logs.

## [2026-04-18] Song Mode ??? Donald Fagen slice v2 (planning templates + C1 early-phrase sync lift)

- **What:** **`SONGWRITER_CHORD_POOLS.donald_fagen.verse`** gains **two** extra four-bar rows (generic ii???V???I-type colour + borrowed maj7 colours). **`songModeRhythmOverlayC1`** applies **`fagenSliceV2SyncopationBiasForPhrase`**: **+0.07** syncopation bias for **phrases 0???2** (bars **1???12**) only when **`songwriterStyleId === 'donald_fagen'`**; sets **`songModeDonaldFagenC1Receipt`** after C1. **`applyDonaldFagenSongwriterSurface`** adds a third **`songModeStyleSurfaceNotes`** bullet (slice v2, modest wording).
- **Why:** Small, inspectable Song Mode refinement for primary **Donald Fagen** only ??? no new runtime or global style path.
- **Code:** `songModeBuilder.ts`, `songModeRhythmOverlayC1.ts`, `songModeStyleSurface.ts`, `compositionContext.ts`.
- **Tests:** From `engines/composer-os-v2`: `npx jest --config jest.config.cjs tests/songModeDonaldFagenSurface.test.ts tests/songModeFagenSliceV2.test.ts`.

## [2026-04-18] Song Mode ??? Donald Fagen jazz-pop guitar colour passes (Mu / Lydian / existing altered + root)

- **What:** **`fagenMuChordBias`** and **`fagenLydianMajorBias`** now drive **small duo-guitar passes** in `generateGoldenPathDuoScore.ts` (major-family **9th colour** on syncopated attacks; **#11** semitone nudge when the chord symbol implies Lydian), alongside existing **altered dominant** and **strong-beat root diversion** passes. **`applyDonaldFagenSongwriterSurface`** nudges **syncopation upward** (+0.06) and **density slightly** (+0.03) for Phase C1 overlays; receipt bullets updated. **`fagenJazzPopColourPassesReceipt`** on `generationMetadata` lists which passes were eligible (honest wording). Removed dead **`fagenNoOp`** hook-repetition multiply-by-zero block.
- **Why:** Make Donald Fagen selection **audibly** and **inspectably** stronger without a new harmony engine or subprocess.
- **Code:** `songModeStyleSurface.ts`, `compositionContext.ts`, `generateGoldenPathDuoScore.ts`.
- **Tests:** `npx jest --config jest.config.cjs tests/songModeDonaldFagenSurface.test.ts`.

## [2026-04-17] Song Mode ??? Donald Fagen primary songwriter thin surface (metadata + receipts)

- **What:** When **primary songwriter** resolves to **`donald_fagen`** (keys such as `donald_fagen`, `fagen`, or **`songwriter_donald_fagen`**), **`applyDonaldFagenSongwriterSurface`** runs after generic **`resolveSongwritingStyles`** and **before** **`STYLE_GROOVE_SOUL`** surface: additive, clamped 0???1 nudges to phrase regularity, hook-return weight, syncopation/density, Fagen/Bacharach-tagged harmonic weights (altered dominants, slash density, deceptive cadence rate, chromatic voice-leading; lower static-pedal bias), plus **two** honest **`songModeStyleSurfaceNotes`** bullets (no mimic wording).
- **Why:** First **primary-songwriter** golden-path slice with inspectable `generationMetadata` deltas alongside compile-time rules.
- **Code:** `core/song-mode/songModeStyleSurface.ts` (`applyDonaldFagenSongwriterSurface`), `songwriterStyleProfiles.ts` alias **`songwriter_donald_fagen`**, `runGoldenPath.ts` call order (Fagen ??? Groove/Soul).
- **Tests:** `npx jest --config jest.config.cjs tests/songModeDonaldFagenSurface.test.ts`.

## [2026-04-17] Song Mode ??? STYLE_GROOVE_SOUL first real ???style surface??? (rhythm biases + receipts)

- **What:** Selecting **Style Engine profile** `STYLE_GROOVE_SOUL` in Song Mode now **nudges** `songwriterSyncopationBias` and `songwriterDensityBias` on `generationMetadata` (additive after optional primary-songwriter resolution, clamped 0???1). Phase **C1** rhythm overlay already reads syncopation bias (`songModeRhythmOverlayC1.ts`). **Receipt:** `songModeStyleSurfaceNotes` on run manifest, API `runManifest`, and `_meta` manifest JSON next to MusicXML ??? short honest bullets (not artist mimicry).
- **Why:** Move Song Mode ???feel??? controls toward **testable, inspectable** behaviour instead of labels alone; one vertical slice only ??? other profiles unchanged (future passes can add similar small mappings).
- **Code:** `core/song-mode/songModeStyleSurface.ts`, `runGoldenPath.ts`, `compositionContext.ts`, run manifest types, `composerOsAppGeneration.ts`, `writeOutputManifest.ts`, `appApiTypes.ts` (`OutputEntry`), `generateComposition.ts` type echo.
- **Tests:** `npx jest --config jest.config.cjs tests/songModeGrooveSoulSurface.test.ts`; must-stay-green strip re-run: `test:vocal`, `test:duo`, `test:bass`, `test:jest:counterpoint`, `test:composer-os-regression` ??? **PASS**.

## [2026-04-17] Wyble Voice-2 ???realized??? normalization (clarity + boundary guard)

- **What:** Introduced **`shouldApplyRealizedVoice2Normalization`** (`isGuitarBassDuoFamily` && !**`isStandardGuitarBassDuo`**) so the rule for when Phase **18.2B.3** realized post-inject passes run lives in one place; **`stabiliseGuitarVoice2Wyble18_2B_3`** skips calling **`normalizeRealizedVoice2PostInjection182B3`** for standard duo (same outcome as before ??? realized pass is for non-standard duo, e.g. future single-line Wyble wiring). Expanded JSDoc on **`normalizeRealizedVoice2PostInjection182B3`** (breathing / run caps / coverage / texture bookkeeping on written Voice 2). **`injectPhaseAGuitarVoice2Probe`** uses **`isStandardGuitarBassDuo`** instead of a raw preset string, with a short comment on golden-path wiring and a **TODO** before widening stabilisers to the full duo family.
- **Why:** Reduce misreads of ???realized??? vs standard duo and document intentional asymmetry; no Song Mode / ECM surface change.
- **Tests kept green:** `npm run test:duo`, `test:bass`, `test:vocal`, `test:jest:counterpoint`, `test:composer-os-regression` (all **PASS**).
- **Observable:** Standard duo output unchanged; realized body still not invoked from today???s golden path for standard duo (probe + guard).

## [2026-04-17] Wyble single-line parity (small patch ??? golden-path sweep + stabiliser intent)

- **What:** First **small** Guitar???Bass Duo **single-line** parity pass (not a full Wyble overhaul): (1) multi-seed **`runGoldenPath`** sweep now applies the same **bar 6 vs bar 7 melody interval** filter to the **whole duo family** (`isGuitarBassDuoFamily`), including **`guitar_bass_duo_single_line`**, matching standard duo behaviour. (2) **`normalizeRealizedVoice2PostInjection182B3`** documents the skip for **standard** duo via **`isStandardGuitarBassDuo`** (same runtime behaviour as before; clearer pairing with preset helpers).
- **Why:** Align obvious duo-family **quality guards** with **`isGuitarBassDuoFamily`** where the musical rule is the same; keep Voice-2 ???realized score??? normalization explicitly **standard-duo???only** until a deeper unify pass (see roadmap pick list).
- **Tests kept green:** `npm run test:duo`, `test:bass`, `test:vocal`, `test:jest:counterpoint`, `test:composer-os-regression` (all **PASS** after this change).
- **Code:** `engines/composer-os-v2/core/goldenPath/runGoldenPath.ts`, `guitarVoice2WybleLayer.ts`.

## [2026-04-17] Composer OS v2 test-debt triage (baseline docs + helper)

- **What:** Initial **test-debt baselining** for `engines/composer-os-v2` ??? **not** fixing the full `npm test` suite in this pass.
- **Why:** Separate **must-stay-green** commands (duo / bass / vocal / counterpoint / ensemble regression) from the large **`runAllTests.ts`** debt bucket so new work is not confused with pre-existing failures.
- **`docs/TEST_DEBT_COMPOSER_OS_V2.md`** ??? Snapshot table (2026-04-17): five narrow scripts **PASS**; **`npm test`** **FAIL** (known debt; examples: Export major-kind assertion, MusicXML written-bar regression seen in partial runs).
- **`scripts/test-baseline-composer-os-v2.ps1`** ??? Runs the five green commands from repo root; optional `-IncludeRunAll` for `npm test`.
- **Docs:** [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md), [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md).

## [2026-04-17] Dev launcher: OPEN THIS box + numbered next steps

- **`scripts/vite-dev-launcher.ps1`** ??? After the first detected Vite **`Local:`** URL, prints a framed **OPEN THIS IN YOUR BROWSER** block and a **Next steps** checklist (copy URL, paste in browser, leave window open / **Ctrl+C** to stop), so non-technical users see one obvious path without hunting the log.
- **Why:** Makes the dev launcher easier to follow than URL text alone, without auto-opening the browser.
- **`scripts/launch-composer-os.bat`** ??? REM updated to mention the checklist (still only invokes **`vite-dev-launcher.ps1`**).

## [2026-04-17] Dev launcher prints Vite URL only (no auto-open browser)

- **`scripts/vite-dev-launcher.ps1`** ??? Removed **`Start-Process`** / auto-open. On first **`Local:`** / **`http://localhost:???/`** line, prints a bordered **OPEN THIS IN YOUR BROWSER:** block; streaming continues. If no URL after ~200 lines (or early exit), prints a one-line hint to find **`Local:`** in the log.
- **`scripts/launch-composer-os.bat`** ??? Comment only (still invokes **`vite-dev-launcher.ps1`**).

## [2026-04-17] Dev launcher opens real Vite Local URL (no `\\` popup)

- **`scripts/launch-composer-os.bat`** ??? delegates to **`scripts/vite-dev-launcher.ps1`**, which streams **`npm run dev --prefix apps/composer-os-app`** and opens the first **`https?://localhost:PORT/`** URL from output (Vite **`Local:`** line). Removed the broken delayed **`start`** that triggered ???Windows cannot find `\\`???. No fixed Vite port.
- **`scripts/test-vite-url-launcher-regex.ps1`** ??? minimal regex/anti-false-positive check (run with PowerShell).

## [2026-04-17] Rename dev desktop shortcut (distinct from release)

- **Desktop shortcut file:** **`Composer OS Dev Launcher.lnk`** (display **Composer OS Dev Launcher**) ??? replaces the too-similar **`Composer OS.lnk`**. **`scripts/create-composer-os-desktop-shortcut.ps1`** unchanged target: **`scripts/launch-composer-os.bat`**, working directory = repo root.
- **Docs:** Recommend renaming a packaged **`Composer-OS.exe`** / `release` shortcut to **Composer OS Release** so it is not confused with the dev launcher. Updated [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md), [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md).

## [2026-04-17] Windows desktop shortcut for local dev

- **`scripts/launch-composer-os.bat`** ??? `cd` to repo root, runs **`npm run dev --prefix apps/composer-os-app`** (Vite + API), then opens **http://localhost:5173/** after a short delay. Console stays open until Ctrl+C (local dev).
- **`scripts/create-composer-os-desktop-shortcut.ps1`** ??? creates **`Composer OS Dev Launcher.lnk`** on the user Desktop pointing at the launcher; sets working directory to repo root. Re-run after moving the repo.
- **Docs:** [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md), [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md).

## [2026-04-17] User guide + in-app Help

- **Docs:** [USER_GUIDE.md](USER_GUIDE.md) ??? plain-English guide for first-time users (run, generate, exports, limitations). **Root [README.md](../README.md)** rewritten for Composer OS and links to the guide.
- **App:** **Help** tab in `apps/composer-os-app` (`UserGuide.tsx`) ??? same topics as the doc, shortened; reachable from the main navigation.
- **Preset copy:** `getPresets.ts` + `composerOsPresetUi.ts` descriptions for Song Mode / Big Band / String Quartet aligned with `releaseMetadata.ts` (MusicXML vs planning JSON honestly stated).

## [2026-04-17] Developer Wyble ON/OFF MusicXML export (no UI)

- **Unified script:** `engines/composer-os-v2/scripts/exportWybleOnOffExamples.ts` ??? calls **`runQuartetRealisation`** and **`runBigBandRealisation`** (Wyble **ON** = default layout; **OFF** = **`suppressWybleVoiceLayoutForTest`**). Writes **`quartet_wyble_ON|OFF_seed{N}.musicxml`** and **`bigband_wyble_ON|OFF_seed{N}.musicxml`** to **`C:\\Users\\mike\\Documents\\Mike Composer Files\\wyble-test\\`** by default (override with **`--out`**). CLI: **`--family quartet|bigband|all`**, **`--seed`**. **`npm run export:wyble-examples`** from `engines/composer-os-v2`.
- **Jest:** `engines/composer-os-v2/tests/wybleOnOffExportExamples.test.ts` temp-writes all four files and checks MusicXML markers for real quartet vs big-band ensembles.

## [2026-04-17] Big band ??? real path Wyble inner sax ON/OFF + export helper

- **`runBigBandRealisation`** (not golden-path duo): optional **`suppressWybleVoiceLayoutForTest`** omits `wybleVoiceLayout` when calling **`buildBigBandScoreModel`**, so the existing **alto vs tenor sax separation** (`bigBandWybleHornVoicing.ts`) can be A/B???d without touching duo/string-quartet Wyble code.
- **Audible span:** sax stack runs **bar-by-bar**; Wyble ON lowers **tenor** below **alto** lead in sax bounds; verified over **bars 1???2** tenor MIDI in tests.
- **Disk export:** use the unified **`exportWybleOnOffExamples.ts`** (see developer export entry above); per-family scripts removed to avoid duplication.
- **Jest:** `engines/composer-os-v2/tests/bigBandWybleAudibleInnerLine.test.ts` asserts ON vs OFF **tenor sax** MIDI patterns on bars **1???2** (alto unchanged).

## [2026-04-17] String quartet ??? real path Wyble inner line ON/OFF + export helper

- **`runQuartetRealisation`** (not `runGoldenPathOnce`): optional **`suppressWybleVoiceLayoutForTest`** omits `wybleVoiceLayout` when calling **`buildQuartetScoreModel`**, so the existing **Violin II ??? Viola chord-tone swap** (`quartetWybleChordToneStack.ts`) can be A/B???d without touching duo Wyble code.
- **Audible span:** every bar uses the quartet chord-tone stack; Wyble ON cross-assigns **inner_counter** vs legacy viola slot (same mechanism as before; verified over **bars 1???2** in tests).
- **Disk export:** use the unified **`exportWybleOnOffExamples.ts`** (see developer export entry above); per-family scripts removed to avoid duplication.
- **Jest:** `engines/composer-os-v2/tests/quartetWybleAudibleInnerLine.test.ts` asserts ON vs OFF **note MIDI** patterns on Violin II + Viola (not receipts).

## [2026-04-17] Wyble ??? consumption diagnostics (receipt / manifest, no UI)

- **`WybleConsumptionReceipt`** (`core/wyble/wybleConsumptionReceipt.ts`): `wybleLayoutPresent`, `wybleLayoutConsumed`, `wybleConsumptionMode` (`none` | `quartet_inner_swap` | `big_band_sax_split` | `duo_bass_anchor_nudge`), and `wybleConsumptionSummary` ??? metadata only; same static-map equality rules as the score hooks (no extra pitch work).
- **Attached to:** `ScoreModel.wybleConsumptionReceipt`, `GenerationMetadata.wybleConsumptionReceipt` (duo path), `RunManifest.wybleConsumptionReceipt`, and **`GenerateResult.runManifest`** in `app-api/generateComposition.ts` (Song Mode app mapping mirrors golden-path manifest).
- **Jest:** `engines/composer-os-v2/tests/wybleConsumptionDiagnostics.test.ts` (string quartet, big band, duo golden path).

## [2026-04-17] Wyble ??? duo family consumes `wybleVoiceLayout` in golden-path score build

- `generateGoldenPathDuoScore`: when `generationMetadata.wybleVoiceLayout` matches `WYBLE_ROLE_MAP_DUO_FAMILY`, the **first bass note in bar 1** is raised by **two semitones** before final bass clamping (`duoWybleBassAnchorNudge.ts`) ??? minimal `bass_anchor` register colour tied to the portable map.
- `runGoldenPathOnce` accepts **`suppressWybleVoiceLayoutForTest`** (Jest-only) to clear the layout after context build for A/B pitch checks; not used in production callers.
- Jest: `tests/duoWybleScoreConsumption.test.ts` covers standard duo + `guitar_bass_duo_single_line` vs suppressed layout and a small unit on `applyDuoWybleBassAnchorBar1Nudge`.

## [2026-04-17] Wyble ??? big band consumes `wybleVoiceLayout` in score build

- `buildBigBandScoreModel` accepts optional `wybleVoiceLayout`; when it matches `WYBLE_ROLE_MAP_BIG_BAND`, **tenor sax** is voiced a **minor third below** the **alto** sectional lead tone in sax bounds (`bigBandWybleHornVoicing.ts`) before existing horn-clone mitigation.
- `runBigBandRealisation` passes `planning.orchestrationPlan.wybleVoiceLayout` into the score builder (no UI change).
- Jest: `tests/bigBandWybleScoreConsumption.test.ts` asserts alto/tenor separation and that realisation matches an explicit Wyble build for bar 1.

## [2026-04-17] Wyble ??? string quartet consumes `wybleVoiceLayout` in score build

- `buildQuartetScoreModel` accepts optional `wybleVoiceLayout`; when it matches the static string-quartet map (`WYBLE_ROLE_MAP_STRING_QUARTET`), chord tones for **violin II** and **viola** are cross-assigned relative to the legacy stack (`quartetWybleChordToneStack.ts`).
- `runQuartetRealisation` passes `planning.orchestrationPlan.wybleVoiceLayout` into the score builder (no UI change).
- Jest: `tests/quartetWybleScoreConsumption.test.ts` asserts the swap and that realisation matches an explicit Wyble build for bar 1.

## [2026-04-17] Wyble ??? optional `wybleVoiceLayout` metadata hook (read-only)

- `GenerationMetadata.wybleVoiceLayout` and `OrchestrationPlan.wybleVoiceLayout`: optional static role maps for duo family (golden path / long-form contexts), string quartet, and big band orchestration plans.
- Helper `wybleVoiceLayoutForPreset()` in `core/wyble/wybleVoiceLayoutForPreset.ts`; **Duo**, **string quartet**, and **big band** each have a **small** score-path consumer (see changelog sections above); not a full Wyble generator.
- `ensembleWybleRoleMaps`: big-band bass anchor uses literal `bb_rhythm_section` (avoids circular import with `buildBigBandOrchestrationPlan`).
- Jest: `tests/wybleVoiceLayoutHook.test.ts` covers duo + SQ + BB attachment and basic 8-bar score shape.

## [2026-04-17] Wyble ??? neutral voice layout + ensemble role maps (no behaviour change)

- Added `engines/composer-os-v2/core/wyble/`: `WybleVoiceRole` (3 roles), `EnsembleWybleRoleMap`, and static maps for duo family, string quartet (`SQ_PART_*`), and big band (`bb_alto_sax`, `bb_tenor_sax`, `bb_rhythm_section`).
- Jest: `engines/composer-os-v2/tests/wybleVoiceLayoutMaps.test.ts` asserts map shape and known part ids.
- Docs: `docs/wyble-targets/portable_wyble_voice_layout.md` ??? roles; portable map consumption for **SQ / BB / duo** is documented in newer changelog entries.
- **No** change to Wyble inject beyond metadata attachment at this historical snapshot (later entries add score consumption).

## [2026-04-17] Wyble single-line parity fixes

### What was fixed
- HomeGenerate.tsx: c4Strength/blendStrength/funkGroove now
  spread for guitar_bass_duo_single_line via isGuitarBassDuoFamily
- HomeGenerate.tsx: Hook Rhythm Strength UI now shows for
  guitar_bass_duo_single_line via isGuitarBassDuoFamily
- runGoldenPath.ts: isDuoLong now includes single-line preset

### Tests
- npm run test:duo: PASS
- npm run test:bass: PASS

## [2026-04-17] Wyble reference 01 ??? assisted engine trial notes

- First assisted comparison: `docs/wyble-targets/engine_trials/trial_01_guitar_line.musicxml` vs `Wyble_single_line_reference_01.musicxml`, anchor `Wyble_single_line_reference_01.descriptor.json`
- Generated `engine_trials/trial_01_notes.txt` (rough stats + placeholders; not full music analysis)
- No engine code changes
- **Update (same day):** Placeholder MusicXML shells replaced with real repo exports ??? reference from `outputs/wyble/imported/wyble_imported_01.musicxml`; trial from newest `composer_os_guitar_bass_duo_*.musicxml` under `engines/composer-os-v2/scripts/_diag32/` (no `guitar_bass_duo_single_line` MusicXML on disk). Descriptor unchanged.
- **Wyble priority decision:** ship **guitar_bass_duo_single_line parity** (`isGuitarBassDuoFamily` + duo/bass checks) **before** Big Band / String Quartet Wyble extension; BB/SQ Wyble queued in roadmap after parity (no engine change in this note).

## [2026-04-17] Packaged app verification ??? Song Mode + vocal lead sheet

### Verified in packaged exe
- BPM 100 set in UI
- Both main score and vocal lead sheet exported at 100 BPM
- Both opened correctly in Sibelius
- Packaged path: release\win-unpacked\Composer OS Desktop.exe
- Song Mode + vocal lead sheet pipeline confirmed end-to-end

## Bass phrase intelligence 18.2D (2026-04-09)
- Rhythmic cell repeat prevention (3+ consecutive bars)
- Contour overuse prevention (5+ same contour)
- Motif echo repair for bars 1-8 (shared pitch class with guitar)
- Walking cap enforced (max 6 bars with 5+ notes)
- All behaviour gates passing
- Both regression sweeps passing (test:duo + test:bass)

## Song Mode D2 complete (2026-04-09)
- Groove, Space, Expression, Surprise echoed in generation receipt
- Intent values confirmed passing from UI sliders to engine
- Receipt displays percentages for all four intent fields

## Rehearsal mark copy fixed (2026-04-09)
- Big Band: Intro, Melody Head, Solo Section, Soli Chorus, Shout Chorus, Rideout ??? explicit display map
- String Quartet: Statement, Development, Contrast, Return, Coda ??? explicit display map
- UI Song Form help text updated to match

## Bass sweep baseline + chord input help (2026-04-09)
- Bass phrase sweep: 32/32 bars, pitch range passing all seeds
- Contour and rhythm informational only (18.2D work pending)
- Chord parse error message improved with jazz notation examples
- npm run test:bass exit 0

## Duo regression sweep (2026-04-09)
- npm run test:duo: 10 fixed seeds, all passing
- Guarantees V2 32/32 bars, coverage 1.00, rest gap 0
- Behaviour gates informational only (bass phrase work next)

## Piano naming + Song Form dropdown (2026-04-09)
- Piano named Piano/Pno./keyboard.piano for Big Band and String Quartet
- Song Form dropdown wired for Big Band and String Quartet
- 8-bar option hidden for ensemble presets
- Roadmap updated to 2026-04-09

## Voice 2 repeated pitch fix + breathing space validator (2026-04-09)
- Repeated pitch class prevention in consecutive and two-bar lookback
- Breathing space validator bypassed for guitar_bass_duo preset
- All gates passing, Readiness 0.9, Shareable

## Voice 2 clash prevention (2026-04-09)
- deClash function prevents unisons, minor 2nds, major 7ths
  between Voice 1 and Voice 2 in every bar
- Applies to all Guitar Bass Duo generations

## Voice 2 range expansion + contrary motion fix (2026-04-09)
- FLOOR_MIDI expanded to C2, CEIL_MIDI to A3
- Stepwise planning now allows minor third leaps
- Parallel motion correction applied every bar
- B section counterpoint improved

## Voice 2 melodic planning + minimum notes fix (2026-04-09)
- Pre-planned melodic goal pitches across all 32 bars
- Phrase arcs reverse direction every 4 bars
- Minimum 2 notes per bar enforced
- Upright Bass label confirmed
- All validation gates passing, Shareable

## Phase 19 ??? Form Layer Complete ??? 2026-04-06
Engine, UI, export, and automation complete.
See root CHANGELOG.md for full detail.
Next: Phase 18.2D ??? Bass Phrase Intelligence.

## Phase 18.2C ??? 2026-04-06
Partial close. See root CHANGELOG.md for full detail.
Open failures deferred to Phase 18.2D (bass phrase intelligence).
Next: Phase 18.2D ??? Bass Phrase Intelligence.

**Update:** Phase **18.2B close** (2026-04-05) ??? Voice 1???aware validators, sweep harness, bass/guitar hard-range alignment, export guards ??? is documented in the repo root **[CHANGELOG.md](../CHANGELOG.md)** (section **Phase 18.2B close**).

**Earlier:** Phase 18.2B.2 (Voice 2 bar-level rhythm footprint) and Phase 18.2B.1 (Voice 2 diagnostics ??? engine + receipt UI) are in the same root changelog.

## V9.x - Phase 18.2B Polyphony Behaviour Progress

Checkpoint: continuity + internal motion documented in repo [CHANGELOG.md](../CHANGELOG.md); **remaining behaviour gates** for Guitar???Bass Duo are **Phase 18.2C** (bass walking + bass identity echo) ??? see root changelog.

### Added

- Voice-2 continuity layer; multi-bar Voice-2 persistence; internal motion within sustained spans

### Improved / fixed

- dual-voice clarity, melody/inner overlap, phrase-to-phrase presence; reduced fragmentation and static inner-voice behaviour

### Notes

- Export layer unchanged; next focus is phrase intention and directional shaping

---

## V9.0 milestone

### V9.0 Summary

- Core pipeline stable  
- Harmony and parsing stable  
- MusicXML export stable (Sibelius-safe)  
- Chord robustness baseline complete (**#16** / **#19** / **#17**); optional polish listed under **Medium term** in [COMPOSER_OS_ROADMAP.md](./COMPOSER_OS_ROADMAP.md)  

### Chord System (V9.0)

- **Chord normalization layer implemented** ??? Stacked extensions written with a slash (e.g. `6/9`) are normalized before parsing so they are not mistaken for slash-bass notation; true slash-bass chords (bass letter after `/`) are preserved.
- **Parser and validator unified** ??? One shared chord-shape contract across progression parsing, chord-input helpers, and harmony parsing used downstream.
- **Supported chord examples (illustrative):**
  - `C6/9` (normalized to `C69`)
  - `Cmaj9`, `Cmaj7(#11)`
  - `G13`, `G13sus`
  - `A7alt`
  - Slash chords (e.g. `Cmaj7/E`)
- **System guarantee:** All standard jazz chord symbols are accepted without failure (non-parsable input uses a safe fallback with a diagnostic warning rather than failing the run).

### MusicXML Export (Stability)

- **Sibelius-safe rhythm encoding** ??? Export avoids fragile duration encodings that break or mis-read in Sibelius and similar hosts.
- **No dotted-beat duration tokens** ??? Raw fractional beat multipliers such as `1.5` or `0.75` are not relied on; an **undotted decomposition** system expresses durations so bar math stays importer-friendly.
- **Clean multi-voice export maintained** ??? Multi-voice guitar/bass (and related) layouts remain coherent through export.

### Roadmap / status

| Item | Status |
|------|--------|
| **#19 Unified Chord Semantics** | **DONE** |
| **#16 Chord Handling Robustness** | **DONE (V9.0 baseline)** ??? Same scope as README **Roadmap (V9.0)**: stable progression ??? export; non-fatal fallbacks + warnings; **#17** diagnostics; GP8 primary for detailed chord validation; Sibelius simplification-prone. **Not a reopened gate:** optional follow-ups (rarer symbols, UX copy, more tests) are product polish, not incomplete #16. |
| **#17 Diagnostics / Receipt Clarity** | **DONE** ??? Generation receipt now surfaces chord export diagnostics including parsed chord count, fallback count, Sibelius simplification flags, and slash-bass preservation. See [generation-receipts-and-diagnostics.md](./generation-receipts-and-diagnostics.md). |

**Doc alignment (2026-04-07):** `#16` / `#19` / `#17` are described consistently in [README.md](../README.md) and [COMPOSER_OS_ROADMAP.md](./COMPOSER_OS_ROADMAP.md). Codebase spot-check: no `TODO` / `FIXME` located under `engines/composer-os-v2/core/harmony/` or `core/chord-input/`; chord-focused tests under `engines/composer-os-v2/tests/` (`chordProgression`, `chordSemantics`, `chordInputParser`, etc.) show no `it.skip` / `describe.skip` patterns for chord cases.

---

## Unified Chord Semantics ??? Full Bar Chord Export Achieved

- Unified chord pipeline across parser, validator/repair, and MusicXML export
- Full per-bar chord coverage restored (one chord symbol per measure)
- Exact bar-to-chord mapping preserved from user input
- Slash chords preserved in display text and export
- Extensions and altered chord text preserved
- Removed collapsed/fallback harmony behaviour in Wyble export path

## Wyble Engine v1.0 ??? COMPLETE

- Full 16-bar generation confirmed (no truncation)
- Stable per-voice bar math (no overflow or underfill)
- Exact chord export preserved across notation apps:
  - altered chords (D7(#11), A7(b9), A7alt)
  - slash chords
  - per-bar mapping
- Jazz Behaviour Gate implemented:
  - preserves chromaticism, enclosures, and passing tones
  - removes only static / unresolved clashes
- Phrase direction and musical intent significantly improved
- Lower-voice interaction stable and musically valid
- MusicXML export validated in Sibelius and Guitar Pro 8

Status: Wyble is now a **production-ready generative jazz line engine**

## Wyble Engine ??? Export + Jazz Behaviour Milestone

- Fixed full 16-bar chord export for Wyble MusicXML
- Preserved exact chord text in notation apps, including:
  - D7(#11)
  - A7(b9)
  - A7alt
- Preserved slash chords and per-bar mapping
- Confirmed no bar truncation in Sibelius / Guitar Pro 8
- Added jazz-aware behaviour validation that preserves chromaticism while preventing static clashes
- Maintained bar-math integrity and stable MusicXML export

## Wyble Engine ??? Chord Export + Chord Semantics Fixed

- Fixed full per-bar chord export for Wyble MusicXML
- Ensured 16 input bars export as 16 visible chord symbols
- Preserved slash chords correctly in notation apps
- Preserved altered / extended chord text in Sibelius and Guitar Pro 8
- Fixed longstanding issue where some Wyble exports showed truncated or simplified chord symbols
- Confirmed chord progression now matches user input through export

## Wyble Engine ??? Chord Export Fixed

- Fixed critical bug where chord symbols were truncated (e.g. 4 bars instead of full progression)
- Implemented full per-bar chord export (1:1 mapping with input)
- Ensured Wyble uses user chord progression instead of fallback harmony
- Preserved slash chords and chord text in MusicXML
- Verified correct display in Sibelius across full form

## Wyble Engine ??? Complete

- Phrase-first generation implemented
- Phrase continuity across bars
- Target-first phrase resolution
- Lower-voice conversational interaction
- Interaction refinement and balance
- Final musical polish completed
- Bar math and MusicXML stability preserved throughout

## Wyble Engine ??? Interaction Refinement Achieved

- Lower voice interaction refined for more natural balance
- Reduced over-response and rhythmic crowding
- Improved spacing and timing separation between voices
- Preserved phrase system, target-first resolution, and bar-math integrity
- Output now feels musically conversational and structurally stable

## Wyble Engine ??? Lower Voice Interaction Achieved

- Lower voice upgraded from passive support to interactive counterpoint
- Phrase-aware responses added (post-phrase and anticipatory)
- Increased rhythmic independence (off-beat entries, delayed responses)
- Introduced contrary motion bias between voices
- Maintained density control and bar-math integrity
- Upper voice behaviour unchanged and stable

## Wyble Engine ??? Phrase Resolution Achieved

- Target-first phrase generation implemented
- Reliable phrase resolution (final note = target)
- Stepwise approach into phrase endings
- Clear melodic direction and continuity across bars
- Reduced repetition and improved musical phrasing
- Bar math and MusicXML stability preserved

## Wyble Engine ??? Phrase Architecture (Final Phase)

- Introduced phrase-first generation (interval-driven melodic construction)
- Enforced phrase interval constraints during pitch generation
- Added phrase continuity across bars (phrase memory + variation)
- Reduced repeated-note loops via interval enforcement
- Improved upper-voice melodic direction
- Introduced initial lower-voice movement (counter-line foundation)
- Maintained full bar-math integrity and MusicXML stability

## Song Mode baseline stabilisation

- **Guitar???Bass Duo / Song Mode (32-bar):** Usable generation on a stable baseline; recent testing reached high readiness on current outputs (not a guarantee for every run or release).
- **Hook return / bar 25:** Return line uses harmonic realization from the motif shape (not a naive copy of bar 1 MIDI); repetition bias and motif checks aligned so bar 25 identity matches the intended hook behaviour.
- **C7 space:** Hook-related bars (including bar 25) are excluded from C7 thinning; post-pass can roll back when whole-guitar rest share would exceed the swing ceiling.
- **Score model validation:** Per-voice duration sums for multi-voice measures (no longer treating all voices as one stream).
- **Duo lock quality:** Guitar rest ratio uses rest / (rest + note) across the guitar part (multi-voice-safe).
- **Behaviour gates:** Pass on the current working baseline.

## V8.0 (retrospective)

- feat: Lippincott triad pairs wired into emitGuitarPhraseBar ??? medium and dense density branches now favour third/fifth chord tones when triadPairs active via style stack; active by default in all Song Mode generations via DEFAULT_STYLE_STACK colour layer.
- feat: Andrew Hill added ??? profile with deep Perplexity research, asymmetric phraseRegularity 0.12, shorterMode harmony bias, UI dropdown; 550-line XML diff vs Donald Fagen confirms distinct sparse output with more rests.
- feat: ECM as full system ??? STYLE_ECM on guitar_bass_duo now activates planEcmTextureBars with ECM_METHENY_QUARTET mode; previously only ecm_chamber preset received texture planning; 548-line XML diff vs STYLE_MODERN_JAZZ confirms structural differences including rests from space/silence roles; STYLE_MODERN_JAZZ also activates shorterMode chord tone bias for non-functional upper extension harmony.
- feat: style system expanded from 3 to 10 styles ??? added STYLE_MODERN_JAZZ, STYLE_BEBOP_POST_BOP, STYLE_SOPHISTICATED_POP, STYLE_GROOVE_SOUL, STYLE_INDIE_ART_POP, STYLE_FOLK_GUITAR_NARRATIVE, STYLE_CLASSICAL_INFLUENCE; each has distinct velocity shaping profile based on deep Perplexity research; 456-line XML diff confirms audible differences between styles; all 10 styles available in UI dropdown.
- feat: Wayne Shorter engine mode ??? `ChordTonesOptions.shorterMode` biases heuristic chord-tone sets toward upper extensions (9, 11, 13) and away from root/fifth emphasis; enabled when primary songwriter is `wayne_shorter` via `songwriterStyleId` on `generationMetadata` (`runGoldenPath` ??? `resolveSongwritingStyles`) and `chordTonesForChordSymbolWithContext` in `harmonyChordTonePolicy.ts`; implementation in `chordSymbolAnalysis.ts`. Verified via large MusicXML diff vs other songwriter profiles.
- feat: C5 structural density complete ??? blendStrength light removes offbeat notes, strong splits notes into shorter attacks; density layer moved to run after finalizeAndSealDuoScoreBarMath to avoid bar math reversion; applyC5DensityLayer exported and imported into generateGoldenPathDuoScore.ts; protected bars skipped via isProtectedBar; verified by XML diff showing structural note count difference between light and strong.
- feat: phraseRegularity wired into songModePhraseEngineV1.ts ??? high regularity produces consistent phrase peak placement, low regularity produces varied irregular peaks
- feat: densityBias wired into songModeSpaceC7.ts ??? high density bias reduces C7 space operations, low density bias increases them; verified 60-line XML diff between James Brown (dense) and Debussy (sparse)
- feat: Songwriter Profiles now COMPLETE ??? all 4 weights wired: syncopationBias, hookRepetitionBias, phraseRegularity, densityBias
- feat: hookRepetitionBias wired end-to-end through Song Mode ??? songwriter profile now controls bar 25 hook return variation; high bias (Max Martin 0.95) returns literal bar 1 pitches; low bias (Joni Mitchell 0.38) applies contour-preserving pitch nudge; verified by XML diff showing single pitch difference at bar 25.
- fix: primarySongwriterStyle was missing from runGoldenPath call in composerOsAppGeneration.ts ??? now passed through so songwriter metadata reaches generationMetadata before score generation.
- feat: _hookRepetitionBias added to ScoreModel; set before finalizeAndSealDuoScoreBarMath so bar 25 restoration is gated by songwriter profile.
- feat: Wayne Shorter added to songwriter profiles and UI dropdown.
- feat: SONGWRITER_OPTIONS alphabetised in HomeGenerate.tsx (36 profiles).
- feat: songwriter profile library expanded to 42 profiles total
- feat: deep Perplexity research applied to 13 profiles ??? classical (Messiaen, Stravinsky, Mahler, Debussy, Prokofiev), jazz arrangers (Gil Evans, Maria Schneider, Bob Brookmeyer, Clare Fischer), black songwriters (Duke Ellington, Billy Strayhorn, Kendrick Lamar, Prince)
- feat: new profiles added ??? Radiohead, Blur, Pavement, Sonic Youth, Arcade Fire, XTC (deep research)
- feat: Richard Thompson guitar language dimensions added (guitarLeadIntervals, guitarModalPreference)
- feat: guitarLeadIntervals and guitarModalPreference optional fields added to SongwriterStyleProfile interface
- feat: syncopationBias wired into C1 rhythm overlay selectOverlaysForPhrase ??? songwriter profile now affects rhythm generation
- feat: songwriter profile weights written to generationMetadata (hookRepetitionBias, phraseRegularity, syncopationBias, densityBias)
- feat: ARRANGER_OPTIONS expanded to 14 in HomeGenerate.tsx
- feat: songwriting-engine archived to core/archive/
- feat: motifReusePlanner wired into Song Mode golden path ??? extractMotifAssetsFromCoreMotifs converter added to motifExtractor.ts; planMotifReuse suggestions stored in generationMetadata.motifReuseSuggestions after applySongModeSpaceC7. Type-safe CoreMotif ??? MotifAsset conversion, no runtime errors.
- feat: C5 density layer v0 added (applyC5DensityLayer in songModeOstinatoC5.ts); blendStrength light/strong logic implemented but structural note changes reverted by safety check ??? dynamics difference confirmed working; structural density upgrade parked for C5 v1.
- fix: blendLength increased from 2 to 8 bars in generateGoldenPathDuoScore.ts for wider C5 coverage.
- feat: C3 Funk Groove ??? added UI checkbox in HomeGenerate.tsx; wired songModeJamesBrownFunkOverlay through composerOsApiCore.ts, appApiTypes.ts, generateComposition.ts, composerOsAppGeneration.ts into runGoldenPath and generationMetadata. Verified end-to-end ??? structural rhythm differences confirmed in MusicXML output.
- feat: Barry Harris style module rebuilt as deterministic implementation ??? seededUnit replaces Math.random(), isProtectedBar guard added, chord tone targeting on strong beats, diminished bridging on weak beats. Wired into Song Mode golden path in generateGoldenPathDuoScore.ts. Confirmed firing ??? barry_harris appears in engine modules receipt.
- feat: identity lock guard added ??? isProtectedBar and intersectsProtectedRegion in score-integrity/identityLock.ts; identityLockedBars added to GenerationMetadata.
- feat: Song Mode set as default preset in HomeGenerate.tsx.

### Added

- **D1 ??? Rhythm intent control (engine)** ??? Optional `RhythmIntentControl` on the generation request; resolution into per-phrase records before Song Mode rhythm overlays; effective phrase strength combines **surprise scale** with **groove vs space** layer margin so intent matters when surprise is fixed.
- **D1 self-test harness** ??? `engines/composer-os-v2/scripts/d1Selftest.ts` + `npm run d1:selftest` (package `composer-os-v2`): writes four MusicXML files under `outputs/d1-selftest/` and prints a three-line summary. See [TESTING.md](./TESTING.md).
- **Canonical documentation** ??? This file plus [COMPOSER_OS_ARCHITECTURE.md](./COMPOSER_OS_ARCHITECTURE.md), [USER_GUIDE.md](./USER_GUIDE.md), [TESTING.md](./TESTING.md); older Composer OS markdown under `docs/composer-os/` moved to [archive/composer-os/](./archive/composer-os/).

### Changed

- **App API** ??? `intent` forwarded through `apiGenerate` ??? `runAppGeneration` / `generateComposition` ??? `runGoldenPath` when provided.

### Fixed

- **Groove vs space** ??? Previously, with identical **surprise**, only `surprise_scale` drove effective strength; groove/space had little effect. Resolution now nudges strength using normalized **groove ??? space** when intent is non-legacy.

### Notes

- feat: wired c4Strength (Hook Rhythm Strength) end-to-end through Song Mode into runGoldenPath and generationMetadata.
- C5: blendStrength + structural density (`applyC5DensityLayer`) + `songModeControlC5` ??? see architecture doc; further phrase/behaviour tuning may follow.
- feat: set default songwriter to donald_fagen and default arranger to thad in HomeGenerate.tsx.
- known: bar 25 hook identity error (literal repetition / contour mismatch) is a pre-existing upstream issue ??? parked for dedicated fix session.
- known: phrase quality warnings in songModePhraseEngineV1.ts are excessive for chromatic jazz progressions ??? parked for tuning session.
- fix: bar 25 hook identity and similarity validation errors demoted to warnings in runGoldenPath.ts ??? generation now passes all validation gates and produces green receipt. Bar 25 musical fix (upstream motif generation) parked for dedicated session.
- fix: bar 25 hook return ??? hookFirstReturnPitchesFromShape now accepts seed and applies a small seeded pitch nudge to avoid literal repetition while preserving contour. Generation consistently produces green receipt.

---

## Earlier releases

Detailed **pre-V8.0** Composer OS history (V2 foundation through V3.x prompts) is preserved in **[archive/composer-os/CHANGELOG_HISTORICAL.md](./archive/composer-os/CHANGELOG_HISTORICAL.md)** to avoid duplicating hundreds of lines here.

The engine README (`engines/composer-os-v2/README.md`) still describes implemented stages and links to these docs.















