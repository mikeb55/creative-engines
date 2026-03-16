# Hybrid Engine — User Guide

## Counterpoint-Capable Hybrid Layer

The hybrid engine supports **2–4 voice counterpoint**: lead, counterline, optional inner voice, optional bass motion. Use `counter_engine` to add a counterline; the compiler builds polyphonic texture and the MusicXML exporter outputs separate parts.

## How Composer Engines Interact

The creative-engines project has seven composer engines. Each engine exposes the same interface:

- **generate_ir** — Create a composition plan from title or premise
- **compile_from_ir** — Turn the plan into a compiled composition
- **export_musicxml** — Export to MusicXML
- **validate_ir** — Check the plan is valid

Engines are registered in the **engine registry**. You can call any engine by name without engine-specific code.

## How Hybrids Work

A hybrid composition uses **multiple engines** for different roles:

- **Primary engine** — melody
- **Harmony engine** — harmony
- **Counter engine** — countermelody (optional)
- **Rhythm engine** — rhythmic punctuation (optional)

The hybrid planner produces a **HybridComposerIR** that specifies which engine handles each role. The hybrid section compiler then delegates to those engines and combines the results.

## Examples

### Shorter melody + Barry Harris harmony

```python
from hybrid_engine.hybrid_planner import plan_hybrid_composition
from hybrid_engine.hybrid_section_compiler import compile_hybrid_composition
from hybrid_engine.hybrid_musicxml_exporter import export_hybrid_to_musicxml

h = plan_hybrid_composition(
    melody_engine="wayne_shorter",
    harmony_engine="barry_harris",
    seed=0,
    title="Shorter + Harris",
)
result = compile_hybrid_composition(h, "Shorter + Harris")
xml = export_hybrid_to_musicxml(result)
```

### Hill melody + Monk rhythm

```python
h = plan_hybrid_composition(
    melody_engine="andrew_hill",
    harmony_engine="andrew_hill",
    rhythm_engine="monk",
    seed=42,
)
result = compile_hybrid_composition(h, "Hill + Monk")
```

### Monk melody + Shorter harmony

```python
h = plan_hybrid_composition(
    melody_engine="monk",
    harmony_engine="wayne_shorter",
    seed=17,
)
result = compile_hybrid_composition(h, "Monk + Shorter")
```

## Motif and Harmony Exchange

You can transfer motifs and harmony between engines:

```python
from shared_composer.engine_registry import get_engine
from shared_composer.motif_exchange import extract_motifs, transform_motif_for_engine, inject_motif
from shared_composer.harmonic_exchange import extract_harmony, translate_harmony_for_engine, inject_harmony

eng = get_engine("wayne_shorter")
ir = eng.generate_ir("Source", seed=0)
compiled = eng.compile_from_ir(ir)

motifs = extract_motifs(compiled)
motif_for_bh = transform_motif_for_engine(motifs[0], "barry_harris")

bh_eng = get_engine("barry_harris")
bh_ir = bh_eng.generate_ir("Target", seed=1)
bh_ir = inject_motif(bh_ir, motif_for_bh)
```

## Style-Aware Hybrid Population Search

Generate many hybrids, score with evaluator + Style DNA, rank and export best:

```python
from hybrid_engine.hybrid_population_runtime import run_hybrid_population_search, export_top_hybrids

top = run_hybrid_population_search(
    input_text="My Hybrid",
    count=12,
    generations=2,
    top_n=5,
    seed=0,
)
export_top_hybrids(top, output_dir="output")
```

## 2–4 Voice Use Cases

- **2 voices**: Lead + counterline (e.g. Wheeler melody + Frisell counterline)
- **3 voices**: Lead + counterline + inner (e.g. Shorter + Bartok counter + Harris harmony)
- **4 voices**: Lead + counterline + inner + bass (e.g. Monk + Hill + Harris + Barry)

## Suggested Counterpoint Combinations

- Wheeler melody + Frisell harmony + Bartok counterline
- Shorter melody + Barry Harris harmony + Monk rhythm + Hill counterline
- Frisell melody + Wheeler counterline + Bartok texture

## Appendix: 20 Useful Hybrid Combinations

1. Shorter melody + Barry Harris harmony
2. Hill melody + Monk rhythm + Shorter harmony
3. Monk melody + Barry Harris harmony + Hill counterline
4. Shorter melody + Monk harmony
5. Wheeler melody + Frisell harmony + Bartok counterline
6. Monk melody + Shorter harmony
7. Hill melody + Barry Harris harmony
8. Shorter melody + Harris + Monk rhythm
9. Frisell melody + Wheeler counterline
10. Hill melody + Monk harmony
11. Monk melody + Hill harmony
12. Shorter melody + Hill harmony
13. Harris melody + Monk harmony
14. Wheeler melody + Frisell atmosphere
15. Monk melody + Harris harmony
16. Shorter + Harris (melody + harmony)
17. Hill + Monk (angular + rhythmic)
18. Bartok + Frisell (night + ambient)
19. Harris + Hill (bebop + cluster)
20. Shorter + Harris + Monk (three-engine)

## Appendix: 20 Useful Counterpoint Hybrid Combinations

1. Wheeler melody + Frisell harmony + Bartok counterline
2. Shorter melody + Barry Harris harmony + Monk rhythm + Hill counterline
3. Frisell melody + Wheeler counterline + Bartok texture
4. Monk melody + Barry Harris harmony + Hill counterline
5. Wheeler melody + Frisell counterline
6. Bartok melody + Frisell harmony + Wheeler counterline
7. Shorter melody + Monk harmony + Bartok counterline
8. Hill melody + Frisell harmony + Wheeler counterline
9. Frisell melody + Bartok counterline
10. Wheeler melody + Shorter harmony + Frisell counterline
11. Monk melody + Wheeler harmony + Bartok counterline
12. Bartok melody + Wheeler counterline
13. Shorter melody + Frisell harmony + Wheeler counterline
14. Hill melody + Bartok counterline
15. Barry Harris melody + Wheeler harmony + Monk counterline
16. Wheeler + Frisell (lyrical + ambient)
17. Bartok + Wheeler (night + lyrical)
18. Frisell + Bartok (ambient + fragmented)
19. Shorter + Frisell (angular + open)
20. Monk + Wheeler + Bartok (three-engine counterpoint)
