# Songwriting Engine — Song IR Architecture User Guide

## A. What the New Song IR Engine Is

The **Song IR (Intermediate Representation) Engine** is a clean, deterministic pipeline for compiling song structure from a typed, machine-readable specification. Instead of generating random candidates and repairing them until they pass evaluation, the new architecture:

1. Takes a **Song IR** — a structured dataclass describing title, premise, form, sections, hook DNA, harmony, and export hints
2. **Validates** the IR (required fields, section order, hook DNA, title placements, MusicXML constraints)
3. **Compiles** sections in order using role-specific compilers (verse, chorus, prechorus, bridge, final_chorus, outro)
4. Produces a **CompiledSong** — a coherent, section-by-section blueprint with melody events, lyric lines, and harmony
5. Exports via **real MusicXML** — full structure with work-title, measures, notes, lyrics, harmony

The engine is **deterministic**: same Song IR + same seed yields the same compiled result. No random drift.

---

## B. Why It Replaces the Old Generate-Score-Repair Logic

The legacy pipeline (`generate_song`, `run_population_search`, `run_hook_first_search`) used:

- Population-based search with MAP-Elites–style archives
- Generate → Evaluate → Repair loops
- Many scoring-helper modules and repair mappings
- Tight coupling to creative-rule-engines YAML

That approach was powerful but complex. The new Song IR path:

- **Starts from intent**: you describe the song, not a search space
- **Compiles, not searches**: IR → compiled song in one pass
- **Fewer moving parts**: schema, validator, compilers, contracts
- **Testable**: every step is deterministic and unit-testable
- **Future-safe**: grammar-constrained generation, MAP-Elites, and finalist search can be added later on top of this foundation

Phase 1 proves the architecture. Later phases add generation, search, and migration.

---

## C. Main Files in This Phase

| File | Purpose |
|------|---------|
| `song_ir_schema.py` | Song IR dataclasses: `SongIR`, `SectionIR`, `HookDNA`, `HarmonicPlan`, `ContrastArc`, `ExportHints`, `MusicXMLConstraints` |
| `song_ir_validator.py` | `validate_song_ir`, `validate_section_order`, `validate_hook_dna`, `validate_musicxml_constraints` |
| `compiled_song_types.py` | `CompiledSong`, `CompiledSection`, `CompiledMelody`, `CompiledLyrics`, `CompiledHarmony` |
| `section_compiler.py` | `compile_song_from_ir(song_ir)` — main entry, orchestrates all section compilers |
| `chorus_compiler.py` | `compile_chorus` — identity centre |
| `verse_compiler.py` | `compile_verse` — premise and image_family |
| `prechorus_compiler.py` | `compile_prechorus` — lift into chorus |
| `bridge_compiler.py` | `compile_bridge` — contrast, premise reframing |
| `final_chorus_compiler.py` | `compile_final_chorus` — emotional climax |
| `outro_compiler.py` | `compile_outro` — closure |
| `musicxml_exporter.py` | `export_compiled_song_to_musicxml(compiled_song)` — full MusicXML |
| `musicxml_contracts.py` | `validate_compiled_for_export`, `compiled_song_to_musicxml_stub`, `validate_musicxml_export` |
| `song_ir_examples.py` | `title_first_example()`, `image_driven_example()`, `hook_forward_example()`, `get_example(name)` |
| `songwriting_engine_runtime.py` | `run_songwriting_engine` (main), `compile_from_song_ir`, `run_stage3_demo` |
| `runtime_cutover.py` | `get_default_songwriting_engine_mode`, `is_legacy_path_enabled`, `get_runtime_mode_summary` |
| `launcher_entry.py` | `run_launcher_generation`, `save_launcher_outputs`, `get_launcher_status` |
| `launcher_config.py` | `get_launcher_defaults`, `get_supported_input_modes`, `get_output_directory_defaults` |
| `song_ir_generator.py` | `generate_song_ir_from_title`, `generate_song_ir_from_premise`, `generate_song_ir_from_hook`, `generate_song_ir_candidates` |
| `ir_generation_strategies.py` | `build_practical_strategy`, `build_hook_forward_strategy`, `build_image_driven_strategy`, `build_premise_driven_strategy` |
| `qd_archive.py` | `QDArchive` — insert, get_elites, get_archive_stats, sample_elites |
| `qd_axes.py` | `score_hook_boldness`, `score_asymmetry`, `score_lyric_density`, `score_harmonic_adventurousness`, `score_emotional_temperature`, `get_qd_coordinates` |
| `finalist_selector.py` | `score_ir_candidate`, `rank_ir_candidates`, `select_finalist_song_irs`, `compile_finalist_candidates` |

**Tests:**

- `test_song_ir_schema.py` — schema and validator
- `test_section_compiler.py` — section compiler behaviour
- `test_end_to_end_song_ir.py` — full pipeline and export stub
- `test_song_ir_generator.py` — Song IR generation
- `test_qd_archive.py` — QD archive
- `test_finalist_selector.py` — finalist selection
- `test_stage2_song_ir_flow.py` — Stage 2 end-to-end
- `test_prechorus_compiler.py`, `test_bridge_compiler.py`, `test_final_chorus_compiler.py`, `test_outro_compiler.py`
- `test_musicxml_exporter.py` — MusicXML export
- `test_stage3_full_song_compile.py` — Stage 3 full song + export
- `test_runtime_cutover.py`, `test_launcher_entry.py`, `test_stage4_end_to_end.py` — Stage 4

---

## D. How Song IR Compiles Into Song Structure

1. **Validation**  
   `validate_song_ir` checks: title, section_order, chorus presence, section roles, title_placements (must refer to sections in order), hook_dna, and optional MusicXML constraints. Invalid IR raises `ValueError` with clear errors.

2. **Section iteration**  
   The compiler walks `section_order` (e.g. `["verse", "chorus", "verse", "chorus"]`), assigning `verse_1`, `chorus_1`, etc., and bar ranges.

3. **Role-specific compilation**  
   - **Chorus**: uses `hook_dna` directly, title placement, premise/image_family for lyrics.  
   - **Verse**: motif transposed down, premise and `image_family`, lower energy.  
   - **Prechorus**: tension lift, higher lyric density, stronger harmony.  
   - **Bridge**: contrast harmony, different contour, premise reframing.  
   - **Final chorus**: emotional climax, higher energy, melodic peak.  
   - **Outro**: closure, motif echo, harmonic resolution.

4. **Output**  
   A `CompiledSong` with `sections`, `melody`, `lyrics`, `harmony`, and `metadata`. Each section has `melody_events`, `lyric_lines`, `harmony`, and `energy_level`.

5. **Export**  
   `export_compiled_song_to_musicxml(compiled_song)` produces full MusicXML with work-title, part-list, measures, melody notes, lyric alignment, harmony annotations, divisions, time signature, key signature.

---

## E. What Is Implemented Now vs Later

### Implemented Now (Phase 1 + Stage 2 + Stage 3 + Stage 4)

- Song IR schema and validation
- Deterministic section compiler (verse, chorus, prechorus, bridge, final_chorus, outro)
- End-to-end IR → CompiledSong → MusicXML
- Canonical examples (title-first, image-driven, hook-forward, full_song)
- **Stage 2:** Song IR generation, QD archive, finalist selection
- **Stage 3:** Full section compilers, real MusicXML exporter
- **Stage 4:** Default engine cutover, `run_songwriting_engine` main entrypoint
- **Stage 4:** Windows launcher (`.bat`), output packaging to `outputs/songwriting_engine/`
- **Stage 4:** Legacy path deprecated, isolated behind `run_legacy_generate_song`
- Tests for all stages including Stage 4 regression
- User-facing docs and MusicXML contract rules

### Not Implemented Yet

- Full grammar-constrained decoder backend
- Full reward-guided tree search
- Premium editorial refinement
- Migration or removal of the old system
- UI/launcher work

---

## E2. Stage 2: Song IR Generation, QD Archive, Finalist Selection

### Song IR Generation

Stage 2 adds **rule-driven** Song IR generation (no LLM). Deterministic: same input + seed = same output.

- **generate_song_ir_from_title(title, seed, strategy)** — From title; strategies: `practical`, `hook_forward`, `image_driven`, `premise_driven`
- **generate_song_ir_from_premise(premise, seed, strategy)** — From premise; title derived from first words
- **generate_song_ir_from_hook(hook_line, seed, strategy)** — From hook line; title from hook
- **generate_song_ir_candidates(input_text, mode, count, seed)** — Generate `count` varied valid SongIRs; mode: `title`, `premise`, `hook`

### QD Archive (MAP-Elites Style)

The archive stores **one best elite per niche**. Niches are defined by 5 axes (each 0 or 1):

- **hook_boldness** — Hook identity strength
- **asymmetry** — Phrase-length variation
- **lyric_density** — Lyric density level
- **harmonic_adventurousness** — Chord variety
- **emotional_temperature** — Section energy contrast

`QDArchive.insert(song_ir, quality_score)` keeps the best per niche. `sample_elites(limit)` returns top elites by quality.

### Finalist Selection Flow

1. Generate candidate SongIRs (e.g. 12)
2. Score each with `score_ir_candidate` (hook clarity, title integration, contrast arc, compile readiness, premise clarity)
3. Insert into QD archive (diversity preserved)
4. Sample top elites (e.g. 5)
5. Compile finalists with `compile_finalist_candidates`

### How Stage 2 Sits Above Phase 1

Stage 2 **generates** SongIRs and **selects** finalists; Phase 1 **compiles** them. The flow:

```
input (title/premise/hook) → generate candidates → QD archive → select elites → compile (Phase 1) → compiled songs
```

---

## E3. Stage 3: Full Song Compilation and MusicXML Export

### New Section Compilers

- **Prechorus** — Increases tension toward chorus; inherits motif; stronger harmonic motion; shorter or rising phrases.
- **Bridge** — Contrast with verse/chorus; different harmony region; premise reframing; motif connection.
- **Final chorus** — Emotional climax; reuses hook DNA; higher energy; melodic peak; title reinforcement.
- **Outro** — Closure; reinforces title/motif; resolves harmony; echoes chorus fragments.

### MusicXML Exporter

`export_compiled_song_to_musicxml(compiled_song)` produces full MusicXML with:

- `<work-title>`, `<part-list>`, `<score-part>`, `<part>`
- Measures with `<attributes>` (divisions, key, time, clef)
- Melody notes with `<pitch>`, `<duration>`, `<type>`
- Lyric alignment via `<lyric><syllabic>single</syllabic><text>...</text></lyric>`
- Harmony annotations via `<harmony><root>...</root><kind>...</kind></harmony>`
- Supported durations: 16th, eighth, quarter, half, whole

### Export Workflow

1. Compile Song IR → `CompiledSong`
2. Call `export_compiled_song_to_musicxml(compiled)`
3. Validate with `validate_musicxml_export(xml_string)`
4. Write to `.musicxml` or `.xml` file

### Stage 3 Demo

`run_stage3_demo(input_text, mode, count, finalist_limit, seed)` returns:

```python
{
  "finalists_compiled": [...],
  "finalists_musicxml": [xml_str, ...],
  "archive_stats": {...}
}
```

---

## E4. Stage 4: Default Engine, Launcher, Output Packaging

### Default Engine Usage

**Main entrypoint:** `run_songwriting_engine(input_text, mode="title", count=12, finalist_limit=5, seed=0)`

This is the default path. It runs: generation → archive → finalists → compile → MusicXML export.

```python
from songwriting_engine_runtime import run_songwriting_engine
result = run_songwriting_engine("River Road", mode="title")
# result["finalists_musicxml"] — list of MusicXML strings
# result["finalists_compiled"] — list of {source_ir, compiled, rank, score}
# result["archive_stats"] — niche count, quality stats
```

### Launcher Usage

Double-click `launchers/songwriting_engine_launcher.bat` or run:

```bash
py -3 engines/songwriting_engine/runtime/launcher_entry.py
```

The launcher uses default input ("River Road", title mode) and saves outputs to `outputs/songwriting_engine/run_YYYYMMDD_HHMMSS/`.

Programmatic launcher:

```python
from launcher_entry import run_launcher_generation, save_launcher_outputs
result = run_launcher_generation("My Song", mode="title", count=12, finalist_limit=5, seed=0)
folder = save_launcher_outputs(result)
# folder contains: finalists_musicxml/, finalists_summary.json, run_summary.txt
```

### Output Folders

- **Base:** `outputs/songwriting_engine/`
- **Each run:** `run_YYYYMMDD_HHMMSS/` (timestamped)
- **Contents:**
  - `finalists_musicxml/` — MusicXML files (one per finalist)
  - `finalists_summary.json` — input, mode, archive stats, finalist titles
  - `run_summary.txt` — human-readable summary

### Legacy Path Status

- **Deprecated:** `generate_song`, `run_population_search`, `run_hook_first_search`
- **Replacement:** `run_songwriting_engine` (Song IR path)
- **Legacy still available:** `run_legacy_generate_song()` for backward compatibility
- **Default mode:** `song_ir` (new engine). Legacy is not the default.

### Full Practical Workflow

```
Title / premise / hook
    ↓
run_songwriting_engine(input_text, mode, ...)
    ↓
Generation → QD archive → finalists → compile → MusicXML
    ↓
result["finalists_musicxml"] — write to .musicxml files
```

Or via launcher: double-click `.bat` → outputs in `outputs/songwriting_engine/run_*/`

### Windows Shortcut / Launcher

1. **Double-click:** `launchers/songwriting_engine_launcher.bat`
2. **Desktop shortcut:** Right-click .bat → Send to → Desktop
3. **Custom shortcut:** Target = full path to .bat; Start in = creative-engines repo root

See `launchers/README.md` for details.

---

## F. Practical Usage Examples (38+)

1. **Generate from title** — Build a Song IR with `title="River Road"`, minimal premise, default form; compile and export.
2. **Generate from premise** — Set `premise="journey and return"`, `image_family=["river","road","bridge"]`; compile.
3. **Compile from Song IR** — Create a `SongIR` dataclass, call `compile_from_song_ir(song_ir)`.
4. **Hook-first song** — Use `hook_forward_example()` or custom `HookDNA` with strong `chorus_melody_idea`; chorus drives identity.
5. **Image-driven song** — Use `image_driven_example()` or custom `image_family`; verses and chorus use imagery.
6. **Lyrics-first song** — Set `premise` and `image_family` richly; compilers produce lyric placeholders from them.
7. **Melody-import flow** — (Future) Import melody as MIDI pitches into `hook_dna.chorus_melody_idea`; compile.
8. **MusicXML-safe export flow** — Compile, then `compiled_song_to_musicxml_stub(compiled)` for minimal XML.
9. **Chorus-focused flow** — Emphasise `hook_dna`, `title_placements={"chorus":"first_line"}`; chorus is identity centre.
10. **Chamber-jazz songwriting flow** — Use `harmonic_plan` with jazz progressions; (future) add style profiles.
11. **Male tenor default vocal flow** — Use `export_hints.vocal_target="male_tenor"` (default); melody in range.
12. **Alternate female vocal option** — Set `export_hints.vocal_target="female_alto"`; (future) transpose/range logic.
13. **Asymmetrical phrase plan** — Set `phrase_lengths=[4,6,4,6]` on `SectionIR`; no symmetry normalisation.
14. **Motif-transform driven song** — Add `MotifTransform` entries; (future) apply in compilers.
15. **Title placement control** — Use `title_placements={"chorus":"first_line"}` or `"last_line"`; validator ensures section exists.
16. **Run demo by name** — `run_song_ir_demo("title_first")`, `"image_driven"`, or `"hook_forward"`; returns `(CompiledSong, stub_xml)`.
17. **Validate before compile** — Call `validate_song_ir(ir)`; check `result.valid` and `result.errors` before compiling.
18. **Custom harmonic plan** — Set `harmonic_plan.section_overrides={"verse":["Am","F","G","C"]}` for verse-specific chords.
19. **Contrast arc** — Set `contrast_arc.section_energies={"verse":0.4,"chorus":0.8}`; `verse_2_intensify=True` for verse 2.
20. **MusicXML constraints** — Set `musicxml_constraints.divisions=8`, `supported_durations`; validator checks.
21. **Minimal valid IR** — `SongIR(title="X", section_order=["verse","chorus"])`; defaults for hook_dna, etc.
22. **Export hints** — Set `export_hints.key_center="G"`, `tempo=120`; used by (future) export logic.

**Stage 2 examples:**

23. **Generate from title (Stage 2)** — `generate_song_ir_from_title("River Road", seed=42)` or `generate_song_ir_candidates_runtime("River Road", mode="title", count=12)`.
24. **Generate from premise (Stage 2)** — `generate_song_ir_from_premise("journey and return", seed=43)` or `generate_song_ir_candidates_runtime("journey and return", mode="premise", count=8)`.
25. **Generate from hook (Stage 2)** — `generate_song_ir_from_hook("Edge of Night", seed=44)` or `generate_song_ir_candidates_runtime("Edge of Night", mode="hook", count=8)`.
26. **Full Stage 2 demo** — `run_stage2_demo("River Road", mode="title", count=12, finalist_limit=5, seed=0)` returns `{candidates, archive_stats, finalists_compiled}`.
27. **QD archive only** — Create `QDArchive()`, insert SongIRs with quality scores, call `sample_elites(limit=5)`.
28. **Finalist compile only** — `compile_finalist_candidates(list_of_song_irs)` returns `[{source_ir, compiled, rank, score}, ...]`.
29. **Strategy variation** — Use `strategy="hook_forward"` for strong chorus identity, `"image_driven"` for rich imagery.
30. **Deterministic reproducibility** — Same `input_text`, `mode`, `count`, `seed` → same candidate set and finalists.

**Stage 3 examples:**

31. **Full song export** — `ir = get_example("full_song")`; `compiled = compile_song_from_ir(ir)`; `xml = export_compiled_song_to_musicxml(compiled)`; write to file.
32. **Melody-first import/export flow** — Set `hook_dna.chorus_melody_idea` from imported MIDI; compile; export to MusicXML.
33. **Hook-first generation export** — `run_stage3_demo("Edge of Night", mode="hook")`; get `finalists_musicxml`; write each to `.musicxml`.
34. **Asymmetrical song form export** — Use `phrase_lengths=[4,6,4,6]` on verse; compile; export; asymmetry preserved in output.
35. **Chamber-jazz style export** — Set `harmonic_plan.section_overrides` with jazz progressions; `export_hints.key_center="G"`; export.

**Stage 4 examples:**

36. **Main default path** — `run_songwriting_engine("River Road")` — one call, full pipeline, MusicXML.
37. **Launcher with custom input** — `run_launcher_generation("Edge of Night", mode="hook")` then `save_launcher_outputs(result)`.
38. **Save to custom folder** — `save_launcher_outputs(result, output_dir=Path("my_outputs"))`.
39. **Check runtime mode** — `get_default_songwriting_engine_mode()` returns `"song_ir"`; `is_legacy_path_enabled()` returns `False`.
40. **Windows launcher** — Double-click `launchers/songwriting_engine_launcher.bat`; outputs in `outputs/songwriting_engine/run_*/`.

---

## G. MusicXML Acceptable Format Rules

### Accepted Extensions

- `.musicxml` — standard uncompressed MusicXML
- `.xml` — generic XML (when content is MusicXML)
- `.mxl` — compressed MusicXML (future support)

### Required Core Structures

- `score-partwise` — root element
- `part` — at least one part (e.g. Voice)
- `measure` — measures with `number` attribute
- `note` — pitch, duration, or rest

### Melody Expectations

- Pitches as MIDI or MusicXML `<pitch><step>`, `<alter>`, `<octave>`
- Durations in divisions (default 4 = quarter)
- Supported duration types: `quarter`, `eighth`, `half`, `whole`, `16th`
- Melody events include `measure`, `beat_position`, `section_id`

### Lyric Alignment Assumptions

- Phase 1 stub does not yet emit `<lyric>` elements
- Lyric lines are stored per section in `CompiledLyrics.lines_by_section`
- Future: syllabic alignment (single, begin, end, middle) per `musicxml_constraints.lyric_syllabic_required`

### Harmony Expectations

- Chord symbols (e.g. C, Am, F, G) per measure
- `harmony_as_chord_symbols=True` in constraints
- Harmony stored as `{"symbol": str, "measure": int, "duration": int}`

### Unsupported or Failure-Prone Cases

- **Polyphonic parts** — stub assumes single melodic line
- **Tempo changes mid-song** — not yet supported
- **Key signature changes** — not yet supported
- **Compressed .mxl** — structure defined but write not implemented
- **Empty sections** — validator warns; stub may produce empty measures
- **Invalid title_placements** — section_id must exist in `section_order`; validation fails early

### Practical Examples

**Acceptable:**

- Song IR with `section_order=["verse","chorus"]`, `title_placements={"chorus":"first_line"}`
- Compiled song with melody events in each section
- Export stub producing `<?xml`, `<score-partwise>`, `<measure>`, `<note>`

**Unacceptable:**

- `title_placements={"chorus_1":"first_line"}` when `section_order` is `["verse","chorus"]` (no `chorus_1` in order)
- `section_order=["verse","verse"]` — missing chorus
- Empty `title` or `section_order`
- `musicxml_constraints.divisions=0` — invalid

---

## Running Tests

From `engines/songwriting_engine/runtime/`:

```bash
py -3 test_song_ir_schema.py
py -3 test_section_compiler.py
py -3 test_end_to_end_song_ir.py
py -3 test_song_ir_generator.py
py -3 test_qd_archive.py
py -3 test_finalist_selector.py
py -3 test_stage2_song_ir_flow.py
```

Or run all:

```bash
py -3 test_song_ir_schema.py; py -3 test_section_compiler.py; py -3 test_end_to_end_song_ir.py; py -3 test_song_ir_generator.py; py -3 test_qd_archive.py; py -3 test_finalist_selector.py; py -3 test_stage2_song_ir_flow.py; py -3 test_prechorus_compiler.py; py -3 test_bridge_compiler.py; py -3 test_final_chorus_compiler.py; py -3 test_outro_compiler.py; py -3 test_musicxml_exporter.py; py -3 test_stage3_full_song_compile.py; py -3 test_runtime_cutover.py; py -3 test_launcher_entry.py; py -3 test_stage4_end_to_end.py
```

---

## Quick Start

```python
from pathlib import Path
from songwriting_engine_runtime import run_songwriting_engine
from launcher_entry import run_launcher_generation, save_launcher_outputs

# Main path (default): title/premise/hook → MusicXML
result = run_songwriting_engine("River Road", mode="title", count=12, finalist_limit=5, seed=0)
for i, xml in enumerate(result["finalists_musicxml"]):
    if xml:
        Path(f"finalist_{i}.musicxml").write_text(xml, encoding="utf-8")

# Launcher path: run + save to outputs/songwriting_engine/
result = run_launcher_generation("River Road", mode="title")
folder = save_launcher_outputs(result)
print(f"Outputs: {folder}")
```

**Windows:** Double-click `launchers/songwriting_engine_launcher.bat` — outputs go to `outputs/songwriting_engine/run_*/`.

---

*Phase 1 + Stage 2 + Stage 3 + Stage 4 — Song IR Architecture. creative-engines.*
