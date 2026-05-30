# Composer OS — v1.5.0 Handoff

## Codebase
`C:\Dev\composer-os\`  
**Version:** v1.5.0  
**Branch:** main  
**Tag:** v1.5.0

## What shipped (V105p1–V1.5p10)

### String Quartet
- `buildMusicContextFromStringQuartet()` — 7 texture archetypes, 4-layer voice-leading (role · texture · solver · diagnostics), Tritonic float on violin_1 + inner voice
- `StringQuartetGeneratePanel` — texture cards, Tritonic colour (None · Subtle · Active), post-generate status chips

### Wyble × Tritonic
- `AnchorDescriptor` + `buildMusicContextFromWybleTritonic()` — Wyble voicing density steers Tritonic state machine at phrase level without resetting tension arc

### Duo dual-guitar
- Extended `buildMusicContextFromDuo()` — 3 topologies (`guitar_bass` · `dual_guitar` · `dual_guitar_bass`), per-bar lower-guitar role resolver, collision / parallel-motion diagnostics

### Monk Python bridge
- `monk_bridge.py` → `buildMusicContextFromMonk()` — chromatic neighbours, tritone shifts, rhythmic motif metrics

### Post-processors (always-on)
- `buildPracticeLayerFromMusicContext()` — V88 practice curriculum from any MusicContext
- `buildCompositionDepthFromMusicContext()` — V89 harmonic arcs, motivic transforms, reharm suggestions

### Generate UI
- VaultMicroscope + FretboardPanel on Generate (`musicContextGeneratePanels.ts`)
- Tritonic monitor — Harmonic Float + Melodic Trace (`TritonicMonitorPanel`)
- Producer UI — 3 lanes (Song & Chart · Study & Pattern · Texture & Arrangement), shared context strip, always-visible Tritonic Float over line

## Goal of next session (v1.6)

**Ensemble golden-path MusicContext producers + section editor** — wire **Zappa solo**, **BB/SQ export-truth LOCK** producers beyond post-generate adapters; **section editor UI** for per-bar engine / texture overrides; **MusicXML import stress** suite (Real Book fixtures, repeat truth). Continue **V66 backlog** (FZ_* receipt stubs, fretboard view depth, ContrapuntalLineEngine follow-up).

## Test state

| Suite | Baseline (v1.5.0) |
|-------|---------------------|
| Jest node (`engines/composer-os-v2`) | **478/478** PASS (**60** suites) |
| Jest total (node + UI smoke) | **464/464** PASS (**59** suites) |
| `tests/musicContext.test.ts` | **111/111** PASS |
| Composer smoke (full) | **489/0** PASS (**94** suites) — re-run after allowlist edits |
| pytest `martino/tests/` | **76/76** PASS |

## Active MusicContext producers

| Producer | sourceEngineId | Adapter / entry |
|----------|----------------|-----------------|
| Riff | `riff` | `buildRiffGeneratorMusicContext` |
| iReal Pro | `ireal` | `buildMusicContextFromIReal` |
| Slonimsky | `slonimsky` | `buildMusicContextFromSlonimsky` |
| Tonality Vault | `vault` | `buildMusicContextFromVaultOutput` |
| Wyble (chord bars) | `wyble` | `buildMusicContextFromWyble` |
| Wyble etude preset | `wyble` | `buildMusicContextFromWyblePreset` |
| Wyble × Tritonic | `wyble_tritonic` | `buildMusicContextFromWybleTritonic` |
| Standalone etude | `etude_preset` | `buildStandaloneEtudePreset` |
| Martino Linear | `martino` | `buildMusicContextFromMartino` |
| Comping | `comping` | `compingGenerator` (inline) |
| ECM chamber | `ecm` | `buildMusicContextFromEcm` |
| Duo | `duo` | `buildMusicContextFromDuo` / `buildMusicContextFromLockedDuo` |
| Song Mode | `song_mode` | `buildMusicContextFromSongModeTruth` / `buildMusicContextFromLockedSongMode` |
| Song Mode (harmony shell) | `song_mode` / `ecm` / `big_band` | `buildMusicContextFromHarmonyBars` (section router) |
| Tritonic (standalone) | `tritonic` | `realisationToMusicContext` |
| Tritonic (Vault anchor) | `tritonic` | `buildMusicContextFromVaultTritonic` |
| Tritonic (melody trace) | `tritonic` | `buildMusicContextFromTritonicMelody` |
| Big Band | `big_band` | `buildMusicContextFromBigBand` |
| New Orleans / funk | `new_orleans` | `buildMusicContextFromNewOrleans` |
| Wayne Shorter | `wayne_shorter` | `buildMusicContextFromWayneShorter` / `buildMusicContextFromWayneShorterHarmony` |
| Monk | `monk` | `buildMusicContextFromMonk` / `buildMusicContextFromMonkHarmony` |
| String Quartet | `string_quartet` | `buildMusicContextFromStringQuartet` |
| Practice layer | `practice_layer` | `buildPracticeLayerFromMusicContext` |
| Composition depth | `composition_depth` | `buildCompositionDepthFromMusicContext` |
| Population Composer | `population_composer` | `buildMusicContextFromPopulation` |
| Zappa Solo | `zappa_solo` | `buildMusicContextFromZappaSolo` |

## Active MusicContext consumers (flag-gated)

| Consumer | Flag |
|----------|------|
| Slonimsky | `SLONIMSKY_MUSIC_CONTEXT` |
| Wyble | `WYBLE_MUSIC_CONTEXT` |
| Martino | `MARTINO_MUSIC_CONTEXT` |

## Musical Model Decisions

### Why Tritonic is bias-based, not rule-based

Hard rules fight songwriter slices and Vault LOCK. Nine **behaviour biases** (0–1, neutral 0.5) **rerank** voice-leading candidates and nudge timeline density. Wayne layer (`oddityScore`, `delayedResolution`) applies first; biases soft-tilt. Same chart + seed stays reproducible; composers dial **feel** without forking the engine.

### Why three strands exist

- **`voicingTop`** — harmonic float; top note of each cell voicing
- **`projectedStrand`** — voice-led continuity through the cell chain
- **`singerSafeMotif`** — stepwise-biased, narrow tessitura, ≤4 semitone leaps

Harmonic Float prioritises voicing + projected strand; Melodic Trace exports **`singerSafeMotif`** while Vault anchors stay in **`harmony.bars`**.

### How Song Mode differentiates sections

Each **`SongSectionPlan`** may set **`sectionEngine`**. Router defaults: verse → ECM, chorus → Big Band, bridge → Vault × Tritonic. Assembly concatenates per-section MusicContexts, re-normalises symbols, emits **`masterChecksum`** + **`sectionEngines`** receipt.

### String Quartet four-layer stack (v1.5)

1. **Role assignment** — lead / inner / bass register norms per texture  
2. **Texture archetype** — 7 cards (homophonic · chorale · contrapuntal_weave · …)  
3. **Voice-leading solver** — smoothness + spacing + crossing diagnostics  
4. **Tritonic colour** — optional float on Vn1 + one inner voice; suppressed in **chorale**

Harmony spine = golden-path export truth → normalised symbols → checksum LOCK.

### Wyble × Tritonic anchor feed (v1.5)

**`AnchorDescriptor`** captures Wyble bar voicing density without replacing harmony symbols. Per-bar biases feed the Tritonic **state machine** at **phrase commit** boundaries only — tension arc, unresolved tones, and registral centroid **persist** across bars. Contrast with Vault × Tritonic where symbols are the anchor.

### Duo dual-guitar roles (v1.5)

Lower guitar is **not** a second melody by default. **`instrumentTopology`** picks layout; per-bar **role resolver** chooses guide-tone lane, counterline, pedal, sparse comp answer, or rest from upper + bass harmony. Receipt tallies role distribution + registral collisions.

### Practice + composition depth (v1.5)

**Post-processors** on any existing MusicContext — no new harmony source. **Practice layer** extracts guide-tone lines, scales, difficulty, ordered study sequence. **Composition depth** adds harmonic development plan, motivic transformation list, per-chord reharm suggestions, section arc map. Always-on; receipts on manifest.

### Generate producer lanes (v1.5 UI)

Three lanes group presets by composer mental model — **Song & Chart**, **Study & Pattern**, **Texture & Arrangement**. Tile chooser + per-lane blurb; shared strip (harmony · time · seed · export integrity). **UI-only** — underlying preset / generate paths unchanged in v1.5.0.

## Known Musical Artifacts

| Artifact | Cause | Mitigation |
|----------|-------|------------|
| Singer line feels “safe” / flat | `singerSafeMotif` leap cap + register window | Lower `motifSingability`; use `projectedStrand` for instrumental lead |
| Bridge never cadences | ECM / Tritonic `delayedResolution` + high `cadenceAvoidance` | Lower `resolutionDelay` / `cadenceAvoidance` on outro |
| Shout chorus uniformly spiky | BB mode + `oddityScore` floor ≥ 0.65 | Lower `tension` dial; try `shell_voicing` comping |
| Hard cut at section boundary | No crossfade between engine families | Plan transition bars; keep harmony roots across boundary |
| Wayne / Monk startup delay | Python subprocess cold start | Accept on first generate; cache not yet shipped |
| SQ inner voices collide | Dense texture + Tritonic Active on both float voices | Use Subtle colour or homophonic / chorale texture |
| Lower guitar doubles bass root | `guide_tone_lane` role on strong-beat bars | Switch topology to `guitar_bass` or force `counterline` intent |
| Practice layer empty guide tones | Sparse harmony / single-note bars | Generate from richer MusicContext first |
| Producer lane mismatch | UI lane is cosmetic until v1.6 backend routing | Pick preset explicitly until lane→payload wiring ships |

## Hard rules (carry forward — all 11)

1. **`normalizeChordSymbol` is canonical** — checksum after normalisation
2. **Never publish Martino `.reduction` to `harmony.bars`**
3. **pytest `martino/tests/` must stay at 76 passing**
4. **ECM mode forces `delayedResolution: true`** on tritonic realisation
5. **BB tritonic mode enforces `oddityScore` floor ≥ 0.65**
6. **Song Mode LOCK: duplicate `sectionId` hard-fails** at assembly
7. **Hop limit: warn at 2, block at 3** MusicContext hops
8. **Do not run `npm run dist` mid-feature** — commit docs first, then dist + tag
9. **Every version ends with commit + push + tag**
10. **Ship discipline:** CHANGELOG + architecture/roadmap in same commit as feature
11. **Regenerate `.docx`** whenever cookbook / handbook `.md` changes

## v1.6 roadmap

- **Zappa solo MusicContext producer** — golden-path export truth → LOCK → adapter (deferred from v1.4)
- **BB / SQ LOCK producers** — full pipeline handoff beyond post-generate `buildMusicContextFrom*` on success path only where missing
- **Section editor UI** — per-bar engine / texture / meter overrides with receipt trail
- **MusicXML import stress suite** — Real Book fixtures, repeat / volta truth, regression gates
- **Producer lane backend** — lane selection drives default preset + section-engine pairing (UI is cosmetic in v1.5.0)
- **V66 backlog carry-forward** — remaining FZ_* stubs · fretboard view depth · ContrapuntalLineEngine / parallelRepair follow-up

## Files to read at next session start

- `docs/COMPOSER_OS_V15_HANDOFF.md` (this file)
- `docs/COMPOSER_HANDBOOK.md` — § ECM VRB · § Tritonic UI · § String Quartet
- `docs/CHANGELOG.md` — `[1.5.0]` entry
- `engines/composer-os-v2/core/string-quartet/stringQuartetMusicContextProducer.ts`
- `engines/composer-os-v2/core/tritonic/wybleTritonicRealisation.ts`
- `engines/composer-os-v2/core/duo/duoProducer.ts`
- `engines/composer-os-v2/core/monk/monkMusicContextProducer.ts`
- `engines/composer-os-v2/core/practice-layer/practiceLayerBuilder.ts`
- `engines/composer-os-v2/core/composition-depth/compositionDepthBuilder.ts`
- `apps/composer-os-app/src/constants/generateProducerLanes.ts`
- `apps/composer-os-app/src/pages/HomeGenerate.tsx`
- `src/engine/ecmVrb.js` · `src/renderer/components/VrbPanel.jsx`
- `docs/COMPOSER_OS_ROADMAP.md`

## Exact commands to confirm baseline

```bash
# Jest (composer-os-v2 node project)
cd engines/composer-os-v2
npx jest --config jest.config.cjs --selectProjects node --passWithNoTests
# expect: Tests: 460 passed, 460 total

# Jest (full — node + UI)
npx jest --config jest.config.cjs --passWithNoTests
# expect: Tests: 464 passed, 464 total

# MusicContext producer harness
npx jest --config jest.config.cjs tests/musicContext.test.ts
# expect: Tests: 111 passed, 111 total

# Composer smoke (full tier)
cd ../..
npm run test:composer-smoke
# expect: Passed: 489 rows (94 suites), Failed: 0

# Martino pytest
py -m pytest martino/tests/ -q
# expect: 76 passed

# Desktop dist (release closeout only — not mid-feature)
cd apps/composer-os-desktop
npm run dist
npm run desktop:install-icon
```
