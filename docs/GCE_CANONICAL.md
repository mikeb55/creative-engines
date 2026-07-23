# GCE -- canonical agent index (Composer OS)

**Effective:** 2026-06-16  
**Supersedes:** all pre-v2.0 GCE rubrics, mandatory >=9.0 export rules, and single-mode always-formal agent guidance.

Use this file as the **single entry point** for agents (Cursor, Claude Code, ChatGPT, humans). Formulas, weights, thresholds, and hard gates are defined only in the formal spec -- this index governs **which mode** to apply.

---

## Live sources (authoritative)

| Role | Path |
|------|------|
| **Primary agent rule** (two modes + chat output shape) | `.cursor/rules/gce-evaluation.mdc` |
| **Formal gates only** (LOCK, DCR, Style Profile) | `.cursor/rules/composer-os-quality-gates.mdc` |
| **Integrated workflow** (GCE + LOCK + DCR + Style Layer) | `docs/GCE_LOCK_DCR_STANDARDS.md` (sections 1.0-1.3 modes, 1.1 short-form) |
| **Formal math and hard gates** (evaluator / repo) | `docs/GCE_FRAMEWORK_V2.md` |
| **How pieces end** (user browse tab — terms + usage) | `docs/HOW_PIECES_END_GUIDE.md` |
| **Agent handoff** | `AGENTS.md` |

---

## Two modes (agent application only)

| Mode | When | Behaviour |
|------|------|-----------|
| **Formal / technical** | Code, official evaluator, LOCK/DCR/CI, release readiness, automated scores | Hard gates block; operational band >=7.9 PASS; DCR one pass on weakest category |
| **Musician-facing / conversational** | Chat: "GCE this", "is this good?", etc. | Musical critique on 0-10 scale; **not** repo PASS/FAIL unless formal validation requested |

**Default:** musician-facing for chat unless the user asks for **formal Composer OS validation** or mentions **LOCK**, **DCR**, or **CI**.

**Chat opener:** *Interpreting GCE here as musician-facing critique, not formal repo release gating.*

---

## Parked legacy (do not use for guidance)

These files are **historical reference only**. They must **not** override the live sources above.

| Parked path | Era | Notes |
|-------------|-----|-------|
| `docs/GCE_FRAMEWORK.md` | Song-rubric v0 | Lyric-centric categories; subjective >=9.0 target |
| `rules/gce_evaluation_framework.md` | GCE v1.0 | Mandatory >=9.0 before MusicXML export |
| `rules/gce/swing-authority.md` | v1 extension lens | Qualitative swing scoring |
| `rules/gce/countermelody-line-interaction.md` | v1 extension lens | Line-interaction lens |
| `docs/RULES_of_EXCELLENCE.md` | Assembled snapshot | May lag live rules; prefer individual live sources |

---


## Hard gates — finalBarTension is context-aware

Numeric threshold **unchanged** (`> 0.7`). Auto-fail depends on `endingContext`:

| `endingContext` | Default | Auto-fail when tension > 0.7? |
|-----------------|---------|-------------------------------|
| `terminal` | Song Mode, leadsheets, standalone final charts | **Yes** — unresolved ending is a genuine flaw |
| `loop` | `riff_generator` (riffs cycle to bar 1) | **No** — tense/unresolved loop closes are expected; do **not** flag as a flaw |
| `open_idiom` | Explicit `acknowledgeOpenIdiomEnding` | **No** — intentional open terminal ending; requires disclosure, not a silent pass/fail |

Detail: `docs/GCE_FRAMEWORK_V2.md` Hard Gates · `docs/GCE_LOCK_DCR_STANDARDS.md` §3.1a · modules `endingContext.ts` / `finalBarTensionGate.ts`.

---
## Short-form / fragments

On **under ~16 bars** (especially 8-bar leadsheets): mark thematic recall, large-scale structure and form, and global phrase grammar as **N/A / structurally limited**. Still evaluate rhythm, harmony, voice-leading, melodic interest, register, spacing, and loopiness. See `docs/GCE_LOCK_DCR_STANDARDS.md` section 1.1.

---

*Formulas, weights, thresholds, and hard-gate numeric values are unchanged in formal mode; only agent interpretation differs between formal and musician-facing contexts.*
