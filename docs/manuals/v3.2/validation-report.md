# Composer OS V3.2 manuals — validation report

Date: 16 October 2026. Baseline commit named in the colophon: `1072b365`.

## PDFs

| Book | Path | Pages |
| --- | --- | --- |
| Musician’s Quick Start Guide | `docs/manuals/v3.2/out/Composer-OS-V3.2-Musicians-Quick-Start-Guide.pdf` | 34 |
| Complete Creative Composition Handbook | `docs/manuals/v3.2/out/Composer-OS-V3.2-Complete-Creative-Composition-Handbook.pdf` | 156 |

Spec targets were 36 and 196. The QA band in the specification is 30–40 and 150–200. Both PDFs sit inside that band.

Counts: Quick Start worked examples QS-01–QS-22 (22). Handbook craft scenarios 4.1–19.5 (92, no gaps). Recipes R-01–R-30 (30).

## Links and bookmarks

- Every page of both PDFs has at least one link annotation. The running control is the words **Back to Contents**. It is in the page foreground, not the header. PDF/UA forbids links inside header artifacts, and Typst rejects that combination.
- Named destination: `contents`.
- Outline nodes: Quick Start 32, Handbook 152. Spot-checked destinations land on the matching headings (QS-01 on page 5, handbook chapter 4 after the contents).
- `pdftotext` is not installed. pypdf extracted text from every page. No empty pages.

## What was checked by eye

Rendered with Typst to PNG: Quick Start pages 1, 5, and 12; Handbook pages 1, 8, 20, and 90. Contact sheets are in `out/qa/`.

- Page 1 of the Quick Start: title, footer, page number, Back to Contents. No clipped type.
- QS-01: two-column steps and rail. Badges readable. No overlap.
- Handbook chapter opener (page 20): short and sparse, not clipped.
- Scenario 15.3: seven blocks, badges, related link. No overlap.

A missing-glyph box appeared when the header used a return arrow that Source Sans 3’s Latin subset does not contain. The link text is now “Back to Contents”.

## Capability register

`docs/manuals/v3.2/capabilities.yaml`, sha256 prefix `49c825beca76`.

Verified controls were read from source and, for Practice and Pentatonic, from the running web UI at `127.0.0.1:5176` (bundle v2.10.10). Arranger, Structure, Ensemble, Grid, Evaluation, and Performance Composer stay **Verify**. Orchestra, film sync, and DAW processing stay **Manual**.

## Notation

Sibelius was not launched. One plate exists: `docs/manuals/v3.2/assets/notation/hexatonic-cell-quartet.pdf`, Creator MuseScore Studio 4.7.5, one page. A thumbnail of that page was inspected. Violin I C–E-flat–E–G; Violin II enters one crotchet later on E–G–G-sharp–B; viola G–E–E-flat–C; cello C, then A-flat, then E. Those pitches sit in augmented hexatonic mask 2457. The music was not played back in this check.

Source: `docs/manuals/v3.2/assets/notation/hexatonic-cell-quartet.musicxml`.

Diagrams: A Dorian fretboard, pitch-class clock, BHL world tiles. An earlier MuseScore CLI attempt crashed with a mutex error; the file on disk is the successful 4.7.5 export.

Screenshots are from the running app, cropped by the browser panel, not a 1440×900 capture: `assets/screenshots/practice-studio.png`, `generate-nav.png`, `pentatonic.png`.

## Not run

veraPDF is not installed. Typst 0.14.2 was invoked with `--pdf-standard ua-1`, which fails the build on missing titles, skipped heading levels, and links inside artifacts. That is not a veraPDF report.

## BHL manuals

Not rewritten. SHA1 at the end of this run:

- `BHL-COMPOSER-QUICK-START-V1.0.pdf` `67fb7d76225dcb8d46e22b7e00debd2f289b0098`
- `BHL-CREATIVE-SCENARIOS-HANDBOOK-V1.0.pdf` `efba46191766274f7cbe218164f1fc2688987033`

## Rebuild

```bash
cd docs/manuals/v3.2
# Typst 0.14.2 binary expected at tools/typst-aarch64-apple-darwin/typst
python3 handbook/assemble.py
./tools/typst-aarch64-apple-darwin/typst compile --root . --font-path fonts --pdf-standard ua-1 \
  quickstart/main.typ out/Composer-OS-V3.2-Musicians-Quick-Start-Guide.pdf
./tools/typst-aarch64-apple-darwin/typst compile --root . --font-path fonts --pdf-standard ua-1 \
  handbook/main.typ out/Composer-OS-V3.2-Complete-Creative-Composition-Handbook.pdf
```
