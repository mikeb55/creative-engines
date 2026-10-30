# Composer OS V4.0 — Musician's Guide

**Status:** structure only (headings + one-line stubs). No worked examples yet.

**Checkpoint:** `a4749fcb`.

**Audience:** musicians using Composer OS for practical musical goals.

**Capability tags**

| Tag | Meaning |
|---|---|
| `[SHIPPED]` | Documented as present in product / playbook; steps not verified in this guide |
| `[UNVERIFIED]` | Likely present; GUI path and musical outcome not confirmed here |
| `[PARTIAL]` | Some of the goal works; gaps called out in the one-liner |
| `[UNIMPLEMENTED]` | Not a reliable musician path today — do not expect full workflow |

---

<a id="contents"></a>

## Contents

1. [How to use this guide](#how-to-use-this-guide)
2. [Scenario index (all)](#scenario-index)
3. [A — Melodic writing & identity](#a--melodic-writing--identity)
4. [B — Harmony language & reharmonisation](#b--harmony-language--reharmonisation)
5. [C — Rhythm, groove & metre](#c--rhythm-groove--metre)
6. [D — Counterpoint & independent lines](#d--counterpoint--independent-lines)
7. [E — Orchestration & ensemble colour](#e--orchestration--ensemble-colour)
8. [F — Transform existing music (MORPH M1 / M2 / M3)](#f--transform-existing-music-morph-m1--m2--m3)
9. [G — Form, length & structural shape](#g--form-length--structural-shape)
10. [H — Practice & study material](#h--practice--study-material)
11. [I — Audition, preview & listening](#i--audition-preview--listening)
12. [J — Notation handoff (MusicXML & hosts)](#j--notation-handoff-musicxml--hosts)
13. [K — Evaluation & musical critique](#k--evaluation--musical-critique)
14. [L — Starting from charts & imports](#l--starting-from-charts--imports)
15. [Legend & fill-in checklist](#legend--fill-in-checklist)

---

<a id="how-to-use-this-guide"></a>

## How to use this guide

Jump by **musical goal**, not by engine name. Each scenario reserves the same six sections for later fill-in. Prefer MusicXML + host notation for final judgment; in-app preview is a pitch/timing sanity check only. Tags mark honesty about what is shipped vs unverified vs unimplemented.

[↑ Contents](#contents)

---

<a id="scenario-index"></a>

## Scenario index

| ID | Goal area | Title | Tag |
|---|---|---|---|
| [S01](#s01) | Melody | Strong hook on a short Song Mode chart | `[UNVERIFIED]` |
| [S02](#s02) | Melody | Vocal lead sheet for singing rehearsal | `[PARTIAL]` |
| [S03](#s03) | Melody | Motif recall across a 32-bar form | `[UNVERIFIED]` |
| [S04](#s04) | Melody | Guitar–bass duo with clear melodic lead | `[SHIPPED]` |
| [S05](#s05) | Melody | Pentatonic colour path for motif transform | `[SHIPPED]` |
| [S06](#s06) | Melody | Hexatonic phrase as melodic étude | `[SHIPPED]` |
| [S07](#s07) | Harmony | Paste a progression and generate a playable chart | `[SHIPPED]` |
| [S08](#s08) | Harmony | iReal chart → Song Mode arrangement | `[SHIPPED]` |
| [S09](#s09) | Harmony | Writer-slice harmony colour (e.g. Jobim / Evans / Miles) | `[SHIPPED]` |
| [S10](#s10) | Harmony | Chord Inspector reharm substitutes | `[SHIPPED]` |
| [S11](#s11) | Harmony | Post-generate bar-range reharm preview | `[SHIPPED]` |
| [S12](#s12) | Harmony | Tonality Vault riff over locked changes | `[SHIPPED]` |
| [S13](#s13) | Harmony | Classical song overlay on a modern progression | `[SHIPPED]` |
| [S14](#s14) | Harmony | Deep harmonic voice pairing with a songwriter | `[UNVERIFIED]` |
| [S15](#s15) | Rhythm | Odd-metre / mixed-metre Song Mode chart | `[SHIPPED]` |
| [S16](#s16) | Rhythm | Greek Rebetiko dance-metre percussion study | `[SHIPPED]` |
| [S17](#s17) | Rhythm | Blend two rhythm engines into one étude | `[SHIPPED]` |
| [S18](#s18) | Rhythm | Fela / Afrobeat percussion feel on Song Mode | `[PARTIAL]` |
| [S19](#s19) | Rhythm | Big Band drum intensity (sparse → driving) | `[SHIPPED]` |
| [S20](#s20) | Rhythm | Short loopable riff (1–4 bars) | `[SHIPPED]` |
| [S21](#s21) | Counterpoint | Line-first duo with independent bass | `[SHIPPED]` |
| [S22](#s22) | Counterpoint | String Quartet with SQ VRB voice rules | `[SHIPPED]` |
| [S23](#s23) | Counterpoint | Blend two SQ arrangers for colour mix | `[SHIPPED]` |
| [S24](#s24) | Counterpoint | Bartók / Brookmeyer-style line hierarchy | `[UNVERIFIED]` |
| [S25](#s25) | Orchestration | Full Big Band chart from changes | `[SHIPPED]` |
| [S26](#s26) | Orchestration | ECM chamber sparse duo texture | `[SHIPPED]` |
| [S27](#s27) | Orchestration | String Quartet realisation of a lead sheet | `[PARTIAL]` |
| [S28](#s28) | Orchestration | Section regenerate one span without rewriting all | `[SHIPPED]` |
| [S29](#s29) | Orchestration | Alternate guitar tuning on a Song Mode / vault path | `[SHIPPED]` |
| [S30](#s30) | MORPH | M1 — expand / protect source harmony regions | `[SHIPPED]` |
| [S31](#s31) | MORPH | M2 — reshape phrase contour while keeping identity | `[PARTIAL]` |
| [S32](#s32) | MORPH | M3 — reimagine with distinct ops (candidate audit) | `[UNVERIFIED]` |
| [S33](#s33) | MORPH | Compare M1 vs M3 MusicXML side-by-side | `[UNVERIFIED]` |
| [S34](#s34) | Form | Multi-chorus chart with motif phase rotation | `[PARTIAL]` |
| [S35](#s35) | Form | 12-bar blues Big Band form variant | `[SHIPPED]` |
| [S36](#s36) | Form | Repeat / volta truth into exported bar count | `[SHIPPED]` |
| [S37](#s37) | Practice | Practice & Scales Studio session + export | `[SHIPPED]` |
| [S38](#s38) | Practice | BHL colour / tension–release study | `[PARTIAL]` |
| [S39](#s39) | Practice | Solo piano miniature for reading & feel | `[UNVERIFIED]` |
| [S40](#s40) | Preview | In-app Play after Generate (pitch + timing check) | `[SHIPPED]` |
| [S41](#s41) | Preview | Preview limits: unpitched drums / missing XML path | `[PARTIAL]` |
| [S42](#s42) | Export | Shareable MusicXML to Sibelius | `[SHIPPED]` |
| [S43](#s43) | Export | MusicXML for MuseScore audition (BHL / study paths) | `[SHIPPED]` |
| [S44](#s44) | Export | MIDI companion file after successful XML write | `[SHIPPED]` |
| [S45](#s45) | Export | Guitar TAB / both-staff export with transpose truth | `[PARTIAL]` |
| [S46](#s46) | Evaluation | Musician-facing GCE critique of a short chart | `[SHIPPED]` |
| [S47](#s47) | Evaluation | Formal LOCK / GCE readiness before sharing | `[SHIPPED]` |
| [S48](#s48) | Evaluation | Evaluation Dashboard / provisional candidate status | `[PARTIAL]` |
| [S49](#s49) | Import | Real Book–style MusicXML lead sheet in | `[PARTIAL]` |
| [S50](#s50) | Import | PDF lead-sheet chords → vault / generate path | `[SHIPPED]` |
| [S51](#s51) | Import | Lead-sheet input → composer-coloured ensemble | `[PARTIAL]` |
| [S52](#s52) | Workflow | Green integrity receipt vs “not shareable” amber | `[SHIPPED]` |

**Scenario count: 52**

[↑ Contents](#contents)

---

<a id="a--melodic-writing--identity"></a>

## A — Melodic writing & identity

[↑ Contents](#contents)

<a id="s01"></a>

### S01 — Strong hook on a short Song Mode chart `[UNVERIFIED]`

Get a memorable lead idea over a short form without overwriting locked harmony.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s02"></a>

### S02 — Vocal lead sheet for singing rehearsal `[PARTIAL]`

Optional vocal lead-sheet MusicXML from planned lead melody — not a transcription of guitar comp; confirm when “Include vocal lead sheet” is on.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s03"></a>

### S03 — Motif recall across a 32-bar form `[UNVERIFIED]`

Phrase Engine / hook-first paths aim for structural recall; verify on a full 32-bar duo run before treating as guaranteed.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s04"></a>

### S04 — Guitar–bass duo with clear melodic lead `[SHIPPED]`

Generate duo family scores where the lead line is musically primary and bass supports.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s05"></a>

### S05 — Pentatonic colour path for motif transform `[SHIPPED]`

Use `#/pentatonic` analyse / transform / generate phrase to move a motif through colour without forcing a hard pitch cage.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s06"></a>

### S06 — Hexatonic phrase as melodic étude `[SHIPPED]`

Use `#/hexatonic` scalar / WPS material for a short phrase étude with MusicXML out.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="b--harmony-language--reharmonisation"></a>

## B — Harmony language & reharmonisation

[↑ Contents](#contents)

<a id="s07"></a>

### S07 — Paste a progression and generate a playable chart `[SHIPPED]`

Paste chord symbols → key / meter / mode → generate vault or Song Mode arrangement.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s08"></a>

### S08 — iReal chart → Song Mode arrangement `[SHIPPED]`

Import iReal Pro text and produce a multi-bar arrangement with chorus count control.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s09"></a>

### S09 — Writer-slice harmony colour (e.g. Jobim / Evans / Miles) `[SHIPPED]`

Pick a shipped songwriter slice so effective harmony reflects that language (receipts / locked truth).

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s10"></a>

### S10 — Chord Inspector reharm substitutes `[SHIPPED]`

Inspect one symbol, browse drift-ordered substitutes, apply a candidate back into the chart field.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s11"></a>

### S11 — Post-generate bar-range reharm preview `[SHIPPED]`

After Generate, preview alternative harmony on a bar span and apply without inventing a third surface.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s12"></a>

### S12 — Tonality Vault riff over locked changes `[SHIPPED]`

Build a vault riff / grip-aware line over a parsed chart with mode and tuning choices.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s13"></a>

### S13 — Classical song overlay on a modern progression `[SHIPPED]`

Blend a classical song influence onto Song Mode harmony planning without replacing the primary writer.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s14"></a>

### S14 — Deep harmonic voice pairing with a songwriter `[UNVERIFIED]`

Stack a deep harmonic voice with primary songwriter; confirm UI pairing and musical effect in a later fill-in.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="c--rhythm-groove--metre"></a>

## C — Rhythm, groove & metre

[↑ Contents](#contents)

<a id="s15"></a>

### S15 — Odd-metre / mixed-metre Song Mode chart `[SHIPPED]`

Generate with mixed meters / `barMeterMap` and confirm the mixed-metre badge on preview blocks.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s16"></a>

### S16 — Greek Rebetiko dance-metre percussion study `[SHIPPED]`

Use Greek rhythm controls / presets (e.g. hasapiko, zeibekiko) and export unpitched percussion MusicXML.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s17"></a>

### S17 — Blend two rhythm engines into one étude `[SHIPPED]`

Rhythm blend lab: Engine A / B, song-form vs layer blend, export blended rhythm MusicXML.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s18"></a>

### S18 — Fela / Afrobeat percussion feel on Song Mode `[PARTIAL]`

Fela primary appends Afrobeat percussion; posture/feel UI may still be partial — use feel toggle for faithful preview when available.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s19"></a>

### S19 — Big Band drum intensity (sparse → driving) `[SHIPPED]`

Set Feel intensity on Big Band generate so drum policy tracks form phase × intensity.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s20"></a>

### S20 — Short loopable riff (1–4 bars) `[SHIPPED]`

Use riff_generator mindset: whole short loop, not mid-chart section splice.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="d--counterpoint--independent-lines"></a>

## D — Counterpoint & independent lines

[↑ Contents](#contents)

<a id="s21"></a>

### S21 — Line-first duo with independent bass `[SHIPPED]`

Line-first duo path keeps bass / lead independence under contrapuntal policy where enabled.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s22"></a>

### S22 — String Quartet with SQ VRB voice rules `[SHIPPED]`

Select String Quartet preset + SQ VRB writer/arranger for idiom-specific voice behaviour.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s23"></a>

### S23 — Blend two SQ arrangers for colour mix `[SHIPPED]`

Dual SQ arrangers + weight slider; invalid pairs blocked; blend preview before generate.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s24"></a>

### S24 — Bartók / Brookmeyer-style line hierarchy `[UNVERIFIED]`

Contrapuntal line set / VRB line-first composers — confirm GUI surface vs engine-only path before teaching steps.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="e--orchestration--ensemble-colour"></a>

## E — Orchestration & ensemble colour

[↑ Contents](#contents)

<a id="s25"></a>

### S25 — Full Big Band chart from changes `[SHIPPED]`

Generate a Big Band score (parts, form phases, drum architecture) from harmony input.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s26"></a>

### S26 — ECM chamber sparse duo texture `[SHIPPED]`

ECM Chamber songwriter / preset path for sparse Nordic/modal duo colour.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s27"></a>

### S27 — String Quartet realisation of a lead sheet `[PARTIAL]`

Lead-sheet input → SQ / ensemble realisation exists on a parallel import path; GUI may require full-UI flag — mark steps carefully when filled.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s28"></a>

### S28 — Section regenerate one span without rewriting all `[SHIPPED]`

Regenerate `startBar`–`endBar` and splice MusicXML into the prior full score (duo / BB / SQ paths).

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s29"></a>

### S29 — Alternate guitar tuning on a Song Mode / vault path `[SHIPPED]`

Pick a roadmap zone tuning preset; note that SY noise-score truth is deeper than open-string catalog alone.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="f--transform-existing-music-morph-m1--m2--m3"></a>

## F — Transform existing music (MORPH M1 / M2 / M3)

MusicXML is the authoritative MORPH deliverable. Do not treat audio as required for musical assessment. **S30 (M1)** below is filled from `docs/manuals/MORPH-M1-USER-MANUAL-V1.0.md` (verified Development Studio path only). **S31 (M2)** below is filled from Development Studio / API wiring plus machine runtime evidence — **not** packaged-desktop acceptance and **not** artistic approval. **S32–S33 remain OUTLINE** — do not generalise M1/M2 steps to M3 or compare scenarios.

[↑ Contents](#contents)

<a id="s30"></a>

### S30 — M1 — expand / protect source harmony regions `[SHIPPED]`

Verified Development Studio M1 path: melody-led / conservative harmonic dual-part with `lockBass: true`; separate candidate MusicXML + lineage. Source: MORPH-M1-USER-MANUAL-V1.0. Banner and lineage: **Not musically approved**.

#### Objective
Run a locked-bass M1 harmonic transform on an imported MusicXML source without overwriting that source; obtain a separate candidate MusicXML plus lineage for human review later.

#### Starting material
Partwise MusicXML (file, paste, or Latest Generate). Optional Black Aura master path/SHA is documented in `docs/roadmap/MORPH-M1-BLACK-AURA-CONTRACT.md` — the app does not auto-bind that file; you import it. Motif bars come only from an explicitly selected discovered cell (no silent `[1, 2]` default).

#### GUI steps
1. Open **Development Studio** (`/develop`).
2. **Import** MusicXML: **Latest Generate**, **Open MusicXML** (`.musicxml` / `.xml`), or paste/edit in the textarea. Load clears prior M1 harmonic output and lineage.
3. **Found in this score** → discover motifs; click a cell → selected cell id + working motif; M1 motif bars = unique occurrence bars of that selected cell only.
4. Without a selected cell with bars, **Run harmonic transform (lockBass)** refuses (API also rejects empty / non-integer / non-positive `motifBars`).
5. **Run harmonic transform (lockBass)** — profile `harmonic` only; `lockBass` forced `true` (request with `lockBass !== true` errors). Source written to a temp file only; import `xml` untouched. Output stored in `harmonicOutXml` with SHA + lineage.
6. Inspect lineage (`develop-m1-lineage`), preview/audition the candidate, **Export M1 harmonic MusicXML** if wanted.
7. Optional handoff **Send** → Practice / BHL / Evaluate — status remains **Not musically approved**.

#### Musical outcome
Separate M1 harmonic candidate MusicXML; bass pitch/rhythm locked for the dual-part transform. Technical lock success is **not** musical improvement and **not** human ACCEPT. Page, lineage, and handoffs stay **Not musically approved**. Development Studio has **no** KEEP/DEVELOP/REWRITE controls and **no** ACCEPT/REVISE/REJECT capture — those are human/review-doc gates outside the transform run. Do not invent GCE numbers or claim MUSICALLY APPROVED from this path.

#### Notation example
OUTLINE — no fabricated excerpt in this guide; open the exported candidate MusicXML in a notation host for reading evidence.

#### Troubleshooting
- Transform button errors with no motif bars → select a discovered cell first; no silent default bars.
- `lockBass !== true` → M1 dual-part requires `lockBass=true`.
- Import field still shows source after a run → expected; candidate is separate (`harmonicOutXml` / Export M1).
- Confusion with Evaluation UI ACCEPT/REFINE/REJECT/FORK or guitar PASS/REVIEW/FAIL → those are different vocabularies; not MORPH KEEP/DEVELOP/REWRITE and not automatic musical approval.
- No audio/MIDI/ZIP packaging as part of M1 — MusicXML + lineage/Markdown only.

[↑ Contents](#contents)

<a id="s31"></a>

### S31 — M2 — reshape phrase contour while keeping identity `[PARTIAL]`

Development Studio **M2 RESHAPE** path is implemented (`motivicReshape` → dual-part). Machine wiring PASS cited in `docs/roadmap/MORPH-TECHNICAL-STATUS.md`. **Packaged / installed desktop execution pending. Artistic approval pending.** Banner and lineage: **Not musically approved**.

#### Objective
Run a motivic reshape on one explicit multi-bar guitar window of an imported MusicXML source without overwriting that source; obtain a separate M2 candidate MusicXML plus lineage. Characteristic cells stay locked via the selected discovery cell; contour / interval ops apply only inside the declared window.

#### Starting material
Partwise MusicXML (file, paste, or Latest Generate). A discovered cell must be selected so motif bars lock; Studio invents no default bars. An explicit reshape window (`from` < `to`, multi-bar) and exactly one reshape-legal op per window bar from the Develop plan. Reshape-legal ops only: `invert`, `expand-intervals`, `sequence-real` — other Develop ops stay local preview and are not sent. Optional **Protect guitar bars**. No IdentityKernel (that is M3). Machine-only Black Aura example (not a Studio auto-bind): source SHA `b85f7731…da4fccfd`, window **13–15**, ops `invert` → `expand-intervals` → `sequence-real`, candidate SHA `1187d014…c74c1648` (`.tmp-morph-m2-verify/RUNTIME-VERIFY.json`).

#### GUI steps
1. Open **Development Studio** (`/develop`).
2. **Import** MusicXML: **Latest Generate**, **Open MusicXML** (`.musicxml` / `.xml`), or paste/edit. Load clears prior MORPH output and lineage.
3. **Found in this score** → discover motifs; click a cell → selected cell id + motif bars (locks). Without a selected cell with bars, M2 run stays blocked.
4. **Develop** — queue reshape-legal ops only (`invert` / `expand-intervals` / `sequence-real`), **one op per window bar**. Check **Reshape ops queued**; count must match window length — Studio will not invent ops.
5. **MORPH dual-part** → Mode **M2 RESHAPE**. Set **From** / **To** window (`from` < `to`). Optional protect-guitar bars. Window must not overlap motif or protect locks.
6. When blockers list is empty, **Run M2 RESHAPE**. Source written to a temp file only; import `xml` untouched. Output in separate candidate store with SHA + lineage (`profiles: reshape`).
7. Inspect lineage, preview/audition the **M2 reshape candidate**, **Export M2 MusicXML** if wanted (filename tag `M2-Reshape`).
8. Optional handoff **Send** → Practice / BHL / Evaluate — status remains **Not musically approved**.

#### Musical outcome
Separate M2 reshape candidate MusicXML on the declared guitar window; motif/protect bars stay locked; bass/harmony/duration lock checks are technical machine evidence when they pass, not musical improvement. Development Studio has **no** KEEP/DEVELOP/REWRITE controls and **no** ACCEPT/REVISE/REJECT capture. Do not invent GCE / BMEF artistic totals or claim MUSICALLY APPROVED from this path. **Unverified here:** packaged-desktop manual run; listening / performance audition; human ACCEPT.

#### Notation example
OUTLINE — no fabricated excerpt in this guide. Machine candidate path (runtime verify only, not musician-auditioned): `.tmp-morph-m2-verify/M2-Reshape-Black-Aura-runtime-verify.musicxml`. Open an exported candidate in a notation host for reading evidence. Packaged-app export SHA for M2: **pending**.

#### Troubleshooting
- Run disabled / blockers → load MusicXML; select a discovered cell with motif bars; set multi-bar window; queue exact count of reshape-legal ops; fix window overlap with motif/protect locks.
- Ops count mismatch → add/remove Develop reshape ops until one per window bar; Studio will not invent fillers.
- Non-reshape Develop ops appear in plan but not in **Reshape ops queued** → expected; only `invert` / `expand-intervals` / `sequence-real` go to M2.
- Import field still shows source after a run → expected; candidate is separate (Export M2).
- Confusion with M1 harmonic or M3 IdentityKernel → wrong mode; M2 needs `motivicReshape` window+ops+pattern, not lockBass-forced harmonic and not declared kernel JSON.
- Packaged desktop “did M2 work?” → **pending** per `MORPH-TECHNICAL-STATUS.md`; do not treat machine PASS as installed-app acceptance.
- No audio/MIDI/ZIP packaging as part of M2 — MusicXML + lineage/Markdown only.

[↑ Contents](#contents)

<a id="s32"></a>

### S32 — M3 — reimagine with distinct ops (candidate audit) `[UNVERIFIED]`

MORPH M3: stronger reimagine ops; treat outputs as candidates until musician audition and framework labels are earned.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s33"></a>

### S33 — Compare M1 vs M3 MusicXML side-by-side `[UNVERIFIED]`

Diff / compare receipts between MORPH depths for the same source; no invented GCE numbers.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="g--form-length--structural-shape"></a>

## G — Form, length & structural shape

[↑ Contents](#contents)

<a id="s34"></a>

### S34 — Multi-chorus chart with motif phase rotation `[PARTIAL]`

Chorus count multiplies chart; motif tension-phase rotation applies except where styles bypass (e.g. Sonic Youth hold) — quality still a known focus area.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s35"></a>

### S35 — 12-bar blues Big Band form variant `[SHIPPED]`

Use Big Band blues form length / preset variant for a standard blues chart shape.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s36"></a>

### S36 — Repeat / volta truth into exported bar count `[SHIPPED]`

Imported or planned repeats affect logical length and MusicXML barline truth — confirm before counting “bars on the page.”

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="h--practice--study-material"></a>

## H — Practice & study material

[↑ Contents](#contents)

<a id="s37"></a>

### S37 — Practice & Scales Studio session + export `[SHIPPED]`

`#/practice`: generate pathways / studies, play/loop/metronome, save session, export MusicXML (session ≠ composition).

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s38"></a>

### S38 — BHL colour / tension–release study `[PARTIAL]`

BHL / hexatonic handoff into practice or composer surfaces; Phase 2 harmonic development may be technical-pass / not musically approved — label clearly when filling.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s39"></a>

### S39 — Solo piano miniature for reading & feel `[UNVERIFIED]`

Solo-piano musicians-guide examples exist under manuals; confirm current Generate / study path before claiming one GUI recipe.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="i--audition-preview--listening"></a>

## I — Audition, preview & listening

[↑ Contents](#contents)

<a id="s40"></a>

### S40 — In-app Play after Generate (pitch + timing check) `[SHIPPED]`

Use Play / Pause / Stop when a playback sequence is available; software-synth preview, not a DAW substitute.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s41"></a>

### S41 — Preview limits: unpitched drums / missing XML path `[PARTIAL]`

Unpitched GM drums may be silent in preview; Big Band web path may lack inline XML — desktop IPC is the supported ensemble preview story.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="j--notation-handoff-musicxml--hosts"></a>

## J — Notation handoff (MusicXML & hosts)

[↑ Contents](#contents)

<a id="s42"></a>

### S42 — Shareable MusicXML to Sibelius `[SHIPPED]`

Export shareable MusicXML after integrity pass; open as a new score in Sibelius for engraving / play.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s43"></a>

### S43 — MusicXML for MuseScore audition (BHL / study paths) `[SHIPPED]`

For BHL audition workflows, open MusicXML in MuseScore 4; keep MSCZ/PDF/audio on separate filenames.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s44"></a>

### S44 — MIDI companion file after successful XML write `[SHIPPED]`

Successful MusicXML write also produces Type-1 SMF (tempo + melodic tracks); use for DAW sketch, not as notation source of truth.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s45"></a>

### S45 — Guitar TAB / both-staff export with transpose truth `[PARTIAL]`

Guitar export with TAB / both; fixed-offset tunings (Drop D / Eb) have `<transpose>` support — verify TAB vs sounding in host.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="k--evaluation--musical-critique"></a>

## K — Evaluation & musical critique

[↑ Contents](#contents)

<a id="s46"></a>

### S46 — Musician-facing GCE critique of a short chart `[SHIPPED]`

Use GCE as musical critique (0–10 scale); mark short-form categories structurally limited; not a release gate unless asked.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s47"></a>

### S47 — Formal LOCK / GCE readiness before sharing `[SHIPPED]`

When sharing system output, check integrity receipt, locked harmony truth, and formal hard gates — separate from chat critique.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s48"></a>

### S48 — Evaluation Dashboard / provisional candidate status `[PARTIAL]`

Dashboard can show provisional technical evidence (e.g. hexatonic / BHL candidates); provisional ≠ artistic acceptance.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="l--starting-from-charts--imports"></a>

## L — Starting from charts & imports

[↑ Contents](#contents)

<a id="s49"></a>

### S49 — Real Book–style MusicXML lead sheet in `[PARTIAL]`

Import partwise MusicXML for harmony / keys / limited melody; jump markers and confidence UI still have backlog items.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s50"></a>

### S50 — PDF lead-sheet chords → vault / generate path `[SHIPPED]`

PDF chord reader → parsed chart → generate; treat OCR title cleanup as best-effort.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s51"></a>

### S51 — Lead-sheet input → composer-coloured ensemble `[PARTIAL]`

Parallel lead-sheet input engine (composer-parameterized harmony → ensemble); desktop full-UI may be required — not the default Generate duo path.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

<a id="s52"></a>

### S52 — Green integrity receipt vs “not shareable” amber `[SHIPPED]`

Read Generate result badge: green when export integrity passed; amber when generated but not shareable — decide host handoff accordingly.

#### Objective
OUTLINE

#### Starting material
OUTLINE

#### GUI steps
OUTLINE

#### Musical outcome
OUTLINE

#### Notation example
OUTLINE

#### Troubleshooting
OUTLINE

[↑ Contents](#contents)

---

<a id="legend--fill-in-checklist"></a>

## Legend & fill-in checklist

When expanding beyond structure:

1. Fill reserved sections only with verified GUI paths and real MusicXML / notation evidence.
2. Keep `[UNVERIFIED]` / `[PARTIAL]` / `[UNIMPLEMENTED]` until a musician run proves the path.
3. Do not invent notation examples, GCE scores, or “heard / approved” claims.
4. Prefer musical goal titles over engine filenames in headings.
5. Re-check scenario index links after renumbering.

**Explicit unimplemented / not-in-guide defaults (do not invent scenarios as complete):** pre-generate candidate preview API; style-transfer dry-run preview; interactive import confidence heatmap click-to-override; PDF as primary MORPH deliverable; claiming audio audition without host evidence.

[↑ Contents](#contents)

---

*End of structure — Composer OS V4.0 Musician's Guide scenario index.*
