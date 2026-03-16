"""
Song IR Examples — Canonical test fixtures.
Three high-quality hardcoded examples that compile successfully.
"""

from typing import Dict, Any

try:
    from .song_ir_schema import SongIR, SectionIR, HookDNA, HarmonicPlan, ContrastArc
except ImportError:
    from song_ir_schema import SongIR, SectionIR, HookDNA, HarmonicPlan, ContrastArc


def title_first_example() -> SongIR:
    """Title-first practical example."""
    return SongIR(
        title="River Road",
        premise="journey and return",
        seed=1001,
        form="short",
        section_order=["verse", "chorus", "verse", "chorus"],
        section_roles={
            "verse": SectionIR(role="verse", bar_count=8, lyric_density=0.7),
            "chorus": SectionIR(role="chorus", bar_count=8, title_placement="first_line", lyric_density=0.65),
        },
        hook_dna=HookDNA(
            motif_cell=[60, 62, 64],
            title_phrase="River Road",
            chorus_melody_idea=[60, 62, 64, 65, 67, 65],
            energy_level=0.8,
        ),
        image_family=["river", "road", "bridge"],
        harmonic_plan=HarmonicPlan(default_progression=["C", "Am", "F", "G"]),
        contrast_arc=ContrastArc(section_energies={"verse": 0.45, "chorus": 0.82}),
        title_placements={"chorus": "first_line"},
    )


def image_driven_example() -> SongIR:
    """Image-driven example."""
    return SongIR(
        title="Dawn Breaks",
        premise="waiting at the station",
        seed=2002,
        form="short",
        section_order=["verse", "chorus", "verse", "chorus"],
        section_roles={
            "verse": SectionIR(role="verse", bar_count=8, phrase_lengths=[4, 6, 4, 6]),
            "chorus": SectionIR(role="chorus", bar_count=8, title_placement="first_line"),
        },
        hook_dna=HookDNA(
            motif_cell=[62, 64, 65],
            title_phrase="Dawn Breaks",
            chorus_melody_idea=[62, 64, 65, 67, 65, 64],
            contour_archetype="arch",
            energy_level=0.78,
        ),
        image_family=["dawn", "platform", "train", "light"],
        harmonic_plan=HarmonicPlan(default_progression=["G", "Em", "C", "D"]),
        contrast_arc=ContrastArc(section_energies={"verse": 0.4, "chorus": 0.78}, verse_2_intensify=True),
    )


def hook_forward_example() -> SongIR:
    """Hook-forward example."""
    return SongIR(
        title="Edge of Night",
        premise="liminal moment",
        seed=3003,
        form="short",
        section_order=["verse", "chorus", "verse", "chorus"],
        section_roles={
            "verse": SectionIR(role="verse", bar_count=8),
            "chorus": SectionIR(role="chorus", bar_count=8, title_placement="first_line", lyric_density=0.6),
        },
        hook_dna=HookDNA(
            motif_cell=[64, 65, 67],
            title_phrase="Edge of Night",
            chorus_melody_idea=[64, 65, 67, 69, 67, 65, 64],
            rhythmic_signature="motif_repeat",
            energy_level=0.85,
        ),
        image_family=["edge", "night", "window"],
        harmonic_plan=HarmonicPlan(default_progression=["Am", "F", "G", "C"]),
        contrast_arc=ContrastArc(section_energies={"verse": 0.42, "chorus": 0.85}, final_chorus_peak=True),
    )


def full_song_example() -> SongIR:
    """Full song with prechorus, bridge, final_chorus, outro."""
    return SongIR(
        title="Full Song",
        premise="complete journey",
        seed=4004,
        form="long",
        section_order=["verse", "prechorus", "chorus", "verse", "bridge", "final_chorus", "outro"],
        section_roles={
            "verse": SectionIR(role="verse", bar_count=8, lyric_density=0.7),
            "prechorus": SectionIR(role="prechorus", bar_count=4, lyric_density=0.75),
            "chorus": SectionIR(role="chorus", bar_count=8, title_placement="first_line"),
            "bridge": SectionIR(role="bridge", bar_count=8),
            "final_chorus": SectionIR(role="final_chorus", bar_count=8, title_placement="first_line"),
            "outro": SectionIR(role="outro", bar_count=4),
        },
        hook_dna=HookDNA(
            motif_cell=[60, 62, 64],
            title_phrase="Full Song",
            chorus_melody_idea=[60, 62, 64, 65, 67, 65],
            energy_level=0.85,
        ),
        image_family=["road", "sky", "horizon"],
        harmonic_plan=HarmonicPlan(
            default_progression=["C", "Am", "F", "G"],
            section_overrides={"bridge": ["F", "G", "Am", "Em"], "outro": ["C", "G", "C"]},
        ),
        contrast_arc=ContrastArc(
            section_energies={"verse": 0.45, "prechorus": 0.6, "chorus": 0.82, "bridge": 0.5, "final_chorus": 0.92, "outro": 0.35},
            final_chorus_peak=True,
        ),
        title_placements={"chorus": "first_line", "final_chorus": "first_line"},
    )


def get_example(name: str) -> SongIR:
    """Get example by name."""
    examples = {
        "title_first": title_first_example,
        "image_driven": image_driven_example,
        "hook_forward": hook_forward_example,
        "full_song": full_song_example,
    }
    fn = examples.get(name)
    if not fn:
        raise ValueError(f"Unknown example: {name}. Valid: {list(examples.keys())}")
    return fn()
