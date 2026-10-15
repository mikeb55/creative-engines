# H6-A3 — Core triad-pair laboratory report

**Date:** 2026-10-15  
**Status:** Exploratory. No candidate is musically approved. H6-B is not started.

## Workspace

`#/hexatonic` still generates the existing scalar and WPS phrases. A section above those controls lists the 12 candidates. The H2 registry version stays `hexatonic-registry-h2.0`. Project files stay `hexatonic-project` version 1.

Each candidate is labelled **PROVISIONAL — NOT MUSICALLY APPROVED**.

The page shows both triads, the six-note union, the Forte class, common tones, interleaving, the number of other tertian splits, minimum voice-leading, the nearest existing catalogue ids, WPS ids on that nearest colour, a BHL note, provenance, the three transpositions with the most open-string pitch classes, inversions that `placeTriad` can put inside four frets, whether a dyad of that grip exists, and three computed bass pedals.

Human fields, all starting undecided: distinct, useful, guitar-playable, a short colour note, and KEEP / REFINE / REJECT. Nothing writes KEEP by itself. `artisticApproval` on the review file must stay false.

## The 12 candidates

All 12 unions are six notes, disjoint, and interleaving. They are 12 distinct transposition classes. Primary provenance is `computed`.

| Id | Pair | Forte | Voice-leading | Vault note |
| --- | --- | --- | --- | --- |
| `cm-dbm` | C minor / D♭ minor | 6-19 | 3 | Vol 15 chaos, unnamed, notation unverified |
| `cm-bd` | C minor / B diminished | 6-24 | 4 | none |
| `cM-bd` | C major / B diminished | 6-25 | 5 | none |
| `cM-ebd` | C major / E♭ diminished | 6-27 | 5 | none |
| `cm-bbd` | C minor / B♭ diminished | 6-27 | 5 | none |
| `cM-bbm` | C major / B♭ minor | 6-29 | 5 | none |
| `cm-fsm` | C minor / F♯ minor | 6-30 | 6 | none |
| `cm-dA` | C minor / D augmented | 6-31 | 4 | none |
| `cM-dA` | C major / D augmented | 6-34 | 5 | none |
| `cm-dbA` | C minor / D♭ augmented | 6-34 | 5 | none |
| `cM-ebm` | C major / E♭ minor | 6-49 | 4 | Vol 15 chaos, unnamed, notation unverified |
| `cM-fsm` | C major / F♯ minor | 6-50 | 5 | none |

`cM-ebd` and `cm-bbd` share Forte 6-27 and not a transposition class. `cM-dA` and `cm-dbA` share Forte 6-34 the same way. World F is named only as a different 6-30 construction. These rows are not Vault pairs and not BHL worlds.

## Persistence

Reviews use format `hexatonic-laboratory-review` version 1. Save and open go through the existing hexatonic project directory as `.hexatonic-lab.json`, with HTTP `/api/hexatonic/laboratory/save` and `/open`, and desktop IPC `composer-os-api:hexatonic-laboratory-save` and `-open`. A version-1 phrase project still rejects this format. The test saved a blank review, reopened it, stored REFINE on `cm-dbm`, and rejected `artisticApproval: true`.

The installed `/Applications/Composer OS Desktop.app` was not replaced.

## Audition MusicXML

`engines/composer-os-v2/core/hexatonic/examples/h6a-core/01-cm-dbm.musicxml` through `12-cM-fsm.musicxml`. The number keeps `cM` and `cm` apart on a case-insensitive disk. Standard notation, no TAB. Guitar states the two triads, then a shorter exchange, then one chord from the nearest existing catalogue entry. Bass holds the first triad’s root.

MuseScore 4 wrote `.tmp-hexatonic-h6a/cM-ebm-1.png`. That page shows the title, the provisional line, C major, E♭ minor, a two-chord bar, a contrast chord, and a held bass C. The provisional line sits close to the staff. That render is not musical acceptance. The other eleven files were exported by the same function and were not each opened in MuseScore in this session.

## Tests

| Test | Result |
| --- | --- |
| `hexatonicH6Laboratory.test.ts` | PASS |
| `hexatonicH6Catalogue.test.ts` | PASS |
| `hexatonicH1Regression.test.ts` | PASS |
| `hexatonicH2.test.ts` | PASS |
| `hexatonicProjectPersistence.test.ts` | PASS |
| `pentatonicCollectionIdentity.test.ts` | PASS |
| `apps/composer-os-app/tests/hexatonicPanel.test.ts` | PASS (7) |
| `apps/composer-os-app/tests/hexatonicProjectUi.test.ts` | PASS |

`bhlSourceLock` was already green on this branch before the laboratory files. BHL world ids and the 20 pentatonic colours are still asserted. No WWH leadsheet was written.

## Still waiting

All 12 candidates wait for a human KEEP, REFINE, or REJECT. Distinct definitive catalogue colours stay 11. Vol 14 pages 481–483 and Vol 15 pages 523–524 are still for a person to read. Research rubric thresholds were not used. No phrase algorithm was added.
