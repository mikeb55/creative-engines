# Composer OS Playbook

> ⚠️ **LIVING DOCUMENT** — Update this file whenever new features, composers, meter presets, or presets are added to Composer OS.
> Regenerate the DOCX with: `node scripts/generateComposerOsPlaybookDocx.mjs`
> Then commit both files together.

---

## Real Book MusicXML import

Charts saved as **MusicXML** (Finale / MuseScore / Sibelius **partwise** export) can be fed through the **lead-sheet importer** for harmony timelines, keys, repeats, and (limited) melody extraction. This section matches what the engine’s **Real Book stress** regression exercises (`engines/composer-os-v2/tests/realBookStressTest.test.ts`, smoke suite **Real Book MusicXML stress**).

### Entry point (harmony timeline)

- **`leadSheetMusicXmlImport.ts`** — **`importLeadSheetFromMusicXml`** walks measures and, for each `<harmony>` block, calls **`parseImportedHarmonyEvent`** (**`importedHarmonyTimeline.ts`**) to append **`ImportedHarmonyEvent`** rows (root/kind/bass/degrees, beat from **`<offset>`** ÷ divisions).
- **`sortImportedHarmonyTimeline`** runs at end — stable order: **bar**, **beat**, **harmony index in bar**.
- Display chord **symbols** for teaching (`LeadSheet.chordEvents`) come from **`parseHarmonySymbol`** on the same XML; they are merged and **`dedupeChordEvents`**’d separately from the storage-only timeline.

### What the stress test validates

- **Repeat navigation** — `<barline>` forward/back repeats, **volta** (`<ending>` start/stop), **segno** / **D.S.** / **To Coda** / **coda** directions and `<sound>` jumps (`expandMeasureVisits` in **`leadSheetMusicXmlImport.ts`** produces a deterministic visit order).
- **Key changes** — mid-score `<attributes><key><fifths>…</fifths></key>` blocks populate **`LeadSheet.keyChanges`** (bar index aligns with the importer’s logical bar mapping).
- **Complex rhythm / chords** — high `<divisions>` grids and multiple `<harmony>` elements per measure, including **`<offset>`** (divisions from measure start) → beat-accurate **`importedHarmonyTimeline`** entries.
- **Multiple voices** — `<voice>1</voice>` vs `<voice>2</voice>`: chord symbols still parse; **voice 1** retains **`melodyEvents`**; extra voices trigger a warning (see limitations).

### repeatMarkers (UniversalLeadSheet)

**`parseRepeatMarkers`** scans each measure for barline **repeat forward/back** and **`<ending>`** volta tags. **`buildUniversalLeadSheetFromImportedLeadSheet`** maps **`LeadSheet.repeatMarkers`** onto **`UniversalRepeatMarker`**: **`repeat_start`**, **`repeat_end`**, **`ending_start`**, **`ending_stop`** (optional **`endingNumber`**). Jump semantics (**D.C.**, **D.S.**, **coda**) affect **how many logical bars** are visited, not a separate MusicXML “marker kind” in this contract—expect repeat/volta markers where the exporter emitted barlines.

### Key changes

When the importer records attributes for a measure (`emitKeyChangesAndSection`), each **`<key>`** inside that measure appends **`{ bar, fifths, mode? }`** to **`LeadSheet.keyChanges`**. The first key also seeds **`keySignature`** when present.

### Chord timeline (beats, offsets, collisions)

- Timeline events sort by **bar**, **beat** (offset ÷ divisions), then **harmony index** in the measure.
- **`dedupeChordEvents`** removes redundant duplicates and beat-0 carries from the prior bar; the stress test asserts **no conflicting chord symbols** assigned to the same **(bar, beat)** slot after processing (**no-collision guarantee** for conflicting symbols at the same slot).

### Round-trip sanity check

Regression pattern: **import** → **`buildUniversalLeadSheetFromImportedLeadSheet`** → minimal **`ScoreModel`** (**`createPart`** + measure-level **`chord`** + whole-bar rests) → **`exportScoreModelToMusicXml`**. This validates **exporter robustness** on representative imported harmony—not bit-identical round-trip to arbitrary publisher XML.

### Known limitations

- **Voices / staves:** Melody capture is **voice 1**, **staff 1** only; **voice 1** melody is **retained**; **voice > 1** (and non–staff-1) notes log **warnings** and are skipped for the melody track (**Phase 1** lead-sheet scope).
- **Publisher quirks:** Nested repeats and rare jump combinations may diverge from another tool’s playback; importer **`warnings`** describe caps and fallbacks.

---

## Vocal melody engine (Song Mode lead melody)

Song Mode builds a **planning-layer** vocal sketch before the golden-path score: **`planMelodyBehaviour`** (per **`SongwriterRuleId`**) produces **`MelodyBehaviourPlan`** stored on **`SongwritingPlanningBundle`**; **`buildCompiledSong`** passes it into **`planLeadMelody`** (`engines/composer-os-v2/core/song-mode/leadMelodyPlanner.ts`). Output is **`LeadMelodyPlan`** (measure / beat / duration / MIDI), folded into **`LeadSheetContract.vocalMelody`**.

**Optional vocal lead sheet:** When Generate’s **Include vocal lead sheet** is on, the app writes **`*_vocal_lead_sheet.musicxml`** via **`exportVocalLeadSheetMusicXmlViaPython`** (`songwritingBridgeLeadSheet.ts`). That file uses **`LeadSheetContract.vocalMelody.events`** — the **planned lead melody**, not a transcription of duo guitar comp (**`clean_electric_guitar`**).

### melodyBehaviour scalars

| Field | Role |
|-------|------|
| **`repetitionVsVariationBias`** (0–1) | High → reuse phrase motif shape on later bars (rhythm + relative contour); low → fresher bar-level picks. |
| **`intervalTendency`** | **`stepwise`** / **`mixed`** / **`angular`** — biases chord-tone picks toward small steps vs wider leaps. |
| **`phraseAsymmetryTendency`** (0–1) | Planning asymmetry hint (paired with hook/chorus planners elsewhere). |
| **`cadenceFrequency`** | **`low`** / **`medium`** / **`high`** — cadence density hint for downstream lyrics/phrasing. |
| **`rhythmicSubdivision`** | **`whole_bar`**, **`half_quarter`**, **`eighth_patterns`**, or **`mixed`** — drives quarter/eighth **cells** per bar (4/4 scaffold). |
| **`phraseLength`** | Target phrase length hint (**bars**). |
| **`contourProfile`** | Research contour label (mapped inside **`planLeadMelody`** to phrase contour bias). |
| **`devices`** | Named vocabulary hooks for manifests/pedagogy (slice-aligned strings). |

Research-driven rows live in **`MELODY_PROFILES`** inside **`melodyBehaviourPlanner.ts`**. Other **`SongwriterRuleId`** values fall back to seed-tinted defaults (includes e.g. **`max_martin`**, **`ecm_chamber`** convenience rows).

### Per-composer profile table (34 research rows)

| Writer id | interval | rhythmic | phrase bars | repetition | contour profile | Key devices (abbrev.) |
|-----------|----------|----------|---------------|------------|-----------------|----------------------|
| `brian_wilson` | stepwise | mixed | 7 | 0.5 | arch | sequential_expansion; appoggiatura; suspension |
| `stevie_wonder` | stepwise | eighth_patterns | 4 | 0.4 | ascending | melisma; syncopated_anticipation; blues_note; gospel_lift |
| `radiohead` | stepwise | mixed | 5 | 0.8 | flat_with_terminal_climax | cell_repetition; modal_unease; metric_dislocation |
| `james_brown` | stepwise | eighth_patterns | 2 | 0.9 | riff | on_the_one; blues_note; call_response; sparse_density |
| `sonic_youth` | angular | mixed | 2 | 0.7 | flat | drone_melody; dissonant_dyad; shape_melody; narrow_range |
| `pat_metheny` | mixed | mixed | 8 | 0.3 | arch | destination_tone; inside_outside_arc; guitaristic_leap; lyrical_jazz |
| `wayne_shorter` | angular | mixed | 3 | 0.3 | irregular | tritone; 4th_5th_leap; enigmatic_cadence; motivic_fragmentation |
| `barry_harris` | stepwise | eighth_patterns | 4 | 0.4 | bebop_arc | chromatic_enclosure; approach_tone; bebop_scale; ii_V_outline |
| `stephen_sondheim` | stepwise | mixed | 5 | 0.3 | speech_contour | word_painting; chromatic_tension; asymmetric_phrase |
| `kate_bush` | angular | mixed | 6 | 0.3 | dramatic_leap | wide_leap; melisma; modal_color; dramaturgical_phrase |
| `thelonious_monk` | angular | mixed | 2 | 0.6 | irregular | tritone; whole_tone_fragment; chromatic_enclosure; deliberate_silence |
| `dave_brubeck` | stepwise | mixed | 4 | 0.5 | arch | odd_meter_alignment; quartal_shape; additive_cell; blues_modal_mixture |
| `andrew_hill` | angular | mixed | 5 | 0.4 | irregular | motivic_fragmentation; interval_expansion; chromatic_sideslip; pedal_ambiguity |
| `charlie_parker` | angular | eighth_patterns | 4 | 0.2 | bebop_arc | chromatic_enclosure; upper_structure_arpeggio; ii_V_outline; bebop_scale |
| `bill_evans` | stepwise | mixed | 8 | 0.4 | arch | inner_voice_melody; modal_interchange; delayed_resolution; impressionistic_voicing |
| `bacharach` | mixed | eighth_patterns | 5 | 0.3 | irregular | metric_shift; phrase_extension; suspended_appoggiatura; chromatic_bass |
| `donald_fagen` | mixed | eighth_patterns | 4 | 0.5 | conversational | guide_tone_melody; blues_over_jazz_harmony; syncopated_hook; static_pitch_over_moving_chords |
| `frank_zappa` | angular | eighth_patterns | 3 | 0.2 | irregular | polyrhythmic_unison; chromatic_sideslip; interval_expansion; synthetic_scale; sudden_meter_change |
| `joni_mitchell` | angular | mixed | 6 | 0.3 | wide_arc | open_tuning_pitch_field; unresolved_suspension; wide_leap_stepwise_descent; modal_drone |
| `antonio_carlos_jobim` | stepwise | eighth_patterns | 8 | 0.5 | arch | bossa_anticipation; lydian_dominant; chromatic_approach; sigh_figure |
| `herbie_hancock` | mixed | eighth_patterns | 4 | 0.4 | groove_arc | quartal_melody; pentatonic_sideslip; suspended_dominant; funk_ostinato |
| `bach` | stepwise | eighth_patterns | 2 | 0.4 | sequence | imitation; sequence; suspension_chain; invertible_counterpoint; circle_of_fifths |
| `beatles` | mixed | mixed | 4 | 0.5 | arch | 3_note_cell; blue_note; middle_eight_shift; parallel_harmony; chromatic_hook |
| `beethoven` | mixed | mixed | 4 | 0.5 | motivic_development | motivic_fragmentation; sequence; liquidation; sforzando_displacement; registral_expansion |
| `billy_strayhorn` | stepwise | mixed | 8 | 0.4 | arch | chromatic_descent; dominant_chain; lush_extensions; delayed_cadence; sequence_through_remote_keys |
| `bob_dylan` | stepwise | mixed | 8 | 0.8 | recitation | strophic_variation; repeated_note_recitation; modal_pentatonic; line_ending_fall; folk_drone |
| `carole_king` | stepwise | mixed | 4 | 0.5 | rising | gospel_suspension; repeated_note_hook; stepwise_verse_build; rising_chorus_sequence |
| `debussy` | stepwise | mixed | 3 | 0.5 | dissolving | whole_tone_melody; pentatonic_contrast; parallel_planing; unresolved_appoggiatura; arabesque |
| `duke_ellington` | mixed | eighth_patterns | 4 | 0.6 | riff | blues_riff; call_response; chromatic_inner_voice; plunger_color; sectional_shout |
| `holland_dozier_holland` | stepwise | eighth_patterns | 2 | 0.7 | rising | call_response_hook; repeated_title_phrase; tambourine_anticipation; backing_vocal_echo |
| `jeff_lynne` | stepwise | mixed | 4 | 0.6 | arch | stacked_harmony_hook; octave_doubled_melody; string_countermelody; descending_bass_hook |
| `jeff_tweedy` | stepwise | mixed | 4 | 0.7 | flat | deadpan_repeated_note; modal_bVII; unresolved_suspension; folk_drone; understated_chorus |
| `kendrick_lamar` | stepwise | eighth_patterns | 3 | 0.5 | speech_contour | flow_modulation; syllabic_ostinato; pitch_zone_contrast; barline_displacement; triplet_switch |
| `kurt_weill` | stepwise | mixed | 4 | 0.6 | cabaret_arc | descending_minor_3rd; tritone_bitterness; chant_repeated_tone; major_minor_irony; mechanical_ostinato |

### Smoke coverage

**`npm run test:composer-smoke`** includes **`engines/composer-os-v2/tests/vocalMelodySmoke.test.ts`** (**`runVocalMelodySmokeTests`**) — **`MELODY_PROFILES`** cardinality (≥34 keys), distinct **`planMelodyBehaviour`** tuples across representative **`SongwriterRuleId`** values, **`planLeadMelody`** bar coverage / **`eighth_patterns`** vs **`whole_bar`** density, SATB comfort MIDI bands (verse-only scaffold), and **`buildSongwritingBridgePayloadFromLeadSheetContract`** **`melody_events`** parity with **`LeadSheetContract.vocalMelody`**.

### Chord-tone awareness

Per bar, symbols come from **`flattenChordPlanToHarmonyBars`** (scaffold after era normalization — aligned with Song Mode harmony planning). Optional **`harmonyBars`** override on **`planLeadMelody`** is reserved for future authoritative timelines (e.g. locked bars). **`chordTonesForChordSymbol(symbol, { lockedHarmony: true })`** yields tertian reference tones; pitches are mapped into the singer **comfort range** before the absolute-range clamp.

### Rhythmic subdivision

Lead melody uses **multiple events per bar** when **`half_quarter`** or **`eighth_patterns`** is active (half notes, quarter streams, or sparse eighth grids). **`whole_bar`** keeps a single anchor per bar. **`mixed`** picks a density per bar deterministically from the seed.

### Singer range

**`getSingerRangeProfile`** supplies comfort and absolute MIDI bounds; **`planLeadMelody`** clamps after **chorus lift** semitones so peaks stay singable.

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

### Song Mode Style Engine (`StyleProfile`)

The Generate **Style Engine** dropdown lists **`StyleProfile`** ids (`songModeStyleProfile.ts`). Options are grouped into **Advanced styles** vs **Light touch styles** (`SONG_MODE_ADVANCED_STYLE_SET` in **`HomeGenerate.tsx`**).

- **Advanced:** Profiles that apply **harmony/rhythm metadata surfaces**, **builtin chord-plan policies**, or **golden-path slice wiring** (effective harmony bars, guitar bar passes, receipts) beyond velocity-only contouring. Examples: **Post-Bop (Shorter)**, **Modern Jazz**, **Sophisticated Pop**, **Groove / Soul**, and — as of the style-to-slice wiring — **`STYLE_SONIC_YOUTH`**, **`STYLE_JONI_MITCHELL`**, **`STYLE_PAT_METHENY`**.
- **Light touch:** Primarily **velocity shaping** on the finished duo score (`applySongModeStyleEngineToScore`); may stack with era/style-pairing biases but does not alone run a full writer slice.

**Wiring summary (Sonic Youth / Joni / Pat style ids)**

| `StyleProfile` | Velocity layer | Engine wiring |
|----------------|----------------|---------------|
| **`STYLE_SONIC_YOUTH`** | Aggressive offbeat emphasis; **`noise_wall`** macro texture → large positive deltas; **`clearing`** → deep reduction; reads **`ChordEvent.sonicYouth.textureState`** when present, else **`getSonicYouthTextureStateAtBar`** (`sonicYouthSlice.ts`). | When primary songwriter **or** this style: **`precomputeSonicYouthEffectiveHarmonyBars`**, **`applySonicYouthGuitarBarPasses`**, **`getChordForBar`** / locked-truth paths accept **`sonicYouthEffectiveHarmonyBars`** (`harmonyResolution.ts`, **`customLockedHarmonyRouting.ts`**, **`runGoldenPath.ts`** export truth). |
| **`STYLE_JONI_MITCHELL`** | Wide dynamic range; phrase-soft attack, peak toward bar midpoint (`startBeat` sine), gentle phrase tail. | **`applyJoniStyleFolkModalHarmonyPolicy`** (`joniStyleHarmonyPolicy.ts`) on **builtin** chord plans — lighter cadential gravity, suspended-colour preference. When songwriter **or** style: **`precomputeJoniMitchellEffectiveHarmonyBars`**, **`joniMitchellEffectiveHarmonyBars`** authority in **`getChordForBar`**. Alternate tuning gate unchanged (`alternateGuitarTunings.ts`). |
| **`STYLE_PAT_METHENY`** | Lyrical swell (mid-bar peak), soft downbeats, phrase-end decay — avoids hard accents. | When songwriter **or** style: **`precomputePatMethenyEffectiveHarmonyBars`**, **`patMethenyEffectiveHarmonyBars`** in **`getChordForBar`** + locked export truth. |

### Joni Mitchell (Song Mode — open tunings, modal harmony)

**Joni Mitchell** is a **shipped golden-path slice**: **`joniMitchellSlice.ts`**, **`jm:*`** device receipts, **`joniMitchellEffectiveHarmonyBars`** feeding **`getChordForBar`** and locked MusicXML truth (same pattern as Radiohead / James Brown). Pools emphasize **modal**, **pedal**, and **open-tuning-friendly** colours (**add9**, **sus2/sus4**, **slash** pedals, **maj(add9)** rows — see **`SONGWRITER_CHORD_POOLS.joni_mitchell`**).

**Open-tuning philosophy (pedagogy, not a transcription engine)**

- Real-world Joni repertoire is tied to **non-standard tunings** (e.g. **DADGAD**, **CGDGCD**, **DADDAD**, drop/add variants). The engine represents tunings through **`alternateGuitarTunings.ts`** zone **`joni_mitchell`** — presets carry **six string pitches** (`AlternateGuitarTuningPreset.strings`) for UI + metadata.
- **`GuitarTuningState`** (**`sonicYouthChordTypes.ts`**, shared shape name) encodes **open-string MIDI grid**, **fret pattern**, **drone string mask**, and **noise level** per guitar when a profile attaches tuning-aware comp metadata. **Sonic Youth** uses **`GuitarTuningState`** on **`ChordEvent.sonicYouth`** for dual-guitar noise harmony; **Joni** slice harmony generation reads **resolved alternate tuning** from the duo / Song Mode pipeline so **voicing and fingered shapes** bias toward **strings that can ring open**—exact fretmaps remain **bounded** by the golden-path guitar passes, not a full tablature solver.

**How alternate tunings affect chord voicing**

- Selecting a **Joni zone preset** changes **resolved string pitches** used by layout/comp passes (same seed → different **vertical spacing** vs standard tuning when the pipeline applies tuning-aware behaviour).
- Where **Tonality Vault / per-preset voicing maps** are incomplete, prefer **A/B the same seed** with **standard** vs **named open preset** rather than expecting perfect folk authenticity on every bar.

**Alternate tuning in Generate:** Style **`STYLE_JONI_MITCHELL`** surfaces the **`joni_mitchell`** **zone** in **Generate**’s alternate-tuning selector (`getPresetsByZone('joni_mitchell')`).

### Scenario 7: Picking a writer for a lesson plan

Match **pedagogical goal** to slice: e.g. **ii–V devices** (bebop), **angular harmony** (Monk/Hill), **theatre harmony** (Sondheim/Bacharach), **modal ECM** sparsity.

### Scenario 8: Duo vs single-line outputs

Duo paths emphasize **guitar/bass** interplay; confirm **instrument names** and **clefs** in MusicXML if students import into Sibelius for homework.

### Scenario 9: Writer receipts as rubric points

Turn **d1–d5 hit rates** and **guard receipts** into a **checklist** for student arrangements—did their manual reharmonization respect similar constraints?

### Sonic Youth (dual guitar, noise harmony, and texture)

**Still current:** **`sonicYouthSlice.ts`**, **`sy:*`** receipts, **`sonicYouthEffectiveHarmonyBars`**, **`ChordEvent.sonicYouth`** + **`SYTextureState`**, **`sonicYouthTextureEngine.ts`**, **`sonicYouthChordGuards.ts`**, **`musicxmlExporter.ts`** texture augmentation, smoke **`sonicYouthSliceSmoke.test.ts`** + **`sonicYouthTexture.test.ts`**.

**Sonic Youth** is a **duo / dual-electric** slice: harmony uses **`sy:*`** device receipts and **`sonicYouthEffectiveHarmonyBars`** (same **getChordForBar** truth pattern as other locked-harmony writers). On comp **`ChordEvent`s**, optional metadata lives on **`ChordEvent.sonicYouth`** (`SonicYouthExtension` in **`sonicYouthChordTypes.ts`**).

**Profile gating (critical)**

- **`sonicYouth`** metadata is written when the **primary songwriter** is the Sonic Youth slice **or** the Song Mode style profile is **`STYLE_SONIC_YOUTH`** (`applySonicYouthGuitarBarPasses`). **`isSonicYouthEvent`** only checks **`event.sonicYouth != null`**; export and duo passes should branch on **`sonicYouth`** **only when** the active profile/songwriter indicates Sonic Youth behaviour — otherwise **`sonicYouth`** must not leak into default paths (**`sonicYouthChordTypes.ts`** / **`sonicYouthChordGuards.ts`** pipeline notes).

**`SYTextureState` (four macro phases)**

| State | Role |
|-------|------|
| **`riff`** | Cellular, repeating material. |
| **`shimmer`** | Sustained, beating layer. |
| **`noise_wall`** | High-density / feedback-leaning wall. |
| **`clearing`** | Drop in weight (reset / space). |

**`getNextTextureState(current, noiseLevel, dissonance)`** (`sonicYouthTextureEngine.ts`)

- **`NoiseLevel`:** **`clean`**, **`crunchy`**, **`feedback`**, **`prepared`** (`sonicYouthChordTypes.ts`).
- **`SYDissonancePreset`:** **`low_friction`**, **`medium_friction`**, **`high_friction`** (from **`interGuitarDissonance.preset`** / **`getSYDissonancePreset(score)`**).
- **Prepared shortcut:** any **`noiseLevel === 'prepared'`** → next state is always **`clearing`**.
- **Unbiased cycle** ( **`crunchy`** noise + **`medium_friction`** ): **riff → shimmer → noise_wall → clearing → riff**.
- **Bias rules:** **`noiseWallBias`** = **`feedback`** OR **`high_friction`**; **`riffShimmerBias`** = **`clean`** OR **`low_friction`**. When both biases fire, **`high_friction`** wins ties toward **`noise_wall`**; **`low_friction`** pulls **`noise_wall` → shimmer** on exit; **`feedback`** / **`clean`** mirror noise-wall entry/exit similarly (see source).

**Full transition table (next state)**

| Current | noise | dissonance | Next |
|---------|-------|------------|------|
| riff | clean | low_friction | shimmer |
| riff | clean | medium_friction | shimmer |
| riff | clean | high_friction | noise_wall |
| riff | crunchy | low_friction | shimmer |
| riff | crunchy | medium_friction | shimmer |
| riff | crunchy | high_friction | noise_wall |
| riff | feedback | low_friction | shimmer |
| riff | feedback | medium_friction | noise_wall |
| riff | feedback | high_friction | noise_wall |
| riff | prepared | low_friction | clearing |
| riff | prepared | medium_friction | clearing |
| riff | prepared | high_friction | clearing |
| shimmer | clean | low_friction | noise_wall |
| shimmer | clean | medium_friction | noise_wall |
| shimmer | clean | high_friction | noise_wall |
| shimmer | crunchy | low_friction | noise_wall |
| shimmer | crunchy | medium_friction | noise_wall |
| shimmer | crunchy | high_friction | noise_wall |
| shimmer | feedback | low_friction | noise_wall |
| shimmer | feedback | medium_friction | noise_wall |
| shimmer | feedback | high_friction | noise_wall |
| shimmer | prepared | low_friction | clearing |
| shimmer | prepared | medium_friction | clearing |
| shimmer | prepared | high_friction | clearing |
| noise_wall | clean | low_friction | shimmer |
| noise_wall | clean | medium_friction | shimmer |
| noise_wall | clean | high_friction | clearing |
| noise_wall | crunchy | low_friction | shimmer |
| noise_wall | crunchy | medium_friction | clearing |
| noise_wall | crunchy | high_friction | clearing |
| noise_wall | feedback | low_friction | shimmer |
| noise_wall | feedback | medium_friction | clearing |
| noise_wall | feedback | high_friction | clearing |
| noise_wall | prepared | low_friction | clearing |
| noise_wall | prepared | medium_friction | clearing |
| noise_wall | prepared | high_friction | clearing |
| clearing | clean | low_friction | riff |
| clearing | clean | medium_friction | riff |
| clearing | clean | high_friction | noise_wall |
| clearing | crunchy | low_friction | riff |
| clearing | crunchy | medium_friction | riff |
| clearing | crunchy | high_friction | noise_wall |
| clearing | feedback | low_friction | riff |
| clearing | feedback | medium_friction | noise_wall |
| clearing | feedback | high_friction | noise_wall |
| clearing | prepared | low_friction | clearing |
| clearing | prepared | medium_friction | clearing |
| clearing | prepared | high_friction | clearing |

**Two-guitar architecture**

- **`guitar1`** / **`guitar2`**: each **`SonicYouthExtension`** carries a **`GuitarTuningState`**: **`tuningId`**, **`openPitches`** (six-string MIDI), **`shapeId`**, **`fretPattern`**, **`stringMask`**, **`droneStrings`**, **`noiseLevel`** (`clean` / `crunchy` / `feedback` / `prepared`).
- **`interGuitarDissonance`**: **`score`** (0–1), interval tallies (**minor2**, **major2**, **tritone**, **unison** counts), **`preset`** ∈ **`SYDissonancePreset`** — feeds **`getNextTextureState`** as **`dissonance`**.

**Alternate tunings workflow (`guitar1` / `guitar2`)**

1. Set **primary writer** to **Sonic Youth** (registry aliases).
2. In **Generate**, use **alternate tuning** zone **`sonic_youth_noise`** (`getPresetsByZone('sonic_youth_noise')`).
3. Prefer **separate-tuning mode** (dual-electric) when you want **different `GuitarTuningState` rows** per guitar; **shared** mode keeps one resolved spec for both where the UI allows.
4. **Drop D** / **Eb standard**: see **§11 Alternate tunings workflow** — **`exportPartTransposeSemitones`** drives **`<transpose><chromatic>`** on **measure 1** `<attributes>`; **label-only** scordatura stays **`exportMeasure1TuningWordsByPartId`** text.

**Guards:** **`isSonicYouthEvent`** (narrow **`ChordEvent & { sonicYouth: SonicYouthExtension }`**), **`getSYTextureState`** (reads **`textureState`**).

**MusicXML mapping** (`sonicYouthChordExportAugmentation` / **`musicxmlExporter.ts`**) — first chord notehead only (stacks unchanged):

| **`textureState`** | XML |
|---------------------|-----|
| **riff** | No extra dynamics or articulation. |
| **shimmer** | `<tremolo type="single">3</tremolo>` (*v1 — no wavy-line.*) |
| **noise_wall** | Note **`dynamics="127"`** (fff-class) + **`<stress/>`** articulation. |
| **clearing** | Note **`dynamics="24"`** (ppp-class); no extra articulation. |

Regression: smoke **`Sonic Youth texture + MusicXML augmentation`** (`core/score-model/__tests__/sonicYouthTexture.test.ts`).

### Scenario 9b: Sonic Youth texture in the host

After import, **dynamics** and **tremolo** are host-dependent for playback—use this mapping to **teach** texture **intent** (wall vs clearing), not guaranteed studio distortion.

### Pat Metheny (ECM / PMG — harmony-centric slice)

**Still current:** **`patMethenySlice.ts`** (re-export **`goldenPath/patMethenySlice.ts`**), **`patMethenyEffectiveHarmonyBars`**, **`precomputePatMethenyEffectiveHarmonyBars`**, **`getChordForBar`**, smoke **`patMethenySliceSmoke.test.ts`**, eval **`npm run eval:pat_metheny`**.

Pat Metheny is **harmony- and metadata-centric** on the duo golden path: there is **no** dedicated guitar-bar pass or `ChordEvent` extension layer (by design—contrast **Sonic Youth** **`applySonicYouthGuitarBarPasses`**). Export truth and assertions use the same **precomputed effective harmony** pattern as other locked slices.

**`pm:*` device families** (prefix **`pm:`** on **`patMethenyDeviceReceipts`**)

| Family | Role |
|--------|------|
| **`lydian_home`** | Tonic major with Lydian/home colour (**`pm:lydian_home@bar…`**). |
| **`pedal_shimmer`** | Motion-gated shimmer (**d2**, **`pm:pedal_shimmer@bar…`**). |
| **`sus_float`** | Suspension float on eligible sus/add9/maj surfaces (**d4**, **`pm:sus_float@bar…`**). |
| **`modal_sideSlip`** | Modal side-slip toward bII/bIII (**d5**, **`pm:modal_sideSlip@bar…`**). |
| **`diatonic_planing`** | Diatonic planing between maj-extension chords (**`pm:diatonic_planing@bar…`**). |

**Eligibility pipeline**

1. **`buildPatMethenyHarmonyPipelineSnapshot`** — resolve source chords → **flatten** textbook ii–V–I (`flattenTwoFiveOnePass`) → **strip** three-bar dominant chains (`stripDominantChainPass`) → **applyModalSideSlipDevice** (d5) → **enforceMethenyTwoBarHold**.
2. **`precomputePatMethenyEffectiveHarmonyBars`** — attach **Lydian-home**, **pedal-shimmer / sus-float** receipts (seeded d2/d4), **diatonic planing** receipts, **`patMethenyEffectiveHarmonyBars`**, **`patMethenyEligibilityStats`** (d2/d4/d5 eligible bar counts vs target rates).
3. Optional bar-by-bar audit: **`formatPatMethenyEligibilityDiagnostics`**; CLI **`npm run probe:pat-metheny-eligibility`** in **`engines/composer-os-v2`**.

**ECM floating harmony arc:** Hook / identity / motif bars skip disruptive devices where gated; blues-heavy dominant colours can **strip** toward maj9 (`stripBluesDominantColour`). **Song Mode** chord pools **`SONGWRITER_CHORD_POOLS.pat_metheny`** feed add9/maj9 pastoral rows.

**Alternate tunings:** **`STYLE_PAT_METHENY`** is listed in **`STYLE_PROFILES_WITH_ALTERNATE_GUITAR_TUNING`** (**`alternateGuitarTunings.ts`**). See **§11 Alternate tunings workflow**.

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

Odd-meter **Song Mode** tiles **`barMeterMap`** from named cycles (**`tileZappaMeterCycle`** in **`oddMeterQuantiser.ts`**). UI preset lists are keyed by **composer id** on **`COMPOSER_METER_PRESET_MAP`** (**`HomeGenerate.tsx`** iterates this map — adding a composer here surfaces presets automatically).

**`ComposerOddMeterSongwriterId`** (`keyof typeof COMPOSER_METER_PRESET_MAP`) — **`core`** types include **`donald_fagen`** and **`bill_evans`** alongside **`dave_brubeck`**, **`thelonious_monk`**, **`wayne_shorter`**.

**`FAGEN_METER_CYCLE_PRESET_DEFINITIONS`**

| Preset id | Label | Cycle (repeats across bars) |
|-----------|-------|-------------------------------|
| `fagen_seven_four` | Fagen 7/4 | 7/4 |
| `fagen_five_four` | Fagen 5/4 | 5/4 |
| `fagen_seven_five` | Fagen 7+5 | 7/4 then 5/4 (2-bar cycle) |
| `fagen_igy_feel` | IGY Feel | 4/4, 4/4, 3/4 |

**`EVANS_METER_CYCLE_PRESET_DEFINITIONS`**

| Preset id | Label | Cycle |
|-----------|-------|-------|
| `evans_three_four` | Evans 3/4 | 3/4 |
| `evans_five_four` | Evans 5/4 | 5/4 |
| `evans_five_three` | Evans 5+3 | 5/4 then 3/4 |
| `evans_nine_eight` | Evans 9/8 | 9/8 |
| `evans_peace_piece` | Peace Piece | 4/4 (beat grouping 3+3+2) |

**Helpers:** **`isComposerOddMeterSongwriter(id)`**, **`buildComposerOddMeterRows(songwriterId, presetId, barCount)`** — **`all_4_4`** or unknown id → all **4/4** rows.

**Workflow:** Select **Donald Fagen** or **Bill Evans** → **meter preset** radio block in **Generate** → pick cycle → lock **seed** → verify **per-bar `<time>`** in MusicXML vs host display collapse.

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
| 5 | Export **MusicXML** (see below). |

**Transpose vs text-only scordatura**

| Preset class | `ScoreModel.exportPartTransposeSemitones` | MusicXML |
|--------------|-------------------------------------------|----------|
| **Drop D** | **−2** semitones (concert pitch vs written) | **`<transpose><chromatic>-2</chromatic></transpose>`** in **measure 1** `<attributes>` (plus tuning words when set). |
| **Eb standard** | **−1** semitone | **`<transpose><chromatic>-1</chromatic></transpose>`** same placement. |
| **Pure scordatura / label-only tunings** | No chromatic offset in model | **No `<transpose>` block** — **`exportMeasure1TuningWordsByPartId`** direction text only (host-dependent engraving). |

**Sibelius-safe constraints:** **`musicxmlExporter.ts`** emits **`<transpose>`** only inside **measure 1 `<attributes>`** on the written staff — **not** nested under **`<score-instrument>`** (avoids schema/host quirks).

Regression: **`alternateGuitarTunings.test.ts`** + smoke tier row **Alternate guitar tunings (zones + texture)**.

### Scenario 31: Teaching Joni or Sonic Youth zones

Start from **zone preset list**, then **narrow** to lesson-friendly voicings—noise-rock clusters may **overload** beginners even if rules pass.

### Scenario 32: Pat Metheny / ECM colours

Pair **ECM-style modal sparsity** with **long seeds** to avoid **phrase repetition** reads in sparse textures.

### Scenario 33: Hybrid harmonic experiments

**Hybrid** zone combines vocabulary—use **writer locks** to stop **clashing functional languages** when stacking experiments.

---

## Known Architectural Gaps

Documented limitations—do not mistake UI labels for fully wired engine behaviour until addressed.

### ARRANGER STYLES — KNOWN GAP

The arranger dropdown in **Big Band** mode does not currently affect the generated music. The **`arrangerStyle`** value from the UI is never mapped to **`composerStyle`** before reaching the Big Band engine, so all arrangers produce identical output regardless of selection.

Partial wiring exists for **four** arrangers in **Song Mode pairing** only (confidence scores, contrast nudges): **Ellington**, **Basie**, **Thad Jones**, **Maria Schneider**. The remaining **six** studio arrangers are UI labels only.

When returning to this: the fix requires **(1)** a structural mapping of **`arrangerStyle` → `composerStyle`** in **`composerOsAppGeneration.ts`** before **`runBigBandMode`** is called, and **(2)** per-arranger research to define genuine musical distinctions for each one.

**Priority:** low. Do not attempt until Big Band pipeline restructure is scoped as a dedicated workstream.

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
