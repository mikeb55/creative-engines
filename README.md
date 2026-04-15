# Psychopathology & Synthesis (PET Training)

Two-day postgraduate psychotherapy training (10:00ù17:00, UK) focused on:

* Borderline presentations (relational instability, identity tension)
* Intersubjectivity and projective identification (dependency, power, sexuality, ingratiation)
* Risk assessment under uncertainty
* Neurodiversity, trauma, dissociation
* Psychosynthesis (parts, IùSelf, disidentification, meaning alongside risk)

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

* Leah ù shame, risk, family pressure
* Ousmane ù neurodiversity, executive load, safeguarding
* Emily ù dissociation, inconsistent risk account
* Michael ù ambiguity, escalation decisions

Each follows ACE-Cases (100-point rubric).

## Media

Three videos (links in speaker notes only):

* Neurodiversity (Day 1 PM)
* Dissociation (Day 2 AM)
* Suicide conversation (Day 2 PM)

## Current Version

V4.6

* Corrected temporal structure (Day 1 vs Day 2)
* Proper placement of breaks and lunches (2ù20 min breaks/day, 1ù lunch/day)
* Clean video integration (3 points only)
* Improved pacing and energy distribution
* Minor refinements to clinical emphasis (risk, documentation, supervision)


## Charlie Parker Engine

Generates Charlie Parker-style bebop melodies over chord changes using the Claude API.

### Architecture
- **Generation unit:** Full 32-bar chorus in single GCE call, fallback to 8-bar sections
- **GCE prompt:** Bird-specific rules ù anticipation, offbeat starts, ii-V-I entry/exit degrees, leap+compensation, turnaround chains
- **Temperature:** 1.2
- **System prompt:** "You are Charlie Parker's fingers on the alto saxophone"
- **RAG:** 10 abstract Parker phrase templates + concrete note sequences from 8 transcriptions
- **Transcriptions:** Ko-Ko, Anthropology, Donna Lee, Now's The Time, Billie's Bounce, Ornithology, Confirmation, Lou Donaldson (Birdland 1954)

### Post-generation Validators (in order)
1. _patch_unison_runs ù eliminates clusters of 3+ identical consecutive pitches
2. _cap_unison_frequency ù caps unisons at 3% of all intervals
3. _enforce_opening_rest ù section openings (bars 1/9/17/25) start on rest
4. _enforce_syncopation ù 40%+ of interior bars start on offbeat
5. _enforce_midphrase_quarter ù quarter note landings mid-phrase (~50% of interior bars)
6. _enforce_cadence_quarter ù every 4th bar has quarter note or longer
7. _enforce_long_note_consonance ù notes longer than eighth must be strict chord tones
8. _enforce_downbeat_consonance ù non-chord-tone on beat 1 ? syncopation rest inserted
9. _enforce_no_chord_contradictions ù removes mode-contradicting notes from long values
10. _fit_sixteen_divisions ù bar length integrity

### Key metrics (best build)
- Syncopation: 53.6% of interior bars
- Leaps ?5 semitones: 13.3%
- Rests: 13.2% (target 12-15%)
- Unison clusters: 0
- Overall dissonance: 24.1% (down from 31.7%)
- Downbeat dissonance: eliminated on 10/12 previously flagged bars

### Key files
- parker_phrase_engine.py ù GCE integration, RAG templates, all validators
- parker_section_compiler.py ù chorus/section orchestration
- parker_vocabulary.py ù interval patterns from transcriptions
- parker_musicxml_exporter.py ù MusicXML output

---

## Project Status ù 2026-04-15

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
| Vocal Lead Sheet | Pipeline closure ù next priority (bridge wired; close download path) |

### Composer Engines (Python, Composer OS UI)
| Engine | Status |
|--------|--------|
| Wayne Shorter | v1.0 shipped ù asymmetric form, harmonic ambiguity |
| Charlie Parker | v1.0 shipped ù bebop, 32-bar chorus GCE, 10 validators |
| Thelonious Monk | v1.0 shipped ù blues form, space/density validators |

### Recent completions
- Songwriter dropdown for Big Band and String Quartet (2026-04-15)
- Thelonious Monk Engine v1.0 (2026-04-15)
- Counterpoint Phase 2 (Guitar-Bass Duo wiring): COMPLETE (2026-04-15) ù 10/10 test:duo pass ù Bizzi/Tymoczko/species-lite in Voice 2 candidate ranking (`guitarVoice2WybleLayer.ts`)
- Phase 19 Song Form UI and rehearsal marks
- V9.0 chord baseline and Sibelius-safe MusicXML

### Priority queue
1. Wyble single-line parity
2. Phase 19.1 long forms (>32 bars)
3. Wayne Shorter TS integration
4. Big Band / String Quartet polish: **COMPLETE** (2026-04-15) ù Double Bass export, blues12 42-bar form, verify 14/14, SQ honestNote
5. Song Mode style exposure: **COMPLETE** (2026-04-15) ù Pattern slider, secondary songwriter, author overlay
6. Vocal lead sheet: pipeline closure ó next priority
7. Bass/duo regression tests

