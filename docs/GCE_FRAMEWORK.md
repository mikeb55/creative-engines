---
> **PARKED — superseded (2026-06-16).** Do not use for agent guidance or release gates.
> **Canonical:** `docs/GCE_CANONICAL.md` → `.cursor/rules/gce-evaluation.mdc`, `docs/GCE_LOCK_DCR_STANDARDS.md`, `docs/GCE_FRAMEWORK_V2.md`.
> Retained below as historical song-rubric reference only.

GCE – SONG EVALUATION FRAMEWORK (FOR CURSOR / CLAUDE)

AIM:
Evaluate and enforce song quality to GCE >= 9.0 before output.

SCORING:
- Score each category 0-10
- Provide 1-line justification per category
- Compute overall score (weighted toward Melody + Emotional Core)
- If overall < 9.0 -> revise weakest category only (no full rewrite)
- Allow ONE refinement pass only

CORE CATEGORIES:

1) EMOTIONAL CORE
- Clear, specific emotional intent
- Consistent tone across sections
FAIL if vague, neutral, or conflicting

2) MELODIC IDENTITY
- Memorable contour
- Motif + variation
- Anchor tones present
FAIL if scale-like or wandering

3) LYRIC CRAFT
- Concrete imagery
- Minimal filler
- Strong line endings
FAIL if cliche, overwritten, or too dense

4) HARMONY & LANGUAGE
- Coherent harmonic logic
- Controlled colour usage
- Voice-leading awareness
FAIL if random or constantly over-extended

5) RHYTHMIC IDENTITY
- Phrase variation
- Groove personality
- Intentional space
FAIL if rhythmically flat

6) STRUCTURE & FORM
- Clear section contrast (A/B/etc.)
- Build -> release -> return
FAIL if sections interchangeable

7) ARRANGEMENT / ORCHESTRATION
- Foreground vs background hierarchy
- Section-based variation
FAIL if everything plays constantly

8) ECONOMY & FOCUS
- No unnecessary material
- Space used intentionally
FAIL if overcrowded or verbose

9) TENSION & RELEASE
- Harmonic + rhythmic arcs
- Clear arrival points
FAIL if emotionally flat

10) AFTERGLOW (MEMORABILITY)
- Strong hook or identity
- At least one standout moment
FAIL if forgettable

HARD GATES (AUTO-FAIL):
- Melody <= 6
- Lyrics cliche-heavy
- No section contrast
- Ending feels accidental or rushed

ENGINE RULES:
- Generate -> evaluate -> revise weakest area -> output once
- Do NOT regenerate entire piece
- Do NOT optimise phrasing
- Do NOT balance symmetry
- Preserve asymmetry

OUTPUT FORMAT:
- Category scores (0-10)
- 1-line justification each
- Overall score
- If revised: state what was improved

GOAL:
Produce songs that feel intentional, distinctive, and replay-worthy (GCE >= 9.0)
---
