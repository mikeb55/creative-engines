# Wyble Etude Mode

## What it is
A two-voice contrapuntal guitar etude generator based on Jimmy Wyble's 
contrapuntal concepts. Generates independent upper and lower guitar voices
with contrary motion, interval logic, and harmonic awareness.

## How it works
- Bypasses Golden Path pipeline entirely
- Calls jimmy-wyble-engine directly
- Exports MusicXML with two independent guitar voices
- No bass part in Etude mode

## Usage
1. Select "Wyble Etude" from preset dropdown
2. Enter chord progression (4-8 chords)
3. Click Generate
4. Open output in Sibelius or MuseScore

## Files
- engines/composer-os-v2/core/goldenPath/wybleBypassGenerator.ts — bypass adapter
- engines/jimmy-wyble-engine/ — standalone Wyble engine
- engines/composer-os-v2/app-api/composerOsAppGeneration.ts — preset routing

## Next
- Wyble Guitar/Bass Duo mode (Wyble guitar + bass third voice)
