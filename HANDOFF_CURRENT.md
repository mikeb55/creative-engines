# HANDOFF — auto-updated 2026-05-19

## SMOKE BASELINE
| Tier | Result |
|---|---|
| Full | 383 / 71 / 0 |
| Fast | 228 / 57 / 0 |
| Desktop | `desktop:rebuild-and-smoke` PASS — **v1.0.44** portable (`release/Composer-OS.exe`) |

## ANCHOR COMMIT
`2e1adcf3` — feat(desktop): rebundle — tempo-adaptive swing curve ships in v1.0.44

**Shipped in v1.0.44 desktop IPC bundle:** `computeSwingIntensityForTempo`, Porter/Gershwin fine-grain swing, VRB tooltips, boundary swing ramp, 3-way blend, Python sidecar paths.

**Also on `main`:**
- `c0d75701` — feat(swing): tempo-adaptive curve
- `d196a6a1` — feat(swing): Porter vs Gershwin fine-grain
- `3d1c7757` — feat(desktop): Python sidecar paths + engine rebundle
- `ca746798`, `39b5d597`, `c645b09a` — tooltips, boundary ramp, 3-way blend

## ROADMAP — COMPLETE
| # | Item | Status |
|---|---|---|
| 1 | sq_swing rhythm engine (+ tempo-adaptive curve) | ✓ |
| 2 | Porter vs Gershwin fine-grain | ✓ (`d196a6a1`) |
| 3 | Tempo-adaptive swing curve | ✓ (`c0d75701`) |
| 4 | 3-way VRB blend (within-section) | ✓ (`c645b09a`) |
| 5 | UI tooltips | ✓ (`ca746798`) |
| 6 | Boundary swing ramp | ✓ (`39b5d597`) |
| 7 | Desktop rebuild + final rebundle | ✓ **v1.0.44** |

**No active roadmap items.**

**Deferred / backlog (not blocking):** Ornette; Wyble duo parity; ECM GCE orchestration; Melody V2 + cadenza; MIDI import; per-section VRB (V59 shipped).

## NEXT SESSION ENTRY POINT
None required for core roadmap. Optional: Wyble duo parity, ECM GCE, or product backlog items above.

## VRB σ TABLE
All 19 SQ Harmonic Voice profiles — unchanged. See `sqVrbProfileRegistry.ts`.
