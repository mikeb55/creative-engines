# HANDOFF — auto-updated 2026-05-19

## SMOKE BASELINE
| Tier | Result |
|---|---|
| Full | 383 / 71 / 0 |
| Fast | 228 / 57 / 0 |
| Desktop | `desktop:rebuild-and-smoke` PASS — **v1.0.44** portable (`release/Composer-OS.exe`) |

## ANCHOR COMMIT
`d70b7958` — feat(pitch-field): Ligeti upgrade — texture fields, micropolyphony, pitch-field substrate, 34 tests

**Pitch-field Sessions 1–3 complete:** Ornette / Coltrane / Messiaen / **Ligeti** on `pitch-field-spine`. Ligeti: chromatic cluster band, texture fields (`textureDensity`, `canonOffsetRange`, `clusterWidth`, `motionBlur`, `entryStagger`), 8–32 bar regions, `scoreMicropolyphonyCoherence`. Registry **22** entries (4 pitch-field composers).

**Prior:** `914afde3` Session 2 (Coltrane + Messiaen) · `21499de4` Session 1 (Ornette spine).

## ROADMAP — ACTIVE
| # | Item | Status |
|---|---|---|
| 1 | Desktop rebundle (Session 4) | Next |
| 2 | Wyble duo parity | Backlog |
| 3 | ECM GCE orchestration | Backlog |

## FLAGS
| Flag | Value |
|---|---|
| `USE_PITCH_FIELD_NOTE_SELECTION` | `true` |
| Song-mode pitch-field guard | live |
| Messiaen mode picker | live (default M2) |
| Ligeti pitch-field substrate | live (`pitchFieldGoverned`) |

## PITCH-FIELD COMPOSERS (4)
`ornette_coleman` · `coltrane` · `messiaen` · `ligeti`

## VRB σ TABLE (22 SQ Harmonic Voice profiles)
| vrbId | σ |
|---|---|
| arvo_part | 16 |
| glass | 18 |
| satie | 19 |
| rota | 19 |
| ravel | 20 |
| debussy | 21 |
| morricone | 22 |
| messiaen | 22 |
| badalamenti | 21 |
| goldsmith | 24 |
| cole_porter | 25 |
| williams | 26 |
| zimmer | 26 |
| gershwin | 27 |
| shostakovich | 28 |
| bartok | 29 |
| joni_mitchell | 30 |
| coltrane | 31 |
| **ligeti** | **32** |
| ornette_coleman | 33 |
| herrmann | 36 |
| webern | 40 |

## NEXT SESSION ENTRY POINT
Session 4: desktop rebundle with pitch-field spine (v1.0.45+). All four pitch-field VRBs wired through line engine + harmony spine.
