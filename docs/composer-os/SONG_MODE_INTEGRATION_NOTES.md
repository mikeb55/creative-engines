# Song Mode integration (Prompt 3/7)

Brief audit of repo songwriting assets vs Composer OS Song Mode.

## Reused in spirit (TypeScript contracts only)

- **`engines/songwriting_bridge/lead_sheet_types.py`** — `LeadSheet`, `VocalMelody`, chord track, lyric placeholders, `SongFormSummary` → mirrored as `leadSheetContract.ts` (structural parity, no Python import).
- **`engines/songwriting_engine/runtime/compiled_song_types.py`** (if present) — concept of a compiled song bundle → `songCompilationTypes.ts` as the internal Composer OS shape.

## Adapted (not imported)

- Python runtime (`song_ir_generator`, `melody_generator`, etc.) — **not** called from Node; future adapter could serialize TS contracts to IR if needed.
- **`composer_studio`**, **`composition_evaluator`**, **`style_dna`** — not wired; reserved for later evaluation / style passes.

## Deliberately not imported yet

- Full **`songwriting_engine`** Python pipeline (launcher, IR validation, MusicXML exporter).
- **`songwriting_bridge`** runtime modules (DOCX, alignment adapters) — lead-sheet export remains a future step.
- Any UI or Electron bridge.

## Composer OS path

- **`runSongMode.ts`** builds structural `CompiledSong` + `LeadSheetContract` + validation inside the modular monolith.
- **`module-invocation`** registry exposes `song_mode_compile` as the static entry point for the scaffold pipeline.

## Prompt 3/7 (complete)

- Structural pipeline is **real** (hook metadata, section plans, chord scaffolds per role, compiled object, lead-sheet contract, validation).
- **No** Python import, **no** full lead-sheet MusicXML export, **no** lyric/melody generation yet.
- Manifest fields extended for hook id/summary, lead-sheet-ready flag, songwriting module ids.
