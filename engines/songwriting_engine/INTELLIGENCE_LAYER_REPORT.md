# Songwriting Engine — Musical Intelligence Layer Report

## Summary

- **Previous baseline:** ~7.58
- **New average:** 7.70
- **Best:** 7.80
- **Worst:** 7.50
- **Improvement:** +0.12
- **Status:** Intelligence layer integrated; modest improvement; plateau persists below 8.3

---

## New Modules Created

| Module | Purpose |
|--------|---------|
| `songwriting_patterns.py` | Curated pattern corpus: progressions, hook rhythms, melodic contours, image families |
| `songwriting_intelligence.py` | Reusable musical knowledge: choose_progression_by_section, choose_motif_shape, choose_hook_rhythm, choose_image_family, choose_phrase_contour, choose_melodic_peak_location |

---

## Files Modified

| File | Changes |
|------|---------|
| `melody_generator.py` | Uses choose_phrase_contour, choose_motif_shape, choose_melodic_peak_location, choose_progression_by_section; added fall_then_leap contour |
| `lyric_generator.py` | Uses choose_image_family for theme-driven imagery; main_image_family from identity |
| `hook_generator.py` | Uses choose_hook_rhythm; added _hook_repetition_test, _hook_rhythmic_identity_test, _hook_melodic_peak_test |
| `song_identity.py` | Added core_interval_pattern, main_image_family; extended key_nouns |
| `runtime_tests.py` | Added 5 tests: progression_by_section, motif_reuse_across_sections, hook_rhythm_template, image_family_integration, melodic_contour_adherence |
| `smoke_test.py` | 15 generations; 15 titles |

---

## Intelligence Patterns Added

### PROGRESSION_LIBRARY
- **Verse:** I–V–vi–IV, vi–IV–I–V, I–vi–IV–V, ii–V–I–IV, I–IV–V–I, vi–IV–V–I
- **Chorus:** IV–I–V–vi, I–V–IV–I, I–V–vi–IV, I–IV–V–I, IV–V–I–vi
- **Bridge:** ii–V–vi–IV, IV–V–I–IV, vi–IV–I–V, ii–V–I–I
- **Prechorus:** IV–V–I–V, ii–V–I–IV, vi–IV–V–V

### HOOK_RHYTHMS
- long_short_short, repeat_repeat_leap, pickup_sustained_peak, syncopated_repeat, short_short_long, repeat_hold_resolve

### MELODIC_CONTOURS
- **Verse:** rise, arch, narrow_gradual, fall
- **Chorus:** arch, rise_hold_fall, repeated_peak, repeat_then_leap
- **Bridge:** fall, fall_then_leap, repeat_then_leap, contrast_arch
- **Prechorus:** rise, arch, rise_hold_fall

### IMAGE_FAMILIES
- light_dark, road_journey, water_tide, sky_weather, fire_heat, time_memory, city_night
- Theme mapping: love → light_dark, road_journey, city_night; loss → water_tide, time_memory, light_dark; hope → sky_weather, light_dark, road_journey

---

## Motif Reuse Improvements

- **song_identity:** core_interval_pattern extracted from primary motif
- **main_image_family:** populated from lyrics; passed to lyric generation
- **Verse:** introduces motif; uses choose_motif_shape("verse")
- **Chorus:** strengthens primary motif; transform_bias favours "none", "repetition_changed_ending"
- **Bridge:** transforms via sequencing/compression; phrase_contour influences transform choice

---

## Lyric Imagery Improvements

- **choose_image_family(theme):** Returns theme-driven word list (e.g. love → light, dark, dawn, street, window)
- **images_to_use:** key_images or main_image_family or theme_words
- **Dynamic assembly:** Uses theme words when building lines

---

## Hook Strength Improvements

- **Compression test:** Rejects vague, cluttered, or weak hooks
- **Repetition test:** Requires at least 2 words
- **Rhythmic identity test:** Melody must have ≥4 events
- **Melodic peak test:** Chorus melody must have pitch range ≥2 semitones
- **choose_hook_rhythm:** Called during place_hooks_in_sections

---

## Test Results

All 29 tests passed:

- rule package load, section structure, vocal range, hook in chorus, lyric prosody, MusicXML export
- anti-cliche, imagery scoring, harmonic variety, anti-mush
- repair loop, bounded loops
- motif reuse, chorus peak, title integration, section contrast, repair structural
- motif transformed recurrence, chorus stronger than verse, title appears when given
- image recurrence detected, harmony-melody fit, multi-repair no break
- **progression by section**, **motif reuse across sections**, **hook rhythm template**, **image family integration**, **melodic contour adherence**

---

## Smoke-Test Score Distribution (15 runs)

| Run | Seed | Overall |
|-----|------|---------|
| 1 | 3000 | 7.7 |
| 2 | 3111 | 7.7 |
| 3 | 3222 | 7.7 |
| 4 | 3333 | 7.8 |
| 5 | 3444 | 7.8 |
| 6 | 3555 | 7.7 |
| 7 | 3666 | 7.8 |
| 8 | 3777 | 7.6 |
| 9 | 3888 | 7.7 |
| 10 | 3999 | 7.5 |
| 11 | 4110 | 7.7 |
| 12 | 4221 | 7.7 |
| 13 | 4332 | 7.7 |
| 14 | 4443 | 7.8 |
| 15 | 4554 | 7.6 |

**Average:** 7.70  
**Previous baseline:** ~7.58  
**Improvement:** +0.12

---

## Did the Intelligence Layer Improve the Engine?

**Yes, modestly.** The average score rose from ~7.58 to 7.70 (+0.12). The engine now:

1. **Uses curated progressions** instead of ad-hoc chord lists
2. **Applies theme-driven imagery** via choose_image_family
3. **Enforces stronger hook criteria** (compression, repetition, rhythmic identity, melodic peak)
4. **Tracks motif memory** (core_interval_pattern, main_image_family)
5. **Uses section-specific contours** for bridge transform bias

The plateau remains below 8.3. Further gains will likely require:
- Stronger title integration
- More varied dynamic lyric assembly
- Deeper harmony–melody integration
- Possibly external data or models for richer patterns
