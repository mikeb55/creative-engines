# Engine Master Palette

**Version 1.2** — updated 2026-06-05 for Composer OS v1.9.0 composer status  
**Style-agnostic, instrumentation-agnostic**

**Location:** `C:\Users\mike\Documents\Cursor AI Projects\creative-engines` (legacy palette doc); authoritative v2 implementation lives in **`engines/composer-os-v2/`**.

---

## Composer OS v2 — implementation status (2026-06-05, v1.9.0)

| Composer | Slice / surface | Status | Notes |
|----------|-----------------|--------|-------|
| Jan Garbarek | `jg:*` | **Fully implemented** | Ritual modal ECM field slice + BB **`garbarek`** / **`jan_garbarek`** (v1.8.4) |
| Bill Holman | `bh:*` | **Fully implemented** | Chart-first linear counterpoint slice + BB **`holman`** / **`bill_holman`** (v1.8.5) |
| Carla Bley | `cbl:*` | **Fully implemented** | Formal irony ECM slice + BB **`bley`** / **`carla_bley`** (v1.8.6) |
| Don Sebesky | `ds:*` | **Fully implemented** | CTI production-orchestra slice + BB **`sebesky`** / **`don_sebesky`** (v1.8.1) |
| Henry Threadgill | `ht:*` | **Fully implemented** | Song Mode slice + BB **`henry_threadgill`** / **`threadgill`** (v103d) |
| Kenny Wheeler | `kw:*` | **Fully implemented** | **`wheelerLyricSlice.ts`** + BB **`wheeler`**; supersedes legacy Python engine (v103e) |
| Billy Strayhorn | `bs:*` | **Fully implemented** | Chromatic song-form slice + BB **`strayhorn`** (v103f) |
| Wheeler Lyric Engine (Python) | — | **Legacy** | Referenced only — use v2 **`kenny_wheeler`** instead |

All other **fully implemented** v2 composers (Maria Schneider, Gil Evans, Brookmeyer, Shorter, Zappa, Mingus, Ellington, Basie, Thad Jones, Nelson, Nestico, Fischer, Quincy, Evans, Coltrane, Monk, Harris, Hill, Parker, Jim Hall, Hancock, Metheny, Tyner, Miles, Jobim, Martino preset) — see **`docs/COMPOSER_HANDBOOK.md`** § Master composer reference (v2).

---

## Master Engine List

| # | Engine | Character |
|---|--------|-----------|
| 1 | Scofield–Holland Groove Engine | Syncopated, bass-driven, medium tempo |
| 2 | Shorter Narrative Engine | Motif-driven, dramatic arcs |
| 3 | Frisell Atmosphere Engine | Spacious, lyrical, atmospheric |
| 4 | Wheeler Lyric Engine | Luminous, floating harmony — **legacy Python**; v2: **`kenny_wheeler`** (`kw:*`) **fully implemented** |
| 5 | Stravinsky Pulse Engine | Rhythmic cells, shifting meters |
| 6 | Zappa Disruption Engine | Secondary only — ensemble hits, fractures |
| 7 | Slonimsky Harmonic Engine | Intervallic symmetry, exotic movement |
| 8 | Bartók Night Engine | Nocturnal, folk-inspired, mysterious |
| 9 | Counterpoint Hybrid Engine | Independent voices, chamber counterpoint |
| 10 | Polyphonic Labyrinth Engine | Dense polyphonic development |

**Note:** Zappa Disruption Engine is secondary only — never primary.

---

## Engine Selection

When generating a new composition, select an engine from the master palette. The engine determines:

- Harmonic language
- Rhythmic identity
- Texture style
- Orchestration philosophy
- Motivic development approach

---

## Style and Instrumentation Agnostic

This system works with:

- Solo instruments
- Chamber ensembles
- Big band
- Orchestra
- Hybrid ensembles
- Electronic instruments
- Guitar, piano, winds, strings, voices

Engine rules adapt automatically to available instruments.

---

## Universal Rules (Apply to All)

1. **GCE Iteration** — No MusicXML until GCE ≥ 9.0
2. **Anti Monotony** — No cell > 4 bars repeated > 2× without transformation
3. **Density Arc** — low → development → peak → release
4. **Ensemble Awareness** — Idiomatic parts
5. **Section Clarity** — Boxed rehearsal letters, boundaries
6. **Harmonic Depth** — Tonality Vault, interval cycles, triad pairs, polychords
7. **Engraving Quality** — Correct MusicXML

---

## Reference Locations

| Resource | Path |
|----------|------|
| Engines | `engines/*.md` |
| Rules | `rules/*.md` |
| Palettes | `palettes/*.md` |
| Templates | `templates/*.md` |
