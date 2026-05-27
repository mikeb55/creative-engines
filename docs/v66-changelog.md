## V66 Changelog

### P1 — Section Editor UI + Meter UI + Tuning/Slonimsky UI
- SectionEditor: list, rename, add, delete, reorder sections
- MeterEditor: numerator/denominator, compound, additive,
  metric modulation
- TuningPanel: tuning system selector, Slonimsky pattern
  browser (12 patterns), per-section persist
- CompositionSongContext: Song model + active section
- slonimskyPatterns.js: 12 SLONIMSKY_PATTERNS
- Generate payload: song + section Slonimsky seed

### P2 — Drum Expansion + Named Presets
- Drummer engines: elvinJones, tonyWilliams, artBlakey,
  jackDeJohnette (4+ patterns each)
- drumPresets.js: 16 presets (brush + mambo/Afro-Cuban)
- DrummerPanel: drummer selector, pattern list, preset
  browser, 16-step grid display
- Generate payload: uiDrumPattern, song, grooveScaffold

### P3 — FZ Receipts + Deferred Engine + GBD + ECM VRB
- fzReceipts.js: 15 FZ_* receipts + FzReceiptsPanel
- deferredEngine.js: queue depth 8, QUEUE_FULL rejection,
  deferred:queued / deferred:complete events
- DeferredQueueIndicator in header
- SectionEditor: type dropdown (7 types), row colors,
  GBD flow strip
- ecmVrb.js: 6 ECM presets + VrbPanel with lock toggle
- API: fingerprintReceipt + vrbProfile in payload

### Commit Hashes
- P1: 0c66be7
- P2: f77eca7
- P3: 6ddd110
