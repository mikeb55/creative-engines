"""
Composer IR Validator — Structured validation, clear errors.
"""

from dataclasses import dataclass, is_dataclass
from typing import Any, List

try:
    from .composer_ir import ComposerIR, MotivicCell, IntervalLanguage, HarmonicField, PhrasePlan
except ImportError:
    from composer_ir import ComposerIR, MotivicCell, IntervalLanguage, HarmonicField, PhrasePlan


@dataclass
class ValidationResult:
    valid: bool
    errors: List[str] = None
    warnings: List[str] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []


def validate_composer_ir(composer_ir: Any) -> ValidationResult:
    """Validate full Composer IR."""
    result = ValidationResult(valid=True)
    if not is_dataclass(composer_ir):
        result.valid = False
        result.errors.append("composer_ir must be a ComposerIR dataclass")
        return result
    if not getattr(composer_ir, "title", ""):
        result.valid = False
        result.errors.append("title is required and non-empty")
    if not getattr(composer_ir, "section_order", []):
        result.valid = False
        result.errors.append("section_order is required")
    if result.valid:
        result = _merge(result, validate_form_plan(composer_ir))
    if result.valid:
        result = _merge(result, validate_interval_language(composer_ir))
    if result.valid:
        result = _merge(result, validate_harmonic_field(composer_ir))
    if result.valid:
        result = _merge(result, validate_phrase_plan(composer_ir))
    if result.valid and hasattr(composer_ir, "musicxml_constraints"):
        result = _merge(result, validate_musicxml_constraints(composer_ir.musicxml_constraints))
    return result


def validate_form_plan(composer_ir: Any) -> ValidationResult:
    """Validate form plan, section order, section roles."""
    r = ValidationResult(valid=True)
    order = getattr(composer_ir, "section_order", [])
    roles = getattr(composer_ir, "section_roles", {})
    valid_roles = {"primary", "contrast", "return", "intro", "coda"}
    if "primary" not in order and "return" not in order:
        r.valid = False
        r.errors.append("at least one primary or return section required")
    for s in order:
        if s not in valid_roles and s not in roles:
            r.warnings.append(f"section '{s}' not in standard roles")
    for k in roles:
        if k not in order:
            r.valid = False
            r.errors.append(f"section_roles key '{k}' not in section_order")
    return r


def validate_interval_language(composer_ir: Any) -> ValidationResult:
    """Validate interval language."""
    r = ValidationResult(valid=True)
    il = getattr(composer_ir, "interval_language", None)
    if not il:
        r.warnings.append("interval_language missing, using defaults")
        return r
    if hasattr(il, "primary_intervals") and il.primary_intervals:
        for i in il.primary_intervals:
            if abs(i) > 12:
                r.warnings.append(f"interval {i} outside typical range")
    return r


def validate_harmonic_field(composer_ir: Any) -> ValidationResult:
    """Validate harmonic field."""
    r = ValidationResult(valid=True)
    hf = getattr(composer_ir, "harmonic_field", None)
    if not hf:
        r.warnings.append("harmonic_field missing")
        return r
    if hasattr(hf, "centers") and not hf.centers:
        r.warnings.append("harmonic_field.centers empty")
    valid_motion = {"ambiguous_modal", "nonfunctional_cycle", "blues_shadowed", "major_third_axis", "suspended_dark", "mixed_tonic_centers"}
    if hasattr(hf, "motion_type") and hf.motion_type and hf.motion_type not in valid_motion:
        r.warnings.append(f"harmonic motion type '{hf.motion_type}' not in known set")
    return r


def validate_phrase_plan(composer_ir: Any) -> ValidationResult:
    """Validate phrase plan, asymmetry allowed."""
    r = ValidationResult(valid=True)
    pp = getattr(composer_ir, "phrase_plan", None)
    if not pp:
        return r
    if hasattr(pp, "phrase_lengths") and pp.phrase_lengths:
        for L in pp.phrase_lengths:
            if L < 1 or L > 16:
                r.warnings.append(f"phrase length {L} outside typical 1-16 bars")
    return r


def validate_musicxml_constraints(c: Any) -> ValidationResult:
    """Validate MusicXML constraints."""
    r = ValidationResult(valid=True)
    if not c:
        return r
    if hasattr(c, "divisions") and c.divisions is not None and c.divisions < 1:
        r.valid = False
        r.errors.append("musicxml_constraints.divisions must be >= 1")
    return r


def _merge(base: ValidationResult, other: ValidationResult) -> ValidationResult:
    base.valid = base.valid and other.valid
    base.errors.extend(other.errors)
    base.warnings.extend(other.warnings)
    return base
