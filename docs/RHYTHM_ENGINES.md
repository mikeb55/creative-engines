# Rhythm engines — Composer OS

Composer OS supports multiple **culture-specific percussion / groove engines** in Song Mode and supporting libraries. This page names the engines, points to handbooks, and summarizes **blend architecture** (pulse grids, merges, notation policy).

---

## Engines at a glance

| Engine id | Domain | Primary handbook | Core modules |
|-----------|--------|------------------|--------------|
| **`afrobeat`** | Tony Allen–style **4/4** sixteen-step grids | **`docs/FELA_KUTI_PERCUSSION_HANDBOOK.md`** | **`afrobeatRhythmEngine.ts`**, **`felaKutiSlice.ts`**, **`musicxmlExporter.ts`** (Fela drum part) |
| **`rebetiko`** | Greek dance metres (**7/8**, **9/8**, **10/8**, etc.) | **`docs/GREEK_REBETIKO_HANDBOOK.md`** | **`greekRebetikoRhythmPresets.ts`**, **`greekRhythmMusicXmlExporter.ts`**, **`GreekRhythmControls.tsx`** |
| **`brazilian`** | Bossa / samba / baião **16-step** (and **6/8 → 12-step**) grids | This doc §Brazilian | **`brazilianRhythmPresets.ts`**, **`brazilianRhythmMusicXmlExporter.ts`**, **`BrazilianRhythmControls.tsx`** |
| **`second_line`** | NOLA second line **16-step** (and **6/8 → 12-step**) | This doc §Second Line | **`secondLineRhythmPresets.ts`**, **`secondLineRhythmMusicXmlExporter.ts`**, **`SecondLineRhythmControls.tsx`** |
| **`cuban`** | Son / rumba / mambo **16-step** (and **6/8 → 12-step**) | This doc §Cuban | **`cubanRhythmPresets.ts`**, **`cubanRhythmMusicXmlExporter.ts`**, **`CubanRhythmControls.tsx`** |

Songwriter-facing rhythm IDs differ: Afrobeat **`fela_kuti`**; Greek **`greek_rebetiko`**; Brazilian **`brazilian`**; Second Line **`new_orleans_second_line`**; Cuban **`cuban_afro_cuban`**. Blend/lab uses internal **`RhythmEngineId`** strings **`afrobeat` \| `rebetiko` \| `brazilian` \| `second_line` \| `cuban`** (**`songFormRhythmTypes.ts`**).

---

## Engine registry (culture rhythm panels)

| Engine | Domain | Metres | Presets | Slice | Controls | Ship |
|--------|--------|--------|---------|-------|----------|------|
| **Brazilian** | Bossa nova, samba, baião, son-clave | 2/4, 4/4 | 9 presets | **`brazilianRhythmSlice`** | **`BrazilianRhythmControls`** | Shipped **V40** |
| **New Orleans Second Line** | Parade, brass band, Mardi Gras, funk | 4/4, 6/8 | 8 presets | **`secondLineRhythmSlice`** | **`SecondLineRhythmControls`** | Shipped **V41** |
| **Cuban/Afro-Cuban** | Son, rumba, mambo, cha-cha, bolero, mozambique, Afro | 4/4, 6/8 | 8 presets | **`cubanRhythmSlice`** | **`CubanRhythmControls`** | Shipped **V42** |

---

## Engine details

### Brazilian engine (V40)

- **Families:** bossa-nova, samba, baião, son-clave
- **Context keys:** **`br:bossa-nova`**, **`br:samba`**, **`br:baiao`**, **`br:son-clave`**
- **Output dir:** `Documents/Composer OS Exports/Brazilian Rhythms/`
- **Key design:** default grids are **16-step** per bar on **2/4** and **4/4** signatures (**sixteenth** subdivision). Presets in **6/8** use a **12-step** grid per bar (eighth-subdivision lane length **12**, not 16).
- **Feel params:** `subdivisionSkew`, **`anticipationPush`** (bossa “ahead” feel — prefer over swing ratio for this engine), `lowPulseWeight`, `crossStickDryness`, `ghostDensity`, `jingleContinuity`, `accentVariance`, `surdoVariation`
- **Presets:** `bossa-nova-basic`, `bossa-nova-drumset-light`, `samba-batucada-basic`, `samba-enredo-fast`, `samba-de-gafieira-big-band`, `partido-alto-clave-led`, `baiao-basic`, `baiao-jazz-4-4`, `son-clave-basic`
- **Big band use:** bossa nova under jazz harmony, baião for fusion, samba-de-gafieira for big band dance sections
- **References:** Getz/Gilberto, Stan Getz Big Band Bossa Nova, Maria Schneider “Começar de Novo”

### New Orleans Second Line engine (V41)

- **Families:** second-line, brass-band, mardi-gras, new-orleans-funk
- **Context keys:** **`sl:second-line`**, **`sl:brass-band`**, **`sl:mardi-gras`**, **`sl:new-orleans-funk`**
- **Output dir:** `Documents/Composer OS Exports/Second Line/`
- **Key design:** **16-step** grids on **4/4**; **6/8** presets use **12-step** bars. “Between the cracks” pocket → tune **`subdivisionWarp`** (not global swing).
- **Feel params:** **`subdivisionWarp`**, `snareDensity`, `ruffProbability`, `pressRollLength`, `bassDrumSyncopation`, `openHiHatFrequency`, `jingleContinuity`, `bigFourWeight`
- **Presets:** `second-line-basic`, `second-line-slow`, `second-line-fast`, `second-line-shuffle`, `mardi-gras-indian`, `brass-band-6-8`, `new-orleans-funk`, `second-line-big-band`
- **Big band use:** shout choruses, processional feel, brass-band 6/8 for dirge/hymn sections
- **References:** Wynton Marsalis JLCO “The Second Line”, Dirty Dozen Brass Band, The Meters “Hey Pocky A-Way”

### Cuban/Afro-Cuban engine (V42)

- **Families:** son, rumba, mambo, cha-cha, bolero, mozambique, afro
- **Context keys:** **`cu:son`**, **`cu:rumba`**, **`cu:mambo`**, **`cu:cha-cha`**, **`cu:bolero`**, **`cu:mozambique`**, **`cu:afro`**
- **Output dir:** `Documents/Composer OS Exports/Cuban Rhythms/`
- **Key design:** **16-step** (4/4) and **12-step** (6/8 Afro). **`claveDirection`** is stored **per preset** (`'3-2' | '2-3' | '6-8'`) — not a separate live UI toggle; changing clave direction means choosing a preset that encodes the other orientation.
- **Feel params:** `claveDirection`, `tumbaoDensity`, `montunoAlignment`, `cascaraVsBell`, `openClosedCongaContrast`, `guiroContinuity`, `bellBrightness`, `ghostHandDensity`
- **Presets:** `son-clave-3-2`, `son-clave-2-3`, `rumba-clave-3-2`, `mambo`, `cha-cha-cha`, `bolero`, `mozambique`, `afro-6-8`
- **Big band use:** mambo horn writing locks to clave direction; cha-cha for lighter dance sections; Afro 6/8 for ceremonial or atmospheric passages
- **References:** Tito Puente *Dance Mania*, Machito *Kenya*, Dizzy Gillespie “Manteca”, Chico O’Farrill *Afro-Cuban Suite*

### Greek rebetiko — grid sizes (additive metres)

Per-bar **step counts** follow preset **`stepsPerBar`** (and metre): **9/8** zeibekiko-style bars use **18** sixteenth steps (four additive cells **2+2+2+3** eighths); **7/8** uses **14** steps (**3+2+2**); **10/8** pentozali-style uses **20** steps (five **2**-eighth pulses). See **`docs/GREEK_REBETIKO_HANDBOOK.md`** §3. MusicXML beaming follows **`meter.groups`** in the exporter.

---

## Blend Engine (V43)

The app **Rhythm blend lab** (**`RhythmBlendControls`**, Song Mode) builds MusicXML previews using **`exportSongFormToMusicXml`** / **`exportBlendedScoreToMusicXml`** (**`engines/composer-os-v2/core/blend/blendMusicXmlExporter.ts`**).

- **Engine A / Engine B** — any pair from the five **`RhythmEngineId`** values (including **same engine twice** for A/B preset contrast).
- **LCM normalisation** — bars with different **`stepsPerBar`** align on **`lcm(na, nb)`** pulses (**`mergeRhythmLayers`**, **`rhythmPulseGrid.ts`**). Example: **16** vs **18** → **144** pulses per bar.
- **UI warning** — when the selected A/B preset **`gridSteps`** yield **`lcm > 144`**, the panel shows a compatibility note (merge still valid; raster gets wider).
- **Conflict strategies** — **`max`**, **`sum-clamped`**, **`priority`** (**`rhythmLayerMerge.ts`**) for stacked-layer semantics; annotated on dual-part blend XML as a comment.
- **Modes** — **Song form**: sections each pick one engine + preset, measures concatenated. **Layer blend**: two parts (**P1** / **P2**) with native metre each.
- **Export folder:** `Documents/Composer OS Exports/Blended Rhythms/`

---

## Shared types (song form & presets)

Cross-engine section planning lives in **`engines/composer-os-v2/core/rhythm/songFormRhythmTypes.ts`**:

- **`RhythmEngineId`** — `'afrobeat' \| 'rebetiko' \| 'brazilian' \| 'second_line' \| 'cuban'`
- **`SongSection`**, **`SongForm`** — bar ranges + **`rhythm`** (`engine` + **`presetId`**) + optional **`tempoBpm`**, **`transitionIn` / `transitionOut`**

Example fixture: **`BLEND_DEMO_SONG_FORM_EXAMPLE`**.

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
