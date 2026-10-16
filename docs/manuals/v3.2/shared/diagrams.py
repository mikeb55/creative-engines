"""SVG diagrams for the V3.2 manuals. Shapes match the Studio legend."""

from __future__ import annotations

import math
from pathlib import Path


def fretboard_a_dorian(path: Path) -> None:
    """A Dorian, frets 5–10. Circle = root, square = other scale tone. 6 marks the sixth."""
    w, h = 680, 210
    strings = ["E", "B", "G", "D", "A", "E"]
    # string index 0 = high E. (fret, interval label, kind) kind in root, sixth, tone
    notes = {
        0: [(5, "1", "root"), (7, "2", "tone"), (8, "b3", "tone")],
        1: [(5, "5", "tone"), (7, "6", "sixth"), (8, "b7", "tone"), (10, "1", "root")],
        2: [(5, "b3", "tone"), (7, "4", "tone"), (9, "5", "tone")],
        3: [(5, "b7", "tone"), (7, "1", "root"), (9, "2", "tone")],
        4: [(5, "4", "tone"), (7, "5", "tone"), (9, "6", "sixth")],
        5: [(5, "1", "root"), (7, "2", "tone"), (8, "b3", "tone")],
    }
    x0, x1, y0, y1 = 36, w - 16, 18, h - 28
    cw = (x1 - x0) / 6
    sg = (y1 - y0) / 5
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img">',
        f'<rect width="{w}" height="{h}" fill="#ffffff"/>',
    ]
    for i in range(7):
        x = x0 + cw * i
        parts.append(f'<line x1="{x:.1f}" y1="{y0}" x2="{x:.1f}" y2="{y1}" stroke="#777" stroke-width="1.1"/>')
    for j in range(6):
        y = y0 + sg * j
        sw = 0.8 + j * 0.22
        parts.append(f'<line x1="{x0}" y1="{y:.1f}" x2="{x1}" y2="{y:.1f}" stroke="#222" stroke-width="{sw:.2f}"/>')
        parts.append(
            f'<text x="{x0 - 14}" y="{y + 4:.1f}" font-family="Source Sans 3, Arial" font-size="11" fill="#555" text-anchor="middle">{strings[j]}</text>'
        )
    for i, fret in enumerate(range(5, 11)):
        parts.append(
            f'<text x="{x0 + cw * (i + 0.5):.1f}" y="{h - 8}" font-family="Source Sans 3, Arial" font-size="11" fill="#555" text-anchor="middle">{fret}</text>'
        )
    for j, lst in notes.items():
        y = y0 + sg * j
        for fret, lab, kind in lst:
            x = x0 + cw * (fret - 5 + 0.5)
            if kind == "root":
                parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="#1A1A1A"/>')
                col = "#fff"
            elif kind == "sixth":
                parts.append(
                    f'<polygon points="{x:.1f},{y - 13:.1f} {x + 13:.1f},{y:.1f} {x:.1f},{y + 13:.1f} {x - 13:.1f},{y:.1f}" fill="#D55E00"/>'
                )
                col = "#fff"
            else:
                parts.append(f'<rect x="{x - 10:.1f}" y="{y - 10:.1f}" width="20" height="20" fill="#0072B2"/>')
                col = "#fff"
            parts.append(
                f'<text x="{x:.1f}" y="{y + 3.5:.1f}" font-family="Arial" font-size="9" font-weight="700" fill="{col}" text-anchor="middle">{lab}</text>'
            )
    parts.append("</svg>")
    path.write_text("".join(parts), encoding="utf-8")


def pitch_clock(path: Path, title_pcs: set[int], cell: list[int], aria_unused: str = "") -> None:
    size = 220
    names = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
    c = size / 2
    r = size * 0.34
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">', f'<rect width="{size}" height="{size}" fill="#fff"/>']
    parts.append(f'<circle cx="{c}" cy="{c}" r="{r}" fill="none" stroke="#ccc"/>')
    pts = [(c + r * math.sin(2 * math.pi * k / 12), c - r * math.cos(2 * math.pi * k / 12)) for k in range(12)]
    if len(cell) >= 2:
        poly = " ".join(f"{pts[k][0]:.1f},{pts[k][1]:.1f}" for k in cell)
        parts.append(f'<polyline points="{poly}" fill="none" stroke="#D55E00" stroke-width="2"/>')
    for k, (x, y) in enumerate(pts):
        if k in title_pcs:
            fill = "#D55E00" if k in cell else "#1A1A1A"
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{fill}"/>')
        else:
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.5" fill="none" stroke="#999"/>')
        lx = c + (r + 18) * math.sin(2 * math.pi * k / 12)
        ly = c - (r + 18) * math.cos(2 * math.pi * k / 12)
        fill = "#1A1A1A" if k in title_pcs else "#999"
        parts.append(
            f'<text x="{lx:.1f}" y="{ly + 3:.1f}" font-family="Arial" font-size="10" text-anchor="middle" fill="{fill}">{names[k]}</text>'
        )
    parts.append("</svg>")
    path.write_text("".join(parts), encoding="utf-8")


def world_map(path: Path) -> None:
    worlds = [
        ("A", "Triad pairs", "Chord tone of one major triad", "Other major triad, up a tone. No shared pitch class."),
        ("B", "Harmonic quadratonics", "Three chord tones", "Primary tension, from liquid harmony."),
        ("C", "Major + augmented", "Major third", "Raised fifth, and an augmented triad a major third away."),
        ("D", "Major + diminished", "Root", "Minor third and the tritone."),
        ("E", "Pentatonic harmony", "Tones inside the collection", "A contrasting collection, or one outside tone."),
        ("F", "Unrelated major triads", "Shared tone of a minor-third pair", "Tritone triad, which shares none."),
    ]
    w, h = 680, 250
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">', f'<rect width="{w}" height="{h}" fill="#fff"/>']
    for i, (letter, name, common, contrast) in enumerate(worlds):
        col = i % 3
        row = i // 3
        x = 8 + col * 224
        y = 8 + row * 120
        parts.append(f'<rect x="{x}" y="{y}" width="214" height="112" fill="#F3F6F9" stroke="#CFCFCF"/>')
        parts.append(f'<text x="{x + 10}" y="{y + 22}" font-family="Arial" font-size="16" font-weight="700" fill="#D55E00">{letter}</text>')
        parts.append(f'<text x="{x + 28}" y="{y + 22}" font-family="Arial" font-size="12" font-weight="700" fill="#1A1A1A">{name}</text>')
        parts.append(f'<text x="{x + 10}" y="{y + 46}" font-family="Arial" font-size="10" fill="#1A1A1A">Common: {common}</text>')
        # wrap contrast roughly
        parts.append(f'<text x="{x + 10}" y="{y + 68}" font-family="Arial" font-size="10" fill="#1A1A1A">Contrast:</text>')
        parts.append(f'<text x="{x + 10}" y="{y + 84}" font-family="Arial" font-size="10" fill="#333">{contrast[:42]}</text>')
        if len(contrast) > 42:
            parts.append(f'<text x="{x + 10}" y="{y + 98}" font-family="Arial" font-size="10" fill="#333">{contrast[42:84]}</text>')
    parts.append("</svg>")
    path.write_text("".join(parts), encoding="utf-8")
