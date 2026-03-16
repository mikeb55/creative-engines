# Composer Studio — User Guide

## Quick Start

Run the full workflow: input → generate → rank → export:

```python
from composer_studio import run_composer_studio

result = run_composer_studio("My Tune", "wheeler_lyric", seed=0)
print(result["run_path"])
print(len(result["finalists"]))
```

## Presets

| Preset | Engine | Notes |
|--------|--------|-------|
| shorter_head | Wayne Shorter | Single engine |
| barry_bebop | Barry Harris | Single engine |
| hill_modern | Andrew Hill | Single engine |
| monk_rhythm | Monk | Single engine |
| bartok_night | Bartok Night | Single engine |
| wheeler_lyric | Wheeler Lyric | Single engine |
| frisell_atmosphere | Frisell Atmosphere | Single engine |
| scofield_holland | Scofield Holland | Single engine |
| stravinsky_pulse | Stravinsky Pulse | Single engine |
| zappa_disruption | Zappa Disruption | Single engine |
| messiaen_colour | Messiaen Colour | Single engine |
| slonimsky_harmonic | Slonimsky Harmonic | Single engine (requires engine) |
| hybrid_counterpoint | Shorter + Harris + Hill + Monk | Hybrid |
| chamber_jazz | Wheeler + Frisell + Bartok | Hybrid + orchestration |
| lead_sheet_song | Wheeler | Single + lead sheet |
| guitar_string_quartet | Frisell | Single + orchestration |

## Output Structure

```
outputs/composer_studio/studio_runs/<timestamp>/
  compositions_musicxml/
  ensemble_musicxml/
  lead_sheets_musicxml/
  summaries/
  metadata/
  run_summary.txt
  finalists_summary.json
```

## Launcher

Double-click `launchers/composer_studio_launcher.bat` for a default run.

## Appendix: 20 Useful Workflows

1. Wheeler lyric ballad
2. Frisell spacious study
3. Shorter modal head
4. Harris bebop line
5. Bartok night piece
6. Monk rhythmic sketch
7. Hill modern composition
8. Hybrid Shorter + Harris
9. Chamber jazz Wheeler + Frisell
10. Lead sheet Wheeler
11. Guitar quartet Frisell
12. Shorter + Monk hybrid
13. Harris + Hill hybrid
14. Bartok + Wheeler hybrid
15. Frisell + Bartok hybrid
16. Monk + Harris hybrid
17. Wheeler lead sheet female
18. Shorter orchestrated quintet
19. Hill string quartet
20. Bartok chamber sextet
