CURSOR WORKSPACE: creative-engines
WORKSPACE ROOT: C:\Users\mike\Documents\Cursor AI Projects\creative-engines
READ SOURCE FROM: current workspace + existing V4 project files
WRITE OUTPUT TO: ./projects/guitar-bass-duos/V4-project/

--------------------------------------------------
PROJECT
--------------------------------------------------

V4 — Guitar-Bass Song Project

--------------------------------------------------
PIECE
--------------------------------------------------

[SONG NAME]
Source: [SOURCE FILE PATH]
Output folder: [OUTPUT FOLDER]

--------------------------------------------------
MODE
--------------------------------------------------

LOCK refinement. Melody locked. Bass co-compositional. Interaction required.

--------------------------------------------------
GOAL
--------------------------------------------------

Produce [CURRENT VERSION] → [TARGET VERSION].

Target GCE ≥ 9.5.

--------------------------------------------------
SOURCE MATERIAL
--------------------------------------------------

- Lead sheet / melody: [path]
- Current duo version: [path or "none"]

--------------------------------------------------
OUTPUT
--------------------------------------------------

Filename: Vn - [Song Name].musicxml  
Path: [OUTPUT FOLDER]

Format rule: Vn - Song Name.musicxml

--------------------------------------------------
STRICT VERSIONING RULE
--------------------------------------------------

- Maximum V3
- No version creep
- Stop when GCE ≥ 9.5

--------------------------------------------------
LOCK SYSTEM
--------------------------------------------------

Reference: _system/Guitar-Bass-Duo-Engine-LOCK-v1.md

- DCR: 5–7 internal passes
- 1 commit only
- 1 refinement pass only
- Bass = co-composer
- Interaction must be audible

--------------------------------------------------
WHAT MUST REMAIN UNCHANGED
--------------------------------------------------

- Melody (notes, rhythm, phrase contour)
- Chord symbols
- Form
- Rehearsal marks

--------------------------------------------------
HARD-CODED RULES (Always Apply)
--------------------------------------------------

- **Melody Lock** — melody is immutable
- **Bass Harmonic Integrity Gate** — bass must imply root/3rd/7th every bar
- **Bass-Chord Cross-Check** — assert at least one of {root, 3rd, 7th} present or implied per bar
- **Chord-Melody Alignment Gate** — chord symbol must support melody; no illegal tensions
- **Section Contrast Gate** — A/B/C must differ in density, register, rhythmic profile
- **Rhythm Anti-Loop Rule** — no repeating rhythmic cells beyond 2 consecutive bars unless varied
- **Export Validation Gate** — valid MusicXML, all parts present, measures sequential, clefs correct

--------------------------------------------------
SPECIFIC PROBLEMS TO FIX
--------------------------------------------------

[ ] Problem 1
[ ] Problem 2
[ ] Problem 3

--------------------------------------------------
REFINEMENT TARGETS
--------------------------------------------------

[ ] Bass rewrite / harmonic clarity
[ ] Interaction (call-response, echo, density contrast)
[ ] Rhythmic feel / micro swing
[ ] Identity moment (9.5 trigger)

--------------------------------------------------
DCR INTERNAL PASSES
--------------------------------------------------

5–7 silent design iterations. No drafts shown. Reject weak candidates internally.

--------------------------------------------------
SINGLE REFINE PASS
--------------------------------------------------

One polish pass only. No structural rewrites in refine.
- Phrasing
- Articulation
- Rhythmic placement
- Spacing
- Engraving

--------------------------------------------------
VALIDATION
--------------------------------------------------

Before export:
1. Melody preserved against source
2. Bass implies harmony every bar
3. Interaction perceptible
4. No both-parts-dense simultaneously
5. MusicXML valid
6. GCE ≥ 9.5

--------------------------------------------------
REPORT
--------------------------------------------------

Produce report.md in song folder with:
- Version history
- Changes made
- GCE self-assessment
- Issues remaining (if any)

--------------------------------------------------
SUCCESS CONDITION
--------------------------------------------------

GCE ≥ 9.5. File valid. Interaction audible. Identity moment present. Export only then.

--------------------------------------------------
EXECUTE
--------------------------------------------------

[Describe specific task: e.g. "Bass rewrite pass only" or "Full refinement M1–M8" etc.]
