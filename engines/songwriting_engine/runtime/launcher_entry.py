"""
Launcher Entry — Windows launcher entry point.
Stable interface for .bat launcher. Saves outputs to outputs/songwriting_engine/.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from .launcher_config import get_launcher_defaults, get_output_directory_defaults
    from .songwriting_engine_runtime import run_songwriting_engine
except ImportError:
    from launcher_config import get_launcher_defaults, get_output_directory_defaults
    from songwriting_engine_runtime import run_songwriting_engine

_LAST_RUN: Optional[Dict[str, Any]] = None


def _repo_root() -> Path:
    """Repo root (creative-engines)."""
    return Path(__file__).resolve().parent.parent.parent.parent


def _output_base() -> Path:
    """Base output directory."""
    return _repo_root() / "outputs" / "songwriting_engine"


def run_launcher_generation(
    input_text: str,
    mode: str = "title",
    count: int = 12,
    finalist_limit: int = 5,
    seed: int = 0,
) -> Dict[str, Any]:
    """
    Run the full Song IR pipeline. Returns result dict.
    """
    global _LAST_RUN
    result = run_songwriting_engine(
        input_text=input_text,
        mode=mode,
        count=count,
        finalist_limit=finalist_limit,
        seed=seed,
    )
    _LAST_RUN = {"result": result, "input_text": input_text, "mode": mode, "seed": seed}
    return result


def save_launcher_outputs(result: Dict[str, Any], output_dir: Optional[Path] = None) -> Path:
    """
    Save outputs to output_dir. Creates timestamped subfolder.
    Returns path to the run folder.
    """
    base = Path(output_dir) if output_dir else _output_base()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_folder = base / f"run_{timestamp}"
    run_folder.mkdir(parents=True, exist_ok=True)

    musicxml_folder = run_folder / "finalists_musicxml"
    musicxml_folder.mkdir(exist_ok=True)

    finalists = result.get("finalists_compiled", [])
    musicxml_list = result.get("finalists_musicxml", [])

    for i, (item, xml) in enumerate(zip(finalists, musicxml_list)):
        if xml:
            c = item.get("compiled")
            title = getattr(c, "title", f"finalist_{i}") if c else f"finalist_{i}"
            safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in str(title))[:50]
            path = musicxml_folder / f"{safe_name}_{i}.musicxml"
            path.write_text(xml, encoding="utf-8")

    titles = []
    for item in finalists:
        c = item.get("compiled")
        titles.append(getattr(c, "title", "finalist") if c else "finalist")
    summary = {
        "input_text": _LAST_RUN.get("input_text", "") if _LAST_RUN else "",
        "mode": _LAST_RUN.get("mode", "title") if _LAST_RUN else "title",
        "seed": _LAST_RUN.get("seed", 0) if _LAST_RUN else 0,
        "archive_stats": result.get("archive_stats", {}),
        "finalist_count": len(finalists),
        "finalist_titles": titles,
    }
    (run_folder / "finalists_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    run_txt = [
        f"Run: {timestamp}",
        f"Input: {summary['input_text']}",
        f"Mode: {summary['mode']}",
        f"Finalists: {summary['finalist_count']}",
        f"Archive stats: {summary['archive_stats']}",
        "",
        "Exported files:",
    ]
    for f in sorted(musicxml_folder.glob("*.musicxml")):
        run_txt.append(f"  - {f.name}")
    (run_folder / "run_summary.txt").write_text("\n".join(run_txt), encoding="utf-8")

    return run_folder


def get_launcher_status() -> Dict[str, Any]:
    """Current launcher status."""
    return {
        "last_run": _LAST_RUN is not None,
        "output_base": str(_output_base()),
        "output_base_exists": _output_base().exists(),
    }


if __name__ == "__main__":
    defaults = get_launcher_defaults()
    result = run_launcher_generation(
        input_text=defaults["input_text"],
        mode=defaults["mode"],
        count=defaults["count"],
        finalist_limit=defaults["finalist_limit"],
        seed=defaults["seed"],
    )
    folder = save_launcher_outputs(result)
    print(f"Outputs saved to: {folder}")
