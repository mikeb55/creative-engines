/**
 * Orbit New Orleans V8 — V7 horn register correction + SD3 groove drum export (v1.7p3).
 * Run: npx tsx --tsconfig tsconfig.json scripts/orbitNewOrleansV8.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { attachImportedGrooveToSongSections } from '../engines/composer-os-v2/core/groove-scaffold/attachGrooveToSections';
import { exportGrooveDrumsToMusicXml } from '../engines/composer-os-v2/core/groove-scaffold/exportGrooveDrumsMusicXml';
import { importExternalGrooveMidi } from '../engines/composer-os-v2/core/groove-scaffold/importGrooveMidi';
import type { GrooveSectionAssignment } from '../engines/composer-os-v2/core/groove-scaffold/importGrooveMidiTypes';

const V7 =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision\\Orbit-NewOrleans-V7.musicxml';
const OUT =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision\\Orbit-NewOrleans-V8.musicxml';
const MIDI_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\New Orleans Orbit Beats';

const TOTAL_BARS = 84;
const TEMPO = 90;

const PARTS = {
  alto: 'P1',
  tenor: 'P2',
  trumpet: 'P3',
  trombone: 'P4',
  drums: 'P5',
} as const;

const HORN_PARTS = [PARTS.alto, PARTS.tenor, PARTS.trumpet, PARTS.trombone];

/** MusicXML chromatic transpose: concert = written + chromatic */
const CHROMATIC: Record<string, number> = {
  [PARTS.alto]: -9,
  [PARTS.tenor]: -2,
  [PARTS.trumpet]: -2,
  [PARTS.trombone]: 0,
};

/** Concert-pitch MIDI limits (never below / never above) */
const REGISTER: Record<string, { min: number; max: number; label: string }> = {
  [PARTS.alto]: { min: 58, max: 84, label: 'Alto Saxophone' }, // Bb3 – C6
  [PARTS.tenor]: { min: 56, max: 82, label: 'Tenor Saxophone' }, // Ab3 – Bb5
  [PARTS.trumpet]: { min: 64, max: 86, label: 'Trumpet in Bb' }, // E4 – D6
  [PARTS.trombone]: { min: 40, max: 77, label: 'Trombone' }, // E2 – F5
};

const GROOVE_FILES = {
  intro: 'Intro 01.mid',
  head: 'HeadGroove.mid',
  soli: 'SoliLight.mid',
  shout: 'ShoutParade.mid',
  rideout: 'RideoutHalfTime.mid',
  fill_01: 'Fills 01.mid',
  fill_03: 'Fills 03.mid',
  fill_05: 'Fills 05.mid',
};

const FILL_BARS = [8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 84] as const;
const FILL_ROTATION = ['fill_01', 'fill_03', 'fill_05'] as const;

interface RegisterStats {
  upOctave: number;
  downOctave: number;
  notesChecked: number;
}

function splitPart(xml: string, partId: string): { open: string; body: string; close: string } {
  const re = new RegExp(`(<part id="${partId}">)([\\s\\S]*?)(</part>)`, 'm');
  const m = xml.match(re);
  if (!m) throw new Error(`Part ${partId} not found`);
  return { open: m[1]!, body: m[2]!, close: m[3]! };
}

function pitchXmlToWrittenMidi(noteXml: string): number | null {
  if (/<rest\s*\/>/.test(noteXml)) return null;
  const step = noteXml.match(/<step>([^<]+)<\/step>/)?.[1];
  const oct = noteXml.match(/<octave>(\d+)<\/octave>/)?.[1];
  if (!step || !oct) return null;
  const steps: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const alter = parseInt(noteXml.match(/<alter>(-?\d+)<\/alter>/)?.[1] ?? '0', 10);
  return steps[step]! + alter + (parseInt(oct, 10) + 1) * 12;
}

function writtenMidiToPitchXml(midi: number): { step: string; alter: number; octave: number } {
  const names: Array<[string, number]> = [
    ['C', 0],
    ['C', 1],
    ['D', 0],
    ['D', 1],
    ['E', 0],
    ['F', 0],
    ['F', 1],
    ['G', 0],
    ['G', 1],
    ['A', 0],
    ['A', 1],
    ['B', 0],
  ];
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const [step, alter] = names[pc]!;
  return { step, alter, octave };
}

function replacePitchInNote(noteXml: string, writtenMidi: number): string {
  const { step, alter, octave } = writtenMidiToPitchXml(writtenMidi);
  let out = noteXml.replace(/<step>[^<]+<\/step>/, `<step>${step}</step>`);
  out = out.replace(/\s*<alter>-?\d+<\/alter>\n?/g, '');
  out = out.replace(
    /<step>([^<]+)<\/step>/,
    alter !== 0 ? `<step>${step}</step>\n     <alter>${alter}</alter>` : `<step>${step}</step>`,
  );
  out = out.replace(/<octave>\d+<\/octave>/, `<octave>${octave}</octave>`);
  out = out.replace(/\s*<accidental>[^<]+<\/accidental>\n?/g, '');
  if (alter !== 0) {
    const acc = alter === 1 ? 'sharp' : 'flat';
    out = out.replace(/<\/type>\n/, `</type>\n    <accidental>${acc}</accidental>\n`);
  }
  return out;
}

function correctRegisterInPart(partBody: string, partId: string): { body: string; stats: RegisterStats } {
  const chromatic = CHROMATIC[partId] ?? 0;
  const reg = REGISTER[partId]!;
  const stats: RegisterStats = { upOctave: 0, downOctave: 0, notesChecked: 0 };

  const body = partBody.replace(/<note>([\s\S]*?)<\/note>/g, (full, inner: string) => {
    if (/<rest\s*\/>/.test(inner)) return full;
    const written = pitchXmlToWrittenMidi(inner);
    if (written == null) return full;

    stats.notesChecked += 1;
    let concert = written + chromatic;
    let newWritten = written;

    if (concert < reg.min) {
      concert += 12;
      newWritten = concert - chromatic;
      stats.upOctave += 1;
    } else if (concert > reg.max) {
      concert -= 12;
      newWritten = concert - chromatic;
      stats.downOctave += 1;
    }

    if (newWritten === written) return full;
    return `<note>${replacePitchInNote(inner, newWritten)}</note>`;
  });

  return { body, stats };
}

function importGroove(key: keyof typeof GROOVE_FILES): ReturnType<typeof importExternalGrooveMidi> {
  const filePath = path.join(MIDI_DIR, GROOVE_FILES[key]);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing groove MIDI: ${filePath}`);
  }
  return importExternalGrooveMidi(filePath);
}

function buildGrooveContext(): ReturnType<typeof attachImportedGrooveToSongSections> {
  const assignments: GrooveSectionAssignment[] = [];

  FILL_BARS.forEach((bar, index) => {
    const fillKey = FILL_ROTATION[index % FILL_ROTATION.length]!;
    assignments.push({
      grooveId: `${fillKey}_bar${bar}`,
      startBar: bar,
      endBar: bar,
      groove: importGroove(fillKey),
    });
  });

  const sections: Array<{ start: number; end: number; key: keyof typeof GROOVE_FILES; id: string }> = [
    { start: 1, end: 4, key: 'intro', id: 'intro' },
    { start: 5, end: 32, key: 'head', id: 'head' },
    { start: 33, end: 56, key: 'soli', id: 'soli_light' },
    { start: 57, end: 72, key: 'shout', id: 'shout' },
    { start: 73, end: 84, key: 'rideout', id: 'rideout' },
  ];

  for (const section of sections) {
    assignments.push({
      grooveId: section.id,
      startBar: section.start,
      endBar: section.end,
      groove: importGroove(section.key),
    });
  }

  return attachImportedGrooveToSongSections(assignments);
}

function splitMeasures(partBody: string): Map<number, { comment: string; openTag: string; inner: string }> {
  const measures = new Map<number, { comment: string; openTag: string; inner: string }>();
  const re =
    /(<!--[^>]+-->\s*)?<measure number="(\d+)"([^>]*)>([\s\S]*?)<\/measure>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(partBody))) {
    measures.set(parseInt(m[2]!, 10), {
      comment: m[1]?.trim() ?? '',
      openTag: `<measure number="${m[2]!}"${m[3] ?? ''}>`,
      inner: m[4]!,
    });
  }
  return measures;
}

function extractDirections(inner: string): string {
  const dirs: string[] = [];
  const re = /<direction[\s\S]*?<\/direction>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    const block = m[0];
    if (/<rehearsal>/.test(block) || /rit\./.test(block)) {
      dirs.push(block);
    }
  }
  return dirs.map((d) => `   ${d.trim()}\n`).join('');
}

function stripDirectionsAndAttrs(inner: string): string {
  return inner
    .replace(/<attributes>[\s\S]*?<\/attributes>\s*/g, '')
    .replace(/<direction[\s\S]*?<\/direction>\s*/g, '')
    .trim();
}

function extractScorePartDrumList(exportXml: string): string {
  const m = exportXml.match(/<score-part id="P1">([\s\S]*?)<\/score-part>/);
  if (!m) throw new Error('Drum export missing score-part');
  return m[1]!
    .replace(/<part-name>Drum Set<\/part-name>/, '<part-name>Drum Set</part-name><part-abbreviation>Drums</part-abbreviation>')
    .replace(/id="P1-I/g, 'id="P5-I')
    .replace(/id="P1-I/g, 'id="P5-I');
}

function remapDrumPartIds(content: string): string {
  return content.replace(/P1-I(\d+)/g, 'P5-I$1');
}

function buildDrumPartBody(v7DrumBody: string, exportXml: string): string {
  const v7Measures = splitMeasures(v7DrumBody);
  const exportPart = splitPart(exportXml, 'P1');
  const exportMeasures = splitMeasures(exportPart.body);

  let body = '';
  for (let bar = 1; bar <= TOTAL_BARS; bar += 1) {
    const v7 = v7Measures.get(bar);
    const exp = exportMeasures.get(bar);
    if (!exp) throw new Error(`Export missing drum measure ${bar}`);

    const comment = v7?.comment ?? `<!-- Drum Set m${bar} -->`;
    const width = v7?.openTag.includes('width=') ? v7.openTag.match(/width="[^"]+"/)?.[0] : null;
    const openTag = bar === 1 && width ? `<measure number="${bar}" ${width}>` : `<measure number="${bar}">`;

    const preservedDirs = v7 ? extractDirections(v7.inner) : '';
    let inner = '';

    if (bar === 1) {
      const attrs = exp.inner.match(/<attributes>[\s\S]*?<\/attributes>/)?.[0];
      if (!attrs) throw new Error('Export drum m1 missing attributes');
      inner += `    ${attrs.trim()}\n`;
    }

    inner += preservedDirs;
    inner += remapDrumPartIds(stripDirectionsAndAttrs(exp.inner));

    body += `  ${comment}\n  ${openTag}\n${inner.split('\n').map((l) => (l.trim() ? `   ${l.trim()}` : l)).join('\n')}\n  </measure>\n`;
  }
  return body;
}

function replaceScorePart(xml: string, partId: string, newScorePartInner: string): string {
  const re = new RegExp(`<score-part id="${partId}">[\\s\\S]*?</score-part>`);
  return xml.replace(
    re,
    `<score-part id="${partId}">${newScorePartInner}</score-part>`,
  );
}

function concertName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${names[pc]}${oct}`;
}

function run(): void {
  console.log('Orbit New Orleans V8 pipeline');
  console.log('  Source horns:', V7);

  let xml = fs.readFileSync(V7, 'utf8');
  const registerReport: Array<{ part: string; stats: RegisterStats }> = [];

  for (const partId of HORN_PARTS) {
    const split = splitPart(xml, partId);
    const { body, stats } = correctRegisterInPart(split.body, partId);
    xml = xml.replace(split.open + split.body + split.close, split.open + body + split.close);
    registerReport.push({ part: REGISTER[partId]!.label, stats });
  }

  console.log('\nRegister correction summary:');
  for (const row of registerReport) {
    const moved = row.stats.upOctave + row.stats.downOctave;
    console.log(
      `  ${row.part}: ${row.stats.notesChecked} notes checked, ${row.stats.upOctave} up octave, ${row.stats.downOctave} down octave (${moved} moved)`,
    );
  }

  console.log('\nImporting SD3 grooves + exporting drum notation...');
  const grooveContext = buildGrooveContext();
  const drumExportXml = exportGrooveDrumsToMusicXml(grooveContext, TEMPO, 4, 4);

  const drumScorePartInner = extractScorePartDrumList(drumExportXml);
  xml = replaceScorePart(xml, PARTS.drums, drumScorePartInner);

  const v7DrumSplit = splitPart(fs.readFileSync(V7, 'utf8'), PARTS.drums);
  const newDrumBody = buildDrumPartBody(v7DrumSplit.body, drumExportXml);
  const drumSplit = splitPart(xml, PARTS.drums);
  xml = xml.replace(
    drumSplit.open + drumSplit.body + drumSplit.close,
    drumSplit.open + newDrumBody + drumSplit.close,
  );

  xml = xml.replace(
    /<software>[^<]+<\/software>/,
    '<software>Composer OS orbitNewOrleansV8</software>',
  );
  xml = xml.replace(
    /<work-title>[^<]+<\/work-title>/,
    '<work-title>Orbit — New Orleans Big Band (V8)</work-title>',
  );
  xml = xml.replace(
    /<encoding-date>[^<]+<\/encoding-date>/,
    `<encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date>`,
  );

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, xml, 'utf8');

  console.log('\nWrote', OUT);
  console.log('\nGroove map:');
  console.log('  Bars 1–4:    Intro 01.mid');
  console.log('  Bars 5–32:   HeadGroove.mid');
  console.log('  Bars 33–56:  SoliLight.mid');
  console.log('  Bars 57–72:  ShoutParade.mid');
  console.log('  Bars 73–84:  RideoutHalfTime.mid');
  console.log(`  Fill bars:   ${FILL_BARS.join(', ')} (Fills 01/03/05 rotating)`);
  console.log(`  Tempo: ${TEMPO} BPM, 4/4`);
}

run();
