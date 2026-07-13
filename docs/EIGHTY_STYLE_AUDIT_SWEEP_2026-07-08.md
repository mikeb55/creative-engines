# 80-Style Audit — Stage 1 Static Sweep (2026-07-08)

## 1. Title and scope

**Stage 1 static sweep only.** Diagnostics and scoring from shared harmony/validation/UI seams. **No fixes.** No engine, test, style-module, config, or script changes.

### Seam files inspected

| Category | Path |
|---|---|
| Chord authority / harmony resolution | engines/composer-os-v2/core/harmony/harmonyResolution.ts |
| Harmony spine provider | engines/composer-os-v2/core/harmony/harmonySpineProvider.ts (SLICE_AUTHORITY_ROWS) |
| Export / locked truth registry | engines/composer-os-v2/core/goldenPath/customLockedHarmonyRouting.ts (EFFECTIVE_HARMONY_TRUTH_REGISTRY) |
| Pipeline truth (legacy duplicate) | engines/composer-os-v2/core/score-integrity/pipelineTruthGates.ts |
| Validators | behaviourGates.ts, duoMelodyIdentityV3.ts, duoLockQuality.ts, gce/gceAutoScorers.ts, gce/gceGate.ts |
| Overlay / post-pass | duoAbstractLineComposerTransforms.ts, generateGoldenPathDuoScore.ts |
| HarmonicVoice / UI transport | voiceRuleBundles.ts (isVerlaineHarmonicPath), attachVoiceRuleBundle.ts, forwardHarmonicVoiceField.ts, apps/.../slonimskyHarmonicVoices.ts, slonimskyAdvancedState.ts |

Context: docs/AUDIT_SEAM_EXTRACT_2026-07-07.md, docs/HARMONIC_VOICE_FORWARDING_DESIGN.md.

## 2. Method

| Marker | Points |
|---|---|
| Style-specific chord authority / spine branch | +3 |
| Style-specific validation relax / bypass | +3 |
| harmonicVoice / secondary harmonic layer support | +2 |
| Multiple harmony representations (eff bars + merged/locked) | +2 |
| UI/API transformation point | +2 |
| Overlay / rewrite / post-pass | +1 |

Tiers: 7+ Tier 1 · 4–6 Tier 2 · 0–3 Tier 3

Conservative assumptions: inventory from spine (77) + overlay-only (10) + Slonimsky HV-only ids (10); multi-truth only with registry row; harmonicVoice marker from Slonimsky confirmed roster (not AUTO_RESOLVE alone); validator-relax excludes GCE interval-target-only calibration.

## 3. Main table

| Style id | Score | Tier | Triggered markers | HarmonicVoice-aware pattern? | Evidence paths / symbols |
|---|---:|---|---|---|---|
| frank_zappa | 13 | Tier 1 | chord-branch, validator-relax, harmonicVoice, multi-truth, ui-api, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; duoAbstractLineComposerTransforms.ts; harmonyContext.ts; pipelineTruthGates.ts |
| allan_holdsworth | 12 | Tier 1 | chord-branch, validator-relax, harmonicVoice, multi-truth, ui-api | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| fripp | 12 | Tier 1 | chord-branch, validator-relax, harmonicVoice, multi-truth, ui-api | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| verlaine | 12 | Tier 1 | chord-branch, validator-relax, harmonicVoice, multi-truth, ui-api | partial | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| bill_evans | 10 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; duoAbstractLineComposerTransforms.ts |
| debussy | 10 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; attachVoiceRuleBundle AUTO_RESOLVE; duoAbstractLineComposerTransforms.ts |
| duke_ellington | 10 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; duoAbstractLineComposerTransforms.ts |
| herbie_hancock | 10 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; duoAbstractLineComposerTransforms.ts |
| john_coltrane | 10 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; duoAbstractLineComposerTransforms.ts |
| pat_metheny | 10 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api, overlay-pass | partial | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; duoAbstractLineComposerTransforms.ts |
| thelonious_monk | 10 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; duoAbstractLineComposerTransforms.ts |
| wayne_shorter | 10 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; duoAbstractLineComposerTransforms.ts |
| antonio_carlos_jobim | 9 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts; attachVoiceRuleBundle AUTO_RESOLVE |
| arvo_part | 9 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; attachVoiceRuleBundle AUTO_RESOLVE |
| ecm_chamber | 9 | Tier 1 | chord-branch, validator-relax, multi-truth, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts; duoAbstractLineComposerTransforms.ts |
| sonic_youth | 9 | Tier 1 | chord-branch, harmonicVoice, multi-truth, ui-api | partial | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| bernard_herrmann | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| claus_ogerman | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| don_sebesky | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| jack_white | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| jerry_goldsmith | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| john_barry | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| john_williams | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| johnny_mandel | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| marr | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| nino_rota | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| philip_glass | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| ralph_towner | 8 | Tier 1 | chord-branch, validator-relax, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; behaviourGates.ts; duoMelodyIdentityV3.ts; gceAutoScorers.ts |
| gershwin | 7 | Tier 1 | chord-branch, multi-truth, ui-api | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; attachVoiceRuleBundle AUTO_RESOLVE |
| joni_mitchell | 7 | Tier 1 | chord-branch, multi-truth, ui-api | partial | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| radiohead | 7 | Tier 1 | chord-branch, multi-truth, ui-api | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; attachVoiceRuleBundle AUTO_RESOLVE |
| satie | 7 | Tier 1 | chord-branch, multi-truth, ui-api | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; attachVoiceRuleBundle AUTO_RESOLVE |
| bacharach | 6 | Tier 2 | chord-branch, multi-truth, overlay-pass | hv_full (harmony/precompute; verified 2026-07-13) | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; duoAbstractLineComposerTransforms.ts; harmonicVoiceCapabilityRegistry.ts; isBacharachHarmonicPath |
| charles_mingus | 6 | Tier 2 | chord-branch, multi-truth, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; duoAbstractLineComposerTransforms.ts |
| count_basie | 6 | Tier 2 | chord-branch, multi-truth, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; duoAbstractLineComposerTransforms.ts |
| donald_fagen | 6 | Tier 2 | chord-branch, multi-truth, overlay-pass | hv_full (harmony/precompute; verified 2026-07-13) | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; duoAbstractLineComposerTransforms.ts; harmonicVoiceCapabilityRegistry.ts; isDonaldFagenHarmonicPath |
| fripp_king_crimson | 6 | Tier 2 | chord-branch, multi-truth, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; duoAbstractLineComposerTransforms.ts |
| james_brown | 6 | Tier 2 | chord-branch, multi-truth, overlay-pass | hv_full (harmony/precompute; verified 2026-07-13) | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; duoAbstractLineComposerTransforms.ts; harmonicVoiceCapabilityRegistry.ts; isJamesBrownHarmonicPath |
| maria_schneider | 6 | Tier 2 | chord-branch, multi-truth, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; duoAbstractLineComposerTransforms.ts |
| messiaen | 6 | Tier 2 | chord-branch, multi-truth, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; duoAbstractLineComposerTransforms.ts |
| thad_jones | 6 | Tier 2 | chord-branch, multi-truth, overlay-pass | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; duoAbstractLineComposerTransforms.ts |
| andrew_hill | 5 | Tier 2 | chord-branch, multi-truth | hv_full (harmony/precompute; verified 2026-07-13) | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; harmonicVoiceCapabilityRegistry.ts; isAndrewHillHarmonicPath |
| angelo_badalamenti | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| barry_harris | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| bartok | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| beatles | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| beefheart | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| berg | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| bill_holman | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| billy_strayhorn | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| bob_brookmeyer | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| brian_wilson | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| carla_bley | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| charlie_parker | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| clare_fischer | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| cole_porter | 5 | Tier 2 | chord-branch, multi-truth | hv_full (harmony/precompute; verified 2026-07-13) | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; harmonicVoiceCapabilityRegistry.ts; isColePorterHarmonicPath |
| eberhard_weber | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| ennio_morricone | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| fela_kuti | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| gil_evans | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| hans_zimmer | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| henry_threadgill | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| jan_garbarek | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| jim_hall | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| john_surman | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| kate_bush | 5 | Tier 2 | chord-branch, multi-truth | hv_full (harmony/precompute; verified 2026-07-13) | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts; harmonicVoiceCapabilityRegistry.ts; isKateBushHarmonicPath |
| kenny_wheeler | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| lalo_schifrin | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| mccoy_tyner | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| miles_davis | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| oliver_nelson | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| prince | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| quincy_jones | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| sammy_nestico | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| stephen_sondheim | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| steve_reich | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| stevie_wonder | 5 | Tier 2 | chord-branch, multi-truth | primary-only | harmonyResolution.ts; harmonySpineProvider.ts; customLockedHarmonyRouting.ts |
| david_gilmour | 4 | Tier 2 | harmonicVoice, ui-api | primary-only | slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| eddie_van_halen | 4 | Tier 2 | harmonicVoice, ui-api | primary-only | slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| hendrix | 4 | Tier 2 | harmonicVoice, ui-api | primary-only | slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| jamerson | 4 | Tier 2 | harmonicVoice, ui-api | primary-only | slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| joe_pass | 4 | Tier 2 | harmonicVoice, ui-api | primary-only | slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| larry_carlton | 4 | Tier 2 | harmonicVoice, ui-api | primary-only | slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| nile_rodgers | 4 | Tier 2 | harmonicVoice, ui-api | primary-only | slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| scott_henderson | 4 | Tier 2 | harmonicVoice, ui-api | primary-only | slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| wes_montgomery | 4 | Tier 2 | harmonicVoice, ui-api | primary-only | slonimskyHarmonicVoices.ts; attachVoiceRuleBundle.ts |
| beethoven_late | 3 | Tier 3 | ui-api, overlay-pass | primary-only | attachVoiceRuleBundle AUTO_RESOLVE; duoAbstractLineComposerTransforms.ts |
| crumb_black_angels | 3 | Tier 3 | ui-api, overlay-pass | primary-only | attachVoiceRuleBundle AUTO_RESOLVE; duoAbstractLineComposerTransforms.ts |
| dutilleux | 3 | Tier 3 | ui-api, overlay-pass | primary-only | attachVoiceRuleBundle AUTO_RESOLVE; duoAbstractLineComposerTransforms.ts |
| lachenmann | 3 | Tier 3 | ui-api, overlay-pass | primary-only | attachVoiceRuleBundle AUTO_RESOLVE; duoAbstractLineComposerTransforms.ts |
| ligeti | 3 | Tier 3 | ui-api, overlay-pass | primary-only | attachVoiceRuleBundle AUTO_RESOLVE; duoAbstractLineComposerTransforms.ts |
| reich_glass | 3 | Tier 3 | ui-api, overlay-pass | primary-only | attachVoiceRuleBundle AUTO_RESOLVE; duoAbstractLineComposerTransforms.ts |
| shostakovich | 3 | Tier 3 | ui-api, overlay-pass | primary-only | attachVoiceRuleBundle AUTO_RESOLVE; duoAbstractLineComposerTransforms.ts |
| turtle_island | 3 | Tier 3 | ui-api, overlay-pass | primary-only | attachVoiceRuleBundle AUTO_RESOLVE; duoAbstractLineComposerTransforms.ts |
| ornette_coleman | 2 | Tier 3 | ui-api | primary-only | attachVoiceRuleBundle AUTO_RESOLVE |
| part | 1 | Tier 3 | overlay-pass | primary-only | duoAbstractLineComposerTransforms.ts |
| ravel | 1 | Tier 3 | overlay-pass | primary-only | duoAbstractLineComposerTransforms.ts |

## 4. Tier counts

| Metric | Count |
|---|---|
| Total styles found | 97 |
| Tier 1 (7+) | 32 |
| Tier 2 (4–6) | 54 |
| Tier 3 (0–3) | 11 |

## 5. Verlaine-pattern analysis

**HarmonicVoice-aware (partial):** verlaine (isVerlaineHarmonicPath on chord authority + duoMelodyIdentityV3; truth registry + behaviourGates structural relax primary-only); joni_mitchell, sonic_youth, pat_metheny (styleProfile OR primary — harmonicVoice field not checked).

**Primary-style-only (Stage 1 snapshot):** most other styles at audit time. **Post-rollout correction (2026-07-13 Tier 2 spot-check):** `andrew_hill`, `kate_bush`, `cole_porter` are **hv_full** on harmony/precompute (`runHvAuthorityStyleVerify` OVERALL PASS · `resolverZeroDiff: true` · 0 DIVERGE). **Tier 2 score-6 batch (2026-07-13):** `bacharach`, `donald_fagen`, `james_brown` same — hv_full harmony/precompute verified.

**Mixed cases:** frank_zappa uses harmonyContext canon (not HV-aware); ecm_chamber uses preset-level validator skips; HV-only ids (joe_pass, jamerson, wes_montgomery, etc.) have transport but no eff-bar spine row.

## 6. Top 10 Tier 1 shortlist

| Rank | Style | Score | Stage 2 reason |
|---:|---|---:|---|
| 1 | frank_zappa | 13 | harmonyContext + structural validator bypasses + Slonimsky HV; highest multi-layer drift surface |
| 2 | allan_holdsworth | 12 | HV selectable + structural bass relax; primary-only truth gates |
| 3 | fripp | 12 | HV + Metheny gate bypass + eff-bar spine; primary-only authority |
| 4 | verlaine | 12 | Reference HV-aware path but truth registry/structural relax still primary-only |
| 5 | bill_evans | 10 | Curated Slonimsky HV + full eff-bar stack + duo overlay; primary-only gating |
| 6 | debussy | 10 | Slonimsky HV + AUTO_RESOLVE VRB + eff bars; primary-only gating |
| 7 | duke_ellington | 10 | Slonimsky HV + eff bars + overlay pass |
| 8 | herbie_hancock | 10 | Slonimsky HV + eff bars + overlay pass |
| 9 | john_coltrane | 10 | Slonimsky HV + eff bars + overlay pass |
| 10 | pat_metheny | 10 | styleProfile OR primary + Slonimsky HV; partial secondary-path coverage |

## Coverage gaps

- Slice files not trawled; precompute dispatch assumed to mirror spine.
- BB/SQ Phase 2 consumption gaps per forwarding design not rescored per-section.
- GCE interval-target-only styles excluded from validator-relax +3 conservatively.

## Stage 2 follow-up

Runtime validation findings: **[EIGHTY_STYLE_STAGE2_FINDINGS.md](./EIGHTY_STYLE_STAGE2_FINDINGS.md)** (frank_zappa confirmed 2026-07-08).
