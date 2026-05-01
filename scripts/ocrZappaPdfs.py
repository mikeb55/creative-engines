#!/usr/bin/env python3
"""
OCR analysis of scanned Zappa PDFs using Tesseract + PyMuPDF.
Extracts chord symbols, time signatures, tuplet numbers, tab figures,
tempo/dynamic markings, and song titles from image-only PDFs,
then maps findings to the same schema as soloing-strategies-gw.json.

Usage:
  py -3 scripts/ocrZappaPdfs.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import Counter
from pathlib import Path

# ── locate Tesseract on Windows ──────────────────────────────────────────────
TESS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(TESS_PATH):
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = TESS_PATH
else:
    import pytesseract  # hope it's on PATH

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
ZAPPA_DIR = ROOT / "Zappa Resources"
OUT_DIR = ROOT / "docs" / "zappa-analysis"

# PDF configs: (pdf_filename, output_json, max_pages, dpi, description)
PDFS = [
    (
        "Frank-Zappa-The-Frank-Zappa-Guitar-Book.pdf",
        "frank-zappa-guitar-book.json",
        303,
        220,
        "The Frank Zappa Guitar Book (Steve Vai transcriptions, Hal Leonard 1983)",
    ),
    (
        "FrankZappaFrankZappa-Over-NiteSensation-pdf.pdf",
        "over-nite-sensation.json",
        99,
        220,
        "Over-Nite Sensation songbook (1973)",
    ),
]

# For the large guitar book, sample every N pages to keep runtime manageable
GUITAR_BOOK_SAMPLE_STEP = 5   # sample ~60 pages from 303
ONS_SAMPLE_STEP = 1           # do all 99 pages for ONS

# ── regex patterns ────────────────────────────────────────────────────────────

# Chord symbol: root + optional quality + optional slash bass
_CHORD_ROOT = r"[A-G][#b]?"
_CHORD_QUAL = (
    r"(?:maj7?#?11?|maj7|maj9|maj13|min7|m7b5|m7|m9|m11|m13|"
    r"7alt|7#11|7b9|7#9|7b13|7sus4|7sus|7|"
    r"dim7|dim|aug|ø|°|\+|sus4|sus2|sus|"
    r"add9|add11|add13|"
    r"9|11|13|6|6\/9)?"
)
_SLASH = r"(?:/[A-G][#b]?)?"
CHORD_RE = re.compile(rf"\b({_CHORD_ROOT}{_CHORD_QUAL}{_SLASH})\b")

# Time signature: digits / digits (e.g. 4/4, 7/8, 11/16)
TIMESIG_RE = re.compile(r"\b(\d{1,2})/(\d{1,2})\b")

# Tuplet numbers: isolated digits 3,5,6,7,9,10,11 (appear over beams in tab/notation)
TUPLET_RE = re.compile(r"(?<!\d)([3-9]|10|11|12)(?!\d)")

# Tab digit sequences (one or two digits 0-24 on a line, space-separated — guitar tab)
TAB_LINE_RE = re.compile(r"^[\s\d\-|/\\hpbr~]*$")
TAB_NUM_RE  = re.compile(r"\b([0-9]|1[0-9]|2[0-4])\b")

# Tempo / expression markings
TEMPO_RE = re.compile(
    r"(Moderately|Slow|Fast|Moderate|Up-tempo|Freely|"
    r"♩\s*=\s*\d+|♩=\d+|q\s*=\s*\d+|q=\d+|"
    r"Allegro|Andante|Adagio|Presto|Vivace|Largo|Lento|"
    r"In Two|In Four|Straight|Shuffle|Swing)",
    re.IGNORECASE,
)

# Dynamic markings
DYNAMIC_RE = re.compile(r"\b(ppp|pp|mp|mf|ff|fff|sfz|sfp|fp|[pf])\b")

# Scale/mode mentions
SCALE_RE = re.compile(
    r"(pentatonic|blues scale|dorian|mixolydian|lydian|phrygian|locrian|"
    r"whole.?tone|diminished|harmonic minor|melodic minor|altered|"
    r"bebop|octatonic|super locrian)",
    re.IGNORECASE,
)

# Technique annotations
TECHNIQUE_RE = re.compile(
    r"\b(hammer|pull.?off|bend|vibrato|slide|legato|tremolo|"
    r"whammy|wah|tapping|tap|rake|sweep)\b",
    re.IGNORECASE,
)

# Song / section title: line in ALL CAPS with at least 3 chars
TITLE_RE = re.compile(r"^([A-Z][A-Z\s\'\-\&]{2,60})$")

# ── helpers ───────────────────────────────────────────────────────────────────

def render_page(doc: fitz.Document, page_idx: int, dpi: int = 220) -> "PIL.Image.Image":
    """Render a PDF page to a PIL Image at given DPI."""
    from PIL import Image
    page = doc[page_idx]
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY, alpha=False)
    return Image.frombytes("L", (pix.width, pix.height), pix.samples)


def ocr_page(img) -> str:
    """Run Tesseract on a PIL image; return extracted text."""
    # psm 6 = assume uniform block of text; good for dense notation pages
    config = "--psm 6 --oem 3"
    try:
        return pytesseract.image_to_string(img, config=config, lang="eng")
    except Exception as exc:
        return f"[OCR_ERROR: {exc}]"


def parse_tab_frets(lines: list[str]) -> list[int]:
    """Extract guitar tab fret numbers from lines that look like tab."""
    frets: list[int] = []
    for line in lines:
        if TAB_LINE_RE.match(line):
            nums = TAB_NUM_RE.findall(line)
            frets.extend(int(n) for n in nums)
    return frets


def fret_intervals(frets: list[int]) -> Counter:
    """Compute consecutive fret differences (semitones) from tab sequences."""
    intervals: Counter = Counter()
    for a, b in zip(frets, frets[1:]):
        diff = abs(b - a)
        if 0 < diff <= 24:
            intervals[diff] += 1
    return intervals


def semitone_to_label(n: int) -> str:
    names = {
        1: "minor 2nd (semitone)", 2: "major 2nd (whole step)",
        3: "minor 3rd", 4: "major 3rd", 5: "perfect 4th",
        6: "tritone (aug4/dim5)", 7: "perfect 5th",
        8: "minor 6th", 9: "major 6th",
        10: "minor 7th", 11: "major 7th", 12: "octave",
        13: "minor 9th", 14: "major 9th", 15: "minor 10th",
        16: "major 10th", 17: "perfect 11th", 19: "minor 13th",
        24: "2 octaves",
    }
    return names.get(n, f"{n} semitones")


# ── main OCR + analysis per PDF ───────────────────────────────────────────────

def analyze_pdf(pdf_path: Path, sample_step: int, dpi: int) -> dict:
    """OCR sample pages, then aggregate musical features."""
    doc = fitz.open(str(pdf_path))
    n_pages = len(doc)

    all_text: list[str] = []
    pages_sampled: list[int] = []

    # Always include first 8 pages (TOC / intro) plus sampled remainder
    priority_pages = list(range(min(8, n_pages)))
    rest_pages = list(range(8, n_pages, sample_step))
    page_indices = sorted(set(priority_pages + rest_pages))

    print(f"  OCR-ing {len(page_indices)}/{n_pages} pages from {pdf_path.name}…",
          flush=True)

    for i, idx in enumerate(page_indices):
        img = render_page(doc, idx, dpi)
        text = ocr_page(img)
        all_text.append(text)
        pages_sampled.append(idx + 1)  # 1-based
        if (i + 1) % 10 == 0:
            print(f"    {i + 1}/{len(page_indices)} pages done", flush=True)

    doc.close()
    full_text = "\n".join(all_text)
    lines = full_text.splitlines()

    # ── chord symbols ──────────────────────────────────────────────────────
    chord_hits = CHORD_RE.findall(full_text)
    chord_counter: Counter = Counter()
    for c in chord_hits:
        # Filter noise: single-letter matches without quality are too ambiguous
        if len(c) >= 2 or re.match(r"[A-G][#b]", c):
            chord_counter[c] += 1
    top_chords = chord_counter.most_common(40)

    # Detect progression pairs (consecutive chord mentions on same/adjacent line)
    prog_pairs: Counter = Counter()
    for line in lines:
        chords_in_line = CHORD_RE.findall(line)
        if len(chords_in_line) >= 2:
            for a, b in zip(chords_in_line, chords_in_line[1:]):
                if a != b:
                    prog_pairs[(a, b)] += 1
    top_pairs = [(f"{a}→{b}", cnt) for (a, b), cnt in prog_pairs.most_common(20)]

    # ── time signatures ────────────────────────────────────────────────────
    timesig_counter: Counter = Counter()
    for m in TIMESIG_RE.finditer(full_text):
        num, denom = int(m.group(1)), int(m.group(2))
        if denom in (4, 8, 16) and 1 <= num <= 17:
            timesig_counter[f"{num}/{denom}"] += 1

    # ── tuplet groupings ───────────────────────────────────────────────────
    tuplet_counter: Counter = Counter()
    # Count isolated tuplet digits in context of notation lines
    for line in lines:
        # Skip lines that look like they're mostly tab (avoid fret number noise)
        if TAB_LINE_RE.match(line):
            continue
        for m in TUPLET_RE.finditer(line):
            tuplet_counter[int(m.group(1))] += 1

    # ── tab fret analysis → intervals ─────────────────────────────────────
    tab_frets = parse_tab_frets(lines)
    interval_counter = fret_intervals(tab_frets)
    top_intervals = [
        {
            "semitones": n,
            "label": semitone_to_label(n),
            "occurrences": cnt,
        }
        for n, cnt in sorted(interval_counter.items(), key=lambda x: -x[1])[:15]
    ]

    # ── scale/mode mentions ────────────────────────────────────────────────
    scale_counter: Counter = Counter()
    for m in SCALE_RE.finditer(full_text):
        scale_counter[m.group(0).lower()] += 1

    # ── techniques ────────────────────────────────────────────────────────
    technique_counter: Counter = Counter()
    for m in TECHNIQUE_RE.finditer(full_text):
        technique_counter[m.group(0).lower()] += 1

    # ── dynamics ──────────────────────────────────────────────────────────
    dynamic_counter: Counter = Counter()
    for m in DYNAMIC_RE.finditer(full_text):
        dynamic_counter[m.group(0)] += 1

    # ── tempo ─────────────────────────────────────────────────────────────
    tempo_hits = TEMPO_RE.findall(full_text)
    tempo_counter: Counter = Counter(t.strip() for t in tempo_hits)

    # ── song titles (ALL CAPS lines) ──────────────────────────────────────
    candidate_titles: list[str] = []
    for line in lines:
        stripped = line.strip()
        m = TITLE_RE.match(stripped)
        if m and len(stripped.split()) >= 1:
            candidate_titles.append(stripped)
    title_counter: Counter = Counter(candidate_titles)
    unique_titles = [t for t, _ in title_counter.most_common(30) if len(t) > 3]

    # ── rhythmic displacement signals ─────────────────────────────────────
    displacement_keys = [
        "pickup", "upbeat", "syncopat", "displacement",
        "cross rhythm", "hemiola", "offbeat", "anticipat",
    ]
    displacement_hits = {k: full_text.lower().count(k) for k in displacement_keys}

    # ── phrase length estimate from rests ─────────────────────────────────
    # In OCR of notation, rests appear as partial symbols; we count 'r' in tab context
    # and look for measure-bar separations
    bar_separator_count = full_text.count("|")
    # Rough estimate: how many tab/notation lines per "phrase" (8-12 bars typical)
    approx_measures = max(bar_separator_count, 1)

    # ── derive scale suggestions over chord types ──────────────────────────
    # Identify minor 7th chords and minor chord families
    minor_chords = [c for c, _ in top_chords if re.search(r"m[^a]|min", c)]
    dom7_chords  = [c for c, _ in top_chords if re.search(r"[A-G][#b]?7(?!alt|sus|m|maj)", c)]
    maj7_chords  = [c for c, _ in top_chords if "maj7" in c]
    alt_chords   = [c for c, _ in top_chords if "7alt" in c or "#11" in c or "b9" in c]

    scale_over_chord = []
    if minor_chords:
        scale_over_chord.append({
            "chordType": "minor (m7 / m / min)",
            "examplesFound": minor_chords[:6],
            "scaleMode": "Dorian / natural minor / minor pentatonic (Zappa typically Dorian over minor vamps)",
            "source": "OCR chord symbol extraction",
        })
    if dom7_chords:
        scale_over_chord.append({
            "chordType": "dominant 7th",
            "examplesFound": dom7_chords[:6],
            "scaleMode": "Mixolydian / blues / pentatonic (alt scale if b9/#9 decoration present)",
            "source": "OCR chord symbol extraction",
        })
    if maj7_chords:
        scale_over_chord.append({
            "chordType": "major 7th",
            "examplesFound": maj7_chords[:4],
            "scaleMode": "Lydian (Zappa's preferred major-chord colour) / Ionian",
            "source": "OCR chord symbol extraction",
        })
    if alt_chords:
        scale_over_chord.append({
            "chordType": "altered dominant (7alt / 7#11 / 7b9)",
            "examplesFound": alt_chords[:4],
            "scaleMode": "Altered scale (super-Locrian) / diminished half-whole",
            "source": "OCR chord symbol extraction",
        })

    # ── phrase length heuristic from bar count ─────────────────────────────
    phrase_observations = []
    if bar_separator_count > 0:
        phrase_observations.append({
            "label": "bar separators detected (pipe chars in OCR)",
            "count": bar_separator_count,
            "note": "Pipe characters in tab/notation OCR; each represents a barline. Actual phrase groupings require visual score review.",
        })
    phrase_observations.append({
        "label": "Zappa canonical phrase unit",
        "notesPerPhrase": 4,
        "phraseLengthBars": 2,
        "note": "From Guitar World analysis (soloing-strategies-gw.json): 4-note cells cycled over 2-bar spans with varied rhythmic placement are the primary compositional unit",
    })
    phrase_observations.append({
        "label": "motif dissolution point",
        "phraseLengthBars": "2–3",
        "note": "Same motif cycles 2–3 times before dissolution (cross-referenced with GW analysis)",
    })

    # ── tuplet grouping interpretations ───────────────────────────────────
    tuplet_observations = []
    for n, cnt in sorted(tuplet_counter.items(), key=lambda x: -x[1])[:8]:
        label_map = {
            3: "triplet (3 in space of 2)",
            4: "quadruplet",
            5: "quintuplet (5:4) — signature Zappa grouping",
            6: "sextuplet",
            7: "septuplet (7:4) — polyrhythmic",
            9: "nonuplet",
            11: "11-tuplet — extreme subdivision",
        }
        tuplet_observations.append({
            "grouping": n,
            "label": label_map.get(n, f"{n}-tuplet"),
            "ocrHits": cnt,
            "note": "Count is from OCR digit extraction; noise from fret numbers filtered where possible",
        })

    # ── rhythmic displacement ──────────────────────────────────────────────
    rhythmic_displacement = {
        "method": "keyword_search_over_ocr_text",
        "keywordHits": {k: v for k, v in displacement_hits.items() if v > 0},
        "primaryTechnique": (
            "Motif restated from different beat positions within successive measures "
            "(from GW analysis cross-reference)"
        ),
        "ocrEvidence": [
            f"'{k}' appears {v} time(s) in OCR text"
            for k, v in displacement_hits.items() if v > 0
        ],
    }

    return {
        "source": pdf_path.name,
        "extractionMethod": "Tesseract 5 OCR via PyMuPDF page rendering",
        "ocrConfig": f"dpi={dpi}, psm=6, lang=eng",
        "pageCount": n_pages,
        "pagesSampled": len(pages_sampled),
        "pagesSampledList": pages_sampled[:20],  # first 20 for reference
        "totalOcrChars": len(full_text),

        "detectedTitlesAndSections": unique_titles[:20],

        "intervalPatterns": {
            "method": "tab_fret_difference_analysis + chord_symbol_ocr",
            "tabFretsExtracted": len(tab_frets),
            "topIntervalsByFrequency": top_intervals,
            "characteristicIntervals": _derive_characteristic_intervals(interval_counter),
            "techniqueNotes": [f"{t}: {c} hits" for t, c in technique_counter.most_common(10)],
            "scaleMentions": dict(scale_counter.most_common(12)),
        },

        "phraseLengths": {
            "unit": "measures (estimated)",
            "observations": phrase_observations,
            "barSeparatorCount": bar_separator_count,
            "generalPrinciple": (
                "2-bar phrases dominate Zappa guitar writing; 4-note cells are the "
                "recurring compositional unit cycled 2–3 times with varied rhythm."
            ),
        },

        "scaleModeOverChordTypes": scale_over_chord,

        "rhythmicDisplacement": rhythmic_displacement,

        "rhythmicGroupings": {
            "primary": tuplet_observations,
            "timeSigsFound": [
                {"sig": sig, "hits": cnt}
                for sig, cnt in timesig_counter.most_common(15)
            ],
            "philosophyNote": (
                "Zappa moves between duple (8th/16th) and triple (triplets) feels, "
                "dispersing odd note-groups (5:4, 7:4) into even spaces."
            ),
        },

        "harmonicProgressions": _derive_progressions(top_pairs, top_chords),

        "characteristicDevices": _derive_devices(
            technique_counter, scale_counter, dynamic_counter, chord_counter
        ),

        "chordSymbolStats": {
            "totalChordHits": sum(chord_counter.values()),
            "uniqueChordsFound": len(chord_counter),
            "top40Chords": [{"chord": c, "hits": n} for c, n in top_chords],
        },

        "dynamics": dict(dynamic_counter.most_common()),
        "tempoMarkings": dict(tempo_counter.most_common()),
    }


def _derive_characteristic_intervals(counter: Counter) -> list[dict]:
    """Map top tab intervals to musical descriptions."""
    out = []
    for n, cnt in sorted(counter.items(), key=lambda x: -x[1])[:8]:
        entry = {
            "semitones": n,
            "label": semitone_to_label(n),
            "tabOccurrences": cnt,
        }
        if n == 1:
            entry["musicalContext"] = "Chromatic approach / semitone neighbour"
        elif n == 2:
            entry["musicalContext"] = "Stepwise diatonic motion"
        elif n == 3:
            entry["musicalContext"] = "Minor 3rd — pentatonic skip"
        elif n == 5:
            entry["musicalContext"] = "Perfect 4th — open-string jump"
        elif n == 7:
            entry["musicalContext"] = "Perfect 5th — power chord / root jump"
        elif n == 12:
            entry["musicalContext"] = "Octave displacement — register shift"
        elif n == 6:
            entry["musicalContext"] = "Tritone — Zappa polytonal / dissonance device"
        out.append(entry)
    return out


def _derive_progressions(top_pairs: list, top_chords: list) -> list[dict]:
    """Build harmonic progression summaries from OCR chord pairs."""
    progs = []
    for pair_str, cnt in top_pairs[:10]:
        if cnt >= 2:
            progs.append({
                "id": pair_str.lower().replace("→", "_to_").replace("/", "sl").replace("#", "s").replace("b", "fl"),
                "formula": pair_str,
                "ocrOccurrences": cnt,
                "source": "OCR chord symbol co-occurrence",
            })
    return progs


def _derive_devices(
    technique_counter: Counter,
    scale_counter: Counter,
    dynamic_counter: Counter,
    chord_counter: Counter,
) -> list[str]:
    devices = []
    if technique_counter.get("bend"):
        devices.append("String bends (standard + microtonal 3/4-step)")
    if technique_counter.get("hammer") or technique_counter.get("pull-off"):
        devices.append("Hammer-ons / pull-offs for legato burst figures")
    if technique_counter.get("tremolo") or technique_counter.get("vibrato"):
        devices.append("Tremolo picking / vibrato on sustained pitches")
    if technique_counter.get("slide"):
        devices.append("Slides between chord tones")
    if technique_counter.get("wah"):
        devices.append("Wah pedal articulation (Over-Nite era)")
    if technique_counter.get("tap") or technique_counter.get("tapping"):
        devices.append("Tapping (Steve Vai transcription era)")
    if scale_counter.get("pentatonic"):
        devices.append("Pentatonic scalar runs (primary melodic language)")
    if scale_counter.get("chromatic") or scale_counter.get("diminished"):
        devices.append("Chromatic / diminished passing tones as solo capper")
    if any(c for c in chord_counter if "#11" in c or "7alt" in c):
        devices.append("Lydian #11 / altered dominant chord colour")
    if any(c for c in chord_counter if "7b9" in c or "7#9" in c):
        devices.append("Dominant 7b9 / 7#9 tension chords")
    devices.append("Cycled 4-note motifs with rhythmic displacement across bars")
    devices.append("Open-string pull-offs as ornamental/structural elements")
    devices.append("Polytonal / poly-scale approach over static vamps")
    return devices


# ── entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        sys.exit("Install Pillow: py -3 -m pip install Pillow")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for pdf_name, out_name, max_pages, dpi, description in PDFS:
        pdf_path = ZAPPA_DIR / pdf_name
        out_path = OUT_DIR / out_name

        if not pdf_path.exists():
            print(f"SKIP: {pdf_path} not found")
            continue

        # Skip if already OCR-processed
        if out_path.exists():
            try:
                existing_check = json.loads(out_path.read_text(encoding="utf-8"))
                if existing_check.get("ocrExtractionStatus") == "completed":
                    print(f"SKIP (already OCR-completed): {out_name}")
                    continue
            except Exception:
                pass

        print(f"\n{'='*60}")
        print(f"Processing: {pdf_name}")
        print(f"Description: {description}")

        sample_step = GUITAR_BOOK_SAMPLE_STEP if "Guitar" in pdf_name else ONS_SAMPLE_STEP

        result = analyze_pdf(pdf_path, sample_step, dpi)
        result["title"] = description

        # Load existing JSON and merge (append findings, preserve prior metadata)
        existing = {}
        if out_path.exists():
            try:
                existing = json.loads(out_path.read_text(encoding="utf-8"))
            except Exception:
                pass

        # Preserve existing metadata fields, add/overwrite analysis fields
        merged = {**existing, **result}
        # Stamp the extraction
        merged["ocrExtractionStatus"] = "completed"
        merged["extractionStatus"] = "ocr_completed"

        out_path.write_text(
            json.dumps(merged, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"  Written -> {out_path.relative_to(ROOT)}")
        print(f"  Pages sampled: {result['pagesSampled']}/{result['pageCount']}")
        print(f"  OCR chars: {result['totalOcrChars']:,}")
        print(f"  Top chords: {[c for c, _ in result['chordSymbolStats']['top40Chords'][:8]]}")
        print(f"  Time sigs: {result['rhythmicGroupings']['timeSigsFound'][:5]}")


if __name__ == "__main__":
    main()
