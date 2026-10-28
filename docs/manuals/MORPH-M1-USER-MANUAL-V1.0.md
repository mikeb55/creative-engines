# MORPH M1 User Manual V1.0

**Status:** User-facing documentation of **verified** Composer OS M1 surfaces.
**Date:** 2026-10-28
**HEAD reference when authored:** `af75d4fc`
**Authorities:** `docs/MORPH_FRAMEWORK_V0.3.md`, `docs/MORPH_OPERATING_PROCEDURE_V0.3.md`, `docs/roadmap/MORPH-M1-BLACK-AURA-CONTRACT.md`
**Code surfaces cited:** `apps/composer-os-app/src/develop/DevelopmentStudioPage.tsx`, `engines/composer-os-v2/app-api/developApp.ts` (`apiDevelopDualPart`), desktop IPC `composer-os-api:develop-dual-part`

This manual describes what the shipped Development Studio M1 path **does**. It does **not** invent planned GUI gates, candidate SHAs, GCE numbers, or musical approval.

---

## 1. What M1 is here

**M1** = melody-led / conservative transformation under MORPH V0.3, applied in this product as:

- Import MusicXML (source stays immutable in the UI).
- Discover and **explicitly select** a motif cell (bars from that selection only).
- Run **harmonic dual-part** transform with **`lockBass: true`**.
- Inspect separate output + lineage; export MusicXML.

Route: **Development Studio** (`/develop`).

Banner on the page and every M1 lineage string: **Not musically approved**.

---

## 2. Import (verified)

| Action | Behaviour |
|---|---|
| **Latest Generate** | Loads last Generate MusicXML into the import field. |
| **Open MusicXML** | File picker accepts `.musicxml` / `.xml`; loads file text + filename as label. |
| **Textarea** | Direct paste / edit of imported XML in the page. |

Verified rules:

- Load clears any prior M1 harmonic output and lineage (new import = clean candidate slot).
- Imported source string (`xml`) is **never overwritten** by the harmonic transform.
- Score audition preview is available on the imported XML.

Contract Black Aura master (when used): path and SHA in `docs/roadmap/MORPH-M1-BLACK-AURA-CONTRACT.md`. The app does not auto-bind that file; you import it.

---

## 3. Cell selection and motif bars (verified)

1. **Found in this score** → `api.developDiscover` / discover motifs on imported (or last Generate) XML.
2. Click a discovered cell → sets selected cell id and working motif.
3. Motif bars for M1 = unique occurrence bars of the **selected** cell only.

Hard rules in UI + API:

- No silent default motif bars (no `[1, 2]` fallback).
- Without a selected cell with bars, **Run harmonic transform (lockBass)** refuses and shows an error.
- API rejects empty / non-integer / non-positive `motifBars`.

---

## 4. `lockBass` harmonic transform (verified)

**Button:** Run harmonic transform (lockBass)
**API:** `POST /develop/dual-part` · IPC `composer-os-api:develop-dual-part` · `apiDevelopDualPart`

| Field | Verified behaviour |
|---|---|
| Profile | `harmonic` only on this path |
| `lockBass` | Forced `true`. Request with `lockBass !== true` → error: *M1 dual-part requires lockBass=true.* |
| Source | Written to a temp file only; caller XML untouched |
| Output | Separate MusicXML + SHA; UI stores it in `harmonicOutXml`, not in import `xml` |
| Lineage | Built string includes source label/SHA, mode M1 harmonic, `lockBass: true`, motifBars, selected cell, barCount, output file/SHA, validation, and **`status: Not musically approved`** |
| Export | **Export M1 harmonic MusicXML** downloads the separate candidate |

`lockBass` means bass pitch/rhythm locked for the harmonic dual-part transform. Technical lock success is **not** musical improvement and **not** human ACCEPT.

---

## 5. Two gate vocabularies (do not merge)

MORPH and the Black Aura contract use **two separate gate systems**. The Development Studio M1 path does **not** provide buttons that set either vocabulary. Humans (and review Markdown) record them outside the transform run.

### 5.1 MORPH comparative selection — KEEP / DEVELOP / REWRITE

| Word | Meaning (MORPH V0.3) |
|---|---|
| **KEEP** | Strong enough on notation evidence. Copy the file; do not recompose; say it is a copy. |
| **DEVELOP** | Idea worth keeping. Change named weak bars; leave the rest. |
| **REWRITE** | Declared idea fails, or writing is mechanical / lost the source. Blueprint from cells, then new notes; keep anchors. |

These are **comparative arrangement decisions** after reading MusicXML (and ideally Sibelius / play). They are **not** guitar solver PASS/REVIEW/FAIL. They are **not** human artistic ACCEPT.

**Verified product fact:** Development Studio has **no** KEEP / DEVELOP / REWRITE control. Black Aura candidate review may record e.g. **DEVELOP (provisional)** in Markdown (`docs/roadmap/MORPH-M1-BLACK-AURA-CANDIDATE-REVIEW.md`) without the app writing that word into MusicXML.

### 5.2 Human artistic approval — ACCEPT / REVISE / REJECT

| Word | Role (contract / MORPH human gate) |
|---|---|
| **ACCEPT** | Human artistic acceptance after review / audition evidence you actually have |
| **REVISE** | Human asks for named changes; not machine auto-approval |
| **REJECT** | Human rejects the candidate as artistic output |

**Verified product fact:** M1 Develop page does **not** capture ACCEPT / REVISE / REJECT. It permanently labels work **Not musically approved** on page, lineage, and practice / evaluation handoffs.

Automation must **not** claim **MUSICALLY APPROVED** or invent a GCE number.

### 5.3 Related words that are still not those gates

| Vocabulary | Where | Not to be confused with |
|---|---|---|
| Guitar **PASS / REVIEW / FAIL** | Feasibility solvers | KEEP/DEVELOP/REWRITE or human ACCEPT |
| Evaluation UI **ACCEPT / REFINE / REJECT / FORK** | Evaluation `ReviewPanel` (separate route) | MORPH KEEP/DEVELOP/REWRITE; also not auto MUSICALLY APPROVED |
| WWH V3 labels (**TECHNICAL FAIL**, **MUSICAL REVISE**, **CANDIDATE FOR AUDITION**, **MUSICALLY APPROVED**) | Evidence labels in MORPH/GCE V3 docs | Automatic result of `lockBass` run |

---

## 6. How to run a locked-bass M1 pass (verified steps)

1. Open **Development Studio** (`/develop`).
2. **Import** MusicXML (file, Latest Generate, or paste).
3. **Found in this score** → select a cell (motif bars appear under M1 section).
4. **Run harmonic transform (lockBass)**.
5. Read lineage (`develop-m1-lineage`), preview/audition candidate, **Export M1 harmonic MusicXML** if you want a file.
6. Optionally **Send** → Practice / BHL / Evaluate — handoff status remains **Not musically approved**.

Optional later (human, outside auto-approval):

- Record MORPH **KEEP / DEVELOP / REWRITE** in a review note (comparative).
- Record human **ACCEPT / REVISE / REJECT** only after real review evidence.
- Audition and formal GCE only if those steps actually happen; do not invent scores.

---

## 7. What this release does **not** do

- No M1 UI control that sets KEEP, DEVELOP, or REWRITE.
- No M1 UI control that sets human ACCEPT, REVISE, or REJECT.
- No automatic musical approval from bass lock PASS.
- No fabricated candidate SHA in this manual (export produces a real SHA in lineage when a run succeeds; this doc does not invent one).
- No audio/MIDI/ZIP packaging as part of M1 (MusicXML + Markdown / lineage text).

---

## 8. Pointers

| Doc | Use |
|---|---|
| `docs/roadmap/MORPH-M1-BLACK-AURA-CONTRACT.md` | Source SHA, locks, identity/lineage/approval requirements |
| `docs/roadmap/MORPH-M1-BLACK-AURA-CANDIDATE-REVIEW.md` | Example provisional DEVELOP record; no human ACCEPT |
| `docs/MORPH_FRAMEWORK_V0.3.md` §11–§14 | KEEP/DEVELOP/REWRITE; WWH labels; human review evidence |
| `docs/MORPH_OPERATING_PROCEDURE_V0.3.md` | Step order for maps and verification |

---

## 9. One-line rule

**`lockBass` + separate MusicXML + lineage = technical M1 run. KEEP/DEVELOP/REWRITE = comparative MORPH choice. ACCEPT/REVISE/REJECT = human artistic gate. The app implements the first; humans record the other two.**
