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
- **Overall target ≥ 9.0** before treating output as release-quality.
- If **&lt; 9.0**: revise **weakest category only**, **one pass**, **no full rewrite**; preserve asymmetry.

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

### GCE hard gates (auto-fail)

Align with **`docs/GCE_FRAMEWORK_V2.md` § Hard Gates**, including:

- Melodic identity in the failure band defined there (e.g. **≤ 6** where applicable)  
- No section contrast  
- Cadential clarity coverage below threshold (e.g. **&lt; 0.4** where defined)  
- Accidental / unresolved ending (final-bar tension threshold)

---

## 2. LOCK — hard gates before commit (style / composer output)

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

*Last integrated: 2026-05-05 — repository standards consolidation.*
