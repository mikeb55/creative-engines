# Polychordal Melodic Development — Design

**Status:** Design only. No implementation in this document.  
**Worktree:** `.tmp-ce-92acd5f-polychord`  
**Date:** 2026-11-07  
**Depends on:** dual-guitar SY polychord builders (`sonicYouthPolychordScore.ts`), exported `QUALITY_INTERVALS`, existing `motif-ops` / counterpoint / interaction / hexatonic / guitar grip modules.

This document records the architecture for writing **single-note melodic development** against **two simultaneous guitar triad fields** (a polychord bar), reusing Composer OS line and motif machinery where it already exists, and naming what is still missing.

---

## 0. Verified foundation — `QUALITY_INTERVALS`

**Gate status in this feature worktree: VERIFIED.**

| Source | Fact |
|---|---|
| Module | `engines/composer-os-v2/core/wwh/wwhTriadPair.ts` |
| Export | `export const QUALITY_INTERVALS` + `export type TriadQuality` |
| Consumer | `sonicYouthPolychordScore.ts` → `triadPitchClasses()` |
| Focused proof | `tests/sonicYouthPolychordTriadQuality.test.ts` |

Recorded intervals (semitones from root):

```ts
QUALITY_INTERVALS = {
  major:      { third: 4, fifth: 7 },
  minor:      { third: 3, fifth: 7 },
  augmented:  { third: 4, fifth: 8 },
  diminished: { third: 3, fifth: 6 },
}
```

Prior blocker (“`QUALITY_INTERVALS` not exported”) is **closed** in this worktree. Prototype 1 is no longer blocked on triad-quality truth.

---

## 1. Existing vs proposed (summary)

| Layer | Status | Notes |
|---|---|---|
| Dual-guitar polychord grips + MusicXML (sustained triads, no bass) | **Existing** | `buildSonicYouthOneBarPolychordScore` / `buildSonicYouthPolychordProgressionScore`; optional alt opens; `solveGuitarGrip({ openStrings })` |
| Combined polychord analysis (union / shared / Forte-when-6 / disjoint splits) | **Existing** | `analyzeSyProtoCombinedPolychord` |
| Combined words label above Guitar 1 | **Existing** | `syProtoCombinedPolychordNotationLabel` |
| Five-line treble export (no TAB staff-tuning on pitched staves) | **Existing** | Staff-tuning export tests |
| Motif operators + development chains | **Existing** | `motif-ops/` — 19 ops; lineage IDs; opt-in flag |
| Motif remap across collections | **Existing** | `pentatonic/motifTransform.mapMotifPitches` (M-DEG / M-NEAR) |
| Hexatonic phrase / relation helpers | **Existing** | `hexatonic/phraseGeneration`, `relations`, `triadicTransformation`, WWH triad-pair paths |
| Two-voice independence / hook / coherence evidence | **Existing** | `musical-evaluation/` — evidence only, no pass/fail |
| Interaction modes | **Existing** | `interaction/` — call_response / overlap / support / independent (today guitar+bass coupled) |
| ContrapuntalLineEngine + abstract SATB | **Existing** | Line-first generate / VRB filter / SQ+BB routers; duo fill path |
| `ImitationEvent` on `AbstractLineSet` | **Existing type only** | Spec field; nothing yet generates guitar↔guitar imitation events for this use |
| Tone-role table per polychord bar | **Proposed** | Own triad / partner triad / outside union |
| Two-guitar dialogue assembly (call/response, stretto, support against two fields) | **Proposed** | Recouple interaction modes to G1/G2 |
| Melodic motif kernel locked to polychord colour | **Proposed** | Cross-triad semitone/tritone cell |
| Arc planner over successive polychord bars | **Proposed** | home / away / return using hexatonic distance + minimum motion |
| Single-note line fingering in each guitar’s opens | **Proposed** | Largest new piece; grip solver is chords-only today |
| TAB export using part-specific opens | **Proposed** | Exporter fret maths still assume standard opens |
| Formal `musicallyApproved` from engines | **Not allowed by assertion** | Human sign-off only (`humanReviewRecord` / GCE V3 labels) |

---

## 2. Two-guitar harmonic fields and tone roles

### 2.1 Harmonic fields (existing)

Each bar is a declared pair:

- **Guitar 1 field** — parent triad `{ rootPc, quality }` realised as three MIDI pitches on Guitar 1 opens (default Lee **AAEEAA**).
- **Guitar 2 field** — parent triad on Guitar 2 opens (default Thurston **ACCGG♯C**).
- **Combined field** — PC union of both parents (`analyzeSyProtoCombinedPolychord.unionPitchClasses`); shared tones; optional Forte label when `|union| === 6`.

Fields are **declared parents**, not invented slash-chord names. Stack vs overlap labelling already follows grip MIDI ranges.

### 2.2 Tone roles (proposed)

For every melodic pitch on a guitar, classify against that bar’s pair:

| Role | Definition | Melodic use |
|---|---|---|
| `own_root` / `own_third` / `own_fifth` | In this guitar’s declared triad | Strong-beat anchors |
| `partner_*` | In the other guitar’s triad, not own | Colour, weak beats, anticipations |
| `shared` | In both parents | Pivot / hinge |
| `outside_union` | Not in combined PC set | Unaccented neighbours only |

**Vertical rule (proposed):** each guitar places **own-triad** tones on strong beats; partner tones as passing/anticipation; outside-union only as unaccented neighbours. Register stacking follows grip ranges; crossings allowed only at climax.

Nothing in-repo builds this table yet. It is the first new model piece after `QUALITY_INTERVALS`.

---

## 3. Motif generation and transformation

### 3.1 Reuse (existing)

- **`motif-ops`:** `applyOperator`, `buildChain`, lineage IDs (`m1` → `m1.r` → `m1.r.fh`, …). Operators include invert-in-field, sequence-tonal, fragment-*, liquidate, register-lift, augment/diminish, displace, etc.
- **`mapMotifPitches`:** carry a motif into a new collection (M-DEG when collections share notes; M-NEAR when disjoint).
- **`themeGenome` / motif similarity:** recall thresholds and transform budget caps.
- **Hexatonic phraseGeneration:** cell → outside → return with common-tone retention (reference pattern; currently one guitar + bass, fixed 4-bar, standard-tuning span check).

### 3.2 Motif kernel (proposed)

Build a **3–5 note cell** from the **six-note (or smaller) union**. Defining colour = a **semitone or tritone that crosses the two triads**.

**Prototype 1 cell (C + F♯m):** e.g. **G4 – F♯4 – C♯5 – C5**  
- Frames C–F♯ tritone.  
- Carries both cross-triad semitones.  
- Strong beats favour own-triad members; weak beats favour partner.  
- Store as a `motif-ops` `Motif` whose `field` is the union PC set.

### 3.3 Development chain by phrase role (proposed)

| Role | Operators |
|---|---|
| Statement | Cell as written |
| Answer | `invert-in-field` |
| Development | `fragment-head` + `sequence-tonal`; on harmony change use `mapMotifPitches` |
| Before return | `liquidate` |
| Return | Original cell + `register-lift` |

Cap travel with `themeGenome` transform budget. Do not invent a second motif family in Prototype 1.

---

## 4. Call/response, imitation, rhythmic independence

### 4.1 Reuse (existing)

- **`interaction/`** modes: `call_response`, `overlap`, `support`, `independent` (today coupled for guitar+bass).
- **`ContrapuntalLineEngine`:** line-first generation, VRB `contrapuntalLinePolicy` (`preferredImitationTypes`, `rhythmicIndependenceRequired`), strong-beat co-onset discipline on duo path, abstract → guitar/bass fill helpers.
- **`musical-evaluation`:** `relateVoices`, `buildIndependenceReport` (motion mix, simultaneous attacks, parallel 8ves/5ths, crossings).

### 4.2 Dialogue layer (proposed)

Recouple interaction modes to **Guitar 1 / Guitar 2**:

| Mode | Behaviour |
|---|---|
| `call_response` | G1 states motif on own-field notes; G2 answers ~1 bar later on partner-field notes so the polychord is heard **horizontally** |
| `overlap` | Stretto: G2 enters ~2 beats later, typically inverted |
| `support` | G2 sustains own-triad tones a semitone from G1’s line; open-string drones in SY tunings suit this |
| `independent` | Parallel processes with independence evidence targets |

**Imitation:** prefer generating concrete `ImitationEvent`-shaped receipts (or duo-equivalent) between G1/G2 rather than SATB-only abstract lines. CLE remains the line engine to **reuse for contour / independence grammar**, not a blind SATB render into two electric guitars without tone-role correction.

**Rhythmic independence:** keep CLE/duo co-onset discipline as a soft template — call_response should show **low** simultaneous attacks; support may show **higher**. No run of parallel octaves/fifths longer than 2.

---

## 5. Reuse of ContrapuntalLineEngine and motif-ops

**Do reuse:**

1. `motif-ops` for all pitch/rhythm cell transforms and lineage.
2. CLE / abstract-line **policy ideas**: imitation types, independence floors, anti-parallel checks, register interlock as *evidence targets* adapted to two lines.
3. Duo abstract fill patterns (`liftToneToRange`, strong-beat displacement) as references when mapping lines into guitar registers.
4. Hexatonic distance / `exchangeTriads` / `minimumMotionPath` / `commonToneNeighbours` for later arcs.
5. `solveGuitarGrip({ openStrings })` as **Prototype 1 playability stand-in** on ≤3-note beat groups.

**Do not reuse blindly:**

- CLE SATB register interlock that reassigns pitches across voices (distorts guitar ownership).
- Bizzi-style vertical scores that assume a single key root + bass under a two-triad field.
- Piano V1.1 polychord path (RH/LH triads) as the guitar dialogue author.
- Standard-tuning TAB fret maths for alt-tuned lines.

---

## 6. Alternative-tuning playability requirements

### 6.1 Existing

- Per-guitar opens on polychord builders (`guitar1Tuning` / `guitar2Tuning`); defaults AAEEAA / ACCGG♯C.
- Chord grips via `solveGuitarGrip` with arbitrary `openStrings`.
- SY / roadmap alt-tuning catalogs (`alternateGuitarTunings`, `sy-tuning`).
- Export deliberately **five-line treble** without six-line TAB staff-tuning on pitched staves (Sibelius-safe).

### 6.2 Requirements (proposed — binding for later stages)

1. Every melodic MIDI must be reachable on that guitar’s declared opens; refuse with **bar + guitar + pitch** named.
2. Prefer open strings; penalise position shifts, span **> 4 frets** within a beat group (5 = stretch), and wide string skips.
3. At most **one position shift per bar per guitar** for Prototype acceptance targets (tunable by ear).
4. Prototype 1 may use grip solver on short simultaneous subsets as a **stand-in**; full **line-fingering search** is Stage 3.
5. TAB export must use **part opens**, not hard-coded standard tuning, before claiming TAB truth.

---

## 7. Prototype 1 — four bars, C + F♯m

**Scope:** one harmony only; default tunings; MusicXML + evaluation receipt; **no** arc planner; **no** full fingering engine; **no** TunePainter loop.

| Item | Spec |
|---|---|
| Length | **4 bars** |
| Harmony | Guitar 1: **C major** (`rootPc: 0`, `quality: 'major'`) · Guitar 2: **F♯ minor** (`rootPc: 6`, `quality: 'minor'`) held all four bars |
| Tunings | Defaults AAEEAA / ACCGG♯C |
| Motif | Cross-triad cell (e.g. G4–F♯4–C♯5–C5) as `motif-ops` Motif on union field |
| Dialogue | `call_response`: G1 statement; G2 answer via `invert-in-field` + tone-role correction |
| Playability stand-in | `solveGuitarGrip({ openStrings })` on ≤3-note beat groups |
| Export | Existing two-part MusicXML; per-staff chord symbols; combined words above Guitar 1 |
| New code allowed (when implementing) | Tone-role table + dialogue assembly only |
| Out of scope | Harmonic arc, TAB, TunePainter, 8-bar two-harmony form |

**Prerequisite (done here):** `QUALITY_INTERVALS` exported and triad-quality focused tests green in this worktree.

---

## 8. Musical evaluation and human approval criteria

### 8.1 Evidence engines (existing — numbers only)

Use `hookEvidence`, independence reports, coherence / motif similarity. Engines **do not** grant artistic pass.

### 8.2 Proposed Prototype / audition targets (tune by ear)

| Concern | Target |
|---|---|
| Motif identity | Statement + return visible in hook evidence; every phrase traces to one root motif; lineage ≥ 3 operations |
| Polychord audibility | ≥ **75%** of each guitar’s strong beats on **own** triad; blind test: mute grips, still hear both triads in the lines |
| Anti-arpeggiation | ≤ **30%** of 3-note windows spell a triad in order with equal durations |
| Independence | Contrary + oblique ≥ similar + parallel; parallel 8ve/5th run ≤ 2; call_response = low co-attacks |
| Arc (later prototypes) | Tension peak in second half; final bar returns by minimum motion |
| Playability | No refused notes; ≤ 1 position shift / bar / guitar; span ≤ 4 frets / beat group |

### 8.3 Human approval (GCE V3 labels — additive, not a numeric score)

| Label | Meaning |
|---|---|
| TECHNICAL FAIL | Bad XML, duration, lost landmarks — repair first |
| MUSICAL REVISE | Valid score, weak craft / mechanical / playability doubts |
| CANDIDATE FOR AUDITION | Technical OK; critique finds no material defect; no independent audition yet |
| MUSICALLY APPROVED | Audition + (for guitar) physical playability + explicit artistic acceptance |

Engines keep `musicallyApproved: false` until human sign-off via review record. No automated system may assert MUSICALLY APPROVED.

Short-form (4 bars): thematic recall / large-scale form are **structurally limited** — do not treat low scores there as craft failure; judge rhythm, field fidelity, independence, and playability first.

---

## 9. Later stages

| Stage | Work | Depends on |
|---|---|---|
| **0** | Export `QUALITY_INTERVALS` | **Done (verified this worktree)** |
| **1** | Prototype 1 — 4 bars C + F♯m, tone roles + call/response dialogue | Stage 0 |
| **2** | 8 bars / two harmonies — arc planner (`home` / `away` / `return`), `mapMotifPitches` across change, return via `minimumMotionPath` | Stage 1 |
| **3** | Line-fingering engine per guitar opens + TAB export using part tuning | Stage 1–2 |
| **4** | TunePainter / loop chords → polychord bars | Stage 2–3 |

**Harmonic arcs (Stage 2):** mark bars with `placementAgainstHome` + hexatonic distance on unions; tension from distance, register, density; release = return by smallest per-guitar moves. Suggested 8-bar loop: statement 2 · answer 2 · development 2 · return 2.

**Fingering + TAB (Stage 3):** search (string, fret) paths over time; refuse OOR notes with bar/guitar labels; fix exporter opens.

---

## 10. Priority

1. Tone-role model + one-harmony dialogue (Prototype 1) — where “coherent, not arpeggiated” is won or lost.  
2. Design line-fingering early — independent tunings are the point of the instrument.  
3. Arc / multi-harmony only after Prototype 1 auditions cleanly.

---

## 11. Non-goals (this design)

- No implementation, tests, builds, commits, or pushes from this document alone.  
- No piano V1.1 polychord authorship for guitar dialogue.  
- No claim of Sibelius audition, physical play, or MUSICALLY APPROVED without evidence.  
- No replacement of LOCK / formal GCE hard-gate math.
