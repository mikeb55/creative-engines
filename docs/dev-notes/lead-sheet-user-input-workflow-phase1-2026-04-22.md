# LeadSheet user input workflow - Phase 1 (Song Mode UI slice)

Date: 2026-04-22  
Status: implemented (bounded vertical slice)

## Goal

Create the smallest user-facing end-to-end path for supplying LeadSheet MusicXML in Composer OS without expanding musical scope.

## Scope (implemented)

- UI entry in `Generate` for LeadSheet MusicXML input.
- Route is strictly bounded to existing Phase 1 Song Mode support:
  - `presetId = song_mode`
  - primary songwriter `donald_fagen` or `barry_harris`
- Request plumbing uses existing field: `songModeLeadSheetMusicXml`.
- No new writer support, no new mode support, and no new musical behavior.

## Smallest insertion points (discovery outcome)

- Generation form / controls: `apps/composer-os-app/src/pages/HomeGenerate.tsx`
- Preset/style/songwriter selection: `apps/composer-os-app/src/pages/HomeGenerate.tsx`
- Request assembly and submission to `GenerateRequest`: `apps/composer-os-app/src/pages/HomeGenerate.tsx` -> `api.generate(...)`
- API bridge transport: `apps/composer-os-app/src/services/api.ts` (`post('/generate', body)`)
- Shared core field mapper used by generate form: `apps/composer-os-app/src/utils/buildGenerateRequestBody.ts`
- Existing app UI tests near this surface: `apps/composer-os-app/tests/homeGenerateUi.test.ts`

## UX choice

Chosen UX: **file picker + textarea** in the Song Mode block.

Why this is the smallest useful slice:

- Textarea alone supports quick paste from MusicXML editors.
- File picker avoids copy/paste friction and still reuses the same request flow.
- Both controls map into one state string and one existing request field.
- No redesign or new panels required.

## Behavior

- Control label: `LeadSheet MusicXML input (Phase 1)`.
- Active only when Song Mode songwriter is Donald Fagen or Barry Harris.
- Unsupported Song Mode songwriter routes show explicit "input ignored" messaging.
- Empty input does nothing.
- Basic preflight validation checks for `<score-partwise>` root before submit.
- Backend import errors are surfaced with a LeadSheet-specific error prefix.

## Deferred (explicitly unchanged in this slice)

- Big Band LeadSheet UI
- ECM LeadSheet UI
- Other Song Mode writers
- Universal import controls across all modes
- Any new importer/adapter musical logic
