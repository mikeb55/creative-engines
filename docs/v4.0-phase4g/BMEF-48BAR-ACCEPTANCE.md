# BMEF 48-Bar Acceptance — Seed77241 Varied Repeat

**Score:** `.tmp-piano-24bar-original-test/Seed77241-48bar-varied-repeat.musicxml`  
**Phase:** 4G closure → 4H (notation / Sibelius)  
**HEAD (expected):** `53de013e`  
**Audit source:** Perplexity exported-file audit (sounding pitches); listening waived.

## Verified technical facts (accepted as ground truth)

| Check | Result |
|-------|--------|
| Melody + piano LH (bars 1–48) | 100% preserved both halves |
| Orphan ties / m2·M7 vs melody | 0 / 0 |
| Vc + Cb beat 1 | All 48 bars |
| Pass-2 lead vs pass 1 | Differs 23/24 bars |
| Active parts (pass 2) | 19 |
| Hairpins | Cresc 15–16; dim 47–48; none across rests |
| Bar 48 | *p*; 8 parts |
| Sections | 1–24 4F (23 *f*, 24 *mf*) · 25–28 Cl+Va · 29–32 Hn · 33–36 Ob+Vc · 37–40 Vln II+Cl · 41–44 Vln I+Fl (G6/A6) · 45–47 *ff* tutti (15–16 pts) · 48 *p* |

## Acceptance criteria

| Criterion | Verdict | Bars / notes |
|-----------|---------|----------------|
| Form / thematic development | **REFINE** | 25–48 = piano repeat; orchestration-only variation; pass-2 lead change 23/24 |
| BHL harmony / voice-leading | **PASS** | LH + melody locked; 0 clashes; bass onsets 1–48 |
| Dialogue / counterpoint | **REFINE** | Mostly sustained support; little independent lines |
| Phrasing / transitions | **REFINE** | 25–40 thinner (6–7 pts, mp–mf) vs 17–24 (11–14); handoff to peak feels abrupt |
| Colour / balance | **REFINE** | Mid-orchestra window quiet vs prior tutti density |
| Dramatic arc / climax / ending | **REFINE** | Register peak 41–44 before dynamic peak 45–47; 48 *p* + dim 47–48 coherent |
| Notation integrity (musical) | **PASS** | Ties, dynamics placement, section map consistent with export |

**BMEF overall:** **PASS** (technical checkpoint; refinements logged, not blockers).

## Known limitations (REFINE — not FAIL)

- Bars 25–48 duplicate piano material; variation is orchestrational.
- Sustained support; sparse conversational counterpoint.
- Dynamic/arch contour: lull 25–40 then jump to 41–47 peak.
- Vc 33–36 unison Ob to G♯5 — high for orchestral cello (4H register review).
- Register climax precedes *ff* tutti climax.

## Phase 4H — notation / Sibelius only

1. Flat-key enharmonic spelling (e.g. C♯maj7 vs D♭maj7).
2. Title, composer, tempo metadata.
3. Rehearsal marks **A–F**: bars 1, 9, 17, 25, 33, 41.
4. Part names, abbreviations, playback sound IDs.
5. Final barline.
6. Sibelius import smoke (layout, ties, dynamics).

---

**TECHNICAL CHECKPOINT ACCEPTED — automated BMEF; listening waived.**
