"""Write both BHL manuals. Run from the source directory."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_handbook import build as build_handbook
from build_quick import build as build_quick

ROOT = Path(__file__).resolve().parent.parent


def emit(manual):
    md = ROOT / "source" / f"{manual.stem}.md"
    docx = ROOT / f"{manual.stem}.docx"
    pdf = ROOT / f"{manual.stem}.pdf"
    manual.write_markdown(md, ROOT / "assets")
    manual.write_docx(docx)
    manual.write_pdf(pdf)
    print(manual.stem, "ops", len(manual.ops), "anchors", len(manual.anchors()))


if __name__ == "__main__":
    emit(build_quick())
    emit(build_handbook())
