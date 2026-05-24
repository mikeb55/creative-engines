# Composer OS — V63 Roadmap
Status: pending · V62 closed 2026-05-23

## V62 final baseline
Smoke: fast 273/65/0 · full 438/79/0
Last commit: 0f0d6fee
Desktop: Composer-OS.exe + Composer-OS-Setup.exe clean

## Goal
Promote stub voices to real engine implementations.
Remove ⚠ badges as each voice earns a real slice or VRB.

## 6 prompts in order

### 1. S1 — mccoy_tyner engine implementation
Mode: Song Mode
Current: stub (planning only, no slice)
Target: full *Slice.ts + profile/registry + locked harmony routing
Done when: mccoy_tyner generates measurably distinct output vs generic fallback.
Golden fixture required. ⚠ badge removed on pass.

### 2. S2 — wes_montgomery engine implementation
Mode: GBD
Current: stub (Slonimsky macro only)
Target: VRB tuned to lyrical/riff profile + registry entry
Done when: wes_montgomery output differs measurably from nile_rodgers at same chord input.
Golden fixture required. ⚠ badge removed on pass.

### 3. S3 — joe_pass engine implementation
Mode: GBD
Current: stub (Slonimsky macro only)
Target: VRB tuned to lyrical/chromatic profile + registry entry
Done when: joe_pass output differs measurably from larry_carlton at same chord input.
Golden fixture required. ⚠ badge removed on pass.

### 4. S4 — allan_holdsworth + scott_henderson engine implementation
Mode: GBD
Current: both stub
Target: VRBs tuned to chromatic/angular and angular/riff profiles respectively
Done when: both produce measurably distinct output. Two golden fixtures required.
⚠ badges removed on pass.

### 5. S5 — sonic_youth dedicated VRB
Mode: Song Mode (already deep slice)
Current: deep engine, generic VRB, ⚠ in UI
Target: VRB tuned to sonic_youth style (dissonant/angular/unconventional structure)
Done when: sonic_youth output differs measurably from generic VRB fallback.
Golden fixture required. ⚠ badge removed on pass.

### 6. S6 — V63 smoke + fixtures + desktop + roadmap
UI/boundary goldens for all promoted voices.
Update smoke targets.
Rebuild desktop.
Update roadmap header.
This is the ONLY prompt permitted to add new smoke rows.

## Rules
- Smoke after every prompt
- No new smoke suites until S6
- No ⚠ badge removed without confirmed engine implementation + golden
- Musician guide updated when any voice is promoted
- Golden fixture required before marking any item done

## Backlog (V64+)
- Zappa GCE structural fingerprint
- 15 FZ_* receipt stubs
- Per-section VRB
- Fretboard view
- MusicXML import depth
- Sibelius QA per mode
