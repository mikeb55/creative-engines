# Lead-sheet MusicXML import — Phase 1 update (2026-04-22)

## Compressed MuseScore `.mxl`

- Implemented at `engines/composer-os-v2/core/lead-sheet/musicXmlScoreInput.ts` using **`fflate`** (`unzipSync`).
- Reads `META-INF/container.xml`, resolves `<rootfile full-path="…">`, pulls the embedded `.musicxml` / `.xml` payload from the ZIP map (case/path tolerant).
- Surfaces explicit errors for empty archives, missing container, corrupt ZIP, or payloads that are not usable score XML.

## Importer + validation

- `leadSheetMusicXmlImport.ts` remains bounded to **`score-partwise`** lead-sheet semantics; **`score-timewise`** files are rejected with an explicit message (convert/export partwise in your notation tool).
- `LeadSheet` melody events record **`velocityMidi`** and **`articulationKind`** when present for downstream shaping.

## Imported performance shaping

- `leadSheetPerformanceRendering.ts` adjusts imported melody **durations** and **velocities** from dynamics / `<velocity>` / basic articulations before Song Mode adaptation.
- Blend is controlled by **`leadSheetPerformanceBlend`** on `GenerateRequest` (0–1). Omitted → **~0.55** (`DEFAULT_LEADSHEET_PERFORMANCE_BLEND`). Echoed in **`songModeLeadSheetPerformanceBlend`** when anchors apply.

## Song Mode wiring

- `songModeLeadSheetAdapter.adaptLeadSheetMusicXmlForSongMode` accepts **string XML** or **`Uint8Array`** (binary `.mxl`); the **web UI** unpacks `.mxl` client-side and still posts **plain score XML** in `songModeLeadSheetMusicXml`.
- Melody anchors may include per-bar **`velocityHint`**; `generateGoldenPathDuoScore` applies **light guitar velocity nudges** when Song Mode LeadSheet input is active.

## Tests + fixtures

- Unit tests: `leadSheetMusicXmlImport.test.ts`, `leadSheetPerformanceRendering.test.ts`.
- Integration smoke: `musicXmlMxlSampleFolder.test.ts` over committed **`Sample MIDI 2 Musicxml tracks/*.mxl`** (non-MusicXML siblings are skipped).

## Current limitations

- No **tempo map**, **ritardando / accelerando**, **fermata**, or **swing / rubato** reconstruction; timing beyond a single BPM hint is not preserved from the file.
