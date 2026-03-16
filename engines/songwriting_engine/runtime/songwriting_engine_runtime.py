#!/usr/bin/env python3
"""
Songwriting Engine Runtime — Main orchestration.

Default path: Song IR engine (generate → archive → finalists → compile → MusicXML).
Legacy generate-score-repair path: deprecated, use run_legacy_generate_song only if needed.
"""

import random
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from .song_generator import SongGenerator
    from .evaluation_adapter import EvaluationAdapter
    from .repair_engine import RepairEngine
    from .musicxml_exporter import MusicXMLExporter
    from .population_generator import run_population_search, run_hook_first_search
except ImportError:
    from song_generator import SongGenerator
    from evaluation_adapter import EvaluationAdapter
    from repair_engine import RepairEngine
    from musicxml_exporter import MusicXMLExporter
    from population_generator import run_population_search, run_hook_first_search


def _rules_root() -> Path:
    """Path to creative-rule-engines/engines/songwriting_engine (sibling repo)."""
    return Path(__file__).resolve().parent.parent.parent.parent.parent / "creative-rule-engines" / "engines" / "songwriting_engine"


def _load_yaml_file(p: Path) -> Dict[str, Any]:
    """Load YAML file; fallback to empty dict if PyYAML missing."""
    try:
        import yaml
        with open(p, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except ImportError:
        return {}
    except Exception:
        return {}


def load_rule_package(rules_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load YAML rule package from creative-rule-engines."""
    root = rules_path or _rules_root()
    rules: Dict[str, Any] = {}

    files = [
        ("spec", root / "spec.yaml"),
        ("profiles", root / "profiles" / "profiles.yaml"),
        ("sections", root / "sections" / "section_defaults.yaml"),
        ("evaluation", root / "evaluation" / "evaluation_weights.yaml"),
        ("hooks", root / "hooks" / "hook_rules.yaml"),
        ("lyrics", root / "lyrics" / "lyric_rules.yaml"),
        ("repair_mapping", root / "mappings" / "repair_to_layer.yaml"),
    ]
    for key, p in files:
        if p.exists():
            data = _load_yaml_file(p)
            if key == "profiles" and data and "profiles" in data:
                rules[key] = data["profiles"]
            elif key == "sections" and data and "sections" in data:
                rules[key] = data["sections"]
            elif key == "evaluation" and data:
                rules[key] = data.get("dimensions", data)
            else:
                rules[key] = data or {}

    rules.setdefault("repair_mapping", {
        "weak_hook": "melody", "poor_prosody": "lyrics", "vocal_range_issue": "melody",
        "low_clarity": "motifs", "low_memorability": "hooks", "lyric_cliche": "lyrics",
        "weak_imagery": "lyrics", "section_role_unclear": "sections",
        "weak_chorus_identity": "melody", "weak_section_contrast": "sections",
        "weak_verse_coherence": "lyrics",
    })
    return rules


# Canonical CandidateComposition structure (matches spec)
CandidateComposition = Dict[str, Any]


# --- MAIN ENTRYPOINT (Stage 4: Default) ---

def run_songwriting_engine(
    input_text: str,
    mode: str = "title",
    count: int = 12,
    finalist_limit: int = 5,
    seed: int = 0,
) -> Dict[str, Any]:
    """
    Main entrypoint. Run full Song IR pipeline:
    generation → archive → finalists → compile → MusicXML export.
    Returns {finalists_compiled, finalists_musicxml, archive_stats}.
    """
    return run_stage3_demo(
        input_text=input_text,
        mode=mode,
        count=count,
        finalist_limit=finalist_limit,
        seed=seed,
    )


# --- LEGACY PATH (Deprecated) ---

def run_legacy_generate_song(
    style_profiles: Optional[List[str]] = None,
    vocal_target: str = "male_tenor",
    song_seed: Optional[str] = None,
    structure_type: str = "default",
    lyric_theme: Optional[str] = None,
    title: Optional[str] = None,
    gce_target: float = 9.0,
    max_iterations: int = 10,
    rules_path: Optional[Path] = None,
    use_population_search: bool = True,
    use_hook_first: bool = True,
    population_size: int = 12,
    elite_count: int = 3,
    generations: int = 4,
) -> CandidateComposition:
    """
    Generate a complete song. Uses population search by default when use_population_search=True.
    """
    rules = load_rule_package(rules_path)
    seed = song_seed or str(random.randint(1, 999999))
    if seed.isdigit():
        random.seed(int(seed))

    generator = SongGenerator(rules)
    evaluator = EvaluationAdapter(rules)
    repairer = RepairEngine(rules)

    if use_population_search and use_hook_first:
        candidate, score_log, stats = run_hook_first_search(
            generator=generator,
            evaluator=evaluator,
            repairer=repairer,
            style_profiles=style_profiles or [],
            vocal_target=vocal_target,
            structure_type=structure_type,
            lyric_theme=lyric_theme or "love",
            title=title or "Untitled Song",
            seed=seed,
            hook_count=24,
            hook_elite_count=6,
            song_refinement_generations=2,
            apply_repair_to_top=True,
        )
        candidate["_iterations"] = len(score_log)
        candidate["_hook_first_stats"] = stats
        return candidate

    if use_population_search:
        candidate, score_log = run_population_search(
            generator=generator,
            evaluator=evaluator,
            repairer=repairer,
            style_profiles=style_profiles or [],
            vocal_target=vocal_target,
            structure_type=structure_type,
            lyric_theme=lyric_theme or "love",
            title=title or "Untitled Song",
            seed=seed,
            population_size=population_size,
            elite_count=elite_count,
            generations=generations,
            mutation_rate=0.25,
            apply_repair_to_top=True,
        )
        candidate["_iterations"] = len(score_log)
        return candidate

    candidate = generator.generate(
        style_profiles=style_profiles or [],
        vocal_target=vocal_target,
        structure_type=structure_type,
        lyric_theme=lyric_theme or "love",
        title=title or "Untitled Song",
        seed=seed,
    )

    iteration = 0
    score_log: List[float] = []
    plateau_count = 0

    while iteration < max_iterations:
        result = evaluator.evaluate(candidate)
        candidate["evaluation_scores"] = result["scores"]
        candidate["warnings"] = result["warnings"]
        overall = result["scores"].get("overall", 0)
        score_log.append(overall)

        if overall >= gce_target or result["verdict"] == "pass":
            break

        if len(score_log) >= 2 and score_log[-1] <= score_log[-2]:
            plateau_count += 1
            if plateau_count >= 2:
                break

        triggers = result.get("repair_triggers", [])
        if not triggers:
            iteration += 1
            continue

        repaired = repairer.repair(candidate, triggers)
        if repaired is None:
            break
        candidate = repaired
        iteration += 1

    candidate["repair_history"] = candidate.get("repair_history", [])
    candidate["_score_log"] = score_log
    candidate["_iterations"] = iteration

    return candidate


def generate_song(*args, **kwargs) -> CandidateComposition:
    """DEPRECATED: Use run_songwriting_engine. Legacy generate-score-repair path."""
    import warnings
    warnings.warn("generate_song is deprecated. Use run_songwriting_engine for the default Song IR path.", DeprecationWarning, stacklevel=2)
    return run_legacy_generate_song(*args, **kwargs)


def export_to_musicxml(candidate: CandidateComposition, output_path: Optional[Path] = None) -> str:
    """Export candidate to MusicXML. Returns XML string."""
    exporter = MusicXMLExporter()
    xml = exporter.export(candidate)
    if output_path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(xml, encoding="utf-8")
    return xml


# --- NEW SONG IR ARCHITECTURE (Phase 1) ---

def compile_from_song_ir(song_ir) -> "CompiledSong":
    """
    Compile Song IR into CompiledSong. New architecture path.
    Deterministic: same IR + seed = same result.
    """
    try:
        from .section_compiler import compile_song_from_ir
    except ImportError:
        from section_compiler import compile_song_from_ir
    return compile_song_from_ir(song_ir)


def run_song_ir_demo(example_name: str = "title_first"):
    """
    Run Song IR demo. Compiles example and returns (CompiledSong, MusicXML stub string).
    """
    try:
        from .song_ir_examples import get_example
        from .section_compiler import compile_song_from_ir
        from .musicxml_contracts import compiled_song_to_musicxml_stub
    except ImportError:
        from song_ir_examples import get_example
        from section_compiler import compile_song_from_ir
        from musicxml_contracts import compiled_song_to_musicxml_stub
    ir = get_example(example_name)
    compiled = compile_song_from_ir(ir)
    stub = compiled_song_to_musicxml_stub(compiled)
    return compiled, stub


# --- STAGE 2: Song IR Generation + QD Archive + Finalist Selection ---

def generate_song_ir_candidates_runtime(
    input_text: str,
    mode: str = "title",
    count: int = 12,
    seed: int = 0,
):
    """Generate candidate SongIRs. New architecture path."""
    try:
        from .song_ir_generator import generate_song_ir_candidates
    except ImportError:
        from song_ir_generator import generate_song_ir_candidates
    return generate_song_ir_candidates(input_text, mode=mode, count=count, seed=seed)


def run_stage2_demo(
    input_text: str,
    mode: str = "title",
    count: int = 12,
    finalist_limit: int = 5,
    seed: int = 0,
):
    """
    Stage 2: generate -> archive -> select finalists -> compile.
    Returns {candidates, archive_stats, finalists_compiled}.
    """
    try:
        from .song_ir_generator import generate_song_ir_candidates
        from .qd_archive import QDArchive
        from .finalist_selector import score_ir_candidate, compile_finalist_candidates
    except ImportError:
        from song_ir_generator import generate_song_ir_candidates
        from qd_archive import QDArchive
        from finalist_selector import score_ir_candidate, compile_finalist_candidates

    cands = generate_song_ir_candidates(input_text, mode=mode, count=count, seed=seed)
    arch = QDArchive()
    for ir in cands:
        q = score_ir_candidate(ir)
        arch.insert(ir, q)
    elites = arch.sample_elites(limit=finalist_limit)
    elite_irs = [ir for ir, _ in elites]
    compiled = compile_finalist_candidates(elite_irs)

    return {
        "candidates": cands,
        "archive_stats": arch.get_archive_stats(),
        "finalists_compiled": compiled,
    }


# --- STAGE 3: Full Compilation + Real MusicXML Export ---

def run_stage3_demo(
    input_text: str,
    mode: str = "title",
    count: int = 12,
    finalist_limit: int = 5,
    seed: int = 0,
):
    """
    Stage 3: generate -> archive -> finalists -> compile -> export MusicXML.
    Returns {finalists_compiled, finalists_musicxml, archive_stats}.
    """
    try:
        from .song_ir_generator import generate_song_ir_candidates
        from .qd_archive import QDArchive
        from .finalist_selector import score_ir_candidate, compile_finalist_candidates
        from .musicxml_exporter import export_compiled_song_to_musicxml
    except ImportError:
        from song_ir_generator import generate_song_ir_candidates
        from qd_archive import QDArchive
        from finalist_selector import score_ir_candidate, compile_finalist_candidates
        from musicxml_exporter import export_compiled_song_to_musicxml

    cands = generate_song_ir_candidates(input_text, mode=mode, count=count, seed=seed)
    arch = QDArchive()
    for ir in cands:
        q = score_ir_candidate(ir)
        arch.insert(ir, q)
    elites = arch.sample_elites(limit=finalist_limit)
    elite_irs = [ir for ir, _ in elites]
    compiled = compile_finalist_candidates(elite_irs)

    musicxml_list = []
    for item in compiled:
        try:
            xml = export_compiled_song_to_musicxml(item["compiled"])
            musicxml_list.append(xml)
        except Exception:
            musicxml_list.append("")

    return {
        "finalists_compiled": compiled,
        "finalists_musicxml": musicxml_list,
        "archive_stats": arch.get_archive_stats(),
    }
