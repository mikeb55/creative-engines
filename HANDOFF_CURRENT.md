# HANDOFF — auto-updated 2026-05-19

## SMOKE BASELINE
| Tier | Result |
|---|---|
| Full | 383 / 71 / 0 |
| Fast | 228 / 57 / 0 |
| Desktop | `desktop:rebuild-and-smoke` PASS — **v1.0.44** portable (`release/Composer-OS.exe`) |

## ANCHOR COMMIT
`914afde3` — feat(pitch-field): Coltrane + Messiaen VRBs, line engine wiring, song-mode guard, Messiaen mode picker, 40 tests

**Pitch-field Session 2:** `coltrane` + `messiaen` SQ VRBs on `pitch-field-spine`; `ContrapuntalLineEngine` draws note PCs from `pitchField.allowedPcs` when `USE_PITCH_FIELD_NOTE_SELECTION`; `shouldUsePitchFieldSubstrate` song-mode guard; Messiaen M1–M7 mode picker → `messiaenModeId` on `GenerateRequest`; registry **22** entries; `modal_contemporary` family.

**Session 1 anchor:** `21499de4` — Ornette pitch-field spine + `resolveBarSymbol` optional `pitchField`.

## ROADMAP — ACTIVE
| # | Item | Status |
|---|---|---|
| 1 | Ligeti pitch-field upgrade (Session 3) | Next |
| 2 | Wyble duo parity | Backlog |
| 3 | ECM GCE orchestration | Backlog |

## FLAGS
| Flag | Value |
|---|---|
| `USE_PITCH_FIELD_NOTE_SELECTION` | `true` (`engineFeatureFlags.ts`) |
| Song-mode pitch-field guard | live (`shouldUsePitchFieldSubstrate`) |
| Messiaen mode picker | live (UI + `messiaenModeId` default **2**) |

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
| **messiaen** | **22** |
| badalamenti | 21 |
| goldsmith | 24 |
| cole_porter | 25 |
| williams | 26 |
| zimmer | 26 |
| gershwin | 27 |
| shostakovich | 28 |
| bartok | 29 |
| joni_mitchell | 30 |
| **coltrane** | **31** |
| ligeti | 32 |
| **ornette_coleman** | **33** |
| herrmann | 36 |
| webern | 40 |

Registry: `sqVrbProfileRegistry.ts` — 22 entries including `coltrane`, `messiaen`, `ornette_coleman`.

## NEXT SESSION ENTRY POINT
Session 3: Ligeti upgrade on `pitch-field-spine` (σ=32, micropolyphony region scheduler). Line engine pitch pool path live for Ornette / Coltrane / Messiaen when `instrumental` + `pitchFieldGoverned`.
