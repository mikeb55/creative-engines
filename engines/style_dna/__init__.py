"""
Style DNA — Engine style fingerprints and style-aware scoring.
"""

try:
    from style_dna.style_profile import StyleProfile
    from style_dna.style_dna_analyzer import (
        build_engine_style_profile,
        build_all_style_profiles,
        analyze_composition_style,
    )
    from style_dna.style_ranker import (
        rank_compositions_by_style_fit,
        style_adjusted_score,
    )
except ImportError:
    from .style_profile import StyleProfile
    from .style_dna_analyzer import (
        build_engine_style_profile,
        build_all_style_profiles,
        analyze_composition_style,
    )
    from .style_ranker import (
        rank_compositions_by_style_fit,
        style_adjusted_score,
    )
