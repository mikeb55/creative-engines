# Songwriting Engine — Deep Compositional Quality Upgrade Report

## Summary

- **Previous average:** ~7.6
- **New average (no title):** ~7.52
- **New average (with title):** ~7.58
- **Target:** >= 8.5
- **Status:** Plateau below 8.0; architecture in place for future gains

---

## Files Modified

| File | Changes |
|------|---------|
| `repair_engine.py` | Import song_identity; pass `song_identity` into lyric generation; add structural repairs: `weak_chorus_identity`, `weak_section_contrast`, `weak_verse_coherence` |
| `evaluation_adapter.py` | Add triggers for structural repair when `chorus_peak` < 6, `melodic_identity` < 5, `energy_arc` < 6, `image_recurrence` < 5 |
| `runtime_tests.py` | Add tests: motif_reuse, chorus_peak, title_integration, section_contrast, repair_structural |
| `songwriting_engine_runtime.py` | Extend repair_mapping for new triggers |
| `melody_generator.py` | Chorus transpose +3 semitones for stronger peak |
| `lyric_generator.py` | Add title-derived lines to pool when title given |

---

## What Improved

### Melody Generation (from prior work)
- Motif-first generation with contour types
- Leap-with-recovery, contour clarity, one peak per phrase
- Harmony-aware melody (chord-tone targeting)
- Section-specific contour bias (chorus vs verse vs bridge)
- Motif transformations: interval_expansion, compression, repetition_changed_ending
- **This update:** Chorus transpose +3 semitones for stronger peak vs verse

### Lyric Depth

- Song identity passed into lyric generation
- `score_with_identity` for image recurrence and title integration
- `key_images` and `main_hook_phrase` from identity used in scoring
- **This update:** Title-derived lines added to pool when title is given
- Repair paths now pass `song_identity` to preserve coherence

### Section Architecture

- Energy gradient by role (verse, prechorus, chorus, bridge)
- `ENERGY_BY_ROLE` defines ranges
- **This update:** `_repair_section_contrast` adjusts energy by role when contrast is weak

### Repair Logic

- `_repair_weak_hook` now uses `song_identity` for chorus
- `_repair_poor_prosody` and `_repair_lyric_cliche` pass `song_identity` to lyric generation
- `_repair_weak_chorus_identity` delegates to structural chorus strengthening
- `_repair_section_contrast` adjusts energy by section role
- `_repair_weak_verse_coherence` tightens image family via lyric rewrite

### Evaluation

- New metrics: `motif_identity`, `section_contrast`, `title_integration`, `image_recurrence`, `chorus_peak`
- Structural repair triggers added when these metrics are low

---

## Test Results

All basic tests pass:

- rule package load
- section structure
- vocal range
- hook in chorus
- lyric prosody
- MusicXML export
- anti-cliche
- imagery scoring
- harmonic variety
- anti-mush
- repair loop
- bounded loops
- motif reuse
- chorus peak
- title integration
- section contrast
- repair structural

---

## Smoke test scores

| Run | Seed | Overall |
|-----|------|---------|
| 1 | 1000 | 7.6 |
| 2 | 1111 | 7.5 |
| 3 | 1222 | 7.3 |
| 4 | 1333 | 7.8 |
| 5 | 1444 | 7.7 |

**Average:** 7.58 (with titles)  
**Previous average:** ~7.6
**Target:** >= 8.5

---

## Why Plateau Below 8.0

1. **Lyric pool:** Fixed pools; title-derived lines help but many titles still won’t appear in lyrics.
2. **Motif–melody link:** Pitch overlap is measured but not strongly enforced; generation can drift from motifs.
3. **Evaluation weights:** Many dimensions with equal weight; new dimensions don’t dominate the average.
4. **Repair limit:** One repair per iteration; plateau detection stops after 2 non-improving iterations.
5. **Harmony–melody:** Chord-tone blend is weak (0.3–0.5); melody could be more harmony-driven.
6. **Image recurrence:** `key_images` from `update_identity_after_section` are limited; lyric pool may not favor them.

---

## Remaining Bottlenecks

1. **Lyric pool:** Expand pool or add more dynamic title/image integration.
2. **Motif enforcement:** Strengthen motif–melody connection in generation.
3. **Evaluation weighting:** Prioritize high-impact dimensions (e.g. motif_identity, chorus_peak, title_integration).
4. **Repair depth:** Allow multiple structural repairs per iteration.
5. **Harmony–melody:** Increase chord-tone targeting and suspensions.
6. **Image recurrence:** Broader extraction of image families and stronger lyric scoring for image use.

---

## Architecture for GCE >= 9

- Song identity layer tracks hook, motif, images, emotional premise
- Structural repair triggers and handlers in place
- Evaluation metrics for motif, section contrast, title, images, chorus peak
- Melody generator supports chorus peak, harmony-aware targeting, and transformations

Next steps to reach >= 9: stronger lyric pool, motif enforcement, evaluation weighting, and deeper harmony–melody integration.
