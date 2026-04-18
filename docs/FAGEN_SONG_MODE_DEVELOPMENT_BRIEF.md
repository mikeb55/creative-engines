# Song Mode — Fagen path & evaluation (developer brief)

Canonical context for continuing **Song Mode / Donald Fagen** work (and later styles / other songwriters) on Composer OS v2: engine behaviour, receipts, diagnostics, and the batch eval harness.

---

## High-level context

**Project goal:** Song Mode should produce **audible, describable** differences when you pick different songwriters and styles. Changes must be:

- Musically honest and recognisable to musicians.
- Explainable via receipts and metadata (“what changed and why”).
- **A/B-checkable** with same seed + chords.
- **Non-imitative:** no “sounds like X” claims — only rule / behaviour descriptions.

**Fagen** is the flagship primary songwriter path:

- First target for deeper behaviour + receipts.
- First target for system-wide comping and diagnostics.
- Pattern to reuse for styles (e.g. Sophisticated Pop) and other writers (e.g. Bacharach).

**Song Mode wiring already in place:** `primarySongwriter`, `secondarySongwriter`, style profile, era, lyric author, arranger, Song Mode surface notes in manifests / receipts.

**Wyble / Tonality Vault** remain architecturally important but are **out of scope** for “visible progress”; Song Mode behaviour + receipts come first.

---

## Fagen — current engine behaviour

**Basics:**

- Keys-centric comping slice (**Fagen keys-comp v1.5**) instead of guitar/bass duo.
- Engine emphasises: early-phrase syncopation (C1 slice), keyboard comp (not guitar duo), mu/add2 / tension-rich colour where allowed, smoother inner-voice motion, section-aware behaviour (A/B/returns), **at most one signature harmonic moment**.

**Form-relative logic:**

- No hard-coded bar numbers; use `totalBars` (default 32) and structural helpers.
- Key helpers include: `fagenQuarterBarSpan`, `fagenFormSegmentEnds`, `fagenStructuralBarIndices`, `fagenSectionKind(barIndex, totalBars)` (classifies bars as A, B, return, etc.).

**Comp rhythm (Fagen-only):**

- `applyFagenCompRhythmTimingNudge` — shortens square whole-bar pads; nudges timing toward beats 2/4; boosts reply-shaped accents when first half of bar is sparse.
- `applyFagenRhythmFingerprintVelocities` — stronger anticipations / stabs / offbeats; uses structural markers like `firstBarB` / `firstBarReturn` (not literal bar 9/17).

**Inner voices & voicing grammar:**

- `applyFagenInnerVoiceMotionV2` — semitone/whole-step motion in inner voices across adjacent bars; flags/fixes static voicing streaks ≥2 bars where legal.
- `applyFagenVoicingStackDiversify` — breaks >2 consecutive identical chord-tone fingerprints.
- `fagenCompanionMidiForSparseRhDyad` — tension tones and spacing variety within MIDI clamps.

**Section contrast & density:**

- `maxNotesFagenKeysCompBar` — cooler A (lower notes-per-bar cap), hotter B (+1 bump).

**Return evolution:**

- `applyFagenReturnPhraseGestures` — firstBarReturn / mid-return thinning/colour; writes `variationSummary` for diagnostics.

**Signature harmonic moment:**

- `applyFagenSignatureHarmonicMoment` — at most one pivot from `{ bEnd, bEnd+1, totalBars }`; side-slip / chromatic move only when an extended approach pitch-class fits; skipped if harmony is locked (`customHarmonyLocked`).

**Phrase-level tension:**

- `applyFagenPhraseTensionSculpt` — when a 4-bar phrase is uniformly dense, softens the phrase-ending bar.

**Melody-aware comp:**

- `applyFagenMelodyPeakCompDucking` — ducks comp near melodic peaks / strong velocity attacks; accompaniment-only (does not rewrite melody).

---

## Fagen diagnostics & receipts

**Diagnostics (Fagen-only, in metadata):**

`fagenKeysCompMusicalDiagnostics` includes fields such as:

- `syncopationIndexBySection`, `voicingDensityBySection`
- `openingVsReturnRhMeanDelta`, `returnVariationSummary`
- `signatureMoment`
- `phraseTensionMeanDensityByPhrase`
- (plus other per-section / per-phrase summaries as defined in code)

`compositionContext` metadata types reflect these.

**Receipts:**

`songModeStyleSurfaceNotes` includes Fagen slice lines describing keys-led syncopated comp, inner-voice movement, compact tension-rich voicings, section lift / return variation, and a hint pointing at `generationMetadata.fagenKeysCompMusicalDiagnostics`.

Receipts must be **concrete**, avoid imitation claims (“Not an imitation of any artist.”), and appear in runManifest, `_meta` JSON, and Composer UI **Song Mode generation notes**.

See also: [generation-receipts-and-diagnostics.md](generation-receipts-and-diagnostics.md).

---

## Evaluation harness

**Success semantics per run:**

| Field | Meaning |
|--------|--------|
| `success` | MusicXML exists (`artifactOk`). |
| `engineDeclaredSuccess` | Engine `GenerateResult.success`. |
| `manifestBehaviourGates` | Parsed from manifest when present. |

Rows with an artefact but failed gates **still contribute** to `n`, aggregates, scores, and pass rates.

**Report:** Separates artefact failures vs soft failures (`success && !engineDeclaredSuccess`). Aggregates are labelled **rows with MusicXML artefact**. Neutral comparison shows behaviour gates; prose explains Fagen-only diagnostics.

**CLI:** `EVAL_CLI_FLAGS` + `getEvalArgvTail()` — parse only tokens after the first recognised eval flag (robust under `ts-node` argv noise).

**`--out`:** Relative `--out` resolves via repo root (`REPO_ROOT`), so outputs land under `creative-engines/output/...` even when npm runs with `--prefix engines/composer-os-v2`.

**Root npm script:** In repo root `package.json`:

```json
"eval:fagen": "npm --prefix engines/composer-os-v2 run eval:fagen --"
```

**Usage (always `--` before flags):**

```bash
npm run eval:fagen -- --count 5 --seed-start 95100 --baseline neutral --out output/fagen-eval
```

**Harness tests:** `engines/composer-os-v2/tests/fagenSongModeEvalHarness.test.ts`.

**Outputs** (under `output/fagen-eval/`): `fagen-songmode-eval.csv`, `fagen-songmode-eval-report.md`, `runs/*.musicxml`, `runs/_meta/*.manifest.json` (typically gitignored).

**Baseline modes:**

- **Mode A — Fagen vs neutral:** `--baseline neutral` → `donald_fagen` vs `carole_king`, same seeds/settings.
- **Mode B — Fagen vs previous build:** No automatic git checkout. Set `COMPOSER_OS_EVAL_BASELINE_MANIFEST_DIR` or `--baseline-manifest-dir` to a folder of copied baseline `_meta/*.manifest.json`; match by `seed`.

---

## Next development pattern (each new slice)

1. Define a narrow behavioural change (rules) for a songwriter or style: comp texture, voicing, section contrast, motif/phrase behaviour, receipts.
2. Implement **engine-only**, no song-specific bar numbers, deterministic from seed.
3. Add diagnostics (numeric metadata + one or two receipt lines).
4. Extend eval harness/tests as needed (`buildRowFromManifest`, deltas, pass/fail).
5. Run `npm run eval:fagen …` (and similar eval tasks when added for other writers/styles).
6. Decide keep/drop by listening, diagnostics, and report.

---

## See also

- [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md) — product snapshot
- [CHANGELOG.md](CHANGELOG.md) — shipped changes
- `engines/composer-os-v2/scripts/runFagenSongModeEval.ts` — eval CLI
- `engines/composer-os-v2/scripts/eval/fagenSongModeEvalCore.ts` — parsing + metrics
