/**
 * BHL Batch B — guitar and bass score with no imported leadsheet.
 * Structure scales with the bar count. It is not a fixed eight-bar form.
 */

import fs from 'node:fs';
import path from 'node:path';
import { sha256Buffer } from './bhlIngest';
import { presentBhlScore } from './bhlPresent';

export interface BhlScratchRequest {
  bars: number;
  beats: number;
  beatType: number;
  tempo: number;
  title?: string;
  seed: number;
}

export interface BhlScratchScore {
  xml: string;
  sha256: string;
  bars: number;
  beats: number;
  beatType: number;
  tempo: number;
  /** Opening pitch-class set, repeated for the return. */
  openingPitchClasses: number[];
  sections: Array<{ mark: string; from: number; to: number; role: string }>;
}

const STEPS = [0, 2, 3, 1, 6, 4, 8, 9];

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function pitchXml(midi: number): string {
  const names = ['C', 'C', 'D', 'E', 'E', 'F', 'F', 'G', 'A', 'A', 'B', 'B'];
  const alters = [0, 1, 0, -1, 0, 0, 1, 0, -1, 0, -1, 0];
  const pc = mod12(midi);
  const octave = Math.floor(midi / 12) - 1;
  const alter = alters[pc]!;
  const accidental = alter === 1 ? '<accidental>sharp</accidental>' : alter === -1 ? '<accidental>flat</accidental>' : '';
  const alterTag = alter ? `<alter>${alter}</alter>` : '';
  return `<pitch><step>${names[pc]}</step>${alterTag}<octave>${octave}</octave></pitch>${accidental}`;
}

function noteXml(midi: number | null, ticks: number, type: string, voice: string): string {
  const head = midi === null ? '<rest/>' : pitchXml(midi);
  return `<note>${head}<duration>${ticks}</duration><voice>${voice}</voice><type>${type}</type></note>`;
}

/** Proportional sections. The last bar is always an ending, never a copy of bar 1. */
export function bhlScratchSections(bars: number): Array<{ mark: string; from: number; to: number; role: string }> {
  if (bars < 6) throw new Error('a from-scratch score needs at least 6 bars');
  const statement = Math.max(2, Math.round(bars * 0.15));
  const development = Math.max(2, Math.round(bars * 0.3));
  const contrast = Math.max(1, Math.round(bars * 0.15));
  const ret = Math.max(1, Math.round(bars * 0.15));
  let cursor = 1;
  const take = (count: number, mark: string, role: string) => {
    const from = cursor;
    const to = Math.min(bars, cursor + count - 1);
    cursor = to + 1;
    return { mark, from, to, role };
  };
  const sections = [
    take(statement, 'A', 'opening'),
    take(development, 'B', 'development'),
    take(contrast, 'C', 'contrast'),
    take(ret, 'D', 'return'),
  ];
  if (cursor <= bars) sections.push({ mark: 'E', from: cursor, to: bars, role: 'ending' });
  return sections.filter((section) => section.from <= section.to);
}

function sectionAt(sections: BhlScratchScore['sections'], bar: number) {
  return sections.find((section) => bar >= section.from && bar <= section.to) ?? sections[sections.length - 1]!;
}

function pairFor(role: string, seed: number, bar: number): [number, number] {
  const root = STEPS[(seed + bar) % STEPS.length]!;
  if (role === 'opening' || role === 'return') return [0, 4];
  if (role === 'contrast') return [mod12(6), mod12(6 + 4)];
  if (role === 'ending') return [mod12(root + 3), mod12(root + 3)];
  return [mod12(root + 2), mod12(root + 5)];
}

function durationType(quarters: number): { ticks: number; type: string }[] {
  const pieces: { ticks: number; type: string }[] = [];
  let left = quarters * 2;
  const catalog: Array<{ ticks: number; type: string }> = [
    { ticks: 12, type: 'whole' },
    { ticks: 8, type: 'whole' },
    { ticks: 6, type: 'half' },
    { ticks: 4, type: 'half' },
    { ticks: 3, type: 'quarter' },
    { ticks: 2, type: 'quarter' },
    { ticks: 1, type: 'eighth' },
  ];
  while (left > 0) {
    const piece = catalog.find((item) => item.ticks <= left) ?? { ticks: 1, type: 'eighth' };
    pieces.push(piece);
    left -= piece.ticks;
  }
  return pieces;
}

export function buildBhlScratchScore(request: BhlScratchRequest): BhlScratchScore {
  const bars = request.bars;
  const beats = request.beats;
  const beatType = request.beatType;
  if (!Number.isInteger(bars) || bars < 6 || bars > 64) throw new Error('bar count must be an integer from 6 to 64');
  if (![2, 3, 4, 5, 6, 7].includes(beats) || ![4, 8].includes(beatType)) {
    throw new Error('metre must use 2–7 beats and a quarter or eighth beat');
  }
  if (!Number.isInteger(request.tempo) || request.tempo < 40 || request.tempo > 240) {
    throw new Error('tempo must be an integer from 40 to 240');
  }
  const quarters = (beats * 4) / beatType;
  if (!Number.isInteger(quarters * 2)) throw new Error('this metre does not fit the division grid');
  const sections = bhlScratchSections(bars);
  const title = request.title?.trim() || 'BHL from scratch';
  const beatUnit = beatType === 8 ? 'eighth' : 'quarter';
  const guitar: string[] = [];
  const bass: string[] = [];
  for (let bar = 1; bar <= bars; bar++) {
    const section = sectionAt(sections, bar);
    const attributes =
      bar === 1
        ? `<attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>`
        : '';
    const guitarClef = bar === 1 ? '<clef><sign>G</sign><line>2</line></clef></attributes>' : '';
    const bassClef = bar === 1 ? '<clef><sign>F</sign><line>4</line></clef></attributes>' : '';
    const tempo =
      bar === 1
        ? `<direction placement="above"><direction-type><metronome><beat-unit>${beatUnit}</beat-unit><per-minute>${request.tempo}</per-minute></metronome></direction-type><sound tempo="${request.tempo}"/></direction>`
        : '';
    const rehearsal =
      bar === section.from
        ? `<direction placement="above"><direction-type><rehearsal>${section.mark}</rehearsal></direction-type></direction>`
        : '';
    const banner =
      bar === 1
        ? '<direction placement="above"><direction-type><words>CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED</words></direction-type></direction>'
        : '';
    const rest = durationType(quarters)
      .map((piece) => noteXml(null, piece.ticks, piece.type, '1'))
      .join('');
    guitar.push(`<measure number="${bar}">${attributes}${guitarClef}${tempo}${rehearsal}${banner}${rest}</measure>`);
    const pair = pairFor(section.role, request.seed, bar);
    const bassNotes =
      pair[0] === pair[1]
        ? durationType(quarters)
            .map((piece, index) => noteXml(index === 0 ? 36 + pair[0]! : null, piece.ticks, piece.type, '1'))
            .join('')
        : (() => {
            const half = quarters / 2;
            if (!Number.isInteger(half * 2)) {
              return noteXml(36 + pair[0]!, quarters * 2, durationType(quarters)[0]!.type, '1');
            }
            const first = durationType(half).map((piece) => noteXml(36 + pair[0]!, piece.ticks, piece.type, '1'));
            const second = durationType(half).map((piece) => noteXml(36 + pair[1]!, piece.ticks, piece.type, '1'));
            return [...first, ...second].join('');
          })();
    bass.push(`<measure number="${bar}">${attributes}${bassClef}${bassNotes}</measure>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <movement-title>${escapeXml(title)}</movement-title>
  <identification><creator type="composer">BHL Composer</creator></identification>
  <part-list>
    <score-part id="G"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="B"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="G">${guitar.join('')}</part>
  <part id="B">${bass.join('')}</part>
</score-partwise>
`;
  const presented = presentBhlScore(xml);
  return {
    xml: presented,
    sha256: sha256Buffer(Buffer.from(presented, 'utf8')),
    bars,
    beats,
    beatType,
    tempo: request.tempo,
    openingPitchClasses: [0, 4],
    sections,
  };
}

export function writeBhlScratchScore(filePath: string, request: BhlScratchRequest, overwrite = false): BhlScratchScore & { path: string } {
  const score = buildBhlScratchScore(request);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && !overwrite) throw new Error(`scratch score already exists: ${filePath}`);
  fs.writeFileSync(filePath, score.xml, { flag: overwrite ? 'w' : 'wx' });
  return { ...score, path: filePath };
}
