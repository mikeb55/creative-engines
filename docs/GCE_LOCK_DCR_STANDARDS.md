# Composer OS — GCE · LOCK · DCR · Style Profile Layer

**Development standards for all musical output, style surfaces, and composer slices.**  
Applies to every build path (Generate, Song Mode, Tonality Vault, duo/ECM surfaces, including **ECM chamber / STYLE_ECM*** work in progress).

**Source note:** The manuscript `000_MUSIC_EVALUATION_-_GCE_-_LOCK_-_DCR.txt` was not found under `docs/` or `uploads/` in this repository. This document **integrates** the four systems from project practice and the canonical GCE specification in **`docs/GCE_FRAMEWORK_V2.md`**.

---

## 1. GCE v2.0 — Grand Criteria of Excellence (scoring)

**Authoritative detail:** `docs/GCE_FRAMEWORK_V2.md`  
**Agent quick rule:** `.cursor/rules/gce-evaluation.mdc`

### Scoring contract

- **10 categories**, each scored **0–10** (automatable dimensions per `GCE_FRAMEWORK_V2.md`).
- **9.0** remains the **aspirational north star** (long-term benchmark; formulas and weights unchanged).
- **7.9–8.4** is the **current empirical release-quality / system-ceiling band** under the present system (documented benchmark gap to 9.0: **0.6–1.2** points).
- **Operational release band (guidance, not a formula change):**
  - **≥ 7.9** — PASS for tuned, shipped-quality output under the current system
  - **6.5–7.8** — acceptable / promising; revise **weakest category only**, **one pass** (DCR)
  - **&lt; 6.5** — materially weak; investigate (not release quality)
- If below the operational band: **one** DCR refinement pass on weakest category; **no full rewrite**; preserve asymmetry.

### §1.0 Two GCE modes (formal vs musician-facing)

The same **GCE v2.0** category vocabulary serves two contexts. **Formulas, weights, thresholds, and hard gates are identical in both** — only **how the agent applies** them differs.

| Mode | Context | Agent behaviour |
|------|---------|-----------------|
| **Formal / technical** | Code changes, official evaluator runs, LOCK / DCR, release readiness, CI, automated harness scores | Strict repo definition: hard gates block; operational band (≥7.9 PASS, etc.) applies; DCR on weakest category; no weakening of semantics |
| **Musician-facing / conversational** | Chat requests: “GCE this”, “evaluate this piece”, “is this good?”, “pros and cons?”, “what would raise it?” | Musical critique on the GCE scale; **not** a release gate unless formal validation is explicitly requested |

**Musician-facing rules (chat only):**
- Overall score + 2–4 strengths + 2–4 weaknesses + one highest-leverage improvement
- Tag improvement as musical refinement, technical fix, or architectural concern (architecture only when clearly warranted and explicitly requested)
- Do not auto-apply hard gates or treat sub-9 as automatic failure
- Open with: *“Interpreting GCE here as musician-facing critique, not formal repo release gating.”*
- Category scores optional — include only when they clarify

**Formal rules (repo / pipeline):** unchanged — see §1 scoring contract, §1.1 short-form, hard gates §1 (bottom), and §2 LOCK.

Agent quick rule: **`.cursor/rules/gce-evaluation.mdc`** (mode table + §1 formal + §2 musician-facing).

### §1.3 Default mode (agents)

| Context | Default mode |
|---------|----------------|
| Chat evaluation (“GCE this”, “is this good?”, “pros and cons?”, “what would raise it?”) | **Musician-facing** — unless the user asks for **formal Composer OS validation** or mentions **LOCK**, **DCR**, or **CI** |
| Code changes, official evaluator runs, automated harness scores, release readiness | **Formal / technical** |

In musician-facing chat, open with: *“Interpreting GCE here as musician-facing critique, not formal repo release gating.”* Full output shape: §1.0 musician-facing rules above.

### §1.1 Short-form / fragment outputs (&lt; ~16 bars, especially 8-bar leadsheet)

Short-form material **cannot** be judged the same way as full-chart output.

**Structurally limited / interpret with caution** (low scores may reflect fragment length, not craft failure alone):

- **Thematic recall potential**
- **Structure & form**
- Parts of **phrase grammar**

Report these as structurally limited / N/A-leaning where appropriate; **do not** blindly DCR-refine them on 8-bar proofs alone.

**Still meaningful on short-form** (real findings may apply):

- **Rhythm anti-loop / too-perfect grid** (LOCK `rhythmAntiLoop`)
- **Harmony & language / chord fidelity**
- **Range / idiomaticity**
- **GCE hard gates** (always blockers)

A **5.x** short-form score (e.g. Orbit leadsheet ~5.3–5.4 after Phase 7 GCE wiring) is **not** release quality; it may combine real underperformance **and** measurement distortion when judged on **8-bar** fragments only.

### §1.2 Roadmap triage (leadsheet-input / low GCE)

**>8-bar / full-chart** leadsheet-input measurement is **shipped** (full input up to **64-bar** cap; **`4b5a791a`**). Re-score on full-chart material before deep composer-grammar work.

When GCE is low on **leadsheet-input** or other short-form material:

1. Ask whether the score is **distorted by short-form limits** — prefer **full-chart** (≤64 bars) re-score when available
2. **Then** decide whether the next work is rhythm, harmony correctness, or deeper composer grammar
3. **Do not** optimize deep composer-behavioural grammar until fair full-chart scoring is done
4. **Immediate fixable craft** still matters: `rhythmAntiLoop`, chord-fidelity / normalization, range / idiomaticity · **sparse-chord** leadsheets may inherit/default across long unlabeled stretches

See **`docs/COMPOSER_OS_ROADMAP.md`** for tier ordering (quality-unblocking → craft depth → input reach → housekeeping).

### Category list (names only — formulas and thresholds in `GCE_FRAMEWORK_V2.md`)

1. Cadential clarity  
2. Melodic identity  
3. Phrase grammar  
4. Harmony & language  
5. Rhythmic identity  
6. Structure & form  
7. Arrangement & orchestration  
8. Economy & focus  
9. Tension & release  
10. Thematic recall potential  

### GCE hard gates (auto-fail — unchanged blockers)

**Hard gates remain true blockers** regardless of the calibrated operational release band above. Numeric thresholds are **not** relaxed.

Align with **`docs/GCE_FRAMEWORK_V2.md` § Hard Gates**, including:

- Melodic identity **≤ 6**
- No section contrast
- Cadential clarity coverage **&lt; 0.4**
- Accidental / unresolved ending — final bar tension **&gt; 0.7**

---

## 2. LOCK — hard gates before commit (style / composer output)

**LOCK hard gates are the real merge blockers.** The calibrated GCE release band (§1) is **guidance** for release-quality interpretation; it does **not** override LOCK or GCE hard gates.

**LOCK** is the **pre-commit compliance bundle** for any change that affects **generated music, symbols, or style behaviour** (including new or updated **composer slices**, **Song Mode style surfaces**, **ECM / vault** layers, presets, or export).

### L — Locked truth

- **Harmony lock:** If the pipeline uses **locked bars**, **slice precompute**, or **effective harmony arrays**, MusicXML and assertions must match **`getChordForBar`** / export-truth routing (see locked-harmony wiring in app generation and golden path).  
- **No silent drift** between UI chord text, engine bars, and XML.

### O — Output integrity

- **Export / readiness gates** must pass for the touched surface (e.g. export integrity receipt, schema-safe XML, host-import assumptions documented in playbook).  
- Do not commit “broken shareable” output paths without documenting bypass or fix.

### C — Category hard fails (GCE)

- Output evaluated against **§1** must **not** violate **GCE hard gates**.  
- For manual / harness evaluation: record overall score, weakest category, and PASS/FAIL.

### K — Key verification

- **Engine/test changes:** follow **`CLAUDE.md`** — e.g. **`npm run test:composer-smoke`** when smoke allowlists or engine behaviour changes (sync counts in roadmap/CHANGELOG per repo practice).  
- **Slice-only / docs-only:** at minimum **design-time GCE checklist** on representative seeds or harness output before merge.

**Rule:** Do not merge composer/style/generation changes that skip LOCK without an explicit exception note in the PR/commit body.

---

## 3. DCR — standard build workflow (Design · Commit · Refine)

**DCR** is the **single refinement loop** aligned with GCE (“revise weakest only, one pass”).

| Phase | Action |
|--------|--------|
| **D — Design** | Define goal, scope, GCE targets, affected Style Profile Layer (§4), and acceptance checks (LOCK §2). |
| **C — Commit** | Implement with deterministic behaviour; update **docs/playbook/changelog** when user-facing or slice behaviour changes; keep one logical change set reviewable. |
| **R — Refine** | **One** refinement pass: address **weakest GCE category** (or single blocking LOCK item), not a full rewrite. |

On **short-form** output, if the weakest category is **structurally limited** (§1.1), do **not** blindly refine it — prioritize fair **>8-bar / full-chart** re-score and fixable short-form findings (rhythm grid, chord fidelity, range) first.

**Forbidden:** repeated full regenerations or unconstrained tweak loops; if still failing after one Refine, return to **Design**.

---

## 4. Style Profile Layer — per-style scoring requirement

Every **composer slice** (primary `SongwriterRuleId`) and, where relevant, **Song Mode `StyleProfile`** (dropdown) must have an explicit **Style Profile Layer** definition:

1. **Primary GCE categories** to monitor for that voice (usually **Melodic identity**, **Harmony & language**, **Structure & form** — slice-specific).  
2. **Engine hooks**: harmony precompute, melody behaviour profile, style engine velocity, optional harmony policy (e.g. ECM motion policy).  
3. **Diagnostics**: receipt prefixes (`ec:*`, `fz:*`, …), smoke/eval entry points per **`CLAUDE.md`**.  
4. **Evaluation**: slice smoke test and/or `npm run eval:<name>` where shipped; GCE-style assessment on representative seeds when adding behaviour.

**ECM (including in-progress surfaces):** Treat **`ecm_chamber`** slice + **`STYLE_ECM` / `STYLE_ECM_CHAMBER`** as one **Style Profile Layer** for documentation and QA: sparse/modal harmony language, phrase asymmetry, velocity contour, and builtin harmony policy must be scored under **Harmony & language**, **Tension & release**, **Economy & focus**, and **Melodic identity** as appropriate.

---

## 5. Where this applies

| Artifact | Requirement |
|----------|-------------|
| New composer slice | §4 Style Profile Layer + §2 LOCK + §3 DCR |
| Style surface / profile change | §4 + LOCK (O/C/K) |
| Docs-only eval rubric | §1 GCE + §2 LOCK checklist on sample output |
| ECM / Tonality Vault | Same standards; §4 explicitly covers ECM chamber / ECM style profiles |

---

## 6. Cross-references

- `docs/GCE_FRAMEWORK_V2.md` — full GCE v2.0 mathematics and benchmarks  
- `.cursor/rules/gce-evaluation.mdc` — agent-applied GCE reminder  
- `.cursor/rules/composer-os-quality-gates.mdc` — LOCK + DCR + Style Layer reminders  
- `docs/COMPOSER_OS_PLAYBOOK.md` — user-facing workflows and export notes  

---

## GCE 9.0 Build Sequence

Priority order for maximum score gain per implementation session:

1. Motif Authority Layer — ThemeGenome + MotifCell + recall quotas
2. Voice Rule Compiler — VoiceRuleBundle per composer voice
3. Harmonic Scene Engine — scene pipeline + voice-leading solver
4. RhythmDNA — bound to motif and section identity
5. Form Controller — three-space, AABA, arch templates + tension scheduler

Milestone ladder:

- 8.4 → 8.7: motif seeding, recall quotas, cadence-aware phrase endings,
  voice-specific rhythm cells
- 8.7 → 9.0: deep harmonic scene differentiation, inner-voice motion
  scoring, form-level recapitulation and tension scheduling
- Above 9.0: orchestration-as-harmony, cross-section thematic memory,
  adaptive evaluator-driven repair passes

Implementation principle: every generated note must be explainable by
one of four authorities — motif, harmonic scene, rhythmic DNA, or form
role. Notes belonging to none are suppressing the 9.0 ceiling.

Note: style emulation parameters are tendencies not deterministic rules.
Expose as tunable weights. Especially true for Evans voicing abstractions,
sheets-of-sound rendering, and Schneider narrative arc intensity curves.

---

*Last integrated: 2026-06-16 — §1.0–§1.3 formal vs musician-facing GCE modes + default-mode rule (agent interpretation only; formulas/weights/hard-gate values unchanged).*
