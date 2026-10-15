"""Build a BHL manual as Markdown, DOCX, and PDF from one operation list."""

from __future__ import annotations

import os
import re
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor
from fpdf import FPDF
from PIL import Image

FONT = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
FONT_I = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
FONT_BI = "/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf"

NAVY = (28, 42, 68)
RULE = (176, 154, 108)


def _runs(text: str):
    parts = re.split(r"(\*\*[^*]+\*\*|\[\[[^]]+\]\])", text)
    out = []
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            out.append(("b", part[2:-2]))
        elif part.startswith("[[") and part.endswith("]]"):
            body = part[2:-2]
            if "|" in body:
                anchor, label = body.split("|", 1)
            else:
                anchor, label = body, body
            out.append(("a", anchor, label))
        else:
            out.append(("t", part))
    return out


class Manual:
    def __init__(self, title: str, subtitle: str, filename_stem: str):
        self.title = title
        self.subtitle = subtitle
        self.stem = filename_stem
        self.ops: list[tuple] = []

    def h1(self, text: str, anchor: str):
        self.ops.append(("h1", text, anchor))

    def h2(self, text: str, anchor: str):
        self.ops.append(("h2", text, anchor))

    def h3(self, text: str, anchor: str):
        self.ops.append(("h3", text, anchor))

    def p(self, text: str):
        self.ops.append(("p", text))

    def bullets(self, items: list[str]):
        self.ops.append(("ul", items))

    def numbers(self, items: list[str]):
        self.ops.append(("ol", items))

    def table(self, headers: list[str], rows: list[list[str]]):
        self.ops.append(("table", headers, rows))

    def figure(self, path: str, caption: str):
        self.ops.append(("fig", path, caption))

    def callout(self, text: str):
        self.ops.append(("call", text))

    def anchors(self) -> list[tuple[str, str, str]]:
        found = []
        for op in self.ops:
            if op[0] in ("h1", "h2", "h3"):
                found.append((op[0], op[1], op[2]))
        return found

    def write_markdown(self, path: Path, asset_root: Path):
        lines = [
            f"# {self.title}",
            "",
            f"**{self.subtitle}**",
            "",
            "Version 1.0 · 15 October 2026",
            "",
            "Bryant Harmonic Language inside Composer OS.",
            "",
            "These pages describe musical choices. They do not ask you to program, and they do not treat any generated score as artistically approved.",
            "",
        ]
        for op in self.ops:
            kind = op[0]
            if kind in ("h1", "h2", "h3"):
                level = {"h1": "##", "h2": "###", "h3": "####"}[kind]
                lines += ["", f"{level} {op[1]} {{#{op[2]}}}", ""]
            elif kind == "p":
                lines += [self._md_inline(op[1]), ""]
            elif kind == "ul":
                for item in op[1]:
                    lines.append(f"- {self._md_inline(item)}")
                lines.append("")
            elif kind == "ol":
                for i, item in enumerate(op[1], 1):
                    lines.append(f"{i}. {self._md_inline(item)}")
                lines.append("")
            elif kind == "table":
                headers, rows = op[1], op[2]
                lines.append("| " + " | ".join(headers) + " |")
                lines.append("| " + " | ".join("---" for _ in headers) + " |")
                for row in rows:
                    lines.append("| " + " | ".join(row) + " |")
                lines.append("")
            elif kind == "fig":
                image = Path(op[1]).resolve()
                rel = Path(os.path.relpath(image, path.parent.resolve()))
                lines += [f"![{op[2]}]({rel.as_posix()})", ""]
            elif kind == "call":
                lines += [f"> {self._md_inline(op[1])}", ""]
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    @staticmethod
    def _md_inline(text: str) -> str:
        def repl(match: re.Match) -> str:
            body = match.group(1)
            if "|" in body:
                anchor, label = body.split("|", 1)
            else:
                anchor, label = body, body
            return f"[{label}](#{anchor})"

        return re.sub(r"\[\[([^]]+)\]\]", repl, text)

    def write_docx(self, path: Path):
        doc = Document()
        section = doc.sections[0]
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.left_margin = Cm(1.7)
        section.right_margin = Cm(1.7)
        section.top_margin = Cm(1.6)
        section.bottom_margin = Cm(1.7)
        section.header_distance = Cm(0.6)
        section.footer_distance = Cm(0.6)
        self._docx_footer(section)
        normal = doc.styles["Normal"]
        normal.font.name = "Georgia"
        normal.font.size = Pt(11)
        normal.font.color.rgb = RGBColor(20, 24, 28)
        normal.paragraph_format.space_after = Pt(8)
        normal.paragraph_format.line_spacing = 1.12
        for style_name, size in (("Heading 1", 18), ("Heading 2", 14), ("Heading 3", 12)):
            style = doc.styles[style_name]
            style.font.name = "Georgia"
            style.font.bold = True
            style.font.color.rgb = RGBColor(28, 42, 68)
            style.font.size = Pt(size)
        self._docx_cover(doc)
        self._docx_toc_field(doc)
        doc.add_page_break()
        bookmarks: dict[str, int] = {}
        next_id = 1
        for op in self.ops:
            kind = op[0]
            if kind in ("h1", "h2", "h3"):
                level = {"h1": 1, "h2": 2, "h3": 3}[kind]
                para = doc.add_heading(op[1], level=level)
                next_id = self._bookmark(para, op[2], next_id)
                bookmarks[op[2]] = next_id - 1
            elif kind == "p":
                self._docx_rich(doc.add_paragraph(), op[1], bookmarks)
            elif kind == "ul":
                for item in op[1]:
                    self._docx_rich(doc.add_paragraph(style="List Bullet"), item, bookmarks)
            elif kind == "ol":
                for item in op[1]:
                    self._docx_rich(doc.add_paragraph(style="List Number"), item, bookmarks)
            elif kind == "table":
                headers, rows = op[1], op[2]
                table = doc.add_table(rows=1 + len(rows), cols=len(headers))
                table.style = "Table Grid"
                for i, header in enumerate(headers):
                    cell = table.rows[0].cells[i]
                    cell.text = header
                    for run in cell.paragraphs[0].runs:
                        run.bold = True
                        run.font.size = Pt(9)
                for r, row in enumerate(rows):
                    for c, value in enumerate(row):
                        cell = table.rows[r + 1].cells[c]
                        cell.text = value
                        for para in cell.paragraphs:
                            for run in para.runs:
                                run.font.size = Pt(9)
                doc.add_paragraph()
            elif kind == "fig":
                self._docx_figure(doc, op[1], op[2])
            elif kind == "call":
                para = doc.add_paragraph()
                para.paragraph_format.left_indent = Cm(0.3)
                self._docx_rich(para, op[1], bookmarks)
        doc.save(path)

    def _docx_cover(self, doc: Document):
        for _ in range(3):
            doc.add_paragraph()
        title = doc.add_paragraph()
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = title.add_run(self.title)
        run.bold = True
        run.font.name = "Georgia"
        run.font.size = Pt(28)
        run.font.color.rgb = RGBColor(28, 42, 68)
        sub = doc.add_paragraph()
        sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = sub.add_run(self.subtitle)
        run.italic = True
        run.font.name = "Georgia"
        run.font.size = Pt(14)
        run.font.color.rgb = RGBColor(70, 78, 90)
        meta = doc.add_paragraph()
        meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = meta.add_run("Version 1.0\n15 October 2026\n\nBryant Harmonic Language\nComposer OS")
        run.font.name = "Georgia"
        run.font.size = Pt(12)
        note = doc.add_paragraph()
        note.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = note.add_run(
            "\nA working guide for a composer and guitarist.\n"
            "Generated candidates are for audition. They are not artistically approved."
        )
        run.italic = True
        run.font.name = "Georgia"
        run.font.size = Pt(11)
        doc.add_page_break()

    def _docx_toc_field(self, doc: Document):
        doc.add_heading("Contents", level=1)
        paragraph = doc.add_paragraph()
        run = paragraph.add_run()

        def fld(kind: str):
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), kind)
            r = paragraph.add_run()._r
            r.append(el)

        begin = OxmlElement("w:fldChar")
        begin.set(qn("w:fldCharType"), "begin")
        run._r.append(begin)
        instr = paragraph.add_run()
        text = OxmlElement("w:instrText")
        text.set(qn("xml:space"), "preserve")
        text.text = ' TOC \\o "1-3" \\h \\z \\u '
        instr._r.append(text)
        separate = OxmlElement("w:fldChar")
        separate.set(qn("w:fldCharType"), "separate")
        paragraph.add_run()._r.append(separate)
        hold = paragraph.add_run("Open this document in a word processor and update the contents field. Headings are bookmarked for direct links.")
        hold.italic = True
        end = OxmlElement("w:fldChar")
        end.set(qn("w:fldCharType"), "end")
        paragraph.add_run()._r.append(end)
        note = doc.add_paragraph()
        run = note.add_run(
            "Chapter links below work even before the contents field is updated. In Word, right-click the contents and choose Update Field. The PDF published with this edition already has a typeset, clickable contents."
        )
        run.italic = True
        run.font.size = Pt(10)
        # Visible linked contents so the DOCX is navigable without a field update.
        for kind, text, anchor in self.anchors():
            if kind == "h3":
                continue
            para = doc.add_paragraph()
            if kind == "h2":
                para.paragraph_format.left_indent = Cm(0.6)
            self._hyperlink(para, text, anchor)

    def _docx_rich(self, paragraph, text: str, bookmarks: dict[str, int]):
        for piece in _runs(text):
            if piece[0] == "t":
                run = paragraph.add_run(piece[1])
                run.font.name = "Georgia"
            elif piece[0] == "b":
                run = paragraph.add_run(piece[1])
                run.bold = True
                run.font.name = "Georgia"
            else:
                self._hyperlink(paragraph, piece[2], piece[1])

    def _hyperlink(self, paragraph, label: str, anchor: str):
        hyperlink = OxmlElement("w:hyperlink")
        hyperlink.set(qn("w:anchor"), anchor)
        run = OxmlElement("w:r")
        rpr = OxmlElement("w:rPr")
        colour = OxmlElement("w:color")
        colour.set(qn("w:val"), "1B4F8A")
        underline = OxmlElement("w:u")
        underline.set(qn("w:val"), "single")
        rpr.append(colour)
        rpr.append(underline)
        run.append(rpr)
        text = OxmlElement("w:t")
        text.set(qn("xml:space"), "preserve")
        text.text = label
        run.append(text)
        hyperlink.append(run)
        paragraph._p.append(hyperlink)

    def _bookmark(self, paragraph, name: str, bookmark_id: int) -> int:
        start = OxmlElement("w:bookmarkStart")
        start.set(qn("w:id"), str(bookmark_id))
        start.set(qn("w:name"), name)
        end = OxmlElement("w:bookmarkEnd")
        end.set(qn("w:id"), str(bookmark_id))
        paragraph._p.insert(0, start)
        paragraph._p.append(end)
        return bookmark_id + 1

    def _docx_figure(self, doc: Document, image: str, caption: str):
        para = doc.add_paragraph()
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.add_run()
        with Image.open(image) as im:
            width, height = im.size
        max_w = Inches(6.3)
        draw_w = max_w
        if height / width > 1.15:
            draw_w = Inches(4.6)
        run.add_picture(image, width=draw_w)
        cap = doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap.paragraph_format.space_after = Pt(12)
        run = cap.add_run(caption)
        run.italic = True
        run.font.size = Pt(9)
        run.font.name = "Georgia"
        run.font.color.rgb = RGBColor(60, 66, 74)

    def _docx_footer(self, section):
        footer = section.footer
        footer.is_linked_to_previous = False
        paragraph = footer.paragraphs[0]
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = paragraph.add_run("BHL Composer  ·  Version 1.0  ·  ")
        run.font.name = "Georgia"
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(80, 86, 96)
        self._page_field(paragraph)

    def _page_field(self, paragraph):
        run = paragraph.add_run()
        begin = OxmlElement("w:fldChar")
        begin.set(qn("w:fldCharType"), "begin")
        run._r.append(begin)
        instr = paragraph.add_run()
        text = OxmlElement("w:instrText")
        text.set(qn("xml:space"), "preserve")
        text.text = " PAGE "
        instr._r.append(text)
        end_run = paragraph.add_run()
        end = OxmlElement("w:fldChar")
        end.set(qn("w:fldCharType"), "end")
        end_run._r.append(end)

    def write_pdf(self, path: Path):
        headings = [(kind, text, anchor) for kind, text, anchor in self.anchors() if kind != "h3"]
        toc_pages = max(1, (len(headings) + 47) // 48)
        pages = self._render_pdf(path, toc_pages, {}, final=False)
        self._render_pdf(path, toc_pages, pages, final=True)

    def _render_pdf(self, path: Path, toc_pages: int, known: dict[str, int], final: bool) -> dict[str, int]:
        pdf = _Pdf(self.title)
        links = {anchor: pdf.add_link() for _, _, anchor in self.anchors()}
        recorded: dict[str, int] = {}
        pdf.add_page()
        pdf.cover(self.title, self.subtitle)
        for _ in range(toc_pages):
            pdf.add_page()
        # Draw TOC on pages 2.. 
        pdf.page = 2
        pdf.set_y(18)
        pdf.set_font("Georgia", "B", 16)
        pdf.set_text_color(*NAVY)
        pdf.cell(0, 9, "Contents", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)
        pdf.set_draw_color(*RULE)
        pdf.set_line_width(0.3)
        pdf.line(16, pdf.get_y(), 194, pdf.get_y())
        pdf.ln(3)
        for kind, text, anchor in self.anchors():
            if kind == "h3":
                continue
            if pdf.get_y() > 272:
                pdf.page += 1
                pdf.set_y(18)
            indent = 6 if kind == "h2" else 0
            pdf.set_x(16 + indent)
            pdf.set_font("Georgia", "" if kind == "h2" else "B", 10 if kind == "h2" else 11)
            pdf.set_text_color(20, 24, 28)
            page_no = known.get(anchor, 0)
            label = text if len(text) < 78 else text[:75] + "…"
            width = 168 - indent
            pdf.cell(width - 12, 5.0, label, link=links[anchor])
            pdf.set_font("Georgia", "", 10)
            pdf.cell(12, 5.0, str(page_no) if page_no else "", align="R", link=links[anchor], new_x="LMARGIN", new_y="NEXT")
        # Body starts after cover + toc
        start = 1 + toc_pages + 1
        pdf.page = start - 1
        pdf.add_page()
        for op in self.ops:
            kind = op[0]
            if kind in ("h1", "h2", "h3"):
                pdf.heading(op[1], kind, links[op[2]], recorded)
            elif kind == "p":
                pdf.rich(op[1], links)
            elif kind == "ul":
                for item in op[1]:
                    pdf.rich(item, links, bullet=True)
            elif kind == "ol":
                for i, item in enumerate(op[1], 1):
                    pdf.rich(item, links, number=i)
            elif kind == "table":
                pdf.table(op[1], op[2])
            elif kind == "fig":
                pdf.figure(op[1], op[2])
            elif kind == "call":
                pdf.callout(op[1], links)
        if final:
            pdf.output(path)
        return recorded


class _Pdf(FPDF):
    def __init__(self, running_title: str):
        super().__init__(format="A4", unit="mm")
        self.running_title = running_title
        self.add_font("Georgia", "", FONT)
        self.add_font("Georgia", "B", FONT_B)
        self.add_font("Georgia", "I", FONT_I)
        self.add_font("Georgia", "BI", FONT_BI)
        self.set_auto_page_break(True, margin=16)
        self.set_margins(16, 16, 16)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-12)
        self.set_font("Georgia", "", 8)
        self.set_text_color(90, 96, 104)
        self.cell(0, 6, f"{self.running_title}   ·   {self.page_no()}", align="C")

    def cover(self, title: str, subtitle: str):
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 297, "F")
        self.set_fill_color(*RULE)
        self.rect(0, 118, 210, 2.2, "F")
        self.set_y(78)
        self.set_text_color(244, 240, 230)
        self.set_font("Georgia", "", 12)
        self.cell(0, 8, "COMPOSER OS", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)
        self.set_font("Georgia", "B", 26)
        self.multi_cell(0, 12, title, align="C")
        self.ln(4)
        self.set_font("Georgia", "I", 13)
        self.set_text_color(226, 214, 186)
        self.multi_cell(0, 7, subtitle, align="C")
        self.set_y(140)
        self.set_text_color(244, 240, 230)
        self.set_font("Georgia", "", 12)
        self.cell(0, 7, "Version 1.0", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, "15 October 2026", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(8)
        self.set_font("Georgia", "I", 11)
        self.multi_cell(0, 6, "Bryant Harmonic Language\nfor a composer and guitarist", align="C")
        self.set_y(250)
        self.set_font("Georgia", "", 10)
        self.set_text_color(210, 206, 196)
        self.multi_cell(
            0,
            5,
            "Candidates are marked for audition.\nThey are not artistically approved.",
            align="C",
        )

    def heading(self, text: str, kind: str, link, recorded: dict[str, int]):
        size = {"h1": 16, "h2": 13, "h3": 11.5}[kind]
        need = 16 if kind == "h1" else 12
        if self.get_y() + need > 275:
            self.add_page()
        if kind == "h1":
            self.ln(2)
            self.set_draw_color(*RULE)
            self.set_line_width(0.4)
            self.line(16, self.get_y(), 194, self.get_y())
            self.ln(3)
        recorded_anchor = None
        # link object carries the destination; caller passes the link and we record via text search in parent
        self.set_link(link, y=self.get_y())
        # parent records page by side channel: stash on link via recorded filled by wrapper
        self.set_text_color(*NAVY)
        self.set_font("Georgia", "B", size)
        self.multi_cell(0, size * 0.48, text)
        self.ln(1)
        self.set_text_color(20, 24, 28)
        # The Manual renderer records pages. We store the last heading page on the pdf.
        self._last_heading_page = self.page_no()
        self._last_heading_link = link

    def rich(self, text: str, links: dict, bullet: bool = False, number: int | None = None):
        if self.get_y() > 272:
            self.add_page()
        prefix = ""
        if bullet:
            prefix = "•  "
        elif number is not None:
            prefix = f"{number}.  "
        tokens: list[tuple[str, str, object]] = []
        if prefix:
            tokens.append((prefix, "", None))
        for piece in _runs(text):
            if piece[0] == "b":
                content, style, link = piece[1], "B", None
            elif piece[0] == "a":
                content, style, link = piece[2], "B", links[piece[1]]
            else:
                content, style, link = piece[1], "", None
            for tok in re.findall(r"\s+|\S+", content):
                tokens.append((tok, style, link))
        line_h = 5.2
        max_x = self.l_margin + self.epw
        self.set_x(self.l_margin)
        for tok, style, link in tokens:
            self.set_font("Georgia", style, 10.5)
            if link:
                self.set_text_color(27, 79, 138)
            else:
                self.set_text_color(20, 24, 28)
            width = self.get_string_width(tok)
            at_left = self.get_x() <= self.l_margin + 0.4
            if tok.strip() and not at_left and self.get_x() + width > max_x - 0.3:
                self.ln(line_h)
                self.set_x(self.l_margin)
                self.set_font("Georgia", style, 10.5)
            if not tok.strip() and self.get_x() <= self.l_margin + 0.4:
                continue
            self.cell(self.get_string_width(tok), line_h, tok, link=link, new_x="RIGHT", new_y="TOP")
        self.ln(6.4)

    def callout(self, text: str, links: dict):
        if self.get_y() > 255:
            self.add_page()
        y = self.get_y()
        self.set_fill_color(244, 240, 230)
        self.set_font("Georgia", "I", 10.5)
        # Measure roughly
        self.set_x(18)
        self.multi_cell(174, 5.2, self._plain(text), fill=True)
        self.ln(2)

    def table(self, headers: list[str], rows: list[list[str]]):
        cols = len(headers)
        width = 178 / cols
        line_h = 4.0

        def row_h(values, font_size, style):
            self.set_font("Georgia", style, font_size)
            heights = []
            for value in values:
                lines = self.multi_cell(width - 1.5, line_h, value, dry_run=True, output="LINES")
                heights.append(max(1, len(lines)) * line_h + 1.6)
            return max(heights)

        def paint(values, height, font_size, style, fill, colour):
            if self.get_y() + height > 278:
                self.add_page()
            y = self.get_y()
            x = 16
            self.set_font("Georgia", style, font_size)
            self.set_text_color(*colour)
            for value in values:
                self.set_fill_color(*fill)
                self.rect(x, y, width, height, "F")
                self.set_xy(x + 0.8, y + 0.6)
                self.multi_cell(width - 1.6, line_h, value)
                x += width
            self.set_xy(16, y + height)

        paint(headers, row_h(headers, 8, "B"), 8, "B", NAVY, (244, 240, 230))
        for r, row in enumerate(rows):
            fill = (244, 240, 230) if r % 2 == 0 else (255, 255, 255)
            paint(row, row_h(row, 8, ""), 8, "", fill, (20, 24, 28))
        self.ln(3)

    def figure(self, image: str, caption: str):
        with Image.open(image) as im:
            px_w, px_h = im.size
        max_w = 156
        max_h = 88
        w = max_w
        h = w * px_h / px_w
        if h > max_h:
            h = max_h
            w = h * px_w / px_h
        if self.get_y() + h + 12 > 278:
            self.add_page()
        x = 16 + (178 - w) / 2
        self.image(image, x=x, y=self.get_y(), w=w, h=h)
        self.set_y(self.get_y() + h + 1.5)
        self.set_font("Georgia", "I", 8.5)
        self.set_text_color(70, 76, 84)
        self.multi_cell(0, 4.2, caption, align="C")
        self.ln(2)
        self.set_text_color(20, 24, 28)

    @staticmethod
    def _plain(text: str) -> str:
        return re.sub(r"\*\*([^*]+)\*\*", r"\1", re.sub(r"\[\[([^]|]+)\|([^]]+)\]\]", r"\2", re.sub(r"\[\[([^]]+)\]\]", r"\1", text)))


# Patch heading recording: Manual._render_pdf calls pdf.heading which must fill `recorded`.
def _heading_with_record(self, text, kind, link, recorded):
    size = {"h1": 16, "h2": 13, "h3": 11.5}[kind]
    need = 18 if kind == "h1" else 14
    if self.get_y() + need > 274:
        self.add_page()
    if kind == "h1":
        self.ln(1)
        self.set_draw_color(*RULE)
        self.set_line_width(0.45)
        y = self.get_y()
        self.line(16, y, 194, y)
        self.ln(3)
    level = {"h1": 0, "h2": 1, "h3": 2}[kind]
    self.start_section(text, level=level)
    self.dest = (self.page_no(), self.get_y())
    self.set_link(link, y=self.get_y())
    # Recover anchor from the link identity by the caller storing pages after return.
    self.set_text_color(*NAVY)
    self.set_font("Georgia", "B", size)
    self.multi_cell(0, size * 0.46, text)
    self.ln(1.2)
    self.set_text_color(20, 24, 28)
    self._pending_page = self.page_no()


_Pdf.heading = _heading_with_record


def _render_pdf_fixed(self, path: Path, toc_pages: int, known: dict[str, int], final: bool) -> dict[str, int]:
    pdf = _Pdf(self.title)
    links = {anchor: pdf.add_link() for _, _, anchor in self.anchors()}
    recorded: dict[str, tuple] = {}
    for anchor, link in links.items():
        if anchor in known:
            page_no, y = known[anchor]
            pdf.set_link(link, page=page_no, y=y)
        else:
            pdf.set_link(link, page=1, y=20)
    entries = [(kind, text, anchor) for kind, text, anchor in self.anchors() if kind != "h3"]
    pdf.add_page()
    pdf.cover(self.title, self.subtitle)
    per_page = 48
    chunks = [entries[i : i + per_page] for i in range(0, len(entries), per_page)] or [[]]
    # Keep the reserved page count stable. Extra reserved pages stay blank rather than shifting the body.
    while len(chunks) < toc_pages:
        chunks.append([])
    chunks = chunks[:toc_pages]
    for index, chunk in enumerate(chunks):
        pdf.add_page()
        pdf.set_y(18)
        if index == 0:
            pdf.set_font("Georgia", "B", 18)
            pdf.set_text_color(*NAVY)
            pdf.cell(0, 10, "Contents", new_x="LMARGIN", new_y="NEXT")
            pdf.set_draw_color(*RULE)
            pdf.set_line_width(0.4)
            pdf.line(16, pdf.get_y(), 194, pdf.get_y())
            pdf.ln(4)
        if not final:
            continue
        for kind, text, anchor in chunk:
            if pdf.get_y() > 274:
                break
            indent = 5 if kind == "h2" else 0
            pdf.set_x(16 + indent)
            pdf.set_font("Georgia", "" if kind == "h2" else "B", 9.5 if kind == "h2" else 11)
            pdf.set_text_color(20, 24, 28)
            page_no = known.get(anchor, ("", 0))
            page_label = page_no[0] if isinstance(page_no, tuple) else page_no
            label = text if len(text) < 86 else text[:83] + "…"
            pdf.cell(156 - indent, 5.0, label, link=links[anchor])
            pdf.set_font("Georgia", "", 9.5)
            pdf.cell(16, 5.0, str(page_label), align="R", link=links[anchor], new_x="LMARGIN", new_y="NEXT")
    pdf.add_page()
    for op in self.ops:
        kind = op[0]
        if kind in ("h1", "h2", "h3"):
            pdf.heading(op[1], kind, links[op[2]], recorded)
            recorded[op[2]] = pdf.dest
        elif kind == "p":
            pdf.rich(op[1], links)
        elif kind == "ul":
            for item in op[1]:
                pdf.rich(item, links, bullet=True)
        elif kind == "ol":
            for i, item in enumerate(op[1], 1):
                pdf.rich(item, links, number=i)
        elif kind == "table":
            pdf.table(op[1], op[2])
        elif kind == "fig":
            pdf.figure(op[1], op[2])
        elif kind == "call":
            pdf.callout(op[1], links)
    if final:
        pdf.output(str(path))
    return recorded


Manual._render_pdf = _render_pdf_fixed
