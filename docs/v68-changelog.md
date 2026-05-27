## V68 Changelog

### P1 — RhythmToolbox + VRB Wiring + Gate Tests
- rhythmToolbox.js: analysePattern, comparePatterns,
  suggestVariation, patternToEuclidean
- RhythmToolboxPanel: analyse, compare, variation,
  Euclidean generator
- VRB: __off__ preset, header chip, vrbProfile wired
- DrumSelectionContext: applyToolboxPattern,
  applyToolboxVoiceLane
- Gate tests: 5 passing

### P2 — Fill Scheduler + SD Parser + Drum Staff
- fillScheduler.js: scheduleFills, 6 FILL_TYPES
- FillSchedulerPanel: density, fill type, bar preview
- sdParser.js: unpitched/multi-voice merge, safe defaults
- DrumStaffDisplay: Staff/Grid/Text/Hybrid modes
- Gate tests: SD parser 3 passing

### P3 — drumLoopPath + Chord Parser + Bugfixes
- drumLoopPath: file picker, IPC wiring, payload
- chordParser fixes: slash, altered dom, sus+ext, mMaj7
- Gate tests: chord parser 5 passing
- Bugfixes: MeterEditor validation, cent clamp,
  delete debounce, VRB decay floor

### Commit Hashes
- P1: f2a643bc
- P2: 481b067c
- P3: (pending — not on main at P4 closeout)
