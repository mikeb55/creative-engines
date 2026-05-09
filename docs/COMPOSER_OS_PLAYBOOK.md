# Composer OS Playbook

> ⚠️ **LIVING DOCUMENT** — Update this file whenever new features, composers, meter presets, or presets are added to Composer OS.
> Regenerate the DOCX with: `node scripts/generateComposerOsPlaybookDocx.mjs`
> Then commit both files together.

---

## Thread summary — Reharm Panel (shipped)

**Status:** Reharm preview — **fully shipped** (phases **A–D2** + **LOCK** reconciliation + per-writer lens rows). **Smoke tier** (aggregate PASS rows) tracks **`runSmokeTests.ts`** — see repo **`CLAUDE.md`**. **Open TODOs (reharm):** none.

| Phase | What shipped | Commit (short) |
|-------|----------------|----------------|
| **A** | Range resolver + lens config | `dfdf71a` |
| **B** | Sequence ranker | `580d536` |
| **C** | Controller + GCE placeholder scoring | `1971a8d` |
| **D1 + D2** | **`ReharmPanel`** UI + Apply path | `d2c9e55` |
| **LOCK fix** | Apply arms one-shot **`harmonyMode: custom`** so the next request reparses wire before LOCK assert | `c26f91c` |
| **`barry_harris` reharm lens** | **`buildReharmLensConfig('barry_harris')`** entry so vault / inspector lens matches Song Mode slice | `5cce9784` |

**Span on main:** `dfdf71a` → `c26f91c` (panel phases); Barry Harris lens fix: **`5cce9784`**.

---

## Fela Kuti — Tony Allen percussion

Song Mode primary **`fela_kuti`** appends **Afrobeat Percussion** (**GM unpitched** staff, **`fela_afrobeat_drums`**) from **`tonyAllenPatterns.json`** via **`afrobeatRhythmEngine.ts`**. Posture **`zombie_1977` / `water_no_get_enemy` / `lady_1972`** maps to Tony Allen feels **`afrobeat` / `swing` / `straight`**; optional **`felaPercussionFeelOverride`** overrides. Metadata tag **`felaPercussionFeelTag`**: **`fk:straight`**, **`fk:swing`**, **`fk:afrobeat`**. **Auto** preview grid in the app stays tied to **zombie_1977** until posture is selectable in Generate — use the three-way feel toggle for a faithful preview.

**Handbook:** **`docs/FELA_KUTI_PERCUSSION_HANDBOOK.md`** (sources, API, Sibelius checklist). Optional drum-only XML samples:  
`npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/exportFelaPercussionSibeliusSamples.ts` → **`docs/fela-percussion-sibelius-samples/*.musicxml`**.

---

## Greek Rebetiko — rhythm presets & MusicXML

Song Mode primary **`greek_rebetiko`** surfaces **Greek Rebetiko / dance-metre** planning (style profile + registry rules) and a **client-side rhythm panel**: **`GreekRhythmControls`** — preset dropdown, **layer × step** preview grid, and **Download MusicXML** (default **2 bars**, GM **unpitched** percussion staff **P1**, MusicXML **4.0**, **percussion** clef, **five-line** staff). Export implementation: **`exportGreekRhythmToMusicXml`** in **`engines/composer-os-v2/core/rhythm/greekRhythmMusicXmlExporter.ts`**; shipped preset bundle: **`greekRebetikoRhythmPresets.ts`** (**`hasapiko_4_4`**, **`zeibekiko_9_8`**).

**Handbook:** **`docs/GREEK_REBETIKO_HANDBOOK.md`** — full **10** sections: (1–2) history + **13** preset IDs table; (3) additive metres + ASCII grids (**9/8**, **7/8**, **10/8**); (4) MusicXML export + **mid-score** `<time>` changes + Sibelius **`<attributes>`** child order; (5) **LCM** pulse grids (**144** for 16 vs 18), **`mergeRhythmLayers`**; (6) **`SongSection` / `SongForm`** & transition policy; (7) **`GreekRhythmControls`** workflow; (8) voices vs separate parts + velocity policy; (9) source file map; (10) related docs + smoke tier.

---

## Rhythm engines (Afrobeat, Rebetiko, Brazilian, Second Line, Cuban)

Cross-engine overview — **`docs/RHYTHM_ENGINES.md`**: five shipped **`RhythmEngineId`** values (**`afrobeat`** … **`cuban`**), **`songFormRhythmTypes`**, **`rhythmPulseGrid`** / **`rhythmLayerMerge`**, **`rhythmBlendPolicies`**. Handbooks: **`docs/FELA_KUTI_PERCUSSION_HANDBOOK.md`** (**`fk:*`**), **`docs/GREEK_REBETIKO_HANDBOOK.md`** (**`gr:*`**).

### Ship notes — V40–V44

| Ship | What changed |
|------|----------------|
| **V40** | **Brazilian** — **`BrazilianRhythmControls`**, **`br:*`** receipts, **`Documents/Composer OS Exports/Brazilian Rhythms/`** |
| **V41** | **Second Line** — **`SecondLineRhythmControls`**, **`sl:*`**, **`Documents/Composer OS Exports/Second Line/`** |
| **V42** | **Cuban** — **`CubanRhythmControls`**, **`cu:*`**, **`Documents/Composer OS Exports/Cuban Rhythms/`** |
| **V43** | **Blend Engine** — **`RhythmBlendControls`** (all five engines): Engine **A** / **B**, per-engine presets, **Song form** vs **Layer blend**, **LCM** merge + UI warning when **`lcm(gridSteps) > 144`**, conflict strategies **max / sum-clamped / priority**; MusicXML → **`Documents/Composer OS Exports/Blended Rhythms/`** |
| **V44** | **StylePanel** — **Harmonic Voice** and **Rhythm Engine** are **separate** Generate selectors (combine any shipped harmonic writer with any shipped rhythm engine, e.g. **Bill Evans + Brazilian**, **Debussy + Rebetiko**) |

### Culture rhythm panels (V40–V42)

| Prefix | Engine | Ship |
|--------|--------|------|
| **`br:*`** | Brazilian (9 presets: bossa nova, samba, baião, son-clave) | V40 |
| **`sl:*`** | New Orleans Second Line (8 presets: parade, brass band, funk) | V41 |
| **`cu:*`** | Cuban/Afro-Cuban (8 presets: son, mambo, cha-cha, bolero) | V42 |

### StylePanel (V44) — how to combine Harmonic Voice + Rhythm Engine

On **Generate** → Song Mode, **`StylePanel`** shows two dropdowns:

1. **Harmonic Voice** — chooses the **songwriter / harmonic slice** (golden-path harmony behaviour).
2. **Rhythm Engine** — chooses the **culture rhythm surface** (Fela, Greek, Brazilian, Second Line, Cuban) and its preset wiring.

They **do not** force a fixed pairing: pick harmony and groove independently. Rhythm-specific controls (**`FelaPercussionControls`**, **`GreekRhythmControls`**, etc.) appear when that rhythm engine is selected.

### Harmonic Voice Quick Reference

Composer OS separates **Songwriter** presets (primary/secondary dropdown — fast stylistic flavour at the song level) from **Harmonic Voice** (**StylePanel** — research-grounded context keys, ThemeGenome defaults, melody-behaviour profiles). Same composer id can appear in both lists for different jobs: preset ≈ surface colour; harmonic voice ≈ structural “how the engine thinks.” Use **Harmonic Voice** when Melodic Identity, thematic recall, and harmony language must move together; stack a **Songwriter** preset on top for reinforcement or contrast.

**Handbook:** **`docs/DEEP_HARMONIC_VOICES_GUIDE.md`** — two-layer system, per-voice profiles, GCE impact guide, recommended preset × rhythm stacks. Pairings with rhythm engines: **`docs/HARMONIC_RHYTHM_COMBINATIONS.md`** § *Deep Harmonic Voice Combinations (V45+)*.

### Blend Engine (V43) — Rhythm blend lab

Open **Rhythm blend lab (MusicXML export)** (collapsible under Song Mode). Configure:

- **Engine A** / **Engine B** — each dropdown lists all **five** engines; presets populate from that engine’s shipped list (Tony Allen feels, **`GREEK_REBETIKO_*`** presets, Brazilian / Second Line / Cuban catalogs).
- **Blend ratio** slider (**Layer blend** mode) — UI emphasis toward A vs B (metadata for exploration; core **`mergeRhythmLayers`** conflict strategy still applies).
- **LCM warning** — appears when the selected pair’s bar grids yield **`lcm(steps) > 144`** (wide raster; export remains valid).
- **Song form** — sections each carry one engine + preset; export concatenates measures.
- **Layer blend** — dual percussion parts **P1** / **P2** in one MusicXML file.

### Rules learned

- **Cuban engine:** `claveDirection` is a **preset** field, not a live toggle — flipping 3-2 to 2-3 implies rewriting horn phrasing.
- **Brazilian:** Bossa nova does **not** need swing ratio — use **`anticipationPush`** instead.
- **Second line:** “Between the cracks” feel — use **`subdivisionWarp`**, not swing.
- **All engines:** 6/8 presets use a **12-step** grid, not 16-step.
- **Output dirs** — **`Fela Kuti Rhythms`**, **`Greek Rhythms`**, **`Brazilian Rhythms`**, **`Second Line`**, **`Cuban Rhythms`**, **`Blended Rhythms`** under **`Documents/Composer OS Exports/`** (**`apps/composer-os-app/src/lib/outputPaths.ts`**).

### Desktop packaging fallback & repo hygiene

- If **`npm run desktop:package-no-bump`** fails (locked **`release`** tree, **`app.asar`** in use, etc.), from **`apps/composer-os-desktop`** run: **`electron-builder --win --config.directories.output=dist-electron-release`** (same env vars your packaging script uses, e.g. **`CSC_IDENTITY_AUTO_DISCOVERY=false`** via **`cross-env`** when applicable). Then use artifacts under **`dist-electron-release/`**.
- **`apps/composer-os-desktop/dist-electron-release/win-unpacked/`** may contain **large** Electron binaries and is **listed in `.gitignore`** — do not commit **`win-unpacked`**; keep portable/installer outputs per your release policy.

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

For **total bar count**, **`computeTotalBarsWithRepeats`**, Song Mode / golden-path wiring, and **optional `ScoreModel.repeatMarkers`** MusicXML emission, see **Repeat truth — chart length + MusicXML barlines** above.

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

## Phrase Engine V2 (golden-path duo, pre–C1)

Song Mode **hook-first** runs an optional motif-development pass **after** expressive/orchestration passes and **before** the Song Mode rhythm overlay stack (**C1–C7**). Implementation: **`engines/composer-os-v2/core/goldenPath/phraseEngineV2.ts`**, wired from **`generateGoldenPathDuoScore`** immediately above **`applySongModeRhythmOverlayC1`**.

### When it runs (all required)

- Preset is **guitar–bass duo family** (`isGuitarBassDuoFamily`).
- **`generationMetadata.songModeHookFirstIdentity === true`** (hook-first Song Mode path).
- **Total bars === 32** for the duo score build (**`tb === 32`**).

### Pipeline order (four steps)

1. **`buildMotifPool(score, context)`** — Mechanical pool from the guitar part: first **four** **4-bar** phrases, cells from phrase onsets (pitch + duration snippets).
2. **`seedPoolFromHookIdentity(pool, songModeHookIdentity)`** — Optional; when hook identity exists on metadata, nudges/seeds the pool toward the hook’s rhythmic/pitch fingerprint.
3. **`applyPhraseEngineV2(guitarPart, pool)`** — Adjusts guitar **bars 17–32** (development window) toward pool material (duration windows + stepwise pitch nudge toward cells).
4. **`applyBassMotifEcho(bassPart, pool)`** — Bass echoes weighted pool **durations** in the same window when a bass onset’s duration matches a cell duration (pitch nudge toward cell floor).

If any gate fails, this block is skipped entirely; the rest of the golden-path duo pipeline is unchanged.

---

## Repeat truth — chart length + MusicXML barlines

End-to-end behaviour for **imported** lead sheets and optional **export** of repeat barlines.

### Universal lead sheet + bar count

- **`computeTotalBarsWithRepeats(formSections, repeatMarkers)`** (**`universalLeadSheetBuilder.ts`**) — Walks form sections in order; each section contributes **`barEnd − barStart + 1`** bars. If any **`repeat_end`** marker falls **inside** that section’s bar range, that section’s span is counted **twice** (one repeat pass).
- **`buildUniversalLeadSheetFromImportedLeadSheet`** sets **`UniversalLeadSheet.totalBars`** from that helper and carries **`repeatMarkers`** from **`LeadSheet`**.
- **`applyRepeatTruthToScoreModel(score, sheet)`** — If **`sheet.totalBars`** is set and differs from per-part measure counts, **deep-clones** the score and **pads** (clone last measure) or **trims** each part’s measures to match; syncs optional score-level length fields when present.

### Song Mode generation (`composerOsAppGeneration` → `runSongMode` → `runGoldenPath`)

- When the universal sheet is **`imported_musicxml`** and **`totalBars`** is a positive integer, **`RunGoldenPathOptions.totalBars`** is set from **`floor(totalBars)`** so the first score build targets the repeated chart length (no separate “second pass” solely for bar math).
- After the golden-path run (including GCE retries), **`applyRepeatTruthToScoreModel`** is applied again on the final **`ScoreModel`** so the delivered score matches the sheet; **`context.form.totalBars`** is aligned when the measure count changes.

### MusicXML export

- Optional **`ScoreModel.repeatMarkers`**: array of **`{ bar, kind }`** with **`kind`** **`repeat_start`** | **`repeat_end`** (1-based bar index = exported measure number).
- When present, **`musicxmlExporter`** emits:
  - **`repeat_start`** — `<barline location="left">` with **`heavy-light`** + **`<repeat direction="forward"/>`**
  - **`repeat_end`** — `<barline location="right">` with **`light-heavy`** + **`<repeat direction="backward"/>`**
- Scores without **`repeatMarkers`** behave exactly as before (no barline emission from this path).

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

### Per-composer profile table (38 research rows)

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
| `cole_porter` | stepwise | eighth_patterns | 4 | 0.75 | arch | chromatic_descent; hook_identity; bvi_color; diatonic_density; beguine_feel |
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
| `ornette_coleman` | angular | whole_bar | 5 | 0.42 | irregular | melody_over_harmony; asymmetric_contour; minor_third_departure; tritone_sidestep; low_syncopation; breath_space |
| `bartok` | angular | mixed | 5 | 0.35 | arch | folk_pentatonic_cell; axis_motion; bulgarian_cell; mirror_fragment; cluster_passing |
| `gershwin` | mixed | eighth_patterns | 8 | 0.38 | cabaret_arc | aaba_form; blue_note_color; syncopated_anticipation; chromatic_passing; minor_third_modulation |
| `duke_ellington` | mixed | eighth_patterns | 4 | 0.6 | riff | blues_riff; call_response; chromatic_inner_voice; plunger_color; sectional_shout |
| `maria_schneider` | stepwise | mixed | 7 | 0.85 | arch | sparse_phrase; modal_field; breath_space; nature_arc; chamber_texture |
| `miles_davis` | stepwise | mixed | 4 | 0.72 | arch | modal_field; breath_space; deliberate_silence; cool_phrasing; motivic_cell |
| `holland_dozier_holland` | stepwise | eighth_patterns | 2 | 0.7 | rising | call_response_hook; repeated_title_phrase; tambourine_anticipation; backing_vocal_echo |
| `jeff_lynne` | stepwise | mixed | 4 | 0.6 | arch | stacked_harmony_hook; octave_doubled_melody; string_countermelody; descending_bass_hook |
| `jeff_tweedy` | stepwise | mixed | 4 | 0.7 | flat | deadpan_repeated_note; modal_bVII; unresolved_suspension; folk_drone; understated_chorus |
| `kendrick_lamar` | stepwise | eighth_patterns | 3 | 0.5 | speech_contour | flow_modulation; syllabic_ostinato; pitch_zone_contrast; barline_displacement; triplet_switch |
| `kurt_weill` | stepwise | mixed | 4 | 0.6 | cabaret_arc | descending_minor_3rd; tritone_bitterness; chant_repeated_tone; major_minor_irony; mechanical_ostinato |

### Smoke coverage

**`npm run test:composer-smoke`** includes **`engines/composer-os-v2/tests/vocalMelodySmoke.test.ts`** (**`runVocalMelodySmokeTests`**) — **`MELODY_PROFILES`** cardinality (≥38 keys), distinct **`planMelodyBehaviour`** tuples across representative **`SongwriterRuleId`** values, **`planLeadMelody`** bar coverage / **`eighth_patterns`** vs **`whole_bar`** density, SATB comfort MIDI bands (verse-only scaffold), and **`buildSongwritingBridgePayloadFromLeadSheetContract`** **`melody_events`** parity with **`LeadSheetContract.vocalMelody`**.

### Chord-tone awareness

Per bar, symbols come from **`flattenChordPlanToHarmonyBars`** (scaffold after era normalization — aligned with Song Mode harmony planning). Optional **`harmonyBars`** override on **`planLeadMelody`** is reserved for future authoritative timelines (e.g. locked bars). **`chordTonesForChordSymbol(symbol, { lockedHarmony: true })`** yields tertian reference tones; pitches are mapped into the singer **comfort range** before the absolute-range clamp.

### Rhythmic subdivision

Lead melody uses **multiple events per bar** when **`half_quarter`** or **`eighth_patterns`** is active (half notes, quarter streams, or sparse eighth grids). **`whole_bar`** keeps a single anchor per bar. **`mixed`** picks a density per bar deterministically from the seed.

### Singer range

**`getSingerRangeProfile`** supplies comfort and absolute MIDI bounds; **`planLeadMelody`** clamps after **chorus lift** semitones so peaks stay singable.

---

## Classical song overlay (Song Mode)

Optional **Classical song influence** on Generate (default **None**): **Schubert**, **Schumann**, or **Fauré**. The payload carries **`classicalOverlay`** (`schubert` | `schumann` | `faure`). This is independent of **Lyric author influence** (`authorOverlay`). **`resolveSongwritingStyles`** (`engines/composer-os-v2/core/song-mode/songwriterStyleResolver.ts`) loads extra **registry rules** for the chosen composer and applies **additive** nudges to the blended **`SongwriterStyleProfile`** (each scalar clamped to **0–1** after the overlay).

### Per-composer emphasis and parameter deltas

| Overlay id | Emphasis | Blended profile adjustments (additive, then clamped) |
|------------|----------|------------------------------------------------------|
| **`schubert`** | Syllabic prosody, periodic/strophic form, diatonic-functional harmony | **`prosodyInfluence`** +0.10; **`lineVsCellEmphasis`** +0.06; **`harmonyColourBias`** −0.05; **`formRegularity`** +0.08; **`phraseRegularity`** +0.07 |
| **`schumann`** | Strong text–music prosody, chromatic harmony, irregular / through-composed phrasing | **`prosodyInfluence`** +0.13; **`harmonyColourBias`** +0.10; **`lineVsCellEmphasis`** +0.05; **`phraseRegularity`** −0.09; **`hookReturnVariation`** +0.06; **`harmonicSpeed`** +0.05 |
| **`faure`** | Long arching lines, floating / modal colour, continuous flow, lighter cadential closure | **`prosodyInfluence`** +0.06; **`lineVsCellEmphasis`** +0.12; **`harmonyColourBias`** +0.04; **`hookRepetitionBias`** −0.07; **`phraseRegularity`** −0.05; **`sectionContrast`** −0.06; **`syncopationBias`** +0.04 |

Implementation: **`applyClassicalSongOverlay`** in **`songwriterStyleResolver.ts`**.

---

## Miles Davis (`miles_davis`) — Song Mode harmony slice (three period contexts)

Primary songwriter **`miles_davis`** runs **`milesDavisSlice.ts`** on the golden-path duo timeline (**`precomputeMilesDavisEffectiveHarmonyBars`** → **`milesDavisEffectiveHarmonyBars`** for **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked export truth, **`composerOsAppGeneration`**). **`GenerationMetadata.milesDavisContext`** selects the period (**default `modal_1959`**): **`modal_1959`** · **`quintet_1965`** · **`electric_1970`**. API contract: **`GenerateRequest.milesDavisContext`** (echoed on manifests). Receipts use prefix **`md:`**. Alias **`miles`** → **`miles_davis`** via **`normalizeSongwriterStyleKey`**.

### Period contexts (harmonic bias)

| Context | Role |
|---------|------|
| **`modal_1959`** | Stage‑1 enrichments favour **Dorian / Lydian–Mixolydian** colours; **d1** **`applyModalCenterPass`** (85% attempt) tags **`md:modal_center@bar{N}`** and fills **`milesDavisModalCenterBars`** with per-bar modal labels. Phrase lengths weighted **4 / 2 / 6 / 8** bars (**55% / 28% / 12% / 5%**). |
| **`quintet_1965`** | More chromatic **tonic/dominant** dressing; **d2** **`applyTimeNoChangesPass`** (45%) rewrites bars toward **sus / 7sus4** ambiguity — **`md:time_no_changes@bar{N}`**, **`milesDavisTimeNoChangesBars`**. Phrase grid **4 / 2 / 6 / 8** (**45% / 35% / 15% / 5%**). |
| **`electric_1970`** | Shell chords skew **7sus4 / m7sus / 7(#9)**; **d3** **`applyGrooveVampPass`** (75% attempt, chart ≥16 bars) locks **16–32** consecutive bars to a vamp centre — **`md:groove_vamp@bar{N}`**, **`milesDavisVampBars`**. Phrase grid favours longer spans: **4 / 8 / 16 / 2** (**40% / 35% / 20% / 5%**). |

### Stage 1 — bare-symbol enrichment (no receipts)

- **Tonic / electric shells:** period-specific splits for bare **major** / **minor** / **triads** (see **`enrichMilesDavisTonic`** — electric era pushes **dom7sus4**, **m7sus**, **7(#9)** families).
- **Dominant:** **`modal_1959`** → **7(9,#11,13)** / **7(b9)** / **9**; **`quintet_1965`** → **7alt** / **tritone sub** / **13**; **`electric_1970`** → **7sus4** / **7(#9)** / **13**.
- **Minor (all contexts):** bare minor → **m7** / **m9** / **m11** mix (**`enrichMilesDavisMinor`**).

### Stage 2 — harmonic devices (receipts)

| Id | Pass | Gate | Receipt | Metadata |
|----|------|------|---------|----------|
| **d1** | Modal centre | **`modal_1959` only** | **`md:modal_center@bar{N}`** | **`milesDavisModalCenterBars`** |
| **d2** | Time no changes | **`quintet_1965` only** | **`md:time_no_changes@bar{N}`** | **`milesDavisTimeNoChangesBars`** |
| **d3** | Groove vamp | **`electric_1970`**, **tb ≥ 16** | **`md:groove_vamp@bar{N}`** | **`milesDavisVampBars`** |
| **d4** | Cool phrasing | all contexts | **`md:cool_phrase@bar{N}`** | **`milesDavisCoolMode`** when any fire |
| **d5** | Harmon-mute colour | phrase endings + slow-pass gate (**35%**) | **`md:harmon_color@bar{N}`** | extends **maj9(#11)**, **m9/m11**, **7(9,13)** |

### Style surface (period nudges)

**`applyMilesDavisStyleSurface`** runs for primary **`miles_davis`** (after Monk / Zappa surfaces in the stack): **`modal_1959`** → density **−0.25**, syncopation **−0.05**, space **+0.35**, cadence softness **+0.30**; **`quintet_1965`** → **−0.12** / **+0.10** / **+0.25** / **+0.20**; **`electric_1970`** → **+0.08** / **+0.22** / **+0.10** / **+0.15**.

### Melody planner row

**`MELODY_PROFILES['miles_davis']`** — stepwise · mixed rhythm · **repetitionVsVariationBias 0.72** · phrase **4** · arch contour · cadence **low** · devices **`modal_field`**, **`breath_space`**, **`deliberate_silence`**, **`cool_phrasing`**, **`motivic_cell`**.

### Six example applications (pick context before locking harmony)

1. **Modal plate (`modal_1959`)** — **32-bar** chart, moderate tempo, **custom_locked** or built-in progression with clear **tonic minor / Mixolydian dominant** poles. Expect **`md:modal_center`** receipts + **long 4-bar phrases** weighting; use when the lesson is **static modality**, not turnaround velocity.
2. **Quintet ambiguity (`quintet_1965`)** — Same chart length; flip **`milesDavisContext`** to **`quintet_1965`**. Watch **`md:time_no_changes`** on bars rewritten to **sus** families — good for **harmonic float** and **fewer iii–VI–ii–V clichés** on the lead sheet.
3. **Electric vamp (`electric_1970`)** — **≥16 bars**, slower groove preset if available; **`md:groove_vamp`** spans **16–32** bars of **one harmonic centre**. Pair with **electric-era surface** (density/sync lifts) when you need **repetition as composition**, not small-form bebop motion.
4. **Cool vs electric contrast** — Same **seed + locked chords**, run **Generate twice**: **`modal_1959`** vs **`electric_1970`**. Compare **`md:cool_phrase`** density + **`milesDavisCoolMode`** vs **`milesDavisVampBars`** — documents how **period metadata** steers **space vs ostinato** without changing your pasted symbols.
5. **Harmon colour on ballad sections** — Slow tempo + **phrase-final** weighting: **`md:harmon_color`** stacks **maj9(#11)**, **m9/m11**, **7(9,13)** on cadential bars **without** forcing a faster harmonic rhythm.
6. **Chord pools per era** — **`songModeBuilder`** exposes **`miles_davis_modal_1959`**, **`miles_davis_quintet_1965`**, **`miles_davis_electric_1970`** pools when **`primarySongwriterStyle === miles_davis`** (deterministic pick). Use when teaching **one writer id** but **three harmonic dialects**.

---

## Béla Bartók (`bartok`) — Song Mode harmony slice (three contexts)

Primary songwriter **`bartok`** runs **`bartokSlice.ts`** on the golden-path duo timeline (**`precomputeBartokEffectiveHarmonyBars`** → **`bartokEffectiveHarmonyBars`** for **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked export truth, **`composerOsAppGeneration`**). **`GenerationMetadata.bartokContext`** selects the surface (**default `mikrokosmos`**): **`mikrokosmos`** · **`string_quartet`** · **`music_for_strings`**. API contract: **`GenerateRequest.bartokContext`**. Receipts use prefix **`bk:`**. Aliases **`bela_bartok`**, **`bela`** → **`bartok`** via **`normalizeSongwriterStyleKey`**.

**Chord pools (axis / modal / orchestral bias)** — Song Mode scaffold rows in **`SONGWRITER_CHORD_POOLS`**: **`bartok_mikrokosmos`**, **`bartok_string_quartet`**, **`bartok_music_for_strings`**. When **`primarySongwriterStyle === bartok`**, **`chordSymbolsForSection`** resolves the pool with the same **seed-tier** pattern as Miles (**`Math.abs(seed) % 3`**). Vocabulary leans **axis motion** (minor-third / symmetric root moves), **quartal / add9 / #11** colours, **cluster / alt-dominant** spellings, and **folk-pentatonic** substrate symbols — not functional **ii–V–I** chains: **`breakFrankZappaIiViProgressions`** runs on the **four-bar** row after harmonic rhythm, same guard class as Zappa / Joni pools.

### Contexts (harmonic / density bias)

| Context | Role |
|---------|------|
| **`mikrokosmos`** | Piano-study bias: **quartal** / **sus4/** slash colours, **m11** / **add9** enrichment; **d1** axis substitution uses **±3** semitone-class moves on eligible bars (**`bk:axis_substitution@bar{N}`**). |
| **`string_quartet`** | Chamber spacing: **add9**, **maj7#11**, **m11** surfaces; **d1** axis substitution uses **±6** (tritone-axis) moves on eligible bars. |
| **`music_for_strings`** | Orchestral weight: **dominant alt** (**7(b9,b13)**), **maj7#11** peaks; **d1** axis substitution uses **±4** semitone-class moves. |

### Harmonic devices (receipts **`bk:`**)

| Id | Pass | Receipt |
|----|------|---------|
| **d1** | Axis substitution (context step) | **`bk:axis_substitution@bar{N}`** |
| **d2** | Golden-section climax (~**0.618 × totalBars** bar, chart **≥8**) | **`bk:golden_section_climax@bar{N}`** |
| **d3** | Bulgarian-style additive **accent** grid (4/4 scaffold; **metadata / receipt** only) | **`bk:bulgarian_rhythm@bar{N}`** |
| **d4** | Interval-cell transpose on phrase grid (**2,5,1** / **3,4,1** / **4,3,2** by context) | **`bk:interval_cell_transform@bar{N}`** |
| **d5** | Arch-form mirror (swap pairs around **pivot** on long forms) | **`bk:arch_form_mirror@bar{N}`** |

### Style surface (metadata nudges)

**`applyBartokStyleSurface`** — for all contexts: **space +0.28**, **syncopation +0.18**, **cadence softness +0.22** (clamped **0–1**). **Density** delta by context: **`mikrokosmos`** **+0.06**, **`string_quartet`** **−0.08**, **`music_for_strings`** **+0.02** (from prior **`songwriterDensityBias`** default **0.5** when unset).

### Melody planner row

**`MELODY_PROFILES['bartok']`** — angular · mixed rhythm · **repetitionVsVariationBias 0.35** · phrase **5** · **arch** contour · cadence **low** · devices **`folk_pentatonic_cell`**, **`axis_motion`**, **`bulgarian_cell`**, **`mirror_fragment`**, **`cluster_passing`**.

---

## George Gershwin (`gershwin`) — Song Mode harmony slice (three contexts)

Primary songwriter **`gershwin`** runs **`gershwinSlice.ts`** on the golden-path duo timeline (**`precomputeGershwinEffectiveHarmonyBars`** → **`gershwinEffectiveHarmonyBars`** for **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked export truth, **`composerOsAppGeneration`**). **`GenerationMetadata.gershwinContext`** selects the surface (**default `song_aaba`**): **`song_aaba`** · **`rhapsody`** · **`rhythm_changes`**. API contract: **`GenerateRequest.gershwinContext`**. Receipts use prefix **`gg:`**. Aliases **`george_gershwin`** → **`gershwin`** via **`normalizeSongwriterStyleKey`**.

**Chord pools (functional backbone + jazz extensions)** — Song Mode scaffold rows in **`SONGWRITER_CHORD_POOLS`**: **`gershwin_song_aaba`**, **`gershwin_rhapsody`**, **`gershwin_rhythm_changes`**. When **`primarySongwriterStyle === gershwin`**, **`chordSymbolsForSection`** picks a pool with the same **seed-tier** pattern as Miles / Bartók (**`Math.abs(seed) % 3`**). Vocabulary blends **I / ii7 / IV6(9) / V7(9)**-style functions with **Imaj7 / I6 / V7b9 / V7#5#9** colours, **secondary-dominant** approach, **chromatic passing** spellings, **augmented** and **diminished** connectors — not rolling textbook **ii–V–I** chains: **`breakFrankZappaIiViProgressions`** runs on the row after harmonic rhythm, same guard class as Zappa / Joni / Bartók pools.

### Contexts (form / grid bias)

| Context | Role |
|---------|------|
| **`song_aaba`** | Songbook **AABA**-leaning pool: **8-bar**-friendly rows, bridge contrast rows, **I maj7 / ii7 / V(9) / IV6(9)**-flavoured spellings. **d1** tags **AABA** / return anchors in metadata (`gg:d1_aaba_form@…`). |
| **`rhapsody`** | Concert **rhapsody** arc: wider **chromatic** / **dim** / **alt-dominant** pool rows; **d1** tags a **rhapsody_arc** pivot bar for long forms. |
| **`rhythm_changes`** | **Rhythm-changes** grid: **I–vi–ii–V**-flavoured and **turnaround**-biased pool rows; **d1** records **rhythm_changes** mode for the generation. |

### Harmonic devices (receipts **`gg:`**)

| Id | Pass | Receipt (examples) |
|----|------|----------------------|
| **d1** | AABA / rhapsody / rhythm grid anchors | **`gg:d1_aaba_form:…@…`**, **`gg:d1_aaba_form:rhapsody_arc@bar{N}`**, **`gg:d1_aaba_form:rhythm_changes@{totalBars}`** |
| **d2** | Blue-note colour (altered / #11 on dominants and colour on tonics) | **`gg:d2_blue_note_color@bar{N}`** |
| **d3** | Syncopated anticipation (secondary-dominant lead-in to the next bar) | **`gg:d3_syncopated_anticipation@bar{N}`** |
| **d4** | Chromatic passing (diminished connector on eligible bars) | **`gg:d4_chromatic_passing@bar{N}`** |
| **d5** | Minor-third modulation (brief **+3** semitone transpose window) | **`gg:d5_minor_third_modulation@bar{N}`** |

### Style surface (metadata nudges)

**`applyGershwinStyleSurface`** — for all contexts: **syncopation +0.26**, **density +0.12**, **space +0.14**, **cadence softness +0.18** (clamped **0–1** from prior **`songwriter*Bias`** defaults **0.5** when unset).

### Melody planner row

**`MELODY_PROFILES['gershwin']`** — mixed intervals · **`eighth_patterns`** · **repetitionVsVariationBias 0.38** · phrase **8** · **cabaret_arc** contour · cadence **high** · devices **`aaba_form`**, **`blue_note_color`**, **`syncopated_anticipation`**, **`chromatic_passing`**, **`minor_third_modulation`**.

---

## Arvo Pärt (`arvo_part`) — Song Mode harmony slice (three contexts)

Primary songwriter **`arvo_part`** runs **`arvoPartSlice.ts`** on the golden-path duo timeline (**`precomputeArvoPartEffectiveHarmonyBars`** → **`arvoPartEffectiveHarmonyBars`** for **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked export truth, **`composerOsAppGeneration`**). **`GenerationMetadata.arvoPartContext`** selects the posture (**default `fur_alina`**): **`fur_alina`** · **`spiegel`** · **`fratres`**. API contract: **`GenerateRequest.arvoPartContext`**. Receipts use prefix **`ap:`**. Aliases **`arvo`**, **`part`** → **`arvo_part`** via **`normalizeSongwriterStyleKey`**.

**Chord pools (triads only)** — Song Mode scaffold rows in **`SONGWRITER_CHORD_POOLS`**: **`arvo_part_fur_alina`**, **`arvo_part_spiegel`**, **`arvo_part_fratres`**. Rows use **tertian triad symbols only** (major / minor / dim / aug); the slice **`stripChordToTriad`** strips **7ths, sus, and extensions** from any upstream symbol before passes. When **`primarySongwriterStyle === arvo_part`**, **`chordSymbolsForSection`** picks a pool with the same **seed-tier** pattern as Miles / Bartók / Gershwin (**`Math.abs(seed) % 3`**). **`breakFrankZappaIiViProgressions`** does **not** run on these pools (slow triadic motion; avoid jazz-cycle substitutions).

### Tintinnabuli M + T rule (metadata)

The slice does **not** emit separate M/T MIDI voices; **`ap:d1_tintinnabuli_voice`** receipts document the **tintinnabuli pairing**: a deterministic **M-voice proxy** pitch class per bar (seeded) maps to a **T-voice** pitch class as the **nearest triad chord tone** — per-bar mode cycles **above** / **below** / **indexed** selection among the triad’s root–third–fifth pitch classes. Harmony symbols on the lead sheet remain triadic; pairing is for manifests / pedagogy.

### Contexts

| Context | Role |
|---------|------|
| **`fur_alina`** | Sparse **Fratres / Für Alina**-leaning pools; **triadic transformation** pass favours **±3** semitone root moves; additive receipt cells **`3+3+2`**. |
| **`spiegel`** | **Spiegel im Spiegel**-leaning mirrored rows; occasional **parallel major ↔ minor** toggle on the same root (**d5**); additive receipt **`2+2+2+2`**. |
| **`fratres`** | Oscillating / pedal-leaning rows; transformation pass favours **±5** semitone moves; additive receipt **`5+3`**. |

### Harmonic devices (receipts **`ap:`**)

| Id | Pass | Receipt (examples) |
|----|------|----------------------|
| **d1** | Tintinnabuli voice (M→T mapping metadata) | **`ap:d1_tintinnabuli_voice@bar{N}|m=…|t=…|mode=above\|below\|indexed`** |
| **d2** | Silence as structure (hold previous harmony) | **`ap:d2_silence_as_structure@bar{N}`** |
| **d3** | Additive rhythm (form-level scaffolding) | **`ap:d3_additive_rhythm|cells=…|tb=…`** |
| **d4** | Register arch (golden-section climax hint) | **`ap:d4_register_arch@bar{N}`** |
| **d5** | Triadic transformation (transpose / parallel toggle) | **`ap:d5_triadic_transformation@bar{N}|transpose=…`** or **`…|parallel`** |

**Drone / pedal bass** — **`ap:pedal_bass@bar{N}`** when a **tonic slash bass** is applied under shifting triads (`inferTonicPitchClassFromBar1`).

### Style surface (metadata nudges)

**`applyArvoPartStyleSurface`** — for all contexts: **space +0.45**, **density −0.28**, **syncopation −0.22**, **cadence softness +0.38** (clamped **0–1** from prior **`songwriter*Bias`** defaults **0.5** when unset).

### Melody planner row

**`MELODY_PROFILES['arvo_part']`** — stepwise · **`whole_bar`** rhythm · **repetitionVsVariationBias 0.55** · phrase **4** · **flat_with_terminal_climax** contour · cadence **low** · devices **`tintinnabuli_voice`**, **`silence_as_structure`**, **`additive_cell`**, **`register_arch`**, **`triadic_transform`**.

---

## Prince (`prince`) — Song Mode harmony slice (three contexts)

Primary songwriter **`prince`** runs **`princeSlice.ts`** on the golden-path duo timeline (**`precomputePrinceEffectiveHarmonyBars`** → **`princeEffectiveHarmonyBars`** for **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked export truth, **`composerOsAppGeneration`**). **`GenerationMetadata.princeContext`** selects the posture (**default `purple_rain`**): **`purple_rain`** · **`sign_o_times`** · **`kiss`**. API contract: **`GenerateRequest.princeContext`**. Receipts use prefix **`pr:`** for numbered devices **`d1`–`d5`**; additional borrowed hits use **`pr:borrow_flat_colour@bar{N}`** (not a **`d*`** slot).

**Chord pools (extended harmony)** — Song Mode scaffold rows in **`SONGWRITER_CHORD_POOLS`**: **`prince_purple_rain`**, **`prince_sign_o_times`**, **`prince_kiss`**. Vocabulary leans **m9 / m11**, dominant **9 / 13**, tonic **maj9 / 6·9**, and **sus9** ( **`9sus4`** ) colours — **`enrichPrinceCore`** lifts bare triads / plain dominants before device passes. When **`primarySongwriterStyle === prince`**, **`chordSymbolsForSection`** picks a pool with the same **seed-tier** pattern as Miles / Bartók / Gershwin (**`Math.abs(seed) % 3`** → tier maps **purple_rain / sign_o_times / kiss**).

### Contexts

| Context | Role |
|---------|------|
| **`purple_rain`** | Ballad–anthem-leaning rows; **d1** minor-vamp spans can extend longer than other contexts. |
| **`sign_o_times`** | Mid-era funk/soul grid; moderate vamp spans. |
| **`kiss`** | Tight dance-funk grid; shorter default vamp window. |

### Harmonic devices (receipts **`pr:`**)

| Id | Pass | Receipt (examples) |
|----|------|----------------------|
| **d1** | Minor vamp ( **`m9`** lock from first minor anchor ) | **`pr:d1_minor_vamp@bar{N}`** |
| **d2** | Gospel cadence ( **IV / V / I** colour lift on cadential anchors; skips **`B`** bridge bars ) | **`pr:d2_gospel_cadence@bar{N}`** |
| **d3** | Chromatic bass ( **`dim7`** connector on selected bars ) | **`pr:d3_chromatic_bass@bar{N}`** |
| **d4** | Stop-time ( phrase-boundary hit receipts ) | **`pr:d4_stop_time@bar{N}`** |
| **d5** | Bridge modulation ( dominant **+6** semitone transpose in **`B`** only ) | **`pr:d5_bridge_modulation@bar{N}`** |

**Borrowed colours** — occasional **♭VII maj9 / ♭III m9** via **`pr:borrow_flat_colour@bar{N}`** (non-bridge, capped).

### Style surface (metadata nudges)

**`applyPrinceStyleSurface`** — for all contexts: **syncopation +0.28**, **density +0.14**, **space +0.18**, **cadence softness +0.16** (clamped **0–1** from prior **`songwriter*Bias`** defaults **0.5** when unset).

### Melody planner row

**`MELODY_PROFILES['prince']`** — mixed intervals · **`eighth_patterns`** · **repetitionVsVariationBias 0.58** · phrase **4** · **groove_arc** contour · cadence **medium** · devices **`minor_vamp`**, **`gospel_cadence`**, **`chromatic_bass`**, **`stop_time`**, **`bridge_modulation`**.

---

## Beatles (`beatles`) — Song Mode harmony slice (three contexts)

Primary songwriter **`beatles`** runs **`beatlesSlice.ts`** on the golden-path duo timeline (**`precomputeBeatlesEffectiveHarmonyBars`** → **`beatlesEffectiveHarmonyBars`** for **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked export truth, **`composerOsAppGeneration`**). **`GenerationMetadata.beatlesContext`** selects the era (**default `merseybeat_1962`**): **`merseybeat_1962`** · **`rubber_soul_1965`** · **`abbey_road_1968`**. API contract: **`GenerateRequest.beatlesContext`**. Receipts use prefix **`bt:`** for numbered devices **`d1`–`d5`** (see table below); **`applyBeatlesDeviceReceiptPasses`** may tag **`@sectionB`** on **`B`** sections.

**Chord pools** — Song Mode scaffold rows in **`SONGWRITER_CHORD_POOLS`**: **`beatles_merseybeat_1962`**, **`beatles_rubber_soul_1965`**, **`beatles_abbey_road_1968`**. **`beatlesChordPoolSpec`** documents Roman/analytical roles per era: **Merseybeat** — diatonic major + blues **IV7 / I7**, secondary dominants, borrowed **iv / ♭VII / ♭VI**; **Rubber Soul** — extends Merseybeat with flat-side primaries (**♭III**, **♭VI**, **♭VII**), Mixolydian loops (**I–♭VII–IV**), **II / ♭II** colour resolutions; **Abbey Road** — chromatic mediants (**I→♭III**, **I→♭VI**), double-plagal (**I–♭VII–IV**), co-tonic centres (**vi / VI / ♭III**). When **`primarySongwriterStyle === beatles`**, **`resolveBeatlesChordPoolId`** picks a pool with the same **seed-tier** pattern as Miles / Prince (**`Math.abs(seed) % 3`** → tier maps **merseybeat_1962 / rubber_soul_1965 / abbey_road_1968**).

### Contexts

| Context | Role |
|---------|------|
| **`merseybeat_1962`** | Early rock’n’roll scaffold — diatonic + blues dominants; device receipts favour **`bt:d1`** / **`bt:d2`**. |
| **`rubber_soul_1965`** | Modal / flat-side colour era — **`bt:d2`** + **`bt:d4`** weighted in the pass. |
| **`abbey_road_1968`** | Studio-era system — **`bt:d3`**, **`bt:d5`**, **`bt:d4`** weighted in the pass. |

### Harmonic devices (receipts **`bt:`**)

| Id | Planner device | Receipt (examples) |
|----|----------------|----------------------|
| **d1** | AABA form | **`bt:d1_aaba_form@bar{N}`**, **`bt:d1_aaba_form@sectionB@bar{N}`** |
| **d2** | Flat-side modal | **`bt:d2_flat_side_modal@bar{N}`** |
| **d3** | Co-tonic switch | **`bt:d3_co_tonic_switch@bar{N}`** |
| **d4** | Chromatic mediant | **`bt:d4_chromatic_mediant@bar{N}`** |
| **d5** | Suite form | **`bt:d5_suite_form@bar{N}`** |

### Style surface (metadata nudges)

**`applyBeatlesStyleSurface`** — for all contexts: **density +0.08**, **syncopation −0.06**, **space +0.12**, **cadence softness +0.22** (clamped **0–1** from prior **`songwriter*Bias`** defaults **0.5** when unset; aligns with **`beatlesStyleSurface`** in **`beatlesSlice.ts`**).

### Melody planner row

**`MELODY_PROFILES['beatles']`** — mixed intervals · **`mixed`** rhythm · **repetitionVsVariationBias 0.5** · phrase **4** · **arch** contour · cadence **medium** · devices **`aaba_form`**, **`flat_side_modal`**, **`co_tonic_switch`**, **`chromatic_mediant`**, **`suite_form`**.

---

## Fela Kuti (`fela_kuti`) — Song Mode harmony slice (three contexts)

Primary songwriter **`fela_kuti`** runs **`felaKutiSlice.ts`** on the golden-path duo timeline (**`precomputeFelaKutiEffectiveHarmonyBars`** → **`felaKutiEffectiveHarmonyBars`** for **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked export truth, **`composerOsAppGeneration`**). **`GenerationMetadata.felaKutiContext`** selects the era (**default `zombie_1977`**): **`zombie_1977`** · **`water_no_get_enemy`** · **`lady_1972`**. API contract: **`GenerateRequest.felaKutiContext`**. Receipts use prefix **`fk:`** for numbered devices **`d1`–`d5`** (see table); **`applyFelaKutiDeviceReceiptPasses`** may tag **`@sectionB`** on **`B`** sections.

**Chord pools (static vamps)** — Song Mode scaffold rows in **`SONGWRITER_CHORD_POOLS`**: **`fela_kuti_zombie_1977`**, **`fela_kuti_water_no_get_enemy`**, **`fela_kuti_lady_1972`**. Vocabulary is **non-cadential**: cycling **Im7**, **♭VII7**, **IV7** (lead-sheet roots relative to minor tonic, e.g. **Am7 / G7 / D7**); optional **♭IIImaj7** (e.g. **Cmaj7**) as colour only — no textbook **V7→i** closure rows. When **`primarySongwriterStyle === fela_kuti`**, **`resolveFelaKutiChordPoolId`** picks a pool with **`Math.abs(seed) % 3`** → tier maps **zombie_1977 / water_no_get_enemy / lady_1972**.

**Yoruba pentatonic pitch pool** — analytical degree set **`FELA_YORUBA_PENTATONIC_DEGREES`** in **`felaKutiSlice.ts`**: **{ 1, 2, ♭3, 4, 5, 6, ♭7 }** (seven pitch classes); structural emphasis **1–5–♭7**. Copied to **`generationMetadata.felaKutiYorubaPentatonicDegrees`** during precompute for melody / receipt diagnostics.

**Implementation scope** — Harmony + melodic behaviour / metadata only. A dedicated **percussion / Afrobeat drum engine** is **not** part of this slice; treat as a **future sprint** if layered kit logic is required beyond harmony receipts.

### Contexts

| Context | Role |
|---------|------|
| **`zombie_1977`** | Long-form vamp emphasis — device receipts favour **`fk:d1`** / **`fk:d2`**. |
| **`water_no_get_enemy`** | Call–response + pentatonic layer — **`fk:d2`** + **`fk:d3`** weighted. |
| **`lady_1972`** | Horn-stack / polymetric stress — **`fk:d4`**, **`fk:d5`**, **`fk:d3`** weighted. |

### Harmonic devices (receipts **`fk:`**)

| Id | Planner device | Receipt (examples) |
|----|----------------|----------------------|
| **d1** | Static vamp | **`fk:d1_static_vamp@bar{N}`** |
| **d2** | Call–response | **`fk:d2_call_response@bar{N}`**, **`fk:d2_call_response@sectionB@bar{N}`** |
| **d3** | Pentatonic layer | **`fk:d3_pentatonic_layer@bar{N}`** |
| **d4** | Parallel horns | **`fk:d4_parallel_horns@bar{N}`** |
| **d5** | Polymetric grid | **`fk:d5_polymetric_grid@bar{N}`** |

### Style surface (metadata nudges)

**`applyFelaKutiStyleSurface`** — for all contexts: **syncopation +0.32**, **density +0.18**, **space −0.14**, **cadence softness +0.38** (clamped **0–1** from prior **`songwriter*Bias`** defaults **0.5** when unset; aligns with **`felaKutiStyleSurface`** in **`felaKutiSlice.ts`**).

### Melody planner row

**`MELODY_PROFILES['fela_kuti']`** — mixed intervals · **`mixed`** rhythm · **repetitionVsVariationBias 0.52** · phrase **4** · **groove_arc** contour · cadence **low** · devices **`static_vamp`**, **`call_response`**, **`pentatonic_layer`**, **`parallel_horns`**, **`polymetric_grid`**.

---

## Burt Bacharach (`bacharach`) — Song Mode harmony slice

### Signature style & key techniques

Theatre-pop / studio-orchestra harmony: **chromatic side-doors**, **deceptive cadences**, **descending slash bass**, **parallel-minor mixture** touches, lush tertian extensions on the chord row (avoid bare triads on phrase anchors), metric sophistication without dense funk comp.

### How Composer OS implements it

Canonical slice: **`engines/composer-os-v2/core/song-mode/bacharachSlice.ts`** (**`goldenPath/`** re-exports match other writers). Duo golden path runs **`precomputeBacharachEffectiveHarmonyBars`** → **`bacharachEffectiveHarmonyBars`**, which **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`**, and **`composerOsAppGeneration`** treat as locked-export truth for **`songwriterStyleId === 'bacharach'`**. Receipt prefix **`ba:*`** (e.g. **`ba:chromatic_side`**, **`ba:mixture_bVI`**, **`ba:inner_slash`**). Phrase grid: **`computeBacharachPhrasePositions`** with variable lengths **3 / 4 / 5 / 7 / 10 / 14** bars (weighted). Guitar chromatic / cadential melody nudges remain in **`applyBacharachGuitarBarPasses`** (`generateGoldenPathDuoScore.ts`).

### Style surfaces & default profile

Hook-first Song Mode: **`applyBacharachSongModeSurfaceV1`** — lower syncopation/density, slightly lower phrase regularity, raised deceptive-cadence + pedal metadata, **`registerSongModeSectionBehaviour`** (`sliceId: 'bacharach'`). When **`styleProfile === 'STYLE_SOPHISTICATED_POP'`**, **`applyBacharachStyleSurface`** stacks density **−0.08**, syncopation **+0.05**, cadence softness **+0.20**. **`defaultStyleProfileForPrimarySongwriter('bacharach')`** → **`STYLE_SOPHISTICATED_POP`**.

### Melody planner row

**`MELODY_PROFILES['bacharach']`** — mixed intervals · **`eighth_patterns`** · **repetitionVsVariationBias 0.3** · phrase **5** · irregular contour · devices **`metric_shift`**, **`phrase_extension`**, **`suspended_appoggiatura`**, **`chromatic_bass`**.

### Four example applications

1. **Locked progression + Bacharach grammar** — Paste **`custom_locked`** chart; confirm **`ba:*`** devices fire without overwriting protected bars.
2. **Bridge lift vs return** — Watch section behaviour receipts: bridge harmonic colour bias vs softened return.
3. **Sophisticated Pop stack** — Pair writer with **`STYLE_SOPHISTICATED_POP`** so both **`applyBacharachSongModeSurfaceV1`** and **`applyBacharachStyleSurface`** contribute (hook-first path).
4. **Long-form phrases** — **32-bar** forms expose **7–10-bar** phrase windows from **`computeBacharachPhrasePositions`** — useful for teaching **non-four-square** phrase endings.

---

## Brian Wilson — Pet Sounds (`brian_wilson`) — Song Mode harmony slice

### Signature style & key techniques

**Pet Sounds**-era harmony: **chromatic bass motion**, **half-dim / aug / dim7** colour touches, **modal mixture** (two-bar tonic major → **i7**), **♭VII as subdominant substitute**, **slash / inverted dominant** colour, **semitone-down** section seams.

### How Composer OS implements it

Slice **`brianWilsonPetSoundsSlice.ts`** ( **`goldenPath/brianWilsonPetSoundsSlice.ts`** re-exports). **`precomputeBrianWilsonEffectiveHarmonyBars`** → **`brianWilsonEffectiveHarmonyBars`** for locked routing + manifests. Five numbered devices emit **`bw:device1…5:*@bar{N}`** receipts (e.g. **`bw:device3:bvii_subdominant`**, **`bw:device5:semitone_mod_down`**). **`inferTonicPitchClassFromBar1`** is shared infrastructure for several slices. **`applyBrianWilsonGuitarBarPasses`** shapes guitar registers/pickups on the duo path.

### Style surface

No dedicated **`applyBrianWilson…StyleSurface`** in **`songModeStyleSurface.ts`**; writer fingerprint is **harmony receipts + guitar passes** (compare **`STYLE_*`** surfaces chosen in Generate).

### Melody planner row

**`MELODY_PROFILES['brian_wilson']`** — stepwise · mixed · **repetitionVsVariationBias 0.5** · phrase **7** · arch · devices **`sequential_expansion`**, **`appoggiatura`**, **`suspension`**.

### Four example applications

1. **Section-boundary modulation** — Form with verse → chorus transitions; watch **`bw:device5`** + modulation hints on metadata.
2. **♭VII colour** — Major-key verse progressions with IV → **♭VIImaj7** reads.
3. **Modal mixture bar** — Two-bar tonic hold → **`bw:device4`** **i7** mixture.
4. **Locked chart regression** — Same seed + locked chords; receipts stable across runs.

---

## Cole Porter (`cole_porter`) — Song Mode harmony slice

### Signature style & key techniques

Great American Songbook **chromatic approach**, **secondary-dominant density**, **♭VI colour** before cadences, **major/minor shift** on phrase roles, **beguine-aligned** syncopation metadata on the harmony pass.

### How Composer OS implements it

**`colePorterSlice.ts`** — **`precomputeColePorterEffectiveHarmonyBars`** → **`colePorterEffectiveHarmonyBars`**, receipts **`cp:*`** (e.g. **`cp:chrom_descent`**, **`cp:diatonic_density`**, **`cp:bvi_color`**, **`cp:beguine`**). Wired through **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`**, **`composerOsAppGeneration`**. Aliases **`cole_porter`**, **`porter`**. **`defaultStyleProfileForPrimarySongwriter('cole_porter')`** → **`STYLE_SOPHISTICATED_POP`**.

### Style surface

**`applyColePorterStyleSurface`** (hook-first): density **+0.05**, syncopation **+0.08**, space **−0.05**, cadence softness **−0.10** — cleaner cadential theatre-jazz metadata.

### Melody planner row

**`MELODY_PROFILES['cole_porter']`** — stepwise · **`eighth_patterns`** · **repetitionVsVariationBias 0.75** · phrase **4** · arch · cadence **high** · devices **`chromatic_descent`**, **`hook_identity`**, **`bvi_color`**, **`diatonic_density`**, **`beguine_feel`**.

### Four example applications

1. **Cadential chromatic bass** — Progressions targeting **`cp:chrom_descent`** on dominant approaches.
2. **Bridge tension** — **`cp:bvi_color`** on phrase-middle bars before cadences.
3. **Beguine pocket** — **`porterBeguineFeelActive`** + receipts for eighth-syncopation teaching.
4. **A/B with Bacharach** — Same locked chords: **`cole_porter`** vs **`bacharach`** — compare **`cp:*`** vs **`ba:*`** density.

---

## Radiohead (`radiohead`) — Song Mode harmony slice

### Signature style & key techniques

**OK Computer / Kid A**-adjacent lead-sheet grammar: **Phrygian pedal** colours (slash pedals), **chromatic insertion** above tonic, **borrowed iv**, **withheld tonic** in verse openings, delayed functional resolution.

### How Composer OS implements it

**`radioheadSlice.ts`** (**`goldenPath/radioheadSlice.ts`** re-export). **`precomputeRadioheadEffectiveHarmonyBars`** → **`radioheadEffectiveHarmonyBars`**, device receipts **`rh:device1…5:*`** (e.g. **`rh:device1:phrygian_pedal`**, **`rh:device5:absent_tonic`**). Uses **`coarseSectionRoleFromBar`** / **`inferTonicPitchClassFromBar1`** from **`brianWilsonPetSoundsSlice`** helpers.

### Style surface

No dedicated primary **`applyRadioheadStyleSurface`** — texture comes from **devices + melody profile**.

### Melody planner row

**`MELODY_PROFILES['radiohead']`** — stepwise · mixed · **repetitionVsVariationBias 0.8** · phrase **5** · **`flat_with_terminal_climax`** · devices **`cell_repetition`**, **`modal_unease`**, **`metric_dislocation`**.

### Four example applications

1. **Verse absence of tonic** — **`rh:device5`** on early verse bars in major or minor.
2. **Phrygian pedal lesson** — Verse, beats 1–2 of each four-bar cell; **`rh:device1`** slash pedals.
3. **Borrowed iv peak** — Major key, **`b % 8 === 0`** peaks → **`rh:device4`**.
4. **Borrowed vs Phrygian** — Contrast **`rh:device3`** chromatic insertion vs **`rh:device1`** pedal rows.

---

## New Composer Slices — Shipped (Session 2)

Five Song Mode / duo golden-path **harmony slices** landed in one engineering batch (slice modules under **`engines/composer-os-v2/core/song-mode/`**, golden-path barrels under **`core/goldenPath/`**, **`buildReharmLensConfig`**, **`SONGWRITER_CHORD_POOLS`**, **`buildAllVaultChordRuleSets`** phrase bias). Below: **git commit** for the slice integration, **phase / posture**, **reharm lens triad** (**tritoneRate**, **susBias**, **chromaticMediantBias** where applicable), **core device**, and **phrase templates** (research labels → vault / slice metadata).

### `thelonious_monk` — **dac9251f**

| Field | Value |
|-------|--------|
| **Phase / posture** | No era phase — angular Monk grammar (**`MONK_SLICE_PARAMETERS`**). |
| **Tritone / sus / chromatic mediant** | **0.35** / **0.05** / **0.75** |
| **Core device** | ♭9 dominants, tonic **maj7/#11**, strip lush stacks, deferred cadence (**`tm:*`** receipts). |
| **Phrase templates** | **`angular`**, **`displaced`** (`vaultPhraseTemplates` / vault **`phraseTemplatesForChordTheloniousMonk`**). |

Primary implementation: **`theloniousMonkSlice.ts`**, **`precomputeTheloniousMonkEffectiveHarmonyBars`** → **`theloniousMonkEffectiveHarmonyBars`**. Aliases **`monk`**, **`thelonious`**.

### `john_coltrane` — **3da53e5f**

| Field | Value |
|-------|--------|
| **Phase / posture** | **`coltranePhase`**: **`changes`** (dense third-cycle, default) vs **`modal`** (long vamp / quartal) — **`COLTRANE_SLICE_PARAMETERS.defaultPhase`** **`changes`**. |
| **Tritone / sus / chromatic mediant** | **0.15** / **0.5** / **0.95** |
| **Core device** | Three-tonic augmented cycle + optional modal quartal pedals (**`jc:*`**). |
| **Phrase templates** | **`ascending_thirds`**, **`quartal`** (`vaultPhraseTemplates`; vault **`phraseTemplatesForChordJohnColtrane`**). |

Primary implementation: **`johnColtraneSlice.ts`**, **`precomputeJohnColtraneEffectiveHarmonyBars`** → **`johnColtraneEffectiveHarmonyBars`**.

### `herbie_hancock` — **bcffe159**

| Field | Value |
|-------|--------|
| **Phase / posture** | **`hancockPhase`**: **`modal`** (default) · **`funk`** · **`vsop`** — **`HANCOCK_SLICE_PARAMETERS.defaultPhase`** **`modal`**. |
| **Tritone / sus / chromatic mediant** | **0.15** / **0.85** / **0.6** |
| **Core device** | Quartal / sus9 modal pedals, side-slip chromaticism, fusion upper-structure (**`hh:*`**). |
| **Phrase templates** | Quartal / modal pedal / side-slip — **`phraseTemplatesForChordHerbieHancock`** (no bebop-insertion sweep). |

Primary implementation: **`herbieHancockSlice.ts`**, barrel **`goldenPath/herbie_hancock.ts`**, **`precomputeHerbieHancockEffectiveHarmonyBars`** → **`herbieHancockEffectiveHarmonyBars`**.

### `wayne_shorter` — **ce688b70**

| Field | Value |
|-------|--------|
| **Phase / posture** | **`shorterPhase`**: **`hardbop+`** · **`mid60s`** (default) · **`fusion`** · **`late`** — **`SHORTER_SLICE_PARAMETERS.defaultPhase`** **`mid60s`**. |
| **Tritone / sus / chromatic mediant** | **0.2** / **0.45** / **0.85** |
| **Core device** | Chromatic mediant root motion + chord-scale networks; chromatic wedge (**`ws:*`** / **`ws:wedge:*`**). |
| **Phrase templates** | **`floating`** / **`mediant_chain`** / **`wedge_pass`** (mapped in vault via **`phraseTemplatesForChordWayneShorter`**). |

Primary implementation: **`wayneShorterSlice.ts`**, barrel **`goldenPath/wayne_shorter.ts`**, **`precomputeWayneShorterEffectiveHarmonyBars`** → **`wayneShorterEffectiveHarmonyBars`**.

### `andrew_hill` — **db2a3183**

| Field | Value |
|-------|--------|
| **Phase / posture** | **`hillMode`**: **`postbop_free`** (default) vs **`modal_cluster`** — **`HILL_SLICE_PARAMETERS.defaultMode`**. |
| **Tritone / sus / chromatic mediant** | **0.4** / **0.15** / **0.7** |
| **Core device** | Hybrid cluster voicings over pitch fields; loose function (**`ah:*`**). |
| **Phrase templates** | **`angular`** / **`cluster_field`** / **`displaced`** (**`phraseTemplatesForChordAndrewHill`**). |

Primary implementation: **`andrewHillSlice.ts`**, barrel **`goldenPath/andrew_hill.ts`**, **`precomputeAndrewHillEffectiveHarmonyBars`** → **`andrewHillEffectiveHarmonyBars`**.

---

## New Composer Slices — Shipped (Session 3)

Four Song Mode / duo golden-path **harmony slices** (plus infrastructure above): slice modules under **`engines/composer-os-v2/core/song-mode/`**, golden-path barrels **`core/goldenPath/{steve_reich,jim_hall,thad_jones,joni_mitchell}.ts`**, **`buildReharmLensConfig`**, **`SONGWRITER_CHORD_POOLS`**, **`buildAllVaultChordRuleSets`** (`phraseTemplatesForChordSteveReich` · **`JimHall`** · **`ThadJones`** · **`JoniMitchellVault`**). Commits on **`main`**:

### `steve_reich` — **`8b9dfad57e3b26d1055886ee4880de97feec61d3`** (short: **`8b9dfad5`**)

| Field | Value |
|-------|--------|
| **Phase / posture** | **`reichProcess`**: **`phasing`** (default) · **`additive`** · **`cycle`** — **`STEVE_REICH_SLICE_PARAMETERS.defaultProcess`** **`phasing`**. |
| **Tritone / sus / chromatic mediant** | **0.02** / **0.4** / **0.05** |
| **Static dominant bias** | **0.95** (long pedal / slow functional motion in lens terms). |
| **Core device** | **`pitch_field_process`** — one diatonic field + rhythmic/phasing process (**`sr:*`**); **not** Glass-like modular chord streams (**distinction:** Glass = more changes + sequences; Reich = single field + process). |
| **Phrase templates (research → vault)** | **`additive_build` \| `phase_drift` \| `drone_field`** — vault prefers **`modal_pedal`**, **`quartal`**, **`triad-sweep`**, **`dyad-bounce`**, **`side_slip`**; strips **`bebop-insertion`** / **`liquid-resolution`**. |

Primary implementation: **`steveReichSlice.ts`**, **`precomputeSteveReichEffectiveHarmonyBars`** → **`steveReichEffectiveHarmonyBars`**. **Closest neighbour:** **`philip_glass`** — Reich keeps **high pulse density under one field** vs Glass **modular harmonic rhythm**; **`arvo_part`** — tintinnabuli / silence grid vs Reich **rhythm-busy process**.

### `jim_hall` — **`f516d22d56c51777e7214152a775dba93436fa6e`** (short: **`f516d22d`**)

| Field | Value |
|-------|--------|
| **Phase / posture** | **`jimHallMode`**: **`duo`** (default) · **`trio`** · **`solo`** — **`JIM_HALL_SLICE_PARAMETERS.defaultMode`** **`duo`**. |
| **Tritone / sus / chromatic mediant** | **0.25** / **0.3** / **0.35** |
| **Static dominant bias** | **0.3** |
| **Core device** | **`interval_first_guitar`** — shell+one comping, warm extensions, inner-voice chromaticism as colour (**`jh:*`**). **`maxVoicingNotes`**: **3**. |
| **Phrase templates (research → vault)** | **`sparse_interval` \| `inner_chromatic` \| `counter_melody`** — vault adds **`triad-sweep`**, **`dyad-bounce`**, **`quadratonic-enclosure`**, **`modal_pedal`**, **`side_slip`**, **`tension-climb`**; drops **`bebop-insertion`**. |

Primary implementation: **`jimHallSlice.ts`**, **`precomputeJimHallEffectiveHarmonyBars`** → **`jimHallEffectiveHarmonyBars`**. **Closest neighbour:** **`pat_metheny`** — Hall is **sparse interval economy + duo counter-melody**; Metheny allows **wider voicing spread / ECM lyrical arcs**. **`bill_evans`** — Evans stacks **voice-led seventh colours**; Hall **limits vertical density** and favours **guide-tone + one colour**.

### `thad_jones` — **`aa2172c30dd59aa9ebb60ec5e1c6dd089ea1d154`** (short: **`aa2172c3`**)

| Field | Value |
|-------|--------|
| **Phase / posture** | **`thadPhase`**: **`swing`** (default) · **`ballad`** · **`groove`** — **`THAD_JONES_SLICE_PARAMETERS.defaultPhase`** **`swing`**. |
| **Tritone / sus / chromatic mediant** | **0.45** / **0.1** / **0.3** |
| **Static dominant bias** | **0.2** |
| **Core device** | **`extended_common_practice_big_band`** — nonachord / poly-chord default stacks; **SOLI** vs **SHOUT** regions (**`tj:*`**), side-slip on dominants, blues IVm borrow. **`nonachordBias`**: **0.7**. |
| **Phrase templates (research → vault)** | **`nonachord_stack` \| `bebop_soli` \| `shout_chorus`** — vault **`phraseTemplatesForChordThadJones`**: **`bebop-insertion`**, **`tension-climb`**, **`dyad-bounce`**, **`quadratonic-enclosure`**, **`side_slip`**. |

Primary implementation: **`thadJonesSlice.ts`**, barrel **`goldenPath/thad_jones.ts`**, **`precomputeThadJonesEffectiveHarmonyBars`** → **`thadJonesEffectiveHarmonyBars`**. **Closest neighbour:** **`duke_ellington`** — Duke maps **call/response / jungle / orchestral shout staging**; Thad defaults **bebop-era vertical density** (nonachord everyday) and **explicit SOLI vs SHOUT** alteration tiers.

### `joni_mitchell` — **`35e18bdb1bba782ec20b85b47babfb88f45c286c`** (short: **`35e18bdb`**)

| Field | Value |
|-------|--------|
| **Phase / posture** | **`joniPhase`**: **`folk_modal`** (default) · **`jazz_folk`** · **`modal_jazz`** — **`JONI_MITCHELL_SLICE_PARAMETERS.defaultPhase`** **`folk_modal`**. |
| **Tritone / sus / chromatic mediant** | **0.05** / **0.9** / **0.15** |
| **Static dominant bias** | **0.65** |
| **Core device** | **`sus_to_sus_motion`** — tuning-derived pitch-field voicings; **`pitchFieldAnchor`**, **`openStringSimulation`**; sus resolves to plain triads mainly at cadences (**`susResolutionRate`** **0.15**). |
| **Phrase templates (research → vault)** | **`sus_cluster` \| `modal_vamp` \| `melody_led`** — vault **`phraseTemplatesForChordJoniMitchellVault`**: **`quartal`**, **`modal_pedal`**, **`liquid-resolution`**, **`dyad-bounce`**, **`triad-sweep`**; **removes `bebop-insertion`**. |

Primary implementation: **`joniMitchellSlice.ts`**, barrel **`goldenPath/joni_mitchell.ts`**, **`precomputeJoniMitchellEffectiveHarmonyBars`** → **`joniMitchellEffectiveHarmonyBars`**. **Closest neighbour:** **`radiohead`** — both use **modal colour + pedals**; Joni is **sus-first songwriter pitch-field / tuning metaphor** vs Radiohead **Phrygian pedal + rock chromatic insertion**. **`steve_reich`** — both can sit on fields; Joni is **harmony led by melody + sus grammar**, Reich by **additive/phasing process**.

---

## Thelonious Monk (`thelonious_monk`) — Song Mode harmony slice

### Signature style & key techniques

Angular bebop-era harmony: **♭9 dominant** colour, **tonic maj7/#11**, **strip lush extensions**, **deferred cadence** — space-forward chord symbols.

### How Composer OS implements it

**`theloniousMonkSlice.ts`**. **`precomputeTheloniousMonkEffectiveHarmonyBars`** → **`theloniousMonkEffectiveHarmonyBars`**, receipts **`tm:*`**. Routing identical locked-export pattern. Aliases **`monk`**, **`thelonious`**.

### Style surface

**`applyMonkStyleSurface`**: density **−0.12**, syncopation **+0.30**, space **+0.35**, cadence softness **+0.10**.

### Melody planner row

**`MELODY_PROFILES['thelonious_monk']`** — angular · mixed · **repetitionVsVariationBias 0.6** · phrase **2** · irregular · devices **`tritone`**, **`whole_tone_fragment`**, **`chromatic_enclosure`**, **`deliberate_silence`**.

### Four example applications

1. **Dominant colour** — Compare **`tm:*`** altered dominants vs baseline Barry Harris grammar on same chart.
2. **Space + angular melody** — Pair Monk surface with **2-bar** phrase melody profile for pedagogy.
3. **Locked harmony QA** — Verify Monk bars replace **`getChordForBar`** output bar-for-bar.
4. **Contrast with Bill Evans** — **`thelonious_monk`** primary (**`applyMonkStyleSurface`**, keyed off writer id) vs **`bill_evans`** primary + **`STYLE_MODERN_JAZZ`** (**`applyBillEvansStyleSurface`**) — different pocket metadata.

---

## Duke Ellington (`duke_ellington`) — Song Mode harmony slice

### Signature style & key techniques

Big-band **jungle growl** dominant alterations, **chromatic diminished** approach, **call/response** mapping, **parallel planing** on tonic pedals, **shout chorus** staging — encoded as **symbol-level** receipts (`de:*`).

### How Composer OS implements it

**`dukeEllingtonSlice.ts`**. **`precomputeDukeEllingtonEffectiveHarmonyBars`** → **`dukeEllingtonEffectiveHarmonyBars`**. Phrase lengths **4 / 8 / 2 / 6** at **60% / 22% / 13% / 5%**. **`ellingtonCallResponseMap`** metadata from **`applyCallResponseFlagPass`**.

### Style surface

**`applyDukeEllingtonStyleSurface`**: density **+0.15**, syncopation **+0.22**, space **−0.10**, cadence softness **+0.08**.

### Melody planner row

**`MELODY_PROFILES['duke_ellington']`** — mixed · **`eighth_patterns`** · **repetitionVsVariationBias 0.6** · phrase **4** · riff contour · devices **`blues_riff`**, **`call_response`**, **`chromatic_inner_voice`**, **`plunger_color`**, **`sectional_shout`**.

### Four example applications

1. **Shout zone** — Long charts: **`de:shout`** staging near form end (see slice **`computeShoutStartBar`**).
2. **Call/response grid** — Alternate-bar **`de:call`** / **`de:response`** receipts for ensemble rhetoric on duo lead sheet.
3. **Jungle colour** — Dominant bars → **`de:jungle_growl`** variants.
4. **Ellington vs Schneider pastoral** — **`de:*`** orchestral density vs **`ms:nature_arc`** — different metaphors on paper.

---

## Maria Schneider (`maria_schneider`) — Song Mode harmony slice

### Signature style & key techniques

Large-ensemble pastoral **modal tonic colour**, **pedal ostinati**, **intro/outro nature-arc** washes, **colour-stack** phrase endings, **non-functional planing** mid-phrase — expressed as **lead-sheet symbol** transformations.

### How Composer OS implements it

**`mariaSchneiderSlice.ts`**. **`precomputeMariaSchneiderEffectiveHarmonyBars`** → **`mariaSchneiderEffectiveHarmonyBars`**, receipts **`ms:*`**. Phrase grid **`computeSchneiderPhrasePositions`**: lengths **4 / 6 / 8 / 5 / 7 / 9** bars (**28% / 22% / 22% / 14% / 9% / 5%**). Stage‑1 enrichment flavours bare tonic/dominant/minor symbols before **`ms:*`** passes (**Lydian #11**, **7(b9,#11,13)** families, rich minor stacks).

### Stage 2 devices (abbrev.)

| Id | Receipt pattern | Role |
|----|-----------------|------|
| **d1** | **`ms:lyd_center`** | Tonic Lydian colour |
| **d2** | **`ms:pedal`** | ≥4-bar fixed-root ostinato |
| **d3** | **`ms:nature_arc`** | Intro/outro pastoral **`maj7(add9)`** |
| **d4** | **`ms:color_stack`** | Phrase-final altered stacks |
| **d5** | **`ms:planing`** | Phrase-middle parallel shift |

### Style surface

**`applyMariaSchneiderStyleSurface`**: density **+0.05**, syncopation **−0.20**, space **+0.25**, cadence softness **+0.28**.

### Melody planner row

**`MELODY_PROFILES['maria_schneider']`** — stepwise · mixed · **repetitionVsVariationBias 0.85** · phrase **7** · arch · cadence **low** · devices **`sparse_phrase`**, **`modal_field`**, **`breath_space`**, **`nature_arc`**, **`chamber_texture`**.

### Four example applications

1. **Nature arc bookends** — Short forms; **`ms:nature_arc`** only first/last ≤4 bars.
2. **Pedal vs nature arc** — Static harmony mid-piece (**`ms:pedal`**) vs intro/outro wash (**`ms:nature_arc`**).
3. **Long-form planing** — 48–64 bars; **`ms:planing`** breaks ii–V–I loops in phrase middles.
4. **Not ECM Chamber** — **`maria_schneider`** slice ≠ **`ecm_chamber`** writer — different pools + receipts.

---

## Bill Evans (`bill_evans`) — Song Mode harmony slice

### Signature style & key techniques

Impressionist jazz harmony: **extension-rich** symbols, **sus / quartal** dominant colours, **delayed tonic** resolutions, gentle **ii–V** preparation — all at **chord-symbol** layer.

### How Composer OS implements it

**`billEvansSlice.ts`**. **`precomputeBillEvansEffectiveHarmonyBars`** → **`billEvansEffectiveHarmonyBars`**, receipts **`be:*`**. Phrase lengths **3 / 4 / 5** bars (**22% / 56% / 22%**).

### Style surface (`STYLE_MODERN_JAZZ`)

**`applyBillEvansStyleSurface`** runs when **`styleProfile === 'STYLE_MODERN_JAZZ'`** and **`jobimMode` is not true** — density **−0.05**, cadence softness **+0.22**, space **+0.12**. When primary is **Jobim**, **`jobimMode`** is **true** (`runGoldenPath` style resolution) so **`applyJobimStyleSurface`** replaces Evans on the same profile.

### Melody planner row

**`MELODY_PROFILES['bill_evans']`** — stepwise · mixed · **repetitionVsVariationBias 0.4** · phrase **8** · arch · devices **`inner_voice_melody`**, **`modal_interchange`**, **`delayed_resolution`**, **`impressionistic_voicing`**.

### Four example applications

1. **Evans vs Jobim on Modern Jazz** — Toggle primary **`bill_evans`** vs **`antonio_carlos_jobim`** with **`STYLE_MODERN_JAZZ`**; watch **`applyBillEvansStyleSurface`** vs **`applyJobimStyleSurface`** notes.
2. **Suspension-heavy dominants** — Scan **`be:*`** receipts on dominants for sus/quartal language.
3. **Delayed tonic** — Cadential bars where tonic maj colours arrive late in phrase window.
4. **Phrase asymmetry** — **3-bar** vs **5-bar** weights ≠ typical **4/8** pop phrases.

---

## Frank Zappa (`frank_zappa`) — Song Mode harmony slice

### Signature style & key techniques

**Polytonal superimposition**, **metric displacement**, **xenochrony-like** offsets, **style juxtaposition**, **through-composed sectional cuts** — encoded as **`fz:d{1–5}`** devices plus **harmony language floors** (altered density quotas).

### How Composer OS implements it

**`frankZappaSlice.ts`**. Duo path calls **`attachFrankZappaHarmonyContext`**, which runs **`precomputeFrankZappaEffectiveHarmonyBars`**, freezes **`HarmonyContext`**, and exposes **`frankZappaEffectiveHarmonyBars`** for **`getChordForBar`**. **`enforceZappaHarmonyLanguageFloors`** guarantees minimum altered/colour density.

### Context modes

**`FrankZappaContextMode`** on **`GenerationMetadata`** / **`GenerateRequest`**: **`avant_rock`** (default) · **`big_band`** · **`futuristic_jazz`**. Surfaces: **`applyFrankZappaStyleSurface`** reads **`frankZappaContext`**, sets **`frankZappaSyntheticScaleBias`**, **`computeZappaDensityArc`** → per-bar density bias + mean **`songwriterDensityBias`**; syncopation **+0.22**, space **−0.15**.

### Melody planner row

**`MELODY_PROFILES['frank_zappa']`** — angular · **`eighth_patterns`** · **repetitionVsVariationBias 0.2** · phrase **3** · irregular · devices **`polyrhythmic_unison`**, **`chromatic_sideslip`**, **`interval_expansion`**, **`synthetic_scale`**, **`sudden_meter_change`**.

### Four example applications

1. **Context A/B** — Same locked chords, **`frankZappaContext`** **`avant_rock`** vs **`futuristic_jazz`** — compare **`fz:*`** rates + synthetic-scale bias.
2. **HarmonyContext checksum** — Export truth uses frozen **`harmonyContext.bars`** when attached.
3. **Odd meter maps** — **`barMeterMap`** + Zappa slice (host-safe MusicXML) for lesson plans.
4. **Density arc** — **`frankZappaDensityBiasByBar`** teaches sectional density cliffs without manual MIDI editing.

---

## Antônio Carlos Jobim (`antonio_carlos_jobim`) — Song Mode harmony slice

### Signature style & key techniques

Bossa / Brazilian jazz: **rich tonic** spellings (**6/9**, **maj6**, minor colours), **altered dominants** with voice-leading motivation, **tritone subs**, **backdoor** resolutions, **passing diminished**, **Lydian dominant** touches — receipts **`aj:*`** (James Brown retains **`jb:*`**).

### How Composer OS implements it

**`jobimSlice.ts`**. **`precomputeJobimEffectiveHarmonyBars`** → **`jobimEffectiveHarmonyBars`**. Phrase grid mostly **4 / 8 / 2** bars (**65% / 20% / 15%**). **`finalizeJobimMetadata`** emits consolidated **`jobimSliceReceipt`**. **`jobimBossaAnticipationBars`** marks anticipation targets.

### Style surface vs Bill Evans

Style resolution sets **`jobimMode: true`** when primary resolves to **`antonio_carlos_jobim`** (`runGoldenPath`). With **`STYLE_MODERN_JAZZ`** + **`jobimMode`**, **`applyJobimStyleSurface`** applies density **−0.08**, syncopation **+0.18**, cadence softness **+0.15** — **instead of** **`applyBillEvansStyleSurface`**.

### Melody planner row

**`MELODY_PROFILES['antonio_carlos_jobim']`** — stepwise · **`eighth_patterns`** · **repetitionVsVariationBias 0.5** · phrase **8** · arch · devices **`bossa_anticipation`**, **`lydian_dominant`**, **`chromatic_approach`**, **`sigh_figure`**.

### Four example applications

1. **SubV / backdoor counts** — Read **`jobimDiagnostics.subVOrBackdoorTouches`** + **`aj:tri_sub`** / **`aj:backdoor`** receipts.
2. **Bossa anticipation bars** — Inspect **`jobimBossaAnticipationBars`** for comp anticipation pedagogy.
3. **Modern Jazz surface flip** — Same **`STYLE_MODERN_JAZZ`**: swap **`bill_evans`** ↔ **`antonio_carlos_jobim`** primaries to compare surfaces.
4. **Phrase-final six-nine** — Watch **`applyPhraseFinalSixNineOnTonic`** outcomes on tonic arrivals.

---

## Debussy (`debussy`) — Song Mode harmony slice

### Signature style & key techniques

Impressionist parallel colour: **whole-tone / augmented** touches, **parallel planing**, **pentatonic** contrasts, **appoggiatura** chord symbols, **arabesque** motif flags — lead-sheet only (no Classical orchestration claim).

### How Composer OS implements it

**`debussySlice.ts`**. **`precomputeDebussyEffectiveHarmonyBars`** → **`debussyEffectiveHarmonyBars`**, receipts **`db:*`** (e.g. **`db:arabesque`**, **`db:appoggiatura`**, planing / whole-tone families per slice passes). **`debussyArabesqueBars`** + **`debussyArabesqueMotifByBar`** optional lesson metadata.

### Style surface

**`applyDebussyStyleSurface`**: density **+0.14**, syncopation **+0.09**, space **+0.31**, cadence softness **+0.34** — wash-forward bias separate from **`db:*`** harmony devices.

### Melody planner row

**`MELODY_PROFILES['debussy']`** — stepwise · mixed · **repetitionVsVariationBias 0.5** · phrase **3** · **`dissolving`** contour · devices **`whole_tone_melody`**, **`pentatonic_contrast`**, **`parallel_planing`**, **`unresolved_appoggiatura`**, **`arabesque`**.

### Four example applications

1. **Wash vs cadence** — Pair **high** cadence softness surface with **`db:*`** resolution suppression receipts.
2. **Arabesque lesson** — **`debussyArabesqueMotifByBar`** kinds (**sequence_by_step**, **register_shift**, …) for motif taxonomy demos.
3. **Locked harmony** — **`debussy`** locked truth parity same as Bill Evans / Bacharach QA checklist.
4. **Contrast Cole Porter** — Theatre **`cp:*`** cadential clarity vs **`db:*`** blurred cadence — same classroom chart, two writers.

---

## Ornette Coleman (`ornette_coleman`) — Song Mode harmony slice

### Period contexts (`ornetteColemanContext`)

**API / metadata** — **`GenerateRequest.ornetteColemanContext`** → **`generationMetadata.ornetteColemanContext`**: **`shape_1959`** \| **`free_1961`** \| **`science_1971`** (default **`shape_1959`** when omitted).

- **`shape_1959`** — Loose changes with song-form phrase windows; harmolodic centre labels without forcing cadential closure.
- **`free_1961`** — Longer asymmetric phrases and wide collective-density spans (phrase grid reads “collective,” not bar-clock funk).
- **`science_1971`** — Short ostinato-feel phrase cells (2–4 bars) and tighter alternating density windows for groove-forward harmolodic spelling.

### Harmolodic chord pools

Built-in **`SONGWRITER_CHORD_POOLS`** in **`songModeBuilder.ts`** resolve from primary **`ornette_coleman`** via **`seed % 3`**: **`ornette_coleman_shape_1959`**, **`ornette_coleman_free_1961`**, **`ornette_coleman_science_1971`**. Rows emphasize **loose tonal axes** (root / fifth / ninth / minor-third relationships), **non-resolving** minor-seventh cycles (e.g. **Cm7 → Ebm7 → F#m7 → Am7**), tagged **`no_ii_v_i`**, optional **`centre:`** / **`looseAxes:`** / **`rogueChromatics:`** on **`chosenRowTags`**. Built-in harmony also runs **`breakFrankZappaIiViProgressions`** so rolling ii–V–I triples do not survive unchanged.

### How Composer OS implements it

**`ornetteColemanSlice.ts`** (re-export **`engines/composer-os-v2/core/goldenPath/ornetteColemanSlice.ts`**). **`precomputeOrnetteColemanEffectiveHarmonyBars`** → **`ornetteColemanEffectiveHarmonyBars`**, device receipts **`oc:*`**:

| Device | Receipt prefix | Role |
|--------|------------------|------|
| d1 | **`oc:d1_harmolodic_center`** | Floating / harmolodic centre fields (`ornetteColemanHarmolodicCentreLabels` when present). |
| d2 | **`oc:d2_asymmetric_phrase_grid`** | Phrase-start ticks on the asymmetric phrase grid. |
| d3 | **`oc:d3_non_resolving_turnaround`** | Break functional ii–V–I chains + soften phrase-final dominants so turns do not cadence. |
| d4 | **`oc:d4_chromatic_departure`** | Chromatic root moves (minor-third / tritone bias in the departure pool). |
| d5 | **`oc:d5_collective_density_shift`** | Alternating dense / sparse harmonic spelling bands (span scales by context). |

**Diagnostics** — **`ornetteColemanDiagnostics`**, **`ornetteColemanSliceReceipt`**, **`ornetteColemanAntiElaborationGuards`** (`iiViChainsBroken`).

### Style surface

**`applyOrnetteColemanStyleSurface`** — space **+0.35**, density **−0.12**, syncopation **+0.04**, cadence softness **+0.28** (melody-forward metadata; separate from **`oc:*`** harmony passes).

### Melody planner row

**`MELODY_PROFILES['ornette_coleman']`** — angular · **`whole_bar`** · **repetitionVsVariationBias 0.42** · phrase **5** · **`irregular`** contour · devices **`melody_over_harmony`**, **`asymmetric_contour`**, **`minor_third_departure`**, **`tritone_sidestep`**, **`low_syncopation`**, **`breath_space`**.

### Four example applications

1. **Context A/B** — Fix seed; switch **`ornetteColemanContext`** **`shape_1959`** ↔ **`science_1971`** and compare **`ornetteColemanDeviceReceipts`** / phrase receipts (**`oc:d2_*`** vs **`oc:d5_*`** density bands).
2. **Locked harmony QA** — **`ornette_coleman`** participates in locked export truth (**`customLockedHarmonyRouting`**, **`composerOsAppGeneration`**) like other slice primaries.
3. **Pool pedagogy** — Inspect manifest **`chosenRowTags`** for **`centre:`**, **`looseAxes:`**, **`rogueChromatics:`** on harmolodic rows.
4. **Contrast Miles** — **`md:*`** modal / cool pocket vs **`oc:*`** harmolodic non-resolution — same Song Mode form, different grammar.

---

## Chord Inspector

**API** (`engines/composer-os-v2/core/irealpro/`):

- **`inspectChordSymbol(input, tuningId?)`** — Parses any chord symbol string (e.g. **Cmaj7**, **F#min9**, **Bb7#11**), maps it to the Tonality Vault, and returns a **`ChordInspectorResult`**: vault chord type id, **melodic triad** pitch classes, **primary tension** note (pitch class), **quadratonic** pitch classes, and **guitar grips** (`FretboardRealization[]`) for the chosen tuning (`tuningId` optional; default **standard**).
- **`inspectChordToMusicXml(input, options?)`** — Chains the inspector to **`generateVaultRiff`** (`vaultRiffGenerator.ts`) and emits a minimal valid **MusicXML** string (4/4, treble clef): **`ScoreNote`** rows become written pitches with **`<notations><technical><string/><fret/></technical></notations>`** where string/fret are present. Options include **`bars`** (1, 2, or 4), **`mode`** (solo / melody; steers default riff style), **`tuningId`**, and **`riffStyle`**.

**UI** (`apps/composer-os-app/src/pages/HomeGenerate.tsx`): Collapsible **Chord Inspector** block — chord symbol text input, **Solo** / **Melody** mode toggle, **bars** selector (1 / 2 / 4), **riff style** dropdown, **tuning** dropdown. **Inspect Chord** shows the Vault breakdown. **Generate + Export MusicXML** triggers a browser download of a **`.xml`** file ready for **Sibelius** and **Guitar Pro 8** (GP8).

---

## Tonality Vault — Build UI (complete)

**Summary:** All Tonality Vault builds **A** through **I** plus **C2**, **IMG**, and **UI** are now complete. The full Tonality Vault roadmap is shipped.

### UI iterations (1–5)

1. **Iteration 1 — Fretboard + tab scaffold:** **`FretboardPanel`** (fretboard.js) and **`TabPanel`** (VexFlow) with **role colour encoding** — **`triadRoot`** green, **`primaryTension`** amber, **`secondaryTension`** orange, **`triadPairTension`** red, **`bebopPassing`** purple, **`chaos`** pink.
2. **Iteration 2 — Layers + legality chrome:** **`LayerToggleBar`** — four buttons **L0–L3**; **beat legality** visual indicators (**strong** = solid, **weak** = half opacity, **syncopated** = dashed, **approachOnly** = hollow); **note click** handler.
3. **Iteration 3 — Playback trail:** **`playbackNotes`** with glow, **`trailNotes`** at **30%** opacity, **position band** overlay with CSS transition, **`positionLock`** indicator.
4. **Iteration 4 — Export + layout:** **`FretboardExporter`** PNG (**SVG → Canvas → PNG** download), **dark mode** (**#1a1a2e** background), responsive **16:9** layout.
5. **Iteration 5 — Vault Microscope:** **`VaultMicroscope`** — scrubber **0 … totalBars×4** (beats), **Play / Pause / Stop** (advance **0.5** beat / **500ms**); **`TensionState`** badge (**resolve** green, **primary** blue, **tension** amber, **chaos** red, **recover** purple); active note highlighting per beat via **`LayerStateMachine`**; **layer** row from **`getAllowedLayers()`**; **beat legality** table from **`buildBeatContextLegalityMap`**; embedded **`FretboardPanel`** (**`darkMode={true}`**).

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

- **Advanced:** Profiles that apply **harmony/rhythm metadata surfaces**, **builtin chord-plan policies**, or **golden-path slice wiring** (effective harmony bars, guitar bar passes, receipts) beyond velocity-only contouring. Examples: **Post-Bop (Shorter)**, **Modern Jazz**, **Sophisticated Pop**, **Groove / Soul**, **`STYLE_ECM`**, **`STYLE_ECM_CHAMBER`**, and — as of the style-to-slice wiring — **`STYLE_SONIC_YOUTH`**, **`STYLE_JONI_MITCHELL`**, **`STYLE_PAT_METHENY`**.
- **Light touch:** Primarily **velocity shaping** on the finished duo score (`applySongModeStyleEngineToScore`); may stack with era/style-pairing biases but does not alone run a full writer slice.

#### Light touch styles — research backlog

**Folk Guitar Narrative** (`STYLE_FOLK_GUITAR_NARRATIVE`) — **needs Perplexity research before build** — no composer anchor identified yet.

RESEARCH NEEDED: composer anchors, musical distinctives, pipeline approach — run Perplexity session before building

**Classical Influence** (`STYLE_CLASSICAL_INFLUENCE`) — **needs Perplexity research before build** — no composer anchor identified yet.

RESEARCH NEEDED: composer anchors, musical distinctives, pipeline approach — run Perplexity session before building

**Bebop variants** — **`STYLE_BEBOP_LITE`**, **`STYLE_BEBOP_POST_BOP`**, and **`STYLE_SHORTER_POST_BOP`** overlap in naming and velocity contours; product distinction between variants is not yet settled — **needs Perplexity research before build**.

RESEARCH NEEDED: composer anchors, musical distinctives, pipeline approach — run Perplexity session before building

**Wiring summary (Sonic Youth / Joni / Pat style ids)**

| `StyleProfile` | Velocity layer | Engine wiring |
|----------------|----------------|---------------|
| **`STYLE_SONIC_YOUTH`** | Aggressive offbeat emphasis; **`noise_wall`** macro texture → large positive deltas; **`clearing`** → deep reduction; reads **`ChordEvent.sonicYouth.textureState`** when present, else **`getSonicYouthTextureStateAtBar`** (`sonicYouthSlice.ts`). | When primary songwriter **or** this style: **`precomputeSonicYouthEffectiveHarmonyBars`**, **`applySonicYouthGuitarBarPasses`**, **`getChordForBar`** / locked-truth paths accept **`sonicYouthEffectiveHarmonyBars`** (`harmonyResolution.ts`, **`customLockedHarmonyRouting.ts`**, **`runGoldenPath.ts`** export truth). |
| **`STYLE_JONI_MITCHELL`** | Wide dynamic range; phrase-soft attack, peak toward bar midpoint (`startBeat` sine), gentle phrase tail. | **`applyJoniStyleFolkModalHarmonyPolicy`** (`joniStyleHarmonyPolicy.ts`) on **builtin** chord plans — lighter cadential gravity, suspended-colour preference. When songwriter **or** style: **`precomputeJoniMitchellEffectiveHarmonyBars`**, **`joniMitchellEffectiveHarmonyBars`** authority in **`getChordForBar`**. Alternate tuning gate unchanged (`alternateGuitarTunings.ts`). |
| **`STYLE_PAT_METHENY`** | Lyrical swell (mid-bar peak), soft downbeats, phrase-end decay — avoids hard accents. | When songwriter **or** style: **`precomputePatMethenyEffectiveHarmonyBars`**, **`patMethenyEffectiveHarmonyBars`** in **`getChordForBar`** + locked export truth. |

### Diversity presets (Song Mode)

**What they are:** Optional **shortcut recipes** in **Generate** (Song Mode) that pick a **primary + secondary songwriter** pair and a **human label**, defined in **`SONG_MODE_DIVERSITY_PRESETS`** (`engines/composer-os-v2/core/song-mode/songwriterStyleResolver.ts`). Each entry has an **`id`**, **`label`**, **`primarySongwriterStyle`**, **`secondarySongwriterStyle`**, and an **`audibleDescription`** string for UI copy.

**How they interact with style pairing:** Choosing a preset runs client-side logic (`HomeGenerate.tsx`): **`resolveSongModeDiversityPreset`** loads the row, then **`setSongwriterStyle` / `setSecondarySongwriterStyle`** are updated from the preset. **`resolveSongModeDiversityStylePairing`** (`stylePairingResolver.ts`) maps that preset **`id`** to a suggested **`arrangerStyle`** and **`era`** (e.g. Thad + contemporary, Schneider + post_bop), and the UI updates **Arranger** and **Era** to match. On generate, the wire carries **`primarySongwriterStyle`**, optional **`secondarySongwriterStyle`**, and **`stylePairing`** (`songwriterStyle`, `arrangerStyle`, `era`) like any manual selection — **`buildCompiledSong`** calls **`resolveStylePairing`** so **confidence / experimental flags / section-contrast nudges** apply the same way. The diversity **`preset` id itself is not sent on `GenerateRequest`**; only the resolved controls matter downstream.

**Which combinations are wired:** All **nine** presets are defined and listed in the **Diversity preset (optional)** dropdown:

| `id` | UI label | Primary | Secondary | Suggested pairing (`resolveSongModeDiversityStylePairing`) |
|------|----------|---------|-----------|------------------------------------------------------------|
| `fagen_wonder_pocket` | Jazz-Pop Pocket | donald_fagen | stevie_wonder | `thad` · contemporary |
| `shorter_bacharach_arc` | Angular Lyric Arc | wayne_shorter | bacharach | `schneider` · post_bop |
| `beatles_bach_counterline` | Hook + Counterline | beatles | bach | `ellington` · swing |
| `kendrick_debussy_space` | Motif + Colour Space | kendrick_lamar | debussy | `gil_evans` · cool_jazz |
| `maxmartin_stravinsky_angles` | Hook Grid + Asymmetry | max_martin | stravinsky | `basie` · bebop |
| `dylan_messiaen_literate_vs_sublime` | Literate Folk vs Sublime Colour | bob_dylan | messiaen | `schneider` · post_bop |
| `james_brown_joni_groove_vs_line` | Groove Cell vs Shifting Line | james_brown | joni_mitchell | `ellington` · contemporary |
| `barry_harris_max_martin_bebop_vs_charts` | Bebop Line vs Chart Template | barry_harris | max_martin | `basie` · bebop |
| `ecm_chamber_prince_space_vs_pocket` | Chamber Space vs Pocket Funk | ecm_chamber | prince | `gil_evans` · cool_jazz |

**Which are not covered:** Any songwriter combination **outside** these nine rows — there is **no** diversity preset until one is added to **`SONG_MODE_DIVERSITY_PRESETS`** and (if needed) **`resolveSongModeDiversityStylePairing`**. Other modes (**Big Band**, **ECM Chamber**, etc.) do **not** expose this control; it is **Song Mode only**.

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

### Bill Evans (Song Mode — impressionist / rootless-symbol slice)

**Still current:** **`billEvansSlice.ts`**, **`precomputeBillEvansEffectiveHarmonyBars`**, **`billEvansEffectiveHarmonyBars`** feeding **`getChordForBar`** and locked MusicXML truth, smoke **`billEvansSliceSmoke.test.ts`**.

The slice **only rewrites chord symbols** on the duo golden path (Bill Evans–flavoured tertian richness, sus/quartal hints, delayed tonic landings); there is no separate **`ChordEvent`** extension layer.

#### Asymmetric phrase grid

**`computeBillEvansPhrasePositions(totalBars, seed)`** assigns **phraseStart** / **phraseMiddle** / **phraseFinal** using variable phrase lengths **3, 4, or 5 bars** weighted **22% / 56% / 22%** (same rolling-bar layout pattern as ECM Chamber / variable-grid Bacharach). Each **phraseStart** emits **`be:asym_phrase@bar{N}`**.

#### Retuned base pass rates (seeded probability)

| Device | Receipt | Target rate |
|--------|---------|----------------|
| Dominant → 13 colour | `be:dom_extension@bar{N}` | **34%** |
| Maj7 family → maj9 | `be:maj_colour@bar{N}` | **42%** |
| m7 → m11 quartal hint | `be:quartal_m11@bar{N}` | **24%** |
| Dominant → 7sus4 | `be:sus_dom@bar{N}` | **18%** |
| Phrase-final tonic → maj9 / 6/9 | `be:delayed_tonic@bar{N}` | **44%** |
| Gentle ii–V prep | `be:gentle_ii_V@bar{N}` | **31%** |

#### Six newer passes (five harmony passes + phrase grid)

| Pass | Role | Receipt |
|------|------|---------|
| **Asymmetric phrase grid** | Replaces fixed 4-bar cycle; **phraseStart** marks each new phrase | `be:asym_phrase@bar{N}` |
| **Diminished delayed resolution** | Phrase-final **major** cadence: preceding **dominant** bar may become **#ii°7** or **vii°7** (`dim7` spelling); **skips** dominants already coloured **sus** | `be:dim_delayed_res@bar{N}` |
| **IV minor borrow** | Phrase-middle, **major-key** context: **IV → ivm9** | `be:iv_minor_borrow@bar{N}` |
| **Minor detour** | Phrase-middle three-bar **iiø–V–minor i** (major key); skips cadence targets already tied to **dim delayed** resolution | `be:minor_detour@bar{N}` |
| **Inner voice melody** (lead-sheet proxy) | Phrase-middle, **rich** tertian symbol: adds **slash bass** a semitone either side of the **3rd** (inner-line hint) | `be:inner_voice@bar{N}` |
| **Locked hands approximation** | Phrase-start: **slash bass** under lighter textures (3rd / m6 / M6 colour rotation); skips dense **alt** / **dim** symbols | `be:locked_hands_approx@bar{N}` |

#### Modern Jazz style surface

**`STYLE_MODERN_JAZZ`** triggers **`applyBillEvansStyleSurface`** (`songModeStyleSurface.ts`): **`songwriterDensityBias`** **−0.05**, **`songwriterCadenceSoftness`** **+0.22**, **`songwriterSpaceBias`** **+0.12** (clamped **0–1**). Wired in **`runGoldenPath.ts`** **after** **`applyBacharachStyleSurface`** and **before** **`applySophisticatedPopStyleSurface`** — stacks with other style surfaces when multiple profiles apply.

#### Example applications

1. **Primary `bill_evans` + Modern Jazz** — Full Evans harmony slice **plus** softer density / softer cadence / more space metadata; default **lesson** preset when teaching impressionist **lead-sheet** colour.
2. **Evans harmony only** — Pick Evans as songwriter but another **Style Engine** profile if you want **symbol** devices without Modern Jazz surface nudges.
3. **Custom_locked chart + Evans** — Stress **`be:*`** receipts against a **fixed** progression; phrase grid still reshapes **roles** bar-to-bar.
4. **Evans + Evans odd-meter preset** — Combine **variable phrase grid** with **`barMeterMap`** (`evans_five_three`, **Peace Piece**, etc.); verify **MusicXML** meter lines vs phrase receipts.
5. **Seed A/B** — Asymmetric phrase boundaries change which passes fire; **lock seed** when demoing a specific **`be:dim_delayed_res`** or **`be:minor_detour`** outcome.
6. **Duo guitar–bass + arranger Gil Evans** — Use Evans **slice** for **symbols** on the lead-sheet path while ensemble pairing handles **orchestration** receipts separately.

### Duke Ellington (Song Mode — orchestral / jungle timbre lead-sheet slice)

**Still current:** **`dukeEllingtonSlice.ts`**, **`precomputeDukeEllingtonEffectiveHarmonyBars`**, **`dukeEllingtonEffectiveHarmonyBars`** feeding **`getChordForBar`** and locked MusicXML / export / disk truth, receipts **`de:*`** on **`dukeEllingtonDeviceReceipts`**, re-export **`goldenPath/dukeEllingtonSlice.ts`**.

The slice **only rewrites chord symbols** on the duo golden path (extension-rich **tonic / dominant / minor** pass, then five **d1–d5** devices). **Metadata** also carries **`ellingtonCallResponseMap`** (per-bar **call** / **response** roles) and **`ellingtonShoutBars`** (1-based bar indices in the shout window).

#### Variable phrase grid

**`computeEllingtonPhrasePositions(totalBars, seed)`** assigns **phraseStart** / **phraseMiddle** / **phraseFinal** using variable phrase lengths **4, 8, 2, or 6 bars** weighted **60% / 22% / 13% / 5%** (same rolling-bar layout pattern as Bill Evans / Jobim / Monk variable grids). Phrase roles drive **jungle growl** (phrase-start only), **chromatic diminished** (approach to phrase-final cadence), and contrast with the **shout** window (final **8–16** bars of the form, span rule in slice).

#### Stage 1 — per-bar enrichment (before d1–d5)

| Family | Input (lead-sheet proxy) | Weighted outputs |
|--------|--------------------------|-------------------|
| **Tonic major** (bare / maj / maj7 on tonic) | **maj9(#11)** **35%**, **maj13(#11)** **25%**, **maj6** **25%**, **maj9** **15%** |
| **Dominant** (plain **dom7** family) | **dom9** **40%**, **dom13** **25%**, **dom7(b9)** **20%**, **dom7(#9,b13)** **15%** |
| **Bare minor** | **m6(9)** **35%**, **m9** **30%**, **m7** **25%**, **m6** **10%** |

#### Stage 2 — passes (receipts **`de:*`**)

| Pass | Rate / scope | Role | Receipt |
|------|----------------|------|---------|
| **d1 Jungle growl** | **22%**, **phraseStart** only, **minor or dominant** context | Dark colours: **dominant** → **7(b9#5)** / **7(b9b5)**; **minor phrase-start** → **m6(9)** | **`de:jungle_growl@bar{N}`** |
| **d2 Chromatic diminished** | **25%**, bar **before** a **phraseFinal** cadence target | **CT°7** spelling **one semitone above** the resolution chord root | **`de:chrom_dim@bar{N}`** |
| **d3 Call / response** | **60%** receipt rate, **all bars** | Deterministic **odd bars = call**, **even bars = response** on **`ellingtonCallResponseMap`**; receipt only when the Bernoulli gate fires | **`de:call@bar{N}`** / **`de:response@bar{N}`** |
| **d4 Parallel planing** | **20%**, **two consecutive tonic-centre** bars | Upper structure **±1 semitone** vs sustained tonic root → **`upperChord/tonicBass`** slash | **`de:planing@bar{N}`** |
| **d5 Shout chorus** | **100%** of bars in the **final section** (last **8–16** bars per form rule) | Forces **maj9(#11)** or **dom13** (tonic minor colour → **m9**); fills **`ellingtonShoutBars`** | **`de:shout@bar{N}`** |

#### Ellington style surface (primary songwriter)

When **`normalizeSongwriterStyleKey(primary) === 'duke_ellington'`**, **`applyDukeEllingtonStyleSurface`** (`songModeStyleSurface.ts`) runs from **`runGoldenPath`** **immediately after** **`applyMonkStyleSurface`**: **`songwriterDensityBias +0.15`**, **`songwriterSyncopationBias +0.22`**, **`songwriterSpaceBias −0.10`**, **`songwriterCadenceSoftness +0.08`** (clamped **0–1**). Stacks with groove / ECM / sophisticated-pop surfaces when those profiles also apply.

#### Example applications (jungle vs shout vs call/response)

1. **Jungle growl only** — Short form (**8 bars**); lock **seed** until **`de:jungle_growl`** appears on a **phraseStart** bar; contrast with **adjacent** phrase-start bars that stay **ungrowled** when the **22%** gate misses — teaches **phrase-entry** colour vs middle-weight **extensions** from stage 1 alone.
2. **Shout chorus only** — **32-bar** custom_locked or built-in long form; inspect **`ellingtonShoutBars`** + **`de:shout@bar{N}`** on the **last 8–16** bars — **harmonic density** spikes there (**maj9(#11)** / **dom13** / tonic-minor **m9**) while **earlier** bars keep normal **de:** mix — distinct from **jungle**, which fires on **phrase boundaries**, not **finale span**.
3. **Call / response narrative** — Same seed: read **`ellingtonCallResponseMap`** + **`de:call`** / **`de:response`** receipts (**60%** of bars tagged in receipts); **odd/even** structure is **always** in the map even when a bar has **no** receipt — use for **arrangement** (answer fills, horn kicks) **without** implying a different harmony row than **`dukeEllingtonEffectiveHarmonyBars`**.
4. **Jungle vs shout on one chart** — **Phrase-start** **`de:jungle_growl`** can appear in **bars 1–24**; **`de:shout`** clusters only in **`ellingtonShoutBars`** — compare manifest: growl = **entry colour**; shout = **terminal orchestration** lift (different **musical jobs**).
5. **Chromatic diminished bridge** — Watch **`de:chrom_dim`** on the bar **before** **`phraseFinal`** tonic (**CT°7** approach); pair with **custom_locked** bridge bars to hear **dim → tonic** vs **Evans** **`be:dim_delayed_res`** (different phrase logic).
6. **Parallel planing sustain** — Hold **tonic** across **two** bars, then check **`de:planing`** (**slash** upper stack vs pedal bass) — teaches **half-step deck** colour distinct from **shout** (no requirement for **maj9(#11)**) and from **call/response** (purely horizontal register motion).

### Thelonious Monk (Song Mode — angular dominant / whole-tone fragment slice)

**Still current:** **`theloniousMonkSlice.ts`**, **`precomputeTheloniousMonkEffectiveHarmonyBars`**, **`theloniousMonkEffectiveHarmonyBars`** feeding **`getChordForBar`** and locked MusicXML truth, receipts **`tm:*`** on **`theloniousMonkDeviceReceipts`**, smoke **`theloniousMonkSliceSmoke.test.ts`**.

The slice **rewrites chord symbols** on the duo golden path (b9 / angular tonic colour / deferred cadence / contrast sus / whole-tone fragments / chromatic-enclosure slash hints) and writes **silence/rest intent metadata** for downstream melody timing — no dedicated **`ChordEvent`** extension layer beyond standard harmony export.

#### Asymmetric phrase grid

**`computeMonkPhrasePositions(totalBars, seed)`** assigns **phraseStart** / **phraseMiddle** / **phraseFinal** using variable phrase lengths **4, 5, 7, 9, or 6 bars** weighted **58% / 14% / 14% / 11% / 3%**. Each **phraseStart** emits **`tm:asym_phrase@bar{N}`** (same rolling-bar layout pattern as Bill Evans / Jobim / ECM variable grids). Phrase role drives **phrase-final tritone sub**, **chromatic enclosure** (middle only), and **deliberate silence** placement.

#### Harmony passes (rates + receipts)

| Pass | Role | Receipt |
|------|------|---------|
| **Whole-tone fragment** | **20%** on dominant-function bars (**7** / **7b9** / **7alt**), roots only at **V**, **bII**, or **II-of-V** vs tonic — spells **`7(b5#5)`** or **`aug7`** | **`tm:whole_tone@bar{N}`** |
| **Chromatic enclosure** | **25%**, **phraseMiddle** only: if **previous** bar reads as **high-density** chord, add **slash bass** = chromatic approach (±1 semitone) toward current chord **3rd or 5th** | **`tm:chrom_enclosure@bar{N}`** |
| **Deliberate silence** | **14%** on **phraseFinal** bars → **`monkSilenceBars`** (full-bar silence intent); **10%** of **phraseMiddle** → **`monkPartialRestBars`** (melody after beat **3**) | **`tm:deliberate_silence@bar{N}`** |

Existing Monk passes (**lush strip**, **tonic colour**, **dominant b9/alt**, **phrase-final tritone sub**, **contrast sus**) keep earlier **`tm:*`** receipts (e.g. **`tm:tritone_sub@bar{N}`**, **`tm:contrast_sus@bar{N}`**).

#### Monk style surface (primary songwriter)

When **`normalizeSongwriterStyleKey(primary) === 'thelonious_monk'`**, **`applyMonkStyleSurface`** (`songModeStyleSurface.ts`) runs from **`runGoldenPath`** **immediately after** **`applyFrankZappaStyleSurface`**: **`songwriterDensityBias −0.12`**, **`songwriterSyncopationBias +0.30`**, **`songwriterSpaceBias +0.35`**, **`songwriterCadenceSoftness +0.10`** (clamped **0–1**). Stacks with **STYLE_ECM** / Chamber surfaces when both apply.

#### Duo LOCK note (bass motion)

Angular harmony + slash enclosure can widen **chromatic bass** motion; Barry Harris module validation allows **18 semitone** max consecutive bass leap for **`thelonious_monk`** (same budget as **`wayne_shorter`**) so golden-path gates stay green without relaxing guitar melody gates.

#### Example applications

1. **Primary `thelonious_monk` + STYLE_ECM** — Angular **lead-sheet** harmony plus sparse **space/sync** metadata stack; good for lessons on **off-centre** phrasing vs straight **four-bar** blues grids.
2. **Long-form 32 bars + Monk** — Asymmetric grid changes **phrase-final** placement vs fixed **4-bar** cycle; compare **`tm:asym_phrase`** timeline to **Bill Evans** **`be:asym_phrase`** on the same **seed** family.
3. **`custom_locked` chart + Monk** — Fixed progression still runs **slice** devices; watch **`tm:chrom_enclosure`** slash hints vs export **MusicXML** truth (slash bass must round-trip).
4. **Seed A/B** — Same **writer** + **preset**, different **seeds**: **whole-tone** and **enclosure** rates are seeded bar-local — lock **seed** when demoing a specific **`tm:whole_tone@bar{N}`** outcome.
5. **Silence metadata inspection** — After Generate, read **`monkSilenceBars`** / **`monkPartialRestBars`** on **`GenerationMetadata`** for arranging **rests** / late melody entry in a DAW (metadata intent, not forced MIDI deletion).
6. **Paste / iReal chart + Monk** — Vault / paste pipelines feed **harmony** into the same **effective-bar** path; use **multi-chorus** options to hear **phrase-grid** + **motif** tension phase shift chorus-to-chorus while **`tm:*`** receipts stay in the manifest.

### Frank Zappa (Song Mode — polytonal clash / sectional harmonic slice)

**Still current:** **`frankZappaSlice.ts`**, **`precomputeFrankZappaEffectiveHarmonyBars`**, **`frankZappaEffectiveHarmonyBars`** → **`getChordForBar`** / **`attachFrankZappaHarmonyContext`** / locked export truth; receipts **`fz:d1–d5:…@bar{N}#v1`** plus additive **`fz:lyd_dominant`**, **`fz:bitonal_triad`**, **`fz:motif_recycle_*`**, **`fz:hard_cut_trigger`**.

The slice **rewrites chord symbols** on the duo golden path (devices **d1–d5**: polytonal slash, metric displacement, xenochrony offset, style juxtaposition, through-composed cut). Additive passes stack **after** the primary device loop; **slash-bass symbols are left untouched** on those passes so slash spelling stays aligned with locked harmony assertions.

#### Three context modes (`frankZappaContext`)

API / **`GenerateRequest`** / **`RunGoldenPathOptions`** → **`GenerationMetadata.frankZappaContext`**. Default when omitted: **`avant_rock`**.

| Mode | Role |
|------|------|
| **`avant_rock`** | Default **studio-rock / collage** bias — synthetic bucket includes **`synthetic`** weight in scale-bias metadata. |
| **`big_band`** | **Lydian / Mixolydian / Dorian** only (three-way split in **`frankZappaSyntheticScaleBias`**). |
| **`futuristic_jazz`** | Adds **Lydian dominant**, **diminished**, **whole-tone**, **`custom`** alongside core **Lydian** weights. |

#### Density arc — six zones

**`computeZappaDensityArc(totalBars)`** maps each bar to **`songwriterDensityBias`-lane values** along **intro → build1 → peak1 → drop → peak2 → outro** with time shares **12% / 22% / 12% / 18% / 28% / 8%** and zone densities **0.30 / 0.55 / 0.85 / 0.25 / 0.95 / 0.35**. **`precomputeFrankZappaEffectiveHarmonyBars`** stores **`frankZappaDensityBiasByBar`** and refreshes it after **hard-cut** triggers (tail segment **re-zoned** from the cut bar).

#### Synthetic scale bias (metadata)

**`resolveFrankZappaSyntheticScaleBias(mode)`** fills **`frankZappaSyntheticScaleBias`** on **`GenerationMetadata`** — manifest/teaching weights only, not a separate scale engine:

- **avant_rock:** Lydian **40%** · Dorian **30%** · Mixolydian **20%** · synthetic **10%**
- **big_band:** Lydian **50%** · Mixolydian **25%** · Dorian **25%**
- **futuristic_jazz:** Lydian **35%** · Lydian dominant **20%** · diminished **15%** · whole-tone **10%** · custom **20%**

#### Additive harmony passes (post–d1–d5 loop)

| Pass | Receipt | Notes |
|------|---------|--------|
| **Lydian dominant field** | **`fz:lyd_dominant@bar{N}#v1`** | **Non-hook** bars, seeded rate **32%** when the bar reads as **Lydian-field** (symbol hints + context odds); appends **`(#11)`** to eligible **dominant / major** spellings. **Skips** symbols with **`/`** (slash bass unchanged). |
| **Bitonal triads** | **`fz:bitonal_triad@bar{N}#v1`** | **Non-hook**, rate **24%** — two **major triad** roots **+4 or +6** semitones apart, spelled **`Rootmaj+Root2maj`** (not tritone **slash** polytonality). **Skips** slash chords. |
| **Motif recycling** | **`fz:motif_recycle_{transform}@bar{N}#v1`** | Per **form section**, detects a repeating **4-bar** harmonic cell; one weighted transform on the repeat (**transposition**, **rhythmic_displacement**, **exact_repeat**, **augmentation_diminution**, **inversion**, **combined**, **retrograde**). **Skips** slash chords at the edit bar. |
| **Hard-cut trigger system** | **`fz:hard_cut_trigger@bar{N}#v1`** + **`fz:d5:through_composed_cut@bar{N}#v1`** | Monitors **long sections**, **long ostinato-like chord runs**, and **peak-density streaks**; fires **through-composed cut** (same transform family as **d5**) and **resets** the density arc tail from that bar. **Skips** slash chords for the cut. |

#### Zappa style surface (primary songwriter)

When **`normalizeSongwriterStyleKey(primary) === 'frank_zappa'`**, **`applyFrankZappaStyleSurface`** (`songModeStyleSurface.ts`) runs from **`runGoldenPath`** (no Style Engine profile gate): sets **`frankZappaSyntheticScaleBias`**, **`frankZappaDensityBiasByBar`** from **`computeZappaDensityArc`**, mean **`songwriterDensityBias`**, **`songwriterSyncopationBias +0.22`**, **`songwriterSpaceBias −0.15`** (Zappa pocket = **dense**, not ECM-sparse).

Optional **`frankZappaContext`** on the generate request selects the three modes above; defaults **`avant_rock`**.

#### Example applications (by context)

1. **`avant_rock`** — **Studio collage / rock orchestra** lesson planning: default **`frankZappaContext`**, density arc + **synthetic** weight in metadata; use when demonstrating **d1–d5** receipts alongside **hard-cut** drama without insisting on big-band spelling habits.
2. **`big_band`** — **Sectional brass–rhythm** orientation: three-way **Lydian / Mix / Dorian** bias table only; pair with **long-form** or **high bar count** to exercise **hard-cut** on **long sections**.
3. **`futuristic_jazz`** — **Colour-stack / whole-tone / altered-palette** teaching: metadata stresses **Lydian dominant**, **diminished**, **whole-tone**, **custom** bucket; compare **`fz:lyd_dominant`** receipts against **bitonal triad** **`maj+maj`** spellings on **non-slash** bars.
4. **Density arc teaching** — Read **`frankZappaDensityBiasByBar`** after Generate to show **intro → peaks → drop** narrative; after a **hard cut**, tail bars **recompute** — demo **reset** with seeds that fire **`fz:hard_cut_trigger`**.
5. **Locked chart + Zappa** — Custom **`|`** progression still runs the slice; **slash chords** are preserved through additive passes so **HarmonyContext** / export parity stays stable.
6. **Seed A/B** — Same **`frankZappaContext`** with different **seeds** changes which **d1–d5** bar wins vs **additive** passes (rates are seeded); lock seed when demoing a specific **`fz:motif_recycle_transposition`** or **`fz:bitonal_triad`** outcome.

### Antônio Carlos Jobim (Song Mode — Brazilian jazz / bossa harmony slice)

**Still current:** **`jobimSlice.ts`**, **`precomputeJobimEffectiveHarmonyBars`**, **`jobimEffectiveHarmonyBars`** feeding **`getChordForBar`** and locked MusicXML truth, smoke **`jobimSliceSmoke.test.ts`**. Harmony receipts use **`aj:*`** (**Antônio Jobim**) — **not** **`jb:*`** (James Brown).

The slice **rewrites chord symbols** on the duo golden path (bossa tonic colours, altered dominants, tritone subs, backdoor, passing diminished, etc.) and writes **rhythm-hint metadata** for anticipation bars only — no parallel **`ChordEvent`** extension layer beyond standard export.

#### Asymmetric phrase grid

**`computeJobimPhrasePositions(totalBars, seed)`** assigns **phraseStart** / **phraseMiddle** / **phraseFinal** using variable phrase lengths **4, 8, or 2 bars** weighted **65% / 20% / 15%** (mostly regular four-bar organisation with occasional eight-bar spans or two-bar turns). Same rolling-bar layout pattern as Bill Evans / ECM Chamber / Bacharach variable grids.

#### Additive passes (2026 refresh)

| Pass | Phrase roles | Target rate | Receipt / metadata |
|------|----------------|------------|---------------------|
| **Lydian dominant colour** | **phraseMiddle** only | **26%** of eligible dominant bars | **`aj:lyd_dom@bar{N}`** — dominant gains **`(#11)`** (e.g. `G7` → `G7(#11)`) when not already present |
| **bVI minor-six alternate** | **phraseFinal** only | **18%** when **dominant → tonic** | **`aj:bvi_m6@bar{N}`** — dominant bar may become **bVI m6** (flattened-sixth minor-six colour toward tonic, e.g. **Cm6** in **Eb** major context) |
| **Bossa anticipation bias** | **all** roles | **55%** per eligible bar | **`aj:bossa_anticipation@bar{N}`** — appends bar index to **`jobimBossaAnticipationBars`** (1-based): accompaniment should **anticipate** the next harmony at **& of 4** in the **previous** bar for downstream **C1** rhythm overlay consumption |

Existing Jobim devices (tritone sub, backdoor, phrase-final 6/9, bright **II7**, passing diminished, anti-elaboration guards) continue to apply as before; new passes run in the **symbol post-pass** chain after the base per-bar enrich pass.

#### STYLE_MODERN_JAZZ — Jobim surface vs Bill Evans surface

When the resolved primary songwriter is **`antonio_carlos_jobim`**, **`runGoldenPath`** sets **`jobimMode: true`** on **`GenerationMetadata`**. **`applyBillEvansStyleSurface`** **returns early** (no Evans density/cadence/space nudges). **`applyJobimStyleSurface`** runs **immediately after** (wired after **`applyBillEvansStyleSurface`**): **`songwriterDensityBias`** **−0.08**, **`songwriterSyncopationBias`** **+0.18**, **`songwriterCadenceSoftness`** **+0.15** (clamped **0–1**) — bossa-weighted sync and softer cadence metadata, honest generative bias only.

#### Example applications

1. **Primary Jobim + Modern Jazz** — Full **`aj:*`** harmony slice **plus** Jobim **`STYLE_MODERN_JAZZ`** surface (lower density, higher syncopation bias, softer cadences) for **lead-sheet bossa** lessons.
2. **Jobim harmony without Modern Jazz** — Pick **Jobim** as primary and a **different** Style Engine profile to study **symbol** devices (**`aj:lyd_dom`**, **`aj:bvi_m6`**) without the Jobim surface nudges.
3. **Locked custom chart + Jobim** — Paste or lock a progression; phrase grid still drives **phraseMiddle** vs **phraseFinal** gates so **Lydian dominant** vs **bVI m6** fire on different seeds.
4. **`jobimBossaAnticipationBars` teaching** — Read **`GenerationMetadata.jobimBossaAnticipationBars`** after Generate to show which bars expect **anticipatory** comp rhythm (pair with **Phase C1** overlays when consuming metadata).
5. **Seed A/B** — **4/8/2** phrase lengths change boundary positions; **lock seed** to demo a stable **`aj:lyd_dom`** or **`aj:bvi_m6`** outcome for scoring examples.
6. **Pair with Latin / sophisticated-pop era** — Use **Song Mode** era pairing copy as usual; Jobim **slice** stays harmony-first — arrangement pairing does not replace **`aj:*`** symbol logic.

### ECM Style vs ECM Chamber songwriter — how the controls differ

Composer OS splits **ECM-flavoured harmony** (what chords are chosen and how they move) from **ECM-flavoured surface behaviour** (how sparse the guitar comp feels, where phrases attack, how soft cadences land, how independent the bass rhythm is). You can use either alone or both together.

| Control | What it is | What it drives |
|---------|------------|----------------|
| **ECM Style** | **Style Engine** dropdown: **`STYLE_ECM`** or **`STYLE_ECM_CHAMBER`** | **Surface metadata** consumed by Song Mode passes: **density**, **space**, **syncopation**, **phrase-start looseness**, **bass independence**, **cadence softness**, plus **Style Engine** velocity contouring. **`STYLE_ECM_CHAMBER`** also participates in the **alternate tuning** gate like other “alt tuning” styles. Implementation: **`applyEcmChamberStyleSurface`** (`songModeStyleSurface.ts`) nudges **`GenerationMetadata`** before **C1/C7** rhythm overlays and harmony policies. |
| **ECM Chamber** | **Primary songwriter** **`ecm_chamber`** (`SongwriterRuleId`) | **Harmonic slice** — precomputed chord symbols and devices (**Lydian** lean on primaries, **m11no3**-style colours, **m7b5** destinations, asymmetric phrase grid, wide leap peaks in melody planning). Implementation: **`ecmChamberSlice.ts`** / **`precomputeEcmChamberEffectiveHarmonyBars`**, same locked-export pattern as other writers. |

**Stacking:** If you pick **ECM Chamber** as songwriter **and** **ECM** or **ECM Chamber** as Style Engine, both layers apply — you get ECM harmony vocabulary **and** ECM surface spacing/cadence behaviour (full-stack ECM).

**Independence:** You can choose **ECM Chamber** with a **non-ECM** style to get the harmonic language without the ECM surface recipe, or **ECM Style** with a **different** primary songwriter to get ECM spacing and cadence behaviour without the ECM Chamber chord slice.

### ECM Chamber surface — three presets (Chamber ↔ Flow)

When **Style Engine** is **`STYLE_ECM`** or **`STYLE_ECM_CHAMBER`**, Generate maps the **Chamber ↔ Flow** slider (0–1) to a discrete **`ecmChamberMode`** sent on the request (`GenerateRequest.ecmChamberMode`): **`angel_song`**, **`balanced`**, or **`metheny_scofield`**. Each mode applies additive nudges (clamped 0–1) to **density**, **syncopation**, **space**, **phrase-start looseness**, **bass independence**, and **cadence softness** — see **`applyEcmChamberStyleSurface`**.

| Resolved mode | Musical intent (product framing) | Reference listening (orientation, not imitation) |
|---------------|-----------------------------------|---------------------------------------------------|
| **Angel Song** | **Maximum space** — floating phrases, softer cadential landing preference, more off-beat phrase entries, bass leaning **independent / co-melodic** vs doubling guitar rhythm. | *Angel Song* — Kenny Wheeler |
| **Balanced ECM Duo** | **Default blend** — lyrical and spacious, still grounded; good first stop for ECM-influenced duo writing. | General ECM chamber-jazz orientation |
| **Metheny·Scofield** | **Clearer pulse**, stronger sense of **key centre**, more continuous motion, light **folk/blues** inflection in the surface recipe. | *Memories of Home*, *Bright Size Life* |

### Chamber ↔ Flow slider — plain English

The slider does **not** blend infinitely between styles. It picks **one of three** ECM surface recipes:

- **Toward Chamber (left):** Values in the **lower third** select **Angel Song** — sparser, floatier, softer cadences, more deferred phrase onsets, bass more its own voice.
- **Middle third:** **Balanced ECM Duo**.
- **Toward Flow (right):** **Upper third** selects **Metheny·Scofield** — relatively denser motion, a steadier pocket, less extreme space and cadence softening than Angel Song.

Internally: `t < 1/3` → **`angel_song`**; `1/3 ≤ t < 2/3` → **`balanced`**; `t ≥ 2/3` → **`metheny_scofield`** (`HomeGenerate.tsx`: **`ecmChamberFlow01ToMode`**).

### Six example applications

1. **Guitar + upright bass duo, Angel Song** — Sparse, floating, bittersweet chamber mood; orientation toward Wheeler / Frisell / Holland-style **space and countermelody**, not a transcription.
2. **Guitar + upright bass duo, Metheny·Scofield** — Conversational **folk-jazz**, clearer time feel, stronger tonal centre; orientation toward *Memories of Home*-style clarity.
3. **Guitar + upright bass duo, Balanced** — General **ECM-influenced** duo writing when you want neither extreme.
4. **ECM Chamber songwriter only** (no **ECM** / **ECM Chamber** style) — **Harmonic colour** (Lydian primary, m11 colours, m7b5 targets, phrase grid, leap peaks) **without** the ECM style surface nudges. Use when you want ECM harmony language under a different Style Engine profile.
5. **ECM Style only** (e.g. **STYLE_ECM** + **James Brown** or another writer) — **Surface spacing, phrase looseness, bass independence, cadence softness** without **ECM Chamber** chord-symbol machinery. Use when you want ECM **feel** on non-ECM harmony.
6. **Full stack** — Primary **`ecm_chamber`** + **`STYLE_ECM_CHAMBER`** + **Angel Song** mode — **Maximum** alignment of ECM Chamber harmony slice + ECM Chamber style surface + sparsest preset; suited to **chamber** textures (e.g. flugelhorn–guitar–bass orientation in lesson framing).

### GCE note — ECM Chamber melodic identity

**ECM Chamber** shipped around **7.8/10** overall on the **GCE** rubric; the recurring weakness was **Melodic Identity**. Recent slice work targeted that lane (**wide leap peaks**, **asymmetric phrase grid**) so melodic character reads more intentional in sparse textures — re-score exports after major engine updates if you rely on GCE numbers for teaching.

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

## Chapter: Reharmonisation Panel

The **Reharm preview** panel on **Generate** lets you audition **composer-weighted** substitution chains on a **bar range** of your pasted progression—without leaving Song Mode. It sits on the same spine as **Chord Inspector** and **Tonality Vault**: symbols resolve through the vault chord-type universe, candidates rank by emotional drift and voice-leading penalties, and **Apply** writes the merged progression back into the paste field so the next **Generate** hears your edit.

This is a **personal instrument**, not a product feature in the marketing sense: it exposes engine diagnostics (placeholder **GCE** readout per lens, strategy labels, mapping failures) so *you* decide what counts as a better harmony—not a single “best” button.

### What it does

| Capability | Detail |
|------------|--------|
| **Range audition** | Pick **start / end bar** (1-based, within your song-form bar count). |
| **Lens blend** | Choose **1–3** songwriter **lenses**; each runs an independent ranked progression. |
| **Vault truth** | Bars map to **Tonality Vault** `chordTypeId` + root PC where possible; unmappable bars **pass through**. |
| **Cross-bar cost** | Ranker penalises rough root motion beyond a tritone on the pitch-class circle. |
| **Seed** | Optional integer for deterministic tie-breaks between tied scores. |
| **Apply** | Splices substitute symbols into **`parsedCustomProgressionBars` / locked paste** for that range and triggers regeneration (see **LOCK** note below). |

### Architecture (engine ↔ UI)

| Layer | Responsibility |
|-------|----------------|
| **`harmonyRangeResolver`** | `getChordRangeForBars` → per-bar chord string via **`getChordForBar`** + vault mapping / `mappingNull`. |
| **`reharmLensConfig`** | Heuristic weights per lens: **`tritoneRate`**, **`susBias`**, **`chromaticMediantBias`**, **`poolSampling`**. |
| **`reharmCandidateEngine`** | Enumerates same-root vault substitutes; **`scoreReharmCandidate`** = internal combined rank. |
| **`reharmSequenceRanker`** | Greedy bar picks with lens-weighted score ÷ transition denominator. |
| **`reharmController`** | **`executeReharm`** (preview scores), **`applyReharmAlternative`** (full-bar array splice). |
| **`HomeGenerate` + `ReharmPanel`** | Collapsible UI; **Apply** updates **`chordProgressionText`** and calls **`generate()`**. |

**LOCK (after reconciliation):** **Apply** updates **`chordProgressionText`**; the following **Generate** uses **`harmonyMode: custom`** once when the UI would otherwise send **`custom_locked`**, so **`lockedHarmonyBarsRaw`** / **`parsedChordBars`** reparse from the edited text before **`assertScoreMatchesLockedHarmonyWire`**. Still verify notation vs ear in the host after export.

### The eleven lenses (preview checklist)

Each lens is a **`buildReharmLensConfig`** preset keyed by songwriter id. The UI lists these **display names** (ids in parentheses for power users):

| # | Lens (id) | Character (what moves in ranking) |
|---|-----------|-----------------------------------|
| 1 | **Antônio Carlos Jobim** (`antonio_carlos_jobim`) | Bossa chromatic side-doors; moderate tritone colour; **poolSampling** on. |
| 2 | **Bill Evans** (`bill_evans`) | Sus / colour extensions over functional roots; **low** tritone appetite. |
| 3 | **Wayne Shorter** (`wayne_shorter`) | Post-bop lateral roots + modal plateaus; balanced tri/tension. |
| 4 | **Thelonious Monk** (`thelonious_monk`) | Angular substitutions—**high** tritone weight, **low** sus bias. |
| 5 | **Donald Fagen** (`donald_fagen`) | Jazz-rock altered dominant vocabulary; chromatic mediants weighted. |
| 6 | **Radiohead** (`radiohead`) | Alternative-rock ambiguity—**high sus**, restrained tritone. |
| 7 | **Philip Glass** (`philip_glass`) | Minimal motion bias—**low** chromatic-mediant and tritone weights. |
| 8 | **Bernard Herrmann** (`bernard_herrmann`) | Thriller string chromaticism—strong altered-colour affinity in ranking. |
| 9 | **Duke Ellington** (`duke_ellington`) | Orchestral jazz vocabulary—balanced colours + **poolSampling**. |
|10 | **Maria Schneider** (`maria_schneider`) | Large-ensemble colour washes—high chromatic-mediant bias. |
|11 | **Gil Evans** (`gil_evans`) | Cool-jazz colour fields—mid sus + **high** chromatic-mediant bias. |

Aliases: UI accepts **`jobim`** → canonical **`antonio_carlos_jobim`** in lens resolution elsewhere in the engine.

### How to use it (happy path)

1. **Song Mode** → paste **exactly** your song-form bar count (`|` barlines).  
2. Open **Reharm preview** (below **Chord Inspector**).  
3. Set **start / end bar**, optionally **seed**, tick **1–3 lenses**.  
4. **Reharm** → compare columns: **GCE (preview)** is a **mean combined-rank ×10** placeholder until full **`gceAutoScorers`** wiring—not a certified lesson grade.  
5. **Apply** on a column → progression text updates → **Generate** runs with the new harmony wire.

**Dimmed rows** in the table (`mappingNull`, `passthrough`, `identity`) did not receive a vault substitution on that bar—they keep the original symbol for that step.

---

### Twenty varied examples (quick workshop)

Use these as **range ideas** (often 4-bar cells); transpose keys freely.

| # | Style hint | Progression sketch | Lenses to try |
|---|------------|-------------------|---------------|
| 1 | Tin Pan Alley turnaround | `Cmaj7 \| A7 \| Dm7 \| G7` | Fagen · Jobim · Duke |
| 2 | Aeolian rock loop | `Am \| F \| C \| G` | Radiohead · Glass · Bill Evans |
| 3 | Modal drift | `Dm9 \| G13sus \| Cmaj9 \| —` | Schneider · Gil Evans · Jobim |
| 4 | Harmonic minor flair | `Em7b5 \| A7alt \| Dm \| —` | Monk · Herrmann · Wayne Shorter |
| 5 | Chromatic descent | `Cmaj7 \| Bm7b5 \| Bbm7 \| Am7` | Fagen · Duke · Schneider |
| 6 | Pedal sky | `Emaj7/B \| Emaj7/B \| F#m7/B \| G#m7/B` | Gil Evans · Maria · Radiohead |
| 7 | Odd-ball bridges | `Abmaj7 \| G7#11 \| Fm9 \| E7#9` | Monk · Herrmann · Fagen |
| 8 | Bossa lift | `F#m7 \| B7 \| Emaj9 \| C#m7` | Jobim · Bill Evans · Duke |
| 9 | Post-rock stasis | `Esus2 \| Asus2 \| Esus2 \| Asus2` | Glass · Radiohead · Philip Glass heavy |
|10 | Waltz fragment | `Bbm7 \| Eb7 \| Abmaj7 \| G7alt` | Duke · Schneider · Wayne Shorter |
|11 | Blues skew | `C7 \| F7 \| C7 \| G7 F7` | Duke · Monk · Ellington |
|12 | Film noir | `Dm6 \| E7b9 \| Am7 \| Am6` | Herrmann · Monk · Bill Evans |
|13 | ECM openness | `Em11 \| Asus9 \| Dmaj7#11 \| —` | Bill Evans · Schneider · Gil Evans |
|14 | Funk vamp | `E9 \| E9 \| E9 \| B/E` | Fagen · Duke · Radiohead |
|15 | Parallel slash story | `Gmaj7/B \| Gmaj7/B \| Am7/C \| D7/C#` | Fagen · Wayne · Gil Evans |
|16 | Dim passing chain | `Bdim7 \| Bb13 \| Am9 \| Adim7` | Monk · Herrmann · Wayne Shorter |
|17 | Maj cluster cadence | `Gmaj9 \| F#m11 \| Fmaj7#11 \| E7alt` | Schneider · Maria · Fagen |
|18 | Mixed-mode chorus | `Dbmaj7 \| Cm11 \| Bbm9 \| Ab13` | Duke · Jobim · Wayne Shorter |
|19 | Aggro rock IV | `A5 \| D5 \| E5 \| F5` | Radiohead · Glass · Monk *(expect pass-through rows)* |
|20 | Poly-root teaser | `Gm11 \| Dbmaj7/Eb \| Fm9 \| B13` | Gil Evans · Schneider · Herrmann |

---

### Three complete 32-bar workshop songs

Treat each block as **one chorus** you can paste wholesale (adjust meter/tempo in UI as usual). After **Reharm**, compress ranges (e.g. **bars 5–12**) before Apply if you only want a section touched.

#### Song A — Minimalist post-rock plateau (hypnotic)

**Original (32 bars, `|`-separated):**

```
| Esus2 | Esus2 | Asus2 | Asus2 | Esus2 | Esus2 | Asus2 | Asus2 |
| Dmaj7 | Dmaj7 | A/D | A/D | Esus2 | Esus2 | Asus2 | Asus2 |
| Esus2 | Esus2 | Asus2 | Asus2 | F#m11 | F#m11 | A | A |
| Esus2 | Esus2 | Asus2 | Asus2 | Dmaj7 | Dmaj7 | Asus2 | Asus2 |
```

**Lens triads:** **Philip Glass** + **Radiohead** + **Bill Evans** — expect **Glass** to privilege smooth sus/modal reads; **Radiohead** to flirt with ambiguous colours; **Evans** to lean sus colour without jazz-rock slash clutter.

#### Song B — Jazz waltz big-band flavour (functional shell)

**Original:**

```
| Bbm7 | Eb7 | Abmaj7 | G7alt | Cm7 | F7 | Bbm7 | Bdim7 |
| Bbm7 | Eb7 | Abmaj7 | Fm7 | Bbm7 | Eb7 | Abmaj7 | G7alt |
| Cm7 | F7 | Bbm7 | Eb7 | Abmaj7 | — | Fm7 | Bbm7 |
| Eb7 | Eb7 | Abmaj7 | G7alt | Cm7 | F7 | Bbm7 | Eb7 |
```

**Lens triads:** **Duke Ellington** + **Maria Schneider** + **Wayne Shorter** — Ellington for orchestral functional colour; Schneider for mosaic cadences; Shorter for lateral dominants without washing out the waltz lift.

#### Song C — Experimental rock hybrid (chromatic + pedal)

**Original:**

```
| Em9 | Cmaj7/B | Em9 | Bb13 | Am11 | D7#9 | Gmaj7 | F#m7b5 |
| B7#11 | Em9 | Cmaj7 | B7alt | Em9 | Asus9 | Gmaj7#11 | F#7b9 |
| Bm11 | E7#9 | Am11 | D13 | Gmaj7 | Gm7 | C9sus | F#7alt |
| Bm7 | E7 | Am9 | D13 | Gmaj7 | — | Em9 | B7alt |
```

**Lens triads:** **Donald Fagen** + **Monk** + **Gil Evans** — Fagen for altered-dominant literacy; Monk for angular overlaps; Gil Evans for colour-field spreads without losing rock-forward roots.

---

### Practice protocol (teachers & self-study)

1. **Start mono-lens** — learn how one composer biases sus vs tritone before stacking lenses.  
2. **Short windows first** — 4-bar phrase cycles before whole-form Apply.  
3. **Trust dim rows** — they flag vault boundary issues; fix spelling or accept pass-through.  
4. **Re-generate after Apply** — ear-check **MusicXML** in your host; LOCK parity is still evolving.  
5. **Journal seeds** — when you love an audition, note **seed + lens set** for reproducible class demos.

### Design principle

The Reharm panel is built as a **personal instrument**: it surfaces **ranking mechanics**, **strategy receipts**, and **honest mapping failures** so educators and arrangers stay in the loop—rather than hiding substitution logic behind a single opaque “Enhance” control. Use it to **teach harmonic intention**, not to outsource taste.

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

#### Build: locked `release` tree (fallback)

If `desktop:package-no-bump` fails due to a locked `release` tree (for example electron-builder cannot remove `release\win-unpacked\resources\app.asar`):

1. Run `npm run desktop:build` in `apps/composer-os-desktop` (rebuilds IPC bundle).
2. Run: `electron-builder --win --config.directories.output=dist-electron-release` (from `apps/composer-os-desktop`; use the same environment as `desktop:package-no-bump`, e.g. `CSC_IDENTITY_AUTO_DISCOVERY=false` via `cross-env` if you rely on that script).
3. Copy `Composer-OS.exe` from `dist-electron-release\` over `release\Composer-OS.exe`.
4. Launch from `release\Composer-OS.exe` as normal.
5. If packaging fails again: close anything touching `release\win-unpacked`, delete or rename that folder, then rerun `npm run desktop:package-no-bump` (from `apps/composer-os-desktop`).

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

### Big Band arranger profiles (wired tuning receipts)

For **Big Band**, **`composerOsAppGeneration.ts`** maps **`stylePairing.arrangerStyle`** → **`composerStyle`** only for **`basie`**, **`ellington`**, **`schneider`**, and **`quincy_jones`**. **`resolveBigBandEraRules`** then merges **registry composer rules** with **scalar tuning** (`riffVsLine`, `spaceEmphasis`, `smoothTransitions`, …) and attaches optional **`BigBandArrangerProfileReceiptV1`** blobs on **`resolvedRules.tuning`** — **planning receipts** for manifests / diagnostics; score behaviour still flows through existing **`applyBigBandRules`** + orchestration paths.

**Wired arranger parameter profiles** (exact strings stored on the receipt):

| Field | Duke Ellington (`ellington`) | Maria Schneider (`schneider`) | Quincy Jones (`quincy_jones`) |
|-------|-------------------------------|------------------------------|-------------------------------|
| Chord density | 4 | 5 | 3 |
| Extensions | 9ths, 11ths, 13ths, altered, polytonal | 9ths, 11ths, 13ths, altered, upper structure triads, polytonal | 9ths, 11ths, 13ths, altered, upper structure triads |
| Functional harmony | 60% | 40% | 80% |
| Harmonic rhythm | medium | slow | medium |
| Overall density | 4 | 4 | 3 |
| Texture arc | conversational, gradual build | gradual build, mosaic | cinematic, gradual build |
| Section blending | blurred, unusual combos | blurred, unusual combos | mostly clean, some blends |
| Rhythm section weight | 3 | 3 | 5 |
| Time feel | elastic / floating | floating / groove-first | groove-first / locked grid |
| Horn relationship | equal dialogue | equal dialogue | rhythm leads / equal dialogue |
| Build strategy | chorus-based, narrative arc | narrative arc | chorus-based, cinematic |
| Space usage | continuous flow with pockets of space | space then explosion / continuous flow | space then explosion |

**Count Basie (`basie`)** remains wired with **`basieProofOfConcept`** (lower chord/overall density, **90%** functional harmony, **locked grid**, **clean separation**, riff-forward receipt — see **`bigBandEraResolver.ts`**).

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

## Evaluation System

Composer OS embeds a layered **evaluation** stack used for **observational receipts** (especially Big Band): extract features from a **`ScoreModel`**, score **GCE** (10 categories), score a **style profile** (Big Band arrangers and optional **Light Touch** genre profiles), run **LOCK** gates, optionally combine into a single **`CombinedEvaluationResult`**. **DCR** (Design → Commit → Refine) is available for candidate workflows; it is separate from the golden-path Generate pipeline unless wired explicitly.

### Overview

| Layer | Role |
|-------|------|
| **Feature extraction** | `scoreModelFeatureExtractor` — `orchestration`, `formal`, `rhythmic` metrics from **`sourceFormat: scoreModel`** |
| **GCE** | `evaluateGce` — 0–10 category scores × weights → **`gce.finalScore`** |
| **Style profile** | `StyleProfile.score` — dimension scores × weights → **`style.finalStyleScore`** |
| **LOCK** | `evaluateLock` — hard gates on XML presence, bar count, harmony presence, repetition / swing extremes, register |
| **Combined** | `createCombinedEvaluator().evaluate` — blends GCE + style; respects **`lockRequired`** |
| **DCR** | `runDcrProtocol` — multi-candidate design, optional **single** refinement pass |

### GCE (10 categories + default weights)

Default weights (**`defaultGceWeights`** in **`gceEvaluator.ts`**) — must sum to **1.0**:

| Category | Weight |
|----------|--------|
| cadentialClarity | 0.10 |
| melodicIdentity | 0.12 |
| phraseGrammar | 0.10 |
| harmonyAndLanguage | 0.12 |
| rhythmicIdentity | 0.12 |
| structureAndForm | 0.10 |
| arrangementAndOrchestration | 0.10 |
| economyAndFocus | 0.08 |
| tensionAndRelease | 0.08 |
| thematicRecallPotential | 0.08 |

Placeholder scoring is still **5.0** per category until feature-linked GCE logic lands.

### LOCK (6 gates)

| Gate id | Severity | Check |
|---------|----------|--------|
| **xmlValidity** | critical | Output is not **null** / **undefined** |
| **barDurationIntegrity** | error | **`features.formal.barCount`** is a positive number |
| **chordMelodyAlignment** | error | **`features.harmonic`** exists and is non-empty |
| **sectionContrast** | warning | **`formal.riffRepetitionRatio`** ≠ **1.0** |
| **rhythmAntiLoop** | warning | **`rhythmic.swingGridAlignment`** ≠ **1.0** |
| **registerIntegrity** | error | **`orchestration.avgVoicingSize`** between **1** and **12** |

Big Band **combined** evaluation uses **`lockRequired: false`** in the app so incomplete extract fields do not block observational **`pass`** while extraction catches up.

### DCR protocol

**`runDcrProtocol`** — **Design**: generate **`candidateCount`** candidates, score with **`CombinedEvaluator`**, pick highest **`combinedScore`**. **Commit**: if best ≥ **`targetScore`**, return (no refine). **Refine** (at most **once**): refine weakest dimension via **`refiner.refine`**, re-score, keep whichever candidate scores higher — **never** regenerate all candidates; **never** loop refinement.

### Style Profile Registry (Big Band arrangers)

| Profile id | Name | Threshold | Dimensions (ids × weight) |
|------------|------|-----------|----------------------------|
| **`basie`** | Count Basie | 7.0 | densityScore **0.25**, riffRepetitionScore **0.25**, swingClarityScore **0.25**, compSparsityScore **0.25** |
| **`ellington`** | Duke Ellington | 7.0 | voicingUniqueness **0.30**, harmonicDensity **0.30**, textureFluidity **0.20**, orchestrationColor **0.20** |
| **`schneider`** | Maria Schneider | 7.0 | harmonicComplexity **0.35**, textureMosaic **0.30**, narrativeArc **0.20**, rhythmicFloat **0.15** |
| **`quincy_jones`** | Quincy Jones | 7.0 | grooveStrength **0.35**, cinematicDensity **0.25**, functionalHarmony **0.25**, rhythmLeads **0.15** |
| **`thad`** | Thad Jones | 7.0 | waveDensity **0.30**, polyHarmonicMotion **0.30**, swingDrive **0.25**, extendedFormLine **0.15** |
| **`gil_evans`** | Gil Evans | 7.0 | colourWash **0.30**, modalOpenness **0.35**, elasticPulse **0.25**, horizonBlend **0.10** |
| **`bob_brookmeyer`** | Bob Brookmeyer | 7.0 | linearCounterpoint **0.35**, quartalHarmonyField **0.25**, modernPocket **0.25**, sectionalVariety **0.15** |
| **`clare_fischer`** | Clare Fischer | 7.0 | harmonicMass **0.35**, chromaticLattice **0.30**, grooveLattice **0.20**, pianoColour **0.15** |
| **`oliver_nelson`** | Oliver Nelson | 7.0 | bluesFunctional **0.35**, sectionalContrast **0.30**, swingAuthority **0.20**, chartOrchestration **0.15** |
| **`sammy_nestico`** | Sammy Nestico | 7.0 | punchEconomy **0.30**, riffHits **0.30**, lockedGroove **0.25**, kickAlignment **0.15** |

### Light Touch style profiles (Folk, Classical, Bebop)

Three **`StyleProfile`** modules ship under **`engines/composer-os-v2/core/evaluation/`** for **genre-level** Light Touch targets (same **`threshold`** **7.0** and **`ExtractedStyleFeatures`** contract as arranger profiles). They score **`harmonic.functionalRatio`** when harmonic enrichment is present alongside **`scoreModel`** extraction (`orchestration`, `formal`, `rhythmic`).

| Profile id | Name | Threshold | Dimensions (ids × weight) |
|------------|------|-----------|----------------------------|
| **`folk`** | Folk (Light Touch) | **7.0** | functionalSimplicity **0.25**, chordSparsity **0.25**, steadyPulse **0.25**, intimateEnsemble **0.25** |
| **`classical`** | Classical (Light Touch) | **7.0** | functionalModulation **0.30**, orchestralBreadth **0.30**, periodicPhrasing **0.20**, metricDefinition **0.20** |
| **`bebop`** | Bebop (Light Touch) | **7.0** | extendedHarmony **0.30**, sparseComping **0.25**, syncopationDrive **0.25**, comboLinearWeight **0.20** |

### How to add a new style profile (5 steps)

1. Add **`yourStyleProfile.ts`** under **`engines/composer-os-v2/core/evaluation/`** implementing **`StyleProfile`** (`dimensions`, **`threshold`**, **`score`** reading **`ExtractedStyleFeatures`**).
2. Export from **`index.ts`**.
3. Extend **`featureExtractor`** (or downstream enrichers) if new **`featureKeys`** are required.
4. Wire Big Band **`composerStyle`** → profile in **`composerOsAppGeneration.ts`** (same pattern as Basie / Ellington / Schneider / Quincy).
5. Add **smoke** coverage in **`evaluation.smoke.test.ts`** and run **`npm run test:composer-smoke`**.

### Smoke baseline

**`npm run test:composer-smoke`** — aggregate **233** PASS rows, **50** suites (**`runSmokeTests.ts`** allowlist).

---

## GCE 9.0 Engineering Roadmap

Current benchmark (seed 50021, May 2026): 8.4/10 best, 7.9/10 worst. Melodic Identity (~5.7–5.9) is the universal bottleneck. Target: 8.7–8.9 overall, MI 7.5+.
Universal weakness: Melodic Identity. Gap to target: 0.6-1.2 points.

Core principle: Every generated note must be explainable by one of four
authorities — motif, harmonic scene, rhythmic DNA, or form role. Notes
belonging to none of these are suppressing the 9.0 ceiling.

### Phase 1 — Motif Authority Layer (target: 8.4 → 8.7)

Highest-yield single change. Directly fixes universal Melodic Identity
weakness and improves Thematic Recall simultaneously.

ThemeGenome structure per piece:

- 2-4 primary MotifCell objects
- Each with: interval profile, rhythmic cell, contour code, accent map,
  register band, harmonic tolerance mask, transform budget
- Three linked levels: seed (raw identity), phrase-form (section variants),
  surface (rendered notes)

MotifCell similarity scoring (S = 0.35I + 0.30R + 0.20C + 0.15G):

- I: interval spine similarity (35%)
- R: rhythmic cell similarity (30%)
- C: contour similarity (20%)
- G: register-band adherence (15%)

Section recall contract:

- A section: present primary motif within first 4-8 bars
- A2/repeat: near-literal restatement with orchestration refresh
- B/bridge: transform 2+ of contour, harmonic setting, register, density
- Coda: recover head interval spine or rhythm spine within final 8 bars
- Recall quota: 55-65% of phrase starts tied to stored motif material

Minimum architecture to move Melodic Identity 8.0 → 9.0+:

- One primary motif (3-7 notes)
- One contrast motif or cadential tail
- Mandatory motif at section openings, cadences, one inner-voice echo
- At least 3 transformations: sequence, augmentation/diminution,
  registral displacement

Voice-specific motif defaults:

- Evans: sparse durations, modal interval pool, hovering neighbors,
  low attack density, wide inter-onset spacing
- Schneider: lyrical arcs, interval-seeded, common-tone pivots,
  longer breath units, smooth registral climbs tied to narrative growth
- Coltrane: short dense cells, chromatic side-slips, thirds-cycle
  compatible intervals, pentatonic fragments, sequential compression,
  high note density

### Phase 2 — Voice Rule Compiler (target: 8.7 → 8.9)

Replace passive context tags with compiled VoiceRuleBundle per composer.
Each bundle defines: harmonicRhythm, bassPolicy, voicingPolicy,
melodicPolicy, orchestrationPolicy, formPolicy, rhythmPolicy, repairPolicy.

Gil Evans concrete rules:

- Harmonic rhythm: 1 sonority per 1-2 bars in A sections, 2-4 bars
  during suspended tableaux
- Bass: melodic counterline first; root alignment only at phrase boundary
  or cadence; 40-60% non-cadential bass notes as stepwise neighbors
- Voicings: bass low, 10-20 semitone gap, 4-6 notes mid-register,
  at least one adjacent second, non-root top note
- Chord construction: omit 5th often, omit 3rd for modal ambiguity;
  modal subsets: 1-2-3-#4-6 Lydian, 1-b2-4-5-b7 Phrygian over pedal
- Parallel planing allowed if modal color preserved
- Reject functional dominant clichés unless cadential repair requires

Evans voicing algorithm:

1. Choose pedal/root below C3
2. Choose modal subset of 4-5 tones
3. Place cluster center between C4 and A5
4. Enforce one top minor second or inner adjacent second
5. Mixed-family spacing, not sax soli block logic

Maria Schneider concrete rules:

- Harmonic rhythm: 1 chord/bar or 2 chords across 3 bars in lyrical zones
- Chord morphing: mutate previous voicing by moving one voice stepwise,
  then another — never replace entire sonority
- Common-tone engine: identify 2 anchor tones, preserve across 1-3 events,
  reinterpret function around them
- Narrative arc: continuous curves for density, register ceiling,
  dissonance index, attack rate — rise together toward recapitulation
- Voicing: hybrid quartal/tertian, 4ths in inner voices, color tone on top

Schneider voicing algorithm:

1. Start from prior voicing
2. Lock common tones with highest melodic salience
3. Move remaining voices by step or minor third
4. Permit one quartal insertion in middle voices
5. Expand top register near peak; contract for recapitulation reset

John Coltrane concrete rules:

- Harmonic rhythm: 2 chord events/bar minimum; up to 4 in transitions
- Root system: augmented-triad tonal center lattice + ii-V connectors
- Motif cells: 3-5 note cells from pentatonic/arpeggio, sequenced
  through cycle
- Sheets-of-sound: rapid arpeggio/scale hybrids implying substitutions;
  quantize phrase-start and phrase-end anchors for Phrase Grammar survival
- Superimposition maps: approved pentatonic by chord class stored in data

Coltrane cell generator alternates:

- Chordal cell: 1-3-5-7-9
- Pentatonic cell: 1-2-3-5-6 or altered equivalent
- Symmetric connector: chromatic enclosure or diminished fragment
- Sequenced displacement: same cell on new thirds-cycle target

### Phase 3 — Harmonic Scene Engine + Voice-Leading Solver (target: 8.9 → 9.0)

Replace chord-label generation with harmonic scene pipeline:
harmonic scene → voice-led realization → orchestration

Scene types:

- functional_progression
- modal_pedal_scene
- morph_scene
- third_cycle_scene
- planed_color_scene
- cadential_lock_scene

Voice-leading cost function penalties:

- Large leap in inner voice: +3 above 4th, +6 above 6th
- Parallel perfect 5ths/octaves in exposed texture: +5
- Lost common tone when one exists nearby: +4
- Unresolved tendency tone at cadence: +4
- Muddy cluster below register threshold: +5
- Stepwise contrary motion into cadence: -3 (reward)
- Preserved motif fragment in inner voice: -4 (reward)

Pedal/modal drift bar-by-bar algorithm:

1. Declare pedal anchor + expected duration range
2. Per bar: choose modal focus subset relative to pedal
3. Mutate only 1-2 upper tones per event unless at sectional seam
4. Insert cadence repair if tension exceeds threshold near ending

Chord morphing graph: nodes = voiced sonorities, edges labeled by
moved voices, semitone travel, retained common tones, dissonance delta.
Evans: low-motion/high-common-tone edges.
Schneider: stepwise mutation edges.
Coltrane: harmonic target cycling edges regardless of voice-leading cost.

### Phase 4 — RhythmDNA (target: 9.0+)

Each preset owns a RhythmDNA: onset histogram, syncopation window,
beat-avoidance pattern, tuplet tolerance, cross-rhythm palette,
cadence compression profile. Motif durations sampled from DNA before
pitch realization.

Composer rhythmic defaults:

- Evans: floating entrances, low onset density, delayed downbeat,
  occasional bass/pad polyrhythm, slow harmony over active percussion
- Schneider: normative 4/8-bar hypermeter, hemiola near transitions,
  Brazilian subdivision in selected pieces, intensification aligned to
  Solo-Recapitulation trajectory
- Coltrane: high subdivision pressure, sequential cells across barlines,
  dense pickup behavior, tension through continuation not suspension

Cross-rhythm/hemiola rules without breaking Phrase Grammar:

- 3:2 or 2:3 overlays only when phrase accents remain legible every 2/4 bars
- Local hemiola windows of 1-2 bars then restore meter-confirming cadence
- Reject cross-rhythm obscuring cadential arrival unless harmonic lock
  and registral thinning support it

### Phase 5 — Form Controller + Tension Scheduler (target: 9.0+)

Best-scoring formal architectures: AABA, Schneider three-space trajectory,
arch form with audible A-material transformation and return.

Schneider Solo-Recapitulation model:

1. Exposition: primary motif clear, moderate density
2. Solo: motif fragmented into accompaniment/riffs; intensity rises
3. Pre-recap: peak ensemble feature or deliberate deflation
4. Recapitulation: motif returns recognizably; softened cadence before coda

Tension arc targets (normalized 0-1):

- Intro/setup: 0.20
- Sectional expansion: 0.45
- Pre-recap/bridge peak: 0.80
- Recapitulation reset: 0.35
- Final cadential bloom: 0.60 (must end below GCE final-bar tension gate)

---

## Future Workstreams

### Afro-Cuban Big Band

This is a dedicated future workstream, not an arranger profile addition. Requires new engine infrastructure: clave-driven rhythm layer, tumbao bass patterns, montuno piano logic, percussion section, and Cuban-specific horn phrasing. Do not attempt until prerequisite Cuban rhythm-grid research is scoped (Big Band evaluation registry is already wired for existing jazz arranger ids).

**Reference resource:** *Latin Arranging: Cuban Styles — Toshi Clinch Productions*

**Research prompt** (saved for when this workstream opens):

```
Use "Latin Arranging: Cuban Styles — Toshi Clinch Productions" as your sole reference for modeling Cuban big-band language in a composition engine.

1. Identify the core arranging parameters that distinguish the following Cuban/Latin styles when orchestrated for big band: danzón, son, son montuno, mambo, cha-cha-chá, rumba (yambú, guaguancó, columbia), salsa, songo/timba.

2. For each style, translate the course descriptions into specific numeric or categorical engine settings across these dimensions (tables only, no prose):
- Rhythmic grid: subdivision, tempo bands, straight vs swung, clave type, anticipated vs on-beat phrasing
- Percussion roles: mandatory instruments, default pattern families, ostinati vs variation tolerance
- Bass/tumbao: contour, syncopation slots, clave relationship, fill frequency
- Piano/montuno: density 1-5, pattern length, harmony type, repetition vs variation
- Horn phrasing: clave alignment, phrase lengths in clave cycles, riff vs melodic line balance
- Harmony: extension level, functional vs modal %, reharmonization tolerance

3. From the development arc (contradanza → danzón → son → mambo → salsa → songo/timba), give:
- Interpolation ranges for adjacent style pairs
- Hard constraints where changing a parameter instantly breaks authenticity

4. Output as one summary table per style and one morphing matrix table. No history, no performance advice — generative rules only.
```

### Odd-Meter / Rock-Inflected Big Band

Distinct musical language covering meter systems fundamentally different from classic swing. Reference arrangers: Don Ellis, Darcy James Argue, John Hollenbeck. Do not attempt until Cuban workstream is scoped. Requires new metric grid logic and rock-inflected rhythm section behaviour.

---

## Known Architectural Gaps

Documented limitations—do not mistake UI labels for fully wired engine behaviour until addressed.

### ARRANGER STYLES — engine wiring

**Mapped to `composerStyle` (registry rules + tuning receipts):** all Generate **Arranger** ids that correspond to **`BIG_BAND_RULE_REGISTRY.composerRules`** — **`basie`**, **`ellington`**, **`thad`**, **`schneider`**, **`quincy_jones`**, **`gil_evans`**, **`bob_brookmeyer`**, **`clare_fischer`**, **`oliver_nelson`**, **`sammy_nestico`** — via **`composerStyleFromArrangerStyle`** in **`composerOsAppGeneration.ts`** before **`runBigBandMode`** / **`runBigBandRealisation`**.

**Structured profile receipts (`BigBandArrangerProfileReceiptV1` on `resolvedRules.tuning`):** each of the above composers has a research-aligned parameter receipt in **`bigBandEraResolver.ts`** (see **section 10 — Big Band arranger profiles**). **Combined evaluation** selects the matching **`StyleProfile`** by **`composerStyle`** (**Evaluation System** § Style Profile Registry).

Song Mode **style pairing** uses the same **`arrangerStyle`** strings for confidence / contrast metadata (**`stylePairingResolver.ts`** **`ARRANGERS`** set includes these ids).

**Follow-up:** deeper per-arranger **scoring** differentiation (beyond receipts + existing **`applyBigBandRules`** hooks) remains roadmap scope when the Big Band pipeline is extended.

---

## 12. Workflow recipes

### Scenario 34: One-hour workshop (lead sheet)

**Song Mode** → writer with clear **symbolism** → lock seed → export → **Sibelius house style** cleanup → discuss **receipts vs choices**.

### Scenario 35: Odd-meter composition club

Pick writer with **`barMeterMap`** support → chart **accent buckets** for students → compare **two seeds** with identical maps.

### Scenario 36: Critical listening lab

Generate **two writers** on same **macro harmony sketch** (manual lock) → compare **device receipts**—translate to **student arranging homework**.

---

## Tonality Vault — Expanded Roadmap

Composer OS is extending **Tonality Vault** into guitar-forward generation, **liquid harmony**, **reharmonisation**, and arrangement routing. This section is the **product/engine roadmap** for that expansion (implementation spans `engines/composer-os-v2/core/harmony/` and related pipelines). Cross-link: **`docs/GCE_FRAMEWORK_V2.md`** for evaluation philosophy; engine chord-type reference continues from **`tonalityVaultDatabase`** / **`quadratonicMelodySelector`**.

### External riff ecosystem audit (read-only, no clone)

The following GitHub repos were checked via **public API / raw README only** (no clone, no local files). Use them as **hints for data shapes and ecosystem wiring**, not as drop-in dependencies until reviewed.

| Repository | What it is (public metadata) | Stack | Guitar / fretboard | Riff data / banks | Notes for Composer OS TS |
|------------|-----------------------------|-------|--------------------|-------------------|---------------------------|
| [mikeb55/riffgen](https://github.com/mikeb55/riffgen) | HTML/JS quartet + guitar engine. **`generateRiff()`** uses named profiles + scale rows | HTML / JS | No fretboard logic | Data-driven scale/profile rows (starter **`web/riffgen.js`**) | Data-driven architecture portable to TS — swap harmony-library imports for **`tonalityVaultDatabase`**. **MIT** |
| [mikeb55/riffgen2](https://github.com/mikeb55/riffgen2) | Browser guitar riff generator with **Tone.js**. **16-slot binary rhythm masks** per style (rock / blues / metal / jazz / funk), named scale pools, **`noteToFret()`** simplified E-standard fret mapper | HTML + JS (Tone.js) | **`noteToFret()`** simplified E-standard mapper (tab UI) | Rhythm masks + scale pools (`standalone_riffgen.html`) | Port rhythm masks and fret mapping ideas to **VaultRiffGenerator** — replace random scale walks with quadratonic / grip rules. License unclear |
| [mikeb55/riffgen3](https://github.com/mikeb55/riffgen3) | Placeholder / minimal (**Shell** only; tiny footprint) | Shell | Not evidenced | No | No reusable engine logic visible publicly |
| [mikeb55/RiffgenPro](https://github.com/mikeb55/RiffgenPro) | Stub (“Made in Claude”; empty language stats) | — | Not evidenced | No | Treat as placeholder |
| [mikeb55/riffbank](https://github.com/mikeb55/riffbank) | Shared **riff/motif** library (**MIT**): JSON + optional MIDI; `data/riffs.json` with MIDI pitch + duration rows | Docs say JSON/MIDI; **languages** unset at API | README: **no fretboard**—abstract pitch/duration | **Yes** — starter bank + `riffbank_v1.zip`; **schema/** + **types/** dirs | **Portable:** trivial mapping from `{ pitch, dur }` to score-model notes; copy **schema/types** after license review |
| [mikeb55/infinite-riff-machine](https://github.com/mikeb55/infinite-riff-machine) | **IRM**: riff variation + section chaining; integrates **riffbank**, **mrprofiles**, **harmony-library** (**MIT**) | **JavaScript**; **web/** demo, **schema/riff.schema.json**, **types/** | README: **not guitar-specific** | Variation engine + zip bundle | **Portable:** JSON Schema + TS-adjacent **types/** useful as contract reference; JS web code → rewrite in TS |
| [mikeb55/grand-criteria-of-excellence-jazz](https://github.com/mikeb55/grand-criteria-of-excellence-jazz) | Large mixed repo: **HTML**, **Python**, **LilyPond**, etc.; folders e.g. **BarryEngine**, **Bebop Language**, **Composition Rules** | Multi-language | Not confirmed from README alone | Rules/text more than MIDI riff bank | **Alignment** with **GCE**-style jazz criteria; **direct TS port** unlikely without case-by-case extraction |

**Takeaway:** **Build C** ships **`core/guitar/`** (`generateVaultRiff`, `buildGuitarGripLibrary`, `FretboardRealization`)—still useful to mine **[riffbank](https://github.com/mikeb55/riffbank)** and **[infinite-riff-machine](https://github.com/mikeb55/infinite-riff-machine)** for variation/section contracts. Treat **grand-criteria-of-excellence-jazz** as **research/diagnostic** adjacent to GCE, not a drop-in engine.

### Build A — Note tagging + beat context (**complete**)

**Shipped** in `engines/composer-os-v2/core/harmony/` — **`noteTag.ts`**, **`beatContextLegalityMap.ts`** (re-exported from **`harmony/index.ts`**).

**`NoteTag`** — per–pitch-class metadata for melody / guitar layers:

| Field | Purpose |
|-------|--------|
| **`tonalRole`** | `triadRoot` \| `triadThird` \| `triadFifth` \| `primaryTension` \| `secondaryTension` \| `triadPairTension` \| `bebopPassing` \| `chaos` (last two reserved for later engines). |
| **`layer`** | `0` \| `1` \| `2` \| `3` — depth of harmonic intent (triad surface → chaos). |
| **`beatLegality`** | `strong` \| `weak` \| `syncopated` \| `approachOnly` — where an attack on this pitch class is rhythmically valid. |
| **`resolveTargets`** | Absolute **pitch classes (0–11)** preferred continuations / resolutions. |
| **`voicingCompatibility`** | Optional string tags for voicing rules (scaffold: empty until voicing hooks land). |
| **`guitarTechniques`** | Optional string tags; **Build C** can populate via **`FretboardRealization.techniqueTags`** when a score path consumes grip metadata. |

**`buildBeatContextLegalityMap(chordTypeId, rootPc)`** (`beatContextLegalityMap.ts`) — uses **`tonalityVaultDatabase`** and **`selectQuadratonicMelodySpec`**. Returns a **`Map<number, NoteTag>`** keyed by **absolute pitch class 0–11** for the given chord **root PC**.

| Class | Layer | `beatLegality` | Role assignment |
|-------|-------|----------------|------------------|
| Vault **melodic triad** (three T-stack tones) | **0** | **`strong`** | Slots map to **`triadRoot`**, **`triadThird`**, **`triadFifth`**; `resolveTargets` = other two triad absolute PCs. |
| **Primary tension** (vault `primaryTensionNote`, if not already a triad slot) | **1** | **`weak`** | **`primaryTension`**; `resolveTargets` from quadratonic **resolve-toward** triad degrees → absolute PCs. |
| Other **`tensionHierarchy`** degrees (not triad, not primary) with a vault spelling | **2** | **`approachOnly`** | **`secondaryTension`**; `resolveTargets` = triad absolute PCs. |
| All remaining pitch classes | **3** | **`syncopated`** | **`chaos`** (outside the vault spelling set for that chord). |

Unknown **`chordTypeId`**: empty map. Overlap between triad and primary tension is resolved **in favour of the triad** (layer 0).

### Build B — Layer state machine + liquid harmony (**complete**)

**Shipped** in `engines/composer-os-v2/core/harmony/` — **`layerStateMachine.ts`**, **`liquidHarmonyPlanner.ts`** (re-exported from **`harmony/index.ts`**).

**`TensionState`** — phrase arc label: **`resolve`** \| **`primary`** \| **`tension`** \| **`chaos`** \| **`recover`**.

**`LayerStateMachine`**

- **`currentState`** starts at **`primary`**.
- **`advance(beatStrength)`** with **`'strong'`** \| **`'weak'`** \| **`'offbeat'`** — returns the new state. Contract: **tension** is only entered from **primary** (on a **weak** beat); **chaos** accumulates a **16-subdivision** budget (two 4/4 bars of eighths); on **strong** with budget exceeded, **chaos** is forced to **resolve**; **chaos** may **escape** to **recover** with ~**0.15** probability (deterministic gate, no `Math.random`); if the budget is hit off a **strong** beat, **recover**; **recover** holds until the **next strong** beat, then **resolve**; **resolve** is one step, then back to **primary**; **strong** from **primary** or **tension** can hit **resolve** (cadential / release).
- **`getAllowedLayers(state)`** (static) — maps each **`TensionState`** to allowed **`NoteLayer`** values from **`noteTag.ts`** (`0`–`3`): **resolve** `[0]`; **primary** `[0,1]`; **tension** `[1,2]`; **chaos** `[2,3]`; **recover** `[0,1]`.

**`LiquidHarmonyPlan`** — `{ melodyPitchClass, voicingPitchClasses, tensionResolvesOnBeat, chordTypeId }`.

**`planLiquidHarmony(chordTypeId, rootPc, state)`** — pulls the **quadratonic** set from **`selectQuadratonicMelodySpec`**. **Melody** pitch class: prefers **primary tension** when **`state`** is **`tension`** or **`chaos`**; prefers **melodic triad** tones when **`resolve`** or **`recover`**; **`primary`** uses a default triad slot. Remaining quadratonic PCs go to **`voicingPitchClasses`**. **`tensionResolvesOnBeat`**: **`0.5`** when the melody is the primary tension (resolution scheduled on the **next subdivision** in quarter-based 4/4), else **`0`**. Use **`nearestResolvePitchClassToTriad`** (exported from **`liquidHarmonyPlanner.ts`**) for the **nearest triad** resolution target PC.

### Build C — Guitar riff engine (**complete**)

**Shipped** in `engines/composer-os-v2/core/guitar/` — **`fretboardRealization.ts`**, **`guitarGripLibrary.ts`**, **`vaultRiffGenerator.ts`**, barrel **`index.ts`**.

**`FretboardRealization`** — one voicing snapshot:

| Field | Purpose |
|-------|--------|
| **`pitchClasses`** | Absolute **0–11** pitch classes (aligned with `strings` / `frets`). |
| **`strings`** | `0` = low E through `5` = high e. |
| **`frets`** | Parallel frets; `0` = open. |
| **`positionCenter`** | Mean fret (register / “where on the neck”). |
| **`techniqueTags`** | e.g. `alternate`, `economy`, `sweep`, `legato`, `slide`, `bend`, `double-stop` (grip-level hints). |
| **`tonalRole`** | `triad` \| `primaryQuadratonic` \| `tensionQuadratonic` \| `triadPair` — which vault recipe the shape came from. |
| **`tuningId`** | Preset id (see **`alternateGuitarTunings.ts`**) for open-string resolution; **`standard`** uses E-standard midis **40 / 45 / 50 / 55 / 59 / 64**. |

**`buildGuitarGripLibrary(chordTypeId, rootPc, tuningId)`** — returns **`FretboardRealization[]`**. Uses **`buildBeatContextLegalityMap`**, **`tonalityVaultDatabase`**, and **`selectQuadratonicMelodySpec`**. Fret rule: **target MIDI = open-string MIDI + fret**; only **0–15**; keep each shape within a **4-fret** window. Categories emitted: **melodic triad** (3 notes), **primary quadratonic** (4 notes: triad + primary tension), **dyad** pairs (triad pairs and triad+tension), **triad-pair** (four pitch classes from the quadratonic set, split and voiced).

**`generateVaultRiff({ chordTypeId, rootPc, bars, style, tuningId? })`** — returns **`ScoreNote[]`**: each note has **`pitch`** (MIDI), **`startBeat`**, **`duration`**, **`guitarString`**, **`guitarFret`**, **`barIndex`**. Rhythmic rule: **triad** class on **strong** beats, **tension** on **weak** beats, **passing / approach** on **offbeats** (see **`buildBeatContextLegalityMap`**). **Styles:** `quadratonic`, `dyad-seesaw`, `triad-pair-pendulum`, `pedal-string`, `bebop-placement`.

**Export / tab:** Engine output is **not** yet merged into the main MusicXML exporter—**ScoreNote** carries tab-ready **string/fret** for a future pipe. **Product workflow:** MusicXML (when wired from generated lines) → **Guitar Pro 8** / **Sibelius** import for **notation + TAB** the same way other guitar scores are brought into GP8 today.

#### Future Tunings (guitar)

To register a new tuning for Vault **grip** math (and any caller that passes the same **`tuningId`**):

1. Add a preset row to **`alternateGuitarTunings.ts`**: stable **`id`**, **`label`**, **`audibleDescription`**, **`zone`** (if applicable), and **`strings`**: six **scientific-pitch** open strings **low → high** (repo convention, e.g. **`E2`**…**`E4`**). **`openStringMidisForTuning`** converts those to MIDI for fret candidates.
2. **Optional / UI:** add the **`id`** to the relevant zone list (e.g. **`ROADMAP_ZONE_TUNING_PRESET_IDS`** or zone-specific arrays) if the preset should appear in grouped Generate UI.
3. Pass that **`tuningId`** into **`buildGuitarGripLibrary(chordTypeId, rootPc, tuningId)`** — grips **recompute** from the six open-string midis; **no edits** to **`guitarGripLibrary.ts`**, **`vaultRiffGenerator.ts`**, or the core Vault engine are required for a new preset **id**.

**Ideas backlog (not yet shipped as presets):** **Drop D** open midis **[38, 45, 50, 55, 59, 64]** (see existing **`drop_d`** preset), **Open E**, **DADGAD** variants beyond **`dadgad`**, **Nashville** high-stringing, **baritone** standard **[23, 28, 33, 38, 42, 47]**, **7-string** standard.

### Build E+F — Arrangement layer router + motif transformation (**complete**)

**Shipped** in `engines/composer-os-v2/core/arrangement/` — **`arrangementLayerRouter.ts`**, **`motifTransformer.ts`**, barrel **`index.ts`**.

**`ArrangementLayerRouter`** — **`routeStringQuartet(chordTypeId, rootPc)`** and **`routeBigBand(chordTypeId, rootPc)`** return **`ArrangementLayer[]`**: each row has **`instrumentFamily`**, **`assignedTensionLayer`**, **`allowedRoles`** (from **`buildBeatContextLegalityMap`** + **`NoteLayer`** filters), and **`description`**. **`TONALITY_VAULT_DATABASE`** gates unknown **`chordTypeId`** (empty list).

| Ensemble | Part | Vault layers | Role |
|----------|------|--------------|------|
| **String quartet** | Cello (`bass` family) | **0** | Shell / root motion |
| | Viola (`inner-strings`) | **1** | Quadratonic anchor |
| | Violin 2 (`upper-strings`) | **0–1** | Melodic triad / dyad fragments |
| | Violin 1 (`upper-strings`) | **2** | Tension-layer melody / liquid-harmony colour |
| **Big band** | Bass | **0** | Shell |
| | Trombone | **0–1** | Shell + liquid inner movement |
| | Saxophone | **1–2** | Triad-pair runs / quadratonic counterlines |
| | Trumpet | **2** | Tension-quadratonic punctures (strong-beat weight) |
| | Guitar / Piano | **1** | Three-note quadratonic voicings / comp cells |

**`MotifTransformer`** — **`transformMotifThroughLayers(motif, chordTypeId, rootPc)`** returns **`Record<TensionState, MotifNote[]>`** (`TensionState` from **`layerStateMachine`**). **Rhythm preserved** (`beatPosition`, **`duration`**) for every state; only **pitch classes** re-quantise: **`resolve`** → **melodic triad** PCs · **`primary`** → **quadratonic** set · **`tension`** → **secondary tension** PCs (fallback: quadratonic) · **`chaos`** → **triad-pair / quadratonic** pool · **`recover`** → **melodic triad** with **chromatic lead-in** on alternating indices (`triad` vs `triad − 1` semitone).

### Build G — Full 16-tonality per-chord rulesets (**complete**)

**Shipped** in `engines/composer-os-v2/core/harmony/` — **`vaultChordRuleSet.ts`** (re-exported from **`harmony/index.ts`**).

This is the **unified per-chord ruleset** that Vault subsystems can query: one typed snapshot per **`TONALITY_VAULT_DATABASE`** chord type (**16** rows).

**`VaultChordRuleSet`**

| Field | Purpose |
|-------|--------|
| **`chordTypeId`** | Vault **`chordType`** string |
| **`displayName`** | Human-readable row title |
| **`melodicTriadDegrees`** | Three melodic triad **degrees** (`1`–`13`) |
| **`primaryQuadratonic`** | Quadratonic degree set (**triad ∪ primary tension**) |
| **`tensionHierarchy`** | Ordered tension preference list from the DB row |
| **`phraseTemplates`** | Allowed phrase archetypes: **`triad-sweep`**, **`quadratonic-enclosure`**, **`dyad-bounce`**, **`bebop-insertion`**, **`tension-climb`**, **`liquid-resolution`** |
| **`beatAffinityProfile`** | **`strong`** / **`weak`** / **`offbeat`** → pitch classes (reference **`rootPc = 0`**) grouped by **`NoteLayer`** from **`buildBeatContextLegalityMap`** |
| **`guitarGripCount`** | Count from **`buildGuitarGripLibrary`** (standard tuning lookup) |
| **`reharmStrategies`** | Top **three** **`ReharmStrategy`** frequencies from **`generateReharmCandidates`** (**neutral** drift) |
| **`recommendedTensionStates`** | Suggested **`TensionState`** arc from chord stability heuristics |

**`buildAllVaultChordRuleSets()`** — walks **`TONALITY_VAULT_DATABASE`**, builds **`VaultChordRuleSet[]`**. **Mechanics:** **`melodicTriadDegrees`** / **`tensionHierarchy`** from the DB; **`primaryQuadratonic`** from **`selectQuadratonicMelodySpec`**; **phrase templates** by chord character (**sus** vs **altered/tense** vs **stable** defaults); **beat affinity** from **`buildBeatContextLegalityMap`** layer buckets; **grip count** via **`buildGuitarGripLibrary`**; **reharm** strategies from **`generateReharmCandidates`**; **`recommendedTensionStates`** from stability heuristics (**stable** → **`resolve` / `primary`** bias; **altered** → **`tension` / `chaos`** bias; etc.).

### Build H — GCE-targeted generation (**complete**)

**Shipped** in `engines/composer-os-v2/core/evaluation/` — **`gceTargetedGenerator.ts`** (re-exported from **`evaluation/index.ts`**).

This is the **quality gate** for aiming at **GCE 9+**-grade output: **evaluate before you ship** — not infinite regeneration. Wire **`evaluate`** to your **GCE** / **LOCK** / **Style Profile** / **quadratonic alignment** scores (three numeric inputs below).

**`GCEGenerationTarget`**

| Field | Purpose |
|-------|--------|
| **`minScore`** | Weighted score threshold (default **8.5**). |
| **`maxRefinementPasses`** | Hard cap on refinement iterations (**DCR:** default **1** — at most **one** pass). |
| **`weights`** | **`gce`**, **`style`**, **`quadratonicAlignment`** — blend the three sub-scores into **`finalScore`**. |

**`DEFAULT_GCE_TARGET`** — **`minScore` 8.5**, **`maxRefinementPasses` 1**, **`weights`:** **`gce` 0.5**, **`style` 0.3**, **`quadratonicAlignment` 0.2**.

**`runWithGCETarget<T>(generate, evaluate, refine, target)`** — calls **`generate()`** once for the initial candidate; **`evaluate(output)`** returns **`{ gce, style, quadratonicAlignment }`**; **`finalScore`** = weighted sum using **`target.weights`**. If **`finalScore < minScore`** and **`refinementPasses < maxRefinementPasses`**, calls **`refine(output, breakdown)`** once (per pass), re-runs **`evaluate`**, recomputes **`finalScore`**. **Never** loops more than **`maxRefinementPasses`** times. Returns **`GCEGenerationResult`**: **`output`**, **`finalScore`**, **`passedTarget`** (**`finalScore >= minScore`**), **`refinementPasses`**, **`evaluationBreakdown`** (final **gce / style / quadratonicAlignment**).

### Planned builds (engine)

- **Build A — Note tagging + beat context:** **Complete** (see **Build A** subsection above).

- **Build B — Layer state machine + liquid harmony:** **Complete** (see **Build B** subsection above).

- **Build C — Guitar riff engine:** **Complete** (see **Build C** subsection above).

- **Build D — Reharmonisation engine:** **Complete** — see **Revolutionary Reharmonisation Engine** below; shipped as **`reharmCandidateEngine.ts`** (**`generateReharmCandidates`**, **`ReharmCandidate`**, **`EmotionalDrift`**, **`ReharmStrategy`**).

- **Build E + F — Arrangement layer router + motif transformation:** **Complete** (see **Build E+F** subsection above).

- **Build G — Full 16-tonality per-chord rulesets:** **Complete** — see **Build G** subsection above; **`VaultChordRuleSet`** + **`buildAllVaultChordRuleSets()`**.

- **Build C2 — Alt tuning extension:** **Complete.** **`guitarGripLibrary.ts`** resolves open-string MIDI via **`openStringMidisForTuning`**: **`standard`** → fixed E-standard **[40, 45, 50, 55, 59, 64]**; otherwise **`getAlternateGuitarTuningPreset(tuningId)`** supplies six **scientific-pitch** strings → MIDI for all fret math. **Preset groups (ids):** **Sonic Youth** — **`sy_cgdgcd`**, **`sy_cgdgbd`**, **`sy_ebebeb`**, **`sy_facgce`**, **`sy_cgcgce`**, **`sy_dgdgbd`**, **`open_g`**, **`drone_cluster_1`**, **`drone_cluster_2`**; **Joni Mitchell** — **`dadgad`**, **`open_d`**, **`joni_style_open_color`**, **`joni_style_hybrid_resonance`**, **`joni_dgdfce`**, **`joni_cgefge`**, **`joni_cgdgbe`**, **`joni_dadgbe`**, **`joni_dadfad`**, **`joni_eeeebe`**. Unrecognised **`tuningId`** falls back to standard E. New tunings: add **`alternateGuitarTunings.ts`** row only — **no** grip-library / riff-generator / Vault-engine changes (see **Future Tunings (guitar)** under **Build C**).

- **Build H — GCE-targeted generation:** **Complete** — see **Build H** subsection above; **`gceTargetedGenerator.ts`** (**`runWithGCETarget`**, **`GCEGenerationTarget`**, **`DEFAULT_GCE_TARGET`**).

- **Build IMG — iReal Pro import:** **Complete** — see **Build IMG — iReal Pro import** below (**four iterations**).

- **Build I — Generation Mode Profiles (Solo vs Melody):** **Complete** — see **Build I — Generation Mode Profiles** below; shipped **`core/generation/generationModeProfile.ts`**, **`core/generation/index.ts`**, and **iReal** wire-up in **`irealVaultPipeline.ts`**.

- **Build UI — Visual fretboard (only remaining):** **fretboard.js** + **VexFlow**, **three SVG layers** (grid, active grip, legality heat). **Five iterations** (roadmap): **(1)** **layer** toggles; **(2)** **playback** trail; **(3)** **export** pipeline (**`svgToPng`**); **(4)** responsive layout / **dark** mode; **(5)** **Vault microscope** scrubber. **FretboardPanel** / **TabPanel** scaffold exists in **`apps/composer-os-app`** — extend through these five passes.

### Build I — Generation Mode Profiles (Solo vs Melody) (**complete**)

**Goal:** Two generation **modes**—**solo** vs **song melody**—with explicit tunable profiles so Vault melody output does not default to one density.

**Shipped types** (`engines/composer-os-v2/core/generation/generationModeProfile.ts`):

- **`getProfileForMode(mode)`** — returns **`SOLO_PROFILE`** or **`MELODY_PROFILE`** for **`GenerationMode`** **`'solo'`** | **`'melody'`**.
- **`planPhrase(bars, mode)`** — **seeded deterministic** RNG (**mulberry32**, seed from **`bars` + `mode`**). Returns **`PhrasePlan`**: **`bars`**, **`contour`** (**`PhraseContour`**), **`apexBar`** / **`apexBeat`**, **`cadencePitchClassRole`**, **`rhythmCells`** (**`RhythmCell[]`**), optional **`motifId`**.

**`GenerationModeProfile`** — fields drive phrase + bar fill:

| Field | Role |
| --- | --- |
| **`notesPerBarRange`** | **`[min, max]`** notes per bar for the mode. |
| **`longNoteRatio`** | Target fraction of **longer** durations (half / dotted / tied feel). |
| **`restRatio`** | Target fraction of **rest** or **breath** vs sounded notes. |
| **`motifReuseProbability`** | Chance to **reuse** or **call back** material vs fresh cells. |
| **`exactMotifRepeatProbability`** | Chance of **literal** repeat vs varied sequence. |
| **`contourPlanningStrength`** | How strongly phrase **shape** constrains pitch choices. |
| **`harmonyProofPerBar`** | Scalar weight for **per-bar** harmonic proof density (solo defaults higher). |
| **`harmonyProofPerPhrase`** | Scalar weight for **phrase-anchor** proof (melody defaults higher). |
| **`maxPhraseSpanSemitones`** | **Register span** cap within a phrase window. |
| **`stepwiseMotionRatio`** | Target **step** vs **leap** balance. |
| **`leapProbability`** | Probability of **allowed leaps** (bounded by vault / voice-leading elsewhere). |
| **`maxTensionLayerDefault`** | Default **tension layer** ceiling **`0`–`3`** unless phrase overrides. |
| **`postCadenceRestProbability`** | **Space after cadences** — drives optional **rest** inserts in **melody** iReal path. |
| **`barCrossingContinuationProbability`** | **Carry** melodic figure across barline vs respell on downbeat. |
| **`rhythmicCellReuseProbability`** | Reuse **rhythmic cell family** vs new subdivision pattern. |
| **`melodicOverrideVsLocalHarmony`** | How much **contour/motif** may override **local** grip harmony hints. |

**Presets:**

- **`SOLO_PROFILE`** — **`notesPerBarRange`** **5–10**; **dense**; **bebop**-leaning; **bar-reactive**; **`maxTensionLayerDefault` `2`**.
- **`MELODY_PROFILE`** — **`notesPerBarRange`** **2–6**; **sparse**; **motif-driven**; **phrase-reactive**; **`maxTensionLayerDefault` `1`**.

**iReal pipeline wire-up** (`engines/composer-os-v2/core/irealpro/irealVaultPipeline.ts`): **`VaultGenerationOptions`** (alias **`GenerateFromIRealOptions`**) includes optional **`mode?: GenerationMode`** (default **`'solo'`**). Each measure runs **`planPhrase(1, mode)`**; **`generateVaultRiff`** uses **`phrasePlan.bars`** and **`effectiveRiffStyle`** (**melody** forces **`quadratonic`** for space / triad focus; **solo** uses **`riffStyle`** as before). **`postCadenceRestProbability`** (profile): in **melody** mode, after **odd** bar indices (**1, 3, 5…**), **`Math.random() < postCadenceRestProbability`** appends a **rest** **`ScoreNote`** (**`pitch` 0**, **`duration` 0.5** quarters). **`IRealVaultOutput`** includes **`mode: GenerationMode`**.

### Multi-Chorus Variation (iReal / paste / PDF vault pipeline)

Repeat the same **`ParsedChart`** multiple times in one **`IRealVaultOutput`** without duplicating cells in the UI:

- **`chorusCount`** on **`VaultGenerationOptions`** — integer **`≥ 1`**, default **`1`**, capped at **`64`**. Each chorus runs the **full** per-bar **`generateVaultRiff`** loop; **`generatedNotes`** use **global** sequential **`barIndex`** (**0 … N×`chorusCount`−1**) and **`startBeat`** continues in **quarter-note** units across choruses (**meter** from **`ParsedChart.timeSignature`**).
- **Melody** mode — after each chorus’s raw fill, **Build F** **`transformMotifThroughLayers`** restates the seed motif on later bars. **Tension arc per chorus:** the layer pick cycles **primary → tension → chaos → recover → resolve**; each new chorus **offsets** that cycle by one step (**`tensionCycleRotation`** = chorus index, modulo **5**) so successive choruses do not all begin on **primary**. **`songwriterStyleId === 'sonic_youth'`** disables this offset (**rotation stays 0**) so Sonic Youth texture logic elsewhere is not fighting the vault phrase engine.
- **Solo** mode — there is **no** motif pass; choruses are independent bar-generation passes only. If **`riffStyle`** is **omitted** or set to **`triad-pair-pendulum`**, effective vault style follows **`TRIAD_PAIR_CHORUS_ROTATION`**: **`['triad-pair-pendulum','bebop-placement','triad-pair-pendulum','quadratonic','triad-pair-pendulum']`** by **`chorusIndex % 5`**. Same **SY** **`songwriterStyleId`** flag **skips** this style rotation (every chorus uses the resolved base **`riffStyle`** / default). Any **other** explicit **`riffStyle`** keeps one style for all choruses.

**`MelodyModePlanner`** (full orchestration above quadratonic fill) remains **future**; **`planPhrase`** + profiles **do not replace** the quadratonic engine — they **layer** phrase intent and mode gates ahead of note fill where wired.

**`MelodyModePlanner`** (planned) **wraps** the existing **quadratonic** / Vault melody path — it **does not replace** the quadratonic engine. It sits **above** fill: selects phrase-level **contour**, **rhythmic cell family**, **motif**, **cadence target**, and **max tension layer** **before** bar-level note placement.

**Phrase planner responsibilities (planned):** choose **contour**, **rhythmic cell family**, **motif**, **cadence target**, **`maxTensionLayer`** **before** filling individual notes.

**Fastest wins (five):**

1. **Reduce** melody **notes per bar** in melody mode (enforce **`notesPerBarRange`** / breath).
2. **Add** phrase **contours** and **apex** targets so lines arc instead of filling evenly.
3. **Add** **motif reuse** across **2–4** bars (development windows).
4. **Require** **rests** and **post-cadence** space (**`restRatio`**, **`postCadenceRestProbability`**).
5. **Shift** harmonic **proof** from **every bar** to **phrase start / climax / cadence** only (**`harmonyProofPerBar`** vs **`harmonyProofPerPhrase`**).

### Build IMG — iReal Pro import (**complete**)

**Shipped** in `engines/composer-os-v2/core/irealpro/` (barrel **`irealpro/index.ts`**) and **`apps/composer-os-app/src/pages/HomeGenerate.tsx`** (beta UI). Primary path is **structured** parsing via npm **`ireal-reader`** ([pianosnake/ireal-reader](https://github.com/pianosnake/ireal-reader)), not raw **`.irealb` binary** as the ingest surface. **Optional later:** **JPEG / screenshot** OCR for users without HTML export (same **`ParsedChart`** target) — not in v1.

| Iteration | What shipped |
|-----------|----------------|
| **1** | **`parsedChart.ts`** — **`ParsedChord`**, **`ParsedSection`**, **`ParsedChart`** (`title`, `composer`, `key`, `timeSignature`, `tempo`, `style`, `sections`, `measures`, `repeats`). **`irealProAdapter.ts`** — **`parseIRealProInput(input)`** uses **`ireal-reader`** on **`ireal://`** / **`irealb://`** URL or **HTML** export; **`ireal://`** normalised for the library; first playlist song → **`ParsedChart`**. |
| **2** | **`chordSymbolMapper.ts`** — **`mapChordToVaultType(ParsedChord)`** maps **`rootNote`** → **`rootPc`** (**C = 0 … B = 11**) and **`chordQuality`** → **`vaultChordTypeId`** for all **16** **`TONALITY_VAULT_DATABASE`** types (synonyms: maj/**^**/Δ, minor, dom, sus, altered, etc.); unrecognised quality → **`null`**. |
| **3** | **`irealVaultPipeline.ts`** — **`generateFromIReal(input, options?)`** walks **`ParsedChart.measures`** (first chord per bar), **`mapChordToVaultType`**, **`generateVaultRiff`** per bar (**`bars: 1`**), offsets **`ScoreNote.startBeat`** by **`barIndex * 4`** (4/4 quarters); returns **`IRealVaultOutput`** — **`generatedNotes`**, **`chordMappings`**, **`unmappedChords`**. MusicXML export from this pipeline remains a **follow-up** wire to the main exporter. |
| **4** | **iReal Pro Import (Beta)** in **`HomeGenerate.tsx`** — collapsible **`details`**; **textarea** for **`ireal://`** / HTML paste; **riff style** dropdown (**bebop-placement**, **quadratonic**, **dyad-seesaw**, **triad-pair-pendulum**, **pedal-string**); **tuning** dropdown (**standard**, **dadgad**, **open_d**, **open_g**, **sy_cgdgcd**); **Generate from iReal** calls **`generateFromIReal`**; results show **title**, **key**, **bars**, **mapped vs unmapped** counts; **amber** list for unmapped chords. |

**Cross-check library (not bundled):** **[daumling/ireal-renderer](https://github.com/daumling/ireal-renderer)** — optional future cross-check for section markers / form structure.

### How Composer OS helps composition

- **Melodic material** is anchored to **quadratonic / melodic-triad** logic **per chord**—not generic **scale** runs. **Build G** exposes a single **`VaultChordRuleSet`** per type so riffs, reharms, beat maps, and phrase templates stay **consistent** across the stack.
- **Build H** (**`runWithGCETarget`**) is the **weighted quality gate** (**GCE + style + quadratonic alignment**) with **at most one** refinement pass — aim **GCE 9+** by **scoring before release**.
- **Reharmonisation** (**Build D**, **`reharmCandidateEngine`**) **preserves or reinterprets melodic-triad identity** while modernising **shells** and colour — see **Revolutionary Reharmonisation Engine**.
- **String quartet** sketches: each **voice** can be assigned a different **tension layer** so the ensemble moves as a **coherent** harmonic unit.
- **Big band:** **arranger style profiles** + **Vault layer routing** together are a **differentiated** capability—style governs phrasing and weight; vault governs **who plays which harmonic role**.
- **Guitar:** **position-aware**, **idiomatic** riffs from **Build C**; **MusicXML → GP8** import path yields **tab** in Guitar Pro the same way other exported guitar scores do once the line is on the score.
- **Vault microscope UI** (planned) will surface **why** the engine chose a note or grip—**teachable**, **transparent** decisions for classrooms and creators.

### Planned UI additions (cross-cutting)

**Tension dial**, **chord-to-triad inspector**, **fretboard overlay** (**Build UI**), **beat-legality heatmap**, **Vault microscope**, **liquid harmony preview**, **arrangement lane map**, **reharm mode**, **guitar riff mode** — plus **iReal Pro Import (Beta)** on **Generate** (**`ireal://`** / HTML paste → Vault riffs; shipped **Build IMG** iter **4**).

### Build order (remaining)

**A** through **G**, **C2**, **H**, **IMG**, and **I** are **complete**. **Only** remaining Tonality Vault build: **Build UI** (visual fretboard / microscope stack).

**Next:** **Build UI** — **five** roadmap iterations: **layer toggles** → **playback trail** → **export pipeline** (**`svgToPng`**) → **responsive / dark mode** → **Vault microscope** scrubber (**fretboard.js** + **VexFlow**; extend **FretboardPanel**, **TabPanel**).

---

## Revolutionary Reharmonisation Engine

This is the **only** music generation engine in the product lineup that performs **reharmonisation at the melodic-triad level** rather than at the **chord-symbol** level. Every substitution **preserves** or **purposefully reinterprets** the **upper-structure melodic triad** that the melody is already expressing — the same object the Tonality Vault uses for quadratonic melody, grips, and tension hierarchy.

**No existing general-purpose tool** in this category — **Band-in-a-Box**, **Sibelius**, **Finale**, **iReal Pro**, or typical **DAW** harmony plugins — implements that contract. **Band-in-a-Box** reharmonisation is **functional harmony** and style presets over chord roots and scales; it has **no melodic-triad awareness**. Notation hosts swap chord symbols and extensions on the page without a vault-level triad stack tied to your line.

Composer OS uses **`generateReharmCandidates`** (**`reharmCandidateEngine.ts`**) with **three** substitution strategies:

| Strategy | Role |
|----------|------|
| **`shared-melodic-triad`** | Strongest family — same vault **melodic triad root** anchor (`T3` / `T4` / `T7` line); **`melodicTriadPreserved: true`**. |
| **`tension-layer-swap`** | Harmonic reinterpretation — substitute type whose **primary tension degree** matches the original melodic-triad anchor degree; **`melodicTriadPreserved: false`** (expressive tension role shift). |
| **`shell-swap`** | **Melodic triad degrees fixed**, **shell / chord quality** varied beneath (same triad degree triple, different chord type). **`melodicTriadPreserved: true`**. |

The **`EmotionalDrift`** parameter (**`darker`**, **`brighter`**, **`more-suspended`**, **`more-unstable`**, **`more-cinematic`**, **`neutral`**) biases ranking toward substitutions that match compositional intent — e.g. **darker** favours minor / diminished colour, **brighter** favours major / Lydian-leaning types, **more-suspended** favours **sus** families, **more-unstable** favours altered / outside harmony, **more-cinematic** favours rich **maj7** / **maj9** colours.

The **`guitarFriendly`** flag uses **standard-tuning** fret reach so suggested bass / root positions stay **playable in position**. Every substitute chord type already has its own **quadratonic**, **grip library**, and **tension hierarchy** in the Vault — nothing is a naked symbol swap.

Combined with **Build C** guitar grip output and **MusicXML** export paths, this stack is a **serious creative tool** for **jazz guitarists** and **composers** who work from **line-first** and **teaching-grade** harmonic logic.

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
