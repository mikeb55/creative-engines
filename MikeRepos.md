# Mike repos audit — reusable components (vs Composer OS)

Audit date: snapshot clone under `%TEMP%\mikeb55-repo-audit`. **`mikeb55/RiffgenPro`** clone empty on GitHub.

Cross-reference home repo: **`creative-engines`** (Composer OS / `engines/composer-os-v2`). Canonical MusicXML: `musicXmlNoteFragment.ts`, `musicxmlExporter.ts`. Canonical GCE: `docs/GCE_FRAMEWORK_V2.md`.

---

## Executive summary

| Tier | Takeaway |
|------|-----------|
| **High reuse** | `gml-harmonic-engine` (BH voice-leading + ReasonCodes, MIT), `gml-fretboard-projection` (MIT), `gml-ecosystem` nested TPKG / harmonic intent JSON |
| **Integration shells** | `gml-harmonic-playground` (screenshot→engine→projection→UI, MIT), `infinite-riff-machine` (MIT roadmap + stub web demo) |
| **Legacy / risky XML** | `gml-quintet-composer` (known Sibelius step errors), `gml-riffgen` quartet export (`pitch→duration→type` — missing voice/stem vs Composer OS) |
| **Design-only** | `gml-composer-engines` — conductor/rule lab **specs**, validation scripts, no runtime parity with Composer OS |
| **Not code overlap** | `grand-criteria-of-excellence-jazz` — pedagogy, PDF/method book, Python OpenTriad; **not** automated GCE v2.0 gate |

---

## Per-repo (abbrev.)

### RIFF family

| Repo | MusicXML | Voicing / riff | Notes |
|------|-----------|----------------|-------|
| **gml-quintet-composer** | Yes (HTML stacks); issues doc: invalid `<step>`, spacing bugs | Guitar + quartet combiner, collision modes | Phase 6 ideas only until XML fixed |
| **gml-riffgen** | `quartet-complete.js`: pitched notes lack voice/stem/instrument vs Composer OS | Quartet engine + `integrate-optimizer.js` TAB hints | Export order diverges |
| **infinite-riff-machine** | Roadmap MIDI; no MusicXML yet | `web/irm.js` placeholder random riff | **MIT** |
| **RiffgenPro** | — | — | Empty repo |
| **riffgen3** | No (JSON outputs / deploy) | Artifacts only | Low value |
| **riffgen2** | Static HTML demos | Legacy browser riff | Low |
| **riffgen** | README points at harmony-library | “Quartet Engine” narrative | **MIT** on `LICENSE` |

### GML family

| Repo | Role | License / stack |
|------|------|------------------|
| **gml-composer-engines** | Conductor Engine Architecture **lab**: specs, `npm run validate` | No license in root `package.json` |
| **gml-harmonic-engine** | Barry Harris–style voicing, ReasonCodes, HOLD/register — **no MusicXML** | **MIT** |
| **gml-harmonic-playground** | OCR → parse → engine → projection → fretboard UI | **MIT** |
| **gml-fretboard-projection** | MIDI voicing → string/fret mapping (read-only placement) | **MIT** |
| **gml-fretboard-ui** | Renders projection JSON | **MIT** (package) |
| **gml-ecosystem** | Nested **`harmonic-engine`**: TPKG triad-pair JSON, colour picker → Tonality Vault bridge | Check nested `package.json`; heavy deps (e.g. sharp) |
| **gml-workspace** | Umbrella: quartal-engine, vendored fretboard copy, **Export Musicxml** (MakeMusic-style LICENSE) | Mixed / vendor |

### Scoring

| Repo | vs Composer OS GCE |
|------|---------------------|
| **grand-criteria-of-excellence-jazz** | Brand + method book + tune markdown; **not** `GCE_FRAMEWORK_V2.md` automation. No motif scorer **`S = 0.35I+0.30R+0.20C+0.15G`**. Melodic Identity in framework uses different weights (**R,C,I,G**). |

### creative-engines

Production Composer OS: MusicXML 3.1, slices, `getChordForBar`, GCE gate. Root **LICENSE** may be absent in shallow clone — confirm policy before redistribution.

---

## GCE / motif overlap

- **Composer OS motif similarity** (`motifSimilarityScorer.ts`): interval/rhythm/contour/register blend — **not** identical to **GCE Melodic Identity** formula in `docs/GCE_FRAMEWORK_V2.md`.
- **grand-criteria-of-excellence-jazz**: qualitative / pedagogical “GCE Jazz” material — **do not** treat as the same engine as Composer OS GCE v2.0.

---

## Phase mapping (quick)

| Phase | Best donor repos |
|-------|-------------------|
| **2 — VoiceRuleBundle / policies** | `gml-harmonic-engine` ReasonCodes; `gml-composer-engines` rule vocabulary; `gml-ecosystem` TPKG JSON |
| **3 — Harmonic scene / VL** | `gml-harmonic-engine`; TPKG motion vectors; playground pipeline |
| **6 — String ensemble** | `gml-quintet-composer`, `gml-riffgen` quartet — **XML quality risk** |
| **7 — Guitar / étude** | `gml-fretboard-projection`, `gml-fretboard-ui` |
| **8 — Improv agent** | `infinite-riff-machine` roadmap; `grand-criteria` OpenTriadEngine (Python) — loose |

---

## TABLE 1 — Component inventory

| Repo | Best reusable component | Maps to Phase | Port effort | License |
|------|-------------------------|---------------|-------------|---------|
| gml-quintet-composer | Quintet combine + export ideas | 6 | High (XML issues) | Unclear root |
| gml-riffgen | Quartet XML builder + TAB optimizer hints | 6 / 7 | Medium–high | Verify |
| infinite-riff-machine | Riff schema / roadmap shell | 8 (future) | Low | MIT |
| RiffgenPro | — | — | — | N/A |
| riffgen3 | JSON artifacts | — | N/A | Unknown |
| riffgen2 | Legacy HTML demo | 7 | Low | Unknown |
| riffgen | harmony-library pointer | 4 | N/A readme | MIT |
| gml-composer-engines | Conductor + rule-lab specs | 2 | Low | Unspecified |
| gml-harmonic-engine | BH voice-leading + ReasonCodes | 2 / 3 | Medium (JS→TS) | MIT |
| gml-harmonic-playground | OCR→engine→projection wiring | 3 / 7 | Medium | MIT |
| gml-fretboard-projection | MIDI→string/fret projection | 7 | Medium | MIT |
| gml-fretboard-ui | Fretboard renderer | 7 | Medium | MIT (pkg) |
| gml-ecosystem | TPKG / harmonic intent | 3 | Medium–high | Nested |
| gml-workspace | Quartal + vendor MusicXML | 4 / 6 | High | Mixed |
| grand-criteria-of-excellence-jazz | Pedagogy; OpenTriad Python | GCE narrative / 8 | Low code reuse | Proprietary book |
| creative-engines | Composer OS (canonical) | All | — | Confirm root |

---

## TABLE 2 — Conflicts / duplications

| Component | Repo A | Repo B | Resolution |
|-----------|--------|--------|------------|
| BH / voice-leading | gml-harmonic-engine | creative-engines era/slices | Single authority |
| Fretboard placement | gml-fretboard-projection | Tonality Vault / grip libraries | One geometry truth |
| Triad-pair intent | gml-ecosystem TPKG | Composer vault presets | Align APIs |
| Quartet XML | gml-riffgen | Composer OS string quartet | Do not merge exporter blindly |
| Vendor MusicXML | gml-workspace Export Musicxml | Composer OS exporter | License check (MakeMusic) |
| “GCE” brand | grand-criteria book | `GCE_FRAMEWORK_V2.md` | Keep concepts separate |

---

## Clone location

```
%TEMP%\mikeb55-repo-audit
```

Re-run shallow clones if you need a fresh snapshot:

```bash
git clone --depth 1 https://github.com/mikeb55/<repo>.git
```
