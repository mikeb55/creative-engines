/**
 * Builds docs/COMPOSER_OS_PLAYBOOK.docx from docs/COMPOSER_OS_PLAYBOOK.md
 * Run from repo root: node scripts/generateComposerOsPlaybookDocx.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  TableOfContents,
  Footer,
  PageNumber,
  NumberFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mdPath = path.join(root, 'docs', 'COMPOSER_OS_PLAYBOOK.md');
const outPath = path.join(root, 'docs', 'COMPOSER_OS_PLAYBOOK.docx');

/** Body starts at first major workflow section (TOC / Word body); preamble is title + living-doc blockquote only. */
const BODY_MARKER = '\n## Real Book MusicXML import';

/** @param {string} text */
function inlineRuns(text) {
  const re = /\*\*(.+?)\*\*/g;
  let m;
  let last = 0;
  /** @type {InstanceType<typeof TextRun>[]} */
  const runs = [];
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index) }));
    }
    runs.push(new TextRun({ text: m[1], bold: true }));
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last) }));
  }
  return runs.length ? runs : [new TextRun({ text })];
}

/** Blockquote lines at top of MD (after title), rendered as highlighted italic. */
function livingDocParagraphsFromPreamble(preamble) {
  /** @type {InstanceType<typeof Paragraph>[]} */
  const out = [];
  const lines = preamble.split(/\r?\n/);
  let buf = [];
  const flush = () => {
    const t = buf.join(' ').trim();
    buf = [];
    if (!t) return;
    out.push(
      new Paragraph({
        spacing: { after: 120 },
        shading: { fill: 'FFF8E7' },
        children: [new TextRun({ text: t, italics: true, size: 22 })],
      })
    );
  };
  for (const line of lines) {
    const tr = line.trim();
    if (tr.startsWith('>')) {
      buf.push(tr.replace(/^>\s?/, '').trim());
    } else if (tr === '' && buf.length) {
      flush();
    }
  }
  flush();
  return out;
}

/** @param {string} line */
function isTableRow(line) {
  const t = line.trim();
  return t.startsWith('|') && t.includes('|', 1);
}

/** @param {string} rowLine */
function splitTableRow(rowLine) {
  const inner = rowLine.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((c) => c.trim());
}

/** @param {string[]} lines @param {number} startIdx */
function parseTable(lines, startIdx) {
  const rows = [];
  let i = startIdx;
  while (i < lines.length && isTableRow(lines[i])) {
    const cells = splitTableRow(lines[i]);
    const isSep = cells.every((c) => /^[-:]+$/.test(c.replace(/\s/g, '')));
    if (!isSep) {
      rows.push(cells);
    }
    i++;
  }
  return { rows, nextIdx: i };
}

/** @param {string[][]} rows */
function tableFromRows(rows) {
  if (rows.length === 0) return null;
  const colCount = Math.max(...rows.map((r) => r.length));
  const pct = Math.floor(9000 / colCount);

  return new Table({
    columnWidths: Array.from({ length: colCount }, () => Math.floor(9000 / colCount)),
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (cells) =>
        new TableRow({
          children: cells.map(
            (cellText) =>
              new TableCell({
                width: { size: pct, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    spacing: { after: 60 },
                    children: inlineRuns(cellText || ' '),
                  }),
                ],
              })
          ),
        })
    ),
  });
}

/**
 * @param {string} md — body only (from ## 1. onward)
 * @returns {import('docx').FileChild[]}
 */
function mdToChildren(md) {
  const lines = md.split(/\r?\n/);

  /** @type {import('docx').FileChild[]} */
  const out = [];
  let i = 0;
  let paraBuf = [];

  function flushPara() {
    const t = paraBuf.join(' ').trim();
    paraBuf = [];
    if (!t) return;
    if (t.startsWith('*') && t.endsWith('*') && t.length > 2 && !t.includes('**')) {
      out.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: t.slice(1, -1), italics: true, size: 20 })],
        })
      );
      return;
    }
    out.push(
      new Paragraph({
        spacing: { after: 160 },
        children: inlineRuns(t),
      })
    );
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('#### ')) {
      flushPara();
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 120, after: 80 },
          children: [new TextRun(line.slice(5).trim())],
        })
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      flushPara();
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 100 },
          children: [new TextRun(line.slice(4).trim())],
        })
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      flushPara();
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 120 },
          children: [new TextRun(line.slice(3).trim())],
        })
      );
      i++;
      continue;
    }

    if (line.startsWith('# ') && !line.startsWith('##')) {
      i++;
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      flushPara();
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, '').trim());
        i++;
      }
      const qt = quoteLines.join(' ');
      if (qt) {
        out.push(
          new Paragraph({
            spacing: { after: 160 },
            indent: { left: 360 },
            shading: { fill: 'F5F5F5' },
            children: [new TextRun({ text: qt, italics: true, size: 22 })],
          })
        );
      }
      continue;
    }

    if (isTableRow(line)) {
      flushPara();
      const { rows, nextIdx } = parseTable(lines, i);
      const tbl = tableFromRows(rows);
      if (tbl) out.push(tbl);
      out.push(new Paragraph({ spacing: { after: 160 } }));
      i = nextIdx;
      continue;
    }

    if (line.trim() === '---') {
      flushPara();
      i++;
      continue;
    }

    if (line.trim().startsWith('- ')) {
      flushPara();
      const bulletText = line.trim().slice(2).trim();
      out.push(
        new Paragraph({
          spacing: { after: 80 },
          indent: { left: 360, hanging: 260 },
          children: [new TextRun('• '), ...inlineRuns(bulletText)],
        })
      );
      i++;
      continue;
    }

    if (line.trim() === '') {
      flushPara();
      i++;
      continue;
    }

    paraBuf.push(line.trim());
    i++;
  }
  flushPara();
  return out;
}

async function main() {
  const mdFull = fs.readFileSync(mdPath, 'utf8');
  const ix = mdFull.indexOf(BODY_MARKER);
  if (ix < 0) {
    throw new Error(`COMPOSER_OS_PLAYBOOK.md must contain:${BODY_MARKER}`);
  }
  const preamble = mdFull.slice(0, ix);
  const bodyMd = mdFull.slice(ix + 1);

  const living = livingDocParagraphsFromPreamble(preamble);

  const titleChildren = [
    new Paragraph({ spacing: { before: 2800, after: 400 } }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Composer OS Playbook',
          bold: true,
          size: 52,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Creative Engines',
          italics: true,
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'User workflows, presets, and scenarios', size: 24 })],
    }),
    ...living,
    new Paragraph({ spacing: { after: 400 } }),
  ];

  const tocChildren = [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun('Table of Contents')],
    }),
    new Paragraph({ spacing: { after: 200 } }),
    new TableOfContents('Contents', {
      hyperlink: true,
      headingStyleRange: '1-3',
    }),
  ];

  const bodyChildren = mdToChildren(bodyMd);

  const doc = new Document({
    creator: 'Composer OS',
    title: 'Composer OS Playbook',
    description: 'Composer OS user playbook (generated from Markdown)',
    features: {
      updateFields: true,
    },
    sections: [
      {
        properties: {
          page: {
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                  }),
                ],
              }),
            ],
          }),
        },
        children: [...titleChildren, ...tocChildren, new Paragraph({ children: [new PageBreak()] }), ...bodyChildren],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
