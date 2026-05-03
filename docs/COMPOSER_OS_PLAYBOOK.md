# Composer OS Playbook

> ⚠️ **LIVING DOCUMENT** — Update this file whenever new features, composers, meter presets, or presets are added to Composer OS.
> Regenerate the DOCX with: `node scripts/generateComposerOsPlaybookDocx.mjs`
> Then commit both files together.

---

## Real Book MusicXML import

Charts saved as **MusicXML** (Finale / MuseScore / Sibelius **partwise** export) can be fed through the **lead-sheet importer** for harmony timelines, keys, repeats, and (limited) melody extraction. This section matches what the engine’s **Real Book stress** regression exercises (`engines/composer-os-v2/tests/realBookStressTest.test.ts`, smoke suite **Real Book MusicXML stress**).

### What the stress test validates

- **Repeat navigation** — `<barline>` forward/back repeats, **volta** (`<ending>` start/stop), **segno** / **D.S.** / **To Coda** / **coda** directions and `<sound>` jumps (`expandMeasureVisits` in **`leadSheetMusicXmlImport.ts`** produces a deterministic visit order).
- **Key changes** — mid-score `<attributes><key><fifths>…</fifths></key>` blocks populate **`LeadSheet.keyChanges`** (bar index aligns with the importer’s logical bar mapping).
- **Complex rhythm / chords** — high `<divisions>` grids and multiple `<harmony>` elements per measure, including **`<offset>`** (divisions from measure start) → beat-accurate **`importedHarmonyTimeline`** entries.
- **Multiple voices** — `<voice>1</voice>` vs `<voice>2</voice>`: chord symbols still parse; **voice 1** drives **`melodyEvents`**; extra voices log a warning (see limitations below).

### How to import a Real Book chart

1. Provide **score-partwise** XML (not timewise). The importer reads the **first `<part>`** as the lead line.
2. Entry points:
   - **`importLeadSheetFromMusicXml`** — **`leadSheetMusicXmlImport.ts`** (measures, chords, melody, repeats, keys).
   - **`parseImportedHarmonyEvent`** — **`importedHarmonyTimeline.ts`** — storage-only parse of each `<harmony>` chunk (root/kind/bass/degrees, time via divisions + offset).
   - **`sortImportedHarmonyTimeline`** — stable ordering by bar, beat, event index.
3. Display chord strings for the lead sheet come from **`parseHarmonySymbol`** on the same `<harmony>` blocks; they are merged into **`LeadSheet.chordEvents`** and deduped.

### repeatMarkers (UniversalLeadSheet)

**`parseRepeatMarkers`** scans each measure for barline **repeat forward/back** and **`<ending>`** volta tags. **`buildUniversalLeadSheetFromImportedLeadSheet`** maps **`LeadSheet.repeatMarkers`** onto **`UniversalRepeatMarker`**: **`repeat_start`**, **`repeat_end`**, **`ending_start`**, **`ending_stop`** (optional **`endingNumber`**). Jump semantics (**D.C.**, **D.S.**, **coda**) affect **how many logical bars** are visited, not a separate MusicXML “marker kind” in this contract—expect repeat/volta markers where the exporter emitted barlines.

### Key changes

When the importer records attributes for a measure (`emitKeyChangesAndSection`), each **`<key>`** inside that measure appends **`{ bar, fifths, mode? }`** to **`LeadSheet.keyChanges`**. The first key also seeds **`keySignature`** when present.

### Chord timeline (beats, offsets, collisions)

- Timeline events sort by **bar**, **beat** (offset ÷ divisions), then **harmony index** in the measure.
- **`dedupeChordEvents`** removes redundant duplicates and beat-0 carries from the prior bar; the stress test asserts **no conflicting chord symbols** assigned to the same **(bar, beat)** slot after processing.

### Round-trip sanity check

Regression pattern: **import** → **`buildUniversalLeadSheetFromImportedLeadSheet`** → minimal **`ScoreModel`** (**`createPart`** + measure-level **`chord`** + whole-bar rests) → **`exportScoreModelToMusicXml`**. This validates **exporter robustness** on representative imported harmony—not bit-identical round-trip to arbitrary publisher XML.

### Known limitations

- **Voices / staves:** Melody capture is **voice 1**, **staff 1** only; other voices and staves are skipped with warnings (**Phase 1** lead-sheet scope).
- **Publisher quirks:** Nested repeats and rare jump combinations may diverge from another tool’s playback; importer **`warnings`** describe caps and fallbacks.

---

## 1. Introduction and scope

Composer OS is a **deterministic**, **seeded** composition pipeline: the same request + seed yields the same score, receipts, and MusicXML. This playbook orients you to **Generate**, **Song Mode**, **presets**, **diagnostics**, and **export**—and gives **40 repeatable scenarios** you can step through for QA or teaching.

**Who this is for:** composers, producers, arrangers, educators, and developers integrating the app or API.

**What Composer OS is not:** a DAW replacement for mixing/mastering, or a guarantee of a specific commercial style hit—it encodes **musical rules and writer slices** that produce **consistent, inspectable** output.

### Scenario 1: What “seeded determinism” means for you

Pick a **seed** and **preset**, generate twice with identical fields—the **MusicXML bytes** and **metadata receipts** should match. Use this when **regression-testing** a slice or reporting a bug (always attach seed + preset + writer).

**Tip:** Treat the seed as the “take number”; lock it while iterating harmony or arrangement tweaks elsewhere in the form.

### Scenario 2: Reading the output manifest

After Generate, scan **readiness**, **export integrity**, **writer receipts** (`fz:*`, `kb:*`, …), and **device rates** (d1–d5). Green paths mean the pipeline sealed; amber/red points to the **first failing guard**—fix upstream (preset, lock, or slice), not the exporter, unless the error is explicitly XML.

**Tip:** Receipt prefixes group diagnostics by songwriter slice; search the codebase or docs for the token when filing issues.

### Scenario 3: Scope boundaries (pipeline vs. host)

Composer OS ends at **valid MusicXML** and **metadata**. **Sibelius**, **MuseScore**, and **DAWs** own layout, sound, and stem direction preferences—import freshness depends on **house style** and **expression maps**.

---

## 2. First launch and the Generate screen

The web and desktop apps share the same **Generate** contract (`GenerateRequest` → `OutputManifest`). Fields cluster into **mode**, **writer/arranger**, **harmony/rhythm**, **ensemble**, and **export**.

| Area | What to set first |
|------|-------------------|
| Mode | Song Mode vs ensemble-focused presets |
| Writer | Golden-path slice ID or alias (see §3) |
| Era / pairing | UI hints for arranger ↔ style pairing |
| Seed | Integer; lock while comparing outputs |

### Scenario 4: Account for UI grouping

Dropdowns use **optgroups** (Songwriters, Arrangers, Eras). Screen readers get **labels** and **describedby** context—keep browser zoom ≤125% for dense rows when demoing.

### Scenario 5: Choosing a seed strategy

Use **low seeds** for documentation screenshots; use **large primes** when brute-forcing odd-meter maps or stress-testing phrase windows. **Document the seed** in lesson plans.

### Scenario 6: When Generate stays disabled

Mandatory fields empty, conflicting locks, or **readiness preflight** from the app—fill **title**, **mode**, and **primary writer** (Song Mode) before debugging deeper.

---

## 3. Song Mode and golden-path writers

Song Mode applies **writer slices**: each slice owns **harmonic devices (d1–d5)**, **anti-elaboration guards**, and **precomputed effective harmony** feeding MusicXML and assertions.

| Concept | Meaning |
|---------|---------|
| Slice | TypeScript module implementing the writer’s harmonic language |
| d1–d5 | Five named devices with eligibility + receipts |
| Locked harmony | Bars routed so export **matches** `getChordForBar` after precompute |

**Aliases:** Many writers register shortcuts (`monk`, `bird`, `fz`, …)—try them in quick experiments.

### Joni Mitchell (Song Mode — open tunings, modal harmony)

**Joni Mitchell** is a **shipped golden-path slice**: **`joniMitchellSlice.ts`**, **`jm:*`** device receipts, **`joniMitchellEffectiveHarmonyBars`** feeding **`getChordForBar`** and locked MusicXML truth (same pattern as Radiohead / James Brown). Pools emphasize **modal**, **pedal**, and **open-tuning-friendly** colours (**add9**, **sus2/sus4**, **slash** pedals, **maj(add9)** rows — see **`SONGWRITER_CHORD_POOLS.joni_mitchell`**).

**Alternate tuning:** Style **`STYLE_JONI_MITCHELL`** surfaces the **`joni_mitchell`** **zone** in **Generate**’s alternate-tuning selector (`alternateGuitarTunings.ts`). Voicing maps vs every preset remain a **follow-up** where the Tonality Vault is thin—if comp feels disconnected, compare **standard** vs labelled open preset on the same **seed**.

### Scenario 7: Picking a writer for a lesson plan

Match **pedagogical goal** to slice: e.g. **ii–V devices** (bebop), **angular harmony** (Monk/Hill), **theatre harmony** (Sondheim/Bacharach), **modal ECM** sparsity.

### Scenario 8: Duo vs single-line outputs

Duo paths emphasize **guitar/bass** interplay; confirm **instrument names** and **clefs** in MusicXML if students import into Sibelius for homework.

### Scenario 9: Writer receipts as rubric points

Turn **d1–d5 hit rates** and **guard receipts** into a **checklist** for student arrangements—did their manual reharmonization respect similar constraints?

### Sonic Youth (dual guitar, noise harmony, and texture)

**Still current (engine + docs alignment):** **`sonicYouthSlice.ts`**, **`sy:*`** receipts, **`sonicYouthEffectiveHarmonyBars`**, **`ChordEvent.sonicYouth`** + **`SYTextureState`** (**`sonicYouthTextureEngine.ts`** / **`sonicYouthChordGuards.ts`**), MusicXML texture ornament mapping on comp chords (**`musicxmlExporter.ts`**), smoke **`sonicYouthSliceSmoke.test.ts`** + **`sonicYouthTexture.test.ts`**.

**Sonic Youth** is a **duo / dual-electric** slice: harmony uses **`sy:*`** device receipts and **`sonicYouthEffectiveHarmonyBars`** (same **getChordForBar** truth pattern as other locked-harmony writers). On comp **`ChordEvent`s**, optional metadata lives on **`ChordEvent.sonicYouth`** (`SonicYouthExtension` in **`sonicYouthChordTypes.ts`**).

**Alternate tunings workflow (noise-rock zones)**

1. Set **primary writer** to **Sonic Youth** (aliases resolve via registry).
2. In **Generate**, open **alternate tuning** controls and choose zone **`sonic_youth_noise`** (`getPresetsByZone('sonic_youth_noise')` in **`alternateGuitarTunings.ts`**) — presets label **drone / slack / prepared** colours aligned with the slice.
3. Lock a **seed**, generate, inspect **`sy:*`** receipts + **`sonicYouthDiagnostics`** on the manifest.
4. Export MusicXML: **fixed-offset** tunings that change concert pitch (**Drop D**, **Eb standard**) also emit **`<transpose><chromatic>`** in **measure 1** attributes (**`exportPartTransposeSemitones`**); **scordatura-only** labels stay text (**exportMeasure1TuningWordsByPartId**).

**Two-guitar architecture**

- **`guitar1` / `guitar2`:** each holds a **`GuitarTuningState`** (tuning id, open string MIDI grid, shape id, fret pattern, string mask, **drone** string mask, **noise** level). This models **separate tunings** and **prepared / feedback** colour per instrument.
- **`interGuitarDissonance`:** compact cross-guitar friction (**score** 0–1, interval tallies, **`SYDissonancePreset`**: low / medium / high friction). It pairs with the texture engine’s **dissonance** input.

**`SYTextureState` (macro phase, four values)**

1. **`riff`** — cellular, repeating material.  
2. **`shimmer`** — sustained, beating layer.  
3. **`noise_wall`** — high-density / feedback-leaning wall.  
4. **`clearing`** — drop in weight (reset / space).

**`textureState`** on **`SonicYouthExtension`** is the **current** phase for that bar (derived from a deterministic chain from bar 1). **`getNextTextureState(current, noiseLevel, dissonance)`** (`sonicYouthTextureEngine.ts`) advances the cycle:

- Default edge order: **riff → shimmer → noise_wall → clearing → riff**.  
- **`clean`** noise and/or **`low_friction`** bias back toward the **riff / shimmer** side (e.g. from **noise_wall**, the next step may be **shimmer** instead of **clearing**).  
- **`feedback`** noise and/or **`high_friction`** bias toward **noise_wall** (e.g. from **riff** / **shimmer** / **clearing**, the next step may jump to **noise_wall**).  
- **`prepared`** (prepared-piano / prepared-guitar style noise) forces the next state to **`clearing`**.  
- Combined biases use **dissonance** first, then **noise level**, when both pull.

**Guards:** **`isSonicYouthEvent`**, **`getSYTextureState`** (`sonicYouthChordGuards.ts`).

**MusicXML (comp `ChordEvent` with `sonicYouth` only)** — **`musicxmlExporter.ts`** maps texture to the **first notehead** of the chord (stacked tones unchanged):

| Texture      | Notation / dynamics |
|-------------|---------------------|
| **riff**    | No extra dynamics or articulation XML. |
| **shimmer** | **Tremolo** ornament (`<tremolo type="single">3</tremolo>`) — *v1 uses tremolo; wavy-line is not emitted.* |
| **noise_wall** | **Note** `dynamics="127"` (loud / **fff**-class) + **`<stress/>`** articulation. |
| **clearing**   | **Note** `dynamics="24"` (soft / **ppp**-class); no extra articulation. |

Regression: smoke suite **`Sonic Youth texture + MusicXML augmentation`** (`core/score-model/__tests__/sonicYouthTexture.test.ts`).

### Scenario 9b: Sonic Youth texture in the host

After import, **dynamics** and **tremolo** are host-dependent for playback—use this mapping to **teach** texture **intent** (wall vs clearing), not guaranteed studio distortion.

---

## 4. Presets, ensembles, and zones

Presets bundle **instrumentation**, **notation defaults**, and **orchestration hooks**. **Zones** (e.g. jazz sophistication, noise rock, hybrid) influence **tuning presets** and style pairing in the UI.

| Preset family | Typical use |
|---------------|-------------|
| Song Mode core | Lead sheet + rhythm section logic |
| Big Band | Spread orchestration, section behaviors |
| String Quartet | Articulation / voicing templates |

### Scenario 10: Auditioning a zone before committing

Select zone **before** locking seed—changing zone may shift **tuning preset lists** and UI copy; re-seed if you need apples-to-apples comparisons.

### Donald Fagen and Bill Evans — odd-meter presets (`barMeterMap`)

**Song Mode** exposes optional **composer meter presets** for **Donald Fagen** and **Bill Evans** (same UI affordance as **Dave Brubeck**, **Thelonious Monk**, **Wayne Shorter**, **Frank Zappa**): tiled **`barMeterMap`** rows drive per-bar **`<time>`** in MusicXML and phrase quantisation (**`oddMeterQuantiser.ts`**, **`COMPOSER_METER_PRESET_MAP`**). Choosing **All 4/4** omits **`barMeterMap`**.

**Workflow:** Select writer → expand **meter preset** radio block in **Generate** → pick a cycle (e.g. Fagen **7+5**, Evans alternating metres) → lock **seed** → verify **per-bar time signatures** in XML if the host collapses display.

### Scenario 11: Big Band vs String Quartet expectations

Big Band paths carry **sectional orchestration** receipts; quartet paths emphasize **voice-leading** and **bowing proxies**. Expect different **bar density** defaults.

### Scenario 12: Meter map oddities

Some writers use **`barMeterMap`** (e.g. mixed meters). If bars look “short” in the host, verify **host meter interpretation** vs. exported **time signatures** per bar.

---

## 5. Harmony, locks, and diagnostics

**Harmony locks** keep teacher-supplied or sketch progressions authoritative; slices **precompute** altered harmony into **effective bars** used both for **notation** and **assertions**.

| Symptom | Likely cause |
|---------|----------------|
| Chord symbol mismatch | Lock routing vs slice precompute |
| Unexpected altered colour | Device d2/d4 floors on writer |
| Cadence feels “blocked” | Anti-resolution posture (some slices) |

### Scenario 13: Using custom harmony responsibly

Attach **clean chord symbols**; avoid ambiguous slash chords unless the slice documents support—ambiguous parsing falls through to **guards** and may **fail closed**.

### Scenario 14: Interpreting “avoid resolution” slices

Some writers **prefer open cadences**—if your pedagogy needs **V→I**, switch writer or **manual edit after export**.

### Scenario 15: When receipts disagree with your ear

Trust **notation export first**, then **MIDI realization** in the host—some articulations are **semantic** in XML, not sounding until mapped.

---

## 6. Rhythm overlays and phrase engine

Song Mode layers **C1–C7 rhythm overlays** (soft rhythm → funk → ostinato → expression → space) and runs the **phrase engine** (motifs, anticipation, cadential shaping).

| Stage | User-facing effect |
|-------|---------------------|
| Overlays | Groove density, pocket vs float |
| Phrase | Motivic rhythm, breath windows |

### Scenario 16: Cleaning up busy accompaniment

Increase **space** overlay weight or reduce **funk/ostinato** if arranging for **solo clinic** playback—busy defaults educate **groove**, not always **clarity**.

### Scenario 17: Teaching anticipation responsibly

Show students **where** the engine anticipates barlines—then **ask them to align manual melodies** to the same side of the beat for coherent rehearsal.

### Scenario 18: Motif-heavy writers

Slices like **Zappa** expose **motif recurrence** metadata—use seeds that **pass recurrence thresholds** when demoing **development**, not just **variation**.

---

## 7. Export, MusicXML, and host import

Export targets **Sibelius-safe** MusicXML: **polyphonic** parts, **harmony** placement rules per ensemble (e.g. lead-sheet chords on comp staff), **instrument IDs** consistent with GM where applicable.

| Host | Checklist |
|------|-----------|
| Sibelius | House style chord appearance; slash chord fonts |
| MuseScore | Part naming from XML vs long instrument names |
| DAW | Tempo map + articulation map |

### Scenario 19: Piano vs guitar clarity

If **comping staff** is labeled **Piano** but you hear **guitar voicing pedagogy**, remember the **part name** is an **export convention**—sound is host-dependent.

### Scenario 20: Electric guitar octave shifts

Some solo paths apply **written pitch shifts** (documented per writer)—if concert pitch surprises you, verify **transposing instrument** settings in the host.

### Scenario 21: Green vs amber “shareable”

UI may show **Generated (not shareable)** when **integrity** passes but **shareable** flag is false—still useful **locally**; treat **shareable** as **social/export policy**, not musical validity.

---

## 8. Desktop, web, and API

**Desktop** wraps the same **app-api** as the web client. Integrators can call the shared API shape documented in **app-api types**.

| Surface | Strength |
|---------|----------|
| Web | Fastest iteration, URL sharing for presets |
| Desktop | Offline-friendly workflows |
| API/script | Batch evaluation, CI-adjacent smoke |

### Scenario 22: Classroom web demo

Preload **two seeds** (good vs intentionally stressed) to show receipts side-by-side—keep **network quiet** so Generate latency isn’t the story.

### Scenario 23: Windows desktop packaging

Use project scripts (`desktop:dev`, `desktop:build`) per **README**—don’t mix manual Electron flags with the repo’s pinned versions.

### Scenario 24: Headless or batch generation

Mirror **GenerateRequest** fields exactly; **never** bypass **finalizeAndSeal** expectations when piping scores—downstream XML assumes **bar math** validated.

---

## 9. Troubleshooting

| Problem | First checks |
|---------|----------------|
| Empty solo staff | Range, density, writer thresholds |
| Wrong metre feel | `barMeterMap`, phrase windows |
| Crash or OOM | Reduce bars / disable heavy overlays for smoke |

### Scenario 25: “No notes” solo lines

Raise **density**, widen **range**, or pick a seed where **phrase breath** rules leave space without **wiping** the staff—cross-check **writer-specific floors**.

### Scenario 26: Odd meter surprises mid-piece

Inspect **per-bar time signatures** in XML; hosts sometimes **collapse** display until you reset **system breaks**.

### Scenario 27: Pedagogy vs engine defaults

If the lesson requires **rule-breaking**, **export first**, **edit in host**—don’t patch slices for one-off classroom exceptions.

---

## 10. Big Band and ensemble paths

Big Band realisations add **sectional voicing**, **drum notation hooks**, and **ensemble-specific receipts**. Treat them as **arranger assistants**, not finished studio recordings.

### Scenario 28: Brass vs reed balance

Re-seed while holding **section priorities** stable—balance issues are often **voicing rotation**, not master fader problems.

### Scenario 29: Drum guide linkage

If using **SD3** or other drum workflows, cross-read **drum guide docs** in-repo—step-time and orchestration differ from **Song Mode lead sheets**.

### Scenario 30: Importing ensemble XML with credits cleaned

Recent exporters avoid **invalid credit/part-name-display** patterns—if your older file fails, **re-export** from current Composer OS before blaming the host.

---

## 11. Guitar tunings and instrumental edges

**Alternate tuning presets** group by **roadmap zones**—support flags on certain style profiles gate UI surfacing. **Voicing maps** may lag tunings; audition **standard tuning** when maps are absent.

### Alternate tunings workflow (standalone)

Use this checklist **for any writer** where **`styleProfileSupportsAlternateGuitarTuning`** allows the UI (**Indie**, **Sonic Youth**, **Joni Mitchell**, **Pat Metheny**, **ECM Chamber**, etc.):

| Step | Action |
|------|--------|
| 1 | Choose **Song Mode** + **writer** + optional **arranger/era** pairing. |
| 2 | Open **alternate tuning** — presets are grouped into **zones**: **`jazz_sophisticated`**, **`sonic_youth_noise`**, **`joni_mitchell`**, **`hybrid_harmonic`** (`getPresetsByZone`). |
| 3 | Pick **shared** vs **separate** dual-guitar tuning mode when using duo / Indie routes. |
| 4 | Generate and verify **manifest** tuning resolution + **`alternateGuitarTunings`** receipts where emitted. |
| 5 | Export **MusicXML**: **Drop D** (−2 semitones) and **Eb standard** (−1) write **`<transpose><chromatic>`** under **measure 1** `<attributes>`; other presets remain **direction text** unless they carry a fixed chromatic offset in the model. |

Regression: **`alternateGuitarTunings.test.ts`** + smoke tier row **Alternate guitar tunings (zones + texture)**.

### Scenario 31: Teaching Joni or Sonic Youth zones

Start from **zone preset list**, then **narrow** to lesson-friendly voicings—noise-rock clusters may **overload** beginners even if rules pass.

### Scenario 32: Pat Metheny / ECM colours

Pair **ECM-style modal sparsity** with **long seeds** to avoid **phrase repetition** reads in sparse textures.

### Scenario 33: Hybrid harmonic experiments

**Hybrid** zone combines vocabulary—use **writer locks** to stop **clashing functional languages** when stacking experiments.

---

## 12. Workflow recipes

### Scenario 34: One-hour workshop (lead sheet)

**Song Mode** → writer with clear **symbolism** → lock seed → export → **Sibelius house style** cleanup → discuss **receipts vs choices**.

### Scenario 35: Odd-meter composition club

Pick writer with **`barMeterMap`** support → chart **accent buckets** for students → compare **two seeds** with identical maps.

### Scenario 36: Critical listening lab

Generate **two writers** on same **macro harmony sketch** (manual lock) → compare **device receipts**—translate to **student arranging homework**.

---

## 13. Roadmap awareness and maintenance

Composer OS evolves—**roadmap** and **changelog** track slices and smoke tiers. When you add **writers**, **presets**, or **meter maps**, update **this playbook** and regenerate **DOCX**.

### Scenario 37: Cutting a release note for faculty

Summarize **new writer aliases**, **breaking MusicXML** fixes, and **smoke PASS row counts**—avoid internal ticket jargon.

### Scenario 38: Tracking test tiers

**Smoke** is fast; **full** is exhaustive—quote the right tier when claiming **coverage** in grant proposals.

---

## 14. Quick reference and scenario index

### Scenario index (all 40)

| # | Section | Title |
|---|---------|--------|
| 1 | §1 | Seeded determinism |
| 2 | §1 | Output manifest |
| 3 | §1 | Pipeline vs host |
| 4 | §2 | UI grouping / a11y |
| 5 | §2 | Seed strategy |
| 6 | §2 | Generate disabled |
| 7 | §3 | Lesson writer pick |
| 8 | §3 | Duo outputs |
| 9 | §3 | Receipts as rubric |
| 10 | §4 | Zones |
| 11 | §4 | Big Band vs quartet |
| 12 | §4 | Meter maps |
| 13 | §5 | Custom harmony |
| 14 | §5 | Avoid resolution |
| 15 | §5 | Ear vs receipts |
| 16 | §6 | Busy accompaniment |
| 17 | §6 | Anticipation teaching |
| 18 | §6 | Motif-heavy writers |
| 19 | §7 | Piano vs guitar |
| 20 | §7 | Guitar octave shifts |
| 21 | §7 | Shareable flag |
| 22 | §8 | Web demo |
| 23 | §8 | Desktop packaging |
| 24 | §8 | Batch generation |
| 25 | §9 | Empty solo |
| 26 | §9 | Odd meter display |
| 27 | §9 | Pedagogy vs defaults |
| 28 | §10 | Brass vs reed |
| 29 | §10 | Drum guide |
| 30 | §10 | Clean ensemble import |
| 31 | §11 | Zone teaching |
| 32 | §11 | ECM sparsity |
| 33 | §11 | Hybrid locks |
| 34 | §12 | One-hour workshop |
| 35 | §12 | Odd-meter club |
| 36 | §12 | Critical listening lab |
| 37 | §13 | Faculty release note |
| 38 | §13 | Test tiers |
| 39 | §14 | Documentation hygiene |
| 40 | §14 | Where to go next |

### Scenario 39: Documentation hygiene

Keep **`COMPOSER_OS_PLAYBOOK.md`** aligned with **USER_GUIDE**, **roadmap**, and **changelog**—one factual source per **public claim**.

### Scenario 40: Where to go next

Read **`docs/COMPOSER_OS_ARCHITECTURE.md`** for pipeline phases, **`docs/USER_GUIDE.md`** for product tour, and run **`npm run test:composer-smoke`** before declaring **release readiness** after engine edits.
