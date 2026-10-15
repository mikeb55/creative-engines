# H6-A1 — Repository reuse and mathematics audit

**Date:** 2026-10-15  
**Scope:** Composer OS hexatonic H6-A, checkpoint A1 only. No implementation in this commit.  
**Verdict:** Pass. Headline counts match an independent enumeration and the live registry. A2 may proceed. One non-blocking CSV defect is recorded in §5.

## 1. Repository position

| Item | Value |
| --- | --- |
| Branch | `main` |
| Local HEAD | `a7f7761d253b81592342bc6fb3ed294ff6eb5d53` |
| `origin/main` | same commit |
| Subject | `feat(evaluation): add human BMEF review and evidence reports` |
| Perplexity baseline | `7e992b7` — not current HEAD |

Unrelated dirty files were left untouched (BHL batch D edits, untracked tmp and reference-material trees). The Tonality Vault DOCX stays gitignored.

Research read locally, not copied into git:

| File | Path | Bytes |
| --- | --- | --- |
| Design brief (later copy) | `/Users/user/Downloads/Composer OS H6 — Hexatonic Research and Design Brief (1).md` | 46980 |
| Earlier brief | `/Users/user/Downloads/Composer OS H6 — Hexatonic Research and Design Brief.md` | 46808 |
| Vault overlap audit | `/Users/user/Downloads/H6 Vault–Core Overlap Audit.md` | 4399 |
| Hexachord CSV | `/Users/user/Downloads/H6 Hexachord Classes.csv` | 50 data rows |
| Triad-relation CSV | `/Users/user/Downloads/H6 Triad Relation Classes.csv` | 68 data rows |

The later brief is the one used. It adds the 15 October Vault text result. It does not change the counts.

H1–H5 docs in-repo: `docs/HEXATONIC_PHASE_H1.md`, `H2`, `H3`, `H4`, and `docs/HEXATONIC_GUIDE.md` (H5A release check, 2026-10-15). There is no `HEXATONIC_PHASE_H5.md`. H5B is not started. Vault study: `docs/WPS_TONALITY_VAULT_16_VOLUME_STUDY.md`. WPS audits: `docs/WPS_V1.3_ENGINE_CAPABILITY_AUDIT.md`, `docs/WPS_V1.5_CAPABILITY_GAP_AUDIT.md` (untracked, not used as a source of counts). Dashboard audit: `docs/EVALUATION_DASHBOARD_ARCHITECTURE_AUDIT_V1.0.md`.

## 2. Existing feature inventory

### Hexatonic (`engines/composer-os-v2/core/hexatonic/`)

Registry `hexatonic-registry-h2.0`. Phrases `hexatonic-phrase-h3.0`. Projects `hexatonic-project` version 1. `artisticApproval` is the constant `false`.

| Module | Exports used by H6-A |
| --- | --- |
| `collections.ts` | `HEXATONIC_REGISTRY_VERSION`, `HEXATONIC_CARDINALITY`, `HEXATONIC_REFUSED_IDS`, `listHexatonicScalars`, `getHexatonicScalar`, `transposeScalar`, `scalarTriadsAt`, `lydianFieldAt`, `rootSpelled` |
| `triadPairs.ts` | `HEXATONIC_WPS_FAMILY`, `listHexatonicWpsPairs`, `getHexatonicWpsPair`, `pairFromVaultRecord`, `transposeHexatonicWpsPair` |
| `catalogue.ts` | `listHexatonicCatalogue`, `getHexatonicCatalogueEntry` |
| `relations.ts` | pitch-class equality, transpose, intersect, `nearestTone`, `measureHexatonicDistance`, `exchangeTriads` (calls `analyzeTriadPair` and pentatonic `minimumAssignment`), `guitarSurface`, `melodicFragment`, symmetry landing |
| `phraseGeneration.ts` | `generateHexatonicPhrase`, `guitarFretSpan`, `outsideScalarId`, `transposedScalarOrder` — existing generator only |
| `phraseExport.ts` | `hexatonicPhraseToMusicXml`, `readHexatonicScore`, `hexatonicScoreMatchesPhrase` |
| `hexatonicProject.ts` | `captureHexatonicProject`, `validateHexatonicProject`, `hexatonicEventIdentity`. Version must be `1` |
| `hexatonicProjectFile.ts` / `hexatonicProjectIo.ts` | save and load under the hexatonic project directory |
| `evidence.ts` | fixture evidence. Not an approval |

Live catalogue, read from those functions on this HEAD: **11 scalars + 16 WPS pairs = 27 entries**. Ids are unchanged from `docs/HEXATONIC_GUIDE.md`. `hex_western_claim_not_ritsu` is pitch classes `0 1 3 5 8 10`. Refused ids include `ritsu_as_open_pentatonic` and `open_pentatonic`.

Lydian pitch classes are not a second World A table. `lydianFieldAt` calls `buildBhlWorldField('A', …)`.

### Pitch, triads, voice-leading, grips

| Path | What it already does | H6-A use |
| --- | --- | --- |
| `core/pentatonic/pitch.ts` | `mod12`, `canonicalPitchSet`, `parseNoteToken` | Reuse for every pitch-class set |
| `core/pentatonic/fieldDistance.ts` | `rotationNormalForm` (lexicographic transpose-to-zero), `minimumAssignment`, `pcDistance` | Reuse assignment and distance. Do not treat `rotationNormalForm` as a Forte prime. It does not minimise span first |
| `core/wwh/wps/wpsTonalityVaultRecord.ts` | 16 `WPS_VAULT_TONALITIES`, spelling, `transposeTriad`, `pitchClassOf` | Read-only. Context records stay here |
| `core/wwh/wwhTriadPair.ts` | `validateParentTriad`, `analyzeTriadPair`, `placeTriad`, `realizeTriadPair` | Reuse for common tones, voice-leading, fret placement |
| `core/tritonic/tritonicVoiceLeading.ts` | `pitchClassMovement`, best tritonic candidate | Leave in place. Hexatonic exchange already has its own assignment |
| `core/composer/voiceLeadingSolver.ts` | `solveVoiceLeading` over `VoicingCandidate` | Song/ensemble solver. Not a set-class tool. Do not wrap it for H6-A |
| `core/harmony/liquidHarmonyPlanner.ts` | hold-two, move-one against a triad | Existing liquid plan. H6-A does not add a new phrase algorithm |
| `core/practice-layer/practiceLayerBuilder.ts` | `buildPracticeLayerFromMusicContext` | Out of H6-A. Practice handover is H6.3 in the brief |
| `core/style-modules/triad-pairs/` | style-module apply/validate | Separate from the hexatonic registry. Do not retarget it |
| `core/harmony/tonalityVaultDatabase.ts` | quadratonic database | Out of scope. Do not seed pairs from it |
| `core/bhl/bhlWorlds.ts` | Worlds A–F | Read for the existing Lydian link. Do not edit |
| `core/export/musicxmlExporter.ts` | `exportScoreModelToMusicXml` | Audition export in A3 |
| App | `apps/composer-os-app/src/hexatonic/HexatonicEnginePage.tsx`, `hexatonicWorkspaceModel.ts`, `exportHexatonicMusicXml.ts` | Keep the current page. A3 adds a laboratory section beside it |
| Desktop | `apps/composer-os-desktop/electron/hexatonicDesktopExport.ts` | Existing export. Do not package or replace `/Applications/Composer OS Desktop.app` |

No module in the tree enumerates \(\binom{12}{6}\), Forte primes, or the 40-triad universe. That mathematics is the new A2 work. It must call `mod12` / `canonicalPitchSet` and the existing triad validators rather than a second pitch-class stack.

## 3. Duplication and reuse matrix

| Capability | Decision | Reason |
| --- | --- | --- |
| 11 scalar ids, spellings, symmetry periods | Reuse without change | H2 lock. Modes of one Tn class stay separate records |
| 16 WPS pairs, provenance, Harris labels | Reuse without change | Context records. Nine relation classes are a view, not a merge |
| BHL Worlds A–F | Reuse without change | `hex_lydian_triad_pair` already reads World A |
| 20 pentatonic colours | Reuse without change | `open_pentatonic` remains the five-note Ritsu object |
| `analyzeTriadPair` / `exchangeTriads` / `minimumAssignment` | Reuse without change | Common tones and minimum voice-leading |
| `placeTriad` / `guitarFretSpan` / `guitarSurface` | Reuse; A3 calls them | Grips and the six-note-is-not-a-chord rule |
| Spelling (`transposeSpelled`, `spellName`) | Reuse | Construction spelling, not set spelling |
| `rotationNormalForm` | Do not use as Forte prime | Lex form ≠ span-minimised normal form |
| `voiceLeadingSolver` | Do not adapt | Different input type and job |
| `generateHexatonicPhrase` | Do not extend | H6-A forbids new phrase algorithms |
| `TONALITY_VAULT_DATABASE` | Do not use | Study already shows it is not the 16-volume method |
| Six-note universe, Tn, TnI, interval vector, complement, triad-relation classes | New, inside `core/hexatonic/` | Absent. Keep it next to the registry so it cannot drift into a second engine |
| Collection / construction / context / rooted mode / alias | New view over existing ids | Does not rename H2 ids |
| 12 Core candidates | New provisional data in A3 | Not admitted. Not a registry version bump of `h2.0` |
| Human review of those 12 | New optional document beside project v1 | v1 validator rejects any version other than 1. Do not break that |
| Triadic Transformation Engine, Advanced tier, ALG-1–11 | Not in H6-A | Brief stages H6.2 and H6.3 |

## 4. Independent mathematical verification

Computed on this machine by exhaustive enumeration (Node), then checked against music21 8.3.0 for Forte class and interval vector. Not copied from the CSV.

| Claim | Result |
| --- | --- |
| 924 six-note pitch-class sets | 924 = \(\binom{12}{6}\) |
| 462 rooted six-note sets | 462 = \(\binom{11}{5}\) |
| 80 transposition classes | 80 |
| 50 transposition/inversion classes | 50 (left-packed and right-packed both yield 50) |
| 40 tertian triads | 12 major + 12 minor + 12 diminished + 4 augmented |
| 780 unordered pairs | \(\binom{40}{2} = 780\) |
| 68 transposition-equivalent triad relations | 68 |
| Of those, disjoint / one common tone / two common tones | 33 / 24 / 11 |
| Six-note Tn colours from the 33 disjoint relations | 26 |
| Catalogue coverage | 27 entries, **11** distinct Tn classes |
| WPS pairs disjoint and interleaved | 16 / 16 |
| WPS relation classes | 9. The four-member class is `maj7-sharp5`, `13-sharp11`, `minmaj9`, `7-sharp9-sharp5` |
| Z-related TnI groups (same interval vector, two classes) | 15 pairs |
| Transpositional symmetry greater than 1 | five Tn forms: periods matching 6-7, 6-30, 6-20, the 6-30 inverse orientation, and 6-35 |
| Western set `{0,1,3,5,8,10}` | Tn and TnI prime `0 2 4 5 7 9`, interval vector `143250`, music21 class **6-32** |
| Same Tn class as `hex_major_omit_seventh`, `hex_major_omit_fourth`, `hex_minor_primary`, WPS `min11`, WPS `maj9` | Yes. They remain six catalogue rows |
| None of the 12 Core relation classes is a WPS relation class | Confirmed by transposing every stored pair |

Burnside check in the brief: 20 inversion-symmetric TnI classes and 30 chiral pairs give \(20 + 2\times 30 = 80\) Tn classes. The enumeration count is 80, so that identity holds even though this audit did not re-derive the 20/30 split by hand beyond the class totals.

## 5. Discrepancies against the Perplexity materials

These do **not** block A2.

1. **CSV `prime_form` is not always the Forte prime.** Eleven rows store a set in the right class whose left-packed prime differs. music21 agrees with the left-packed prime, and the interval vector of the stored set matches the CSV. Examples: `6-32` is stored as `0 1 3 5 8 10`; the prime is `0 2 4 5 7 9`. Also `6-8`, `6-10`, `6-14`, `6-16`, `6-21`, `6-23`, `6-33`, `6-39`, `6-45`, `6-50`. A2 must store the prime, and may store the CSV set only as a representative.
2. **music21 prints `6-32` and `6-2A` / `6-10B`.** The letter is an orientation inside one Forte number. The CSV numbers `6-1` … `6-50` match music21 once `A`/`B` is removed. A2 should not persist the music21 suffix as a second class.
3. **Brief baseline `7e992b7`.** Current HEAD is `a7f7761`. H5A is already in `docs/HEXATONIC_GUIDE.md`. The catalogue facts the brief uses are still true on this HEAD.
4. **Brief “Core then holds 39 entries covering 23 colours”** is a proposal after admission. A3 must not admit the 12. Distinct colours available before admission stay **11**. Candidates awaiting a person stay **12**.
5. **Rubric weights and the ≥70 / ≥50 thresholds** are unvalidated, as the brief says. A3 must not apply them as gates.
6. **No `analyse*.py` scripts** were in the Downloads set. The CSVs and the brief were. Counts were recomputed here instead.

No headline count disagreed.

## 6. Tonality Vault provenance

DOCX SHA-256 `cf0ebf45a5219227d8dc48ae0e14b7b22ba1aeb82034a95ebc0fc3d49e4306f5` matches the study, the gitignored copy at `reference-materials/tonality-vault/COMPLETE TONALITY VAULT VOLS 1-16 - 2025.docx`, and the Downloads original. PDF companion: `/Users/user/Downloads/COMPLETE TONALITY VAULT VOLS 1-16 - 2025.pdf` (SHA-256 `92be3cc3f1fc6a74c838067b63d7084c748efef7817223f37368543ae222cf04`). `pdfinfo` is not installed. Page numbers below are the study’s PDF index, not a new transcription. Notation and TAB were not read. Sibelius was not opened.

The 16 named resolution/tension pairs are exactly `WPS_VAULT_TONALITIES`. None of the 12 Core candidates is one of those pairs, including under transposition.

`WPS_VAULT_TONALITIES` chaos fields:

- Volume 14 `13b9`: pitches `B C D F Ab`, triad text names F minor. Pages `478-483`.
- Volume 15 `min11`: pitches `B C# E F# G#`, triads E major and C♯ minor. Pages `520-524`.
- Other fourteen volumes: `chaos: null`.

Study page table for a later human look, graphics only:

| Volume | Chaos pages | What the text layer already records |
| --- | --- | --- |
| 14 C13♭9 | PDF **481–483** (layers span 478–483; triad-pair page 469) | F minor named in the leftover notes |
| 15 Cmin11(9) | PDF **523–524** (layers 520–524; triad-pair page 512) | Leftover set B, C♯, E, F♯, G♯; triads E major and C♯ minor |

Overlap audit, accepted as text-layer only:

- C major / E♭ minor is the Vol 15 chaos juxtaposition B♭ major + C♯ minor, transposed. Unnamed. Primary provenance **`computed`**. Secondary note only: `vault-implicit`, notation unverified.
- C minor / D♭ minor is C minor + C♯ minor in that same chapter. Same provenance rule.
- The other ten candidates are `computed` with no Vault note.

Do not label either implicit case as a Vault pair.

## 7. Architecture for A2 and A3

### A2 — catalogue mathematics

New files under `engines/composer-os-v2/core/hexatonic/`, re-exported from `index.ts` only as additions:

- `setClass.ts` — normal form (minimum span, then pack left), inversion, Forte prime, interval vector, Tn index, complement, T-symmetry. Pitch classes go through `canonicalPitchSet` / `mod12`.
- `tertianTriadUniverse.ts` — the 40 triads and the 68 relation classes, built with the same quality templates the vault record already uses (`major`, `minor`, `diminished`, `augmented`).
- `catalogueIdentity.ts` — derived views, not a replacement registry:
  - **Collection:** Tn normal form.
  - **Construction:** one unordered tertian split.
  - **Context:** existing WPS row or scalar id, ordered roles, provenance string already stored.
  - **Rooted mode:** collection plus a pitch class that the set contains.
  - **Alias:** name, provenance, status. `Ritsu` on the six-note set is `disputed`. The id `hex_western_claim_not_ritsu` stays. Traditional Ritsu stays `open_pentatonic`.

`HEXATONIC_REGISTRY_VERSION` stays `hexatonic-registry-h2.0`. No edit to `bhlWorlds.ts`, the pentatonic catalogues, or `WPS_VAULT_TONALITIES`.

Tests in `engines/composer-os-v2/tests/hexatonicH6Catalogue.test.ts` recompute 924 / 80 / 50 / 462, 40 / 780 / 68, 33 / 24 / 11, and 26; check all 12 transpositions of a non-symmetric set; check the western set as 6-32; check ambiguous spelling and the complement of 6-32; check that every current catalogue id still resolves.

### A3 — laboratory

- Data: `coreLaboratory.ts` with the 12 candidates, status `PROVISIONAL — NOT MUSICALLY APPROVED`, provenance from §6. No automatic KEEP.
- UI: a section on the existing `#/hexatonic` page. Current scalar / WPS / phrase controls stay.
- Analysis calls `analyzeTriadPair`, `exchangeTriads`, `placeTriad`, and the A2 classifiers. Comparison target is the existing catalogue entry with the largest pitch-class intersection.
- Audition MusicXML is written with `exportScoreModelToMusicXml` or `hexatonicPhraseToMusicXml`: notation only, two triads, a still or barely moving bass, a short contrast from an existing collection. No TAB. No new phrase algorithm. MuseScore headless render where the binary exists. Render is not acceptance.
- Persistence: a separate laboratory-review document saved through the existing hexatonic project directory and IPC/HTTP save path. `hexatonic-project` version 1 validation stays strict. Reviews are not written into v1 phrase files and are not BMEF scores.
- Guitar-friendly transpositions and bass-pedal contexts are computed (open-string pitch classes, `placeTriad`), then left for the person to mark YES / NO / UNDECIDED.

Not started: H6-B, H6-C, TTE, Advanced admission, ALG-1–11, Practice Studio UI, desktop packaging.

## 8. Regression tests that must stay green

Hexatonic, unchanged assertions:

- `engines/composer-os-v2/tests/hexatonicH1Regression.test.ts`
- `engines/composer-os-v2/tests/hexatonicH2.test.ts`
- `engines/composer-os-v2/tests/hexatonicH3.test.ts`
- `engines/composer-os-v2/tests/hexatonicProjectPersistence.test.ts`
- `apps/composer-os-app/tests/hexatonicPanel.test.ts`
- `apps/composer-os-app/tests/hexatonicProjectUi.test.ts`
- `apps/composer-os-desktop/tests/hexatonicDesktopExport.test.ts`

BHL and pentatonic suites already in the tree stay as they are, including `engines/composer-os-v2/tests/bhl/bhlSourceLock.test.ts` and the pentatonic collection-identity tests. WWH source-hash checks that already exist (`wwhSourceCompare`, performance-director tests that assert `SOURCE_HASH`) are not retargeted. Definitive WWH leadsheets are not edited. The nine album folders named in the WPS rule stay untouched.

`HEXATONIC_REGISTRY_VERSION`, the 11 ids, the 16 WPS ids, `HEXATONIC_PROJECT_VERSION === 1`, and `HEXATONIC_ARTISTIC_APPROVAL === false` are part of those tests.

## 9. Blockers

None that stop A2.

Design constraints A2 and A3 must keep:

- Forte primes come from the normal-form algorithm, not from the CSV representative column.
- Core candidates stay provisional.
- `computed` outranks the Vol 15 implicit note.
- Vol 14–15 notation graphics are still unread.
- Project v1 cannot gain a required field.
- New phrase algorithms are out of scope.
