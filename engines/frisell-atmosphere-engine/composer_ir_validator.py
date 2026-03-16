"""
Frisell Atmosphere Composer IR Validator — Structured validation.
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
        result = _merge(result, _validate_form(composer_ir))
    if result.valid:
        result = _merge(result, _validate_harmonic(composer_ir))
    return result


def _validate_form(composer_ir: Any) -> ValidationResult:
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


def _validate_harmonic(composer_ir: Any) -> ValidationResult:
    r = ValidationResult(valid=True)
    hf = getattr(composer_ir, "harmonic_field", None)
    if hf and hasattr(hf, "centers") and not hf.centers:
        r.warnings.append("harmonic_field.centers empty")
    return r


def _merge(base: ValidationResult, other: ValidationResult) -> ValidationResult:
    base.valid = base.valid and other.valid
    base.errors.extend(other.errors)
    base.warnings.extend(other.warnings)
    return base
