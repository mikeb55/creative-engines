/**
 * Builds docs/COMPOSER_OS_V16_NEW_FEATURES.docx from docs/COMPOSER_OS_V16_NEW_FEATURES.md
 * Run from repo root: node scripts/generateComposerOsV16NewFeaturesDocx.mjs
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
const mdPath = path.join(root, 'docs', 'COMPOSER_OS_V16_NEW_FEATURES.md');
const outPath = path.join(root, 'docs', 'COMPOSER_OS_V16_NEW_FEATURES.docx');

/** @param {string} text */
function inlineRuns(text) {
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let m;
  let last = 0;
  /** @type {InstanceType<typeof TextRun>[]} */
  const runs = [];
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index) }));
    }
    if (m[2] !== undefined) {
      runs.push(new TextRun({ text: m[2], bold: true }));
    } else if (m[3] !== undefined) {
      runs.push(new TextRun({ text: m[3], font: 'Consolas', size: 20 }));
    }
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
  const headerShading = { fill: 'E8EEF4' };

  return new Table({
    columnWidths: Array.from({ length: colCount }, () => Math.floor(9000 / colCount)),
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, rowIdx) =>
      new TableRow({
        children: cells.map((cellText) =>
          new TableCell({
            width: { size: pct, type: WidthType.PERCENTAGE },
            shading: rowIdx === 0 ? headerShading : undefined,
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
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 100, after: 60 },
          children: inlineRuns(line.slice(5).trim()),
        })
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      flushPara();
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 140, after: 80 },
          children: inlineRuns(line.slice(4).trim()),
        })
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      flushPara();
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 100 },
          children: [new TextRun(line.slice(3).trim())],
        })
      );
      i++;
      continue;
    }

    if (line.startsWith('# ') && !line.startsWith('##')) {
      flushPara();
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: line.slice(2).trim(), bold: true, size: 32 })],
        })
      );
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

    if (/^\d+\.\s/.test(line.trim())) {
      flushPara();
      const numberedText = line.trim().replace(/^\d+\.\s*/, '');
      out.push(
        new Paragraph({
          spacing: { after: 80 },
          indent: { left: 360, hanging: 260 },
          children: [...inlineRuns(numberedText)],
        })
      );
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

    if (line.trim().startsWith('```')) {
      flushPara();
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      const codeText = codeLines.join('\n');
      if (codeText.trim()) {
        out.push(
          new Paragraph({
            spacing: { after: 120 },
            shading: { fill: 'F5F5F5' },
            children: [new TextRun({ text: codeText, font: 'Consolas', size: 20 })],
          })
        );
      }
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

function extractIntroAndBody(mdFull) {
  const lines = mdFull.split(/\r?\n/);
  let bodyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      bodyStart = i;
      break;
    }
  }
  if (bodyStart < 0) {
    throw new Error('COMPOSER_OS_V16_NEW_FEATURES.md must contain at least one ## section');
  }
  const introLines = lines.slice(1, bodyStart).filter((l) => l.trim() !== '---' && l.trim() !== '');
  return {
    intro: introLines.join(' ').trim(),
    bodyMd: lines.slice(bodyStart).join('\n'),
  };
}

async function main() {
  const mdFull = fs.readFileSync(mdPath, 'utf8');
  const { intro, bodyMd } = extractIntroAndBody(mdFull);
  const bodyChildren = mdToChildren(bodyMd);

  const titleChildren = [
    new Paragraph({ spacing: { before: 2600, after: 300 } }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Composer OS v1.6',
          bold: true,
          size: 52,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: 'New Features Guide',
          italics: true,
          size: 30,
        }),
      ],
    }),
    ...(intro
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            indent: { left: 720, right: 720 },
            children: inlineRuns(intro),
          }),
        ]
      : []),
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
      headingStyleRange: '1-4',
    }),
  ];

  const doc = new Document({
    creator: 'Composer OS',
    title: 'Composer OS v1.6 — New Features',
    description: 'v1.6 MusicContext producer guide (generated from Markdown)',
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
        children: [
          ...titleChildren,
          ...tocChildren,
          new Paragraph({ children: [new PageBreak()] }),
          ...bodyChildren,
        ],
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
