# Rhythm engines — Composer OS

Composer OS supports multiple **culture-specific percussion / groove engines** in Song Mode and supporting libraries. This page names the engines, points to handbooks, and summarizes **blend architecture** (pulse grids, merges, notation policy).

---

## Engines at a glance

| Engine id | Domain | Primary handbook | Core modules |
|-----------|--------|------------------|--------------|
| **`afrobeat`** | Tony Allen–style **4/4** sixteen-step grids | **`docs/FELA_KUTI_PERCUSSION_HANDBOOK.md`** | **`afrobeatRhythmEngine.ts`**, **`felaKutiSlice.ts`**, **`musicxmlExporter.ts`** (Fela drum part) |
| **`rebetiko`** | Greek dance metres (**7/8**, **9/8**, **10/8**, etc.) | **`docs/GREEK_REBETIKO_HANDBOOK.md`** | **`greekRebetikoRhythmPresets.ts`**, **`greekRhythmMusicXmlExporter.ts`**, **`GreekRhythmControls.tsx`** |

Songwriter-facing IDs differ: Afrobeat is selected via **`fela_kuti`**; Greek via **`greek_rebetiko`**.

---

## Shared types (song form & presets)

Cross-engine section planning lives in **`engines/composer-os-v2/core/rhythm/songFormRhythmTypes.ts`**:

- **`RhythmEngineId`** — `'afrobeat' \| 'rebetiko'`
- **`AfrobeatPresetRef`** / **`RebetikoPresetRef`** — lane velocities per grid
- **`SongSection`**, **`SongForm`** — bar ranges + **`rhythm`** payload + optional **`tempoBpm`**, **`transitionIn` / `transitionOut`**

Example fixture: **`BLEND_DEMO_SONG_FORM_EXAMPLE`** (Zeibekiko section → Afrobeat section).

---

## Pulse grid & merge

When two layers use **different step counts in one bar** (e.g. **16** vs **18**), identity-preserving alignment uses a **least common multiple** pulse raster — **lcm(16, 18) = 144** internal pulses per bar — see **`rhythmPulseGrid.ts`** (`projectStepsToPulseGrid`, `getSharedGridResolution`, `createBarTimingPlan`).

**`mergeRhythmLayers`** (**`rhythmLayerMerge.ts`**) combines two **`MergeLayerInput`** lanes onto that grid with **`max`**, **`sum-clamped`**, or **`priority`**; events are bucketed per **`pulseIndex` + `midiNote`** so different drums at the same tick stay distinct.

---

## Policies & pragmatic defaults

**`rhythmBlendPolicies.ts`** defines:

- **`SectionTransitionPolicy`** / **`defaultTransitionPolicy`** — default **hard** cut at bar boundary
- **`VelocityPolicy`** / **`resolveVelocityConflict`** — same-note collisions (**`max`** default)
- **`PercussionRenderMode`** — **`single-part-multi-voice`** vs **`separate-parts`**
- **`BlendArchitectureRecommendation`** / **`pragmaticPlan`** — section-hard-switch, dynamic LCM per bar, **separate-parts** default export story

---

## Where to read next

| Doc | Use when |
|-----|----------|
| **`docs/GREEK_REBETIKO_HANDBOOK.md`** | Greek metres, **13** roadmap preset IDs, additive diagrams, MusicXML §§4–8 |
| **`docs/FELA_KUTI_PERCUSSION_HANDBOOK.md`** | Tony Allen JSON, feels, **`fk:*`** tags, Fela slice wiring |
| **`docs/COMPOSER_OS_PLAYBOOK.md`** | Generate UI, Song Mode payloads, smoke-tier expectations |

**Smoke tier (merge gate):** **`npm run test:composer-smoke`** — **163** passed / **0** failed / **42** suites (`engines/composer-os-v2/tests/runSmokeTests.ts`).
