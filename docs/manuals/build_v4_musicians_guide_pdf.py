#!/usr/bin/env python3
"""Build Composer OS V4.0 Musician's Guide PDF from the Markdown source.

Uses installed reportlab + fonts under docs/manuals/v3.2/fonts.
No new packages. Regenerates docs/manuals/COMPOSER-OS-V4-MUSICIANS-GUIDE.pdf.
"""

from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parent
MD_PATH = ROOT / "COMPOSER-OS-V4-MUSICIANS-GUIDE.md"
PDF_PATH = ROOT / "COMPOSER-OS-V4-MUSICIANS-GUIDE.pdf"
FONT_DIR = ROOT / "v3.2" / "fonts"

INK = HexColor("#1A1A1A")
MUTED = HexColor("#5A5A5A")
ACCENT = HexColor("#0072B2")
RULE = HexColor("#CFCFCF")
TINT = HexColor("#F3F6F9")
TAG_SHIPPED = HexColor("#009E73")
TAG_PARTIAL = HexColor("#E69F00")
TAG_UNVER = HexColor("#D55E00")
TAG_OUTLINE = HexColor("#666666")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("SourceSerif", str(FONT_DIR / "SourceSerif4-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("SourceSerif-Bold", str(FONT_DIR / "SourceSerif4-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("SourceSerif-It", str(FONT_DIR / "SourceSerif4-It.ttf")))
    pdfmetrics.registerFont(TTFont("SourceSans", str(FONT_DIR / "SourceSans3-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("SourceSans-Bold", str(FONT_DIR / "SourceSans3-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("SourceSans-Semibold", str(FONT_DIR / "SourceSans3-Semibold.ttf")))
    pdfmetrics.registerFont(TTFont("SourceSans-It", str(FONT_DIR / "SourceSans3-Italic.ttf")))


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def md_inline(text: str) -> str:
    text = esc(text)
    text = re.sub(r"`([^`]+)`", r'<font name="SourceSans-Semibold" size="9">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(
        r"\[([^\]]+)\]\((#[^)]+)\)",
        lambda m: f'<a href="{m.group(2)}" color="#0072B2"><u>{m.group(1)}</u></a>',
        text,
    )
    return text


def tag_color(tag: str):
    if "SHIPPED" in tag:
        return TAG_SHIPPED
    if "PARTIAL" in tag:
        return TAG_PARTIAL
    if "UNIMPLEMENTED" in tag:
        return HexColor("#CC79A7")
    if "UNVERIFIED" in tag:
        return TAG_UNVER
    return MUTED


class GuideDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, **kwargs):
        super().__init__(filename, **kwargs)
        self.bookmark_page_map: dict[str, int] = {}

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and hasattr(flowable, "_bookmark_key"):
            key = flowable._bookmark_key
            level = getattr(flowable, "_bookmark_level", 1)
            text = getattr(flowable, "_bookmark_text", flowable.getPlainText())
            page = self.page
            self.bookmark_page_map[key] = page
            self.notify("TOCEntry", (level, text, page, key))
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text[:120], key, level=level, closed=level > 0)


def add_heading(story, styles, text: str, level: int, key: str) -> None:
    style = styles[f"H{level}"]
    p = Paragraph(md_inline(text), style)
    p._bookmark_key = key
    p._bookmark_level = max(0, level - 1)
    plain = re.sub(r"<[^>]+>", "", md_inline(text))
    plain = (
        plain.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
    )
    p._bookmark_text = plain
    story.append(p)


def jump_link(styles) -> Paragraph:
    return Paragraph(
        '<a href="#contents" color="#0072B2"><u>↑ Jump to Contents</u></a>',
        styles["Jump"],
    )


def parse_md(text: str) -> dict:
    """Light structure extract for known guide shape."""
    scenarios = []
    # Scenario headings
    for m in re.finditer(
        r'^### (S(\d+) — .+? `\[([^\]]+)\]`)\s*\n\n(.*?)(?=^### S\d+ — |^## |\Z)',
        text,
        re.M | re.S,
    ):
        full_title = m.group(1).strip()
        num = int(m.group(2))
        tag = m.group(3)
        body = m.group(4).strip()
        one_liner = ""
        sections: dict[str, str] = {}
        # one-liner before first ####
        pre, *rest = re.split(r"^#### ", body, maxsplit=1, flags=re.M)
        one_liner = pre.strip().split("\n")[0].strip() if pre.strip() else ""
        if rest:
            body2 = "#### " + rest[0]
        else:
            body2 = body
        for sm in re.finditer(
            r"^#### ([^\n]+)\n(.*?)(?=^#### |\Z)",
            body2,
            re.M | re.S,
        ):
            sections[sm.group(1).strip()] = sm.group(2).strip()
        # strip trailing jump link from last section
        for k, v in list(sections.items()):
            sections[k] = re.sub(r"\n*\[↑ Contents\]\(#contents\)\s*$", "", v).strip()
            sections[k] = re.sub(r"\n*\[↑ Contents\]\(#contents\)\s*", "\n", sections[k]).strip()
        scenarios.append(
            {
                "id": f"s{num:02d}" if False else f"s{num}",
                "num": num,
                "title": full_title,
                "tag": f"[{tag}]",
                "one_liner": one_liner,
                "sections": sections,
            }
        )

    # fix ids to s01 style from heading
    for sc in scenarios:
        sc["id"] = f"s{sc['num']:02d}" if sc["num"] < 10 else f"s{sc['num']}"
        # markdown uses s01, s02 without zero for 1-9? Check: <a id="s01">
        sc["id"] = f"s{sc['num']:02d}" if sc["num"] < 100 else f"s{sc['num']}"

    # Actually MD uses s01, s02, ... s09, s10 — zero padded for 1-9
    for sc in scenarios:
        sc["id"] = f"s{sc['num']:02d}"

    index_rows = []
    table_block = re.search(
        r"## Scenario index\n\n\|[^\n]+\n\|[^\n]+\n((?:\|[^\n]+\n)+)",
        text,
    )
    if table_block:
        for line in table_block.group(1).strip().splitlines():
            cols = [c.strip() for c in line.strip("|").split("|")]
            if len(cols) >= 4:
                id_cell = cols[0]
                m = re.search(r"\[(S\d+)\]\(#(s\d+)\)", id_cell)
                sid = m.group(2) if m else cols[0]
                label = m.group(1) if m else cols[0]
                index_rows.append(
                    {
                        "label": label,
                        "id": sid,
                        "area": cols[1],
                        "title": cols[2],
                        "tag": cols[3].strip("`"),
                    }
                )

    how = re.search(
        r"## How to use this guide\n\n(.*?)\n\n\[↑ Contents\]",
        text,
        re.S,
    )
    legend = re.search(
        r"## Legend & fill-in checklist\n\n(.*?)\n\n\[↑ Contents\]",
        text,
        re.S,
    )
    status_block = re.search(
        r"\*\*Status:\*\*(.*?)\n\n\*\*Capability tags\*\*",
        text,
        re.S,
    )
    tags_table = re.search(
        r"\*\*Capability tags\*\*\n\n\|[^\n]+\n\|[^\n]+\n((?:\|[^\n]+\n)+)",
        text,
    )
    section_f_intro = re.search(
        r"## F — Transform existing music \(MORPH M1 / M2 / M3\)\n\n(.*?)\n\n\[↑ Contents\]",
        text,
        re.S,
    )

    goal_sections = []
    for m in re.finditer(
        r'^## ([A-L] — [^\n]+)\n\n(?:(.*?)\n\n)?(?=^### S|^## |\Z)',
        text,
        re.M | re.S,
    ):
        title = m.group(1)
        intro = (m.group(2) or "").strip()
        intro = re.sub(r"\[↑ Contents\]\(#contents\)", "", intro).strip()
        # skip if intro is mostly scenarios - handled separately
        if intro.startswith("### S"):
            intro = ""
        goal_sections.append({"title": title, "intro": intro, "key": slug(title)})

    return {
        "how": how.group(1).strip() if how else "",
        "legend": legend.group(1).strip() if legend else "",
        "status": status_block.group(1).strip() if status_block else "",
        "tags_table": tags_table.group(1).strip() if tags_table else "",
        "section_f_intro": section_f_intro.group(1).strip() if section_f_intro else "",
        "scenarios": scenarios,
        "index_rows": index_rows,
        "goal_sections": goal_sections,
    }


def slug(title: str) -> str:
    s = title.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def build_styles():
    ss = getSampleStyleSheet()
    styles = {
        "Title": ParagraphStyle(
            "Title",
            fontName="SourceSans-Bold",
            fontSize=22,
            leading=26,
            textColor=INK,
            spaceAfter=8,
            alignment=TA_LEFT,
        ),
        "Subtitle": ParagraphStyle(
            "Subtitle",
            fontName="SourceSerif",
            fontSize=10.5,
            leading=14,
            textColor=MUTED,
            spaceAfter=4,
        ),
        "H1": ParagraphStyle(
            "H1",
            fontName="SourceSans-Bold",
            fontSize=16,
            leading=20,
            textColor=INK,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "H2": ParagraphStyle(
            "H2",
            fontName="SourceSans-Bold",
            fontSize=13,
            leading=16,
            textColor=INK,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "H3": ParagraphStyle(
            "H3",
            fontName="SourceSans-Bold",
            fontSize=11,
            leading=14,
            textColor=INK,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "Body": ParagraphStyle(
            "Body",
            fontName="SourceSerif",
            fontSize=10,
            leading=13.5,
            textColor=INK,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
        ),
        "BodyLeft": ParagraphStyle(
            "BodyLeft",
            fontName="SourceSerif",
            fontSize=10,
            leading=13.5,
            textColor=INK,
            spaceAfter=5,
            alignment=TA_LEFT,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            fontName="SourceSerif",
            fontSize=10,
            leading=13.5,
            textColor=INK,
            leftIndent=12,
            spaceAfter=3,
        ),
        "Jump": ParagraphStyle(
            "Jump",
            fontName="SourceSans",
            fontSize=8.5,
            leading=11,
            textColor=ACCENT,
            spaceBefore=4,
            spaceAfter=10,
            alignment=TA_RIGHT,
        ),
        "Footer": ParagraphStyle(
            "Footer",
            fontName="SourceSans",
            fontSize=8,
            leading=10,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "IndexCell": ParagraphStyle(
            "IndexCell",
            fontName="SourceSans",
            fontSize=8,
            leading=10,
            textColor=INK,
        ),
        "IndexCellBold": ParagraphStyle(
            "IndexCellBold",
            fontName="SourceSans-Bold",
            fontSize=8,
            leading=10,
            textColor=INK,
        ),
        "Tag": ParagraphStyle(
            "Tag",
            fontName="SourceSans-Bold",
            fontSize=8,
            leading=10,
            textColor=MUTED,
        ),
        "OutlineNote": ParagraphStyle(
            "OutlineNote",
            fontName="SourceSans-It",
            fontSize=9.5,
            leading=12,
            textColor=TAG_OUTLINE,
            spaceAfter=4,
        ),
        "SectionLabel": ParagraphStyle(
            "SectionLabel",
            fontName="SourceSans-Bold",
            fontSize=9,
            leading=11,
            textColor=ACCENT,
            spaceBefore=6,
            spaceAfter=2,
        ),
        "Small": ParagraphStyle(
            "Small",
            fontName="SourceSans",
            fontSize=8.5,
            leading=11,
            textColor=MUTED,
            spaceAfter=3,
        ),
    }
    return styles


def paras_from_block(block: str, styles) -> list:
    out = []
    if not block:
        return out
    if block.strip() == "OUTLINE":
        out.append(Paragraph("OUTLINE", styles["OutlineNote"]))
        return out
    lines = block.splitlines()
    buf: list[str] = []
    list_mode = None

    def flush_buf():
        nonlocal buf
        if buf:
            out.append(Paragraph(md_inline(" ".join(buf)), styles["Body"]))
            buf = []

    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            flush_buf()
            list_mode = None
            continue
        if line.strip() == "OUTLINE":
            flush_buf()
            out.append(Paragraph("OUTLINE", styles["OutlineNote"]))
            continue
        m_num = re.match(r"^(\d+)\.\s+(.*)$", line.strip())
        m_bul = re.match(r"^[-*]\s+(.*)$", line.strip())
        if m_num:
            flush_buf()
            out.append(
                Paragraph(f"{m_num.group(1)}. {md_inline(m_num.group(2))}", styles["Bullet"])
            )
            list_mode = "num"
        elif m_bul:
            flush_buf()
            out.append(Paragraph(f"• {md_inline(m_bul.group(1))}", styles["Bullet"]))
            list_mode = "bul"
        elif line.startswith("|"):
            flush_buf()
            # skip markdown tables in body for simplicity — rare outside front matter
            continue
        else:
            buf.append(line.strip())
    flush_buf()
    return out


def footer_header(canvas, doc):
    canvas.saveState()
    page_w, page_h = A4
    # header jump link (foreground annotation)
    canvas.setFont("SourceSans", 8)
    canvas.setFillColor(ACCENT)
    link_rect = (page_w - 55 * mm, page_h - 12 * mm, page_w - 18 * mm, page_h - 7 * mm)
    canvas.linkRect("Jump to Contents", "contents", link_rect, relative=0, thickness=0)
    canvas.drawRightString(page_w - 18 * mm, page_h - 10.5 * mm, "↑ Contents")
    # footer
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.4)
    canvas.line(18 * mm, 12 * mm, page_w - 18 * mm, 12 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("SourceSans", 8)
    canvas.drawString(18 * mm, 8 * mm, "Composer OS V4.0 — Musician's Guide")
    canvas.drawRightString(page_w - 18 * mm, 8 * mm, f"{doc.page}")
    canvas.restoreState()


def build() -> None:
    register_fonts()
    styles = build_styles()
    data = parse_md(MD_PATH.read_text(encoding="utf-8"))

    doc = GuideDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Composer OS V4.0 — Musician's Guide",
        author="Composer OS",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="normal",
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=footer_header)])

    story: list = []

    # Cover / title
    add_heading(story, styles, "Composer OS V4.0 — Musician's Guide", 1, "title")
    # Force bookmark level 0 for title
    story[-1]._bookmark_level = 0

    for line in [
        "**Status:** structure + S30 (M1) verified fill; other scenarios OUTLINE. No invented examples.",
        "**Source:** `docs/manuals/COMPOSER-OS-V4-MUSICIANS-GUIDE.md`",
        "**M1 reference:** `docs/manuals/MORPH-M1-USER-MANUAL-V1.0.md`",
        "**Checkpoint:** `a4749fcb`",
        "**Audience:** musicians using Composer OS for practical musical goals.",
    ]:
        story.append(Paragraph(md_inline(line), styles["Subtitle"]))

    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            md_inline(
                "Jump by musical goal, not by engine name. Prefer MusicXML + host notation for final judgment; "
                "in-app preview is a pitch/timing sanity check only."
            ),
            styles["Body"],
        )
    )

    # Capability tags
    add_heading(story, styles, "Capability tags", 2, "capability-tags")
    tag_rows = [
        [
            Paragraph("<b>Tag</b>", styles["IndexCellBold"]),
            Paragraph("<b>Meaning</b>", styles["IndexCellBold"]),
        ]
    ]
    for line in data["tags_table"].splitlines():
        cols = [c.strip().strip("`") for c in line.strip("|").split("|")]
        if len(cols) >= 2:
            tag_rows.append(
                [
                    Paragraph(esc(cols[0]), styles["IndexCellBold"]),
                    Paragraph(esc(cols[1]), styles["IndexCell"]),
                ]
            )
    t = Table(tag_rows, colWidths=[38 * mm, 120 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TINT),
                ("GRID", (0, 0), (-1, -1), 0.3, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 8))

    # Contents
    add_heading(story, styles, "Contents", 1, "contents")
    story[-1]._bookmark_level = 0
    toc_items = [
        ("How to use this guide", "how-to-use-this-guide"),
        ("Scenario index (all)", "scenario-index"),
        ("A — Melodic writing & identity", "a-melodic-writing-identity"),
        ("B — Harmony language & reharmonisation", "b-harmony-language-reharmonisation"),
        ("C — Rhythm, groove & metre", "c-rhythm-groove-metre"),
        ("D — Counterpoint & independent lines", "d-counterpoint-independent-lines"),
        ("E — Orchestration & ensemble colour", "e-orchestration-ensemble-colour"),
        ("F — Transform existing music (MORPH M1 / M2 / M3)", "f-transform-existing-music-morph"),
        ("G — Form, length & structural shape", "g-form-length-structural-shape"),
        ("H — Practice & study material", "h-practice-study-material"),
        ("I — Audition, preview & listening", "i-audition-preview-listening"),
        ("J — Notation handoff (MusicXML & hosts)", "j-notation-handoff-musicxml-hosts"),
        ("K — Evaluation & musical critique", "k-evaluation-musical-critique"),
        ("L — Starting from charts & imports", "l-starting-from-charts-imports"),
        ("Legend & fill-in checklist", "legend-fill-in-checklist"),
    ]
    for i, (label, key) in enumerate(toc_items, 1):
        story.append(
            Paragraph(
                f'{i}. <a href="#{key}" color="#0072B2"><u>{esc(label)}</u></a>',
                styles["BodyLeft"],
            )
        )
    story.append(jump_link(styles))

    # How to use
    add_heading(story, styles, "How to use this guide", 1, "how-to-use-this-guide")
    story[-1]._bookmark_level = 0
    for p in paras_from_block(data["how"], styles):
        story.append(p)
    story.append(jump_link(styles))

    # Scenario index
    add_heading(story, styles, "Scenario index", 1, "scenario-index")
    story[-1]._bookmark_level = 0
    story.append(
        Paragraph(
            md_inline(f"**Scenario count: {len(data['index_rows'])}**"),
            styles["BodyLeft"],
        )
    )

    header = [
        Paragraph("<b>ID</b>", styles["IndexCellBold"]),
        Paragraph("<b>Goal</b>", styles["IndexCellBold"]),
        Paragraph("<b>Title</b>", styles["IndexCellBold"]),
        Paragraph("<b>Tag</b>", styles["IndexCellBold"]),
    ]
    rows = [header]
    for r in data["index_rows"]:
        rows.append(
            [
                Paragraph(
                    f'<a href="#{r["id"]}" color="#0072B2"><u>{esc(r["label"])}</u></a>',
                    styles["IndexCellBold"],
                ),
                Paragraph(esc(r["area"]), styles["IndexCell"]),
                Paragraph(esc(r["title"]), styles["IndexCell"]),
                Paragraph(esc(r["tag"]), styles["IndexCell"]),
            ]
        )
    idx = Table(rows, colWidths=[14 * mm, 28 * mm, 95 * mm, 28 * mm], repeatRows=1)
    idx.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TINT),
                ("GRID", (0, 0), (-1, -1), 0.25, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, HexColor("#FAFBFC")]),
            ]
        )
    )
    story.append(idx)
    story.append(jump_link(styles))
    story.append(PageBreak())

    # Group scenarios by letter area from index
    area_to_letter = {
        "Melody": "A",
        "Harmony": "B",
        "Rhythm": "C",
        "Counterpoint": "D",
        "Orchestration": "E",
        "MORPH": "F",
        "Form": "G",
        "Practice": "H",
        "Preview": "I",
        "Export": "J",
        "Evaluation": "K",
        "Import": "L",
        "Workflow": "L",
    }
    goal_meta = {
        "A": ("A — Melodic writing & identity", "a-melodic-writing-identity"),
        "B": ("B — Harmony language & reharmonisation", "b-harmony-language-reharmonisation"),
        "C": ("C — Rhythm, groove & metre", "c-rhythm-groove-metre"),
        "D": ("D — Counterpoint & independent lines", "d-counterpoint-independent-lines"),
        "E": ("E — Orchestration & ensemble colour", "e-orchestration-ensemble-colour"),
        "F": (
            "F — Transform existing music (MORPH M1 / M2 / M3)",
            "f-transform-existing-music-morph",
        ),
        "G": ("G — Form, length & structural shape", "g-form-length-structural-shape"),
        "H": ("H — Practice & study material", "h-practice-study-material"),
        "I": ("I — Audition, preview & listening", "i-audition-preview-listening"),
        "J": ("J — Notation handoff (MusicXML & hosts)", "j-notation-handoff-musicxml-hosts"),
        "K": ("K — Evaluation & musical critique", "k-evaluation-musical-critique"),
        "L": ("L — Starting from charts & imports", "l-starting-from-charts-imports"),
    }

    # map scenario num -> area letter via index
    num_to_area = {}
    for r in data["index_rows"]:
        m = re.match(r"S(\d+)", r["label"])
        if m:
            num_to_area[int(m.group(1))] = area_to_letter.get(r["area"], "L")

    current_letter = None
    section_order = ["Objective", "Starting material", "GUI steps", "Musical outcome", "Notation example", "Troubleshooting"]

    for sc in sorted(data["scenarios"], key=lambda x: x["num"]):
        letter = num_to_area.get(sc["num"], "L")
        if letter != current_letter:
            current_letter = letter
            title, key = goal_meta[letter]
            add_heading(story, styles, title, 1, key)
            story[-1]._bookmark_level = 0
            if letter == "F" and data["section_f_intro"]:
                for p in paras_from_block(data["section_f_intro"], styles):
                    story.append(p)
            story.append(jump_link(styles))

        # Scenario heading — preserve title + status tag
        add_heading(story, styles, sc["title"], 2, sc["id"])
        if sc["one_liner"]:
            story.append(Paragraph(md_inline(sc["one_liner"]), styles["Body"]))

        filled = False
        for sec in section_order:
            body = sc["sections"].get(sec, "OUTLINE")
            story.append(Paragraph(esc(sec), styles["SectionLabel"]))
            for p in paras_from_block(body, styles):
                story.append(p)
            if body.strip() and body.strip() != "OUTLINE":
                filled = True
        if not filled and sc["num"] != 30:
            story.append(
                Paragraph(
                    "Status: OUTLINE — reserved sections not yet musician-verified.",
                    styles["OutlineNote"],
                )
            )
        story.append(jump_link(styles))

    # Legend
    add_heading(story, styles, "Legend & fill-in checklist", 1, "legend-fill-in-checklist")
    story[-1]._bookmark_level = 0
    for p in paras_from_block(data["legend"], styles):
        story.append(p)
    story.append(jump_link(styles))

    doc.build(story)
    print(f"Wrote {PDF_PATH}")


if __name__ == "__main__":
    build()
