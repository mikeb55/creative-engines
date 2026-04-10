import argparse
import json
import os
import sys
import types

# Resolve `songwriting_bridge` as a package (so relative imports in submodules work).
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, ".."))
from songwriting_bridge import build_lead_sheet_from_composition, export_lead_sheet_to_musicxml


def compiled_from_payload(payload: dict):
    """
    Sections must be objects with attributes; melody_events / harmony stay list[dict]
    (Python adapters use event.get(...) on dicts).
    """
    title = payload.get("title", "Untitled")
    sections = []
    for sec in payload.get("sections", []):
        if not isinstance(sec, dict):
            continue
        sections.append(
            types.SimpleNamespace(
                role=sec.get("role", "verse"),
                bar_start=int(sec.get("bar_start", 0)),
                bar_end=int(sec.get("bar_end", 0)),
                melody_events=list(sec.get("melody_events", [])),
                harmony=list(sec.get("harmony", [])),
            )
        )
    return types.SimpleNamespace(title=title, sections=sections)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--voice", default="male_tenor")
    args = parser.parse_args()
    with open(args.input, "r", encoding="utf-8") as f:
        payload = json.load(f)
    compiled = compiled_from_payload(payload if isinstance(payload, dict) else {})
    lead_sheet = build_lead_sheet_from_composition(compiled, args.voice)
    xml = export_lead_sheet_to_musicxml(lead_sheet)
    print(xml)
