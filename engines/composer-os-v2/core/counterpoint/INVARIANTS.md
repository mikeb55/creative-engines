# ContrapuntalLineEngine — Pass 3 invariants (Brookmeyer + Bartók)

Frozen behaviour for duo golden-path **`contrapuntalLineSet`** metadata. MusicXML / part writers must respect these when Pass 4 consumes lines.

## Anti-parallel motion

- **Implementation:** `hasParallelOctaveOrFifth` in `ContrapuntalLineEngine.ts` compares outer pairs (sop–bass, sop–alto, alto–tenor) on **same-direction** motion; blocks **parallel octaves** when `parallelOctavesAllowed === false`, **parallel fifths** when `parallelFifthsAllowed === false` (from VRB `dissonanceProfile`).
- **Fired today:** Brookmeyer bundle allows **parallel fifths** (`parallelFifthsAllowed: true`) but forbids **parallel octaves** — octave parallel check **fires**; fifth check **skipped** for Brookmeyer. Bartók bundle forbids both — **both checks fire** when motion would be parallel.

## Register interlock (SATB pitch order)

- **Implementation:** `enforceRegisterInterlock` buckets notes by `offsetBars` (quantised to 1/64 bar), then **sorts the four simultaneous MIDI pitches high→low** and **reassigns** soprano…bass to that order with minimum **2** semitone separation between adjacent voices.
- **Trade-off:** This **reorders which physical voice carries which pitch** at each vertical slice to guarantee **soprano > alto > tenor > bass**. It can **distort** strict canonic pitch ownership; kept to avoid export-time SATB collisions. **Loosened vs pure species counterpoint:** identity is “line of attacks + contour class” not immutable pitch-to-role binding after vertical repair.

## Strong-beat onset sharing (Gate B)

- **Smoke threshold:** `strongBeatCoOnsetGate` in `bobBrookmeyerSliceSmoke.test.ts` — integer **downbeat** (`offsetBars === barIndex` within ε). Count consecutive bars where **≥2 voices** share that downbeat onset; **must be ≤2** consecutive bars.
- **Engine:** Brookmeyer swing grid uses distinct fractional entries per voice (0, 0.25, 0.33, 0.125, …) so downbeat pile-ups stay rare; Bartók tenor follower uses **`+ 1/32` bar `tenorPhase`** so it does not land on the same integer downbeat as the leader every bar. **Style smoke (Gate B)** measures Bartók “eighth grid” on **soprano + alto + bass** only — tenor deliberately off strict 125 ms grid.

## `lineFirstHierarchy` vs `contrapuntalLineSet`

- **Independent.** `precomputeContrapuntalLines.ts` documents: composed lines live on metadata **before** harmony-bar precompute; **`lineFirstHierarchy`** remains a **`VoiceRuleBundle` / voicing-solver** flag (Brookmeyer slice still sets `brookmeyerLineFirstHierarchy` + `lineFirstHierarchy` in harmony precompute). No line-set payload is passed into `voiceLeadingSolver.ts` in Pass 3.

## BB inner sections vs leader lines

- **Routing:** `renderForBigBand` calls existing **`soliPlanForBundle`** (~L69) and **`backgroundsPlanFromScene`** (~L79) in `bigBandSectionWriter.ts`. Those APIs take **`VoiceRuleBundle`** and optional **`HarmonicScene`** only — **no `AbstractLineSet` note arrays**.
- **Therefore:** Pass 3 **does not** derive trombone/sax doublings by intersecting abstract note rows. **`soliPlan`** carries **spread min/max** from bundle voicing policy; **`backgroundsPlan`** carries pad rhythm/colour from first scene. **Leader pitch identity** stays on **`AbstractLineSet.voices`** until a later pass pipes lines into BB realisation. **Why:** no redesign of `bigBandSectionWriter` contracts in Pass 3.

## VRB blend — `contrapuntalLinePolicy`

- **`mergeContrapuntalLinePolicy`** (`vrbBlend.ts`): `enabled` = OR; `preferredImitationTypes` = **set union**; `rhythmicIndependenceRequired` = OR; `lineRoleAssignment` = **dynamic if either side dynamic**; `dissonanceProfile` = **copy from heavier-weight** bundle (not numeric average — `ContrapuntalLinePolicy` has no `dissonanceTolerance` scalar in type).

## Bartók line grammar (Pass 3)

- **ic1 / tritone-class motion:** repeating four-step cell `[1, 6, 6, -7]` semitones on soprano; tenor **strict** octave imitation delayed by **`delayBars: 1`** bar.
- **Additive displacement:** per-voice `additive` offsets (0, 0.125, 0.25, 0.375) bars; tenor follower gets **`+ 1/32` bar phase** so strict imitation does not sit on the same integer downbeat as the leader every bar (smoke **strong-beat co-onset** cap).
- **Chords_only:** soprano line driven by advancing cell over `resolveBarSymbol` harmony spine; inner voices filled per bar from chord root.

## Brookmeyer line grammar (Pass 3)

- **Swing-offset grid:** two attacks per bar per voice at role-specific fractional offsets (`swingOffsets`).
- **Chromatic nudge:** ±2 semitones RNG per bar per voice before parallel check.
- **Chord spine:** targets from chord third / seventh / fifth / root mapped into role registers, then nudged.
