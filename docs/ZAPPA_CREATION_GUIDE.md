# Zappa Creation Guide

**Canonical reference** for Composer OS **Frank Zappa** Song Mode work: harmony slice, chord pools, odd-meter Phase A, planned solo engine (Phase B), and PDF-derived research hooks.

---

## 1. Status (what is live now)

**Integration snapshot (2026-05-01)**

- **HarmonyContext (single source of truth)** — **Live.** Frank Zappa uses one immutable **`HarmonyContext`** (`attachFrankZappaHarmonyContext` in `frankZappaSlice.ts`): `precomputeFrankZappaEffectiveHarmonyBars` runs only during that attach path; golden-path score build, **`getChordForBar`**, MusicXML export truth, and locked-harmony validation all read the same frozen **`bars`** + **`checksum`** (see `harmonyContext.ts`, `harmonyResolution.ts`, `runGoldenPath.ts`).
- **barMeterMap UI** — **Live** on Generate (**`HomeGenerate.tsx`**). Per-bar meter is selectable in the UI; **MusicXML** wiring for every export path is still **pending** where the roadmap marks follow-up (export layer already supports **`barMeterMap`** when supplied).
- **Smoke tier** — **111** PASS / **0** FAIL, **31** suites (`npm run test:composer-smoke` from repo root; allowlist in `engines/composer-os-v2/tests/runSmokeTests.ts`).

### Songwriter identity

| Item | Detail |
|------|--------|
| **Canonical id** | `frank_zappa` (`SongwriterRuleId`) |
| **Aliases** | `frank_zappa`, `zappa`, `fz` — resolved via `normalizeSongwriterStyleKey` in `songwriterStyleProfiles.ts` |
| **UI** | Generate → Songwriter list includes **Frank Zappa** (`HomeGenerate.tsx`) |
| **Golden-path slice** | `engines/composer-os-v2/core/song-mode/frankZappaSlice.ts` (re-export `goldenPath/frankZappaSlice.ts`) |
| **Precompute** | `precomputeFrankZappaEffectiveHarmonyBars` — fills `frankZappaEffectiveHarmonyBars` on `GenerationMetadata` |
| **Receipt format** | `fz:d{1–5}:<device_label>@bar{N}#v1` |
| **Smoke** | `frankZappaSliceSmoke.test.ts` + row in `runSmokeTests.ts`; aggregate smoke **111 / 0**, **31** suites |

### What the slice does (summary)

- Reads source harmony per bar from locked progression or `getChordForBar`, then applies **at most one** harmonic device per bar (deterministic seed scheduling).
- **Hook / identity bars** skip mutation (`isProtectedBar`, motif bars **9** and **17**).
- **d2 metric displacement** requires a chord **without** an existing slash bass (`sym0.includes('/')` → not eligible).
- **d5 through-composed cut** only at **section starts** after bar 1.
- Diagnostics and slice receipt land on `GenerationMetadata` (`frankZappaDiagnostics`, `frankZappaSliceReceipt`, `frankZappaDeviceReceipts`, eligibility stats, anti-elaboration guard counters).

### Chord scaffolding (pools)

- **`SONGWRITER_CHORD_POOLS.frank_zappa`** in `songModeBuilder.ts` — five **tagged** pool buckets per section (`verse` / `chorus` / `bridge` / `pre_chorus`): **`7alt`**, **`m7b5`**, **`maj7#11`**, **`tritone_rooted`** (slash / pedal), **`doo_wop_clash`**.
- Every Frank Zappa row sets **`noIiVi: true`** at the tag level; **`breakFrankZappaIiViProgressions`** runs after rhythm shaping when `songwriterId === 'frank_zappa'`, breaking rolling major-key **ii–V–I** triples by substituting altered / Lydian / sus colours on the middle or final chord (see `songModeBuilder.ts`).
- **`frankZappaIiViRollingTriplePresent`** — exported detector for smoke/tests (no rolling ii–V–I window).

### Registry (research / receipts)

- `songwriterRuleRegistry.ts` lists **Frank Zappa** rule stubs (`zappa.polytonal_superimposition`, `zappa.metric_displacement`, etc.) — placeholders for documentation weighting; **runtime behaviour** is driven by **`frankZappaSlice.ts`** + pools above.

### Odd-meter Phase A (shared infrastructure)

Live for **export + quantisation** (not yet wired into default golden-path generation unless you pass options / maps):

- **`CompositionContext.barMeterMap`** / **`GenerationMetadata.barMeterMap`** — optional `Record<number, { numerator, denominator }>` (1-based bars); absent ⇒ **4/4**.
- **`core/rhythm/oddMeterQuantiser.ts`** — `quantiseToMeter`, `measureDivisionsForMeter`, `resolveMeterForBar`, etc.
- **`MusicXmlExportOptions.barMeterMap`** — per-bar `<time>` in `musicxmlExporter.ts` when meter changes.
- Smoke: **`oddMeterInfrastructureSmoke.test.ts`** (mixed 4/4 → 7/8 → 5/8 fixture).

---

## 2. Composing Mixed-Meter Zappa Pieces (Phase A — in progress)

**Goal:** structural odd meters and truthful MusicXML time signatures **before** claiming Zappa-realistic solos (Phase B).

Per **`docs/COMPOSER_OS_ROADMAP.md`** (**§ HIGH PRIORITY — Odd Meters + Zappa Solo Engine**):

| Delivered / in flight | Role |
|----------------------|------|
| Bar-level meter map on composition context + metadata | Single source for “what meter is this bar?” |
| **`oddMeterQuantiser.ts`** | Snap pulses to beat grids; supports **5/8**, **7/8**, **7/16**, **9/8**, **11/8**, **19/16**, mixed bar-by-bar; **4/4** when bar not in map |
| MusicXML **`<time>`** at meter boundaries | Per-part attributes when meter changes vs previous bar |
| Smoke with **4/4 \| 7/8 \| 5/8** map | Guards regressions |

**Composer workflow (today):**

1. Build / choose harmony as usual (**Frank Zappa** primary ⇒ pools + slice + ii–V–I break).
2. For odd-meter export tests or custom pipelines, supply **`barMeterMap`** on export options (and keep metadata in sync if you mirror context).
3. **Phrase / note content** in the main duo pipeline is still largely **quarter-grid–oriented**; full odd-meter **melody** parity awaits Phase B + tighter coupling to `beatSpanToTicks` / score builder (see roadmap scheduling note).

---

## 3. Zappa Solo Engine (Phase B — planned)

**Roadmap intent** (same HIGH PRIORITY section):

- **Slonimsky** traversal over **Zappa chord pools** as the melodic backbone (links **Tier D** Slonimsky Etudes vocabulary to Generate-facing output).
- **Xenochrony** as **rhythmic displacement of the melodic line** — not only the harmony-level **d3** semitone nudge in `frankZappaSlice.ts`.
- **Odd-meter grid awareness** in the solo generator — **depends on Phase A** meter map + quantiser.

Harmony slice **d3** today (`xenochrony_pitch_offset`): ±1 semitone transpose on root — Phase B explicitly widens scope to **rhythm / timeline** xenochrony.

---

## 4. Applying Zappa Techniques to Other Styles

| Mechanism | Scope |
|-----------|--------|
| **Frank Zappa devices (d1–d5)** | Only when **`songwriterStyleId === 'frank_zappa'`** after alias resolution — no automatic cross-writer application. |
| **Chord pool vocabulary** (`7alt`, `m7b5`, `maj7#11`, tritone slash, doo-wop clash) | Designed for Zappa row tags; reusing symbols in **custom locked harmony** is fine musically, but **ii–V–I breaking** and row selection run only for **`frank_zappa`** pool path. |
| **Pairing / secondary writer** | Follow existing duo rules: secondary profiles don’t run the Zappa precompute unless primary resolves to **`frank_zappa`** (same pattern as other slices). |
| **Polytonal / altered language** | Other jazz slices (e.g. Wayne Shorter, Andrew Hill) use different device sets — avoid assuming **`fz:*`** receipts outside Zappa. |

**Practical takeaway:** To “borrow” Zappa-like harmony, either select **Frank Zappa** as primary or paste a **custom progression** that mimics pool vocabulary; for engine-level devices you need the **Zappa** slice active.

---

## 5. Arrangement Layer — String Quartet / Big Band (future)

Not Zappa-specific: ensemble **Big Band** and **String Quartet** paths use separate orchestration / realisers (`runQuartetRealisation`, big-band planning, Wyble maps, etc.).

**Roadmap relationship:**

- **Four engine pillars #1** (ensemble grammar) and **import/harmony** tier — Zappa **duo Song Mode** ships first; **BB/SQ** chart-in and arrangement depth are parallel tracks (see **COMPOSER_OS_ROADMAP.md** — ensemble + import sections).
- Odd-meter **export** already flows through shared **`exportScoreModelToMusicXml`**; future **Zappa big-band reductions** would reuse meter maps once ensemble builders consume **`barMeterMap`** end-to-end (not guaranteed today per part).

---

## 6. PDF Analysis Findings (reference)

> **OCR completed 2026-05-01.** Tesseract 5.4 + PyMuPDF at 220 DPI. Full machine-readable output in **`docs/zappa-analysis/frank-zappa-guitar-book.json`** and **`docs/zappa-analysis/over-nite-sensation.json`**.

---

### 6.1 The Frank Zappa Guitar Book (Steve Vai, Hal Leonard 1983)

**Source:** `Zappa Resources/Frank-Zappa-The-Frank-Zappa-Guitar-Book.pdf` — 303 pages, 67 sampled (every 5th page plus first 8). Image-only scan; no text layer.

#### Interval patterns

Tab fret-difference analysis (50 fret numbers extracted from sampled pages):

| Semitones | Interval | Occurrences | Musical context |
|-----------|----------|-------------|-----------------|
| 1 | Minor 2nd | 15 | Chromatic approach / semitone neighbour |
| 2 | Major 2nd | 10 | Stepwise diatonic motion |
| 3 | Minor 3rd | 6 | Pentatonic skip |
| 4 | Major 3rd | 4 | — |
| 6 | Tritone | 2 | Polytonal dissonance device |
| 5 | Perfect 4th | 1 | Open-string jump |

**Cross-reference (Little Dots thesis):** The **descending minor 6th (−8 semitones)** appears at corresponding structural positions in both Pink Napkins `[a2]`/`[a'2]` and The Black Page `[DF]`/`[DF']` — a recurring **identity marker** across unrelated works. Not prominent in OCR tab sample (low fret-count yield from notation-only pages) but analytically confirmed.

#### Tuplet groupings

Extracted from notation bracket digits across 67 sampled pages. Fret-number lines excluded from count.

| Grouping | Label | OCR hits |
|----------|-------|----------|
| 3 | Triplet (3:2) | **386** |
| 7 | Septuplet (7:4) — polyrhythmic | **184** |
| 4 | Quadruplet | 183 |
| **5** | **Quintuplet (5:4) — signature Zappa** | **135** |
| 6 | Sextuplet | 116 |
| 8 | 8-tuplet | 85 |
| 9 | Nonuplet | 54 |
| 11 | 11-tuplet — extreme subdivision | 4 |

Confirmed by Little Dots analysis of The Black Page m.4: a single measure contains 4 / 3 / 5 / 7 subdivisions on successive beats (4 as 32nd notes → 3 as 32nd-note triplets → 5 as 32nd quintuplets → 7 as 16th septuplets). Be-Bop Tango uses a 7+4+5 internal split inside a large triplet spanning 4 beats — the most rhythmically complex measure Clement identifies.

#### Unmeasured cadenza sections

OCR detected **`NO METER`** as a confirmed section label in the notation. Zappa uses unmeasured cadenza sections within otherwise metered solos — no factory-pulse for those bars. Phase B solo engine should model these as free-time spans.

#### Scale / mode findings

| Chord type | Scale / mode | Source |
|------------|-------------|--------|
| Minor 7th vamp (C#m7, Bm7) | **Dorian** — natural 6th preferred over Aeolian b6 | Little Dots, Pink Napkins |
| Major 7th / major-add9 (DM7, G2, Bb2) | **Lydian** — generated from chord root; no dissonant degrees | Little Dots, Black Page |
| Two-chord semitone vamp (C#m7–DM7) | **C# Dorian → D Lydian** shift on each bar change | Little Dots, Pink Napkins |
| Atonal sets [0236] / [0137] | No conventional scale; [0137] = augmented 11th chord / “bebop aroma”; [0236] = 7alt equivalent | Little Dots, Be-Bop Tango |
| i–bVI7 vamp (Bm–G7) | B minor pentatonic sustained across both chords (outside approach) | GW analysis |
| i–bIImaj7 (Bm7–Cmaj7) | B minor pentatonic + chromatic approach; no scale shift to Cmaj7 | GW analysis |

OCR scale-word hits: **Mixolydian** (1), **Lydian** (1) — low count expected; solo pages carry no analytical prose.

#### Rhythmic displacement techniques

- **Mosaic process (Clement):** same motive tile shifted by beat, 16th, or 32nd note across adjacent factory cycles.
- **Motive-z displacement:** doubly-articulated pitch appears at start of group in m.1; displaced by one 32nd note to within-group position at m.16.
- **Factory-cycle phrasing:** rapid note cluster (rhythmic dissonance, 23/24-style) → long-held note (pulse restoration) = one cycle. Phrase-end note value determines cycle strength: whole+quarter (strongest) → quarter (weakest, forces extra bar).
- **Open-string motif (Apostrophe):** same 4-note cell starts on a different beat position in each of 3 consecutive repetitions (confirmed GW analysis).

#### Characteristic devices

1. String bends (standard + microtonal 3/4-step)
2. Tremolo picking / vibrato on sustained pitches
3. Tapping (Steve Vai transcription era)
4. Cycled 4-note motifs with rhythmic displacement across bars
5. Open-string pull-offs as ornamental / structural elements
6. Poly-scale approach (Dorian / Lydian per chord) over static vamps
7. `NO METER` unmeasured cadenza spans
8. sforzando (`sfz`) dynamics — 7 hits across sample; wide dynamic range (ppp → fff)

#### Dynamic profile

`f` 54 · `mf` 13 · `ff` 13 · `sfz` 7 · `p` 28 · `mp` 7 · `pp` 3 · `fp` 2 · `ppp` 1

#### OCR limitations

- **Solo notation, no chord symbols** — chord detection yielded only `C6` (2 hits, probable noise). Scale / chord findings sourced from Little Dots thesis cross-reference rather than OCR.
- Tuplet digit counts include noise from fret numbers on tab lines; tab lines were excluded from tuplet pass where detectable.
- 67/303 pages sampled — late-book solos (Sheik Yerbouti, Joe's Garage) under-represented; full-book re-run at smaller step would refine interval distribution.

---

### 6.2 Over-Nite Sensation (1973 songbook)

**Source:** `Zappa Resources/FrankZappaFrankZappa-Over-NiteSensation-pdf.pdf` — 99 pages, all sampled. Image-only scan; no text layer.

#### Chord symbol statistics

234 total chord hits · 49 unique chord symbols across 99 pages.

**Top 12 chords by frequency:**

| Chord | Hits | Type |
|-------|------|------|
| Am7 | 26 | Minor 7th (primary vamp) |
| C7 | 17 | Dominant 7th |
| Bm7 | 12 | Minor 7th |
| Dm7 | 12 | Minor 7th |
| D7 | 10 | Dominant 7th |
| **B7sus4** | 8 | **Suspended dominant** |
| Ab7 | 8 | Dominant 7th (flat-III / flat-VII colour) |
| Cm7 | 9 | Minor 7th |
| Em7 | 8 | Minor 7th |
| Db7 | 8 | Dominant 7th (chromatic neighbour of C7) |
| **Fmaj7#11** | 3 | **Lydian major-7 — #11 confirmed** |
| **Bbmaj7** | 4 | Major 7th |

Minor 7th chords (Am7, Bm7, Dm7, Cm7, Em7, F#m7, Ebm7, Bbm7, Fm7, G#m7) account for the majority of non-dominant hits — confirms the Dorian vamp language.

#### Interval patterns (tab/notation)

133 fret numbers extracted (more than guitar book due to songbook layout mixing tab and notation):

| Semitones | Interval | Occurrences |
|-----------|----------|-------------|
| 1 | Minor 2nd (semitone) | **44** |
| 3 | Minor 3rd | **25** |
| 2 | Major 2nd | 10 |
| 4 | Major 3rd | 3 |
| 5 | Perfect 4th | 3 |
| 6 | Tritone | 2 |
| 8 | Minor 6th | 2 |

Semitone and minor-3rd dominance confirms pentatonic + chromatic-approach as the primary melodic language on this album.

#### Harmonic progressions confirmed

| Progression | Occurrences | Reliability | Notes |
|-------------|-------------|-------------|-------|
| **C7 → Db7** | 6 | **HIGH** | Semitone-ascending dominant slide — canonical d4 juxtaposition device |
| Am7 (static vamp) | 26 | HIGH | Primary single-chord vamp; supports Dorian / minor pentatonic |
| B7sus4 | 8 | HIGH | Suspended dominant; avoids tritone resolution (no ii–V–I) |
| Fmaj7#11 | 3 | HIGH | Lydian #11 colour directly confirmed |
| C7sus4, Db7sus4, B7sus4 (family) | 4+4+8 | HIGH | Sus4 dominant chain; non-resolving harmonic stasis |

Single-letter OCR pairs (E→B, D→E, B→A etc. — 25/21/19 hits) are **guitar-string-label noise** (open strings E–B–G–D–A–E appear on every tab page) and are excluded from the confirmed set.

#### Scale / mode findings

| Chord type | Scale / mode |
|------------|-------------|
| Minor 7th (Am7, Bm7, Dm7…) | Dorian / natural minor / minor pentatonic |
| Dominant 7th (C7, D7, Db7…) | Mixolydian / blues pentatonic (alt scale where b9/#9 decoration present) |
| Major 7th (Bbmaj7, Fmaj7#11) | **Lydian** confirmed by #11 decoration on Fmaj7 |
| Altered dominant (Cb9, Db9, Ab9) | Altered scale (super-Locrian) / diminished half-whole |

#### Tuplet groupings

| Grouping | OCR hits |
|----------|----------|
| 4 | 394 |
| 7 (septuplet) | 361 |
| 3 (triplet) | 233 |
| **5 (quintuplet)** | **183** |
| 6 | 108 |
| 9 | 104 |
| 8 | 59 |
| 12 | 7 |

The 7-tuplet dominance (361 hits across all 99 pages) confirms the septuplet as a primary melodic vehicle in this era — aligns with Be-Bop Tango's conjunct septuplet main theme.

#### Rhythmic displacement

Over-Nite Sensation is primarily an ensemble songbook (not a guitar-solo document); displacement devices are more prominent in the contemporaneous live solos. Relevant principles that apply to this era:

- Factory-cycle burst → long-held note restoration (Clement, all analysed works)
- Speech-influenced rhythm (Zappa's term): odd groupings (5, 7, 13) derived from speech metre — naturally produces displacement without calculation
- Mosaic displacement: motive tile shifted by beat or 16th note across adjacent cycles

#### Characteristic devices

1. Wah pedal articulation — **8 hits** (most-mentioned technique; confirms 1973 Cosmik Debris / Montana solo style)
2. Rake technique — 4 hits
3. Slides between chord tones — 2 hits
4. Lydian #11 voicings (Fmaj7#11)
5. Sus4 dominant chords as non-resolving harmonic stasis
6. Chromatic dominant-7 semitone slides (C7→Db7)
7. Flat-VII dominant colour (Cb7, Ab7, Db7)
8. Cycled 4-note motifs with rhythmic displacement

#### Dynamic profile

`f` 113 · `mf` 22 · `p` 23 · `ff` 8 · `fp` 5 · `mp` 3

Louder overall than guitar book (f:p ratio ~5:1 vs ~2:1). fp (accent-then-decay) gestures present.

#### Tempo character

`Moderately` (5) · `Moderate` (2) · `slow` / `Slow` (4 combined) — predominantly mid-tempo ensemble rock. No `fast` hits (contrast with guitar book's solo-flashpoint `slow` / `fast` markers).

#### OCR limitations

- Chord symbols were machine-readable (OCR resolved 49 unique symbols) but single root-letter matches (A, B, D, E, F, G) are unreliable without quality suffix; filtered from progression analysis.
- `1/4` time-signature hit (12 occurrences) likely OCR noise from note values or bar numbers, not a genuine meter change.
- Lyrics present but not analysed; lyric text inflates word-level OCR counts for technique keywords.

---

### 6.3 Cross-source synthesis (both PDFs)

| Finding | Guitar Book | Over-Nite Sensation | Slice mapping |
|---------|-------------|---------------------|---------------|
| Semitone as #1 melodic interval | 15 hits | 44 hits | d3 `xenochrony_pitch_offset` (±1 semitone root shift) |
| Minor 3rd skip | 6 hits | 25 hits | Pentatonic minor foundation for d5 through-composed cuts |
| Tritone presence | 2 hits | 2 hits | d1 `polytonal_superimposition` (tritone slash bass) |
| Quintuplet (5:4) | 135 hits | 183 hits | Phase B rhythm engine — primary odd-tuplet target |
| Septuplet (7:4) | 184 hits | 361 hits | Phase B — even more prevalent than 5:4 |
| Lydian over major chords | OCR 1 hit + thesis confirmed | Fmaj7#11 3 hits | `maj7#11` pool bucket; ii–V–I Lydian substitutions |
| Dorian over minor vamps | Thesis confirmed | Am7/Bm7/Dm7 dominant | Scale selection for fz:d5 section cuts |
| No ii–V–I resolution | Thesis: avoids tonal resolution throughout | B7sus4 / C7sus4 non-resolving | `breakFrankZappaIiViProgressions` + `noIiVi: true` tag |
| Chromatic semitone harmonic slides | Thesis: C#m7→DM7 semitone root | C7→Db7 (6 OCR hits) | d4 `style_juxtaposition` — chromatic dominant motion |
| Factory-cycle phrasing | Thesis: all 3 analysed works | Implied | d2 `metric_displacement` conceptual basis |
| Wah pedal | Not in guitar book era | 8 hits (1973) | Phase B articulation layer |

### Machine-readable workspace files

Full JSON payloads under **`docs/zappa-analysis/`**:

| File | Contents |
|------|----------|
| `frank-zappa-guitar-book.json` | OCR extraction + Little Dots enrichment: scaleModeOverChordTypes (6 entries), harmonicProgressions (5 entries + noise-flagged), tuplet table, dynamics, synthesisNotes |
| `over-nite-sensation.json` | OCR extraction: 49 unique chords, confirmedHarmonicProgressions (5 entries), scale-over-chord table, tuplet table, synthesisNotes |
| `soloing-strategies-gw.json` | Guitar World analysis: pentatonic/blues language, 5:4 grouping philosophy quote, open-string pull-offs, motif displacement |
| `little-dots-fsu-thesis.json` | FSU thesis analysis: Pink Napkins, Black Page, Be-Bop Tango — factory-cycle, motive-z, mosaic displacement, Lydian/Dorian rule |
| `*.analysis.json` | Raw pdftotext / pypdf lexical stats payload from first-pass analysis pipeline |

---

## 7. Roadmap Cross-Reference

| Document / artifact | What to read |
|---------------------|--------------|
| **`docs/COMPOSER_OS_ROADMAP.md`** | **§ HIGH PRIORITY — Odd Meters + Zappa Solo Engine** — Phase A vs B, PDF bullets, scheduling (Phase A horizontal → Phase B after mixed-meter smoke). |
| **`docs/CHANGELOG.md`** | Ship dates / breaking notes when Zappa slice or smoke counts change. |
| **`CLAUDE.md`** | **`npm run test:composer-smoke`** aggregate row count — update when **`runSmokeTests.ts`** allowlist changes. |
| **`engines/composer-os-v2/core/song-mode/frankZappaSlice.ts`** | Device constants, rates **d1–d5**, eligibility, receipts. |
| **`engines/composer-os-v2/core/song-mode/songModeBuilder.ts`** | **`SONGWRITER_CHORD_POOLS.frank_zappa`**, **`breakFrankZappaIiViProgressions`**, **`FrankZappaRowTags`**. |
| **`engines/composer-os-v2/core/rhythm/oddMeterQuantiser.ts`** | Phase A quantiser + meter resolution. |
| **`engines/composer-os-v2/tests/frankZappaSliceSmoke.test.ts`** | Contract for **`fz`** alias + metadata fields. |
| **`engines/composer-os-v2/tests/oddMeterInfrastructureSmoke.test.ts`** | Phase A mixed-meter export smoke. |

**External:** Python **`engines/zappa-disruption-engine`** — **Composer Studio** / IR composer; **not** wired to **`composer-os-v2`** Generate (see roadmap Tier A notes on `frank_zappa`).

---

### Appendix — Devices **d1–d5** (implementation truth)

| Device | Id | Typical effect (harmony symbol) |
|--------|-----|-----------------------------------|
| **d1** | `polytonal_superimposition` | Slash bass at **tritone** of root; upper colour **7alt** or **m7b5** when quality generated |
| **d2** | `metric_displacement` | Slash bass — chromatic bass **±3 or ±4** semitone steps from root |
| **d3** | `xenochrony_pitch_offset` | Root transpose **±1** semitone |
| **d4** | `style_juxtaposition` | **Doo-wop ↔ altered**: bare triads → **7alt** / **maj7#11**; dense altered → simplify toward triad / **m** |
| **d5** | `through_composed_cut` | Root transpose by **+5, +6, +7, −5** semitones at section starts |

Target stochastic weights (planning): **d1** 0.38, **d2** 0.32, **d3** 0.28, **d4** 0.26, **d5** 0.22 — see constants in **`frankZappaSlice.ts`**.
