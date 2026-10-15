"""Assemble the H6-A4 audition book from MuseScore PDFs and booklet.json.

Usage:
  python3 engines/composer-os-v2/scripts/assembleH6CoreAuditionBook.py /tmp/h6a4-book
"""
import json
import sys
from pathlib import Path

import fitz

ROOT = Path('docs/h6-a4')
BOOK = json.loads((ROOT / 'booklet.json').read_text())
PDF_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/h6a4-book')
OUT = ROOT / 'H6-CORE-12-AUDITION-BOOK.pdf'
PREVIEW = ROOT / 'previews'
PREVIEW.mkdir(parents=True, exist_ok=True)

def plain(value: str) -> str:
    return (
        value.replace('—', ' - ')
        .replace('–', '-')
        .replace('’', "'")
        .replace('“', '"')
        .replace('”', '"')
    )


A4 = fitz.paper_rect('a4')


def text_page(title: str, body: str) -> fitz.Document:
    for size in (10, 9, 8):
        doc = fitz.open()
        page = doc.new_page(width=A4.width, height=A4.height)
        page.insert_text((48, 52), plain(title), fontsize=14, fontname='helv')
        rect = fitz.Rect(48, 68, A4.width - 48, A4.height - 42)
        leftover = page.insert_textbox(rect, plain(body), fontsize=size, fontname='helv', align=0)
        if leftover >= 0:
            return doc
        doc.close()
    raise SystemExit(f'text overflow on {title}')


def wrap_blocks(entry: dict) -> str:
    prompts = '\n'.join(entry['decisionPrompts'])
    return '\n\n'.join([
        entry['status'],
        entry['identity'],
        entry['mathematicalDifference'],
        entry['audibleClaim'],
        prompts + '\n\nMusical character:\n\n\nComments:\n',
    ])


out = fitz.open()
cover = text_page('H6 Core 12 — audition book', '\n\n'.join([
    '15 October 2026',
    'PROVISIONAL — NOT MUSICALLY APPROVED',
    'Twelve computed triad pairs, in numerical order. None is admitted.',
    'Each music page is an original guitar and bass example: close triads, inversions, a spread voicing, an exchange, contrasting dyads, two bass pedals, and a nearest-collection comparison in the same rhythm.',
    'The difference printed for each pair is a pitch-class difference. No audible difference is claimed.',
    'Section D on the music page, and the lines on each identity page, are blank on purpose.',
]))
out.insert_pdf(cover)
cover.close()

for entry, filename in zip(BOOK['entries'], BOOK['files']):
    identity = text_page(f"{entry['index']}. {entry['label']}", wrap_blocks(entry))
    out.insert_pdf(identity)
    identity.close()
    music = fitz.open(PDF_DIR / filename.replace('.musicxml', '.pdf'))
    out.insert_pdf(music)
    music.close()

out.save(OUT)
print('book pages', out.page_count, 'bytes', OUT.stat().st_size)
out.close()
