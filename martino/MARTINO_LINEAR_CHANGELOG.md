# Martino Linear Expressions — Post-V78 Changelog

## v1.1 (V79–V85)

### V79 — Presets + Genre Profiles
- Beatrice and Orbit preset buttons fully wired (tuneName, chords, choruses, activities, tension)
- Genre activity profiles added: Standard, Ballad, Blues, Modal

### V80 — Explain Mode
- Bar-by-bar reasoning panel in MartinoResultPanel
- Provenance sidecar path fixed (_PROVENANCE_DIR aligned with generator write path)
- Stale closure fix — martino state added to generate useCallback deps array

### V81 — Multi-Chorus Variation + Refinement Fix
- DCR variant seed varies per chorus via chorus_index parameter
- plan_all_phrase_activities called per chorus in master_loader.py
- dcr_refinement_applied now aggregates across all phrase runs (any + count + total)

### V82 — A6–A8 Master Templates
- A6: Enclosure Cell — chromatic approach from above and below minor centre
- A7: Long Span — wide ascending line spanning an octave over 2 bars
- A8: Rhythmic Displacement — syncopated variant of A1
- All three registered in ACTIVITY_ALIASES in master_loader.py

### V83 — Slonimsky + ECM Chamber Crossover
- _slonimsky_colour_hint and _ecm_tension_hint helpers in generator.py
- slonimsky_macro and ecm_mode wired from UI into martinoConfig payload
- Bridge emits slonimskyHint and ecmMode in ok response

### V84 — Barry Harris Crossover
- _barry_harris_hints helper in generator.py
- barry_harris and barry_harris_profile wired from UI into martinoConfig
- Bridge emits barryHarrisHints in ok response

### V85 — GCE Rebalance + Close-Out
- GCE weights rebalanced: lfv_integrity 0.12→0.08, interval_dna_continuity 0.10→0.08
  spatial_continuity 0.10→0.13, inversion_coherence 0.10→0.12, reduction_integrity 0.14→0.15
- Beatrice post-rebalance: 8.6/10, 76 tests passing

## Stable baseline
- v1.0.47-martino-stable (77311796) — V78, overall 0.900, 76 tests
- Test suite: martino/tests/ — 76 tests across 9 files
