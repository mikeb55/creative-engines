# Wayne Shorter Engine — User Guide

A composer-friendly guide to the Wayne Shorter Engine.

---

## What the Wayne Shorter Engine Is For

The engine helps you generate **instrumental composition plans** in a Wayne-Shorter-inspired language. It produces:

- Melodic blueprints driven by motivic cells and interval language
- Harmonic fields that support ambiguity and nonfunctional motion
- Asymmetrical phrase structures (7, 8, 9, 10, 11-bar phrases)
- Section-by-section form with contrast and return

It is **not** an AI that writes finished tunes. It is a deterministic tool that gives you coherent blueprints you can develop further.

---

## What Kinds of Compositions It Generates

- **Dark lyrical** — title-based, lyrical-ambiguous interval language
- **Ambiguous modal** — premise-based, drifting between centers
- **Asymmetrical phrase** — odd phrase lengths, angular intervals
- **Bridge-reframed return** — contrast section that reframes the return

All outputs are **deterministic**: same title + seed = same result.

---

## How Asymmetry Is Handled

- Phrase lengths can be **7, 8, 9, 10, 11 bars** — not forced into 4+4
- Form profiles like `odd_phrase_aba` and `compact_asymmetrical` preserve asymmetry
- The engine **does not** balance symmetry or optimise phrasing
- Asymmetry is explicit in the IR and preserved through compilation

---

## How Harmonic Ambiguity Is Handled

- Harmonic fields support **nonfunctional motion**, shifting key centers, expectation-diversion
- Profiles: `ambiguous_modal`, `nonfunctional_cycle`, `blues_shadowed`, `major_third_axis`, `suspended_dark`, `mixed_tonic_centers`
- Avoids pure ii–V–I autopilot
- `avoid_resolution` keeps motion open-ended

---

## How Motifs Are Developed

- **Motivic cells** drive melody; they are central, not decorative
- Operations: transposition, interval expansion, contraction, fragmentation, inversion-lite, registral shift
- Contrast sections use different operations (e.g. fragmentation)
- Returns use transformation (e.g. transposition) so they feel transformed, not flat repeats

---

## How to Run Examples

```python
from example_compositions import all_examples, compile_all_examples

# Get IRs
irs = all_examples()

# Compile to blueprints
comps = compile_all_examples()
```

---

## How to Export MusicXML

```python
from shorter_generator import generate_composer_ir_from_title
from shorter_section_compiler import compile_composition_from_ir
from shorter_musicxml_exporter import export_composition_to_musicxml

ir = generate_composer_ir_from_title("Your Title", seed=0)
comp = compile_composition_from_ir(ir)
xml = export_composition_to_musicxml(comp)

# Save to file
with open("output.xml", "w", encoding="utf-8") as f:
    f.write(xml)
```

---

## Appendix: 20 Ways to Start a Shorter-Style Composition

1. **Title first** — "Footprints in the Rain", "Nefertiti's Shadow"
2. **Premise first** — "A melody that drifts between F and Bb"
3. **Interval fingerprint** — Start with 2nds, 4ths, 5ths, tritone
4. **Odd phrase** — 7-bar opening instead of 8
5. **Harmonic field** — Pick ambiguous_modal or nonfunctional_cycle
6. **Motivic cell** — One small cell, develop through sections
7. **Registral contrast** — Low primary, high contrast
8. **Bridge reframe** — Contrast section that reframes the return
9. **Quartal color** — quartal_colored interval profile
10. **Minor-second shadow** — minor_second_shadowed profile
11. **Angular** — angular interval profile
12. **Lyrical ambiguous** — lyrical_ambiguous profile
13. **Blues shadowed** — blues_shadowed harmonic field
14. **Major-third axis** — major_third_axis harmonic field
15. **Suspended dark** — suspended_dark harmonic field
16. **Through-composed** — through_composed_songform
17. **Floating sectional** — intro, primary, contrast, return
18. **Open cadence** — cadence_strategy="open"
19. **Deferred resolution** — avoid_resolution=True
20. **Multiple candidates** — generate_composer_ir_candidates, pick one
