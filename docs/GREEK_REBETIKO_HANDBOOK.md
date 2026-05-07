# Greek Rebetiko Engine — Composer OS Handbook

Composer OS **Song Mode** primary **`greek_rebetiko`** pairs modal/minor-flavoured harmony planning with a **percussion-first mental model**: additive meters, dance-derived cells, and asymmetric weight — documented here for presets, UI grids, and **standalone GM percussion MusicXML** export (`exportGreekRhythmToMusicXml`, **`engines/composer-os-v2/core/rhythm/greekRhythmMusicXmlExporter.ts`**).

---

## 1. What is this engine?

**Rebetiko** (ρεμπέτικο) is often called Greece’s **urban blues**: songs of port-city workers, hashish dens, and longing, built on eastern scales and uneven dance metres rather than European functional harmony. Its roots reach **Smyrna (İzmir)** and **Istanbul** cafés where Greek, Turkish, Armenian, and Jewish musicians shared instruments and modes; the **1923 population exchange** after the Asia Minor catastrophe drove **Anatolian Greek musicians into Piraeus and Thessaloniki**, where rebetiko fused with local labour songs. By the mid-20th century the music lived in **tavernas** and stages — still the social frame listeners associate with **bouzouki**, **baglama**, story verses, and chorus hooks.

Composer OS treats rebetiko alongside **culture-specific** Song Mode engines such as **Fela Kuti**: not impersonation, but **harmonic vocabulary**, **section receipts**, and **export-grade rhythm documentation**. Where **Tony Allen** grids lock Afrobeat to four-four sixteenth matrices with posture/feels, the Greek line foregrounds **additive metres** (seven-, nine-, ten-eighth bars), **asymmetric stress** (the “long” cell in **9/8** zeibekiko), and an **instrument ecology** centred on plucked lead/counter and clarinet/violin colour — percussion maps emphasize **doumbek/frame/bell** lanes rather than kick/snare/hat alone. Western kit engines assume **divisive** metre and equal subdivisions; here **group sums** define dance identity and UI column counts.

---

## 2. Rhythm presets reference

Canonical IDs below are the **documentation surface** for the Greek Rebetiko rhythm line — align future **`RhythmPreset.id`** values with this table when expanding **`greekRebetikoRhythmPresets.ts`**.

| ID | Family | Meter | Groups | Grid steps | Tempo BPM | Notes |
|----|--------|-------|--------|------------|-----------|-------|
| **`zeibekiko_2223_heavy`** | Rebetiko | **9/8** | **2+2+2+3** | **18** | **60–84** | Heavy zeibekiko; anchor last triple cell. |
| **`aptaliko_karsilamas_3222`** | Rebetiko | **9/8** | **3+2+2+2** | **18** | **60–90** | Substyle: aptaliko. |
| **`hasapiko_slow_24`** | Rebetiko | **2/4** | **2+2** | **8** | **60–90** | Slow hasapiko line. |
| **`hasapiko_slow_44`** | Rebetiko | **4/4** | **2+2+2+2** | **16** | **60–90** | Four-quarter walk; common taverna tempo band. |
| **`tsifteteli_greek_14accent`** | Rebetiko | **4/4** | **4** | **16** | **60–100** | Accent variant: beats **1+4**. |
| **`tsifteteli_13accent`** | Rebetiko | **4/4** | **4** | **16** | **60–100** | Accent variant: beats **1+3**. |
| **`karsilamas_2223_fast9`** | Rebetiko | **9/8** | **2+2+2+3** | **18** | **100–160** | Fast karsılamas stage tempo. |
| **`kalamatianos_322`** | Mainland Greek | **7/8** | **3+2+2** | **14** | **84–132** | Peloponnesian circle dance. |
| **`syrtos_duple_glide`** | Mainland Greek | **2/4** | **2+2** | **8** | **100–140** | Duple syrtos glide. |
| **`tsamikos_68_heavy`** | Mainland Greek | **6/8** | **3+3** | **12** | **72–108** | Heavy tsamikos compound pairs. |
| **`pentozali_10_5pulse`** | Cretan | **10/8** | **2+2+2+2+2** | **20** | **120–180** | Five-pulse Cretan war dance. |
| **`sousta_fast24`** | Cretan | **2/4** | **2+2** | **8** | **160–220** | Fast sousta couple dance. |
| **`aegean_additive_8_323`** | East Med | **8/8** | **3+2+3** | **16** | **80–120** | |

**Shipped implementation snapshot:** the repo currently wires **two** documented presets — **`hasapiko_4_4`** and **`zeibekiko_9_8`** — in **`greekRebetikoRhythmPresets.ts`**. Treat the table above as the **roadmap vocabulary** for IDs and families when adding rows.

---

## 3. Understanding additive meters

### Additive vs divisive (short)

- **Divisive** metre: split the bar from large beats down (Western **4/4** “four quarter beats”).
- **Additive** metre: build the bar from **small unequal cells** (e.g. **7 = 3+2+2** eighths). Dance steps **reset at cell boundaries**, not only at barlines.

The **Generate / preview grid** uses **one column per step** at the preset’s chosen subdivision. **Heavy** accents usually fall on **cell starts** and often on the **last eighth of a group** (especially in **9/8 zeibekiko**).

### Zeibekiko **9/8** — **2+2+2+3** (18 sixteenth steps)

Nine eighth-notes per bar; four groups: three pairs + one triple-length cell:

```text
Sixteenth index:  0 1   2 3   4 5   6 7 8 9 10 11 12 13 14 15 16 17
Group bars:      |--2--|--2--|--2--|------3------|
Eighth feel:      1 e & a  2 e & a  3 e & a  4  e  &  a   (conceptual scansion)
```

In the UI, **vertical separators** align with **group boundaries** after steps **4, 8, 12** (if each pair is two eighths = four sixteenths). The **last group** spans **six** sixteenth steps — that is the canonical zeibekiko “hang.”

### Kalamatianos **7/8** — **3+2+2** (14 sixteenth steps)

```text
Sixteenth index:  0 1 2 3   4 5   6 7   8 9 10 11 12 13
Group bars:      |---3---|--2--|--2--|
```

First cell is **three** eighths (six sixteenths), then two cells of **two** eighths each.

### Pentozali **10/8** — five **2-eighth** pulses (20 sixteenth steps)

```text
Sixteenth index:  (five groups of 4 sixteenths each)
Group bars:      |--2--|--2--|--2--|--2--|--2--|
Pulse:            1     2     3     4     5
```

Feel is often **five even punches** across the bar; traditional dance maps **limping** ornament on top.

### Group separators in the UI grid

When the app renders **layer × step** matrices (**`GreekRhythmControls`**):

- **Column numbers** are **1-based step indices** within the bar.
- **Logical separators** (visual gaps or legend) should land **after** steps that complete a **group sum** — e.g. for **9/8 [2+2+2+3]**, separators after steps **4, 8, 12** on a **16th grid** depend on mapping; on an **18-step** (eighth-split) grid, separators fall after **2, 4, 6**, then the final **3** eighths occupy the last **6** columns.

Authoritative math for export ticks: **`measureTicks / stepsPerBar`** in **`greekRhythmMusicXmlExporter.ts`** (single step duration; chord-stacked hits share one column).

---

## 4. MusicXML export and meter changes

The standalone exporter writes **MusicXML 4.0** with one part **`P1`**, **percussion** clef, **five-line** staff, and measure **1** attributes: **`<divisions>`** (quarter = 480 in the current implementation), **`<key>`**, **`<time>`**, **`<staves>`**, **`<clef>`**, **`<staff-details><staff-lines>5</staff-lines></staff-details>`** — with **`<clef>`** after **`<staves>`** and before **`<staff-details>`** so Sibelius accepts the child order.

**Mid-score meter change:** when a new section uses a different **`<time>`**, the first measure of that section must include a fresh **`<attributes>`** block; the **`<time>`** there overrides the previous signature. You may keep **`<divisions>`** global and only restate **`<time>`** to avoid re-deriving every duration, or follow a bar-resolution model (e.g. **144** divisions per bar) with consistent tick math — see **`docs/RHYTHM_ENGINES.md`** for the LCM discussion.

**Manual Sibelius check:** export from the app (**Download MusicXML**) or call **`exportGreekRhythmToMusicXml(preset, 2)`**; import and confirm **GM** drum map, **unpitched** display octaves **4–5**, and no schema errors on **`<clef>`** scope.

---

## 5. Pulse grids, LCM, and cross-engine alignment

Merging a **16-step** afrobeat bar with an **18-step** zeibekiko bar without **time-stretching** the patterns uses a shared pulse count per bar: **lcm(16, 18) = 144**. On that grid, each 16th-step hits every **9** pulses; each 18-step hits every **8** pulses.

Composer OS implements:

- **`projectStepsToPulseGrid`** — anchor each step velocity at **`step × (pulsesPerBar / stepsPerBar)`**
- **`getSharedGridResolution`** — returns strides for two grids
- **`mergeRhythmLayers`** — combines two lanes with **`max`**, **`sum-clamped`**, or **`priority`**; buckets use **`pulseIndex` + `midiNote`** so unrelated drums at the same subdivision remain separate hits

Full API names live under **`engines/composer-os-v2/core/rhythm/rhythmPulseGrid.ts`** and **`rhythmLayerMerge.ts`**. For engine-neutral framing see **`docs/RHYTHM_ENGINES.md`**.

---

## 6. Song form, sections, and transitions

Typed planning structs (**`songFormRhythmTypes.ts`**) attach a **`RhythmPresetRef`** (**AfrobeatPresetRef** or **RebetikoPresetRef**) to each **`SongSection`** over **`bars: { startBar, endBar }`** (1-based inclusive). Optional **`tempoBpm`**, **`transitionIn`**, **`transitionOut`** (**`hard`** vs **`crossfade`**) describe rehearsal logic — **not** yet a full DAW automation path.

**Recommended default:** **hard** switch at the **bar boundary** when metre or engine identity changes; discrete **MusicXML** time signatures match how bands read charts. **Overlap** transitions are arrangement effects (gain ramps, optional polymetry); they complicate notation unless scoped as **separate parts** or explicit tuplets.

Policies: **`SectionTransitionPolicy`**, **`transitionTradeoffs`**, **`defaultTransitionPolicy`** in **`rhythmBlendPolicies.ts`**.

---

## 7. UI: Greek Rhythm Controls

In **Song Mode** with primary **`greek_rebetiko`**, **`GreekRhythmControls`** (**`apps/composer-os-app/src/components/GreekRhythmControls.tsx`**) shows:

- Preset **dropdown** (shipped bundle from **`GREEK_REBETIKO_RHYTHM_PRESETS`**)
- **Layer × step** preview matrix (**column = step index**)
- **Download MusicXML** — client-side blob; **2 bars** by default via **`exportGreekRhythmToMusicXml`**

Barrel re-exports for tooling: **`apps/composer-os-app/src/slices/greekRhythmSlice.ts`**.

---

## 8. Notation strategies and velocity

**Same score, two metaphors:** Afrobeat is naturally **4/4 sixteen-step**; rebetiko presets may use **8–20** steps per bar. For **simultaneous** material:

- **Separate parts** (**`PercussionRenderMode`**: **`separate-parts`**): each engine keeps native **divisions** + metre — simplest for rehearsal and mixed-length scores.
- **Single part, multi-voice**: two **`<voice>`** layers on one staff require **`<backup>`** per MusicXML rules; use when one player must read a blended line.

**Velocity:** different **MIDI** notes at the same tick → **two note elements**. Same note / same tick → resolve with **`VelocityPolicy`** (**`max`** default; **`priority`** uses **`lanePriority`**). See **`resolveVelocityConflict`** and **`defaultVelocityPolicy`** in **`rhythmBlendPolicies.ts`**.

---

## 9. Source map (implementation)

| Concern | Location |
|---------|----------|
| Greek **`RhythmPreset`**, validation | **`greekRebetikoRhythmTypes.ts`**, **`greekRebetikoRhythmValidate.ts`**, **`greekRebetikoRhythmPresets.ts`** |
| Standalone XML export | **`greekRhythmMusicXmlExporter.ts`** |
| Song form + **`RhythmPresetRef`** | **`songFormRhythmTypes.ts`** |
| LCM / pulse projection | **`rhythmPulseGrid.ts`** |
| Layer merge | **`rhythmLayerMerge.ts`** |
| Transition / velocity / pragmatic defaults | **`rhythmBlendPolicies.ts`** |
| Fela comparison (export path) | **`musicxmlExporter.ts`**, **`felaKutiSlice.ts`** |

---

## 10. Related documents and quality gate

| Doc | Role |
|-----|------|
| **`docs/RHYTHM_ENGINES.md`** | Afrobeat vs Rebetiko overview, blend summary, links |
| **`docs/FELA_KUTI_PERCUSSION_HANDBOOK.md`** | Tony Allen patterns, **`fk:*`** metadata |
| **`docs/COMPOSER_OS_PLAYBOOK.md`** | Generate UI, Song Mode contract |

**Smoke tier:** **`npm run test:composer-smoke`** must remain **163** passed / **0** failed / **42** suites before merging composer-facing changes (`engines/composer-os-v2/tests/runSmokeTests.ts`).

**Glossary (quick):** **Additive metre** — bar built from unequal groups; **divisive** — bar split from beat hierarchy; **doumbek** — low drum lane in preset docs; **zeibekiko** — **9/8** dance with **2+2+2+3** eighth grouping.
