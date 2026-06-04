/**
 * One-shot build: docs/MIDI-Groove-Import-Guide.docx
 * Run from repo root: node scripts/generateMidiGrooveImportGuideDocx.mjs
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
  Footer,
  PageNumber,
  NumberFormat,
  PageBreak,
  TableOfContents,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'docs', 'MIDI-Groove-Import-Guide.docx');

/** @param {string} text */
function runs(text) {
  return [new TextRun({ text, size: 22 })];
}

/** @param {string} text */
function boldRuns(text) {
  return [new TextRun({ text, bold: true, size: 22 })];
}

/** @param {string} label @param {string} value */
function labelLine(label, value) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value, size: 22 }),
    ],
  });
}

/** @param {string} title @param {Record<string, string>} fields @param {string} body */
function exampleBlock(title, fields, body) {
  /** @type {import('docx').FileChild[]} */
  const out = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: title, size: 28 })],
    }),
  ];
  for (const [k, v] of Object.entries(fields)) {
    out.push(labelLine(k, v));
  }
  out.push(
    new Paragraph({
      spacing: { after: 160 },
      children: runs(body),
    })
  );
  return out;
}

/** @param {string} text */
function body(text) {
  return new Paragraph({ spacing: { after: 160 }, children: runs(text) });
}

/** @param {string} text */
function bullet(text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360, hanging: 260 },
    children: [new TextRun({ text: '• ', size: 22 }), ...runs(text)],
  });
}

/** @param {string} heading */
function h1(heading) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    pageBreakBefore: heading.startsWith('Chapter'),
    children: [new TextRun({ text: heading, size: 32, bold: true })],
  });
}

/** @param {string} heading */
function h2(heading) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: heading, size: 26, bold: true })],
  });
}

function gmDrumTable() {
  const rows = [
    ['Drum sound', 'MIDI note number'],
    ['Kick (bass drum)', '36'],
    ['Snare', '38'],
    ['Snare rim', '40'],
    ['Hi-hat (closed)', '42'],
    ['Hi-hat (open)', '46'],
    ['Ride cymbal', '51'],
    ['Hi-hat foot', '22'],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, ri) =>
      new TableRow({
        children: cells.map(
          (text) =>
            new TableCell({
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text,
                      bold: ri === 0,
                      size: 22,
                    }),
                  ],
                }),
              ],
            })
        ),
      })
    ),
  });
}

function buildBody() {
  /** @type {import('docx').FileChild[]} */
  const children = [];

  children.push(h1('Chapter 1 — What Is This?'));
  children.push(
    body(
      'Composer OS can now take drum grooves you already own — files exported from Superior Drummer, EZdrummer, Toontrack packs, or any standard General MIDI drum file — and place those exact hits in your chart. It reads your file note for note. It does not invent a substitute groove or “improve” your feel behind the scenes.',
    )
  );
  children.push(
    body(
      'Think of it as hiring your favourite session drummer, recording one perfect take to a MIDI file, and asking the arranger to use that take every time the chart says “head,” “shout,” or “rideout.” The pocket you programmed in Superior Drummer is the pocket that appears in the score.',
    )
  );
  children.push(
    body(
      'This is ideal for big-band and concert writing where the drum part must match a specific regional feel — second-line New Orleans, parade shout, half-time rideout — without re-entering every kick and snare by hand.',
    )
  );

  children.push(h1('Chapter 2 — What Files Does It Accept?'));
  children.push(h2('File types and sources'));
  children.push(bullet('Any General MIDI drum file saved as .mid'));
  children.push(bullet('Superior Drummer 3 exports from the MIDI browser'));
  children.push(bullet('EZdrummer and EZdrummer 2 exports'));
  children.push(bullet('Toontrack MIDI packs and custom SD3/EZ libraries'));
  children.push(
    bullet(
      'Files where drums live on MIDI channel 10 (the usual GM drum channel). Some exports land on channel 1 instead — Composer OS accepts those too when the notes use standard GM drum pitches.',
    )
  );
  children.push(new Paragraph({ spacing: { after: 120 } }));
  children.push(h2('General MIDI drum map (what Composer OS recognises)'));
  children.push(
    body(
      'Only standard GM drum pitches are imported. If your file uses a custom map from a non-GM plugin, export again using GM mapping or a GM-compatible preset.',
    )
  );
  children.push(gmDrumTable());
  children.push(new Paragraph({ spacing: { after: 160 } }));

  children.push(h1('Chapter 3 — How to Use It (Step by Step)'));
  children.push(h2('Step 1 — Export your groove from Superior Drummer'));
  children.push(bullet('Open Superior Drummer 3.'));
  children.push(bullet('Open the MIDI browser and find the groove you want (for example a second-line head pattern).'));
  children.push(
    bullet('Drag the groove to your desktop, or use Export to save a .mid file. Set the tempo in SD3 to match your chart before you export.'),
  );
  children.push(h2('Step 2 — Place the file in your project folder'));
  children.push(
    body(
      'Keep all grooves for one chart in one folder — for example “New Orleans Orbit Beats” beside your score. Use clear names: HeadGroove.mid, ShoutParade.mid, not groove1.mid.',
    )
  );
  children.push(h2('Step 3 — Assign grooves to bar ranges in your arrangement'));
  children.push(
    body(
      'In your arrangement script or project setup, point to each .mid file and say which bars it covers. Bars 5–32 might use HeadGroove.mid; bars 57–72 might use ShoutParade.mid. You can assign different files to different sections of the same chart.',
    )
  );
  children.push(h2('Step 4 — Generate'));
  children.push(
    body(
      'When you generate, Composer OS reads each groove file exactly as written — kick, snare, hi-hat positions and all — and writes the drum part into the score. You can open the result in Sibelius or your usual notation program.',
    )
  );

  children.push(h1('Chapter 4 — Ten Worked Examples'));
  children.push(
    body(
      'These examples use real groove names from a New Orleans big-band project. The same ideas apply to any style once you have GM MIDI files you trust.',
    )
  );

  children.push(
    ...exampleBlock(
      'Example 1 — New Orleans Head Groove',
      {
        'Groove file': 'HeadGroove.mid',
        'Bar range': 'Bars 5–32',
        'Use when': 'Stating the main theme',
      },
      'A relaxed second-line pocket sits under the melody — enough push to keep the band forward, not so busy that it competes with the horns. This is the “we’re telling the story” groove.',
    )
  );
  children.push(
    ...exampleBlock(
      'Example 2 — Parade Shout',
      {
        'Groove file': 'ShoutParade.mid',
        'Bar range': 'Bars 57–72',
        'Use when': 'Full ensemble climax',
      },
      'Heavy parade energy — snare and bass speak with brass-band authority. The chart feels like the street, not the rehearsal room. Save this for when everyone is playing loud and proud.',
    )
  );
  children.push(
    ...exampleBlock(
      'Example 3 — Half-Time Rideout',
      {
        'Groove file': 'RideoutHalfTime.mid',
        'Bar range': 'Bars 25–32',
        'Use when': 'Winding down before a repeat',
      },
      'Sparse and spacious. The brass can breathe; the listener feels the form rounding a corner. Perfect before you return to the top or drop into a solo.',
    )
  );
  children.push(
    ...exampleBlock(
      'Example 4 — Light Soli Texture',
      {
        'Groove file': 'SoliLight.mid',
        'Bar range': 'Bars 49–56',
        'Use when': 'Saxophone feature or dialogue section',
      },
      'Conversational, not busy. The drums comment rather than dominate — ideal when a soloist or small group needs room to speak.',
    )
  );
  children.push(
    ...exampleBlock(
      'Example 5 — Fill into the Shout',
      {
        'Groove file': 'Fills_01.mid',
        'Bar range': 'Bar 16 only (one bar)',
        'Use when': 'Transition from verse to chorus',
      },
      'A short snare roll or pickup that lifts energy into the next section. One bar of fill, then the heavy groove takes over.',
    )
  );
  children.push(
    ...exampleBlock(
      'Example 6 — Multiple Grooves Across One Chart',
      {
        'Groove files': 'Intro, Head, Soli, Shout, and Rideout files',
        'Bar ranges':
          'Bars 1–4 intro (sparse) · 5–32 head (flowing) · 33–56 soli (light) · 57–72 shout (heavy) · 73–84 rideout (half-time)',
        'Use when': 'Building a full arrangement',
      },
      'Each section gets its own feel, like changing drummers’ hats between movements. The listener always knows where they are in the form.',
    )
  );
  children.push(
    ...exampleBlock(
      'Example 7 — Repeating a Short Groove Loop',
      {
        'Groove file': 'Any two-bar .mid loop',
        'Bar range': 'Sixteen bars (or longer)',
        'Use when': 'Your file is shorter than the section',
      },
      'Composer OS repeats the loop from the top until the section is full — you do not need to copy-paste the MIDI by hand. Write a tight two-bar cell; the software tiles it.',
    )
  );
  children.push(
    ...exampleBlock(
      'Example 8 — Different Grooves for Different Emotional States',
      {
        'Verse': 'SoliLight.mid — questioning, open',
        'Chorus': 'ShoutParade.mid — assertive, loud',
        'Bridge': 'RideoutHalfTime.mid — suspended, spacious',
        'Use when': 'The arrangement needs dramatic contrast',
      },
      'The drums carry as much narrative as the harmony. Match the groove to the emotional job of each section.',
    )
  );
  children.push(
    ...exampleBlock(
      'Example 9 — Using EZDrummer Exports',
      {
        'Groove file': 'Any EZDrummer .mid export',
        'Bar range': 'Same as SD3 — assign per section',
        'Use when': 'Your library lives in EZDrummer instead of SD3',
      },
      'Export from EZDrummer as GM MIDI and assign the file the same way. GM MIDI is GM MIDI — the source plugin does not matter if the note numbers are standard.',
    )
  );
  children.push(
    ...exampleBlock(
      'Example 10 — Fills at Every Section Transition',
      {
        'Groove files': 'Fills_01.mid at bar 8 · Fills_03.mid at bar 16 · Fills_05.mid at bar 24',
        'Bar range': 'One bar each at section boundaries',
        'Use when': 'Sections need clear punctuation',
      },
      'Short fill files at barlines tell the band (and the audience) that a new section is starting. Energy lifts into each new block without rewriting the main grooves.',
    )
  );

  children.push(h1('Chapter 5 — What Composer OS Does With Your Groove'));
  children.push(bullet('Reads every kick, snare, and hi-hat hit in your file — exactly where you placed it.'));
  children.push(bullet('Does not rewrite, “humanise,” or replace your pattern with a generated one.'));
  children.push(
    bullet('Snaps note positions to the nearest sixteenth note so the written part looks clean in notation.'),
  );
  children.push(bullet('Repeats shorter loops to fill longer sections.'));
  children.push(bullet('Cuts longer grooves to fit shorter sections when needed.'));
  children.push(bullet('Exports drum notation as MusicXML so you can open it in Sibelius, Finale, or Dorico.'));

  children.push(h1('Chapter 6 — Tips and Common Mistakes'));
  children.push(h2('Do'));
  children.push(
    bullet('Export grooves at the tempo you intend for the chart — match BPM in Superior Drummer or EZdrummer before saving the .mid file.'),
  );
  children.push(bullet('Use a separate file for each section feel (head, shout, rideout, fills).'));
  children.push(bullet('Keep one-bar fill files for transitions between sections.'));
  children.push(h2('Do not'));
  children.push(
    bullet(
      'Rely on non-GM MIDI maps. Some virtual instruments use custom note assignments — those will not translate. Export with GM mapping enabled.',
    )
  );
  children.push(
    bullet(
      'Expect the groove file to change tempo on its own. The file carries note timing, not a magic tempo match — set tempo in the drum plugin first.',
    )
  );
  children.push(h2('Tips'));
  children.push(bullet('Name files descriptively: HeadGroove.mid, not groove1.mid.'));
  children.push(bullet('Keep all groove files for one project in one folder beside the score.'));
  children.push(
    body(
      'When in doubt, open the .mid in a simple MIDI player or your DAW on channel 10 and confirm kick and snare land where you expect before you assign bar ranges.',
    )
  );

  return children;
}

async function main() {
  const titleBlock = [
    new Paragraph({ spacing: { before: 2800, after: 400 } }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Composer OS — MIDI Groove Import', bold: true, size: 52 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: 'How to use your own drum files in any arrangement',
          italics: true,
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: 'Composer OS | May 2026', size: 24 })],
    }),
  ];

  const tocBlock = [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun('Contents')],
    }),
    new Paragraph({ spacing: { after: 200 } }),
    new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-3' }),
  ];

  const doc = new Document({
    creator: 'Composer OS',
    title: 'Composer OS — MIDI Groove Import',
    description: 'Musician guide to importing GM MIDI drum grooves',
    features: { updateFields: true },
    sections: [
      {
        properties: {
          page: {
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], size: 20 })],
              }),
            ],
          }),
        },
        children: [
          ...titleBlock,
          ...tocBlock,
          new Paragraph({ children: [new PageBreak()] }),
          ...buildBody(),
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
