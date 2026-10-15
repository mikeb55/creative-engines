# BHL Composer manuals

Version 1.0 · 15 October 2026.

Musician copies are the PDF and Word files in this folder. Open those. The Markdown and Python beside them are the source used to rebuild them.

## Read these

| Document | PDF | Word |
| --- | --- | --- |
| Quick Start | [BHL-COMPOSER-QUICK-START-V1.0.pdf](BHL-COMPOSER-QUICK-START-V1.0.pdf) | [BHL-COMPOSER-QUICK-START-V1.0.docx](BHL-COMPOSER-QUICK-START-V1.0.docx) |
| Creative Scenarios and Integration Handbook | [BHL-CREATIVE-SCENARIOS-HANDBOOK-V1.0.pdf](BHL-CREATIVE-SCENARIOS-HANDBOOK-V1.0.pdf) | [BHL-CREATIVE-SCENARIOS-HANDBOOK-V1.0.docx](BHL-CREATIVE-SCENARIOS-HANDBOOK-V1.0.docx) |

Quick Start is 15 pages. The handbook is 56 pages and contains scenarios 1–68.

Candidates in these manuals are marked for audition. They are not artistically approved.

## Pictures and scores

- `assets/screenshots/` — 14 interface pictures. `bhl-09-save.png` is kept with the set. The published pages use `bhl-09b-reopen-ready.png` for the save step and do not cite `bhl-09-save.png`.
- `assets/music/` — MuseScore 4 page pictures used in the manuals: `sixteen-bars.png`, `mixed-metre.png`.
- `assets/examples/` — the two scores those pictures come from. Open the MusicXML in MuseScore 4. Save any MuseScore file under a new name. Do not overwrite the MusicXML.

| Example | MusicXML | MuseScore file |
| --- | --- | --- |
| Sixteen-bar duo, “BHL from scratch repaired” | [from-scratch-seed3340-16bars-generated.musicxml](assets/examples/from-scratch-seed3340-16bars-generated.musicxml) | [from-scratch-seed3340-16bars-generated.mscz](assets/examples/from-scratch-seed3340-16bars-generated.mscz) |
| Mixed metre | [12-mixed-metre.musicxml](assets/examples/12-mixed-metre.musicxml) | [12-mixed-metre.mscz](assets/examples/12-mixed-metre.mscz) |

## Rebuild

From `source/`:

```bash
python3 build_all.py
```

That rewrites the Markdown, Word, and PDF files in this folder. Dependencies: `python-docx`, `fpdf2`, `Pillow`. The PDF builder uses Georgia from `/System/Library/Fonts/Supplemental/` on macOS.

A rebuild is not byte-for-byte identical to an earlier PDF. The 15 October 2026 correction replaces the published copies. The Pentatonic page accepts all twenty colours for path and phrase work, with a variable collection-step length, a MusicXML collection mark, and project save/reopen. BHL Another core cell keeps the rhythm seed and changes the transform so the three candidates differ. Figure captions that still use the earlier screenshots say the picture is earlier.

Markdown image links are relative to `source/` (`../assets/...`).
