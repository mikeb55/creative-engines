"""Martino MusicXML MX readiness (1–5) for bridge + tests."""
from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

HARMONY_FORBIDDEN_ATTRS = frozenset(
    {"default_y", "relative_y", "default_x", "relative_x", "placement"}
)
HARMONY_ALLOWED_CHILD_TAGS = frozenset({"root", "kind", "bass", "degree"})


def _local_tag(elem: ET.Element) -> str:
    tag = elem.tag
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def score_musicxml_path(path: Path) -> tuple[int, list[str]]:
    """Return (readinessScore 0–5, failure messages)."""
    issues: list[str] = []
    checks: list[bool] = []

    if not path.is_file():
        return 0, [f"missing file: {path}"]

    try:
        tree = ET.parse(path)
        root = tree.getroot()
    except ET.ParseError as exc:
        return 0, [f"parse error: {exc}"]

    checks.append(_local_tag(root) == "score-partwise")
    if not checks[-1]:
        issues.append(f"root element is <{_local_tag(root)}>, expected score-partwise")

    parts = [e for e in root.iter() if _local_tag(e) == "part"]
    measures = [e for e in root.iter() if _local_tag(e) == "measure"]
    harmonies = [e for e in root.iter() if _local_tag(e) == "harmony"]
    checks.append(bool(parts) and bool(measures) and bool(harmonies))
    if not checks[-1]:
        issues.append(
            f"structure: parts={len(parts)} measures={len(measures)} harmonies={len(harmonies)}"
        )

    bad_roots = False
    for h in harmonies:
        root_step_el = None
        for child in h:
            if _local_tag(child) == "root":
                for rc in child:
                    if _local_tag(rc) == "root-step":
                        root_step_el = rc
                        break
        if root_step_el is not None:
            text = (root_step_el.text or "").strip()
            if len(text) != 1 or text not in "ABCDEFG":
                bad_roots = True
                issues.append(f"harmony root-step invalid: {text!r} (must be single A–G letter)")

    bad_attrs = False
    bad_children = False
    for h in harmonies:
        for attr in h.attrib:
            bad_attrs = True
            if attr in HARMONY_FORBIDDEN_ATTRS:
                issues.append(f"harmony has forbidden attribute {attr!r}")
            else:
                issues.append(f"harmony has non-standard attribute {attr!r}")
        for child in h:
            if _local_tag(child) not in HARMONY_ALLOWED_CHILD_TAGS:
                bad_children = True
                issues.append(f"harmony has non-standard child <{_local_tag(child)}>")

    checks.append(not bad_roots)
    checks.append(not bad_attrs)
    checks.append(not bad_children)
    checks.append(path.stat().st_size > 0)

    score = sum(1 for ok in checks if ok)
    return min(5, score), issues
