"""
Messiaen Colour Composer IR Validator.
"""

from typing import List

try:
    from .composer_ir import ComposerIR
except ImportError:
    from composer_ir import ComposerIR


def validate_composer_ir(ir: ComposerIR) -> "ValidationResult":
    errors: List[str] = []
    if not (ir.title or "").strip():
        errors.append("title required")
    if not ir.section_order:
        errors.append("section_order required")
    return ValidationResult(valid=len(errors) == 0, errors=errors)


class ValidationResult:
    def __init__(self, valid: bool, errors: List[str]):
        self.valid = valid
        self.errors = errors or []
