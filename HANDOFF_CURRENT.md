# HANDOFF — auto-updated 2026-05-19

## SMOKE BASELINE
| Tier | Result |
|---|---|
| Full | 383 / 71 / 0 |
| Fast | 228 / 57 / 0 |
| Desktop | `desktop:rebuild-and-smoke` PASS — **v1.0.44** portable (`release/Composer-OS.exe`) |

## ANCHOR COMMIT
`21499de4` — feat(pitch-field): spine core + Ornette VRB — pitch-field substrate, field scheduler, 30 tests

**Pitch-field Session 1:** parallel `PitchFieldSpine` + `resolveBarSymbol` optional `pitchField`; Ornette SQ profile (σ=33, `harmonicSubstrate: pitch-field-spine`); registry **20** entries; `free_jazz` family; `scorePitchFieldCoherence`.

**Prior desktop anchor:** `2e1adcf3` — feat(desktop): rebundle — tempo-adaptive swing curve ships in v1.0.44

## ROADMAP — ACTIVE
| # | Item | Status |
|---|---|---|
| 1 | Coltrane + Messiaen pitch-field profiles (Session 2) | Next |
| 2 | ContrapuntalLineEngine consumes `ResolvedPitchField` | Backlog |
| 3 | Wyble duo parity | Backlog |
| 4 | ECM GCE orchestration | Backlog |

## NEXT SESSION ENTRY POINT
Session 2: Coltrane + Messiaen SQ VRBs on `pitch-field-spine` / chord-spine opt-in via `harmonicSubstrate`. Ornette path live — `resolveBarSymbol(..., 'melody').pitchField` populated when `pitchFieldGoverned` or profile substrate set.

## VRB σ TABLE (20 SQ Harmonic Voice profiles)
| vrbId | σ |
|---|---|
| arvo_part | 16 |
| glass | 18 |
| satie | 19 |
| rota | 19 |
| ravel | 20 |
| debussy | 21 |
| morricone | 22 |
| badalamenti | 21 |
| goldsmith | 24 |
| cole_porter | 25 |
| williams | 26 |
| zimmer | 26 |
| gershwin | 27 |
| shostakovich | 28 |
| bartok | 29 |
| joni_mitchell | 30 |
| ligeti | 32 |
| **ornette_coleman** | **33** |
| herrmann | 36 |
| webern | 40 |

Registry: `sqVrbProfileRegistry.ts` — `ornette_coleman` → `ORNETTE_SQ_VRB_PROFILE`.
