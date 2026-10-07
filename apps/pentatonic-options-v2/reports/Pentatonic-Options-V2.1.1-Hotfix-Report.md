# Pentatonic Options V2.1.1 — Open MusicXML hotfix

## ROOT CAUSE

`contextBridge.exposeInMainWorld('practice', api)` installs a page-global binding named `practice`. `ui/app.js` then started with `const practice = window.practice`. In the packaged app that is a parse error: `SyntaxError: Identifier 'practice' has already been declared`. The script never ran, so the Open MusicXML click listener was never attached. The button did nothing. The main-process handler `practice:analyseScore` was already present and, when called directly, opened the native file panel.

Reproduced on `/Users/user/Desktop/Pentatonic Options.app` before the fix: DevTools showed the syntax error, `#modes` stayed empty, and `window.practice.analyseScore` still existed on the bridge.

## FILES CHANGED

- `apps/pentatonic-options-v2/ui/app.js` — page binding renamed to `practiceApi` so the script loads. Open MusicXML shows a load error without clearing the current score. Cancel still returns early.
- `apps/pentatonic-options-v2/electron/main.ts` — Open MusicXML uses the focused window and `openMusicXmlFromDialog`.
- `apps/pentatonic-options-v2/src/openMusicXml.ts` — dialog options and file read. Bytes go through `extractScoreMusicXmlFromUint8Array`, then `analyseScoreXml`. The source file is only read.
- `apps/pentatonic-options-v2/scripts/package-mac.mjs` — copy keeps relative framework symlinks. An absolute copy pointed the bundle at the build folder and the helpers could not find ICU data.
- `apps/pentatonic-options-v2/ui/index.html` — subtitle `V2.1.1`.
- `apps/pentatonic-options-v2/package.json` — version `2.1.1`.
- `engines/composer-os-v2/tests/pentatonicOptionsV2.test.ts` — Open MusicXML regression.
- `docs/CHANGELOG.md` — V2.1.1 note.

No pentatonic engine scoring, path, or Dev 7 navigation code was edited.

## OPEN MUSICXML FLOW

1. Click `#open-score`.
2. `practiceApi.analyseScore()` invokes `practice:analyseScore`.
3. `dialog.showOpenDialog` on the focused window. Extensions: `musicxml`, `xml`, `mxl`.
4. Cancel returns `null`. The page returns and leaves the score line and analysis alone.
5. A chosen path is read as bytes. `extractScoreMusicXmlFromUint8Array` accepts plain MusicXML or a compressed `.mxl`. `analyseScoreXml` is the existing score analysis.
6. The page shows the file name, path, and `read-only`, plus the song title and score map.
7. A bad file returns `{ ok: false, error }` and the page writes that message. The previous score stays loaded.
8. The file hash is checked before and after the read. The app does not write the source.

## AUTOMATED TESTS

Pentatonic Options V2 suite: 35/35 PASS, including:

- Open MusicXML control exists and does not redeclare `practice`
- dialog extensions `musicxml`, `xml`, `mxl`
- selected path reaches `analyseScoreXml` and updates the score result
- compressed `.mxl` through the existing intake
- cancel returns null
- invalid file returns a controlled error
- source bytes unchanged
- Dev 3.7 fingerprint `cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6`
- desktop bundle `--self-test` `SELF_TEST_OK HOME_CONTINUITY CELL_LINEAGE C4 F4 G4`

Fixture for the load tests: generated practice MusicXML and a zip of that XML. Not a While We're Here score.

## PACKAGED APP MANUAL TEST

Built `apps/pentatonic-options-v2/dist/Pentatonic Options V2.app`, then installed `/Users/user/Desktop/Pentatonic Options.app`.

- Bundle script loads. Header reads `V2.1.1`. Mode buttons render. Field menu has 20 entries. No syntax error.
- Click Open MusicXML. The macOS open panel appears in front of the app (Documents, Cancel, Open).
- Choosing a file inside that panel was not completed from this session. macOS rejected synthetic keystrokes to the panel.
- Valid load, cancel, invalid file, and unchanged source were run through `openMusicXmlFromDialog` / `loadMusicXmlFile`, which is the function the packaged button calls. Dialog is the only mock.
- Installed app `--self-test` PASS. The installed process stayed running. Finder name stays one Desktop app: `Pentatonic Options.app`.
- V1 archive `/Users/user/Documents/DEVS/Pentatonic-Options/ARCHIVE/Desktop/Pentatonic Options V1.app` was not replaced.

## REGRESSION MATRIX

- Dev 3.7 `pentatonicDev37.test.ts`: PASS. Fingerprint `cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6`
- Dev 4 / 4B / 4C: PASS
- Dev 5A 9/9, Dev 5B 17/17, Dev 5B.1 13/13, Dev 5C 8/8: PASS
- Dev 6A 14/14, Dev 6B 17/17, Dev 6C 4/4: PASS
- Dev 7 16/16: PASS
- Spelling and rhythm: PASS
- Options suite 35/35: PASS
- Panel Vitest `apps/composer-os-app/tests/pentatonicPanel.test.ts`: 14/14 PASS
- Composer OS app Vite build: PASS
- Installed app self-test: PASS
- MusicXML runners on this working tree, and again on a clean worktree of `d20f08e1`: `export` 22/24, `leadSheetMusicXmlImport` 5/6, `.mxl` sample 4/4. The same three checks fail on Dev 7 HEAD before this hotfix: plain-major kind text, phase 18.2A polyphony diagnostic, and one lead-sheet parse. They are not caused by this change. Uncommitted exporter edits in the working tree were left untouched.

## FINAL COMMIT

Subject: `Pentatonic Options V2.1.1: fix Open MusicXML`

Hash: filled after commit in the push step.

## PUSH RESULT

main push. Local HEAD must equal origin/main.

## TAG RESULT

`pentatonic-options-v2.1.1-release` created on this hotfix and pushed.

Not moved:

- `pentatonic-options-v2.1-release` → `3550a7eaba25153b83246aef7968e1ceefc02f94`
- `pentatonic-dev7-release` → `d20f08e17488d07393ba345e8e90285f82cf6129`

## DEV 8 CONTINUITY

Dev 8 had not been committed. Local HEAD before this hotfix was `d20f08e1` (`pentatonic-dev7-release`), matching `origin/main`. No Dev 8 files were in the commit. Uncommitted composition and exporter work was left in the working tree. Dev 8 should start from the new V2.1.1 HEAD. This hotfix does not implement Dev 8.
