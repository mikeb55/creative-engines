/**
 * One-off: extract text from three iReal PDFs via pdfjs-dist (legacy Node build).
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

GlobalWorkerOptions.workerSrc = new URL(
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).href;

const CHORD_REGEX =
  /[A-G][b#]?(maj|min|m|M|dim|aug|sus|add|\d|△|ø|°|-|\+)[\w#b]*/g;

const PDFS = [
  join(repoRoot, 'iReal Pro files', "Don't Get Around Much Anymore.pdf"),
  join(repoRoot, 'iReal Pro files', 'Doxy.pdf'),
  join(repoRoot, 'iReal Pro files', 'Freddie Freeloader.pdf'),
];

function classifySource(totalChars, numPages) {
  if (numPages <= 0) return 'unknown';
  const perPage = totalChars / numPages;
  /** Very little extractable text usually means image-only / scan. */
  if (totalChars < 80 || perPage < 15) return 'likely scanned / image-based';
  return 'likely text-based (embedded text layer)';
}

async function extractFullText(uint8Array) {
  const loadingTask = getDocument({ data: uint8Array, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageTexts = [];
  let totalChars = 0;
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const line = tc.items.map((it) => ('str' in it ? it.str : '')).join(' ');
    pageTexts.push(line);
    totalChars += line.replace(/\s+/g, '').length;
  }
  const full = pageTexts.join('\n');
  return { numPages, full, totalChars, firstPageSample: pageTexts[0] ?? '' };
}

function guessKeyAndMeter(text) {
  const t = text.slice(0, 8000);
  let key = null;
  const km = /\b([A-G][b#]?)\s*(maj|major|min|minor|m\b)/i.exec(t);
  if (km) key = `${km[1]} ${km[2]}`;
  const ts = /\b(\d+)\s*\/\s*(\d+)\b/.exec(t);
  const timeSig = ts ? `${ts[1]}/${ts[2]}` : null;
  return { keyGuess: key, timeSigGuess: timeSig };
}

for (const pdfPath of PDFS) {
  const name = pdfPath.split(/[/\\]/).pop();
  console.log('\n========', name, '========');
  try {
    const buf = await readFile(pdfPath);
    const { numPages, full, totalChars, firstPageSample } = await extractFullText(
      new Uint8Array(buf)
    );
    const sample500 = firstPageSample.replace(/\s+/g, ' ').trim().slice(0, 500);
    const chordMatches = full.match(CHORD_REGEX);
    const uniqueChords = chordMatches
      ? [...new Set(chordMatches)].slice(0, 40)
      : [];
    const { keyGuess, timeSigGuess } = guessKeyAndMeter(full);

    console.log('totalPages:', numPages);
    console.log('totalChars (non-whitespace, all pages):', totalChars);
    console.log('firstPageFirst500Chars:', JSON.stringify(sample500));
    console.log(
      'chordLikeTokensFound:',
      uniqueChords.length > 0 ? uniqueChords.join(', ') : '(none)'
    );
    console.log('keyGuess:', keyGuess ?? '(none)');
    console.log('timeSigGuess:', timeSigGuess ?? '(none)');
    console.log('textVsScan:', classifySource(totalChars, numPages));
  } catch (err) {
    console.error('ERROR:', err?.message ?? err);
  }
}
