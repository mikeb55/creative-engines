"""
Composer Session Manager — Manage generation sessions.
"""

import uuid
from typing import Any, List, Optional

from .composer_project_types import (
    ComposerProject,
    ComposerSession,
    GenerationBatch,
    GeneratedComposition,
    SelectedComposition,
)
from .composer_generation_manager import run_generation


def create_session(
    project: ComposerProject,
    idea: str,
    preset_name: str,
    seed: int = 0,
) -> ComposerSession:
    """
    Create a new session. Does not run generation yet.
    """
    session_id = str(uuid.uuid4())[:8]
    session = ComposerSession(
        session_id=session_id,
        idea=idea,
        preset_name=preset_name,
        seed=seed,
    )
    project.sessions.append(session)
    project.idea = idea
    project.preset_name = preset_name
    return session


def run_generation_session(
    session: ComposerSession,
    population_size: int = 8,
    finalist_count: int = 3,
) -> GenerationBatch:
    """
    Run generation for session. Uses Composer Studio.
    Stores candidates in session.batch.
    """
    batch = run_generation(
        idea=session.idea,
        preset_name=session.preset_name,
        seed=session.seed,
        population_size=population_size,
        finalist_count=finalist_count,
    )
    session.batch = batch
    return batch


def rank_session_candidates(session: ComposerSession) -> List[GeneratedComposition]:
    """
    Rank candidates. Already done in run_generation_session.
    Returns ranked list.
    """
    if not session.batch:
        return []
    return session.batch.candidates


def select_session_winner(
    session: ComposerSession,
    index: int,
) -> Optional[SelectedComposition]:
    """
    Select composition at index as winner.
    """
    if not session.batch or not session.batch.candidates:
        return None
    if index < 0 or index >= len(session.batch.candidates):
        return None
    comp = session.batch.candidates[index]
    session.selected_index = index
    session.selected_composition = SelectedComposition(
        session_id=session.session_id,
        composition_index=index,
        composition=comp,
    )
    return session.selected_composition
