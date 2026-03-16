# Songwriting Engine — Implementation Report

## Files Created

| File | Purpose |
|------|---------|
| runtime/songwriting_engine_runtime.py | Main orchestration, load rules from sibling repo, generate_song(), export |
| runtime/song_generator.py | Full pipeline: sections → harmony → melody → lyrics → hooks |
| runtime/section_generator.py | Section structure from rules (verse, chorus, bridge, etc.) |
| runtime/melody_generator.py | Vocal melody, motifs (max 3), range validation |
| runtime/lyric_generator.py | Role-aware lyrics, prosody alignment |
| runtime/hook_generator.py | Hook detection, chorus requirement, recurrence |
| runtime/evaluation_adapter.py | GCE evaluation from rule weights, pass/warning/fail |
| runtime/repair_engine.py | Targeted repair (weak_hook, poor_prosody, etc.) |
| runtime/musicxml_exporter.py | MusicXML lead sheet, lyrics, section markers, melisma |
| runtime/engine_launcher.py | CLI entry point, --dev for tests |
| runtime/runtime_tests.py | Basic tests: section, vocal range, hook, prosody, export |
| runtime/requirements.txt | PyYAML dependency |
| runtime/__init__.py | Package exports |
| __init__.py | Engine package |

## Rule Package Path (Sibling Repo)

- **Rules path:** `../creative-rule-engines/engines/songwriting_engine/`
- Resolved via: `Path(__file__).parent.parent.parent.parent.parent / "creative-rule-engines" / "engines" / "songwriting_engine"`
- **Requirement:** creative-rule-engines must be a sibling of creative-engines under the same parent folder.

## Usage

```bash
cd creative-engines/engines/songwriting_engine/runtime
pip install -r requirements.txt
python engine_launcher.py --profiles McCartney --export
python engine_launcher.py --dev  # Run basic tests
```
