# Perplexity Test 23 April 2026.musicxml — `lock_harmony` → `musicxml_parse_failed` (investigation)

Song Mode, Wayne Shorter, `importHarmonyMode: 'lock_harmony'`. Runtime probe (same engine code as tests):

- `extractScoreMusicXmlFromString`: **ok**
- `importLeadSheetFromMusicXml`: **`ok: true`**, `chordEvents.length === 0`, `importedHarmonyTimeline.events.length === 0`, melody events present on first part
- `adaptLeadSheetMusicXmlForSongMode`: **`ok: false`**, error: `Song Mode LeadSheet adapter: no chord events available`

Importer warnings include: `Ignored extra parts/staves; imported first-part lead line only.` and `No harmony annotations found; imported melody-only LeadSheet.`

## Root cause (structural)

`importLeadSheetFromMusicXml` only scans the **first** `<part>...</part>` in the document (non-greedy match in `leadSheetMusicXmlImport.ts`). In this Sibelius export:

- **P1** (`L1: Lead Piano`): melody only — **no** `<harmony>` in that part’s measures.
- **P2** (`H: Piano`): chord staff — **all** `<harmony>` blocks live here.

So the score **does** contain `<harmony>` globally, but the Phase 1 importer **never sees them**; it still returns `ok: true` with an empty `chordEvents` array. `adaptLeadSheetForSongMode` then rejects the lead sheet because it requires `chordEvents.length > 0`.

`extractLockedHarmonyBarsFromImportedTimeline` is **never reached** for this fixture: `runSongStructure` gates it on `leadSheetAdapted?.ok && leadSheetAdapted.leadSheet`, which fails first.

## Wayne Shorter / `shouldParseLeadSheetInput`

In `composerOsAppGeneration.ts` → `runSongStructure`:

```ts
shouldParseLeadSheetInput =
  leadSheetXmlInput.length > 0 && (isLeadSheetPhase1WriterRoute || lockHarmonyRequested);
```

Phase 1 writers: `donald_fagen`, `barry_harris` only. **Wayne Shorter** is not phase 1.

| Mode            | `lockHarmonyRequested` | Full `adaptLeadSheetMusicXmlForSongMode` on XML? |
|-----------------|------------------------|--------------------------------------------------|
| omitted / default | no                   | **No** (unless phase-1 writer)                   |
| `free_harmony`  | no                     | **No** for Wayne Shorter                         |
| `blend_harmony` | no (`lockHarmonyRequested` is only `lock_harmony`) | **No** for Wayne Shorter |
| `lock_harmony`  | yes                    | **Yes** → hits empty chord events → `!leadSheetAdapted.ok` |

Omitted / free / blend do not hit this path for Wayne + XML, so they never run the adapter failure; generation uses built-in harmony paths and identical `result.xml` is expected when the lead sheet is not applied for harmony.

## What `musicxml_parse_failed` means here

In `runSongStructure`, **`musicxml_parse_failed` is assigned whenever `!leadSheetAdapted?.ok`**, not only when the XML DOM parse throws. That bucket includes:

- extract / unpack failure,
- `importLeadSheetFromMusicXml` returning `ok: false`,
- **`adaptLeadSheetForSongMode` returning `ok: false`** (e.g. **no chord events** after import).

For this file, the failure is **the third case**: import succeeded; adapter rejected **melody-only** first-part lead sheet.

## Future telemetry (proposal only — no code change)

Split manifest reasons or add a parallel diagnostic string so operators can tell:

1. **`lead_sheet_extract_failed`** — `extractScoreMusicXmlFrom*` not ok.
2. **`lead_sheet_import_failed`** — `importLeadSheetFromMusicXml` `ok: false`.
3. **`lead_sheet_no_chord_events`** — import `ok: true` but `chordEvents.length === 0` (includes “harmony on non-first part” and “harmony present but `parseHarmonySymbol` returned null for every block”).
4. Keep existing **`timeline_*`** reasons for `extractLockedHarmonyBarsFromImportedTimeline` when adapt succeeded.

## Classification

**This fixture fails earlier than timeline lock due to a structural limitation in our MusicXML handling (first-part-only harmony scan); we need a design decision before changing behavior** — e.g. merge harmony from all parts, pick a score-instrument, or document that lock requires harmony in the same part as the imported melody.

Suggested next stage: **Stage 3b-telemetry**: refine `importHarmonyLockFallbackReason` (or add a non-breaking `importHarmonyLockFailureDetail` field) to distinguish true import errors from “no chord events / wrong part,” still without changing lock routing until product scope is clear.
