/**
 * Phase 4H — notation-only release pass for Seed 77241 / 48-bar varied orchestral export.
 */

import {
  applyBarContextPitchSpellings,
  buildBarHarmonicSpellingMaps,
} from './musicXmlNoteFragment';

export const HARMONY_77241_24 = [
  'Cmaj7/E', 'Fmaj7/A', 'Dm7', 'Gsus4', 'Cmaj7(#11)', 'Am7', 'Fmaj7/C', 'Ebmaj7/G',
  'Abmaj7', 'Emaj7', 'Bmaj7(#11)', 'F#m7', 'Dbmaj7', 'Amaj7', 'Fm7', 'Bb7sus4',
  'Cmaj7/E', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Cmaj7', 'Cmaj7',
] as const;

export function harmonySymbolForBar48(bar: number): string {
  const local = ((bar - 1) % 24) + 1;
  return HARMONY_77241_24[local - 1]!;
}

const REHEARSAL_BARS: readonly { bar: number; mark: string }[] = [
  { bar: 1, mark: 'A' },
  { bar: 9, mark: 'B' },
  { bar: 17, mark: 'C' },
  { bar: 25, mark: 'D' },
  { bar: 33, mark: 'E' },
  { bar: 41, mark: 'F' },
];

const PART_ABBREV: Record<string, string> = {
  picc: 'Picc.',
  fl1: 'Fl. 1',
  fl2: 'Fl. 2',
  ob1: 'Ob. 1',
  ob2: 'Ob. 2',
  ca: 'C.a.',
  cl1: 'Cl. 1',
  cl2: 'Cl. 2',
  bcl: 'B.cl.',
  bn1: 'Bsn. 1',
  bn2: 'Bsn. 2',
  cbn: 'Cbn.',
  hn1: 'Hn. 1',
  hn2: 'Hn. 2',
  hn3: 'Hn. 3',
  hn4: 'Hn. 4',
  tp1: 'Tpt. 1',
  tp2: 'Tpt. 2',
  tp3: 'Tpt. 3',
  tbn1: 'Tbn. 1',
  tbn2: 'Tbn. 2',
  tbn3: 'Tbn. 3',
  tba: 'Tba.',
  timp: 'Timp.',
  perc: 'Perc.',
  hp: 'Hp.',
  vn1: 'Vln. I',
  vn2: 'Vln. II',
  va: 'Vla.',
  vc: 'Vc.',
  db: 'Cb.',
};

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setWorkTitle(xml: string, title: string): string {
  if (/<work-title>/.test(xml)) {
    return xml.replace(/<work-title>[^<]*<\/work-title>/, `<work-title>${escapeXml(title)}</work-title>`);
  }
  return xml.replace(
    /<score-partwise/,
    `<identification><creator type="composer">Mike Bryant</creator></identification>\n<work><work-title>${escapeXml(title)}</work-title></work>\n<score-partwise`,
  );
}

function ensureComposer(xml: string): string {
  if (/<creator type="composer">/.test(xml)) {
    return xml.replace(
      /<creator type="composer">[^<]*<\/creator>/,
      '<creator type="composer">Mike Bryant</creator>',
    );
  }
  const idBlock = '<identification>\n    <creator type="composer">Mike Bryant</creator>\n  </identification>\n  ';
  if (/<identification>/.test(xml)) {
    return xml.replace(/<identification>/, '<identification>\n    <creator type="composer">Mike Bryant</creator>');
  }
  return xml.replace(/<score-partwise[^>]*>/, (m) => `${m}\n  ${idBlock}`);
}

function ensurePartAbbreviations(xml: string): string {
  let out = xml;
  for (const [id, abbrev] of Object.entries(PART_ABBREV)) {
    const re = new RegExp(
      `(<score-part id="${id}">\\s*<part-name>[^<]+</part-name>)(?!\\s*<part-abbreviation>)`,
      'g',
    );
    out = out.replace(re, `$1\n      <part-abbreviation>${escapeXml(abbrev)}</part-abbreviation>`);
  }
  return out;
}

function rehearsalDirection(mark: string): string {
  return `    <direction placement="above">
      <direction-type>
        <rehearsal>${mark}</rehearsal>
      </direction-type>
    </direction>
`;
}

function injectRehearsalMarks(xml: string, anchorPartId = 'vn1'): string {
  const byBar = new Map(REHEARSAL_BARS.map((r) => [r.bar, r.mark]));
  return xml.replace(
    new RegExp(`<part id="${anchorPartId}">([\\s\\S]*?)(?=<part id=|</score-partwise>)`),
    (_full, body: string) => {
      const rewritten = body.replace(
        /<measure number="(\d+)">/g,
        (m, num: string) => {
          const mark = byBar.get(parseInt(num, 10));
          if (!mark) return m;
          return `${m}\n${rehearsalDirection(mark)}`;
        },
      );
      return `<part id="${anchorPartId}">${rewritten}`;
    },
  );
}

function injectFinalBarlines(xml: string, lastBar = 48): string {
  return xml.replace(
    /<part id="([^"]+)">([\s\S]*?)(?=<part id=|<\/score-partwise>)/g,
    (_full, id: string, body: string) => {
      const rewritten = body.replace(
        new RegExp(`<measure number="${lastBar}">([\\s\\S]*?)</measure>`),
        (mFull, inner: string) => {
          if (inner.includes('light-heavy')) return mFull;
          return `<measure number="${lastBar}">${inner}    <barline location="right"><bar-style>light-heavy</bar-style></barline>\n  </measure>`;
        },
      );
      return `<part id="${id}">${rewritten}`;
    },
  );
}

/** Notation + metadata release pass; musical content (sounding MIDI) unchanged. */
export function applySeed77241ReleaseExport(xml: string): string {
  const spellingByBar = buildBarHarmonicSpellingMaps(harmonySymbolForBar48, 48);
  let out = applyBarContextPitchSpellings(xml, spellingByBar);
  out = setWorkTitle(out, 'Seed 77241');
  out = ensureComposer(out);
  out = ensurePartAbbreviations(out);
  out = injectRehearsalMarks(out);
  out = injectFinalBarlines(out);
  return out;
}
