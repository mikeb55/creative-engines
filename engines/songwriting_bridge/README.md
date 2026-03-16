# Songwriting Bridge

Build lead sheets from compiled compositions: vocal melody, chord symbols, lyric placeholders, form summary.

## Usage

```python
from songwriting_bridge import build_lead_sheet_from_composition, export_lead_sheet_to_musicxml

lead_sheet = build_lead_sheet_from_composition(compiled, voice_type="male_tenor")
xml = export_lead_sheet_to_musicxml(lead_sheet)
```
