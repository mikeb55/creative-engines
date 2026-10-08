# Pentatonic Options V2.2 — Dev 7 advisory UI cleanup

Practice screen only. Dev 6 still decides what to play and whether to move. Dev 7 measures and advises. No engine musical logic, registries, Phrase Engine, GCE, or MusicXML architecture changes. Dev 8 was not started.

## UI BEFORE

Header `V2.1.1`. Modes unchanged: Practice, Analyse, Auto Color, Motif, Phrase, Compare, Export.

Right column mixed practice with colour navigation:

- Outness select (Subtle, Moderate, Strong, Remote)
- Button labelled Distance, calling graded-out (`moveOut`) and replacing the stage headline
- Pivot link always clickable, with no target field
- Extract (advisory)
- Layered field, always available, with no duo gate
- Field browser and colour wheel

Footer: Analyse, Auto Color, Generate, Compare, Next Example, Export, MuseScore, Finder, Back, Favourite, practice sheet, Reset. Generate used the same button styling as the advisory actions. Open MusicXML stayed in Context.

Field distance was not its own readout. Graded-out, pivot, extract, and layered field wrote into the practice headline, so advice looked like a new example.

## UI CHANGES

Same window, colours, and navigation. Version line is `V2.2`.

- Field distance sits under Difficulty: target centre, target field, Measure, then current field / target / distance / shared notes. Extra numbers stay under More.
- Practice categories stay next. Colour analysis is a closed disclosure: Outness, Pivot link, Derive field, Duo analysis.
- Advisory buttons are Measure, Check, and Derive. They do not call Generate and they do not replace the practice example.
- Generate keeps the gold control. Auto Color keeps its name. When a different target field is chosen, Auto Color can show field distance to that alternative under the Dev 6 outcome.
- Compare still sends the last Dev 6 example only.

## FIELD DISTANCE

Visible on the practice column. Example reading for F minor pentatonic against B minor pentatonic:

```
CURRENT FIELD:
F minor pentatonic

TARGET:
B minor pentatonic

DISTANCE:
REMOTE

SHARED NOTES:
0
```

With no target, the line is `Choose a target field.`

## GRADED_OUT / OUTNESS

Label is Outness. Options stay Subtle, Moderate, Strong, Remote. The Check button writes `REMOTE candidates` (or the selected band) plus the current field and up to four fields that sit in that band. The text says the report wrote no phrase. Changing the select only updates the hint. It does not generate.

## PIVOT_LINK

Label is Pivot link. The button stays disabled until a target field is chosen. Empty state: `Choose a target field first`. The control does not pick the target. A check can show common tones, pivot note, moving notes, and landing. F minor pentatonic to B minor pentatonic returns `NO CREDIBLE PIVOT`.

## PARENT_EXTRACTION

Label is Derive field. Button is Derive. Heading is `POSSIBLE FIELDS`. Thin context shows `INSUFFICIENT_CONTEXT`. A collection with no convincing subset can show `NONE`. The wording stays advisory. It does not say the field was selected.

## LAYERED_FIELD

Heading is Duo analysis. The block stays hidden until bass notes, a guitar role, or an answer/support-bass category is set. A bass-lead reading looks like:

```
FIELD:
G minor pentatonic

GUITAR:
sparse upper subset

BASS:
active lower subset

ROLE:
bass leads / guitar responds
```

There is no Generate button for this block. `writesPhrase` is false.

## GENERATE OWNERSHIP

Generate calls `practiceApi.generate`, which is `generatePracticeExample` on the Dev 6 practice path. Outness, pivot, derive, duo, and field distance return cards with `writesPhrase: false` and do not enter session history.

Auto Color still calls `planPracticeAutoColor`. The headline is `AUTO COLOR:` plus the outcome. A chosen target that is not the same field can add `FIELD DISTANCE TO ALTERNATIVE`.

## COMPARE BEHAVIOUR

Compare still calls `comparePracticeExample` on the current Dev 6 example. Cap remains 3. Ranking remains plan, one alternative, silence. A remote-band report is not copied into the compare list.

## OPEN MUSICXML REGRESSION

The Open MusicXML button, `practiceApi` binding, dialog extensions, cancel, invalid file, and read-only load checks still pass. The packaged page does not redeclare `practice`. The running V2.2 window shows the Open MusicXML button. Assistive access was not available, so the native open panel was not clicked by hand in this pass. The dialog path is covered by `openMusicXmlFromDialog`.

## TEST RESULTS

- `engines/composer-os-v2/tests/pentatonicOptionsV2.test.ts` — 44/44, including A–H and export / next example
- `engines/composer-os-v2/tests/pentatonicDev71.test.ts` — 12/12
- Open MusicXML checks inside the options suite — PASS
- App build is esbuild (`npm run build` inside `package:mac`) — PASS
- This app has no Vite config. Composer OS Vite was not run. No production engine file changed.
- Packaged and installed `--self-test` — `SELF_TEST_OK`
- Dev 3.7 fingerprint unchanged: `cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6`

## APP BUILD

`npm run package:mac` in `apps/pentatonic-options-v2`.

Artifact: `apps/pentatonic-options-v2/dist/Pentatonic Options V2.app`

Package version `2.2.0`. Window title stays Pentatonic Options.

## DESKTOP INSTALL

Replaced `/Users/user/Desktop/Pentatonic Options.app`.

Left in place:

- `/Users/user/Desktop/Composer OS.app`
- `/Users/user/Documents/DEVS/Pentatonic-Options/ARCHIVE/Desktop/Pentatonic Options V1.app`

No second Pentatonic Options app was added to the Desktop.

Launched the installed app. Practice screen shows V2.2, context, difficulty, field distance (target centre, target field, Measure, “Choose a target field.”), practice categories, and Open MusicXML. Colour analysis stays in the disclosure under the categories.

## FINAL COMMIT

Subject: `Pentatonic Options V2.2: clarify Dev 7 advisory UI`

Hash: `2eae3f0b4dce819b37ce4e68da7dc4b03096d138`

## TAG RESULT

`pentatonic-options-v2.2-release` records this report and points at the commit after `2eae3f0b`.

Not moved:

- `pentatonic-options-v2.1.1-release`
- `pentatonic-dev7.1-release`
