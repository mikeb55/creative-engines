# Slonimsky pattern engine — user guide

Composer OS v2 · melodic Slonimsky layer · aligned with Nicolas Slonimsky, *Thesaurus of Scales and Melodic Patterns* (**Charles Scribner’s Sons, 1947**; commonly reprinted **Schirmer / Music Sales / Hal Leonard**, ISBN variants **082561449X**, **0026118505**, etc.)

This guide describes how Composer OS applies interval-cycle vocabulary inspired by the **actual 1947 Thesaurus** — not a loose “Slonimsky-style” metaphor. Pattern numbers and section titles below refer to the **numbered pattern catalogue** and **chapter headings** in that book. Pagination differs slightly between **first-edition Scribners**, **Schirmer trade reprints**, and **facsimile PDFs**; use your copy’s **table of contents** and **rear pattern index** where a page spread is ambiguous.

---

## 1. What is the Slonimsky layer?

Nicolas Slonimsky’s *Thesaurus of Scales and Melodic Patterns* (1947) is a systematic catalogue of melodic progressions derived from the **equal division of octaves** (and extended multi-octave divisions). The book contains **over 1,300** numbered patterns organised into **13** major chapters — from simple **Tritone Progressions** through **Heptatonic Scales**, **Pentatonic Scales**, **Twelve-Tone Patterns**, **Polytonal Scales**, and derived **Intervallic / Mirror / Permutation** materials.

Coltrane studied it obsessively — *Giant Steps* and *Countdown* are direct applications of the **major 3rd cycle** (Pattern Nos. **27–50** in the **Ditone Progression** chapter). Brecker drew on it for chromatic-run vocabulary. Wayne Shorter and ECM-oriented players drew on **floating whole-tone** and **minor-third** cells. It is the mathematical backbone of much post-bop melodic language.

In Composer OS, the Slonimsky layer is a **melodic pattern engine** that can inject these interval-cycle patterns into the **guitar voice** on eligible Song Mode / duo golden-path routes. It does **not** rewrite harmony, chord progressions, bass lines, or comp voicings by itself. It shapes **melodic interior motion** — replacing or augmenting interior notes within bars — using symmetric interval patterns selected from a **small, explicit engine pattern set** (see §3), driven by phrase intent, chord context, and style profile.

> **Scope (honest):** The shipped engine implements **eight** concrete interval DNA patterns mapped to Thesaurus *sections* (§3). It does **not** yet realise arbitrary Pattern Nos. from the book (for example full **Heptatonic** or **Pentatonic** catalogue ranges). §9 and §10 describe how book numbering relates to the engine and what is **planned** for later versions.

---

## What the Thesaurus contains (13 sections)

High-level survey — division of the octave (or stacked octaves) and musical character:

| Section | Division / scope | Character / typical use |
|--------|-------------------|-------------------------|
| **Tritone Progression** | 1 octave ÷ 2 | C–F♯ cycle — dominant tension; Brecker / Coltrane “outside” |
| **Ditone Progression** | 1 octave ÷ 3 | Major 3rd cycle — *Giant Steps* harmony, multicentric tonality |
| **Sesquitone Progression** | 1 octave ÷ 4 | Minor 3rd / diminished — altered dominant, outside bursts |
| **Whole-Tone Progression** | 1 octave ÷ 6 | Augmented / whole-tone — ECM “floating”, Shorter modal colour |
| **Semitone Progression** | 1 octave ÷ 12 | Chromatic — Brecker-style dense interpolation |
| **Quadritone Progression** | 2 octaves ÷ 3 | Wide-span major 3rd — dramatic register shifts |
| **Sesquiquadritone** | 3 octaves ÷ 4 | Very wide minor 3rd spans — extreme outside |
| **Quinquetone / Diatessaron** | Multi-octave | Fifth / fourth based — more consonant “outside” |
| **Heptatonic Scales** | 7-note | Church modes + synthetic scales — inside/outside bridge |
| **Pentatonic Scales** | 5-note | Pentatonic variants — global flavour, open sound |
| **Twelve-Tone / Dodecaphonic** | 12-note rows | Serial patterns — highly engineered, non-functional |
| **Polytonal / Polyrhythmic** | Multi-key | Simultaneous tonalities — extreme colour |
| **Intervallic / Mirror / Permutations** | Derived | Expanding/contracting cells, retrogrades, palindromes |

---

## The 13 sections — pattern number ranges and where to open the book

Slonimsky prints **one cumulative Pattern No. sequence** for the whole volume (facsimile editions typically **Pattern 1** through **Pattern 1381**). The table lists **all 13 conceptual sections** with **Pattern No. bands** as numbered in the catalogue (**not** the order you encounter if you read cover-to-cover — e.g. **Twelve-Tone Nos. 173–175** precede **Heptatonic** **1034+** numerically). **Approximate opening pages** refer to common **Schirmer / Music Sales**-type reprints of the 1947 matter (~243 pp.); **1947 Scribners** pagination differs — use **Pattern No.** as the stable key, then the **chapter heading** in your edition.

| # | Thesaurus section | Division / scope | Pattern Nos. (index) | Approx. opening page* |
|---|-------------------|------------------|----------------------|----------------------|
| 1 | **Tritone Progression** | 1 octave ÷ 2 | **1–26** | ~12–18 |
| 2 | **Ditone Progression** | 1 octave ÷ 3 | **27–50** | ~18–24 |
| 3 | **Sesquitone Progression** | 1 octave ÷ 4 | **51–73** | ~24–30 |
| 4 | **Whole-Tone Progression** | 1 octave ÷ 6 | **74–82** | ~30–33 |
| 5 | **Semitone Progression** | 1 octave ÷ 12 | **83–90** | ~33–36 |
| 6 | **Quadritone Progression** | 2 octaves ÷ 3 | *(Band **91–172** in many indexes — locate **“Quadritone”** in your Pattern table)* | ~36–48 |
| 7 | **Sesquiquadritone** | 3 octaves ÷ 4 | *(same multi-octave band — **“Sesquiquadritone”**)* | ~48–58 |
| 8 | **Quinquetone / Diatessaron** | Multi-octave (5ths / 4ths) | *(same multi-octave band — **“Quinquetone”** / **“Diatessaron”**)* | ~58–72 |
| 9 | **Twelve-Tone / Dodecaphonic** (early row fragment) | 12-note rows | **173–175** | ~72–78 |
| 10 | **Intervallic / Mirror / Permutations** | Derived cells | **186**, **188** (± adjacent rows in same chapter) | ~78–88 |
| 11 | **Polytonal scales** | Multi-key | **220–223** | ~88–95 |
| 12 | **Heptatonic scales** | 7-note | **1034–1087** | ~135–145 |
| 13 | **Pentatonic scales** | 5-note | **1142–1190** | ~155–168 |

\* **Pages are approximate** across reprints. **Heptatonic** / **Pentatonic** openings are often cited near **pp. 137** and **160** in Schirmer-line editions; additional **twelve-tone** and **pandiatonic** materials also appear in **later** chapters (~**184**, ~**192**) under **different Pattern Nos.** — rely on the book index, not page parity alone.

**Rows 6–8:** Slonimsky groups **multi-octave equal divisions** in the **low-to-mid 90s through ~172** (exact **first/last Pattern No.** per chapter varies by facsimile). Use your copy’s **alphabetical / numerical index** — do not infer precise **91–125**-style splits from this doc alone.

---

## Using this guide with the Thesaurus

This section explains how to connect **Composer OS output** to **Slonimsky’s book** for further manual development (transposition, inversion, retrograde, orchestration). No automated export of Pattern Nos. from the app is required — only score + this mapping.

1. **Identify the engine pattern family**  
   From receipts, developer metadata, or by ear / visual inspection of the guitar line, note which engine id fired when Slonimsky material appears — for example `p_majorThirdCycle`, `p_wholeTone`, `p_minorThirdCycle` (see §3).

2. **Map the engine id to a Thesaurus *section* and pattern band**  
   Use §3 (“Quick reference”) and the **§9 mapping table** (`Thesaurus Section → Engine Mapping`). Example: `p_majorThirdCycle` ↔ **Ditone Progression**, Pattern Nos. **27–50**.

3. **Open the Thesaurus at that band**  
   Locate **Pattern 27** (or any number in the band) in the book’s index. Read **adjacent patterns** in the same chapter — Slonimsky organises **rotations**, **permutations**, and **registral expansions** serially. Those neighbours are your **development library** for hand-arranging or rewriting.

4. **Transpose and transform outside the engine**  
   The Composer OS layer applies **deterministic, bounded** interval DNA suitable for duo guitar. The book adds **mirror forms**, **palindromes**, and **multi-octave** variants (Pattern bands **91+**) that the engine **does not** currently emit — consult the book when you need those extensions.

5. **Cross-edition checklist**  
   - Prefer **Pattern No.** over page number when citing the book.  
   - If pagination does not match the table above, search by **Pattern No.** in your index — pagination drift is expected across reprints.

---

## 2. Core concepts in two minutes

### Interval cycles

Every Slonimsky pattern is built from a **repeating interval cell** — a sequence of semitone steps that generates pitches. The minor 3rd cycle **[+3, +3, +3]** produces C–E♭–G♭–A. The major 3rd cycle **[+4, +4]** produces C–E–A♭. These are **symmetric divisions** of the octave — they do not belong to a single diatonic key, which is why they read as “outside” when superimposed on functional harmony.

### Phrase intent: build / release / float / shock

The engine maps phrase context to four semantic intents. Each intent preferentially selects a **family** of engine patterns:

| Intent | Pattern family | Sound | When it tends to fire |
|--------|----------------|-------|------------------------|
| **shock** | Minor 3rd, Major 3rd, Tritone | Outside, dissonant | Contrast bars, development peaks |
| **build** | Expanding [1,2,3,4], Chromatic | Accelerating tension | Rising phrase segments |
| **float** | Whole-tone, Asymmetric 1-2-3 | Suspended, non-functional | Modal vamps, open harmony |
| **release** | Contracting [4,3,2,1] | Resolving, landing | Cadence bars, phrase ends |

### Outside level: 0 / 1 / 2

Controls how aggressively the engine may leave chord/key tones. Set automatically per style profile — you influence it by **style profile choice**, not a separate UI knob.

- **0** — Slonimsky inactive for that profile.  
- **1** — Conservative (float/release-tilt families; low tension).  
- **2** — Full outside including shock-level cycles.

### Functional strength: strong / medium / weak

Describes how strongly functional the current chord reads. On strong dominants (e.g. G7♭9, Calt), the engine may be **more selective** about where it fires. On weak or passing chords, it may fire more freely. Derived from chord-symbol analysis in the pipeline.

---

## 3. The eight shipped engine patterns — quick reference

Each row is **interval DNA** (semitone steps), Thesaurus **section**, tension tier, and typical musical use. These ids correspond to the TypeScript engine registry — not arbitrary labels.

| Pattern ID | Intervals | Thesaurus section | Tension | Character & use |
|------------|-----------|-------------------|---------|-----------------|
| `p_minorThirdCycle` | [+3,+3,+3] | Sesquitone | 3 / shock | C–E♭–G♭–A diminished axis — outside bursts on altered chords |
| `p_majorThirdCycle` | [+4,+4] | Ditone | 3 / shock | C–E–A♭ — multicentric / Coltrane-type motion |
| `p_tritonePole` | [+6,−6] | Tritone | 3 / shock | C–F♯ alternation — maximum dominant tension |
| `p_wholeTone` | [+2,+2,+2] | Whole-tone | 1 / float | Augmented scale colour — ECM / modal ambiguity |
| `p_asymCell123` | [+1,+2,+3] | Intervallic | 2 / float | Asymmetric cell — bridge inside/outside |
| `p_chromaticInterp` | [+1,+1,+1] | Semitone | 2 / build | Chromatic run — dense approach motion |
| `p_expanding` | [+1,+2,+3,+4] | Intervallic | 3 / build | Expanding intervals — climax pressure |
| `p_contracting` | [+4,+3,+2,+1] | Intervallic | 1 / release | Contracting intervals — soft landing |

> **Not implemented in the current engine:** arbitrary Pattern Nos. from **Heptatonic**, **Pentatonic**, full **Polytonal**, or complete **Twelve-Tone** chapters — see §10 (V3 direction).

---

## 4. How each style profile uses Slonimsky

The engine’s behaviour is driven by your **style profile**. Each profile has a preset **outside level**, **pattern affinity**, and phrase-intent mapping. The following matches the shipped documentation — theatre-style profiles remain **outside level 0** (layer inactive).

### Jazz / post-bop profiles

**`STYLE_WAYNE_SHORTER`**  
Outside level **2**. Affinity: minor 3rd cycle, whole-tone, asymmetric cell. Motivic, non-functional; float and shock intents. **Thesaurus:** Whole-tone **74–82**, Sesquitone **51–73**.

**`STYLE_BARRY_HARRIS`**  
Outside level **2**. Affinity: minor 3rd, chromatic interpolation. Bebop inside/outside splice on strong dominants; brief shock bursts. **Sesquitone 51–73**, **Semitone 83–90**.

**`STYLE_CHARLIE_PARKER`**  
Outside level **1**. Affinity: chromatic interpolation, asymmetric cell. Conservative chromatic approach; build intent common.

**`STYLE_THELONIOUS_MONK`**  
Outside level **1**. Affinity: tritone pole, asymmetric cell. Sparse tritone displacement on shock.

**`STYLE_ANDREW_HILL`**  
Outside level **2**. Affinity: expanding cell, minor 3rd. Angular, discontinuous.

**`STYLE_BILL_EVANS`**  
Outside level **1**. Affinity: whole-tone, contracting. Float + impressionistic release.

### ECM / modal profiles

**`STYLE_ECM_CHAMBER`**  
Outside level **1**. Affinity: whole-tone, contracting. Sparse float.

**`STYLE_PAT_METHENY`**  
Outside level **1**. Affinity: whole-tone, asymmetric. Lyric float with rare late shock.

**`STYLE_JONI_MITCHELL`**  
Outside level **1**. Affinity: whole-tone, asymmetric. Open harmony / alt-tuning context.

### Indie / experimental profiles

**`STYLE_SONIC_YOUTH`**  
Outside level **2**. Affinity: tritone pole, major 3rd, minor 3rd. Aggressive non-functional logic.

**`STYLE_INDIE_ART_POP`**  
Outside level **1**. Affinity: asymmetric, whole-tone. Gentle colour.

### Other profiles

**`STYLE_DONALD_FAGEN`**  
Outside level **1**. Affinity: chromatic interpolation, asymmetric. Controlled sophistication.

**`STYLE_STEPHEN_SONDHEIM` / theatre-style profiles**  
Outside level **0** — Slonimsky layer **inactive**.

> **Big Band / String Quartet:** Slonimsky affects the **primary melodic lead voice** in applicable modes; ensemble comp parts are not reshaped by this layer.

---

## 5. Scenario playbook — quick applications

Each scenario ties a musical situation to **profile**, **chord input**, **what the Slonimsky layer does**, and **what you should hear**.

### Scenario 1 — Coltrane outside burst over a dominant

You want a guitar line that briefly implies three tonal centres over a **G7** before resolving to **C** — classic “sheets of sound” energy.

- **Profile:** `STYLE_WAYNE_SHORTER` or `STYLE_BARRY_HARRIS`
- **Chord input:** `G7alt` or `G7b9` for ~2 bars, then `Cmaj7`
- **What fires:** **shock** intent → `p_majorThirdCycle` **[+4,+4]** — e.g. motion through spellings that imply multiple major-third anchors.
- **Result:** ~1–2 beat outside burst mid-bar; **first and last** chord-tone anchors preserved where the duo emission path applies.

The major 3rd cycle is Pattern Nos. **27–50** (**Ditone Progression**).

### Scenario 2 — ECM floating line over a modal vamp

Static **Dm** vamp (~8 bars). The guitar line should **float** without strong directional harmony — ECM-style ambiguity.

- **Profile:** `STYLE_ECM_CHAMBER` or `STYLE_PAT_METHENY`
- **Chord input:** `Dm7` or open modal harmony (weak functional pull)
- **What fires:** **float** intent → `p_wholeTone` **[+2,+2,+2]**
- **Result:** sparse whole-tone interior motion; release contracting gestures at phrase ends where mapped.

Whole-tone material sits in Pattern Nos. **74–82**.

### Scenario 3 — Brecker chromatic run into a cadence

8-bar phrase climbing toward a cadence — **acceleration** then **landing**.

- **Profile:** `STYLE_BARRY_HARRIS` or `STYLE_CHARLIE_PARKER`
- **What fires:** **build** (mid-phrase) → `p_expanding` **[+1,+2,+3,+4]** with chromatic interpolation where enabled; **release** on cadence → `p_contracting` **[+4,+3,+2,+1]**
- **Result:** tightening interval rhythm toward the cadence — Brecker-forward contour.

### Scenario 4 — Barry Harris inside/outside bebop splice

Fast bebop tempo — mostly inside line with a **short outside splice** on the dominant.

- **Profile:** `STYLE_BARRY_HARRIS`
- **Chord input:** ii–V–I with a clear **G7** bar
- **What fires:** strong dominant context + **shock** → `p_minorThirdCycle` **[+3,+3,+3]** — brief diminished-axis interruption, then return inside on the **`I`** chord.
- **Result:** 1–2 beat splice on **V**, consonant resolution on **I**.

Sesquitone family = Pattern Nos. **51–73**.

### Scenario 5 — Sonic Youth non-functional pattern logic

Post-punk guitar duo — harmony may be non-functional; the melody line should feel **engineered** rather than “guided by changes.”

- **Profile:** `STYLE_SONIC_YOUTH`
- **Chord input:** power chords or ambiguous harmony
- **What fires:** outside level **2** + **shock** → **tritone pole** and **major 3rd** rotation among eligible selections.
- **Result:** melodic symmetry that reads independently from functional harmony.

### Scenario 6 — Joni Mitchell open-harmony floating cells

Alternate tuning (open/modal zone), sparse harmony, introspective colour.

- **Profile:** `STYLE_JONI_MITCHELL` + alternate tuning preset (e.g. open/modal roadmap preset from **[USER_GUIDE.md](USER_GUIDE.md)**)
- **What fires:** **float** + outside **1** → `p_wholeTone`, `p_asymCell123` **[+1,+2,+3]**
- **Result:** gentle motion that complements open-string harmony without dense clashes.

### Scenario 7 — Wayne Shorter motivic non-functional line

Melodic identity leads — harmony is **colour**, not a strict map.

- **Profile:** `STYLE_WAYNE_SHORTER`
- **Chord input:** slow-moving or non-functional chords (`Bbmaj7`, `Ebmaj7`, …)
- **What fires:** alternation of **float** (whole-tone cells) and **shock** (minor 3rd bursts).
- **Result:** motivic interval logic suitable for later inversion / retrograde in notation software.

### Scenario 8 — Andrew Hill angular development

Discontinuous, “staggered” melodic tension.

- **Profile:** `STYLE_ANDREW_HILL`
- **What fires:** **build** → expanding cells; **shock** → minor 3rd cycle on development bars.

### Scenario 9 — String quartet sketch seed

Generate a duo sketch, then orchestrate.

- **Profile:** `STYLE_WAYNE_SHORTER` or `STYLE_BILL_EVANS`
- **Generate:** 8–16 bars Song Mode duo → export MusicXML.
- **Development:** lift interval cells into quartet voices; invert / retrograde / augment manually.

### Scenario 10 — Big band soli seed

Sketch a soloistic guitar line for later **soli** deployment.

- **Profile:** `STYLE_BARRY_HARRIS` or `STYLE_DONALD_FAGEN`
- **Export:** guitar lead → assign to lead alto / trumpet stack in your arrangement.
- **Harmonisation:** advanced voicing chapters in the Thesaurus (e.g. **Autochordal harmonization**, Pattern Nos. **1251–1291** in many editions — verify index).

### Scenario 11 — Monk-style tritone displacement

Angular humour — occasional **tritone** landing as gesture.

- **Profile:** `STYLE_THELONIOUS_MONK`
- **What fires:** **shock** → `p_tritonePole` **[+6,−6]**

### Scenario 12 — Pat Metheny lyrical line with late outside move

Long lyrical arc — mostly inside; **one** outside gesture late.

- **Profile:** `STYLE_PAT_METHENY`
- **Shape:** **float** early → single **shock** window mid–late phrase → **release** at phrase end.

### Scenario 13 — Alternate tuning + Slonimsky combined

Alternate tuning metadata **and** eligible style profile — voicing layer + melodic layer operate independently.

- **Profile:** any of the five **`STYLE_PROFILES_WITH_ALTERNATE_GUITAR_TUNING`** ids (see **[USER_GUIDE.md](USER_GUIDE.md)**)
- **Preset:** one of the roadmap tuning presets (e.g. `new_standard`, `all_fourths`, open variants).
- **Result:** tuning-shaped comp registers + interval-cycle melody on the lead guitar path (subject to engine gates).

---

## 6. Tuning presets + Slonimsky — combined usage

Slonimsky melodic injection aligns with **`STYLE_PROFILES_WITH_ALTERNATE_GUITAR_TUNING`** (Indie Art Pop, Sonic Youth, Joni Mitchell, Pat Metheny, ECM Chamber) when alternate-tuning metadata is active on eligible routes — see **[USER_GUIDE.md](USER_GUIDE.md)** § **Alternate guitar tuning** for the authoritative eligibility list and **`alternateGuitarTuning`** request modes.

**Zone / pattern pairings** (illustrative):

| Zone | Example presets | Strong Slonimsky patterns | Sound |
|------|-----------------|---------------------------|--------|
| Jazz sophisticated | `new_standard`, `all_fourths`, `all_fifths` | Major/minor 3rd cycles | Post-bop outside over jazz harmony |
| Open modal (Joni zone) | `open_d_modal`, `joni_dadgad`, `open_g` | Whole-tone, asym 1-2-3 | Floating, open |
| Hybrid harmonic | `drop_d_minor`, `open_c_extended` | Expanding, chromatic | Tension build |
| Experimental (Sonic Youth) | `tritone_slant`, `open_e_chaos` | Tritone pole, major 3rd | Non-functional, engineered |

---

## 7. Controlling the output

**Seeds** — Same seed + chord + bar yields the same Slonimsky selection (deterministic). Change the seed to explore different pattern selections.

**Chord input** — Dominant 7th chords (**G7**, **G7alt**, **G7♭9**) tend to produce the most active outside playing when functional strength reads **strong**. Modal or sustained chords (**Dm7**, **Fmaj7♯11**) favour **float** intent (whole-tone and asymmetric cells). For **more** Slonimsky activity, use **altered dominants** in the progression; for **less**, favour plain major-7th chords without alterations.

**Bar count / form** — **8-bar** phrases give a full arc (float early, build mid, shock late, release on the last bar). **4-bar** phrases compress the arc (shock may land around bar 3). **16-bar** forms allow a longer float before build.

**Shared vs separate tunings** — With **shared** tuning, both guitars share the same voicing context. With **separate** tunings, Slonimsky applies to the **lead** guitar voice in that voice’s register context. See **[USER_GUIDE.md](USER_GUIDE.md)** for dual-guitar routing.

---

## 8. Listening and developing the output

**Hearing the layer** — Interior bar motion may briefly leave the key; first and last chord-tone anchors often remain in duo emission paths.

**Using the line as a seed** — Export MusicXML; identify interval cells (minor 3rd, whole-tone, expanding). Apply **inversion, retrograde, augmentation**, and **transposition cycles** by hand or in notation software — the same transformations Slonimsky catalogues for adjacent Pattern Nos.

**Duo sketch → written score** — Generate 8–16 bars, export, distribute cells across ensemble voices; harmonise using book chapters (e.g. **Autochordal harmonization** bands in the Thesaurus, **Pattern Nos. 1251–1291** in many editions) when arranging for big band.

---

## 9. Reference tables

### Pattern × profile compatibility matrix

**Legend:** ✓✓ = primary affinity · ✓ = secondary · — = not used  

*(Profiles outside this grid — e.g. **`STYLE_DONALD_FAGEN`**, **`STYLE_INDIE_ART_POP`**, **`STYLE_BILL_EVANS`** — follow §4; the matrix below matches the original Composer OS Slonimsky reference.)*

| Pattern | Wayne | Barry | ECM | Pat | Joni | Sonic Youth | Parker | Monk | Andrew Hill |
|---------|:-----:|:-----:|:---:|:---:|:----:|:-----------:|:------:|:----:|:-----------:|
| Minor 3rd | ✓✓ | ✓✓ | — | — | — | ✓✓ | ✓ | ✓ | ✓✓ |
| Major 3rd | ✓ | ✓ | — | — | — | ✓✓ | — | — | ✓ |
| Tritone pole | ✓ | ✓ | — | — | — | ✓✓ | — | ✓✓ | ✓ |
| Whole-tone | ✓✓ | — | ✓✓ | ✓✓ | ✓✓ | — | — | — | — |
| Asym 1-2-3 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓✓ | ✓ | ✓ |
| Chromatic | — | ✓✓ | — | — | ✓ | — | ✓✓ | — | — |
| Expanding | — | ✓ | — | — | — | ✓ | ✓ | — | ✓✓ |
| Contracting | ✓ | — | ✓✓ | ✓✓ | ✓ | — | ✓ | — | — |

### Outside level by profile

| Profile | Outside level | Practical effect |
|---------|:-------------:|------------------|
| `STYLE_WAYNE_SHORTER` | **2** | All patterns available; full outside on shock intent |
| `STYLE_BARRY_HARRIS` | **2** | All patterns; dominant-chord splice focus |
| `STYLE_ANDREW_HILL` | **2** | All patterns; angular, discontinuous |
| `STYLE_SONIC_YOUTH` | **2** | All patterns; fires freely across bars |
| `STYLE_ECM_CHAMBER` | **1** | Float patterns only; sparse, restrained |
| `STYLE_PAT_METHENY` | **1** | Float patterns + occasional asymmetric |
| `STYLE_JONI_MITCHELL` | **1** | Float patterns; sparse; alt-tuning context |
| `STYLE_INDIE_ART_POP` | **1** | Gentle float patterns only |
| `STYLE_CHARLIE_PARKER` | **1** | Chromatic approach only; conservative |
| `STYLE_BILL_EVANS` | **1** | Whole-tone float, contracting release only |
| `STYLE_THELONIOUS_MONK` | **1** | Tritone displacement only; sparse |
| `STYLE_DONALD_FAGEN` | **1** | Chromatic approach; very controlled |
| Theatre-style profiles | **0** | Slonimsky layer inactive |

### Thesaurus section → engine mapping

| Thesaurus section | Pattern Nos. | Engine pattern | V3 expansion (directional — not shipped) |
|-------------------|-------------|----------------|------------------------------------------|
| Tritone Progression | **1–26** | `p_tritonePole` | Interpolation variants across **1–26** |
| Ditone Progression | **27–50** | `p_majorThirdCycle` | Triadic / arpeggiated sequences across **27–50** |
| Sesquitone Progression | **51–73** | `p_minorThirdCycle` | Infrapolation / ultrapolation variants (book methodology) |
| Whole-Tone Progression | **74–82** | `p_wholeTone` | Symmetric interpolation (neighbouring rows in chapter) |
| Semitone Progression | **83–90** | `p_chromaticInterp` | Full chromatic-scale patterns in chapter |
| Intervallic series | **186** | `p_expanding`, `p_contracting` | Mirror / companion rows (e.g. **187** — verify index) |
| Heptatonic scales | **1034–1087** | — | Church modes + synthetic scales *(targetable band — §10)* |
| Pentatonic scales | **1142–1190** | — | Five-note variants *(targetable band — §10)* |
| Twelve-tone patterns | **173–175** | — | Early row fragment; later dodecaphonic chapters add parallel material |
| Polytonal scales | **220–223** | — | Simultaneous-tonality patterns *(targetable band — §10)* |
| Permutations | **188** | — | Interval-permutation variants |

Multi-octave chapters (**Quadritone**, **Sesquiquadritone**, **Quinquetone / Diatessaron**) sit in the **91–172** neighbourhood before **173** — exact subsection boundaries **vary by facsimile**; use your index (see main mapping table in § “The 13 sections”).

---

## 10. V1 / V2 / V3 roadmap

| Version | What shipped | Musical effect |
|---------|----------------|----------------|
| **V1** | Eight patterns, intent mapping, gate for alt-tuning profiles, post-pass wiring | Baseline interval DNA on eligible profiles |
| **V2** | `styleAffinity` + chord-type soft ranking, interpolation layer, per-bar inline wiring (alternate-tuning pilot) | Smarter selection; chromatic passing tones between pattern steps where enabled |
| **V3** (direction) | Heptatonic, Pentatonic, Polytonal chapters; transposition-cycle tooling; deeper ultrapolation / infrapolation | Book-scale development — **not** promised in current builds |

### V3 roadmap — targetable pattern numbers (documentation)

Future engine work is expected to address **specific Pattern No. bands** from the Thesaurus as **first-class targets** (selection / receipts / pedagogy), including at minimum:

- **Heptatonic:** Pattern Nos. **1034–1087**  
- **Pentatonic:** Pattern Nos. **1142–1190**  
- **Twelve-tone (catalogue band):** Pattern Nos. **173–175** *(early rows — parallel material also appears in later dodecaphonic chapters; verify by index)*  

Until those features ship, Composer OS remains on the **eight-pattern** interval DNA set (§3). **No claim** is made that V3 scope is already playable in the app.

---

## Document history

- Converted from **`Slonimsky_User_Guide.docx`** (Slonominsky-Scales project) to Markdown for **`creative-engines/docs/`**, **2026-04-30**.  
- Expanded **§13-section mapping** with pattern bands and edition-aware page guidance; added **Using this guide with the Thesaurus**; updated intro for **1947 source text**; extended **§10** with **V3 targetable pattern numbers**.

---

**Composer OS Slonimsky engine** · Based on Nicolas Slonimsky, *Thesaurus of Scales and Melodic Patterns* (Schirmer / Music Sales lineage, originating **Charles Scribner’s Sons, 1947**) · Engine documentation revision **V2+**

For application-wide Generate workflow, paths, and modes, see **[USER_GUIDE.md](USER_GUIDE.md)**. For engine scheduling and shipped slices, see **[COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md)**.
