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
    print("DEBUG PAYLOAD KEYS:", list(payload.keys()))

    # Also check top-level and nested for any melody/notes/events data
    def find_melody_keys(obj, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if any(x in k.lower() for x in ["melody", "note", "event", "pitch", "measure"]):
                    print(f"DEBUG found: {path}.{k} ({type(v).__name__}, len={len(v) if hasattr(v, '__len__') else 'n/a'})")
                find_melody_keys(v, f"{path}.{k}")
        elif isinstance(obj, list) and len(obj) > 0:
            find_melody_keys(obj[0], f"{path}[0]")

    find_melody_keys(payload)
    compiled = compiled_from_payload(payload if isinstance(payload, dict) else {})
    for i, sec in enumerate(getattr(compiled, "sections", [])):
        evs = getattr(sec, "melody_events", [])
        print(f"DEBUG section {i}: {len(evs)} melody_events")
        for e in evs[:3]:
            print(f"  {e}")
    lead_sheet = build_lead_sheet_from_composition(compiled, args.voice)
    xml = export_lead_sheet_to_musicxml(lead_sheet)
    print(xml)
