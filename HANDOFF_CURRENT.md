# HANDOFF — auto-updated 2026-05-19

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
