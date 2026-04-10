# -*- coding: utf-8 -*-
"""Build V3 ACE case .docx from ACE-Case-*.md (single source of truth)."""
import re
from pathlib import Path

from docx import Document
from docx.shared import Pt

OUT_DIR = Path(__file__).resolve().parent

# md stem -> output filename and optional display title override
MAP = [
    ("ACE-Case-Leah.md", "V3-Leah-Shame.docx", "ACE-Case Leah — Shame"),
    ("ACE-Case-Ousmane.md", "V3-Ousmane-Overload.docx", "ACE-Case Ousmane — Overload"),
    ("ACE-Case-Emily.md", "V3-Emily-Dissociation.docx", "ACE-Case Emily — Dissociation"),
    ("ACE-Case-Michael.md", "V3-Michael-Risk.docx", "ACE-Case Michael — Risk"),
]


def parse_md(text):
    lines = text.strip().splitlines()
    title_line = lines[0].lstrip("# ").strip() if lines else ""
    rest = "\n".join(lines[1:])
    parts = rest.split("**Trainee instruction:**")
    narrative = parts[0].strip()
    tail = parts[1] if len(parts) > 1 else ""
    ti_match = re.match(
        r"\s*(.+?)\n\n\*\*Tasks\*\*", tail, re.DOTALL
    )
    trainee = ti_match.group(1).strip() if ti_match else ""
    after_tasks = tail.split("**Tasks**", 1)[1] if "**Tasks**" in tail else ""
    task_block, ace_block = re.split(
        r"\n\*\*ACE-Cases score intention:\*\*",
        after_tasks,
        maxsplit=1,
    )
    tasks = []
    for m in re.finditer(r"^\d+\.\s+(.+)$", task_block, re.MULTILINE):
        tasks.append(m.group(1).strip())
    ace = ace_block.strip() if ace_block else ""
    return title_line, narrative, trainee, tasks, ace


def add_body(doc, text, bold=False):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.font.name = "Calibri"
    r.font.size = Pt(11)
    r.bold = bold
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15


def build_doc(md_path, out_name, display_title):
    text = md_path.read_text(encoding="utf-8")
    _, narrative, trainee, tasks, ace = parse_md(text)

    doc = Document()
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(11)

    h = doc.add_heading(display_title, level=1)
    for r in h.runs:
        r.font.name = "Calibri"

    for block in narrative.split("\n\n"):
        if block.strip():
            add_body(doc, block.strip())

    doc.add_paragraph()
    p = doc.add_paragraph()
    r0 = p.add_run("Trainee instruction: ")
    r0.bold = True
    r0.font.name = "Calibri"
    r0.font.size = Pt(11)
    r1 = p.add_run(trainee)
    r1.font.name = "Calibri"
    r1.font.size = Pt(11)
    p.paragraph_format.space_after = Pt(8)

    doc.add_paragraph()
    pt = doc.add_paragraph()
    rt = pt.add_run("Tasks")
    rt.bold = True
    rt.font.name = "Calibri"
    rt.font.size = Pt(11)
    for i, t in enumerate(tasks, 1):
        add_body(doc, f"{i}. {t}")

    doc.add_paragraph()
    p = doc.add_paragraph()
    r0 = p.add_run("ACE-Cases score intention: ")
    r0.bold = True
    r0.font.name = "Calibri"
    r0.font.size = Pt(11)
    r1 = p.add_run(ace)
    r1.font.name = "Calibri"
    r1.font.size = Pt(11)

    out = OUT_DIR / out_name
    doc.save(str(out))
    print("Wrote", out)


def main():
    for md_name, out_name, display in MAP:
        md_path = OUT_DIR / md_name
        if not md_path.exists():
            raise FileNotFoundError(md_path)
        build_doc(md_path, out_name, display)


if __name__ == "__main__":
    main()
