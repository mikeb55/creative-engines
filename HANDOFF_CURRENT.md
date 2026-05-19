# HANDOFF — auto-updated 2026-05-19

## SMOKE BASELINE
| Tier | Result |
|---|---|
| Full | 379 / 71 / 0 |
| Fast | 224 / 57 / 0 |
| Desktop | `desktop:rebuild-and-smoke` PASS (v1.0.43 portable) |

## ANCHOR COMMIT
`d196a6a1` — feat(swing): Porter vs Gershwin fine-grain — intensity 0.52 vs 0.65, gap 0.13

**Also on `main` (pushed):**
- `3d1c7757` — feat(desktop): rebundle engine changes + fix Python sidecar paths
- `ca746798` — feat(ui): composer + gate tooltips — descriptions, family tags, σ values, 15 tests
- `39b5d597` — feat(vrb): boundary swing ramp — same-family VRB transitions over transitionBars
- `c645b09a` — feat(vrb): 3-way VRB blend — typed policy composition, hybrid static/dynamic, 32 tests

## ROADMAP (remaining)
| # | Item | Status |
|---|---|---|
| 1 | sq_swing rhythm engine | pending |
| 2 | Wyble duo parity + BB Light Touch | pending |
| 3 | ECM GCE orchestration | pending |
| 4 | Melody V2 + cadenza | pending |
| 5 | MIDI import | pending |
| 6 | Porter vs Gershwin fine-grain | ✓ (swing 0.52 vs 0.65) |
| 7 | Tempo-adaptive swing curve | pending |
| 8 | 3-way VRB blend (within-section) | ✓ (`c645b09a`) |
| 9 | UI tooltips | ✓ (`ca746798`) |
| 10 | Desktop rebuild | ✓ (`3d1c7757`) |
| — | Boundary swing ramp (same-family joins) | ✓ (`39b5d597`) |
| — | Per-section VRB assignment | ✓ (V59) |

**Deferred:** Ornette

## NEXT SESSION ENTRY POINT
**Tempo-adaptive swing curve (#7)** — extend `sqSwingRhythmEngine.ts` so Porter/Gershwin gap (≥ 0.10) holds across BPM; wire presets from `sqSwingRhythm.ts` without changing turtle_island 0.80.

## VRB σ TABLE
All 19 SQ Harmonic Voice profiles (`sqVrbProfileRegistry.ts`) — σ = `registerCohesionStdevCeilingSt`:

| vrbId | σ |
|-------|---|
| arvo_part | 16 |
| glass | 18 |
| satie | 19 |
| rota | 19 |
| ravel | 20 |
| badalamenti | 21 |
| debussy | 21 |
| morricone | 22 |
| joni_mitchell | 23 |
| goldsmith | 24 |
| cole_porter | 25 |
| williams | 26 |
| zimmer | 26 |
| gershwin | 27 |
| shostakovich | 28 |
| bartok | 29 |
| ligeti | 32 |
| herrmann | 36 |
| webern | 40 |

Profile σ ceilings unchanged by tooltip/ramp commits; table reflects live registry.
