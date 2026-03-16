"""
Composer IR Validator — Structured validation.
"""

from dataclasses import dataclass, is_dataclass
from typing import Any, List

try:
    from .composer_ir import ComposerIR, SectionPlan
except ImportError:
    from composer_ir import ComposerIR, SectionPlan

HILL_VALID_MOTION = {"cluster_based", "ambiguous_modal", "nonfunctional_cycle", "pedal_center"}


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
    r = ValidationResult(valid=True)
    order = getattr(composer_ir, "section_order", [])
    roles = getattr(composer_ir, "section_roles", {})
    if "primary" not in order and "return" not in order:
        r.valid = False
        r.errors.append("at least one primary or return section required")
    for k in roles:
        if k not in order:
            r.valid = False
            r.errors.append(f"section_roles key '{k}' not in section_order")
    return r


def validate_interval_language(composer_ir: Any) -> ValidationResult:
    r = ValidationResult(valid=True)
    il = getattr(composer_ir, "interval_language", None)
    if not il:
        r.warnings.append("interval_language missing")
        return r
    return r


def validate_harmonic_field(composer_ir: Any) -> ValidationResult:
    r = ValidationResult(valid=True)
    hf = getattr(composer_ir, "harmonic_field", None)
    if not hf:
        r.warnings.append("harmonic_field missing")
        return r
    if hasattr(hf, "centers") and not hf.centers:
        r.warnings.append("harmonic_field.centers empty")
    if hasattr(hf, "motion_type") and hf.motion_type and hf.motion_type not in HILL_VALID_MOTION:
        r.warnings.append(f"harmonic motion type '{hf.motion_type}' not in Hill set")
    return r


def validate_phrase_plan(composer_ir: Any) -> ValidationResult:
    r = ValidationResult(valid=True)
    pp = getattr(composer_ir, "phrase_plan", None)
    if not pp:
        return r
    if hasattr(pp, "phrase_lengths") and pp.phrase_lengths:
        for L in pp.phrase_lengths:
            if L < 1 or L > 16:
                r.warnings.append(f"phrase length {L} outside 1-16 bars")
    return r


def validate_musicxml_constraints(c: Any) -> ValidationResult:
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
