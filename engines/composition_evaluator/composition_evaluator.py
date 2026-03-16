"""
Composition Evaluator — Pipeline to score compositions from any composer engine.
"""

from typing import Any, Optional

try:
    from .composition_score_types import CompositionScore
    from .motif_coherence import score_motif_coherence
    from .harmonic_interest import score_harmonic_interest
    from .interval_language_score import score_interval_language
    from .form_interest_score import score_form_interest
    from .voice_leading_score import score_voice_leading
    from .asymmetry_score import score_asymmetry
except ImportError:
    from composition_score_types import CompositionScore
    from motif_coherence import score_motif_coherence
    from harmonic_interest import score_harmonic_interest
    from interval_language_score import score_interval_language
    from form_interest_score import score_form_interest
    from voice_leading_score import score_voice_leading
    from asymmetry_score import score_asymmetry

WEIGHTS = {
    "motif": 0.2,
    "harmony": 0.15,
    "interval": 0.2,
    "form": 0.15,
    "voice_leading": 0.15,
    "asymmetry": 0.15,
}

STYLE_WEIGHT = 0.3


def evaluate_composition(
    compiled_composition: Any,
    engine_name: Optional[str] = None,
) -> CompositionScore:
    """Evaluate composition. Returns CompositionScore with 0–10 scores.
    If engine_name is provided, adds style fit and returns style-adjusted total_score."""
    motif_score = score_motif_coherence(compiled_composition)
    harmony_score = score_harmonic_interest(compiled_composition)
    interval_score = score_interval_language(compiled_composition)
    form_score = score_form_interest(compiled_composition)
    voice_score = score_voice_leading(compiled_composition)
    asym_score = score_asymmetry(compiled_composition)
    breakdown = {
        "motif": motif_score,
        "harmony": harmony_score,
        "interval": interval_score,
        "form": form_score,
        "voice_leading": voice_score,
        "asymmetry": asym_score,
    }
    total = (
        motif_score * WEIGHTS["motif"]
        + harmony_score * WEIGHTS["harmony"]
        + interval_score * WEIGHTS["interval"]
        + form_score * WEIGHTS["form"]
        + voice_score * WEIGHTS["voice_leading"]
        + asym_score * WEIGHTS["asymmetry"]
    ) / sum(WEIGHTS.values())
    base_score = max(0.0, min(10.0, total))
    style_fit_score = 0.0
    if engine_name:
        try:
            from style_dna.style_ranker import style_adjusted_score
            total = style_adjusted_score(
                compiled_composition,
                engine_name,
                base_score,
                style_weight=STYLE_WEIGHT,
            )
            from style_dna.style_dna_analyzer import analyze_composition_style
            style_fit_score = analyze_composition_style(compiled_composition, engine_name) * 10.0
        except ImportError:
            pass
    return CompositionScore(
        total_score=total,
        motif_score=motif_score,
        harmony_score=harmony_score,
        interval_score=interval_score,
        form_score=form_score,
        voice_leading_score=voice_score,
        asymmetry_score=asym_score,
        breakdown=breakdown,
        style_fit_score=style_fit_score,
        base_score=base_score,
    )
