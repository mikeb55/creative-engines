/**
 * Builds docs/COMPOSER_OS_BAND_GUIDE.docx from docs/COMPOSER_OS_BAND_GUIDE.md
 * Run from repo root: node scripts/generateComposerOsBandGuideDocx.mjs
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
const mdPath = path.join(root, 'docs', 'COMPOSER_OS_BAND_GUIDE.md');
const outPath = path.join(root, 'docs', 'COMPOSER_OS_BAND_GUIDE.docx');

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
  const twipsEach = Math.floor(9000 / colCount);

  return new Table({
    columnWidths: Array.from({ length: colCount }, () => twipsEach),
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (cells) =>
        new TableRow({
          children: cells.map(
            (cellText, ci) =>
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
 * @param {string} md
 * @returns {import('docx').FileChild[]}
 */
function mdToChildren(md) {
  const marker = '\n## 1. What is the SD3 Drum Guide?';
  const idx = md.indexOf(marker);
  const body = idx >= 0 ? md.slice(idx + 1) : md;
  const lines = body.split(/\r?\n/);

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
  const md = fs.readFileSync(mdPath, 'utf8');

  const titleChildren = [
    new Paragraph({ spacing: { before: 2800, after: 400 } }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Composer OS — Band Mode Guide',
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
          text: 'Guitar/Bass duo + drum guide',
          italics: true,
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: 'June 2026', size: 24 })],
    }),
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

  const bodyChildren = mdToChildren(md);

  const doc = new Document({
    creator: 'Composer OS',
    title: 'Composer OS — Band Mode Guide',
    description: 'Band mode user guide — Generate screen controls and workflows',
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
