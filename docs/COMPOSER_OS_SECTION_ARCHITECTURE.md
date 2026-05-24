# Composer OS — Section architecture (P5 behavioural contract)

**Canonical types:** `engines/composer-os-v2/core/section-architecture/sectionArchitectureTypes.ts`  
**Contract signatures (no implementation until P6):** `sectionArchitectureContracts.ts`  
**Geometry / layers (P4):** `sectionArchitectureDomain.ts`, `docs/SECTION_ARCHITECTURE_DOMAIN.md`

This document is the **behavioural contract** for Song → Section → bar resolution. **Per-section meter engine wiring shipped P6/P7 (2026-05-24)** — see **`resolveGenerationBarMeterMap.ts`**, **`barMeterResolution.ts`**.

---

## 1. Precedence / resolution rules

Resolution runs **per bar** when `resolveEffectiveContext(bar, song)` is implemented (P6). Later steps win on scalar fields; profile objects are deep-merged unless noted.

### Merge order (lowest → highest priority)

| Step | Source | Effect |
|------|--------|--------|
| 1 | **`Song.globalDefaults`** | Baseline tempo, meter, pitch/rhythm/voicing/density/humanize, default tuning map |
| 2 | **`inheritsFrom`** | Parent `SectionPreset` profiles copied before child section fields apply (acyclic only) |
| 3 | **`SectionPreset`** | Section `pitchProfile`, `rhythmProfile`, `voicingProfile`, `energy`, `meterMap` (stored only until P7), transitions |
| 4 | **`InstrumentOverride`** | Per-instrument tuning, register, riff mode, density, follow-root — scoped to owning section |
| 5 | **`LocalOverride`** | Dot-path patch on `parameterPath` for matching `barRange` |

### Coexistence with runtime layers (P4 / shipped engine)

These layers are **orthogonal** to the Song schema but apply at generate time on the same bar index:

| Layer | Precedence vs Song schema |
|-------|---------------------------|
| **Form geometry** | Authoritative bar boundaries; must agree with `SectionPreset.barRange` partition |
| **VRB context** (SQ→BB) | Whole `vrbId` per section label — applied in `resolveVrbForBar` |
| **SectionMarker** (P1/P7) | Partial `VrbParams` / Slonimsky — merged in `resolveVoiceRuleBundleForBar` **after** base bundle |
| **Macro goals** | Planning bias only unless a consumer reads them |
| **Zappa GCE structural** | Additive meter/register disruption on top of section meter (P7), not a substitute |

**Recommended full stack (P6+):**  
`resolveEffectiveContext` → base bundle from resolved `vrbId` → `SectionMarker` merge → engine-specific structural passes.

### `inheritsFrom` rules

- **@constraint** `inheritsFrom` must reference an existing `SectionPreset.id` declared earlier in the same `Song`.
- **@constraint** Inheritance graph must be **acyclic** (circular inheritance → hard error at `validateSong`).
- Child fields override parent field-for-field; unset child fields inherit parent value.
- `instrumentOverrides` on child **replace** parent list for that section (not merged by default in P6 v1 — document explicitly to avoid surprise).

### Transition bars

- `transitionIn` / `transitionOut` apply to **`bars`** at section seams (default: last N bars of section / first N bars of next).
- **@preference** `interpolateDensity` / `interpolateRegister` blend toward neighbour section values across the window.
- **@preference** `allowCarryoverNotes` permits motif tails to continue across the boundary (no hard cut).

---

## 2. Validation rules

`validateSong(song)` returns `ValidationResult` with `error` (hard) or `warning` (soft).

### Hard errors (@constraint)

| Code | Rule |
|------|------|
| `TUNING_INSTRUMENT_MISMATCH` | `InstrumentOverride.tuningProfile.instrumentType` does not match the part being configured |
| `INHERITANCE_CYCLE` | Circular `inheritsFrom` chain |
| `INHERITANCE_UNKNOWN_PARENT` | `inheritsFrom` id not found |
| `SECTION_OVERLAP` | Two `SectionPreset.barRange` spans share any bar |
| `SECTION_GAP` | Partition does not cover `1..totalBars` contiguously |
| `SECTION_OUT_OF_RANGE` | `barRange` outside `1..totalBars` |
| `PROFILE_REFERENCE_MISSING` | Named profile id in section does not exist in `song.profiles` |
| `SCHEMA_PROFILE_REMOVED` | Persisted file references a deleted profile id at load time |
| `SCHEMA_VERSION_UNSUPPORTED` | `schemaVersion` newer than runtime supports |

### Warnings (@preference)

| Code | Rule |
|------|------|
| `EMPTY_CELL_SETS_WITH_OPS` | Pitch/cell set empty while `sequenceOps` (or equivalent) present on profile |
| `LOCAL_OVERRIDE_UNKNOWN_PATH` | `LocalOverride.parameterPath` does not resolve on `EffectiveGenerationContext` |
| `METER_MAP_IGNORED` | `meterMap` present before P7 engine — logged once per generate |
| `TRANSITION_LONGER_THAN_SECTION` | Transition window exceeds section length |

### Geometry helper (P4)

`validateSectionPartition` on `CompositionSection[]` remains the low-level geometry check; `validateSong` must call equivalent logic on `SectionPreset.barRange`.

---

## 3. Regeneration scope

When the user edits architecture in the UI or API, only affected musical material is re-generated.

| Edit | Regeneration scope |
|------|-------------------|
| Named **profile** in `song.profiles` | **All sections** referencing that profile id |
| **Section `barRange`** | That section **+ transition bars** touching neighbours |
| **`instrumentOverrides`** on one section | **That section only** |
| **New / changed `localOverrides`** | **Affected bars only** (`barRange`) |
| **`inheritsFrom`** change | **That section + all transitive children** |
| **`SongDefaults`** global change | **Full score** (all bars) |
| **`meterMap`** change | **That section bars** once P7 wired; typed only in P5 |

Edits that do **not** require regeneration: metadata (`title`, labels), `schemaVersion` bump with identical resolved fields, read-only diagnostics.

---

## 4. Hard vs soft constraints

### Hard (@constraint) — fail load or validate

- Acyclic section inheritance
- Non-overlapping section `barRange` covering full song
- Tuning profile `instrumentType` match
- Removed profile references at load
- Supported `schemaVersion` only
- `bar` / `startBar` / `endBar` are positive integers; `endBar >= startBar`

### Soft (@preference) — warn and continue

- Unknown local override paths
- Empty cell sets with sequence operators present
- Humanize / jitter extremes
- Transition windows longer than section
- `meterMap` present but engine not yet consuming (P5)

---

## 5. Schema versioning

### `song.schemaVersion`

- **Current:** `1` (P5 contract).
- Bump when breaking field renames or precedence changes; document migration in `CHANGELOG.md`.

### Migration: legacy songs without `sections[]`

Files missing `sections` are treated as:

```text
Single SectionPreset:
  id: "whole"
  label: "Whole"
  type: "custom"
  barRange: { startBar: 1, endBar: totalBars }
  profiles: inherited from SongDefaults only
```

### Load-time profile integrity

- **@constraint** If a section or override references `profiles.pitch[id]` (etc.) and that id was removed since save → **hard error at load**, not at generate.

---

## 6. API signatures (P5 — implementation P6)

```typescript
resolveEffectiveContext(bar: number, song: Song): EffectiveGenerationContext;
validateSong(song: Song): ValidationResult;
resolveSectionForBar(bar: number, sections: SectionPreset[]): SectionPreset | null;
mergeInstrumentOverride(base: EffectiveGenerationContext, override: InstrumentOverride): EffectiveGenerationContext;
```

---

## 7. Sonic Youth concrete example (precedence)

**Song defaults:** tempo 96, meter 4/4, moderate density, `allowedOutsideLevel: 1`.

**Section A** (bars 1–4): base `sonic_youth` VRB — no extra overrides.

**Section B** (bars 5–8): `inheritsFrom` unset; `rhythmProfile.metricDisplacement: 0.83`, `pitchProfile.chromaticBudget: 0.72`, Slonimsky receipt **SY_SLON_01** via engine `SectionMarker` layer (shipped P1 — parallel to Song schema).

**Listener result:** A feels like classic noisy grid; B feels metrically sabotaged and more chromatic without re-pasting chords or changing seed.

**Regeneration:** Editing B’s `barRange` to 5–6 only regenerates bars 5–6 plus transition window into bar 4 and 7; A unchanged.

---

## Related commits

- P4 domain: `580c548a`
- P5 types + contract: (this document)
