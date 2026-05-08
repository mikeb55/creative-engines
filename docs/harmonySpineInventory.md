# Harmony spine inventory — truth chain (read-only snapshot)

Maps how Composer OS resolves **one chord symbol per bar** from planning through export and evaluation. Canonical runtime commentary lives in `engines/composer-os-v2/core/harmony/harmonyResolution.ts` header.

---

## 1. End-to-end chain (Song Mode / duo golden path)

```
parsed request / builtin plan
    → CompositionContext (lockedHarmonyBarsRaw, chordSymbolPlan, generationMetadata)
    → slice precompute*EffectiveHarmonyBars (when songwriter slice applies)
    → attachHarmonyContext where applicable (Frank Zappa)
    → getChordForBar(bar, context)
          = resolveChordSymbolAuthoritativeForBar
          + applyVoiceBundleHarmonicRhythm
          + optional applyHarmonicSceneChordBias
    → generateGoldenPathDuoScore (and related) sets measure.chord on parts
    → runGoldenPath: assertScoreMatchesLockedHarmonyWire (custom / custom_locked)
    → musicxmlExporter reads measure.chord (and harmony elements as implemented)
    → Output manifest / disk (`writeOutputManifest`) echoes generationMetadata harmony arrays
    → GCE: chords extracted from ScoreModel measures (`chordsPerBarFromScore` in `gceGate.ts`)
```

**Prep gates (fail fast):** `assertCustomLockedRouting`, `assertCustomLockedBeforeScoreGeneration` (`customLockedHarmonyRouting.ts`), invoked from `runGoldenPath.ts` at parse / pre-score boundaries.

---

## 2. Single owner per bar (runtime)

There is **no** single function name for every songwriter path. Resolution is **ordered**:

| Priority | Source | When |
|----------|--------|------|
| 1 | **`context.harmonyContext.bars`** | Present, length = totalBars (Frank Zappa canonical timeline built in slice). Checked **first** inside `resolveChordSymbolAuthoritativeForBar`. |
| 2 | **`*EffectiveHarmonyBars` on `generationMetadata`** | Matching `songwriterStyleId` / style profile gate + array length = totalBars — see §3. Written by each slice’s `precompute*` function. |
| 3 | **`lockedHarmonyBarsRaw`** | Full-form length = totalBars (paste / locked progression). |
| 4 | **`parsedCustomProgressionBars`** | When `harmonySource === 'custom'` and snapshot matches form length. |
| 5 | **`chordSymbolPlan.segments`** | Builtin tiled harmony — covers contiguous bars 1…N. |

Then **`getChordForBar`** wraps that symbol with **harmonic rhythm** (`applyVoiceBundleHarmonicRhythm`) and optionally **harmonic scene bias** (`applyHarmonicSceneChordBias`).

**Score vs resolver:** Post-pass **`resolveChordForDuoPostPass`** compares an existing measure chord to **`getChordForBar`** and throws on mismatch.

---

## 3. Slices that write harmony metadata

Each row: **`songwriterStyleId` (primary)** → **`GenerationMetadata` key** → **`precompute*` implementation file**.

| Style id | Metadata key | Writer function |
|----------|----------------|-----------------|
| `brian_wilson` | `brianWilsonEffectiveHarmonyBars` | `precomputeBrianWilsonEffectiveHarmonyBars` — `core/song-mode/brianWilsonPetSoundsSlice.ts` |
| `stevie_wonder` | `stevieWonderEffectiveHarmonyBars` | `precomputeStevieWonderEffectiveHarmonyBars` — `stevieWonderSlice.ts` |
| `radiohead` | `radioheadEffectiveHarmonyBars` | `precomputeRadioheadEffectiveHarmonyBars` — `radioheadSlice.ts` |
| `james_brown` | `jamesBrownEffectiveHarmonyBars` | `precomputeJamesBrownEffectiveHarmonyBars` — `jamesBrownSlice.ts` |
| `joni_mitchell` (+ STYLE gate) | `joniMitchellEffectiveHarmonyBars` | `precomputeJoniMitchellEffectiveHarmonyBars` — `joniMitchellSlice.ts` |
| `sonic_youth` (+ STYLE gate) | `sonicYouthEffectiveHarmonyBars` | `precomputeSonicYouthEffectiveHarmonyBars` — `sonicYouthSlice.ts` |
| `pat_metheny` (+ STYLE gate) | `patMethenyEffectiveHarmonyBars` | `precomputePatMethenyEffectiveHarmonyBars` — `patMethenySlice.ts` |
| `wayne_shorter` | `wayneShorterEffectiveHarmonyBars` | `precomputeWayneShorterEffectiveHarmonyBars` — `wayneShorterSlice.ts` |
| `barry_harris` | `barryHarrisEffectiveHarmonyBars` | `precomputeBarryHarrisEffectiveHarmonyBars` — `barryHarrisSlice.ts` |
| `bill_evans` | `billEvansEffectiveHarmonyBars` | `precomputeBillEvansEffectiveHarmonyBars` — `billEvansSlice.ts` |
| `debussy` | `debussyEffectiveHarmonyBars` | `precomputeDebussyEffectiveHarmonyBars` — `debussySlice.ts` |
| `duke_ellington` | `dukeEllingtonEffectiveHarmonyBars` | `precomputeDukeEllingtonEffectiveHarmonyBars` — `dukeEllingtonSlice.ts` |
| `miles_davis` | `milesDavisEffectiveHarmonyBars` | `precomputeMilesDavisEffectiveHarmonyBars` — `milesDavisSlice.ts` |
| `bartok` | `bartokEffectiveHarmonyBars` | `precomputeBartokEffectiveHarmonyBars` — `bartokSlice.ts` |
| `gershwin` | `gershwinEffectiveHarmonyBars` | `precomputeGershwinEffectiveHarmonyBars` — `gershwinSlice.ts` |
| `arvo_part` | `arvoPartEffectiveHarmonyBars` | `precomputeArvoPartEffectiveHarmonyBars` — `arvoPartSlice.ts` |
| `satie` | `satieEffectiveHarmonyBars` | `precomputeSatieEffectiveHarmonyBars` — `satieSlice.ts` |
| `prince` | `princeEffectiveHarmonyBars` | `precomputePrinceEffectiveHarmonyBars` — `princeSlice.ts` |
| `beatles` | `beatlesEffectiveHarmonyBars` | `precomputeBeatlesEffectiveHarmonyBars` — `beatlesSlice.ts` |
| `fela_kuti` | `felaKutiEffectiveHarmonyBars` | `precomputeFelaKutiEffectiveHarmonyBars` — `felaKutiSlice.ts` |
| `cole_porter` | `colePorterEffectiveHarmonyBars` | `precomputeColePorterEffectiveHarmonyBars` — `colePorterSlice.ts` |
| `maria_schneider` | `mariaSchneiderEffectiveHarmonyBars` | `precomputeMariaSchneiderEffectiveHarmonyBars` — `mariaSchneiderSlice.ts` |
| `bacharach` | `bacharachEffectiveHarmonyBars` | `precomputeBacharachEffectiveHarmonyBars` — `bacharachSlice.ts` |
| `donald_fagen` | `donaldFagenEffectiveHarmonyBars` | `precomputeDonaldFagenEffectiveHarmonyBars` — `donaldFagenSlice.ts` |
| `ecm_chamber` | `ecmChamberEffectiveHarmonyBars` | `precomputeEcmChamberEffectiveHarmonyBars` — `ecmChamberSlice.ts` |
| `antonio_carlos_jobim` | `jobimEffectiveHarmonyBars` | `precomputeJobimEffectiveHarmonyBars` — `jobimSlice.ts` |
| `herbie_hancock` | `herbieHancockEffectiveHarmonyBars` | `precomputeHerbieHancockEffectiveHarmonyBars` — `herbieHancockSlice.ts` |
| `stephen_sondheim` | `sondheimEffectiveHarmonyBars` | `precomputeSondheimEffectiveHarmonyBars` — `sondheimSlice.ts` |
| `kate_bush` | `kateBushEffectiveHarmonyBars` | `precomputeKateBushEffectiveHarmonyBars` — `kateBushSlice.ts` |
| `thelonious_monk` | `theloniousMonkEffectiveHarmonyBars` | `precomputeTheloniousMonkEffectiveHarmonyBars` — `theloniousMonkSlice.ts` |
| `andrew_hill` | `andrewHillEffectiveHarmonyBars` | `precomputeAndrewHillEffectiveHarmonyBars` — `andrewHillSlice.ts` |
| `charlie_parker` | `charlieParkerEffectiveHarmonyBars` | `precomputeCharlieParkerEffectiveHarmonyBars` — `charlieParkerSlice.ts` |
| `frank_zappa` | `frankZappaEffectiveHarmonyBars` **and** `context.harmonyContext` | `precomputeFrankZappaEffectiveHarmonyBars` / `attachFrankZappaHarmonyContext` — `frankZappaSlice.ts` (**resolver prefers `harmonyContext` first**) |

**Film soundtrack writers** (single module): `core/song-mode/filmSoundtrackHarmonySlices.ts`

| Style id | Metadata key | Writer function |
|----------|----------------|-----------------|
| `bernard_herrmann` | `bernardHerrmannEffectiveHarmonyBars` | `precomputeBernardHerrmannEffectiveHarmonyBars` |
| `john_williams` | `johnWilliamsEffectiveHarmonyBars` | `precomputeJohnWilliamsEffectiveHarmonyBars` |
| `ennio_morricone` | `ennioMorriconeEffectiveHarmonyBars` | `precomputeEnnioMorriconeEffectiveHarmonyBars` |
| `nino_rota` | `ninoRotaEffectiveHarmonyBars` | `precomputeNinoRotaEffectiveHarmonyBars` |
| `jerry_goldsmith` | `jerryGoldsmithEffectiveHarmonyBars` | `precomputeJerryGoldsmithEffectiveHarmonyBars` |
| `philip_glass` | `philipGlassEffectiveHarmonyBars` | `precomputePhilipGlassEffectiveHarmonyBars` |
| `hans_zimmer` | `hansZimmerEffectiveHarmonyBars` | `precomputeHansZimmerEffectiveHarmonyBars` |
| `angelo_badalamenti` | `angeloBadalamentiEffectiveHarmonyBars` | `precomputeAngeloBadalamentiEffectiveHarmonyBars` |

Golden-path re-exports under `core/goldenPath/*Slice.ts` point at these implementations.

**String quartet Zappa** (separate metadata): `zappaSQEffectiveHarmonyBars` via `precomputeZappaSQEffectiveHarmonyBars` — `core/string-quartet/zappaStringQuartetSlice.ts` (not the same as duo Song Mode spine).

---

## 4. Read sites (consumers of harmony truth)

| Consumer | Role |
|----------|------|
| **`getChordForBar` / `resolveChordForDuoPostPass`** | Authoritative symbol for generators and validators. |
| **`generateGoldenPathDuoScore.ts`** | Many bar loops call `getChordForBar`; slice-specific guitar/bass passes read harmony. |
| **Slice modules** | Internal passes use `getChordForBar` while building effective arrays (e.g. Sondheim, Sonic Youth). |
| **`songModePhraseEngineV1.ts`, `guitarVoicingEngine.ts`, `motifShape.ts`** | Melodic/harmonic alignment to bar chords. |
| **`customLockedHarmonyRouting.assertScoreMatchesLockedHarmonyWire`** | After score build: guitar `measure.chord` vs **expected wire** — uses slice effective arrays when present and lengths match, else **`harmonyContext.bars` for Zappa**, else **`frankZappaEffectiveHarmonyBars`**, else raw **`wire`**. **Note:** `prince` (and any style not in the ternary chain) falls through to **`wire`** — effective bars may exist in metadata but LOCK assertion compares paste unless extended. |
| **`composerOsAppGeneration.ts`** | Large parity block: locked-truth vs disk summary `*EffectiveHarmonyBars` for regression diagnostics. |
| **`writeOutputManifest.ts`** | Persists selected effective harmony arrays to manifest for debugging / receipts. |
| **`musicxmlExporter` path** | Uses built **ScoreModel** (`measure.chord`); must match resolver output used during generation. |
| **`gceGate.scoreResultForGce`** | **`chordsPerBarFromScore`** builds chord array from score measures — GCE does **not** call `getChordForBar` directly. |
| **`harmonyContext.ts`** | `assertGuitarScoreMatchesHarmonyContext` when immutable timeline is active (Zappa-style). |

---

## 5. Provenance labels (conceptual)

| Label | Meaning in this codebase |
|-------|---------------------------|
| **`builtin`** | **`chordSymbolPlan`** segments — engine-generated tiled progression; no paste. |
| **`locked`** | **`lockedHarmonyBarsRaw`** / **`parsedCustomProgressionBars`** — user or import supplied chart (`harmonySource === 'custom'`). Resolver uses these when slice-specific arrays are absent or before precompute completes. |
| **`slice`** | **`*EffectiveHarmonyBars`** after `precompute*` — songwriter devices layered on scaffold (often derived from locked or builtin input). |
| **`vault`** | **Tonality Vault / iReal / PDF** pipelines — **`ParsedChart`**, **`irealVaultPipeline`**, **`vaultChordRuleSet`**, **`generateReharmCandidates`**. Not the same entrypoint as `getChordForBar` in Song Mode; merge path is separate product surface. |

**Zappa:** **`HarmonyContext`** uses source **`frank_zappa_effective` \| `locked` \| `generated`** (`harmonyContext.ts`) — immutable snapshot for validators.

Environment: **`COMPOSER_OS_HARMONY_PROVENANCE=1`** logs provenance in **`resolveChordForDuoPostPass`**.

---

## 6. Known spine gaps (for future Phase B–E work)

- **`assertScoreMatchesLockedHarmonyWire`** uses a long style-specific ternary; writers outside the chain compare **`wire`**, not necessarily **`precompute` output** — verify **Prince** and any newer slices for LOCK parity.
- **Duplicate metadata field names** in type definitions should be audited periodically (`compositionContext.ts` lists `frankZappaEffectiveHarmonyBars` in multiple regions — confirm TypeScript merge behaviour).
- **Vault** progression truth does not automatically unify with Song Mode `getChordForBar` without explicit pipeline wiring.

---

*Generated for harmony spine Phase A inventory + Phase E test stub.*
