## V67 Changelog

### P1 — Big Band UI + Drum Styles + String Quartet UI
- BigBandPanel: 4 sections (Trumpets/Trombones/Saxes/
  Rhythm), spread/register controls, soli + shout chorus
  toggles, 5 style presets
- bigBandDrums.js: 10 patterns across 5 band styles
- DrummerPanel: syncs to BigBand style selector
- StringQuartetPanel: 4 voices, technique selector,
  texture + style presets
- Generate payload: bigBandConfig, stringQuartetConfig

### P2 — Contrapuntal UI + Grid View
- ContrapuntalPanel: voice count, species per pair,
  cantus firmus controls, rules toggles, style presets
- GridView: piano-roll display of last generate result,
  zoom X/Y, voice filter, playhead
- Generate payload: contrapuntalConfig
- New tabs: Ensemble, Grid

### Commit Hashes
- P1: 144243f16ab3fe08ed33ed591c30cf2aa1ba61a1
- P2: 2b7ce2100754bfeecb9dc823c9258309cb4130ab
