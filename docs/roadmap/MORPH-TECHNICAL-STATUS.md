# MORPH — Technical Status

**Date:** 2026-10-30
**Checkpoint:** `397e08c0` (pushed)
**Source:** `01-Black-Aura-Duo-Leadsheet-V2.0.musicxml` · SHA-256 `b85f7731f0232c02ae588c63f2950037a340f62af64fe42b74b03157da4fccfd`
**Scope:** Machine / Studio technical evidence only. Not artistic approval. Not a claim of M3 radicality.

---

## 1. Mode technical PASS

| Mode | Technical | Evidence |
|---|---|---|
| **M1** | **PASS** (locks / Studio path) | Locked-bass dual-part path + Studio wiring verified. Durable MusicXML candidate SHA/path **missing** (`MORPH-M1-BLACK-AURA-CANDIDATE-REVIEW.md`; temp musical-compare gone). |
| **M2** | **PASS** | `.tmp-morph-m2-verify/RUNTIME-VERIFY.json` · candidate SHA `1187d014…c74c1648` · window 13–15 · lineage `ba-m2-cell-b9→…→.i.ex.sr`. |
| **M3** | **PASS** | `.tmp-morph-m3-verify/RUNTIME-VERIFY.json` + `CANDIDATE-PROOF.json` · candidate SHA `9f78ad20…6ce8d768` · identity locks intact · `musicalOrArtisticApproval=false`. |

**Studio integration:** **6/6 PASS** (M1–M3 Development Studio wiring at checkpoint).

---

## 2. M2 / M3 BMEF machine evidence

Receipts: `.tmp-morph-bmef-eval/M2-compareScores-receipt.json`, `M3-compareScores-receipt.json`, `BLACK-AURA-M2-M3-BMEF-COMPARE-REPORT.json` (post fractional-duration ingest fix).

| Item | M2 vs source | M3 vs source |
|---|---|---|
| Event diffs | 30 · bars **13–15** | 30 · bars **13–15** |
| Technical summary | parse / measure / part-voice / pitch-range / guitar / reimport **pass** | same **pass** |
| Structural findings | 681 → 690 | 681 → 690 |
| BMEF criterion tags (counts) | J1=77 · J2 305→313 · U1 12→13 · J3=273 · U3=10 · U6=3 | same delta pattern |
| Artistic totals / decisions | **null** (not invented) | **null** |

Same-ops M2 vs original M3 guitar bars 13–15 were **IDENTICAL** (shared reshape writer + identical ops). That is technical identity of output, not a musical ranking.

---

## 3. M3 DISTINCT (ops differentiation)

Temporary candidate: `.tmp-morph-m3-verify/out-distinct/M3-Reimagine-Black-Aura-M3-distinct-ops.musicxml`
Ops: `invert` · `expand-intervals` amount **2** · `sequence-real` steps **−2**, count **1**.

| Check | Result |
|---|---|
| Guitar 13–15 vs M2 | **DISTINCT** — **4 pitch events** changed (rhythm/onsets/durs unchanged): bar 14 Db5→C5; bar 15 G5→Eb5, Eb5→Bb4, G5→Eb5 |
| Identity locks / bass / harmony / metre / ticks | **PASS** |
| Source SHA | unchanged |

**Do not read DISTINCT as radical REIMAGINE success.** It shows ops params can diverge pitch under existing locks only.

---

## 4. Explicitly pending (not PASS)

- **M1 durable candidate** MusicXML + SHA
- **Listening / BMEF E2**
- **Performance / BMEF E3**
- **Official GCE** (`evaluateGce` / ScoreModel) and **GCE V3** labels
- **Human BMEF decision** and **MUSICALLY APPROVED** / artistic acceptance

Machine evidence ≠ musical recommendation ≠ human approval.
