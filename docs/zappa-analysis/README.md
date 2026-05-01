# Zappa Resources — PDF analysis outputs

This folder holds **machine-generated JSON summaries** for PDFs under **`Zappa Resources/`**.

## Method (`scripts/analyzeZappaPdfResources.py`)

- **Image-only PDFs** (no text layer): metadata + explicit **`limitations`** — **no** interval/phrase/rest/tuplet extraction without OCR / OMR / MusicXML.
- **Text-layer PDFs** (thesis + Guitar World article): lexical statistics — counts of **prose** interval vocabulary, harmony keywords, tuplet names, meter phrases, displacement/syncopation language. These are **document-language proxies**, not symbolic transcription parses.

**Important:** True extraction of

1. consecutive **semitone intervals** in melodic lines,
2. **phrase lengths by rests**,
3. **scale–chord pairing** over staff chords,
4. **rhythmic displacement vs barline** in beats,
5. **tuplets as played** (not only the word “septuplet” in prose),

requires **symbolic music** (MusicXML/MIDI) or **OMR** on the notation pages — not deducible from thesis body text alone.

## Outputs

| JSON | Source PDF |
|------|------------|
| `Frank-Zappa-The-Frank-Zappa-Guitar-Book.analysis.json` | Scanned **Guitar Book** — image-only |
| `FrankZappaFrankZappa-Over-NiteSensation-pdf.analysis.json` | **Over-Nite Sensation** — image-only |
| `Little-Dots-On-Zappa.analysis.json` | Brett Clement thesis — full text layer |
| `Soloing-Strategies-Frank-Zappa-GW.analysis.json` | Guitar World article — text layer |

See **`index.json`** for one-line status per file.

## Gap 7 note

**Frank Zappa Song Mode wiring** (compose dispatch, duo precompute, UI, smoke) is **orthogonal** to this folder: re-run **`py -3 scripts/analyzeZappaPdfResources.py`** whenever PDFs change; no dependency on `frank_zappa` slice completion.

## Refresh

From repo root (after `py -3 -m pip install pypdf`):

```bash
py -3 scripts/analyzeZappaPdfResources.py
```
