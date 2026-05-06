# Fela Kuti — Tony Allen percussion engine

Song Mode primary **`fela_kuti`** adds an **Afrobeat Percussion** staff (**instrument** **`fela_afrobeat_drums`**, part id **`fela_drums`**) after the duo golden-path seal. GM MIDI hits map to **unpitched** notation on a **percussion clef**; hi-hat and bell use **written F♯2** and **G♯2** with explicit **sharp** accidentals (see **`musicxmlExporter.ts`** **`felaAfrobeatDrumGlyph`** — must stay aligned with **`felaKutiSlice.ts`** MIDI constants).

---

## Pattern sources

Committed bundle **`engines/composer-os-v2/core/percussion/data/tonyAllenPatterns.json`**:

| Feel key | JSON path | Tidal / upstream label (metadata) |
|----------|-----------|-----------------------------------|
| **`straight`** | `feels.straight` | `Sound/Tidal/Drum/Rock1a.hs` |
| **`swing`** | `feels.swing` | `Sound/Tidal/Drum/Swing3a.hs` |
| **`afrobeat`** | `feels.afrobeat` | `Sound/Tidal/Drum/Afro2a.hs` |

Extractor script (repo): **`scripts/extractTonyAllenPatterns.py`**. Each feel is **one bar × five voices** × **16** sixteenth steps (`kick`, `snare`, `hiHat`, `bell`, `conga`), values **0** or **1**.

---

## Engine API (`afrobeatRhythmEngine.ts`)

- **`loadDefaultTonyAllenPatternsBundle()`** / **`parseTonyAllenPatternsBundle(raw)`** — load or parse JSON. If a **feel key is missing** under `feels`, that bucket gets **empty rows** (all zeros), not a throw.
- **`createAfrobeatRhythmEngine(bundle?)`** — **`selectPattern(feel)`**, **`applyPolyrhythm(base, layers)`**, **`quantise(pattern, 16 \| 24)`**.
- **`pulseIndices(pulses, phaseSteps, cycleLen)`** — evenly spaced pulses; **phase** is normalised with **`modCycle`** so rotations wrap cleanly at the **bar** (**`cycleLen`**, default **16**).
- **`quantise(..., 24)`** — expands each 16-step voice to a **24-slot triplet-sixteenth** grid for the same bar span; **fold**/**expand** clamp indices at bar edges.

Polyrhythm layers merge **OR** into a voice row on the **16** grid before export (slice builds **16th** events).

---

## Context keys & `fk:*` tags

**Posture** (`GenerationMetadata.felaKutiContext`):

| Context | Maps to Tony Allen feel |
|---------|-------------------------|
| **`zombie_1977`** | **`afrobeat`** |
| **`water_no_get_enemy`** | **`swing`** |
| **`lady_1972`** | **`straight`** |

Omitted context defaults to **`zombie_1977`** when primary songwriter is **`fela_kuti`**.

**Manual override:** **`felaPercussionFeelOverride`** **`straight` | `swing` | `afrobeat`** wins over posture (**`resolveFelaPercussionTonyAllenFeel`** in **`felaKutiSlice.ts`**).

**Receipt / metadata tag** on finalize: **`felaPercussionFeelTag`** — **`fk:straight`**, **`fk:swing`**, or **`fk:afrobeat`** (**`felaPercussionFeelTagFromTonyAllenFeel`**).

Harmony slice receipts remain **`fk:d1_*` … `fk:d5_*`** (devices), distinct from percussion feel tags.

---

## Feel override flow (UI → MusicXML)

1. **Generate** payload may include **`felaKutiContext`** and optional **`felaPercussionFeelOverride`** (**`appApiTypes.ts`** / **`composerOsApiCore.ts`**).
2. **`runGoldenPath`** / **`composerOsAppGeneration`** pass metadata through **`GenerationMetadata`**.
3. **`appendFelaPercussionToScore`** selects pattern via **`resolveFelaPercussionTonyAllenFeel`**, **`createAfrobeatRhythmEngine`**, **`selectPattern`**, **`buildFelaAfrobeatPercussionPart`**.

---

## Auto preview caveat (UI)

**`FelaPercussionControls.tsx`**: when **Auto** is selected, the **16×5 preview grid** follows **posture → feel** mapping but the preview dataset is locked to the **zombie_1977** grid until a **posture** control exists in the Generate UI. Use **Straight / Swing / Afrobeat** toggles for an accurate static preview of those buckets.

---

## Sibelius render checklist (manual)

Generate **three** scores (same Song Mode primary **Fela Kuti**, **32 bars** or project default; pick posture so metadata matches column **or** set manual override):

| Target tag | Suggested posture | Override (if needed) |
|------------|-------------------|----------------------|
| **`fk:straight`** | **`lady_1972`** | — |
| **`fk:swing`** | **`water_no_get_enemy`** | — |
| **`fk:afrobeat`** | **`zombie_1977`** | — |

**Confirm in Sibelius:**

1. **Parts** — duo **guitar + bass** (or project defaults) **plus** **Afrobeat Percussion** only; no stray drum kit unless you enabled another surface.
2. **Percussion staff** — clef **percussion**; measure 1 may show the exporter **hint direction** (Sibelius manual check line).
3. **Noteheads** — hi-hat **x** on **F♯**; bell on **G♯** with sharps; kick/snare/conga standard heads at mapped staff positions.
4. **Extras** — no duplicate percussion parts; harmony/chords on guitar as usual for Fela Song Mode.

Optional: run **`npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/exportFelaPercussionSibeliusSamples.ts`** from repo root to write **three** one-bar standalone **`.musicxml`** files (drums only) for quick import smoke.

---

## Operational notes

- Full composer regression for this module: **`runAfrobeatRhythmEngineTests`** (full harness, not smoke tier).
- **`npx vite build`** TLS issues in some environments are **network/cert** configuration — not tracked as engine defects.
