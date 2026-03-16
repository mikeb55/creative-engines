# Style DNA Analyzer

Learns and scores the distinguishing fingerprints of composer engines to improve evaluator discrimination.

## What Style DNA Means

Each engine (wayne_shorter, barry_harris, andrew_hill, monk) produces compositions with characteristic structural patterns:

- **Barry Harris**: Stepwise motion, enclosure, 6th-diminished harmony
- **Andrew Hill**: Wide intervals, cluster tendency, irregular phrases
- **Monk**: Leaps, repeated cells, abrupt punctuation
- **Wayne Shorter**: Ambiguous harmony, asymmetrical form, interval color

Style DNA extracts compact numeric fingerprints from these patterns and builds a **StyleProfile** per engine. Compositions are then scored by how well they match their engine's profile.

## How Profiles Are Built

1. Generate `sample_count` compositions from the engine (default 12)
2. Extract six fingerprints per composition:
   - **interval_fingerprint**: step vs leap ratio, mean interval size, characteristic intervals
   - **harmonic_fingerprint**: chord types, root movement, dim/m7/maj7 ratios
   - **motif_fingerprint**: cell reuse, variation, motif ref density
   - **form_fingerprint**: phrase spread, odd phrase ratio, section roles
   - **rhythm_fingerprint**: duration variety, offbeat ratio, density
   - **asymmetry_fingerprint**: phrase irregularity, odd ratio, symmetry penalty
3. Average fingerprints across samples → one StyleProfile per engine

Profiles are deterministic (fixed seed) and cached for reuse.

## Integration with Evaluator and Population Composer

- **evaluate_composition(compiled, engine_name=None)**: If `engine_name` is provided, computes base evaluator score, style fit score, and returns a style-adjusted total_score.
- **rank_compositions(compositions, engine_name=None)**: Uses style-adjusted scoring when engine_name is provided.
- **Population composer**: Can pass engine_name when evaluating candidates to favor compositions that fit their engine's style.

## Why This Improves Hybrid and Population Search

Without style DNA, the evaluator often assigns similar scores to different engines (e.g. barry_harris, andrew_hill, monk all at 6.519). Style-adjusted scoring:

1. **Distinguishes engines** — Compositions that match their engine's fingerprint score higher.
2. **Improves hybrid search** — When combining engines, style fit helps select outputs that preserve each engine's identity.
3. **Improves population search** — Evolution favors candidates that both score well and stay true to the engine's style.
