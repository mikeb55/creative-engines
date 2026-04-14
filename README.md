# Psychopathology & Synthesis (PET Training)

Two-day postgraduate psychotherapy training (10:00–17:00, UK) focused on:

* Borderline presentations (relational instability, identity tension)
* Intersubjectivity and projective identification (dependency, power, sexuality, ingratiation)
* Risk assessment under uncertainty
* Neurodiversity, trauma, dissociation
* Psychosynthesis (parts, I–Self, disidentification, meaning alongside risk)

## Structure

* Day 1: framing → risk → Leah → break → neurodiversity → Ousmane → video → lunch → applied practice → break → close
* Day 2: opening → trauma & ADHD overlap → break → dissociation → Emily → video → clinical response → lunch → risk teaching → video → break → Michael → integration → close

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
- **Generation unit:** 8-bar sections (A1/A2/B/A3) per Claude API call
- **GCE prompt:** Bird-specific rules � anticipation, offbeat starts, ii-V-I entry/exit degrees, leap+compensation, turnaround chains
- **RAG:** 10 abstract Parker phrase templates + concrete note sequences from 8 real transcriptions
- **Validators:** 5 post-generation Python validators enforce structural correctness
- **Temperature:** 1.2
- **Fallback:** Deterministic vocabulary-based generation if API fails

### Transcriptions used
Ko-Ko, Anthropology, Donna Lee, Now's The Time, Billie's Bounce, Ornithology, Confirmation, Lou Donaldson solo (Birdland 1954)

### Usage
From Composer OS desktop app: Charlie Parker card ? enter title + chords ? Generate

### Key files
- parker_phrase_engine.py � GCE integration, RAG templates, validators
- parker_section_compiler.py � 8-bar section orchestration
- parker_vocabulary.py � interval patterns from transcriptions
- parker_musicxml_exporter.py � MusicXML output
