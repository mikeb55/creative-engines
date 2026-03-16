"""
Studio Export Manager — Export composer outputs to organized folders.
"""

import os
import sys
from typing import Any, Dict, List, Optional

_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)

from shared_composer.engine_registry import get_engine, ensure_engines_loaded
from hybrid_engine.hybrid_musicxml_exporter import export_hybrid_to_musicxml
from orchestration_bridge.orchestration_bridge import orchestrate_composition
from orchestration_bridge.ensemble_musicxml_exporter import export_ensemble_to_musicxml
from songwriting_bridge.songwriting_bridge import build_lead_sheet_from_composition
from songwriting_bridge.lead_sheet_exporter import export_lead_sheet_to_musicxml

import json


def export_composer_outputs(
    finalists: List[Any],
    run_path: str,
    preset: Any,
) -> List[str]:
    """Export composition MusicXML files."""
    ensure_engines_loaded()
    out_dir = os.path.join(run_path, "compositions_musicxml")
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for i, f in enumerate(finalists):
        cand = f.compiled_result if hasattr(f, "compiled_result") else f
        compiled = cand.get("compiled") if isinstance(cand, dict) else cand
        if not compiled:
            continue
        if isinstance(cand, dict) and (cand.get("counterline_events") or cand.get("inner_voice_events")):
            xml = export_hybrid_to_musicxml(cand)
        else:
            mel = cand.get("melody_engine", "wayne_shorter") if isinstance(cand, dict) else "wayne_shorter"
            eng = get_engine(mel)
            xml = eng.export_musicxml(compiled)
        title = getattr(compiled, "title", "Untitled").replace(" ", "_")[:30]
        out_path = os.path.join(out_dir, f"composition_{i+1}_{title}.musicxml")
        with open(out_path, "w", encoding="utf-8") as fp:
            fp.write(xml)
        paths.append(out_path)
    return paths


def export_orchestrated_outputs(
    finalists: List[Any],
    run_path: str,
    ensemble_type: str,
    seed: int = 0,
) -> List[str]:
    """Export orchestrated ensemble MusicXML."""
    out_dir = os.path.join(run_path, "ensemble_musicxml")
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for i, f in enumerate(finalists):
        cand = f.compiled_result if hasattr(f, "compiled_result") else f
        arr = orchestrate_composition(
            cand.get("compiled") if isinstance(cand, dict) else cand,
            ensemble_type,
            seed=seed + i,
            hybrid_result=cand if isinstance(cand, dict) else None,
        )
        xml = arr.get("musicxml", export_ensemble_to_musicxml(arr))
        out_path = os.path.join(out_dir, f"ensemble_{i+1}.musicxml")
        with open(out_path, "w", encoding="utf-8") as fp:
            fp.write(xml)
        paths.append(out_path)
    return paths


def export_lead_sheet_outputs(
    finalists: List[Any],
    run_path: str,
    voice_type: str = "male_tenor",
) -> List[str]:
    """Export lead sheet MusicXML."""
    out_dir = os.path.join(run_path, "lead_sheets_musicxml")
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for i, f in enumerate(finalists):
        cand = f.compiled_result if hasattr(f, "compiled_result") else f
        compiled = cand.get("compiled") if isinstance(cand, dict) else cand
        if not compiled:
            continue
        lead = build_lead_sheet_from_composition(compiled, voice_type)
        xml = export_lead_sheet_to_musicxml(lead)
        title = getattr(compiled, "title", "Untitled").replace(" ", "_")[:30]
        out_path = os.path.join(out_dir, f"lead_sheet_{i+1}_{title}.musicxml")
        with open(out_path, "w", encoding="utf-8") as fp:
            fp.write(xml)
        paths.append(out_path)
    return paths


def export_run_summary(
    run_path: str,
    result: Dict[str, Any],
    exported_paths: Dict[str, List[str]],
) -> str:
    """Write run_summary.txt and finalists_summary.json."""
    lines = [
        f"Preset: {result.get('preset', '')}",
        f"Input: {result.get('input_text', '')}",
        f"Seed: {result.get('seed', 0)}",
        f"Finalists: {len(result.get('finalists', []))}",
        "",
        "Exported:",
    ]
    for kind, paths in exported_paths.items():
        lines.append(f"  {kind}: {len(paths)} files")
        for p in paths[:5]:
            lines.append(f"    - {p}")
    summary_path = os.path.join(run_path, "run_summary.txt")
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    finalists_data = []
    for f in result.get("finalists", []):
        fc = f.compiled_result if hasattr(f, "compiled_result") else f
        comp = fc.get("compiled") if isinstance(fc, dict) else fc
        finalists_data.append({
            "melody_engine": fc.get("melody_engine") if isinstance(fc, dict) else "",
            "score": getattr(f, "adjusted_score", 0),
        })
    json_path = os.path.join(run_path, "finalists_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"finalists": finalists_data}, f, indent=2)
    return summary_path
