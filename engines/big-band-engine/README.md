# Big Band Engine

Models modern big band architecture: sectional writing for saxes, trombones, trumpets, rhythm section; layered ostinati; shout textures; sectional counterpoint; evolving density; asymmetrical phrase structures; modern jazz orchestra logic.

## What the Big Band Engine Does

- **Sectional thinking** — Sax, trombone, trumpet sections with distinct roles
- **Layered rhythmic figures** — Brass punches, sax counterlines, rhythm section support
- **Shout-chorus capable** — High-density ensemble climax architecture
- **Asymmetrical forms** — 5–7, 7–9, 9–13 bar phrase groups; no forced 4+4 symmetry
- **Evolving density** — Section-by-section density plans
- **Modular form blocks** — Intro, melody, development, shout, return/coda

## How It Differs from Chamber / Small-Group Engines

- **Ensemble scale** — Sectional roles, not individual voices
- **Brass/sax/rhythm logic** — Punch plans, texture plans, rhythm section plans
- **Shout architecture** — Explicit shout-chorus support
- **Density planning** — Per-section density evolution
- **Blueprint output** — Usable big-band sketch, not full arrangement

## When to Use in Hybrid Compositions

- **Ensemble layer** — Big band as full-section texture over small-group melody
- **Shout contrast** — Big band shout vs. sparse chamber material
- **Sectional counterpoint** — Brass punches + sax counterlines in hybrid
- **Form arc** — Big band form logic (chart arc, modular) for hybrid structure

## Profiles

- **Interval**: brass_punch, sax_counterline, shout_leap, sectional_unison, layered_ensemble_motion
- **Harmony**: modern_big_band_modal, layered_chromatic, brass_axis_field, shout_dominant_field, sectional_pedal_field
- **Form**: chart_arc, modular_big_band_form, asymmetrical_shout_form, sectional_wave_form, episode_return_chart, **narrative_big_band_form**

## Narrative Big Band Form

The `narrative_big_band_form` module (`form_modules/narrative_big_band_form.py`) provides a modern narrative large-ensemble form profile inspired by lyrical, atmospheric, evolving jazz-orchestra writing. It builds on:

- Big Band Engine (sectional orchestration)
- Wayne Shorter Form Engine (form logic)
- Ligeti Texture Engine (density, texture)
- Big Band bridge (form + texture merge)

**When to use:** Lyrical, atmospheric, or evolving large-ensemble pieces; narrative arcs; solo environments; transformed returns; codas.

**How it differs from chart forms:** Chart forms (chart_arc, modular_big_band_form) are more compact and sectional. Narrative form adds intro-atmosphere, solo-environment, recomposition, and coda types.

**Shorter + Ligeti interaction:** Use the bridge with `big_band_form_profile="narrative_big_band_form"` to combine Shorter form + Ligeti texture + narrative big band host.
