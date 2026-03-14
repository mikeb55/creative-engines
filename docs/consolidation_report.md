# Consolidation Report — creative-engines

**Date:** March 14, 2025  
**Action:** Remove duplicated engine definitions from platform repo

---

## Files Removed from `engines/`

The following engine definition files were present in `engines/` before consolidation:

| File |
|------|
| `engines/slonimsky_harmonic_engine.md` |
| `engines/shorter_narrative_engine.md` |
| `engines/counterpoint_hybrid_engine.md` |
| `engines/bartok_night_engine.md` |
| `engines/scofield_holland_engine.md` |
| `engines/zappa_disruption_engine.md` |
| `engines/frisell_atmosphere_engine.md` |
| `engines/stravinsky_pulse_engine.md` |
| `engines/wheeler_lyric_engine.md` |
| `engines/polyphonic_labyrinth_engine.md` |

**Total:** 10 engine definition files

---

## Rationale

These engine definitions are **duplicated elsewhere** and should not live in the platform repo. They are maintained in **creative-rule-engines**, which is the source of truth for all composer engine specs.

**creative-engines** will become **infrastructure-only**: runtime, palettes, rules, templates, docs, and shared infrastructure.

**creative-rule-engines** remains the **source of truth** for engine definitions (Monk, Barry Harris, Bartók, Zappa, Scofield–Holland, Shorter, Frisell, Wheeler, Stravinsky, Slonimsky, etc.).

---

## Post-Consolidation Structure

```
creative-engines/
├── docs/             # Documentation (including this report)
├── palettes/         # Tonality Vault, interval cycles, triad pairs, polychords
├── rules/            # GCE, anti-monotony, ensemble, engraving, structure
├── runtime/          # Run scripts, desktop icon
├── templates/       # Composition request, revision loop
└── README.md
```
