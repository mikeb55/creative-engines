"""
Composer Engine Interface — Standard interface for all composer engines.
"""

from abc import ABC, abstractmethod
from typing import Any, List


class ComposerEngine(ABC):
    """Base class for composer engines. Hybrid engines call these without engine-specific code."""

    engine_name: str = ""
    supported_profiles: List[str] = []
    supported_forms: List[str] = []

    @abstractmethod
    def generate_ir(self, input_text: str, mode: str = "title", seed: int = 0, **kwargs) -> Any:
        """Generate ComposerIR from input. mode: 'title' or 'premise'."""
        pass

    @abstractmethod
    def compile_from_ir(self, ir: Any) -> Any:
        """Compile IR to CompiledComposition."""
        pass

    @abstractmethod
    def export_musicxml(self, compiled: Any) -> str:
        """Export compiled composition to MusicXML string."""
        pass

    @abstractmethod
    def validate_ir(self, ir: Any) -> Any:
        """Validate IR. Returns ValidationResult with valid, errors, warnings."""
        pass
