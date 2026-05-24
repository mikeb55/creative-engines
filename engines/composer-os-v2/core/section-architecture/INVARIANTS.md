# Section architecture — domain invariants (V64 P4)

## Canonical geometry

- Bar indices are **1-based** and **inclusive** (`startBar`..`endBar`).
- `length === endBar - startBar + 1`.
- `validateSectionPartition` requires contiguous coverage of `1..totalBars` with no overlaps.

## Layer taxonomy (P4 domain)

| Layer | Source type | Purpose |
|-------|-------------|---------|
| `form` | `CompositionSection[]` | Canonical section labels and bar spans |
| `macro_goals` | `MacroSectionGoals[]` | Pacing / motif / energy targets per section |
| `vrb_context` | `Record<string, SectionVrbContext>` | Whole VRB id (or blend) per section — SQ→BB |
| `marker` | `SectionMarker[]` | Partial `VrbParams` overrides per bar range — all modes (P1/P7) |
| `meter` | `SectionPresetSection.meterMap` | Written meter per section — **V65 engine** (P7) |

## Precedence

**P5 behavioural contract (full):** `docs/COMPOSER_OS_SECTION_ARCHITECTURE.md`  
**Song schema merge order:** `SongDefaults` → `inheritsFrom` → `SectionPreset` profiles → `InstrumentOverride` → `LocalOverride` (implementations P6).

**Runtime layers (shipped / P4):**

1. `form` geometry is authoritative for bar boundaries.
2. `marker` overrides merge onto base `VoiceRuleBundle` per bar (`resolveVoiceRuleBundleForBar`).
3. `vrb_context` replaces dominant VRB id for SQ→BB section labels.
4. `meter` applies at MusicXML render (P7); Zappa GCE metric disruption is **additive**, not a substitute.
5. `macro_goals` inform planning only unless a consumer explicitly reads them.

## Related modules (existing)

- `sectionMarkerTypes.ts` — `SectionMarker`, `VrbParams`
- `resolveSectionVrb.ts` — per-bar bundle merge
- `vrbContextMap.ts` — `SectionVrbContext`, `VrbContextMap`
- `macroFormPlanner.ts` — `MacroSectionGoals`
- `compositionContext.ts` — `FormMap`, `sectionMarkers`
