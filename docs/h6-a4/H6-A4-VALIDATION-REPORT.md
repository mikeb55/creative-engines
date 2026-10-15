# H6-A4 — validation report

**Date:** 2026-10-15  
**Verdict:** PASS  
**Scope:** musical audition pack only. H6-B was not started. No candidate was admitted.

## 1. Baseline

- Repository: `/Users/user/Documents/DEVS/creative-engines`
- Branch: `main`
- Starting HEAD and `origin/main`: `e64bfdc1c20622af9625b321ab5d136d8553c7a0`
- All 12 provisional Core candidates are present in `CORE_CANDIDATES`.
- Status remains `PROVISIONAL — NOT MUSICALLY APPROVED`. Provenance remains `computed`.
- Hexatonic H2, WPS, BHL, and Pentatonic registries were not rewritten.
- WWH / BHL source-score lock was re-run. The source hash stayed `01383c35b0eddc74442ba056cec297e36c045e130f6990865732fcac3aafcb48`.
- Unrelated local changes were left unstaged.

## 2. MusicXML

24 files parsed as well-formed XML:

- 12 short laboratory examples in `engines/composer-os-v2/core/hexatonic/examples/h6a-core/`
- 12 audition scores in `docs/h6-a4/musicxml/`

No TAB. No `artisticApproval`.

## 3. Renders inspected

MuseScore 4 wrote the pages. A process exit code was not treated as proof. The PNG and PDF pages were opened and read.

| Set | Pages | Visual check |
| --- | --- | --- |
| Short examples | 12, one page each | All 12 previews in `docs/h6-a4/previews/examples/` |
| Audition book | 25 | All 12 music pages, the cover, and identity pages for candidates 1 and 11 |

The other ten identity pages use the same text layout and the same decision blanks. They were assembled from `booklet.json` and rasterized as `docs/h6-a4/previews/book/page-04.jpg` through `page-24.jpg` on the even pages.

Each short example shows both triads, a short exchange, a contrast chord, and a sustained bass note. Titles fit. `CONTRAST` sits above the last chord and does not clip.

Each audition music page shows close triads, inversions, a spread voicing, an exchange, dyads, two bass pedals, a same-rhythm nearest-collection comparison, and blank decision bars. `Triad 1 close` sits between the staves, above a bass rest. Spread voicings are tight. No notehead collision required a rewrite.

Music was not heard and was not played.

## 4. Audition book

`/Users/user/Documents/DEVS/creative-engines/docs/h6-a4/H6-CORE-12-AUDITION-BOOK.pdf`

25 pages. About 576 KB. Cover states that none of the twelve pairs is admitted and that the printed difference is a pitch-class difference.

## 5. Tonality Vault

Private PDF read, not copied into the repo:

`/Users/user/Downloads/COMPLETE TONALITY VAULT VOLS 1-16 - 2025.pdf`  
SHA-256 `92be3cc3f1fc6a74c838067b63d7084c748efef7817223f37368543ae222cf04`  
567 pages. Page numbers match the H6-A1 index.

Pages 481–483 and 523–524 do not print C major / Eb minor or C minor / Db minor. Volume 15 names E major and C# minor inside a five-note chaos set. Volume 14 names F minor inside a five-note chaos set. The other ten candidates are not named. Detail: `docs/h6-a4/H6-A4-TONALITY-VAULT-NOTATION-AUDIT.md`.

Page 525 was opened only because page 524 says the examples follow. It does not print either pair. It is not part of the requested range and was not copied.

## 6. GUI

Hexatonic Core Laboratory at `http://127.0.0.1:5173/#/hexatonic`, API on port 3011. The installed application in `/Applications` was not replaced.

Checked on a fresh page load:

- Any of the 12 candidates can be selected.
- Nearest existing collection is shown, with the pitch-class difference and no claimed audible difference.
- Component triads are in the audition MusicXML.
- KEEP / REFINE / REJECT and comments can be saved.
- A new browser tab, Open review, then selecting `cM-ebm` restored Distinct YES, Decision REFINE, and the comment `H6-A4 persistence check only. Not a musical decision.`
- `cm-dbm` stayed UNDECIDED.
- The check file was deleted afterwards. It is not a musical decision.

`artisticApproval` stayed false.

## 7. Corrections

- Short scores: the staff direction `PROVISIONAL — NOT MUSICALLY APPROVED` collided with the tempo. It was removed from the staff. The status stays in the laboratory heading and on the book text pages. The contrast label was shortened to `CONTRAST` so it no longer clips. Titles are `{pair} provisional`.
- Audition book: no credit block. `Triad 1 close` is placed below the staff. Candidate spellings are kept when the nearest collection uses another spelling. Identity pages map em dashes to ASCII so Helvetica does not print them as question marks.
- `cm-dbm` and `cM-ebm` vault notes now record the notation check. Provenance stays `computed`.
- The laboratory shows the nearest collection beside the candidate.

## 8. Candidates

All 12 remain provisional. None is KEEP, none is admitted, and none has musical approval.

## 9. Regression

Run on 2026-10-15 after the audition pack was written:

- `hexatonicH6Laboratory.test.ts` PASS
- `hexatonicH6Catalogue.test.ts` PASS
- `hexatonicH1Regression.test.ts` PASS
- `hexatonicH2.test.ts` PASS
- `hexatonicProjectPersistence.test.ts` PASS
- `pentatonicCollectionIdentity.test.ts` PASS
- `bhlSourceLock.test.ts` ALL BHL SOURCE LOCK CHECKS PASS
- `apps/composer-os-app` vitest: `hexatonicPanel.test.ts` 7 passed, `hexatonicProjectUi.test.ts` 1 passed

The full smoke tier was not re-run. These are the suites that cover the laboratory, the existing hexatonic registries, pentatonic identity, project persistence, and the WWH source lock.
