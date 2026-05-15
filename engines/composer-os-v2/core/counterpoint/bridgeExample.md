# AbstractLineSet bridge example (Bartók-flavoured)

Illustrates one shared `AbstractLineSet` realized under **two** orchestration contracts: String Quartet (literal four parts) vs Big Band (section leaders + doublings). Numbers are illustrative, not generated output.

## Hypothetical `AbstractLineSet` (4 bars)

- **lengthBars:** 4  
- **styleSourceVrbId:** `bartok`  
- **sourceMode:** `melody_plus_chords` (lines composed first; chord functions inferred later for export)  
- **dissonanceProfile:** tritone outer-voice ban, no parallel 5ths/8ves (matches `contrapuntalLinePolicy` on Bartók bundle).  
- **densityEnvelope:** bars 1–2 `sparse`, 3–4 `medium`.  
- **cadenceTags:** e.g. weak modal arrival at bar 4 (`strength: weak`, `type: modal`).  
- **voices (sketch):**

| Role    | Tags                         | Notes (pitchMidi, offsetBars, durationBars) sketch                          |
|---------|------------------------------|------------------------------------------------------------------------------|
| soprano | `melodic_lead`               | Bar 0: 72×1; bar 1: 74×0.5 + 71×0.5; bar 2: 69×1; bar 3: 67×1 (cell descent)   |
| alto    | `counter_melody`           | Offbeat entries vs soprano; narrow band 60–65                             |
| tenor   | `rhythmic_anchor`          | Bulgarian-style 2+2+3 grouping over bar 3–4 (additive cell)               |
| bass    | `bass_anchor`              | Pedal on low E (MIDI 52) bars 0–2, step to F bar 3                        |

- **imitationMap (optional):** tenor **strict** imitation of soprano at **delayBars: 1**, **intervalSemitones: -12** (octave below) bars 1–2 only.

If this survives vertical checks (no forbidden tritone between soprano and bass simultaneities, no illegal parallels under profile), the abstraction is **musically coherent** as a planning object; realization below only changes **who plays which line**, not the four abstract strands.

---

## SQ rendering (literal 4-part)

| Abstract role | Part          | Realization |
|---------------|---------------|-------------|
| Soprano       | Violin I      | Pitches literal; Bartók VRB techniques (e.g. snap pizz, sul pont) applied in **Stage B** filter, not new pitches. |
| Alto          | Violin II     | Pitches literal; independent rhythm from line. |
| Tenor         | Viola         | Pitches literal; independent rhythm. |
| Bass          | Violoncello   | Pitches literal; `bass_anchor` → arco weight / pizz only via VRB filter. |

**No doubling:** one staff per line; inner-harmony “fills” are **unisons at the octave** only if Stage B explicitly allows (default off for SQ literal path).

---

## BB rendering (section leaders + doublings)

| Abstract role | Leader (primary)     | Doubling / fill contract |
|---------------|----------------------|---------------------------|
| Soprano       | Lead trumpet         | Alto sax **8vb bassa** (written line down octave — timbral double, not a new contrapuntal line). |
| Alto          | Lead trombone        | Tenor sax (colour double / harmonic pad on sustained tones). |
| Tenor         | 3rd trumpet or 2nd trombone | Inner-brass **harmonic rhythm** follows tenor line attacks; chord tones at intersections with soprano/alto **filled by arranger rule**, not new independent melodies. |
| Bass          | Bass trombone + string bass | **Literal** bass line doubled at octave/suboctave per house style. |

**Rule:** inner sax voices **realize verticals implied by line intersections** (guide-tone completion, pad clusters); they **do not** introduce new independent melodic strands — that preserves “harmony from line interaction.”

---

## Architectural test

Same four `LineRole` arrays are the **single source of truth**. SQ path maps 1:1 to acoustic parts. BB path **projects** the same pitches onto brass-weighted registers and adds **approved doublings** plus **derived pads**. If either realization breaks vertical policy, fix **`AbstractLineSet`** or **Stage B filter**, not the routing tables alone.

---

## Task 6 — Style entry hypothesis

**Hypothesis:** Style operates at **two** stages — (a) VRB constrains **line generation**; (b) VRB **filters** the frozen `AbstractLineSet` for register, articulation, technique, dynamics.

**Verdict: Agree**, with one clarification: **(b) must not invent new independent melodic material** (per BB bridge above); it may only adjust **performance parameters** and **orchestration assignment**, and **compress/expand register** while preserving inter-line interval intent unless an explicit “arranger override” tier is added later.

| Stage | VRB / bundle fields (examples) |
|-------|--------------------------------|
| **(a) Generation** | `contrapuntalLinePolicy` (`dissonanceProfile`, `preferredImitationTypes`, `rhythmicIndependenceRequired`, `lineRoleAssignment`); `melodicPolicy` (`contour`, `maxLeapSemitones`, `preferredIntervalSets`); `rhythmPolicy.antiMetric`; `harmonicRhythm` (span hints for cells, not necessarily final chord strip); `lineFirstHierarchy` (voicing solver defers to line-first decisions downstream). |
| **(b) Post filter** | `orchestrationPolicy` / fingerprint-derived **technique** vocabulary; dynamic ceilings (e.g. Pärt `dynamicCeiling` pattern); register nudges from `voicingPolicy.minSpreadSemitones` / `maxSpreadSemitones`; BB-specific **doubling tables** (not in VRB today — Pass 3 orchestration registry). |

**Clarification vs strict “two passes only”:** A thin **(c) layout pass** (part assignment, cue splits) may run after (b) without changing musical content — still “style-free” numerically.

---

## Pipeline note (`precomputeContrapuntalLines`)

Per Basie-style hooks: attach line-first result **before** effective harmony bar precompute so spine symbols can still be **derived** from line intersections in Pass 3+, not the other way around.
