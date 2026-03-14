# Creative Engines — Platform & Infrastructure

**Version 1.0**  
**Style-agnostic, instrumentation-agnostic**

---

## Repository Roles

**creative-engines**

Platform infrastructure including:
- runtime
- palettes
- rules
- templates
- shared documentation

**creative-rule-engines**

Composer engine definitions including:
- Monk engine
- Barry Harris engine
- Bartok engine
- Slonimsky engine
- other composition engines

Engine definition files must exist only in creative-rule-engines.

---

## Purpose

Universal composition engine framework for all Cursor music projects. Works across any instrumentation, genre, or style. Enforces mandatory GCE ≥ 9.0 before MusicXML output.

---

## Structure

```
creative-engines/
├── docs/             # Documentation, consolidation report, repo roles
├── palettes/         # Tonality Vault, interval cycles, triad pairs, polychords
├── rules/            # GCE, anti-monotony, ensemble, engraving, structure
├── runtime/          # Run scripts, desktop icon
├── templates/        # Composition request, revision loop
└── README.md
```

---

## Universal Rules

1. **GCE Iteration** — No MusicXML until GCE ≥ 9.0
2. **Anti Monotony** — No cell > 4 bars × 2 without transformation
3. **Density Arc** — low → development → peak → release
4. **Ensemble Awareness** — Idiomatic parts
5. **Section Clarity** — Boxed rehearsal letters
6. **Harmonic Depth** — Use palettes (Tonality Vault, etc.)
7. **Engraving Quality** — Correct MusicXML

---

## Optional Integration

**gml-harmonic-engine:** If available, integrate for voice-leading and chord voicing logic. The creative-engines framework does not depend on it; it enhances harmonic decision support when present.

---

## Project-Independent

This framework works in any Cursor project, any repository, any musical style. Reference from your project; do not duplicate.
