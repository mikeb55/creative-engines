# Wyble Etude Mode

## Status

Stable generation and MusicXML export working.

## Wyble Etude — Current Status

### Achieved

* Two-voice guitar polyphony (single staff)
* Correct MusicXML export (voices render properly in Sibelius/Guitar Pro)
* Rhythmic independence via beat-offset lower voice
* Presence variation (lower voice enters/exits musically)

### Current Behaviour

* Upper voice = primary melodic line
* Lower voice = intermittent contrapuntal line
* Voices are rhythmically independent and no longer collapse into chord stacks

### Known Limitations

* Interval behaviour is still basic
* Motion between voices can feel too symmetrical
* Lower voice lacks strong melodic identity

### Next Step

* Introduce contrary motion and interval personality rules

## What Works

* Two-voice counterpoint generation (Jimmy Wyble engine)
* Valid MusicXML export (Sibelius/MuseScore compatible)
* Bar math and validation passing
* Reproducible output via Composer OS desktop

## Current Limitations

* Rendered as piano grand staff (temporary)
* Guitar polyphonic single-staff rendering not yet implemented
* Lower voice density improved but still evolving
* Not yet integrated into Guitar-Bass Duo mode

## Technical Notes

* phraseLength = bars (not density control)
* Lower voice density controlled in deriveDyadsFromVoices
* Export path currently uses Wyble bypass generator
* Validation pipeline confirmed stable

## Next Steps

* Convert output to single-staff guitar polyphony (voice 1 + voice 2)
* Introduce bass as separate staff (true duo rendering)
* Refine lower voice continuity and phrasing
* Integrate into main Composer OS generation pipeline
