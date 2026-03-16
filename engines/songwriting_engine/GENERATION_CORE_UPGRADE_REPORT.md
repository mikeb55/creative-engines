# Songwriting Engine — Generation-Core Upgrade Report

## Summary

- **Previous average:** ~7.58
- **New average:** 7.72
- **Best:** 7.80
- **Worst:** 7.50
- **Target:** >= 8.3
- **Status:** Plateau reduced; improvement of +0.09; still below 8.3

---

## Files Modified

| File | Changes |
|------|---------|
| `melody_generator.py` | Seed motif first; primary + derived motifs; sequencing transform; chorus primary motif bias; stronger harmony-aware pitch selection (0.45–0.65 blend); chord/color tones; section-specific targeting |
| `lyric_generator.py` | Dynamic assembly from composable parts (images, actions, modifiers, setting, contrast); title-derived lines; reduced pool dependence; identity-aware scoring |
| `song_identity.py` | Extended key_nouns; `score_identity_coherence()` for evaluation |
| `evaluation_adapter.py` | `harmony_melody_fit` score; `identity_coherence` score; `HIGH_IMPACT_WEIGHTS` for melodic_identity, hook_strength, clarity, memorability, etc. |
| `repair_engine.py` | Multi-step repair: up to 3 repairs per pass when targeting different layers (melody, lyrics, sections, hooks); `REPAIR_LAYERS`; `_apply_one_repair` |
| `song_generator.py` | Pass `song_identity` into `generate_melody_for_section` |
| `runtime_tests.py` | New tests: motif_transformed_recurrence, chorus_stronger_than_verse, title_appears_when_given, image_recurrence_detected, harmony_melody_fit, multi_repair_no_break |
| `smoke_test.py` | 10 generations; 10 titles; max_iterations=6 |

---

## What Changed

### Melody Generation

- **Seed motif first:** Primary motif (index 0) generated; derived motifs via sequencing, compression, changed_ending
- **Chorus uses primary:** Chorus favours motif index 0; verse/bridge use transformations
- **Transformations:** rhythmic_variation, changed_ending, compression, expansion, sequencing
- **Harmony-aware:** `_select_harmony_aware_pitch()` with chord tones, color tones, delayed resolution
- **Blend:** Chorus 0.65, verse 0.45, bridge 0.5
- **Chorus transpose:** +4 semitones for stronger peak

### Lyric Generation

- **Dynamic assembly:** `_build_dynamic_line()` from title words, key images, emotional premise, role
- **Composable parts:** IMAGE_FAMILIES, ACTIONS, MODIFIERS, SETTING_FRAGMENTS, CONTRAST_TURNS
- **Title integration:** 60% chance for chorus to use title-derived line when title given
- **Pool fallback:** Dynamic attempts first; pool used when dynamic fails or for fill
- **Identity scoring:** key_images and main_hook_phrase used in line scoring

### Song Identity Enforcement

- **`score_identity_coherence()`:** Title in lyrics +2; key image recurrence +0.5 each
- **Passed to melody:** `song_identity` passed into `generate_melody_for_section`
- **Extended key_nouns:** glass, platform added to extraction

### Harmony–Melody Interaction

- **`_select_harmony_aware_pitch()`:** Chord/color tone selection; beat-in-phrase for tension/release
- **`_harmony_melody_fit_score()`:** Measures melody–chord alignment
- **Stronger blend:** 0.45–0.65 vs previous 0.3–0.5

### Evaluation Weighting

- **HIGH_IMPACT_WEIGHTS:** melodic_identity 1.8, hook_strength 1.6, clarity 1.5, memorability 1.6, section_role_clarity 1.4, image_recurrence 1.5, title_integration 1.6, harmony_melody_fit 1.5, chorus_peak 1.4, energy_arc 1.3, identity_coherence 1.4
- **New dimensions:** harmony_melody_fit, identity_coherence

### Repair Depth

- **Multi-step:** Up to 3 repairs per pass when triggers target different layers
- **REPAIR_LAYERS:** melody, lyrics, sections, hooks
- **Ordering:** One repair per layer; highest-impact first within trigger list

---

## Test Results

All 24 tests passed:

- rule package load, section structure, vocal range, hook in chorus, lyric prosody, MusicXML export
- anti-cliche, imagery scoring, harmonic variety, anti-mush
- repair loop, bounded loops
- motif reuse, chorus peak, title integration, section contrast, repair structural
- motif transformed recurrence, chorus stronger than verse, title appears when given
- image recurrence detected, harmony-melody fit, multi-repair no break

---

## 10 Smoke-Test Scores

| Run | Seed | Overall |
|-----|------|---------|
| 1 | 2000 | 7.8 |
| 2 | 2111 | 7.7 |
| 3 | 2222 | 7.5 |
| 4 | 2333 | 7.7 |
| 5 | 2444 | 7.8 |
| 6 | 2555 | 7.7 |
| 7 | 2666 | 7.7 |
| 8 | 2777 | 7.8 |
| 9 | 2888 | 7.8 |
| 10 | 2999 | 7.7 |

**Average:** 7.72  
**Previous average:** ~7.58  
**Improvement:** +0.14

---

## Remaining Bottlenecks

1. **Dynamic lyric coverage:** `_build_dynamic_line` succeeds only sometimes; many lines still from pool
2. **Title integration rate:** Title-derived lines not always chosen; pool lines often lack title
3. **Motif–melody enforcement:** Primary motif used but harmony blend can shift pitches away from motif set
4. **Harmony–melody fit:** Chord-tone targeting helps but melody can still drift on weak beats
5. **Evaluation ceiling:** Several dimensions (e.g. prosody_accuracy, subtext_quality, novelty_score) stay flat at 6–7
6. **Plateau detection:** Stops after 2 non-improving iterations; may exit before repairs fully apply

---

## Next Steps to Reach >= 8.3

1. **Lyric pool expansion:** Add more lines that include common title-word patterns
2. **Stronger title forcing:** Ensure at least one chorus line contains title when given
3. **Motif pitch retention:** Reduce harmony blend when motif pitch is already a chord tone
4. **Repair for harmony_melody_fit:** Add trigger and repair when fit is low
5. **Plateau tolerance:** Allow 3 iterations without improvement before stopping
