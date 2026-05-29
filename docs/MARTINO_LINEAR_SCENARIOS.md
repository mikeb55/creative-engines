# Martino Linear Expressions — Creative Scenarios Guide
## 20 Wildly Different Uses for Composer OS v1.1.0

---

## Introduction

Martino Linear Expressions is not a bebop line generator. It is a rule-based melodic architecture engine that reduces every chord to its minor centre, applies canonical templates (A1–A8), scores the result across 8 dimensions, and rejects anything that doesn't pass the GCE gate. The result is a highly disciplined, deeply idiomatic guitar voice that sounds like Pat Martino thought about it.

The 20 scenarios below push the engine into radically different creative territories — from teaching tools to film scoring to avant-garde composition. Each includes exact settings.

---

## Scenario 1 — The Bebop Vocabulary Builder (Teaching)

**Concept:** Use the engine as a daily practice tool. Generate a new linear phrase over a ii–V–I each day, print it, and play it in 12 keys.

**Settings:**
- Tune name: `Daily Line [date]`
- Chords: `Dm7 G7 Cmaj7 Cmaj7`
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2 — Diagonal Bridge
- Dominant tension: Low
- Mode: Teaching
- Explain mode: ON

**Why it works:** Teaching mode surfaces the reduction logic bar by bar. The student sees why each note was chosen — minor centre, template, role — rather than just copying a lick.

---

## Scenario 2 — The Ballad Study (Lyrical Phrasing)

**Concept:** Generate a long-form melodic study over a slow ballad form. Focus on wide interval spans and lyrical contour.

**Settings:**
- Preset: Beatrice (16 bars)
- Choruses: 2
- Primary activity: A7 — Long Span
- Secondary: A2 — Diagonal Bridge
- Dominant tension: Low
- LFV: min 5, max 9
- Mode: Teaching

**Why it works:** A7 (Long Span) produces wide ascending gestures over 2 bars. Over Beatrice's modal ii–V changes this creates an Evans-like lyrical quality rather than eighth-note bebop density.

---

## Scenario 3 — The Modal Drone Study (ECM Aesthetic)

**Concept:** Generate linear phrases over static modal changes. Wire ECM Chamber mode to push toward open, spacious contour.

**Settings:**
- Chords: `Fmaj7 Fmaj7 Fmaj7 Fmaj7 Ebmaj7 Ebmaj7 Ebmaj7 Ebmaj7`
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2 — Diagonal Bridge
- Dominant tension: Low
- ECM mode: ECM_METHENY_QUARTET
- Mode: Performance

**Why it works:** ECM_METHENY_QUARTET hints push the tension map toward low, producing floating lines that sit above the harmony rather than cutting through it.

---

## Scenario 4 — The Rhythm Changes Burner (High Energy)

**Concept:** Full-speed rhythm changes, maximum chromatic tension on dominants, A4 Anchor Arp for propulsive drive.

**Settings:**
- Chords: `Bbmaj7 G7 Cm7 F7 Dm7 G7 Cm7 F7 Bb7 Eb7 Bb7 F7 Fm7 Bb7 Ebmaj7 Edim7 Bb7 G7 Cm7 F7 Bbmaj7 G7 Cm7 F7 Dm7 G7 Cm7 F7 Bb7 Eb7 Bb7 Bbmaj7`
- Choruses: 2
- Primary activity: A4 — Anchor Arp
- Secondary: A1, A3
- Dominant tension: High
- LFV: min 3, max 9
- Mode: Performance

**Why it works:** High dominant tension on G7, F7, Bb7 pushes chromatic enclosures. A4 Anchor Arp on the tonic bars creates contrast. Two choruses with DCR variation seed ensures chorus 2 differs from chorus 1.

---

## Scenario 5 — The Blues Archetype (12-Bar Deep Funk)

**Concept:** Use the Blues genre profile over a slow blues with maximum tension and Anchor Arp as primary.

**Settings:**
- Preset: Blues genre profile
- Chords: `F7 F7 F7 F7 Bb7 Bb7 F7 F7 C7 Bb7 F7 C7`
- Choruses: 3
- Primary activity: A4 — Anchor Arp
- Secondary: A3 — Pivot Cell
- Dominant tension: High
- LFV: min 3, max 10

**Why it works:** Anchor Arp on dominant 7ths creates the call-and-response feel of blues guitar. Three choruses with per-chorus DCR variation builds a narrative arc — each chorus escalates.

---

## Scenario 6 — The Enclosure Study (Barry Harris Crossover)

**Concept:** Activate Barry Harris crossover mode with enclosure_heavy profile over a bebop head.

**Settings:**
- Chords: `Cmaj7 A7 Dm7 G7 Em7 A7 Dm7 G7 Cmaj7 Fm7 Bb7 Ebmaj7 Am7 D7 Dm7 G7`
- Choruses: 2
- Primary activity: A6 — Enclosure Cell
- Secondary: A1, A5
- Barry Harris mode: ON (profile: enclosure_heavy)
- Dominant tension: Medium
- Mode: Teaching
- Explain mode: ON

**Why it works:** A6 Enclosure Cell + Barry Harris enclosure_heavy profile doubles down on chromatic approach tones from above and below the minor centre. The explain panel shows every enclosure move bar by bar.

---

## Scenario 7 — The Orbit Chromatic Journey (Post-Bop)

**Concept:** Orbit's symmetrical chord sequence — descending major 7ths in tritone pairs — tests the reduction engine at its limits.

**Settings:**
- Preset: Orbit
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2 — Diagonal Bridge
- Slonimsky macro: tritone_progression
- Dominant tension: Low
- LFV: min 5, max 9

**Why it works:** The Slonimsky tritone_progression hint aligns the interval vocabulary with Orbit's tritone-substitution harmonic logic. The engine's minor centre reductions track through Fmaj7#11 → Ebmaj7#5 → Dbmaj7 → Bmaj7 as a single continuous linear descent.

---

## Scenario 8 — The Scalar Embellishment Study (Barry Harris Scalar)

**Concept:** Use Barry Harris scalar_embellish profile over a standard 32-bar AABA to generate stepwise embellishments.

**Settings:**
- Chords: `Fmaj7 Em7b5 A7 Dm7 Dm7 Cm7 F7 Bbmaj7 Bbm7 Eb7 Fmaj7 D7 Gm7 C7 Fmaj7 C7` (A section × 2 + bridge + A)
- Choruses: 2
- Primary activity: A7 — Long Span
- Secondary: A3 — Pivot Cell
- Barry Harris mode: ON (profile: scalar_embellish)
- Dominant tension: Low

**Why it works:** Scalar embellishment + Long Span creates smooth stepwise lines that connect chord tones without arpeggiation — the hallmark of Barry Harris's flowing scalar approach.

---

## Scenario 9 — The Intervallic Mirror (Slonimsky Avant-Garde)

**Concept:** Push the engine into intervallic mirror territory using Slonimsky macro and high chromatic tension.

**Settings:**
- Chords: `Dm7 Ab7 Dbmaj7 G7 Cmaj7 F#7 Bmaj7 E7`
- Choruses: 2
- Primary activity: A8 — Rhythmic Displacement
- Secondary: A6 — Enclosure Cell
- Slonimsky macro: intervallic_mirror_permutations
- Dominant tension: High
- LFV: min 4, max 10

**Why it works:** Intervallic mirror Slonimsky hints combined with A8 Rhythmic Displacement and high tension produces angular, syncopated lines that would be at home in a Zappa or Holdsworth context.

---

## Scenario 10 — The ECM Schneider Chamber Texture

**Concept:** Generate a chamber-like guitar line using ECM Schneider mode, long spans, low activity.

**Settings:**
- Chords: `Dbmaj7 Dbmaj7 Gbmaj7 Gbmaj7 Abmaj7 Abmaj7 Dbmaj7 Dbmaj7`
- Choruses: 1
- Primary activity: A7 — Long Span
- Secondary: A2 — Diagonal Bridge
- ECM mode: ECM_SCHNEIDER_CHAMBER
- Dominant tension: Low
- Mode: Performance

**Why it works:** ECM_SCHNEIDER_CHAMBER pushes tension high but A7 Long Span keeps the line lyrical. The result sounds like Maria Schneider's chamber writing — dense harmonically but never cluttered melodically.

---

## Scenario 11 — The Performance Mode Showcase (No Training Wheels)

**Concept:** Performance mode removes teaching annotations and generates the cleanest possible output for direct use in a session or recording.

**Settings:**
- Tune name: `Session Line A`
- Chords: `Am7 D7 Gmaj7 Gmaj7 Cm7 F7 Bbmaj7 Bbmaj7`
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2, A5
- Dominant tension: Medium
- Mode: Performance
- Explain mode: OFF

**Why it works:** Performance mode produces a clean MusicXML file ready for Sibelius. No provenance annotations, no teaching metadata — just the line.

---

## Scenario 12 — The Multi-Chorus Narrative Arc (3-Chorus Study)

**Concept:** Use 3 choruses with DCR per-chorus variation to build a complete melodic narrative — introduction, development, climax.

**Settings:**
- Chords: `Dm7 G7 Cmaj7 A7 Dm7 G7 Cmaj7 Cmaj7`
- Choruses: 3
- Primary activity: A1 — Opening Line
- Secondary: A2, A3, A4
- Dominant tension: Medium (chorus 1), escalating via DCR seed
- LFV: min 5, max 9
- Mode: Teaching
- Explain mode: ON

**Why it works:** Chorus 1 starts with carry_key=None (default opening). Chorus 2 seeds from pivot, chorus 3 from anchor — creating a natural arc from lyrical to rhythmic to grounded.

---

## Scenario 13 — The Pentatonic Slonimsky Overlay

**Concept:** Use pentatonic Slonimsky macro over a blues-adjacent progression to blend Martino's linear approach with pentatonic vocabulary.

**Settings:**
- Chords: `Am7 Am7 D7 D7 Am7 Am7 E7 D7`
- Choruses: 2
- Primary activity: A3 — Pivot Cell
- Secondary: A4 — Anchor Arp
- Slonimsky macro: pentatonic_scales
- Dominant tension: Medium

**Why it works:** Pentatonic Slonimsky hints steer the interval vocabulary toward minor pentatonic patterns while the Martino reduction engine keeps everything grounded in the minor centre. The result blends Wes Montgomery pentatonics with Martino's discipline.

---

## Scenario 14 — The Heptatonic Modal Study

**Concept:** Modal jazz changes with heptatonic Slonimsky macro for a Shorter/Metheny flavour.

**Settings:**
- Chords: `Dm7 Dm7 Ebmaj7 Ebmaj7 Dm7 Dm7 Ebmaj7 Fmaj7`
- Choruses: 2
- Primary activity: A2 — Diagonal Bridge
- Secondary: A7 — Long Span
- Slonimsky macro: heptatonic_scales
- Dominant tension: Low
- ECM mode: ECM_METHENY_QUARTET

**Why it works:** Heptatonic scales + Metheny ECM + Diagonal Bridge = a modal sound that floats across the changes without resolving. Pure ECM atmosphere.

---

## Scenario 15 — The Rhythm Displacement Etude (A8 Focus)

**Concept:** Make A8 Rhythmic Displacement the primary activity to generate a syncopated, off-beat study.

**Settings:**
- Chords: `Fm7 Bb7 Ebmaj7 Ebmaj7 Abm7 Db7 Gbmaj7 Gbmaj7`
- Choruses: 2
- Primary activity: A8 — Rhythmic Displacement
- Secondary: A3 — Pivot Cell
- Dominant tension: Medium
- LFV: min 5, max 9
- Mode: Teaching
- Explain mode: ON

**Why it works:** A8's beat_position offsets (+0.125) create syncopation against the bar grid. The explain panel shows where each off-beat lands relative to the minor centre — a powerful rhythmic ear-training tool.

---

## Scenario 16 — The Standard Repertoire Generator (32-Bar AABA)

**Concept:** Use the Standard genre profile to generate idiomatic lines over a classic 32-bar AABA form.

**Settings:**
- Preset: Standard genre profile
- Chords: `Fmaj7 Dm7 Gm7 C7 Am7 D7 Gm7 C7 Am7 D7 Gm7 C7 Fmaj7 D7 Gm7 C7` (A section ×2 + bridge + A)
- Choruses: 2
- Primary activity: A1 — Opening Line
- Secondary: A2, A3
- Dominant tension: Medium

**Why it works:** The Standard profile sets medium tension on dominants and a balanced activity mix — exactly the vocabulary needed for playing standards with a modern jazz approach.

---

## Scenario 17 — The Cadential Resolution Study (A5 Focus)

**Concept:** Make A5 Cadential Cell the primary activity to study how Martino approaches endings and resolutions.

**Settings:**
- Chords: `Am7 D7 Gmaj7 Gmaj7`
- Choruses: 4
- Primary activity: A5 — Cadential Cell
- Secondary: A1, A2
- Dominant tension: Low
- Mode: Teaching
- Explain mode: ON

**Why it works:** Four choruses of A5 primary with explain mode reveals the pattern of cadential approaches — how the engine resolves to the tonic minor centre across multiple harmonic contexts.

---

## Scenario 18 — The Bebop Enclosure + Approach (A6 + A5)

**Concept:** Chain enclosure approaches (A6) with cadential resolution (A5) to study the full bebop approach-to-target vocabulary.

**Settings:**
- Chords: `Dm7 G7 Cmaj7 A7 Dm7 G7 Em7 A7 Dm7 G7 Cmaj7 Cmaj7`
- Choruses: 2
- Primary activity: A6 — Enclosure Cell
- Secondary: A5 — Cadential Cell, A1
- Barry Harris mode: ON (profile: bebop_step)
- Dominant tension: High
- Mode: Teaching

**Why it works:** A6 targets the minor centre from above and below; A5 closes the phrase to the tonic. Barry Harris bebop_step profile adds passing motion between chord tones. The result is a complete bebop phrase architecture.

---

## Scenario 19 — The Film Score Sketch (Atmospheric, Non-Functional)

**Concept:** Use static non-functional harmony with ECM Schneider mode to generate atmospheric guitar lines for film scoring.

**Settings:**
- Chords: `Abmaj7 Abmaj7 Dbmaj7 Dbmaj7 Gbmaj7 Gbmaj7 Abmaj7 Abmaj7`
- Choruses: 1
- Primary activity: A7 — Long Span
- Secondary: A2 — Diagonal Bridge
- ECM mode: ECM_SCHNEIDER_CHAMBER
- Dominant tension: Low
- LFV: min 7, max 12
- Mode: Performance

**Why it works:** High LFV range (7–12) pushes the line into the upper register. ECM Schneider chamber texture + Long Span creates sustained, atmospheric melodic gestures suitable for underscore or sound design.

---

## Scenario 20 — The Complete Martino System Test (All 8 Activities)

**Concept:** Push all 8 activities (A1–A8) into a single generation to test the full vocabulary of the engine.

**Settings:**
- Chords: `Fmaj7 Gbmaj7 Fmaj7 Ebmaj7 Dm7 Ebmaj7 Dm7 Bbm7 Am7 Bbmaj7 Dm7 Fmaj7 Gbmaj7 Fmaj7 Ebmaj7 Fmaj7`
- Choruses: 2
- Primary activity: A1 — Opening Line
- Secondary: A2, A3, A4, A5, A6, A7, A8 (all)
- Dominant tension: Medium
- Slonimsky macro: heptatonic_scales
- ECM mode: ECM_METHENY_QUARTET
- Barry Harris mode: ON (profile: bebop_step)
- LFV: min 5, max 9
- Mode: Teaching
- Explain mode: ON

**Why it works:** With all 8 activities in the secondary pool, the DCR scoring engine selects the strongest variant per phrase span. The explain panel becomes a complete map of the Martino vocabulary — which activities the engine chose, why, and what the GCE said about each decision.

---

## GCE Dimension Reference

| Dimension | What it scores | Target |
|---|---|---|
| reduction_integrity | Correct minor centre reduction per 5 rules | > 0.8 |
| spatial_continuity | Coherent fret zone, no wild position jumps | > 0.85 |
| directional_persistence | Consistent contour arc | > 0.8 |
| inversion_coherence | Voice leading consistency | > 0.75 |
| activity_architecture | Structural activity variety | > 0.8 |
| anti_bebop_drift | Avoiding bebop clichés | > 0.7 |
| lfv_integrity | All notes within LFV window | > 0.9 |
| interval_dna_continuity | Martino interval signature maintained | > 0.85 |

Overall gate threshold: **7.5 / 10**. Anti-bebop drift hard floor: **0.15**.

---

## Activity Quick Reference

| ID | Name | Character | Best used for |
|---|---|---|---|
| A1 | Opening Line | Stepwise ascending, primary Martino voice | All contexts |
| A2 | Diagonal Bridge | Descending melodic bridge | Connecting phrases, ballads |
| A3 | Pivot Cell | Short pivot figure | Transitions, variety |
| A4 | Anchor Arp | Arpeggiated strong tones | Blues, funk, propulsive lines |
| A5 | Cadential Cell | Closing resolution figure | Phrase endings, ii-V-I |
| A6 | Enclosure Cell | Chromatic approach above and below | Bebop, Barry Harris |
| A7 | Long Span | Wide ascending, 2-bar gesture | Ballads, film, ECM |
| A8 | Rhythmic Displacement | Syncopated A1 variant | Rhythm studies, funk |

---

*Composer OS v1.1.0 · Martino Linear Expressions · Tagged v1.1.0-martino-stable*
