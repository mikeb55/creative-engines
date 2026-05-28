# Martino Linear Expressions — Integration Analysis

**Project:** Composer OS (`C:\Dev\composer-os`)  
**Sibling reference:** [grand-criteria Martino Linear Expressions Engine](https://github.com/mikeb55/grand-criteria-of-excellence-jazz/tree/main/Jazz%20Guitar/Martino_Linear_Expressions_Engine)  
**Status:** **Shipped (V69, 2026-05-28)** — `martino_linear` preset, Python engine, desktop bridge, and book-sourced melodic masters are in production.

---

## V69 status (shipped)

| Phase | Delivered |
|-------|-----------|
| **P1** | `martino_linear` preset; `martino_bridge.py` + `martinoEngineBridge.ts`; Orbit 28-bar + Beatrice presets; GCE gate tests; output under `Mike Composer Files\Martino Linear\`. |
| **P2** | Generate UI (`MartinoPanel`), chord parse + `martino_convert` / `martinoTuneConfig`, explain-mode lines from bridge `activityMapText` (not written into MusicXML). |
| **P3** | **Masters:** `martino/masters/sources/A1.xml`–`A5.xml` — single-line Gm melodic activities from Guitar Pro book exports (3 bars × ~16 eighth-notes per bar each). **Not** the old `Activity Chords` voicing chart (stacked Gm7 shapes). `parse_masters.py` regenerates `masters/activities/A1.json`–`A5.json`. Generation = transpose-only from Gm + `martino_convert` minor root; LFV flags `*` via provenance/asterisk, not note rewriting. Provenance sidecar `.provenance.json` per file. |
| **P4** | No `<rehearsal>`, no engine `<words>` on staff; pytest martino 34/34; composer smoke baselines maintained. |

**What masters contain:** Frozen `[step, octave, alter, duration]` sequences per bar in G minor, plus `notes_gm` with `beat_position` and `phrase_boundaries`. Activities map 1:1 to book “Linear Expressions” files 1–5 (positions ~3rd / 5th / 7th / etc.).

**What P3 fixed:** Replaced chord-voicing stacks parsed from `Activity Chords/…Book.xml` with real melodic lines; removed silent chord-tone fallback; hardened bridge; Sibelius-safe harmony and note element order.

---

## Executive summary

Integration is **feasible** and fits existing Composer OS patterns: chord parsing, optional `GenerateRequest` config blobs, Structure-tab panels, and standalone étude presets (`wyble_etude`, `slonimsky_etude`). The hard work is not conversion math — it is **activity content** (pre-composed minor melodic DNA) and **LFV/fretboard realization**, which the grand-criteria repo already owns as MusicXML masters and Python generators.

Recommended path: port **conversion + activity selection** into TypeScript first, wire a **`martino_linear` preset** that consumes `chordProgressionText`, then add Structure UI. Do **not** try to fold Martino into the generic Song Mode melodic path on day one; treat it like Wyble — a dedicated guitar-solo engine with its own bypass route.

---

## Existing codebase inventory (relevant to Martino)

| Asset | Location | Relevance |
|-------|----------|-----------|
| Chord parser (lightweight) | `src/engine/chordParser.js` | Root, quality, bass, extensions — foundation for `martino_convert` |
| Chord parser (engine) | `engines/composer-os-v2/core/harmony/chordSymbolAnalysis.ts` | Slash bass, locked harmony, pitch-class utilities |
| Slonimsky pattern catalogue | `src/engine/slonimskyPatterns.js` | **Pattern metadata** model (id, intervals, tension) — not full melodies |
| Fretboard realization | `engines/composer-os-v2/core/guitar/fretboardRealization.ts` | Strings, frets, technique tags — LFV enforcement hook |
| Fretboard UI | `apps/composer-os-app/src/components/music/FretboardPanel.tsx` | Preview/export surface for guitar output |
| Generate payload | `engines/composer-os-v2/app-api/appApiTypes.ts` → `GenerateRequest` | Extensible optional configs (`contrapuntalConfig`, `fingerprintReceipt`, …) |
| Payload wiring | `composerOsApiCore.ts`, `HomeGenerate.tsx` | Coercion + spread into generate body |
| Fingerprint receipts | `src/engine/fzReceipts.js`, `FzReceiptsPanel.jsx` | Catalogue + `fingerprintReceipt` on generate — template for Martino receipts later |
| Standalone étude presets | `composerOsAppGeneration.ts` (`wyble_etude`, `slonimsky_etude`) | Precedent for `martino_linear` bypass without golden-path rewrite |
| Riff solo overlay | `engines/composer-os-v2/core/riff-generator/riffSoloBuilder.ts` | Bar-level solo from chord + profile — simpler than Martino but same shape |
| Wyble engine | `engines/jimmy-wyble-engine/` | Dual-voice jazz guitar with register rules — closest TS solo generator |
| Structure panels | `StructureWorkspace.jsx` | SectionEditor, TuningPanel, FzReceiptsPanel, VrbPanel |
| Contrapuntal panel | `ContrapuntalPanel.jsx` (Ensemble tab) | Multi-voice rules — orthogonal to Martino single-line guitar |

**Not found in Composer OS today:** any Martino conversion, activity library, LFV map, or `martinoConfig` field.

---

## Grand-criteria repo — what already exists

The sibling engine is a **Python stdlib MusicXML generator** (v5–v6.x) with:

- **`engine_spec.json`** — five activities (`A1`–`A5`), LFV defaults (frets 5–9), string preferences per activity, output naming.
- **`generator.py`** — minimal API: `generate_musicxml`, `build_activity_map`, `enforce_lfv`, `increment_version`.
- **`generate_v5.py`** — production chord grid, slash-bass encoding, validation pipeline, exact chord text preservation.
- **`generate_performance_v2.py`** — performance guardrails (2 choruses, contour, rests, motif discipline) and partial **`_minor_conversion_lane`** (dominant → P5 above; maj7 → M6 above).
- **`generate_v6_teaching.py`** — activity melody builders (`_melody_a1_linear`, `_melody_a2_diagonal`, …).
- **`validation.py`** — measure count, chord text match, rehearsal marks, repeats.
- **`V6.2_Activity_Selector.py`** — tune-specific default/rescue/avoid activity ranks from diagnostics.
- **`Activities Instruction Manual.md`** — **authoritative policy:** all keys generated by **transposition from Gm masters only**; never compose new activity material per key.
- **`Master/`**, **`Teaching/`**, **`Activity Chords/`** — MusicXML source material (not in TS repo).

**Gap:** `generator.py` stub melody is F-minor stepwise — real musical value lives in v6 teaching/performance scripts and master MusicXML, not the minimal CLI generator alone.

---

## 1. Conversion engine

### Purpose

`martino_convert(chordSymbol) → { minorRoot, rule, sourceQuality }`

Maps any chord in a progression to the **minor key center** whose activity vocabulary should be played. Example ii–V–I in C:

| Chord | Rule | Minor root |
|-------|------|------------|
| Dm7 | minor (direct) | D |
| G7 | dom7 → minor a P5 above root | D |
| Cmaj7 | maj7 → minor of the 3rd | E |

### Implementation sketch

1. **Parse** with existing `parseChord()` from `src/engine/chordParser.js`, extended where needed.
2. **Classify** into Martino families (see table below).
3. **Transpose** root pitch class using interval rules; return normalized note name (`C`, `Db`, `F#`, …).

```text
parseChord(symbol)
  → classifyMartinoFamily(parsed)
  → transposePc(rootPc, ruleOffset)
  → pcToNoteName(minorRootPc)
```

**Pitch-class helpers** can reuse `noteNameToPitchClass` / `parseChordSymbol` from `chordSymbolAnalysis.ts` to avoid duplicating enharmonic tables.

### Core rules (from Martino system)

| Family | Detection (approx.) | Minor root |
|--------|---------------------|------------|
| Minor | `quality === 'minor'` (incl. m7, m9 via extensions) | chord root |
| Dominant | `quality === 'dom7'` | root + 7 semitones (perfect 5th up → ii minor) |
| Major / maj6 | triad or 6 in extensions, no 7 | root − 3 semitones (relative minor) |
| Major 7 | maj7 quality or `major` + extension `7` without `b`/`#` alt | root + 4 semitones (minor of 3rd) |
| Half-dim | **needs parser extension** — `m7b5`, `ø`, `half-diminished` | root + 3 semitones (minor a m3 above) |
| Dim / dim7 | diminished | policy TBD — often treated as half-dim pathway or direct minor of b5 |

### Cases beyond the five basic types

| Case | Suggested handling |
|------|-------------------|
| **Slash chords** (`C/E`) | Convert harmony part only; slash bass ignored for minor root (matches grand-criteria chord grid behaviour) |
| **Sus2 / sus4** | Treat as major-family unless chart context marks sus as dominant prep → default: relative minor |
| **minMaj7** | Minor direct (root) — Martino minor lane |
| **Altered dominants** (`G7b9`, `G7alt`) | Same as dom7 → ii minor (D for G7) |
| **Extensions only** (`C6`, `Cmaj9`, `Cm11`) | Fold into family via base quality + extensions |
| **Triads** (`C`, `Cm`, `Cdim`) | major → relative minor; minor → direct; dim → half-dim rule or explicit dim table |
| **Non-functional / modal** | Still convert per symbol; musician may override per bar in UI |
| **Split-bar chords** | Convert each symbol independently; activity stitcher picks continuity (see §2) |

### `chordParser.js` gaps today

Current parser returns `major`, `minor`, `dom7`, `sus2`, `sus4`, `minMaj7` only. It does **not** distinguish:

- half-diminished (`Cm7b5`, `Cø7`)
- diminished (`Cdim7`)
- major 7 vs major 6 vs plain major triad (maj7 often parses as `major` + extension `7`)

**Recommendation:** extend `parseHarmonySuffix` **or** add `martinoChordClassifier.js` that wraps `parseChord` and applies regex fallbacks for `ø`, `m7b5`, `dim`, `maj7`, `6` before conversion. Keep Martino-specific logic out of the generic parser if you want minimal blast radius.

### Where it lives

| File | Role |
|------|------|
| `src/engine/martinoConvert.js` | Pure conversion: symbol → minor root + audit metadata |
| `src/engine/__tests__/martinoConvert.test.js` | ii–V–I, half-dim, slash, altered dominants |
| `src/engine/martinoTypes.js` (optional) | JSDoc typedefs for activity ids, LFV config |

Later, if the v2 engine consumes it: thin re-export from `engines/composer-os-v2/core/martino/` or import from `@engine/martinoConvert.js` in the bypass generator.

---

## 2. Activity library

### What activities are

Not scales — **fixed melodic formulas** per minor key: linear steps, diagonal shifts, pivot cells, anchor arpeggios, free mix. Each has:

- Contour and rhythm grid (often eighth-based)
- Preferred string sets (LFV map in `engine_spec.json`)
- Harmonic “anchor” behaviour (especially A4 at cadences)

Grand-criteria names: `A1_LINEAR_CORE`, `A2_DIAGONAL_BRIDGE`, `A3_PIVOT_CELL`, `A4_ANCHOR_ARP`, `A5_FREE_MIX`.

### How to represent in code

**Do not** store activities as interval DNA only (that is Slonimsky). Use a **transposable event list**:

```typescript
type MartinoActivityNote = {
  degree: number;        // scale degree in natural minor, or semitone offset from root
  octave: number;
  durationEighths: number;
  role?: 'chord' | 'approach' | 'enclosure' | 'altered';
};

type MartinoActivityTemplate = {
  id: 'A1' | 'A2' | 'A3' | 'A4' | 'A5';
  name: string;
  stringPreference: number[];  // e.g. [3,2,1] for strings 4-3-2
  bars: MartinoActivityNote[][]; // one bar = one measure of eighths
  lfvMinFret: number;
  lfvMaxFret: number;
};
```

**Source of truth:** import from grand-criteria **Gm master MusicXML** once, parse to JSON templates, commit to `src/engine/martino/activities/` (or `reference/martino/masters/`). Regeneration policy from GCE manual: **transpose only**, never recompose per key.

Alternative interim format: store as **MusicXML snippets** per activity and transpose at runtime (matches GCE workflow exactly; heavier parser dependency).

### How many activities for a useful v1

| Scope | Count | Notes |
|-------|-------|-------|
| Minimum viable | **5** (A1–A5) | One template set in Gm; transpose to converted minor root |
| Teaching parity | 5 × 12 keys | Still transpositions, not new compositions |
| Tune-aware selection | 5 + selector metadata | Port `V6.2_Activity_Selector` ranks per tune/form |

For Composer OS v1: **5 master templates + transposition** is enough to demo ii–V–I linear consistency. Tune-specific activity maps (Beatrice, Orbit) can be presets later.

### Connecting across bar lines

Progression processing pipeline:

```text
chordProgressionText
  → bars[] of chord symbols
  → per bar: minorRoot = martino_convert(chord)
  → per bar: activityId = selectActivity(bar, context)
  → if minorRoot changes mid-phrase:
        transpose activity template to new root
        prefer A1/A2 bridge at register boundary (grand-criteria performance rules)
  → enforce LFV on realized MIDI/frets
  → emit notes into score
```

**Continuity rules** (from `generate_performance_v2.py` guardrails):

- **Same minor root** across bars → same activity lane; vary contour (asc/desc/zigzag) chorus to chorus.
- **Root change** → transpose template; keep fingering region stable via LFV rather than jumping position.
- **Cadences** → bias **A4** (anchor arp).
- **Short bridges** → A2 ≤ 2 bars; A3 ≤ once per chorus; A5 mainly chorus 2.
- **Rests** at phrase boundaries (≥ 2 per chorus).

**Asterisk measures** (`m.N *` in GCE output): mark bars where primary activity was abandoned or LFV violated — useful for teaching mode in UI.

---

## 3. Solo generator integration

### How minor root feeds the generator

The converted minor root is **not** a scale picker — it selects:

1. **Which transposed activity template** to pull from (Gm → target minor).
2. **Register center** for LFV (frets 5–9 default).
3. **Optional key signature** echo in metadata (natural minor of that root).

Flow:

```text
bar chord → martino_convert → minorRootPc
minorRootPc + activityId → getActivityTemplate('A1', 'Gm') → transpose(minorRootPc - GmPc)
→ fretboardRealization / LFV clamp → MartinoSoloNote[]
```

### Can `GenerateRequest` carry `martinoConfig`?

**Yes.** The payload already carries many optional UI configs (`contrapuntalConfig`, `fillSchedulerConfig`, `fingerprintReceipt`, `alternateGuitarTuning`, Slonimsky fields, riff fields). Adding `martinoConfig?: MartinoConfigPayload` follows established V66–V68 patterns:

- Define type in `appApiTypes.ts`
- Coerce in `composerOsApiCore.ts` (`coerceMartinoConfigFromBody`)
- Pass through in `composerOsAppGeneration.ts`
- UI context + panel → `HomeGenerate.tsx` spread

### Proposed `martinoConfig` shape

```typescript
interface MartinoConfigPayload {
  enabled: boolean;
  mode: 'teaching' | 'performance';
  primaryActivity: 'A1' | 'A2' | 'A3' | 'A4' | 'A5';
  secondaryActivities?: Array<'A1' | 'A2' | 'A3' | 'A4' | 'A5'>;
  /** Auto from V6.2-style diagnostics when tuneId set */
  tuneId?: 'beatrice' | 'orbit' | 'blue_bossa' | 'custom';
  lfv: { minFret: number; maxFret: number };
  stringPreference?: 'auto' | '4-3-2' | '5-4-3-2' | '3-2';
  noteDensity: 'eighth' | 'swing_eighth' | 'mixed';
  choruses: number;
  /** Override per-bar activity map (1-based bar index) */
  activityMap?: Record<number, string>;
  /** Show asterisk markers on LFV violations in export */
  markLfvViolations: boolean;
  guitarOutputMode?: 'notation' | 'tab' | 'both';
}
```

### Integration strategies (pick one for v1)

| Strategy | Pros | Cons |
|----------|------|------|
| **A. New preset `martino_linear`** | Clean bypass like `wyble_etude`; clear user intent | Another preset card |
| **B. Overlay on `guitar_bass_duo`** | Uses existing chord progression UI | Conflicts with duo bass line / golden path |
| **C. Python subprocess to GCE generator** | Fastest to "real" Martino output | Deployment friction, two codebases |

**Recommendation:** **A** for v1 — `presetId: 'martino_linear'` with required `chordProgressionText` + `martinoConfig`. Optionally **C** as dev bridge: Electron spawns `generator.py` until TS activity library is ported.

### Relation to existing melodic generators

- **Song Mode / golden path** — harmonic vocabulary from songwriter VRBs; not Martino-aware.
- **Riff generator** — grid + VRB solo profile; different abstraction.
- **Wyble** — closest analogue: chord list in, monophonic/duo lines out, register constraints.

Martino should **not** initially hook into `improvMode` / Coltrane-style agents — keep deterministic, reproducible (seed-driven transposition and activity map only).

---

## 4. UI — MartinoPanel

### Placement

**Structure tab** (with `SectionEditor`, `TuningPanel`), not Ensemble. Rationale:

- Martino is **section-scoped harmonic technique** (like Slonimsky pattern per section in `TuningPanel`).
- `ContrapuntalPanel` is multi-voice counterpoint — different concern.
- `FzReceiptsPanel` is an example of a specialized engine control block in Structure.

Optional: also expose on **Generate** page when `martino_linear` preset selected (like `RiffGeneratorPanel`).

### Minimum controls (musician-facing)

| Control | Purpose |
|---------|---------|
| Enable Martino | Master toggle → sets `martinoConfig.enabled` |
| Mode | Teaching (literal activities) vs Performance (2-chorus guardrails) |
| Primary activity | A1–A5 selector |
| LFV range | Min/max fret (default 5–9) |
| String set | Auto or forced string group |
| Note feel | Straight vs swing eighths |
| Choruses | 1–2 |
| Preview | Activity map text for active section (read-only, like Slonimsky preview) |
| Apply | Writes section UI overrides + include in next Generate |

Advanced (v2): per-bar activity override grid, tune preset (`Beatrice`, `Orbit`), asterisk display toggle, side-by-side **converted minor root** column next to chord progression.

### Relation to existing panels

| Panel | Interaction |
|-------|-------------|
| **SectionEditor** | Martino config stored per section via `patchSection` / `getUiOverride` (same as `slonimskyPatternId`, `key`) |
| **TuningPanel** | Shares section key for preview root; Martino conversion ignores tuning system but LFV preview could use `FretboardPanel` |
| **ContrapuntalPanel** | Independent; disable or warn if both enabled on same preset |
| **FzReceiptsPanel** | Future: `MARTINO_LINEAR` receipt id in catalogue for metadata tagging |

### UX copy (example)

> **Martino Linear / section** — Convert each chord to its minor activity key; play one activity vocabulary for linear bebop fingering. Chords unchanged on lead sheet; solo line uses converted minor roots.

---

## 5. Risks and open questions

### Uncertain or hard

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Activity content fidelity** | High | Import Gm masters from grand-criteria; do not algorithmically "invent" Martino lines |
| **chordParser coverage** | Medium | Martino-specific classifier + tests before UI |
| **LFV / tab export** | Medium | Reuse `fretboardRealization.ts`; validate against GCE `enforce_lfv` |
| **Split bars / repeats** | Medium | Port v5 chord grid + validation rules |
| **Enharmonic spelling** | Low–medium | Consistent `pcToNoteName` with flat bias for jazz charts |
| **Python ↔ TS duplication** | Medium | Time-box Python bridge; single TS source of truth long-term |
| **Legal / pedagogical** | Low | System is published method; activity *notation* is your composed masters |

### Must come from grand-criteria repo

- Gm **Master** chord anchors and A1–A5 **Teaching** MusicXML
- `engine_spec.json` activity/LFV defaults
- `generate_v6_teaching.py` melody logic (port or subprocess)
- Performance guardrails from `generate_performance_v2.py`
- Tune presets (`presets/beatrice.json`, `orbit.json`) for acceptance tests
- `Activities Instruction Manual.md` transposition policy

### Must be designed fresh in Composer OS

- `martinoConvert.js` with full five-rule coverage + tests
- `MartinoConfigPayload` + API coercion + preset registration
- `MartinoPanel.jsx` + section UI persistence
- `martino_linear` generate handler (TS or Python adapter)
- JSON activity template format + MusicXML import script
- Diagnostics UI (activity map, converted-root column, asterisk bars)

### Open questions for product owner

1. **Preset scope:** standalone Martino only, or overlay on existing guitar–bass duo scores?
2. **Output:** notation-only, tab-only, or both (`guitarOutputMode` already exists)?
3. **Python bridge:** acceptable for v0.1 desktop, or TS-only from start?
4. **Copyright / licensing** of master MusicXML in repo distribution?
5. Should **dim7** map to half-dim minor-third rule or separate diminished activity lane?

---

## Recommended first implementation step

**Step 1 — Conversion engine + tests (no UI, no MusicXML yet)**

1. Add `src/engine/martinoConvert.js` implementing all five Martino rules on top of extended chord classification.
2. Add `src/engine/__tests__/martinoConvert.test.js` with cases:
   - ii–V–I in C (`Dm7`, `G7`, `Cmaj7` → D, D, E)
   - Half-dim (`Cm7b5` → Eb minor lane)
   - Maj6 (`Cmaj6` → Am)
   - Slash and altered dominants
3. Add a small **progression helper** `martinoConvertProgression(chords: string[])` returning per-bar audit trail for debugging.

This unlocks chord-grid tooling, UI preview ("converted minor" column), and activity transposition without committing to full generator port. **Step 2** would import one Gm A1 template and prove transpose + LFV on 8 bars of `custom_locked` progression.

---

## Appendix — reference snippets in Composer OS

**GenerateRequest optional configs (existing pattern):**

```typescript
// appApiTypes.ts (excerpt)
fingerprintReceipt?: FingerprintReceiptPayload;
contrapuntalConfig?: ContrapuntalConfigPayload;
slonimskyPatternId?: string;
chordProgressionText?: string;
harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
guitarOutputMode?: 'notation' | 'tab' | 'both';
```

**Grand-criteria partial conversion (performance v2):**

```python
# dominant X7 -> minor a P5 above; maj7 -> minor of M6 above
def _minor_conversion_lane(chord_text, default_lane):
    quality = v5._kind_base_quality(kind_text)
    if quality == "dominant":
        lane = _ROOT_TO_LANE_DOMINANT.get(root, "C")
    elif quality == "major-seventh":
        lane = _ROOT_TO_LANE_MAJOR.get(root, "C")
    else:
        return default_lane
```

Composer OS conversion should implement the **full** rule set from the product brief (including half-dim and maj6), not only the partial lane map above.

---

*Document version: 1.0 — analysis phase, no implementation.*
