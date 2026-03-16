"""
Scofield Holland Composer IR Validator.
"""

from typing import Any, List

try:
    from .composer_ir import ComposerIR
except ImportError:
    from composer_ir import ComposerIR


def validate_composer_ir(ir: Any) -> Any:
    """Validate ComposerIR. Returns object with valid, errors, warnings."""
    errors: List[str] = []
    warnings: List[str] = []
    if not hasattr(ir, "title") or not ir.title:
        errors.append("title required")
    if not hasattr(ir, "section_order") or not ir.section_order:
        errors.append("section_order required")
    if not hasattr(ir, "motivic_cells"):
        errors.append("motivic_cells required")
    if not hasattr(ir, "interval_language"):
        errors.append("interval_language required")
    if not hasattr(ir, "harmonic_field"):
        errors.append("harmonic_field required")
    return type("ValidationResult", (), {"valid": len(errors) == 0, "errors": errors, "warnings": warnings})()
