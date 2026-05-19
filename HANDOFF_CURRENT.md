# HANDOFF — auto-updated 2026-05-19

## SMOKE BASELINE
| Tier | Result |
|---|---|
| Full | 383 / 71 / 0 |
| Fast | 228 / 57 / 0 |
| Desktop | `desktop:rebuild-and-smoke` PASS (v1.0.43 portable) — **rebundle needed** for tempo curve in packaged app |

## ANCHOR COMMIT
`c0d75701` — feat(swing): tempo-adaptive curve — per-composer k, Friberg model, 20 tests

**Also on `main` (pushed):**
- `d196a6a1` — feat(swing): Porter vs Gershwin fine-grain — intensity 0.52 vs 0.65, gap 0.13
- `3d1c7757` — feat(desktop): rebundle engine changes + fix Python sidecar paths
- `ca746798` — feat(ui): composer + gate tooltips
- `39b5d597` — feat(vrb): boundary swing ramp
- `c645b09a` — feat(vrb): 3-way VRB blend

## ROADMAP
| # | Item | Status |
|---|---|---|
| 1 | sq_swing rhythm engine | ✓ (Friberg displacement + tempo curve) |
| 2 | Wyble duo parity + BB Light Touch | pending |
| 3 | ECM GCE orchestration | pending |
| 4 | Melody V2 + cadenza | pending |
| 5 | MIDI import | pending |
| 6 | Porter vs Gershwin fine-grain | ✓ (`d196a6a1`) |
| 7 | Tempo-adaptive swing curve | ✓ |
| 8 | 3-way VRB blend (within-section) | ✓ (`c645b09a`) |
| 9 | UI tooltips | ✓ (`ca746798`) |
| 10 | Desktop rebuild | ✓ (`3d1c7757`) — rebundle after engine changes |
| — | Boundary swing ramp | ✓ (`39b5d597`) |
| — | Per-section VRB assignment | ✓ (V59) |

**Deferred:** Ornette

**Roadmap core complete** (Ornette + follow-on items above remain optional/product backlog).

## NEXT SESSION ENTRY POINT
**Desktop rebundle** — `apps/composer-os-app` + `composer-os-desktop` build so tempo curve ships in `desktop-ipc.bundle.cjs` / portable exe. Then Wyble duo parity (#2) or ECM GCE (#3) per priority.

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

Profile σ ceilings unchanged; table reflects live registry.
