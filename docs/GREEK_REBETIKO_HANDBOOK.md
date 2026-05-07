# Greek Rebetiko — rhythm engine handbook

Composer OS **Song Mode** primary **`greek_rebetiko`** pairs modal/minor-flavoured harmony planning with a **percussion-first mental model**: additive meters, dance-derived cells, and asymmetric weight — documented here for presets, UI grids, and **standalone GM percussion MusicXML** export (`exportGreekRhythmToMusicXml`, **`engines/composer-os-v2/core/rhythm/greekRhythmMusicXmlExporter.ts`**).

---

## 1. What is this engine?

### Urban Greek “blues”

**Rebetiko** (ρεμπέτικο) grew from late-Ottoman port cities (Piraeus, Thessaloniki, Smyrna refugees) into Greece’s first mass urban song form: small ensembles (**bouzouki**, **baglama**, **violin**, **guitar**, later **accordion**), verse–refrain songs with eastern scalar colour (**makam**-inflected minor, chromatic passing tones), and lyrics that carried underclass narrative — often compared to **blues** for its social origin and emotional directness, though harmony and rhythm are rooted in **Anatolian / Balkan** practice rather than African-American twelve-bar logic.

### Why it belongs in Composer OS

Rebetiko and its descendants (**laïkó**, regional **syrtos / zeibekiko** dance formats) sit naturally beside other **culture-specific** Song Mode writers: harmony is often **modal / vamp-oriented**, phrases follow **dance bar lengths** (especially **7/8**, **9/8**), and **groove identity** is carried as much by **meter subdivision** as by chord roots. The engine’s role is not to mimic a named artist but to give **locked harmony + readable rhythm documentation** the same **receipts-and-export discipline** as Western jazz or Afrobeat slices.

### Compared to Western “grid” percussion engines

| Dimension | Typical Western kit engine (e.g. 4/4 rock / Afrobeat 16ths) | Greek dance / rebetiko-oriented grids |
|-----------|---------------------------------------------------------------|----------------------------------------|
| Meter feel | Often **divisive** — quarters and eighths stack evenly | Often **additive** — unequal beat groups within one bar |
| Bar prototype | **4/4**, **12/8** shuffle | **7/8**, **9/8**, **10/8**, composite **8** |
| Accent logic | Backbeat, ride layers | **Group-final lengthening** (e.g. 2+2+2+**3** in 9/8 zeibekiko) |
| UI preview | Fixed **16×N** matrix | **Step count = f(meter × subdivision)**; **group separators** show dance cells |

Composer OS keeps **GM unpitched** notation in **treble-stage octaves (4–5)** for Sibelius-style drum staves; additiveMeter math stays in the **preset + validate** layer.

---

## 2. Rhythm presets reference

Canonical IDs below are the **documentation surface** for the Greek Rebetiko rhythm line — align future **`RhythmPreset.id`** values with this table when expanding **`greekRebetikoRhythmPresets.ts`**.

| ID | Family | Meter | Groups | Grid steps | Tempo range (BPM, × = quarter unless noted) | Notes |
|----|--------|-------|--------|------------|---------------------------------------------|-------|
| **`zeibekiko_2223_heavy`** | Zeibekiko | **9/8** | **2+2+2+3** (eighth groups) | **18** (16th grid) | **56–88** (slow–heavy floor) | Classic “heavy” zeibekiko; last group long; anchor on group boundaries. |
| **`aptaliko_karsilamas_3222`** | Karsılamas / aptaliko | **9/8** | **3+2+2+2** | **18** | **72–104** | Turkish-Greek crossover line; first cell three eighths. |
| **`hasapiko_slow_24`** | Hasapiko | **2/4** | **1+1** (quarters) | **8** or **16** | **76–108** | Slow hasapiko line; crisp doumbek downbeats. |
| **`hasapiko_slow_44`** | Hasapiko | **4/4** | **2+2** (half-bar cells) | **16** | **80–112** | Peiraeus-style medium walk; common rebetiko recording tempo band. |
| **`tsifteteli_greek_14accent`** | Tsifteteli | **4/4** | Syncopated **Greek** four (accent map 1 **strong**, 2–4 **lift**) | **16** | **96–132** | Belly-dance club metre in diaspora; harmonic rhythm often half-note. |
| **`tsifteteli_13accent`** | Tsifteteli | **4/4** | **3-beat** overlay in four (hemiola feel) | **12** or **24** (triplet grid) | **88–124** | “Three in four” teaching pattern; useful for triplet-sixteenth quantisation. |
| **`karsilamas_2223_fast9`** | Karsılamas | **9/8** | **2+2+2+3** (faster) | **18** | **96–132** | Same grouping as zeibekiko, brighter tempo; stage dance default. |
| **`kalamatianos_322`** | Kalamatianos | **7/8** | **3+2+2** | **14** | **108–144** | Peloponnesian circle dance; seven pulses as **3+2+2** eighths. |
| **`syrtos_duple_glide`** | Syrtos | **2/4** or **4/4** | Duple **smooth** (even eighth stream) | **8** / **16** | **84–120** | Island/mainland syrtos variants; even glide vs heavy downbeat map. |
| **`tsamikos_68_heavy`** | Tsamikos | **6/8** | **3+3** (compound pairs) | **12** or **24** | **72–100** | Men’s heroic metre; heavy **1** and **4** in 6/8 count. |
| **`pentozali_10_5pulse`** | Pentozali | **10/8** (or **5/4** felt as 5× quarter) | **2+2+2+2+2** (five eighth pairs) | **20** | **120–160** | Crete; five-pulse war dance; notate as ten eighths in additive rows. |
| **`sousta_fast24`** | Sousta | **2/4** | **1+1** fast | **8** | **132–176** | Rhodes / Dodecanese quick couple dance; short bars. |
| **`aegean_additive_8_323`** | Composite eight | **8/8** (notated as **8 eighths**) | **3+2+3** | **8** (eighth steps) or **16** | **96–126** | Pedagogical Aegean **additive eight**; matches regional teaching charts. |

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

## Related docs

- **Playbook:** **`docs/COMPOSER_OS_PLAYBOOK.md`** — Song Mode **`greek_rebetiko`** UI summary.
- **Afrobeat analogue:** **`docs/FELA_KUTI_PERCUSSION_HANDBOOK.md`** — West African grid / feel tags pattern.

---

## Sibelius / MusicXML checklist (manual)

1. Export **2-bar** sample from the app (**Download MusicXML**) or call **`exportGreekRhythmToMusicXml`** with **`bars = 2`**.
2. Import to Sibelius — confirm **percussion clef**, **five-line staff**, **GM playback map** on drum staff.
3. If editing — keep **`<clef>`** immediately after **`<staves>`** inside **`<attributes>`** (same ordering as main **`musicxmlExporter`** drum path).
