# Handover Notes — Composer OS / creative-engines
**Date:** 2026-05-01
**Desktop version:** 1.0.40
**Branch:** main
**Smoke:** 106 passed / 0 failed

## What Landed This Session

**Duo Slonimsky fix**
- Song Mode post-pass Path B now calls resolveAllowedOutsideLevelForSlonimsky() instead of hardcoded ternary

**MusicXML Lead-Sheet Import — BB + SQ (Sessions 1–3)**
- ensembleLeadSheetMusicXml field on GenerateRequest
- leadSheet chord events mapped bar-by-bar into arranger chord inputs
- Reference-import behavioural hints (density, register, motif contour) attached to run manifest

**Harmony Import Stages 6–7**
- importHarmonyMode / harmonyBlend extended to BB + SQ handlers
- free_harmony gates chord lock; lock_harmony applies it
- Ensemble harmony import regression test: 106/28 baseline

**blend_harmony per-bar merge — BB + SQ**
- Ported from Song Mode; merge active when 0 < blend < 1 and lead sheet present
- leadSheet omitted from realiser when blend applies
- runManifest: importHarmonyBlendActive + importHarmonyBlendEffective

**styleProfile: null fix — BB + SQ**
- bigBandScoreBuilder + quartetScoreBuilder now pass songwriterStyleId as styleProfile
- SLONIMSKY_STYLE_PROFILE_MAP now active in BB & SQ Slonimsky passes

**Slonimsky Etudes #15 — complete**
- Engine: slonimskyEtudeGenerator.ts (note→measure bridge, multi-bar assembler, XML wrapper)
- App-api: slonimsky_etude preset, dispatch branch, release metadata
- UI: SlonimskyEtudes.tsx tab (13 families, pattern picker, chord input, key, BPM, 12-key cycle)

**Documentation**
- USER_GUIDE.md, SLONIMSKY_USER_GUIDE.md, UserGuide.tsx, CHANGELOG.md all updated

**Frank Zappa — Session 1 complete (Gaps 1–4)**
- SongwriterRuleId union, style profile, rule registry, Slonimsky profile map entry
- Aliases: zappa / fz
- Primary instrument: keys

## Next Session Starting Point

**Frank Zappa — Session 2 (Gaps 5–8)**

Gap 5 — frankZappaSlice.ts (new file)
Following wayneShorterSlice.ts pattern:
- Device constants: polytonal_superimposition, metric_displacement, xenochrony_pitch_offset, style_juxtaposition, through_composed_cut
- precomputeFrankZappaEffectiveHarmonyBars(context)
- finalizeFrankZappaMetadata(metadata, acc)
- Receipts: fz:d1:label@bar{N}#v1 format

Gap 6 — songModeBuilder.ts chord pools
- frank_zappa verse/chorus/bridge pools
- Vocabulary: 7alt, m7b5, maj7#11, tritone-rooted, occasional doo-wop triads as style clash
- No clean ii-V-I

Gap 7 — wiring call sites
- composerOsAppGeneration.ts: frank_zappa dispatch
- generateGoldenPathDuoScore.ts: isSongwriterFrankZappa() guard + precompute call
- HomeGenerate.tsx: add frank_zappa to songwriter dropdown

Gap 8 — smoke test row
- runSmokeTests.ts: frank_zappa Song Mode generation assert

## Key Files
engines/composer-os-v2/core/song-mode/frankZappaSlice.ts (TO CREATE)
engines/composer-os-v2/core/song-mode/songModeBuilder.ts
engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts
engines/composer-os-v2/app-api/composerOsAppGeneration.ts
apps/composer-os-app/src/pages/HomeGenerate.tsx

## Known Pre-existing Fails (ignore)
- Exporter: plain major uses empty kind text
- Song Mode integration: lock_harmony / imported timeline
- Full-repo tsc from root fails on unrelated legacy issues — smoke suite is the verified gate

## Smoke baseline
npm run test:composer-smoke → 106 passed / 0 failed / 28 suites
