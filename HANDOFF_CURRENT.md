# HANDOFF — auto-updated 2026-05-19

## Post-V78 — GCE Calibration Arc complete
- Tests: 76 passing
- Live overall: 0.900, gate clean, all dimensions healthy
- V79: final weight rebalance + npm run dist for portable .exe
- Commit: 05fb79f7

## Post-V77
- Tests: 72 passing
- Live: overall 0.870, reduction 0.833, anti_bebop 0.735, gate clean
- Remaining: lfv_integrity 0.75 — V78 target
- Commit: a449c5de

## Post-V76

- Tests: 68 passing
- Live: anti_bebop 0.630, overall 0.830, gate clean
- Next: V77 — reduction integrity 0.667, contour/cadence penalty review, target overall > 0.85
- Commit: 7dba6153

## Current state (post-V75)

- Tests: 63 passing
- Live Dm7 G7 Cmaj7 Cmaj7: overall 0.820, anti_bebop 0.567,
  gate_failed false, gate_attempts 0
- Commit chain:
    V70: 1a0a67a8
    V70 P2: 4914d34b
    V71: 606c4fbf
    V72: a303f14a
    V73: 7d2a22bb
    V74: 0983d2dc
    V75: 7d733390
- Next: V76 — enclosure penalty 0.24 is now largest bucket on
  live run; inspect whether catching Martino chromatic approaches
  or genuine bebop enclosures; exempt template-sourced bars if needed

## SMOKE BASELINE
| Tier | Result |
|---|---|
| Full | 383 / 71 / 0 |
| Fast | 228 / 57 / 0 |
| Desktop | `desktop:rebuild-and-smoke` PASS — **v1.0.47** portable (`release/Composer-OS.exe`) |

## RENDERER CRASH (resolved)
- **Root cause:** module-scope `Tone.Sampler` in `stringVoices.ts` triggered `AudioContext` init before Electron renderer ready on Windows (`ACCESS_VIOLATION`).
- **Fix:** lazy `getSamplers()` initialiser — samplers created on first playback/volume call, not at import.

## ANCHOR COMMIT
`fix(renderer): lazy-init Tone.Sampler in stringVoices` — renderer crash resolved. Desktop **v1.0.47** stable.

**Pitch-field Sessions 1–4 complete:** Ornette / Coltrane / Messiaen / Ligeti on `pitch-field-spine`. Registry **22** entries. Messiaen mode picker + song-mode guard live in desktop UI bundle.

**Prior:** `d70b7958` Ligeti upgrade · `914afde3` Coltrane + Messiaen · `21499de4` Ornette spine.

## ROADMAP — ACTIVE
| # | Item | Status |
|---|---|---|
| — | — | **No active roadmap items** |

**Backlog (not scheduled):** Wyble duo parity · ECM GCE orchestration

## FLAGS
| Flag | Value |
|---|---|
| `USE_PITCH_FIELD_NOTE_SELECTION` | `true` |
| Song-mode pitch-field guard | live (desktop) |
| Messiaen mode picker | live (desktop, default M2) |
| Ligeti pitch-field substrate | live (`pitchFieldGoverned`) |

## PITCH-FIELD COMPOSERS (4) — desktop
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
**Next scope TBD.** Renderer crash fixed; desktop **v1.0.47** smoke-stable.
