/**
 * Builds docs/30_CREATIVE_ZAPPA_APPLICATIONS.docx from docs/30_CREATIVE_ZAPPA_APPLICATIONS.md
 * Run from repo root: node scripts/generate30CreativeZappaDocx.mjs
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
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mdPath = path.join(root, 'docs', '30_CREATIVE_ZAPPA_APPLICATIONS.md');
const outPath = path.join(root, 'docs', '30_CREATIVE_ZAPPA_APPLICATIONS.docx');

function stripMdBold(s) {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

/**
 * @returns {{ title: string, applications: { heading: string, description: string, features: string, status: string }[] }[]}
 */
function parseMd(md) {
  const categories = [];
  const catRe =
    /^## (Composition|Solo writing|Ensemble|Education)\s*$/gm;
  let m;
  const indices = [];
  while ((m = catRe.exec(md)) !== null) {
    indices.push({ name: m[1], start: m.index, endLabel: m[1] });
  }
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].start;
    const end = i + 1 < indices.length ? indices[i + 1].start : md.length;
    const block = md.slice(start, end);
    const body = block.replace(/^## [^\n]+\n/, '');
    const apps = [];
    const parts = body.split(/(?=^### )/m).filter((p) => p.trim().startsWith('###'));
    for (const part of parts) {
      const lines = part.trim().split('\n');
      const headLine = lines[0].replace(/^###\s*/, '').trim();
      const rest = lines.slice(1).join('\n');
      const descM = rest.match(
        /\*\*Description:\*\*\s*([\s\S]*?)(?=\n\*\*Composer OS features:|\n---|\s*$)/i
      );
      const featM = rest.match(
        /\*\*Composer OS features:\*\*\s*([\s\S]*?)(?=\n\*\*Status:|\n---|\s*$)/i
      );
      const statM = rest.match(/\*\*Status:\*\*\s*([\s\S]*?)(?=\n---|\n\n###|\s*$)/i);
      const description = stripMdBold((descM?.[1] ?? '').trim());
      const features = stripMdBold((featM?.[1] ?? '').trim());
      let status = stripMdBold((statM?.[1] ?? '').trim());
      status = status.replace(/\s+/g, ' ');
      apps.push({
        heading: stripMdBold(headLine),
        description,
        features,
        status,
      });
    }
    categories.push({ title: indices[i].endLabel, applications: apps });
  }
  return categories;
}

function labeledBlock(label, text) {
  return new Paragraph({
    spacing: { after: 180 },
    children: [
      new TextRun({ text: `${label} `, bold: true }),
      new TextRun({ text: text }),
    ],
  });
}

async function main() {
  const md = fs.readFileSync(mdPath, 'utf8');
  const categories = parseMd(md);

  const titleChildren = [
    new Paragraph({ spacing: { before: 2400, after: 400 } }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '30 Creative Zappa Applications',
          bold: true,
          size: 56,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'with Composer OS',
          italics: true,
          size: 36,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: 'Companion guide for educators, composers, and developers',
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Document version 1.0 · May 2026', size: 20 })],
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
      headingStyleRange: '1-2',
    }),
  ];

  const bodyChildren = [];

  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    bodyChildren.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(cat.title)],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${cat.applications.length} applications · See headings below for TOC links after Word updates fields.`,
            italics: true,
            size: 20,
          }),
        ],
      })
    );

    for (const app of cat.applications) {
      bodyChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun(app.heading)],
        }),
        labeledBlock('Description:', app.description),
        labeledBlock('Composer OS features:', app.features),
        labeledBlock('Status:', app.status),
        new Paragraph({ spacing: { after: 240 } })
      );
    }
  }

  bodyChildren.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun('Legend')],
    }),
    labeledBlock(
      'LIVE',
      'Shipped path users can run today in Composer OS (may require manual steps).'
    ),
    labeledBlock(
      'PLANNED',
      'Partially supported or on near roadmap — engineering or UX gap remains.'
    ),
    labeledBlock(
      'FUTURE',
      'Not scheduled; requires major feature work or external tooling.'
    ),
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: '“Zappa” used descriptively for musical pedagogy. Composer OS and documentation © project contributors.',
          italics: true,
          size: 18,
        }),
      ],
    })
  );

  const doc = new Document({
    creator: 'Composer OS',
    title: '30 Creative Zappa Applications with Composer OS',
    description: 'Creative applications catalog',
    sections: [
      {
        properties: {},
        children: [...titleChildren, ...tocChildren, ...bodyChildren],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
  console.log(`Parsed categories: ${categories.map((c) => `${c.title}(${c.applications.length})`).join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
