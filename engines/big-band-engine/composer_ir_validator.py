"""
Big Band Composer IR Validator — Structured validation.
"""

from dataclasses import dataclass, is_dataclass
from typing import Any, List

try:
    from .composer_ir import ComposerIR
except ImportError:
    from composer_ir import ComposerIR


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
    if result.valid:
        result = _merge(result, validate_musicxml_constraints(composer_ir))
    return result


def validate_form_plan(composer_ir: Any) -> ValidationResult:
    """Validate section roles/order, usable phrase plans, density/sectional plans, asymmetry."""
    r = ValidationResult(valid=True)
    order = getattr(composer_ir, "section_order", [])
    roles = getattr(composer_ir, "section_roles", {})
    for k in roles:
        if k not in order:
            r.valid = False
            r.errors.append(f"section_roles key '{k}' not in section_order")
    pp = getattr(composer_ir, "phrase_plan", None)
    if pp and hasattr(pp, "phrase_lengths") and pp.phrase_lengths:
        for L in pp.phrase_lengths:
            if L < 1:
                r.valid = False
                r.errors.append("phrase_lengths must be >= 1")
    density = getattr(composer_ir, "density_plan", {})
    for k, v in (density or {}).items():
        if not (0 <= v <= 1):
            r.warnings.append(f"density_plan[{k}] should be 0-1, got {v}")
    asym = getattr(composer_ir, "asymmetry_profile", "")
    if asym and asym != "explicit":
        r.warnings.append("asymmetry_profile should be 'explicit' for big band")
    return r


def validate_interval_language(composer_ir: Any) -> ValidationResult:
    """Validate interval language."""
    r = ValidationResult(valid=True)
    il = getattr(composer_ir, "interval_language", None)
    if il and hasattr(il, "primary_intervals") and il.primary_intervals:
        for i in il.primary_intervals:
            if abs(i) > 12:
                r.warnings.append(f"interval {i} outside typical range")
    return r


def validate_harmonic_field(composer_ir: Any) -> ValidationResult:
    """Validate harmonic field."""
    r = ValidationResult(valid=True)
    hf = getattr(composer_ir, "harmonic_field", None)
    if hf and hasattr(hf, "centers") and not hf.centers:
        r.warnings.append("harmonic_field.centers empty")
    return r


def validate_phrase_plan(composer_ir: Any) -> ValidationResult:
    """Validate phrase plan."""
    r = ValidationResult(valid=True)
    pp = getattr(composer_ir, "phrase_plan", None)
    if pp and hasattr(pp, "phrase_lengths"):
        pl = pp.phrase_lengths or []
        if pl and not all(L >= 1 for L in pl):
            r.valid = False
            r.errors.append("phrase_lengths must all be >= 1")
    return r


def validate_musicxml_constraints(composer_ir: Any) -> ValidationResult:
    """Validate MusicXML constraints."""
    r = ValidationResult(valid=True)
    mc = getattr(composer_ir, "musicxml_constraints", None)
    if mc and hasattr(mc, "divisions"):
        if mc.divisions < 1:
            r.valid = False
            r.errors.append("musicxml_constraints.divisions must be >= 1")
    return r


def _merge(base: ValidationResult, other: ValidationResult) -> ValidationResult:
    base.valid = base.valid and other.valid
    base.errors.extend(other.errors)
    base.warnings.extend(other.warnings)
    return base
