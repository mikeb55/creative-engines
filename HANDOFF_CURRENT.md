# HANDOFF — auto-updated 2026-05-18

## SMOKE BASELINE
| Tier | Result |
|---|---|
| Full | 357 / 70 / 0 |
| Fast | 213 / 56 / 0 |

## ANCHOR COMMIT
`ca746798` — feat(ui): composer + gate tooltips — descriptions, family tags, σ values, 15 tests

**Also on `main` (pushed):**
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
| 6 | Pärt stub | ✓ (arvo_part in registry) |
| 7 | 3-way VRB blend (within-section) | ✓ (`c645b09a`) |
| 8 | UI tooltips | ✓ (`ca746798`) |
| 9 | Desktop rebuild | pending |
| — | Boundary swing ramp (same-family joins) | ✓ (`39b5d597`) |
| — | Per-section VRB assignment | ✓ (V59) |

**Deferred:** Ornette

## NEXT SESSION ENTRY POINT
**sq_swing rhythm engine** — read-only recon first: grep swing/rhythm policy under `engines/composer-os-v2/`, then `voiceRuleBundle.ts` rhythmic fields; report before coding.

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
