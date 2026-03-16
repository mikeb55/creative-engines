"""
Song IR Generator — Rule-driven, deterministic SongIR generation.
No LLM backend. Output passes validate_song_ir.
"""

from typing import List

try:
    from .song_ir_schema import (
        SongIR,
        SectionIR,
        HookDNA,
        HarmonicPlan,
        ContrastArc,
        ExportHints,
        MusicXMLConstraints,
    )
    from .song_ir_validator import validate_song_ir
    from .ir_generation_strategies import (
        build_practical_strategy,
        build_hook_forward_strategy,
        build_image_driven_strategy,
        build_premise_driven_strategy,
        extract_image_words,
    )
except ImportError:
    from song_ir_schema import (
        SongIR,
        SectionIR,
        HookDNA,
        HarmonicPlan,
        ContrastArc,
        ExportHints,
        MusicXMLConstraints,
    )
    from song_ir_validator import validate_song_ir
    from ir_generation_strategies import (
        build_practical_strategy,
        build_hook_forward_strategy,
        build_image_driven_strategy,
        build_premise_driven_strategy,
        extract_image_words,
    )


def _hash_int(s: str, seed: int) -> int:
    h = seed
    for c in s.encode("utf-8", errors="replace"):
        h = (h * 31 + c) & 0xFFFFFFFF
    return h


def _midi_from_text(text: str, seed: int, base: int = 60, span: int = 12) -> List[int]:
    """Derive MIDI pitches from text. Deterministic."""
    h = _hash_int(text, seed)
    out = []
    for i in range(6):
        v = ((h >> (i * 5)) + i * 7) & 0xFF
        out.append(base + (v % span))
    return out


def _build_ir_from_strategy(
    title: str,
    premise: str,
    strategy_cfg: dict,
    seed: int,
    hook_line: str = "",
) -> SongIR:
    """Build SongIR from strategy config."""
    order = strategy_cfg["section_order"]
    if "chorus" not in order:
        order = ["verse", "chorus", "verse", "chorus"]

    motif = _midi_from_text(title + premise, seed, 60, 10)
    chorus_melody = _midi_from_text(title + hook_line, seed + 1, 62, 14)
    if len(chorus_melody) < 4:
        chorus_melody = [60, 62, 64, 65, 67]

    section_roles = {}
    for role in set(order):
        if role == "verse":
            pl = [4, 6, 4, 6] if strategy_cfg.get("asymmetry") else None
            section_roles[role] = SectionIR(
                role="verse",
                bar_count=8,
                phrase_lengths=pl,
                lyric_density=strategy_cfg.get("lyric_density", 0.7),
            )
        elif role == "chorus":
            section_roles[role] = SectionIR(
                role="chorus",
                bar_count=8,
                title_placement="first_line",
                lyric_density=strategy_cfg.get("lyric_density", 0.65) * 0.95,
            )
        else:
            section_roles[role] = SectionIR(role=role, bar_count=8 if role != "prechorus" else 4)

    images = extract_image_words(premise or title, seed, strategy_cfg.get("image_density", 3))
    prog = strategy_cfg.get("progression", ["C", "Am", "F", "G"])
    key_center = strategy_cfg.get("key_center", "C")

    return SongIR(
        title=title,
        premise=premise,
        seed=seed,
        form=strategy_cfg.get("form", "short"),
        section_order=order,
        section_roles=section_roles,
        hook_dna=HookDNA(
            motif_cell=motif[:3],
            title_phrase=title,
            chorus_melody_idea=chorus_melody,
            energy_level=strategy_cfg.get("hook_boldness", 0.75),
        ),
        image_family=images,
        lyric_density=strategy_cfg.get("lyric_density", 0.7),
        harmonic_plan=HarmonicPlan(default_progression=prog),
        contrast_arc=ContrastArc(
            section_energies={
                "verse": 0.4 + (1 - strategy_cfg.get("emotional_temperature", 0.6)) * 0.1,
                "chorus": strategy_cfg.get("hook_boldness", 0.75),
            },
            verse_2_intensify=bool(seed % 3 == 0),
            final_chorus_peak=True,
        ),
        title_placements={"chorus": "first_line"} if "chorus" in order else {},
        export_hints=ExportHints(key_center=key_center, tempo=85 + (seed % 30)),
        musicxml_constraints=MusicXMLConstraints(),
    )


def generate_song_ir_from_title(title: str, seed: int = 0, strategy: str = "practical") -> SongIR:
    """Generate valid SongIR from title. Deterministic."""
    strategies = {
        "practical": build_practical_strategy,
        "hook_forward": build_hook_forward_strategy,
        "image_driven": build_image_driven_strategy,
        "premise_driven": build_premise_driven_strategy,
    }
    fn = strategies.get(strategy, build_practical_strategy)
    cfg = fn(title, seed)
    premise = f"story of {title.lower()}" if title else "untitled"
    ir = _build_ir_from_strategy(title, premise, cfg, seed)
    r = validate_song_ir(ir)
    if not r.valid:
        raise ValueError(f"Generated invalid IR: {'; '.join(r.errors)}")
    return ir


def generate_song_ir_from_premise(premise: str, seed: int = 0, strategy: str = "practical") -> SongIR:
    """Generate valid SongIR from premise. Title derived from first words."""
    words = premise.strip().split()[:4]
    title = " ".join(words).title() if words else "Untitled"
    fn = build_premise_driven_strategy if strategy == "premise_driven" else build_practical_strategy
    cfg = fn(premise, seed)
    ir = _build_ir_from_strategy(title, premise, cfg, seed)
    r = validate_song_ir(ir)
    if not r.valid:
        raise ValueError(f"Generated invalid IR: {'; '.join(r.errors)}")
    return ir


def generate_song_ir_from_hook(hook_line: str, seed: int = 0, strategy: str = "hook_forward") -> SongIR:
    """Generate valid SongIR from hook line. Title from hook."""
    title = hook_line.strip()[:50] or "Hook Song"
    cfg = build_hook_forward_strategy(hook_line, seed)
    premise = f"driven by {hook_line.lower()[:30]}"
    ir = _build_ir_from_strategy(title, premise, cfg, seed, hook_line=hook_line)
    r = validate_song_ir(ir)
    if not r.valid:
        raise ValueError(f"Generated invalid IR: {'; '.join(r.errors)}")
    return ir


def generate_song_ir_candidates(
    input_text: str,
    mode: str = "title",
    count: int = 12,
    seed: int = 0,
) -> List[SongIR]:
    """Generate count varied valid SongIR candidates. Deterministic."""
    strategies = ["practical", "hook_forward", "image_driven", "premise_driven"]
    out = []
    for i in range(count):
        s = seed + i * 1007
        strat = strategies[i % len(strategies)]
        try:
            if mode == "title":
                ir = generate_song_ir_from_title(input_text, seed=s, strategy=strat)
            elif mode == "premise":
                ir = generate_song_ir_from_premise(input_text, seed=s, strategy=strat)
            elif mode == "hook":
                ir = generate_song_ir_from_hook(input_text, seed=s, strategy=strat)
            else:
                ir = generate_song_ir_from_title(input_text, seed=s, strategy="practical")
            out.append(ir)
        except ValueError:
            ir = generate_song_ir_from_title(input_text or "Untitled", seed=s, strategy="practical")
            out.append(ir)
    return out[:count]
