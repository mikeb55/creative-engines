# Psychopathology & Synthesis (PET Training)

Two-day postgraduate psychotherapy training (10:00–17:00, UK) focused on:

* Borderline presentations (relational instability, identity tension)
* Intersubjectivity and projective identification (dependency, power, sexuality, ingratiation)
* Risk assessment under uncertainty
* Neurodiversity, trauma, dissociation
* Psychosynthesis (parts, I–Self, disidentification, meaning alongside risk)

## Structure

* Day 1: framing ? risk ? Leah ? break ? neurodiversity ? Ousmane ? video ? lunch ? applied practice ? break ? close
* Day 2: opening ? trauma & ADHD overlap ? break ? dissociation ? Emily ? video ? clinical response ? lunch ? risk teaching ? video ? break ? Michael ? integration ? close

## Teaching Model (ACE 100)

* Authority (45): structure, current clinical content, psychosynthesis integrated
* Containment (25): risk handled calmly, ethics and context explicit
* Engagement (30): cases, tasks, reflection, videos

## Case Studies

Location:
Psychopathology and Synthesis 2026\CASE STUDIES

* Leah — shame, risk, family pressure
* Ousmane — neurodiversity, executive load, safeguarding
* Emily — dissociation, inconsistent risk account
* Michael — ambiguity, escalation decisions

Each follows ACE-Cases (100-point rubric).

## Media

Three videos (links in speaker notes only):

* Neurodiversity (Day 1 PM)
* Dissociation (Day 2 AM)
* Suicide conversation (Day 2 PM)

## Current Version

V4.6

* Corrected temporal structure (Day 1 vs Day 2)
* Proper placement of breaks and lunches (2×20 min breaks/day, 1× lunch/day)
* Clean video integration (3 points only)
* Improved pacing and energy distribution
* Minor refinements to clinical emphasis (risk, documentation, supervision)


## Charlie Parker Engine

Generates Charlie Parker-style bebop melodies over chord changes using the Claude API.

### Architecture
- **Generation unit:** Full 32-bar chorus in single GCE call, fallback to 8-bar sections
- **GCE prompt:** Bird-specific rules  anticipation, offbeat starts, ii-V-I entry/exit degrees, leap+compensation, turnaround chains
- **Temperature:** 1.2
- **System prompt:** "You are Charlie Parker's fingers on the alto saxophone"
- **RAG:** 10 abstract Parker phrase templates + concrete note sequences from 8 transcriptions
- **Transcriptions:** Ko-Ko, Anthropology, Donna Lee, Now's The Time, Billie's Bounce, Ornithology, Confirmation, Lou Donaldson (Birdland 1954)

### Post-generation Validators (in order)
1. _patch_unison_runs  eliminates clusters of 3+ identical consecutive pitches
2. _cap_unison_frequency  caps unisons at 3% of all intervals
3. _enforce_opening_rest  section openings (bars 1/9/17/25) start on rest
4. _enforce_syncopation  40%+ of interior bars start on offbeat
5. _enforce_midphrase_quarter  quarter note landings mid-phrase (~50% of interior bars)
6. _enforce_cadence_quarter  every 4th bar has quarter note or longer
7. _enforce_long_note_consonance  notes longer than eighth must be strict chord tones
8. _enforce_downbeat_consonance  non-chord-tone on beat 1 ? syncopation rest inserted
9. _enforce_no_chord_contradictions  removes mode-contradicting notes from long values
10. _fit_sixteen_divisions  bar length integrity

### Key metrics (best build)
- Syncopation: 53.6% of interior bars
- Leaps ?5 semitones: 13.3%
- Rests: 13.2% (target 12-15%)
- Unison clusters: 0
- Overall dissonance: 24.1% (down from 31.7%)
- Downbeat dissonance: eliminated on 10/12 previously flagged bars

### Key files
- parker_phrase_engine.py  GCE integration, RAG templates, all validators
- parker_section_compiler.py  chorus/section orchestration
- parker_vocabulary.py  interval patterns from transcriptions
- parker_musicxml_exporter.py  MusicXML output

---

## Project Status — 2026-04-15

### Composer OS Generate modes
| Mode | Status |
|------|--------|
| Guitar-Bass Duo | Shipping MusicXML ? |
| ECM Chamber | Shipping MusicXML ? |
| Song Mode | Shipping MusicXML ? |
| Riff | Shipping MusicXML ? |
| Wyble Etude | Shipping MusicXML ? |
| Big Band | Shipping MusicXML ? |
| String Quartet | Shipping MusicXML ? |
| Vocal Lead Sheet | Bridge wired, download path open |

### Composer Engines (Python, Composer OS UI)
| Engine | Status |
|--------|--------|
| Wayne Shorter | v1.0 shipped — asymmetric form, harmonic ambiguity |
| Charlie Parker | v1.0 shipped — bebop, 32-bar chorus GCE, 10 validators |
| Thelonious Monk | v1.0 shipped — blues form, space/density validators |

### Recent completions
- Songwriter dropdown for Big Band and String Quartet (2026-04-15)
- Thelonious Monk Engine v1.0 (2026-04-15)
- Guitar-bass duo Voice 2 counterpoint
- Phase 19 Song Form UI and rehearsal marks
- V9.0 chord baseline and Sibelius-safe MusicXML

### Priority queue
1. Wyble single-line parity
2. Phase 19.1 long forms (>32 bars)
3. Wayne Shorter TS integration
4. Big Band / String Quartet polish
5. Song Mode style surface
6. Vocal lead sheet download path
7. Bass/duo regression tests
