# H6-A2 — Mathematical catalogue report

**Date:** 2026-10-15  
**Status:** Catalogue mathematics only. No phrase algorithm. No Core admission. Not artistic approval.

## What was added

| File | Role |
| --- | --- |
| `engines/composer-os-v2/core/hexatonic/setClass.ts` | Normal form, prime form, Forte label, interval vector, T/I symmetry, complement, rooted modes, hexachord census |
| `engines/composer-os-v2/core/hexatonic/tertianTriadUniverse.ts` | 40 tertian triads, 68 relation classes, common tones, interleave, minimum voice-leading, disjoint splits |
| `engines/composer-os-v2/core/hexatonic/catalogueIdentity.ts` | Collection, construction, context, and alias views over the existing registry |
| `engines/composer-os-v2/tests/hexatonicH6Catalogue.test.ts` | Independent enumeration through those functions |

Pitch classes go through `canonicalPitchSet` and `mod12`. Voice-leading uses `minimumAssignment`. Spellings use `parseNoteList` and `sharpName`. Triad quality names are the vault quality union. The H2 functions `listHexatonicScalars` and `listHexatonicWpsPairs` are read, not rewritten.

`HEXATONIC_REGISTRY_VERSION` remains `hexatonic-registry-h2.0`.

## Identity model

- **Collection** — transposition normal form. The live catalogue has 11 of these across 27 entries.
- **Construction** — one unordered tertian pair, up to transposition. Several WPS ids can share one. `maj7-sharp5`, `13-sharp11`, `minmaj9`, and `7-sharp9-sharp5` do.
- **Context** — the existing scalar or WPS id, with its provenance and ordered roles.
- **Rooted mode** — one distinct interval row from a pitch class inside the set. Whole tone has one. The augmented collection has two. The western six-note claim has six.
- **Alias** — name, provenance, status. `Ritsu` on this six-note set is `disputed`. It is not an established name. Traditional five-note Ritsu stays `open_pentatonic`.

## Counts the test recomputes

| Object | Count |
| --- | --- |
| Six-note pitch-class sets | 924 |
| Rooted sets containing 0 | 462 |
| Transposition classes | 80 |
| Transposition/inversion classes | 50 |
| Tertian triads | 40 |
| Unordered pairs | 780 |
| Relation classes | 68 |
| Disjoint / one common tone / two common tones | 33 / 24 / 11 |
| Disjoint-union transposition classes | 26 |
| Catalogue transposition classes | 11 |
| Catalogue contexts | 27 |

C–D♭–E♭–F–A♭–B♭ is Forte **6-32**, prime `0 2 4 5 7 9`, interval vector `143250`, self-complementary. The stored id remains `hex_western_claim_not_ritsu`. Flat and sharp spellings of that set share one normal form. A doubled enharmonic collapses.

Twelve transpositions of `{0,1,2,3,4,6}` stay one class and twelve distinct sets. `6-3` records Z-partner `6-36`. `6-35` has transposition symmetry 6. `6-20` has symmetry 3 and is inversionally symmetric.

Forte numbers are the 50 left-packed primes checked against music21 8.3.0. The H6 CSV `prime_form` column is not stored. Eleven of those cells are modes, not primes. See `docs/H6-A1-REPOSITORY-REUSE-AND-MATHEMATICS-AUDIT.md`.

## Tests

| Test | Result |
| --- | --- |
| `hexatonicH6Catalogue.test.ts` | PASS |
| `hexatonicH1Regression.test.ts` | PASS |
| `hexatonicH2.test.ts` | PASS |
| `hexatonicH3.test.ts` | PASS |
| `hexatonicProjectPersistence.test.ts` | PASS |
| `pentatonicCollectionIdentity.test.ts` | PASS. Colour count 20 |
| `bhl/bhlSourceLock.test.ts` | PASS. Source SHA-256 `01383c35b0eddc74442ba056cec297e36c045e130f6990865732fcac3aafcb48` unchanged |

BHL world ids remain A–F. No WWH leadsheet was written.

## Limitations

- Forte numbers are a checked table. The prime form itself is computed.
- An augmented triad stores one of its three possible roots on the universe list. A construction built from a vault triad uses that triad’s printed root.
- Sus and quartal trichords are not in this universe.
- No listening, no MusicXML audition, no admission of the 12 Core candidates.
- Rubric thresholds from the research brief are not applied.
