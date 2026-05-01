#!/usr/bin/env python3
"""
Offline analysis of Zappa Resources PDFs -> docs/zappa-analysis/*.json

Limitations:
- Image-only PDFs (no text layer) cannot yield symbolic intervals, rests, or notation-derived rhythms.
- Text-layer PDFs yield lexical statistics + regex-derived hints only, not reliable pitch-interval runs
  unless embedded notation is OCR'd or exported to MusicXML.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None  # type: ignore


ROOT = Path(__file__).resolve().parents[1]
ZAPPA_DIR = ROOT / "Zappa Resources"
OUT_DIR = ROOT / "docs" / "zappa-analysis"


def norm_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def extract_pdf_meta(reader: PdfReader) -> dict:
    meta = reader.metadata or {}
    out = {}
    for k in ("/Title", "/Author", "/Creator", "/Producer"):
        if k in meta:
            v = meta[k]
            try:
                out[k.strip("/").lower()] = str(v) if v is not None else None
            except Exception:
                out[k.strip("/").lower()] = None
    return out


def keyword_hits(text: str, keys: list[str]) -> dict[str, int]:
    low = text.lower()
    return {k: low.count(k.lower()) for k in keys}


def tuplet_counts(text: str) -> dict[str, int]:
    patterns = [
        ("triplet", r"\btriplet(s)?\b"),
        ("duplet", r"\bduplet(s)?\b"),
        ("quadruplet", r"\bquadruplet(s)?\b"),
        ("quintuplet", r"\bquintuplet(s)?\b"),
        ("sextuplet", r"\bsextuplet(s)?\b"),
        ("septuplet", r"\bseptuplet(s)?\b"),
        ("octuplet", r"\boctuplet(s)?\b"),
        ("nonuplet", r"\bnonuplet(s)?\b"),
        ("decuplet", r"\bdecuplet(s)?\b"),
        ("tuplets_general", r"\btuplet(s)?\b"),
        ("polyrhythm", r"\bpolyrhythm(s)?\b"),
        ("hemiola", r"\bhemiola"),
        ("rubato", r"\brubato"),
    ]
    out: dict[str, int] = {}
    low = text  # case-sensitive regex alternates where needed
    for name, pat in patterns:
        out[name] = len(re.findall(pat, low, flags=re.IGNORECASE))
    return out


def prose_interval_language(text: str) -> dict[str, int]:
    keys = [
        "half step",
        "whole step",
        "semitone",
        "whole tone",
        "minor third",
        "major third",
        "perfect fourth",
        "tritone",
        "perfect fifth",
        "minor seventh",
        "major seventh",
        "octave",
        "chromatic",
        "diatonic",
        "melodic minor",
        "harmonic minor",
        "diminished",
        "whole tone scale",
        "diminished scale",
        "bebop",
        "lydian",
        "mixolydian",
        "dorian",
        "phrygian",
        "locrian",
        "altered scale",
        "super locrian",
        "melodic line",
        "motivic",
    ]
    return keyword_hits(text, keys)


def rhythm_displacement_language(text: str) -> dict[str, int]:
    keys = [
        "pickup",
        "pick-up",
        "upbeat",
        "anacrusis",
        "syncopation",
        "syncopated",
        "displacement",
        "metric displacement",
        "cross rhythm",
        "cross-rhythm",
        "hemiola",
        "offbeat",
        "off-beat",
        "anticipation",
        "delayed",
        "backbeat",
    ]
    return keyword_hits(text, keys)


def chord_harmony_language(text: str) -> dict[str, int]:
    keys = [
        "7alt",
        "altered",
        "dominant",
        "tritone substitution",
        "tritone sub",
        "tritone",
        "slash chord",
        "polytonal",
        "lydian dominant",
        "half-diminished",
        "m7b5",
        "maj7",
        "maj7#11",
        "#11",
        "sus4",
        "mixolydian",
        "bebop scale",
        "octatonic",
        "whole tone",
    ]
    return keyword_hits(text, keys)


def phrase_language(text: str) -> dict[str, int]:
    keys = [
        "phrase",
        "phrases",
        "motif",
        "motivic",
        "rest",
        "breath",
        "cadence",
        "antecedent",
        "consequent",
        "four-bar",
        "two-bar",
        "measure group",
    ]
    return keyword_hits(text, keys)


def extract_note_letter_runs(text: str, max_runs: int = 5000) -> dict:
    """
    Very coarse: isolated A–G letters — often polluted by prose / headings.
    """
    letters = re.findall(r"\b([A-G])(?![a-z])\b", text)
    return {
        "isolated_note_letters_total": len(letters),
        "letter_histogram_top": Counter(letters).most_common(8),
        "note": "Not pitch spelling without octave; thesis prose produces many false positives.",
    }


def naive_consecutive_semitone_estimate_from_letters(_text: str) -> dict:
    """Placeholder — cannot map letters to pitch classes without notation."""
    return {
        "computable": False,
        "reason": "Requires symbolic notation (MusicXML/MIDI/tab OCR), not available from text layer alone.",
    }


def analyze_text_pdf(path: Path) -> dict:
    assert PdfReader is not None
    reader = PdfReader(str(path))
    meta = extract_pdf_meta(reader)
    pages_text: list[str] = []
    for p in reader.pages:
        pages_text.append(p.extract_text() or "")
    full = "\n".join(pages_text)
    nonempty_pages = sum(1 for t in pages_text if t.strip())

    summary = {
        "sourcePdf": path.relative_to(ROOT).as_posix(),
        "analysisGeneratedAtUtc": datetime.now(timezone.utc).isoformat(),
        "pdfMetadata": meta,
        "pageCount": len(reader.pages),
        "pagesWithExtractableText": nonempty_pages,
        "extractedCharacterCount": len(full),
        "symbolicMelodicIntervalsFromNotation": naive_consecutive_semitone_estimate_from_letters(full),
        "intervalPatterns": {
            "method": "prose_keyword_and_lexical_hits_only",
            "prose_interval_language_counts": prose_interval_language(full),
            "noteLetterNoiseProbe": extract_note_letter_runs(full),
        },
        "phraseLengths": {
            "method": "text_layer_only_no_rest_encoding",
            "phrase_language_counts": phrase_language(full),
            "note": "Note-count-per-phrase grouped by rests requires symbolic score or OCR staff.",
        },
        "scaleModeSuggestionsOverChordTypes": {
            "method": "lexical_harmony_keywords_in_document_text",
            "harmony_keyword_counts": chord_harmony_language(full),
            "emphasis": "Corpus mentions of altered / tritone / #11 / m7b5 etc. are proxies for analytical prose, not automated chord-scale pairing.",
        },
        "rhythmicDisplacementLanguage": rhythm_displacement_language(full),
        "tupletsAndRhythmicGroupings": {
            "tuplets_regex_counts": tuplet_counts(full),
            "meter_keywords": keyword_hits(
                full,
                [
                    "meter",
                    "metre",
                    "time signature",
                    "5/8",
                    "7/8",
                    "9/8",
                    "11/8",
                    "12/8",
                    "4/4",
                    "odd meter",
                    "changing meter",
                ],
            ),
        },
        "limitations": [
            "Embedded notation examples may appear as raster images — intervals/rests/tuplets on staff are not parsed.",
            "Text search cannot recover precise beat/subdivision onset without OCR + music-specific parsing.",
        ],
    }
    return summary


def analyze_image_only_pdf(path: Path) -> dict:
    assert PdfReader is not None
    reader = PdfReader(str(path))
    meta = extract_pdf_meta(reader)
    pages_text: list[str] = []
    total_chars = 0
    nonempty = 0
    for p in reader.pages:
        t = p.extract_text() or ""
        total_chars += len(t.strip())
        if t.strip():
            nonempty += 1
    return {
        "sourcePdf": path.relative_to(ROOT).as_posix(),
        "analysisGeneratedAtUtc": datetime.now(timezone.utc).isoformat(),
        "pdfMetadata": meta,
        "pageCount": len(reader.pages),
        "pagesWithExtractableText": nonempty,
        "extractedCharacterCount": total_chars,
        "extractionStatus": "image_only_or_empty_text_layer",
        "intervalPatterns": None,
        "phraseLengths": None,
        "scaleModeSuggestionsOverChordTypes": None,
        "rhythmicDisplacement": None,
        "tupletsAndRhythmicGroupings": None,
        "limitations": [
            "No selectable text in PDF — likely scanned notation/transcriptions.",
            "Automated interval/phrase/rest/tuplet extraction requires OCR + optical music recognition or manual MusicXML export.",
        ],
        "recommendedNextSteps": [
            "Run OCR (e.g. Adobe, ABBYY) or obtain publisher MusicXML.",
            "For staff music: try Audiveris, Photoscore, or SmartScore to produce MusicXML; then parse with music21 or custom TS.",
        ],
    }


def main() -> None:
    if PdfReader is None:
        raise SystemExit("Install pypdf: py -3 -m pip install pypdf")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    pdfs = sorted(ZAPPA_DIR.glob("*.pdf"))
    if not pdfs:
        raise SystemExit(f"No PDFs under {ZAPPA_DIR}")

    for pdf in pdfs:
        reader = PdfReader(str(pdf))
        probe_chars = 0
        for pg in reader.pages[: min(5, len(reader.pages))]:
            probe_chars += len((pg.extract_text() or "").strip())
        # classify: if zero text in first 5 pages AND zero total — still scan full doc for safety
        total_all = 0
        for pg in reader.pages:
            total_all += len((pg.extract_text() or "").strip())

        stem = pdf.stem.replace(" ", "_")
        out_path = OUT_DIR / f"{stem}.analysis.json"

        if total_all == 0:
            payload = analyze_image_only_pdf(pdf)
        else:
            payload = analyze_text_pdf(pdf)

        out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
