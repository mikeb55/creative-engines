# Generation Receipts and Diagnostics

## Status

Composer OS now shows chord export diagnostics directly in the Generation receipt UI.

For **Guitar/Bass Duo** polyphony, **Voice 2 diagnostics** (Phase 18.2B.1) also appear in the receipt when available: bar coverage, note density, rest gaps, activity runs, and strong-beat vs offbeat entries — read-only; see root [CHANGELOG.md](../CHANGELOG.md) (V9.0 – Phase 18.2B.1).

## What is shown

- Chords parsed
- Fallbacks used
- Sibelius simplification flags
- Slash-bass bars
- Export-target note:
  - GP8 is primary detailed chord-validation target
  - Sibelius is accepted as simplification-prone fallback

## Purpose

This removes guesswork when validating chord export results and makes simplification/fallback behaviour visible after generation.

## Current interpretation

- Fallbacks used = 0 means no internal degradation/fallback occurred
- Sibelius simplification flags > 0 means display simplification is expected in Sibelius, not an engine parsing failure
- Slash-bass bars confirms slash chords were preserved in export

## Roadmap update

- **#17 Diagnostics / Receipt Clarity** → **DONE**
