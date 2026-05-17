/**
 * Export-truth consolidation audit (read-only documentation — no runtime exports).
 * Pre-consolidation call-site map as of assertExportTruth introduction.
 *
 * ─── VALIDATORS ─────────────────────────────────────────────────────────────
 *
 * 1. assertHarmonySpineMatchesScore (harmonySpineProvider.ts)
 *    Compares clean_electric_guitar measure.chord vs resolveBarSymbol(context, bar).
 *    Active only when harmonyMode is custom | custom_locked and wire length matches song-form.
 *    Throw: HARMONY_SPINE_LOCK [layer]: bar N guitar chord "X" !== spine "Y"
 *
 * 2. assertLockedHarmonyScoreAndXmlMatchBars (validateLockedHarmonyMusicXml.ts)
 *    Score guitar chords + optional in-memory XML vs expectedBars (effective, not raw paste).
 *    Throw: SONG MODE HARMONY LOCK: … / wraps validateLockedHarmonyMusicXmlTruth errors
 *
 * 3. validateLockedHarmonyMusicXmlTruth / FromFile
 *    First-part <harmony> per bar vs expectedBars.
 *    Throw (via caller): CUSTOM HARMONY TRUTH FAILURE: bar N …
 *
 * 4. runPipelineTruthGates (score-integrity/pipelineTruthGates.ts)
 *    Duo 8-bar builtin/custom or 32-bar custom_locked: input → score → XML harmony agreement.
 *    Returns PipelineTruthReport (errors array; does not throw by itself).
 *
 * 5. resolveEffectiveHarmonyTruth (customLockedHarmonyRouting.ts)
 *    Picks slice *EffectiveHarmonyBars or frank_zappa harmonyContext over raw lockedHarmonyBarsRaw.
 *    Not a validator — feeds expected bar arrays for (2)(3)(4).
 *
 * 6. assertScoreMatchesLockedHarmonyWire (customLockedHarmonyRouting.ts)
 *    Pre-export wire: score guitar vs effective wire. Not folded into assertExportTruth (runs before export).
 *
 * ─── CALL SITES (pre-consolidation) ─────────────────────────────────────────
 *
 * runGoldenPath.ts
 *   - assertScoreMatchesLockedHarmonyWire — after score build (pre-export)
 *   - assertHarmonySpineMatchesScore — after score build (pre-export)
 *   - exportScoreModelToMusicXml({ assertLockedHarmonyBars }) — inline export-time LOCK
 *   - validateLockedHarmonyMusicXmlTruth — post-export in-memory XML
 *   - runPipelineTruthGates — post-export; errors → readiness manifest
 *
 * composerOsAppGeneration.ts
 *   - assertLockedHarmonyScoreAndXmlMatchBars — Song Mode custom_locked before disk write
 *   - validateLockedHarmonyMusicXmlTruthFromFile — post disk write (end-to-end)
 *   - resolveEffectiveHarmonyTruth — builds harmonyBarsForLockedAssertions / barsForDiskHarmonyTruth
 *
 * generateComposition.ts
 *   - validateLockedHarmonyMusicXmlTruthFromFile — post write when customHarmonyLocked (raw locked bars)
 *
 * Tests (intentionally direct — not routed through assertExportTruth):
 *   - harmonySpineLock.smoke.test.ts — assertHarmonySpineMatchesScore mismatch harness
 *   - chordProgression.test.ts — validateLockedHarmonyMusicXmlTruth on golden path XML
 *   - songModeMusicXml.test.ts — disk truth FromFile
 *   - pipelineTruth.test.ts — pipelineTruthAllPassed on runGoldenPath result
 *
 * ─── SLICE / EFFECTIVE-BAR COVERAGE ─────────────────────────────────────────
 *
 * Per-songwriter *EffectiveHarmonyBars are registered in EFFECTIVE_HARMONY_TRUTH_REGISTRY
 * (customLockedHarmonyRouting.ts). pipelineTruthGates 32-bar path duplicates a long
 * songwriterStyleId switch for expected bars (must stay aligned with resolveEffectiveHarmonyTruth).
 *
 * Slices do NOT call validators directly — they populate generationMetadata effective arrays;
 * golden path / app generation resolve truth then run validators.
 *
 * ─── SPINE LOCK vs XML LOCK — DISAGREEMENT SURFACES ─────────────────────────
 *
 * | Surface | Spine LOCK | XML LOCK |
 * |---------|------------|----------|
 * | Compares | getChordForBar spine vs score.chord | score + first-part <harmony> vs effectiveBars |
 * | Slice rewrite | Spine follows getChordForBar (slice-aware) | Uses effectiveBars (slice arrays) |
 * | custom unlocked | No-op | No-op |
 * | Edge: score matches spine but export omits harmony | Spine pass | XML fail |
 * | Edge: export uses preserveChordKindLiterals display | May still pass equivalence | normalize in truth |
 * | Edge: effectiveBars undefined on locked run | Spine may still run | Old paths used raw locked — ambiguous |
 *
 * assertExportTruth requires effectiveBars when lockedBars present to fail fast before dual semantics.
 *
 * ─── PATHS THAT SKIPPED BOTH LOCKS (pre-consolidation) ─────────────────────
 *
 * - Builtin duo / ECM / ensemble exports without custom_locked (spine no-op; no locked XML truth)
 * - isIndieTuningFixture — pipeline truth skip; locked truth skip
 * - sectionRegenerationPartialScore — app Song Mode lock block skipped
 * - generateComposition disk check when customHarmonyLocked false
 * - Big Band / String Quartet runEnsembleExportPipeline — no harmony LOCK stack
 * - Export failure (no xml) — validateLockedHarmonyMusicXmlTruth skipped; pipeline truth still ran
 *
 * ─── POST-CONSOLIDATION WIRING ──────────────────────────────────────────────
 *
 * assertExportTruth.ts — single entry (spine → score/XML → duo pipeline → XML truth).
 * runGoldenPath / composerOsAppGeneration — full in-memory context.
 * Disk-only re-read — TODO comments where only FromFile runs after fs.writeFileSync.
 */

export {};
