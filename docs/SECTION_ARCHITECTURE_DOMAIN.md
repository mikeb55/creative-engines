# Section architecture — domain model (V64 P4)

Canonical vocabulary for **multi-section** compositions across Song Mode, Guitar–Bass Duo, String Quartet, Big Band, and future preset UI. P4 defines entities and geometry only; **P5** adds TypeScript interface wiring, **P6** merge/validation contracts, **P7** engine-level per-section meter.

## Core entity: `CompositionSection`

Every layer references the same bar-span primitive:

| Field | Meaning |
|-------|---------|
| `sectionId` | Stable key (normalized label) |
| `label` | Display / form label (`A`, `verse`, `development`) |
| `startBar` | First bar (1-based) |
| `endBar` | Last bar (inclusive) |
| `length` | `endBar - startBar + 1` |

Implemented in `engines/composer-os-v2/core/section-architecture/sectionArchitectureDomain.ts`.

## Layer taxonomy

| Layer | When it applies | Existing code |
|-------|-----------------|---------------|
| **form** | Always — defines section boundaries | `FormMap.sections`, `buildFormSections` |
| **macro_goals** | Duo long-form / macro planning | `MacroFormPlan.sections` |
| **vrb_context** | SQ→BB whole-VRB per section | `VrbContextMap`, `resolveVrbForBar` |
| **marker** | Partial VRB + riff + Slonimsky per span | `SectionMarker`, `resolveSectionVrb.ts` (P1/P7) |
| **meter** | Written `<time>` per section (V65) | `SectionPresetSection.meterMap` (domain only in P4) |

`SectionArchitectureDocument` aggregates these layers for one generate request.

## `SectionTemplateBundle` (P4 product template + V65)

A **template bundle** is a named multi-section preset:

- `presetId`, `displayName`
- `sections[]` as `SectionTemplateSection` (extends `CompositionSection`)
- optional `meterMap: { bar, meter }[]` per section (engine reads in P7)

**P5 `Song` schema** uses per-row `SectionPreset` (see `sectionArchitectureTypes.ts`) — different type, same word historically.

V65 backlog: String Quartet and Big Band both consume the same preset model for per-section meters. Zappa GCE **metric disruption** stacks on top of section meter, not instead of it.

## Validation (P4 helpers)

`validateSectionPartition(sections, totalBars)` enforces:

- First section starts at bar **1**
- No gaps or overlaps
- Last section ends at **totalBars**

Golden fixture: `sectionArchitectureDomain.test.ts` (seed **78001**, off smoke until P8).

## Relationship diagram

```text
SectionPreset (optional, UI)
    └── SectionPresetSection[] ──meterMap?──► P7 render
FormMap.sections ──► CompositionSection[]  ◄── authoritative geometry
    ├── SectionMarker[] (vrbOverrides)     ◄── P1/P7 per-bar merge
    ├── SectionVrbContext map              ◄── SQ→BB whole VRB
    └── MacroSectionGoals[]                ◄── planning bias
```

## V64 sequence

| Phase | Deliverable |
|-------|-------------|
| **P4** | Domain model + doc + partition helpers (**this doc**) |
| **P5** | TS interfaces + behavioural contract (`COMPOSER_OS_SECTION_ARCHITECTURE.md`) |
| P6 | `resolveEffectiveContext` + validation implementations |
| P7 | Per-section meter at engine render |
| P8 | Smoke rows + desktop closeout |

Cross-reference: `docs/COMPOSER_OS_ROADMAP.md` § V65 backlog, `docs/COMPOSER_OS_ARCHITECTURE.md` per-section VRB.
