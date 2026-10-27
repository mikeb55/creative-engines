# MORPH / Radical Performance — Architecture Reconciliation

**Status:** PARKED findings · documentation only · 2026-10-27  
**Not** an implementation plan. **No** engine edits authorised by this file.

**Inputs reconciled**

1. Parked proposal: `docs/roadmap/MORPH-AND-RADICAL-PERFORMANCE-FUTURE-MODULES.md`
2. Design research brief (external): `/Users/user/Downloads/MORPH and Radical Performance  design research.md` (27 Oct 2026) — hierarchical Architecture A recommended; research did **not** audit this repository
3. Targeted Composer OS entry-point inspection (this pass only — not a repo-wide audit)

**Park condition unchanged.** After WWH recording (~30 Nov 2026) and preservation, then unpark + one musical milestone. Do not schedule engine work from this document alone.

---

## 1. Verdict (one paragraph)

Research Architecture **A** (hierarchical musical grammar + constraint-guided search) **aligns** with the parked proposal’s two-authority split and with existing Composer OS **lock / feasibility / evidence** surfaces. Composer OS already has reusable **MusicXML import, lane/bass locks, dual-part transforms, fret path / grip checks, WPS checker, and human BMEF + machine receipts**. It does **not** yet have a MORPH M1/M2/M3 composition engine, a portable MODEL/TRANSFORM/INVENT performance-language writer, identity-kernel selection UI, or strongest-version KEEP/DEVELOP/REWRITE selection as MORPH defines those terms. Treat Performance Composer Tritone Pair and album Python Radical Performance writers as **related but distinct** — neither implements the proposed dual-module architecture.

---

## 2. Existing reusable capabilities (verified paths)

Inspected entry points only. Capability = what the code actually exports / does.

### 2.1 MusicXML I/O, duo import, audit

| Capability | Path | Notes |
|---|---|---|
| Duo MusicXML import + fingerprints | `engines/composer-os-v2/core/wwh/wwhDuoImport.ts` (`importWwhDuoMusicXml`, `pitchFingerprint`) | Structural import; not MORPH identity analysis |
| Duration / TAB / duo structure audit | `engines/composer-os-v2/core/wwh/wwhValidate.ts` (`auditWwhMusicXml`) | Technical validity tier |
| Locked-span note compare | `engines/composer-os-v2/core/wwh/wwhSourceCompare.ts` (`compareLockedSpan`) | Regression / lock evidence |
| SHA-256 helpers (dual-part) | `engines/composer-os-v2/core/duo/wwhDualPartTransform.ts` (`sha256File`, `sha256Text`) | Source hash gates |

### 2.2 Source / bass / lane locks (performance rewrite surfaces)

| Capability | Path | Notes |
|---|---|---|
| Lane write + lock proof | `engines/composer-os-v2/core/performance-composer/pcLane.ts` (`writeLane`, `verifyLockedCopy`) | Only lane voice inside span may change |
| Tritone Pair compose + bass/form lock verify | `pcTritonePair.ts`, `pcTritonePairWrite.ts` (`composeTritonePair`, `writeTritonePair`, `verifyTritonePair`) | Guitar-only rewrite; bass/form/metre/tempo/chord symbols locked per field-map contract |
| Respond / Replace / Insert / Keep (PC ops) | `pcRespond.ts`, `pcReplace.ts`, `pcInsert.ts`, `pcKeep.ts` | Roadmap: frozen as “too close to leadsheets”; **pcKeep ≠ MORPH KEEP/DEVELOP/REWRITE** |
| Provenance stamp | `pcProvenance.ts` | Operation lineage on XML |
| Score parse / measure views | `pcScore.ts` | Shared PC representation |
| Performance Plan bind/validate | `engines/composer-os-v2/core/wwh/director/validatePerformancePlan.ts` (`bindAndValidatePlan`) | Plan ↔ source part/bar bind; not M1–M3 |
| WWH Performance Composer V7 compose | `wwhPerformanceComposerV7.ts` (`composeWwhPerformance`, `lockedGuitarFingerprint`) | Multi-output performance sketch path; source not rewritten |
| V8 UI surface | `apps/composer-os-app/src/pages/WwhPerformanceV8.tsx` | App entry; not MODEL/TRANSFORM/INVENT |

### 2.3 Dual-part / bass-only transforms (motif-preserving)

| Capability | Path | Notes |
|---|---|---|
| Dual guitar+bass profiles | `wwhDualPartTransform.ts` (`runDualPartTransform`, `transformHarmonic` / `transformContrapuntal` / `transformRhythmic`, `motifIntact`, `validateDualPartXml`) | Source path hashed; motif bars pitch-locked; **not** MORPH mode engine |
| Bass-only rewrite | `engines/composer-os-v2/core/duo/wwhBassOnlyTransform.ts` (`transformBassOnly`, `verifyBassOnlyLocks`) | Requires `lockGuitar` + `preserveHarmony` — **opposite** of typical WWH radical guitar rewrite (bass locked) |

### 2.4 Instrumental feasibility

| Capability | Path | Notes |
|---|---|---|
| Timed fret-path solver | `engines/composer-os-v2/core/performance-composer/pcFretboard.ts` (`solveFretPath`, `fingeringOptions`) | Hard-shift / span / fret receipts; used by WPS |
| Grip / span feasibility | `engines/composer-os-v2/core/guitar/voicingFeasibility.ts` via re-export `barry-harris/guitarVoicingFeasibility.ts` (`assessGuitarFeasibility`, `isGuitarVoicingFeasible`) | Voicing feasibility, not full MORPH guitar-feasibility PASS/REVIEW/FAIL report suite |

### 2.5 Checker / evaluation (not note writers)

| Capability | Path | Notes |
|---|---|---|
| WPS assess (checker) | `engines/composer-os-v2/core/wwh/wps/wpsAssess.ts` (`runWps`) | Explicitly **does not** run `evaluateGce` / DCR on hand-authored WWH XML; fret path diagnostic only |
| Machine evidence receipts | `engines/composer-os-v2/core/musical-evaluation/service.ts` (`evaluateScore`, `compareScores`) | `musicalQualityScore: null`; no artistic total |
| Canonical MusicXML ingest | `musical-evaluation/canonicalScore.ts` (`ingestCanonicalScore`) | Evaluation representation |
| Technical checks | `musical-evaluation/technicalChecks.ts` (`runTechnicalChecks`) | Technical validity |
| BMEF catalog + empty human scorecard | `bmefCatalog.ts`, `humanReviewRecord.ts` | Human BMEF-100 V2.0 surface; machine ratings stay null |
| Official numeric GCE | `engines/composer-os-v2/core/evaluation/gceEvaluator.ts` (`evaluateGce`) | Requires Composer OS `ScoreModel` — **not** hand-authored WWH MusicXML |

### 2.6 Method / album / one-offs (not Composer OS modules)

| Item | Path | Role |
|---|---|---|
| MORPH method V0.3 | `docs/MORPH_FRAMEWORK_V0.3.md`, `docs/MORPH_OPERATING_PROCEDURE_V0.3.md` | Procedure authority; MusicXML-only rule |
| Agent MusicXML-only | `.cursor/rules/morph-musicxml-only.mdc` | Default deliverable contract |
| Black Aura chord-melody one-off | `engines/composer-os-v2/scripts/wwhBlackAuraChordMelodyV11.py` | Song-specific; not portable Radical Performance module |
| Album Radical Performance Python | external `WWH-RADICAL-PERFORMANCE-EDITIONS/**/build_*.py`, `_lib/scorelib.py` | Behavioural reference only; outside this repo’s ship surface |
| PC radical mode roadmap note | `docs/COMPOSER_OS_ROADMAP.md` (Performance Composer radical mode) | Tritone Pair gate vs 30 Nov recording |

---

## 3. Map: proposal / research → Composer OS today

| Proposed piece | Research stance | Composer OS today | Gap class |
|---|---|---|---|
| Two authorities (MORPH ≠ Radical Performance) | Strongly recommended | Documented intent only; no shared module boundary in code | **Design debt** (keep separate) |
| Architecture A hierarchical search | Rank-1 foundation | Partial: PC/director/dual-part are **local** rewriters + validators, not hierarchical form planners | **Genuine gap** |
| Architecture B factor-oracle | Specialist MODEL/TRANSFORM component | Not present | Gap / later |
| Architecture C latent + repair | Later research | Not present; Magenta archived — do not assume | Gap / later |
| M1 Conservative / Melody-led | New continuations ≠ ornament-only | Dual-part + PC ops can change notes under locks; **no** M1 identity contract or mode receipt | Gap |
| M2 Structural recomposition | Explicit new formal plan | No form planner; dual-part default keeps bar count; PC Insert changes length locally | Gap |
| M3 Radical abstraction | Declared identity kernel; recognisability ≠ derivation | No identity-kernel type; no separate derivation vs recognisability reports | Gap |
| MODEL analyse performance language | Needs recordings for timing/touch claims | MusicXML-only analysis possible for written cues; **no** MODEL profile builder | Gap + **assumption risk** |
| TRANSFORM apply performance language | Pitch-exact vs generative modes distinct | Tritone Pair / dual-part / V7 are transforms of **notes**, not portable performance-language profiles | Partial reuse / gap |
| INVENT new approaches | Empty/light cues under constraints | No portable invent-bar curriculum writer in Composer OS (album Python does labs) | Gap (album-side precedent) |
| Strongest-version KEEP/DEVELOP/REWRITE | MORPH selection | **Name collision:** `pcKeep` = compose accepted PC ops, not MORPH comparative selection | Conflict (naming) |
| Multidimensional change budget | Research | Not implemented as typed budget | Gap |
| Interaction planner (initiative/response/silence) | Research | Director performance plans + Respond windows are related sketches; not the proposed joint planner | Partial / unverified fit |
| Shared provenance + feasibility + export | Research shared infra | Provenance, fret path, locks, MusicXML export **exist** and should be shared | Reuse |

---

## 4. Conflicts with source / bass locks and BMEF / GCE

### 4.1 Locks

1. **WWH radical guitar path locks bass.** Tritone Pair and MORPH WWH procedure lock upright bass / form / metre. Dual-part **dual** mode rewrites guitar **and** bass; **bassOnly** locks guitar. Any future MORPH/RP module must declare which lock polarity it uses — silent dual-part reuse would **break** WWH bass-lock convention.
2. **pcKeep / Insert change bar count.** MORPH V0.3 locks bar count unless a break is written first. Reusing Insert/Keep as MORPH M2 “structural” tools without an explicit formal-plan + lock-break receipt conflicts with method.
3. **MotifIntact ≠ M1 identity.** Dual-part `motifIntact` checks selected guitar bars’ MIDI lists. MORPH identity needs cells, returns, recognition windows, and lineage — not only bar MIDI equality.
4. **Album Python writers** must not be driven to overwrite leadsheets or prior editions; Composer OS sandbox outputs only.

### 4.2 BMEF / GCE

1. **`evaluateGce` on hand-authored WWH XML is forbidden as a musical result** — already stated in WPS (`wpsAssess.ts`) and MORPH / GCE V3 docs. Proposal and research agree: numeric GCE only on a representation the evaluator was built for (`ScoreModel`).
2. **`evaluateScore` / BMEF human review** are the correct Composer OS hooks: machine evidence + empty human scorecard; `musicalQualityScore` stays `null`. Do not invent artistic totals.
3. **Research evidence tiers** (technical / physical / diagnostics / auditory / player) **inform** later criteria; they must **not** redefine GCE V2 formulas, hard gates, or BMEF-100 V2.0 weights (still **[Proposed]**).
4. **Name collisions to avoid:** `HexatonicBmef` / other local “BMEF” objects ≠ BMEF-100 V2.0 human framework; guitar solver PASS ≠ CANDIDATE FOR AUDITION ≠ MUSICALLY APPROVED.
5. **Research brief assumed language-neutral / unaudited code.** This reconciliation supersedes “assume neither Python rewrite nor unverified capability” for the **listed** TypeScript entry points only. Album Python remains external reference.

---

## 5. Genuine gaps and unverified assumptions

### 5.1 Genuine gaps (no matching Composer OS module)

- MORPH mode engine (M1/M2/M3) with identity profile, change budget, KEEP/DEVELOP/REWRITE comparative selection
- Portable Radical Performance MODEL/TRANSFORM/INVENT curriculum + performance-edition writer
- Declared identity kernel + separate derivation map vs recognisability assessment
- Hierarchical form / phrase planner (Architecture A core)
- Sequence-level bass physical model beyond MIDI range soft checks
- Recording-aligned MODEL profiles (timing, touch, duo interaction from audio)
- Non-WWH transfer harness for either module

### 5.2 Unverified / risky assumptions (do not treat as shipped)

| Assumption in proposal/research | Status after inspection |
|---|---|
| `pcFretboard` / `guitarVoicingFeasibility` = full MORPH guitar-feasibility contract | **Partial.** Path + grip helpers exist; album MORPH PASS/REVIEW/FAIL inventory is a separate historical procedure |
| Dual-part transform is a MORPH building block | **Partial / polarity risk.** Useful motif + hash machinery; lock polarity often wrong for WWH bass-locked radical guitar |
| Performance Composer ≈ Radical Performance | **False equivalence.** Tritone Pair is one field grammar; RESPOND/REPLACE/INSERT/KEEP frozen; not MODEL/TRANSFORM/INVENT |
| WPS can later “become” the writer | **Conflict with current contract.** WPS is checker-only |
| MusicXML alone supports MODEL timing/touch claims | **Unsupported** without recordings (research correctly flags this) |
| Partitura / music21 / Strasheela / OMax / MusicVAE as drop-in deps | **Not verified in this repo.** Research lists them as references only; Composer OS already has XML adapters — prefer reuse |
| Album `_lib/scorelib.py` ports cleanly | **Unverified.** Behavioural reference; redesign before production port |
| M3 audibility follows from traceable derivation | **Method conflict.** V0.3 + research: report separately |

---

## 6. Recommended first musical milestone (after 30 Nov)

**Name:** Black Aura — locked-bass M1 DEVELOP proof (one page)

**When:** After recording + preservation hash inventory + explicit unpark of the parked proposal.

**What (single end-to-end deliverable)**

1. Authoritative Black Aura leadsheet MusicXML + SHA-256 frozen.
2. Human-declared identity profile (3–5 cells, formal anchors, recognition windows) — correctable before write.
3. **M1 only** (Conservative / Melody-led): new MusicXML filename; bass / bar count / metre / tempo / rehearsal locks verified with existing lock helpers (`verifyLockedCopy` / `compareLockedSpan` / dual-part hash pattern as appropriate — **bass locked**).
4. Guitar feasibility receipt via `solveFretPath` + grip checks (computational only).
5. Machine `evaluateScore` receipt + empty human BMEF review; **no** invented GCE number; **no** MUSICALLY APPROVED from automation.
6. Short player or Sibelius score review note (evidence tier stated). Compare against: source, one simple transform baseline (e.g. dual-part or Tritone Pair seed if already generated), and strongest prior MORPH page if present — KEEP/DEVELOP/REWRITE decision recorded.

**Out of scope for first milestone:** M2 form rewrite, M3 kernel rebuild, portable MODEL/TRANSFORM/INVENT writer, Architecture B/C, UI polish, nine-song batch, album overwrite.

**Pass criteria (musical, not menu size):** audible identity retained under M1; at least one meaningful new continuation/counterline/harmony idea; locks hold; evidence tiers labelled honestly.

**If Tritone Pair Black Aura play-test already failed pre-recording:** do not reopen PC radical phases as a substitute for this MORPH M1 milestone; keep authorities separate.

---

## 7. Reuse order after unpark (planning only)

1. Freeze hashes (leadsheets, MORPH guitar-verified, Radical Performance editions).
2. MORPH skeleton: types + lock validation + source report (no note writing).
3. M1 DEVELOP write path behind comparative selection; wire existing feasibility + evaluation.
4. Only then Radical Performance schema (MODEL/TRANSFORM/INVENT) importing one album fixture read-only.
5. Architecture B/C remain optional proposal interfaces — not dependencies for milestone 1.

---

## 8. Reference index

- `docs/roadmap/MORPH-AND-RADICAL-PERFORMANCE-FUTURE-MODULES.md`
- `/Users/user/Downloads/MORPH and Radical Performance  design research.md`
- `docs/MORPH_FRAMEWORK_V0.3.md`, `docs/MORPH_OPERATING_PROCEDURE_V0.3.md`
- `docs/GCE_FRAMEWORK_V2.md`, `docs/GCE_FRAMEWORK_V3.md`, `docs/GCE_LOCK_DCR_STANDARDS.md`
- `docs/COMPOSER_OS_ROADMAP.md` (Performance Composer radical mode / 30 Nov gate)
- Entry points listed in §2
