# Wyble Etude Mode

## Status
Working — two-voice contrapuntal guitar, quarter-note motion, passes validation.

## What it generates
Two independent guitar voices based on Jimmy Wyble's contrapuntal concepts:
- Upper voice: stepwise melodic motion, chord tones, register-aware
- Lower voice: contrary motion bias, guide tones on strong beats
- Dyadic coordination at density-controlled beat positions

## How to use
1. Select Wyble Etude from preset dropdown
2. Enter 4–8 chord symbols separated by |
3. Click Generate
4. Open output in Sibelius or MuseScore

## Example chords
Dm9 | G13 | Cmaj9 | A7alt

## Architecture
- Bypasses Golden Path pipeline entirely
- Entry: engines/composer-os-v2/app-api/composerOsAppGeneration.ts (wyble_etude block)
- Bypass adapter: engines/composer-os-v2/core/goldenPath/wybleBypassGenerator.ts
- Generator: engines/jimmy-wyble-engine/wybleGenerator.ts (generateWybleEtude)
- Exporter: engines/jimmy-wyble-engine/wybleMusicXMLExporter.ts

## Key design decision
Wyble guitar bypasses the Composer OS pipeline. 
The pipeline destroys locked contrapuntal objects.
The bypass writes directly to MusicXML.

## Next
- Wyble Guitar/Bass Duo: add bass as third voice alongside Wyble guitar pair
