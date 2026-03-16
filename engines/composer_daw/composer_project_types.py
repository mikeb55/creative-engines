"""
Composer Project Types — Core data structures for Composer DAW.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime


@dataclass
class GeneratedComposition:
    """Single generated composition candidate."""
    compiled: Any
    melody_engine: str = ""
    harmony_engine: str = ""
    score: float = 0.0
    rank: int = 0
    raw_candidate: Any = None  # HybridCandidate or dict


@dataclass
class GenerationBatch:
    """One generation run: idea, preset, seed, candidates."""
    idea: str
    preset_name: str
    seed: int
    candidates: List[GeneratedComposition] = field(default_factory=list)
    ranked: List[Any] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class SelectedComposition:
    """Chosen composition from a session."""
    session_id: str
    composition_index: int
    composition: GeneratedComposition
    selected_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ExportRecord:
    """Record of an export operation."""
    export_type: str  # composition, ensemble, lead_sheet
    file_path: str
    session_id: str
    exported_at: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ComposerSession:
    """One creative generation cycle."""
    session_id: str
    idea: str
    preset_name: str
    seed: int
    batch: Optional[GenerationBatch] = None
    selected_index: Optional[int] = None
    selected_composition: Optional[SelectedComposition] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ComposerProject:
    """Composer DAW project."""
    name: str
    project_path: str
    idea: str = ""
    preset_name: str = "wheeler_lyric"
    generation_settings: Dict[str, Any] = field(default_factory=dict)
    sessions: List[ComposerSession] = field(default_factory=list)
    export_history: List[ExportRecord] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
