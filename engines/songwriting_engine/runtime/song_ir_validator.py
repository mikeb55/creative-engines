"""
Song IR Validator — Structured validation, early failure, clear errors.
"""

from dataclasses import dataclass, is_dataclass
from typing import Any, Dict, List, Optional

try:
    from .song_ir_schema import SongIR, SectionIR, HookDNA, MusicXMLConstraints
except ImportError:
    from song_ir_schema import SongIR, SectionIR, HookDNA, MusicXMLConstraints


@dataclass
class ValidationResult:
    """Structured validation result."""
    valid: bool
    errors: List[str] = None
    warnings: List[str] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []


def validate_song_ir(song_ir: Any) -> ValidationResult:
    """Validate full Song IR. Required fields, structure, coherence."""
    result = ValidationResult(valid=True)
    if not is_dataclass(song_ir):
        result.valid = False
        result.errors.append("song_ir must be a SongIR dataclass instance")
        return result

    if not hasattr(song_ir, "title") or not song_ir.title:
        result.valid = False
        result.errors.append("title is required and must be non-empty")

    if not hasattr(song_ir, "section_order") or not song_ir.section_order:
        result.valid = False
        result.errors.append("section_order is required and must be non-empty")

    if result.valid:
        result = _merge_result(result, validate_section_order(song_ir))
    if result.valid:
        result = _merge_result(result, validate_hook_dna(song_ir))
    if result.valid and hasattr(song_ir, "musicxml_constraints"):
        result = _merge_result(result, validate_musicxml_constraints(song_ir.musicxml_constraints))

    return result


def validate_section_order(song_ir: Any) -> ValidationResult:
    """Validate section order: chorus exists, roles match, title placements valid."""
    result = ValidationResult(valid=True)
    if not hasattr(song_ir, "section_order"):
        result.valid = False
        result.errors.append("section_order missing")
        return result

    order = song_ir.section_order
    if "chorus" not in order and "final_chorus" not in order:
        result.valid = False
        result.errors.append("section_order must contain at least one chorus or final_chorus")

    valid_roles = {"verse", "chorus", "prechorus", "bridge", "outro", "intro", "final_chorus"}
    for role in order:
        if role not in valid_roles:
            result.valid = False
            result.errors.append(f"invalid section role: {role}")

    if hasattr(song_ir, "title_placements") and song_ir.title_placements:
        for section_id, _ in song_ir.title_placements.items():
            if section_id not in order:
                result.valid = False
                result.errors.append(f"title_placement section '{section_id}' not in section_order")

    return result


def validate_hook_dna(song_ir: Any) -> ValidationResult:
    """Validate hook DNA is structurally usable."""
    result = ValidationResult(valid=True)
    if not hasattr(song_ir, "hook_dna"):
        result.valid = False
        result.errors.append("hook_dna is required")
        return result

    hook = song_ir.hook_dna
    if not hook:
        result.valid = False
        result.errors.append("hook_dna must not be empty")
        return result

    if hasattr(hook, "chorus_melody_idea") and hook.chorus_melody_idea:
        if len(hook.chorus_melody_idea) < 2:
            result.warnings.append("chorus_melody_idea has fewer than 2 pitches")
    elif hasattr(hook, "motif_cell") and hook.motif_cell:
        pass
    else:
        result.warnings.append("hook_dna has no melody idea or motif")

    return result


def validate_musicxml_constraints(constraints: Any) -> ValidationResult:
    """Validate MusicXML constraints are valid."""
    result = ValidationResult(valid=True)
    if not constraints:
        return result

    if hasattr(constraints, "divisions") and constraints.divisions is not None:
        if constraints.divisions < 1:
            result.valid = False
            result.errors.append("musicxml_constraints.divisions must be >= 1")

    if hasattr(constraints, "supported_durations") and constraints.supported_durations:
        valid = {"quarter", "eighth", "half", "whole", "16th"}
        for d in constraints.supported_durations:
            if d not in valid:
                result.warnings.append(f"unsupported duration type: {d}")

    return result


def _merge_result(base: ValidationResult, other: ValidationResult) -> ValidationResult:
    """Merge validation result into base."""
    base.valid = base.valid and other.valid
    base.errors.extend(other.errors)
    base.warnings.extend(other.warnings)
    return base
